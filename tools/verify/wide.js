/* Verify wide mode: the design fills the browser width, the bar and pages follow. */
'use strict';
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const puppeteer = require('puppeteer-core');
const WEB = 'E:\\maze_dash\\web';
const SHOTS = path.join(__dirname, 'shots');
const CHROME = 'C:\\Users\\Lenovo\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 8183;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const checks = [];
function check(n, ok, d) { checks.push({ n, ok: !!ok, d }); console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}${d !== undefined ? '   ' + JSON.stringify(d) : ''}`); }

(async () => {
    const server = spawn(process.execPath, [path.join(WEB, 'serve.js'), String(PORT)], { stdio: 'ignore' });
    await sleep(900);
    const browser = await puppeteer.launch({
        executablePath: CHROME, headless: 'new',
        userDataDir: path.join(__dirname, 'chrome-profile-wide2'),
        args: ['--no-sandbox', '--disable-extensions', '--no-first-run', '--mute-audio',
            '--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader',
            '--autoplay-policy=no-user-gesture-required', '--window-size=1280,800'],
        defaultViewport: { width: 1280, height: 800 },
    });
    const page = await browser.newPage();
    const errs = [];
    page.on('pageerror', (e) => errs.push(e.message));
    page.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
    await page.goto(`http://127.0.0.1:${PORT}/index.html`, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction('window.cc && cc.game._prepared === true && !!window.gamemain', { timeout: 60000, polling: 200 });
    const scene = () => page.evaluate(() => (cc.director.getScene() ? cc.director.getScene().name : null));
    async function tap(x, y, s) { await page.mouse.move(x, y); await page.mouse.down(); await sleep(70); await page.mouse.up(); await sleep(s || 900); }
    for (let i = 0; i < 90; i++) {
        if ((await scene()) === 'HallScene') { break; }
        if (i % 4 === 1) { await tap(640, 400, 400); } else { await sleep(400); }
    }
    await sleep(3500);

    const info = await page.evaluate(() => {
        const vs = cc.view.getVisibleSize();
        const ds = cc.view.getDesignResolutionSize();
        const r = cc.game.canvas.getBoundingClientRect();
        const hall = window.hallScene;
        const bar = hall.tabBar;
        const canvasNode = cc.find('Canvas');
        const vis = bar.children.filter((n) => n.activeInHierarchy);
        return {
            frame: [Math.round(r.width), Math.round(r.height)],
            design: [Math.round(ds.width), Math.round(ds.height)],
            visible: [Math.round(vs.width), Math.round(vs.height)],
            policy: cc.view._resolutionPolicy ? cc.view._resolutionPolicy.name : null,
            scale: [cc.view.getScaleX(), cc.view.getScaleY()],
            canvasNode: [Math.round(canvasNode.width), Math.round(canvasNode.height)],
            bar: { w: Math.round(bar.width), x: Math.round(bar.x), bottom: [Math.round(bar.parent.width), Math.round(bar.parent.y)] },
            slots: vis.map((n) => ({ name: n.name, w: Math.round(n.width), x: Math.round(n.x) })),
            views: (hall.viewGroup || []).map((v, i) => v ? ({ i, w: Math.round(v.width), x: Math.round(v.x), active: v.activeInHierarchy }) : null),
            wideApi: !!(window.MazeDashCustomTab && window.MazeDashCustomTab.relayout),
        };
    });
    console.log('frame', info.frame, 'design', info.design, 'visible', info.visible, 'policy', info.policy);
    console.log('bar', JSON.stringify(info.bar));
    console.log('slots', JSON.stringify(info.slots));
    console.log('views', JSON.stringify(info.views));

    const R = 1280 / 800;
    check('design resolution is as wide as the window aspect', Math.abs(info.design[0] - 1280 * R) <= 4 && info.design[1] === 1280, info.design);
    check('visible size equals the design (no letterbox)', info.visible[0] === info.design[0] && info.visible[1] === info.design[1], info.visible);
    check('scale is uniform (no distortion)', Math.abs(info.scale[0] - info.scale[1]) < 0.0001, info.scale);
    check('Canvas node widened to the design', info.canvasNode[0] === info.design[0], info.canvasNode);
    check('tab bar spans the full width', info.bar.w === info.design[0] && info.bar.bottom[0] === info.design[0], info.bar);
    check('5 visible slots divide the full width', (() => {
        const xs = info.slots.map((s) => s.x).sort((a, b) => a - b);
        const w = info.slots.map((s) => s.w);
        const expect = Math.round(info.design[0] / 5);
        if (info.slots.length !== 5 || !w.every((v) => v === expect)) return false;
        for (let i = 1; i < xs.length; i++) if (Math.abs((xs[i] - xs[i - 1]) - expect) > 1) return false;
        return Math.abs(xs[0] + expect * 2) <= 1 && Math.abs(xs[4] - expect * 2) <= 1;
    })(), { want: Math.round(info.design[0] / 5), slots: info.slots });
    check('full-screen pages widened to the viewport', info.views.filter(Boolean).every((v) => v.w === info.design[0]), info.views);
    check('parked pages are fully off-screen on a wide view', info.views.filter((v) => v && !v.active).every((v) => v.x <= -info.design[0]), info.views.filter((v) => v && !v.active).map((v) => v.x));
    await page.screenshot({ path: path.join(SHOTS, 'wide-01-hall.png') });

    // tab switching still works at the wide size
    const pos = (i) => page.evaluate((k) => {
        const n = window.hallScene.tabBar.children[k];
        const wp = n.convertToWorldSpaceAR(cc.v2(0, 0));
        const r = cc.game.canvas.getBoundingClientRect();
        const vs = cc.view.getVisibleSize();
        return { x: r.left + wp.x * (r.width / vs.width), y: r.top + (vs.height - wp.y) * (r.height / vs.height) };
    }, i);
    await tap(640, 300, 700);          // the engine eats the session's first pointer interaction
    let ok = false;
    for (let a = 0; a < 4 && !ok; a++) {
        const p = await pos(5);
        await tap(p.x, p.y, 1300);
        ok = (await page.evaluate(() => window.hallScene.currentIndex)) === 5;
    }
    check('the wrench tab still opens at the wide size', ok, await page.evaluate(() => window.hallScene.currentIndex));
    await page.screenshot({ path: path.join(SHOTS, 'wide-02-custom.png') });

    // still fine after narrowing the window back to a phone shape
    await page.setViewport({ width: 430, height: 900 });
    await sleep(2600);
    const narrow = await page.evaluate(() => ({
        design: [Math.round(cc.view.getDesignResolutionSize().width), Math.round(cc.view.getDesignResolutionSize().height)],
        bar: Math.round(window.hallScene.tabBar.width),
        slots: window.hallScene.tabBar.children.filter((n) => n.activeInHierarchy).length,
    }));
    console.log('after narrowing:', JSON.stringify(narrow));
    check('narrowing back returns to the 720 design', narrow.design[0] === 720 && narrow.design[1] === 1280, narrow.design);
    check('bar follows the narrow design', narrow.bar === 720 && narrow.slots === 5, narrow);
    await page.screenshot({ path: path.join(SHOTS, 'wide-03-narrow.png') });
    check('no page errors', errs.length === 0, errs.slice(0, 5));

    const failed = checks.filter((c) => !c.ok);
    console.log(`\n============ ${checks.length - failed.length}/${checks.length} wide-mode checks passed ============`);
    fs.writeFileSync(path.join(__dirname, 'wide-result.json'), JSON.stringify({ info, narrow, checks, errs }, null, 2));
    await browser.close();
    server.kill();
    process.exit(failed.length ? 2 : 0);
})().catch((e) => { console.error('HARNESS ERROR', e); process.exit(1); });
