const path = require('path');
const puppeteer = require('puppeteer-core');
const CHROME = 'C:\\Users\\Lenovo\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe';
const FILE = 'file:///E:/maze_dash/dist/MazeDash-standalone.html';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
    const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new',
        userDataDir: 'E:\\maze_dash\\_work\\test\\chrome-profile-entry2', protocolTimeout: 180000,
        args: ['--no-sandbox','--disable-extensions','--no-first-run','--mute-audio','--allow-file-access-from-files','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader','--autoplay-policy=no-user-gesture-required'],
        defaultViewport: { width: 1440, height: 810 } });
    const page = await browser.newPage();
    const errs = []; page.on('pageerror', (e) => errs.push(String(e.message).slice(0, 120)));
    await page.goto(FILE, { waitUntil: 'domcontentloaded', timeout: 120000 });
    await page.waitForFunction('window.cc && cc.game && cc.game._prepared === true', { timeout: 120000, polling: 150 });
    const scene = () => page.evaluate(() => (cc.director.getScene() ? cc.director.getScene().name : null));
    async function tap(x, y, s) { await page.mouse.move(x, y); await page.mouse.down(); await sleep(70); await page.mouse.up(); await sleep(s || 900); }
    for (let i = 0; i < 90; i++) { if ((await scene()) === 'HallScene') { break; } if (i % 3 === 1) { await tap(720, 400, 500); } else { await sleep(400); } }
    await sleep(3000);
    // hook the entry call so we can see what the game is handed and what it does with it
    await page.evaluate(() => {
        window.__entered = [];
        const orig = gamemain.enterEnterGameScene.bind(gamemain);
        gamemain.enterEnterGameScene = function (id) { window.__entered.push(['called with', id]); return orig(id); };
        window.__gmProps = Object.keys(gamemain).filter((k) => /level|word|map|stage|current/i.test(k)).slice(0, 24);
    });
    await page.evaluate(() => { gamemain.enterEnterGameScene(10101); });
    for (let i = 0; i < 50; i++) { if ((await scene()) === 'gameScene') { break; } await sleep(300); }
    await sleep(4500);
    const res = await page.evaluate(() => {
        const sc = cc.director.getScene();
        const out = { scene: sc ? sc.name : null, entered: window.__entered };
        out.props = {};
        (window.__gmProps || []).forEach((k) => { try { const v = gamemain[k]; out.props[k] = (typeof v === 'object') ? JSON.stringify(v).slice(0, 60) : v; } catch (e) { out.props[k] = '?'; } });
        out.topNodes = sc ? sc.children.map((c) => c.name) : [];
        const canvas = cc.find('Canvas');
        out.canvasChildren = canvas ? canvas.children.map((c) => c.name).slice(0, 14) : [];
        out.mapNode = !!(canvas && canvas.getChildByName('backgroup') && canvas.getChildByName('backgroup').getChildByName('game_map'));
        out.allLevelStillThere = !!(conf.all_Level && conf.all_Level[10101]);
        out.levelCfg = !!(conf.level_cfg && conf.level_cfg[10101]);
        out.gridSize = out.allLevelStillThere ? conf.all_Level[10101].length : 0;
        return out;
    });
    console.log('entered calls:', JSON.stringify(res.entered));
    console.log('scene:', res.scene, ' game_map node exists:', res.mapNode, ' all_Level[10101]:', res.allLevelStillThere, ' rows:', res.gridSize, ' level_cfg:', res.levelCfg);
    console.log('canvas children:', JSON.stringify(res.canvasChildren));
    console.log('gamemain props:', JSON.stringify(res.props).slice(0, 700));
    console.log('errors:', JSON.stringify(errs.slice(0, 4)));
    await browser.close(); process.exit(0);
})().catch((e) => { console.error('HARNESS ERROR', e); process.exit(1); });
