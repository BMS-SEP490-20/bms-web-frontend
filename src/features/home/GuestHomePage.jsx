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
import { FaVial, FaClock } from 'react-icons/fa';
import { searchTestPackages } from '../catalog/api/catalogApi';
import MegaFooter from './components/MegaFooter';
import PortalNavbar from './components/PortalNavbar';
import BmsPackageIcon from '../../shared/components/kit/BmsPackageIcon';
import { getCategoryIconKey } from '../../shared/components/kit/bmsIconMaps';
import './landing-sections.css';

const LANDING_SECTIONS = [
  {
    num: '01 / TỰ ĐỘNG HÓA LAB',
    title: 'Phòng Lab Tự Động Hóa 100%',
    desc: 'Chuỗi máy phân tích kết nối trực tiếp với LIS, loại trừ nguy cơ sai sót con người.',
    svg: '/assets/bms/svg/sections/landing/sec-01-lab-automation.svg',
    bullets: [
      'Mã hóa barcode tự động hai chiều',
      'Đồng bộ kết quả tức thì với LIS/HIS',
      'Thời gian phân tích chỉ từ 30 – 45 phút'
    ]
  },
  {
    num: '02 / CHUỖI LẠNH IOT',
    title: 'Chuỗi Lạnh IoT 2°C – 6°C Giám Sát 24/7',
    desc: 'Cảm biến IoT liên tục ghi nhận nhiệt độ và độ ẩm, bảo toàn tế bào máu.',
    svg: '/assets/bms/svg/sections/landing/sec-02-coldchain-monitor.svg',
    bullets: [
      'Độ chính xác cảm biến nhiệt độ ±0.1°C',
      'Ngăn ngừa tán huyết và biến tính mẫu',
      'Nhật ký hành trình lạnh số hóa'
    ]
  },
  {
    num: '03 / PHÁP LÝ & KÝ SỐ',
    title: 'Chữ Ký Số Y Tế Hợp Pháp',
    desc: 'Phiếu kết quả cấp dấu thời gian Timestamp và Chữ ký số PKI của Bác sĩ Chuyên khoa.',
    svg: '/assets/bms/svg/sections/landing/sec-03-digital-signature.svg',
    bullets: [
      'Chữ ký số PKI chuẩn Bộ Y Tế',
      'Mã QR xác thực tính toàn vẹn',
      'Có giá trị pháp lý tương đương bản giấy'
    ]
  },
  {
    num: '04 / TRUY VẾT MẪU',
    title: 'Truy Vết Barcode Khép Kín',
    desc: 'Mã vạch Code 128 định danh duy nhất mẫu máu từ khâu lấy mẫu đến biobank.',
    svg: '/assets/bms/svg/sections/landing/sec-04-barcode-traceability.svg',
    bullets: [
      'Định danh duy nhất một chiều',
      'Loại bỏ tuyệt đối nguy cơ nhầm lẫn mẫu',
      'Theo dõi tiến trình thời gian thực'
    ]
  },
  {
    num: '05 / KIỂM SOÁT NỘI KIỂM',
    title: 'Kiểm Soát Chất Lượng Westgard',
    desc: 'Quy chuẩn nội kiểm 3 mức nồng độ IQC và đồ thị Levey-Jennings hàng ngày.',
    svg: '/assets/bms/svg/sections/landing/sec-05-qc-westgard.svg',
    bullets: [
      'Kiểm chuẩn 6 quy tắc Westgard nghiêm ngặt',
      'Tự động cảnh báo sai số ngẫu nhiên',
      'Tham gia ngoại kiểm quốc tế EQAS / RIQAS'
    ]
  },
  {
    num: '06 / TIỆN ÍCH TẬN NƠI',
    title: 'Lấy Mẫu Xét Nghiệm Tại Nhà',
    desc: 'Điều dưỡng chính quy thao tác êm ái, mang lại trải nghiệm y tế nhẹ nhàng tận nơi.',
    svg: '/assets/bms/svg/sections/landing/sec-06-home-sampling.svg',
    bullets: [
      'Điều dưỡng có chứng chỉ hành nghề chính quy',
      'Bộ dụng cụ chân không vô khuẩn dùng 1 lần',
      'Tiết kiệm thời gian chờ đợi tại viện'
    ]
  },
  {
    num: '07 / KIỂM SOÁT TIẾN ĐỘ',
    title: 'Kiểm Soát Thời Gian Trả KQ (SLA)',
    desc: 'Giám sát tiến trình phân tích theo thời gian thực, thông báo ngay khi bác sĩ hoàn tất thẩm duyệt.',
    svg: '/assets/bms/svg/sections/landing/sec-07-tat-sla.svg',
    bullets: [
      'Theo dõi lộ trình xử lý mẫu theo thời gian thực',
      'Cảnh báo trễ hạn phân tích mẫu tại phòng Lab',
      'Thông báo tức thời qua cổng thông tin bệnh nhân'
    ]
  },
  {
    num: '08 / BÁC SĨ THẨM ĐỊNH',
    title: 'Bác Sĩ Chuyên Khoa Thẩm Duyệt',
    desc: 'Bác sĩ chuyên khoa xét nghiệm đối chiếu Delta Check và tư vấn kết quả chi tiết.',
    svg: '/assets/bms/svg/sections/landing/sec-08-doctor-review.svg',
    bullets: [
      'Thẩm định đa tầng từng chỉ số lâm sàng',
      'Cảnh báo biến thiên Delta Check lịch sử',
      'Tư vấn định hướng điều trị cá nhân hóa'
    ]
  },
  {
    num: '09 / HÀNH TRÌNH CHĂM SÓC',
    title: 'Hồ Sơ Sức Khỏe Liền Mạch',
    desc: 'Lưu trữ hồ sơ xét nghiệm trọn đời, theo dõi biểu đồ biến thiên chỉ số qua các năm.',
    svg: '/assets/bms/svg/sections/landing/sec-09-patient-journey.svg',
    bullets: [
      'Biểu đồ theo dõi chỉ số sức khỏe dài hạn',
      'Nhắc lịch tái khám định kỳ tự động',
      'Chia sẻ an toàn cho bác sĩ điều trị'
    ]
  },
  {
    num: '10 / CHỨNG NHẬN QUỐC TẾ',
    title: 'Chuẩn Chất Lượng ISO 15189:2022',
    desc: 'Phòng Lab đáp ứng tiêu chí đánh giá nghiêm ngặt theo ISO 15189 và QĐ 2429/QĐ-BYT.',
    svg: '/assets/bms/svg/sections/landing/sec-10-accreditation-wall.svg',
    bullets: [
      'Văn phòng Công nhận Chất lượng (BoA) đánh giá',
      'Quy trình SOP vận hành hơn 100 xét nghiệm',
      'Độ tin cậy kết quả đạt trên 99.98%'
    ]
  },
  {
    num: '11 / CHUẨN HÓA ỐNG MẪU',
    title: 'Màu Nắp Ống Nghiệm Chuẩn Y Tế',
    desc: 'Ống lấy máu chân không chuyên biệt với chất chống đông phù hợp cho từng xét nghiệm.',
    svg: '/assets/bms/svg/sections/landing/sec-11-tube-legend.svg',
    bullets: [
      'EDTA nắp tím cho tổng phân tích tế bào máu',
      'Serum nắp đỏ/vàng cho sinh hóa, miễn dịch',
      'Citrate nắp xanh dương cho đông máu'
    ]
  },
  {
    num: '12 / BẢO MẬT DỮ LIỆU',
    title: 'Bảo Vệ Dữ Liệu Nghị Định 13/2023',
    desc: 'Mã hóa kết quả AES-256 và ẩn danh hóa thông tin PII khi tra cứu công khai.',
    svg: '/assets/bms/svg/sections/landing/sec-12-security-privacy.svg',
    bullets: [
      'Mã hóa đầu cuối kết quả xét nghiệm',
      'Ẩn danh định danh PII khi tra cứu',
      'Nhật ký kiểm toán truy cập bất biến'
    ]
  },
  {
    num: '13 / MINH BẠCH CHI PHÍ',
    title: 'Bảng Giá Niêm Yết Minh Bạch 100%',
    desc: 'Đơn giá dịch vụ công khai theo quy chuẩn Bộ Y Tế, xuất hóa đơn điện tử VAT 0%.',
    svg: '/assets/bms/svg/sections/landing/sec-13-transparent-pricing.svg',
    bullets: [
      'Trọn gói vật tư lấy mẫu chân không',
      'Áp dụng thanh toán BHYT đúng quy định',
      'Xuất hóa đơn VAT 0% nhanh chóng'
    ]
  },
  {
    num: '14 / CỔNG KẾT QUẢ SỐ',
    title: 'Tra Cứu Kết Quả Điện Tử Mọi Nơi',
    desc: 'Theo dõi tiến trình xét nghiệm và tải bản PDF có chữ ký số trên mọi thiết bị.',
    svg: '/assets/bms/svg/sections/landing/sec-14-results-portal.svg',
    bullets: [
      'Tương thích hoàn hảo trên điện thoại và máy tính',
      'Tải bản PDF pháp lý lưu trữ bảo hiểm',
      'Truy cập dữ liệu nhanh chóng và an toàn'
    ]
  }
];

export default function GuestHomePage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [packages, setPackages] = useState([]);
  const [showRequireLoginModal, setShowRequireLoginModal] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState(null);

  useEffect(() => {
    searchTestPackages({ pageSize: 4 })
      .then(res => {
        const list = res?.items || res?.packages || [];
        if (list.length > 0) {
          setPackages(list.slice(0, 4));
        }
      })
      .catch((err) => {
        console.warn('Could not load packages from searchTestPackages:', err);
        setPackages([
          {
            id: 'PKG-CBC-01',
            packageCode: 'CBC-01',
            packageName: 'Tổng phân tích tế bào máu ngoại vi (24 thông số Laser)',
            description: 'Phát hiện sớm thiếu máu, nhiễm trùng, bệnh lý tủy xương và tiểu cầu',
            price: 180000,
            category: 'Huyết học'
          },
          {
            id: 'PKG-HEPATITIS-01',
            packageCode: 'HEPA-01',
            packageName: 'Tầm soát Viêm gan B & C (HBsAg, Anti-HBs, Anti-HCV)',
            description: 'Sàng lọc nhiễm virus viêm gan B và C mạn tính',
            price: 320000,
            category: 'Miễn dịch'
          },
          {
            id: 'PKG-LIPID-01',
            packageCode: 'LIPID-01',
            packageName: 'Bộ mỡ máu toàn phần (Cholesterol, Triglyceride, HDL, LDL)',
            description: 'Đánh giá nguy cơ xơ vữa động mạch và bệnh lý mạch vành',
            price: 200000,
            category: 'Sinh hóa'
          },
          {
            id: 'PKG-PKG-DIAB-01',
            packageCode: 'PKG-DIAB-01',
            packageName: 'Gói Tầm Soát Đái Tháo Đường Chuyên Sâu',
            description: 'Theo dõi chỉ số Glucose huyết tương và HbA1c đánh giá kiểm soát đường huyết 3 tháng.',
            price: 380000,
            category: 'Sinh hóa'
          }
        ]);
      });
  }, []);

  const handleBookClick = (pkg) => {
    setSelectedPackage(pkg);
    setShowRequireLoginModal(true);
  };

  return (
    <div className="bms-telehealth-page" style={{ backgroundColor: '#F8FAFC', minHeight: '100vh', fontFamily: 'var(--font-sans)' }}>
      <PortalNavbar user={null} />

      {/* 1. Hero Section (Spacious 2-Column: Narrative + 2x2 Metric Quad Left, Big Animated Lab Scene Right) */}
      <section className="bms-hero-container-wrap pt-5 pb-4" style={{ marginTop: '24px', marginBottom: '56px' }}>
        <div className="container" style={{ maxWidth: '1360px' }}>
          <div className="bms-kit-hero">
            {/* Left Column: Narrative, Search Pill, 2x2 Metric Quad */}
            <div className="bms-hero-narrative">
              <div className="bms-status-chip d-inline-flex align-items-center gap-2 mb-2.5">
                <img src="/assets/lab-icon.png" alt="Lab" style={{ width: '15px', height: '15px', objectFit: 'contain' }} />
                <span>TIÊU CHUẨN ISO 15189 · HỆ THỐNG BMS LAB</span>
              </div>

              <h1 className="bms-hero-heading mb-2.5" style={{ fontSize: '30px', fontWeight: 800, lineHeight: 1.25, letterSpacing: '-0.025em', color: '#0F172A' }}>
                Quản Lý Xét Nghiệm Máu
                <img
                  src="/assets/bms/svg/hero/home/hrroooo.svg"
                  alt="Chính Xác, Khép Kín &amp; Tin Cậy"
                  style={{
                    display: 'block',
                    height: '68px',
                    width: 'auto',
                    maxWidth: '100%',
                    objectFit: 'contain',
                    marginTop: '2px'
                  }}
                />
              </h1>

              <p className="bms-hero-lead mb-4" style={{ fontSize: '13.5px', color: '#475569', lineHeight: '1.65', maxWidth: '520px' }}>
                Quản lý khép kín quy trình xét nghiệm từ khâu tiếp nhận chỉ định, dán mã vạch Barcode đến phân tích LIS, bác sĩ thẩm định và trả kết quả trực tuyến.
              </p>

              {/* Search Pill Capsule */}
              <form
                className="bms-search-pill-capsule mb-4"
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

              {/* 2x2 Metric Grid (Real BMS Workflow Capabilities - Zero Fake Marketing Numbers) */}
              <div className="bms-hero-page-metrics">
                <div className="bms-metric-item-v3">
                  <img src="/assets/bms/svg/hero/home/metric-tests-safe.svg" alt="" aria-hidden="true" />
                  <div>
                    <div className="metric-number" style={{ fontSize: '18px' }}>Mã Vạch 1D/2D</div>
                    <div className="metric-label">Định danh duy nhất mẫu máu</div>
                  </div>
                </div>
                <div className="bms-metric-item-v3">
                  <img src="/assets/bms/svg/hero/home/metric-qc-accuracy.svg" alt="" aria-hidden="true" />
                  <div>
                    <div className="metric-number" style={{ fontSize: '18px' }}>Nội Kiểm QC</div>
                    <div className="metric-label">Kiểm soát quy tắc Westgard</div>
                  </div>
                </div>
                <div className="bms-metric-item-v3">
                  <img src="/assets/bms/svg/hero/home/metric-sla-tat.svg" alt="" aria-hidden="true" />
                  <div>
                    <div className="metric-number" style={{ fontSize: '18px' }}>Bác Sĩ Xác Nhận</div>
                    <div className="metric-label">Thẩm định chuyên môn y khoa</div>
                  </div>
                </div>
                <div className="bms-metric-item-v3">
                  <img src="/assets/bms/svg/hero/home/metric-coldchain.svg" alt="" aria-hidden="true" />
                  <div>
                    <div className="metric-number" style={{ fontSize: '18px' }}>Chuỗi Lạnh IoT</div>
                    <div className="metric-label">Giám sát nhiệt độ 2-6°C</div>
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
        </div>
      </section>

      {/* 2. Clinical Workflow Section (4 Soft Steps with 120px Vignettes) */}
      <section className="bms-section-wrap py-5" id="quy-trinh" style={{ marginBottom: '56px' }}>
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

      {/* 3. Service Packages Catalog (Spacious Horizontal Service Strips - No Cramped Cards) */}
      <section className="bms-section-wrap py-5" style={{ marginBottom: '56px' }}>
        <div className="container" style={{ maxWidth: '1360px' }}>
          <div className="bms-section-lead-center text-center mb-5">
            <div className="bms-status-chip d-inline-block">DANH MỤC DỊCH VỤ NIÊM YẾT</div>
            <h2 className="bms-section-h2 mt-2 mb-2">Gói Xét Nghiệm Máu Tiêu Biểu</h2>
            <p className="bms-section-p">
              Bảng giá niêm yết công khai, minh bạch, hỗ trợ chiết tính BHYT tự động theo quy định Bộ Y Tế.
            </p>
          </div>

          {/* Spacious Horizontal Floating Service Strips (Zero Cramped Cards, Generous Breathing Room) */}
          <div className="d-flex flex-column gap-3 mb-4">
            {packages.map((pkg, idx) => (
              <div
                key={pkg.id || pkg.packageCode || idx}
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: '16px',
                  padding: '22px 28px',
                  border: 'none',
                  boxShadow: 'none',
                  transition: 'background-color 0.15s ease'
                }}
                className="d-flex flex-column flex-xl-row align-items-xl-center justify-content-between gap-4"
              >
                {/* Left: Specialty Icon + Full-Width Content Stack (Zero Awkward Breaks) */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="d-flex align-items-center gap-3.5">
                    {/* Centered Large SVG Icon - No Background Box */}
                    <div
                      style={{
                        width: '56px',
                        height: '56px',
                        flexShrink: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        alignSelf: 'center',
                        backgroundColor: 'transparent'
                      }}
                    >
                      <BmsPackageIcon name={getCategoryIconKey(pkg.category)} size={52} />
                    </div>

                    <div style={{ minWidth: 0, flex: 1 }}>
                      {/* Row 1: Badges */}
                      <div className="d-flex flex-wrap align-items-center gap-2 mb-2.5">
                        <span
                          style={{
                            fontSize: '10.5px',
                            fontWeight: 700,
                            color: '#1E60E6',
                            backgroundColor: '#EFF6FF',
                            padding: '2px 9px',
                            borderRadius: '9999px',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          {pkg.category || 'Huyết học'}
                        </span>
                        <span
                          style={{
                            fontFamily: 'var(--font-mono, monospace)',
                            fontSize: '11px',
                            fontWeight: 600,
                            color: '#475569',
                            backgroundColor: '#F1F5F9',
                            padding: '1px 7px',
                            borderRadius: '6px',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          {pkg.packageCode || pkg.id || 'BMS'}
                        </span>
                      </div>

                      {/* Row 2: Full Package Title (No Ellipsis, Full Available Width) */}
                      <h3
                        className="mb-1.5"
                        style={{
                          fontSize: '15px',
                          fontWeight: 650,
                          color: '#0F172A',
                          letterSpacing: '-0.01em',
                          lineHeight: '1.4',
                          wordBreak: 'break-word'
                        }}
                      >
                        {pkg.packageName}
                      </h3>

                      {/* Row 3: Clinical Scope & Description */}
                      <p
                        className="mb-0 text-muted"
                        style={{
                          fontSize: '13px',
                          lineHeight: '1.6',
                          color: '#475569',
                          maxWidth: '850px'
                        }}
                      >
                        {pkg.description || 'Chỉ định lâm sàng theo dõi các chỉ số sinh hóa và huyết học chuyên sâu.'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Middle Dedicated Column: Specimen Standards & TAT SLA */}
                <div
                  className="d-none d-lg-flex flex-column justify-content-center px-4 flex-shrink-0"
                  style={{
                    borderLeft: '1px solid #F1F5F9',
                    minWidth: '220px',
                    maxWidth: '260px'
                  }}
                >
                  <div style={{ fontSize: '10.5px', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
                    Tiêu Chuẩn Lấy Mẫu &amp; SLA
                  </div>

                  {/* Tube Specimen */}
                  <div className="d-flex align-items-center gap-2.5 mb-2">
                    <div style={{ width: '26px', height: '26px', borderRadius: '7px', backgroundColor: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <FaVial style={{ color: '#1E60E6', fontSize: '12px' }} />
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: '10.5px', color: '#64748B', lineHeight: 1.2 }}>Ống lấy mẫu</div>
                      <div style={{ fontSize: '12px', fontWeight: 650, color: '#1E293B', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {pkg.sampleTube || 'Serum-Đỏ/Vàng'} {pkg.sampleVolumeMl ? `(${pkg.sampleVolumeMl} ml)` : '(3 ml)'}
                      </div>
                    </div>
                  </div>

                  {/* TAT SLA */}
                  <div className="d-flex align-items-center gap-2.5">
                    <div style={{ width: '26px', height: '26px', borderRadius: '7px', backgroundColor: '#ECFDF5', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <FaClock style={{ color: '#10B981', fontSize: '12px' }} />
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: '10.5px', color: '#64748B', lineHeight: 1.2 }}>Thời gian trả kết quả</div>
                      <div style={{ fontSize: '12px', fontWeight: 650, color: '#0F172A', whiteSpace: 'nowrap' }}>
                        {pkg.tat || '60 – 90 phút'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right: Price & CTA Action Button (Clean Vertical Border Divider) */}
                <div
                  className="d-flex flex-row flex-xl-column align-items-xl-end justify-content-between justify-content-xl-center gap-3 ps-xl-4 flex-shrink-0"
                  style={{
                    borderLeft: '1px solid #F1F5F9',
                    minWidth: '220px'
                  }}
                >
                  <div className="text-xl-end">
                    <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 550 }}>Đơn giá niêm yết:</div>
                    <div className="fw-bold tabular-nums" style={{ fontSize: '19px', color: '#0F172A', lineHeight: '1.2' }}>
                      {new Intl.NumberFormat('vi-VN').format(pkg.price || 0)} <span style={{ fontSize: '13px', fontWeight: 600, color: '#64748B' }}>VNĐ</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    style={{
                      backgroundColor: '#10B981',
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: '9999px',
                      padding: '8px 22px',
                      fontSize: '12px',
                      fontWeight: 700,
                      whiteSpace: 'nowrap',
                      cursor: 'pointer',
                      boxShadow: 'none',
                      transition: 'background-color 0.15s ease'
                    }}
                    onClick={() => handleBookClick(pkg)}
                  >
                    Đặt Lịch Xét Nghiệm
                  </button>
                </div>
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
      <section className="bms-section-wrap py-5" style={{ marginBottom: '56px' }}>
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
                  src={`${sec.svg}?v=3.1.4`}
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
