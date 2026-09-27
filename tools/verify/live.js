/* Load the deployed GitHub Pages site and check that the game really runs there. */
'use strict';
const path = require('path');
const fs = require('fs');
const puppeteer = require('puppeteer-core');

const URL_ = 'https://hajimimaodie8.github.io/maze-dash-web/';
const CHROME = 'C:\\Users\\Lenovo\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe';
const SHOTS = path.join(__dirname, 'shots');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
    const browser = await puppeteer.launch({
        executablePath: CHROME, headless: 'new',
        userDataDir: path.join(__dirname, 'chrome-profile-live'),
        args: ['--no-sandbox', '--disable-extensions', '--no-first-run', '--mute-audio',
            '--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader',
            '--autoplay-policy=no-user-gesture-required', '--window-size=540,960'],
        defaultViewport: { width: 540, height: 960 },
    });
    const page = await browser.newPage();
    const errs = [];
    const failed = [];
    page.on('pageerror', (e) => errs.push(e.message));
    page.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
    page.on('requestfailed', (r) => failed.push((r.failure() && r.failure().errorText) + ' ' + r.url()));

    console.log('loading', URL_);
    const t0 = Date.now();
    await page.goto(URL_, { waitUntil: 'domcontentloaded', timeout: 120000 });
    await page.waitForFunction('window.cc && cc.game._prepared === true && !!window.gamemain', { timeout: 120000, polling: 200 });
    console.log(`booted in ${Date.now() - t0} ms`);

    await page.waitForFunction('window.conf && conf.all_Level && Object.keys(conf.all_Level).length >= 290', { timeout: 120000, polling: 200 });

    const scene = () => page.evaluate(() => (cc.director.getScene() ? cc.director.getScene().name : null));
    async function tap(x, y, settle) {
        await page.mouse.move(x, y); await page.mouse.down(); await sleep(70); await page.mouse.up();
        await sleep(settle || 900);
    }
    async function swipe(dx, dy) {
        await page.mouse.move(270, 480); await page.mouse.down(); await sleep(50);
        await page.mouse.move(270 + dx, 480 + dy, { steps: 8 }); await sleep(50);
        await page.mouse.up(); await sleep(1300);
    }

    const flow = [];
    let last = null;
    for (let i = 0; i < 120; i++) {
        const s = await scene();
        if (s !== last) { flow.push(s); last = s; }
        if (s === 'HallScene') { break; }
        if (i % 4 === 1) { await tap(270, 640, 400); } else { await sleep(400); }
    }
    await sleep(2000);
    await page.screenshot({ path: path.join(SHOTS, 'live-hall.png') });

    const cfg = await page.evaluate(() => ({
        engine: cc.ENGINE_VERSION,
        worlds: Object.keys(conf.worlds).length,
        levels: Object.keys(conf.level_cfg).length,
        maps: Object.keys(conf.all_Level).length,
        lang: Object.keys(i18n.languages).length,
        ticketMax: gamemain.getTicketMaxNum(),
        visible: (() => { const v = cc.view.getVisibleSize(); return { w: Math.round(v.width), h: Math.round(v.height) }; })(),
        badge: (() => { const b = document.getElementById('repobadge'); return b ? { href: b.getAttribute('href'), shown: getComputedStyle(b).display !== 'none' } : null; })(),
        bodyBg: getComputedStyle(document.body).backgroundColor,
        origin: location.origin,
    }));
    console.log('\ndiagnostics:', JSON.stringify(cfg, null, 1));

    // play level 1
    async function level1Pos() {
        return page.evaluate(() => {
            let f = null;
            function cn(c) { try { return cc.js.getClassName(c); } catch (e) { return '?'; } }
            (function walk(n) {
                for (const c of (n._components || [])) {
                    if (cn(c) === 'LevelButton') {
                        const label = (n.getComponentsInChildren(cc.Label) || []).map((l) => l.string).join('');
                        if (label === '1') {
                            const wp = n.convertToWorldSpaceAR(cc.v2(0, 0));
                            const r = cc.game.canvas.getBoundingClientRect();
                            const vs = cc.view.getVisibleSize();
                            f = { x: r.left + wp.x * (r.width / vs.width), y: r.top + (vs.height - wp.y) * (r.height / vs.height) };
                        }
                    }
                }
                (n.children || []).forEach(walk);
            })(cc.director.getScene());
            return f;
        });
    }
    let prev = null;
    for (let i = 0; i < 30; i++) { const p = await level1Pos(); if (p && prev && Math.abs(p.y - prev.y) < 0.5) { break; } prev = p; await sleep(300); }
    let entered = false;
    for (let a = 0; a < 4 && !entered; a++) {
        const p = (await level1Pos()) || prev;
        await tap(p.x, p.y, 1400);
        try {
            await page.waitForFunction(`(() => { const s = cc.director.getScene(); return s && s.name === 'gameScene' && window.gameScene && window.gameScene.gameMap && !!window.gameScene.gameMap.getComponent('game_map'); })()`, { timeout: 9000, polling: 200 });
            entered = true;
        } catch (e) { await sleep(800); }
    }
    await page.screenshot({ path: path.join(SHOTS, 'live-level1.png') });

    await page.evaluate(() => {
        const map = window.gameScene.gameMap.getComponent('game_map');
        const proto = Object.getPrototypeOf(map);
        window.__clear = [];
        const orig = proto.checkClearSatge;
        proto.checkClearSatge = function () { const r = orig.apply(this, arguments); window.__clear.push(r); return r; };
    });
    await swipe(140, 0);
    await sleep(1800);
    const played = await page.evaluate(() => ({
        cleared: (window.__clear || []).some(Boolean),
        passMaxLevel: gamemain.getPassMaxLevelId(1),
    }));
    await page.screenshot({ path: path.join(SHOTS, 'live-cleared.png') });

    const checks = [
        ['site is served from github.io', cfg.origin === 'https://hajimimaodie8.github.io'],
        ['engine is the Creator 2.0.2 browser build', cfg.engine === '2.0.2'],
        ['all 290 levels / 8 worlds loaded over the network', cfg.maps === 290 && cfg.levels === 290 && cfg.worlds === 8],
        ['scene flow reached HallScene', flow[flow.length - 1] === 'HallScene'],
        ['tapping level 1 opened gameScene', entered === true],
        ['a swipe cleared the board', played.cleared === true],
        ['progress saved', played.passMaxLevel === 1],
        ['github badge points at the repo', !!cfg.badge && /github\.com\/hajimimaodie8\/maze-dash-web/.test(cfg.badge.href)],
        ['no page errors', errs.length === 0],
        ['no failed requests', failed.length === 0],
    ];
    console.log('');
    let bad = 0;
    for (const [n, ok] of checks) { if (!ok) { bad++; } console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}`); }
    if (errs.length) { console.log('errors:', errs.slice(0, 5)); }
    if (failed.length) { console.log('failed requests:', failed.slice(0, 5)); }
    console.log(`\nscene flow: ${flow.join(' > ')}`);
    console.log(`${checks.length - bad}/${checks.length} live-site checks passed`);

    fs.writeFileSync(path.join(__dirname, 'live-result.json'), JSON.stringify({ cfg, flow, played, errs, failed, checks }, null, 2));
    await browser.close();
    process.exit(bad ? 2 : 0);
})().catch((e) => { console.error('HARNESS ERROR', e.message); process.exit(1); });
