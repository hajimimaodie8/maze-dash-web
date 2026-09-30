const puppeteer = require('puppeteer-core');
const CHROME = 'C:\\Users\\Lenovo\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe';
const FILE = 'file:///E:/maze_dash/dist/MazeDash-standalone.html';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', protocolTimeout: 180000,
    userDataDir: 'E:\\maze_dash\\_work\\test\\chrome-profile-p1',
    args: ['--no-sandbox','--disable-extensions','--no-first-run','--allow-file-access-from-files','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader'],
    defaultViewport: { width: 1440, height: 810, hasTouch: true } });
  const page = await browser.newPage();
  const errs = []; page.on('pageerror', (e) => errs.push(String(e.stack || e.message).slice(0, 400)));
  await page.goto(FILE, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.waitForFunction('window.cc && cc.game && cc.game._prepared === true', { timeout: 120000, polling: 150 });
  const scene = () => page.evaluate(() => (cc.director.getScene() ? cc.director.getScene().name : null));
  async function tap(x, y, s) { await page.mouse.move(x, y); await page.mouse.down(); await sleep(60); await page.mouse.up(); await sleep(s || 800); }
  for (let i = 0; i < 80; i++) { if ((await scene()) === 'HallScene') break; if (i % 3 === 1) { await tap(720, 400, 500); } else { await sleep(400); } }
  await sleep(2000);
  // 进自定义世界 101 的测试关卡
  await page.evaluate(() => { try { gamemain.enterEnterGameScene(10101); } catch (e) {} });
  for (let i = 0; i < 40; i++) { if ((await scene()) === 'gameScene') break; await sleep(300); }
  await sleep(2500);
  const state = await page.evaluate(() => {
    const node = cc.find('Canvas'); const comp = node && node.getComponent && node.getComponent('gameScene');
    const out = { hasComp: !!comp, worldId: comp ? comp.worldId : null, level: comp ? comp.level : null,
      vignette: comp && comp.vignette ? { name: comp.vignette.name, active: comp.vignette.activeInHierarchy, children: (comp.vignette.children || []).map((c) => c.name) } : null,
      contentExists: comp && comp.vignette ? !!cc.find('Content', comp.vignette) : null };
    return out;
  });
  console.log('IN_LEVEL_STATE:', JSON.stringify(state));
  // 内部路径：直接把结算界面弄出来（父代理允许的内部入口）
  const done = await page.evaluate(() => {
    const comp = cc.find('Canvas').getComponent('gameScene');
    if (!comp || !comp.showComplete) return 'no showComplete';
    try { comp.showComplete(); } catch (e) { return 'threw ' + String(e.message).slice(0, 120); }
    return { vignette: comp.vignette ? comp.vignette.name : null, btnGroup2: comp.btnGroup2 ? comp.btnGroup2.active : null,
      kids: comp.btnGroup2 ? (comp.btnGroup2.children || []).map((c) => ({ name: c.name, kids: (c.children || []).map((k) => k.name) })) : null,
      btnContinue: comp.btnContinue ? { active: comp.btnContinue.active } : null };
  });
  console.log('AFTER_SHOWCOMPLETE:', JSON.stringify(done));
  await sleep(2500);
  // 真实点击 btnContinue（箭头/下一关）
  const b1 = await page.evaluate(() => {
    const comp = cc.find('Canvas').getComponent('gameScene'); const n = comp && comp.btnContinue;
    if (!n) return null; const wp = n.convertToWorldSpaceAR(cc.v2(0, 0));
    const r = cc.game.canvas.getBoundingClientRect(); const vs = cc.view.getVisibleSize();
    return { x: r.left + wp.x * (r.width / vs.width), y: r.top + (vs.height - wp.y) * (r.height / vs.height) };
  });
  if (b1) { await tap(b1.x, b1.y, 3000); }
  console.log('AFTER_CLICK_CONTINUE: scene=', await scene(), ' errs=', JSON.stringify(errs.slice(0, 3)));
  console.log('POST_STATE:', JSON.stringify(await page.evaluate(() => {
    const comp = cc.find('Canvas') && cc.find('Canvas').getComponent && cc.find('Canvas').getComponent('gameScene');
    return { vignette: comp && comp.vignette ? comp.vignette.name : null, worldId: comp ? comp.worldId : null, level: comp ? comp.level : null,
      scene: cc.director.getScene() ? cc.director.getScene().name : null };
  })));
  await browser.close(); process.exit(0);
})().catch((e) => { console.error('HARNESS ERROR', e); process.exit(1); });
