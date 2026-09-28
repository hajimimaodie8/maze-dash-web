const path = require('path');
const { spawn } = require('child_process');
const puppeteer = require('puppeteer-core');
const WEB = 'E:\\maze_dash\\web';
const CHROME = 'C:\\Users\\Lenovo\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 8239;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
    const server = spawn(process.execPath, [path.join(WEB, 'serve.js'), String(PORT)], { stdio: 'ignore' });
    await sleep(900);
    const browser = await puppeteer.launch({
        executablePath: CHROME, headless: 'new',
        userDataDir: path.join(__dirname, 'chrome-profile-shot'),
        args: ['--no-sandbox', '--disable-extensions', '--no-first-run', '--mute-audio',
            '--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader',
            '--autoplay-policy=no-user-gesture-required'],
        defaultViewport: { width: 1440, height: 810 },
    });
    const page = await browser.newPage();
    const errs = [];
    page.on('pageerror', (e) => errs.push(String(e.message).slice(0, 80)));
    await page.goto(`http://127.0.0.1:${PORT}/index.html`, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction('window.cc && cc.game._prepared === true && !!window.gamemain', { timeout: 60000, polling: 200 });
    const scene = () => page.evaluate(() => (cc.director.getScene() ? cc.director.getScene().name : null));
    async function tap(x, y, s) { await page.mouse.move(x, y); await page.mouse.down(); await sleep(80); await page.mouse.up(); await sleep(s || 900); }
    for (let i = 0; i < 60; i++) {
        if ((await scene()) === 'HallScene') { break; }
        if (i % 3 === 1) { await tap(720, 400, 500); } else { await sleep(400); }
    }
    await sleep(4500);
    await page.evaluate(() => { gamemain.showTabBarViewIndex = 5; window.hallScene.showBarView(); });
    await sleep(1000);
    await page.evaluate(() => { window.hallScene.viewGroup[5].getChildByName('editorBtn_createWorld').emit(cc.Node.EventType.TOUCH_END); });
    await sleep(2000);
    const st = await page.evaluate(() => {
        const panel = cc.find('Canvas').getChildByName('editorDialog').getChildByName('panel');
        const sw = panel.children.filter((n) => /^swatch_/.test(n.name));
        return { count: sw.length,
                 withSprite: sw.filter((s) => !!s.getComponent(cc.Sprite)).length,
                 frames: sw.slice(0, 3).map((s) => { const c = s.getComponent(cc.Sprite); return c && c.spriteFrame ? c.spriteFrame.name : null; }),
                 sizes: sw.slice(0, 3).map((s) => [Math.round(s.width), Math.round(s.height)]),
                 colours: sw.slice(0, 3).map((s) => [s.color.r, s.color.g, s.color.b]) };
    });
    console.log('SWATCHES:', JSON.stringify(st));
    console.log('errors:', JSON.stringify(errs.slice(0, 3)));
    await page.screenshot({ path: path.join(__dirname, 'shots', 'palette.png') });
    await browser.close();
    server.kill();
    process.exit(0);
})().catch((e) => { console.error('HARNESS ERROR', e); process.exit(1); });
