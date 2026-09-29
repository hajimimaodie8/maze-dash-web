const path = require('path');
const puppeteer = require('puppeteer-core');
const CHROME = 'C:\\Users\\Lenovo\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe';
const FILE = 'file:///E:/maze_dash/dist/MazeDash-standalone.html';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
    const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new',
        userDataDir: 'E:\\maze_dash\\_work\\test\\chrome-profile-w1', protocolTimeout: 180000,
        args: ['--no-sandbox','--disable-extensions','--no-first-run','--mute-audio','--allow-file-access-from-files','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader','--autoplay-policy=no-user-gesture-required'],
        defaultViewport: { width: 1440, height: 810 } });
    const page = await browser.newPage();
    const errs = []; page.on('pageerror', (e) => errs.push(String(e.message).slice(0, 110)));
    await page.goto(FILE, { waitUntil: 'domcontentloaded', timeout: 120000 });
    await page.waitForFunction('window.cc && cc.game && cc.game._prepared === true', { timeout: 120000, polling: 150 });
    const scene = () => page.evaluate(() => (cc.director.getScene() ? cc.director.getScene().name : null));
    async function tap(x, y, s) { await page.mouse.move(x, y); await page.mouse.down(); await sleep(70); await page.mouse.up(); await sleep(s || 900); }
    for (let i = 0; i < 90; i++) { if ((await scene()) === 'HallScene') { break; } if (i % 3 === 1) { await tap(720, 400, 500); } else { await sleep(400); } }
    await sleep(3500);
    console.log('seeded into world1 map:', await page.evaluate(() => window.MazeDashCustomTab.stats.testLevelInWorld1));
    const lvl = await page.evaluate(() => {
        const scv = cc.find('Canvas/gameView/scrollView').getComponent(cc.ScrollView);
        const pg = scv.content.children.filter((p) => p.getComponent('StageSelectLayer'))[0];
        const btn = pg.getComponent('StageSelectLayer').SelectLevelLayer.children.filter((n) => n.getComponent && n.getComponent('LevelButton'))[0];
        const wp = btn.convertToWorldSpaceAR(cc.v2(0, 0));
        const r = cc.game.canvas.getBoundingClientRect(); const vs = cc.view.getVisibleSize();
        return { x: r.left + wp.x * (r.width / vs.width), y: r.top + (vs.height - wp.y) * (r.height / vs.height) };
    });
    await tap(lvl.x, lvl.y, 4000);
    for (let i = 0; i < 50; i++) { if ((await scene()) === 'gameScene') { break; } await sleep(300); }
    await sleep(4000);
    const res = await page.evaluate(() => {
        const map = cc.find('Canvas/backgroup/game_map');
        const comp = map && map.getComponent('game_map');
        const out = { hasComp: !!comp, patched: comp ? comp.__colorPortals === true : null, heads: 0, portals: [] };
        (function walk(n) { if (n.activeInHierarchy && /head|Face/i.test(n.name)) { out.heads++; } (n.children || []).forEach(walk); })(cc.director.getScene());
        if (comp) {
            let h = 0;
            for (const y in comp.Level_data) { for (const x in comp.Level_data[y]) { const v = comp.Level_data[y][x]; if (v === -1) { h++; } if (v === 2 || v >= 20) { out.portals.push(v + '@' + x + ',' + y + '->' + (function () { const d = comp.getOutPortal(cc.v2(parseInt(x, 10), parseInt(y, 10))); return d.x + ',' + d.y; })()); } } }
            out.headsInData = h;
        }
        return out;
    });
    console.log('IN LEVEL: comp=' + res.hasComp + ' patched=' + res.patched + ' renderedHeads=' + res.heads + ' headsInData=' + res.headsInData);
    console.log('PORTAL PAIRING:');
    (res.portals || []).forEach((p) => console.log('   ' + p));
    console.log('errors:', JSON.stringify(errs.slice(0, 3)));
    await page.screenshot({ path: 'E:\\maze_dash\\_work\\test\\shots\\test-level.png' });
    await browser.close(); process.exit(0);
})().catch((e) => { console.error('HARNESS ERROR', e); process.exit(1); });
