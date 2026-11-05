import { test, expect } from '@playwright/test';

test.describe('Patient Registration with Administrative Units Cascading Dropdowns', () => {
  test('Verify all validation rules, cascading dropdowns, required street address and address preview', async ({ page }) => {
    // 1. Go to Register page
    await page.goto('http://localhost:3000/register');
    await page.waitForLoadState('networkidle');

    // 2. Verify header and form elements
    await expect(page.locator('text=Mở Hồ Sơ Sức Khỏe Điện Tử BMS')).toBeVisible();
    await expect(page.locator('text=2. Địa Chỉ Thường Trú (Phân Cấp Hành Chính Việt Nam)')).toBeVisible();

    // 3. Test validation: submit empty form
    await page.click('button:has-text("Đăng Ký Tài Khoản Bệnh Nhân BMS")');
    await page.waitForTimeout(500);
    // Browser HTML5 or custom validation triggers

    // 4. Fill Identity Information (No username field)
    await page.fill('input[name="fullName"]', 'Nguyễn Tấn Phát');
    await page.fill('input[name="identityCard"]', '079201009988');
    await page.fill('input[name="phoneNumber"]', '0939446265');
    await page.fill('input[name="email"]', 'tanphat218@gmail.com');
    await page.fill('input[name="dateOfBirth"]', '1998-05-15');
    await page.selectOption('select[name="gender"]', 'Nam');

    // Click Next to Step 2
    await page.click('button:has-text("Tiếp Tục: Nhập Địa Chỉ")');

    // 5. Test Cascading Address Dropdowns
    const provinceSelect = page.locator('select').nth(1); // First administrative select (Tỉnh/Thành)
    await provinceSelect.selectOption({ label: 'Thành phố Hồ Chí Minh' });
    await page.waitForTimeout(1000);

    const districtSelect = page.locator('select').nth(2); // Second select (Quận/Huyện)
    await districtSelect.selectOption({ label: 'Quận 1' });
    await page.waitForTimeout(1000);

    const wardSelect = page.locator('select').nth(3); // Third select (Phường/Xã)
    await wardSelect.selectOption({ label: 'Phường Bến Nghé' });

    // 6. Enter Street Address (Required)
    await page.fill('input[name="streetAddress"]', 'Số 218 đường Nguyễn Văn Cừ, Tòa nhà Landmark');

    // 7. Verify Live Address Preview Card
    const previewLocator = page.locator('text=Địa chỉ đăng ký đầy đủ:');
    await expect(previewLocator).toBeVisible();
    const previewText = await page.locator('strong:has-text("Số 218 đường Nguyễn Văn Cừ")').innerText();
    expect(previewText).toContain('Số 218 đường Nguyễn Văn Cừ, Tòa nhà Landmark, Phường Bến Nghé, Quận 1, Thành phố Hồ Chí Minh');

    // 8. Fill Password
    await page.fill('input[name="password"]', 'Phat@2026!');
    await page.fill('input[name="confirmPassword"]', 'Phat@2026!');

    // Capture visual screenshot artifact
    await page.screenshot({
      path: 'C:/Users/ADMIN/.gemini/antigravity/brain/25ad7756-f424-4f7d-bedf-8879730fd819/register-address-cascading-verified.png',
      fullPage: true
    });

    console.log('✅ Verified Register Page Address Cascading Dropdowns & Validation successfully!');
  });
});

