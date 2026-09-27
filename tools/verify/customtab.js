/*
 * Verify the added 6th tab ("閼奉亜鐣炬稊澶婂彠閸?):
 *   - the bar now divides evenly into 6 x 120 = 720
 *   - the wrench icon is applied
 *   - tapping it switches to the placeholder page, and tapping Home switches back
 */
'use strict';
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const puppeteer = require('puppeteer-core');

const WEB = 'E:\\maze_dash\\web';
const SHOTS = path.join(__dirname, 'shots');
const CHROME = 'C:\\Users\\Lenovo\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 8172;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const checks = [];
function check(name, ok, detail) {
    checks.push({ name, ok: !!ok, detail });
    console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail !== undefined ? '   ' + JSON.stringify(detail) : ''}`);
}

(async () => {
    const server = spawn(process.execPath, [path.join(WEB, 'serve.js'), String(PORT)], { stdio: 'ignore' });
    await sleep(900);
    const browser = await puppeteer.launch({
        executablePath: CHROME, headless: 'new',
        userDataDir: path.join(__dirname, 'chrome-profile-tabtest'),
        args: ['--no-sandbox', '--disable-extensions', '--no-first-run', '--mute-audio',
            '--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader',
            '--autoplay-policy=no-user-gesture-required', '--window-size=540,960'],
        defaultViewport: { width: 540, height: 960 },
    });
    const page = await browser.newPage();
    const errs = [];
    page.on('pageerror', (e) => errs.push(e.message));
    page.on('console', (m) => { if (m.type() === 'error') { errs.push('console: ' + m.text()); } });

    await page.goto(`http://127.0.0.1:${PORT}/index.html`, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction('window.cc && cc.game._prepared === true && !!window.gamemain', { timeout: 60000, polling: 200 });

    const scene = () => page.evaluate(() => (cc.director.getScene() ? cc.director.getScene().name : null));
    async function tap(x, y, settle) {
        await page.mouse.move(x, y); await page.mouse.down(); await sleep(70); await page.mouse.up();
        await sleep(settle || 900);
    }
    for (let i = 0; i < 90; i++) {
        if ((await scene()) === 'HallScene') { break; }
        if (i % 4 === 1) { await tap(270, 640, 400); } else { await sleep(400); }
    }
    await sleep(2500);

    // Dismiss any modal. The first run shows a "+1H" gift popup whose confirm
    // button is not named btnOK, so look for any active Button inside a
    // modal-ish container and tap it until nothing modal is left.
    async function dismissModals(rounds) {
        for (let r = 0; r < (rounds || 8); r++) {
            const pos = await page.evaluate(() => {
                const scene = cc.director.getScene();
                const candidates = [];
                (function walk(n, path) {
                    if (n !== scene) {
                        const modalish = /modal|tip|wnd|window|popup|pop/i.test(path);
                        if (n.activeInHierarchy && modalish) {
                            for (const comp of (n._components || [])) {
                                let cn = '?';
                                try { cn = cc.js.getClassName(comp); } catch (e) {}
                                if (cn === 'cc.Button' || cn === 'UIButton') {
                                    candidates.push({ node: n, path });
                                    break;
                                }
                            }
                        }
                    }
                    (n.children || []).forEach((c) => walk(c, path + '/' + c.name));
                })(scene, '');
                if (!candidates.length) { return null; }
                candidates.sort((a, b) => {
                    const score = (c) => (/ok|confirm|get|receive|continue|close|yes/i.test(c.node.name) ? 100 : 0) + c.path.split('/').length;
                    return score(b) - score(a);
                });
                const n = candidates[0].node;
                const wp = n.convertToWorldSpaceAR(cc.v2(0, 0));
                const r = cc.game.canvas.getBoundingClientRect();
                const vs = cc.view.getVisibleSize();
                return {
                    x: r.left + wp.x * (r.width / vs.width),
                    y: r.top + (vs.height - wp.y) * (r.height / vs.height),
                    name: n.name, path: candidates[0].path,
                };
            });
            if (!pos) { return true; }
            console.log('    dismissing modal via', pos.name, '@', pos.path);
            await tap(pos.x, pos.y, 800);
        }
        return false;
    }
    await dismissModals();

    const bar = await page.evaluate(() => {
        const hall = window.hallScene;
        const kids = hall.tabBar.children;
        return {
            count: kids.length,
            items: kids.map((n, i) => {
                const icon = (n.children || []).find((c) => c.name === 'icon');
                const bg = (n.children || []).find((c) => c.name === 'bg');
                const sp = icon && icon.getComponent(cc.Sprite);
                const comp = n.getComponent('TabBarItem');
                const wp = n.convertToWorldSpaceAR(cc.v2(0, 0));
                return {
                    i, name: n.name, tabBarIndex: comp ? comp.tabBarIndex : null,
                    w: Math.round(n.width), x: Math.round(n.x), wx: Math.round(wp.x), wy: Math.round(wp.y),
                    bgW: bg ? Math.round(bg.width) : null,
                    bgActive: bg ? bg.active : null,
                    iconFrame: sp && sp.spriteFrame ? sp.spriteFrame.name : null,
                    bgIsOwn: comp && comp.bgNode ? comp.bgNode === bg : null,
                };
            }),
            barW: Math.round(hall.tabBar.width),
            viewNames: (hall.viewGroup || []).map((v) => (v ? v.name : null)),
            leftMap: (hall.leftViewMap || []).map((v) => !!v),
            rightMap: (hall.rightViewMap || []).map((v) => !!v),
            customTabReady: !!(window.MazeDashCustomTab && window.MazeDashCustomTab.view()),
        };
    });

    console.log('tab bar:', bar.count, 'slots, bar width', bar.barW);
    bar.items.forEach((it) => console.log(`  [${it.i}] ${it.name} tabBarIndex=${it.tabBarIndex} w=${it.w} x=${it.x} bgW=${it.bgW} bgActive=${it.bgActive} icon=${it.iconFrame} bgOwn=${it.bgIsOwn}`));
    console.log('viewGroup:', JSON.stringify(bar.viewNames));
    console.log('leftMap  :', JSON.stringify(bar.leftMap), ' rightMap:', JSON.stringify(bar.rightMap));

    check('tab bar now has 6 slots', bar.count === 6, bar.count);
    check('6 slots of 120px fill the 720 bar exactly', bar.items.every((it) => it.w === 120 && it.bgW === 120) && bar.count * 120 === bar.barW, { widths: bar.items.map((i) => i.w), barW: bar.barW });
    check('slots are evenly spaced (centres 120 apart)', (() => {
        const xs = bar.items.map((i) => i.x).sort((a, b) => a - b);
        for (let i = 1; i < xs.length; i++) { if (xs[i] - xs[i - 1] !== 120) { return false; } }
        return xs[0] === -300 && xs[xs.length - 1] === 300;
    })(), bar.items.map((i) => i.x));
    const custom = bar.items.find((i) => i.tabBarIndex === 5);
    check('the new tab is registered at index 5', !!custom, custom && custom.name);
    check('the new tab uses the generated wrench icon', !!custom && custom.iconFrame === 'custom_tab_wrench', custom && custom.iconFrame);
    check('the new tab owns its own highlight node', !!custom && custom.bgIsOwn === true, custom && custom.bgIsOwn);
    check('viewGroup gained the placeholder view at index 5', bar.viewNames[5] === 'customLevelsView', bar.viewNames);
    check('placeholder view is registered as parked on the left', bar.leftMap[5] === true, bar.leftMap);
    check('MazeDashCustomTab API is available', bar.customTabReady === true);

    async function tapTab(index) {
        await dismissModals(3);          // never let a popup eat the tab tap
        // The engine swallows the first pointer interaction of a session (an
        // untouched original tab behaves the same way), so allow one retry.
        for (let attempt = 0; attempt < 2; attempt++) {
            const p = await tapTabOnce(index);
            const cur = await page.evaluate(() => window.hallScene.currentIndex);
            if (cur === index) { return p; }
            console.log(`    (tap on slot ${index} was swallowed — retrying)`);
        }
        return null;
    }
    async function tapTabOnce(index) {
        const pos = await page.evaluate((i) => {
            const n = window.hallScene.tabBar.children[i];
            const wp = n.convertToWorldSpaceAR(cc.v2(0, 0));
            const r = cc.game.canvas.getBoundingClientRect();
            const vs = cc.view.getVisibleSize();
            return { x: r.left + wp.x * (r.width / vs.width), y: r.top + (vs.height - wp.y) * (r.height / vs.height) };
        }, index);
        await tap(pos.x, pos.y, 1200);
        return pos;
    }
    async function viewState() {
        return page.evaluate(() => {
            const hall = window.hallScene;
            return {
                currentIndex: hall.currentIndex,
                views: (hall.viewGroup || []).map((v, i) => v ? ({
                    i, name: v.name, active: v.activeInHierarchy, x: Math.round(v.x), z: v.zIndex,
                }) : null),
                highlights: hall.tabBar.children.map((n) => {
                    const bg = (n.children || []).find((c) => c.name === 'bg');
                    return !!(bg && bg.active);
                }),
            };
        });
    }

    await tapTab(5);
    const afterCustom = await viewState();
    console.log('\nafter tapping the wrench tab:', JSON.stringify(afterCustom));
    await page.screenshot({ path: path.join(SHOTS, 'tab-06-custom-levels.png') });

    check('tapping the wrench tab selects index 5', afterCustom.currentIndex === 5, afterCustom.currentIndex);
    check('the placeholder page is shown and centred', (() => {
        const v = afterCustom.views[5];
        return v && v.active === true && Math.abs(v.x) <= 1;
    })(), afterCustom.views[5]);
    check('the placeholder tab is highlighted, no other', afterCustom.highlights[5] === true && afterCustom.highlights.filter(Boolean).length === 1, afterCustom.highlights);

    await tapTab(2);
    const afterHome = await viewState();
    console.log('\nafter tapping Home:', JSON.stringify(afterHome));
    await page.screenshot({ path: path.join(SHOTS, 'tab-07-back-home.png') });
    check('tapping Home returns to index 2', afterHome.currentIndex === 2, afterHome.currentIndex);
    check('Home view is shown at x=0', (() => { const v = afterHome.views[2]; return v && v.active === true && Math.abs(v.x) <= 1; })(), afterHome.views[2]);
    check('placeholder page no longer on top (hidden or behind Home)', (() => {
        const c = afterHome.views[5], h = afterHome.views[2];
        if (!c) { return false; }
        return c.active === false || (h && c.z < h.z);
    })(), { custom: afterHome.views[5], home: afterHome.views[2] });

    // and back again, to make sure repeated switching is stable
    await tapTab(5);
    await tapTab(0);
    const afterShop = await viewState();
    check('repeated switching stays stable (5 -> 2 -> 5 -> 0)', afterShop.currentIndex === 0 && afterShop.views[0] && Math.abs(afterShop.views[0].x) <= 1, { currentIndex: afterShop.currentIndex, shop: afterShop.views[0] });

    check('no page errors', errs.length === 0, errs.slice(0, 5));

    const failed = checks.filter((c) => !c.ok);
    console.log(`\n============ ${checks.length - failed.length}/${checks.length} checks passed ============`);
    fs.writeFileSync(path.join(__dirname, 'customtab-result.json'), JSON.stringify({ bar, afterCustom, afterHome, afterShop, checks, errs }, null, 2));

    await browser.close();
    server.kill();
    process.exit(failed.length ? 2 : 0);
})().catch((e) => { console.error('HARNESS ERROR', e); process.exit(1); });



