const path = require('path');
const { spawn } = require('child_process');
const puppeteer = require('puppeteer-core');
const WEB = 'E:\\maze_dash\\web';
const CHROME = 'C:\\Users\\Lenovo\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 8221;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
    const server = spawn(process.execPath, [path.join(WEB, 'serve.js'), String(PORT)], { stdio: 'ignore' });
    await sleep(900);
    const browser = await puppeteer.launch({
        executablePath: CHROME, headless: 'new',
        userDataDir: path.join(__dirname, 'chrome-profile-modeswitch'),
        args: ['--no-sandbox', '--disable-extensions', '--no-first-run', '--mute-audio',
            '--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader',
            '--autoplay-policy=no-user-gesture-required'],
        defaultViewport: { width: 1280, height: 800 },
    });
    const page = await browser.newPage();
    const errs = [];
    page.on('pageerror', (e) => errs.push(String(e.message).slice(0, 70)));
    await page.goto(`http://127.0.0.1:${PORT}/index.html`, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction('window.cc && cc.game._prepared === true && !!window.gamemain', { timeout: 60000, polling: 200 });
    const scene = () => page.evaluate(() => (cc.director.getScene() ? cc.director.getScene().name : null));
    async function tap(x, y, s) { await page.mouse.move(x, y); await page.mouse.down(); await sleep(70); await page.mouse.up(); await sleep(s || 900); }
    for (let i = 0; i < 60; i++) {
        if ((await scene()) === 'HallScene') { break; }
        if (i % 3 === 1) { await tap(640, 400, 500); } else { await sleep(400); }
    }
    await sleep(6000);
    const st = await page.evaluate(() => {
        const hall = window.hallScene;
        const page2 = hall.viewGroup[2];
        const root = page2.getChildByName('modeSwitch');
        const out = { found: !!root, customPageOld: !!(hall.viewGroup[5] && hall.viewGroup[5].getChildByName('modeTitle')), err: null };
        if (root) {
            const wp = root.convertToWorldSpaceAR(cc.v2(0, 0));
            const bsp = root.getComponent(cc.Sprite);
            out.pos = [Math.round(wp.x), Math.round(wp.y)];
            out.size = [Math.round(root.width), Math.round(root.height)];
            out.panel = { frame: bsp && bsp.spriteFrame ? bsp.spriteFrame.name : null, sliced: bsp ? bsp.type : null, insets: bsp ? [bsp.insetLeft, bsp.insetTop] : null, rgba: [root.color.r, root.color.g, root.color.b] };
            out.rows = root.children.filter((n) => /^modeRow_/.test(n.name)).map((n) => {
                const lb = n.getChildByName('label');
                return { name: n.name, size: [Math.round(n.width), Math.round(n.height)], rgba: [n.color.r, n.color.g, n.color.b], label: lb ? { text: lb.getComponent(cc.Label).string, size: lb.getComponent(cc.Label).fontSize } : null };
            });
        }
        return out;
    });
    console.log('mode switch:', JSON.stringify(st, null, 1));
    // switch mode by tapping the second row
    const row = await page.evaluate(() => {
        const r = window.hallScene.viewGroup[2].getChildByName('modeSwitch').getChildByName('modeRow_unlocked');
        const wp = r.convertToWorldSpaceAR(cc.v2(0, 0));
        const rect = cc.game.canvas.getBoundingClientRect();
        const vs = cc.view.getVisibleSize();
        return { x: rect.left + wp.x * (rect.width / vs.width), y: rect.top + (vs.height - wp.y) * (rect.height / vs.height) };
    });
    await tap(row.x, row.y, 1500);
    const after = await page.evaluate(() => ({
        mode: (function () { try { return localStorage.getItem('maze_dash_mode'); } catch (e) { return '?'; } })(),
        unlockedWorlds: (function () {
            const c = cc.find('Canvas/gameView/scrollView').getComponent(cc.ScrollView);
            return c.content.children.filter((p) => p.getComponent('StageSelectLayer')).map((p) => {
                const s = p.getComponent('StageSelectLayer');
                return s.m_stageId + ':' + (s.LockLayer && s.LockLayer.activeInHierarchy ? 'locked' : 'open');
            }).join(' ');
        })(),
    }));
    console.log('after tapping 解锁模式 ->', JSON.stringify(after));
    await page.screenshot({ path: path.join(__dirname, 'shots', 'mode-switch.png') });
    console.log('errors:', JSON.stringify(errs.slice(0, 3)));
    await browser.close();
    server.kill();
    process.exit(0);
})().catch((e) => { console.error('HARNESS ERROR', e); process.exit(1); });
