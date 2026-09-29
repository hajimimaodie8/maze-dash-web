const path = require('path');
const { spawn } = require('child_process');
const puppeteer = require('puppeteer-core');
const WEB = 'E:\\maze_dash\\web';
const CHROME = 'C:\\Users\\Lenovo\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 8240;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
    const server = spawn(process.execPath, [path.join(WEB, 'serve.js'), String(PORT)], { stdio: 'ignore' });
    await sleep(900);
    const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new',
        userDataDir: path.join(__dirname, 'chrome-profile-check'),
        args: ['--no-sandbox','--disable-extensions','--no-first-run','--mute-audio','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader','--autoplay-policy=no-user-gesture-required'],
        defaultViewport: { width: 1440, height: 810 } });
    const page = await browser.newPage();
    const errs = [];
    page.on('pageerror', (e) => errs.push(String(e.message).slice(0, 120)));
    page.on('console', (m) => { const s = m.text(); if (/custom-tab/.test(s)) { console.log('LOG', s.slice(0, 110)); } });
    await page.goto(`http://127.0.0.1:${PORT}/index.html`, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction('window.cc && cc.game._prepared === true && !!window.gamemain', { timeout: 60000, polling: 200 });
    const scene = () => page.evaluate(() => (cc.director.getScene() ? cc.director.getScene().name : null));
    async function tap(x, y, s) { await page.mouse.move(x, y); await page.mouse.down(); await sleep(80); await page.mouse.up(); await sleep(s || 900); }
    for (let i = 0; i < 60; i++) { if ((await scene()) === 'HallScene') { break; } if (i % 3 === 1) { await tap(720, 400, 500); } else { await sleep(400); } }
    await sleep(4500);
    await page.evaluate(() => { gamemain.showTabBarViewIndex = 5; window.hallScene.showBarView(); });
    await sleep(1000);
    const opened = await page.evaluate(() => {
        try {
            window.hallScene.viewGroup[5].getChildByName('editorBtn_createWorld').emit(cc.Node.EventType.TOUCH_END);
            return 'emitted';
        } catch (e) { return 'ERR ' + e.message; }
    });
    await sleep(1800);
    const st = await page.evaluate(() => {
        const d = cc.find('Canvas').getChildByName('editorDialog');
        if (!d) { return { dialog: false }; }
        const panel = d.getChildByName('panel');
        const g = panel.getComponent(cc.Graphics);
        const sw = panel.children.filter((n) => /^swatch_/.test(n.name));
        return { dialog: true, hasGraphics: !!g, swatches: sw.length,
                 hint: !!(panel.getChildByName('dlgHexHint')), hex: (function () { const h = panel.getChildByName('hexInput'); return h ? { hasInput: !!h.__input, sprite: !!h.getComponent(cc.Sprite) } : null; })() };
    });
    console.log('emit:', opened);
    console.log('STATE:', JSON.stringify(st));
    console.log('PAGEERRORS:', JSON.stringify(errs.slice(0, 4)));
    await page.screenshot({ path: path.join(__dirname, 'shots', 'round-check.png') });
    await browser.close(); server.kill(); process.exit(0);
})().catch((e) => { console.error('HARNESS ERROR', e); process.exit(1); });
