/* Is the build tag really on screen? Boot the packaged build, open the grid editor and the editor
   home, and report the tag's node state plus its world position against the visible rect. */
const puppeteer = require('puppeteer-core');
const CHROME = 'C:\\Users\\Lenovo\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe';
const DIST = 'file:///E:/maze_dash/dist/MazeDash-standalone.html';
const ARGS = ['--no-sandbox', '--disable-extensions', '--no-first-run', '--mute-audio',
    '--allow-file-access-from-files', '--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader'];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const TAG_INFO = () => {
    const out = [];
    (function walk(n) {
        const lb = n.getComponent && n.getComponent(cc.Label);
        if (lb && /build\s/i.test(String(lb.string))) {
            const w = n.convertToWorldSpaceAR(cc.v2(0, 0));
            const vs = cc.view.getVisibleSize();
            out.push({ name: n.name, text: String(lb.string), size: lb.fontSize, active: n.activeInHierarchy,
                colour: [lb.node.color.r, lb.node.color.g, lb.node.color.b, lb.node.color.a],
                world: [Math.round(w.x), Math.round(w.y)], inside: Math.abs(w.x) <= vs.width / 2 && Math.abs(w.y) <= vs.height / 2,
                parent: n.parent ? n.parent.name : null, z: n.zIndex });
        }
        (n.children || []).forEach(walk);
    })(cc.director.getScene());
    return { tags: out, vs: [cc.view.getVisibleSize().width, cc.view.getVisibleSize().height] };
};

(async () => {
    const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', userDataDir: 'E:\\maze_dash\\_work\\test\\chrome-profile-tag', protocolTimeout: 240000, args: ARGS, defaultViewport: { width: 1440, height: 810 } });
    const page = await browser.newPage();
    const errs = []; page.on('pageerror', (e) => errs.push(String(e.message).slice(0, 120)));
    await page.goto(DIST, { waitUntil: 'domcontentloaded', timeout: 120000 });
    await page.waitForFunction('window.cc && cc.game && cc.game._prepared === true', { timeout: 120000, polling: 150 });
    for (let i = 0; i < 80; i++) { const s = await page.evaluate(() => cc.director.getScene() && cc.director.getScene().name); if (s === 'HallScene') break; await page.mouse.click(720, 400); await sleep(500); }
    await sleep(2500);

    /* grid editor */
    await page.evaluate(() => { window.MazeDashCustomTab.openGridEditor(); });
    await sleep(1800);
    const grid = await page.evaluate(TAG_INFO);
    await page.screenshot({ path: 'E:\\maze_dash\\docs\\screenshots\\104-buildtag-grid.png' });

    /* editor home */
    await page.evaluate(() => { try { const n = cc.find('Canvas/gridEditor'); if (n) { n.removeFromParent(); n.destroy(); } } catch (e) {} });
    await sleep(600);
    await page.evaluate(() => { gamemain.showTabBarViewIndex = 5; window.hallScene.showBarView(); });
    await sleep(2500);
    const home = await page.evaluate(TAG_INFO);
    await page.screenshot({ path: 'E:\\maze_dash\\docs\\screenshots\\105-buildtag-home.png' });

    console.log('GRIDTAG=' + JSON.stringify(grid));
    console.log('HOMETAG=' + JSON.stringify(home));
    console.log('ERRS=' + JSON.stringify(errs.slice(0, 3)));
    await browser.close(); process.exit(0);
})().catch((e) => { console.error('HARNESS ERROR', e && e.message); process.exit(1); });
