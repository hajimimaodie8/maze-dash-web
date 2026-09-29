const path = require('path');
const { spawn } = require('child_process');
const puppeteer = require('puppeteer-core');
const WEB = 'E:\\maze_dash\\web';
const CHROME = 'C:\\Users\\Lenovo\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 8245;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
    const server = spawn(process.execPath, [path.join(WEB, 'serve.js'), String(PORT)], { stdio: 'ignore' });
    await sleep(900);
    const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new',
        userDataDir: path.join(__dirname, 'chrome-profile-anim'),
        args: ['--no-sandbox','--disable-extensions','--no-first-run','--mute-audio','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader','--autoplay-policy=no-user-gesture-required'],
        defaultViewport: { width: 1440, height: 810 } });
    const page = await browser.newPage();
    const errs = [];
    page.on('pageerror', (e) => errs.push(String(e.message).slice(0, 80)));
    await page.goto(`http://127.0.0.1:${PORT}/index.html`, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction('window.cc && cc.game._prepared === true && !!window.gamemain', { timeout: 60000, polling: 200 });
    const scene = () => page.evaluate(() => (cc.director.getScene() ? cc.director.getScene().name : null));
    async function tap(x, y, s) { await page.mouse.move(x, y); await page.mouse.down(); await sleep(80); await page.mouse.up(); await sleep(s || 900); }
    for (let i = 0; i < 60; i++) { if ((await scene()) === 'HallScene') { break; } if (i % 3 === 1) { await tap(720, 400, 500); } else { await sleep(400); } }
    await sleep(5000);
    // sample the content x while a key press animates the page
    const trace = await page.evaluate(async () => {
        const pager = window.hallScene.StageSelectLayer;
        const content = pager.content;
        const samples = [];
        const t0 = performance.now();
        document.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyD', bubbles: true }));
        return await new Promise((resolve) => {
            const iv = setInterval(() => {
                samples.push([Math.round(performance.now() - t0), Math.round(content.x)]);
                if (performance.now() - t0 > 900) { clearInterval(iv); resolve({ samples, idx: pager._curPageIdx }); }
            }, 60);
        });
    });
    console.log('content x over time:', JSON.stringify(trace.samples));
    const xs = trace.samples.map((s) => s[1]);
    const distinct = new Set(xs).size;
    console.log('distinct positions:', distinct, ' final idx:', trace.idx, ' moved smoothly:', distinct > 3);
    console.log('errors:', JSON.stringify(errs.slice(0, 3)));
    await browser.close(); server.kill(); process.exit(0);
})().catch((e) => { console.error('HARNESS ERROR', e); process.exit(1); });
