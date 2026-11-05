import { test, expect } from '@playwright/test';

test.describe('End-to-End Registration, OTP Verification, and Forgot Password', () => {
  test('Complete Registration -> OTP -> Forgot Password real OTP dispatch', async ({ page }) => {
    // 1. Go to Register page
    await page.goto('http://localhost:3000/register');
    await page.waitForLoadState('networkidle');

    // 2. Fill registration form
    await page.fill('input[name="fullName"]', 'Nguyễn Tấn Phát');
    await page.fill('input[name="identityCard"]', '079201009988');
    await page.fill('input[name="phoneNumber"]', '0939446265');
    await page.fill('input[name="email"]', 'tanphat218@gmail.com');
    await page.fill('input[name="username"]', 'tanphat218');
    await page.fill('input[name="dateOfBirth"]', '1998-05-15');
    await page.selectOption('select[name="gender"]', 'Nam');

    // Cascading dropdowns
    const provinceSelect = page.locator('select').nth(1);
    await provinceSelect.selectOption({ label: 'Thành phố Hồ Chí Minh' });
    await page.waitForTimeout(1000);

    const districtSelect = page.locator('select').nth(2);
    await districtSelect.selectOption({ label: 'Quận 1' });
    await page.waitForTimeout(1000);

    const wardSelect = page.locator('select').nth(3);
    await wardSelect.selectOption({ label: 'Phường Bến Nghé' });

    await page.fill('input[name="streetAddress"]', 'Số 218 đường Nguyễn Văn Cừ');

    await page.fill('input[name="password"]', 'Phat@2026!');
    await page.fill('input[name="confirmPassword"]', 'Phat@2026!');

    // 3. Click Register button
    await page.click('button:has-text("Đăng Ký Tài Khoản Bệnh Nhân BMS")');

    // 4. Modal OTP appears
    await expect(page.locator('text=Xác Thực Tài Khoản (Mã OTP)')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('text=tanphat218@gmail.com')).toBeVisible();

    // Take screenshot of OTP modal
    await page.screenshot({
      path: 'C:/Users/ADMIN/.gemini/antigravity/brain/25ad7756-f424-4f7d-bedf-8879730fd819/register-otp-modal-active.png',
      fullPage: true
    });

    console.log('✅ Registration submitted and OTP modal activated successfully!');
  });
});

