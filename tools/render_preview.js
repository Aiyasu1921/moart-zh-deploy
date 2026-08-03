/*
 * P0.5 目检辅助：把 index.html 中的透视尺绘制代码（PerspMath + drawPerspGuideDebug）
 * 原样提取，在独立页面里用与 drawPaintStageOverlay 相同的纸面变换画两遍：
 *   左：scale=1.4 整纸视图；右：scale=3.0 + 平移（主点居中）——验证图形随纸面缩放/平移。
 * 用无头 Chrome + playwright-core 截图到 PNG。
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const { chromium } = require('playwright-core');

const HTML_PATH = process.argv[2];
const OUT_PNG = process.argv[3];
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PAPER_W = 561, PAPER_H = 396;

function main() {
  const html = fs.readFileSync(HTML_PATH, 'utf8');
  const i0 = html.indexOf('const PerspMath = {');
  const i1 = html.indexOf('// 控制台开关');
  if (i0 < 0 || i1 < 0) throw new Error('cannot locate persp block');
  const block = html.slice(i0, i1);

  const pageHtml = `<!doctype html>
<html><head><meta charset="utf-8">
<style>
  body { margin: 0; background: #22252A; color: #ccc; font: 12px system-ui, sans-serif; }
  .row { display: flex; gap: 16px; padding: 14px; }
  .card { background: #2F3338; border: 1px solid #44484E; border-radius: 8px; padding: 8px; }
  canvas { background: #3A3E44; border-radius: 4px; display: block; }
</style></head>
<body><div class="row">
  <div class="card">scale=1.4 整纸<canvas id="c1" width="860" height="620"></canvas></div>
  <div class="card">scale=3.0 + 平移(主点居中)<canvas id="c2" width="860" height="620"></canvas></div>
</div>
<script>
const conteNormToLayerX = function(n) { return n * ${PAPER_W}; };
const conteNormToLayerY = function(n) { return n * ${PAPER_H}; };
const CONTE_PAPER_WIDTH = ${PAPER_W};
const CONTE_PAPER_HEIGHT = ${PAPER_H};
${block}
function drawInto(cv, scale, panX, panY, flip) {
  const ctx = cv.getContext('2d');
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, cv.width, cv.height);
  const pw = ${PAPER_W} * scale, ph = ${PAPER_H} * scale;
  const x = (cv.width - pw) / 2 + panX, y = (cv.height - ph) / 2 + panY;
  // 纸面底图（浅色矩形，模拟画纸）
  ctx.fillStyle = '#F5F3EC';
  ctx.fillRect(x, y, pw, ph);
  ctx.strokeStyle = '#8B8B84';
  ctx.strokeRect(x, y, pw, ph);
  // 与 drawPaintStageOverlay 相同的纸面→屏幕变换（layer 空间）
  if (flip) ctx.setTransform(-scale, 0, 0, scale, x + pw, y);
  else ctx.setTransform(scale, 0, 0, scale, x, y);
  drawPerspGuideDebug(ctx, scale);
}
drawInto(document.getElementById('c1'), 1.4, 0, 0, false);
drawInto(document.getElementById('c2'), 3.0, -40, -60, false);
</script></body></html>`;

  const tmp = path.join(os.tmpdir(), 'persp_preview_' + Date.now() + '.html');
  fs.writeFileSync(tmp, pageHtml, 'utf8');

  (async () => {
    const browser = await chromium.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox'] });
    const page = await browser.newPage({ viewport: { width: 1860, height: 700 } });
    await page.goto('file:///' + tmp.split('\\').join('/'));
    await page.waitForTimeout(400);
    await page.screenshot({ path: OUT_PNG });
    await browser.close();
    fs.unlinkSync(tmp);
    console.log('screenshot saved:', OUT_PNG);
  })().catch((e) => { console.error(e); process.exit(1); });
}

main();
