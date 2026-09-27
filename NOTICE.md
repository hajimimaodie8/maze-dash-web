# 版权与许可说明

## 游戏本体

《冲撞迷阵 Maze Dash》(包名 `com.umbrella.mazedash`) 的**游戏代码、关卡数据、美术与音频资源**
版权归原开发方（Umbrella Fun / Cheetah Mobile 相关主体）所有。

本仓库是对该游戏的非官方网页版移植，基于**已获得的原开发者授权**制作。
仓库内 `web/src/`、`web/res/`、`data/` 下的内容均直接取自原 APK，未作修改
（`web/src/` 与 `web/res/` 的每个文件都与 APK 内对应文件 SHA-256 一致）。

如果你不是授权方，请不要分发本仓库中的游戏资源。若权利方希望下架，请联系仓库所有者。

## 引擎

`web/cocos2d-js.js` 由 Cocos 官方引擎仓库
[cocos/cocos-engine](https://github.com/cocos/cocos-engine) 的 **tag `2.0.2`**
（commit `53a9e9b3`）源码构建而成（`gulp build-html5`）。

该引擎源码头部载明的许可为 MIT 风格，但**额外限制**：不得用其开发、发布、再许可或销售
Cocos Creator 软件或工具本身。使用随附引擎时请一并遵守该条款。
引擎中的版本字符串已由仓库硬编码的 `"2.0.0 alpha"` 更正为 `"2.0.2"`，以与游戏原生引擎一致。

## 本仓库新增的代码

以下文件是本仓库新增的移植层，可自由使用：

| 文件 | 说明 |
| --- | --- |
| `web/index.html`、`web/main.js` | 浏览器外壳与启动引导（由 APK 的 `main.js` 改写） |
| `web/web-port.js` | 移植适配层（体力、音频、键盘、容错） |
| `web/serve.js`、`web/start.bat`、`web/start.sh` | 本地静态服务器与启动脚本 |
| `tools/build-standalone.js` | 单文件直装版构建脚本 |
| `tools/verify/*` | puppeteer 无头验证套件 |
| `tools/apk/*` | 从 APK 提取数据的脚本 |
| `data/README.md`、`README.md`、`PORT_NOTES.md`、`NOTICE.md` | 文档 |

## 已移除的第三方组件

原 APK 内含的广告、支付、统计与崩溃上报 SDK（Google Play Services Ads、Bugly、infoc、
ANYS 等）在本移植中**完全未被使用**；这些调用点在浏览器里退化为空操作。
本移植不收集任何数据。
