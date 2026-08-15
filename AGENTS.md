# AGENTS.md — moart-zh-deploy 工作约定（文档路由）

## 项目定位

从上游 [MoArt](https://moaang.github.io/moart/) ver1248 二次开发的单文件网页工具（原画 + 分镜制作），
主线是「透视步进尺」：用灭点构造为二维动画的纵深/斜向走路提供辅助矩形。发布名 **MoArt-aiyasu**（当前 ver1.1）。

## 关键文件

- `index.html` —— 唯一主文件（约 8 万行 / 5MB：HTML+CSS+JS 全部内联）。改动前**先看 `STRUCTURE.md`**；
  定位用 Ctrl-F 搜 `## SECTION:` 或函数名，不要整文件拖进上下文。
- `STRUCTURE.md` —— 主文件分区索引（行号 + 职责，锚点可搜索）。
- `README.md` —— 只放给人看的内容（简介 / 使用 / 部署 / 目录），**不含设计**。
- `docs/plans.md` —— 计划 / 待办 / 进行中事项（带状态）。
- `docs/design.md` —— 关键设计决策（透视尺数学、虚拟相机、保存/加载、genga 覆盖层、撤销栈）。
- `docs/upstream.md` —— 上游关系与同步策略（**改上游相关逻辑前必读**）。
- `docs/testing.md` —— 详细测试流程（工具清单 + 手工清单）。
- 《透视步进尺-实现计划书.md》 —— 旧版详细设计文档（历史参考；新决策增量记录在 `docs/design.md`）。
- `persp-math-test/` —— 数学验证（Python 对照脚本）。
- `tools/` —— 开发/验证脚本（冒烟、渲染、数学、结构扫描、ZIP 检查、OCR 等）。

## 验证/测试方式

改动后至少跑：

- `python tools/check_scripts.py` —— 所有内联 `<script>` 用 node --check 查语法。
- `node tools/smoke_test.js <index.html>` —— 分镜（conte）端到端冒烟（拉透视线 → 完成 → 角色校准 → 方向线 → 撤销 → 保存 JSON/ZIP）。
- `node tools/smoke_genga.js <index.html>` —— 原画（genga）冒烟（透视尺面板、拉线、旋转跟随）。
- `python tools/check_persp_math_js.py` —— 透视尺数学对照（灭点/垂心圆/步进/round-trip）。
- `node tools/verify_render.js <index.html>` —— 覆盖层像素级渲染检查。

需要真实浏览器/真机目检的项：拉线手感、缩放/平移/翻转（含 genga 旋转）下覆盖层对齐、触控/笔输入。

## 文档约定（必须遵守）

- 文档按职责分文件，**一律不写进 README**。
- 计划/待办 → `docs/plans.md`；关键设计决策 → `docs/design.md`；上游关系与同步 → `docs/upstream.md`；
  测试流程短则写本文件、长则放 `docs/testing.md`。
- 新增或重构文档后，检查 AGENTS.md 里的路径与仓库实际一致。
- 修改与上游相关的逻辑（上游行为、汉化、统计、PWA、版权标注等）前，**必须先读 `docs/upstream.md`**。

## 分支

- `main` —— 上游 ver1248 基线（汉化 + 绑定修复）。
- `moart-aiyasu` —— 开发分支（功能均在此开发）。
- `ver1.0` —— 发布分支（当前 ver1.1；GitHub Pages 从这里部署，见 README）。
