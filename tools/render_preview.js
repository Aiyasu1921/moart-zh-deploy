/*
 * P0.5 预览图：把 index.html 中的透视尺代码（PerspMath + 交互逻辑 + drawPerspGuide）
 * 原样提取，在独立页面用与 drawPaintStageOverlay 相同的纸面变换渲染：
 *   左：真实交互数据（3 组透视线 → 灭点/三角形/垂心/90° 圆/直角顶点，scale=1.4）；
 *   右：两灭点场景（地平线提示，scale=1.4）。
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
  const i1 = html.indexOf('function drawPaintStageOverlay()');
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
  <div class="card">3 组透视线完成 → 垂心 + 90° 圆<canvas id="c1" width="860" height="620"></canvas></div>
  <div class="card">2 个灭点完成 → 直径圆 + 视平线<canvas id="c2" width="860" height="620"></canvas></div>
  <div class="card">P1 角色校准：矩形 + 身高 → 肩宽 / 物距 u<canvas id="c3" width="860" height="620"></canvas></div>
  <div class="card">P2.2 方向射线 + 中途改向：一次生成全部步数<canvas id="c4" width="860" height="620"></canvas></div>
</div>
<script>
const conteNormToLayerX = function(n) { return n * ${PAPER_W}; };
const conteNormToLayerY = function(n) { return n * ${PAPER_H}; };
const CONTE_PAPER_WIDTH = ${PAPER_W};
const CONTE_PAPER_HEIGHT = ${PAPER_H};
const CONTE_FRAME_W = 480;
const CONTE_FRAME_H = 270;
const window = {};
const state = {
  perspGuide: {
    active: true, visible: true, stage: 'captureLines',
    lines: [], groups: [], vps: [], h: null, circleRpx: 0,
    fov: null, focalPx: 0, focalMm: 0, drag: null, lastParallel: false
  }
};
${block}
function drawInto(cv, scale, panX, panY, flip) {
  const ctx = cv.getContext('2d');
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, cv.width, cv.height);
  const pw = ${PAPER_W} * scale, ph = ${PAPER_H} * scale;
  const x = (cv.width - pw) / 2 + panX, y = (cv.height - ph) / 2 + panY;
  ctx.fillStyle = '#F5F3EC';
  ctx.fillRect(x, y, pw, ph);
  ctx.strokeStyle = '#8B8B84';
  ctx.strokeRect(x, y, pw, ph);
  if (flip) ctx.setTransform(-scale, 0, 0, scale, x + pw, y);
  else ctx.setTransform(scale, 0, 0, scale, x, y);
  drawPerspGuide(ctx, scale);
}
// 模拟用户拉的 3 组透视线（每组 2 条），交点 = 演示灭点
const VPS_LAYER = [[-91.94, 395.80], [233.91, -344.73], [595.84, 336.76]];
const ANCHORS_LAYER = [
  [[201.96, 300.96], [117.80, 245.50]],
  [[246.84, 150.48], [308.55, 217.80]],
  [[381.48, 293.04], [460.02, 245.52]]
];
VPS_LAYER.forEach(function(vp, gi) {
  ANCHORS_LAYER[gi].forEach(function(a) {
    const a2 = [a[0] + 0.35 * (a[0] - vp[0]), a[1] + 0.35 * (a[1] - vp[1])];
    state.perspGuide.lines.push({
      a: { x: a[0] / ${PAPER_W}, y: a[1] / ${PAPER_H} },
      b: { x: a2[0] / ${PAPER_W}, y: a2[1] / ${PAPER_H} }
    });
  });
});
perspGuideCompute();
state.perspGuide.stage = 'linesDone'; // 完成透视线后显示 90° 圆 + 垂心
drawInto(document.getElementById('c1'), 1.4, 0, 0, false);
// 右：只保留前两组（两点透视 → 视平线吸附 + 直径圆）
state.perspGuide.lines = state.perspGuide.lines.slice(0, 4);
state.perspGuide.vps = []; state.perspGuide.h = null; state.perspGuide.circleRpx = 0;
state.perspGuide.fov = null; state.perspGuide.focalPx = 0; state.perspGuide.focalMm = 0;
perspGuideCompute();
drawInto(document.getElementById('c2'), 1.4, 0, 0, false);
// P1：角色校准（绿色矩形 + 脚底线；90° 圆保留）
state.perspGuide.stage = 'calibCharacter';
state.perspGuide.character = { box: { x: 0.45, y: 0.20, w: 0.16, h: 0.34 }, heightCm: 160, shoulderCm: 0, uCm: 0 };
perspGuideCalibrate();
drawInto(document.getElementById('c3'), 1.4, 0, 0, false);
// P2.2：方向射线（第一条 from=1，第二条 from=3 起改向），每 60cm 一步
state.perspGuide.stage = 'walkPath';
state.perspGuide.walk = { stepCm: 60, stepCount: 5, dirs: [], steps: [] };
state.perspGuide.walk.dirs = [
  { from: 1, b: { x: 0.66, y: 0.40 } },
  { from: 3, b: { x: 0.72, y: 0.10 } }
];
perspGuideWalk();
drawInto(document.getElementById('c4'), 1.4, 0, 0, false);
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
