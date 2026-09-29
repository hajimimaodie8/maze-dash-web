/* Sharper follow-up: the portal frames are NOT named /portal/i, so identify portals by GEOMETRY.
 *
 * Prints, on window and to disk:
 *   - the per-cell tile nodes (name, parent, position) so the tile grid and spacing are known
 *   - every sprite under tile_item_layer with position/size/frame (the portal run lives here)
 *   - the full stack of the paint exception, so its origin is not a guess
 *
 * Run: NODE_PATH=E:\maze_dash\_work\test\node_modules node tools/verify/probe-portal-geometry.js
 */
const path = require('path');
const fs = require('fs');
const puppeteer = require('puppeteer-core');

const CHROME = 'C:\\Users\\Lenovo\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe';
const FILE = 'file:///E:/maze_dash/dist/MazeDash-standalone.html';
const OUT = path.join(__dirname, 'out', 'portal-geometry.json');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
    fs.mkdirSync(path.dirname(OUT), { recursive: true });
    const browser = await puppeteer.launch({
        executablePath: CHROME, headless: 'new',
        userDataDir: path.join(__dirname, 'chrome-profile-portalgeom'),
        protocolTimeout: 240000,
        defaultViewport: { width: 1440, height: 810 },
        args: ['--no-sandbox', '--disable-extensions', '--no-first-run', '--mute-audio',
            '--allow-file-access-from-files', '--enable-unsafe-swiftshader',
            '--use-gl=angle', '--use-angle=swiftshader', '--autoplay-policy=no-user-gesture-required'],
    });
    const page = await browser.newPage();
    await page.evaluateOnNewDocument(() => {
        window.__logs = [];
        const keep = (kind) => {
            const orig = console[kind].bind(console);
            console[kind] = function () {
                try {
                    const t = Array.prototype.map.call(arguments, (a) => (typeof a === 'string' ? a : JSON.stringify(a))).join(' ');
                    if (window.__logs.length < 400) { window.__logs.push(kind + ': ' + t.slice(0, 400)); }
                } catch (e) {}
                return orig.apply(null, arguments);
            };
        };
        keep('log'); keep('warn'); keep('error');
    });
    await page.goto(FILE, { waitUntil: 'domcontentloaded', timeout: 180000 });
    await page.waitForFunction('window.cc && cc.game && cc.game._prepared === true', { timeout: 180000, polling: 150 });

    const scene = () => page.evaluate(() => (cc.director.getScene() ? cc.director.getScene().name : null));
    async function tap(x, y, s) { await page.mouse.move(x, y); await page.mouse.down(); await sleep(80); await page.mouse.up(); await sleep(s || 900); }

    for (let i = 0; i < 90; i++) {
        if ((await scene()) === 'HallScene') { break; }
        if (i % 3 === 1) { await tap(720, 400, 500); } else { await sleep(400); }
    }
    await sleep(3500);
    const btn = await page.evaluate(() => {
        const scv = cc.find('Canvas/gameView/scrollView');
        const content = scv && scv.getComponent(cc.ScrollView).content;
        const p0 = content && content.children.filter((p) => p.getComponent('StageSelectLayer'))[0];
        const holder = p0 && p0.getComponent('StageSelectLayer').SelectLevelLayer;
        const b = holder && holder.children.filter((n) => n.getComponent && n.getComponent('LevelButton'))[0];
        if (!b) { return null; }
        const wp = b.convertToWorldSpaceAR(cc.v2(0, 0));
        const r = cc.game.canvas.getBoundingClientRect(); const vs = cc.view.getVisibleSize();
        return { x: r.left + wp.x * (r.width / vs.width), y: r.top + (vs.height - wp.y) * (r.height / vs.height) };
    });
    if (btn) { await tap(btn.x, btn.y, 4000); }
    for (let i = 0; i < 60; i++) { if ((await scene()) === 'gameScene') { break; } await sleep(300); }
    await sleep(4000);

    const diag = await page.evaluate(() => {
        const out = { err: null };
        try {
            const comp = (function () { const m = cc.find('Canvas/backgroup/game_map'); return m && m.getComponent('game_map'); })();
            const map = cc.find('Canvas/backgroup/game_map');
            out.mapChildren = map ? map.children.map((c) => c.name) : [];
            // layer structure
            out.layers = {};
            (map ? map.children : []).forEach((layer) => {
                const kids = layer.children || [];
                const byName = {};
                kids.forEach((k) => { byName[k.name] = (byName[k.name] || 0) + 1; });
                out.layers[layer.name] = { children: kids.length, names: byName,
                    sample: kids.slice(0, 4).map((k) => ({ name: k.name, pos: [Math.round(k.x), Math.round(k.y)], size: [Math.round(k.width), Math.round(k.height)] })) };
            });
            // every sprite under tile_item_layer with geometry
            const itemLayer = map && map.children.filter((c) => /tile_item_layer/i.test(c.name))[0];
            out.itemSprites = [];
            (function walk(n, p) {
                const sp = n.getComponent && n.getComponent(cc.Sprite);
                if (sp && sp.spriteFrame) {
                    out.itemSprites.push({ path: p + '/' + n.name, frame: String(sp.spriteFrame.name),
                        local: [Math.round(n.x), Math.round(n.y)], size: [Math.round(n.width), Math.round(n.height)],
                        colour: [n.color.r, n.color.g, n.color.b] });
                }
                (n.children || []).forEach((c) => walk(c, p + '/' + n.name));
            })(itemLayer || map, 'item');
            // portal cells
            const cells = [];
            const rows = Object.keys(comp.Level_data);
            for (let ri = 0; ri < rows.length; ri++) { const y = rows[ri], row = comp.Level_data[y]; for (const x in row) { if (row[x] === 2) { cells.push([parseInt(x, 10), parseInt(y, 10)]); } } }
            out.cells = cells;
            out.rows = rows.length; out.cols = Object.keys(comp.Level_data[rows[0]] || {}).length;
            // the paint exception's stack: rerun that code path here to capture it
            try {
                const runs = [];
                (function collect(n) { const sp = n.getComponent && n.getComponent(cc.Sprite); if (sp && sp.spriteFrame && /portal/i.test(sp.spriteFrame.name) && n.width > 4) { runs.push(n); } (n.children || []).forEach(collect); })(map);
                out.runsFound = runs.length;
                var rowsKeys = Object.keys(comp.Level_data);
                out.objectKeysWorked = rowsKeys.length;
            } catch (e) { out.rerunErr = String(e && e.message); out.rerunStack = String(e && e.stack).slice(0, 400); }
            // what does the tile spacing look like? diff the first two item sprites
            if (out.itemSprites.length >= 2) {
                out.spacingSample = [out.itemSprites[1].local[0] - out.itemSprites[0].local[0], out.itemSprites[1].local[1] - out.itemSprites[0].local[1]];
            }
            // also: is there a node the engine uses per cell? count spaceTile in each layer
            out.spaceTileCounts = {};
            (map ? map.children : []).forEach((layer) => {
                let n = 0;
                (function count(x) { if (x.name === 'spaceTile') { n++; } (x.children || []).forEach(count); })(layer);
                out.spaceTileCounts[layer.name] = n;
            });
        } catch (e) { out.err = String(e && e.message).slice(0, 200); }
        return out;
    });

    const logs = await page.evaluate(() => (window.__logs || []).filter((l) => /portal paint|portal/i.test(l)));
    fs.writeFileSync(OUT, JSON.stringify({ diag, logs }, null, 2));

    console.log('map children:', JSON.stringify(diag.mapChildren));
    console.log('rows x cols:', diag.rows, 'x', diag.cols, ' portal cells:', JSON.stringify(diag.cells));
    console.log('runs found by frame name:', diag.runsFound, ' Object.keys ok:', diag.objectKeysWorked, ' rerunErr:', diag.rerunErr);
    if (diag.rerunStack) { console.log('rerun stack:', diag.rerunStack); }
    console.log('spaceTile counts per layer:', JSON.stringify(diag.spaceTileCounts));
    console.log('layers:', JSON.stringify(diag.layers).slice(0, 900));
    console.log('item sprites (first 12):');
    (diag.itemSprites || []).slice(0, 12).forEach((s) => console.log('   ' + s.path + '  frame=' + s.frame + '  local=' + JSON.stringify(s.local) + '  size=' + JSON.stringify(s.size) + '  col=' + JSON.stringify(s.colour)));
    console.log('item sprite total:', (diag.itemSprites || []).length, ' spacing sample:', JSON.stringify(diag.spacingSample));
    console.log('paint logs:', JSON.stringify(logs.slice(-4)));
    console.log('saved:', OUT);
    await browser.close();
    process.exit(0);
})().catch((e) => { console.error('HARNESS ERROR', e); process.exit(1); });
