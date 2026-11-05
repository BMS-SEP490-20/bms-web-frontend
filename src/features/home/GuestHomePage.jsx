import React, { useState, useEffect } from 'react';
import { 
  FaPhoneAlt, 
  FaClock, 
  FaSearch, 
  FaVial, 
  FaShieldAlt, 
  FaCheckCircle, 
  FaArrowRight, 
  FaCalendarCheck, 
  FaFileMedicalAlt, 
  FaHospital, 
  FaMicroscope, 
  FaTemperatureLow, 
  FaFilePdf, 
  FaLock, 
  FaTimes,
  FaHome
} from 'react-icons/fa';
import { fetchServiceCatalog } from '../catalog/api/catalogApi';
import MegaFooter from './components/MegaFooter';
import PortalNavbar from './components/PortalNavbar';

export default function GuestHomePage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [lookupCode, setLookupCode] = useState('');
  const [lookupPhone, setLookupPhone] = useState('');
  const [packages, setPackages] = useState([]);
  const [showRequireLoginModal, setShowRequireLoginModal] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState(null);

  useEffect(() => {
    fetchServiceCatalog()
      .then(res => {
        if (res?.packages?.length) {
          setPackages(res.packages.slice(0, 4));
        }
      })
      .catch(() => {
        setPackages([
          {
            id: 'PKG-CBC',
            packageName: 'Tổng phân tích tế bào máu ngoại vi (24 thông số Laser)',
            description: 'Phát hiện sớm thiếu máu, nhiễm trùng, bệnh lý tủy xương và tiểu cầu.',
            price: 180000,
            category: 'Huyết học'
          },
          {
            id: 'PKG-LIVER',
            packageName: 'Tầm soát Viêm gan B & C (HBsAg, Anti-HBs, Anti-HCV)',
            description: 'Sàng lọc nhiễm virus viêm gan B và C mạn tính, đánh giá kháng thể.',
            price: 320000,
            category: 'Gan mật'
          },
          {
            id: 'PKG-LIPID',
            packageName: 'Bộ mỡ máu toàn phần (Cholesterol, Triglyceride, HDL, LDL)',
            description: 'Đánh giá nguy cơ xơ vữa động mạch và bệnh lý mạch vành.',
            price: 200000,
            category: 'Tim mạch'
          },
          {
            id: 'PKG-DIABETES',
            packageName: 'Gói Tầm Soát Đái Tháo Đường Chuyên Sâu',
            description: 'Theo dõi chỉ số Glucose huyết tương và HbA1c đánh giá kiểm soát đường huyết.',
            price: 380000,
            category: 'Tiểu đường'
          }
        ]);
      });
  }, []);

  const handleTrackSubmit = (e) => {
    e.preventDefault();
    const code = lookupCode.trim();
    if (!code) return;
    window.location.href = `/tracking?code=${encodeURIComponent(code)}${lookupPhone ? `&phone=${encodeURIComponent(lookupPhone.trim())}` : ''}`;
  };

  const handleBookClick = (pkg) => {
    setSelectedPackage(pkg);
    setShowRequireLoginModal(true);
  };

  return (
    <div className="bms-landing-wrapper">
      <PortalNavbar user={null} />

      {/* 3. Hero Section */}
      <section className="bms-hero-section">
        <div className="bms-hero-container">
          <div className="bms-hero-content">
            <div className="bms-hero-badge">
              <FaShieldAlt /> TIÊU CHUẨN ISO 15189 &amp; CHỨNG NHẬN CAP
            </div>
            <h2 className="bms-hero-title">
              Xét Nghiệm Máu Nhanh Chóng, <span>Chính Xác &amp; Tin Cậy</span>
            </h2>
            <p className="bms-hero-desc">
              Phòng Lab tự động hóa hoàn toàn với 80+ chỉ số huyết học, sinh hóa. Kết quả được thẩm định bởi Bác sĩ Chuyên khoa, trả trực tuyến có chữ ký số sau 90-120 phút.
            </p>

            <form className="bms-search-bar" onSubmit={(e) => { e.preventDefault(); window.location.href = `/services?search=${encodeURIComponent(searchTerm)}`; }}>
              <FaSearch className="bms-search-icon" />
              <input 
                type="text" 
                className="bms-search-input" 
                placeholder="Tìm gói xét nghiệm..." 
                value={searchTerm} 
                onChange={e => setSearchTerm(e.target.value)} 
              />
              <button type="submit" className="bms-search-btn">Tìm Kiếm</button>
            </form>

            {/* Native BMS Hero Metrics */}
            <div className="bms-hero-metrics">
              <div className="bms-metric-item">
                <h3>500,000+</h3>
                <p>Lượt xét nghiệm</p>
              </div>
              <div className="bms-metric-item">
                <h3>99.98%</h3>
                <p>Độ chính xác QC</p>
              </div>
              <div className="bms-metric-item">
                <h3>60 – 90</h3>
                <p>Phút trả kết quả SLA</p>
              </div>
              <div className="bms-metric-item">
                <h3>100%</h3>
                <p>Chuỗi lạnh IoT 2-6°C</p>
              </div>
            </div>
          </div>

          {/* Right Utility Card: 2-in-1 Fast Tracker */}
          <div className="bms-utility-card" id="tra-cuu">
            <div className="bms-utility-header">
              <h3><FaFileMedicalAlt className="text-primary" /> Tra Cứu Tiến Trình &amp; Kết Quả</h3>
              <p>Dành cho bệnh nhân đã lấy mẫu tại phòng khám hoặc tại nhà</p>
            </div>
            <form onSubmit={handleTrackSubmit}>
              <div className="bms-form-group">
                <label className="bms-form-label">Mã phiếu hẹn / Barcode *</label>
                <input 
                  type="text" 
                  className="bms-form-control" 
                  required 
                  placeholder="Ví dụ: ORD-2026-0881" 
                  value={lookupCode} 
                  onChange={e => setLookupCode(e.target.value)} 
                />
              </div>
              <div className="bms-form-group">
                <label className="bms-form-label">Số điện thoại *</label>
                <input 
                  type="tel" 
                  className="bms-form-control" 
                  required 
                  placeholder="Ví dụ: 0912 345 678" 
                  value={lookupPhone} 
                  onChange={e => setLookupPhone(e.target.value)} 
                />
              </div>
              <button type="submit" className="bms-btn bms-btn-primary w-100 py-2.5 mt-2">
                <FaSearch /> Tra Cứu Ngay
              </button>
            </form>
            <div className="bms-utility-alert">
              <FaCheckCircle className="text-success" />
              <span>Tra cứu trực tiếp kết quả có chữ ký số điện tử của Bác sĩ.</span>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Clinical Workflow (4 Steps) */}
      <section className="bms-section bms-section-alt" id="quy-trinh">
        <div className="bms-container">
          <div className="bms-section-header">
            <div className="bms-section-subtitle">QUY TRÌNH TINH GỌN &amp; AN TOÀN</div>
            <h3 className="bms-section-title">Xét Nghiệm Máu Dễ Dàng Chỉ Với 4 Bước</h3>
            <p className="bms-section-desc">Toàn bộ tiến trình từ lúc đặt lịch đến khi nhận phiếu kết quả được chuẩn hóa theo quy chuẩn ISO 15189:2022.</p>
          </div>
          <div className="bms-steps-grid">
            <div className="bms-step-card">
              <div className="bms-step-number">01</div>
              <div className="bms-step-icon"><FaCalendarCheck /></div>
              <h4>Đăng Ký Trực Tuyến</h4>
              <p>Chọn gói khám và thời gian phù hợp. Chọn lấy mẫu tại trung tâm BMS hoặc dịch vụ lấy mẫu tại nhà.</p>
            </div>
            <div className="bms-step-card">
              <div className="bms-step-number">02</div>
              <div className="bms-step-icon"><FaVial /></div>
              <h4>Lấy Mẫu Vô Trùng</h4>
              <p>Điều dưỡng thực hiện lấy mẫu nhẹ nhàng, mã hóa Barcode một chiều và bảo quản chuỗi lạnh IoT 2-6°C.</p>
            </div>
            <div className="bms-step-card">
              <div className="bms-step-number">03</div>
              <div className="bms-step-icon"><FaMicroscope /></div>
              <h4>Phân Tích Tự Động</h4>
              <p>Mẫu được chạy trên hệ thống máy phân tích tự động thế hệ mới, kiểm soát chất lượng IQC Westgard.</p>
            </div>
            <div className="bms-step-card">
              <div className="bms-step-number">04</div>
              <div className="bms-step-icon"><FaFilePdf /></div>
              <h4>Nhận Kết Quả Ký Số</h4>
              <p>Bác sĩ Chuyên khoa thẩm định &amp; ký số. Xem trực tuyến và tải PDF có giá trị pháp lý toàn quốc.</p>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Service Packages Catalog */}
      <section className="bms-section">
        <div className="bms-container">
          <div className="bms-section-header">
            <div className="bms-section-subtitle">DANH MỤC DỊCH VỤ NIÊM YẾT</div>
            <h3 className="bms-section-title">Gói Xét Nghiệm Máu Tiêu Biểu</h3>
            <p className="bms-section-desc">Bảng giá niêm yết công khai, minh bạch, hỗ trợ chiết tính BHYT tự động.</p>
          </div>
          <div className="bms-packages-grid">
            {packages.map((pkg, idx) => (
              <div key={pkg.id || idx} className={`bms-package-card ${idx === 0 ? 'featured' : ''}`}>
                <div className="bms-package-body">
                  <h4 className="bms-package-title">{pkg.packageName}</h4>
                  <p className="bms-package-summary">{pkg.description || 'Xét nghiệm đạt chuẩn y tế ISO 15189.'}</p>
                  <div className="bms-package-price">
                    <span className="bms-price-val">{new Intl.NumberFormat('vi-VN').format(pkg.price || 0)}</span>
                    <span className="bms-price-unit">VNĐ</span>
                  </div>
                  <button type="button" className="bms-btn bms-btn-primary w-100 mt-3" onClick={() => handleBookClick(pkg)}>
                    <FaCalendarCheck /> Đặt Lịch Xét Nghiệm
                  </button>
                </div>
              </div>
            ))}
          </div>
          <div className="text-center mt-4 pt-2">
            <a href="/services" className="bms-btn bms-btn-outline">
              Xem Toàn Bộ Gói Xét Nghiệm &rarr;
            </a>
          </div>
        </div>
      </section>

      {/* 6. Quality & Trust Pillars */}
      <section className="bms-section bms-section-alt">
        <div className="bms-container">
          <div className="bms-section-header">
            <div className="bms-section-subtitle">TIÊU CHUẨN QUỐC TẾ</div>
            <h3 className="bms-section-title">An Toàn Sinh Học &amp; Kiểm Soát Chất Lượng</h3>
          </div>
          <div className="bms-trust-grid">
            <div className="bms-trust-card">
              <div className="bms-trust-icon"><FaTemperatureLow /></div>
              <div className="bms-trust-text">
                <h4>Chuỗi Lạnh IoT Bảo Quản Mẫu 2-6°C</h4>
                <p>Cảm biến IoT giám sát nhiệt độ và độ ẩm liên tục trong suốt hành trình vận chuyển mẫu, phát hiện và cảnh báo vi phạm ngay lập tức.</p>
              </div>
            </div>
            <div className="bms-trust-card">
              <div className="bms-trust-icon"><FaFilePdf /></div>
              <div className="bms-trust-text">
                <h4>Chữ Ký Số Y Tế &amp; Mã QR Xác Thực</h4>
                <p>Phiếu kết quả điện tử được cấp dấu thời gian và chữ ký số Bác sĩ chuyên khoa, có giá trị pháp lý tương đương bản giấy.</p>
              </div>
            </div>
            <div className="bms-trust-card">
              <div className="bms-trust-icon"><FaHome /></div>
              <div className="bms-trust-text">
                <h4>Lấy Mẫu Tận Nơi Tiện Lợi</h4>
                <p>Đội ngũ điều dưỡng đến tận nhà đúng giờ hẹn, thao tác vô trùng chuẩn mực, tiết kiệm thời gian chờ đợi cho người già và trẻ nhỏ.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Modal: Patient Login Requirement Notice */}
      {showRequireLoginModal && (
        <div className="bms-modal-backdrop" onClick={() => setShowRequireLoginModal(false)}>
          <div className="bms-modal-card bms-modal-card-sm" onClick={e => e.stopPropagation()}>
            <div className="bms-modal-head">
              <h3 className="bms-modal-title"><FaLock className="text-primary" /> Yêu Cầu Đăng Nhập</h3>
              <button type="button" className="bms-modal-close" onClick={() => setShowRequireLoginModal(false)}><FaTimes /></button>
            </div>
            <div className="bms-modal-body text-center py-3">
              <p className="small text-muted mb-3">
                Tuân thủ quy chuẩn bảo mật hồ sơ bệnh án ISO 15189, quý khách vui lòng đăng nhập tài khoản bệnh nhân để tiếp tục đặt lịch.
              </p>
              <a className="bms-btn bms-btn-primary w-100 py-2 mb-2" href={`/login?redirect=booking&pkg=${encodeURIComponent(selectedPackage?.packageName || "")}`}>
                Đăng Nhập Cổng Y Tế <FaArrowRight />
              </a>
              <a className="bms-btn bms-btn-outline w-100 py-2" href="/register">Tạo Hồ Sơ Mới</a>
            </div>
          </div>
        </div>
      )}

      {/* 7. Mega Footer (4 Columns Legal BYT) */}
      <MegaFooter />
    </div>
  );
}
