# tools

| 目录 / 文件 | 作用 |
| --- | --- |
| `build-standalone.js` | 把 `web/` 打包成一个自包含的单文件 HTML（`dist/MazeDash-standalone.html`），内嵌引擎、脚本与全部 350 个资源，运行时零网络请求，双击即可玩。 |
| `verify/` | puppeteer 无头验证套件：服务器版验收、单文件版验收、290 关全量回归、自动通关。 |
| `apk/` | 从原始 APK 提取游戏数据的 Python 脚本。 |

## 构建单文件直装版

```bash
node tools/build-standalone.js                 # 默认输出 dist/MazeDash-standalone.html
node tools/build-standalone.js --out out.html  # 自定义输出路径
```

脚本以 `web/index.html` 为模板（markup 与 CSS 的唯一来源），按原始执行顺序内联
`cocos2d-js.js`、`src/settings.js`、四个 plug 脚本、`src/project.js`、`web-port.js`、`main.js`，
并注入一套**虚拟文件系统**，把引擎的四个网络加载器替换成内存实现：

| 引擎加载器 | 单文件版的替代实现 |
| --- | --- |
| `downloadText`（json / txt / plist / xml…） | 直接从内存返回字符串 |
| `downloadBinary` | 从内存返回 `ArrayBuffer` |
| `downloadImage`（`new Image()` + `src`） | 使用内联 `data:` URI |
| `downloadAudio`（WebAudio 解码 / DOM 播放） | base64 → `ArrayBuffer` → `decodeAudioData`；DOM 模式用 `data:` URI |
| `fontLoader.loadFont`（注入 `@font-face`） | 自行注入带 `data:` URI 的 `@font-face`，并复刻引擎的 `xxx_LABEL` 字族命名 |

两个小开关让同一份源码同时服务两种形态（都由构建脚本设置）：

- `window.__MAZE_DASH_INLINE_ASSETS = true` — `main.js` 据此跳过 `file://` 盘符拦截
  与 jsList 脚本拉取；`web-port.js` 据此跳过多余的音频重试包装。
- `window.__MAZE_DASH_VFS` — 内联资源表（路径 → `[0|1, 内容]`，0 = 文本，1 = base64）。

## 注意事项

- 若 `web/index.html` 的注释标记被改动，构建脚本会直接报错（它靠这些标记定位替换点）。
- 新增资源文件后无需改脚本，`web/res/` 会被整个目录扫描。
- 体积参考：引擎 3.1 MB + 文本 0.65 MB + 二进制 4.25 MB（base64 后约 5.7 MB）≈ **9.7 MB**。
