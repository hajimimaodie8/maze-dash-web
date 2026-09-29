const path = require('path');
const { spawn } = require('child_process');
const puppeteer = require('puppeteer-core');
const WEB = 'E:\\maze_dash\\web';
const CHROME = 'C:\\Users\\Lenovo\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 8246;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
    const server = spawn(process.execPath, [path.join(WEB, 'serve.js'), String(PORT)], { stdio: 'ignore' });
    await sleep(900);
    const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new',
        userDataDir: path.join(__dirname, 'chrome-profile-splash'),
        args: ['--no-sandbox','--disable-extensions','--no-first-run','--mute-audio','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader','--autoplay-policy=no-user-gesture-required'],
        defaultViewport: { width: 1440, height: 810 } });
    const page = await browser.newPage();
    const errs = [];
    page.on('pageerror', (e) => errs.push(String(e.message).slice(0, 90)));
    await page.goto(`http://127.0.0.1:${PORT}/index.html`, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction('window.cc && cc.game._prepared === true && !!window.gamemain', { timeout: 60000, polling: 200 });
    // capture the title/splash scene before it leaves
    const scene = () => page.evaluate(() => (cc.director.getScene() ? cc.director.getScene().name : null));
    for (let i = 0; i < 40; i++) { const s = await scene(); if (s === 'AnimScene' || s === 'LaunchScene') { break; } await sleep(250); }
    const s0 = await scene();
    console.log('early scene:', s0);
    await page.screenshot({ path: path.join(__dirname, 'shots', 'title-early.png') });
    const logo = await page.evaluate(() => window.MazeDashWide ? { hidden: window.MazeDashWide.stats.titleLogoHidden || 0, name: window.MazeDashWide.stats.titleLogoName || null } : null);
    console.log('logo hidden:', JSON.stringify(logo));
    async function tap(x, y, s) { await page.mouse.move(x, y); await page.mouse.down(); await sleep(80); await page.mouse.up(); await sleep(s || 900); }
    for (let i = 0; i < 60; i++) { if ((await scene()) === 'HallScene') { break; } if (i % 3 === 1) { await tap(720, 400, 500); } else { await sleep(400); } }
    await sleep(4000);
    // open / close the preview twice and count leftovers
    const sweep = await page.evaluate(async () => {
        const sleep2 = (ms) => new Promise((r) => setTimeout(r, ms));
        const btn = () => window.hallScene.viewGroup[5].getChildByName('editorSmall_previewWorld');
        gamemain.showTabBarViewIndex = 5; window.hallScene.showBarView();
        await sleep2(900);
        const out = [];
        for (let i = 0; i < 2; i++) {
            btn().emit(cc.Node.EventType.TOUCH_END);
            await sleep2(1200);
            const openCount = cc.find('Canvas').children.filter((n) => String(n.name).indexOf('editorPreview') === 0).length;
            const close = cc.find('Canvas').getChildByName('editorPreview').getChildByName('previewClose');
            close.emit(cc.Node.EventType.TOUCH_END);
            await sleep2(1200);
            const afterCount = cc.find('Canvas').children.filter((n) => String(n.name).indexOf('editorPreview') === 0).length;
            out.push({ round: i + 1, openCount, afterCount });
        }
        return out;
    });
    console.log('preview open/close rounds:', JSON.stringify(sweep));
    console.log('errors:', JSON.stringify(errs.slice(0, 3)));
    await browser.close(); server.kill(); process.exit(0);
})().catch((e) => { console.error('HARNESS ERROR', e); process.exit(1); });
