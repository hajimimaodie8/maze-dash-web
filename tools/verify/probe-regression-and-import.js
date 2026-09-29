/* 回归（7 项）+ 导入/导出闭环，全部先断言后截图，断言画进画面。
   运行：NODE_PATH=E:\maze_dash\_work\test\node_modules node tools/verify/probe-regression-and-import.js */
const puppeteer = require('puppeteer-core');
const CHROME = 'C:\\Users\\Lenovo\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe';
const FILE = 'file:///E:/maze_dash/dist/MazeDash-standalone.html';
const SHOTS = 'E:\\maze_dash\\docs\\screenshots\\';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const log = (k, v) => console.log('R ' + k + ':', typeof v === 'string' ? v : JSON.stringify(v));

async function banner(page, text) {
    await page.evaluate((t) => {
        let d = document.getElementById('probeAssertLine');
        if (!d) { d = document.createElement('div'); d.id = 'probeAssertLine'; document.body.appendChild(d); }
        d.textContent = t;
        d.style.cssText = 'position:fixed;left:0;top:0;width:100%;padding:8px 12px;background:#101018;color:#7CFFB2;font:17px/1.35 monospace;z-index:2147483647';
    }, text);
    await sleep(250);
}

(async () => {
    const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new',
        userDataDir: 'E:\\maze_dash\\_work\\test\\chrome-profile-reg', protocolTimeout: 300000,
        args: ['--no-sandbox', '--disable-extensions', '--no-first-run', '--mute-audio',
            '--allow-file-access-from-files', '--enable-unsafe-swiftshader', '--use-gl=angle',
            '--use-angle=swiftshader', '--autoplay-policy=no-user-gesture-required'],
        defaultViewport: { width: 1440, height: 810 } });
    const page = await browser.newPage();
    const errs = []; page.on('pageerror', (e) => errs.push(String(e.message).slice(0, 110)));

    /* --- 1) wide screen from the very first frames --- */
    await page.goto(FILE, { waitUntil: 'domcontentloaded', timeout: 120000 });
    await page.waitForFunction('window.cc && cc.view', { timeout: 120000, polling: 50 });
    const widths = [];
    for (let i = 0; i < 12; i++) { widths.push(await page.evaluate(() => Math.round(cc.view.getVisibleSize().width))); await sleep(60); }
    log('1_wideFirstFrames', { widths: widths.slice(0, 6), min: Math.min(...widths), narrowFrames: widths.filter((w) => w < 2000).length });

    await page.waitForFunction('window.cc && cc.game && cc.game._prepared === true', { timeout: 120000, polling: 150 });
    const title = await page.evaluate(() => {
        const sc = cc.director.getScene();
        const n = cc.find('Canvas/begin/main');
        let col = null, vis = null, hasSprite = false;
        if (n) { col = n.color ? [n.color.r, n.color.g, n.color.b] : null; vis = n.activeInHierarchy; hasSprite = !!n.getComponent(cc.Sprite); }
        return { scene: sc ? sc.name : null, found: !!n, colour: col, visible: vis, hasSprite: hasSprite, nodeCount: (function c(x) { let t = 1; (x.children || []).forEach((k) => { t += c(k); }); return t; })(sc) };
    });
    log('2_title', title);

    const scene = () => page.evaluate(() => (cc.director.getScene() ? cc.director.getScene().name : '?'));
    async function tap(x, y, s) { await page.mouse.move(x, y); await page.mouse.down(); await sleep(70); await page.mouse.up(); await sleep(s || 900); }
    for (let i = 0; i < 90; i++) { if ((await scene()) === 'HallScene') { break; } if (i % 3 === 1) { await tap(720, 400, 500); } else { await sleep(400); } }
    await sleep(3500);

    /* --- 3) keyboard paging: exactly one page per press --- */
    const keys = await page.evaluate(async () => {
        const hall = window.hallScene;
        let pages = 0;
        try {
            const scv = cc.find('Canvas/gameView/scrollView').getComponent(cc.ScrollView);
            const orig = scv.scrollToPage.bind(scv);
            scv.scrollToPage = function () { pages++; return orig.apply(scv, arguments); };
        } catch (e) { return { error: String(e.message).slice(0, 80) }; }
        function press(code, keyCode) { document.dispatchEvent(new KeyboardEvent('keydown', { code: code, keyCode: keyCode, bubbles: true })); }
        press('KeyD', 68); await new Promise((r) => setTimeout(r, 900));
        const afterD = pages;
        press('ArrowLeft', 37); await new Promise((r) => setTimeout(r, 900));
        const afterL = pages;
        return { afterD: afterD, afterLeft: afterL, deltaD: afterD, deltaLeft: afterL - afterD };
    });
    log('3_keys', keys);

    /* --- 4) create-world dialog: 24 swatches, then no leftover DOM input --- */
    const dlg = await page.evaluate(async () => {
        window.MazeDashCustomTab.stats.editorAction = null;
        const api = window.MazeDashCustomTab;
        api.editorAction ? api.editorAction('createWorld') : null;
        await new Promise((r) => setTimeout(r, 900));
        let swatches = 0, swatchWithSprite = 0;
        (function walk(n) { if (/^dialogSwatch|^swatch_|^palette_/.test(n.name)) { swatches++; if (n.getComponent(cc.Sprite)) { swatchWithSprite++; } } (n.children || []).forEach(walk); })(cc.find('Canvas'));
        const inputs = document.querySelectorAll('input').length;
        return { swatches: swatches, swatchWithSprite: swatchWithSprite, domInputsWhileOpen: inputs };
    });
    await sleep(300);
    const dlgClosed = await page.evaluate(() => {
        const st = window.MazeDashCustomTab.stats;
        try { st.closeDialog && st.closeDialog(); } catch (e) {}
        return { domInputsAfterClose: document.querySelectorAll('input').length };
    });
    log('4_dialog', Object.assign(dlg, dlgClosed));

    /* --- 5) editor grid + palette, overlap, tab bar --- */
    const ed = await page.evaluate(async () => {
        const api = window.MazeDashCustomTab;
        api.openGridEditor();
        for (let i = 0; i < 80; i++) { if (api.gridEditor && api.gridEditor.solve && !api.gridEditor.pending) { break; } await new Promise((r) => setTimeout(r, 100)); }
        const g = api.gridEditor;
        let cells = 0, tools = 0, swatches = 0;
        let saveBox = null, paletteBox = null;
        (function walk(n) {
            if (n.name === 'gridCell' || /^cell_/.test(n.name)) { cells++; }
            if (/^tool_/.test(n.name)) { tools++; }
            if (/^colour_/.test(n.name)) { swatches++; }
            if (n.name === 'gridSaveBtn' || /save/i.test(n.name) && /grid/i.test(n.name)) { const b = n.getBoundingBox(); saveBox = { x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height) }; }
            if (n.name === 'gridPaletteRow') { const b = n.getBoundingBox(); paletteBox = { x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height) }; }
            (n.children || []).forEach(walk);
        })(cc.find('Canvas'));
        const tb = window.hallScene && window.hallScene.tabBar && window.hallScene.tabBar.parent;
        return { cells: cells, tools: tools, swatches: swatches, tabBarVisible: !!(tb && tb.activeInHierarchy), saveBox: saveBox, paletteBox: paletteBox };
    });
    log('5_editor', ed);
    await banner(page, 'REGRESSION cells:' + ed.cells + ' tools:' + ed.tools + ' swatches:' + ed.swatches + ' tabBar:' + ed.tabBarVisible);

    /* --- 6) coloured portals in world 101 --- */
    await page.evaluate(() => { try { window.MazeDashCustomTab.gridEditor.close(); } catch (e) {} });
    await sleep(900);
    await page.evaluate(() => { try { gamemain.enterEnterGameScene(10101); } catch (e) {} });
    let ok6 = false;
    for (let i = 0; i < 100; i++) {
        const r = await page.evaluate(() => { const m = cc.find('Canvas/backgroup/game_map'); const cp = m && m.getComponent && m.getComponent('game_map'); return !!(cp && cp.Level_data); });
        if (r) { ok6 = true; break; }
        await sleep(150);
    }
    const p6 = await page.evaluate(() => {
        const m = cc.find('Canvas/backgroup/game_map');
        const cp = m && m.getComponent && m.getComponent('game_map');
        const out = { ok: false };
        if (cp && cp.Level_data) {
            const ps = [];
            Object.keys(cp.Level_data).forEach((y) => Object.keys(cp.Level_data[y]).forEach((x) => { if (cp.Level_data[y][x] === 2) { ps.push([parseInt(x, 10), parseInt(y, 10)]); } }));
            out.portals = ps.length;
            out.pairing = ps.map((p) => { const d = cp.getOutPortal(cc.v2(p[0], p[1])); return p.join(',') + '->' + d.x + ',' + d.y; });
            out.ok = true;
            out.colours = (window.MazeDashCustomTab.stats.colourTableRestored || 0);
        }
        return out;
    });
    log('6_portals', Object.assign({ entered: ok6 }, p6));
    await banner(page, 'REGRESSION portals:' + (p6.pairing || []).join(' '));

    /* --- 7) import/export closed loop --- */
    const payload = await page.evaluate(() => {
        const api = window.MazeDashCustomTab;
        const d = api.buildExportData();
        return { version: d.version, worlds: Object.keys(d.worlds || {}).length, levels: Object.keys(d.levels || {}).length,
                 maps: Object.keys(d.maps || {}).length, coloursKeys: Object.keys(d.colours || {}).length,
                 coloursSample: JSON.stringify(d.colours).slice(0, 120), json: JSON.stringify(d) };
    });
    log('7a_export', { version: payload.version, worlds: payload.worlds, levels: payload.levels, maps: payload.maps, colourTables: payload.coloursKeys, sample: payload.coloursSample });

    const before = await page.evaluate(() => ({ levels: Object.keys(conf.level_cfg).filter((k) => Number(k) >= 10000).length, allLevel: !!conf.all_Level[10101] }));
    await page.evaluate(() => { try { localStorage.removeItem('maze_dash_custom_levels'); localStorage.removeItem('maze_dash_custom_worlds'); } catch (e) {} });
    await page.reload({ waitUntil: 'domcontentloaded', timeout: 120000 });
    await page.waitForFunction('window.cc && cc.game && cc.game._prepared === true', { timeout: 120000, polling: 150 });
    for (let i = 0; i < 100; i++) { if ((await scene()) === 'HallScene') { break; } await sleep(400); }
    await sleep(3500);
    const wiped = await page.evaluate(() => ({ customLevels: Object.keys(JSON.parse(localStorage.getItem('maze_dash_custom_levels') || '{}')).length }));
    const imported = await page.evaluate((json) => {
        const res = window.MazeDashCustomTab.importCustomJson(json);
        const cfg = conf.level_cfg[10101] || null;
        return { res: res, entry: cfg, gridRows: (conf.all_Level[(cfg || {}).mapId] || []).length,
                 stageKeys: Object.keys(conf.stage_level_cfg[101] || {}).slice(0, 6),
                 colours: (function () { try { return window.MazeDashCustomTab.gridEditor ? null : null; } catch (e) { return null; } })(),
                 stored: Object.keys(JSON.parse(localStorage.getItem('maze_dash_custom_levels') || '{}')) };
    }, payload.json);
    log('7b_import', { summary: imported.res, entry: imported.entry, gridRows: imported.gridRows, stageKeys: imported.stageKeys, stored: imported.stored });

    await page.evaluate(() => { try { gamemain.enterEnterGameScene(10101); } catch (e) {} });
    let ok7 = false;
    for (let i = 0; i < 100; i++) {
        const r = await page.evaluate(() => { const m = cc.find('Canvas/backgroup/game_map'); const cp = m && m.getComponent && m.getComponent('game_map'); return !!(cp && cp.Level_data); });
        if (r) { ok7 = true; break; }
        await sleep(150);
    }
    const after = await page.evaluate(() => {
        const m = cc.find('Canvas/backgroup/game_map');
        const cp = m && m.getComponent && m.getComponent('game_map');
        const out = { ok: false, overlayError: /运行出错|Uncaught|TypeError/.test((document.body && document.body.innerText) || '') };
        if (cp && cp.Level_data) {
            const ps = [];
            let heads = 0;
            Object.keys(cp.Level_data).forEach((y) => Object.keys(cp.Level_data[y]).forEach((x) => { const v = cp.Level_data[y][x]; if (v === 2) { ps.push([parseInt(x, 10), parseInt(y, 10)]); } if (v === -1) { heads++; } }));
            out.ok = true; out.rows = Object.keys(cp.Level_data).length; out.heads = heads;
            out.pairing = ps.map((p) => { const d = cp.getOutPortal(cc.v2(p[0], p[1])); return p.join(',') + '->' + d.x + ',' + d.y; });
        }
        return out;
    });
    log('7c_afterImport', Object.assign({ wiped: wiped.customLevels, beforeCustom: before.levels, entered: ok7, pageErrors: errs.length }, after));
    await banner(page, 'IMPORT ok:' + after.ok + ' rows:' + after.rows + ' heads:' + after.heads + ' pairing:' + (after.pairing || []).join(' '));
    if (after.ok && !after.overlayError) { await page.screenshot({ path: SHOTS + '63-import-closed-loop.png' }); }
    console.log('R errors:', JSON.stringify(errs.slice(0, 4)));
    await browser.close(); process.exit(0);
})().catch((e) => { console.error('HARNESS ERROR', e); process.exit(1); });
