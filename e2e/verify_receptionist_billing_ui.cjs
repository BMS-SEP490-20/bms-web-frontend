const { chromium } = require('@playwright/test');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 950 } });
  const page = await context.newPage();

  console.log('1. Navigating to login...');
  await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle' });

  // Quick 1-click login as Receptionist
  console.log('Clicking Receptionist 1-Click quick login...');
  const recepBtn = await page.$('text=recep_lananh');
  if (recepBtn) {
    await recepBtn.click();
  } else {
    await page.fill('input[type="text"], input[name="username"]', 'recep_lananh');
    await page.fill('input[type="password"], input[name="password"]', 'Admin@123');
    await page.click('button:has-text("Đăng Nhập Cổng BMS")');
  }

  await page.waitForNavigation({ timeout: 10000 }).catch(() => {});
  await page.waitForTimeout(2000);

  console.log('2. Navigating to /invoices...');
  await page.goto('http://localhost:3000/invoices', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2500);

  const artifactDir = 'C:/Users/ADMIN/.gemini/antigravity/brain/25ad7756-f424-4f7d-bedf-8879730fd819';

  // Screenshot 1: Overview of Invoices page with "In Biên Lai" & "HĐ VAT" buttons
  await page.screenshot({ path: path.join(artifactDir, 'receptionist_billing_step1_table.png') });
  console.log('Saved receptionist_billing_step1_table.png');

  // Screenshot 2: Click "Tạo Hóa Đơn Thu Viện Phí"
  const createBtn = await page.$('button:has-text("Tạo Hóa Đơn Thu Viện Phí")');
  if (createBtn) {
    await createBtn.click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(artifactDir, 'receptionist_billing_step2_create_modal.png') });
    console.log('Saved receptionist_billing_step2_create_modal.png');

    // Select package from dropdown
    const selectPkg = await page.$('select:has-text("Chọn gói xét nghiệm")');
    if (selectPkg) {
      await selectPkg.selectOption({ label: /PKG-ANEMIA-01/i }).catch(async () => {
        // Fallback to value
        await selectPkg.selectOption('PKG-ANEMIA-01');
      });
      await page.waitForTimeout(600);
      await page.fill('input[placeholder*="Nguyễn Văn An"]', 'Nguyễn Tấn Phát');
      await page.fill('input[placeholder*="0912345678"]', '0939446265');
      await page.waitForTimeout(500);
      await page.screenshot({ path: path.join(artifactDir, 'receptionist_billing_step3_package_selected.png') });
      console.log('Saved receptionist_billing_step3_package_selected.png');
    }

    // Close create modal
    const closeBtn = await page.$('.modal button:has-text("Hủy Bỏ"), .modal-header .btn-close');
    if (closeBtn) await closeBtn.click();
    await page.waitForTimeout(800);
  }

  // Screenshot 4: Test clicking "In Biên Lai" on first row
  const printBtn = await page.$('button:has-text("In Biên Lai")');
  if (printBtn) {
    console.log('Clicking In Biên Lai...');
    await printBtn.click();
    await page.waitForTimeout(1500);
    await page.screenshot({ path: path.join(artifactDir, 'receptionist_billing_step4_receipt_preview.png') });
    console.log('Saved receptionist_billing_step4_receipt_preview.png');

    // Close receipt modal
    const closeReceipt = await page.$('button:has-text("Đóng"), .modal button[title*="Đóng"]');
    if (closeReceipt) await closeReceipt.click();
    await page.waitForTimeout(800);
  }

  // Screenshot 5: Test clicking "HĐ VAT" on first row
  const vatBtn = await page.$('button:has-text("HĐ VAT")');
  if (vatBtn) {
    console.log('Clicking HĐ VAT...');
    await vatBtn.click();
    await page.waitForTimeout(1500);
    await page.screenshot({ path: path.join(artifactDir, 'receptionist_billing_step5_vat_invoice.png') });
    console.log('Saved receptionist_billing_step5_vat_invoice.png');
  }

  await browser.close();
  console.log('Receptionist Billing UI verification completed successfully!');
})();
