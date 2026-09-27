/*
 * End-to-end gameplay verification:
 *   HallScene -> tap Level 1 -> gameScene -> swipe the known solution -> assert clear.
 * Level 1 (mapId 1) layout is "C,0,0" with solution "R", so a single right dash
 * must fill the 1x3 board and complete the stage.
 */
'use strict';
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const puppeteer = require('puppeteer-core');

const WEB = 'E:\\maze_dash\\web';
const SHOTS = path.join(__dirname, 'shots');
const CHROME = 'C:\\Users\\Lenovo\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 8131;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
fs.mkdirSync(SHOTS, { recursive: true });

const RESULTS = { steps: [], asserts: [] };
function step(name, extra) { RESULTS.steps.push(Object.assign({ step: name }, extra || {})); console.log('  · ' + name + (extra ? ' ' + JSON.stringify(extra) : '')); }
function assert(name, ok, detail) {
    RESULTS.asserts.push({ name, ok: !!ok, detail });
    console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${name}${detail !== undefined ? '  -> ' + JSON.stringify(detail) : ''}`);
}

(async () => {
    const server = spawn(process.execPath, [path.join(WEB, 'serve.js'), String(PORT)], { stdio: 'ignore' });
    await sleep(900);
    const browser = await puppeteer.launch({
        executablePath: CHROME, headless: 'new',
        userDataDir: path.join(__dirname, 'chrome-profile'),
        args: ['--no-sandbox', '--disable-extensions', '--no-first-run', '--mute-audio',
            '--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader',
            '--autoplay-policy=no-user-gesture-required', '--window-size=540,960'],
        defaultViewport: { width: 540, height: 960 },
    });
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => { if (m.type() === 'error') { errors.push('console: ' + m.text()); } });

    await page.goto(`http://127.0.0.1:${PORT}/index.html`, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction('window.cc && cc.game._prepared === true && !!window.gamemain', { timeout: 60000, polling: 200 });
    step('booted');

    const scene = () => page.evaluate(() => (cc.director.getScene() ? cc.director.getScene().name : null));
    async function tap(x, y, settle) {
        await page.mouse.move(x, y); await page.mouse.down(); await sleep(70); await page.mouse.up();
        await sleep(settle || 900);
    }
    async function swipeAt(cx, cy, dx, dy) {
        await page.mouse.move(cx, cy); await page.mouse.down(); await sleep(50);
        await page.mouse.move(cx + dx, cy + dy, { steps: 8 }); await sleep(50);
        await page.mouse.up(); await sleep(1400);
    }

    // ---------- 1. reach HallScene ----------
    for (let i = 0; i < 90; i++) {
        if ((await scene()) === 'HallScene') { break; }
        if (i % 4 === 1) { await tap(270, 640, 400); } else { await sleep(500); }
    }
    await sleep(2500);
    assert('reached HallScene', (await scene()) === 'HallScene', await scene());
    await page.screenshot({ path: path.join(SHOTS, 'g01-hall.png') });

    // ---------- 2. locate the LevelButton for level 1 ----------
    const btn = await page.evaluate(() => {
        const out = [];
        function className(c) { try { return cc.js.getClassName(c); } catch (e) { return '?'; } }
        function walk(n) {
            for (const c of (n._components || [])) {
                if (className(c) === 'LevelButton') {
                    const wp = n.convertToWorldSpaceAR(cc.v2(0, 0));
                    const label = (n.getComponentsInChildren(cc.Label) || []).map((l) => l.string).join('|');
                    const handlers = (c.clickEvents || []).map((e) => e.handler);
                    out.push({ node: n.name, label, handlers, wx: wp.x, wy: wp.y, w: n.width, h: n.height, active: n.activeInHierarchy });
                }
            }
            (n.children || []).forEach(walk);
        }
        walk(cc.director.getScene());
        const canvas = cc.game.canvas;
        const r = canvas.getBoundingClientRect();
        const vs = cc.view.getVisibleSize();
        const toCss = (wx, wy) => ({
            x: r.left + wx * (r.width / vs.width),
            y: r.top + (vs.height - wy) * (r.height / vs.height),
        });
        return {
            count: out.length,
            rect: { w: r.width, h: r.height },
            visible: { w: vs.width, h: vs.height },
            buttons: out.map((b) => Object.assign({}, b, { css: toCss(b.wx, b.wy) })),
        };
    });
    step('level buttons found', { count: btn.count, canvas: btn.rect, visible: btn.visible });
    // level 1 is identified by its "1" label; it is also the only button wired to clickEnterGame
    const lv1 = btn.buttons.find((b) => b.label === '1' && b.handlers.indexOf('clickEnterGame') >= 0)
        || btn.buttons.find((b) => b.handlers.indexOf('clickEnterGame') >= 0)
        || btn.buttons.find((b) => b.label === '1');
    assert('level-1 button exists', !!lv1, lv1 && { label: lv1.label, css: lv1.css, handlers: lv1.handlers });
    if (lv1) { console.log('    level1 css:', JSON.stringify(lv1.css), 'world:', lv1.wx, lv1.wy, 'handlers:', lv1.handlers); }

    // ---------- 3. enter level 1 ----------
    if (lv1) {
        await tap(lv1.css.x, lv1.css.y, 2600);
        const s = await scene();
        step('after tapping level 1', { scene: s });
        assert('scene is gameScene', s === 'gameScene', s);
        await page.screenshot({ path: path.join(SHOTS, 'g02-level1.png') });

        const mapState = await page.evaluate(() => {
            const gs = window.gameScene;
            if (!gs) { return { err: 'no window.gameScene' }; }
            const map = gs.gameMap && gs.gameMap.getComponent('game_map');
            if (!map) { return { err: 'no game_map component' }; }
            return {
                worldId: map.worldId, mapId: map.mapId,
                mapSize: { w: map.MapSize.width, h: map.MapSize.height },
                tileSize: { w: map.TileSize.width, h: map.TileSize.height },
                levelData: JSON.parse(JSON.stringify(map.Level_data)),
                cleared: map.checkClearSatge(),
                heads: map.getSankeHead().length,
                tiles: countTiles(map),
            };
            function countTiles(m) {
                let n = 0;
                for (const k in m.Tiles) { n += Object.keys(m.Tiles[k]).length; }
                return n;
            }
        });
        step('level state', mapState);
        assert('mapId == 1', mapState.mapId === 1, mapState.mapId);
        assert('board is 1 row x 3 cols', mapState.mapSize && mapState.mapSize.w === 3 && mapState.mapSize.h === 1, mapState.mapSize);
        assert('one snake head on board', mapState.heads === 1, mapState.heads);
        assert('floor tiles rendered', mapState.tiles === 3, mapState.tiles);
        assert('not already cleared', mapState.cleared === false, mapState.cleared);

        // ---------- 4. play the known solution for mapId 1: "R" ----------
        const before = await page.screenshot({ path: path.join(SHOTS, 'g03-before-move.png') });
        await swipeAt(270, 480, 140, 0);   // dash right
        await sleep(1200);
        await page.screenshot({ path: path.join(SHOTS, 'g04-after-right-dash.png') });

        const after = await page.evaluate(() => {
            const map = window.gameScene.gameMap.getComponent('game_map');
            return {
                cleared: map.checkClearSatge(),
                levelData: JSON.parse(JSON.stringify(map.Level_data)),
                itemData: JSON.parse(JSON.stringify(map.Level_item_data)),
            };
        });
        step('after right dash', after);
        assert('board fully covered -> checkClearSatge()', after.cleared === true, after.cleared);

        // ---------- 5. completion flow ----------
        await sleep(3500);
        await page.screenshot({ path: path.join(SHOTS, 'g05-complete.png') });
        const post = await page.evaluate(() => {
            const scene = cc.director.getScene();
            const names = [];
            (function walk(n) { names.push(n.name); (n.children || []).forEach(walk); })(scene);
            return {
                scene: scene.name,
                passInfo: window.getLocalStorage ? getLocalStorage('pass_info') : null,
                passMaxLevel: window.gamemain ? gamemain.getPassMaxLevelId(1) : null,
                ticket: window.gamemain ? gamemain.getTicketCount() : null,
                hasCompletePopup: names.some((n) => /complete|Complete|win|Win|tick|Tick/i.test(n)),
                nodeCount: names.length,
            };
        });
        step('post-completion state', post);
        assert('level 1 recorded as passed', String(post.passMaxLevel) === '1', post.passMaxLevel);
        assert('ticket consumed (cost 1)', typeof post.ticket === 'number' && post.ticket < 999, post.ticket);
        assert('pass_info persisted to localStorage', !!post.passInfo, post.passInfo && post.passInfo.slice(0, 80));
    }

    assert('no console/page errors', errors.length === 0, errors.slice(0, 8));

    RESULTS.errors = errors;
    fs.writeFileSync(path.join(__dirname, 'gameplay-result.json'), JSON.stringify(RESULTS, null, 2));
    const failed = RESULTS.asserts.filter((a) => !a.ok);
    console.log(`\n=== ${RESULTS.asserts.length - failed.length}/${RESULTS.asserts.length} assertions passed ===`);

    await browser.close();
    server.kill();
    process.exit(failed.length ? 2 : 0);
})().catch((e) => { console.error('HARNESS ERROR', e); process.exit(1); });
