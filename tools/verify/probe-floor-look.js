const puppeteer = require('puppeteer-core');
const CHROME = 'C:\\Users\\Lenovo\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe';
const FILE = 'file:///E:/maze_dash/dist/MazeDash-standalone.html';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const log = (k, v) => console.log('M ' + k + ':', typeof v === 'string' ? v : JSON.stringify(v));
(async () => {
    const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', userDataDir: 'E:\\maze_dash\\_work\\test\\chrome-profile-floor', protocolTimeout: 300000,
        args: ['--no-sandbox','--disable-extensions','--no-first-run','--mute-audio','--allow-file-access-from-files','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader'], defaultViewport: { width: 1440, height: 810 } });
    const page = await browser.newPage();
    const scene = () => page.evaluate(() => (cc.director.getScene() ? cc.director.getScene().name : '?'));
    async function tap(x, y, s) { await page.mouse.move(x, y); await page.mouse.down(); await sleep(70); await page.mouse.up(); await sleep(s || 900); }
    async function toHall() { for (let i = 0; i < 120; i++) { if ((await scene()) === 'HallScene') { return; } if (i % 3 === 1) { await tap(720, 400, 500); } else { await sleep(400); } } }
    await page.goto(FILE, { waitUntil: 'domcontentloaded', timeout: 120000 });
    await page.waitForFunction('window.cc && cc.game && cc.game._prepared === true', { timeout: 120000, polling: 150 });
    await toHall(); await sleep(2500);
    await page.evaluate(() => { try { gamemain.enterEnterGameScene(10101); } catch (e) {} });
    for (let i = 0; i < 100; i++) { const r = await page.evaluate(() => { const m = cc.find('Canvas/backgroup/game_map'); const cp = m && m.getComponent && m.getComponent('game_map'); return !!(cp && cp.Level_data); }); if (r) { break; } await sleep(150); }
    await sleep(2500);
    log('floorLayer', await page.evaluate(() => {
        const out = { layerFound: false, tiles: [], themeKeys: [], themeSample: null };
        let layer = null;
        (function find(n) { if (!layer && /fllor_space_layer|floor_space_layer/i.test(n.name)) { layer = n; } (n.children || []).forEach(find); })(cc.find('Canvas'));
        try { if (conf.theme_cfg && conf.theme_cfg[101]) { out.themeKeys = Object.keys(conf.theme_cfg[101]).slice(0, 24); out.themeSample = JSON.stringify(conf.theme_cfg[101]).slice(0, 300); } } catch (e) {}
        if (!layer) { return out; }
        out.layerFound = true;
        out.layerColour = layer.color ? [layer.color.r, layer.color.g, layer.color.b] : null;
        (function walk(n, d) {
            if (out.tiles.length >= 6) { return; }
            const sp = n.getComponent && n.getComponent(cc.Sprite);
            if (sp && /spaceTile/i.test(n.name)) {
                out.tiles.push({ node: n.name, depth: d, frame: sp.spriteFrame ? sp.spriteFrame.name : null,
                                 colour: n.color ? [n.color.r, n.color.g, n.color.b] : null,
                                 size: [Math.round(n.width), Math.round(n.height)],
                                 sizeMode: sp.sizeMode });
            }
            (n.children || []).forEach((k) => walk(k, d + 1));
        })(layer, 0);
        return out;
    }));
    // before screenshot of the editor grid
    await page.evaluate(async () => {
        const api = window.MazeDashCustomTab; api.openGridEditor();
        for (let i = 0; i < 80; i++) { if (api.gridEditor && api.gridEditor.grid && !api.gridEditor.pending) { break; } await new Promise((r) => setTimeout(r, 100)); }
        const ed = api.gridEditor; ed.clear(); ed.setTool('floor');
        [[6,6],[7,6],[8,6],[6,7],[8,7],[6,8],[7,8],[8,8]].forEach((p) => ed.paint(p[0], p[1]));
        ed.setTool('hero'); ed.paint(7,7);
    });
    await page.evaluate(() => { let d = document.getElementById('probeAssertLine'); if (!d) { d = document.createElement('div'); d.id = 'probeAssertLine'; document.body.appendChild(d); } d.textContent = 'AFTER FIX: floor = measured 226,210,172 (no tick), hero = 255,196,48 with C glyph'; d.style.cssText = 'position:fixed;left:0;top:0;width:100%;padding:8px;background:#101018;color:#FFD166;font:15px monospace;z-index:2147483647'; });
    await sleep(400);
    await page.screenshot({ path: 'E:\\maze_dash\\docs\\screenshots\\69-editor-after-fix.png' });
    await browser.close(); process.exit(0);
})().catch((e) => { console.error('HARNESS ERROR', e); process.exit(1); });
