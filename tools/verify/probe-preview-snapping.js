const path = require('path');
const { spawn } = require('child_process');
const puppeteer = require('puppeteer-core');
const WEB = 'E:\\maze_dash\\web';
const CHROME = 'C:\\Users\\Lenovo\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 8233;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
    const server = spawn(process.execPath, [path.join(WEB, 'serve.js'), String(PORT)], { stdio: 'ignore' });
    await sleep(900);
    const browser = await puppeteer.launch({
        executablePath: CHROME, headless: 'new',
        userDataDir: path.join(__dirname, 'chrome-profile-snap'),
        args: ['--no-sandbox', '--disable-extensions', '--no-first-run', '--mute-audio',
            '--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader',
            '--autoplay-policy=no-user-gesture-required'],
        defaultViewport: { width: 1440, height: 810 },
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
        if (i % 3 === 1) { await tap(720, 400, 500); } else { await sleep(400); }
    }
    await sleep(4500);
    for (const nm of ['甲世界', '乙世界', '丙世界']) {
        await page.evaluate(() => { gamemain.showTabBarViewIndex = 5; window.hallScene.showBarView(); });
        await sleep(600);
        await page.evaluate(() => { window.hallScene.viewGroup[5].getChildByName('editorBtn_createWorld').emit(cc.Node.EventType.TOUCH_END); });
        await sleep(600);
        await page.evaluate((name) => {
            const panel = cc.find('Canvas').getChildByName('editorDialog').getChildByName('panel');
            panel.getChildByName('worldNameInput').getComponent(cc.EditBox).string = name;
            panel.children.filter((n) => n.name === 'dlgBtn')[0].emit(cc.Node.EventType.TOUCH_END);
        }, nm);
        await sleep(1000);
    }
    await page.evaluate(() => { gamemain.showTabBarViewIndex = 5; window.hallScene.showBarView(); });
    await sleep(800);
    await page.evaluate(() => { window.hallScene.viewGroup[5].getChildByName('editorSmall_previewWorld').emit(cc.Node.EventType.TOUCH_END); });
    await sleep(1600);
    const read = () => page.evaluate(() => {
        const p = cc.find('Canvas').getChildByName('editorPreview');
        if (!p) { return { found: false }; }
        const pn = p.getChildByName('previewPager');
        const c = pn.getChildByName('content');
        const W = Math.round(cc.view.getVisibleSize().width);
        const offs = c.children.map((_, i) => Math.round(-(i - (c.children.length - 1) / 2) * W));
        return { found: true, hasMask: !!pn.getComponent(cc.Mask), maskType: pn.getComponent(cc.Mask) ? pn.getComponent(cc.Mask).type : null,
                 contentX: Math.round(c.x), pageOffsets: offs, aligned: offs.some((o) => Math.abs(o - c.x) <= 1),
                 page: window.MazeDashCustomTab.stats.previewPage };
    });
    console.log('initial :', JSON.stringify(await read()));
    // drag left half a page-worth and beyond: must snap to the NEXT page exactly
    await page.mouse.move(1150, 380); await page.mouse.down();
    for (let x = 1150; x >= 250; x -= 30) { await page.mouse.move(x, 380); await sleep(12); }
    await page.mouse.up();
    await sleep(1200);
    console.log('after drag:', JSON.stringify(await read()));
    // tiny drag must stay on the same page
    await page.mouse.move(700, 380); await page.mouse.down();
    for (let x = 700; x >= 660; x -= 10) { await page.mouse.move(x, 380); await sleep(12); }
    await page.mouse.up();
    await sleep(1200);
    console.log('tiny drag :', JSON.stringify(await read()));
    await page.screenshot({ path: path.join(__dirname, 'shots', 'preview-snapped.png') });
    console.log('errors:', JSON.stringify(errs.slice(0, 3)));
    await browser.close();
    server.kill();
    process.exit(0);
})().catch((e) => { console.error('HARNESS ERROR', e); process.exit(1); });
