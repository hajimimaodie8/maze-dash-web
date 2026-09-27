/*
 * 冲撞迷阵 Maze Dash — 清静模式 (quiet mode)
 * ===========================================================================
 * The Android build is wrapped in ads, IAP, gift popups, "rate us", quest
 * congratulations and world-unlock interruptions. None of that belongs in this
 * port, so this module silences them and unlocks everything.
 *
 * It never edits the game code: every entry point is a method on the global
 * `gamemain` object, so replacing those methods is enough. Callbacks passed to a
 * popup are forwarded immediately, otherwise the calling flow would stall
 * waiting for a dialog that never appears.
 *
 * What it does:
 *   1. unlocks all 12 faces/skins (the shop's skins), so nothing has to be
 *      bought or watched;
 *   2. silences every popup entry point (tips, alerts, rate-us, quest
 *      congratulations, world unlock / world complete, face unlock, ad calls);
 *   3. stops quests from completing and worlds from raising unlock popups;
 *   4. removes the first-run "+1H infinity ticket" gift popup.
 *
 * Toggle anything in CFG below. Everything it silences is counted in
 * window.MazeDashClean.stats so it can be verified.
 */
(function () {
    'use strict';

    var CFG = {
        unlockAllFaces: true,     // 12 张皮肤全部解锁
        quietPopups: true,        // 封死所有弹窗入口
        quietQuests: true,        // 任务不再弹提示
        quietWorldUnlock: true,   // 世界解锁 / 通关世界不再弹窗
        quietGift: true,          // 关掉首次进入的 +1H 礼包弹窗
        log: true,
    };

    var stats = { silenced: {}, forwardedCallbacks: 0, facesUnlocked: 0, applied: false };

    function log() {
        if (!CFG.log) { return; }
        try { console.log.apply(console, ['[clean-mode]'].concat([].slice.call(arguments))); } catch (e) {}
    }

    /* the last function argument — popups receive their completion callback in
       varying positions, so take whichever one is a function */
    function lastCallback(args) {
        for (var i = args.length - 1; i >= 0; i--) {
            if (typeof args[i] === 'function') { return args[i]; }
        }
        return null;
    }

    function silence(gm, name) {
        if (typeof gm[name] !== 'function') { return false; }
        gm[name] = function () {
            stats.silenced[name] = (stats.silenced[name] || 0) + 1;
            var cb = lastCallback(arguments);
            if (cb) {
                stats.forwardedCallbacks++;
                try { cb(); } catch (e) { log('forwarded callback threw:', e); }
            }
        };
        gm[name].__cleanMode = true;
        return true;
    }

    /* ---------------------------------------------------------- face unlock */
    function unlockAllFaces(gm) {
        var ids = [];
        try {
            var cfg = window.conf && conf.face_cfg;
            if (cfg) {
                ids = Object.keys(cfg).map(Number).filter(function (n) { return !isNaN(n); });
            }
        } catch (e) {}
        if (!ids.length) { ids = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]; }
        ids.sort(function (a, b) { return a - b; });

        try {
            gm.setFaceInfo(ids);
            stats.facesUnlocked = ids.length;
            // make sure something is actually selected
            if (typeof gm.getFace === 'function' && typeof gm.setFace === 'function') {
                var cur = gm.getFace();
                if (cur === null || cur === undefined || ids.indexOf(parseInt(cur, 10)) === -1) {
                    gm.setFace(ids[1] !== undefined ? ids[1] : ids[0]);
                }
            }
            log('unlocked', ids.length, 'faces:', ids.join(','));
        } catch (e) {
            log('face unlock failed:', e);
        }
    }

    /* ------------------------------------------------------------- install */
    function apply() {
        var gm = window.gamemain;
        if (!gm) { return false; }
        if (gm.__cleanModeApplied) { return true; }
        gm.__cleanModeApplied = true;

        if (CFG.unlockAllFaces) { unlockAllFaces(gm); }

        if (CFG.quietPopups) {
            // generic dialogs
             /* showGameAlert is deliberately NOT silenced: the game uses it as a
                flow gate, not decoration. In-level "back to main" calls it with a
                confirmation whose OK callback performs the actual quit, so
                silencing it made that button do nothing at all. (Found by tracing
                gameScene.clickEnterHallScene.) */
             ['showTips', 'showModalBox', 'showRateUs',
             // progression interruptions
             'showWorldCompleted', 'showUnlockWorld', 'showFaceUnlock',
             'showQuestTick', 'showCompleteQuest',
             /* The ad / iap entry points are deliberately NOT silenced: the game's own
                implementations already no-op safely without the jsb bridge (all 12
                native call sites sit in try/catch), and they also maintain the
                engine's own state around the call. Replacing them stalled the
                in-level HUD, which waits on that flow - the bottom buttons stayed
                inactive, so "back to main" could not be clicked. */
             'pay'
            ].forEach(function (n) { silence(gm, n); });
        }

        /* The level's "back to main" asks for confirmation only when the infinity
           ticket has expired. Keep the gift popup suppressed, but report an
           infinity expiry far in the future so quitting is immediate and never
           costs a ticket. */
        if (typeof gm.getInfinityTicketExpiryTime === 'function') {
            gm.getInfinityTicketExpiryTime = function () { return 4102444800000; };   // 2100-01-01
        }

        if (CFG.quietGift) {
            // this is what pops the "+1H" heart window on entering the hall
            if (typeof gm.setInfinityTicketExpiryTime === 'function') {
                gm.setInfinityTicketExpiryTime = function () {
                    stats.silenced.setInfinityTicketExpiryTime =
                        (stats.silenced.setInfinityTicketExpiryTime || 0) + 1;
                };
            }
        }

        if (CFG.quietQuests && typeof gm.checkQuest === 'function') {
            gm.checkQuest = function () {
                stats.silenced.checkQuest = (stats.silenced.checkQuest || 0) + 1;
                return [];      // never report a completed quest → no congratulation popup
            };
        }

        if (CFG.quietWorldUnlock) {
            if (typeof gm.checkNewWorld === 'function') {
                gm.checkNewWorld = function () {
                    stats.silenced.checkNewWorld = (stats.silenced.checkNewWorld || 0) + 1;
                    return null;    // no "world unlocked" popup
                };
            }
            if (typeof gm.checkFaceUnLock === 'function') {
                gm.checkFaceUnLock = function () {
                    stats.silenced.checkFaceUnLock = (stats.silenced.checkFaceUnLock || 0) + 1;
                    return null;    // all faces are already unlocked anyway
                };
            }
        }

        stats.applied = true;
        log('applied. silenced:', Object.keys(stats.silenced).join(', ') || '(none)');
        return true;
    }

    function scheduleApply(attempt) {
        attempt = attempt || 0;
        if (apply()) { return; }
        if (attempt === 40) { log('still waiting for gamemain; continuing to poll'); }
        setTimeout(function () { scheduleApply(attempt + 1); }, attempt < 40 ? 120 : 1000);
    }

    if (window.cc && cc.game) {
        cc.game.once(cc.game.EVENT_GAME_INITED, function () { scheduleApply(0); });
    }
    scheduleApply(0);

    /* Some of the interruptions live on the scene components, not on gamemain:
       HallScene.showRateUs, gameScene.showQuestTick / showCompleteQuest /
       showUnlockWorld / showWorldCompleted. Silence those per scene too. */
    var SCENE_QUIET = {
        HallScene: ['showRateUs'],
        gameScene: ['showQuestTick', 'showCompleteQuest', 'showUnlockWorld', 'showWorldCompleted'],
    };

    /* Two guide/tip nodes get switched on by the game itself, so switching the
       methods off is not enough. Deliberately a short allow-list: hiding anything
       named "*Complete*" would also hide the level-complete panel the player
       needs in order to continue. */
    var NUISANCE_RE = /^(guid_tips|QuestTips)$/i;

    function silenceComponent(comp, names) {
        if (!comp) { return; }
        names.forEach(function (n) {
            if (typeof comp[n] !== 'function' || comp[n].__cleanMode) { return; }
            comp[n] = function () {
                stats.silenced[n] = (stats.silenced[n] || 0) + 1;
                var cb = lastCallback(arguments);
                if (cb) { stats.forwardedCallbacks++; try { cb(); } catch (e) {} }
            };
            comp[n].__cleanMode = true;
            stats.sceneMethods = stats.sceneMethods || [];
            if (stats.sceneMethods.indexOf(n) === -1) { stats.sceneMethods.push(n); }
        });
    }

    /* ================= 删除付费 / 体力 / 爱心相关界面 =================
       全部用「停用节点」实现，索引与数组结构保持原样，因此游戏里对 0 号
       视图、体力计时器等的引用都不会失效。 */
    var HIDE_PROPS = [
        'ticketView',               // 顶部爱心 + 无限体力 + 计时
        'ticketInfinityView',
        'ticketInfinityTimeLabel',
        'ticketNum',                // 体力数字
        'freeHintBtn',              // 看广告补提示
        'freeTicketBtn',            // 看广告补体力
        'HintShopWnd',              // 买提示窗口
        'TicketShopWnd'             // 买体力窗口
    ];
    /* 场景里按名字兜底（关卡内 HUD 的爱心/体力、以及各处「+」购买按钮） */
    var HIDE_NAME_RE = /^(addButton|buyRemoveAd|PopShop|RateUs|Aboutus)$|ticket|infinity|heart/i;

    function hidePurchaseUI() {
        var hall = window.hallScene;
        var hidden = 0;
        if (hall) {
            HIDE_PROPS.forEach(function (k) {
                var n = hall[k];
                if (n && n.isValid && n.active) { n.active = false; hidden++; }
            });
            // 商店那一格整个去掉（Layout 会自动跳过停用的子项）
            var bar = hall.tabBar;
            if (bar && bar.children && bar.children.length > SHOP_INDEX) {
                var shopTab = bar.children[SHOP_INDEX];
                if (shopTab && shopTab.active) { shopTab.active = false; hidden++; }
            }
            var shopView = hall.viewGroup && hall.viewGroup[SHOP_INDEX];
            if (shopView && shopView.isValid && shopView.active) { shopView.active = false; hidden++; }
            // 任何「去商店」的入口都改跳皮肤页，避免进到已删除的页面
            if (typeof hall.openShop === 'function' && !hall.openShop.__cleanMode) {
                hall.openShop = function () {
                    stats.silenced.openShop = (stats.silenced.openShop || 0) + 1;
                    try { gamemain.showTabBarViewIndex = FACE_INDEX; hall.showBarView(); } catch (e) {}
                };
                hall.openShop.__cleanMode = true;
                stats.sceneMethods = stats.sceneMethods || [];
                stats.sceneMethods.push('openShop');
            }
        }
        // 关卡内 HUD：把爱心/体力以及「+」购买按钮关掉
        try {
            var s = cc.director.getScene();
            if (s) {
                (function walk(n) {
                    if (n !== s && n.active && HIDE_NAME_RE.test(n.name)) {
                        n.active = false;
                        hidden++;
                    }
                    (n.children || []).forEach(walk);
                })(s);
            }
        } catch (e) {}
        if (hidden) {
            stats.hiddenNodes = (stats.hiddenNodes || 0) + hidden;
            if (window.MazeDashCustomTab && MazeDashCustomTab.relayout) { MazeDashCustomTab.relayout(); }
        }
        return hidden;
    }

    var SHOP_INDEX = 0;   // 原版最左边的商店
    var FACE_INDEX = 1;   // 皮肤页
    function quietScene() {
        try {
            var s = cc.director.getScene();
            if (!s) { return; }
            if (s.name === 'HallScene') { silenceComponent(window.hallScene, SCENE_QUIET.HallScene); }
            if (s.name === 'gameScene') { silenceComponent(window.gameScene, SCENE_QUIET.gameScene); }
            hidePurchaseUI();
            (function walk(n) {
                if (n !== s && n.active && NUISANCE_RE.test(n.name)) {
                    n.active = false;
                    stats.hiddenNodes = (stats.hiddenNodes || 0) + 1;
                }
                (n.children || []).forEach(walk);
            })(s);
        } catch (e) {}
    }

    if (window.cc && cc.director) {
        cc.director.on(cc.Director.EVENT_AFTER_SCENE_LAUNCH, quietScene);
    }
    setInterval(quietScene, 1200);

    window.MazeDashClean = { config: CFG, stats: stats, apply: apply, quietScene: quietScene };
})();
