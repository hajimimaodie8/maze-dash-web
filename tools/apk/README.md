# apk — 从原始 APK 提取数据

这些脚本用于从 `mazedash（冲撞迷阵）(1).apk` 中还原游戏数据。日常开发用不到，
只有在需要重新提取 / 核对数据时才会跑。全部只用 Python 标准库。

## 前置：解包 APK

APK 就是 zip，改后缀解压即可（Windows 上 `Expand-Archive` 对中文名不友好，建议先改名）：

```powershell
Copy-Item 'mazedash（冲撞迷阵）(1).apk' base.zip
Expand-Archive base.zip -DestinationPath apk
```

产出目录结构：

```
apk/assets/src/            游戏代码（project.js、settings.js、cocos2d-jsb.js、plug 脚本）
apk/assets/res/import/     150 个反序列化资源（场景、预制体、SpriteFrame、配置表…）
apk/assets/res/raw-assets/ 200 个原始文件（贴图、音频、字体）
```

## 脚本

| 脚本 | 作用 | 主要输出 |
| --- | --- | --- |
| `extract_assets.py` | 扫描 `res/import/**.json`，取出所有 `cc.JsonAsset` 与 `cc.TextAsset` | `config/levels`、`config/theme`、`config/worlds`、`config/quest`、`config/face`、`config/game_lang`、`config/stage_cfg`，以及 `Puzzle/package1..8.txt`（即仓库 `data/` 下的文件） |
| `pkgcheck.py` | 校验 8 个 package 文件：编号范围、是否重叠、是否有缺号、地图是否为矩形 | 控制台报告 |
| `levelcheck.py` | 汇总每个世界的关卡数、`mapId` 覆盖情况、用到的图块字符 | 控制台报告 |
| `extract_art.py` | 解析压缩 uuid 后按 SpriteFrame 名字导出 PNG（写编辑器做图块预览时有用） | `<out>/<name>.png` + `_spriteframe_index.json` |
| `asset_table.py` | 建立「资源路径 → id → 压缩 uuid → 实际文件」的完整对照表 | `asset_table.json` |

## 关键实现细节

- **压缩 uuid**：`settings.js` 的 `uuids` 数组存的是 22 字符压缩 uuid（前 2 位 + 每 2 个
  base64 字符展开成 3 个 hex 字符）。`extract_art.py` 与 `asset_table.py` 里的 `decode_uuid()`
  是 Creator 官方的解码算法，做任何按 uuid 定位资源的工具都需要它。
- **打包资源**：`res/import/` 里的文件名有两种 —— 36 字符是普通资源（uuid），
  9 字符是 `settings.packedAssets` 里的包 ID（一组资源合并下载）。
- **`md5AssetsMap` 为空**：本包的 `settings.js` 里是 `{}`，所以运行时 URL 不带 hash 后缀，
  文件名与运行期路径一一对应。
- **TTF 字体**：存放方式是 `<前2位>/<uuid>/<原文件名>.ttf`（不是 `uuid.ttf`），
  与其他 raw-asset 不同，做资源定位时要单独处理。
