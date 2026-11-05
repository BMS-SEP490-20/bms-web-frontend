/**
 * @file IsoProcessPage.jsx
 * @description Dedicated Quality Assurance & ISO 15189:2022 Clinical Workflow Page (Quy Trình ISO).
 * Conforms to: ISO 15189:2022, Ministry of Health QĐ 2429/QĐ-BYT, CAP Proficiency.
 * Pure Flat Design: Plus Jakarta Sans typography, high contrast, zero blurry shadows.
 */

import React from 'react';
import { Container, Row, Col, Badge } from 'react-bootstrap';
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
  FaSearch
} from 'react-icons/fa';
import PortalNavbar from '../components/PortalNavbar';
import MegaFooter from '../components/MegaFooter';

const ISO_STAGES = [
  {
    step: '01',
    title: 'Tiếp Nhận & Mã Hóa Barcode 2 Chiều',
    subtitle: 'Giai đoạn Tiền Phân Tích (Pre-Analytical)',
    icon: FaBarcode,
    desc: 'Mẫu máu sau khi thu thập được dán nhãn mã vạch Barcode Code-128 đồng bộ định danh bệnh nhân. Hệ thống tự động kiểm tra thể tích mẫu, chất lượng chống đông và thời gian vận chuyển.',
    specs: ['Barcode 2 chiều tự động', 'Kiểm tra thể tích mẫu tối thiểu', 'Thời gian tiếp nhận < 15 phút']
  },
  {
    step: '02',
    title: 'Ly Tâm & Xử Lý Chuẩn Nhiệt Độ',
    subtitle: 'Chuẩn Bị Bệnh Phẩm',
    icon: FaSnowflake,
    desc: 'Bệnh phẩm được ly tâm ở tốc độ 3000 vòng/phút trong điều kiện buồng lạnh kiểm soát nhiệt độ nghiêm ngặt (2°C - 8°C), bảo toàn toàn vẹn hoạt tính enzyme, kháng thể và tế bào máu.',
    specs: ['Máy ly tâm buồng lạnh 4°C', 'Thời gian chuẩn 10 phút', 'Tách huyết thanh/huyết tương chuẩn gel']
  },
  {
    step: '03',
    title: 'Phân Tích Tự Động Hóa 2 Chiều',
    subtitle: 'Giai đoạn Phân Tích (Analytical)',
    icon: FaMicroscope,
    desc: 'Hệ thống máy xét nghiệm sinh hóa - miễn dịch và huyết học tự động quét barcode, nhận lệnh xét nghiệm trực tiếp từ LIS (Laboratory Information System) và thực hiện phân tích đa kênh.',
    specs: ['Giao tiếp LIS hai chiều', 'Hóa chất chuẩn chính hãng CE/FDA', 'Phân tích đa thông số laser']
  },
  {
    step: '04',
    title: 'Kiểm Chuẩn Chất Lượng Nội Kiểm (Daily QC)',
    subtitle: 'Đảm Bảo Độ Chính Xác',
    icon: FaChartLine,
    desc: 'Áp dụng biểu đồ Levey-Jennings và quy tắc Westgard đa quy chuẩn hàng ngày. Mẫu bệnh phẩm chỉ được chạy khi kết quả kiểm chuẩn nội kiểm (IQC) đạt mức tin cậy 99.8%.',
    specs: ['Biểu đồ Levey-Jennings', 'Quy tắc Westgard tự động', 'Chương trình ngoại kiểm EQAS']
  },
  {
    step: '05',
    title: 'Bác Sĩ Duyệt & Trả Kết Quả Ký Số',
    subtitle: 'Giai đoạn Sau Phân Tích (Post-Analytical)',
    icon: FaUserCheck,
    desc: 'Bác sĩ chuyên khoa xét nghiệm trực tiếp rà soát, hội chẩn các chỉ số bất thường (cờ cảnh báo Delta Check). Phiếu kết quả được ký số điện tử và gửi tự động tới bệnh nhân qua cổng EMR.',
    specs: ['Ký số điện tử bảo mật', 'Cảnh báo tự động Delta Check', 'Thời gian trả kết quả 60 - 90 phút']
  }
];

export default function IsoProcessPage() {
  return (
    <div style={{ backgroundColor: '#F8FAFC', minHeight: '100vh', fontFamily: 'var(--font-sans)' }}>
      <PortalNavbar />

      {/* Hero Header */}
      <section style={{ backgroundColor: '#FFFFFF', borderBottom: '1px solid rgba(15, 23, 42, 0.06)', padding: '48px 0 36px' }}>
        <Container style={{ maxWidth: '1200px' }}>
          <div className="text-center mx-auto" style={{ maxWidth: '820px' }}>
            <div className="d-inline-flex align-items-center gap-2 px-3 py-1 rounded-pill mb-3"
                 style={{ backgroundColor: '#EEF4FD', color: '#1E60E6', fontSize: '13px', fontWeight: 650 }}>
              <FaShieldAlt /> HỆ THỐNG QUẢN LÝ CHẤT LƯỢNG TIÊU CHUẨN QUỐC TẾ ISO 15189:2022
            </div>
            <h1 className="fw-bold mb-3" style={{ fontSize: '32px', color: '#0F172A', letterSpacing: '-0.03em' }}>
              Quy Trình Kiểm Chuẩn Xét Nghiệm 5 Bước
            </h1>
            <p className="text-secondary mb-4" style={{ fontSize: '15.5px', lineHeight: '1.6' }}>
              Tại BMS Clinical Laboratory, mọi mẫu bệnh phẩm đều trải qua chu trình kiểm soát chất lượng khép kín từ khâu thu nhận, ly tâm, phân tích đến bác sĩ ký duyệt kết quả, cam kết độ chính xác và tin cậy tuyệt đối.
            </p>
            <div className="d-flex justify-content-center gap-3">
              <Link
                to="/appointments/book"
                className="btn btn-primary rounded-pill px-4 py-2 d-inline-flex align-items-center gap-2"
                style={{ backgroundColor: '#1E60E6', borderColor: '#1E60E6', fontWeight: 600, fontSize: '14px', color: '#FFFFFF' }}
              >
                <FaCalendarAlt /> Đặt Lịch Lấy Mẫu
              </Link>
              <Link
                to="/tracking"
                className="btn btn-outline-secondary rounded-pill px-4 py-2 d-inline-flex align-items-center gap-2"
                style={{ borderColor: 'rgba(15, 23, 42, 0.1)', fontWeight: 600, fontSize: '14px', backgroundColor: '#FFFFFF', color: '#0F172A' }}
              >
                <FaSearch /> Tra Cứu Tiến Trình Mẫu
              </Link>
            </div>
          </div>
        </Container>
      </section>

      {/* ISO Quality Standards Metrics Grid (Pure Flat) */}
      <section className="py-4">
        <Container style={{ maxWidth: '1200px' }}>
          <Row className="g-3 mb-5">
            <Col md={3} sm={6}>
              <div style={{ backgroundColor: '#FFFFFF', border: '1px solid rgba(15, 23, 42, 0.06)', borderRadius: '18px', padding: '22px' }}>
                <div className="d-flex align-items-center gap-2 mb-2" style={{ color: '#1E60E6', fontSize: '13px', fontWeight: 650 }}>
                  <FaShieldAlt /> TIÊU CHUẨN ISO
                </div>
                <div className="fw-bold" style={{ fontSize: '24px', color: '#0F172A', letterSpacing: '-0.02em' }}>15189:2022</div>
                <div className="small text-muted mt-1">Hệ thống quản lý chất lượng phòng xét nghiệm y tế quốc tế.</div>
              </div>
            </Col>
            <Col md={3} sm={6}>
              <div style={{ backgroundColor: '#FFFFFF', border: '1px solid rgba(15, 23, 42, 0.06)', borderRadius: '18px', padding: '22px' }}>
                <div className="d-flex align-items-center gap-2 mb-2" style={{ color: '#10B981', fontSize: '13px', fontWeight: 650 }}>
                  <FaCheckCircle /> ĐỘ CHÍNH XÁC
                </div>
                <div className="fw-bold" style={{ fontSize: '24px', color: '#0F172A', letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>99.82%</div>
                <div className="small text-muted mt-1">Được kiểm định định kỳ qua chương trình ngoại kiểm quốc tế EQAS.</div>
              </div>
            </Col>
            <Col md={3} sm={6}>
              <div style={{ backgroundColor: '#FFFFFF', border: '1px solid rgba(15, 23, 42, 0.06)', borderRadius: '18px', padding: '22px' }}>
                <div className="d-flex align-items-center gap-2 mb-2" style={{ color: '#1E60E6', fontSize: '13px', fontWeight: 650 }}>
                  <FaClock /> THỜI GIAN TAT
                </div>
                <div className="fw-bold" style={{ fontSize: '24px', color: '#0F172A', letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>60 - 90 Phút</div>
                <div className="small text-muted mt-1">Thời gian trả kết quả nhanh chóng cho toàn bộ gói xét nghiệm thường quy.</div>
              </div>
            </Col>
            <Col md={3} sm={6}>
              <div style={{ backgroundColor: '#FFFFFF', border: '1px solid rgba(15, 23, 42, 0.06)', borderRadius: '18px', padding: '22px' }}>
                <div className="d-flex align-items-center gap-2 mb-2" style={{ color: '#1E60E6', fontSize: '13px', fontWeight: 650 }}>
                  <FaSnowflake /> LƯU TRỮ MẪU
                </div>
                <div className="fw-bold" style={{ fontSize: '24px', color: '#0F172A', letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>7 Ngày (-20°C)</div>
                <div className="small text-muted mt-1">Mẫu được lưu trữ sẵn sàng phục vụ kiểm tra lại hoặc chỉ định bổ sung.</div>
              </div>
            </Col>
          </Row>

          {/* 5-Step Process Timeline Cards */}
          <div className="mb-5">
            <div className="text-center mb-4">
              <h2 className="fw-bold" style={{ fontSize: '24px', color: '#0F172A' }}>
                Chi Tiết Quy Trình Vận Hành Tiêu Chuẩn
              </h2>
              <p className="text-muted small">Tuân thủ nghiêm ngặt 3 giai đoạn: Tiền phân tích • Phân tích • Sau phân tích</p>
            </div>

            <div className="d-flex flex-column gap-3">
              {ISO_STAGES.map((stg) => {
                const IconComponent = stg.icon;
                return (
                  <div
                    key={stg.step}
                    style={{
                      backgroundColor: '#FFFFFF',
                      border: '1px solid rgba(15, 23, 42, 0.06)',
                      borderRadius: '20px',
                      padding: '24px 28px',
                      display: 'flex',
                      flexDirection: 'row',
                      alignItems: 'flex-start',
                      gap: '24px'
                    }}
                  >
                    <div
                      style={{
                        width: '56px',
                        height: '56px',
                        borderRadius: '16px',
                        backgroundColor: '#EEF4FD',
                        color: '#1E60E6',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '22px',
                        flexShrink: 0
                      }}
                    >
                      <IconComponent />
                    </div>

                    <div style={{ flex: 1 }}>
                      <div className="d-flex align-items-center gap-2 mb-1">
                        <span style={{ fontSize: '12px', fontWeight: 700, color: '#1E60E6', letterSpacing: '0.05em' }}>
                          BƯỚC {stg.step} • {stg.subtitle.toUpperCase()}
                        </span>
                      </div>
                      <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#0F172A', marginBottom: '8px' }}>
                        {stg.title}
                      </h3>
                      <p style={{ color: '#475569', fontSize: '14px', lineHeight: '1.6', marginBottom: '14px', maxWidth: '860px' }}>
                        {stg.desc}
                      </p>
                      <div className="d-flex flex-wrap gap-2">
                        {stg.specs.map(spec => (
                          <span
                            key={spec}
                            style={{
                              backgroundColor: '#F1F5F9',
                              color: '#475569',
                              fontSize: '12px',
                              fontWeight: 600,
                              padding: '4px 12px',
                              borderRadius: '9999px',
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
                  </div>
                );
              })}
            </div>
          </div>
        </Container>
      </section>

      <MegaFooter />
    </div>
  );
}
