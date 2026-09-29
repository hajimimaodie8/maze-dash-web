const puppeteer = require('puppeteer-core');
const CHROME = 'C:\\Users\\Lenovo\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe';
const FILE = 'file:///E:/maze_dash/dist/MazeDash-standalone.html';
const SHOTS = 'E:\\maze_dash\\docs\\screenshots\\';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const log = (k, v) => console.log('T ' + k + ':', typeof v === 'string' ? v : JSON.stringify(v));
async function banner(page, t, c) { await page.evaluate((x, k) => { let d = document.getElementById('probeAssertLine'); if (!d) { d = document.createElement('div'); d.id = 'probeAssertLine'; document.body.appendChild(d); } d.textContent = x; d.style.cssText = 'position:fixed;left:0;top:0;width:100%;padding:8px 12px;background:#101018;color:' + k + ';font:15px/1.35 monospace;z-index:2147483647'; }, t, c || '#7CFFB2'); await sleep(250); }
(async () => {
    const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', userDataDir: 'E:\\maze_dash\\_work\\test\\chrome-profile-stress', protocolTimeout: 300000,
        args: ['--no-sandbox','--disable-extensions','--no-first-run','--mute-audio','--allow-file-access-from-files','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader'], defaultViewport: { width: 1440, height: 810 } });
    const page = await browser.newPage();
    let stacks = []; let enters = 0;
    page.on('pageerror', (e) => stacks.push({ t: Date.now(), s: String(e.stack || e.message).replace(/\s+/g, ' ').slice(0, 300) }));
    const scene = () => page.evaluate(() => (cc.director.getScene() ? cc.director.getScene().name : '?'));
    async function tap(x, y, s) { await page.mouse.move(x, y); await page.mouse.down(); await sleep(70); await page.mouse.up(); await sleep(s || 900); }
    async function toHall() { for (let i = 0; i < 120; i++) { if ((await scene()) === 'HallScene') { return; } if (i % 3 === 1) { await tap(720, 400, 500); } else { await sleep(400); } } }
    const ov = () => page.evaluate(() => /运行出错|Uncaught|TypeError/.test((document.body && document.body.innerText) || ''));

    await page.goto(FILE, { waitUntil: 'domcontentloaded', timeout: 120000 });
    await page.waitForFunction('window.cc && cc.game && cc.game._prepared === true', { timeout: 120000, polling: 150 });
    await toHall(); await sleep(3000);
    const payload = await page.evaluate(() => JSON.stringify(window.MazeDashCustomTab.buildExportData()));
    log('payload', { bytes: payload.length, version: JSON.parse(payload).version, colours: Object.keys(JSON.parse(payload).colours || {}).length });

    let shots = { result: false, played: false, failed: [] };
    const results = [];
    for (let run = 1; run <= 3; run++) {
        stacks = []; enters = 0;
        await page.evaluate(() => { try { localStorage.removeItem('maze_dash_custom_levels'); localStorage.removeItem('maze_dash_custom_worlds'); } catch (e) {} });
        const t0 = Date.now();
        await page.reload({ waitUntil: 'domcontentloaded', timeout: 120000 });
        await page.waitForFunction('window.cc && cc.game && cc.game._prepared === true', { timeout: 120000, polling: 150 });
        await toHall(); await sleep(2500);
        const tHall = Date.now();
        stacks = [];
        const imp = await page.evaluate((j) => { const api = window.MazeDashCustomTab; const res = api.importCustomJson(j); try { api.showImportSummary(res); } catch (e) {} return { res: res, summary: api.stats.importSummary || null, rows: (conf.all_Level[10101] || []).length, imports: api.stats.imports || 0, entries: api.stats.levelEntryHook || 0 }; }, payload);
        const tImport = Date.now();
        const ovImp = await ov();
        if (!ovImp && !shots.result) {
            await banner(page, 'run' + run + ' IMPORT ok:' + imp.res.ok + ' levels:' + imp.res.levels + ' colours:' + imp.res.colours + ' rows:' + imp.rows + ' summary:' + imp.summary, '#7CFFB2');
            await page.screenshot({ path: SHOTS + '66-import-result.png' }); shots.result = true;
        }
        await page.evaluate(() => { try { gamemain.enterEnterGameScene(10101); } catch (e) {} });
        let entered = false;
        for (let i = 0; i < 100; i++) { const r = await page.evaluate(() => { const m = cc.find('Canvas/backgroup/game_map'); const cp = m && m.getComponent && m.getComponent('game_map'); return !!(cp && cp.Level_data); }); if (r) { entered = true; break; } await sleep(150); }
        await sleep(3000);
        const tEnter = Date.now();
        const st = await page.evaluate(() => { const s = window.MazeDashCustomTab.stats; const lv = (function () { try { return window.localStorage.getItem('enter_levels_id'); } catch (e) { return null; } })(); const m = cc.find('Canvas/backgroup/game_map'); const cp = m && m.getComponent && m.getComponent('game_map'); const o = { overlay: /运行出错|Uncaught|TypeError/.test((document.body && document.body.innerText) || ''), arg: s.getLastWordIdArg || null, short: s.getLastWordIdShortCircuit || 0, imports: s.imports || 0, dup: s.duplicateEnterIgnored || 0, lastEntered: s.lastEnteredLevelId || null }; if (cp && cp.Level_data) { let h = 0, p = 0; Object.keys(cp.Level_data).forEach((y) => Object.keys(cp.Level_data[y]).forEach((x) => { const v = cp.Level_data[y][x]; if (v === -1) { h++; } if (v === 2) { p++; } })); o.rows = Object.keys(cp.Level_data).length; o.heads = h; o.portals = p; } o.enterLevelsId = lv; o.seen = s.enterLevelsIdSeen || null; o.cleared = s.enterLevelsIdCleared || 0; return o; });
        const ok = entered && !st.overlay && stacks.length === 0;
        const rec = { run: run, entered: entered, overlayAfterImport: ovImp, overlayAfterEnter: st.overlay, stacks: stacks.length, rows: st.rows, heads: st.heads, portals: st.portals,
                      timing: { importMs: tImport - tHall, enterMs: tEnter - tImport }, stats: { imports: st.imports, short: st.short, dup: st.dup, lastEntered: st.lastEntered, enterLevelsId: st.enterLevelsId, seen: st.seen, cleared: st.cleared } };
        results.push(rec);
        log('run' + run, rec);
        if (ok && !shots.played) {
            await banner(page, 'run' + run + ' IMPORT-ENTER ok:true rows:' + st.rows + ' heads:' + st.heads + ' portals:' + st.portals + ' stacks:0', '#7CFFB2');
            await page.screenshot({ path: SHOTS + '67-import-played.png' }); shots.played = true;
        }
        if (!ok) {
            await banner(page, 'run' + run + ' FAILED stacks:' + stacks.length + ' overlay:' + st.overlay, '#FF8080');
            await page.screenshot({ path: SHOTS + 'FAILED-import-enter-run' + run + '.png' });
            shots.failed.push(run);
            stacks.slice(0, 2).forEach((x, i) => log('run' + run + '_stack' + (i + 1), x.s));
        }
    }
    const fails = results.filter((r) => r.stacks > 0 || r.overlayAfterEnter).length;
    log('SUMMARY', { runs: results.length, failedRuns: fails, denominator: fails + '/' + results.length, shots: shots, allClean: fails === 0 });
    await browser.close(); process.exit(0);
})().catch((e) => { console.error('HARNESS ERROR', e); process.exit(1); });
