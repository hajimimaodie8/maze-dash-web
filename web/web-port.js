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
    PORT.version = '1.0.0';
    PORT.engine = 'Cocos Creator 2.0.2 (web build)';

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

    /* Called by main.js once the launch scene is live. */
    PORT.onSceneLaunched = function (scene) {
        applyEconomy();
        showKeyHint();
        unlockAudio();
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
})();
