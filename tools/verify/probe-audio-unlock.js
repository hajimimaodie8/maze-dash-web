const puppeteer = require('puppeteer-core');
const CHROME = 'C:\\Users\\Lenovo\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe';
const FILE = 'file:///E:/maze_dash/dist/MazeDash-standalone.html';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', protocolTimeout: 180000,
    userDataDir: 'E:\\maze_dash\\_work\\test\\chrome-profile-audio3',
    args: ['--no-sandbox','--disable-extensions','--no-first-run','--allow-file-access-from-files','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader'],
    defaultViewport: { width: 1440, height: 810, hasTouch: true } });
  const page = await browser.newPage();
  const errs = []; page.on('pageerror', (e) => errs.push(String(e.message).slice(0, 130)));
  await page.goto(FILE, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.waitForFunction('window.cc && cc.game && cc.game._prepared === true', { timeout: 120000, polling: 150 });
  const scene = () => page.evaluate(() => (cc.director.getScene() ? cc.director.getScene().name : null));
  async function tap(x, y, s) { await page.mouse.move(x, y); await page.mouse.down(); await sleep(60); await page.mouse.up(); await sleep(s || 800); }
  for (let i = 0; i < 40; i++) { if ((await scene()) === 'HallScene') break; await sleep(500); }
  await sleep(2000);
  const prep = await page.evaluate(() => {
    window.__tsHits = 0;
    var canvas = cc.game.canvas;
    canvas.addEventListener('touchstart', function () { window.__tsHits++; });
    window.__before = { scene: cc.director.getScene().name, idx: window.hallScene ? hallScene.currentIndex : null,
      hero: (function () { try { var m = cc.find('Canvas/backgroup/game_map'); if (!m) return null; var c = m.getComponent('game_map'); var h = 0; for (var y in c.Level_data) for (var x in c.Level_data[y]) if (c.Level_data[y][x] === -1) h++; return h; } catch (e) { return -2; } })() };
    var ctx = cc.sys.__audioSupport.context;
    var p = ctx.suspend();
    return { name: Object.keys(window).filter(function (k) { return /MazeDash|webPort|WEBPORT/i.test(k); }),
      before: window.__before, suspended: true, pIsPromise: !!(p && p.then) };
  });
  await sleep(400);
  const mid = await page.evaluate(() => ({ state: cc.sys.__audioSupport.context.state, tsHits: window.__tsHits }));
  const g = await page.evaluate(() => {
    var P = window.MazeDashPort || window.MazeDashWebPort || null;
    return { hasPort: !!P, unlocks: P ? (P.audioUnlocks || 0) : null, flushed: P ? (P.audioFlushed || 0) : null };
  });
  await tap(720, 400, 1500);
  await sleep(600);
  const after = await page.evaluate(() => {
    var P = window.MazeDashPort || window.MazeDashWebPort || null;
    return { state: cc.sys.__audioSupport.context.state, tsHits: window.__tsHits,
      unlocks: P ? (P.audioUnlocks || 0) : null, flushed: P ? (P.audioFlushed || 0) : null,
      after: { scene: cc.director.getScene().name, idx: window.hallScene ? hallScene.currentIndex : null } };
  });
  console.log('GLOBALS:', JSON.stringify(prep.name), ' BEFORE:', JSON.stringify(prep.before));
  console.log('AFTER_SUSPEND:', JSON.stringify(mid), ' PORT_BEFORE:', JSON.stringify(g));
  console.log('AFTER_GESTURE:', JSON.stringify(after));
  console.log('PHANTOM_CHECK:', JSON.stringify({ sceneSame: prep.before.scene === after.after.scene, idxSame: prep.before.idx === after.after.idx }));
  console.log('ERRS:', JSON.stringify(errs.slice(0, 4)));
  await browser.close(); process.exit(0);
})().catch((e) => { console.error('HARNESS ERROR', e); process.exit(1); });
