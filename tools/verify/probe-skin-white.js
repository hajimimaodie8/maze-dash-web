const path = require('path');
const { spawn } = require('child_process');
const puppeteer = require('puppeteer-core');
const WEB = 'E:\\maze_dash\\web';
const CHROME = 'C:\\Users\\Lenovo\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 8211;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
    const server = spawn(process.execPath, [path.join(WEB, 'serve.js'), String(PORT)], { stdio: 'ignore' });
    await sleep(900);
    const browser = await puppeteer.launch({
        executablePath: CHROME, headless: 'new',
        userDataDir: path.join(__dirname, 'chrome-profile-icon2'),
        args: ['--no-sandbox', '--disable-extensions', '--no-first-run', '--mute-audio',
            '--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader',
            '--autoplay-policy=no-user-gesture-required'],
        defaultViewport: { width: 1280, height: 800 },
    });
    const page = await browser.newPage();
    const errs = [];
    page.on('pageerror', (e) => errs.push(String(e.message).slice(0, 60)));
    await page.goto(`http://127.0.0.1:${PORT}/index.html`, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction('window.cc && cc.game._prepared === true && !!window.gamemain', { timeout: 60000, polling: 200 });
    const scene = () => page.evaluate(() => (cc.director.getScene() ? cc.director.getScene().name : null));
    async function tap(x, y, s) { await page.mouse.move(x, y); await page.mouse.down(); await sleep(70); await page.mouse.up(); await sleep(s || 900); }
    for (let i = 0; i < 60; i++) {
        if ((await scene()) === 'HallScene') { break; }
        if (i % 3 === 1) { await tap(640, 400, 500); } else { await sleep(400); }
    }
    await sleep(4500);
    const icons = await page.evaluate(() => {
        const find = (p) => { const n = cc.find(p); return n ? n.activeInHierarchy : 'missing'; };
        const list = [];
        (function walk(n, p) { if (/vignette|HintsView/i.test(n.name)) { list.push(p + '/' + n.name + ' active=' + n.activeInHierarchy); } (n.children || []).forEach((c) => walk(c, p + '/' + n.name)); })(cc.director.getScene(), '');
        return { hintsView: find('Canvas/gameView/HintsView'), named: list };
    });
    console.log('HintsView active:', icons.hintsView);
    console.log('vignette/hints nodes:', JSON.stringify(icons.named.slice(0, 6)));
    await page.evaluate(() => { gamemain.showTabBarViewIndex = 1; window.hallScene.showBarView(); });
    await sleep(3500);
    const skin = await page.evaluate(() => {
        const covering = [];
        (function walk(n, p) {
            const sp = n.getComponent && n.getComponent(cc.Sprite);
            if (!n.activeInHierarchy || !sp || !sp.spriteFrame) { (n.children || []).forEach((c) => walk(c, p + '/' + n.name)); return; }
            let bb = null; try { const b = n.getBoundingBoxToWorld(); bb = { x: b.x, y: b.y, w: b.width, h: b.height }; } catch (e) {}
            if (bb && bb.w > 0 && bb.h > 0 && 250 >= bb.x && 250 <= bb.x + bb.w && 400 >= bb.y && 400 <= bb.y + bb.h) {
                covering.push({ path: p + '/' + n.name, rgba: [n.color.r, n.color.g, n.color.b, n.color.a], op: n.opacity, z: n.zIndex, size: [Math.round(n.width), Math.round(n.height)] });
            }
            (n.children || []).forEach((c) => walk(c, p + '/' + n.name));
        })(cc.director.getScene(), '');
        return covering.sort((a, b) => a.z - b.z);
    });
    console.log('SKIN page: nodes covering a left-side point (' + skin.length + '):');
    skin.forEach((s) => console.log('  z=' + s.z + ' op=' + s.op + ' rgba=' + JSON.stringify(s.rgba) + ' size=' + JSON.stringify(s.size) + ' ' + s.path));
    await page.screenshot({ path: path.join(__dirname, 'shots', 'skin-final.png') });
    console.log('errors:', JSON.stringify(errs.slice(0, 3)));
    await browser.close();
    server.kill();
    process.exit(0);
})().catch((e) => { console.error('HARNESS ERROR', e); process.exit(1); });
