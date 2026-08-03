/*
 * 冒烟交互测试：无头 Chrome 加载 MoArt-aiyasu，
 *   1) 进入“分镜（conte）”项目；
 *   2) 点击透视尺按钮 → 检查面板出现；
 *   3) 在视频画布上实际拉 4 条透视线 → 灭点读数 1 → 2 → 点“完成”；
 *   4) 切回画笔在画布画一笔、滚轮缩放；
 *   5) 全程收集 pageerror/console.error（忽略 GoatCounter 网络错误）。
 */
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright-core');

const HTML_PATH = process.argv[2];
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';

(async () => {
  const browser = await chromium.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errors = [];
  const actions = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push('[console.error] ' + msg.text());
    if (/PERSPl/.test(msg.text())) errors.push('[persp] ' + msg.text());
  });
  page.on('pageerror', (err) => errors.push('[pageerror] ' + err.message));
  await page.goto('file:///' + HTML_PATH.split('\\').join('/'));
  await page.waitForTimeout(3000);

  // 1) 启动后：编辑器 DOM 是否就绪
  const boot = await page.evaluate(() => ({
    title: document.title,
    toolStrip: !!document.getElementById('paintToolStrip'),
    perspBtn: !!document.querySelector('[data-paint-guide="persp"]'),
    overlay: !!document.getElementById('projectStartOverlay')
  }));
  console.log('BOOT', JSON.stringify(boot));

  // 2) 进入“分镜（conte）”项目
  const entered = await page.evaluate(() => {
    const btn = document.getElementById('projectStartNewBtn');
    if (!btn) return 'no-new-btn';
    btn.click();
    return 'clicked:' + (btn.textContent || btn.id).toString().slice(0, 40);
  });
  console.log('ENTER', entered);
  await page.waitForTimeout(1200);
  // 新建分镜对话框：点“创建”
  const created = await page.evaluate(() => {
    const dlg = document.getElementById('projectCreateDialog');
    if (!dlg || dlg.hidden) return 'no-dialog';
    const btns = Array.from(dlg.querySelectorAll('button'));
    const target = btns.find(function(b) { return /创建|create/i.test((b.textContent || '').toString()); });
    if (!target) return 'no-create-btn';
    target.click();
    return 'created';
  });
  console.log('CREATE', created);
  await page.waitForTimeout(3000);

  // 切到视频编辑模式（分镜默认纸面模式）
  await page.evaluate(() => { const b = document.getElementById('videoEditToggleBtn'); if (b) b.click(); });
  await page.waitForTimeout(1500);

  const stageRect = await page.evaluate(() => {
    const el = document.getElementById('conteVideoStage');
    const paper = document.querySelector('#conteVideoStage .conte-paper');
    if (!el) return null;
    const r = el.getBoundingClientRect();
    const p = paper ? paper.getBoundingClientRect() : null;
    return { stage: { x: r.x, y: r.y, w: r.width, h: r.height },
      paper: p ? { x: p.x, y: p.y, w: p.width, h: p.height } : null };
  });
  console.log('STAGE', JSON.stringify(stageRect));
  if (!stageRect) { console.log('no conte stage'); await browser.close(); process.exit(3); }

  // 3) 点击透视尺按钮，检查面板
  await page.evaluate(() => { const b = document.querySelector('[data-paint-guide="persp"]'); if (b) b.click(); });
  await page.waitForTimeout(400);
  const panelState = await page.evaluate(() => {
    const sec = document.querySelector('[data-paint-inline="persp"]');
    const btn = document.querySelector('[data-paint-guide="persp"]');
    return { sectionHidden: sec ? sec.hidden : null, btnActive: btn ? btn.classList.contains('active') : null,
      readout: (document.getElementById('perspVpReadout') || {}).textContent };
  });
  console.log('PANEL', JSON.stringify(panelState));

  // 4) 在纸面范围内拉透视线：每组 2 条，画 4 条 → 灭点 2 个
  const paper = stageRect.paper || stageRect.stage;
  const cx = paper.x + paper.w * 0.5;
  const cy = paper.y + paper.h * 0.5;
  const lines = [
    // 视频编辑态：时间轴盖住纸面下半部，线画在可见的上半区
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
    doneDisabled: (document.getElementById('perspDoneBtn') || {}).disabled,
    overlayNonBlank: (function() { const ov = document.querySelector('.video-paint-stage-overlay'); if (!ov) return null; const ctx = ov.getContext('2d'); const d = ctx.getImageData(0, 0, ov.width, ov.height).data; let s = 0; for (let i = 3; i < d.length; i += 4) s += d[i]; return s > 0; })()
  }));
  console.log('AFTER 4 LINES', JSON.stringify(afterLines));

  // 5) 点“完成（仅透视线）”
  await page.evaluate(() => { const b = document.getElementById('perspDoneBtn'); if (b) b.click(); });
  await page.waitForTimeout(300);
  const afterDone = await page.evaluate(() => ({
    hint: (document.getElementById('perspStageHint') || {}).textContent
  }));
  console.log('AFTER DONE', JSON.stringify(afterDone));

  // 6) 切回画笔，在画布画一笔
  await page.evaluate(() => { const b = document.getElementById('paintPenBtn'); if (b) b.click(); });
  await page.waitForTimeout(300);
  const penState = await page.evaluate(() => ({
    penActive: (document.getElementById('paintPenBtn') || {}).className ? document.getElementById('paintPenBtn').classList.contains('active') : null,
    guideStillActive: document.querySelector('[data-paint-guide="persp"]') ? document.querySelector('[data-paint-guide="persp"]').classList.contains('active') : null
  }));
  console.log('PEN', JSON.stringify(penState));
  const px = paper.x + paper.w * 0.4, py = paper.y + paper.h * 0.3;
  await page.mouse.move(px, py);
  await page.mouse.down();
  await page.mouse.move(px + 80, py + 40, { steps: 8 });
  await page.mouse.up();
  await page.waitForTimeout(400);
  const strokeState = await page.evaluate(() => ({
    undoDisabled: (document.getElementById('paintUndoBtn') || {}).disabled,
    paperNonBlank: (function() { const c = document.getElementById('memoCanvas'); if (!c) return null; const ctx = c.getContext('2d'); const d = ctx.getImageData(0, 0, c.width, c.height).data; let s = 0; for (let i = 3; i < d.length; i += 4) s += d[i]; return s > 0; })()
  }));
  console.log('STROKE', JSON.stringify(strokeState));

  // 7) 缩放：滚轮 + 缩放重置按钮
  await page.mouse.move(paper.x + paper.w * 0.5, paper.y + paper.h * 0.5);
  await page.mouse.wheel(0, -300);
  await page.waitForTimeout(400);
  await page.evaluate(() => { const b = document.getElementById('paperZoomResetBtn'); if (b) b.click(); });
  await page.waitForTimeout(400);

  console.log('--- console/page errors (' + errors.length + ') ---');
  const realErrors = errors.filter(function(e) { return !/ERR_NETWORK_ACCESS_DENIED|goatcounter/.test(e); });
  realErrors.slice(0, 40).forEach(function(e) { console.log(e); });
  console.log('REAL ERRORS:', realErrors.length);
  await browser.close();
  process.exit(realErrors.length ? 2 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
