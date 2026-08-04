/*
 * 透视尺端到端冒烟测试（无头 Chrome）：
 *   新建分镜项目 → 视频编辑 → 透视尺：
 *     1) 拉 4 条线 → 2 个灭点（第 2 组吸附到视平线）；
 *     2) 工具激活时滚轮缩放可用、空格平移不产生透视线；
 *     3) 把手拖动调整透视线不报错；
 *     4) 点“完成（仅透视线）” → 自动绘出 90° 视场圆（f/FOV 读数出现）；
 *     5) 切回“分镜用纸”→ 透视尺关闭、面板隐藏、覆盖层清空；
 *   全程收集 pageerror/console.error。
 */
const { chromium } = require('playwright-core');

const HTML_PATH = process.argv[2];
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';

(async () => {
  const browser = await chromium.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !/ERR_NETWORK_ACCESS_DENIED/.test(m.text())) errors.push(m.text()); });

  await page.goto('file:///' + HTML_PATH.split('\\').join('/'));
  await page.waitForTimeout(3000);
  await page.evaluate(() => document.getElementById('projectStartNewBtn').click());
  await page.waitForTimeout(1200);
  await page.evaluate(() => {
    const d = document.getElementById('projectCreateDialog');
    const b = Array.from(d.querySelectorAll('button')).find(function(x) { return /创建|create/i.test(x.textContent); });
    b.click();
  });
  await page.waitForTimeout(3000);
  await page.evaluate(() => { const b = document.getElementById('videoEditToggleBtn'); if (b) b.click(); });
  await page.waitForTimeout(1500);

  const paper = await page.evaluate(() => {
    const p = document.querySelector('#conteVideoStage .conte-paper');
    const r = p.getBoundingClientRect();
    return { x: r.x, y: r.y, w: r.width, h: r.height };
  });

  // 激活透视尺
  await page.evaluate(() => { const b = document.querySelector('[data-paint-guide="persp"]'); if (b) b.click(); });
  await page.waitForTimeout(400);
  const panel = await page.evaluate(() => ({
    sectionHidden: document.querySelector('[data-paint-inline="persp"]') ? document.querySelector('[data-paint-inline="persp"]').hidden : null,
    btnActive: document.querySelector('[data-paint-guide="persp"]') ? document.querySelector('[data-paint-guide="persp"]').classList.contains('active') : null
  }));
  console.log('PANEL', JSON.stringify(panel));

  // 拉 4 条线（纸面上部可见区）
  const lines = [
    { x1: paper.x + paper.w * 0.15, y1: paper.y + paper.h * 0.30, x2: paper.x + paper.w * 0.45, y2: paper.y + paper.h * 0.22 },
    { x1: paper.x + paper.w * 0.10, y1: paper.y + paper.h * 0.38, x2: paper.x + paper.w * 0.35, y2: paper.y + paper.h * 0.28 },
    { x1: paper.x + paper.w * 0.60, y1: paper.y + paper.h * 0.20, x2: paper.x + paper.w * 0.90, y2: paper.y + paper.h * 0.30 },
    { x1: paper.x + paper.w * 0.63, y1: paper.y + paper.h * 0.26, x2: paper.x + paper.w * 0.88, y2: paper.y + paper.h * 0.38 }
  ];
  for (let i = 0; i < lines.length; i++) {
    const L = lines[i];
    await page.mouse.move(L.x1, L.y1);
    await page.mouse.down();
    await page.mouse.move(L.x2, L.y2, { steps: 5 });
    await page.mouse.up();
    await page.waitForTimeout(150);
  }
  const afterLines = await page.evaluate(() => ({
    vp: (document.getElementById('perspVpReadout') || {}).textContent,
    hint: (document.getElementById('perspStageHint') || {}).textContent,
    doneDisabled: (document.getElementById('perspDoneBtn') || {}).disabled
  }));
  console.log('AFTER 4 LINES', JSON.stringify(afterLines));

  // 工具激活时滚轮缩放
  const zoomBefore = await page.evaluate(() => (document.getElementById('paperZoomResetBtn') || {}).textContent);
  await page.mouse.move(paper.x + paper.w * 0.5, paper.y + paper.h * 0.25);
  await page.mouse.wheel(0, -400);
  await page.waitForTimeout(500);
  const zoomAfter = await page.evaluate(() => (document.getElementById('paperZoomResetBtn') || {}).textContent);
  console.log('ZOOM while guide active:', JSON.stringify({ before: zoomBefore, after: zoomAfter }));

  // 空格平移：不应产生新透视线
  await page.keyboard.down(' ');
  await page.mouse.move(paper.x + paper.w * 0.5, paper.y + paper.h * 0.25);
  await page.mouse.down();
  await page.mouse.move(paper.x + paper.w * 0.55, paper.y + paper.h * 0.28, { steps: 4 });
  await page.mouse.up();
  await page.keyboard.up(' ');
  await page.waitForTimeout(300);
  const vpAfterPan = await page.evaluate(() => (document.getElementById('perspVpReadout') || {}).textContent);
  console.log('VP after space-pan (should stay 2):', vpAfterPan);

  // 把手拖动（第 1 条线 a 端向右移 40px）
  const hx = paper.x + paper.w * 0.15, hy = paper.y + paper.h * 0.30;
  await page.mouse.move(hx, hy);
  await page.mouse.down();
  await page.mouse.move(hx + 40, hy + 10, { steps: 4 });
  await page.mouse.up();
  await page.waitForTimeout(300);
  const afterHandle = await page.evaluate(() => ({
    vp: (document.getElementById('perspVpReadout') || {}).textContent,
    focal: (document.getElementById('perspFocalReadout') || {}).textContent
  }));
  console.log('AFTER HANDLE DRAG', JSON.stringify(afterHandle));

  // 完成 → 2 灭点自动绘出 90° 视场圆（f/FOV 读数出现）
  await page.evaluate(() => { const b = document.getElementById('perspDoneBtn'); if (b) b.click(); });
  await page.waitForTimeout(400);
  const afterDone = await page.evaluate(() => ({
    hint: (document.getElementById('perspStageHint') || {}).textContent,
    focal: (document.getElementById('perspFocalReadout') || {}).textContent,
    fov: (document.getElementById('perspFovReadout') || {}).textContent,
    overlayNonBlank: (function() { const ov = document.querySelector('.video-paint-stage-overlay'); if (!ov) return null; const d = ov.getContext('2d').getImageData(0, 0, ov.width, ov.height).data; let s = 0; for (let i = 3; i < d.length; i += 4) s += d[i]; return s > 0; })()
  }));
  console.log('AFTER DONE (2VP circle)', JSON.stringify(afterDone));

  // 切回“分镜用纸”→ 全部隐藏
  await page.evaluate(() => { const b = document.getElementById('paperModeBtn'); if (b) b.click(); });
  await page.waitForTimeout(600);
  const paperMode = await page.evaluate(() => ({
    guideActive: document.querySelector('[data-paint-guide="persp"]') ? document.querySelector('[data-paint-guide="persp"]').classList.contains('active') : null,
    sectionHidden: document.querySelector('[data-paint-inline="persp"]') ? document.querySelector('[data-paint-inline="persp"]').hidden : null,
    overlayNonBlank: (function() { const ov = document.querySelector('.video-paint-stage-overlay'); if (!ov) return null; const d = ov.getContext('2d').getImageData(0, 0, ov.width, ov.height).data; let s = 0; for (let i = 3; i < d.length; i += 4) s += d[i]; return s > 0; })()
  }));
  console.log('PAPER MODE (should all hide)', JSON.stringify(paperMode));

  const realErrors = errors.filter(function(e) { return !/ERR_NETWORK_ACCESS_DENIED|goatcounter/.test(e); });
  console.log('--- errors (' + realErrors.length + ') ---');
  realErrors.slice(0, 20).forEach(function(e) { console.log(e); });
  await browser.close();
  process.exit(realErrors.length ? 2 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
