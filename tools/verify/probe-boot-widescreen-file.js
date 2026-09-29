const path = require('path');
const puppeteer = require('puppeteer-core');
const CHROME = 'C:\\Users\\Lenovo\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe';
const FILE = 'file:///E:/maze_dash/dist/MazeDash-standalone.html';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
    const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new',
        userDataDir: path.join(__dirname, 'chrome-profile-file'), protocolTimeout: 180000,
        args: ['--no-sandbox','--disable-extensions','--no-first-run','--mute-audio','--allow-file-access-from-files','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader','--autoplay-policy=no-user-gesture-required'],
        defaultViewport: { width: 1440, height: 810 } });
    const page = await browser.newPage();
    const errs = [];
    page.on('pageerror', (e) => errs.push(String(e.message).slice(0, 90)));
    await page.evaluateOnNewDocument(() => {
        window.__samples = [];
        const iv = setInterval(() => {
            try { if (window.cc && cc.view && cc.view.getVisibleSize) { const s = cc.view.getVisibleSize(); window.__samples.push([Math.round(s.width), Math.round(s.height), (cc.director.getScene() ? cc.director.getScene().name : '?')]); } } catch (e) {}
        }, 100);
        setTimeout(() => clearInterval(iv), 15000);
    });
    await page.goto(FILE, { waitUntil: 'domcontentloaded', timeout: 120000 });
    await page.waitForFunction('window.cc && cc.game && cc.game._prepared === true', { timeout: 120000, polling: 150 });
    const scene = () => page.evaluate(() => (cc.director.getScene() ? cc.director.getScene().name : null));
    async function tap(x, y, s) { await page.mouse.move(x, y); await page.mouse.down(); await sleep(80); await page.mouse.up(); await sleep(s || 900); }
    for (let i = 0; i < 80; i++) { if ((await scene()) === 'HallScene') { break; } if (i % 3 === 1) { await tap(720, 400, 500); } else { await sleep(400); } }
    await sleep(2500);
    const st = await page.evaluate(() => {
        const per = {}; (window.__samples || []).forEach((x) => { per[x[2]] = x[0] + 'x' + x[1]; });
        const uniq = Array.from(new Set((window.__samples || []).map((x) => x[0] + 'x' + x[1])));
        const s = cc.view.getVisibleSize();
        return { perScene: per, distinct: uniq, now: [Math.round(s.width), Math.round(s.height)], samples: (window.__samples || []).length };
    });
    console.log('PACKAGED (file://) per scene:', JSON.stringify(st.perScene));
    console.log('distinct sizes:', JSON.stringify(st.distinct), ' now:', JSON.stringify(st.now), ' samples:', st.samples);
    console.log('errors:', JSON.stringify(errs.slice(0, 3)));
    await browser.close(); process.exit(0);
})().catch((e) => { console.error('HARNESS ERROR', e); process.exit(1); });
