# Quick Integration Guide - Lab Results Management Components

## Tổng Quan
Document này hướng dẫn nhanh cách tích hợp 3 components mới vào `ResultsDashboardPage.jsx`:
1. **CommentsSection** - Quản lý ghi chú
2. **AbnormalValueIndicator** - Đánh dấu giá trị bất thường
3. **LabUserTracker** - Tracking người thực hiện

---

## 📦 Bước 1: Import Components & Hooks

Thêm vào đầu file `ResultsDashboardPage.jsx`:

```javascript
// Import new components
import CommentsSection from '../components/CommentsSection';
import { 
  useFlaggingConfigurations, 
  ParameterFlagIndicator,
  getParameterValueStyle,
  TestResultFlagSummary 
} from '../components/AbnormalValueIndicator';
import { 
  useLabUserProfiles,
  LabUserCard,
  LabUserBadge,
  prepareTestResultPayloadWithLabUser
} from '../components/LabUserTracker';
```

---

## 🎣 Bước 2: Initialize Hooks

Thêm vào trong component (sau các useState hiện tại):

```javascript
const ResultsDashboardPage = () => {
  // ... existing state ...
  
  // NEW: Initialize flagging configurations
  const { 
    configs: flaggingConfigs, 
    loading: loadingConfigs, 
    getConfigForParameter 
  } = useFlaggingConfigurations();
  
  // NEW: Initialize lab user profiles
  const { 
    labUsers, 
    loading: loadingLabUsers, 
    getLabUserById 
  } = useLabUserProfiles();
  
  // ... rest of component ...
};
```

---

## 🔧 Bước 3: Update handleSaveResults

Cập nhật function `handleSaveResults` để include lab user info:

```javascript
const handleSaveResults = async () => {
  try {
    // ... existing validation ...
    
    setSaving(true);
    
    // NEW: Prepare payload with lab user tracking
    const testResultPayload = prepareTestResultPayloadWithLabUser(
      {
        appointmentId: appointmentId,
        sampleId: selectedTest.sampleId,
        reagentCode: selectedTest.reagentCode || '',
        quantity: selectedTest.quantity || 0,
        deviceId: selectedTest.deviceId || 'DEV-001',
        status: 'Pending',
        parameters: selectedTestParams.map(p => ({
          CriteriaId: p.CriteriaId || p.id,
          ParamName: p.ParamName || p.name || p.paramName,
          Abbreviation: p.Abbreviation || p.abbreviation,
          Value: p.Value || p.value || '',
          Unit: p.Unit || p.unit || '',
          NormalRange: p.NormalRange || p.normalRange || '',
          Note: p.Note || p.note || ''
        }))
      },
      user?.id || user?.userId,  // Lab user ID
      user?.fullName || user?.name  // Lab user name
    );
    
    // ... rest of save logic (create/update) ...
    
  } catch (error) {
    console.error('[handleSaveResults] Error:', error);
    showError('Lỗi khi lưu kết quả: ' + error.message);
  } finally {
    setSaving(false);
  }
};
```

---

## 🎨 Bước 4: Update Table Display

Thêm cột "Người thực hiện" và "Cảnh báo" vào bảng danh sách:

```javascript
<Table striped bordered hover responsive>
  <thead>
    <tr>
      <th>STT</th>
      <th>Bệnh nhân</th>
      <th>Loại xét nghiệm</th>
      <th>Mẫu</th>
      <th>Ngày</th>
      {/* NEW: Người thực hiện column */}
      <th>Người thực hiện</th>
      {/* NEW: Cảnh báo column */}
      <th>Cảnh báo</th>
      <th>Trạng thái</th>
      <th>Thao tác</th>
    </tr>
  </thead>
  <tbody>
    {filteredTests.map((test, index) => (
      <tr key={test.id || index}>
        <td>{index + 1}</td>
        <td>{test.patientName}</td>
        <td>{test.testType}</td>
        <td>{test.sampleCode}</td>
        <td>{formatDate(test.appointmentDate)}</td>
        
        {/* NEW: Show lab user badge */}
        <td>
          {test.performedBy ? (
            <LabUserBadge userId={test.performedBy} labUsers={labUsers} />
          ) : (
            <Badge bg="secondary">Chưa thực hiện</Badge>
          )}
        </td>
        
        {/* NEW: Show flag summary */}
        <td>
          <TestResultFlagSummary 
            parameters={test.results?.params || []} 
            configs={flaggingConfigs} 
          />
        </td>
        
        <td>
          <Badge bg={getStatusBadge(test.status)}>
            {test.status}
          </Badge>
        </td>
        <td>
          {/* ... existing action buttons ... */}
        </td>
      </tr>
    ))}
  </tbody>
</Table>
```

---

## 📋 Bước 5: Update Modal Content

Cập nhật modal để hiển thị lab user info, flags, và comments:

```javascript
<Modal show={showModal} onHide={() => setShowModal(false)} size="xl">
  <Modal.Header closeButton>
    <Modal.Title>Chi Tiết Kết Quả Xét Nghiệm</Modal.Title>
  </Modal.Header>
  
  <Modal.Body>
    {/* NEW: Lab User Card - show who performed the test */}
    {selectedTest && selectedTest.performedBy && (
      <LabUserCard
        userId={selectedTest.performedBy}
        labUsers={labUsers}
        performedAt={selectedTest.performedAt}
      />
    )}
    
    {/* Existing: Patient Info Card */}
    <Card className="mb-3">
      {/* ... existing patient info ... */}
    </Card>
    
    {/* NEW: Enhanced Parameters Table with Flags */}
    <Card className="mb-3">
      <Card.Header>
        <strong>📊 Kết Quả Xét Nghiệm</strong>
        {/* NEW: Summary badge */}
        <TestResultFlagSummary 
          parameters={selectedTestParams} 
          configs={flaggingConfigs} 
        />
      </Card.Header>
      <Card.Body>
        <Table striped bordered hover>
          <thead>
            <tr>
              <th>Chỉ số</th>
              <th>Giá trị</th>
              <th>Đơn vị</th>
              <th>Giá trị bình thường</th>
              <th>Ghi chú</th>
            </tr>
          </thead>
          <tbody>
            {selectedTestParams && selectedTestParams.map((param, index) => {
              // NEW: Get config and style for this parameter
              const config = getConfigForParameter(param.ParamName, param.Abbreviation);
              const valueStyle = getParameterValueStyle(param.Value, config);
              
              return (
                <tr key={index}>
                  <td>
                    <strong>{param.ParamName || 'N/A'}</strong>
                    <br />
                    <small className="text-muted">{param.Abbreviation}</small>
                  </td>
                  <td>
                    {isEditable ? (
                      <Form.Control
                        type="text"
                        value={param.Value || ''}
                        onChange={(e) => handleParamChange(index, 'Value', e.target.value)}
                        placeholder="Nhập giá trị..."
                      />
                    ) : (
                      <>
                        {/* NEW: Apply style based on flag */}
                        <span style={valueStyle}>
                          {param.Value || 'N/A'}
                        </span>
                        {/* NEW: Show flag indicator */}
                        <ParameterFlagIndicator param={param} config={config} />
                      </>
                    )}
                  </td>
                  <td>{param.Unit || 'N/A'}</td>
                  <td>{param.NormalRange || 'N/A'}</td>
                  <td>
                    {isEditable ? (
                      <Form.Control
                        type="text"
                        value={param.Note || ''}
                        onChange={(e) => handleParamChange(index, 'Note', e.target.value)}
                        placeholder="Ghi chú..."
                      />
                    ) : (
                      param.Note || ''
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      </Card.Body>
    </Card>
    
    {/* NEW: Comments Section */}
    {selectedTest && selectedTest.appointmentId && (
      <CommentsSection
        appointmentId={selectedTest.appointmentId}
        user={user}
        onError={showError}
        onSuccess={showSuccess}
      />
    )}
  </Modal.Body>
  
  <Modal.Footer>
    <Button variant="secondary" onClick={() => setShowModal(false)}>
      Đóng
    </Button>
    {isEditable && (
      <>
        <Button 
          variant="primary" 
          onClick={handleSaveResults}
          disabled={saving}
        >
          {saving ? 'Đang lưu...' : '💾 Lưu Kết Quả'}
        </Button>
        <Button 
          variant="success" 
          onClick={handleConfirmResults}
          disabled={sending}
        >
          {sending ? 'Đang gửi...' : '✅ Xác Nhận & Gửi Bác Sĩ'}
        </Button>
      </>
    )}
  </Modal.Footer>
</Modal>
```

---

## 🎯 Bước 6: Add Loading States

Thêm loading indicators cho các hooks mới:

```javascript
// In the render section
if (loading || loadingConfigs || loadingLabUsers) {
  return (
    <Container className="mt-4">
      <div className="text-center py-5">
        <Spinner animation="border" variant="primary" />
        <div className="mt-3">Đang tải dữ liệu...</div>
      </div>
    </Container>
  );
}
```

---

## ✅ Testing Checklist

Sau khi tích hợp, kiểm tra các tính năng:

### Comments Feature
- [ ] Comments section xuất hiện trong modal
- [ ] Có thể thêm comment mới
- [ ] Comments được sắp xếp theo thời gian (mới nhất trước)
- [ ] Có thể xóa comment của mình
- [ ] Comments được reload sau khi thêm/xóa

### Flagging System
- [ ] Giá trị bất thường được highlight (màu vàng/đỏ)
- [ ] Badge cảnh báo xuất hiện đúng
- [ ] Tooltip hiển thị thông tin chi tiết
- [ ] Summary badge trong danh sách chính xác
- [ ] Không có lỗi khi config chưa load

### Lab User Tracking
- [ ] Người thực hiện được hiển thị trong danh sách
- [ ] Lab User Card xuất hiện trong modal
- [ ] Thông tin lab user đầy đủ (tên, giấy phép, chuyên môn)
- [ ] Khi save kết quả, lab user được ghi lại
- [ ] Badge hiển thị đúng trong bảng

---

## 🔍 Debugging Tips

### If Comments Don't Load
```javascript
// Check in console
console.log('Appointment ID:', selectedTest.appointmentId);
console.log('Comments API Response:', await testOrderService.getTestOrderCommentsByAppointment(selectedTest.appointmentId));
```

### If Flags Don't Show
```javascript
// Check flagging configs
console.log('Flagging Configs:', flaggingConfigs);
console.log('Config for WBC:', getConfigForParameter('White Blood Cell Count', 'WBC'));
```

### If Lab User Not Showing
```javascript
// Check lab users
console.log('Lab Users:', labUsers);
console.log('Current User:', user);
console.log('Performed By:', selectedTest.performedBy);
```

---

## 📚 API Endpoints Being Used

```javascript
// Comments
GET /gateway/testorder/testordercomment/appointment/{appointmentId}
POST /gateway/testorder/testordercomment
DELETE /gateway/testorder/testordercomment/{id}

// Flagging Configurations
GET /gateway/testorder/flaggingconfiguration

// Lab User Profiles
GET /gateway/testorder/labuserprofile
```

---

## 🎨 Optional: Custom Styling

Thêm vào CSS file của bạn:

```css
/* Comments Section */
.comments-section {
  margin-top: 1rem;
  padding: 1rem;
  background-color: #f8f9fa;
  border-radius: 8px;
}

.comments-list {
  max-height: 400px;
  overflow-y: auto;
}

.comment-text {
  white-space: pre-wrap;
  word-break: break-word;
  line-height: 1.5;
}

.list-group-item {
  border-left: 3px solid #0d6efd;
}

/* Flagging Indicators */
.parameter-value-critical {
  color: #dc3545;
  font-weight: bold;
  background-color: #f8d7da;
  padding: 2px 6px;
  border-radius: 4px;
}

.parameter-value-warning {
  color: #856404;
  font-weight: 600;
  background-color: #fff3cd;
  padding: 2px 6px;
  border-radius: 4px;
}

/* Lab User Info */
.lab-user-info {
  padding: 0.5rem;
}

.lab-user-info strong {
  color: #0d6efd;
}

.lab-user-badge {
  cursor: help;
}
```

---

## 🚀 Advanced Features (Optional)

### 1. Real-time Comments Update
```javascript
// Add polling or WebSocket for real-time comments
useEffect(() => {
  if (!selectedTest?.appointmentId) return;
  
  const interval = setInterval(() => {
    loadComments();
  }, 30000); // Refresh every 30 seconds
  
  return () => clearInterval(interval);
}, [selectedTest?.appointmentId]);
```

### 2. Export Results with Flags
```javascript
const exportResultsWithFlags = () => {
  const resultsWithFlags = selectedTestParams.map(param => {
    const config = getConfigForParameter(param.ParamName, param.Abbreviation);
    const flag = determineFlagLevel(param.Value, config);
    
    return {
      ...param,
      flagLevel: flag?.level || 'NORMAL',
      flagMessage: flag?.message || ''
    };
  });
  
  // Export to PDF/Excel
  exportToPDF(resultsWithFlags);
};
```

### 3. Email Notification for Critical Values
```javascript
const checkCriticalValuesAndNotify = async (params) => {
  const criticalParams = params.filter(param => {
    const config = getConfigForParameter(param.ParamName, param.Abbreviation);
    const flag = determineFlagLevel(param.Value, config);
    return flag?.level.includes('CRITICAL');
  });
  
  if (criticalParams.length > 0) {
    // Send email notification
    await emailService.sendCriticalResultAlert({
      patientId: selectedTest.patientId,
      criticalParams: criticalParams,
      labUser: user
    });
  }
};
```

---

## 📝 Summary

Sau khi hoàn thành integration, bạn sẽ có:

✅ **Comments System**: Ghi chú và trao đổi về kết quả xét nghiệm  
✅ **Flagging System**: Tự động phát hiện và đánh dấu giá trị bất thường  
✅ **Lab User Tracking**: Theo dõi người thực hiện xét nghiệm  
✅ **Enhanced UI**: Giao diện trực quan với badges, colors, tooltips  
✅ **Better Validation**: Kiểm tra dữ liệu dựa trên criteria ranges  

---

**Next Steps**: Deploy và training cho team sử dụng các tính năng mới!

**Support**: Tham khảo `LAB_RESULTS_MANAGEMENT_FEATURES.md` để biết chi tiết về các API và data structures.
