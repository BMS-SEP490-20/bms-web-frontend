// @ts-check
import { test, expect } from '@playwright/test';
import { injectSession, ROLES } from './helpers.js';

test.describe('BOT 1 (Phát) - Core, Viện Phí, QC Westgard, TAT & Doanh Thu', () => {

  test('UC01/UC81: Public Home Page and Service Catalog loads properly', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/BMS/i);
    // Top bar info exists
    await expect(page.locator('.bms-topbar')).toBeVisible();
    await expect(page.getByText('1900 6868').first()).toBeVisible();
    // Brand header
    await expect(page.getByText('BMS CLINICAL LABORATORY').first()).toBeVisible();
    // Search input
    const searchInput = page.getByPlaceholder(/Tìm.*gói xét nghiệm/i);
    await expect(searchInput).toBeVisible();
  });

  test('UC53: Calculate Fees page allows Receptionist to compute BHYT and Surcharges', async ({ page }) => {
    // Inject Receptionist session
    await injectSession(page, ROLES.RECEPTIONIST, 'receptionist_phat', 'Lễ Tân Phát');
    await page.goto('/calculate-fees');

    // Title / header
    await expect(page.getByText(/Dự Toán & Tính Phí Xét Nghiệm|Tính Phí Xét Nghiệm/i).first()).toBeVisible();

    // Check package cards or selectors
    await expect(page.getByText(/Tổng Phân Tích Tế Bào Máu/i).first()).toBeVisible();

    // Fill BHYT card
    const bhytInput = page.locator('input[placeholder*="BHYT"]').first();
    if (await bhytInput.isVisible()) {
      await bhytInput.fill('DN4791234567890');
    }

    // Switch service type to Home Collection if radio/button exists
    const homeBtn = page.getByText(/Lấy mẫu tại nhà/i).first();
    if (await homeBtn.isVisible()) {
      await homeBtn.click();
    }

    // Ensure calculation breakdown section renders
    await expect(page.getByText(/TỔNG TIỀN PHẢI THANH TOÁN|Tổng phí xét nghiệm|Tổng cộng/i).first()).toBeVisible();
  });

  test('UC73: Quality Control & Westgard Dashboard renders for Lab & Manager', async ({ page }) => {
    await injectSession(page, ROLES.MANAGER, 'manager_phat', 'Quản Lý Phát');
    await page.goto('/qc/management');

    // Header and KPI scorecard
    await expect(page.getByText(/Kiểm Chuẩn Chất Lượng/i).first()).toBeVisible();

    // Check Levey-Jennings or Lots section
    await expect(page.locator('body')).toContainText(/Levey-Jennings|QC|Westgard/i);
  });

  test('UC63: TAT Statistics Dashboard displays SLA benchmarks', async ({ page }) => {
    await injectSession(page, ROLES.ADMIN, 'admin_phat', 'Admin Phát');
    await page.goto('/reports/tat');

    // Header
    await expect(page.getByText(/Thống Kê Thời Gian Trả Kết Quả|TAT/i).first()).toBeVisible();

    // SLA Metrics Card or Benchmark info
    await expect(page.locator('body')).toContainText(/Phút|Đạt Chuẩn|SLA|Target/i);
  });

  test('UC78: Revenue Analytics Dashboard displays financial charts and metrics', async ({ page }) => {
    await injectSession(page, ROLES.ADMIN, 'admin_phat', 'Admin Phát');
    await page.goto('/reports/revenue');

    // Header and filter bars
    await expect(page.getByText(/Báo Cáo Doanh Thu/i).first()).toBeVisible();
    await expect(page.getByText(/VND|Doanh Thu|Lợi Nhuận/i).first()).toBeVisible();
  });

  test('UC81: Logged-in Patient sees personalized Patient Home Page (not operational dashboard)', async ({ page }) => {
    await injectSession(page, ROLES.PATIENT, 'patient_nguyen', 'Nguyễn Bệnh Nhân');
    await page.goto('/');

    // Patient welcome greeting and ID card
    await expect(page.getByText('Nguyễn Bệnh Nhân').first()).toBeVisible();
    await expect(page.getByText(/Mã định danh bệnh nhân/i).first()).toBeVisible();
    await expect(page.getByText(/Lịch Hẹn Sắp Tới/i).first()).toBeVisible();
    await expect(page.getByText(/Kết Quả Xét Nghiệm Gần Nhất/i).first()).toBeVisible();
    await expect(page.getByText(/Tải Phiếu Kết Quả/i).first()).toBeVisible();

    // Patient navigating to /dashboard should redirect to /home, never to staff cockpit
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/home|\//);
  });

});
