const path = require('path');
const { spawn } = require('child_process');
const puppeteer = require('puppeteer-core');
const WEB = 'E:\\maze_dash\\web';
const CHROME = 'C:\\Users\\Lenovo\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 8226;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
    const server = spawn(process.execPath, [path.join(WEB, 'serve.js'), String(PORT)], { stdio: 'ignore' });
    await sleep(900);
    const browser = await puppeteer.launch({
        executablePath: CHROME, headless: 'new',
        userDataDir: path.join(__dirname, 'chrome-profile-eh2'),
        args: ['--no-sandbox', '--disable-extensions', '--no-first-run', '--mute-audio',
            '--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader',
            '--autoplay-policy=no-user-gesture-required'],
        defaultViewport: { width: 1280, height: 800 },
    });
    const page = await browser.newPage();
    page.on('pageerror', (e) => console.log('PAGEERROR', String(e.message).slice(0, 80)));
    page.on('console', (m) => { const s = m.text(); if (/custom-tab|editor home|failed/i.test(s)) { console.log('CONSOLE', m.type(), s.slice(0, 140)); } });
    await page.goto(`http://127.0.0.1:${PORT}/index.html`, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction('window.cc && cc.game._prepared === true && !!window.gamemain', { timeout: 60000, polling: 200 });
    const scene = () => page.evaluate(() => (cc.director.getScene() ? cc.director.getScene().name : null));
    async function tap(x, y, s) { await page.mouse.move(x, y); await page.mouse.down(); await sleep(70); await page.mouse.up(); await sleep(s || 900); }
    for (let i = 0; i < 60; i++) {
        if ((await scene()) === 'HallScene') { break; }
        if (i % 3 === 1) { await tap(640, 400, 500); } else { await sleep(400); }
    }
    await sleep(4500);
    // compare: level select title position, then the editor page
    const cmp = await page.evaluate(() => {
        function w(n) { if (!n || !n.isValid) { return null; } const p = n.convertToWorldSpaceAR(cc.v2(0, 0)); return [Math.round(p.x), Math.round(p.y)]; }
        let ref = null;
        try {
            const c = cc.find('Canvas/gameView/scrollView').getComponent(cc.ScrollView).content
                .children.filter((p) => p.getComponent('StageSelectLayer'))[0].getComponent('StageSelectLayer');
            ref = c.Title && c.Title.node ? { world: w(c.Title.node), size: c.Title.fontSize } : null;
        } catch (e) {}
        const view = window.hallScene.viewGroup[5];
        const t = view.getChildByName('editorTitle');
        const a = view.getChildByName('editorBtn_createWorld');
        const b = view.getChildByName('editorBtn_createLevel');
        const names = []; (function walk(n) { names.push(n.name); (n.children || []).forEach(walk); })(view);
        return { worldTitle: ref, editorTitle: t ? { world: w(t), text: t.getComponent(cc.Label).string, size: t.getComponent(cc.Label).fontSize } : null,
                 btnA: a ? { world: w(a), size: [Math.round(a.width), Math.round(a.height)], text: (a.getChildByName('editorBtnLabel_createWorld') || { getComponent: () => ({ string: '?' }) }).getComponent(cc.Label).string } : null,
                 btnB: b ? { world: w(b), size: [Math.round(b.width), Math.round(b.height)] } : null, names: names.slice(0, 14) };
    });
    console.log('world name  :', JSON.stringify(cmp.worldTitle));
    console.log('editor title:', JSON.stringify(cmp.editorTitle));
    console.log('button A    :', JSON.stringify(cmp.btnA));
    console.log('button B    :', JSON.stringify(cmp.btnB));
    console.log('page nodes  :', JSON.stringify(cmp.names));
    await page.evaluate(() => { gamemain.showTabBarViewIndex = 5; window.hallScene.showBarView(); });
    await sleep(2500);
    await page.screenshot({ path: path.join(__dirname, 'shots', 'editor-home.png') });
    await browser.close();
    server.kill();
    process.exit(0);
})().catch((e) => { console.error('HARNESS ERROR', e); process.exit(1); });
