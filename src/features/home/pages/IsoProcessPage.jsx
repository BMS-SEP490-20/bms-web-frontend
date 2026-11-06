/**
 * @file IsoProcessPage.jsx
 * @description Official ISO 15189:2022 Medical Laboratory Quality Assurance & Clinical Workflow Page.
 * Conforms to: ISO 15189:2022, Ministry of Health QĐ 2429/QĐ-BYT, BoA VILAS Med 124, Westgard Multi-Rules.
 * Pure 2D Flat Architecture: Spacious Layout, Crisp Concise Copy, Zero Blurry Hover.
 */

import React from 'react';
import { Container, Row, Col } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { 
  FaClock, 
  FaCheckCircle, 
  FaCalendarAlt, 
  FaSearch, 
  FaAward,
  FaShieldAlt,
  FaVial
} from 'react-icons/fa';
import PortalNavbar from '../components/PortalNavbar';
import MegaFooter from '../components/MegaFooter';
import usePageTransition from '../../../shared/hooks/usePageTransition';

const ISO_PHASES = [
  {
    step: '01',
    phase: 'CHẶNG 01 / TIỀN PHÂN TÍCH',
    title: 'Lấy Mẫu Chân Không & Barcode 1D/2D',
    desc: 'Lấy máu bằng ống chân không vô trùng, in và dán barcode định danh 3 yếu tố ngay tại chỗ.',
    standards: ['Ống chân không có gel tách', 'Barcode Code 128 chuẩn y tế', 'Đối chiếu 3 yếu tố định danh'],
    tat: '10 – 15 phút',
    svgFile: 'stage-01-barcode-reception.svg'
  },
  {
    step: '02',
    phase: 'CHẶNG 02 / VẬN CHUYỂN & NHẬP LAB',
    title: 'Chuỗi Lạnh IoT 2°C – 6°C & Nhập LIS',
    desc: 'Duy trì nhiệt độ 2°C – 6°C qua cảm biến IoT, kiểm tra chỉ số HIL và đồng bộ LIS tự động.',
    standards: ['Cảm biến IoT 2°C – 6°C', 'Kiểm tra chất lượng mẫu HIL Index', 'Biên bản số hóa không giấy'],
    tat: '15 – 20 phút',
    svgFile: 'stage-02-centrifuge-cold.svg'
  },
  {
    step: '03',
    phase: 'CHẶNG 03 / PHÂN TÍCH & NỘI KIỂM',
    title: 'Phân Tích Tự Động & Nội Kiểm Westgard',
    desc: 'Vận hành trên dàn máy đa kênh tự động, kiểm chuẩn IQC và biểu đồ Levey-Jennings mỗi ca.',
    standards: ['Kết nối LIS 2 chiều tự động', 'Nội kiểm IQC 6 quy tắc Westgard', 'Ngoại kiểm quốc tế EQAS / RIQAS'],
    tat: '30 – 45 phút',
    svgFile: 'stage-03-auto-analysis.svg'
  },
  {
    step: '04',
    phase: 'CHẶNG 04 / HỘI CHẨN & THẨM ĐỊNH',
    title: 'Cảnh Báo Delta Check & Bác Sĩ Ký Duyệt',
    desc: 'LIS đối chiếu lịch sử xét nghiệm gần nhất, Bác sĩ Chuyên khoa thẩm định và hội chẩn.',
    standards: ['Cảnh báo Delta Check tự động', 'Quy trình chạy lại mẫu (Auto-Rerun)', 'Bác sĩ chuyên khoa ký duyệt'],
    tat: '15 – 20 phút',
    svgFile: 'stage-04-qc-westgard.svg'
  },
  {
    step: '05',
    phase: 'CHẶNG 05 / TRẢ KẾT QUẢ & LƯU MẪU',
    title: 'Chữ Ký Số Pháp Lý & Lưu Mẫu 7 Ngày',
    desc: 'Cấp chứng thư số PKI kèm con dấu thời gian, lưu trữ mẫu âm sâu -20°C trong 7 ngày.',
    standards: ['Chữ ký số PKI pháp lý toàn quốc', 'Mã hóa PII theo Nghị định 13/2023', 'Lưu mẫu Biobank -20°C'],
    tat: 'Tức thì (SMS / Web)',
    svgFile: 'stage-05-doctor-esign.svg'
  }
];

const ISO_METRICS = [
  {
    badge: 'CHỨNG NHẬN',
    value: 'ISO 15189:2022',
    label: 'Văn phòng Công nhận Chất lượng (BoA) đánh giá và cấp chứng chỉ định kỳ.',
    accent: '#1E60E6',
    bgAccent: 'rgba(30, 96, 230, 0.08)',
    icon: FaShieldAlt
  },
  {
    badge: 'ĐỘ TIN CẬY',
    value: '99.85%',
    label: 'Tỷ lệ kiểm chuẩn IQC đạt quy chuẩn Westgard ngay từ lần chạy đầu tiên.',
    accent: '#10B981',
    bgAccent: 'rgba(16, 185, 129, 0.08)',
    icon: FaCheckCircle
  },
  {
    badge: 'AN TOÀN MẪU',
    value: '< 0.05%',
    label: 'Hạn chế tối đa nguy cơ vỡ hồng cầu bằng kỹ thuật hút chân không khép kín.',
    accent: '#0284C7',
    bgAccent: 'rgba(2, 132, 199, 0.08)',
    icon: FaVial
  },
  {
    badge: 'KIỂM SOÁT SLA',
    value: 'Giám Sát TAT',
    label: 'Theo dõi tiến độ phân tích mẫu theo từng danh mục chỉ định và chữ ký số bác sĩ.',
    accent: '#7C3AED',
    bgAccent: 'rgba(124, 58, 237, 0.08)',
    icon: FaClock
  }
];

export default function IsoProcessPage() {
  const pageTransitionClass = usePageTransition();

  return (
    <div style={{ backgroundColor: '#F8FAFC', minHeight: '100vh', fontFamily: 'var(--font-sans)' }}>
      <PortalNavbar />

      <div className={`bms-page-directional-content ${pageTransitionClass}`}>

      {/* 1. Executive Spotlight Header (Pure 2D Flat Card Container) */}
      <section className="pt-5 pb-3 mb-5" style={{ marginTop: '20px' }}>
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
              <div style={{ flex: 1 }}>
                <div className="d-flex align-items-center gap-2 mb-3" style={{ fontSize: '12px', color: '#64748B', fontWeight: 700, letterSpacing: '0.04em' }}>
                  <img src="/assets/lab-icon.png" alt="" style={{ width: '16px', height: '16px', objectFit: 'contain' }} />
                  <span>TIÊU CHUẨN ISO 15189:2022 · HỆ THỐNG BMS LAB CHẤT LƯỢNG QUỐC TẾ</span>
                </div>
                <h1 className="fw-bold mb-3" style={{ fontSize: '32px', color: '#0F172A', letterSpacing: '-0.03em', lineHeight: '1.2' }}>
                  Quy Trình Kiểm Chuẩn ISO 15189:2022
                </h1>
                <p className="mb-0 text-muted" style={{ fontSize: '14px', maxWidth: '780px', lineHeight: '1.7', color: '#475569' }}>
                  Quy trình xét nghiệm tự động hóa khép kín 5 chặng, tuân thủ nghiêm ngặt chuẩn quốc tế ISO 15189 và Bộ Y Tế.
                </p>
              </div>

              {/* ISO Hero SVG Illustration */}
              <div className="d-none d-md-block text-center flex-shrink-0" style={{ maxWidth: '240px', width: '100%' }}>
                <img
                  src="/assets/bms/svg/hero/iso/iso-hero.svg"
                  alt="ISO 15189 Accreditation Art"
                  style={{ width: '100%', height: 'auto', maxHeight: '150px', objectFit: 'contain' }}
                />
              </div>

              <div className="d-flex flex-column gap-2 align-items-stretch flex-shrink-0">
                <Link
                  to="/appointments/book"
                  className="btn text-center"
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
                  className="btn text-center"
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

      {/* 2. ISO Quality Metrics Strip (Pure 2D Flat Quad with Icons Positioned Above Cards) */}
      <section className="py-3 mb-5">
        <Container style={{ maxWidth: '1400px' }}>
          <Row className="g-4">
            {ISO_METRICS.map((item, idx) => {
              const IconComp = item.icon;
              return (
                <Col key={idx} xs={12} sm={6} lg={3}>
                  <div className="d-flex flex-column h-100">
                    {/* Icon Above Card with Generous Breathing Space */}
                    <div className="d-flex align-items-center mb-3 ps-2">
                      <div
                        style={{
                          width: '54px',
                          height: '54px',
                          borderRadius: '18px',
                          backgroundColor: item.bgAccent,
                          color: item.accent,
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '24px'
                        }}
                      >
                        <IconComp />
                      </div>
                    </div>

                    {/* Elevated Metric Card */}
                    <div
                      style={{
                        backgroundColor: '#FFFFFF',
                        borderRadius: '22px',
                        border: '1px solid rgba(226, 232, 240, 0.8)',
                        boxShadow: '0 4px 18px -4px rgba(15, 23, 42, 0.04)',
                        padding: '30px 30px',
                        flex: 1,
                        display: 'flex',
                        flexDirection: 'column'
                      }}
                    >
                      <div
                        style={{
                          fontSize: '11px',
                          fontWeight: 750,
                          letterSpacing: '0.06em',
                          color: item.accent,
                          textTransform: 'uppercase',
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
                          marginBottom: '10px'
                        }}
                      >
                        {item.value}
                      </div>
                      <div style={{ fontSize: '13px', color: '#64748B', lineHeight: '1.6', marginTop: 'auto' }}>
                        {item.label}
                      </div>
                    </div>
                  </div>
                </Col>
              );
            })}
          </Row>
        </Container>
      </section>

      {/* 3. 5-Phase Closed-Loop Architecture (Spacious & Breathable SOP Manifest) */}
      <section className="py-4 mb-5">
        <Container style={{ maxWidth: '1400px' }}>
          <div className="d-flex align-items-center justify-content-between mb-4">
            <div>
              <h2 className="fw-bold mb-1" style={{ fontSize: '24px', color: '#0F172A', letterSpacing: '-0.025em' }}>
                Chu Trình Kiểm Soát Chất Lượng 5 Chặng
              </h2>
              <p className="mb-0 text-muted" style={{ fontSize: '14px', marginTop: '4px' }}>
                Quy trình thao tác chuẩn (SOP) tự động hóa từ khâu tiếp nhận đến khi trả kết quả
              </p>
            </div>
            <span
              style={{
                backgroundColor: '#EEF4FD',
                color: '#1E60E6',
                fontSize: '12px',
                fontWeight: 700,
                padding: '6px 18px',
                borderRadius: '9999px',
                letterSpacing: '0.02em'
              }}
            >
              Quy Chuẩn SOP-LAB-2026
            </span>
          </div>

          <div className="d-flex flex-column gap-4">
            {ISO_PHASES.map((stg) => (
              <div
                key={stg.step}
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: '24px',
                  border: 'none',
                  boxShadow: 'none',
                  padding: '36px 42px'
                }}
              >
                <div className="d-flex flex-column flex-lg-row align-items-lg-center justify-content-between gap-4">
                  <div style={{ flex: 1 }}>
                    <div className="d-flex flex-column flex-sm-row align-items-sm-center justify-content-between gap-3 mb-3">
                      <div className="d-flex align-items-center gap-3">
                        <span
                          style={{
                            fontSize: '32px',
                            fontWeight: 800,
                            color: '#1E60E6',
                            letterSpacing: '-0.03em',
                            fontVariantNumeric: 'tabular-nums',
                            lineHeight: '1',
                            minWidth: '46px'
                          }}
                        >
                          {stg.step}
                        </span>
                        <div>
                          <div style={{ fontSize: '11.5px', fontWeight: 750, color: '#1E60E6', letterSpacing: '0.06em', marginBottom: '4px' }}>
                            {stg.phase}
                          </div>
                          <h3 className="fw-bold mb-0" style={{ fontSize: '20px', color: '#0F172A', lineHeight: '1.35', letterSpacing: '-0.015em' }}>
                            {stg.title}
                          </h3>
                        </div>
                      </div>

                      <div
                        style={{
                          fontSize: '12.5px',
                          color: '#334155',
                          backgroundColor: '#F1F5F9',
                          padding: '6px 16px',
                          borderRadius: '9999px',
                          whiteSpace: 'nowrap',
                          alignSelf: 'flex-start',
                          fontWeight: 650
                        }}
                      >
                        <FaClock className="me-1.5" style={{ color: '#0284C7', fontSize: '12px' }} />
                        Thời gian: {stg.tat}
                      </div>
                    </div>

                    <p style={{ color: '#475569', fontSize: '14.5px', lineHeight: '1.75', margin: '16px 0 22px', maxWidth: '860px' }}>
                      {stg.desc}
                    </p>

                    <div className="d-flex flex-wrap gap-2.5 pt-1">
                      {stg.standards.map((spec, i) => (
                        <span
                          key={i}
                          style={{
                            backgroundColor: '#F1F5F9',
                            color: '#334155',
                            fontSize: '12.5px',
                            fontWeight: 600,
                            padding: '7px 16px',
                            borderRadius: '9999px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '8px'
                          }}
                        >
                          <FaCheckCircle style={{ color: '#10B981', fontSize: '12px' }} />
                          {spec}
                        </span>
                      ))}
                    </div>
                  </div>

                  {stg.svgFile && (
                    <div className="d-none d-lg-block text-center flex-shrink-0" style={{ width: '180px', padding: '10px' }}>
                      <img
                        src={`/assets/bms/svg/sections/iso/${stg.svgFile}`}
                        alt={stg.title}
                        style={{ width: '100%', height: 'auto', maxHeight: '130px', objectFit: 'contain' }}
                      />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* 4. Quality Governance & Regulatory Framework */}
      <section className="py-3 pb-5 mb-5">
        <Container style={{ maxWidth: '1400px' }}>
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
              <h6 className="fw-bold mb-0" style={{ color: '#0F172A', fontSize: '13.5px' }}>
                Hành Lang Pháp Lý &amp; Kiểm Định Định Kỳ
              </h6>
            </div>
            <ul className="mb-0 text-muted small ps-3" style={{ lineHeight: '1.7', fontSize: '12.5px' }}>
              <li><strong>ISO 15189:2022</strong>: Đánh giá định kỳ hàng năm bởi Văn phòng Công nhận Chất lượng (BoA).</li>
              <li><strong>Quyết định 2429/QĐ-BYT</strong>: Tiêu chí đánh giá chất lượng phòng xét nghiệm y học của Bộ Y Tế.</li>
              <li><strong>Nghị định 13/2023/NĐ-CP</strong>: Bảo vệ dữ liệu cá nhân y tế, mã hóa kết quả và chữ ký số.</li>
              <li><strong>Chương trình EQAS / RIQAS</strong>: Kiểm định chéo hàng tháng với mạng lưới phòng Lab quốc tế.</li>
            </ul>
          </div>
        </Container>
      </section>

        <MegaFooter />
      </div>
    </div>
  );
}
