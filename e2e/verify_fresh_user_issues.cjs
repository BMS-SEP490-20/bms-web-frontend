const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message));

  // Test 1: Calculate Fees
  console.log('--- Testing /calculate-fees ---');
  await page.goto('http://localhost:3000/calculate-fees', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'C:/Users/ADMIN/.gemini/antigravity/brain/25ad7756-f424-4f7d-bedf-8879730fd819/fresh_calculate_fees.png', fullPage: true });
  console.log('Calculate fees screenshot saved.');

  // Test 2: Receptionist Check-in
  console.log('--- Testing /receptionist/check-in ---');
  await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle' });
  await page.fill('#login-email', 'recep_lananh');
  await page.fill('#login-password', 'Admin@123');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(1500);

  await page.goto('http://localhost:3000/receptionist/check-in', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'C:/Users/ADMIN/.gemini/antigravity/brain/25ad7756-f424-4f7d-bedf-8879730fd819/fresh_receptionist_checkin.png', fullPage: true });

  // Click 'Chi tiết' button on first row
  const detailBtn = page.locator('button:has-text("Chi tiết")').first();
  if (await detailBtn.count() > 0) {
    await detailBtn.click();
    await page.waitForTimeout(800);
    await page.screenshot({ path: 'C:/Users/ADMIN/.gemini/antigravity/brain/25ad7756-f424-4f7d-bedf-8879730fd819/fresh_checkin_detail_modal.png' });
    console.log('Detail modal screenshot saved.');
    const closeBtn = page.locator('.modal button:has-text("Đóng"), .modal .btn-close').first();
    if (await closeBtn.count() > 0) await closeBtn.click();
    await page.waitForTimeout(500);
  }

  // Click 'Check-in & Cấp STT' button
  const checkinBtn = page.locator('button:has-text("Check-in")').first();
  if (await checkinBtn.count() > 0) {
    await checkinBtn.click();
    await page.waitForTimeout(800);
    await page.screenshot({ path: 'C:/Users/ADMIN/.gemini/antigravity/brain/25ad7756-f424-4f7d-bedf-8879730fd819/fresh_checkin_stt_modal.png' });
    console.log('STT modal screenshot saved.');
  }

  await browser.close();
  console.log('Playwright fresh check completed successfully.');
})();
