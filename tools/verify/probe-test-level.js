const path = require('path');
const puppeteer = require('puppeteer-core');
const CHROME = 'C:\\Users\\Lenovo\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe';
const FILE = 'file:///E:/maze_dash/dist/MazeDash-standalone.html';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
    const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new',
        userDataDir: 'E:\\maze_dash\\_work\\test\\chrome-profile-tl2', protocolTimeout: 180000,
        args: ['--no-sandbox','--disable-extensions','--no-first-run','--mute-audio','--allow-file-access-from-files','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader','--autoplay-policy=no-user-gesture-required'],
        defaultViewport: { width: 1440, height: 810 } });
    const page = await browser.newPage();
    const errs = []; page.on('pageerror', (e) => errs.push(String(e.message).slice(0, 120)));
    await page.goto(FILE, { waitUntil: 'domcontentloaded', timeout: 120000 });
    await page.waitForFunction('window.cc && cc.game && cc.game._prepared === true', { timeout: 120000, polling: 150 });
    const scene = () => page.evaluate(() => (cc.director.getScene() ? cc.director.getScene().name : null));
    async function tap(x, y, s) { await page.mouse.move(x, y); await page.mouse.down(); await sleep(70); await page.mouse.up(); await sleep(s || 900); }
    for (let i = 0; i < 90; i++) { if ((await scene()) === 'HallScene') { break; } if (i % 3 === 1) { await tap(720, 400, 500); } else { await sleep(400); } }
    await sleep(3500);
    // (1) world 1's first level must be ORIGINAL, and the test grid must not be there
    const w1 = await page.evaluate(() => {
        const cfg = conf.stage_level_cfg[1] || {};
        const first = cfg[Object.keys(cfg)[0]];
        const g = first ? conf.all_Level[first.mapId] : null;
        const dims = g ? [g[0].length, g.length] : null;
        const st = window.MazeDashCustomTab.stats;
        return { mapId: first ? first.mapId : null, dims, isTestGrid: JSON.stringify(g) === JSON.stringify(conf.all_Level[10101]),
                 testLevelInWorld1: st.testLevelInWorld1 === undefined ? 'undefined (gone)' : st.testLevelInWorld1,
                 testSeeded: st.testLevelSeeded || 0, testMap: conf.all_Level[10101] ? [conf.all_Level[10101][0].length, conf.all_Level[10101].length] : null };
    });
    console.log('(1) WORLD 1 FIRST LEVEL:', JSON.stringify(w1));
    // (2) the custom-world test level still enters
    await page.evaluate(() => { gamemain.enterEnterGameScene(10101); });
    for (let i = 0; i < 50; i++) { if ((await scene()) === 'gameScene') { break; } await sleep(300); }
    await sleep(3500);
    const res = await page.evaluate(() => {
        const map = cc.find('Canvas/backgroup/game_map');
        const comp = map && map.getComponent('game_map');
        if (!comp) { return { comp: false }; }
        let heads = 0, portals = [];
        const rows = Object.keys(comp.Level_data);
        for (let i = 0; i < rows.length; i++) {
            const y = rows[i], row = comp.Level_data[y];
            for (const x in row) { const v = row[x]; if (v === -1) { heads++; } if (v === 2) { portals.push([parseInt(x, 10), parseInt(y, 10)]); } }
        }
        const map2 = portals.map((p) => { const d = comp.getOutPortal(cc.v2(p[0], p[1])); return p[0] + ',' + p[1] + '->' + d.x + ',' + d.y; });
        return { comp: true, rows: rows.length, cols: comp.Level_data[rows[0]] ? Object.keys(comp.Level_data[rows[0]]).length : 0, heads, pairing: map2 };
    });
    console.log('(2) CUSTOM TEST LEVEL:', JSON.stringify(res));
    console.log('(4) errors:', JSON.stringify(errs.slice(0, 3)));
    await page.screenshot({ path: 'E:\\maze_dash\\docs\\screenshots\\56-test-level-custom-world.png' });
    await browser.close(); process.exit(0);
})().catch((e) => { console.error('HARNESS ERROR', e); process.exit(1); });
