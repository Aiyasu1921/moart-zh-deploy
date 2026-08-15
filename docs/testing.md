# docs/testing.md — 测试流程与验证清单

> 本文件是 AGENTS.md「验证/测试方式」的详细版。改动 `index.html` 后按下面分层执行；
> 改动很小（文案/样式）时至少跑「快速验证」，涉及透视尺数学/交互/渲染时跑完整清单。

## 1. 快速验证（改动后必跑）

按顺序执行，全部通过才算完成一轮：

```bash
python tools/check_scripts.py            # 所有内联 <script> 语法
node tools/smoke_test.js index.html      # 分镜（conte）端到端冒烟
node tools/smoke_genga.js index.html     # 原画（genga）冒烟
python tools/check_persp_math_js.py      # 透视尺数学对照
node tools/verify_render.js index.html   # 覆盖层像素级渲染检查
```

## 2. 自动工具明细

### 语法与结构

- `python tools/check_scripts.py` —— 提取 `index.html` 全部内联 `<script>`，用 `node --check` 查语法。
- `python tools/scan_structure.py` —— 输出结构目录素材（行数、分区横幅注释、顶层函数锚点），
  用于维护 `STRUCTURE.md`（`anchors` / `sections` / `sample` 模式）。
- `python tools/find_fn_end.py` —— 定位某函数声明的结束大括号行号（改大函数前确认边界）。

### 数学对照

- `python tools/check_persp_math_js.py` —— 把 `PerspMath` 内核提取到 Node 实际执行：
  A. `perspDebugModel` 与 `persp-math-test/demo_geometry.py` 期望值对账；
  B. 模拟拉 3 组透视线 → `perspGuideCompute` 应恢复已知灭点与焦距。
- `python persp-math-test/verify_persp_ruler.py` —— P0 数学验证（共圆性、垂心=主点、
  两两内积=−f²、圆半径=f、FOV 公式、原型公式对照；随机三角形，误差 ≤ 5e-13）。

### 端到端冒烟（无头 Chrome + playwright-core）

- `node tools/smoke_test.js index.html` —— 分镜全流程：新建 → 映像編集 → 拉 4 条线 →
  2 灭点（第二组吸附视平线）→ 工具激活时缩放/平移可用 → 把手拖动 → 完成（仅透视线）→
  90° 视场圆 / FOV 读数 → 切回分镜用纸全隐藏。全程收集 pageerror / console.error。
- `node tools/smoke_genga.js index.html` —— 原画模式：面板显示、拉 2 条线 → 灭点 1、
  覆盖层非空、旋转后仍对齐。
- `node tools/smoke_modes.js index.html` —— 分镜两种模式（纸面 / 映像編集）画笔落墨与缩放回归。
- `node tools/smoke_zoom.js index.html` —— 视频编辑态滚轮缩放对照（无透视尺 / 有透视尺 / 缩放按钮）。
- `node tools/smoke_layout.js index.html` —— 透视尺按钮在 1280/1024/900/768/640 宽度下可见。
- `node tools/verify_render.js index.html` —— 覆盖层像素级采样（静态演示 + 真实交互数据：
  3 组线与 2 灭点场景；纸面、垂心、90° 圆、P 点、灭点、地平线）。任一断言失败非零退出。
- `node tools/render_preview.js index.html` —— 生成透视尺渲染预览 PNG（人工目检用）。

### 持久化 / 导入

- `python tools/inspect_conte_zip.py <file.conte.zip>` —— 列出 ZIP 条目、导出主 JSON、
  检查 `perspGuide` 是否存在及其内容（验证保存/加载是否带透视尺数据）。
- 手工：保存项目 JSON / ZIP → 重开恢复 → 旧版无 `perspGuide` 字段的文件打开零报错。

## 3. 回归矩阵（改动影响面广时逐项过）

| 范围 | 检查项 |
| --- | --- |
| 工具系统 | 透视尺 ↔ 画笔 / 形状 / 变换各工具互不干扰；切换后覆盖层正常 |
| 坐标系 | 缩放、平移、水平/垂直翻转后辅助图形与纸面对齐；genga 下含旋转 |
| 摄像机 | 摄像机工具移动 / 关键帧改变取景时，透视尺锚定画布坐标不跟随 |
| 模式 | 分镜（纸面 / 映像編集）与原画（genga）行为一致；分镜用纸界面不显示透视尺 |
| 持久化 | JSON / ZIP 保存 → 重开完整恢复；旧文件安全回退；撤销栈不落盘 |
| 语言 | zh / ja / ko / en 四语切换后面板文案完整 |
| 输入设备 | 鼠标 + 触控笔 + 触屏（双指平移不误触透视尺）；抓手柄后不再跳新线预览 |
| 零回归 | 无透视尺数据时，原有绘制 / 导出 / 撤销行为零变化 |

## 4. 手工目检清单（自动化覆盖不到的项）

- 拉线手感与吸附（15° 增量、水平视平线提示、第二灭点改到实际两灭点连线）。
- 完成透视线后：90° 视场圆 + 垂心显示；三角形 / 平行线 / P 点不显示；按钮灰掉、把手消失。
- 步进矩形：默认垂直向下；斜向/折线时脚底共线、头顶共线、同汇视平线；矩形形状比例不变。
- 方向线：起点在角色方框脚底中点、射线只向前延伸、中途改向从最近方框的下一个起。
- 撤销：添加/替换/旋转方向线任意次数（>5）后逐条退回，退回完成后按钮变灰。
- 真机目检 genga：缩放 / 平移 / 翻转（含旋转）下覆盖层对齐；触控 / 笔输入。
- 发布版：`ver1.0` 分支部署到 GitHub Pages 后，直接双击与线上访问行为一致。

## 5. 已知覆盖缺口（TODO）

- 无自动化的真机/触控笔测试（第 4 节清单需人工执行）。
- 摄像机运动关键帧 + 透视尺锚定场景暂无独立自动化，靠手工回归。
- `tools/ocr_images.js` 等临时脚本不在主验证链中，属一次性辅助。
