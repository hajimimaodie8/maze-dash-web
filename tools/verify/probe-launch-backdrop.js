const path = require('path');
const { spawn } = require('child_process');
const puppeteer = require('puppeteer-core');
const WEB = 'E:\\maze_dash\\web';
const CHROME = 'C:\\Users\\Lenovo\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 8217;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
    const server = spawn(process.execPath, [path.join(WEB, 'serve.js'), String(PORT)], { stdio: 'ignore' });
    await sleep(900);
    const browser = await puppeteer.launch({
        executablePath: CHROME, headless: 'new',
        userDataDir: path.join(__dirname, 'chrome-profile-magenta'),
        args: ['--no-sandbox', '--disable-extensions', '--no-first-run', '--mute-audio',
            '--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader',
            '--autoplay-policy=no-user-gesture-required'],
        defaultViewport: { width: 1280, height: 800 },
    });
    const page = await browser.newPage();
    await page.goto(`http://127.0.0.1:${PORT}/index.html`, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction('window.cc && cc.game._prepared === true', { timeout: 60000, polling: 200 });
    await page.waitForFunction('window.cc && cc.director.getScene()', { timeout: 30000, polling: 150 });
    for (let i = 0; i < 4; i++) {
        await sleep(2500);
        const st = await page.evaluate(() => {
            const s = cc.director.getScene(); if (!s) { return null; }
            const big = [];
            (function walk(n, p) {
                const sp = n.getComponent && n.getComponent(cc.Sprite);
                if (n.activeInHierarchy && sp && sp.spriteFrame && n.width > 600 && n.height > 600) {
                    big.push({ path: p + '/' + n.name, rgba: [n.color.r, n.color.g, n.color.b, n.color.a], size: [Math.round(n.width), Math.round(n.height)] });
                }
                (n.children || []).forEach((c) => walk(c, p + '/' + n.name));
            })(s, '');
            return { scene: s.name, cams: (cc.Camera.cameras || []).map((c) => (c.backgroundColor ? [c.backgroundColor.r, c.backgroundColor.g, c.backgroundColor.b] : null)), big: big.slice(0, 4),
                     st: window.MazeDashWide ? window.MazeDashWide.stats : null };
        });
        if (st) { console.log(st.scene, '| cams', JSON.stringify(st.cams), '| big', JSON.stringify(st.big), '| whitened', st.st && st.st.launchBackdropWhitened); }
        if (st && st.scene === 'AnimScene') { await page.screenshot({ path: path.join(__dirname, 'shots', 'magenta-fixed.png') }); }
    }
    await page.waitForFunction('window.hallScene && window.hallScene.node && window.hallScene.node.isValid', { timeout: 30000, polling: 200 }).catch(() => {});
    await sleep(1500);
    const maps = await page.evaluate(() => {
        const h = window.hallScene; if (!h) { return null; }
        return { left: (h.leftViewMap || []).map((v) => !!v), right: (h.rightViewMap || []).map((v) => !!v) };
    });
    console.log('view maps:', JSON.stringify(maps));
    await browser.close();
    server.kill();
    process.exit(0);
})().catch((e) => { console.error('HARNESS ERROR', e); process.exit(1); });
