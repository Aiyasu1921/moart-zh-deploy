# STRUCTURE.md — index.html 结构索引

主文件 `index.html`：单文件应用（HTML + CSS + JS 全部内联），约 8 万行 / 5MB。

> 行号取自 2026-08 快照，**仅供参考**（文件持续变化会漂移）。权威定位方式：
> Ctrl-F 搜 `## SECTION:`（文件内自带官方 FILE MAP，见约 12299 行）或直接搜函数名。

## 顶层布局（1 ~ 11994）

| 区域 | 约行号 | 职责 |
| --- | --- | --- |
| `<head>` + PWA 脚本 | 1 ~ 80 | 元信息、service worker 注册 |
| 第一段 `<style>` | 81 ~ 7622 | 主题/外壳/UI 组件 CSS |
| `<body>` 标记 | 7624 ~ 8744 | 顶栏、品牌、工具条（透视尺按钮 ~7804）、舞台标记（`conteVideoStage` ~8191、`gengaStage` ~8192）、对话框 |
| 第二段 `<style>` | 8745 ~ 11994 | 对话框/时间线/更多 UI CSS |

## 官方分区（`## SECTION:` 标记，行号按 2026-08 快照）

| # | 分区 | 约行号 | 职责 |
| --- | --- | --- | --- |
| 1 | I18N（dict + t()） | 12391 | 三语字典 + 解析器（zh/ja/ko/en） |
| 2 | CONSTANTS + SHORTCUT ACTION DEFS | 14500 | APP_* 常量、纸面/画框几何、快捷键动作表 |
| 3 | STATE SINGLETON | 14963 | 唯一的 `const state` |
| 4 | DEVICE RUNTIME + UI SCALE + PHONE SHELL | 15351 | 移动/平板检测、uiScale、手机 UI |
| 5 | UNDO / HISTORY COMMAND BUSES | 16455 | fastClone、capture/apply、runCommand 族、undo/redo |
| 6 | CONTE PAPER + camera paper-rect | 19169 | 分镜纸面几何、摄像机矩形统一 |
| 7 | IMPORT: SCENARIO PACKAGE (.json) | 19518 | 读取场景工具导出的 JSON 包 |
| 8 | CONTE LAYERS（data model + lanes） | 22084 | 图层/分镜格数据、lane 布局 |
| 9 | AUDIO CLIPS（model + timing） | 24825 | 对白/录音片段、裁剪、同步 |
| 10 | VIDEO TIMELINE + OL | 25630 | 时间线构建、叠化/交叉、slot |
| 11 | TIMELINE DOM | 27201 | 轨道/标尺/滚动条 HTML 构建 |
| 12 | CONTE-LAYER TIMELINE（interaction） | 30695 | lane 选择/拖放/右键菜单 |
| 13 | AUDIO PLAYBACK | 34481 | 播放时钟、音频调度 |
| 14 | P2 PLAYBACK COMPOSITOR | 35398 | 播放/scrub 时的持久画布 |
| 15 | VIDEO PREVIEW RENDER | 35576 | 预览合成、OL 叠化、摄像机变换 |
| 16 | VOICEVOX / TTS AUDIO | 40568 | TTS 合成 + 声线配置 |
| 17 | CUT / PANEL STRUCTURE OPS | 43689 | 分镜格增删/移动/复制 |
| 18 | WORKSPACE FILE IO / IndexedDB | 44019 | 文件夹句柄、媒体 blob、压缩、包导出 |
| 19 | PAINT TOOL STATE + BRUSH KERNEL | 46708 | 画笔状态、颜色、笔刷库、压力、印章 |
| 20 | MEMO / DRAWING SUBSYSTEM | 50386 | 画布绘制（纸面 memo + 视频图层位图）；**含透视步进尺子区** |
| 21 | MEMO TOOLS / UI STATE | 58253 | 画笔/橡皮/套索/变换工具、工具条 |
| 22 | SHORTCUTS + GLOBAL KEYDOWN | 59666 | 快捷键动作定义 UI + 解析器 |
| 23 | EXPORT: VIDEO + IMAGES | 61406 | 帧渲染、WebM 录制、批量导出 |
| 24 | GENGA: STORAGE + AUDIO + SHEET IO | 62720 | 原画存储、音频、批量导出、sheet JSON |
| 25 | GENGA: SHEET FOLDER IMPORT | 64672 | 自动 sheet 文件夹/ZIP 扫描、时间线构建 |
| 26 | GENGA: PROJECT / SETTINGS | 67338 | normalize、创建/设置对话框 |
| 27 | GENGA: TIMELINE OPS | 68030 | merge / In-Out / 透明度 / 中间重复 |
| 28 | GENGA: FX + CAMERA FX | 69311 | 图层 FX、关键帧、gizmo、浮动 FX 窗口 |
| 29 | SHARED FX KERNELS | 70073 | fxScrub 状态机 + FX 求值 + 关键帧动词 |
| 30 | GENGA: PREVIEW RENDER | 70835 | 帧合成、预览绘制、洋葱皮 |
| 31 | GENGA: DRAWING / SELECTION | 72627 | 笔划管线、选区 quad、变换、合并 |
| 32 | GENGA: TIMELINE VIEW | 77181 | 律表渲染、格子、曝光、scrub |
| 33 | CORE UTILS + REFRESH | 78419 | escape、drop 辅助、guardedRender/refresh |
| 34 | DOCK / FLOATING WINDOW SHELL | 78685 | 检查器/时间线 dock、tear-off、浮动 |
| 35 | INIT / BOOTSTRAP | 79620 | 事件接线、启动、性能 HUD |

> 另有 `CACHE REGISTRY`（约 25610 行）：所有渲染/计算缓存的失效规则。

## 本项目新增子区：透视步进尺（分镜 + 原画）

位于分区 20（MEMO/DRAWING）内部，约 51819 ~ 52973：

| 锚点 | 约行号 | 职责 |
| --- | --- | --- |
| `// ===== 透视步进尺` / `const PerspMath` | 51819 / 51821 | 透视尺数学内核（灭点/垂心/圆/焦距） |
| `perspGuideCompute` / `perspGuideWalk` | 52238 / 52443 | 灭点计算 / 步进生成（方向射线） |
| `normalizePerspGuide` | 52725 | 保存/加载恢复与校验 |
| `drawPerspGuide` | 52768 | 覆盖层绘制（透视线/圆/角色框/步进框/方向线） |
| `drawPaintStageOverlay` | 52974 | 分镜覆盖层入口（末尾挂 drawPerspGuide） |
| `gengaDrawPerspGuide` / `#gengaPerspOverlay` | 约 52900 区 | 原画覆盖层（挂入 `drawGengaPreview` 末尾） |

## 常用函数锚点速查

| 函数 | 约行号 | 用途 |
| --- | --- | --- |
| `createInitialProject` | 16363 | 新建项目 |
| `restoreProject` | 17494 | 项目恢复（JSON/自动保存/导入） |
| `normalizeProjectSnapshot` | 19405 | 项目快照规范化 |
| `resetProjectForNewProject` | 19959 | 新建项目重置 |
| `renderStageView` | 35370 | 分镜舞台渲染入口 |
| `projectForJsonStorage` | 45413 | 项目 JSON 序列化（含 perspGuide） |
| `buildConteFolderBundle` / `exportConteFolderZip` | 45696 / 45835 | ZIP 导出（含 perspGuide） |
| `importConteFolderZip` | 46050 | ZIP 导入（走 restoreProject） |
| `beginPaintStroke` / `beginVideoPaintStroke` | 55624 / 55984 | 画笔输入入口（conte） |
| `selectPaintEditTool` | 58113 | 编辑工具切换 |
| `updatePaintUI` / `setActivePaintTool` | 59390 / 59552 | UI 刷新 / 工具分发 |
| `drawGengaPreview` / `gengaDrawStart` | 71963 / 72698 | 原画预览绘制 / 原画输入入口 |
| `refresh` | 78638 | 全局刷新（按模式分发渲染） |
| `bindEvents` | 79623 | 事件接线（启动末尾） |
