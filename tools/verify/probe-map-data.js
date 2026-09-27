const path = require('path');
const { spawn } = require('child_process');
const puppeteer = require('puppeteer-core');
const WEB = 'E:\\maze_dash\\web';
const CHROME = 'C:\\Users\\Lenovo\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 8201;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
    const server = spawn(process.execPath, [path.join(WEB, 'serve.js'), String(PORT)], { stdio: 'ignore' });
    await sleep(900);
    const browser = await puppeteer.launch({
        executablePath: CHROME, headless: 'new',
        userDataDir: path.join(__dirname, 'chrome-profile-t3'),
        args: ['--no-sandbox', '--disable-extensions', '--no-first-run', '--mute-audio',
            '--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader',
            '--autoplay-policy=no-user-gesture-required'],
        defaultViewport: { width: 540, height: 960 },
    });
    const page = await browser.newPage();
    const errs = [];
    page.on('pageerror', (e) => errs.push(String(e.message).slice(0, 90)));
    await page.goto(`http://127.0.0.1:${PORT}/index.html`, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction('window.cc && cc.game._prepared === true && !!window.gamemain', { timeout: 60000, polling: 200 });
    const scene = () => page.evaluate(() => (cc.director.getScene() ? cc.director.getScene().name : null));
    async function tap(x, y, s) { await page.mouse.move(x, y); await page.mouse.down(); await sleep(70); await page.mouse.up(); await sleep(s || 900); }
    for (let i = 0; i < 60; i++) {
        if ((await scene()) === 'HallScene') { break; }
        if (i % 3 === 1) { await tap(270, 500, 500); } else { await sleep(400); }
    }
    await sleep(3500);
    // create a 2-spawn custom level and enter it
    await page.evaluate(() => {
        const WORLD = 100, MAP = 10002, ID = 10002;
        conf.worlds[WORLD] = { id: WORLD, require: 0 };
        conf.stage_cfg[WORLD] = {};
        conf.theme_cfg[WORLD] = JSON.parse(JSON.stringify(conf.theme_cfg[1]));
        conf.stage_level_cfg[WORLD] = {};
        conf.all_Level[MAP] = [[-1, 1, 1, -1], [0, 0, 0, 0], [1, 1, 1, 1]];
        const e = { id: ID, wordId: WORLD, levelId: 1, mapId: MAP, sz_solution: '' };
        conf.level_cfg[ID] = e;
        conf.stage_level_cfg[WORLD][String(ID)] = e;
        gamemain.enterEnterGameScene(ID);
    });
    for (let i = 0; i < 30; i++) { if ((await scene()) === 'gameScene') { break; } await sleep(500); }
    await sleep(6000);
    const dump = await page.evaluate(() => {
        const gs = window.gameScene;
        const out = { scene: cc.director.getScene().name, gsKeys: [], mapNodeKeys: [] };
        try { out.gsKeys = Object.keys(gs).filter((k) => /map|level|data|size|head|snake/i.test(k)); } catch (e) {}
        const node = gs.gameMap || null;
        out.mapNodeName = node ? node.name : null;
        const comp = node ? node.getComponent('game_map') : null;
        out.compFound = !!comp;
        if (comp) {
            out.compKeys = Object.keys(comp).filter((k) => /map|level|data|size|head|snake|tile/i.test(k));
            out.arrayProps = {};
            Object.keys(comp).forEach((k) => {
                const v = comp[k];
                if (Array.isArray(v) && v.length && Array.isArray(v[0])) {
                    let heads = 0; v.forEach((r) => (Array.isArray(r) ? r : []).forEach((x) => { if (x === -1) { heads++; } }));
                    out.arrayProps[k] = { rows: v.length, cols: v[0].length, heads: heads, sample: JSON.stringify(v).slice(0, 90) };
                }
            });
            out.sizeProps = {};
            Object.keys(comp).forEach((k) => { const v = comp[k]; if (v && typeof v === 'object' && v.x !== undefined && v.y !== undefined) { out.sizeProps[k] = [v.x, v.y]; } });
        }
        return out;
    });
    console.log('SCENE', dump.scene, '| compFound', dump.compFound, '| gsKeys', JSON.stringify(dump.gsKeys));
    console.log('GRID PROPS:', JSON.stringify(dump.arrayProps));
    console.log('SIZE PROPS:', JSON.stringify(dump.sizeProps));
    console.log('ERRORS:', JSON.stringify(errs.slice(0, 4)));
    console.log('errors:', JSON.stringify(errs.slice(0, 4)));
    await browser.close();
    server.kill();
    process.exit(0);
})().catch((e) => { console.error('HARNESS ERROR', e); process.exit(1); });
