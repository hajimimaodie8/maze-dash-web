const path = require('path');
const { spawn } = require('child_process');
const puppeteer = require('puppeteer-core');
const WEB = 'E:\\maze_dash\\web';
const CHROME = 'C:\\Users\\Lenovo\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 8206;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
    const server = spawn(process.execPath, [path.join(WEB, 'serve.js'), String(PORT)], { stdio: 'ignore' });
    await sleep(900);
    const browser = await puppeteer.launch({
        executablePath: CHROME, headless: 'new',
        userDataDir: path.join(__dirname, 'chrome-profile-drag'),
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
    await sleep(5000);
    const idx = () => page.evaluate(() => {
        const p = window.hallScene.StageSelectLayer;
        return { cur: p ? p._curPageIdx : null, last: p ? p._lastPageIdx : null, spread: p && p.content ? p.content.__spreadW : null, realigned: window.MazeDashWide ? window.MazeDashWide.stats.pagerRealigned : null };
    });
    const before = await idx();
    console.log('before drag:', JSON.stringify(before));
    // a real horizontal drag across the level select
    await page.mouse.move(900, 400);
    await page.mouse.down();
    for (let x = 900; x >= 380; x -= 40) { await page.mouse.move(x, 400); await sleep(16); }
    await page.mouse.up();
    await sleep(1500);
    const afterDrag = await idx();
    console.log('right after drag:', JSON.stringify(afterDrag));
    await sleep(4000);            // several 1.2 s ticks must NOT pull it back
    const settled = await idx();
    console.log('4s later:', JSON.stringify(settled));
    let verdict = 'inconclusive';
    if (afterDrag.cur !== before.cur && settled.cur === afterDrag.cur) { verdict = 'FIXED (drag moved the page and it stayed)'; }
    else if (afterDrag.cur !== before.cur && settled.cur !== afterDrag.cur) { verdict = 'STILL PULLED BACK'; }
    else if (afterDrag.cur === before.cur) { verdict = 'drag did not change the page (check the drag itself)'; }
    console.log('VERDICT:', verdict);
    console.log('errors:', JSON.stringify(errs.slice(0, 3)));
    await browser.close();
    server.kill();
    process.exit(0);
})().catch((e) => { console.error('HARNESS ERROR', e); process.exit(1); });
