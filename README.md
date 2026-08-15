# MoArt-aiyasu ver1.1 · 简体中文版（完整功能版）

这是 [MoArt](https://moaang.github.io/moart/) ver1248 二次开发的个人分支 **MoArt-aiyasu**
（版本号从 **ver1** 重新计，ver1.1 为完整功能版）。单文件网页应用（原画 + 分镜制作工具），
主线是「透视步进尺」：基于三点透视的灭点构造，为二维动画的纵深 / 斜向走路提供辅助矩形。

可以直接双击 `index.html` 离线使用，也可以部署到 GitHub Pages 在线访问。

## 本地使用

直接双击打开 `index.html` 即可，无需服务器、无需构建步骤。

## 部署到 GitHub Pages

### 方式一：作为项目页（推荐，最简单）

1. 在 GitHub 新建一个仓库（Public 或 Private 均可，Private 需要付费计划才能开 Pages）。
2. 把本目录内容推到仓库 `main` 分支：

   ```bash
   git init
   git add .
   git commit -m "MoArt ver1248 简体中文版"
   git branch -M main
   git remote add origin https://github.com/<你的用户名>/<仓库名>.git
   git push -u origin main
   ```

3. 打开仓库 **Settings → Pages**，在 **Build and deployment** 的 **Source** 里选择
   **GitHub Actions**（仓库里已带 `.github/workflows/pages.yml`，推送后自动发布）。
4. 访问：`https://<你的用户名>.github.io/<仓库名>/`

### 方式二：放进用户主页仓库（`<用户名>.github.io`）

在主页仓库建子目录（如 `moart-zh/`），把 `index.html` 放进去并推送，无需 Actions。

### 方式三：自定义子域名

1. 仓库根目录添加 `CNAME` 文件，内容为子域名（如 `zh.example.com`）。
2. 在 DNS 服务商按 GitHub 要求添加 CNAME 或 A 记录。
3. 在 **Settings → Pages → Custom domain** 填入该子域名，等待证书签发。

## 目录说明

- `index.html` —— 唯一主文件（HTML + CSS + JS 全部内联）。结构与行号索引见 `STRUCTURE.md`。
- `README.md` —— 本文件：项目简介、使用、部署。
- `STRUCTURE.md` —— `index.html` 分区 / 行号 / 锚点索引（改代码前先看）。
- `AGENTS.md` —— 开发约定：关键文件、验证方式、文档路由（开发者入口）。
- `docs/plans.md` —— 计划与待办（已完成 / 进行中 / 计划中，带状态）。
- `docs/design.md` —— 关键设计决策（透视尺数学、步进模型、渲染、持久化、撤销）。
- `docs/upstream.md` —— 上游关系与同步策略（修改上游相关逻辑前必读）。
- `docs/testing.md` —— 测试流程：自动工具清单、回归矩阵、手工目检清单。
- 《透视步进尺-实现计划书.md》 —— 旧版详细设计文档（历史参考）。
- `persp-math-test/` —— 透视尺数学验证（Python 对照脚本）。
- `tools/` —— 开发 / 验证脚本（冒烟、渲染、数学、结构扫描、ZIP 检查等）。

## 说明

- 语言：首次打开默认为简体中文，可在启动画面右上角切换 日本語 / 한국어 / English。
- 统计：页面保留原作者内置的 GoatCounter 匿名统计（原作者有意统计转载副本）。
  若不希望统计，删除 `index.html` 中两处 `goatcounter` 相关 `<script>` 即可。
- 离线 / PWA：本地或线上均可用；如需“添加到主屏幕”离线缓存，可从原站复制
  `sw.js` 到本目录（无 `sw.js` 不影响正常使用）。
- 开发分支与版本策略见 `AGENTS.md`；上游来源与同步注意事项见 `docs/upstream.md`。
