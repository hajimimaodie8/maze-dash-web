const puppeteer = require('puppeteer-core');
const CHROME = 'C:\\Users\\Lenovo\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe';
const FILE = 'file:///E:/maze_dash/dist/MazeDash-standalone.html';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', protocolTimeout: 180000,
    userDataDir: 'E:\\maze_dash\\_work\\test\\chrome-profile-p1b',
    args: ['--no-sandbox','--disable-extensions','--no-first-run','--allow-file-access-from-files','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader'],
    defaultViewport: { width: 1440, height: 810, hasTouch: true } });
  const page = await browser.newPage();
  const errs = []; page.on('pageerror', (e) => errs.push(String(e.stack || e.message).slice(0, 300)));
  await page.goto(FILE, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.waitForFunction('window.cc && cc.game && cc.game._prepared === true', { timeout: 120000, polling: 150 });
  const scene = () => page.evaluate(() => (cc.director.getScene() ? cc.director.getScene().name : null));
  async function tap(x, y, s) { await page.mouse.move(x, y); await page.mouse.down(); await sleep(60); await page.mouse.up(); await sleep(s || 900); }
  for (let i = 0; i < 80; i++) { if ((await scene()) === 'HallScene') break; if (i % 3 === 1) { await tap(720, 400, 500); } else { await sleep(400); } }
  await sleep(2000);
  // 造一个"和用户世界 100 同形"的世界：两关，最后一关没有下一关，且世界 101 存在（触发原版 nextLevel 的落空分支）
  const seeded = await page.evaluate(() => {
    conf.worlds[100] = { id: 100, require: 0 }; conf.stage_cfg[100] = { 1001: {}, 1002: {} };
    conf.theme_cfg[100] = JSON.parse(JSON.stringify(conf.theme_cfg[1]));
    conf.stage_level_cfg[100] = {};
    [['9001', 1], ['9002', 2]].forEach(([mid, lv]) => {
      conf.all_Level[mid] = [[-1, 1, 1]];
      const e = { id: Number(mid), wordId: 100, levelId: lv, mapId: Number(mid), sz_solution: 'RR' };
      conf.level_cfg[e.id] = e;
      conf.stage_level_cfg[100][String(e.id)] = e;
      conf.stage_level_cfg[100][String(e.levelId)] = e;
    });
    return { level100Keys: Object.keys(conf.stage_level_cfg[100]), has101: !!conf.stage_level_cfg[101] };
  });
  console.log('SEEDED:', JSON.stringify(seeded));
  async function enterAndComplete() {
    await page.evaluate(() => { try { gamemain.enterEnterGameScene(9002); } catch (e) {} });
    for (let i = 0; i < 40; i++) { if ((await scene()) === 'gameScene') break; await sleep(300); }
    await sleep(2200);
    const ok = await page.evaluate(() => {
      const comp = cc.find('Canvas').getComponent('gameScene');
      if (!comp || !comp.showComplete) return 'no showComplete';
      try { comp.showComplete(); } catch (e) { return 'threw ' + String(e.message).slice(0, 110); }
      return { worldId: comp.worldId, level: comp.level, guards: window.MazeDashCustomTab.stats.gameSceneGuards || 0 };
    });
    await sleep(2200);
    return ok;
  }
  async function clickNamed(name) {
    const b = await page.evaluate((nm) => {
      const comp = cc.find('Canvas').getComponent('gameScene');
      const n = comp && comp[nm];
      if (!n) return null; const wp = n.convertToWorldSpaceAR(cc.v2(0, 0));
      const r = cc.game.canvas.getBoundingClientRect(); const vs = cc.view.getVisibleSize();
      return { x: r.left + wp.x * (r.width / vs.width), y: r.top + (vs.height - wp.y) * (r.height / vs.height) };
    }, name);
    if (b) { await tap(b.x, b.y, 3200); }
    return !!b;
  }
  const st1 = await enterAndComplete();
  const c1 = await clickNamed('btnContinue');
  const s1 = await page.evaluate(() => {
    const S = window.MazeDashCustomTab.stats; const h = window.hallScene;
    return { scene: cc.director.getScene().name, nextLevelRerouted: S.nextLevelRerouted || 0, listRerouted: S.listRerouted || 0,
      backToEditorFromLevel: S.backToEditorFromLevel || 0, editorIndex: CFGINDEX(), editorActive: !!(h && h.viewGroup && h.viewGroup[5] && h.viewGroup[5].activeInHierarchy) };
    function CFGINDEX() { try { return gamemain.showTabBarViewIndex; } catch (e) { return null; } }
  });
  console.log('TEST1 CONTINUE:', JSON.stringify(st1), '->', JSON.stringify(s1));
  const st2 = await enterAndComplete();
  const c2 = await clickNamed('btnList');
  const s2 = await page.evaluate(() => {
    const S = window.MazeDashCustomTab.stats; const h = window.hallScene;
    return { scene: cc.director.getScene().name, nextLevelRerouted: S.nextLevelRerouted || 0, listRerouted: S.listRerouted || 0,
      backToEditorFromLevel: S.backToEditorFromLevel || 0, editorActive: !!(h && h.viewGroup && h.viewGroup[5] && h.viewGroup[5].activeInHierarchy),
      clicked: !!window.__listClicked };
  });
  console.log('TEST2 LIST:', JSON.stringify(st2), '->', JSON.stringify(s2), ' clicked=', c2);
  console.log('ERRS:', JSON.stringify(errs.slice(0, 4)));
  await page.screenshot({ path: 'E:\\maze_dash\\docs\\screenshots\\97-p1-back-to-editor.png' });
  await browser.close(); process.exit(0);
})().catch((e) => { console.error('HARNESS ERROR', e); process.exit(1); });
