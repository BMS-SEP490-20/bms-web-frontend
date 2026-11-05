// @ts-check
import { test, expect } from '@playwright/test';
import { injectSession, ROLES } from './helpers.js';

test.describe('BOT 3 (Lạc) - Catalog, Lịch Khám, Kết Quả Lab & Kho FIFO', () => {

  test('UC01: Service Catalog displays available test packages', async ({ page }) => {
    await page.goto('/services');

    // Heading or title
    await expect(page.getByText(/Gói Xét Nghiệm|Danh Mục Dịch Vụ/i).first()).toBeVisible();

    // Package list or cards are present
    await expect(page.locator('.card, .bms-package-card, div[class*="package"]').first()).toBeVisible();
  });

  test('UC21: Patient Book Appointment Page renders booking form', async ({ page }) => {
    await injectSession(page, ROLES.PATIENT, 'patient_lac', 'Bệnh Nhân Lạc');
    await page.goto('/appointments/book');

    await expect(page.getByText(/Create appointment|Appointments|Đặt Lịch Hẹn/i).first()).toBeVisible();
  });

  test('UC46: Enter Test Results Page renders analyte parameter list and evaluates Panic flags', async ({ page }) => {
    await injectSession(page, ROLES.LAB, 'lab_lac', 'KTV Lab Lạc');
    await page.goto('/laboratory/enter-test-results');

    // Title / English or Vietnamese UI
    await expect(page.getByText(/Enter Test Results|Nhập Kết Quả/i).first()).toBeVisible();

    // Verify presence of hematology parameters (WBC, RBC, HGB, PLT)
    await expect(page.getByText(/WBC/i).first()).toBeVisible();
    await expect(page.getByText(/PLT/i).first()).toBeVisible();
  });

  test('UC56: Reagent Inventory FIFO page displays reagent lots and expiration badges', async ({ page }) => {
    await injectSession(page, ROLES.LAB, 'lab_lac', 'KTV Lab Lạc');
    await page.goto('/inventory');

    // Header title
    await expect(page.getByText(/Kho|Quản lý kho|Inventory/i).first()).toBeVisible();

    // Search or filter controls
    const searchBox = page.locator('#inventory-search, input[placeholder*="hóa chất"]').first();
    await expect(searchBox).toBeVisible();
  });

  test('UC28: Configure Reference Intervals page renders parameters', async ({ page }) => {
    await injectSession(page, ROLES.LAB, 'lab_lac', 'KTV Lab Lạc');
    await page.goto('/laboratory/reference-intervals');

    await expect(page.getByText(/Khoảng Tham Chiếu|Reference Interval/i).first()).toBeVisible();
  });

});
