# 关卡编辑器设计规格（自定义关卡 · 第一期：新建关卡）

> 目标：只做「新建关卡」这一件事，做完能像正常关卡一样出现在选关界面并进入游玩；
> 关卡内多一个「编辑」按钮，弹出一个 20×20 的网格编辑窗口。
> 数据格式见 **[level-format.md](level-format.md)**，选关界面见 **[level-select.md](level-select.md)**。

---

## 1. 主题数据：`data/theme.json`（实测结构）

8 个世界各一条，`list_*` 是**颜色槽**，值统一是 **HSVA 数组**：

```json
"1": {
  "id": 1,
  "list_floor":   [42, 24, 89, 1],     // H 0-360（会超过 255，如 269）, S/V 0-100, A 0-1
  "list_character": [43, 81, 100, 1],
  "list_brick":   [164, 80, 80, 1],
  "list_portal":  [273, 67, 100, 1],
  "list_arrow":   [184, 15, 100, 1],
  ...
}
```

游戏侧是 `cc.Color.fromHSV(h, s, v)` + 单独设 alpha，所以**编辑器改色就是改这四个数**。

### 1.1 道具 → 颜色槽（编辑器「按主题自动上色」就查这张表）

| 关卡元素 | 主色槽 | 底衬槽 |
| --- | --- | --- |
| 地板 | `list_floor` | — |
| 主角 | `list_character` | `list_character_Face`（脸） |
| 砖块 | `list_brick` | `list_brick_tile` |
| 传送门 | `list_portal` | `list_portal_tile` |
| 方向箭头 | `list_arrow` | `list_arrow_tile` |
| 钥匙 / 锁 | `list_key` / `list_lock` | — |
| 阴影 / 分隔线 | `list_shadow` / `list_separator` | — |
| 场景光晕 / 暗角 / 尘 | `list_glow` / `list_vignette` / `list_dust` / `list_powder` | — |

> 注意 `list_key` 与 `list_lock` 在 1 号世界里是 `[0,0,0,0]`（完全透明）——
> 说明这两个元素**默认不上色**或走原始贴图色，编辑器不要假设它们一定有值。

### 1.2 其余颜色槽（选关界面与弹窗）

`list_background` `list_title` `list_ui`（菜单）；
`list_level_background` `list_level_title` `list_level_complete` `list_level_next`
`list_level_disabled` `list_level_num` `list_level_disabled_num` `list_level_lock`
`list_level_require` `list_level_toggle_one` `list_level_toggle_two`（选关界面）；
`list_continue_*` `list_unlock_*` `list_world_complete_*` `list_face_lock`（弹窗）。
共 **40 个槽**——「自定义主题」只需要给用户暴露前两组里的关键项，其余留「跟随某世界」。

**「选择主题」的实现**：`conf.theme_cfg[自定义世界id] = JSON.parse(JSON.stringify(conf.theme_cfg[来源世界id]))`
再改其中若干槽。选「某大关的主题」就是整份复制。

---

## 2. 20×20 到底放得下吗？——放得下，但要选对格子尺寸

运行时格子是 **80×80 像素**，20×20 = **1600×1600**，超出设计高度 1280，**直接铺是放不下的**。

设计分辨率高度固定 **1280**（宽屏模式宽度随窗口），所以：

| 格子尺寸 | 20×20 占用 | 结论 |
| --- | --- | --- |
| 80 px（运行时原尺寸） | 1600×1600 | ❌ 高度溢出 320 |
| **64 px** | **1280×1280** | ✅ **正好占满高度**，宽度 1280 在宽屏设计（2048）里两侧还有余量 |
| 56 px | 1120×1120 | ✅ 更宽松，适合再放工具栏 |

**建议：编辑网格用 64 px 格子**（20×20 = 1280×1280），工具栏放在右侧或下方空白处；
若主题工具栏较宽，降到 56 px 留出 160 px 边距。**不需要缩放或滚动**，这是最佳尺寸。

---

## 3. 四个工具 → 直接对应到 JSON 的哪一部分

编辑器每次操作都落到 `grid[y][x]`（`conf.all_Level[mapId]` 的二维数组，行优先、y 向下）。

| 工具 | 用户操作 | 写入 JSON | 值 | 颜色来源 |
| --- | --- | --- | --- | --- |
| **① 打勾（可移动区）** | 勾选格子 | `grid[y][x]` | `1`（地板） | `list_floor` |
| ① 的反面（不勾） | 取消勾选 | `grid[y][x]` | `0`（墙） | 底色 |
| **② 砖块** | 放置 | `grid[y][x]` | `-4` | `list_brick` / `list_brick_tile` |
| **② 箭头** | 放 ↑ / → / ↓ / ← | `grid[y][x]` | `5 / 6 / 7 / 8` | `list_arrow` / `list_arrow_tile` |
| **② 传送门** | 放置（含颜色） | `grid[y][x]` | 见 §4（暂定 `2`） | `list_portal` / `list_portal_tile` |
| **③ 主角** | 放置出生点（可多个） | `grid[y][x]` | `-1` | `list_character` |
| **④ 主题** | 选某大关 / 自定义 | `conf.theme_cfg[世界id].list_*` | HSVA 数组 | — |

**关卡元数据（新建时写一次）**：

```js
conf.all_Level[mapId] = grid;                                  // 二维 int
conf.level_cfg[id] = { id, wordId, levelId, mapId, sz_solution };
conf.stage_level_cfg[worldId][String(id)] = conf.level_cfg[id]; // 选关界面靠它生成按钮
```

---

## 4. 传送门彩色化：需要扩展格式（**这是唯一需要动游戏逻辑的地方**）

原版：`2` = 传送门，**成对**出现，进入后从另一个门同方向穿出 ——
配对方式**我还没读代码确认**（下一期第一件事）。

要让「同色才通」成立，需要给门带上颜色。两个方案：

| 方案 | 做法 | 代价 |
| --- | --- | --- |
| **A. 用数值编码颜色** | 门用 `20 + 颜色序号`（20,21,22…），颜色序号查 `list_portal` 派生的一组色 | 需要**接管** `game_map` 的传送门配对与穿出逻辑，让它按「值相同」配对 |
| **B. 用 alpha 通道承载颜色** | 仍是 `2`，另存一张 `portalColors` 映射表 | 数组里看不出颜色，编辑器和存档要多维护一份表，**不推荐** |

**推荐 A**：数据自描述（`grid` 里就能看出颜色），导出 JSON 时也能被别人理解。
实现上在移植层加一个模块覆盖 `game_map` 的传送门方法（像 `clean-mode.js` 那样接管），
**改了哪一步、影响哪个函数，都要在文档里标出来**。

> 在确认原版配对逻辑之前，编辑器先按 `2`（无色）实现，把「颜色」这一维度留在 UI 上
> （灰掉或标注"待启用"），避免做出一个跑不起来的关卡。

---

## 5. 多主角

**格式已经支持**：`-1` 可以出现多次（`data/README.md` 明确写了"有的关卡有多个"）。
所以「③ 多主角」在**数据层零成本**，只是编辑器允许在同一关放多个 `-1`。

待确认的是**游戏运行时是否真的处理多蛇头**（蛇身推进、过关判定、提示序列都可能是单头假设）。
下一期用两关实测：一关放 2 个 `-1`，看能否正常开始与推进。若不行，就退化成"仅一个主角，
其余放置点为空"，并在 UI 上限制。

---

## 6. 第一期落地清单（只做"新建关卡"）

| # | 事项 | 落点 | 状态 |
| --- | --- | --- | --- |
| 1 | 自定义关卡容器（一个独立世界 id 100，`require: 0`） | `conf.worlds/stage_cfg/theme_cfg` | 数据层**已验证可写** |
| 2 | 让它在选关界面出现 | 需要**实例化一个新页**并 `initStageLayer(100)` | ⚠️ **未验证**（见 level-format.md §3 实测纠正） |
| 3 | 新建关卡（写三处 + 刷新） | `conf.all_Level/level_cfg/stage_level_cfg` + `refreshStagePages()` | **已验证** |
| 4 | 持久化（localStorage）与启动注入 | `EVENT_GAME_INITED` 时机 | 设计已定，未实现 |
| 5 | 关卡内「编辑」按钮 | 克隆 `backgroup/button_group/btn_hint`，改名 `btn_edit`，绑 `TOUCH_END` | 节点路径已知，未实现 |
| 6 | 编辑窗口：20×20 网格（64 px 格子）+ 网格线 | 新建 `cc.Node` + 逐格 Sprite，或单张 Graphics | 未实现 |
| 7 | 工具①：勾选地板 / 取消 | `grid[y][x] = 1 / 0` | 未实现 |
| 8 | 工具②③：砖块 / 箭头 / 传送门 / 主角 | `-4 / 5-8 / 2 / -1` | 未实现 |
| 9 | 每次操作即时回显对应 JSON 片段 | 一个只读 Label，显示当前 `grid` 的 JSON | 未实现 |

### 建议的实现顺序（每步都能单独验证）

1. **验证「新建页」**（第 2 项）—— 这是唯一的功能性阻塞点：实例化一页 → `initStageLayer(100)` → 确认标题与网格正确；
2. **新建关卡 + 持久化**（第 1/3/4 项）—— 用现有 `refreshStagePages()`，先不做 UI，用代码创建一关并进关；
3. **编辑按钮 + 只读网格窗口**（第 5/6 项）—— 先只显示 `grid` 与图块颜色，不做编辑，零风险确认数据理解正确；
4. **工具①**（第 7 项）—— 第一个真正能改数据的工具；
5. **工具②③ + JSON 回显**（第 8/9 项）；
6. **工具④主题**（复制 `theme_cfg` 再改槽）。

> 关于「每一步操作对应出 JSON 哪一部分」：第 9 项的只读回显就是这个需求的实现 ——
> 每次操作后显示 `grid`、以及受影响的 `level_cfg` / `theme_cfg` 片段，
> 相当于编辑器自己把「操作 → JSON」的映射演示出来。

---

## 7. 验证记录（实测，用于替换上文所有"待验证"标记）

### ✅ 7.1 新建自定义世界页：**配方已确认可用**

从函数源码读出接口（`tools/verify/probe-stage-fns.js`）：

```js
hallScene.createStageLayer(stageId, index)   // 实例化一页、initStageLayer(stageId)、接管翻页按钮
hallScene.StageSelectLayer.insertPage(page, index)   // 插入整页
```

实测（`tools/verify/probe-custom-world.js`）用 `createStageLayer(100, 8)` + `insertPage(page, 8)`：

| 项 | 结果 |
| --- | --- |
| 页数 | 9 → **10** ✓ |
| 翻页器 content 宽 | 6480 → **20480**（= 2048 × 10）✓ |
| 新页宽度 | **2048**（被 wide-ui 自动撑宽）✓ |
| 新页 `m_stageId` | **100** ✓ |
| 新页关卡按钮 | **1 个**（即新建的那一关）✓ |
| 解锁状态 | `SelectLayer.active = true`、`LockLayer.active = false` ✓（`require: 0`） |

### ⚠️ 7.2 一个必须避免的坑

`hallScene.initStageLayer()`（**无参**）是"按 `conf.stage_cfg` **重建全部页**"。
**重复调用会把所有页再建一遍** —— 我在测试中误调一次，页数从 9 变成 **18**。
编辑器**只能**用 `createStageLayer` + `insertPage`，**绝不要调 `initStageLayer()`**。

### ✅ 7.3 自定义关卡可以进入游玩

`gamemain.enterEnterGameScene(10001)` → 进入 `gameScene`，`worldId = 100`、`level = 1`，
**零报错**。说明数据层的三处写入 + 进入流程是通的。

### ⚠️ 7.4 双主角：**未判定**（需要先找到运行期网格）

放两个 `-1` 的关卡**能进入、零报错**，但我**没能数出蛇头数量**：
`game_map` 组件上**没有**二维数组属性的网格数据，它只有这些**图层节点**
（名字含游戏自身的拼写错误，编辑器要照着写）：
`tile_item_layer`、`spaceTile`、`fllor_space_layer`、`shadow_layer`、
`SankeHead`、`Brick`、`Arrow`、`Lock`、`Key`、`Portal`、`Prortal_out`。

→ **下一项测试：定位运行期网格存在哪里**（可能在别的组件或数据模块上，也可能是扁平数组）。
在找到它之前，「多主角运行时是否支持」不能下结论。

### ⏳ 7.5 仍未做

- **传送门配对逻辑**：还没读源码（`§4` 的彩色传送门方案依赖它）；
- **双蛇头的实际行为**（推进、过关判定）——依赖 7.4。