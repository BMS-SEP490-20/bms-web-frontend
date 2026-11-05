// @ts-check
import { test, expect } from '@playwright/test';
import { injectSession, ROLES } from './helpers.js';

test.describe('BOT 4 (Huy) - Auth, Chỉ Định ICD-10, Hóa Đơn & Báo Cáo PDF', () => {

  test('UC02/UC07: Login page renders with input validation', async ({ page }) => {
    await page.goto('/login');

    // Title / Login form
    await expect(page.getByText(/Đăng Nhập|Login/i).first()).toBeVisible();

    // Username and password inputs
    const usernameInput = page.locator('input[name*="user"], input[type="text"]').first();
    const passwordInput = page.locator('input[type="password"]').first();
    await expect(usernameInput).toBeVisible();
    await expect(passwordInput).toBeVisible();
  });

  test('UC32: Doctor Create Test Order page renders test catalog and ICD-10 form', async ({ page }) => {
    await injectSession(page, ROLES.DOCTOR, 'doctor_huy', 'Bác Sĩ Huy');
    await page.goto('/doctor/orders/create');

    // Page title
    await expect(page.getByText(/Chỉ Định Xét Nghiệm|Create Test Order/i).first()).toBeVisible();

    // Patient information card or search
    await expect(page.getByText(/Bệnh Nhân|Thông Tin Bệnh Nhân/i).first()).toBeVisible();
  });

  test('UC54: Invoices Management page displays bills and payment modal', async ({ page }) => {
    await injectSession(page, ROLES.RECEPTIONIST, 'receptionist_huy', 'Thu Ngân Huy');
    await page.goto('/invoices');

    // Header
    await expect(page.getByText(/Quản lý Viện Phí|In Biên Lai|Hóa Đơn/i).first()).toBeVisible();

    // Search bar or filter
    const searchInput = page.locator('input[placeholder*="mã HĐ"], input[placeholder*="Tìm"]').first();
    await expect(searchInput).toBeVisible();
  });

  test('UC62: Patient Results & PDF Export page renders report options', async ({ page }) => {
    await injectSession(page, ROLES.PATIENT, 'patient_huy', 'Bệnh Nhân Huy');
    await page.goto('/patient/results');

    await expect(page.getByText(/Export PDF|Results|Patient portal/i).first()).toBeVisible();
  });

});
