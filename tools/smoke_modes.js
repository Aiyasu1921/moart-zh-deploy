/*
 * 分镜两种模式回归测试：
 *   纸面模式：画笔能否落墨、滚轮缩放是否生效；
 *   视频编辑模式：画笔能否落墨、覆盖层状态。
 * 全程收集 pageerror / console.error。
 */
const { chromium } = require('playwright-core');

const HTML_PATH = process.argv[2];
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';

(async () => {
  const browser = await chromium.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errs = [];
  page.on('pageerror', (e) => errs.push('PAGEERROR: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !/ERR_NETWORK_ACCESS_DENIED/.test(m.text())) errs.push(m.text()); });

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

  // ---- 纸面模式（默认）：画笔 + 缩放 ----
  const memo = await page.evaluate(() => {
    const c = document.getElementById('memoCanvas');
    const r = c.getBoundingClientRect();
    return { x: r.x, y: r.y, w: r.width, h: r.height };
  });
  await page.evaluate(() => document.getElementById('paintPenBtn').click());
  await page.mouse.move(memo.x + memo.w * 0.3, memo.y + memo.h * 0.4);
  await page.mouse.down();
  await page.mouse.move(memo.x + memo.w * 0.5, memo.y + memo.h * 0.55, { steps: 8 });
  await page.mouse.up();
  await page.waitForTimeout(500);
  const paperMode = await page.evaluate(() => {
    const c = document.getElementById('memoCanvas');
    const ctx = c.getContext('2d');
    const d = ctx.getImageData(0, 0, c.width, c.height).data;
    let s = 0; for (let i = 3; i < d.length; i += 4) s += d[i];
    return { memoNonBlank: s > 0, undoDisabled: (document.getElementById('paintUndoBtn') || {}).disabled };
  });
  console.log('PAPER pen:', JSON.stringify(paperMode));
  await page.mouse.move(memo.x + memo.w * 0.5, memo.y + memo.h * 0.5);
  await page.mouse.wheel(0, -300);
  await page.waitForTimeout(500);
  const zoomAfter = await page.evaluate(() => ({ zoomText: (document.getElementById('paperZoomResetBtn') || {}).textContent }));
  console.log('PAPER zoom:', JSON.stringify(zoomAfter));

  // ---- 视频编辑模式：画笔 ----
  await page.evaluate(() => document.getElementById('videoEditToggleBtn').click());
  await page.waitForTimeout(1500);
  const paper2 = await page.evaluate(() => {
    const p = document.querySelector('#conteVideoStage .conte-paper');
    const r = p.getBoundingClientRect();
    return { x: r.x, y: r.y, w: r.width, h: r.height };
  });
  console.log('VIDEO paper rect:', JSON.stringify(paper2));
  await page.evaluate(() => document.getElementById('paintPenBtn').click());
  await page.mouse.move(paper2.x + paper2.w * 0.35, paper2.y + paper2.h * 0.25);
  await page.mouse.down();
  await page.mouse.move(paper2.x + paper2.w * 0.55, paper2.y + paper2.h * 0.35, { steps: 8 });
  await page.mouse.up();
  await page.waitForTimeout(600);
  const videoMode = await page.evaluate(() => ({
    undoDisabled: (document.getElementById('paintUndoBtn') || {}).disabled,
    overlayNonBlank: (function() {
      const ov = document.querySelector('.video-paint-stage-overlay');
      if (!ov) return null;
      const d = ov.getContext('2d').getImageData(0, 0, ov.width, ov.height).data;
      let s = 0; for (let i = 3; i < d.length; i += 4) s += d[i];
      return s > 0;
    })()
  }));
  console.log('VIDEO pen:', JSON.stringify(videoMode));
  console.log('ERRORS', JSON.stringify(errs));
  await browser.close();
  process.exit(errs.length ? 2 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
