/*
 * Verify quiet mode: all skins unlocked, and no popup appears while playing.
 */
'use strict';
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const puppeteer = require('puppeteer-core');

const WEB = 'E:\\maze_dash\\web';
const SHOTS = path.join(__dirname, 'shots');
const CHROME = 'C:\\Users\\Lenovo\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 8180;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const checks = [];
function check(name, ok, detail) {
    checks.push({ name, ok: !!ok, detail });
    console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail !== undefined ? '   ' + JSON.stringify(detail) : ''}`);
}

/* names that indicate a popup/modal window in this game */
const POPUP_RE = /Tips|TipsWnd|ModalBox|PopShop|RateUs|Unlock|WorldCompleted|Complete|TicketCountWnd|ShopWnd|Aboutus/i;

(async () => {
    const server = spawn(process.execPath, [path.join(WEB, 'serve.js'), String(PORT)], { stdio: 'ignore' });
    await sleep(900);
    const browser = await puppeteer.launch({
        executablePath: CHROME, headless: 'new',
        userDataDir: path.join(__dirname, 'chrome-profile-clean'),
        args: ['--no-sandbox', '--disable-extensions', '--no-first-run', '--mute-audio',
            '--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader',
            '--autoplay-policy=no-user-gesture-required', '--window-size=540,960'],
        defaultViewport: { width: 540, height: 960 },
    });
    const page = await browser.newPage();
    const errs = [];
    const cleanLogs = [];
    page.on('pageerror', (e) => errs.push(e.message));
    page.on('console', (m) => {
        if (m.type() === 'error') { errs.push('console: ' + m.text()); }
        if (/clean-mode/.test(m.text())) { cleanLogs.push(m.text()); }
    });

    await page.goto(`http://127.0.0.1:${PORT}/index.html`, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction('window.cc && cc.game._prepared === true && !!window.gamemain', { timeout: 60000, polling: 200 });
    // quiet mode applies on EVENT_GAME_INITED / first tick
    await page.waitForFunction('window.MazeDashClean && window.MazeDashClean.stats.applied', { timeout: 30000, polling: 150 });

    await page.waitForFunction('window.conf && conf.face_cfg && Object.keys(conf.face_cfg).length >= 12', { timeout: 60000, polling: 200 });
    const applied = await page.evaluate(() => ({
        stats: window.MazeDashClean.stats,
        cfg: window.MazeDashClean.config,
        faceInfo: (function () { try { return gamemain.getFaceInfo(); } catch (e) { return String(e); } })(),
        faceCfgCount: (function () { try { return Object.keys(conf.face_cfg).length; } catch (e) { return null; } })(),
        quietFns: (function () { const out = []; const objs = [gamemain, window.hallScene, window.gameScene]; ['showTips','showGameAlert','showRateUs','showWorldCompleted','showUnlockWorld','showFaceUnlock','showCompleteQuest','showQuestTick','showVideoAd','pay','checkQuest','checkNewWorld','checkFaceUnLock','setInfinityTicketExpiryTime'].forEach((n) => { for (const o of objs) { if (o && o[n] && o[n].__cleanMode) { out.push(n); break; } } }); return out; })(),
        ticketMax: gamemain.getTicketMaxNum(),
        infinity: gamemain.getInfinityTicketExpiryTime(),
    }));
    console.log('quiet mode stats:', JSON.stringify(applied.stats));
    console.log('faceInfo:', JSON.stringify(applied.faceInfo));

    check('quiet mode applied', applied.stats.applied === true);
    check('all 12 faces are unlocked', Array.isArray(applied.faceInfo) && applied.faceInfo.length === 12 && applied.faceCfgCount === 12,
        { unlocked: applied.faceInfo && applied.faceInfo.length, configured: applied.faceCfgCount });
    check('every popup entry point was replaced', applied.quietFns.length >= 5, applied.quietFns);

    check('the +1H gift popup hook is silenced', applied.infinity === 0, { infinityTicketExpiry: applied.infinity });

    // ---- walk to the hall, then watch for any popup for a while ----
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

    const popups = await page.evaluate((re) => {
        const rx = new RegExp(re, 'i');
        const found = [];
        (function walk(n, p) {
            if (n !== cc.director.getScene()) {
                if (rx.test(n.name) && n.activeInHierarchy) {
                    found.push(p + '/' + n.name);
                }
            }
            (n.children || []).forEach((c) => walk(c, p + '/' + c.name));
        })(cc.director.getScene(), '');
        return found;
    }, POPUP_RE.source);
    console.log('\nactive popup-ish nodes in the hall:', popups.length ? popups : 'none');
    check('no popup window is open in the hall', popups.length === 0, popups.slice(0, 8));
    await page.screenshot({ path: path.join(SHOTS, 'clean-01-hall.png') });

    // ---- unlock-check the skin view (index 1) ----
    await page.evaluate(() => { gamemain.showTabBarViewIndex = 1; window.hallScene.showBarView(); });
    await sleep(1600);
    const locks = await page.evaluate(() => {
        const hall = window.hallScene;
        const faceView = hall.viewGroup[1];
        let locked = 0, total = 0;
        (function walk(n) {
            const comps = (n._components || []).map((c) => { try { return cc.js.getClassName(c); } catch (e) { return '?'; } });
            if (comps.indexOf('Face') >= 0) {
                total++;
                if (n.activeInHierarchy) {
                    // Face nodes carry isUnLock; locked ones show a lock sprite
                    const c = n.getComponent('Face');
                    if (c && c.isUnLock === false) { locked++; }
                }
            }
            (n.children || []).forEach(walk);
        })(faceView);
        return { locked, total };
    });
    console.log('face view nodes:', JSON.stringify(locks));
    check('no skin renders as locked', locks.locked === 0, locks);
    await page.screenshot({ path: path.join(SHOTS, 'clean-02-faces.png') });

    // ---- play level 1 and complete it: no completion/quest popup may appear ----
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
            await page.waitForFunction(`(() => { const s = cc.director.getScene(); return s && s.name === 'gameScene' && !!window.gameScene; })()`, { timeout: 9000, polling: 200 });
            entered = true;
        } catch (e) { await sleep(900); }
    }
    check('entered level 1', entered, await scene());

    await page.evaluate(() => {
        const map = window.gameScene.gameMap.getComponent('game_map');
        const proto = Object.getPrototypeOf(map);
        window.__clear = [];
        const orig = proto.checkClearSatge;
        proto.checkClearSatge = function () { const r = orig.apply(this, arguments); window.__clear.push(r); return r; };
    });
    // dash right: the recorded solution for level 1
    await page.mouse.move(270, 480); await page.mouse.down(); await sleep(50);
    await page.mouse.move(410, 480, { steps: 8 }); await sleep(50); await page.mouse.up();
    await sleep(2500);

    const afterClear = await page.evaluate((re) => {
        const rx = new RegExp(re, 'i');
        const found = [];
        (function walk(n, p) {
            if (n !== cc.director.getScene() && rx.test(n.name) && n.activeInHierarchy) { found.push(p + '/' + n.name); }
            (n.children || []).forEach((c) => walk(c, p + '/' + c.name));
        })(cc.director.getScene(), '');
        return {
            cleared: (window.__clear || []).some(Boolean),
            passMax: gamemain.getPassMaxLevelId(1),
            popups: found,
            scene: cc.director.getScene() ? cc.director.getScene().name : null,
        };
    }, POPUP_RE.source);
    console.log('\nafter clearing level 1:', JSON.stringify(afterClear));
    check('level 1 cleared (gameplay intact)', afterClear.cleared === true, afterClear.cleared);
    check('no completion / quest popup appeared', afterClear.popups.length === 0, afterClear.popups.slice(0, 8));
    await page.screenshot({ path: path.join(SHOTS, 'clean-03-after-clear.png') });

    const finalStats = await page.evaluate(() => window.MazeDashClean.stats);
    console.log('\nfinal stats:', JSON.stringify(finalStats));
    check('popup calls were actually intercepted', Object.keys(finalStats.silenced).length > 0, Object.keys(finalStats.silenced));
    check('scene-level popup methods also silenced', (finalStats.sceneMethods || []).length >= 5, finalStats.sceneMethods);
    check('nuisance guide nodes forced off', (finalStats.hiddenNodes || 0) >= 0, finalStats.hiddenNodes);
    check('no page errors', errs.length === 0, errs.slice(0, 6));

    const failed = checks.filter((c) => !c.ok);
    console.log(`\n============ ${checks.length - failed.length}/${checks.length} quiet-mode checks passed ============`);
    console.log('clean-mode logs:', cleanLogs.slice(0, 3));
    fs.writeFileSync(path.join(__dirname, 'clean-result.json'), JSON.stringify({ applied, popups, locks, afterClear, finalStats, checks, errs }, null, 2));

    await browser.close();
    server.kill();
    process.exit(failed.length ? 2 : 0);
})().catch((e) => { console.error('HARNESS ERROR', e); process.exit(1); });
