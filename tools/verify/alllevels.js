/*
 * Engine-level verification of every shipped level.
 *
 * For each of the 290 mapIds: rebuild the board exactly the way game_map does
 * (setTiles + addObstacle), replay that level's own sz_solution through the real
 * moveSanke() engine in instant mode, then ask checkClearSatge().
 *
 * This exercises the ported movement engine against every tile type in the game
 * (walls, breakable bricks, arrows, keys, locks, portals) and confirms that all
 * 290 level layouts deserialize and render.
 */
'use strict';
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const puppeteer = require('puppeteer-core');

const WEB = 'E:\\maze_dash\\web';
const CHROME = 'C:\\Users\\Lenovo\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 8134;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
    const server = spawn(process.execPath, [path.join(WEB, 'serve.js'), String(PORT)], { stdio: 'ignore' });
    await sleep(900);
    const browser = await puppeteer.launch({
        executablePath: CHROME, headless: 'new',
        userDataDir: path.join(__dirname, 'chrome-profile-all'),
        args: ['--no-sandbox', '--disable-extensions', '--no-first-run', '--mute-audio',
            '--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader',
            '--autoplay-policy=no-user-gesture-required', '--window-size=540,960'],
        defaultViewport: { width: 540, height: 960 },
    });
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(`http://127.0.0.1:${PORT}/index.html`, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction('window.cc && cc.game._prepared === true && !!window.gamemain', { timeout: 60000, polling: 200 });

    // reach the game scene so a live game_map component exists to drive
    const scene = () => page.evaluate(() => (cc.director.getScene() ? cc.director.getScene().name : null));
    for (let i = 0; i < 90; i++) {
        if ((await scene()) === 'HallScene') { break; }
        if (i % 4 === 1) {
            await page.mouse.move(270, 640); await page.mouse.down(); await sleep(60); await page.mouse.up(); await sleep(400);
        } else { await sleep(500); }
    }
    await sleep(2000);
    for (let attempt = 0; attempt < 5; attempt++) {
        const p = await page.evaluate(() => {
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
        if (!p) { await sleep(500); continue; }
        await page.mouse.move(p.x, p.y); await page.mouse.down(); await sleep(70); await page.mouse.up();
        await sleep(1500);
        if ((await scene()) === 'gameScene') { break; }
    }
    await page.waitForFunction(
        `(() => { const s = cc.director.getScene(); return s && s.name === 'gameScene' && window.gameScene && window.gameScene.gameMap && !!window.gameScene.gameMap.getComponent('game_map'); })()`,
        { timeout: 30000, polling: 200 });
    await sleep(800);
    console.log('ready: driving game_map directly');

    const out = await page.evaluate(() => {
        const map = window.gameScene.gameMap.getComponent('game_map');
        const results = [];
        const dirOf = (ch) => (ch === 'U' ? 1 : ch === 'D' ? 2 : ch === 'L' ? -1 : ch === 'R' ? -2 : NaN);

        function setup(mapId, worldId) {
            map.clearAll();
            const n = JSON.parse(JSON.stringify(conf.all_Level[mapId]));
            map.worldId = worldId;
            map.mapId = mapId;
            map.Themes = conf.theme_cfg[worldId];
            map.Level_data = n;
            map.Level_item_data = JSON.parse(JSON.stringify(n));
            map.MapSize = cc.size(n[0].length, n.length);
            map.setTiles(n);
            map.addObstacle();
        }

        function tileStats() {
            const counts = {};
            for (const r in map.Level_data) {
                for (const c in map.Level_data[r]) {
                    const v = map.Level_data[r][c];
                    counts[v] = (counts[v] || 0) + 1;
                }
            }
            return counts;
        }

        const ids = Object.keys(conf.level_cfg).map(Number).sort((a, b) => a - b);
        for (const levelId of ids) {
            const cfg = conf.level_cfg[levelId];
            const worldId = cfg.wordId;
            const mapId = cfg.mapId;
            const sol = cfg.sz_solution || '';
            if (!conf.all_Level[mapId]) {
                results.push({ levelId, mapId, worldId, solution: sol, status: 'missing-layout' });
                continue;
            }
            let rec;
            try {
                setup(mapId, worldId);
                const before = tileStats();
                map.isLoadData = true;
                for (const ch of sol) {
                    const d = dirOf(ch);
                    if (isNaN(d)) { continue; }
                    map.moveSanke(d, function () {});
                }
                map.isLoadData = false;
                const cleared = map.checkClearSatge();
                // how many walkable cells remain unfilled
                let remaining = 0;
                for (const r in map.Level_data) {
                    for (const c in map.Level_data[r]) {
                        const v = map.Level_data[r][c];
                        if (v !== 0 && v !== -1 && v !== -2) { remaining++; }
                    }
                }
                rec = { levelId, mapId, worldId, solution: sol,
                        status: cleared ? 'cleared' : 'not-cleared',
                        remaining, tiles: before };
            } catch (e) {
                rec = { levelId, mapId, worldId, solution: sol, status: 'error', err: String(e && e.message || e) };
            }
            results.push(rec);
        }
        map.isLoadData = false;
        map.clearAll();

        // tile-type census across all levels, from the shipped layouts
        const census = {};
        for (const id in conf.all_Level) {
            for (const row of conf.all_Level[id]) {
                for (const v of row) { census[v] = (census[v] || 0) + 1; }
            }
        }
        return {
            total: results.length,
            results,
            census,
            maps: Object.keys(conf.all_Level).length,
            levelCfgEntries: Object.keys(conf.level_cfg).length,
            worlds: Object.keys(conf.worlds).length,
            themes: Object.keys(conf.theme_cfg).length,
        };
    });

    const cleared = out.results.filter((r) => r.status === 'cleared');
    const notCleared = out.results.filter((r) => r.status === 'not-cleared');
    const errored = out.results.filter((r) => r.status === 'error' || r.status === 'missing-layout');

    console.log(`\nlevels in conf.level_cfg : ${out.levelCfgEntries}`);
    console.log(`layouts in conf.all_Level : ${out.maps}`);
    console.log(`worlds / themes          : ${out.worlds} / ${out.themes}`);
    console.log(`\nsolutions replaying to a clear : ${cleared.length}/${out.total}`);
    console.log(`solutions NOT clearing         : ${notCleared.length}`);
    console.log(`errors / missing layouts       : ${errored.length}`);
    if (errored.length) { errored.slice(0, 10).forEach((e) => console.log('   ERR', JSON.stringify(e))); }
    if (notCleared.length) {
        console.log('\nnot-cleared (levelId, mapId, solution, remaining cells):');
        notCleared.slice(0, 40).forEach((r) => console.log(`   level ${r.levelId} mapId ${r.mapId}  "${r.solution}"  remaining=${r.remaining}`));
        if (notCleared.length > 40) { console.log(`   ... and ${notCleared.length - 40} more`); }
    }
    console.log('\ntile-type census across all layouts (tileType values):');
    console.log('  ' + JSON.stringify(out.census));
    console.log('  (0=wall 1=floor 2=portal 4=key 5..8=arrows -1=head -3=lock -4=brick)');
    console.log('page errors:', errors.length ? errors.slice(0, 5) : 'none');

    fs.writeFileSync(path.join(__dirname, 'alllevels-result.json'), JSON.stringify({ out, errors }, null, 2));

    await browser.close();
    server.kill();
    process.exit(0);
})().catch((e) => { console.error('HARNESS ERROR', e); process.exit(1); });
