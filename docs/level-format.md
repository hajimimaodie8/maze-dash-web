# 关卡数据格式与编辑器对接规格

> 面向「自定义关卡编辑器」。所有结论都是在**运行中的游戏里实测**得到的，不是推测。
> 配套文档：`docs/level-select.md`（选关界面如何生成、编辑器从哪接入）、
> `data/README.md`（原始包数据的完整格式与字符表）。

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

---

## 2. 字符 ↔ 数值对照（写编辑器只需这一张表）

| 字符 | 含义 | `tileType` | 可通行 | 行为 |
| --- | --- | --- | --- | --- |
| `0` | 地板 | `1` | ✅ | **必须被蛇身填满**（过关条件） |
| `W` | 墙 | `0` | ❌ | 阻挡冲刺 |
| `C` | 蛇头（出生点） | `-1` | — | 每关至少一个 |
| `B` | 可破坏砖块 | `-4` | ❌ | 正对时撞碎，之后可通行 |
| `^` `>` `V` `<` | 方向箭头 | `5` `6` `7` `8` | ✅ | 经过时强制改向；与当前方向相反则视为墙 |
| `P` | 传送门 | `2` | ✅ | 成对，进入后从另一门同方向穿出 |
| `K` | 钥匙 | `4` | ✅ | 集齐本关钥匙后所有锁消失 |
| `L` | 锁 | `-3` | ❌ | 有钥匙时可通行 |
| （运行期） | 蛇身 | `-2` | — | **只存在于运行期，不要写进关卡文件** |

- 解析时字符统一转大写，小写等价。
- **方向常量**：`Up = 1`、`Down = 2`、`Left = -1`、`Right = -2`；`Up` 即 `y - 1`。
- **过关判定** `game_map.checkClearSatge()`：每个格子都是蛇身/蛇头/墙（= 填满所有地板格）。**墙不算填充。**

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
var prefab = hallScene.StageLayerPrefab;                 // 属性名见 docs/level-select.md §1
var page = cc.instantiate(prefab);
page.parent = pagerContent;                              // 与其它页同一个 content
hallScene.initStageLayer.call(page.getComponent('StageSelectLayer'), WORLD);
// 再让 wide-ui 统一撑宽、重排、生成关卡网格
MazeDashWide.widenSelectPage();
```

`HallScene` 上确实存在 `createStageLayer` 与 `initStageLayer` 两个方法（已实测方法名存在），
但**它的参数与副作用尚未验证** —— 这是编辑器做「新建世界」前必须先钉死的一件事，
建议下一步就做：在测试里实例化一页并对新世界调 `initStageLayer`，确认页码、标题、网格都正确。

在此之前，**把自定义关卡挂到已有的世界里是已验证可行的**（§3 的①②③④在实测中全部成功写入）。

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

---

## 6. 校验清单（编辑器保存前跑一遍）

| 检查 | 为什么 |
| --- | --- |
| 每行长度一致（矩形） | 引擎按 `MapSize` 遍历，非矩形会越界 |
| 至少一个 `C`（蛇头 `-1`） | 没有出生点无法开始 |
| 不出现 `-2`（蛇身） | 它只存在于运行期 |
| 只用上表里的字符/数值 | 未知值会被当成障碍物或直接穿透 |
| `levelId` 连续 | 解锁判定是 `levelId < next` 的比较，跳号会出现"3 关解锁了、2 关还锁着" |
| 可解（能填满所有地板格） | 用现成的求解器验证，见下 |
| `sz_solution` 与地图一致 | 它就是提示内容；原包 `mapId 5` 的解法串本身就是错的 |

现成工具：

```bash
node tools/verify/solver.js 10      # 求解并验证前 10 关（含解法串比对）
node tools/verify/alllevels.js      # 全部 290 关逐个验证可解性
python tools/apk/pkgcheck.py        # 检查 8 个 package 的编号范围/重叠/矩形
python tools/apk/levelcheck.py      # 汇总每个世界的关卡数、地图编号覆盖、用到的字符
```

> 已知原版瑕疵：`mapId 5` 的 `sz_solution = "LURDRDL"` 走不通（第 4 步被自己的身体挡住），
> 该关本身可解（如 `RDLULD`）。编辑器**不要信任原版解法串**，应以求解器结果为准。

---

## 7. 编辑器界面的接入点

| 环节 | 位置 |
| --- | --- |
| 入口页（扳手标签，第 6 格） | `web/custom-tab.js` 的 `buildPlaceholderContent(view)` —— 目前放着模式选择（闯关/解锁） |
| 打开这一页 | `MazeDashCustomTab.open()`；取节点 `MazeDashCustomTab.view()` |
| 模式选择 | `MazeDashCustomTab.applyMode('progression' \| 'unlocked')`（解锁模式便于逐个调试新关卡） |
| 刷新选关界面 | `MazeDashCustomTab.refreshStagePages()` |
| 选关界面如何生成 | `docs/level-select.md` §3（按钮数量 = `conf.stage_level_cfg` 条数，网格列数由 `SV.content` 宽度算出） |

**建议的编辑器分期**（按风险从低到高）：

1. **只读浏览**：把 `conf.all_Level[mapId]` 画成网格、点格子显示 `tileType` 与含义 —— 零风险，先确认格式理解正确；
2. **改单格**：选中图块类型 → 改数组 → 用 `loadLevel` 热重载当前关卡验证；
3. **新建/保存**：接 §3 的三处写入 + §5 的 localStorage 持久化 + §6 的校验；
4. **新建世界**：接 §3 的 `conf.worlds/stage_cfg/theme_cfg` + 翻页器；
5. **导入/导出**：让关卡能离开浏览器。
