const puppeteer = require('puppeteer-core');
const CHROME = 'C:\\Users\\Lenovo\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe';
const FILE = 'file:///E:/maze_dash/dist/MazeDash-standalone.html';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
    const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new',
        userDataDir: 'E:\\maze_dash\\_work\\test\\chrome-profile-dup', protocolTimeout: 240000,
        args: ['--no-sandbox','--disable-extensions','--no-first-run','--mute-audio','--allow-file-access-from-files','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader'],
        defaultViewport: { width: 1440, height: 810 } });
    const page = await browser.newPage();
    const errs = []; page.on('pageerror', (e) => errs.push(String(e.message).slice(0, 100)));
    await page.goto(FILE, { waitUntil: 'domcontentloaded', timeout: 120000 });
    await page.waitForFunction('window.cc && cc.game && cc.game._prepared === true', { timeout: 120000, polling: 150 });
    const scene = () => page.evaluate(() => (cc.director.getScene() ? cc.director.getScene().name : '?'));
    async function tap(x, y, s) { await page.mouse.move(x, y); await page.mouse.down(); await sleep(70); await page.mouse.up(); await sleep(s || 900); }
    for (let i = 0; i < 90; i++) { if ((await scene()) === 'HallScene') { break; } if (i % 3 === 1) { await tap(720, 400, 500); } else { await sleep(400); } }
    await sleep(3500);
    async function enterAndPoll(id) {
        await page.evaluate((x) => { try { gamemain.enterEnterGameScene(x); } catch (e) {} }, id);
        for (let i = 0; i < 100; i++) {
            const r = await page.evaluate(() => { const m = cc.find('Canvas/backgroup/game_map'); const cp = m && m.getComponent && m.getComponent('game_map'); return !!(cp && cp.Level_data); });
            if (r) { return i * 150; }
            await sleep(150);
        }
        return -1;
    }
    const first = await enterAndPoll(10101);
    const errsAfterFirst = errs.length;
    const second = await enterAndPoll(10101);          // the path that used to throw
    await sleep(2500);
    const st = await page.evaluate(() => {
        const s = window.MazeDashCustomTab.stats;
        const m = cc.find('Canvas/backgroup/game_map');
        const cp = m && m.getComponent && m.getComponent('game_map');
        const out = { duplicateIgnored: s.duplicateEnterIgnored || 0, lastLevel: s.lastEnteredLevelId || null,
                      overlayError: /运行出错|Uncaught|TypeError/.test((document.body && document.body.innerText) || ''),
                      rows: 0, heads: 0, pairing: [] };
        if (cp && cp.Level_data) {
            const ps = [];
            Object.keys(cp.Level_data).forEach((y) => Object.keys(cp.Level_data[y]).forEach((x) => { const v = cp.Level_data[y][x]; if (v === -1) { out.heads++; } if (v === 2) { ps.push([parseInt(x, 10), parseInt(y, 10)]); } }));
            out.rows = Object.keys(cp.Level_data).length;
            out.pairing = ps.map((p) => { const d = cp.getOutPortal(cc.v2(p[0], p[1])); return p.join(',') + '->' + d.x + ',' + d.y; });
        }
        return out;
    });
    const pass = first >= 0 && second >= 0 && !st.overlayError && errs.length === 0;
    const text = 'DUPLICATE-ENTER ok:' + pass + ' first:' + first + 'ms second:' + second + 'ms dupIgnored:' + st.duplicateIgnored + ' errs:' + errs.length + ' overlay:' + st.overlayError + ' rows:' + st.rows + ' heads:' + st.heads;
    await page.evaluate((t) => {
        let d = document.getElementById('probeAssertLine');
        if (!d) { d = document.createElement('div'); d.id = 'probeAssertLine'; document.body.appendChild(d); }
        d.textContent = t;
        d.style.cssText = 'position:fixed;left:0;top:0;width:100%;padding:8px 12px;background:#101018;color:#7CFFB2;font:17px/1.35 monospace;z-index:2147483647';
    }, text);
    await sleep(300);
    console.log('ASSERT:', text);
    console.log('PAIRING:', JSON.stringify(st.pairing));
    console.log('ERRS:', JSON.stringify(errs.slice(0, 3)));
    if (pass) { await page.screenshot({ path: 'E:\\maze_dash\\docs\\screenshots\\64-duplicate-enter-fixed.png' }); }
    console.log('SCREENSHOT:', pass);
    await browser.close(); process.exit(pass ? 0 : 2);
})().catch((e) => { console.error('HARNESS ERROR', e); process.exit(1); });
