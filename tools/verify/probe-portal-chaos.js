/* Evidence probe: multiple protagonists enter different coloured portals in the SAME step and the
   pairing goes wrong. Prints, per step: hero positions before/after, every getOutPortal call
   (from -> to) with the cell values at the entry and the target BEFORE and AFTER the call, so we
   can see whether the engine rewrites the portal cells mid-step and whether a later hero therefore
   reads a cell that is no longer a portal.

   Run from E:\maze_dash\_work\test (puppeteer-core lives in ./node_modules). */
const path = require('path');
const puppeteer = require('puppeteer-core');
const CHROME = 'C:\\Users\\Lenovo\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe';
const FILE = 'file:///E:/maze_dash/dist/MazeDash-standalone.html';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
    const browser = await puppeteer.launch({
        executablePath: CHROME, headless: 'new',
        userDataDir: 'E:\\maze_dash\\_work\\test\\chrome-profile-portalchaos',
        protocolTimeout: 240000,
        args: ['--no-sandbox', '--disable-extensions', '--no-first-run', '--mute-audio',
            '--allow-file-access-from-files', '--enable-unsafe-swiftshader',
            '--use-gl=angle', '--use-angle=swiftshader'],
        defaultViewport: { width: 1440, height: 810 },
    });
    const page = await browser.newPage();
    const pageErrs = [];
    page.on('pageerror', (e) => pageErrs.push(String(e.message).slice(0, 160)));

    await page.goto(FILE, { waitUntil: 'domcontentloaded', timeout: 120000 });
    await page.waitForFunction('window.cc && cc.game && cc.game._prepared === true', { timeout: 120000, polling: 150 });

    const scene = () => page.evaluate(() => (cc.director.getScene() ? cc.director.getScene().name : null));
    async function tap(x, y, s) { await page.mouse.move(x, y); await page.mouse.down(); await sleep(70); await page.mouse.up(); await sleep(s || 800); }
    for (let i = 0; i < 90; i++) { if ((await scene()) === 'HallScene') break; if (i % 3 === 1) await tap(720, 400, 500); else await sleep(400); }
    await sleep(2500);

    // enter the test level (custom world 101, map 10101: 3 heroes + 3 colour pairs)
    await page.evaluate(() => { gamemain.enterEnterGameScene(10101); });
    for (let i = 0; i < 60; i++) { if (await page.evaluate(() => !!cc.find('Canvas/backgroup/game_map'))) break; await sleep(300); }
    await sleep(2500);

    const prep = await page.evaluate(() => {
        const map = cc.find('Canvas/backgroup/game_map');
        const comp = map && map.getComponent && map.getComponent('game_map');
        if (!comp) { return { err: 'no game_map component' }; }
        window.__pc = { log: [], steps: [] };
        const L = comp.Level_data, I = comp.Level_item_data;
        const val = (M, x, y) => (M && M[y] ? M[y][x] : undefined);
        const portals = [], heads = [];
        for (var y in L) for (var x in L[y]) {
            const xi = parseInt(x, 10), yi = parseInt(y, 10);
            if (L[y][x] === 2) portals.push([xi, yi]);
            if (L[y][x] === -1) heads.push([xi, yi]);
        }
        // wrap the CURRENT getOutPortal (our colour-aware one) to record every call with cell values
        const cur = comp.getOutPortal;
        comp.getOutPortal = function (from) {
            const before = { entryL: val(L, from.x, from.y), entryI: val(I, from.x, from.y) };
            const to = cur.call(this, from);
            const rec = {
                from: [from.x, from.y], to: [to.x, to.y],
                before: before,
                afterEntryL: val(L, from.x, from.y), afterEntryI: val(I, from.x, from.y),
                afterToL: val(L, to.x, to.y), afterToI: val(I, to.x, to.y),
                same: (to.x === from.x && to.y === from.y),
            };
            window.__pc.log.push(rec);
            return to;
        };
        window.__pc.portals = portals; window.__pc.heads = heads;
        window.__pc.comp = comp;
        /* Order independence: consuming one portal must NOT redirect a later hero in the same step
           (snapshot), and once its partner is really gone the hero must STAY - never cross to a
           different colour. The old code returned the first remaining portal there. */
        window.__pc.orderTest = function () {
            const keep = L[1][7];
            const first = (function () { const t = comp.getOutPortal(cc.v2(1, 1)); return [t.x, t.y]; })();
            L[1][7] = 1;                                    // pretend the purple partner was consumed
            const sameFrame = (function () { const t = comp.getOutPortal(cc.v2(1, 1)); return [t.x, t.y]; })();
            L[1][7] = keep;
            return { first: first, afterConsumeSameFrame: sameFrame };
        };
        window.__pc.orderTestNextFrame = function () {
            const keep = L[1][7];
            L[1][7] = 1;
            return new Promise(function (res) {
                setTimeout(function () {
                    const t = comp.getOutPortal(cc.v2(1, 1));
                    L[1][7] = keep;
                    res([t.x, t.y]);
                }, 150);
            });
        };
        window.__pc.probe = function () {
            const out = { portals: [], heads: [], log: window.__pc.log.slice() };
            for (var y in L) for (var x in L[y]) {
                const xi = parseInt(x, 10), yi = parseInt(y, 10);
                if (L[y][x] === 2 || out.portals.some(p => p[0] === xi && p[1] === yi)) out.portals.push([xi, yi, L[y][x], val(I, xi, yi)]);
                if (L[y][x] === -1 || L[y][x] === -2) out.heads.push([xi, yi, L[y][x]]);
            }
            return out;
        };
        // what pairing does the level have right now, with no movement at all?
        const dry = {};
        portals.forEach(([x, y]) => { const t = comp.getOutPortal(cc.v2(x, y)); dry[x + ',' + y] = [t.x, t.y]; });
        /* THE DISCRIMINATOR: the engine asks with the cell the snake moves FROM, so ask from each
           hero cell BEFORE anything is consumed. A colour-aware answer must be 1,1->7,1 / 2,1->8,1 /
           3,1->9,1 (purple/red/blue). The old code always returned the FIRST portal in scan order
           (7,1) for every one of them, which is why differently-shaped levels crossed colours. */
        const heroDry = {};
        heads.forEach(([x, y]) => { const t = comp.getOutPortal(cc.v2(x, y)); heroDry[x + ',' + y] = [t.x, t.y]; });
        return { portals: portals, heads: heads, dryPairing: dry, heroCellDry: heroDry, stats: {
            patched: comp.__colorPortals === true,
            paintCells: window.MazeDashCustomTab && window.MazeDashCustomTab.stats ? window.MazeDashCustomTab.stats.portalCellsPainted : null,
        } };
    });
    console.log('LEVEL  portals:', JSON.stringify(prep.portals), ' heads:', JSON.stringify(prep.heads));
    console.log('PAIRING(no movement):', JSON.stringify(prep.dryPairing));
    console.log('HERO-CELL ASK (the discriminator):', JSON.stringify(prep.heroCellDry), '   expect 1,1->7,1  2,1->8,1  3,1->9,1');
    console.log('STATS:', JSON.stringify(prep.stats));

    const orderTest = await page.evaluate(() => window.__pc.orderTest());
    const orderNext = await page.evaluate(() => window.__pc.orderTestNextFrame());
    console.log('ORDER-TEST same frame (expect 7,1 - snapshot must ignore the consumption):', JSON.stringify(orderTest));
    console.log('ORDER-TEST next frame (expect 1,1 = STAY, never a different colour):', JSON.stringify(orderNext));

    // drive one real input (WASD goes through our keyboard module -> synthSwipe) and watch the step
    async function step(dir) {
        const before = await page.evaluate(() => window.__pc.probe());
        await page.evaluate(() => { (window.__pc.log.length = 0); });
        await page.keyboard.down(dir); await sleep(60); await page.keyboard.up(dir);
        await sleep(1400);
        const after = await page.evaluate(() => window.__pc.probe());
        return { before: before, after: after };
    }

    const KEYS = ['KeyD', 'KeyS', 'KeyA', 'KeyW', 'KeyD', 'KeyS'];
    for (let i = 0; i < KEYS.length; i++) {
        const r = await step(KEYS[i]);
        console.log('--- STEP ' + (i + 1) + ' key=' + KEYS[i]);
        console.log('   heads before:', JSON.stringify(r.before.heads.map(h => h[0] + ',' + h[1] + '=' + h[2])));
        console.log('   heads after :', JSON.stringify(r.after.heads.map(h => h[0] + ',' + h[1] + '=' + h[2])));
        console.log('   portals after:', JSON.stringify(r.after.portals));
        (r.after.log || []).forEach((c, k) => {
            console.log('   call' + k + ' ' + c.from.join(',') + ' -> ' + c.to.join(',') +
                (c.same ? ' (STAY)' : '') +
                ' | entryL before ' + c.before.entryL + ' after ' + c.afterEntryL +
                ' | targetL after ' + c.afterToL);
        });
    }
    // screenshot with the level intact (3 heroes + 3 colour pairs) - read it yourself
    await page.screenshot({ path: 'E:\\maze_dash\\_work\\test\\shots\\portal-runs-level.png' });

    /* THE ACCEPTANCE TABLE: repeat the transit step 5 times, each time on a freshly entered level,
       and record every hero's from -> to. Each hero must come out of its OWN colour's partner. */
    const runs = [];
    for (let r = 0; r < 5; r++) {
        await page.evaluate(() => { window.__pcRL = []; gamemain.enterEnterGameScene(10101); });
        for (let i = 0; i < 50; i++) { if (await page.evaluate(() => !!cc.find('Canvas/backgroup/game_map'))) break; await sleep(200); }
        await sleep(1600);
        await page.evaluate(() => {
            const comp = cc.find('Canvas/backgroup/game_map').getComponent('game_map');
            const cur = comp.getOutPortal;
            comp.getOutPortal = function (from) { const t = cur.call(this, from); window.__pcRL.push([from.x + ',' + from.y, t.x + ',' + t.y]); return t; };
        });
        await page.keyboard.down('KeyS'); await sleep(60); await page.keyboard.up('KeyS');
        await sleep(1500);
        runs.push(await page.evaluate(() => window.__pcRL));
    }
    let ok = 0, bad = 0;
    runs.forEach((calls, r) => {
        const seen = {};
        (calls || []).forEach((c) => { seen[c[0]] = c[1]; });
        const good = seen['1,1'] === '7,1' && seen['2,1'] === '8,1' && seen['3,1'] === '9,1';
        if (good) { ok++; } else { bad++; }
        console.log('RUN ' + (r + 1) + (good ? '  OK ' : '  BAD') + '  ' + JSON.stringify(seen));
    });
    console.log('RUNS total=' + runs.length + ' ok=' + ok + ' bad=' + bad + '   (each run: every hero must exit its own colour)');

    console.log('PAGEERRORS:', JSON.stringify(pageErrs.slice(0, 4)));
    await browser.close();
    process.exit(0);
})().catch((e) => { console.error('HARNESS ERROR', e && e.message); process.exit(1); });
