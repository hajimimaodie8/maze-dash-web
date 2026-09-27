# 冲撞迷阵 Maze Dash — 网页版

把 Android 游戏《冲撞迷阵 Maze Dash》移植成浏览器版本。**这是移植，不是重制**：
浏览器里运行的仍然是原 APK 里的游戏代码（`project.js`，36 个模块）、290 关关卡数据和
全部美术/音频资源；被替换掉的只有 Android 原生运行时
（Cocos Creator 2.0.2 的 jsb 引擎 + 广告/支付/振动等原生桥接）。

原游戏代码 **一行未改**：`web/src/` 与 `web/res/` 下的每个文件都与 APK 内文件 SHA-256 一致。

---

## 两种形态，按需取用

| | 🖱️ 单文件直装版 | 🌐 服务器版 |
| --- | --- | --- |
| 打开方式 | **双击 HTML 即可** | 需要本地 HTTP 服务器 |
| 文件 | `dist/MazeDash-standalone.html`（约 9.7 MB，单文件） | `web/` 整个目录（约 8 MB，361 个文件） |
| 网络请求 | **零**（资源全部内嵌） | 通过 HTTP 读取 `res/` |
| 适合 | 发给别人玩、离线、手机浏览器 | 二次开发、改资源、部署到网站 |
| 构建 | `node tools/build-standalone.js` | 直接用 |

### 单文件直装版

```bash
node tools/build-standalone.js          # 输出 dist/MazeDash-standalone.html
```

生成的 HTML 里内嵌了引擎、全部游戏脚本和 350 个资源文件；运行时用一套内存文件系统
替换了引擎的四个网络加载器（文本/JSON/二进制、图片、音频、字体），所以**不发出任何网络请求**，
双击即可运行。

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
| 服务器版验收 | `node tools/verify/acceptance.js` → **17/17** |
| 直装版验收 | `node tools/verify/standalone.js` → **14/14**，且网络请求数为 **0** |
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
