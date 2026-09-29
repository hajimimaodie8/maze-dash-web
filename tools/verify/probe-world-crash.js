/* 证据探针：.world 崩溃的根因是不是任务系统（m_quest_info）条目缺失？
   打印：m_quest_info 形状 / checkQuest 是否被 clean-mode 替换 / 抛异常的完整栈。
   运行：NODE_PATH=E:\maze_dash\_work\test\node_modules node tools/verify/probe-world-crash.js */
const puppeteer = require('puppeteer-core');
const CHROME = 'C:\\Users\\Lenovo\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe';
const FILE = 'file:///E:/maze_dash/dist/MazeDash-standalone.html';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
    const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new',
        userDataDir: 'E:\\maze_dash\\_work\\test\\chrome-profile-world', protocolTimeout: 240000,
        args: ['--no-sandbox','--disable-extensions','--no-first-run','--mute-audio','--allow-file-access-from-files','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader'],
        defaultViewport: { width: 1440, height: 810 } });
    const page = await browser.newPage();
    const stacks = [];
    page.on('pageerror', (e) => stacks.push(String(e.stack || e.message).replace(/\s+/g, ' ').slice(0, 300)));
    await page.goto(FILE, { waitUntil: 'domcontentloaded', timeout: 120000 });
    await page.waitForFunction('window.cc && cc.game && cc.game._prepared === true', { timeout: 120000, polling: 150 });
    const scene = () => page.evaluate(() => (cc.director.getScene() ? cc.director.getScene().name : '?'));
    async function tap(x, y, s) { await page.mouse.move(x, y); await page.mouse.down(); await sleep(70); await page.mouse.up(); await sleep(s || 900); }
    for (let i = 0; i < 90; i++) { if ((await scene()) === 'HallScene') { break; } if (i % 3 === 1) { await tap(720, 400, 500); } else { await sleep(400); } }
    await sleep(3500);
    const ev = await page.evaluate(() => {
        const out = { questKeys: [], checkQuest: null, mQuestType: typeof gamemain.m_quest_info, mQuestKeys: null,
                      mQuestLen: null, holes: [], sample: [], confQuestTables: [], cleanModeStats: null };
        try { out.questKeys = Object.keys(gamemain).filter((k) => /quest/i.test(k)); } catch (e) {}
        try {
            var f = gamemain.checkQuest;
            out.checkQuest = (typeof f) + ' :: ' + String(f).replace(/\s+/g, ' ').slice(0, 160);
        } catch (e) { out.checkQuest = 'unreadable'; }
        try {
            var q = gamemain.m_quest_info;
            out.mQuestKeys = Object.keys(q || {}).slice(0, 12);
            out.mQuestLen = (q && q.length !== undefined) ? q.length : null;
            // 找"洞"：长度范围内索引不存在
            if (q) { for (var i = 0; i < Math.min(out.mQuestLen || 0, 60); i++) { if (q[i] === undefined) { out.holes.push(i); } } }
            out.sample = (out.mQuestKeys || []).slice(0, 6).map(function (k) { var it = q[k]; return k + ':' + (it ? ((it.sz_type || '?') + '/w' + it.world) : 'UNDEFINED'); });
        } catch (e) { out.sample = ['ERR ' + e.message]; }
        try { out.confQuestTables = Object.keys(conf).filter((k) => /quest/i.test(k)); } catch (e) {}
        try { var cm = window.MazeDashCleanMode; out.cleanModeStats = cm && cm.stats ? Object.keys(cm.stats).slice(0, 20) : null; } catch (e) {}
        return out;
    });
    console.log('EVIDENCE:', JSON.stringify(ev));

    // enter the test level and capture the stack of whatever throws
    stacks.length = 0;
    await page.evaluate(() => { try { gamemain.enterEnterGameScene(10101); } catch (e) {} });
    let ok = false, waited = 0;
    for (let i = 0; i < 100; i++) {
        const r = await page.evaluate(() => {
            const m = cc.find('Canvas/backgroup/game_map');
            const cp = m && m.getComponent && m.getComponent('game_map');
            return !!(cp && cp.Level_data);
        });
        if (r) { ok = true; waited = i * 150; break; }
        await sleep(150);
    }
    console.log('ENTER:', JSON.stringify({ ok: ok, waitedMs: waited, scene: await scene() }));
    await sleep(2500);
    stacks.slice(0, 3).forEach((s, i) => console.log('STACK' + (i + 1) + ':', s));
    // is the error overlay on screen?
    const overlay = await page.evaluate(() => {
        try {
            const t = (document.body && document.body.innerText) ? document.body.innerText : '';
            return { hasErrorText: /出错|Error|TypeError/.test(t), sample: t.replace(/\s+/g, ' ').slice(0, 160) };
        } catch (e) { return { err: String(e.message) }; }
    });
    console.log('OVERLAY:', JSON.stringify(overlay));
    await page.screenshot({ path: 'E:\\maze_dash\\docs\\screenshots\\62-world-crash-evidence.png' });
    console.log('QUEST STATS:', JSON.stringify(await page.evaluate(() => {
        const s = window.MazeDashCustomTab.stats;
        return { cleanStamps: s.cleanStamps || null, hiddenQuest: s.questHidden || null, keys: Object.keys(s).filter((k) => /quest/i.test(k)) };
    })));
    await browser.close(); process.exit(0);
})().catch((e) => { console.error('HARNESS ERROR', e); process.exit(1); });
