/* Last activation attempt: the tab items only registered `touchstart`, the tab bar itself has just a
   cc.Layout, so the selection logic lives elsewhere. Print each tab item's components (with any
   target/handler fields), print hall's own index-like fields, click the custom item's ICON child, and
   as a labelled fallback set the hall's own index field and re-run showBarView(). */
const puppeteer = require('puppeteer-core');
const CHROME = 'C:\\Users\\Lenovo\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe';
const FILE = 'file:///E:/maze_dash/dist/MazeDash-standalone.html';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
    const browser = await puppeteer.launch({
        executablePath: CHROME, headless: 'new',
        userDataDir: 'E:\\maze_dash\\_work\\test\\chrome-profile-act2',
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
    const tap = async (x, y, s) => { await page.mouse.move(x, y); await page.mouse.down(); await sleep(80); await page.mouse.up(); await sleep(s || 1400); };
    for (let i = 0; i < 90; i++) { if ((await scene()) === 'HallScene') { break; } if (i % 3 === 1) { await tap(720, 400, 500); } else { await sleep(400); } }
    await sleep(3200);

    const info = await page.evaluate(() => {
        const hall = window.hallScene;
        const bar = hall && hall.tabBar;
        const out = { items: [], hallFields: {}, iconClick: null };
        /* hall's own index-like fields */
        Object.keys(hall || {}).forEach((k) => { if (/index|tab|bar|view|page|select/i.test(k) && typeof hall[k] !== 'function') { const v = hall[k]; out.hallFields[k] = (v && typeof v === 'object') ? (Array.isArray(v) ? 'array(' + v.length + ')' : 'object') : String(v).slice(0, 30); } });
        const vs = cc.view.getVisibleSize(), rect = cc.game.canvas.getBoundingClientRect();
        const sx = vs.width / rect.width, sy = vs.height / rect.height;
        const tp = (n) => { const p = n.convertToWorldSpaceAR(cc.v2(0, 0)); return { x: rect.left + p.x / sx, y: rect.top + rect.height - p.y / sy }; };
        (bar ? bar.children : []).forEach((c) => {
            const comps = (c._components || []).map((k) => {
                const base = k && k.__classname__ ? k.__classname__ : 'anon';
                const extra = [];
                ['target', 'handler', 'component', 'clickEvents', 'm_target'].forEach((f) => { try { if (k[f] !== undefined) { extra.push(f + '=' + (typeof k[f] === 'object' ? 'obj' : String(k[f]).slice(0, 20))); } } catch (e) {} });
                return base + (extra.length ? '(' + extra.join(',') + ')' : '');
            });
            const icon = c.getChildByName('icon');
            out.items.push({ name: c.name, active: c.activeInHierarchy, comps: comps, icon: icon ? { page: tp(icon), w: icon.width, h: icon.height } : null, parentPage: tp(c) });
        });
        const custom = (bar ? bar.children : []).filter((c) => c.name === 'customBar')[0];
        if (custom) {
            const target = custom.getChildByName('icon') || custom;
            out.iconClick = tp(target);
        }
        return out;
    });
    console.log('HALLFIELDS=' + JSON.stringify(info.hallFields));
    console.log('ITEMS=' + JSON.stringify(info.items));
    console.log('ICON_CLICK=' + JSON.stringify(info.iconClick));

    if (info.iconClick) {
        await tap(info.iconClick.x, info.iconClick.y, 1600);
        const after = await page.evaluate(() => {
            const find = (name) => { let h = null; (function w(n) { if (h) { return; } if (n.name === name) { h = n; return; } (n.children || []).forEach(w); })(cc.director.getScene()); return h; };
            const t = find('editorTitle'), home = t && t.parent;
            const hall = window.hallScene;
            const vg = hall && hall.viewGroup ? hall.viewGroup.map((v) => v && v.name + ':' + (v.activeInHierarchy ? 'on' : 'off')) : null;
            return { homeActive: !!(home && home.activeInHierarchy), homeOpacity: home ? home.opacity : null, views: vg };
        });
        console.log('AFTER_ICON_CLICK=' + JSON.stringify(after));
    }
    console.log('ERRS=' + JSON.stringify(errs.slice(0, 3)));
    await page.screenshot({ path: 'E:\\maze_dash\\_work\\test\\shots\\activate-icon-attempt.png' });
    await browser.close();
    process.exit(0);
})().catch((e) => { console.error('HARNESS ERROR', e); process.exit(1); });
