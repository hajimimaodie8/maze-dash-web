const puppeteer = require('puppeteer-core');
const CHROME = 'C:\\Users\\Lenovo\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe';
const FILE = 'file:///E:/maze_dash/dist/MazeDash-standalone.html';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
    const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new',
        userDataDir: 'E:\\maze_dash\\_work\\test\\chrome-profile-vig', protocolTimeout: 180000,
        args: ['--no-sandbox','--disable-extensions','--no-first-run','--mute-audio','--allow-file-access-from-files','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader','--autoplay-policy=no-user-gesture-required'],
        defaultViewport: { width: 1440, height: 810 } });
    const page = await browser.newPage();
    const errs = []; page.on('pageerror', (e) => errs.push(String(e.message).slice(0, 80)));
    await page.goto(FILE, { waitUntil: 'domcontentloaded', timeout: 120000 });
    await page.waitForFunction('window.cc && cc.game && cc.game._prepared === true', { timeout: 120000, polling: 150 });
    const scene = () => page.evaluate(() => (cc.director.getScene() ? cc.director.getScene().name : null));
    async function tap(x, y, s) { await page.mouse.move(x, y); await page.mouse.down(); await sleep(70); await page.mouse.up(); await sleep(s || 900); }
    for (let i = 0; i < 90; i++) { if ((await scene()) === 'HallScene') break; if (i % 3 === 1) await tap(720, 400, 500); else await sleep(400); }
    await sleep(2500);
    await page.evaluate(() => gamemain.enterEnterGameScene(10101));
    for (let i = 0; i < 50; i++) { if (await page.evaluate(() => !!cc.find('Canvas/backgroup/game_map'))) break; await sleep(300); }
    await sleep(3000);
    const r = await page.evaluate(() => {
        const bg = cc.find('Canvas/backgroup');
        const v = cc.find('Canvas/backgroup/vignettes');
        const map = cc.find('Canvas/backgroup/game_map');
        const order = bg ? bg.children.map((c, i) => [i, c.name, c.zIndex]) : [];
        return { vignetteZ: v ? v.zIndex : null, mapZ: map ? map.zIndex : null, mapIndex: bg.children.findIndex((c) => c.name === 'game_map'), vignetteIndex: bg.children.findIndex((c) => c.name === 'vignettes'), order, counter: (window.MazeDashCustomTab && MazeDashCustomTab.stats) ? MazeDashCustomTab.stats.vignettesBelowMap : null };
    });
    console.log('VIGNETTE Z =', r.vignetteZ, ' MAP Z =', r.mapZ, ' mapIndex =', r.mapIndex, ' vignetteIndex =', r.vignetteIndex, ' stat =', r.counter);
    console.log('backgroup order:', JSON.stringify(r.order));
    console.log('PASS: decorations below level =', (r.vignetteZ !== null && r.vignetteZ < 0 && r.vignetteZ < r.mapZ));
    console.log('pageerrors:', JSON.stringify(errs.slice(0, 3)));
    await page.screenshot({ path: 'E:\\maze_dash\\docs\\screenshots\\95-vignettes-below-level.png' });
    await browser.close(); process.exit(0);
})().catch((e) => { console.error('HARNESS ERROR', e); process.exit(1); });
