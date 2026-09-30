const puppeteer = require('puppeteer-core');
const CHROME = 'C:\\Users\\Lenovo\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe';
const FILE = 'file:///E:/maze_dash/dist/MazeDash-standalone.html';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const browser = await puppeteer.launch({
    executablePath: CHROME, headless: 'new', protocolTimeout: 180000,
    userDataDir: 'E:\\maze_dash\\_work\\test\\chrome-profile-audio',
    args: ['--no-sandbox','--disable-extensions','--no-first-run','--allow-file-access-from-files',
           '--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader'],
    defaultViewport: { width: 1440, height: 810, hasTouch: true }
  });
  const page = await browser.newPage();
  const errs = []; page.on('pageerror', (e) => errs.push(String(e.message).slice(0, 130)));
  await page.evaluateOnNewDocument(() => {
    window.__acs = []; window.__resume = []; window.__suspend = []; window.__create = 0;
    const wrap = (Ctor) => {
      if (!Ctor) return Ctor;
      function W() { var c = new (Function.prototype.bind.apply(Ctor, [null].concat([].slice.call(arguments))))(); try { window.__acs.push(c); } catch (e) {} return c; }
      W.prototype = Ctor.prototype; return W;
    };
    window.AudioContext = wrap(window.AudioContext);
    window.webkitAudioContext = wrap(window.webkitAudioContext);
    const P = (window.AudioContext && window.AudioContext.prototype) || {};
    if (P.resume) { const o = P.resume; P.resume = function () { window.__resume.push(Date.now()); return o.apply(this, arguments); }; }
    if (P.suspend) { const o = P.suspend; P.suspend = function () { window.__suspend.push(Date.now()); return o.apply(this, arguments); }; }
  });
  await page.goto(FILE, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.waitForFunction('window.cc && cc.game && cc.game._prepared === true', { timeout: 120000, polling: 150 });
  const scene = () => page.evaluate(() => (cc.director.getScene() ? cc.director.getScene().name : null));
  async function tap(x, y, s) { await page.mouse.move(x, y); await page.mouse.down(); await sleep(60); await page.mouse.up(); await sleep(s || 800); }
  for (let i = 0; i < 80; i++) { if ((await scene()) === 'HallScene') break; if (i % 3 === 1) { await tap(720, 400, 500); } else { await sleep(400); } }
  await sleep(2500);
  const read = () => page.evaluate(() => {
    const ae = window.cc && cc.audioEngine;
    return {
      ctxCount: (window.__acs || []).length,
      states: (window.__acs || []).map((c) => { try { return c.state; } catch (e) { return '?'; } }),
      currentTimes: (window.__acs || []).map((c) => { try { return Math.round(c.currentTime * 1000) / 1000; } catch (e) { return -1; } }),
      resumeCalls: (window.__resume || []).length,
      suspendCalls: (window.__suspend || []).length,
      hasAudioEngine: !!ae,
      musicVol: ae && ae.getMusicVolume ? ae.getMusicVolume() : null,
      fxVol: ae && ae.getEffectsVolume ? ae.getEffectsVolume() : null,
      scene: cc.director.getScene() ? cc.director.getScene().name : null
    };
  });
  const base = await read();
  // 真实鼠标点击第一关的关卡按钮（世界 1 第 1 关）
  const btn = await page.evaluate(() => {
    const scv = cc.find('Canvas/gameView/scrollView').getComponent(cc.ScrollView);
    const pg = scv.content.children.filter((p) => p.getComponent('StageSelectLayer'))[0];
    const b = pg.getComponent('StageSelectLayer').SelectLevelLayer.children.filter((n) => n.getComponent && n.getComponent('LevelButton'))[0];
    const wp = b.convertToWorldSpaceAR(cc.v2(0, 0));
    const r = cc.game.canvas.getBoundingClientRect(); const vs = cc.view.getVisibleSize();
    return { x: r.left + wp.x * (r.width / vs.width), y: r.top + (vs.height - wp.y) * (r.height / vs.height) };
  });
  await tap(btn.x, btn.y, 3500);
  for (let i = 0; i < 40; i++) { if ((await scene()) === 'gameScene') break; await sleep(300); }
  await sleep(3000);
  const afterEnter = await read();
  await tap(720, 400, 1500);                       // 关卡内一次鼠标点击
  const afterMouseInLevel = await read();
  await page.touchscreen.tap(720, 400);            // 关卡内一次真实触摸
  await sleep(1500);
  const afterTouch = await read();
  console.log('BASE      :', JSON.stringify(base));
  console.log('AFTERENTER:', JSON.stringify(afterEnter));
  console.log('AFTERMOUSE:', JSON.stringify(afterMouseInLevel));
  console.log('AFTERTOUCH:', JSON.stringify(afterTouch));
  console.log('ERRS:', JSON.stringify(errs.slice(0, 5)));
  await browser.close(); process.exit(0);
})().catch((e) => { console.error('HARNESS ERROR', e); process.exit(1); });
