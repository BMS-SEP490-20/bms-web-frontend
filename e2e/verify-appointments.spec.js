import { test, expect } from '@playwright/test';

test.describe('Verify Patient Appointments Page', () => {
  test('Patient sees appointment list without HTTP 401', async ({ page }) => {
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
        id: 'USR-PAT-01',
        username: 'patient',
        fullName: 'Bệnh Nhân Võ Gia Huy',
        role: 'Patient',
        roleId: 6,
        phone: '0901234567'
      };
      localStorage.setItem('bms_user', JSON.stringify(patient));
      localStorage.setItem('bms_access_token', jwt);
      localStorage.setItem('bms_token', jwt);
      localStorage.setItem('accessToken', jwt);
    }, token);

    // Visit /appointments
    await page.goto('http://localhost:3000/appointments');
    await page.waitForTimeout(1500);

    // Assert that HTTP 401 is NOT present
    const alert401 = page.getByText('HTTP 401');
    await expect(alert401).not.toBeVisible();

    // Assert patient title
    await expect(page.getByText('Lịch Khám & Hẹn Lấy Mẫu Của Tôi')).toBeVisible();

    // Assert "Đặt Lịch Khám Mới" CTA
    await expect(page.getByText('Đặt Lịch Khám Mới').first()).toBeVisible();

    // Take screenshot for visual inspection
    await page.screenshot({ path: 'C:/Users/ADMIN/.gemini/antigravity/brain/25ad7756-f424-4f7d-bedf-8879730fd819/patient-appointments-fixed.png' });
    console.log('Saved patient-appointments-fixed.png');
  });
});

