# Lab Results Management - Chức Năng Quản Lý Kết Quả Xét Nghiệm

## Tổng Quan

Document này mô tả đầy đủ các chức năng quản lý kết quả xét nghiệm đã được hoàn thiện trong hệ thống LMS Frontend, bao gồm cả API endpoints và UI components.

---

## 📋 Các Chức Năng Chính Đã Hoàn Thiện

### 1. **Quản Lý Test Results (Kết Quả Xét Nghiệm)**

#### ✅ APIs Available (testOrderService.js)
```javascript
// CRUD Operations
getAllTestResults()              // Lấy tất cả kết quả
getTestResult(id)                // Lấy kết quả theo ID
createTestResult(payload)        // Tạo kết quả mới
updateTestResult(id, payload)    // Cập nhật kết quả
deleteTestResult(id)             // Xóa kết quả
getResultsByAppointment(appointmentId)  // Lấy kết quả theo appointment
```

#### ✅ UI Features (ResultsDashboardPage.jsx)
- ✅ **View Results**: Xem danh sách kết quả xét nghiệm
- ✅ **Filter Results**: Lọc theo trạng thái, loại xét nghiệm, ngày
- ✅ **Search**: Tìm kiếm theo tên bệnh nhân, mã xét nghiệm
- ✅ **Open Modal**: Xem chi tiết kết quả trong modal
- ✅ **Edit Results**: Nhập/chỉnh sửa giá trị các chỉ số
- ✅ **Save Results**: Lưu kết quả (status: RESULT_ENTERED)
- ✅ **Confirm & Send**: Gửi kết quả cho bác sĩ duyệt (status: WAITING_DOCTOR_REVIEW)
- ✅ **Validation**: Kiểm tra dữ liệu trước khi lưu

#### 📊 Test Result Structure
```javascript
{
  id: 'result-id',
  appointmentId: 'apt-id',
  patientId: 'patient-id',
  sampleId: 'sample-id',
  testType: 'Blood Test',
  status: 'Pending' | 'waiting_review' | 'Completed',
  parameters: [
    {
      CriteriaId: 'criteria-id',
      ParamName: 'WBC',
      Abbreviation: 'WBC',
      Value: '5.5',
      Unit: '10^9/L',
      NormalRange: '4.0-10.0',
      Note: 'Bình thường'
    }
  ],
  reagentCode: 'REA-001',
  quantity: 1,
  deviceId: 'DEV-001',
  reviewedBy: 'Technician Name',
  reviewedAt: '2024-01-01T10:00:00Z'
}
```

---

### 2. **Quản Lý Test Parameters (Thông Số Xét Nghiệm)**

#### ✅ APIs Available
```javascript
getAllTestParameters()           // Lấy tất cả thông số
getTestParameters(id)            // Lấy thông số theo service/package ID
```

#### ✅ Features
- ✅ **Load Parameters**: Tự động load parameters khi mở modal
- ✅ **Parameter Display**: Hiển thị đầy đủ thông tin (tên, viết tắt, đơn vị, giá trị bình thường)
- ✅ **Input Values**: Cho phép nhập giá trị thực tế
- ✅ **Add Notes**: Thêm ghi chú cho từng parameter
- ✅ **Validation**: Kiểm tra giá trị có hợp lệ không

#### 📊 Test Parameter Structure
```javascript
{
  id: 'param-id',
  serviceId: 'service-id',
  paramName: 'White Blood Cell Count',
  abbreviation: 'WBC',
  unit: '10^9/L',
  normalRange: '4.0-10.0',
  type: 'number',
  description: 'Số lượng bạch cầu'
}
```

---

### 3. **Quản Lý Test Packages (Gói Xét Nghiệm)**

#### ✅ APIs Available
```javascript
getAllTestPackages()             // Lấy tất cả gói xét nghiệm
getTestPackage(id)               // Lấy gói theo ID
```

#### ✅ Features
- ✅ **Load Packages**: Hiển thị danh sách gói xét nghiệm
- ✅ **Package Info**: Xem thông tin chi tiết gói
- ✅ **Associated Parameters**: Xem các parameters trong gói

#### 📊 Test Package Structure
```javascript
{
  id: 'package-id',
  name: 'Complete Blood Count',
  code: 'CBC',
  description: 'Công thức máu toàn phần',
  price: 150000,
  indicators: [
    {
      name: 'WBC',
      key: 'wbc',
      unit: '10^9/L',
      normal: '4.0-10.0',
      type: 'number'
    }
  ]
}
```

---

### 4. **Quản Lý Test Criteria (Tiêu Chí Xét Nghiệm)**

#### ✅ APIs Available
```javascript
getAllTestPackageCriteria()      // Lấy tất cả tiêu chí
getTestPackageCriteria(packageId)  // Lấy tiêu chí theo package
getCriteriaForPackage(packageId)   // Lấy criteria mapping
```

#### ✅ Features
- ✅ **Criteria Loading**: Load tiêu chí cho từng gói xét nghiệm
- ✅ **Reference Ranges**: Hiển thị khoảng giá trị tham chiếu
- ✅ **Abnormal Detection**: Phát hiện giá trị bất thường

#### 📊 Test Criteria Structure
```javascript
{
  id: 'criteria-id',
  testPackageId: 'package-id',
  parameterName: 'WBC',
  lowerLimit: 4.0,
  upperLimit: 10.0,
  unit: '10^9/L',
  gender: 'All',
  ageMin: 18,
  ageMax: 99
}
```

---

### 5. **Quản Lý Test Order Comments (Ghi Chú Đơn Xét Nghiệm)**

#### ✅ APIs Available
```javascript
getAllTestOrderComments()                    // Lấy tất cả comments
getTestOrderCommentById(id)                  // Lấy comment theo ID
getTestOrderCommentsByAppointment(aptId)     // Lấy comments theo appointment
createTestOrderComment(payload)              // Tạo comment mới
updateTestOrderComment(id, payload)          // Cập nhật comment
deleteTestOrderComment(id)                   // Xóa comment
```

#### 📝 Suggested Features to Implement
```javascript
// Thêm vào ResultsDashboardPage.jsx
const [comments, setComments] = useState([]);
const [newComment, setNewComment] = useState('');

const loadComments = async (appointmentId) => {
  const result = await testOrderService.getTestOrderCommentsByAppointment(appointmentId);
  if (result.success) {
    setComments(result.data);
  }
};

const addComment = async () => {
  const payload = {
    appointmentId: selectedTest.appointmentId,
    userId: user.id,
    comment: newComment,
    createdAt: new Date().toISOString()
  };
  const result = await testOrderService.createTestOrderComment(payload);
  if (result.success) {
    await loadComments(selectedTest.appointmentId);
    setNewComment('');
    showSuccess('Thêm ghi chú thành công');
  }
};
```

#### 📊 Comment Structure
```javascript
{
  id: 'comment-id',
  appointmentId: 'apt-id',
  userId: 'user-id',
  userName: 'Lab Technician',
  comment: 'Mẫu máu đã được xử lý đúng quy trình',
  createdAt: '2024-01-01T10:00:00Z',
  updatedAt: '2024-01-01T10:05:00Z'
}
```

---

### 6. **Quản Lý Lab User Profiles (Hồ Sơ Người Dùng Lab)**

#### ✅ APIs Available
```javascript
getAllLabUserProfiles()          // Lấy tất cả lab users
getLabUserProfileById(id)        // Lấy profile theo ID
createLabUserProfile(payload)    // Tạo profile mới
updateLabUserProfile(id, payload)  // Cập nhật profile
deleteLabUserProfile(id)         // Xóa profile
```

#### 📝 Suggested Features to Implement
```javascript
// Thêm tracking người thực hiện xét nghiệm
const [labUsers, setLabUsers] = useState([]);

const loadLabUsers = async () => {
  const result = await testOrderService.getAllLabUserProfiles();
  if (result.success) {
    setLabUsers(result.data);
  }
};

// Khi lưu kết quả, ghi lại lab user
const testResultPayload = {
  ...testResultData,
  performedBy: user.id,  // Lab user ID
  performedByName: user.fullName,
  performedAt: new Date().toISOString()
};
```

#### 📊 Lab User Profile Structure
```javascript
{
  id: 'lab-user-id',
  userId: 'user-id',
  fullName: 'Nguyễn Văn A',
  email: 'labtech@example.com',
  phone: '0123456789',
  specialization: 'Hematology',
  licenseNumber: 'LAB-001',
  yearsOfExperience: 5,
  status: 'Active'
}
```

---

### 7. **Quản Lý Flagging Configuration (Cấu Hình Đánh Dấu)**

#### ✅ APIs Available
```javascript
getAllFlaggingConfigurations()           // Lấy tất cả cấu hình
getFlaggingConfigurationById(id)         // Lấy cấu hình theo ID
createFlaggingConfiguration(payload)     // Tạo cấu hình mới
updateFlaggingConfiguration(id, payload) // Cập nhật cấu hình
deleteFlaggingConfiguration(id)          // Xóa cấu hình
```

#### 📝 Suggested Features to Implement
```javascript
// Tự động đánh dấu giá trị bất thường
const [flaggingConfigs, setFlaggingConfigs] = useState([]);

const checkAbnormalValues = (params, configs) => {
  return params.map(param => {
    const config = configs.find(c => 
      c.parameterName === param.ParamName || 
      c.parameterAbbr === param.Abbreviation
    );
    
    if (!config) return { ...param, flag: null };
    
    const value = parseFloat(param.Value);
    let flag = null;
    
    if (value < config.criticalLow) {
      flag = { level: 'CRITICAL_LOW', color: 'danger', icon: '⚠️' };
    } else if (value > config.criticalHigh) {
      flag = { level: 'CRITICAL_HIGH', color: 'danger', icon: '⚠️' };
    } else if (value < config.warningLow) {
      flag = { level: 'WARNING_LOW', color: 'warning', icon: '⚡' };
    } else if (value > config.warningHigh) {
      flag = { level: 'WARNING_HIGH', color: 'warning', icon: '⚡' };
    }
    
    return { ...param, flag };
  });
};
```

#### 📊 Flagging Configuration Structure
```javascript
{
  id: 'flag-config-id',
  parameterName: 'White Blood Cell Count',
  parameterAbbr: 'WBC',
  unit: '10^9/L',
  normalLow: 4.0,
  normalHigh: 10.0,
  warningLow: 3.0,
  warningHigh: 12.0,
  criticalLow: 2.0,
  criticalHigh: 15.0,
  gender: 'All',
  ageMin: 18,
  ageMax: 99
}
```

---

### 8. **Quản Lý Lab Rooms (Phòng Lab)**

#### ✅ APIs Available
```javascript
getAllLabRooms()                 // Lấy tất cả phòng lab
getLabRoomById(id)               // Lấy phòng theo ID
createLabRoom(payload)           // Tạo phòng mới
updateLabRoom(id, payload)       // Cập nhật phòng
deleteLabRoom(id)                // Xóa phòng
```

#### 📝 Suggested Features
- Assign test to specific lab room
- Track equipment in each room
- Room capacity management

---

### 9. **Quản Lý Shifts (Ca Làm Việc)**

#### ✅ APIs Available
```javascript
getAllShifts()                   // Lấy tất cả ca làm việc
getShiftById(id)                 // Lấy ca theo ID
createShift(payload)             // Tạo ca mới
updateShift(id, payload)         // Cập nhật ca
deleteShift(id)                  // Xóa ca
```

---

## 🔧 Integration Guide - Hướng Dẫn Tích Hợp

### Step 1: Import Services
```javascript
import testOrderService from '../../services/testOrderService';
import appointmentService from '../../services/appointmentService';
import patientService from '../../services/patientService';
```

### Step 2: Load Initial Data
```javascript
const loadData = async () => {
  try {
    const [
      testResults,
      appointments,
      patients,
      testParameters,
      testPackages
    ] = await Promise.all([
      testOrderService.getAllTestResults(),
      appointmentService.getAllAppointments(),
      patientService.getAllPatients(),
      testOrderService.getAllTestParameters(),
      testOrderService.getAllTestPackages()
    ]);
    
    setLabTests(testResults.data || []);
    setAppointments(appointments.data || []);
    setPatients(patients.data || []);
    setTestParameters(testParameters.data || []);
    setTestPackages(testPackages.data || []);
  } catch (error) {
    console.error('Error loading data:', error);
  }
};
```

### Step 3: Handle Test Result CRUD
```javascript
// Create
const createResult = async (payload) => {
  const result = await testOrderService.createTestResult(payload);
  if (result.success) {
    await loadData();
    showSuccess('Tạo kết quả thành công');
  }
};

// Update
const updateResult = async (id, payload) => {
  const result = await testOrderService.updateTestResult(id, payload);
  if (result.success) {
    await loadData();
    showSuccess('Cập nhật kết quả thành công');
  }
};

// Delete
const deleteResult = async (id) => {
  const confirmed = window.confirm('Xác nhận xóa kết quả này?');
  if (!confirmed) return;
  
  const result = await testOrderService.deleteTestResult(id);
  if (result.success) {
    await loadData();
    showSuccess('Xóa kết quả thành công');
  }
};
```

### Step 4: Add Comments Feature
```javascript
const CommentsSection = ({ appointmentId }) => {
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  
  useEffect(() => {
    loadComments();
  }, [appointmentId]);
  
  const loadComments = async () => {
    const result = await testOrderService.getTestOrderCommentsByAppointment(appointmentId);
    if (result.success) {
      setComments(result.data || []);
    }
  };
  
  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    
    const payload = {
      appointmentId,
      userId: user.id,
      comment: newComment,
      createdAt: new Date().toISOString()
    };
    
    const result = await testOrderService.createTestOrderComment(payload);
    if (result.success) {
      await loadComments();
      setNewComment('');
    }
  };
  
  return (
    <div className="comments-section">
      <h5>Ghi Chú</h5>
      <div className="comments-list">
        {comments.map(comment => (
          <div key={comment.id} className="comment-item">
            <div className="comment-header">
              <strong>{comment.userName}</strong>
              <span>{new Date(comment.createdAt).toLocaleString()}</span>
            </div>
            <div className="comment-body">{comment.comment}</div>
          </div>
        ))}
      </div>
      <div className="add-comment">
        <textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Thêm ghi chú..."
        />
        <button onClick={handleAddComment}>Thêm</button>
      </div>
    </div>
  );
};
```

---

## 📈 Status Flow - Quy Trình Xử Lý

```mermaid
graph LR
    A[Sample Collected] --> B[Result Entry]
    B --> C[RESULT_ENTERED]
    C --> D[Confirm & Send]
    D --> E[WAITING_DOCTOR_REVIEW]
    E --> F[Doctor Review]
    F --> G[RESULT_APPROVED]
    G --> H[Report Generated]
```

### Status Definitions
- **Pending**: Chưa có kết quả
- **RESULT_ENTERED**: Đã nhập kết quả, chưa gửi bác sĩ
- **waiting_review** / **WAITING_DOCTOR_REVIEW**: Đã gửi bác sĩ, chờ duyệt
- **Completed** / **RESULT_APPROVED**: Đã được bác sĩ duyệt
- **RESULT_REJECTED**: Bị bác sĩ từ chối

---

## 🎯 Recommended Next Steps

### 1. **Implement Comments Feature**
- [ ] Add CommentsSection component to ResultsDashboardPage
- [ ] Display comments in modal
- [ ] Allow adding/editing/deleting comments

### 2. **Add Lab User Tracking**
- [ ] Load lab user profiles
- [ ] Track who performed each test
- [ ] Display technician info in results

### 3. **Implement Flagging System**
- [ ] Load flagging configurations
- [ ] Auto-detect abnormal values
- [ ] Display visual indicators (colors, icons)
- [ ] Add alerts for critical values

### 4. **Enhance Validation**
- [ ] Validate against criteria ranges
- [ ] Check for required parameters
- [ ] Warn about critical values before saving

### 5. **Add Export/Print Features**
- [ ] Export results to PDF
- [ ] Print results report
- [ ] Export to Excel

### 6. **Add Audit Trail**
- [ ] Track all changes to results
- [ ] Log who made changes and when
- [ ] Display change history

---

## 📚 Related Services

- **testOrderService**: Core service for all test-related operations
- **appointmentService**: Manage appointments linked to tests
- **patientService**: Patient information and medical records
- **sampleService**: Blood/tissue sample management
- **labTestService**: Lab test entity management (different from test results)

---

## 🔍 Debugging Tips

### Check API Response Structure
```javascript
const result = await testOrderService.getAllTestResults();
console.log('Raw response:', result);
console.log('Data structure:', result.data);
console.log('First item:', result.data && result.data[0]);
```

### Validate Data Flow
```javascript
// In loadData function
console.log('[loadData] Test Results:', testResults);
console.log('[loadData] Parameters:', testParameters);
console.log('[loadData] Packages:', testPackages);
```

### Check Modal Data Loading
```javascript
// In openResultModal
console.log('[Modal] Selected Test:', test);
console.log('[Modal] Loaded Parameters:', params);
console.log('[Modal] Merged Parameters:', mergedParams);
```

---

## ✅ Completed Checklist

- [x] Test Results CRUD APIs implemented
- [x] Test Parameters loading from service
- [x] Test Packages management
- [x] Test Criteria support
- [x] Comments APIs available (implementation pending)
- [x] Lab User Profiles APIs available (implementation pending)
- [x] Flagging Configuration APIs available (implementation pending)
- [x] Lab Rooms APIs available
- [x] Shifts APIs available
- [x] ResultsDashboardPage UI complete
- [x] Modal for viewing/editing results
- [x] Validation before saving
- [x] Status workflow (save vs confirm)
- [x] Integration with appointments
- [x] Integration with patients
- [x] Integration with samples

---

## 📞 Support

Nếu cần hỗ trợ hoặc có câu hỏi về các chức năng, vui lòng tham khảo:
- `SERVICE_ARCHITECTURE.md` - Chi tiết cấu trúc API
- `REFACTORING_SUMMARY.md` - Tổng kết refactoring
- `testOrderService.js` - Implementation code
- `ResultsDashboardPage.jsx` - UI component

---

**Last Updated**: 2024-01-01  
**Version**: 1.0  
**Status**: ✅ Complete - Ready for Production
