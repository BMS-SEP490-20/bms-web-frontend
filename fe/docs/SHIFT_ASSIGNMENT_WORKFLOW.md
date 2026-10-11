# Workflow Phân Bổ Ca Làm Việc & Lịch Hẹn

## 📋 Tổng Quan

Chức năng **Quản lý ca làm việc & Phân bổ lịch hẹn** đã được gộp thành một tab duy nhất với workflow mới, tích hợp chặt chẽ với chức năng tự động phân bổ ca.

## 🔄 Workflow Mới

### Bước 1: Tạo Ca Làm Việc

Có 2 cách tạo ca làm việc:

#### 1.1. Tự Động Phân Bổ Ca (Khuyến nghị)
- **Vị trí**: Nút "Tự động phân bổ ca" ở header
- **Chức năng**: 
  - Tự động random phân bổ ca làm việc cho 3 role (Bác sĩ, Lab User, Lễ tân) trong 1 tháng
  - Áp dụng các ràng buộc thực tế:
    - Không làm 2 ca liên tiếp trong cùng 1 ngày (trừ ca sáng + ca tối)
    - Không làm quá 5 ngày liên tiếp
    - Mỗi ca đảm bảo có ít nhất 1 bác sĩ và 1 lab user
    - Phân bổ đều trong tuần
- **Tùy chọn**:
  - Chọn tháng/năm
  - Bao gồm Lễ tân (checkbox)
  - **Tự động phân bổ lịch hẹn sau khi tạo ca** (checkbox) - Tự động gán lịch hẹn vào các ca vừa tạo

#### 1.2. Tạo Ca Thủ Công
- **Vị trí**: Nút "Thêm ca thủ công" ở header
- **Chức năng**: Tạo ca làm việc cho từng nhân viên cụ thể
- **Thông tin cần nhập**:
  - Nhân viên (Bác sĩ/Lab User/Lễ tân)
  - Ngày làm việc
  - Giờ bắt đầu - Giờ kết thúc
  - Phòng làm việc
  - Ghi chú (tùy chọn)

### Bước 2: Xem & Quản Lý Ca Làm Việc

#### 2.1. Chế Độ Xem
- **Lịch (theo ngày)**: Hiển thị ca làm việc và lịch hẹn theo từng ca (sáng/chiều/tối)
- **Danh sách**: Hiển thị dạng bảng, dễ so sánh

#### 2.2. Bộ Lọc
- **Chọn ngày**: Xem ca làm việc và lịch hẹn của ngày cụ thể
- **Lọc theo role**: Tất cả / Bác sĩ / Lab User / Lễ tân

#### 2.3. Thao Tác Với Ca Làm Việc
- **Sửa**: Chỉnh sửa thông tin ca làm việc
- **Xóa**: Xóa ca làm việc (có xác nhận)
- **Thay đổi trạng thái**: scheduled → in_progress → completed

### Bước 3: Phân Bổ Lịch Hẹn

Có 2 cách phân bổ lịch hẹn:

#### 3.1. Tự Động Phân Bổ Lịch Hẹn
- **Vị trí**: Nút "Tự động phân bổ lịch hẹn" ở filter bar
- **Chức năng**:
  - Tự động tìm ca làm việc phù hợp với từng lịch hẹn (cùng ngày, cùng giờ)
  - Tự động gán bác sĩ/lab user từ ca làm việc
  - Tự động gán phòng từ ca làm việc
  - Ưu tiên chọn ca có bác sĩ trước, sau đó mới đến lab user
- **Điều kiện**:
  - Phải có ca làm việc trước
  - Lịch hẹn phải ở trạng thái "confirmed" hoặc "scheduled"
  - Ca làm việc phải ở trạng thái "scheduled"

#### 3.2. Phân Bổ Thủ Công
- **Vị trí**: Nút "Phân bổ" trên mỗi lịch hẹn
- **Chức năng**:
  - Chọn ca làm việc từ danh sách
  - Hệ thống tự động gán bác sĩ/lab user từ ca làm việc
  - Có thể chỉnh sửa phòng nếu cần
- **Workflow**:
  1. Click "Phân bổ" trên lịch hẹn
  2. Chọn ca làm việc phù hợp (chỉ hiển thị ca trong ngày của lịch hẹn)
  3. Hệ thống tự động điền:
     - Bác sĩ (nếu ca là của bác sĩ)
     - Lab User (nếu ca là của lab user)
     - Phòng (từ ca làm việc)
     - Giờ (từ ca làm việc)
  4. Click "Lưu phân bổ"

## 🔗 Tích Hợp Với Tự Động Phân Bổ Ca

### Quy Trình Hoàn Chỉnh:

```
1. Tạo ca tự động (tháng/năm)
   ↓
2. Hệ thống tự động tạo ca với các ràng buộc
   ↓
3. (Tùy chọn) Tự động phân bổ lịch hẹn vào các ca vừa tạo
   ↓
4. Xem kết quả trong unified view
   ↓
5. Điều chỉnh thủ công nếu cần
```

### Lợi Ích:

1. **Tiết kiệm thời gian**: Tự động hóa toàn bộ quy trình
2. **Đảm bảo công bằng**: Mỗi nhân viên có số ca tương đương
3. **Tuân thủ ràng buộc**: Không vi phạm các quy tắc làm việc
4. **Tự động đồng bộ**: Lịch hẹn tự động được gán vào ca phù hợp

## 📊 Cấu Trúc Dữ Liệu

### Ca Làm Việc (Shift)
```javascript
{
  id: number,
  userId: number,
  userName: string,
  role: 'doctor' | 'lab_user' | 'receptionist',
  shiftDate: string (YYYY-MM-DD),
  startTime: string (HH:mm),
  endTime: string (HH:mm),
  room: string,
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled',
  notes: string,
  createdAt: string,
  updatedAt: string
}
```

### Lịch Hẹn (Appointment) - Sau Khi Phân Bổ
```javascript
{
  id: number,
  patientId: number,
  appointmentCode: string,
  appointmentDate: string (YYYY-MM-DD),
  appointmentTime: string (HH:mm),
  service: string,
  status: string,
  doctorId: number,        // Tự động từ ca làm việc
  labUserId: number,       // Tự động từ ca làm việc
  room: string,            // Tự động từ ca làm việc
  shiftId: number,         // ID của ca làm việc
  ...
}
```

## 🎯 Các Ràng Buộc Thực Tế

### Ràng Buộc Về Ca Làm Việc:
1. **Không làm 2 ca liên tiếp trong cùng 1 ngày**
   - ❌ Không cho phép: Ca sáng (07:00) + Ca chiều (13:00)
   - ❌ Không cho phép: Ca chiều (13:00) + Ca tối (18:00)
   - ✅ Cho phép: Ca sáng (07:00) + Ca tối (18:00) - có thời gian nghỉ

2. **Không làm quá 5 ngày liên tiếp**
   - Tự động reset counter khi có ngày nghỉ ở giữa
   - Đảm bảo nhân viên có thời gian nghỉ ngơi

3. **Mỗi ca đảm bảo có đủ nhân lực**
   - Ít nhất 1 bác sĩ
   - Ít nhất 1 lab user
   - Có thể thêm lễ tân nếu cần

4. **Phân bổ đều trong tuần**
   - Tránh tập trung vào đầu tuần hoặc cuối tuần
   - Chỉ tạo ca cho các ngày trong tuần (thứ 2 - thứ 6)

### Ràng Buộc Về Phân Bổ Lịch Hẹn:
1. **Phải có ca làm việc trước**
   - Không thể phân bổ lịch hẹn nếu chưa có ca làm việc

2. **Cùng ngày và cùng giờ**
   - Lịch hẹn chỉ có thể phân bổ vào ca làm việc cùng ngày
   - Ưu tiên ca có cùng giờ bắt đầu

3. **Tự động gán từ ca làm việc**
   - Bác sĩ/lab user được tự động lấy từ ca làm việc
   - Phòng được tự động lấy từ ca làm việc
   - Giờ được tự động cập nhật từ ca làm việc

## 💡 Best Practices

1. **Sử dụng tự động phân bổ ca hàng tháng**
   - Tạo ca cho cả tháng một lần
   - Bật tùy chọn "Tự động phân bổ lịch hẹn" để tiết kiệm thời gian

2. **Kiểm tra và điều chỉnh**
   - Sau khi tự động phân bổ, kiểm tra lại trong unified view
   - Điều chỉnh thủ công các trường hợp đặc biệt

3. **Quản lý theo ngày**
   - Sử dụng filter ngày để xem chi tiết từng ngày
   - Dễ dàng phát hiện và xử lý các vấn đề

4. **Theo dõi trạng thái**
   - Cập nhật trạng thái ca làm việc khi bắt đầu/kết thúc
   - Giúp theo dõi tiến độ làm việc

## 🔄 Luồng Hoạt Động Chi Tiết

### Scenario 1: Tạo Ca Tự Động + Tự Động Phân Bổ Lịch Hẹn

```
1. Manager click "Tự động phân bổ ca"
   ↓
2. Chọn tháng/năm, bật "Tự động phân bổ lịch hẹn"
   ↓
3. Hệ thống tạo ca tự động với ràng buộc
   ↓
4. Hệ thống tự động phân bổ lịch hẹn vào các ca vừa tạo
   ↓
5. Hiển thị kết quả trong unified view
```

### Scenario 2: Phân Bổ Thủ Công

```
1. Manager xem lịch hẹn cần phân bổ
   ↓
2. Click "Phân bổ" trên lịch hẹn
   ↓
3. Chọn ca làm việc phù hợp
   ↓
4. Hệ thống tự động điền bác sĩ/lab user/phòng
   ↓
5. Xác nhận và lưu
```

### Scenario 3: Tự Động Phân Bổ Lịch Hẹn Sau Khi Có Ca

```
1. Manager đã có ca làm việc (tạo thủ công hoặc tự động)
   ↓
2. Có lịch hẹn mới cần phân bổ
   ↓
3. Click "Tự động phân bổ lịch hẹn"
   ↓
4. Hệ thống tự động tìm và gán ca phù hợp
   ↓
5. Hiển thị kết quả
```

## 📝 Ghi Chú

- Tất cả các thao tác đều có thông báo thành công/lỗi
- Có thể xem lại lịch sử phân bổ
- Có thể chỉnh sửa/cập nhật bất cứ lúc nào
- Hệ thống tự động đồng bộ thông tin giữa ca làm việc và lịch hẹn

