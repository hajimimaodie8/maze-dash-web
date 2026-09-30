const puppeteer = require('puppeteer-core');
const CHROME = 'C:\\Users\\Lenovo\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe';
const FILE = 'file:///E:/maze_dash/dist/MazeDash-standalone.html';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
    const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new',
        userDataDir: 'E:\\maze_dash\\_work\\test\\chrome-profile-decor', protocolTimeout: 180000,
        args: ['--no-sandbox','--disable-extensions','--no-first-run','--mute-audio','--allow-file-access-from-files','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader','--autoplay-policy=no-user-gesture-required'],
        defaultViewport: { width: 1440, height: 810 } });
    const page = await browser.newPage();
    await page.goto(FILE, { waitUntil: 'domcontentloaded', timeout: 120000 });
    await page.waitForFunction('window.cc && cc.game && cc.game._prepared === true', { timeout: 120000, polling: 150 });
    const scene = () => page.evaluate(() => (cc.director.getScene() ? cc.director.getScene().name : null));
    async function tap(x, y, s) { await page.mouse.move(x, y); await page.mouse.down(); await sleep(70); await page.mouse.up(); await sleep(s || 900); }
    for (let i = 0; i < 90; i++) { if ((await scene()) === 'HallScene') break; if (i % 3 === 1) await tap(720, 400, 500); else await sleep(400); }
    await sleep(2500);
    await page.evaluate(() => gamemain.enterEnterGameScene(10101));
    for (let i = 0; i < 50; i++) { if (await page.evaluate(() => !!cc.find('Canvas/backgroup/game_map'))) break; await sleep(300); }
    await sleep(3000);
    const r = await page.evaluate(() => {
        const sc = cc.director.getScene();
        const out = { sceneChildren: [], canvasChildren: [], decor: [] };
        sc.children.forEach((c, i) => out.sceneChildren.push([i, c.name, c.zIndex, c.activeInHierarchy, c.children.length]));
        const cv = cc.find('Canvas');
        if (cv) cv.children.forEach((c, i) => out.canvasChildren.push([i, c.name, c.zIndex, c.activeInHierarchy, Math.round(c.width) + 'x' + Math.round(c.height)]));
        (function walk(n, path) {
            if (/vignette|bg1|bg2|decor|grass|tree|cloud|hill|stage\d|background/i.test(n.name)) {
                const sp = n.getComponent && n.getComponent(cc.Sprite);
                out.decor.push({ path: path + '/' + n.name, z: n.zIndex, act: n.activeInHierarchy,
                    size: [Math.round(n.width), Math.round(n.height)], pos: [Math.round(n.x), Math.round(n.y)],
                    spr: sp && sp.spriteFrame ? sp.spriteFrame.name : null,
                    col: sp ? [n.color.r, n.color.g, n.color.b] : null });
            }
            (n.children || []).forEach((c) => walk(c, path + '/' + n.name));
        })(sc, '');
        out.mapIndexInBackgroup = (function () { const bg = cc.find('Canvas/backgroup'); if (!bg) return -1; return bg.children.findIndex((c) => c.name === 'game_map'); })();
        out.backgroupIndexInCanvas = cv ? cv.children.findIndex((c) => c.name === 'backgroup') : -1;
        return out;
    });
    console.log('SCENE children (index,name,z,active,kids):'); r.sceneChildren.forEach((x) => console.log('   ' + JSON.stringify(x)));
    console.log('CANVAS children (index,name,z,active,size):'); r.canvasChildren.forEach((x) => console.log('   ' + JSON.stringify(x)));
    console.log('backgroup index in Canvas =', r.backgroupIndexInCanvas, '| game_map index inside backgroup =', r.mapIndexInBackgroup);
    console.log('DECOR nodes found:', r.decor.length);
    r.decor.slice(0, 18).forEach((d) => console.log('   ' + d.path + ' z=' + d.z + ' act=' + d.act + ' pos=' + JSON.stringify(d.pos) + ' size=' + JSON.stringify(d.size) + ' spr=' + d.spr + ' col=' + JSON.stringify(d.col)));
    await browser.close(); process.exit(0);
})().catch((e) => { console.error('HARNESS ERROR', e); process.exit(1); });
