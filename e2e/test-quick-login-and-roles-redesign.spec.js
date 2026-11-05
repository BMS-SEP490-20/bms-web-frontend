import { test, expect } from '@playwright/test';

test.describe('Role Quick Login & Management Form Styling Verification', () => {

  test('1. Verify Quick Login has Bác Sĩ and Quản Lý, and Bác Sĩ routes to /doctor/console', async ({ page }) => {
    await page.goto('http://localhost:3000/login');
    await page.waitForLoadState('networkidle');

    // Verify all 6 role buttons are present in Quick Demo login
    const adminBtn = page.locator('button:has-text("Admin")');
    const managerBtn = page.locator('button:has-text("Quản Lý")');
    const doctorBtn = page.locator('button:has-text("Bác Sĩ")');
    const labBtn = page.locator('button:has-text("KTV Lab")');
    const recepBtn = page.locator('button:has-text("Lễ Tân")');
    const patientBtn = page.locator('button:has-text("Bệnh Nhân")');

    await expect(adminBtn).toBeVisible();
    await expect(managerBtn).toBeVisible();
    await expect(doctorBtn).toBeVisible();
    await expect(labBtn).toBeVisible();
    await expect(recepBtn).toBeVisible();
    await expect(patientBtn).toBeVisible();

    // Click "Bác Sĩ" button - automatically authenticates and redirects
    await doctorBtn.click();

    // MUST route directly to /doctor/console, NOT /dashboard (Manager)!
    await page.waitForURL('**/doctor/console', { timeout: 10000 });
    await expect(page.locator('text=/Bàn Khám.*Điều Phối Bệnh Nhân/')).toBeVisible();

    // Verify Doctor name on console
    await expect(page.locator('text=BS. CKI Nguyễn Văn Minh').first()).toBeVisible();

    // Take screenshot of Doctor Console
    await page.screenshot({ path: 'C:/Users/ADMIN/.gemini/antigravity/brain/25ad7756-f424-4f7d-bedf-8879730fd819/redesign-doctor-console.png', fullPage: true });
  });

  test('2. Verify Quản Lý routes to /dashboard with Manager privileges', async ({ page }) => {
    await page.goto('http://localhost:3000/login');
    await page.waitForLoadState('networkidle');

    // Click "Quản Lý" button - automatically authenticates and redirects
    await page.click('button:has-text("Quản Lý")');

    // Must route to /dashboard
    await page.waitForURL('**/dashboard', { timeout: 10000 });
    await expect(page.locator('h1.bms-header-title:has-text("Bảng Điều Khiển")')).toBeVisible();

    // Take screenshot of Manager Dashboard
    await page.screenshot({ path: 'C:/Users/ADMIN/.gemini/antigravity/brain/25ad7756-f424-4f7d-bedf-8879730fd819/redesign-manager-dashboard.png', fullPage: true });
  });

  test('3. Verify KTV Lab at /lab/queue has clean unified sidebar and clean queue layout', async ({ page }) => {
    await page.goto('http://localhost:3000/login');
    await page.waitForLoadState('networkidle');

    // Click "KTV Lab"
    await page.click('button:has-text("KTV Lab")');

    // Must route to /lab/queue
    await page.waitForURL('**/lab/queue', { timeout: 10000 });
    await expect(page.locator('text=Hàng Đợi Mẫu Bệnh Phẩm Xét Nghiệm')).toBeVisible();

    // Verify clean sidebar is visible
    await expect(page.locator('.bms-sidebar')).toBeVisible();

    // Take screenshot of clean unified Lab Queue
    await page.screenshot({ path: 'C:/Users/ADMIN/.gemini/antigravity/brain/25ad7756-f424-4f7d-bedf-8879730fd819/redesign-clean-lab-queue.png', fullPage: true });
  });

});
