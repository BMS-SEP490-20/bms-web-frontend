import { test, expect } from '@playwright/test';

test.describe('Full 63 Provinces Verification', () => {
  test('Verify dropdown contains full 63 provinces of Vietnam and dynamic districts/wards load from MongoDB', async ({ page }) => {
    await page.goto('http://localhost:3000/register');
    await page.waitForLoadState('networkidle');

    const provinceSelect = page.locator('#provinceSelect');
    await expect(provinceSelect).toBeVisible();

    // Verify option count is 64 (1 placeholder + 63 provinces)
    const options = provinceSelect.locator('option');
    const count = await options.count();
    console.log(`Dropdown province options count: ${count}`);
    expect(count).toBe(64);

    // 1. Test selecting "Thành phố Hà Nội" (code 1)
    await provinceSelect.selectOption({ label: 'Thành phố Hà Nội' });
    const districtSelect = page.locator('#districtSelect');
    await expect(districtSelect).toBeEnabled({ timeout: 5000 });

    const hnDistrictOptions = districtSelect.locator('option');
    const hnDistrictCount = await hnDistrictOptions.count();
    console.log(`Hà Nội districts count: ${hnDistrictCount - 1}`);
    expect(hnDistrictCount).toBeGreaterThan(20);

    // Select "Quận Ba Đình"
    await districtSelect.selectOption({ label: 'Quận Ba Đình' });
    const wardSelect = page.locator('#wardSelect');
    await expect(wardSelect).toBeEnabled({ timeout: 5000 });

    const baDinhWardOptions = wardSelect.locator('option');
    const baDinhWardCount = await baDinhWardOptions.count();
    console.log(`Ba Đình wards count: ${baDinhWardCount - 1}`);
    expect(baDinhWardCount).toBeGreaterThan(10);

    // 2. Test selecting "Thành phố Hồ Chí Minh" (code 79)
    await provinceSelect.selectOption({ label: 'Thành phố Hồ Chí Minh' });
    await expect(districtSelect).toBeEnabled();
    const hcmDistricts = await districtSelect.locator('option').count();
    console.log(`TP.HCM districts count: ${hcmDistricts - 1}`);
    expect(hcmDistricts).toBeGreaterThan(15);

    // 3. Test selecting "Tỉnh Cà Mau" (code 96)
    await provinceSelect.selectOption({ label: 'Tỉnh Cà Mau' });
    await expect(districtSelect).toBeEnabled();
    const caMauDistricts = await districtSelect.locator('option').count();
    console.log(`Cà Mau districts count: ${caMauDistricts - 1}`);
    expect(caMauDistricts).toBeGreaterThan(5);

    // Click dropdown and take screenshot
    await page.click('#provinceSelect');
    await page.screenshot({ path: 'register-full-63-provinces-verified.png', fullPage: true });

    console.log('✅ Full 63 provinces of Vietnam and cascading districts/wards verified 100%!');
  });
});

