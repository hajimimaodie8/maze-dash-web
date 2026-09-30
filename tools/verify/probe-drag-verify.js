/* Verification probe for task A: drag painting, scroll mute, readout/Hero, single-click guard.
   Uses REAL mouse events and the MEASURED coordinate mapping:
     loc = world / scale            (scale = visibleSize / canvas CSS size)
     pageX = rect.left + loc.x ;  pageY = rect.top + rect.height - loc.y
   Run from E:\maze_dash\_work\test with NODE_PATH pointing at its node_modules. */
const puppeteer = require('puppeteer-core');
const CHROME = 'C:\\Users\\Lenovo\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe';
const FILE = 'file:///E:/maze_dash/dist/MazeDash-standalone.html';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
    const browser = await puppeteer.launch({
        executablePath: CHROME, headless: 'new',
        userDataDir: 'E:\\maze_dash\\_work\\test\\chrome-profile-dragverify',
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
    const tap = async (x, y, s) => { await page.mouse.move(x, y); await page.mouse.down(); await sleep(70); await page.mouse.up(); await sleep(s || 700); };
    for (let i = 0; i < 90; i++) {
        if ((await scene()) === 'HallScene') { break; }
        if (i % 3 === 1) { await tap(720, 400, 500); } else { await sleep(400); }
    }
    await sleep(3500);

    /* helper injected once: name lookup + the correct world->page mapping */
    await page.evaluate(() => {
        window.__T = {
            root: () => cc.find('Canvas/gridEditor'),
            find: function (name, root) {
                root = root || window.__T.root();
                let hit = null;
                (function w(n) { if (hit || !n) { return; } if (n.name === name) { hit = n; return; } (n.children || []).forEach(w); })(root);
                return hit;
            },
            toPage: function (wx, wy) {
                const vs = cc.view.getVisibleSize(), rect = cc.game.canvas.getBoundingClientRect();
                const sx = vs.width / rect.width, sy = vs.height / rect.height;
                return { x: rect.left + wx / sx, y: rect.top + rect.height - wy / sy };
            },
            cellPage: function (x, y) {
                const c = window.__T.find('cell_' + x + '_' + y);
                if (!c) { return null; }
                const w = c.convertToWorldSpaceAR(cc.v2(0, 0));
                return window.__T.toPage(w.x, w.y);
            }
        };
    });

    const opened = await page.evaluate(() => {
        const api = window.MazeDashCustomTab;
        if (!api || typeof api.openGridEditor !== 'function') { return { error: 'openGridEditor not exposed' }; }
        api.openGridEditor();
        const s = api.stats || {};
        const tools = [];
        const pal = window.__T.find('gridPalette');
        (pal ? pal.children : []).forEach((c) => { if (String(c.name).indexOf('tool_') === 0) { const l = c.getComponentInChildren && c.getComponentInChildren(cc.Label); tools.push({ name: c.name, label: l ? l.string : null }); } });
        const c00 = window.__T.find('cell_0_0'), c10 = window.__T.find('cell_1_0'), c01 = window.__T.find('cell_0_1');
        const W = (n) => n.convertToWorldSpaceAR(cc.v2(0, 0));
        return {
            tools: tools,
            pitchX: +(W(c10).x - W(c00).x).toFixed(2),
            pitchY: +(W(c00).y - W(c01).y).toFixed(2),
            cell00Page: window.__T.cellPage(0, 0),
            scrollEnabled: (function () { const n = cc.find('Canvas/gameView/scrollView'); return n ? !!n.getComponent(cc.ScrollView).enabled : null; })(),
            tool: s.editorTool
        };
    });
    console.log('OPENED=' + JSON.stringify(opened));

    /* the palette is the real user path: click the tool button instead of calling an internal setter
       (setEditorTool is not exported on MazeDashCustomTab - verified by the failing probe run). */
    const clickPalette = async (name) => {
        const p = await page.evaluate((n) => {
            const c = window.__T.find(n);
            if (!c) { return null; }
            const w = c.convertToWorldSpaceAR(cc.v2(0, 0));
            return window.__T.toPage(w.x, w.y);
        }, name);
        if (!p) { return false; }
        await tap(p.x, p.y, 350);
        return true;
    };

    /* ---- 1) drag the FLOOR tool across 8 cells of row 5 ---- */
    await clickPalette('tool_floor');
    const a = await page.evaluate(() => window.__T.cellPage(4, 5));
    const b = await page.evaluate(() => window.__T.cellPage(11, 5));
    await page.mouse.move(a.x, a.y);
    await page.mouse.down();
    await page.mouse.move(b.x, b.y, { steps: 14 });
    await sleep(120);
    await page.mouse.up();
    await sleep(400);
    const drag = await page.evaluate(() => {
        const s = window.MazeDashCustomTab.stats || {};
        const ed = window.MazeDashCustomTab.gridEditor;
        return {
            dragDowns: s.dragDowns, dragMoves: s.dragMoves, dragLastWorld: s.dragLastWorld,
            dragCellsResolved: s.dragCellsResolved, dragCellsApplied: s.dragCellsApplied,
            dragScrollDisabled: s.dragScrollDisabled, dragSource: s.dragSource,
            dragPaintArmed: s.dragPaintArmed, dragDomBound: s.dragDomBound,
            scrollEnabledDuringDrag: (function () { const n = cc.find('Canvas/gameView/scrollView'); return n ? !!n.getComponent(cc.ScrollView).enabled : null; })(),
            row5_3to12: ed.grid[5].slice(3, 13)
        };
    });
    console.log('DRAG=' + JSON.stringify(drag));

    /* ---- 2) click ONE cell with the HERO tool: matrix must be -1 and the readout must follow ---- */
    const heroTool = await page.evaluate(() => {
        const pal = window.__T.find('gridPalette');
        let hit = null;
        (pal ? pal.children : []).forEach((c) => {
            if (String(c.name).indexOf('tool_') !== 0) { return; }
            const l = c.getComponentInChildren && c.getComponentInChildren(cc.Label);
            if (l && /hero/i.test(String(l.string || ''))) { hit = c.name; }
        });
        return { heroToolName: hit };
    });
    await clickPalette('tool_hero');
    heroTool.active = await page.evaluate(() => (window.MazeDashCustomTab.stats || {}).editorTool);
    const hp = await page.evaluate(() => window.__T.cellPage(2, 9));
    await tap(hp.x, hp.y, 500);
    const hero = await page.evaluate(() => {
        const api = window.MazeDashCustomTab, s = api.stats || {}, ed = api.gridEditor;
        const bg = window.__T.find('gridReadoutBg');
        const rn = bg && bg.getChildByName('gridReadout');
        const sn = bg && bg.getChildByName('gridStatus');
        return {
            cell_2_9: ed.grid[9][2],
            readout: rn && rn.getComponent(cc.Label) ? rn.getComponent(cc.Label).string : null,
            status: sn && sn.getComponent(cc.Label) ? sn.getComponent(cc.Label).string : null,
            readoutFromMatrix: s.readoutFromMatrix, readoutHero: s.readoutHero, gridPaints: s.gridPaints
        };
    });
    console.log('HERO=' + JSON.stringify(heroTool) + ' => ' + JSON.stringify(hero));

    /* ---- 3) single click with the FLOOR tool on an untouched cell: only that cell changes ---- */
    await clickPalette('tool_floor');
    const fp = await page.evaluate(() => window.__T.cellPage(2, 12));
    await tap(fp.x, fp.y, 500);
    const one = await page.evaluate(() => {
        const api = window.MazeDashCustomTab, ed = api.gridEditor;
        let floors = 0;
        ed.grid.forEach((r) => r.forEach((v) => { if (v === 1) { floors++; } }));
        return { cell_2_12: ed.grid[12][2], cell_2_13: ed.grid[13][2], floors: floors, cell_2_9_still_hero: ed.grid[9][2] };
    });
    console.log('ONECLICK=' + JSON.stringify(one));

    /* ---- 4) close the editor via the REAL back button (closeGridEditor is not exported, and the
       earlier probe silently skipped it because of the && short-circuit) ---- */
    const backP = await page.evaluate(() => {
        const n = window.__T.find('gridBack');
        if (!n) { return null; }
        const w = n.convertToWorldSpaceAR(cc.v2(0, 0));
        return window.__T.toPage(w.x, w.y);
    });
    if (backP) { await tap(backP.x, backP.y, 700); } else { console.log('BACK BUTTON NOT FOUND'); }
    await sleep(700);
    const closed = await page.evaluate(() => {
        const s = window.MazeDashCustomTab.stats || {};
        const n = cc.find('Canvas/gameView/scrollView');
        return { scrollEnabledAfterClose: n ? !!n.getComponent(cc.ScrollView).enabled : null, dragScrollRestored: s.dragScrollRestored, rootGone: !cc.find('Canvas/gridEditor') };
    });
    console.log('CLOSED=' + JSON.stringify(closed));
    console.log('ERRS=' + JSON.stringify(errs.slice(0, 4)));
    await page.screenshot({ path: 'E:\\maze_dash\\_work\\test\\shots\\verify-drag.png' });
    await browser.close();
    process.exit(0);
})().catch((e) => { console.error('HARNESS ERROR', e); process.exit(1); });
