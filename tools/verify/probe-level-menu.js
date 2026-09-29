const path = require('path');
const { spawn } = require('child_process');
const puppeteer = require('puppeteer-core');
const WEB = 'E:\\maze_dash\\web';
const CHROME = 'C:\\Users\\Lenovo\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 8257;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
    const server = spawn(process.execPath, [path.join(WEB, 'serve.js'), String(PORT)], { stdio: 'ignore' });
    await sleep(900);
    const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new',
        userDataDir: path.join(__dirname, 'chrome-profile-find4'),
        args: ['--no-sandbox','--disable-extensions','--no-first-run','--mute-audio','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader','--autoplay-policy=no-user-gesture-required'],
        defaultViewport: { width: 1440, height: 810 } });
    const page = await browser.newPage();
    await page.evaluateOnNewDocument(() => {
        window.__gaps = []; let last = performance.now();
        const loop = (t) => { window.__gaps.push([Math.round(t), Math.round(t - last)]); last = t; requestAnimationFrame(loop); };
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
        const scv = cc.find('Canvas/gameView/scrollView').getComponent(cc.ScrollView);
        const pg = scv.content.children.filter((p) => p.getComponent('StageSelectLayer'))[0];
        const btn = pg.getComponent('StageSelectLayer').SelectLevelLayer.children.filter((n) => n.getComponent && n.getComponent('LevelButton'))[0];
        const wp = btn.convertToWorldSpaceAR(cc.v2(0, 0));
        const r = cc.game.canvas.getBoundingClientRect(); const vs = cc.view.getVisibleSize();
        return { x: r.left + wp.x * (r.width / vs.width), y: r.top + (vs.height - wp.y) * (r.height / vs.height) };
    });
    await tap(lvl.x, lvl.y, 2500);
    for (let i = 0; i < 50; i++) { if ((await scene()) === 'gameScene') { break; } await sleep(300); }
    await sleep(2000);
    const kids = await page.evaluate(() => {
        const group = cc.find('Canvas/backgroup/top/more_btn_group');
        if (!group) { return []; }
        const r = cc.game.canvas.getBoundingClientRect(); const vs = cc.view.getVisibleSize();
        return group.children.map((n) => { const wp = n.convertToWorldSpaceAR(cc.v2(0, 0));
            return { name: n.name, active: n.activeInHierarchy, size: [Math.round(n.width), Math.round(n.height)],
                     cx: Math.round(r.left + wp.x * (r.width / vs.width)), cy: Math.round(r.top + (vs.height - wp.y) * (r.height / vs.height)) }; });
    });
    kids.forEach((k) => console.log('  kid: ' + k.name + '  ' + k.size.join('x') + ' @' + k.cx + ',' + k.cy + ' active=' + k.active));
    let used = null;
    for (const k of kids) {
        if (!k.active || k.cx < 0 || k.cy < 0) { continue; }
        await page.evaluate(() => window.__mark('TAP_KID'));
        await tap(k.cx, k.cy, 1600);
        const s = await scene();
        console.log('  tap ' + k.name + ' -> ' + s);
        if (s !== 'gameScene') { used = k.name; break; }
    }
    const res = await page.evaluate((usedName) => {
        const gaps = window.__gaps;
        const marks = gaps.filter((g) => g[1] === -1).map((g) => g[0]);
        const lastMark = marks.length ? marks[marks.length - 1] : null;
        const frames = gaps.filter((g) => g[1] > 0);
        const around = lastMark ? frames.filter((f) => f[0] > lastMark - 1500 && f[0] < lastMark + 6000) : [];
        return { usedName, frames: frames.length, over50: around.filter((f) => f[1] > 50).length,
                 worst: around.slice().sort((a, b) => b[1] - a[1]).slice(0, 5).map((w) => w[1]) };
    }, used);
    console.log('RESULT exit-by:', res.usedName, ' frames:', res.frames, ' >50ms around return:', res.over50, ' worst gaps:', JSON.stringify(res.worst));
    console.log('final scene:', await scene());
    await browser.close(); server.kill(); process.exit(0);
})().catch((e) => { console.error('HARNESS ERROR', e); process.exit(1); });
