/* Verify: shop page/tab removed, ticket-heart HUD and buy buttons gone, tabs re-divided. */
'use strict';
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const puppeteer = require('puppeteer-core');

const WEB = 'E:\\maze_dash\\web';
const SHOTS = path.join(__dirname, 'shots');
const CHROME = 'C:\\Users\\Lenovo\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 8181;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const checks = [];
function check(name, ok, detail) {
    checks.push({ name, ok: !!ok, detail });
    console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail !== undefined ? '   ' + JSON.stringify(detail) : ''}`);
}

const MONEY_RE = /ticket|infinity|heart|addButton|buyRemoveAd|PopShop|HintShopWnd|TicketShopWnd|RateUs|Aboutus/i;

(async () => {
    const server = spawn(process.execPath, [path.join(WEB, 'serve.js'), String(PORT)], { stdio: 'ignore' });
    await sleep(900);
    const browser = await puppeteer.launch({
        executablePath: CHROME, headless: 'new',
        userDataDir: path.join(__dirname, 'chrome-profile-nomoney'),
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
    await sleep(3000);

    const hall = await page.evaluate((re) => {
        const rx = new RegExp(re, 'i');
        const h = window.hallScene;
        const kids = h.tabBar.children;
        const visible = [];
        kids.forEach((n, i) => { if (n.activeInHierarchy) { visible.push({ i, name: n.name, w: Math.round(n.width), x: Math.round(n.x) }); } });
        const stillOn = [];
        (function walk(n, p) {
            if (n !== cc.director.getScene() && n.activeInHierarchy && rx.test(n.name)) { stillOn.push(p + '/' + n.name); }
            (n.children || []).forEach((c) => walk(c, p + '/' + c.name));
        })(cc.director.getScene(), '');
        return {
            shopTabActive: !!kids[0] && kids[0].active,
            shopViewActive: !!(h.viewGroup && h.viewGroup[0] && h.viewGroup[0].active),
            visibleCount: visible.length,
            visible,
            stillOn: stillOn.slice(0, 10),
            props: {
                ticketView: h.ticketView ? h.ticketView.active : null,
                ticketInfinityView: h.ticketInfinityView ? h.ticketInfinityView.active : null,
                ticketNum: h.ticketNum ? h.ticketNum.active : null,
                freeHintBtn: h.freeHintBtn ? h.freeHintBtn.active : null,
                freeTicketBtn: h.freeTicketBtn ? h.freeTicketBtn.active : null,
            },
            hintCountVisible: h.hintNumLabel ? h.hintNumLabel.node.activeInHierarchy : null,
            openShopPatched: !!(h.openShop && h.openShop.__cleanMode),
        };
    }, MONEY_RE.source);

    console.log('visible slots:', JSON.stringify(hall.visible));
    console.log('still active matching money/ticket:', hall.stillOn);
    check('shop tab is removed', hall.shopTabActive === false);
    check('shop page is deactivated', hall.shopViewActive === false);
    check('bar now shows 5 slots', hall.visibleCount === 5, hall.visibleCount);
    check('5 slots of 144 fill the 720 bar', (() => {
        const w = hall.visible.map((v) => v.w), x = hall.visible.map((v) => v.x).sort((a, b) => a - b);
        return w.every((v) => v === 144) && x.join(',') === '-288,-144,0,144,288';
    })(), { widths: hall.visible.map((v) => v.w), xs: hall.visible.map((v) => v.x) });
    check('heart / ticket widgets are off', hall.props.ticketView === false || hall.props.ticketView === null, hall.props);
    check('infinite-ticket badge is off', hall.props.ticketInfinityView === false || hall.props.ticketInfinityView === null, hall.props.ticketInfinityView);
    check('free-hint / free-ticket ad buttons are off', hall.props.freeHintBtn === false || hall.props.freeHintBtn === null, { freeHintBtn: hall.props.freeHintBtn, freeTicketBtn: hall.props.freeTicketBtn });
    check('no money/ticket node left active in the hall', hall.stillOn.length === 0, hall.stillOn);
    check('top-right hint/ticket counter is hidden too (hints come from the in-level button)', hall.hintCountVisible === false, hall.hintCountVisible);
    check('"go to shop" is rewired to the faces page', hall.openShopPatched === true);
    await page.screenshot({ path: path.join(SHOTS, 'nomoney-01-hall.png') });

    // tapping the leftmost visible slot must open faces (index 1), never the deleted shop
    const p1 = await page.evaluate(() => {
        const n = window.hallScene.tabBar.children[1];
        const wp = n.convertToWorldSpaceAR(cc.v2(0, 0));
        const r = cc.game.canvas.getBoundingClientRect();
        const vs = cc.view.getVisibleSize();
        return { x: r.left + wp.x * (r.width / vs.width), y: r.top + (vs.height - wp.y) * (r.height / vs.height) };
    });
    await tap(p1.x, p1.y, 1200);
    let idx = await page.evaluate(() => window.hallScene.currentIndex);
    if (idx !== 1) { await tap(p1.x, p1.y, 1200); idx = await page.evaluate(() => window.hallScene.currentIndex); }
    check('leftmost slot opens the faces page', idx === 1, idx);
    await page.screenshot({ path: path.join(SHOTS, 'nomoney-02-faces.png') });

    const shopCall = await page.evaluate(() => {
        window.hallScene.openShop({ target: { getComponent: function () { return null; } } });
        return window.hallScene.currentIndex;
    });
    check('openShop() no longer reaches the deleted page', shopCall !== 0, shopCall);

    // ---- in-level HUD ----
    await page.evaluate(() => { gamemain.showTabBarViewIndex = 2; window.hallScene.showBarView(); });
    await sleep(1200);
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
            await page.waitForFunction(`(() => { const s = cc.director.getScene(); return s && s.name === 'gameScene'; })()`, { timeout: 9000, polling: 200 });
            entered = true;
        } catch (e) { await sleep(900); }
    }
    await sleep(1800);
    const lvl = await page.evaluate((re) => {
        const rx = new RegExp(re, 'i');
        const found = [];
        (function walk(n, p) {
            if (n !== cc.director.getScene() && n.activeInHierarchy && rx.test(n.name)) { found.push(p + '/' + n.name); }
            (n.children || []).forEach((c) => walk(c, p + '/' + c.name));
        })(cc.director.getScene(), '');
        // is there still an in-level hint button?
        const names = [];
        (function walk2(n) { names.push(n.name); (n.children || []).forEach(walk2); })(cc.director.getScene());
        return { found: found.slice(0, 10), hasHintButton: names.some((n) => /hint/i.test(n)) };
    }, MONEY_RE.source);
    console.log('in-level money/ticket nodes:', lvl.found);
    check('no money/ticket node active inside a level', lvl.found.length === 0, lvl.found);
    check('the in-level hint button still exists', lvl.hasHintButton === true);
    await page.screenshot({ path: path.join(SHOTS, 'nomoney-03-level.png') });

    check('no page errors', errs.length === 0, errs.slice(0, 5));

    const failed = checks.filter((c) => !c.ok);
    console.log(`\n============ ${checks.length - failed.length}/${checks.length} checks passed ============`);
    fs.writeFileSync(path.join(__dirname, 'nomoney-result.json'), JSON.stringify({ hall, lvl, checks, errs }, null, 2));
    await browser.close();
    server.kill();
    process.exit(failed.length ? 2 : 0);
})().catch((e) => { console.error('HARNESS ERROR', e); process.exit(1); });
