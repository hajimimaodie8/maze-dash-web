/*
 * Solver verification: play a run of levels using each level's own recorded
 * solution string (conf.level_cfg[mapId].sz_solution, shipped with the game)
 * and assert that the board is actually cleared every time.
 *
 * This exercises the real movement engine end to end: dash-until-blocked,
 * body filling, arrows, portals, keys/locks and breakable bricks all appear in
 * the early worlds, plus progress saving and the auto-advance to the next level.
 */
'use strict';
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const puppeteer = require('puppeteer-core');

const WEB = 'E:\\maze_dash\\web';
const SHOTS = path.join(__dirname, 'shots');
const CHROME = 'C:\\Users\\Lenovo\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 8133;
const MAX_LEVELS = Number(process.argv[2] || 10);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
fs.mkdirSync(SHOTS, { recursive: true });

const SWIPE = { U: [0, -140], D: [0, 140], L: [-140, 0], R: [140, 0] };

(async () => {
    const server = spawn(process.execPath, [path.join(WEB, 'serve.js'), String(PORT)], { stdio: 'ignore' });
    await sleep(900);
    const browser = await puppeteer.launch({
        executablePath: CHROME, headless: 'new',
        userDataDir: path.join(__dirname, 'chrome-profile-solver'),
        args: ['--no-sandbox', '--disable-extensions', '--no-first-run', '--mute-audio',
            '--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader',
            '--autoplay-policy=no-user-gesture-required', '--window-size=540,960'],
        defaultViewport: { width: 540, height: 960 },
    });
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
    page.on('console', (m) => { if (m.type() === 'error') { errors.push('console: ' + m.text()); } });

    await page.goto(`http://127.0.0.1:${PORT}/index.html`, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction('window.cc && cc.game._prepared === true && !!window.gamemain', { timeout: 60000, polling: 200 });
    console.log('booted, engine ' + await page.evaluate(() => cc.ENGINE_VERSION));

    const scene = () => page.evaluate(() => (cc.director.getScene() ? cc.director.getScene().name : null));
    async function tap(x, y, settle) {
        await page.mouse.move(x, y); await page.mouse.down(); await sleep(70); await page.mouse.up();
        await sleep(settle || 800);
    }
    async function swipe(dir) {
        const [dx, dy] = SWIPE[dir];
        const cx = 270, cy = 480;
        await page.mouse.move(cx, cy); await page.mouse.down(); await sleep(40);
        await page.mouse.move(cx + dx, cy + dy, { steps: 6 }); await sleep(40);
        await page.mouse.up();
        await sleep(900);
    }

    // ---- reach HallScene ----
    for (let i = 0; i < 90; i++) {
        if ((await scene()) === 'HallScene') { break; }
        if (i % 4 === 1) { await tap(270, 640, 400); } else { await sleep(500); }
    }
    await sleep(2000);

    // ---- enter level 1 ----
    const css = await page.evaluate(() => {
        let found = null;
        function cn(c) { try { return cc.js.getClassName(c); } catch (e) { return '?'; } }
        (function walk(n) {
            for (const c of (n._components || [])) {
                if (cn(c) === 'LevelButton') {
                    const label = (n.getComponentsInChildren(cc.Label) || []).map((l) => l.string).join('');
                    if (label === '1') {
                        const wp = n.convertToWorldSpaceAR(cc.v2(0, 0));
                        const r = cc.game.canvas.getBoundingClientRect();
                        const vs = cc.view.getVisibleSize();
                        found = { x: r.left + wp.x * (r.width / vs.width), y: r.top + (vs.height - wp.y) * (r.height / vs.height) };
                    }
                }
            }
            (n.children || []).forEach(walk);
        })(cc.director.getScene());
        return found;
    });
    console.log('level 1 button css:', JSON.stringify(css));

    // The level grid slides in (MoveNodeList), so wait for the button to stop
    // moving before tapping, and retry if the game scene does not appear.
    async function posOfLevel1() {
        return page.evaluate(() => {
            let found = null;
            function cn(c) { try { return cc.js.getClassName(c); } catch (e) { return '?'; } }
            (function walk(n) {
                for (const c of (n._components || [])) {
                    if (cn(c) === 'LevelButton') {
                        const label = (n.getComponentsInChildren(cc.Label) || []).map((l) => l.string).join('');
                        if (label === '1') {
                            const wp = n.convertToWorldSpaceAR(cc.v2(0, 0));
                            const r = cc.game.canvas.getBoundingClientRect();
                            const vs = cc.view.getVisibleSize();
                            found = { x: r.left + wp.x * (r.width / vs.width), y: r.top + (vs.height - wp.y) * (r.height / vs.height) };
                        }
                    }
                }
                (n.children || []).forEach(walk);
            })(cc.director.getScene());
            return found;
        });
    }

    let prev = null;
    for (let i = 0; i < 40; i++) {
        const p = await posOfLevel1();
        if (p && prev && Math.abs(p.x - prev.x) < 0.5 && Math.abs(p.y - prev.y) < 0.5) { break; }
        prev = p;
        await sleep(300);
    }
    console.log('stable level-1 position:', JSON.stringify(prev));

    let entered = false;
    for (let attempt = 0; attempt < 5 && !entered; attempt++) {
        const p = (await posOfLevel1()) || prev;
        await tap(p.x, p.y, 1500);
        try {
            await page.waitForFunction(
                `(() => {
                    if (!window.gameScene || !window.gameScene.gameMap) return false;
                    const s = cc.director.getScene();
                    if (!s || s.name !== 'gameScene') return false;
                    return !!window.gameScene.gameMap.getComponent('game_map');
                })()`,
                { timeout: 9000, polling: 200 }
            );
            entered = true;
        } catch (e) {
            console.log('  enter attempt ' + (attempt + 1) + ' did not reach gameScene, scene=' + await scene());
            await sleep(1200);
        }
    }
    if (!entered) { throw new Error('could not enter level 1'); }
    await sleep(900);
    console.log('gameScene live, scene =', await scene());

    // ---- install a recorder on game_map.checkClearSatge ----
    await page.evaluate(() => {
        const map = window.gameScene.gameMap.getComponent('game_map');
        const proto = Object.getPrototypeOf(map);
        window.__clearLog = [];
        const orig = proto.checkClearSatge;
        proto.checkClearSatge = function () {
            const r = orig.apply(this, arguments);
            window.__clearLog.push({ mapId: this.mapId, cleared: r, t: Date.now() });
            return r;
        };
        // remember which level the current board belongs to
        window.__boardMapId = function () {
            try { return window.gameScene.gameMap.getComponent('game_map').mapId; } catch (e) { return null; }
        };
    });

    /* Convert a world position on a node into CSS page coordinates. */
    const CSSCONV = `(function (wp) {
        var r = cc.game.canvas.getBoundingClientRect();
        var vs = cc.view.getVisibleSize();
        return { x: r.left + wp.x * (r.width / vs.width), y: r.top + (vs.height - wp.y) * (r.height / vs.height) };
    })`;

    /*
     * After a level is cleared the game either auto-advances (world 1, level<=2)
     * or fades in a "Continue" button that must be tapped. Later clears can also
     * raise quest / face-unlock modals. Poll, tap whatever is waiting, and stop
     * once the board's mapId actually changes.
     */
    async function advancePast(prevMapId) {
        for (let i = 0; i < 40; i++) {
            const st = await page.evaluate((conv) => {
                const s = cc.director.getScene();
                const out = { scene: s ? s.name : null, mapId: null, tap: null, tapName: null };
                if (!s) { return out; }
                if (s.name === 'gameScene' && window.gameScene && window.gameScene.gameMap) {
                    const map = window.gameScene.gameMap.getComponent('game_map');
                    out.mapId = map ? map.mapId : null;
                }
                // 1) the in-game Continue button
                const gs = window.gameScene;
                let node = null;
                if (gs && gs.btnContinue && gs.btnContinue.activeInHierarchy) { node = gs.btnContinue; out.tapName = 'btnContinue'; }
                if (!node) {
                    // 2) any active modal confirm/OK button
                    const cands = [];
                    (function walk(n, inModal) {
                        const modal = inModal || /Modal|Tips|TipsWnd|PopShop|Quest|Unlock|Complete/i.test(n.name);
                        if (modal) { cands.push(n); }
                        (n.children || []).forEach((k) => walk(k, modal));
                    })(s, false);
                    for (const c of cands) {
                        if (!c.activeInHierarchy) { continue; }
                        if (/^(btnOK|btnConfirm|btnNext|btnContinue|btnOk)$/i.test(c.name)) { node = c; out.tapName = c.name; break; }
                    }
                }
                if (node) {
                    const wp = node.convertToWorldSpaceAR(cc.v2(0, 0));
                    const r = cc.game.canvas.getBoundingClientRect();
                    const vs = cc.view.getVisibleSize();
                    out.tap = { x: r.left + wp.x * (r.width / vs.width), y: r.top + (vs.height - wp.y) * (r.height / vs.height), w: node.width, h: node.height };
                    if (!(out.tap.w > 1 && out.tap.h > 1)) { out.tap = null; }
                }
                return out;
            }, CSSCONV);

            if (st.mapId !== null && st.mapId !== prevMapId) { return st; }
            if (st.scene === 'HallScene') { return st; }
            if (st.tap) {
                console.log(`     advance: tapping ${st.tapName} at (${st.tap.x.toFixed(0)},${st.tap.y.toFixed(0)})`);
                await tap(st.tap.x, st.tap.y, 1300);
            } else {
                await sleep(600);
            }
        }
        return null;
    }

    const results = [];
    let lastMapId = null;

    for (let n = 0; n < MAX_LEVELS; n++) {
        const st = await page.evaluate(() => {
            const s = cc.director.getScene();
            if (!s || s.name !== 'gameScene' || !window.gameScene) { return { scene: s ? s.name : null }; }
            const map = window.gameScene.gameMap.getComponent('game_map');
            const cfg = conf.level_cfg[map.mapId];
            return {
                scene: s.name,
                mapId: map.mapId,
                worldId: map.worldId,
                mapSize: { w: map.MapSize.width, h: map.MapSize.height },
                solution: cfg ? cfg.sz_solution : null,
                tiles: (function () { let c = 0; for (const k in map.Tiles) { c += Object.keys(map.Tiles[k]).length; } return c; })(),
                clearLogLen: window.__clearLog.length,
            };
        });
        if (st.scene !== 'gameScene' || !st.solution) {
            console.log(`stop at iteration ${n}: ${JSON.stringify(st)}`);
            break;
        }
        lastMapId = st.mapId;

        const moves = st.solution.split('');
        console.log(`\n[level ${st.worldId}-? mapId=${st.mapId}] board ${st.mapSize.w}x${st.mapSize.h} tiles=${st.tiles} solution="${st.solution}" (${moves.length} moves)`);

        const clearLogBefore = await page.evaluate(() => window.__clearLog.length);

        // Replay the solution, confirming each dash actually moved the snake.
        // A swipe dropped mid-animation would desync the whole sequence.
        const headPos = () => page.evaluate(() => {
            try {
                const m = window.gameScene.gameMap.getComponent('game_map');
                const h = m.getSankeHead();
                return h.length ? h[0].x + ',' + h[0].y : null;
            } catch (e) { return null; }
        });
        const moveTally = [];
        for (const mv of moves) {
            let before = await headPos();
            let moved = false;
            for (let attempt = 0; attempt < 3 && !moved; attempt++) {
                await swipe(mv);
                // a dash is ~0.05s of tweening; give it room to settle
                for (let w = 0; w < 8 && !moved; w++) {
                    await sleep(120);
                    const now = await headPos();
                    if (now !== before) { moved = true; }
                }
                if (!moved) { console.log(`     move ${mv} did not register (attempt ${attempt + 1}) — retrying`); }
            }
            moveTally.push(mv + (moved ? '' : '!'));
            if (!moved) { console.log(`     move ${mv} still did not move (blocked or dropped)`); }
        }
        console.log('   replay: ' + moveTally.join(' '));
        await sleep(1200);

        // did THIS level get cleared during this attempt?
        const cleared = await page.evaluate((b) => window.__clearLog.slice(b).some((e) => e.cleared), clearLogBefore);
        console.log(`   clear recorded for mapId ${st.mapId}: ${cleared}`);

        let advanced = null;
        if (cleared) { advanced = await advancePast(st.mapId); }

        const after = await page.evaluate(() => {
            const s = cc.director.getScene();
            let mapId = null;
            try { mapId = window.gameScene.gameMap.getComponent('game_map').mapId; } catch (e) {}
            return { scene: s ? s.name : null, mapId, passMax: window.gamemain ? gamemain.getPassMaxLevelId(1) : null };
        });

        results.push({ mapId: st.mapId, solution: st.solution, cleared, advanced: advanced ? advanced.mapId : null, nowMapId: after.mapId, passMax: after.passMax });
        console.log(`   -> ${cleared ? 'CLEARED' : 'NOT CLEARED'}  advance=${advanced ? advanced.mapId : 'none'}  nowMapId=${after.mapId}  passMaxLevel=${after.passMax}`);

        if (n === 0) { await page.screenshot({ path: path.join(SHOTS, 's01-after-first.png') }); }
        if (!cleared) { await page.screenshot({ path: path.join(SHOTS, `s-fail-mapid${st.mapId}.png`) }); break; }
        if (!advanced) { await page.screenshot({ path: path.join(SHOTS, `s-stuck-mapid${st.mapId}.png`) }); break; }
        if (n === MAX_LEVELS - 1) { await page.screenshot({ path: path.join(SHOTS, 's-last.png') }); }
    }

    await page.screenshot({ path: path.join(SHOTS, 's-final.png') });

    const cleared = results.filter((r) => r.cleared).length;
    console.log(`\n=== solved ${cleared}/${results.length} levels via their own solutions ===`);
    console.log('levels:', results.map((r) => r.mapId).join(', '));
    console.log('errors:', errors.length ? errors.slice(0, 6) : 'none');

    fs.writeFileSync(path.join(__dirname, 'solver-result.json'), JSON.stringify({ results, errors, lastMapId }, null, 2));

    await browser.close();
    server.kill();
    process.exit(cleared === results.length && results.length > 0 ? 0 : 2);
})().catch((e) => { console.error('HARNESS ERROR', e); process.exit(1); });
