import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('Registration Per-Field Validation Suite', () => {
  test('Verify independent, field-by-field validation on Step 1, Step 2, and Step 3', async ({ page }) => {
    test.setTimeout(90000);

    const artifactDir = 'C:/Users/ADMIN/.gemini/antigravity/brain/25ad7756-f424-4f7d-bedf-8879730fd819';

    // 1. Navigate to Register page
    await page.goto('http://localhost:3000/register');
    await page.waitForLoadState('networkidle');

    // =========================================================================
    // STEP 1 VALIDATION CHECKS
    // =========================================================================
    console.log('[Test] 1. Checking Step 1 empty submissions and per-field errors...');
    await expect(page.locator('h5:has-text("Bước 1: Thông Tin Định Danh Bệnh Nhân")')).toBeVisible();

    // Verify "Tên đăng nhập" is completely absent
    await expect(page.locator('input[name="username"]')).toHaveCount(0);
    await expect(page.locator('label:has-text("Tên đăng nhập")')).toHaveCount(0);

    // Click Next with completely empty form
    await page.click('button:has-text("Tiếp Tục: Nhập Địa Chỉ")');

    // Assert individual inline error messages appear for EACH field in Step 1
    const fullNameFeedback = page.locator('input[name="fullName"] ~ .invalid-feedback');
    await expect(fullNameFeedback).toBeVisible();
    await expect(fullNameFeedback).toHaveText('Vui lòng nhập Họ và tên bệnh nhân đầy đủ (tối thiểu 2 ký tự).');
    await expect(page.locator('input[name="fullName"]')).toHaveClass(/is-invalid/);

    const cccdFeedback = page.locator('.input-group:has(input[name="identityCard"]) .invalid-feedback');
    await expect(cccdFeedback).toBeVisible();
    await expect(cccdFeedback).toHaveText('Vui lòng nhập số Căn cước công dân (CCCD).');
    await expect(page.locator('input[name="identityCard"]')).toHaveClass(/is-invalid/);

    const phoneFeedback = page.locator('.input-group:has(input[name="phoneNumber"]) .invalid-feedback');
    await expect(phoneFeedback).toBeVisible();
    await expect(phoneFeedback).toHaveText('Vui lòng nhập số điện thoại liên hệ.');
    await expect(page.locator('input[name="phoneNumber"]')).toHaveClass(/is-invalid/);

    const emailFeedback = page.locator('.input-group:has(input[name="email"]) .invalid-feedback');
    await expect(emailFeedback).toBeVisible();
    await expect(emailFeedback).toHaveText('Vui lòng nhập địa chỉ Email nhận kết quả & OTP.');
    await expect(page.locator('input[name="email"]')).toHaveClass(/is-invalid/);

    const dobFeedback = page.locator('input[name="dateOfBirth"] ~ .invalid-feedback');
    await expect(dobFeedback).toBeVisible();
    await expect(dobFeedback).toHaveText('Vui lòng chọn ngày sinh của bệnh nhân.');
    await expect(page.locator('input[name="dateOfBirth"]')).toHaveClass(/is-invalid/);

    // Save screenshot of Step 1 individual field errors
    await page.screenshot({ path: path.join(artifactDir, 'register-step1-individual-field-errors.png'), fullPage: true });
    console.log('[Test] Step 1 individual validation errors successfully captured.');

    // Test specific format validations on Step 1:
    // a. Full name single letter
    await page.fill('input[name="fullName"]', 'A');
    await page.locator('input[name="fullName"]').blur();
    await expect(fullNameFeedback).toHaveText('Họ và tên bệnh nhân phải có tối thiểu 2 ký tự.');

    // b. CCCD wrong format
    await page.fill('input[name="identityCard"]', '123456');
    await page.locator('input[name="identityCard"]').blur();
    await expect(cccdFeedback).toHaveText('Số CCCD phải bao gồm chính xác 12 chữ số theo quy định Bộ Công An.');

    // c. Phone wrong format
    await page.fill('input[name="phoneNumber"]', '0123456789');
    await page.locator('input[name="phoneNumber"]').blur();
    await expect(phoneFeedback).toHaveText('Số điện thoại không hợp lệ (phải gồm 10 số, bắt đầu bằng 03, 05, 07, 08 hoặc 09).');

    // d. Email wrong format
    await page.fill('input[name="email"]', 'bad-email-format');
    await page.locator('input[name="email"]').blur();
    await expect(emailFeedback).toHaveText('Địa chỉ Email không đúng định dạng chuẩn (ví dụ: patient@example.com).');

    // e. Date of birth future date
    await page.fill('input[name="dateOfBirth"]', '2099-01-01');
    await page.locator('input[name="dateOfBirth"]').blur();
    await expect(dobFeedback).toHaveText('Ngày sinh không được lớn hơn ngày hiện tại.');

    // Now fill perfectly valid Step 1 data
    const rand = Math.floor(Math.random() * 899999 + 100000);
    const validCccd = '079201' + rand;
    const validEmail = 'patient_' + rand + '@clinic.vn';

    await page.fill('input[name="fullName"]', 'Nguyễn Tấn Phát');
    await page.fill('input[name="identityCard"]', validCccd);
    await page.fill('input[name="phoneNumber"]', '0939446265');
    await page.fill('input[name="email"]', validEmail);
    await page.fill('input[name="dateOfBirth"]', '1998-05-15');
    await page.selectOption('select[name="gender"]', 'Nam');

    // Click Next to Step 2
    await page.click('button:has-text("Tiếp Tục: Nhập Địa Chỉ")');

    // =========================================================================
    // STEP 2 VALIDATION CHECKS
    // =========================================================================
    console.log('[Test] 2. Checking Step 2 empty submissions and per-field errors...');
    await expect(page.locator('h5:has-text("Bước 2: Địa Chỉ Thường Trú")')).toBeVisible();

    // Click Next without selecting address or street
    await page.click('button:has-text("Tiếp Tục: Thiết Lập Mật Khẩu")');

    // Assert individual inline error messages appear for EACH field in Step 2
    const provFeedback = page.locator('#provinceSelect ~ .invalid-feedback');
    await expect(provFeedback).toBeVisible();
    await expect(provFeedback).toHaveText('Vui lòng chọn Tỉnh / Thành phố thường trú.');
    await expect(page.locator('#provinceSelect')).toHaveClass(/is-invalid/);

    const distFeedback = page.locator('#districtSelect ~ .invalid-feedback');
    await expect(distFeedback).toBeVisible();
    await expect(distFeedback).toHaveText('Vui lòng chọn Quận / Huyện thường trú.');
    await expect(page.locator('#districtSelect')).toHaveClass(/is-invalid/);

    const wardFeedback = page.locator('#wardSelect ~ .invalid-feedback');
    await expect(wardFeedback).toBeVisible();
    await expect(wardFeedback).toHaveText('Vui lòng chọn Phường / Xã thường trú.');
    await expect(page.locator('#wardSelect')).toHaveClass(/is-invalid/);

    const streetFeedback = page.locator('input[name="streetAddress"] ~ .invalid-feedback');
    await expect(streetFeedback).toBeVisible();
    await expect(streetFeedback).toHaveText('Vui lòng nhập số nhà, tên đường hoặc thôn/xóm (bắt buộc nhập).');
    await expect(page.locator('input[name="streetAddress"]')).toHaveClass(/is-invalid/);

    // Save screenshot of Step 2 individual field errors
    await page.screenshot({ path: path.join(artifactDir, 'register-step2-individual-field-errors.png'), fullPage: true });
    console.log('[Test] Step 2 individual validation errors successfully captured.');

    // Now select cascaded address and fill street address
    await page.selectOption('#provinceSelect', { label: 'Thành phố Hồ Chí Minh' });
    await expect(page.locator('#districtSelect')).toBeEnabled({ timeout: 5000 });
    await page.selectOption('#districtSelect', { label: 'Quận 1' });
    await expect(page.locator('#wardSelect')).toBeEnabled({ timeout: 5000 });
    await page.selectOption('#wardSelect', { label: 'Phường Bến Nghé' });

    // Test street address too short (< 3 chars)
    await page.fill('input[name="streetAddress"]', 'No');
    await page.locator('input[name="streetAddress"]').blur();
    await expect(streetFeedback).toHaveText('Số nhà, tên đường phải có tối thiểu 3 ký tự (Tiêu chí 3.1 QĐ 2429/QĐ-BYT).');

    // Fill valid street address
    await page.fill('input[name="streetAddress"]', 'Số 218 đường Nguyễn Văn Cừ, Tòa nhà Landmark');
    await expect(page.locator('strong:has-text("Số 218 đường Nguyễn Văn Cừ")')).toBeVisible();

    // Click Next to Step 3
    await page.click('button:has-text("Tiếp Tục: Thiết Lập Mật Khẩu")');

    // =========================================================================
    // STEP 3 VALIDATION CHECKS
    // =========================================================================
    console.log('[Test] 3. Checking Step 3 empty submissions and per-field errors...');
    await expect(page.locator('h5:has-text("Bước 3: Thiết Lập Mật Khẩu Bảo Mật")')).toBeVisible();

    // Click Register & Send OTP without entering password
    await page.click('button:has-text("Đăng Ký & Nhận Mã OTP")');

    // Assert individual inline error messages appear for password fields
    const pwdFeedback = page.locator('.input-group:has(input[name="password"]) .invalid-feedback');
    await expect(pwdFeedback).toBeVisible();
    await expect(pwdFeedback).toHaveText('Vui lòng thiết lập mật khẩu bảo mật.');
    await expect(page.locator('input[name="password"]')).toHaveClass(/is-invalid/);

    const confirmPwdFeedback = page.locator('input[name="confirmPassword"] ~ .invalid-feedback');
    await expect(confirmPwdFeedback).toBeVisible();
    await expect(confirmPwdFeedback).toHaveText('Vui lòng xác nhận lại mật khẩu.');
    await expect(page.locator('input[name="confirmPassword"]')).toHaveClass(/is-invalid/);

    // Save screenshot of Step 3 individual field errors
    await page.screenshot({ path: path.join(artifactDir, 'register-step3-individual-field-errors.png'), fullPage: true });
    console.log('[Test] Step 3 individual validation errors successfully captured.');

    // Test password strength validation (< 8 chars)
    await page.fill('input[name="password"]', 'Ab1!');
    await page.locator('input[name="password"]').blur();
    await expect(pwdFeedback).toHaveText('Mật khẩu bảo mật phải có độ dài tối thiểu 8 ký tự.');

    // Test missing special character
    await page.fill('input[name="password"]', 'Password123');
    await page.locator('input[name="password"]').blur();
    await expect(pwdFeedback).toHaveText('Mật khẩu phải chứa ít nhất 1 chữ hoa, 1 chữ thường, 1 số và 1 ký tự đặc biệt.');

    // Test password mismatch
    await page.fill('input[name="password"]', 'TanPhat@2026!');
    await page.fill('input[name="confirmPassword"]', 'Different@2026!');
    await page.locator('input[name="confirmPassword"]').blur();
    await expect(confirmPwdFeedback).toHaveText('Mật khẩu xác nhận không trùng khớp với mật khẩu đã nhập.');

    // Test eye toggle button on Confirm Password field
    const confirmEyeBtn = page.locator('button[aria-label="Ẩn hiện xác nhận mật khẩu"]');
    await expect(confirmEyeBtn).toBeVisible();
    await expect(page.locator('input[name="confirmPassword"]')).toHaveAttribute('type', 'password');
    await confirmEyeBtn.click();
    await expect(page.locator('input[name="confirmPassword"]')).toHaveAttribute('type', 'text');
    await page.screenshot({ path: path.join(artifactDir, 'register-step3-eye-toggle-verified.png'), fullPage: true });
    await confirmEyeBtn.click();
    await expect(page.locator('input[name="confirmPassword"]')).toHaveAttribute('type', 'password');

    // Fill valid matching password
    await page.fill('input[name="confirmPassword"]', 'TanPhat@2026!');
    await expect(page.locator('input[name="password"]')).toHaveClass(/is-valid/);
    await expect(page.locator('input[name="confirmPassword"]')).toHaveClass(/is-valid/);

    // Verify Review Card has all information properly populated
    const reviewCard = page.locator('.bms-review-card');
    await expect(reviewCard).toBeVisible();
    await expect(reviewCard).toContainText('Nguyễn Tấn Phát');
    await expect(reviewCard).toContainText(validCccd);
    await expect(reviewCard).toContainText(validEmail);
    await expect(reviewCard).toContainText('0939446265');
    await expect(reviewCard).toContainText('Số 218 đường Nguyễn Văn Cừ');

    // Final submission to Step 4
    await page.click('button:has-text("Đăng Ký & Nhận Mã OTP")');

    // =========================================================================
    // STEP 4 OTP CHECK
    // =========================================================================
    console.log('[Test] 4. Checking Step 4 OTP screen...');
    await expect(page.locator('h4:has-text("Bước 4: Xác Thực Tài Khoản (Mã OTP)")')).toBeVisible({ timeout: 20000 });
    await expect(page.locator('.bms-step-item').nth(3)).toHaveClass(/active/);
    await expect(page.locator('.bms-otp-container').locator(`text=${validEmail}`)).toBeVisible();
    await expect(page.locator('text=Hướng dẫn kiểm tra hộp thư y tế')).toBeVisible();

    // Verify dev OTP badge and autofill button are completely removed for production security
    await expect(page.locator('text=[Mã OTP hệ thống]')).toHaveCount(0);
    await expect(page.locator('text=Tự động điền mã')).toHaveCount(0);

    await page.screenshot({ path: path.join(artifactDir, 'register-step4-otp-verified.png'), fullPage: true });
    console.log('[Test] Step 4 OTP screen successfully verified and captured.');
  });
});

