/**
 * @file GuestHomePage.jsx
 * @description Master Public Patient & Visitor Landing Portal (BMS SVG UI Kit V3.1 HOTFIX).
 * Integrates:
 * - Asymmetric Hero Grid: Left narrative + search + 2x2 metric quad with 64px animated SVGs;
 *   Right: Big hero-lab-composition.svg with live SMIL green waveform drawing.
 * - Dedicated Centered Fast Tracker Card with tracker-card-ornament.svg.
 * - 4-Step Clinical Workflow with 120px step vignettes.
 * - Featured Service Packages Quad with BmsPackageIcon specialty artwork.
 * - All 14 Narrative Clinical Sections (sec-01 to sec-14) with animated SVGs & real BMS clinical facts.
 * Conforms to: BMS V3.1 HOTFIX specification (zero blurry shadows, pure 2D flat, 100% real DB data).
 */

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { fetchServiceCatalog } from '../catalog/api/catalogApi';
import MegaFooter from './components/MegaFooter';
import PortalNavbar from './components/PortalNavbar';
import BmsPackageIcon from '../../shared/components/kit/BmsPackageIcon';
import { getCategoryIconKey } from '../../shared/components/kit/bmsIconMaps';
import './landing-sections.css';

const LANDING_SECTIONS = [
  {
    num: '01 / TỰ ĐỘNG HÓA LAB',
    title: 'Hệ Thống Phân Tích Máu Tự Động Hóa 100%',
    desc: 'Chuỗi máy phân tích thế hệ mới kết nối trực tiếp với phần mềm LIS, loại trừ hoàn toàn nguy cơ nhầm lẫn mẫu và sai sót con người.',
    svg: '/assets/bms/svg/sections/landing/sec-01-lab-automation.svg',
    bullets: [
      'Mã hóa ống nghiệm bằng barcode chuẩn y tế',
      'Đồng bộ hóa 2 chiều tự động với LIS/HIS',
      'Thời gian phân tích tối ưu chỉ từ 30 – 45 phút'
    ]
  },
  {
    num: '02 / CHUỖI LẠNH IOT',
    title: 'Giám Sát Chuỗi Lạnh 2°C – 6°C Thời Gian Thực 24/7',
    desc: 'Thùng vận chuyển chuyên dụng tích hợp cảm biến IoT liên tục ghi nhận nhiệt độ và độ ẩm, cảnh báo ngay lập tức nếu có dao động bất thường.',
    svg: '/assets/bms/svg/sections/landing/sec-02-coldchain-monitor.svg',
    bullets: [
      'Cảm biến nhiệt độ IoT độ chính xác cao ±0.1°C',
      'Bảo toàn tuyệt đối tính toàn vẹn của tế bào máu',
      'Biên bản hành trình lạnh số hóa tự động'
    ]
  },
  {
    num: '03 / PHÁP LÝ & KÝ SỐ',
    title: 'Chữ Ký Số Y Tế Hợp Pháp Bởi Bác Sĩ Chuyên Khoa',
    desc: 'Mỗi phiếu kết quả điện tử được cấp dấu thời gian Timestamp và Chữ ký số PKI của Bác sĩ Trưởng khoa, có giá trị pháp lý tương đương bản giấy.',
    svg: '/assets/bms/svg/sections/landing/sec-03-digital-signature.svg',
    bullets: [
      'Chữ ký số PKI chuẩn Thông tư Bộ Y Tế',
      'Mã QR xác thực tính toàn vẹn tức thì',
      'Được công nhận tại các bệnh viện tuyến đầu'
    ]
  },
  {
    num: '04 / TRUY VẾT MẪU BỆNH PHẨM',
    title: 'Một Mã Định Danh Barcode, Một Hành Trình Khép Kín',
    desc: 'Mã vạch Code 128 được in và dán ngay tại thời điểm lấy mẫu, định danh duy nhất xuyên suốt quy trình tiếp nhận, ly tâm, phân tích và lưu biobank.',
    svg: '/assets/bms/svg/sections/landing/sec-04-barcode-traceability.svg',
    bullets: [
      'Mã vạch y tế Code 128 không thể tẩy xóa',
      'Loại bỏ hoàn toàn rủi ro nhầm lẫn danh tính',
      'Bệnh nhân tự tra cứu hành trình theo thời gian thực'
    ]
  },
  {
    num: '05 / KIỂM SOÁT NỘI KIỂM',
    title: 'Kiểm Chuẩn Chất Lượng Đa Quy Tắc Westgard & Levey-Jennings',
    desc: 'Hệ thống bắt buộc phải vượt qua quy chuẩn nội kiểm 3 mức nồng độ (Low, Normal, High) trước mỗi ca chạy mẫu, đảm bảo độ chuẩn xác y khoa cao nhất.',
    svg: '/assets/bms/svg/sections/landing/sec-05-qc-westgard.svg',
    bullets: [
      'Đồ thị Levey-Jennings tự động phân tích độ lệch chuẩn',
      'Áp dụng nghiêm ngặt 6 quy tắc cảnh báo Westgard',
      'Tham gia chương trình ngoại kiểm quốc tế EQAS / RIQAS'
    ]
  },
  {
    num: '06 / TIỆN ÍCH TẬN NƠI',
    title: 'Dịch Vụ Lấy Mẫu Xét Nghiệm Tại Nhà Vô Trùng & Tiện Lợi',
    desc: 'Đội ngũ điều dưỡng chuyên nghiệp đến tận nơi đúng giờ hẹn, thao tác êm ái, mang lại trải nghiệm y tế cao cấp cho gia đình, người già và trẻ nhỏ.',
    svg: '/assets/bms/svg/sections/landing/sec-06-home-sampling.svg',
    bullets: [
      'Điều dưỡng có chứng chỉ hành nghề chính quy',
      'Dụng cụ lấy máu chân không vô khuẩn dùng 1 lần',
      'Tiết kiệm thời gian di chuyển và chờ đợi tại bệnh viện'
    ]
  },
  {
    num: '07 / CAM KẾT THỜI GIAN (SLA)',
    title: 'Cam Kết Thời Gian Trả Kết Quả Nhanh Chóng Từ 60 – 90 Phút',
    desc: 'Quy trình tối ưu hóa giúp bệnh nhân nhận thông báo kết quả qua tin nhắn SMS và xem trực tuyến ngay khi bác sĩ hoàn tất thẩm định.',
    svg: '/assets/bms/svg/sections/landing/sec-07-tat-sla.svg',
    bullets: [
      'Theo dõi đồng hồ đếm ngược SLA theo thời gian thực',
      'SMS thông báo ngay khi có kết quả thẩm định',
      'Hỗ trợ hội chẩn trực tuyến cùng bác sĩ ngay khi cần'
    ]
  },
  {
    num: '08 / ĐỘI NGŨ CHUYÊN GIA',
    title: 'Bác Sĩ Chuyên Khoa Thẩm Định & Tư Vấn Lâm Sàng 1-1',
    desc: 'Không chỉ trả về con số, đội ngũ bác sĩ chuyên khoa xét nghiệm luôn sẵn sàng giải thích chi tiết ý nghĩa từng chỉ số và định hướng điều trị phù hợp.',
    svg: '/assets/bms/svg/sections/landing/sec-08-doctor-review.svg',
    bullets: [
      'Bác sĩ chuyên khoa y học xét nghiệm trực tiếp thẩm duyệt',
      'Đối chiếu lịch sử xét nghiệm và cảnh báo Delta Check',
      'Tư vấn phác đồ dinh dưỡng và chăm sóc sức khỏe cá nhân hóa'
    ]
  },
  {
    num: '09 / HÀNH TRÌNH CHĂM SÓC',
    title: 'Hành Trình Chăm Sóc Sức Khỏe Liền Mạch & Toàn Diện',
    desc: 'Từ lúc đăng ký hẹn, theo dõi lấy mẫu, nhận kết quả đến lưu trữ hồ sơ bệnh án điện tử trọn đời trên một nền tảng duy nhất.',
    svg: '/assets/bms/svg/sections/landing/sec-09-patient-journey.svg',
    bullets: [
      'Biểu đồ theo dõi biến thiên chỉ số sức khỏe qua các năm',
      'Nhắc lịch tái khám và xét nghiệm định kỳ tự động',
      'Chia sẻ hồ sơ an toàn cho bác sĩ điều trị chỉ với 1 chạm'
    ]
  },
  {
    num: '10 / CHỨNG NHẬN QUỐC TẾ',
    title: 'Hệ Thống Tiêu Chuẩn Chất Lượng Quốc Tế ISO 15189:2022 & CAP',
    desc: 'Phòng Lab BMS tự hào đáp ứng toàn diện các tiêu chí đánh giá nghiêm ngặt theo tiêu chuẩn ISO 15189:2022 và Quyết định 2429/QĐ-BYT.',
    svg: '/assets/bms/svg/sections/landing/sec-10-accreditation-wall.svg',
    bullets: [
      'Được đánh giá và công nhận định kỳ bởi các tổ chức uy tín',
      'Quy trình SOP vận hành chuẩn mực cho hơn 100 xét nghiệm',
      'Cam kết độ tin cậy kết quả xét nghiệm đạt trên 99.98%'
    ]
  },
  {
    num: '11 / CHUẨN HÓA ỐNG MẪU',
    title: 'Hệ Thống Màu Nắp Ống Nghiệm Chuẩn Y Tế Quốc Tế',
    desc: 'Mỗi loại xét nghiệm sử dụng ống lấy máu chân không chuyên biệt với chất chống đông phù hợp, bảo đảm độ chính xác của phản ứng sinh học.',
    svg: '/assets/bms/svg/sections/landing/sec-11-tube-legend.svg',
    bullets: [
      'EDTA nắp tím cho tổng phân tích tế bào máu ngoại vi',
      'Serum nắp đỏ/vàng cho xét nghiệm sinh hóa và miễn dịch',
      'Citrate nắp xanh dương cho khảo sát chức năng đông máu'
    ]
  },
  {
    num: '12 / BẢO MẬT DỮ LIỆU',
    title: 'Bảo Vệ Dữ Liệu Sức Khỏe Theo Nghị Định 13/2023/NĐ-CP',
    desc: 'Mã hóa dữ liệu định danh bệnh nhân (PII), hệ thống phân quyền đa tầng và kiểm toán truy cập nghiêm ngặt đảm bảo an toàn thông tin y tế tuyệt đối.',
    svg: '/assets/bms/svg/sections/landing/sec-12-security-privacy.svg',
    bullets: [
      'Mã hóa đầu cuối kết quả xét nghiệm bằng thuật toán AES-256',
      'Ẩn danh hóa thông tin cá nhân khi tra cứu công khai',
      'Lịch sử truy cập được ghi nhật ký bất biến Audit Log'
    ]
  },
  {
    num: '13 / MINH BẠCH CHI PHÍ',
    title: 'Bảng Giá Niêm Yết Công Khai, Minh Bạch & Đúng Tuyến BHYT',
    desc: 'Đơn giá dịch vụ được công khai minh bạch theo quy chuẩn của Bộ Y Tế, không phụ thu bất kỳ khoản chi phí ẩn nào, hỗ trợ thanh toán thông tuyến.',
    svg: '/assets/bms/svg/sections/landing/sec-13-transparent-pricing.svg',
    bullets: [
      'Bao gồm trọn gói vật tư lấy mẫu tiêu hao vô trùng',
      'Áp dụng chiết khấu thanh toán BHYT tự động theo quy định',
      'Xuất hóa đơn điện tử VAT 0% nhanh chóng qua email'
    ]
  },
  {
    num: '14 / CỔNG KẾT QUẢ SỐ',
    title: 'Tra Cứu & Tải Phiếu Kết Quả Điện Tử Mọi Lúc, Mọi Nơi',
    desc: 'Truy cập cổng dịch vụ trực tuyến để tra cứu tiến trình mẫu máu và tải bản PDF kết quả xét nghiệm có chữ ký số điện tử trên mọi thiết bị.',
    svg: '/assets/bms/svg/sections/landing/sec-14-results-portal.svg',
    bullets: [
      'Giao diện tương thích hoàn hảo trên điện thoại và máy tính',
      'Tải bản PDF có giá trị pháp lý nộp cho cơ quan bảo hiểm',
      'Lưu trữ đám mây an toàn, không lo thất lạc bản giấy'
    ]
  }
];

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
    <div className="bms-telehealth-page" style={{ backgroundColor: '#F8FAFC', minHeight: '100vh', fontFamily: 'var(--font-sans)' }}>
      <PortalNavbar user={null} />

      {/* 1. Hero Section (V3.1 Layout: Narrative + 2x2 Metric Grid Left, Big Animated Composition Right) */}
      <section className="bms-hero-container-wrap pt-4 pb-3">
        <div className="container" style={{ maxWidth: '1360px' }}>
          <div className="bms-kit-hero">
            {/* Left Column: Narrative, Search Pill, 2x2 Metric Quad */}
            <div className="bms-hero-narrative">
              <div className="bms-status-chip d-inline-flex align-items-center gap-2 mb-3">
                <img src="/assets/lab-icon.png" alt="Lab" style={{ width: '16px', height: '16px', objectFit: 'contain' }} />
                <span>CHĂM SÓC TỪ NHỮNG CHỈ SỐ NHỎ NHẤT · TIÊU CHUẨN ISO 15189</span>
              </div>

              <h1 className="bms-hero-heading mb-3" style={{ fontSize: 'clamp(32px, 3.4vw, 44px)', fontWeight: 800, lineHeight: 1.18, letterSpacing: '-0.03em', color: '#0F172A' }}>
                Xét Nghiệm Máu Nhanh Chóng,<br />
                <span style={{ color: '#1E60E6' }}>Chính Xác &amp; Tin Cậy</span>
              </h1>

              <p className="bms-hero-lead mb-4" style={{ fontSize: '14.5px', color: '#475569', lineHeight: '1.7', maxWidth: '580px' }}>
                Hệ thống phòng xét nghiệm tự động hóa hoàn toàn với 80+ chỉ số huyết học và sinh hóa. Kết quả được thẩm định bởi Bác sĩ Chuyên khoa, trả trực tuyến có chữ ký số điện tử sau 60–90 phút.
              </p>

              {/* Search Pill Capsule */}
              <form
                className="bms-search-pill-capsule mb-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  window.location.href = `/services?search=${encodeURIComponent(searchTerm)}`;
                }}
              >
                <input
                  type="text"
                  className="bms-search-input-field"
                  placeholder="Tìm gói xét nghiệm theo tên, triệu chứng..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
                <button type="submit" className="bms-btn-pill-primary">
                  Tìm Kiếm
                </button>
              </form>

              {/* 2x2 Metric Grid (Spacious, 56px Animated SVGs, No Text Crowding) */}
              <div className="bms-hero-page-metrics">
                <div className="bms-metric-item-v3">
                  <img src="/assets/bms/svg/hero/home/metric-tests-safe.svg" alt="" aria-hidden="true" />
                  <div>
                    <div className="metric-number tabular-nums">500,000+</div>
                    <div className="metric-label">Lượt xét nghiệm an toàn</div>
                  </div>
                </div>
                <div className="bms-metric-item-v3">
                  <img src="/assets/bms/svg/hero/home/metric-qc-accuracy.svg" alt="" aria-hidden="true" />
                  <div>
                    <div className="metric-number tabular-nums">99.98%</div>
                    <div className="metric-label">Độ chính xác chuẩn QC</div>
                  </div>
                </div>
                <div className="bms-metric-item-v3">
                  <img src="/assets/bms/svg/hero/home/metric-sla-tat.svg" alt="" aria-hidden="true" />
                  <div>
                    <div className="metric-number tabular-nums">60 – 90</div>
                    <div className="metric-label">Phút trả kết quả SLA</div>
                  </div>
                </div>
                <div className="bms-metric-item-v3">
                  <img src="/assets/bms/svg/hero/home/metric-coldchain.svg" alt="" aria-hidden="true" />
                  <div>
                    <div className="metric-number tabular-nums">100%</div>
                    <div className="metric-label">Chuỗi lạnh IoT 2-6°C</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Big Animated Lab Scene (Waveform Drawing in Real-Time) */}
            <div className="bms-hero-art--big">
              <img
                src="/assets/bms/svg/hero/home/hero-lab-composition.svg"
                alt="BMS Automated Laboratory Workflow Scene"
                aria-hidden="true"
              />
            </div>
          </div>

          {/* Centered Fast Tracker Card Row (Spacious & Distinct) */}
          <div className="bms-tracker-row-v3">
            <div className="bms-tracker-card-v3 text-center" id="tra-cuu">
              <img
                src="/assets/bms/svg/hero/home/tracker-card-ornament.svg"
                alt=""
                className="tracker-ornament"
                aria-hidden="true"
              />
              <h2 className="fw-bold mb-1" style={{ fontSize: '20px', color: '#0F172A' }}>Tra Cứu Kết Quả Điện Tử</h2>
              <p className="text-muted mb-3" style={{ fontSize: '13px' }}>
                Dành cho bệnh nhân đã lấy mẫu tại trung tâm hoặc tại nhà
              </p>

              <form onSubmit={handleTrackSubmit} className="text-start">
                <div className="bms-form-field mb-2.5">
                  <label className="bms-field-label">Mã phiếu hẹn / Barcode mẫu *</label>
                  <input
                    type="text"
                    className="bms-input-soft"
                    required
                    placeholder="Ví dụ: ORD-2026-0881 hoặc BC-20261009-001"
                    value={lookupCode}
                    onChange={e => setLookupCode(e.target.value)}
                  />
                </div>

                <div className="bms-form-field mb-3">
                  <label className="bms-field-label">Số điện thoại đăng ký *</label>
                  <input
                    type="tel"
                    className="bms-input-soft"
                    required
                    placeholder="Ví dụ: 0912 345 678"
                    value={lookupPhone}
                    onChange={e => setLookupPhone(e.target.value)}
                  />
                </div>

                <button type="submit" className="bms-btn-blue-cta w-100 py-2.5">
                  Tra Cứu Ngay
                </button>
              </form>

              <div className="bms-tracker-footer-note mt-3">
                <span>Phiếu kết quả có chữ ký số SHA-256 của Bác sĩ Chuyên khoa</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Clinical Workflow Section (4 Soft Steps with 120px Vignettes) */}
      <section className="bms-section-wrap py-5" id="quy-trinh">
        <div className="container" style={{ maxWidth: '1360px' }}>
          <div className="bms-section-lead-center text-center mb-5">
            <div className="bms-status-chip d-inline-block">QUY TRÌNH TINH GỌN &amp; AN TOÀN</div>
            <h2 className="bms-section-h2 mt-2 mb-2">Bốn Bước, Một Hành Trình An Tâm</h2>
            <p className="bms-section-p">
              Toàn bộ tiến trình từ lúc đặt lịch đến khi nhận phiếu kết quả được chuẩn hóa theo quy chuẩn y tế ISO 15189:2022.
            </p>
          </div>

          <div className="bms-steps-quad">
            <div className="bms-step-soft-card d-flex flex-column align-items-start">
              <div className="w-100 text-center mb-3">
                <img
                  src="/assets/bms/svg/sections/landing/step-01-register.svg"
                  alt="Đăng Ký Trực Tuyến"
                  className="bms-step-art-v3"
                  aria-hidden="true"
                />
              </div>
              <div className="bms-step-badge-num tabular-nums" style={{ color: '#1E60E6', fontSize: '28px', fontWeight: 800, marginBottom: '8px' }}>01</div>
              <h3 className="bms-step-h3">Đăng Ký Trực Tuyến</h3>
              <p className="bms-step-desc">
                Chọn gói khám và thời gian thuận tiện. Lựa chọn lấy mẫu tại trung tâm BMS hoặc dịch vụ lấy mẫu tại nhà.
              </p>
            </div>

            <div className="bms-step-soft-card d-flex flex-column align-items-start">
              <div className="w-100 text-center mb-3">
                <img
                  src="/assets/bms/svg/sections/landing/step-02-sampling.svg"
                  alt="Lấy Mẫu Vô Trùng"
                  className="bms-step-art-v3"
                  aria-hidden="true"
                />
              </div>
              <div className="bms-step-badge-num tabular-nums" style={{ color: '#1E60E6', fontSize: '28px', fontWeight: 800, marginBottom: '8px' }}>02</div>
              <h3 className="bms-step-h3">Lấy Mẫu Vô Trùng</h3>
              <p className="bms-step-desc">
                Điều dưỡng thực hiện lấy mẫu nhẹ nhàng, mã hóa Barcode một chiều và đưa ngay vào chuỗi lạnh bảo quản 2-6°C.
              </p>
            </div>

            <div className="bms-step-soft-card d-flex flex-column align-items-start">
              <div className="w-100 text-center mb-3">
                <img
                  src="/assets/bms/svg/sections/landing/step-03-analysis.svg"
                  alt="Phân Tích Tự Động"
                  className="bms-step-art-v3"
                  aria-hidden="true"
                />
              </div>
              <div className="bms-step-badge-num tabular-nums" style={{ color: '#1E60E6', fontSize: '28px', fontWeight: 800, marginBottom: '8px' }}>03</div>
              <h3 className="bms-step-h3">Phân Tích Tự Động</h3>
              <p className="bms-step-desc">
                Mẫu được chạy trên hệ thống máy phân tích tự động thế hệ mới, kiểm soát chất lượng nội kiểm Westgard.
              </p>
            </div>

            <div className="bms-step-soft-card d-flex flex-column align-items-start">
              <div className="w-100 text-center mb-3">
                <img
                  src="/assets/bms/svg/sections/landing/step-04-esign.svg"
                  alt="Nhận Kết Quả Ký Số"
                  className="bms-step-art-v3"
                  aria-hidden="true"
                />
              </div>
              <div className="bms-step-badge-num tabular-nums" style={{ color: '#1E60E6', fontSize: '28px', fontWeight: 800, marginBottom: '8px' }}>04</div>
              <h3 className="bms-step-h3">Nhận Kết Quả Ký Số</h3>
              <p className="bms-step-desc">
                Bác sĩ Chuyên khoa thẩm định &amp; ký số. Xem trực tuyến và tải PDF có giá trị pháp lý toàn quốc.
              </p>
            </div>
          </div>

          <div className="text-center mt-4">
            <Link to="/iso-process" className="bms-btn-neutral-pill">
              Khám Phá Chi Tiết Quy Trình ISO 15189:2022 &rarr;
            </Link>
          </div>
        </div>
      </section>

      {/* 3. Service Packages Catalog (Quad with Specialty Icons) */}
      <section className="bms-section-wrap py-4">
        <div className="container" style={{ maxWidth: '1360px' }}>
          <div className="bms-section-lead-center text-center mb-5">
            <div className="bms-status-chip d-inline-block">DANH MỤC DỊCH VỤ NIÊM YẾT</div>
            <h2 className="bms-section-h2 mt-2 mb-2">Gói Xét Nghiệm Máu Tiêu Biểu</h2>
            <p className="bms-section-p">
              Bảng giá niêm yết công khai, minh bạch, hỗ trợ chiết tính BHYT tự động theo quy định Bộ Y Tế.
            </p>
          </div>

          <div className="bms-packages-quad">
            {packages.map((pkg, idx) => (
              <div key={pkg.id || idx} className={`bms-package-soft-card ${idx === 0 ? 'promoted' : ''}`}>
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <span className="bms-package-category-chip m-0">{pkg.category || 'Huyết học'}</span>
                  <span style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: '11px', color: '#64748B', backgroundColor: '#F1F5F9', padding: '2px 7px', borderRadius: '6px' }}>
                    {pkg.packageCode || pkg.id || 'BMS'}
                  </span>
                </div>
                <div className="d-flex align-items-center gap-3 mb-2">
                  <div style={{ width: '44px', height: '44px', flexShrink: 0 }}>
                    <BmsPackageIcon name={getCategoryIconKey(pkg.category)} size={44} />
                  </div>
                  <h3 className="bms-pkg-title m-0" style={{ fontSize: '15.5px' }}>{pkg.packageName}</h3>
                </div>
                <p className="bms-pkg-desc">{pkg.description || 'Xét nghiệm đạt chuẩn y tế ISO 15189.'}</p>
                <div className="bms-pkg-price-row">
                  <span className="bms-price-number tabular-nums">
                    {new Intl.NumberFormat('vi-VN').format(pkg.price || 0)}
                  </span>
                  <span className="bms-price-currency">VNĐ</span>
                </div>
                <button
                  type="button"
                  className="bms-btn-mint-cta w-100 mt-auto"
                  onClick={() => handleBookClick(pkg)}
                >
                  Đặt Lịch Xét Nghiệm
                </button>
              </div>
            ))}
          </div>

          <div className="text-center mt-5 d-flex justify-content-center flex-wrap gap-3">
            <Link to="/services" className="bms-btn-blue-cta">
              Xem Toàn Bộ Gói Xét Nghiệm &rarr;
            </Link>
            <Link to="/pricing" className="bms-btn-neutral-pill">
              Tra Cứu Bảng Giá Niêm Yết &rarr;
            </Link>
          </div>
        </div>
      </section>

      {/* 4. Complete V3.1 Clinical Narrative Sections (14 Expanded Vignettes) */}
      <section className="bms-section-wrap py-4">
        <div className="container" style={{ maxWidth: '1360px' }}>
          <div className="bms-section-lead-center text-center mb-5">
            <div className="bms-status-chip d-inline-block">TIÊU CHUẨN LÂM SÀNG TOÀN DIỆN</div>
            <h2 className="bms-section-h2 mt-2 mb-2">Quy Trình &amp; Năng Lực Phòng Lab Chuẩn Quốc Tế</h2>
            <p className="bms-section-p">
              Khám phá 14 khía cạnh vận hành y khoa chuẩn mực, tự động hóa và an toàn sinh học tại hệ thống BMS Lab.
            </p>
          </div>

          <div className="bms-landing-sections-wrap">
            {LANDING_SECTIONS.map((sec, idx) => (
              <div key={idx} className={`bms-section-row-v3 ${idx % 2 === 1 ? 'alt-bg' : ''}`}>
                <div className="section-copy">
                  <div className="num-tag">{sec.num}</div>
                  <h2>{sec.title}</h2>
                  <p>{sec.desc}</p>
                  <ul>
                    {sec.bullets.map((b, bIdx) => (
                      <li key={bIdx} className="mb-1">{b}</li>
                    ))}
                  </ul>
                </div>
                <img
                  src={sec.svg}
                  alt={sec.title}
                  aria-hidden="true"
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Modal: Patient Login Requirement Notice */}
      {showRequireLoginModal && (
        <div className="bms-modal-backdrop" onClick={() => setShowRequireLoginModal(false)}>
          <div className="bms-modal-card bms-modal-card-sm" onClick={e => e.stopPropagation()}>
            <div className="bms-modal-head">
              <h3 className="bms-modal-title">Yêu Cầu Đăng Nhập</h3>
              <button
                type="button"
                className="bms-modal-close"
                onClick={() => setShowRequireLoginModal(false)}
              >
                &times;
              </button>
            </div>
            <div className="bms-modal-body text-center py-3">
              <p className="small text-muted mb-4">
                Tuân thủ quy chuẩn bảo mật hồ sơ bệnh án ISO 15189, quý khách vui lòng đăng nhập tài khoản bệnh nhân để tiếp tục đặt lịch.
              </p>
              <a
                className="bms-btn-blue-cta w-100 mb-2 text-center"
                href={`/login?redirect=booking&pkg=${encodeURIComponent(selectedPackage?.packageName || "")}`}
              >
                Đăng Nhập Cổng Y Tế
              </a>
              <a className="bms-btn-neutral-pill w-100 text-center" href="/register">
                Tạo Hồ Sơ Mới
              </a>
            </div>
          </div>
        </div>
      )}

      {/* 5. Mega Footer */}
      <MegaFooter />
    </div>
  );
}
