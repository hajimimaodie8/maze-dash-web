const path = require('path');
const { spawn } = require('child_process');
const puppeteer = require('puppeteer-core');
const WEB = 'E:\\maze_dash\\web';
const CHROME = 'C:\\Users\\Lenovo\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 8228;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
    const server = spawn(process.execPath, [path.join(WEB, 'serve.js'), String(PORT)], { stdio: 'ignore' });
    await sleep(900);
    const browser = await puppeteer.launch({
        executablePath: CHROME, headless: 'new',
        userDataDir: path.join(__dirname, 'chrome-profile-flow2'),
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
    // create the world straight through the API so the probe stays short
    await page.evaluate(() => {
        gamemain.showTabBarViewIndex = 5; window.hallScene.showBarView();
    });
    await sleep(1500);
    const id = await page.evaluate(() => {
        var hall = window.hallScene;
        var fn = window.MazeDashCustomTab;
        // create through the dialog's own path
        var btn = hall.viewGroup[5].getChildByName('editorBtn_createWorld');
        btn.emit(cc.Node.EventType.TOUCH_END);
        return true;
    });
    await sleep(1200);
    await page.evaluate(() => {
        const panel = cc.find('Canvas').getChildByName('editorDialog').getChildByName('panel');
        panel.getChildByName('worldNameInput').getComponent(cc.EditBox).string = '测试世界';
        panel.getChildByName('hexInput').getComponent(cc.EditBox).string = '#E0A030';
        const btns = panel.children.filter((n) => n.name === 'dlgBtn');
        btns[0].emit(cc.Node.EventType.TOUCH_END);
    });
    await sleep(2500);
    const st = await page.evaluate(() => {
        const scv = cc.find('Canvas/gameView/scrollView').getComponent(cc.ScrollView);
        const pages = scv.content.children.filter((p) => p.getComponent('StageSelectLayer'));
        const custom = pages.filter((p) => p.getComponent('StageSelectLayer').m_stageId >= 100)[0];
        if (!custom) { return { found: false }; }
        const c = custom.getComponent('StageSelectLayer');
        const host = c.SelectLevelLayer;
        const back = c.SelectLayer.getChildByName('backToEditor');
        const bw = back ? back.convertToWorldSpaceAR(cc.v2(0, 0)) : null;
        const pw = custom.convertToWorldSpaceAR(cc.v2(0, 0));
        const tiles = host ? host.children.filter((n) => /^tile_/.test(n.name)) : [];
        const realLevel = host ? host.children.filter((n) => n.getComponent && n.getComponent('LevelButton') && !/^tile_/.test(n.name)) : [];
        return {
            worldId: c.m_stageId, title: c.Title ? c.Title.string : null,
            back: back ? { size: [Math.round(back.width), Math.round(back.height)], world: [Math.round(bw.x), Math.round(bw.y)], pageWorld: [Math.round(pw.x), Math.round(pw.y)], offsetFromPageTopLeft: [Math.round(bw.x - (pw.x - custom.width / 2)), Math.round(bw.y - (pw.y + custom.height / 2))] } : null,
            tiles: tiles.map((n) => { const l = n.getChildByName('Level'); return { name: n.name, size: [Math.round(n.width), Math.round(n.height)], text: l ? l.getComponent(cc.Label).string : null }; }),
            realLevelButtons: realLevel.length,
            pages: pages.length,
        };
    });
    console.log(JSON.stringify(st, null, 1));
    await page.screenshot({ path: path.join(__dirname, 'shots', 'world-page-final.png') });
    // tap the back button
    const bp = await page.evaluate(() => {
        const scv = cc.find('Canvas/gameView/scrollView').getComponent(cc.ScrollView);
        const custom = scv.content.children.filter((p) => p.getComponent('StageSelectLayer')).filter((p) => p.getComponent('StageSelectLayer').m_stageId >= 100)[0];
        const back = custom.getComponent('StageSelectLayer').SelectLayer.getChildByName('backToEditor');
        const wp = back.convertToWorldSpaceAR(cc.v2(0, 0));
        const r = cc.game.canvas.getBoundingClientRect(); const vs = cc.view.getVisibleSize();
        return { x: r.left + wp.x * (r.width / vs.width), y: r.top + (vs.height - wp.y) * (r.height / vs.height) };
    });
    await tap(bp.x, bp.y, 1800);
    const after = await page.evaluate(() => ({ currentIndex: window.hallScene.currentIndex, backCount: window.MazeDashCustomTab.stats.backToEditor || 0 }));
    console.log('after tapping back:', JSON.stringify(after));
    await page.screenshot({ path: path.join(__dirname, 'shots', 'after-back.png') });
    console.log('errors:', JSON.stringify(errs.slice(0, 4)));
    await browser.close();
    server.kill();
    process.exit(0);
})().catch((e) => { console.error('HARNESS ERROR', e); process.exit(1); });
