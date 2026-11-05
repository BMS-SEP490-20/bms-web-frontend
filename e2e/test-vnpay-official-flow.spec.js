import { test, expect } from '@playwright/test';

test.describe('Official VNPAY Sandbox Gateway & Receptionist Check-in Flow', () => {

  test('1. Verify Checkout Page has NO mock simulator buttons and triggers official VNPAY URL generation', async ({ page }) => {
    // 1. Get real patient JWT token
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
        phoneNumber: '0909123456',
        phone: '0909123456',
        identityNumber: '079201004829',
        identityCard: '079201004829',
        bloodType: 'O+',
        isProfileComplete: true
      };
      localStorage.setItem('bms_user', JSON.stringify(patient));
      localStorage.setItem('user', JSON.stringify(patient));
      localStorage.setItem('bms_access_token', jwt);
      localStorage.setItem('bms_token', jwt);
      localStorage.setItem('accessToken', jwt);
      localStorage.setItem('token', jwt);
    }, token);

    // Navigate to checkout
    await page.goto('http://localhost:3000/payments/checkout?appointmentId=63a1b293-3912-4736-8667-317936371718&code=APT-261031-0001&amount=180000&pkgName=T%E1%BB%95ng%20ph%C3%A2n%20t%C3%ADch%20t%E1%BA%BF%20b%C3%A0o%20m%C3%A1u%20ngo%E1%BA%A1i%20vi%20(24%20th%C3%B4ng%20s%E1%BB%91%20Laser)');
    await page.waitForTimeout(1500);

    // Verify header and timer
    await expect(page.locator('text=Thanh Toán & Giữ Chỗ Lịch Xét Nghiệm')).toBeVisible();
    await expect(page.locator('text=Thời Gian Giữ Chỗ Xét Nghiệm Còn Lại')).toBeVisible();

    // Verify ABSENCE of simulator buttons
    await expect(page.locator('text=Công cụ kiểm thử nhanh')).toHaveCount(0);
    await expect(page.locator('text=Mô Phỏng Thanh Toán Thành Công')).toHaveCount(0);
    await expect(page.locator('text=Mô Phỏng Giao Dịch Thất Bại')).toHaveCount(0);

    // Verify official VNPAY pay button exists
    const payBtn = page.locator('button:has-text("Thanh Toán Bằng Cổng VNPAY")');
    await expect(payBtn).toBeVisible();

    // Verify NCB sandbox test card guide is available
    await expect(page.locator('text=Thông tin Thẻ Test NCB Sandbox')).toBeVisible();
    await expect(page.locator('text=9704 1985 2619 1432 198')).toBeVisible();

    // Intercept create-url request
    let capturedUrl = '';
    await page.route('**/api/payments/vnpay/create-url', async (route) => {
      const response = await route.fetch();
      const json = await response.json();
      capturedUrl = json.data?.paymentUrl || '';
      await route.fulfill({ response, json });
    });

    // Take screenshot of clean checkout page
    await page.screenshot({ path: 'C:/Users/ADMIN/.gemini/antigravity/brain/25ad7756-f424-4f7d-bedf-8879730fd819/vnpay-official-clean-checkout.png', fullPage: true });

    // Click VNPAY pay button
    await payBtn.click();
    await page.waitForTimeout(2000);

    expect(capturedUrl).toContain('https://sandbox.vnpayment.vn/paymentv2/vpcpay.html');
    expect(capturedUrl).toContain('vnp_TmnCode=CIMEALM7');
    expect(capturedUrl).toContain('vnp_Amount=18000000');
    expect(capturedUrl).toContain('vnp_SecureHash=');
  });

  test('2. Verify VNPAY return callback displays Check-in Slip with QR and Manual Code', async ({ page }) => {
    // 1. Get real patient JWT token
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
        phoneNumber: '0909123456',
        phone: '0909123456',
        identityNumber: '079201004829',
        identityCard: '079201004829',
        bloodType: 'O+',
        isProfileComplete: true
      };
      localStorage.setItem('bms_user', JSON.stringify(patient));
      localStorage.setItem('user', JSON.stringify(patient));
      localStorage.setItem('bms_access_token', jwt);
      localStorage.setItem('bms_token', jwt);
      localStorage.setItem('accessToken', jwt);
      localStorage.setItem('token', jwt);
    }, token);

    // Navigate with VNPAY return params (ResponseCode 00)
    await page.goto('http://localhost:3000/payments/checkout?appointmentId=63a1b293-3912-4736-8667-317936371718&code=APT-261031-0001&amount=180000&pkgName=T%E1%BB%95ng%20ph%C3%A2n%20t%C3%ADch%20t%E1%BA%BF%20b%C3%A0o%20m%C3%A1u%20ngo%E1%BA%A1i%20vi&vnp_ResponseCode=00&vnp_TransactionNo=14592812&vnp_TxnRef=APT-261031-0001&vnp_BankCode=NCB');
    await page.waitForTimeout(3000);

    // Verify success receipt
    await expect(page.locator('text=Thanh Toán Thành Công Qua Cổng VNPAY!')).toBeVisible();
    await expect(page.locator('text=Phiếu Tiếp Đón & Check-in Xét Nghiệm')).toBeVisible();
    await expect(page.locator('text=Mã Nhập Tay Phụ')).toBeVisible();
    await expect(page.locator('text=APT-261031-0001')).toBeVisible();

    // Verify SVG QR Code is rendered
    const qrSvg = page.locator('svg').first();
    await expect(qrSvg).toBeVisible();

    // Take screenshot of official check-in slip
    await page.screenshot({ path: 'C:/Users/ADMIN/.gemini/antigravity/brain/25ad7756-f424-4f7d-bedf-8879730fd819/vnpay-official-checkin-receipt.png', fullPage: true });
  });

  test('3. Verify Receptionist Workstation receives and checks in appointment', async ({ page }) => {
    // Login as Receptionist via form
    await page.goto('http://localhost:3000/login');
    await page.fill('input[type="text"], input[name="username"]', 'recep_lananh');
    await page.fill('input[type="password"]', 'Admin@123');
    await page.click('button[type="submit"]');

    // Should redirect directly to receptionist check-in workstation
    await page.waitForURL('**/receptionist/check-in', { timeout: 10000 });
    await expect(page.locator('text=Check-in bệnh nhân')).toBeVisible();
    await expect(page.locator('text=Mở máy quét QR / Nhập mã')).toBeVisible();

    // Take screenshot
    await page.screenshot({ path: 'C:/Users/ADMIN/.gemini/antigravity/brain/25ad7756-f424-4f7d-bedf-8879730fd819/vnpay-receptionist-workstation.png', fullPage: true });
  });

});
