const path = require('path');
const { spawn } = require('child_process');
const puppeteer = require('puppeteer-core');
const WEB = 'E:\\maze_dash\\web';
const CHROME = 'C:\\Users\\Lenovo\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 8227;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
    const server = spawn(process.execPath, [path.join(WEB, 'serve.js'), String(PORT)], { stdio: 'ignore' });
    await sleep(900);
    const browser = await puppeteer.launch({
        executablePath: CHROME, headless: 'new',
        userDataDir: path.join(__dirname, 'chrome-profile-neworld'),
        args: ['--no-sandbox', '--disable-extensions', '--no-first-run', '--mute-audio',
            '--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader',
            '--autoplay-policy=no-user-gesture-required'],
        defaultViewport: { width: 1280, height: 800 },
    });
    const page = await browser.newPage();
    const errs = [];
    page.on('pageerror', (e) => errs.push(String(e.message).slice(0, 80)));
    page.on('console', (m) => { const s = m.text(); if (/custom-tab/.test(s) && /fail|created world|dialog/i.test(s)) { console.log('LOG', s.slice(0, 120)); } });
    await page.goto(`http://127.0.0.1:${PORT}/index.html`, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction('window.cc && cc.game._prepared === true && !!window.gamemain', { timeout: 60000, polling: 200 });
    const scene = () => page.evaluate(() => (cc.director.getScene() ? cc.director.getScene().name : null));
    async function tap(x, y, s) { await page.mouse.move(x, y); await page.mouse.down(); await sleep(70); await page.mouse.up(); await sleep(s || 900); }
    for (let i = 0; i < 60; i++) {
        if ((await scene()) === 'HallScene') { break; }
        if (i % 3 === 1) { await tap(640, 400, 500); } else { await sleep(400); }
    }
    await sleep(4500);
    await page.evaluate(() => { gamemain.showTabBarViewIndex = 5; window.hallScene.showBarView(); });
    await sleep(2500);
    // tap 创建新世界
    const pos = await page.evaluate(() => {
        const b = window.hallScene.viewGroup[5].getChildByName('editorBtn_createWorld');
        if (!b) { return null; }
        const wp = b.convertToWorldSpaceAR(cc.v2(0, 0));
        const r = cc.game.canvas.getBoundingClientRect(); const vs = cc.view.getVisibleSize();
        return { x: r.left + wp.x * (r.width / vs.width), y: r.top + (vs.height - wp.y) * (r.height / vs.height) };
    });
    console.log('New World button at', JSON.stringify(pos));
    if (pos) { await tap(pos.x, pos.y, 1500); }
    const dlg = await page.evaluate(() => {
        const canvas = cc.find('Canvas');
        const d = canvas && canvas.getChildByName('editorDialog');
        if (!d) { return { found: false }; }
        const names = []; (function w(n, dep) { names.push(' '.repeat(dep) + n.name); (n.children || []).forEach((c) => w(c, dep + 1)); })(d, 0);
        const panel = d.getChildByName('panel');
        const hex = panel && panel.getChildByName('hexInput');
        const nameBox = panel && panel.getChildByName('worldNameInput');
        return { found: true, z: d.zIndex, size: [Math.round(d.width), Math.round(d.height)], names: names.slice(0, 22),
                 hasNameEditBox: !!(nameBox && nameBox.getComponent(cc.EditBox)), hasHexEditBox: !!(hex && hex.getComponent(cc.EditBox)),
                 swatches: panel ? panel.children.filter((n) => /^swatch_/.test(n.name)).length : 0 };
    });
    console.log('dialog:', JSON.stringify(dlg, null, 1).slice(0, 900));
    await page.screenshot({ path: path.join(__dirname, 'shots', 'create-world-dialog.png') });
    // fill in a name + hex and create
    const created = await page.evaluate(() => {
        const canvas = cc.find('Canvas');
        const panel = canvas.getChildByName('editorDialog').getChildByName('panel');
        const nb = panel.getChildByName('worldNameInput').getComponent(cc.EditBox);
        const hb = panel.getChildByName('hexInput').getComponent(cc.EditBox);
        nb.string = '我的世界';
        hb.string = '#2AA886';
        const btn = panel.children.filter((n) => n.name === 'dlgBtn')[0];
        window.__confirm = btn;
        return { nb: nb.string, hb: hb.string, buttons: panel.children.filter((n) => n.name === 'dlgBtn').length };
    });
    console.log('filled:', JSON.stringify(created));
    // tap the confirm button (right one)
    const cpos = await page.evaluate(() => {
        const panel = cc.find('Canvas').getChildByName('editorDialog').getChildByName('panel');
        const btns = panel.children.filter((n) => n.name === 'dlgBtn');
        const b = btns[0];   // confirm is created first; cancel is the last
        const wp = b.convertToWorldSpaceAR(cc.v2(0, 0));
        const r = cc.game.canvas.getBoundingClientRect(); const vs = cc.view.getVisibleSize();
        return { x: r.left + wp.x * (r.width / vs.width), y: r.top + (vs.height - wp.y) * (r.height / vs.height) };
    });
    await tap(cpos.x, cpos.y, 2000);
    const after = await page.evaluate(() => {
        const canvas = cc.find('Canvas');
        const scv = cc.find('Canvas/gameView/scrollView').getComponent(cc.ScrollView);
        const pages = scv.content.children.filter((p) => p.getComponent('StageSelectLayer'));
        const custom = pages.filter((p) => p.getComponent('StageSelectLayer').m_stageId >= 100);
        const c = custom[0] ? custom[0].getComponent('StageSelectLayer') : null;
        return {
            dialogClosed: !canvas.getChildByName('editorDialog'),
            pages: pages.length,
            customWorldId: c ? c.m_stageId : null,
            hasActions: c && c.SelectLayer ? !!c.SelectLayer.getChildByName('customWorldActions') : null,
            actionLabels: (function () {
                if (!c || !c.SelectLayer) { return []; }
                const box = c.SelectLayer.getChildByName('customWorldActions');
                if (!box) { return []; }
                return box.children.map((b) => { const l = b.children[0]; return l ? l.getComponent(cc.Label).string : '?'; });
            })(),
            stored: (function () { try { return localStorage.getItem('maze_dash_custom_worlds'); } catch (e) { return '?'; } })(),
            title: c && c.Title ? c.Title.string : null,
            themeBase: (function () { try { return conf.theme_cfg[100].list_background; } catch (e) { return null; } })(),
        };
    });
    console.log('after create:', JSON.stringify(after, null, 1));
    await page.screenshot({ path: path.join(__dirname, 'shots', 'new-world-page.png') });
    console.log('errors:', JSON.stringify(errs.slice(0, 4)));
    await browser.close();
    server.kill();
    process.exit(0);
})().catch((e) => { console.error('HARNESS ERROR', e); process.exit(1); });
