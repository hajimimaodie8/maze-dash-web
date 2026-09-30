const puppeteer = require('puppeteer-core');
const CHROME = 'C:\\Users\\Lenovo\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe';
const FILE = 'file:///E:/maze_dash/dist/MazeDash-standalone.html';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
    const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new',
        userDataDir: 'E:\\maze_dash\\_work\\test\\chrome-profile-layer', protocolTimeout: 180000,
        args: ['--no-sandbox','--disable-extensions','--no-first-run','--mute-audio','--allow-file-access-from-files','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader','--autoplay-policy=no-user-gesture-required'],
        defaultViewport: { width: 1440, height: 810 } });
    const page = await browser.newPage();
    page.on('pageerror', (e) => console.log('PAGEERR', String(e.message).slice(0, 90)));
    await page.goto(FILE, { waitUntil: 'domcontentloaded', timeout: 120000 });
    await page.waitForFunction('window.cc && cc.game && cc.game._prepared === true', { timeout: 120000, polling: 150 });
    const scene = () => page.evaluate(() => (cc.director.getScene() ? cc.director.getScene().name : null));
    async function tap(x, y, s) { await page.mouse.move(x, y); await page.mouse.down(); await sleep(70); await page.mouse.up(); await sleep(s || 900); }
    for (let i = 0; i < 90; i++) { if ((await scene()) === 'HallScene') break; if (i % 3 === 1) await tap(720, 400, 500); else await sleep(400); }
    await sleep(2500);
    const dump = async (label) => {
        const r = await page.evaluate(() => {
            const bg = cc.find('Canvas/backgroup'); if (!bg) return { error: 'no backgroup' };
            const out = [];
            (function walk(n, d) {
                const sp = n.getComponent && n.getComponent(cc.Sprite);
                const info = { n: n.name, d, z: n.zIndex, act: n.activeInHierarchy, pos: [Math.round(n.x), Math.round(n.y)], size: [Math.round(n.width), Math.round(n.height)] };
                if (sp && sp.spriteFrame) info.spr = [sp.spriteFrame.name, n.color ? [n.color.r, n.color.g, n.color.b] : null];
                if (d <= 2 || info.spr || /bg|decor|vignette|floor|space|tile|map|layer|grid/i.test(n.name)) out.push(info);
                (n.children || []).forEach((c) => walk(c, d + 1));
            })(bg, 0);
            const map = cc.find('Canvas/backgroup/game_map');
            let floorCol = null, yellowBig = null;
            if (map) {
                (function w(n) {
                    const sp = n.getComponent && n.getComponent(cc.Sprite);
                    if (sp && sp.spriteFrame) {
                        const c = n.color;
                        if (/spaceTile|fllor/i.test(n.parent ? n.parent.name : '')) floorCol = [c.r, c.g, c.b];
                        if (c && c.r > 200 && c.g > 150 && c.b < 140 && n.width > 100) yellowBig = [n.name, [c.r, c.g, c.b], [Math.round(n.width), Math.round(n.height)], n.parent ? n.parent.name : ''];
                    }
                    (n.children || []).forEach(w);
                })(map);
            }
            return { out, floorCol, yellowBig };
        });
        console.log('===== ' + label + ' =====');
        console.log('floorTileColour:', JSON.stringify(r.floorCol), ' bigYellow:', JSON.stringify(r.yellowBig));
        (r.out || []).slice(0, 40).forEach((o) => console.log('  ' + '  '.repeat(o.d) + o.n + ' z=' + o.z + ' act=' + o.act + ' pos=' + JSON.stringify(o.pos) + ' size=' + JSON.stringify(o.size) + (o.spr ? ' SPR ' + o.spr[0] + ' col=' + JSON.stringify(o.spr[1]) : '')));
        if (r.error) console.log('  ERR ' + r.error);
    };
    const lvl1 = await page.evaluate(() => { const c = conf.stage_level_cfg[1]; const k = Object.keys(c)[0]; return c[k].id; });
    await page.evaluate((id) => gamemain.enterEnterGameScene(id), lvl1);
    for (let i = 0; i < 50; i++) { if ((await scene()) === 'gameScene') break; await sleep(300); }
    await sleep(3000);
    await dump('ORIGINAL world1 first level (id ' + lvl1 + ')');
    await page.evaluate(() => gamemain.enterEnterGameScene(10101));
    for (let i = 0; i < 50; i++) { if (await page.evaluate(() => !!cc.find('Canvas/backgroup/game_map'))) break; await sleep(300); }
    await sleep(3000);
    await dump('CUSTOM world101 level 10101');
    await browser.close(); process.exit(0);
})().catch((e) => { console.error('HARNESS ERROR', e); process.exit(1); });
