const path = require('path');
const { spawn } = require('child_process');
const puppeteer = require('puppeteer-core');
const WEB = 'E:\\maze_dash\\web';
const CHROME = 'C:\\Users\\Lenovo\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 8238;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
    const server = spawn(process.execPath, [path.join(WEB, 'serve.js'), String(PORT)], { stdio: 'ignore' });
    await sleep(900);
    const browser = await puppeteer.launch({
        executablePath: CHROME, headless: 'new',
        userDataDir: path.join(__dirname, 'chrome-profile-dom'),
        args: ['--no-sandbox', '--disable-extensions', '--no-first-run', '--mute-audio',
            '--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader',
            '--autoplay-policy=no-user-gesture-required'],
        defaultViewport: { width: 1440, height: 810 },
    });
    const page = await browser.newPage();
    const errs = [];
    page.on('pageerror', (e) => errs.push(String(e.message).slice(0, 90)));
    await page.goto(`http://127.0.0.1:${PORT}/index.html`, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction('window.cc && cc.game._prepared === true && !!window.gamemain', { timeout: 60000, polling: 200 });
    const scene = () => page.evaluate(() => (cc.director.getScene() ? cc.director.getScene().name : null));
    async function tap(x, y, s) { await page.mouse.move(x, y); await page.mouse.down(); await sleep(80); await page.mouse.up(); await sleep(s || 900); }
    for (let i = 0; i < 60; i++) {
        if ((await scene()) === 'HallScene') { break; }
        if (i % 3 === 1) { await tap(720, 400, 500); } else { await sleep(400); }
    }
    await sleep(4500);
    await page.evaluate(() => { gamemain.showTabBarViewIndex = 5; window.hallScene.showBarView(); });
    await sleep(1000);
    await page.evaluate(() => { window.hallScene.viewGroup[5].getChildByName('editorBtn_createWorld').emit(cc.Node.EventType.TOUCH_END); });
    await sleep(1800);
    const st = await page.evaluate(() => {
        const panel = cc.find('Canvas').getChildByName('editorDialog').getChildByName('panel');
        const nb = panel.getChildByName('worldNameInput');
        const hb = panel.getChildByName('hexInput');
        const sw = panel.children.filter((n) => /^swatch_/.test(n.name));
        function elInfo(box) {
            const el = box && box.__input;
            if (!el) { return null; }
            const r = el.getBoundingClientRect();
            return { visible: getComputedStyle(el).display, fontSize: getComputedStyle(el).fontSize, colour: getComputedStyle(el).color,
                     rect: [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)], value: el.value };
        }
        return { inputs: { name: elInfo(nb), hex: elInfo(hb) },
                 swatchCount: sw.length,
                 swatchSample: sw.slice(0, 3).map((s) => ({ name: s.name, size: [Math.round(s.width), Math.round(s.height)], pos: [Math.round(s.x), Math.round(s.y)], colour: [s.color.r, s.color.g, s.color.b], active: s.activeInHierarchy })),
                 swatchRows: Array.from(new Set(sw.map((s) => Math.round(s.y)))).length };
    });
    console.log('DIALOG:', JSON.stringify(st, null, 1).slice(0, 1300));
    // type through the real DOM inputs, then create
    await page.evaluate(() => {
        const panel = cc.find('Canvas').getChildByName('editorDialog').getChildByName('panel');
        panel.getChildByName('worldNameInput').__input.value = '输入测试世界';
        panel.getChildByName('hexInput').__input.value = '#7B1FA2';
    });
    await page.screenshot({ path: path.join(__dirname, 'shots', 'dom-inputs.png') });
    await page.evaluate(() => {
        const panel = cc.find('Canvas').getChildByName('editorDialog').getChildByName('panel');
        panel.children.filter((n) => n.name === 'dlgBtn')[0].emit(cc.Node.EventType.TOUCH_END);
    });
    await sleep(2000);
    const after = await page.evaluate(() => {
        const worlds = JSON.parse(localStorage.getItem('maze_dash_custom_worlds') || '{}');
        const keys = Object.keys(worlds);
        const canvas = cc.find('Canvas');
        return { created: keys.length, name: keys.length ? worlds[keys[0]].name : null, base: keys.length ? worlds[keys[0]].base : null,
                 inputsLeftBehind: document.querySelectorAll('input').length,
                 dialogGone: !canvas.getChildByName('editorDialog') };
    });
    console.log('AFTER CREATE:', JSON.stringify(after));
    console.log('errors:', JSON.stringify(errs.slice(0, 3)));
    await browser.close();
    server.kill();
    process.exit(0);
})().catch((e) => { console.error('HARNESS ERROR', e); process.exit(1); });
