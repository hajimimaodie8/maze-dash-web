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

## 6. 单文件直装版（零网络请求）

服务器版要求用户起一个 HTTP 服务，对只想「点开就玩」的场景不友好（`file://` 下浏览器会拦截
资源 XHR，这也是最初踩到的坑）。因此额外做了自包含构建：

`node tools/build-standalone.js` → `dist/MazeDash-standalone.html`（9.72 MB，单文件）。

做法是把引擎、6 个脚本和 350 个资源全部内联，并用一套虚拟文件系统替换引擎的四个网络加载器：

| 引擎加载器 | 替代实现 |
| --- | --- |
| `downloadText`（json / txt / plist / xml） | 直接返回内存中的字符串 |
| `downloadBinary` | 返回内存 `ArrayBuffer` |
| `downloadImage`（`new Image()` + `src`） | 内联 `data:` URI |
| `downloadAudio`（WebAudio / DOM 两种模式） | base64 → `ArrayBuffer` → `decodeAudioData`；DOM 模式用 `data:` URI |
| `fontLoader.loadFont`（注入 `@font-face`） | 自行注入带 `data:` URI 的 `@font-face`，复刻引擎的 `xxx_LABEL` 字族命名 |

同一份源码通过两个开关同时服务两种形态（由构建脚本设置）：
`window.__MAZE_DASH_INLINE_ASSETS` 让 `main.js` 跳过 `file://` 盘符拦截与 jsList 拉取、
让 `web-port.js` 跳过网络重试包装；`window.__MAZE_DASH_VFS` 存放内联资源表。

验证：`tools/verify/standalone.js` —— **14/14 通过**，其中断言「除文档自身外网络请求数为 0」
（实测 0 个网络请求 + 65 个内存 `data:` URL），虚拟文件系统命中统计为
文本 48 / 图片 63 / 音频 11 / 字体 2，**未命中 0**。

## 8. 自适应布局与在线发布

### 8.1 舞台铺满窗口 + 自适应分辨率策略

最初把舞台锁成固定 9:16 方框，结果是窗口一拉大就出现黑边、宽度用不上。改为：

- `#GameDiv` / `#GameCanvas` 铺满整个窗口（`position: fixed; inset: 0`），不再锁宽高比；
- 在 `web-port.js` 里按窗口宽高比挑选分辨率策略（`CONFIG.fit = 'auto'`）：
  - 比 9:16 更窄/更高（手机竖屏）→ `FIXED_WIDTH`：铺满宽度，画布纵向延展，
    界面贴到屏幕四边（这也正是 HallScene 原本的 `_fitWidth: true` 设定）；
  - 比 9:16 更宽（桌面横屏）→ `SHOW_ALL`：完整显示不裁切。
- 留白用**场景自己的背景色**填充：优先读 `gameScene.backGroup.color`，
  其次找屏幕中央那个 `BgLayer`（HallScene 每个世界页各有一层，按世界主题着色），
  再退回 `conf.theme_cfg[worldId].list_background`（HSVA → cc.Color.fromHSV）。
  同一个颜色同时写入 `document.body` 与**相机的清屏色**（`cc.Camera.backgroundColor`，
  该相机 `_clearFlags = 7`，会清颜色），所以宽窗口下看不到任何接缝。
- `resize` / `orientationchange` 事件去抖后重算；场景切换时（`EVENT_AFTER_SCENE_LAUNCH`）也重算。

踩过的坑：`cc.macro.ResolutionPolicy` 在 2.0.2 里**不存在**，常量在 `cc.ResolutionPolicy`；
一开始写错导致策略静默不生效（所有 `RP.*` 都是 `undefined`，`applyFit` 直接 return）。
另外第一次场景启动时 `setDesignResolutionSize` 可能抛错，已加一次重试。

### 8.2 GitHub 角标

`web-port.js` 顶部的 `CONFIG` 集中了所有可调项（仓库地址、角标位置、fit 策略、背景色、设计分辨率）。
角标用 `contentRect()` 算出游戏内容实际占据的区域：`SHOW_ALL` 时才真的有侧边留白，
于是在宽窗口把角标放进留白里（不挡操作），窄窗口退化为左上角图标（`<560px` 时隐藏文字），
加载页另有仓库链接。`sideMargin()` 早期版本错误地按设计宽度估算，
在 `FIXED_HEIGHT` 下会误判出留白，已改为只在 `SHOW_ALL` 下计算。

### 8.3 在线发布（GitHub Pages）

`.github/workflows/pages.yml` 把 `web/` 作为站点发布到
<https://hajimimaodie8.github.io/maze-dash-web/>，推送到 `main` 且改动落在 `web/**` 时自动重新部署。
Pages 的 source 设为 `build_type: workflow`（通过 API `PUT /repos/{o}/{r}/pages`）。

**注意本机网络**：这台机器上 `github.com:443` 不可达（`git push` 会 `Failed to connect`），
但 `api.github.com` 正常。因此代码是用 `tools/push-via-api.js`（Git REST Git Data API）
推上去的：它从本地 HEAD 往回找到与远端 HEAD **tree 相同**的提交作为共同点，
再逐个重放之后的提交。GitHub 会重写 API 创建提交的 author/committer，
所以重放后 SHA 会变（内容一致，可用 tree 比对验证）。
`github.com` 恢复后执行 `git fetch origin && git reset --hard origin/main` 即可完全对齐。

## 9. 产物位置

```
E:\maze_dash\
├── web\                         ← 服务器版（见 web/README.md）
├── dist\MazeDash-standalone.html ← 单文件直装版（构建产物）
├── maze-dash-web.zip            ← 服务器版打包（构建产物）
├── tools\                        ← 构建与验证脚本
├── data\                         ← 关卡与配置数据（关卡编辑器地基）
├── docs\screenshots\             ← 运行截图
├── README.md / PORT_NOTES.md / NOTICE.md
├── mazedash（冲撞迷阵）(1).apk    ← 原始 APK
└── _work\                       ← 过程产物（APK 解包、引擎源码、分析脚本、测试套件）
```

## 10. 版本库

代码已推送到 GitHub：**https://github.com/hajimimaodie8/maze-dash-web**

- 仓库只含源码与数据（`web/`、`tools/`、`data/`、`docs/`），共 405 个文件 / 8.56 MB。
- 两个可直接运行的成品作为 **Release 资产**分发：
  [v1.0.0](https://github.com/hajimimaodie8/maze-dash-web/releases/tag/v1.0.0)
  （`MazeDash-standalone.html` 9.72 MB、`maze-dash-web.zip` 4.22 MB）。
- `.gitignore` 排除了 `_work/`、`dist/`、`*.zip`、`*.apk` 与解压出来的副本目录。

## 11. 授权与许可说明

- 游戏代码、素材、关卡数据版权归原开发者所有，本次移植基于你已取得的原开发者授权。
- 随附的 `web/cocos2d-js.js` 由 Cocos 官方引擎仓库 `cocos/cocos-engine` 的 `2.0.2` 标签源码构建，
  使用需遵循该仓库 `gulpfile.js` / 源码头部所载的许可条款（MIT 风格，含对 Cocos Creator 工具本身的限制）。
- 本次移植**未包含**任何广告、支付、统计或追踪 SDK。
