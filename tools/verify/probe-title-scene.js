const path = require('path');
const { spawn } = require('child_process');
const puppeteer = require('puppeteer-core');
const WEB = 'E:\\maze_dash\\web';
const CHROME = 'C:\\Users\\Lenovo\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 8250;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
    const server = spawn(process.execPath, [path.join(WEB, 'serve.js'), String(PORT)], { stdio: 'ignore' });
    await sleep(900);
    const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new',
        userDataDir: path.join(__dirname, 'chrome-profile-title3'),
        args: ['--no-sandbox','--disable-extensions','--no-first-run','--mute-audio','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader','--autoplay-policy=no-user-gesture-required'],
        defaultViewport: { width: 1440, height: 810 } });
    const page = await browser.newPage();
    const errs = [];
    page.on('pageerror', (e) => errs.push(String(e.message).slice(0, 80)));
    await page.goto(`http://127.0.0.1:${PORT}/index.html`, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction('window.cc && cc.game._prepared === true', { timeout: 60000, polling: 150 });
    const scene = () => page.evaluate(() => (cc.director.getScene() ? cc.director.getScene().name : null));
    for (let i = 0; i < 40; i++) { if ((await scene()) === 'AnimScene') { break; } await sleep(200); }
    await sleep(1200);
    const st = await page.evaluate(() => {
        const out = [];
        (function walk(n, p) { const sp = n.getComponent && n.getComponent(cc.Sprite);
            if (sp) { out.push({ path: p + '/' + n.name, size: [Math.round(n.width), Math.round(n.height)], active: n.activeInHierarchy, colour: [n.color.r, n.color.g, n.color.b] }); }
            (n.children || []).forEach((c) => walk(c, p + '/' + n.name)); })(cc.director.getScene(), '');
        return { sprites: out.slice(0, 8), wide: Math.round(cc.view.getVisibleSize().width), stats: window.MazeDashWide ? window.MazeDashWide.stats : null };
    });
    st.sprites.forEach((s) => console.log('  ' + s.path + '  ' + s.size.join('x') + '  active=' + s.active + '  col=' + s.colour.join(',')));
    console.log('visible width:', st.wide, ' titleBgWidened:', st.stats ? st.stats.titleBgWidened : null, ' name:', st.stats ? st.stats.titleBgWidenedName : null);
    await page.screenshot({ path: path.join(__dirname, 'shots', 'title-fixed.png') });
    console.log('errors:', JSON.stringify(errs.slice(0, 3)));
    await browser.close(); server.kill(); process.exit(0);
})().catch((e) => { console.error('HARNESS ERROR', e); process.exit(1); });
