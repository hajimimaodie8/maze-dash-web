/* 诊断两个 bug：
   ① 保存的关卡记录形状 / 重载后 conf 状态 / 进入时 wordId 报错的真实来源
   ② 求解器对"已知可解的关卡"是否会误报 undecided（用原版世界1第1关的矩阵测，它有官方解法）
   运行：NODE_PATH=E:\maze_dash\_work\test\node_modules node tools/verify/probe-solver-diagnose.js */
const puppeteer = require('puppeteer-core');
const CHROME = 'C:\\Users\\Lenovo\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe';
const FILE = 'file:///E:/maze_dash/dist/MazeDash-standalone.html';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function boot(browser) {
    const page = await browser.newPage();
    const errs = [];
    page.on('pageerror', (e) => errs.push(String(e.message).slice(0, 140)));
    await page.goto(FILE, { waitUntil: 'domcontentloaded', timeout: 120000 });
    await page.waitForFunction('window.cc && cc.game && cc.game._prepared === true', { timeout: 120000, polling: 150 });
    const scene = () => page.evaluate(() => (cc.director.getScene() ? cc.director.getScene().name : null));
    async function tap(x, y, s) { await page.mouse.move(x, y); await page.mouse.down(); await sleep(70); await page.mouse.up(); await sleep(s || 900); }
    for (let i = 0; i < 90; i++) { if ((await scene()) === 'HallScene') { break; } if (i % 3 === 1) { await tap(720, 400, 500); } else { await sleep(400); } }
    await sleep(3000);
    return { page, errs };
}

(async () => {
    const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new',
        userDataDir: 'E:\\maze_dash\\_work\\test\\chrome-profile-diag3', protocolTimeout: 240000,
        args: ['--no-sandbox', '--disable-extensions', '--no-first-run', '--mute-audio',
            '--allow-file-access-from-files', '--enable-unsafe-swiftshader', '--use-gl=angle',
            '--use-angle=swiftshader', '--autoplay-policy=no-user-gesture-required'],
        defaultViewport: { width: 1440, height: 810 } });

    const { page, errs } = await boot(browser);

    /* ---------- bug ②：求解器对原版第 1 关（有官方解法）的判定 ---------- */
    const shipped = await page.evaluate(() => {
        const api = window.MazeDashCustomTab;
        if (api.openGridEditor) { api.openGridEditor(); }
        const ed = api.gridEditor;
        // 原版世界 1 第 1 关的矩阵（若它已被清空则说明世界1被覆盖过，这里同时是个回归检查）
        const cfg = conf.stage_level_cfg[1] || {};
        const first = cfg[Object.keys(cfg)[0]];
        const grid = first ? conf.all_Level[first.mapId] : null;
        if (!grid) { return { error: 'no shipped level 1 grid' }; }
        const rows = grid.length, cols = grid[0] ? grid[0].length : 0;
        let heads = 0, floors = 0;
        grid.forEach((r) => r.forEach((v) => { if (v === -1) { heads++; } if (v === 1) { floors++; } }));
        // 画进编辑器再求解（编辑器只暴露 paint，所以逐格画）
        ed.clear();
        ed.setTool('floor');
        const t0 = performance.now();
        for (let y = 0; y < rows; y++) { for (let x = 0; x < cols; x++) { if (grid[y][x] === 1) { ed.paint(x, y); } } }
        ed.setTool('hero');
        for (let y = 0; y < rows; y++) { for (let x = 0; x < cols; x++) { if (grid[y][x] === -1) { ed.paint(x, y); } } }
        ed.setTool('brick');
        for (let y = 0; y < rows; y++) { for (let x = 0; x < cols; x++) { if (grid[y][x] === -4) { ed.paint(x, y); } } }
        ed.setTool('key');
        for (let y = 0; y < rows; y++) { for (let x = 0; x < cols; x++) { if (grid[y][x] === 4) { ed.paint(x, y); } } }
        ed.setTool('lock');
        for (let y = 0; y < rows; y++) { for (let x = 0; x < cols; x++) { if (grid[y][x] === -3) { ed.paint(x, y); } } }
        ed.setTool('portal');
        for (let y = 0; y < rows; y++) { for (let x = 0; x < cols; x++) { if (grid[y][x] === 2) { ed.paint(x, y); } } }
        for (let d = 0; d < 4; d++) {
            const tool = ['up', 'right', 'down', 'left'][d], val = 5 + d;
            ed.setTool(tool);
            for (let y = 0; y < rows; y++) { for (let x = 0; x < cols; x++) { if (grid[y][x] === val) { ed.paint(x, y); } } }
        }
        const t1 = performance.now();
        const v = ed.solve();
        const t2 = performance.now();
        return { mapId: first.mapId, size: [cols, rows], heads: heads, floors: floors,
                 officialSolution: first.sz_solution || null,
                 verdict: v.state, reason: v.reason, moves: v.moves, nodes: v.nodes,
                 paintMs: Math.round(t1 - t0), solveMs: Math.round(t2 - t1) };
    });
    console.log('SHIPPED L1:', JSON.stringify(shipped));

    /* ---------- bug ①：保存记录形状 + 重载后的 conf 状态 ---------- */
    const saved = await page.evaluate(() => {
        const api = window.MazeDashCustomTab, ed = api.gridEditor;
        ed.clear();
        ed.setTool('floor');
        [[8, 8], [9, 8], [8, 9], [9, 9]].forEach((p) => ed.paint(p[0], p[1]));
        ed.setTool('hero'); ed.paint(8, 8);
        ed.save();
        const store = JSON.parse(localStorage.getItem('maze_dash_custom_levels') || '{}');
        const ids = Object.keys(store).map(Number).sort((a, b) => a - b);
        const id = ids[ids.length - 1];
        return { id: id, record: store[String(id)], allIds: ids };
    });
    console.log('SAVED RECORD:', JSON.stringify(saved).slice(0, 700));

    await page.reload({ waitUntil: 'domcontentloaded', timeout: 120000 });
    await page.waitForFunction('window.cc && cc.game && cc.game._prepared === true', { timeout: 120000, polling: 150 });
    for (let i = 0; i < 90; i++) { const s = await page.evaluate(() => (cc.director.getScene() ? cc.director.getScene().name : null)); if (s === 'HallScene') { break; } await sleep(400); }
    await sleep(3500);

    const afterReload = await page.evaluate((id) => {
        const lc = conf.level_cfg[id] || null;
        const wid = lc ? lc.wordId : null;
        return {
            levelCfg: lc,
            world_of_level: wid,
            confWorlds_101: conf.worlds[101] || null,
            confWorlds_of_wordId: wid != null ? (conf.worlds[wid] || null) : null,
            stageLevelCfg_101: !!conf.stage_level_cfg[101],
            allLevel: !!conf.all_Level[lc ? lc.mapId : -1],
            storedRecord: (JSON.parse(localStorage.getItem('maze_dash_custom_levels') || '{}')[String(id)] || null),
        };
    }, saved.id);
    console.log('AFTER RELOAD conf:', JSON.stringify(afterReload).slice(0, 900));

    // try to enter it and capture the exact failure
    const enter = await page.evaluate(async (id) => {
        try { gamemain.enterEnterGameScene(id); } catch (e) { return { threw: String(e && e.message).slice(0, 140) }; }
        const t0 = performance.now();
        for (let i = 0; i < 80; i++) {
            const map = cc.find('Canvas/backgroup/game_map');
            const comp = map && map.getComponent && map.getComponent('game_map');
            if (comp && comp.Level_data) { return { ok: true, waitedMs: Math.round(performance.now() - t0) }; }
            await new Promise((r) => setTimeout(r, 150));
        }
        return { ok: false, waitedMs: Math.round(performance.now() - t0), scene: cc.director.getScene() ? cc.director.getScene().name : null };
    }, saved.id);
    console.log('ENTER after reload:', JSON.stringify(enter));
    console.log('PAGE ERRORS:', JSON.stringify(errs.slice(0, 4)));
    await browser.close();
    process.exit(0);
})().catch((e) => { console.error('HARNESS ERROR', e); process.exit(1); });
