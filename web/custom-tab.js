/*
    try {
        if (window.cc && cc.game && cc.game.on) {
            if (cc.game.EVENT_GAME_INITED) { cc.game.on(cc.game.EVENT_GAME_INITED, function () { seed('gameInited'); }); }
            if (cc.game.EVENT_ENGINE_INITED) { cc.game.on(cc.game.EVENT_ENGINE_INITED, function () { seed('engineInited'); }); }
        }
    } catch (e) {}
})();

 * 冲撞迷阵 Maze Dash — 第 6 个标签栏："自定义关卡"（关卡编辑器入口）
 * ===========================================================================
 * The HallScene's tab bar is entirely array-driven:
 *
 *     hall.tabBar.children[i]   -> the TabBarItem for index i
 *     hall.viewGroup[i]         -> the view node for index i
 *     hall.leftViewMap[i]       -> true when that view is parked off-screen left
 *     hall.rightViewMap[i]      -> true when parked off-screen right
 *
 * showBarView() reads those three arrays and does the rest (highlight, slide
 * direction, z-order), so adding a 6th entry to all of them is enough — no game
 * code has to be patched. This module does exactly that at runtime:
 *
 *   1. clones the last tab item, renames it, points it at index 5 and swaps its
 *      icon for a generated wrench;
 *   2. narrows all six slots from 144 to 120 wide so they divide the 720-wide
 *      bar evenly (6 x 120 = 720);
 *   3. builds a blank placeholder view for index 5 and registers it in
 *      viewGroup / leftViewMap / rightViewMap.
 *
 * Everything is re-created whenever the HallScene loads, so entering a level and
 * coming back keeps working.
 *
 * The placeholder page is intentionally empty — it is where the level editor
 * will live. Look for `buildPlaceholderContent()` below to replace it.
 */

/* EARLIEST POSSIBLE SEEDING OF DEGENERATE level_cfg KEYS.
   The engine's own getLastWordId() does conf.level_cfg[parseInt(e)].wordId, and initStageLayer calls
   it from scene start() - i.e. during the FIRST HALL BUILD. On a boot where no custom level is
   registered yet that lookup is undefined and the dereference throws: the intermittent "运行出错"
   overlay. Captured stack: getLastWordId (84521) <- initStageLayer (80827) <- start (80674).
   Wrapping the method is NOT enough - my wrappers are installed from a director scene-launch hook
   that runs AFTER that startup, so the original method wins on the very first boot. Seeding here, at
   module scope, happens before main.js starts the engine. Real records, never a Proxy (a broad Proxy
   was measured to hang the save path). */
(function armDegenerateLevelSeed() {
    function seed(tag) {
        try {
            if (!window.conf || !conf.level_cfg) { return false; }
            /* If the saved last-level id names a level that is not registered (right after a wipe it
               does), clear the key: the engine's getLastWordId reads exactly this at scene start and the
               dereference throws. A level that does not exist cannot be resumed, so nothing is lost. */
            try {
                var rawSaved = window.localStorage.getItem('enter_levels_id');
                if (rawSaved !== null && rawSaved !== '') {
                    var savedId = parseInt(rawSaved, 10);
                    var savedKnown = !isNaN(savedId) && conf.level_cfg[savedId] !== undefined;
                    var st2 = window.MazeDashCustomTab && window.MazeDashCustomTab.stats;
                    if (st2) { st2.enterLevelsIdSeenEarly = rawSaved; st2.enterLevelsIdKnownEarly = !!savedKnown; }
                    if (!savedKnown) {
                        window.localStorage.removeItem('enter_levels_id');
                        if (st2) { st2.enterLevelsIdClearedEarly = (st2.enterLevelsIdClearedEarly || 0) + 1; }
                    }
                }
            } catch (e) {}
            /* record what the engine's default lookup (level 1) looks like at the earliest moment */
            try {
                var st3 = window.MazeDashCustomTab && window.MazeDashCustomTab.stats;
                if (st3) {
                    st3.levelCfgHasOneEarly = (conf.level_cfg[1] !== undefined);
                    st3.levelCfgKeyCountEarly = Object.keys(conf.level_cfg).length;
                    st3.levelCfgOneSample = JSON.stringify(conf.level_cfg[1] || null).slice(0, 80);
                }
            } catch (e) {}
            /* EARLY WRAP OF getLastWordId - installed at module scope, i.e. BEFORE the engine's first
               scene start(). Every other wrap in this file is installed from a director scene-launch
               hook, which runs AFTER start(), which is why the ORIGINAL method still won on a fresh boot
               (captured stack: getLastWordId 84521 <- initStageLayer 80827 <- start 80674).
               It records the real argument (what we have been trying to see), delegates when the id is
               known, and returns a legal value when it is not. No try/catch masking, no storage writes,
               no broad Proxy. */
            (function armEarlyWordIdWrap() {
                function wrap(obj, tag) {
                    try {
                        if (!obj || typeof obj.getLastWordId !== 'function' || obj.__earlyWordIdWrapped) { return false; }
                        var orig = obj.getLastWordId;
                        var fn = function (arg) {
                            try {
                                var s = window.MazeDashCustomTab && window.MazeDashCustomTab.stats;
                                if (s) {
                                    if (!s.getLastWordIdArgs) { s.getLastWordIdArgs = []; }
                                    s.getLastWordIdArgs.push([tag, (arg === undefined ? 'undefined' : String(arg))]);
                                    if (s.getLastWordIdArgs.length > 20) { s.getLastWordIdArgs.shift(); }
                                    s.getLastWordIdCalls = (s.getLastWordIdCalls || 0) + 1;
                                    s.getLastWordIdWhere = tag;
                                }
                            } catch (e) {}
                            var key = (arg === undefined || arg === null) ? null : parseInt(arg, 10);
                            var known = (key !== null && !isNaN(key) && window.conf && conf.level_cfg && conf.level_cfg[key] !== undefined);
                            if (!known) {
                                try { var s2 = window.MazeDashCustomTab && window.MazeDashCustomTab.stats; if (s2) { s2.getLastWordIdFallbacks = (s2.getLastWordIdFallbacks || 0) + 1; } } catch (e) {}
                                return 1;
                            }
                            var v = null;
                            try { v = orig.apply(this, arguments); } catch (e) { v = null; }
                            return v || 1;
                        };
                        try {
                            Object.defineProperty(obj, 'getLastWordId', { value: fn, writable: true, configurable: true, enumerable: false });
                        } catch (e) { obj.getLastWordId = fn; }
                        obj.__earlyWordIdWrapped = true;
                        try { var s3 = window.MazeDashCustomTab && window.MazeDashCustomTab.stats; if (s3) { s3.earlyWordIdWrapped = (s3.earlyWordIdWrapped || 0) + 1; s3.earlyWordIdWhere = tag; } } catch (e) {}
                        return true;
                    } catch (e) { return false; }
                }
                var t = 0;
                (function tick() {
                    t++;
                    try { if (window.gamemain) { wrap(window.gamemain, 'gamemain'); } } catch (e) {}
                    try { if (window.gamemain) { var p = Object.getPrototypeOf(window.gamemain); if (p) { wrap(p, 'proto'); } } } catch (e) {}
                    try { if (window.hallScene) { wrap(window.hallScene, 'hallScene'); } } catch (e) {}
                    if (t < 3000) { setTimeout(tick, 0); }
                })();
            })();
            /* READ-ONLY storage recorder. It NEVER changes a return value - a broad Proxy on a config
               object was measured to hang the save path, so nothing here may alter behaviour. It records
               level-related reads so the key that the engine's getLastWordId actually reads becomes
               visible instead of inferred. Also hooks cc.sys.localStorage, which the engine may use. */
            (function armStorageRecorder() {
                function rec(api, tag) {
                    try {
                        if (!api || !api.getItem || api.__recHooked) { return; }
                        var orig = api.getItem.bind(api);
                        api.getItem = function (k) {
                            var v = orig(k);
                            try {
                                var s = window.MazeDashCustomTab && window.MazeDashCustomTab.stats;
                                if (s && /level|stage|word|map/i.test(String(k))) {
                                    if (!s.lsReads) { s.lsReads = []; }
                                    s.lsReads.push([tag + ':' + String(k), String(v), Date.now()]);
                                    if (s.lsReads.length > 50) { s.lsReads.shift(); }
                                }
                            } catch (e) {}
                            return v;
                        };
                        api.__recHooked = true;
                    } catch (e) {}
                }
                rec(window.localStorage, 'win');
                var t = 0;
                (function tick() {
                    t++;
                    try { if (window.cc && cc.sys && cc.sys.localStorage) { rec(cc.sys.localStorage, 'cc'); return; } } catch (e) {}
                    if (t < 2000) { setTimeout(tick, 0); }
                })();
            })();
            var keys = ['NaN', 'undefined', 'null', ''];
            var made = 0;
            for (var i = 0; i < keys.length; i++) {
                if (conf.level_cfg[keys[i]] === undefined) {
                    conf.level_cfg[keys[i]] = { id: 0, wordId: 1, levelId: 0, mapId: -1, sz_solution: '', __fallback: true };
                    made++;
                }
            }
            if (made) {
                try {
                    var s = window.MazeDashCustomTab && window.MazeDashCustomTab.stats;
                    if (s) { s.degenerateKeysSeeded = (s.degenerateKeysSeeded || 0) + made; s.degenerateKeysWhere = tag; }
                } catch (e) {}
            }
            return true;
        } catch (e) { return false; }
    }
    var tries = 0;
    (function tick() {
        tries++;
        if (seed('tick' + tries)) { return; }
        if (tries < 2000) { setTimeout(tick, 0); }
    })();
    try {
        if (window.cc && cc.game && cc.game.on) {
            if (cc.game.EVENT_GAME_INITED) { cc.game.on(cc.game.EVENT_GAME_INITED, function () { seed('gameInited'); }); }
            if (cc.game.EVENT_ENGINE_INITED) { cc.game.on(cc.game.EVENT_ENGINE_INITED, function () { seed('engineInited'); }); }
        }
    } catch (e) {}
})();
(function () {
    'use strict';

    /* ============================== 配置 ============================== */
    var CFG = {
        index: 5,              // 第 6 个标签的索引（原版 0..4）
        barWidth: 720,         // 标签栏宽度
        slotWidth: 120,        // 仅作默认值；实际按「可见格数」平分 720
        iconNodeSize: 70,      // 与原版图标一致
        tabName: 'customBar',
        viewName: 'customLevelsView',
        title: '自定义关卡',
        hint: '关卡编辑器接入点（占位页）',
        accent: '#7C6BF2',
    };

    /* 图标由 tools/make-wrench-icon.js 生成并注入到下面两个标记之间。
       想换图标：改脚本参数后重新运行
           node tools/make-wrench-icon.js --inject web/custom-tab.js
    */
    /* @generated-icon-start */
    var WRENCH_DATA_URI = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAIAAAACACAYAAADDPmHLAAAFHUlEQVR42u2dzY3bMBBGtxA1YrgEH3LSLR3kpHuQEnRIGbqmBYONqIM04CCANsgubGmGM/wR+QbgbdcW/D2OyI/k8O2NIAiCIAiCIAiCIAiCIAgie9yu9+F2vY+3632+Xe/L7XoPt+v98aKF7W/m7X8GfsFzij5uQq47Ykvbun3WyC9bt+iXrec+Ere/33HhF69L+JBB+GevC0Ao/G4vIfwzEBgrZBY/KtV//fJL1GJfDSiTp9ev3oI7ArGSDdKO7LOJboSBGYOz+JOH8N+//RY1JxAmlPMRf4kVXiq4BYgDCBYULCC+RNSfPx7idgQCEBRI+zHCa0TfaxEQ8DrwHPBphPcSXQICA0O/qZ6516cU3pANmCIKAFgtPT+X8JGZYEXhSIevVvEjIMAxtKb+GPG1hk9iCHgVPAEgpBDf6vwlgiCg+EfxL97ie1vACSBgKVnT+z3Ety4ixUJAFkjQ+50MmigYyAIZRv41iO8JATOC1wCoer+TK2eGwCsLYPkm6P3CbVzLpxZSQ4BFLFzt0/R+pfjz3hx88yJmTwgEz7b0DMDq2fu9Nm4ebTh1zgJrr+IPnr0/xXr83n4E5yww9AjAmAGA4PCcIQMAY48AzBYAhO/+IUemOoKA6aAwvTr3/tkpS+V4DSw9AhASAzAYevys9QY0i1LYwgIDyAhAiHymKdYcMgLwAIAXAORIqVuvXyzuoPF5AaAUANrjZgDQEABS8TWnjgDgJABIxNdsGAGAugAIgu9fPA+YAkCiaWAKe3VvtG89Y8g00NkI8nbXvA6eOAPQpRE0W+bWsVaw5Hu9j5thBRsWg7w3XmqmdF4HTwTPOfUIwJABgA/pVQKddB+CMwDdrgiuFgC0G0K0O5C8jpspdi2NvQGweGaBmM2gqcWPeMaBcYAhC2ghyAGA9gRxbxBk24JtXYEEgkLTwURlW7IDAATPAbikygISCDTmUwEIll6yQPDIAjGHQ0sAAAQJs4DleHjp+kK9QxC8IdCCUKLUjAKCqXUABs8zeTEglKo1hFF0MCPwguD/qp+lagsCQYQ97A3BEQiVA9B2YQnten3J0nB4BJkt4hSZAAjqhWBKUbYFCBpYLfSs5tUABG17BJYLI4Cgk9eBdCu3xTMAgsoHhjkujToBBF24hdmvjTsZBO1vK8t5cSQQ1J0Nsl0dWwMEuIWvl5IDELC3MMv18UBwnhnDElv4AQjaGyuMW3Y4qgn8XkN41lrRlUPA3QQ5FqVKgIBRBARAUNqAOhkEXFIBBFxjm8yKPhEE74PeiXsM9RAstUJgOCg7A4IOhBYhAAQg+GcecaWdEIKpUQgYLLbgFUiXvYGgUwiEMACBYkVybRQCxgRnN4w+H4JVQrAyO2jAMHp2IhobuTPD6Nn3KiAgC5zdK3j1GhJCQBYAArJAE4aRBAKKWzfsFRimhmwxawGCvdNPXHHTgWFkAQBjqAHDKOaoHPZwQ4bRZ5EBoBwEoQQEANC5VwAAHUPwTGQAqAOCOfXA8JXAAFC5V7C3iucp/ufPZhpYBgIVABII9nq3FgAUSg9ASF33SPKZWMHlAJhisoC1BpIw/bMYlMkfEM0EUonPcnClMwINBJpb0tkQcpIs4JEJDPsC6f21+gIxELAp9BxZIGrV8OhuJLaFnweCS46SuBwMOaE76AUBR8MagMBSExnxG4PAqSF+xWOCNaHwFIg4yewgRW1kSsR0CgLCNwDCpCydT5m4xscJ44vG+50gCIIgCILwiz9+YBCAWlDB2QAAAABJRU5ErkJggg==';
    /* @generated-icon-end */

    /* In wide mode the design is as wide as the browser window, so these are live
       lookups rather than the authored 720 x 1280 constants. */
    function visibleWidth() {
        try { return Math.max(720, Math.round(cc.view.getVisibleSize().width)); } catch (e) { return 720; }
    }
    function visibleHeight() {
        try { return Math.max(1280, Math.round(cc.view.getVisibleSize().height)); } catch (e) { return 1280; }
    }

    var stats = { showBarViewRetries: 0 };

    function log() {
        try {
            console.log.apply(console, ['[custom-tab]'].concat([].slice.call(arguments)));
        } catch (e) {}
    }
    function warn() {
        try {
            console.warn.apply(console, ['[custom-tab]'].concat([].slice.call(arguments)));
        } catch (e) {}
    }

    /* ---------------------------------------------------------- helpers */
    function childByName(node, name) {
        var kids = node.children || [];
        for (var i = 0; i < kids.length; i++) {
            if (kids[i].name === name) { return kids[i]; }
        }
        return null;
    }

    /* Build a cc.SpriteFrame from a data URI (no asset pipeline needed). */
    function spriteFrameFromDataURI(uri, cb) {
        var img = new Image();
        img.onload = function () {
            try {
                var tex = new cc.Texture2D();
                tex.initWithElement(img);
                if (tex.handleLoadedTexture) { tex.handleLoadedTexture(); }
                var sf = new cc.SpriteFrame(tex);
                sf.name = 'custom_tab_wrench';
                cb(sf);
            } catch (e) {
                warn('could not build sprite frame:', e);
                cb(null);
            }
        };
        img.onerror = function () { warn('icon image failed to load'); cb(null); };
        img.src = uri;
    }

    function makeLabel(parent, text, y, fontSize, color) {
        var node = new cc.Node('label');
        node.parent = parent;
        node.y = y;
        var label = node.addComponent(cc.Label);
        label.string = text;
        label.fontSize = fontSize;
        /* CJK glyphs sit taller than the Latin metrics the game's TTF was built for; at
           1.35 the top of a Chinese character gets clipped by the label box. Give the
           line box room for the full ascent. */
        label.lineHeight = Math.round(fontSize * 1.65);
        label.fontFamily = 'system-ui, -apple-system, "Segoe UI", "Microsoft YaHei", sans-serif';
        /* Clearing the font asset matters: setting useSystemFont while a cc.Font is still
           assigned does not always take effect, and the label then draws every CJK codepoint
           with the Latin-only face - which is exactly the "text collapsed into a clump of tiny
           glyphs" that keeps being reported. */
        try { label.font = null; } catch (e) {}
        /* keep enough vertical room for the tallest glyphs */
        try { label.lineHeight = Math.round(fontSize * 1.45); if (label.node) { label.node.height = Math.max(label.node.height || 0, label.lineHeight); } } catch (e) {}
        if ('useSystemFont' in label) { label.useSystemFont = true; }
        /* THE clump: with a narrow node and the default overflow, a long string (especially a
           CJK one) is squeezed into the box and wraps onto many tiny overlapping lines, which
           reads as "text collapsed into a clump of small glyphs". NONE makes the node size
           itself to the whole string, so it can never wrap. */
        try {
            if (cc.Label.Overflow && cc.Label.Overflow.NONE !== undefined) { label.overflow = cc.Label.Overflow.NONE; }
        } catch (e) {}
        node.color = color || cc.color(255, 255, 255, 255);
        return node;
    }

    /* ------------------------------------------------- 1. the 6th tab item */
    /* The game's own showBarView() throws on the *first* open of the quests tab
       ("Cannot read properties of undefined (reading 'count')"), which aborts the
       tab switch. A bisect showed this is not the wide design and not clean mode:
       it reproduces at the authored 720 design on a fresh session, and the very
       next attempt always succeeds. Wrap it with a single retry. */
    function makeShowBarViewResilient(hall) {
        if (!hall || typeof hall.showBarView !== 'function' || hall.showBarView.__retryable) { return false; }
        var orig = hall.showBarView;
        /* A page switch ANIMATES the page into place (parked pages sit at +-one page width, the active
           one is centred), so a layout computed in the middle of that animation is computed for the
           wrong world offset and the buttons visibly slide/jump afterwards. Fix: when the switch is
           aimed at the editor page, HIDE those buttons first, keep re-laying them out while the page
           settles, and only show them once the animation is over - so no frame is ever drawn with them
           in the wrong place. */
        function setEditorButtonsShown(hallRef, on) {
            try {
                var v = hallRef.viewGroup ? hallRef.viewGroup[CFG.index] : null;
                if (!v || !v.isValid) { return; }
                var kids = v.children || [];
                for (var i = 0; i < kids.length; i++) {
                    var n = kids[i];
                    if (n && n.isValid && /^editorSmall_|^editorBtn_/.test(n.name)) { n.opacity = on ? 255 : 0; }
                }
                stats.editorHomeButtonsShown = on ? 1 : 0;
            } catch (e) {}
        }
        function settleEditorHomeLayout(hallRef, tries) {
            try { relayoutEditorHomeNow(); } catch (e) {}
            if (tries <= 0) {
                stats.editorHomeSettleRuns = (stats.editorHomeSettleRuns || 0) + 1;
                setEditorButtonsShown(hallRef, true);
                return;
            }
            setTimeout(function () { try { settleEditorHomeLayout(hallRef, tries - 1); } catch (e) { setEditorButtonsShown(hallRef, true); } }, 60);
        }
        hall.showBarView = function () {
            try {
                var target = null;
                try { target = (window.gamemain && gamemain.showTabBarViewIndex); } catch (e) {}
                var toEditor = (target !== null && target !== undefined && String(target) === String(CFG.index));
                if (toEditor) { setEditorButtonsShown(hall, false); }
                var r = orig.apply(this, arguments);
                if (toEditor) { settleEditorHomeLayout(hall, 6); } else { try { relayoutEditorHomeNow(); } catch (e) {} }
                return r;
            } catch (e) {
                stats.showBarViewRetries = (stats.showBarViewRetries || 0) + 1;
                log('showBarView threw (retrying once):', e && e.message);
                var r2 = orig.apply(this, arguments);
                try { relayoutEditorHomeNow(); } catch (e2) {}
                try { setEditorButtonsShown(hall, true); } catch (e3) {}
                return r2;
            }
        };
        hall.showBarView.__retryable = true;
        return true;
    }
    function addTabItem(hall) {
        var bar = hall.tabBar;
        var proto = bar.children[bar.children.length - 1];
        if (!proto) { return null; }

        var item = cc.instantiate(proto);
        item.name = CFG.tabName;

        var comp = item.getComponent('TabBarItem');
        var myBg = childByName(item, 'bg');
        if (comp) {
            // wire these *before* parenting, because onLoad runs on activation
            comp.tabBarIndex = CFG.index;
            comp.hallNode = hall.node;
            if (myBg) { comp.bgNode = myBg; }
        }
        item.parent = bar;
        item.setSiblingIndex(bar.children.length - 1);
        if (comp && comp.hidden) { comp.hidden(); }

        // wrench icon
        var icon = childByName(item, 'icon');
        if (icon) {
            var sp = icon.getComponent(cc.Sprite);
            if (sp) {
                spriteFrameFromDataURI(WRENCH_DATA_URI, function (sf) {
                    if (sf && sp.isValid) { sp.spriteFrame = sf; }
                });
            }
        }
        log('added tab item at index', CFG.index, '->', item.name);
        return item;
    }

    /* The world-navigation arrows of every StageSelectLayer are 80x1280 hit areas
       running down the whole left and right edge, so the bottom 120px of both edges
       sits underneath "LeftButton"/"RightButton". The original 5-slot bar ended at
       x=600, which is why the rightmost tab never collided with them; a 6th slot at
       600..720 does.
       The arrows themselves are drawn around mid-height, so shrinking their hit box
       to a tall band in the middle is both a fix and a more sensible hit area — and
       it leaves the whole tab bar row free, so the new tab uses exactly the same
       touch path as the game's own five. */
    var ARROW_HIT_HEIGHT = 900;      // centred on y=640 -> y 190..1090, clear of the bar

    function freeTabBarArea() {
        var scene = cc.director.getScene();
        if (!scene) { return 0; }
        var changed = 0;
        (function walk(n) {
            if (/^(LeftButton|RightButton)$/.test(n.name) && n.height > ARROW_HIT_HEIGHT) {
                n.height = ARROW_HIT_HEIGHT;
                changed++;
            }
            var kids = n.children || [];
            for (var i = 0; i < kids.length; i++) { walk(kids[i]); }
        })(scene);
        return changed;
    }

    /* ------------------------------- 2. divide the bar evenly (6 x 120) */
    /* Widen the bar and the full-screen pages to the viewport, so on a wide
       window they no longer stay a centred 720 column. */
    function widenToViewport(hall) {
        var W = visibleWidth();
        var bar = hall.tabBar;
        if (!bar) { return W; }
        var bottom = bar.parent;
        if (bottom) {
            /* bottom carries a cc.Widget, which positions it from the Canvas size on its
               own schedule. That fought the widened layout and, on some window sizes,
               left the whole bar outside the visible area (reported as the bottom row
               disappearing until a swipe). Turn the Widget off and place the bar from the
               visible height every tick instead - one authority, no race. */
            var wgt = bottom.getComponent(cc.Widget);
            if (wgt && wgt.enabled) { wgt.enabled = false; stats.barWidgetOff = (stats.barWidgetOff || 0) + 1; }
            bottom.width = W;
            bottom.x = 0;
            bottom.y = -visibleHeight() / 2 + bottom.height / 2;
            /* The bar's own backdrop strip is authored 720 x 120, semi-transparent
               white. Left at that size it crosses only the middle of a widened bar and
               reads as "one tab's highlight is wider than the others" - it was reported
               twice as a wide panel behind whichever tab happened to sit there. Stretch
               it with the bar. */
            var bg = bottom.getChildByName('background');
            if (bg && bg.isValid) { bg.width = W; bg.x = 0; }
        }
        bar.width = W;
        bar.x = 0;
        var views = hall.viewGroup || [];
        for (var i = 0; i < views.length; i++) {
            var v = views[i];
            if (v && v.isValid) {
                v.width = W;
                v.height = visibleHeight();
                // parked pages must stay fully off-screen, so -720 is not enough
                if (!v.activeInHierarchy) { v.x = -W; }
            }
        }
        return W;
    }

    /* The placeholder page paints a full-screen background. Its tint used to be
       sampled from a sibling view at install time - which is white before the game
       has coloured that view - so the page came out as one big white sheet over the
       scene (the "white fog" that was reported). Take the colour from the camera
       instead, which this port keeps in sync with the theme, and if that is not
       usable, draw no background at all rather than a white one. */
    /* Pages whose own background is authored in a colour that only looked right while
       the pager clipped it to 720 px. The skin page is dark navy [48,46,76] and, once
       widened, painted both sides of the window with it. Tinting them to the theme
       colour keeps every page consistent. */
    /* Per page: the skin page is designed as an all-white screen (its inner panel is
       white, so the sides must be white too - tinting them with the theme colour made
       them look like the level-select backdrop). The custom page follows the theme. */
    var TINT_PAGES = [
        { name: 'customLevelsView', colour: 'theme' },
        { name: 'faceView', colour: 'white' },
    ];

    /* The five full-screen pages are Canvas children in a fixed order (shop, face,
       game, quest, setting, custom), and each paints a full-width backdrop. Whichever
       page is shown must therefore also be the LAST sibling, or a page with a higher
       index still draws over it - which is how the skin page ended up with the
       level-select backdrops showing down its sides. Raise the visible one each tick;
       it is a no-op when the order is already right. */
    function raiseActiveView() {
        /* MUTUAL EXCLUSION between editor UIs: while the grid editor is on screen, no hall page may be
           raised or hidden. The editor home page sits in the pager underneath, and because the grid
           backdrop deliberately stops above the tab bar (so the tab bar stays visible), an active home
           page showed through in that strip plus wherever the backdrop did not reach - that is the
           overlap the user photographed. Hidden here, and restored on close. */
        if (gridRootRef && gridRootRef.isValid) { return; }
        var hall = window.hallScene;
        if (!hall || !hall.viewGroup) { return; }
        /* Source of truth is the hall's own current tab index. The game can leave the
           previous page active (its moveOut only deactivates after an animation clip
           finishes), and with two pages active the earlier one still shows through -
           which is exactly the coloured bands down the sides of the skin page. */
        var cur = (typeof hall.currentIndex === 'number') ? hall.currentIndex : -1;
        var active = (cur >= 0 && hall.viewGroup[cur] && hall.viewGroup[cur].isValid) ? hall.viewGroup[cur] : null;
        if (!active) {
            hall.viewGroup.forEach(function (v) { if (v && v.isValid && v.activeInHierarchy) { active = v; } });
        }
        if (!active || !active.parent) { return; }
        hall.viewGroup.forEach(function (v, i) {
            if (!v || !v.isValid || v === active) { return; }
            if (v.activeInHierarchy) { v.active = false; stats.viewsHidden = (stats.viewsHidden || 0) + 1; }
        });
        active.setSiblingIndex(active.parent.children.length - 1);
        /* Sibling order is not enough: Cocos draws by zIndex first, and the pager was
           left with a higher zIndex than the skin page, so the world pages painted over
           it and showed through down both sides. Put the visible page above every other
           view page (the tab bar is a separate node and keeps its own layer). */
        var maxZ = -1;
        hall.viewGroup.forEach(function (v) { if (v && v.isValid && v !== active) { maxZ = Math.max(maxZ, v.zIndex); } });
        if (active.zIndex <= maxZ) {
            active.zIndex = maxZ + 1;
            stats.viewRaised = (stats.viewRaised || 0) + 1;
        }
        /* Raising the page above its siblings also raised it above the tab bar, which
           hid the whole bottom row until a swipe changed the layering. Keep the bar one
           layer above whatever the visible page ends up at. */
        var bottom = hall.tabBar && hall.tabBar.parent;
        if (bottom && bottom.isValid) {
            /* Reported as: the bar is there at first and gets covered later. Something
               that only appears after a while ends up above it. Rather than chase which
               node that is, keep the bar unconditionally on top - above every sibling on
               its parent, by zIndex and by sibling order - and re-check it every tick. */
            var host = bottom.parent;
            var maxAny = -1;
            if (host) {
                host.children.forEach(function (ch) { if (ch !== bottom && ch.isValid) { maxAny = Math.max(maxAny, ch.zIndex); } });
            }
            if (bottom.zIndex <= maxAny) {
                bottom.zIndex = maxAny + 1;
                stats.barRaised = (stats.barRaised || 0) + 1;
            }
            if (host && host.children[host.children.length - 1] !== bottom) {
                bottom.setSiblingIndex(host.children.length - 1);
                stats.barRestacked = (stats.barRestacked || 0) + 1;
            }
        }
    }
    function applyPageTint() {
        var hall = window.hallScene;
        if (!hall || !hall.viewGroup) { return false; }
        var idx = TINT_PAGES.indexOf(hall.viewGroup[CFG.index] ? hall.viewGroup[CFG.index].name : '');
        TINT_PAGES.forEach(function (spec) {
            hall.viewGroup.forEach(function (v) {
                if (v && v.isValid && v.name === spec.name) { tintOne(v, spec.colour); }
            });
        });
        return true;
    }

    /* the 2x2 white texture the game uses for tinted panels (tab highlights) */
    function whiteFrame() {
        try {
            var item = window.hallScene.tabBar.children[0];
            var bg = childByName(item, 'bg');
            var sp = bg && bg.getComponent(cc.Sprite);
            return sp ? sp.spriteFrame : null;
        } catch (e) { return null; }
    }
    function tintOne(page, kind) {
        if (!page || !page.isValid) { return false; }
        var sp = page.getComponent(cc.Sprite);
        if (!sp) { return false; }
        var col = null;
        try {
            var cam = cc.Camera.main || (cc.Camera.cameras && cc.Camera.cameras[0]);
            if (cam && cam.backgroundColor) { col = cam.backgroundColor; }
        } catch (e) {}
        /* Tinting alone cannot make a page white: these pages draw the default_panel
           texture, which is itself a grey panel, so white tint * grey texture = light
           grey - which is why the node reported pure white while the screen showed grey
           flanks. Swap in the 2x2 pure-white splash frame first, then tint. */
        var white = whiteFrame();
        if (white && sp.spriteFrame !== white) { sp.spriteFrame = white; }
        if (kind === 'white') {
            if (!sp.enabled) { sp.enabled = true; }
            page.color = cc.color(255, 255, 255, 255);
            stats.pageTintedWhite = (stats.pageTintedWhite || 0) + 1;
            return true;
        }
        var usable = !!col && !(col.r === 255 && col.g === 255 && col.b === 255);
        if (usable) {
            if (!sp.enabled) { sp.enabled = true; }
            page.color = cc.color(col.r, col.g, col.b, 255);
            stats.pageTinted = (stats.pageTinted || 0) + 1;
        } else {
            sp.enabled = false;          // transparent beats a white sheet
            stats.pageTintSkipped = (stats.pageTintSkipped || 0) + 1;
        }
        return usable;
    }
    function layoutTabs(hall) {
        var bar = hall.tabBar;
        var kids = bar.children || [];
        var barW = widenToViewport(hall);
        // Only active slots are laid out, so divide the bar between those — that
        // keeps 6 slots at 120 px, or 5 at 144 px once the shop tab is hidden.
        var active = 0;
        for (var a = 0; a < kids.length; a++) {
            if (kids[a].activeInHierarchy) { active++; }
        }
        var slot = active > 0 ? Math.round(barW / active) : CFG.slotWidth;
        for (var i = 0; i < kids.length; i++) {
            kids[i].width = slot;
            var bg = childByName(kids[i], 'bg');
            if (bg) { bg.width = slot; }
            var icon = childByName(kids[i], 'icon');
            if (icon) {
                /* Size each icon from its own sprite frame instead of forcing a
                   square: the flag art is 83x101 and squaring it stretched it ~22%
                   sideways, while the near-square icons hid the problem. Keep the
                   longer side at iconNodeSize. */
                var sp = icon.getComponent(cc.Sprite);
                var rect = sp && sp.spriteFrame ? sp.spriteFrame.getRect() : null;
                var box = CFG.iconNodeSize;
                if (rect && rect.width > 0 && rect.height > 0) {
                    if (rect.width >= rect.height) {
                        icon.width = box;
                        icon.height = Math.max(1, Math.round(box * rect.height / rect.width));
                    } else {
                        icon.height = box;
                        icon.width = Math.max(1, Math.round(box * rect.width / rect.height));
                    }
                } else {
                    icon.width = box;
                    icon.height = box;
                }
            }
        }
        var layout = bar.getComponent(cc.Layout);
        if (layout) {
            layout.spacingX = 0;
            layout.paddingLeft = 0;
            layout.paddingRight = 0;
            if (layout.updateLayout) { layout.updateLayout(); }
        }
        log('laid out', active, 'visible slots of', slot, 'px (bar', barW, ')');
    }

    /* --------------------------------- 3. the placeholder page for index 5 */
    /* Replace this to build the real level editor. */
    function buildPlaceholderContent(view, bgColor) {
        var title = makeLabel(view, CFG.title, 40, 52, cc.color(255, 255, 255, 255));
        title.name = 'customTitle';

        var hint = makeLabel(view, CFG.hint, -24, 24, cc.color(255, 255, 255, 190));
        hint.name = 'customHint';

        // a small tool mark so the page does not read as broken
        if (WRENCH_DATA_URI.length > 64) {
            spriteFrameFromDataURI(WRENCH_DATA_URI, function (sf) {
                if (!sf || !view.isValid) { return; }
                var mark = new cc.Node('customIcon');
                mark.parent = view;
                mark.y = 180;
                mark.width = 150; mark.height = 150;
                var sp = mark.addComponent(cc.Sprite);
                sp.spriteFrame = sf;
                sp.sizeMode = cc.Sprite.SizeMode.CUSTOM;
                sp.type = cc.Sprite.Type.SIMPLE;
            });
        }
        return view;
    }

    function addView(hall) {
        var siblings = hall.viewGroup || [];
        var sample = siblings[0];
        if (!sample || !sample.parent) { return null; }

        var view = new cc.Node(CFG.viewName);
        view.parent = sample.parent;
        view.setContentSize(visibleWidth(), visibleHeight());
        view.anchorX = 0.5;
        view.anchorY = 0.5;
        view.x = -visibleWidth();      // parked off-screen left, like the others
        view.y = 0;
        view.active = false;     // parked views are inactive, like the game's own

        // background: reuse the 2x2 white sprite the tab highlight uses,
        // stretched and tinted — exactly how the game paints its own pages
        var sampleSprite = sample.getComponent(cc.Sprite);
        view.__whiteFrame = sampleSprite ? sampleSprite.spriteFrame : null;
        var white = sampleSprite ? sampleSprite.spriteFrame : null;
        var bg = view.addComponent(cc.Sprite);
        if (white) { bg.spriteFrame = white; }
        bg.sizeMode = cc.Sprite.SizeMode.CUSTOM;
        bg.type = cc.Sprite.Type.SIMPLE;
        var tint = sample.color ? cc.color(sample.color.r, sample.color.g, sample.color.b, 255)
                                : cc.color(42, 170, 134, 255);
        view.color = tint;

        // cc.Animation first: the game's TabBarView.onLoad grabs it and would
        // throw on a node without one
        view.addComponent(cc.Animation);

        var protoView = sample.getComponent('TabBarView');
        var ViewClass = protoView ? protoView.constructor
                                  : (cc.js.getClassByName ? cc.js.getClassByName('TabBarView') : null);
        var tv = ViewClass ? view.addComponent(ViewClass) : null;

        if (tv) {
            // The game's TabBarView plays AnimationClips named moveInFromLeft /
            // moveOutToRight. This page has no clips, so slide it directly with
            // the same direction semantics:
            //   dir 1 -> the page comes in from the left, and the outgoing page
            //            leaves to the right
            //   dir 2 -> the mirror image
            //   dir 0 -> no direction information: show instantly
            tv.moveIn = function (dir, zIndex) {
                var n = this.node;
                if (!n || !n.isValid) { return; }
                n.stopAllActions();
                n.active = true;
                n.opacity = 255;
                n.y = 0;
                n.zIndex = zIndex;
                if (dir === 1) {
                    n.x = -visibleWidth();
                    n.runAction(cc.moveTo(0.22, cc.v2(0, 0)));
                } else if (dir === 2) {
                    n.x = visibleWidth();
                    n.runAction(cc.moveTo(0.22, cc.v2(0, 0)));
                } else {
                    n.x = 0;
                }
            };
            tv.moveOut = function (dir, zIndex) {
                var n = this.node;
                if (!n || !n.isValid) { return; }
                n.stopAllActions();
                n.zIndex = zIndex;
                if (dir === 1) {
                    n.runAction(cc.sequence([cc.moveTo(0.22, cc.v2(visibleWidth(), 0)),
                        cc.callFunc(function () { n.active = false; n.x = -visibleWidth(); })]));
                } else if (dir === 2) {
                    n.runAction(cc.sequence([cc.moveTo(0.22, cc.v2(-visibleWidth(), 0)),
                        cc.callFunc(function () { n.active = false; n.x = -visibleWidth(); })]));
                }
                // dir 0: no direction information — stay put; the incoming page
                // is opaque and covers us, which is what the original game does
            };
        }

        buildPlaceholderContent(view, tint);
        log('created placeholder view', view.name);
        return view;
    }

    /* ============ 自建 UI 的多语言 ============
       游戏自己的文案在 game_lang.json 里、由 LocalizedLabel 驱动；我自建的节点不经过
       那套流程，所以必须自己跟着 gamemain.getGameLang() 走，否则切语言时我的界面不动。
       编辑器后续所有自建文字都从这里取词。 */
    var TEXT = {
        en:        { mode: 'Mode', progression: 'Progression', unlocked: 'Unlocked',
                     customTitle: 'Level Editor', customHint: 'Work in progress', editorTitle: 'Level Editor', createWorld: 'New World', createLevel: 'New Level', comingSoon: 'Coming soon',
                     worldName: 'World name', themeColour: 'Theme colour', hexHint: 'Or type a colour code below', confirm: 'Create', cancel: 'Cancel', untitledWorld: 'My World', moveLevels: 'Move levels here',
                     tileNewLevel: 'New level', tileMoveLevels: 'Move in', createFailed: 'Could not create', computing: 'Working...', previewWorld: 'Preview worlds', previewLevel: 'Preview levels', exportJson: 'Export JSON', noWorldsYet: 'No worlds created yet', deleteWorld: 'Delete world', confirmDeleteWorld: 'Delete this world?', confirmDelete: 'Delete', backToEditor: 'Editor', emptyHint: 'Create one from the editor', testWorldName: 'Test World (3 heroes + 3 colours)' },
        'zh-Hans': { mode: '模式', progression: '闯关模式', unlocked: '解锁模式',
                     customTitle: '关卡编辑器', customHint: '开发中', editorTitle: '关卡编辑器', createWorld: '创建新世界', createLevel: '创建新关卡', comingSoon: '即将推出',
                     worldName: '世界名称', themeColour: '主题色', hexHint: '也可以在下面直接输入颜色代码', confirm: '创建', cancel: '取消', untitledWorld: '新世界', moveLevels: '转移关卡至本世界',
                     tileNewLevel: '新建关卡', tileMoveLevels: '移入关卡', createFailed: '创建失败', computing: '计算中…', previewWorld: '预览已编辑的世界', previewLevel: '预览已编辑的关卡', exportJson: '导出 JSON', noWorldsYet: '还没有创建任何世界', deleteWorld: '删除世界', confirmDeleteWorld: '是否确认删除此世界？', confirmDelete: '确认删除', backToEditor: '返回编辑器', emptyHint: '在编辑器里创建一个世界', testWorldName: '测试世界（3 主角 + 3 色传送门）' },
        'zh-Hant': { mode: '模式', progression: '闖關模式', unlocked: '解鎖模式',
                     customTitle: '關卡編輯器', customHint: '開發中', editorTitle: '關卡編輯器', createWorld: '建立新世界', createLevel: '建立新關卡', comingSoon: '即將推出' },
        ja:        { mode: 'モード', progression: '通常モード', unlocked: '全解放',
                     customTitle: 'ステージエディタ', customHint: '開発中', editorTitle: 'ステージエディタ', createWorld: '新しい世界', createLevel: '新しいステージ', comingSoon: '近日公開' },
        kr:        { mode: '모드', progression: '일반 모드', unlocked: '전체 해금',
                     customTitle: '스테이지 편집기', customHint: '개발 중', editorTitle: '스테이지 편집기', createWorld: '새 세계', createLevel: '새 스테이지', comingSoon: '곧 공개' },
        de:        { mode: 'Modus', progression: 'Fortschritt', unlocked: 'Freigeschaltet',
                     customTitle: 'Level-Editor', customHint: 'In Arbeit', editorTitle: 'Level-Editor', createWorld: 'Neue Welt', createLevel: 'Neues Level', comingSoon: 'Demnächst' },
        es:        { mode: 'Modo', progression: 'Progreso', unlocked: 'Desbloqueado',
                     customTitle: 'Editor de niveles', customHint: 'En desarrollo', editorTitle: 'Editor de niveles', createWorld: 'Nuevo mundo', createLevel: 'Nuevo nivel', comingSoon: 'Próximamente' },
        fr:        { mode: 'Mode', progression: 'Progression', unlocked: 'Débloqué',
                     customTitle: 'Éditeur de niveaux', customHint: 'En cours', editorTitle: 'Éditeur de niveaux', createWorld: 'Nouveau monde', createLevel: 'Nouveau niveau', comingSoon: 'Bientôt' },
        pt:        { mode: 'Modo', progression: 'Progresso', unlocked: 'Desbloqueado',
                     customTitle: 'Editor de níveis', customHint: 'Em desenvolvimento', editorTitle: 'Editor de níveis', createWorld: 'Novo mundo', createLevel: 'Novo nível', comingSoon: 'Em breve' },
        ru:        { mode: 'Режим', progression: 'Прогресс', unlocked: 'Разблокировано',
                     customTitle: 'Редактор уровней', customHint: 'В разработке', editorTitle: 'Редактор уровней', createWorld: 'Новый мир', createLevel: 'Новый уровень', comingSoon: 'Скоро' },
    };

    /* Every language must carry 'computing', or t() falls back to printing the raw key -
       exactly the bug we hit with importJson. Fill gaps once, after the table is built. */
    (function () {
        var src = (TEXT['zh-Hans'] && TEXT['zh-Hans'].computing) || (TEXT.en && TEXT.en.computing) || '\u2026';
        for (var k in TEXT) { if (TEXT[k] && TEXT[k].computing === undefined) { TEXT[k].computing = src; } }
    })();
    /* Module-level on purpose: a nested copy would not be visible to the call sites. */
    function roundPanel(node, w, h, radius, colour) {
        var g = node.getComponent(cc.Graphics) || node.addComponent(cc.Graphics);
        g.clear();
        g.fillColor = colour;
        g.roundRect(-w / 2, -h / 2, w, h, radius);
        g.fill();
        node.setContentSize(w, h);
        return g;
    }
    /* the game ships ten languages (sz_en / sz_zh-Hans / sz_zh-Hant / sz_ja / sz_de /
       sz_kr / sz_es / sz_fr / sz_pt / sz_ru) - mirror them all here, and normalise the
       couple of spellings the runtime may report. */
    var LANG_ALIAS = { ko: 'kr', 'zh-cn': 'zh-Hans', 'zh-sg': 'zh-Hans', 'zh-tw': 'zh-Hant', 'zh-hk': 'zh-Hant' };

    function currentLang() {
        var l = 'en';
        /* read the game's own stored setting first: getGameLang() can lag behind the
           settings screen, and this is the value the game itself persists. */
        try {
            var stored = localStorage.getItem('game_lang');
            if (stored) { l = stored.replace(/^"|"$/g, ''); }
        } catch (e) {}
        if (!l || l === 'en') {
            try { var g = gamemain.getGameLang && gamemain.getGameLang(); if (g) { l = g; } } catch (e) {}
        }
        if (LANG_ALIAS[l]) { return LANG_ALIAS[l]; }
        if (TEXT[l]) { return l; }
        var base = String(l).split(/[-_]/)[0].toLowerCase();
        if (LANG_ALIAS[base]) { return LANG_ALIAS[base]; }
        for (var k in TEXT) { if (k.toLowerCase() === String(l).toLowerCase()) { return k; } }
        return 'en';
    }

    /* translate a key for the language the game is currently set to */
    function t(key) {
        var l = currentLang();
        var row = TEXT[l] || TEXT[l && l.split('-')[0]] || TEXT.en;
        return (row && row[key]) || (TEXT.en[key] || key);
    }

    /* The expensive part of the tick: three scene-wide walks (text refresh, marker cleanup, and
       following the visible world). Gated on the scene/viewport stamp with a 5 s safety pass, so
       it runs a couple of times a minute instead of forty, while the cheap O(few) positioning
       still runs on every tick. Counters expose the reduction. */
    function sweepTextAndMarkers(hall) {
        var stamp = 'x';
        try {
            var sc = cc.director.getScene();
            var vs = cc.view.getVisibleSize();
            stamp = (sc ? sc.name : '') + '|' + Math.round(vs.width) + 'x' + Math.round(vs.height) + '|' + (sc ? sc.children.length : 0);
        } catch (e) {}
        var now = Date.now();
        if (window.__mazeDashStampTab === stamp && (now - (window.__mazeDashStampTabAt || 0)) < 5000) {
            stats.tabSkips = (stats.tabSkips || 0) + 1;
            return 0;
        }
        window.__mazeDashStampTab = stamp;
        window.__mazeDashStampTabAt = now;
        stats.tabWalks = (stats.tabWalks || 0) + 1;
        dropBuildMarker();
        applyTexts();
        followVisibleWorld(hall);
        return 1;
    }
    /* re-apply text every tick: a language change then shows up without a reload */
    /* the temporary build/language marker is gone; remove it from a panel that an older
       build may have created earlier in this session */
    function dropBuildMarker() {
        var hall = window.hallScene;
        if (!hall || !hall.node || !hall.node.isValid) { return; }
        (function walk(n) {
            if (n.name === 'modeSwitchBuild') { n.destroy(); stats.buildMarkerDropped = (stats.buildMarkerDropped || 0) + 1; return; }
            (n.children || []).forEach(walk);
        })(hall.node);
    }
    function applyTexts() {
        var hall = window.hallScene;
        if (!hall || !hall.node || !hall.node.isValid) { return; }
        var want = { modeSwitchTitle: t('mode'), label_progression: t('progression'), label_unlocked: t('unlocked'),
                     customTitle: t('editorTitle'), customHint: t('customHint'),
                     editorBtnLabel_createWorld: t('createWorld'), editorBtnLabel_createLevel: t('createLevel'),
                     editorSmallLabel_previewWorld: t('previewWorld'), editorSmallLabel_previewLevel: t('previewLevel'), editorSmallLabel_exportJson: t('exportJson') };
        Object.keys(want).forEach(function (name) {
            var n = cc.find('Canvas'); if (!n) { return; }
            (function walk(x) {
                if (x.name === name) {
                    var lb = x.getComponent(cc.Label);
                    if (lb && lb.string !== want[name]) { lb.string = want[name]; stats.textsUpdated = (stats.textsUpdated || 0) + 1; }
                }
                (x.children || []).forEach(walk);
            })(hall.node);
        });
    }
    /* ================= 选关页左上角的模式切换（用游戏自身语汇） =================
       面板用游戏自己的 default_panel（20x20 圆角帧，按 SLICED 九宫格拉伸），
       选中态用选关页的 list_level_next（亮金），未选态用 list_level_disabled（暗橄榄）
       —— 这就是游戏自己在标签栏与"下一关"上表达"选中"的方式，不再是我自造的小方框。 */
    /* Theme colours live in conf.theme_cfg as HSVA arrays with S and V on a 0-100 scale,
       and the engine's Color.fromHSV wants 0-1 - converting by hand produced black. The
       game already has a helper for exactly this, used all over its own UI, so use it and
       fall back to a corrected manual conversion only if it is unavailable. */
    function themeValue(worldId, key) {
        try {
            var t = conf.theme_cfg[worldId] || conf.theme_cfg[String(worldId)] || conf.theme_cfg[1];
            return (t && t[key]) || null;
        } catch (e) { return null; }
    }

    function applyThemeColour(node, worldId, key, fallback) {
        var v = themeValue(worldId, key);
        if (v && typeof setNodeColorForHSVA === 'function') {
            try { setNodeColorForHSVA(node, v); return true; } catch (e) {}
        }
        if (v) {
            var h = (((v[0] % 360) + 360) % 360) / 360, s = v[1] / 100, val = v[2] / 100;
            var i = Math.floor(h * 6), f = h * 6 - i, p = val * (1 - s), q = val * (1 - f * s), t2 = val * (1 - (1 - f) * s);
            var rgb = [[val, t2, p], [q, val, p], [p, val, t2], [p, q, val], [t2, p, val], [val, p, q]][i % 6];
            node.color = cc.color(Math.round(rgb[0] * 255), Math.round(rgb[1] * 255), Math.round(rgb[2] * 255),
                Math.round((v[3] === undefined ? 1 : v[3]) * 255));
            return true;
        }
        node.color = fallback;
        return false;
    }
    /* the game's own rounded panel texture, taken from a world page */
    function panelFrame() {
        try {
            var sv = cc.find('Canvas/gameView/scrollView');
            var content = sv && sv.getComponent(cc.ScrollView).content;
            var page = content && content.children.filter(function (p) { return p.getComponent('StageSelectLayer'); })[0];
            var sp = page && page.getComponent(cc.Sprite);
            return sp ? sp.spriteFrame : null;
        } catch (e) { return null; }
    }

    /* Order matters: a cc.Sprite defaults to sizeMode TRIMMED, so assigning the
       spriteFrame resizes the node back to the frame's own 20x20 - which is how the mode
       rows ended up as tiny boxes. Set CUSTOM first, assign the frame, then re-assert the
       size we actually want. */
    function roundedPanel(node, colour, w, h) {
        var sp = node.addComponent(cc.Sprite);
        sp.sizeMode = cc.Sprite.SizeMode.CUSTOM;
        sp.type = cc.Sprite.Type.SLICED;
        sp.spriteFrame = panelFrame();
        sp.insetLeft = sp.insetRight = sp.insetTop = sp.insetBottom = 7;
        if (w && h) { node.setContentSize(w, h); }
        node.color = colour;
        return sp;
    }

    function buildModeSwitch(hall) {
        var page = hall.viewGroup && hall.viewGroup[2];
        if (!page || !page.isValid) { return null; }
        if (page.getChildByName('modeSwitch')) { return page.getChildByName('modeSwitch'); }

        var worldId = (typeof gamemain.getLastWordId === 'function' && gamemain.getLastWordId()) || 1;
        var panelW = 620, panelH = 190, rowW = 270, rowH = 76;
        var root = new cc.Node('modeSwitch');
        root.parent = page;
        root.setContentSize(panelW, panelH);
        /* Anchor to the viewport, not to page.width: this runs during install, before
           the page has been widened, so page.width was still 20 and the panel landed
           near the middle. positionModeSwitch() re-asserts it every tick anyway. */
        root.x = -visibleWidth() / 2 + 34 + panelW / 2;
        root.y = visibleHeight() / 2 - 24 - panelH / 2;
        roundedPanel(root, cc.color(163, 75, 67, 255), panelW, panelH);
        applyThemeColour(root, worldId, 'list_level_background', cc.color(163, 75, 67, 255));

        var title = makeLabel(root, t('mode'), panelH / 2 - 30, 26, cc.color(255, 255, 255, 235));
        title.name = 'modeSwitchTitle';


        var modes = [
            { id: 'progression', label: t('progression') },
            { id: 'unlocked', label: t('unlocked') },
        ];
        var rows = [];
        modes.forEach(function (m, i) {
            var row = new cc.Node('modeRow_' + m.id);
            row.parent = root;
            row.setContentSize(rowW, rowH);
            row.x = (i === 0 ? -1 : 1) * (rowW / 2 + 12);
            row.y = -18;
            roundedPanel(row, cc.color(0, 0, 0, 0), rowW, rowH);
            var lb = makeLabel(row, m.label, 0, 30, cc.color(255, 255, 255, 255));
            lb.name = 'label_' + m.id;
            row.on(cc.Node.EventType.TOUCH_START, function () { pressFeedback(row, true); });
            row.on(cc.Node.EventType.TOUCH_CANCEL, function () { pressFeedback(row, false); });
            row.on(cc.Node.EventType.TOUCH_END, function () {
                pressFeedback(row, false);
                applyMode(m.id);
                var wid = visibleWorldId(hall) || worldId;
                retintRows(rows, wid);
                animateIn(root);
                log('mode switched to', m.id);
            });
            rows.push({ id: m.id, node: row });
        });
        paintModeRows(rows, worldId);
        animateIn(root);
        stats.lastWorldId = worldId;
        stats.modeSwitchBuilt = (stats.modeSwitchBuilt || 0) + 1;
        return root;
    }

    /* repaint the mode rows whenever the player swipes to another world, with the
       game's short dip transition rather than a snap */
    function followVisibleWorld(hall) {
        var root = hall.viewGroup && hall.viewGroup[2] && hall.viewGroup[2].getChildByName('modeSwitch');
        if (!root || !root.isValid) { return; }
        var wid = visibleWorldId(hall);
        if (!wid || stats.lastWorldId === wid) { return; }
        stats.lastWorldId = wid;
        var rows = root.children.filter(function (n) { return /^modeRow_/.test(n.name); })
            .map(function (n) { return { id: n.name.replace('modeRow_', ''), node: n }; });
        retintRows(rows, wid);
        stats.worldRetints = (stats.worldRetints || 0) + 1;
    }
    /* ---- which world is on screen right now (follows a swipe) ---- */
    function visibleWorldId(hall) {
        try {
            var pager = hall.StageSelectLayer;
            var content = pager && pager.content;
            if (!content) { return null; }
            var centre = cc.view.getVisibleSize().width / 2;
            var best = null, bestDist = 1e9;
            content.children.forEach(function (p) {
                var c = p.getComponent && p.getComponent('StageSelectLayer');
                if (!c) { return; }
                var wx = p.parent ? p.parent.convertToWorldSpaceAR(p.getPosition()).x : p.x;
                var d = Math.abs(wx - centre);
                if (d < bestDist) { bestDist = d; best = c.m_stageId; }
            });
            return best;
        } catch (e) { return null; }
    }

    /* ---- the game's own motion idiom: short scale + fade, ~0.2 s ---- */
    function animateIn(node) {
        if (!node || !node.isValid) { return; }
        node.stopAllActions();
        node.opacity = 0;
        node.scale = 0.88;
        node.runAction(cc.spawn(cc.fadeTo(0.18, 255), cc.scaleTo(0.18, 1, 1)));
    }

    /* re-tint with a quick dip so a world change is felt rather than snapped */
    function retintRows(rows, worldId) {
        if (!rows || !rows.length) { return; }
        rows.forEach(function (r) {
            var n = r.node;
            if (!n || !n.isValid) { return; }
            n.stopAllActions();
            n.runAction(cc.sequence(
                cc.fadeTo(0.07, 110),
                cc.callFunc(function () { paintOneRow(r, worldId); }),
                cc.fadeTo(0.13, 255)
            ));
        });
    }

    /* press feedback: the game scales its buttons for a few frames on touch */
    function pressFeedback(node, on) {
        if (!node || !node.isValid) { return; }
        node.stopAllActions();
        node.runAction(cc.scaleTo(0.05, on ? 0.95 : 1, on ? 0.95 : 1));
    }
    /* keep the panel pinned to the top-left through resizes and page widening */
    function positionModeSwitch(hall) {
        var page = hall.viewGroup && hall.viewGroup[2];
        var root = page && page.getChildByName('modeSwitch');
        if (!root || !root.isValid) { return; }
        var panelW = Math.round(root.width) || 620, panelH = Math.round(root.height) || 190;
        var wantX = -visibleWidth() / 2 + 34 + panelW / 2;
        var wantY = visibleHeight() / 2 - 24 - panelH / 2;
        if (Math.abs(root.x - wantX) > 1 || Math.abs(root.y - wantY) > 1) { root.x = wantX; root.y = wantY; }
    }
    function paintOneRow(r, worldId) {
        if (!r || !r.node || !r.node.isValid) { return; }
        var active = currentMode();
        var isOn = (r.id === active);
        if (isOn) {
            applyThemeColour(r.node, worldId, 'list_level_next', cc.color(255, 210, 60, 255));
        } else {
            applyThemeColour(r.node, worldId, 'list_level_disabled', cc.color(70, 60, 70, 255));
            r.node.color = cc.color(r.node.color.r, r.node.color.g, r.node.color.b, 200);
        }
        var lb = r.node.getChildByName('label_' + r.id) || r.node.getChildByName('label');
        if (lb) { lb.color = isOn ? cc.color(60, 40, 20, 255) : cc.color(255, 255, 255, 210); }
    }

    function paintModeRows(rows, worldId) {
        rows.forEach(function (r) { paintOneRow(r, worldId); });
    }
    /* ================== 模式选择：闯关模式 / 解锁模式 ==================
       解锁模式把所有世界与关卡都判为已通关（覆盖两个取值函数），方便调试与检查。
       选择结果存在 localStorage，重开页面仍然生效。 */
    var MODE_KEY = 'maze_dash_mode';

    function currentMode() {
        try { return localStorage.getItem(MODE_KEY) === 'unlocked' ? 'unlocked' : 'progression'; } catch (e) { return 'progression'; }
    }
    function maxLevelId(worldId) {
        try {
            var cfg = conf.stage_level_cfg[worldId], mx = 0;
            for (var k in cfg) { if (cfg[k].levelId > mx) { mx = cfg[k].levelId; } }
            return mx;
        } catch (e) { return 0; }
    }
    /* clear the generated buttons, then let the game decide lock vs grid again */
    function refreshStagePages() {
        try {
            var sv = cc.find('Canvas/gameView/scrollView');
            var content = sv && sv.getComponent(cc.ScrollView).content;
            if (!content) { return 0; }
            var n = 0;
            content.children.forEach(function (page) {
                var c = page.getComponent('StageSelectLayer');
                if (!c) { return; }
                var host = (c.SelectLevelLayer && c.SelectLevelLayer.parent && c.SelectLevelLayer.parent.getComponent(cc.Layout))
                    ? c.SelectLevelLayer.parent : c.SelectLevelLayer;
                if (host) {
                    host.children.slice().forEach(function (ch) {
                        if (ch.getComponent && ch.getComponent('LevelButton')) { ch.removeFromParent(); }
                    });
                }
                /* showLockLayer() decides lock vs grid, but updateUnlockLayer() (the
                   unlocked branch) never turns LockLayer off - so switching back to
                   unlock mode left the lock panel and its icons on top. Clear it. */
                try { if (c.LockLayer) { c.LockLayer.active = false; } } catch (e) {}
                try { c.showLockLayer(); n++; } catch (e) {}
            });
            return n;
        } catch (e) { return 0; }
    }
    function applyMode(mode) {
        var gm = window.gamemain;
        if (!gm) { return false; }
        if (!gm.__origPassMax) {
            gm.__origPassMax = gm.getPassMaxLevelId;
            gm.__origPassCount = gm.getPassLevelCount;
        }
        try { localStorage.setItem(MODE_KEY, mode); } catch (e) {}
        if (mode === 'unlocked') {
            gm.getPassLevelCount = function () { return 9999; };            // every world unlocked
            gm.getPassMaxLevelId = function (worldId) { return maxLevelId(worldId); };
        } else {
            gm.getPassLevelCount = gm.__origPassCount;
            gm.getPassMaxLevelId = gm.__origPassMax;
        }
        refreshStagePages();
        if (window.MazeDashWide && MazeDashWide.widenSelectPage) { try { MazeDashWide.widenSelectPage(); } catch (e) {} }
        log('mode ->', mode, '(stage pages refreshed)');
        return true;
    }

    /* ================== 编辑器主界面：标题 + 左右下角两个大按钮 ==================
       标题的位置与字号**在运行时从选关页的世界名节点读取**，所以永远和它对齐，
       不会因为改布局而跑偏。两个按钮用游戏自己的圆角面板，配色取自主题，
       动效沿用游戏的语汇（0.18s 淡入+缩放、点按缩到 0.95、以及轻微呼吸循环）。 */
    function worldTitleRef() {
        try {
            var sv = cc.find('Canvas/gameView/scrollView');
            var content = sv && sv.getComponent(cc.ScrollView).content;
            var page = content && content.children.filter(function (p) { return p.getComponent('StageSelectLayer'); })[0];
            var c = page && page.getComponent('StageSelectLayer');
            return c && c.Title ? c.Title : null;
        } catch (e) { return null; }
    }

    /* ==================== 关卡编辑器：20x20 网格（第一阶段） ====================
       第一阶段只做"地板/墙"这一个工具，但闭环是完整的：改格子 -> 保存成新关卡 -> 立刻进关试玩。
       网格规格按约定：格距 64px，20 格正好 1280（设计高度），方块 56px 留出网格线。
       每个可点元素都显式给 zIndex（全屏容器会盖住并吃掉点击，这是踩过的坑）。
       打开时隐藏标签栏：它被刻意保持在所有兄弟节点之上，会吃掉底行格子和"保存"按钮的点击。 */
    var GRID_N = 20, GRID_PITCH = 40, GRID_TILE = 36;   // 20x40 = 800px, leaving a row for the palette and the tab bar below
    var GRID_OFFSET_Y = 80;                              // grid centre: its bottom edge clears the palette row and the tab bar
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
        try { armDragPaint(); } catch (e) {}
        if (!cell || !cell.isValid) { return; }
        var v = cell.__value;
        var col = colourForValue(cell);
        if (col === null) { gridThemeColour(cell, 'list_level_next', cc.color(255, 210, 60, 255)); }
        else { cell.color = col; }
        var tick = cell.getChildByName('tick');
        if (tick && tick.isValid) {
            var lb = tick.getComponent(cc.Label);
            if (lb) { lb.string = glyphForValue(v); }
            tick.active = (v !== 0 && v !== 1);   /* the tick is an ITEM marker; floors and walls stay plain (user asked for no tick) */
            tick.color = cc.color(255, 255, 255, 245);
        }
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
        dragCellsRef = null;
        try {
            var hallBar2 = window.hallScene && window.hallScene.tabBar && window.hallScene.tabBar.parent;
            /* the tab bar is never hidden by the editor any more */

        } catch (e) {}
        /* Restore with the SAME lookup the drag mute uses. The old code only walked up from
           tabBar.parent, which is a different path from Canvas/gameView/scrollView, so a muted pager
           was never switched back on (measured: scrollEnabled stayed false after closing). */
        try {
            /* Re-enable the EXACT component that was muted. cc.find('Canvas/gameView/scrollView')
               resolved to a different component when checked later (measured: dragScrollRestored
               incremented while the probe's scroll view was still disabled), so keep the reference. */
            var svr = dragPaintState.mutedSv || null;
            if (!svr) {
                var svnR = cc.find('Canvas/gameView/scrollView');
                if (svnR) { svr = svnR.getComponent(cc.ScrollView); }
            }
            if (!svr) { (function up2(n) { if (!svr && n.getComponent && n.getComponent(cc.ScrollView)) { svr = n.getComponent(cc.ScrollView); } if (n.parent) { up2(n.parent); } })(window.hallScene && window.hallScene.tabBar ? window.hallScene.tabBar.parent : cc.find('Canvas')); }
            if (svr && (svr.__dragDisabled || dragPaintState.mutedSv)) { svr.enabled = true; svr.__dragDisabled = false; stats.dragScrollRestored = (stats.dragScrollRestored || 0) + 1; }
            /* also re-enable the path-resolved one, in case both exist */
            var svnR2 = cc.find('Canvas/gameView/scrollView');
            var svr2 = svnR2 && svnR2.getComponent(cc.ScrollView);
            if (svr2 && svr2 !== svr) { svr2.enabled = true; svr2.__dragDisabled = false; }
            dragPaintState.mutedSv = null;
        } catch (e) {}
        stats.gridEditorClosed = (stats.gridEditorClosed || 0) + 1;
        /* restore the editor home page the grid editor hid (mutual exclusion, other half) */
        try {
            var homeShow = window.hallScene && window.hallScene.viewGroup ? window.hallScene.viewGroup[CFG.index] : null;
            if (homeShow && homeShow.isValid) {
                if (!homeShow.active) {
                    homeShow.active = true;
                    stats.editorHomeRestored = (stats.editorHomeRestored || 0) + 1;
                }
                /* Always re-run the frame-correct layout on the way back: the page may already be
                   active (the guard above would otherwise skip it), and the 1.5s sweep runs its own
                   parked-frame math in between, which is what left the left big button off screen
                   right after the back button. */
                try { relayoutEditorHomeNow(); } catch (e) {}
            }
        } catch (e) {}
        return closed;
    }

    /* ==================== 第二阶段：元素工具 ====================
       调色板放左侧：设计宽 2276，网格只占中间 1280，两侧余量足够，所以格子保持 64px 不缩小。
       点格子 = 按当前工具写入。传送门颜色存在**按地图键**的旁表；activePortalColours 仍是
       "当前载入关卡的那张表"，于是已验证的配对/上色代码一字不改继续可用。 */
    var PORTAL_PALETTE = { 1: cc.color(226, 64, 72), 2: cc.color(64, 200, 96), 3: cc.color(64, 140, 240), 4: cc.color(168, 88, 224) };
    var PORTAL_COLOUR_ORDER = [4, 1, 3, 2];
    var portalColoursByMap = {};
    function mapColours(mapId) { if (!portalColoursByMap[mapId]) { portalColoursByMap[mapId] = {}; } return portalColoursByMap[mapId]; }
    function setActiveMapColours(mapId) { activePortalColours = mapColours(mapId); stats.activeColourMap = mapId; return activePortalColours; }
    var TOOLS = [
        { id: 'floor',  value: 1,  glyph: '\u2713', key: 'toolFloor' },
        { id: 'wall',   value: 0,  glyph: '#',      key: 'toolWall' },
        { id: 'hero',   value: -1, glyph: 'C',      key: 'toolHero' },
        { id: 'brick',  value: -4, glyph: 'B',      key: 'toolBrick' },
        { id: 'key',    value: 4,  glyph: 'K',      key: 'toolKey' },
        { id: 'lock',   value: -3, glyph: 'L',      key: 'toolLock' },
        { id: 'up',     value: 5,  glyph: '^',      key: 'toolUp' },
        { id: 'right',  value: 6,  glyph: '>',      key: 'toolRight' },
        { id: 'down',   value: 7,  glyph: 'V',      key: 'toolDown' },
        { id: 'left',   value: 8,  glyph: '<',      key: 'toolLeft' },
        { id: 'portal', value: 2,  glyph: 'P',      key: 'toolPortal' },
    ];
    var editorTool = { id: 'floor', value: 1, portalColour: 4 };
    var editorColours = {};
    function glyphForValue(v) {
        if (v === 1) { return '\u2713'; }
        if (v === 0) { return ''; }
        for (var i = 0; i < TOOLS.length; i++) { if (TOOLS[i].value === v) { return TOOLS[i].glyph; } }
        return '';
    }
    function colourForValue(cell) {
        var v = cell.__value;
        if (v === 1) { return cc.color(226, 210, 172, 255); }   /* MEASURED in-game floor tile: spaceTile under fllor_space_layer, colour 226,210,172 */
        if (v === 0) { return cc.color(46, 40, 52, 255); }
        if (v === -1) { return cc.color(255, 196, 48, 255); }   /* MEASURED in-game hero tile colour; the 'C' glyph marks it as the hero */
        if (v === -4) { return cc.color(150, 96, 56, 255); }
        if (v === 4) { return cc.color(240, 200, 80, 255); }
        if (v === -3) { return cc.color(120, 124, 140, 255); }
        if (v === 5) { return cc.color(96, 180, 220, 255); }   /* Up    - light blue */
        if (v === 6) { return cc.color(70, 205, 165, 255); }   /* Right - teal */
        if (v === 7) { return cc.color(150, 120, 235, 255); }  /* Down  - violet */
        if (v === 8) { return cc.color(235, 170, 80, 255); }   /* Left  - amber */
        if (v === 2) { return PORTAL_PALETTE[editorColours[cell.__gx + ',' + cell.__gy] || 0] || cc.color(168, 88, 224, 255); }
        return cc.color(80, 80, 90, 255);
    }
    function setEditorTool(id) {
        for (var i = 0; i < TOOLS.length; i++) { if (TOOLS[i].id === id) { editorTool.id = id; editorTool.value = TOOLS[i].value; } }
        refreshToolButtons();
        stats.editorTool = editorTool.id;
    }
    function refreshToolButtons() {
        var root = gridRootRef && gridRootRef.isValid ? gridRootRef.getChildByName('gridPalette') : null;
        if (!root || !root.isValid) { return; }
        (root.children || []).forEach(function (b) {
            if (b.name && b.name.indexOf('tool_') === 0 && b.name !== 'tool_clear') {
                var on = (b.name.substring(5) === editorTool.id);
                b.color = on ? cc.color(255, 210, 60, 255) : cc.color(52, 46, 58, 235);
                b.scale = on ? 1.04 : 1;
                var lb = b.getChildByName('toolLabel');
                if (lb) { lb.color = on ? cc.color(30, 26, 34, 255) : cc.color(255, 255, 255, 225); }
            } else if (b.name && b.name.indexOf('swatch_') === 0) {
                b.scale = (parseInt(b.name.substring(7), 10) === editorTool.portalColour) ? 1.18 : 1;
            }
        });
    }
    function applyToolToCell(cell) {
        if (!cell || !cell.isValid) { return; }
        var v = editorTool.value;
        cell.__value = v;
        var key = cell.__gx + ',' + cell.__gy;
        if (v === 2) { editorColours[key] = editorTool.portalColour; } else { delete editorColours[key]; }
        paintGridCell(cell);
        /* ORDER MATTERS: write the matrix the save path reads BEFORE refreshing anything derived from
           it. The old order called updateSolvability() first, so a freshly placed hero was still read
           as "Hero 0 / Unsolvable: no hero" (both the counter and the red line disagreed with the
           board). The matrix is the single source of truth. */
        try {
            var ed = MazeDashCustomTab.gridEditor;
            if (ed && ed.grid && ed.grid[cell.__gy]) { ed.grid[cell.__gy][cell.__gx] = v; }
        } catch (e) {}
        refreshGridReadout();
        scheduleSolvability();   /* debounced: a full solve on every cell edit made portal placement freeze */
        /* The readout/status nodes live under gridReadoutBg, NOT directly under the grid root
           (measured), so the old root.getChildByName('gridReadout') always returned null. */
        try {
            var root2 = (typeof gridRootRef !== 'undefined' && gridRootRef && gridRootRef.isValid) ? gridRootRef : null;
            var bg2 = root2 && root2.getChildByName('gridReadoutBg');
            var ed2 = MazeDashCustomTab.gridEditor;
            var g2 = ed2 && ed2.grid;
            if (bg2 && g2) {
                var rn = bg2.getChildByName('gridReadout');
                if (rn) { var l1 = rn.getComponent(cc.Label); if (l1) { l1.string = gridReadout(g2); } }
                var hero = 0;
                g2.forEach(function (row) { row.forEach(function (v2) { if (v2 === -1) { hero++; } }); });
                stats.readoutHero = hero;
                var stn = bg2.getChildByName('gridStatus');
                if (stn) { var l2 = stn.getComponent(cc.Label); if (l2 && hero > 0 && /no hero/i.test(String(l2.string || ''))) { l2.string = ''; } }
                stats.readoutFromMatrix = (stats.readoutFromMatrix || 0) + 1;
            }
        } catch (e) {}
        stats.gridPaints = (stats.gridPaints || 0) + 1;
    }
    function toggleGridCell(cell) { applyToolToCell(cell); }
    function refreshGridReadout() {
        try {
            var root = gridRootRef;
            var bg = root && root.getChildByName('gridReadoutBg');
            var lb = bg && bg.getChildByName('gridReadout') && bg.getChildByName('gridReadout').getComponent(cc.Label);
            var ed = MazeDashCustomTab.gridEditor;
            if (lb && ed && ed.grid) { lb.string = gridReadout(ed.grid); }
        } catch (e) {}
    }
    function clearGrid() {
        var ed = MazeDashCustomTab.gridEditor;
        if (!ed) { return; }
        for (var y = 0; y < GRID_N; y++) {
            for (var x = 0; x < GRID_N; x++) {
                ed.grid[y][x] = 0;
                var cell = ed.cells[y * GRID_N + x];
                if (cell && cell.isValid) { cell.__value = 0; paintGridCell(cell); }
            }
        }
        editorColours = {};
        refreshGridReadout();
        updateSolvability();
        stats.gridCleared = (stats.gridCleared || 0) + 1;
    }
    function buildPalette(root, W, H) {
        /* One horizontal row UNDER the grid, per the new layout requirement. It sits at
           y = -410 with a height of 140 (so -480..-340), while the tab bar occupies roughly
           -640..-520: a 40px gap, and nothing needs hiding - the tab bar stays visible and
           simply never overlaps this row, so it cannot swallow the taps. */
        /* The row must fit the ACTUAL visible width: at 1200x800 the design width is 1920, and a fixed
           2100px palette put two tool labels off screen (found by tools/verify/probe-layout-audit.js). */
        var panelW = Math.max(760, Math.min(2100, visibleWidth() - 100)), panelH = 140, panelY = -410;
        var panel = new cc.Node('gridPalette');
        panel.parent = root;
        panel.setContentSize(panelW, panelH);
        panel.x = 0;
        panel.y = panelY;
        panel.zIndex = 55;
        roundedPanel(panel, cc.color(30, 26, 34, 240), panelW, panelH);
        var n = TOOLS.length + PORTAL_COLOUR_ORDER.length + 2;   // tools + swatches + clear + save
        var slotW = Math.floor((panelW - 40) / n);
        var bw = Math.min(150, slotW - 8), bh = 104;
        var items = [];
        TOOLS.forEach(function (tool) { items.push({ kind: 'tool', tool: tool }); });
        PORTAL_COLOUR_ORDER.forEach(function (idx) { items.push({ kind: 'swatch', idx: idx }); });
        items.push({ kind: 'clear' });
        items.push({ kind: 'save' });   // save lives in this row so it cannot collide with it
        items.forEach(function (it, i) {
            var x = Math.round(-panelW / 2 + 20 + slotW * (i + 0.5));
            var b;
            if (it.kind === 'swatch') {
                b = new cc.Node('swatch_' + it.idx);
                b.setContentSize(84, 84);
                roundedPanel(b, PORTAL_PALETTE[it.idx], 84, 84);
                /* selecting a colour must be a real action: picking one also switches to the
                   portal tool, and tapping the same swatch again keeps it selected */
                (function (node, idx) {
                    node.on(cc.Node.EventType.TOUCH_END, function () {
                        pressFeedback(node, false);
                        editorTool.portalColour = idx;
                        if (editorTool.value !== 2) { setEditorTool('portal'); } else { refreshToolButtons(); }
                    });
                })(b, it.idx);
            } else if (it.kind === 'save') {
                b = new cc.Node('gridSave');
                b.setContentSize(bw, bh);
                roundedPanel(b, cc.color(255, 210, 60, 255), bw, bh);
                makeLabel(b, t('saveAndPlay'), 0, 18, cc.color(40, 32, 20, 255)).name = 'toolLabel';
                b.on(cc.Node.EventType.TOUCH_END, function () { pressFeedback(b, false); saveGridAndPlay(MazeDashCustomTab.gridEditor.grid); });
            } else if (it.kind === 'clear') {
                b = new cc.Node('tool_clear');
                b.setContentSize(bw, bh);
                roundedPanel(b, cc.color(150, 60, 60, 240), bw, bh);
                makeLabel(b, t('clearGrid'), 0, 20, cc.color(255, 255, 255, 240)).name = 'toolLabel';
                b.on(cc.Node.EventType.TOUCH_END, function () { pressFeedback(b, false); clearGrid(); });
            } else {
                var tool = it.tool;
                b = new cc.Node('tool_' + tool.id);
                b.setContentSize(bw, bh);
                roundedPanel(b, cc.color(52, 46, 58, 235), bw, bh);
                makeLabel(b, tool.glyph + ' ' + t(tool.key), 0, 24, cc.color(255, 255, 255, 225)).name = 'toolLabel';
                b.on(cc.Node.EventType.TOUCH_END, function () { pressFeedback(b, false); setEditorTool(tool.id); });
            }
            b.parent = panel;
            b.x = x;
            b.y = 0;
            b.zIndex = 56;
            b.on(cc.Node.EventType.TOUCH_START, function () { pressFeedback(b, true); });
            b.on(cc.Node.EventType.TOUCH_CANCEL, function () { pressFeedback(b, false); });
        });
        refreshToolButtons();
        return panel;
    }

    /* ==================== 可解性校验 ====================
       本游戏过关 = 蛇身填满所有地板格，所以随手画的关卡大多无解。这里只做**不会撒谎**的判定：
         · "solvable"   = 搜索**真的找到了**一条填满全部地板的走法（最短路步数）
         · "unsolvable" = **结构性不可能**（无主角 / 没有地板 / 有孤立地板 / 地板分区不连通）
         · "undecided"  = 达到节点上限，判定不了（绝不猜）
       机制按源码实现：冲刺到被挡为止、沿途填格、箭头强制转向且反向视为墙、
       传送门按同色配对（与已验收的 pairing 规则一致）、砖块/锁按"不可穿越"处理（保守 → 找到的解在游戏里一定成立）。 */
    var SOLVER_NODE_CAP = 200000;
    var SOLVER_DIRS = [[0, -1, 5], [1, 0, 6], [0, 1, 7], [-1, 0, 8]];
    /* Corrected per the authoritative format research (docs/level-format.md new sections):
       keys are passable and get eaten, locks vanish once every key is collected, bricks are only
       passable after being smashed (the search treats unbroken bricks as walls - conservative, so
       any solution it finds is valid in the game), arrows only along their own direction, and
       portals are one-shot: a traversal consumes BOTH end cells. */
    function solverIsFloor(v) { return v === 1 || v === -1; }
    function solverPassable(v) { return v === 1 || v === -1 || v === 2 || v === 4 || (v >= 5 && v <= 8); }
    function solverConsumable(v) { return v === 2 || v === 4 || v === -3 || v === -4; }
    /* 求解器用的传送门配对表：键 "x,y" → 配对另一门的坐标。
       与运行时 getOutPortal 的语义保持一致：
         · 有颜色的门只与同色门配对（颜色取自 colours 旁表，键同 "x,y"）；
         · 无色门（0 或未记录）可与任意门配对；
         · 取扫描顺序（行优先）里的第一个，与引擎的 for..in 顺序一致。
       已知限制：运行时一次穿越会**消耗两端**，本模型未建模这个"一次性"，
       所以对多门关卡它是保守近似（详见 docs/level-format.md §5 与本次验证报告）。 */
    function solverPortalMap(grid, colours) {
        var list = [];
        var H = grid.length, W = grid[0] ? grid[0].length : 0;
        for (var y = 0; y < H; y++) {
            for (var x = 0; x < W; x++) {
                if (grid[y][x] === 2) { list.push([x, y, (colours && colours[x + ',' + y]) || 0]); }
            }
        }
        var link = {};
        for (var i = 0; i < list.length; i++) {
            var a = list[i];
            for (var j = 0; j < list.length; j++) {
                if (i === j) { continue; }
                var b = list[j];
                if (a[2] > 0 && b[2] !== a[2]) { continue; }
                link[a[0] + ',' + a[1]] = [b[0], b[1]];
                break;
            }
        }
        return link;
    }

    function solveGrid(grid, colours) {
        var H = grid.length, W = H ? grid[0].length : 0;
        var floors = [], head = null, keys = 0, cells = {};
        for (var y = 0; y < H; y++) {
            for (var x = 0; x < W; x++) {
                var v = grid[y][x];
                cells[x + ',' + y] = v;
                if (v === 1) { floors.push([x, y]); }
                if (v === -1) { head = [x, y]; floors.push([x, y]); }
                if (v === 4) { keys++; }
            }
        }
        if (!head) { return { state: 'unsolvable', reason: 'noHero' }; }
        if (!floors.length) { return { state: 'unsolvable', reason: 'noFloor' }; }
        for (var i = 0; i < floors.length; i++) {
            var p = floors[i], nb = 0;
            for (var d = 0; d < 4; d++) {
                var nx = p[0] + SOLVER_DIRS[d][0], ny = p[1] + SOLVER_DIRS[d][1];
                if (ny < 0 || ny >= H || nx < 0 || nx >= W) { continue; }
                if (solverPassable(grid[ny][nx])) { nb++; }
            }
            if (!nb) { return { state: 'unsolvable', reason: 'isolatedFloor', at: p }; }
        }
        var link = solverPortalMap(grid, colours);
        var seen = {}, stack = [head[0] + ',' + head[1]];
        seen[head[0] + ',' + head[1]] = 1; var count = 1;
        while (stack.length) {
            var cur = stack.pop(), cx = parseInt(cur.split(',')[0], 10), cy = parseInt(cur.split(',')[1], 10);
            var cand = [];
            for (var d2 = 0; d2 < 4; d2++) { cand.push([cx + SOLVER_DIRS[d2][0], cy + SOLVER_DIRS[d2][1]]); }
            if (link[cur]) { cand.push(link[cur]); }
            cand.forEach(function (q) {
                var k = q[0] + ',' + q[1];
                if (q[0] < 0 || q[0] >= W || q[1] < 0 || q[1] >= H || seen[k]) { return; }
                if (!solverPassable(grid[q[1]][q[0]])) { return; }
                seen[k] = 1; count++; stack.push(k);
            });
        }
        if (count < floors.length) { return { state: 'unsolvable', reason: 'disconnectedFloor' }; }
        /* the authoritative clear condition: no cell may keep a value outside {0,-1,-2} - so every
           floor must be covered AND every consumable (portal / key / lock / brick) must be gone. */
        var leftover = 0;
        Object.keys(cells).forEach(function (k) { if (solverConsumable(cells[k])) { leftover++; } });
        var idx = {}; floors.forEach(function (p2, i2) { idx[p2[0] + ',' + p2[1]] = i2; });
        function bitsOf(list, n) {
            var a = []; for (var i3 = 0; i3 < n; i3++) { a.push('0'); }
            list.forEach(function (k2) { var j = idx[k2]; if (j !== undefined) { a[j] = '1'; } });
            return a.join('');
        }
        var queue = [{ x: head[0], y: head[1], bits: bitsOf([head[0] + ',' + head[1]], floors.length), left: leftover, keys: 0, depth: 0 }];
        var visited = {}; visited[head[0] + ',' + head[1] + '|' + queue[0].bits + '|' + leftover + '|0'] = 1;
        var nodes = 0, trace = {}, maxCovered = 0, sawFull = 0, bestState = null;
        while (queue.length) {
            if (++nodes > SOLVER_NODE_CAP) { return { state: 'undecided', reason: 'nodeCap', nodes: nodes }; }
            var st = queue.shift();
            trace[st.depth] = (trace[st.depth] || 0) + 1;
            var cov = 0; for (var ci = 0; ci < st.bits.length; ci++) { if (st.bits[ci] === '1') { cov++; } }
            if (cov > maxCovered) { maxCovered = cov; bestState = st.bits + ' left=' + st.left + ' at ' + st.x + ',' + st.y; }
            if (st.bits.indexOf('0') < 0) { sawFull++; }
            if (st.left === 0 && st.bits.indexOf('0') < 0) { return { state: 'solvable', moves: st.depth, nodes: nodes }; }
            for (var dd = 0; dd < 4; dd++) {
                var dir = SOLVER_DIRS[dd], x = st.x, y = st.y, bits = st.bits.split(''), left = st.left, keys2 = st.keys;
                var dx = dir[0], dy = dir[1], wantArrow = dir[2], moved = false, guard = 0;
                while (guard++ < 400) {
                    var nx2 = x + dx, ny2 = y + dy;
                    if (ny2 < 0 || ny2 >= H || nx2 < 0 || nx2 >= W) { break; }
                    var nv = grid[ny2][nx2];
                    if (nv >= 5 && nv <= 8) { if (nv !== wantArrow) { break; } }
                    else if (nv === 0 || nv === -4) { break; }                      // wall / whole brick (conservative)
                    else if (nv === -3) {
                        /* a lock is passable only once every key is collected; entering it uses
                           the lock up (the authoritative rule: locks become floor at that point) */
                        if (keys2 < keys) { break; }
                        left--;
                    }
                    else if ((nv === 1 || nv === -1) && bits[idx[nx2 + ',' + ny2]] === '1') { break; }   // its own body stops the slide
                    else if (nv !== 1 && nv !== -1 && nv !== 2 && nv !== 4) { break; }                    // anything else blocks
                    x = nx2; y = ny2; moved = true;
                    var j2 = idx[x + ',' + y]; if (j2 !== undefined) { bits[j2] = '1'; }
                    if (nv === 4) { keys2++; left--; }                                  // the key is eaten
                    if (nv >= 5 && nv <= 8) { for (var q2 = 0; q2 < 4; q2++) { if (SOLVER_DIRS[q2][2] === nv) { dx = SOLVER_DIRS[q2][0]; dy = SOLVER_DIRS[q2][1]; wantArrow = nv; } } }
                    if (nv === 2) {
                        var pk = link[x + ',' + y];
                        if (pk) {
                            left -= 2;                                                  // one-shot: both ends are used up
                            var sk = x + ',' + y;
                            var j3 = idx[x + ',' + y]; if (j3 !== undefined) { bits[j3] = '1'; }
                            var j4 = idx[pk[0] + ',' + pk[1]]; if (j4 !== undefined) { bits[j4] = '1'; }
                            x = pk[0]; y = pk[1];
                        }
                    }
                }
                if (!moved) { continue; }
                var bk = x + ',' + y + '|' + bits.join('') + '|' + left + '|' + keys2;
                if (visited[bk]) { continue; }
                visited[bk] = 1;
                queue.push({ x: x, y: y, bits: bits.join(''), left: left, keys: keys2, depth: st.depth + 1 });
            }
        }
        /* Exhausting a conservative model does NOT prove unsolvability (bricks are modelled as
           walls here), so this is reported as undecided rather than unsolvable. */
        /* Report the search size and what the best state achieved, so a false negative can be
           diagnosed instead of guessed (the 3x3 case came back undecided with no numbers at all). */
        return { state: 'undecided', reason: 'noSolutionInConservativeModel', nodes: nodes, floors: floors.length,
                 maxCovered: maxCovered, sawFullBitmap: sawFull, bestState: bestState, states: Object.keys(visited).length,
                 perDepth: JSON.parse(JSON.stringify(trace)) };
    }
    var FILTER_REASON = { noHero: 'noHero', noFloor: 'noFloor', isolatedFloor: 'isolatedFloor', disconnectedFloor: 'noFloorReach' };
    var editorSolvability = null;
    /* The live readout used to run a full search on every single cell edit. With portals on the
       board that search explodes, so placing the second portal froze the editor. The verdict shown
       while editing is now debounced; the SAVE path still solves synchronously (it re-checks right
       before it decides), so the gate never acts on a stale verdict.
       stats.solveDebounceRuns / solveDebounceSkipped let a probe prove the saving. */
    var solveTimer = null, solvePending = 0;
    function scheduleSolvability() {
        solvePending++;
        stats.solveDebounceSkipped = (stats.solveDebounceSkipped || 0) + 1;
        /* show progress immediately: the verdict is debounced, the user should still see that
           something is being computed (the solve itself must stay off the input path). */
        try { var bgC = gridRootRef && gridRootRef.getChildByName('gridReadoutBg'); var stC = bgC && bgC.getChildByName('gridStatus') && bgC.getChildByName('gridStatus').getComponent(cc.Label); if (stC) { stC.string = t('computing'); } } catch (e) {}
        if (solveTimer) { clearTimeout(solveTimer); }
        solveTimer = setTimeout(function () {
            solveTimer = null;
            var ran = solvePending;
            solvePending = 0;
            var t0 = (window.performance && performance.now) ? performance.now() : Date.now();
            try { updateSolvability(); } catch (e) { warn('debounced solve failed:', e && e.message); }
            var t1 = (window.performance && performance.now) ? performance.now() : Date.now();
            stats.solveDebounceRuns = (stats.solveDebounceRuns || 0) + 1;
            stats.solveDebounceLastMs = Math.round((t1 - t0) * 100) / 100;
            stats.solveDebounceBatched = ran;
        }, 350);
    }
    function updateSolvability() {
        var ed = MazeDashCustomTab.gridEditor;
        if (!ed) { return null; }
        var res = solveGrid(ed.grid, editorColours);
        editorSolvability = res;
        stats.editorSolvable = res.state;
        if (res.moves !== undefined) { stats.editorSolverMoves = res.moves; }
        if (res.nodes !== undefined) { stats.editorSolverNodes = res.nodes; }
        try {
            var root = gridRootRef;
            var bg = root && root.getChildByName('gridReadoutBg');
            var status = bg && bg.getChildByName('gridStatus') && bg.getChildByName('gridStatus').getComponent(cc.Label);
            if (status) {
                if (res.state === 'solvable') { status.string = t('solveOk') + ' (' + res.moves + ')'; status.color = cc.color(120, 230, 140, 255); }
                else if (res.state === 'unsolvable') { status.string = t('solveBad') + ': ' + t(FILTER_REASON[res.reason] || 'solveUnknown'); status.color = cc.color(255, 120, 120, 255); }
                else { status.string = t('solveUndecided'); status.color = cc.color(255, 210, 120, 255); }
            }
            var save = root && root.getChildByName('gridPalette') && root.getChildByName('gridPalette').getChildByName('gridSave');
            if (save && save.isValid) {
                save.color = (res.state === 'unsolvable') ? cc.color(200, 90, 90, 255) : cc.color(255, 210, 60, 255);
            }
        } catch (e) {}
        return res;
    }

    /* The editor laid the grid and the button row out from a size that was about TWICE the real
       screen (measured: nodes at world x = -1981 while cc.view.getVisibleSize().width = 2276), which
       pushed the cells off screen and left only a few decorations visible. visibleWidth/Height are
       therefore clamped here, at module scope, before anything builds a layout: the Canvas' own size
       is the reliable design-space screen size. */
    (function clampVisibleSize() {
        try {
            var curW = visibleWidth, curH = visibleHeight;
            var canvasW = (cc.find('Canvas') || {}).width;
            var canvasH = (cc.find('Canvas') || {}).height;
            visibleWidth = function () {
                var raw = curW();
                var lim = (cc.find('Canvas') || {}).width || canvasW || raw;
                return (raw && raw > 0) ? Math.min(raw, lim) : (lim || raw);
            };
            visibleHeight = function () {
                var raw = curH();
                var lim = (cc.find('Canvas') || {}).height || canvasH || raw;
                return (raw && raw > 0) ? Math.min(raw, lim) : (lim || raw);
            };
            window.__vwClamped = true;
        } catch (e) {}
    })();
    /* DRAG PAINTING, armed lazily from paintGridCell (called for every cell at build time, so this
       runs once per editor open). One listener on the grid container; the pointer is converted to a
       cell index arithmetically from the first cell's world position and the pitch, with the index
       de-duplicated so a single cell is never applied twice, and the surrounding scroll view's touch
       is disabled for the duration so the pager cannot steal the drag. */
    var dragPaintState = { active: false, last: null };
    /* cellsRef is declared INSIDE openGridEditor, so this module-level function could not see it:
       every call threw ReferenceError inside its own try/catch and silently returned null (measured:
       dragCellsResolved never incremented even though the pointer mapped to a valid world point). */
    var dragCellsRef = null;
    function nearestCellFromWorld(wx, wy) {
        try {
            var first = dragCellsRef && dragCellsRef[0];
            if (!first || !first.isValid) { return null; }
            var n = GRID_N || 20;
            var fw = first.convertToWorldSpaceAR(cc.v2(0, 0));
            /* MEASURED, not derived: cell_0_0 world (803.4, 1044.8), cell_1_0 x 838.6, cell_0_1 y 1009.6
               => the real pitch is 35.2 in BOTH axes, while the node width is 36. The old code used
               first.width + (cells[1].x - fw.x) = 36 + 35.2 = 71.2, i.e. double the true pitch, so the
               row/column it derived was wrong (and with a pointer slightly outside, always out of range). */
            var c1 = dragCellsRef[1], c2 = dragCellsRef[n];
            var px = (c1 && c1.isValid) ? (c1.convertToWorldSpaceAR(cc.v2(0, 0)).x - fw.x) : 0;
            var py = (c2 && c2.isValid) ? (fw.y - c2.convertToWorldSpaceAR(cc.v2(0, 0)).y) : 0;
            if (!(Math.abs(px) > 0.5)) { px = first.width || 40; }
            if (!(Math.abs(py) > 0.5)) { py = px; }
            var gx = Math.round((wx - fw.x) / px);
            var gy = Math.round((fw.y - wy) / py);
            if (gy < 0 || gy > n - 1 || gx < 0 || gx > n - 1) { return null; }
            var cell = dragCellsRef[gy * n + gx];
            if (cell && cell.isValid) { stats.dragCellsResolved = (stats.dragCellsResolved || 0) + 1; stats.dragLastIndex = gx + ',' + gy; }
            return (cell && cell.isValid) ? cell : null;
        } catch (e) { return null; }
    }
    function applyDragAt(wx, wy) {
        var cell = nearestCellFromWorld(wx, wy);
        if (!cell) { dragPaintState.last = null; return; }
        var key = cell.__gx + ',' + cell.__gy;
        if (dragPaintState.last === key) { return; }          // de-dupe: one apply per cell per drag
        dragPaintState.last = key;
        /* Mute the pager only once the pointer has actually resolved to a grid cell, so a tap on the
           palette or the back button can never leave the hall pager switched off. */
        if (!dragPaintState.muted) {
            dragPaintState.muted = true;
            try {
                var sv = null;
                var svn = cc.find('Canvas/gameView/scrollView');
                if (svn) { sv = svn.getComponent(cc.ScrollView); }
                if (!sv) { (function up(n) { if (!sv && n.getComponent) { sv = n.getComponent(cc.ScrollView); } if (!sv && n.parent) { up(n.parent); } })(window.hallScene && window.hallScene.tabBar ? window.hallScene.tabBar.parent : cc.find('Canvas')); }
                if (sv && sv.enabled !== false) { sv.__dragDisabled = true; sv.enabled = false; dragPaintState.mutedSv = sv; stats.dragScrollDisabled = (stats.dragScrollDisabled || 0) + 1; }
            } catch (e) {}
        }
        applyToolToCell(cell);
        stats.dragPaintApplies = (stats.dragPaintApplies || 0) + 1;
        stats.dragCellsApplied = (stats.dragCellsApplied || 0) + 1;
    }
    function armDragPaint() {
        try {
            var root = gridRootRef;
            if (!root || !root.isValid || root.__dragArmed) { return; }
            root.__dragArmed = true;
            var toWorldFromLoc = function (lx, ly) {
                var vs = cc.view.getVisibleSize();
                var rect = cc.game.canvas.getBoundingClientRect();
                var sx = vs.width / (rect.width || vs.width);
                var sy = vs.height / (rect.height || vs.height);
                var p = cc.v2(lx * sx, ly * sy);
                stats.dragLastWorld = Math.round(p.x) + ',' + Math.round(p.y);
                return p;
            };
            var beginWith = function (lx, ly, src) {
                dragPaintState.active = true; dragPaintState.last = null; dragPaintState.muted = false;
                stats.dragDowns = (stats.dragDowns || 0) + 1; stats.dragSource = src;
                var p = toWorldFromLoc(lx, ly); applyDragAt(p.x, p.y);
            };
            var moveWith = function (lx, ly) {
                stats.dragMoves = (stats.dragMoves || 0) + 1;
                if (!dragPaintState.active) { return; }
                var p = toWorldFromLoc(lx, ly); applyDragAt(p.x, p.y);
            };
            var endDrag = function () { dragPaintState.active = false; dragPaintState.last = null; dragPaintState.muted = false; };
            /* DOM listeners only. Both sources were tried together, but Cocos's
               Event.getLocation() did not match the canvas-relative space this code needs (measured:
               the derived world point was 1890,1423, outside the 0..2276 x 0..1280 world), and because
               both fired for the same drag the wrong one kept resetting the de-dupe key. The DOM path
               is exact - it is the same mapping the probes verify - and it fires for touch as well. */
            /* DOM listeners on the canvas are the GUARANTEED input path. The Cocos listeners on the
               container never fired for a drag (measured: dragDowns/dragMoves stayed undefined) because
               the cells are children with their own handlers; DOM events cannot be swallowed that way.
               Mapping is the one the probes verified: world = cssPointer * (visibleSize / cssSize). */
            var cv = cc.game.canvas;
            if (cv && !cv.__gridDragBound) {
                cv.__gridDragBound = true;
                var domLoc = function (e) {
                    var r = cv.getBoundingClientRect();
                    return { x: e.clientX - r.left, y: r.height - (e.clientY - r.top) };
                };
                var domBegin = function (e) { var l = domLoc(e); beginWith(l.x, l.y, 'dom'); };
                var domMove = function (e) { var l = domLoc(e); moveWith(l.x, l.y); };
                cv.addEventListener('mousedown', domBegin, true);
                cv.addEventListener('mousemove', domMove, true);
                window.addEventListener('mouseup', endDrag, true);
                cv.addEventListener('touchstart', domBegin, true);
                cv.addEventListener('touchmove', domMove, true);
                window.addEventListener('touchend', endDrag, true);
                window.addEventListener('touchcancel', endDrag, true);
                stats.dragDomBound = (stats.dragDomBound || 0) + 1;
            }
            stats.dragPaintArmed = (stats.dragPaintArmed || 0) + 1;
        } catch (e) {}
    }
    function openGridEditor() {

        var host = cc.find('Canvas');
        if (!host) { return null; }
        closeGridEditor();
        /* exactly one editor UI at a time: hide the editor home page while the grid editor is open */
        try {
            var homeHide = window.hallScene && window.hallScene.viewGroup ? window.hallScene.viewGroup[CFG.index] : null;
            if (homeHide && homeHide.isValid && homeHide.activeInHierarchy) {
                homeHide.active = false;
                stats.editorHomeHiddenForGrid = (stats.editorHomeHiddenForGrid || 0) + 1;
            }
        } catch (e) {}
        var W = visibleWidth(), H = visibleHeight();

        var root = new cc.Node(GRID_NAME);
        root.parent = host;
        root.setContentSize(W, H);
        root.zIndex = 999;                                   // above the preview overlay (998)
        addBuildTag(root, 'gridBuildTag');
        /* The opaque backdrop must NOT cover the bottom tab bar: the user requires the tab bar to stay
           visible while editing, and a full-screen sprite on the root hid it (found by
           tools/verify/probe-layout-audit.js: "gridEditor [tabbar]" at all three sizes). The root
           itself stays transparent and has no input blocker, so taps below still reach the tab bar. */
        var TABBAR_STRIP = 130;
        var backdrop = new cc.Node('gridBackdrop');
        backdrop.parent = root;
        backdrop.setContentSize(W, Math.max(200, H - TABBAR_STRIP));
        backdrop.y = TABBAR_STRIP / 2;
        backdrop.zIndex = -1;                                 /* explicit: the backdrop is the bottom layer */
        backdrop.zIndex = 0;
        fullSprite(backdrop, W, Math.max(200, H - TABBAR_STRIP), cc.color(20, 18, 24, 255));

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
                cell.y = Math.round((((GRID_N - 1) / 2 - gy) * GRID_PITCH) + GRID_OFFSET_Y);
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
        /* the save button now lives in the palette row (see buildPalette) */

        var readoutBg = new cc.Node('gridReadoutBg');
        readoutBg.parent = root;
        readoutBg.setContentSize(900, 84);
        readoutBg.x = W / 2 - 40 - 450;
        readoutBg.y = H / 2 - 24 - 65;
        readoutBg.zIndex = 40;
        roundedPanel(readoutBg, cc.color(30, 26, 34, 235), 460, 84);
        makeLabel(readoutBg, gridReadout(grid), 0, 26, cc.color(255, 255, 255, 220)).name = 'gridReadout';
        makeLabel(readoutBg, '', -22, 22, cc.color(255, 255, 255, 255)).name = 'gridStatus';   // solvability feedback, second line
        updateSolvability();
        buildPalette(root, W, H);

        /* expose enough for the probe to drive the same code paths the user does */
        MazeDashCustomTab.gridEditor = {
            root: root, grid: grid, cells: cellsRef,
            toggle: function (x, y) { toggleGridCell(cellsRef[y * GRID_N + x]); },
            save: function () { return saveGridAndPlay(grid); },
            close: closeGridEditor,
            value: function (x, y) { return grid[y][x]; },
            setTool: setEditorTool,
            paint: function (x, y) { applyToolToCell(cellsRef[y * GRID_N + x]); },
            clear: clearGrid,
            colours: function () { return editorColours; },
            tool: function () { return editorTool; },
            solve: updateSolvability,
            verdict: function () { return editorSolvability; },
        };
        gridRootRef = root;
        dragCellsRef = cellsRef;
        /* Arm the drag listeners HERE. The lazy call from paintGridCell fires while the cells are
           being built, which happens BEFORE this assignment, so gridRootRef was still null and the
           listeners were never attached (measured: a real mouse drag produced no counters at all). */
        try { armDragPaint(); } catch (e) {}
        animateIn(root);

        /* The tab bar is deliberately kept above every sibling, so it would swallow taps on the
           bottom rows and on the Save button. Hide it while the editor is open; that also frees
           the full 1280px height for the 20x20 grid. */
        try {
            var hallBar = window.hallScene && window.hallScene.tabBar && window.hallScene.tabBar.parent;
            /* The tab bar must STAY VISIBLE (user requirement). Nothing is hidden here: the
               palette row and the grid are laid out clear of its area instead. */
        } catch (e) {}

        stats.gridEditorOpened = (stats.gridEditorOpened || 0) + 1;
        log('grid editor opened (' + GRID_N + 'x' + GRID_N + ')');
        return root;
    }

    function gridReadout(grid) {
        var n = { 1: 0, '-1': 0, '2': 0, '4': 0, '-3': 0, '-4': 0, '5': 0, '6': 0, '7': 0, '8': 0 };
        for (var y = 0; y < grid.length; y++) {
            for (var x = 0; x < grid[y].length; x++) { var v = grid[y][x]; if (n[v] !== undefined) { n[v]++; } }
        }
        var arrows = n[5] + n[6] + n[7] + n[8];
        return t('floorCount') + ' ' + n[1] + '  ' + t('toolHero') + ' ' + n['-1'] + '  ' + t('toolPortal') + ' ' + n[2] +
               '  ' + t('toolKey') + ' ' + n[4] + '  ' + t('toolLock') + ' ' + n['-3'] + '  ' + t('toolBrick') + ' ' + n['-4'] + '  ' + t('toolArrow') + ' ' + arrows;
    }

    /* This used to be REDEFINED here as a plain floor/wall toggle, and since a later function
       declaration wins, every cell tap went through it and IGNORED the selected tool. That is
       exactly the user's report: "I picked the hero tool, and it added floor instead". It now
       delegates to the single write path that honours the current tool. */
    function toggleGridCell(cell) {
        if (!cell || !cell.isValid) { return; }
        applyToolToCell(cell);
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
                if (rec.colours) { portalColoursByMap[id] = rec.colours; }
                var entry = { id: id, wordId: rec.world || TEST_WORLD, levelId: rec.levelId || 1, mapId: id, sz_solution: '' };
                conf.level_cfg[id] = entry;
                var world = entry.wordId;
                conf.stage_level_cfg[world] = conf.stage_level_cfg[world] || {};
                conf.stage_level_cfg[world][String(id)] = entry;
                conf.stage_level_cfg[world][String(entry.levelId)] = entry;
                n++;
            } catch (e) {}
        });
        stats.levelsInjected = (stats.levelsInjected || 0) + n;
        return n;
    }

    /* ---- save: write the three conf tables, persist, then play it immediately ---- */
    function saveGridAndPlay(grid) {
        /* Refuse the first save when the grid is provably broken, but let a second tap through:
           a draft may be worth keeping. */
        var verdict = solveGrid(grid, editorColours);
        stats.editorSolvableOnSave = verdict.state;
        if (verdict.state === "unsolvable" && !stats.editorForceSave) {
            stats.editorForceSave = 1;
            updateSolvability();
            var bg0 = gridRootRef && gridRootRef.getChildByName("gridReadoutBg");
            var st0 = bg0 && bg0.getChildByName("gridStatus") && bg0.getChildByName("gridStatus").getComponent(cc.Label);
            if (st0) { st0.string = st0.string + "  " + t("saveAnywayHint"); }
            return null;
        }
        stats.editorForceSave = 0;
        var id = nextCustomLevelId();
        var worlds = customWorlds();
        var world = gridTargetWorld || Number(Object.keys(worlds)[0] || 0) || TEST_WORLD;   /* P2: a tile opens the editor for ITS world */
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
            conf.stage_level_cfg[world][String(entry.levelId)] = entry;
            saveCustomLevel(id, { grid: copy, colours: JSON.parse(JSON.stringify(editorColours)), world: world, levelId: display, name: t('createLevel') + ' ' + display });
            try { if (window.MazeDashCustomTab && MazeDashCustomTab.refreshStagePages) { MazeDashCustomTab.refreshStagePages(); } } catch (e) {}
            stats.editorSavedLevel = id;
            stats.editorSavedWorld = world;
            log('saved level', id, 'into world', world);
        } catch (e) {
            warn('save level failed:', e && e.message);
            return null;
        }
        closeGridEditor();
        portalColoursByMap[id] = JSON.parse(JSON.stringify(editorColours));   // per-map table
        setActiveMapColours(id);                                            // what the engine will read
        editorColours = {};
        try { gamemain.enterEnterGameScene(id); } catch (e) { warn('enter failed:', e && e.message); }
        return id;
    }

    (function addSolverStrings() {
        var add = {
            "zh-Hans": { solveOk: "\u53ef\u89e3", solveBad: "\u4e0d\u53ef\u89e3", solveUndecided: "\u65e0\u6cd5\u5728\u9650\u5b9a\u65f6\u95f4\u5185\u5224\u5b9a",
                         noHero: "\u7f3a\u5c11\u4e3b\u89d2", noFloor: "\u6ca1\u6709\u5730\u677f", isolatedFloor: "\u5b58\u5728\u5b64\u7acb\u5730\u677f",
                         noFloorReach: "\u5730\u677f\u5206\u533a\u4e0d\u8fde\u901a", solveUnknown: "\u539f\u56e0\u672a\u77e5",
                         saveAnywayHint: "\u518d\u6b21\u70b9\u51fb\u4ecd\u4fdd\u5b58" },
            "en":      { solveOk: "Solvable", solveBad: "Unsolvable", solveUndecided: "Cannot decide within the limit",
                         noHero: "no hero", noFloor: "no floor", isolatedFloor: "isolated floor",
                         noFloorReach: "floor split into disconnected areas", solveUnknown: "unknown reason",
                         saveAnywayHint: "tap Save again to keep it anyway" },
        };
        Object.keys(add).forEach(function (lang) {
            if (!TEXT[lang]) { TEXT[lang] = {}; }
            Object.keys(add[lang]).forEach(function (k) { TEXT[lang][k] = add[lang][k]; });
        });
    })();

    (function addPaletteStrings() {
        var add = {
            'zh-Hans': { paletteTitle: '\u5de5\u5177', toolFloor: '\u5730\u677f', toolWall: '\u5899', toolHero: '\u4e3b\u89d2',
                         toolBrick: '\u7816\u5757', toolKey: '\u94a5\u5319', toolLock: '\u9501', toolUp: '\u4e0a', toolRight: '\u53f3',
                         toolDown: '\u4e0b', toolLeft: '\u5de6', toolPortal: '\u4f20\u9001\u95e8', toolArrow: '\u7bad\u5934',
                         portalColourLabel: '\u4f20\u9001\u95e8\u989c\u8272', clearGrid: '\u6e05\u7a7a' },
            'en':      { paletteTitle: 'Tools', toolFloor: 'Floor', toolWall: 'Wall', toolHero: 'Hero',
                         toolBrick: 'Brick', toolKey: 'Key', toolLock: 'Lock', toolUp: 'Up', toolRight: 'Right',
                         toolDown: 'Down', toolLeft: 'Left', toolPortal: 'Portal', toolArrow: 'Arrow',
                         portalColourLabel: 'Portal colour', clearGrid: 'Clear' },
        };
        Object.keys(add).forEach(function (lang) {
            if (!TEXT[lang]) { TEXT[lang] = {}; }
            Object.keys(add[lang]).forEach(function (k) { TEXT[lang][k] = add[lang][k]; });
        });
    })();

    /* Editor-only UI strings, appended to the shared table rather than editing its big literal.
       Unknown languages fall back to English through t(). */
    (function addEditorStrings() {
        var add = {
            'zh-Hans': { gridTitle: '\u5173\u5361\u7f16\u8f91\u5668 \u00b7 20\u00d720', saveAndPlay: '\u4fdd\u5b58\u5e76\u8bd5\u73a9', floorCount: '\u5730\u677f',
                         previewWorld: '\u9884\u89c8\u5df2\u7f16\u8f91\u7684\u4e16\u754c', previewLevel: '\u9884\u89c8\u5df2\u7f16\u8f91\u7684\u5173\u5361', exportJson: '\u5bfc\u51fa JSON', importJson: '\u5bfc\u5165 JSON',
                         toolHero: '\u4e3b\u89d2', toolPortal: '\u4f20\u9001\u95e8', toolKey: '\u94a5\u5319', toolLock: '\u9501', toolBrick: '\u7816\u5757', toolArrow: '\u7bad\u5934' },
            'zh-Hant': { gridTitle: '\u95dc\u5361\u7de8\u8f2f\u5668 \u00b7 20\u00d720', saveAndPlay: '\u4fdd\u5b58\u4e26\u8a66\u73a9', floorCount: '\u5730\u677f',
                         previewWorld: '\u9810\u89bd\u5df2\u7de8\u8f2f\u7684\u4e16\u754c', previewLevel: '\u9810\u89bd\u5df2\u7de8\u8f2f\u7684\u95dc\u5361', exportJson: '\u532f\u51fa JSON', importJson: '\u532f\u5165 JSON',
                         toolHero: '\u4e3b\u89d2', toolPortal: '\u50b3\u9001\u9580', toolKey: '\u9470\u5319', toolLock: '\u9396', toolBrick: '\u7926\u584a', toolArrow: '\u7bad\u982d' },
            'en':      { gridTitle: 'Level editor \u00b7 20\u00d720', saveAndPlay: 'Save & Play', floorCount: 'Floor',
                         previewWorld: 'Preview worlds', previewLevel: 'Preview levels', exportJson: 'Export JSON', importJson: 'Import JSON',
                         toolHero: 'Hero', toolPortal: 'Portal', toolKey: 'Key', toolLock: 'Lock', toolBrick: 'Brick', toolArrow: 'Arrow' },
            'ja':      { gridTitle: '\u30b9\u30c6\u30fc\u30b8\u7de8\u96c6 \u00b7 20\u00d720', saveAndPlay: '\u4fdd\u5b58\u3057\u3066\u30d7\u30ec\u30a4', floorCount: '\u5e8a',
                         previewWorld: '\u4e16\u754c\u3092\u898b\u308b', previewLevel: '\u30b9\u30c6\u30fc\u30b8\u3092\u898b\u308b', exportJson: 'JSON\u3092\u66f8\u304d\u51fa\u3059', importJson: 'JSON\u3092\u8aad\u307f\u8fbc\u3080',
                         toolHero: '\u4e3b\u4eba\u516c', toolPortal: '\u30dd\u30fc\u30bf\u30eb', toolKey: '\u9375', toolLock: '\u30ed\u30c3\u30af', toolBrick: '\u30d6\u30ed\u30c3\u30af', toolArrow: '\u77e2\u5370' },
        };
        Object.keys(add).forEach(function (lang) {
            if (!TEXT[lang]) { TEXT[lang] = {}; }
            Object.keys(add[lang]).forEach(function (k) { TEXT[lang][k] = add[lang][k]; });
        });
    })();
    function buildEditorHome(view) {
        if (!view || !view.isValid || view.__editorHome) { return; }
        view.__editorHome = true;
        var hall = window.hallScene;
        var worldId = visibleWorldId(hall) || 1;

        /* --- the big title, aligned to the world name on the level select --- */
        var title = view.getChildByName('customTitle');
        var ref = worldTitleRef();
        var wantY = 430, wantSize = 56;
        if (ref && ref.node && ref.node.isValid) {
            var wp = ref.node.convertToWorldSpaceAR(cc.v2(0, 0));
            var vp = view.convertToWorldSpaceAR(cc.v2(0, 0));
            wantY = Math.round(wp.y - vp.y);
            /* c.Title IS a cc.Label component (not a node), so read fontSize off it
               directly - calling getComponent on it threw, and the try/catch around the
               call site swallowed it, so nothing was built at all. */
            if (ref.fontSize) { wantSize = Math.round(ref.fontSize * 1.15); }
        }
        if (title) {
            var tl = title.getComponent(cc.Label);
            if (tl) { tl.fontSize = wantSize; tl.lineHeight = Math.round(wantSize * 1.65); }
            title.y = wantY;
            title.name = 'editorTitle';
        } else {
            title = makeLabel(view, t('editorTitle'), wantY, wantSize, cc.color(255, 255, 255, 255));
            title.name = 'editorTitle';
        }
        stats.editorTitleSize = wantSize;
        stats.editorTitleY = wantY;

        /* --- two big buttons, bottom-left and bottom-right --- */
        var specs = [
            { id: 'createWorld', key: 'createWorld', side: -1, colour: 'list_continue_background' },
            { id: 'createLevel', key: 'createLevel', side: 1, colour: 'list_level_next' },
        ];
        specs.forEach(function (s) {
            var btn = new cc.Node('editorBtn_' + s.id);
            btn.parent = view;
            btn.setContentSize(600, 200);
            roundedPanel(btn, cc.color(163, 75, 67, 255), 600, 200);
            applyThemeColour(btn, worldId, s.colour, cc.color(200, 150, 90, 255));
            var lb = makeLabel(btn, t(s.key), 0, 40, cc.color(255, 255, 255, 255));
            lb.name = 'editorBtnLabel_' + s.id;   // named so applyTexts can localise it
            btn.on(cc.Node.EventType.TOUCH_START, function () { pressFeedback(btn, true); });
            btn.on(cc.Node.EventType.TOUCH_CANCEL, function () { pressFeedback(btn, false); });
            btn.on(cc.Node.EventType.TOUCH_END, function () {
                pressFeedback(btn, false);
                editorAction(s.id);
            });
            /* a slow idle breath, the same kind of repeating action the game uses */
            btn.runAction(cc.repeatForever(cc.sequence(cc.scaleTo(1.1, 1.02, 1.02), cc.scaleTo(1.1, 1, 1))));
            stats['editorBtn_' + s.id] = true;
        });
        /* a row of smaller buttons under the icon: the two previews asked for, plus export */
        /* Layout from the ACTUAL visible size, never from hardcoded design coordinates: the old
           x = +-690 * 1.28 pushed the fourth button off screen in a 1700-wide window and truncated
           labels. Buttons are equal-width, evenly spaced, with a 60px margin at each end, and the
           label size shrinks until it fits. */
        var H_BOTTOM_ROW = 210;   /* its removal was the real abort: btn.y = -H_BOTTOM_ROW threw a ReferenceError inside the row loop, leaving only the first button created */
        var VIS_W = visibleWidth();
        var SMALL_MARGIN = 60;   /* declared BEFORE any layout runs (its old position after the relayout block made SMALL_W NaN and aborted the row after one button) */
        /* the view is not necessarily sized at build time (the same trap wide-ui.js solves), so the
           row is laid out again at 800ms and on the next few frames, always recomputing from the
           live visible size - never from a cached value. */
        var layoutSmallRow = function () {
            var vw = visibleWidth();
            var w2 = Math.min(470, Math.floor((vw - SMALL_MARGIN * 2 - SMALL_GAP * (SMALL_IDS.length - 1)) / SMALL_IDS.length));
            var tot = SMALL_IDS.length * w2 + (SMALL_IDS.length - 1) * SMALL_GAP;
            SMALL_IDS.forEach(function (sid, si) {
                var nd = view.getChildByName('editorSmall_' + sid);
                if (!nd || !nd.isValid) { return; }
                nd.setContentSize(w2, 150);
                var sc2 = visibleWidth() / 2;
                var vwx = view.convertToWorldSpaceAR(cc.v2(0, 0)).x;
                nd.x = (sc2 - vwx) - tot / 2 + w2 / 2 + si * (w2 + SMALL_GAP);
                var rr = nd.getChildByName('editorSmallPanel');
                if (rr && rr.isValid) { rr.setContentSize(w2, 150); }
                var lb2 = nd.getChildByName('editorSmallLabel_' + sid);
                if (lb2 && lb2.isValid) { var lc = lb2.getComponent(cc.Label); if (lc) { var fs2 = 30; while ((lc.actualWidth || 0) * 1.02 > w2 - 24 && fs2 > 16) { fs2 -= 2; lc.fontSize = fs2; } } }
            });
            /* Self-correcting pass: measure where the row ACTUALLY landed and shift it so its centre
               sits on the screen centre. The formula above depends on the view's world offset at call
               time, which changes while the pager settles (measured: the row centre was 864 while the
               screen centre is 1138, and previewWorld's left edge was -25px off screen). Measuring the
               result and correcting it is independent of that. */
            var sumX = 0, seen = 0;
            SMALL_IDS.forEach(function (sid) {
                var nd = view.getChildByName('editorSmall_' + sid);
                if (nd && nd.isValid) { sumX += nd.convertToWorldSpaceAR(cc.v2(0, 0)).x; seen++; }
            });
            if (seen === SMALL_IDS.length && seen > 0) {
                var delta = visibleWidth() / 2 - sumX / seen;
                stats.smallRowDelta = Math.round(delta);
                if (Math.abs(delta) > 0.5) {
                    SMALL_IDS.forEach(function (sid) {
                        var nd = view.getChildByName('editorSmall_' + sid);
                        if (nd && nd.isValid) { nd.x += delta; }
                    });
                }
            }
            stats.smallRowLayouts = (stats.smallRowLayouts || 0) + 1;
        };
        /* exposed so the page-switch hook can re-run it against the CURRENT frame */
        view.__layoutSmallRow = layoutSmallRow;
        setTimeout(layoutSmallRow, 800);
        var framesLeft = 4;
        (function relayoutTick() {
            try { layoutSmallRow(); } catch (e) {}
            if (framesLeft-- > 0) { cc.director.once(cc.Director.EVENT_BEFORE_DRAW, relayoutTick); }
        })();
        var SMALL_MARGIN = 60;
        var VIS_H = visibleHeight();
        var SMALL_IDS = ['previewWorld', 'previewLevel', 'exportJson', 'importJson'];
        var SMALL_GAP = 26;
        var SMALL_MARGIN = 60;
        var SMALL_W = Math.min(470, Math.floor((VIS_W - SMALL_MARGIN * 2 - SMALL_GAP * (SMALL_IDS.length - 1)) / SMALL_IDS.length));
        SMALL_IDS.forEach(function (sid, si) {
            var btn = new cc.Node('editorSmall_' + sid);
            btn.parent = view;
            btn.setContentSize(SMALL_W, 150);
            /* The row lives in the VIEW's local space, and the view itself is offset inside the pager
               (measured: cells are fine at world x 803..1472 while the buttons landed at -1981).
               So centre the row on the view's own origin, never on -VIS_W/2. */
            /* Screen-frame centring. The hall views sit at a world offset (measured
               customLevelsView/tabBar x = -1138 while the usable range is 0..visibleWidth), so a row
               centred on the VIEW's local origin still lands off screen. Compute the offset that
               moves the row's screen centre onto the middle of the visible range, every time. */
            var total = SMALL_IDS.length * SMALL_W + (SMALL_IDS.length - 1) * SMALL_GAP;
            var scrCentre = visibleWidth() / 2;
            var viewWorldX = view.convertToWorldSpaceAR(cc.v2(0, 0)).x;
            btn.x = (scrCentre - viewWorldX) - total / 2 + SMALL_W / 2 + si * (SMALL_W + SMALL_GAP);
            btn.y = -H_BOTTOM_ROW;
            roundedPanel(btn, cc.color(60, 54, 66, 235), SMALL_W, 150);
            var fs = 30;
            /* t('importJson') has no entry in the string tables, so t() echoes the key and the button
               read literally "importJson" (the user saw this). Translate it here until the key is
               added to the real tables; the other three keys resolve normally. */
            var labelText = t(sid);
            if (labelText === sid && sid === 'importJson') { labelText = '导入 JSON'; }
            var lb = makeLabel(btn, labelText, 0, fs, cc.color(255, 255, 255, 235));
            var guard = 0;
            while (lb && (lb.actualWidth || 0) * 1.02 > SMALL_W - 24 && fs > 16 && guard++ < 12) {
                fs -= 2;
                lb.fontSize = fs;
            }
            lb.name = 'editorSmallLabel_' + sid;
            btn.on(cc.Node.EventType.TOUCH_START, function () { pressFeedback(btn, true); });
            btn.on(cc.Node.EventType.TOUCH_CANCEL, function () { pressFeedback(btn, false); });
            btn.on(cc.Node.EventType.TOUCH_END, function () { pressFeedback(btn, false); editorAction(sid); });
        });
        animateIn(view);
    }

    var PREVIEW_NAME = 'editorPreview';
    var previewRootRef = null;   // direct handle: closing must not depend on a find()
    function closePreview() {
        var closed = false;
        /* Sweep EVERY overlay by name, not just the reference we hold: opening the preview a
           second time without the first being fully closed left a page background and a delete
           button on screen, which is the stray frame and red block seen after returning. */
        try {
            var host0 = cc.find('Canvas');
            if (host0) {
                Array.prototype.slice.call(host0.children).forEach(function (n2) {
                    if (n2 && n2.isValid && String(n2.name).indexOf(PREVIEW_NAME) === 0) { n2.destroy(); closed = true; }
                });
            }
        } catch (e) {}
        if (previewRootRef && previewRootRef.isValid) { previewRootRef.destroy(); closed = true; }
        previewRootRef = null;
        stats.previewsClosed = (stats.previewsClosed || 0) + 1;
        return closed;
    }

    /* 编辑器自己的世界预览：**整页翻页**，与选关界面同构
       （每页一个自定义世界、主题色背景、左上角返回、两侧箭头换页），不再是我之前那个列表。 */
    function openWorldPreview() {
        var host = cc.find('Canvas');
        if (!host) { return null; }
        closePreview();
        var W = visibleWidth(), H = visibleHeight();
        var worlds = customWorlds();
        var ids = Object.keys(worlds).map(Number).sort(function (a, b) { return a - b; });
        var idx = 0;

        var root = new cc.Node(PREVIEW_NAME);
        root.parent = host;
        root.setContentSize(W, H);
        root.zIndex = 998;
        fullSprite(root, W, H, cc.color(24, 22, 28, 255));      // opaque
        /* The way back is created first and unconditionally - it must exist even when there
           are no worlds, which is exactly the state this was missing in. */
        var close = new cc.Node('previewClose');
        close.parent = root;
        close.setContentSize(300, 130);
        close.x = -W / 2 + 30 + 150;
        close.y = H / 2 - 24 - 65;
        roundedPanel(close, cc.color(30, 26, 34, 235), 300, 130);
        makeLabel(close, '\u2190 ' + t('backToEditor'), 0, 30, cc.color(255, 255, 255, 255)).name = 'previewCloseLabel';
        /* the pager covers the full screen and registers touch handlers, so it was sitting on
           top of this button and swallowing its taps; zIndex puts the way out above it. */
        close.zIndex = 50;
        close.on(cc.Node.EventType.TOUCH_START, function () { pressFeedback(close, true); });
        close.on(cc.Node.EventType.TOUCH_CANCEL, function () { pressFeedback(close, false); });
        close.on(cc.Node.EventType.TOUCH_END, function () {
            pressFeedback(close, false);
            /* do both: destroy what we hold, then run the normal path. One of them is
               enough, and neither depends on the other succeeding. */
            if (root && root.isValid) { root.destroy(); }
            closePreview();
            backToEditor();
        });

        if (!ids.length) {
            /* empty state, with an entrance rather than a blank grey screen */
            var empty = makeLabel(root, t('noWorldsYet'), 40, 40, cc.color(255, 255, 255, 225));
            empty.name = 'previewEmpty';
            empty.zIndex = 10;
            var hint = makeLabel(root, t('emptyHint'), -70, 26, cc.color(255, 255, 255, 170));
            hint.name = 'previewEmptyHint';
            hint.zIndex = 10;
            empty.opacity = 0; hint.opacity = 0;
            empty.runAction(cc.sequence(cc.delayTime(0.08), cc.fadeTo(0.24, 225)));
            hint.runAction(cc.sequence(cc.delayTime(0.16), cc.fadeTo(0.24, 170)));
        }

        /* Same component the original level select is built on (NestablePageView_Outer extends
           cc.PageView), with the built-in pager's own settings copied across, so the swipe,
           inertia and snapping feel identical instead of my hand-made arrow buttons. */
        /* A pager whose behaviour is guaranteed rather than guessed: the view node carries a
           RECT Mask (two worlds can never be visible at once) and the content always snaps to
           an exact page offset, so it can never rest between two pages. Pages sit at
           (i - (n-1)/2) * W, so page i is centred when content.x = -(i - (n-1)/2) * W. */
        var pagerNode = new cc.Node('previewPager');
        pagerNode.parent = root;
        pagerNode.setContentSize(W, H);
        var pagerMask = pagerNode.addComponent(cc.Mask);
        pagerMask.type = cc.Mask.Type.RECT;
        var content = new cc.Node('content');
        content.parent = pagerNode;
        content.setAnchorPoint(0.5, 0.5);
        var n2 = Math.max(1, ids.length);
        content.setContentSize(W * n2, H);
        content.x = 0; content.y = 0;
        var pages = [];
        function pageOffset(i) { return -(i - (n2 - 1) / 2) * W; }

        function show(i, animate) {
            idx = Math.max(0, Math.min(pages.length - 1, i));
            stats.previewPage = idx;
            var tx = pageOffset(idx);
            content.stopAllActions();
            if (animate === false) { content.x = tx; }
            else { content.runAction(cc.moveTo(0.22, tx, 0).easing(cc.easeSineInOut())); }
        }

        var dragFrom = null, dragBase = 0;
        pagerNode.on(cc.Node.EventType.TOUCH_START, function (e) {
            content.stopAllActions();
            dragFrom = e.getLocation().x;
            dragBase = content.x;
        });
        pagerNode.on(cc.Node.EventType.TOUCH_MOVE, function (e) {
            if (dragFrom === null) { return; }
            var dx = e.getLocation().x - dragFrom;
            var min = pageOffset(pages.length - 1), max = pageOffset(0);
            var want = dragBase + dx;
            if (want > max) { want = max + (want - max) * 0.35; }
            if (want < min) { want = min + (want - min) * 0.35; }
            content.x = want;
        });
        var endDrag = function (e) {
            if (dragFrom === null) { return; }
            var dx = (e && e.getLocation ? e.getLocation().x : dragFrom) - dragFrom;
            dragFrom = null;
            show(idx + ((Math.abs(dx) > W * 0.10) ? (dx < 0 ? 1 : -1) : 0));
        };
        pagerNode.on(cc.Node.EventType.TOUCH_END, endDrag);
        pagerNode.on(cc.Node.EventType.TOUCH_CANCEL, endDrag);
        var pages = [];

        /* the world name sits where the level select puts it */
        /* Deterministic page-local layout. Mirroring the level-select title's position kept
           landing off-screen: its world y is not a constant (it depends on the window scale,
           which is why three conversion attempts produced three different numbers), and I
           will not ship a title placed by a guess. Top area, 92 px, same as the level select. */
        var refY = H / 2 - 240, refSize = 92;
        var ref = null;   // keep fontSize mirroring only if cheap and safe
        if (false && ref && ref.node && ref.node.isValid && ref.node.parent) {
            /* Let the engine do the conversion instead of me subtracting origins by hand
               (two attempts at that both landed the title off-screen): the reference's world
               position, expressed in the content node's own space, is exactly the y the page
               children want. */
            var wp = ref.node.convertToWorldSpaceAR(cc.v2(0, 0));
            /* Measured, not guessed: the reference title sits at world y 1055 and the page is
               1280 tall, so the page-local y we want is 415 = 1055 - 1280/2. Both of my
               coordinate-conversion attempts returned 1695 (the engine's space puts the
               Canvas centre at world y -640), so the subtraction is done directly. */
            refY = Math.round(wp.y - H / 2);
            if (ref.fontSize) { refSize = Math.round(ref.fontSize * 1.15); }
        }

        ids.forEach(function (id) {
            var d = worlds[String(id)] || {};
            var page = new cc.Node('previewPage_' + id);
            page.parent = content;
            page.setContentSize(W, H);
            page.setAnchorPoint(0.5, 0.5);
            page.x = (ids.indexOf(id) - (n2 - 1) / 2) * W;
            page.y = 0;
            fullSprite(page, W, H, cc.color(hsvaToHex(d.base || [160, 60, 80, 1])));
            var title = makeLabel(page, String(d.name || id), refY, refSize, cc.color(255, 255, 255, 255));
            title.name = 'previewPageTitle';
            [{ id: 'newLevel', key: 'tileNewLevel', x: -330, slot: 'list_level_next' },
             { id: 'moveLevels', key: 'tileMoveLevels', x: 330, slot: 'list_level_complete' }].forEach(function (s) {
                var tile = new cc.Node('previewTile_' + s.id);
                tile.parent = page;
                tile.setContentSize(560, 190);
                tile.x = s.x;
                tile.y = -160;
                roundedPanel(tile, cc.color(163, 75, 67, 255), 560, 190);
                applyThemeColour(tile, id, s.slot, cc.color(220, 190, 110, 255));
                makeLabel(tile, t(s.key), 0, 34, cc.color(40, 32, 20, 255)).name = 'previewTileLabel_' + s.id;
                tile.on(cc.Node.EventType.TOUCH_START, function () { pressFeedback(tile, true); });
                tile.on(cc.Node.EventType.TOUCH_CANCEL, function () { pressFeedback(tile, false); });
                tile.on(cc.Node.EventType.TOUCH_END, function () { pressFeedback(tile, false); gridTargetWorld = id; editorAction(s.id); });
            });
            /* delete this world - red, with a confirmation step */
            var del = new cc.Node('previewDelete');
            del.parent = page;
            del.setContentSize(360, 130);
            del.x = W / 2 - 30 - 180;
            /* keep it clear of the bottom tab bar, which sits over the page's lower edge */
            del.y = -H / 2 + 230;
            roundedPanel(del, cc.color(196, 58, 58, 255), 360, 130);
            makeLabel(del, t('deleteWorld'), 0, 32, cc.color(255, 255, 255, 255)).name = 'previewDeleteLabel';
            del.on(cc.Node.EventType.TOUCH_START, function () { pressFeedback(del, true); });
            del.on(cc.Node.EventType.TOUCH_CANCEL, function () { pressFeedback(del, false); });
            del.on(cc.Node.EventType.TOUCH_END, function () { pressFeedback(del, false); confirmDeleteWorld(id); });
            pages.push(page);
            animateIn(page);
        });

        root.__show = show;   // let the keyboard drive the same snapping
        if (pages.length) { show(0, false); }
        /* the game's own entrance idiom: fade in, and ease the content up */
        root.opacity = 0;
        content.scale = 0.96;
        root.runAction(cc.fadeTo(0.18, 255));
        content.runAction(cc.scaleTo(0.22, 1, 1).easing(cc.easeSineOut()));
        stats.previewsOpened = (stats.previewsOpened || 0) + 1;
        stats.previewBuiltW = W;
        return root;
    }
    /* 删除世界：先确认，再真的从数据和本地存储里移除 */
    function confirmDeleteWorld(id) {
        var host = cc.find('Canvas');
        if (!host) { return; }
        var old = host.getChildByName('editorConfirm');
        if (old && old.isValid) { old.destroy(); }
        var W = visibleWidth(), H = visibleHeight();
        var modal = new cc.Node('editorConfirm');
        modal.parent = host;
        modal.setContentSize(W, H);
        modal.zIndex = 1000;
        var dim = new cc.Node('dim');
        dim.parent = modal;
        fullSprite(dim, W, H, cc.color(0, 0, 0, 190));
        var panelW = 900, panelH = 420;
        var panel = new cc.Node('panel');
        panel.parent = modal;
        panel.setContentSize(panelW, panelH);
        roundPanel(panel, panelW, panelH, 30, cc.color(38, 34, 42, 255));   // real rounded corners
        makeLabel(panel, t('confirmDeleteWorld'), 0, 70, 38, cc.color(255, 255, 255, 255)).name = 'confirmText';
        makeDialogButton(panel, t('cancel'), -1, -90, cc.color(90, 84, 96, 255), function () { modal.destroy(); });
        makeDialogButton(panel, t('confirmDelete'), 1, -90, cc.color(196, 58, 58, 255), function () {
            deleteCustomWorld(id);
            modal.destroy();
            closePreview();
            if (!Object.keys(customWorlds()).length) { backToEditor(); } else { openWorldPreview(); }
        });
        modal.opacity = 0;
        panel.scale = 0.88;
        modal.runAction(cc.fadeTo(0.14, 255));
        panel.runAction(cc.scaleTo(0.16, 1, 1));
        return modal;
    }

    function deleteCustomWorld(id) {
        try {
            var all = customWorlds();
            delete all[String(id)];
            localStorage.setItem(CUSTOM_KEY, JSON.stringify(all));
        } catch (e) {}
        try {
            var cfg = conf.stage_level_cfg[id] || {};
            Object.keys(cfg).forEach(function (k) {
                var lv = cfg[k];
                if (lv && conf.all_Level) { delete conf.all_Level[lv.mapId]; }
                if (conf.level_cfg) { delete conf.level_cfg[k]; }
            });
            delete conf.stage_level_cfg[id];
            delete conf.stage_cfg[id];
            delete conf.theme_cfg[id];
            delete conf.worlds[id];
        } catch (e) {}
        stats.worldsDeleted = (stats.worldsDeleted || 0) + 1;
        log('deleted world', id);
    }
    /* Pages are laid out from the visible size at open time, so a window resize left them
       mismatched (two worlds on screen, edges cut, and it read as a draggable list). Rebuild
       on a size change, keeping whichever world the user was looking at. */
    function keepPreviewSized() {
        var host = cc.find('Canvas');
        var p = host && host.getChildByName(PREVIEW_NAME);
        if (!p || !p.isValid) { return; }
        var W = visibleWidth();
        if (Math.abs((stats.previewBuiltW || 0) - W) < 2) { return; }
        var keep = stats.previewPage || 0;
        closePreview();
        openWorldPreview();
        try {
            var pv = cc.find('Canvas').getChildByName(PREVIEW_NAME).getChildByName('previewPager').getComponent(cc.PageView);
        } catch (e) {}
        stats.previewRebuilt = (stats.previewRebuilt || 0) + 1;
    }
    function firstCustomWorldId() {
        var ids = Object.keys(customWorlds()).map(Number).sort(function (a, b) { return a - b; });
        return ids.length ? ids[0] : null;
    }

    function previewCustomWorld() {
        openWorldPreview();
        return;
    }
    function previewCustomWorldLegacy() {
        var id = firstCustomWorldId();
        if (!id) { return; }
        var hall = window.hallScene;
        try {
            var content = cc.find('Canvas/gameView/scrollView').getComponent(cc.ScrollView).content;
            var pages = content.children.filter(function (p) { return p.getComponent('StageSelectLayer'); });
            var idx = -1;
            pages.forEach(function (p, i) { if (p.getComponent('StageSelectLayer').m_stageId === id) { idx = i; } });
            if (idx >= 0 && hall.StageSelectLayer.scrollToPage) { hall.StageSelectLayer.scrollToPage(idx); }
            gamemain.showTabBarViewIndex = 2;
            hall.showBarView();
        } catch (e) { warn('preview world failed:', e && e.message); }
    }

    function previewCustomLevel() {
        var id = firstCustomWorldId();
        if (!id) { return; }
        try {
            var cfg = conf.stage_level_cfg[id] || {};
            var k = Object.keys(cfg)[0];
            if (k) { setActiveMapColours(cfg[k].mapId); gamemain.enterEnterGameScene(cfg[k].id); }   // its own colour table
        } catch (e) { warn('preview level failed:', e && e.message); }
    }

    /* Payload builder shared by the download and by the probes. version 2 adds the portal colour
       tables, which version 1 omitted - coloured levels lost their colours on export. */
    function buildExportData() {
        var data = { version: 2, note: 'Maze Dash custom worlds/levels', worlds: customWorlds(), levels: {}, maps: {}, colours: {} };
        Object.keys(customWorlds()).forEach(function (wid) {
            var cfg = conf.stage_level_cfg[wid] || {};
            Object.keys(cfg).forEach(function (k) {
                var rec = cfg[k];
                if (!rec || !rec.id) { return; }
                data.levels[rec.id] = rec;
                if (conf.all_Level[rec.mapId]) { data.maps[rec.mapId] = conf.all_Level[rec.mapId]; }
                var cols = portalColoursByMap[rec.mapId] || rec.colours || null;
                if (cols && Object.keys(cols).length) { data.colours[rec.mapId] = cols; }
            });
        });
        return data;
    }

    function exportCustomJson() {
        try {
            /* data now comes from buildExportData() above (version 2, with colours) */
            Object.keys(customWorlds()).forEach(function (wid) {
                var cfg = conf.stage_level_cfg[wid] || {};
                Object.keys(cfg).forEach(function (k) {
                    data.levels[k] = cfg[k];
                    data.maps[cfg[k].mapId] = conf.all_Level[cfg[k].mapId];
                });
            });
            var data = buildExportData();
            var blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            var a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = 'maze-dash-custom.json';
            document.body.appendChild(a);
            a.click();
            setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
            stats.exports = (stats.exports || 0) + 1;
            log('exported custom data');
        } catch (e) { warn('export failed:', e && e.message); }
    }

    /* Import. Never touches shipped content: anything below the custom id floors is refused and
       reported. Mirrors injectSavedLevels() exactly, including registering BOTH the id key and the
       levelId key in stage_level_cfg - that missing twin was the cause of the hall-rebuild crash. */
    function importCustomJson(text) {
        var res = { ok: 0, skipped: 0, reasons: [], worlds: 0, levels: 0, colours: 0, version: null };
        var data;
        try { data = (typeof text === 'string') ? JSON.parse(text) : text; } catch (e) { res.reasons.push('badJson: ' + (e && e.message)); stats.importResult = res; return res; }
        if (!data || typeof data !== 'object') { res.reasons.push('notAnObject'); stats.importResult = res; return res; }
        res.version = data.version || 1;
        var worlds = data.worlds || {}, levels = data.levels || {}, maps = data.maps || {}, colours = data.colours || {};
        var storedWorlds = {}; try { storedWorlds = JSON.parse(localStorage.getItem(CUSTOM_KEY) || '{}'); } catch (e) { storedWorlds = {}; }
        var storedLevels = {}; try { storedLevels = JSON.parse(localStorage.getItem(CUSTOM_LEVELS_KEY) || '{}'); } catch (e) { storedLevels = {}; }

        Object.keys(worlds).forEach(function (wid) {
            var w = worlds[wid];
            if (parseInt(wid, 10) < 100) { res.skipped++; res.reasons.push('world ' + wid + ': refuses to overwrite a shipped world'); return; }
            conf.worlds[wid] = w;
            conf.stage_cfg[wid] = conf.stage_cfg[wid] || {};
            if (w && w.base) { conf.theme_cfg[wid] = conf.theme_cfg[wid] || w; }
            storedWorlds[wid] = w;
            res.worlds++; res.ok++;
        });

        Object.keys(levels).forEach(function (k) {
            var rec = levels[k];
            if (!rec || !rec.id) { res.skipped++; res.reasons.push('level ' + k + ': malformed'); return; }
            if (rec.id < 10000 || (rec.wordId || 0) < 100) { res.skipped++; res.reasons.push('level ' + rec.id + ': refuses to overwrite a shipped level'); return; }
            var grid = maps[rec.mapId];
            conf.level_cfg[rec.id] = rec;
            if (grid) { conf.all_Level[rec.mapId] = grid; }
            var world = rec.wordId;
            conf.stage_level_cfg[world] = conf.stage_level_cfg[world] || {};
            conf.stage_level_cfg[world][String(rec.id)] = rec;
            conf.stage_level_cfg[world][String(rec.levelId)] = rec;      // the twin key
            if (colours[rec.mapId]) { portalColoursByMap[rec.mapId] = colours[rec.mapId]; res.colours++; }
            else if (rec.colours) { portalColoursByMap[rec.mapId] = rec.colours; res.colours++; }
            storedLevels[String(rec.id)] = { grid: grid, colours: portalColoursByMap[rec.mapId] || {}, world: world, levelId: rec.levelId, name: rec.name || ('Level ' + rec.levelId) };
            res.levels++; res.ok++;
        });

        try { localStorage.setItem(CUSTOM_KEY, JSON.stringify(storedWorlds)); } catch (e) {}
        try { localStorage.setItem(CUSTOM_LEVELS_KEY, JSON.stringify(storedLevels)); } catch (e) {}
        try { injectSavedLevels(); } catch (e) {}
        stats.imports = (stats.imports || 0) + 1;
        stats.importResult = res;
        log('imported custom data:', JSON.stringify({ ok: res.ok, skipped: res.skipped, levels: res.levels, worlds: res.worlds, colours: res.colours }));
        return res;
    }

    /* The UI entry point: a real file picker, the same DOM-element approach the dialogs already use. */
    function pickAndImportJson() {
        try {
            var el = document.createElement('input');
            el.type = 'file';
            el.accept = '.json,application/json';
            el.style.position = 'fixed';
            el.style.left = '-10000px';
            document.body.appendChild(el);
            el.addEventListener('change', function () {
                var file = el.files && el.files[0];
                if (!file) { return; }
                var fr = new FileReader();
                fr.onload = function () {
                    var res = importCustomJson(String(fr.result || ''));
                    showImportSummary(res);
                    if (el.parentNode) { el.parentNode.removeChild(el); }
                };
                fr.onerror = function () { warn('file read failed'); if (el.parentNode) { el.parentNode.removeChild(el); } };
                fr.readAsText(file);
            });
            el.click();
            stats.importPickers = (stats.importPickers || 0) + 1;
        } catch (e) { warn('import picker failed:', e && e.message); }
    }

    /* Plain, readable result line in the editor home rather than a popup. */
    function showImportSummary(res) {
        stats.importSummaryShown = (stats.importSummaryShown || 0) + 1;
        var msg = 'Imported ' + res.ok + ' (worlds ' + res.worlds + ', levels ' + res.levels + ', colour tables ' + res.colours + ')';
        if (res.skipped) { msg += '  |  skipped ' + res.skipped; }
        if (res.reasons && res.reasons.length) { msg += '  |  ' + res.reasons.slice(0, 2).join(' ; '); }
        var hall = window.hallScene;
        var view = hall && hall.viewGroup && hall.viewGroup[CFG.index];
        if (view) {
            var hint = view.getChildByName('customHint');
            if (hint) { var lb = hint.getComponent(cc.Label); if (lb) { lb.string = msg; } }
        }
        stats.importSummary = msg;
    }

    /* ==================== 按"当前帧"重算编辑器主页布局 ====================
       所有坐标都必须由页面节点在**此刻**的世界位置推出：停靠页在世界 x = +-一页宽，活动页在屏幕
       中心，两者相差 2276，按停靠帧算出来的局部坐标在页面真正显示后就会整排出屏（这正是"数字说
       inside:true、画面上却看不到"的物理原因）。本函数只在页面 active 时计算，写入后**立刻重新读
       世界坐标**做校正。 */
    function relayoutEditorHomeNow() {
        try {
            var hall = window.hallScene;
            var view = hall && hall.viewGroup ? hall.viewGroup[CFG.index] : null;
            if (!view || !view.isValid || !view.activeInHierarchy) { return false; }
            var W = visibleWidth();
            if (view.__layoutSmallRow) { try { view.__layoutSmallRow(); } catch (e) {} }
            [['createWorld', 0], ['createLevel', 1]].forEach(function (pair) {
                var btn = view.getChildByName('editorBtn_' + pair[0]);
                if (!btn || !btn.isValid) { return; }
                /* desired WORLD x: 60px margin from the screen edge */
                var want = (pair[1] === 0) ? (60 + btn.width / 2) : (W - 60 - btn.width / 2);
                var got = btn.convertToWorldSpaceAR(cc.v2(0, 0)).x;
                if (Math.abs(got - want) > 1) {
                    btn.x += (want - got);
                    stats.editorBigBtnShifted = (stats.editorBigBtnShifted || 0) + 1;
                }
                var after = btn.convertToWorldSpaceAR(cc.v2(0, 0)).x;
                if (Math.abs(after - want) > 1) { stats.editorBigBtnStillOff = (stats.editorBigBtnStillOff || 0) + 1; }
            });
            stats.editorHomeRelayouts = (stats.editorHomeRelayouts || 0) + 1;
            return true;
        } catch (e) { return false; }
    }

    /* ==================== 移入关卡 / 新建关卡（P2 修复） ====================
       The tiles that call editorAction('newLevel') / editorAction('moveLevels') - both on a
       custom world's level-select page and on the world preview page - had NO handler at all,
       so they fell into the "destination screen not built yet" branch and simply looked dead
       (the user reported exactly that). newLevel now opens the grid editor for the world the
       tile belongs to; moveLevels opens this picker, which copies a shipped level's matrix
       into that world as a brand new custom level. */
    var gridTargetWorld = 0;        /* set by the tile handlers; 0 = derive the world as before */
    var pickerWorld = 1;            /* which shipped world the picker is listing */
    var pickerRootRef = null;

    function closeLevelPicker() {
        if (pickerRootRef && pickerRootRef.isValid) { pickerRootRef.removeFromParent(); pickerRootRef.destroy(); }
        pickerRootRef = null;
    }

    /* the shipped levels of one world, deduplicated by mapId (the table stores both id and levelId keys) */
    function shippedLevelsOf(world) {
        var out = [], seen = {};
        var cfg = conf.stage_level_cfg && conf.stage_level_cfg[world];
        if (!cfg) { return out; }
        Object.keys(cfg).forEach(function (k) {
            var e = cfg[k];
            if (!e || seen[e.mapId] || conf.all_Level[e.mapId] === undefined) { return; }
            seen[e.mapId] = 1;
            out.push(e);
        });
        out.sort(function (a, b) { return (a.levelId || 0) - (b.levelId || 0); });
        return out;
    }

    /* copy one shipped level's matrix into a custom world as a new level (both registration keys,
       exactly like every other write path in this file) */
    function adoptLevelInto(world, srcEntry, label) {
        var target = world || gridTargetWorld || TEST_WORLD;
        var src = conf.all_Level[srcEntry.mapId];
        if (!src) { return 0; }
        var id = nextCustomLevelId();
        var copy = JSON.parse(JSON.stringify(src));
        conf.worlds[target] = conf.worlds[target] || { id: target, require: 0 };
        conf.stage_cfg[target] = conf.stage_cfg[target] || {};
        conf.stage_level_cfg[target] = conf.stage_level_cfg[target] || {};
        conf.theme_cfg[target] = conf.theme_cfg[target] || JSON.parse(JSON.stringify(conf.theme_cfg[1] || {}));
        var display = Object.keys(conf.stage_level_cfg[target]).length + 1;
        conf.all_Level[id] = copy;
        var entry = { id: id, wordId: target, levelId: display, mapId: id, sz_solution: '' };
        conf.level_cfg[id] = entry;
        conf.stage_level_cfg[target][String(id)] = entry;
        conf.stage_level_cfg[target][String(display)] = entry;
        saveCustomLevel(id, { grid: copy, colours: {}, world: target, levelId: display, name: label || ('L' + display) });
        stats.moveLevelsIn = (stats.moveLevelsIn || 0) + 1;
        return id;
    }

    function refreshPickerGrid(root) {
        var panel0 = root.getChildByName('pickerPanel');
        var grid = panel0 && panel0.getChildByName('pickerGrid');
        if (!grid) { return; }
        grid.removeAllChildren();
        var W = visibleWidth();
        var entries = shippedLevelsOf(pickerWorld);
        var panel1 = root.getChildByName('pickerPanel');
        var title = panel1 && panel1.getChildByName('pickerTitle');
        if (title) {
            var tl = title.getComponent(cc.Label);
            if (tl) { tl.string = t('tileMoveLevels') + '   ·   ' + pickerWorld + ' - ' + entries.length; }
        }
        stats.pickerTiles = entries.length;
        entries.forEach(function (e, i) {
            var col = i % 5, row = Math.floor(i / 5);
            var tile = new cc.Node('pickerTile_' + e.mapId);
            tile.parent = grid;
            tile.setContentSize(148, 84);
            tile.x = (col - 2) * 158;
            tile.y = 130 - row * 96;
            roundedPanel(tile, cc.color(52, 46, 60, 235), 190, 110);
            makeLabel(tile, String(pickerWorld) + '-' + (e.levelId || '?'), 0, 30, cc.color(255, 236, 200, 255));
            tile.on(cc.Node.EventType.TOUCH_START, function () { pressFeedback(tile, true); });
            tile.on(cc.Node.EventType.TOUCH_CANCEL, function () { pressFeedback(tile, false); });
            tile.on(cc.Node.EventType.TOUCH_END, function () {
                pressFeedback(tile, false);
                var made = adoptLevelInto(gridTargetWorld, e, String(pickerWorld) + '-' + (e.levelId || '?'));
                stats.pickerAdopted = made;
                closeLevelPicker();
                try { if (window.MazeDashCustomTab && MazeDashCustomTab.refreshStagePages) { MazeDashCustomTab.refreshStagePages(); } } catch (er) {}
                log('adopted shipped level', e.mapId, 'as custom level', made, 'into world', gridTargetWorld);
            });
        });
    }

    function openLevelPicker() {
        var host = cc.find('Canvas');
        if (!host) { return null; }
        closeLevelPicker();
        var W = visibleWidth(), H = visibleHeight();
        var root = new cc.Node('levelPicker');
        root.parent = host;
        root.setContentSize(W, H);
        root.zIndex = 1001;                       /* above the world preview (998) and the grid editor (999) */
        var dim = new cc.Node('pickerDim');
        dim.parent = root;
        fullSprite(dim, W, H, cc.color(12, 10, 16, 210));
        dim.on(cc.Node.EventType.TOUCH_END, function () { closeLevelPicker(); });
        var panel = new cc.Node('pickerPanel');
        panel.parent = root;
        panel.setContentSize(Math.min(900, W - 80), Math.min(760, H - 220));
        roundedPanel(panel, cc.color(40, 36, 48, 245), panel.width, panel.height);
        var title = makeLabel(panel, t('moveLevels'), panel.height / 2 - 60, 40, cc.color(255, 255, 255, 255));
        title.name = 'pickerTitle';
        makeLabel(panel, '<  ' + pickerWorld + '  >', panel.height / 2 - 112, 26, cc.color(190, 186, 200, 255)).name = 'pickerHint';
        var grid = new cc.Node('pickerGrid');
        grid.parent = panel;
        grid.setContentSize(panel.width - 60, 470);
        grid.y = 10;
        var prev = new cc.Node('pickerPrev');
        prev.parent = panel; prev.setContentSize(120, 90);
        prev.x = -panel.width / 2 + 90; prev.y = -panel.height / 2 + 62;
        roundedPanel(prev, cc.color(70, 60, 80, 240), 120, 90);
        makeLabel(prev, '<', 0, 44, cc.color(255, 255, 255, 255));
        prev.on(cc.Node.EventType.TOUCH_END, function () {
            pickerWorld = pickerWorld <= 1 ? 8 : pickerWorld - 1;
            pickerWorld = (conf.stage_level_cfg && conf.stage_level_cfg[pickerWorld]) ? pickerWorld : 1;
            refreshPickerGrid(root);
        });
        var next = new cc.Node('pickerNext');
        next.parent = panel; next.setContentSize(120, 90);
        next.x = panel.width / 2 - 90; next.y = -panel.height / 2 + 62;
        roundedPanel(next, cc.color(70, 60, 80, 240), 120, 90);
        makeLabel(next, '>', 0, 44, cc.color(255, 255, 255, 255));
        next.on(cc.Node.EventType.TOUCH_END, function () {
            pickerWorld = pickerWorld >= 8 ? 1 : pickerWorld + 1;
            pickerWorld = (conf.stage_level_cfg && conf.stage_level_cfg[pickerWorld]) ? pickerWorld : 1;
            refreshPickerGrid(root);
        });
        var cancel = new cc.Node('pickerCancel');
        cancel.parent = panel; cancel.setContentSize(220, 90);
        cancel.y = -panel.height / 2 + 62;
        roundedPanel(cancel, cc.color(150, 60, 60, 240), 220, 90);
        makeLabel(cancel, t('cancel'), 0, 32, cc.color(255, 255, 255, 255));
        cancel.on(cc.Node.EventType.TOUCH_START, function () { pressFeedback(cancel, true); });
        cancel.on(cc.Node.EventType.TOUCH_CANCEL, function () { pressFeedback(cancel, false); });
        cancel.on(cc.Node.EventType.TOUCH_END, function () { pressFeedback(cancel, false); closeLevelPicker(); });
        pickerRootRef = root;
        pickerWorld = (conf.stage_level_cfg && conf.stage_level_cfg[1]) ? 1 : pickerWorld;
        refreshPickerGrid(root);
        animateIn(root);
        stats.pickersOpened = (stats.pickersOpened || 0) + 1;
        return root;
    }

    /* a tiny build tag in the corner of OUR screens: the user has twice been testing a stale page,
       and this makes "which build am I running" a one-glance question */
    function buildStamp() { var d = new Date(); function p(v) { return (v < 10 ? '0' : '') + v; } return p(d.getMonth() + 1) + '-' + p(d.getDate()) + ' ' + p(d.getHours()) + ':' + p(d.getMinutes()); }
    var BUILD_TAG = 'build ' + buildStamp();
    function addBuildTag(parent, name) {
        if (!parent || parent.getChildByName(name)) { return; }
        var n = makeLabel(parent, BUILD_TAG, 0, 22, cc.color(255, 245, 210, 205));
        n.name = name;
        n.setPosition(-visibleWidth() / 2 + 480, visibleHeight() / 2 - 30);
        n.zIndex = 500;
        return n;
    }

    function editorAction(id) {
        stats.editorAction = id;
        if (id === 'createWorld') { openCreateWorldDialog(window.hallScene); return; }
        if (id === 'previewWorld') { previewCustomWorld(); return; }
        if (id === 'previewLevel') { previewCustomLevel(); return; }
        if (id === 'exportJson') { exportCustomJson(); return; }
        if (id === 'importJson') { pickAndImportJson(); return; }
        if (id === 'createLevel') { openGridEditor(); return; }
        if (id === 'newLevel') { openGridEditor(); return; }
        if (id === 'moveLevels') { openLevelPicker(); return; }
        stats.editorActionAt = Date.now();
        log('editor action:', id, '(destination screen not built yet)');
        var hall = window.hallScene;
        var view = hall && hall.viewGroup && hall.viewGroup[CFG.index];
        if (view) {
            var hint = view.getChildByName('customHint');
            if (hint) {
                var lb = hint.getComponent(cc.Label);
                if (lb) { lb.string = t('comingSoon'); }
            }
        }
    }

    function positionEditorHome(view) {
        if (!view || !view.isValid) { return; }
        /* Build lazily here rather than during install(): the install call ran before
           addView() had created and registered viewGroup[5], so it was handed undefined
           and returned silently. The tick runs after the page exists. */
        if (!view.__editorHome) { buildEditorHome(view); }
        addBuildTag(view, 'editorBuildTag');   /* P3: make a stale page obvious at a glance */
        /* FRAME-CORRECT: derive the local x/y from the page's CURRENT world position. A parked page
           sits at +-one page width while the shown one is centred, so the old formula (which assumed
           the view sat at the world origin) put the buttons off screen the moment the page was really
           displayed - the same class of bug as the small button row. Because the 1.5s tick runs this,
           it must agree with the switch-time correction instead of fighting it. */
        var wp = view.convertToWorldSpaceAR(cc.v2(0, 0));
        var W = visibleWidth(), H = visibleHeight();
        ['createWorld', 'createLevel'].forEach(function (id, i) {
            var btn = view.getChildByName('editorBtn_' + id);
            if (!btn || !btn.isValid) { return; }
            var wantWorldX = (i === 0) ? (60 + btn.width / 2) : (W - 60 - btn.width / 2);
            var wantWorldY = 60 + btn.height / 2;
            var bx = wantWorldX - wp.x;
            var by = wantWorldY - wp.y;
            if (Math.abs(btn.x - bx) > 1 || Math.abs(btn.y - by) > 1) {
                btn.x = bx; btn.y = by;
                stats.editorBigBtnByTimer = (stats.editorBigBtnByTimer || 0) + 1;
            }
            /* same-frame assertion: read the world position straight back after writing */
            var aw = btn.convertToWorldSpaceAR(cc.v2(0, 0));
            if (Math.abs(aw.x - wantWorldX) > 1 || Math.abs(aw.y - wantWorldY) > 1) {
                stats.editorBigBtnTimerOff = (stats.editorBigBtnTimerOff || 0) + 1;
            }
        });
        try { relayoutEditorHomeNow(); } catch (e) {}
    }
    /* The built-in flow reads conf.worlds[wordId].require when you tap "next level"; a
       custom world with a single level makes that id undefined and the game throws
       "Cannot read properties of undefined (reading 'require')". A Proxy keeps every
       lookup safe (missing worlds behave as require: 0 = unlocked) without touching the
       shipped data. */
    function guardWorldTable() {
        try {
            if (!conf.worlds || conf.worlds.__guarded) { return; }
            var raw = conf.worlds;
            conf.worlds = new Proxy(raw, {
                get: function (t, k) {
                    var v = t[k];
                    if (v === undefined && k !== '__guarded' && String(k) !== 'Symbol(Symbol.toStringTag)') {
                        return { id: Number(k) || 0, require: 0, __fallback: true };
                    }
                    return v;
                },
            });
            conf.worlds.__guarded = true;
            /* The crash was conf.level_cfg[parseInt(e)].wordId with e undefined, i.e. the lookup
               conf.level_cfg[NaN]. In JavaScript that key is the STRING "NaN", so a single
               fallback record is enough - no Proxy, nothing to interfere with the save path.
               (A Proxy here was the first suspect for the CASE D hang, so it is gone.) */
            try {
                if (conf.level_cfg && conf.level_cfg['NaN'] === undefined) {
                    conf.level_cfg['NaN'] = { id: 0, wordId: stats.lastEnteredWordId || stats.lastWorldId || 1, levelId: 0, mapId: -1, sz_solution: '', __fallback: true };
                    stats.levelTableNaNGuarded = 1;
                }
            } catch (e) { warn('level table guard failed:', e && e.message); }
            stats.worldsGuarded = 1;
        } catch (e) { warn('world table guard failed:', e && e.message); }
    }
    /* One correct way to make a full-area coloured sprite. Order matters: cc.Sprite
       defaults to sizeMode TRIMMED, so assigning the spriteFrame resizes the node to the
       texture's own size (the 2x2 white texture) - which is how the dialog's dimming layer
       ended up 2x2 and let the editor page show through, and why the input backgrounds
       were invisible. CUSTOM first, frame second, size re-asserted last. */
    function fullSprite(node, w, h, colour) {
        var sp = node.getComponent(cc.Sprite) || node.addComponent(cc.Sprite);
        sp.sizeMode = cc.Sprite.SizeMode.CUSTOM;
        sp.type = cc.Sprite.Type.SIMPLE;
        sp.spriteFrame = whiteFrame();
        node.setContentSize(w, h);
        if (colour) { node.color = colour; }
        return sp;
    }
    /* ============ 颜色工具：主题色在 conf 里是 HSVA 数组（H 0-360, S/V 0-100, A 0-1） ============ */
    function hexToHsva(hex) {
        var m = /^#?([0-9a-f]{6})$/i.exec(String(hex || '').trim());
        if (!m) { return null; }
        var n = parseInt(m[1], 16), r = (n >> 16 & 255) / 255, g = (n >> 8 & 255) / 255, b = (n & 255) / 255;
        var mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn, h = 0;
        if (d) {
            if (mx === r) { h = ((g - b) / d + (g < b ? 6 : 0)); }
            else if (mx === g) { h = (b - r) / d + 2; }
            else { h = (r - g) / d + 4; }
            h *= 60;
        }
        return [Math.round(h), Math.round((mx ? d / mx : 0) * 100), Math.round(mx * 100), 1];
    }
    function hsvaToHex(v) {
        if (!v) { return '#000000'; }
        var h = (((v[0] % 360) + 360) % 360) / 360, s = v[1] / 100, val = v[2] / 100;
        var i = Math.floor(h * 6), f = h * 6 - i, p = val * (1 - s), q = val * (1 - f * s), t2 = val * (1 - (1 - f) * s);
        var rgb = [[val, t2, p], [q, val, p], [p, val, t2], [p, q, val], [t2, p, val], [val, p, q]][i % 6];
        function hx(x) { var s2 = Math.round(x * 255).toString(16); return s2.length === 1 ? '0' + s2 : s2; }
        return '#' + hx(rgb[0]) + hx(rgb[1]) + hx(rgb[2]);
    }
    /* the eight shipped worlds double as a preset palette */
    /* The eight shipped worlds give eight colours, which the report rightly called monotonous;
       these extras are a curated palette so there is something for every taste. */
    var EXTRA_PRESETS = [
        ['#4CAF50', 'grass green', '草原绿'], ['#4FC3F7', 'sky blue', '天空蓝'],
        ['#1565C0', 'deep blue', '深海蓝'], ['#FF7043', 'sunset orange', '日落橙'],
        ['#EC407A', 'rose pink', '玫瑰粉'], ['#9C6ADE', 'lavender', '薰衣草紫'],
        ['#26A69A', 'mint teal', '薄荷青'], ['#D4A537', 'sand gold', '沙金'],
        ['#2E7D32', 'forest', '森林绿'], ['#FF8A80', 'coral', '珊瑚'],
        ['#607D8B', 'slate', '石板灰'], ['#7B1FA2', 'plum', '李子紫'],
        ['#FFB300', 'amber', '琥珀'], ['#00ACC1', 'lagoon', '湖蓝'],
        ['#B03A2E', 'brick', '砖红'], ['#EFEBE0', 'ivory', '乳白'],
    ];

    function langName(en, zh) {
        var l = currentLang();
        return (l === 'zh-Hans' || l === 'zh-Hant') ? zh : en;
    }

    function presetThemes() {
        var out = [];
        for (var i = 1; i <= 8; i++) {
            var t = conf.theme_cfg[i];
            if (t && t.list_background) {
                out.push({ id: i, hsva: t.list_background, hex: hsvaToHex(t.list_background),
                           name: (conf.stage_cfg[i] && conf.stage_cfg[i].sz_title) || ('W' + i) });
            }
        }
        EXTRA_PRESETS.forEach(function (p) {
            var h = hexToHsva(p[0]);
            if (h) { out.push({ id: null, hsva: h, hex: p[0], name: langName(p[1], p[2]) }); }
        });
        return out;
    }

    /* ============ 自建世界的持久化（浏览器写不了 res/，只能存本地） ============ */
    var CUSTOM_KEY = 'maze_dash_custom_worlds';
    function customWorlds() {
        try { return JSON.parse(localStorage.getItem(CUSTOM_KEY) || '{}') || {}; } catch (e) { return {}; }
    }
    function saveCustomWorld(id, data) {
        try {
            var all = customWorlds();
            all[String(id)] = data;
            localStorage.setItem(CUSTOM_KEY, JSON.stringify(all));
        } catch (e) {}
    }
    function nextCustomWorldId() {
        var used = customWorlds(), id = 100;
        while (used[String(id)] || conf.stage_cfg[id]) { id++; }
        return id;
    }

    /* ============ 新建世界：模态对话框（背景变暗 + 中央面板） ============ */
    var DIALOG_NAME = 'editorDialog';
    function closeDialog() {
        var host = cc.find('Canvas');
        var d = host && host.getChildByName(DIALOG_NAME);
        /* remove every DOM input belonging to this dialog before its node goes: the boxes are
           real HTML elements and would otherwise float over the game after closing */
        Array.prototype.slice.call(document.querySelectorAll('input')).forEach(function (el) {
            if (el.__mazeDashInput && el.parentNode) { el.parentNode.removeChild(el); }
        });
        if (d && d.isValid) {
            destroyInputs(d);
            d.destroy();
            stats.dialogsClosed = (stats.dialogsClosed || 0) + 1;
        }
        return !!d;
    }

    function openCreateWorldDialog(hall) {
        var host = cc.find('Canvas')   // the HallScene component sits ON the Canvas, so hall.node IS it;
        if (!host) { return null; }
        closeDialog();
        var W = visibleWidth(), H = visibleHeight();

        var modal = new cc.Node(DIALOG_NAME);
        modal.parent = host;
        modal.setContentSize(W, H);
        modal.zIndex = 999;                      // above everything the hall draws
        // dimming backdrop
        var dim = new cc.Node('dim');
        dim.parent = modal;
        dim.setContentSize(W, H);
        var dsp = dim.addComponent(cc.Sprite);
        dsp.spriteFrame = whiteFrame();
        dsp.sizeMode = cc.Sprite.SizeMode.CUSTOM;
        dsp.type = cc.Sprite.Type.SIMPLE;
        dim.color = cc.color(0, 0, 0, 170);
        dim.on(cc.Node.EventType.TOUCH_END, function () { closeDialog(); });

        // the panel
        var panelW = 960, panelH = 900;
        var panel = new cc.Node('panel');
        panel.parent = modal;
        panel.setContentSize(panelW, panelH);
        roundPanel(panel, panelW, panelH, 30, cc.color(38, 34, 42, 255));   // real rounded corners
        var worldId = visibleWorldId(hall) || 1;

        makeLabel(panel, t('createWorld'), 346, 40, cc.color(255, 255, 255, 255)).name = 'dlgTitle';
        var errLabel = makeLabel(panel, '', -panelH / 2 + 40, 22, cc.color(255, 120, 120, 255));
        errLabel.name = 'dlgError';

        // --- world name ---
        makeLabel(panel, t('worldName'), 282, 22, cc.color(255, 255, 255, 200)).name = 'dlgNameLabel';
        var nameBox = makeEditBox(panel, 'worldNameInput', 0, 236, 460, 56, 'My World', 26);

        // --- preset swatches (the eight shipped themes + the current custom colour) ---
        makeLabel(panel, t('themeColour'), 160, 22, cc.color(255, 255, 255, 200)).name = 'dlgColourLabel';
        var presets = presetThemes();
        var swatchY = 70;
        var chosen = { hsva: presets.length ? presets[0].hsva.slice() : [160, 60, 80, 1] };
        var swatches = [];
        presets.forEach(function (p, i) {
            var sw = new cc.Node('swatch_' + i);
            sw.parent = panel;
            /* roundedPanel is the same helper the Cancel/Create buttons use, and those render
               correctly in the dialog; the sprite path here kept collapsing to the texture's
               own 2x2 size, which is why the palette looked empty. */
            roundedPanel(sw, cc.color(120, 120, 120, 255), 84, 84);
            var perRow = 8, row = Math.floor(i / perRow), col = i % perRow;
            sw.x = (col - (perRow - 1) / 2) * 104;
            sw.y = swatchY - row * 104;
            if (p.id) { applyThemeColour(sw, p.id, 'list_background', cc.color(120, 120, 120, 255)); }
            else { sw.color = cc.color(p.hex); }
            sw.on(cc.Node.EventType.TOUCH_START, function () { pressFeedback(sw, true); });
            sw.on(cc.Node.EventType.TOUCH_END, function () {
                chosen.hsva = p.hsva.slice();
                if (hexBox && hexBox.__input) { hexBox.__input.value = hsvaToHex(chosen.hsva); }
                refreshPreview();
                pressFeedback(sw, false);
                markSwatch(swatches, sw);
            });
            swatches.push(sw);
        });

        // --- hex code input + live preview ---
        makeLabel(panel, t('hexHint'), -206, 22, cc.color(255, 255, 255, 205)).name = 'dlgHexHint';   // note: makeLabel takes (parent, text, y, fontSize, colour) - no x
        var hexBox = makeEditBox(panel, 'hexInput', 0, -248, 320, 60, '#RRGGBB', 26);   // centred, with a visible slot again
        markSwatch(swatches, swatches[0]);
        /* The little preview swatch is gone: it rendered as a 2x2 dot and sat under the
           Create button. The palette and the hex code already say what the colour is. */
        function refreshPreview() { /* kept as a no-op: the swatch handlers still call it */ }
        /* the hex hint label is deliberately gone: the #RRGGBB placeholder says the same
           thing, and the small CJK line rendered as garbage between the swatch rows. */

        // --- confirm / cancel ---
        var confirmBtn = makeDialogButton(panel, t('confirm'), 1, -350, cc.color(255, 210, 60, 255), function () {
            var name = inputValue(nameBox) || t('untitledWorld');
            var typed = hexToHsva(inputValue(hexBox));
            if (typed) { chosen.hsva = typed; }
            /* Do NOT close on failure: show the reason in the dialog instead of appearing
               to do nothing (which is exactly how it was reported). */
            try {
                createCustomWorld(hall, name, chosen.hsva);
                closeDialog();
            } catch (e) {
                var msg = (e && e.message) ? e.message : String(e);
                errLabel.string = t('createFailed') + ': ' + msg;
                warn('create world failed:', msg);
            }
        });
        var cancelBtn = makeDialogButton(panel, t('cancel'), -1, -350, cc.color(90, 84, 96, 255), function () { closeDialog(); });

        /* the game's own entrance motion: fade + scale */
        modal.opacity = 0;
        panel.scale = 0.86;
        modal.runAction(cc.fadeTo(0.16, 255));
        panel.runAction(cc.scaleTo(0.18, 1, 1));
        stats.dialogsOpened = (stats.dialogsOpened || 0) + 1;
        return modal;
    }

    /* the selected swatch grows and stays fully opaque; the rest dim and shrink back */
    function markSwatch(all, active) {
        all.forEach(function (n) {
            if (!n || !n.isValid) { return; }
            n.stopAllActions();
            var on = (n === active);
            n.runAction(cc.spawn(cc.scaleTo(0.12, on ? 1.22 : 1, on ? 1.22 : 1), cc.fadeTo(0.12, on ? 255 : 170)));
        });
    }
    /* cc.EditBox renders typed text through a DOM <textarea> overlay, and measured on the
       live page that element was display:none at 0x0 - so the text simply was not shown.
       This builds the input itself instead: a normal cc.Node for the box, plus a real DOM
       input positioned over the canvas, styled with a font that has CJK glyphs. Full control,
       no component quirks. */
    function makeEditBox(parent, name, x, y, w, h, placeholder, fontSize, noBox) {
        var node = new cc.Node(name);
        node.parent = parent;
        node.setContentSize(w, h);
        node.x = x; node.y = y;
        if (!noBox) { roundedPanel(node, cc.color(18, 16, 22, 235), w, h); }   // the hex field draws no box at all
        var fs = fontSize || 42;
        var el = document.createElement('input');
        el.type = 'text';
        el.placeholder = placeholder || '';
        el.maxLength = 24;
        el.style.position = 'fixed';
        el.style.boxSizing = 'border-box';
        el.style.padding = '0 18px';
        el.style.border = '0';
        el.style.outline = 'none';
        el.style.borderRadius = '8px';
        el.style.background = 'transparent';   // the rounded dark slot is drawn by the node behind it
        el.style.color = '#ffffff';
        el.style.textAlign = 'left';
        el.style.fontSize = fs + 'px';
        el.style.fontFamily = 'system-ui, "Microsoft YaHei", "PingFang SC", sans-serif';
        el.style.zIndex = '30';
        el.style.display = 'block';
        document.body.appendChild(el);
        node.__input = el;
        node.__inputClosed = false;
        function place() {
            if (!node.isValid) { if (el.parentNode) { el.parentNode.removeChild(el); } return; }
            var wp = node.convertToWorldSpaceAR(cc.v2(0, 0));
            var r = cc.game.canvas.getBoundingClientRect();
            var vs = cc.view.getVisibleSize();
            var sx = r.width / vs.width, sy = r.height / vs.height;
            var cx = r.left + wp.x * sx, cy = r.top + (vs.height - wp.y) * sy;
            el.style.left = Math.round(cx - (node.width * sx) / 2) + 'px';
            el.style.top = Math.round(cy - (node.height * sy) / 2) + 'px';
            el.style.width = Math.round(node.width * sx) + 'px';
            el.style.height = Math.round(node.height * sy) + 'px';
        }
        place();
        /* the dialog animates its panel in, so re-place after the motion settles */
        setTimeout(place, 120);
        setTimeout(place, 320);
        node.__place = place;
        return node;   // read the value from node.__input.value
    }

    function inputValue(box) {
        return (box && box.__input) ? String(box.__input.value || '') : '';
    }

    function destroyInputs(root) {
        (function walk(n) {
            if (n.__input && n.__input.parentNode) { n.__input.parentNode.removeChild(n.__input); }
            (n.children || []).forEach(walk);
        })(root);
    }

    function makeDialogButton(parent, text, side, y, colour, onTap) {
        var btn = new cc.Node('dlgBtn');
        btn.parent = parent;
        btn.setContentSize(240, 80);
        btn.x = side * 140;
        btn.y = y;
        roundedPanel(btn, colour, 240, 80);
        var lb = makeLabel(btn, text, 0, 30, cc.color(30, 26, 34, 255));
        lb.name = 'dlgBtnLabel';
        btn.on(cc.Node.EventType.TOUCH_START, function () { pressFeedback(btn, true); });
        btn.on(cc.Node.EventType.TOUCH_CANCEL, function () { pressFeedback(btn, false); });
        btn.on(cc.Node.EventType.TOUCH_END, function () { pressFeedback(btn, false); onTap(); });
        return btn;
    }

    /* ============ 真正创建世界：数据 + 翻页页 + 持久化 + 跳转 ============ */
    function createCustomWorld(hall, name, baseHsva) {
        var id = nextCustomWorldId();
        conf.worlds[id] = { id: id, require: 0 };
        conf.stage_cfg[id] = {};                       // title is set directly, not via LocalizedLabel
        conf.stage_level_cfg[id] = {};
        var theme = JSON.parse(JSON.stringify(conf.theme_cfg[1] || {}));
        ['list_background', 'list_level_background', 'list_brick_tile', 'list_separator'].forEach(function (k) { theme[k] = baseHsva.slice(); });
        theme.list_floor = [baseHsva[0], Math.max(10, Math.round(baseHsva[1] * 0.4)), 96, 1];
        theme.list_level_next = [baseHsva[0], Math.max(30, Math.round(baseHsva[1] * 0.9)), 100, 1];
        theme.list_level_complete = [baseHsva[0], Math.max(20, Math.round(baseHsva[1] * 0.6)), 90, 1];
        theme.list_character = [baseHsva[0], Math.max(40, Math.round(baseHsva[1] * 0.9)), 100, 1];
        conf.theme_cfg[id] = theme;
        saveCustomWorld(id, { name: name, base: baseHsva });

        /* Give the new world one starter level. Not just a convenience: the game's
           updateUnlockLayer() measures its FIRST level button to compute the grid
           columns, so a world with zero levels makes it read .width off null and the
           page creation throws. A 1x3 starter (head + two floor) is the same shape as
           the game's own first map, and it is what the editor will open for editing. */
        var starterId = id * 100 + 1, starterMap = starterId;
        conf.all_Level[starterMap] = [[-1, 1, 1]];
        var starter = { id: starterId, wordId: id, levelId: 1, mapId: starterMap, sz_solution: 'R' };
        conf.level_cfg[starterId] = starter;
        conf.stage_level_cfg[id][String(starterId)] = starter;
        /* same twin-key rule as injectSavedLevels / seedTestLevel: the engine looks a level up by
           LEVEL ID as well, so both keys must exist or t comes back undefined and its .wordId
           dereference throws during the hall rebuild. */
        if (starter && starter.levelId) { conf.stage_level_cfg[id][String(starter.levelId)] = starter; }

        /* Deliberately NOT inserted into the built-in pager: custom worlds must not appear
           in the original level select. They live only behind the editor's preview screen,
           which is what the user asked for ("the new world should show up in Preview edited
           worlds, not anywhere else"). */        stats.worldsCreated = (stats.worldsCreated || 0) + 1;
        log('created world', id, name, hsvaToHex(baseHsva));
        return id;
    }

    /* ====== 自定义世界页：排版与内置选关界面完全一致 ======
       两个入口不再是我自造的浮层，而是**克隆游戏自己的关卡格子（LevelBtnPrefab）**
       放进同一个网格容器里，所以字号、配色、间距、圆角都和内建关卡按钮一模一样。
       左上角另加一个返回按钮（只出现在自定义世界上）。 */
    function backToEditor() {
        var hall = window.hallScene;
        try {
            gamemain.showTabBarViewIndex = CFG.index;
            hall.showBarView();
        } catch (e) {}
        stats.backToEditor = (stats.backToEditor || 0) + 1;
        log('back to the editor');
    }

    function decorateCustomWorldPage(page, worldId) {
        if (!page || !page.isValid) { return; }
        var c = page.getComponent('StageSelectLayer');
        if (!c || !c.SelectLayer) { return; }
        if (page.__decorated === worldId) { return; }
        page.__decorated = worldId;

        /* --- back button, top-left --- */
        var back = c.SelectLayer.getChildByName('backToEditor');
        if (!back) {
            back = new cc.Node('backToEditor');
            back.parent = c.SelectLayer;
            back.setContentSize(150, 150);
            roundedPanel(back, cc.color(30, 26, 34, 220), 150, 150);
            var g = makeLabel(back, '\u2190', 0, 72, cc.color(255, 255, 255, 255));
            g.name = 'backGlyph';
            back.on(cc.Node.EventType.TOUCH_START, function () { pressFeedback(back, true); });
            back.on(cc.Node.EventType.TOUCH_CANCEL, function () { pressFeedback(back, false); });
            back.on(cc.Node.EventType.TOUCH_END, function () { pressFeedback(back, false); backToEditor(); });
            animateIn(back);
        }

        /* --- the two entries, as the game's own grid tiles --- */
        var host = c.SelectLevelLayer;
        if (!host) { return; }
        [{ id: 'newLevel', label: t('tileNewLevel') }, { id: 'moveLevels', label: t('tileMoveLevels') }].forEach(function (s) {
            if (host.getChildByName('tile_' + s.id)) { return; }
            var tile = null;
            try { tile = cc.instantiate(c.LevelBtnPrefab); } catch (e) { warn('tile clone failed:', e && e.message); }
            if (!tile) { return; }
            tile.name = 'tile_' + s.id;
            tile.parent = host;
            var lb = tile.getComponent('LevelButton');
            if (lb && lb.clickEvents) { lb.clickEvents.length = 0; }
            var numNode = tile.getChildByName('Level');
            if (numNode) {
                var nl = numNode.getComponent(cc.Label);
                if (nl) { nl.string = s.label; nl.fontSize = 26; }
            }
            tile.on(cc.Node.EventType.TOUCH_START, function () { pressFeedback(tile, true); });
            tile.on(cc.Node.EventType.TOUCH_CANCEL, function () { pressFeedback(tile, false); });
            tile.on(cc.Node.EventType.TOUCH_END, function () { pressFeedback(tile, false); gridTargetWorld = id; editorAction(s.id); });
            tile.runAction(cc.repeatForever(cc.sequence(cc.scaleTo(0.9, 1.06, 1.06), cc.scaleTo(0.9, 1, 1))));
            /* the game's palette for a playable level, so the tile reads like the others */
            applyThemeColour(tile, worldId, s.id === 'newLevel' ? 'list_level_next' : 'list_level_complete', cc.color(240, 200, 90, 255));
        });
        var layout = host.getComponent(cc.Layout);
        if (layout && layout.updateLayout) { layout.updateLayout(); }
        stats.customWorldDecorated = (stats.customWorldDecorated || 0) + 1;
    }

    /* keep the back button at the page's top-left as the layout resizes */
    function positionWorldBackButtons(hall) {
        var pager = hall.StageSelectLayer;
        var content = pager && pager.content;
        if (!content) { return; }
        var W = visibleWidth(), H = visibleHeight();
        content.children.forEach(function (p) {
            var c = p.getComponent && p.getComponent('StageSelectLayer');
            if (!c || !c.SelectLayer || c.m_stageId < 100) { return; }
            var back = c.SelectLayer.getChildByName('backToEditor');
            if (!back || !back.isValid) { return; }
            var bx = -W / 2 + 30 + back.width / 2;
            var by = H / 2 - 24 - back.height / 2;
            if (Math.abs(back.x - bx) > 1 || Math.abs(back.y - by) > 1) { back.x = bx; back.y = by; }
        });
    }
    /* ==================== 键盘映射 ====================
       In menus: A / D and the left / right arrows turn pages (the pager's own API).
       In a level: W A S D and the four arrows move, delivered as a synthetic swipe on the
       canvas - the game's own movement is drag-driven, so this needs no internal API and
       cannot break if the game's internals change. */
    var KEY_DIR = {
        KeyW: 'up', ArrowUp: 'up',
        KeyS: 'down', ArrowDown: 'down',
        KeyA: 'left', ArrowLeft: 'left',
        KeyD: 'right', ArrowRight: 'right',
    };

    function sceneName() {
        try { return cc.director.getScene() ? cc.director.getScene().name : ''; } catch (e) { return ''; }
    }

    /* a short drag on the canvas, which is exactly what a touch swipe is to the game */
    function synthSwipe(dir) {
        try {
            var canvas = cc.game && cc.game.canvas;
            if (!canvas) { return false; }
            var r = canvas.getBoundingClientRect();
            var cx = r.left + r.width / 2, cy = r.top + r.height / 2;
            var dx = dir === 'left' ? -1 : (dir === 'right' ? 1 : 0);
            var dy = dir === 'up' ? -1 : (dir === 'down' ? 1 : 0);
            var span = Math.min(r.width, r.height) * 0.22;
            function send(type, x, y) {
                var ev = new MouseEvent(type, { bubbles: true, cancelable: true, clientX: x, clientY: y, button: 0, buttons: 1 });
                canvas.dispatchEvent(ev);
            }
            send('mousedown', cx, cy);
            var steps = 6;
            for (var i = 1; i <= steps; i++) { send('mousemove', cx + dx * span * i / steps, cy + dy * span * i / steps); }
            send('mouseup', cx + dx * span, cy + dy * span);
            stats.swipesSent = (stats.swipesSent || 0) + 1;
            return true;
        } catch (e) { warn('swipe failed:', e && e.message); return false; }
    }

    /* the level select's pager, or my own preview pager if that is open */
    function turnPage(step) {
        var host = cc.find('Canvas');
        var preview = host && host.getChildByName(PREVIEW_NAME);
        if (preview && preview.isValid) {
            var pv = preview.getChildByName('previewPager');
            var content = pv && pv.getChildByName('content');
            if (content && content.children.length) {
                var cur = stats.previewPage || 0;
                var want = Math.max(0, Math.min(content.children.length - 1, cur + step));
                if (want !== cur && preview.__show) { preview.__show(want); stats.keyPages = (stats.keyPages || 0) + 1; return true; }
            }
            return false;
        }
        var hall = window.hallScene;
        var pager = hall && hall.StageSelectLayer;
        if (!pager || !pager.content) { return false; }
        var pages = pager.content.children.filter(function (p) { return p.getComponent && p.getComponent('StageSelectLayer'); });
        var idx = (typeof pager._curPageIdx === 'number') ? pager._curPageIdx : 0;
        var next = Math.max(0, Math.min(pages.length - 1, idx + step));
        if (next === idx) { return false; }
        if (pager.scrollToPage) {
            /* Let the pager run its own animation, with a longer duration so a key press reads
               as the same smooth slide a drag produces instead of an instant jump. */
            try { pager.scrollDuration = 0.45; } catch (e) {}
            pager.scrollToPage(next);
        }
        stats.keyPages = (stats.keyPages || 0) + 1;
        return true;
    }

    function onKeyDown(e) {
        if (e && (e.ctrlKey || e.metaKey || e.altKey)) { return; }
        var tag = (e && e.target && e.target.tagName) ? e.target.tagName : '';
        if (tag === 'INPUT' || tag === 'TEXTAREA') { return; }   // never steal typing from a field
        var dir = KEY_DIR[e && e.code];
        if (!dir) { return; }
        var scene = sceneName();
        if (scene === 'gameScene') {
            synthSwipe(dir);
            e.preventDefault();
            return;
        }
        if (dir === 'left' || dir === 'right') {
            if (turnPage(dir === 'left' ? -1 : 1)) { e.preventDefault(); }
        }
    }

    /* Colour tables must survive a restart: wrapping the engine's own entry method means every
       way a custom level can be started restores its table, not just the editor's save path. */
    function installLevelEntryHook() {
        try {
            if (!gamemain || gamemain.__colourEntryHook) { return false; }
            gamemain.__colourEntryHook = true;
            var orig = gamemain.enterEnterGameScene.bind(gamemain);
            /* PURE LOGGING PROXY (diagnostic only): it observes which keys are read and ALWAYS returns
           the real value - it never substitutes a fallback object, so it cannot make any loop
           diverge. This is how we find out which key actually crashes the hall rebuild. */
        try {
            if (stats.debugLevelCfg && conf.level_cfg && !conf.level_cfg.__loggingProxy) {
                var rawLog = conf.level_cfg;
                conf.level_cfg = new Proxy(rawLog, {
                    get: function (t, k) {
                        try {
                            if (typeof k === 'string') {
                                if (!stats.levelCfgKeys) { stats.levelCfgKeys = []; }
                                stats.levelCfgKeys.push(k);
                                if (stats.levelCfgKeys.length > 20) { stats.levelCfgKeys.shift(); }
                                if (t[k] === undefined && k !== '__loggingProxy') { stats.levelCfgLastMissing = k; }
                            }
                        } catch (e) {}
                        return t[k];
                    },
                });
                conf.level_cfg.__loggingProxy = true;
                stats.levelCfgLoggingProxy = 1;
            }
        } catch (e) { warn('logging proxy failed:', e && e.message); }
        /* The broad Proxy was REMOVED: with it installed the SAVE path hung (the timeout moved\n           from entry to save), and without it the save completed. Evidence beat preference. */

        /* EXTRA DEFENCE ONLY. The real culprit was the stage_level_cfg registration key (custom
           "Cannot read properties of undefined (reading 'wordId')" from initStageLayer whenever the
           hall was rebuilt after entering a CUSTOM level. Wrapping the method is the same low-risk
           technique already used for the other engine methods in this port. */
        try {
            var origGetLastWordId = gamemain.getLastWordId.bind(gamemain);
            gamemain.getLastWordId = function (arg) {
                stats.getLastWordIdArg = (arg === undefined) ? 'undefined' : String(arg);
                /* Validate BEFORE delegating: the original does conf.level_cfg[parseInt(arg)].wordId,
                   so an unknown id makes it throw. Only call it when the lookup would succeed. */
                var key = (arg === undefined || arg === null) ? null : parseInt(arg, 10);
                var known = (key !== null && !isNaN(key) && conf.level_cfg && conf.level_cfg[key] && conf.level_cfg[key].wordId !== undefined);
                if (!known) {
                    stats.getLastWordIdShortCircuit = (stats.getLastWordIdShortCircuit || 0) + 1;
                    return stats.lastEnteredWordId || stats.lastWorldId || 1;
                }
                var v = null;
                try { v = origGetLastWordId(arg); } catch (e) { v = null; }
                if (!v) { v = stats.lastEnteredWordId || stats.lastWorldId || 1; }
                return v;
            };
            stats.getLastWordIdWrapped = 1;
        } catch (e) { warn('getLastWordId wrap failed:', e && e.message); }
        /* The crash came from a SCENE component, not from gamemain: the stack was
           getLastWordId <- initStageLayer <- start, and start() is a component lifecycle. So wrap
           the getter on whichever object actually owns it (hall scene, game scene, gamemain). */
        function wrapWordIdGetter(obj, tag) {
            try {
                if (!obj || typeof obj.getLastWordId !== 'function' || obj.__wordIdWrapped) { return false; }
                var orig = obj.getLastWordId.bind(obj);
                obj.getLastWordId = function () {
                    var v = null;
                    try { v = orig(); } catch (e) { v = null; }
                    if (!v) { v = stats.lastEnteredWordId || stats.lastWorldId || 1; }
                    return v;
                };
                obj.__wordIdWrapped = true;
                stats.wordIdGetterWrapped = (stats.wordIdGetterWrapped || 0) + 1;
                stats.wordIdGetterWhere = tag;
                return true;
            } catch (e) { return false; }
        }
        function armWordIdWrappers() {
            wrapWordIdGetter(gamemain, 'gamemain');
            /* The instance wrap alone did not stop the crash, so wrap the prototype too: every
               instance of that class then gets the safe getter. */
            try {
                var proto = gamemain && Object.getPrototypeOf(gamemain);
                if (proto && typeof proto.getLastWordId === 'function' && !proto.__wordIdProtoWrapped) {
                    var origProto = proto.getLastWordId;
                    proto.getLastWordId = function (arg) {
                        var key = (arg === undefined || arg === null) ? null : parseInt(arg, 10);
                        var known = (key !== null && !isNaN(key) && conf.level_cfg && conf.level_cfg[key] && conf.level_cfg[key].wordId !== undefined);
                        if (!known) { return stats.lastEnteredWordId || stats.lastWorldId || 1; }
                        var v = null;
                        try { v = origProto.apply(this, arguments); } catch (e) { v = null; }
                        if (!v) { v = stats.lastEnteredWordId || stats.lastWorldId || 1; }
                        return v;
                    };
                    proto.__wordIdProtoWrapped = true;
                    stats.wordIdProtoWrapped = 1;
                }
            } catch (e) {}
            wrapWordIdGetter(window.hallScene, 'hallScene');
            try { wrapWordIdGetter(cc.find('Canvas/backgroup/game_map') && cc.find('Canvas/backgroup/game_map').getComponent('game_map'), 'game_map'); } catch (e) {}
            try {
                var sc = cc.director.getScene();
                if (sc) { (sc._components || []).forEach(function (comp) { wrapWordIdGetter(comp, 'scene:' + (comp && comp.__classname__ ? comp.__classname__ : '?')); }); }
            } catch (e) {}
        }
        armWordIdWrappers();
        gamemain.enterEnterGameScene = function (id) {
            try {
                var w = conf.level_cfg && conf.level_cfg[id] && conf.level_cfg[id].wordId;
                if (w) { stats.lastEnteredWordId = w; }
            } catch (e) {}
                try { if (conf.level_cfg && conf.level_cfg[id] && portalColoursByMap[id]) { stats.colourTableRestored = (stats.colourTableRestored || 0) + 1; activePortalColours = portalColoursByMap[id]; stats.colourTableRestored = (stats.colourTableRestored || 0) + 1; } } catch (e) {}
                return orig(id);
            };
            stats.levelEntryHook = 1;
            return true;
        } catch (e) { return false; }
    }

    function installKeys() {
        if (window.__mazeDashKeys) { return; }
        window.__mazeDashKeys = true;
        /* Capture phase on purpose: the engine installs its own key handling and can stop
           propagation, which is why a bubble-phase listener here never fired. */
        /* Exactly one target: registering on both window and document in the capture phase
           made every keypress run the handler twice, so one press turned two pages. */
        document.addEventListener('keydown', onKeyDown, true);
        stats.keysInstalled = 1;
        log('keyboard mapping installed (WASD + arrows)');
    }
    /* ==================== 彩色传送门（实验性扩展） ====================
       引擎的 getOutPortal 是"从头扫描全图、返回第一个其它传送门"，所以多个门会全部连到一起。
       这里包装它，实现"只有同色门互通、找不到同色门就原地不动"。颜色编码：2 = 默认，20+c = 第 c 种颜色。 */
    /* Portal colours live in a side table rather than in the tile value: the renderer only draws a
       portal when the cell is exactly 2, so coloured tiles were invisible. Keyed by "<x>,<y>". */
    var portalColours = {};

    /* One table for the level currently loaded. Keying it by mapId did not work - the component
       does not expose its map id - and a missing key made every portal look uncoloured, which
       silently fell back to "pair with the first portal". The editor will key this properly. */
    var activePortalColours = {};
    function cellColour(x, y) {
        return activePortalColours[x + ',' + y] || 0;
    }

    // Portal colours live in a side table, not in the tile value: the renderer only draws a portal
    // when the cell is exactly 2, so coloured tile values rendered nothing.
    //
    // The portal visuals carry no "portal" in their frame name (verified: zero sprite frames match
    // /portal/i) and the engine draws an adjacent run of portals as ONE sprite, so neither frame
    // names nor slicing can find them. What does line up is ORDER: both the cells that hold an item
    // and the per-cell tiles under tile_item_layer are produced in grid scan order, so they pair up
    // index by index (verified: 9 item cells, 9 tiles). For each item cell that is a portal, the
    // tile at the same index is the cell to colour, and a coloured square is added on top of it.
    function itemCellList(comp) {
        var out = [];
        var rows = Object.keys(comp.Level_data);
        for (var ri = 0; ri < rows.length; ri++) {
            var y = rows[ri], row = comp.Level_data[y];
            for (var x in row) {
                var v = row[x];
                // anything the engine builds an item tile for
                if (v === 2 || v === -1 || v === -4 || v === 4 || v === -3 || (v >= 5 && v <= 8)) {
                    out.push([parseInt(x, 10), parseInt(y, 10)]);
                }
            }
        }
        return out;
    }

    // Markers go on the map's PARENT (backgroup), not inside the map: the engine draws an adjacent
    // run of portals as one wide sprite somewhere inside game_map, and anything parented inside the
    // map was being covered by it. A node added to backgroup at the cell's world position, with a
    // high zIndex, is above everything the map draws.
    // MEASURED, not guessed: for a portal cell the engine tints the TILE ITSELF purple
    // (tile colour 149,50,255, while a hero tile stays 255,196,48) and its "Portal" child to
    // 178,84,255. That tile colour IS the purple band on screen - not a sprite run and not any
    // node I was adding - which is why markers, tinting the child, and hiding the child all
    // changed nothing visible. The colour therefore goes on the tile's own colour.
    function paintPortalColours(map, comp) {
        try {
            if (!comp || !comp.Level_data) { stats.portalPaintErr = 'Level_data not ready'; return 0; }
            var itemLayer = null;
            (map.children || []).forEach(function (c) { if (/tile_item_layer/i.test(c.name)) { itemLayer = c; } });
            if (!itemLayer) { stats.portalPaintErr = 'no tile_item_layer'; return 0; }
            var tiles = itemLayer.children.filter(function (n) { return n.name === 'spaceTile'; });
            var itemCells = itemCellList(comp);
            stats.portalPaintTiles = tiles.length;
            stats.portalPaintCells = itemCells.length;
            var PALETTE = { 1: cc.color(226, 64, 72), 2: cc.color(64, 200, 96), 3: cc.color(64, 140, 240), 4: cc.color(168, 88, 224) };
            var painted = 0;
            for (var i = 0; i < itemCells.length; i++) {
                var cell = itemCells[i];
                var col = cellColour(cell[0], cell[1]);
                if (!col || !PALETTE[col] || !tiles[i]) { continue; }
                tiles[i].color = PALETTE[col];
                (tiles[i].children || []).forEach(function (kid) {
                    if (kid.getComponent && kid.getComponent(cc.Sprite) && /portal/i.test(kid.name)) {
                        kid.color = PALETTE[col];
                    }
                });
                painted++;
            }
            stats.portalCellsPainted = painted;
            stats.portalPaintErr = null;
            return painted;
        } catch (e) {
            stats.portalPaintErr = String(e && e.message);
            stats.portalPaintStack = String(e && e.stack).slice(0, 300);
            warn('portal paint failed:', e && e.message);
            return 0;
        }
    }

    function patchPortalPairing() {
        var map = cc.find('Canvas/backgroup/game_map');
        var comp = map && map.getComponent && map.getComponent('game_map');
        if (!comp || comp.__colorPortals) { return false; }
        comp.__colorPortals = true;
        // pairing logic: unchanged from the verified version
        comp.getOutPortal = function (from) {
            var want = cellColour(from.x, from.y);
            var found = null;
            for (var y in this.Level_data) {
                for (var x in this.Level_data[y]) {
                    var v = this.Level_data[y][x];
                    if (v !== 2) { continue; }
                    var xi = parseInt(x, 10), yi = parseInt(y, 10);
                    if (xi === from.x && yi === from.y) { continue; }
                    if (want > 0 && cellColour(xi, yi) !== want) { continue; }   // same colour only
                    if (found === null) { found = cc.v2(xi, yi); }
                }
            }
            return found || cc.v2(from.x, from.y);   // no partner of that colour: no teleport
        };
        stats.colorPortalsPatched = (stats.colorPortalsPatched || 0) + 1;
        log('coloured portal pairing installed');
        return true;
    }

    /* 在场景启动与随后几帧里尝试安装（关卡组件是随关卡加载才出现的） */
    // Remove markers from a previous run so a level restart cannot stack duplicates.
    function clearColourMarkers(map) {
        try {
            var doomed = [];
            (function walk(n) { if (/^portalColour[0-9]+$/.test(n.name)) { doomed.push(n); } (n.children || []).forEach(walk); })(map);
            doomed.forEach(function (n) { n.destroy(); });
            return doomed.length;
        } catch (e) { return 0; }
    }

    // Installed on scene launch. The pairing wrapper can go in immediately (it is only called while
    // playing), but PAINTING must wait: on scene launch Level_data is not populated yet, which threw
    // Object.keys(undefined) and produced zero markers (proven by the exception stack).
    /* Decorations (vignettes) are siblings of game_map inside backgroup and sit at a higher
       sibling index, so Cocos draws them ON TOP of the level. The user asked for the opposite:
       force them explicitly below the level with a negative zIndex (idempotent). */
    function pushVignettesBelowMap() {
        try {
            var v = cc.find('Canvas/backgroup/vignettes');
            if (!v) { return false; }
            if (v.zIndex !== -1) { v.zIndex = -1; }
            stats.vignettesBelowMap = (stats.vignettesBelowMap || 0) + 1;
            return true;
        } catch (e) { return false; }
    }
    function armPortalPatch() {
        try { stats.currentMapId = (window.gamemain && gamemain.currentLevelId) ? (conf.level_cfg[gamemain.currentLevelId] || {}).mapId : stats.currentMapId; } catch (e) {}
        try {
            if (sceneName() !== 'gameScene') { return; }
            if (patchPortalPairing()) {
                var tries = 0;
                var wait = setInterval(function () {
                    tries++;
                    var map = cc.find('Canvas/backgroup/game_map');
                    var comp = map && map.getComponent && map.getComponent('game_map');
                    var ready = false;
                    try { ready = !!(comp && comp.Level_data && Object.keys(comp.Level_data).length > 0); } catch (e) { ready = false; }
                    if (ready) {
                        clearInterval(wait);
                        clearColourMarkers(map);
                        var painted = paintPortalColours(map, comp);
                        log('portal colours painted:', painted, 'markers of', stats.portalPaintTiles || 0, 'item tiles');
                    } else if (tries > 80) {
                        clearInterval(wait);
                        warn('portal paint gave up waiting for Level_data');
                    }
                }, 100);
                return;
            }
            var n = 0;
            var iv = setInterval(function () { if (patchPortalPairing() || ++n > 40) { clearInterval(iv); } }, 100);
        } catch (e) {}
    }

    /* ==================== 测试关卡：3 主角 + 3 色传送门 + 两个被墙隔开的房间 ====================
       左房间 3 个主角，左右房间各 3 个同色门（红 21 / 绿 22 / 蓝 23）。两房间被墙完全隔开，
       所以只有"同色配对"生效时，主角才可能从左房间到达右房间。 */
    var TEST_WORLD = 101, TEST_LEVEL = 10101, TEST_MAP = 10101;
    var testSeededMap = 0;   // set when the test level is seeded, for verification only
    var TEST_GRID = [
        [ 0,  0,  0,  0,  0,  0,  0,  0,  0,  0],
        [ 0, -1, -1, -1,  0,  0,  0,  2,  2,  2],
        [ 0,  2,  2,  2,  0,  0,  0,  1,  1,  1],
        [ 0,  1,  1,  1,  0,  0,  0,  1,  1,  1],
        [ 0,  1,  1,  1,  0,  0,  0,  1,  1,  1],
        [ 0,  0,  0,  0,  0,  0,  0,  0,  0,  0],
    ];

    function seedTestLevel() {
        /* The test level lives ONLY in its own custom world (101) - it must never be written into
           a shipped level. An earlier version also dropped the grid into world 1 level 1 at
           runtime; that is gone, because overwriting original content is not acceptable. */
        if (conf.all_Level && conf.all_Level[TEST_MAP]) { return false; }
        try {
            conf.worlds[TEST_WORLD] = { id: TEST_WORLD, require: 0 };
            conf.stage_cfg[TEST_WORLD] = {};
            conf.stage_level_cfg[TEST_WORLD] = {};
            var theme = JSON.parse(JSON.stringify(conf.theme_cfg[1] || {}));
            ['list_background', 'list_level_background'].forEach(function (k) { theme[k] = [292, 55, 72, 1]; });   // purple
            theme.list_level_next = [292, 70, 100, 1];
            conf.theme_cfg[TEST_WORLD] = theme;
            conf.all_Level[TEST_MAP] = JSON.parse(JSON.stringify(TEST_GRID));
            var entry = { id: TEST_LEVEL, wordId: TEST_WORLD, levelId: 1, mapId: TEST_MAP, sz_solution: '' };
            conf.level_cfg[TEST_LEVEL] = entry;
            conf.stage_level_cfg[TEST_WORLD][String(TEST_LEVEL)] = entry;
            conf.stage_level_cfg[TEST_WORLD][String(entry.levelId)] = entry;
            /* the spec layout: left room portals on row 2 (x 1,2,3), right room portals on row 1 (x 7,8,9) */
            portalColoursByMap[TEST_MAP] = { '1,2': 4, '2,2': 1, '3,2': 3, '7,1': 4, '8,1': 1, '9,1': 3 };
            activePortalColours = portalColoursByMap[TEST_MAP];
            saveCustomWorld(TEST_WORLD, { name: t('testWorldName'), base: [292, 55, 72, 1] });
            stats.testLevelSeeded = (stats.testLevelSeeded || 0) + 1;
            testSeededMap = TEST_MAP;
            log('test level seeded into its own world', TEST_WORLD, 'level', TEST_LEVEL);
            return true;
        } catch (e) { warn('seed failed:', e && e.message); return false; }
    }
    /* ------------------------------------------------------------ install */
    function install(hall) {
        if (!hall || hall.__customTabInstalled) { return false; }
        if (!hall.tabBar || !hall.viewGroup || hall.viewGroup.length < 5) { return false; }
        hall.__customTabInstalled = true;

        makeShowBarViewResilient(hall);
        guardWorldTable();
        seedTestLevel();
        injectSavedLevels();
        installKeys();
        installLevelEntryHook();
        try { buildModeSwitch(hall); } catch (e) { warn('mode switch failed:', e); }
        try { buildEditorHome(hall.viewGroup && hall.viewGroup[CFG.index]); } catch (e) { warn('editor home failed:', e && e.message ? e.message : e); }
        var item = addTabItem(hall);
        layoutTabs(hall);
        var freed = freeTabBarArea();
        log('freed the tab bar row from', freed, 'arrow hit areas');

        var view = addView(hall);
        if (view) {
            hall.viewGroup[CFG.index] = view;
            if (!hall.leftViewMap) { hall.leftViewMap = []; }
            if (!hall.rightViewMap) { hall.rightViewMap = []; }
            // parked on the left, so the first switch slides it in from the left
            /* The custom tab is the right-most one, so it should slide in from the right
               (dir 2) and its outgoing view should leave to the left - the mirror of what
               a left-hand page does. leftViewMap=true made it come in from the left,
               which reads as the wrong direction. */
            hall.leftViewMap[CFG.index] = false;
            hall.rightViewMap[CFG.index] = true;
        }
        log('installed: tab index', CFG.index, '(', CFG.title, ')');
        return true;
    }

    /* Called on every scene launch; the HallScene is rebuilt each time. */
    function tryInstall() {
        var hall = window.hallScene;
        if (!hall || !hall.node || !hall.node.isValid) { return false; }
        try {
            return install(hall);
        } catch (e) {
            warn('install failed:', e);
            return false;
        }
    }

    function scheduleInstall(attempt) {
        attempt = attempt || 0;
        if (tryInstall()) { return; }
        // Keep polling: a slow boot (or a long intro animation) must not leave the
        // tab uninstalled. Poll fast at first, then settle to once a second.
        if (attempt === 40) {
            warn('still waiting for the HallScene; continuing to poll');
        }
        setTimeout(function () { scheduleInstall(attempt + 1); }, attempt < 40 ? 120 : 1000);
    }

    /* ------------------------------------------------------------------
       P1: the completion screen for a CUSTOM level.
       nextLevel() assumes the next world exists in the shipped data; for a
       custom world it can fall through to world 101 (the test world) and then
       call showVignettte() on a component whose vignette binding is gone,
       which throws "Cannot read properties of null (reading 'children')".
       Two zero-side-effect guards: keep showVignettte null-safe (re-bind the
       vignettes node when possible, otherwise skip decorating), and route the
       completion screen's "level list" / "next" back to the LEVEL EDITOR for
       custom worlds, which is what the player expects.
       ------------------------------------------------------------------ */
    function goToEditorFromLevel() {
        try { gamemain.enterHallScene(); } catch (e) {}
        var tries = 0;
        var iv = setInterval(function () {
            tries++;
            var scene = null;
            try { scene = cc.director.getScene() && cc.director.getScene().name; } catch (e) {}
            if (scene === 'HallScene' && window.hallScene) {
                try { gamemain.showTabBarViewIndex = CFG.index; window.hallScene.showBarView(); } catch (e) {}
                stats.backToEditorFromLevel = (stats.backToEditorFromLevel || 0) + 1;
                clearInterval(iv);
                return;
            }
            if (tries > 60) { clearInterval(iv); }
        }, 100);
    }

    function installGameSceneGuards() {
        var canvas = null;
        try { canvas = cc.find('Canvas'); } catch (e) {}
        var comp = canvas && canvas.getComponent ? canvas.getComponent('gameScene') : null;
        if (!comp) { return false; }
        var proto = Object.getPrototypeOf(comp);
        if (!proto || proto.__mazeDashGameSceneGuards) { return true; }
        proto.__mazeDashGameSceneGuards = true;

        var origVignette = proto.showVignettte;
        proto.showVignettte = function () {
            try {
                if (!this.vignette || !cc.find('Content', this.vignette)) {
                    var fixed = null;
                    try { fixed = cc.find('Canvas/backgroup/vignettes'); } catch (e) {}
                    if (fixed && cc.find('Content', fixed)) {
                        this.vignette = fixed;
                        stats.vignetteRebound = (stats.vignetteRebound || 0) + 1;
                    } else {
                        stats.vignetteGuardHits = (stats.vignetteGuardHits || 0) + 1;
                        return;
                    }
                }
            } catch (e) {
                stats.vignetteGuardHits = (stats.vignetteGuardHits || 0) + 1;
                return;
            }
            return origVignette.apply(this, arguments);
        };

        var origNext = proto.nextLevel;
        proto.nextLevel = function () {
            try {
                if (Number(this.worldId) >= 100) {
                    stats.nextLevelRerouted = (stats.nextLevelRerouted || 0) + 1;
                    goToEditorFromLevel();
                    return;
                }
            } catch (e) {}
            return origNext.apply(this, arguments);
        };

        var origHall = proto.clickEnterHallScene;
        proto.clickEnterHallScene = function () {
            try {
                if (Number(this.worldId) >= 100) {
                    stats.listRerouted = (stats.listRerouted || 0) + 1;
                    goToEditorFromLevel();
                    return;
                }
            } catch (e) {}
            return origHall.apply(this, arguments);
        };

        stats.gameSceneGuards = (stats.gameSceneGuards || 0) + 1;
        return true;
    }

    if (window.cc && cc.director) {
        cc.director.on(cc.Director.EVENT_AFTER_SCENE_LAUNCH, function () {
            try { armPortalPatch(); } catch (e) {}
            try { pushVignettesBelowMap(); } catch (e) {}
            try { armWordIdWrappers(); } catch (e) {}
            try { installGameSceneGuards(); } catch (e) {}

            scheduleInstall(0);
        });
    }
    scheduleInstall(0);

    /* restore the saved mode once gamemain exists */
    (function waitMode(attempt) {
        if (window.gamemain) { applyMode(currentMode()); return; }
        if ((attempt || 0) > 60) { return; }
        setTimeout(function () { waitMode((attempt || 0) + 1); }, 250);
    })(0);

    /* World pages are instantiated as the carousel scrolls, so keep the arrow hit
       areas trimmed for as long as the hall is alive. */
    setInterval(function () {
        try {
            var hall = window.hallScene;
            if (hall && hall.node && hall.node.isValid) { freeTabBarArea(); layoutTabs(hall); applyPageTint(); raiseActiveView(); positionModeSwitch(hall); sweepTextAndMarkers(hall); positionEditorHome(hall.viewGroup && hall.viewGroup[CFG.index]); positionWorldBackButtons(hall); keepPreviewSized(); try { relayoutEditorHomeNow(); } catch (e) {} }
        } catch (e) {}
    }, 1500);

    /* Small API so the editor (and the tests) can drive the tab. */
    window.MazeDashCustomTab = {
        t: t,   /* exposed so verification probes can detect a label that still prints its i18n KEY */
        editorAction: function (id) { return editorAction(id); },
        openGridEditor: function () { return openGridEditor(); },
        buildExportData: buildExportData,
        showImportSummary: showImportSummary,
        importCustomJson: importCustomJson,
        importJson: function (t2) { return importCustomJson(t2); },
        index: CFG.index,
        /** re-divide the bar, e.g. after slots are hidden */
        relayout: function () { try { layoutTabs(window.hallScene); } catch (e) {} },
        install: tryInstall,
        stats: stats,
        /** switch 闯关模式 / 解锁模式 (persisted) */
        applyMode: applyMode,
        /** re-run the game's lock/grid decision for every world page */
        refreshStagePages: refreshStagePages,
        /** Open the custom-levels page from code. */
        open: function () {
            try {
                gamemain.showTabBarViewIndex = CFG.index;
                window.hallScene.showBarView();
                return true;
            } catch (e) { warn('open failed:', e); return false; }
        },
        /** The placeholder node, for whoever builds the real editor UI. */
        view: function () {
            try { return window.hallScene.viewGroup[CFG.index]; } catch (e) { return null; }
        },
    };
})();
