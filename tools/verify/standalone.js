/*
 * Verify the self-contained single-file build runs straight from file://
 * with no network access at all.
 */
'use strict';
const path = require('path');
const fs = require('fs');
const puppeteer = require('puppeteer-core');

const FILE = 'file:///E:/maze_dash/dist/MazeDash-standalone.html';
const CHROME = 'C:\\Users\\Lenovo\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe';
const SHOTS = path.join(__dirname, 'shots');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
fs.mkdirSync(SHOTS, { recursive: true });

const checks = [];
function check(name, ok, detail) {
    checks.push({ name, ok: !!ok, detail });
    console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail !== undefined ? '   ' + JSON.stringify(detail) : ''}`);
}

(async () => {
    const browser = await puppeteer.launch({
        executablePath: CHROME, headless: 'new',
        userDataDir: path.join(__dirname, 'chrome-profile-standalone'),
        args: ['--no-sandbox', '--disable-extensions', '--no-first-run', '--mute-audio',
            '--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader',
            '--autoplay-policy=no-user-gesture-required', '--window-size=540,960'],
        defaultViewport: { width: 540, height: 960 },
    });
    const page = await browser.newPage();
    const requests = [];
    const pageErrors = [];
    const consoleErrors = [];
    page.on('request', (r) => requests.push(r.url()));
    page.on('pageerror', (e) => pageErrors.push(e.message));
    page.on('console', (m) => { if (m.type() === 'error') { consoleErrors.push(m.text()); } });

    const t0 = Date.now();
    await page.goto(FILE, { waitUntil: 'domcontentloaded', timeout: 120000 });
    await page.waitForFunction('window.cc && cc.game._prepared === true && !!window.gamemain', { timeout: 120000, polling: 200 });
    const bootMs = Date.now() - t0;
    console.log(`boot: ${bootMs} ms  (file is ${(fs.statSync('E:/maze_dash/dist/MazeDash-standalone.html').size / 1048576).toFixed(2)} MB)`);

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
    check('scene flow reaches HallScene from file://', flow[flow.length - 1] === 'HallScene', flow);
    await sleep(2200);
    await page.screenshot({ path: path.join(SHOTS, 'sa01-hall.png') });

    // ---- the important one: no network traffic at all ----
    // data: URLs are in-memory and show up in the request list, so exclude them.
    const external = requests.filter((u) => u !== FILE && !/^data:/.test(u) && !/^devtools:/.test(u));
    const dataUrls = requests.filter((u) => /^data:/.test(u));
    check('zero network requests besides the document itself', external.length === 0,
        { network: external.slice(0, 6), documentRequests: requests.length - external.length - dataUrls.length, inMemoryDataUrls: dataUrls.length });

    const vfs = await page.evaluate(() => window.__mazeDashVfsStats);
    check('in-memory loaders served the assets', vfs && vfs.text > 0 && vfs.image > 0, vfs);
    check('no asset fell through to the network', vfs && vfs.missed.length === 0, vfs && vfs.missed.slice(0, 8));

    const cfg = await page.evaluate(() => ({
        engine: cc.ENGINE_VERSION, isNative: cc.sys.isNative,
        worlds: Object.keys(conf.worlds).length,
        levels: Object.keys(conf.level_cfg).length,
        maps: Object.keys(conf.all_Level).length,
        ticketMax: gamemain.getTicketMaxNum(),
        fonts: (() => {
            const out = [];
            for (const s of Array.from(document.styleSheets)) {
                let r; try { r = s.cssRules; } catch (e) { continue; }
                for (const x of Array.from(r || [])) {
                    if (x.constructor && x.constructor.name === 'CSSFontFaceRule') {
                        out.push(x.style.fontFamily.replace(/"/g, ''));
                    }
                }
            }
            return out;
        })(),
        fontStatus: (() => {
            const out = {};
            for (const s of Array.from(document.styleSheets)) {
                let r; try { r = s.cssRules; } catch (e) { continue; }
                for (const x of Array.from(r || [])) {
                    if (x.constructor && x.constructor.name === 'CSSFontFaceRule') {
                        out[x.style.fontFamily.replace(/"/g, '')] = document.fonts.check('16px "' + x.style.fontFamily.replace(/"/g, '') + '"');
                    }
                }
            }
            return out;
        })(),
        inline: !!window.__MAZE_DASH_INLINE_ASSETS,
    }));
    check('engine + full data set loaded from the single file', cfg.engine === '2.0.2' && cfg.isNative === false && cfg.maps === 290 && cfg.levels === 290 && cfg.worlds === 8, cfg);
    check('web economy adaptation active', cfg.ticketMax === 999, { ticketMax: cfg.ticketMax });
    check('self-contained flag set (disk guard disabled)', cfg.inline === true);
    check('embedded TTF fonts registered and usable', cfg.fonts.length >= 1 && Object.values(cfg.fontStatus).every(Boolean), { fonts: cfg.fonts, status: cfg.fontStatus });

    // ---- gameplay through the inlined build ----
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
        } catch (e) { await sleep(1000); }
    }
    check('tapping level 1 opens gameScene', entered, await scene());

    const state = await page.evaluate(() => {
        const map = window.gameScene.gameMap.getComponent('game_map');
        let tiles = 0;
        for (const k in map.Tiles) { tiles += Object.keys(map.Tiles[k]).length; }
        return { mapId: map.mapId, size: { w: map.MapSize.width, h: map.MapSize.height }, data: JSON.parse(JSON.stringify(map.Level_data)), tiles, heads: map.getSankeHead().length };
    });
    check('level 1 board correct (layout C,0,0)', state.mapId === 1 && state.size.w === 3 && state.size.h === 1 && JSON.stringify(state.data) === JSON.stringify([[-1, 1, 1]]), state);
    await page.screenshot({ path: path.join(SHOTS, 'sa02-level1.png') });

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
        passInfo: typeof getLocalStorage === 'function' ? getLocalStorage('pass_info') : null,
        music: cc.audioEngine ? cc.audioEngine.isMusicPlaying() : null,
    }));
    check('right dash clears the board', played.cleared === true, played);
    check('progress persisted to localStorage', played.passMaxLevel === 1 && !!played.passInfo, { passMaxLevel: played.passMaxLevel, passInfo: played.passInfo });
    await page.screenshot({ path: path.join(SHOTS, 'sa03-cleared.png') });

    check('no uncaught page errors', pageErrors.length === 0, pageErrors.slice(0, 6));
    check('no console errors', consoleErrors.length === 0, consoleErrors.slice(0, 6));

    const failed = checks.filter((c) => !c.ok);
    console.log(`\n============ ${checks.length - failed.length}/${checks.length} standalone checks passed (boot ${bootMs} ms) ============`);
    fs.writeFileSync(path.join(__dirname, 'standalone-result.json'), JSON.stringify({ bootMs, checks, cfg, vfs, state, played, requests, pageErrors, consoleErrors }, null, 2));
    await browser.close();
    process.exit(failed.length ? 2 : 0);
})().catch((e) => { console.error('HARNESS ERROR', e); process.exit(1); });
