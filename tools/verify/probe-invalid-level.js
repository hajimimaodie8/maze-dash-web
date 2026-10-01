/* Does the invalid-level guard REALLY refuse a finger tap, and still let a valid level in?
 *
 * web/custom-tab.js wraps gamemain.enterEnterGameScene: when conf.all_Level[id] is missing,
 * is an empty matrix, or holds no -1 (the hero), it puts an `invalidLevelHint` node on the
 * Canvas and returns without entering the level. This probe drives that guard the way a user
 * does -- a REAL touch gesture (press -> move 2-6 px -> release) dispatched with
 * Input.dispatchTouchEvent from a hasTouch viewport -- because a direct node.dispatchEvent()
 * bypasses the engine's hit test, which is a trap this project has already fallen into
 * (tools/verify/probe-p2-p3.js is that kind of probe and is NOT acceptable as evidence here).
 *
 * The level under test is built in a CUSTOM world (100) only: conf.stage_level_cfg[100] gets
 * one entry per shape, and each entry is registered under BOTH keys the table uses --
 * String(id) and String(levelId) -- or a naive for-in would list every level twice.
 * World 1 is never written. The levels are reached through the game's OWN level-select page
 * (createStageLayer + insertPage), so the gesture travels the engine's own path:
 * LevelButton -> StageSelectLayer.clickEnterGame -> enterEnterGameScene.
 *
 * Run: NODE_PATH=E:\maze_dash\_work\test\node_modules node tools\verify\probe-invalid-level.js
 */
'use strict';
const puppeteer = require('puppeteer-core');

const CHROME = 'C:\\Users\\Lenovo\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe';
const FILE = 'file:///E:/maze_dash/dist/MazeDash-standalone.html';
const SHOT_DIR = 'E:\\maze_dash\\docs\\screenshots\\';
const PROFILE = 'E:\\maze_dash\\_work\\test\\chrome-profile-invalid-level';
const ARGS = ['--no-sandbox', '--disable-extensions', '--no-first-run', '--mute-audio',
    '--allow-file-access-from-files', '--enable-unsafe-swiftshader', '--use-gl=angle',
    '--use-angle=swiftshader', '--touch-events=enabled'];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* The custom world this probe writes. 1..8 are shipped worlds and 101 is the project's own
   test world -- none of them is touched. */
const WORLD = 100;
const LEVELS = [
    { kind: 'empty matrix (no rows)', id: 10001, map: 10001, levelId: 1, grid: [] },
    { kind: 'no -1 hero', id: 10002, map: 10002, levelId: 2, grid: [[1, 1, 1], [1, 1, 1]] },
    { kind: 'valid (has -1)', id: 10003, map: 10003, levelId: 3, grid: [[-1, 1, 1], [0, 0, 1], [1, 1, 1]] }
];
const GOOD = LEVELS[2];

async function cdp(page) {
    if (typeof page.createCDPSession === 'function') { return page.createCDPSession(); }
    return page.target().createCDPSession();
}

/* A real finger: down, a 2-6 px wobble, up. */
async function realTouch(client, x, y, dx, dy) {
    const pt = (px, py) => [{ x: Math.round(px), y: Math.round(py), radiusX: 12, radiusY: 12, force: 1, id: 1 }];
    await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: pt(x, y) });
    await sleep(50);
    await client.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: pt(x + dx, y + dy) });
    await sleep(50);
    await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
}

async function scene(page) {
    return page.evaluate(() => (cc.director.getScene() ? cc.director.getScene().name : null));
}

async function bootToHall(page, client) {
    await page.goto(FILE, { waitUntil: 'domcontentloaded', timeout: 180000 });
    await page.waitForFunction('window.cc && cc.game && cc.game._prepared === true', { timeout: 180000, polling: 150 });
    for (let i = 0; i < 60; i++) {
        if ((await scene(page)) === 'HallScene') { break; }
        /* the splash screens want a tap; use the same real gesture, mouse only as a fallback */
        if (i < 14) { await realTouch(client, 720, 405, 3, 2); } else { await page.mouse.click(720, 405); }
        await sleep(900);
    }
    await sleep(3200);   /* let custom-tab install / seed / the hall settle */
    return scene(page);
}

/* Build world 100 from nothing, open the game's own page for it, and wire the click recorder. */
async function armWorld(page) {
    return page.evaluate((cfg) => {
        const WORLD = cfg.world, defs = cfg.levels;

        /* ---- (1) the data: custom world 100 ONLY ---- */
        conf.worlds[WORLD] = { id: WORLD, require: 0 };
        conf.stage_cfg[WORLD] = {};
        conf.theme_cfg[WORLD] = JSON.parse(JSON.stringify(conf.theme_cfg[1]));
        conf.stage_level_cfg[WORLD] = {};
        const entries = defs.map(function (d) {
            conf.all_Level[d.map] = JSON.parse(JSON.stringify(d.grid));
            const e = { id: d.id, wordId: WORLD, levelId: d.levelId, mapId: d.map, sz_solution: '' };
            conf.level_cfg[d.id] = e;
            /* BOTH keys, like the editor and the test-world seeder write */
            conf.stage_level_cfg[WORLD][String(d.id)] = e;
            conf.stage_level_cfg[WORLD][String(d.levelId)] = e;
            return { kind: d.kind, id: d.id, map: d.map, levelId: d.levelId,
                     keys: [String(d.id), String(d.levelId)],
                     gridShape: d.grid.length + 'x' + ((d.grid[0] || []).length) };
        });

        /* Every button on our page must be enterable. Progress is granted in memory only:
           no applyMode(), no localStorage write, nothing outside this page. */
        const patches = {};
        try {
            gamemain.getPassMaxLevelId = function (w) {
                let mx = 0; const c = conf.stage_level_cfg[w] || {};
                for (const k in c) { if (c[k].levelId > mx) { mx = c[k].levelId; } }
                return mx;
            };
            patches.passMax = 'in-memory override (this world reads as fully unlocked)';
        } catch (e) { patches.passMax = 'FAILED: ' + e.message; }
        try { patches.ticketIsEnough = !!gamemain.ticketIsEnough(); } catch (e) { patches.ticketIsEnough = 'err'; }

        /* ---- (2) the game's own level-select page for world 100 (proven recipe) ---- */
        const hall = window.hallScene;
        const sv = cc.find('Canvas/gameView/scrollView');
        const scv = sv && sv.getComponent(cc.ScrollView);
        const content = scv && scv.content;
        const before = { pages: content.children.length, contentW: Math.round(content.width) };
        const idx = content.children.length;
        const pageNode = hall.createStageLayer(WORLD, idx);
        hall.StageSelectLayer.insertPage(pageNode, idx);
        content.__spreadW = null;      /* widenSelectPage() early-returns when the width is unchanged */
        let widened = 0, refreshed = 0;
        try { widened = window.MazeDashWide.widenSelectPage(); } catch (e) {}
        try { refreshed = window.MazeDashCustomTab.refreshStagePages(); } catch (e) {}

        /* ---- (3) record the engine's own click handler ----
           The level-select view is already the active one at boot (gameView at y=0), so no tab
           switch is needed -- and setting gamemain.showTabBarViewIndex to a wrong index parks
           gameView off-screen (measured: y=1280, inactive), which is how this probe first failed. */
        const comp = pageNode.getComponent('StageSelectLayer');
        window.__probeClick = [];
        const origClick = comp.clickEnterGame;
        comp.clickEnterGame = function (ev, id) {
            window.__probeClick.push({ id: id, t: Date.now() });
            return origClick.apply(this, arguments);
        };
        window.__probePageIdx = idx;
        window.__probePage = pageNode;

        return { entries, before, after: { pages: content.children.length, contentW: Math.round(content.width) },
                 idx, stageId: comp.m_stageId, widenSelectPage: widened, refreshStagePages: refreshed, patches };
    }, { world: WORLD, levels: LEVELS });
}

/* Centre our page in the visible area by moving the pager's content, then re-measure.
   (Measured, not derived: the page sits inside a nested ScrollView whose anchor offsets are
   not worth re-deriving by hand.) */
async function centerPage(page) {
    return page.evaluate(() => {
        const p = window.__probePage;
        const scv = cc.find('Canvas/gameView/scrollView').getComponent(cc.ScrollView);
        const content = scv.content;
        const vs = cc.view.getVisibleSize();
        const r = cc.game.canvas.getBoundingClientRect();
        const screenOf = (n) => {
            const w = n.convertToWorldSpaceAR(cc.v2(0, 0));
            return [r.left + w.x * (r.width / vs.width), r.top + (vs.height - w.y) * (r.height / vs.height)];
        };
        let steps = 0, dx = 0, dy = 0;
        for (; steps < 4; steps++) {
            const w = p.convertToWorldSpaceAR(cc.v2(0, 0));
            dx = vs.width / 2 - w.x;
            dy = vs.height / 2 - w.y;
            if (Math.abs(dx) * (r.width / vs.width) < 3 && Math.abs(dy) * (r.height / vs.height) < 3) { break; }
            content.x += dx;
            content.y += dy;
        }
        return { steps, residualWorld: [Math.round(dx), Math.round(dy)],
                 contentX: Math.round(content.x), contentY: Math.round(content.y),
                 pageScreen: screenOf(p).map(Math.round), viewCenter: [Math.round(r.left + r.width / 2), Math.round(r.top + r.height / 2)] };
    });
}

/* Report where the buttons of OUR page actually are on screen.
   The audit is read-only: bounding boxes + the engine's own Node._hitTest -- no events. */
async function pickButton(page, targetId) {
    return page.evaluate((tid) => {
        const scv = cc.find('Canvas/gameView/scrollView').getComponent(cc.ScrollView);
        const content = scv.content;
        const idx = window.__probePageIdx;

        /* only the buttons on OUR world page: the prefab ships its own clickEvents[0]
           (handler 'play'), and updateUnlockLayer() pushes the real enter/refuse handler
           after it, so the entry to judge is the one named *EnterGame. */
        const buttons = [];
        (function w(n) {
            let comp = null;
            try { comp = n.getComponent && n.getComponent('LevelButton'); } catch (e) {}
            if (comp) {
                const lblNode = n.getChildByName('Level');
                const lab = lblNode && lblNode.getComponent(cc.Label);
                const evs = (comp.clickEvents || []).map(function (e) {
                    return { handler: String(e.handler), data: e.customEventData, comp: String(e.component) };
                });
                const hit = (comp.clickEvents || []).filter(function (e) { return /EnterGame$/.test(String(e.handler)); })[0] || null;
                buttons.push({ node: n, label: lab ? String(lab.string) : null, events: evs,
                               handler: hit ? String(hit.handler) : null,
                               target: hit ? hit.customEventData : null });
            }
            (n.children || []).forEach(w);
        })(window.__probePage);

        const r = cc.game.canvas.getBoundingClientRect();
        const vs = cc.view.getVisibleSize();
        const viewBox = (function () { try { return scv.node.getBoundingBoxToWorld(); } catch (e) { return null; } })();
        const toWorld = (px, py) => ({ x: (px - r.left) * vs.width / r.width, y: (1 - (py - r.top) / r.height) * vs.height });

        /* which nodes with a touch listener cover this world point? (topmost consumers) */
        const consumersAt = function (p) {
            const hits = [];
            (function w(n) {
                if (!n.activeInHierarchy) { return; }
                let hasTouch = false;
                try {
                    hasTouch = n.hasEventListener(cc.Node.EventType.TOUCH_START) || n.hasEventListener(cc.Node.EventType.TOUCH_END);
                } catch (e) {}
                const b = n.getBoundingBoxToWorld ? n.getBoundingBoxToWorld() : null;
                if (hasTouch && b && p.x >= b.x && p.x <= b.x + b.width && p.y >= b.y && p.y <= b.y + b.height) {
                    let d = 0, q = n; while (q) { d++; q = q.parent; }
                    hits.push({ name: n.name, z: n.zIndex, depth: d, size: [Math.round(n.width), Math.round(n.height)] });
                }
                (n.children || []).forEach(w);
            })(cc.director.getScene());
            return hits.slice(0, 10);
        };

        const cands = buttons.filter(function (b) { return String(b.target) === String(tid); }).map(function (b) {
            const wp = b.node.convertToWorldSpaceAR(cc.v2(0, 0));
            const sx = r.left + wp.x * (r.width / vs.width);
            const sy = r.top + (vs.height - wp.y) * (r.height / vs.height);
            let engineHit = null;
            try { engineHit = !!b.node._hitTest(cc.v2(wp.x, wp.y), b.node._touchListener); } catch (e) { engineHit = 'err:' + e.message; }
            const loc = toWorld(sx, sy);
            const inView = !viewBox || (loc.x >= viewBox.x && loc.x <= viewBox.x + viewBox.width &&
                                        loc.y >= viewBox.y && loc.y <= viewBox.y + viewBox.height);
            const onCanvas = sx >= r.left && sx <= r.left + r.width && sy >= r.top && sy <= r.top + r.height;
            return { label: b.label, handler: b.handler, target: b.target, active: !!b.node.activeInHierarchy,
                     world: [Math.round(wp.x), Math.round(wp.y)], screen: [Math.round(sx), Math.round(sy)],
                     engineHitTest: engineHit, insideScrollView: inView, insideCanvas: onCanvas,
                     size: [Math.round(b.node.width), Math.round(b.node.height)],
                     worldPt: { x: wp.x, y: wp.y } };
        });

        const rank = (c) => (c.engineHitTest === true ? 4 : 0) + (c.insideScrollView ? 2 : 0) + (c.active ? 1 : 0) + (c.insideCanvas ? 1 : 0);
        let pick = null;
        cands.forEach(function (c) { if (!pick || rank(c) > rank(pick)) { pick = c; } });

        const pageNode = window.__probePage;
        const pageWp = pageNode.convertToWorldSpaceAR(cc.v2(0, 0));
        return { idx, pageCount: content.children.length, contentX: Math.round(content.x),
                 contentW: Math.round(content.width), visibleW: Math.round(vs.width),
                 canvasRect: [Math.round(r.width), Math.round(r.height)],
                 pageActive: !!pageNode.activeInHierarchy, pageVisible: pageNode.activeInHierarchy && pageNode.opacity > 0,
                 pageScreenX: Math.round(r.left + pageWp.x * (r.width / vs.width)),
                 allButtons: buttons.map(function (b) { return { label: b.label, handler: b.handler, target: b.target, events: b.events }; }),
                 candidates: cands.map(function (c) { const o = Object.assign({}, c); delete o.worldPt; return o; }),
                 pick: pick ? { label: pick.label, handler: pick.handler, target: pick.target, screen: pick.screen, engineHitTest: pick.engineHitTest, insideScrollView: pick.insideScrollView, insideCanvas: pick.insideCanvas, active: pick.active, size: pick.size } : null,
                 consumers: pick ? consumersAt(pick.worldPt) : [] };
    }, targetId);
}

async function readState(page) {
    return page.evaluate(() => {
        const s = (window.MazeDashCustomTab && window.MazeDashCustomTab.stats) || {};
        const m = cc.find('Canvas/backgroup/game_map');
        const cp = m && m.getComponent && m.getComponent('game_map');
        const hints = [];
        (function w(n) { if (String(n.name).indexOf('invalidLevelHint') >= 0) { hints.push(n.name); } (n.children || []).forEach(w); })(cc.director.getScene());
        let mapSize = null, heroCells = null;
        try {
            if (cp && cp.Level_data) {
                mapSize = [cp.MapSize.width, cp.MapSize.height];
                heroCells = 0;
                cp.Level_data.forEach(function (row) { row.forEach(function (v) { if (v === -1) { heroCells++; } }); });
            }
        } catch (e) {}
        return {
            scene: cc.director.getScene() ? cc.director.getScene().name : null,
            mapHasLevelData: !!(cp && cp.Level_data), mapSize: mapSize, heroCells: heroCells,
            invalidLevelHintNodes: hints,
            invalidLevelBlocked: s.invalidLevelBlocked || 0,
            invalidLevelHintShown: s.invalidLevelHintShown || 0,
            levelEntryHook: s.levelEntryHook || 0,
            clicks: (window.__probeClick || []).slice(0, 6)
        };
    });
}

(async () => {
    const browser = await puppeteer.launch({
        executablePath: CHROME, headless: 'new', userDataDir: PROFILE,
        protocolTimeout: 300000, args: ARGS,
        defaultViewport: { width: 1440, height: 810, hasTouch: true }
    });
    const page = await browser.newPage();
    const pageErrors = [];
    page.on('pageerror', (e) => pageErrors.push(String(e.message).slice(0, 160)));
    const client = await cdp(page);

    console.log('PROBE=tools/verify/probe-invalid-level.js');
    console.log('GESTURE=Input.dispatchTouchEvent touchStart -> touchMove(+3,+2) -> touchEnd | viewport 1440x810 hasTouch=true');

    const boot = await bootToHall(page, client);
    console.log('BOOT=' + JSON.stringify({ scene: boot, bootPageErrors: pageErrors.length }));

    const arm = await armWorld(page);
    console.log('ARM=' + JSON.stringify(arm));

    /* the widening path realigns the pager from a 500 ms timer -- let it land first */
    await sleep(1400);
    console.log('CENTER=' + JSON.stringify(await centerPage(page)));

    const results = { invalid: [], valid: null };

    /* ---------------- the invalid entries: real touch, expect a refusal ---------------- */
    for (let i = 0; i < 2; i++) {
        const lv = LEVELS[i];
        /* the pager snaps back to its own current page when a gesture ends, so re-centre our
           page before every touch instead of assuming it stayed where the last one left it */
        const center = await centerPage(page);
        const before = await readState(page);
        const pick = await pickButton(page, lv.id);
        console.log('CENTER-' + i + '=' + JSON.stringify(center));
        console.log('PICK-' + lv.kind + '=' + JSON.stringify(pick));
        if (!pick.pick || !pick.pick.insideCanvas) { results.invalid.push({ kind: lv.kind, error: 'no level button on screen: ' + JSON.stringify(pick.pick) }); continue; }

        const [sx, sy] = pick.pick.screen;
        const errsBefore = pageErrors.length;
        await realTouch(client, sx, sy, 3, 2);
        await sleep(250);
        const errsAfter = pageErrors.length;
        if (i === 0) {
            /* the pager snapped back to its own page when the gesture ended, and the hint lives
               1.8 s + 0.4 s -- put OUR page back under the camera before the shot, or the file
               reads as if a shipped world-1 level had produced the hint */
            await centerPage(page);
            await page.screenshot({ path: SHOT_DIR + '117-invalid-level-hint.png' });
        }
        await sleep(200);
        const onScreen = await readState(page);

        results.invalid.push({
            kind: lv.kind, id: lv.id, map: lv.map, keys: arm.entries[i].keys, allLevel: JSON.stringify(lv.grid),
            touchedAt: [sx, sy], engineHitTestOnTouchedNode: pick.pick.engineHitTest,
            insideScrollView: pick.pick.insideScrollView, insideCanvas: pick.pick.insideCanvas,
            a_sceneBefore: before.scene, a_sceneAfter: onScreen.scene,
            a_enteredLevel: onScreen.mapHasLevelData,
            b_hintNodes: onScreen.invalidLevelHintNodes,
            c_pageErrors: errsAfter - errsBefore, c_pageErrorsTotal: errsAfter,
            d_invalidLevelBlocked: [before.invalidLevelBlocked, onScreen.invalidLevelBlocked],
            d_delta: onScreen.invalidLevelBlocked - before.invalidLevelBlocked,
            e_invalidLevelHintShown: [before.invalidLevelHintShown, onScreen.invalidLevelHintShown],
            f_engineClickEnterGame: onScreen.clicks
        });
    }
    results.invalid.forEach((r, i) => console.log('ASSERT-INVALID-' + (i + 1) + '=' + JSON.stringify(r)));

    /* ---------------- the valid level: fresh page load, real touch, must enter ---------------- */
    const page2 = await browser.newPage();
    const errs2 = [];
    page2.on('pageerror', (e) => errs2.push(String(e.message).slice(0, 160)));
    const client2 = await cdp(page2);
    const boot2 = await bootToHall(page2, client2);
    console.log('BOOT-VALID=' + JSON.stringify({ scene: boot2, bootPageErrors: errs2.length }));
    const arm2 = await armWorld(page2);
    await sleep(1400);
    console.log('CENTER-VALID=' + JSON.stringify(await centerPage(page2)));
    const before2 = await readState(page2);
    const pick2 = await pickButton(page2, GOOD.id);
    console.log('PICK-valid=' + JSON.stringify(pick2));
    let valid = { kind: GOOD.kind, id: GOOD.id, map: GOOD.map, arm: arm2.entries[2] };
    if (pick2.pick && pick2.pick.insideCanvas) {
        const [sx2, sy2] = pick2.pick.screen;
        const e0 = errs2.length;
        await realTouch(client2, sx2, sy2, 3, 2);
        let entered = false, waited = 0;
        for (let i = 0; i < 40; i++) {
            await sleep(250); waited += 250;
            if ((await scene(page2)) === 'gameScene') { entered = true; break; }
        }
        await sleep(1500);
        const after2 = await readState(page2);
        await page2.screenshot({ path: SHOT_DIR + '118-valid-level-entered.png' });
        valid = Object.assign(valid, {
            touchedAt: [sx2, sy2], engineHitTestOnTouchedNode: pick2.pick.engineHitTest,
            insideScrollView: pick2.pick.insideScrollView, insideCanvas: pick2.pick.insideCanvas,
            sceneBefore: before2.scene, sceneAfter: after2.scene, enteredScene: entered, waitedMs: waited,
            mapHasLevelData: after2.mapHasLevelData, mapSize: after2.mapSize, heroCells: after2.heroCells,
            invalidLevelBlocked: [before2.invalidLevelBlocked, after2.invalidLevelBlocked],
            invalidLevelBlockedDelta: after2.invalidLevelBlocked - before2.invalidLevelBlocked,
            engineClickEnterGame: after2.clicks,
            pageErrors: errs2.length - e0, pageErrorsTotal: errs2.length,
            hintNodesInLevel: after2.invalidLevelHintNodes
        });
    } else {
        valid.error = 'no level button on screen';
    }
    results.valid = valid;
    console.log('ASSERT-VALID=' + JSON.stringify(valid));

    /* ---------------- verdict ---------------- */
    const bad = results.invalid.filter((r) => !(r.a_enteredLevel === false && (r.b_hintNodes || []).length > 0 &&
        r.c_pageErrors === 0 && r.d_delta >= 1 && (r.f_engineClickEnterGame || []).length > 0 && !r.error));
    const ok = bad.length === 0 && results.invalid.length === 2 &&
        results.valid.enteredScene === true && results.valid.mapHasLevelData === true &&
        results.valid.invalidLevelBlockedDelta === 0 && results.valid.pageErrors === 0;
    const summary = {
        invalidTouches: results.invalid.length,
        a_notEntered: results.invalid.map((r) => r.a_enteredLevel === false),
        b_hintNodes: results.invalid.map((r) => (r.b_hintNodes || ['<' + (r.error || 'none') + '>']).join('+')),
        c_pageErrors: results.invalid.map((r) => r.c_pageErrors === undefined ? null : r.c_pageErrors),
        d_invalidLevelBlocked: results.invalid.map((r) => r.d_delta === undefined ? null : r.d_delta),
        engineClickPath: results.invalid.map((r) => {
            const a = r.f_engineClickEnterGame || [];
            return a.length ? a[a.length - 1].id : null;
        }),
        validScene: results.valid.sceneAfter,
        validMapSize: results.valid.mapSize,
        validHeroCells: results.valid.heroCells,
        validBlockedDelta: results.valid.invalidLevelBlockedDelta,
        totals: { pageErrorsPage1: pageErrors.length, pageErrorsPage2: errs2.length },
        verdict: ok ? 'GREEN' : 'RED'
    };
    console.log('SUMMARY=' + JSON.stringify(summary));
    console.log('PAGE-ERRORS-P1=' + JSON.stringify(pageErrors.slice(0, 4)));
    console.log('PAGE-ERRORS-P2=' + JSON.stringify(errs2.slice(0, 4)));
    console.log('SHOTS=' + JSON.stringify([SHOT_DIR + '117-invalid-level-hint.png', SHOT_DIR + '118-valid-level-entered.png']));

    await browser.close();
    process.exit(ok ? 0 : 2);
})().catch((e) => { console.error('HARNESS ERROR: ' + (e && e.stack ? e.stack : e)); process.exit(1); });
