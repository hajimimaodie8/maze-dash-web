/*
 * 冲撞迷阵 Maze Dash — 关卡资源预热 (preload)
 * ===========================================================================
 * Entering a level for the first time pulls 44 tiny /res/import/*.json
 * descriptors plus one plist before the engine can even ask for the real images
 * and audio, and that descriptor chain is what makes the first entry feel slow.
 * (The list was captured by intercepting the network while entering a level - see
 * tools/verify/faces.js, which writes the URLs it saw to faces-result.json.)
 *
 * This module warms those descriptors in the browser cache while the player is
 * still sitting on the hall, so the first level entry no longer waits on them.
 *
 * Deliberately conservative:
 *   - never runs in the single-file build (assets are inlined; there is no HTTP)
 *   - never runs on file:// (the descriptors would be blocked anyway)
 *   - a few requests at a time, after a short idle delay, and every failure is
 *     counted rather than thrown - a preload must never break the game
 */
(function () {
    'use strict';

    var CFG = {
        manifest: 'preload-manifest.json',
        concurrency: 4,
        idleDelayMs: 2000,
        enabled: true,
        log: true,
    };

    var stats = { total: 0, done: 0, failed: 0, started: false, skipped: '', ms: 0 };

    function log() {
        if (!CFG.log) { return; }
        try { console.log.apply(console, ['[preload]'].concat([].slice.call(arguments))); } catch (e) {}
    }

    function prefetchOne(url) {
        return fetch(url, { credentials: 'same-origin' })
            .then(function (r) {
                if (!r.ok) { throw new Error('HTTP ' + r.status); }
                // drain so the response is actually stored
                return r.arrayBuffer();
            })
            .then(function () { stats.done++; })
            .catch(function () { stats.failed++; });
    }

    function prefetch(urls) {
        var i = 0;
        function next() {
            if (i >= urls.length) { return Promise.resolve(); }
            var batch = urls.slice(i, i + CFG.concurrency);
            i += CFG.concurrency;
            return Promise.all(batch.map(prefetchOne)).then(next);
        }
        return next();
    }

    function run() {
        if (!CFG.enabled || stats.started) { return; }
        if (window.__MAZE_DASH_INLINE_ASSETS) { stats.skipped = 'inline build (no http)'; return; }
        if (location.protocol !== 'http:' && location.protocol !== 'https:') { stats.skipped = 'not http'; return; }
        stats.started = true;
        var t0 = Date.now();
        fetch(CFG.manifest, { cache: 'no-store' })
            .then(function (r) { return r.ok ? r.json() : null; })
            .then(function (json) {
                var list = (json && json.assets) || [];
                stats.total = list.length;
                if (!list.length) { stats.skipped = 'empty manifest'; return; }
                return prefetch(list).then(function () {
                    stats.ms = Date.now() - t0;
                    log('warmed', stats.done + '/' + stats.total, 'descriptors in', stats.ms, 'ms',
                        stats.failed ? '(' + stats.failed + ' failed)' : '');
                });
            })
            .catch(function (e) { stats.failed++; log('manifest unavailable:', e && e.message); });
    }

    /* Warm once the hall is on screen: the player will spend a moment there before
       opening a level, which is exactly the idle window we want. */
    function armForHall() {
        if (!window.cc || !cc.director) { return; }
        cc.director.on(cc.Director.EVENT_AFTER_SCENE_LAUNCH, function () {
            try {
                var s = cc.director.getScene();
                if (s && s.name === 'HallScene') { setTimeout(run, CFG.idleDelayMs); }
            } catch (e) {}
        });
        // and in case the hall is already up when this module loads
        setTimeout(function () {
            try {
                var s = cc.director.getScene();
                if (s && s.name === 'HallScene') { setTimeout(run, CFG.idleDelayMs); }
            } catch (e) {}
        }, 1500);
    }
    armForHall();

    window.MazeDashPreload = { config: CFG, stats: stats, run: run };
})();
