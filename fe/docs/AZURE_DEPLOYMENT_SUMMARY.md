# 📋 TÓM TẮT: FE CẦN BIẾT GÌ KHI BACKEND DEPLOY AZURE

## 🎯 NHỮNG ĐIỀU QUAN TRỌNG NHẤT

### ✅ FE Chỉ Cần Biết 1 URL

**API Gateway URL** - Đây là entry point duy nhất mà FE cần:

```
https://your-api-gateway.azurewebsites.net/gateway
```

**HOẶC** nếu có custom domain:
```
https://api.yourdomain.com/gateway
```

### ✅ Endpoints KHÔNG ĐỔI

Tất cả endpoints vẫn giữ nguyên format:
- `/gateway/iam/auth/login`
- `/gateway/patients`
- `/gateway/testorder/appointment`
- `/gateway/Vnpay/CreatePaymentUrl`
- v.v.

**Lý do:** API Gateway xử lý routing, FE không cần biết URL của từng microservice.

---

## 🔧 CẦN LÀM GÌ

### 1. Sửa API Base URL (BẮT BUỘC)

**File:** `fe/src/services/api.js`

**Từ:**
```javascript
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'https://localhost:7000';
```

**Thành:**
```javascript
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;
// Không có fallback hardcoded
```

### 2. Set Environment Variable trong Vercel

**Tên:** `REACT_APP_API_BASE_URL`  
**Giá trị:** URL của API Gateway trên Azure

Ví dụ:
```
https://your-api-gateway.azurewebsites.net/gateway
```

### 3. Backend Phải Config CORS

**Team Backend cần làm:**

Sửa file `be/api-gateway/Program.cs` để cho phép domain Vercel:

```csharp
policy.WithOrigins(
    "http://localhost:3000",
    "https://localhost:3000",
    "https://your-frontend.vercel.app",  // Vercel URL
    "https://yourdomain.com"             // Custom domain (nếu có)
)
```

---

## ❌ NHỮNG GÌ FE KHÔNG CẦN LO

- ❌ URL của từng microservice (IAM, Patient, TestOrder, etc.)
- ❌ Service discovery (API Gateway xử lý)
- ❌ Load balancing (Azure xử lý)
- ❌ SSL certificates (Azure tự động)
- ❌ Health checks của services (Backend tự xử lý)

---

## 📊 KIẾN TRÚC MICROSERVICES (Để Hiểu)

```
Frontend (Vercel)
    ↓
API Gateway (Azure) ← FE chỉ kết nối đây
    ↓
┌──────────┬──────────┬──────────┬──────────┐
│   IAM    │ Patient  │ TestOrder│ Payment  │
│ Service  │ Service  │ Service  │ Service  │
└──────────┴──────────┴──────────┴──────────┘
```

**FE chỉ cần biết API Gateway**, không cần biết các services bên trong.

---

## ✅ CHECKLIST ĐƠN GIẢN

- [ ] Nhận **API Gateway URL** từ team Backend
- [ ] Set `REACT_APP_API_BASE_URL` trong Vercel
- [ ] Sửa `api.js` để xóa hardcode localhost
- [ ] Xác nhận Backend đã config CORS cho Vercel domain
- [ ] Test production app

---

## 🔍 KHI GẶP VẤN ĐỀ

### Lỗi CORS
→ Backend chưa config CORS cho domain Vercel

### Lỗi 404
→ Check API Gateway URL có đúng không (có `/gateway`?)

### Lỗi 401
→ Token không hợp lệ, check localStorage

### Network Error
→ API Gateway có đang chạy không? URL đúng chưa?

---

## 📞 LIÊN HỆ

Khi gặp vấn đề, check:
1. Environment variable đã set chưa?
2. Backend CORS đã config chưa?
3. API Gateway có đang chạy không?

---

## 🎯 TÓM LẠI

**FE chỉ cần:**
1. ✅ 1 URL: API Gateway URL
2. ✅ 1 env var: `REACT_APP_API_BASE_URL`
3. ✅ Endpoints giữ nguyên format

**Xem chi tiết:** `AZURE_DEPLOYMENT_FE_GUIDE.md`

