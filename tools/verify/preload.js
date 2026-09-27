/* Verify: grid vertically centred + level descriptors pre-warmed before entry. */
'use strict';
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const puppeteer = require('puppeteer-core');
const WEB = 'E:\\maze_dash\\web';
const SHOTS = path.join(__dirname, 'shots');
const CHROME = 'C:\\Users\\Lenovo\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 8195;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const checks = [];
function check(n, ok, d) { checks.push({ n, ok: !!ok, d }); console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}${d !== undefined ? '   ' + JSON.stringify(d) : ''}`); }

(async () => {
    const server = spawn(process.execPath, [path.join(WEB, 'serve.js'), String(PORT)], { stdio: 'ignore' });
    await sleep(900);
    const browser = await puppeteer.launch({
        executablePath: CHROME, headless: 'new',
        userDataDir: path.join(__dirname, 'chrome-profile-pre'),
        args: ['--no-sandbox', '--disable-extensions', '--no-first-run', '--mute-audio',
            '--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader',
            '--autoplay-policy=no-user-gesture-required', '--window-size=1280,800'],
        defaultViewport: { width: 1280, height: 800 },
    });
    const page = await browser.newPage();
    const errs = [];
    let levelReqs = 0, cachedReqs = 0, phase = 'boot';
    const warmSet = new Set(), levelSet = new Set();
    page.on('pageerror', (e) => errs.push(String(e.message).slice(0, 70)));
    page.on('console', (m) => { if (m.type() === 'error' && !/not defined in the Scene/.test(m.text())) errs.push('console: ' + m.text().slice(0, 70)); });
    page.on('request', (r) => {
        const u = r.url();
        if (!/\/res\/import\//.test(u)) { return; }
        const short = u.replace(/^https?:\/\/[^/]+/, '').replace(/\/+$/, '');
        if (phase === 'level') { levelReqs++; levelSet.add(short); } else { warmSet.add(short); }
    });
    page.on('response', async (r) => {
        if (phase === 'level' && /\/res\/import\//.test(r.url())) {
            try { if (r.fromCache()) { cachedReqs++; } } catch (e) {}
        }
    });
    await page.goto(`http://127.0.0.1:${PORT}/index.html`, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction('window.cc && cc.game._prepared === true && !!window.gamemain', { timeout: 60000, polling: 200 });
    const scene = () => page.evaluate(() => (cc.director.getScene() ? cc.director.getScene().name : null));
    async function tap(x, y, s) { await page.mouse.move(x, y); await page.mouse.down(); await sleep(70); await page.mouse.up(); await sleep(s || 900); }
    for (let i = 0; i < 60; i++) {
        if ((await scene()) === 'HallScene') { break; }
        if (i % 3 === 1) { await tap(640, 400, 500); } else { await sleep(400); }
    }
    await sleep(3000);

    // wait for the warmup to finish digesting
    let pre = null;
    for (let i = 0; i < 20; i++) {
        pre = await page.evaluate(() => (window.MazeDashPreload ? window.MazeDashPreload.stats : null));
        if (pre && pre.total && pre.done + pre.failed >= pre.total) { break; }
        await sleep(700);
    }
    console.log('preload stats:', JSON.stringify(pre));
    check('the preloader found the manifest', !!pre && pre.total >= 40, pre && pre.total);
    check('every descriptor was warmed', !!pre && pre.done >= 40 && pre.failed === 0, pre);

    // grid centring
    const geo = await page.evaluate(() => {
        const c = cc.find('Canvas/gameView/scrollView').getComponent(cc.ScrollView).content.children.find((p) => p.getComponent('StageSelectLayer')).getComponent('StageSelectLayer');
        const content = c.SV.content, view = content.parent;
        const cb = content.getBoundingBoxToWorld(), vb = view.getBoundingBoxToWorld();
        return {
            contentCentre: Math.round(cb.y + cb.height / 2), viewCentre: Math.round(vb.y + vb.height / 2),
            contentH: Math.round(content.height), viewH: Math.round(view.height),
            centred: window.MazeDashWide ? (window.MazeDashWide.stats.gridCentered || 0) : 0,
        };
    });
    console.log('grid geometry:', JSON.stringify(geo));
    check('the level grid is vertically centred in its window', Math.abs(geo.contentCentre - geo.viewCentre) <= 3, geo);
    await page.screenshot({ path: path.join(SHOTS, 'grid-centred.png') });

    // now enter a level: the descriptors should come from cache
    phase = 'level';
    await page.evaluate(() => {
        const c = cc.find('Canvas/gameView/scrollView').getComponent(cc.ScrollView).content.children.find((p) => p.getComponent('StageSelectLayer')).getComponent('StageSelectLayer');
        const cfg = conf.stage_level_cfg[c.m_stageId];
        gamemain.enterEnterGameScene(cfg[Object.keys(cfg)[0]].id);
    });
    for (let i = 0; i < 30; i++) { if ((await scene()) === 'gameScene') { break; } await sleep(500); }
    await sleep(4000);
    console.log('level entry: descriptor requests', levelReqs, 'from cache', cachedReqs);
    check('the level still loads after the warmup', (await scene()) === 'gameScene', await scene());
    const overlap = Array.from(levelSet).filter((u) => warmSet.has(u)).length;
    check('the warmed set covers what entering a level asks for', overlap >= 40, { warmed: warmSet.size, asked: levelSet.size, overlap });
    check('no page errors', errs.length === 0, errs.slice(0, 4));
    const failed = checks.filter((c) => !c.ok);
    console.log(`\n============ ${checks.length - failed.length}/${checks.length} checks passed ============`);
    fs.writeFileSync(path.join(__dirname, 'preload-result.json'), JSON.stringify({ pre, geo, levelReqs, cachedReqs, checks, errs }, null, 2));
    await browser.close();
    server.kill();
    process.exit(failed.length ? 2 : 0);
})().catch((e) => { console.error('HARNESS ERROR', e); process.exit(1); });
