const path = require('path');
const { spawn } = require('child_process');
const puppeteer = require('puppeteer-core');
const WEB = 'E:\\maze_dash\\web';
const CHROME = 'C:\\Users\\Lenovo\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 8263;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const PLUGINS = ['custom-tab.js', 'clean-mode.js', 'wide-ui.js', 'preload.js'];
async function phase(browser, blockAll, levelIdx) {
    const page = await browser.newPage();
    if (blockAll) {
        await page.setRequestInterception(true);
        page.on('request', (req) => { const u = req.url(); if (PLUGINS.some((p) => u.indexOf(p) >= 0)) { req.abort(); } else { req.continue(); } });
    }
    await page.evaluateOnNewDocument(() => {
        window.__gaps = []; window.__exitAt = null; let last = performance.now();
        const loop = (t) => { window.__gaps.push([Math.round(t), Math.round(t - last)]); last = t; requestAnimationFrame(loop); };
        requestAnimationFrame(loop);
    });
    await page.goto(`http://127.0.0.1:${PORT}/index.html`, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction('window.cc && cc.game._prepared === true && !!window.gamemain', { timeout: 90000, polling: 150 });
    const scene = () => page.evaluate(() => (cc.director.getScene() ? cc.director.getScene().name : null));
    async function tap(x, y, s) { await page.mouse.move(x, y); await page.mouse.down(); await sleep(70); await page.mouse.up(); await sleep(s || 900); }
    for (let i = 0; i < 90; i++) { if ((await scene()) === 'HallScene') { break; } if (i % 3 === 1) { await tap(720, 400, 500); } else { await sleep(400); } }
    await sleep(3500);
    const lvl = await page.evaluate((idx) => {
        try {
            const scv = cc.find('Canvas/gameView/scrollView').getComponent(cc.ScrollView);
            const pg = scv.content.children.filter((p) => p.getComponent('StageSelectLayer'))[0];
            const btns = pg.getComponent('StageSelectLayer').SelectLevelLayer.children.filter((n) => n.getComponent && n.getComponent('LevelButton'));
            const btn = btns[Math.min(idx, btns.length - 1)];
            const wp = btn.convertToWorldSpaceAR(cc.v2(0, 0));
            const r = cc.game.canvas.getBoundingClientRect(); const vs = cc.view.getVisibleSize();
            return { x: r.left + wp.x * (r.width / vs.width), y: r.top + (vs.height - wp.y) * (r.height / vs.height) };
        } catch (e) { return null; }
    }, levelIdx);
    if (!lvl) { await page.close(); return { error: 'no level' }; }
    await tap(lvl.x, lvl.y, 2200);
    for (let i = 0; i < 50; i++) { if ((await scene()) === 'gameScene') { break; } await sleep(300); }
    await sleep(2200);
    const rect = await page.evaluate(() => { const r = cc.game.canvas.getBoundingClientRect(); return [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)]; });
    const ys = [0.80, 0.87, 0.93, 0.98], xs = [0.76, 0.84, 0.91, 0.98];
    let found = null;
    outer:
    for (const fy of ys) {
        for (const fx of xs) {
            const x = Math.round(rect[0] + rect[2] * fx), y = Math.round(rect[1] + rect[3] * fy);
            await tap(x, y, 800);
            const s = await scene();
            if (s === 'HallScene') { found = { x, y }; await page.evaluate(() => { window.__exitAt = performance.now(); }); break outer; }
        }
    }
    await sleep(4000);
    const res = await page.evaluate(() => {
        const gaps = window.__gaps; const frames = gaps.filter((g) => g[1] > 0);
        const ex = window.__exitAt;
        const around = ex ? frames.filter((f) => f[0] > ex - 1500 && f[0] < ex + 8000) : [];
        return { exitAt: ex ? Math.round(ex) : null, frames: frames.length,
                 over50: around.filter((f) => f[1] > 50).length, over100: around.filter((f) => f[1] > 100).length,
                 worst: around.slice().sort((a, b) => b[1] - a[1]).slice(0, 6).map((w) => w[1]),
                 sumGap: around.reduce((s, f) => s + f[1], 0), n: around.length,
                 tabWalks: (window.MazeDashCustomTab ? (window.MazeDashCustomTab.stats.tabWalks || 0) : -1),
                 tabSkips: (window.MazeDashCustomTab ? (window.MazeDashCustomTab.stats.tabSkips || 0) : -1) };
    });
    console.log((blockAll ? 'B(plugins BLOCKED)' : 'A(all plugins)') + ' exit=' + JSON.stringify(found) +
        ' frames=' + res.frames + ' >50ms=' + res.over50 + ' >100ms=' + res.over100 +
        ' worst=' + JSON.stringify(res.worst) + ' avgFrame=' + (res.n ? (res.sumGap / res.n).toFixed(1) : '-') + 'ms  tabWalks=' + res.tabWalks + ' tabSkips=' + res.tabSkips);
    await page.close();
    return res;
}
(async () => {
    const server = spawn(process.execPath, [path.join(WEB, 'serve.js'), String(PORT)], { stdio: 'ignore' });
    await sleep(900);
    const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new',
        userDataDir: path.join(__dirname, 'chrome-profile-retab'),
        args: ['--no-sandbox','--disable-extensions','--no-first-run','--mute-audio','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader','--autoplay-policy=no-user-gesture-required'],
        defaultViewport: { width: 1440, height: 810 } });
    await phase(browser, false, 4);
    await phase(browser, true, 4);
    await browser.close(); server.kill(); process.exit(0);
})().catch((e) => { console.error('HARNESS ERROR', e); process.exit(1); });
