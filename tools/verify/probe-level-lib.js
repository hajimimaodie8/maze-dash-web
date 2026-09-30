/* "My levels" library: (1) Save & Play must land in the library, (2) the Move-in picker must list
   the user's own saved levels (it used to list world 1's shipped levels), (3) the same name must
   overwrite instead of piling up. Everything drives the packaged single-file build over file://. */
const puppeteer = require('puppeteer-core');
const CHROME = 'C:\\Users\\Lenovo\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe';
const DIST = 'file:///E:/maze_dash/dist/MazeDash-standalone.html';
const ARGS = ['--no-sandbox', '--disable-extensions', '--no-first-run', '--mute-audio',
    '--allow-file-access-from-files', '--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader'];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function tapWorld(page, sel) {
    const pt = await page.evaluate((s) => {
        const n = cc.find(s) || (function walk(root) { if (root.name === s) return root; for (const c of root.children) { const f = walk(c); if (f) return f; } return null; })(cc.director.getScene());
        if (!n) { return null; }
        const w = n.convertToWorldSpaceAR(cc.v2(0, 0));
        const r = cc.game.canvas.getBoundingClientRect(); const vs = cc.view.getVisibleSize();
        return { x: r.left + w.x * (r.width / vs.width), y: r.top + (vs.height - w.y) * (r.height / vs.height), name: n.name };
    }, sel);
    if (!pt) { return false; }
    await page.mouse.move(pt.x, pt.y); await sleep(60); await page.mouse.down(); await sleep(60); await page.mouse.up();
    await sleep(700);
    return true;
}

async function boot(page, url) {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 120000 });
    await page.waitForFunction('window.cc && cc.game && cc.game._prepared === true', { timeout: 120000, polling: 150 });
    for (let i = 0; i < 80; i++) { const s = await page.evaluate(() => cc.director.getScene() && cc.director.getScene().name); if (s === 'HallScene') break; await page.mouse.click(720, 400); await sleep(500); }
    await sleep(2500);
}

(async () => {
    const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', userDataDir: 'E:\\maze_dash\\_work\\test\\chrome-profile-lib', protocolTimeout: 300000, args: ARGS, defaultViewport: { width: 1440, height: 810 } });
    const page = await browser.newPage();
    const errs = []; page.on('pageerror', (e) => errs.push(String(e.message).slice(0, 140)));
    const out = { errs };

    await boot(page, DIST);

    /* ---- 1. the library helpers: same name overwrites ---- */
    out.overwrite = await page.evaluate(() => {
        const T = window.MazeDashCustomTab;
        localStorage.removeItem('maze_dash_my_levels');
        T.libUpsert({ name: 'X', grid: [[1]], colours: { '0,0': 4 } });
        T.libUpsert({ name: 'X', grid: [[1, 1]], colours: {} });
        T.libUpsert({ name: 'Y', grid: [[1]], colours: {} });
        const lib = T.libLoad();
        return { items: lib.items.length, names: lib.items.map((i) => i.name), xHasLatestGrid: lib.items.filter((i) => i.name === 'X')[0].grid.length === 2 };
    });

    /* ---- 2. Save & Play lands in the library ---- */
    await page.evaluate(() => { localStorage.removeItem('maze_dash_my_levels'); window.MazeDashCustomTab.editorAction('previewWorld'); });
    await sleep(2000);
    out.newLevelTapped = await tapWorld(page, 'previewTile_newLevel');
    await sleep(1600);
    out.grid = await page.evaluate(() => { const n = cc.find('Canvas/gridEditor'); return { exists: !!n, active: n ? n.activeInHierarchy : false }; });
    out.saved = await page.evaluate(() => {
        const T = window.MazeDashCustomTab;
        const ge = T.gridEditor;
        if (!ge || !ge.grid) { return { error: 'no grid handle' }; }
        ge.grid[1][1] = 1; ge.grid[2][1] = 1;          /* two floors; the editor adds the hero itself */
        let id = ge.save();
        if (!id) { id = ge.save(); }                    /* the first tap may only arm "save anyway" */
        return { id: id, state: T.stats.editorSolvableOnSave };
    });
    await sleep(1800);
    out.libAfterSave = await page.evaluate(() => {
        const lib = window.MazeDashCustomTab.libLoad();
        return { items: lib.items.length, name: lib.items[0] && lib.items[0].name, hasGrid: !!(lib.items[0] && lib.items[0].grid), rawKey: !!localStorage.getItem('maze_dash_my_levels') };
    });

    /* ---- 3. fresh load, then the picker must list the library ---- */
    await boot(page, DIST);
    out.libAfterReload = await page.evaluate(() => window.MazeDashCustomTab.libLoad().items.length);
    await page.evaluate(() => { window.MazeDashCustomTab.editorAction('previewWorld'); });
    await sleep(1800);
    out.pickerOpen = await tapWorld(page, 'previewTile_moveLevels');
    await sleep(900);
    const worldBefore = await page.evaluate(() => Object.keys(conf.stage_level_cfg[101] || {}).length);
    out.picker = await page.evaluate(() => {
        const n = cc.find('Canvas/levelPicker');
        if (!n) { return { exists: false }; }
        const p = n.getChildByName('pickerPanel');
        const grid = p.getChildByName('pickerGrid');
        const tl = p.getChildByName('pickerTitle') && p.getChildByName('pickerTitle').getComponent(cc.Label);
        return { exists: true, tiles: grid.children.length, names: grid.children.map((c) => c.name),
                 statsTiles: window.MazeDashCustomTab.stats.pickerTiles, title: tl ? tl.string : '' };
    });
    await page.screenshot({ path: 'E:\\maze_dash\\docs\\screenshots\\116-level-lib-picker.png' });
    out.clicked = out.picker.names && out.picker.names[0] ? await tapWorld(page, out.picker.names[0]) : false;
    await sleep(900);
    out.adopted = await page.evaluate(() => ({
        inWorld: window.MazeDashCustomTab.stats.moveLevelsIn || 0,
        pickerGone: !cc.find('Canvas/levelPicker'),
        libStill: window.MazeDashCustomTab.libLoad().items.length,
        oldKeyStillThere: !!localStorage.getItem('maze_dash_custom_levels')
    }));
    out.world101Keys = { before: worldBefore, after: await page.evaluate(() => Object.keys(conf.stage_level_cfg[101] || {}).length) };
    out.errs = errs;

    console.log(JSON.stringify(out, null, 1));
    await browser.close();
})().catch((e) => { console.log('PROBE FAILED ' + (e && e.message)); process.exit(1); });
