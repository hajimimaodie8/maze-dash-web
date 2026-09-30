/* P2: the two tiles on the world-preview page (newLevel / moveLevels) plus the delete button must
   respond to REAL mouse clicks. P3: placing a brick on a floor cell must not blank the cell.
   Everything here drives the packaged single-file build over file:// with real mouse events. */
const puppeteer = require('puppeteer-core');
const CHROME = 'C:\\Users\\Lenovo\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe';
const DIST = 'file:///E:/maze_dash/dist/MazeDash-standalone.html';
const DELIVERED = 'file:///E:/maze_dash/%E5%86%B2%E6%92%9E%E8%BF%B7%E9%98%B5.html';
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
    const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', userDataDir: 'E:\\maze_dash\\_work\\test\\chrome-profile-p2p3', protocolTimeout: 300000, args: ARGS, defaultViewport: { width: 1440, height: 810 } });
    const page = await browser.newPage();
    const errs = []; page.on('pageerror', (e) => errs.push(String(e.message).slice(0, 140)));
    const out = { p2: {}, p3: {}, errs };

    /* ---------------- P2 ---------------- */
    await boot(page, DIST);
    await page.evaluate(() => { window.MazeDashCustomTab.editorAction('previewWorld'); });
    await sleep(2000);
    out.p2.buttons = await page.evaluate(() => {
        const res = [];
        const scene = cc.director.getScene();
        (function walk(n) { if (/^previewTile_|^previewDelete$/.test(n.name)) { const w = n.convertToWorldSpaceAR(cc.v2(0, 0)); res.push({ name: n.name, active: n.activeInHierarchy, z: n.zIndex, x: Math.round(w.x), y: Math.round(w.y), w: Math.round(n.width) }); } (n.children || []).forEach(walk); })(scene);
        return res;
    });
    out.p2.opened = await tapWorld(page, 'previewTile_moveLevels');
    await sleep(600);
    out.p2.picker = await page.evaluate(() => {
        const n = cc.find('Canvas/levelPicker');
        return { exists: !!n, active: n ? n.activeInHierarchy : false, tiles: n ? n.getChildByName('pickerPanel').getChildByName('pickerGrid').children.length : 0, opened: window.MazeDashCustomTab.stats.pickersOpened || 0 };
    });
    await page.screenshot({ path: 'E:\\maze_dash\\docs\\screenshots\\100-p2-picker.png' });
    await tapWorld(page, 'pickerTile_10001') || await tapWorld(page, 'pickerTile_1');
    await sleep(800);
    out.p2.adopted = await page.evaluate(() => ({ in: window.MazeDashCustomTab.stats.moveLevelsIn || 0, pickerGone: !cc.find('Canvas/levelPicker'), world101Keys: Object.keys(conf.stage_level_cfg[101] || {}).length }));
    await tapWorld(page, 'pickerCancel'); await sleep(400);
    await page.evaluate(() => { window.MazeDashCustomTab.editorAction('previewWorld'); });
    await sleep(1500);
    out.p2.newLevelTapped = await tapWorld(page, 'previewTile_newLevel');
    await sleep(1200);
    out.p2.grid = await page.evaluate(() => { const n = cc.find('Canvas/gridEditor'); return { exists: !!n, active: n ? n.activeInHierarchy : false }; });
    await page.screenshot({ path: 'E:\\maze_dash\\docs\\screenshots\\101-p2-newlevel-grid.png' });
    await boot(page, DIST);
    await page.evaluate(() => { window.MazeDashCustomTab.editorAction('previewWorld'); });
    await sleep(1800);
    out.p2.deleteTapped = await tapWorld(page, 'previewDelete');
    await sleep(800);
    out.p2.confirm = await page.evaluate(() => { let found = null; (function walk(n) { if (/confirm/i.test(n.name) && n.activeInHierarchy) { found = n.name; } (n.children || []).forEach(walk); })(cc.director.getScene()); return found; });
    await page.screenshot({ path: 'E:\\maze_dash\\docs\\screenshots\\102-p2-delete-confirm.png' });

    /* ---------------- P3: brick on a floor cell, driven by real clicks on the tool buttons ---------------- */
    await boot(page, DELIVERED);
    await page.evaluate(() => { window.MazeDashCustomTab.openGridEditor(); });
    await sleep(1800);
    const clickTool = async (needle) => page.evaluate((n2) => {
        const hits = [];
        (function walk(n) { const lb = n.getComponent && n.getComponent(cc.Label); if (lb && String(lb.string).indexOf(n2) >= 0) { hits.push(n.name); } (n.children || []).forEach(walk); })(cc.find('Canvas/gridEditor'));
        return hits.slice(0, 3);
    }, needle);
    out.p3.toolLabels = { floor: await clickTool('Floor'), brick: await clickTool('Brick') };
    await tapWorld(page, 'Canvas/gridEditor/gridRootBg/cell_5_5') || await tapWorld(page, 'cell_5_5');
    await sleep(500);
    /* switch to the brick tool by clicking its button (the button is the label's parent) */
    await page.evaluate(() => {
        let target = null;
        (function walk(n) { const lb = n.getComponent && n.getComponent(cc.Label); if (lb && /Brick/.test(String(lb.string)) && n.parent) { target = n.parent; } (n.children || []).forEach(walk); })(cc.find('Canvas/gridEditor'));
        if (target) { const w = target.convertToWorldSpaceAR(cc.v2(0, 0)); const r = cc.game.canvas.getBoundingClientRect(); const vs = cc.view.getVisibleSize(); window.__brickPt = { x: r.left + w.x * (r.width / vs.width), y: r.top + (vs.height - w.y) * (r.height / vs.height) }; }
    });
    const bp = await page.evaluate(() => window.__brickPt || null);
    if (bp) { await page.mouse.move(bp.x, bp.y); await sleep(60); await page.mouse.down(); await sleep(60); await page.mouse.up(); await sleep(500); }
    await tapWorld(page, 'cell_5_5');
    await sleep(600);
    out.p3.cell = await page.evaluate(() => {
        let cell = null;
        (function walk(n) { if (n.name === 'cell_5_5') { cell = n; } (n.children || []).forEach(walk); })(cc.director.getScene());
        if (!cell) { return { error: 'cell not found' }; }
        const sp = cell.getComponent(cc.Sprite);
        const w = cell.convertToWorldSpaceAR(cc.v2(0, 0));
        const kids = cell.children.map((k) => { const ks = k.getComponent(cc.Sprite); return { name: k.name, active: k.activeInHierarchy, colour: k.color ? [k.color.r, k.color.g, k.color.b] : null, sprite: !!ks }; });
        let grid = cc.find('Canvas/gridEditor');
        let gridVal = null;
        try { gridVal = (window.MazeDashCustomTab.stats.gridValues || {})['5,5'] || null; } catch (e) {}
        return { value: cell.__value === undefined ? null : cell.__value, ownColour: cell.color ? [cell.color.r, cell.color.g, cell.color.b] : null, hasSprite: !!sp, spriteFrame: sp && sp.spriteFrame ? sp.spriteFrame.name : null, world: [Math.round(w.x), Math.round(w.y)], size: [Math.round(cell.width), Math.round(cell.height)], children: kids, gridVal };
    });
    await page.screenshot({ path: 'E:\\maze_dash\\docs\\screenshots\\103-p3-brick.png' });

    console.log('P2=' + JSON.stringify(out.p2));
    console.log('P3=' + JSON.stringify(out.p3));
    console.log('ERRS=' + JSON.stringify(errs.slice(0, 4)));
    await browser.close(); process.exit(0);
})().catch((e) => { console.error('HARNESS ERROR', e && e.message); process.exit(1); });
