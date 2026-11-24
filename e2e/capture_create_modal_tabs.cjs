const { chromium } = require('@playwright/test');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 950 } });
  const page = await context.newPage();

  console.log('1. Navigating to login...');
  await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle' });

  // Quick 1-click login as Admin
  await page.click('text=admin_bms');
  await page.waitForTimeout(2500);

  console.log('2. Navigating to /packages...');
  await page.goto('http://localhost:3000/packages', { waitUntil: 'networkidle' });
  await page.waitForSelector('button:has-text("Thêm Gói Mới")', { timeout: 10000 });
  await page.waitForTimeout(1000);

  const artifactDir = 'C:/Users/ADMIN/.gemini/antigravity/brain/25ad7756-f424-4f7d-bedf-8879730fd819';

  console.log('3. Opening Create Modal...');
  await page.click('button:has-text("Thêm Gói Mới")');
  await page.waitForSelector('.modal-title:has-text("Thiết Lập Gói Dịch Vụ Xét Nghiệm Mới")', { timeout: 5000 });
  await page.waitForTimeout(1000);

  // Tab 1
  await page.screenshot({ path: path.join(artifactDir, 'diag_pkg_step3_create_tab1.png') });
  console.log('Captured Tab 1');

  // Tab 2
  await page.click('.nav-link:has-text("2. Điểm Nổi Bật")');
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(artifactDir, 'diag_pkg_step3_create_tab2.png') });
  console.log('Captured Tab 2');

  // Tab 3
  await page.click('.nav-link:has-text("3. Chỉ Số & Diễn Giải")');
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(artifactDir, 'diag_pkg_step3_create_tab3.png') });
  console.log('Captured Tab 3');

  // Tab 4
  await page.click('.nav-link:has-text("4. TAT & Tiền Phân Tích")');
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(artifactDir, 'diag_pkg_step3_create_tab4.png') });
  console.log('Captured Tab 4');

  await browser.close();
  console.log('Finished capturing all create modal tabs!');
})();
