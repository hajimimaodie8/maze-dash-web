const path = require('path');
const { spawn } = require('child_process');
const puppeteer = require('puppeteer-core');
const WEB = 'E:\\maze_dash\\web';
const CHROME = 'C:\\Users\\Lenovo\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 8198;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
    const server = spawn(process.execPath, [path.join(WEB, 'serve.js'), String(PORT)], { stdio: 'ignore' });
    await sleep(900);
    const browser = await puppeteer.launch({
        executablePath: CHROME, headless: 'new',
        userDataDir: path.join(__dirname, 'chrome-profile-inject'),
        args: ['--no-sandbox', '--disable-extensions', '--no-first-run', '--mute-audio',
            '--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader',
            '--autoplay-policy=no-user-gesture-required'],
        defaultViewport: { width: 540, height: 960 },
    });
    const page = await browser.newPage();
    const errs = [];
    page.on('pageerror', (e) => errs.push(String(e.message).slice(0, 70)));
    await page.goto(`http://127.0.0.1:${PORT}/index.html`, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction('window.cc && cc.game._prepared === true && !!window.gamemain', { timeout: 60000, polling: 200 });
    const scene = () => page.evaluate(() => (cc.director.getScene() ? cc.director.getScene().name : null));
    async function tap(x, y, s) { await page.mouse.move(x, y); await page.mouse.down(); await sleep(70); await page.mouse.up(); await sleep(s || 900); }
    for (let i = 0; i < 60; i++) {
        if ((await scene()) === 'HallScene') { break; }
        if (i % 3 === 1) { await tap(270, 500, 500); } else { await sleep(400); }
    }
    await sleep(3500);
    const out = await page.evaluate(() => {
        const WORLD = 100, NEW_ID = 10001, NEW_MAP = 10001, DISPLAY = 1;
        conf.worlds[WORLD] = { id: WORLD, require: 0 };
        conf.stage_cfg[WORLD] = { sz_title: 1 };
        conf.theme_cfg[WORLD] = conf.theme_cfg[1];
        conf.stage_level_cfg[WORLD] = {};
        conf.all_Level[NEW_MAP] = [[-1, 1, 1, 1], [0, 0, 0, 1], [1, 1, 1, 1]];
        const entry = { id: NEW_ID, wordId: WORLD, levelId: DISPLAY, mapId: NEW_MAP, sz_solution: 'RRDD' };
        conf.level_cfg[NEW_ID] = entry;
        conf.stage_level_cfg[WORLD][String(NEW_ID)] = entry;
        // the pager has to grow a page for the new world
        const sv = cc.find('Canvas/gameView/scrollView').getComponent(cc.ScrollView);
        const before = { contentW: Math.round(sv.content.width), pages: sv.content.children.length };
        window.MazeDashWide.widenSelectPage();
        return {
            before,
            after: { contentW: Math.round(sv.content.width), pages: sv.content.children.length },
            registered: !!(conf.stage_level_cfg[WORLD] && conf.stage_level_cfg[WORLD][String(NEW_ID)]),
            mapOk: JSON.stringify(conf.all_Level[NEW_MAP]),
            levelOk: JSON.stringify(conf.level_cfg[NEW_ID]),
        };
    });
    console.log(JSON.stringify(out, null, 1));
    await sleep(1200);
    console.log('errors:', JSON.stringify(errs.slice(0, 3)));
    await browser.close();
    server.kill();
    process.exit(0);
})().catch((e) => { console.error('HARNESS ERROR', e); process.exit(1); });
