const path = require('path');
const { spawn } = require('child_process');
const puppeteer = require('puppeteer-core');
const WEB = 'E:\\maze_dash\\web';
const CHROME = 'C:\\Users\\Lenovo\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 8248;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
    const server = spawn(process.execPath, [path.join(WEB, 'serve.js'), String(PORT)], { stdio: 'ignore' });
    await sleep(900);
    const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new',
        userDataDir: path.join(__dirname, 'chrome-profile-boot'),
        args: ['--no-sandbox','--disable-extensions','--no-first-run','--mute-audio','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader','--autoplay-policy=no-user-gesture-required'],
        defaultViewport: { width: 1440, height: 810 } });
    const page = await browser.newPage();
    const errs = [];
    page.on('pageerror', (e) => errs.push(String(e.message).slice(0, 90)));
    // start sampling as early as possible, before the game finishes booting
    await page.evaluateOnNewDocument(() => {
        window.__samples = [];
        const iv = setInterval(() => {
            try {
                if (window.cc && cc.view && cc.view.getVisibleSize) {
                    const s = cc.view.getVisibleSize();
                    window.__samples.push([Math.round(s.width), Math.round(s.height), (cc.director.getScene() ? cc.director.getScene().name : '?')]);
                }
            } catch (e) {}
        }, 120);
        setTimeout(() => clearInterval(iv), 12000);
    });
    await page.goto(`http://127.0.0.1:${PORT}/index.html`, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction('window.cc && cc.game._prepared === true && !!window.gamemain', { timeout: 60000, polling: 100 });
    const scene = () => page.evaluate(() => (cc.director.getScene() ? cc.director.getScene().name : null));
    async function tap(x, y, s) { await page.mouse.move(x, y); await page.mouse.down(); await sleep(80); await page.mouse.up(); await sleep(s || 900); }
    for (let i = 0; i < 60; i++) { if ((await scene()) === 'HallScene') { break; } if (i % 3 === 1) { await tap(720, 400, 500); } else { await sleep(400); } }
    await sleep(3000);
    const st = await page.evaluate(() => {
        const s = cc.view.getVisibleSize();
        const uniq = {};
        (window.__samples || []).forEach((x) => { uniq[x[0] + 'x' + x[1]] = (uniq[x[0] + 'x' + x[1]] || 0) + 1; });
        const scenes = {}; (window.__samples || []).forEach((x) => { scenes[x[2]] = x[0] + 'x' + x[1]; });
        return { now: [Math.round(s.width), Math.round(s.height)],
                 distinctSizes: Object.keys(uniq), sizeCounts: uniq,
                 perScene: scenes, sampleCount: (window.__samples || []).length,
                 coercion: window.MazeDashPort ? window.MazeDashPort.designCoercion : null };
    });
    console.log('visible now     :', JSON.stringify(st.now));
    console.log('distinct sizes  :', JSON.stringify(st.distinctSizes), ' samples:', st.sampleCount);
    console.log('per scene       :', JSON.stringify(st.perScene));
    console.log('coercion        :', JSON.stringify(st.coercion));
    console.log('errors:', JSON.stringify(errs.slice(0, 3)));
    await browser.close(); server.kill(); process.exit(0);
})().catch((e) => { console.error('HARNESS ERROR', e); process.exit(1); });
