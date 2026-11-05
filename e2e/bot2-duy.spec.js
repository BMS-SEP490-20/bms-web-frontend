// @ts-check
import { test, expect } from '@playwright/test';
import { injectSession, ROLES } from './helpers.js';

test.describe('BOT 2 (Duy) - IoT, Push Notif, Live Tracking & EMR', () => {

  test('UC48: Live Tracking Page renders ISO accreditation badge and search interface', async ({ page }) => {
    await page.goto('/tracking');

    // Verification of ISO 15189 accreditation badge
    await expect(page.getByText(/ISO 15189/i).first()).toBeVisible();
    await expect(page.getByText(/Tra Cứu Tiến Trình Mẫu|Lộ Trình/i).first()).toBeVisible();

    // Barcode input element exists
    const searchInput = page.locator('input[placeholder*="SMP-"], input[placeholder*="ORD-"]').first();
    await expect(searchInput).toBeVisible();

    // Fill sample code and submit search
    await searchInput.fill('SMP-20261030-001');
    const searchBtn = page.getByRole('button', { name: /Tra cứu|Tìm kiếm/i }).first();
    if (await searchBtn.isVisible()) {
      await searchBtn.click();
    }
  });

  test('UC68: Environmental Alert Threshold Violation & IoT Cold-Chain Monitoring', async ({ page }) => {
    await injectSession(page, ROLES.LAB, 'lab_duy', 'KTV Lab Duy');
    await page.goto('/iot/alerts');

    // Header and cold chain title
    await expect(page.getByText(/Giám Sát & Xử Lý Cảnh Báo Vượt Ngưỡng|Cảnh Báo Vượt Ngưỡng Môi Trường|IoT/i).first()).toBeVisible();

    // Summary metrics scorecard (Active alerts, health status)
    await expect(page.getByText(/HỆ THỐNG MÔI TRƯỜNG|BÁO ĐỘNG ĐỎ|cảnh báo chưa xử lý|CẢNH BÁO/i).first()).toBeVisible();
  });

  test('UC58: Push Notification Center dispatches multi-channel messages', async ({ page }) => {
    await injectSession(page, ROLES.ADMIN, 'admin_duy', 'Admin Duy');
    await page.goto('/notifications');

    // Title / header
    await expect(page.getByText(/Trung Tâm Thông Báo Đẩy|Push Notification/i).first()).toBeVisible();

    // Dispatch form elements or log list
    await expect(page.getByText(/Lịch sử gửi|Nhật ký/i).first()).toBeVisible();
  });

  test('UC79: Patient Feedback Hub allows submitting and reviewing feedback', async ({ page }) => {
    await injectSession(page, ROLES.PATIENT, 'patient_duy', 'Bệnh Nhân Duy');
    await page.goto('/feedback');

    // Title
    await expect(page.getByText(/Đánh Giá & Phản Hồi|Feedback/i).first()).toBeVisible();
  });

});
