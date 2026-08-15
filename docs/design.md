# docs/design.md — 关键设计决策

> 原则：新决策增量记录在本文件；详细推导与旧计划见仓库根目录
> 《透视步进尺-实现计划书.md》（历史文档，不再改动）。

## 1. 透视步进尺数学内核（已数值验证）

- 灭点三角形 → 垂心 H（= 主点）；H→灭点向量**两两内积 = −f²**，可反解焦距。
- **90° 视场圆**：两灭点 = 以 V1V2 为直径的圆（H 为中点，r = f）；三灭点 = 垂心圆；
  钝角三角形无实解时回退 V1V2 直径圆。
- **FOV 以摄像机框为基准**：`FOV = 2·atan(半长 / f)`（conte 480×270；genga 取项目 camera）。
- **尺寸用精确针孔投影 `f·h/Z`**（不是 atan 近似），保证头顶/脚底各自共线、同汇于视平线。
- **物距校准**：`u = f·身高 / 像高px`。
- 验证脚本：`persp-math-test/` + `tools/check_persp_math_js.py`。

## 2. 步进与方向射线

- 默认方向 = 画布垂直向下（径向朝镜头）。
- 方向线 = **射线**：一端固定角色脚底中点、只向前延伸、方向点单手柄（起点由上一方向线决定）。
- 中途改向：拉线时取笔尖最近方框的**下一个**起改向（最近方框原地不动）；第一条方向线作用于全部步数。
- 斜向/折线：**虚拟相机地面平面模型**（相机高度 `h_cam` 由校准反推），每步世界距离精确 k×步长。
- 指向天空（视平线上方）的方向点 = 走向远处纵深。

## 3. 渲染与坐标

- 分镜：`#videoPaintStageOverlay`（`drawPaintStageOverlay` 末尾挂 `drawPerspGuide`）。
- 原画：`#gengaPerspOverlay`（`drawGengaPreview` 末尾挂 `gengaDrawPerspGuide`），
  复用 `gengaViewRotValue` / `gengaViewFlipSign` 的视图变换，随缩放/旋转/翻转。
- 坐标一律 norm（0..1 纸面）；纸面/画框尺寸动态：conte 固定 561×396 / 480×270，
  genga 取 `gt.paper` / `gt.camera`（`perspGuidePaper()` / `perspGuideFrame()`）。

## 4. 交互与手势

- 透视尺激活时不落墨（conte：`beginVideoPaintStroke` 守卫；genga：`gengaDrawStart` 守卫），
  但**不拦截**双指缩放 / 空格平移 / 旋转。
- 手柄交互：抓到透视线/方向线手柄后只预览“被调整的线”，不跳新线预览；
  命中换算统一走 `perspGuideScreenPoint`（conte 纸面矩形 / genga 预览画布 + 视图变换）。

## 5. 持久化

- `perspGuide` 随项目 JSON 持久化：`projectForJsonStorage`（JSON/自动保存）与
  `buildConteFolderBundle`（ZIP 导出）两条路径；导入走 `restoreProject` / `applyWorkspaceLoadedProject`，
  经 `normalizePerspGuide` 校验恢复；旧文件无字段安全回退；撤销栈不落盘。

## 6. 撤销

- 方向线撤销 = **操作快照栈**（`walk.dirHistory`）：每次添加/替换/手柄旋转前压栈，
  撤销恢复上一步快照（任意次数、含同 from 替换）。
