/* Are the four small editor-home buttons (previewWorld/previewLevel/exportJson/importJson) actually
   built, active and on screen? The layout audit classifies fully-off-screen nodes as "offpage"
   (that is how the OTHER pager pages live), so a missing/off-screen button row was not reported. */
const puppeteer = require('puppeteer-core');
const CHROME = 'C:\\Users\\Lenovo\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe';
const FILE = 'file:///E:/maze_dash/dist/MazeDash-standalone.html';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
    const browser = await puppeteer.launch({
        executablePath: CHROME, headless: 'new',
        userDataDir: 'E:\\maze_dash\\_work\\test\\chrome-profile-homebtn',
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
    /* give the deferred relayout (800ms + frames) plenty of time */
    await sleep(2500);
    const res = await page.evaluate(() => {
        const vs = cc.view.getVisibleSize();
        const out = { vs: { w: Math.round(vs.width), h: Math.round(vs.height) }, buttons: {}, home: null };
        let home = null;
        (function w(n) { if (home) { return; } if (n.name === 'editorTitle') { home = n.parent; } (n.children || []).forEach(w); })(cc.director.getScene());
        if (home) {
            const hw = home.convertToWorldSpaceAR(cc.v2(0, 0));
            out.home = { name: home.name, x: Math.round(hw.x), y: Math.round(hw.y), active: home.activeInHierarchy, children: (home.children || []).map((c) => c.name) };
        }
        ['previewWorld', 'previewLevel', 'exportJson', 'importJson'].forEach((sid) => {
            let n = null;
            (function w(k) { if (n) { return; } if (k.name === 'editorSmall_' + sid) { n = k; } (k.children || []).forEach(w); })(cc.director.getScene());
            if (!n) { out.buttons[sid] = 'MISSING'; return; }
            const p = n.convertToWorldSpaceAR(cc.v2(0, 0));
            const l = n.getChildByName('editorSmallLabel_' + sid);
            const lc = l && l.getComponent(cc.Label);
            out.buttons[sid] = {
                x: Math.round(p.x), y: Math.round(p.y), w: n.width, h: n.height, active: n.activeInHierarchy,
                inside: (p.x - n.width / 2 >= -2 && p.x + n.width / 2 <= vs.width + 2 && p.y - n.height / 2 >= -2 && p.y + n.height / 2 <= vs.height + 2),
                label: lc ? lc.string : null
            };
        });
        return out;
    });
    console.log('HOME=' + JSON.stringify(res.home));
    console.log('BUTTONS=' + JSON.stringify(res.buttons));
    console.log('ERRS=' + JSON.stringify(errs.slice(0, 3)));
    await page.screenshot({ path: 'E:\\maze_dash\\_work\\test\\shots\\home-buttons.png' });
    await browser.close();
    process.exit(0);
})().catch((e) => { console.error('HARNESS ERROR', e); process.exit(1); });
