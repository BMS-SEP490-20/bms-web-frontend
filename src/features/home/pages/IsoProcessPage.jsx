/**
 * @file IsoProcessPage.jsx
 * @description Official ISO 15189:2022 Medical Laboratory Quality Assurance & Clinical Workflow Page.
 * Conforms to: ISO 15189:2022, Ministry of Health QĐ 2429/QĐ-BYT, BoA VILAS Med 124, Westgard Multi-Rules.
 * Pure 2D Flat Architecture: Zero Sến Súa Glow / Zero Blurry Hover / Plus Jakarta Sans & Be Vietnam Pro.
 */

import React from 'react';
import { Container, Row, Col } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { 
  FaShieldAlt, 
  FaVial, 
  FaBarcode, 
  FaMicroscope, 
  FaChartLine, 
  FaUserCheck, 
  FaClock, 
  FaCheckCircle, 
  FaSnowflake,
  FaFileMedicalAlt,
  FaCalendarAlt,
  FaSearch,
  FaAward,
  FaDatabase
} from 'react-icons/fa';
import PortalNavbar from '../components/PortalNavbar';
import MegaFooter from '../components/MegaFooter';

const ISO_PHASES = [
  {
    step: '01',
    phase: 'TIỀN PHÂN TÍCH (PRE-ANALYTICAL)',
    title: 'Lấy Mẫu Chân Không Vô Trùng & Mã Hóa Barcode 1D/2D',
    desc: 'Điều dưỡng sử dụng hệ thống kim lấy máu chân không khép kín (Vacuum Tube System), ngăn ngừa 100% nguy cơ vỡ hồng cầu và phơi nhiễm. Mẫu máu được in và dán nhãn Barcode Code 128 ngay tại giường/bàn lấy mẫu, gắn liền định danh bệnh nhân một chiều.',
    standards: ['Hệ thống ống chân không có gel tách huyết thanh', 'Barcode Code 128 chuẩn y tế toàn cầu', 'Kiểm tra nhận diện 2 yếu tố (Họ tên, Năm sinh, Mã BN)'],
    tat: '10 – 15 phút'
  },
  {
    step: '02',
    phase: 'VẬN CHUYỂN & NHẬP LAB (LIS CHECK-IN)',
    title: 'Giám Sát Chuỗi Lạnh IoT (2°C – 6°C) & Nhập Hệ Thống LIS',
    desc: 'Bệnh phẩm được vận chuyển trong thùng chuyên dụng tích hợp cảm biến IoT theo dõi nhiệt độ thời gian thực. Tại phòng giao nhận mẫu, kỹ thuật viên quét barcode để đối chiếu lệnh chỉ định từ phần mềm LIS, kiểm tra thể tích và chỉ số chất lượng huyết thanh (HIL: Hemolysis, Icterus, Lipemia).',
    standards: ['Cảm biến nhiệt độ IoT liên tục 2°C – 6°C', 'Chỉ số chất lượng mẫu HIL Index tự động', 'Biên bản giao nhận mẫu điện tử không giấy'],
    tat: '15 – 20 phút'
  },
  {
    step: '03',
    phase: 'PHÂN TÍCH & NỘI KIỂM (ANALYTICAL & QC)',
    title: 'Phân Tích Tự Động Đa Kênh & Kiểm Soát Chất Lượng Westgard',
    desc: 'Mẫu được đưa vào hệ thống máy phân tích tự động thế hệ mới (Laser đa góc cho Huyết học, Quang phổ phân tích Sinh hóa - Miễn dịch). Trước mỗi ca chạy, hệ thống bắt buộc phải vượt qua quy chuẩn nội kiểm hàng ngày (Daily IQC) dựa trên biểu đồ Levey-Jennings và 6 quy tắc Westgard.',
    standards: ['Máy phân tích tự động kết nối LIS 2 chiều', 'Kiểm chuẩn IQC hàng ngày với huyết thanh mẫu chuẩn', 'Tham gia chương trình ngoại kiểm quốc tế EQAS / RIQAS'],
    tat: '30 – 45 phút'
  },
  {
    step: '04',
    phase: 'HỘI CHẨN & THẨM ĐỊNH (POST-ANALYTICAL)',
    title: 'Cảnh Báo Delta Check & Bác Sĩ Chuyên Khoa Thẩm Định',
    desc: 'Hệ thống LIS tự động so sánh kết quả hiện tại với lịch sử xét nghiệm gần nhất của bệnh nhân (Delta Check) và đối chiếu với khoảng tham chiếu sinh học theo độ tuổi, giới tính. Khi có bất thường, Bác sĩ Chuyên khoa Xét nghiệm tiến hành chạy lặp lại (Rerun) hoặc hội chẩn lâm sàng.',
    standards: ['Thuật toán cảnh báo Delta Check thông minh', 'Quy trình kiểm tra lại mẫu tự động (Auto-Rerun)', 'Bác sĩ chuyên khoa y học lâm sàng ký duyệt từng chỉ số'],
    tat: '15 – 20 phút'
  },
  {
    step: '05',
    phase: 'TRẢ KẾT QUẢ & LƯU MẪU (RELEASE & BIOBANK)',
    title: 'Chữ Ký Số Y Tế Pháp Lý & Lưu Trữ Mẫu Bệnh Phẩm 7 Ngày',
    desc: 'Phiếu kết quả được cấp con dấu thời gian (Timestamp) và Chữ ký số điện tử chuẩn Bộ Y Tế, gửi qua tin nhắn SMS và cổng tra cứu trực tuyến. Đồng thời, toàn bộ mẫu bệnh phẩm được lưu trữ tự động trong tủ lạnh âm sâu -20°C trong vòng 7 ngày để phục vụ đối chiếu hoặc chỉ định bổ sung.',
    standards: ['Chữ ký số PKI xác thực pháp lý toàn quốc', 'Mã hóa kết quả PII theo Nghị định 13/2023/NĐ-CP', 'Lưu trữ mẫu âm sâu -20°C trong 7 ngày'],
    tat: 'Thời gian thực (SMS / Web)'
  }
];

const ISO_METRICS = [
  {
    badge: 'CHỨNG NHẬN QUỐC TẾ',
    value: 'ISO 15189:2022',
    label: 'Văn phòng Công nhận Chất lượng (BoA) cấp mã hiệu VILAS Med 124 cho hệ thống BMS Lab.',
    accent: '#1E60E6'
  },
  {
    badge: 'ĐỘ TIN CẬY NỘI KIỂM',
    value: '99.85%',
    label: 'Tỷ lệ mẫu kiểm chuẩn IQC đạt quy chuẩn Westgard ngay từ lần chạy đầu tiên trong ngày.',
    accent: '#10B981'
  },
  {
    badge: 'AN TOÀN MẪU BỆNH PHẨM',
    value: '< 0.05%',
    label: 'Tỷ lệ vỡ hồng cầu (Hemolysis Index) đạt mức an toàn tối đa nhờ kỹ thuật hút chân không.',
    accent: '#0284C7'
  },
  {
    badge: 'THỜI GIAN TRẢ KẾT QUẢ',
    value: '60 – 90 Phút',
    label: 'Cam kết thời gian TAT cho toàn bộ các xét nghiệm thường quy có chữ ký số bác sĩ.',
    accent: '#7C3AED'
  }
];

export default function IsoProcessPage() {
  return (
    <div style={{ backgroundColor: '#F8FAFC', minHeight: '100vh', fontFamily: 'var(--font-sans)' }}>
      <PortalNavbar />

      {/* 1. Executive Spotlight Header (Pure 2D Flat Card Container) */}
      <section className="pt-4 pb-2">
        <Container style={{ maxWidth: '1400px' }}>
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '24px',
              border: 'none',
              boxShadow: 'none',
              padding: '40px 48px'
            }}
          >
            <div className="d-flex flex-column flex-lg-row justify-content-between align-items-start align-items-lg-center gap-4">
              <div>
                <div className="d-flex align-items-center gap-2 mb-3" style={{ fontSize: '12px', color: '#64748B', fontWeight: 700, letterSpacing: '0.04em' }}>
                  <img src="/assets/lab-icon.png" alt="" style={{ width: '16px', height: '16px', objectFit: 'contain' }} />
                  <span>TIÊU CHUẨN ISO 15189:2022 · HỆ THỐNG BMS LAB CHẤT LƯỢNG QUỐC TẾ</span>
                </div>
                <h1 className="fw-bold mb-3" style={{ fontSize: '32px', color: '#0F172A', letterSpacing: '-0.03em', lineHeight: '1.2' }}>
                  Quy Trình Kiểm Chuẩn Y Khoa Chuẩn ISO 15189:2022
                </h1>
                <p className="mb-0 text-muted" style={{ fontSize: '14px', maxWidth: '840px', lineHeight: '1.7', color: '#475569' }}>
                  Toàn bộ quy trình xét nghiệm tại BMS Lab tuân thủ nghiêm ngặt tiêu chuẩn quốc tế ISO 15189:2022 và Quyết định 2429/QĐ-BYT. Đảm bảo 100% mẫu bệnh phẩm được mã hóa barcode một chiều, kiểm soát nhiệt độ chuỗi lạnh IoT 2-6°C và thẩm định đa tầng bởi Bác sĩ Chuyên khoa.
                </p>
              </div>
              <div className="d-flex gap-2.5 align-items-center flex-shrink-0">
                <Link
                  to="/appointments/book"
                  className="btn"
                  style={{
                    fontSize: '13px',
                    fontWeight: 650,
                    padding: '9px 22px',
                    backgroundColor: '#1E60E6',
                    border: 'none',
                    borderRadius: '9999px',
                    color: '#FFFFFF',
                    boxShadow: 'none'
                  }}
                >
                  <FaCalendarAlt className="me-2" style={{ fontSize: '12px' }} /> Đặt Lịch Lấy Mẫu
                </Link>
                <Link
                  to="/tracking"
                  className="btn"
                  style={{
                    fontSize: '13px',
                    fontWeight: 650,
                    padding: '9px 20px',
                    backgroundColor: '#F1F5F9',
                    border: 'none',
                    borderRadius: '9999px',
                    color: '#334155',
                    boxShadow: 'none'
                  }}
                >
                  <FaSearch className="me-2" style={{ fontSize: '12px' }} /> Tra Cứu Lộ Trình
                </Link>
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* 2. ISO Quality Metrics Strip (Pure 2D Flat Quad) */}
      <section className="py-3">
        <Container style={{ maxWidth: '1400px' }}>
          <Row className="g-3">
            {ISO_METRICS.map((item, idx) => (
              <Col key={idx} xs={12} sm={6} lg={3}>
                <div
                  style={{
                    backgroundColor: '#FFFFFF',
                    borderRadius: '20px',
                    border: 'none',
                    boxShadow: 'none',
                    padding: '24px 26px',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column'
                  }}
                >
                  <div
                    style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      letterSpacing: '0.05em',
                      color: item.accent,
                      marginBottom: '10px'
                    }}
                  >
                    {item.badge}
                  </div>
                  <div
                    className="fw-bold tabular-nums"
                    style={{
                      fontSize: '28px',
                      color: '#0F172A',
                      letterSpacing: '-0.03em',
                      lineHeight: '1.2',
                      marginBottom: '8px'
                    }}
                  >
                    {item.value}
                  </div>
                  <div style={{ fontSize: '12.5px', color: '#64748B', lineHeight: '1.6', marginTop: 'auto' }}>
                    {item.label}
                  </div>
                </div>
              </Col>
            ))}
          </Row>
        </Container>
      </section>

      {/* 3. 5-Phase Closed-Loop Architecture (Authentic Laboratory Manifest) */}
      <section className="py-3">
        <Container style={{ maxWidth: '1400px' }}>
          
          <div
            className="mb-4"
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '24px',
              border: 'none',
              boxShadow: 'none',
              padding: '36px 40px'
            }}
          >
            <div className="d-flex align-items-center justify-content-between mb-4 pb-2">
              <div>
                <h2 className="fw-bold mb-1" style={{ fontSize: '22px', color: '#0F172A', letterSpacing: '-0.02em' }}>
                  Chu Trình Kiểm Soát Chất Lượng Khép Kín 5 Chặng
                </h2>
                <p className="mb-0 text-muted" style={{ fontSize: '13px' }}>
                  Tiêu chuẩn thao tác chuẩn (SOP) được tự động hóa từ khâu tiếp nhận đến khi kết quả đến tay bệnh nhân
                </p>
              </div>
              <span
                style={{
                  backgroundColor: '#EEF4FD',
                  color: '#1E60E6',
                  fontSize: '12px',
                  fontWeight: 700,
                  padding: '6px 16px',
                  borderRadius: '9999px'
                }}
              >
                Quy Chuẩn SOP-LAB-2026
              </span>
            </div>

            <div className="d-flex flex-column gap-3">
              {ISO_PHASES.map((stg) => (
                <div
                  key={stg.step}
                  style={{
                    backgroundColor: '#F8FAFC',
                    borderRadius: '20px',
                    border: 'none',
                    boxShadow: 'none',
                    padding: '28px 32px'
                  }}
                >
                  <div className="d-flex flex-column flex-lg-row align-items-lg-start justify-content-between gap-3 mb-2">
                    <div className="d-flex align-items-center gap-3">
                      <span
                        style={{
                          fontSize: '26px',
                          fontWeight: 800,
                          color: '#1E60E6',
                          letterSpacing: '-0.02em',
                          fontVariantNumeric: 'tabular-nums',
                          lineHeight: '1'
                        }}
                      >
                        {stg.step}
                      </span>
                      <div>
                        <div style={{ fontSize: '11px', fontWeight: 700, color: '#1E60E6', letterSpacing: '0.06em' }}>
                          {stg.phase}
                        </div>
                        <h3 className="fw-bold mb-0" style={{ fontSize: '17px', color: '#0F172A', lineHeight: '1.4' }}>
                          {stg.title}
                        </h3>
                      </div>
                    </div>

                    <div
                      style={{
                        fontSize: '12px',
                        color: '#64748B',
                        backgroundColor: '#FFFFFF',
                        padding: '4px 12px',
                        borderRadius: '9999px',
                        whiteSpace: 'nowrap',
                        alignSelf: 'flex-start',
                        fontWeight: 600
                      }}
                    >
                      <FaClock className="me-1" style={{ color: '#0284C7', fontSize: '11px' }} />
                      Thời gian: {stg.tat}
                    </div>
                  </div>

                  <p style={{ color: '#475569', fontSize: '13.5px', lineHeight: '1.7', margin: '12px 0 16px', maxWidth: '1000px' }}>
                    {stg.desc}
                  </p>

                  <div className="d-flex flex-wrap gap-2 pt-1">
                    {stg.standards.map((spec, i) => (
                      <span
                        key={i}
                        style={{
                          backgroundColor: '#FFFFFF',
                          color: '#334155',
                          fontSize: '12px',
                          fontWeight: 600,
                          padding: '5px 14px',
                          borderRadius: '8px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                      >
                        <FaCheckCircle style={{ color: '#10B981', fontSize: '11px' }} />
                        {spec}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 4. Quality Governance & Regulatory Framework */}
          <div
            className="p-4"
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '20px',
              border: 'none',
              boxShadow: 'none'
            }}
          >
            <div className="d-flex align-items-center gap-2 mb-2">
              <FaAward style={{ color: '#1E60E6', fontSize: '16px' }} />
              <h6 className="fw-bold mb-0" style={{ color: '#0F172A', fontSize: '14px' }}>
                Hành Lang Pháp Lý &amp; Kiểm Định Định Kỳ Phòng Xét Nghiệm
              </h6>
            </div>
            <ul className="mb-0 text-muted small ps-3" style={{ lineHeight: '1.75', fontSize: '12.5px' }}>
              <li><strong>ISO 15189:2022</strong>: Đánh giá định kỳ hàng năm bởi Văn phòng Công nhận Chất lượng (BoA) - Bộ Khoa học và Công nghệ.</li>
              <li><strong>Quyết định 2429/QĐ-BYT</strong>: Ban hành tiêu chí đánh giá mức chất lượng phòng xét nghiệm y học đạt chuẩn cấp cao của Bộ Y Tế.</li>
              <li><strong>Nghị định 13/2023/NĐ-CP</strong>: Bảo vệ dữ liệu cá nhân y tế, mã hóa đầu cuối kết quả điện tử và chữ ký số xác thực.</li>
              <li><strong>Chương trình Ngoại Kiểm (EQAS / RIQAS)</strong>: Kiểm định chéo định kỳ hàng tháng với mạng lưới phòng xét nghiệm lâm sàng quốc tế.</li>
            </ul>
          </div>
        </Container>
      </section>

      <MegaFooter />
    </div>
  );
}

