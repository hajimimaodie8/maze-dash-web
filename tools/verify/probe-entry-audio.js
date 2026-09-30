const puppeteer = require('puppeteer-core');
const CHROME = 'C:\\Users\\Lenovo\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe';
const FILE = 'file:///E:/maze_dash/dist/MazeDash-standalone.html';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
    const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new',
        userDataDir: 'E:\\maze_dash\\_work\\test\\chrome-audio-susp', protocolTimeout: 180000,
        args: ['--no-sandbox','--disable-extensions','--no-first-run','--mute-audio','--allow-file-access-from-files',
               '--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader'],
        defaultViewport: { width: 1440, height: 810 } });
    const page = await browser.newPage();
    const errs = []; page.on('pageerror', (e) => errs.push(String(e.message).slice(0, 120)));
    await page.evaluateOnNewDocument(() => {
        window.__playCalls = []; window.__tsOnCanvas = 0;
        const orig = HTMLMediaElement.prototype.play;
        HTMLMediaElement.prototype.play = function () {
            try { window.__playCalls.push(String(this.src || '').split('/').pop()); } catch (e) {}
            return orig.apply(this, arguments);
        };
        document.addEventListener('DOMContentLoaded', () => {
            const c = document.getElementById('GameCanvas') || document.querySelector('canvas');
            if (c) { c.addEventListener('touchstart', () => { window.__tsOnCanvas++; }, true); }
        });
    });
    await page.goto(FILE, { waitUntil: 'domcontentloaded', timeout: 120000 });
    await page.waitForFunction('window.cc && cc.game && cc.game._prepared === true', { timeout: 120000, polling: 150 });
    await sleep(2500);
    // simulate the real device: suspend the context, then make the game "play" sounds
    const r1 = await page.evaluate(() => {
        const ctx = cc.sys.__audioSupport.context;
        try { ctx.suspend(); } catch (e) {}
        return { state: ctx.state, wrapped: !!(window.MazeDashPort && window.MazeDashPort.audioWrapped) };
    });
    console.log('SUSPENDED:', JSON.stringify(r1));
    const r2 = await page.evaluate(() => {
        for (let i = 0; i < 3; i++) { try { cc.audioEngine.playEffect({}, false); } catch (e) {} }
        return { queued: window.MazeDashPort.audioQueuedByUs || 0, tsOnCanvas: window.__tsOnCanvas };
    });
    console.log('AFTER 3 CALLS WHILE SUSPENDED:', JSON.stringify(r2));
    await page.mouse.move(720, 420); await page.mouse.down(); await sleep(60); await page.mouse.up();
    await sleep(1500);
    const r3 = await page.evaluate(() => ({
        state: cc.sys.__audioSupport.context.state,
        queued: window.MazeDashPort.audioQueuedByUs || 0,
        replayed: window.MazeDashPort.audioReplayed || 0,
        flushed: window.MazeDashPort.audioFlushed || 0,
        tsOnCanvas: window.__tsOnCanvas,
        plays: (window.__playCalls || []).length,
    }));
    console.log('AFTER REAL CLICK:', JSON.stringify(r3));
    console.log('ERRS:', JSON.stringify(errs.slice(0, 3)));
    await browser.close(); process.exit(0);
})().catch((e) => { console.error('HARNESS ERROR', e && e.message); process.exit(1); });
