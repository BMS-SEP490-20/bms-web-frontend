import { test, expect } from '@playwright/test';

test.describe('4-Step Registration Wizard Verification', () => {
  test('Verify smooth 4-step wizard progression, validations, cascading address, and OTP screen', async ({ page }) => {
    test.setTimeout(60000);

    // 1. Navigate to Register page
    await page.goto('http://localhost:3000/register');
    await page.waitForLoadState('networkidle');

    // 2. Verify Step 1 is active
    await expect(page.locator('.bms-step-item').first()).toHaveClass(/active/);
    await expect(page.locator('h5:has-text("Bước 1: Thông Tin Định Danh Bệnh Nhân")')).toBeVisible();

    // Take screenshot of Step 1
    await page.screenshot({ path: 'register-step1-identity.png', fullPage: true });

    // Generate unique clinical test identity
    const rand = Math.floor(Math.random() * 899999 + 100000);
    const testCccd = '079201' + rand;
    const testUser = 'user_' + rand;
    const testEmail = 'patient_' + rand + '@gmail.com';

    // Assert that "Tên đăng nhập" field has been completely removed
    await expect(page.locator('input[name="username"]')).toHaveCount(0);
    await expect(page.locator('label:has-text("Tên đăng nhập")')).toHaveCount(0);

    // Fill Step 1 fields (No username field required)
    await page.fill('input[name="fullName"]', 'Đỗ Minh Quân');
    await page.fill('input[name="identityCard"]', testCccd);
    await page.fill('input[name="phoneNumber"]', '0988776655');
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="dateOfBirth"]', '1995-08-20');
    await page.selectOption('select[name="gender"]', 'Nam');

    // Click Next to Step 2
    await page.click('button:has-text("Tiếp Tục: Nhập Địa Chỉ")');

    // 3. Verify Step 2 is active
    await expect(page.locator('.bms-step-item').nth(1)).toHaveClass(/active/);
    await expect(page.locator('.bms-step-item').nth(0)).toHaveClass(/completed/);
    await expect(page.locator('h5:has-text("Bước 2: Địa Chỉ Thường Trú")')).toBeVisible();

    // Verify 63 provinces available in select
    const provinceSelect = page.locator('#provinceSelect');
    await expect(provinceSelect).toBeVisible();
    const provCount = await provinceSelect.locator('option').count();
    console.log(`Step 2: Province options count: ${provCount}`);
    expect(provCount).toBe(64);

    // Select Thành phố Hồ Chí Minh (code 79)
    await provinceSelect.selectOption({ label: 'Thành phố Hồ Chí Minh' });
    const districtSelect = page.locator('#districtSelect');
    await expect(districtSelect).toBeEnabled({ timeout: 5000 });

    // Select Quận 1
    await districtSelect.selectOption({ label: 'Quận 1' });
    const wardSelect = page.locator('#wardSelect');
    await expect(wardSelect).toBeEnabled({ timeout: 5000 });

    // Select Phường Bến Nghé
    await wardSelect.selectOption({ label: 'Phường Bến Nghé' });

    // Enter required street address
    await page.fill('input[name="streetAddress"]', 'Số 50 đường Lê Duẩn, Tòa nhà M-Plaza');

    // Verify Live Address Preview
    const preview = page.locator('strong:has-text("Số 50 đường Lê Duẩn")');
    await expect(preview).toBeVisible();
    expect(await preview.innerText()).toContain('Phường Bến Nghé, Quận 1, Thành phố Hồ Chí Minh');

    // Take screenshot of Step 2
    await page.screenshot({ path: 'register-step2-address.png', fullPage: true });

    // Click Next to Step 3
    await page.click('button:has-text("Tiếp Tục: Thiết Lập Mật Khẩu")');

    // 4. Verify Step 3 is active
    await expect(page.locator('.bms-step-item').nth(2)).toHaveClass(/active/);
    await expect(page.locator('.bms-step-item').nth(1)).toHaveClass(/completed/);
    await expect(page.locator('h5:has-text("Bước 3: Thiết Lập Mật Khẩu Bảo Mật")')).toBeVisible();

    // Fill passwords (BR-IAM-01 compliant)
    await page.fill('input[name="password"]', 'MinhQuan@2026!');
    await page.fill('input[name="confirmPassword"]', 'MinhQuan@2026!');

    // Verify Review Card has all entered info
    const reviewCard = page.locator('.bms-review-card');
    await expect(reviewCard).toBeVisible();
    await expect(reviewCard).toContainText('Đỗ Minh Quân');
    await expect(reviewCard).toContainText(testCccd);
    await expect(reviewCard).toContainText(testEmail);
    await expect(reviewCard).toContainText('Số 50 đường Lê Duẩn');

    // Take screenshot of Step 3
    await page.screenshot({ path: 'register-step3-password-review.png', fullPage: true });

    // Click Register & Send OTP
    await page.click('button:has-text("Đăng Ký & Nhận Mã OTP")');

    // 5. Verify Step 4 is active
    await expect(page.locator('.bms-step-item').nth(3)).toHaveClass(/active/, { timeout: 35000 });
    await expect(page.locator('h4:has-text("Bước 4: Xác Thực Tài Khoản (Mã OTP)")')).toBeVisible();
    await expect(page.locator('.bms-otp-container').locator(`text=${testEmail}`)).toBeVisible();

    // Take screenshot of Step 4
    await page.screenshot({ path: 'register-step4-otp.png', fullPage: true });

    console.log('✅ 4-Step Registration Wizard passed 100%!');
  });
});
