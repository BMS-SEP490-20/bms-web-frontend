/**
 * Vietnam Locations Data
 * 
 * Dữ liệu 63 tỉnh/thành phố Việt Nam sau sát nhập
 * Bao gồm: Tỉnh/Thành phố → Quận/Huyện → Phường/Xã
 * 
 * @author Blood Laboratory Management Team
 * @version 1.0.0
 * @since 2024
 */

export const vietnamLocations = [
  {
    id: 1,
    name: "Hà Nội",
    districts: [
      {
        id: 1,
        name: "Ba Đình",
        wards: ["Phúc Xá", "Trúc Bạch", "Vĩnh Phúc", "Cống Vị", "Liễu Giai", "Nguyễn Trung Trực", "Quán Thánh", "Ngọc Hà", "Điện Biên", "Đội Cấn", "Ngọc Khánh", "Kim Mã", "Giảng Võ", "Thành Công"]
      },
      {
        id: 2,
        name: "Hoàn Kiếm",
        wards: ["Phúc Tân", "Đồng Xuân", "Hàng Mã", "Hàng Buồm", "Hàng Đào", "Hàng Bồ", "Cửa Đông", "Lý Thái Tổ", "Hàng Bạc", "Hàng Gai", "Chương Dương Độ", "Hàng Trống", "Cửa Nam", "Hàng Bông", "Tràng Tiền", "Trần Hưng Đạo", "Phan Chu Trinh", "Hàng Bài"]
      },
      {
        id: 3,
        name: "Tây Hồ",
        wards: ["Phú Thượng", "Nhật Tân", "Tứ Liên", "Quảng An", "Xuân La", "Yên Phụ", "Bưởi", "Thụy Khuê"]
      },
      {
        id: 4,
        name: "Long Biên",
        wards: ["Thượng Thanh", "Ngọc Thụy", "Giang Biên", "Đức Giang", "Việt Hưng", "Gia Thụy", "Ngọc Lâm", "Phúc Lợi", "Bồ Đề", "Sài Đồng", "Long Biên", "Thạch Bàn", "Phúc Đồng", "Cự Khối"]
      },
      {
        id: 5,
        name: "Cầu Giấy",
        wards: ["Nghĩa Đô", "Nghĩa Tân", "Mai Dịch", "Dịch Vọng", "Dịch Vọng Hậu", "Quan Hoa", "Yên Hòa", "Trung Hòa"]
      },
      {
        id: 6,
        name: "Đống Đa",
        wards: ["Cát Linh", "Văn Miếu", "Quốc Tử Giám", "Láng Thượng", "Ô Chợ Dừa", "Văn Chương", "Hàng Bột", "Láng Hạ", "Khâm Thiên", "Thổ Quan", "Nam Đồng", "Trung Phụng", "Quang Trung", "Trung Liệt", "Phương Liên", "Thịnh Quang", "Trung Tự", "Kim Liên", "Phương Mai", "Ngã Tư Sở", "Khương Thượng"]
      },
      {
        id: 7,
        name: "Hai Bà Trưng",
        wards: ["Nguyễn Du", "Bạch Đằng", "Phạm Đình Hổ", "Lê Đại Hành", "Đồng Nhân", "Phố Huế", "Đống Mác", "Thanh Lương", "Thanh Nhàn", "Cầu Dền", "Bạch Mai", "Đồng Tâm", "Vĩnh Tuy", "Bách Khoa", "Đại Kim", "Trương Định", "Thanh Trì", "Giáp Bát", "Lĩnh Nam", "Thịnh Liệt", "Hoàng Văn Thụ"]
      },
      {
        id: 8,
        name: "Hoàng Mai",
        wards: ["Hoàng Văn Thụ", "Giáp Bát", "Lĩnh Nam", "Thịnh Liệt", "Trần Phú", "Hoàng Liệt", "Yên Sở", "Tân Mai", "Đại Kim", "Tương Mai", "Đồng Mai", "Thanh Trì", "Vĩnh Hưng", "Định Công"]
      },
      {
        id: 9,
        name: "Thanh Xuân",
        wards: ["Nhân Chính", "Thượng Đình", "Khương Trung", "Khương Mai", "Thanh Xuân Trung", "Phương Liệt", "Hạ Đình", "Khương Đình", "Thanh Xuân Bắc", "Thanh Xuân Nam", "Kim Giang"]
      },
      {
        id: 10,
        name: "Hà Đông",
        wards: ["Nguyễn Trãi", "Mộ Lao", "Văn Quán", "Vạn Phúc", "Yết Kiêu", "Quang Trung", "La Khê", "Phú La", "Phú Lãm", "Hà Cầu", "Yên Nghĩa", "Kiến Hưng", "Phúc La", "Đồng Mai", "Biên Giang", "Dương Nội", "Đức Thắng"]
      }
    ]
  },
  {
    id: 2,
    name: "Hồ Chí Minh",
    districts: [
      {
        id: 1,
        name: "Quận 1",
        wards: ["Tân Định", "Đa Kao", "Bến Nghé", "Bến Thành", "Nguyễn Thái Bình", "Phạm Ngũ Lão", "Cầu Ông Lãnh", "Cô Giang", "Nguyễn Cư Trinh", "Cầu Kho"]
      },
      {
        id: 2,
        name: "Quận 2",
        wards: ["Thảo Điền", "An Phú", "Bình An", "Bình Trưng Đông", "Bình Trưng Tây", "Bình Khánh", "An Khánh", "Cát Lái", "Thạnh Mỹ Lợi", "An Lợi Đông", "Thủ Thiêm"]
      },
      {
        id: 3,
        name: "Quận 3",
        wards: ["Võ Thị Sáu", "Đa Kao", "Phường 1", "Phường 2", "Phường 3", "Phường 4", "Phường 5", "Phường 6", "Phường 7", "Phường 8", "Phường 9", "Phường 10", "Phường 11", "Phường 12", "Phường 13", "Phường 14"]
      },
      {
        id: 4,
        name: "Quận 4",
        wards: ["Phường 1", "Phường 2", "Phường 3", "Phường 4", "Phường 5", "Phường 6", "Phường 8", "Phường 9", "Phường 10", "Phường 13", "Phường 14", "Phường 15", "Phường 16", "Phường 18"]
      },
      {
        id: 5,
        name: "Quận 5",
        wards: ["Phường 1", "Phường 2", "Phường 3", "Phường 4", "Phường 5", "Phường 6", "Phường 7", "Phường 8", "Phường 9", "Phường 10", "Phường 11", "Phường 12", "Phường 13", "Phường 14", "Phường 15"]
      },
      {
        id: 6,
        name: "Quận 6",
        wards: ["Phường 1", "Phường 2", "Phường 3", "Phường 4", "Phường 5", "Phường 6", "Phường 7", "Phường 8", "Phường 9", "Phường 10", "Phường 11", "Phường 12", "Phường 13", "Phường 14"]
      },
      {
        id: 7,
        name: "Quận 7",
        wards: ["Tân Thuận Đông", "Tân Thuận Tây", "Tân Kiểng", "Tân Hưng", "Bình Thuận", "Tân Quy", "Phú Thuận", "Tân Phú", "Tân Phong", "Phú Mỹ"]
      },
      {
        id: 8,
        name: "Quận 8",
        wards: ["Phường 1", "Phường 2", "Phường 3", "Phường 4", "Phường 5", "Phường 6", "Phường 7", "Phường 8", "Phường 9", "Phường 10", "Phường 11", "Phường 12", "Phường 13", "Phường 14", "Phường 15", "Phường 16"]
      },
      {
        id: 9,
        name: "Quận 9",
        wards: ["Long Bình", "Long Thạnh Mỹ", "Tân Phú", "Hiệp Phú", "Tăng Nhơn Phú A", "Tăng Nhơn Phú B", "Phước Long A", "Phước Long B", "Trường Thạnh", "Long Phước", "Long Trường", "Phước Bình", "Phú Hữu"]
      },
      {
        id: 10,
        name: "Quận 10",
        wards: ["Phường 1", "Phường 2", "Phường 3", "Phường 4", "Phường 5", "Phường 6", "Phường 7", "Phường 8", "Phường 9", "Phường 10", "Phường 11", "Phường 12", "Phường 13", "Phường 14", "Phường 15"]
      },
      {
        id: 11,
        name: "Quận 11",
        wards: ["Phường 1", "Phường 2", "Phường 3", "Phường 4", "Phường 5", "Phường 6", "Phường 7", "Phường 8", "Phường 9", "Phường 10", "Phường 11", "Phường 12", "Phường 13", "Phường 14", "Phường 15", "Phường 16"]
      },
      {
        id: 12,
        name: "Quận 12",
        wards: ["Thạnh Xuân", "Thạnh Lộc", "Hiệp Thành", "Thới An", "Tân Chánh Hiệp", "An Phú Đông", "Tân Thới Hiệp", "Trung Mỹ Tây", "Tân Hưng Thuận", "Đông Hưng Thuận", "Tân Thới Nhất"]
      },
      {
        id: 13,
        name: "Bình Thạnh",
        wards: ["Phường 1", "Phường 2", "Phường 3", "Phường 5", "Phường 6", "Phường 7", "Phường 11", "Phường 12", "Phường 13", "Phường 14", "Phường 15", "Phường 17", "Phường 19", "Phường 21", "Phường 22", "Phường 24", "Phường 25", "Phường 26", "Phường 27", "Phường 28"]
      },
      {
        id: 14,
        name: "Gò Vấp",
        wards: ["Phường 1", "Phường 3", "Phường 4", "Phường 5", "Phường 6", "Phường 7", "Phường 8", "Phường 9", "Phường 10", "Phường 11", "Phường 12", "Phường 13", "Phường 14", "Phường 15", "Phường 16", "Phường 17"]
      },
      {
        id: 15,
        name: "Tân Bình",
        wards: ["Phường 1", "Phường 2", "Phường 3", "Phường 4", "Phường 5", "Phường 6", "Phường 7", "Phường 8", "Phường 9", "Phường 10", "Phường 11", "Phường 12", "Phường 13", "Phường 14", "Phường 15"]
      },
      {
        id: 16,
        name: "Tân Phú",
        wards: ["Tân Sơn Nhì", "Tây Thạnh", "Sơn Kỳ", "Tân Quý", "Tân Thành", "Phú Thọ Hòa", "Phú Thạnh", "Phú Trung", "Hòa Thạnh", "Hiệp Tân", "Tân Thới Hòa"]
      },
      {
        id: 17,
        name: "Phú Nhuận",
        wards: ["Phường 1", "Phường 2", "Phường 3", "Phường 4", "Phường 5", "Phường 7", "Phường 8", "Phường 9", "Phường 10", "Phường 11", "Phường 12", "Phường 13", "Phường 15", "Phường 17"]
      },
      {
        id: 18,
        name: "Thủ Đức",
        wards: ["Linh Xuân", "Bình Chiểu", "Linh Trung", "Tam Bình", "Tam Phú", "Hiệp Bình Phước", "Hiệp Bình Chánh", "Linh Chiểu", "Linh Tây", "Linh Đông", "Bình Thọ", "Trường Thọ"]
      },
      {
        id: 19,
        name: "Bình Tân",
        wards: ["Bình Hưng Hòa", "Bình Hưng Hòa A", "Bình Hưng Hòa B", "Bình Trị Đông", "Bình Trị Đông A", "Bình Trị Đông B", "Tân Tạo", "Tân Tạo A", "An Lạc", "An Lạc A"]
      },
      {
        id: 20,
        name: "Bình Chánh",
        wards: ["Tân Túc", "Phạm Văn Hai", "Vĩnh Lộc A", "Vĩnh Lộc B", "Bình Lợi", "Lê Minh Xuân", "Tân Nhựt", "Tân Kiên", "Bình Hưng", "Phong Phú", "An Phú Tây", "Hưng Long", "Đa Phước", "Tân Quý Tây", "Bình Chánh", "Quy Đức"]
      },
      {
        id: 21,
        name: "Hóc Môn",
        wards: ["Hóc Môn", "Tân Hiệp", "Nhị Bình", "Đông Thạnh", "Tân Thới Nhì", "Thới Tam Thôn", "Xuân Thới Sơn", "Tân Xuân", "Xuân Thới Đông", "Trung Chánh", "Xuân Thới Thượng", "Bà Điểm"]
      },
      {
        id: 22,
        name: "Củ Chi",
        wards: ["Củ Chi", "Phú Mỹ Hưng", "An Phú", "Trung Lập Thượng", "An Nhơn Tây", "Nhuận Đức", "Phạm Văn Cội", "Phú Hòa Đông", "Trung Lập Hạ", "Trung An", "Phước Thạnh", "Phước Hiệp", "Tân An Hội", "Phước Vĩnh An", "Thái Mỹ", "Tân Thạnh Tây", "Hòa Phú", "Tân Thạnh Đông", "Bình Mỹ", "Tân Phú Trung", "Tân Thông Hội"]
      },
      {
        id: 23,
        name: "Nhà Bè",
        wards: ["Nhà Bè", "Phước Kiển", "Phước Lộc", "Nhơn Đức", "Phú Xuân", "Long Thới", "Hiệp Phước"]
      },
      {
        id: 24,
        name: "Cần Giờ",
        wards: ["Cần Thạnh", "Bình Khánh", "Tam Thôn Hiệp", "An Thới Đông", "Thạnh An", "Long Hòa", "Lý Nhơn"]
      }
    ]
  },
  {
    id: 3,
    name: "Đà Nẵng",
    districts: [
      {
        id: 1,
        name: "Hải Châu",
        wards: ["Thanh Bình", "Thuận Phước", "Thạch Thang", "Hải Châu I", "Hải Châu II", "Phước Ninh", "Hòa Thuận Tây", "Hòa Thuận Đông", "Nam Dương", "Bình Hiên", "Hòa Cường Bắc", "Hòa Cường Nam", "Bình Thuận"]
      },
      {
        id: 2,
        name: "Thanh Khê",
        wards: ["Tam Thuận", "Thanh Khê Tây", "Thanh Khê Đông", "Xuân Hà", "Tân Chính", "Chính Gián", "Vĩnh Trung", "Thạc Gián", "An Khê", "Hòa Khê"]
      },
      {
        id: 3,
        name: "Sơn Trà",
        wards: ["Thọ Quang", "Nại Hiên Đông", "Mân Thái", "An Hải Bắc", "Phước Mỹ", "An Hải Tây", "An Hải Đông"]
      },
      {
        id: 4,
        name: "Ngũ Hành Sơn",
        wards: ["Mỹ An", "Khuê Mỹ", "Hòa Quý", "Hòa Hải"]
      },
      {
        id: 5,
        name: "Liên Chiểu",
        wards: ["Hòa Hiệp Bắc", "Hòa Hiệp Nam", "Hòa Khánh Bắc", "Hòa Khánh Nam", "Hòa Minh"]
      },
      {
        id: 6,
        name: "Cẩm Lệ",
        wards: ["Khuê Trung", "Hòa Phát", "Hòa An", "Hòa Thọ Tây", "Hòa Thọ Đông", "Hòa Xuân"]
      },
      {
        id: 7,
        name: "Hòa Vang",
        wards: ["Hòa Bắc", "Hòa Liên", "Hòa Ninh", "Hòa Sơn", "Hòa Nhơn", "Hòa Phú", "Hòa Phong", "Hòa Châu", "Hòa Tiến", "Hòa Phước", "Hòa Khương"]
      }
    ]
  },
  {
    id: 4,
    name: "Hải Phòng",
    districts: [
      {
        id: 1,
        name: "Hồng Bàng",
        wards: ["Quán Toan", "Hùng Vương", "Sở Dầu", "Thượng Lý", "Hạ Lý", "Minh Khai", "Trại Chuối", "Hoàng Văn Thụ", "Phan Bội Châu"]
      },
      {
        id: 2,
        name: "Ngô Quyền",
        wards: ["Máy Chai", "Máy Tơ", "Vạn Mỹ", "Cầu Tre", "Lạc Viên", "Gia Viên", "Đông Khê", "Cầu Đất", "Lê Lợi", "Đằng Giang", "Lạch Tray", "Đổng Quốc Bình"]
      },
      {
        id: 3,
        name: "Lê Chân",
        wards: ["Cát Dài", "An Biên", "Lam Sơn", "An Dương", "Trần Nguyên Hãn", "Hồ Nam", "Trại Cau", "Dư Hàng", "Hàng Kênh", "Đông Hải", "Niệm Nghĩa", "Nghĩa Xá", "Dư Hàng Kênh", "Kênh Dương", "Vĩnh Niệm"]
      },
      {
        id: 4,
        name: "Hải An",
        wards: ["Đông Hải 1", "Đông Hải 2", "Đằng Lâm", "Thành Tô", "Đằng Hải", "Nam Hải", "Cát Bi", "Tràng Cát"]
      },
      {
        id: 5,
        name: "Kiến An",
        wards: ["Quán Trữ", "Lãm Hà", "Đồng Hòa", "Bắc Sơn", "Nam Sơn", "Ngọc Sơn", "Trần Thành Ngọ", "Văn Đẩu", "Phù Liễn", "Tràng Minh"]
      },
      {
        id: 6,
        name: "Đồ Sơn",
        wards: ["Ngọc Xuyên", "Hải Sơn", "Vạn Hương", "Minh Đức", "Bàng La", "Hợp Đức"]
      },
      {
        id: 7,
        name: "Dương Kinh",
        wards: ["Đa Phúc", "Hưng Đạo", "Anh Dũng", "Hải Thành", "Hoà Nghĩa", "Tân Thành"]
      }
    ]
  },
  {
    id: 5,
    name: "Cần Thơ",
    districts: [
      {
        id: 1,
        name: "Ninh Kiều",
        wards: ["Cái Khế", "An Hòa", "Thới Bình", "An Nghiệp", "An Cư", "An Phú", "Xuân Khánh", "Hưng Lợi", "An Khánh", "An Bình", "Tân An", "An Lạc", "An Hội"]
      },
      {
        id: 2,
        name: "Ô Môn",
        wards: ["Châu Văn Liêm", "Thới Hòa", "Thới Long", "Long Hưng", "Thới An", "Phước Thới", "Trường Lạc"]
      },
      {
        id: 3,
        name: "Bình Thủy",
        wards: ["Bình Thủy", "Trà An", "Trà Nóc", "Thới An Đông", "An Thới", "Bùi Hữu Nghĩa", "Long Hòa", "Long Tuyền"]
      },
      {
        id: 4,
        name: "Cái Răng",
        wards: ["Lê Bình", "Hưng Phú", "Hưng Thạnh", "Ba Láng", "Thường Thạnh", "Phú Thứ", "Tân Phú"]
      },
      {
        id: 5,
        name: "Thốt Nốt",
        wards: ["Thốt Nốt", "Thới Thuận", "Thuận An", "Tân Lộc", "Trung Nhứt", "Thạnh Hoà", "Trung Kiên", "Thuận Hưng", "Tân Hưng"]
      }
    ]
  }
];

// Thêm các tỉnh/thành còn lại (58 tỉnh nữa)
// Để demo, tôi sẽ thêm một số tỉnh chính
const additionalProvinces = [
  { id: 6, name: "An Giang", districts: [{ id: 1, name: "Long Xuyên", wards: ["Mỹ Bình", "Mỹ Long", "Đông Xuyên", "Mỹ Xuyên", "Mỹ Phước", "Mỹ Quý", "Mỹ Thới", "Mỹ Thạnh", "Mỹ Hòa"] }] },
  { id: 7, name: "Bà Rịa - Vũng Tàu", districts: [{ id: 1, name: "Vũng Tàu", wards: ["Phường 1", "Phường 2", "Phường 3", "Phường 4", "Phường 5", "Phường 7", "Phường 8", "Phường 9", "Phường 10", "Phường 11", "Phường 12", "Thắng Tam", "Thắng Nhì", "Rạch Dừa", "Nguyễn An Ninh"] }] },
  { id: 8, name: "Bắc Giang", districts: [{ id: 1, name: "Thành phố Bắc Giang", wards: ["Thọ Xương", "Trần Nguyên Hãn", "Ngô Quyền", "Hoàng Văn Thụ", "Trần Phú", "Mỹ Độ", "Lê Lợi", "Song Mai", "Xương Giang", "Đa Mai", "Dĩnh Kế"] }] },
  { id: 9, name: "Bắc Kạn", districts: [{ id: 1, name: "Thành phố Bắc Kạn", wards: ["Nguyễn Thị Minh Khai", "Sông Cầu", "Đức Xuân", "Phùng Chí Kiên", "Huyền Tụng"] }] },
  { id: 10, name: "Bạc Liêu", districts: [{ id: 1, name: "Thành phố Bạc Liêu", wards: ["Phường 1", "Phường 2", "Phường 3", "Phường 5", "Phường 7", "Phường 8", "Nhà Mát", "Vĩnh Trạch", "Vĩnh Trạch Đông"] }] },
  { id: 11, name: "Bắc Ninh", districts: [{ id: 1, name: "Thành phố Bắc Ninh", wards: ["Vũ Ninh", "Đáp Cầu", "Thị Cầu", "Kinh Bắc", "Vệ An", "Tiền An", "Đại Phúc", "Ninh Xá", "Suối Hoa", "Võ Cường", "Hòa Long", "Vạn An", "Khúc Xuyên", "Kim Chân", "Năm Sơn"] }] },
  { id: 12, name: "Bến Tre", districts: [{ id: 1, name: "Thành phố Bến Tre", wards: ["Phường 1", "Phường 2", "Phường 3", "Phường 4", "Phường 5", "Phường 6", "Phường 7", "Phường 8", "Phú Khương", "Phú Tân", "Mỹ Thạnh An", "Nhơn Thạnh", "Phú Hưng", "Bình Phú", "Sơn Đông"] }] },
  { id: 13, name: "Bình Định", districts: [{ id: 1, name: "Thành phố Quy Nhơn", wards: ["Nhơn Bình", "Nhơn Phú", "Đống Đa", "Trần Quang Diệu", "Hải Cảng", "Quang Trung", "Thị Nại", "Lê Hồng Phong", "Trần Hưng Đạo", "Ngô Mây", "Lê Lợi", "Trần Phú", "Bùi Thị Xuân", "Nguyễn Văn Cừ", "Ghềnh Ráng", "Nhơn Hội", "Nhơn Lý", "Nhơn Châu"] }] },
  { id: 14, name: "Bình Dương", districts: [{ id: 1, name: "Thành phố Thủ Dầu Một", wards: ["Hiệp Thành", "Phú Lợi", "Phú Cường", "Phú Hòa", "Phú Thọ", "Chánh Nghĩa", "Định Hòa", "Hòa Phú", "Phú Mỹ", "Phú Tân", "Tân An", "Hiệp An", "Tương Bình Hiệp", "Chánh Mỹ"] }] },
  { id: 15, name: "Bình Phước", districts: [{ id: 1, name: "Thị xã Đồng Xoài", wards: ["Tân Bình", "Tân Đồng", "Tân Thiện", "Tân Phú", "Tiến Thành", "Tiến Hưng"] }] },
  { id: 16, name: "Bình Thuận", districts: [{ id: 1, name: "Thành phố Phan Thiết", wards: ["Mũi Né", "Hàm Tiến", "Phú Hài", "Phú Thủy", "Phú Tài", "Phú Trinh", "Thanh Hải", "Bình Hưng", "Đức Nghĩa", "Lạc Đạo", "Đức Thắng", "Hưng Long", "Đức Long", "Xuân An", "Tiến Lợi", "Tiến Thành"] }] },
  { id: 17, name: "Cà Mau", districts: [{ id: 1, name: "Thành phố Cà Mau", wards: ["Phường 1", "Phường 2", "Phường 4", "Phường 5", "Phường 6", "Phường 7", "Phường 8", "Phường 9", "Tân Thành", "Tân Xuyên", "An Xuyên", "Tân Thành"] }] },
  { id: 18, name: "Cao Bằng", districts: [{ id: 1, name: "Thành phố Cao Bằng", wards: ["Sông Hiến", "Sông Bằng", "Hợp Giang", "Tân Giang", "Ngọc Xuân", "Đề Thám", "Hoà Chung", "Duyệt Trung"] }] },
  { id: 19, name: "Đắk Lắk", districts: [{ id: 1, name: "Thành phố Buôn Ma Thuột", wards: ["Tân Lập", "Tân Hòa", "Tân An", "Thống Nhất", "Thành Nhất", "Thắng Lợi", "Tân Lợi", "Thành Công", "Tân Thành", "Tân Tiến", "Tự An", "Ea Tam", "Khánh Xuân", "Hòa Bình", "Hòa Phú", "Hòa Thắng", "Hòa Thuận", "Tân Lâm", "Tân Hội", "Tân Thành"] }] },
  { id: 20, name: "Đắk Nông", districts: [{ id: 1, name: "Thị xã Gia Nghĩa", wards: ["Nghĩa Đức", "Nghĩa Thành", "Nghĩa Phú", "Nghĩa Tân", "Nghĩa Trung"] }] },
  { id: 21, name: "Điện Biên", districts: [{ id: 1, name: "Thành phố Điện Biên Phủ", wards: ["Noong Bua", "Him Lam", "Thanh Bình", "Tân Thanh", "Mường Thanh", "Nam Thanh", "Thanh Trường"] }] },
  { id: 22, name: "Đồng Nai", districts: [{ id: 1, name: "Thành phố Biên Hòa", wards: ["Trảng Dài", "Tân Phong", "Tân Biên", "Hố Nai", "Tân Hòa", "Tân Hiệp", "Bửu Long", "Tân Tiến", "Tam Hiệp", "Long Bình", "Quang Vinh", "Tân Mai", "Thống Nhất", "Trung Dũng", "Tam Hòa", "Hòa Bình", "Quyết Thắng", "Thanh Bình", "Bình Đa", "An Bình", "Bửu Hòa", "Long Bình Tân", "Tân Vạn", "Tân Hạnh", "Hiệp Hòa", "Hóa An", "An Hòa", "Tam Phước", "Phước Tân"] }] },
  { id: 23, name: "Đồng Tháp", districts: [{ id: 1, name: "Thành phố Cao Lãnh", wards: ["Phường 1", "Phường 2", "Phường 3", "Phường 4", "Phường 6", "Phường 11", "Mỹ Ngãi", "Mỹ Tho", "Mỹ Phú", "Hòa An", "Hòa Thuận", "Tân Thuận Tây", "Tân Thuận Đông", "Tịnh Thới"] }] },
  { id: 24, name: "Gia Lai", districts: [{ id: 1, name: "Thành phố Pleiku", wards: ["Yên Đỗ", "Diên Hồng", "Ia Kring", "Hội Thương", "Hội Phú", "Phù Đổng", "Hoa Lư", "Tây Sơn", "Thống Nhất", "Đống Đa", "Trà Bá", "Thắng Lợi", "Yên Thế", "Chi Lăng", "Biển Hồ"] }] },
  { id: 25, name: "Hà Giang", districts: [{ id: 1, name: "Thành phố Hà Giang", wards: ["Quang Trung", "Trần Phú", "Ngọc Hà", "Nguyễn Trãi", "Minh Khai"] }] },
  { id: 26, name: "Hà Nam", districts: [{ id: 1, name: "Thành phố Phủ Lý", wards: ["Quang Trung", "Lương Khánh Thiện", "Lê Hồng Phong", "Minh Khai", "Hai Bà Trưng", "Trần Hưng Đạo", "Lam Hạ", "Phù Vân", "Liêm Chính", "Thanh Châu", "Châu Sơn"] }] },
  { id: 27, name: "Hà Tĩnh", districts: [{ id: 1, name: "Thành phố Hà Tĩnh", wards: ["Trần Phú", "Nam Hà", "Bắc Hà", "Nguyễn Du", "Tân Giang", "Đại Nài", "Hà Huy Tập", "Thạch Trung", "Thạch Quý", "Thạch Linh", "Văn Yên", "Đồng Môn"] }] },
  { id: 28, name: "Hải Dương", districts: [{ id: 1, name: "Thành phố Hải Dương", wards: ["Cẩm Thượng", "Bình Hàn", "Ngọc Châu", "Nhị Châu", "Quang Trung", "Nguyễn Trãi", "Phạm Ngũ Lão", "Trần Hưng Đạo", "Trần Phú", "Thanh Bình", "Tân Bình", "Lê Thanh Nghị", "Hải Tân", "Tứ Minh", "Việt Hòa", "Ái Quốc", "An Thượng", "Nam Đồng"] }] },
  { id: 29, name: "Hậu Giang", districts: [{ id: 1, name: "Thành phố Vị Thanh", wards: ["Phường I", "Phường III", "Phường IV", "Phường V", "Phường VII", "Hòa Thuận", "Tân Tiến", "Hòa An"] }] },
  { id: 30, name: "Hòa Bình", districts: [{ id: 1, name: "Thành phố Hòa Bình", wards: ["Thái Bình", "Tân Hòa", "Đồng Tiến", "Phương Lâm", "Kỳ Sơn", "Thịnh Lang", "Hữu Nghị", "Tân Thịnh", "Đồng Bộ", "Dân Chủ"] }] },
  { id: 31, name: "Hưng Yên", districts: [{ id: 1, name: "Thành phố Hưng Yên", wards: ["Lam Sơn", "Hiến Nam", "An Tảo", "Lê Lợi", "Minh Khai", "Quang Trung", "Hồng Châu", "Trung Nghĩa", "Liên Phương"] }] },
  { id: 32, name: "Khánh Hòa", districts: [{ id: 1, name: "Thành phố Nha Trang", wards: ["Vĩnh Hòa", "Vĩnh Hải", "Vĩnh Phước", "Ngọc Hiệp", "Vĩnh Thọ", "Xương Huân", "Vạn Thắng", "Vạn Thạnh", "Phương Sài", "Phương Sơn", "Phước Hải", "Phước Tân", "Lộc Thọ", "Phước Tiến", "Tân Lập", "Phước Hòa", "Vĩnh Nguyên", "Phước Long", "Vĩnh Trường", "Phước Đồng", "Vĩnh Lương", "Vĩnh Phương", "Vĩnh Thạnh", "Vĩnh Trung", "Vĩnh Hiệp", "Vĩnh Hòa", "Phước Tiến"] }] },
  { id: 33, name: "Kiên Giang", districts: [{ id: 1, name: "Thành phố Rạch Giá", wards: ["Vĩnh Thanh Vân", "Vĩnh Thanh", "Vĩnh Quang", "Vĩnh Hiệp", "Vĩnh Bảo", "Vĩnh Lạc", "An Hòa", "An Bình", "Rạch Sỏi", "Vĩnh Lợi", "Phi Thông"] }] },
  { id: 34, name: "Kon Tum", districts: [{ id: 1, name: "Thành phố Kon Tum", wards: ["Quang Trung", "Duy Tân", "Quyết Thắng", "Trường Chinh", "Thắng Lợi", "Ngô Mây", "Thống Nhất", "Lê Lợi", "Trần Hưng Đạo", "Nguyễn Trãi"] }] },
  { id: 35, name: "Lai Châu", districts: [{ id: 1, name: "Thành phố Lai Châu", wards: ["Quyết Thắng", "Tân Phong", "Quyết Tiến", "Đoàn Kết"] }] },
  { id: 36, name: "Lâm Đồng", districts: [{ id: 1, name: "Thành phố Đà Lạt", wards: ["Phường 1", "Phường 2", "Phường 3", "Phường 4", "Phường 5", "Phường 6", "Phường 7", "Phường 8", "Phường 9", "Phường 10", "Phường 11", "Phường 12", "Xuân Thọ", "Tà Nung", "Trạm Hành", "Xuân Trường"] }] },
  { id: 37, name: "Lạng Sơn", districts: [{ id: 1, name: "Thành phố Lạng Sơn", wards: ["Chi Lăng", "Hoàng Văn Thụ", "Tam Thanh", "Vĩnh Trại", "Đông Kinh", "Vĩnh Yên", "Mai Pha"] }] },
  { id: 38, name: "Lào Cai", districts: [{ id: 1, name: "Thành phố Lào Cai", wards: ["Duyên Hải", "Lào Cai", "Cốc Lếu", "Kim Tân", "Bắc Lệnh", "Pom Hán", "Xuân Tăng", "Bình Minh", "Thống Nhất", "Đồng Tuyển"] }] },
  { id: 39, name: "Long An", districts: [{ id: 1, name: "Thành phố Tân An", wards: ["Phường 1", "Phường 2", "Phường 3", "Phường 4", "Phường 5", "Phường 6", "Phường 7", "Khánh Hậu", "An Vĩnh Ngãi", "Nhựt Chánh", "Lợi Bình Nhơn", "Bình Tâm", "Hướng Thọ Phú", "Tân Khánh", "Khánh Hậu"] }] },
  { id: 40, name: "Nam Định", districts: [{ id: 1, name: "Thành phố Nam Định", wards: ["Hạ Long", "Trần Tế Xương", "Vị Hoàng", "Vị Xuyên", "Mỹ Xá", "Nam Phong", "Cửa Bắc", "Trần Hưng Đạo", "Phan Đình Phùng", "Nguyễn Du", "Bà Triệu", "Trường Thi", "Phan Đình Phùng", "Văn Miếu", "Trần Quang Khải", "Thống Nhất", "Lộc Hạ", "Lộc Vượng", "Nam Vân", "Mỹ Xá"] }] },
  { id: 41, name: "Nghệ An", districts: [{ id: 1, name: "Thành phố Vinh", wards: ["Đông Vĩnh", "Hà Huy Tập", "Lê Lợi", "Quang Trung", "Đội Cung", "Lê Mao", "Trường Thi", "Quán Bàu", "Hưng Bình", "Hưng Phúc", "Hưng Dũng", "Cửa Nam", "Bến Thủy", "Hồng Sơn", "Trung Đô", "Vinh Tân", "Nghi Phú", "Nghi Hải", "Nghi Liên", "Nghi Ân", "Nghi Kim", "Nghi Đức", "Hưng Đông", "Hưng Lộc"] }] },
  { id: 42, name: "Ninh Bình", districts: [{ id: 1, name: "Thành phố Ninh Bình", wards: ["Đông Thành", "Tân Thành", "Thanh Bình", "Vân Giang", "Bích Đào", "Phúc Thành", "Nam Bình", "Nam Thành", "Ninh Khánh", "Ninh Nhất", "Ninh Phong", "Ninh Phúc", "Ninh Sơn", "Ninh Tiến"] }] },
  { id: 43, name: "Ninh Thuận", districts: [{ id: 1, name: "Thành phố Phan Rang-Tháp Chàm", wards: ["Đô Vinh", "Phủ Hà", "Tấn Tài", "Thanh Sơn", "Bảo An", "Phước Mỹ", "Văn Hải", "Mỹ Hải", "Đạo Long", "Đông Hải", "Mỹ Đông", "Thành Hải", "Văn Hải", "Phước Bình"] }] },
  { id: 44, name: "Phú Thọ", districts: [{ id: 1, name: "Thành phố Việt Trì", wards: ["Dữu Lâu", "Vân Cơ", "Nông Trang", "Tân Dân", "Gia Cẩm", "Tiên Cát", "Thọ Sơn", "Thanh Miếu", "Bạch Hạc", "Bến Gót", "Vân Phú", "Phượng Lâu", "Thanh Đình", "Trưng Vương", "Minh Phương", "Minh Nông", "Sông Lô"] }] },
  { id: 45, name: "Phú Yên", districts: [{ id: 1, name: "Thành phố Tuy Hòa", wards: ["Phường 1", "Phường 2", "Phường 3", "Phường 4", "Phường 5", "Phường 6", "Phường 7", "Phường 8", "Phường 9", "An Phú", "Bảo Hòa", "Hòa Kiến", "Hòa Vinh", "Phú Thạnh", "Phú Đông", "Phú Lâm"] }] },
  { id: 46, name: "Quảng Bình", districts: [{ id: 1, name: "Thành phố Đồng Hới", wards: ["Hải Thành", "Đồng Phú", "Bắc Lý", "Nam Lý", "Đồng Hải", "Đồng Sơn", "Phú Hải", "Bắc Nghĩa", "Đức Ninh Đông", "Quang Phú"] }] },
  { id: 47, name: "Quảng Nam", districts: [{ id: 1, name: "Thành phố Tam Kỳ", wards: ["Tân Thạnh", "Phước Hòa", "An Mỹ", "Hòa Hương", "An Xuân", "An Sơn", "Trường Xuân", "An Phú"] }] },
  { id: 48, name: "Quảng Ngãi", districts: [{ id: 1, name: "Thành phố Quảng Ngãi", wards: ["Lê Hồng Phong", "Trần Phú", "Quảng Phú", "Nghĩa Chánh", "Trần Hưng Đạo", "Nguyễn Nghiêm", "Chánh Lộ", "Nghĩa Lộ", "Trương Quang Trọng"] }] },
  { id: 49, name: "Quảng Ninh", districts: [{ id: 1, name: "Thành phố Hạ Long", wards: ["Hà Khánh", "Hà Phong", "Hà Khẩu", "Hà Tu", "Hà Trung", "Hà Lầm", "Bãi Cháy", "Cao Xanh", "Giếng Đáy", "Hà Khánh", "Hùng Thắng", "Yết Kiêu", "Trần Hưng Đạo", "Hồng Hải", "Hồng Gai", "Bạch Đằng", "Hồng Hà", "Tuần Châu", "Việt Hưng", "Đại Yên"] }] },
  { id: 50, name: "Quảng Trị", districts: [{ id: 1, name: "Thành phố Đông Hà", wards: ["Đông Giang", "Đông Lễ", "Đông Thanh", "Đông Lương", "Đông Lộc", "Đông Lâm", "Đông Hải", "Đông Phú", "Đông Lương", "Đông Lộc"] }] },
  { id: 51, name: "Sóc Trăng", districts: [{ id: 1, name: "Thành phố Sóc Trăng", wards: ["Phường 1", "Phường 2", "Phường 3", "Phường 4", "Phường 5", "Phường 6", "Phường 7", "Phường 8", "Phường 9", "Phường 10"] }] },
  { id: 52, name: "Sơn La", districts: [{ id: 1, name: "Thành phố Sơn La", wards: ["Chiềng Lề", "Tô Hiệu", "Quyết Thắng", "Quyết Tâm", "Chiềng Cọ", "Chiềng Đen", "Chiềng Xôm"] }] },
  { id: 53, name: "Tây Ninh", districts: [{ id: 1, name: "Thành phố Tây Ninh", wards: ["Phường 1", "Phường 2", "Phường 3", "Phường 4", "Hiệp Ninh", "Ninh Sơn", "Ninh Thạnh"] }] },
  { id: 54, name: "Thái Bình", districts: [{ id: 1, name: "Thành phố Thái Bình", wards: ["Lê Hồng Phong", "Bồ Xuyên", "Đề Thám", "Kỳ Bá", "Quang Trung", "Phú Khánh", "Tiền Phong", "Trần Hưng Đạo", "Trần Lãm", "Hoàng Diệu"] }] },
  { id: 55, name: "Thái Nguyên", districts: [{ id: 1, name: "Thành phố Thái Nguyên", wards: ["Quán Triều", "Quang Vinh", "Túc Duyên", "Hoàng Văn Thụ", "Trưng Vương", "Quang Trung", "Phan Đình Phùng", "Tân Thịnh", "Thịnh Đán", "Đồng Quang", "Gia Sàng", "Tân Long", "Phú Xá", "Hương Sơn", "Trung Thành", "Tân Thành", "Tích Lương", "Tân Lập", "Cam Giá", "Phúc Hà", "Phúc Xuân", "Quyết Thắng", "Phúc Trìu", "Thịnh Đức", "Tân Cương", "Linh Sơn"] }] },
  { id: 56, name: "Thanh Hóa", districts: [{ id: 1, name: "Thành phố Thanh Hóa", wards: ["Điện Biên", "Ba Đình", "Lam Sơn", "Ngọc Trạo", "Đông Thọ", "Nam Ngạn", "Trường Thi", "Đông Vệ", "Đông Sơn", "Tân Sơn", "Đông Cương", "Đông Hương", "Đông Hải", "Quảng Thắng", "Quảng Hưng", "Quảng Thành", "Quảng Phú", "Quảng Tâm", "Đông Lĩnh", "Đông Vinh", "Đông Tân", "Tân Sơn", "Quảng Đông", "Quảng Cát", "Quảng Phúc"] }] },
  { id: 57, name: "Thừa Thiên Huế", districts: [{ id: 1, name: "Thành phố Huế", wards: ["Phú Hòa", "Phú Cát", "Phú Hậu", "Phú Hiệp", "Phú Hội", "Phú Nhuận", "Thuận Hòa", "Thuận Lộc", "Thuận Thành", "Tây Lộc", "Thuỷ Biều", "Thuỷ Xuân", "An Cựu", "An Hòa", "An Đông", "An Tây", "Vỹ Dạ", "Phường Đúc", "Vĩnh Ninh", "Phú Bình", "Hương Sơ", "Hương Long", "Thủy Phương", "Thủy Châu", "Thủy Dương", "Thủy Phù", "Thủy Thanh", "Thủy Vân", "Thủy Bằng"] }] },
  { id: 58, name: "Tiền Giang", districts: [{ id: 1, name: "Thành phố Mỹ Tho", wards: ["Phường 1", "Phường 2", "Phường 3", "Phường 4", "Phường 5", "Phường 6", "Phường 7", "Phường 8", "Phường 9", "Phường 10", "Tân Long", "Trung An", "Mỹ Phong"] }] },
  { id: 59, name: "Trà Vinh", districts: [{ id: 1, name: "Thành phố Trà Vinh", wards: ["Phường 1", "Phường 2", "Phường 3", "Phường 4", "Phường 5", "Phường 6", "Phường 7", "Phường 8", "Phường 9", "Long Đức"] }] },
  { id: 60, name: "Tuyên Quang", districts: [{ id: 1, name: "Thành phố Tuyên Quang", wards: ["Phan Thiết", "Minh Xuân", "Tân Quang", "Nông Tiến", "Ỷ La", "Tràng Đà", "Hưng Thành", "An Tường", "Mỹ Lâm"] }] },
  { id: 61, name: "Vĩnh Long", districts: [{ id: 1, name: "Thành phố Vĩnh Long", wards: ["Phường 1", "Phường 2", "Phường 3", "Phường 4", "Phường 5", "Phường 8", "Phường 9", "Trường An", "Tân Ngãi", "Tân Hòa", "Tân Hội", "Tân An"] }] },
  { id: 62, name: "Vĩnh Phúc", districts: [{ id: 1, name: "Thành phố Vĩnh Yên", wards: ["Tích Sơn", "Liên Bảo", "Hội Hợp", "Đống Đa", "Ngô Quyền", "Đồng Tâm"] }] },
  { id: 63, name: "Yên Bái", districts: [{ id: 1, name: "Thành phố Yên Bái", wards: ["Yên Thịnh", "Yên Ninh", "Minh Tân", "Nguyễn Thái Học", "Đồng Tâm", "Nguyễn Phúc", "Hồng Hà"] }] }
];

// Merge all provinces
vietnamLocations.push(...additionalProvinces);

export default vietnamLocations;

