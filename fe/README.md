# Hệ thống Quản lý Phòng Xét nghiệm Máu

Hệ thống quản lý phòng xét nghiệm máu được xây dựng bằng React, cung cấp đầy đủ các chức năng quản lý từ đăng ký bệnh nhân đến xuất báo cáo.

## 🚀 Tính năng chính

### 1. **Hệ thống xác thực**
- ✅ Đăng nhập/đăng xuất
- ✅ Đăng ký tài khoản với xác thực OTP
- ✅ Phân quyền theo vai trò (Admin, Bác sĩ, Nhân viên, Quản lý)
- ✅ Bảo mật với JWT token

### 2. **Quản lý bệnh nhân**
- ✅ Thêm/sửa/xóa thông tin bệnh nhân
- ✅ Tìm kiếm bệnh nhân theo tên, SĐT, email
- ✅ Xem lịch sử khám và xét nghiệm
- ✅ Quản lý hồ sơ bệnh nhân

### 3. **Quản lý lịch hẹn**
- ✅ Đặt lịch hẹn cho bệnh nhân
- ✅ Quản lý ca làm việc cố định
- ✅ Theo dõi trạng thái lịch hẹn
- ✅ Lọc lịch hẹn theo ngày và trạng thái

### 4. **Quản lý xét nghiệm**
- ✅ Tạo phiếu xét nghiệm
- ✅ Quản lý mẫu máu với mã vạch
- ✅ Theo dõi trạng thái xét nghiệm
- ✅ Liên kết với lịch hẹn và bệnh nhân

### 5. **Quản lý kết quả xét nghiệm**
- ✅ Nhập kết quả xét nghiệm (kỹ thuật viên)
- ✅ Duyệt kết quả (bác sĩ)
- ✅ So sánh với chỉ số bình thường
- ✅ Xuất kết quả PDF

### 6. **Quản lý dịch vụ**
- ✅ Thêm/sửa/xóa dịch vụ xét nghiệm
- ✅ Cập nhật giá dịch vụ
- ✅ Kích hoạt/vô hiệu hóa dịch vụ
- ✅ Quản lý danh mục dịch vụ

### 7. **Quản lý hóa đơn**
- ✅ Tạo hóa đơn thanh toán
- ✅ Ghi nhận thanh toán
- ✅ Theo dõi công nợ
- ✅ Xuất hóa đơn PDF

### 8. **Dashboard & Báo cáo**
- ✅ Thống kê tổng quan
- ✅ Báo cáo doanh thu
- ✅ Báo cáo số lượng xét nghiệm
- ✅ Biểu đồ trực quan

## 🛠️ Công nghệ sử dụng

- **Frontend**: React 18, React Router DOM, Bootstrap 5
- **Backend**: JSON Server (Mock API)
- **UI Components**: React Bootstrap, FontAwesome
- **HTTP Client**: Axios
- **State Management**: React Context API

## 📦 Cài đặt và chạy

### Yêu cầu hệ thống
- Node.js >= 16.0.0
- npm >= 8.0.0

### Cài đặt dependencies
```bash
npm install
```

### Chạy ứng dụng

#### Cách 1: Chạy đồng thời (Khuyến nghị)
```bash
npm run dev
```

#### Cách 2: Chạy riêng lẻ
```bash
# Terminal 1: Chạy JSON Server
npm run server

# Terminal 2: Chạy React App
npm start
```

### Truy cập ứng dụng
- **Frontend**: http://localhost:3000
- **API Server**: http://localhost:5001

## 👥 Tài khoản demo

| Vai trò | Email | Mật khẩu | Quyền hạn |
|---------|-------|----------|-----------|
| Admin | admin@lab.com | admin123 | Toàn quyền |
| Quản lý | manager@lab.com | manager123 | Quản lý kho, ca làm việc, phân quyền |
| Bác sĩ | doctor@lab.com | doctor123 | Xem, duyệt kết quả |
| Nhân viên Phòng Lab | labuser@lab.com | labuser123 | Quản lý toàn diện phòng lab |

## 📁 Cấu trúc dự án

```
src/
├── components/          # Các component tái sử dụng
│   ├── Layout/         # Header, Sidebar, Layout
│   ├── CheckIn/        # Check-in bệnh nhân
│   ├── Consultation/   # Tư vấn
│   ├── MyAppointments/ # Lịch hẹn của bệnh nhân
│   ├── MyResults/      # Kết quả của bệnh nhân
│   ├── Notification/   # Hệ thống thông báo
│   ├── Patient/        # Thông tin bệnh nhân
│   ├── ResultDelivery/ # Giao kết quả
│   ├── SampleManagement/ # Quản lý mẫu máu
│   └── Steps/          # Component bước tiến trình
├── pages/              # Các trang chính
│   ├── Login.js        # Đăng nhập
│   ├── Register.js     # Đăng ký
│   ├── Home.js         # Trang chủ
│   ├── AdminDashboard.js # Dashboard admin
│   ├── DoctorDashboard.js # Dashboard bác sĩ
│   ├── LabUserDashboard.js # Dashboard nhân viên phòng lab
│   ├── PatientDashboard.js # Dashboard bệnh nhân
│   ├── Patients.js     # Quản lý bệnh nhân
│   ├── Appointments.js # Quản lý lịch hẹn
│   ├── LabTests.js     # Quản lý xét nghiệm
│   ├── Results.js      # Quản lý kết quả
│   ├── Services.js     # Quản lý dịch vụ
│   ├── Invoices.js     # Quản lý hóa đơn
│   └── Reports.js      # Báo cáo
├── services/           # API services
│   ├── api.js          # Cấu hình Axios
│   ├── authService.js  # Xác thực
│   ├── patientService.js # Bệnh nhân
│   ├── appointmentService.js # Lịch hẹn
│   ├── labTestService.js # Xét nghiệm
│   ├── serviceService.js # Dịch vụ
│   └── invoiceService.js # Hóa đơn
├── contexts/           # React Context
│   └── AuthContext.js  # Quản lý xác thực
└── utils/              # Utilities
```

## 🔧 Cấu hình

### Database (db.json)
Hệ thống sử dụng JSON Server làm mock API với các bảng:
- `users`: Tài khoản người dùng
- `patients`: Thông tin bệnh nhân
- `appointments`: Lịch hẹn
- `labTests`: Phiếu xét nghiệm
- `testResults`: Kết quả xét nghiệm
- `services`: Dịch vụ xét nghiệm
- `invoices`: Hóa đơn

### API Endpoints
- `GET /users` - Lấy danh sách người dùng
- `POST /users` - Tạo người dùng mới
- `GET /patients` - Lấy danh sách bệnh nhân
- `POST /patients` - Tạo bệnh nhân mới
- `PUT /patients/:id` - Cập nhật bệnh nhân
- `DELETE /patients/:id` - Xóa bệnh nhân
- `GET /appointments` - Lấy danh sách lịch hẹn
- `POST /appointments` - Tạo lịch hẹn mới
- `GET /labTests` - Lấy danh sách phiếu xét nghiệm
- `POST /labTests` - Tạo phiếu xét nghiệm mới
- `GET /testResults` - Lấy kết quả xét nghiệm
- `POST /testResults` - Thêm kết quả xét nghiệm
- `GET /services` - Lấy danh sách dịch vụ
- `POST /services` - Tạo dịch vụ mới
- `GET /invoices` - Lấy danh sách hóa đơn
- `POST /invoices` - Tạo hóa đơn mới

## 🎯 Quy trình nghiệp vụ

### 1. Đăng ký bệnh nhân
1. Nhân viên tạo hồ sơ bệnh nhân
2. Đặt lịch hẹn xét nghiệm
3. Bác sĩ tạo phiếu xét nghiệm

### 2. Quy trình xét nghiệm
1. Kỹ thuật viên lấy mẫu máu
2. Tạo mã vạch cho mẫu
3. Thực hiện xét nghiệm
4. Nhập kết quả vào hệ thống
5. Bác sĩ duyệt kết quả
6. Xuất kết quả cho bệnh nhân

### 3. Quản lý thanh toán
1. Tạo hóa đơn dựa trên dịch vụ
2. Ghi nhận thanh toán
3. Xuất hóa đơn PDF

## 🔒 Bảo mật

- Xác thực JWT token
- Phân quyền theo vai trò
- Bảo vệ routes
- Validation dữ liệu đầu vào

## 📱 Responsive Design

Giao diện được thiết kế responsive, hỗ trợ:
- Desktop (>= 1200px)
- Tablet (768px - 1199px)
- Mobile (< 768px)

## 🚀 Triển khai

### Build production
```bash
npm run build
```

### Chạy production
```bash
# Cài đặt serve globally
npm install -g serve

# Chạy build
serve -s build
```

## 🤝 Đóng góp

1. Fork dự án
2. Tạo feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Mở Pull Request

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.

## 📞 Liên hệ

- Email: support@labmanagement.com
- Website: https://labmanagement.com

## 🙏 Acknowledgments

- React team
- Bootstrap team
- FontAwesome team
- JSON Server team