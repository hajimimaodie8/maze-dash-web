# verify — 无头浏览器验证套件

用 puppeteer-core 驱动本机已安装的 Chrome / Edge，对移植结果做端到端验证。

## 准备

```bash
cd tools/verify
npm install
```

脚本顶部有 `CHROME` 常量，默认指向
`C:\Users\Lenovo\AppData\Local\Google\Chrome\Application\chrome.exe`，
换机器请改成自己的浏览器路径（Edge 也可）。

## 套件

| 脚本 | 命令 | 覆盖内容 |
| --- | --- | --- |
| `acceptance.js` | `npm run test:http` | 服务器版 17 项验收：引擎版本、数据完整性、语言、舞台尺寸、体力适配、音频解码、场景流程、进入第 1 关、真实滑动通关、进度落盘、无报错 |
| `standalone.js` | `npm run test:standalone` | 单文件版 14 项验收：同样覆盖，另加**网络请求数必须为 0**、虚拟文件系统命中统计、内嵌字体可用性 |
| `alllevels.js` | `npm run test:alllevels` | 直接驱动真实 `game_map`：重建全部 290 张棋盘，灌入各自 `sz_solution` 重放，逐关校验 `checkClearSatge()` |
| `solver.js` | `npm run test:solver -- 10` | 通过**真实滑动**自动通关：读当前关的 `sz_solution`，逐步滑动并校验每一步是否真的移动了蛇头 |
| `responsive.js` | `npm run test:responsive` | 在 5 种窗口尺寸下（手机竖屏 / 9:16 / 桌面横屏 / 超宽 / 高窄）截图并核对画布尺寸、缩放、可见区、背景色与角标位置；包含运行中改窗口大小 |
| `coldstart.js` | `npm run test:coldstart` | **冷启动**（直接用某个窗口尺寸打开，而不是先开后缩放）时的自适应策略是否正确 |
| `live.js` | `npm run test:live` | 加载已部署的 Pages 站点，跑一遍引擎/数据/场景流程/真实滑动通关，并检查页面无报错、无失败请求 |
| `filetest.js` | `npm run test:file-guard` | 故意用 `file://` 打开服务器版，验证出现的是可操作的提示页而不是卡死的进度条 |
| `gameplay.js` | `node gameplay.js` | 较早的单关细粒度检查（棋盘布局、格子数、通关流程） |

## 说明

- 每个脚本都会自己拉起 `web/serve.js`（服务器版测试）或直接打开本地文件（单文件版测试），
  用完即关，不依赖外部服务。
- 每个脚本使用独立的 Chrome 用户目录（`chrome-profile-*`），避免宿主浏览器的插件干扰
  —— 例如 Internet Download Manager 的 “Advanced Integration” 会劫持所有 `.mp3` 的 XHR
  并返回空 204。
- 全部脚本以退出码报告结果：`0` 全通过，`2` 有失败项，`1` 是脚本自身异常。
- `alllevels.js` 的预期结果是 **289/290**：`mapId 5` 的内置解法串本身不完整（见 `data/README.md`）。
