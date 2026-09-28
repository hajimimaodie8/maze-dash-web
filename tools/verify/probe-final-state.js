const path = require('path');
const { spawn } = require('child_process');
const puppeteer = require('puppeteer-core');
const WEB = 'E:\\maze_dash\\web';
const CHROME = 'C:\\Users\\Lenovo\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 8222;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
    const server = spawn(process.execPath, [path.join(WEB, 'serve.js'), String(PORT)], { stdio: 'ignore' });
    await sleep(900);
    const browser = await puppeteer.launch({
        executablePath: CHROME, headless: 'new',
        userDataDir: path.join(__dirname, 'chrome-profile-final'),
        args: ['--no-sandbox', '--disable-extensions', '--no-first-run', '--mute-audio',
            '--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader',
            '--autoplay-policy=no-user-gesture-required'],
        defaultViewport: { width: 1280, height: 800 },
    });
    const page = await browser.newPage();
    const errs = [];
    page.on('pageerror', (e) => errs.push(String(e.message).slice(0, 60)));
    await page.goto(`http://127.0.0.1:${PORT}/index.html`, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction('window.cc && cc.game._prepared === true && !!window.gamemain', { timeout: 60000, polling: 200 });
    const scene = () => page.evaluate(() => (cc.director.getScene() ? cc.director.getScene().name : null));
    async function tap(x, y, s) { await page.mouse.move(x, y); await page.mouse.down(); await sleep(70); await page.mouse.up(); await sleep(s || 900); }
    for (let i = 0; i < 60; i++) {
        if ((await scene()) === 'HallScene') { break; }
        if (i % 3 === 1) { await tap(640, 400, 500); } else { await sleep(400); }
    }
    await sleep(5000);
    const custom = await page.evaluate(() => {
        const v = window.hallScene.viewGroup[5];
        const names = []; (function w(n) { names.push(n.name); (n.children || []).forEach(w); })(v);
        return { names, oldSelector: names.filter((n) => /modeTitle|mode_progression|mode_progression/.test(n)) };
    });
    console.log('custom page nodes:', JSON.stringify(custom.names.slice(0, 12)));
    console.log('old selector nodes still present:', JSON.stringify(custom.oldSelector));
    const sw = await page.evaluate(() => {
        const r = window.hallScene.viewGroup[2].getChildByName('modeSwitch');
        if (!r) { return 'missing'; }
        const wp = r.convertToWorldSpaceAR(cc.v2(0, 0));
        return { world: [Math.round(wp.x), Math.round(wp.y)], size: [Math.round(r.width), Math.round(r.height)] };
    });
    console.log('mode switch on the level select:', JSON.stringify(sw));
    await page.evaluate(() => { gamemain.enterEnterGameScene(171); });
    for (let i = 0; i < 30; i++) { if ((await scene()) === 'gameScene') { break; } await sleep(500); }
    await sleep(7000);
    const key = await page.evaluate(() => {
        const found = []; let removed = window.MazeDashClean.stats.keyArtifactRemoved || 0;
        (function w(n, p) { if (n.name === 'blockbreak') { found.push(p + '/' + n.name); } (n.children || []).forEach((c) => w(c, p + '/' + n.name)); })(cc.director.getScene(), '');
        return { blockbreakNodes: found, removed };
    });
    console.log('key artifact:', JSON.stringify(key));
    await page.screenshot({ path: path.join(__dirname, 'shots', 'final-key.png') });
    console.log('errors:', JSON.stringify(errs.slice(0, 3)));
    await browser.close();
    server.kill();
    process.exit(0);
})().catch((e) => { console.error('HARNESS ERROR', e); process.exit(1); });
