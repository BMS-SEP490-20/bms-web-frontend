# Hướng dẫn cài đặt và chạy dự án

## 🚀 Cài đặt nhanh

### 1. Cài đặt dependencies
```bash
npm install
```

### 2. Chạy dự án

#### Cách 1: Chạy đồng thời (Khuyến nghị)
```bash
npm run dev
```

#### Cách 2: Chạy riêng lẻ
```bash
# Terminal 1: Chạy JSON Server
npm run server

# Terminal 2: Chạy React App
npm start
```

### 3. Truy cập ứng dụng
- **Frontend**: http://localhost:3000
- **API Server**: http://localhost:5001

## 🔧 Cấu hình

### JSON Server (Port 5001)
- Database: `db.json`
- CORS: Enabled
- Health check: `GET /api/health`

### React App (Port 3000)
- Development server
- Hot reload enabled
- API calls to port 5001

## 📊 Database Schema

### Users
```json
{
  "id": 1,
  "email": "admin@lab.com",
  "password": "admin123",
  "role": "admin",
  "fullName": "Quản trị viên",
  "phone": "0123456789",
  "isActive": true,
  "createdAt": "2024-01-01T00:00:00.000Z"
}
```

### Patients
```json
{
  "id": 1,
  "fullName": "Nguyễn Văn Bệnh",
  "dateOfBirth": "1990-05-15",
  "gender": "male",
  "address": "123 Đường ABC, Quận 1, TP.HCM",
  "phone": "0987654321",
  "email": "benh@email.com",
  "createdAt": "2024-01-15T08:00:00.000Z",
  "updatedAt": "2024-01-15T08:00:00.000Z"
}
```

### Appointments
```json
{
  "id": 1,
  "patientId": 1,
  "doctorId": 2,
  "appointmentDate": "2024-01-20",
  "appointmentTime": "08:00",
  "department": "Xét nghiệm máu",
  "status": "scheduled",
  "notes": "Khám định kỳ",
  "createdAt": "2024-01-15T10:00:00.000Z"
}
```

### Lab Tests
```json
{
  "id": 1,
  "patientId": 1,
  "appointmentId": 1,
  "testType": "Công thức máu",
  "status": "pending",
  "requestedBy": 2,
  "requestedAt": "2024-01-20T08:00:00.000Z",
  "sampleId": "S001",
  "notes": "Xét nghiệm định kỳ"
}
```

### Test Results
```json
{
  "id": 1,
  "labTestId": 2,
  "results": {
    "glucose": 95,
    "unit": "mg/dL",
    "normalRange": "70-100"
  },
  "status": "normal",
  "technicianId": 3,
  "doctorId": 2,
  "approvedAt": "2024-01-21T14:00:00.000Z",
  "doctorNotes": "Kết quả bình thường",
  "createdAt": "2024-01-21T12:00:00.000Z"
}
```

### Services
```json
{
  "id": 1,
  "name": "Công thức máu",
  "description": "Xét nghiệm tế bào máu",
  "price": 150000,
  "unit": "VNĐ",
  "isActive": true,
  "createdAt": "2024-01-01T00:00:00.000Z"
}
```

### Invoices
```json
{
  "id": 1,
  "patientId": 2,
  "appointmentId": 2,
  "totalAmount": 100000,
  "paidAmount": 100000,
  "status": "paid",
  "paymentMethod": "cash",
  "createdAt": "2024-01-21T15:00:00.000Z",
  "items": [
    {
      "serviceId": 2,
      "serviceName": "Đường huyết",
      "quantity": 1,
      "price": 100000,
      "total": 100000
    }
  ]
}
```

## 🔑 Tài khoản demo

| Vai trò | Email | Mật khẩu | Quyền hạn |
|---------|-------|----------|-----------|
| Admin | admin@lab.com | admin123 | Toàn quyền |
| Bác sĩ | doctor@lab.com | doctor123 | Xem, duyệt kết quả |
| Nhân viên | staff@lab.com | staff123 | Quản lý bệnh nhân, lịch hẹn |

## 🛠️ Troubleshooting

### Lỗi kết nối API
```bash
# Kiểm tra JSON Server có chạy không
curl http://localhost:5001/api/health

# Nếu không chạy, khởi động lại
npm run server
```

### Lỗi CORS
- JSON Server đã được cấu hình CORS
- Kiểm tra port 5001 có bị chiếm không

### Lỗi build
```bash
# Xóa node_modules và cài lại
rm -rf node_modules package-lock.json
npm install
```

### Lỗi port đã được sử dụng
```bash
# Thay đổi port trong start-server.js
const PORT = process.env.PORT || 5002;
```

## 📝 API Testing

### Test với curl
```bash
# Health check
curl http://localhost:5001/api/health

# Get users
curl http://localhost:5001/users

# Get patients
curl http://localhost:5001/patients

# Create new patient
curl -X POST http://localhost:5001/patients \
  -H "Content-Type: application/json" \
  -d '{"fullName":"Test Patient","dateOfBirth":"1990-01-01","gender":"male","phone":"0123456789","email":"test@email.com","address":"Test Address"}'
```

### Test với Postman
1. Import collection từ `postman/` folder
2. Set base URL: `http://localhost:5001`
3. Run tests

## 🚀 Production Deployment

### Build
```bash
npm run build
```

### Serve
```bash
# Cài đặt serve
npm install -g serve

# Chạy production build
serve -s build -l 3000
```

### Docker
```bash
# Build image
docker build -t blood-lab-management .

# Run container
docker run -p 3000:3000 -p 5001:5001 blood-lab-management
```

## 📞 Support

Nếu gặp vấn đề, vui lòng:
1. Kiểm tra console logs
2. Kiểm tra network tab trong DevTools
3. Kiểm tra JSON Server logs
4. Tạo issue trên GitHub
