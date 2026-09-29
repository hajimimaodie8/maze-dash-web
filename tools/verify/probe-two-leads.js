const puppeteer = require('puppeteer-core');
const CHROME = 'C:\\Users\\Lenovo\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe';
const FILE = 'file:///E:/maze_dash/dist/MazeDash-standalone.html';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const log = (k, v) => console.log('E ' + k + ':', typeof v === 'string' ? v : JSON.stringify(v));
(async () => {
    const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', userDataDir: 'E:\\maze_dash\\_work\\test\\chrome-profile-ev', protocolTimeout: 300000,
        args: ['--no-sandbox','--disable-extensions','--no-first-run','--mute-audio','--allow-file-access-from-files','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader'], defaultViewport: { width: 1440, height: 810 } });
    const page = await browser.newPage();
    const scene = () => page.evaluate(() => (cc.director.getScene() ? cc.director.getScene().name : '?'));
    async function tap(x, y, s) { await page.mouse.move(x, y); await page.mouse.down(); await sleep(70); await page.mouse.up(); await sleep(s || 900); }
    async function toHall() { for (let i = 0; i < 120; i++) { if ((await scene()) === 'HallScene') { return; } if (i % 3 === 1) { await tap(720, 400, 500); } else { await sleep(400); } } }
    const treeOf = (rootName) => page.evaluate((rn) => {
        const sc = cc.director.getScene();
        let root = null;
        (function w(n) { if (!root && n.name === rn) { root = n; } (n.children || []).forEach(w); })(sc);
        if (!root) { return { found: false, sceneHas: sc ? sc.name : null }; }
        const kids = root.children.map((n) => n.name + '(' + (n.children ? n.children.length : 0) + ')');
        const deep = [];
        root.children.forEach((n) => (n.children || []).forEach((k) => { if (deep.length < 24) { deep.push(n.name + '>' + k.name); } }));
        let btnX = null;
        (function w2(n) { if (/^editorSmall_/.test(n.name) && btnX === null) { btnX = []; } if (/^editorSmall_/.test(n.name)) { const wp = n.convertToWorldSpaceAR(cc.v2(0, 0)); btnX.push([n.name, Math.round(wp.x)]); } (n.children || []).forEach(w2); })(root);
        return { found: true, children: kids.length, names: kids, deep: deep, buttons: btnX };
    }, rootName);
    await page.goto(FILE, { waitUntil: 'domcontentloaded', timeout: 120000 });
    await page.waitForFunction('window.cc && cc.game && cc.game._prepared === true', { timeout: 120000, polling: 150 });
    await toHall(); await sleep(3000);
    log('1_tree_boot', await treeOf('customLevelsView'));

    // open the editor and drag with a REAL mouse across the grid
    await page.evaluate(async () => { const api = window.MazeDashCustomTab; api.openGridEditor(); for (let i = 0; i < 80; i++) { if (api.gridEditor && api.gridEditor.grid && !api.gridEditor.pending) { return; } await new Promise((r) => setTimeout(r, 100)); } });
    await sleep(600);
    const pts = await page.evaluate(() => {
        const toScreen = (nodeName) => { let n = null; (function w(x) { if (!n && x.name === nodeName) { n = x; } (x.children || []).forEach(w); })(cc.find('Canvas/gridEditor') || cc.director.getScene()); if (!n) { return null; } const wp = n.convertToWorldSpaceAR(cc.v2(0, 0)); const r = cc.game.canvas.getBoundingClientRect(); const vs = cc.view.getVisibleSize(); return { x: r.left + wp.x * (r.width / vs.width), y: r.top + (vs.height - wp.y) * (r.height / vs.height) }; };
        const out = {};
        ['cell_4_4', 'cell_6_4', 'cell_8_4', 'cell_10_4'].forEach((k) => { out[k] = toScreen(k); });
        return out;
    });
    log('2_dragPoints', pts);
    if (pts['cell_4_4'] && pts['cell_10_4']) {
        await page.mouse.move(pts['cell_4_4'].x, pts['cell_4_4'].y);
        await page.mouse.down();
        for (const k of ['cell_6_4', 'cell_8_4', 'cell_10_4']) { if (pts[k]) { await page.mouse.move(pts[k].x, pts[k].y, { steps: 6 }); await sleep(120); } }
        await page.mouse.up();
        await sleep(600);
    }
    log('3_afterRealDrag', await page.evaluate(() => {
        const api = window.MazeDashCustomTab;
        const ed = api.gridEditor;
        const row = ed && ed.grid ? ed.grid[4] : null;
        const vals = row ? row.slice(3, 13) : null;
        let readout = null;
        (function w(n) { if (!readout && n.name === 'gridReadout') { const l = n.getComponent(cc.Label); readout = l ? l.string : null; } (n.children || []).forEach(w); })(cc.find('Canvas/gridEditor') || cc.director.getScene());
        return { rowVals_3to12: vals, readout: readout, gridPaints: api.stats.gridPaints || 0, readoutFromMatrix: api.stats.readoutFromMatrix || 0, cellsPaintedByDrag: (vals || []).filter((v) => v === 1).length };
    }));
    log('4_tree_afterOpen', await treeOf('customLevelsView'));

    // go into a level and come back, then look at the tree again
    await page.evaluate(() => { try { window.MazeDashCustomTab.gridEditor.close(); } catch (e) {} });
    await sleep(800);
    await page.evaluate(() => { try { gamemain.enterEnterGameScene(10101); } catch (e) {} });
    for (let i = 0; i < 100; i++) { const r = await page.evaluate(() => { const m = cc.find('Canvas/backgroup/game_map'); const cp = m && m.getComponent && m.getComponent('game_map'); return !!(cp && cp.Level_data); }); if (r) { break; } await sleep(150); }
    await sleep(2500);
    await page.evaluate(() => { const sc = cc.director.getScene(); let h = null; (function w(n) { if (!h && /hall/i.test(n.name)) { h = n; } (n.children || []).forEach(w); })(sc); try { cc.director.loadScene('HallScene'); } catch (e) {} });
    for (let i = 0; i < 120; i++) { if ((await scene()) === 'HallScene') { break; } await sleep(400); }
    await sleep(3500);
    log('5_tree_afterReturn', await treeOf('customLevelsView'));
    await browser.close(); process.exit(0);
})().catch((e) => { console.error('HARNESS ERROR', e); process.exit(1); });
