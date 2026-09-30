const puppeteer = require('puppeteer-core');
const CHROME = 'C:\\Users\\Lenovo\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe';
const FILE = 'file:///E:/maze_dash/dist/MazeDash-standalone.html';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const log = (k, v) => console.log('L ' + k + ':', typeof v === 'string' ? v : JSON.stringify(v));
(async () => {
    const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', userDataDir: 'E:\\maze_dash\\_work\\test\\chrome-profile-layout', protocolTimeout: 300000,
        args: ['--no-sandbox','--disable-extensions','--no-first-run','--mute-audio','--allow-file-access-from-files','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader'], defaultViewport: { width: 1440, height: 810 } });
    const page = await browser.newPage();
    const scene = () => page.evaluate(() => (cc.director.getScene() ? cc.director.getScene().name : '?'));
    async function tap(x, y, s) { await page.mouse.move(x, y); await page.mouse.down(); await sleep(70); await page.mouse.up(); await sleep(s || 900); }
    async function toHall() { for (let i = 0; i < 120; i++) { if ((await scene()) === 'HallScene') { return; } if (i % 3 === 1) { await tap(720, 400, 500); } else { await sleep(400); } } }

    async function measure(w, h, shot) {
        await page.setViewport({ width: w, height: h });
        await page.reload({ waitUntil: 'domcontentloaded', timeout: 120000 });
        await page.waitForFunction('window.cc && cc.game && cc.game._prepared === true', { timeout: 120000, polling: 150 });
        await toHall(); await sleep(3000);
        const m = await page.evaluate(() => {
            const vs = cc.view.getVisibleSize();
            const names = ['editorSmall_previewWorld', 'editorSmall_previewLevel', 'editorSmall_exportJson', 'editorSmall_importJson'];
            const out = { visible: [Math.round(vs.width), Math.round(vs.height)], buttons: [], allInside: true, anyClipped: false };
            names.forEach((n) => {
                let node = null;
                (function walk(x) { if (!node && x.name === n) { node = x; } (x.children || []).forEach(walk); })(cc.find('Canvas'));
                if (!node) { out.buttons.push({ name: n, missing: true }); out.allInside = false; return; }
                const wp = node.convertToWorldSpaceAR(cc.v2(0, 0));
                const half = node.width / 2;
                const lb = node.getChildByName('editorSmallLabel_' + n.replace('editorSmall_', ''));
                const lw = lb && lb.getComponent(cc.Label) ? lb.getComponent(cc.Label).actualWidth : null;
                const inside = (wp.x - half) >= 0 && (wp.x + half) <= vs.width;
                const textFits = (lw === null) ? null : (lw * 1.02 <= node.width - 20);
                if (!inside) { out.allInside = false; }
                if (textFits === false) { out.anyClipped = true; }
                out.buttons.push({ name: n, x: Math.round(wp.x), halfW: Math.round(half), w: Math.round(node.width), labelW: lw === null ? null : Math.round(lw), inside: inside, textFits: textFits });
            });
            const tb = window.hallScene && window.hallScene.tabBar && window.hallScene.tabBar.parent;
            out.tabBarTop = (function () { try { const b = tb.getBoundingBox(); return Math.round(b.y + b.height); } catch (e) { return null; } })();
            out.lowestButtonBottom = (function () { let lo = null; out.buttons.forEach((b, i) => {}); return lo; })();
            const big = [];
            ['editorBtn_createWorld', 'editorBtn_createLevel'].forEach((n) => { let node = null; (function walk(x) { if (!node && x.name === n) { node = x; } (x.children || []).forEach(walk); })(cc.find('Canvas')); if (node) { const wp = node.convertToWorldSpaceAR(cc.v2(0, 0)); big.push({ name: n, x: Math.round(wp.x), y: Math.round(wp.y), insideX: (wp.x - node.width / 2) >= 0 && (wp.x + node.width / 2) <= vs.width, insideY: (wp.y - node.height / 2) >= 0 && (wp.y + node.height / 2) <= vs.height }); } else { big.push({ name: n, missing: true }); } });
            out.bigButtons = big;
            return out;
        });
        log('layout_' + w + 'x' + h, m);
        let d = await page.evaluate(() => { let x = document.getElementById('probeAssertLine'); if (!x) { x = document.createElement('div'); x.id = 'probeAssertLine'; document.body.appendChild(x); } x.textContent = window.__bannerText || ''; x.style.cssText = 'position:fixed;left:0;top:0;width:100%;padding:8px;background:#101018;color:#7CFFB2;font:15px monospace;z-index:2147483647'; return 1; });
        await page.evaluate((t) => { const x = document.getElementById('probeAssertLine'); if (x) { x.textContent = t; } }, 'LAYOUT ' + w + 'x' + h + ' allInside:' + m.allInside + ' anyClipped:' + m.anyClipped + ' buttons:' + m.buttons.map((b) => (b.inside ? 'IN' : 'OUT')).join(','));
        await sleep(350);
        await page.screenshot({ path: shot });
        return m;
    }
    await page.goto(FILE, { waitUntil: 'domcontentloaded', timeout: 120000 });
    await page.waitForFunction('window.cc && cc.game && cc.game._prepared === true', { timeout: 120000, polling: 150 });
    await toHall(); await sleep(2500);
    const a = await measure(1440, 810, 'E:\\maze_dash\\docs\\screenshots\\70-layout-1440.png');
    const b = await measure(1700, 1000, 'E:\\maze_dash\\docs\\screenshots\\71-layout-1700.png');
    log('SUMMARY', { '1440_allInside': a.allInside, '1440_clipped': a.anyClipped, '1700_allInside': b.allInside, '1700_clipped': b.anyClipped });

    // item 3 evidence: find editor-home-ish nodes by name and print the parent chain
    log('homeNodes', await page.evaluate(() => {
        const hits = [];
        (function walk(n, chain) {
            if (hits.length < 14 && /custom|editor/i.test(n.name)) { hits.push({ name: n.name, chain: chain.slice(-4), children: (n.children || []).length }); }
            (n.children || []).forEach((k) => walk(k, chain.concat([n.name])));
        })(cc.find('Canvas'), []);
        let label = null;
        (function walk2(n) { if (!label && n.name === 'editorSmallLabel_importJson') { const l = n.getComponent(cc.Label); label = l ? l.string : null; } (n.children || []).forEach(walk2); })(cc.find('Canvas'));
        return { hits: hits, importJsonLabel: label };
    }));
    await browser.close(); process.exit(0);
})().catch((e) => { console.error('HARNESS ERROR', e); process.exit(1); });
