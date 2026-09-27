/* Faces/quest list widening + capture what a level load actually requests (for a preloader). */
'use strict';
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const puppeteer = require('puppeteer-core');
const WEB = 'E:\\maze_dash\\web';
const SHOTS = path.join(__dirname, 'shots');
const CHROME = 'C:\\Users\\Lenovo\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 8193;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const checks = [];
function check(n, ok, d) { checks.push({ n, ok: !!ok, d }); console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}${d !== undefined ? '   ' + JSON.stringify(d) : ''}`); }

(async () => {
    const server = spawn(process.execPath, [path.join(WEB, 'serve.js'), String(PORT)], { stdio: 'ignore' });
    await sleep(900);
    const browser = await puppeteer.launch({
        executablePath: CHROME, headless: 'new',
        userDataDir: path.join(__dirname, 'chrome-profile-faces'),
        args: ['--no-sandbox', '--disable-extensions', '--no-first-run', '--mute-audio',
            '--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader',
            '--autoplay-policy=no-user-gesture-required', '--window-size=1280,800'],
        defaultViewport: { width: 1280, height: 800 },
    });
    const page = await browser.newPage();
    const errs = [];
    const reqs = [];
    let phase = 'boot';
    page.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
    page.on('request', (r) => { if (phase === 'level' && !/\.mp3|\.png$/.test(r.url())) { reqs.push(r.url().replace(/^https?:\/\/[^/]+/, '')); } });
    page.on('console', (m) => { if (m.type() === 'error' && !/not defined in the Scene/.test(m.text())) errs.push('console: ' + m.text()); });
    await page.goto(`http://127.0.0.1:${PORT}/index.html`, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction('window.cc && cc.game._prepared === true && !!window.gamemain', { timeout: 60000, polling: 200 });
    const scene = () => page.evaluate(() => (cc.director.getScene() ? cc.director.getScene().name : null));
    async function tap(x, y, s) { await page.mouse.move(x, y); await page.mouse.down(); await sleep(70); await page.mouse.up(); await sleep(s || 900); }
    for (let i = 0; i < 60; i++) {
        if ((await scene()) === 'HallScene') { break; }
        if (i % 3 === 1) { await tap(640, 400, 500); } else { await sleep(400); }
    }
    await sleep(4500);

    // ---- faces page ----
    await page.evaluate(() => { gamemain.showTabBarViewIndex = 1; window.hallScene.showBarView(); });
    await sleep(2200);
    const faces = await page.evaluate(() => {
        function cn(c) { try { return cc.js.getClassName(c); } catch (e) { return '?'; } }
        const page = window.hallScene.viewGroup[1];
        const sv = page.getChildByName('scrollview') || page.getChildByName('scrollView');
        const sc = sv && sv.getComponent(cc.ScrollView);
        const content = sc && sc.content;
        const items = content ? content.children.filter((c) => c.activeInHierarchy) : [];
        const xs = Array.from(new Set(items.map((c) => Math.round(c.x)))).sort((a, b) => a - b);
        const ys = Array.from(new Set(items.map((c) => Math.round(c.y)))).sort((a, b) => b - a);
        const view = sv && sv.getChildByName('view');
        return {
            W: Math.round(cc.view.getVisibleSize().width),
            sv: sv ? [Math.round(sv.width), Math.round(sv.height)] : null,
            view: view ? [Math.round(view.width), Math.round(view.height)] : null,
            content: content ? [Math.round(content.width), Math.round(content.height)] : null,
            items: items.length,
            cols: xs.length, rows: ys.length,
            layout: content && content.getComponent(cc.Layout) ? (function () { const l = content.getComponent(cc.Layout); return { type: l.type, resizeMode: l.resizeMode, cell: [l.cellSize.width, l.cellSize.height], spacing: [l.spacingX, l.spacingY] }; })() : null,
            stats: window.MazeDashWide ? window.MazeDashWide.stats : null,
        };
    });
    console.log('faces page:', JSON.stringify(faces));
    check('the faces list container is widened', !!faces.content && faces.content[0] >= faces.W - 200, faces.content);
    check('the faces list Mask is widened', !!faces.view && faces.view[0] >= faces.W - 200, faces.view);
    check('the skins are laid out across more columns', faces.cols >= 6, { cols: faces.cols, rows: faces.rows, items: faces.items });
    await page.screenshot({ path: path.join(SHOTS, 'faces-wide.png') });

    // ---- quests page ----
    try { await page.evaluate(() => { gamemain.showTabBarViewIndex = 3; window.hallScene.showBarView(); }); } catch (e) { errs.push('quests tab: ' + e.message); }
    await sleep(1800);
    const quests = await page.evaluate(() => {
        const page = window.hallScene.viewGroup[3];
        const sv = page.getChildByName('scrollview') || page.getChildByName('scrollView');
        const sc = sv && sv.getComponent(cc.ScrollView);
        const content = sc && sc.content;
        const view = sv && sv.getChildByName('view');
        return { content: content ? Math.round(content.width) : null, view: view ? Math.round(view.width) : null, W: Math.round(cc.view.getVisibleSize().width) };
    });
    console.log('quests page:', JSON.stringify(quests));
    check('opening the quests tab does not throw (it is left at its authored width)', errs.filter((e) => /count|quest/i.test(e)).length === 0, errs.slice(0, 3));

    // ---- capture what entering a level requests ----
    phase = 'level';
    await page.evaluate(() => {
        const c = cc.find('Canvas/gameView/scrollView').getComponent(cc.ScrollView).content.children.find((p) => p.getComponent('StageSelectLayer')).getComponent('StageSelectLayer');
        const cfg = conf.stage_level_cfg[c.m_stageId];
        gamemain.enterEnterGameScene(cfg[Object.keys(cfg)[0]].id);
    });
    for (let i = 0; i < 30; i++) { if ((await scene()) === 'gameScene') { break; } await sleep(500); }
    await sleep(6000);
    const uniq = Array.from(new Set(reqs)).filter((u) => /json|import|assets|res\//.test(u));
    console.log('\nlevel-load requests (non image/audio, unique):', uniq.length);
    uniq.slice(0, 20).forEach((u) => console.log('   ', u));
    check('no page errors', errs.length === 0, errs.slice(0, 5));
    const failed = checks.filter((c) => !c.ok);
    console.log(`\n============ ${checks.length - failed.length}/${checks.length} checks passed ============`);
    fs.writeFileSync(path.join(__dirname, 'faces-result.json'), JSON.stringify({ faces, quests, uniq, checks, errs }, null, 2));
    await browser.close();
    server.kill();
    process.exit(failed.length ? 2 : 0);
})().catch((e) => { console.error('HARNESS ERROR', e); process.exit(1); });
