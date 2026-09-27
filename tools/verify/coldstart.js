/* Cold start at a given window size (not a resize) — the case a desktop user hits. */
'use strict';
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const puppeteer = require('puppeteer-core');

const WEB = 'E:\\maze_dash\\web';
const SHOTS = path.join(__dirname, 'shots');
const CHROME = 'C:\\Users\\Lenovo\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 8162;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const SIZES = [
    { tag: 'cold-1280x720', w: 1280, h: 720 },
    { tag: 'cold-390x844', w: 390, h: 844 },
    { tag: 'cold-1920x1080', w: 1920, h: 1080 },
];

(async () => {
    const server = spawn(process.execPath, [path.join(WEB, 'serve.js'), String(PORT)], { stdio: 'ignore' });
    await sleep(900);
    const results = [];

    for (const s of SIZES) {
        const browser = await puppeteer.launch({
            executablePath: CHROME, headless: 'new',
            userDataDir: path.join(__dirname, 'chrome-profile-cold-' + s.tag),
            args: ['--no-sandbox', '--disable-extensions', '--no-first-run', '--mute-audio',
                '--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader',
                '--autoplay-policy=no-user-gesture-required',
                `--window-size=${s.w},${s.h}`],
            defaultViewport: { width: s.w, height: s.h, deviceScaleFactor: 1 },
        });
        const page = await browser.newPage();
        const errs = [];
        page.on('pageerror', (e) => errs.push(e.message));
        page.on('console', (m) => { if (m.type() === 'error') { errs.push('console: ' + m.text()); } });
        await page.goto(`http://127.0.0.1:${PORT}/index.html`, { waitUntil: 'domcontentloaded' });
        await page.waitForFunction('window.cc && cc.game._prepared === true && !!window.gamemain', { timeout: 60000, polling: 200 });

        // tap through to the hall
        for (let i = 0; i < 90; i++) {
            const sc = await page.evaluate(() => (cc.director.getScene() ? cc.director.getScene().name : null));
            if (sc === 'HallScene') { break; }
            if (i % 4 === 1) {
                await page.mouse.move(s.w / 2, s.h * 0.66); await page.mouse.down(); await sleep(60); await page.mouse.up();
                await sleep(400);
            } else { await sleep(400); }
        }
        await sleep(1800);

        const m = await page.evaluate(() => {
            const vs = cc.view.getVisibleSize();
            const canvasNode = (function find(n) {
                for (const comp of (n._components || [])) {
                    if (cc.js.getClassName(comp) === 'cc.Canvas') { return n; }
                }
                for (const k of (n.children || [])) { const f = find(k); if (f) { return f; } }
                return null;
            })(cc.director.getScene());
            return {
                win: { w: innerWidth, h: innerHeight },
                visible: { w: Math.round(vs.width), h: Math.round(vs.height) },
                canvasNode: canvasNode ? { w: Math.round(canvasNode.width), h: Math.round(canvasNode.height) } : null,
                scale: +cc.view.getScaleX().toFixed(3),
                aspect: +(vs.width / vs.height).toFixed(3),
                bg: getComputedStyle(document.body).backgroundColor,
                scene: cc.director.getScene().name,
            };
        });
        // Wide windows use SHOW_ALL: the visible area stays the 720x1280 design.
        // Narrow/tall windows use FIXED_WIDTH: width is exactly 720 and the canvas
        // grows taller so the game fills the screen (full-bleed).
        const winAspect = m.win.w / m.win.h;
        const designAspect = 720 / 1280;
        const ok = winAspect > designAspect + 0.02
            ? (Math.round(m.visible.w) === 720 && Math.round(m.visible.h) === 1280)
            : (Math.round(m.visible.w) === 720 && m.visible.h >= 1280 &&
               m.canvasNode && Math.abs(m.canvasNode.h - m.visible.h) < 2);
        console.log(`\n=== ${s.tag} (cold start) ===`);
        console.log(`  window ${m.win.w}x${m.win.h}  visible ${m.visible.w}x${m.visible.h} (aspect ${m.aspect})  canvasNode ${m.canvasNode.w}x${m.canvasNode.h}  scale ${m.scale}`);
        console.log(`  mode ${winAspect > designAspect + 0.02 ? 'contain(720x1280)' : 'fill-width(720x' + Math.round(m.visible.h) + ')'}  ->  ${ok ? 'PASS' : 'FAIL'}  |  bg ${m.bg}  |  errors ${errs.length ? JSON.stringify(errs.slice(0, 3)) : 'none'}`);
        await page.screenshot({ path: path.join(SHOTS, `cold-${s.tag}.png`) });
        results.push({ ...s, ...m, ok, errs });
        await browser.close();
    }

    fs.writeFileSync(path.join(__dirname, 'coldstart-result.json'), JSON.stringify(results, null, 2));
    const bad = results.filter((r) => !r.ok);
    console.log(`\n${results.length - bad.length}/${results.length} cold starts laid out correctly`);
    server.kill();
    process.exit(bad.length ? 2 : 0);
})().catch((e) => { console.error('HARNESS ERROR', e); process.exit(1); });
