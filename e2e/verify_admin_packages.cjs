const { chromium } = require('@playwright/test');
const path = require('path');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 950 } });
  const page = await context.newPage();

  console.log('1. Navigating to login...');
  await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle' });

  // Quick 1-click login as Admin
  console.log('Clicking Admin 1-Click quick login...');
  const adminQuickBtn = await page.$('text=admin_bms');
  if (adminQuickBtn) {
    await adminQuickBtn.click();
  }

  await page.waitForNavigation({ timeout: 10000 }).catch(() => {});
  await page.waitForTimeout(2500);

  console.log('2. Navigating to /packages...');
  await page.goto('http://localhost:3000/packages', { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);

  const artifactDir = 'C:/Users/ADMIN/.gemini/antigravity/brain/25ad7756-f424-4f7d-bedf-8879730fd819';
  
  // Screenshot 1: Table view with DIAG standard packages
  await page.screenshot({ path: path.join(artifactDir, 'diag_pkg_step1_table.png'), fullPage: false });

  // Detail Modal for PKG-ANEMIA-01
  const anemiaBtn = await page.$('tr:has-text("PKG-ANEMIA-01") button[title*="Xem chi tiết"]');
  if (anemiaBtn) {
    await anemiaBtn.click();
    await page.waitForTimeout(1500);
    await page.screenshot({ path: path.join(artifactDir, 'diag_pkg_step2_anemia_detail_top.png') });

    // Scroll modal down to capture biomarkers table and ISO 15189 alerts
    const modalBody = await page.$('.modal-body');
    if (modalBody) {
      await modalBody.evaluate(el => el.scrollTo(0, el.scrollHeight));
      await page.waitForTimeout(1000);
      await page.screenshot({ path: path.join(artifactDir, 'diag_pkg_step2_anemia_detail_bottom.png') });
    }

    // Close modal
    const closeBtn = await page.$('.modal button:has-text("Đóng"), .modal-header .btn-close');
    if (closeBtn) await closeBtn.click();
    await page.waitForTimeout(1000);
  }

  // Open Create New Package Modal
  const createBtn = await page.$('button:has-text("Thêm Gói Mới")');
  if (createBtn) {
    await createBtn.click();
    await page.waitForTimeout(1200);

    // Tab 2
    const tab2 = await page.$('button:has-text("2. Điểm Nổi Bật & Đối Tượng")');
    if (tab2) {
      await tab2.click();
      await page.waitForTimeout(800);
      await page.screenshot({ path: path.join(artifactDir, 'diag_pkg_step3_create_tab2.png') });
    }

    // Tab 3
    const tab3 = await page.$('button:has-text("3. Chỉ Số & Diễn Giải Y Khoa")');
    if (tab3) {
      await tab3.click();
      await page.waitForTimeout(800);
      await page.screenshot({ path: path.join(artifactDir, 'diag_pkg_step3_create_tab3.png') });
    }

    // Tab 4
    const tab4 = await page.$('button:has-text("4. TAT & Tiền Phân Tích")');
    if (tab4) {
      await tab4.click();
      await page.waitForTimeout(800);
      await page.screenshot({ path: path.join(artifactDir, 'diag_pkg_step3_create_tab4.png') });
    }
  }

  await browser.close();
  console.log('All detailed DIAG screenshots captured successfully!');
})();
