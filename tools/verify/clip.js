/* Where is the clipping? Dump the view pages and their scrollview/mask chains. */
'use strict';
const path = require('path');
const { spawn } = require('child_process');
const puppeteer = require('puppeteer-core');
const WEB = 'E:\\maze_dash\\web';
const CHROME = 'C:\\Users\\Lenovo\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 8191;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
    const server = spawn(process.execPath, [path.join(WEB, 'serve.js'), String(PORT)], { stdio: 'ignore' });
    await sleep(900);
    const browser = await puppeteer.launch({
        executablePath: CHROME, headless: 'new',
        userDataDir: path.join(__dirname, 'chrome-profile-clip'),
        args: ['--no-sandbox', '--disable-extensions', '--no-first-run', '--mute-audio',
            '--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader',
            '--autoplay-policy=no-user-gesture-required', '--window-size=1280,800'],
        defaultViewport: { width: 1280, height: 800 },
    });
    const page = await browser.newPage();
    await page.goto(`http://127.0.0.1:${PORT}/index.html`, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction('window.cc && cc.game._prepared === true && !!window.gamemain', { timeout: 60000, polling: 200 });
    const scene = () => page.evaluate(() => (cc.director.getScene() ? cc.director.getScene().name : null));
    async function tap(x, y, s) { await page.mouse.move(x, y); await page.mouse.down(); await sleep(70); await page.mouse.up(); await sleep(s || 900); }
    for (let i = 0; i < 60; i++) {
        if ((await scene()) === 'HallScene') { break; }
        if (i % 3 === 1) { await tap(640, 400, 500); } else { await sleep(400); }
    }
    await sleep(4500);

    const out = await page.evaluate(() => {
        function cn(c) { try { return cc.js.getClassName(c); } catch (e) { return '?'; } }
        const W = Math.round(cc.view.getVisibleSize().width);
        function brief(n) {
            if (!n || !n.isValid) { return null; }
            const comps = (n._components || []).map(cn);
            return {
                name: n.name, size: [Math.round(n.width), Math.round(n.height)],
                x: Math.round(n.x), active: n.activeInHierarchy,
                mask: comps.indexOf('cc.Mask') >= 0, sprite: comps.indexOf('cc.Sprite') >= 0,
            };
        }
        const hall = window.hallScene;
        const pages = (hall.viewGroup || []).map((v, i) => (v ? brief(v) : null));
        // the whole chain under each page that is narrower than the viewport
        const narrow = [];
        (hall.node).children.forEach(function walkFrom(root) {});
        function scan(root, label) {
            (function walk(n, p) {
                const comps = (n._components || []).map(cn);
                if (n.activeInHierarchy && (comps.indexOf('cc.Mask') >= 0 || comps.indexOf('cc.ScrollView') >= 0) && Math.round(n.width) < W) {
                    narrow.push({ where: label, path: p + '/' + n.name, size: [Math.round(n.width), Math.round(n.height)], comps: comps });
                }
                (n.children || []).forEach((c) => walk(c, p + '/' + n.name));
            })(root, '');
        }
        (hall.viewGroup || []).forEach((v, i) => { if (v) { scan(v, 'view' + i + ':' + v.name); } });
        // pager chain detail
        const sv = cc.find('Canvas/gameView/scrollView');
        const chain = [];
        if (sv) {
            let cur = sv;
            for (let d = 0; d < 4 && cur; d++) { chain.push(brief(cur)); cur = cur.children && cur.children.length ? cur.children[0] : null; }
        }
        return { W, pages, narrow: narrow.slice(0, 24), pagerChain: chain };
    });
    console.log('visible width:', out.W);
    console.log('\nview pages:');
    out.pages.forEach((p, i) => console.log(`  [${i}]`, JSON.stringify(p)));
    console.log('\nnarrower-than-viewport Mask/ScrollView nodes:');
    out.narrow.forEach((n) => console.log('  ', JSON.stringify(n)));
    console.log('\npager chain:', JSON.stringify(out.pagerChain, null, 1));
    await page.screenshot({ path: path.join(__dirname, 'shots', 'clip-01-hall.png') });
    // and the faces page rendered
    await page.evaluate(() => { gamemain.showTabBarViewIndex = 1; window.hallScene.showBarView(); });
    await sleep(1600);
    await page.screenshot({ path: path.join(__dirname, 'shots', 'clip-02-faces.png') });
    await browser.close();
    server.kill();
    process.exit(0);
})().catch((e) => { console.error('HARNESS ERROR', e); process.exit(1); });
