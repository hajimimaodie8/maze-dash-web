/* CASE D（拆步版）+ P2 颜色恢复
   上次超时的原因：在一个 evaluate 里做了太多事（含页面内长时间 await 轮询）。
   这次每一步都是独立的小 evaluate，轮询放在 Node 侧。
   运行：NODE_PATH=E:\maze_dash\_work\test\node_modules node tools/verify/probe-caseD-split.js */
const puppeteer = require('puppeteer-core');
const CHROME = 'C:\\Users\\Lenovo\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe';
const FILE = 'file:///E:/maze_dash/dist/MazeDash-standalone.html';
const SHOTS = 'E:\\maze_dash\\docs\\screenshots\\';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitHall(page, label) {
    for (let i = 0; i < 120; i++) {
        const s = await page.evaluate(() => (cc.director.getScene() ? cc.director.getScene().name : '?'));
        if (s === 'HallScene') { return s; }
        await sleep(400);
    }
    return 'timeout';
}
async function pollMap(page, label) {
    const t0 = Date.now();
    for (let i = 0; i < 100; i++) {                     // 100 x 150ms = 15s, polling from NODE
        const r = await page.evaluate(() => {
            const map = cc.find('Canvas/backgroup/game_map');
            const comp = map && map.getComponent && map.getComponent('game_map');
            return { hasNode: !!map, hasComp: !!comp, hasData: !!(comp && comp.Level_data),
                     scene: cc.director.getScene() ? cc.director.getScene().name : null };
        });
        if (r.hasData) { return Object.assign(r, { waitedMs: Date.now() - t0, ok: true }); }
        await sleep(150);
    }
    return { ok: false, waitedMs: Date.now() - t0 };
}

(async () => {
    const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new',
        userDataDir: 'E:\\maze_dash\\_work\\test\\chrome-profile-cased', protocolTimeout: 300000,
        args: ['--no-sandbox', '--disable-extensions', '--no-first-run', '--mute-audio',
            '--allow-file-access-from-files', '--enable-unsafe-swiftshader', '--use-gl=angle',
            '--use-angle=swiftshader', '--autoplay-policy=no-user-gesture-required'],
        defaultViewport: { width: 1440, height: 810 } });
    const page = await browser.newPage();
    const errs = []; page.on('pageerror', (e) => errs.push(String(e.message).slice(0, 120)));
    await page.goto(FILE, { waitUntil: 'domcontentloaded', timeout: 120000 });
    await page.waitForFunction('window.cc && cc.game && cc.game._prepared === true', { timeout: 120000, polling: 150 });
    const scene = () => page.evaluate(() => (cc.director.getScene() ? cc.director.getScene().name : null));
    async function tap(x, y, s) { await page.mouse.move(x, y); await page.mouse.down(); await sleep(70); await page.mouse.up(); await sleep(s || 900); }
    for (let i = 0; i < 90; i++) { if ((await scene()) === 'HallScene') { break; } if (i % 3 === 1) { await tap(720, 400, 500); } else { await sleep(400); } }
    await sleep(3000);

    /* ---- step 1: open the editor and paint a level with two DIFFERENT portal colours ---- */
    const s1 = await page.evaluate(async () => {
        const api = window.MazeDashCustomTab; api.openGridEditor();
        for (let i = 0; i < 80; i++) { if (api.gridEditor && api.gridEditor.solve && !api.gridEditor.pending) { break; } await new Promise((r) => setTimeout(r, 100)); }
        const ed = api.gridEditor;
        ed.clear(); ed.setTool('floor');
        [[8,8],[9,8],[10,8],[8,9],[9,9],[10,9],[8,10],[9,10],[10,10]].forEach((p) => ed.paint(p[0], p[1]));
        ed.setTool('hero'); ed.paint(10, 8);
        ed.setTool('portal');
        ed.paint(8, 9);                                   // default colour 4 = purple
        let setRed = false;
        (function walk(n) { if (!setRed && n.name === 'colour_1') { n.emit(cc.Node.EventType.TOUCH_END); setRed = true; } (n.children || []).forEach(walk); })(cc.find('Canvas'));
        ed.paint(9, 9);                                   // red
        return { open: !!ed.solve, setRed: setRed, colours: JSON.parse(JSON.stringify(ed.colours ? ed.colours() : {})),
                 verdict: ed.verdict ? ed.verdict() : null };
    });
    console.log('STEP1 paint  :', JSON.stringify(s1));

    /* ---- step 2: save ONLY (its own evaluate) ---- */
    const s2 = await page.evaluate(() => {
        const api = window.MazeDashCustomTab, ed = api.gridEditor;
        let ret = null, threw = null;
        try { ret = ed.save(); } catch (e) { threw = String(e && e.message).slice(0, 120); }
        const store = JSON.parse(localStorage.getItem('maze_dash_custom_levels') || '{}');
        const ids = Object.keys(store).map(Number).sort((a, b) => a - b);
        const id = ids.length ? ids[ids.length - 1] : null;
        const rec = id ? store[String(id)] : null;
        return { ret: ret, threw: threw, id: id, recordKeys: rec ? Object.keys(rec) : null,
                 colours: rec ? rec.colours : null, gridRows: rec && rec.grid ? rec.grid.length : null,
                 solvableOnSave: api.stats.editorSolvableOnSave, forceSave: api.stats.editorForceSave,
                 levelCfg: id ? (conf.level_cfg[id] || null) : null,
                 allLevelRows: id ? (conf.all_Level[(conf.level_cfg[id] || {}).mapId] || []).length : null,
                 stats: { guarded: api.stats.levelTableNaNGuarded || 0, proto: api.stats.wordIdProtoWrapped || 0 } };
    });
    console.log('STEP2 save   :', JSON.stringify(s2).slice(0, 600));

    /* ---- step 3: reload (fresh page) ---- */
    await page.reload({ waitUntil: 'domcontentloaded', timeout: 120000 });
    await page.waitForFunction('window.cc && cc.game && cc.game._prepared === true', { timeout: 120000, polling: 150 });
    console.log('STEP3 reload :', await waitHall(page, 'after reload'));
    await sleep(3000);
    const s3 = await page.evaluate((id) => ({
        levelCfg: conf.level_cfg[id] || null,
        allLevelRows: (conf.all_Level[(conf.level_cfg[id] || {}).mapId] || []).length,
        nanGuard: (conf.level_cfg['NaN'] || null),
        getLastWordId: (function () { try { return gamemain.getLastWordId(); } catch (e) { return 'THREW ' + e.message.slice(0, 60); } })(),
        keyLog: (window.MazeDashCustomTab.stats.levelCfgKeys || []).slice(-12),
        lastMissing: window.MazeDashCustomTab.stats.levelCfgLastMissing || null,
    }), s2.id);
    console.log('STEP3 conf   :', JSON.stringify(s3).slice(0, 400));

    /* ---- step 4: enter it, poll from NODE ---- */
    await page.evaluate((id) => { try { gamemain.enterEnterGameScene(id); } catch (e) {} }, s2.id);
    const s4 = await pollMap(page, 'saved level');
    console.log('STEP4 enter  :', JSON.stringify(s4));
    const s4b = await page.evaluate(() => ({ restored: window.MazeDashCustomTab.stats.colourTableRestored || 0 }));
    console.log('STEP4 colourRestored:', JSON.stringify(s4b));
    console.log('STEP4 keyLog    :', JSON.stringify(await page.evaluate(() => ({ keys: (window.MazeDashCustomTab.stats.levelCfgKeys || []).slice(-14), lastMissing: window.MazeDashCustomTab.stats.levelCfgLastMissing || null, arg: window.MazeDashCustomTab.stats.getLastWordIdArg || null, shortCircuit: window.MazeDashCustomTab.stats.getLastWordIdShortCircuit || 0 }))));
    if (s4.ok) { await page.screenshot({ path: SHOTS + '59-entered-after-reload.png' }); }

    /* ---- step 5 (P2): the test level with its six known portals ---- */
    await page.evaluate(() => { try { gamemain.showTabBarViewIndex = 1; window.hallScene.showBarView(); } catch (e) {} });
    await sleep(1500);
    await page.evaluate(() => { try { gamemain.enterEnterGameScene(10101); } catch (e) {} });
    const s5 = await pollMap(page, 'test level 10101');
    console.log('STEP5 test lvl:', JSON.stringify(s5));
    const s5b = await page.evaluate(() => {
        const map = cc.find('Canvas/backgroup/game_map');
        const comp = map && map.getComponent('game_map');
        const out = { restored: window.MazeDashCustomTab.stats.colourTableRestored || 0 };
        if (comp && comp.Level_data) {
            const portals = [];
            Object.keys(comp.Level_data).forEach((y) => Object.keys(comp.Level_data[y]).forEach((x) => { if (comp.Level_data[y][x] === 2) { portals.push([parseInt(x, 10), parseInt(y, 10)]); } }));
            out.portalCount = portals.length;
            out.pairing = portals.map((p) => p.join(',') + ' -> ' + (function () { const d = comp.getOutPortal(cc.v2(p[0], p[1])); return d.x + ',' + d.y; })());
            let heads = 0; Object.keys(comp.Level_data).forEach((y) => Object.keys(comp.Level_data[y]).forEach((x) => { if (comp.Level_data[y][x] === -1) { heads++; } }));
            out.heads = heads; out.rows = Object.keys(comp.Level_data).length;
        }
        return out;
    });
    console.log('STEP5 pairing:', JSON.stringify(s5b));
    await page.screenshot({ path: SHOTS + '60-testlevel-colours-after-reload.png' });
    console.log('PAGE ERRORS  :', JSON.stringify(errs.slice(0, 3)));
    await browser.close();
    process.exit(0);
})().catch((e) => { console.error('HARNESS ERROR', e); process.exit(1); });
