# Loading Component

## 📋 Mô tả
Component Loading tái sử dụng cho Blood Laboratory Management System, cung cấp spinner loading với các tùy chọn tùy chỉnh.

## 🎯 Tính năng
- ✅ Spinner animation với React Bootstrap
- ✅ Message tùy chỉnh
- ✅ Kích thước có thể điều chỉnh (sm, lg)
- ✅ Chế độ toàn màn hình
- ✅ Responsive design
- ✅ Theme colors nhất quán

## 📦 Import
```javascript
import Loading from '../components/Loading/Loading';
```

## 🔧 Props

| Prop | Type | Default | Mô tả |
|------|------|---------|-------|
| `message` | string | 'Đang tải...' | Thông báo hiển thị |
| `size` | string | 'lg' | Kích thước spinner (sm, lg) |
| `fullScreen` | boolean | false | Hiển thị toàn màn hình |

## 💡 Cách sử dụng

### 1. Loading cơ bản
```javascript
if (loading) {
  return <Loading />;
}
```

### 2. Loading với message tùy chỉnh
```javascript
if (loading) {
  return <Loading message="Đang tải danh sách bệnh nhân..." />;
}
```

### 3. Loading toàn màn hình
```javascript
if (loading) {
  return <Loading message="Đang xử lý..." fullScreen={true} />;
}
```

### 4. Loading với kích thước nhỏ
```javascript
if (loading) {
  return <Loading message="Đang lưu..." size="sm" />;
}
```

### 5. Loading với kích thước lớn
```javascript
if (loading) {
  return <Loading message="Đang tải dữ liệu..." size="lg" />;
}
```

## 🎨 Ví dụ thực tế

### Trang Patients
```javascript
if (loading) {
  return <Loading message="Đang tải danh sách bệnh nhân..." size="lg" />;
}
```

### Trang Home
```javascript
if (loading) {
  return <Loading message="Đang tải trang chủ..." fullScreen={true} />;
}
```

### Form submission
```javascript
const [saving, setSaving] = useState(false);

if (saving) {
  return <Loading message="Đang lưu dữ liệu..." size="sm" />;
}
```

## 🚀 Demo
Sử dụng `LoadingDemo` component để xem tất cả các tùy chọn:
```javascript
import LoadingDemo from '../components/Loading/LoadingDemo';

// Trong component
<LoadingDemo />
```

## 📝 Lưu ý
- Component sử dụng React Bootstrap Spinner
- Tự động responsive trên mọi thiết bị
- Theme colors phù hợp với hệ thống y tế
- Có thể tùy chỉnh thêm CSS nếu cần

## 🔄 Refactoring
Thay vì sử dụng loading UI tự tạo:
```javascript
// ❌ Cũ
if (loading) {
  return (
    <Container className="py-4">
      <div className="text-center">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
        <p className="mt-3 text-muted">Đang tải...</p>
      </div>
    </Container>
  );
}
```

Sử dụng component Loading:
```javascript
// ✅ Mới
if (loading) {
  return <Loading message="Đang tải dữ liệu..." />;
}
```

## 🎯 Lợi ích
- **Tính nhất quán**: Tất cả loading UI giống nhau
- **Dễ bảo trì**: Chỉ cần sửa 1 file
- **Tái sử dụng**: Sử dụng ở nhiều nơi
- **Tùy chỉnh**: Nhiều tùy chọn linh hoạt
- **Professional**: Thiết kế chuyên nghiệp
