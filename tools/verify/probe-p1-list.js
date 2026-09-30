const puppeteer = require('puppeteer-core');
const CHROME = 'C:\\Users\\Lenovo\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe';
const FILE = 'file:///E:/maze_dash/dist/MazeDash-standalone.html';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', protocolTimeout: 180000,
    userDataDir: 'E:\\maze_dash\\_work\\test\\chrome-profile-p1c',
    args: ['--no-sandbox','--disable-extensions','--no-first-run','--allow-file-access-from-files','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader'],
    defaultViewport: { width: 1440, height: 810, hasTouch: true } });
  const page = await browser.newPage();
  const errs = []; page.on('pageerror', (e) => errs.push(String(e.stack || e.message).slice(0, 260)));
  await page.goto(FILE, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.waitForFunction('window.cc && cc.game && cc.game._prepared === true', { timeout: 120000, polling: 150 });
  const scene = () => page.evaluate(() => (cc.director.getScene() ? cc.director.getScene().name : null));
  async function tap(x, y, s) { await page.mouse.move(x, y); await page.mouse.down(); await sleep(60); await page.mouse.up(); await sleep(s || 900); }
  for (let i = 0; i < 80; i++) { if ((await scene()) === 'HallScene') break; if (i % 3 === 1) { await tap(720, 400, 500); } else { await sleep(400); } }
  await sleep(1800);
  await page.evaluate(() => {
    conf.worlds[100] = { id: 100, require: 0 }; conf.stage_cfg[100] = {};
    conf.theme_cfg[100] = JSON.parse(JSON.stringify(conf.theme_cfg[1])); conf.stage_level_cfg[100] = {};
    [['9001', 1], ['9002', 2]].forEach(([mid, lv]) => {
      conf.all_Level[mid] = [[-1, 1, 1]];
      const e = { id: Number(mid), wordId: 100, levelId: lv, mapId: Number(mid), sz_solution: 'RR' };
      conf.level_cfg[e.id] = e; conf.stage_level_cfg[100][String(e.id)] = e; conf.stage_level_cfg[100][String(e.levelId)] = e;
    });
    gamemain.enterEnterGameScene(9002);
  });
  for (let i = 0; i < 40; i++) { if ((await scene()) === 'gameScene') break; await sleep(300); }
  await sleep(2200);
  await page.evaluate(() => { cc.find('Canvas').getComponent('gameScene').showComplete(); });
  await sleep(2200);
  // 按真实节点路径点击「关卡列表」里的 btn_menu
  const b = await page.evaluate(() => {
    const comp = cc.find('Canvas').getComponent('gameScene');
    const list = comp.btnGroup2 && comp.btnGroup2.getChildByName('btnList');
    const menu = list && list.getChildByName('btn_menu');
    if (!menu) return null;
    const wp = menu.convertToWorldSpaceAR(cc.v2(0, 0));
    const r = cc.game.canvas.getBoundingClientRect(); const vs = cc.view.getVisibleSize();
    return { name: menu.name, x: r.left + wp.x * (r.width / vs.width), y: r.top + (vs.height - wp.y) * (r.height / vs.height) };
  });
  console.log('LIST_BUTTON:', JSON.stringify(b));
  if (b) { await tap(b.x, b.y, 3500); }
  const out = await page.evaluate(() => {
    const S = window.MazeDashCustomTab.stats; const h = window.hallScene;
    return { scene: cc.director.getScene().name, listRerouted: S.listRerouted || 0, backToEditorFromLevel: S.backToEditorFromLevel || 0,
      editorIndex: (function () { try { return gamemain.showTabBarViewIndex; } catch (e) { return null; } })(),
      editorActive: !!(h && h.viewGroup && h.viewGroup[5] && h.viewGroup[5].activeInHierarchy),
      vignetteGuardHits: S.vignetteGuardHits || 0, vignetteRebound: S.vignetteRebound || 0 };
  });
  console.log('AFTER_LIST_CLICK:', JSON.stringify(out));
  console.log('ERRS:', JSON.stringify(errs.slice(0, 4)));
  await page.screenshot({ path: 'E:\\maze_dash\\docs\\screenshots\\98-p1-list-back-to-editor.png' });
  await browser.close(); process.exit(0);
})().catch((e) => { console.error('HARNESS ERROR', e); process.exit(1); });
