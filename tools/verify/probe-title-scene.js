const path = require('path');
const { spawn } = require('child_process');
const puppeteer = require('puppeteer-core');
const WEB = 'E:\\maze_dash\\web';
const CHROME = 'C:\\Users\\Lenovo\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 8216;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
    const server = spawn(process.execPath, [path.join(WEB, 'serve.js'), String(PORT)], { stdio: 'ignore' });
    await sleep(900);
    const browser = await puppeteer.launch({
        executablePath: CHROME, headless: 'new',
        userDataDir: path.join(__dirname, 'chrome-profile-title'),
        args: ['--no-sandbox', '--disable-extensions', '--no-first-run', '--mute-audio',
            '--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader',
            '--autoplay-policy=no-user-gesture-required'],
        defaultViewport: { width: 1280, height: 800 },
    });
    const page = await browser.newPage();
    await page.goto(`http://127.0.0.1:${PORT}/index.html`, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction('window.cc && cc.game._prepared === true', { timeout: 60000, polling: 200 });
    await page.waitForFunction('window.cc && cc.director.getScene()', { timeout: 30000, polling: 150 });
    for (const t of [3000, 3000, 3000]) {
        await sleep(t);
        const st = await page.evaluate(() => {
            const s = cc.director.getScene();
            if (!s) { return null; }
            const dark = [];
            (function walk(n, p) {
                const sp = n.getComponent && n.getComponent(cc.Sprite);
                if (n.activeInHierarchy && sp && sp.spriteFrame && n.width > 200 && n.height > 200) {
                    const c = n.color;
                    if (c.r + c.g + c.b < 400) { dark.push({ path: p + '/' + n.name, rgba: [c.r, c.g, c.b, c.a], size: [Math.round(n.width), Math.round(n.height)], frame: sp.spriteFrame.name }); }
                }
                (n.children || []).forEach((c) => walk(c, p + '/' + n.name));
            })(s, '');
            return { scene: s.name, dark: dark.slice(0, 5), whitened: window.MazeDashWide ? window.MazeDashWide.stats.launchDarkWhitened : null,
                     cams: (cc.Camera.cameras || []).map((c) => (c.backgroundColor ? [c.backgroundColor.r, c.backgroundColor.g, c.backgroundColor.b] : null)) };
        });
        console.log('scene', st.scene, '| cams', JSON.stringify(st.cams), '| whitened', st.whitened, '| dark sprites', JSON.stringify(st.dark));
        await page.screenshot({ path: path.join(__dirname, 'shots', 'title-phase-' + Date.now() + '.png') });
    }
    await browser.close();
    server.kill();
    process.exit(0);
})().catch((e) => { console.error('HARNESS ERROR', e); process.exit(1); });
