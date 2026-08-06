/*
 * P2.x genga（原画）模式冒烟：
 *   新建原画项目 → 点透视尺工具（面板应显示、提示不应是"请切映像編集"）
 *   → 在 genga 预览画布上拉 2 条透视线 → 灭点读数 1
 *   → genga 覆盖层存在且非空；全程收集 pageerror/console.error。
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
  await page.evaluate(() => document.getElementById('projectStartNewGengaBtn').click());
  await page.waitForTimeout(1200);
  const created = await page.evaluate(() => {
    const d = document.getElementById('gengaCreateDialog');
    if (!d || d.hidden) return 'no-dialog';
    const b = Array.from(d.querySelectorAll('button')).find(function(x) { return /创建|create/i.test(x.textContent); });
    if (!b) return 'no-create-btn';
    b.click();
    return 'created';
  });
  console.log('GENGA CREATE', created);
  await page.waitForTimeout(3500);

  const preview = await page.evaluate(() => {
    const c = document.getElementById('gengaPreviewCanvas');
    if (!c) return null;
    const r = c.getBoundingClientRect();
    return { x: r.x, y: r.y, w: r.width, h: r.height, cw: c.width, ch: c.height };
  });
  console.log('GENGA PREVIEW', JSON.stringify(preview));
  if (!preview || preview.w <= 0) { console.log('no genga preview'); await browser.close(); process.exit(3); }

  // 点透视尺工具
  await page.evaluate(() => { const b = document.querySelector('[data-paint-guide="persp"]'); if (b) b.click(); });
  await page.waitForTimeout(500);
  const panel = await page.evaluate(() => ({
    sectionHidden: document.querySelector('[data-paint-inline="persp"]') ? document.querySelector('[data-paint-inline="persp"]').hidden : null,
    hint: (document.getElementById('perspStageHint') || {}).textContent
  }));
  console.log('GENGA PANEL', JSON.stringify(panel));

  // 拉 2 条透视线（预览画布内，每次拖拽前重新测量画布位置）
  const measure = function() {
    return page.evaluate(function() {
      const c = document.getElementById('gengaPreviewCanvas');
      const r = c.getBoundingClientRect();
      return { x: r.x, y: r.y, w: r.width, h: r.height };
    });
  };
  const drags = [
    [0.58, 0.22, 0.80, 0.13],
    [0.55, 0.34, 0.76, 0.22]
  ];
  for (let i = 0; i < drags.length; i++) {
    const d = drags[i];
    const pr = await measure();
    const L = { x1: pr.x + pr.w * d[0], y1: pr.y + pr.h * d[1], x2: pr.x + pr.w * d[2], y2: pr.y + pr.h * d[3] };
    await page.mouse.move(L.x1, L.y1);
    await page.mouse.down();
    await page.mouse.move(L.x2, L.y2, { steps: 5 });
    await page.mouse.up();
    await page.waitForTimeout(200);
  }
  await page.waitForTimeout(400);
  const afterLines = await page.evaluate(() => ({
    vp: (document.getElementById('perspVpReadout') || {}).textContent,
    overlayExists: !!document.querySelector('.genga-persp-overlay'),
    overlayNonBlank: (function() {
      const ov = document.querySelector('.genga-persp-overlay');
      if (!ov || !ov.width) return false;
      const d = ov.getContext('2d').getImageData(0, 0, ov.width, ov.height).data;
      let s = 0; for (let i = 3; i < d.length; i += 4) s += d[i];
      return s > 0;
    })()
  }));
  console.log('GENGA AFTER LINES', JSON.stringify(afterLines));

  const realErrors = errors.filter(function(e) { return !/ERR_NETWORK_ACCESS_DENIED|goatcounter/.test(e); });
  console.log('--- errors (' + realErrors.length + ') ---');
  realErrors.slice(0, 20).forEach(function(e) { console.log(e); });
  await browser.close();
  process.exit(realErrors.length ? 2 : 0);
})().catch(function(e) { console.error(e); process.exit(1); });
