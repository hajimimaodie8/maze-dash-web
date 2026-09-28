const path = require('path');
const { spawn } = require('child_process');
const puppeteer = require('puppeteer-core');
const WEB = 'E:\\maze_dash\\web';
const CHROME = 'C:\\Users\\Lenovo\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 8236;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
    const server = spawn(process.execPath, [path.join(WEB, 'serve.js'), String(PORT)], { stdio: 'ignore' });
    await sleep(900);
    const browser = await puppeteer.launch({
        executablePath: CHROME, headless: 'new',
        userDataDir: path.join(__dirname, 'chrome-profile-dlg'),
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
    await sleep(1600);
    const st = await page.evaluate(() => {
        const panel = cc.find('Canvas').getChildByName('editorDialog').getChildByName('panel');
        const nb = panel.getChildByName('worldNameInput').getComponent(cc.EditBox);
        const hb = panel.getChildByName('hexInput').getComponent(cc.EditBox);
        function inner(eb) {
            const out = {};
            ['_textLabel', '_placeholderLabel'].forEach((k) => {
                const lb = eb[k];
                out[k] = lb ? { size: lb.fontSize, lineHeight: lb.lineHeight, sys: lb.useSystemFont === true, font: String(lb.fontFamily).slice(0, 18) } : null;
            });
            return out;
        }
        nb.string = '我的世界';
        const sw = panel.children.filter((n) => /^swatch_/.test(n.name));
        return { swatchCount: sw.length,
                 swatchRows: Array.from(new Set(sw.map((s) => Math.round(s.y)))).length,
                 swatchSize: sw.length ? [Math.round(sw[0].width), Math.round(sw[0].height)] : null,
                 nameEditBox: { fontSize: nb.fontSize, ...inner(nb) },
                 hexEditBox: { fontSize: hb.fontSize, ...inner(hb) },
                 typed: nb.string };
    });
    console.log('DIALOG:', JSON.stringify(st, null, 1).slice(0, 1100));
    await page.screenshot({ path: path.join(__dirname, 'shots', 'dialog-presets.png') });
    console.log('errors:', JSON.stringify(errs.slice(0, 3)));
    await browser.close();
    server.kill();
    process.exit(0);
})().catch((e) => { console.error('HARNESS ERROR', e); process.exit(1); });
