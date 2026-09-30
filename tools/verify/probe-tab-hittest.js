/* Who eats the click on the custom tab? Hit-test evidence: enumerate every node whose world box
   contains the tab item's centre AND that has a touch listener, sorted so the topmost consumer is
   first (zIndex then sibling order). Then click and report customLevelsView.active/currentIndex.
   No file edits, no guessing. */
const puppeteer = require('puppeteer-core');
const CHROME = 'C:\\Users\\Lenovo\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe';
const FILE = 'file:///E:/maze_dash/dist/MazeDash-standalone.html';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
    const browser = await puppeteer.launch({
        executablePath: CHROME, headless: 'new',
        userDataDir: 'E:\\maze_dash\\_work\\test\\chrome-profile-hittest',
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
    for (let i = 0; i < 90; i++) { if ((await scene()) === 'HallScene') { break; } if (i % 3 === 1) { await tap(720, 400, 500); } else { await sleep(400); } }
    await sleep(3600);

    const ev = await page.evaluate(() => {
        const vs = cc.view.getVisibleSize();
        const find = (name) => { let h = null; (function w(n) { if (h) { return; } if (n.name === name) { h = n; return; } (n.children || []).forEach(w); })(cc.director.getScene()); return h; };
        const tab = find('customBar');
        if (!tab) { return { error: 'no customBar' }; }
        const p = tab.convertToWorldSpaceAR(cc.v2(0, 0));
        const point = { x: p.x, y: p.y };
        const hits = [];
        const order = [];
        (function w(n) {
            order.push(n);
            if (!n.activeInHierarchy) { return; }
            let hasTouch = false;
            [cc.Node.EventType.TOUCH_START, cc.Node.EventType.TOUCH_END, cc.Node.EventType.TOUCH_MOVE].forEach((t) => { try { if (n.hasEventListener(t)) { hasTouch = true; } } catch (e) {} });
            const b = n.getBoundingBoxToWorld ? n.getBoundingBoxToWorld() : null;
            if (hasTouch && b && point.x >= b.x && point.x <= b.x + b.width && point.y >= b.y && point.y <= b.y + b.height) {
                const chain = [];
                let q = n;
                while (q) { chain.push(q.name + ':z' + q.zIndex); q = q.parent; }
                hits.push({ name: n.name, size: [Math.round(n.width), Math.round(n.height)], z: n.zIndex, depth: order.length, chain: chain.slice(0, 5).join(' < ') });
            }
            (n.children || []).forEach(w);
        })(cc.director.getScene());
        return { point: { x: Math.round(point.x), y: Math.round(point.y) }, vs: { w: Math.round(vs.width), h: Math.round(vs.height) }, hits: hits.slice(0, 14), barWidgetOff: (window.MazeDashCustomTab.stats || {}).barWidgetOff };
    });
    console.log('HITTEST=' + JSON.stringify(ev));
    if (ev && ev.point) {
        const rect = await page.evaluate(() => { const r = cc.game.canvas.getBoundingClientRect(); const vs = cc.view.getVisibleSize(); return { w: r.width, h: r.height, l: r.left, t: r.top, sw: vs.width, sh: vs.height }; });
        const sx = rect.sw / rect.w, sy = rect.sh / rect.h;
        const px = rect.l + ev.point.x / sx, py = rect.t + rect.h - ev.point.y / sy;
        await tap(px, py, 1600);
        const after = await page.evaluate(() => {
            const find = (name) => { let h = null; (function w(n) { if (h) { return; } if (n.name === name) { h = n; return; } (n.children || []).forEach(w); })(cc.director.getScene()); return h; };
            const home = find('customLevelsView');
            return { homeActive: !!(home && home.activeInHierarchy), homeOpacity: home ? home.opacity : null, currentIndex: String(window.hallScene.currentIndex) };
        });
        console.log('CLICKED_AT=' + JSON.stringify({ px: Math.round(px), py: Math.round(py) }) + ' => ' + JSON.stringify(after));
    }
    console.log('ERRS=' + JSON.stringify(errs.slice(0, 3)));
    await page.screenshot({ path: 'E:\\maze_dash\\_work\\test\\shots\\hittest-tab.png' });
    await browser.close();
    process.exit(0);
})().catch((e) => { console.error('HARNESS ERROR', e); process.exit(1); });
