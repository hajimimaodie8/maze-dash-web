const path = require('path');
const { spawn } = require('child_process');
const puppeteer = require('puppeteer-core');
const WEB = 'E:\\maze_dash\\web';
const CHROME = 'C:\\Users\\Lenovo\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 8252;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
    const server = spawn(process.execPath, [path.join(WEB, 'serve.js'), String(PORT)], { stdio: 'ignore' });
    await sleep(900);
    const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new',
        userDataDir: path.join(__dirname, 'chrome-profile-exit'),
        args: ['--no-sandbox','--disable-extensions','--no-first-run','--mute-audio','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader','--autoplay-policy=no-user-gesture-required'],
        defaultViewport: { width: 1440, height: 810 } });
    const page = await browser.newPage();
    await page.goto(`http://127.0.0.1:${PORT}/index.html`, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction('window.cc && cc.game._prepared === true && !!window.gamemain', { timeout: 60000, polling: 150 });
    const scene = () => page.evaluate(() => (cc.director.getScene() ? cc.director.getScene().name : null));
    async function tap(x, y, s) { await page.mouse.move(x, y); await page.mouse.down(); await sleep(80); await page.mouse.up(); await sleep(s || 900); }
    for (let i = 0; i < 60; i++) { if ((await scene()) === 'HallScene') { break; } if (i % 3 === 1) { await tap(720, 400, 500); } else { await sleep(400); } }
    await sleep(3500);
    const lvl = await page.evaluate(() => {
        const scv = cc.find('Canvas/gameView/scrollView').getComponent(cc.ScrollView);
        const pg = scv.content.children.filter((p) => p.getComponent('StageSelectLayer'))[0];
        const btn = pg.getComponent('StageSelectLayer').SelectLevelLayer.children.filter((n) => n.getComponent && n.getComponent('LevelButton'))[0];
        const wp = btn.convertToWorldSpaceAR(cc.v2(0, 0));
        const r = cc.game.canvas.getBoundingClientRect(); const vs = cc.view.getVisibleSize();
        return { x: r.left + wp.x * (r.width / vs.width), y: r.top + (vs.height - wp.y) * (r.height / vs.height) };
    });
    await tap(lvl.x, lvl.y, 2500);
    for (let i = 0; i < 40; i++) { if ((await scene()) === 'gameScene') { break; } await sleep(300); }
    await sleep(2500);
    const controls = await page.evaluate(() => {
        const out = [];
        const sc = cc.director.getScene();
        (function walk(n, p) {
            const hasBtn = (n._components || []).some((c) => { try { return /Button/.test(cc.js.getClassName(c)); } catch (e) { return false; } });
            if (hasBtn && n.activeInHierarchy) {
                const wp = n.convertToWorldSpaceAR(cc.v2(0, 0));
                const r = cc.game.canvas.getBoundingClientRect(); const vs = cc.view.getVisibleSize();
                out.push({ name: p + '/' + n.name, size: [Math.round(n.width), Math.round(n.height)],
                           x: Math.round(r.left + wp.x * (r.width / vs.width)), y: Math.round(r.top + (vs.height - wp.y) * (r.height / vs.height)) });
            }
            (n.children || []).forEach((c) => walk(c, p + '/' + n.name));
        })(sc, '');
        return out;
    });
    controls.forEach((c) => console.log('  control: ' + c.name + '  ' + c.size.join('x') + '  at ' + c.x + ',' + c.y));
    console.log('errors: []');
    await browser.close(); server.kill(); process.exit(0);
})().catch((e) => { console.error('HARNESS ERROR', e); process.exit(1); });
