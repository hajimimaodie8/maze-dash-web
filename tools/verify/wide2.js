/* Verify stage 2: level-select grid really widens, HUD follows, count badges gone. */
'use strict';
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const puppeteer = require('puppeteer-core');
const WEB = 'E:\\maze_dash\\web';
const SHOTS = path.join(__dirname, 'shots');
const CHROME = 'C:\\Users\\Lenovo\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 8185;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const checks = [];
function check(n, ok, d) { checks.push({ n, ok: !!ok, d }); console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}${d !== undefined ? '   ' + JSON.stringify(d) : ''}`); }

(async () => {
    const server = spawn(process.execPath, [path.join(WEB, 'serve.js'), String(PORT)], { stdio: 'ignore' });
    await sleep(900);
    const browser = await puppeteer.launch({
        executablePath: CHROME, headless: 'new',
        userDataDir: path.join(__dirname, 'chrome-profile-wu'),
        args: ['--no-sandbox', '--disable-extensions', '--no-first-run', '--mute-audio',
            '--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader',
            '--autoplay-policy=no-user-gesture-required', '--window-size=1280,800'],
        defaultViewport: { width: 1280, height: 800 },
    });
    const page = await browser.newPage();
    const errs = [];
    page.on('pageerror', (e) => errs.push(e.message));
    page.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
    await page.goto(`http://127.0.0.1:${PORT}/index.html`, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction('window.cc && cc.game._prepared === true && !!window.gamemain', { timeout: 60000, polling: 200 });
    const scene = () => page.evaluate(() => (cc.director.getScene() ? cc.director.getScene().name : null));
    async function tap(x, y, s) { await page.mouse.move(x, y); await page.mouse.down(); await sleep(70); await page.mouse.up(); await sleep(s || 900); }
    for (let i = 0; i < 90; i++) {
        if ((await scene()) === 'HallScene') { break; }
        if (i % 4 === 1) { await tap(640, 400, 400); } else { await sleep(400); }
    }
    await sleep(4000);

    const g = await page.evaluate(() => {
        const W = Math.round(cc.view.getVisibleSize().width);
        const sv = cc.find('Canvas/gameView/scrollView');
        const content = sv.getComponent(cc.ScrollView).content;
        const pages = content.children.filter((p) => p.getComponent('StageSelectLayer'));
        const first = pages[0];
        const c = first.getComponent('StageSelectLayer');
        const host = (c.SelectLevelLayer && c.SelectLevelLayer.parent && c.SelectLevelLayer.parent.getComponent(cc.Layout)) ? c.SelectLevelLayer.parent : c.SelectLevelLayer;
        const btns = (host.children || []).filter((n) => n.getComponent('LevelButton'));
        const xs = Array.from(new Set(btns.map((b) => Math.round(b.x)))).sort((a, b) => a - b);
        const ys = Array.from(new Set(btns.map((b) => Math.round(b.y)))).sort((a, b) => b - a);
        return {
            W,
            content: [Math.round(content.width), Math.round(content.height)],
            pageCount: pages.length,
            pageW: Math.round(first.width),
            bboxW: Math.round(first.children.length && c.BgLayer ? c.BgLayer.width : 0),
            gridHost: { name: host.name, w: Math.round(host.width), layout: !!host.getComponent(cc.Layout) },
            svContent: [Math.round(c.SV.content.width), Math.round(c.SV.content.height)],
            svNode: [Math.round(c.SV.node.width), Math.round(c.SV.node.height)],
            contentChildren: content.children.length,
            maskHost: c.SV.content.parent ? [Math.round(c.SV.content.parent.width), !!c.SV.content.parent.getComponent(cc.Mask), c.SV.content.parent.name] : null,
            arrows: [c.LeftButton ? Math.round(c.LeftButton.node.x) : null, c.RightButton ? Math.round(c.RightButton.node.x) : null],
            buttonCount: btns.length,
            cols: xs.length,
            rows: ys.length,
            btnW: btns.length ? Math.round(btns[0].width) : null,
            hintCount: gamemain.getHintCount(),
            wideStats: window.MazeDashWide ? window.MazeDashWide.stats : null,
        };
    });
    console.log('visible W', g.W, 'content', g.content, 'pages', g.pageCount, 'pageW', g.pageW);
    console.log('grid host', JSON.stringify(g.gridHost), 'svContent', g.svContent, 'svNode', g.svNode, 'mask', JSON.stringify(g.maskHost));
    console.log('buttons', g.buttonCount, 'cols', g.cols, 'rows', g.rows, 'btnW', g.btnW, 'arrows', g.arrows);
    console.log('stats', JSON.stringify(g.wideStats));

    check('pages widened to the viewport', g.pageW === g.W, { pageW: g.pageW, W: g.W });
    check('pager content widened to pages x width', g.content[0] === g.W * g.contentChildren, { content: g.content, children: g.contentChildren, pageCount: g.pageCount });
    check('level grid container widened', g.gridHost.w >= g.W - 130, g.gridHost);
    check('grid scroll content widened', g.svContent[0] >= g.W - 130, g.svContent);
    check('grid mask widened so nothing is clipped', !!g.maskHost && g.maskHost[0] >= g.W - 130, g.maskHost);
    check('grid now has far more columns than the 720 layout (6)', g.cols >= 10, { cols: g.cols, rows: g.rows, buttonCount: g.buttonCount });
    check('arrow buttons sit on the widened page edges', Math.abs(g.arrows[0] + (g.W / 2 - 46)) <= 1 && Math.abs(g.arrows[1] - (g.W / 2 - 46)) <= 1, g.arrows);
    check('hint count is unlimited', g.hintCount >= 9999, g.hintCount);
    check('grid was regenerated by the game itself', (g.wideStats.gridsRegenerated || 0) >= 1, g.wideStats);
    await page.screenshot({ path: path.join(SHOTS, 'wide2-01-grid.png') });

    // in-level: badges gone
    const pos = await page.evaluate(() => {
        let f = null;
        function cn(c) { try { return cc.js.getClassName(c); } catch (e) { return '?'; } }
        (function walk(n) {
            for (const c of (n._components || [])) {
                if (cn(c) === 'LevelButton') {
                    const label = (n.getComponentsInChildren(cc.Label) || []).map((l) => l.string).join('');
                    if (label === '1') {
                        const wp = n.convertToWorldSpaceAR(cc.v2(0, 0));
                        const r = cc.game.canvas.getBoundingClientRect();
                        const vs = cc.view.getVisibleSize();
                        f = { x: r.left + wp.x * (r.width / vs.width), y: r.top + (vs.height - wp.y) * (r.height / vs.height) };
                    }
                }
            }
            (n.children || []).forEach(walk);
        })(cc.director.getScene());
        return f;
    });
    // Enter through the game's own API (the grid button's own payload), so this
    // checks the in-level HUD rather than the tapping path.
    for (let a = 0; a < 4; a++) {
        const entered = await page.evaluate(() => {
            try {
                const sv = cc.find('Canvas/gameView/scrollView');
                const content = sv.getComponent(cc.ScrollView).content;
                const page = content.children.find((p) => p.getComponent('StageSelectLayer'));
                const c = page.getComponent('StageSelectLayer');
                const host = (c.SelectLevelLayer.parent && c.SelectLevelLayer.parent.getComponent(cc.Layout)) ? c.SelectLevelLayer.parent : c.SelectLevelLayer;
                const btn = (host.children || []).find((b) => b.getComponent('LevelButton'));
                if (!btn) { return 'no button'; }
                const cfg = conf.stage_level_cfg[1];
                const id = Object.keys(cfg)[0];
                gamemain.enterEnterGameScene(cfg[id].id);
                return String(cfg[id].id);
            } catch (e) { return 'err ' + e; }
        });
        console.log('   enter via API: level data id', entered);
        await sleep(2600);
        if ((await scene()) === 'gameScene') { break; }
    }
    await sleep(3000);
    const lvl = await page.evaluate(() => {
        const find = (p) => cc.find(p);
        const hint = find('Canvas/backgroup/button_group/btn_hint/count');
        const restart = find('Canvas/backgroup/button_group/btn_restart/count');
        const bar = find('Canvas/backgroup/button_group');
        return {
            scene: cc.director.getScene().name,
            hintBadge: hint ? hint.activeInHierarchy : 'missing',
            restartBadge: restart ? restart.activeInHierarchy : 'missing',
            bar: bar ? { w: Math.round(bar.width), x: Math.round(bar.x) } : null,
            top: (function () { const tp = cc.find('Canvas/backgroup/top'); return tp ? Math.round(tp.width) : null; })(),
            hidden: window.MazeDashWide ? window.MazeDashWide.stats.badgesHidden : null,
            unlimited: window.MazeDashWide ? window.MazeDashWide.stats.unlimited : null,
            hintCount: gamemain.getHintCount(),
        };
    });
    console.log('in level:', JSON.stringify(lvl));
    check('hint count badge is gone', lvl.hintBadge === false, lvl.hintBadge);
    check('restart count badge is gone', lvl.restartBadge === false, lvl.restartBadge);
    check('in-level HUD rows stay centred in the wide view (Layout-driven, compact by design)', Math.abs(lvl.bar.x) <= 1 && lvl.top > 0, { bar: lvl.bar, top: lvl.top });
    check('hint/restart counters are pinned (no consumption)', lvl.hintCount >= 9999, { hint: lvl.hintCount, unlimited: lvl.unlimited });
    await page.screenshot({ path: path.join(SHOTS, 'wide2-02-level.png') });
    check('no page errors', errs.length === 0, errs.slice(0, 5));

    const failed = checks.filter((c) => !c.ok);
    console.log(`\n============ ${checks.length - failed.length}/${checks.length} stage-2 checks passed ============`);
    fs.writeFileSync(path.join(__dirname, 'wide2-result.json'), JSON.stringify({ g, lvl, checks, errs }, null, 2));
    await browser.close();
    server.kill();
    process.exit(failed.length ? 2 : 0);
})().catch((e) => { console.error('HARNESS ERROR', e); process.exit(1); });
