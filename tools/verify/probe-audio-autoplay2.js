const puppeteer = require('puppeteer-core');
const CHROME = 'C:\\Users\\Lenovo\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe';
const FILE = 'file:///E:/maze_dash/dist/MazeDash-standalone.html';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const browser = await puppeteer.launch({
    executablePath: CHROME, headless: 'new', protocolTimeout: 180000,
    userDataDir: 'E:\\maze_dash\\_work\\test\\chrome-profile-audio2',
    args: ['--no-sandbox','--disable-extensions','--no-first-run','--allow-file-access-from-files',
           '--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader'],
    defaultViewport: { width: 1440, height: 810, hasTouch: true }
  });
  const page = await browser.newPage();
  const errs = []; page.on('pageerror', (e) => errs.push(String(e.message).slice(0, 130)));
  await page.evaluateOnNewDocument(() => {
    window.__acs = []; window.__resume = []; window.__stacks = []; window.__gestures = [];
    const wrap = (Ctor) => { if (!Ctor) return Ctor;
      function W() { var c = new (Function.prototype.bind.apply(Ctor, [null].concat([].slice.call(arguments))))(); try { window.__acs.push(c); } catch (e) {} return c; }
      W.prototype = Ctor.prototype; return W; };
    window.AudioContext = wrap(window.AudioContext);
    window.webkitAudioContext = wrap(window.webkitAudioContext);
    const P = (window.AudioContext && window.AudioContext.prototype) || {};
    if (P.resume) { const o = P.resume; P.resume = function () {
      window.__resume.push(Date.now());
      try { window.__stacks.push(String(new Error().stack).split('\n').slice(1, 4).join(' | ').slice(0, 300)); } catch (e) {}
      return o.apply(this, arguments); }; }
    ['pointerdown','mousedown','touchstart','keydown'].forEach((t) => {
      window.addEventListener(t, function (ev) { try { window.__gestures.push(t + '@' + Math.round(performance.now())); } catch (e) {} }, true);
    });
  });
  await page.goto(FILE, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.waitForFunction('window.cc && cc.game && cc.game._prepared === true', { timeout: 120000, polling: 150 });
  const scene = () => page.evaluate(() => (cc.director.getScene() ? cc.director.getScene().name : null));
  async function tap(x, y, s) { await page.mouse.move(x, y); await page.mouse.down(); await sleep(60); await page.mouse.up(); await sleep(s || 800); }
  // 被动等待大厅：全程不点
  let passive = true;
  for (let i = 0; i < 40; i++) { if ((await scene()) === 'HallScene') break; await sleep(500); }
  if ((await scene()) !== 'HallScene') { passive = false; await tap(720, 400, 2500); }
  await sleep(2000);
  const read = () => page.evaluate(() => {
    const ae = window.cc && cc.audioEngine;
    return { scene: cc.director.getScene() ? cc.director.getScene().name : null,
      states: (window.__acs || []).map((c) => { try { return c.state; } catch (e) { return '?'; } }),
      times: (window.__acs || []).map((c) => { try { return Math.round(c.currentTime * 1000) / 1000; } catch (e) { return -1; } }),
      resumes: (window.__resume || []).length, gestures: (window.__gestures || []).slice(-6),
      musicVol: ae && ae.getMusicVolume ? ae.getMusicVolume() : null, fxVol: ae && ae.getEffectsVolume ? ae.getEffectsVolume() : null };
  });
  console.log('PASSIVE_BOOT:', passive, ' AT_HALL:', JSON.stringify(await read()));
  const btn = await page.evaluate(() => {
    const scv = cc.find('Canvas/gameView/scrollView').getComponent(cc.ScrollView);
    const pg = scv.content.children.filter((p) => p.getComponent('StageSelectLayer'))[0];
    const b = pg.getComponent('StageSelectLayer').SelectLevelLayer.children.filter((n) => n.getComponent && n.getComponent('LevelButton'))[0];
    const wp = b.convertToWorldSpaceAR(cc.v2(0, 0));
    const r = cc.game.canvas.getBoundingClientRect(); const vs = cc.view.getVisibleSize();
    return { x: r.left + wp.x * (r.width / vs.width), y: r.top + (vs.height - wp.y) * (r.height / vs.height) };
  });
  await page.mouse.move(btn.x, btn.y); await page.mouse.down(); await sleep(60); await page.mouse.up();
  await sleep(250);
  console.log('RIGHT_AFTER_LEVEL_CLICK:', JSON.stringify(await read()));
  for (let i = 0; i < 40; i++) { if ((await scene()) === 'gameScene') break; await sleep(300); }
  await sleep(2500);
  console.log('IN_LEVEL_NO_TOUCH:', JSON.stringify(await read()));
  await page.touchscreen.tap(720, 400); await sleep(1200);
  console.log('AFTER_TOUCH:', JSON.stringify(await read()));
  console.log('STACKS:', JSON.stringify(await page.evaluate(() => window.__stacks || [])));
  console.log('ERRS:', JSON.stringify(errs.slice(0, 4)));
  await browser.close(); process.exit(0);
})().catch((e) => { console.error('HARNESS ERROR', e); process.exit(1); });
