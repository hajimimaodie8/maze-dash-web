/*
 * Responsive verification: how the game lays out at several window sizes,
 * in both the HallScene and inside a level, and whether resizing while playing
 * keeps it usable.
 */
'use strict';
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const puppeteer = require('puppeteer-core');

const WEB = 'E:\\maze_dash\\web';
const SHOTS = path.join(__dirname, 'shots');
const CHROME = 'C:\\Users\\Lenovo\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 8161;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
fs.mkdirSync(SHOTS, { recursive: true });

const SIZES = [
    { tag: 'phone-390x844', w: 390, h: 844 },
    { tag: 'exact-540x960', w: 540, h: 960 },
    { tag: 'desktop-1280x720', w: 1280, h: 720 },
    { tag: 'wide-1600x900', w: 1600, h: 900 },
    { tag: 'tall-900x1400', w: 900, h: 1400 },
];

(async () => {
    const server = spawn(process.execPath, [path.join(WEB, 'serve.js'), String(PORT)], { stdio: 'ignore' });
    await sleep(900);
    const browser = await puppeteer.launch({
        executablePath: CHROME, headless: 'new',
        userDataDir: path.join(__dirname, 'chrome-profile-responsive'),
        args: ['--no-sandbox', '--disable-extensions', '--no-first-run', '--mute-audio',
            '--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader',
            '--autoplay-policy=no-user-gesture-required'],
        defaultViewport: { width: 540, height: 960 },
    });
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(`http://127.0.0.1:${PORT}/index.html`, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction('window.cc && cc.game._prepared === true && !!window.gamemain', { timeout: 60000, polling: 200 });

    const scene = () => page.evaluate(() => (cc.director.getScene() ? cc.director.getScene().name : null));
    async function tap(x, y, settle) {
        await page.mouse.move(x, y); await page.mouse.down(); await sleep(60); await page.mouse.up();
        await sleep(settle || 700);
    }

    // reach the hall
    for (let i = 0; i < 90; i++) {
        if ((await scene()) === 'HallScene') { break; }
        if (i % 4 === 1) { await tap(270, 640, 400); } else { await sleep(400); }
    }
    await sleep(2000);

    /* dismiss any modal (first-run gift popup, quest popup, ...) */
    async function dismissModals() {
        for (let i = 0; i < 4; i++) {
            const pos = await page.evaluate(() => {
                let found = null;
                (function walk(n) {
                    if (found) { return; }
                    if (n.activeInHierarchy && /^(btnOK|btnConfirm|btnContinue|btnClose|btnNext)$/i.test(n.name)) {
                        const wp = n.convertToWorldSpaceAR(cc.v2(0, 0));
                        const r = cc.game.canvas.getBoundingClientRect();
                        const vs = cc.view.getVisibleSize();
                        found = { x: r.left + wp.x * (r.width / vs.width), y: r.top + (vs.height - wp.y) * (r.height / vs.height), name: n.name };
                    }
                    (n.children || []).forEach(walk);
                })(cc.director.getScene());
                return found;
            });
            if (!pos) { return; }
            await tap(pos.x, pos.y, 800);
        }
    }
    await dismissModals();

    const report = [];
    async function measure(label) {
        const m = await page.evaluate(() => {
            const c = document.getElementById('GameCanvas');
            const r = c.getBoundingClientRect();
            const vs = cc.view.getVisibleSize();
            const canvasNode = (function find(n) {
                for (const comp of (n._components || [])) {
                    if (cc.js.getClassName(comp) === 'cc.Canvas') { return n; }
                }
                for (const k of (n.children || [])) { const f = find(k); if (f) { return f; } }
                return null;
            })(cc.director.getScene());
            const badge = document.getElementById('repobadge');
            const br = badge ? badge.getBoundingClientRect() : null;
            return {
                win: { w: window.innerWidth, h: window.innerHeight },
                canvasCss: { w: Math.round(r.width), h: Math.round(r.height), left: Math.round(r.left), top: Math.round(r.top) },
                visible: { w: Math.round(vs.width), h: Math.round(vs.height) },
                scale: +cc.view.getScaleX().toFixed(3),
                canvasNodeSize: canvasNode ? { w: Math.round(canvasNode.width), h: Math.round(canvasNode.height) } : null,
                bodyBg: getComputedStyle(document.body).backgroundColor,
                badge: br ? { x: Math.round(br.left), y: Math.round(br.top), w: Math.round(br.width), h: Math.round(br.height), visible: br.width > 0 } : null,
                scene: cc.director.getScene() ? cc.director.getScene().name : null,
            };
        });
        report.push({ label, ...m });
        console.log(`\n=== ${label} (${m.scene}) ===`);
        console.log(`  window ${m.win.w}x${m.win.h}   canvas ${m.canvasCss.w}x${m.canvasCss.h}   scale ${m.scale}   visible ${m.visible.w}x${m.visible.h}   canvasNode ${m.canvasNodeSize ? m.canvasNodeSize.w + 'x' + m.canvasNodeSize.h : '?'}`);
        console.log(`  body bg ${m.bodyBg}   badge ${m.badge ? `@(${m.badge.x},${m.badge.y}) ${m.badge.w}x${m.badge.h}` : 'none'}`);
    }

    for (const s of SIZES) {
        await page.setViewport({ width: s.w, height: s.h, deviceScaleFactor: 1 });
        await sleep(1000);
        await dismissModals();
        await measure('hall ' + s.tag);
        await page.screenshot({ path: path.join(SHOTS, `resp-hall-${s.tag}.png`) });
    }

    // enter level 1 at a normal size, then walk the sizes again inside the level
    await page.setViewport({ width: 540, height: 960, deviceScaleFactor: 1 });
    await sleep(900);
    const lv1 = await page.evaluate(() => {
        let f = null;
        function cn(c) { try { return cc.js.getClassName(c); } catch (e) { return '?'; } }
        (function walk(n) {
            for (const c of (n._components || [])) {
                if (cn(c) === 'LevelButton') {
                    const label = (n.getComponentsInChildren(cc.Label) || []).map((l) => l.string).join('');
                    if (label === '1') {
                        const wp = n.convertToWorldSpaceAR(cc.v2(0, 0));
                        const r = cc.game.canvas.getBoundingClientRect();
                        const vs = cc.view.getVisibleSize();
                        f = { x: r.left + wp.x * (r.width / vs.width), y: r.top + (vs.height - wp.y) * (r.height / vs.height) };
                    }
                }
            }
            (n.children || []).forEach(walk);
        })(cc.director.getScene());
        return f;
    });
    let entered = false;
    for (let a = 0; a < 4 && !entered; a++) {
        await tap(lv1.x, lv1.y, 1500);
        try {
            await page.waitForFunction(`(() => { const s = cc.director.getScene(); return s && s.name === 'gameScene' && window.gameScene && window.gameScene.gameMap && !!window.gameScene.gameMap.getComponent('game_map'); })()`, { timeout: 9000, polling: 200 });
            entered = true;
        } catch (e) { await sleep(800); }
    }
    console.log('\nentered level:', entered, await scene());

    for (const s of SIZES) {
        await page.setViewport({ width: s.w, height: s.h, deviceScaleFactor: 1 });
        await sleep(1000);
        await measure('level ' + s.tag);
        await page.screenshot({ path: path.join(SHOTS, `resp-level-${s.tag}.png`) });
    }

    // resize mid-play and confirm the board is still fully visible
    await page.setViewport({ width: 1280, height: 720, deviceScaleFactor: 1 });
    await sleep(800);
    const board = await page.evaluate(() => {
        const map = window.gameScene.gameMap.getComponent('game_map');
        const node = map.node;
        const wp = node.convertToWorldSpaceAR(cc.v2(-node.width / 2, -node.height / 2));
        const r = cc.game.canvas.getBoundingClientRect();
        const vs = cc.view.getVisibleSize();
        return { mapW: node.width, mapH: node.height, visible: { w: vs.width, h: vs.height }, canvas: { w: r.width, h: r.height } };
    });
    console.log('\nboard after mid-play resize:', JSON.stringify(board));
    console.log('page errors:', errors.length ? errors.slice(0, 4) : 'none');

    fs.writeFileSync(path.join(__dirname, 'responsive-result.json'), JSON.stringify({ report, errors }, null, 2));
    await browser.close();
    server.kill();
    process.exit(0);
})().catch((e) => { console.error('HARNESS ERROR', e); process.exit(1); });
