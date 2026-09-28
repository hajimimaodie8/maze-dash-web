/*
 * Build the self-contained ("网页直装版") single-file HTML.
 *
 *   node tools/build-standalone.js [--out <file>]
 *
 * Takes web/index.html as the source of truth for markup/CSS, then:
 *   - inlines the engine, settings.js, the four plug scripts, project.js,
 *     web-port.js and main.js in their original execution order;
 *   - embeds every file under web/res/ (350 files) as either a JS string
 *     (text) or base64 (binary);
 *   - installs a virtual filesystem that replaces the engine's four network
 *     loaders — text/json/binary, image, audio and font — with in-memory
 *     equivalents, so the page performs *zero* network requests.
 *
 * The result runs from file:// with a plain double-click.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const WEB = path.join(ROOT, 'web');
const argv = process.argv.slice(2);
const OUT = (() => {
    const i = argv.indexOf('--out');
    if (i >= 0 && argv[i + 1]) { return path.resolve(argv[i + 1]); }
    return path.join(ROOT, 'dist', 'MazeDash-standalone.html');
})();

const read = (p) => fs.readFileSync(p, 'utf8');
const readBytes = (p) => fs.readFileSync(p);
const log = (...a) => console.log(...a);

/* ------------------------------------------------------------------ files */
const TEXT_EXT = new Set(['.json', '.txt', '.plist', '.xml', '.atlas', '.fnt', '.csv', '.md']);
const MIME = {
    png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif',
    webp: 'image/webp', mp3: 'audio/mpeg', ogg: 'audio/ogg', wav: 'audio/wav',
    m4a: 'audio/mp4', ttf: 'font/ttf', otf: 'font/otf', woff: 'font/woff',
    json: 'application/json', txt: 'text/plain', plist: 'text/xml',
    xml: 'text/xml', bin: 'application/octet-stream',
};

function walk(dir, base, out) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, e.name);
        if (e.isDirectory()) { walk(p, base, out); }
        else { out.push(path.relative(base, p).replace(/\\/g, '/')); }
    }
    return out;
}

const resFiles = walk(path.join(WEB, 'res'), WEB, []).sort();
log(`assets found: ${resFiles.length}`);

const entries = [];       // [relPath, kind, payload]
let textBytes = 0, binBytes = 0;
for (const rel of resFiles) {
    const abs = path.join(WEB, rel);
    const ext = path.extname(rel).toLowerCase();
    if (TEXT_EXT.has(ext)) {
        const s = read(abs);
        textBytes += Buffer.byteLength(s);
        entries.push([rel, 0, s]);
    } else {
        const b = readBytes(abs);
        binBytes += b.length;
        entries.push([rel, 1, b.toString('base64')]);
    }
}
log(`  text : ${entries.filter((e) => e[1] === 0).length} files, ${(textBytes / 1024).toFixed(0)} KB`);
log(`  binary: ${entries.filter((e) => e[1] === 1).length} files, ${(binBytes / 1048576).toFixed(2)} MB -> base64 ${((binBytes * 4 / 3) / 1048576).toFixed(2)} MB`);

/* JSON payload, with "<" escaped so nothing can terminate the <script> tag */
const jsonEscape = (o) =>
    JSON.stringify(o).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');

const vfsData = jsonEscape(Object.fromEntries(entries.map(([p, k, d]) => [p, [k, d]])));

/* ------------------------------------------------------------- vfs runtime */
const VFS_JS = `
/* ==========================================================================
 * Maze Dash — self-contained build: virtual filesystem + in-memory loaders
 * --------------------------------------------------------------------------
 * Everything the game needs is embedded in this file. These shims replace the
 * engine's network-backed loaders so the page issues no requests at all, which
 * is what makes opening the file straight from disk work.
 * ========================================================================== */
window.__MAZE_DASH_INLINE_ASSETS = true;
(function () {
    'use strict';
    var DATA = window.__MAZE_DASH_VFS;
    var MIME = ${jsonEscape(MIME)};

    var byBase = {};
    for (var k in DATA) { byBase[k.substring(k.lastIndexOf('/') + 1)] = k; }

    function norm(u) {
        u = String(u == null ? '' : u);
        var c = u.indexOf('?'); if (c >= 0) { u = u.substring(0, c); }
        c = u.indexOf('#'); if (c >= 0) { u = u.substring(0, c); }
        return u.replace(/^\\.\\//, '').replace(/^\\/+/, '');
    }
    function findKey(u) {
        var n = norm(u);
        if (DATA[n]) { return n; }
        var b = n.substring(n.lastIndexOf('/') + 1);
        return byBase[b] || null;
    }
    function entry(u) { var k = findKey(u); return k ? { key: k, e: DATA[k] } : null; }

    function bytesFromB64(b64) {
        var bin = atob(b64), n = bin.length, out = new Uint8Array(n);
        for (var i = 0; i < n; i++) { out[i] = bin.charCodeAt(i); }
        return out;
    }
    function b64FromText(s) {
        var utf8 = unescape(encodeURIComponent(s));
        return btoa(utf8);
    }
    function textOf(u) {
        var r = entry(u);
        if (!r) { return null; }
        if (r.e[0] === 0) { return r.e[1]; }
        var b = bytesFromB64(r.e[1]), s = '';
        for (var i = 0; i < b.length; i++) { s += String.fromCharCode(b[i]); }
        return s;
    }
    function dataUriOf(u) {
        var r = entry(u);
        if (!r) { return null; }
        var dot = r.key.lastIndexOf('.');
        var ext = dot >= 0 ? r.key.substring(dot + 1).toLowerCase() : '';
        var mime = MIME[ext] || 'application/octet-stream';
        var b64 = r.e[0] === 0 ? b64FromText(r.e[1]) : r.e[1];
        return 'data:' + mime + ';base64,' + b64;
    }
    function arrayBufferOf(u) {
        var r = entry(u);
        if (!r) { return null; }
        return r.e[0] === 0 ? bytesFromB64(b64FromText(r.e[1])).buffer : bytesFromB64(r.e[1]).buffer;
    }
    function fontFamilyOf(u) {
        var n = norm(u);
        var i = n.lastIndexOf('.ttf');
        if (i === -1) { return n; }
        var s = n.lastIndexOf('/');
        return n.substring(s + 1, i) + '_LABEL';
    }
    function isWebAudioItem(item) {
        try {
            var owner = item && item._owner;
            if (owner instanceof cc.AudioClip) {
                return owner.loadMode === cc.AudioClip.LoadMode.WEB_AUDIO;
            }
            return !(item && item.urlParam && item.urlParam.useDom);
        } catch (e) { return true; }
    }

    var TEXT_EXTS  = ${jsonEscape(['json', 'txt', 'xml', 'plist', 'atlas', 'tmx', 'tsx', 'ExportJson', 'fnt', 'vsh', 'fsh'])};
    var BIN_EXTS   = ['binary'];
    var IMG_EXTS   = ['png', 'jpg', 'jpeg', 'gif', 'ico', 'tiff', 'webp', 'image'];
    var AUDIO_EXTS = ['mp3', 'ogg', 'wav', 'm4a'];
    var FONT_EXTS  = ['ttf', 'font', 'eot', 'woff', 'svg', 'ttc'];

    var stats = { text: 0, binary: 0, image: 0, audio: 0, font: 0, missed: [] };
    window.__mazeDashVfsStats = stats;

    function install() {
        var dl = cc.loader.downloader;
        var ld = cc.loader.loader;
        if (!dl || !ld) { return false; }
        if (dl.__mazeDashInline) { return true; }

        var dlHandlers = {};

        TEXT_EXTS.concat(BIN_EXTS).forEach(function (ext) {
            var orig = dl.extMap[ext];
            var wantBinary = BIN_EXTS.indexOf(ext) >= 0;
            dlHandlers[ext] = function (item, callback) {
                if (wantBinary) {
                    var buf = arrayBufferOf(item.url);
                    if (buf) { stats.binary++; return callback(null, buf); }
                } else {
                    var s = textOf(item.url);
                    if (s !== null) { stats.text++; return callback(null, s); }
                }
                stats.missed.push(ext + ':' + item.url);
                return orig ? orig.call(this, item, callback) : callback(new Error('not inlined: ' + item.url));
            };
        });

        IMG_EXTS.forEach(function (ext) {
            var orig = dl.extMap[ext];
            dlHandlers[ext] = function (item, callback) {
                var uri = dataUriOf(item.url);
                if (!uri) {
                    stats.missed.push('img:' + item.url);
                    return orig ? orig.call(this, item, callback) : callback(new Error('not inlined: ' + item.url));
                }
                stats.image++;
                var img = new Image();
                img.onload = function () { img.id = item.id; callback(null, img); };
                img.onerror = function () { callback(new Error('inlined image failed: ' + item.url)); };
                img.src = uri;
            };
        });

        AUDIO_EXTS.forEach(function (ext) {
            var orig = dl.extMap[ext];
            dlHandlers[ext] = function (item, callback) {
                var uri = dataUriOf(item.url);
                if (!uri) {
                    stats.missed.push('audio:' + item.url);
                    return orig ? orig.call(this, item, callback) : callback(new Error('not inlined: ' + item.url));
                }
                stats.audio++;
                if (!isWebAudioItem(item)) {
                    var dom = document.createElement('audio');
                    var done = false;
                    var finish = function (err) { if (done) { return; } done = true; callback(err, err ? null : dom); };
                    dom.addEventListener('canplaythrough', function () { finish(null); });
                    dom.addEventListener('error', function () { finish('inlined audio failed: ' + item.url); });
                    dom.src = uri;
                    dom.load();
                    setTimeout(function () { finish(null); }, 8000);
                    return;
                }
                var ctx = cc.sys.__audioSupport && cc.sys.__audioSupport.context;
                var buf = arrayBufferOf(item.url);
                if (!ctx || !buf) { return callback('no audio context'); }
                var p = ctx.decodeAudioData(buf);
                if (p && typeof p.then === 'function') {
                    p.then(function (b) { callback(null, b); }, function (e) { callback(e || 'decode failed'); });
                } else if (ctx.decodeAudioData.length > 1) {
                    ctx.decodeAudioData(buf, function (b) { callback(null, b); }, function () { callback('decode failed'); });
                }
            };
        });

        cc.loader.addDownloadHandlers(dlHandlers);

        var ldHandlers = {};
        FONT_EXTS.forEach(function (ext) {
            var orig = ld.extMap[ext];
            ldHandlers[ext] = function (item, callback) {
                var uri = dataUriOf(item.url);
                if (!uri) {
                    stats.missed.push('font:' + item.url);
                    return orig ? orig.call(this, item, callback) : callback(null, 'Arial');
                }
                stats.font++;
                var family = fontFamilyOf(item.url);
                var quoted = family.indexOf(' ') !== -1 ? '"' + family + '"' : family;
                if (!document.__mazeDashFonts) { document.__mazeDashFonts = {}; }
                if (!document.__mazeDashFonts[family]) {
                    document.__mazeDashFonts[family] = true;
                    var st = document.createElement('style');
                    st.type = 'text/css';
                    st.textContent = "@font-face { font-family:" + quoted + "; src:url('" + uri + "'); }";
                    (document.head || document.body).appendChild(st);
                }
                var settled = false;
                var finish = function () { if (settled) { return; } settled = true; callback(null, family); };
                try {
                    if (document.fonts && document.fonts.load) {
                        document.fonts.load('40px ' + quoted).then(finish, finish);
                        setTimeout(finish, 3000);
                    } else { setTimeout(finish, 60); }
                } catch (e) { setTimeout(finish, 60); }
            };
        });
        cc.loader.addLoadHandlers(ldHandlers);

        dl.__mazeDashInline = true;
        return true;
    }

    if (!install()) {
        // engine not ready yet — retry on the next tick (should not happen)
        var tries = 0;
        var t = setInterval(function () {
            if (install() || ++tries > 50) { clearInterval(t); }
        }, 20);
    }
})();
`;

/* -------------------------------------------------------------- assemble */
function scriptTag(label, code) {
    const safe = String(code).replace(/<\/script/gi, '<\\/script');
    return `    <!-- ${label} -->\n    <script charset="utf-8">\n${safe}\n    </script>`;
}

let html = read(path.join(WEB, 'index.html'));
const before = html.length;

function replaceOnce(html, needle, replacement, what) {
    const i = html.indexOf(needle);
    if (i < 0) { throw new Error('index.html marker not found: ' + what + '\n  looked for: ' + JSON.stringify(needle.slice(0, 80))); }
    if (html.indexOf(needle, i + 1) >= 0) { throw new Error('index.html marker is ambiguous: ' + what); }
    return html.slice(0, i) + replacement + html.slice(i + needle.length);
}

const plugScripts = [
    ['assets/script/plug/comm.js', 'plug: comm.js'],
    ['assets/script/plug/gameconf.js', 'plug: gameconf.js'],
    ['assets/script/plug/tileType.js', 'plug: tileType.js'],
    ['assets/script/plug/transition.js', 'plug: transition.js'],
];

// 1) settings.js
html = replaceOnce(
    html,
    '<!-- 1) build settings (defines window._CCSettings) -->\n    <script src="src/settings.js" charset="utf-8"></script>',
    scriptTag('inlined src/settings.js', read(path.join(WEB, 'src/settings.js'))),
    'settings.js'
);

// 2) engine + virtual filesystem
html = replaceOnce(
    html,
    '<!-- 2) Cocos Creator 2.0.2 browser engine -->\n    <script src="cocos2d-js.js" charset="utf-8"></script>',
    scriptTag('inlined Cocos Creator 2.0.2 browser engine (cocos2d-js.js)', read(path.join(WEB, 'cocos2d-js.js'))) +
    '\n' + scriptTag('inlined asset data (res/, ' + resFiles.length + ' files)', 'window.__MAZE_DASH_VFS = ' + vfsData + ';') +
    '\n' + scriptTag('virtual filesystem + in-memory loaders', VFS_JS),
    'engine'
);

// 3) plug scripts + project.js + web-port.js
let third = '';
for (const [rel, label] of plugScripts) {
    third += scriptTag('inlined src/' + rel, read(path.join(WEB, 'src', rel))) + '\n';
}
third += scriptTag('inlined src/project.js (game logic)', read(path.join(WEB, 'src/project.js'))) + '\n';
third += scriptTag('inlined web-port.js', read(path.join(WEB, 'web-port.js'))) + '\n';
third += scriptTag('inlined custom-tab.js (6th tab / level editor placeholder)', read(path.join(WEB, 'custom-tab.js'))) + '\n';
third += scriptTag('inlined clean-mode.js (quiet mode)', read(path.join(WEB, 'clean-mode.js')));
third += scriptTag('inlined wide-ui.js (wide screen layout)', read(path.join(WEB, 'wide-ui.js')));
third += scriptTag('inlined preload.js (level asset warmup)', read(path.join(WEB, 'preload.js')));
html = replaceOnce(
    html,
    '<!-- 3) port-specific shims / adaptations (must be before boot) -->\n    <script src="web-port.js?v=20250220a" charset="utf-8"></script>\n    <!-- 3b) "custom levels" tab: adds a 6th tab (wrench) to the game\'s tab bar\n            and a placeholder page for the level editor -->\n    <script src="custom-tab.js?v=20250220a" charset="utf-8"></script>\n    <!-- 3c) quiet mode: unlock every skin, silence ads / gift / rate-us / quest\n            and world-unlock popups -->\n    <script src="clean-mode.js?v=20250220a" charset="utf-8"></script>\n    <!-- 3d) wide screen: widen the game\'s own layout (level select grid, in-level HUD) -->\n    <script src="wide-ui.js?v=20250220a" charset="utf-8"></script>\n    <!-- 3e) preload: warm the level-asset descriptors while the player is on the hall -->\n    <script src="preload.js?v=20250220a" charset="utf-8"></script>',
    third,
    'web-port.js'
);

// 4) main.js
html = replaceOnce(
    html,
    '<!-- 4) boot -->\n    <script src="main.js" charset="utf-8"></script>',
    scriptTag('inlined main.js (boot)', read(path.join(WEB, 'main.js'))),
    'main.js'
);

// title + a note that this is the standalone build
html = html.replace(
    '<title>冲撞迷阵 Maze Dash — 网页版</title>',
    '<title>冲撞迷阵 Maze Dash — 网页直装版（单文件）</title>'
);

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, html, 'utf8');

const mb = (fs.statSync(OUT).size / 1048576).toFixed(2);
log('');
log(`wrote ${OUT}`);
log(`  size        : ${mb} MB`);
log(`  html in     : ${(before / 1024).toFixed(0)} KB (web/index.html)`);
log(`  embedded    : ${resFiles.length} assets + 6 scripts + engine`);
log('');
log('open it with a double-click — no server required.');
