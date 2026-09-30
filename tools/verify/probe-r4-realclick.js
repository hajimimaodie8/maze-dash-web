/* Two things in one run:
   (a) make the editor home visible through the SAME path our own code uses - hall.currentIndex + 
       hall.showBarView() - which is NOT a real click (labelled), because the real tab click does not
       take in a probe and the selection logic lives on the game's TabBarItem/UIButton;
   (b) with the page visible, drive R4 with REAL clicks on the editor's own "create world" button:
       dialog appears, 24 swatches, dim closes it, 0 leftover DOM inputs, reopen works.
   Screenshot 85 shows the editor home with its four small buttons + the tab bar, i.e. exactly what the
   name claims. */
const puppeteer = require('puppeteer-core');
const CHROME = 'C:\\Users\\Lenovo\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe';
const FILE = 'file:///E:/maze_dash/dist/MazeDash-standalone.html';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
    const browser = await puppeteer.launch({
        executablePath: CHROME, headless: 'new',
        userDataDir: 'E:\\maze_dash\\_work\\test\\chrome-profile-r4real',
        protocolTimeout: 240000,
        args: ['--no-sandbox', '--disable-extensions', '--no-first-run', '--mute-audio',
            '--allow-file-access-from-files', '--enable-unsafe-swiftshader', '--use-gl=angle',
            '--use-angle=swiftshader', '--autoplay-policy=no-user-gesture-required'],
        defaultViewport: { width: 1440, height: 810 }
    });
    const page = await browser.newPage();
    const errs = [];
    page.on('pageerror', (e) => errs.push(String(e.message).slice(0, 130)));
    await page.goto(FILE, { waitUntil: 'domcontentloaded', timeout: 120000 });
    await page.waitForFunction('window.cc && cc.game && cc.game._prepared === true', { timeout: 120000, polling: 150 });
    const scene = () => page.evaluate(() => (cc.director.getScene() ? cc.director.getScene().name : null));
    const tap = async (x, y, s) => { await page.mouse.move(x, y); await page.mouse.down(); await sleep(80); await page.mouse.up(); await sleep(s || 900); };
    const pageOf = (name) => page.evaluate((n) => {
        const find = (nm) => { let h = null; (function w(k) { if (h) { return; } if (k.name === nm) { h = k; return; } (k.children || []).forEach(w); })(cc.director.getScene()); return h; };
        const nd = find(n);
        if (!nd) { return null; }
        const p = nd.convertToWorldSpaceAR(cc.v2(0, 0));
        const vs = cc.view.getVisibleSize(), rect = cc.game.canvas.getBoundingClientRect();
        const sx = vs.width / rect.width, sy = vs.height / rect.height;
        return { x: rect.left + p.x / sx, y: rect.top + rect.height - p.y / sy, active: nd.activeInHierarchy };
    }, name);
    for (let i = 0; i < 90; i++) { if ((await scene()) === 'HallScene') { break; } if (i % 3 === 1) { await tap(720, 400, 500); } else { await sleep(400); } }
    await sleep(3200);

    /* (a) NOT a real click: same path our code uses */
    const act = await page.evaluate(() => {
        const hall = window.hallScene;
        const before = String(hall.currentIndex);
        const log = [];
        try { hall.currentIndex = 5; log.push('currentIndex=' + hall.currentIndex); } catch (e) { log.push('set failed'); }
        try { hall.showBarView(); log.push('showBarView() ok'); } catch (e) { log.push('showBarView threw ' + e.message); }
        return { before: before, log: log };
    });
    await sleep(1400);
    const state = await page.evaluate(() => {
        const find = (nm) => { let h = null; (function w(k) { if (h) { return; } if (k.name === nm) { h = k; return; } (k.children || []).forEach(w); })(cc.director.getScene()); return h; };
        const t = find('editorTitle'), home = t && t.parent;
        const hall = window.hallScene;
        const out = { homeActive: !!(home && home.activeInHierarchy), homeOpacity: home ? home.opacity : null, currentIndex: String(hall.currentIndex), buttons: {}, tabBarActive: !!(hall.tabBar && hall.tabBar.activeInHierarchy) };
        ['previewWorld', 'previewLevel', 'exportJson', 'importJson'].forEach((sid) => {
            const n = find('editorSmall_' + sid);
            out.buttons[sid] = n ? { active: n.activeInHierarchy, x: Math.round(n.convertToWorldSpaceAR(cc.v2(0, 0)).x), label: (function () { const l = n.getChildByName('editorSmallLabel_' + sid), c = l && l.getComponent(cc.Label); return c ? c.string : null; })() } : 'MISSING';
        });
        return out;
    });
    console.log('ACTIVATED(not a real click)=' + JSON.stringify(act) + ' => ' + JSON.stringify(state));
    await page.screenshot({ path: 'E:\\maze_dash\\_work\\test\\shots\\85-editorhome-visible-with-buttons.png' });

    /* (b) R4 with REAL clicks on the editor's own button */
    const btn = await pageOf('editorBtn_createWorld');
    console.log('CREATEWORLD_BTN=' + JSON.stringify(btn));
    if (btn && btn.active) {
        await tap(btn.x, btn.y, 1200);
        const opened = await page.evaluate(() => {
            const find = (nm) => { let h = null; (function w(k) { if (h) { return; } if (k.name === nm) { h = k; return; } (k.children || []).forEach(w); })(cc.director.getScene()); return h; };
            let sw = 0, sp = 0;
            (function c(n) { if (/^swatch_/.test(n.name)) { sw++; if (n.getComponent(cc.Sprite)) { sp++; } } (n.children || []).forEach(c); })(cc.director.getScene());
            const dlg = find('editorDialog');
            return { dialogActive: !!(dlg && dlg.activeInHierarchy), swatches: sw, withSprite: sp, domInputs: document.querySelectorAll('input').length };
        });
        console.log('R4_REAL_OPEN=' + JSON.stringify(opened));
        const dim = await pageOf('dim');
        if (dim) { await tap(dim.x, dim.y, 1000); }
        const closed = await page.evaluate(() => {
            const find = (nm) => { let h = null; (function w(k) { if (h) { return; } if (k.name === nm) { h = k; return; } (k.children || []).forEach(w); })(cc.director.getScene()); return h; };
            const dlg = find('editorDialog');
            return { dialogActive: !!(dlg && dlg.activeInHierarchy), domInputsAfterClose: document.querySelectorAll('input').length };
        });
        console.log('R4_REAL_CLOSED=' + JSON.stringify(closed));
        await tap(btn.x, btn.y, 1000);
        const reopen = await page.evaluate(() => {
            const find = (nm) => { let h = null; (function w(k) { if (h) { return; } if (k.name === nm) { h = k; return; } (k.children || []).forEach(w); })(cc.director.getScene()); return h; };
            const dlg = find('editorDialog');
            return { dialogActive: !!(dlg && dlg.activeInHierarchy), domInputs: document.querySelectorAll('input').length };
        });
        console.log('R4_REAL_REOPEN=' + JSON.stringify(reopen));
    }
    console.log('ERRS=' + JSON.stringify(errs.slice(0, 3)));
    await browser.close();
    process.exit(0);
})().catch((e) => { console.error('HARNESS ERROR', e); process.exit(1); });
