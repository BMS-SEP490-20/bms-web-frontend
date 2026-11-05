import { test, expect } from '@playwright/test';

test('Capture QR Check-in slip screenshot', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });

  // 1. Login
  const loginRes = await page.request.post('http://localhost:5000/api/auth/login', {
    data: { usernameOrEmail: 'patient', password: 'Admin@123' }
  });
  const loginData = await loginRes.json();
  const token = loginData.accessToken;

  // 2. Set token in page
  await page.goto('http://localhost:3000/');
  await page.evaluate((jwt) => {
    const patient = {
      id: 'USR-PAT-01',
      patientId: 'PAT-USR-PAT-',
      username: 'patient',
      fullName: 'Trần Văn An',
      role: 'Patient',
      roleId: 6,
      phoneNumber: '0909123456',
      bloodType: 'O+',
      isProfileComplete: true
    };
    localStorage.setItem('bms_user', JSON.stringify(patient));
    localStorage.setItem('user', JSON.stringify(patient));
    localStorage.setItem('bms_access_token', jwt);
    localStorage.setItem('bms_token', jwt);
    localStorage.setItem('accessToken', jwt);
  }, token);

  // 3. Book an appointment directly
  const bookRes = await page.request.post('http://localhost:5000/api/appointments/book', {
    headers: { Authorization: `Bearer ${token}` },
    data: {
      patientId: 'USR-PAT-01',
      doctorId: '670560000000000000000002',
      appointmentDate: new Date(Date.now() + 86400000).toISOString().slice(0, 10),
      slotTime: '07:30',
      packageIds: ['PKG-CBC-01'],
      notes: 'Phòng khám Huyết học Tổng quát 1 (101)',
      type: 'ClinicVisit'
    }
  });

  // 4. Navigate to /appointments
  await page.goto('http://localhost:3000/appointments');
  await page.waitForLoadState('networkidle');

  // Click "Chi tiết"
  const detailBtn = page.locator('button:has-text("Chi tiết")').first();
  await expect(detailBtn).toBeVisible({ timeout: 10000 });
  await detailBtn.click();

  // Wait for QR code modal
  await expect(page.locator('text=Phiếu Tiếp Đón & Check-in Xét Nghiệm')).toBeVisible();
  await expect(page.locator('text=Mã Nhập Tay Phụ (Manual Check-in Code):')).toBeVisible();

  await page.screenshot({ path: 'test-appointment-qr-slip.png' });
});

