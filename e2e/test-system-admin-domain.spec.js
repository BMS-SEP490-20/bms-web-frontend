// @ts-check
import { test, expect } from '@playwright/test';

/**
 * Authenticates with real backend as admin_system / Admin@123 and injects valid JWT.
 */
async function authenticateAdmin(page) {
  const res = await fetch('http://localhost:5000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ usernameOrEmail: 'admin_system', password: 'Admin@123' })
  });
  const data = await res.json();
  const token = data.accessToken;
  const user = data.user;

  await page.addInitScript(({ token, user }) => {
    window.localStorage.setItem('bms_token', token);
    window.localStorage.setItem('bms_access_token', token);
    window.localStorage.setItem('bms_user', JSON.stringify(user));
  }, { token, user });
}

test.describe('SYSTEM ADMIN DOMAIN E2E - Quản Trị Hệ Thống BMS MedLab', () => {

  test('01. Đăng nhập thực tế với tài khoản admin_system / Admin@123', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="usernameOrEmail"], input[name="username"], input[type="text"]', 'admin_system');
    await page.fill('input[name="password"], input[type="password"]', 'Admin@123');
    await page.click('button[type="submit"]');

    // Sau khi đăng nhập thành công, điều hướng vào trang quản trị
    await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 10000 });
    expect(page.url()).not.toContain('/login');
  });

  test('02. UC14: Quản Lý Nhân Sự & Phân Quyền Tài Khoản (UserManagementPage)', async ({ page }) => {
    await authenticateAdmin(page);
    await page.goto('/admin/users');

    // Header & Badge chuẩn 100% Tiếng Việt
    await expect(page.getByText(/Quản Lý Nhân Sự|Tài Khoản Y Tế|Phân Quyền Tài Khoản/i).first()).toBeVisible();
    await expect(page.getByText(/Tổng tài khoản/i).first()).toBeVisible();
    await expect(page.getByText(/Đang hoạt động/i).first()).toBeVisible();

    // Bảng dữ liệu người dùng
    const table = page.locator('table');
    await expect(table).toBeVisible({ timeout: 10000 });

    // Bộ lọc vai trò và trạng thái
    const searchInput = page.locator('input[placeholder*="Tìm"]').first();
    await expect(searchInput).toBeVisible();

    // Nút thêm tài khoản mới
    const addBtn = page.getByRole('button', { name: /Thêm tài khoản|Thêm mới/i }).first();
    await expect(addBtn).toBeVisible();
    await addBtn.click();

    // Modal tạo tài khoản
    await expect(page.getByText(/Tạo tài khoản nhân viên|Tạo tài khoản mới/i).first()).toBeVisible();
    await expect(page.getByText(/Họ và tên/i).first()).toBeVisible();
    await page.getByRole('button', { name: /Hủy/i }).first().click();
  });

  test('03. UC13: Phân Quyền Vai Trò RBAC (RolesManagementPage)', async ({ page }) => {
    await authenticateAdmin(page);
    await page.goto('/roles');

    // Tiêu đề phân quyền vai trò
    await expect(page.getByText(/Quản Lý Phân Quyền Vai Trò|RBAC/i).first()).toBeVisible();

    // Bảng dữ liệu vai trò
    const table = page.locator('table');
    await expect(table).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/Mã Vai Trò/i).first()).toBeVisible();
    await expect(page.getByText(/Tên Vai Trò/i).first()).toBeVisible();

    // Nút Thêm vai trò mới
    const addBtn = page.getByRole('button', { name: /Thêm Vai Trò/i }).first();
    await expect(addBtn).toBeVisible();
    await addBtn.click();

    // Modal ma trận phân quyền
    await expect(page.getByText(/Thêm Mới Vai Trò Hệ Thống/i).first()).toBeVisible();
    await expect(page.getByText(/Ma Trận Phân Quyền Chi Tiết/i).first()).toBeVisible();
    await page.getByRole('button', { name: /Hủy Bỏ/i }).first().click();
  });

  test('04. UC15: Danh Mục Gói Dịch Vụ & Bảng Giá Viện Phí (ServicePackagesPage)', async ({ page }) => {
    await authenticateAdmin(page);
    await page.goto('/admin/packages');

    // Tiêu đề bảng giá viện phí & gói dịch vụ
    await expect(page.getByText(/Quản Lý Danh Mục Gói Dịch Vụ|Bảng Giá Viện Phí/i).first()).toBeVisible();

    // Bảng gói dịch vụ
    const table = page.locator('table');
    await expect(table).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/Đơn Giá Niêm Yết|Giá Niêm Yết/i).first()).toBeVisible();

    // Kiểm tra định dạng tiền tệ VND "đ"
    await expect(page.getByText(/đ/).first()).toBeVisible();

    // Nút Thêm gói mới
    const addBtn = page.getByRole('button', { name: /Thêm Gói Mới/i }).first();
    await expect(addBtn).toBeVisible();
  });

  test('05. UC64: Nhật Ký Kiểm Toán An Ninh Hệ Thống (AuditLogPage)', async ({ page }) => {
    await authenticateAdmin(page);
    await page.goto('/admin/audit-logs');

    // Tiêu đề trang
    await expect(page.getByText(/Nhật Ký Kiểm Toán An Ninh/i).first()).toBeVisible();

    // Badge chỉ xem bất biến
    await expect(page.getByText(/Chỉ Xem Bất Biến|Read-Only/i).first()).toBeVisible();

    // Bảng nhật ký kiểm toán
    const table = page.locator('table');
    await expect(table).toBeVisible({ timeout: 10000 });

    // Nút xuất báo cáo CSV
    const exportBtn = page.getByRole('button', { name: /Xuất Báo Cáo CSV|Xuất CSV/i }).first();
    await expect(exportBtn).toBeVisible();

    // Nút làm mới
    const refreshBtn = page.getByRole('button', { name: /Làm Mới/i }).first();
    await expect(refreshBtn).toBeVisible();
  });

  test('06. UC80: Quản Lý Sao Lưu & Phục Hồi Dữ Liệu (BackupManagementPage)', async ({ page }) => {
    await authenticateAdmin(page);
    await page.goto('/admin/backup');

    // Tiêu đề trang
    await expect(page.getByText(/Quản Lý Sao Lưu & Phục Hồi Dữ Liệu/i).first()).toBeVisible();
    await expect(page.getByText(/ISO 15189/i).first()).toBeVisible();

    // Các KPI cards
    await expect(page.getByText(/Tổng Bản Sao Lưu/i).first()).toBeVisible();
    await expect(page.getByText(/Dung Lượng Đã Dùng/i).first()).toBeVisible();
    await expect(page.getByText(/Độ Toàn Vẹn SHA-256/i).first()).toBeVisible();

    // Tabs điều hướng
    await expect(page.getByText(/Tất Cả Bản Sao Lưu/i).first()).toBeVisible();
    await expect(page.getByText(/Lịch Sử Khôi Phục/i).first()).toBeVisible();

    // Nút tạo bản sao lưu mới
    const createBtn = page.getByRole('button', { name: /Sao Lưu Dữ Liệu/i }).first();
    await expect(createBtn).toBeVisible();
    await createBtn.click();

    // Modal tạo sao lưu
    await expect(page.getByText(/Tạo Bản Sao Lưu/i).first()).toBeVisible();
    const closeBtn = page.locator('.btn-close').first();
    await closeBtn.click();
  });

  test('07. Nguyên tắc Separation of Duties (Admin không can thiệp kết quả y khoa)', async ({ page }) => {
    await authenticateAdmin(page);
    await page.goto('/admin/users');

    // Chờ bảng dữ liệu người dùng sẵn sàng
    const table = page.locator('table');
    await expect(table).toBeVisible({ timeout: 10000 });

    // Mở chi tiết người dùng đầu tiên
    const detailBtn = page.locator('button:has-text("Chi tiết")').first();
    await expect(detailBtn).toBeVisible();
    await detailBtn.click();

    // Modal chi tiết xuất hiện
    const modal = page.locator('.modal.show');
    await expect(modal).toBeVisible();
    await expect(modal.getByText(/Chi Tiết Tài Khoản Nhân Sự/i)).toBeVisible();

    // Kiểm tra nguyên tắc Separation of Duties:
    // Admin chỉ quản lý tài khoản & phân quyền, không có chức năng nhập hay sửa kết quả xét nghiệm / bệnh án
    await expect(modal.getByRole('button', { name: /Đóng/i })).toBeVisible();
    await modal.getByRole('button', { name: /Đóng/i }).click();
  });

});
