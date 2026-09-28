# 关卡与配置数据格式

本目录是《冲撞迷阵 Maze Dash》的完整游戏数据，从 APK 中提取并整理成便于读写的纯文本 / JSON，
供关卡编辑器与工具链使用。所有内容与原包内数据一致。

---

## 1. 关卡布局：`package1.txt` … `package8.txt`

8 个文件共 **290 关**，纯文本，按地图编号排列。

### 格式

```
#12
0,0,0,0,0
0,0,0,W,0
0,C,0,W,0
W,W,0,0,0
```

- `#N` 单独一行，声明**接下来的地图属于编号 N**（`mapId`）。数字后可带逗号（原包里就有 `#5,`）。
- 其后每一行是地图的**一行**，单元格用英文逗号分隔，**从上到下**即行号 0,1,2…；
  行内**从左到右**即列号 0,1,2…。
- 空行是分隔符，会被忽略；文件尾部的空行无意义。
- 编号顺序在文件内是打乱的（按 `(mapId-1) % 4` 分组），**不要依赖顺序**，只认 `#N`。

### 单元格字符

| 字符 | 含义 | `tileType` 值 | 可通行 | 说明 |
| --- | --- | --- | --- | --- |
| `0` | 地板 | `1` (`kTileDataSpace`) | ✅ | 需要被蛇身填满 |
| `W` | 墙 | `0` (`kTileDataBlock`) | ❌ | 阻挡冲刺 |
| `C` | 蛇头（出生点） | `-1` (`kTileDataHead`) | — | 有的关卡有多个 |
| `B` | 可破坏砖块 | `-4` (`kTileDataDestroyable`) | ❌ | 冲刺结束后若正对砖块则撞碎它，下一回合可通行 |
| `^` `>` `V` `<` | 方向箭头 | `5` `6` `7` `8` | ✅ | 经过时强制改向；若与当前方向相反则视为墙 |
| `P` | 传送门 | `2` (`kTileDataPortal`) | ✅ | 成对出现，进入后从另一个门同方向穿出 |
| `K` | 钥匙 | `4` (`kTileDataKey`) | ✅ | 拾取后（集齐本关所有钥匙）所有锁消失 |
| `L` | 锁 | `-3` (`kTileDataLock`) | ❌ | 有钥匙时可通行 |

> 解析时字符会统一转成大写，所以小写写法（`w`、`c`…）等价。
> 蛇身 `-2` (`kTileDataBody`) 只存在于运行期，不会出现在关卡文件里。

### 胜负判定（`game_map.checkClearSatge()`）

棋盘上每个格子都属于 **蛇身 / 蛇头 / 墙** 时即过关 —— 也就是**填满所有地板格**。
（注意：墙不算“填充”，地板格必须被蛇身覆盖。）

---

## 2. 关卡配置：`levels.json`

290 条，键是自增 `id`：

```json
"5": { "id": 5, "wordId": 1, "levelId": 5, "mapId": 5, "sz_solution": "LURDRDL" }
```

| 字段 | 含义 |
| --- | --- |
| `id` | 全局关卡序号（1–290） |
| `wordId` | 世界编号（1–8），**原包写的就是 `word` 而不是 `world`** |
| `levelId` | 在该世界内的关卡序号（第 1 关为 1） |
| `mapId` | 指向 `package*.txt` 里的地图编号 |
| `sz_solution` | 解法串，由 `U` `D` `L` `R` 组成 |

### 关于 `sz_solution`

它被游戏用作**提示**：`game_map.getMoveDirection()` 把解法串按
`a = ceil(长度 / 3)` 切成三段，玩家第一次点提示播放第一段。它同时是自动演示用的序列。

⚠️ **已知瑕疵**：`mapId 5` 的 `LURDRDL` 并不是一条完整解法 —— 按游戏规则走到第 4 步
（`D`）就会被自己刚留下的身体挡住，重放后仍有 4 格未填。该关本身可解（例如 `RDLULD`）。
其余 289 关的解法串都能完整重放到过关。做编辑器时建议对解法串做一次可解性校验。

---

## 3. 其他配置

| 文件 | 内容 |
| --- | --- |
| `stage_cfg.json` | 8 个世界的显示名（`Origin`、`Break`、`Lost`…） |
| `worlds.json` | 世界解锁条件：`{ "id": 2, "require": 12 }` = 通关 12 关后解锁 |
| `theme.json` | 每个世界的配色（HSVA 数组：地板、阴影、砖块等），驱动 `setNodeColorForHSVA` |
| `quest.json` | 7 个任务：类型（`level` / `world`）、计数、奖励提示数 |
| `face.json` | 12 张皮肤及其解锁方式（默认解锁 / 看广告 / 通关某世界 / 天数） |
| `game_lang.json` | 10 种语言的文案表（`sz_key` 为键，`en` `zh-Hans` `ja` … 为列） |

---

## 4. 游戏读取数据的路径

```
settings.js (资源清单)
   └─ AssetLibrary 载入 res/import/ 下的反序列化资源
        ├─ config/levels      → conf.level_cfg        (即本目录 levels.json)
        ├─ config/stage_cfg   → conf.stage_cfg
        ├─ config/theme       → conf.theme_cfg
        ├─ config/worlds      → conf.worlds
        ├─ config/quest       → conf.quest_cfg
        ├─ config/face        → conf.face_cfg
        ├─ config/game_lang   → window.i18n.languages
        └─ Puzzle/package1..8 → conf.all_Level[mapId]  (即本目录 package*.txt)
```

`game_map.loadLevel(worldId, mapId, cb)` 会：

1. `conf.all_Level[mapId]` 深拷贝进 `Level_data`（运行期棋盘）；
2. 按 `> 0` 的格子铺地板、生成障碍物与蛇头；
3. 记录尺寸 `MapSize = (列数, 行数)`、`TileSize = (80, 80)`。

---

## 5. 坐标与方向约定（写编辑器时最容易踩的坑）

- 单元格坐标写作 `(x, y)`：**x = 列号，y = 行号**，且 **y 向下递增**（行 0 在最上面）。
- 方向常量：`Up = 1`、`Down = 2`、`Left = -1`、`Right = -2`
  （`getNextTile` 里 `Up` 是 `y - 1`）。
- 世界坐标转换：`getPositionByTile` 把 `(x, y)` 映射到以地图中心为原点的像素坐标，
  格子尺寸 80×80。

---

## 6. 数据来源脚本

`tools/apk/` 下的脚本可以从 APK 重新提取这些数据：

| 脚本 | 作用 |
| --- | --- |
| `extract_assets.py` | 从 `res/import/**.json` 里取出 `cc.JsonAsset` / `cc.TextAsset`（即 `config/*` 与 `Puzzle/*`） |
| `pkgcheck.py` | 校验 8 个 package 的编号范围、有无重叠与缺失、地图是否矩形 |
| `levelcheck.py` | 汇总每个世界的关卡数、地图编号覆盖、用到的图块字符 |
| `extract_art.py` | 按名字导出 SpriteFrame（给编辑器做图块预览用） |
| `asset_table.py` | 资源路径 → uuid → 实际文件 的对照表（含压缩 uuid 解码） |
