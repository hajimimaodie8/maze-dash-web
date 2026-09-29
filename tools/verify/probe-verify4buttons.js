const puppeteer = require('puppeteer-core');
const CHROME = 'C:\\Users\\Lenovo\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe';
const FILE = 'file:///E:/maze_dash/dist/MazeDash-standalone.html';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const log = (k, v) => console.log('V ' + k + ':', typeof v === 'string' ? v : JSON.stringify(v));
(async () => {
    const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', userDataDir: 'E:\\maze_dash\\_work\\test\\chrome-profile-verify4', protocolTimeout: 300000,
        args: ['--no-sandbox','--disable-extensions','--no-first-run','--mute-audio','--allow-file-access-from-files','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader'], defaultViewport: { width: 1440, height: 810 } });
    const page = await browser.newPage();
    const scene = () => page.evaluate(() => (cc.director.getScene() ? cc.director.getScene().name : '?'));
    async function tap(x, y, s) { await page.mouse.move(x, y); await page.mouse.down(); await sleep(70); await page.mouse.up(); await sleep(s || 900); }
    async function toHall() { for (let i = 0; i < 120; i++) { if ((await scene()) === 'HallScene') { return; } if (i % 3 === 1) { await tap(720, 400, 500); } else { await sleep(400); } } }
    await page.goto(FILE, { waitUntil: 'domcontentloaded', timeout: 120000 });
    await page.waitForFunction('window.cc && cc.game && cc.game._prepared === true', { timeout: 120000, polling: 150 });
    await toHall(); await sleep(3000);
    log('buttons', await page.evaluate(() => {
        const root = cc.find('Canvas/customLevelsView') || cc.director.getScene();
        const vs = cc.view.getVisibleSize();
        const out = { names: [], allInside: true };
        ['previewWorld', 'previewLevel', 'exportJson', 'importJson'].forEach((id) => {
            let n = null;
            (function w(x) { if (!n && x.name === 'editorSmall_' + id) { n = x; } (x.children || []).forEach(w); })(root);
            if (!n) { out.names.push(id + ':MISSING'); out.allInside = false; return; }
            const wp = n.convertToWorldSpaceAR(cc.v2(0, 0));
            const inside = (wp.x - n.width / 2) >= 0 && (wp.x + n.width / 2) <= vs.width;
            if (!inside) { out.allInside = false; }
            let lbl = null; const l = n.getChildByName('editorSmallLabel_' + id); if (l) { const c = l.getComponent(cc.Label); lbl = c ? c.string : null; }
            out.names.push(id + ':' + (inside ? 'IN' : 'OUT') + '@' + Math.round(wp.x) + (lbl ? ' "' + lbl + '"' : ''));
        });
        return out;
    }));
    // real click on one grid cell
    await page.evaluate(async () => { const api = window.MazeDashCustomTab; api.openGridEditor(); for (let i = 0; i < 80; i++) { if (api.gridEditor && api.gridEditor.grid && !api.gridEditor.pending) { return; } await new Promise((r) => setTimeout(r, 100)); } });
    await sleep(800);
    const pt = await page.evaluate(() => {
        let n = null; (function w(x) { if (!n && x.name === 'cell_5_5') { n = x; } (x.children || []).forEach(w); })(cc.find('Canvas/gridEditor') || cc.director.getScene());
        if (!n) { return null; }
        const wp = n.convertToWorldSpaceAR(cc.v2(0, 0)); const r = cc.game.canvas.getBoundingClientRect(); const vs = cc.view.getVisibleSize();
        return { x: r.left + wp.x * (r.width / vs.width), y: r.top + (vs.height - wp.y) * (r.height / vs.height) };
    });
    log('cellPt', pt);
    if (pt) { await tap(pt.x, pt.y, 700); }
    log('afterRealClick', await page.evaluate(() => { const api = window.MazeDashCustomTab; const ed = api.gridEditor; let readout = null; (function w(n) { if (!readout && n.name === 'gridReadout') { const l = n.getComponent(cc.Label); readout = l ? l.string : null; } (n.children || []).forEach(w); })(cc.find('Canvas/gridEditor') || cc.director.getScene()); return { cell55: ed && ed.grid ? ed.grid[5][5] : null, readout: readout, gridPaints: api.stats.gridPaints || 0, readoutFromMatrix: api.stats.readoutFromMatrix || 0 }; }));
    await page.screenshot({ path: 'E:\\maze_dash\\docs\\screenshots\\74-buttons-and-grid.png' });
    await browser.close(); process.exit(0);
})().catch((e) => { console.error('HARNESS ERROR', e); process.exit(1); });
