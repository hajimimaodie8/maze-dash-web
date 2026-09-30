/* Evidence for "the four editor-home buttons are not visible in the render".
   Prints, for each editorSmall_*: name, world box, activeInHierarchy, opacity, zIndex, parent chain,
   and the sibling z-order plus any opaque sibling that covers its box. Also switches the hall to the
   page that holds the editor home first (via the hall's own showBarView, not a test hack) so the
   measurement happens while that page is the visible one. */
const puppeteer = require('puppeteer-core');
const CHROME = 'C:\\Users\\Lenovo\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe';
const FILE = 'file:///E:/maze_dash/dist/MazeDash-standalone.html';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const PROBE = function () {
    const vs = cc.view.getVisibleSize();
    const find = (name) => { let h = null; (function w(n) { if (h) { return; } if (n.name === name) { h = n; return; } (n.children || []).forEach(w); })(cc.director.getScene()); return h; };
    const W = (n) => n.convertToWorldSpaceAR(cc.v2(0, 0));
    const home = find('editorTitle') ? find('editorTitle').parent : null;
    const out = { vs: { w: Math.round(vs.width), h: Math.round(vs.height) }, home: null, buttons: {}, cover: [] };
    if (home) {
        const hw = W(home);
        const chain = [];
        let p = home;
        while (p) { chain.push(p.name + (p.activeInHierarchy ? '' : '(INACTIVE)')); p = p.parent; }
        out.home = { name: home.name, world: { x: Math.round(hw.x), y: Math.round(hw.y) }, size: [home.width, home.height], active: home.activeInHierarchy, opacity: home.opacity, zIndex: home.zIndex, chain: chain };
    }
    ['previewWorld', 'previewLevel', 'exportJson', 'importJson'].forEach((sid) => {
        const n = find('editorSmall_' + sid);
        if (!n) { out.buttons[sid] = 'MISSING'; return; }
        const p = W(n), l = n.getChildByName('editorSmallLabel_' + sid), lc = l && l.getComponent(cc.Label);
        const chain = [];
        let q = n;
        while (q) { chain.push(q.name + (q.activeInHierarchy ? '' : '(INACTIVE)') + ':op' + q.opacity); q = q.parent; }
        out.buttons[sid] = {
            world: { x: Math.round(p.x), y: Math.round(p.y) }, size: [n.width, n.height],
            active: n.activeInHierarchy, opacity: n.opacity, zIndex: n.zIndex,
            label: lc ? lc.string : null, labelActive: !!(l && l.activeInHierarchy),
            panel: !!n.getChildByName('editorSmallPanel'), chain: chain
        };
    });
    /* what could cover them: every active sibling (and its descendants) with a Sprite whose world box
       overlaps the row's band, ordered by zIndex */
    if (home && home.parent) {
        const box = { x0: 1e9, x1: -1e9, y0: 1e9, y1: -1e9 };
        ['previewWorld', 'previewLevel', 'exportJson', 'importJson'].forEach((sid) => {
            const n = find('editorSmall_' + sid);
            if (!n) { return; }
            const p = W(n);
            box.x0 = Math.min(box.x0, p.x - n.width / 2); box.x1 = Math.max(box.x1, p.x + n.width / 2);
            box.y0 = Math.min(box.y0, p.y - n.height / 2); box.y1 = Math.max(box.y1, p.y + n.height / 2);
        });
        out.rowBox = { x0: Math.round(box.x0), x1: Math.round(box.x1), y0: Math.round(box.y0), y1: Math.round(box.y1) };
        const root = cc.director.getScene();
        (function walk(n, z) {
            if (!n || !n.activeInHierarchy) { return; }
            const sp = n.getComponent && n.getComponent(cc.Sprite);
            if (sp && sp.spriteFrame && n.width > 30 && n.height > 30 && n !== home) {
                const p = W(n);
                const b = { x0: p.x - n.width / 2, x1: p.x + n.width / 2, y0: p.y - n.height / 2, y1: p.y + n.height / 2 };
                if (!(b.x1 < box.x0 || b.x0 > box.x1 || b.y1 < box.y0 || b.y0 > box.y1)) {
                    out.cover.push({ name: n.name, z: n.zIndex, opacity: n.opacity, box: { x0: Math.round(b.x0), x1: Math.round(b.x1), y0: Math.round(b.y0), y1: Math.round(b.y1) } });
                }
            }
            (n.children || []).forEach((c) => walk(c, z + 1));
        })(root, 0);
        out.cover.sort((a, b2) => b2.z - a.z);
    }
    return out;
};

(async () => {
    const browser = await puppeteer.launch({
        executablePath: CHROME, headless: 'new',
        userDataDir: 'E:\\maze_dash\\_work\\test\\chrome-profile-btnvis',
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
    await sleep(3000);

    /* switch to the page that holds the editor home, using the hall's own API */
    const switched = await page.evaluate(() => {
        const hall = window.hallScene;
        const find = (name) => { let h = null; (function w(n) { if (h) { return; } if (n.name === name) { h = n; return; } (n.children || []).forEach(w); })(cc.director.getScene()); return h; };
        const log = [];
        if (hall && typeof hall.showBarView === 'function') {
            for (let i = 0; i <= 8; i++) { try { hall.showBarView(i); } catch (e) { log.push('showBarView(' + i + ') threw ' + e.message); } }
        } else { log.push('hall.showBarView unavailable'); }
        const t = find('editorTitle');
        const home = t && t.parent;
        log.push('after showBarView 0..8: home active=' + !!(home && home.activeInHierarchy));
        return { log: log, viewGroup: hall && hall.viewGroup ? hall.viewGroup.length : null };
    });
    await sleep(1500);
    console.log('SWITCH=' + JSON.stringify(switched));
    const ev = await page.evaluate(PROBE);
    console.log('EVIDENCE=' + JSON.stringify(ev));
    console.log('ERRS=' + JSON.stringify(errs.slice(0, 3)));
    await page.screenshot({ path: 'E:\\maze_dash\\_work\\test\\shots\\btn-visibility.png' });
    await browser.close();
    process.exit(0);
})().catch((e) => { console.error('HARNESS ERROR', e); process.exit(1); });
