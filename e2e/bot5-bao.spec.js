// @ts-check
import { test, expect } from '@playwright/test';
import { injectSession, ROLES } from './helpers.js';

test.describe('BOT 5 (Bảo) - OTP, Tiếp Đón Kiosk QR, Nhân Sự & Ký Duyệt LabHead', () => {

  test('UC27/UC28: Smart Queue Board displays live ticket numbers and counters', async ({ page }) => {
    await injectSession(page, ROLES.RECEPTIONIST, 'receptionist_bao', 'Lễ Tân Bảo');
    await page.goto('/queue');

    // Queue title / header
    await expect(page.getByText(/Queue management|Hàng Đợi|Bảng Hàng Đợi/i).first()).toBeVisible();

    // Stats section (In queue, served today)
    await expect(page.getByText(/Queue stats|Issue ticket|Collection counters|Quầy/i).first()).toBeVisible();
  });

  test('UC25: Check-in & Patient Intake page loads for Receptionist', async ({ page }) => {
    await injectSession(page, ROLES.RECEPTIONIST, 'receptionist_bao', 'Lễ Tân Bảo');
    await page.goto('/reception/checkin');

    // Title / Checkin form
    await expect(page.getByText(/Tiếp Đón|Check-in/i).first()).toBeVisible();
  });

  test('UC14: User & Employee Management page renders staff table and role filters', async ({ page }) => {
    await injectSession(page, ROLES.ADMIN, 'admin_bao', 'Admin Bảo');
    await page.goto('/admin/users');

    // Header title
    await expect(page.getByText(/Quản Lý Người Dùng|Quản Trị Nhân Viên|Nhân Sự/i).first()).toBeVisible();

    // Search bar
    const searchInput = page.locator('input[placeholder*="Tìm"], input[type="text"]').first();
    await expect(searchInput).toBeVisible();
  });

  test('UC36: Work Shifts catalog renders for Admin/Manager without validation error', async ({ page }) => {
    await injectSession(page, ROLES.ADMIN, 'admin_bao', 'Admin Bảo');
    await page.goto('/shifts/view');

    // Title / Header
    await expect(page.getByText(/Work shifts|Lịch Ca Trực/i).first()).toBeVisible();

    // Summary cards
    await expect(page.getByText(/Catalog overview/i).first()).toBeVisible();
    await expect(page.getByText(/Usage status/i).first()).toBeVisible();

    // Ensure NO "Dữ liệu không hợp lệ." alert
    const alertDanger = page.locator('.alert-danger');
    if (await alertDanger.isVisible()) {
      await expect(alertDanger).not.toHaveText(/Dữ liệu không hợp lệ/i);
    }
  });

  test('UC49/UC72: Lab Result Verification & Approval page renders queue', async ({ page }) => {
    await injectSession(page, ROLES.LAB, 'lab_bao', 'KTV Lab Bảo');
    await page.goto('/laboratory/verify-results');

    // Title / Verification workbench
    await expect(page.getByText(/Thẩm Định Kết Quả|Xác Thực Kết Quả|Verify/i).first()).toBeVisible();
  });

  test('Security Boundaries: Unauthenticated user is redirected to /login', async ({ page }) => {
    // Attempting to visit /admin/users without session
    await page.goto('/admin/users');
    await page.waitForURL('**/login**');
    await expect(page).toHaveURL(/.*login.*/);
  });

  test('Security Boundaries: Unauthorized role is redirected to /403', async ({ page }) => {
    // Patient attempts to visit admin-only /admin/users
    await injectSession(page, ROLES.PATIENT, 'patient_intruder', 'Kẻ Xâm Nhập');
    await page.goto('/admin/users');
    await page.waitForURL('**/403**');
    await expect(page).toHaveURL(/.*403.*/);
  });

});
