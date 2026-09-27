/*
 * 冲撞迷阵 Maze Dash — Web port bootstrap
 * ---------------------------------------------------------------------------
 * Browser counterpart of the APK's main.js (which is the native/jsb entry).
 *
 * The body of boot() below is intentionally kept as close as possible to the
 * original file shipped in the APK
 *   (assets/main.js -> `window.boot = function () { ... }`)
 * so that scene loading, asset-library initialisation, the loading splash and
 * the launch-scene handoff behave exactly like they do on Android.
 *
 * The only differences are the platform entry at the bottom of this file:
 *   native : require('src/settings.js'); require('src/cocos2d-jsb.js'); window.boot();
 *   web    : settings.js + cocos2d-js.js are loaded by <script> tags in
 *            index.html, then this file calls window.boot().
 */
(function () {
    'use strict';

    var DEBUG_LOG = /[?&]debug=1\b/.test(window.location.search);

    /* ---------------------------------------------------------------- fatal */
    function showFatal(title, detail) {
        var el = document.getElementById('fatal');
        if (!el) { return; }
        var splash = document.getElementById('splash');
        if (splash) { splash.style.display = 'none'; }
        // The boot sequence calls setLoadingDisplay() later, which re-shows the
        // splash inline. This class rule wins over it (!important beats inline).
        if (document.body) { document.body.classList.add('boot-failed'); }
        var txt = title + '\n' + detail;
        if (el.getAttribute('data-body') === txt && el.style.display === 'flex') { return; }
        el.setAttribute('data-body', txt);
        el.style.display = 'flex';
        el.innerHTML = '';
        var b = document.createElement('b');
        b.textContent = title;
        el.appendChild(b);
        var d = document.createElement('div');
        d.textContent = detail;
        el.appendChild(d);
    }
    window.__mazeDashFatal = showFatal;

    function clearFatal() {
        window.__mazeDashSceneLaunched = true;
        var el = document.getElementById('fatal');
        if (el) { el.style.display = 'none'; el.removeAttribute('data-body'); }
        if (document.body) { document.body.classList.remove('boot-failed'); }
    }

    window.addEventListener('error', function (ev) {
        var msg = ev && ev.message ? ev.message : String(ev);
        // Ignore harmless asset/decoder noise that does not stop the game.
        if (/Script error/i.test(msg)) { return; }
        showFatal('运行出错', msg + (ev && ev.filename ? '\n' + ev.filename + ':' + ev.lineno : ''));
    });

    if (!window.cc) {
        showFatal('引擎未加载', 'cocos2d-js.js 没有正确载入。\n\n请确认解压完整，并通过 HTTP 服务器打开本页面（不要直接双击 index.html）。');
        return;
    }

    /* --------------------------------------------------- startup diagnostics
     * The one failure mode a user can easily walk into is opening index.html
     * straight from disk: <script> tags still load, but the browser blocks every
     * XHR the game uses to read res/, so the loading bar sits at 0% forever.
     * Detect that (and any other stall) and say something useful instead.
     * -------------------------------------------------------------------- */
    var IS_FILE = window.location.protocol === 'file:';
    // The self-contained ("直装版") build inlines every asset and every game
    // script, so it is *meant* to run from file:// — the disk guard must not
    // fire there, and the script list must not be fetched.
    var SELF_CONTAINED = !!window.__MAZE_DASH_INLINE_ASSETS;

    function bootDiagnostics() {
        var net = window.__mazeDashNet || { failed: [], ok: 0, started: 0 };
        var lines = [];
        lines.push('页面协议: ' + window.location.protocol + '//');
        lines.push('资源请求: 成功 ' + net.ok + ' 个，失败 ' + net.failed.length + ' 个（共发出 ' + net.started + '）');
        if (net.failed.length) {
            lines.push('失败示例:');
            for (var i = 0; i < Math.min(5, net.failed.length); i++) {
                lines.push('  · ' + net.failed[i]);
            }
        }
        return lines.join('\n');
    }

    function showOpenFromDiskHelp() {
        if (window.__mazeDashHelpShown) { return; }
        window.__mazeDashHelpShown = true;

        var title = '不能直接双击 index.html 打开';
        function message() {
            return '浏览器禁止 file:// 页面读取本地资源，而游戏需要读取 res/ 下的 350 个文件，\n' +
                '所以进度条会一直停在那里。这不是游戏坏了。\n\n' +
                '请用自带的启动脚本（它会开一个本地服务器）：\n' +
                '  · Windows：双击   start.bat\n' +
                '  · macOS / Linux：在解压目录执行   ./start.sh\n' +
                '  · 任意系统：在解压目录执行   node serve.js\n\n' +
                '然后浏览器访问   http://localhost:8099/\n\n' +
                '———————— 诊断信息 ————————\n' + bootDiagnostics();
        }

        showFatal(title, message());
        // keep the counters live instead of freezing the first snapshot
        var timer = setInterval(function () {
            if (window.__mazeDashSceneLaunched) { clearInterval(timer); return; }
            showFatal(title, message());
        }, 1500);
    }

    function startBootWatchdog() {
        var launched = false;
        try {
            cc.director.once(cc.Director.EVENT_AFTER_SCENE_LAUNCH, function () { launched = true; });
        } catch (e) {}

        setTimeout(function () {
            if (launched) { return; }
            if (IS_FILE && !SELF_CONTAINED) { showOpenFromDiskHelp(); return; }
            showFatal(
                '启动超时：资源没有加载成功',
                '25 秒内没能进入游戏场景。\n\n' +
                (SELF_CONTAINED
                    ? '这是单文件直装版，资源全部内嵌在 HTML 里。请确认文件没有被截断（应有约 ' +
                      Math.round(document.documentElement.outerHTML.length / 1048576) + ' MB 左右），\n' +
                      '并且浏览器允许本地页面运行 JavaScript。\n'
                    : '请确认：\n' +
                      '  · 是通过 HTTP 服务器访问，而不是直接打开文件；\n' +
                      '  · res/ 就在 index.html 同级目录且解压完整（应有 350 个文件）；\n' +
                      '  · 下载管理器之类的浏览器插件没有拦截 res/ 下的音频请求。\n') +
                '\n———————— 诊断信息 ————————\n' + bootDiagnostics()
            );
        }, 25000);
    }

    /* ------------------------------------------------------------- boot() */
    window.boot = function () {
        var settings = window._CCSettings;
        window._CCSettings = undefined;

        if (!settings.debug) {
            var uuids = settings.uuids;

            var rawAssets = settings.rawAssets;
            var assetTypes = settings.assetTypes;
            var realRawAssets = settings.rawAssets = {};
            for (var mount in rawAssets) {
                var entries = rawAssets[mount];
                var realEntries = realRawAssets[mount] = {};
                for (var id in entries) {
                    var entry = entries[id];
                    var type = entry[1];
                    // retrieve minified raw asset
                    if (typeof type === 'number') {
                        entry[1] = assetTypes[type];
                    }
                    // retrieve uuid
                    realEntries[uuids[id] || id] = entry;
                }
            }

            var scenes = settings.scenes;
            for (var i = 0; i < scenes.length; ++i) {
                var scene = scenes[i];
                if (typeof scene.uuid === 'number') {
                    scene.uuid = uuids[scene.uuid];
                }
            }

            var packedAssets = settings.packedAssets;
            for (var packId in packedAssets) {
                var packedIds = packedAssets[packId];
                for (var j = 0; j < packedIds.length; ++j) {
                    if (typeof packedIds[j] === 'number') {
                        packedIds[j] = uuids[packedIds[j]];
                    }
                }
            }
        }

        function setLoadingDisplay() {
            // Loading splash scene
            var splash = document.getElementById('splash');
            var progressBar = splash.querySelector('.progress-bar span');
            cc.loader.onProgress = function (completedCount, totalCount, item) {
                var percent = 100 * completedCount / totalCount;
                if (progressBar) {
                    progressBar.style.width = percent.toFixed(2) + '%';
                }
            };
            splash.style.display = 'block';
            progressBar.style.width = '0%';

            cc.director.once(cc.Director.EVENT_AFTER_SCENE_LAUNCH, function () {
                splash.style.display = 'none';
            });
        }

        var onStart = function () {
            cc.loader.downloader._subpackages = settings.subpackages;

            cc.view.enableRetina(true);
            cc.view.resizeWithBrowserSize(true);

            if (cc.sys.isBrowser) {
                setLoadingDisplay();
            }

            if (cc.sys.isMobile) {
                if (settings.orientation === 'landscape') {
                    cc.view.setOrientation(cc.macro.ORIENTATION_LANDSCAPE);
                }
                else if (settings.orientation === 'portrait') {
                    cc.view.setOrientation(cc.macro.ORIENTATION_PORTRAIT);
                }
                cc.view.enableAutoFullScreen([
                    cc.sys.BROWSER_TYPE_BAIDU,
                    cc.sys.BROWSER_TYPE_WECHAT,
                    cc.sys.BROWSER_TYPE_MOBILE_QQ,
                    cc.sys.BROWSER_TYPE_MIUI,
                ].indexOf(cc.sys.browserType) < 0);
            }

            // Limit downloading max concurrent task to 2,
            // more tasks simultaneously may cause performance draw back on some android system / browsers.
            // You can adjust the number based on your own test result, you have to set it before any loading process to take effect.
            if (cc.sys.isBrowser && cc.sys.os === cc.sys.OS_ANDROID) {
                cc.macro.DOWNLOAD_MAX_CONCURRENT = 2;
            }

            // init assets
            cc.AssetLibrary.init({
                libraryPath: 'res/import',
                rawAssetsBase: 'res/raw-',
                rawAssets: settings.rawAssets,
                packedAssets: settings.packedAssets,
                md5AssetsMap: settings.md5AssetsMap,
            });

            var launchScene = settings.launchScene;

            // load scene
            cc.director.loadScene(launchScene, null,
                function () {
                    if (cc.sys.isBrowser) {
                        // show canvas
                        var canvas = document.getElementById('GameCanvas');
                        if (canvas) { canvas.style.visibility = ''; }
                        var div = document.getElementById('GameDiv');
                        if (div) {
                            div.style.backgroundImage = '';
                        }
                    }
                    cc.loader.onProgress = null;
                    clearFatal();   // boot really did succeed after all
                    console.log('Success to load scene: ' + launchScene);
                    if (window.MazeDashPort && window.MazeDashPort.onSceneLaunched) {
                        window.MazeDashPort.onSceneLaunched(launchScene);
                    }
                }
            );
        };

        // jsList
        var jsList = settings.jsList;

        var bundledScript = 'src/project.js';
        if (SELF_CONTAINED) {
            // every script is already inlined in the document, in the original
            // order, right before this one — nothing to fetch
            jsList = [];
        }
        else if (jsList) {
            jsList = jsList.map(function (x) {
                return 'src/' + x;
            });
            jsList.push(bundledScript);
        }
        else {
            jsList = [bundledScript];
        }

        var option = {
            id: 'GameCanvas',
            scenes: settings.scenes,
            debugMode: DEBUG_LOG ? cc.debug.DebugMode.INFO : cc.debug.DebugMode.ERROR,
            showFPS: DEBUG_LOG,
            frameRate: 60,
            jsList: jsList,
            groupList: settings.groupList,
            collisionMatrix: settings.collisionMatrix,
        };

        cc.game.run(option, onStart);
    };

    /* ----------------------------------------------------------- entry */
    if (!window._CCSettings) {
        showFatal('缺少 settings.js', 'src/settings.js 未加载，无法确定资源清单。');
        return;
    }

    if (IS_FILE && !SELF_CONTAINED) {
        // Say it straight away rather than leaving a stuck progress bar.
        showOpenFromDiskHelp();
    }
    startBootWatchdog();

    window.boot();
})();
