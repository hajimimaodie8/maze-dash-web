const path = require('path');
const { spawn } = require('child_process');
const puppeteer = require('puppeteer-core');
const WEB = 'E:\\maze_dash\\web';
const CHROME = 'C:\\Users\\Lenovo\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 8214;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
    const server = spawn(process.execPath, [path.join(WEB, 'serve.js'), String(PORT)], { stdio: 'ignore' });
    await sleep(900);
    const browser = await puppeteer.launch({
        executablePath: CHROME, headless: 'new',
        userDataDir: path.join(__dirname, 'chrome-profile-pin'),
        args: ['--no-sandbox', '--disable-extensions', '--no-first-run', '--mute-audio',
            '--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader',
            '--autoplay-policy=no-user-gesture-required'],
        defaultViewport: { width: 1280, height: 800 },
    });
    const page = await browser.newPage();
    const errs = [];
    page.on('pageerror', (e) => errs.push(String(e.message).slice(0, 50)));
    await page.goto(`http://127.0.0.1:${PORT}/index.html`, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction('window.cc && cc.game._prepared === true && !!window.gamemain', { timeout: 60000, polling: 200 });
    const scene = () => page.evaluate(() => (cc.director.getScene() ? cc.director.getScene().name : null));
    async function tap(x, y, s) { await page.mouse.move(x, y); await page.mouse.down(); await sleep(70); await page.mouse.up(); await sleep(s || 900); }
    for (let i = 0; i < 60; i++) {
        if ((await scene()) === 'HallScene') { break; }
        if (i % 3 === 1) { await tap(640, 400, 500); } else { await sleep(400); }
    }
    const probe = () => page.evaluate(() => {
        const hall = window.hallScene;
        const b = hall.tabBar.parent;
        const host = b.parent;
        const maxOther = Math.max.apply(null, host.children.filter((x) => x !== b).map((x) => x.zIndex));
        const isLast = host.children[host.children.length - 1] === b;
        // who, if anyone, could cover the bar's centre?
        const wp = b.convertToWorldSpaceAR(cc.v2(0, 0));
        const covering = [];
        (function walk(n, p) {
            if (n !== host && n.activeInHierarchy && n !== b && !b.isChildOf(n)) {
                let bb = null; try { const x = n.getBoundingBoxToWorld(); bb = { x: x.x, y: x.y, w: x.width, h: x.height }; } catch (e) {}
                if (bb && bb.w > 0 && bb.h > 0 && wp.x >= bb.x && wp.x <= bb.x + bb.w && wp.y >= bb.y && wp.y <= bb.y + bb.h && n.zIndex >= b.zIndex && !n.isChildOf(b)) {
                    covering.push({ path: p + '/' + n.name, z: n.zIndex });
                }
            }
            (n.children || []).forEach((c) => walk(c, p + '/' + n.name));
        })(cc.director.getScene(), '');
        return { barZ: b.zIndex, maxOther, onTop: b.zIndex > maxOther, isLast, covering: covering.slice(0, 4), stats: window.MazeDashCustomTab.stats };
    });
    for (let i = 0; i < 4; i++) {
        await sleep(i === 0 ? 2500 : 5000);
        const st = await probe();
        console.log('t+' + (i === 0 ? 2.5 : 2.5 + i * 5) + 's ->', JSON.stringify({ barZ: st.barZ, maxOther: st.maxOther, onTop: st.onTop, isLast: st.isLast, covering: st.covering }));
    }
    await page.screenshot({ path: path.join(__dirname, 'shots', 'pin-bar.png') });
    console.log('errors:', JSON.stringify(errs.slice(0, 3)));
    await browser.close();
    server.kill();
    process.exit(0);
})().catch((e) => { console.error('HARNESS ERROR', e); process.exit(1); });
