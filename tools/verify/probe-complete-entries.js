/* Completion-screen entries in a CUSTOM level: showComplete(), then click ONE real button per fresh
   page load and report page errors, the scene it lands on, and whether it routed to the editor. */
const puppeteer = require('puppeteer-core');
const CHROME = 'C:\\Users\\Lenovo\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe';
const DIST = 'file:///E:/maze_dash/dist/MazeDash-standalone.html';
const ARGS = ['--no-sandbox', '--disable-extensions', '--no-first-run', '--mute-audio',
    '--allow-file-access-from-files', '--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader'];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const BUTTONS = ['btn_restart', 'btn_menu'];

async function once(browser, btn) {
    const page = await browser.newPage();
    const errs = []; page.on('pageerror', (e) => errs.push(String(e.message).slice(0, 110)));
    await page.goto(DIST, { waitUntil: 'domcontentloaded', timeout: 120000 });
    await page.waitForFunction('window.cc && cc.game && cc.game._prepared === true', { timeout: 120000, polling: 150 });
    for (let i = 0; i < 80; i++) { const s = await page.evaluate(() => cc.director.getScene() && cc.director.getScene().name); if (s === 'HallScene') break; await page.mouse.click(720, 400); await sleep(500); }
    await sleep(2000);
    await page.evaluate(() => { gamemain.enterEnterGameScene(10101); });
    for (let i = 0; i < 40; i++) { const s = await page.evaluate(() => cc.director.getScene() && cc.director.getScene().name); if (s === 'gameScene') break; await sleep(300); }
    await sleep(2200);
    await page.evaluate(() => { const c = cc.find('Canvas').getComponent('gameScene'); if (c && c.showComplete) { c.showComplete(); } });
    await sleep(2200);
    /* these two were inactive at first sample: poll until the button is really active */
    let pt = null;
    for (let k = 0; k < 24 && !pt; k++) { pt = await page.evaluate((name) => {
        let n = null; (function walk(x) { if (x.name === name) { n = x; } (x.children || []).forEach(walk); })(cc.director.getScene());
        if (!n || !n.activeInHierarchy) { return null; }
        const w = n.convertToWorldSpaceAR(cc.v2(0, 0)); const r = cc.game.canvas.getBoundingClientRect(); const vs = cc.view.getVisibleSize();
        return { x: r.left + w.x * (r.width / vs.width), y: r.top + (vs.height - w.y) * (r.height / vs.height) };
    }, btn); if (!pt) { await sleep(250); } }
    if (pt) { await page.mouse.move(pt.x, pt.y); await sleep(60); await page.mouse.down(); await sleep(60); await page.mouse.up(); }
    await sleep(2500);
    const after = await page.evaluate(() => {
        const sc = cc.director.getScene();
        const home = window.hallScene && window.hallScene.viewGroup ? window.hallScene.viewGroup[5] : null;
        return { scene: sc ? sc.name : null, editorVisible: !!(home && home.activeInHierarchy), idx: window.hallScene ? window.hallScene.currentIndex : null };
    });
    await page.screenshot({ path: 'E:\\maze_dash\\docs\\screenshots\\108-entry-' + btn + '.png' });
    await page.close();
    return { btn, clicked: !!pt, after, errs: errs.slice(0, 3) };
}

(async () => {
    const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', userDataDir: 'E:\\maze_dash\\_work\\test\\chrome-profile-entries', protocolTimeout: 300000, args: ARGS, defaultViewport: { width: 1440, height: 810 } });
    const out = [];
    for (const b of BUTTONS) { out.push(await once(browser, b)); }
    console.log('ENTRIES=' + JSON.stringify(out));
    await browser.close(); process.exit(0);
})().catch((e) => { console.error('HARNESS ERROR', e && e.message); process.exit(1); });
