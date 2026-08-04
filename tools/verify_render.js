/*
 * P0.5 像素级目检：
 *   A. drawPerspGuideDebug（静态演示）在两个缩放/平移视角下采样：纸面、垂心、90° 圆、步进框、P 点；
 *   B. drawPerspGuide（真实交互数据）——模拟用户已拉完 3 组透视线（含 2 灭点场景），
 *      采样：纸面、垂心、90° 圆、P 点、灭点标记、地平线。
 * 任一断言失败则以非零码退出。
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const { chromium } = require('playwright-core');

const HTML_PATH = process.argv[2];
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PAPER_W = 561, PAPER_H = 396;

function main() {
  const html = fs.readFileSync(HTML_PATH, 'utf8');
  const i0 = html.indexOf('const PerspMath = {');
  const i1 = html.indexOf('function drawPaintStageOverlay()');
  const block = html.slice(i0, i1);

  const pageHtml = `<!doctype html>
<html><head><meta charset="utf-8"></head><body>
<canvas id="c1" width="900" height="640"></canvas>
<canvas id="c2" width="900" height="640"></canvas>
<canvas id="c3" width="900" height="640"></canvas>
<canvas id="c4" width="900" height="640"></canvas>
<script>
const conteNormToLayerX = function(n) { return n * ${PAPER_W}; };
const conteNormToLayerY = function(n) { return n * ${PAPER_H}; };
const CONTE_PAPER_WIDTH = ${PAPER_W};
const CONTE_PAPER_HEIGHT = ${PAPER_H};
const CONTE_FRAME_W = 480;
const CONTE_FRAME_H = 270;
const state = {
  perspGuideDebug: false,
  perspGuide: {
    active: true, visible: true, stage: 'captureLines',
    lines: [], groups: [], vps: [], h: null, circleRpx: 0,
    fov: null, focalPx: 0, focalMm: 0, drag: null, lastParallel: false
  }
};
${block}
function drawInto(cv, scale, panX, panY, drawFn) {
  const ctx = cv.getContext('2d');
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, cv.width, cv.height);
  const pw = ${PAPER_W} * scale, ph = ${PAPER_H} * scale;
  const x = (cv.width - pw) / 2 + panX, y = (cv.height - ph) / 2 + panY;
  ctx.fillStyle = '#F5F3EC';
  ctx.fillRect(x, y, pw, ph);
  ctx.setTransform(scale, 0, 0, scale, x, y);
  drawFn(ctx, scale);
  return { x: x, y: y, scale: scale };
}
function sample(cv, cx, cy) {
  const d = cv.getContext('2d').getImageData(cx, cy, 1, 1).data;
  return { r: d[0], g: d[1], b: d[2] };
}
function near(cv, cx, cy, pred, rad) {
  rad = rad || 4;
  for (let dy = -rad; dy <= rad; dy++) {
    for (let dx = -rad; dx <= rad; dx++) {
      const x = Math.round(cx + dx), y = Math.round(cy + dy);
      if (x < 0 || y < 0 || x >= cv.width || y >= cv.height) continue;
      const d = cv.getContext('2d').getImageData(x, y, 1, 1).data;
      if (pred(d[0], d[1], d[2])) return { x: x, y: y, r: d[0], g: d[1], b: d[2] };
    }
  }
  return null;
}
window.__checks = [];
const toCanvas = function(m, lx, ly) { return { x: m.x + lx * m.scale, y: m.y + ly * m.scale }; };
const isYellow = function(r,g,b){ return r>230 && g>180 && b<150; };
const isPaper = function(r,g,b){ return r>230 && g>230 && b>220; };
const isGreen = function(r,g,b){ return g>r+5 && g>b+5; };
const isCyan = function(r,g,b){ return b>200 && g>170 && r<160; };

// ---- A: 静态演示（原 9 项回归）----
const m1 = drawInto(document.getElementById('c1'), 1.4, 0, 0, drawPerspGuideDebug);
const m2 = drawInto(document.getElementById('c2'), 2.0, -300, 0, drawPerspGuideDebug);
let p = toCanvas(m1, 40, 40);
window.__checks.push(['A.paper@c1', sample(document.getElementById('c1'), Math.round(p.x), Math.round(p.y)), 'paper']);
p = toCanvas(m2, 480, 300);
window.__checks.push(['A.paper@c2', sample(document.getElementById('c2'), Math.round(p.x), Math.round(p.y)), 'paper']);
p = toCanvas(m1, 280.5, 198);
window.__checks.push(['A.H@c1', near(document.getElementById('c1'), p.x, p.y, isYellow, 5), 'yellow']);
p = toCanvas(m2, 280.5, 198);
window.__checks.push(['A.H@c2', near(document.getElementById('c2'), p.x, p.y, isYellow, 5), 'yellow']);
p = toCanvas(m1, 280.5 + 300 * Math.cos(Math.PI / 4), 198 + 300 * Math.sin(Math.PI / 4));
window.__checks.push(['A.circle@c1', near(document.getElementById('c1'), p.x, p.y, function(r,g,b){ return r>220 && g>160 && b<160; }, 6), 'yellow']);
p = toCanvas(m2, 280.5 + 300, 198);
window.__checks.push(['A.circle@c2', near(document.getElementById('c2'), p.x, p.y, function(r,g,b){ return r>220 && g>160 && b<160; }, 6), 'yellow']);
p = toCanvas(m1, 236 + 44, 238 + 74);
window.__checks.push(['A.box@c1', sample(document.getElementById('c1'), Math.round(p.x), Math.round(p.y)), 'green']);
p = toCanvas(m2, 236 + 44, 238 + 74);
window.__checks.push(['A.box@c2', sample(document.getElementById('c2'), Math.round(p.x), Math.round(p.y)), 'green']);
p = toCanvas(m1, 579.40, 172.34);
window.__checks.push(['A.P@c1', near(document.getElementById('c1'), p.x, p.y, isCyan, 5), 'cyan']);

// ---- B: 真实交互数据（drawPerspGuide）----
// 模拟用户数据：3 组透视线 → 3 个灭点（与演示同一组，norm 坐标）
state.perspGuide.vps = [
  { x: -0.16389, y: 0.99949 },
  { x: 0.41696, y: -0.87052 },
  { x: 1.06211, y: 0.85041 }
];
const gm = perspGuideModel();
if (gm) {
  state.perspGuide.h = { x: gm.H[0] / ${PAPER_W}, y: gm.H[1] / ${PAPER_H} };
  state.perspGuide.circleRpx = gm.r;
  state.perspGuide.fov = gm.fov;
  state.perspGuide.focalPx = gm.f;
  state.perspGuide.focalMm = gm.fmm;
}
state.perspGuide.stage = 'linesDone'; // 完成透视线后：必须显示 90° 圆 + 垂心
const m3 = drawInto(document.getElementById('c3'), 1.4, 0, 0, drawPerspGuide);
const m4 = drawInto(document.getElementById('c4'), 2.0, -300, 0, drawPerspGuide);
p = toCanvas(m3, 280.5, 198);
window.__checks.push(['B.H@c3', near(document.getElementById('c3'), p.x, p.y, isYellow, 5), 'yellow']);
p = toCanvas(m3, 280.5 + 300, 198);
window.__checks.push(['B.circle@c3', near(document.getElementById('c3'), p.x, p.y, function(r,g,b){ return r>220 && g>160 && b<160; }, 6), 'yellow']);
// 灭点标记 V3（layer 595.84, 336.76 → 画布内）
p = toCanvas(m3, 595.84, 336.76);
window.__checks.push(['B.V3@c3', near(document.getElementById('c3'), p.x, p.y, isYellow, 6), 'yellow']);
p = toCanvas(m4, 280.5, 198);
window.__checks.push(['B.H@c4', near(document.getElementById('c4'), p.x, p.y, isYellow, 5), 'yellow']);
// 2 灭点场景：地平线（黄虚线）在两点之间
state.perspGuide.vps = state.perspGuide.vps.slice(0, 2);
state.perspGuide.h = null; state.perspGuide.circleRpx = 0;
const m5 = drawInto(document.getElementById('c1'), 1.4, 0, 0, drawPerspGuide);
const mid = { x: (state.perspGuide.vps[0].x + state.perspGuide.vps[1].x) / 2, y: (state.perspGuide.vps[0].y + state.perspGuide.vps[1].y) / 2 };
p = toCanvas(m5, mid.x * ${PAPER_W}, mid.y * ${PAPER_H});
window.__checks.push(['B.horizon@2vp', near(document.getElementById('c1'), p.x, p.y, function(r,g,b){ return r>200 && g>160 && b<200; }, 8), 'horizon']);
</script></body></html>`;

  const tmp = path.join(os.tmpdir(), 'persp_check_' + Date.now() + '.html');
  fs.writeFileSync(tmp, pageHtml, 'utf8');

  (async () => {
    const browser = await chromium.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox'] });
    const page = await browser.newPage({ viewport: { width: 1200, height: 900 } });
    await page.goto('file:///' + tmp.split('\\').join('/'));
    await page.waitForTimeout(300);
    const checks = await page.evaluate(() => window.__checks);
    await browser.close();
    fs.unlinkSync(tmp);

    let ok = true;
    checks.forEach(function(c) {
      const name = c[0], val = c[1], kind = c[2];
      const pred = { yellow: (v) => v && v.r > 230 && v.g > 180 && v.b < 150,
        paper: (v) => v && v.r > 230 && v.g > 230 && v.b > 220,
        green: (v) => v && v.g > v.r + 5 && v.g > v.b + 5,
        cyan: (v) => v && v.b > 200 && v.g > 170 && v.r < 160,
        horizon: (v) => v && v.r > 200 && v.g > 160 && v.b < 200 }[kind] || (() => false);
      const pass = pred(val);
      if (!pass) ok = false;
      console.log((pass ? 'PASS' : 'FAIL') + '  ' + name + '  ' + JSON.stringify(val));
    });
    console.log(ok ? 'ALL RENDER CHECKS PASSED' : 'SOME CHECKS FAILED');
    process.exit(ok ? 0 : 1);
  })().catch((e) => { console.error(e); process.exit(1); });
}

main();
