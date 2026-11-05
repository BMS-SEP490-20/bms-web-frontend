import { test, expect } from '@playwright/test';

test.describe('Verify Patient Appointment Booking Overhaul', () => {
  test('Patient books appointment with shifts, doctor and room', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });

    // Login via API to get real JWT token
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

    // 1. Visit /appointments/book
    await page.goto('http://localhost:3000/appointments/book');
    await page.waitForTimeout(1500);

    // Verify Title & absence of English receptionist fields
    await expect(page.locator('h2')).toContainText('Đăng Ký Lịch Khám & Xét Nghiệm');
    const bodyText = await page.locator('body').innerText();
    expect(bodyText).not.toContain('Create appointment');
    expect(bodyText).not.toContain('Data entry guide');
    expect(bodyText).not.toContain('Scope BMS District 1');
    expect(bodyText).not.toContain('Tại Phòng Khám BMS'); // Confirms clinic sampling toggle was removed

    // Verify Shifts are displayed
    await expect(page.getByText('Ca Sáng', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('Ca Chiều', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('Ca Tối', { exact: true }).first()).toBeVisible();

    // Verify Doctor and Room info card
    await expect(page.locator('text=Nguyễn Văn Minh').first()).toBeVisible();

    // Take screenshot of /appointments/book
    await page.screenshot({ path: 'C:/Users/ADMIN/.gemini/antigravity/brain/25ad7756-f424-4f7d-bedf-8879730fd819/booking-page-overhaul.png' });

    // 2. Submit booking on /appointments/book
    const submitBtn = page.locator('button:has-text("Xác Nhận Đặt Lịch Xét Nghiệm")');
    await submitBtn.click();
    await page.waitForTimeout(2000);

    // Take screenshot of booking success
    await page.screenshot({ path: 'C:/Users/ADMIN/.gemini/antigravity/brain/25ad7756-f424-4f7d-bedf-8879730fd819/booking-success-overhaul.png' });

    // 3. Visit /services to test booking modal
    await page.goto('http://localhost:3000/services');
    await page.waitForTimeout(1500);

    const firstBookBtn = page.locator('button[title="Đặt lịch"]').first();
    await firstBookBtn.click();
    await page.waitForTimeout(1000);

    // Verify modal elements
    const modalText = await page.locator('.modal-content').innerText();
    expect(modalText).toContain('Đăng Ký Lịch Khám & Xét Nghiệm');
    expect(modalText).toContain('Ca Sáng');
    expect(modalText).toContain('Ca Chiều');
    expect(modalText).toContain('Ca Tối');
    expect(modalText).not.toContain('Tại Phòng Khám BMS');
    expect(modalText).toContain('Nguyễn Văn Minh');

    // Take screenshot of modal
    await page.screenshot({ path: 'C:/Users/ADMIN/.gemini/antigravity/brain/25ad7756-f424-4f7d-bedf-8879730fd819/services-modal-overhaul.png' });
  });
});
