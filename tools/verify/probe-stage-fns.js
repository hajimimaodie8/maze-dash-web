const path = require('path');
const { spawn } = require('child_process');
const puppeteer = require('puppeteer-core');
const WEB = 'E:\\maze_dash\\web';
const CHROME = 'C:\\Users\\Lenovo\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 8199;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
    const server = spawn(process.execPath, [path.join(WEB, 'serve.js'), String(PORT)], { stdio: 'ignore' });
    await sleep(900);
    const browser = await puppeteer.launch({
        executablePath: CHROME, headless: 'new',
        userDataDir: path.join(__dirname, 'chrome-profile-t1'),
        args: ['--no-sandbox', '--disable-extensions', '--no-first-run', '--mute-audio',
            '--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader',
            '--autoplay-policy=no-user-gesture-required'],
        defaultViewport: { width: 540, height: 960 },
    });
    const page = await browser.newPage();
    const errs = [];
    page.on('pageerror', (e) => errs.push(String(e.message).slice(0, 90)));
    await page.goto(`http://127.0.0.1:${PORT}/index.html`, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction('window.cc && cc.game._prepared === true && !!window.gamemain', { timeout: 60000, polling: 200 });
    const scene = () => page.evaluate(() => (cc.director.getScene() ? cc.director.getScene().name : null));
    async function tap(x, y, s) { await page.mouse.move(x, y); await page.mouse.down(); await sleep(70); await page.mouse.up(); await sleep(s || 900); }
    for (let i = 0; i < 60; i++) {
        if ((await scene()) === 'HallScene') { break; }
        if (i % 3 === 1) { await tap(270, 500, 500); } else { await sleep(400); }
    }
    await sleep(3500);

    const src = await page.evaluate(() => {
        const hall = window.hallScene;
        const page = cc.find('Canvas/gameView/scrollView').getComponent(cc.ScrollView).content.children.find((p) => p.getComponent('StageSelectLayer'));
        const comp = page.getComponent('StageSelectLayer');
        const short = (f) => (f ? String(f).replace(/\s+/g, ' ').slice(0, 420) : 'MISSING');
        return {
            hallKeysWithStage: Object.keys(hall).filter((k) => /stage/i.test(k)),
            hallStageLayerPrefab: !!(hall.StageLayerPrefab || hall.stageLayerPrefab),
            stageSelectPrefabProp: Object.keys(hall).filter((k) => /perfab|prefab/i.test(k)),
            createStageLayer: short(hall.createStageLayer),
            initStageLayer_hall: short(hall.initStageLayer),
            initStageLayer_comp: short(comp.initStageLayer),
            updateUnlockLayer: short(comp.updateUnlockLayer),
        };
    });
    console.log('=== function sources ===');
    Object.keys(src).forEach((k) => console.log('  ' + k + ': ' + JSON.stringify(src[k])));

    const attempt = await page.evaluate(() => {
        const hall = window.hallScene;
        const scv = cc.find('Canvas/gameView/scrollView').getComponent(cc.ScrollView);
        const content = scv.content;
        const before = { pages: content.children.length, w: Math.round(content.width) };
        const results = [];
        const prefab = hall.StageLayerPrefab || hall.stageLayerPrefab || null;
        function tryIt(label, fn) {
            try { const r = fn(); results.push({ label, ok: true, note: typeof r === 'string' ? r : (r === undefined ? 'undefined' : 'returned') }); }
            catch (e) { results.push({ label, ok: false, err: String(e.message || e).slice(0, 90) }); }
        }
        tryIt('call StageSelectLayer.initStageLayer(100) directly', () => hall.initStageLayer(100));
        tryIt('hall.createStageLayer(100)', () => hall.createStageLayer(100));
        tryIt('instantiate prefab + parent + initStageLayer(100)', () => {
            if (!prefab) { throw new Error('no StageLayerPrefab on hall: ' + JSON.stringify(Object.keys(hall).filter((k) => /perfab|prefab/i.test(k)))); }
            const p = cc.instantiate(prefab);
            p.parent = content;
            const c = p.getComponent('StageSelectLayer');
            if (c && c.initStageLayer) { c.initStageLayer(100); }
            return 'instantiated';
        });
        return { before, after: { pages: content.children.length, w: Math.round(content.width) }, results, prefabFound: !!prefab };
    });
    console.log('\n=== instantiation attempts ===');
    console.log('  before:', JSON.stringify(attempt.before), 'after:', JSON.stringify(attempt.after), 'prefabFound:', attempt.prefabFound);
    attempt.results.forEach((r) => console.log('   ' + (r.ok ? 'OK  ' : 'FAIL') + ' ' + r.label + (r.ok ? ' -> ' + r.note : ' -> ' + r.err)));
    console.log('  errors:', JSON.stringify(errs.slice(0, 4)));
    await browser.close();
    server.kill();
    process.exit(0);
})().catch((e) => { console.error('HARNESS ERROR', e); process.exit(1); });
