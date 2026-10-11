# Hướng Dẫn Xóa Dữ Liệu Mẫu và Nối API Thật của Backend

## 📋 Mục Lục
1. [Tổng Quan](#tổng-quan)
2. [Các File Cần Xóa/Thay Đổi](#các-file-cần-xóa-thay-đổi)
3. [Các Bước Thực Hiện](#các-bước-thực-hiện)
4. [Chi Tiết Thay Đổi Từng Service](#chi-tiết-thay-đổi-từng-service)
5. [Kiểm Tra và Test](#kiểm-tra-và-test)

---

## 🎯 Tổng Quan

### Mục Tiêu
- Xóa hoàn toàn dữ liệu mẫu JSON và logic mô phỏng
- Kết nối Frontend với Backend API thật qua API Gateway
- Không thay đổi code Backend

### Kiến Trúc Backend Thật
- **API Gateway**: `https://localhost:7000/gateway`
- **IAM Service**: Port 7020 (Authentication, User Management)
- **Patient Service**: Port 7263 (Patient, Medical Records, Lab Tests)
- **TestOrder Service**: Port 7105 (Appointments, Doctors, Samples, Test Results)
- **Payment Service**: Port 1234 (Payments, VNPay)
- **Warehouse Service**: Port 53266 (Equipment, Reagents)

### Mapping Endpoints
Tất cả requests từ Frontend phải đi qua Gateway với prefix `/gateway/...`

---

## 🗑️ Các File Cần Xóa/Thay Đổi

### 1. Files Cần XÓA (Mock Data)
```
blood-laboratory-management/
├── db.json                    # ❌ XÓA - Dữ liệu mẫu JSON
├── start-server.js            # ❌ XÓA - JSON Server config
└── package.json               # ⚠️ SỬA - Xóa json-server dependency
```

### 2. Files Cần SỬA (API Configuration)
```
blood-laboratory-management/src/
├── services/
│   ├── api.js                 # ⚠️ SỬA - Đổi baseURL sang Gateway
│   ├── authService.js         # ⚠️ SỬA - Dùng API thật, xóa mock OTP
│   ├── patientService.js      # ⚠️ SỬA - Đổi endpoints
│   ├── appointmentService.js   # ⚠️ SỬA - Đổi endpoints
│   ├── labTestService.js      # ⚠️ SỬA - Đổi endpoints
│   ├── sampleService.js        # ⚠️ SỬA - Đổi endpoints
│   ├── medicalService.js      # ⚠️ SỬA - Đổi endpoints
│   ├── invoiceService.js       # ⚠️ SỬA - Đổi endpoints
│   ├── inventoryService.js    # ⚠️ SỬA - Đổi endpoints
│   └── ... (tất cả service files)
└── package.json               # ⚠️ SỬA - Xóa script "server", "dev"
```

---

## 🔧 Các Bước Thực Hiện

### Bước 1: Xóa Files Mock Data

```bash
# Xóa db.json
rm blood-laboratory-management/db.json

# Xóa start-server.js
rm blood-laboratory-management/start-server.js
```

### Bước 2: Cập Nhật package.json

**Xóa dependencies:**
```json
{
  "devDependencies": {
    // XÓA dòng này:
    "json-server": "^0.17.4"
  }
}
```

**Xóa scripts:**
```json
{
  "scripts": {
    // XÓA 2 dòng này:
    "server": "node start-server.js",
    "dev": "concurrently \"npm run server\" \"npm start\""
  }
}
```

**Chỉ giữ lại:**
```json
{
  "scripts": {
    "start": "react-scripts start",
    "build": "react-scripts build",
    "test": "react-scripts test",
    "eject": "react-scripts eject"
  }
}
```

### Bước 3: Cập Nhật API Configuration

**File: `src/services/api.js`**

**THAY ĐỔI:**
```javascript
// ❌ CŨ:
const API_BASE_URL = 'http://localhost:5001';

// ✅ MỚI:
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'https://localhost:7000/gateway';
```

**CẬP NHẬT Response Interceptor:**
```javascript
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle authentication errors
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    } 
    // Handle network errors
    else if (error.code === 'ECONNREFUSED' || error.message.includes('Network Error')) {
      console.error('Không thể kết nối đến API Gateway. Vui lòng kiểm tra Backend có đang chạy không.');
    }
    
    return Promise.reject(error);
  }
);
```

### Bước 4: Tạo File Environment Variables

**Tạo file: `.env` (hoặc `.env.development`)**

```env
REACT_APP_API_BASE_URL=https://localhost:7000/gateway
```

---

## 📝 Chi Tiết Thay Đổi Từng Service

### 1. authService.js

#### ❌ XÓA Logic Mock OTP:
```javascript
// XÓA toàn bộ hàm sendOTP và verifyOTP hiện tại
```

#### ✅ THAY BẰNG API Thật:

```javascript
export const authService = {
  login: async (username, password) => {
    try {
      // ✅ Gọi API thật qua Gateway
      const response = await api.post('/iam/auth/login', {
        username: username,
        password: password
      });
      
      if (response.data && response.data.token) {
        const token = response.data.token;
        const user = response.data.user || response.data;
        
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));
        return { success: true, user, token };
      } else {
        return { success: false, message: 'Đăng nhập thất bại' };
      }
    } catch (error) {
      console.error('Login error:', error);
      const message = error.response?.data?.message || 'Tài khoản hoặc mật khẩu không đúng';
      return { success: false, message };
    }
  },

  register: async (userData) => {
    try {
      // ✅ Gọi API thật qua Gateway
      const response = await api.post('/iam/auth/register', userData);
      
      if (response.data) {
        return { 
          success: true, 
          user: response.data.user || response.data,
          message: response.data.message || 'Đăng ký thành công'
        };
      } else {
        return { success: false, message: 'Đăng ký thất bại' };
      }
    } catch (error) {
      console.error('Register error:', error);
      const message = error.response?.data?.message || 'Lỗi tạo tài khoản';
      return { success: false, message };
    }
  },

  sendOTP: async (email) => {
    try {
      // ✅ Gọi API thật qua Gateway
      const response = await api.post('/iam/auth/otp/sendotp', { email });
      return { 
        success: true, 
        message: response.data?.message || 'OTP đã được gửi',
        data: response.data
      };
    } catch (error) {
      const message = error.response?.data?.message || 'Lỗi gửi OTP';
      return { success: false, message };
    }
  },

  verifyOTP: async (email, otp) => {
    try {
      // ✅ Gọi API thật qua Gateway
      const response = await api.post('/iam/auth/otp/verify', { email, otp });
      return { 
        success: true, 
        message: response.data?.message || 'Xác thực OTP thành công',
        data: response.data
      };
    } catch (error) {
      const message = error.response?.data?.message || 'OTP không đúng';
      return { success: false, message };
    }
  },

  // Giữ nguyên các hàm khác
  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('otp');
    localStorage.removeItem('otpEmail');
    localStorage.removeItem('otpExpiry');
  },

  getCurrentUser: () => {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  },

  isAuthenticated: () => {
    const token = localStorage.getItem('token');
    return !!token;
  }
};
```

### 2. patientService.js

#### ✅ THAY ĐỔI Endpoints:

```javascript
export const patientService = {
  getAllPatients: async () => {
    try {
      // ✅ Đổi endpoint
      const response = await api.get('/patients');
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, message: 'Lỗi lấy danh sách bệnh nhân' };
    }
  },

  getPatientById: async (id) => {
    try {
      // ✅ Đổi endpoint
      const response = await api.get(`/patients/${id}`);
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, message: 'Lỗi lấy thông tin bệnh nhân' };
    }
  },

  searchPatients: async (query) => {
    try {
      // ✅ Đổi endpoint - dùng search API của BE
      const response = await api.get(`/patients/search?key=${encodeURIComponent(query)}`);
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, message: 'Lỗi tìm kiếm bệnh nhân' };
    }
  },

  getPatientByEmail: async (email) => {
    try {
      // ✅ Đổi endpoint
      const response = await api.get(`/patients/email/${email}`);
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, message: 'Lỗi lấy thông tin bệnh nhân' };
    }
  },

  createPatient: async (patientData) => {
    try {
      // ✅ Đổi endpoint - KHÔNG tự tạo id nữa, để BE tạo
      const response = await api.post('/patients/register', patientData);
      return { success: true, data: response.data };
    } catch (error) {
      const message = error.response?.data?.message || 'Lỗi tạo bệnh nhân mới';
      return { success: false, message };
    }
  },

  updatePatient: async (id, patientData) => {
    try {
      // ✅ Đổi endpoint
      const response = await api.put(`/patients/${id}`, patientData);
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, message: 'Lỗi cập nhật thông tin bệnh nhân' };
    }
  },

  deletePatient: async (id) => {
    try {
      // ✅ Đổi endpoint
      await api.delete(`/patients/${id}`);
      return { success: true, message: 'Xóa bệnh nhân thành công' };
    } catch (error) {
      return { success: false, message: 'Lỗi xóa bệnh nhân' };
    }
  },

  getPatientHistory: async (patientId) => {
    try {
      // ✅ Đổi endpoints - dùng API thật
      const [appointmentsResponse, labTestsResponse] = await Promise.all([
        api.get(`/testorder/appointment/patient/${patientId}`),
        api.get(`/testorder/testresult/by-appointment?patientId=${patientId}`)
      ]);
      
      return {
        success: true,
        data: {
          appointments: appointmentsResponse.data || [],
          labTests: labTestsResponse.data || []
        }
      };
    } catch (error) {
      return { success: false, message: 'Lỗi lấy lịch sử bệnh nhân' };
    }
  }
};
```

### 3. appointmentService.js

#### ✅ THAY ĐỔI Endpoints:

```javascript
export const appointmentService = {
  getAllAppointments: async () => {
    try {
      // ✅ Đổi endpoint
      const response = await api.get('/testorder/appointment');
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, message: 'Lỗi lấy danh sách lịch hẹn' };
    }
  },

  getAppointmentById: async (id) => {
    try {
      // ✅ Đổi endpoint
      const response = await api.get(`/testorder/appointment/${id}`);
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, message: 'Lỗi lấy thông tin lịch hẹn' };
    }
  },

  getAppointmentsByPatient: async (patientId) => {
    try {
      // ✅ Đổi endpoint
      const response = await api.get(`/testorder/appointment/patient/${patientId}`);
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, message: 'Lỗi lấy lịch hẹn theo bệnh nhân' };
    }
  },

  createAppointment: async (appointmentData) => {
    try {
      // ✅ Đổi endpoint - XÓA logic tự tạo id, code, expiresAt
      // ✅ XÓA logic validate booking constraints (để BE xử lý)
      const response = await api.post('/testorder/appointment', appointmentData);
      return { success: true, data: response.data };
    } catch (error) {
      const message = error.response?.data?.message || 'Lỗi tạo lịch hẹn mới';
      return { success: false, message };
    }
  },

  updateAppointment: async (id, appointmentData) => {
    try {
      // ✅ Đổi endpoint
      const response = await api.put(`/testorder/appointment/${id}`, appointmentData);
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, message: 'Lỗi cập nhật lịch hẹn' };
    }
  },

  deleteAppointment: async (id) => {
    try {
      // ✅ Đổi endpoint
      await api.delete(`/testorder/appointment/${id}`);
      return { success: true, message: 'Xóa lịch hẹn thành công' };
    } catch (error) {
      return { success: false, message: 'Lỗi xóa lịch hẹn' };
    }
  },

  checkInAppointment: async (id, receptionistId = null) => {
    try {
      // ✅ Đổi endpoint - Gửi PATCH với status và receptionistId
      const updateData = {
        status: 'checked_in',
        checkedInAt: new Date().toISOString(),
        checkedInBy: receptionistId
      };
      
      const response = await api.patch(`/testorder/appointment/${id}`, updateData);
      return { success: true, data: response.data };
    } catch (error) {
      const message = error.response?.data?.message || 'Lỗi check-in bệnh nhân';
      return { success: false, message };
    }
  }
  
  // ... Các hàm khác tương tự, đổi endpoint sang /testorder/appointment/...
};
```

### 4. sampleService.js

#### ✅ THAY ĐỔI Endpoints:

```javascript
export const sampleService = {
  getAllSamples: async () => {
    try {
      // ✅ Đổi endpoint
      const response = await api.get('/testorder/bloodsample');
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, message: 'Lỗi lấy danh sách mẫu máu' };
    }
  },

  getSampleById: async (id) => {
    try {
      // ✅ Đổi endpoint
      const response = await api.get(`/testorder/bloodsample/${id}`);
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, message: 'Lỗi lấy thông tin mẫu máu' };
    }
  },

  getSampleByBarcode: async (barcode) => {
    try {
      // ✅ Có thể cần search API hoặc filter từ getAllSamples
      const response = await api.get('/testorder/bloodsample');
      const sample = response.data?.find(s => s.barcode === barcode);
      return { success: true, data: sample };
    } catch (error) {
      return { success: false, message: 'Lỗi lấy mẫu máu theo mã vạch' };
    }
  },

  createSample: async (sampleData) => {
    try {
      // ✅ Đổi endpoint - XÓA logic tự tạo id, barcode (để BE tạo)
      const response = await api.post('/testorder/bloodsample', sampleData);
      return { success: true, data: response.data };
    } catch (error) {
      const message = error.response?.data?.message || 'Lỗi tạo mẫu máu mới';
      return { success: false, message };
    }
  },

  updateSample: async (id, sampleData) => {
    try {
      // ✅ Đổi endpoint
      const response = await api.put(`/testorder/bloodsample/${id}`, sampleData);
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, message: 'Lỗi cập nhật mẫu máu' };
    }
  },

  updateSampleStatus: async (id, status) => {
    try {
      // ✅ Đổi endpoint
      const response = await api.patch(`/testorder/bloodsample/${id}`, { status });
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, message: 'Lỗi cập nhật trạng thái mẫu máu' };
    }
  },

  deleteSample: async (id) => {
    try {
      // ✅ Đổi endpoint
      await api.delete(`/testorder/bloodsample/${id}`);
      return { success: true, message: 'Xóa mẫu máu thành công' };
    } catch (error) {
      return { success: false, message: 'Lỗi xóa mẫu máu' };
    }
  },

  // ❌ XÓA hàm generateUniqueBarcode, fixMissingBarcodes (để BE xử lý)
  
  // ... Các hàm khác tương tự
};
```

### 5. labTestService.js

#### ✅ THAY ĐỔI Endpoints:

```javascript
export const labTestService = {
  getAllLabTests: async () => {
    try {
      // ✅ Đổi endpoint - có thể là /testorder/testresult hoặc /patients/lab-tests
      const response = await api.get('/testorder/testresult');
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, message: 'Lỗi lấy danh sách phiếu xét nghiệm' };
    }
  },

  getLabTestById: async (id) => {
    try {
      // ✅ Đổi endpoint
      const response = await api.get(`/testorder/testresult/${id}`);
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, message: 'Lỗi lấy thông tin phiếu xét nghiệm' };
    }
  },

  getLabTestsByAppointment: async (appointmentId) => {
    try {
      // ✅ Đổi endpoint
      const response = await api.get(`/testorder/testresult/by-appointment/${appointmentId}`);
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, message: 'Lỗi lấy kết quả xét nghiệm theo lịch hẹn' };
    }
  },

  createLabTest: async (testData) => {
    try {
      // ✅ Đổi endpoint - XÓA logic tự tạo id, sampleId
      const response = await api.post('/testorder/testresult', testData);
      return { success: true, data: response.data };
    } catch (error) {
      const message = error.response?.data?.message || 'Lỗi tạo phiếu xét nghiệm mới';
      return { success: false, message };
    }
  },

  updateLabTest: async (id, testData) => {
    try {
      // ✅ Đổi endpoint
      const response = await api.put(`/testorder/testresult/${id}`, testData);
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, message: 'Lỗi cập nhật phiếu xét nghiệm' };
    }
  },

  updateTestStatus: async (id, status) => {
    try {
      // ✅ Đổi endpoint
      const response = await api.patch(`/testorder/testresult/${id}`, { status });
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, message: 'Lỗi cập nhật trạng thái phiếu xét nghiệm' };
    }
  },

  deleteLabTest: async (id) => {
    try {
      // ✅ Đổi endpoint
      await api.delete(`/testorder/testresult/${id}`);
      return { success: true, message: 'Xóa phiếu xét nghiệm thành công' };
    } catch (error) {
      return { success: false, message: 'Lỗi xóa phiếu xét nghiệm' };
    }
  }

  // ... Các hàm khác tương tự
};
```

### 6. medicalService.js

#### ✅ THAY ĐỔI Endpoints:

```javascript
export const medicalService = {
  getAllServices: async () => {
    try {
      // ✅ Cần kiểm tra BE có endpoint này không
      // Có thể là /testorder/testpackage hoặc endpoint khác
      const response = await api.get('/testorder/testpackage');
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, message: 'Lỗi lấy danh sách dịch vụ' };
    }
  },

  getServiceById: async (id) => {
    try {
      const response = await api.get(`/testorder/testpackage/${id}`);
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, message: 'Lỗi lấy thông tin dịch vụ' };
    }
  },

  createService: async (serviceData) => {
    try {
      // ✅ XÓA logic tự tạo id, createdAt
      const response = await api.post('/testorder/testpackage', serviceData);
      return { success: true, data: response.data };
    } catch (error) {
      const message = error.response?.data?.message || 'Lỗi tạo dịch vụ mới';
      return { success: false, message };
    }
  },

  updateService: async (id, serviceData) => {
    try {
      const response = await api.put(`/testorder/testpackage/${id}`, serviceData);
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, message: 'Lỗi cập nhật dịch vụ' };
    }
  },

  deleteService: async (id) => {
    try {
      await api.delete(`/testorder/testpackage/${id}`);
      return { success: true, message: 'Xóa dịch vụ thành công' };
    } catch (error) {
      return { success: false, message: 'Lỗi xóa dịch vụ' };
    }
  }
};
```

### 7. invoiceService.js / paymentService.js

#### ✅ THAY ĐỔI Endpoints:

```javascript
export const invoiceService = {
  getAllInvoices: async () => {
    try {
      // ✅ Đổi endpoint
      const response = await api.get('/payments');
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, message: 'Lỗi lấy danh sách hóa đơn' };
    }
  },

  getInvoiceById: async (id) => {
    try {
      const response = await api.get(`/payments/${id}`);
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, message: 'Lỗi lấy thông tin hóa đơn' };
    }
  },

  createInvoice: async (invoiceData) => {
    try {
      // ✅ XÓA logic tự tạo id, createdAt
      const response = await api.post('/payments', invoiceData);
      return { success: true, data: response.data };
    } catch (error) {
      const message = error.response?.data?.message || 'Lỗi tạo hóa đơn';
      return { success: false, message };
    }
  },

  // VNPay integration
  createVNPayPayment: async (paymentData) => {
    try {
      const response = await api.get('/Vnpay/CreatePaymentUrl', { params: paymentData });
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, message: 'Lỗi tạo thanh toán VNPay' };
    }
  }
};
```

### 8. inventoryService.js

#### ✅ THAY ĐỔI Endpoints:

```javascript
export const inventoryService = {
  getAllEquipment: async () => {
    try {
      // ✅ Đổi endpoint
      const response = await api.get('/warehouse/equipment');
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, message: 'Lỗi lấy danh sách thiết bị' };
    }
  },

  getEquipmentById: async (id) => {
    try {
      const response = await api.get(`/warehouse/equipment/${id}`);
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, message: 'Lỗi lấy thông tin thiết bị' };
    }
  },

  createEquipment: async (equipmentData) => {
    try {
      // ✅ XÓA logic tự tạo id
      const response = await api.post('/warehouse/equipment', equipmentData);
      return { success: true, data: response.data };
    } catch (error) {
      const message = error.response?.data?.message || 'Lỗi tạo thiết bị';
      return { success: false, message };
    }
  },

  updateEquipment: async (id, equipmentData) => {
    try {
      const response = await api.put(`/warehouse/equipment/${id}`, equipmentData);
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, message: 'Lỗi cập nhật thiết bị' };
    }
  },

  deleteEquipment: async (id) => {
    try {
      await api.delete(`/warehouse/equipment/${id}`);
      return { success: true, message: 'Xóa thiết bị thành công' };
    } catch (error) {
      return { success: false, message: 'Lỗi xóa thiết bị' };
    }
  },

  // Tương tự cho Reagents
  getAllReagents: async () => {
    try {
      const response = await api.get('/warehouse/reagents');
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, message: 'Lỗi lấy danh sách hóa chất' };
    }
  }

  // ... Các hàm khác tương tự
};
```

### 9. userManagementService.js / roleService.js

#### ✅ THAY ĐỔI Endpoints:

```javascript
export const userManagementService = {
  getAllUsers: async () => {
    try {
      // ✅ Đổi endpoint - cần JWT token
      const response = await api.get('/admin/accounts');
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, message: 'Lỗi lấy danh sách người dùng' };
    }
  },

  getUserById: async (id) => {
    try {
      const response = await api.get(`/admin/accounts/${id}`);
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, message: 'Lỗi lấy thông tin người dùng' };
    }
  },

  createUser: async (userData) => {
    try {
      // ✅ XÓA logic tự tạo id, password
      const response = await api.post('/admin/accounts', userData);
      return { success: true, data: response.data };
    } catch (error) {
      const message = error.response?.data?.message || 'Lỗi tạo người dùng';
      return { success: false, message };
    }
  },

  updateUser: async (id, userData) => {
    try {
      const response = await api.put(`/admin/accounts/${id}`, userData);
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, message: 'Lỗi cập nhật người dùng' };
    }
  },

  deleteUser: async (id) => {
    try {
      await api.delete(`/admin/accounts/${id}`);
      return { success: true, message: 'Xóa người dùng thành công' };
    } catch (error) {
      return { success: false, message: 'Lỗi xóa người dùng' };
    }
  }
};
```

---

## ✅ Checklist Thay Đổi

### Files Cần Xóa:
- [ ] `db.json`
- [ ] `start-server.js`
- [ ] Xóa `json-server` từ `package.json`
- [ ] Xóa scripts `server` và `dev` từ `package.json`

### Files Cần Sửa:
- [ ] `src/services/api.js` - Đổi baseURL
- [ ] `src/services/authService.js` - Dùng API thật, xóa mock OTP
- [ ] `src/services/patientService.js` - Đổi endpoints
- [ ] `src/services/appointmentService.js` - Đổi endpoints
- [ ] `src/services/sampleService.js` - Đổi endpoints
- [ ] `src/services/labTestService.js` - Đổi endpoints
- [ ] `src/services/medicalService.js` - Đổi endpoints
- [ ] `src/services/invoiceService.js` - Đổi endpoints
- [ ] `src/services/inventoryService.js` - Đổi endpoints
- [ ] `src/services/userManagementService.js` - Đổi endpoints
- [ ] `src/services/roleService.js` - Đổi endpoints (nếu có)
- [ ] `src/services/shiftService.js` - Đổi endpoints (nếu có)
- [ ] `src/services/consultationService.js` - Đổi endpoints (nếu có)

### Logic Cần Xóa:
- [ ] Tự tạo `id` bằng `Date.now()`
- [ ] Tự tạo `createdAt`, `updatedAt`
- [ ] Logic validate booking constraints (để BE xử lý)
- [ ] Logic tự tạo barcode, appointment code
- [ ] Mock OTP logic (localStorage)
- [ ] Filter data ở client (nếu BE có search API)

---

## 🧪 Kiểm Tra và Test

### 1. Kiểm Tra Kết Nối

```bash
# 1. Đảm bảo Backend đang chạy
# - API Gateway: https://localhost:7000
# - Các services đang chạy

# 2. Trust HTTPS certificate (nếu chưa)
dotnet dev-certs https --trust

# 3. Test API Gateway
curl https://localhost:7000/gateway/iam/auth/login \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"username":"test","password":"test"}'
```

### 2. Test Authentication

1. **Login:**
   - Mở browser console
   - Thử login với tài khoản thật
   - Kiểm tra token được lưu trong localStorage
   - Kiểm tra user data

2. **Register:**
   - Thử đăng ký tài khoản mới
   - Kiểm tra OTP được gửi (qua BE)

3. **Protected Routes:**
   - Thử truy cập routes cần authentication
   - Kiểm tra token được gửi trong header

### 3. Test CRUD Operations

1. **Patient:**
   - Tạo patient mới
   - Lấy danh sách patients
   - Tìm kiếm patient
   - Cập nhật patient
   - Xóa patient

2. **Appointment:**
   - Tạo appointment
   - Lấy danh sách appointments
   - Check-in appointment
   - Cập nhật appointment

3. **Sample:**
   - Tạo sample
   - Lấy sample theo barcode
   - Cập nhật status sample

4. **Lab Test:**
   - Tạo lab test
   - Nhập kết quả
   - Duyệt kết quả

### 4. Kiểm Tra Error Handling

- Test với invalid credentials
- Test với missing required fields
- Test với network errors
- Test với 401/403 errors

---

## 📌 Lưu Ý Quan Trọng

### 1. CORS
- Đảm bảo Backend đã cấu hình CORS cho `http://localhost:3000`

### 2. HTTPS Certificate
- Frontend gọi `https://localhost:7000` cần trust certificate
- Chạy: `dotnet dev-certs https --trust`

### 3. JWT Token
- Token được lưu trong localStorage
- Tự động gửi trong header `Authorization: Bearer <token>`
- Token hết hạn sẽ redirect về login

### 4. Response Format
- Backend có thể trả về format khác với JSON Server
- Cần kiểm tra và điều chỉnh code xử lý response

### 5. Error Messages
- Backend có thể trả về error message khác format
- Cần xử lý `error.response?.data?.message` hoặc `error.response?.data?.error`

### 6. Data Structure
- Backend có thể dùng naming convention khác (PascalCase vs camelCase)
- Cần kiểm tra và map data nếu cần

---

## 🔍 Debugging Tips

### 1. Kiểm Tra Network Requests
- Mở Browser DevTools → Network tab
- Xem requests có gửi đúng endpoint không
- Xem response từ Backend

### 2. Console Logs
- Thêm console.log để debug
- Log request data và response data

### 3. API Gateway Logs
- Xem logs của API Gateway
- Kiểm tra routes có được map đúng không

### 4. Backend Service Logs
- Xem logs của từng service
- Kiểm tra có nhận được request không

---

## 📚 Tài Liệu Tham Khảo

- [Backend API Documentation](./README-API-CONNECT.md) (trong folder lmsystem)
- [Ocelot Configuration](./lmsystem/LMSystem/api-gateway/ocelot.json)
- [API List](./src/docs/API_LIST.md)

---

## ✅ Hoàn Thành

Sau khi hoàn thành tất cả các bước:
1. ✅ Xóa tất cả mock data và logic
2. ✅ Kết nối với Backend API thật
3. ✅ Test tất cả chức năng
4. ✅ Xử lý errors đúng cách
5. ✅ Đảm bảo authentication hoạt động

**Lưu ý:** Không thay đổi code Backend, chỉ thay đổi Frontend để kết nối với Backend thật.

