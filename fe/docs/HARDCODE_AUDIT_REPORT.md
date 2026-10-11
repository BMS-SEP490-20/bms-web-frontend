# 🔍 BÁO CÁO KIỂM TRA HARDCODE - CHUẨN BỊ DEPLOY VERCEL

**Ngày tạo:** 2025-01-27  
**Mục đích:** Kiểm tra tất cả các giá trị hardcode trong FE để tránh lỗi khi deploy lên Vercel

---

## 📊 TỔNG QUAN

Sau khi kiểm tra toàn bộ codebase FE, đã phát hiện các vấn đề hardcode sau:

### 📈 Thống Kê

- **Tổng số endpoints hardcoded `/gateway/`**: **433 matches** trong **24 files**
- **API Base URL hardcoded**: 1 file (`api.js`)
- **Hardcoded localhost checks**: 1 file (camera component)
- **Hardcoded timeout values**: Nhiều files
- **Hardcoded endpoint paths trong interceptor**: 4 endpoints

---

## 🚨 CÁC VẤN ĐỀ NGHIÊM TRỌNG

### 1. ⚠️ API Base URL Hardcoded (QUAN TRỌNG NHẤT)

**File:** `fe/src/services/api.js`  
**Dòng:** 16

```javascript
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'https://localhost:7000';
```

**Vấn đề:**
- Hardcoded fallback là `https://localhost:7000` - sẽ không hoạt động trên Vercel production
- Không có `/gateway` trong base URL (theo comment trong code, các service sẽ tự thêm `/gateway`)

**✅ Giải pháp:**
1. **Bắt buộc phải set environment variable trong Vercel:**
   - Variable: `REACT_APP_API_BASE_URL`
   - Value (production): URL của API Gateway production (ví dụ: `https://api.yourdomain.com/gateway`)

2. **Hoặc sửa code để có fallback tốt hơn:**
   ```javascript
   const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 
     (process.env.NODE_ENV === 'production' 
       ? 'https://api.yourdomain.com/gateway'  // Production URL
       : 'https://localhost:7000/gateway');     // Development URL
   ```

**⚠️ Lưu ý:** Nếu không set environment variable, app sẽ không thể kết nối API khi deploy!

---

### 2. ⚠️ 433 Endpoints Hardcoded `/gateway/` Prefix

**Phân bố theo files:**

| File | Số lượng `/gateway/` |
|------|---------------------|
| `testOrderService.js` | 97 |
| `patientService.js` | 54 |
| `labTestService.js` | 48 |
| `sampleService.js` | 39 |
| `warehouseService.js` | 34 |
| `appointmentService.js` | 23 |
| `authService.js` | 20 |
| `doctorService.js` | 20 |
| `vnpayService.js` | 16 |
| `shiftService.js` | 14 |
| `invoiceService.js` | 11 |
| `userManagementService.js` | 8 |
| `medicalService.js` | 7 |
| `roleService.js` | 4 |
| `adminDataPrefetchService.js` | 2 |
| `api.js` (interceptor) | 2 |
| Các component files | ~25 |

**Vấn đề:**
- Tất cả endpoints đều hardcode `/gateway/` prefix
- Nếu base URL đã có `/gateway`, sẽ bị duplicate: `/gateway/gateway/...`
- Nếu base URL không có `/gateway`, sẽ cần giữ nguyên

**✅ Giải pháp:**

**Option 1: Base URL có `/gateway`, xóa prefix trong endpoints (KHUYẾN NGHỊ)**

Sửa `api.js`:
```javascript
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'https://localhost:7000/gateway';
```

Sau đó xóa tất cả `/gateway/` prefix trong các service files:
- Thay `/gateway/iam/auth/login` → `/iam/auth/login`
- Thay `/gateway/patients` → `/patients`
- v.v.

**Option 2: Base URL không có `/gateway`, giữ nguyên prefix**

Sửa `api.js`:
```javascript
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'https://localhost:7000';
```

Giữ nguyên tất cả `/gateway/` prefix trong endpoints.

**⚠️ Lưu ý:** Hiện tại code đang dùng Option 2 (base URL không có `/gateway`), nên cần đảm bảo base URL production cũng không có `/gateway` nếu giữ nguyên code.

---

### 3. ⚠️ Hardcoded Endpoint Paths Trong API Interceptor

**File:** `fe/src/services/api.js`  
**Dòng:** 67-72

```javascript
const skipLogoutEndpoints = [
  '/gateway/admin/accounts', // Admin-only endpoint, service handles 401
  '/gateway/admin/users',     // Admin-only endpoint
  '/roles',                   // May not be available
  '/rolePermissions'          // May not be available
];
```

**Vấn đề:**
- Hardcoded endpoint paths
- Nếu đổi cấu trúc endpoints, cần sửa cả interceptor

**✅ Giải pháp:**
- Nếu dùng Option 1 (base URL có `/gateway`), xóa `/gateway/` prefix:
  ```javascript
  const skipLogoutEndpoints = [
    '/admin/accounts',
    '/admin/users',
    '/roles',
    '/rolePermissions'
  ];
  ```
- Hoặc giữ nguyên nếu dùng Option 2

---

### 4. ⚠️ Hardcoded Localhost Checks (Camera Component)

**File:** `fe/src/features/reception/components/QuickCheckInScan/QuickCheckInScan.js`  
**Dòng:** 305-313

```javascript
const isSecureContext = window.isSecureContext || 
  window.location.protocol === 'https:' || 
  window.location.hostname === 'localhost' || 
  window.location.hostname === '127.0.0.1';

if (!isSecureContext) {
  setCameraError('not_supported');
  showError('❌ Camera chỉ hoạt động trên HTTPS hoặc localhost. Vui lòng truy cập qua HTTPS hoặc localhost.');
  return;
}
```

**Vấn đề:**
- Check hardcoded `localhost` và `127.0.0.1`
- Trên Vercel production, domain sẽ khác, nhưng code này vẫn OK vì check `https:` protocol

**✅ Giải pháp:**
- Code này đã OK vì check `https:` protocol trước
- Vercel tự động deploy với HTTPS, nên camera sẽ hoạt động bình thường
- Có thể cải thiện bằng cách:
  ```javascript
  const isSecureContext = window.isSecureContext || 
    window.location.protocol === 'https:';
  
  // Allow localhost for development
  const isLocalhost = window.location.hostname === 'localhost' || 
    window.location.hostname === '127.0.0.1';
  
  if (!isSecureContext && !isLocalhost) {
    setCameraError('not_supported');
    showError('❌ Camera chỉ hoạt động trên HTTPS hoặc localhost.');
    return;
  }
  ```

---

### 5. ⚠️ Hardcoded Timeout Values

**File:** `fe/src/services/api.js`  
**Dòng:** 28

```javascript
timeout: 30000, // 30 seconds timeout
```

**Vấn đề:**
- Hardcoded timeout 30 giây
- Có thể không phù hợp với production (có thể cần timeout ngắn hơn hoặc dài hơn)

**✅ Giải pháp:**
- Có thể dùng environment variable:
  ```javascript
  timeout: Number(process.env.REACT_APP_API_TIMEOUT) || 30000,
  ```
- Hoặc giữ nguyên nếu 30 giây phù hợp

**Các timeout khác:**
- `ReceptionistPatientCreate.js`: 30000ms
- `QuickCheckInScan.js`: 3000ms (retry delay)
- Các delay trong retry logic

---

## 📋 CÁC FILE CẦN KIỂM TRA VÀ SỬA

### 🔴 Priority 1 - PHẢI SỬA TRƯỚC KHI DEPLOY

1. **`fe/src/services/api.js`**
   - ✅ Set environment variable `REACT_APP_API_BASE_URL` trong Vercel
   - ⚠️ Quyết định: Option 1 hay Option 2 cho `/gateway` prefix

2. **Tất cả service files trong `fe/src/services/`** (nếu chọn Option 1)
   - Cần xóa `/gateway/` prefix trong tất cả endpoints

### 🟡 Priority 2 - NÊN SỬA

3. **`fe/src/services/api.js` (interceptor)**
   - Sửa `skipLogoutEndpoints` array nếu cần

4. **`fe/src/features/reception/components/QuickCheckInScan/QuickCheckInScan.js`**
   - Cải thiện logic check secure context (optional)

### 🟢 Priority 3 - CÓ THỂ GIỮ NGUYÊN

5. **Hardcoded timeout values**
   - Có thể giữ nguyên hoặc dùng environment variables

---

## ✅ CHECKLIST TRƯỚC KHI DEPLOY VERCEL

### Bước 1: Chuẩn bị Environment Variables

- [ ] **Bắt buộc:** Set `REACT_APP_API_BASE_URL` trong Vercel
  - Development: `https://localhost:7000/gateway` (hoặc URL dev khác)
  - Production: `https://api.yourdomain.com/gateway` (hoặc URL production)

- [ ] **Tùy chọn:** Set các environment variables khác nếu cần:
  - `REACT_APP_API_TIMEOUT` (nếu muốn config timeout)

### Bước 2: Quyết định Cấu Trúc API Base URL

**Option A: Base URL có `/gateway` (KHUYẾN NGHỊ)**
- [ ] Sửa `api.js`: Base URL = `.../gateway`
- [ ] Xóa tất cả `/gateway/` prefix trong service files (433 endpoints)
- [ ] Sửa interceptor endpoints

**Option B: Base URL không có `/gateway`**
- [ ] Đảm bảo base URL production không có `/gateway`
- [ ] Giữ nguyên tất cả `/gateway/` prefix trong code

### Bước 3: Test Local với Environment Variables

- [ ] Tạo file `.env.local`:
  ```env
  REACT_APP_API_BASE_URL=https://your-api-url.com/gateway
  ```
- [ ] Test tất cả chức năng: login, API calls, etc.
- [ ] Verify không có lỗi duplicate `/gateway/gateway/`

### Bước 4: Deploy lên Vercel

- [ ] Set environment variables trong Vercel dashboard
- [ ] Deploy và check logs
- [ ] Test production app
- [ ] Verify API calls hoạt động đúng

---

## 🔧 HƯỚNG DẪN SET ENVIRONMENT VARIABLES TRONG VERCEL

### Cách 1: Qua Vercel Dashboard

1. Vào project trên Vercel
2. Settings → Environment Variables
3. Add variable:
   - **Name:** `REACT_APP_API_BASE_URL`
   - **Value:** `https://api.yourdomain.com/gateway`
   - **Environment:** Production, Preview, Development (chọn tùy nhu cầu)
4. Save và Redeploy

### Cách 2: Qua Vercel CLI

```bash
vercel env add REACT_APP_API_BASE_URL
# Enter value: https://api.yourdomain.com/gateway
# Select environments: Production, Preview, Development
```

### Cách 3: Qua `vercel.json`

```json
{
  "env": {
    "REACT_APP_API_BASE_URL": "https://api.yourdomain.com/gateway"
  }
}
```

---

## 📝 TÓM TẮT CÁC VẤN ĐỀ

| # | Vấn đề | Mức độ | Số lượng | Action Required |
|---|--------|--------|----------|----------------|
| 1 | API Base URL hardcoded | 🔴 Critical | 1 | Set env var hoặc sửa code |
| 2 | Endpoints hardcoded `/gateway/` | 🔴 Critical | 433 | Quyết định Option 1/2 |
| 3 | Interceptor endpoints hardcoded | 🟡 Medium | 4 | Sửa nếu dùng Option 1 |
| 4 | Localhost checks | 🟢 Low | 1 | Đã OK, có thể cải thiện |
| 5 | Timeout values hardcoded | 🟢 Low | Multiple | Có thể giữ nguyên |

---

## 🎯 KHUYẾN NGHỊ

1. **BẮT BUỘC:** Set `REACT_APP_API_BASE_URL` trong Vercel trước khi deploy
2. **NÊN:** Chọn Option 1 (base URL có `/gateway`, xóa prefix trong code) để code sạch hơn
3. **CÓ THỂ:** Tạo script để tự động xóa `/gateway/` prefix nếu chọn Option 1

---

## 📞 LIÊN HỆ VÀ HỖ TRỢ

Nếu gặp vấn đề khi deploy, kiểm tra:
1. Environment variables đã được set chưa
2. API Gateway URL có đúng không
3. CORS đã được config cho domain Vercel chưa
4. Check Vercel build logs để xem lỗi cụ thể

---

**Generated by:** Hardcode Audit Tool  
**Last Updated:** 2025-01-27

