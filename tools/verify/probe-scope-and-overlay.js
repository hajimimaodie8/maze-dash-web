const puppeteer = require('puppeteer-core');
const CHROME = 'C:\\Users\\Lenovo\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe';
const FILE = 'file:///E:/maze_dash/dist/MazeDash-standalone.html';
const SHOTS = 'E:\\maze_dash\\docs\\screenshots\\';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const log = (k, v) => console.log('P ' + k + ':', typeof v === 'string' ? v : JSON.stringify(v));
(async () => {
    const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', userDataDir: 'E:\\maze_dash\\_work\\test\\chrome-profile-scope', protocolTimeout: 300000,
        args: ['--no-sandbox','--disable-extensions','--no-first-run','--mute-audio','--allow-file-access-from-files','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader'], defaultViewport: { width: 1440, height: 810 } });
    const page = await browser.newPage();
    // hooks installed BEFORE any page script runs
    await page.evaluateOnNewDocument(() => {
        window.__errLog = [];
        const keep = (src, args) => { try { window.__errLog.push({ src: src, t: Date.now(), m: Array.from(args).map((a) => { try { return (a && a.stack) ? String(a.stack).slice(0, 240) : String(a).slice(0, 200); } catch (e) { return '?'; } }).join(' | ') }); if (window.__errLog.length > 40) { window.__errLog.shift(); } } catch (e) {} };
        const ce = console.error.bind(console), cw = console.warn.bind(console);
        console.error = function () { keep('console.error', arguments); return ce.apply(null, arguments); };
        console.warn = function () { keep('console.warn', arguments); return cw.apply(null, arguments); };
        const iv = setInterval(() => { if (window.cc && !window.cc.__errHooked) { window.cc.__errHooked = true; const oe = cc.error, ow = cc.warn; cc.error = function () { keep('cc.error', arguments); return oe && oe.apply(cc, arguments); }; cc.warn = function () { keep('cc.warn', arguments); return ow && ow.apply(cc, arguments); }; clearInterval(iv); } }, 30);
    });
    const stacks = []; page.on('pageerror', (e) => stacks.push(String(e.stack || e.message).replace(/\s+/g, ' ').slice(0, 220)));
    const scene = () => page.evaluate(() => (cc.director.getScene() ? cc.director.getScene().name : '?'));
    async function tap(x, y, s) { await page.mouse.move(x, y); await page.mouse.down(); await sleep(70); await page.mouse.up(); await sleep(s || 900); }
    async function toHall() { for (let i = 0; i < 120; i++) { if ((await scene()) === 'HallScene') { return; } if (i % 3 === 1) { await tap(720, 400, 500); } else { await sleep(400); } } }
    const probe = () => page.evaluate(() => {
        const txt = (document.body && document.body.innerText) || '';
        const m = txt.match(/.{0,80}(运行出错|Uncaught|TypeError).{0,120}/);
        return { overlay: !!m, overlayText: m ? m[0].replace(/\s+/g, ' ') : null, errs: (window.__errLog || []).slice(-4) };
    });
    await page.goto(FILE, { waitUntil: 'domcontentloaded', timeout: 120000 });
    await page.waitForFunction('window.cc && cc.game && cc.game._prepared === true', { timeout: 120000, polling: 150 });
    await toHall(); await sleep(2500);
    const payload = await page.evaluate(() => JSON.stringify(window.MazeDashCustomTab.buildExportData()));

    const runOnce = async (mode, run) => {
        stacks.length = 0;
        if (mode === 'P2') {
            await page.evaluate(() => { try { localStorage.removeItem('maze_dash_custom_levels'); localStorage.removeItem('maze_dash_custom_worlds'); } catch (e) {} });
            await page.reload({ waitUntil: 'domcontentloaded', timeout: 120000 });
            await page.waitForFunction('window.cc && cc.game && cc.game._prepared === true', { timeout: 120000, polling: 150 });
            await toHall(); await sleep(2500);
        } else {
            // P1: keep the profile, just import again and enter (the common real-user shape)
            await page.evaluate(() => { try { gamemain.enterEnterGameScene(10101); } catch (e) {} });
            for (let i = 0; i < 60; i++) { const r = await page.evaluate(() => { const m = cc.find('Canvas/backgroup/game_map'); const cp = m && m.getComponent && m.getComponent('game_map'); return !!(cp && cp.Level_data); }); if (r) { break; } await sleep(150); }
            await sleep(1200);
        }
        await page.evaluate(() => { window.__errLog && (window.__errLog.length = 0); });
        const imp = await page.evaluate((j) => { const api = window.MazeDashCustomTab; const r = api.importCustomJson(j); return { ok: r.ok, levels: r.levels, colours: r.colours }; }, payload);
        const afterImport = await probe();
        await page.evaluate(() => { try { gamemain.enterEnterGameScene(10101); } catch (e) {} });
        let entered = false;
        for (let i = 0; i < 100; i++) { const r = await page.evaluate(() => { const m = cc.find('Canvas/backgroup/game_map'); const cp = m && m.getComponent && m.getComponent('game_map'); return !!(cp && cp.Level_data); }); if (r) { entered = true; break; } await sleep(150); }
        await sleep(2500);
        const after = await probe();
        const rec = { mode: mode, run: run, import: imp, entered: entered, overlayAfterImport: afterImport.overlay, overlayAfterEnter: after.overlay, overlayText: (after.overlayText || afterImport.overlayText || null), stacks: stacks.length, engineErrs: after.errs };
        log(mode + '_run' + run, rec);
        if (after.overlay || afterImport.overlay) { await page.screenshot({ path: SHOTS + 'FAILED-' + mode + '-run' + run + '.png' }); }
        return { failed: (after.overlay || afterImport.overlay) || stacks.length > 0, rec: rec };
    };

    const res = [];
    for (let i = 1; i <= 3; i++) { res.push(await runOnce('P1', i)); }
    for (let i = 1; i <= 3; i++) { res.push(await runOnce('P2', i)); }
    const p1 = res.filter((r) => r.rec.mode === 'P1'), p2 = res.filter((r) => r.rec.mode === 'P2');
    log('SUMMARY', { P1: p1.filter((r) => r.failed).length + '/3 failed', P2: p2.filter((r) => r.failed).length + '/3 failed',
                     P1_texts: p1.map((r) => r.rec.overlayText), P1_engine: p1.map((r) => (r.rec.engineErrs || []).length),
                     P2_texts: p2.map((r) => r.rec.overlayText), P2_engine: p2.map((r) => (r.rec.engineErrs || []).length) });
    const firstErr = res.map((r) => (r.rec.engineErrs || [])[0]).filter(Boolean)[0];
    if (firstErr) { log('firstEngineError', firstErr); }
    await browser.close(); process.exit(0);
})().catch((e) => { console.error('HARNESS ERROR', e); process.exit(1); });
