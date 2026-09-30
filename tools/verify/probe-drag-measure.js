/* Measurement probe for the editor drag / readout / button-row issues.
   It MEASURES and prints; it does not fix anything. Run from E:\maze_dash\_work\test
   (NODE_PATH must include _work/test/node_modules for puppeteer-core). */
const puppeteer = require('puppeteer-core');
const CHROME = 'C:\\Users\\Lenovo\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe';
const FILE = 'file:///E:/maze_dash/dist/MazeDash-standalone.html';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
    const browser = await puppeteer.launch({
        executablePath: CHROME, headless: 'new',
        userDataDir: 'E:\\maze_dash\\_work\\test\\chrome-profile-dragmeasure',
        protocolTimeout: 240000,
        args: ['--no-sandbox', '--disable-extensions', '--no-first-run', '--mute-audio',
            '--allow-file-access-from-files', '--enable-unsafe-swiftshader', '--use-gl=angle',
            '--use-angle=swiftshader', '--autoplay-policy=no-user-gesture-required'],
        defaultViewport: { width: 1440, height: 810 }
    });
    const page = await browser.newPage();
    const errs = [];
    page.on('pageerror', (e) => errs.push(String(e.message).slice(0, 150)));
    await page.goto(FILE, { waitUntil: 'domcontentloaded', timeout: 120000 });
    await page.waitForFunction('window.cc && cc.game && cc.game._prepared === true', { timeout: 120000, polling: 150 });
    const scene = () => page.evaluate(() => (cc.director.getScene() ? cc.director.getScene().name : null));
    const tap = async (x, y, s) => { await page.mouse.move(x, y); await page.mouse.down(); await sleep(70); await page.mouse.up(); await sleep(s || 900); };
    for (let i = 0; i < 90; i++) {
        if ((await scene()) === 'HallScene') { break; }
        if (i % 3 === 1) { await tap(720, 400, 500); } else { await sleep(400); }
    }
    await sleep(3500);

    /* ---- open the grid editor and measure the geometry ---- */
    const geom = await page.evaluate(() => {
        const api = window.MazeDashCustomTab;
        if (!api || typeof api.openGridEditor !== 'function') { return { error: 'openGridEditor not exposed' }; }
        const root = api.openGridEditor();
        if (!root) { return { error: 'openGridEditor returned null' }; }
        const vs = cc.view.getVisibleSize();
        const rect = cc.game.canvas.getBoundingClientRect();
        const find = (name) => {
            let hit = null;
            (function w(n) { if (hit) { return; } if (n.name === name) { hit = n; return; } (n.children || []).forEach(w); })(root);
            return hit;
        };
        const W = (n) => (n ? n.convertToWorldSpaceAR(cc.v2(0, 0)) : null);
        const out = {
            vs: { w: vs.width, h: vs.height },
            rect: { w: Math.round(rect.width), h: Math.round(rect.height), l: Math.round(rect.left), t: Math.round(rect.top) },
            root: { w: root.width, h: root.height, world: W(root) },
            childNames: (root.children || []).map((c) => c.name).slice(0, 24)
        };
        const c00 = find('cell_0_0'), c10 = find('cell_1_0'), c01 = find('cell_0_1'), c1919 = find('cell_19_19');
        out.c00 = { size: c00 ? [c00.width, c00.height] : null, world: W(c00) };
        out.c10 = { world: W(c10) };
        out.c01 = { world: W(c01) };
        out.c1919 = { world: W(c1919) };
        if (out.c00.world && out.c10.world) { out.pitchX = out.c10.world.x - out.c00.world.x; }
        if (out.c00.world && out.c01.world) { out.pitchY = out.c00.world.y - out.c01.world.y; }
        out.readout = {
            bgExists: !!find('gridReadoutBg'),
            readoutDirect: !!find('gridReadout'),
            statusDirect: !!find('gridStatus'),
            readoutText: (function () { const n = find('gridReadout'); const l = n && n.getComponent(cc.Label); return l ? l.string : null; })(),
            statusText: (function () { const n = find('gridStatus'); const l = n && n.getComponent(cc.Label); return l ? l.string : null; })()
        };
        out.small = {};
        ['previewWorld', 'previewLevel', 'exportJson', 'importJson'].forEach((sid) => {
            const n = find('editorSmall_' + sid);
            if (!n) { out.small[sid] = 'MISSING'; return; }
            const w = W(n);
            const l = n.getChildByName('editorSmallLabel_' + sid);
            const lc = l && l.getComponent(cc.Label);
            out.small[sid] = { wx: Math.round(w.x), wy: Math.round(w.y), w: n.width, label: lc ? lc.string : null, fs: lc ? lc.fontSize : null };
        });
        out.scrollViewAtHall = !!cc.find('Canvas/gameView/scrollView');
        const svNode = cc.find('Canvas/gameView/scrollView');
        out.scrollEnabled = svNode ? !!svNode.getComponent(cc.ScrollView).enabled : null;
        /* world -> canvas CSS px -> page coords (the inverse of what the code should do) */
        const sx = vs.width / rect.width, sy = vs.height / rect.height;
        out.toPage = function (wx, wy) {
            const lx = (wx + vs.width / 2) / sx;
            const ly = (wy + vs.height / 2) / sy;
            return { x: rect.left + lx, y: rect.top + rect.height - ly };
        };
        const p = out.toPage(out.c00.world.x, out.c00.world.y);
        out.cell00Page = { x: Math.round(p.x), y: Math.round(p.y) };
        const p2 = out.toPage(out.c10.world.x, out.c10.world.y);
        out.cell10Page = { x: Math.round(p2.x), y: Math.round(p2.y) };
        out.tool = api.stats && api.stats.editorTool;
        return out;
    });
    console.log('GEOM=' + JSON.stringify(geom));

    if (!geom.error) {
        /* pick the floor tool so a drag paints floor = 1, then drag across 8 cells of row 5 */
        await page.evaluate(() => { try { window.MazeDashCustomTab.setEditorTool && window.MazeDashCustomTab.setEditorTool('floor'); } catch (e) {} });
        const startCell = await page.evaluate(() => {
            const root = cc.find('Canvas/gridEditor');
            const find = (name) => { let h = null; (function w(n) { if (h) { return; } if (n.name === name) { h = n; return; } (n.children || []).forEach(w); })(root); return h; };
            const c = find('cell_4_5'), c2 = find('cell_11_5');
            const vs = cc.view.getVisibleSize(), rect = cc.game.canvas.getBoundingClientRect();
            const sx = vs.width / rect.width, sy = vs.height / rect.height;
            const tp = (wx, wy) => ({ x: rect.left + (wx + vs.width / 2) / sx, y: rect.top + rect.height - (wy + vs.height / 2) / sy });
            const a = c.convertToWorldSpaceAR(cc.v2(0, 0)), b = c2.convertToWorldSpaceAR(cc.v2(0, 0));
            return { a: tp(a.x, a.y), b: tp(b.x, b.y) };
        });
        await page.mouse.move(startCell.a.x, startCell.a.y);
        await page.mouse.down();
        await page.mouse.move(startCell.b.x, startCell.b.y, { steps: 12 });
        await sleep(120);
        await page.mouse.up();
        await sleep(400);
        const afterDrag = await page.evaluate(() => {
            const s = window.MazeDashCustomTab.stats || {};
            const ed = window.MazeDashCustomTab.gridEditor;
            const row = ed && ed.grid && ed.grid[5] ? ed.grid[5].slice(3, 13) : null;
            const root = cc.find('Canvas/gridEditor');
            const find = (name) => { let h = null; (function w(n) { if (h) { return; } if (n.name === name) { h = n; return; } (n.children || []).forEach(w); })(root); return h; };
            const rn = find('gridReadout'), sn = find('gridStatus');
            return {
                dragDowns: s.dragDowns, dragMoves: s.dragMoves, dragLastWorld: s.dragLastWorld,
                dragCellsResolved: s.dragCellsResolved, dragCellsApplied: s.dragCellsApplied,
                dragScrollDisabled: s.dragScrollDisabled, dragScrollRestored: s.dragScrollRestored,
                readoutFromMatrix: s.readoutFromMatrix, gridPaints: s.gridPaints, readoutHero: s.readoutHero,
                row5_3to12: row,
                readoutText: rn && rn.getComponent(cc.Label) ? rn.getComponent(cc.Label).string : null,
                statusText: sn && sn.getComponent(cc.Label) ? sn.getComponent(cc.Label).string : null,
                scrollEnabledAfterDrag: (function () { const n = cc.find('Canvas/gameView/scrollView'); return n ? !!n.getComponent(cc.ScrollView).enabled : null; })()
            };
        });
        console.log('AFTER_DRAG=' + JSON.stringify(afterDrag));
        /* single click regression guard: click one untouched cell and check only it changes */
        const one = await page.evaluate(() => {
            const root = cc.find('Canvas/gridEditor');
            const find = (name) => { let h = null; (function w(n) { if (h) { return; } if (n.name === name) { h = n; return; } (n.children || []).forEach(w); })(root); return h; };
            const c = find('cell_2_9');
            const vs = cc.view.getVisibleSize(), rect = cc.game.canvas.getBoundingClientRect();
            const sx = vs.width / rect.width, sy = vs.height / rect.height;
            const w = c.convertToWorldSpaceAR(cc.v2(0, 0));
            return { x: rect.left + (w.x + vs.width / 2) / sx, y: rect.top + rect.height - (w.y + vs.height / 2) / sy };
        });
        await tap(one.x, one.y, 500);
        const afterClick = await page.evaluate(() => {
            const s = window.MazeDashCustomTab.stats || {};
            const ed = window.MazeDashCustomTab.gridEditor;
            const root = cc.find('Canvas/gridEditor');
            const find = (name) => { let h = null; (function w(n) { if (h) { return; } if (n.name === name) { h = n; return; } (n.children || []).forEach(w); })(root); return h; };
            const rn = find('gridReadout');
            let floors = 0; ed.grid.forEach((r) => r.forEach((v) => { if (v === 1) { floors++; } }));
            return { cell_2_9: ed.grid[9][2], floors: floors, gridPaints: s.gridPaints,
                readoutText: rn && rn.getComponent(cc.Label) ? rn.getComponent(cc.Label).string : null };
        });
        console.log('AFTER_CLICK=' + JSON.stringify(afterClick));
    }
    console.log('ERRS=' + JSON.stringify(errs.slice(0, 5)));
    await page.screenshot({ path: 'E:\\maze_dash\\_work\\test\\shots\\measure-drag.png' });
    await browser.close();
    process.exit(0);
})().catch((e) => { console.error('HARNESS ERROR', e); process.exit(1); });
