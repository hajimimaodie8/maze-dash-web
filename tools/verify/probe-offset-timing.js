const puppeteer = require('puppeteer-core');
const CHROME = 'C:\\Users\\Lenovo\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe';
const FILE = 'file:///E:/maze_dash/dist/MazeDash-standalone.html';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const log = (k, v) => console.log('T ' + k + ':', typeof v === 'string' ? v : JSON.stringify(v));
(async () => {
    const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', userDataDir: 'E:\\maze_dash\\_work\\test\\chrome-profile-timing', protocolTimeout: 300000,
        args: ['--no-sandbox','--disable-extensions','--no-first-run','--mute-audio','--allow-file-access-from-files','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader'], defaultViewport: { width: 1440, height: 810 } });
    const page = await browser.newPage();
    const scene = () => page.evaluate(() => (cc.director.getScene() ? cc.director.getScene().name : '?'));
    async function tap(x, y, s) { await page.mouse.move(x, y); await page.mouse.down(); await sleep(70); await page.mouse.up(); await sleep(s || 900); }
    async function toHall() { for (let i = 0; i < 120; i++) { if ((await scene()) === 'HallScene') { return; } if (i % 3 === 1) { await tap(720, 400, 500); } else { await sleep(400); } } }
    const snap = () => page.evaluate(() => {
        const pick = (nm) => { let n = null; (function walk(x) { if (!n && x.name === nm) { n = x; } (x.children || []).forEach(walk); })(cc.find('Canvas')); if (!n) { return null; } const wp = n.convertToWorldSpaceAR(cc.v2(0, 0)); return { x: Math.round(wp.x), y: Math.round(wp.y), w: Math.round(n.width), active: n.activeInHierarchy }; };
        const names = ['editorSmall_previewWorld', 'editorSmall_importJson'];
        const btns = names.map((nm) => { let n = null; (function walk(x) { if (!n && x.name === nm) { n = x; } (x.children || []).forEach(walk); })(cc.find('Canvas')); if (!n) { return { name: nm, missing: true }; } const wp = n.convertToWorldSpaceAR(cc.v2(0, 0)); const vs = cc.view.getVisibleSize(); const left = wp.x - n.width / 2, right = wp.x + n.width / 2; return { name: nm, wx: Math.round(wp.x), inA: left >= 0 && right <= vs.width, inB: left >= -vs.width / 2 && right <= vs.width / 2 }; });
        return { visible: [Math.round(cc.view.getVisibleSize().width), Math.round(cc.view.getVisibleSize().height)], customLevelsView: pick('customLevelsView'), tabBar: pick('tabBar'), buttons: btns };
    });
    await page.goto(FILE, { waitUntil: 'domcontentloaded', timeout: 120000 });
    await page.waitForFunction('window.cc && cc.game && cc.game._prepared === true', { timeout: 120000, polling: 150 });
    await toHall(); await sleep(3000);
    log('A_boot', await snap());
    await page.evaluate(async () => { const api = window.MazeDashCustomTab; api.openGridEditor(); for (let i = 0; i < 80; i++) { if (api.gridEditor && api.gridEditor.grid && !api.gridEditor.pending) { return; } await new Promise((r) => setTimeout(r, 100)); } });
    await sleep(1500);
    log('B_editorOpen', await snap());
    await page.evaluate(() => { try { window.MazeDashCustomTab.gridEditor.close(); } catch (e) {} });
    await sleep(1200);
    log('C_afterClose', await snap());
    await page.evaluate(() => { try { gamemain.enterEnterGameScene(10101); } catch (e) {} });
    for (let i = 0; i < 100; i++) { const r = await page.evaluate(() => { const m = cc.find('Canvas/backgroup/game_map'); const cp = m && m.getComponent && m.getComponent('game_map'); return !!(cp && cp.Level_data); }); if (r) { break; } await sleep(150); }
    await sleep(2500);
    await page.evaluate(() => { const hall = window.hallScene; hall.showBarView(); });
    await sleep(2500);
    log('D_afterReturn', await snap());
    await browser.close(); process.exit(0);
})().catch((e) => { console.error('HARNESS ERROR', e); process.exit(1); });
