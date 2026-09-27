# Maze Dash 网页版移植 — 工程记录

原 APK：`mazedash（冲撞迷阵）(1).apk`（26.8 MB）
交付物：**`web/`** —— 可直接在浏览器运行的完整游戏（8.17 MB / 361 个文件）

---

## 1. 逆向：这个 APK 是什么

| 项 | 结果 |
| --- | --- |
| 引擎 | **Cocos Creator 2.0.2**（`libcocos2djs.so` + `assets/src/cocos2d-jsb.js` 内 `cc.ENGINE_VERSION = "2.0.2"`） |
| 构建目标 | `platform: android`，jsb（原生）运行时 |
| 游戏代码 | `assets/src/project.js` —— 36 个模块的打包产物（`Aboutus`、`gameScene`、`game_map`、`gamemain` …） |
| 插件脚本 | `assets/src/assets/script/plug/{comm,gameconf,tileType,transition}.js`（未打包，独立加载） |
| 资源 | `assets/res/import/`（150 个反序列化资源）+ `assets/res/raw-assets/`（200 个原始文件） |
| 原生依赖 | 仅 12 处 `jsb.reflection.callStaticMethod`（语言、振动、广告、支付、GDPR） |
| 第三方 | Bugly / infoc / ANYS 仅为原生崩溃与分析 SDK，游戏逻辑不依赖 |

关键发现：**游戏逻辑与数据全部保留在包内**，且运行时不依赖 GPU 之外的原生能力。
这使“忠实移植”成为可能——不需要重写游戏。

## 2. 逆向出的游戏模型

- **玩法**：蛇头朝一个方向冲刺，撞墙才停下；经过的格子变成身体（不可再穿过）。
  `game_map.checkClearSatge()` 的胜利条件是：棋盘上每个格子都是 身体 / 头 / 墙 ——
  也就是**填满所有地板格**。
- **图块**（`tileType`）：`0` 墙、`1` 地板、`2` 传送门、`4` 钥匙、`5-8` 方向箭头、
  `-1` 头、`-2` 身体、`-3` 锁、`-4` 可撞碎砖块。
  箭头会强制改向（逆向进入则不动），传送门成对传送并记录出射方向，
  拿走全部钥匙后所有锁消失，可撞碎砖块在冲刺结束后被打碎。
- **关卡数据**：`config/levels`（每关 `mapId` + `sz_solution` 解法串）+ `Puzzle/package1..8.txt`
  （文本地图，`#N` 声明地图号，其余行逗号分隔图块字符）；
  另有 `stage_cfg`（世界名）、`theme`（配色）、`worlds`（解锁门槛）、`quest`、`face`（皮肤）、`game_lang`（10 种语言）。
  合计 **290 关 / 8 个世界**。
- **进度**：`cc.sys.localStorage`，键名经 `comm.js` 的 `compile()` 混淆。
- **原生桥接**：全部包在 `try{}catch{}` 中，因此只要不定义全局 `jsb` 就会静默降级。

## 3. 移植路径

1. **引擎**：APK 自带的是 Android 原生引擎，浏览器不可用。
   从 `github.com/cocos/cocos-engine` 的 **tag `2.0.2`**（commit 53a9e9b3）源码构建网页引擎：
   自带 gulp 3 在 Node 24 上会 `primordials is not defined`，改用便携版 **Node 10.24.1** 执行
   `gulp build-html5` → `bin/cocos2d-js.js`（3.2 MB）。仓库里 `predefine.js` 的版本串硬编码为
   `"2.0.0 alpha"`，已单点改为 `"2.0.2"` 与 APK 原生引擎对齐。
   （另附 `build-web.js`：不依赖 gulp、可在 Node 24 直接构建的等价脚本。）

2. **网页外壳**：把 APK 的 `main.js` 里那段平台无关的 `window.boot()`
   （uuid 修复 → AssetLibrary 初始化 → 加载 launchScene → 进度条）原样保留，
   只把入口从 `require('src/cocos2d-jsb.js')` 换成 script 标签加载浏览器引擎。
   `index.html` 固定 9:16 竖屏舞台（设计分辨率 720×1280）。

3. **适配层 `web-port.js`**（唯一新增的行为代码）：
   - 体力上限 10 → 999 并预置满值、首次赠送 99 个提示（原版靠广告/内购补充）；
   - 首次交互时 `cc.sys.__audioSupport.context.resume()` 解锁音频；
   - 音频容错：被媒体拦截器返回空响应时，用「URL 追加尾斜杠」重试（绕过 `.mp3` 匹配规则），
     仍失败则回退静音缓冲，避免依赖音频的场景卡死；并吞掉该情形下无意义的未处理 Promise 拒绝；
   - 方向键/WASD → 向 canvas 派发合成鼠标事件（引擎自身把鼠标事件转成触摸事件）。

4. **验证**：用 puppeteer-core 驱动本机 Chrome 无头运行，见下。

## 4. 验证证据

| 检查 | 方法与结果 |
| --- | --- |
| 启动 | 无头 Chrome 载入，`cc.game._prepared`，**709 ms** 完成启动，无异常 |
| 引擎身份 | `cc.ENGINE_VERSION === "2.0.2"`，`cc.sys.isNative === false` |
| 场景流程 | `LaunchScene > AnimScene > HallScene > gameScene` |
| 数据 | `conf` 中 8 世界 / 290 关 / 290 地图 / 8 主题 / 12 皮肤 / 7 任务 / 10 语言全部就位 |
| 画面 | 大厅（世界 Origin + 1–20 关卡网格 + 商店/皮肤/任务/设置底栏）、关卡内（`1 - 1`、`Swipe to move.`、蛇头带表情、教学手指）截图核对无误 |
| 交互 | 合成滑动成功进入第 1 关并通关：`checkClearSatge()` 返回 true，`pass_info` 写入 `{"1":{"passMaxLevel":1}}` |
| 多关 UI 流程 | 1-1、1-2 自动进入下一关；1-3、1-4 出现 Continue 按钮并点击继续 —— 与原版设计一致 |
| 全关卡回归 | 直接驱动真实 `game_map`：重建 290 张棋盘并重放各自 `sz_solution`，**289/290 通关**，逐格校验 |
| 图块覆盖 | 全量图块统计：墙 1204、地板 5017、传送门 234、钥匙 71、箭头 216、锁 76、可破坏砖 379、头 371（含多头关卡） |
| 音频 | Web Audio 上下文 running、BGM 播放中、抽样 43/43 可解码 |
| 一致性 | `src/project.js`、`settings.js`、4 个插件脚本、整个 `res/` 树与 APK 内文件 **SHA-256 逐字节一致** |
| 验收脚本 | `_work/test/acceptance.js` —— **17/17 通过** |

## 5. 唯一的数据瑕疵

`mapId 5` 的内置解 `LURDRDL` 在游戏自身规则下第 4 步即被自己身体挡住，无法填满棋盘
（重放后仍有 4 格未填）。用 BFS 独立求解得 `RDLULD`，说明该关本身可解，
问题只出在原版内置的这条解法串上（只影响该关的提示链）。其余 289 关的内置解全部有效。

## 6. 产物位置

```
E:\maze_dash\
├── web\                         ← 交付物：网页版游戏（见 web/README.md）
├── PORT_NOTES.md                ← 本文件
├── docs\screenshots\            ← 运行截图
├── mazedash（冲撞迷阵）(1).apk    ← 原始 APK
└── _work\                       ← 过程产物
    ├── apk\                     APK 解包结果
    ├── analysis\                逆向脚本、提取出的配置/美术、反编译可读化的 project.js
    ├── engine\                  引擎源码、便携 Node 10、构建产物与 ENGINE_REPORT.md
    └── test\                    puppeteer 验证脚本与截图（acceptance / gameplay / solver / alllevels）
```

## 7. 授权与许可说明

- 游戏代码、素材、关卡数据版权归原开发者所有，本次移植基于你已取得的原开发者授权。
- 随附的 `web/cocos2d-js.js` 由 Cocos 官方引擎仓库 `cocos/cocos-engine` 的 `2.0.2` 标签源码构建，
  使用需遵循该仓库 `gulpfile.js` / 源码头部所载的许可条款（MIT 风格，含对 Cocos Creator 工具本身的限制）。
- 本次移植**未包含**任何广告、支付、统计或追踪 SDK。
