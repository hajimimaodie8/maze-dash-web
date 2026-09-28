const path = require('path');
const { spawn } = require('child_process');
const puppeteer = require('puppeteer-core');
const WEB = 'E:\\maze_dash\\web';
const CHROME = 'C:\\Users\\Lenovo\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 8235;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
    const server = spawn(process.execPath, [path.join(WEB, 'serve.js'), String(PORT)], { stdio: 'ignore' });
    await sleep(900);
    const browser = await puppeteer.launch({
        executablePath: CHROME, headless: 'new',
        userDataDir: path.join(__dirname, 'chrome-profile-backempty'),
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
    async function tap(x, y, s) { await page.mouse.move(x, y); await page.mouse.down(); await sleep(80); await page.mouse.up(); await sleep(s || 900); }
    const css = (expr) => page.evaluate((s) => {
        const n = eval(s);
        const wp = n.convertToWorldSpaceAR(cc.v2(0, 0));
        const r = cc.game.canvas.getBoundingClientRect(); const vs = cc.view.getVisibleSize();
        return { x: r.left + wp.x * (r.width / vs.width), y: r.top + (vs.height - wp.y) * (r.height / vs.height) };
    }, expr);
    for (let i = 0; i < 60; i++) {
        if ((await scene()) === 'HallScene') { break; }
        if (i % 3 === 1) { await tap(720, 400, 500); } else { await sleep(400); }
    }
    await sleep(4500);
    // no worlds at all
    await page.evaluate(() => { try { localStorage.setItem('maze_dash_custom_worlds', '{}'); } catch (e) {} });
    await page.evaluate(() => { gamemain.showTabBarViewIndex = 5; window.hallScene.showBarView(); });
    await sleep(1000);
    await page.evaluate(() => { window.hallScene.viewGroup[5].getChildByName('editorSmall_previewWorld').emit(cc.Node.EventType.TOUCH_END); });
    await sleep(1500);
    const opened = await page.evaluate(() => {
        const p = cc.find('Canvas').getChildByName('editorPreview');
        return { found: !!p, empty: p ? !!p.getChildByName('previewEmpty') : null, label: (function () { const e = p && p.getChildByName('previewEmpty'); return e ? e.getComponent(cc.Label).string : null; })(), hasClose: p ? !!p.getChildByName('previewClose') : null };
    });
    console.log('empty preview:', JSON.stringify(opened));
    // TAP the back button - the reported failure
    const bp = await css("cc.find('Canvas').getChildByName('editorPreview').getChildByName('previewClose')");
    console.log('back button at', JSON.stringify(bp));
    await tap(bp.x, bp.y, 1500);
    const after = await page.evaluate(() => ({
        previewGone: !cc.find('Canvas').getChildByName('editorPreview'),
        currentIndex: window.hallScene.currentIndex,
        closedCount: window.MazeDashCustomTab.stats.previewsClosed || 0,
        backCount: window.MazeDashCustomTab.stats.backToEditor || 0,
        editorVisible: !!(window.hallScene.viewGroup[5] && window.hallScene.viewGroup[5].activeInHierarchy),
    }));
    console.log('after tapping back:', JSON.stringify(after));
    await page.screenshot({ path: path.join(__dirname, 'shots', 'after-back-empty.png') });
    console.log('errors:', JSON.stringify(errs.slice(0, 3)));
    await browser.close();
    server.kill();
    process.exit(0);
})().catch((e) => { console.error('HARNESS ERROR', e); process.exit(1); });
