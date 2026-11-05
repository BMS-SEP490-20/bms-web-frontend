import { test, expect } from '@playwright/test';

test.describe('Forgot Password Flow Verification', () => {
  test('Verify unregistered email shows clear error and registered email enters Step 2 OTP modal', async ({ page }) => {
    test.setTimeout(60000);
    // 1. Navigate to forgot-password page
    await page.goto('http://localhost:3000/forgot-password');
    await page.waitForLoadState('networkidle');

    // Verify Title
    await expect(page.locator('h1')).toContainText('Khôi Phục Mật Khẩu');

    // 2. Test unregistered email
    const emailInput = page.locator('#recovery-email');
    await emailInput.fill('unregistered_account_999@test.com');
    await page.click('button[type="submit"]');

    // Expect error alert
    const alertError = page.locator('.bms-alert-error');
    await expect(alertError).toBeVisible({ timeout: 10000 });
    await expect(alertError).toContainText('không tồn tại');
    await expect(alertError.locator('a[href="/register"]')).toBeVisible();

    // Take screenshot of unregistered error state
    await page.screenshot({ path: 'forgot-password-unregistered-error.png', fullPage: true });

    // 3. Test registered email
    await emailInput.fill('tanphat218@gmail.com');
    await page.click('button[type="submit"]');

    // Expect step 2
    await expect(page.locator('h1')).toContainText('Đặt Lại Mật Khẩu', { timeout: 45000 });
    const alertSuccess = page.locator('.bms-alert-success');
    await expect(alertSuccess).toBeVisible({ timeout: 10000 });
    await expect(alertSuccess).toContainText('tanphat218@gmail.com');

    // Take screenshot of step 2 OTP form
    await page.screenshot({ path: 'forgot-password-step2-verified.png', fullPage: true });
    console.log('✅ Verified Forgot Password flow successfully!');
  });
});
