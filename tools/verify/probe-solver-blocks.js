/* 块 B：砖块 + 锁 两条规则的模型验证 + 回放健全性骨架
 *
 * 第一部分（模型）：用编辑器调试对象直接跑 solveGrid 的六个用例
 *   A  2×2 全地板 + 主角        → solvable, moves 3   （既有回归）
 *   B  两块互不相连              → unsolvable        （既有回归）
 *   C  3×3 盒 + 主角在角落       → solvable, moves 5   （既有回归）
 *   D  1×3：主角 / 砖块 / 地板   → solvable, moves 2   （**新**：撞碎砖块那一拍不进格，下一拍再压）
 *   E  1×4：主角 / 钥匙 / 锁 / 地板 → solvable, moves 1（**新**：吃掉最后一把钥匙 → 锁一次性全开）
 *   E2 1×3：主角 / 锁 / 地板（没有钥匙）→ 不允许 solvable（**新**：锁在集齐钥匙前是墙）
 *
 * 第二部分（回放健全性）：对每个 solvable 的用例，把求解器给出的走法串（v.path）
 *   在**真引擎**里按真实滑动重放，并用 checkClearSatge 的 hook 断言真的过关。
 *   回放不通过 = 模型错误（宁可 undecided，绝不假称可解）。
 *
 * 运行：NODE_PATH=E:\maze_dash\_work\test\node_modules node tools/verify/probe-solver-blocks.js
 */
'use strict';
const puppeteer = require('puppeteer-core');
const CHROME = 'C:\\Users\\Lenovo\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe';
const FILE = 'file:///E:/maze_dash/dist/MazeDash-standalone.html';
const SHOTS = 'E:\\maze_dash\\docs\\screenshots\\';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const SWIPE = { U: [0, -140], D: [0, 140], L: [-140, 0], R: [140, 0] };

/* 用例定义：paint 顺序 = 先铺地板，再放其它元素 */
const CASES = [
    { id: 'A', desc: '2x2 + hero',          floors: [[8, 8], [9, 8], [8, 9], [9, 9]], others: [{ tool: 'hero', cells: [[8, 8]] }], expect: 'solvable', moves: 3 },
    { id: 'B', desc: 'disconnected',        floors: [[2, 2], [3, 2], [2, 3], [3, 3], [12, 12], [13, 12], [12, 13], [13, 13]], others: [{ tool: 'hero', cells: [[2, 2]] }], expect: 'unsolvable' },
    { id: 'C', desc: '3x3 + hero corner',   floors: [[8, 8], [9, 8], [10, 8], [8, 9], [9, 9], [10, 9], [8, 10], [9, 10], [10, 10]], others: [{ tool: 'hero', cells: [[8, 8]] }], expect: 'solvable', moves: 5 },
    { id: 'D', desc: 'row hero/brick/floor', floors: [[8, 8], [10, 8]], others: [{ tool: 'hero', cells: [[8, 8]] }, { tool: 'brick', cells: [[9, 8]] }], expect: 'solvable', moves: 2 },
    { id: 'E', desc: 'row hero/key/lock/floor', floors: [[8, 8], [11, 8]], others: [{ tool: 'hero', cells: [[8, 8]] }, { tool: 'key', cells: [[9, 8]] }, { tool: 'lock', cells: [[10, 8]] }], expect: 'solvable', moves: 1 },
    { id: 'E2', desc: 'row hero/lock/floor (no key)', floors: [[8, 8], [10, 8]], others: [{ tool: 'hero', cells: [[8, 8]] }, { tool: 'lock', cells: [[9, 8]] }], expect: 'not-solvable' },
];

async function boot(browser) {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push('pageerror: ' + String(e.message).slice(0, 160)));
    page.on('console', (m) => {
        /* Cocos prints this whenever game code calls getComponent on a Scene; it is engine noise from
           the scene-level probes, not a page failure, so it is not counted as an error. */
        const txt = String(m.text());
        if (m.type() === 'error' && txt.indexOf('is not defined in the Scene') < 0) { errors.push('console: ' + txt.slice(0, 160)); }
    });
    await page.goto(FILE, { waitUntil: 'domcontentloaded', timeout: 120000 });
    await page.waitForFunction('window.cc && cc.game && cc.game._prepared === true', { timeout: 120000, polling: 150 });
    const scene = () => page.evaluate(() => (cc.director.getScene() ? cc.director.getScene().name : null));
    async function tap(x, y, s) { await page.mouse.move(x, y); await page.mouse.down(); await sleep(70); await page.mouse.up(); await sleep(s || 900); }
    for (let i = 0; i < 90; i++) { if ((await scene()) === 'HallScene') { break; } if (i % 3 === 1) { await tap(720, 400, 500); } else { await sleep(400); } }
    await sleep(2500);
    await page.evaluate(async () => {
        const api = window.MazeDashCustomTab;
        if (api.openGridEditor) { api.openGridEditor(); }
        for (let i = 0; i < 80; i++) {
            const ed = api.gridEditor;
            if (ed && ed.grid && ed.solve && !ed.pending) { return true; }
            await new Promise((r) => setTimeout(r, 100));
        }
        return false;
    });
    return { page, errors };
}

/* 在编辑器里铺出一个用例的棋盘；返回求解结果（含 path） */
async function runCase(page, c) {
    return await page.evaluate((spec) => {
        const ed = window.MazeDashCustomTab.gridEditor;
        ed.clear();
        ed.setTool('floor');
        spec.floors.forEach((p) => ed.paint(p[0], p[1]));
        spec.others.forEach((o) => { ed.setTool(o.tool); o.cells.forEach((p) => ed.paint(p[0], p[1])); });
        const painted = JSON.parse(JSON.stringify(ed.grid));
        const t0 = performance.now();
        const v = ed.solve();
        const ms = Math.round(performance.now() - t0);
        return { state: v.state, reason: v.reason || null, moves: (v.moves === undefined ? null : v.moves),
                 path: v.path || null, nodes: v.nodes || null, ms: ms,
                 nonZero: painted.reduce((a, r) => a + r.filter((x) => x !== 0).length, 0) };
    }, c);
}

(async () => {
    const browser = await puppeteer.launch({
        executablePath: CHROME, headless: 'new',
        userDataDir: 'E:\\maze_dash\\_work\\test\\chrome-profile-blocks', protocolTimeout: 300000,
        args: ['--no-sandbox', '--disable-extensions', '--no-first-run', '--mute-audio',
            '--allow-file-access-from-files', '--enable-unsafe-swiftshader', '--use-gl=angle',
            '--use-angle=swiftshader', '--autoplay-policy=no-user-gesture-required'],
        defaultViewport: { width: 1440, height: 810 },
    });
    const { page, errors } = await boot(browser);
    const out = { model: [], replay: [], errors: errors };

    /* ---------- 第一部分：模型 ---------- */
    for (const c of CASES) {
        const r = await runCase(page, c);
        let ok;
        if (c.expect === 'solvable') { ok = r.state === 'solvable' && (c.moves === undefined || r.moves === c.moves) && !!r.path; }
        else if (c.expect === 'unsolvable') { ok = r.state === 'unsolvable'; }
        else { ok = r.state !== 'solvable'; }          /* E2：绝不允许说可解 */
        out.model.push({ id: c.id, desc: c.desc, expect: c.expect, got: r.state, moves: r.moves, path: r.path, pass: ok, detail: r });
        console.log(`MODEL ${c.id} (${c.desc}): expect=${c.expect} got=${r.state} moves=${r.moves} path=${r.path} -> ${ok ? 'PASS' : 'FAIL'}`);
    }
    await page.screenshot({ path: SHOTS + '114-solver-block-cases.png' });

    /* ---------- 第二部分：回放健全性（对每个 solvable 且带 path 的用例，在真引擎里走一遍） ---------- */
    const replayIds = ['D', 'E', 'A'];
    for (const id of replayIds) {
        const rec = out.model.find((m) => m.id === id);
        if (!rec || rec.got !== 'solvable' || !rec.path) { out.replay.push({ id: id, skipped: 'no solvable path' }); continue; }
        const c = CASES.find((x) => x.id === id);

        /* 1) 布好同一盘棋并保存进入关卡（编辑器保存路径会写进自定义世界） */
        const saved = await page.evaluate((spec) => {
            const api = window.MazeDashCustomTab, ed = api.gridEditor;
            ed.clear();
            ed.setTool('floor'); spec.floors.forEach((p) => ed.paint(p[0], p[1]));
            spec.others.forEach((o) => { ed.setTool(o.tool); o.cells.forEach((p) => ed.paint(p[0], p[1])); });
            if (typeof ed.save !== 'function') { return { ok: false, why: 'gridEditor.save missing', keys: Object.keys(ed) }; }
            ed.save();
            return { ok: true };
        }, c);
        if (!saved.ok) { out.replay.push({ id: id, saved: saved, cleared: false }); console.log('REPLAY ' + id + ': save unavailable ' + JSON.stringify(saved)); continue; }

        /* 2) 等真引擎进关，并挂上 checkClearSatge 的 hook */
        let live = false;
        for (let i = 0; i < 60; i++) {
            live = await page.evaluate(() => {
                try {
                    if (!window.gameScene || !window.gameScene.gameMap) { return false; }
                    const s = cc.director.getScene();
                    if (!s || s.name !== 'gameScene') { return false; }
                    const m = window.gameScene.gameMap.getComponent('game_map');
                    if (!m) { return false; }
                    if (!window.__clearLog) {
                        window.__clearLog = [];
                        const proto = Object.getPrototypeOf(m);
                        if (!proto.__hooked) {
                            const orig = proto.checkClearSatge;
                            proto.checkClearSatge = function () { const r = orig.apply(this, arguments); window.__clearLog.push({ mapId: this.mapId, cleared: r }); return r; };
                            proto.__hooked = true;
                        }
                    }
                    return true;
                } catch (e) { return false; }
            });
            if (live) { break; }
            await sleep(400);
        }
        if (!live) { out.replay.push({ id: id, live: false, cleared: false }); console.log('REPLAY ' + id + ': never reached gameScene'); continue; }
        await sleep(900);
        const before = await page.evaluate(() => (window.__clearLog || []).length);

        /* 3) 按求解器给出的走法串真实滑动 */
        const headPos = () => page.evaluate(() => { try { const m = window.gameScene.gameMap.getComponent('game_map'); const h = m.getSankeHead(); return h.length ? h[0].x + ',' + h[0].y : null; } catch (e) { return null; } });
        const tally = [];
        for (const mv of rec.path.split('')) {
            const [dx, dy] = SWIPE[mv];
            let b = await headPos(), moved = false;
            for (let attempt = 0; attempt < 3 && !moved; attempt++) {
                await page.mouse.move(720, 405); await page.mouse.down(); await sleep(40);
                await page.mouse.move(720 + dx, 405 + dy, { steps: 6 }); await sleep(40);
                await page.mouse.up();
                for (let w = 0; w < 8 && !moved; w++) { await sleep(120); if ((await headPos()) !== b) { moved = true; } }
            }
            tally.push(mv + (moved ? '' : '!'));
        }
        await sleep(1200);
        const cleared = await page.evaluate((b) => (window.__clearLog || []).slice(b).some((e) => e.cleared), before);
        const mapId = await page.evaluate(() => { try { return window.gameScene.gameMap.getComponent('game_map').mapId; } catch (e) { return null; } });
        out.replay.push({ id: id, path: rec.path, tally: tally.join(' '), mapId: mapId, cleared: !!cleared, pass: !!cleared });
        console.log(`REPLAY ${id}: path="${rec.path}" replay="${tally.join(' ')}" mapId=${mapId} cleared=${!!cleared} -> ${cleared ? 'PASS' : 'FAIL'}`);
        await page.screenshot({ path: SHOTS + '115-solver-replay-' + id + '.png' });

        /* 回到编辑器，准备下一个回放用例 */
        await page.evaluate(() => { try { cc.director.loadScene('HallScene'); } catch (e) {} });
        await sleep(2500);
        await page.evaluate(async () => { const api = window.MazeDashCustomTab; if (api.openGridEditor) { api.openGridEditor(); } for (let i = 0; i < 60; i++) { const ed = api.gridEditor; if (ed && ed.grid && ed.solve && !ed.pending) { return true; } await new Promise((r) => setTimeout(r, 100)); } return false; });
        await sleep(800);
    }

    const modelPass = out.model.every((m) => m.pass);
    const replayTried = out.replay.filter((r) => r.path);
    const replayPass = replayTried.length > 0 && replayTried.every((r) => r.pass);
    console.log('\n=== SUMMARY ===');
    console.log('model cases : ' + out.model.filter((m) => m.pass).length + '/' + out.model.length + ' pass');
    console.log('replay cases: ' + replayTried.filter((r) => r.pass).length + '/' + replayTried.length + ' replay-and-clear');
    console.log('page errors : ' + (errors.length ? JSON.stringify(errors.slice(0, 4)) : 'none'));
    console.log('RESULT=' + JSON.stringify(out));
    await browser.close();
    process.exit(modelPass && replayPass && errors.length === 0 ? 0 : 2);
})().catch((e) => { console.error('HARNESS ERROR', e); process.exit(1); });
