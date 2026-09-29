const path = require('path');
const puppeteer = require('puppeteer-core');
const CHROME = 'C:\\Users\\Lenovo\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe';
const FILE = 'file:///E:/maze_dash/dist/MazeDash-standalone.html';
const SHOTS = 'E:\\maze_dash\\docs\\screenshots\\';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
    const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new',
        userDataDir: 'E:\\maze_dash\\_work\\test\\chrome-profile-tools', protocolTimeout: 180000,
        args: ['--no-sandbox','--disable-extensions','--no-first-run','--mute-audio','--allow-file-access-from-files','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader','--autoplay-policy=no-user-gesture-required'],
        defaultViewport: { width: 1440, height: 810 } });
    const page = await browser.newPage();
    const errs = []; page.on('pageerror', (e) => errs.push(String(e.message).slice(0, 110)));
    await page.goto(FILE, { waitUntil: 'domcontentloaded', timeout: 120000 });
    await page.waitForFunction('window.cc && cc.game && cc.game._prepared === true', { timeout: 120000, polling: 150 });
    const scene = () => page.evaluate(() => (cc.director.getScene() ? cc.director.getScene().name : null));
    async function tap(x, y, s) { await page.mouse.move(x, y); await page.mouse.down(); await sleep(70); await page.mouse.up(); await sleep(s || 900); }
    for (let i = 0; i < 90; i++) { if ((await scene()) === 'HallScene') { break; } if (i % 3 === 1) { await tap(720, 400, 500); } else { await sleep(400); } }
    await sleep(3500);
    // open the editor through its own button
    await page.evaluate(() => { gamemain.showTabBarViewIndex = 5; window.hallScene.showBarView(); });
    await sleep(1200);
    await page.evaluate(() => { window.hallScene.viewGroup[5].getChildByName('editorBtn_createLevel').emit(cc.Node.EventType.TOUCH_END); });
    await sleep(2000);
    const opened = await page.evaluate(() => {
        const ed = window.MazeDashCustomTab.gridEditor;
        const pal = ed && ed.root ? ed.root.getChildByName('gridPalette') : null;
        return { open: !!(ed && ed.root), cells: ed ? ed.cells.length : 0,
                 palette: !!pal, tools: pal ? pal.children.filter((n) => /^tool_/.test(n.name)).length : 0,
                 swatches: pal ? pal.children.filter((n) => /^swatch_/.test(n.name)).length : 0 };
    });
    const bar = await page.evaluate(() => {
        const hall = window.hallScene;
        const bottom = hall && hall.tabBar && hall.tabBar.parent;
        const pal = window.MazeDashCustomTab.gridEditor.root.getChildByName('gridPalette');
        const H = cc.view.getVisibleSize().height;
        function rect(n) { if (!n || !n.isValid) { return null; } const wp = n.convertToWorldSpaceAR(cc.v2(0, 0)); return { top: Math.round(wp.y + n.height / 2), bottom: Math.round(wp.y - n.height / 2) }; }
        return { tabBarVisible: !!(bottom && bottom.activeInHierarchy),
                 tabBarRect: rect(bottom), paletteRect: rect(pal), visibleH: Math.round(H) };
    });
    console.log('TAB BAR during editing:', JSON.stringify(bar), ' overlap:', (bar.tabBarRect && bar.paletteRect) ? (bar.paletteRect.bottom < bar.tabBarRect.top) : 'n/a');
    console.log('EDITOR OPEN:', JSON.stringify(opened));
    await page.screenshot({ path: SHOTS + '51-editor-palette.png' });
    // place one of each tool at x = 0..11 on row 0, using the exposed hooks (same code path as tapping)
    const placed = await page.evaluate(() => {
        const ed = window.MazeDashCustomTab.gridEditor;
        const plan = [
            ['floor', 0, 1], ['wall', 1, 0], ['hero', 2, -1], ['brick', 3, -4], ['key', 4, 4], ['lock', 5, -3],
            ['up', 6, 5], ['right', 7, 6], ['down', 8, 7], ['left', 9, 8],
        ];
        plan.forEach((p) => { ed.setTool(p[0]); ed.paint(p[1], 0); });
        ed.setTool('portal'); ed.paint(10, 0);              // default colour = purple (4)
        const before = ed.tool().portalColour;
        // pick the red swatch then paint the next cell
        const pal = ed.root.getChildByName('gridPalette');
        const sw = pal.getChildByName('swatch_1');
        sw.emit(cc.Node.EventType.TOUCH_END);
        ed.paint(11, 0);
        return { purpleForFirstPortal: before, secondPortalColour: ed.tool().portalColour,
                 readback: plan.map((p) => [p[1], ed.value(p[1], 0), p[2]]).concat([[10, ed.value(10, 0), 2], [11, ed.value(11, 0), 2]]),
                 colours: ed.colours() };
    });
    const mismatches = placed.readback.filter((r) => r[1] !== r[2]);
    console.log('PLACED readback mismatches:', mismatches.length, JSON.stringify(mismatches));
    console.log('portal colours table:', JSON.stringify(placed.colours), ' second swatch colour idx:', placed.secondPortalColour);
    await page.screenshot({ path: SHOTS + '52-editor-drawn-tools.png' });
    // save and play
    const saved = await page.evaluate(() => { return window.MazeDashCustomTab.gridEditor.save(); });
    for (let i = 0; i < 50; i++) { if ((await scene()) === 'gameScene') { break; } await sleep(300); }
    await sleep(3500);
    const after = await page.evaluate((id) => {
        const map = cc.find('Canvas/backgroup/game_map');
        const comp = map && map.getComponent('game_map');
        const grid = conf.all_Level[id] || [];
        const check = { hero: grid[0] ? grid[0][2] : null, brick: grid[0] ? grid[0][3] : null, key: grid[0] ? grid[0][4] : null,
                        lock: grid[0] ? grid[0][5] : null, up: grid[0] ? grid[0][6] : null, right: grid[0] ? grid[0][7] : null,
                        down: grid[0] ? grid[0][8] : null, left: grid[0] ? grid[0][9] : null,
                        portalA: grid[0] ? grid[0][10] : null, portalB: grid[0] ? grid[0][11] : null, wall: grid[0] ? grid[0][1] : null };
        return { savedId: id, comp: !!comp, rows: grid.length, check,
                 colourTable: (window.MazeDashCustomTab.stats.activeColourMap === id) };
    }, saved);
    console.log('SAVED id=' + saved + ' game_map=' + after.comp + ' rows=' + after.rows + ' colourMapActive=' + after.colourTable);
    console.log('MATRIX CHECK:', JSON.stringify(after.check));
    await page.screenshot({ path: SHOTS + '53-editor-tools-played.png' });
    console.log('errors:', JSON.stringify(errs.slice(0, 4)));
    await browser.close(); process.exit(0);
})().catch((e) => { console.error('HARNESS ERROR', e); process.exit(1); });
