# 📋 Giải thích Workflow Status - Blood Lab Management System

**Date:** 2024-10-23
**Topic:** Sự khác biệt giữa "Đã xác nhận" và "Đã check-in"

---

## 🔄 Full Workflow Overview

```
┌─────────────────┐
│ 1. Chờ thanh    │ ← Bệnh nhân vừa đặt lịch
│    toán         │
└────────┬────────┘
         │ (Thanh toán thành công)
         ▼
┌─────────────────┐
│ 2. Đã đặt lịch  │ ← Đã thanh toán, chờ đến ngày hẹn
└────────┬────────┘
         │ (Hệ thống xác nhận/Bác sĩ xác nhận)
         ▼
┌─────────────────┐
│ 3. Đã xác nhận  │ ◄── STATUS 1 (CONFIRMED) 🔵
│   (confirmed)   │     Bệnh nhân ở nhà, chưa đến
└────────┬────────┘
         │ (Bệnh nhân đến phòng khám)
         ▼
┌─────────────────┐
│ 4. Đã check-in  │ ◄── STATUS 2 (CHECKED_IN) 🟢
│   (checked_in)  │     Bệnh nhân đã có mặt tại phòng khám
└────────┬────────┘
         │ (Lab User lấy mẫu)
         ▼
┌─────────────────┐
│ 5. Đã lấy mẫu   │ ← Mẫu đã được thu thập
│ (sample_collected)
└────────┬────────┘
         │ (Lab xử lý mẫu)
         ▼
┌─────────────────┐
│ 6. Đã xử lý mẫu │ ← Mẫu đã xong, sẵn sàng nhập kết quả
│(sample_processed)
└────────┬────────┘
         │ (Lab User nhập kết quả)
         ▼
┌─────────────────┐
│ 7. Chờ xác nhận │ ← Kết quả chờ xác nhận nội bộ
│ (result_pending)│
└────────┬────────┘
         │ (Lab User gửi bác sĩ)
         ▼
┌─────────────────┐
│ 8. Chờ bác sĩ   │ ← Chờ bác sĩ xem và duyệt
│    duyệt        │
│(waiting_review) │
└────────┬────────┘
         │ (Bác sĩ duyệt & tạo tư vấn)
         ▼
┌─────────────────┐
│ 9. Hoàn thành   │ ← Email đã gửi cho bệnh nhân
│  (completed)    │
└─────────────────┘
```

---

## 🔵 STATUS 1: "Đã xác nhận" (confirmed)

### Định nghĩa:
Lịch hẹn đã được **xác nhận** bởi hệ thống/bác sĩ, bệnh nhân **CHƯA ĐẾN** phòng khám.

### Điều kiện:
- ✅ Bệnh nhân đã thanh toán thành công
- ✅ Lịch hẹn đã được xác nhận
- ✅ Đang chờ đến ngày/giờ hẹn
- ❌ Bệnh nhân **CHƯA CÓ MẶT** tại phòng khám

### Vị trí:
- 🏠 **Bệnh nhân ở nhà** hoặc đang trên đường đến
- 📅 Ngày hẹn: 25/12/2024, 09:00
- 📞 Có thể liên hệ để nhắc lịch

### Actions có thể thực hiện:

#### Cho Bệnh nhân:
- ✅ Xem thông tin lịch hẹn
- ✅ Hủy lịch (nếu cần)
- ❌ **CHƯA THỂ** check-in (chưa đến)
- ❌ **CHƯA THỂ** lấy mẫu

#### Cho Lab User:
- ✅ Xem thông tin lịch hẹn
- ✅ Liên hệ bệnh nhân
- ✅ **CHECK-IN** bệnh nhân (khi họ đến)
- ✅ Đánh dấu "Không đến" (no_show) nếu quá giờ
- ❌ **CHƯA THỂ** lấy mẫu (bệnh nhân chưa có mặt)

#### Cho Bác sĩ:
- ✅ Xem thông tin lịch hẹn
- ✅ Xem hồ sơ bệnh nhân
- ❌ **CHƯA THỂ** xem kết quả (chưa có)

### Example Data:
```json
{
  "id": 1,
  "patientId": 1,
  "patientName": "Nguyễn Văn Bệnh",
  "doctorId": 2,
  "doctorName": "Bác sĩ Nguyễn Văn A",
  "appointmentDate": "2024-12-25",
  "appointmentTime": "09:00",
  "status": "confirmed",
  "notes": "Khám định kỳ"
}
```

### UI Display:
```
┌──────────────────────────────────────┐
│ Lịch hẹn #1                          │
│ ─────────────────────────────────────│
│ 📅 25/12/2024 - 09:00                │
│ 👤 Nguyễn Văn Bệnh                   │
│ 👨‍⚕️ Bác sĩ Nguyễn Văn A              │
│ 🏷️  Đã xác nhận                      │
│                                       │
│ [📞 Liên hệ] [✅ Check-in] [❌ Hủy]  │
└──────────────────────────────────────┘
```

---

## 🟢 STATUS 2: "Đã check-in" (checked_in)

### Định nghĩa:
Bệnh nhân **ĐÃ ĐẾN** phòng khám và đã check-in tại quầy, sẵn sàng cho việc lấy mẫu xét nghiệm.

### Điều kiện:
- ✅ Bệnh nhân đã thanh toán
- ✅ Lịch hẹn đã xác nhận
- ✅ Bệnh nhân **ĐÃ CÓ MẶT** tại phòng khám
- ✅ Đã check-in tại quầy lễ tân/Lab User
- ⏰ **ĐANG CHỜ** lấy mẫu

### Vị trí:
- 🏥 **Bệnh nhân ĐÃ CÓ MẶT tại phòng khám**
- 🪑 Đang ngồi chờ tại phòng chờ
- 🎯 Sẵn sàng để Lab User lấy mẫu

### Actions có thể thực hiện:

#### Cho Bệnh nhân:
- ✅ Xem thông tin lịch hẹn
- ✅ Chờ được gọi tên để lấy mẫu
- ❌ **KHÔNG THỂ** hủy lịch (đã check-in)

#### Cho Lab User:
- ✅ Xem thông tin lịch hẹn
- ✅ **LẤY MẪU XÉT NGHIỆM** 👈 **ACTION CHÍNH**
  - Nhấn nút "Lấy mẫu"
  - Mở modal nhập thông tin mẫu
  - Chọn loại mẫu, thể tích, ghi chú
  - Lưu → Tạo sample record
- ✅ Xem hồ sơ bệnh nhân
- ❌ **CHƯA THỂ** nhập kết quả (chưa có mẫu)

#### Cho Bác sĩ:
- ✅ Xem thông tin lịch hẹn
- ✅ Xem hồ sơ bệnh nhân
- ❌ **CHƯA THỂ** xem kết quả (chưa có)

### Example Data:
```json
{
  "id": 2,
  "patientId": 2,
  "patientName": "Trần Thị Khỏe",
  "doctorId": 2,
  "doctorName": "Bác sĩ Nguyễn Văn A",
  "appointmentDate": "2024-12-25",
  "appointmentTime": "10:00",
  "status": "checked_in",
  "notes": "Xét nghiệm sinh hóa",
  "checkedInAt": "2024-12-25T09:55:00Z"
}
```

### UI Display:
```
┌──────────────────────────────────────┐
│ Lịch hẹn #2                          │
│ ─────────────────────────────────────│
│ 📅 25/12/2024 - 10:00                │
│ 👤 Trần Thị Khỏe                     │
│ 👨‍⚕️ Bác sĩ Nguyễn Văn A              │
│ 🟢 Đã check-in                       │
│ ⏰ Check-in lúc: 09:55                │
│                                       │
│ [🩸 Lấy mẫu] [👁️ Xem chi tiết]      │
└──────────────────────────────────────┘
```

---

## 📊 So sánh trực tiếp

| Tiêu chí | Đã xác nhận (confirmed) 🔵 | Đã check-in (checked_in) 🟢 |
|---------|---------------------------|----------------------------|
| **Vị trí bệnh nhân** | Ở nhà / Đang đến | **Đã có mặt tại phòng khám** |
| **Thời gian** | Trước giờ hẹn | Trong hoặc sau giờ hẹn |
| **Có thể lấy mẫu?** | ❌ KHÔNG | ✅ **CÓ** |
| **Button hiển thị** | "Check-in" | **"Lấy mẫu"** |
| **Có thể hủy?** | ✅ Có | ❌ Không (đã check-in) |
| **Đánh dấu không đến?** | ✅ Có (nếu quá giờ) | ❌ Không (đã đến rồi) |
| **Bước tiếp theo** | Check-in bệnh nhân | **Lấy mẫu xét nghiệm** |
| **Trách nhiệm** | Lễ tân/Lab User check-in | Lab User lấy mẫu |

---

## 🎯 Workflow Transitions

### Từ "Đã xác nhận" → "Đã check-in"

**Trigger:** Lab User nhấn nút **"Check-in"**

**Điều kiện:**
- Bệnh nhân đã đến phòng khám
- Trong khoảng thời gian cho phép (T-15' đến T+30')
- Appointment status = `confirmed`

**Code:**
```javascript
// In LabUserDashboard.js or Appointments.js
const handleCheckIn = async (appointmentId) => {
  const response = await appointmentService.checkInAppointment(appointmentId);
  if (response.success) {
    // Status changed: confirmed → checked_in
    // Show success message
    // Reload data
  }
};
```

**Result:**
- ✅ Status: `confirmed` → `checked_in`
- ✅ Timestamp: `checkedInAt` được ghi nhận
- ✅ Button: "Check-in" → "Lấy mẫu"
- ✅ Badge color: Warning (yellow) → Info (blue)

---

### Từ "Đã check-in" → "Đã lấy mẫu"

**Trigger:** Lab User nhấn nút **"Lấy mẫu"** và hoàn thành form

**Điều kiện:**
- Bệnh nhân đã check-in
- Appointment status = `checked_in`
- Lab User điền đầy đủ thông tin mẫu

**Code:**
```javascript
// In LabUserDashboard.js
const handleCollectSample = async (appointmentId) => {
  // Open modal
  // User fills: sampleType, volume, notes
  
  const response = await sampleService.createSampleWithSync({
    sampleType: 'Máu toàn phần',
    volume: 5,
    notes: 'Mẫu tốt'
  }, appointmentId);
  
  if (response.success) {
    // Status changed: checked_in → sample_collected
    // Sample record created
    // LabTest record created
  }
};
```

**Result:**
- ✅ Status: `checked_in` → `sample_collected`
- ✅ Sample record được tạo với status `collected`
- ✅ LabTest record được tạo với status `pending`
- ✅ Button: "Lấy mẫu" → "Xem chi tiết"
- ✅ Badge: "Đã lấy mẫu" (info blue)

---

## 💡 Use Cases trong thực tế

### Scenario 1: Bệnh nhân đến đúng giờ ✅

**Timeline:**
```
08:45 - Status: confirmed (Đã xác nhận)
        Bệnh nhân đang trên đường đến

09:00 - Bệnh nhân đến phòng khám
        Lab User: "Chào anh/chị, anh/chị có lịch hẹn phải không?"
        Lab User nhấn "Check-in" trên hệ thống
        
09:00 - Status: checked_in (Đã check-in)
        Bệnh nhân ngồi chờ tại phòng chờ
        
09:05 - Lab User gọi tên: "Anh/chị Nguyễn Văn Bệnh!"
        Lab User nhấn "Lấy mẫu"
        Lấy mẫu máu tại phòng lấy mẫu
        Điền thông tin: Loại mẫu, thể tích, ghi chú
        Nhấn "Lưu"
        
09:10 - Status: sample_collected (Đã lấy mẫu)
        Bệnh nhân về nhà, chờ kết quả
```

---

### Scenario 2: Bệnh nhân đến sớm ⏰

**Timeline:**
```
09:30 - Status: confirmed (Đã xác nhận)
        Giờ hẹn: 10:00
        Bệnh nhân đã đến sớm lúc 09:30
        
09:30 - Lab User check-in bệnh nhân
        Status: confirmed → checked_in
        
09:30-10:00 - Bệnh nhân chờ tại phòng chờ
              Status vẫn là: checked_in
              
10:00 - Đến giờ hẹn
        Lab User gọi tên và lấy mẫu
        Status: checked_in → sample_collected
```

**Note:** Bệnh nhân có thể được check-in sớm (trong khoảng T-15'), nhưng **LẤY MẪU** thường đúng giờ hẹn hoặc theo thứ tự.

---

### Scenario 3: Bệnh nhân không đến ❌

**Timeline:**
```
09:00 - Status: confirmed (Đã xác nhận)
        Giờ hẹn: 09:00
        Bệnh nhân không đến
        
09:30 - Lab User chờ 30 phút
        Bệnh nhân vẫn không đến
        
09:30 - Lab User đánh dấu "Không đến"
        Status: confirmed → no_show
        
        Appointment kết thúc
```

---

## 🖥️ UI/UX Guidelines

### Badge Colors:

| Status | Badge Color | Icon | Meaning |
|--------|------------|------|---------|
| confirmed | 🟡 Warning (Yellow) | 📅 | Chờ bệnh nhân đến |
| checked_in | 🔵 Info (Blue) | ✅ | Bệnh nhân đã đến, chờ lấy mẫu |
| sample_collected | 🔵 Info (Blue) | 🩸 | Đã lấy mẫu |
| sample_processed | 🔵 Info (Blue) | ⚗️ | Đã xử lý mẫu |
| result_pending | 🟡 Warning (Yellow) | ⏳ | Chờ xác nhận KQ |
| waiting_review | 🟡 Warning (Yellow) | 👨‍⚕️ | Chờ bác sĩ |
| completed | 🟢 Success (Green) | ✔️ | Hoàn thành |
| no_show | 🔴 Danger (Red) | ❌ | Không đến |

### Button Visibility:

```jsx
// Appointments.js
{appointment.status === 'confirmed' && (
  <Button onClick={() => handleCheckIn(appointment.id)}>
    Check-in
  </Button>
)}

{appointment.status === 'checked_in' && (
  <Button onClick={() => handleCollectSample(appointment.id)}>
    Lấy mẫu
  </Button>
)}

{['sample_collected', 'sample_processed', 'result_pending'].includes(appointment.status) && (
  <Button onClick={() => handleViewDetail(appointment.id)}>
    Xem chi tiết
  </Button>
)}
```

---

## 📝 Summary

### Tóm lại sự khác biệt:

**"Đã xác nhận" (confirmed) = Bệnh nhân CHƯA ĐẾN**
- 🏠 Ở nhà
- 📅 Chờ đến ngày hẹn
- ⏰ Có thể check-in khi đến

**"Đã check-in" (checked_in) = Bệnh nhân ĐÃ ĐẾN**
- 🏥 Có mặt tại phòng khám
- 🪑 Đang chờ lấy mẫu
- 🩸 Sẵn sàng để lấy mẫu

### Key Difference:
```
confirmed  = "Appointment is ready, waiting for patient to arrive"
checked_in = "Patient has arrived, ready for sample collection"
```

---

**Document Version:** 1.0
**Last Updated:** 2024-10-23
**Related Docs:**
- `WORKFLOW_IMPLEMENTATION_COMPLETE.md`
- `APPOINTMENTS_STATUS_FIX.md`
- `src/constants/status.js`

