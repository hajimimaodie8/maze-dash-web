/* 取证：导入后进关的 wordId 崩溃（栈 + 入参 + 键集合对比）
   顺带打印：AnimScene 的红色主角采样、gridEditor 下的真实节点名。
   运行：NODE_PATH=E:\maze_dash\_work\test\node_modules node tools/verify/probe-import-enter-crash.js */
const puppeteer = require('puppeteer-core');
const CHROME = 'C:\\Users\\Lenovo\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe';
const FILE = 'file:///E:/maze_dash/dist/MazeDash-standalone.html';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const log = (k, v) => console.log('X ' + k + ':', typeof v === 'string' ? v : JSON.stringify(v));

(async () => {
    const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new',
        userDataDir: 'E:\\maze_dash\\_work\\test\\chrome-profile-import2', protocolTimeout: 300000,
        args: ['--no-sandbox','--disable-extensions','--no-first-run','--mute-audio','--allow-file-access-from-files','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader'],
        defaultViewport: { width: 1440, height: 810 } });
    const page = await browser.newPage();
    const stacks = []; page.on('pageerror', (e) => stacks.push(String(e.stack || e.message).replace(/\s+/g, ' ').slice(0, 320)));
    const scene = () => page.evaluate(() => (cc.director.getScene() ? cc.director.getScene().name : '?'));
    async function tap(x, y, s) { await page.mouse.move(x, y); await page.mouse.down(); await sleep(70); await page.mouse.up(); await sleep(s || 900); }
    async function toHall() {
        for (let i = 0; i < 120; i++) { if ((await scene()) === 'HallScene') { return true; } if (i % 3 === 1) { await tap(720, 400, 500); } else { await sleep(400); } }
        return false;
    }

    /* ---------- 2a) AnimScene sampling for the red mascot ---------- */
    await page.goto(FILE, { waitUntil: 'domcontentloaded', timeout: 120000 });
    await page.waitForFunction('window.cc && cc.game && cc.game._prepared === true', { timeout: 120000, polling: 150 });
    let anim = null;
    for (let i = 0; i < 80; i++) {
        const s = await scene();
        if (s === 'AnimScene') {
            anim = await page.evaluate(() => {
                const n = cc.find('Canvas/begin/main');
                return { scene: 'AnimScene', found: !!n, colour: n ? [n.color.r, n.color.g, n.color.b] : null, visible: n ? n.activeInHierarchy : null, sprite: n ? !!n.getComponent(cc.Sprite) : false };
            });
            break;
        }
        await sleep(200);
    }
    log('2a_animMascot', anim || 'AnimScene never sampled');

    await toHall();
    await sleep(3000);

    /* ---------- capture a payload BEFORE wiping ---------- */
    const payload = await page.evaluate(() => JSON.stringify(window.MazeDashCustomTab.buildExportData()));
    const beforeKeys = await page.evaluate(() => ({
        levelCfgCustom: Object.keys(conf.level_cfg).filter((k) => Number(k) >= 10000),
        stage101: Object.keys(conf.stage_level_cfg[101] || {}),
        has10101: !!conf.level_cfg[10101], rows: (conf.all_Level[10101] || []).length,
    }));
    log('1a_beforeWipe', beforeKeys);

    /* ---------- wipe, reload, import, then enter ---------- */
    await page.evaluate(() => { try { localStorage.removeItem('maze_dash_custom_levels'); localStorage.removeItem('maze_dash_custom_worlds'); } catch (e) {} });
    await page.reload({ waitUntil: 'domcontentloaded', timeout: 120000 });
    await page.waitForFunction('window.cc && cc.game && cc.game._prepared === true', { timeout: 120000, polling: 150 });
    await toHall();
    await sleep(3000);
    const afterWipe = await page.evaluate(() => ({ levelCfgCustom: Object.keys(conf.level_cfg).filter((k) => Number(k) >= 10000), stage101: Object.keys(conf.stage_level_cfg[101] || {}), has10101: !!conf.level_cfg[10101] }));
    log('1b_afterWipe', afterWipe);

    const imp = await page.evaluate((json) => {
        const res = window.MazeDashCustomTab.importCustomJson(json);
        return { res: res, entry10101: conf.level_cfg[10101] || null, stage101: Object.keys(conf.stage_level_cfg[101] || {}), rows: (conf.all_Level[10101] || []).length };
    }, payload);
    log('1c_afterImport', imp);

    stacks.length = 0;                                  // only errors from the enter below
    await page.evaluate(() => { try { gamemain.enterEnterGameScene(10101); } catch (e) {} });
    let ok = false;
    for (let i = 0; i < 100; i++) {
        const r = await page.evaluate(() => { const m = cc.find('Canvas/backgroup/game_map'); const cp = m && m.getComponent && m.getComponent('game_map'); return !!(cp && cp.Level_data); });
        if (r) { ok = true; break; }
        await sleep(150);
    }
    await sleep(3000);
    const diag = await page.evaluate(() => {
        const s = window.MazeDashCustomTab.stats;
        return { arg: s.getLastWordIdArg || null, shortCircuit: s.getLastWordIdShortCircuit || 0,
                 lastEnteredWordId: s.lastEnteredWordId || null, keyLog: (s.levelCfgKeys || []).slice(-10),
                 overlay: /运行出错|Uncaught|TypeError/.test((document.body && document.body.innerText) || ''),
                 scene: cc.director.getScene().name };
    });
    log('1d_enterAfterImport', Object.assign({ entered: ok }, diag));
    stacks.slice(0, 3).forEach((s, i) => log('1e_stack' + (i + 1), s));

    /* ---------- 2c) the editor's real node names ---------- */
    await page.evaluate(async () => {
        const api = window.MazeDashCustomTab; api.openGridEditor();
        for (let i = 0; i < 80; i++) { if (api.gridEditor && api.gridEditor.grid && !api.gridEditor.pending) { return; } await new Promise((r) => setTimeout(r, 100)); }
    });
    const names = await page.evaluate(() => {
        const root = cc.find('Canvas/gridEditor') || cc.find('Canvas');
        const direct = (root.children || []).map((n) => n.name);
        const deep = [];
        (function walk(n, d) { if (deep.length < 22 && d > 0) { deep.push(n.name + '@' + d); } (n.children || []).forEach((k) => walk(k, d + 1)); })(root, 0);
        return { direct: direct.slice(0, 14), deep: deep };
    });
    log('2c_editorNodeNames', names);
    await browser.close(); process.exit(0);
})().catch((e) => { console.error('HARNESS ERROR', e); process.exit(1); });
