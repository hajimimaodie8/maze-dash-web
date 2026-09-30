/* Does one real touch gesture make each audio buffer audible more than once?
 *
 * Two playback paths were competing: our own replay layer (any gesture that is
 * not a touchstart) and the engine's touchPlayList flusher (a REAL canvas
 * touchstart). Measured BEFORE the fix: every buffer started 2-3 times, one
 * stack through cc.audioEngine.<computed> (ours) and one through the canvas
 * touchstart listener (the engine's).
 *
 * The engine ALSO starts the source itself while the context is suspended
 * (cocos2d-js.js:4717/4719) and pushes it onto touchPlayList 10ms later
 * (4727), so whether it is audible depends on whether the later replay stops
 * that first source. This probe records start() AND stop() with the context
 * state and the phase (before/after the gesture) so the audible count per
 * buffer can be read off directly.
 *
 * Faithful by default (no forced suspend: the autoplay policy already leaves
 * the context suspended with currentTime === 0). Set FORCE_SUSPEND=1 to also
 * exercise the "was running, then suspended" state.
 *
 * Run: NODE_PATH=E:\maze_dash\_work\test\node_modules node tools\verify\probe-audio-double.js
 */
const puppeteer = require('puppeteer-core');
const CHROME = 'C:\\Users\\Lenovo\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe';
const FILE = 'file:///E:/maze_dash/dist/MazeDash-standalone.html';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const FORCE_SUSPEND = process.env.FORCE_SUSPEND === '1';
const NO_TOUCH = process.env.NO_TOUCH === '1';   /* desktop: our layer must own the replay */

(async () => {
  const browser = await puppeteer.launch({
    executablePath: CHROME, headless: 'new',
    userDataDir: 'E:\\maze_dash\\_work\\test\\chrome-profile-audio-double',
    protocolTimeout: 300000,
    args: ['--no-sandbox', '--mute-audio', '--allow-file-access-from-files', '--enable-unsafe-swiftshader',
           '--use-gl=angle', '--use-angle=swiftshader', '--no-first-run', '--disable-extensions']
          .concat(NO_TOUCH ? [] : ['--touch-events=enabled']),
    defaultViewport: { width: 1440, height: 810, hasTouch: !NO_TOUCH }
  });
  const page = await browser.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(String(e.message).slice(0, 140)));

  await page.evaluateOnNewDocument(() => {
    window.__starts = [];
    window.__stops = [];
    window.__gestures = [];
    window.__engineCalls = [];
    window.__tapAt = 0;

    function ctxState() {
      try {
        const c = window.cc && cc.sys && cc.sys.__audioSupport && cc.sys.__audioSupport.context;
        return c ? (c.state + '/' + Math.round(c.currentTime * 1000)) : 'none';
      } catch (e) { return 'err'; }
    }
    function stackOf(depth) {
      try { return String(new Error().stack || '').split('\n').slice(1, depth).join(' | ').slice(0, 300); }
      catch (e) { return ''; }
    }

    const S = (window.AudioBufferSourceNode && window.AudioBufferSourceNode.prototype) || null;
    let nextBufId = 1;
    /* Fingerprint each AudioBuffer OBJECT, not its duration: two different clips
     * can share a duration and would look like a double playback. */
    function bufKey(b) {
      if (!b) { return 'none'; }
      try { if (!b.__probeId) { b.__probeId = 'b' + (nextBufId++); } return b.__probeId + '/' + Math.round(b.duration * 1000) + 'ms'; }
      catch (e) { return 'err'; }
    }
    if (S) {
      const oStart = S.start, oStop = S.stop;
      S.start = function () {
        try {
          window.__starts.push({
            t: Date.now(), key: bufKey(this.buffer),
            state: ctxState(), phase: window.__tapAt ? (Date.now() < window.__tapAt ? 'pre' : 'post') : 'pre',
            st: stackOf(7)
          });
        } catch (e) {}
        return oStart.apply(this, arguments);
      };
      if (typeof oStop === 'function') {
        S.stop = function () {
          try { window.__stops.push({ t: Date.now(), key: bufKey(this.buffer), state: ctxState() }); } catch (e) {}
          return oStop.apply(this, arguments);
        };
      }
    }

    ['pointerdown', 'touchstart', 'mousedown', 'click'].forEach(function (ty) {
      window.addEventListener(ty, function (ev) {
        window.__gestures.push({ t: Date.now(), type: ty, pt: (ev && ev.pointerType) || '' });
      }, true);
    });

    const iv = setInterval(function () {
      if (window.cc && cc.audioEngine) {
        clearInterval(iv);
        ['play', 'playEffect', 'playMusic'].forEach(function (n) {
          const o = cc.audioEngine[n];
          if (typeof o !== 'function') { return; }
          cc.audioEngine[n] = function () {
            let id = '';
            try {
              const a = arguments[0];
              id = (a && (a.url || a.nativeUrl || a._uuid || a.name)) || String(a);
            } catch (e) {}
            window.__engineCalls.push({ t: Date.now(), name: n, id: String(id).slice(0, 90) });
            return o.apply(this, arguments);
          };
        });
        window.__engineWrapped = true;
      }
    }, 10);
  });

  await page.goto(FILE, { waitUntil: 'domcontentloaded', timeout: 180000 });
  await page.waitForFunction('window.cc && cc.game && cc.game._prepared === true',
    { timeout: 180000, polling: 150 });

  const env = await page.evaluate(() => ({
    ontouchstart: ('ontouchstart' in window),
    maxTouchPoints: navigator.maxTouchPoints,
    deviceCanTouchPerPort: !!(window.MazeDashPort && window.MazeDashPort.audioHandedToEngine !== undefined) || 'n/a',
    engineWrapped: !!window.__engineWrapped
  }));
  console.log('ENV:', JSON.stringify(env));

  if (FORCE_SUSPEND) {
    const sus = await page.evaluate(async () => {
      for (let i = 0; i < 300; i++) {
        const c = window.cc && cc.sys && cc.sys.__audioSupport && cc.sys.__audioSupport.context;
        if (c) { try { await c.suspend(); } catch (e) {} return { state: c.state, t: Math.round(c.currentTime * 1000) }; }
        await new Promise(r => setTimeout(r, 20));
      }
      return { state: 'no-ctx' };
    });
    console.log('FORCED-SUSPEND:', JSON.stringify(sus));
  }

  await sleep(7000);

  const before = await page.evaluate(() => ({
    ctxState: cc.sys.__audioSupport.context.state,
    ctxTimeMs: Math.round(cc.sys.__audioSupport.context.currentTime * 1000),
    queuedByUs: (window.MazeDashPort && window.MazeDashPort.audioQueuedByUs) || 0,
    replayed: (window.MazeDashPort && window.MazeDashPort.audioReplayed) || 0,
    handedToEngine: (window.MazeDashPort && window.MazeDashPort.audioHandedToEngine) || 0,
    starts: window.__starts.length,
    stops: window.__stops.length
  }));
  console.log('BEFORE-TAP:', JSON.stringify(before));

  const vp = page.viewport();
  await page.evaluate(() => { window.__tapAt = Date.now(); });
  if (NO_TOUCH) {
    await page.mouse.click(Math.round(vp.width / 2), Math.round(vp.height / 2));
  } else {
    await page.touchscreen.tap(Math.round(vp.width / 2), Math.round(vp.height / 2));
  }
  await sleep(3000);

  const after = await page.evaluate(() => ({
    ctxState: cc.sys.__audioSupport.context.state,
    replayed: (window.MazeDashPort && window.MazeDashPort.audioReplayed) || 0,
    handedToEngine: (window.MazeDashPort && window.MazeDashPort.audioHandedToEngine) || 0,
    starts: window.__starts.length,
    stops: window.__stops.length
  }));
  console.log('AFTER-TAP :', JSON.stringify(after));

  const out = await page.evaluate(() => {
    const key = s => s.key;
    const byPhase = {}, byState = {}, perBuffer = {};
    (window.__starts || []).forEach(function (s) {
      byPhase[s.phase] = (byPhase[s.phase] || 0) + 1;
      byState[s.state.split('/')[0]] = (byState[s.state.split('/')[0]] || 0) + 1;
      const k = key(s);
      perBuffer[k] = perBuffer[k] || { pre: 0, post: 0 };
      perBuffer[k][s.phase]++;
    });
    const stops = {};
    (window.__stops || []).forEach(function (s) { const k = key(s); stops[k] = (stops[k] || 0) + 1; });
    /* A source that was started and then stopped is inaudible; one that was
     * started and left alone plays (once the context is running). */
    const unstopped = {};
    Object.keys(perBuffer).forEach(function (k) {
      const n = perBuffer[k].pre + perBuffer[k].post - (stops[k] || 0);
      unstopped[k] = n;
    });
    return {
      byPhase: byPhase, byState: byState, perBuffer: perBuffer, stops: stops, unstopped: unstopped,
      dupes: Object.keys(perBuffer).filter(k => perBuffer[k].pre + perBuffer[k].post > 1),
      postStacks: (window.__starts || []).filter(s => s.phase === 'post').map(s => s.st.slice(0, 200)),
      gestures: window.__gestures, engineCalls: (window.__engineCalls || []).length
    };
  });
  console.log('STARTS-BY-PHASE:', JSON.stringify(out.byPhase), 'BY-CONTEXT-STATE:', JSON.stringify(out.byState));
  console.log('PER-BUFFER:', JSON.stringify(out.perBuffer));
  console.log('STOPS:', JSON.stringify(out.stops));
  console.log('UNSTOPPED (likely audible):', JSON.stringify(out.unstopped));
  console.log('MULTI-START-BUFFERS:', JSON.stringify(out.dupes));
  console.log('POST-GESTURE-STACKS:', JSON.stringify(out.postStacks.slice(0, 8)));
  console.log('GESTURES:', JSON.stringify(out.gestures));
  console.log('ERRORS:', JSON.stringify(errs.slice(0, 3)));

  await browser.close();
  process.exit(0);
})().catch(e => { console.error('HARNESS ERROR', e && e.message); process.exit(1); });
