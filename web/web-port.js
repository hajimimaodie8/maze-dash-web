/*
 * 冲撞迷阵 Maze Dash — web port adaptations
 * ===========================================================================
 * Loaded AFTER cocos2d-js.js and BEFORE main.js (see index.html).
 *
 * The APK's game logic (src/project.js) is used completely unmodified. Only the
 * four Android-only service integrations it calls through
 * `jsb.reflection.callStaticMethod(...)` are unavailable in a browser:
 *
 *     setGameLanguage  vibrate  show/hidden BannerAd  show/hidden NativeAd
 *     showInterstitialAd  showVideoAd  checkIsGDPREnforcedCountry  pay
 *
 * Every one of those call sites is wrapped in `try { ... } catch (e) {}` in the
 * shipped bundle, and we deliberately leave the global `jsb` undefined, so each
 * of them degrades to a silent no-op. That means: no ads, no IAP, no vibration,
 * no GDPR prompt — exactly what a web port should do.
 *
 * The one thing that DOES need adjusting is the ticket economy, because the
 * APK used rewarded ads and IAP to refill it: see applyEconomy() below.
 */
(function () {
    'use strict';

    var PORT = (window.MazeDashPort = window.MazeDashPort || {});
    PORT.version = '1.1.0';
    PORT.engine = 'Cocos Creator 2.0.2 (web build)';

    /* =====================================================================
     * 0. Shell / display configuration  ——  想改什么改这里
     * ===================================================================== */
    var CONFIG = {
        /* 你的 GitHub 仓库。留空字符串 ('') 就不显示任何角标与链接。 */
        repo: 'https://github.com/hajimimaodie8/maze-dash-web',
        repoLabel: 'maze-dash-web',
        repoBadge: true,
        /* 角标位置：
         *   'auto'       → 有留白时放留白里（不挡游戏），否则放左上角
         *   'margin'     → 只放留白里，没有留白就隐藏
         *   'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'  → 强制指定
         */
        repoBadgePosition: 'auto',

        /* 画面适配：
         *   'auto'    → 比 9:16 更宽（桌面横屏）时完整显示，否则铺满宽度（推荐）
         *   'contain' → 永远完整显示，多出来的地方用主题底色填充
         *   'width'   → 永远铺满宽度，高度自适应（手机竖屏最贴合原版）
         *   'height'  → 永远铺满高度，宽度自适应
         *   'cover'   → 铺满整个窗口，可能裁掉边缘（有风险）
         *   'stretch' → 拉伸填满，会变形
         */
        fit: 'auto',
        wideMode: true,        // 宽窗口：设计分辨率跟着窗口宽高比变宽（否则 720 竖条居中）

        /* 游戏外围留白的颜色：'auto' = 跟随当前场景/世界的主题底色 */
        background: 'auto',
        backgroundFallback: '#1d7a5f',

        designWidth: 720,
        designHeight: 1280,
    };
    PORT.config = CONFIG;

    // Creator 2.0 exposes these as cc.ResolutionPolicy (cc.macro.ResolutionPolicy
    // does not exist in this version).
    var RP = cc.ResolutionPolicy || (cc.macro && cc.macro.ResolutionPolicy) || {};

    function frameSize() {
        try {
            var s = cc.view.getFrameSize();
            if (s && s.width && s.height) { return s; }
        } catch (e) {}
        return { width: window.innerWidth || 1, height: window.innerHeight || 1 };
    }

    function policyForWindow() {
        var fs = frameSize();
        var aspect = fs.width / fs.height;
        var design = CONFIG.designWidth / CONFIG.designHeight;
        switch (CONFIG.fit) {
            case 'contain': return RP.SHOW_ALL;
            case 'cover': return RP.NO_BORDER;
            case 'stretch': return RP.EXACT_FIT;
            case 'width': return RP.FIXED_WIDTH;
            case 'height': return RP.FIXED_HEIGHT;
            default:
                // 'auto': the game's own layouts are a centred 720-wide column no
                // matter what the policy is, so:
                //   narrower/taller than 9:16 (phone) -> fill the width, and let
                //     the canvas grow vertically so the UI reaches the screen
                //     edges (this is also how the Hall is authored);
                //   wider than 9:16 (desktop) -> show everything and paint the
                //     area beside it with the scene's own background colour.
                return aspect > design + 0.02 ? RP.SHOW_ALL : RP.FIXED_WIDTH;
        }
    }

    var layoutListeners = [];
    var activePolicy = null;

    /* Wide mode: keep the design 1280 tall but let it be as wide as the window's
       aspect ratio. Then the whole browser window is game space - nothing is
       letterboxed, nothing is cropped, and the scale stays uniform - and the UI
       can be laid out across the full width. Falls back to the authored 720 x
       1280 whenever the window is not wider than that. */
    /* Window changes must not leave a stale wide design: at 2048 design width on a
       phone-shaped window the content would be cropped. Cheap drift check. */
    setInterval(function () {
        try {
            if (!cc.view || !window.cc) { return; }
            var d = designSizeForWindow();
            var cur = cc.view.getDesignResolutionSize();
            if (Math.round(cur.width) !== d.w || Math.round(cur.height) !== d.h) { applyFit(); }
        } catch (e) {}
    }, 1000);
    var wideModeDriftCheck = true;
    function designSizeForWindow() {
        var fs = frameSize();
        var w = CONFIG.designWidth;
        /* Every scene uses the wide design now: the level board centres itself and
           the in-level HUD rows are spread across the width by wide-ui.js. */
        if (CONFIG.wideMode !== false && fs.height > 0 && fs.width > 0) {
            w = Math.round(CONFIG.designHeight * fs.width / fs.height);
            w = Math.max(CONFIG.designWidth, Math.min(w, Math.round(CONFIG.designHeight * 3)));
        }
        return { w: w, h: CONFIG.designHeight, wide: w > CONFIG.designWidth };
    }

    function applyFit() {
        var p = policyForWindow();
        if (p === undefined || p === null) { return; }
        try {
            var d = designSizeForWindow();
            cc.view.setDesignResolutionSize(d.w, d.h, d.wide ? RP.FIXED_HEIGHT : p);
            activePolicy = p;
            applyFit._pending = false;
        } catch (e) {
            // On the very first scene launch the view may not be ready yet;
            // retry once instead of leaving the scene on its authored policy.
            if (!applyFit._pending) {
                applyFit._pending = true;
                setTimeout(function () { applyFit._pending = false; applyFit(); }, 150);
            } else {
                console.warn('[maze-dash-port] setDesignResolutionSize failed:', e);
            }
        }
        layoutListeners.forEach(function (fn) { try { fn(); } catch (e) {} });
    }

    /* The current scene's own background colour, so the area outside the game
       content blends in instead of showing black bars. */
    function sceneBackgroundRGB() {
        // 1) in-level: gameScene keeps its own background node
        try {
            var gs = window.gameScene;
            if (gs && gs.backGroup && cc.isValid(gs.backGroup)) {
                var c = gs.backGroup.color;
                if (c && (c.r || c.g || c.b)) { return { r: c.r, g: c.g, b: c.b }; }
            }
        } catch (e) {}

        // 2) HallScene: the world page currently centred on screen (each page
        //    carries its own "BgLayer" tinted from that world's theme)
        try {
            var scene = cc.director.getScene();
            if (scene) {
                var best = null, bestDist = Infinity;
                (function walk(n) {
                    if (/^BgLayer$/i.test(n.name) && n.activeInHierarchy && n.color) {
                        var wx = n.convertToWorldSpaceAR(cc.v2(0, 0)).x;
                        var d = Math.abs(wx - CONFIG.designWidth / 2);
                        if (d < bestDist) { bestDist = d; best = n; }
                    }
                    var kids = n.children || [];
                    for (var i = 0; i < kids.length; i++) { walk(kids[i]); }
                })(scene);
                if (best && best.color && (best.color.r || best.color.g || best.color.b)) {
                    return { r: best.color.r, g: best.color.g, b: best.color.b };
                }
            }
        } catch (e) {}

        // 3) otherwise fall back to the theme of the world in view
        try {
            var w = currentWorldId();
            var t = window.conf && conf.theme_cfg && conf.theme_cfg[w] && conf.theme_cfg[w].list_background;
            if (t && t.length >= 3) {
                var col = new cc.Color();
                col.fromHSV(t[0] / 360, t[1] / 100, t[2] / 100);
                return { r: col.r, g: col.g, b: col.b };
            }
        } catch (e) {}
        return null;
    }

    function currentWorldId() {
        try { if (window.gameScene && gameScene.worldId) { return gameScene.worldId; } } catch (e) {}
        try { if (window.hallScene && hallScene.worldId) { return parseInt(hallScene.worldId, 10) || 1; } } catch (e) {}
        try { if (window.gamemain && gamemain.getLastWordId) { return gamemain.getLastWordId(); } } catch (e) {}
        return 1;
    }

    function applyBackground() {
        var rgb = CONFIG.background === 'auto' ? sceneBackgroundRGB() : null;
        if (!rgb && CONFIG.background && CONFIG.background !== 'auto') {
            document.body.style.background = CONFIG.background;
            document.documentElement.style.background = CONFIG.background;
            return;
        }
        var css = rgb ? 'rgb(' + rgb.r + ',' + rgb.g + ',' + rgb.b + ')'
                      : CONFIG.backgroundFallback;
        document.body.style.background = css;
        document.documentElement.style.background = css;
        var div = document.getElementById('GameDiv');
        if (div) { div.style.background = css; }

        if (rgb && cc.Camera) {
            try {
                var scene = cc.director.getScene();
                var cams = scene ? scene.getComponentsInChildren(cc.Camera) : [];
                if (!cams || !cams.length) { cams = cc.Camera.main ? [cc.Camera.main] : []; }
                for (var i = 0; i < cams.length; i++) {
                    if (cams[i] && cams[i].backgroundColor !== undefined) {
                        cams[i].backgroundColor = new cc.Color(rgb.r, rgb.g, rgb.b, 255);
                    }
                }
            } catch (e) {}
        }
    }

    /* Where the 720x1280 design area actually lands inside the canvas, in CSS
       pixels. Only SHOW_ALL leaves real empty space around the content — every
       other policy sizes the canvas so the content fills it. */
    function contentRect() {
        var fs = frameSize();
        if (activePolicy === RP.SHOW_ALL) {
            var scale = Math.min(fs.width / CONFIG.designWidth, fs.height / CONFIG.designHeight);
            var w = CONFIG.designWidth * scale, h = CONFIG.designHeight * scale;
            return {
                left: (fs.width - w) / 2,
                top: (fs.height - h) / 2,
                width: w,
                height: h,
                scale: scale,
            };
        }
        return { left: 0, top: 0, width: fs.width, height: fs.height, scale: null };
    }

    /* Empty space beside / above the game content. */
    function sideMargin() { return Math.max(0, Math.round(contentRect().left)); }
    function vertMargin() { return Math.max(0, Math.round(contentRect().top)); }

    /* ---------------------------------------------------- repo badge / link */
    function setupRepo() {
        var url = CONFIG.repo || '';
        var badge = document.getElementById('repobadge');
        var label = document.getElementById('repobadgeLabel');
        var splash = document.getElementById('splashRepo');

        if (label) { label.textContent = CONFIG.repoLabel || 'GitHub'; }
        if (splash) {
            if (url) {
                splash.href = url;
                splash.textContent = 'GitHub · ' + (CONFIG.repoLabel || url.replace(/^https?:\/\//, ''));
            } else {
                splash.style.display = 'none';
            }
        }
        if (!badge) { return; }
        if (!url || !CONFIG.repoBadge) { badge.style.display = 'none'; return; }
        badge.href = url;
        badge.style.display = 'inline-flex';
    }

    function placeBadge() {
        var badge = document.getElementById('repobadge');
        if (!badge || badge.style.display === 'none') { return; }

        var fs = frameSize();
        var margin = sideMargin();
        var pos = CONFIG.repoBadgePosition || 'auto';
        var inMargin = margin >= 88;          // enough room for a pill beside the game

        if (pos === 'auto') { pos = inMargin ? 'margin' : 'top-left'; }
        if (pos === 'margin' && !inMargin) { pos = 'top-left'; }

        var gap = 10;
        badge.style.left = badge.style.right = badge.style.top = badge.style.bottom = 'auto';
        if (pos === 'margin') {
            // bottom of the right-hand gutter, vertically clear of the game UI
            badge.style.right = Math.max(gap, Math.round(margin * 0.18)) + 'px';
            badge.style.bottom = '18px';
            badge.style.maxWidth = Math.max(60, margin - gap * 2) + 'px';
        } else if (pos === 'top-right') {
            badge.style.right = gap + 'px'; badge.style.top = gap + 'px';
        } else if (pos === 'bottom-left') {
            badge.style.left = gap + 'px'; badge.style.bottom = gap + 'px';
        } else if (pos === 'bottom-right') {
            badge.style.right = gap + 'px'; badge.style.bottom = gap + 'px';
        } else {
            badge.style.left = gap + 'px'; badge.style.top = gap + 'px';
        }
        badge.style.opacity = inMargin ? '' : '0.34';
    }

    function placeKeyHint() {
        var el = document.getElementById('keyhint');
        if (!el) { return; }
        var margin = sideMargin();
        // keep it out of the gameplay area when possible
        el.style.bottom = 'auto';
        el.style.top = '12px';
    }

    function relayout() {
        placeBadge();
        placeKeyHint();
    }
    layoutListeners.push(relayout);

    /* ---------------------------------------------------------- scene hooks */
    function onSceneChanged() {
        applyFit();
        applyBackground();
        relayout();
    }

    try {
        cc.director.on(cc.Director.EVENT_AFTER_SCENE_LAUNCH, onSceneChanged);
    } catch (e) {
        console.warn('[maze-dash-port] could not hook scene launch:', e);
    }

    /* keep the letterbox/tint in sync while the player browses worlds */
    setInterval(function () {
        if (!window.cc || !cc.director) { return; }
        applyBackground();
    }, 1200);

    /* window resize / rotation → re-fit and re-place the shell UI */
    var resizeTimer = null;
    function onWindowResize() {
        if (resizeTimer) { clearTimeout(resizeTimer); }
        resizeTimer = setTimeout(function () {
            applyFit();
            applyBackground();
            relayout();
        }, 120);
    }
    window.addEventListener('resize', onWindowResize, false);
    window.addEventListener('orientationchange', onWindowResize, false);

    setupRepo();


    /* =====================================================================
     * 1. Economy adaptation
     * ---------------------------------------------------------------------
     * Original behaviour: 10 tickets max, 1 ticket per level attempt, one
     * ticket recovered every 5 minutes, refills otherwise bought with ads or
     * IAP. With ads/IAP removed a player would be locked out after 10 levels,
     * so tickets are raised to a level count that cannot be exhausted, and a
     * one-time stock of hints is granted (hints were also ad-gated).
     * Progress, quests, worlds and unlocks are untouched.
     * ===================================================================== */
    var TICKET_MAX = 999;
    var HINT_SEED = 99;

    function applyEconomy() {
        var gm = window.gamemain;
        if (!gm || gm.__webPortPatched) { return; }
        gm.__webPortPatched = true;

        gm.getTicketMaxNum = function () { return TICKET_MAX; };

        try {
            // getTicketCount() self-seeds to getTicketMaxNum() on a fresh profile
            gm.getTicketCount();
            gm.setTicketCount(TICKET_MAX);

            var stored = (typeof window.getLocalStorage === 'function')
                ? window.getLocalStorage('hintCount') : null;
            if (!stored) { gm.addHintCount(HINT_SEED); }
        } catch (e) {
            console.warn('[maze-dash-port] economy seed skipped:', e);
        }

        console.log('[maze-dash-port] economy adapted: tickets=' + TICKET_MAX + ', hints seeded=' + HINT_SEED);
    }

    /* =====================================================================
     * 2. Resilient audio loading
     * ---------------------------------------------------------------------
     * Real-world problem this solves: browser add-ons and download managers
     * (Internet Download Manager's "advanced integration" is the common one)
     * hook media requests inside the browser and answer `.mp3` XHRs with an
     * empty 204. Creator then fails decodeAudioData, and because a failed
     * audio download also fails the *scene* that depends on it, the game hangs
     * forever on the loading screen.
     *
     * Strategy, in order:
     *   1. normal request (unchanged, zero cost when nothing intercepts);
     *   2. retry once with a trailing slash appended — media interceptors match
     *      on the ".mp3" URL suffix, and "/x.mp3/" no longer matches (serve.js
     *      normalises the trailing slash back to the file);
     *   3. if even that fails, hand back a short silent buffer so the scene
     *      always finishes loading and the game stays playable.
     * ===================================================================== */
    var AUDIO_EXTS = ['mp3', 'ogg', 'wav', 'm4a'];
    var audioNeedsSlash = false;

    function isWebAudioItem(item) {
        try {
            var owner = item && item._owner;
            if (owner instanceof cc.AudioClip) {
                return owner.loadMode === cc.AudioClip.LoadMode.WEB_AUDIO;
            }
            return !(item && item.urlParam && item.urlParam.useDom);
        } catch (e) { return true; }
    }

    function silentWavDataURI(seconds) {
        var rate = 8000;
        var n = Math.max(1, Math.floor(rate * seconds));
        var bytes = 44 + n * 2;
        var buf = new ArrayBuffer(bytes);
        var v = new DataView(buf);
        function put(off, str) { for (var i = 0; i < str.length; i++) { v.setUint8(off + i, str.charCodeAt(i)); } }
        put(0, 'RIFF'); v.setUint32(4, bytes - 8, true); put(8, 'WAVE'); put(12, 'fmt ');
        v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
        v.setUint32(24, rate, true); v.setUint32(28, rate * 2, true);
        v.setUint16(32, 2, true); v.setUint16(34, 16, true);
        put(36, 'data'); v.setUint32(40, n * 2, true);
        var u8 = new Uint8Array(buf);
        var s = '';
        for (var i = 0; i < u8.length; i++) { s += String.fromCharCode(u8[i]); }
        return 'data:audio/wav;base64,' + btoa(s);
    }

    function silentAssetFor(item) {
        if (isWebAudioItem(item)) {
            try {
                var ctx = audioCtx() || new (window.AudioContext || window.webkitAudioContext)();
                return ctx.createBuffer(1, Math.max(1, Math.floor(ctx.sampleRate * 0.25)), ctx.sampleRate);
            } catch (e) { /* fall through to DOM stub */ }
        }
        var dom = document.createElement('audio');
        dom.src = silentWavDataURI(0.25);
        return dom;
    }

    function installResilientAudio() {
        if (!cc.loader || !cc.loader.downloader || !cc.loader.addDownloadHandlers) { return false; }
        var dl = cc.loader.downloader;
        if (dl.__webPortAudioWrapped) { return true; }

        function slashify(u) { return String(u).replace(/\/+$/, '') + '/'; }

        var handlers = {};
        AUDIO_EXTS.forEach(function (ext) {
            var orig = dl.extMap && dl.extMap[ext];
            if (typeof orig !== 'function') { return; }
            handlers[ext] = function (item, callback) {
                var self = this;

                function attempt(url, done) {
                    var it = {};
                    for (var k in item) { it[k] = item[k]; }
                    it.url = url;
                    orig.call(self, it, done);
                }

                // Once interception is detected, skip the doomed first attempt
                // for every later clip (and avoid its unhandled rejection).
                var slashUrl = slashify(item.url);
                var urls = audioNeedsSlash ? [slashUrl, item.url] : [item.url, slashUrl];

                (function tryAt(i) {
                    if (i >= urls.length) {
                        console.warn('[maze-dash-port] audio unavailable, using silence: ' + item.url);
                        callback(null, silentAssetFor(item));
                        return;
                    }
                    attempt(urls[i], function (err, result) {
                        if (!err && result) {
                            var usedSlash = (urls[i] === slashUrl);
                            if (usedSlash !== audioNeedsSlash) {
                                audioNeedsSlash = usedSlash;
                                console.warn('[maze-dash-port] media interception ' +
                                    (usedSlash ? 'detected — switching audio to slash URLs'
                                               : 'cleared — back to plain URLs'));
                            }
                            return callback(null, result);
                        }
                        tryAt(i + 1);
                    });
                })(0);
            };
        });

        cc.loader.addDownloadHandlers(handlers);
        dl.__webPortAudioWrapped = true;
        return true;
    }

    // Chrome resolves decodeAudioData's returned promise even when the legacy
    // callback form is used, so a failed first attempt surfaces as an unhandled
    // rejection. We already recovered from it (retry / silence), so swallow
    // exactly that case and leave every other rejection visible.
    window.addEventListener('unhandledrejection', function (ev) {
        var r = ev && ev.reason;
        var msg = r ? String(r.message || r) : '';
        if ((r && r.name === 'EncodingError') || /unable to decode audio data/i.test(msg)) {
            ev.preventDefault();
        }
    });

    // In the self-contained build the assets are inlined and served by the
    // bundled virtual filesystem, so the network-retry shim is neither needed
    // nor useful there.
    if (window.__MAZE_DASH_INLINE_ASSETS) {
        console.log('[maze-dash-port] self-contained build: assets are inlined');
    } else {
        installResilientAudio();
    }

    /* =====================================================================
     * 3. Audio unlock
     * ---------------------------------------------------------------------
     * Browsers create a suspended AudioContext until the page has been
     * interacted with, so the original BGM would stay silent. Resume on any
     * early gesture and keep listening (a backgrounded tab can re-suspend).
     * ===================================================================== */
    function audioCtx() {
        try {
            return (cc.sys && cc.sys.__audioSupport && cc.sys.__audioSupport.context) || null;
        } catch (e) { return null; }
    }

    function unlockAudio() {
        var ctx = audioCtx();
        if (!ctx) { return; }

        if (ctx.state === 'suspended' && ctx.resume) {
            var p = ctx.resume();
            if (p && p.catch) { p.catch(function () {}); }
        }

        // If music was requested while the context was suspended, nudge it.
        try {
            if (cc.audioEngine && cc.audioEngine.isMusicPlaying &&
                !cc.audioEngine.isMusicPlaying() && cc.audioEngine.resumeMusic) {
                cc.audioEngine.resumeMusic();
            }
        } catch (e) {}
    }

    ['pointerdown', 'touchstart', 'mousedown', 'keydown'].forEach(function (type) {
        window.addEventListener(type, unlockAudio, true);
    });

    /* =====================================================================
     * 4. Keyboard support (desktop convenience)
     * ---------------------------------------------------------------------
     * The original game is swipe-only. The engine already turns mouse input
     * into touch input, so we can drive a swipe by dispatching a synthetic
     * mouse press-drag-release on the canvas (CCInputManager registers its
     * mouse listeners on the canvas element, see registerSystemEvent()).
     * ===================================================================== */
    var DIRS = {
        ArrowUp: 'U', KeyW: 'U',
        ArrowDown: 'D', KeyS: 'D',
        ArrowLeft: 'L', KeyA: 'L',
        ArrowRight: 'R', KeyD: 'R',
    };

    function swipe(dir) {
        var canvas = document.getElementById('GameCanvas');
        if (!canvas) { return; }

        var r = canvas.getBoundingClientRect();
        if (!r.width || !r.height) { return; }

        var cx = r.left + r.width / 2;
        var cy = r.top + r.height / 2;
        var d = Math.min(r.width, r.height) * 0.22;

        var dx = 0, dy = 0;
        if (dir === 'U') { dy = -d; }
        else if (dir === 'D') { dy = d; }
        else if (dir === 'L') { dx = -d; }
        else { dx = d; }

        function fire(type, x, y, buttons) {
            var ev;
            try {
                ev = new MouseEvent(type, {
                    clientX: x, clientY: y,
                    bubbles: true, cancelable: true,
                    view: window, button: 0, buttons: buttons,
                });
            } catch (e) {
                ev = document.createEvent('MouseEvents');
                ev.initMouseEvent(type, true, true, window, 0, x, y, x, y, false, false, false, false, 0, null);
            }
            canvas.dispatchEvent(ev);
        }

        fire('mousedown', cx, cy, 1);
        fire('mousemove', cx + dx, cy + dy, 1);
        fire('mouseup', cx + dx, cy + dy, 0);
    }

    window.addEventListener('keydown', function (ev) {
        if (ev.repeat || ev.ctrlKey || ev.metaKey || ev.altKey) { return; }
        var dir = DIRS[ev.code] || DIRS[ev.key];
        if (!dir) { return; }
        ev.preventDefault();
        swipe(dir);
    }, false);

    /* =====================================================================
     * 5. Desktop affordances
     * ===================================================================== */
    var isTouchOnly = ('ontouchstart' in window) && navigator.maxTouchPoints > 0;

    function showKeyHint() {
        if (isTouchOnly) { return; }
        var el = document.getElementById('keyhint');
        if (!el) { return; }
        el.classList.add('show');
        setTimeout(function () { el.classList.remove('show'); }, 9000);
    }

    /* Called by main.js once the launch scene is live (and on every scene
       change through the director hook above). */
    PORT.onSceneLaunched = function (scene) {
        applyEconomy();
        showKeyHint();
        unlockAudio();
        onSceneChanged();
    };

    /* =====================================================================
     * 6. Hook points
     * ---------------------------------------------------------------------
     * EVENT_GAME_INITED fires from game._prepareFinished() *before* onStart()
     * loads the launch scene, and after project.js has executed — so
     * window.gamemain already exists here.
     * ===================================================================== */
    function onGameInited() {
        installResilientAudio();
        applyEconomy();
    }

    if (window.cc && cc.game) {
        cc.game.once(cc.game.EVENT_GAME_INITED, onGameInited);
    } else {
        console.warn('[maze-dash-port] cc.game missing at load time; patches deferred');
    }

    /* Expose a tiny debugging surface for the console. */
    PORT.swipe = swipe;
    PORT.applyEconomy = applyEconomy;
    PORT.unlockAudio = unlockAudio;
    PORT.installResilientAudio = installResilientAudio;
    PORT.applyFit = applyFit;
    PORT.applyBackground = applyBackground;
    PORT.relayout = relayout;
})();
