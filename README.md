# 冲撞迷阵 Maze Dash — 网页版

把 Android 游戏《冲撞迷阵 Maze Dash》移植成浏览器版本。**这是移植，不是重制**：
浏览器里运行的仍然是原 APK 里的游戏代码（`project.js`，36 个模块）、290 关关卡数据和
全部美术/音频资源；被替换掉的只有 Android 原生运行时
（Cocos Creator 2.0.2 的 jsb 引擎 + 广告/支付/振动等原生桥接）。

原游戏代码 **一行未改**：`web/src/` 与 `web/res/` 下的每个文件都与 APK 内文件 SHA-256 一致。

## 🎮 直接开玩（在线，无需下载）

> ### **<https://hajimimaodie8.github.io/maze-dash-web/>**
>
> 点开就能玩，不用下载、不用解压、不用起服务器。手机浏览器也可以直接打开。

## 三种形态，按需取用

| | 🎮 在线版（Pages） | 🖱️ 单文件直装版 | 🌐 服务器版 |
| --- | --- | --- | --- |
| 打开方式 | **点链接直接玩** | **双击 HTML** | 需本地 HTTP 服务器 |
| 位置 | `web/` 由 GitHub Actions 发布 | `dist/MazeDash-standalone.html`（9.74 MB） | `web/` 整个目录（8 MB，361 文件） |
| 网络请求 | 按需加载 `res/` | **零**（资源全部内嵌） | 按需加载 `res/` |
| 适合 | 分享给别人 / 随手玩 | 离线、发给别人、单文件存档 | 二次开发、改资源、自部署 |
| 构建 | push 到 `main` 自动发布 | `node tools/build-standalone.js` | 直接用 |

### 在线版（GitHub Pages）

`web/` 目录通过 [`.github/workflows/pages.yml`](.github/workflows/pages.yml) 自动发布到
GitHub Pages：推送到 `main` 就会重新部署，无需手动操作。

### 单文件直装版

```bash
node tools/build-standalone.js          # 输出 dist/MazeDash-standalone.html
```

生成的 HTML 里内嵌了引擎、全部游戏脚本和 350 个资源文件；运行时用一套内存文件系统
替换了引擎的四个网络加载器（文本/JSON/二进制、图片、音频、字体），所以**不发出任何网络请求**，
双击即可运行。也作为 Release 资产提供下载。

### 服务器版

```bash
cd web
node serve.js            # 默认 8099 端口
# 浏览器打开 http://localhost:8099/
```

Windows 可直接双击 `web/start.bat`（macOS / Linux 用 `./web/start.sh`）。
**不要双击 `index.html`** —— `file://` 下浏览器会拦截资源请求；
如果真这么打开了，页面会给出明确提示和诊断信息，而不是卡住。

### 操作

| 平台 | 操作 |
| --- | --- |
| 手机 / 平板 | 在棋盘上滑动（原版操作） |
| 鼠标 | 按住拖动 = 滑动 |
| 键盘 | `↑ ↓ ← →` 或 `W A S D` |

规则：蛇头朝一个方向冲撞，撞墙才停，经过的格子变成身体；**填满所有地板格即过关**。

---

## 目录结构

```
.
├── web/                          服务器版（原版代码 + 资源）
│   ├── index.html  main.js  web-port.js  serve.js  start.bat  start.sh
│   ├── cocos2d-js.js             自源码构建的 Cocos Creator 2.0.2 浏览器引擎
│   ├── src/                      原 APK 游戏代码（逐字节一致）
│   └── res/                      原 APK 全部资源（350 个文件，逐字节一致）
├── tools/
│   ├── build-standalone.js       单文件直装版构建脚本
│   ├── verify/                   puppeteer 无头验证套件
│   └── apk/                      从 APK 提取数据的脚本
├── data/                         整理后的关卡与配置数据（供关卡编辑器使用）
├── docs/screenshots/
├── PORT_NOTES.md                 移植工程记录（逆向过程、验证证据、已知问题）
└── NOTICE.md                     版权与许可说明
```

---

## 相比原版的改动

游戏代码本身未改，改动都在引擎替换和 `web/web-port.js` 适配层：

1. **引擎替换** — 原 APK 的 `cocos2d-jsb.js` 是 Android 原生引擎，浏览器无法运行；
   换成用同一版本（tag `2.0.2`）源码构建的浏览器引擎。
2. **原生桥接自然失效** — 原代码里 12 处 `jsb.reflection.callStaticMethod(...)`（广告、支付、
   振动、GDPR）本就包在 `try{}catch{}` 中；网页版不定义全局 `jsb`，于是全部退化为空操作。
   **没有广告、没有内购、没有振动、没有埋点。**
3. **体力系统改为不受限** — 原版 10 点体力、5 分钟恢复 1 点，补充靠广告或内购；去掉后
   玩家会被锁死在 10 关。因此体力上限改为 999 并预置满值，首次进入赠送 99 个提示。
   关卡进度、任务与解锁逻辑未动。
4. **音频解锁与容错** — 首次交互时恢复 AudioContext（浏览器自动播放策略）；服务器版还会在
   音频请求被下载管理器之类插件拦截时用带尾斜杠的 URL 重试，仍失败则回退静音，避免卡死。
5. **桌面键盘操作** — 通过向 canvas 派发合成鼠标事件实现方向键 / WASD。
6. **启动失败会自我说明** — 检测 `file://` 与启动超时，给出可操作的提示和实时诊断。

---

## 自定义：都在 `web/web-port.js` 顶部

移植层把所有可调项集中在一个 `CONFIG` 块里，改完（单文件版重新跑一次构建）即可生效：

```js
var CONFIG = {
    repo: 'https://github.com/hajimimaodie8/maze-dash-web',  // 留空 '' 则不显示
    repoLabel: 'maze-dash-web',
    repoBadge: true,
    repoBadgePosition: 'auto',   // auto | margin | top-left | top-right | bottom-left | bottom-right
    fit: 'auto',                 // auto | contain | width | height | cover | stretch
    background: 'auto',          // 'auto' = 跟随当前场景/世界的主题底色
    backgroundFallback: '#1d7a5f',
    designWidth: 720,
    designHeight: 1280,
};
```

### 画面自适应（拖拽窗口即可看到效果）

舞台现在**铺满整个浏览器窗口**，不再是固定的 9:16 方框。`fit: 'auto'` 的规则是：

| 窗口 | 策略 | 效果 |
| --- | --- | --- |
| 比 9:16 更窄/更高（手机竖屏） | `FIXED_WIDTH` | 铺满宽度，画布纵向延展 → **满屏无黑边**，底部标签栏贴到屏幕底边 |
| 比 9:16 更宽（桌面横屏） | `SHOW_ALL` | 完整显示、不裁切；两侧用**场景自己的背景色**填充（同时改页面背景与相机清屏色），视觉上无缝 |

窗口缩放、旋转屏幕都会自动重算。想强制某种策略就改 `fit`：
`contain`（永远完整显示）、`width`（永远铺满宽度）、`height`（永远铺满高度）、
`cover`（铺满可能裁切）、`stretch`（拉伸会变形）。

### GitHub 角标

- **宽窗口**：角标落在游戏两侧的留白里（不挡任何操作），鼠标悬停变亮。
- **窄窗口/手机**：退化为左上角的 GitHub 图标（窄屏自动隐藏文字）。
- **加载页**：标题下方也有一条仓库链接。
- 位置可用 `repoBadgePosition` 强制指定；`repo: ''` 可完全关掉。

---

## 第 6 个标签：自定义关卡（关卡编辑器入口）

改造的是**游戏本身的界面**，不是网页外壳。原版底部标签栏有 5 格（商店 / 皮肤 / 首页 / 任务 / 设置），
现在加了第 6 格：**扳手图标 = 自定义关卡**，点进去是一个空白占位页，等关卡编辑器接进来。

实现方式是 `web/custom-tab.js`（新增文件，不改游戏代码）：

- 游戏源码里标签栏是**纯数组驱动**的 —— `tabBar.children[i]`、`viewGroup[i]`、
  `leftViewMap[i]` / `rightViewMap[i]`（记录每个视图停在左侧还是右侧，决定滑入方向），
  `showBarView()` 只按索引取用。所以只要把这三处数组补上第 6 项，原逻辑自己就能跑。
- 运行时**克隆最后一个标签项**，改名为 `customBar`、指向索引 5、把图标换成生成的扳手 PNG；
- 6 格各缩到 **120 宽**（6 × 120 = 720，正好铺满标签栏），高亮底色同步改宽，再触发 Layout 重排；
- 新建空白页 `customLevelsView`，注册进 `viewGroup[5]` 与两个 map，
  并给它一个 `TabBarView` 组件（带 `cc.Animation` 以满足其 `onLoad`），
  用同方向语义的滑入/滑出替换原来的动画片段调用；
- **顺手修了一个隐患**：每个世界页的左右箭头命中区原本是 80×**1280**（纵贯整条边缘、盖住标签栏），
  原版最右一格止于 x=600 所以从未冲突，新增一格 600–720 就撞上了。
  现在把 16 个箭头命中区收到 80×900（居中，y 190–1090），既腾出标签栏那一行，
  也让箭头命中区更合理（箭头本身画在中部）。

### 把占位页换成真正的编辑器

`web/custom-tab.js` 里找 `buildPlaceholderContent(view)` —— 它现在只放标题和一行提示，
`view` 就是那一页的节点，往里加什么都行。页面的背景、进出场、高亮、索引都由原版逻辑负责。
从代码里打开这一页：`MazeDashCustomTab.open()`；取页面节点：`MazeDashCustomTab.view()`。

### 换图标

```bash
node tools/make-wrench-icon.js --inject web/custom-tab.js    # 重新生成并写回
node tools/make-wrench-icon.js --color '#FF8A3D' --out dist/w.png --print-datauri
```

图标是用纯 Node 画出来的（SDF 光栅化 + zlib 写 PNG，无图像库依赖），
风格对齐原版：粗实心 + 同色系深色描边。

---

## 清静模式（`web/clean-mode.js`）

原版被广告、内购、礼包、评分、任务恭喜、世界解锁这些弹窗包着。移植层把它们全部接管了，
并且**皮肤全解锁**：

| 处理 | 做法 |
| --- | --- |
| 12 张皮肤全部解锁 | `gamemain.setFaceInfo([0..11])`，皮肤页里 0 个上锁 |
| 通用弹窗（提示 / 警告 / 评分） | 接管 `gamemain.showTips` / `showGameAlert` / `showRateUs` |
| 任务恭喜、世界解锁 / 通关世界弹窗 | 接管 `gameScene.showQuestTick / showCompleteQuest / showUnlockWorld / showWorldCompleted`（这些挂在**场景组件**上，不在 `gamemain`） |
| 皮肤解锁弹窗 | 接管 `showFaceUnlock`，并让 `checkFaceUnLock` 返回 null |
| 首次进入的「+1H」礼包窗 | 接管 `setInfinityTicketExpiryTime`，无限体力下本就不需要它 |
| 任务 / 世界解锁的判定 | `checkQuest` 恒返回 `[]`、`checkNewWorld` 恒返回 `null` |
| 广告 / 内购入口 | `showVideoAd` / `showInterstitialAd` / `show*Ad` / `pay` 全部空操作 |
| 两个引导浮层 | `guid_tips` / `QuestTips` 被直接关掉（只列这两个，避免误伤通关面板） |

**回调会原样转发** —— 弹窗的完成回调若不调用，调用方会一直等下去。
每个被接管的函数都打了 `__cleanMode` 标记，`window.MazeDashClean.stats` 里能看到
接管清单、被拦下的调用次数和被关掉的节点数。开关都在文件顶部的 `CFG`。

---

## 验证情况

| 项目 | 结果 |
| --- | --- |
| 引擎 | Cocos Creator 2.0.2 浏览器引擎，`cc.sys.isNative === false` |
| 场景流程 | `LaunchScene → AnimScene → HallScene → gameScene` |
| 数据完整性 | 8 世界 / 290 关 / 290 地图 / 8 主题 / 12 皮肤 / 7 任务 / 10 语言 |
| 资源 | 149 个 SpriteFrame、43 段音频、3 个 TTF 字体 |
| 玩法 | 真实滑动通关 1-1 ~ 1-4，进度写入 `pass_info`，自动/手动进入下一关 |
| 全关卡回归 | 290 关各自的 `sz_solution` 灌入真实引擎重放：**289/290 通关**（覆盖传送门、箭头、钥匙、锁、可碎砖、多头棋盘） |
| 音频 | 43/43 可解码，BGM 实际播放中 |
| 画面自适应 | 手机竖屏 / 9:16 / 桌面横屏 / 超宽屏 **冷启动 3/3** 布局正确；运行中改窗口大小也能正确重排 |
| 服务器版验收 | `node tools/verify/acceptance.js` → **17/17** |
| 直装版验收 | `node tools/verify/standalone.js` → **14/14**，且网络请求数为 **0** |
| 在线版验收 | 直接加载 `https://hajimimaodie8.github.io/maze-dash-web/` → **10/10**（含真实滑动通关） |
| 清静模式 | 皮肤 12/12 解锁、皮肤页 0 上锁、礼包窗不再出现、通关第 1 关后无任何弹窗、10 个弹窗入口 + 5 个场景级入口被接管 → `tools/verify/clean.js` **13/13** |
| 第 6 个标签 | 6 格 × 120 = 720 均分、扳手图标生效、页面滑入居中、高亮唯一、来回切换与连点都稳定 → 	ools/verify/customtab.js **17/17** |
| 一致性 | `web/src/`、`web/res/` 与 APK 内文件逐字节一致 |


### 已知的原版数据瑕疵

`mapId 5`（第 5 关）内置提示串 `LURDRDL` 按游戏自身规则第 4 步就会被自己身体挡住，
填不满棋盘；该关本身有解（如 `RDLULD`），只是那条提示链的后半段不可靠。
其余 289 关的内置解都能完整重放通关。详见 `PORT_NOTES.md`。

---

## 运行验证套件

```bash
cd tools/verify
npm install                     # 只需要 puppeteer-core
npm run test:http               # 服务器版 17 项验收
npm run test:standalone         # 单文件版 14 项验收
npm run test:alllevels          # 290 关全量回归
npm run test:solver -- 10       # 用内置解自动通关 10 关（真实滑动）
```

需要本机已安装 Chrome / Edge；脚本默认指向
`C:\Users\Lenovo\AppData\Local\Google\Chrome\Application\chrome.exe`，
其他环境请改各脚本顶部的 `CHROME` 常量。

---

## 后续：关卡编辑器

`data/` 里已经放好了整理后的关卡数据与格式说明（`data/README.md`），
`tools/apk/` 里保留了从 APK 提取数据的脚本，`tools/build-standalone.js` 可以把改动重新打包成单文件。
这些是为下一步做关卡编辑器准备的地基。

---

## 许可

游戏代码与素材版权归原开发者所有，本仓库基于原开发者的授权进行移植，详见 `NOTICE.md`。
随附的 Cocos Creator 2.0.2 引擎遵循其自身许可条款。
