/* Does the world preview page actually LIST the world's levels, and can a real finger reach the tiles?

   Why this probe exists: probe-p2-p3.js and probe-level-lib.js press the mouse down and up at the same
   coordinate, so the pager never sees a move. A real finger always wobbles a few pixels, and the pager
   used to start panning content on the first touchmove - which slid the tile out from under the finger
   and turned its TOUCH_END into a TOUCH_CANCEL, so taps on the preview tiles did nothing while every
   probe stayed green. This one always wobbles, exactly like a finger.

   Run:  NODE_PATH=E:\maze_dash\_work\test\node_modules node tools/verify/probe-preview-levels.js */
const puppeteer = require('puppeteer-core');
const path = require('path');

const CHROME = 'C:\\Users\\Lenovo\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe';
const FILE = 'file:///E:/maze_dash/dist/MazeDash-standalone.html';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function findExpr(name) {
    return `(${function (n) {
        const root = cc.director.getScene();
        const walk = (x) => { if (x.name === n) { return x; } for (const c of x.children) { const f = walk(c); if (f) { return f; } } return null; };
        return walk(root);
    }.toString()})(${JSON.stringify(name)})`;
}

async function screenPoint(page, name) {
    return await page.evaluate((n) => {
        const root = cc.director.getScene();
        const walk = (x) => { if (x.name === n) { return x; } for (const c of x.children) { const f = walk(c); if (f) { return f; } } return null; };
        const nd = walk(root);
        if (!nd) { return null; }
        const w = nd.convertToWorldSpaceAR(cc.v2(0, 0));
        const r = cc.game.canvas.getBoundingClientRect();
        const vs = cc.view.getVisibleSize();
        return { x: r.left + w.x * (r.width / vs.width), y: r.top + (vs.height - w.y) * (r.height / vs.height), name: nd.name };
    }, name);
}

/* a real finger: down, wobble a few pixels, up */
async function fingerTap(page, name, wobble) {
    const pt = await screenPoint(page, name);
    if (!pt) { return null; }
    const w = wobble === undefined ? 4 : wobble;
    await page.mouse.move(pt.x, pt.y);
    await sleep(70);
    await page.mouse.down();
    await sleep(50);
    if (w > 0) { await page.mouse.move(pt.x + w, pt.y + 1); await sleep(60); }
    await page.mouse.up();
    await sleep(900);
    return pt;
}

/* a deliberate drag: must still page */
async function fingerDrag(page, dx) {
    await page.mouse.move(720, 400);
    await sleep(60);
    await page.mouse.down();
    await sleep(50);
    for (let i = 1; i <= 6; i++) { await page.mouse.move(720 + (dx * i) / 6, 400); await sleep(35); }
    await page.mouse.up();
    await sleep(900);
}

async function state(page) {
    return await page.evaluate(() => {
        const root = cc.director.getScene();
        const walk = (x, out) => { out.push(x); for (const c of x.children) { walk(c, out); } return out; };
        const all = root ? walk(root, []) : [];
        const names = all.map((n) => String(n.name));
        const levels = names.filter((n) => n.indexOf('previewLevel_') === 0);
        const titles = all.filter((n) => n.name === 'previewPageTitle').map((n) => ({ s: n.getComponent(cc.Label) ? n.getComponent(cc.Label).string : '', x: Math.round(n.convertToWorldSpaceAR(cc.v2(0, 0)).x) }));
        const pickers = names.filter((n) => n.indexOf('pickerTile_') === 0);
        const grid = names.filter((n) => /grid/i.test(n));
        return {
            scene: root ? root.name : null,
            previewOpen: names.indexOf('previewClose') >= 0,
            pickerOpen: names.some((n) => n.indexOf('editorPicker') === 0) || pickers.length > 0,
            levelTiles: levels,
            pickerTiles: pickers,
            pageTitles: titles,
            gridNodes: grid.slice(0, 6),
            stats: (window.MazeDashCustomTab && window.MazeDashCustomTab.stats) ? {
                editorsOpen: window.MazeDashCustomTab.stats.editorsOpen,
                previewsOpened: window.MazeDashCustomTab.stats.previewsOpened,
                pickerAdoptedInto: window.MazeDashCustomTab.stats.pickerAdoptedInto,
                pickerTiles: window.MazeDashCustomTab.stats.pickerTiles
            } : null
        };
    });
}

(async () => {
    const browser = await puppeteer.launch({
        executablePath: CHROME,
        headless: 'new',
        args: ['--allow-file-access-from-files', '--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader', '--mute-audio', '--no-sandbox']
    });
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 810, hasTouch: true });
    const errs = [];
    page.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
    page.on('console', (m) => { if (m.type() === 'error') { errs.push('console: ' + m.text()); } });

    await page.goto(FILE, { waitUntil: 'domcontentloaded', timeout: 120000 });
    await page.waitForFunction('window.cc && cc.game && cc.game._prepared === true', { timeout: 120000, polling: 150 });
    for (let i = 0; i < 80; i++) { const s = await page.evaluate(() => cc.director.getScene() && cc.director.getScene().name); if (s === 'HallScene') { break; } await page.mouse.click(720, 400); await sleep(500); }
    await sleep(2500);

    /* editor home */
    await page.evaluate(() => { if (window.gamemain) { gamemain.showTabBarViewIndex = 5; } if (window.hall) { hall.showBarView(); } });
    await sleep(1600);

    /* seed the level library with one item, so the picker has something to move in.
       libLoad() reads localStorage on demand, so no reload is needed. */
    await page.evaluate(() => {
        const N = 20;
        const grid = [];
        for (let y = 0; y < N; y++) { const row = []; for (let x = 0; x < N; x++) { row.push(0); } grid.push(row); }
        grid[0][0] = -1;        /* one hero */
        grid[0][1] = 1;         /* one floor cell */
        const lib = { version: 1, items: [{ id: 900001, name: 'probe level', grid: grid, colours: {}, createdAt: Date.now(), updatedAt: Date.now() }] };
        localStorage.setItem('maze_dash_my_levels', JSON.stringify(lib));
    });
    await sleep(300);

    const out = {};
    /* open the world preview with a real wobbling finger */
    out.openedPreview = !!(await fingerTap(page, 'editorSmall_previewWorld'));
    await sleep(600);
    let st = await state(page);
    out.afterOpen = st;

    /* wobble-tap "move in" - this is the gesture that used to be swallowed */
    out.tappedMoveIn = !!(await fingerTap(page, 'previewTile_moveLevels'));
    st = await state(page);
    out.afterMoveInTap = { pickerOpen: st.pickerOpen, pickerTiles: st.pickerTiles.length, levelTilesBefore: st.levelTiles.length };

    /* pick the first library item */
    let pickerName = st.pickerTiles[0];
    out.picked = pickerName ? !!(await fingerTap(page, pickerName)) : false;
    await sleep(1200);
    st = await state(page);
    out.afterPick = {
        previewOpen: st.previewOpen,
        levelTiles: st.levelTiles,
        pageTitles: st.pageTitles,
        adoptedInto: st.stats ? st.stats.pickerAdoptedInto : null
    };
    out.tileCountBefore = out.afterMoveInTap.levelTilesBefore;
    out.tileCountAfter = st.levelTiles.length;
    out.tileAppearedWithoutRefresh = out.tileCountAfter > out.tileCountBefore;

    /* wobble-tap the newly listed level tile: must really enter a level */
    const newTile = st.levelTiles[0];
    out.tappedLevel = newTile ? !!(await fingerTap(page, newTile)) : false;
    await sleep(2200);
    const inside = await state(page);
    out.afterEnter = { scene: inside.scene, previewOpen: inside.previewOpen };
    out.enteredLevel = inside.scene !== 'HallScene';

    /* back to the editor, then the same wobble on "new level" must open the grid editor */
    await sleep(1200);
    await page.evaluate(() => { if (window.gamemain) { gamemain.showTabBarViewIndex = 5; } if (window.hall) { hall.showBarView(); } });
    await sleep(1800);
    if (out.enteredLevel) {
        await fingerTap(page, 'editorSmall_previewWorld');
        await sleep(700);
    }
    out.tappedNewLevel = !!(await fingerTap(page, 'previewTile_newLevel'));
    await sleep(1400);
    const g = await state(page);
    out.afterNewLevel = { gridNodes: g.gridNodes, previewOpen: g.previewOpen };
    out.gridOpened = g.gridNodes.length > 0;

    out.errors = errs.slice(0, 8);
    console.log(JSON.stringify(out, null, 1));
    await browser.close();
})().catch((e) => { console.log('PROBE FAILED: ' + (e && e.message)); process.exit(1); });
