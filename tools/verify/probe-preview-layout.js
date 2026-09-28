const path = require('path');
const { spawn } = require('child_process');
const puppeteer = require('puppeteer-core');
const WEB = 'E:\\maze_dash\\web';
const CHROME = 'C:\\Users\\Lenovo\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 8232;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
    const server = spawn(process.execPath, [path.join(WEB, 'serve.js'), String(PORT)], { stdio: 'ignore' });
    await sleep(900);
    const browser = await puppeteer.launch({
        executablePath: CHROME, headless: 'new',
        userDataDir: path.join(__dirname, 'chrome-profile-titlefix'),
        args: ['--no-sandbox', '--disable-extensions', '--no-first-run', '--mute-audio',
            '--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader',
            '--autoplay-policy=no-user-gesture-required'],
        defaultViewport: { width: 1600, height: 900 },
    });
    const page = await browser.newPage();
    const errs = [];
    page.on('pageerror', (e) => errs.push(String(e.message).slice(0, 70)));
    await page.goto(`http://127.0.0.1:${PORT}/index.html`, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction('window.cc && cc.game._prepared === true && !!window.gamemain', { timeout: 60000, polling: 200 });
    const scene = () => page.evaluate(() => (cc.director.getScene() ? cc.director.getScene().name : null));
    async function tap(x, y, s) { await page.mouse.move(x, y); await page.mouse.down(); await sleep(70); await page.mouse.up(); await sleep(s || 900); }
    for (let i = 0; i < 60; i++) {
        if ((await scene()) === 'HallScene') { break; }
        if (i % 3 === 1) { await tap(800, 450, 500); } else { await sleep(400); }
    }
    await sleep(4500);
    for (const nm of ['甲世界', '乙世界']) {
        await page.evaluate(() => { gamemain.showTabBarViewIndex = 5; window.hallScene.showBarView(); });
        await sleep(700);
        await page.evaluate(() => { window.hallScene.viewGroup[5].getChildByName('editorBtn_createWorld').emit(cc.Node.EventType.TOUCH_END); });
        await sleep(700);
        await page.evaluate((name) => {
            const panel = cc.find('Canvas').getChildByName('editorDialog').getChildByName('panel');
            panel.getChildByName('worldNameInput').getComponent(cc.EditBox).string = name;
            panel.children.filter((n) => n.name === 'dlgBtn')[0].emit(cc.Node.EventType.TOUCH_END);
        }, nm);
        await sleep(1100);
    }
    await page.evaluate(() => { gamemain.showTabBarViewIndex = 5; window.hallScene.showBarView(); });
    await sleep(900);
    await page.evaluate(() => { window.hallScene.viewGroup[5].getChildByName('editorSmall_previewWorld').emit(cc.Node.EventType.TOUCH_END); });
    await sleep(1800);
    const read = () => page.evaluate(() => {
        const p = cc.find('Canvas').getChildByName('editorPreview');
        if (!p) { return { found: false }; }
        const pn = p.getChildByName('previewPager');
        const pv = pn.getComponent(cc.PageView);
        const content = pn.getChildByName('content');
        const W = Math.round(cc.view.getVisibleSize().width), H = Math.round(cc.view.getVisibleSize().height);
        return { found: true, visible: [W, H], pageW: Math.round(content.children[0].width), pageCount: content.children.length,
                 contentW: Math.round(content.width),
                 titles: content.children.map((pg) => { const t = pg.getChildByName('previewPageTitle'); return t ? { text: t.getComponent(cc.Label).string, y: Math.round(t.y), fontSize: t.getComponent(cc.Label).fontSize } : null; }),
                 builtW: window.MazeDashCustomTab.stats.previewBuiltW, rebuilds: window.MazeDashCustomTab.stats.previewRebuilt || 0 };
    });
    const a = await read();
    console.log('BEFORE resize:', JSON.stringify(a));
    // resize the window, exactly what broke it
    await page.setViewport({ width: 1100, height: 700 });
    await sleep(4000);
    const b = await read();
    console.log('AFTER resize :', JSON.stringify(b));
    await page.screenshot({ path: path.join(__dirname, 'shots', 'preview-resized.png') });
    console.log('errors:', JSON.stringify(errs.slice(0, 3)));
    await browser.close();
    server.kill();
    process.exit(0);
})().catch((e) => { console.error('HARNESS ERROR', e); process.exit(1); });
