# 关卡数据格式 · 证据与研究底稿

> 这份文档是 **[level-format.md](level-format.md)** 里结论的**证据层**：每条结论都标明
> 「从哪个文件的哪一行读出来」或「哪个探针产出的哪个文件里量出来」，以及复现方式。
> **接手编辑器的人只需要读 level-format.md**；要质疑或修改某条结论时再回这里找依据。
>
> 结论速览（写给不想读细节的人）：
>
> 1. 关卡数据有三层：`data/package*.txt` → `data/levels.json` → 运行期 `conf.all_Level[mapId]`；
> 2. 运行期有**两个**矩阵（`Level_data` 地形 / `Level_item_data` 道具状态），编辑器只需要写一个；
> 3. 原版传送门**没有配对表**：`getOutPortal` 返回"整张图里遇到的第一个其它传送门"，
>    所以 3 个以上门会全部连到同一个 —— 本项目的"同色才通"是在实例上**包装**这个方法实现的；
> 4. 门的颜色必须走**旁表**：格子值只能是 `2`，写成 `21/22/23` 渲染器**根本不画门**；
> 5. 背景不来自关卡数据，由**世界**决定（`vignettes/stage{worldId}_bg1` + 随机装饰）；
> 6. `tools/verify/solver.js` 不是解算器，它只会**重放现成的解法串**（见 §10）。

---

## 0. 证据标记与快照

| 标记 | 含义 |
| --- | --- |
| 【源码】 | 直接读本仓库里的移植源码（给出 `文件:行号`） |
| 【实测】 | 由 `tools/verify/` 下的探针（puppeteer 驱动真实游戏）跑出来，产物落在 `tools/verify/out/` 或 `docs/screenshots/` |
| 【推断】 | 我的推理，**没有**被源码或实测直接验证；写结论时不会当事实用 |

快照（写这份文档时的状态，供行号对账）：

| 项 | 值 |
| --- | --- |
| git HEAD | `eb8f8b5`（*editor phase 2: element palette, per-map portal colours, and the layout the user asked for*）；前一提交 `1b1162c` 是编辑器第一阶段 |
| 移植源码 | `web/src/project.js`（5160 行）、`web/src/assets/script/plug/tileType.js`（30 行）、`web/src/assets/script/plug/gameconf.js`（127 行）—— 这三份**没有**在 phase 2 里改动 |
| 反编译参考 | `_work/analysis/project.pretty.js`（6025 行，代码与 `web/src/project.js` 同源、仅排版不同） |
| 移植层 | `web/custom-tab.js` @ `eb8f8b5` = **2713 行**（phase 1 时是 2519 行） |
| 游戏数据 | `data/package1..8.txt`（290 关）、`data/levels.json`（290 条） |

**关于 `web/custom-tab.js` 的行号**：这份文件每轮都在长，行号会漂。
本文对它的引用分两种：

- 标 `@HEAD` 的行号 = **phase 2 提交后的当前值**（`eb8f8b5`，2026-09-29 抓到）；
- 同时一律给出**函数名/变量名**，行号对不上时按名字搜。
- 该文件当时正被**另一个代理并发修改**，工作区版本可能比提交更新。

复现/复核用到的探针与产物：

| 探针 | 产物 | 用途 |
| --- | --- | --- |
| `tools/verify/probe-portal-geometry.js` | `tools/verify/out/portal-geometry.json` | 量 `game_map` 的图层结构、每格 `spaceTile`、间距、帧名 |
| `tools/verify/probe-portal-markers.js` | `tools/verify/out/portal-markers.json`、`docs/screenshots/50-portal-markers.json` | 量门格自身的颜色、`Portal` 子节点颜色、格子索引 |
| `tools/verify/probe-portal-paint.js` | `tools/verify/out/portal-paint.json`、`docs/screenshots/50-portal-colours-fixed.png` | 量上色后的门色、`/portal/i` 帧名命中数 |
| `tools/verify/solver.js` / `alllevels.js` | 控制台输出 + `tools/verify/shots/` | 过关判定的端到端验证 |
| `tools/verify/probe-map-data.js`、`probe-grid-editor.js` | 控制台 `stats` | 运行期矩阵、编辑器保存闭环 |
| `tools/verify/probe-editor-tools.js` | `docs/screenshots/51-editor-palette.png`、`52-editor-drawn-tools.png`、`53-editor-tools-played.png` | phase 2 的元素调色板：工具按钮数、色板数、标签栏遮挡、画完能进关（`eb8f8b5`） |

---

## 1. 三层数据（每条都有源码或实测支撑）

```
① 作者层   data/package1..8.txt     #mapId + 逗号分隔的字符网格
② 配置层   data/levels.json         {id, wordId, levelId, mapId, sz_solution}
③ 运行层   conf.all_Level[mapId]    二维整数数组（引擎真正消费的东西）
```

### 1.1 ①→③ 的解析：`web/src/assets/script/plug/gameconf.js:67-125`【源码】

```js
67: conf.all_Level = {};
68: cc.loader.loadResDir("Puzzle/", function(e, a) {
69: if (!e) for (var o = 0; o < a.length; o++) for (var l = a[o].text.split("\n"), n = 0, c = 0; c < l.length; c++) if ("" != l[c] && "\r" != l[c]) if ("#" == l[c].substring(0, 1)) {
70: n = parseInt(l[c].substring(1, l[c].length - 1));          // ← "#12," 也能解析：砍掉末字符
71: conf.all_Level[n] = [];
72: } else {
73: var i = l[c].split(",");
74: for (var t in i) {
75: var f = i[t].replace(/\r/g, "");
76: switch (f.toUpperCase()) { ... }                            // 77-118：字符 → tileType
120: i[t] = f;                                                  // ← 没匹配到的字符原样保留
121: }
122: conf.all_Level[n][conf.all_Level[n].length] = i;
123: }
124: conf.checkCallBack();
```

要点（都能从上面直接读出来）：

- 地图编号只认 `#N`；`substring(1, len-1)` 说明**结尾那个字符被无条件丢弃**，所以 `#5,` 与 `#5` 等价【源码】；
- 空行、`\r` 被跳过；行 = 地图的一行，**从上到下 y 递增**，逗号切分后**左到右 x 递增**【源码】；
- 字符先 `toUpperCase()`，所以小写等价【源码】；
- **未识别的字符不会被转换**（`switch` 没有 `default:`，`i[t]` 保持原字符串）【源码】。
  后果：`getStepArray` 的 `switch` 匹配不到任何分支 → 冲刺在那一格前停住【推断】。
  编辑器**必须**拒绝未知字符，不能"先存了再说"。

### 1.2 ② 的实际内容（直接读 `data/levels.json`）

`data/levels.json`：290 条，键是自增 `id`，值形如
`{"id":5,"wordId":1,"levelId":5,"mapId":5,"sz_solution":"LURDRDL"}`。
字段名是 `wordId`（原包 Spritesheet/JSON 里就是这个拼写，不是 `worldId`）。

### 1.3 ③ 的载入：`web/src/project.js:3921-3937`【源码】

```js
3921: loadLevel: function(e, t, i) {
3922:   this.worldId = e;
3923:   this.mapId = t;
3924:   this.clearAll();
3925:   var n = CloneJson(conf.all_Level[t]);
3926:   this.Themes = conf.theme_cfg[this.worldId];
3927:   if (n && n.length > 0) {
3928:     this.Level_data = n;
3929:     this.Level_item_data = CloneJson(n);
3930:     var a = cc.size(n[0].length, n.length);
3931:     this.MapSize = a;
3932:     this.setTiles(n);
3933:     this.addObstacle();
```

- `MapSize = (列数, 行数)`，即 `n[0].length` 是**列**、`n.length` 是**行**【源码】；
- `TileSize` 在组件属性里定义为 80（`web/src/project.js:3853`）【源码】。

### 1.4 `> 0` 的格子都会铺一层地板（编辑器容易忽略）

`setTiles` 只判 `> 0`（`project.js:4029-4032`）：

```js
4031: for (var t in e) for (var i in e[t]) e[t][i] > 0 && this.addTileAt(cc.v2(parseInt(i), parseInt(t)));
```

`addTileAt`（`project.js:4144-4163`）**每格建两个**节点：一个铺在 `fllor_space_layer`、
一个铺在 `shadow_layer`。而**传送门(2)/钥匙(4)/箭头(5-8) 的值都 `> 0`**，所以它们也各拿一层地板底衬。

【实测】自检：测试关卡 6×10 网格里 `1` 有 15 格、`2` 有 6 格，探针量到
`fllor_space_layer = 21`、`shadow_layer = 21` —— 正好 15+6，证实"门也铺地板"
（`tools/verify/out/portal-geometry.json` → `diag.spaceTileCounts`）。

---

## 2. 运行期是**双矩阵**（这一条决定了编辑器的写入面）

【源码】`web/src/project.js:3928-3929`：

```js
this.Level_data      = n;                  // 地形 / 规则
this.Level_item_data = CloneJson(n);       // 独立副本：道具的运行期状态
```

两个矩阵的**初始值完全一样**，之后被引擎分开改写：

| 矩阵 | 谁在写 | 写成什么 | 依据（`web/src/project.js`） |
| --- | --- | --- | --- |
| `Level_data` | 冲刺推进时，蛇头经过的每一格 | `kTileDataBlock`(0)，即"已被占据" | `getStepArray`（`4181-4250`），写 `Block` 的行号：`4189/4196/4204/4214/4223/4233/4235/4244` |
| `Level_data` | 集齐钥匙后的 `unLock()` | 所有 `Lock`(-3) → `Space`(1) | `unLock`（`4445-4462`），锁→地板在 **4449** |
| `Level_data` | 冲刺结束后正对砖块 → 撞碎 | `Destroyable`(-4) → `Space`(1) | `4272-4291`，`4274` 补一块地板、**`4275`** 改成 `1` |
| `Level_item_data` | 穿过传送门后，给**出口格**打方向标记 | `kTileDataPortU/D/L/R`(1001-1004) | 传送门分支 `4231-4240`，标记写在 **4239** |
| `Level_item_data` | 拾取钥匙 / 锁消失后清格 | `kTileDataSpace`(1) | 钥匙 `4440`、`unLock` 里 `4456` |

读取方（至少两处，都只认 `Level_item_data`）【源码】：

- `checkArrow`（`project.js:4489-4491`）判断"这个方向能不能进"；
- `checkTileItem`（`project.js:4383-4396` 及之后的箭头分支）判断"要不要播穿过门的动画/移除道具节点"：

```js
4489: checkArrow: function(e, t) {
4490:   return this.Level_item_data[e.y][e.x] == tileType.kTileDataArrowUp ? t == Direction.DirectionUp : ...
4491: },
```

```js
4383: checkTileItem: function(e, t, i, n) {
4384:   var a = this.Level_item_data[e.y][e.x];
4385:   if (a == tileType.kTileDataPortal || a == tileType.kTileDataPortU || a == tileType.kTileDataPortD || a == tileType.kTileDataPortL || a == tileType.kTileDataPortR) {
4386:     var o = cc.instantiate(this.Prortal_out);   // 门的"穿出"特效
4394:     c.removeFromParent(!0);                     // 道具节点被移除 → 视觉上门就消失了
4395:     this.TileItems[e.y][e.x] = null;
```

**完整解读**（源码 + 推断分开写）：

- 【源码】`checkArrow(pos, dir)` 的语义是"**从 `dir` 方向进入 `pos` 是否允许**"；
  箭头格要求 `dir` 与箭头自己的方向一致，`Port{D,U,L,R}` 格则"**挡住那个反向**"
  （例如 `PortD` 挡 `DirectionUp`）。
- 【推断】所以传送门出口格的作用是：**不允许你沿刚才穿出的反方向原路再撞回门里**。
  这是 `Level_item_data` 存在的第二个理由（第一个是箭头）。
- 【推断·给编辑器】既然这两个矩阵的初始值都来自同一个数组、且引擎自己会克隆，
  **编辑器只需要写 `Level_data` 那一个矩阵**（= `conf.all_Level[mapId]`）。不要去写
  `Level_item_data`，也不要把运行期状态存进关卡文件。

---

## 3. `tileType` / `Direction` 全表（`web/src/assets/script/plug/tileType.js`，全文 30 行）【源码】

```js
window.tileType = {
  kTileDataBlock: 0,          // 墙
  kTileDataSpace: 1,          // 地板
  kTileDataPortal: 2,         // 传送门
  kTileDataKey: 4,            // 钥匙
  kTileDataArrowUp: 5, kTileDataArrowRight: 6, kTileDataArrowDown: 7, kTileDataArrowLeft: 8,
  kTileDataHead: -1,          // 蛇头（出生点）
  kTileDataBody: -2,          // 蛇身（仅运行期）
  kTileDataLock: -3,          // 锁
  kTileDataDestroyable: -4,   // 可破坏砖块
  kTileDataPortU: 1001, kTileDataPortD: 1002, kTileDataPortL: 1003, kTileDataPortR: 1004
};                            // ↑ 这四个只出现在 Level_item_data，不会出现在关卡文件里
window.Direction = { DirectionUp: 1, DirectionDown: 2, DirectionLeft: -1, DirectionRight: -2 };
window.CloneJson = function(a) { var i = JSON.stringify(a); return JSON.parse(i); };   // 深拷贝
```

字符 ↔ 数值的映射同文件之外的部分在 `gameconf.js:76-119`【源码】：
`"0"→1`、`"C"→-1`、`"P"→2`、`"^"→5`、`">"→6`、`"<"→8`、`"V"→7`、`"W"→0`、`"B"→-4`、`"K"→4`、`"L"→-3`。

- 方向常量 `Up=1 / Down=2 / Left=-1 / Right=-2`；`Up` 就是 `y-1`
  （`project.js:4253`：`DirectionUp → cc.v2(t.x, t.y - 1)`）【源码】。
- 注意区分：**格子里的 `-2` 是蛇身**，**方向里的 `-2` 是 `Right`** —— 同一份数据里两个含义，
  编辑器读方向时不要拿格子值去比。

### 3.1 箭头行为的精确说法【源码】

`checkArrow` 只在"进入方向 == 箭头方向"时返回真；`getStepArray` 的箭头分支
（`project.js:4192-4230`）只有在 `e != 相反方向` 时才改向并继续。
合起来的实际效果：**只有沿箭头方向走才能进入箭头格，其它三个方向都进不去**（等价于墙）【源码】。
`data/README.md` 与旧文档里写的"与当前方向相反则视为墙"**不够准**（漏掉了垂直方向也被挡）【推断·措辞纠正】。

---

## 4. 过关判定：`checkClearSatge` 的精确含义【源码】

`web/src/project.js:4492-4495`：

```js
4492: checkClearSatge: function() {
4493: for (var e in this.Level_data) for (var t in this.Level_data[e]) if (this.Level_data[e][t] != tileType.kTileDataBody && this.Level_data[e][t] != tileType.kTileDataHead && this.Level_data[e][t] != tileType.kTileDataBlock) return !1;
4494: return !0;
4495: }
```

逐个对照 `tileType` 的数值：`kTileDataBody = -2`、`kTileDataHead = -1`、`kTileDataBlock = 0`。

所以判定是 **"棋盘里没有任何一格的值不是 {0, -1, -2}"**，而不是"墙不算填充"这么一句能概括的：

- **墙（0）天然满足**这个条件 —— 它本来就是 `Block`。原文"墙不算填充"写在文档里容易读成
  "墙会让判定失败"，那是错的【推断·措辞纠正】；
- **地板（1）必须被蛇头/蛇身压过**才会变成 `0`（`getStepArray` 里 `Level_data[..] = kTileDataBlock`），
  这才是"填满所有地板格"的机制来源【源码】；
- 因此等价说法是：**所有"非 0/-1/-2"的格子都必须消失**。不满足的类型包括
  `1 地板`、`2 传送门`、`4 钥匙`、`5-8 箭头`、`-3 锁`、`-4 砖块` ——
  所以**没被压过的箭头、没撞碎的砖、没吃掉的钥匙都会阻止过关**【源码】。

### 4.1 两个反直觉的连带效果：锁和砖块都会"变成地板"【源码】

`unLock()`（`project.js:4445-4462`）在集齐钥匙后：

```js
4449: for (var i in this.Level_data[t]) this.Level_data[t][i] == tileType.kTileDataLock && (this.Level_data[t][i] = tileType.kTileDataSpace);
```

即 `-3 锁` → `1 地板`。撞碎砖块那条路也一样（`project.js:4272-4291`）：

```js
4274: h.addTileAt(l);                                        // 补一层地板视觉
4275: h.Level_data[l.y][l.x] = tileType.kTileDataSpace;      // -4 砖块 → 1 地板
```

**副作用**：这两种格子从"过关条件以外的东西"变成"必须再被蛇身压过一次"。
即 `1 地板` 是唯一一种"必须被蛇头/蛇身覆盖"的格子，而**锁和砖块被清掉之后也加入了这个名单**【推断，推导链完全来自源码】。
对编辑器的意义：**放锁、放砖的关卡要留出回头路**，否则会出现"钥匙吃完了 / 砖撞碎了但过不了关"。

---

## 5. 传送门配对：**没有配对表**（本轮最重要的反直觉结论）

【源码】`web/src/project.js:4485-4488`（反编译版同义：`_work/analysis/project.pretty.js:5098-5104`）：

```js
4485: getOutPortal: function(e) {
4486: for (var t in this.Level_data) for (var i in this.Level_data[t]) if (this.Level_data[t][i] == tileType.kTileDataPortal && (i != e.x || t != e.y)) return cc.v2(parseInt(i), parseInt(t));
4487: return e;                       // 找不到别的门 → 原地不动（传送给自己）
4488: },
```

读出来的事实：

1. **没有 ID、没有颜色、没有配对表**。配对 = "从 `(0,0)` 开始按行优先扫描整张图，返回
   遇到的第一个**不是自己**的 `2`"【源码】；
2. 只有 **2 个门**时结果符合直觉（A 找 B、B 找 A）；
3. **3 个及以上**时，`(0,0)` 方向最靠前的那个门会被所有其它门选中 ——
   即"所有门通往同一个门"【源码 + 推断，推断部分是把循环读成人话】；
4. 调用点在 `getStepArray` 的传送门分支（`project.js:4231-4240`）：
   先把**入口格**改成 `0`（4233），再取出口格并**把出口格也改成 `0`**（4235），
   然后给出口格写方向标记 `Level_item_data[out] = Port{方向}`（4237-4239）；
5. **门是"一次性"的**：`4233` 先把入口格写成 `0`，`4234` 才去找出口，`4235` 再把出口格也写成 `0`。
   也就是说**一次穿越会同时把两个门格从 `2` 抹成 `0`**，之后 `getOutPortal` 再也找不到它们。
   【推断，直接来自这两行赋值 + `getOutPortal` 的筛选条件 `== kTileDataPortal`】
   对编辑器的两条硬约束：
   - **每个放在关卡里的门都必须被用到**（没用过的门格值仍是 `2`，会让 `checkClearSatge` 永远返回假）；
   - **同一对门不能指望被穿两次**（第二个主角走到那里时门已经不在了）。
   测试关卡的 3 主角 × 3 色门 = 3 次穿越正好消耗 6 个门格，与"可解"的设计一致【推断】。

本仓库已记录的相关实验（`web/custom-tab.js` @HEAD 2363-2365 的注释）：
测试关卡左房间 3 个主角、左右房间各 3 个门，**两房间被墙完全隔开** ——
只有"同色配对"生效时主角才可能从左房间到右房间，这是用来**判定配对逻辑真假**的对照设计【源码注释】。

---

## 6. 彩色传送门扩展（本项目的实现，`web/custom-tab.js`）

### 6.1 颜色放旁表，**不能**放进格子值

【源码】`web/custom-tab.js` @HEAD：

```js
1007: var PORTAL_PALETTE = { 1: cc.color(226, 64, 72), 2: cc.color(64, 200, 96), 3: cc.color(64, 140, 240), 4: cc.color(168, 88, 224) };
1009: var portalColoursByMap = {};
1010: function mapColours(mapId) { if (!portalColoursByMap[mapId]) { portalColoursByMap[mapId] = {}; } return portalColoursByMap[mapId]; }
1011: function setActiveMapColours(mapId) { activePortalColours = mapColours(mapId); stats.activeColourMap = mapId; return activePortalColours; }
```

```js
2406: /* Portal colours live in a side table rather than in the tile value: the renderer only draws a
2407:    portal when the cell is exactly 2, so coloured tiles were invisible. Keyed by "<x>,<y>". */
2408: var portalColours = {};
```

**这是踩过的坑**：早期用 `20 + 颜色序号`（21/22/23）编码颜色，
结果**渲染器根本不画门**（`addTileItem` 的 `else if (t == kTileDataPortal)` 分支匹配不到 21/22/23，
`project.js:4072`）【源码 + 实测（截图 `docs/screenshots/49-grid-editor-played.png` 与 50 系列的对比）】。

> 遗留噪声（**两处**，读代码时别被带跑）：
> 1. `web/custom-tab.js` @HEAD 2405 的注释还写着"颜色编码：2 = 默认，20+c = 第 c 种颜色" ——
>    那是**旧方案**的注释，当前实现里门值恒为 `2`；
> 2. 同文件 2426 的注释说"a coloured square is added on top of it"（叠一个色块）——
>    也与当前实现不符：真正生效的是 `paintPortalColours` 里
>    **`tiles[i].color = PALETTE[col]`（2468 行）**，即染 tile 自己（§6.4）。
> 3. 同文件 2559 附近的 `TEST_GRID` 上方注释仍写"红 21 / 绿 22 / 蓝 23"，同样是旧注释。

### 6.2 配对改成实例级包装

【源码】`web/custom-tab.js:2487-2511`（@HEAD，`patchPortalPairing`）：
在 `game_map` 组件实例上**覆盖** `getOutPortal`：只接受 `v === 2` 的格子；
若本次调用有颜色（`want > 0`）则要求对方颜色相同；找不到同色伙伴就**返回自身坐标**（= 不传送）。
这是"同一关里多组同色门"能成立的原因。

### 6.3 旁表的键：**已改为按 mapId**（phase 2 落地）

phase 1 的注释曾写道按 mapId 分级行不通（`web/custom-tab.js` @HEAD 2410-2412：

```
/* One table for the level currently loaded. Keying it by mapId did not work - the component
   does not expose its map id - and a missing key made every portal look uncoloured, which
   silently fell back to "pair with the first portal". The editor will key this properly. */
```

phase 2 用"**从外面塞**，而不是从组件里读"绕过了这个问题【源码，@HEAD】：

| 环节 | 行号 | 做什么 |
| --- | --- | --- |
| 存 | `1385` | 保存关卡时把编辑器的颜色表写进 localStorage 记录：`{ grid, colours, world, levelId, name }` |
| 内存表 | `1009-1011` | `portalColoursByMap[mapId]`；`mapColours(mapId)` 取（不存在就建） |
| 装 | `1395-1396` | `portalColoursByMap[id] = {...}` 然后 **`setActiveMapColours(id)`** —— 引擎读的就是 `activePortalColours` |
| 启动恢复 | `1345` | `injectSavedLevels()` 里 `if (rec.colours) portalColoursByMap[id] = rec.colours;` |

⚠️ **仍然存在的缝合口**【源码 + 推断】：
`setActiveMapColours()` 在整个文件里**只有保存并试玩那一刻被调用（1396）**；
`injectSavedLevels()`（1338-1356）只往 `portalColoursByMap` 里填（1345），**不会**设置 active 表。
所以【推断】**下一次启动、从选关界面直接进入一个已保存关卡时**，
`activePortalColours` 可能还是空表或别的关的表 → 门会退回成"和第一个门配对"的行为。
编辑器补这一刀的位置很明确：**在进关（`loadLevel` / `enterEnterGameScene`）时按 `mapId` 调
`setActiveMapColours(mapId)`**。这一条**没有实测**（我没跑"重启后从选关页进入"的用例）。

### 6.4 颜色是**染门格自己**，不是叠标记、也不是一整条图

【实测】`docs/screenshots/50-portal-markers.json` —— 每一格门（`index` 3..8）都长这样：

```json
{ "name": "spaceTile", "frame": "default_sprite_splash", "local": [200,120], "size": [80,80],
  "colour": [149,50,255], "children": 1,
  "kids": [ { "name": "Portal", "frame": null, "local": [0,0], "size": [78,78], "colour": [178,84,255] } ] }
```

- **门格自身的颜色是 `149,50,255`**（这是引擎自己上的 `list_portal_tile`）；
- 其**子节点名叫 `Portal`**，颜色 `178,84,255`（引擎上的 `list_portal`，见 `project.js:4072-4079`）；
- 颜色**不是**叠加的标记精灵，也**不是**一整条 run 精灵 —— 之前"叠标记/染子节点/隐藏子节点
  都看不出变化"的原因就在这里（`web/custom-tab.js` @HEAD 2447-2451 的注释记了同一结论，
  实测数据见 `docs/screenshots/50-portal-markers.json`）【源码注释 + 实测】；
- 所以正确的上色方式是：把**该格 `spaceTile` 自己的 `color`**（以及它的 `Portal` 子节点）改掉 ——
  这就是 `paintPortalColours()`（@HEAD 2468-2473）在做的事，
  实测产物见 `tools/verify/out/portal-paint.json` / `docs/screenshots/50-portal-colours-fixed.png`。

实测的调色板（`web/custom-tab.js` @HEAD **1007** 的 `PORTAL_PALETTE` 与 **2462** 的 `PALETTE`，
两者数值相同；后者与 `portal-paint.json` 里量到的门色一致）【源码 + 实测】：

| 色号 | 定义 | 实测门格颜色 |
| --- | --- | --- |
| 1 红 | `cc.color(226, 64, 72)` | `226 64 72` ✅ |
| 2 绿 | `cc.color(64, 200, 96)` | （该测试关卡未用到） |
| 3 蓝 | `cc.color(64, 140, 240)` | `64 140 240` ✅ |
| 4 紫 | `cc.color(168, 88, 224)` | `168 88 224` ✅ |

---

## 7. 格子几何：格子 ↔ 世界坐标的映射来源【实测 + 源码】

### 7.1 `game_map` 下的图层（实测）

`tools/verify/out/portal-geometry.json` → `diag.mapChildren`
= `["shadow_layer", "fllor_space_layer", "tile_item_layer", "itemGroup"]`（游戏自己把 floor 拼成 `fllor`）。

| 图层 | 内容 | 实测数量（6×10 的测试关卡） |
| --- | --- | --- |
| `shadow_layer` | 每个 `> 0` 格子一块阴影 | 21 |
| `fllor_space_layer` | 每个 `> 0` 格子一块地板 | 21 |
| `tile_item_layer` | 每个"有道具/有蛇"的格子恰好一个 `spaceTile` | 9 |
| `itemGroup` | **模板节点**：`Arrow / Brick / key / Face / Prortal_out / Portal / blockbreak / lock / spaceTile`（各 1 个，`active=false`） | 9 |

### 7.2 "每格恰好一个 `spaceTile`、按扫描顺序排列"【源码 + 实测】

【源码】`addObstacle`（`project.js:4033-4038`）用 `for (var e in Level_data) for (var t in Level_data[e])`
按**行优先扫描顺序**遍历：`Head/Body` 走 `addSanke`，`Destroyable/Arrow*/Lock/Key/Portal` 走 `addTileItem`；
`addTileItem`（`project.js:4039-4043`）每次 `cc.instantiate(this.spaceTile)` 并 `parent = this.tile_item_layer`。
`addSanke`（`project.js:4092-4098`）同样把蛇格挂在 `tile_item_layer`。

【实测】测试关卡里有 9 个"道具格"（3 个蛇头 + 6 个门）→ `tile_item_layer` 正好 **9** 个子节点、
名字全是 `spaceTile`；`portal-markers.json` 给每个节点带上了 `index`：
门的 index 是 **3..8**（前 3 个 index 属于那 3 个蛇头），
格子顺序是 `[7,1] [8,1] [9,1] [1,2] [2,2] [3,2]` —— **严格的行优先扫描顺序**，
与 `itemCellList()`（`web/custom-tab.js` @HEAD 2427-2441）算出来的格子列表**逐项对齐**。

### 7.3 间距 80px 与坐标公式【源码 + 实测】

【源码】`getPositionByTile`（`project.js:4010-4013`）：

```js
var t = cc.size(MapSize.width * TileSize.width, MapSize.height * TileSize.height);
return cc.v2(e.x * TileSize.width - t.width / 2 + TileSize.width / 2,
             t.height / 2 - e.y * TileSize.height - TileSize.height / 2);
```

代入 `TileSize = 80,80`、`cols = 10`、`rows = 6` 化简便得：

```
local.x = 80*x - 80*cols/2 + 40 = 80 * (x - (cols-1)/2)
local.y = 80*rows/2 - 80*y - 40 = 80 * ((rows-1)/2 - y)
```

【实测】用 `portal-markers.json` 逐格对账（`local` 就是 `spaceTile` 相对 `game_map` 的坐标）：

| 格子 | 公式算出的 local | 实测 local |
| --- | --- | --- |
| `(7,1)` | `(200, 120)` | `(200, 120)` ✅ |
| `(9,1)` | `(360, 120)` | `(360, 120)` ✅ |
| `(1,2)` | `(-280, 40)` | `(-280, 40)` ✅ |
| `(3,2)` | `(-120, 40)` | `(-120, 40)` ✅ |

同一行相邻格 `local.x` 差 **80**（200/280/360），同一列相邻行 `local.y` 差 **80**（120/40）——
**格距 80px**，与 `TileSize` 一致。地图整体已经居中：`(x - (cols-1)/2) * 80` 意味着
**地图中心 = `game_map` 节点原点**，不需要额外平移。

### 7.4 尺寸差异（写探针时会踩）

- 门格 / 地板格：`80×80`（`project.js:4041-4042`、`4146-4147`）；
- 蛇格 / 阴影格：`80×85`（`height = TileSize.height + Border`，`project.js:4095`、`4156`）；
- `Portal` 子节点：`78×78`（`project.js:4077` 的 `s.scale = n.height / s.height`）【实测同上】。

### 7.5 `game_map` 下**没有**任何帧名含 portal 的精灵【实测】

- `probe-portal-paint.js` 收集 `game_map` 下所有精灵后筛 `/portal/i`：`portalSprites: []`；
  它看到的全部 26 个帧名里**没有一个**含 "portal"（门用的是 `BrickTile` 帧 +
  `Portal/Mask/001..004` 节点名，`itemGroup/Prortal_out` 也是节点名不是帧名）；
- 因此"靠帧名找门"是死路，只能靠**节点名含 `Portal`**（`tile_item_layer/spaceTile/Portal`）
  或按 §7.2 的**索引对齐**来找格子。

---

## 8. 背景与场景：背景由**世界**决定，不来自关卡数据

【源码】`web/src/project.js:3076-3089`（`_work/analysis/project.pretty.js:3475-3488` 同）：

```js
3076: showVignettte: function() {
3077: var e = cc.find("Content", this.vignette), t = Math.floor(getRandomInRange(1, 4));
3078: for (var i in e.children) {
3079: var n = e.children[i];
3080: n.removeAllChildren(!0);
3081: if (n.name != "vignette" + t) {
3082: var a = cc.instantiate(cc.find("vignettes/stage" + this.worldId + "_bg1", this.vignette)), o = a.children.length, c = Math.floor(getRandomInRange(1, o));
3083: for (var l in a.children) a.children[l].active = l == c - 1;
3084: a.parent = n;
```

结论：

1. 背景/暗角资源按 **`stage{worldId}_bg1`** 取 —— 只有**世界**这一层粒度，
   **没有任何逐关（per-level）的设置入口**【源码】；
2. 装饰是**随机**的：先从 4 个 vignette 槽里挑一个，再从该背景的子节点里随机激活一个
   （`getRandomInRange(1,4)` / `getRandomInRange(1,o)`）【源码】；
3. 【推断·给编辑器】"每关换背景"在当前引擎里**做不到**，只能给自定义**世界**复制一份
   `theme_cfg`（`list_background` / `list_vignette` 等，见 `docs/editor-design.md` §1），
   或者接受与所属世界一致。

### 8.1 场景名：`AnimScene` 是标题场景，`LaunchScene` 只是启动/闪屏【源码 + 实测注释】

- `web/src/settings.js:1` 里注册的场景资源：`scene/LaunchScene.fire`、`scene/gameScene.fire`、
  `scene/HallScene.fire`、`scene/AnimScene.fire`【源码】；
- `LaunchScene` 的组件逻辑最后调 `gamemain.enterAnimScene()`
  （`web/src/project.js:1047` 附近），再 `cc.director.loadScene("AnimScene")`
  （`web/src/project.js:4523-4524`）—— 即 **Launch → AnimScene**【源码】；
- `AnimScene` 的组件属性是 `beginAnimation`（"开头动画"）与 `TitleEn/TitleFT/TitleJT/TitleJp`
  （`web/src/project.js:87-111`），确认它是**标题/logo 场景**【源码】；
- 移植层也这么记：`web/wide-ui.js:400-402`
  "`LaunchScene: /Canvas/New Sprite(Splash)`（frame `launchImg`）"、
  "`AnimScene: /Canvas/begin/label/label_1..4`（frames `login_1..login_7`，标题美术）"【源码注释】。

---

## 9. 持久化现状（`web/custom-tab.js` @HEAD）

| 项 | 位置（@HEAD `eb8f8b5`） | 内容 |
| --- | --- | --- |
| 自定义关卡 | `1321` | `localStorage['maze_dash_custom_levels']` = `{ "<levelId>": { grid, colours, world, levelId, name } }`（`colours` = `{ "x,y": 色号 }`，phase 2 加的） |
| 自定义世界 | `1965` | `localStorage['maze_dash_custom_worlds']` = `{ "<worldId>": { name, base } }` |
| 关卡 id 分配 | `nextCustomLevelId()` | 从 **10000** 起，跳过 `level_cfg` / `all_Level` 里已占用的号 |
| 世界 id 分配 | `nextCustomWorldId()` | 从 **100** 起，跳过 `stage_cfg` 里已占用的号 |
| 启动注入 | `1338-1356` `injectSavedLevels()` | 把 localStorage 的记录写回 `all_Level / level_cfg / stage_level_cfg`，并把 `colours` 灌进 `portalColoursByMap[id]`（1345） |
| 保存并试玩 | `1359-1400` `saveGridAndPlay()` | 写三处 conf 表 + 持久化 + `setActiveMapColours(id)` + `enterEnterGameScene(id)` |
| 编辑器颜色表 | `1009-1011` | `portalColoursByMap` / `mapColours()` / `setActiveMapColours()`（引擎读的是 `activePortalColours`） |
| 导出 | `1814-1834` `exportCustomJson()` | 下载 `maze-dash-custom.json`，结构 `{version, note, worlds, levels, maps}`（`maps` 按 mapId 键）。⚠️ **导出里不含 `colours`**（只导了 `worlds/levels/maps`）—— 彩色门信息会丢 |
| **导入** | — | **不存在**：`editorAction`（`1836-1844`）只处理 `createWorld / previewWorld / previewLevel / exportJson / createLevel` |

【源码】注意当前实现里 **`mapId === id`**（`saveGridAndPlay` 里 `conf.all_Level[id] = copy`、
`entry.mapId = id`）。文档里的"三处写入"没错，但编辑器接自己的存储层时要明确这一点。

【实测】第一阶段编辑器的闭环数据（`docs/grid-editor-reapply.md` §D，来自 `probe-grid-editor.js`）：
20×20 = **400** 格、保存产生关卡 id **10000**、世界 **101**、自动主角落在 `(3,3)`、
进关后 `game_map` 存在且矩阵 **20×20**、`localStorage['maze_dash_custom_levels']` 有 **1** 条、报错 **0**。

---

## 10. 校验工具的真实能力（**不是解算器**）

这一条必须写清楚，否则接手的人会以为"跑一下 solver.js 就能证明我画的新关可解"。

| 工具 | 它到底做什么 | 依据 |
| --- | --- | --- |
| `tools/verify/solver.js` | puppeteer 打开真实游戏，读**当前关自己的 `sz_solution`**，用真实滑动逐步重放，并用 `checkClearSatge` 的 hook 判定是否过关 | 文件头 `1-9` 行注释 + `146-158` 行装 hook |
| `tools/verify/alllevels.js` | 不滑动，直接驱动真实 `game_map`：重建全部 290 张棋盘、灌入各自 `sz_solution`、instant 模式重放 `moveSanke()`，逐关问 `checkClearSatge()`；预期 **289/290**（mapId 5 的原版解法串本身不完整） | 文件头 `1-15` 行 + `tools/verify/README.md:22,38` |

**两者的前提都是"这一关已经有解法串"**【源码，读工具源码得出】——
对一关**新画的**地图，这套工具**证明不了可解**。

### 10.1 但编辑器后来自己加了一个解算器（工作区版本，未提交）

`web/custom-tab.js` 工作区版本里有 `solveGrid()` / `updateSolvability()`
（写这份文档时约 `1175-1310` 行；提交后行号会变，按函数名找）【源码·读工作区未提交版本】：

| 项 | 值 |
| --- | --- |
| 状态 | `(蛇头位置, 已填地板位图字符串)` |
| 动作 | 四方向冲刺（`while (guard++ < 400)` 逐格推进，箭头强制转向、门按同色配对） |
| 算法 | BFS + `visited` 去重；`SOLVER_NODE_CAP = 200000` |
| 三态 | `solvable`（搜到填满全部地板的走法，给最短步数）/ `unsolvable` / `undecided`（超节点上限，**绝不猜**） |
| 结构性判负 | `noHero` / `noFloor` / `isolatedFloor` / `disconnectedFloor`（后两个用可通行性做连通性检查） |
| 保存门禁 | `saveGridAndPlay()` 里 `unsolvable && !stats.editorForceSave` → 拒绝并提示，再点一次才强制保存；`undecided` 不拦 |
| 探针/截图 | `tools/verify/probe-editor-solver.js`、`docs/screenshots/54-editor-solvable.png`、`55-editor-unsolvable.png` |

**它不能替代真实验证**（这一条我读代码得出，**没有跑对照用例**）：

1. `solverPassable(v)` = `v === 1 || v === -1 || v === 2 || (v >= 5 && v <= 8)`
   —— **钥匙 `4`、锁 `-3`、砖块 `-4` 都被当成墙**。任何"必须从钥匙格上走过去"的关卡
   会被判 `unsolvable`【推断·假阴性】；
2. BFS 的目标位图只由 `grid[y][x] === 1 || === -1` 的格子构成（`floors`），
   而 `checkClearSatge` 要求**没有任何非 `0/-1/-2` 的格子**。
   所以含**没用到的传送门/钥匙/砖块/锁**的关卡可能被判 `solvable`，进游戏却清不了关【推断·假阳性】；
3. `solverPortalMap()` 复刻了"同色配对"，但**没有实现门的"一次性"**（§5 第 5 点）；
4. 因此这三个状态是**辅助**：`unsolvable` 不一定是真的无解，`solvable` 也不一定真能过关。
   真正确认只能靠"在游戏里走一遍"（编辑器的一键试玩 / `alllevels.js` 式重放）。

【推断】如果将来要把这个解算器变成可信的：把 `floors` 换成"**所有需要消失的格子**"
（`1/-1/4/2/-4/-3` 里当前还存在的），并把 `solverPassable` 补上 `4`（钥匙可走）
与"门用过即消失"，再让 `-4/-3` 按"可破坏/解锁后才可通行"展开成两条分支。

---

## 11. 仍是推断 / 未验证的部分（不要在文档里当事实用）

1. **3 个以上同色门的实际表现**：源码读出来是"所有门都返回扫描序最靠前的那个门"（§5），
   逻辑很直白，但**我没有在游戏里跑过 3 门对照实验**去确认"第 3 个门永远连到第 1 个"【推断】；
2. **传送门出口格的 `Port{D,U,L,R}` 标记**的作用（"不许原路撞回门里"）是从
   `checkArrow` 的返回式反推的，**没有单独实测**过"贴着出口格反向冲"的行为【推断】；
3. **锁变成地板后是否真的需要再压一次**：推导链完整（§4.1），但**没有跑一关专门验证**
   "吃完钥匙后立刻过关 vs 必须回踩锁格"【推断】；
4. **`game_map` 组件上的 `mapId` 读取时机**：phase 2 用"不读组件、从外面
   `setActiveMapColours(mapId)` 塞"绕开了（`custom-tab.js:1011/1396`）【源码】；
   但**是否所有进关路径都会塞**没有被验证 —— 见下面第 7 条；
5. **`getRandomInRange(1,4)` 的语义**（是否含 4）我没读它的实现，不影响"背景随机"这个结论【推断】；
6. 编辑器元素调色板的**具体交互设计**（面板块数、颜色选择器形态）属于产品决策，不在本文范围；
7. 【推断】**"重启后从选关界面直接进入已保存关卡"时颜色表是否装好**（§6.3 的缝合口）：
   `setActiveMapColours()` 只在保存并试玩时调用（1396），`injectSavedLevels()` 不设置 active 表。
   这一条**没有实测**（没跑"重启 → 选关页 → 进自定义关"的用例），
   但它决定"彩门在正式游玩路径上是否生效"，**建议接手的人第一个就测它**；
8. 【推断】§10.1 里编辑器解算器的**假阴性/假阳性**：结论来自读代码，
   **没有跑对照用例**（例如"放一个必须踩过去的钥匙格，看它报 solvable 还是 unsolvable"）；
9. **`web/custom-tab.js` 的行号**：这份文件每次会话都在长（phase 1 = 2519 行、
   `eb8f8b5` = 2713 行、写到这里时工作区已经 **2884** 行）。本文的行号只在标注的提交上成立，
   **一律以函数名/变量名为准**。

---

## 12. 怎么复核本文档里的每一条

```bash
# 源码层（不需要跑游戏）
#   字符表与解析：      web/src/assets/script/plug/gameconf.js:67-125
#   类型/方向常量：      web/src/assets/script/plug/tileType.js（全文 30 行）
#   双矩阵 / 过关 / 传送门：web/src/project.js:3921-3937, 4033-4098, 4485-4495
#   背景与场景：        web/src/project.js:3076-3089, 1047, 4523-4524

# 实测层（puppeteer，需要本机 Chrome；脚本顶部 CHROME 常量要按机器改）
NODE_PATH=E:\maze_dash\_work\test\node_modules node tools/verify/probe-portal-geometry.js
NODE_PATH=E:\maze_dash\_work\test\node_modules node tools/verify/probe-portal-markers.js
NODE_PATH=E:\maze_dash\_work\test\node_modules node tools/verify/probe-portal-paint.js
node tools/verify/probe-editor-tools.js    # phase 2 调色板（截图 51/52/53）
node tools/verify/probe-editor-solver.js   # 编辑器解算器的三态（截图 54/55）—— 见 §10.1 的局限
node tools/verify/alllevels.js          # 289/290，看 mapId 5 的失败是否仍是那条已知瑕疵

# 数据层
python tools/apk/pkgcheck.py            # 8 个包的编号范围/重叠/矩形
python tools/apk/levelcheck.py          # 每个世界的关卡数、地图编号覆盖、用到的字符
```
