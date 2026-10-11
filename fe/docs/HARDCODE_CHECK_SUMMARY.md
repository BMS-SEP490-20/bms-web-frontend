# 📋 TÓM TẮT KIỂM TRA HARDCODE - DEPLOY VERCEL

## 🔍 KẾT QUẢ KIỂM TRA

Đã kiểm tra toàn bộ codebase FE và phát hiện các vấn đề sau:

### 📊 Thống Kê

- **433 endpoints** hardcoded với prefix `/gateway/` trong **24 files**
- **1 API Base URL** hardcoded (có fallback environment variable)
- **4 endpoint paths** hardcoded trong API interceptor
- **1 localhost check** trong camera component (nhưng đã OK)

---

## 🚨 VẤN ĐỀ NGHIÊM TRỌNG CẦN SỬA

### 1. ⚠️ API Base URL Hardcoded (QUAN TRỌNG NHẤT)

**File:** `fe/src/services/api.js` (dòng 16)

```javascript
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'https://localhost:7000';
```

**Vấn đề:**
- Fallback hardcoded là `localhost:7000` → sẽ lỗi trên production
- Thiếu `/gateway` trong base URL

**✅ CẦN LÀM NGAY:**
1. **Set environment variable trong Vercel:**
   - Tên: `REACT_APP_API_BASE_URL`
   - Giá trị: URL API Gateway production (ví dụ: `https://api.yourdomain.com/gateway`)

2. **Hoặc sửa code:**
   ```javascript
   const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 
     (process.env.NODE_ENV === 'production' 
       ? 'https://api.yourdomain.com/gateway'
       : 'https://localhost:7000/gateway');
   ```

---

### 2. ⚠️ 433 Endpoints Hardcoded `/gateway/` Prefix

**Top files có nhiều hardcode nhất:**
- `testOrderService.js`: 97 endpoints
- `patientService.js`: 54 endpoints
- `labTestService.js`: 48 endpoints
- `sampleService.js`: 39 endpoints
- `warehouseService.js`: 34 endpoints

**Vấn đề:**
- Tất cả endpoints đều có prefix `/gateway/`
- Nếu base URL đã có `/gateway` → sẽ bị duplicate: `/gateway/gateway/...`

**✅ CẦN QUYẾT ĐỊNH:**

**Option 1: Base URL có `/gateway` (KHUYẾN NGHỊ)**
- Base URL = `.../gateway`
- Xóa tất cả `/gateway/` prefix trong code (433 chỗ)
- Code sẽ sạch hơn

**Option 2: Base URL không có `/gateway`**
- Base URL = `...` (không có `/gateway`)
- Giữ nguyên tất cả `/gateway/` prefix trong code
- Ít phải sửa code hơn

---

## ✅ CHECKLIST TRƯỚC KHI DEPLOY

### Bước 1: Environment Variables (BẮT BUỘC)

- [ ] Set `REACT_APP_API_BASE_URL` trong Vercel:
  - Production: `https://api.yourdomain.com/gateway`
  - Preview: URL preview environment
  - Development: `https://localhost:7000/gateway` (nếu cần)

### Bước 2: Quyết định Cấu Trúc URL

- [ ] Chọn Option 1 hoặc Option 2 (xem trên)
- [ ] Nếu chọn Option 1: Sửa code để xóa `/gateway/` prefix
- [ ] Nếu chọn Option 2: Đảm bảo base URL không có `/gateway`

### Bước 3: Test Local

- [ ] Tạo `.env.local` với `REACT_APP_API_BASE_URL`
- [ ] Test login, API calls
- [ ] Verify không có lỗi duplicate `/gateway/gateway/`

### Bước 4: Deploy

- [ ] Set env vars trong Vercel
- [ ] Deploy và check logs
- [ ] Test production app
- [ ] Verify API hoạt động đúng

---

## 📝 CÁCH SET ENVIRONMENT VARIABLE TRONG VERCEL

### Qua Dashboard:
1. Vào project trên Vercel
2. Settings → Environment Variables
3. Add:
   - **Name:** `REACT_APP_API_BASE_URL`
   - **Value:** `https://api.yourdomain.com/gateway`
   - **Environment:** Production, Preview, Development
4. Save và Redeploy

### Qua CLI:
```bash
vercel env add REACT_APP_API_BASE_URL
# Nhập giá trị khi được hỏi
# Chọn environments cần apply
```

---

## 🎯 KHUYẾN NGHỊ

1. **BẮT BUỘC:** Set `REACT_APP_API_BASE_URL` trong Vercel
2. **NÊN:** Chọn Option 1 (code sạch hơn)
3. **NÊN:** Test kỹ trước khi deploy production

---

## 📚 XEM CHI TIẾT

Xem file `HARDCODE_AUDIT_REPORT.md` để có báo cáo đầy đủ với:
- Danh sách tất cả files cần sửa
- Code examples
- Hướng dẫn chi tiết từng bước

---

**Tóm lại:** Chỉ cần set environment variable `REACT_APP_API_BASE_URL` trong Vercel là có thể deploy được. Các hardcode khác không ảnh hưởng nghiêm trọng nếu base URL được config đúng.

