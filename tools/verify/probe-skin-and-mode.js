const path = require('path');
const { spawn } = require('child_process');
const puppeteer = require('puppeteer-core');
const WEB = 'E:\\maze_dash\\web';
const CHROME = 'C:\\Users\\Lenovo\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 8207;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
    const server = spawn(process.execPath, [path.join(WEB, 'serve.js'), String(PORT)], { stdio: 'ignore' });
    await sleep(900);
    const browser = await puppeteer.launch({
        executablePath: CHROME, headless: 'new',
        userDataDir: path.join(__dirname, 'chrome-profile-fix2'),
        args: ['--no-sandbox', '--disable-extensions', '--no-first-run', '--mute-audio',
            '--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader',
            '--autoplay-policy=no-user-gesture-required'],
        defaultViewport: { width: 1280, height: 800 },
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
        if (i % 3 === 1) { await tap(640, 400, 500); } else { await sleep(400); }
    }
    await sleep(4500);
    // 1. skin page background must be white
    await page.evaluate(() => { gamemain.showTabBarViewIndex = 1; window.hallScene.showBarView(); });
    await sleep(2500);
    const skin = await page.evaluate(() => {
        const v = window.hallScene.viewGroup[1];
        const sp = v.getComponent(cc.Sprite);
        return { rgba: [v.color.r, v.color.g, v.color.b, v.color.a], enabled: sp ? sp.enabled : null, w: Math.round(v.width) };
    });
    console.log('SKIN PAGE BG:', JSON.stringify(skin), '-> white?', skin.rgba[0] === 255 && skin.rgba[1] === 255 && skin.rgba[2] === 255);
    await page.screenshot({ path: path.join(__dirname, 'shots', 'fix2-skin-white.png') });
    // 2. mode ping-pong: unlocked -> progression -> unlocked
    const pageState = () => page.evaluate(() => {
        const c = cc.find('Canvas/gameView/scrollView').getComponent(cc.ScrollView);
        return c.content.children.filter((p) => p.getComponent('StageSelectLayer')).map((p) => {
            const s = p.getComponent('StageSelectLayer');
            const host = (s.SelectLevelLayer && s.SelectLevelLayer.parent && s.SelectLevelLayer.parent.getComponent(cc.Layout)) ? s.SelectLevelLayer.parent : s.SelectLevelLayer;
            return {
                world: s.m_stageId,
                lock: s.LockLayer ? s.LockLayer.activeInHierarchy : null,
                select: s.SelectLayer ? s.SelectLayer.activeInHierarchy : null,
                buttons: host ? (host.children || []).filter((b) => b.getComponent('LevelButton')).length : -1,
            };
        });
    });
    const mode = (m) => page.evaluate((x) => window.MazeDashCustomTab.applyMode(x), m);
    await mode('unlocked'); await sleep(2000);
    const A = await pageState();
    await mode('progression'); await sleep(2000);
    const B = await pageState();
    await mode('unlocked'); await sleep(2500);
    const C = await pageState();
    console.log('unlocked   :', JSON.stringify(A.map((p) => p.lock + '/' + p.select + '/' + p.buttons)));
    console.log('progression:', JSON.stringify(B.map((p) => p.lock + '/' + p.select + '/' + p.buttons)));
    console.log('back to unlocked:', JSON.stringify(C.map((p) => p.lock + '/' + p.select + '/' + p.buttons)));
    const okC = C.every((p) => p.lock === false && p.select === true && p.buttons > 0);
    const okB = B.filter((p) => p.world > 1).every((p) => p.lock === true);
    console.log('VERDICT skin white:', skin.rgba[0] === 255 && skin.rgba[1] === 255 && skin.rgba[2] === 255);
    console.log('VERDICT ping-pong:', okB && okC ? 'FIXED' : 'STILL STALE');
    await page.screenshot({ path: path.join(__dirname, 'shots', 'fix2-mode.png') });
    console.log('errors:', JSON.stringify(errs.slice(0, 4)));
    await browser.close();
    server.kill();
    process.exit(0);
})().catch((e) => { console.error('HARNESS ERROR', e); process.exit(1); });
