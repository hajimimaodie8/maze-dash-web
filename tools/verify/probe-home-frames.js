const puppeteer = require('puppeteer-core');
const CHROME = 'C:\\Users\\Lenovo\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe';
const FILE = 'file:///E:/maze_dash/dist/MazeDash-standalone.html';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
    const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new',
        userDataDir: 'E:\\maze_dash\\_work\\test\\chrome-profile-homeframes', protocolTimeout: 180000,
        args: ['--no-sandbox','--disable-extensions','--no-first-run','--mute-audio','--allow-file-access-from-files','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader'],
        defaultViewport: { width: 1440, height: 810 } });
    const page = await browser.newPage();
    const errs = []; page.on('pageerror', (e) => errs.push(String(e.message).slice(0, 120)));
    await page.goto(FILE, { waitUntil: 'domcontentloaded', timeout: 120000 });
    await page.waitForFunction('window.cc && cc.game && cc.game._prepared === true', { timeout: 120000, polling: 150 });
    const scene = () => page.evaluate(() => (cc.director.getScene() ? cc.director.getScene().name : null));
    async function tap(x, y, s) { await page.mouse.move(x, y); await page.mouse.down(); await sleep(70); await page.mouse.up(); await sleep(s || 900); }
    for (let i = 0; i < 90; i++) { if ((await scene()) === 'HallScene') { break; } if (i % 3 === 1) { await tap(720, 400, 500); } else { await sleep(400); } }
    await sleep(3000);
    // start the per-frame sampler, THEN switch to the editor page
    await page.evaluate(() => {
        window.__frames = [];
        window.__layerInfo = null;
        let n = 0;
        const KEYS = ['editorSmall_previewWorld', 'editorSmall_previewLevel', 'editorSmall_exportJson', 'editorSmall_importJson', 'editorBtn_createWorld', 'editorBtn_createLevel'];
        const tick = () => {
            const L = cc.find('Canvas/mazeDashHomeLayer');
            if (L) {
                const st = (window.MazeDashCustomTab && MazeDashCustomTab.stats) || {};
                const rec = { layerActive: L.active, layerZ: L.zIndex, parent: L.parent ? L.parent.name : null, layerXY: [Math.round(L.x), Math.round(L.y)], bigShifted: st.editorBigBtnShifted || 0, stillOff: st.editorBigBtnStillOff || 0, pos: [] };
                KEYS.forEach((k) => { const c = L.getChildByName(k); rec.pos.push(c ? [Math.round(c.convertToWorldSpaceAR(cc.v2(0, 0)).x), Math.round(c.convertToWorldSpaceAR(cc.v2(0, 0)).y)] : null); });
                window.__frames.push(rec);
                window.__layerInfo = { parent: rec.parent, z: rec.layerZ, size: [L.width, L.height] };
            }
            if (++n < 8) { requestAnimationFrame(tick); }
        };
        requestAnimationFrame(tick);
    });
    await page.evaluate(() => { gamemain.showTabBarViewIndex = 5; window.hallScene.showBarView(); });
    await sleep(1200);
    const res = await page.evaluate(() => {
        const f = window.__frames || [];
        const key = JSON.stringify(f.filter((x) => x.layerActive).map((x) => x.pos));
        const actives = f.filter((x) => x.layerActive);
        const first = actives.length ? JSON.stringify(actives[0].pos) : null;
        const same = actives.every((x) => JSON.stringify(x.pos) === first);
        const inside = (() => { const vs = cc.view.getVisibleSize(); const p = actives.length ? actives[actives.length - 1].pos : []; return p.every((c) => c && c[0] >= 0 && c[0] <= vs.width && c[1] >= 0 && c[1] <= vs.height); })();
        return { frames: f.length, activeFrames: actives.length, positionsAllSame: same, inside, first: first, series: actives, layerInfo: window.__layerInfo, toggles: (window.MazeDashCustomTab && MazeDashCustomTab.stats) ? MazeDashCustomTab.stats.homeLayerToggles : null };
    });
    console.log('LAYER:', JSON.stringify(res.layerInfo), ' toggles:', res.toggles);
    console.log('FRAMES sampled:', res.frames, ' activeFrames:', res.activeFrames);
    console.log('PER-FRAME positions identical:', res.positionsAllSame, ' all inside:', res.inside);
    console.log('SERIES:');
    (res.series || []).forEach((x, i) => console.log('   f' + i + ' layerXY=' + JSON.stringify(x.layerXY) + ' bigShifted=' + x.bigShifted + ' stillOff=' + x.stillOff + ' pos=' + JSON.stringify(x.pos)));
    console.log('errors:', JSON.stringify(errs.slice(0, 3)));
    const vis = await page.evaluate(() => {
        const L = cc.find('Canvas/mazeDashHomeLayer');
        if (!L) { return { layer: false }; }
        const keys = ['editorSmall_previewWorld','editorSmall_previewLevel','editorSmall_exportJson','editorSmall_importJson','editorBtn_createWorld','editorBtn_createLevel'];
        const out = {};
        keys.forEach((k) => { const c = L.getChildByName(k); out[k] = c ? { active: c.activeInHierarchy, op: c.opacity, x: Math.round(c.convertToWorldSpaceAR(cc.v2(0,0)).x), y: Math.round(c.convertToWorldSpaceAR(cc.v2(0,0)).y) } : null; });
        return { layer: true, layerActive: L.activeInHierarchy, layerOp: L.opacity, buttons: out };
    });
    console.log('VISIBILITY at screenshot time:', JSON.stringify(vis));
    await page.screenshot({ path: 'E:\\maze_dash\\docs\\screenshots\\110-home-screen-space.png' });
    await browser.close(); process.exit(0);
})().catch((e) => { console.error('HARNESS ERROR', e); process.exit(1); });
