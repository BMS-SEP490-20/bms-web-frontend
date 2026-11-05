import { test, expect } from '@playwright/test';

test.describe('Patient Clinical Profile, VNPAY Sandbox & QR Check-in Workflow', () => {
  test('Complete end-to-end journey', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });

    // 1. Get real patient JWT token
    const loginRes = await page.request.post('http://localhost:5000/api/auth/login', {
      data: {
        usernameOrEmail: 'patient',
        password: 'Admin@123'
      }
    });
    const loginData = await loginRes.json();
    const token = loginData.token || loginData.data?.token || loginData.accessToken;

    // Set stored user and token in page context
    await page.goto('http://localhost:3000/');
    await page.evaluate((jwt) => {
      const patient = {
        id: '670560000000000000000010',
        patientId: 'BN-2026-670560000000000000000010',
        username: 'patient',
        fullName: 'Trần Văn An',
        role: 'Patient',
        roleId: 6,
        phoneNumber: '0909123456',
        phone: '0909123456',
        identityNumber: '079201004829',
        identityCard: '079201004829',
        bloodType: 'O+',
        isProfileComplete: true
      };
      localStorage.setItem('bms_user', JSON.stringify(patient));
      localStorage.setItem('user', JSON.stringify(patient));
      localStorage.setItem('bms_access_token', jwt);
      localStorage.setItem('bms_token', jwt);
      localStorage.setItem('accessToken', jwt);
      localStorage.setItem('token', jwt);
    }, token);

    // 2. Navigate to /profile and verify medical profile UI
    await page.goto('http://localhost:3000/profile');
    await page.waitForLoadState('networkidle');

    // Verify obsolete buttons are removed
    await expect(page.locator('text=Làm Mới Hồ Sơ')).toHaveCount(0);
    await expect(page.locator('text=Xem Nhanh Bệnh Án')).toHaveCount(0);
    await expect(page.locator('text=Chi Tiết Hồ Sơ Bệnh Nhân (Popup)')).toHaveCount(0);

    // Verify Medical Profile header & fields
    await expect(page.locator('text=Hồ Sơ Bệnh Án Chuẩn Y Tế Xét Nghiệm Máu')).toBeVisible();
    await expect(page.locator('text=1. Thông Tin Định Danh Bệnh Nhân')).toBeVisible();
    await expect(page.locator('text=2. Chỉ Số Huyết Học & Thể Trạng')).toBeVisible();
    await expect(page.locator('text=3. Tiền Sử Y Khoa & Rối Loạn Đông Máu')).toBeVisible();
    await expect(page.locator('text=4. Thông Tin Người Liên Hệ Khẩn Cấp')).toBeVisible();

    // Click "Chỉnh Sửa Hồ Sơ Y Tế" and verify form inputs
    const editBtn = page.locator('button:has-text("Chỉnh Sửa Hồ Sơ Y Tế")').first();
    await editBtn.click();
    await expect(page.locator('input[name="fullName"]')).toBeVisible();
    await expect(page.locator('select[name="bloodType"]')).toBeVisible();
    await expect(page.locator('input[name="heightCm"]')).toBeVisible();
    await expect(page.locator('input[name="weightKg"]')).toBeVisible();

    // Fill clinical vitals and date of birth
    await page.locator('input[name="dateOfBirth"]').fill('1995-08-15');
    await page.locator('input[name="heightCm"]').fill('172');
    await page.locator('input[name="weightKg"]').fill('68');
    await page.locator('input[name="emergencyContactName"]').fill('Nguyễn Thị Bình');
    await page.locator('input[name="emergencyContactPhone"]').fill('0988776655');

    // Save medical profile
    const saveBtn = page.locator('button:has-text("Lưu Hồ Sơ Bệnh Án Y Tế")');
    await saveBtn.click();

    await expect(page.locator('text=Hồ sơ bệnh án xét nghiệm y tế đã được lưu')).toBeVisible({ timeout: 10000 });
    await page.screenshot({ path: 'test-medical-profile-saved.png', fullPage: true });

    // 3. Test Booking & Redirect to Payment
    await page.goto('http://localhost:3000/appointments/book');
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('heading', { name: 'Đăng Ký Lịch Khám & Xét Nghiệm' })).toBeVisible();

    // Select package and submit booking
    const submitBtn = page.locator('button[type="submit"]');
    await expect(submitBtn).toBeVisible();
    await submitBtn.click();

    // Wait for success screen
    await expect(page.locator('text=Đăng Ký Lịch Khám & Xét Nghiệm Thành Công!')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=Phiếu Lịch Hẹn Đang Ở Trạng Thái "Chờ Thanh Toán"')).toBeVisible();

    // Click proceed to VNPAY payment
    const payBtn = page.locator('button:has-text("Tiến Hành Thanh Toán Giữ Chỗ")');
    await expect(payBtn).toBeVisible();
    await payBtn.click();

    // 4. Verify Payment Checkout Page
    await page.waitForURL(/.*\/payments\/checkout.*/);
    await expect(page.locator('text=Thanh Toán & Giữ Chỗ Lịch Xét Nghiệm')).toBeVisible();

    // Verify 15-Minute Countdown
    await expect(page.locator('text=Thời Gian Giữ Chỗ Xét Nghiệm Còn Lại:')).toBeVisible();

    // Verify VNPAY Sandbox info
    await expect(page.locator('text=CIMEALM7')).toBeVisible();
    await expect(page.locator('text=Thẻ Test VNPAY Sandbox (Ngân Hàng NCB)')).toBeVisible();
    await expect(page.locator('input[value="9704198526191432198"]')).toBeVisible();
    await expect(page.locator('input[value="NGUYEN VAN A"]')).toBeVisible();
    await expect(page.locator('input[value="123456"]')).toBeVisible();

    await page.screenshot({ path: 'test-payment-checkout.png', fullPage: true });

    // Test Failure Simulation
    const failBtn = page.locator('button:has-text("Mô Phỏng Giao Dịch Thất Bại")');
    await failBtn.click();
    await expect(page.locator('text=Giao dịch không thành công: Thẻ không đủ điều kiện')).toBeVisible();

    // Test Success Payment
    const successBtn = page.locator('button:has-text("Xác Nhận Thanh Toán Thẻ NCB (Demo VNPAY Thành Công)")');
    await successBtn.click();

    // Verify Success Screen
    await expect(page.locator('text=Thanh Toán VNPAY Thành Công!')).toBeVisible({ timeout: 10000 });
    await page.screenshot({ path: 'test-payment-success.png', fullPage: true });

    // 5. Navigate to Appointments and check QR Code & Manual Check-in Code
    const viewSlipBtn = page.locator('button:has-text("Xem Phiếu Lịch Hẹn & Mã QR Check-in")');
    await viewSlipBtn.click();

    await page.waitForURL(/.*\/appointments/);
    await expect(page.locator('text=Lịch Khám & Hẹn Lấy Mẫu Của Tôi')).toBeVisible();

    // Open detail of first appointment
    const detailBtn = page.locator('button:has-text("Chi tiết")').first();
    if (await detailBtn.count() > 0) {
      await detailBtn.click();
      await expect(page.locator('text=Phiếu Tiếp Đón & Check-in Xét Nghiệm')).toBeVisible();
      await expect(page.locator('text=Mã Nhập Tay Phụ (Manual Check-in Code):')).toBeVisible();
      await page.screenshot({ path: 'test-appointment-qr-slip.png' });
    }
  });
});
