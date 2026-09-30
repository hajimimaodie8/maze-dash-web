/* Item 2: R6 (coloured portal pairing + heads) AND the grid editor's back-button close asserted in the
   SAME run, so the two are no longer stitched from different sessions.
   Order: open the grid editor -> close it with the real back button -> enter world 101's test level ->
   record the pairing. Both facts come from one session. */
const puppeteer = require('puppeteer-core');
const CHROME = 'C:\\Users\\Lenovo\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe';
const FILE = 'file:///E:/maze_dash/dist/MazeDash-standalone.html';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
    const browser = await puppeteer.launch({
        executablePath: CHROME, headless: 'new',
        userDataDir: 'E:\\maze_dash\\_work\\test\\chrome-profile-r6close',
        protocolTimeout: 240000,
        args: ['--no-sandbox', '--disable-extensions', '--no-first-run', '--mute-audio',
            '--allow-file-access-from-files', '--enable-unsafe-swiftshader', '--use-gl=angle',
            '--use-angle=swiftshader', '--autoplay-policy=no-user-gesture-required'],
        defaultViewport: { width: 1440, height: 810 }
    });
    const page = await browser.newPage();
    const errs = [];
    page.on('pageerror', (e) => errs.push(String(e.message).slice(0, 130)));
    await page.goto(FILE, { waitUntil: 'domcontentloaded', timeout: 120000 });
    await page.waitForFunction('window.cc && cc.game && cc.game._prepared === true', { timeout: 120000, polling: 150 });
    const scene = () => page.evaluate(() => (cc.director.getScene() ? cc.director.getScene().name : null));
    const tap = async (x, y, s) => { await page.mouse.move(x, y); await page.mouse.down(); await sleep(80); await page.mouse.up(); await sleep(s || 900); };
    const pageOf = (name) => page.evaluate((n) => {
        const find = (nm) => { let h = null; (function w(k) { if (h) { return; } if (k.name === nm) { h = k; return; } (k.children || []).forEach(w); })(cc.director.getScene()); return h; };
        const nd = find(n);
        if (!nd) { return null; }
        const p = nd.convertToWorldSpaceAR(cc.v2(0, 0));
        const vs = cc.view.getVisibleSize(), rect = cc.game.canvas.getBoundingClientRect();
        const sx = vs.width / rect.width, sy = vs.height / rect.height;
        return { x: rect.left + p.x / sx, y: rect.top + rect.height - p.y / sy, active: nd.activeInHierarchy };
    }, name);
    for (let i = 0; i < 90; i++) { if ((await scene()) === 'HallScene') { break; } if (i % 3 === 1) { await tap(720, 400, 500); } else { await sleep(400); } }
    await sleep(3200);

    /* 1) open the grid editor, then close it with the REAL back button */
    await page.evaluate(() => { window.MazeDashCustomTab.openGridEditor(); });
    await sleep(1500);
    const openedState = await page.evaluate(() => ({ root: !!cc.find('Canvas/gridEditor') }));
    const back = await pageOf('gridBack');
    if (back) { await tap(back.x, back.y, 1100); }
    await sleep(600);
    const closedState = await page.evaluate(() => ({ rootGone: !cc.find('Canvas/gridEditor') }));

    /* 2) enter world 101's test level and record the pairing - same session */
    await page.evaluate(() => { gamemain.enterEnterGameScene(10101); });
    let pairing = null;
    for (let i = 0; i < 60; i++) {
        const s = await page.evaluate(() => {
            const m = cc.find('Canvas/backgroup/game_map');
            const c = m && m.getComponent('game_map');
            if (!c) { return { ready: false }; }
            const pairs = [];
            for (const y in c.Level_data) { for (const x in c.Level_data[y]) { if (c.Level_data[y][x] === 2) { const d = c.getOutPortal(cc.v2(parseInt(x, 10), parseInt(y, 10))); pairs.push(x + ',' + y + '->' + d.x + ',' + d.y); } } }
            let heads = 0; for (const y in c.Level_data) { for (const x in c.Level_data[y]) { if (c.Level_data[y][x] === -1) { heads++; } } }
            return { ready: true, pairs: pairs.sort(), heads: heads, rows: Object.keys(c.Level_data).length };
        });
        if (s.ready) { pairing = s; break; }
        await sleep(300);
    }
    console.log('SAME_RUN=' + JSON.stringify({ opened: openedState, closed: closedState, pairing: pairing, errs: errs.length, errSample: errs.slice(0, 2) }));
    await page.screenshot({ path: 'E:\\maze_dash\\_work\\test\\shots\\86-r6-and-close-same-run.png' });
    await browser.close();
    process.exit(0);
})().catch((e) => { console.error('HARNESS ERROR', e); process.exit(1); });
