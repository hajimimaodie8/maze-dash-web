const path = require('path');
const { spawn } = require('child_process');
const puppeteer = require('puppeteer-core');
const WEB = 'E:\\maze_dash\\web';
const CHROME = 'C:\\Users\\Lenovo\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 8254;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
    const server = spawn(process.execPath, [path.join(WEB, 'serve.js'), String(PORT)], { stdio: 'ignore' });
    await sleep(900);
    const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new',
        userDataDir: path.join(__dirname, 'chrome-profile-hud'),
        args: ['--no-sandbox','--disable-extensions','--no-first-run','--mute-audio','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader','--autoplay-policy=no-user-gesture-required'],
        defaultViewport: { width: 1440, height: 810 } });
    const page = await browser.newPage();
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
    // where are the HUD buttons really? list every visible node in the bottom strip
    const strip = await page.evaluate(() => {
        const out = [];
        const r = cc.game.canvas.getBoundingClientRect(); const vs = cc.view.getVisibleSize();
        (function walk(n, p) {
            if (n.activeInHierarchy && n.width >= 40 && n.height >= 40) {
                const wp = n.convertToWorldSpaceAR(cc.v2(0, 0));
                const cy = r.top + (vs.height - wp.y) * (r.height / vs.height);
                if (cy > r.height * 0.78) {
                    const sp = n.getComponent && n.getComponent(cc.Sprite);
                    out.push({ name: p + '/' + n.name, size: [Math.round(n.width), Math.round(n.height)],
                               cx: Math.round(r.left + wp.x * (r.width / vs.width)), cy: Math.round(cy),
                               frame: sp && sp.spriteFrame ? sp.spriteFrame.name : null, kids: (n.children || []).length });
                }
            }
            (n.children || []).forEach((c) => walk(c, p + '/' + n.name));
        })(cc.director.getScene(), '');
        return out.slice(-18);
    });
    strip.forEach((s) => console.log('  bottom: ' + s.name + '  ' + s.size.join('x') + ' @' + s.cx + ',' + s.cy + '  frame=' + s.frame + ' kids=' + s.kids));
    // try the three HUD positions, reporting which one leaves the level
    const tries = [[0.79, 0.95, 'bottom-right'], [0.5, 0.95, 'bottom-centre'], [0.06, 0.95, 'bottom-left']];
    for (const t of tries) {
        const x = Math.round(1440 * t[0]), y = Math.round(810 * t[1]);
        await tap(x, y, 2000);
        const s1 = await scene();
        console.log('  tap ' + t[2] + ' (' + x + ',' + y + ') -> scene: ' + s1);
        if (s1 !== 'gameScene') { break; }
    }
    console.log('final scene:', await scene());
    await browser.close(); server.kill(); process.exit(0);
})().catch((e) => { console.error('HARNESS ERROR', e); process.exit(1); });
