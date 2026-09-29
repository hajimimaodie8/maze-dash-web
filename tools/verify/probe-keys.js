const path = require('path');
const { spawn } = require('child_process');
const puppeteer = require('puppeteer-core');
const WEB = 'E:\\maze_dash\\web';
const CHROME = 'C:\\Users\\Lenovo\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 8244;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
    const server = spawn(process.execPath, [path.join(WEB, 'serve.js'), String(PORT)], { stdio: 'ignore' });
    await sleep(900);
    const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new',
        userDataDir: path.join(__dirname, 'chrome-profile-keytest'),
        args: ['--no-sandbox','--disable-extensions','--no-first-run','--mute-audio','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader','--autoplay-policy=no-user-gesture-required'],
        defaultViewport: { width: 1440, height: 810 } });
    const page = await browser.newPage();
    const errs = [];
    page.on('pageerror', (e) => errs.push(String(e.message).slice(0, 90)));
    await page.goto(`http://127.0.0.1:${PORT}/index.html`, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction('window.cc && cc.game._prepared === true && !!window.gamemain', { timeout: 60000, polling: 200 });
    const scene = () => page.evaluate(() => (cc.director.getScene() ? cc.director.getScene().name : null));
    async function tap(x, y, s) { await page.mouse.move(x, y); await page.mouse.down(); await sleep(80); await page.mouse.up(); await sleep(s || 900); }
    for (let i = 0; i < 60; i++) { if ((await scene()) === 'HallScene') { break; } if (i % 3 === 1) { await tap(720, 400, 500); } else { await sleep(400); } }
    await sleep(5000);
    const idx = () => page.evaluate(() => {
        const pager = window.hallScene.StageSelectLayer;
        return { idx: pager._curPageIdx, keys: window.MazeDashCustomTab.stats.keysInstalled || 0, keyPages: window.MazeDashCustomTab.stats.keyPages || 0 };
    });
    console.log('start:', JSON.stringify(await idx()));
    await page.keyboard.press('ArrowRight'); await sleep(1500);
    console.log('after ArrowRight:', JSON.stringify(await idx()));
    await page.keyboard.press('KeyD'); await sleep(1500);
    console.log('after D:', JSON.stringify(await idx()));
    await page.keyboard.press('ArrowLeft'); await sleep(1500);
    console.log('after ArrowLeft:', JSON.stringify(await idx()));
    await page.keyboard.press('KeyA'); await sleep(1500);
    console.log('after A:', JSON.stringify(await idx()));
    // in a text field the keys must NOT turn pages
    await page.evaluate(() => { gamemain.showTabBarViewIndex = 5; window.hallScene.showBarView(); });
    await sleep(1200);
    await page.evaluate(() => { window.hallScene.viewGroup[5].getChildByName('editorBtn_createWorld').emit(cc.Node.EventType.TOUCH_END); });
    await sleep(1500);
    await page.evaluate(() => { const i = cc.find('Canvas').getChildByName('editorDialog').getChildByName('panel').getChildByName('worldNameInput').__input; i.focus(); });
    const before = await idx();
    await page.keyboard.type('wasd test');
    await sleep(1200);
    const after = await page.evaluate(() => {
        const pager = window.hallScene.StageSelectLayer;
        const el = cc.find('Canvas').getChildByName('editorDialog').getChildByName('panel').getChildByName('worldNameInput').__input;
        return { idx: pager._curPageIdx, typed: el.value, focused: document.activeElement === el };
    });
    console.log('typing into the field:', JSON.stringify({ before: before.idx, after: after.idx, typed: after.typed, focused: after.focused }));
    console.log('errors:', JSON.stringify(errs.slice(0, 3)));
    await browser.close(); server.kill(); process.exit(0);
})().catch((e) => { console.error('HARNESS ERROR', e); process.exit(1); });
