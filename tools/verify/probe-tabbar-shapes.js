const path = require('path');
const { spawn } = require('child_process');
const puppeteer = require('puppeteer-core');
const WEB = 'E:\\maze_dash\\web';
const CHROME = 'C:\\Users\\Lenovo\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 8213;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const SIZES = [[1280, 800], [1920, 1080], [1600, 500], [1024, 1300]];
(async () => {
    const server = spawn(process.execPath, [path.join(WEB, 'serve.js'), String(PORT)], { stdio: 'ignore' });
    await sleep(900);
    const browser = await puppeteer.launch({
        executablePath: CHROME, headless: 'new',
        userDataDir: path.join(__dirname, 'chrome-profile-barshapes'),
        args: ['--no-sandbox', '--disable-extensions', '--no-first-run', '--mute-audio',
            '--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader',
            '--autoplay-policy=no-user-gesture-required'],
        defaultViewport: { width: 1280, height: 800 },
    });
    const page = await browser.newPage();
    const errs = [];
    page.on('pageerror', (e) => errs.push(String(e.message).slice(0, 50)));
    await page.goto(`http://127.0.0.1:${PORT}/index.html`, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction('window.cc && cc.game._prepared === true && !!window.gamemain', { timeout: 60000, polling: 200 });
    const scene = () => page.evaluate(() => (cc.director.getScene() ? cc.director.getScene().name : null));
    async function tap(x, y, s) { await page.mouse.move(x, y); await page.mouse.down(); await sleep(70); await page.mouse.up(); await sleep(s || 900); }
    for (let i = 0; i < 60; i++) {
        if ((await scene()) === 'HallScene') { break; }
        if (i % 3 === 1) { await tap(640, 400, 500); } else { await sleep(400); }
    }
    await sleep(5000);
    for (const [w, h] of SIZES) {
        await page.setViewport({ width: w, height: h });
        await sleep(2600);
        const st = await page.evaluate(() => {
            const hall = window.hallScene;
            const b = hall.tabBar.parent;
            const wp = b.convertToWorldSpaceAR(cc.v2(0, 0));
            const vs = cc.view.getVisibleSize();
            const barTop = wp.y + b.height / 2;
            const barBottom = wp.y - b.height / 2;
            return {
                visible: [Math.round(vs.width), Math.round(vs.height)],
                barY: Math.round(wp.y), barW: Math.round(b.width),
                insideScreen: barBottom >= -1 && barTop <= vs.height + 1,
                widget: (function () { const g = b.getComponent(cc.Widget); return g ? g.enabled : 'none'; })(),
                barZ: b.zIndex, pageZ: hall.viewGroup[hall.currentIndex] ? hall.viewGroup[hall.currentIndex].zIndex : null,
            };
        });
        console.log(w + 'x' + h + ' -> ', JSON.stringify(st));
    }
    await page.setViewport({ width: 2497, height: 1305 });
    await sleep(3000);
    await page.screenshot({ path: path.join(__dirname, 'shots', 'bar-2497.png') });
    console.log('errors:', JSON.stringify(errs.slice(0, 3)));
    await browser.close();
    server.kill();
    process.exit(0);
})().catch((e) => { console.error('HARNESS ERROR', e); process.exit(1); });
