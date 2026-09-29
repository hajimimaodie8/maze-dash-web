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
        if ('useSystemFont' in label) { label.useSystemFont = true; }
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
        hall.showBarView = function () {
            try {
                return orig.apply(this, arguments);
            } catch (e) {
                stats.showBarViewRetries = (stats.showBarViewRetries || 0) + 1;
                log('showBarView threw (retrying once):', e && e.message);
                return orig.apply(this, arguments);
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
                     tileNewLevel: 'New level', tileMoveLevels: 'Move in', createFailed: 'Could not create', previewWorld: 'Preview worlds', previewLevel: 'Preview levels', exportJson: 'Export JSON', noWorldsYet: 'No worlds created yet', deleteWorld: 'Delete world', confirmDeleteWorld: 'Delete this world?', confirmDelete: 'Delete', backToEditor: 'Editor', emptyHint: 'Create one from the editor' },
        'zh-Hans': { mode: '模式', progression: '闯关模式', unlocked: '解锁模式',
                     customTitle: '关卡编辑器', customHint: '开发中', editorTitle: '关卡编辑器', createWorld: '创建新世界', createLevel: '创建新关卡', comingSoon: '即将推出',
                     worldName: '世界名称', themeColour: '主题色', hexHint: '也可以在下面直接输入颜色代码', confirm: '创建', cancel: '取消', untitledWorld: '新世界', moveLevels: '转移关卡至本世界',
                     tileNewLevel: '新建关卡', tileMoveLevels: '移入关卡', createFailed: '创建失败', previewWorld: '预览已编辑的世界', previewLevel: '预览已编辑的关卡', exportJson: '导出 JSON', noWorldsYet: '还没有创建任何世界', deleteWorld: '删除世界', confirmDeleteWorld: '是否确认删除此世界？', confirmDelete: '确认删除', backToEditor: '返回编辑器', emptyHint: '在编辑器里创建一个世界' },
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
        var H_BOTTOM_ROW = 210;   // one row above the two big corner buttons
        [{ id: 'previewWorld', key: 'previewWorld', x: -470 },
         { id: 'previewLevel', key: 'previewLevel', x: 0 },
         { id: 'exportJson', key: 'exportJson', x: 470 }].forEach(function (s) {
            var btn = new cc.Node('editorSmall_' + s.id);
            btn.parent = view;
            btn.setContentSize(600, 150);
            btn.x = s.x * 1.28;
            btn.y = -H_BOTTOM_ROW;
            roundedPanel(btn, cc.color(60, 54, 66, 235), 600, 150);
            var lb = makeLabel(btn, t(s.key), 0, 32, cc.color(255, 255, 255, 235));
            lb.name = 'editorSmallLabel_' + s.id;
            btn.on(cc.Node.EventType.TOUCH_START, function () { pressFeedback(btn, true); });
            btn.on(cc.Node.EventType.TOUCH_CANCEL, function () { pressFeedback(btn, false); });
            btn.on(cc.Node.EventType.TOUCH_END, function () { pressFeedback(btn, false); editorAction(s.id); });
        });
        animateIn(view);
    }

    var PREVIEW_NAME = 'editorPreview';
    var previewRootRef = null;   // direct handle: closing must not depend on a find()
    function closePreview() {
        var host = cc.find('Canvas');
        var p = host && host.getChildByName(PREVIEW_NAME);
        if (p && p.isValid) { p.destroy(); }
        return !!p;
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
                tile.on(cc.Node.EventType.TOUCH_END, function () { pressFeedback(tile, false); editorAction(s.id); });
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
            if (k) { gamemain.enterEnterGameScene(cfg[k].id); }
        } catch (e) { warn('preview level failed:', e && e.message); }
    }

    function exportCustomJson() {
        try {
            var data = { version: 1, note: 'Maze Dash custom worlds/levels', worlds: customWorlds(), levels: {}, maps: {} };
            Object.keys(customWorlds()).forEach(function (wid) {
                var cfg = conf.stage_level_cfg[wid] || {};
                Object.keys(cfg).forEach(function (k) {
                    data.levels[k] = cfg[k];
                    data.maps[cfg[k].mapId] = conf.all_Level[cfg[k].mapId];
                });
            });
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

    function editorAction(id) {
        stats.editorAction = id;
        if (id === 'createWorld') { openCreateWorldDialog(window.hallScene); return; }
        if (id === 'previewWorld') { previewCustomWorld(); return; }
        if (id === 'previewLevel') { previewCustomLevel(); return; }
        if (id === 'exportJson') { exportCustomJson(); return; }
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
        var W = visibleWidth(), H = visibleHeight();
        ['createWorld', 'createLevel'].forEach(function (id, i) {
            var btn = view.getChildByName('editorBtn_' + id);
            if (!btn || !btn.isValid) { return; }
            var bx = (i === 0 ? -1 : 1) * (W / 2 - 60 - btn.width / 2);
            var by = -H / 2 + 60 + btn.height / 2;
            if (Math.abs(btn.x - bx) > 1 || Math.abs(btn.y - by) > 1) { btn.x = bx; btn.y = by; }
        });
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
        /* A neutral ASCII caption: the localised CJK hint rendered as garbage here (the
           label fell back to the Latin-only font), and a garbled hint is worse than none. */
        makeLabel(panel, 'Hex', 0, -212, 20, cc.color(255, 255, 255, 190)).name = 'dlgHexHint';
        var hexBox = makeEditBox(panel, 'hexInput', 0, -244, 300, 56, '#RRGGBB', 26, true);   // centred, no box
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
            tile.on(cc.Node.EventType.TOUCH_END, function () { pressFeedback(tile, false); editorAction(s.id); });
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
    /* ------------------------------------------------------------ install */
    function install(hall) {
        if (!hall || hall.__customTabInstalled) { return false; }
        if (!hall.tabBar || !hall.viewGroup || hall.viewGroup.length < 5) { return false; }
        hall.__customTabInstalled = true;

        makeShowBarViewResilient(hall);
        guardWorldTable();
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
            if (hall && hall.node && hall.node.isValid) { freeTabBarArea(); layoutTabs(hall); applyPageTint(); raiseActiveView(); positionModeSwitch(hall); dropBuildMarker(); applyTexts(); followVisibleWorld(hall); positionEditorHome(hall.viewGroup && hall.viewGroup[CFG.index]); positionWorldBackButtons(hall); keepPreviewSized(); }
        } catch (e) {}
    }, 1500);

    /* Small API so the editor (and the tests) can drive the tab. */
    window.MazeDashCustomTab = {
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
