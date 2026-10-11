# Endpoint Mapping: Mock JSON Server → Real Backend API

## 📋 Tổng Quan

Mapping từ endpoints của JSON Server (mock) sang endpoints thật của Backend qua API Gateway.

**Base URL:**
- ❌ Mock: `http://localhost:5001`
- ✅ Real: `https://localhost:7000/gateway`

---

## 🔐 Authentication (IAM Service)

| Mock Endpoint | Real Endpoint | Method | Auth Required |
|--------------|---------------|--------|---------------|
| `/users` (GET - login) | `/iam/auth/login` | POST | ❌ |
| `/users` (POST - register) | `/iam/auth/register` | POST | ❌ |
| `/users` (mock OTP) | `/iam/auth/otp/sendotp` | POST | ❌ |
| `/users` (mock verify) | `/iam/auth/otp/verify` | POST | ❌ |
| `/users` (GET all) | `/admin/accounts` | GET | ✅ |
| `/users/{id}` | `/admin/accounts/{id}` | GET/PUT/DELETE | ✅ |

---

## 👤 Patient Service

| Mock Endpoint | Real Endpoint | Method | Auth Required |
|--------------|---------------|--------|---------------|
| `/patients` | `/patients` | GET | ❌ |
| `/patients/{id}` | `/patients/{id}` | GET | ❌ |
| `/patients` (search) | `/patients/search?key={query}` | GET | ❌ |
| `/patients` (POST) | `/patients/register` | POST | ❌ |
| `/patients/{id}` | `/patients/{id}` | PUT/DELETE | ❌ |
| `/patients` (by email) | `/patients/email/{email}` | GET | ❌ |

**Sub-modules:**

| Mock Endpoint | Real Endpoint | Method |
|--------------|---------------|--------|
| `/medicalRecords` | `/patients/medical-records` | GET/POST |
| `/medicalRecords/{id}` | `/patients/medical-records/{id}` | GET/PUT/DELETE |
| `/labTests` (patient) | `/patients/lab-tests` | GET/POST |
| `/labTests/{id}` (patient) | `/patients/lab-tests/{id}` | GET/PUT/DELETE |
| `/labCriteria` | `/patients/lab-criteria` | GET/POST |
| `/labCriteria/{id}` | `/patients/lab-criteria/{id}` | GET/PUT/DELETE |

---

## 📅 Appointment Service (TestOrder)

| Mock Endpoint | Real Endpoint | Method | Auth Required |
|--------------|---------------|--------|---------------|
| `/appointments` | `/testorder/appointment` | GET/POST | ❌ |
| `/appointments/{id}` | `/testorder/appointment/{id}` | GET/PUT/DELETE | ❌ |
| `/appointments?patientId={id}` | `/testorder/appointment/patient/{patientId}` | GET | ❌ |

**Note:** 
- Filtering by date, doctor, status → Có thể cần thêm query params hoặc filter ở client
- Check-in: `PATCH /testorder/appointment/{id}` với body `{ status: 'checked_in', checkedInAt: '...' }`

---

## 🩸 Sample Service (TestOrder)

| Mock Endpoint | Real Endpoint | Method | Auth Required |
|--------------|---------------|--------|---------------|
| `/samples` | `/testorder/bloodsample` | GET/POST | ❌ |
| `/samples/{id}` | `/testorder/bloodsample/{id}` | GET/PUT/DELETE | ❌ |
| `/samples?barcode={code}` | `/testorder/bloodsample` (filter client) | GET | ❌ |

**Note:**
- Barcode search có thể cần filter ở client hoặc BE có endpoint riêng
- Status update: `PATCH /testorder/bloodsample/{id}` với body `{ status: '...' }`

---

## 🧪 Lab Test Service (TestOrder)

| Mock Endpoint | Real Endpoint | Method | Auth Required |
|--------------|---------------|--------|---------------|
| `/labTests` | `/testorder/testresult` | GET/POST | ❌ |
| `/labTests/{id}` | `/testorder/testresult/{id}` | GET/PUT/DELETE | ❌ |
| `/labTests?appointmentId={id}` | `/testorder/testresult/by-appointment/{appointmentId}` | GET | ❌ |
| `/testResults` | `/testorder/testresult` | GET/POST | ❌ |
| `/testResults/{id}` | `/testorder/testresult/{id}` | GET/PUT/DELETE | ❌ |

**Note:**
- Lab Tests và Test Results có thể là cùng endpoint trong BE
- Status update: `PATCH /testorder/testresult/{id}` với body `{ status: '...' }`

---

## 🏥 Medical Service / Test Package (TestOrder)

| Mock Endpoint | Real Endpoint | Method | Auth Required |
|--------------|---------------|--------|---------------|
| `/services` | `/testorder/testpackage` | GET/POST | ❌ |
| `/services/{id}` | `/testorder/testpackage/{id}` | GET/PUT/DELETE | ❌ |

**Sub-modules:**

| Mock Endpoint | Real Endpoint | Method |
|--------------|---------------|--------|
| `/testCriteria` | `/testorder/testcriterion` | GET/POST |
| `/testCriteria/{id}` | `/testorder/testcriterion/{id}` | GET/PUT/DELETE |
| `/testParameters` | `/testorder/testparameter` | GET/POST |
| `/testParameters/{id}` | `/testorder/testparameter/{id}` | GET/PUT/DELETE |
| `/testPackageCriteria` | `/testorder/testpackagecriterion` | GET/POST |
| `/testPackageCriteria/{id}` | `/testorder/testpackagecriterion/{id}` | GET/PUT/DELETE |

---

## 💳 Payment Service

| Mock Endpoint | Real Endpoint | Method | Auth Required |
|--------------|---------------|--------|---------------|
| `/invoices` | `/payments` | GET/POST | ❌ |
| `/invoices/{id}` | `/payments/{id}` | GET | ❌ |
| `/invoices?patientId={id}` | `/payments/by-patient/{patientId}` | GET | ❌ |

**VNPay Integration:**

| Mock Endpoint | Real Endpoint | Method |
|--------------|---------------|--------|
| N/A | `/Vnpay/CreatePaymentUrl` | GET |
| N/A | `/Vnpay/IpnAction` | GET |
| N/A | `/Vnpay/Callback` | GET |

---

## 🏭 Warehouse Service

| Mock Endpoint | Real Endpoint | Method | Auth Required |
|--------------|---------------|--------|---------------|
| `/equipment` | `/warehouse/equipment` | GET/POST | ❌ |
| `/equipment/{id}` | `/warehouse/equipment/{id}` | GET/PUT/DELETE | ❌ |
| `/reagents` | `/warehouse/reagents` | GET/POST | ❌ |
| `/reagents/{id}` | `/warehouse/reagents/{id}` | GET/PUT/PATCH/DELETE | ❌ |

---

## 👨‍⚕️ Doctor Service (TestOrder)

| Mock Endpoint | Real Endpoint | Method | Auth Required |
|--------------|---------------|--------|---------------|
| `/doctors` | `/testorder/doctor` | GET/POST | ❌ |
| `/doctors/{id}` | `/testorder/doctor/{id}` | GET/PUT/DELETE | ❌ |
| `/doctors?email={email}` | `/testorder/doctor/email/{email}` | GET | ❌ |

---

## 📋 Doctor Shift Service (TestOrder)

| Mock Endpoint | Real Endpoint | Method | Auth Required |
|--------------|---------------|--------|---------------|
| `/shifts` | `/testorder/doctorshift` | GET/POST | ❌ |
| `/shifts/{id}` | `/testorder/doctorshift/{id}` | GET/PUT/DELETE | ❌ |
| `/shifts?roomId={id}` | `/testorder/doctorshift/room/{roomId}` | GET | ❌ |

---

## 🏠 Room Service (TestOrder)

| Mock Endpoint | Real Endpoint | Method | Auth Required |
|--------------|---------------|--------|---------------|
| `/rooms` | `/testorder/room` | GET/POST | ❌ |
| `/rooms/{id}` | `/testorder/room/{id}` | GET/PUT/DELETE | ❌ |

---

## 📝 Test Order Comment Service (TestOrder)

| Mock Endpoint | Real Endpoint | Method | Auth Required |
|--------------|---------------|--------|---------------|
| `/comments` | `/testorder/testordercomment` | GET/POST | ❌ |
| `/comments/{id}` | `/testorder/testordercomment/{id}` | GET/PUT/DELETE | ❌ |
| `/comments?appointmentId={id}` | `/testorder/testordercomment/appointment/{appointmentId}` | GET | ❌ |

---

## ⚙️ Configuration Services (TestOrder)

| Mock Endpoint | Real Endpoint | Method | Auth Required |
|--------------|---------------|--------|---------------|
| N/A | `/testorder/flaggingconfiguration` | GET/POST | ❌ |
| N/A | `/testorder/flaggingconfiguration/{id}` | GET/PUT/DELETE | ❌ |
| N/A | `/testorder/flaggingconfiglog` | GET/POST | ❌ |
| N/A | `/testorder/flaggingconfiglog/{id}` | GET/PUT/DELETE | ❌ |

---

## 🔄 Response Format Differences

### Mock JSON Server Response:
```json
{
  "id": 1,
  "name": "John Doe",
  "email": "john@example.com"
}
```

### Real Backend Response (có thể):
```json
{
  "id": 1,
  "name": "John Doe",
  "email": "john@example.com",
  "createdAt": "2024-01-01T00:00:00Z",
  "updatedAt": "2024-01-01T00:00:00Z"
}
```

**Hoặc:**
```json
{
  "data": {
    "id": 1,
    "name": "John Doe"
  },
  "success": true,
  "message": "Success"
}
```

**Lưu Ý:** Cần kiểm tra format response thực tế của Backend và điều chỉnh code xử lý.

---

## 🚫 Endpoints Không Có Trong Mock (Chỉ Có Trong BE)

1. **Flagging Configuration** - `/testorder/flaggingconfiguration`
2. **Flagging Config Log** - `/testorder/flaggingconfiglog`
3. **VNPay IPN** - `/Vnpay/IpnAction`
4. **VNPay Callback** - `/Vnpay/Callback`

---

## 📌 Lưu Ý Quan Trọng

1. **Tất cả endpoints phải có prefix `/gateway`** khi gọi từ Frontend
2. **Authentication:** 
   - Login/Register không cần token
   - Admin routes (`/admin/*`) cần JWT token
   - Các routes khác có thể không cần token (tùy BE config)
3. **HTTPS:** Backend dùng HTTPS, cần trust certificate
4. **CORS:** Backend đã config CORS cho `localhost:3000`
5. **Error Handling:** Backend có thể trả về error format khác

---

## 🔍 Quick Reference

### Base URL
```javascript
// ❌ Cũ
const API_BASE_URL = 'http://localhost:5001';

// ✅ Mới
const API_BASE_URL = 'https://localhost:7000/gateway';
```

### Example: Get All Patients
```javascript
// ❌ Cũ
const response = await api.get('/patients');

// ✅ Mới (giữ nguyên vì đã có /gateway trong baseURL)
const response = await api.get('/patients');
// Thực tế gọi: https://localhost:7000/gateway/patients
```

### Example: Login
```javascript
// ❌ Cũ
const response = await api.get('/users');
// Filter ở client

// ✅ Mới
const response = await api.post('/iam/auth/login', {
  username: 'user',
  password: 'pass'
});
```

### Example: Create Appointment
```javascript
// ❌ Cũ
const newAppointment = {
  id: Date.now(),  // ❌ Xóa
  appointmentCode: 'APT' + Date.now(),  // ❌ Xóa
  createdAt: new Date().toISOString(),  // ❌ Xóa
  ...appointmentData
};
const response = await api.post('/appointments', newAppointment);

// ✅ Mới
const response = await api.post('/testorder/appointment', appointmentData);
// BE sẽ tự tạo id, code, timestamps
```

---

## ✅ Checklist Migration

- [ ] Đổi baseURL trong `api.js`
- [ ] Đổi tất cả endpoints trong services
- [ ] Xóa logic tự tạo id, timestamps
- [ ] Xóa logic validate ở client (nếu BE đã validate)
- [ ] Xóa mock OTP logic
- [ ] Cập nhật error handling
- [ ] Test tất cả endpoints
- [ ] Kiểm tra response format
- [ ] Kiểm tra authentication flow

