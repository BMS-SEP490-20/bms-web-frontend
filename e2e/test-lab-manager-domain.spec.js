import { test, expect } from '@playwright/test';

test.describe('Lab Manager Domain Pages Comprehensive Verification', () => {
  test('Lab Manager Login and verify all 6 lab manager domain pages', async ({ page }) => {
    // 1. Login with Lab Manager account manager_lananh / Admin@123
    await page.goto('http://localhost:3000/login');
    await page.waitForLoadState('networkidle');

    await page.fill('input[type="text"], input[name="username"]', 'manager_lananh');
    await page.fill('input[type="password"]', 'Admin@123');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);

    // If fallback needed
    if (page.url().includes('/login')) {
      await page.fill('input[type="text"], input[name="username"]', 'manager');
      await page.fill('input[type="password"]', 'Manager@123');
      await page.click('button[type="submit"]');
      await page.waitForTimeout(2000);
    }

    // --- Page 1: Verify Test Results (Thẩm Định & Ký Số Điện Tử Duyệt Kết Quả) ---
    await page.goto('http://localhost:3000/laboratory/verify-results');
    await page.waitForTimeout(1500);
    const verifyText = await page.locator('body').innerText();
    expect(verifyText).toMatch(/Thẩm Định.*Ký Số Điện Tử/);
    expect(verifyText).toContain('Bảng Kiểm Thẩm Định Kỹ Thuật');
    expect(verifyText).toContain('Ý kiến kết luận & Ghi chú thẩm định của Trưởng Khoa');
    expect(verifyText).toMatch(/Ký Số Điện Tử|Đã Ký Số/);
    expect(verifyText).not.toContain('Verify test results');
    expect(verifyText).not.toContain('undefined');
    console.log('✅ Page 1: Verify Test Results verified.');

    // --- Page 2: Role Dashboard (Bảng Điều Khiển Tổng Quan Hiệu Suất Lab) ---
    await page.goto('http://localhost:3000/dashboard');
    await page.waitForTimeout(1500);
    const dashboardText = await page.locator('body').innerText();
    expect(dashboardText).toContain('Bảng Điều Khiển Quản Lý Vận Hành Phòng Xét Nghiệm');
    expect(dashboardText).toContain('Hàng Đợi Thẩm Định & Ký Số Điện Tử');
    expect(dashboardText).toContain('Hiệu Suất Thời Gian TAT (ISO 15189)');
    expect(dashboardText).toContain('Trung Tâm Quản Trị Chuyên Môn & Danh Mục Y Tế');
    expect(dashboardText).not.toContain('undefined');
    console.log('✅ Page 2: Lab Manager Role Dashboard verified.');

    // --- Page 3: TAT Statistics (Báo Cáo Hiệu Suất Thời Gian TAT ISO 15189) ---
    await page.goto('http://localhost:3000/reports/tat');
    await page.waitForTimeout(1500);
    const tatText = await page.locator('body').innerText();
    expect(tatText).toContain('Báo Cáo Thống Kê Thời Gian Quay Vòng Xét Nghiệm');
    expect(tatText).toMatch(/TAT TRUNG BÌNH|TAT Trung Bình/i);
    expect(tatText).toMatch(/TỶ LỆ ĐẠT CHUẨN|Tỷ Lệ Đạt Chuẩn/i);
    expect(tatText).toContain('Mục tiêu');
    expect(tatText).not.toContain('undefined');
    console.log('✅ Page 3: TAT Statistics Dashboard verified.');

    // --- Page 4: Revenue Report (Báo Cáo Doanh Thu Viện Phí Xét Nghiệm) ---
    await page.goto('http://localhost:3000/reports/revenue');
    await page.waitForTimeout(1500);
    const revenueText = await page.locator('body').innerText();
    expect(revenueText).toContain('Báo Cáo Doanh Thu & Tài Chính Xét Nghiệm');
    expect(revenueText).toMatch(/Doanh Thu Gộp/i);
    expect(revenueText).toMatch(/Thực Thu/i);
    expect(revenueText).toContain('Xuất Báo Cáo Kế Toán (.CSV)');
    expect(revenueText).not.toContain('undefined');
    console.log('✅ Page 4: Revenue Report verified.');

    // --- Page 5a: Test Criteria Page (Danh Mục Tiêu Chí Chỉ Số Xét Nghiệm) ---
    await page.goto('http://localhost:3000/laboratory/criteria');
    await page.waitForTimeout(1500);
    const criteriaText = await page.locator('body').innerText();
    expect(criteriaText).toContain('Danh Mục Chỉ Số Xét Nghiệm');
    expect(criteriaText).toContain('Thêm Chỉ Số Mới');
    expect(criteriaText).toMatch(/Dải Bình Thường/i);
    expect(criteriaText).not.toContain('undefined');
    console.log('✅ Page 5a: Test Criteria Page verified.');

    // --- Page 5b: Configure Reference Intervals (Cấu Hình Khoảng Tham Chiếu Y Tế) ---
    await page.goto('http://localhost:3000/laboratory/reference-intervals');
    await page.waitForTimeout(1500);
    const intervalsText = await page.locator('body').innerText();
    expect(intervalsText).toContain('Cấu Hình Khoảng Tham Chiếu Sinh Học');
    expect(intervalsText).toMatch(/Thêm Khoảng Tham Chiếu/i);
    expect(intervalsText).toMatch(/Ngưỡng PANIC/i);
    expect(intervalsText).not.toContain('undefined');
    console.log('✅ Page 5b: Configure Reference Intervals verified.');

    // --- Page 6a: Lab Room Management (Quản Lý Phòng Lab & Phân Bổ Thiết Bị) ---
    await page.goto('http://localhost:3000/laboratory/rooms');
    await page.waitForTimeout(1500);
    const roomsText = await page.locator('body').innerText();
    expect(roomsText).toContain('Quản Lý Phòng Xét Nghiệm & Khám Lâm Sàng');
    expect(roomsText).toContain('Thiết Lập Phòng Mới');
    expect(roomsText).toMatch(/Thiết Bị Phân Tích Cố Định/i);
    expect(roomsText).not.toContain('Room Name');
    expect(roomsText).not.toContain('undefined');
    console.log('✅ Page 6a: Lab Room Management verified.');

    // --- Page 6b: Configure IoT Thresholds (Cấu Hình Ngưỡng Cảm Biến IoT Tủ Trữ Mẫu) ---
    await page.goto('http://localhost:3000/manager/iot-thresholds');
    await page.waitForTimeout(1500);
    const iotText = await page.locator('body').innerText();
    expect(iotText).toContain('Cấu Hình Ngưỡng Cảm Biến Môi Trường IoT Tủ Trữ Mẫu');
    expect(iotText).toMatch(/Khôi phục chuẩn mặc định/i);
    expect(iotText).toMatch(/Lưu tất cả ngưỡng/i);
    expect(iotText).toMatch(/Nhân Sự Trực Tiếp Nhận Cảnh Báo/i);
    expect(iotText).not.toContain('Configure IoT thresholds');
    expect(iotText).not.toContain('undefined');
    console.log('✅ Page 6b: Configure IoT Thresholds verified.');

    console.log('🎉 ALL 6 LAB MANAGER DOMAIN PAGES VERIFIED SUCCESSFULLY!');
  });
});
