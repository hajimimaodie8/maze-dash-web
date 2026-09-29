const path = require('path');
const { spawn } = require('child_process');
const puppeteer = require('puppeteer-core');
const WEB = 'E:\\maze_dash\\web';
const CHROME = 'C:\\Users\\Lenovo\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 8251;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
    const server = spawn(process.execPath, [path.join(WEB, 'serve.js'), String(PORT)], { stdio: 'ignore' });
    await sleep(900);
    const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new',
        userDataDir: path.join(__dirname, 'chrome-profile-jank'),
        args: ['--no-sandbox','--disable-extensions','--no-first-run','--mute-audio','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader','--autoplay-policy=no-user-gesture-required'],
        defaultViewport: { width: 1440, height: 810 } });
    const page = await browser.newPage();
    const errs = [];
    page.on('pageerror', (e) => errs.push(String(e.message).slice(0, 80)));
    await page.evaluateOnNewDocument(() => {
        window.__gaps = [];
        let last = performance.now();
        const loop = (t) => { const d = t - last; last = t; window.__gaps.push([Math.round(t), Math.round(d), (window.cc && cc.director.getScene() ? cc.director.getScene().name : '?')]); if (window.__gaps.length > 6000) { window.__gaps.shift(); } requestAnimationFrame(loop); };
        requestAnimationFrame(loop);
        window.__mark = (label) => { window.__gaps.push([Math.round(performance.now()), -1, label]); };
    });
    await page.goto(`http://127.0.0.1:${PORT}/index.html`, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction('window.cc && cc.game._prepared === true && !!window.gamemain', { timeout: 60000, polling: 150 });
    const scene = () => page.evaluate(() => (cc.director.getScene() ? cc.director.getScene().name : null));
    async function tap(x, y, s) { await page.mouse.move(x, y); await page.mouse.down(); await sleep(80); await page.mouse.up(); await sleep(s || 900); }
    for (let i = 0; i < 60; i++) { if ((await scene()) === 'HallScene') { break; } if (i % 3 === 1) { await tap(720, 400, 500); } else { await sleep(400); } }
    await sleep(4000);
    // tap the first level button by its world position (no need to know its id)
    const lvlPos = await page.evaluate(() => {
        const scv = cc.find('Canvas/gameView/scrollView').getComponent(cc.ScrollView);
        const pg = scv.content.children.filter((p) => p.getComponent('StageSelectLayer'))[0];
        const holder = pg.getComponent('StageSelectLayer').SelectLevelLayer;
        const btn = holder.children.filter((n) => n.getComponent && n.getComponent('LevelButton'))[0];
        if (!btn) { return null; }
        const wp = btn.convertToWorldSpaceAR(cc.v2(0, 0));
        const r = cc.game.canvas.getBoundingClientRect(); const vs = cc.view.getVisibleSize();
        return { x: r.left + wp.x * (r.width / vs.width), y: r.top + (vs.height - wp.y) * (r.height / vs.height) };
    });
    console.log('level button at', JSON.stringify(lvlPos));
    await page.evaluate(() => window.__mark('TAP_LEVEL'));
    if (lvlPos) { await tap(lvlPos.x, lvlPos.y, 2500); }
    for (let i = 0; i < 40; i++) { if ((await scene()) === 'gameScene') { break; } await sleep(300); }
    console.log('in level:', await scene());
    await sleep(2500);
    // find and tap the way out of the level
    const outPos = await page.evaluate(() => {
        const sc = cc.director.getScene();
        let found = null;
        (function walk(n, p) {
            if (!found && /home|back|return|exit|close/i.test(n.name) && n.activeInHierarchy) {
                const wp = n.convertToWorldSpaceAR(cc.v2(0, 0));
                const r = cc.game.canvas.getBoundingClientRect(); const vs = cc.view.getVisibleSize();
                found = { name: p + '/' + n.name, x: r.left + wp.x * (r.width / vs.width), y: r.top + (vs.height - wp.y) * (r.height / vs.height) };
            }
            (n.children || []).forEach((c) => walk(c, p + '/' + n.name));
        })(sc, '');
        return found;
    });
    console.log('exit button:', JSON.stringify(outPos));
    if (outPos) {
        await page.evaluate(() => window.__mark('TAP_EXIT'));
        await tap(outPos.x, outPos.y, 500);
        await sleep(600);
        // a confirm dialog may appear; tap the middle-bottom area to accept
        await tap(outPos.x, outPos.y, 2500);
    }
    await sleep(3000);
    const result = await page.evaluate(() => {
        const gaps = window.__gaps;
        const marks = gaps.filter((g) => g[1] === -1).map((g) => ({ t: g[0], label: g[2] }));
        const frames = gaps.filter((g) => g[1] > 0);
        const worst = frames.slice().sort((a, b) => b[1] - a[1]).slice(0, 12);
        const over50 = frames.filter((f) => f[1] > 50).length;
        const over100 = frames.filter((f) => f[1] > 100).length;
        return { frameCount: frames.length, over50, over100,
                 worst: worst.map((w) => ({ at: w[0], gap: w[1], scene: w[2], sinceTapExit: (function () { const m = marks.filter((x) => x.label === 'TAP_EXIT')[0]; return m ? w[0] - m.t : null; })() })),
                 marks, scene: cc.director.getScene() ? cc.director.getScene().name : null };
    });
    console.log('frames:', result.frameCount, ' >50ms:', result.over50, ' >100ms:', result.over100, ' final scene:', result.scene);
    result.worst.slice(0, 8).forEach((w) => console.log('   gap ' + w.gap + 'ms  at +' + w.sinceTapExit + 'ms after exit tap  scene=' + w.scene));
    console.log('marks:', JSON.stringify(result.marks));
    console.log('errors:', JSON.stringify(errs.slice(0, 3)));
    await browser.close(); server.kill(); process.exit(0);
})().catch((e) => { console.error('HARNESS ERROR', e); process.exit(1); });
