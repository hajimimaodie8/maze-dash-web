const puppeteer = require('puppeteer-core');
const CHROME = 'C:\\Users\\Lenovo\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe';
const FILE = 'file:///E:/maze_dash/dist/MazeDash-standalone.html';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const log = (k, v) => console.log('G ' + k + ':', typeof v === 'string' ? v : JSON.stringify(v));
(async () => {
    const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', userDataDir: 'E:\\maze_dash\\_work\\test\\chrome-profile-gridfix', protocolTimeout: 300000,
        args: ['--no-sandbox','--disable-extensions','--no-first-run','--mute-audio','--allow-file-access-from-files','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader'], defaultViewport: { width: 1440, height: 810 } });
    const page = await browser.newPage();
    const scene = () => page.evaluate(() => (cc.director.getScene() ? cc.director.getScene().name : '?'));
    async function tap(x, y, s) { await page.mouse.move(x, y); await page.mouse.down(); await sleep(70); await page.mouse.up(); await sleep(s || 900); }
    async function toHall() { for (let i = 0; i < 120; i++) { if ((await scene()) === 'HallScene') { return; } if (i % 3 === 1) { await tap(720, 400, 500); } else { await sleep(400); } } }
    async function check(w, h, shot) {
        await page.setViewport({ width: w, height: h });
        await page.reload({ waitUntil: 'domcontentloaded', timeout: 120000 });
        await page.waitForFunction('window.cc && cc.game && cc.game._prepared === true', { timeout: 120000, polling: 150 });
        await toHall(); await sleep(2500);
        await page.evaluate(async () => {
            const api = window.MazeDashCustomTab; api.openGridEditor();
            for (let i = 0; i < 80; i++) { if (api.gridEditor && api.gridEditor.grid && !api.gridEditor.pending) { break; } await new Promise((r) => setTimeout(r, 100)); }
            const ed = api.gridEditor; ed.clear(); ed.setTool('floor');
            for (let x = 4; x < 16; x++) { ed.paint(x, 6); }
            ed.setTool('hero'); ed.paint(10, 10);
            await new Promise((r) => setTimeout(r, 300));
        });
        const m = await page.evaluate(() => {
            const vs = cc.view.getVisibleSize();
            const root = cc.find('Canvas/gridEditor');
            const out = { visible: [Math.round(vs.width), Math.round(vs.height)], rootFound: !!root };
            if (!root) { return out; }
            out.root = { size: [Math.round(root.width), Math.round(root.height)], pos: [Math.round(root.x), Math.round(root.y)], active: root.activeInHierarchy };
            const cells = [];
            (function walk(n) { if (/^cell_0_0$|^cell_19_19$|^cell_0_19$|^cell_19_0$/.test(n.name)) { const wp = n.convertToWorldSpaceAR(cc.v2(0, 0)); cells.push({ name: n.name, wx: Math.round(wp.x), wy: Math.round(wp.y), inside: wp.x >= 0 && wp.x <= vs.width && wp.y >= 0 && wp.y <= vs.height }); } (n.children || []).forEach(walk); })(root);
            out.cornerCells = cells;
            const names = ['editorSmall_previewWorld', 'editorSmall_previewLevel', 'editorSmall_exportJson', 'editorSmall_importJson'];
            out.buttons = names.map((nm) => { let nd = null; (function walk2(n) { if (!nd && n.name === nm) { nd = n; } (n.children || []).forEach(walk2); })(cc.find('Canvas')); if (!nd) { return { name: nm, missing: true }; } const wp = nd.convertToWorldSpaceAR(cc.v2(0, 0)); return { name: nm, wx: Math.round(wp.x), w: Math.round(nd.width), inside: (wp.x - nd.width / 2) >= 0 && (wp.x + nd.width / 2) <= vs.width }; });
            out.tabBar = (function () { const tb = window.hallScene && window.hallScene.tabBar && window.hallScene.tabBar.parent; if (!tb) { return null; } const b = tb.getBoundingBox(); return { active: tb.activeInHierarchy, x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height), z: tb.zIndex, siblings: (tb.parent ? tb.parent.children.length : 0) }; })();
            out.readout = (function () { let s = null; (function walk3(n) { if (!s && n.name === 'gridReadout') { const l = n.getComponent(cc.Label); s = l ? l.string : null; } (n.children || []).forEach(walk3); })(root); return s; })();
            return out;
        });
        log('gridfix_' + w + 'x' + h, m);
        await page.evaluate((t) => { let d = document.getElementById('probeAssertLine'); if (!d) { d = document.createElement('div'); d.id = 'probeAssertLine'; document.body.appendChild(d); } d.textContent = t; d.style.cssText = 'position:fixed;left:0;top:0;width:100%;padding:8px;background:#101018;color:#7CFFB2;font:15px monospace;z-index:2147483647'; }, 'GRIDFIX ' + w + 'x' + h + ' root:' + (m.root ? m.root.size.join('x') : 'none') + ' corners:' + (m.cornerCells || []).map((c) => (c.inside ? 'IN' : 'OUT')).join(',') + ' readout:' + m.readout);
        await sleep(300);
        await page.screenshot({ path: shot });
        return m;
    }
    await page.goto(FILE, { waitUntil: 'domcontentloaded', timeout: 120000 });
    await page.waitForFunction('window.cc && cc.game && cc.game._prepared === true', { timeout: 120000, polling: 150 });
    await toHall(); await sleep(2500);
    const a = await check(1440, 810, 'E:\\maze_dash\\docs\\screenshots\\72-gridfix-1440.png');
    const b = await check(1700, 1000, 'E:\\maze_dash\\docs\\screenshots\\73-gridfix-1700.png');
    log('SUMMARY', { '1440_root': a.root ? a.root.size : null, '1440_cornersIn': (a.cornerCells || []).filter((c) => c.inside).length + '/' + (a.cornerCells || []).length, '1440_buttonsIn': (a.buttons || []).filter((x) => x.inside).length + '/4', '1440_readout': a.readout, '1700_readout': b.readout });
    await browser.close(); process.exit(0);
})().catch((e) => { console.error('HARNESS ERROR', e); process.exit(1); });
