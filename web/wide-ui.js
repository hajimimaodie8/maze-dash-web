/*
 * 冲撞迷阵 Maze Dash — 宽屏适配（第二阶段：让游戏内部排版真正撑宽）
 * ===========================================================================
 * Stage 1 (web-port.js CONFIG.wideMode) made the design resolution follow the
 * browser aspect ratio, so the whole window is game space. This module then
 * widens the game's own layout so it *uses* that space:
 *
 *   1. 选关页：世界翻页页、页背景、关卡网格容器、滚动视图与其 Mask 全部撑到视口宽，
 *      然后让游戏自己重算网格 —— 列数 = floor(SV.content.width ÷ 按钮宽)，
 *      所以撑宽后列数会自动变多，关卡数据一行都不用改。
 *   2. 关卡内 HUD：底部按钮条撑宽。
 *   3. 去掉提示/重开按钮上的次数数字，并让次数不再被消耗（点了就能用）。
 *
 * 全部是「停用节点 / 改尺寸 / 覆盖取值函数」，不改游戏代码。
 */
(function () {
    'use strict';

    var CFG = {
        widenSelectPage: true,     // 世界翻页页 + 选关网格撑宽
        widenLevelHud: true,       // 关卡内 HUD：把三颗按钮沿宽度拉开
        hideCountBadges: true,     // 去掉提示/重开按钮上的数字
        unlimitedHints: true,      // 提示不再消耗
        unlimitedRestarts: true,   // 重开不再消耗
        pageMargin: 60,            // 网格与页边的水平留白
        log: true,
    };

    var stats = { pagesWidened: 0, gridsRegenerated: 0, badgesHidden: 0, unlimited: [], lastWidth: 0 };

    function log() {
        if (!CFG.log) { return; }
        try { console.log.apply(console, ['[wide-ui]'].concat([].slice.call(arguments))); } catch (e) {}
    }
    function visibleWidth() {
        try { return Math.max(720, Math.round(cc.view.getVisibleSize().width)); } catch (e) { return 720; }
    }
    function visibleHeight() {
        try { return Math.max(1280, Math.round(cc.view.getVisibleSize().height)); } catch (e) { return 1280; }
    }
    function className(comp) { try { return cc.js.getClassName(comp); } catch (e) { return '?'; } }
    function hasComp(node, name) { return !!(node && node.getComponent && node.getComponent(name)); }

    /* ======================= 1. 提示 / 重开：不消耗 + 去数字 ======================= */
    function makeUnlimited() {
        var gm = window.gamemain;
        if (!gm || gm.__wideUnlimited) { return; }
        gm.__wideUnlimited = true;
        var touched = [];
        function pin(getter, setter, value) {
            if (typeof gm[getter] === 'function') {
                gm[getter] = function () { return value; };
                touched.push(getter);
            }
            if (typeof gm[setter] === 'function') {
                gm[setter] = function () {};
                touched.push(setter);
            }
        }
        if (CFG.unlimitedHints) { pin('getHintCount', 'setHintCount', 9999); }
        if (CFG.unlimitedRestarts) {
            // the restart counter's accessor name is not fixed, so match by pattern
            Object.keys(gm).forEach(function (k) {
                if (typeof gm[k] !== 'function' || k === 'getHintCount' || k === 'setHintCount') { return; }
                if (/^(get|is)/.test(k) && /(restart|again|replay)/i.test(k)) { gm[k] = function () { return 99; }; touched.push(k); }
                else if (/^set/.test(k) && /(restart|again|replay)/i.test(k)) { gm[k] = function () {}; touched.push(k); }
            });
        }
        stats.unlimited = touched;
        log('unlimited:', touched.join(', ') || '(none)');
    }

    function hideOneBadge(n) {
        if (n && n.isValid && n.active) { n.active = false; stats.badgesHidden++; return 1; }
        return 0;
    }

    function hideCountBadges() {
        var scene = cc.director.getScene();
        if (!scene) { return 0; }
        var hidden = 0;
        (function walk(n) {
            var name = n.name;
            var parentName = n.parent ? n.parent.name : '';
            // btn_hint/count, btn_restart/count, level_failed/.../btn_restart/num, ticket/num
            if ((name === 'count' || name === 'num') &&
                (/^btn_/.test(parentName) || /ticket/i.test(parentName))) {
                hidden += hideOneBadge(n);
            }
            if (CFG.hideCountBadges && /^moveHintRoot$/.test(parentName) && name === 'noHintLabel') { /* keep the "no hints" text hidden by the game */ }
            (n.children || []).forEach(walk);
        })(scene);
        return hidden;
    }

    /* ============================ 2. 选关页撑宽 ============================ */
    /* The grid is authored 720 wide. Widening the container and letting the game
       recompute the grid (columns = floor(contentWidth / buttonWidth)) is enough,
       so no level data changes. */
    /* The pager that hosts the world pages was still 720 wide and, worse, its
       "view" node carries a cc.Mask of 720x1280 - that single Mask clipped the
       whole level-select (and the view backgrounds) to a phone-sized strip in the
       middle of a wide window, and it is also why dragging looked like a 720
       window sliding over a 2048 page. Widen the pager chrome too. */
    function widenPageChrome(page, W) {
        if (!page || !page.isValid) { return 0; }
        var n = 0;
        ['scrollview', 'scrollView'].forEach(function (name) {
            var sv = page.getChildByName(name);
            if (!sv || !sv.isValid) { return; }
            if (sv.width < W) { sv.width = W; n++; }
            var view = sv.getChildByName('view');
            if (view && view.isValid && view.width < W) { view.width = W; n++; }
            var bg = sv.getChildByName('background');
            if (bg && bg.isValid && bg.width < W) { bg.width = W; n++; }
        });
        return n;
    }
    function widenSelectPage() {
        var W = visibleWidth();
        var sv = cc.find('Canvas/gameView/scrollView');
        var scv = sv ? sv.getComponent(cc.ScrollView) : null;
        var content = scv ? scv.content : null;
        if (!content) { return 0; }

        (window.hallScene.viewGroup || []).forEach(function (v) { widenPageChrome(v, W); });

        var pages = (content.children || []).filter(function (p) { return hasComp(p, 'StageSelectLayer'); });
        if (!pages.length) { return 0; }

        var n = content.children.length;
        var changed = 0;

        // spread the pages across the new width
        content.width = W * n;
        content.children.forEach(function (p, i) {
            p.width = W;
            p.x = -content.width / 2 + W / 2 + W * i;
        });

        pages.forEach(function (page) {
            var c = page.getComponent('StageSelectLayer');
            if (!c) { return; }
            var first = page.__wideW !== W;
            if (first) {
                page.__wideW = W;
                changed++;
                stats.pagesWidened++;
            }
            var grid = W - CFG.pageMargin * 2;

            // page background must cover the whole page, otherwise the grid spills
            if (c.BgLayer && c.BgLayer.isValid) {
                c.BgLayer.width = Math.max(c.BgLayer.width, W);
                c.BgLayer.x = 0;
            }
            // navigation arrows sit on the page edges
            if (c.LeftButton && c.LeftButton.node) { c.LeftButton.node.x = -(W / 2 - 46); }
            if (c.RightButton && c.RightButton.node) { c.RightButton.node.x = (W / 2 - 46); }

            // the grid container, its Layout host, the scroll view, its mask and content
            var containers = [c.SelectLevelLayer, c.SV ? c.SV.node : null, c.SV ? c.SV.content : null];
            if (c.SelectLevelLayer && c.SelectLevelLayer.parent && hasComp(c.SelectLevelLayer.parent, cc.Layout)) { containers.push(c.SelectLevelLayer.parent); }
            containers.forEach(function (node) {
                if (node && node.isValid && node !== page) {
                    if (node.width < grid) { node.width = grid; }
                    node.x = node.x;   // keep the authored x, containers are centred
                }
            });
            // The Mask that clips the scrolling grid sits on SV.content.parent (named
            // "view"); widening only the content leaves the buttons clipped away.
            var maskHosts = [];
            if (c.SV && c.SV.content && c.SV.content.parent) { maskHosts.push(c.SV.content.parent); }
            if (c.SV && c.SV.node && c.SV.node.parent) { maskHosts.push(c.SV.node.parent); }
            maskHosts.forEach(function (mh) {
                if (mh && mh.isValid && mh.width < grid) { mh.width = grid; }
                if (mh && mh.isValid && mh.parent && mh.parent.isValid && mh.parent !== page && mh.parent.width < grid) { mh.parent.width = grid; }
                if (mh && mh.isValid && mh.parent && mh.parent.isValid) {
                    var lay = mh.parent.getComponent(cc.Layout);
                    if (lay && lay.updateLayout) { lay.updateLayout(); }
                }
            });

            if (first) {
                // the game does not clear its own buttons, so drop the old ones first
                var host = (c.SelectLevelLayer && c.SelectLevelLayer.parent && hasComp(c.SelectLevelLayer.parent, cc.Layout))
                    ? c.SelectLevelLayer.parent : c.SelectLevelLayer;
                if (host) {
                    (host.children || []).slice().forEach(function (ch) {
                        if (hasComp(ch, 'LevelButton')) { ch.removeFromParent(); }
                    });
                }
                // Ask the game to decide: showLockLayer() shows the lock panel for a
                // world that is still locked and only then calls updateUnlockLayer().
                // Calling updateUnlockLayer() directly forced locked worlds to render
                // their level grid, which is the leak that was reported.
                try {
                    c.showLockLayer();
                    stats.gridsRegenerated++;
                } catch (e) {
                    log('showLockLayer failed:', e);
                }
            }
        });
        return changed;
    }

    /* ============================ 3. 关卡内 HUD 撑宽 ============================ */
    function widenLevelHud() {
        var gs = window.gameScene;
        if (!gs || !gs.node || !gs.node.isValid) { return 0; }
        var W = visibleWidth();
        var changed = 0;
        // the gameScene component lives on the Canvas node, so resolve from the scene root
        var back = cc.find('Canvas/backgroup') || cc.find('backgroup', gs.node);
        if (back && back.isValid) {
            /* The bottom row is a Layout with resizeMode = CHILDREN, so widening the
               node itself does nothing - it resizes back. Spreading the children via
               spacingX is what actually works. */
            var bar = back.getChildByName('button_group');
            if (bar && bar.isValid) {   // re-apply every tick: the buttons can activate later
                bar.__wideW = W;
                var spread = Math.round((W - 300) / 2);
                var layout = bar.getComponent(cc.Layout);
                if (layout) {
                    layout.spacingX = spread;
                    layout.updateLayout();
                }
                // Position them directly as well: the row's Layout lives on a parent
                // in some builds, and a direct write is what actually sticks.
                var shown = (bar.children || []).filter(function (k) { return k.activeInHierarchy; });
                var mid = Math.floor(shown.length / 2);
                shown.forEach(function (k, i) { k.x = (i - mid) * spread; });
                changed++;
            }
            // the level title row follows the width too
            var top = back.getChildByName('top');
            if (top && top.isValid && top.__wideW !== W) {
                top.__wideW = W;
                if (top.width < W) { top.width = W; }
                var tl = top.getComponent(cc.Layout);
                if (tl && tl.updateLayout) { tl.updateLayout(); }
                changed++;
            }
        }
        return changed;
    }

    /* ====================== 4. 启动图：去 logo、两侧留白 ======================
       LaunchScene 的相机底色本来就是白的，是移植层的背景色把它盖成了主题青绿。
       这里把相机底色按回白色，并把那张 720 宽的底图撑满视口宽度，
       同时隐藏出版商的启动图（spriteFrame 名 launchImg，节点名 New Sprite）。 */
    var LAUNCH_LOGO_RE = /launchImg|cmcm|cheetah|publisher/i;

    function fixLaunchScreen() {
        var scene = cc.director.getScene();
        if (!scene || scene.name !== 'LaunchScene') { return 0; }
        var W = visibleWidth();
        var done = 0;
        try {
            var cam = cc.Camera.main || (cc.Camera.cameras && cc.Camera.cameras[0]);
            if (cam && cam.backgroundColor) {
                if (cam.backgroundColor.r !== 255 || cam.backgroundColor.g !== 255 || cam.backgroundColor.b !== 255) {
                    cam.backgroundColor = cc.color(255, 255, 255, 255);
                    done++;
                }
            }
        } catch (e) {}
        (function walk(n) {
            var sp = n.getComponent && n.getComponent(cc.Sprite);
            var frame = sp && sp.spriteFrame ? sp.spriteFrame.name : '';
            // the publisher's launch image
            if (n.activeInHierarchy && (LAUNCH_LOGO_RE.test(frame) || (n.name === 'New Sprite' && n.parent && /Splash/i.test(n.parent.name)))) {
                n.active = false;
                stats.launchLogoHidden = (stats.launchLogoHidden || 0) + 1;
                done++;
            }
            // the white splash fill must cover the whole width, not just 720
            if (n.activeInHierarchy && frame === 'default_sprite_splash' && n.width < W && n.height > 400) {
                n.width = W;
                n.x = 0;
                done++;
            }
            (n.children || []).forEach(walk);
        })(scene);
        return done;
    }
    /* ================================ 周期应用 ================================ */
    function apply() {
        var W = visibleWidth();
        fixLaunchScreen();
        makeUnlimited();
        if (CFG.hideCountBadges) { hideCountBadges(); }
        if (CFG.widenSelectPage && window.hallScene && window.hallScene.node && window.hallScene.node.isValid) {
            widenSelectPage();
        }
        if (CFG.widenLevelHud) { widenLevelHud(); }
        stats.lastWidth = W;
    }

    if (window.cc && cc.director) {
        cc.director.on(cc.Director.EVENT_AFTER_SCENE_LAUNCH, function () { setTimeout(apply, 400); });
    }
    setTimeout(apply, 800);
    // re-check: window resizes, pages created lazily, and the game re-showing labels
    setInterval(apply, 1200);
    // the launch screen is short lived; repaint it quickly so the port's themed
    // background cannot win the race on the frames that matter
    setInterval(fixLaunchScreen, 250);

    window.MazeDashWide = { config: CFG, stats: stats, apply: apply, widenSelectPage: widenSelectPage };
})();
