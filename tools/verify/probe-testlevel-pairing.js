const puppeteer = require('puppeteer-core');
const CHROME = 'C:\\Users\\Lenovo\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe';
const FILE = 'file:///E:/maze_dash/dist/MazeDash-standalone.html';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
    const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new',
        userDataDir: 'E:\\maze_dash\\_work\\test\\chrome-profile-p2', protocolTimeout: 300000,
        args: ['--no-sandbox','--disable-extensions','--no-first-run','--mute-audio','--allow-file-access-from-files','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader'],
        defaultViewport: { width: 1440, height: 810 } });
    const page = await browser.newPage();
    const errs = []; page.on('pageerror', (e) => errs.push(String(e.message).slice(0, 110)));
    await page.goto(FILE, { waitUntil: 'domcontentloaded', timeout: 120000 });
    await page.waitForFunction('window.cc && cc.game && cc.game._prepared === true', { timeout: 120000, polling: 150 });
    const scene = () => page.evaluate(() => (cc.director.getScene() ? cc.director.getScene().name : '?'));
    async function tap(x, y, s) { await page.mouse.move(x, y); await page.mouse.down(); await sleep(70); await page.mouse.up(); await sleep(s || 900); }
    for (let i = 0; i < 90; i++) { if ((await scene()) === 'HallScene') { break; } if (i % 3 === 1) { await tap(720, 400, 500); } else { await sleep(400); } }
    await sleep(3500);
    // enter the TEST level 10101 directly on a fresh page (no editor, no other level first)
    await page.evaluate(() => { try { gamemain.enterEnterGameScene(10101); } catch (e) {} });
    let ok = false, waited = 0;
    for (let i = 0; i < 100; i++) {
        const r = await page.evaluate(() => {
            const m = cc.find('Canvas/backgroup/game_map');
            const cp = m && m.getComponent && m.getComponent('game_map');
            return !!(cp && cp.Level_data);
        });
        if (r) { ok = true; waited = i * 150; break; }
        await sleep(150);
    }
    const out = await page.evaluate(() => {
        const s = window.MazeDashCustomTab.stats;
        const m = cc.find('Canvas/backgroup/game_map');
        const cp = m && m.getComponent('game_map');
        const res = { gameMapExists: !!m, comp: !!cp, restored: s.colourTableRestored || 0, rows: 0, heads: 0, portals: [], pairing: [] };
        if (cp && cp.Level_data) {
            const rows = Object.keys(cp.Level_data);
            res.rows = rows.length;
            const ps = [];
            rows.forEach((y) => Object.keys(cp.Level_data[y]).forEach((x) => { const v = cp.Level_data[y][x]; if (v === -1) { res.heads++; } if (v === 2) { ps.push([parseInt(x, 10), parseInt(y, 10)]); } }));
            res.portals = ps.map((p) => p.join(','));
            res.pairing = ps.map((p) => { const d = cp.getOutPortal(cc.v2(p[0], p[1])); return p.join(',') + ' -> ' + d.x + ',' + d.y; });
        }
        return res;
    });
    console.log('P2 RESULT:', JSON.stringify({ ok: ok, enteredAfterMs: waited, result: out }));
    console.log('PAGE ERRORS:', JSON.stringify(errs.slice(0, 2)));
    if (ok) { await page.screenshot({ path: 'E:\\maze_dash\\docs\\screenshots\\61-testlevel-6portals.png' }); }
    await browser.close(); process.exit(0);
})().catch((e) => { console.error('HARNESS ERROR', e); process.exit(1); });
