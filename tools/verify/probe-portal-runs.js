/* Acceptance table: run the "three heroes step into their three colour pairs in the SAME step"
   scenario five times, each time from a FRESH page load (entering a level while already inside one
   does not re-initialise it - a gotcha this project already recorded). For every run it records each
   hero's from -> to and checks that every hero exits through its OWN colour's partner:
   1,1 -> 7,1 (purple) · 2,1 -> 8,1 (red) · 3,1 -> 9,1 (blue).
   Run from E:\maze_dash\_work\test (puppeteer-core lives in ./node_modules). */
const puppeteer = require('puppeteer-core');
const CHROME = 'C:\\Users\\Lenovo\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe';
const FILE = 'file:///E:/maze_dash/dist/MazeDash-standalone.html';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
    const browser = await puppeteer.launch({
        executablePath: CHROME, headless: 'new',
        userDataDir: 'E:\\maze_dash\\_work\\test\\chrome-profile-portalruns',
        protocolTimeout: 300000,
        args: ['--no-sandbox', '--disable-extensions', '--no-first-run', '--mute-audio',
            '--allow-file-access-from-files', '--enable-unsafe-swiftshader',
            '--use-gl=angle', '--use-angle=swiftshader'],
        defaultViewport: { width: 1440, height: 810 },
    });
    const page = await browser.newPage();
    const errs = [];
    page.on('pageerror', (e) => errs.push(String(e.message).slice(0, 140)));
    const scene = () => page.evaluate(() => (cc.director.getScene() ? cc.director.getScene().name : null));
    async function tap(x, y, s) { await page.mouse.move(x, y); await page.mouse.down(); await sleep(70); await page.mouse.up(); await sleep(s || 800); }

    const rows = [];
    for (let run = 0; run < 5; run++) {
        await page.goto(FILE, { waitUntil: 'domcontentloaded', timeout: 120000 });
        await page.waitForFunction('window.cc && cc.game && cc.game._prepared === true', { timeout: 120000, polling: 150 });
        for (let i = 0; i < 90; i++) { if ((await scene()) === 'HallScene') break; if (i % 3 === 1) await tap(720, 400, 500); else await sleep(400); }
        await sleep(2200);
        await page.evaluate(() => { window.__rl = []; gamemain.enterEnterGameScene(10101); });
        for (let i = 0; i < 60; i++) { if (await page.evaluate(() => !!cc.find('Canvas/backgroup/game_map'))) break; await sleep(250); }
        await sleep(2200);
        await page.evaluate(() => {
            const comp = cc.find('Canvas/backgroup/game_map').getComponent('game_map');
            const cur = comp.getOutPortal;
            comp.getOutPortal = function (from) { const t = cur.call(this, from); window.__rl.push([from.x + ',' + from.y, t.x + ',' + t.y]); return t; };
        });
        await page.keyboard.down('KeyS'); await sleep(60); await page.keyboard.up('KeyS');
        await sleep(1600);
        const seen = await page.evaluate(() => { const o = {}; (window.__rl || []).forEach((c) => { o[c[0]] = c[1]; }); return o; });
        const good = seen['1,1'] === '7,1' && seen['2,1'] === '8,1' && seen['3,1'] === '9,1';
        rows.push({ run: run + 1, seen: seen, good: good });
        console.log('RUN ' + (run + 1) + (good ? '  OK ' : '  BAD') + '  ' + JSON.stringify(seen));
    }
    const ok = rows.filter((r) => r.good).length;
    console.log('TABLE: runs=' + rows.length + ' ok=' + ok + ' bad=' + (rows.length - ok) +
        '   expect 1,1->7,1 / 2,1->8,1 / 3,1->9,1 in every run');
    console.log('PAGEERRORS:', JSON.stringify(errs.slice(0, 4)));
    await browser.close();
    process.exit(0);
})().catch((e) => { console.error('HARNESS ERROR', e && e.message); process.exit(1); });
