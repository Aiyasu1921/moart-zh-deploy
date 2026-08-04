/* 截取分镜项目顶部"模式切换"按钮区域，用于向用户说明按钮位置/外观。 */
const { chromium } = require('playwright-core');

const HTML_PATH = process.argv[2];
const OUT_PNG = process.argv[3];
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';

(async () => {
  const browser = await chromium.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 2 });
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
  const r = await page.evaluate(() => {
    const wrap = document.querySelector('.stage-mode-switch');
    const paper = document.getElementById('paperModeBtn');
    const video = document.getElementById('videoEditToggleBtn');
    const wr = wrap.getBoundingClientRect();
    return {
      wrap: { x: wr.x, y: wr.y, w: wr.width, h: wr.height },
      paperText: paper.textContent, paperActive: paper.classList.contains('active'),
      videoText: video.textContent, videoActive: video.classList.contains('active')
    };
  });
  console.log(JSON.stringify(r));
  const clip = { x: r.wrap.x - 10, y: r.wrap.y - 6, width: r.wrap.w + 20, height: r.wrap.h + 12 };
  await page.screenshot({ path: OUT_PNG, clip: clip });
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
