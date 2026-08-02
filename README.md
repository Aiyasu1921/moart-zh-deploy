# MoArt ver1248 · 简体中文版

这是 [MoArt](https://moaang.github.io/moart/) ver1248 的简体中文汉化版，
单文件网页应用（原画 + 分镜制作工具），可离线保存到本地直接用，也可部署到 GitHub Pages。

## 本地使用

直接双击打开 `index.html` 即可，无需服务器。

## 部署到 GitHub Pages

### 方式一：作为项目页（推荐，最简单）

1. 在 GitHub 新建一个仓库，例如 `moart-zh`（Public 或 Private 均可，Private 需要付费计划才能开 Pages）。
2. 把本目录的内容全部推到仓库的 `main` 分支：

   ```bash
   git init
   git add .
   git commit -m "MoArt ver1248 简体中文版"
   git branch -M main
   git remote add origin https://github.com/<你的用户名>/moart-zh.git
   git push -u origin main
   ```

3. 打开仓库 **Settings → Pages**，在 **Build and deployment** 的 **Source** 里选择
   **GitHub Actions**（仓库里已带 `.github/workflows/pages.yml`，推送后会自动发布）。
4. 访问：`https://<你的用户名>.github.io/moart-zh/`

### 方式二：放进你的用户主页仓库（`<用户名>.github.io`）

在用户主页仓库里建一个子目录，例如 `moart-zh/`，把 `index.html` 放进去并推送，
访问 `https://<你的用户名>.github.io/moart-zh/`。无需 Actions。

### 方式三：自定义子域名（例如 `zh.example.com`）

1. 在仓库根目录添加 `CNAME` 文件，内容为你的子域名（如 `zh.example.com`）。
2. 在 DNS 服务商处按 GitHub 要求添加记录（通常是在 Github Pages 设置里复制
   IP/Alias 值后添加 CNAME 或 A 记录）。
3. 在仓库 **Settings → Pages → Custom domain** 填入该子域名，等待证书签发。

## 说明

- 文件来源：https://moaang.github.io/moart/（ver1248），仅做简体中文本地化，
  未修改任何功能逻辑。
- 语言：首次打开默认为简体中文，也可在启动画面右上角切换到 日本語 / 한국어 / English。
- 统计：页面保留了原作者内置的 GoatCounter 匿名统计（原作者有意统计转载副本）。
  若不希望统计，删除 `index.html` 中两处 `goatcounter` 相关 `<script>` 即可。
- 离线/PWA：本地或线上均可用；如需“添加到主屏幕”离线缓存，可从原站复制
  `sw.js` 到本目录（无 `sw.js` 不影响正常使用）。
