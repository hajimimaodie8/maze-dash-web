const puppeteer = require('puppeteer-core');
const CHROME = 'C:\\Users\\Lenovo\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe';
const FILE = 'file:///E:/maze_dash/dist/MazeDash-standalone.html';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
    const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new',
        userDataDir: 'E:\\maze_dash\\_work\\test\\chrome-profile-bound', protocolTimeout: 240000,
        args: ['--no-sandbox','--disable-extensions','--no-first-run','--mute-audio','--allow-file-access-from-files','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader'],
        defaultViewport: { width: 1440, height: 810 } });
    const page = await browser.newPage();
    const errs = []; page.on('pageerror', (e) => errs.push(String(e.message).slice(0, 100)));
    await page.goto(FILE, { waitUntil: 'domcontentloaded', timeout: 120000 });
    await page.waitForFunction('window.cc && cc.game && cc.game._prepared === true', { timeout: 120000, polling: 150 });
    const scene = () => page.evaluate(() => (cc.director.getScene() ? cc.director.getScene().name : '?'));
    async function tap(x, y, s) { await page.mouse.move(x, y); await page.mouse.down(); await sleep(70); await page.mouse.up(); await sleep(s || 900); }
    for (let i = 0; i < 90; i++) { if ((await scene()) === 'HallScene') { break; } if (i % 3 === 1) { await tap(720, 400, 500); } else { await sleep(400); } }
    await sleep(3500);
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
    const a = await page.evaluate(() => {
        const m = cc.find('Canvas/backgroup/game_map');
        const cp = m && m.getComponent && m.getComponent('game_map');
        const out = { hasNode: !!m, hasComp: !!cp, hasData: !!(cp && cp.Level_data), scene: cc.director.getScene().name, rows: 0, heads: 0, portals: 0, restored: (window.MazeDashCustomTab.stats.colourTableRestored || 0) };
        if (cp && cp.Level_data) {
            const rows = Object.keys(cp.Level_data); out.rows = rows.length;
            rows.forEach((y) => Object.keys(cp.Level_data[y]).forEach((x) => { const v = cp.Level_data[y][x]; if (v === -1) { out.heads++; } if (v === 2) { out.portals++; } }));
        }
        out.overlayError = /运行出错|Uncaught|TypeError/.test((document.body && document.body.innerText) || '');
        return out;
    });
    const allPass = a.hasNode && a.hasComp && a.hasData && a.scene === 'gameScene' && !a.overlayError;
    const text = 'CASE D ok:' + allPass + ' scene:' + a.scene + ' rows:' + a.rows + ' heads:' + a.heads + ' portals:' + a.portals + ' restored:' + a.restored + ' errs:' + errs.length + ' waited:' + waited + 'ms';
    await page.evaluate((t) => {
        const d = document.createElement('div');
        d.id = 'probeAssertLine';
        d.textContent = t;
        d.style.cssText = 'position:fixed;left:0;top:0;width:100%;padding:10px 14px;background:#101018;color:#7CFFB2;font:20px/1.4 monospace;z-index:2147483647';
        document.body.appendChild(d);
    }, text);
    await sleep(400);
    if (allPass) { await page.screenshot({ path: 'E:\\maze_dash\\docs\\screenshots\\59-entered-after-reload.png' }); }
    console.log('ASSERT:', text);
    console.log('SCREENSHOT TAKEN:', allPass);
    console.log('ERRS:', JSON.stringify(errs.slice(0, 3)));
    await browser.close(); process.exit(allPass ? 0 : 2);
})().catch((e) => { console.error('HARNESS ERROR', e); process.exit(1); });
