const path = require('path');
const { spawn } = require('child_process');
const puppeteer = require('puppeteer-core');
const WEB = 'E:\\maze_dash\\web';
const CHROME = 'C:\\Users\\Lenovo\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 8215;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
    const server = spawn(process.execPath, [path.join(WEB, 'serve.js'), String(PORT)], { stdio: 'ignore' });
    await sleep(900);
    const browser = await puppeteer.launch({
        executablePath: CHROME, headless: 'new',
        userDataDir: path.join(__dirname, 'chrome-profile-launch2'),
        args: ['--no-sandbox', '--disable-extensions', '--no-first-run', '--mute-audio',
            '--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader',
            '--autoplay-policy=no-user-gesture-required'],
        defaultViewport: { width: 1280, height: 800 },
    });
    const page = await browser.newPage();
    const errs = [];
    page.on('pageerror', (e) => errs.push(String(e.message).slice(0, 50)));
    await page.goto(`http://127.0.0.1:${PORT}/index.html`, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction('window.cc && cc.game._prepared === true', { timeout: 60000, polling: 200 });
    await page.waitForFunction('window.cc && cc.director.getScene()', { timeout: 30000, polling: 150 });
    await sleep(2200);
    const st = await page.evaluate(() => {
        const s = cc.director.getScene();
        const cams = (cc.Camera.cameras || []).map((c) => (c.backgroundColor ? [c.backgroundColor.r, c.backgroundColor.g, c.backgroundColor.b] : null));
        const big = [];
        (function walk(n, p) {
            const sp = n.getComponent && n.getComponent(cc.Sprite);
            if (sp && sp.spriteFrame && (n.width >= 700 || n.height >= 700)) {
                big.push({ path: p + '/' + n.name, active: n.activeInHierarchy, size: [Math.round(n.width), Math.round(n.height)],
                    rgba: [n.color.r, n.color.g, n.color.b, n.color.a], frame: sp.spriteFrame.name });
            }
            (n.children || []).forEach((c) => walk(c, p + '/' + n.name));
        })(s, '');
        return { scene: s ? s.name : null, cams, big, stats: window.MazeDashWide ? window.MazeDashWide.stats : null };
    });
    console.log('scene', st.scene, '| cameras', JSON.stringify(st.cams));
    console.log('big sprites:'); st.big.forEach((b) => console.log('   ', JSON.stringify(b)));
    console.log('launchDarkHidden:', st.stats && st.stats.launchDarkHidden, 'logoHidden:', st.stats && st.stats.launchLogoHidden);
    await page.screenshot({ path: path.join(__dirname, 'shots', 'launch-fixed.png') });
    console.log('errors:', JSON.stringify(errs.slice(0, 3)));
    await browser.close();
    server.kill();
    process.exit(0);
})().catch((e) => { console.error('HARNESS ERROR', e); process.exit(1); });
