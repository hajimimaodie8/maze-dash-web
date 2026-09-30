/* Find how the editor home page is really shown: list the tab bar's items with their boxes, click the
   custom one for real, and report whether customLevelsView becomes active. Screenshot name states
   exactly what is expected: the editor home with its four small buttons. */
const puppeteer = require('puppeteer-core');
const CHROME = 'C:\\Users\\Lenovo\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe';
const FILE = 'file:///E:/maze_dash/dist/MazeDash-standalone.html';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
    const browser = await puppeteer.launch({
        executablePath: CHROME, headless: 'new',
        userDataDir: 'E:\\maze_dash\\_work\\test\\chrome-profile-tab',
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
    const tap = async (x, y, s) => { await page.mouse.move(x, y); await page.mouse.down(); await sleep(70); await page.mouse.up(); await sleep(s || 900); };
    for (let i = 0; i < 90; i++) { if ((await scene()) === 'HallScene') { break; } if (i % 3 === 1) { await tap(720, 400, 500); } else { await sleep(400); } }
    await sleep(3200);

    /* list the tab bar's items and their boxes + the editor home's state */
    const info = await page.evaluate(() => {
        const find = (name) => { let h = null; (function w(n) { if (h) { return; } if (n.name === name) { h = n; return; } (n.children || []).forEach(w); })(cc.director.getScene()); return h; };
        const vs = cc.view.getVisibleSize(), rect = cc.game.canvas.getBoundingClientRect();
        const sx = vs.width / rect.width, sy = vs.height / rect.height;
        const tp = (w) => ({ x: rect.left + w.x / sx, y: rect.top + rect.height - w.y / sy });
        const bar = window.hallScene && window.hallScene.tabBar;
        const items = [];
        if (bar) {
            (function w(n, d) {
                if (d > 3) { return; }
                const sp = n.getComponent && n.getComponent(cc.Sprite);
                if (sp && n.activeInHierarchy && n.width > 40 && n.height > 40) {
                    const p = n.convertToWorldSpaceAR(cc.v2(0, 0));
                    items.push({ name: n.name, depth: d, w: Math.round(n.width), h: Math.round(n.height), page: tp(p) });
                }
                (n.children || []).forEach((c) => w(c, d + 1));
            })(bar, 0);
        }
        const t = find('editorTitle'), home = t && t.parent;
        return { barItems: items.slice(0, 12), homeActive: !!(home && home.activeInHierarchy), homeOpacity: home ? home.opacity : null, homeWorld: home ? (function () { const p = home.convertToWorldSpaceAR(cc.v2(0, 0)); return { x: Math.round(p.x), y: Math.round(p.y) }; })() : null };
    });
    console.log('TABBAR=' + JSON.stringify(info.barItems));
    console.log('HOME_STATE=' + JSON.stringify({ active: info.homeActive, opacity: info.homeOpacity, world: info.homeWorld }));

    /* click the last tab item (the custom/editor one is the right-most added item) */
    if (info.barItems.length) {
        const cand = info.barItems.filter((i) => /custom|wrench|bar/i.test(i.name));
        const target = cand.length ? cand[cand.length - 1] : info.barItems[info.barItems.length - 1];
        await tap(target.page.x, target.page.y, 1400);
        console.log('CLICKED=' + JSON.stringify(target));
    }
    const after = await page.evaluate(() => {
        const find = (name) => { let h = null; (function w(n) { if (h) { return; } if (n.name === name) { h = n; return; } (n.children || []).forEach(w); })(cc.director.getScene()); return h; };
        const t = find('editorTitle'), home = t && t.parent;
        const out = { homeActive: !!(home && home.activeInHierarchy), homeOpacity: home ? home.opacity : null, buttons: {} };
        ['previewWorld', 'previewLevel', 'exportJson', 'importJson'].forEach((sid) => {
            const n = find('editorSmall_' + sid);
            if (!n) { out.buttons[sid] = 'MISSING'; return; }
            out.buttons[sid] = { active: n.activeInHierarchy, opacity: n.opacity, x: Math.round(n.convertToWorldSpaceAR(cc.v2(0, 0)).x) };
        });
        return out;
    });
    console.log('AFTER_CLICK=' + JSON.stringify(after));
    console.log('ERRS=' + JSON.stringify(errs.slice(0, 3)));
    await page.screenshot({ path: 'E:\\maze_dash\\_work\\test\\shots\\editorhome-with-buttons.png' });
    await browser.close();
    process.exit(0);
})().catch((e) => { console.error('HARNESS ERROR', e); process.exit(1); });
