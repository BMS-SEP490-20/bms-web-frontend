# Báo Cáo Chi Tiết Toàn Bộ Dự Án
## Blood Laboratory Management System

**Ngày tạo:** 2025-01-XX  
**Version:** 1.0.0  
**Mục đích:** Phân tích toàn diện về cấu trúc, chức năng, luồng nghiệp vụ và đề xuất cấu trúc React chuẩn cho microservice architecture

---

## 📋 Mục Lục

1. [Tổng Quan Dự Án](#1-tổng-quan-dự-án)
2. [Cấu Trúc Thư Mục và Files](#2-cấu-trúc-thư-mục-và-files)
3. [Phân Tích Chi Tiết Từng File](#3-phân-tích-chi-tiết-từng-file)
4. [Luồng Nghiệp Vụ (Business Workflow)](#4-luồng-nghiệp-vụ-business-workflow)
5. [Role-Based Access Control (RBAC)](#5-role-based-access-control-rbac)
6. [API Services và Endpoints](#6-api-services-và-endpoints)
7. [Đề Xuất Cấu Trúc React Chuẩn](#7-đề-xuất-cấu-trúc-react-chuẩn)
8. [Kiểm Tra Files Dư Thừa](#8-kiểm-tra-files-dư-thừa)
9. [Kế Hoạch Migration Microservice](#9-kế-hoạch-migration-microservice)

---

## 1. Tổng Quan Dự Án

### 1.1. Mô Tả
Hệ thống quản lý phòng xét nghiệm máu (Blood Laboratory Management System) là một ứng dụng React toàn diện để quản lý các hoạt động phòng lab bao gồm:
- Quản lý bệnh nhân
- Đặt lịch hẹn
- Xử lý kết quả xét nghiệm
- Quản lý thanh toán
- Quản lý kho và ca làm việc

### 1.2. Công Nghệ Sử Dụng
- **Frontend Framework:** React 18.2.0
- **Routing:** React Router DOM 6.20.1
- **UI Framework:** Bootstrap 5.3.2, React Bootstrap 2.9.1
- **State Management:** React Context API
- **HTTP Client:** Axios 1.6.2
- **Backend Mock:** JSON Server 0.17.4
- **Build Tool:** React Scripts 5.0.1

### 1.3. Thống Kê Files
- **Total Files:** 177 files trong `src/`
- **JavaScript Files:** 93 files (.js)
- **CSS Files:** 9 files (.css)
- **Image Files:** 22 files (.jpg) + 7 files (.png)
- **Documentation:** 5 files (.md)
- **Directories:** 42 directories

---

## 2. Cấu Trúc Thư Mục và Files

### 2.1. Cấu Trúc Hiện Tại

```
blood-laboratory-management/
├── public/                          # Static files
│   ├── index.html
│   ├── logo1.png
│   └── assets/
│
├── src/                             # Source code
│   ├── App.js                       # Main application component
│   ├── index.js                     # Entry point
│   ├── App.css                      # Global styles
│   ├── App.test.js                  # Tests
│   ├── reportWebVitals.js           # Performance monitoring
│   ├── setupTests.js                # Test setup
│   │
│   ├── pages/                       # Page components (24 files)
│   │   ├── Login.js
│   │   ├── Register.js
│   │   ├── Home.js
│   │   ├── AdminDashboard.js
│   │   ├── PatientDashboard.js
│   │   ├── DoctorDashboard.js
│   │   ├── LabUserDashboard.js
│   │   ├── ManagerDashboard.js
│   │   ├── ReceptionistDashboard.js
│   │   ├── AdminPatients.js
│   │   ├── AdminAppointments.js
│   │   ├── AdminInvoices.js
│   │   ├── AdminReports.js
│   │   ├── DoctorConsultations.js
│   │   ├── DoctorSchedule.js
│   │   ├── DoctorLabResults.js
│   │   ├── DoctorPatientProfile.js
│   │   ├── Results.js
│   │   ├── SampleManagement.js
│   │   ├── Services.js
│   │   ├── Profile.js
│   │   ├── ReceptionistCheckIn.js
│   │   ├── ReceptionistCreatePatient.js
│   │   └── ForgotPassword.js
│   │
│   ├── components/                  # Reusable components (34 files)
│   │   ├── Layout/                  # Layout components
│   │   │   ├── Layout.js
│   │   │   ├── Sidebar.js
│   │   │   ├── AdminHeader.js
│   │   │   ├── PatientHeader.js
│   │   │   ├── GuestHeader.js
│   │   │   └── GuestFooter.js
│   │   │
│   │   ├── Consultation/            # Consultation component
│   │   │   └── Consultation.js
│   │   │
│   │   ├── DoctorManagement/        # Doctor management
│   │   │   └── DoctorManagement.js
│   │   │
│   │   ├── ErrorBoundary/           # Error handling
│   │   │   └── ErrorBoundary.js
│   │   │
│   │   ├── InventoryManagement/     # Inventory management
│   │   │   └── InventoryManagement.js
│   │   │
│   │   ├── LabTestInvoices/         # Lab test invoices
│   │   │   ├── LabTestInvoices.js
│   │   │   └── LabTestInvoices.css
│   │   │
│   │   ├── Loading/                 # Loading components
│   │   │   ├── Loading.js
│   │   │   └── LoadingDemo.js
│   │   │
│   │   ├── MyAppointments/          # Patient appointments
│   │   │   ├── MyAppointments.js
│   │   │   └── MyAppointments.css
│   │   │
│   │   ├── MyConsultations/         # Patient consultations
│   │   │   └── MyConsultations.js
│   │   │
│   │   ├── MyResults/               # Patient results
│   │   │   └── MyResults.js
│   │   │
│   │   ├── Notification/            # Notification system
│   │   │   ├── Notification.js
│   │   │   └── NotificationProvider.js
│   │   │
│   │   ├── Patient/                 # Patient components
│   │   │   └── PatientProfileEdit.js
│   │   │
│   │   ├── PaymentHistory/          # Payment history
│   │   │   └── PaymentHistory.js
│   │   │
│   │   ├── QRBarcode/               # QR/Barcode components
│   │   │   ├── BarcodeDisplay.js
│   │   │   ├── BarcodeScanner.js
│   │   │   ├── BarcodeScannerZXing.js
│   │   │   ├── QRBarcodeDisplay.js
│   │   │   ├── QRCodeDisplay.js
│   │   │   ├── LabUserCheckInScan.js
│   │   │   └── index.js
│   │   │
│   │   ├── Receptionist/            # Receptionist components
│   │   │   ├── ReceptionistCheckIn.js
│   │   │   ├── ReceptionistCheckInScan.js
│   │   │   └── ReceptionistPatientCreate.js
│   │   │
│   │   ├── ResultEntry/             # Result entry
│   │   │   ├── ResultEntry.js
│   │   │   └── ResultEntry.css
│   │   │
│   │   ├── RoleManagement/          # Role management
│   │   │   └── RoleManagement.js
│   │   │
│   │   ├── ShiftAssignment/         # Shift assignment
│   │   │   └── ShiftAssignment.js
│   │   │
│   │   ├── StatusFilter/            # Status filter
│   │   │   ├── StatusFilter.js
│   │   │   └── index.js
│   │   │
│   │   ├── Steps/                   # Steps component
│   │   │   └── Steps.js
│   │   │
│   │   ├── UserManagement/          # User management
│   │   │   └── UserManagement.js
│   │   │
│   │   └── OTPHelper.js             # OTP helper
│   │
│   ├── services/                    # API services (15 files)
│   │   ├── api.js                   # Axios configuration
│   │   ├── authService.js           # Authentication
│   │   ├── patientService.js        # Patient management
│   │   ├── appointmentService.js    # Appointment management
│   │   ├── labTestService.js        # Lab test management
│   │   ├── sampleService.js         # Sample management
│   │   ├── medicalServiceService.js # Medical services
│   │   ├── invoiceService.js        # Invoice management
│   │   ├── consultationService.js   # Consultation management
│   │   ├── emailService.js          # Email service
│   │   ├── inventoryService.js      # Inventory management
│   │   ├── roleService.js           # Role management
│   │   ├── shiftService.js          # Shift management
│   │   ├── userManagementService.js # User management
│   │   └── resultDeliveryService.js # Result delivery
│   │
│   ├── contexts/                    # React Context (2 files)
│   │   ├── AuthContext.js           # Authentication context
│   │   └── NotificationContext.js   # Notification context
│   │
│   ├── utils/                       # Utility functions (5 files)
│   │   ├── formatHelper.js          # Format helpers
│   │   ├── statusHelper.js          # Status helpers
│   │   ├── roleUtils.js             # Role utilities
│   │   ├── responsiveHelper.js      # Responsive helpers
│   │   └── migrateStatus.js         # Status migration
│   │
│   ├── constants/                   # Constants (1 file)
│   │   └── status.js                # Status constants
│   │
│   ├── hooks/                       # Custom hooks (2 files)
│   │   ├── useAccessDenied.js       # Access denied hook
│   │   └── useNotification.js       # Notification hook
│   │
│   ├── data/                        # Static data (1 file)
│   │   └── vietnamLocations.js      # Vietnam locations data
│   │
│   ├── styles/                      # Global styles (5 files)
│   │   ├── medical-theme.css
│   │   ├── component-overrides.css
│   │   ├── guest-header.css
│   │   ├── calendar-custom.css
│   │   └── animations.css
│   │
│   ├── assets/                      # Assets (22 images)
│   │   ├── logo1.png
│   │   ├── chukyao.png
│   │   ├── condauao.png
│   │   └── *.jpg files
│   │
│   ├── docs/                        # Documentation
│   │   └── API_LIST.md
│   │
│   ├── api-gateway/                 # API Gateway config
│   │   └── ocelot.json
│   │
│   └── build/                       # Build output (generated)
│
├── docs/                            # Project documentation
│   ├── README.md
│   ├── PROJECT_DOCUMENTATION.md
│   ├── CLEANUP_SUMMARY.md
│   ├── FILES_CLEANUP_SUMMARY.md
│   └── archive/
│
├── db.json                          # Mock database
├── start-server.js                  # JSON Server startup
├── package.json                     # Dependencies
├── package-lock.json                # Lock file
├── README.md                        # Project README
├── SETUP.md                         # Setup guide
├── ROLE_BASED_AUTHORIZATION_SYSTEM.md
└── REFACTORING_PLAN.md
```

---

## 3. Phân Tích Chi Tiết Từng File

### 3.1. Core Files

#### 3.1.1. `src/App.js` ⭐⭐⭐⭐⭐
**Tác dụng:** 
- Main application component
- Định nghĩa routing cho toàn bộ ứng dụng
- Xử lý protected routes, public routes, guest routes
- Role-based access control

**Ảnh hưởng luồng:**
- ✅ Quyết định navigation flow
- ✅ Kiểm soát access control
- ✅ Redirect logic dựa trên role
- ✅ Ảnh hưởng trực tiếp đến tất cả routes

**Routes chính:**
- Authentication: `/login`, `/register`, `/forgot-password`
- Dashboards: `/admin-dashboard`, `/patient-dashboard`, `/doctor-dashboard`, `/lab-user-dashboard`, `/manager-dashboard`, `/receptionist-dashboard`
- Management: `/admin-patients`, `/admin-appointments`, `/admin-invoices`, `/admin-reports`, `/results`, `/sample-management`, `/services`
- Doctor: `/doctor-consultations`, `/doctor-schedule`, `/doctor-lab-results`, `/doctor-patient-profile/:patientId/:appointmentId?`
- Receptionist: `/receptionist/check-in`, `/receptionist/create-patient`

#### 3.1.2. `src/index.js` ⭐⭐⭐⭐⭐
**Tác dụng:**
- Entry point của ứng dụng
- Khởi tạo React root
- Render App component

**Ảnh hưởng luồng:**
- ✅ Entry point, không thể thiếu
- ✅ Ảnh hưởng đến toàn bộ ứng dụng

#### 3.1.3. `src/contexts/AuthContext.js` ⭐⭐⭐⭐⭐
**Tác dụng:**
- Quản lý authentication state
- Cung cấp user data, role, permissions
- Xử lý login, logout, registration
- Role normalization và checking

**Ảnh hưởng luồng:**
- ✅ Ảnh hưởng đến tất cả protected routes
- ✅ Quyết định user permissions
- ✅ Ảnh hưởng đến navigation và access control

**Key Functions:**
- `login(username, password)` - Đăng nhập
- `logout()` - Đăng xuất
- `register(userData)` - Đăng ký
- `hasRole(roles)` - Kiểm tra role
- `userRoleId`, `userRole`, `userRoleName` - Role information

#### 3.1.4. `src/contexts/NotificationContext.js` ⭐⭐⭐⭐
**Tác dụng:**
- Quản lý notification state
- Hiển thị success, error, warning, info messages

**Ảnh hưởng luồng:**
- ✅ User feedback trong tất cả operations
- ✅ Ảnh hưởng đến UX

### 3.2. Services (API Layer)

#### 3.2.1. `src/services/api.js` ⭐⭐⭐⭐⭐
**Tác dụng:**
- Cấu hình Axios instance
- Request/Response interceptors
- Authentication token handling
- Error handling

**Ảnh hưởng luồng:**
- ✅ Tất cả API calls phụ thuộc vào file này
- ✅ Ảnh hưởng đến authentication flow
- ✅ Ảnh hưởng đến error handling

**Configuration:**
- Base URL: `http://localhost:5001` (Development)
- Gateway URL: `https://localhost:7000/gateway` (Production)
- Token: `localStorage.getItem('token')`
- Headers: `Authorization: Bearer ${token}`

#### 3.2.2. `src/services/authService.js` ⭐⭐⭐⭐⭐
**Tác dụng:**
- Authentication operations
- Login, register, OTP verification
- Token management

**Ảnh hưởng luồng:**
- ✅ Ảnh hưởng đến authentication flow
- ✅ Quyết định user access

**Endpoints:**
- `POST /iam/auth/login` - Login
- `POST /iam/auth/register` - Register
- `POST /iam/auth/otp/sendotp` - Send OTP
- `POST /iam/auth/otp/verify` - Verify OTP

#### 3.2.3. `src/services/appointmentService.js` ⭐⭐⭐⭐⭐
**Tác dụng:**
- Appointment management
- CRUD operations cho appointments
- Filtering và searching

**Ảnh hưởng luồng:**
- ✅ Ảnh hưởng đến appointment workflow
- ✅ Quyết định appointment status flow
- ✅ Ảnh hưởng đến check-in flow

**Key Functions:**
- `getAllAppointments()` - Lấy tất cả appointments
- `getAppointmentsByDate(date)` - Lấy appointments theo ngày
- `getAppointmentsByDoctor(doctorId)` - Lấy appointments theo bác sĩ
- `getAppointmentsByPatient(patientId)` - Lấy appointments theo bệnh nhân
- `createAppointment(appointmentData)` - Tạo appointment
- `updateAppointment(id, appointmentData)` - Cập nhật appointment
- `deleteAppointment(id)` - Xóa appointment
- `checkInAppointment(id, checkInData)` - Check-in appointment
- `getAppointmentDateTime(appointment)` - Lấy date/time của appointment

#### 3.2.4. `src/services/patientService.js` ⭐⭐⭐⭐⭐
**Tác dụng:**
- Patient management
- CRUD operations cho patients
- Search và filter patients

**Ảnh hưởng luồng:**
- ✅ Ảnh hưởng đến patient registration flow
- ✅ Quyết định patient data availability
- ✅ Ảnh hưởng đến appointment creation

**Endpoints:**
- `GET /patient` - Lấy danh sách patients
- `GET /patient/{id}` - Lấy patient by ID
- `GET /patient/email/{email}` - Lấy patient by email
- `GET /patient/search?key=...` - Search patients
- `POST /patient/register` - Tạo patient mới
- `PUT /patient/{id}` - Cập nhật patient
- `DELETE /patient/{id}` - Xóa patient

#### 3.2.5. `src/services/labTestService.js` ⭐⭐⭐⭐⭐
**Tác dụng:**
- Lab test management
- CRUD operations cho lab tests
- Result entry và management

**Ảnh hưởng luồng:**
- ✅ Ảnh hưởng đến lab test workflow
- ✅ Quyết định result entry flow
- ✅ Ảnh hưởng đến doctor review flow

#### 3.2.6. `src/services/sampleService.js` ⭐⭐⭐⭐⭐
**Tác dụng:**
- Sample management
- CRUD operations cho samples
- Barcode generation và management

**Ảnh hưởng luồng:**
- ✅ Ảnh hưởng đến sample collection flow
- ✅ Quyết định sample status flow
- ✅ Ảnh hưởng đến lab user workflow

**Endpoints:**
- `GET /testorder/bloodsample` - Lấy danh sách samples
- `GET /gateway/testorder/bloodsample/{id}` - Lấy sample by ID
- `POST /gateway/testorder/bloodsample` - Tạo sample mới
- `PUT /gateway/testorder/bloodsample/{id}` - Cập nhật sample
- `DELETE /gateway/testorder/bloodsample/{id}` - Xóa sample

#### 3.2.7. Các Services Khác ⭐⭐⭐⭐
- `medicalServiceService.js` - Medical services management
- `invoiceService.js` - Invoice management
- `consultationService.js` - Consultation management
- `emailService.js` - Email service
- `inventoryService.js` - Inventory management
- `roleService.js` - Role management
- `shiftService.js` - Shift management
- `userManagementService.js` - User management
- `resultDeliveryService.js` - Result delivery

### 3.3. Pages (Route Components)

#### 3.3.1. Dashboard Pages ⭐⭐⭐⭐⭐

**`src/pages/AdminDashboard.js`**
- Dashboard cho admin
- Thống kê tổng quan
- Quick actions

**`src/pages/PatientDashboard.js`**
- Dashboard cho bệnh nhân
- Appointments, results, consultations
- Payment history

**`src/pages/DoctorDashboard.js`**
- Dashboard cho bác sĩ
- Consultations, lab results
- Patient profiles

**`src/pages/LabUserDashboard.js`**
- Dashboard cho lab user
- Appointments, samples, results
- Quick actions

**`src/pages/ManagerDashboard.js`**
- Dashboard cho manager
- Inventory, shifts, reports
- Management tools

**`src/pages/ReceptionistDashboard.js`**
- Dashboard cho receptionist
- Check-in, patient creation
- Quick actions

#### 3.3.2. Management Pages ⭐⭐⭐⭐⭐

**`src/pages/AdminPatients.js`**
- Quản lý bệnh nhân (Admin/Manager)
- CRUD operations
- Search và filter

**`src/pages/AdminAppointments.js`**
- Quản lý lịch hẹn (Admin/Manager/Lab User)
- CRUD operations
- Status management

**`src/pages/Results.js`**
- Quản lý kết quả xét nghiệm (Lab User/Manager)
- Result entry
- Status management

**`src/pages/SampleManagement.js`**
- Quản lý mẫu xét nghiệm (Lab User/Manager)
- Sample collection
- Status management

**`src/pages/Services.js`**
- Quản lý dịch vụ (Admin/Manager)
- Service packages
- Pricing

**`src/pages/AdminInvoices.js`**
- Quản lý hóa đơn (Admin)
- Invoice creation
- Payment tracking

**`src/pages/AdminReports.js`**
- Báo cáo (Admin)
- Statistics
- Analytics

#### 3.3.3. Doctor Pages ⭐⭐⭐⭐

**`src/pages/DoctorConsultations.js`**
- Consultations management
- Patient consultations
- Review results

**`src/pages/DoctorSchedule.js`**
- Doctor schedule
- Appointments
- Availability

**`src/pages/DoctorLabResults.js`**
- Lab results review
- Approval workflow
- Patient consultation

**`src/pages/DoctorPatientProfile.js`**
- Patient profile view
- Medical history
- Consultation history

#### 3.3.4. Receptionist Pages ⭐⭐⭐⭐

**`src/pages/ReceptionistCheckIn.js`**
- Check-in patients
- QR code scanning
- Appointment verification

**`src/pages/ReceptionistCreatePatient.js`**
- Create patient profiles
- Elderly patient support
- Validation

### 3.4. Components

#### 3.4.1. Layout Components ⭐⭐⭐⭐⭐

**`src/components/Layout/Layout.js`**
- Main layout wrapper
- Sidebar, header, footer integration
- Responsive design

**`src/components/Layout/Sidebar.js`**
- Navigation sidebar
- Role-based menu
- Active state management

**`src/components/Layout/AdminHeader.js`**
- Admin header
- User info, notifications
- Logout

**`src/components/Layout/PatientHeader.js`**
- Patient header
- Navigation
- User info

**`src/components/Layout/GuestHeader.js`**
- Guest header
- Public navigation
- Login/Register

**`src/components/Layout/GuestFooter.js`**
- Guest footer
- Contact info
- Links

#### 3.4.2. Business Components ⭐⭐⭐⭐⭐

**`src/components/Receptionist/ReceptionistCheckIn.js`**
- Check-in functionality
- QR code scanning
- Appointment list

**`src/components/Receptionist/ReceptionistCheckInScan.js`**
- QR code scanner
- Appointment verification
- Check-in processing

**`src/components/Receptionist/ReceptionistPatientCreate.js`**
- Patient creation form
- Validation
- Duplicate check

**`src/components/MyAppointments/MyAppointments.js`**
- Patient appointments view
- Appointment management
- QR code generation

**`src/components/MyResults/MyResults.js`**
- Patient results view
- Result display
- PDF export

**`src/components/ResultEntry/ResultEntry.js`**
- Result entry form
- Dynamic form generation
- Validation

**`src/components/QRBarcode/QRCodeDisplay.js`**
- QR code display
- Appointment QR codes
- Barcode generation

**`src/components/QRBarcode/BarcodeScanner.js`**
- Barcode scanner
- QR code scanning
- Check-in integration

#### 3.4.3. Management Components ⭐⭐⭐⭐

**`src/components/UserManagement/UserManagement.js`**
- User management
- CRUD operations
- Role assignment

**`src/components/DoctorManagement/DoctorManagement.js`**
- Doctor management
- CRUD operations
- Specialization

**`src/components/RoleManagement/RoleManagement.js`**
- Role management
- Permissions
- Role assignment

**`src/components/InventoryManagement/InventoryManagement.js`**
- Inventory management
- Equipment, reagents
- Stock tracking

**`src/components/ShiftAssignment/ShiftAssignment.js`**
- Shift assignment
- Doctor shifts
- Schedule management

#### 3.4.4. Utility Components ⭐⭐⭐⭐

**`src/components/Loading/Loading.js`**
- Loading spinner
- Loading states
- Async operations

**`src/components/Notification/Notification.js`**
- Notification display
- Toast notifications
- Alert messages

**`src/components/ErrorBoundary/ErrorBoundary.js`**
- Error boundary
- Error handling
- Fallback UI

**`src/components/StatusFilter/StatusFilter.js`**
- Status filter
- Filter dropdown
- Status selection

### 3.5. Utils

#### 3.5.1. `src/utils/roleUtils.js` ⭐⭐⭐⭐⭐
**Tác dụng:**
- Role mapping và utilities
- Role ID to Role Name conversion
- Role checking helpers

**Ảnh hưởng luồng:**
- ✅ Ảnh hưởng đến role-based access control
- ✅ Quyết định user permissions

**Key Functions:**
- `normalizeRoleToId(role)` - Convert role to ID
- `normalizeRoleToKey(role)` - Convert role to key
- `getRoleDisplayName(role)` - Get display name
- `hasRole(userRole, allowedRoles)` - Check role

#### 3.5.2. `src/utils/statusHelper.js` ⭐⭐⭐⭐⭐
**Tác dụng:**
- Status utilities
- Status badge components
- Status validation

**Ảnh hưởng luồng:**
- ✅ Ảnh hưởng đến status display
- ✅ Quyết định status workflow

#### 3.5.3. `src/utils/formatHelper.js` ⭐⭐⭐⭐
**Tác dụng:**
- Format utilities
- Date/time formatting
- Number formatting
- Code formatting

**Ảnh hưởng luồng:**
- ✅ Ảnh hưởng đến data display
- ✅ Quyết định format consistency

#### 3.5.4. `src/utils/responsiveHelper.js` ⭐⭐⭐
**Tác dụng:**
- Responsive utilities
- Breakpoint helpers
- Mobile detection

**Ảnh hưởng luồng:**
- ✅ Ảnh hưởng đến responsive design
- ✅ Quyết định mobile experience

### 3.6. Constants

#### 3.6.1. `src/constants/status.js` ⭐⭐⭐⭐⭐
**Tác dụng:**
- Status constants
- Centralized status definitions
- Status mappings

**Ảnh hưởng luồng:**
- ✅ Ảnh hưởng đến toàn bộ status workflow
- ✅ Quyết định status transitions
- ✅ Ảnh hưởng đến business logic

**Status Types:**
- `APPOINTMENT_STATUS` - Appointment statuses
- `SAMPLE_STATUS` - Sample statuses
- `LAB_TEST_STATUS` - Lab test statuses
- `INVOICE_STATUS` - Invoice statuses
- `CONSULTATION_STATUS` - Consultation statuses

---

## 4. Luồng Nghiệp Vụ (Business Workflow)

### 4.1. Patient Registration Flow

```
1. Patient Registration
   ├── Receptionist creates patient profile
   ├── Validation (CCCD, Phone, Email)
   ├── Duplicate check
   └── Patient account creation (optional)

2. Appointment Booking
   ├── Patient selects service package
   ├── Select appointment date/time
   ├── Payment processing
   └── Appointment confirmation

3. Check-in Flow
   ├── Patient arrives at clinic
   ├── Receptionist scans QR code
   ├── Appointment verification
   ├── Check-in confirmation
   └── Appointment status: confirmed → checked_in
```

### 4.2. Lab User Workflow

```
1. Appointment Management
   ├── View appointments (confirmed, checked_in, sample_collected)
   ├── Filter by status
   └── Select appointment for sample collection

2. Sample Collection
   ├── Create sample with barcode
   ├── Sample status: pending_collection → collected
   ├── Appointment status: checked_in → sample_collected
   └── Navigate to Results page

3. Result Entry
   ├── Update sample status: collected → completed
   ├── Enter test results
   ├── Lab test status: pending → result_pending
   └── Send to doctor for review

4. Doctor Review
   ├── Doctor reviews results
   ├── Lab test status: result_pending → waiting_review
   ├── Consultation creation
   └── Result approval
```

### 4.3. Doctor Workflow

```
1. Lab Results Review
   ├── View pending results
   ├── Review test results
   ├── Create consultation
   └── Approve results

2. Consultation
   ├── Patient consultation
   ├── Consultation notes
   ├── Result delivery
   └── Appointment status: waiting_review → completed

3. Patient Profile
   ├── View patient history
   ├── Medical records
   └── Consultation history
```

### 4.4. Manager Workflow

```
1. Inventory Management
   ├── Equipment management
   ├── Reagents management
   └── Stock tracking

2. Shift Management
   ├── Doctor shift assignment
   ├── Schedule management
   └── Availability tracking

3. Reports
   ├── Statistics
   ├── Analytics
   └── Export reports
```

### 4.5. Admin Workflow

```
1. User Management
   ├── User CRUD operations
   ├── Role assignment
   └── Permission management

2. System Management
   ├── Role management
   ├── Service management
   ├── Invoice management
   └── Reports
```

---

## 5. Role-Based Access Control (RBAC)

### 5.1. Roles

| Role ID | Role Name | Key | Description |
|---------|-----------|-----|-------------|
| 1 | Admin | `admin` | Toàn quyền quản trị hệ thống |
| 2 | Manager | `manager` | Quản lý kho và ca làm việc |
| 3 | Doctor | `doctor` | Tư vấn kết quả xét nghiệm |
| 4 | Lab User | `lab_user` | Lấy mẫu, nhập kết quả |
| 5 | Patient | `patient` | Đặt lịch, xem kết quả |
| 6 | Receptionist | `receptionist` | Check-in bệnh nhân |

### 5.2. Permissions

#### Admin (Role ID: 1)
- ✅ Tất cả permissions
- ✅ User management
- ✅ Role management
- ✅ System configuration
- ✅ Reports và analytics

#### Manager (Role ID: 2)
- ✅ Inventory management
- ✅ Shift management
- ✅ Appointment management
- ✅ Patient management
- ✅ Results management
- ✅ Sample management
- ✅ Services management
- ✅ Reports

#### Doctor (Role ID: 3)
- ✅ Lab results review
- ✅ Consultation management
- ✅ Patient profile view
- ✅ Schedule management
- ✅ Result approval

#### Lab User (Role ID: 4)
- ✅ Appointment management
- ✅ Sample collection
- ✅ Result entry
- ✅ Sample status management
- ✅ Lab test management

#### Patient (Role ID: 5)
- ✅ Appointment booking
- ✅ View appointments
- ✅ View results
- ✅ View consultations
- ✅ Profile management

#### Receptionist (Role ID: 6)
- ✅ Check-in patients
- ✅ Create patient profiles
- ✅ View appointments
- ✅ QR code scanning

---

## 6. API Services và Endpoints

### 6.1. API Gateway Configuration

**Base URL:**
- Development: `http://localhost:5001`
- Production: `https://localhost:7000/gateway`

**Gateway Config:** `src/api-gateway/ocelot.json`

### 6.2. Service Endpoints

#### Authentication Service (`/iam/auth`)
- `POST /iam/auth/login` - Login
- `POST /iam/auth/register` - Register
- `POST /iam/auth/otp/sendotp` - Send OTP
- `POST /iam/auth/otp/verify` - Verify OTP

#### Patient Service (`/patient`)
- `GET /patient` - Get all patients
- `GET /patient/{id}` - Get patient by ID
- `GET /patient/email/{email}` - Get patient by email
- `GET /patient/search?key=...` - Search patients
- `POST /patient/register` - Create patient
- `PUT /patient/{id}` - Update patient
- `DELETE /patient/{id}` - Delete patient

#### Appointment Service (`/appointments`)
- `GET /appointments` - Get all appointments
- `GET /appointments/{id}` - Get appointment by ID
- `POST /appointments` - Create appointment
- `PUT /appointments/{id}` - Update appointment
- `DELETE /appointments/{id}` - Delete appointment
- `PATCH /appointments/{id}/check-in` - Check-in appointment

#### Lab Test Service (`/testorder/testresult`)
- `GET /testorder/testresult` - Get all lab tests
- `GET /testorder/testresult/{id}` - Get lab test by ID
- `POST /testorder/testresult` - Create lab test
- `PUT /testorder/testresult/{id}` - Update lab test
- `DELETE /testorder/testresult/{id}` - Delete lab test

#### Sample Service (`/testorder/bloodsample`)
- `GET /testorder/bloodsample` - Get all samples
- `GET /testorder/bloodsample/{id}` - Get sample by ID
- `POST /testorder/bloodsample` - Create sample
- `PUT /testorder/bloodsample/{id}` - Update sample
- `DELETE /testorder/bloodsample/{id}` - Delete sample

#### Medical Service (`/services`)
- `GET /services` - Get all services
- `GET /services/{id}` - Get service by ID
- `POST /services` - Create service
- `PUT /services/{id}` - Update service
- `DELETE /services/{id}` - Delete service

#### Invoice Service (`/invoices`)
- `GET /invoices` - Get all invoices
- `GET /invoices/{id}` - Get invoice by ID
- `POST /invoices` - Create invoice
- `PUT /invoices/{id}` - Update invoice
- `DELETE /invoices/{id}` - Delete invoice

---

## 7. Đề Xuất Cấu Trúc React Chuẩn

### 7.1. Cấu Trúc Đề Xuất cho Microservice Architecture

```
src/
├── api/                             # API layer (tách riêng cho microservices)
│   ├── gateway/                     # API Gateway client
│   │   ├── gatewayClient.js
│   │   └── gatewayConfig.js
│   │
│   ├── services/                    # Microservice clients
│   │   ├── iam/                     # Identity & Access Management
│   │   │   ├── authService.js
│   │   │   ├── userService.js
│   │   │   └── roleService.js
│   │   │
│   │   ├── patient/                 # Patient Service
│   │   │   ├── patientService.js
│   │   │   └── patientApi.js
│   │   │
│   │   ├── appointment/             # Appointment Service
│   │   │   ├── appointmentService.js
│   │   │   └── appointmentApi.js
│   │   │
│   │   ├── testorder/               # Test Order Service
│   │   │   ├── labTestService.js
│   │   │   ├── sampleService.js
│   │   │   └── testOrderApi.js
│   │   │
│   │   ├── consultation/            # Consultation Service
│   │   │   ├── consultationService.js
│   │   │   └── consultationApi.js
│   │   │
│   │   ├── invoice/                 # Invoice Service
│   │   │   ├── invoiceService.js
│   │   │   └── invoiceApi.js
│   │   │
│   │   ├── inventory/               # Inventory Service
│   │   │   ├── inventoryService.js
│   │   │   └── inventoryApi.js
│   │   │
│   │   └── notification/            # Notification Service
│   │       ├── notificationService.js
│   │       └── notificationApi.js
│   │
│   ├── interceptors/                # Axios interceptors
│   │   ├── requestInterceptor.js
│   │   ├── responseInterceptor.js
│   │   └── errorInterceptor.js
│   │
│   └── utils/                       # API utilities
│       ├── apiClient.js
│       └── apiErrorHandler.js
│
├── features/                        # Feature-based organization (RoleName + CoreFeature)
│   ├── auth/                        # Authentication feature (shared)
│   │   ├── components/
│   │   │   ├── Login/
│   │   │   ├── Register/
│   │   │   └── ForgotPassword/
│   │   ├── hooks/
│   │   │   ├── useAuth.js
│   │   │   └── useLogin.js
│   │   ├── services/
│   │   │   └── authService.js
│   │   ├── contexts/
│   │   │   └── AuthContext.js
│   │   └── utils/
│   │       └── authUtils.js
│   │
│   ├── admin-user-management/       # Admin: User Management (Role 1)
│   │   ├── components/
│   │   │   ├── UserList/
│   │   │   ├── UserForm/
│   │   │   ├── UserDetail/
│   │   │   └── UserSearch/
│   │   ├── hooks/
│   │   │   ├── useUsers.js
│   │   │   └── useUser.js
│   │   ├── services/
│   │   │   └── userManagementService.js
│   │   └── utils/
│   │       └── userManagementUtils.js
│   │
│   ├── admin-role-management/       # Admin: Role Management (Role 1)
│   │   ├── components/
│   │   │   ├── RoleList/
│   │   │   ├── RoleForm/
│   │   │   ├── RoleDetail/
│   │   │   └── PermissionManagement/
│   │   ├── hooks/
│   │   │   └── useRoles.js
│   │   ├── services/
│   │   │   └── roleService.js
│   │   └── utils/
│   │       └── roleManagementUtils.js
│   │
│   ├── admin-system-configuration/  # Admin: System Configuration (Role 1)
│   │   ├── components/
│   │   │   ├── SystemSettings/
│   │   │   ├── ServiceManagement/
│   │   │   └── ConfigurationPanel/
│   │   ├── hooks/
│   │   │   └── useSystemConfig.js
│   │   ├── services/
│   │   │   └── systemConfigService.js
│   │   └── utils/
│   │       └── systemConfigUtils.js
│   │
│   ├── admin-reports/                # Admin: Reports & Analytics (Role 1)
│   │   ├── components/
│   │   │   ├── ReportList/
│   │   │   ├── ReportGenerator/
│   │   │   ├── AnalyticsDashboard/
│   │   │   └── ExportReports/
│   │   ├── hooks/
│   │   │   └── useReports.js
│   │   ├── services/
│   │   │   └── reportService.js
│   │   └── utils/
│   │       └── reportUtils.js
│   │
│   ├── manager-inventory-management/ # Manager: Inventory Management (Role 2)
│   │   ├── components/
│   │   │   ├── InventoryList/
│   │   │   ├── InventoryForm/
│   │   │   ├── StockManagement/
│   │   │   ├── EquipmentManagement/
│   │   │   └── ReagentManagement/
│   │   ├── hooks/
│   │   │   └── useInventory.js
│   │   ├── services/
│   │   │   └── inventoryService.js
│   │   └── utils/
│   │       └── inventoryUtils.js
│   │
│   ├── manager-shift-management/    # Manager: Shift Management (Role 2)
│   │   ├── components/
│   │   │   ├── ShiftList/
│   │   │   ├── ShiftAssignment/
│   │   │   ├── ScheduleManagement/
│   │   │   └── AvailabilityTracking/
│   │   ├── hooks/
│   │   │   └── useShifts.js
│   │   ├── services/
│   │   │   └── shiftService.js
│   │   └── utils/
│   │       └── shiftUtils.js
│   │
│   ├── manager-reports/             # Manager: Reports (Role 2)
│   │   ├── components/
│   │   │   ├── ReportList/
│   │   │   ├── StatisticsDashboard/
│   │   │   └── ExportReports/
│   │   ├── hooks/
│   │   │   └── useReports.js
│   │   ├── services/
│   │   │   └── reportService.js
│   │   └── utils/
│   │       └── reportUtils.js
│   │
│   ├── doctor-consultation/         # Doctor: Consultation (Role 3)
│   │   ├── components/
│   │   │   ├── ConsultationList/
│   │   │   ├── ConsultationForm/
│   │   │   ├── ConsultationDetail/
│   │   │   └── ConsultationNotes/
│   │   ├── hooks/
│   │   │   └── useConsultations.js
│   │   ├── services/
│   │   │   └── consultationService.js
│   │   └── utils/
│   │       └── consultationUtils.js
│   │
│   ├── doctor-lab-results-review/   # Doctor: Lab Results Review (Role 3)
│   │   ├── components/
│   │   │   ├── LabResultsList/
│   │   │   ├── ResultReview/
│   │   │   ├── ResultApproval/
│   │   │   └── ResultDelivery/
│   │   ├── hooks/
│   │   │   └── useLabResults.js
│   │   ├── services/
│   │   │   └── labTestService.js
│   │   └── utils/
│   │       └── labResultsReviewUtils.js
│   │
│   ├── doctor-patient-profile/     # Doctor: Patient Profile (Role 3)
│   │   ├── components/
│   │   │   ├── PatientProfileView/
│   │   │   ├── MedicalHistory/
│   │   │   ├── ConsultationHistory/
│   │   │   └── PatientSearch/
│   │   ├── hooks/
│   │   │   └── usePatientProfile.js
│   │   ├── services/
│   │   │   └── patientService.js
│   │   └── utils/
│   │       └── patientProfileUtils.js
│   │
│   ├── doctor-schedule/             # Doctor: Schedule Management (Role 3)
│   │   ├── components/
│   │   │   ├── ScheduleCalendar/
│   │   │   ├── AppointmentList/
│   │   │   └── AvailabilityManagement/
│   │   ├── hooks/
│   │   │   └── useSchedule.js
│   │   ├── services/
│   │   │   └── appointmentService.js
│   │   └── utils/
│   │       └── scheduleUtils.js
│   │
│   ├── labuser-sample-collection/   # Lab User: Sample Collection (Role 4)
│   │   ├── components/
│   │   │   ├── AppointmentList/
│   │   │   ├── SampleCollection/
│   │   │   ├── BarcodeGeneration/
│   │   │   └── SampleStatusManagement/
│   │   ├── hooks/
│   │   │   └── useSampleCollection.js
│   │   ├── services/
│   │   │   └── sampleService.js
│   │   └── utils/
│   │       └── sampleCollectionUtils.js
│   │
│   ├── labuser-result-entry/        # Lab User: Result Entry (Role 4)
│   │   ├── components/
│   │   │   ├── LabTestList/
│   │   │   ├── ResultEntryForm/
│   │   │   ├── ResultValidation/
│   │   │   └── ResultSubmission/
│   │   ├── hooks/
│   │   │   └── useResultEntry.js
│   │   ├── services/
│   │   │   └── labTestService.js
│   │   └── utils/
│   │       └── resultEntryUtils.js
│   │
│   ├── labuser-lab-test-management/ # Lab User: Lab Test Management (Role 4)
│   │   ├── components/
│   │   │   ├── LabTestList/
│   │   │   ├── LabTestDetail/
│   │   │   ├── TestStatusManagement/
│   │   │   └── TestOrderProcessing/
│   │   ├── hooks/
│   │   │   └── useLabTests.js
│   │   ├── services/
│   │   │   └── labTestService.js
│   │   └── utils/
│   │       └── labTestManagementUtils.js
│   │
│   ├── patient-appointment-booking/ # Patient: Appointment Booking (Role 5)
│   │   ├── components/
│   │   │   ├── AppointmentCalendar/
│   │   │   ├── AppointmentForm/
│   │   │   ├── ServiceSelection/
│   │   │   └── PaymentProcessing/
│   │   ├── hooks/
│   │   │   └── useAppointmentBooking.js
│   │   ├── services/
│   │   │   └── appointmentService.js
│   │   └── utils/
│   │       └── appointmentBookingUtils.js
│   │
│   ├── patient-results-viewing/     # Patient: Results Viewing (Role 5)
│   │   ├── components/
│   │   │   ├── ResultsList/
│   │   │   ├── ResultDetail/
│   │   │   ├── ResultExport/
│   │   │   └── ResultHistory/
│   │   ├── hooks/
│   │   │   └── useResults.js
│   │   ├── services/
│   │   │   └── labTestService.js
│   │   └── utils/
│   │       └── resultsViewingUtils.js
│   │
│   ├── patient-profile-management/  # Patient: Profile Management (Role 5)
│   │   ├── components/
│   │   │   ├── ProfileView/
│   │   │   ├── ProfileEdit/
│   │   │   ├── AppointmentHistory/
│   │   │   └── ConsultationHistory/
│   │   ├── hooks/
│   │   │   └── useProfile.js
│   │   ├── services/
│   │   │   └── patientService.js
│   │   └── utils/
│   │       └── profileManagementUtils.js
│   │
│   ├── receptionist-check-in/       # Receptionist: Check-in (Role 6)
│   │   ├── components/
│   │   │   ├── CheckInList/
│   │   │   ├── QRCodeScanner/
│   │   │   ├── AppointmentVerification/
│   │   │   └── CheckInProcessing/
│   │   ├── hooks/
│   │   │   └── useCheckIn.js
│   │   ├── services/
│   │   │   └── appointmentService.js
│   │   └── utils/
│   │       └── checkInUtils.js
│   │
│   ├── receptionist-patient-creation/ # Receptionist: Patient Creation (Role 6)
│   │   ├── components/
│   │   │   ├── PatientForm/
│   │   │   ├── PatientSearch/
│   │   │   ├── DuplicateCheck/
│   │   │   └── PatientValidation/
│   │   ├── hooks/
│   │   │   └── usePatientCreation.js
│   │   ├── services/
│   │   │   └── patientService.js
│   │   └── utils/
│   │       └── patientCreationUtils.js
│   │
│   ├── shared-patient/              # Shared: Patient feature (used by multiple roles)
│   │   ├── components/
│   │   │   ├── PatientList/
│   │   │   ├── PatientForm/
│   │   │   ├── PatientProfile/
│   │   │   └── PatientSearch/
│   │   ├── hooks/
│   │   │   ├── usePatients.js
│   │   │   └── usePatient.js
│   │   ├── services/
│   │   │   └── patientService.js
│   │   └── utils/
│   │       └── patientUtils.js
│   │
│   ├── shared-appointment/          # Shared: Appointment feature (used by multiple roles)
│   │   ├── components/
│   │   │   ├── AppointmentList/
│   │   │   ├── AppointmentForm/
│   │   │   ├── AppointmentCalendar/
│   │   │   └── AppointmentDetail/
│   │   ├── hooks/
│   │   │   ├── useAppointments.js
│   │   │   └── useAppointment.js
│   │   ├── services/
│   │   │   └── appointmentService.js
│   │   └── utils/
│   │       └── appointmentUtils.js
│   │
│   ├── shared-invoice/              # Shared: Invoice feature (used by multiple roles)
│   │   ├── components/
│   │   │   ├── InvoiceList/
│   │   │   ├── InvoiceForm/
│   │   │   └── InvoiceDetail/
│   │   ├── hooks/
│   │   │   └── useInvoices.js
│   │   ├── services/
│   │   │   └── invoiceService.js
│   │   └── utils/
│   │       └── invoiceUtils.js
│   │
│   └── dashboard/                   # Dashboard feature (role-specific)
│       ├── components/
│       │   ├── AdminDashboard/
│       │   ├── PatientDashboard/
│       │   ├── DoctorDashboard/
│       │   ├── LabUserDashboard/
│       │   ├── ManagerDashboard/
│       │   └── ReceptionistDashboard/
│       ├── hooks/
│       │   └── useDashboard.js
│       └── utils/
│           └── dashboardUtils.js
│
├── shared/                          # Shared resources
│   ├── components/                  # Shared components
│   │   ├── Layout/
│   │   │   ├── Layout.js
│   │   │   ├── Sidebar.js
│   │   │   ├── Header.js
│   │   │   └── Footer.js
│   │   │
│   │   ├── UI/                      # UI components
│   │   │   ├── Button/
│   │   │   ├── Input/
│   │   │   ├── Select/
│   │   │   ├── Modal/
│   │   │   ├── Table/
│   │   │   ├── Card/
│   │   │   ├── Badge/
│   │   │   └── Loading/
│   │   │
│   │   ├── Forms/                   # Form components
│   │   │   ├── FormField/
│   │   │   ├── FormSelect/
│   │   │   ├── FormDatePicker/
│   │   │   └── FormValidation/
│   │   │
│   │   └── Business/                # Business components
│   │       ├── StatusFilter/
│   │       ├── StatusBadge/
│   │       ├── QRCode/
│   │       ├── BarcodeScanner/
│   │       └── Notification/
│   │
│   ├── hooks/                       # Shared hooks
│   │   ├── useNotification.js
│   │   ├── useAccessDenied.js
│   │   ├── useDebounce.js
│   │   └── useLocalStorage.js
│   │
│   ├── contexts/                    # Shared contexts
│   │   ├── AuthContext.js
│   │   ├── NotificationContext.js
│   │   └── ThemeContext.js
│   │
│   ├── utils/                       # Shared utilities
│   │   ├── formatHelper.js
│   │   ├── statusHelper.js
│   │   ├── roleUtils.js
│   │   ├── dateUtils.js
│   │   └── validationUtils.js
│   │
│   ├── constants/                   # Shared constants
│   │   ├── status.js
│   │   ├── roles.js
│   │   ├── routes.js
│   │   └── config.js
│   │
│   ├── types/                       # TypeScript types (if using TS)
│   │   ├── user.types.js
│   │   ├── appointment.types.js
│   │   ├── labTest.types.js
│   │   └── common.types.js
│   │
│   └── styles/                      # Shared styles
│       ├── themes/
│       ├── components/
│       └── utilities/
│
├── routes/                          # Route configuration
│   ├── AppRoutes.js
│   ├── ProtectedRoute.js
│   ├── PublicRoute.js
│   └── GuestRoute.js
│
├── store/                           # State management (if using Redux/Zustand)
│   ├── slices/
│   ├── actions/
│   └── selectors/
│
├── config/                          # Configuration files
│   ├── env.js
│   ├── api.config.js
│   └── app.config.js
│
├── assets/                          # Static assets
│   ├── images/
│   ├── icons/
│   └── fonts/
│
├── App.js                           # Main App component
├── index.js                         # Entry point
└── setupTests.js                    # Test setup
```

### 7.2. Naming Convention: RoleName + CoreFeature

#### 7.2.1. Quy Tắc Đặt Tên
Cấu trúc features được đặt tên theo pattern: **`{RoleName}-{CoreFeature}`**

**Ví dụ:**
- `admin-user-management` - Admin quản lý users
- `manager-inventory-management` - Manager quản lý kho
- `doctor-consultation` - Doctor tư vấn
- `labuser-sample-collection` - Lab User lấy mẫu
- `patient-appointment-booking` - Patient đặt lịch
- `receptionist-check-in` - Receptionist check-in

#### 7.2.2. Lợi Ích Naming Convention

**1. Dễ Nhận Biết và Phân Biệt**
- ✅ Ngay lập tức biết feature thuộc role nào
- ✅ Dễ tìm kiếm và navigate trong codebase
- ✅ Tránh nhầm lẫn giữa các features tương tự của các roles khác nhau

**2. Tương Thích với Microservice Architecture**
- ✅ Mapping trực tiếp với backend C# microservices
- ✅ Dễ dàng kết nối API theo từng service
- ✅ Tách biệt rõ ràng business logic theo role
- ✅ Dễ dàng deploy và scale từng feature độc lập

**3. Dễ Bảo Trì và Nâng Cấp**
- ✅ Fix bug: Dễ xác định feature cần sửa
- ✅ Nâng cấp: Có thể nâng cấp từng feature độc lập
- ✅ Refactor: Dễ refactor từng feature mà không ảnh hưởng features khác
- ✅ Testing: Dễ viết test cho từng feature riêng biệt

**4. Team Collaboration**
- ✅ Developers dễ hiểu cấu trúc
- ✅ Dễ phân công task theo feature
- ✅ Giảm conflict khi làm việc nhóm
- ✅ Onboarding nhanh cho developers mới

#### 7.2.3. Feature-Based Organization
- ✅ Dễ maintain và scale
- ✅ Tách biệt concerns theo role
- ✅ Dễ test và debug
- ✅ Dễ onboard developers mới

#### 7.2.4. API Layer Separation
- ✅ Tách biệt API calls theo microservice
- ✅ Dễ thay đổi API endpoints
- ✅ Dễ mock cho testing
- ✅ Dễ implement API Gateway
- ✅ Mapping rõ ràng với backend C# services

#### 7.2.5. Shared Resources
- ✅ Tái sử dụng components
- ✅ Consistency trong UI/UX
- ✅ Centralized utilities
- ✅ Centralized constants
- ✅ Features dùng chung được đặt trong `shared-*` prefix

### 7.3. Feature Mapping theo Roles

#### 7.3.1. Bảng Mapping Features và Roles

| Role ID | Role Name | Feature Name | Core Feature | Description |
|---------|-----------|--------------|--------------|-------------|
| 1 | Admin | `admin-user-management` | User Management | Quản lý users, CRUD operations |
| 1 | Admin | `admin-role-management` | Role Management | Quản lý roles, permissions |
| 1 | Admin | `admin-system-configuration` | System Configuration | Cấu hình hệ thống, services |
| 1 | Admin | `admin-reports` | Reports & Analytics | Báo cáo, thống kê, analytics |
| 2 | Manager | `manager-inventory-management` | Inventory Management | Quản lý kho, thiết bị, reagents |
| 2 | Manager | `manager-shift-management` | Shift Management | Quản lý ca làm việc, lịch |
| 2 | Manager | `manager-reports` | Reports | Báo cáo, thống kê |
| 3 | Doctor | `doctor-consultation` | Consultation | Tư vấn bệnh nhân, consultation notes |
| 3 | Doctor | `doctor-lab-results-review` | Lab Results Review | Duyệt kết quả xét nghiệm |
| 3 | Doctor | `doctor-patient-profile` | Patient Profile | Xem hồ sơ bệnh nhân, lịch sử |
| 3 | Doctor | `doctor-schedule` | Schedule Management | Quản lý lịch làm việc |
| 4 | Lab User | `labuser-sample-collection` | Sample Collection | Lấy mẫu, tạo barcode |
| 4 | Lab User | `labuser-result-entry` | Result Entry | Nhập kết quả xét nghiệm |
| 4 | Lab User | `labuser-lab-test-management` | Lab Test Management | Quản lý lab tests, status |
| 5 | Patient | `patient-appointment-booking` | Appointment Booking | Đặt lịch hẹn, thanh toán |
| 5 | Patient | `patient-results-viewing` | Results Viewing | Xem kết quả xét nghiệm |
| 5 | Patient | `patient-profile-management` | Profile Management | Quản lý hồ sơ cá nhân |
| 6 | Receptionist | `receptionist-check-in` | Check-in | Check-in bệnh nhân, scan QR |
| 6 | Receptionist | `receptionist-patient-creation` | Patient Creation | Tạo hồ sơ bệnh nhân mới |

#### 7.3.2. Shared Features

| Feature Name | Used By Roles | Description |
|--------------|---------------|-------------|
| `shared-patient` | Admin, Manager, Doctor, Receptionist | Patient CRUD, search, profile |
| `shared-appointment` | Admin, Manager, Lab User, Patient, Receptionist | Appointment management |
| `shared-invoice` | Admin, Manager, Patient | Invoice management, payment |

#### 7.3.3. Mapping với Backend C# Microservices

**Ví dụ Mapping:**
```
Frontend Feature              →  Backend C# Service
─────────────────────────────────────────────────────
admin-user-management        →  IAM Service (UserController)
admin-role-management        →  IAM Service (RoleController)
manager-inventory-management →  Inventory Service (InventoryController)
doctor-consultation          →  Consultation Service (ConsultationController)
labuser-sample-collection    →  TestOrder Service (SampleController)
patient-appointment-booking  →  Appointment Service (AppointmentController)
receptionist-check-in        →  Appointment Service (CheckInController)
```

### 7.4. Migration Strategy

#### Phase 1: API Layer Refactoring
1. Tạo `src/api/` directory structure
2. Move services vào `src/api/services/` theo microservice
3. Tách API clients theo microservice (iam, patient, appointment, testorder, etc.)
4. Update imports trong components
5. Implement API Gateway client

#### Phase 2: Feature-Based Organization với Naming Convention
1. Tạo `src/features/` directory structure
2. Tạo features theo pattern `{RoleName}-{CoreFeature}`
3. Move pages và components vào features tương ứng
4. Organize by role + feature, không phải by type
5. Update routes để map với features mới
6. Tạo shared features cho các features dùng chung

#### Phase 3: Shared Resources
1. Tạo `src/shared/` directory structure
2. Move shared components, utils, constants
3. Update imports trong features
4. Tạo shared features cho patient, appointment, invoice

#### Phase 4: Configuration
1. Tạo `src/config/` directory
2. Move configuration files
3. Environment variables management
4. API Gateway configuration
5. Service endpoint mapping configuration

---

## 8. Kiểm Tra Files Dư Thừa

### 8.1. Files Có Thể Dư Thừa

#### 8.1.1. Test Files
- ✅ `src/App.test.js` - Test file (có thể giữ cho testing)
- ✅ `src/setupTests.js` - Test setup (cần thiết)
- ✅ `src/reportWebVitals.js` - Performance monitoring (có thể giữ)

#### 8.1.2. Duplicate Components
- ⚠️ `src/components/Patient/PatientProfileEdit.js` - Có thể duplicate với `src/pages/Profile.js`
- ⚠️ `src/pages/DoctorPatientProfile.js` - Có thể merge với `src/components/Patient/PatientProfile.js`

#### 8.1.3. Unused Components
- ⚠️ `src/components/OTPHelper.js` - Kiểm tra xem có được sử dụng không
- ⚠️ `src/components/Steps/Steps.js` - Kiểm tra xem có được sử dụng không

#### 8.1.4. Documentation Files trong src/
- ⚠️ `src/LAB_USER_WORKFLOW_FINAL.md` - Có thể move sang `docs/`
- ⚠️ `src/WORKFLOW_STATUS_EXPLAINED.md` - Có thể move sang `docs/`

#### 8.1.5. Build Output
- ✅ `src/build/` - Nên được ignore, không commit
- ✅ `src/public/` - Có thể duplicate với root `public/`

### 8.2. Đề Xuất Cleanup

#### 8.2.1. Move Documentation
```bash
# Move documentation files to docs/
mv src/LAB_USER_WORKFLOW_FINAL.md docs/
mv src/WORKFLOW_STATUS_EXPLAINED.md docs/
```

#### 8.2.2. Remove Duplicate
```bash
# Remove duplicate public directory if exists
rm -rf src/public
```

#### 8.2.3. Remove Build Output
```bash
# Remove build directory (should be in .gitignore)
rm -rf src/build
```

#### 8.2.4. Check Unused Components
- Kiểm tra `src/components/OTPHelper.js` có được import không
- Kiểm tra `src/components/Steps/Steps.js` có được import không
- Kiểm tra `src/components/Loading/LoadingDemo.js` có được import không

---

## 9. Kế Hoạch Migration Microservice

### 9.1. API Gateway Integration

#### 9.1.1. Gateway Configuration
- Sử dụng Ocelot API Gateway
- Configure routes cho từng microservice
- Implement authentication middleware
- Implement rate limiting

#### 9.1.2. Service Discovery
- Implement service discovery
- Health checks
- Load balancing
- Circuit breaker pattern

### 9.2. Microservice Mapping

#### 9.2.1. IAM Service (Identity & Access Management)
- Authentication
- User management
- Role management
- Permission management

#### 9.2.2. Patient Service
- Patient CRUD
- Patient search
- Patient profile
- Patient history

#### 9.2.3. Appointment Service
- Appointment CRUD
- Appointment scheduling
- Appointment status management
- Check-in functionality

#### 9.2.4. Test Order Service
- Lab test management
- Sample management
- Result entry
- Status management

#### 9.2.5. Consultation Service
- Consultation management
- Doctor consultation
- Consultation notes
- Result delivery

#### 9.2.6. Invoice Service
- Invoice management
- Payment processing
- Invoice generation
- Payment history

#### 9.2.7. Inventory Service
- Inventory management
- Equipment management
- Reagents management
- Stock tracking

#### 9.2.8. Notification Service
- Email notifications
- SMS notifications
- Push notifications
- Notification history

### 9.3. Migration Steps

#### Step 1: API Layer Refactoring
1. Tạo API client cho từng microservice
2. Implement API Gateway client
3. Update service files
4. Test API calls

#### Step 2: Feature Migration
1. Migrate features one by one
2. Update components to use new API clients
3. Test functionality
4. Deploy to staging

#### Step 3: Production Deployment
1. Deploy API Gateway
2. Deploy microservices
3. Update frontend to use new APIs
4. Monitor and fix issues

---

## 10. Kết Luận và Đề Xuất

### 10.1. Đánh Giá Hiện Trạng

#### ✅ Điểm Mạnh
- Cấu trúc rõ ràng, dễ hiểu
- Separation of concerns tốt
- Role-based access control tốt
- API services được tổ chức tốt
- Documentation đầy đủ

#### ⚠️ Điểm Cần Cải Thiện
- Cấu trúc chưa tối ưu cho microservice
- API layer chưa tách biệt theo service
- Feature-based organization chưa rõ ràng
- Naming convention chưa theo pattern RoleName + CoreFeature
- Một số files có thể dư thừa
- Documentation files trong src/ nên move sang docs/

### 10.2. Đề Xuất

#### 10.2.1. Ngắn Hạn (1-2 tuần)
1. ✅ Cleanup files dư thừa
2. ✅ Move documentation files
3. ✅ Remove duplicate directories
4. ✅ Check unused components
5. ✅ Áp dụng naming convention `{RoleName}-{CoreFeature}` cho features mới

#### 10.2.2. Trung Hạn (1-2 tháng)
1. ✅ Refactor API layer theo microservice structure
2. ✅ Implement feature-based organization với naming convention
3. ✅ Tạo features theo pattern `{RoleName}-{CoreFeature}`
4. ✅ Create shared resources và shared features
5. ✅ Update routing structure để map với features mới
6. ✅ Mapping features với backend C# microservices

#### 10.2.3. Dài Hạn (3-6 tháng)
1. ✅ Migrate to microservice architecture
2. ✅ Implement API Gateway với service mapping
3. ✅ Service discovery và health checks
4. ✅ Monitoring và logging
5. ✅ Deploy từng feature độc lập

### 10.3. Next Steps

1. **Review và approve** cấu trúc đề xuất
2. **Create migration plan** chi tiết
3. **Start with API layer** refactoring
4. **Gradual migration** từng feature
5. **Test thoroughly** sau mỗi phase
6. **Deploy to production** khi ready

---

## 11. Phụ Lục

### 11.1. File Dependencies

#### Core Dependencies
- `src/App.js` → `src/contexts/AuthContext.js`
- `src/App.js` → `src/contexts/NotificationContext.js`
- `src/App.js` → `src/components/Layout/Layout.js`
- `src/App.js` → All page components

#### Service Dependencies
- All services → `src/services/api.js`
- All pages → Service files
- All components → Service files (if needed)

#### Context Dependencies
- All protected routes → `src/contexts/AuthContext.js`
- All pages → `src/contexts/NotificationContext.js`

### 11.2. Import Patterns

#### Service Imports (New Structure)
```javascript
// API services theo microservice
import { appointmentService } from '../../api/services/appointment/appointmentService';
import { patientService } from '../../api/services/patient/patientService';
import { labTestService } from '../../api/services/testorder/labTestService';
```

#### Feature Imports (New Structure với Naming Convention)
```javascript
// Import từ features theo RoleName + CoreFeature
import { UserList } from '../../features/admin-user-management/components/UserList';
import { ConsultationForm } from '../../features/doctor-consultation/components/ConsultationForm';
import { SampleCollection } from '../../features/labuser-sample-collection/components/SampleCollection';
import { AppointmentBooking } from '../../features/patient-appointment-booking/components/AppointmentBooking';
import { CheckInList } from '../../features/receptionist-check-in/components/CheckInList';

// Import từ shared features
import { PatientList } from '../../features/shared-patient/components/PatientList';
import { AppointmentList } from '../../features/shared-appointment/components/AppointmentList';
```

#### Context Imports
```javascript
import { useAuth } from '../../shared/contexts/AuthContext';
import { useNotificationContext } from '../../shared/contexts/NotificationContext';
```

#### Component Imports (Shared)
```javascript
import Layout from '../../shared/components/Layout/Layout';
import StatusBadge from '../../shared/utils/statusHelper';
```

#### Hook Imports (Feature-specific)
```javascript
// Import hooks từ features
import { useUsers } from '../../features/admin-user-management/hooks/useUsers';
import { useConsultations } from '../../features/doctor-consultation/hooks/useConsultations';
import { useSampleCollection } from '../../features/labuser-sample-collection/hooks/useSampleCollection';
```

### 11.3. Status Flow Diagrams

#### Appointment Status Flow
```
pending_payment → scheduled → confirmed → checked_in → 
sample_collected → sample_processed → result_pending → 
ready_for_consultation → completed
```

#### Sample Status Flow
```
pending_collection → collected → processing → completed
```

#### Lab Test Status Flow
```
pending → result_pending → waiting_review → approved → completed
```

---

**Kết thúc báo cáo**

*Báo cáo này được tạo tự động và cần được review bởi team trước khi thực hiện migration.*

