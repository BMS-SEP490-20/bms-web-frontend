const { chromium } = require('@playwright/test');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 950 } });
  const page = await context.newPage();

  console.log('1. Navigating to login...');
  await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle' });

  // Quick 1-click login as Receptionist
  await page.click('text=recep_lananh');
  await page.waitForNavigation({ timeout: 10000 }).catch(() => {});
  await page.waitForTimeout(2000);

  console.log('2. Navigating to /invoices...');
  await page.goto('http://localhost:3000/invoices', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2500);

  const artifactDir = 'C:/Users/ADMIN/.gemini/antigravity/brain/25ad7756-f424-4f7d-bedf-8879730fd819';

  // 1. Click "In Biên Lai" on first row
  const printBtn = await page.$('button:has-text("In Biên Lai")');
  if (printBtn) {
    console.log('Clicking In Biên Lai...');
    await printBtn.click();
    await page.waitForTimeout(1500);
    await page.screenshot({ path: path.join(artifactDir, 'receptionist_billing_step4_receipt_preview.png') });
    console.log('Saved receptionist_billing_step4_receipt_preview.png');

    // Close receipt modal
    const closeReceipt = await page.$('button:has-text("Đóng"), button:has-text("✕"), .no-print button:has-text("Đóng")');
    if (closeReceipt) await closeReceipt.click();
    await page.waitForTimeout(1000);
  }

  // 2. Click "HĐ VAT" on first row
  const vatBtn = await page.$('button:has-text("HĐ VAT")');
  if (vatBtn) {
    console.log('Clicking HĐ VAT...');
    await vatBtn.click();
    await page.waitForTimeout(1500);
    await page.screenshot({ path: path.join(artifactDir, 'receptionist_billing_step5_vat_invoice.png') });
    console.log('Saved receptionist_billing_step5_vat_invoice.png');
  }

  await browser.close();
  console.log('All modals captured successfully!');
})();
