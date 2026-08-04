/* 对照测试：视频编辑态下滚轮缩放，无透视尺 / 有透视尺 / 缩放按钮。 */
const { chromium } = require('playwright-core');

const HTML_PATH = process.argv[2];
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';

(async () => {
  const browser = await chromium.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
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
  await page.evaluate(() => document.getElementById('videoEditToggleBtn').click());
  await page.waitForTimeout(1500);
  const paper = await page.evaluate(() => {
    const p = document.querySelector('#conteVideoStage .conte-paper');
    const r = p.getBoundingClientRect();
    return { x: r.x, y: r.y, w: r.width, h: r.height };
  });
  const read = function() {
    return page.evaluate(function() {
      return { z: (document.getElementById('paperZoomResetBtn') || {}).textContent };
    });
  };
  console.log('initial', JSON.stringify(await read()));
  // 无透视尺：滚轮
  await page.mouse.move(paper.x + paper.w * 0.5, paper.y + paper.h * 0.25);
  await page.mouse.wheel(0, -400);
  await page.waitForTimeout(400);
  console.log('wheel no-guide', JSON.stringify(await read()));
  // 有透视尺：滚轮
  await page.evaluate(() => document.querySelector('[data-paint-guide="persp"]').click());
  await page.waitForTimeout(300);
  await page.mouse.move(paper.x + paper.w * 0.5, paper.y + paper.h * 0.25);
  await page.mouse.wheel(0, -400);
  await page.waitForTimeout(400);
  console.log('wheel guide', JSON.stringify(await read()));
  // 缩放按钮
  const btns = await page.evaluate(function() {
    return Array.from(document.querySelectorAll('.video-preview-zoom-controls button')).map(function(b) { return { id: b.id, text: b.textContent }; });
  });
  console.log('zoom buttons', JSON.stringify(btns));
  // 有透视尺：点击“＋”按钮缩放
  await page.evaluate(function() { const b = document.getElementById('paperZoomInBtn'); if (b) b.click(); });
  await page.waitForTimeout(400);
  console.log('after zoom-in btn (guide active)', JSON.stringify(await read()));
  // 有透视尺：空格平移（比较纸面矩形是否移动）
  const rectBefore = await page.evaluate(function() { const p = document.querySelector('#conteVideoStage .conte-paper'); const r = p.getBoundingClientRect(); return { x: r.x, y: r.y }; });
  await page.keyboard.down(' ');
  await page.mouse.move(paper.x + paper.w * 0.5, paper.y + paper.h * 0.25);
  await page.mouse.down();
  await page.mouse.move(paper.x + paper.w * 0.5 + 60, paper.y + paper.h * 0.25 + 40, { steps: 5 });
  await page.mouse.up();
  await page.keyboard.up(' ');
  await page.waitForTimeout(400);
  const rectAfter = await page.evaluate(function() { const p = document.querySelector('#conteVideoStage .conte-paper'); const r = p.getBoundingClientRect(); return { x: r.x, y: r.y }; });
  console.log('space-pan rect before/after (guide active)', JSON.stringify({ before: rectBefore, after: rectAfter, moved: Math.abs(rectAfter.x - rectBefore.x) + Math.abs(rectAfter.y - rectBefore.y) > 4 }));
  await browser.close();
})().catch(function(e) { console.error(e); process.exit(1); });
