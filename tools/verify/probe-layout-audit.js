/* Layout audit for the whole scene, at three window sizes.
   Findings are reported, not fixed. Output: one JSON line per size plus a combined table.
   Checks per element (active nodes with a Label or text only):
     outside  - its world box is not fully inside 0..visibleW / 0..visibleH
     tabbar   - it overlaps the bottom tab bar's world box
     clipped  - the label's text is wider than its node (text would be cut)
     rawkey   - the label prints an i18n KEY instead of a translation
                (t(string) !== string while string looks like a key)
   Run from E:\maze_dash\_work\test with NODE_PATH pointing at its node_modules. */
const puppeteer = require('puppeteer-core');
const CHROME = 'C:\\Users\\Lenovo\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe';
const FILE = 'file:///E:/maze_dash/dist/MazeDash-standalone.html';
const SIZES = [[1440, 810], [1700, 1000], [1200, 800]];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const AUDIT_FN = function () {
    const vs = cc.view.getVisibleSize();
    const scene = cc.director.getScene();
    const out = [];
    const W = (n) => n.convertToWorldSpaceAR(cc.v2(0, 0));
    /* the tab bar's world box (if any) */
    let bar = null;
    try {
        const hall = window.hallScene;
        const barNode = hall && hall.tabBar ? hall.tabBar : null;
        if (barNode && barNode.isValid && barNode.activeInHierarchy) {
            const w = W(barNode);
            bar = { x0: w.x - barNode.width / 2, x1: w.x + barNode.width / 2, y0: w.y - barNode.height / 2, y1: w.y + barNode.height / 2 };
        }
    } catch (e) {}
    let tfn = null;
    try { tfn = MazeDashCustomTab && MazeDashCustomTab.t ? MazeDashCustomTab.t : null; } catch (e) {}
    const walk = (n, depth) => {
        if (!n || !n.activeInHierarchy || depth > 9) { return; }
        const lab = n.getComponent && n.getComponent(cc.Label);
        const txt = lab ? String(lab.string || '') : '';
        /* audit text nodes AND the editor's own interactive nodes (their BOX can be off screen even
           when the inner label is not, e.g. editorSmall_* / tool_* / swatch_*) */
        const named = /^(editorSmall_|editorBtn_|tool_|swatch_|grid)/.test(String(n.name || ''));
        if ((txt || named) && n.width > 0 && n.height > 0) {
            const w = W(n);
            const box = { x0: w.x - n.width / 2, x1: w.x + n.width / 2, y0: w.y - n.height / 2, y1: w.y + n.height / 2 };
            const rec = { name: n.name, depth: depth, text: txt.slice(0, 28), box: { x0: Math.round(box.x0), x1: Math.round(box.x1), y0: Math.round(box.y0), y1: Math.round(box.y1) }, issues: [] };
            const fullyOff = (box.x1 < -2 || box.x0 > vs.width + 2 || box.y1 < -2 || box.y0 > vs.height + 2);
            /* Fully off screen is how the OTHER pager pages live (they sit at +-one page width), so it
               is reported separately and never counted as a defect. Partially visible + clipped is. */
            if (fullyOff) { rec.issues.push('offpage'); }
            else if (box.x0 < -2 || box.x1 > vs.width + 2 || box.y0 < -2 || box.y1 > vs.height + 2) { rec.issues.push('outside'); }
            if (bar && !fullyOff && (lab || (n.getComponent && n.getComponent(cc.Sprite))) && box.y0 < bar.y1 && box.x1 > bar.x0 && box.x0 < bar.x1) { rec.issues.push('tabbar'); }
            const aw = lab ? (lab.actualWidth || 0) : 0;
            const avail = n.width - 8;
            if (aw > 0 && aw > avail) { rec.issues.push('clipped(' + Math.round(aw) + '>' + Math.round(avail) + ')'); }
            const looksLikeKey = /^[a-z][a-zA-Z0-9]{2,24}$/.test(txt);
            if (looksLikeKey) {
                let tr = txt;
                try { if (window.MazeDashCustomTab && typeof window.MazeDashCustomTab.t === 'function') { tr = window.MazeDashCustomTab.t(txt); } } catch (e) {}
                if (tr && tr !== txt) { rec.issues.push('rawkey(' + tr + ')'); }
            }
            if (rec.issues.length) { out.push(rec); }
        }
        (n.children || []).forEach((c) => walk(c, depth + 1));
    };
    walk(scene, 0);
    return { vs: { w: Math.round(vs.width), h: Math.round(vs.height) }, bar: bar, findings: out };
};

(async () => {
    const browser = await puppeteer.launch({
        executablePath: CHROME, headless: 'new',
        userDataDir: 'E:\\maze_dash\\_work\\test\\chrome-profile-layoutaudit',
        protocolTimeout: 240000,
        args: ['--no-sandbox', '--disable-extensions', '--no-first-run', '--mute-audio',
            '--allow-file-access-from-files', '--enable-unsafe-swiftshader', '--use-gl=angle',
            '--use-angle=swiftshader', '--autoplay-policy=no-user-gesture-required']
    });
    const all = [];
    for (const [w, h] of SIZES) {
        const page = await browser.newPage();
        const errs = [];
        page.on('pageerror', (e) => errs.push(String(e.message).slice(0, 120)));
        await page.setViewport({ width: w, height: h });
        await page.goto(FILE, { waitUntil: 'domcontentloaded', timeout: 120000 });
        await page.waitForFunction('window.cc && cc.game && cc.game._prepared === true', { timeout: 120000, polling: 150 });
        const scene = () => page.evaluate(() => (cc.director.getScene() ? cc.director.getScene().name : null));
        const tap = async (x, y, s) => { await page.mouse.move(x, y); await page.mouse.down(); await sleep(70); await page.mouse.up(); await sleep(s || 800); };
        for (let i = 0; i < 90; i++) {
            if ((await scene()) === 'HallScene') { break; }
            if (i % 3 === 1) { await tap(w / 2, h / 2, 500); } else { await sleep(400); }
        }
        await sleep(3500);
        const hall = await page.evaluate(AUDIT_FN);
        /* open the grid editor too, and audit that as well */
        await page.evaluate(() => { try { window.MazeDashCustomTab.openGridEditor(); } catch (e) {} });
        await sleep(1600);
        const grid = await page.evaluate(AUDIT_FN);
        const rec = { size: w + 'x' + h, hall: hall, grid: grid, errs: errs.slice(0, 3) };
        all.push(rec);
        console.log('SIZE ' + w + 'x' + h + ' vs=' + JSON.stringify(hall.vs) + ' hallFindings=' + hall.findings.length + ' gridFindings=' + grid.findings.length + ' errs=' + errs.length);
        console.log('  HALL ' + JSON.stringify(hall.findings.map((f) => f.name + '[' + f.issues.join('|') + ']')));
        console.log('  GRID ' + JSON.stringify(grid.findings.map((f) => f.name + '[' + f.issues.join('|') + ']')));
        await page.screenshot({ path: 'E:\\maze_dash\\_work\\test\\shots\\audit-' + w + '.png' });
        await page.close();
    }
    require('fs').writeFileSync('E:\\maze_dash\\_work\\test\\layout-audit.json', JSON.stringify(all, null, 1));
    await browser.close();
    process.exit(0);
})().catch((e) => { console.error('HARNESS ERROR', e); process.exit(1); });
