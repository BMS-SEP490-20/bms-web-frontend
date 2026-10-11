# 📋 Báo Cáo Nhanh - Đề Xuất Di Chuyển File

**Ngày:** 2024-12-22  
**Mục đích:** Đề xuất di chuyển file để hoàn thiện cấu trúc features/ theo tài liệu

---

## 🎯 TÓM TẮT NHANH

### ✅ NÊN DI CHUYỂN NGAY (Ưu Tiên Cao - 3 files):

1. **`pages/shared/Results.js`** → **`features/lab-results/pages/ResultsDashboardPage.jsx`**
   - ✅ Tập trung lab-results vào một nơi
   - ⚠️ Cần update 1 import trong App.js
   - ✅ Rủi ro thấp

2. **`pages/shared/SampleManagement.js`** → **`features/lab-results/pages/SampleManagementPage.jsx`**
   - ✅ Tập trung lab-results vào một nơi
   - ⚠️ Cần update 1 import trong App.js
   - ✅ Rủi ro thấp

3. **`utils/roleUtils.js`** → **`features/users/utils/roleUtils.js`**
   - ✅ Tập trung user-related code
   - ⚠️ Cần update 3 imports (ReceptionistPatientCreate.js, AuthContext.js, roleService.js)
   - ✅ Rủi ro thấp

---

## 📊 CHI TIẾT ĐỀ XUẤT

### ✅ PHASE 1: Di Chuyển Ưu Tiên Cao (3 files)

#### 1.1. Di chuyển Results.js

**Từ:** `src/pages/shared/Results.js`  
**Đến:** `src/features/lab-results/pages/ResultsDashboardPage.jsx`

**Lý do:**
- Theo tài liệu, Results nên ở `features/lab-results/pages/`
- Hiện tại đang ở `pages/shared/` - không phù hợp với cấu trúc features
- Tập trung tất cả lab-results vào một nơi

**Files cần update imports:**
- `src/App.js` (dòng 61): `import Results from './pages/shared/Results'` → `import Results from './features/lab-results/pages/ResultsDashboardPage'`

**Ảnh hưởng:**
- ✅ Không ảnh hưởng logic
- ⚠️ Cần update 1 import
- ✅ Rủi ro thấp

**Các imports trong file cần update:**
- Các imports relative paths sẽ tự động đúng (từ `../../services/` → `../../../services/`)
- Các imports từ shared contexts/utils sẽ cần update: `../../shared/` → `../../../shared/`

---

#### 1.2. Di chuyển SampleManagement.js

**Từ:** `src/pages/shared/SampleManagement.js`  
**Đến:** `src/features/lab-results/pages/SampleManagementPage.jsx`

**Lý do:**
- Theo tài liệu, SampleManagement nên ở `features/lab-results/pages/`
- Hiện tại đang ở `pages/shared/` - không phù hợp
- Tập trung tất cả lab-results vào một nơi

**Files cần update imports:**
- `src/App.js` (dòng 60): `import SampleManagement from './pages/shared/SampleManagement'` → `import SampleManagement from './features/lab-results/pages/SampleManagementPage'`

**Ảnh hưởng:**
- ✅ Không ảnh hưởng logic
- ⚠️ Cần update 1 import
- ✅ Rủi ro thấp

**Các imports trong file cần update:**
- Các imports relative paths sẽ tự động đúng (từ `../../services/` → `../../../services/`)
- Các imports từ shared contexts/utils sẽ cần update: `../../shared/` → `../../../shared/`

---

#### 1.3. Di chuyển roleUtils.js

**Từ:** `src/utils/roleUtils.js`  
**Đến:** `src/features/users/utils/roleUtils.js`

**Lý do:**
- Theo tài liệu, roleUtils nên ở `features/users/utils/`
- Tập trung user-related code vào features/users/
- roleUtils là utility riêng cho users, không phải shared utility

**Files cần update imports (3 files):**
1. `src/features/reception/components/Receptionist/ReceptionistPatientCreate.js` (dòng 13):
   - `import { getRoleIdFromKey } from '../../../../utils/roleUtils'`
   - → `import { getRoleIdFromKey } from '../../../users/utils/roleUtils'`

2. `src/shared/contexts/AuthContext.js` (dòng 14):
   - `import { normalizeRoleToId, normalizeRoleToKey, getRoleDisplayName, hasRole as checkHasRole } from '../utils/roleUtils'`
   - → `import { normalizeRoleToId, normalizeRoleToKey, getRoleDisplayName, hasRole as checkHasRole } from '../../features/users/utils/roleUtils'`

3. `src/services/roleService.js` (dòng 13):
   - `import { ROLE_MAPPING, getRoleById, getRoleByKey, getRoleIdFromKey, getRoleKeyFromId } from '../utils/roleUtils'`
   - → `import { ROLE_MAPPING, getRoleById, getRoleByKey, getRoleIdFromKey, getRoleKeyFromId } from '../features/users/utils/roleUtils'`

**Ảnh hưởng:**
- ✅ Không ảnh hưởng logic
- ⚠️ Cần update 3 imports
- ✅ Rủi ro thấp

---

### ⚠️ PHASE 2: Tùy Chọn (Có Thể Làm Sau)

#### 2.1. Di chuyển DoctorConsultations.js (Tùy chọn)

**Từ:** `src/pages/doctor/Consultations.js`  
**Đến:** `src/features/consultations/pages/DoctorConsultationsPage.jsx`

**Lý do:**
- Theo tài liệu, có thể ở `features/consultations/pages/`
- Tập trung consultations vào features/

**Files cần update:**
- `src/App.js` (dòng 49): `import DoctorConsultations from './pages/doctor/Consultations'` → `import DoctorConsultations from './features/consultations/pages/DoctorConsultationsPage'`

**Khuyến nghị:** ⚠️ **TÙY CHỌN** - Có thể giữ ở `pages/doctor/` vì đã tổ chức tốt theo role

---

#### 2.2. Di chuyển Patient Pages (Tùy chọn)

**Từ:** 
- `src/pages/patient/Dashboard.js`
- `src/pages/patient/Profile.js`

**Đến:**
- `src/features/patient/pages/PatientDashboardPage.jsx`
- `src/features/patient/pages/PatientProfilePage.jsx`

**Lý do:**
- Theo tài liệu, có thể ở `features/patient/pages/`
- Tập trung patient features vào features/patient/

**Files cần update:**
- `src/App.js` (dòng 35, 39): Update imports

**Khuyến nghị:** ⚠️ **TÙY CHỌN** - Có thể giữ ở `pages/patient/` vì đã tổ chức tốt theo role

---

#### 2.3. Di chuyển Receptionist Pages (Tùy chọn)

**Từ:**
- `src/pages/receptionist/Dashboard.js`
- `src/pages/receptionist/CheckIn.js`
- `src/pages/receptionist/CreatePatient.js`

**Đến:**
- `src/features/reception/pages/ReceptionistDashboardPage.jsx`
- `src/features/reception/pages/ReceptionistCheckInPage.jsx`
- `src/features/reception/pages/ReceptionistCreatePatientPage.jsx`

**Lý do:**
- Theo tài liệu, có thể ở `features/reception/pages/`
- Tập trung reception features vào features/reception/

**Files cần update:**
- `src/App.js` (dòng 43-45): Update imports

**Khuyến nghị:** ⚠️ **TÙY CHỌN** - Có thể giữ ở `pages/receptionist/` vì đã tổ chức tốt theo role

---

### ❌ KHÔNG NÊN DI CHUYỂN

1. **`pages/auth/*`** → Không nên di chuyển vào `features/auth/`
   - Lý do: Đã tổ chức tốt ở `pages/auth/`, không cần duplicate

2. **`pages/<role>/Dashboard.js`** → Không nên di chuyển vào `features/dashboards/`
   - Lý do: Đã tổ chức tốt theo role, không cần duplicate

3. **`pages/admin/Reports.js`** → Không nên di chuyển vào `features/reports/`
   - Lý do: Đã tổ chức tốt ở `pages/admin/`, không cần duplicate

---

## 📝 KẾ HOẠCH THỰC HIỆN

### Bước 1: Di chuyển Results.js
```bash
# Di chuyển file
mv src/pages/shared/Results.js src/features/lab-results/pages/ResultsDashboardPage.jsx

# Update imports trong file
# - ../../services/ → ../../../services/
# - ../../shared/ → ../../../shared/
# - ../../utils/ → ../../../utils/

# Update import trong App.js
# import Results from './pages/shared/Results'
# → import Results from './features/lab-results/pages/ResultsDashboardPage'
```

### Bước 2: Di chuyển SampleManagement.js
```bash
# Di chuyển file
mv src/pages/shared/SampleManagement.js src/features/lab-results/pages/SampleManagementPage.jsx

# Update imports trong file
# - ../../services/ → ../../../services/
# - ../../shared/ → ../../../shared/
# - ../../utils/ → ../../../utils/

# Update import trong App.js
# import SampleManagement from './pages/shared/SampleManagement'
# → import SampleManagement from './features/lab-results/pages/SampleManagementPage'
```

### Bước 3: Di chuyển roleUtils.js
```bash
# Di chuyển file
mv src/utils/roleUtils.js src/features/users/utils/roleUtils.js

# Update imports trong 3 files:
# 1. src/features/reception/components/Receptionist/ReceptionistPatientCreate.js
# 2. src/shared/contexts/AuthContext.js
# 3. src/services/roleService.js
```

---

## ⚠️ LƯU Ý QUAN TRỌNG

1. **Sau khi di chuyển, cần update tất cả relative imports trong file:**
   - `../../services/` → `../../../services/`
   - `../../shared/` → `../../../shared/`
   - `../../utils/` → `../../../utils/` (nếu có)

2. **Kiểm tra lại imports sau khi di chuyển:**
   - Chạy linter để kiểm tra lỗi
   - Test lại các chức năng liên quan

3. **Backup trước khi di chuyển:**
   - Commit code hiện tại
   - Hoặc tạo branch mới

---

## ✅ KẾT QUẢ MONG ĐỢI

Sau khi hoàn thành Phase 1:
- ✅ `features/lab-results/pages/` sẽ có đầy đủ 3 pages (ResultEntryPage, ResultsDashboardPage, SampleManagementPage)
- ✅ `features/users/utils/` sẽ có roleUtils.js
- ✅ Cấu trúc features/ sẽ khớp 100% với tài liệu (trừ optional items)
- ✅ Không có lỗi imports
- ✅ Tất cả chức năng hoạt động bình thường

---

**Người tạo:** AI Assistant  
**Ngày:** 2024-12-22

