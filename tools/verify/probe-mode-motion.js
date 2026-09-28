const path = require('path');
const { spawn } = require('child_process');
const puppeteer = require('puppeteer-core');
const WEB = 'E:\\maze_dash\\web';
const CHROME = 'C:\\Users\\Lenovo\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 8224;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
    const server = spawn(process.execPath, [path.join(WEB, 'serve.js'), String(PORT)], { stdio: 'ignore' });
    await sleep(900);
    const browser = await puppeteer.launch({
        executablePath: CHROME, headless: 'new',
        userDataDir: path.join(__dirname, 'chrome-profile-motion'),
        args: ['--no-sandbox', '--disable-extensions', '--no-first-run', '--mute-audio',
            '--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader',
            '--autoplay-policy=no-user-gesture-required'],
        defaultViewport: { width: 1280, height: 800 },
    });
    const page = await browser.newPage();
    const errs = [];
    page.on('pageerror', (e) => errs.push(String(e.message).slice(0, 60)));
    await page.goto(`http://127.0.0.1:${PORT}/index.html`, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction('window.cc && cc.game._prepared === true && !!window.gamemain', { timeout: 60000, polling: 200 });
    const scene = () => page.evaluate(() => (cc.director.getScene() ? cc.director.getScene().name : null));
    async function tap(x, y, s) { await page.mouse.move(x, y); await page.mouse.down(); await sleep(70); await page.mouse.up(); await sleep(s || 900); }
    for (let i = 0; i < 60; i++) {
        if ((await scene()) === 'HallScene') { break; }
        if (i % 3 === 1) { await tap(640, 400, 500); } else { await sleep(400); }
    }
    await sleep(5000);
    const read = () => page.evaluate(() => {
        const root = window.hallScene.viewGroup[2].getChildByName('modeSwitch');
        const row = root && root.getChildByName('modeRow_unlocked');
        const active = root && root.getChildByName('modeRow_' + (localStorage.getItem('maze_dash_mode') === 'unlocked' ? 'unlocked' : 'progression'));
        return {
            unlockedRgba: row ? [row.color.r, row.color.g, row.color.b] : null,
            activeRgba: active ? [active.color.r, active.color.g, active.color.b] : null,
            lastWorld: window.MazeDashCustomTab.stats.lastWorldId,
            retints: window.MazeDashCustomTab.stats.worldRetints || 0,
            opacity: row ? row.opacity : null,
        };
    });
    console.log('world 1 :', JSON.stringify(await read()));
    // swipe to the next world
    await page.mouse.move(1000, 400);
    await page.mouse.down();
    for (let x = 1000; x >= 300; x -= 40) { await page.mouse.move(x, 400); await sleep(16); }
    await page.mouse.up();
    await sleep(2500);
    console.log('after swipe:', JSON.stringify(await read()));
    await sleep(1500);
    console.log('settled    :', JSON.stringify(await read()));
    console.log('errors:', JSON.stringify(errs.slice(0, 3)));
    await browser.close();
    server.kill();
    process.exit(0);
})().catch((e) => { console.error('HARNESS ERROR', e); process.exit(1); });
