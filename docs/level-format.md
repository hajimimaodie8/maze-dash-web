# 关卡数据格式与编辑器对接规格

> 面向「自定义关卡编辑器」。每条结论都标了依据：
> **【实测】**=在运行中的游戏里量出来、**【源码】**=从本仓库移植源码读出来、
> **【推断】**=推理，**尚未验证** —— 不要把推断当事实用。
>
> 完整证据（源码行号、探针产物、复现命令、未验证清单）在
> **[level-format-research.md](level-format-research.md)**；本文只放能直接指导编辑器实现的结论。
>
> 配套文档：`docs/level-select.md`（选关界面如何生成、编辑器从哪接入）、
> `data/README.md`（原始包数据的完整格式与字符表）、
> `docs/editor-design.md`（编辑器 UI 与主题色槽）、
> `docs/grid-editor-reapply.md`（网格编辑器第一阶段的可复原清单）。

---

## 1. 关卡数据分三层，别搞混

```
① 作者层（写关卡时面对的东西）        data/package1..8.txt      纯文本、字符
        │  解析
② 配置层（关卡元数据）                data/levels.json          JSON 对象
        │  引擎启动时读入
③ 运行层（引擎真正消费的）            conf.all_Level[mapId]     二维整数数组
```

**编辑器最终要写的是 ② 和 ③**，①只是原始包里的存档形式。

### ① 作者层：`data/package1.txt` … `package8.txt`

```
#12
0,0,0,0,0
0,0,0,W,0
0,C,0,W,0
W,W,0,0,0
```

- `#N` 声明后续地图的编号（`mapId`），`N` 后可带逗号；**文件内顺序是打乱的，只认 `#N`**。
- 每行一行的格子，逗号分隔，**从上到下 = 行号递增**，行内从左到右 = 列号递增。
- 空行忽略。

### ② 配置层：`levels.json`（实测对象）

```json
"5": { "id": 5, "wordId": 1, "levelId": 5, "mapId": 5, "sz_solution": "LURDRDL" }
```

| 字段 | 实测含义 | 注意 |
| --- | --- | --- |
| `id` | 全局关卡序号（1–290） | 也是选关按钮点击事件里传的 `customEventData` |
| `wordId` | 世界编号 1–8 | **原包拼写就是 `word`，不是 `world`** |
| `levelId` | 世界内的显示序号（第 1 关 = 1） | 解锁判定按它比较，必须连续 |
| `mapId` | 指向 `conf.all_Level` 的地图编号 | 与 `id` 可以不同 |
| `sz_solution` | 解法串，字母 `U D L R` | 游戏拿它做提示（切成 3 段逐步给） |

### ③ 运行层：`conf.all_Level[mapId]`（实测形状）

```js
conf.all_Level["1"]  // => [ [ -1, 1, 1 ] ]        // 1 行 3 列
```

- **二维整数数组，行优先，`y` 向下递增**。
- 外层长度 = 行数，内层长度 = 列数；**每行长度必须一致**（矩形）。
- 实测前 40 张图用到的值：`-4 -1 0 1`；全量还包括 `2 4 5 6 7 8 -3`。

`game_map.loadLevel(worldId, mapId, cb)` 会把它**深拷贝**进运行期棋盘 `Level_data`，
按 `> 0` 的格子铺地板并生成障碍物/蛇头，记录 `MapSize = (列数, 行数)`、`TileSize = (80, 80)`。

### ③ 的补充：运行期是**双矩阵**，编辑器只写其中一个

`loadLevel` 里紧挨着出现两行【源码，`web/src/project.js:3928-3929`】：

```js
this.Level_data      = n;                  // 地形 / 规则（引擎推进时改写它）
this.Level_item_data = CloneJson(n);       // 同一份初始值，独立副本（道具的运行期状态）
```

两个矩阵**初始值完全一样**，之后被分开改写：

| 矩阵 | 引擎往里写什么 | 谁在读 |
| --- | --- | --- |
| `Level_data` | 蛇头经过的格子 → `0`；撞碎的砖 → `1`；集齐钥匙后的锁 → `1` | 过关判定、`getOutPortal`、`isAllKey` |
| `Level_item_data` | 传送门**出口格**的方向标记 `1001-1004`；拾取/解锁后清格 | `checkArrow`（能不能进）、`checkTileItem`（播特效、移除道具节点） |

- 【推断·结论】**编辑器只需要写 `Level_data` 那一个矩阵**，也就是 `conf.all_Level[mapId]`；
  不要去写 `Level_item_data`（它由引擎在 `loadLevel` 时自己克隆出来），
  也不要把运行期状态（`-2` 蛇身等）存进关卡文件。
- 【源码】顺带一个容易忽略的点：`setTiles` 对**所有 `> 0` 的值**铺地板（`web/src/project.js:4029-4032`），
  而传送门 `2`、钥匙 `4`、箭头 `5-8` 都是正数 —— 所以这些格子**自带一层地板底衬**。
  实测对账：6×10 的测试关卡里地板 `1` 有 15 格、门 `2` 有 6 格，探针量到地板层与阴影层各
  **21** 个格子（= 15 + 6）【实测，`tools/verify/out/portal-geometry.json`】。

---

## 2. 字符 ↔ 数值对照（写编辑器只需这一张表）

| 字符 | 含义 | `tileType` | 可通行 | 行为 |
| --- | --- | --- | --- | --- |
| `0` | 地板 | `1` | ✅ | **必须被蛇头/蛇身覆盖过**才满足过关条件 |
| `W` | 墙 | `0` | ❌ | 阻挡冲刺；**过关判定天然满足**（见下） |
| `C` | 蛇头（出生点） | `-1` | — | 每关至少一个（官方最多 2 个，见 `editor-design.md` §5） |
| `B` | 可破坏砖块 | `-4` | ❌ | 冲刺停下时正对则撞碎；**撞碎后变成 `1` 地板，还要再压一次** |
| `^` `>` `V` `<` | 方向箭头 | `5` `6` `7` `8` | ✅ | **只有沿箭头方向才能进入**，其它三个方向都进不去（等价于墙） |
| `P` | 传送门 | `2` | ✅ | **没有配对表**，见 §2.2；**一次性**，见 §2.3 |
| `K` | 钥匙 | `4` | ✅ | 集齐本关钥匙后所有锁消失（锁变成 `1` 地板，还要再压一次） |
| `L` | 锁 | `-3` | ❌ | 集齐钥匙后消失 |
| （运行期） | 蛇身 | `-2` | — | **只存在于运行期，不要写进关卡文件** |
| （运行期） | 门出口方向 | `1001-1004` | — | `U/D/L/R`，只出现在 `Level_item_data`，不要写进关卡文件 |

- 解析时字符统一转大写，小写等价【源码，`web/src/assets/script/plug/gameconf.js:76`】。
- **方向常量**：`Up = 1`、`Down = 2`、`Left = -1`、`Right = -2`；`Up` 即 `y - 1`。
  ⚠️ 别和格子值混：**格子里的 `-2` 是蛇身，方向里的 `-2` 是 `Right`**。
- **未知字符不会被转换**，会以原字符串留在数组里（`switch` 没有 `default`），
  运行时等于一堵墙【源码 + 推断】。编辑器必须**拒绝**表外的字符，不能"先存了再说"。
- 类型与方向常量的权威定义：`web/src/assets/script/plug/tileType.js`（全文 30 行）【源码】。

### 2.1 过关判定 `checkClearSatge()` 的精确含义【源码】

```js
// web/src/project.js:4492-4495
checkClearSatge: function() {
  for (...) for (...) if (Level_data[y][x] != kTileDataBody(-2)
                          && Level_data[y][x] != kTileDataHead(-1)
                          && Level_data[y][x] != kTileDataBlock(0)) return false;
  return true;
}
```

**判定 = 棋盘里没有任何一格的值不属于 `{0, -1, -2}`**。由此：

1. **墙 `0` 天然满足** —— 旧文档里"墙不算填充"容易读成"墙会让判定失败"，那是错的【推断·措辞纠正】；
2. 地板 `1` 必须被蛇头/蛇身压过（被改写成 `0`）才消失，这才是"填满所有地板格"的机制；
3. 等价说法：**所有非 `0/-1/-2` 的格子都必须消失** —— 没压过的地板/箭头、
   没撞碎的砖、没吃掉的钥匙、**没用过的传送门**、没解锁的锁，都会让过关判定返回假。
4. 所以"随手画一关"几乎必然无解；保存前必须校验，见 §6。

### 2.2 传送门配对规则（**反直觉，重点**）【源码】

`game_map.getOutPortal(e)` 的**全部实现**（`web/src/project.js:4485-4488`，
反编译版 `_work/analysis/project.pretty.js:5098-5104`）：

```js
for (var t in this.Level_data) for (var i in this.Level_data[t])
  if (this.Level_data[t][i] == kTileDataPortal && (i != e.x || t != e.y))
    return cc.v2(parseInt(i), parseInt(t));
return e;
```

即"**从头扫描整张图，返回遇到的第一个其它传送门**"：

- **没有配对表、没有 ID、没有颜色**；
- **2 个门**时结果符合直觉（A→B，B→A）；
- **3 个及以上**时，扫描序最靠前的那个门会成为所有门的出口（"全都连到同一个"）
  【源码 + 推断，推断部分只是把循环读成人话】；
- 找不到别的门时返回**自己**（原地不动）。

> 结论：**想让一关里有多组门，必须自己接管 `getOutPortal`**（本项目的"同色配对"就是这么做的，见 §8），
> 或者老老实实一关只用一对门。

### 2.3 门是**一次性**的：穿一次，两格都变墙【源码 + 推断】

`getStepArray` 的传送门分支（`web/src/project.js:4231-4240`）：

```js
4233: this.Level_data[n.y][n.x] = kTileDataBlock;   // 入口格 → 0
4234: n = this.getOutPortal(t);                    // 这时才找出口
4235: this.Level_data[n.y][n.x] = kTileDataBlock;   // 出口格 → 0
4239: this.Level_item_data[n.y][n.x] = a;           // 出口格打方向标记 1001-1004
```

一次穿越会**同时把入口格和出口格从 `2` 抹成 `0`**，之后 `getOutPortal` 再也找不到它们
（它只认 `== 2`）。对编辑器的两条硬约束：

1. **每个放在关卡里的门都必须被用到** —— 没用过的门格值还是 `2`，过关判定永远返回假；
2. **同一对门不能指望被穿两次** —— 第二个主角走到那里时门已经不在了（多主角关卡要按这个算门数）。

【源码注释 + 推断】测试攻关卡的设计就是"3 主角 + 3 色门、两个房间被墙完全隔开"
（`web/custom-tab.js` @HEAD 2363-2365 的注释）；按上面的规则，3 次穿越正好消耗 6 个门格，
与"可解"自洽 —— 但**没有逐帧数过门的消失过程**（见 §12）。

---

## 3. 编辑器写回契约（核心）

新建一关要同时改三处，缺一不可：

```js
var WORLD = 100;            // 自定义世界 id（见 §4）
var NEW_ID = 10001;         // 关卡数据 id
var NEW_MAP = 10001;        // 地图 id
var DISPLAY = 1;            // 世界内显示序号，必须连续

// ① 地图本体：二维整数数组（矩形，行优先，y 向下）
conf.all_Level[NEW_MAP] = [
  [-1, 1, 1, 1],
  [ 0, 0, 0, 1],
  [ 1, 1, 1, 1],
];

// ② 关卡元数据
var entry = {
  id: NEW_ID, wordId: WORLD, levelId: DISPLAY, mapId: NEW_MAP,
  sz_solution: 'RRDD',      // 建议留空或写校验过的解法
};
conf.level_cfg[NEW_ID] = entry;

// ③ 世界 → 关卡表（选关界面就是遍历它生成按钮的）
conf.stage_level_cfg[WORLD] = conf.stage_level_cfg[WORLD] || {};
conf.stage_level_cfg[WORLD][String(NEW_ID)] = entry;

// ④ 让选关界面重新生成
MazeDashCustomTab.refreshStagePages();
```

> `refreshStagePages()` 已经处理了两件游戏自己不管的事：**先清掉旧的 LevelButton 节点**
> （`updateUnlockLayer()` 不会清理，重复调用会层层叠加），再调游戏自己的
> `showLockLayer()`（它会判断该世界是锁着还是该渲染网格）。

### 三点实现提醒

1. **只写一个矩阵**：上面 ① 的 `conf.all_Level[NEW_MAP]` 就是引擎的 `Level_data`；
   `Level_item_data` 由引擎在 `loadLevel` 里自己克隆（§1 ③ 的补充），编辑器不要碰。【源码】
2. **`mapId` 和 `id` 可以不同**，但当前实现（`web/custom-tab.js` @HEAD 的 `saveGridAndPlay`）
   让它们相同（`conf.all_Level[id]` + `entry.mapId = id`）【源码】。编辑器自己选一套并写进存储格式，
   只要保证 §5 的三处引用一致即可。
3. **`sz_solution` 可以先留空**：当前实现写入的就是空串，实测能正常保存并进关游玩
   【实测，`docs/grid-editor-reapply.md` §D】。但它同时是提示内容，**不要填错的串**（见 §6 末）。

### 新建一个世界

```js
conf.worlds[WORLD]          = { id: WORLD, require: 0 };      // require = 需要多少已通关才解锁；0 = 一直开着
conf.stage_cfg[WORLD]       = { sz_title: '<本地化 id 或自定义标题>' };
conf.stage_level_cfg[WORLD] = {};
conf.theme_cfg[WORLD]       = { /* 复制某个现有世界的配色即可 */ };
```

**⚠️ 实测纠正**：只往 `conf.worlds` 里加一条**不会**让翻页器多出一页。
实测（`_work/test/inject.js`）：写入 `conf.worlds[100]` 与 `conf.stage_level_cfg[100]` 后，
翻页器仍是 **9 页 / content 6480**，`widenSelectPage()` 只会**撑宽已有页**，不会创建新页。

原因是页面来自场景里序列化的 `StageSelectLayer`（8 个）由 `HallScene.createStageLayer()` 实例化，
`conf` 只是数据来源。所以「新建世界」必须**再实例化一页**：

```js
// 实测可用的写法（docs/editor-design.md §7.1）
var page = hallScene.createStageLayer(WORLD, 8);          // 实例化一页并 initStageLayer(WORLD)
hallScene.StageSelectLayer.insertPage(page, 8);           // 插到末尾
MazeDashWide.widenSelectPage();                           // 撑宽 / 重排 / 生成关卡网格
```

> 下面这段是**已被取代**的早期思路（用 `StageLayerPrefab` + 手动 `initStageLayer.call`），
> 保留在此仅作对照 —— 新代码请用上面的 `createStageLayer` + `insertPage`：
>
> ```js
> var prefab = hallScene.StageLayerPrefab;                // 属性名见 docs/level-select.md §1
> var page = cc.instantiate(prefab);
> page.parent = pagerContent;
> hallScene.initStageLayer.call(page.getComponent('StageSelectLayer'), WORLD);
> MazeDashWide.widenSelectPage();
> ```

`HallScene` 上确实存在 `createStageLayer` 与 `initStageLayer` 两个方法。
**配方已被实测钉死**（`docs/editor-design.md` §7.1，探针 `tools/verify/probe-custom-world.js`）：

```js
hallScene.createStageLayer(stageId, index)              // 实例化一页并 initStageLayer(stageId)
hallScene.StageSelectLayer.insertPage(page, index)      // 插入整页
```

实测结果：页数 9 → **10**、翻页器 content 宽 6480 → **20480**（= 2048 × 10）、
新页 `m_stageId = 100`、关卡按钮 1 个、解锁状态正确（`require: 0`）。

**⚠️ 另一个坑**（`docs/editor-design.md` §7.2）：`hallScene.initStageLayer()`（**无参**）
是"按 `conf.stage_cfg` 重建全部页"，误调一次页数从 9 变成 **18**。
编辑器**只能**用 `createStageLayer` + `insertPage`，**绝不要**调无参的 `initStageLayer()`。

在此之前，**把自定义关卡挂到已有的世界里也是可行的**（§3 的①②③④在实测中全部成功写入）。

---

## 4. ID 分配规则（**必须遵守**，否则会串档或覆盖原版）

| 用途 | 原版占用 | 自定义建议段 |
| --- | --- | --- |
| 世界 `worldId` | 1–8 | **100 起** |
| 关卡 `id` | 1–290 | **10000 起** |
| 地图 `mapId` | 1–290 | **10000 起** |

三个理由：

1. 存档键 `getPassMaxLevelId(worldId)`、`getSkipList(worldId)`、`m_stageViewOffsetList[worldId]`
   **全部按 worldId 存**，混用会串进度；
2. `conf.all_Level` / `conf.level_cfg` 是普通对象，同号会被覆盖；
3. 原版数据要能原样保留，方便随时对照。

**本仓库现在实际在用的号**【源码 + 实测】：

| 用途 | 号 | 出处 |
| --- | --- | --- |
| 测试关卡（3 主角 + 3 色门） | 世界 **101** / 关卡 **10101** / 地图 **10101** | `web/custom-tab.js` @HEAD `var TEST_WORLD = 101, TEST_LEVEL = 10101, TEST_MAP = 10101;`（2366 行） |
| 编辑器第一阶段"保存并试玩" | 第一个关卡 id = **10000**，默认挂到世界 **101** | `nextCustomLevelId()`（1160-1164）从 10000 起跳过已占用号；`saveGridAndPlay()`（1186-1288）；实测见 `docs/grid-editor-reapply.md` §D |
| 新建世界 | 从 **100** 起跳过已占用号 | `nextCustomWorldId()`（1783-1787） |

编辑器接自己的一套编号时，**沿用这两个起点**即可（100 / 10000），不要另起炉灶。

---

## 5. 持久化设计（浏览器里存不下文件，这是编辑器必须解决的事）

浏览器不能写 `web/res/`，所以自定义关卡必须**存在客户端并在启动时重新注入**：

```js
// 结构建议
{
  "version": 1,
  "worlds": { "100": { "title": "...", "theme": {...}, "require": 0 } },
  "levels": [
    { "id": 10001, "worldId": 100, "levelId": 1, "mapId": 10001,
      "sz_solution": "RRDD", "grid": [[...], ...] }
  ]
}
```

- 存 `localStorage` 即可（单关几十个整数，290 关全自定义也就几百 KB）；
  若要存大量关卡再考虑 `IndexedDB`。
- **注入时机**：必须在 `HallScene` 生成世界页之前完成，即 `conf` 就绪后、`createStageLayer` 之前。
  稳妥做法是挂在 `EVENT_GAME_INITED`（`clean-mode.js` / `custom-tab.js` 已经在用这个时机）。
- 注入完再调一次 `refreshStagePages()` 让选关界面反映出来。
- 建议同时提供**导出/导入 JSON**（把上面那份结构下载成文件 / 粘贴导入），
  这样关卡能离开浏览器、也能进版本库。

### 已落地的部分（现状，接手前先看这张表）【源码，`web/custom-tab.js` @HEAD】

| 项 | 位置（@HEAD `eb8f8b5` 行号；行号会漂，按函数名找） | 实际内容 |
| --- | --- | --- |
| 自定义关卡 | `1321` | `localStorage['maze_dash_custom_levels']` = `{ "<levelId>": { grid, colours, world, levelId, name } }`；`colours` = `{ "x,y": 色号 }`，是 phase 2 为彩色门加的 |
| 自定义世界 | `1965` | `localStorage['maze_dash_custom_worlds']` = `{ "<worldId>": { name, base } }`（`base` 是 HSVA 主题色） |
| 启动注入 | `1338-1356` `injectSavedLevels()` | 把记录写回 `all_Level / level_cfg / stage_level_cfg` 三处，并把 `colours` 灌进 `portalColoursByMap[id]`（1345） |
| 保存并试玩 | `1359-1400` `saveGridAndPlay()` | 写三处 conf 表 → 持久化（含 `colours`，1385）→ `setActiveMapColours(id)`（1396）→ `enterEnterGameScene(id)` 直接进关 |
| 编辑器颜色表 | `1009-1011` | `portalColoursByMap` / `mapColours(mapId)` / `setActiveMapColours(mapId)`；引擎读的是 `activePortalColours`（§8.5） |
| **导出** | `1814-1834` `exportCustomJson()` | 下载 `maze-dash-custom.json`，结构 `{ version, note, worlds, levels, maps }`，其中 `maps` 按 **mapId** 键。⚠️ **不含 `colours`** —— 导出的关卡会丢掉门的颜色 |
| **导入** | — | **未实现**：`editorAction`（`1836-1844`）只认 `createWorld / previewWorld / previewLevel / exportJson / createLevel` |

> ⚠️ 上面的「结构建议」（`{version, worlds, levels:[...]}`）与实际落地结构**字段名不同**：
> 实际存的是"键为 id 的字典"，关卡记录里字段是 `grid / world / levelId / name`。
> 接手编辑器时**以实际结构为准**，或趁改造时统一成建议结构（导出/导入两边要一起改）。

【实测】第一阶段闭环的数字（`docs/grid-editor-reapply.md` §D）：20×20 = 400 格、
保存得到关卡 id **10000**、世界 **101**、自动主角落在 `(3,3)`、进关后矩阵 20×20、
`localStorage['maze_dash_custom_levels']` 有 1 条、报错 0。

---

## 6. 校验清单（编辑器保存前跑一遍）

| 检查 | 为什么 |
| --- | --- |
| 每行长度一致（矩形） | 引擎按 `MapSize` 遍历，非矩形会越界 |
| 至少一个 `C`（蛇头 `-1`） | 没有出生点无法开始 |
| 不出现 `-2`（蛇身）与 `1001-1004` | 只存在于运行期/`Level_item_data` |
| 只用 §2 表里的字符/数值 | 未知字符会原样留在数组里，运行时等于一堵墙【源码 + 推断】 |
| `levelId` 连续 | 解锁判定是 `levelId < next` 的比较，跳号会出现"3 关解锁了、2 关还锁着" |
| **传送门 ≤ 2 个** | 3 个以上会全部连到扫描序最靠前的那个（§2.2），除非自己接管 `getOutPortal` |
| **每个门都必须用得上** | 没用过的门格值仍是 `2`，过关判定永远为假（§2.3） |
| **钥匙/锁/砖要留出回踩路线** | 锁和砖被消除后变成 `1` 地板，必须再被压一次才算填满（§2.1 第 3 点） |
| 可解（能填满所有地板格） | 编辑器的 `solveGrid()` 会给三态判定（§6 末），但**有假阴性/假阳性**；真正确认要在游戏里走一遍 |
| `sz_solution` 与地图一致 | 它就是提示内容；原包 `mapId 5` 的解法串本身就是错的 |

### ⚠️ `tools/verify/solver.js` **不是**解算器【源码，读工具源码得出】

| 工具 | 它到底做什么 |
| --- | --- |
| `node tools/verify/solver.js 10` | puppeteer 打开**真实游戏**，读当前关**自己的 `sz_solution`**，用真实滑动逐步重放，并用 `checkClearSatge` 的 hook 判定是否过关 |
| `node tools/verify/alllevels.js` | 不滑动：重建全部 290 张棋盘，灌入各自 `sz_solution`，instant 模式重放 `moveSanke()`，逐关问 `checkClearSatge()`。预期 **289/290**（`mapId 5` 是已知瑕疵） |
| `python tools/apk/pkgcheck.py` | 检查 8 个 package 的编号范围/重叠/矩形 |

---

## 7. 求解器建模需要的三条规则（**源码确认**，@HEAD `aed5abd`）

本节把 §12 里原本标为【推断】的第 2、3 条**升级为源码确认**（行号均指 `web/src/project.js`），
供 `solveGrid()` 补齐模型时直接照写；方向仍是**保守**：宁可 `undecided`，绝不假称可解。

### 7.1 砖块（`-4`，`kTileDataDestroyable`）撞碎后变地板
`moveSanke()` 的移动回调里（`4271-4291`）：

```js
var l = h.getNextTile(i, e);                       // 蛇头下一步将去的格子
if (h.Level_data[l.y][l.x] == tileType.kTileDataDestroyable) {
    h.TileItems[l.y][l.x].removeFromParent(!0);
    h.addTileAt(l);
    h.Level_data[l.y][l.x] = tileType.kTileDataSpace;   // 立刻变成「空格」= 地板 1
    ...砖块碎裂特效 + sfx_gply_snake_hit_brick...
    a++;                                                // 这一拍记作"移动过"
}
```

- 判定对象是**蛇头下一步要进的格子**，不是当前格；
- 撞上后砖块**同一拍**变成 `kTileDataSpace`（= `1` 地板）；
- **蛇头这一拍不进入该格**（它停在原地）→ **必须下一拍再压一次**才算填格；
- `a++`：这一拍算作有效移动（不是"撞墙不动"）。

### 7.2 钥匙与锁（`4` / `-3`）：**集齐全部钥匙**才一次性全开
`checkTileItem()` 的钥匙分支（`4426-4442`）+ `unLock()`（`4445-4457`）：

```js
} else if (a == tileType.kTileDataKey) {
    ...
    this.Level_item_data[e.y][e.x] = tileType.kTileDataSpace;   // 钥匙物品被吃掉
    this.unLock(1);
}
...
unLock: function (e) {
    if (this.isAllKey()) {                                      // ← 必须集齐全部
        for (var t in this.Level_data)
            ... this.Level_data[t][i] == kTileDataLock && (this.Level_data[t][i] = kTileDataSpace);
        ... 同时清 Level_item_data 里的锁 ...
    }
}
```

- **不是"一把钥匙开一把锁"**，而是 **`isAllKey()` 为真时，把全部 `kTileDataLock` 一次性变成地板**；
- 锁格在开启前**不可穿越**；开启后变成 `1`，**仍需再被压一次**才算填满（与 §2.1 第 3 点一致）。

### 7.3 传送门出口方向：由**出口瓦片类型**决定
`checkTileItem()` 的门分支（`4385-4391`）：

```js
if (a == kTileDataPortal || a == kTileDataPortU || a == kTileDataPortD || a == kTileDataPortL || a == kTileDataPortR) {
    var o = cc.instantiate(this.Prortal_out);
    ... i == DirectionUp ? o.rotation = 180 : ...        // 先按进入方向摆
    a == kTileDataPortU ? o.rotation = -180 :            // 再按出口瓦片类型覆盖
    a == kTileDataPortD ? o.rotation = 180 :
    a == kTileDataPortL ? o.rotation = -90 :
    a == kTileDataPortR && (o.rotation = 90);
    ...
}
```

- 出口格是 **`kTileDataPortU/D/L/R`**（= §2 表里的 `1001-1004`）时，**出口方向写在该格类型里**，
  并且**覆盖**按进入方向推出的默认朝向 → 这就是"不许原路撞回"的机制；
- 建模时：穿过门后应把蛇头方向设为**出口瓦片类型对应的方向**，并禁止下一步直接反向撞回；
- 箭头（`4397-4425`）同理：**改写移动方向**（`i = Direction.X`）后继续冲刺。

### 7.4 「说可解 → 真引擎回放 → 断言过关」的现成骨架
健全性校验**不需要新写引擎**，工作区已有两条现成路径：

| 工具 | 能做什么 | 复用方式 |
| --- | --- | --- |
| `tools/verify/solver.js <mapId>` | 打开**真实游戏**，读该关 `sz_solution`，用**真实滑动**逐步重放，并以 `checkClearSatge` hook 判定 | 若求解器给出的走法串能编码成滑动序列，可直接照它的重放方式验证 |
| `tools/verify/alllevels.js` | **不滑动**：重建全部 290 张棋盘、灌入各自 `sz_solution`、instant 模式重放 `moveSanke()`、逐关问 `checkClearSatge()`（预期 289/290，`mapId 5` 是已知瑕疵） | **首选**：把"求解器解出的棋盘 + 走法串"喂进 instant 重放，直接问 `checkClearSatge()` 是否过关 |

**注意**（踩过的坑）：在关卡内再调 `enterEnterGameScene` **不会重新初始化关卡** → 要重复验证必须**每次全新加载页面**；
另：无答案的走法串**不能**用 `sz_solution` 冒充（那只是提示串，原包 `mapId 5` 的本身就是错的）。
| `python tools/apk/levelcheck.py` | 汇总每个世界的关卡数、地图编号覆盖、用到的字符 |

**两者的前提都是"这一关已经有解法串"**，所以这套工具**证明不了新画的关可解**。

### 编辑器自己带的解算器（phase 2 之后加的，**当时还没提交**）

`web/custom-tab.js` 里已经有 `solveGrid()` / `updateSolvability()`（工作区版本，
写这份文档时约 `1175-1310` 行）【源码·读工作区未提交版本】：

- 状态 = `(蛇头位置, 已填地板位图)`，动作 = 四方向冲刺，BFS；
- **三态，不撒谎**：`solvable`（真的搜到一条填满全部地板的走法，并给最短步数）、
  `unsolvable`（结构性不可能：无主角 / 无地板 / 孤立地板 / 地板分区不连通，或搜索内无解）、
  `undecided`（超过 **200000** 节点上限，绝不猜）；
- 保存门禁：`unsolvable` 时**第一次点保存会被拒**（状态栏追加"仍要保存"提示），
  再点一次才强制保存；`undecided` 不拦。
- 复核工具：`tools/verify/probe-editor-solver.js` +
  `docs/screenshots/54-editor-solvable.png`、`55-editor-unsolvable.png`。

**已知局限**【源码 + 推断，**这一段很重要**】：

1. `solverPassable(v)` 只认 `1 / -1 / 2 / 5-8` —— **钥匙 `4`、锁 `-3`、砖 `-4` 都当墙**。
   → 【推断】任何"必须从钥匙格上走过去"的关卡会被判 `unsolvable`（**假阴性**），
   但那关在游戏里可能是可解的；
2. BFS 的目标位图**只统计 `1` 和 `-1`**，而 `checkClearSatge` 要求
   "没有任何非 `0/-1/-2` 的格子"（§2.1）。
   → 【推断】含**没用到的传送门/钥匙/砖块/锁**的关卡，可能被判 `solvable`，
   进游戏却清不了关（**假阳性**）；
3. 门按"同色配对"处理（`solverPortalMap`），与 §8.2 的运行时规则一致，
   但**没有实现门的"一次性"**（§2.3）—— 只要路径里用得对，结论通常仍成立，但别把它当证明。

> 结论：**这套三态判定是"辅助"，不是"证明"**。真正要确认一关能过，
> 仍然要在游戏里走一遍（用 §7 的编辑器闭环或 `alllevels.js` 那种重放方式）。

> 已知原版瑕疵：`mapId 5` 的 `sz_solution = "LURDRDL"` 走不通（第 4 步被自己的身体挡住），
> 该关本身可解（如 `RDLULD`）。编辑器**不要信任原版解法串**；能确认它的只有
> `alllevels.js` 这种"灌进真引擎重放"的手段（它是重放器，不是求解器，见上表）。

---

## 7. 编辑器界面的接入点

| 环节 | 位置 |
| --- | --- |
| 入口页（扳手标签，第 6 格） | `web/custom-tab.js` 的 `buildPlaceholderContent(view)`；phase 2 起它已经是**编辑器首页**（新建世界 / 新建关卡 / 预览 / 导出 JSON） |
| 打开这一页 | `MazeDashCustomTab.open()`；取节点 `MazeDashCustomTab.view()` |
| 进入网格编辑器 | `editorAction('createLevel')` → `openGridEditor()`；句柄 `MazeDashCustomTab.gridEditor`（`grid / cells / colours / save / close`） |
| 模式选择 | `MazeDashCustomTab.applyMode('progression' \| 'unlocked')`（解锁模式便于逐个调试新关卡） |
| 刷新选关界面 | `MazeDashCustomTab.refreshStagePages()` |
| 选关界面如何生成 | `docs/level-select.md` §3（按钮数量 = `conf.stage_level_cfg` 条数，网格列数由 `SV.content` 宽度算出） |

**编辑器分期与现状**（按风险从低到高；✅ = 已实现）：

| # | 分期 | 现状 |
| --- | --- | --- |
| 1 | **只读浏览**：把 `conf.all_Level[mapId]` 画成网格、显示 `tileType` 与含义 | ✅ 网格 + 读数 + 状态栏 |
| 2 | **改单格**：选图块 → 改数组 → 热重载验证 | ✅ 11 个元素的调色板（§11） |
| 3 | **新建/保存**：§3 的三处写入 + §5 的持久化 + §6 的校验 | ✅ 保存并试玩闭环；校验见 §6（含已知局限） |
| 4 | **新建世界**：`conf.worlds/stage_cfg/theme_cfg` + 翻页器 | ✅ 配方已实测（§3 末） |
| 5 | **导入/导出**：让关卡能离开浏览器 | 导出 ✅ / **导入未实现**（§5） |

---

## 8. 彩色传送门扩展（本项目自己加的能力）

起因是 §2.2：原版没有配对表，一关只能有一对门。本项目在**不关卡数据值**的前提下支持了多组同色门。

### 8.1 颜色必须放**旁表**，绝不能编进格子值【源码 + 实测（踩过的坑）】

- **坑**：早期方案用 `20 + 颜色序号`（`21/22/23`）表示彩色门 ——
  **渲染器根本不画门**。`addTileItem` 的分支是 `t == kTileDataPortal(2)`
  （`web/src/project.js:4072`），21/22/23 匹配不到任何分支，格子就只剩一块地板底衬。
- **正确做法**：格子值**保持 `2`**，颜色存在旁表里 ——
  当前实现是**按地图分级**的 `portalColoursByMap[mapId]`，引擎运行时读的是
  `activePortalColours`（`web/custom-tab.js` @HEAD `1007-1011`、`2406-2416`；详见 §8.5）。

### 8.2 配对：在**实例级**包装 `getOutPortal`【源码】

`web/custom-tab.js` @HEAD 的 `patchPortalPairing()`（`2487-2511`）在 `game_map` 组件实例上
覆盖 `getOutPortal`，规则是：**同色才配对；没有同色伙伴就返回自身坐标（原地不动）**。
这是"3 个以上门不再全连到一起"的实现方式（对照 §2.2 的原版行为）。

### 8.3 颜色染的是**门格自己**，不是叠标记、也不是一整条 run【实测】

量到的门格结构（`docs/screenshots/50-portal-markers.json`，每个门格都一样）：

```jsonc
{ "name": "spaceTile", "size": [80,80], "colour": [149,50,255],   // ← 门格自身的颜色
  "kids": [ { "name": "Portal", "size": [78,78], "colour": [178,84,255] } ] }   // ← 子节点 "Portal"
```

- 引擎**自己**就把门格涂成 `149,50,255`、把子节点 `Portal` 涂成 `178,84,255`
  （来自 `theme_cfg` 的 `list_portal_tile` / `list_portal`，`web/src/project.js:4072-4079`）；
- 屏幕上那条彩色带**就是这个 tile 自身的颜色** —— 不是叠加的标记精灵、也不是一整条 run 精灵。
  之前"叠标记 / 染子节点 / 隐藏子节点都看不出变化"的原因就在这里
  （`web/custom-tab.js` @HEAD `2447-2451` 的注释记了同一结论）；
- 所以上色的正确做法是：改**该格 `spaceTile` 的 `color`**（以及它的 `Portal` 子节点）——
  就是 `paintPortalColours()` 里 `tiles[i].color = PALETTE[col]`（@HEAD `2468`）那两行。
- **找格子的办法**：`tile_item_layer` 下每个道具格恰好一个 `spaceTile`，按**网格扫描顺序**排列
  （见 §9），索引与"有道具的格子列表"逐项对齐；门格的子节点**名叫 `Portal`**。
  ⚠️ **没有任何帧名含 `portal`**（实测：`game_map` 下命中 `/portal/i` 的精灵数为 **0**），
  靠帧名找门是死路。

### 8.4 调色板（4 色；红 / 蓝 / 紫已实测可见）【源码 + 实测】

| 色号 | 颜色 | 备注 |
| --- | --- | --- |
| 1 | 红 `cc.color(226,64,72)` | 实测门色 `226 64 72` |
| 2 | 绿 `cc.color(64,200,96)` | 测试关卡未用到，未在上色产物里出现 |
| 3 | 蓝 `cc.color(64,140,240)` | 实测门色 `64 140 240` |
| 4 | 紫 `cc.color(168,88,224)` | 实测门色 `168 88 224` |

### 8.5 旁表的键：**已按 mapId 分级**（phase 2 / `eb8f8b5` 落地）

phase 1 曾经踩过的坑是"按 mapId 分级取不到键"（`game_map` 组件不暴露 mapId），
phase 2 的解法是**不读组件、从外面塞**【源码，`web/custom-tab.js` @HEAD】：

| 环节 | 行号 | 做什么 |
| --- | --- | --- |
| 内存表 | `1009-1011` | `portalColoursByMap[mapId]`；`mapColours(mapId)`；`setActiveMapColours(mapId)` 把引擎真正读的 `activePortalColours` 指向该表 |
| 存 | `1385` | 保存关卡时把编辑器的颜色表写进 localStorage 记录：`{ grid, colours, world, levelId, name }` |
| 装 | `1395-1396` | 保存并试玩时 `portalColoursByMap[id] = {...}` + `setActiveMapColours(id)` |
| 启动恢复 | `1345` | `injectSavedLevels()` 里 `if (rec.colours) portalColoursByMap[id] = rec.colours;` |

⚠️ **仍然存在的缝合口**【源码 + 推断，**未实测**】：
`setActiveMapColours()` 在整个文件里**只有保存并试玩那一刻被调用**（`1396`）；
`injectSavedLevels()` 只往 `portalColoursByMap` 里填，**不设置 active 表**。
所以**下一次启动、从选关界面直接进入已保存关卡时**，
`activePortalColours` 可能还是空表 → 彩门退回"和第一个门配对"的行为。
补法很明确：**在进关路径上按 `mapId` 调一次 `setActiveMapColours(mapId)`**。
这是接手的人应该**第一个去测**的用例（"重启 → 选关页 → 进自定义关 → 门颜色对不对"）。

另外：**导出 JSON 不含 `colours`**（§5 的表），所以经导出/导入往返的关卡会丢颜色，改导入时一并补上。

---

## 9. 格子几何：格子 ↔ 世界坐标的映射来源【实测 + 源码】

写"点击格子 → 定位到游戏里的门"这类交互时，用得上这一节。

### 9.1 `game_map` 下的图层【实测】

`shadow_layer`（阴影）、`fllor_space_layer`（地板，游戏自己把 floor 拼成 `fllor`）、
`tile_item_layer`（道具/蛇）、`itemGroup`（模板节点）。
实测某个 6×10 的测试关卡：阴影 **21** / 地板 **21** / `tile_item_layer` **9**。

### 9.2 每个道具格恰好一个 `spaceTile`，按**扫描顺序**排列【源码 + 实测】

`addObstacle` 按 `for (var e in Level_data) for (var t in Level_data[e])`（= 行优先扫描）遍历：
蛇头/蛇身走 `addSanke`，砖/箭头/锁/钥匙/门走 `addTileItem`，两者都在
`tile_item_layer` 下 `instantiate(this.spaceTile)`（`web/src/project.js:4033-4043`、`4092-4098`）。
所以**顺序 = 从 `(0,0)` 开始的行优先扫描顺序**，实测 9 个道具格 ↔ 9 个 `spaceTile`（含 3 个蛇头格），
门的索引是 3..8。

### 9.3 间距 **80px**，坐标公式如下【源码 + 实测对账】

`getPositionByTile`（`web/src/project.js:4010-4013`），代入 `TileSize = 80`：

```
local.x = 80 * (x - (列数-1)/2)      // 地图中心 = game_map 节点原点
local.y = 80 * ((行数-1)/2 - y)      // y 向下
```

实测对账（`docs/screenshots/50-portal-markers.json`，10 列 6 行的关卡）：

| 格子 | 公式 | 实测 |
| --- | --- | --- |
| `(7,1)` | `(200, 120)` | `(200, 120)` ✅ |
| `(1,2)` | `(-280, 40)` | `(-280, 40)` ✅ |

同一行相邻格差 80、同一列相邻行差 80 —— **格距就是 `TileSize` = 80px**。
尺寸细节：门格/地板格 `80×80`，蛇格/阴影格 `80×85`（多了 `Border`），`Portal` 子节点 `78×78`。

---

## 10. 背景与场景：背景由**世界**决定，不能逐关设置【源码】

`showVignettte()`（`web/src/project.js:3076-3089`）用
`vignettes/stage{worldId}_bg1` 取背景，再从 4 个槽里随机挑一个、并从该背景的子节点里随机激活一个
（`getRandomInRange(1,4)`）。也就是说：

- 背景只有**世界**这一层粒度，**没有逐关入口**；
- 装饰是**随机**的，同一关两次进入也可能不同；
- 【推断·给编辑器】"每关换背景"在当前引擎里做不到，只能给自定义**世界**复制/改 `theme_cfg`
  （颜色槽清单见 `docs/editor-design.md` §1）。

**场景名别搞混**【源码 + 移植层注释】：

| 场景 | 是什么 |
| --- | --- |
| `LaunchScene` | 启动/闪屏（`/Canvas/New Sprite(Splash)`，frame `launchImg`），逻辑末尾转 `AnimScene` |
| `AnimScene` | **标题场景**（组件属性是 `beginAnimation` 与 `TitleEn/TitleFT/TitleJT/TitleJp`；`/Canvas/begin/label/label_1..4` 就是标题美术） |
| `HallScene` | 大厅/选关 |
| `gameScene` | 关卡内（`game_map` 组件在 `Canvas/backgroup/game_map`） |

---

## 11. 编辑器元素调色板（phase 2 / `eb8f8b5` 已实现；这里是规格与对照）

**本节只写文档，不动代码。** 下面这张表是"工具 → 写入值 → 用哪个主题槽"的对照，
实现落在 `web/custom-tab.js` 的 `TOOLS` / `editorTool` / `editorColours` / `applyToolToCell`
（@HEAD `1012-1081`）【源码】：

| 工具 | 写入值 | 颜色来源（主题槽） | 编辑器要提醒用户的事 |
| --- | --- | --- | --- |
| 地板 | `1` | `list_floor` | 每一格都必须被压过，是"可解"的约束来源 |
| 墙 | `0` | 底色 | 墙天然满足过关条件，可放心画 |
| 主角 | `-1` | `list_character` / `list_character_Face` | 至少一个；多主角是原版机制（世界 5 全是双主角） |
| 砖块 | `-4` | `list_brick` / `list_brick_tile` | 撞碎后变成地板，需要回踩 |
| 钥匙 | `4` | `list_key` | 收齐所有钥匙才解锁；1 号世界里 `list_key` 是透明的 `[0,0,0,0]` |
| 锁 | `-3` | `list_lock` | 解锁后变成地板，需要回踩 |
| 箭头 ↑→↓← | `5` `6` `7` `8` | `list_arrow` / `list_arrow_tile` | **只有沿箭头方向能进**，其它方向等于墙 |
| 传送门 | `2` + 旁表颜色 | `list_portal` / `list_portal_tile` | 原版一关只能一对门；彩色门要配旁表（§8）；**每个门都必须被用到** |
| （不提供） | `-2` / `1001-1004` | — | 运行期专用，调色板里不该出现 |

实现细节（方便接手时对账）【源码，@HEAD】：

- `TOOLS`（`1012-1024`）共 **11 个工具**：`floor / wall / hero / brick / key / lock / up / right / down / left / portal`；
- `PORTAL_PALETTE`（`1007`）**4 色**，`PORTAL_COLOUR_ORDER = [4, 1, 3, 2]`（紫 / 红 / 蓝 / 绿），
  默认选中的是 **4 号紫**（`editorTool.portalColour = 4`，`1025`）；
- 颜色**只在工具是传送门时**被记录：`applyToolToCell()` 里
  `if (v === 2) editorColours[key] = editorTool.portalColour; else delete editorColours[key];`（`1070`）
  —— 也就是说**改掉门格会把该格的颜色一起删掉**，不会留下脏数据；
- 每笔操作同时写两处：`cell.__value`（绘制用）与 `ed.grid[gy][gx]`（保存路径读的），
  漏掉后者会"画得对、存出来是空矩阵"（`1074-1079` 的注释就是记这件事）；
- 保存时颜色随关卡一起落盘（§5 的 `colours` 字段）。

---

## 12. 仍未验证 / 属于推断的部分（**不要当事实用**）

1. 【推断】**3 个以上同色门**在游戏里的实际表现。源码读出来是"所有门都返回扫描序最靠前的那个"（§2.2），
   逻辑很直白，但**没有跑过 3 门对照实验**去确认；
2. 【推断】传送门**出口格方向标记**（`1001-1004`）的作用是"不许原路撞回门里"，
   这是从 `checkArrow` 的返回式反推的，**没有单独实测**过"贴着出口格反向冲"的行为；
3. 【推断】"锁/砖清掉后必须再压一次"这条推导链完整（§2.1 第 3 点），
   但**没有专门跑一关**验证"吃完钥匙后立刻过关 vs 必须回踩"；
4. 【部分源码、部分推断】`game_map` 组件的 `mapId` 读取时机问题（§8.5）：
   只确认了 `loadLevel` 会把 mapId 写进组件（`web/src/project.js:3923`），
   没确认"什么时候读不到"；
5. 【推断】未识别字符"运行时等于一堵墙"（§2 的注意事项）—— 由 `switch` 无 `default` +
   `getStepArray` 无匹配分支推出，**没有实测**；
6. `getRandomInRange(1,4)` 是否含 4 未读实现（不影响"背景随机"这个结论）；
7. 编辑器元素调色板的**具体交互形态**（按钮布局、颜色选择器）属于产品决策，不在本文范围；
8. 【推断】**重启后从选关界面直接进入已保存关卡时，彩色门的颜色表是否装好**（§8.5 的缝合口）。
   `setActiveMapColours()` 只在"保存并试玩"时调用，`injectSavedLevels()` 不设置 active 表 ——
   这一条**没有实测**，但它决定彩门在正式游玩路径上是否生效，**建议第一个测它**；
9. 【源码 + 推断】编辑器 `solveGrid()` 的**假阴性/假阳性**（§6 末的"已知局限"）：
   结论来自读工作区代码，**没有跑对照用例**（例如"放一个必须踩过去的钥匙"看它报什么）。

详细的证据、源码片段、探针产物路径与复核命令，见
**[level-format-research.md](level-format-research.md)**。
