const puppeteer = require('puppeteer-core');
const CHROME = 'C:\\Users\\Lenovo\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe';
const FILE = 'file:///E:/maze_dash/dist/MazeDash-standalone.html';
const SHOTS = 'E:\\maze_dash\\docs\\screenshots\\';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const log = (k, v) => console.log('F ' + k + ':', typeof v === 'string' ? v : JSON.stringify(v));
async function banner(page, t, c) { await page.evaluate((x, k) => { let d = document.getElementById('probeAssertLine'); if (!d) { d = document.createElement('div'); d.id = 'probeAssertLine'; document.body.appendChild(d); } d.textContent = x; d.style.cssText = 'position:fixed;left:0;top:0;width:100%;padding:8px 12px;background:#101018;color:' + k + ';font:16px/1.35 monospace;z-index:2147483647'; }, t, c || '#7CFFB2'); await sleep(250); }
(async () => {
    const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', userDataDir: 'E:\\maze_dash\\_work\\test\\chrome-profile-final', protocolTimeout: 300000,
        args: ['--no-sandbox','--disable-extensions','--no-first-run','--mute-audio','--allow-file-access-from-files','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader'], defaultViewport: { width: 1440, height: 810 } });
    const page = await browser.newPage();
    const errs = []; page.on('pageerror', (e) => errs.push(String(e.message).slice(0, 90)));
    const scene = () => page.evaluate(() => (cc.director.getScene() ? cc.director.getScene().name : '?'));
    async function tap(x, y, s) { await page.mouse.move(x, y); await page.mouse.down(); await sleep(70); await page.mouse.up(); await sleep(s || 900); }
    const ov = () => page.evaluate(() => /运行出错|Uncaught|TypeError/.test((document.body && document.body.innerText) || ''));
    async function toHall() { for (let i = 0; i < 120; i++) { if ((await scene()) === 'HallScene') { return; } if (i % 3 === 1) { await tap(720, 400, 500); } else { await sleep(400); } } }

    await page.goto(FILE, { waitUntil: 'domcontentloaded', timeout: 120000 });
    await page.waitForFunction('window.cc && cc.view', { timeout: 120000, polling: 50 });
    const w = []; for (let i = 0; i < 8; i++) { w.push(await page.evaluate(() => Math.round(cc.view.getVisibleSize().width))); await sleep(60); }
    await page.waitForFunction('window.cc && cc.game && cc.game._prepared === true', { timeout: 120000, polling: 150 });
    let mascot = null;
    for (let i = 0; i < 100; i++) { if ((await scene()) === 'AnimScene') { mascot = await page.evaluate(() => { const n = cc.find('Canvas/begin/main/white_bg'); if (!n) { return { found: false }; } return { found: true, colour: [n.color.r, n.color.g, n.color.b], sprite: !!n.getComponent(cc.Sprite), active: n.activeInHierarchy }; }); break; } await sleep(200); }
    log('R1_wide', { all: w, narrow: w.filter((x) => x < 2000).length });
    log('R2_mascot', mascot);
    await toHall(); await sleep(3000);

    const keys = await page.evaluate(async () => { let pages = 0; try { const s = cc.find('Canvas/gameView/scrollView').getComponent(cc.ScrollView); const o = s.scrollToPage.bind(s); s.scrollToPage = function () { pages++; return o.apply(s, arguments); }; } catch (e) { return { err: 1 }; } const p = (c, k) => document.dispatchEvent(new KeyboardEvent('keydown', { code: c, keyCode: k, bubbles: true })); p('KeyD', 68); await new Promise((r) => setTimeout(r, 900)); const a = pages; p('ArrowLeft', 37); await new Promise((r) => setTimeout(r, 900)); return { d: a, left: pages - a }; });
    log('R3_keys', keys);

    const dlg = await page.evaluate(async () => {
        const api = window.MazeDashCustomTab;
        const kids = [];
        try { api.editorAction('createWorld'); } catch (e) {}
        await new Promise((r) => setTimeout(r, 900));
        const d = cc.find('Canvas/editorDialog');
        if (d) { d.children.forEach((n) => kids.push(n.name + (n.getComponent(cc.Sprite) ? '/S' : '') + (n.getComponent(cc.Button) ? '/B' : ''))); }
        const inputsOpen = document.querySelectorAll('input').length;
        // close through the plugin's own path if exported, else a prefix-anchored name match
        let how = null;
        if (typeof api.closeDialog === 'function') { try { api.closeDialog(); how = 'closeDialog()'; } catch (e) {} }
        if (!how) {
            let target = null;
            (function walk(n) { if (!target && /^(btn_?)?(close|cancel|back)/i.test(n.name) && n.activeInHierarchy) { target = n; } (n.children || []).forEach(walk); })(cc.find('Canvas'));
            if (target) { target.emit(cc.Node.EventType.TOUCH_END); how = 'click:' + target.name; }
        }
        await new Promise((r) => setTimeout(r, 800));
        const open2 = await (async () => { try { api.editorAction('createWorld'); } catch (e) {} await new Promise((r) => setTimeout(r, 800)); return document.querySelectorAll('input').length; })();
        return { childNames: kids.slice(0, 16), inputsOpen: inputsOpen, how: how, inputsAfterClose: document.querySelectorAll('input').length - (open2 > 0 ? open2 : 0), dialogActiveAfterClose: !!(cc.find('Canvas/editorDialog') && cc.find('Canvas/editorDialog').activeInHierarchy && cc.find('Canvas/editorDialog').active), reopenInputs: open2 };
    });
    log('R4_dialog', dlg);

    const ed = await page.evaluate(async () => {
        const api = window.MazeDashCustomTab;
        try { api.editorAction && api.closeDialog && api.closeDialog(); } catch (e) {}
        api.openGridEditor();
        for (let i = 0; i < 80; i++) { if (api.gridEditor && api.gridEditor.grid && !api.gridEditor.pending) { break; } await new Promise((r) => setTimeout(r, 100)); }
        const root = cc.find('Canvas/gridEditor');
        let cells = 0, sw = 0, saveBox = null, rowBox = null;
        (function walk(n) { if (/^cell_\d+_\d+$/.test(n.name)) { cells++; } if (/^swatch_\d+$/.test(n.name) && n.getComponent(cc.Sprite)) { sw++; } if (/^gridPalette$/.test(n.name)) { const b = n.getBoundingBox(); rowBox = { x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height) }; } if (/save/i.test(n.name) && n.getComponent(cc.Sprite)) { const b = n.getBoundingBox(); if (b && (!saveBox || b.width > saveBox.w)) { saveBox = { x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height) }; } } (n.children || []).forEach(walk); })(root);
        const tb = window.hallScene && window.hallScene.tabBar && window.hallScene.tabBar.parent;
        const inter = !!saveBox && !!rowBox && saveBox.x < rowBox.x + rowBox.w && rowBox.x < saveBox.x + saveBox.w && saveBox.y < rowBox.y + rowBox.h && rowBox.y < saveBox.y + saveBox.h;
        return { cells: cells, swatches: sw, saveBox: saveBox, rowBox: rowBox, overlap: inter, tabBar: !!(tb && tb.activeInHierarchy) };
    });
    log('R5_editor', ed);
    await page.evaluate(() => { try { window.MazeDashCustomTab.gridEditor.close(); } catch (e) {} }); await sleep(800);

    await page.evaluate(() => { try { gamemain.enterEnterGameScene(10101); } catch (e) {} });
    let e6 = false; for (let i = 0; i < 100; i++) { const r = await page.evaluate(() => { const m = cc.find('Canvas/backgroup/game_map'); const cp = m && m.getComponent && m.getComponent('game_map'); return !!(cp && cp.Level_data); }); if (r) { e6 = true; break; } await sleep(150); }
    const p6 = await page.evaluate(() => { const m = cc.find('Canvas/backgroup/game_map'); const cp = m && m.getComponent && m.getComponent('game_map'); const ps = []; if (cp && cp.Level_data) { Object.keys(cp.Level_data).forEach((y) => Object.keys(cp.Level_data[y]).forEach((x) => { if (cp.Level_data[y][x] === 2) { ps.push([parseInt(x, 10), parseInt(y, 10)]); } })); } return ps.map((p) => { const d = cp.getOutPortal(cc.v2(p[0], p[1])); return p.join(',') + '->' + d.x + ',' + d.y; }); });
    log('R6_portals', { entered: e6, pairing: p6 });

    const payload = await page.evaluate(() => JSON.stringify(window.MazeDashCustomTab.buildExportData()));
    const exp = await page.evaluate(() => { const d = window.MazeDashCustomTab.buildExportData(); return { version: d.version, worlds: Object.keys(d.worlds || {}).length, levels: Object.keys(d.levels || {}).length, maps: Object.keys(d.maps || {}).length, colours: Object.keys(d.colours || {}).length }; });
    log('R7a_export', exp);
    await page.evaluate(() => { try { localStorage.removeItem('maze_dash_custom_levels'); localStorage.removeItem('maze_dash_custom_worlds'); } catch (e) {} });
    await page.reload({ waitUntil: 'domcontentloaded', timeout: 120000 });
    await page.waitForFunction('window.cc && cc.game && cc.game._prepared === true', { timeout: 120000, polling: 150 }); await toHall(); await sleep(3000);
    const imp = await page.evaluate((j) => { const api = window.MazeDashCustomTab; const res = api.importCustomJson(j); try { api.showImportSummary(res); } catch (e) {} return { res: res, summary: api.stats.importSummary || null, rows: (conf.all_Level[10101] || []).length, stageKeys: Object.keys(conf.stage_level_cfg[101] || {}) }; }, payload);
    log('R7b_import', imp);
    const ov2 = await ov();
    await banner(page, 'IMPORT ok:' + imp.res.ok + ' levels:' + imp.res.levels + ' colours:' + imp.res.colours + ' rows:' + imp.rows + ' stageKeys:' + imp.stageKeys.join('/') + ' overlay:' + ov2, ov2 ? '#FF8080' : '#7CFFB2');
    if (!ov2) { await page.screenshot({ path: SHOTS + '65-import-result.png' }); }
    await page.evaluate(() => { try { gamemain.enterEnterGameScene(10101); } catch (e) {} });
    let en = false; for (let i = 0; i < 100; i++) { const r = await page.evaluate(() => { const m = cc.find('Canvas/backgroup/game_map'); const cp = m && m.getComponent && m.getComponent('game_map'); return !!(cp && cp.Level_data); }); if (r) { en = true; break; } await sleep(150); }
    const fin = await page.evaluate(() => { const m = cc.find('Canvas/backgroup/game_map'); const cp = m && m.getComponent && m.getComponent('game_map'); const o = { overlay: /运行出错|Uncaught|TypeError/.test((document.body && document.body.innerText) || '') }; if (cp && cp.Level_data) { const ps = []; let h = 0; Object.keys(cp.Level_data).forEach((y) => Object.keys(cp.Level_data[y]).forEach((x) => { const v = cp.Level_data[y][x]; if (v === -1) { h++; } if (v === 2) { ps.push([parseInt(x, 10), parseInt(y, 10)]); } })); o.rows = Object.keys(cp.Level_data).length; o.heads = h; o.pairing = ps.map((p) => { const d = cp.getOutPortal(cc.v2(p[0], p[1])); return p.join(',') + '->' + d.x + ',' + d.y; }); } return o; });
    const pass = en && !fin.overlay && fin.rows === 6 && fin.heads === 3;
    log('R7c_importEnter', Object.assign({ entered: en, pass: pass, pageErrors: errs.length }, fin));
    await banner(page, 'IMPORT-ENTER pass:' + pass + ' rows:' + fin.rows + ' heads:' + fin.heads + ' pairing:' + (fin.pairing || []).join(' '), pass ? '#7CFFB2' : '#FF8080');
    if (pass) { await page.screenshot({ path: SHOTS + '67-import-played.png' }); }
    console.log('F errors:', JSON.stringify(errs.slice(0, 3)));
    await browser.close(); process.exit(0);
})().catch((e) => { console.error('HARNESS ERROR', e); process.exit(1); });
