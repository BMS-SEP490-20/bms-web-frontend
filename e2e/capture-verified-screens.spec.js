import { test, expect } from '@playwright/test';
import path from 'path';

test('Capture verified screenshots for user review', async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 768 }); // standard laptop resolution

  // 1. Login as patient
  const loginRes = await page.request.post('http://localhost:5000/api/auth/login', {
    data: {
      usernameOrEmail: 'patient',
      password: 'Admin@123'
    }
  });
  const loginData = await loginRes.json();
  const token = loginData.accessToken;

  // 2. Set token and user in browser storage
  await page.goto('http://localhost:3000/');
  await page.evaluate((tok) => {
    localStorage.setItem('accessToken', tok);
    localStorage.setItem('token', tok);
    localStorage.setItem('bms_token', tok);
    localStorage.setItem('bms_access_token', tok);
    localStorage.setItem('bms_user', JSON.stringify({
      id: 'USR-PAT-01',
      username: 'patient',
      fullName: 'Trần Văn An',
      role: 'Patient',
      roleId: 6,
      phone: '0909123456',
      bloodType: 'O+'
    }));
  }, token);

  // 3. Navigate to /home and take screenshot of fixed header
  await page.goto('http://localhost:3000/home');
  await page.waitForLoadState('networkidle');
  await page.screenshot({
    path: 'C:/Users/ADMIN/.gemini/antigravity/brain/25ad7756-f424-4f7d-bedf-8879730fd819/verified-header-no-wrap.png',
    fullPage: false
  });

  // 4. Navigate to /appointments/book and take screenshot
  await page.goto('http://localhost:3000/appointments/book');
  await page.waitForLoadState('networkidle');
  await page.screenshot({
    path: 'C:/Users/ADMIN/.gemini/antigravity/brain/25ad7756-f424-4f7d-bedf-8879730fd819/verified-unified-booking.png',
    fullPage: false
  });

  // 5. Navigate to /appointments, click Chi tiết to view QR and manual check-in code
  await page.goto('http://localhost:3000/appointments');
  await page.waitForLoadState('networkidle');
  const detailBtn = page.locator('button:has-text("Chi tiết")').first();
  if (await detailBtn.count() > 0) {
    await detailBtn.click();
    await page.waitForSelector('.modal-content');
    await page.waitForTimeout(500);
    await page.screenshot({
      path: 'C:/Users/ADMIN/.gemini/antigravity/brain/25ad7756-f424-4f7d-bedf-8879730fd819/verified-qr-checkin-slip.png'
    });
  }
});

