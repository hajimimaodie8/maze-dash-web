const path = require('path');
const { spawn } = require('child_process');
const puppeteer = require('puppeteer-core');
const WEB = 'E:\\maze_dash\\web';
const CHROME = 'C:\\Users\\Lenovo\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 8202;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
    const server = spawn(process.execPath, [path.join(WEB, 'serve.js'), String(PORT)], { stdio: 'ignore' });
    await sleep(900);
    const browser = await puppeteer.launch({
        executablePath: CHROME, headless: 'new',
        userDataDir: path.join(__dirname, 'chrome-profile-t4'),
        args: ['--no-sandbox', '--disable-extensions', '--no-first-run', '--mute-audio',
            '--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader',
            '--autoplay-policy=no-user-gesture-required'],
        defaultViewport: { width: 1280, height: 800 },
    });
    const page = await browser.newPage();
    const errs = [];
    page.on('pageerror', (e) => errs.push(String(e.message).slice(0, 80)));
    await page.goto(`http://127.0.0.1:${PORT}/index.html`, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction('window.cc && cc.game._prepared === true && !!window.gamemain', { timeout: 60000, polling: 200 });
    const scene = () => page.evaluate(() => (cc.director.getScene() ? cc.director.getScene().name : null));
    async function tap(x, y, s) { await page.mouse.move(x, y); await page.mouse.down(); await sleep(70); await page.mouse.up(); await sleep(s || 900); }
    for (let i = 0; i < 60; i++) {
        if ((await scene()) === 'HallScene') { break; }
        if (i % 3 === 1) { await tap(640, 400, 500); } else { await sleep(400); }
    }
    await sleep(5000);
    const probe = () => page.evaluate(() => {
        const hall = window.hallScene;
        const scv = cc.find('Canvas/gameView/scrollView').getComponent(cc.ScrollView);
        const W = Math.round(cc.view.getVisibleSize().width);
        const pageW = scv.content.children.length ? Math.round(scv.content.width / scv.content.children.length) : 0;
        const off = -Math.round(scv.content.x);
        const aligned = pageW ? Math.abs(off % pageW) < 3 || Math.abs((off % pageW) - pageW) < 3 : false;
        const pager = hall.StageSelectLayer || null;
        return {
            tabsActive: hall.tabBar.children.filter((n) => n.activeInHierarchy).map((n) => n.name),
            questTabActive: hall.tabBar.children[3] ? hall.tabBar.children[3].activeInHierarchy : null,
            questViewActive: hall.viewGroup[3] ? hall.viewGroup[3].activeInHierarchy : null,
            slotWidth: Math.round(hall.tabBar.children[1].width),
            pageW, off, aligned, offsetMod: pageW ? off % pageW : null,
            pageIndex: pageW ? Math.round(off / pageW) : null,
            showAd: (function () { try { return localStorage.getItem('showAd'); } catch (e) { return '?'; } })(),
            levelAdActive: (function () { const n = cc.find('Canvas/levelAd'); return n ? n.activeInHierarchy : 'missing'; })(),
            pagerPageKey: pager ? Object.keys(pager).filter((k) => /page/i.test(k)).map((k) => k + '=' + pager[k]).slice(0, 4) : null,
            stats: window.MazeDashWide ? window.MazeDashWide.stats : null,
            W,
        };
    });
    const hall = await probe();
    console.log('HALL:', JSON.stringify(hall, null, 1));
    // enter a level then come back, and check the pager is aligned
    await page.evaluate(() => {
        const c = cc.find('Canvas/gameView/scrollView').getComponent(cc.ScrollView).content.children.find((p) => p.getComponent('StageSelectLayer')).getComponent('StageSelectLayer');
        const cfg = conf.stage_level_cfg[c.m_stageId];
        gamemain.enterEnterGameScene(cfg[Object.keys(cfg)[0]].id);
    });
    for (let i = 0; i < 30; i++) { if ((await scene()) === 'gameScene') { break; } await sleep(500); }
    await sleep(6000);
    console.log('levelAd inside level:', JSON.stringify(await page.evaluate(() => { const n = cc.find('Canvas/levelAd'); return n ? n.activeInHierarchy : 'missing'; })));
    await page.evaluate(() => { try { gamemain.enterHallScene(); } catch (e) {} });
    for (let i = 0; i < 30; i++) { if ((await scene()) === 'HallScene') { break; } await sleep(500); }
    await sleep(5000);
    const back = await probe();
    console.log('BACK IN HALL:', JSON.stringify({ aligned: back.aligned, off: back.off, pageW: back.pageW, pageIndex: back.pageIndex, offsetMod: back.offsetMod, realigned: back.stats && back.stats.pagerRealigned, tabs: back.tabsActive }, null, 1));
    console.log('errors:', JSON.stringify(errs.slice(0, 5)));
    await browser.close();
    server.kill();
    process.exit(0);
})().catch((e) => { console.error('HARNESS ERROR', e); process.exit(1); });
