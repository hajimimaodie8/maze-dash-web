const puppeteer = require('puppeteer-core');
const CHROME = 'C:\\Users\\Lenovo\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe';
const FILE = 'file:///E:/maze_dash/dist/MazeDash-standalone.html';
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new',
    userDataDir: 'E:\\maze_dash\\_work\\test\\chrome-profile-jump', protocolTimeout: 180000,
    args: ['--no-sandbox','--disable-extensions','--no-first-run','--mute-audio','--allow-file-access-from-files','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader','--autoplay-policy=no-user-gesture-required'],
    defaultViewport: { width: 1440, height: 810 } });
  const page = await browser.newPage();
  const errs = []; page.on('pageerror', e => errs.push(String(e.message).slice(0,100)));
  await page.goto(FILE, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.waitForFunction('window.cc && cc.game && cc.game._prepared === true', { timeout: 120000, polling: 150 });
  const scene = () => page.evaluate(() => cc.director.getScene() ? cc.director.getScene().name : null);
  async function tap(x,y,s){ await page.mouse.move(x,y); await page.mouse.down(); await sleep(70); await page.mouse.up(); await sleep(s||900); }
  for (let i=0;i<90;i++){ if((await scene())==='HallScene') break; if(i%3===1) await tap(720,400,500); else await sleep(400); }
  await sleep(3000);
  // start sampling BEFORE switching, sample every ~30ms for 900ms
  const samples = await page.evaluate(async () => {
    const out = [];
    const names = ['editorSmall_previewWorld','editorSmall_previewLevel','editorSmall_exportJson','editorSmall_importJson','editorBtn_createWorld','editorBtn_createLevel'];
    function snap(tag){
      const W = cc.view.getVisibleSize().width, H = cc.view.getVisibleSize().height;
      const v = (window.hallScene && hallScene.viewGroup) ? hallScene.viewGroup[5] : null;
      const rows = [];
      if (v && v.isValid) {
        names.forEach(n => {
          const c = v.getChildByName(n);
          if (!c || !c.isValid) { rows.push([n, null, null]); return; }
          const p = c.convertToWorldSpaceAR(cc.v2(0,0));
          const inside = (p.x - c.width/2 >= -1) && (p.x + c.width/2 <= W+1) && (p.y - c.height/2 >= -1) && (p.y + c.height/2 <= H+1);
          rows.push([n, c.opacity, inside]);
        });
        out.push({ tag: tag, pageActive: v.activeInHierarchy, pageX: v.convertToWorldSpaceAR(cc.v2(0,0)).x, rows: rows, shown: (window.MazeDashCustomTab && MazeDashCustomTab.stats) ? MazeDashCustomTab.stats.editorHomeButtonsShown : 'n/a' });
      } else { out.push({ tag: tag, pageActive: false, rows: [], shown: 'no-view' }); }
    }
    snap('t0');
    try { gamemain.showTabBarViewIndex = 5; hallScene.showBarView(); } catch (e) { out.push({ tag:'ERR', err:String(e.message) }); }
    for (let i = 0; i < 30; i++) { await new Promise(r => setTimeout(r, 30)); snap('t' + (i + 1) * 30); }
    return out;
  });
  const violations = [];
  /* the last sample is the settled page; its world origin is the reference for "settled" */
  const settledX = (samples[samples.length - 1] || {}).pageX;
  /* Only frames where the editor page is VISIBLE AND SETTLED count. A page mid-slide is already
     activeInHierarchy=true but is still travelling, so its buttons are legitimately outside the
     viewport - they are riding in with the page, which is exactly what the fix is for. A settled
     page (world origin at the visible centre) with a button outside the viewport IS a defect. */
  samples.forEach(s => { (s.rows || []).forEach(r => { if (s.pageActive && settledX !== null && settledX !== undefined && Math.abs((s.pageX || 0) - settledX) < 2 && r[1] > 0 && r[2] === false) violations.push([s.tag, r[0], r[1]]); }); });
  const last = samples[samples.length - 1];
  console.log('SAMPLES:', samples.length);
  console.log('VIOLATIONS (visible && offscreen):', violations.length, JSON.stringify(violations.slice(0,4)));
  console.log('LAST: pageActive=' + last.pageActive + ' shown=' + last.shown);
  console.log('LAST ROWS:', JSON.stringify(last.rows));
  console.log('ERRS:', JSON.stringify(errs.slice(0,3)));
  await page.screenshot({ path: 'E:\\maze_dash\\docs\\screenshots\\111-jump-invariant.png' });
  await browser.close(); process.exit(0);
})().catch(e => { console.error('HARNESS ERROR', e); process.exit(1); });
