/* R4: the editor's create-world dialog, driven through the exported editorAction (the editor home
   lives on a pager page that is not active at boot, so a tab click cannot reach it).
   Checks: 24 swatches, DOM inputs appear, the `dim` node closes it, 0 leftover inputs, reopen works. */
const puppeteer = require('puppeteer-core');
const CHROME = 'C:\\Users\\Lenovo\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe';
const FILE = 'file:///E:/maze_dash/dist/MazeDash-standalone.html';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
    const browser = await puppeteer.launch({
        executablePath: CHROME, headless: 'new',
        userDataDir: 'E:\\maze_dash\\_work\\test\\chrome-profile-r4',
        protocolTimeout: 240000,
        args: ['--no-sandbox', '--disable-extensions', '--no-first-run', '--mute-audio',
            '--allow-file-access-from-files', '--enable-unsafe-swiftshader', '--use-gl=angle',
            '--use-angle=swiftshader', '--autoplay-policy=no-user-gesture-required'],
        defaultViewport: { width: 1440, height: 810 }
    });
    const page = await browser.newPage();
    const errs = [];
    page.on('pageerror', (e) => errs.push(String(e.message).slice(0, 120)));
    await page.goto(FILE, { waitUntil: 'domcontentloaded', timeout: 120000 });
    await page.waitForFunction('window.cc && cc.game && cc.game._prepared === true', { timeout: 120000, polling: 150 });
    const scene = () => page.evaluate(() => (cc.director.getScene() ? cc.director.getScene().name : null));
    const tap = async (x, y, s) => { await page.mouse.move(x, y); await page.mouse.down(); await sleep(70); await page.mouse.up(); await sleep(s || 700); };
    for (let i = 0; i < 90; i++) {
        if ((await scene()) === 'HallScene') { break; }
        if (i % 3 === 1) { await tap(720, 400, 500); } else { await sleep(400); }
    }
    await sleep(3200);

    await page.evaluate(() => { window.MazeDashCustomTab.editorAction('createWorld'); });
    await sleep(1200);
    const opened = await page.evaluate(() => {
        const find = (name) => { let h = null; (function w(n) { if (h) { return; } if (n.name === name) { h = n; return; } (n.children || []).forEach(w); })(cc.director.getScene()); return h; };
        let sw = 0, withSprite = 0;
        (function c(n) { if (/^swatch_/.test(n.name)) { sw++; if (n.getComponent(cc.Sprite)) { withSprite++; } } (n.children || []).forEach(c); })(cc.director.getScene());
        const dlg = find('editorDialog');
        return { dialogActive: !!(dlg && dlg.activeInHierarchy), swatches: sw, swatchesWithSprite: withSprite, domInputs: document.querySelectorAll('input').length };
    });
    console.log('R4_OPEN=' + JSON.stringify(opened));

    /* close through the real dim node */
    const dp = await page.evaluate(() => {
        const find = (name) => { let h = null; (function w(n) { if (h) { return; } if (n.name === name) { h = n; return; } (n.children || []).forEach(w); })(cc.director.getScene()); return h; };
        const dim = find('dim');
        if (!dim) { return null; }
        const w = dim.convertToWorldSpaceAR(cc.v2(0, 0));
        const vs = cc.view.getVisibleSize(), rect = cc.game.canvas.getBoundingClientRect();
        const sx = vs.width / rect.width, sy = vs.height / rect.height;
        return { x: rect.left + w.x / sx, y: rect.top + rect.height - w.y / sy };
    });
    if (dp) { await tap(dp.x, dp.y, 900); }
    const closed = await page.evaluate(() => {
        const find = (name) => { let h = null; (function w(n) { if (h) { return; } if (n.name === name) { h = n; return; } (n.children || []).forEach(w); })(cc.director.getScene()); return h; };
        const dlg = find('editorDialog');
        return { dialogActive: !!(dlg && dlg.activeInHierarchy), domInputsAfterClose: document.querySelectorAll('input').length };
    });
    console.log('R4_CLOSED=' + JSON.stringify(closed));

    await page.evaluate(() => { window.MazeDashCustomTab.editorAction('createWorld'); });
    await sleep(900);
    const reopen = await page.evaluate(() => {
        const find = (name) => { let h = null; (function w(n) { if (h) { return; } if (n.name === name) { h = n; return; } (n.children || []).forEach(w); })(cc.director.getScene()); return h; };
        const dlg = find('editorDialog');
        return { dialogActive: !!(dlg && dlg.activeInHierarchy), domInputs: document.querySelectorAll('input').length };
    });
    console.log('R4_REOPEN=' + JSON.stringify(reopen));
    console.log('R4_ERRS=' + JSON.stringify(errs.slice(0, 3)));
    await page.screenshot({ path: 'E:\\maze_dash\\_work\\test\\shots\\r4-dialog.png' });
    await browser.close();
    process.exit(0);
})().catch((e) => { console.error('HARNESS ERROR', e); process.exit(1); });
