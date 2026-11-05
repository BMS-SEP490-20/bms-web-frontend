import { test, expect } from '@playwright/test';

test.describe('Unified Single-Form Appointment Booking', () => {
  test('All booking entry points navigate to /appointments/book (1 form duy nhất)', async ({ page }) => {
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
        phone: '0909123456',
        identityCard: '079201004829',
        healthInsuranceNumber: 'DN 4 79 79 1234567'
      };
      localStorage.setItem('bms_user', JSON.stringify(patient));
      localStorage.setItem('bms_access_token', jwt);
      localStorage.setItem('bms_token', jwt);
      localStorage.setItem('accessToken', jwt);
    }, token);

    // 2. Test navigation from /home
    await page.goto('http://localhost:3000/home');
    await page.waitForTimeout(1000);

    // Click "Đặt Lịch Xét Nghiệm" on first package on home page
    const homeBookBtn = page.locator('button:has-text("Đặt Lịch Xét Nghiệm")').first();
    await homeBookBtn.click();
    await page.waitForTimeout(1000);

    // Assert URL navigated to /appointments/book
    expect(page.url()).toContain('/appointments/book');
    // Assert NO modal backdrop exists
    await expect(page.locator('.bms-modal-backdrop')).toHaveCount(0);

    // 3. Test navigation from /services
    await page.goto('http://localhost:3000/services');
    await page.waitForTimeout(1000);

    // Click "Đặt" or "Đặt lịch" button on /services
    const serviceBookBtn = page.locator('button[title="Đặt lịch"]').first();
    await serviceBookBtn.click();
    await page.waitForTimeout(1000);

    // Assert URL navigated to /appointments/book
    expect(page.url()).toContain('/appointments/book');
    await expect(page.locator('.modal-content')).toHaveCount(0);

    // 4. Verify the unified booking form on /appointments/book
    await expect(page.locator('h2')).toContainText('Đăng Ký Lịch Khám & Xét Nghiệm');

    // Verify packages are rendered immediately (no "Đang tải danh mục xét nghiệm...")
    const bodyText = await page.locator('body').innerText();
    expect(bodyText).not.toContain('Đang tải danh mục xét nghiệm...');
    expect(bodyText).not.toContain('Tại Phòng Khám BMS'); // Confirms clinic sampling toggle was removed
    expect(bodyText).not.toContain('Create appointment');

    // Verify Shifts
    await expect(page.getByText('Ca Sáng', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('Ca Chiều', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('Ca Tối', { exact: true }).first()).toBeVisible();

    // Verify Doctor and Room info
    await expect(page.locator('text=Nguyễn Văn Minh').first()).toBeVisible();

    // Take screenshot of unified booking form
    await page.screenshot({ path: 'C:/Users/ADMIN/.gemini/antigravity/brain/25ad7756-f424-4f7d-bedf-8879730fd819/unified-booking-page.png' });

    // 5. Submit booking
    const submitBtn = page.locator('button:has-text("Xác Nhận Đặt Lịch Xét Nghiệm")');
    await submitBtn.click();
    await page.waitForTimeout(2000);

    // Assert success card
    await expect(page.getByText('Đăng Ký Lịch Khám & Xét Nghiệm Thành Công!')).toBeVisible();

    // Take screenshot of booking success
    await page.screenshot({ path: 'C:/Users/ADMIN/.gemini/antigravity/brain/25ad7756-f424-4f7d-bedf-8879730fd819/unified-booking-success.png' });

    // Click "Xem Lịch Khám Của Tôi"
    await page.click('button:has-text("Xem Lịch Khám Của Tôi")');
    await page.waitForTimeout(1000);
    expect(page.url()).toContain('/appointments');
  });
});

