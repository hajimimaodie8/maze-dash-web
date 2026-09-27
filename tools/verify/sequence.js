/* Clean sequence: dismiss popups first, then real taps wrench -> home -> wrench -> settings. */
'use strict';
const path = require('path');
const { spawn } = require('child_process');
const puppeteer = require('puppeteer-core');

const WEB = 'E:\\maze_dash\\web';
const CHROME = 'C:\\Users\\Lenovo\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 8177;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
    const server = spawn(process.execPath, [path.join(WEB, 'serve.js'), String(PORT)], { stdio: 'ignore' });
    await sleep(900);
    const browser = await puppeteer.launch({
        executablePath: CHROME, headless: 'new',
        userDataDir: path.join(__dirname, 'chrome-profile-seq'),
        args: ['--no-sandbox', '--disable-extensions', '--no-first-run', '--mute-audio',
            '--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader',
            '--autoplay-policy=no-user-gesture-required', '--window-size=540,960'],
        defaultViewport: { width: 540, height: 960 },
    });
    const page = await browser.newPage();
    const logs = [];
    page.on('console', (m) => { if (/custom-tab/.test(m.text())) { logs.push(m.text()); } });
    page.on('pageerror', (e) => console.log('PAGEERROR', e.message));
    await page.goto(`http://127.0.0.1:${PORT}/index.html`, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction('window.cc && cc.game._prepared === true && !!window.gamemain', { timeout: 60000, polling: 200 });
    const scene = () => page.evaluate(() => (cc.director.getScene() ? cc.director.getScene().name : null));
    for (let i = 0; i < 90; i++) {
        if ((await scene()) === 'HallScene') { break; }
        if (i % 4 === 1) {
            await page.mouse.move(270, 640); await page.mouse.down(); await sleep(60); await page.mouse.up(); await sleep(400);
        } else { await sleep(400); }
    }
    await sleep(2500);

    // dismiss any modal buttons, repeatedly
    for (let r = 0; r < 10; r++) {
        const pos = await page.evaluate(() => {
            const sc = cc.director.getScene();
            const cands = [];
            (function walk(n, p) {
                if (n !== sc && n.activeInHierarchy && /modal|tip|wnd|pop/i.test(p)) {
                    for (const c of (n._components || [])) {
                        let cn = '?'; try { cn = cc.js.getClassName(c); } catch (e) {}
                        if (cn === 'cc.Button' || cn === 'UIButton') { cands.push({ n, p }); break; }
                    }
                }
                (n.children || []).forEach((c) => walk(c, p + '/' + c.name));
            })(sc, '');
            if (!cands.length) { return null; }
            cands.sort((a, b) => b.p.split('/').length - a.p.split('/').length);
            const n = cands[0].n;
            const wp = n.convertToWorldSpaceAR(cc.v2(0, 0));
            const r2 = cc.game.canvas.getBoundingClientRect();
            const vs = cc.view.getVisibleSize();
            return { x: r2.left + wp.x * (r2.width / vs.width), y: r2.top + (vs.height - wp.y) * (r2.height / vs.height), p: cands[0].p };
        });
        if (!pos) { break; }
        console.log('  dismiss', pos.p);
        await page.mouse.move(pos.x, pos.y); await page.mouse.down(); await sleep(60); await page.mouse.up();
        await sleep(700);
    }

    const info = await page.evaluate(() => {
        const arrows = [];
        (function walk(n, p) {
            if (/^(LeftButton|RightButton)$/.test(n.name)) {
                arrows.push({ p, size: [Math.round(n.width), Math.round(n.height)], y: Math.round(n.y) });
            }
            (n.children || []).forEach((c) => walk(c, p + '/' + c.name));
        })(cc.director.getScene(), '');
        return { arrowCount: arrows.length, sample: arrows.slice(0, 4), modalLeft: (function () {
            let found = 0;
            (function w(n, p) { if (n.activeInHierarchy && /modal|tip|wnd/i.test(p) && n.active) { found++; } (n.children || []).forEach((c) => w(c, p + '/' + c.name)); })(cc.director.getScene(), '');
            return found;
        })() };
    });
    console.log('arrows:', info.arrowCount, JSON.stringify(info.sample));

    const tabPos = (i) => page.evaluate((idx) => {
        const n = window.hallScene.tabBar.children[idx];
        const wp = n.convertToWorldSpaceAR(cc.v2(0, 0));
        const r = cc.game.canvas.getBoundingClientRect();
        const vs = cc.view.getVisibleSize();
        return { x: r.left + wp.x * (r.width / vs.width), y: r.top + (vs.height - wp.y) * (r.height / vs.height) };
    }, i);
    const idx = () => page.evaluate(() => window.hallScene.currentIndex);
    async function tapTab(i, label) {
        const p = await tabPos(i);
        await page.mouse.move(p.x, p.y); await page.mouse.down(); await sleep(70); await page.mouse.up();
        await sleep(1100);
        console.log(`   tap ${label} (slot ${i}) -> currentIndex ${await idx()}`);
    }

    console.log('\nsequence:');
    await tapTab(5, 'wrench');
    await tapTab(2, 'home');
    await tapTab(5, 'wrench');
    await tapTab(4, 'settings');
    await tapTab(5, 'wrench');
    await tapTab(0, 'shop');
    await tapTab(5, 'wrench');

    console.log('\ncustom-tab console lines:');
    logs.slice(0, 6).forEach((l) => console.log('  ' + l));
    await page.screenshot({ path: path.join(__dirname, 'shots', 'tab-08-sequence.png') });
    await browser.close();
    server.kill();
    process.exit(0);
})().catch((e) => { console.error('HARNESS ERROR', e); process.exit(1); });
