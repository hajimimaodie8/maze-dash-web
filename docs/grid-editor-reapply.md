# 网格编辑器（第一阶段）—— 可原样重新应用的清单

> 背景：这份清单是 `web/custom-tab.js` 里**已被 `git checkout` 冲掉**的编辑器代码的完整复原。
> 应用顺序：**先插大块（A），再接线（B）**；每一步后都跑 `node --check`，失败立即中止。
> 所有改动都是「整段插入」或「定位已知行的有界插入」，不含猜字符串的盲改。

---

## A. 一整段插入（插在 `function buildEditorHome(view) {` 这一行**之前**，模块层级）

```js
    /* ==================== 关卡编辑器：20x20 网格（第一阶段） ====================
       第一阶段只做"地板/墙"这一个工具，但闭环是完整的：改格子 -> 保存成新关卡 -> 立刻进关试玩。
       网格规格按约定：格距 64px，20 格正好 1280（设计高度），方块 56px 留出网格线。
       每个可点元素都显式给 zIndex（全屏容器会盖住并吃掉点击，这是踩过的坑）。
       打开时隐藏标签栏：它被刻意保持在所有兄弟节点之上，会吃掉底行格子和"保存"按钮的点击。 */
    var GRID_N = 20, GRID_PITCH = 64, GRID_TILE = 56;
    var GRID_NAME = 'gridEditor';
    var gridRootRef = null;

    /* 地板用主题的"可玩"色；墙用固定深色 —— 实测主题的 list_level_disabled 太浅，
       和地板色接近，"不勾=墙"读不出来。 */
    function gridThemeColour(node, key, fallback) {
        try {
            var worldId = visibleWorldId(window.hallScene) || 1;
            applyThemeColour(node, worldId, key, fallback);
        } catch (e) { node.color = fallback; }
    }

    function paintGridCell(cell) {
        if (!cell || !cell.isValid) { return; }
        var floor = cell.__value === 1;
        if (floor) {
            gridThemeColour(cell, 'list_level_next', cc.color(255, 210, 60, 255));
        } else {
            cell.color = cc.color(46, 40, 52, 255);      // dark: unmistakably a wall
        }
        var tick = cell.getChildByName('tick');
        if (tick && tick.isValid) { tick.active = floor; }
    }

    function closeGridEditor() {
        var closed = false;
        try {
            var host = cc.find('Canvas');
            if (host) {
                Array.prototype.slice.call(host.children).forEach(function (n) {
                    if (n && n.isValid && String(n.name).indexOf(GRID_NAME) === 0) { n.destroy(); closed = true; }
                });
            }
        } catch (e) {}
        if (gridRootRef && gridRootRef.isValid) { gridRootRef.destroy(); closed = true; }
        gridRootRef = null;
        try {
            var hallBar2 = window.hallScene && window.hallScene.tabBar && window.hallScene.tabBar.parent;
            if (hallBar2 && hallBar2.isValid && stats.tabBarHiddenForEditor) { hallBar2.active = true; }
            stats.tabBarHiddenForEditor = 0;
        } catch (e) {}
        stats.gridEditorClosed = (stats.gridEditorClosed || 0) + 1;
        return closed;
    }

    function openGridEditor() {
        var host = cc.find('Canvas');
        if (!host) { return null; }
        closeGridEditor();
        var W = visibleWidth(), H = visibleHeight();

        var root = new cc.Node(GRID_NAME);
        root.parent = host;
        root.setContentSize(W, H);
        root.zIndex = 999;                                   // above the preview overlay (998)
        fullSprite(root, W, H, cc.color(20, 18, 24, 255));   // opaque: nothing may show through

        /* --- the way out, created first and unconditionally, on top of everything --- */
        var close = new cc.Node('gridBack');
        close.parent = root;
        close.setContentSize(300, 130);
        close.x = -W / 2 + 30 + 150;
        close.y = H / 2 - 24 - 65;
        roundedPanel(close, cc.color(30, 26, 34, 235), 300, 130);
        makeLabel(close, '\u2190 ' + t('backToEditor'), 0, 30, cc.color(255, 255, 255, 255)).name = 'gridBackLabel';
        close.zIndex = 60;                                   // the grid below must never swallow this tap
        close.on(cc.Node.EventType.TOUCH_START, function () { pressFeedback(close, true); });
        close.on(cc.Node.EventType.TOUCH_CANCEL, function () { pressFeedback(close, false); });
        close.on(cc.Node.EventType.TOUCH_END, function () {
            pressFeedback(close, false);
            if (root && root.isValid) { root.destroy(); }
            closeGridEditor();
            backToEditor();
        });

        /* --- title, on a pill so it stays readable over the grid cells --- */
        var titleBg = new cc.Node('gridTitleBg');
        titleBg.parent = root;
        titleBg.setContentSize(640, 92);
        titleBg.x = 0;
        titleBg.y = H / 2 - 24 - 65;
        titleBg.zIndex = 40;
        roundedPanel(titleBg, cc.color(30, 26, 34, 235), 640, 92);
        makeLabel(titleBg, t('gridTitle'), 0, 40, cc.color(255, 255, 255, 255)).name = 'gridTitle';

        /* --- the grid: one node per cell, 56x56 inside a 64px pitch --- */
        var grid = [];
        for (var y = 0; y < GRID_N; y++) {
            var row = [];
            for (var x = 0; x < GRID_N; x++) { row.push(0); }
            grid.push(row);
        }
        var cellsRef = [];
        for (var gy = 0; gy < GRID_N; gy++) {
            for (var gx = 0; gx < GRID_N; gx++) {
                var cell = new cc.Node('cell_' + gx + '_' + gy);
                cell.parent = root;
                cell.setContentSize(GRID_TILE, GRID_TILE);
                cell.x = Math.round((gx - (GRID_N - 1) / 2) * GRID_PITCH);
                cell.y = Math.round(((GRID_N - 1) / 2 - gy) * GRID_PITCH);
                cell.zIndex = 10;
                fullSprite(cell, GRID_TILE, GRID_TILE, cc.color(46, 40, 52, 255));
                cell.__value = 0;
                cell.__gx = gx; cell.__gy = gy;
                /* the tick mark: the checkbox look, only visible when the cell is floor */
                var tick = makeLabel(cell, '\u2713', 0, 38, cc.color(40, 32, 20, 255));
                tick.name = 'tick';
                tick.active = false;
                tick.zIndex = 11;
                paintGridCell(cell);
                (function (c) {
                    c.on(cc.Node.EventType.TOUCH_START, function () { pressFeedback(c, true); });
                    c.on(cc.Node.EventType.TOUCH_CANCEL, function () { pressFeedback(c, false); });
                    c.on(cc.Node.EventType.TOUCH_END, function () {
                        pressFeedback(c, false);
                        toggleGridCell(c);
                    });
                })(cell);
                cellsRef.push(cell);
            }
        }

        /* --- controls: save & play (bottom right), readout pill (top right) --- */
        var save = new cc.Node('gridSave');
        save.parent = root;
        save.setContentSize(420, 130);
        save.x = W / 2 - 40 - 210;
        save.y = -H / 2 + 150;
        roundedPanel(save, cc.color(255, 210, 60, 255), 420, 130);
        makeLabel(save, t('saveAndPlay'), 0, 34, cc.color(40, 32, 20, 255)).name = 'gridSaveLabel';
        save.zIndex = 80;
        save.on(cc.Node.EventType.TOUCH_START, function () { pressFeedback(save, true); });
        save.on(cc.Node.EventType.TOUCH_CANCEL, function () { pressFeedback(save, false); });
        save.on(cc.Node.EventType.TOUCH_END, function () {
            pressFeedback(save, false);
            saveGridAndPlay(grid);
        });

        var readoutBg = new cc.Node('gridReadoutBg');
        readoutBg.parent = root;
        readoutBg.setContentSize(460, 84);
        readoutBg.x = W / 2 - 40 - 230;
        readoutBg.y = H / 2 - 24 - 65;
        readoutBg.zIndex = 40;
        roundedPanel(readoutBg, cc.color(30, 26, 34, 235), 460, 84);
        makeLabel(readoutBg, gridReadout(grid), 0, 26, cc.color(255, 255, 255, 220)).name = 'gridReadout';

        /* expose enough for the probe to drive the same code paths the user does */
        MazeDashCustomTab.gridEditor = {
            root: root, grid: grid, cells: cellsRef,
            toggle: function (x, y) { toggleGridCell(cellsRef[y * GRID_N + x]); },
            save: function () { return saveGridAndPlay(grid); },
            close: closeGridEditor,
            value: function (x, y) { return grid[y][x]; },
        };
        gridRootRef = root;
        animateIn(root);

        /* The tab bar is deliberately kept above every sibling, so it would swallow taps on the
           bottom rows and on the Save button. Hide it while the editor is open; that also frees
           the full 1280px height for the 20x20 grid. */
        try {
            var hallBar = window.hallScene && window.hallScene.tabBar && window.hallScene.tabBar.parent;
            if (hallBar && hallBar.isValid) { hallBar.active = false; stats.tabBarHiddenForEditor = 1; }
        } catch (e) {}

        stats.gridEditorOpened = (stats.gridEditorOpened || 0) + 1;
        log('grid editor opened (' + GRID_N + 'x' + GRID_N + ')');
        return root;
    }

    function gridReadout(grid) {
        var n = 0;
        for (var y = 0; y < grid.length; y++) { for (var x = 0; x < grid[y].length; x++) { if (grid[y][x] === 1) { n++; } } }
        return t('floorCount') + ': ' + n + ' / ' + (GRID_N * GRID_N);
    }

    function toggleGridCell(cell) {
        if (!cell || !cell.isValid) { return; }
        cell.__value = cell.__value === 1 ? 0 : 1;
        try {
            var ed = MazeDashCustomTab.gridEditor;
            if (ed && ed.grid && ed.grid[cell.__gy]) { ed.grid[cell.__gy][cell.__gx] = cell.__value; }
        } catch (e) {}
        paintGridCell(cell);
        try {
            var root = cell.parent;
            var ro = root && root.getChildByName('gridReadoutBg');
            var lb = ro && ro.getChildByName('gridReadout') && ro.getChildByName('gridReadout').getComponent(cc.Label);
            if (lb && MazeDashCustomTab.gridEditor) { lb.string = gridReadout(MazeDashCustomTab.gridEditor.grid); }
        } catch (e) {}
        stats.gridToggles = (stats.gridToggles || 0) + 1;
    }

    /* ---- persistence: levels live in localStorage and are re-injected on boot ---- */
    var CUSTOM_LEVELS_KEY = 'maze_dash_custom_levels';
    function customLevels() {
        try { return JSON.parse(localStorage.getItem(CUSTOM_LEVELS_KEY) || '{}') || {}; } catch (e) { return {}; }
    }
    function saveCustomLevel(id, data) {
        try {
            var all = customLevels();
            all[String(id)] = data;
            localStorage.setItem(CUSTOM_LEVELS_KEY, JSON.stringify(all));
        } catch (e) {}
    }
    function nextCustomLevelId() {
        var used = customLevels(), id = 10000;
        while (used[String(id)] || (conf.level_cfg && conf.level_cfg[id]) || (conf.all_Level && conf.all_Level[id])) { id++; }
        return id;
    }
    /* put saved levels back into the conf tables (they are rebuilt from the shipped data on load) */
    function injectSavedLevels() {
        var all = customLevels(), n = 0;
        Object.keys(all).forEach(function (k) {
            var rec = all[k], id = parseInt(k, 10);
            if (!rec || !rec.grid) { return; }
            try {
                conf.all_Level[id] = rec.grid;
                var entry = { id: id, wordId: rec.world || TEST_WORLD, levelId: rec.levelId || 1, mapId: id, sz_solution: '' };
                conf.level_cfg[id] = entry;
                var world = entry.wordId;
                conf.stage_level_cfg[world] = conf.stage_level_cfg[world] || {};
                conf.stage_level_cfg[world][String(id)] = entry;
                n++;
            } catch (e) {}
        });
        stats.levelsInjected = (stats.levelsInjected || 0) + n;
        return n;
    }

    /* ---- save: write the three conf tables, persist, then play it immediately ---- */
    function saveGridAndPlay(grid) {
        var id = nextCustomLevelId();
        var worlds = customWorlds();
        var world = Number(Object.keys(worlds)[0] || 0) || TEST_WORLD;
        try {
            conf.worlds[world] = conf.worlds[world] || { id: world, require: 0 };
            conf.stage_cfg[world] = conf.stage_cfg[world] || {};
            conf.stage_level_cfg[world] = conf.stage_level_cfg[world] || {};
            conf.theme_cfg[world] = conf.theme_cfg[world] || JSON.parse(JSON.stringify(conf.theme_cfg[1] || {}));
            var copy = JSON.parse(JSON.stringify(grid));
            /* A level with no -1 never starts, and phase 1 has no "place hero" tool, so put one
               on the first floor cell. This is the only cell the editor adds by itself. */
            var hasHead = false;
            for (var hy = 0; hy < copy.length; hy++) { for (var hx = 0; hx < copy[hy].length; hx++) { if (copy[hy][hx] === -1) { hasHead = true; } } }
            if (!hasHead) {
                for (var sy = 0; sy < copy.length && !hasHead; sy++) {
                    for (var sx = 0; sx < copy[sy].length; sx++) {
                        if (copy[sy][sx] === 1) { copy[sy][sx] = -1; hasHead = true; stats.editorAutoHead = sx + ',' + sy; break; }
                    }
                }
            }
            conf.all_Level[id] = copy;
            var display = Object.keys(conf.stage_level_cfg[world]).length + 1;
            var entry = { id: id, wordId: world, levelId: display, mapId: id, sz_solution: '' };
            conf.level_cfg[id] = entry;
            conf.stage_level_cfg[world][String(id)] = entry;
            saveCustomLevel(id, { grid: copy, world: world, levelId: display, name: t('createLevel') + ' ' + display });
            try { if (window.MazeDashCustomTab && MazeDashCustomTab.refreshStagePages) { MazeDashCustomTab.refreshStagePages(); } } catch (e) {}
            stats.editorSavedLevel = id;
            stats.editorSavedWorld = world;
            log('saved level', id, 'into world', world);
        } catch (e) {
            warn('save level failed:', e && e.message);
            return null;
        }
        closeGridEditor();
        try { gamemain.enterEnterGameScene(id); } catch (e) { warn('enter failed:', e && e.message); }
        return id;
    }

    /* Editor-only UI strings, appended to the shared table rather than editing its big literal.
       Unknown languages fall back to English through t(). */
    (function addEditorStrings() {
        var add = {
            'zh-Hans': { gridTitle: '\u5173\u5361\u7f16\u8f91\u5668 \u00b7 20\u00d720', saveAndPlay: '\u4fdd\u5b58\u5e76\u8bd5\u73a9', floorCount: '\u5730\u677f' },
            'zh-Hant': { gridTitle: '\u95dc\u5361\u7de8\u8f2f\u5668 \u00b7 20\u00d720', saveAndPlay: '\u4fdd\u5b58\u4e26\u8a66\u73a9', floorCount: '\u5730\u677f' },
            'en':      { gridTitle: 'Level editor \u00b7 20\u00d720', saveAndPlay: 'Save & Play', floorCount: 'Floor' },
            'ja':      { gridTitle: '\u30b9\u30c6\u30fc\u30b8\u7de8\u96c6 \u00b7 20\u00d720', saveAndPlay: '\u4fdd\u5b58\u3057\u3066\u30d7\u30ec\u30a4', floorCount: '\u5e8a' },
        };
        Object.keys(add).forEach(function (lang) {
            if (!TEXT[lang]) { TEXT[lang] = {}; }
            Object.keys(add[lang]).forEach(function (k) { TEXT[lang][k] = add[lang][k]; });
        });
    })();
```

## B. 七处接线（每处都是有界插入，插完立刻 `node --check`）

| # | 位置（定位用的已知行） | 插入内容 |
| --- | --- | --- |
| B1 | `editorAction` 里 `if (id === 'exportJson') { exportCustomJson(); return; }` 之后 | `if (id === 'createLevel') { openGridEditor(); return; }` |
| B2 | `seedTestLevel();` 那一行之后 | `injectSavedLevels();` |
| B3 | `window.MazeDashCustomTab = {` 之后 | `editorAction: function (id) { return editorAction(id); },` 与 `openGridEditor: function () { return openGridEditor(); },` |
| B4 | `function raiseActiveView() {` 之后 | `if (stats.tabBarHiddenForEditor) { return; }`（否则每帧的 raiseActiveView 会把标签栏重新激活，底部格子和保存按钮又被吃掉） |
| B5 | `openGridEditor` 内 `stats.gridEditorOpened = ...` 之前 | 隐藏标签栏（见 A 段 openGridEditor 末尾那段） |
| B6 | `closeGridEditor` 内 `stats.gridEditorClosed = ...` 之前 | 恢复标签栏（见 A 段 closeGridEditor 里的 hallBar2 那段） |
| B7 | `saveGridAndPlay` 内 `var copy = JSON.parse(JSON.stringify(grid));` 之后 | 自动放置主角那段（见 A 段 saveGridAndPlay） |

> B5/B6/B7 的代码已经**包含在 A 段对应函数里**；重新应用 A 段后，只剩 B1–B4 是额外要做的。

## C. 应用后的自检

1. `node --check web/custom-tab.js` —— 失败立即中止，**不要构建、不要提交**。
2. `node tools/build-standalone.js`
3. `node tools/verify/probe-grid-editor.js`（从 `_work/test` 目录跑，它自己会去那里找 puppeteer-core）
4. **亲眼看** `docs/screenshots/48-grid-editor-drawn.png`

## D. 已经实测通过的数字（上一轮，打包版 `file://`）

- 编辑器打开：**400 个格子**、格子 **56×56**、返回按钮 **zIndex 60**、保存按钮 zIndex 60
- 切换格子：**10 格**（其中 **4 格用真实点击**、6 格走同一个 `toggle()`），实时回读 **0 处不一致**，`gridToggles = 10`
- 保存并试玩：新关卡 id **10000**、世界 **101**、自动主角落在 **3,3**
- 进关结果：场景 **gameScene**、**`game_map` 节点存在 = true**、矩阵 **20×20**
- 矩阵回读：与所画相比**唯一差异是 `3,3 = -1`**（自动主角），`floorsInData = 9`、`headsInData = 1`
- 持久化：`localStorage['maze_dash_custom_levels']` = **1 条**
- 报错：**0**

## E. 从截图里发现、并已写进本清单的修正

- 标题原来直接压在格子上、可读性差 → 现在标题/读数都放在**深色药丸底**上
- 墙用的主题 `list_level_disabled` 太浅、和地板色接近 → 现在墙是**固定深色** `cc.color(46,40,52,255)`
- 保存按钮原来会被**仓库徽标**与标签栏压住 → 上移到 `-H/2 + 150`，并把标签栏在编辑期间隐藏
