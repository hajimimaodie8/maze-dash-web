const puppeteer = require('puppeteer-core');
const CHROME = 'C:\\Users\\Lenovo\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe';
const FILE = 'file:///E:/maze_dash/dist/MazeDash-standalone.html';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const log = (k, v) => console.log('D ' + k + ':', typeof v === 'string' ? v : JSON.stringify(v));
(async () => {
    const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', userDataDir: 'E:\\maze_dash\\_work\\test\\chrome-profile-diag4', protocolTimeout: 300000,
        args: ['--no-sandbox','--disable-extensions','--no-first-run','--mute-audio','--allow-file-access-from-files','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader'], defaultViewport: { width: 1700, height: 1000 } });
    const page = await browser.newPage();
    const scene = () => page.evaluate(() => (cc.director.getScene() ? cc.director.getScene().name : '?'));
    async function tap(x, y, s) { await page.mouse.move(x, y); await page.mouse.down(); await sleep(70); await page.mouse.up(); await sleep(s || 900); }
    async function toHall() { for (let i = 0; i < 120; i++) { if ((await scene()) === 'HallScene') { return; } if (i % 3 === 1) { await tap(720, 400, 500); } else { await sleep(400); } } }
    await page.goto(FILE, { waitUntil: 'domcontentloaded', timeout: 120000 });
    await page.waitForFunction('window.cc && cc.game && cc.game._prepared === true', { timeout: 120000, polling: 150 });
    await toHall(); await sleep(2500);

    // 2) real floor tile of a loaded level: colour + frame name
    await page.evaluate(() => { try { gamemain.enterEnterGameScene(10101); } catch (e) {} });
    for (let i = 0; i < 100; i++) { const r = await page.evaluate(() => { const m = cc.find('Canvas/backgroup/game_map'); const cp = m && m.getComponent && m.getComponent('game_map'); return !!(cp && cp.Level_data); }); if (r) { break; } await sleep(150); }
    await sleep(2500);
    log('2_floorTile', await page.evaluate(() => {
        const map = cc.find('Canvas/backgroup/game_map');
        const out = { tiles: [], floorNodeSample: null };
        (function walk(n) {
            const sp = n.getComponent && n.getComponent(cc.Sprite);
            if (sp && sp.spriteFrame && out.tiles.length < 8 && /floor|space|tile/i.test(sp.spriteFrame.name)) {
                out.tiles.push({ node: n.name, frame: sp.spriteFrame.name, colour: n.color ? [n.color.r, n.color.g, n.color.b] : null });
            }
            (n.children || []).forEach(walk);
        })(map || cc.find('Canvas'));
        return out;
    }));
    // 3) hero tool: does paint() write -1 ?
    log('3_heroTool', await page.evaluate(async () => {
        const api = window.MazeDashCustomTab;
        api.openGridEditor();
        for (let i = 0; i < 80; i++) { if (api.gridEditor && api.gridEditor.grid && !api.gridEditor.pending) { break; } await new Promise((r) => setTimeout(r, 100)); }
        const ed = api.gridEditor;
        ed.clear();
        ed.setTool('floor'); ed.paint(5, 5);
        const afterFloor = ed.grid[5][5];
        ed.setTool('hero'); ed.paint(5, 5);
        const afterHero = ed.grid[5][5];
        ed.setTool('floor'); ed.paint(5, 5);
        const afterFloorAgain = ed.grid[5][5];
        // what is drawn for -1?
        let drawn = null;
        (function walk(n) { if (n.name === 'cell_5_5') { drawn = { children: n.children.map((k) => k.name), colour: n.color ? [n.color.r, n.color.g, n.color.b] : null }; } (n.children || []).forEach(walk); })(cc.find('Canvas/gridEditor') || cc.find('Canvas'));
        return { afterFloor: afterFloor, afterHero: afterHero, afterFloorAgain: afterFloorAgain, drawnForHero: drawn };
    }));
    // 4) editor home: node duplication after the save-preview-return path
    log('4_homeBefore', await page.evaluate(() => {
        const view = window.hallScene && window.hallScene.viewGroup && window.hallScene.viewGroup[5];
        return view ? { children: view.children.length, names: view.children.map((n) => n.name).slice(0, 18) } : null;
    }));
    log('4_i18n', await page.evaluate(() => {
        let labelText = null;
        (function walk(n) { if (!labelText && n.name === 'editorSmallLabel_importJson') { const l = n.getComponent(cc.Label); labelText = l ? l.string : null; } (n.children || []).forEach(walk); })(cc.find('Canvas'));
        let lang = null; try { lang = window.localStorage.getItem('game_lang'); } catch (e) {}
        return { importJsonLabel: labelText, lang: lang };
    }));
    log('4_homeAfterReopen', await page.evaluate(async () => {
        const api = window.MazeDashCustomTab;
        try { api.gridEditor && api.gridEditor.close(); } catch (e) {}
        await new Promise((r) => setTimeout(r, 700));
        try { api.openGridEditor(); } catch (e) {}
        await new Promise((r) => setTimeout(r, 900));
        try { api.gridEditor && api.gridEditor.close(); } catch (e) {}
        await new Promise((r) => setTimeout(r, 700));
        const view = window.hallScene && window.hallScene.viewGroup && window.hallScene.viewGroup[5];
        return view ? { children: view.children.length, names: view.children.map((n) => n.name).slice(0, 18) } : null;
    }));
    await browser.close(); process.exit(0);
})().catch((e) => { console.error('HARNESS ERROR', e); process.exit(1); });
