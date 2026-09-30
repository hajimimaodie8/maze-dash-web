const puppeteer = require('puppeteer-core');
const CHROME = 'C:\\Users\\Lenovo\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe';
const FILE = 'file:///E:/maze_dash/dist/MazeDash-standalone.html';
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new',
    userDataDir: 'E:\\maze_dash\\_work\\test\\chrome-profile-audio3', protocolTimeout: 180000,
    args: ['--no-sandbox','--mute-audio','--allow-file-access-from-files','--enable-unsafe-swiftshader',
           '--use-gl=angle','--use-angle=swiftshader','--no-first-run','--disable-extensions'],
    defaultViewport: { width: 1440, height: 810 } });
  const page = await browser.newPage();
  const errs = []; page.on('pageerror', e => errs.push(String(e.message).slice(0,120)));
  await page.evaluateOnNewDocument(() => {
    window.__starts = [];
    const S = (window.AudioBufferSourceNode && AudioBufferSourceNode.prototype) || null;
    if (S) { const o = S.start; S.start = function () { try { window.__starts.push(Date.now()); } catch (e) {} return o.apply(this, arguments); }; }
  });
  await page.goto(FILE, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.waitForFunction('window.cc && cc.game && cc.game._prepared === true', { timeout: 120000, polling: 150 });
  // force-suspend as soon as the context exists (simulates the real Edge policy)
  const sus = await page.evaluate(async () => {
    for (let i = 0; i < 200; i++) {
      const c = window.cc && cc.sys && cc.sys.__audioSupport && cc.sys.__audioSupport.context;
      if (c) { try { await c.suspend(); } catch (e) {} return { state: c.state, at: Date.now() }; }
      await new Promise(r => setTimeout(r, 20));
    }
    return { state: 'no-ctx' };
  });
  console.log('SUSPENDED:', JSON.stringify(sus));
  await sleep(7000);  // entry SFX fire ~3.3-5.6s while suspended
  const before = await page.evaluate(() => ({
    ctxState: cc.sys.__audioSupport.context.state,
    queued: window.MazeDashPort.audioQueuedByUs || 0,
    replayed: window.MazeDashPort.audioReplayed || 0,
    webaudioStarts: window.__starts.length
  }));
  console.log('BEFORE-CLICK:', JSON.stringify(before));
  await page.mouse.click(720, 400); await sleep(2000);
  const after = await page.evaluate(() => ({
    ctxState: cc.sys.__audioSupport.context.state,
    queued: window.MazeDashPort.audioQueuedByUs || 0,
    replayed: window.MazeDashPort.audioReplayed || 0,
    webaudioStarts: window.__starts.length,
    unlocks: window.MazeDashPort.audioUnlocks || 0
  }));
  console.log('AFTER-CLICK :', JSON.stringify(after));
  console.log('ERRORS:', JSON.stringify(errs.slice(0,3)));
  await browser.close(); process.exit(0);
})().catch(e => { console.error('HARNESS ERROR', e && e.message); process.exit(1); });
