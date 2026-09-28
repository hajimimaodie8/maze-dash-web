const path = require('path');
const { spawn } = require('child_process');
const puppeteer = require('puppeteer-core');
const WEB = 'E:\\maze_dash\\web';
const CHROME = 'C:\\Users\\Lenovo\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 8230;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
    const server = spawn(process.execPath, [path.join(WEB, 'serve.js'), String(PORT)], { stdio: 'ignore' });
    await sleep(900);
    const browser = await puppeteer.launch({
        executablePath: CHROME, headless: 'new',
        userDataDir: path.join(__dirname, 'chrome-profile-prev'),
        args: ['--no-sandbox', '--disable-extensions', '--no-first-run', '--mute-audio',
            '--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader',
            '--autoplay-policy=no-user-gesture-required'],
        defaultViewport: { width: 1280, height: 800 },
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
        if (i % 3 === 1) { await tap(640, 400, 500); } else { await sleep(400); }
    }
    await sleep(4500);
    // create two worlds through the dialog
    for (const nm of ['世界甲', '世界乙']) {
        await page.evaluate(() => { gamemain.showTabBarViewIndex = 5; window.hallScene.showBarView(); });
        await sleep(900);
        await page.evaluate(() => { window.hallScene.viewGroup[5].getChildByName('editorBtn_createWorld').emit(cc.Node.EventType.TOUCH_END); });
        await sleep(900);
        await page.evaluate((name) => {
            const panel = cc.find('Canvas').getChildByName('editorDialog').getChildByName('panel');
            panel.getChildByName('worldNameInput').getComponent(cc.EditBox).string = name;
            panel.children.filter((n) => n.name === 'dlgBtn')[0].emit(cc.Node.EventType.TOUCH_END);
        }, nm);
        await sleep(1500);
    }
    const before = await page.evaluate(() => {
        const scv = cc.find('Canvas/gameView/scrollView').getComponent(cc.ScrollView);
        const pages = scv.content.children.filter((p) => p.getComponent('StageSelectLayer'));
        return { builtInPages: pages.length, worlds: Object.keys(JSON.parse(localStorage.getItem('maze_dash_custom_worlds') || '{}')).length };
    });
    console.log('after creating two worlds:', JSON.stringify(before));
    // open the preview from the editor home
    await page.evaluate(() => { gamemain.showTabBarViewIndex = 5; window.hallScene.showBarView(); });
    await sleep(1200);
    await page.evaluate(() => { window.hallScene.viewGroup[5].getChildByName('editorSmall_previewWorld').emit(cc.Node.EventType.TOUCH_END); });
    await sleep(1600);
    const prev = await page.evaluate(() => {
        const p = cc.find('Canvas').getChildByName('editorPreview');
        if (!p) { return { found: false }; }
        const rows = p.children.filter((n) => /^previewRow_/.test(n.name));
        return { found: true, rows: rows.map((r) => ({ name: r.getChildByName('previewName') ? r.getChildByName('previewName').getComponent(cc.Label).string : null,
                  size: [Math.round(r.width), Math.round(r.height)], swatch: (function () { const s = r.getChildByName('previewSwatch'); return s ? [s.color.r, s.color.g, s.color.b] : null; })() })),
                 empty: !!p.getChildByName('previewEmpty'), hasClose: !!p.getChildByName('previewClose') };
    });
    console.log('preview:', JSON.stringify(prev, null, 1));
    await page.screenshot({ path: path.join(__dirname, 'shots', 'world-preview.png') });
    console.log('errors:', JSON.stringify(errs.slice(0, 3)));
    await browser.close();
    server.kill();
    process.exit(0);
})().catch((e) => { console.error('HARNESS ERROR', e); process.exit(1); });
