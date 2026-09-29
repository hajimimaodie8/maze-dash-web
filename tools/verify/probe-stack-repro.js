const puppeteer = require('puppeteer-core');
const CHROME = 'C:\\Users\\Lenovo\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe';
const FILE = 'file:///E:/maze_dash/dist/MazeDash-standalone.html';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const log = (k, v) => console.log('S ' + k + ':', typeof v === 'string' ? v : JSON.stringify(v));
(async () => {
    const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', userDataDir: 'E:\\maze_dash\\_work\\test\\chrome-profile-stack2', protocolTimeout: 300000,
        args: ['--no-sandbox','--disable-extensions','--no-first-run','--mute-audio','--allow-file-access-from-files','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader'], defaultViewport: { width: 1440, height: 810 } });
    const page = await browser.newPage();
    const stacks = []; const marks = [];
    page.on('pageerror', (e) => stacks.push({ t: Date.now(), s: String(e.stack || e.message).replace(/\s+/g, ' ').slice(0, 420) }));
    const scene = () => page.evaluate(() => (cc.director.getScene() ? cc.director.getScene().name : '?'));
    async function tap(x, y, s) { await page.mouse.move(x, y); await page.mouse.down(); await sleep(70); await page.mouse.up(); await sleep(s || 900); }
    async function toHall() { for (let i = 0; i < 120; i++) { if ((await scene()) === 'HallScene') { return; } if (i % 3 === 1) { await tap(720, 400, 500); } else { await sleep(400); } } }
    await page.goto(FILE, { waitUntil: 'domcontentloaded', timeout: 120000 });
    await page.waitForFunction('window.cc && cc.game && cc.game._prepared === true', { timeout: 120000, polling: 150 });
    await toHall(); await sleep(3000);

    /* ---- R4: open the dialog, walk ONLY editorDialog, close by dim or by a real close node ---- */
    const r4 = await page.evaluate(async () => {
        const api = window.MazeDashCustomTab;
        try { api.editorAction('createWorld'); } catch (e) {}
        await new Promise((r) => setTimeout(r, 900));
        const d = cc.find('Canvas/editorDialog');
        const kids = d ? d.children.map((n) => n.name) : [];
        const deep = [];
        (function walk(n, dep) { if (deep.length < 20 && dep > 0) { deep.push(n.name + '@' + dep); } (n.children || []).forEach((k) => walk(k, dep + 1)); })(d || cc.find('Canvas'), 0);
        const openInputs = document.querySelectorAll('input').length;
        let how = null;
        if (d) {
            const dim = d.getChildByName('dim');
            if (dim) { dim.emit(cc.Node.EventType.TOUCH_END); how = 'dim TOUCH_END'; }
            if (!how) { let t2 = null; (function walk2(n) { if (!t2 && /^(btn_?)?(close|cancel|back)/i.test(n.name)) { t2 = n; } (n.children || []).forEach(walk2); })(d); if (t2) { t2.emit(cc.Node.EventType.TOUCH_END); how = 'click ' + t2.name; } }
        }
        await new Promise((r) => setTimeout(r, 800));
        const afterInputs = document.querySelectorAll('input').length;
        const d2 = cc.find('Canvas/editorDialog');
        const activeAfter = d2 ? (d2.activeInHierarchy && d2.active) : false;
        try { api.editorAction('createWorld'); } catch (e) {}
        await new Promise((r) => setTimeout(r, 800));
        const reopenInputs = document.querySelectorAll('input').length;
        try { const dd = cc.find('Canvas/editorDialog'); const dim2 = dd && dd.getChildByName('dim'); if (dim2) { dim2.emit(cc.Node.EventType.TOUCH_END); } } catch (e) {}
        await new Promise((r) => setTimeout(r, 600));
        return { kids: kids, deep: deep, openInputs: openInputs, how: how, afterInputs: afterInputs, activeAfter: activeAfter, reopenInputs: reopenInputs };
    });
    log('R4_dialog', r4);

    /* ---- the fixed sequence with FULL stacks ---- */
    const before = await page.evaluate(() => ({ levelCfg: Object.keys(conf.level_cfg).filter((k) => Number(k) >= 10000), stage101: Object.keys(conf.stage_level_cfg[101] || {}), entry10101: conf.level_cfg[10101] || null }));
    log('before_wipe', before);
    const payload = await page.evaluate(() => JSON.stringify(window.MazeDashCustomTab.buildExportData()));
    await page.evaluate(() => { try { localStorage.removeItem('maze_dash_custom_levels'); localStorage.removeItem('maze_dash_custom_worlds'); } catch (e) {} });
    await page.reload({ waitUntil: 'domcontentloaded', timeout: 120000 });
    await page.waitForFunction('window.cc && cc.game && cc.game._prepared === true', { timeout: 120000, polling: 150 });
    await toHall(); await sleep(3000);
    log('after_wipe', await page.evaluate(() => ({ levelCfg: Object.keys(conf.level_cfg).filter((k) => Number(k) >= 10000), stage101: Object.keys(conf.stage_level_cfg[101] || {}), entry10101: conf.level_cfg[10101] || null })));
    stacks.length = 0;
    const imp = await page.evaluate((j) => { const api = window.MazeDashCustomTab; const res = api.importCustomJson(j); return { res: res, entry10101: conf.level_cfg[10101] || null, stage101: Object.keys(conf.stage_level_cfg[101] || {}), rows: (conf.all_Level[10101] || []).length }; }, payload);
    log('after_import', imp);
    marks.push({ what: 'import done', stacks: stacks.length });
    const ovAfterImport = await page.evaluate(() => /运行出错|Uncaught|TypeError/.test((document.body && document.body.innerText) || ''));
    log('overlay_right_after_import', ovAfterImport);
    await page.evaluate(() => { try { gamemain.enterEnterGameScene(10101); } catch (e) {} });
    for (let i = 0; i < 100; i++) { const r = await page.evaluate(() => { const m = cc.find('Canvas/backgroup/game_map'); const cp = m && m.getComponent && m.getComponent('game_map'); return !!(cp && cp.Level_data); }); if (r) { break; } await sleep(150); }
    await sleep(3500);
    const st = await page.evaluate(() => { const s = window.MazeDashCustomTab.stats; return { arg: s.getLastWordIdArg || null, shortCircuit: s.getLastWordIdShortCircuit || 0, lastEnteredLevelId: s.lastEnteredLevelId || null, lastEnteredWordId: s.lastEnteredWordId || null, keyLog: (s.levelCfgKeys || []).slice(-8), overlay: /运行出错|Uncaught|TypeError/.test((document.body && document.body.innerText) || '') }; });
    log('after_enter_stats', st);
    log('marks', marks);
    stacks.slice(0, 4).forEach((x, i) => log('stack' + (i + 1), x.s));
    await browser.close(); process.exit(0);
})().catch((e) => { console.error('HARNESS ERROR', e); process.exit(1); });
