# Phân Tích Vấn Đề Performance và Giải Pháp

## 🔍 Các Vấn Đề Đã Phát Hiện

### 1. **API Base URL và Gateway Path Conflict**
- **Vấn đề**: `api.js` có `baseURL: 'https://localhost:7000'` nhưng các service gọi `/gateway/...`
- **Hậu quả**: Có thể tạo ra URL sai như `https://localhost:7000/gateway/gateway/...` hoặc thiếu gateway
- **Giải pháp**: Thống nhất baseURL hoặc loại bỏ `/gateway` trong các service calls

### 2. **fetchAll: true Load Quá Nhiều Dữ Liệu**
- **Vấn đề**: Nhiều service sử dụng `fetchAll: true` để load tất cả dữ liệu (có thể hàng nghìn records)
- **Hậu quả**: 
  - Load chậm, đặc biệt với dữ liệu lớn
  - Tốn băng thông
  - Tốn bộ nhớ
  - Vòng lặp `while(true)` có thể chạy rất lâu
- **Vị trí**: `patientService.js`, `appointmentService.js`, `adminDataPrefetchService.js`
- **Giải pháp**: 
  - Sử dụng pagination thông minh
  - Chỉ fetchAll khi thực sự cần thiết
  - Thêm limit tối đa cho fetchAll

### 3. **Thiếu Debounce cho Search Inputs**
- **Vấn đề**: Một số trang không có debounce, mỗi lần gõ sẽ filter/search ngay
- **Hậu quả**: 
  - Nhiều API calls không cần thiết
  - UI lag khi gõ nhanh
- **Vị trí**: `Patients.js`, `Invoices.js` và một số trang khác
- **Giải pháp**: Thêm debounce hook và áp dụng cho tất cả search inputs

### 4. **Cache TTL Quá Ngắn**
- **Vấn đề**: Cache chỉ có 5 phút TTL
- **Hậu quả**: Dữ liệu bị refresh quá thường xuyên
- **Giải pháp**: Tăng TTL lên 10-15 phút cho dữ liệu ít thay đổi

### 5. **Không Có Request Cancellation**
- **Vấn đề**: Khi user navigate đi, các request vẫn tiếp tục chạy
- **Hậu quả**: 
  - Lãng phí tài nguyên
  - Có thể gây race condition
  - Memory leak tiềm ẩn
- **Giải pháp**: Sử dụng AbortController để cancel requests

### 6. **Nhiều API Calls Song Song Không Cần Thiết**
- **Vấn đề**: Một số trang gọi nhiều API cùng lúc mà không cần thiết
- **Hậu quả**: Server bị quá tải, response chậm
- **Giải pháp**: Ưu tiên các API quan trọng, load các API khác sau

### 7. **Không Có Loading States Tốt**
- **Vấn đề**: Một số trang không có loading state rõ ràng
- **Hậu quả**: User không biết hệ thống đang làm gì
- **Giải pháp**: Thêm skeleton loaders và progress indicators

## 🚀 Giải Pháp Đề Xuất

### Giải Pháp 1: Tối Ưu API Base URL
```javascript
// api.js - Sửa baseURL
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'https://localhost:7000/gateway';

const api = axios.create({
  baseURL: API_BASE_URL,
  // ... rest of config
});
```

### Giải Pháp 2: Tạo Custom Hook cho Debounce
```javascript
// shared/hooks/useDebounce.js
import { useState, useEffect } from 'react';

export const useDebounce = (value, delay = 300) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};
```

### Giải Pháp 3: Tối Ưu fetchAll với Limit
```javascript
// Thêm maxPages limit
if (options.fetchAll) {
  const MAX_PAGES = 50; // Giới hạn tối đa
  let p = 1;
  while (p <= MAX_PAGES) {
    // ... fetch logic
    if (pageData.length < respPageSize) break;
    p += 1;
  }
}
```

### Giải Pháp 4: Request Cancellation với AbortController
```javascript
useEffect(() => {
  const abortController = new AbortController();
  
  const fetchData = async () => {
    try {
      const result = await api.get('/endpoint', {
        signal: abortController.signal
      });
      // ... handle result
    } catch (error) {
      if (error.name !== 'CanceledError') {
        // Handle error
      }
    }
  };
  
  fetchData();
  
  return () => {
    abortController.abort();
  };
}, []);
```

### Giải Pháp 5: Tăng Cache TTL
```javascript
// adminDataPrefetchService.js
const CACHE_TTL = 10 * 60 * 1000; // 10 phút thay vì 5 phút
```

### Giải Pháp 6: Lazy Loading cho Components
```javascript
// Sử dụng React.lazy cho các trang lớn
const AdminPatients = React.lazy(() => import('./pages/admin/Patients'));
```

## 📋 Kế Hoạch Triển Khai

1. **Ưu tiên cao**: Sửa API base URL và gateway path
2. **Ưu tiên cao**: Thêm debounce cho search inputs
3. **Ưu tiên trung bình**: Tối ưu fetchAll với limit
4. **Ưu tiên trung bình**: Thêm request cancellation
5. **Ưu tiên thấp**: Tăng cache TTL
6. **Ưu tiên thấp**: Lazy loading components

## ⚠️ Lưu Ý

- Không thay đổi luồng chính của dự án
- Giữ backward compatibility
- Test kỹ sau mỗi thay đổi
- Monitor performance metrics

