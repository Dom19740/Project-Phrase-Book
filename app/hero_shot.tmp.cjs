const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox'] });

  const mobile = await browser.newPage({ viewport: { width: 390, height: 700 } });
  await mobile.goto('http://localhost:8123/index.html', { waitUntil: 'load' });
  await mobile.waitForTimeout(500);
  await mobile.screenshot({ path: process.argv[2] + '/mobile_before.png' });

  const desktop = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await desktop.goto('http://localhost:8123/index.html', { waitUntil: 'load' });
  await desktop.waitForTimeout(500);
  await desktop.screenshot({ path: process.argv[2] + '/desktop_before.png' });

  await browser.close();
})();
