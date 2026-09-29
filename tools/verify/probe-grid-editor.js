const path = require('path');
let puppeteer;
try { puppeteer = require('puppeteer-core'); } catch (e) { puppeteer = require('E:/maze_dash/_work/test/node_modules/puppeteer-core'); }
const CHROME = 'C:\\Users\\Lenovo\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe';
const FILE = 'file:///E:/maze_dash/dist/MazeDash-standalone.html';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const N = 20;
(async () => {
    const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new',
        userDataDir: 'E:\\maze_dash\\_work\\test\\chrome-profile-gride', protocolTimeout: 240000,
        args: ['--no-sandbox','--disable-extensions','--no-first-run','--mute-audio','--allow-file-access-from-files','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader','--autoplay-policy=no-user-gesture-required'],
        defaultViewport: { width: 1440, height: 810 } });
    const page = await browser.newPage();
    const errs = []; page.on('pageerror', (e) => errs.push(String(e.message).slice(0, 120)));
    await page.goto(FILE, { waitUntil: 'domcontentloaded', timeout: 150000 });
    await page.waitForFunction('window.cc && cc.game && cc.game._prepared === true', { timeout: 150000, polling: 150 });
    const scene = () => page.evaluate(() => (cc.director.getScene() ? cc.director.getScene().name : null));
    async function tap(x, y, s) { await page.mouse.move(x, y); await page.mouse.down(); await sleep(70); await page.mouse.up(); await sleep(s || 800); }
    for (let i = 0; i < 90; i++) { if ((await scene()) === 'HallScene') { break; } if (i % 3 === 1) { await tap(720, 400, 500); } else { await sleep(400); } }
    await sleep(4000);

    // --- go to the editor page and click 创建新关卡 ---
    await page.evaluate(() => { gamemain.showTabBarViewIndex = 5; window.hallScene.showBarView(); });
    await sleep(1600);
    const btnPos = await page.evaluate(() => {
        const hall = window.hallScene, v = hall.viewGroup[5];
        const b = v && v.getChildByName('editorBtn_createLevel');
        if (!b) { return null; }
        const wp = b.convertToWorldSpaceAR(cc.v2(0, 0));
        const r = cc.game.canvas.getBoundingClientRect(), vs = cc.view.getVisibleSize();
        return { x: r.left + wp.x * (r.width / vs.width), y: r.top + (vs.height - wp.y) * (r.height / vs.height) };
    });
    console.log('STEP 1 createLevel button at:', JSON.stringify(btnPos));
    if (btnPos) { await tap(btnPos.x, btnPos.y, 1600); }
    const opened = await page.evaluate(() => {
        const root = cc.find('Canvas').getChildByName('gridEditor');
        if (!root) { return { open: false }; }
        const cells = root.children.filter((n) => /^cell_/.test(n.name));
        return { open: true, cells: cells.length, cellSize: cells.length ? [Math.round(cells[0].width), Math.round(cells[0].height)] : null,
                 zBack: (function () { const b = root.getChildByName('gridBack'); return b ? b.zIndex : null; })(),
                 zSave: (function () { const b = root.getChildByName('gridSave'); return b ? b.zIndex : null; })(),
                 title: (function () { const t = root.getChildByName('gridTitle'); return t ? t.getComponent(cc.Label).string : null; })(),
                 saveLabel: (function () { const b = root.getChildByName('gridSave'); const l = b && b.children[0]; return l ? l.getComponent(cc.Label).string : null; })() };
    });
    console.log('STEP 2 editor opened:', JSON.stringify(opened));
    if (!opened.open) { console.log('EDITOR DID NOT OPEN - stopping'); await browser.close(); process.exit(2); }
    await page.screenshot({ path: 'E:\\maze_dash\\docs\\screenshots\\47-grid-editor-empty.png' });

    // --- toggle cells: 4 by real taps on the cells, 6 through the same toggle() the taps use ---
    const cellPos = (gx, gy) => page.evaluate((x, y) => {
        const root = cc.find('Canvas').getChildByName('gridEditor');
        const c = root.getChildByName('cell_' + x + '_' + y);
        const wp = c.convertToWorldSpaceAR(cc.v2(0, 0));
        const r = cc.game.canvas.getBoundingClientRect(), vs = cc.view.getVisibleSize();
        return { x: r.left + wp.x * (r.width / vs.width), y: r.top + (vs.height - wp.y) * (r.height / vs.height) };
    }, gx, gy);
    const tapCells = [[3,3],[4,3],[5,3],[5,4]];
    for (const c of tapCells) {
        const p = await cellPos(c[0], c[1]);
        await tap(p.x, p.y, 220);
    }
    const codeCells = [[6,3],[6,4],[7,4],[8,5],[3,6],[4,6]];
    await page.evaluate((list) => { list.forEach((c) => window.MazeDashCustomTab.gridEditor.toggle(c[0], c[1])); }, codeCells);
    const toggled = tapCells.concat(codeCells);
    console.log('STEP 3 toggled', toggled.length, 'cells (4 by real taps, ' + codeCells.length + ' by toggle()):', JSON.stringify(toggled));
    await sleep(700);
    await page.screenshot({ path: 'E:\\maze_dash\\docs\\screenshots\\48-grid-editor-drawn.png' });
    const afterToggle = await page.evaluate((list) => {
        const ed = window.MazeDashCustomTab.gridEditor;
        return { valueMismatch: list.filter((c) => ed.value(c[0], c[1]) !== 1).length, stats: window.MazeDashCustomTab.stats.gridToggles || 0 };
    }, toggled);
    console.log('STEP 4 live grid check: cells not set to 1 =', afterToggle.valueMismatch, ' toggle count =', afterToggle.stats);

    // --- save & play by tapping the button ---
    const savePos = await page.evaluate(() => {
        const root = cc.find('Canvas').getChildByName('gridEditor');
        const b = root.getChildByName('gridSave');
        const wp = b.convertToWorldSpaceAR(cc.v2(0, 0));
        const r = cc.game.canvas.getBoundingClientRect(), vs = cc.view.getVisibleSize();
        return { x: r.left + wp.x * (r.width / vs.width), y: r.top + (vs.height - wp.y) * (r.height / vs.height) };
    });
    await tap(savePos.x, savePos.y, 3000);
    for (let i = 0; i < 60; i++) { if ((await scene()) === 'gameScene') { break; } await sleep(300); }
    await sleep(4000);
    const result = await page.evaluate((list) => {
        const stats = window.MazeDashCustomTab.stats;
        const id = stats.editorSavedLevel;
        const data = id ? conf.all_Level[id] : null;
        const out = { id: id, world: stats.editorSavedWorld, autoHead: stats.editorAutoHead || null, scene: cc.director.getScene() ? cc.director.getScene().name : null,
                      mapNode: !!(cc.find('Canvas/backgroup') && cc.find('Canvas/backgroup/game_map')), rows: data ? data.length : 0, cols: data && data[0] ? data[0].length : 0,
                      expectedFloors: list.length, mismatches: [], extraFloors: 0 };
        if (data) {
            list.forEach((c) => { if (data[c[1]][c[0]] !== 1) { out.mismatches.push(c + '=' + data[c[1]][c[0]]); } });
            let floors = 0, heads = 0;
            for (let y = 0; y < data.length; y++) { for (let x = 0; x < data[y].length; x++) { if (data[y][x] === 1) { floors++; } if (data[y][x] === -1) { heads++; } } }
            out.floorsInData = floors; out.headsInData = heads;
            out.extraFloors = floors - list.length;
        }
        return out;
    }, toggled);
    console.log('STEP 5 after save:', JSON.stringify(result));
    await page.screenshot({ path: 'E:\\maze_dash\\docs\\screenshots\\49-grid-editor-played.png' });
    console.log('errors:', JSON.stringify(errs.slice(0, 4)));
    await browser.close(); process.exit(0);
})().catch((e) => { console.error('HARNESS ERROR', e); process.exit(1); });
