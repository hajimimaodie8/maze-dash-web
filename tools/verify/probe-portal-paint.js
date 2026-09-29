/* What does the portal paint code actually see?
 *
 * Requirement from the handoff: print the facts BEFORE changing anything, and keep them on
 * window (page switches and console output get lost). Reports:
 *   - how many sprites under game_map match /portal/i, with their frame names, sizes and colours
 *   - the portal cells taken from game_map.Level_data
 *   - the horizontal runs those cells group into
 *   - whatever the paint code threw (custom-tab warnings are captured too)
 *   - the plugin's own counters (portalCellsPainted / portalSpritesTinted / colorPortalsPatched)
 *
 * Always run against the packaged single-file build over file:// :
 *   node tools/verify/probe-portal-paint.js
 */
const path = require('path');
const fs = require('fs');
const puppeteer = require('puppeteer-core');

const CHROME = 'C:\\Users\\Lenovo\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe';
const FILE = 'file:///E:/maze_dash/dist/MazeDash-standalone.html';
const OUT = path.join(__dirname, 'out', 'portal-paint.json');
const SHOT = path.join(__dirname, 'out', 'portal-paint.png');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
    fs.mkdirSync(path.dirname(OUT), { recursive: true });
    const browser = await puppeteer.launch({
        executablePath: CHROME,
        headless: 'new',
        userDataDir: path.join(__dirname, 'chrome-profile-portalpaint'),
        protocolTimeout: 240000,
        defaultViewport: { width: 1440, height: 810 },
        args: ['--no-sandbox', '--disable-extensions', '--no-first-run', '--mute-audio',
            '--allow-file-access-from-files', '--enable-unsafe-swiftshader',
            '--use-gl=angle', '--use-angle=swiftshader', '--autoplay-policy=no-user-gesture-required'],
    });
    const page = await browser.newPage();
    const pageErrors = [];
    page.on('pageerror', (e) => pageErrors.push(String(e.message).slice(0, 160)));

    // capture the plugin's own log/warn output inside the page, because a scene switch clears it
    await page.evaluateOnNewDocument(() => {
        window.__logs = [];
        const keep = (kind) => {
            const orig = console[kind].bind(console);
            console[kind] = function () {
                try {
                    const text = Array.prototype.map.call(arguments, (a) => (typeof a === 'string' ? a : JSON.stringify(a))).join(' ');
                    if (window.__logs.length < 400) { window.__logs.push(kind + ': ' + text.slice(0, 220)); }
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

    // reach the hall
    for (let i = 0; i < 90; i++) {
        if ((await scene()) === 'HallScene') { break; }
        if (i % 3 === 1) { await tap(720, 400, 500); } else { await sleep(400); }
    }
    await sleep(3500);

    // report the seeded state first
    const seeded = await page.evaluate(() => ({
        testWorldInStorage: JSON.parse(localStorage.getItem('maze_dash_custom_worlds') || '{}')['101'] || null,
        map10101: !!(conf.all_Level && conf.all_Level[10101]),
        world1FirstMap: (function () {
            try { const c = conf.stage_level_cfg[1] || {}; const k = Object.keys(c)[0]; return c[k] ? c[k].mapId : null; } catch (e) { return null; }
        })(),
        stats: window.MazeDashCustomTab ? window.MazeDashCustomTab.stats : null,
    }));

    // tap the first level of world 1, where the test grid is injected
    const btn = await page.evaluate(() => {
        const scv = cc.find('Canvas/gameView/scrollView');
        const content = scv && scv.getComponent(cc.ScrollView).content;
        const page0 = content && content.children.filter((p) => p.getComponent('StageSelectLayer'))[0];
        const holder = page0 && page0.getComponent('StageSelectLayer').SelectLevelLayer;
        const b = holder && holder.children.filter((n) => n.getComponent && n.getComponent('LevelButton'))[0];
        if (!b) { return null; }
        const wp = b.convertToWorldSpaceAR(cc.v2(0, 0));
        const r = cc.game.canvas.getBoundingClientRect(); const vs = cc.view.getVisibleSize();
        return { x: r.left + wp.x * (r.width / vs.width), y: r.top + (vs.height - wp.y) * (r.height / vs.height) };
    });
    if (btn) { await tap(btn.x, btn.y, 4000); }
    for (let i = 0; i < 60; i++) { if ((await scene()) === 'gameScene') { break; } await sleep(300); }
    await sleep(4000);

    // ------------------------------------------------------------------ the actual diagnostic
    const diag = await page.evaluate(() => {
        const out = { ok: false, err: null };
        try {
            const map = cc.find('Canvas/backgroup/game_map');
            const comp = map && map.getComponent && map.getComponent('game_map');
            out.mapFound = !!map;
            out.compFound = !!comp;
            if (!comp) { return out; }

            // every sprite under game_map, so we can see what is really there
            out.sprites = [];
            (function walk(n, p) {
                const sp = n.getComponent && n.getComponent(cc.Sprite);
                if (sp && sp.spriteFrame) {
                    out.sprites.push({
                        path: p + '/' + n.name,
                        frame: String(sp.spriteFrame.name),
                        size: [Math.round(n.width), Math.round(n.height)],
                        colour: [n.color.r, n.color.g, n.color.b],
                        active: n.activeInHierarchy,
                        children: (n.children || []).length,
                    });
                }
                (n.children || []).forEach((c) => walk(c, p + '/' + n.name));
            })(map, 'game_map');

            // what the paint code looks for
            out.portalSprites = out.sprites.filter((s) => /portal/i.test(s.frame));
            out.framesSeen = Array.from(new Set(out.sprites.map((s) => s.frame))).slice(0, 30);

            // portal cells and their horizontal runs, exactly as the paint code computes them
            const cells = [];
            const rows = Object.keys(comp.Level_data);
            for (let ri = 0; ri < rows.length; ri++) {
                const y = rows[ri], row = comp.Level_data[y];
                for (const x in row) { if (row[x] === 2) { cells.push([parseInt(x, 10), parseInt(y, 10)]); } }
            }
            out.cells = cells;
            const groups = [];
            cells.forEach((c) => {
                const g = groups[groups.length - 1];
                if (g && g.y === c[1] && c[0] === g.xs[g.xs.length - 1] + 1) { g.xs.push(c[0]); }
                else { groups.push({ y: c[1], xs: [c[0]] }); }
            });
            out.groups = groups;

            // markers the paint code may have created already
            out.markers = [];
            (function walk2(n, p) {
                if (/^portalColour/.test(n.name)) { out.markers.push({ path: p + '/' + n.name, size: [Math.round(n.width), Math.round(n.height)], colour: [n.color.r, n.color.g, n.color.b], active: n.activeInHierarchy }); }
                (n.children || []).forEach((c) => walk2(c, p + '/' + n.name));
            })(cc.director.getScene(), 'scene');

            out.stats = window.MazeDashCustomTab ? window.MazeDashCustomTab.stats : null;
            out.ok = true;
        } catch (e) { out.err = String(e && e.message).slice(0, 200); }
        return out;
    });

    const logs = await page.evaluate(() => (window.__logs || []).filter((l) => /custom-tab|portal/i.test(l)).slice(-25));

    await page.screenshot({ path: SHOT });
    fs.writeFileSync(OUT, JSON.stringify({ seeded, diag, logs, pageErrors }, null, 2));

    console.log('=== seeded ===');
    console.log('  world 101 in storage:', JSON.stringify(seeded.testWorldInStorage));
    console.log('  conf.all_Level[10101]:', seeded.map10101, ' world1 first mapId:', seeded.world1FirstMap);
    console.log('=== what the paint code sees ===');
    console.log('  map node found:', diag.mapFound, ' game_map component found:', diag.compFound, ' err:', diag.err);
    console.log('  portal sprites (/portal/i):', JSON.stringify(diag.portalSprites));
    console.log('  frames present under game_map:', JSON.stringify(diag.framesSeen));
    console.log('  portal cells:', JSON.stringify(diag.cells));
    console.log('  groups:', JSON.stringify(diag.groups));
    console.log('  portalColour markers already created:', JSON.stringify(diag.markers));
    console.log('  counters:', JSON.stringify({
        painted: diag.stats && diag.stats.portalCellsPainted,
        spritesTinted: diag.stats && diag.stats.portalSpritesTinted,
        patched: diag.stats && diag.stats.colorPortalsPatched,
    }));
    console.log('=== plugin log lines ===');
    logs.forEach((l) => console.log('  ' + l));
    console.log('=== page errors ===');
    console.log(' ', JSON.stringify(pageErrors.slice(0, 4)));
    console.log('saved:', OUT, '| screenshot:', SHOT);

    await browser.close();
    process.exit(0);
})().catch((e) => { console.error('HARNESS ERROR', e); process.exit(1); });
