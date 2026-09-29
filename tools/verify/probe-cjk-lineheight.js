const path = require('path');
const { spawn } = require('child_process');
const puppeteer = require('puppeteer-core');
const WEB = 'E:\\maze_dash\\web';
const CHROME = 'C:\\Users\\Lenovo\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 8241;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
    const server = spawn(process.execPath, [path.join(WEB, 'serve.js'), String(PORT)], { stdio: 'ignore' });
    await sleep(900);
    const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new',
        userDataDir: path.join(__dirname, 'chrome-profile-cjk'),
        args: ['--no-sandbox','--disable-extensions','--no-first-run','--mute-audio','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader','--autoplay-policy=no-user-gesture-required'],
        defaultViewport: { width: 1440, height: 810 } });
    const page = await browser.newPage();
    const errs = [];
    page.on('pageerror', (e) => errs.push(String(e.message).slice(0, 90)));
    await page.goto(`http://127.0.0.1:${PORT}/index.html`, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction('window.cc && cc.game._prepared === true && !!window.gamemain', { timeout: 60000, polling: 200 });
    const scene = () => page.evaluate(() => (cc.director.getScene() ? cc.director.getScene().name : null));
    async function tap(x, y, s) { await page.mouse.move(x, y); await page.mouse.down(); await sleep(80); await page.mouse.up(); await sleep(s || 900); }
    for (let i = 0; i < 60; i++) { if ((await scene()) === 'HallScene') { break; } if (i % 3 === 1) { await tap(720, 400, 500); } else { await sleep(400); } }
    // switch to Chinese so the world names are CJK, then let the sweep run
    await page.evaluate(() => { try { gamemain.setGameLang('zh-Hans'); } catch (e) {} });
    await sleep(5000);
    const st = await page.evaluate(() => {
        window.hallScene.showBarView();
        const out = [];
        (function walk(n) {
            const lb = n.getComponent && n.getComponent(cc.Label);
            if (lb && lb.string && /[\u4e00-\u9fff]/.test(lb.string) && out.length < 6) {
                out.push({ text: lb.string.slice(0, 6), fontSize: lb.fontSize, lineHeight: lb.lineHeight,
                           nodeH: Math.round(n.height), sys: lb.useSystemFont === true, font: lb.font ? 'asset' : null });
            }
            (n.children || []).forEach(walk);
        })(cc.director.getScene());
        return { labels: out, stats: window.MazeDashClean.stats };
    });
    console.log('CJK labels:', JSON.stringify(st.labels, null, 1).slice(0, 900));
    console.log('switched:', st.stats.cjkFontSwitched, ' lineHeightFixed:', st.stats.cjkLineHeightFixed);
    await sleep(600);
    await page.screenshot({ path: path.join(__dirname, 'shots', 'cjk-labels.png') });
    console.log('errors:', JSON.stringify(errs.slice(0, 3)));
    await browser.close(); server.kill(); process.exit(0);
})().catch((e) => { console.error('HARNESS ERROR', e); process.exit(1); });
