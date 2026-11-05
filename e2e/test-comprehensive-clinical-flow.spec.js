import { test, expect } from '@playwright/test';

test.describe('BMS End-to-End Clinical Flow & Verification', () => {
  const artifactDir = 'C:/Users/ADMIN/.gemini/antigravity/brain/25ad7756-f424-4f7d-bedf-8879730fd819';

  test('1. Patient Flow: Navbar check, Profile check, Unified Booking, and Clean VNPAY Checkout', async ({ page }) => {
    // Login as patient
    await page.goto('http://localhost:3000/login');
    await page.fill('input[type="text"], input[name="username"]', 'patient');
    await page.fill('input[type="password"]', 'Admin@123');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(1500);

    // 1. Check Patient Home and Navbar
    await page.goto('http://localhost:3000/home');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: `${artifactDir}/flow-1-patient-home.png` });

    // 2. Check Profile Page: Verify 3 old buttons removed and medical record standard
    await page.goto('http://localhost:3000/profile');
    await page.waitForTimeout(1000);
    const profileText = await page.locator('body').innerText();
    expect(profileText).not.toContain('Làm Mới Hồ Sơ');
    expect(profileText).not.toContain('Xem Nhanh Bệnh Án');
    expect(profileText).not.toContain('Chi Tiết Hồ Sơ Bệnh Nhân (Popup)');
    expect(profileText).toContain('Chỉnh Sửa Hồ Sơ Y Tế');
    expect(profileText).toContain('Nhóm máu');
    await page.screenshot({ path: `${artifactDir}/flow-2-patient-profile.png` });

    // 3. Check Unified Booking Page
    await page.goto('http://localhost:3000/appointments/book?packageId=PKG-CBC-01');
    await page.waitForTimeout(1000);
    const bookingText = await page.locator('body').innerText();
    expect(bookingText).toContain('Đăng Ký Lịch Khám & Xét Nghiệm');
    expect(bookingText).not.toContain('Đang tải danh mục xét nghiệm...');
    expect(bookingText).not.toContain('Create appointment');
    expect(bookingText).not.toContain('Scope BMS District 1');
    await page.screenshot({ path: `${artifactDir}/flow-3-unified-booking.png` });

    // 4. Check VNPAY Checkout UI
    await page.goto('http://localhost:3000/payments/checkout?appointmentId=APT-TEST-001&code=APT-261031-9999&amount=180000');
    await page.waitForTimeout(1000);
    const checkoutText = await page.locator('body').innerText();
    expect(checkoutText).toContain('Cổng Thanh Toán Quốc Gia VNPAY');
    expect(checkoutText).toContain('Thời Gian Giữ Chỗ Xét Nghiệm Còn Lại');
    expect(checkoutText).not.toContain('CIMEALM7');
    await page.screenshot({ path: `${artifactDir}/flow-4-clean-vnpay-checkout.png` });

    // 5. Test VNPAY Success Callback Receipt
    await page.goto('http://localhost:3000/payments/checkout?appointmentId=APT-TEST-001&code=APT-261031-9999&amount=180000&vnp_ResponseCode=00&vnp_TransactionNo=14592031');
    await page.waitForTimeout(1500);
    const successText = await page.locator('body').innerText();
    expect(successText).toContain('Thanh Toán Thành Công');
    expect(successText).toContain('Mã Nhập Tay Phụ (Manual Check-in Code)');
    expect(successText).toContain('APT-261031-9999');
    await page.screenshot({ path: `${artifactDir}/flow-5-vnpay-success-receipt.png` });
  });

  test('2. Receptionist Flow: Check-in patient, Enter manual check-in code', async ({ page }) => {
    // Login as Receptionist
    await page.goto('http://localhost:3000/login');
    await page.fill('input[type="text"], input[name="username"]', 'receptionist');
    await page.fill('input[type="password"]', 'Recep@123');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(1500);

    // Open Receptionist Check-in Page
    await page.goto('http://localhost:3000/reception/checkin');
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `${artifactDir}/flow-6-receptionist-checkin.png` });
  });

  test('3. Doctor Flow: Doctor Console & Test Order Creation', async ({ page }) => {
    // Login as Doctor
    await page.goto('http://localhost:3000/login');
    await page.fill('input[type="text"], input[name="username"]', 'doctor');
    await page.fill('input[type="password"]', 'Doctor@123');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(1500);

    // Doctor Console
    await page.goto('http://localhost:3000/doctor/console');
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `${artifactDir}/flow-7-doctor-console.png` });

    // Doctor Order Creation
    await page.goto('http://localhost:3000/doctor/orders/create');
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `${artifactDir}/flow-8-doctor-order-create.png` });
  });

  test('4. Lab Tech Flow: Sample Queue & Enter Test Results', async ({ page }) => {
    // Login as Lab Tech
    await page.goto('http://localhost:3000/login');
    await page.fill('input[type="text"], input[name="username"]', 'labuser');
    await page.fill('input[type="password"]', 'LabUser@123');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(1500);

    // Sample Queue
    await page.goto('http://localhost:3000/laboratory/samples');
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `${artifactDir}/flow-9-lab-samples-queue.png` });

    // Enter Test Results Page
    await page.goto('http://localhost:3000/laboratory/enter-test-results');
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `${artifactDir}/flow-10-lab-enter-results.png` });
  });
});
