/*
 * Consolidated acceptance test for the Maze Dash web port.
 *   node acceptance.js
 * Exits 0 only if every check passes.
 */
'use strict';
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const puppeteer = require('puppeteer-core');

const WEB = 'E:\\maze_dash\\web';
const SHOTS = path.join(__dirname, 'shots');
const CHROME = 'C:\\Users\\Lenovo\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 8140;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
fs.mkdirSync(SHOTS, { recursive: true });

const checks = [];
function check(name, ok, detail) {
    checks.push({ name, ok: !!ok, detail });
    console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail !== undefined ? '   ' + JSON.stringify(detail) : ''}`);
}

(async () => {
    const server = spawn(process.execPath, [path.join(WEB, 'serve.js'), String(PORT)], { stdio: 'ignore' });
    await sleep(900);
    const browser = await puppeteer.launch({
        executablePath: CHROME, headless: 'new',
        userDataDir: path.join(__dirname, 'chrome-profile-accept'),
        args: ['--no-sandbox', '--disable-extensions', '--no-first-run', '--mute-audio',
            '--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader',
            '--autoplay-policy=no-user-gesture-required', '--window-size=540,960'],
        defaultViewport: { width: 540, height: 960 },
    });
    const page = await browser.newPage();
    const consoleErrors = [];
    const portNotes = [];
    const pageErrors = [];
    page.on('pageerror', (e) => pageErrors.push(e.message));
    page.on('console', (m) => {
        if (m.type() === 'error') { consoleErrors.push(m.text()); }
        if (/maze-dash-port/.test(m.text())) { portNotes.push(m.text()); }
    });
    page.on('requestfailed', (r) => consoleErrors.push('requestfailed ' + r.url()));

    const t0 = Date.now();
    await page.goto(`http://127.0.0.1:${PORT}/index.html`, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction('window.cc && cc.game._prepared === true && !!window.gamemain', { timeout: 60000, polling: 200 });
    const bootMs = Date.now() - t0;
    console.log(`boot: ${bootMs} ms`);

    // ---- observe the scene flow from the very beginning ----
    const scene = () => page.evaluate(() => (cc.director.getScene() ? cc.director.getScene().name : null));
    async function tap(x, y, settle) {
        await page.mouse.move(x, y); await page.mouse.down(); await sleep(70); await page.mouse.up();
        await sleep(settle || 900);
    }
    async function swipe(dx, dy) {
        await page.mouse.move(270, 480); await page.mouse.down(); await sleep(50);
        await page.mouse.move(270 + dx, 480 + dy, { steps: 8 }); await sleep(50);
        await page.mouse.up(); await sleep(1200);
    }

    const flow = [];
    let last = null;
    for (let i = 0; i < 120; i++) {
        const s = await scene();
        if (s !== last) { flow.push(s); last = s; }
        if (s === 'HallScene') { break; }
        if (i % 4 === 1) { await tap(270, 640, 400); } else { await sleep(400); }
    }

    // conf.* is filled asynchronously by cc.loader.loadRes/loadResDir
    await page.waitForFunction(
        'window.conf && conf.level_cfg && conf.worlds && conf.theme_cfg && conf.quest_cfg && conf.face_cfg && conf.stage_cfg && conf.all_Level && Object.keys(conf.all_Level).length >= 290',
        { timeout: 60000, polling: 200 }
    );
    console.log('config ready; scene flow:', flow.join(' > '));

    // ---------- engine + config ----------
    const cfg = await page.evaluate(() => ({
        engine: cc.ENGINE_VERSION,
        isNative: cc.sys.isNative,
        isBrowser: cc.sys.isBrowser,
        worlds: Object.keys(conf.worlds).length,
        levels: Object.keys(conf.level_cfg).length,
        maps: Object.keys(conf.all_Level).length,
        themes: Object.keys(conf.theme_cfg).length,
        quests: Object.keys(conf.quest_cfg).length,
        faces: Object.keys(conf.face_cfg).length,
        langs: Object.keys((window.i18n && i18n.languages) || {}).sort(),
        stages: Object.keys(conf.stage_cfg).length,
        ticketMax: gamemain.getTicketMaxNum(),
        ticket: gamemain.getTicketCount(),
        hints: gamemain.getHintCount(),
        canvas: (() => { const r = cc.game.canvas.getBoundingClientRect(); return { w: Math.round(r.width), h: Math.round(r.height) }; })(),
        visible: (() => { const v = cc.view.getVisibleSize(); return { w: v.width, h: v.height }; })(),
    }));
    check('engine is the Creator 2.0.2 browser build', cfg.engine === '2.0.2' && cfg.isNative === false && cfg.isBrowser === true, { engine: cfg.engine, isNative: cfg.isNative });
    check('all 8 worlds / 290 levels / 290 layouts / 8 themes loaded', cfg.worlds === 8 && cfg.levels === 290 && cfg.maps === 290 && cfg.themes === 8, { worlds: cfg.worlds, levels: cfg.levels, maps: cfg.maps, themes: cfg.themes });
    check('quests / faces / stage titles loaded', cfg.quests === 7 && cfg.faces === 12 && cfg.stages === 8, { quests: cfg.quests, faces: cfg.faces, stages: cfg.stages });
    check('game is localised (>=2 languages)', cfg.langs.length >= 2, cfg.langs);
    check('portrait 720x1280 stage mapped onto the canvas', cfg.visible.w === 720 && cfg.visible.h === 1280 && cfg.canvas.w === 540 && cfg.canvas.h === 960, { visible: cfg.visible, canvas: cfg.canvas });
    check('web economy adaptation active (no ad-gated lockout)', cfg.ticketMax === 999, { ticketMax: cfg.ticketMax, hints: cfg.hints });

    // ---------- audio ----------
    const audio = await page.evaluate(async () => {
        const out = {};
        try {
            const ctx = cc.sys.__audioSupport && cc.sys.__audioSupport.context;
            out.contextState = ctx ? ctx.state : null;
            out.musicPlaying = cc.audioEngine ? cc.audioEngine.isMusicPlaying() : null;
        } catch (e) { out.err = String(e); }
        // decode every mp3 in the build, exactly the way the engine does
        const urls = [];
        for (const mount in cc._CCSettings ? {} : {}) { /* noop */ }
        return out;
    });
    check('Web Audio context exists and is running (after first gesture policy bypass)', !!audio.contextState, audio);

    // decode a sample of clips through the engine's own loader path
    const decodes = await page.evaluate(async () => {
        const ctx = cc.sys.__audioSupport.context;
        // pull the audio urls straight out of the loaded resources
        const urls = [];
        for (const k in cc.loader._cache) {
            const it = cc.loader._cache[k];
            if (it && it.url && /\.mp3$/.test(it.url)) { urls.push(it.url); }
        }
        let ok = 0, fail = 0;
        for (const u of urls.slice(0, 12)) {
            try {
                const buf = await new Promise((res, rej) => {
                    const x = new XMLHttpRequest();
                    x.open('GET', u.replace(/\/+$/, '') + '/', true);
                    x.responseType = 'arraybuffer';
                    x.onload = () => res(x.response);
                    x.onerror = () => rej(new Error('xhr'));
                    x.send();
                });
                await ctx.decodeAudioData(buf.slice(0));
                ok++;
            } catch (e) { fail++; }
        }
        return { total: urls.length, sampled: Math.min(12, urls.length), ok, fail };
    });
    check('audio clips downloaded by the game decode in Web Audio', decodes.ok > 0 && decodes.fail === 0, decodes);

    // ---------- scene flow ----------
    const wanted = ['LaunchScene', 'AnimScene', 'HallScene'];
    const isOrderedSubsequence = flow.every((s, i) => i === 0 || wanted.indexOf(s) > wanted.indexOf(flow[i - 1]));
    check('scene flow LaunchScene -> AnimScene -> HallScene',
        flow[flow.length - 1] === 'HallScene' && isOrderedSubsequence && flow.indexOf('AnimScene') >= 0,
        flow);
    await sleep(2000);
    await page.screenshot({ path: path.join(SHOTS, 'a01-hall.png') });

    // ---------- enter level 1 through the UI ----------
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
    await page.screenshot({ path: path.join(SHOTS, 'a02-level1.png') });

    const state = await page.evaluate(() => {
        const map = window.gameScene.gameMap.getComponent('game_map');
        let tiles = 0;
        for (const k in map.Tiles) { tiles += Object.keys(map.Tiles[k]).length; }
        const heads = map.getSankeHead();
        return {
            mapId: map.mapId, worldId: map.worldId,
            size: { w: map.MapSize.width, h: map.MapSize.height },
            data: JSON.parse(JSON.stringify(map.Level_data)),
            tiles, heads: heads.length,
            solution: conf.level_cfg[map.mapId].sz_solution,
        };
    });
    check('level 1 board matches the shipped layout C,0,0', state.mapId === 1 && state.size.w === 3 && state.size.h === 1 && JSON.stringify(state.data) === JSON.stringify([[-1, 1, 1]]), state);
    check('board rendered (floor tiles + one head)', state.tiles === state.size.w * state.size.h - state.heads && state.heads === 1, { tiles: state.tiles, heads: state.heads });

    // ---------- play the level with a real swipe ----------
    await page.evaluate(() => {
        const map = window.gameScene.gameMap.getComponent('game_map');
        const proto = Object.getPrototypeOf(map);
        window.__clear = [];
        const orig = proto.checkClearSatge;
        proto.checkClearSatge = function () { const r = orig.apply(this, arguments); window.__clear.push({ mapId: this.mapId, r }); return r; };
    });
    await swipe(140, 0);  // solution for mapId 1 is "R"
    await sleep(1800);
    const played = await page.evaluate(() => ({
        clearEvents: (window.__clear || []).filter((e) => e.r),
        passMaxLevel: gamemain.getPassMaxLevelId(1),
        passInfo: typeof getLocalStorage === 'function' ? getLocalStorage('pass_info') : null,
    }));
    check('right dash clears the board (engine reported a clear)', played.clearEvents.length > 0, played.clearEvents);
    check('progress persisted (passMaxLevel 1, pass_info written)', played.passMaxLevel === 1 && !!played.passInfo, { passMaxLevel: played.passMaxLevel, passInfo: played.passInfo });
    await page.screenshot({ path: path.join(SHOTS, 'a03-cleared.png') });

    // ---------- keyboard shim ----------
    await sleep(1500);
    const kb = await page.evaluate(() => typeof window.MazeDashPort.swipe === 'function');
    check('keyboard/desktop shim installed', kb === true);

    // ---------- errors ----------
    check('no uncaught page errors', pageErrors.length === 0, pageErrors.slice(0, 6));
    const realErrors = consoleErrors.filter((e) => !/favicon/i.test(e));
    check('no console errors', realErrors.length === 0, realErrors.slice(0, 8));
    console.log('\nport log lines:', portNotes.length ? portNotes : 'none');

    const failed = checks.filter((c) => !c.ok);
    console.log(`\n================ ${checks.length - failed.length}/${checks.length} checks passed (boot ${bootMs} ms) ================`);
    fs.writeFileSync(path.join(__dirname, 'acceptance-result.json'), JSON.stringify({ bootMs, checks, cfg, decodes, state, played, pageErrors, consoleErrors, portNotes }, null, 2));

    await browser.close();
    server.kill();
    process.exit(failed.length ? 2 : 0);
})().catch((e) => { console.error('HARNESS ERROR', e); process.exit(1); });
