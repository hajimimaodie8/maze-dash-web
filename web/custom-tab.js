/*
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
        label.lineHeight = Math.round(fontSize * 1.35);
        label.fontFamily = 'system-ui, -apple-system, "Segoe UI", "Microsoft YaHei", sans-serif';
        if ('useSystemFont' in label) { label.useSystemFont = true; }
        node.color = color || cc.color(255, 255, 255, 255);
        return node;
    }

    /* ------------------------------------------------- 1. the 6th tab item */
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
        if (bottom) { bottom.width = W; bottom.x = 0; bottom.y = -visibleHeight() / 2 + bottom.height / 2; }
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
                icon.width = CFG.iconNodeSize;
                icon.height = CFG.iconNodeSize;
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
        buildModeSelector(view);
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
        buildModeSelector(view);
        return view;
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

    function buildModeSelector(view) {
        var modes = [
            { id: 'progression', label: '闯关模式', desc: '按进度解锁（默认）' },
            { id: 'unlocked', label: '解锁模式', desc: '全关卡解锁（便于调试）' },
        ];
        var active = currentMode();
        var buttons = [];
        var y = -170;

        makeLabel(view, '模式选择', y + 70, 30, cc.color(255, 255, 255, 230)).name = 'modeTitle';

        modes.forEach(function (m, i) {
            var node = new cc.Node('mode_' + m.id);
            node.parent = view;
            node.y = y - i * 100;
            node.width = 420;
            node.height = 84;

            var bg = node.addComponent(cc.Sprite);
            if (view.__whiteFrame) { bg.spriteFrame = view.__whiteFrame; }
            bg.sizeMode = cc.Sprite.SizeMode.CUSTOM;
            bg.type = cc.Sprite.Type.SIMPLE;
            node.color = (m.id === active) ? cc.color(124, 107, 242, 255) : cc.color(255, 255, 255, 46);

            var label = makeLabel(node, m.label + '   ' + m.desc, 0, 22, cc.color(255, 255, 255, 235));
            label.name = 'label';

            node.on(cc.Node.EventType.TOUCH_END, function () {
                applyMode(m.id);
                buttons.forEach(function (b) {
                    b.node.color = (b.id === m.id) ? cc.color(124, 107, 242, 255) : cc.color(255, 255, 255, 46);
                });
            });
            buttons.push({ id: m.id, node: node });
        });

        makeLabel(view, '解锁模式只影响本机显示，不改动关卡数据', y - modes.length * 100 - 10, 20, cc.color(255, 255, 255, 160)).name = 'modeHint';
        return buttons;
    }
    /* ------------------------------------------------------------ install */
    function install(hall) {
        if (!hall || hall.__customTabInstalled) { return false; }
        if (!hall.tabBar || !hall.viewGroup || hall.viewGroup.length < 5) { return false; }
        hall.__customTabInstalled = true;

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
            hall.leftViewMap[CFG.index] = true;
            hall.rightViewMap[CFG.index] = false;
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

    if (window.cc && cc.director) {
        cc.director.on(cc.Director.EVENT_AFTER_SCENE_LAUNCH, function () {
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
            if (hall && hall.node && hall.node.isValid) { freeTabBarArea(); layoutTabs(hall); }
        } catch (e) {}
    }, 1500);

    /* Small API so the editor (and the tests) can drive the tab. */
    window.MazeDashCustomTab = {
        index: CFG.index,
        /** re-divide the bar, e.g. after slots are hidden */
        relayout: function () { try { layoutTabs(window.hallScene); } catch (e) {} },
        install: tryInstall,
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
