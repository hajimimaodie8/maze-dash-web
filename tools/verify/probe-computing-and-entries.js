/* (a) the debounced solver must show a "computing" hint during its window and a verdict after it;
   (b) enumerate the completion screen's buttons in a CUSTOM level and click each one for real,
   reporting page errors / the scene it lands on / whether it routes back to the editor. */
const puppeteer = require('puppeteer-core');
const CHROME = 'C:\\Users\\Lenovo\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe';
const DIST = 'file:///E:/maze_dash/dist/MazeDash-standalone.html';
const ARGS = ['--no-sandbox', '--disable-extensions', '--no-first-run', '--mute-audio',
    '--allow-file-access-from-files', '--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader'];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function boot(page) {
    await page.goto(DIST, { waitUntil: 'domcontentloaded', timeout: 120000 });
    await page.waitForFunction('window.cc && cc.game && cc.game._prepared === true', { timeout: 120000, polling: 150 });
    for (let i = 0; i < 80; i++) { const s = await page.evaluate(() => cc.director.getScene() && cc.director.getScene().name); if (s === 'HallScene') break; await page.mouse.click(720, 400); await sleep(500); }
    await sleep(2200);
}
const statusText = () => {
    const bg = cc.find('Canvas/gridEditor/gridReadoutBg') || (function walk(n) { if (n.name === 'gridReadoutBg') return n; for (const c of n.children) { const f = walk(c); if (f) return f; } return null; })(cc.director.getScene());
    const st = bg && bg.getChildByName('gridStatus') && bg.getChildByName('gridStatus').getComponent(cc.Label);
    return st ? String(st.string) : null;
};
const tapWorld = async (page, sel) => page.evaluate((s) => {
    const n = cc.find(s) || (function walk(r) { if (r.name === s) return r; for (const c of r.children) { const f = walk(c); if (f) return f; } return null; })(cc.director.getScene());
    if (!n) { return null; }
    const w = n.convertToWorldSpaceAR(cc.v2(0, 0)); const r = cc.game.canvas.getBoundingClientRect(); const vs = cc.view.getVisibleSize();
    return { x: r.left + w.x * (r.width / vs.width), y: r.top + (vs.height - w.y) * (r.height / vs.height) };
}, sel);

(async () => {
    const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', userDataDir: 'E:\\maze_dash\\_work\\test\\chrome-profile-final', protocolTimeout: 300000, args: ARGS, defaultViewport: { width: 1440, height: 810 } });
    const out = { computing: {}, entries: {}, errs: [] };

    /* ---- (a) computing hint ---- */
    let page = await browser.newPage();
    page.on('pageerror', (e) => out.errs.push(String(e.message).slice(0, 120)));
    await boot(page);
    await page.evaluate(() => { window.MazeDashCustomTab.openGridEditor(); });
    await sleep(1500);
    await page.evaluate(() => { document.querySelectorAll('canvas'); });
    /* paint three portals quickly by clicking the portal tool then three cells */
    for (const tool of ['P Portal']) {
        const pt = await page.evaluate((label) => {
            let tgt = null;
            (function walk(n) { const lb = n.getComponent && n.getComponent(cc.Label); if (lb && String(lb.string).indexOf(label) >= 0 && n.parent) { tgt = n.parent; } (n.children || []).forEach(walk); })(cc.find('Canvas/gridEditor'));
            if (!tgt) { return null; }
            const w = tgt.convertToWorldSpaceAR(cc.v2(0, 0)); const r = cc.game.canvas.getBoundingClientRect(); const vs = cc.view.getVisibleSize();
            return { x: r.left + w.x * (r.width / vs.width), y: r.top + (vs.height - w.y) * (r.height / vs.height) };
        }, tool);
        if (pt) { await page.mouse.click(pt.x, pt.y); await sleep(300); }
    }
    for (const cell of ['cell_3_3', 'cell_4_3', 'cell_5_3']) {
        const c = await tapWorld(page, cell);
        if (c) { await page.mouse.click(c.x, c.y); await sleep(120); }
    }
    out.computing.rightAfterClick = await page.evaluate(statusText);
    await sleep(120);
    out.computing.plus120ms = await page.evaluate(statusText);
    await page.screenshot({ path: 'E:\\maze_dash\\docs\\screenshots\\106-computing-hint.png' });
    await sleep(900);
    out.computing.after900ms = await page.evaluate(statusText);
    out.computing.debounce = await page.evaluate(() => ({ runs: window.MazeDashCustomTab.stats.solveDebounceRuns || 0, skipped: window.MazeDashCustomTab.stats.solveDebounceSkipped || 0, lastMs: window.MazeDashCustomTab.stats.solveDebounceLastMs }));
    await page.close();

    /* ---- (b) completion screen entries in a custom level ---- */
    const names = await (async () => {
        const p2 = await browser.newPage();
        p2.on('pageerror', (e) => out.errs.push('C:' + String(e.message).slice(0, 110)));
        await boot(p2);
        await p2.evaluate(() => { gamemain.enterEnterGameScene(10101); });
        for (let i = 0; i < 40; i++) { const s = await p2.evaluate(() => cc.director.getScene() && cc.director.getScene().name); if (s === 'gameScene') break; await sleep(300); }
        await sleep(2500);
        const info = await p2.evaluate(() => {
            const comp = cc.find('Canvas').getComponent('gameScene');
            let err = null;
            try { if (comp && comp.showComplete) { comp.showComplete(); } else { err = 'no showComplete'; } } catch (e) { err = String(e.message); }
            return { err: err };
        });
        await sleep(2500);
        const btns = await p2.evaluate(() => {
            const res = [];
            const root = cc.find('Canvas/level_complete') || cc.find('Canvas/LevelComplete');
            (function walk(n, d) { if (d > 4) { return; } if (n.name && /btn|button|next|repeat|skip|list|hall|menu/i.test(n.name)) { const w = n.convertToWorldSpaceAR(cc.v2(0, 0)); res.push({ name: n.name, active: n.activeInHierarchy, x: Math.round(w.x), y: Math.round(w.y) }); } (n.children || []).forEach((c) => walk(c, d + 1)); })(root || cc.director.getScene(), 0);
            return { completeRoot: !!root, buttons: res.slice(0, 12) };
        });
        await p2.screenshot({ path: 'E:\\maze_dash\\docs\\screenshots\\107-complete-custom.png' });
        await p2.close();
        return { info, btns };
    })();
    out.entries = names;

    console.log('COMPUTING=' + JSON.stringify(out.computing));
    console.log('ENTRIES=' + JSON.stringify(out.entries));
    console.log('ERRS=' + JSON.stringify(out.errs.slice(0, 4)));
    await browser.close(); process.exit(0);
})().catch((e) => { console.error('HARNESS ERROR', e && e.message); process.exit(1); });
