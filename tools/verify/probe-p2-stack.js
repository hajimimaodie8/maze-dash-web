const puppeteer = require('puppeteer-core');
const CHROME = 'C:\\Users\\Lenovo\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe';
const FILE = 'file:///E:/maze_dash/dist/MazeDash-standalone.html';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const log = (k, v) => console.log('K ' + k + ':', typeof v === 'string' ? v : JSON.stringify(v));
(async () => {
    const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', userDataDir: 'E:\\maze_dash\\_work\\test\\chrome-profile-p2stack', protocolTimeout: 300000,
        args: ['--no-sandbox','--disable-extensions','--no-first-run','--mute-audio','--allow-file-access-from-files','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader'], defaultViewport: { width: 1440, height: 810 } });
    const page = await browser.newPage();
    let stacks = [];                       // NEVER cleared during a run
    page.on('pageerror', (e) => stacks.push({ t: Date.now(), stack: String(e.stack || e.message).replace(/\s+/g, ' ').slice(0, 400), msg: String(e.message).slice(0, 120) }));
    const scene = () => page.evaluate(() => (cc.director.getScene() ? cc.director.getScene().name : '?'));
    async function tap(x, y, s) { await page.mouse.move(x, y); await page.mouse.down(); await sleep(70); await page.mouse.up(); await sleep(s || 900); }
    async function toHall() { for (let i = 0; i < 120; i++) { if ((await scene()) === 'HallScene') { return; } if (i % 3 === 1) { await tap(720, 400, 500); } else { await sleep(400); } } }
    await page.goto(FILE, { waitUntil: 'domcontentloaded', timeout: 120000 });
    await page.waitForFunction('window.cc && cc.game && cc.game._prepared === true', { timeout: 120000, polling: 150 });
    await toHall(); await sleep(2500);
    const payload = await page.evaluate(() => JSON.stringify(window.MazeDashCustomTab.buildExportData()));

    for (let run = 1; run <= 3; run++) {
        await page.evaluate(() => { try { localStorage.removeItem('maze_dash_custom_levels'); localStorage.removeItem('maze_dash_custom_worlds'); } catch (e) {} });
        stacks = [];                       // reset BEFORE the reload, so boot-time errors are kept
        await page.reload({ waitUntil: 'domcontentloaded', timeout: 120000 });
        await page.waitForFunction('window.cc && cc.game && cc.game._prepared === true', { timeout: 120000, polling: 150 });
        const duringBoot = stacks.length;
        await toHall(); await sleep(2500);
        const afterHall = stacks.length;
        const imp = await page.evaluate((j) => { const api = window.MazeDashCustomTab; const r = api.importCustomJson(j); return { ok: r.ok, levels: r.levels }; }, payload);
        const afterImport = stacks.length;
        const ovTxt = await page.evaluate(() => { const t = (document.body && document.body.innerText) || ''; const m = t.match(/.{0,60}(运行出错|Uncaught|TypeError).{0,100}/); return m ? m[0].replace(/\s+/g, ' ') : null; });
        await page.evaluate(() => { try { gamemain.enterEnterGameScene(10101); } catch (e) {} });
        for (let i = 0; i < 100; i++) { const r = await page.evaluate(() => { const m = cc.find('Canvas/backgroup/game_map'); const cp = m && m.getComponent && m.getComponent('game_map'); return !!(cp && cp.Level_data); }); if (r) { break; } await sleep(150); }
        await sleep(2000);
        const st = await page.evaluate(() => { const s = window.MazeDashCustomTab.stats; return { lsReads: (s.lsReads || []).slice(-10), arg: s.getLastWordIdArg || null, short: s.getLastWordIdShortCircuit || 0, seenEarly: s.enterLevelsIdSeenEarly || null, knownEarly: s.enterLevelsIdKnownEarly, clearedEarly: s.enterLevelsIdClearedEarly || 0, seeded: s.degenerateKeysSeeded || 0, hasOne: s.levelCfgHasOneEarly, keysEarly: s.levelCfgKeyCountEarly, sample: s.levelCfgOneSample }; });
        log('run' + run, { boot: duringBoot, afterHall: afterHall, afterImport: afterImport, total: stacks.length, overlayText: ovTxt, stats: st });
        if (stacks[0]) { log('run' + run + '_stack0', stacks[0].stack); }
        if (stacks[1]) { log('run' + run + '_stack1', stacks[1].stack); }
    }
    await browser.close(); process.exit(0);
})().catch((e) => { console.error('HARNESS ERROR', e); process.exit(1); });
