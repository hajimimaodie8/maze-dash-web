/* Where did the colour markers actually land, and what is on top of what?
 * Reports per marker: name, colour, size, world position, its parent tile's position/size/zIndex,
 * its own zIndex, and the world position + zIndex of every sibling sprite in that tile (so the
 * engine's portal sprite can be identified and its draw order compared).
 *
 * Run: NODE_PATH=E:\maze_dash\_work\test\node_modules node tools/verify/probe-portal-markers.js
 */
const path = require('path');
const fs = require('fs');
const puppeteer = require('puppeteer-core');

const CHROME = 'C:\\Users\\Lenovo\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe';
const FILE = 'file:///E:/maze_dash/dist/MazeDash-standalone.html';
const OUT = path.join(__dirname, 'out', 'portal-markers.json');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
    fs.mkdirSync(path.dirname(OUT), { recursive: true });
    const browser = await puppeteer.launch({
        executablePath: CHROME, headless: 'new',
        userDataDir: path.join(__dirname, 'chrome-profile-portalmarkers'),
        protocolTimeout: 240000,
        defaultViewport: { width: 1440, height: 810 },
        args: ['--no-sandbox', '--disable-extensions', '--no-first-run', '--mute-audio',
            '--allow-file-access-from-files', '--enable-unsafe-swiftshader',
            '--use-gl=angle', '--use-angle=swiftshader', '--autoplay-policy=no-user-gesture-required'],
    });
    const page = await browser.newPage();
    await page.goto(FILE, { waitUntil: 'domcontentloaded', timeout: 180000 });
    await page.waitForFunction('window.cc && cc.game && cc.game._prepared === true', { timeout: 180000, polling: 150 });
    const scene = () => page.evaluate(() => (cc.director.getScene() ? cc.director.getScene().name : null));
    async function tap(x, y, s) { await page.mouse.move(x, y); await page.mouse.down(); await sleep(80); await page.mouse.up(); await sleep(s || 900); }
    for (let i = 0; i < 90; i++) {
        if ((await scene()) === 'HallScene') { break; }
        if (i % 3 === 1) { await tap(720, 400, 500); } else { await sleep(400); }
    }
    await sleep(3500);
    const btn = await page.evaluate(() => {
        const scv = cc.find('Canvas/gameView/scrollView');
        const c = scv && scv.getComponent(cc.ScrollView).content;
        const p0 = c && c.children.filter((p) => p.getComponent('StageSelectLayer'))[0];
        const h = p0 && p0.getComponent('StageSelectLayer').SelectLevelLayer;
        const b = h && h.children.filter((n) => n.getComponent && n.getComponent('LevelButton'))[0];
        if (!b) { return null; }
        const wp = b.convertToWorldSpaceAR(cc.v2(0, 0));
        const r = cc.game.canvas.getBoundingClientRect(); const vs = cc.view.getVisibleSize();
        return { x: r.left + wp.x * (r.width / vs.width), y: r.top + (vs.height - wp.y) * (r.height / vs.height) };
    });
    if (btn) { await tap(btn.x, btn.y, 4000); }
    for (let i = 0; i < 60; i++) { if ((await scene()) === 'gameScene') { break; } await sleep(300); }
    await sleep(4000);

    const data = await page.evaluate(() => {
        const out = { markers: [], tiles: [] };
        const map = cc.find('Canvas/backgroup/game_map');
        const comp = map && map.getComponent('game_map');
        const itemLayer = map && map.children.filter((c) => /tile_item_layer/i.test(c.name))[0];
        const spriteInfo = (n) => {
            const sp = n.getComponent && n.getComponent(cc.Sprite);
            const wp = n.convertToWorldSpaceAR(cc.v2(0, 0));
            return { name: n.name, frame: sp && sp.spriteFrame ? String(sp.spriteFrame.name) : null,
                local: [Math.round(n.x), Math.round(n.y)], world: [Math.round(wp.x), Math.round(wp.y)],
                size: [Math.round(n.width), Math.round(n.height)], z: n.zIndex,
                colour: [n.color.r, n.color.g, n.color.b], children: (n.children || []).length };
        };
        if (itemLayer) {
            itemLayer.children.filter((n) => n.name === 'spaceTile').forEach((t, i) => {
                const rec = spriteInfo(t);
                rec.index = i;
                rec.kids = (t.children || []).map(spriteInfo).slice(0, 6);
                out.tiles.push(rec);
            });
        }
        (function walk(n, p) {
            if (/^portalColour[0-9]+$/.test(n.name)) {
                const rec = spriteInfo(n);
                rec.path = p + '/' + n.name;
                rec.parentInfo = n.parent ? spriteInfo(n.parent) : null;
                out.markers.push(rec);
            }
            (n.children || []).forEach((c) => walk(c, p + '/' + n.name));
        })(cc.director.getScene(), 'scene');
        // cells that carry a colour, for comparison
        out.colourTableHits = [];
        const rows = comp ? Object.keys(comp.Level_data) : [];
        for (let ri = 0; ri < rows.length; ri++) {
            const y = rows[ri], row = comp.Level_data[y];
            for (const x in row) { if (row[x] === 2) { out.colourTableHits.push(x + ',' + y); } }
        }
        out.itemTileTotal = out.tiles.length;
        return out;
    });

    fs.writeFileSync(OUT, JSON.stringify(data, null, 2));
    console.log('item tiles:', data.itemTileTotal, ' markers:', data.markers.length);
    console.log('--- tiles (index, world, size, kids) ---');
    data.tiles.forEach((t) => console.log('   [' + t.index + '] world=' + JSON.stringify(t.world) + ' size=' + JSON.stringify(t.size) + ' z=' + t.z + ' kids=' + JSON.stringify(t.kids.map((k) => k.name + '@' + k.world.join(',') + ' ' + k.size.join('x') + ' z' + k.z))));
    console.log('--- markers ---');
    data.markers.forEach((m) => console.log('   ' + m.name + ' colour=' + JSON.stringify(m.colour) + ' world=' + JSON.stringify(m.world) + ' size=' + JSON.stringify(m.size) + ' z=' + m.z + ' parentWorld=' + JSON.stringify(m.parentInfo && m.parentInfo.world) + ' parentSize=' + JSON.stringify(m.parentInfo && m.parentInfo.size)));
    console.log('saved:', OUT);
    await browser.close();
    process.exit(0);
})().catch((e) => { console.error('HARNESS ERROR', e); process.exit(1); });
