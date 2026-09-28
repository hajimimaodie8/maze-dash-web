const path = require('path');
const { spawn } = require('child_process');
const puppeteer = require('puppeteer-core');
const WEB = 'E:\\maze_dash\\web';
const CHROME = 'C:\\Users\\Lenovo\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 8223;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
    const server = spawn(process.execPath, [path.join(WEB, 'serve.js'), String(PORT)], { stdio: 'ignore' });
    await sleep(900);
    const browser = await puppeteer.launch({
        executablePath: CHROME, headless: 'new',
        userDataDir: path.join(__dirname, 'chrome-profile-i18n'),
        args: ['--no-sandbox', '--disable-extensions', '--no-first-run', '--mute-audio',
            '--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader',
            '--autoplay-policy=no-user-gesture-required'],
        defaultViewport: { width: 1280, height: 800 },
    });
    const page = await browser.newPage();
    const errs = [];
    page.on('pageerror', (e) => errs.push(String(e.message).slice(0, 60)));
    await page.goto(`http://127.0.0.1:${PORT}/index.html`, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction('window.cc && cc.game._prepared === true && !!window.gamemain', { timeout: 60000, polling: 200 });
    const scene = () => page.evaluate(() => (cc.director.getScene() ? cc.director.getScene().name : null));
    async function tap(x, y, s) { await page.mouse.move(x, y); await page.mouse.down(); await sleep(70); await page.mouse.up(); await sleep(s || 900); }
    for (let i = 0; i < 60; i++) {
        if ((await scene()) === 'HallScene') { break; }
        if (i % 3 === 1) { await tap(640, 400, 500); } else { await sleep(400); }
    }
    await sleep(4500);
    const read = () => page.evaluate(() => {
        const hall = window.hallScene;
        const root = hall.viewGroup[2].getChildByName('modeSwitch');
        const out = { lang: (function () { try { return gamemain.getGameLang(); } catch (e) { return '?'; } })(), title: null, rows: [] };
        if (root) {
            const tl = root.getChildByName('modeSwitchTitle');
            out.title = tl ? tl.getComponent(cc.Label).string : null;
            root.children.filter((n) => /^modeRow_/.test(n.name)).forEach((n) => {
                const lb = n.getChildByName('label_' + n.name.replace('modeRow_', ''));
                out.rows.push(n.name + '=' + (lb ? lb.getComponent(cc.Label).string : '?'));
            });
        }
        const cp = hall.viewGroup[5];
        const ct = cp.getChildByName('customTitle');
        out.customTitle = ct ? ct.getComponent(cc.Label).string : null;
        return out;
    });
    console.log('default   :', JSON.stringify(await read()));
    for (const lang of ['en', 'ja', 'ru', 'zh-Hans']) {
        await page.evaluate((l) => { try { gamemain.setGameLang(l); } catch (e) {} }, lang);
        await sleep(2600);
        console.log(lang.padEnd(10), ':', JSON.stringify(await read()));
    }
    await page.screenshot({ path: path.join(__dirname, 'shots', 'i18n.png') });
    console.log('errors:', JSON.stringify(errs.slice(0, 3)));
    await browser.close();
    server.kill();
    process.exit(0);
})().catch((e) => { console.error('HARNESS ERROR', e); process.exit(1); });
