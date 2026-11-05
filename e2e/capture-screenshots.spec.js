import { test, expect } from '@playwright/test';

test.describe('Screenshots verification for unified UI & Navbar', () => {
  test('Capture Guest and Patient Navbar states', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });

    // 1. Guest View
    await page.goto('/');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'C:/Users/ADMIN/.gemini/antigravity/brain/25ad7756-f424-4f7d-bedf-8879730fd819/guest-fixed.png' });

    // 2. Patient View
    await page.evaluate(() => {
      const patient = {
        id: '670560000000000000000010',
        username: 'patient_an',
        fullName: 'Trần Văn An',
        role: 'Patient',
        roleId: 6,
        phone: '0909123456',
        medicalRecordNumber: 'BN-2026-0812'
      };
      localStorage.setItem('bms_user', JSON.stringify(patient));
      localStorage.setItem('bms_access_token', 'mock_token');
      localStorage.setItem('bms_token', 'mock_token');
    });

    await page.goto('/home');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'C:/Users/ADMIN/.gemini/antigravity/brain/25ad7756-f424-4f7d-bedf-8879730fd819/patient-fixed.png' });

    // 3. Click "Lịch Khám Của Tôi" to verify Patient header stays intact and NO admin dashboard
    await page.goto('/appointments');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'C:/Users/ADMIN/.gemini/antigravity/brain/25ad7756-f424-4f7d-bedf-8879730fd819/patient-appointments.png' });

    // 4. Visit tracking page
    await page.goto('/tracking');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'C:/Users/ADMIN/.gemini/antigravity/brain/25ad7756-f424-4f7d-bedf-8879730fd819/tracking-fixed.png' });
  });
});

