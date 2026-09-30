/* Why does clicking the custom tab not show the editor home? Evidence first, then the real click.
   Prints: the hall pager's state, every viewGroup page's active/opacity/name, the tab bar's own
   component fields, the rightmost tab item (name/box/active/listeners + tab bar z-order), then clicks
   it for real and re-checks customLevelsView. Fallbacks are labelled as NOT-a-real-click. */
const puppeteer = require('puppeteer-core');
const CHROME = 'C:\\Users\\Lenovo\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe';
const FILE = 'file:///E:/maze_dash/dist/MazeDash-standalone.html';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
    const browser = await puppeteer.launch({
        executablePath: CHROME, headless: 'new',
        userDataDir: 'E:\\maze_dash\\_work\\test\\chrome-profile-activate',
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

    const ev = await page.evaluate(() => {
        const hall = window.hallScene;
        const find = (name) => { let h = null; (function w(n) { if (h) { return; } if (n.name === name) { h = n; return; } (n.children || []).forEach(w); })(cc.director.getScene()); return h; };
        const vs = cc.view.getVisibleSize(), rect = cc.game.canvas.getBoundingClientRect();
        const sx = vs.width / rect.width, sy = vs.height / rect.height;
        const tp = (n) => { const p = n.convertToWorldSpaceAR(cc.v2(0, 0)); return { x: rect.left + p.x / sx, y: rect.top + rect.height - p.y / sy }; };
        const out = { views: [], bar: null, items: [], editIndex: null };
        try { out.editIndex = window.MazeDashCustomTab && window.MazeDashCustomTab.stats ? window.MazeDashCustomTab.stats.editorIndex : null; } catch (e) {}
        if (hall && hall.viewGroup) {
            hall.viewGroup.forEach((v, i) => { if (v && v.isValid) { out.views.push({ i: i, name: v.name, active: v.active, opacity: v.opacity }); } });
        }
        const bar = hall && hall.tabBar;
        if (bar) {
            const comps = bar._components ? bar._components.map((c) => c && c.__classname__) : [];
            const fields = {};
            ['m_SelectIndex', 'm_selectIndex', 'selectIndex', 'm_curIndex', 'm_tabItems', 'm_Items'].forEach((k) => { if (bar[k] !== undefined) { fields[k] = Array.isArray(bar[k]) ? 'array(' + bar[k].length + ')' : String(bar[k]).slice(0, 40); } });
            out.bar = { name: bar.name, z: bar.zIndex, active: bar.activeInHierarchy, children: (bar.children || []).map((c) => c.name + ':z' + c.zIndex + ':' + (c.activeInHierarchy ? 'on' : 'off')), comps: comps, fields: fields };
            (bar.children || []).forEach((c, i) => {
                const list = [];
                [cc.Node.EventType.TOUCH_END, cc.Node.EventType.TOUCH_START, cc.Node.EventType.MOUSE_UP].forEach((t) => { try { if (c.hasEventListener(t)) { list.push(String(t)); } } catch (e) {} });
                out.items.push({ i: i, name: c.name, active: c.activeInHierarchy, w: Math.round(c.width), h: Math.round(c.height), page: tp(c), listeners: list });
            });
        }
        const t = find('editorTitle'), home = t && t.parent;
        out.home = home ? { name: home.name, active: home.active, opacity: home.opacity, page: tp(home) } : null;
        return out;
    });
    console.log('VIEWS=' + JSON.stringify(ev.views));
    console.log('BAR=' + JSON.stringify(ev.bar));
    console.log('ITEMS=' + JSON.stringify(ev.items));
    console.log('HOME=' + JSON.stringify(ev.home) + ' editIndex=' + ev.editIndex);

    /* real click on the LAST tab item (the custom one), at its measured box */
    if (ev.items.length) {
        const target = ev.items[ev.items.length - 1];
        await tap(target.page.x, target.page.y, 1600);
        const after = await page.evaluate(() => {
            const find = (name) => { let h = null; (function w(n) { if (h) { return; } if (n.name === name) { h = n; return; } (n.children || []).forEach(w); })(cc.director.getScene()); return h; };
            const t = find('editorTitle'), home = t && t.parent;
            const out = { homeActive: !!(home && home.activeInHierarchy), homeOpacity: home ? home.opacity : null, scene: (cc.director.getScene() || {}).name };
            ['previewWorld', 'previewLevel', 'exportJson', 'importJson'].forEach((sid) => {
                const n = find('editorSmall_' + sid);
                out[sid] = n ? { active: n.activeInHierarchy, op: n.opacity } : 'MISSING';
            });
            return out;
        });
        console.log('AFTER_REAL_CLICK=' + JSON.stringify(after));
        if (!after.homeActive) {
            /* Fallback, labelled: drive the SAME path our own code uses (hall.showBarView() with no
               argument) after asking the tab bar to select the custom index, trying the documented
               fields. This is NOT a real click. */
            const fb = await page.evaluate(() => {
                const hall = window.hallScene;
                const log = [];
                try {
                    const bar = hall && hall.tabBar;
                    if (bar) {
                        ['m_SelectIndex', 'm_selectIndex', 'selectIndex'].forEach((k) => { if (bar[k] !== undefined) { try { bar[k] = 5; log.push('set ' + k + '=5'); } catch (e) { log.push(k + ' set failed'); } } });
                        if (typeof bar.selectTab === 'function') { try { bar.selectTab(5); log.push('selectTab(5)'); } catch (e) { log.push('selectTab failed'); } }
                    }
                    try { hall.showBarView(); log.push('showBarView()'); } catch (e) { log.push('showBarView threw ' + e.message); }
                    try { hall.showBarView(5); log.push('showBarView(5)'); } catch (e) { log.push('showBarView(5) threw'); }
                } catch (e) { log.push('outer ' + e.message); }
                return log;
            });
            await sleep(1200);
            const fbState = await page.evaluate(() => {
                const find = (name) => { let h = null; (function w(n) { if (h) { return; } if (n.name === name) { h = n; return; } (n.children || []).forEach(w); })(cc.director.getScene()); return h; };
                const t = find('editorTitle'), home = t && t.parent;
                return { homeActive: !!(home && home.activeInHierarchy), homeOpacity: home ? home.opacity : null };
            });
            console.log('FALLBACK(not a real click)=' + JSON.stringify(fb) + ' => ' + JSON.stringify(fbState));
        }
    }
    console.log('ERRS=' + JSON.stringify(errs.slice(0, 3)));
    await page.screenshot({ path: 'E:\\maze_dash\\_work\\test\\shots\\activate-attempt.png' });
    await browser.close();
    process.exit(0);
})().catch((e) => { console.error('HARNESS ERROR', e); process.exit(1); });
