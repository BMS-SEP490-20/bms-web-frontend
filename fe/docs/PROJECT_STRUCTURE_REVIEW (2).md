# Báo Cáo Đánh Giá Cấu Trúc Dự Án - Blood Laboratory Management System

## 📋 Tổng Quan

Báo cáo này đánh giá chi tiết cấu trúc hiện tại của dự án, phân tích từng thư mục và đưa ra các đề xuất cải thiện cụ thể để tối ưu hóa tổ chức code, tăng khả năng bảo trì và mở rộng.

**Ngày đánh giá:** 2024-12-22  
**Phiên bản:** 2.0.0

---

## 🔍 Phân Tích Chi Tiết Từng Thư Mục

### 1. 📁 `src/api-gateway/`

#### Cấu trúc hiện tại:
```
api-gateway/
  └── ocelot.json (30KB, 1007 dòng)
```

#### Đánh giá:
- ✅ **Đúng chức năng**: File cấu hình API Gateway
- ❌ **Sai vị trí**: File cấu hình không nên nằm trong `src/` vì:
  - Không phải là code runtime của ứng dụng
  - Có thể được sử dụng bởi backend services
  - Nên nằm ở cấp root hoặc trong thư mục `config/`

#### Vấn đề:
- File cấu hình backend nằm trong thư mục frontend source code
- Gây nhầm lẫn về phạm vi và mục đích sử dụng

#### Đề xuất:
- **Di chuyển**: `src/api-gateway/ocelot.json` → `config/api-gateway/ocelot.json` (hoặc root level)
- **Lý do**: Tách biệt cấu hình infrastructure khỏi source code

---

### 2. 📁 `src/components/`

#### Cấu trúc hiện tại:
```
components/
  ├── ConfirmDialog/          ✅ Shared UI component
  ├── Consultation/           ❌ Feature page (nên là page)
  ├── DoctorManagement/       ❌ Feature page (nên là page)
  ├── ErrorBoundary/          ✅ Shared utility component
  ├── InventoryManagement/    ❌ Feature page (nên là page)
  ├── LabTestInvoices/        ❌ Feature page (nên là page)
  ├── Layout/                 ✅ Layout components (đúng)
  ├── Loading/                ✅ Shared UI component
  ├── MyAppointments/         ❌ Feature component (patient-specific)
  ├── MyConsultations/        ❌ Feature component (patient-specific)
  ├── MyResults/              ❌ Feature component (patient-specific)
  ├── Notification/           ✅ Shared context/provider
  ├── OTPHelper.js            ⚠️  Utility component (nên là shared/utils)
  ├── Patient/                ⚠️  Feature component (nên trong feature)
  ├── PaymentHistory/         ❌ Feature component (patient-specific)
  ├── QRBarcode/              ✅ Shared utility component
  ├── Receptionist/           ❌ Feature pages (nên là pages)
  ├── ResultEntry/            ❌ Feature page (nên là page)
  ├── RoleManagement/         ❌ Feature page (nên là page)
  ├── ShiftAssignment/        ❌ Feature page (nên là page)
  ├── StatusFilter/           ✅ Shared UI component
  ├── Steps/                  ✅ Shared UI component
  └── UserManagement/         ❌ Feature page (nên là page)
```

#### Đánh giá:

**✅ Components đúng vị trí (Shared/Reusable):**
- `ConfirmDialog/` - Dialog xác nhận tái sử dụng
- `ErrorBoundary/` - Error handling component
- `Layout/` - Layout components (Header, Footer, Sidebar)
- `Loading/` - Loading spinner component
- `Notification/` - Notification provider/context
- `QRBarcode/` - QR/Barcode utility components
- `StatusFilter/` - Filter component tái sử dụng
- `Steps/` - Stepper component tái sử dụng

**❌ Components sai vị trí (Feature Pages):**
- `Consultation/` - Full page với routing, state management, service calls
- `DoctorManagement/` - Full CRUD page với 729 dòng code
- `InventoryManagement/` - Full management page
- `LabTestInvoices/` - Full billing page
- `Receptionist/` - Multiple receptionist pages
- `ResultEntry/` - Full result entry page
- `RoleManagement/` - Full role management page
- `ShiftAssignment/` - Full shift management page
- `UserManagement/` - Full user management page

**⚠️ Components cần phân loại lại:**
- `MyAppointments/`, `MyConsultations/`, `MyResults/`, `PaymentHistory/` - Patient-specific features
- `Patient/` - Patient profile components
- `OTPHelper.js` - Utility component, nên là shared utility

#### Vấn đề chính:
1. **Lẫn lộn giữa Components và Pages**: Nhiều "components" thực chất là full pages với routing logic
2. **Thiếu phân cấp**: Không có sự phân biệt giữa:
   - Atomic components (Button, Input)
   - Composite components (Form, Table)
   - Feature components (DoctorTable, ConsultationList)
   - Page-level components (DoctorManagement, Consultation)
3. **Naming không nhất quán**: Một số dùng PascalCase folder, một số dùng camelCase file

#### Đề xuất:
1. **Tạo cấu trúc mới:**
   ```
   shared/
     components/
       ConfirmDialog/
       Loading/
       StatusFilter/
       Steps/
       QRBarcode/
   features/
     consultations/
       pages/
         ConsultationPage.jsx
       components/
         ConsultationList.jsx
         ChatPanel.jsx
     users/
       pages/
         DoctorManagementPage.jsx
         UserManagementPage.jsx
         RoleManagementPage.jsx
       components/
         DoctorTable.jsx
         UserForm.jsx
   ```

2. **Di chuyển cụ thể:**
   - `components/Consultation/` → `features/consultations/pages/ConsultationPage.jsx`
   - `components/DoctorManagement/` → `features/users/pages/DoctorManagementPage.jsx`
   - `components/UserManagement/` → `features/users/pages/UserManagementPage.jsx`
   - `components/RoleManagement/` → `features/users/pages/RoleManagementPage.jsx`
   - `components/InventoryManagement/` → `features/inventory/pages/InventoryManagementPage.jsx`
   - `components/ShiftAssignment/` → `features/scheduling/pages/ShiftAssignmentPage.jsx`
   - `components/LabTestInvoices/` → `features/billing/pages/LabTestInvoicesPage.jsx`
   - `components/ResultEntry/` → `features/lab-results/pages/ResultEntryPage.jsx`
   - `components/Receptionist/*` → `features/reception/pages/`
   - `components/MyAppointments/`, `MyConsultations/`, `MyResults/`, `PaymentHistory/` → `features/patient/pages/`
   - `components/Patient/` → `features/patient/components/`
   - `components/OTPHelper.js` → `shared/utils/otpHelper.js`

---

### 3. 📁 `src/constants/`

#### Cấu trúc hiện tại:
```
constants/
  └── status.js (9.8KB, 263 dòng)
```

#### Đánh giá:
- ✅ **Tốt**: File `status.js` được tổ chức rất tốt với:
  - Các constant groups rõ ràng (APPOINTMENT_STATUS, SAMPLE_STATUS, LAB_TEST_STATUS, etc.)
  - Comments mô tả chi tiết
  - Export named exports nhất quán
  - Có status groups cho filtering

#### Vấn đề:
- Chỉ có 1 file, có thể cần mở rộng khi dự án phát triển
- Không có constants cho API endpoints, routes, hoặc config values

#### Đề xuất:
1. **Giữ nguyên cấu trúc hiện tại** cho `status.js`
2. **Thêm các constants khác nếu cần:**
   ```
   constants/
     status.js
     routes.js          (route paths)
     apiEndpoints.js    (API endpoint paths)
     config.js          (app configuration)
   ```

---

### 4. 📁 `src/contexts/`

#### Cấu trúc hiện tại:
```
contexts/
  ├── AuthContext.js (6.3KB, 232 dòng)
  └── NotificationContext.js (1.4KB, 51 dòng)
```

#### Đánh giá:
- ✅ **Đúng vị trí**: Contexts là global state management, nên ở root level
- ✅ **Tốt**: 
  - `AuthContext` - Quản lý authentication state
  - `NotificationContext` - Quản lý notification state
- ✅ **Naming nhất quán**: Sử dụng `*Context.js` convention

#### Vấn đề:
- Không có vấn đề lớn, cấu trúc hợp lý

#### Đề xuất:
- **Giữ nguyên cấu trúc hiện tại**
- Có thể thêm `ThemeContext` hoặc `SettingsContext` nếu cần trong tương lai

---

### 5. 📁 `src/data/`

#### Cấu trúc hiện tại:
```
data/
  └── vietnamLocations.js (32KB, 378 dòng)
```

#### Đánh giá:
- ✅ **Đúng vị trí**: Static data files
- ✅ **Tốt**: File chứa dữ liệu địa lý Việt Nam (tỉnh/thành, quận/huyện)

#### Vấn đề:
- Không có vấn đề lớn

#### Đề xuất:
- **Giữ nguyên cấu trúc hiện tại**
- Có thể thêm các file data khác nếu cần:
  ```
  data/
    vietnamLocations.js
    medicalServices.js    (nếu có static service data)
    testTypes.js         (nếu có static test type data)
  ```

---

### 6. 📁 `src/pages/`

#### Cấu trúc hiện tại:
```
pages/
  ├── AdminAppointments.js
  ├── AdminDashboard.js
  ├── AdminInvoices.js
  ├── AdminPatients.js
  ├── AdminReports.js
  ├── DoctorConsultations.js
  ├── DoctorDashboard.js
  ├── DoctorLabResults.js
  ├── DoctorPatientProfile.js
  ├── DoctorSchedule.js
  ├── ForgotPassword.js
  ├── Home.js
  ├── LabUserDashboard.js
  ├── Login.js
  ├── ManagerDashboard.js
  ├── PatientDashboard.js
  ├── Profile.js
  ├── ReceptionistCheckIn.js
  ├── ReceptionistCreatePatient.js
  ├── ReceptionistDashboard.js
  ├── Register.js
  ├── Results.js
  ├── SampleManagement.js
  └── Services.js
```

#### Đánh giá:

**✅ Pages đúng vị trí:**
- Authentication pages: `Login.js`, `Register.js`, `ForgotPassword.js`
- Public pages: `Home.js`, `Services.js`
- Role dashboards: `AdminDashboard.js`, `DoctorDashboard.js`, `PatientDashboard.js`, etc.

**⚠️ Vấn đề tổ chức:**
- **Flat structure**: Tất cả pages nằm cùng một cấp, khó quản lý
- **Không có nhóm theo role**: Admin, Doctor, Patient pages lẫn lộn
- **Naming không nhất quán**: Một số dùng prefix (Admin*, Doctor*), một số không
- **Trùng lặp với components**: Một số "pages" trong `components/` thực chất là pages

#### Vấn đề:
1. **Thiếu phân cấp**: Không có subfolders cho các role groups
2. **Khó maintain**: Khi có nhiều pages cho một role, sẽ rất khó tìm
3. **Import paths dài**: Phải import từ root `pages/`

#### Đề xuất:
1. **Tổ chức lại theo role và feature:**
   ```
   pages/
     auth/
       Login.js
       Register.js
       ForgotPassword.js
     public/
       Home.js
       Services.js
     admin/
       Dashboard.js
       Patients.js
       Appointments.js
       Invoices.js
       Reports.js
     doctor/
       Dashboard.js
       Consultations.js
       LabResults.js
       PatientProfile.js
       Schedule.js
     patient/
       Dashboard.js
       Profile.js
     lab-user/
       Dashboard.js
     manager/
       Dashboard.js
     receptionist/
       Dashboard.js
       CheckIn.js
       CreatePatient.js
     shared/
       Results.js
       SampleManagement.js
   ```

2. **Lợi ích:**
   - Dễ tìm kiếm pages theo role
   - Import paths ngắn hơn: `from '../pages/admin/Dashboard'`
   - Dễ mở rộng khi thêm pages mới
   - Rõ ràng về ownership và scope

---

### 7. 📁 `src/services/`

#### Cấu trúc hiện tại:
```
services/
  ├── api.js                    (Axios instance)
  ├── appointmentService.js
  ├── authService.js
  ├── consultationService.js
  ├── emailService.js           ⚠️  Có vấn đề
  ├── inventoryService.js
  ├── invoiceService.js
  ├── labTestService.js
  ├── medicalServiceService.js
  ├── patientService.js
  ├── roleService.js
  ├── sampleService.js
  ├── shiftService.js
  └── userManagementService.js  ⚠️  Export khác biệt
```

#### Đánh giá:

**✅ Services tốt:**
- `api.js` - Axios instance với interceptors
- Hầu hết services có structure nhất quán
- Named exports (trừ `userManagementService`)

**❌ Vấn đề:**

1. **Inconsistent exports:**
   - Hầu hết dùng: `export const serviceName = { ... }`
   - `userManagementService.js` dùng: `export default userManagementService`
   - `api.js` dùng: `export default api`

2. **emailService.js có vấn đề:**
   - Sử dụng `window.location` (browser dependency)
   - Tạo HTML strings trực tiếp trong service (mixing concerns)
   - Nên tách template logic ra khỏi service

3. **Naming không nhất quán:**
   - `medicalServiceService.js` - tên dài và lặp từ "Service"
   - Nên là `medicalService.js` hoặc `serviceService.js`

4. **Thiếu organization:**
   - Tất cả services nằm cùng một cấp
   - Không có nhóm theo domain

#### Đề xuất:

1. **Chuẩn hóa exports:**
   ```javascript
   // Tất cả services nên dùng named export
   export const appointmentService = { ... }
   export const authService = { ... }
   // Không dùng default export (trừ api.js)
   ```

2. **Tách emailService:**
   ```
   shared/
     templates/
       email/
         paymentConfirmation.html.js
         consultationResult.html.js
         loginCredentials.html.js
   features/
     notifications/
       api/
         emailService.js  (chỉ gọi API, không tạo HTML)
   ```

3. **Đổi tên:**
   - `medicalServiceService.js` → `medicalService.js`

4. **Tổ chức lại (optional, nếu muốn feature-based):**
   ```
   services/
     api.js                    (base API client)
     core/                     (core services)
       authService.js
       userManagementService.js
     features/                  (feature-specific services)
       appointments/
         appointmentService.js
       consultations/
         consultationService.js
       lab-results/
         labTestService.js
         sampleService.js
       billing/
         invoiceService.js
       inventory/
         inventoryService.js
       scheduling/
         shiftService.js
   ```

---

### 8. 📁 `src/styles/`

#### Cấu trúc hiện tại:
```
styles/
  ├── animations.css
  ├── calendar-custom.css
  ├── component-overrides.css
  ├── guest-header.css
  └── medical-theme.css
```

#### Đánh giá:
- ✅ **Tốt**: Global styles được tổ chức rõ ràng
- ✅ **Phân loại hợp lý**: 
  - Theme styles
  - Component overrides
  - Animations
  - Specific component styles

#### Vấn đề:
- Không có vấn đề lớn

#### Đề xuất:
- **Giữ nguyên cấu trúc hiện tại**
- Có thể thêm:
  ```
  styles/
    global/
      medical-theme.css
      animations.css
    components/
      calendar-custom.css
      guest-header.css
      component-overrides.css
  ```

---

### 9. 📁 `src/utils/`

#### Cấu trúc hiện tại:
```
utils/
  ├── formatHelper.js
  ├── migrateStatus.js
  ├── responsiveHelper.js
  ├── roleUtils.js
  └── statusHelper.js
```

#### Đánh giá:

**✅ Utils tốt:**
- `formatHelper.js` - Formatting utilities (cross-cutting)
- `statusHelper.js` - Status-related helpers (domain-specific nhưng shared)

**⚠️ Utils cần xem xét:**
- `roleUtils.js` - Role management utilities (domain-specific, nên trong feature)
- `responsiveHelper.js` - Responsive utilities (cross-cutting, OK)
- `migrateStatus.js` - Migration utility (có thể là one-time script)

#### Vấn đề:
1. **Domain-specific utils trong global scope:**
   - `roleUtils.js` chỉ dùng cho user/role management
   - Nên nằm trong feature `users/` hoặc `shared/` nếu thực sự shared

2. **Thiếu organization:**
   - Không có subfolders cho các loại utils khác nhau

#### Đề xuất:

1. **Tổ chức lại:**
   ```
   shared/
     utils/
       format/
         formatHelper.js
       responsive/
         responsiveHelper.js
       status/
         statusHelper.js
   features/
     users/
       utils/
         roleUtils.js
   scripts/  (hoặc root level)
     migrateStatus.js  (nếu là migration script)
   ```

2. **Hoặc giữ đơn giản hơn:**
   ```
   utils/
     formatHelper.js        (OK - cross-cutting)
     responsiveHelper.js    (OK - cross-cutting)
     statusHelper.js        (OK - shared domain logic)
     roleUtils.js           (OK - shared across features)
     migrateStatus.js       (Move to scripts/ if one-time)
   ```

---

### 10. 📁 `src/hooks/`

#### Cấu trúc hiện tại:
```
hooks/
  ├── useAccessDenied.js
  └── useNotification.js
```

#### Đánh giá:

**✅ Hooks tốt:**
- `useNotification.js` - Notification hook (shared utility)
- `useAccessDenied.js` - Access control hook (shared utility)

#### Vấn đề:
- Không có vấn đề lớn
- Có thể cần thêm hooks cho các features cụ thể trong tương lai

#### Đề xuất:

1. **Giữ nguyên nếu hooks là shared:**
   ```
   hooks/
     useAccessDenied.js
     useNotification.js
   ```

2. **Hoặc di chuyển vào shared nếu có cấu trúc features:**
   ```
   shared/
     hooks/
       useNotification.js
       useAccessDenied.js
   features/
     consultations/
       hooks/
         useConsultations.js
     appointments/
       hooks/
         useAppointments.js
   ```

---

## 📊 Tổng Hợp Vấn Đề

### 🔴 Vấn đề Nghiêm Trọng:

1. **Lẫn lộn Components và Pages**
   - 10+ "components" thực chất là full pages
   - Gây nhầm lẫn về architecture và responsibility

2. **Thiếu Feature-based Organization**
   - Code liên quan đến một feature nằm rải rác nhiều nơi
   - Khó maintain và mở rộng

3. **Inconsistent Naming và Exports**
   - Services có cả default và named exports
   - File naming không nhất quán

4. **Service Layer Leaking Concerns**
   - `emailService` có browser dependencies và HTML generation
   - Mixing presentation logic với business logic

### 🟡 Vấn đề Trung Bình:

1. **Flat Page Structure**
   - Tất cả pages nằm cùng một cấp
   - Khó quản lý khi scale up

2. **Configuration Files trong Source**
   - `api-gateway/ocelot.json` nằm trong `src/`

3. **Domain-specific Utils trong Global Scope**
   - `roleUtils.js` có thể nên trong feature module

### 🟢 Vấn đề Nhỏ:

1. **Naming inconsistencies**
   - `medicalServiceService.js` - tên dài
   - Một số files dùng camelCase, một số PascalCase

---

## 🎯 Đề Xuất Cấu Trúc Mới (Chi Tiết)

### Cấu trúc đề xuất (đã map chính xác từ các file `.js` đang tồn tại):

> Ký hiệu: `←` chỉ ra file gốc trong dự án hiện tại (`src/...`) sẽ được di chuyển/đổi tsrc/
├── app/
│   ├── App.jsx                      ← src/App.js
│   ├── routes/
│   │   └── index.jsx                # [mới] tổng hợp route
│   ├── layouts/
│   │   ├── AdminLayout.jsx          # [mới] (kết hợp components/Layout/AdminHeader.js + Sidebar.js)
│   │   ├── DoctorLayout.jsx         # [mới]
│   │   ├── PatientLayout.jsx        # [mới]
│   │   └── ReceptionistLayout.jsx   # [mới]
│   └── providers/
│       └── AppProviders.jsx         # [mới] wrap AuthContext + NotificationContext
│
├── shared/
│   ├── components/
│   │   ├── ConfirmDialog/ConfirmDialog.jsx      ← components/ConfirmDialog/ConfirmDialog.js
│   │   ├── ErrorBoundary/ErrorBoundary.jsx      ← components/ErrorBoundary/ErrorBoundary.js
│   │   ├── Loading/Loading.jsx                  ← components/Loading/Loading.js
│   │   ├── Notification/NotificationProvider.jsx← components/Notification/NotificationProvider.js
│   │   ├── QRBarcode/                           ← components/QRBarcode/*
│   │   ├── StatusFilter/StatusFilter.jsx        ← components/StatusFilter/StatusFilter.js
│   │   └── Steps/Steps.jsx                      ← components/Steps/Steps.js
│   ├── hooks/
│   │   ├── useNotification.js                   ← hooks/useNotification.js
│   │   └── useAccessDenied.js                   ← hooks/useAccessDenied.js
│   ├── utils/
│   │   ├── auth/otpHelper.js                    ← components/OTPHelper.js (tách phần logic OTP)
│   │   ├── format/formatHelper.js               ← utils/formatHelper.js
│   │   ├── responsive/responsiveHelper.js       ← utils/responsiveHelper.js
│   │   └── status/statusHelper.js               ← utils/statusHelper.js
│   ├── constants/
│   │   └── status.js                            ← constants/status.js
│   ├── contexts/
│   │   ├── AuthContext.js                       ← contexts/AuthContext.js
│   │   └── NotificationContext.js               ← contexts/NotificationContext.js
│   ├── styles/                                  ← styles/*
│   └── templates/email/
│       ├── consultationResult.js                ← trích HTML từ services/emailService.js
│       ├── loginCredentials.js                  ← trích HTML từ services/emailService.js
│       └── paymentConfirmation.js               ← trích HTML từ services/emailService.js
│
├── features/
│   ├── auth/
│   │   ├── api/authService.js                   ← services/authService.js
│   │   └── pages/
│   │       ├── LoginPage.jsx                    ← pages/Login.js
│   │       ├── RegisterPage.jsx                 ← pages/Register.js
│   │       └── ForgotPasswordPage.jsx           ← pages/ForgotPassword.js
│   │
│   ├── appointments/
│   │   ├── api/
│   │   │   ├── appointmentService.js            ← services/appointmentService.js
│   │   │   └── shiftService.js                  ← services/shiftService.js
│   │   ├── components/
│   │   │   └── ShiftAssignment/ShiftAssignment.jsx ← components/ShiftAssignment/ShiftAssignment.js
│   │   └── pages/
│   │       ├── AdminAppointmentsPage.jsx        ← pages/AdminAppointments.js
│   │       ├── MyAppointmentsPage.jsx           ← components/MyAppointments/MyAppointments.js
│   │       └── ReceptionistCheckInPage.jsx      ← pages/ReceptionistCheckIn.js
│   │
│   ├── consultations/
│   │   ├── api/consultationService.js           ← services/consultationService.js
│   │   ├── components/MyConsultations/MyConsultations.jsx ← components/MyConsultations/MyConsultations.js
│   │   └── pages/
│   │       ├── ConsultationWorkspacePage.jsx    ← components/Consultation/Consultation.js
│   │       └── DoctorConsultationsPage.jsx      ← pages/DoctorConsultations.js
│   │
│   ├── lab-results/
│   │   ├── api/
│   │   │   ├── labTestService.js                ← services/labTestService.js
│   │   │   └── sampleService.js                 ← services/sampleService.js
│   │   ├── components/MyResults/MyResults.jsx   ← components/MyResults/MyResults.js
│   │   └── pages/
│   │       ├── ResultEntryPage.jsx              ← components/ResultEntry/ResultEntry.js
│   │       ├── ResultsDashboardPage.jsx         ← pages/Results.js
│   │       └── SampleManagementPage.jsx         ← pages/SampleManagement.js
│   │
│   ├── billing/
│   │   ├── api/invoiceService.js                ← services/invoiceService.js
│   │   ├── components/PaymentHistory/PaymentHistory.jsx ← components/PaymentHistory/PaymentHistory.js
│   │   ├── templates/email/paymentConfirmation.js ← trích HTML từ services/emailService.js
│   │   └── pages/LabTestInvoicesPage.jsx        ← components/LabTestInvoices/LabTestInvoices.js
│   │
│   ├── inventory/
│   │   ├── api/inventoryService.js              ← services/inventoryService.js
│   │   └── pages/InventoryManagementPage.jsx    ← components/InventoryManagement/InventoryManagement.js
│   │
│   ├── users/
│   │   ├── api/
│   │   │   ├── userManagementService.js         ← services/userManagementService.js
│   │   │   └── roleService.js                   ← services/roleService.js
│   │   ├── pages/
│   │   │   ├── UserManagementPage.jsx           ← components/UserManagement/UserManagement.js
│   │   │   ├── DoctorManagementPage.jsx         ← components/DoctorManagement/DoctorManagement.js
│   │   │   └── RoleManagementPage.jsx           ← components/RoleManagement/RoleManagement.js
│   │   └── utils/roleUtils.js                   ← utils/roleUtils.js
│   │
│   ├── patient/
│   │   ├── api/
│   │   │   ├── patientService.js                ← services/patientService.js
│   │   │   └── medicalService.js                ← services/medicalServiceService.js (đổi tên)
│   │   ├── components/
│   │   │   ├── PatientProfileEdit/PatientProfileEdit.jsx ← components/Patient/PatientProfileEdit.js
│   │   │   ├── MyAppointments/MyAppointments.jsx ← components/MyAppointments/MyAppointments.js
│   │   │   ├── MyResults/MyResults.jsx           ← components/MyResults/MyResults.js
│   │   │   ├── MyConsultations/MyConsultations.jsx ← components/MyConsultations/MyConsultations.js
│   │   │   └── PaymentHistory/PaymentHistory.jsx ← components/PaymentHistory/PaymentHistory.js
│   │   └── pages/
│   │       ├── PatientDashboardPage.jsx         ← pages/PatientDashboard.js
│   │       └── PatientProfilePage.jsx           ← pages/Profile.js
│   │
│   ├── reception/
│   │   ├── components/QuickCheckInScan/QuickCheckInScan.jsx ← components/Receptionist/QuickCheckInScan.js
│   │   └── pages/
│   │       ├── ReceptionistDashboardPage.jsx    ← pages/ReceptionistDashboard.js
│   │       ├── ReceptionistCheckInPage.jsx      ← pages/ReceptionistCheckIn.js
│   │       └── ReceptionistCreatePatientPage.jsx← pages/ReceptionistCreatePatient.js
│   │
│   ├── dashboards/
│   │   └── pages/
│   │       ├── AdminDashboardPage.jsx           ← pages/AdminDashboard.js
│   │       ├── DoctorDashboardPage.jsx          ← pages/DoctorDashboard.js
│   │       ├── LabUserDashboardPage.jsx         ← pages/LabUserDashboard.js
│   │       └── ManagerDashboardPage.jsx         ← pages/ManagerDashboard.js
│   │
│   └── reports/
│       └── pages/
│           ├── AdminReportsPage.jsx             ← pages/AdminReports.js
│           ├── ServicesOverviewPage.jsx         ← pages/Services.js
│           └── HomeLandingPage.jsx              ← pages/Home.js
│
├── pages/
│   ├── admin/
│   │   ├── AdminAppointments.jsx                ← pages/AdminAppointments.js
│   │   ├── AdminInvoices.jsx                    ← pages/AdminInvoices.js
│   │   ├── AdminPatients.jsx                    ← pages/AdminPatients.js
│   │   └── AdminReports.jsx                     ← pages/AdminReports.js
│   ├── doctor/
│   │   ├── DoctorPatientProfile.jsx             ← pages/DoctorPatientProfile.js
│   │   └── DoctorSchedule.jsx                   ← pages/DoctorSchedule.js
│   ├── lab-user/
│   │   └── LabUserDashboard.jsx                 ← pages/LabUserDashboard.js
│   └── public/
│       ├── Home.jsx                             ← pages/Home.js
│       └── Services.jsx                         ← pages/Services.js
│
├── services/                                    # Giữ để tham chiếu backward compatibility
│   ├── api.js
│   ├── appointmentService.js
│   ├── authService.js
│   ├── consultationService.js
│   ├── emailService.js
│   ├── inventoryService.js
│   ├── invoiceService.js
│   ├── labTestService.js
│   ├── medicalService.js                        ← đổi tên từ medicalServiceService.js
│   ├── patientService.js
│   ├── roleService.js
│   ├── sampleService.js
│   ├── shiftService.js
│   └── userManagementService.js
│
├── data/
│   └── vietnamLocations.js                      ← data/vietnamLocations.js
│
├── assets/
│   ├── icons/                                   ← assets/*
│   └── images/                                  ← assets/*
│
└── config/
    └── api-gateway/
        └── ocelot.json                          ← api-gateway/ocelot.json


---

## 📝 Kế Hoạch Di Chuyển Chi Tiết

### Phase 1: Cleanup và Tổ chức lại cơ bản

1. **Di chuyển configuration:**
   - `src/api-gateway/ocelot.json` → `config/api-gateway/ocelot.json`

2. **Tạo cấu trúc mới:**
   - Tạo `src/shared/` folder
   - Tạo `src/features/` folder
   - Tạo `src/app/` folder

3. **Di chuyển shared components:**
   - `components/ConfirmDialog/` → `shared/components/ConfirmDialog/`
   - `components/Loading/` → `shared/components/Loading/`
   - `components/StatusFilter/` → `shared/components/StatusFilter/`
   - `components/Steps/` → `shared/components/Steps/`
   - `components/QRBarcode/` → `shared/components/QRBarcode/`
   - `components/ErrorBoundary/` → `shared/components/ErrorBoundary/`

4. **Di chuyển shared utilities:**
   - `components/OTPHelper.js` → `shared/utils/otpHelper.js` (refactor để tách UI)
   - `hooks/useNotification.js` → `shared/hooks/useNotification.js`
   - `hooks/useAccessDenied.js` → `shared/hooks/useAccessDenied.js`
   - `contexts/` → `shared/contexts/`
   - `constants/` → `shared/constants/`
   - `styles/` → `shared/styles/`

### Phase 2: Tổ chức lại Pages

1. **Tạo role-based page structure:**
   ```
   pages/
     auth/
     public/
     admin/
     doctor/
     patient/
     lab-user/
     manager/
     receptionist/
   ```

2. **Di chuyển pages theo role**

### Phase 3: Tổ chức lại Features

1. **Tạo feature modules:**
   - `features/users/`
   - `features/consultations/`
   - `features/appointments/`
   - `features/lab-results/`
   - `features/patient/`
   - `features/billing/`
   - `features/inventory/`
   - `features/scheduling/`
   - `features/reception/`

2. **Di chuyển components thành pages:**
   - Mỗi feature có `pages/`, `components/`, `api/`, `hooks/` riêng

### Phase 4: Refactor Services

1. **Chuẩn hóa exports:**
   - Đổi tất cả services sang named exports
   - Đổi tên `medicalServiceService.js` → `medicalService.js`

2. **Tách emailService:**
   - Tạo email templates trong `shared/templates/email/`
   - Refactor `emailService.js` để chỉ gọi API

3. **Tổ chức lại services (optional):**
   - Di chuyển feature-specific services vào `features/<domain>/api/`

---

## ✅ Checklist Thực Hiện

### Ưu tiên Cao:
- [ ] Di chuyển `api-gateway/ocelot.json` ra khỏi `src/`
- [ ] Tạo cấu trúc `shared/` và di chuyển shared components
- [ ] Tổ chức lại `pages/` theo role
- [ ] Di chuyển feature pages từ `components/` sang `features/`

### Ưu tiên Trung bình:
- [ ] Chuẩn hóa service exports
- [ ] Refactor `emailService.js`
- [ ] Đổi tên `medicalServiceService.js`
- [ ] Tổ chức lại `utils/` và `hooks/`

### Ưu tiên Thấp:
- [ ] Tổ chức lại services theo features (optional)
- [ ] Thêm subfolders trong `styles/` (optional)
- [ ] Tạo `app/` structure với routes/layouts (optional)

---

## 🎓 Best Practices Đề Xuất

### 1. Naming Conventions:
- **Components**: PascalCase (`UserManagement.jsx`)
- **Pages**: PascalCase với suffix `Page` (`UserManagementPage.jsx`)
- **Services**: camelCase với suffix `Service` (`userService.js`)
- **Hooks**: camelCase với prefix `use` (`useUsers.js`)
- **Utils**: camelCase với suffix `Helper` hoặc `Utils` (`formatHelper.js`)

### 2. File Organization:
- Mỗi feature module nên có structure nhất quán:
  ```
  feature/
    pages/      (Route-level components)
    components/ (Reusable feature components)
    api/        (API services)
    hooks/      (Feature-specific hooks)
    utils/      (Feature-specific utilities)
    types/      (TypeScript types, nếu dùng TS)
  ```

### 3. Import Paths:
- Sử dụng absolute imports với path aliases:
  ```javascript
  // Thay vì
  import { userService } from '../../../features/users/api/userService'
  
  // Dùng
  import { userService } from '@/features/users/api/userService'
  ```

### 4. Service Layer:
- Services chỉ nên gọi API, không có business logic phức tạp
- Business logic nên ở trong hooks hoặc utils
- Không sử dụng browser APIs trong services (trừ khi cần thiết)

### 5. Component Hierarchy:
- **Atomic**: Button, Input, Badge
- **Composite**: Form, Table, Card
- **Feature**: UserTable, AppointmentCard
- **Page**: UserManagementPage, AppointmentPage

---

## 📚 Tài Liệu Tham Khảo

- [React Folder Structure Best Practices](https://www.robinwieruch.de/react-folder-structure/)
- [Feature-Sliced Design](https://feature-sliced.design/)
- [Clean Architecture](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)

---

## 🔄 Lộ Trình Thực Hiện

### Week 1: Setup và Cleanup
- Tạo cấu trúc folders mới
- Di chuyển configuration files
- Di chuyển shared components và utilities

### Week 2: Pages Organization
- Tổ chức lại pages theo role
- Update routing
- Test các routes

### Week 3: Features Migration
- Di chuyển features từ components sang features/
- Refactor imports
- Test từng feature

### Week 4: Services Refactoring
- Chuẩn hóa service exports
- Refactor emailService
- Update tất cả imports

### Week 5: Testing và Documentation
- Test toàn bộ ứng dụng
- Update documentation
- Code review

---

**Lưu ý**: Việc refactoring nên được thực hiện từng bước, test kỹ sau mỗi bước để đảm bảo không break functionality hiện tại.
