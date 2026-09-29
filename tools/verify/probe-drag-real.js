const puppeteer = require('puppeteer-core');
const CHROME = 'C:\\Users\\Lenovo\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe';
const FILE = 'file:///E:/maze_dash/dist/MazeDash-standalone.html';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const log = (k, v) => console.log('DR ' + k + ':', typeof v === 'string' ? v : JSON.stringify(v));
(async () => {
    const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', userDataDir: 'E:\\maze_dash\\_work\\test\\chrome-profile-drag', protocolTimeout: 300000,
        args: ['--no-sandbox','--disable-extensions','--no-first-run','--mute-audio','--allow-file-access-from-files','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader'], defaultViewport: { width: 1440, height: 810 } });
    const page = await browser.newPage();
    const scene = () => page.evaluate(() => (cc.director.getScene() ? cc.director.getScene().name : '?'));
    async function tap(x, y, s) { await page.mouse.move(x, y); await page.mouse.down(); await sleep(70); await page.mouse.up(); await sleep(s || 900); }
    async function toHall() { for (let i = 0; i < 120; i++) { if ((await scene()) === 'HallScene') { return; } if (i % 3 === 1) { await tap(720, 400, 500); } else { await sleep(400); } } }
    const screenOf = (names) => page.evaluate((ns) => {
        const sc = cc.find('Canvas/gridEditor') || cc.director.getScene();
        const r = cc.game.canvas.getBoundingClientRect(); const vs = cc.view.getVisibleSize();
        const out = {};
        ns.forEach((nm) => { let n = null; (function w(x) { if (!n && x.name === nm) { n = x; } (x.children || []).forEach(w); })(sc); if (!n) { out[nm] = null; return; } const wp = n.convertToWorldSpaceAR(cc.v2(0, 0)); out[nm] = { x: r.left + wp.x * (r.width / vs.width), y: r.top + (vs.height - wp.y) * (r.height / vs.height) }; });
        return out;
    }, names);
    await page.goto(FILE, { waitUntil: 'domcontentloaded', timeout: 120000 });
    await page.waitForFunction('window.cc && cc.game && cc.game._prepared === true', { timeout: 120000, polling: 150 });
    await toHall(); await sleep(3000);
    await page.evaluate(async () => { const api = window.MazeDashCustomTab; api.openGridEditor(); for (let i = 0; i < 80; i++) { if (api.gridEditor && api.gridEditor.grid && !api.gridEditor.pending) { return; } await new Promise((r) => setTimeout(r, 100)); } });
    await sleep(900);
    await page.evaluate(() => { window.MazeDashCustomTab.gridEditor.clear(); });
    const pts = await screenOf(['cell_4_5', 'cell_8_5', 'cell_11_5']);
    log('points', pts);
    // REAL drag: down on 4,5 then move through 8,5 to 11,5
    if (pts['cell_4_5'] && pts['cell_11_5']) {
        await page.mouse.move(pts['cell_4_5'].x, pts['cell_4_5'].y);
        await page.mouse.down();
        await page.mouse.move(pts['cell_8_5'].x, pts['cell_8_5'].y, { steps: 10 });
        await sleep(120);
        await page.mouse.move(pts['cell_11_5'].x, pts['cell_11_5'].y, { steps: 10 });
        await sleep(120);
        await page.mouse.up();
        await sleep(500);
    }
    log('afterDrag', await page.evaluate(() => { const api = window.MazeDashCustomTab; const ed = api.gridEditor; const s = api.stats; return { row5_4to11: ed.grid[5].slice(4, 12), dragDowns: s.dragDowns || 0, dragMoves: s.dragMoves || 0, dragCellsResolved: s.dragCellsResolved || 0, dragCellsApplied: s.dragCellsApplied || 0, dragPaintApplies: s.dragPaintApplies || 0, scrollDisabled: s.dragScrollDisabled || 0, lastIndex: s.dragLastIndex || null }; }));
    // single click guard: click one cell only
    await page.evaluate(() => { window.MazeDashCustomTab.gridEditor.clear(); api_stats_reset(); function api_stats_reset() { const s = window.MazeDashCustomTab.stats; s.dragCellsApplied = 0; s.dragDowns = 0; s.dragMoves = 0; } });
    const p1 = await screenOf(['cell_6_6']);
    if (p1['cell_6_6']) { await tap(p1['cell_6_6'].x, p1['cell_6_6'].y, 500); }
    log('afterSingleClick', await page.evaluate(() => { const api = window.MazeDashCustomTab; const ed = api.gridEditor; const s = api.stats; const flat = []; ed.grid.forEach((r, y) => r.forEach((v, x) => { if (v === 1) { flat.push(x + ',' + y); } })); return { floors: flat, dragCellsApplied: s.dragCellsApplied || 0 }; }));
    log('scrollRestored', await page.evaluate(() => ({ restored: window.MazeDashCustomTab.stats.dragScrollRestored || 0 })));
    await page.screenshot({ path: 'E:\\maze_dash\\docs\\screenshots\\75-drag-real.png' });
    await browser.close(); process.exit(0);
})().catch((e) => { console.error('HARNESS ERROR', e); process.exit(1); });
