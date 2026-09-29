/* 求解器三态 + 颜色恢复 的收尾验证（子代理补测）
   用例 A：2×2 全地板 + 主角        → 期望 solvable（打印步数/节点/耗时）
   用例 B：两块互不相连的地板        → 期望 unsolvable / disconnectedFloor
   用例 C：3×3 空盒 + 主角（角落）   → 复核上一个代理"不可解"的说法
   用例 D：彩色传送门关卡 → 保存 → **重载页面** → 进关 → 问引擎"两个门通向哪"（轮询等 game_map）
   运行：NODE_PATH=E:\maze_dash\_work\test\node_modules node tools/verify/probe-solver-cases.js */
const puppeteer = require('puppeteer-core');
const CHROME = 'C:\\Users\\Lenovo\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe';
const FILE = 'file:///E:/maze_dash/dist/MazeDash-standalone.html';
const SHOTS = 'E:\\maze_dash\\docs\\screenshots\\';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function boot(browser) {
    const page = await browser.newPage();
    page.on('pageerror', (e) => console.log('PAGEERROR', String(e.message).slice(0, 120)));
    await page.goto(FILE, { waitUntil: 'domcontentloaded', timeout: 120000 });
    await page.waitForFunction('window.cc && cc.game && cc.game._prepared === true', { timeout: 120000, polling: 150 });
    const scene = () => page.evaluate(() => (cc.director.getScene() ? cc.director.getScene().name : null));
    async function tap(x, y, s) { await page.mouse.move(x, y); await page.mouse.down(); await sleep(70); await page.mouse.up(); await sleep(s || 900); }
    for (let i = 0; i < 90; i++) { if ((await scene()) === 'HallScene') { break; } if (i % 3 === 1) { await tap(720, 400, 500); } else { await sleep(400); } }
    await sleep(3000);
    return page;
}

/* 打开编辑器并返回可用工具 id 列表（顺便确认 setTool 的合法值） */
async function openEditor(page) {
    return await page.evaluate(async () => {
        const api = window.MazeDashCustomTab;
        if (api.openGridEditor) { api.openGridEditor(); }
        // poll: the debug object is only complete once the editor has finished building
        for (let i = 0; i < 80; i++) {
            const ed = api.gridEditor;
            if (ed && ed.grid && ed.solve && !ed.pending) {
                const ids = [];
                if (ed.tools) { try { ed.tools().forEach((t) => ids.push(t.id)); } catch (e) {} }
                return { hasEditor: true, ids: ids, keys: Object.keys(ed), waited: i * 100 };
            }
            await new Promise((r) => setTimeout(r, 100));
        }
        return { hasEditor: false, keys: Object.keys(api) };
    });
}

/* 用一次 evaluate 跑一个用例：清空 → 画 → 求解（带耗时） */
async function runCase(page, spec) {
    return await page.evaluate((s) => {
        const ed = window.MazeDashCustomTab.gridEditor;
        ed.clear();
        const t0 = performance.now();
        ed.setTool('floor');
        s.floors.forEach((p) => ed.paint(p[0], p[1]));
        s.others.forEach((o) => { ed.setTool(o.tool); o.cells.forEach((p) => ed.paint(p[0], p[1])); });
        const painted = JSON.parse(JSON.stringify(ed.grid));
        const t1 = performance.now();
        const v = ed.solve();
        const t2 = performance.now();
        return { state: v.state, reason: v.reason, moves: v.moves, nodes: v.nodes,
                 paintMs: Math.round(t1 - t0), solveMs: Math.round(t2 - t1),
                 nonZero: painted.reduce((a, r) => a + r.filter((x) => x !== 0).length, 0) };
    }, spec);
}

(async () => {
    const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new',
        userDataDir: 'E:\\maze_dash\\_work\\test\\chrome-profile-solv2', protocolTimeout: 240000,
        args: ['--no-sandbox', '--disable-extensions', '--no-first-run', '--mute-audio',
            '--allow-file-access-from-files', '--enable-unsafe-swiftshader', '--use-gl=angle',
            '--use-angle=swiftshader', '--autoplay-policy=no-user-gesture-required'],
        defaultViewport: { width: 1440, height: 810 } });

    const page = await boot(browser);
    const info = await openEditor(page);
    console.log('EDITOR:', JSON.stringify(info));

    // ---- A: 2x2 all floor + hero ----
    const a = await runCase(page, { floors: [[8, 8], [9, 8], [8, 9], [9, 9]], others: [{ tool: 'hero', cells: [[8, 8]] }] });
    console.log('CASE A (2x2 + hero)      :', JSON.stringify(a));
    await page.screenshot({ path: SHOTS + '56-solver-solvable.png' });

    // ---- B: two disconnected 2x2 blocks ----
    const b = await runCase(page, {
        floors: [[2, 2], [3, 2], [2, 3], [3, 3], [12, 12], [13, 12], [12, 13], [13, 13]],
        others: [{ tool: 'hero', cells: [[2, 2]] }],
    });
    console.log('CASE B (disconnected)    :', JSON.stringify(b));
    await page.screenshot({ path: SHOTS + '57-solver-unsolvable.png' });

    // ---- C: 3x3 box + hero in a corner (re-check the earlier "unsolvable" claim) ----
    const c = await runCase(page, {
        floors: [[8, 8], [9, 8], [10, 8], [8, 9], [9, 9], [10, 9], [8, 10], [9, 10], [10, 10]],
        others: [{ tool: 'hero', cells: [[8, 8]] }],
    });
    console.log('CASE C (3x3 box + hero)  :', JSON.stringify(c));

    // ---- D: coloured portals survive a reload -------------------------------------------
    // TWO DIFFERENT colours on purpose: purple (default, 4) and red (1).
    //  - if the per-map colour table is restored -> purple finds no purple partner -> stays put
    //  - if it is lost -> the wrapper falls back to "pair with any portal" -> purple jumps to red
    // so this distinguishes the two cases, which an all-purple level could not.
    const built = await page.evaluate(() => {
        const api = window.MazeDashCustomTab, ed = api.gridEditor;
        ed.clear();
        ed.setTool('floor');
        [[8, 8], [9, 8], [10, 8], [8, 9], [9, 9], [10, 9], [8, 10], [9, 10], [10, 10]].forEach((p) => ed.paint(p[0], p[1]));
        ed.setTool('hero'); ed.paint(10, 8);
        ed.setTool('portal');
        ed.paint(8, 9);                                  // default colour 4 = purple
        let setRed = false;
        (function walk(n) {
            if (!setRed && n.name === 'colour_1' && n.activeInHierarchy) { n.emit(cc.Node.EventType.TOUCH_END); setRed = true; }
            (n.children || []).forEach(walk);
        })(cc.find('Canvas'));
        ed.paint(9, 9);                                  // red
        const colours = JSON.parse(JSON.stringify(ed.colours ? ed.colours() : {}));
        const first = ed.save();
        const stored = JSON.parse(localStorage.getItem('maze_dash_custom_levels') || '{}');
        const ids = Object.keys(stored).map(Number).sort((x, y) => x - y);
        const last = ids.length ? ids[ids.length - 1] : null;
        return { setRed: setRed, editorColours: colours, firstReturn: first, savedId: last,
                 storedColours: last ? (stored[String(last)].colours || null) : null };
    });

    // reload, then enter that level and POLL for game_map before asking anything
    await page.reload({ waitUntil: 'domcontentloaded', timeout: 120000 });
    await page.waitForFunction('window.cc && cc.game && cc.game._prepared === true', { timeout: 120000, polling: 150 });
    for (let i = 0; i < 90; i++) { const s = await page.evaluate(() => (cc.director.getScene() ? cc.director.getScene().name : null)); if (s === 'HallScene') { break; } await sleep(400); }
    await sleep(3000);
    await page.evaluate((id) => { gamemain.enterEnterGameScene(id); }, built.savedId);
    const polled = await page.evaluate(async (id) => {
        const t0 = performance.now();
        for (let i = 0; i < 100; i++) {                       // 100 × 150ms = 15s 上限
            const map = cc.find('Canvas/backgroup/game_map');
            const comp = map && map.getComponent && map.getComponent('game_map');
            if (comp && comp.Level_data) {
                return { ok: true, waitedMs: Math.round(performance.now() - t0), scene: cc.director.getScene().name };
            }
            await new Promise((r) => setTimeout(r, 150));
        }
        return { ok: false, waitedMs: Math.round(performance.now() - t0), scene: cc.director.getScene() ? cc.director.getScene().name : null };
    }, built.savedId);
    console.log('CASE D poll game_map     :', JSON.stringify(polled));

    const pairing = await page.evaluate(() => {
        const map = cc.find('Canvas/backgroup/game_map');
        const comp = map && map.getComponent('game_map');
        if (!comp || !comp.Level_data) { return { error: 'no game_map / Level_data after polling' }; }
        const portals = [];
        const rows = Object.keys(comp.Level_data);
        rows.forEach((y) => { Object.keys(comp.Level_data[y]).forEach((x) => { if (comp.Level_data[y][x] === 2) { portals.push([parseInt(x, 10), parseInt(y, 10)]); } }); });
        const map2 = portals.map((p) => { const d = comp.getOutPortal(cc.v2(p[0], p[1])); return p.join(',') + ' -> ' + d.x + ',' + d.y; });
        let heads = 0;
        rows.forEach((y) => Object.keys(comp.Level_data[y]).forEach((x) => { if (comp.Level_data[y][x] === -1) { heads++; } }));
        return { portalCount: portals.length, pairing: map2, heads: heads, rows: rows.length };
    });
    console.log('CASE D pairing after reload:', JSON.stringify(pairing));
    await page.screenshot({ path: SHOTS + '58-solver-colour-after-reload.png' });
    await browser.close();
    process.exit(0);
})().catch((e) => { console.error('HARNESS ERROR', e); process.exit(1); });
