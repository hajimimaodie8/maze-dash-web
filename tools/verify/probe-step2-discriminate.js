/* Is the left big button's "offscreen" report a real defect or a sampling artifact?
   Activates the editor home through the internal page switch, then samples the button's world box
   (a) twice in the SAME frame right after the switch, (b) 50ms later, (c) 200ms later - and prints the
   write/verify counters so we can see whether the 1.5s tick and the switch path fight. */
const puppeteer = require('puppeteer-core');
const CHROME = 'C:\\Users\\Lenovo\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe';
const FILE = 'file:///E:/maze_dash/dist/MazeDash-standalone.html';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const PROBE = function () {
    const find = (nm) => { let h = null; (function w(n) { if (h) { return; } if (n.name === nm) { h = n; return; } (n.children || []).forEach(w); })(cc.director.getScene()); return h; };
    const vs = cc.view.getVisibleSize();
    const out = { vs: { w: Math.round(vs.width), h: Math.round(vs.height) }, nodes: {} };
    ['editorBtn_createWorld', 'editorBtn_createLevel', 'editorSmall_previewWorld', 'editorSmall_importJson'].forEach((nm) => {
        const n = find(nm);
        if (!n) { out.nodes[nm] = 'MISSING'; return; }
        const p = n.convertToWorldSpaceAR(cc.v2(0, 0));
        out.nodes[nm] = {
            wx: Math.round(p.x), wy: Math.round(p.y), w: Math.round(n.width), h: Math.round(n.height),
            active: n.activeInHierarchy,
            inside: (p.x - n.width / 2 >= -2 && p.x + n.width / 2 <= vs.width + 2 && p.y - n.height / 2 >= -2 && p.y + n.height / 2 <= vs.height + 2)
        };
    });
    const s = window.MazeDashCustomTab.stats || {};
    out.stats = { byTimer: s.editorBigBtnByTimer, timerOff: s.editorBigBtnTimerOff, shifted: s.editorBigBtnShifted, stillOff: s.editorBigBtnStillOff, relayouts: s.editorHomeRelayouts };
    return out;
};
(async () => {
    const browser = await puppeteer.launch({
        executablePath: CHROME, headless: 'new',
        userDataDir: 'E:\\maze_dash\\_work\\test\\chrome-profile-artifact',
        protocolTimeout: 240000,
        args: ['--no-sandbox', '--disable-extensions', '--no-first-run', '--mute-audio',
            '--allow-file-access-from-files', '--enable-unsafe-swiftshader', '--use-gl=angle',
            '--use-angle=swiftshader', '--autoplay-policy=no-user-gesture-required'],
        defaultViewport: { width: 1440, height: 810 }
    });
    const page = await browser.newPage();
    const errs = [];
    page.on('pageerror', (e) => errs.push(String(e.message).slice(0, 130)));
    const tap = async (x, y, s) => { await page.mouse.move(x, y); await page.mouse.down(); await sleep(80); await page.mouse.up(); await sleep(s || 900); };
    const pageOf = (nm) => page.evaluate((n) => {
        const find = (x) => { let h = null; (function w(k) { if (h) { return; } if (k.name === x) { h = k; return; } (k.children || []).forEach(w); })(cc.director.getScene()); return h; };
        const nd = find(n);
        if (!nd) { return null; }
        const p = nd.convertToWorldSpaceAR(cc.v2(0, 0));
        const vs = cc.view.getVisibleSize(), rect = cc.game.canvas.getBoundingClientRect();
        const sx = vs.width / rect.width, sy = vs.height / rect.height;
        return { x: rect.left + p.x / sx, y: rect.top + rect.height - p.y / sy, active: nd.activeInHierarchy };
    }, nm);
    await page.goto(FILE, { waitUntil: 'domcontentloaded', timeout: 120000 });
    await page.waitForFunction('window.cc && cc.game && cc.game._prepared === true', { timeout: 120000, polling: 150 });
    const scene = () => page.evaluate(() => (cc.director.getScene() ? cc.director.getScene().name : null));
    for (let i = 0; i < 90; i++) { if ((await scene()) === 'HallScene') { break; } if (i % 3 === 1) { await tap(720, 400, 500); } else { await sleep(400); } }
    await sleep(3200);
    /* activate the home through the game's own switch */
    await page.evaluate(() => { gamemain.showTabBarViewIndex = 5; window.hallScene.showBarView(); });
    await sleep(1200);
    console.log('A_HOME_ACTIVATED=' + JSON.stringify(await page.evaluate(PROBE)));
    /* open the grid with a real click, then come back with the real back button */
    const lvl = await pageOf('editorBtn_createLevel');
    if (lvl && lvl.active) { await tap(lvl.x, lvl.y, 1500); }
    const back = await pageOf('gridBack');
    if (back) { await tap(back.x, back.y, 900); }
    /* (a) same frame twice, immediately */
    console.log('B_BACK_IMMEDIATE_1=' + JSON.stringify(await page.evaluate(PROBE)));
    console.log('B_BACK_IMMEDIATE_2=' + JSON.stringify(await page.evaluate(PROBE)));
    await sleep(50);
    console.log('C_AFTER_50MS=' + JSON.stringify(await page.evaluate(PROBE)));
    await sleep(200);
    console.log('D_AFTER_250MS=' + JSON.stringify(await page.evaluate(PROBE)));
    await page.screenshot({ path: 'E:\\maze_dash\\_work\\test\\shots\\93-step2-discriminate.png' });
    console.log('ERRS=' + JSON.stringify(errs.slice(0, 3)));
    await browser.close();
    process.exit(0);
})().catch((e) => { console.error('HARNESS ERROR', e); process.exit(1); });
