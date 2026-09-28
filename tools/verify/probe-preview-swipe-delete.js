const path = require('path');
const { spawn } = require('child_process');
const puppeteer = require('puppeteer-core');
const WEB = 'E:\\maze_dash\\web';
const CHROME = 'C:\\Users\\Lenovo\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 8231;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
    const server = spawn(process.execPath, [path.join(WEB, 'serve.js'), String(PORT)], { stdio: 'ignore' });
    await sleep(900);
    const browser = await puppeteer.launch({
        executablePath: CHROME, headless: 'new',
        userDataDir: path.join(__dirname, 'chrome-profile-del'),
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
    for (const nm of ['世界甲', '世界乙']) {
        await page.evaluate(() => { gamemain.showTabBarViewIndex = 5; window.hallScene.showBarView(); });
        await sleep(800);
        await page.evaluate(() => { window.hallScene.viewGroup[5].getChildByName('editorBtn_createWorld').emit(cc.Node.EventType.TOUCH_END); });
        await sleep(800);
        await page.evaluate((name) => {
            const panel = cc.find('Canvas').getChildByName('editorDialog').getChildByName('panel');
            panel.getChildByName('worldNameInput').getComponent(cc.EditBox).string = name;
            panel.children.filter((n) => n.name === 'dlgBtn')[0].emit(cc.Node.EventType.TOUCH_END);
        }, nm);
        await sleep(1200);
    }
    await page.evaluate(() => { gamemain.showTabBarViewIndex = 5; window.hallScene.showBarView(); });
    await sleep(1000);
    await page.evaluate(() => { window.hallScene.viewGroup[5].getChildByName('editorSmall_previewWorld').emit(cc.Node.EventType.TOUCH_END); });
    await sleep(1800);
    const st = await page.evaluate(() => {
        const p = cc.find('Canvas').getChildByName('editorPreview');
        if (!p) { return { found: false }; }
        const pn = p.getChildByName('previewPager');
        const pv = pn && pn.getComponent(cc.PageView);
        const content = pn && pn.getChildByName('content');
        return { found: true, hasArrows: !!(p.getChildByName('previewLeft') || p.getChildByName('previewRight')),
                 pageView: !!pv, pages: content ? content.children.length : 0,
                 contentW: content ? Math.round(content.width) : 0, viewW: Math.round(pn ? pn.width : 0),
                 idx: pv ? pv.getCurrentPageIndex() : null,
                 deleteBtns: content ? content.children.filter((pg) => pg.getChildByName('previewDelete')).length : 0,
                 inertia: pv ? pv.inertia : null, elastic: pv ? pv.elastic : null, brake: pv ? pv.brake : null };
    });
    console.log('preview:', JSON.stringify(st));
    // swipe left with the mouse, exactly like a touch drag
    const before = st.idx;
    await page.mouse.move(900, 400);
    await page.mouse.down();
    for (let x = 1150; x >= 150; x -= 25) { await page.mouse.move(x, 380); await sleep(12); }
    await page.mouse.up();
    await sleep(2500);
    const afterSwipe = await page.evaluate(() => {
        const pv = cc.find('Canvas').getChildByName('editorPreview').getChildByName('previewPager').getComponent(cc.PageView);
        return pv.getCurrentPageIndex();
    });
    console.log('swipe: page', before, '->', afterSwipe);
    // delete the visible world
    const dp = await page.evaluate(() => {
        const p = cc.find('Canvas').getChildByName('editorPreview');
        const content = p.getChildByName('previewPager').getChildByName('content');
        const pv = p.getChildByName('previewPager').getComponent(cc.PageView);
        const pg = content.children[pv.getCurrentPageIndex()];
        const del = pg.getChildByName('previewDelete');
        const wp = del.convertToWorldSpaceAR(cc.v2(0, 0));
        const r = cc.game.canvas.getBoundingClientRect(); const vs = cc.view.getVisibleSize();
        return { x: r.left + wp.x * (r.width / vs.width), y: r.top + (vs.height - wp.y) * (r.height / vs.height) };
    });
    await tap(dp.x, dp.y, 1200);
    const confirmShown = await page.evaluate(() => {
        const m = cc.find('Canvas').getChildByName('editorConfirm');
        if (!m) { return { shown: false }; }
        const panel = m.getChildByName('panel');
        const txt = panel.getChildByName('confirmText');
        return { shown: true, text: txt ? txt.getComponent(cc.Label).string : null, buttons: panel.children.filter((n) => n.name === 'dlgBtn').length };
    });
    console.log('confirm dialog:', JSON.stringify(confirmShown));
    await page.screenshot({ path: path.join(__dirname, 'shots', 'delete-world-confirm.png') });
    // tap 确认删除 (the second dlgBtn)
    const cp = await page.evaluate(() => {
        const panel = cc.find('Canvas').getChildByName('editorConfirm').getChildByName('panel');
        const b = panel.children.filter((n) => n.name === 'dlgBtn')[1];
        const wp = b.convertToWorldSpaceAR(cc.v2(0, 0));
        const r = cc.game.canvas.getBoundingClientRect(); const vs = cc.view.getVisibleSize();
        return { x: r.left + wp.x * (r.width / vs.width), y: r.top + (vs.height - wp.y) * (r.height / vs.height) };
    });
    await tap(cp.x, cp.y, 2000);
    const after = await page.evaluate(() => {
        const worlds = JSON.parse(localStorage.getItem('maze_dash_custom_worlds') || '{}');
        const p = cc.find('Canvas').getChildByName('editorPreview');
        const content = p && p.getChildByName('previewPager') ? p.getChildByName('previewPager').getChildByName('content') : null;
        return { remaining: Object.keys(worlds).length, names: Object.keys(worlds).map((k) => worlds[k].name),
                 previewPages: content ? content.children.length : 0, confirmClosed: !cc.find('Canvas').getChildByName('editorConfirm') };
    });
    console.log('after delete:', JSON.stringify(after));
    await page.screenshot({ path: path.join(__dirname, 'shots', 'after-delete.png') });
    console.log('errors:', JSON.stringify(errs.slice(0, 3)));
    await browser.close();
    server.kill();
    process.exit(0);
})().catch((e) => { console.error('HARNESS ERROR', e); process.exit(1); });
