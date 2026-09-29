const path = require('path');
const puppeteer = require('puppeteer-core');
const CHROME = 'C:\\Users\\Lenovo\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe';
const FILE = 'file:///E:/maze_dash/dist/MazeDash-standalone.html';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
    const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new',
        userDataDir: 'E:\\maze_dash\\_work\\test\\chrome-profile-flash', protocolTimeout: 180000,
        args: ['--no-sandbox','--disable-extensions','--no-first-run','--mute-audio','--allow-file-access-from-files','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader','--autoplay-policy=no-user-gesture-required'],
        defaultViewport: { width: 1440, height: 810 } });
    const page = await browser.newPage();
    const errs = []; page.on('pageerror', (e) => errs.push(String(e.message).slice(0, 90)));
    await page.goto(FILE, { waitUntil: 'domcontentloaded', timeout: 120000 });
    await page.waitForFunction('window.cc && cc.game && cc.game._prepared === true', { timeout: 120000, polling: 150 });
    const scene = () => page.evaluate(() => (cc.director.getScene() ? cc.director.getScene().name : null));
    async function tap(x, y, s) { await page.mouse.move(x, y); await page.mouse.down(); await sleep(70); await page.mouse.up(); await sleep(s || 900); }
    for (let i = 0; i < 90; i++) { if ((await scene()) === 'HallScene') { break; } if (i % 3 === 1) { await tap(720, 400, 500); } else { await sleep(400); } }
    await sleep(3500);
    const lvl = await page.evaluate(() => {
        const scv = cc.find('Canvas/gameView/scrollView').getComponent(cc.ScrollView);
        const pg = scv.content.children.filter((p) => p.getComponent('StageSelectLayer'))[0];
        const btns = pg.getComponent('StageSelectLayer').SelectLevelLayer.children.filter((n) => n.getComponent && n.getComponent('LevelButton'));
        const btn = btns[Math.min(4, btns.length - 1)];
        const wp = btn.convertToWorldSpaceAR(cc.v2(0, 0));
        const r = cc.game.canvas.getBoundingClientRect(); const vs = cc.view.getVisibleSize();
        return { x: r.left + wp.x * (r.width / vs.width), y: r.top + (vs.height - wp.y) * (r.height / vs.height) };
    });
    await tap(lvl.x, lvl.y, 2500);
    for (let i = 0; i < 50; i++) { if ((await scene()) === 'gameScene') { break; } await sleep(300); }
    await sleep(1500);
    // start high-frequency sampling of the hall page width, then tap the exit
    await page.evaluate(() => {
        window.__ws = [];
        window.__sampler = setInterval(() => {
            try {
                const sc = cc.director.getScene();
                if (!sc) { return; }
                const scv = cc.find('Canvas/gameView/scrollView');
                const content = scv && scv.getComponent(cc.ScrollView).content;
                const pg = content && content.children.filter((p) => p.getComponent('StageSelectLayer'))[0];
                if (pg) { window.__ws.push([sc.name, Math.round(pg.width), Math.round(cc.view.getVisibleSize().width)]); }
                else { window.__ws.push([sc.name, -1, Math.round(cc.view.getVisibleSize().width)]); }
            } catch (e) {}
        }, 25);
    });
    await tap(1094, 648, 1200);
    await sleep(3000);
    const res = await page.evaluate(() => { clearInterval(window.__sampler);
        const hall = (window.__ws || []).filter((x) => x[0] === 'HallScene');
        return { first: hall.slice(0, 8), narrowFrames: hall.filter((x) => x[1] > 0 && x[1] < x[2] - 4).length, hallSamples: hall.length, last: hall.slice(-3) }; });
    console.log('scene:', await scene());
    console.log('first hall samples [scene,pageWidth,visibleWidth]:', JSON.stringify(res.first));
    console.log('narrow frames after return:', res.narrowFrames, ' of', res.hallSamples, ' last:', JSON.stringify(res.last));
    console.log('errors:', JSON.stringify(errs.slice(0, 3)));
    await browser.close(); process.exit(0);
})().catch((e) => { console.error('HARNESS ERROR', e); process.exit(1); });
