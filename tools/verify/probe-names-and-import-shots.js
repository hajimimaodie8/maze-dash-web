/* ① 编辑器色块真实名 ② 红主角真实节点 ③ 对话框真实关闭 ④ 导入闭环三张截图（断言画进画面）
   运行：NODE_PATH=E:\maze_dash\_work\test\node_modules node tools/verify/probe-names-and-import-shots.js */
const puppeteer = require('puppeteer-core');
const CHROME = 'C:\\Users\\Lenovo\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe';
const FILE = 'file:///E:/maze_dash/dist/MazeDash-standalone.html';
const SHOTS = 'E:\\maze_dash\\docs\\screenshots\\';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const log = (k, v) => console.log('N ' + k + ':', typeof v === 'string' ? v : JSON.stringify(v));
async function banner(page, text, colour) {
    await page.evaluate((t, c) => {
        let d = document.getElementById('probeAssertLine');
        if (!d) { d = document.createElement('div'); d.id = 'probeAssertLine'; document.body.appendChild(d); }
        d.textContent = t;
        d.style.cssText = 'position:fixed;left:0;top:0;width:100%;padding:8px 12px;background:#101018;color:' + c + ';font:16px/1.35 monospace;z-index:2147483647';
    }, text, colour || '#7CFFB2');
    await sleep(250);
}
const overlayErr = (page) => page.evaluate(() => /运行出错|Uncaught|TypeError/.test((document.body && document.body.innerText) || ''));

(async () => {
    const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new',
        userDataDir: 'E:\\maze_dash\\_work\\test\\chrome-profile-names', protocolTimeout: 300000,
        args: ['--no-sandbox','--disable-extensions','--no-first-run','--mute-audio','--allow-file-access-from-files','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader'],
        defaultViewport: { width: 1440, height: 810 } });
    const page = await browser.newPage();
    const errs = []; page.on('pageerror', (e) => errs.push(String(e.message).slice(0, 100)));
    const scene = () => page.evaluate(() => (cc.director.getScene() ? cc.director.getScene().name : '?'));
    async function tap(x, y, s) { await page.mouse.move(x, y); await page.mouse.down(); await sleep(70); await page.mouse.up(); await sleep(s || 900); }
    async function toHall() { for (let i = 0; i < 120; i++) { if ((await scene()) === 'HallScene') { return true; } if (i % 3 === 1) { await tap(720, 400, 500); } else { await sleep(400); } } return false; }

    /* ---------- ② red mascot: sample on AnimScene and dump the subtree ---------- */
    await page.goto(FILE, { waitUntil: 'domcontentloaded', timeout: 120000 });
    await page.waitForFunction('window.cc && cc.game && cc.game._prepared === true', { timeout: 120000, polling: 150 });
    let mascot = null;
    for (let i = 0; i < 100; i++) {
        if ((await scene()) === 'AnimScene') {
            mascot = await page.evaluate(() => {
                const root = cc.find('Canvas/begin');
                const rows = [], hits = [];
                (function walk(n, d) {
                    const sp = n.getComponent && n.getComponent(cc.Sprite);
                    const c = n.color ? [n.color.r, n.color.g, n.color.b] : null;
                    if (rows.length < 26) { rows.push(n.name + '@' + d + ' c=' + (c ? c.join(',') : '-') + (sp ? ' SPRITE' : '')); }
                    if (sp && c && c[0] === 255 && c[1] === 71 && c[2] === 71 && n.activeInHierarchy) { hits.push(n.name); }
                    (n.children || []).forEach((k) => walk(k, d + 1));
                })(root, 0);
                return { rootFound: !!root, rows: rows, redSpriteNodes: hits };
            });
            break;
        }
        await sleep(200);
    }
    log('2_mascot', mascot || 'AnimScene not reached');

    await toHall();
    await sleep(3000);

    /* ---------- ① editor names + swatch count + overlap ---------- */
    const ed = await page.evaluate(async () => {
        const api = window.MazeDashCustomTab; api.openGridEditor();
        for (let i = 0; i < 80; i++) { if (api.gridEditor && api.gridEditor.grid && !api.gridEditor.pending) { break; } await new Promise((r) => setTimeout(r, 100)); }
        const root = cc.find('Canvas/gridEditor');
        const names = [];
        (function walk(n) { if (names.length < 60) { names.push(n.name); } (n.children || []).forEach(walk); })(root);
        let swatch = 0; const boxes = [];
        (function walk(n) {
            if (/colour|swatch|palette|chip/i.test(n.name) && n.getComponent(cc.Sprite)) {
                const b = n.getBoundingBox(); if (b && b.width > 8 && b.height > 8) { swatch++; boxes.push({ n: n.name, x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height) }); }
            }
            (n.children || []).forEach(walk);
        })(root);
        let saveBox = null, rowBox = null;
        (function walk(n) {
            if (/save/i.test(n.name) && n.getComponent(cc.Sprite)) { const b = n.getBoundingBox(); if (!saveBox && b) { saveBox = { x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height) }; } }
            (n.children || []).forEach(walk);
        })(root);
        // the tool row: the widest sprite node that contains tool_ children
        (function walk(n) {
            if (rowBox) { return; }
            const hasTool = (n.children || []).some((k) => /^tool_/.test(k.name));
            if (hasTool) { const b = n.getBoundingBox(); if (b) { rowBox = { x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height) }; } }
            (n.children || []).forEach(walk);
        })(root);
        const inter = (a, b) => !!a && !!b && a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
        return { nameSample: names.slice(0, 40), swatches: swatch, swatchBoxes: boxes.slice(0, 5), saveBox: saveBox, toolRowBox: rowBox, overlapSaveVsTools: inter(saveBox, rowBox) };
    });
    log('1_editor', ed);

    /* ---------- ③ dialog: open, print names, close via the real button ---------- */
    const dlg = await page.evaluate(async () => {
        const api = window.MazeDashCustomTab;
        try { api.gridEditor.close(); } catch (e) {}
        await new Promise((r) => setTimeout(r, 500));
        try { api.editorAction('createWorld'); } catch (e) { return { openFailed: String(e.message).slice(0, 80) }; }
        await new Promise((r) => setTimeout(r, 900));
        const names = [];
        (function walk(n) { if (names.length < 40 && /dialog|close|cancel|color|swatch|input|field|world/i.test(n.name)) { names.push(n.name); } (n.children || []).forEach(walk); })(cc.find('Canvas'));
        const inputsOpen = document.querySelectorAll('input').length;
        let clicked = null;
        (function walk(n) { if (!clicked && /close|cancel|back/i.test(n.name) && n.activeInHierarchy && n.getComponent(cc.Sprite)) { try { n.emit(cc.Node.EventType.TOUCH_END); clicked = n.name; } catch (e) {} } (n.children || []).forEach(walk); })(cc.find('Canvas'));
        await new Promise((r) => setTimeout(r, 700));
        return { names: names, inputsOpen: inputsOpen, clicked: clicked, inputsAfterClose: document.querySelectorAll('input').length };
    });
    log('3_dialog', dlg);

    /* ---------- ④ import closed loop with three screenshots ---------- */
    await page.evaluate(() => { try { window.MazeDashCustomTab.gridEditor.close(); } catch (e) {} });
    await sleep(800);
    const hall = await page.evaluate(() => ({ view: !!(window.hallScene && window.hallScene.viewGroup && window.hallScene.viewGroup[5]) }));
    await banner(page, 'IMPORT LOOP step1: editor home visible:' + hall.view + ' dialogInputsAfterClose:' + (dlg.inputsAfterClose));
    await page.screenshot({ path: SHOTS + '65-import-entry.png' });

    const payload = await page.evaluate(() => JSON.stringify(window.MazeDashCustomTab.buildExportData()));
    await page.evaluate(() => { try { localStorage.removeItem('maze_dash_custom_levels'); localStorage.removeItem('maze_dash_custom_worlds'); } catch (e) {} });
    await page.reload({ waitUntil: 'domcontentloaded', timeout: 120000 });
    await page.waitForFunction('window.cc && cc.game && cc.game._prepared === true', { timeout: 120000, polling: 150 });
    await toHall(); await sleep(3000);
    const imp = await page.evaluate((json) => {
        const res = window.MazeDashCustomTab.importCustomJson(json);
        window.MazeDashCustomTab.showImportSummary(res);
        return { res: res, summary: window.MazeDashCustomTab.stats.importSummary || null, rows: (conf.all_Level[10101] || []).length, stageKeys: Object.keys(conf.stage_level_cfg[101] || {}) };
    }, payload);
    log('4_import', imp);
    const ov2 = await overlayErr(page);
    await banner(page, 'IMPORT ok:' + imp.res.ok + ' levels:' + imp.res.levels + ' colours:' + imp.res.colours + ' rows:' + imp.rows + ' stageKeys:' + imp.stageKeys.join('/') + ' overlay:' + ov2, ov2 ? '#FF8080' : '#7CFFB2');
    if (!ov2) { await page.screenshot({ path: SHOTS + '66-import-result.png' }); }

    await page.evaluate(() => { try { gamemain.enterEnterGameScene(10101); } catch (e) {} });
    let entered = false;
    for (let i = 0; i < 100; i++) { const r = await page.evaluate(() => { const m = cc.find('Canvas/backgroup/game_map'); const cp = m && m.getComponent && m.getComponent('game_map'); return !!(cp && cp.Level_data); }); if (r) { entered = true; break; } await sleep(150); }
    const fin = await page.evaluate(() => {
        const m = cc.find('Canvas/backgroup/game_map'); const cp = m && m.getComponent && m.getComponent('game_map');
        const out = { ok: false, overlay: /运行出错|Uncaught|TypeError/.test((document.body && document.body.innerText) || '') };
        if (cp && cp.Level_data) {
            const ps = []; let heads = 0;
            Object.keys(cp.Level_data).forEach((y) => Object.keys(cp.Level_data[y]).forEach((x) => { const v = cp.Level_data[y][x]; if (v === -1) { heads++; } if (v === 2) { ps.push([parseInt(x, 10), parseInt(y, 10)]); } }));
            out.ok = true; out.rows = Object.keys(cp.Level_data).length; out.heads = heads;
            out.pairing = ps.map((p) => { const d = cp.getOutPortal(cc.v2(p[0], p[1])); return p.join(',') + '->' + d.x + ',' + d.y; });
        }
        return out;
    });
    log('4b_afterImportEnter', Object.assign({ entered: entered, pageErrors: errs.length }, fin));
    const pass = entered && fin.ok && !fin.overlay;
    await banner(page, 'IMPORT-ENTER ok:' + pass + ' rows:' + fin.rows + ' heads:' + fin.heads + ' pairing:' + (fin.pairing || []).join(' '), pass ? '#7CFFB2' : '#FF8080');
    if (pass) { await page.screenshot({ path: SHOTS + '67-import-played.png' }); }
    console.log('N screenshots:', JSON.stringify({ entry: true, result: !ov2, played: pass }));
    console.log('N errors:', JSON.stringify(errs.slice(0, 3)));
    await browser.close(); process.exit(0);
})().catch((e) => { console.error('HARNESS ERROR', e); process.exit(1); });
