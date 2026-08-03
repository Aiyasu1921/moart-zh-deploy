/*
 * P0.5 像素级目检：把透视尺绘制代码原样提取到独立页面，渲染两个视角
 * （scale=1.4 整纸 / scale=3.0 平移放大），然后采样关键位置颜色断言：
 *   纸面底色、垂心黄点、90° 圆、演示步进框（绿）、直角顶点 P（青）。
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
  const i1 = html.indexOf('// 控制台开关');
  const block = html.slice(i0, i1);

  const pageHtml = `<!doctype html>
<html><head><meta charset="utf-8"></head><body>
<canvas id="c1" width="900" height="640"></canvas>
<canvas id="c2" width="900" height="640"></canvas>
<script>
const conteNormToLayerX = function(n) { return n * ${PAPER_W}; };
const conteNormToLayerY = function(n) { return n * ${PAPER_H}; };
const CONTE_PAPER_WIDTH = ${PAPER_W};
const CONTE_PAPER_HEIGHT = ${PAPER_H};
${block}
function drawInto(cv, scale, panX, panY) {
  const ctx = cv.getContext('2d');
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, cv.width, cv.height);
  const pw = ${PAPER_W} * scale, ph = ${PAPER_H} * scale;
  const x = (cv.width - pw) / 2 + panX, y = (cv.height - ph) / 2 + panY;
  ctx.fillStyle = '#F5F3EC';
  ctx.fillRect(x, y, pw, ph);
  ctx.setTransform(scale, 0, 0, scale, x, y);
  drawPerspGuideDebug(ctx, scale);
  return { x: x, y: y, scale: scale };
}
function sample(cv, cx, cy) {
  const ctx = cv.getContext('2d');
  const d = ctx.getImageData(cx, cy, 1, 1).data;
  return { r: d[0], g: d[1], b: d[2] };
}
function near(cv, cx, cy, pred, rad) {
  const ctx = cv.getContext('2d');
  rad = rad || 4;
  for (let dy = -rad; dy <= rad; dy++) {
    for (let dx = -rad; dx <= rad; dx++) {
      const x = Math.round(cx + dx), y = Math.round(cy + dy);
      if (x < 0 || y < 0 || x >= cv.width || y >= cv.height) continue;
      const d = ctx.getImageData(x, y, 1, 1).data;
      if (pred(d[0], d[1], d[2])) return { x: x, y: y, r: d[0], g: d[1], b: d[2] };
    }
  }
  return null;
}
const m1 = drawInto(document.getElementById('c1'), 1.4, 0, 0);
const m2 = drawInto(document.getElementById('c2'), 2.0, -300, 0);
const toCanvas = function(m, lx, ly) {
  return { x: m.x + lx * m.scale, y: m.y + ly * m.scale };
};
window.__checks = [];
// 纸面底色（c1 取 layer 40,40；c2 取缩放后仍在画布内的 layer 300,300）
let p = toCanvas(m1, 40, 40);
window.__checks.push(['paper@c1', sample(document.getElementById('c1'), Math.round(p.x), Math.round(p.y))]);
p = toCanvas(m2, 480, 300);
window.__checks.push(['paper@c2', sample(document.getElementById('c2'), Math.round(p.x), Math.round(p.y))]);
// 垂心黄点 #ffd23f（r>230 g>180 b<150）
p = toCanvas(m1, 280.5, 198);
window.__checks.push(['H@c1', near(document.getElementById('c1'), p.x, p.y, function(r,g,b){ return r>230 && g>180 && b<150; }, 5)]);
p = toCanvas(m2, 280.5, 198);
window.__checks.push(['H@c2', near(document.getElementById('c2'), p.x, p.y, function(r,g,b){ return r>230 && g>180 && b<150; }, 5)]);
// 90° 圆（黄，半径300）：c1 取 45° 点；c2 取圆最右点（layer 580.5,198 → canvas 750,320）
p = toCanvas(m1, 280.5 + 300 * Math.cos(Math.PI / 4), 198 + 300 * Math.sin(Math.PI / 4));
window.__checks.push(['circle@c1', near(document.getElementById('c1'), p.x, p.y, function(r,g,b){ return r>220 && g>160 && b<160; }, 6)]);
p = toCanvas(m2, 280.5 + 300, 198);
window.__checks.push(['circle@c2', near(document.getElementById('c2'), p.x, p.y, function(r,g,b){ return r>220 && g>160 && b<160; }, 6)]);
// 步进框 1 填充（绿 tint：g 明显大于 r 与 b）
p = toCanvas(m1, 236 + 44, 238 + 74);
window.__checks.push(['box1@c1', sample(document.getElementById('c1'), Math.round(p.x), Math.round(p.y))]);
p = toCanvas(m2, 236 + 44, 238 + 74);
window.__checks.push(['box1@c2', sample(document.getElementById('c2'), Math.round(p.x), Math.round(p.y))]);
// 直角顶点 P2=(579.40,172.34) 青色（b>200 g>170 r<160）
p = toCanvas(m1, 579.40, 172.34);
window.__checks.push(['P@c1', near(document.getElementById('c1'), p.x, p.y, function(r,g,b){ return b>200 && g>170 && r<160; }, 5)]);
</script></body></html>`;

  const tmp = path.join(os.tmpdir(), 'persp_check_' + Date.now() + '.html');
  fs.writeFileSync(tmp, pageHtml, 'utf8');

  (async () => {
    const browser = await chromium.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox'] });
    const page = await browser.newPage({ viewport: { width: 1200, height: 800 } });
    await page.goto('file:///' + tmp.split('\\').join('/'));
    await page.waitForTimeout(300);
    const checks = await page.evaluate(() => window.__checks);
    await browser.close();
    fs.unlinkSync(tmp);

    const isYellow = (v) => v && v.r > 230 && v.g > 180 && v.b < 150;
    const isCyan = (v) => v && v.b > 200 && v.g > 170 && v.r < 160;
    const isPaper = (v) => v && v.r > 230 && v.g > 230 && v.b > 220;
    const isGreen = (v) => v && v.g > v.r + 5 && v.g > v.b + 5;
    let ok = true;
    checks.forEach(function(c) {
      const name = c[0], val = c[1];
      let pass;
      if (name.indexOf('paper') === 0) pass = isPaper(val);
      else if (name.indexOf('H@') === 0 || name.indexOf('circle') === 0) pass = isYellow(val);
      else if (name.indexOf('P@') === 0) pass = isCyan(val);
      else if (name.indexOf('box') === 0) pass = isGreen(val);
      else pass = false;
      if (!pass) ok = false;
      console.log((pass ? 'PASS' : 'FAIL') + '  ' + name + '  ' + JSON.stringify(val));
    });
    console.log(ok ? 'ALL RENDER CHECKS PASSED' : 'SOME CHECKS FAILED');
    process.exit(ok ? 0 : 1);
  })().catch((e) => { console.error(e); process.exit(1); });
}

main();
