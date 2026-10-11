# Tài Liệu Dự Án - Blood Laboratory Management System

## 📋 Tổng Quan

File này tổng hợp tất cả thông tin quan trọng về dự án để AI chat có thể hiểu và phát triển hiệu quả.

---

## 🎯 File Documentation Quan Trọng

### 1. **README.md** (Root)
- Tổng quan dự án, tính năng, cấu trúc
- Hướng dẫn cài đặt và chạy
- Tài khoản demo
- API endpoints

### 2. **SETUP.md** (Root)
- Hướng dẫn cài đặt chi tiết
- Database schema
- Cấu hình và troubleshooting

### 3. **ROLE_BASED_AUTHORIZATION_SYSTEM.md** (Root)
- Hệ thống phân quyền theo Role ID
- Cấu trúc roles (Admin, Manager, Doctor, Lab User, Patient, Receptionist)
- Role mapping và backward compatibility

### 4. **src/LAB_USER_WORKFLOW_FINAL.md**
- Workflow cuối cùng của Lab User (7 bước)
- Luồng nghiệp vụ: Lấy mẫu → Xử lý → Nhập kết quả → Gửi duyệt
- Status flow và navigation logic

### 5. **src/docs/API_LIST.md**
- Danh sách API endpoints được frontend sử dụng
- Gateway mapping và routing
- Service calls và endpoints

---

## 🔄 Workflow và Status

### Lab User Workflow (7 bước):
1. **Quản lý lịch hẹn** (`/appointments`) - Xem appointments với status: `DA_XAC_NHAN`, `DA_CHECKIN`, `DANG_LAY_MAU`
2. **Lấy mẫu** - Tạo sample với status `DANG_CHO`
3. **Chuyển đến Quản lý kết quả xét nghiệm** (`/results`) - Xử lý nghiệp vụ chính
4. **Cập nhật trạng thái mẫu** - Từ `DANG_CHO` → `HOAN_THANH`
5. **Nhập kết quả** - Tạo lab test với status `CHO_XAC_NHAN`
6. **Gửi cho bác sĩ** - Chuyển status `CHO_XAC_NHAN` → `CHO_DUYET`
7. **Hoàn thành** - Bác sĩ duyệt và gửi kết quả

### Status Flow:
- **Appointment:** `scheduled` → `confirmed` → `checked_in` → `sample_collected` → `testing` → `ready_for_consultation` → `completed`
- **Sample:** `collected` → `processing` → `completed`
- **Lab Test:** `pending` → `completed` → `waiting_review` → `approved`

---

## 🗂️ Cấu Trúc Dự Án

### Routes và Pages:
- **Admin:** `/admin-dashboard`, `/admin-patients`, `/admin-appointments`, `/admin-invoices`, `/admin-reports`, `/user-management`, `/doctor-management`, `/role-management`
- **Manager:** `/manager-dashboard`, `/patients`, `/appointments`, `/results`, `/sample-management`, `/inventory-management`, `/shift-assignment`, `/services`, `/consultation`
- **Doctor:** `/doctor-dashboard`, `/doctor-consultations`, `/doctor-schedule`, `/doctor-lab-results`, `/patient-profile/:patientId/:appointmentId?`
- **Lab User:** `/lab-user-dashboard`, `/appointments`, `/results`, `/sample-management`, `/result-entry`
- **Patient:** `/patient-dashboard`, `/my-appointments`, `/my-results`
- **Receptionist:** `/receptionist-dashboard`, `/receptionist/check-in`, `/receptionist/create-patient`

### Components:
- `src/components/` - Components tái sử dụng
- `src/pages/` - Pages chính
- `src/services/` - API services
- `src/contexts/` - React Context
- `src/utils/` - Utilities

---

## 🔧 API Integration

### Base URL:
- Development: `http://localhost:5001` (JSON Server)
- Production: `https://localhost:7000/gateway` (API Gateway)

### Services:
- `authService.js` - Authentication (login, register, OTP)
- `patientService.js` - Patient management
- `appointmentService.js` - Appointment management
- `labTestService.js` - Lab test management
- `sampleService.js` - Sample management
- `medicalServiceService.js` - Medical services
- `invoiceService.js` - Invoice management
- `userManagementService.js` - User management
- `roleService.js` - Role management
- `shiftService.js` - Shift management
- `inventoryService.js` - Inventory management

---

## 👥 Roles và Permissions

### Role IDs:
- 1: Admin - Toàn quyền quản trị hệ thống
- 2: Manager - Quản lý kho và ca làm việc
- 3: Doctor - Tư vấn kết quả xét nghiệm
- 4: Lab User - Lấy mẫu, nhập kết quả
- 5: Patient - Đặt lịch, xem kết quả
- 6: Receptionist - Check-in bệnh nhân, tạo hồ sơ

### Role Keys:
- `admin`, `manager`, `doctor`, `lab_user`, `patient`, `receptionist`

---

## 📝 Notes

### Database:
- Sử dụng JSON Server làm mock API
- Database file: `db.json`
- Collections: `users`, `patients`, `appointments`, `samples`, `labTests`, `services`, `invoices`, `roles`

### Development:
- React 18, React Router DOM, Bootstrap 5
- State Management: React Context API
- HTTP Client: Axios
- UI Components: React Bootstrap, FontAwesome

---

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Run JSON Server only
npm run server

# Run React App only
npm start

# Build for production
npm run build
```

---

## 📞 Support

Nếu cần thêm thông tin, tham khảo:
- `README.md` - Tổng quan dự án
- `SETUP.md` - Hướng dẫn setup
- `ROLE_BASED_AUTHORIZATION_SYSTEM.md` - Hệ thống phân quyền
- `src/LAB_USER_WORKFLOW_FINAL.md` - Workflow Lab User
- `src/docs/API_LIST.md` - API endpoints

