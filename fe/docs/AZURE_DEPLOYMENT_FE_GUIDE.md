# 🌐 HƯỚNG DẪN FRONTEND KHI BACKEND DEPLOY LÊN AZURE (Microservices)

**Ngày tạo:** 2025-01-27  
**Mục đích:** Hướng dẫn những gì FE cần biết và chuẩn bị khi Backend deploy lên Azure

---

## 📋 MỤC LỤC

1. [Tổng Quan Kiến Trúc](#tổng-quan-kiến-trúc)
2. [Những Điều FE Cần Biết](#những-điều-fe-cần-biết)
3. [Cấu Hình Cần Thay Đổi](#cấu-hình-cần-thay-đổi)
4. [Environment Variables](#environment-variables)
5. [CORS Configuration](#cors-configuration)
6. [Azure-Specific Considerations](#azure-specific-considerations)
7. [Checklist Trước Khi Deploy](#checklist-trước-khi-deploy)

---

## 🏗️ TỔNG QUAN KIẾN TRÚC

### Kiến Trúc Backend (Microservices)

```
┌─────────────────────────────────────────────────────────┐
│                  Frontend (React)                        │
│              (Deploy trên Vercel)                        │
└─────────────────────┬───────────────────────────────────┘
                      │
                      │ HTTPS Requests
                      │
┌─────────────────────▼───────────────────────────────────┐
│              API Gateway (Ocelot)                        │
│         Port: 7000 (Production: Azure URL)              │
│         Entry Point: /gateway/*                         │
└──────┬────────────┬────────────┬─────────────┬──────────┘
       │            │            │             │
       │            │            │             │
┌──────▼─────┐ ┌───▼──────┐ ┌───▼──────┐ ┌───▼──────────┐
│IAM Service │ │ Patient  │ │TestOrder │ │ Payment     │
│Port: 7020  │ │ Service  │ │ Service  │ │ Service     │
│            │ │Port: 7263│ │Port: 7105│ │Port: 49700  │
└────────────┘ └──────────┘ └──────────┘ └─────────────┘
                                                          
                                              ┌───────────┐
                                              │Warehouse  │
                                              │Service    │
                                              │Port:53266 │
                                              └───────────┘
```

### Các Microservices

| Service | Port (Dev) | Chức Năng | URL Pattern trên Gateway |
|---------|-----------|-----------|-------------------------|
| **API Gateway** | 7000 | Entry point cho tất cả requests | `/gateway/*` |
| **IAM Service** | 7020 | Authentication, User Management | `/gateway/iam/*`, `/gateway/admin/*` |
| **Patient Service** | 7263 | Patient data, Medical Records | `/gateway/patients/*` |
| **TestOrder Service** | 7105 | Appointments, Doctors, Samples | `/gateway/testorder/*` |
| **Payment Service** | 49700 | Payments, VNPay | `/gateway/Vnpay/*`, `/gateway/payments/*` |
| **Warehouse Service** | 53266 | Equipment, Reagents | `/gateway/warehouse/*` |

---

## 🎯 NHỮNG ĐIỀU FE CẦN BIẾT

### 1. ✅ Điểm Tích Cực

**FE chỉ cần biết 1 URL duy nhất:**
- ✅ **API Gateway URL** (tất cả requests đi qua đây)
- ✅ **Không cần biết** URL của từng microservice riêng lẻ
- ✅ **Không cần thay đổi** endpoint paths (vẫn dùng `/gateway/...`)
- ✅ **Endpoints không đổi**, chỉ đổi base URL

### 2. ⚠️ Điểm Cần Lưu Ý

- ⚠️ **API Gateway URL sẽ khác** với localhost
- ⚠️ **CORS phải được config** trên Azure cho domain Vercel
- ⚠️ **HTTPS bắt buộc** trên production
- ⚠️ **Environment variables** phải được set trong Vercel

---

## 🔧 CẤU HÌNH CẦN THAY ĐỔI

### 1. API Base URL

**File:** `fe/src/services/api.js`

**Hiện tại (Development):**
```javascript
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'https://localhost:7000';
```

**Cần sửa thành:**
```javascript
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 
  (process.env.NODE_ENV === 'production' 
    ? 'https://your-api-gateway.azurewebsites.net/gateway'  // Azure URL
    : 'https://localhost:7000/gateway');                     // Local dev
```

**Hoặc đơn giản hơn (KHUYẾN NGHỊ):**
```javascript
// Chỉ dùng environment variable, không có fallback hardcoded
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;
```

**Lưu ý:** Phải có `/gateway` trong base URL vì tất cả endpoints đã có prefix `/gateway/`

---

### 2. Environment Variables trong Vercel

**Bắt buộc phải set:**

```env
REACT_APP_API_BASE_URL=https://your-api-gateway.azurewebsites.net/gateway
```

**Hoặc nếu dùng custom domain:**
```env
REACT_APP_API_BASE_URL=https://api.yourdomain.com/gateway
```

---

### 3. Endpoints KHÔNG CẦN THAY ĐỔI

✅ Tất cả endpoints giữ nguyên:
- `/gateway/iam/auth/login`
- `/gateway/patients`
- `/gateway/testorder/appointment`
- `/gateway/Vnpay/CreatePaymentUrl`
- v.v.

**Lý do:** API Gateway xử lý routing, FE chỉ cần gọi qua Gateway.

---

## 🌐 CORS CONFIGURATION

### Backend Cần Config CORS (Team Backend làm)

**File Backend:** `be/api-gateway/Program.cs`

**Hiện tại (chỉ cho localhost):**
```csharp
options.AddPolicy("AllowLocalhost3000",
    policy =>
    {
        policy.WithOrigins("http://localhost:3000", "https://localhost:3000")
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
```

**Backend cần sửa thành:**
```csharp
options.AddPolicy("AllowAllOrigins", // hoặc tên khác
    policy =>
    {
        policy.WithOrigins(
                "http://localhost:3000",
                "https://localhost:3000",
                "https://your-frontend.vercel.app",  // Vercel URL
                "https://yourdomain.com",            // Custom domain (nếu có)
                "https://www.yourdomain.com"         // www subdomain (nếu có)
            )
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
```

**Hoặc dùng Environment Variable (KHUYẾN NGHỊ):**
```csharp
var allowedOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>()
    ?? new[] { "http://localhost:3000", "https://localhost:3000" };

options.AddPolicy("AllowAllOrigins",
    policy =>
    {
        policy.WithOrigins(allowedOrigins)
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
```

**Config trong Azure App Service:**
```json
{
  "Cors": {
    "AllowedOrigins": [
      "https://your-frontend.vercel.app",
      "https://yourdomain.com"
    ]
  }
}
```

---

## ☁️ AZURE-SPECIFIC CONSIDERATIONS

### 1. API Gateway URL Format

**Các format URL có thể có trên Azure:**

1. **Azure App Service (Default):**
   ```
   https://your-api-gateway.azurewebsites.net/gateway
   ```

2. **Custom Domain:**
   ```
   https://api.yourdomain.com/gateway
   ```

3. **Azure Container Apps:**
   ```
   https://your-api-gateway.xxxxxxxx.azurecontainerapps.io/gateway
   ```

### 2. HTTPS Bắt Buộc

✅ Azure tự động cung cấp HTTPS
✅ SSL certificate tự động
✅ FE phải dùng HTTPS để gọi API

### 3. Authentication Flow (Không đổi)

✅ Vẫn dùng JWT token
✅ Login qua `/gateway/iam/auth/login`
✅ Token lưu trong localStorage
✅ Token tự động attach vào requests qua interceptor

**Code không cần thay đổi:**
```javascript
// api.js - Request interceptor (giữ nguyên)
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
```

### 4. Timeout & Retry

**Hiện tại:** 30 giây timeout
**Trên Azure:** Có thể cần điều chỉnh tùy vào network latency

**Có thể config:**
```javascript
timeout: Number(process.env.REACT_APP_API_TIMEOUT) || 30000,
```

### 5. Health Check Endpoints

Nếu backend có health check:
```
GET /gateway/health
```

FE có thể dùng để verify connection.

---

## ✅ CHECKLIST TRƯỚC KHI DEPLOY

### Bước 1: Chuẩn Bị Backend Info

- [ ] Nhận **API Gateway URL** từ team Backend:
  - [ ] Development: `https://dev-api.yourdomain.com/gateway`
  - [ ] Staging: `https://staging-api.yourdomain.com/gateway`
  - [ ] Production: `https://api.yourdomain.com/gateway`

- [ ] Xác nhận Backend đã config CORS cho domain Vercel
- [ ] Test API Gateway có hoạt động không (dùng Postman/browser)

### Bước 2: Cấu Hình Frontend

- [ ] Sửa `api.js` để dùng environment variable (xóa hardcode localhost)
- [ ] Set `REACT_APP_API_BASE_URL` trong Vercel:
  - [ ] Development environment
  - [ ] Preview environment
  - [ ] Production environment

### Bước 3: Test Local

- [ ] Tạo `.env.local`:
  ```env
  REACT_APP_API_BASE_URL=https://your-dev-api.azurewebsites.net/gateway
  ```
- [ ] Test login
- [ ] Test các API calls chính
- [ ] Verify không có lỗi CORS
- [ ] Verify không có duplicate `/gateway/gateway/`

### Bước 4: Deploy và Verify

- [ ] Deploy lên Vercel
- [ ] Check build logs (không có lỗi)
- [ ] Test production app:
  - [ ] Login
  - [ ] View data
  - [ ] Create/Update operations
  - [ ] Payment flow (nếu có)
- [ ] Check browser console (không có CORS errors)
- [ ] Check Network tab (requests thành công)

---

## 🔍 DEBUGGING GUIDE

### Lỗi CORS

**Triệu chứng:**
```
Access to fetch at 'https://api.yourdomain.com/gateway/...' 
from origin 'https://your-frontend.vercel.app' 
has been blocked by CORS policy
```

**Giải pháp:**
1. Verify Backend đã config CORS cho Vercel domain
2. Check CORS config trong Azure App Service settings
3. Verify API Gateway đang chạy đúng

### Lỗi 401 Unauthorized

**Triệu chứng:**
```
401 Unauthorized khi gọi API
```

**Giải pháp:**
1. Check token có trong localStorage không
2. Verify token format (Bearer token)
3. Check JWT secret key match giữa IAM service và API Gateway

### Lỗi 404 Not Found

**Triệu chứng:**
```
404 khi gọi endpoint
```

**Giải pháp:**
1. Verify base URL đúng (có `/gateway`?)
2. Check endpoint path đúng format
3. Verify API Gateway routing config (ocelot.json)

### Lỗi Network/Timeout

**Triệu chứng:**
```
Network Error hoặc timeout
```

**Giải pháp:**
1. Check API Gateway có đang chạy không
2. Verify URL đúng format
3. Check firewall/network settings
4. Tăng timeout nếu cần

---

## 📊 MONITORING & LOGGING

### Frontend Logging

**Có thể thêm để debug:**
```javascript
// api.js
api.interceptors.request.use((config) => {
  console.log('[API Request]', config.method?.toUpperCase(), config.url);
  return config;
});

api.interceptors.response.use(
  (response) => {
    console.log('[API Response]', response.status, response.config.url);
    return response;
  },
  (error) => {
    console.error('[API Error]', error.response?.status, error.config?.url, error.message);
    return Promise.reject(error);
  }
);
```

**Production:** Chỉ log errors, không log toàn bộ requests

### Vercel Analytics

✅ Có thể dùng Vercel Analytics để track errors
✅ Check function logs trong Vercel dashboard

---

## 🔐 SECURITY CONSIDERATIONS

### 1. Environment Variables

- ✅ **KHÔNG commit** `.env` files vào git
- ✅ Dùng Vercel environment variables
- ✅ Separate values cho dev/staging/production

### 2. HTTPS Only

- ✅ Azure tự động cung cấp HTTPS
- ✅ Vercel tự động cung cấp HTTPS
- ✅ Không dùng HTTP trên production

### 3. Token Security

- ✅ Token lưu trong localStorage (hiện tại OK)
- ✅ Token tự động clear khi logout
- ✅ Token attach vào mọi request qua interceptor

---

## 📞 LIÊN HỆ & HỖ TRỢ

### Khi Gặp Vấn Đề

1. **Check Backend:**
   - API Gateway có đang chạy?
   - CORS đã config đúng?
   - Services có healthy?

2. **Check Frontend:**
   - Environment variables đã set?
   - Base URL đúng format?
   - Network requests trong browser DevTools

3. **Check Azure:**
   - App Service logs
   - Health check endpoints
   - CORS configuration

---

## 🎯 TÓM TẮT

### Những Gì FE Cần Biết:

1. ✅ **Chỉ cần 1 URL:** API Gateway URL
2. ✅ **Endpoints không đổi:** Vẫn dùng `/gateway/...`
3. ✅ **Set environment variable:** `REACT_APP_API_BASE_URL`
4. ✅ **Backend phải config CORS** cho Vercel domain
5. ✅ **HTTPS bắt buộc** trên production

### Những Gì FE KHÔNG Cần Lo:

- ❌ URL của từng microservice riêng lẻ
- ❌ Service discovery (API Gateway xử lý)
- ❌ Load balancing (Azure xử lý)
- ❌ SSL certificates (Azure tự động)

---

**Generated by:** Azure Deployment Guide  
**Last Updated:** 2025-01-27

