# Hướng Dẫn Áp Dụng Logic Auto-Refresh

## Tổng Quan

Logic auto-refresh đã được triển khai để tự động làm mới dữ liệu sau các thao tác CRUD (Create, Read, Update, Delete) trên tất cả các role trong hệ thống. Điều này đảm bảo dữ liệu luôn được cập nhật ngay lập tức mà không cần hard refresh.

## Custom Hook: `useAutoRefresh`

Hook này được đặt tại `fe/src/shared/hooks/useAutoRefresh.js` và cung cấp các tính năng:

1. **Tự động refresh khi component mount** nếu có flag trong sessionStorage
2. **Lắng nghe custom events** để refresh khi có thay đổi
3. **Refresh khi navigate** đến trang có flag được set

## Cách Sử Dụng

### Bước 1: Import Hook và Helpers

```javascript
import { useAutoRefresh, dispatchRefreshEvent, setRefreshFlag } from '../../shared/hooks/useAutoRefresh';
```

### Bước 2: Cập Nhật Hàm Load Data

Hàm `loadData` cần nhận parameter `forceFresh`:

```javascript
const loadData = async (forceFresh = false) => {
  try {
    setLoading(true);
    
    // Nếu không force fresh, thử lấy từ cache trước
    if (!forceFresh) {
      const cachedResult = await getData('cacheKey', false);
      if (cachedResult.success && cachedResult.data) {
        setData(cachedResult.data);
        setLoading(false);
        return;
      }
    }
    
    // Force fresh fetch hoặc fallback
    const result = await service.getData();
    if (result.success) {
      setData(result.data);
    }
  } catch (error) {
    setError('Lỗi tải dữ liệu');
  } finally {
    setLoading(false);
  }
};
```

### Bước 3: Thêm Hook vào Component

```javascript
// Auto-refresh hook
useAutoRefresh(loadData, {
  eventName: 'dataTypeChanged', // Tên event (ví dụ: 'appointmentsChanged', 'patientsChanged')
  flagKey: 'shouldRefreshDataType' // Key trong sessionStorage (ví dụ: 'shouldRefreshAppointments')
});
```

### Bước 4: Dispatch Events Sau CRUD Operations

#### Sau khi Create:

```javascript
const handleCreate = async (data) => {
  const result = await service.create(data);
  if (result.success) {
    setSuccess('Tạo thành công');
    setRefreshFlag('dataType'); // Set flag
    dispatchRefreshEvent('dataType', 'created', { id: result.data?.id }); // Dispatch event
    loadData(true); // Force refresh
  }
};
```

#### Sau khi Update:

```javascript
const handleUpdate = async (id, data) => {
  const result = await service.update(id, data);
  if (result.success) {
    setSuccess('Cập nhật thành công');
    setRefreshFlag('dataType');
    dispatchRefreshEvent('dataType', 'updated', { id });
    loadData(true);
  }
};
```

#### Sau khi Delete:

```javascript
const handleDelete = async (id) => {
  const result = await service.delete(id);
  if (result.success) {
    setSuccess('Xóa thành công');
    setRefreshFlag('dataType');
    dispatchRefreshEvent('dataType', 'deleted', { id });
    loadData(true);
  }
};
```

## Các Component Đã Áp Dụng

### ✅ Patient Role
- `MyAppointments` - Đặt lịch, hủy lịch

### ✅ Admin Role
- `Accounts` - Quản lý tài khoản
- `Patients` - Quản lý bệnh nhân

### ⏳ Cần Áp Dụng

#### Admin Role
- `Appointments` - Quản lý lịch hẹn
- `Invoices` - Quản lý hóa đơn
- `Reports` - Báo cáo

#### Doctor Role
- `Schedule` - Lịch làm việc
- `PatientProfile` - Hồ sơ bệnh nhân

#### LabUser Role
- `LabUserTracker` - Theo dõi xét nghiệm

#### Receptionist Role
- `CheckIn` - Check-in bệnh nhân
- `CreatePatient` - Tạo hồ sơ bệnh nhân

#### Manager Role
- `Dashboard` - Dashboard quản lý
- Các chức năng quản lý khác

## Event Naming Convention

Sử dụng format: `{dataType}{Action}`

Ví dụ:
- `appointmentsCreated`
- `appointmentsUpdated`
- `appointmentsDeleted`
- `patientsCreated`
- `accountsUpdated`

## Flag Naming Convention

Sử dụng format: `shouldRefresh{DataType}` (camelCase với chữ cái đầu viết hoa)

Ví dụ:
- `shouldRefreshAppointments`
- `shouldRefreshPatients`
- `shouldRefreshAccounts`

## Lưu Ý

1. **Luôn gọi `loadData(true)`** sau khi CRUD thành công để force fresh fetch
2. **Set flag và dispatch event** để đảm bảo refresh hoạt động ngay cả khi có timing issues
3. **Sử dụng delay** trong hook để đảm bảo backend đã lưu dữ liệu
4. **Clean up flags** sau khi sử dụng (hook tự động làm việc này)

## Ví Dụ Hoàn Chỉnh

```javascript
import { useAutoRefresh, dispatchRefreshEvent, setRefreshFlag } from '../../shared/hooks/useAutoRefresh';

const MyComponent = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadData = async (forceFresh = false) => {
    try {
      setLoading(true);
      if (!forceFresh) {
        // Try cache first
        const cached = await getCachedData();
        if (cached) {
          setData(cached);
          setLoading(false);
          return;
        }
      }
      // Fresh fetch
      const result = await service.getData();
      if (result.success) {
        setData(result.data);
      }
    } finally {
      setLoading(false);
    }
  };

  // Auto-refresh hook
  useAutoRefresh(loadData, {
    eventName: 'myDataChanged',
    flagKey: 'shouldRefreshMyData'
  });

  const handleCreate = async (formData) => {
    const result = await service.create(formData);
    if (result.success) {
      setSuccess('Tạo thành công');
      setRefreshFlag('myData');
      dispatchRefreshEvent('myData', 'created', { id: result.data?.id });
      loadData(true);
    }
  };

  // ... rest of component
};
```

