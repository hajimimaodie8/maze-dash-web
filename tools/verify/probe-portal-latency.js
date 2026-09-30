const puppeteer = require('puppeteer-core');
const CHROME = 'C:\\Users\\Lenovo\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe';
const FILE = 'file:///E:/maze_dash/dist/MazeDash-standalone.html';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new',
    userDataDir: 'E:\\maze_dash\\_work\\test\\chrome-profile-latency', protocolTimeout: 240000,
    args:['--no-sandbox','--disable-extensions','--no-first-run','--mute-audio','--allow-file-access-from-files','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader','--autoplay-policy=no-user-gesture-required'],
    defaultViewport:{width:1440,height:810} });
  const page = await browser.newPage();
  const errs=[]; page.on('pageerror',e=>errs.push(String(e.message).slice(0,110)));
  await page.goto(FILE,{waitUntil:'domcontentloaded',timeout:120000});
  await page.waitForFunction('window.cc && cc.game && cc.game._prepared === true',{timeout:120000,polling:150});
  const scene=()=>page.evaluate(()=>cc.director.getScene()?cc.director.getScene().name:null);
  const tap=async(x,y,s)=>{await page.mouse.move(x,y);await page.mouse.down();await sleep(60);await page.mouse.up();await sleep(s||800);};
  for(let i=0;i<90;i++){ if((await scene())==='HallScene') break; if(i%3===1) await tap(720,400,500); else await sleep(400); }
  await sleep(2500);
  await page.evaluate(()=>{ gamemain.showTabBarViewIndex=5; hallScene.showBarView(); });
  await sleep(900);
  await page.evaluate(()=>{ MazeDashCustomTab.editorAction('createLevel'); });
  await page.waitForFunction('window.MazeDashCustomTab && MazeDashCustomTab.gridEditor && MazeDashCustomTab.gridEditor.grid',{timeout:20000,polling:150});
  await sleep(600);
  const res = await page.evaluate(async () => {
    const ed = MazeDashCustomTab.gridEditor;
    const g = ed.grid, N = g.length;
    const out = { N: N, clickMs: [], solveMs: null, solveNodes: null, stats: null };
    // 满传送门场景：两排各 3 个门 + 一圈地板（照世界 101 的测试关卡结构）
    const set = (x,y,v)=>{ if(g[y]&&g[y][x]!==undefined) g[y][x]=v; };
    for (let x=4;x<16;x++){ set(x,8,1); set(x,9,1); set(x,10,1); }
    set(5,9,2); set(7,9,2); set(9,9,2); set(11,9,2); set(13,9,2); set(15,9,2);
    const t0=(window.performance&&performance.now)?()=>performance.now():()=>Date.now();
    // 连续 6 次编辑，测“事件到本次写入完成”的耗时
    for (let k=0;k<6;k++){
      const a=t0(); try { ed.paint(6+k, 8); } catch(e){} const b=t0();
      out.clickMs.push(Math.round((b-a)*100)/100);
    }
    // 等防抖求解跑完，再单独量一次完整求解
    await new Promise(r=>setTimeout(r,900));
    const a=t0(); const r = ed.solve ? ed.solve() : null; const b=t0();
    out.solveMs = Math.round((b-a)*100)/100;
    try { out.solveNodes = r && r.nodes !== undefined ? r.nodes : (r && r.state) || null; } catch(e){}
    out.stats = { skipped: MazeDashCustomTab.stats.solveDebounceSkipped||0,
                  runs: MazeDashCustomTab.stats.solveDebounceRuns||0,
                  lastMs: MazeDashCustomTab.stats.solveDebounceLastMs||0 };
    return out;
  });
  console.log('N=', res.N, ' 每次编辑耗时(ms)=', JSON.stringify(res.clickMs));
  console.log('防抖求解: skipped=', res.stats.skipped, ' runs=', res.stats.runs, ' lastMs=', res.stats.lastMs);
  console.log('单独一次完整求解: ms=', res.solveMs, ' 结果=', JSON.stringify(res.solveNodes));
  console.log('errs=', JSON.stringify(errs.slice(0,3)));
  await page.screenshot({path:'E:\\maze_dash\\docs\\screenshots\\94-portal-latency.png'});
  await browser.close(); process.exit(0);
})().catch(e=>{ console.error('HARNESS ERROR', e && e.message); process.exit(1); });
