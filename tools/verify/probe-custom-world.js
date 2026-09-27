const path = require('path');
const { spawn } = require('child_process');
const puppeteer = require('puppeteer-core');
const WEB = 'E:\\maze_dash\\web';
const CHROME = 'C:\\Users\\Lenovo\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 8200;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
    const server = spawn(process.execPath, [path.join(WEB, 'serve.js'), String(PORT)], { stdio: 'ignore' });
    await sleep(900);
    const browser = await puppeteer.launch({
        executablePath: CHROME, headless: 'new',
        userDataDir: path.join(__dirname, 'chrome-profile-t2'),
        args: ['--no-sandbox', '--disable-extensions', '--no-first-run', '--mute-audio',
            '--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader',
            '--autoplay-policy=no-user-gesture-required'],
        defaultViewport: { width: 1280, height: 800 },
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
        if (i % 3 === 1) { await tap(640, 400, 500); } else { await sleep(400); }
    }
    await sleep(4000);

    // ---- create a custom world with one level, using the recipe the source showed ----
    const built = await page.evaluate(() => {
        const hall = window.hallScene;
        const WORLD = 100, ID = 10001, MAP = 10001;
        const grid = [[-1, 1, 1, 1], [0, 0, 0, 1], [1, 1, 1, 1]];
        conf.worlds[WORLD] = { id: WORLD, require: 0 };
        conf.stage_cfg[WORLD] = {};                       // no sz_title: skip the localised title
        conf.theme_cfg[WORLD] = JSON.parse(JSON.stringify(conf.theme_cfg[1]));
        conf.stage_level_cfg[WORLD] = {};
        conf.all_Level[MAP] = grid;
        const entry = { id: ID, wordId: WORLD, levelId: 1, mapId: MAP, sz_solution: 'RRDD' };
        conf.level_cfg[ID] = entry;
        conf.stage_level_cfg[WORLD][String(ID)] = entry;

        const scv = cc.find('Canvas/gameView/scrollView').getComponent(cc.ScrollView);
        const content = scv.content;
        const before = { pages: content.children.length, btnTotal: 0 };

        // the proven recipe
        const pageNode = hall.createStageLayer(WORLD, before.pages - 1);
        hall.StageSelectLayer.insertPage(pageNode, before.pages - 1);

        // let wide-ui widen it, then count the level buttons on the new page
        try { window.MazeDashWide.widenSelectPage(); } catch (e) {}
        const comp = pageNode.getComponent('StageSelectLayer');
        const host = (comp.SelectLevelLayer && comp.SelectLevelLayer.parent && comp.SelectLevelLayer.parent.getComponent(cc.Layout)) ? comp.SelectLevelLayer.parent : comp.SelectLevelLayer;
        const btns = host ? (host.children || []).filter((b) => b.getComponent('LevelButton')) : [];
        return {
            before, after: { pages: content.children.length, w: Math.round(content.width) },
            newPage: { name: pageNode.name, w: Math.round(pageNode.width), stageId: comp.m_stageId },
            buttons: btns.length,
            selectActive: comp.SelectLayer ? comp.SelectLayer.active : null,
            lockActive: comp.LockLayer ? comp.LockLayer.active : null,
        };
    });
    console.log('=== custom world page ===');
    console.log(JSON.stringify(built, null, 1));
    await page.screenshot({ path: path.join(__dirname, 'shots', 't2-custom-world.png') });

    // ---- enter the custom level ----
    const enter = await page.evaluate(() => {
        try { gamemain.enterEnterGameScene(10001); return 'called'; } catch (e) { return 'threw ' + String(e.message).slice(0, 80); }
    });
    for (let i = 0; i < 30; i++) { if ((await scene()) === 'gameScene') { break; } await sleep(500); }
    await sleep(5000);
    const state = await page.evaluate(() => {
        const gm = window.gameScene && window.gameScene.gameMap ? window.gameScene.gameMap.getComponent('game_map') : null;
        let data = null, size = null;
        try { data = gm ? JSON.stringify(gm.Level_data).slice(0, 200) : null; } catch (e) {}
        try { size = gm && gm.MapSize ? [gm.MapSize.x, gm.MapSize.y] : null; } catch (e) {}
        return { scene: cc.director.getScene().name, enterCalled: true, levelData: data, mapSize: size,
                 worldId: window.gameScene ? window.gameScene.worldId : null, level: window.gameScene ? window.gameScene.level : null };
    });
    console.log('\n=== entering the custom level ===');
    console.log('enter:', enter, '\nstate:', JSON.stringify(state, null, 1));

    // ---- multi-head: enter a second custom level that has two spawns ----
    const heads = await page.evaluate(() => {
        const MAP = 10002;
        conf.all_Level[MAP] = [[-1, 1, 1, -1], [0, 0, 0, 0], [1, 1, 1, 1]];
        const e2 = { id: 10002, wordId: 100, levelId: 2, mapId: MAP, sz_solution: '' };
        conf.level_cfg[10002] = e2;
        conf.stage_level_cfg[100][ '10002'] = e2;
        try { gamemain.enterEnterGameScene(10002); return 'entered 10002'; } catch (e) { return 'threw ' + String(e.message).slice(0, 80); }
    });
    await sleep(6000);
    const headsState = await page.evaluate(() => {
        const gm = window.gameScene && window.gameScene.gameMap ? window.gameScene.gameMap.getComponent('game_map') : null;
        let headCount = 0, err = null;
        try {
            gm.Level_data.forEach((row) => row.forEach((v) => { if (v === -1) { headCount++; } }));
        } catch (e) { err = String(e.message).slice(0, 80); }
        return { scene: cc.director.getScene().name, headTiles: headCount, err };
    });
    console.log('\n=== two spawns ===');
    console.log(heads, JSON.stringify(headsState));
    console.log('\npage errors:', JSON.stringify(errs.slice(0, 6)));
    await browser.close();
    server.kill();
    process.exit(0);
})().catch((e) => { console.error('HARNESS ERROR', e); process.exit(1); });
