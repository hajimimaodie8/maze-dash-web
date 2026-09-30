/* 验收：装饰下压是全局改动，必须确认原版世界 1 第 1 关的观感没被弄坏。
   做法：真实点击世界 1 第 1 关的关卡按钮 → 进关 → 打印 backgroup 层序与装饰节点 → 截图。
   单文件版 file://；若报 Failed to launch the browser process，清掉残留无头 chrome.exe 即可。 */
const puppeteer = require('puppeteer-core');
const CHROME = 'C:\\Users\\Lenovo\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe';
const FILE = 'file:///E:/maze_dash/dist/MazeDash-standalone.html';
const OUT = 'E:\\maze_dash\\docs\\screenshots\\96-world1-original-look.png';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
    const browser = await puppeteer.launch({
        executablePath: CHROME, headless: 'new',
        userDataDir: 'E:\\maze_dash\\_work\\test\\chrome-profile-world1',
        protocolTimeout: 240000,
        args: ['--no-sandbox', '--disable-extensions', '--no-first-run', '--mute-audio',
            '--allow-file-access-from-files', '--enable-unsafe-swiftshader',
            '--use-gl=angle', '--use-angle=swiftshader', '--autoplay-policy=no-user-gesture-required'],
        defaultViewport: { width: 1440, height: 810 },
    });
    const page = await browser.newPage();
    const errs = [];
    page.on('pageerror', (e) => errs.push(String(e.message).slice(0, 120)));
    await page.goto(FILE, { waitUntil: 'domcontentloaded', timeout: 120000 });
    await page.waitForFunction('window.cc && cc.game && cc.game._prepared === true', { timeout: 120000, polling: 150 });
    const scene = () => page.evaluate(() => (cc.director.getScene() ? cc.director.getScene().name : null));
    const tap = async (x, y, s) => { await page.mouse.move(x, y); await page.mouse.down(); await sleep(70); await page.mouse.up(); await sleep(s || 900); };
    for (let i = 0; i < 90; i++) {
        if ((await scene()) === 'HallScene') { break; }
        if (i % 3 === 1) { await tap(720, 400, 500); } else { await sleep(400); }
    }
    await sleep(3000);

    // 世界 1 第 1 关的关卡按钮（选关页第一页的第一个 LevelButton）
    const btn = await page.evaluate(() => {
        const scv = cc.find('Canvas/gameView/scrollView').getComponent(cc.ScrollView);
        const pg = scv.content.children.filter((p) => p.getComponent('StageSelectLayer'))[0];
        const layer = pg.getComponent('StageSelectLayer').SelectLevelLayer;
        const b = layer.children.filter((n) => n.getComponent && n.getComponent('LevelButton'))[0];
        const wp = b.convertToWorldSpaceAR(cc.v2(0, 0));
        const r = cc.game.canvas.getBoundingClientRect();
        const vs = cc.view.getVisibleSize();
        return { x: r.left + wp.x * (r.width / vs.width), y: r.top + (vs.height - wp.y) * (r.height / vs.height) };
    });
    await tap(btn.x, btn.y, 4500);
    for (let i = 0; i < 40; i++) { if ((await scene()) === 'gameScene') { break; } await sleep(300); }
    await sleep(3000);

    const info = await page.evaluate(() => {
        const bg = cc.find('Canvas/backgroup');
        const v = bg.getChildByName('vignettes');
        const m = bg.getChildByName('game_map');
        const out = {
            scene: cc.director.getScene().name,
            vignetteZ: v ? v.zIndex : null,
            mapZ: m ? m.zIndex : null,
            vignetteIndex: v ? bg.children.indexOf(v) : null,
            mapIndex: m ? bg.children.indexOf(m) : null,
            mapRows: (() => { try { const c = m.getComponent('game_map'); let n = 0; for (const k in c.Level_data) { n++; } return n; } catch (e) { return null; } })(),
            decor: [],
        };
        if (v) {
            (function walk(n, d) {
                if (d > 3) { return; }
                if (/vignette|bg1/i.test(n.name)) { out.decor.push(n.name + '@' + n.zIndex + (n.activeInHierarchy ? '' : '(inactive)')); }
                (n.children || []).forEach((c) => walk(c, d + 1));
            })(v, 0);
        }
        return out;
    });
    await page.screenshot({ path: OUT });
    console.log('WORLD1_LOOK=' + JSON.stringify(info));
    console.log('ERRS=' + JSON.stringify(errs));
    await browser.close();
    process.exit(0);
})().catch((e) => { console.error('HARNESS ERROR', e && e.message); process.exit(1); });
