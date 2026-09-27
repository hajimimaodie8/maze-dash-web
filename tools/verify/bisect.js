/* Bisect the quests-tab crash: narrow (720) design vs clean mode hiding QuestTips. */
'use strict';
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const puppeteer = require('puppeteer-core');
const WEB = 'E:\\maze_dash\\web';
const CHROME = 'C:\\Users\\Lenovo\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 8194;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function openQuests(page, label) {
    const before = await page.evaluate(() => ({ design: Math.round(cc.view.getDesignResolutionSize().width), mode: window.hallScene.currentIndex }));
    let err = null;
    try {
        await page.evaluate(() => { gamemain.showTabBarViewIndex = 3; window.hallScene.showBarView(); });
    } catch (e) { err = String(e.message || e); }
    await sleep(1500);
    const after = await page.evaluate(() => ({
        index: window.hallScene.currentIndex,
        questViewActive: !!(window.hallScene.viewGroup[3] && window.hallScene.viewGroup[3].activeInHierarchy),
        questX: window.hallScene.viewGroup[3] ? Math.round(window.hallScene.viewGroup[3].x) : null,
    }));
    console.log(`  ${label}: design=${before.design} err=${err ? JSON.stringify(err.slice(0, 70)) : 'none'} -> ${JSON.stringify(after)}`);
    return { label, err, after, before };
}

(async () => {
    const server = spawn(process.execPath, [path.join(WEB, 'serve.js'), String(PORT)], { stdio: 'ignore' });
    await sleep(900);
    const browser = await puppeteer.launch({
        executablePath: CHROME, headless: 'new',
        userDataDir: path.join(__dirname, 'chrome-profile-bisect'),
        args: ['--no-sandbox', '--disable-extensions', '--no-first-run', '--mute-audio',
            '--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader',
            '--autoplay-policy=no-user-gesture-required'],
        defaultViewport: { width: 540, height: 960 },
    });
    const page = await browser.newPage();
    const errs = [];
    page.on('pageerror', (e) => errs.push(String(e.message).slice(0, 80)));
    await page.goto(`http://127.0.0.1:${PORT}/index.html`, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction('window.cc && cc.game._prepared === true && !!window.gamemain', { timeout: 60000, polling: 200 });
    const scene = () => page.evaluate(() => (cc.director.getScene() ? cc.director.getScene().name : null));
    async function tap(x, y, s) { await page.mouse.move(x, y); await page.mouse.down(); await sleep(70); await page.mouse.up(); await sleep(s || 900); }
    for (let i = 0; i < 60; i++) {
        if ((await scene()) === 'HallScene') { break; }
        if (i % 3 === 1) { await tap(270, 500, 500); } else { await sleep(400); }
    }
    await sleep(3500);

    const results = [];
    console.log('experiments:');
    results.push(await openQuests(page, 'A. narrow window, FIRST open (retry should save it)'));
    const t0 = await page.evaluate(() => ({ retries: window.MazeDashCustomTab && window.MazeDashCustomTab.stats ? window.MazeDashCustomTab.stats.showBarViewRetries : 'n/a' }));
    console.log('  retry count after A:', JSON.stringify(t0));

    // switch to a wide window and try again with the nuisance hiding ON
    await page.setViewport({ width: 1280, height: 800 });
    await sleep(3000);
    results.push(await openQuests(page, 'B. wide window, QuestTips hiding ON'));

    // and with the hiding switched OFF
    await page.evaluate(() => { if (window.MazeDashClean) { window.MazeDashClean.config.hideNuisanceNodes = false; } });
    await page.evaluate(() => { gamemain.showTabBarViewIndex = 2; window.hallScene.showBarView(); });
    await sleep(1500);
    results.push(await openQuests(page, 'C. wide window, QuestTips hiding OFF'));

    console.log('\nerrors seen:', JSON.stringify(Array.from(new Set(errs)).slice(0, 4)));
    fs.writeFileSync(path.join(__dirname, 'bisect-result.json'), JSON.stringify({ results, errs }, null, 2));
    await browser.close();
    server.kill();
    process.exit(0);
})().catch((e) => { console.error('HARNESS ERROR', e); process.exit(1); });
