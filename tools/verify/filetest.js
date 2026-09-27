/* Verify the file:// guard shows an actionable message instead of hanging. */
'use strict';
const path = require('path');
const puppeteer = require('puppeteer-core');

const CHROME = 'C:\\Users\\Lenovo\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe';
const SHOTS = path.join(__dirname, 'shots');
const FILE_URL = 'file:///E:/maze_dash/web/index.html';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
    const browser = await puppeteer.launch({
        executablePath: CHROME, headless: 'new',
        userDataDir: path.join(__dirname, 'chrome-profile-file'),
        args: ['--no-sandbox', '--disable-extensions', '--no-first-run', '--mute-audio',
            '--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader',
            '--window-size=540,960'],
        defaultViewport: { width: 540, height: 960 },
    });
    const page = await browser.newPage();
    await page.goto(FILE_URL, { waitUntil: 'domcontentloaded' });
    await sleep(3000);

    const state = await page.evaluate(() => {
        const el = document.getElementById('fatal');
        const splash = document.getElementById('splash');
        return {
            fatalVisible: !!el && getComputedStyle(el).display !== 'none',
            text: el ? el.innerText : null,
            splashHidden: !!splash && splash.style.display === 'none',
            net: window.__mazeDashNet ? { started: window.__mazeDashNet.started, ok: window.__mazeDashNet.ok, failed: window.__mazeDashNet.failed.length } : null,
            scene: (window.cc && cc.director.getScene) ? (cc.director.getScene() ? cc.director.getScene().name : null) : 'no-cc',
        };
    });

    console.log('=== file:// result ===');
    console.log('fatal overlay visible :', state.fatalVisible);
    console.log('splash hidden         :', state.splashHidden);
    console.log('xhr counters          :', JSON.stringify(state.net));
    console.log('scene                 :', state.scene);
    console.log('\n--- overlay text ---\n' + state.text);

    const t = state.text || '';
    const checks = [
        ['overlay is shown', state.fatalVisible === true],
        ['splash is replaced (no stuck bar)', state.splashHidden === true],
        ['mentions start.bat', /start\.bat/.test(t)],
        ['mentions serve.js', /serve\.js/.test(t)],
        ['mentions the localhost URL', /localhost:8099/.test(t)],
        ['explains file:// blocking', /file:\/\//.test(t)],
        ['includes diagnostics', /诊断信息/.test(t)],
    ];
    let bad = 0;
    console.log('');
    for (const [n, ok] of checks) { if (!ok) { bad++; } console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}`); }

    await page.screenshot({ path: path.join(SHOTS, 'f01-file-protocol-guard.png') });
    await browser.close();
    process.exit(bad ? 2 : 0);
})().catch((e) => { console.error('HARNESS ERROR', e); process.exit(1); });
