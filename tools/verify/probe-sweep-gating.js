const path = require('path');
const puppeteer = require('puppeteer-core');
const CHROME = 'C:\\Users\\Lenovo\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe';
const FILE = 'file:///E:/maze_dash/dist/MazeDash-standalone.html';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
    const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new',
        userDataDir: 'E:\\maze_dash\\_work\\test\\chrome-profile-gate', protocolTimeout: 180000,
        args: ['--no-sandbox','--disable-extensions','--no-first-run','--mute-audio','--allow-file-access-from-files','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader','--autoplay-policy=no-user-gesture-required'],
        defaultViewport: { width: 1440, height: 810 } });
    const page = await browser.newPage();
    const errs = [];
    page.on('pageerror', (e) => errs.push(String(e.message).slice(0, 100)));
    await page.evaluateOnNewDocument(() => {
        window.__gaps = []; let last = performance.now();
        const loop = (t) => { window.__gaps.push(Math.round(t - last)); last = t; requestAnimationFrame(loop); };
        requestAnimationFrame(loop);
    });
    await page.goto(FILE, { waitUntil: 'domcontentloaded', timeout: 120000 });
    await page.waitForFunction('window.cc && cc.game && cc.game._prepared === true', { timeout: 120000, polling: 150 });
    const scene = () => page.evaluate(() => (cc.director.getScene() ? cc.director.getScene().name : null));
    async function tap(x, y, s) { await page.mouse.move(x, y); await page.mouse.down(); await sleep(80); await page.mouse.up(); await sleep(s || 900); }
    for (let i = 0; i < 80; i++) { if ((await scene()) === 'HallScene') { break; } if (i % 3 === 1) { await tap(720, 400, 500); } else { await sleep(400); } }
    await sleep(4000);
    const read = () => page.evaluate(() => {
        const st = window.MazeDashClean.stats;
        return { walks: st.cjkWalks || 0, skips: st.cjkSkips || 0, switched: st.cjkFontSwitched || 0 };
    });
    const a = await read();
    await sleep(12000);
    const b = await read();
    // a CJK label must still be fixed: force Chinese and let a walk happen
    await page.evaluate(() => { try { gamemain.setGameLang('zh-Hans'); } catch (e) {} });
    await page.evaluate(() => { window.__mazeDashStampClean = null; });   // force one walk
    await sleep(2500);
    const cjk = await page.evaluate(() => {
        const out = [];
        (function walk(n) { const lb = n.getComponent && n.getComponent(cc.Label);
            if (lb && lb.string && /[\u4e00-\u9fff]/.test(lb.string) && out.length < 3) { out.push({ t: lb.string.slice(0, 4), sys: lb.useSystemFont === true, lh: lb.lineHeight, fs: lb.fontSize }); }
            (n.children || []).forEach(walk); })(cc.director.getScene());
        return out;
    });
    const gaps = await page.evaluate(() => { const g = window.__gaps.slice(-900); return { over50: g.filter((x) => x > 50).length, worst: Math.max.apply(null, g.concat([0])) }; });
    console.log('scene:', await scene());
    console.log('cjkWalks over 12s:', b.walks - a.walks, ' skips:', b.skips - a.skips);
    console.log('CJK labels:', JSON.stringify(cjk));
    console.log('recent frames: >50ms =', gaps.over50, ' worst =', gaps.worst + 'ms');
    console.log('errors:', JSON.stringify(errs.slice(0, 3)));
    await browser.close(); process.exit(0);
})().catch((e) => { console.error('HARNESS ERROR', e); process.exit(1); });
