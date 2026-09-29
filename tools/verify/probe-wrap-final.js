const puppeteer = require('puppeteer-core');
const CHROME = 'C:\\Users\\Lenovo\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe';
const FILE = 'file:///E:/maze_dash/dist/MazeDash-standalone.html';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const log = (k, v) => console.log('W ' + k + ':', typeof v === 'string' ? v : JSON.stringify(v));
(async () => {
    const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', userDataDir: 'E:\\maze_dash\\_work\\test\\chrome-profile-wrapfinal', protocolTimeout: 300000,
        args: ['--no-sandbox','--disable-extensions','--no-first-run','--mute-audio','--allow-file-access-from-files','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader'], defaultViewport: { width: 1440, height: 810 } });
    const page = await browser.newPage();
    let stacks = [];
    page.on('pageerror', (e) => stacks.push(String(e.message).slice(0, 90)));
    const scene = () => page.evaluate(() => (cc.director.getScene() ? cc.director.getScene().name : '?'));
    async function tap(x, y, s) { await page.mouse.move(x, y); await page.mouse.down(); await sleep(70); await page.mouse.up(); await sleep(s || 900); }
    async function toHall() { for (let i = 0; i < 120; i++) { if ((await scene()) === 'HallScene') { return; } if (i % 3 === 1) { await tap(720, 400, 500); } else { await sleep(400); } } }
    await page.goto(FILE, { waitUntil: 'domcontentloaded', timeout: 120000 });
    await page.waitForFunction('window.cc && cc.game && cc.game._prepared === true', { timeout: 120000, polling: 150 });
    await toHall(); await sleep(2500);
    const payload = await page.evaluate(() => JSON.stringify(window.MazeDashCustomTab.buildExportData()));
    const ov = () => page.evaluate(() => /运行出错|Uncaught|TypeError/.test((document.body && document.body.innerText) || ''));
    const runP2 = async (n) => {
        await page.evaluate(() => { try { localStorage.removeItem('maze_dash_custom_levels'); localStorage.removeItem('maze_dash_custom_worlds'); } catch (e) {} });
        stacks = [];
        await page.reload({ waitUntil: 'domcontentloaded', timeout: 120000 });
        await page.waitForFunction('window.cc && cc.game && cc.game._prepared === true', { timeout: 120000, polling: 150 });
        await toHall(); await sleep(2200);
        const afterHall = stacks.length;
        await page.evaluate((j) => window.MazeDashCustomTab.importCustomJson(j), payload);
        await page.evaluate(() => { try { gamemain.enterEnterGameScene(10101); } catch (e) {} });
        for (let i = 0; i < 100; i++) { const r = await page.evaluate(() => { const m = cc.find('Canvas/backgroup/game_map'); const cp = m && m.getComponent && m.getComponent('game_map'); return !!(cp && cp.Level_data); }); if (r) { break; } await sleep(150); }
        await sleep(2200);
        const st = await page.evaluate(() => { const s = window.MazeDashCustomTab.stats; return { calls: s.getLastWordIdCalls || 0, where: s.earlyWordIdWhere || null, fallbacks: s.getLastWordIdFallbacks || 0, args: (s.getLastWordIdArgs || []).slice(-5), seeded: s.degenerateKeysSeeded || 0, wrapped: s.earlyWordIdWrapped || 0 }; });
        const o = await ov();
        return { mode: 'P2', n: n, afterHall: afterHall, stacks: stacks.length, overlay: o, stats: st };
    };
    const runP1 = async (n) => {
        stacks = [];
        await page.evaluate((j) => window.MazeDashCustomTab.importCustomJson(j), payload);
        const o1 = await ov();
        await page.evaluate(() => { try { gamemain.enterEnterGameScene(10101); } catch (e) {} });
        for (let i = 0; i < 100; i++) { const r = await page.evaluate(() => { const m = cc.find('Canvas/backgroup/game_map'); const cp = m && m.getComponent && m.getComponent('game_map'); return !!(cp && cp.Level_data); }); if (r) { break; } await sleep(150); }
        await sleep(1800);
        return { mode: 'P1', n: n, stacks: stacks.length, overlay: o1 || (await ov()) };
    };
    const p2 = [];
    for (let i = 1; i <= 5; i++) { const r = await runP2(i); p2.push(r); log('P2_' + i, r); }
    const p1 = [];
    for (let i = 1; i <= 3; i++) { const r = await runP1(i); p1.push(r); log('P1_' + i, r); }
    const p2bad = p2.filter((r) => r.overlay || r.stacks > 0 || r.afterHall > 0).length;
    const p1bad = p1.filter((r) => r.overlay || r.stacks > 0).length;
    log('SUMMARY', { P2: p2bad + '/5 failed', P1: p1bad + '/3 failed', allClean: p2bad === 0 && p1bad === 0,
                     calls: p2[0] && p2[0].stats.calls, where: p2[0] && p2[0].stats.where, wrapped: p2[0] && p2[0].stats.wrapped,
                     args: p2[0] && p2[0].stats.args, fallbacks: p2[0] && p2[0].stats.fallbacks });
    await browser.close(); process.exit(0);
})().catch((e) => { console.error('HARNESS ERROR', e); process.exit(1); });
