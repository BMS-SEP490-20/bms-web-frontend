# Sự Khác Biệt Giữa Phân Bổ Ca Làm Việc và Lịch Hẹn

## 📋 Tổng Quan

Hệ thống có **2 loại phân bổ khác nhau** với mục đích và đối tượng khác nhau:

---

## 🔵 CA LÀM VIỆC (Work Shifts) - Phân Bổ Cho NHÂN VIÊN

### Mục đích:
**Phân bổ công việc cho nhân viên** - Ai làm việc khi nào, ở đâu, vai trò gì

### Đối tượng phân bổ:
- **Bác sĩ** (doctor)
- **Nhân viên Lab** (lab_user)  
- **Lễ tân** (receptionist)

### Đặc điểm:

#### 1. **Tạo trước (Planning)**
- Tạo ca làm việc **trước** khi có lịch hẹn
- Có thể tạo tự động cho cả tháng một lần
- Hoặc tạo thủ công từng ca

#### 2. **Ràng buộc nghiêm ngặt**
- ❌ Không làm 2 ca liên tiếp trong cùng 1 ngày (trừ ca sáng + ca tối)
- ❌ Không làm quá 5 ngày liên tiếp
- ✅ Mỗi ca cần ít nhất 1 bác sĩ + 1 lab user
- ✅ Phân bổ đều trong tuần
- ✅ Chỉ tạo ca cho ngày trong tuần (thứ 2 - thứ 6)

#### 3. **Cấu trúc**
```javascript
{
  userId: 123,              // NHÂN VIÊN nào
  userName: "Nguyễn Văn A",
  role: "doctor",           // VAI TRÒ gì
  shiftDate: "2024-01-15",  // NGÀY nào
  startTime: "07:00",       // GIỜ bắt đầu
  endTime: "11:00",         // GIỜ kết thúc
  room: "room_101",         // PHÒNG nào
  status: "scheduled"       // Trạng thái ca
}
```

#### 4. **Quy trình phân bổ**
```
1. Chọn nhân viên (Bác sĩ/Lab User/Lễ tân)
   ↓
2. Chọn ngày làm việc
   ↓
3. Chọn ca (sáng/chiều/tối)
   ↓
4. Chọn phòng
   ↓
5. Hệ thống kiểm tra ràng buộc
   ↓
6. Tạo ca làm việc
```

---

## 🟡 LỊCH HẸN (Appointments) - Phân Bổ Cho BỆNH NHÂN

### Mục đích:
**Phân bổ bệnh nhân vào ca làm việc** - Bệnh nhân nào đi ca nào, gặp bác sĩ nào

### Đối tượng phân bổ:
- **Bệnh nhân** (patient)

### Đặc điểm:

#### 1. **Tạo sau (Assignment)**
- Lịch hẹn được tạo **sau** khi bệnh nhân đặt lịch
- **Phải có ca làm việc trước** mới có thể phân bổ
- Phân bổ lịch hẹn vào ca làm việc đã có sẵn

#### 2. **Ràng buộc đơn giản hơn**
- ✅ Phải có ca làm việc cùng ngày
- ✅ Ưu tiên ca cùng giờ
- ✅ Tối đa 3 bệnh nhân/ca
- ✅ Mỗi bệnh nhân chỉ 1 lịch/ngày

#### 3. **Tự động lấy thông tin từ ca**
Khi phân bổ lịch hẹn vào ca làm việc:
- **Bác sĩ** → Tự động từ ca (nếu ca là của bác sĩ)
- **Lab User** → Tự động từ ca (nếu ca là của lab user)
- **Phòng** → Tự động từ ca
- **Giờ** → Tự động từ ca

#### 4. **Cấu trúc**
```javascript
{
  patientId: 456,           // BỆNH NHÂN nào
  appointmentDate: "2024-01-15",
  appointmentTime: "07:00",
  service: "Xét nghiệm máu",
  status: "confirmed",
  
  // Tự động từ ca làm việc:
  shiftId: 789,             // CA LÀM VIỆC nào
  doctorId: 123,            // Tự động từ shift.userId (nếu role=doctor)
  labUserId: 124,           // Tự động từ shift.userId (nếu role=lab_user)
  room: "room_101"           // Tự động từ shift.room
}
```

#### 5. **Quy trình phân bổ**
```
1. Có lịch hẹn chưa phân bổ (status = confirmed/scheduled)
   ↓
2. Tìm ca làm việc phù hợp (cùng ngày, cùng giờ)
   ↓
3. Chọn ca làm việc
   ↓
4. Hệ thống TỰ ĐỘNG:
   - Gán doctorId từ shift (nếu shift.role = doctor)
   - Gán labUserId từ shift (nếu shift.role = lab_user)
   - Gán room từ shift
   - Cập nhật appointmentTime từ shift.startTime
   ↓
5. Lưu lịch hẹn với shiftId
```

---

## 🔄 So Sánh Trực Tiếp

| Tiêu chí | **CA LÀM VIỆC** | **LỊCH HẸN** |
|----------|----------------|--------------|
| **Phân bổ cho ai?** | Nhân viên (staff) | Bệnh nhân (patient) |
| **Khi nào tạo?** | Trước (planning) | Sau (assignment) |
| **Đối tượng** | Bác sĩ, Lab User, Lễ tân | Bệnh nhân |
| **Ràng buộc** | Nhiều và phức tạp | Ít và đơn giản |
| **Tự động hóa** | Có thể tạo tự động cả tháng | Phân bổ vào ca có sẵn |
| **Mối quan hệ** | Độc lập | Phụ thuộc vào ca làm việc |
| **Số lượng** | 1 nhân viên/ca | Nhiều bệnh nhân/ca (tối đa 3) |

---

## 💡 Ví Dụ Thực Tế

### Scenario: Ngày 15/01/2024

#### Bước 1: Tạo CA LÀM VIỆC (trước)
```
Ca sáng (07:00-11:00):
- Bác sĩ: Nguyễn Văn A (room_101)
- Lab User: Trần Thị B (lab_room_1)

Ca chiều (13:00-17:00):
- Bác sĩ: Lê Văn C (room_102)
- Lab User: Phạm Thị D (lab_room_2)
```

#### Bước 2: Phân Bổ LỊCH HẸN (sau)
```
Bệnh nhân X đặt lịch 15/01, 07:00
  ↓
Hệ thống tìm ca sáng (07:00-11:00)
  ↓
Chọn ca của Bác sĩ Nguyễn Văn A
  ↓
Tự động gán:
- doctorId = Nguyễn Văn A
- labUserId = Trần Thị B (từ ca lab user cùng giờ)
- room = room_101
- shiftId = ID của ca sáng
```

---

## 🎯 Quy Tắc Vàng

### 1. **Luôn tạo CA LÀM VIỆC trước**
- Không thể phân bổ lịch hẹn nếu chưa có ca làm việc
- Nên tạo ca cho cả tháng một lần

### 2. **Lịch hẹn phụ thuộc vào ca làm việc**
- Bác sĩ/lab user/phòng được lấy TỰ ĐỘNG từ ca
- Không cần chọn thủ công (trừ trường hợp đặc biệt)

### 3. **Một ca có thể có nhiều lịch hẹn**
- 1 ca làm việc = 1 nhân viên
- 1 ca làm việc = nhiều bệnh nhân (tối đa 3)

### 4. **Workflow đúng thứ tự**
```
Tạo ca làm việc → Phân bổ lịch hẹn vào ca
```

---

## 📊 Sơ Đồ Quan Hệ

```
┌─────────────────┐
│  CA LÀM VIỆC    │
│  (1 nhân viên)  │
└────────┬────────┘
         │
         │ shiftId
         │
         ▼
┌─────────────────┐
│   LỊCH HẸN       │
│ (nhiều bệnh nhân)│
│  (tối đa 3)      │
└─────────────────┘
```

**Một ca làm việc** có thể có **nhiều lịch hẹn**, nhưng **một lịch hẹn** chỉ thuộc về **một ca làm việc**.

---

## ✅ Tóm Tắt

| | **CA LÀM VIỆC** | **LỊCH HẸN** |
|---|---|---|
| **Câu hỏi** | Ai làm việc? | Bệnh nhân nào đi ca nào? |
| **Trả lời** | Nhân viên X làm ca Y | Bệnh nhân Z đi ca Y |
| **Thời điểm** | Tạo trước | Phân bổ sau |
| **Tự động** | Tạo ca tự động | Gán vào ca có sẵn |

**Kết luận**: Ca làm việc là **nền tảng**, lịch hẹn là **khách hàng** được phân bổ vào nền tảng đó.

