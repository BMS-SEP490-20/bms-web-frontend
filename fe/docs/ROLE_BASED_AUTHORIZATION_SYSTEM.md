# Hệ Thống Phân Quyền Theo Role ID

## 📋 Tổng Quan

Hệ thống đã được nâng cấp để sử dụng **Role ID** (số) thay vì chỉ sử dụng role string, giúp quản lý phân quyền hiệu quả và dễ dàng mở rộng hơn.

## 🗂️ Cấu Trúc Roles

### Bảng Roles trong Database

| RoleId | RoleName | Key | Mô tả |
|--------|----------|-----|-------|
| 1 | Admin | `admin` | Toàn quyền quản trị hệ thống |
| 2 | Manager | `manager` | Quản lý kho và ca làm việc, giám sát hệ thống |
| 3 | Doctor | `doctor` | Người dùng hệ thống |
| 4 | Labuser | `lab_user` | Người dùng hệ thống |
| 5 | Patient | `patient` | Người dùng hệ thống |
| 6 | Receptionist | `receptionist` | Lễ tân - Check-in bệnh nhân và tạo hồ sơ |

## 🔧 Cấu Trúc Dữ Liệu

### Users Table

Users giờ có cả `role` (string) và `roleId` (number) để đảm bảo backward compatibility:

```json
{
  "id": 1,
  "email": "admin@lab.com",
  "username": "admin",
  "password": "123456",
  "role": "admin",        // Backward compatible
  "roleId": 1,            // New: Role ID
  "fullName": "Quản trị viên",
  "phone": "0123456789",
  "isActive": true,
  "createdAt": "2024-01-01T00:00:00.000Z"
}
```

### Roles Table

```json
{
  "id": 1,
  "roleId": 1,
  "roleName": "Admin",
  "description": "Toàn quyền quản trị hệ thống",
  "key": "admin"
}
```

## 🛠️ Utilities và Helpers

### `src/utils/roleUtils.js`

File này chứa các helper functions để làm việc với roles:

#### Các Functions Chính:

1. **`getRoleById(roleId)`** - Lấy thông tin role theo ID
2. **`getRoleByKey(roleKey)`** - Lấy thông tin role theo key (string)
3. **`getRoleIdFromKey(roleKey)`** - Convert role key → roleId
4. **`getRoleKeyFromId(roleId)`** - Convert roleId → role key
5. **`hasRole(userRole, requiredRole)`** - Kiểm tra user có role cần thiết không
6. **`normalizeRoleToId(userRole)`** - Normalize role thành roleId
7. **`normalizeRoleToKey(userRole)`** - Normalize role thành role key
8. **`getRoleDisplayName(userRole)`** - Lấy tên hiển thị của role

#### Ví dụ sử dụng:

```javascript
import { getRoleById, hasRole, normalizeRoleToId } from '../utils/roleUtils';

// Lấy thông tin role
const role = getRoleById(1); // { roleId: 1, roleName: 'Admin', ... }

// Kiểm tra quyền
const user = { roleId: 1, role: 'admin' };
hasRole(user, 1); // true
hasRole(user, [1, 2]); // true (admin hoặc manager)
hasRole(user, 'admin'); // true (hỗ trợ cả string)

// Normalize
normalizeRoleToId(user); // 1
normalizeRoleToId('admin'); // 1
```

## 🔐 Authentication Context

### `src/contexts/AuthContext.js`

AuthContext đã được cập nhật để hỗ trợ cả roleId và role string:

```javascript
const { 
  user,           // User object (có cả role và roleId)
  userRole,       // Role string (backward compatible)
  userRoleId,     // Role ID (number) - NEW
  userRoleName,   // Role display name - NEW
  hasRole         // Helper function - NEW
} = useAuth();
```

#### Ví dụ sử dụng:

```javascript
import { useAuth } from '../contexts/AuthContext';

const MyComponent = () => {
  const { userRoleId, userRole, hasRole } = useAuth();
  
  // Kiểm tra quyền
  if (hasRole([1, 2])) { // Admin hoặc Manager
    // Do something
  }
  
  // Hoặc sử dụng roleId trực tiếp
  if (userRoleId === 1) { // Admin
    // Do something
  }
};
```

## 🛡️ Protected Routes

### `src/App.js`

ProtectedRoute hỗ trợ cả `allowedRoles` (array of strings) và `allowedRoleIds` (array of numbers):

```javascript
// Sử dụng role strings (backward compatible)
<ProtectedRoute allowedRoles={['admin', 'manager']}>
  <Component />
</ProtectedRoute>

// Hoặc sử dụng role IDs (recommended)
<ProtectedRoute allowedRoleIds={[1, 2]}>
  <Component />
</ProtectedRoute>
```

### Route Examples:

```javascript
// Admin only
<ProtectedRoute allowedRoleIds={[1]}>
  <AdminDashboard />
</ProtectedRoute>

// Manager and Admin
<ProtectedRoute allowedRoleIds={[1, 2]}>
  <ManagerDashboard />
</ProtectedRoute>

// Doctor only
<ProtectedRoute allowedRoleIds={[3]}>
  <DoctorDashboard />
</ProtectedRoute>

// Receptionist only
<ProtectedRoute allowedRoleIds={[6]}>
  <ReceptionistDashboard />
</ProtectedRoute>
```

## 🎯 Các Components Đã Được Cập Nhật

### 1. **AuthContext** (`src/contexts/AuthContext.js`)
   - ✅ Hỗ trợ `userRoleId`, `userRoleName`, `hasRole`
   - ✅ Backward compatible với `userRole` (string)

### 2. **ProtectedRoute** (`src/App.js`)
   - ✅ Hỗ trợ `allowedRoleIds` (array of numbers)
   - ✅ Vẫn hỗ trợ `allowedRoles` (array of strings)
   - ✅ Redirect dựa trên roleId

### 3. **Sidebar** (`src/components/Layout/Sidebar.js`)
   - ✅ Sử dụng `userRoleId` để xác định dashboard path
   - ✅ Filter menu items dựa trên `hasRole`

### 4. **AdminHeader** (`src/components/Layout/AdminHeader.js`)
   - ✅ Hiển thị role name từ `userRoleName`
   - ✅ Badge color dựa trên `userRoleId`

### 5. **ReceptionistPatientCreate** (`src/components/Receptionist/ReceptionistPatientCreate.js`)
   - ✅ Tự động set `roleId` khi tạo user account

## 📝 Services

### `src/services/roleService.js`

Đã được cập nhật để hỗ trợ roles:

```javascript
// Lấy tất cả roles
const roles = await roleService.getAllRoles();

// Lấy role theo ID
const role = await roleService.getRoleById(1);
```

## ✅ Backward Compatibility

Hệ thống hoàn toàn backward compatible:

1. **Users** vẫn có field `role` (string) bên cạnh `roleId` (number)
2. **ProtectedRoute** vẫn hỗ trợ `allowedRoles` (array of strings)
3. **AuthContext** vẫn cung cấp `userRole` (string)
4. **Components** có thể sử dụng cả roleId và role string

## 🔄 Migration

Tất cả users trong database đã được tự động cập nhật với `roleId`:

- `admin` → `roleId: 1`
- `manager` → `roleId: 2`
- `doctor` → `roleId: 3`
- `lab_user` → `roleId: 4`
- `patient` → `roleId: 5`
- `receptionist` → `roleId: 6`

## 🚀 Best Practices

### 1. Sử dụng Role ID cho logic mới

```javascript
// ✅ Recommended
if (userRoleId === 1) { // Admin
  // Do something
}

// ⚠️ Still works but less reliable
if (userRole === 'admin') {
  // Do something
}
```

### 2. Sử dụng `hasRole` helper

```javascript
// ✅ Recommended
if (hasRole([1, 2])) { // Admin or Manager
  // Do something
}

// ⚠️ More verbose
if (userRoleId === 1 || userRoleId === 2) {
  // Do something
}
```

### 3. Sử dụng `allowedRoleIds` trong ProtectedRoute

```javascript
// ✅ Recommended
<ProtectedRoute allowedRoleIds={[1, 2]}>
  <Component />
</ProtectedRoute>

// ⚠️ Still works
<ProtectedRoute allowedRoles={['admin', 'manager']}>
  <Component />
</ProtectedRoute>
```

## 📊 Role Matrix

| Route | Admin (1) | Manager (2) | Doctor (3) | Lab User (4) | Patient (5) | Receptionist (6) |
|-------|-----------|-------------|------------|--------------|-------------|------------------|
| `/admin-dashboard` | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `/manager-dashboard` | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| `/doctor-dashboard` | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ |
| `/lab-user-dashboard` | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ |
| `/patient-dashboard` | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ |
| `/receptionist-dashboard` | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| `/user-management` | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `/patients` | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| `/appointments` | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| `/receptionist/check-in` | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| `/receptionist/create-patient` | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |

## 🎉 Kết Luận

Hệ thống phân quyền đã được nâng cấp thành công với:
- ✅ Hỗ trợ Role ID (number) và Role Key (string)
- ✅ Backward compatible hoàn toàn
- ✅ Dễ dàng mở rộng và bảo trì
- ✅ Helper functions tiện lợi
- ✅ Tự động migration users

Hệ thống sẵn sàng cho production! 🚀

