const path = require('path');
const { spawn } = require('child_process');
const puppeteer = require('puppeteer-core');
const WEB = 'E:\\maze_dash\\web';
const CHROME = 'C:\\Users\\Lenovo\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 8205;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
    const server = spawn(process.execPath, [path.join(WEB, 'serve.js'), String(PORT)], { stdio: 'ignore' });
    await sleep(900);
    const browser = await puppeteer.launch({
        executablePath: CHROME, headless: 'new',
        userDataDir: path.join(__dirname, 'chrome-profile-faces3'),
        args: ['--no-sandbox', '--disable-extensions', '--no-first-run', '--mute-audio',
            '--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader',
            '--autoplay-policy=no-user-gesture-required'],
        defaultViewport: { width: 1280, height: 800 },
    });
    const page = await browser.newPage();
    await page.goto(`http://127.0.0.1:${PORT}/index.html`, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction('window.cc && cc.game._prepared === true && !!window.gamemain', { timeout: 60000, polling: 200 });
    const scene = () => page.evaluate(() => (cc.director.getScene() ? cc.director.getScene().name : null));
    async function tap(x, y, s) { await page.mouse.move(x, y); await page.mouse.down(); await sleep(70); await page.mouse.up(); await sleep(s || 900); }
    for (let i = 0; i < 60; i++) {
        if ((await scene()) === 'HallScene') { break; }
        if (i % 3 === 1) { await tap(640, 400, 500); } else { await sleep(400); }
    }
    await sleep(4500);
    await page.evaluate(() => { gamemain.showTabBarViewIndex = 1; window.hallScene.showBarView(); });
    await sleep(2500);
    const dump = await page.evaluate(() => {
        const page1 = window.hallScene.viewGroup[1];
        const out = [];
        (function walk(n, p) {
            const sp = n.getComponent && n.getComponent(cc.Sprite);
            if (n.activeInHierarchy && sp && sp.spriteFrame) {
                const wp = n.convertToWorldSpaceAR(cc.v2(0, 0));
                out.push({
                    path: p + '/' + n.name, world: [Math.round(wp.x), Math.round(wp.y)],
                    size: [Math.round(n.width), Math.round(n.height)],
                    colour: [n.color.r, n.color.g, n.color.b, n.color.a], op: n.opacity,
                    frame: sp.spriteFrame.name,
                });
            }
            (n.children || []).forEach((c) => walk(c, p + '/' + n.name));
        })(page1, 'faceView');
        let cam = null;
        try { const c = cc.Camera.main || cc.Camera.cameras[0]; cam = [c.backgroundColor.r, c.backgroundColor.g, c.backgroundColor.b]; } catch (e) {}
        return { cam, sprites: out };
    });
    console.log('camera bg:', JSON.stringify(dump.cam));
    console.log('faceView sprites (' + dump.sprites.length + '):');
    dump.sprites.forEach((s) => console.log('  x=' + String(s.world[0]).padStart(5) + ' size=' + JSON.stringify(s.size) + ' rgba=' + JSON.stringify(s.colour) + ' op=' + s.op + ' ' + s.path));
    await page.screenshot({ path: path.join(__dirname, 'shots', 'faces-sides.png') });
    await browser.close();
    server.kill();
    process.exit(0);
})().catch((e) => { console.error('HARNESS ERROR', e); process.exit(1); });
