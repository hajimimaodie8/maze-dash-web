const path = require('path');
const { spawn } = require('child_process');
const puppeteer = require('puppeteer-core');
const WEB = 'E:\\maze_dash\\web';
const CHROME = 'C:\\Users\\Lenovo\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 8253;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const PLUGINS = ['custom-tab.js', 'clean-mode.js', 'wide-ui.js', 'preload.js'];

async function phase(browser, abortPlugins) {
    const page = await browser.newPage();
    if (abortPlugins) {
        await page.setRequestInterception(true);
        page.on('request', (req) => {
            const u = req.url();
            if (PLUGINS.some((p) => u.indexOf(p) >= 0)) { req.abort(); } else { req.continue(); }
        });
    }
    await page.evaluateOnNewDocument(() => {
        window.__gaps = [];
        let last = performance.now();
        const loop = (t) => { const d = t - last; last = t; window.__gaps.push([Math.round(t), Math.round(d)]); requestAnimationFrame(loop); };
        requestAnimationFrame(loop);
        window.__mark = (l) => window.__gaps.push([Math.round(performance.now()), -1, l]);
    });
    await page.goto(`http://127.0.0.1:${PORT}/index.html`, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction('window.cc && cc.game._prepared === true && !!window.gamemain', { timeout: 90000, polling: 150 });
    const scene = () => page.evaluate(() => (cc.director.getScene() ? cc.director.getScene().name : null));
    async function tap(x, y, s) { await page.mouse.move(x, y); await page.mouse.down(); await sleep(80); await page.mouse.up(); await sleep(s || 900); }
    for (let i = 0; i < 80; i++) { if ((await scene()) === 'HallScene') { break; } if (i % 3 === 1) { await tap(720, 400, 500); } else { await sleep(400); } }
    await sleep(3000);
    const lvl = await page.evaluate(() => {
        try {
            const scv = cc.find('Canvas/gameView/scrollView').getComponent(cc.ScrollView);
            const pg = scv.content.children.filter((p) => p.getComponent('StageSelectLayer'))[0];
            const btn = pg.getComponent('StageSelectLayer').SelectLevelLayer.children.filter((n) => n.getComponent && n.getComponent('LevelButton'))[0];
            const wp = btn.convertToWorldSpaceAR(cc.v2(0, 0));
            const r = cc.game.canvas.getBoundingClientRect(); const vs = cc.view.getVisibleSize();
            return { x: r.left + wp.x * (r.width / vs.width), y: r.top + (vs.height - wp.y) * (r.height / vs.height) };
        } catch (e) { return null; }
    });
    if (!lvl) { await page.close(); return { error: 'no level button' }; }
    await tap(lvl.x, lvl.y, 2500);
    for (let i = 0; i < 50; i++) { if ((await scene()) === 'gameScene') { break; } await sleep(300); }
    await sleep(2500);
    // find every node with a touch listener, pick the bottom-right one as the way out
    const cands = await page.evaluate(() => {
        const out = [];
        const sc = cc.director.getScene();
        (function walk(n, p) {
            let has = false;
            try { has = n.hasEventListener && n.hasEventListener(cc.Node.EventType.TOUCH_END); } catch (e) {}
            if (has && n.activeInHierarchy && n.width > 40 && n.height > 40) {
                const wp = n.convertToWorldSpaceAR(cc.v2(0, 0));
                const r = cc.game.canvas.getBoundingClientRect(); const vs = cc.view.getVisibleSize();
                out.push({ name: p + '/' + n.name, size: [Math.round(n.width), Math.round(n.height)],
                           cx: Math.round(r.left + wp.x * (r.width / vs.width)), cy: Math.round(r.top + (vs.height - wp.y) * (r.height / vs.height)) });
            }
            (n.children || []).forEach((c) => walk(c, p + '/' + n.name));
        })(sc, '');
        return out;
    });
    const bottomRight = cands.slice().sort((a, b) => (b.cx + b.cy) - (a.cx + a.cy))[0];
    await page.evaluate(() => window.__mark('EXIT_TAP'));
    let outScene = null;
    if (bottomRight) {
        await tap(bottomRight.cx, bottomRight.cy, 1200);
        // possible confirm dialog: tap the right-hand button area
        await tap(900, 520, 1500);
        for (let i = 0; i < 30; i++) { outScene = await scene(); if (outScene === 'HallScene') { break; } await sleep(400); }
    }
    const res = await page.evaluate(() => {
        const gaps = window.__gaps;
        const marks = gaps.filter((g) => g[1] === -1).map((g) => ({ t: g[0], label: g[2] }));
        const frames = gaps.filter((g) => g[1] > 0);
        const m = marks.filter((x) => x.label === 'EXIT_TAP')[0];
        const around = m ? frames.filter((f) => f[0] > m.t - 2000 && f[0] < m.t + 6000) : frames;
        const worst = around.slice().sort((a, b) => b[1] - a[1]).slice(0, 5).map((w) => ({ gap: w[1], at: w[0] - (m ? m.t : 0) }));
        return { frames: frames.length, over50: around.filter((f) => f[1] > 50).length, over100: around.filter((f) => f[1] > 100).length, worst };
    });
    console.log((abortPlugins ? 'B(no plugins)' : 'A(with plugins)') + ' -> out scene: ' + outScene + '  exit candidate: ' + (bottomRight ? bottomRight.name + ' @' + bottomRight.cx + ',' + bottomRight.cy : 'none'));
    console.log('   frames:', res.frames, ' >50ms near exit:', res.over50, ' >100ms:', res.over100, ' worst:', JSON.stringify(res.worst));
    await page.close();
    return res;
}
(async () => {
    const server = spawn(process.execPath, [path.join(WEB, 'serve.js'), String(PORT)], { stdio: 'ignore' });
    await sleep(900);
    const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new',
        userDataDir: path.join(__dirname, 'chrome-profile-ab'),
        args: ['--no-sandbox','--disable-extensions','--no-first-run','--mute-audio','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader','--autoplay-policy=no-user-gesture-required'],
        defaultViewport: { width: 1440, height: 810 } });
    await phase(browser, false);
    await phase(browser, true);
    await browser.close(); server.kill(); process.exit(0);
})().catch((e) => { console.error('HARNESS ERROR', e); process.exit(1); });
