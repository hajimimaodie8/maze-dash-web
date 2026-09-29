const path = require('path');
const puppeteer = require('puppeteer-core');
const CHROME = 'C:\\Users\\Lenovo\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe';
const FILE = 'file:///E:/maze_dash/dist/MazeDash-standalone.html';
const SHOTS = 'E:\\maze_dash\\docs\\screenshots\\';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
    const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new',
        userDataDir: 'E:\\maze_dash\\_work\\test\\chrome-profile-solve', protocolTimeout: 180000,
        args: ['--no-sandbox','--disable-extensions','--no-first-run','--mute-audio','--allow-file-access-from-files','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader','--autoplay-policy=no-user-gesture-required'],
        defaultViewport: { width: 1440, height: 810 } });
    const page = await browser.newPage();
    const errs = []; page.on('pageerror', (e) => errs.push(String(e.message).slice(0, 120)));
    await page.goto(FILE, { waitUntil: 'domcontentloaded', timeout: 120000 });
    await page.waitForFunction('window.cc && cc.game && cc.game._prepared === true', { timeout: 120000, polling: 150 });
    const scene = () => page.evaluate(() => (cc.director.getScene() ? cc.director.getScene().name : null));
    async function tap(x, y, s) { await page.mouse.move(x, y); await page.mouse.down(); await sleep(70); await page.mouse.up(); await sleep(s || 900); }
    for (let i = 0; i < 90; i++) { if ((await scene()) === 'HallScene') { break; } if (i % 3 === 1) { await tap(720, 400, 500); } else { await sleep(400); } }
    await sleep(3500);
    await page.evaluate(() => { gamemain.showTabBarViewIndex = 5; window.hallScene.showBarView(); });
    await sleep(1200);
    await page.evaluate(() => { window.hallScene.viewGroup[5].getChildByName('editorBtn_createLevel').emit(cc.Node.EventType.TOUCH_END); });
    await sleep(2000);
    // case 1: a 3x3 all-floor box with one hero -> must be solvable
    const ok = await page.evaluate(() => {
        const ed = window.MazeDashCustomTab.gridEditor;
        ed.clear();
        ed.setTool('floor');
        for (let y = 8; y <= 10; y++) { for (let x = 8; x <= 10; x++) { ed.paint(x, y); } }
        ed.setTool('hero'); ed.paint(8, 8);
        const v = ed.solve();
        return { state: v.state, moves: v.moves, nodes: v.nodes, reason: v.reason };
    });
    console.log('CASE 1 (3x3 box + hero):', JSON.stringify(ok));
    await page.screenshot({ path: SHOTS + '54-editor-solvable.png' });
    // case 2: two disconnected 2x2 blocks -> must be unsolvable
    const bad = await page.evaluate(() => {
        const ed = window.MazeDashCustomTab.gridEditor;
        ed.clear();
        ed.setTool('floor');
        [[2,2],[2,3],[3,2],[3,3]].forEach((p) => ed.paint(p[0], p[1]));
        ed.setTool('hero'); ed.paint(2, 2);
        [[12,12],[12,13],[13,12],[13,13]].forEach((p) => ed.paint(p[0], p[1]));
        const v = ed.solve();
        return { state: v.state, reason: v.reason };
    });
    console.log('CASE 2 (two disconnected blocks):', JSON.stringify(bad));
    await page.screenshot({ path: SHOTS + '55-editor-unsolvable.png' });
    // the save must be refused once, then allowed on the second tap
    const gate = await page.evaluate(() => {
        const ed = window.MazeDashCustomTab.gridEditor;
        const first = ed.save();
        const afterFirst = { solvableOnSave: window.MazeDashCustomTab.stats.editorSolvableOnSave, forced: window.MazeDashCustomTab.stats.editorForceSave };
        return { firstReturn: first, afterFirst };
    });
    console.log('SAVE GATE first tap:', JSON.stringify(gate));
    console.log('errors:', JSON.stringify(errs.slice(0, 3)));
    await browser.close(); process.exit(0);
})().catch((e) => { console.error('HARNESS ERROR', e); process.exit(1); });
