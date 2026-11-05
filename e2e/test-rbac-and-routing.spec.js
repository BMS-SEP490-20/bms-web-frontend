import { test, expect } from '@playwright/test';

test.describe('Role-Based Access Control (RBAC) & Post-Login Redirection Verification', () => {
  const artifactDir = 'C:/Users/ADMIN/.gemini/antigravity/brain/25ad7756-f424-4f7d-bedf-8879730fd819';

  test('1. Receptionist (recep_lananh) Login: Directly routed to /receptionist/check-in with full Receptionist tools', async ({ page }) => {
    await page.goto('http://localhost:3000/login');
    await page.fill('input[type="text"], input[name="username"]', 'recep_lananh');
    await page.fill('input[type="password"]', 'Admin@123');
    await page.click('button[type="submit"]');

    // Wait for redirection
    await page.waitForURL('**/receptionist/check-in', { timeout: 10000 });
    expect(page.url()).toContain('/receptionist/check-in');

    // Check sidebar contains Receptionist tools
    const bodyText = await page.locator('body').innerText();
    expect(bodyText).toContain('Tiếp Đón & Check-in QR');
    expect(bodyText).toContain('Bảng Gọi Số & Hàng Đợi');
    expect(bodyText).toContain('Tạo Hồ Sơ Bệnh Nhân');
    expect(bodyText).not.toContain('Chỉ Định Xét Nghiệm Máu'); // Doctor only
    expect(bodyText).not.toContain('Quản Lý Người Dùng'); // Admin only

    await page.screenshot({ path: `${artifactDir}/verified-rbac-receptionist.png` });
  });

  test('2. Doctor (doctor) Login: Directly routed to /doctor/console with Clinical Examination tools', async ({ page }) => {
    await page.goto('http://localhost:3000/login');
    await page.fill('input[type="text"], input[name="username"]', 'doctor');
    await page.fill('input[type="password"]', 'Doctor@123');
    await page.click('button[type="submit"]');

    // Wait for redirection to doctor console
    await page.waitForURL('**/doctor/console', { timeout: 10000 });
    expect(page.url()).toContain('/doctor/console');

    // Check sidebar contains Doctor tools
    const bodyText = await page.locator('body').innerText();
    expect(bodyText).toContain('Bàn Khám Bác Sĩ & Gọi Số');
    expect(bodyText).toContain('Chỉ Định Xét Nghiệm Máu');
    expect(bodyText).toContain('Bệnh Án Điện Tử (EMR)');
    expect(bodyText).not.toContain('Quản Lý Người Dùng'); // Admin only
    expect(bodyText).not.toContain('Tiếp Đón & Check-in QR'); // Receptionist only

    await page.screenshot({ path: `${artifactDir}/verified-rbac-doctor.png` });
  });

  test('3. Lab Technician (labuser) Login: Directly routed to /lab/queue with Laboratory Analyzer tools', async ({ page }) => {
    await page.goto('http://localhost:3000/login');
    await page.fill('input[type="text"], input[name="username"]', 'labuser');
    await page.fill('input[type="password"]', 'LabUser@123');
    await page.click('button[type="submit"]');

    // Wait for redirection to lab queue
    await page.waitForURL('**/lab/queue', { timeout: 10000 });
    expect(page.url()).toContain('/lab/queue');

    // Check sidebar contains Lab tools
    const bodyText = await page.locator('body').innerText();
    expect(bodyText).toContain('Hàng Đợi Mẫu Xét Nghiệm');
    expect(bodyText).toContain('Nhập Kết Quả Xét Nghiệm');
    expect(bodyText).toContain('Quản Lý Lô Mẫu');
    expect(bodyText).toContain('Cờ Kiểm Chuẩn Westgard');
    expect(bodyText).not.toContain('Chỉ Định Xét Nghiệm Máu'); // Doctor only
    expect(bodyText).not.toContain('Quản Lý Người Dùng'); // Admin only

    await page.screenshot({ path: `${artifactDir}/verified-rbac-lab.png` });
  });

  test('4. Admin (admin_bms) Login: Routed to /dashboard with System Administration tools', async ({ page }) => {
    await page.goto('http://localhost:3000/login');
    await page.fill('input[type="text"], input[name="username"]', 'admin_bms');
    await page.fill('input[type="password"]', 'Admin@123');
    await page.click('button[type="submit"]');

    // Wait for redirection to dashboard
    await page.waitForURL('**/dashboard', { timeout: 10000 });
    expect(page.url()).toContain('/dashboard');

    // Check sidebar contains Admin tools
    const bodyText = await page.locator('body').innerText();
    expect(bodyText).toContain('Quản Lý Tài Khoản');
    expect(bodyText).toContain('Phân Quyền Vai Trò (RBAC)');
    expect(bodyText).toContain('Sao Lưu & Khôi Phục Dữ Liệu');
    expect(bodyText).toContain('Nhật Ký Audit Hệ Thống');
    expect(bodyText).not.toContain('Chỉ Định Xét Nghiệm Máu'); // Doctor only
    expect(bodyText).not.toContain('Tiếp Đón & Check-in QR'); // Receptionist only

    await page.screenshot({ path: `${artifactDir}/verified-rbac-admin.png` });
  });
});

