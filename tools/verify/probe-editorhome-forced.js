/* TEST-FORCED STATE (the file name says so): force the editor home container visible, then measure and
   screenshot it, to answer one question - when the container IS shown, do the four small buttons
   render? The hall hides that container by mode, and clicking the custom tab in a probe does not
   switch to it, so this is the only way to see the row on a screenshot. */
const puppeteer = require('puppeteer-core');
const CHROME = 'C:\\Users\\Lenovo\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe';
const FILE = 'file:///E:/maze_dash/dist/MazeDash-standalone.html';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
    const browser = await puppeteer.launch({
        executablePath: CHROME, headless: 'new',
        userDataDir: 'E:\\maze_dash\\_work\\test\\chrome-profile-forced',
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
    const tap = async (x, y, s) => { await page.mouse.move(x, y); await page.mouse.down(); await sleep(70); await page.mouse.up(); await sleep(s || 800); };
    for (let i = 0; i < 90; i++) { if ((await scene()) === 'HallScene') { break; } if (i % 3 === 1) { await tap(720, 400, 500); } else { await sleep(400); } }
    await sleep(3200);

    const forced = await page.evaluate(() => {
        const find = (name) => { let h = null; (function w(n) { if (h) { return; } if (n.name === name) { h = n; return; } (n.children || []).forEach(w); })(cc.director.getScene()); return h; };
        const t = find('editorTitle'), home = t && t.parent;
        if (!home) { return { error: 'editor home not found' }; }
        home.active = true;
        home.opacity = 255;
        /* the row sits in the VIEW's local space, so with the view at world -1138 the row would be off
           screen; move the view to the screen centre for the shot so the picture is meaningful. */
        const vs = cc.view.getVisibleSize();
        const w = home.convertToWorldSpaceAR(cc.v2(0, 0));
        home.x += (vs.width / 2 - w.x);
        return { movedBy: Math.round(vs.width / 2 - w.x) };
    });
    await sleep(900);
    const measured = await page.evaluate(() => {
        const find = (name) => { let h = null; (function w(n) { if (h) { return; } if (n.name === name) { h = n; return; } (n.children || []).forEach(w); })(cc.director.getScene()); return h; };
        const vs = cc.view.getVisibleSize();
        const out = { buttons: {}, tabBarVisible: !!(window.hallScene && window.hallScene.tabBar && window.hallScene.tabBar.activeInHierarchy) };
        ['previewWorld', 'previewLevel', 'exportJson', 'importJson'].forEach((sid) => {
            const n = find('editorSmall_' + sid);
            if (!n) { out.buttons[sid] = 'MISSING'; return; }
            const p = n.convertToWorldSpaceAR(cc.v2(0, 0));
            out.buttons[sid] = {
                active: n.activeInHierarchy, x: Math.round(p.x), y: Math.round(p.y), w: n.width,
                inside: (p.x - n.width / 2 >= -2 && p.x + n.width / 2 <= vs.width + 2 && p.y - n.height / 2 >= -2 && p.y + n.height / 2 <= vs.height + 2),
                coverable: (function () { const sp = n.getChildByName('editorSmallPanel'); return !!sp; })()
            };
        });
        return out;
    });
    console.log('FORCED=' + JSON.stringify(forced));
    console.log('MEASURED=' + JSON.stringify(measured));
    console.log('ERRS=' + JSON.stringify(errs.slice(0, 3)));
    await page.screenshot({ path: 'E:\\maze_dash\\_work\\test\\shots\\FORCED-editorhome-buttons.png' });
    await browser.close();
    process.exit(0);
})().catch((e) => { console.error('HARNESS ERROR', e); process.exit(1); });
