const path = require('path');
const { spawn } = require('child_process');
const puppeteer = require('puppeteer-core');
const WEB = 'E:\\maze_dash\\web';
const CHROME = 'C:\\Users\\Lenovo\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 8234;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
    const server = spawn(process.execPath, [path.join(WEB, 'serve.js'), String(PORT)], { stdio: 'ignore' });
    await sleep(900);
    const browser = await puppeteer.launch({
        executablePath: CHROME, headless: 'new',
        userDataDir: path.join(__dirname, 'chrome-profile-empty'),
        args: ['--no-sandbox', '--disable-extensions', '--no-first-run', '--mute-audio',
            '--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader',
            '--autoplay-policy=no-user-gesture-required'],
        defaultViewport: { width: 1440, height: 810 },
    });
    const page = await browser.newPage();
    const errs = [];
    page.on('pageerror', (e) => errs.push(String(e.message).slice(0, 80)));
    await page.goto(`http://127.0.0.1:${PORT}/index.html`, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction('window.cc && cc.game._prepared === true && !!window.gamemain', { timeout: 60000, polling: 200 });
    const scene = () => page.evaluate(() => (cc.director.getScene() ? cc.director.getScene().name : null));
    async function tap(x, y, s) { await page.mouse.move(x, y); await page.mouse.down(); await sleep(70); await page.mouse.up(); await sleep(s || 900); }
    const css = (sel) => page.evaluate((s) => {
        const n = eval(s);
        const wp = n.convertToWorldSpaceAR(cc.v2(0, 0));
        const r = cc.game.canvas.getBoundingClientRect(); const vs = cc.view.getVisibleSize();
        return { x: r.left + wp.x * (r.width / vs.width), y: r.top + (vs.height - wp.y) * (r.height / vs.height) };
    }, sel);
    for (let i = 0; i < 60; i++) {
        if ((await scene()) === 'HallScene') { break; }
        if (i % 3 === 1) { await tap(720, 400, 500); } else { await sleep(400); }
    }
    await sleep(4500);
    // one world
    await page.evaluate(() => { gamemain.showTabBarViewIndex = 5; window.hallScene.showBarView(); });
    await sleep(800);
    await page.evaluate(() => { window.hallScene.viewGroup[5].getChildByName('editorBtn_createWorld').emit(cc.Node.EventType.TOUCH_END); });
    await sleep(800);
    await page.evaluate(() => {
        const panel = cc.find('Canvas').getChildByName('editorDialog').getChildByName('panel');
        panel.getChildByName('worldNameInput').getComponent(cc.EditBox).string = '唯一世界';
        panel.children.filter((n) => n.name === 'dlgBtn')[0].emit(cc.Node.EventType.TOUCH_END);
    });
    await sleep(1200);
    await page.evaluate(() => { gamemain.showTabBarViewIndex = 5; window.hallScene.showBarView(); });
    await sleep(700);
    await page.evaluate(() => { window.hallScene.viewGroup[5].getChildByName('editorSmall_previewWorld').emit(cc.Node.EventType.TOUCH_END); });
    await sleep(1500);
    const opened = await page.evaluate(() => {
        const p = cc.find('Canvas').getChildByName('editorPreview');
        if (!p) { return { found: false }; }
        const c = p.getChildByName('previewPager').getChildByName('content');
        return { found: true, pages: c.children.length, hasClose: !!p.getChildByName('previewClose'), empty: !!p.getChildByName('previewEmpty') };
    });
    console.log('preview opened:', JSON.stringify(opened));
    // tap 删除世界
    const del = await css("cc.find('Canvas').getChildByName('editorPreview').getChildByName('previewPager').getChildByName('content').children[0].getChildByName('previewDelete')");
    await tap(del.x, del.y, 1200);
    const confirm = await page.evaluate(() => {
        const m = cc.find('Canvas').getChildByName('editorConfirm');
        if (!m) { return { shown: false }; }
        const panel = m.getChildByName('panel');
        const txt = panel.getChildByName('confirmText');
        return { shown: true, text: txt ? txt.getComponent(cc.Label).string : null, buttons: panel.children.filter((n) => n.name === 'dlgBtn').length };
    });
    console.log('confirm dialog:', JSON.stringify(confirm));
    await page.screenshot({ path: path.join(__dirname, 'shots', 'confirm-delete.png') });
    // tap 确认删除 (second dlgBtn)
    const ok = await css("cc.find('Canvas').getChildByName('editorConfirm').getChildByName('panel').children.filter(function(n){return n.name==='dlgBtn';})[1]");
    await tap(ok.x, ok.y, 2000);
    const after = await page.evaluate(() => {
        const worlds = JSON.parse(localStorage.getItem('maze_dash_custom_worlds') || '{}');
        return { remaining: Object.keys(worlds).length,
                 previewGone: !cc.find('Canvas').getChildByName('editorPreview'),
                 confirmGone: !cc.find('Canvas').getChildByName('editorConfirm'),
                 currentIndex: window.hallScene.currentIndex,
                 deleted: window.MazeDashCustomTab.stats.worldsDeleted || 0 };
    });
    console.log('after confirming delete:', JSON.stringify(after));
    // reopen with zero worlds: must show the empty state and a way back
    await page.evaluate(() => { window.hallScene.viewGroup[5].getChildByName('editorSmall_previewWorld').emit(cc.Node.EventType.TOUCH_END); });
    await sleep(1500);
    const emptyState = await page.evaluate(() => {
        const p = cc.find('Canvas').getChildByName('editorPreview');
        if (!p) { return { found: false }; }
        const e = p.getChildByName('previewEmpty');
        return { found: true, emptyLabel: e ? e.getComponent(cc.Label).string : null, hasClose: !!p.getChildByName('previewClose'), hasHint: !!p.getChildByName('previewEmptyHint') };
    });
    console.log('empty state:', JSON.stringify(emptyState));
    await page.screenshot({ path: path.join(__dirname, 'shots', 'empty-preview.png') });
    console.log('errors:', JSON.stringify(errs.slice(0, 3)));
    await browser.close();
    server.kill();
    process.exit(0);
})().catch((e) => { console.error('HARNESS ERROR', e); process.exit(1); });
