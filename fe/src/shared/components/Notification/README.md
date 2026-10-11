# Hệ thống Thông báo Mới

## Tổng quan

Hệ thống thông báo mới đã thay thế hoàn toàn các thông báo `alert()` của browser bằng một hệ thống thông báo đẹp và thân thiện hơn.

## Tính năng

- ✅ **Giao diện đẹp**: Thông báo hiển thị với thiết kế Bootstrap
- ✅ **Tự động ẩn**: Thông báo tự động ẩn sau 5 giây (có thể tùy chỉnh)
- ✅ **Đóng thủ công**: Người dùng có thể đóng thông báo bằng nút X
- ✅ **Vị trí cố định**: Hiển thị ở góc trên bên phải màn hình
- ✅ **Nhiều loại**: Hỗ trợ 4 loại thông báo (success, error, warning, info)
- ✅ **Icon động**: Mỗi loại thông báo có icon riêng
- ✅ **Responsive**: Tự động điều chỉnh trên các thiết bị khác nhau

## Cách sử dụng

### 1. Import hook

```javascript
import { useNotificationContext } from '../contexts/NotificationContext';
```

### 2. Sử dụng trong component

```javascript
const { showSuccess, showError, showWarning, showInfo } = useNotificationContext();

// Hiển thị thông báo thành công
showSuccess('Thao tác thành công!');

// Hiển thị thông báo lỗi
showError('Có lỗi xảy ra!');

// Hiển thị thông báo cảnh báo
showWarning('Cảnh báo!');

// Hiển thị thông báo thông tin
showInfo('Thông tin!');
```

### 3. Tùy chỉnh thời gian hiển thị

```javascript
// Thông báo hiển thị 10 giây
showSuccess('Thao tác thành công!', 10000);

// Thông báo không tự động ẩn
showError('Lỗi nghiêm trọng!', 0);
```

## Các loại thông báo

| Loại | Màu sắc | Icon | Sử dụng |
|------|---------|------|---------|
| `success` | Xanh lá | ✅ | Thao tác thành công |
| `error` | Đỏ | ❌ | Lỗi xảy ra |
| `warning` | Vàng | ⚠️ | Cảnh báo |
| `info` | Xanh dương | ℹ️ | Thông tin |

## Demo

Truy cập `/notification-demo` để xem demo các loại thông báo.

## Cấu trúc file

```
src/
├── components/
│   └── Notification/
│       ├── Notification.js          # Component thông báo
│       ├── NotificationProvider.js  # Provider component
│       └── NotificationDemo.js      # Demo component
├── contexts/
│   └── NotificationContext.js      # Context quản lý thông báo
└── hooks/
    └── useNotification.js          # Hook quản lý thông báo
```

## Lợi ích

1. **Thay thế alert()**: Không còn sử dụng `alert()` của browser
2. **UX tốt hơn**: Giao diện đẹp và thân thiện
3. **Tùy chỉnh linh hoạt**: Có thể tùy chỉnh thời gian hiển thị
4. **Responsive**: Hoạt động tốt trên mọi thiết bị
5. **Dễ sử dụng**: API đơn giản và trực quan
6. **Tích hợp tốt**: Hoạt động với mọi component trong ứng dụng

## Migration từ alert()

### Trước (cũ):
```javascript
alert('Thao tác thành công!');
alert('Có lỗi xảy ra!');
```

### Sau (mới):
```javascript
const { showSuccess, showError } = useNotificationContext();

showSuccess('Thao tác thành công!');
showError('Có lỗi xảy ra!');
```

## Kết luận

Hệ thống thông báo mới đã được tích hợp hoàn toàn vào ứng dụng, thay thế tất cả các thông báo `alert()` cũ bằng giao diện đẹp và thân thiện hơn.
