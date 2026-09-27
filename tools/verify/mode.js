/* Verify: lock leak fixed, unlock mode works, in-level fills the width, mode UI renders. */
'use strict';
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const puppeteer = require('puppeteer-core');
const WEB = 'E:\\maze_dash\\web';
const SHOTS = path.join(__dirname, 'shots');
const CHROME = 'C:\\Users\\Lenovo\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 8190;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const checks = [];
function check(n, ok, d) { checks.push({ n, ok: !!ok, d }); console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}${d !== undefined ? '   ' + JSON.stringify(d) : ''}`); }

function pageState() {
    const sv = cc.find('Canvas/gameView/scrollView');
    const content = sv && sv.getComponent(cc.ScrollView).content;
    const pages = content ? content.children.filter((p) => p.getComponent('StageSelectLayer')) : [];
    const out = pages.map((p, i) => {
        const c = p.getComponent('StageSelectLayer');
        const host = (c.SelectLevelLayer && c.SelectLevelLayer.parent && c.SelectLevelLayer.parent.getComponent(cc.Layout)) ? c.SelectLevelLayer.parent : c.SelectLevelLayer;
        const btns = host ? (host.children || []).filter((b) => b.getComponent('LevelButton')).length : -1;
        return { world: c.m_stageId, select: c.SelectLayer ? c.SelectLayer.active : null, lock: c.LockLayer ? c.LockLayer.active : null, buttons: btns };
    });
    return {
        visible: [Math.round(cc.view.getVisibleSize().width), Math.round(cc.view.getVisibleSize().height)],
        mode: (function () { try { return localStorage.getItem('maze_dash_mode') || 'progression'; } catch (e) { return '?'; } })(),
        passCount: gamemain.getPassLevelCount(),
        pages: out,
        api: !!(window.MazeDashCustomTab && window.MazeDashCustomTab.applyMode),
    };
}

(async () => {
    const server = spawn(process.execPath, [path.join(WEB, 'serve.js'), String(PORT)], { stdio: 'ignore' });
    await sleep(900);
    const browser = await puppeteer.launch({
        executablePath: CHROME, headless: 'new',
        userDataDir: path.join(__dirname, 'chrome-profile-mode'),
        args: ['--no-sandbox', '--disable-extensions', '--no-first-run', '--mute-audio',
            '--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader',
            '--autoplay-policy=no-user-gesture-required', '--window-size=1280,800'],
        defaultViewport: { width: 1280, height: 800 },
    });
    const page = await browser.newPage();
    const errs = [];
    page.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
    page.on('console', (m) => { if (m.type() === 'error' && !/not defined in the Scene/.test(m.text())) errs.push('console: ' + m.text()); });
    await page.goto(`http://127.0.0.1:${PORT}/index.html`, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction('window.cc && cc.game._prepared === true && !!window.gamemain', { timeout: 60000, polling: 200 });
    const scene = () => page.evaluate(() => (cc.director.getScene() ? cc.director.getScene().name : null));
    async function tap(x, y, s) { await page.mouse.move(x, y); await page.mouse.down(); await sleep(70); await page.mouse.up(); await sleep(s || 900); }
    for (let i = 0; i < 60; i++) {
        if ((await scene()) === 'HallScene') { break; }
        if (i % 3 === 1) { await tap(640, 400, 500); } else { await sleep(400); }
    }
    await sleep(4000);

    const prog = await page.evaluate(pageState);
    console.log('progression:', JSON.stringify(prog.pages));
    check('progression mode is the default', prog.mode === 'progression', prog.mode);
    const locked = prog.pages.filter((p) => p.world > 1);
    check('locked worlds show the lock panel, not a grid', locked.every((p) => p.lock === true && p.select === false), locked);
    check('locked worlds render no level buttons', locked.every((p) => p.buttons <= 0), locked.map((p) => ({ w: p.world, b: p.buttons })));
    check('the first world is playable with a full grid', prog.pages[0] && prog.pages[0].select === true && prog.pages[0].buttons > 0, prog.pages[0]);
    check('the mode API is exposed', prog.api === true);

    const unlocked = await page.evaluate(() => {
        window.MazeDashCustomTab.applyMode('unlocked');
        return null;
    });
    await sleep(2200);
    const unl = await page.evaluate(pageState);
    console.log('unlocked:', JSON.stringify(unl.pages));
    check('unlock mode reports every world as unlocked', unl.passCount >= 9999, unl.passCount);
    check('every world now renders a level grid', unl.pages.every((p) => p.select === true && p.buttons > 0), unl.pages.map((p) => ({ w: p.world, s: p.select, b: p.buttons })));
    check('the choice is persisted', unl.mode === 'unlocked', unl.mode);
    await page.screenshot({ path: path.join(SHOTS, 'mode-01-unlocked.png') });

    // the custom-levels page must render the selector
    await page.evaluate(() => { gamemain.showTabBarViewIndex = 5; window.hallScene.showBarView(); });
    await sleep(1800);
    const ui = await page.evaluate(() => {
        const v = window.hallScene.viewGroup[5];
        const names = [];
        (function walk(n) { names.push(n.name); (n.children || []).forEach(walk); })(v);
        return { names: names.slice(0, 12), hasProg: names.indexOf('mode_progression') >= 0, hasUnl: names.indexOf('mode_unlocked') >= 0 };
    });
    console.log('custom page nodes:', JSON.stringify(ui.names));
    check('the mode selector is on the custom-levels page', ui.hasProg && ui.hasUnl, ui);
    await page.screenshot({ path: path.join(SHOTS, 'mode-02-selector.png') });

    // wide in-level: the board fills the width now
    const id = await page.evaluate(() => {
        const c = cc.find('Canvas/gameView/scrollView').getComponent(cc.ScrollView).content.children.find((p) => p.getComponent('StageSelectLayer')).getComponent('StageSelectLayer');
        const cfg = conf.stage_level_cfg[c.m_stageId];
        gamemain.enterEnterGameScene(cfg[Object.keys(cfg)[0]].id);
        return 1;
    });
    for (let i = 0; i < 30; i++) { if ((await scene()) === 'gameScene') { break; } await sleep(500); }
    await sleep(8000);
    // the headless run never activates the HUD row; force it so the spread mechanism can be checked
    await page.evaluate(() => {
        const bar = cc.find('Canvas/backgroup/button_group');
        if (bar) { bar.children.forEach((c) => { c.active = true; }); }
    });
    await sleep(3000);
    const lvl = await page.evaluate(() => {
        const bar = cc.find('Canvas/backgroup/button_group');
        return {
            scene: cc.director.getScene().name,
            design: [Math.round(cc.view.getDesignResolutionSize().width), Math.round(cc.view.getDesignResolutionSize().height)],
            visible: [Math.round(cc.view.getVisibleSize().width), Math.round(cc.view.getVisibleSize().height)],
            bar: bar ? { w: Math.round(bar.width), kids: bar.children.map((c) => Math.round(c.x)) } : null,
        };
    });
    console.log('in level:', JSON.stringify(lvl));
    check('gameplay uses the wide design', lvl.design[0] > 720 && lvl.visible[0] === lvl.design[0], { design: lvl.design, visible: lvl.visible });
    check('in-level buttons are spread across the width', !!lvl.bar && lvl.bar.w > 1200, lvl.bar);
    await page.screenshot({ path: path.join(SHOTS, 'mode-03-level.png') });
    check('no page errors', errs.length === 0, errs.slice(0, 5));

    const failed = checks.filter((c) => !c.ok);
    console.log(`\n============ ${checks.length - failed.length}/${checks.length} checks passed ============`);
    fs.writeFileSync(path.join(__dirname, 'mode-result.json'), JSON.stringify({ prog, unl, ui, lvl, checks, errs }, null, 2));
    await browser.close();
    server.kill();
    process.exit(failed.length ? 2 : 0);
})().catch((e) => { console.error('HARNESS ERROR', e); process.exit(1); });
