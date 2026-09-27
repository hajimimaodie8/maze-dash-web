# 选关界面（StageSelect / 世界与关卡）实现说明

> 用途：为「自定义关卡编辑器」打基础。下面全部是对原版代码的**实测结论**，
> 标注了行号（`_work/analysis/project.pretty.js`，即 `web/src/project.js` 的美化版）。
> 编辑器打算做的事：(a) 自定义大关；(b) 新建世界；(c) 在新世界里加小关并逐个编辑。
> 这一页说明**数据挂在哪、界面怎么生成、在哪里插新的东西**。

---

## 1. 对象结构（从外到内）

```
HallScene
├── Canvas/gameView/scrollView            ← SelectStagePageView（世界的横向翻页器）
│   └── view/content                      ← content 宽 6480 = 9 × 720
│       ├── StageSelectLayer  (世界 1)     ← 每个世界一页，共 8 个
│       ├── StageSelectLayer  (世界 2)
│       ├── ...                            ← 由 StageLayerPrefab 实例化
│       └── StageSelectLayer  (世界 8)
└── Canvas/bottom/tabBar                   ← 底部标签栏（我们已改成 5 格）
```

每个 `StageSelectLayer` 内部（属性定义见 L2366-2415）：

| 属性 | 类型 | 作用 |
| --- | --- | --- |
| `BgLayer` | Node | 背景层，按世界主题染色 |
| `Title` | Label | 世界标题（`LocalizedLabel.dataID`，取 `conf.stage_cfg[id].sz_title`） |
| `LeftButton` / `RightButton` | cc.Button | 上/下世界箭头（命中区我们已收到 80×900） |
| `LockLayer` | Node | **未解锁**时显示的锁层（含 `LockSprite`、`Condition/Sprite`+`Label`） |
| `SelectLayer` | Node | **已解锁**时的容器 |
| `SelectLevelLayer` | Node | 关卡按钮的父节点（小关网格） |
| `LevelBtnPrefab` | Prefab | 关卡按钮预制件（实例化源） |
| `SV` | cc.ScrollView | 该世界的纵向滚动（关卡多时滚动） |
| `m_stageId` | Number | 该页对应的**世界 id** |

## 2. 生命周期

```
initStageLayer(worldId)        L2418   记下 worldId → 两个层都关掉 → showLockLayer()
  └── showLockLayer()          L2427   用 conf.worlds[worldId].require 与
                                        gamemain.getPassLevelCount() 比较：
                                        · 差 n 关 → 显示 LockLayer（"还差 n 关"，L2443）
                                        · 够了   → updateUnlockLayer()
        └── updateUnlockLayer() L2448  显示 SelectLayer，染色、写标题，
                                        然后**生成所有关卡按钮**（L2461-2514）
```

## 3. 关卡按钮是怎么生成出来的（核心，L2461-2514）

```js
var stageLevels = conf.stage_level_cfg[worldId];          // 该世界的关卡表
var next       = gamemain.getPassMaxLevelId(worldId) + 1; // 下一关可玩
var skipList   = gamemain.getSkipList(worldId);

for (var k in stageLevels) {
    var levelId = stageLevels[k].levelId;                 // 显示用编号
    var btn = cc.instantiate(this.LevelBtnPrefab);         // 一个按钮一个实例
    btn.parent = this.SelectLevelLayer;

    // 三态着色：下一关 / 已通关 / 未解锁
    if (levelId == next || skipList[levelId] == 1) { colors = theme.list_level_next;     }
    else if (levelId < next)                       { colors = theme.list_level_complete; }
    else                                            { colors = theme.list_level_disabled; }
    setNodeColorForHSVA(btn, colors);

    // 按钮里的 "Level" 子节点显示编号
    var label = btn.getChildByName("Level");
    setNodeColorForHSVA(label, numColor);
    label.getComponent(cc.Label).string = levelId;

    // 点击事件：直接用 cc.Component.EventHandler 绑到 StageSelectLayer 上
    var handler = new cc.Component.EventHandler();
    handler.target          = this.node;
    handler.component       = "StageSelectLayer";
    handler.customEventData = stageLevels[k].id;           // ★ 传的是关卡的数据 id
    handler.handler         = (levelId <= next) ? "clickEnterGame" : "notEnterGame";
    btn.getComponent("LevelButton").clickEvents.push(handler);
}
```

要点：

1. **按钮数量 = 数据条数**，没有分页概念 —— 关卡多就靠 `SV` 纵向滚动。
2. **`customEventData` 是关卡的「数据 id」（`id`），不是显示编号（`levelId`）**。
   两者可以不同，这是接编辑器时最关键的一点。
3. 网格排布是算出来的（L2503-2507）：
   `列数 = floor(SV.content.width / 按钮宽)`，`行数 = ceil(关卡数 / 列数)`，
   然后 `SV.content.height = 按钮高 × 行数`。所以**按钮尺寸变了要重算 content**。
4. 打开时的滚动位置：有记忆就滚回 `gamemain.m_stageViewOffsetList[worldId]`，
   否则滚到「下一关」所在的页（L2508-2514，每页 7 行）。
5. 按钮组件 `LevelButton`（L1176-1222）：`m_pressedColor` 按压色、
   `m_isPlayClick` 是否播放点击音；**未解锁的按钮 `m_isPlayClick = false`**，
   点击走 `notEnterGame` —— 只让 `Level` 子节点左右抖两下（L2520-2537）。

## 4. 点进关卡

```
LevelButton 点击
  → StageSelectLayer.clickEnterGame(event, dataId)   L2517
      → gamemain.ticketIsEnough()
          ? gamemain.enterEnterGameScene(dataId)      ← 真正开始游戏
          : hallScene.openShop()                      ← 体力不足时弹商店
```

> 移植版里体力无限（`getTicketMaxNum → 999`），而且 `openShop` 已被清静模式改写成
> 跳皮肤页 —— 所以这条分支现在走不到。

## 5. 数据挂在哪

| 数据 | 位置 | 结构 |
| --- | --- | --- |
| 世界表 | `conf.worlds` | `{ [worldId]: { id, require } }`，`require` = 解锁需要的已通关数 |
| 世界标题 | `conf.stage_cfg` | `{ [worldId]: { sz_title } }`（本地化 id） |
| **世界→关卡表** | `conf.stage_level_cfg` | `{ [worldId]: { [key]: { id, levelId } } }` |
| 世界主题配色 | `conf.theme_cfg` | `{ [worldId]: { list_background, list_level_title, list_level_next, list_level_complete, list_level_disabled, list_level_num, list_level_disabled_num, list_level_lock, list_level_require, ... } }` |
| 关卡地图本体 | `conf.levels` / `data/levels.json` | 290 条，按数据 id 索引；含墙/地板/传送门/钥匙/箭头等格子与 `sz_solution` |

已抽取到 `data/`：`worlds.json`（8 个世界，`{id, require}`）、`levels.json`（290 关）、
`stage_cfg.json`、`theme/`、`package1..8.txt`。**`stage_level_cfg` 的来源文件待落定时确认**
（游戏侧是 `conf.stage_level_cfg`，编辑器接入前需要定位它是从哪个 json 组装的）。

## 6. 编辑器要接的三个功能（落点）

### (a) 自定义大关

「大关」= 一个世界页（`StageSelectLayer`）。自定义一个只需要在 `conf` 里补三条：

```js
conf.worlds[newId]          = { id: newId, require: 0 };        // 0 = 一开始就解锁
conf.stage_cfg[newId]       = { sz_title: '<本地化 id 或自定义标题>' };
conf.stage_level_cfg[newId] = { /* 小关表，见 (c) */ };
conf.theme_cfg[newId]       = { /* 一组颜色，可复制现有世界的 */ };
```

然后让翻页器多出一页 —— `SelectStagePageView` 的 `content` 宽度是按页数算的
（当前 6480 = 9 × 720，说明它是「世界数 + 1」页），
**新增世界后必须同步 content 宽并再实例化一个 `StageLayerPrefab`**，
再对每页调 `initStageLayer(worldId)`。

### (b) 自定义新世界

同上，但建议给自定义内容留一段独立的 id 段（例如 `worldId >= 100`），
避免与原版 1..8 的存档键（`getPassMaxLevelId` / `m_stageViewOffsetList` 都按 worldId 存）打架。
自定义世界的 `require` 建议填 0，这样它不吃原版进度。

### (c) 在新世界里加小关 + 逐个编辑

小关 = `conf.stage_level_cfg[worldId]` 里的一条 `{ id, levelId }` + `conf.levels[id]` 里的地图。
加一关就是：

```js
var myId = <新的数据 id>;                       // 例如 10001 起
conf.levels[myId] = { /* 格子数据 */ };
conf.stage_level_cfg[worldId][myId] = { id: myId, levelId: <显示编号> };
```

界面**会自动出现按钮**（因为它就是遍历这张表），无需手动建 UI。
注意三点：

1. `levelId` 只负责显示，必须是数字；**解锁判定是按 `levelId < next` 比较的**，
   所以自定义关的 `levelId` 要连续，否则会出现"编号 3 已解锁、编号 2 还锁着"的观感问题。
2. 想让某一关一开始就能玩：让它的 `levelId` 等于 `getPassMaxLevelId(worldId) + 1`，
   或把它塞进 `getSkipList(worldId)`。
3. **改完表要重新生成按钮** —— 调该页的 `updateUnlockLayer()`（它会重新实例化整张网格，
   旧按钮不会自动清掉，实现时要先清 `SelectLevelLayer` 的子节点，否则会叠加）。

## 7. 接入前要验证的几点

- `SelectLevelLayer` 现有实例化的子节点是否由 `updateUnlockLayer` 负责清理（当前看是**不清理**，
  只在 `initStageLayer` 时隐藏整层）—— 重复调用会叠加按钮，编辑器里必须先 `removeAllChildren()`。
- `LevelBtnPrefab` 的按钮尺寸与 `SV.content` 的网格算法耦合，改尺寸要同步重算。
- `conf` 是启动时一次性组装的；**运行时改 `conf.stage_level_cfg` 后必须手动重新生成**
  （见 6(c)-3），不会自动刷新。
- 存档键：`getPassMaxLevelId(worldId)`、`m_stageViewOffsetList[worldId]`、
  `getSkipList(worldId)` 全部按 worldId 存，自定义世界请用独立 id 段。

---

相关实现位置速查：

| 内容 | 行号 |
| --- | --- |
| `StageSelectLayer` 定义 / 属性 | L2360-2416 |
| `initStageLayer` / `showLockLayer` / `updateUnlockLayer` | L2418 / L2427 / L2448 |
| 关卡按钮生成循环 | L2461-2514 |
| `clickEnterGame` / `notEnterGame` | L2517 / L2520 |
| `LevelButton` 组件 | L1176-1222 |
| `TabBarItem`（标签栏） | L2543 |
| `HallScene`（含 `showBarView`） | L618 起 |
