/* 检查透视尺按钮在不同窗口宽度下是否可见（工具条布局）。 */
const { chromium } = require('playwright-core');

const HTML_PATH = process.argv[2];
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';

(async () => {
  const browser = await chromium.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox'] });
  for (const width of [1280, 1024, 900, 768, 640]) {
    const page = await browser.newPage({ viewport: { width: width, height: 800 } });
    await page.goto('file:///' + HTML_PATH.split('\\').join('/'));
    await page.waitForTimeout(2500);
    const info = await page.evaluate(() => {
      const strip = document.getElementById('paintToolStrip');
      const persp = document.querySelector('[data-paint-guide="persp"]');
      if (!strip) return { strip: null };
      const buttons = Array.from(strip.querySelectorAll('button'));
      const stripR = strip.getBoundingClientRect();
      const perspR = persp ? persp.getBoundingClientRect() : null;
      const vis = buttons.filter(function(b) { const r = b.getBoundingClientRect(); return r.width > 0 && r.height > 0; }).length;
      return {
        strip: { x: Math.round(stripR.x), y: Math.round(stripR.y), w: Math.round(stripR.width), h: Math.round(stripR.height), scrollW: strip.scrollWidth, clientW: strip.clientWidth, overflow: getComputedStyle(strip).overflow, display: getComputedStyle(strip).display },
        buttons: buttons.length,
        visButtons: vis,
        perspVisible: perspR ? perspR.width > 0 && perspR.height > 0 : false,
        persp: perspR ? { x: Math.round(perspR.x), y: Math.round(perspR.y), w: Math.round(perspR.width), h: Math.round(perspR.height) } : null
      };
    });
    console.log('W' + width + ' ' + JSON.stringify(info));
    await page.close();
  }
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
