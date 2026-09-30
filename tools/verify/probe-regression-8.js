/* Task C: the 8-item regression, in one run, against the single-file build.
   R1 wide first frame, R2 title hero sprite, R3 keyboard paging, R4 create-world dialog,
   R5 editor (grid/palette/overlap/tab bar), R6 coloured portal pairing, R7a export,
   R7b import, R7c import -> enter (P1 with profile, P2 after wiping localStorage).
   Run from E:\maze_dash\_work\test with NODE_PATH pointing at its node_modules. */
const puppeteer = require('puppeteer-core');
const CHROME = 'C:\\Users\\Lenovo\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe';
const FILE = 'file:///E:/maze_dash/dist/MazeDash-standalone.html';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const out = {};

async function boot(browser, wipe, vw, vh) {
    const page = await browser.newPage();
    const errs = [];
    page.on('pageerror', (e) => errs.push(String(e.message).slice(0, 120)));
    await page.setViewport({ width: vw || 1440, height: vh || 810 });
    if (wipe) {
        await page.goto(FILE, { waitUntil: 'domcontentloaded', timeout: 120000 });
        await page.evaluate(() => { try { localStorage.clear(); } catch (e) {} });
        await page.reload({ waitUntil: 'domcontentloaded', timeout: 120000 });
    } else {
        await page.goto(FILE, { waitUntil: 'domcontentloaded', timeout: 120000 });
    }
    await page.waitForFunction('window.cc && cc.game && cc.game._prepared === true', { timeout: 120000, polling: 150 });
    const scene = () => page.evaluate(() => (cc.director.getScene() ? cc.director.getScene().name : null));
    const tap = async (x, y, s) => { await page.mouse.move(x, y); await page.mouse.down(); await sleep(70); await page.mouse.up(); await sleep(s || 800); };
    for (let i = 0; i < 90; i++) {
        if ((await scene()) === 'HallScene') { break; }
        if (i % 3 === 1) { await tap((vw || 1440) / 2, (vh || 810) / 2, 500); } else { await sleep(400); }
    }
    await sleep(3200);
    return { page, errs, scene, tap };
}

(async () => {
    const browser = await puppeteer.launch({
        executablePath: CHROME, headless: 'new',
        userDataDir: 'E:\\maze_dash\\_work\\test\\chrome-profile-regress',
        protocolTimeout: 300000,
        args: ['--no-sandbox', '--disable-extensions', '--no-first-run', '--mute-audio',
            '--allow-file-access-from-files', '--enable-unsafe-swiftshader', '--use-gl=angle',
            '--use-angle=swiftshader', '--autoplay-policy=no-user-gesture-required']
    });

    /* ---------- R2 : the title scene's red hero sprite (separate session, before the hall) ---------- */
    {
        const page = await browser.newPage();
        await page.setViewport({ width: 1440, height: 810 });
        await page.goto(FILE, { waitUntil: 'domcontentloaded', timeout: 120000 });
        await page.waitForFunction('window.cc && cc.game && cc.game._prepared === true', { timeout: 120000, polling: 150 });
        let r2 = { node: null, scene: null };
        for (let i = 0; i < 60; i++) {
            r2 = await page.evaluate(() => {
                const sc = cc.director.getScene();
                const name = sc ? sc.name : null;
                let hit = null;
                (function w(n) { if (hit) { return; } if (n.name === 'main') { const c = n.getChildByName('white_bg'); if (c) { hit = c; } } (n.children || []).forEach(w); })(sc);
                if (!hit) { return { node: null, scene: name }; }
                return { node: hit.name, scene: name, colour: [hit.color.r, hit.color.g, hit.color.b], sprite: !!hit.getComponent(cc.Sprite), active: hit.activeInHierarchy };
            });
            if (r2.node) { break; }
            await sleep(400);
        }
        out.R2 = r2;
        await page.close();
    }

    /* ---------- R1 / R3 / R5 : one session ---------- */
    {
        const { page, errs, tap } = await boot(browser, false);
        out.R1 = await page.evaluate(() => {
            const samples = [];
            for (let i = 0; i < 8; i++) { samples.push(Math.round(cc.view.getVisibleSize().width)); }
            return { samples: samples, narrow: samples.filter((w) => w < 1000).length };
        });
        /* R3 keyboard: one page per press */
        out.R3 = await page.evaluate(() => new Promise((res) => {
            const scv = cc.find('Canvas/gameView/scrollView').getComponent(cc.ScrollView);
            const before = scv.getContentPosition().x;
            const ev = new KeyboardEvent('keydown', { code: 'KeyD', key: 'd', bubbles: true, cancelable: true });
            document.dispatchEvent(ev);
            setTimeout(() => { res({ delta: Math.abs(scv.getContentPosition().x - before) > 1 ? 1 : 0 }); }, 900);
        }));

        /* R4: the editor's create-world dialog, driven through the real tab bar and button.
           (The game's own default_panel is a different thing; the earlier probe checked the wrong node.) */
        const r4 = await page.evaluate(() => {
            const find = (name) => { let h = null; (function w(n) { if (h) { return; } if (n.name === name) { h = n; return; } (n.children || []).forEach(w); })(cc.director.getScene()); return h; };
            const tab = find('customBar');
            return { tabFound: !!tab, tabActive: !!(tab && tab.activeInHierarchy) };
        });
        if (r4.tabFound) {
            const p = await page.evaluate(() => {
                const find = (name) => { let h = null; (function w(n) { if (h) { return; } if (n.name === name) { h = n; return; } (n.children || []).forEach(w); })(cc.director.getScene()); return h; };
                const n = find('customBar');
                const w = n.convertToWorldSpaceAR(cc.v2(0, 0));
                const vs = cc.view.getVisibleSize(), rect = cc.game.canvas.getBoundingClientRect();
                const sx = vs.width / rect.width, sy = vs.height / rect.height;
                return { x: rect.left + w.x / sx, y: rect.top + rect.height - w.y / sy };
            });
            await tap(p.x, p.y, 1200);
        }
        const r4open = await page.evaluate(() => {
            const find = (name) => { let h = null; (function w(n) { if (h) { return; } if (n.name === name) { h = n; return; } (n.children || []).forEach(w); })(cc.director.getScene()); return h; };
            const btn = find('editorBtn_createWorld');
            if (!btn) { return { btnFound: false }; }
            const w = btn.convertToWorldSpaceAR(cc.v2(0, 0));
            const vs = cc.view.getVisibleSize(), rect = cc.game.canvas.getBoundingClientRect();
            const sx = vs.width / rect.width, sy = vs.height / rect.height;
            return { btnFound: true, btnActive: btn.activeInHierarchy, x: rect.left + w.x / sx, y: rect.top + rect.height - w.y / sy };
        });
        if (r4open.btnFound && r4open.btnActive) {
            await tap(r4open.x, r4open.y, 1000);
            out.R4 = await page.evaluate(() => {
                const find = (name) => { let h = null; (function w(n) { if (h) { return; } if (n.name === name) { h = n; return; } (n.children || []).forEach(w); })(cc.director.getScene()); return h; };
                const dlg = find('editorDialog');
                let swatches = 0;
                (function c(n) { if (/^swatch_/.test(n.name)) { swatches++; } (n.children || []).forEach(c); })(cc.director.getScene());
                return { dialogOpen: !!(dlg && dlg.activeInHierarchy), swatches: swatches, domInputs: document.querySelectorAll('input').length };
            });
            /* close through the real `dim` node (the measured close path) */
            const dp = await page.evaluate(() => {
                const find = (name) => { let h = null; (function w(n) { if (h) { return; } if (n.name === name) { h = n; return; } (n.children || []).forEach(w); })(cc.director.getScene()); return h; };
                const dim = find('dim');
                if (!dim) { return null; }
                const w = dim.convertToWorldSpaceAR(cc.v2(0, 0));
                const vs = cc.view.getVisibleSize(), rect = cc.game.canvas.getBoundingClientRect();
                const sx = vs.width / rect.width, sy = vs.height / rect.height;
                return { x: rect.left + w.x / sx, y: rect.top + rect.height - w.y / sy };
            });
            if (dp) { await tap(dp.x, dp.y, 800); }
            const closed = await page.evaluate(() => {
                const find = (name) => { let h = null; (function w(n) { if (h) { return; } if (n.name === name) { h = n; return; } (n.children || []).forEach(w); })(cc.director.getScene()); return h; };
                const dlg = find('editorDialog');
                return { dialogActive: !!(dlg && dlg.activeInHierarchy), domInputsAfterClose: document.querySelectorAll('input').length };
            });
            out.R4 = Object.assign(out.R4 || {}, closed);
        } else {
            out.R4 = { error: 'create-world button not reachable', detail: r4open };
        }

        await page.evaluate(() => { window.MazeDashCustomTab.openGridEditor(); });
        await sleep(1800);
        out.R5 = await page.evaluate(() => {
            const find = (name) => { let h = null; (function w(n) { if (h) { return; } if (n.name === name) { h = n; return; } (n.children || []).forEach(w); })(cc.director.getScene()); return h; };
            let cells = 0; (function c(n) { if (/^cell_/.test(n.name)) { cells++; } (n.children || []).forEach(c); })(cc.director.getScene());
            const pal = find('gridPalette');
            let tools = 0, swatches = 0;
            (pal ? pal.children : []).forEach((b) => { if (/^tool_/.test(b.name)) { tools++; } if (/^swatch_/.test(b.name)) { swatches++; } });
            const save = find('gridSave');
            const bar = window.hallScene && window.hallScene.tabBar;
            const root = find('gridEditor');
            const W = (n) => n.convertToWorldSpaceAR(cc.v2(0, 0));
            /* The meaningful overlap test: the GRID must not collide with the palette row. Testing the
               save button against the palette was wrong - save lives INSIDE that row by design. */
            let overlap = null;
            const cells00 = find('cell_0_0'), cells19 = find('cell_19_19');
            if (pal && cells00 && cells19) {
                const p = W(pal), a = W(cells00), b = W(cells19);
                const gridTop = Math.max(a.y, b.y) + 20, gridBottom = Math.min(a.y, b.y) - 20;
                const palTop = p.y + pal.height / 2, palBottom = p.y - pal.height / 2;
                overlap = !(gridBottom > palTop || gridTop < palBottom);
            }
            return { cells: cells, tools: tools, swatches: swatches, overlapGridVsPalette: overlap, saveInPaletteRow: !!(save && pal && save.parent === pal), tabBarActive: !!(bar && bar.activeInHierarchy) };
        });
        /* close through the REAL back button (closeGridEditor is not exported; leaving the editor open
           made the later level entry read an empty map - the previous run's R6 failure) */
        const backP = await page.evaluate(() => {
            const find = (name) => { let h = null; (function w(n) { if (h) { return; } if (n.name === name) { h = n; return; } (n.children || []).forEach(w); })(cc.director.getScene()); return h; };
            const n = find('gridBack');
            if (!n) { return null; }
            const w = n.convertToWorldSpaceAR(cc.v2(0, 0));
            const vs = cc.view.getVisibleSize(), rect = cc.game.canvas.getBoundingClientRect();
            const sx = vs.width / rect.width, sy = vs.height / rect.height;
            return { x: rect.left + w.x / sx, y: rect.top + rect.height - w.y / sy };
        });
        if (backP) { await tap(backP.x, backP.y, 900); }
        out.R5_closed = await page.evaluate(() => !cc.find('Canvas/gridEditor'));
        /* R6 coloured portals on the test level */
        await page.evaluate(() => { gamemain.enterEnterGameScene(10101); });
        for (let i = 0; i < 50; i++) { if ((await page.evaluate(() => (cc.director.getScene() || {}).name)) === 'gameScene') { break; } await sleep(300); }
        await sleep(1600);
        out.R6 = await page.evaluate(() => {
            const map = cc.find('Canvas/backgroup/game_map');
            const comp = map && map.getComponent('game_map');
            if (!comp) { return { error: 'no game_map' }; }
            const pairs = [];
            for (const y in comp.Level_data) { for (const x in comp.Level_data[y]) { if (comp.Level_data[y][x] === 2) { const d = comp.getOutPortal(cc.v2(parseInt(x, 10), parseInt(y, 10))); pairs.push(x + ',' + y + '->' + d.x + ',' + d.y); } } }
            let heads = 0; for (const y in comp.Level_data) { for (const x in comp.Level_data[y]) { if (comp.Level_data[y][x] === -1) { heads++; } } }
            return { pairs: pairs.sort(), heads: heads };
        });
        /* R7a/R7b export -> wipe -> import */
        out.R7a = await page.evaluate(() => {
            const f = window.MazeDashCustomTab.buildExportData;
            if (typeof f !== 'function') { return { error: 'buildExportData not exported' }; }
            const d = f();
            return { version: d.version, worlds: Object.keys(d.worlds || {}).length, levels: Object.keys(d.levels || {}).length, maps: Object.keys(d.maps || {}).length, colourTables: Object.keys(d.colours || d.colourTables || {}).length };
        });
        out.R7b = await page.evaluate(() => {
            const f = window.MazeDashCustomTab.buildExportData, imp = window.MazeDashCustomTab.importCustomJson;
            if (typeof f !== 'function' || typeof imp !== 'function') { return { error: 'not exported' }; }
            const d = f();
            try { localStorage.clear(); } catch (e) {}
            const res = imp(JSON.stringify(d));
            const keys = conf.stage_level_cfg[101] ? Object.keys(conf.stage_level_cfg[101]).sort() : [];
            const rows = conf.all_Level[10101] ? conf.all_Level[10101].length : 0;
            return { result: res, stageKeys: keys, rows: rows };
        });
        out.errsA = errs.slice(0, 4);
        await page.close();
    }

    /* ---------- R7c P1 / P2 : import then enter, with and without wiping the profile ---------- */
    for (const which of ['P1', 'P2']) {
        const { page, errs } = await boot(browser, which === 'P2');
        const r = await page.evaluate(() => {
            try {
                const d = window.MazeDashCustomTab.buildExportData();
                const res = window.MazeDashCustomTab.importCustomJson(JSON.stringify(d));
                gamemain.enterEnterGameScene(10101);
                return { imported: res };
            } catch (e) { return { error: String(e.message).slice(0, 120) }; }
        });
        let hasMap = false, rows = 0;
        for (let i = 0; i < 50; i++) {
            const s = await page.evaluate(() => {
                const m = cc.find('Canvas/backgroup/game_map');
                const c = m && m.getComponent('game_map');
                return { scene: (cc.director.getScene() || {}).name, has: !!c, rows: c ? Object.keys(c.Level_data).length : 0 };
            });
            if (s.scene === 'gameScene' && s.has) { hasMap = true; rows = s.rows; break; }
            await sleep(300);
        }
        out['R7c_' + which] = { hasMap: hasMap, rows: rows, errs: errs.length, errSample: errs.slice(0, 2), imported: r };
        await page.close();
    }

    console.log('RESULT=' + JSON.stringify(out));
    await browser.close();
    process.exit(0);
})().catch((e) => { console.error('HARNESS ERROR', e); process.exit(1); });
