import { test, expect } from '@playwright/test';

test.describe('Doctor Domain Pages Comprehensive Verification', () => {
  test('Doctor Full Night Shift Clinical Flow & Pages Verification', async ({ page }) => {
    // 1. Login with doctor account
    await page.goto('http://localhost:3000/login');
    await page.waitForLoadState('networkidle');

    // Try dr_nguyenminh / Admin@123 first, or doctor / Doctor@123
    await page.fill('input[type="text"], input[name="username"]', 'dr_nguyenminh');
    await page.fill('input[type="password"]', 'Admin@123');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(1500);

    // If still on login page, fallback to doctor account
    if (page.url().includes('/login')) {
      await page.fill('input[type="text"], input[name="username"]', 'doctor');
      await page.fill('input[type="password"]', 'Doctor@123');
      await page.click('button[type="submit"]');
      await page.waitForTimeout(1500);
    }

    // --- Page 1: Doctor Console (Bàn khám bác sĩ & Điều phối hàng đợi) ---
    await page.goto('http://localhost:3000/doctor/console');
    await page.waitForTimeout(1500);
    const consoleText = await page.locator('body').innerText();
    expect(consoleText).toContain('Bàn Khám Bác Sĩ & Điều Phối Bệnh Nhân');
    expect(consoleText).toContain('GỌI SỐ TIẾP THEO (F2)');
    expect(consoleText).toContain('Hàng Đợi Chờ Khám');
    expect(consoleText).not.toContain('undefined');
    console.log('✅ Page 1: Doctor Console verified.');

    // --- Page 2: Create Test Order (Chỉ định xét nghiệm máu, ICD-10 & Trừ hao vật tư) ---
    await page.goto('http://localhost:3000/doctor/orders/create?patientId=PAT-TEST-001&patientName=Nguyen%20Van%20A&appointmentId=APT-001');
    await page.waitForTimeout(1500);
    const orderText = await page.locator('body').innerText();
    expect(orderText).toContain('Kê Phiếu Chỉ Định Xét Nghiệm Máu & Cận Lâm Sàng');
    expect(orderText).toContain('Mã Bệnh WHO ICD-10');
    expect(orderText).toContain('Tóm Tắt Phiếu Chỉ Định');
    expect(orderText).toContain('Ra Chỉ Định Xét Nghiệm');
    expect(orderText).not.toContain('Create test order');
    expect(orderText).not.toContain('Select tests & packages');
    console.log('✅ Page 2: Create Test Order verified.');

    // --- Page 3: Medical Records EMR (Bệnh án điện tử & Cấu trúc SOAPE) ---
    await page.goto('http://localhost:3000/doctor/emr?patientId=PAT-261019-0005');
    await page.waitForTimeout(1500);
    const emrText = await page.locator('body').innerText();
    expect(emrText).toContain('Phân Hệ Bệnh Án Điện Tử (EMR Workspace)');
    expect(emrText).toContain('Tạo Bệnh Án Mới');
    expect(emrText).not.toContain('(Heart Rate)');
    expect(emrText).not.toContain('(Underweight)');
    console.log('✅ Page 3: Medical Records EMR verified.');

    // --- Page 4a: Medical Assessment List (Danh sách đánh giá y khoa ICD-10) ---
    await page.goto('http://localhost:3000/medical-assessments');
    await page.waitForTimeout(1500);
    const asmListText = await page.locator('body').innerText();
    expect(asmListText).toContain('Hồ Sơ Đánh Giá Y Khoa Lâm Sàng');
    expect(asmListText).toContain('Thêm Đánh Giá Y Khoa');
    console.log('✅ Page 4a: Medical Assessment List verified.');

    // --- Page 4b: Add Medical Assessment (Thêm đánh giá y khoa ICD-10) ---
    await page.goto('http://localhost:3000/medical-assessments/add');
    await page.waitForTimeout(1500);
    const addAsmText = await page.locator('body').innerText();
    expect(addAsmText).toContain('Kê Phiếu Đánh Giá Y Khoa Lâm Sàng');
    expect(addAsmText).not.toContain('Add Medical Assessment');
    console.log('✅ Page 4b: Add Medical Assessment Page verified.');

    // --- Page 5: Medical Notes (Ghi chú y khoa tiến trình SOAPE) ---
    await page.goto('http://localhost:3000/doctor/medical-notes');
    await page.waitForTimeout(1500);
    const notesText = await page.locator('body').innerText();
    expect(notesText).toContain('Ghi Chú Y Khoa & Tiến Trình Điều Trị');
    expect(notesText).toContain('Mở Bệnh Án');
    console.log('✅ Page 5: Add Medical Notes Page verified.');

    // --- Page 6: Test Report (Phiếu kết quả xét nghiệm, khoảng tham chiếu & tư vấn ICD-10) ---
    await page.goto('http://localhost:3000/reports/ORD-20261031-0001');
    await page.waitForTimeout(1500);
    const reportText = await page.locator('body').innerText();
    expect(reportText).toContain('Phiếu Kết Quả Xét Nghiệm');
    expect(reportText).toContain('Tư Vấn & Lập Đánh Giá Y Khoa (ICD-10)');
    console.log('✅ Page 6: Test Report verified with clinical consultation link.');
  });
});
