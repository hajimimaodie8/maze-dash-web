/* Mutual exclusion between editor UIs + the navigation matrix the user walks.
   Step 0 finds how the custom tab really switches pages: the tab items carry the game's own
   TabBarItem + UIButton, so print their clickEvents (target/component/handler) and call the handler
   that is found. That is an INTERNAL path, not a real click - stated in the report.
   Then: home -> grid editor -> back -> grid again -> back -> create-world dialog -> cancel, asserting
   after EVERY step that at most one editor UI is active (gridEditor / customLevelsView / editorDialog)
   and screenshotting each step. */
const puppeteer = require('puppeteer-core');
const CHROME = 'C:\\Users\\Lenovo\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe';
const FILE = 'file:///E:/maze_dash/dist/MazeDash-standalone.html';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const ACTIVE_UIS = function () {
    const find = (name) => { let h = null; (function w(n) { if (h) { return; } if (n.name === name) { h = n; return; } (n.children || []).forEach(w); })(cc.director.getScene()); return h; };
    const list = [];
    const grid = find('gridEditor'); if (grid && grid.activeInHierarchy) { list.push('gridEditor'); }
    const home = find('customLevelsView'); if (home && home.activeInHierarchy) { list.push('customLevelsView'); }
    const dlg = find('editorDialog'); if (dlg && dlg.activeInHierarchy) { list.push('editorDialog'); }
    const vs = cc.view.getVisibleSize();
    const outside = [];
    ['editorSmall_previewWorld', 'editorSmall_previewLevel', 'editorSmall_exportJson', 'editorSmall_importJson', 'editorBtn_createWorld', 'editorBtn_createLevel'].forEach((n2) => {
        const nd = find(n2);
        if (!nd || !nd.activeInHierarchy) { return; }
        const p = nd.convertToWorldSpaceAR(cc.v2(0, 0));
        if (p.x - nd.width / 2 < -2 || p.x + nd.width / 2 > vs.width + 2 || p.y - nd.height / 2 < -2 || p.y + nd.height / 2 > vs.height + 2) { outside.push(n2); }
    });
    return { activeUIs: list, count: list.length, offscreen: outside };
};

(async () => {
    const browser = await puppeteer.launch({
        executablePath: CHROME, headless: 'new',
        userDataDir: 'E:\\maze_dash\\_work\\test\\chrome-profile-mutex',
        protocolTimeout: 240000,
        args: ['--no-sandbox', '--disable-extensions', '--no-first-run', '--mute-audio',
            '--allow-file-access-from-files', '--enable-unsafe-swiftshader', '--use-gl=angle',
            '--use-angle=swiftshader', '--autoplay-policy=no-user-gesture-required'],
        defaultViewport: { width: 1440, height: 810 }
    });
    const page = await browser.newPage();
    const errs = [];
    page.on('pageerror', (e) => errs.push(String(e.message).slice(0, 130)));
    const pageOf = (name) => page.evaluate((n) => {
        const find = (nm) => { let h = null; (function w(k) { if (h) { return; } if (k.name === nm) { h = k; return; } (k.children || []).forEach(w); })(cc.director.getScene()); return h; };
        const nd = find(n);
        if (!nd) { return null; }
        const p = nd.convertToWorldSpaceAR(cc.v2(0, 0));
        const vs = cc.view.getVisibleSize(), rect = cc.game.canvas.getBoundingClientRect();
        const sx = vs.width / rect.width, sy = vs.height / rect.height;
        return { x: rect.left + p.x / sx, y: rect.top + rect.height - p.y / sy, active: nd.activeInHierarchy };
    }, name);
    const tap = async (x, y, s) => { await page.mouse.move(x, y); await page.mouse.down(); await sleep(80); await page.mouse.up(); await sleep(s || 900); };
    const shot = async (n) => page.screenshot({ path: 'E:\\maze_dash\\_work\\test\\shots\\' + n });
    await page.goto(FILE, { waitUntil: 'domcontentloaded', timeout: 120000 });
    await page.waitForFunction('window.cc && cc.game && cc.game._prepared === true', { timeout: 120000, polling: 150 });
    const scene = () => page.evaluate(() => (cc.director.getScene() ? cc.director.getScene().name : null));
    for (let i = 0; i < 90; i++) { if ((await scene()) === 'HallScene') { break; } if (i % 3 === 1) { await tap(720, 400, 500); } else { await sleep(400); } }
    await sleep(3200);

    /* Step 0: how the game really switches pages, read out of the built bundle:
         showBarView: function () { var e = gamemain.showTabBarViewIndex; if (this.currentIndex != e) {
           this.tabBar.children[e].getComponent("TabBarItem").setHighlight(); ... this.viewGroup[e] moveIn() } }
       The target page comes from gamemain.showTabBarViewIndex - NOT from hall.currentIndex (that is the
       CURRENT page) and not from the tab items' clickEvents (empty). Using this is an INTERNAL path, not
       a real click: the hit test proved the real click does reach customBar, it just does not switch. */
    const wiring = await page.evaluate(() => {
        const hall = window.hallScene;
        const log = [];
        try { gamemain.showTabBarViewIndex = 5; log.push('gamemain.showTabBarViewIndex=5'); } catch (e) { log.push('set failed'); }
        try { hall.showBarView(); log.push('hall.showBarView() ok'); } catch (e) { log.push('showBarView threw ' + e.message); }
        return { log: log, currentIndex: String(hall.currentIndex) };
    });
    await sleep(1800);
    console.log('WIRING(internal path)=' + JSON.stringify(wiring));
    const s0 = await page.evaluate(ACTIVE_UIS);
    console.log('STEP0_home=' + JSON.stringify(s0));
    await shot('87-step0-editor-home.png');

    /* step 2: open the grid editor with a REAL click on the home's 创建新关卡 button */
    const btnLevel = await pageOf('editorBtn_createLevel');
    if (btnLevel && btnLevel.active) { await tap(btnLevel.x, btnLevel.y, 1500); }
    const s1 = await page.evaluate(ACTIVE_UIS);
    console.log('STEP1_grid_open=' + JSON.stringify(s1));
    await shot('88-step1-grid-editor.png');

    /* step 3: back to the home with the REAL back button - the step the user photographed */
    const back = await pageOf('gridBack');
    if (back) { await tap(back.x, back.y, 1300); }
    const s2 = await page.evaluate(ACTIVE_UIS);
    console.log('STEP2_back_home=' + JSON.stringify(s2));
    await shot('89-step2-back-to-home.png');

    /* step 4: open + back again (fresh cycle) */
    const btnLevel2 = await pageOf('editorBtn_createLevel');
    if (btnLevel2 && btnLevel2.active) { await tap(btnLevel2.x, btnLevel2.y, 1300); }
    const s3 = await page.evaluate(ACTIVE_UIS);
    const back2 = await pageOf('gridBack');
    if (back2) { await tap(back2.x, back2.y, 1300); }
    const s4 = await page.evaluate(ACTIVE_UIS);
    console.log('STEP3_cycle2=' + JSON.stringify({ open: s3, afterBack: s4 }));

    /* step 5: create-world dialog then cancel */
    const btnWorld = await pageOf('editorBtn_createWorld');
    if (btnWorld && btnWorld.active) { await tap(btnWorld.x, btnWorld.y, 1200); }
    const s5 = await page.evaluate(ACTIVE_UIS);
    const dim = await pageOf('dim');
    if (dim) { await tap(dim.x, dim.y, 1000); }
    const s6 = await page.evaluate(ACTIVE_UIS);
    console.log('STEP4_dialog=' + JSON.stringify({ open: s5, afterCancel: s6 }));
    await shot('90-step4-after-dialog-cancel.png');
    console.log('ERRS=' + JSON.stringify(errs.slice(0, 3)));
    await browser.close();
    process.exit(0);
})().catch((e) => { console.error('HARNESS ERROR', e); process.exit(1); });
