/**
 * @file IsoProcessPage.jsx
 * @description Clean Patient-Friendly 5-Stage Laboratory Workflow Overview (no fabricated stats).
 */

import React from 'react';
import { Container } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { Calendar, Search, CheckCircle2 } from 'lucide-react';
import PortalNavbar from '../components/PortalNavbar';
import MegaFooter from '../components/MegaFooter';
import usePageTransition from '../../../shared/hooks/usePageTransition';

const WORKFLOW_STAGES = [
  {
    step: '01',
    title: 'Tiếp Nhận & Đối Chiếu Danh Tính',
    desc: 'Quét mã QR lịch hẹn tại quầy lễ tân, xác nhận thông tin cá nhân và cấp số thứ tự lấy mẫu.'
  },
  {
    step: '02',
    title: 'Lấy Mẫu & Dán Mã Vạch Định Danh',
    desc: 'Lấy mẫu máu bằng dụng cụ dùng một lần và gắn mã định danh riêng cho từng ống nghiệm.'
  },
  {
    step: '03',
    title: 'Bàn Giao & Phân Tích Tại Phòng Lab',
    desc: 'Mẫu được tiếp nhận vào hàng đợi phân tích, kiểm tra chất lượng trước khi đưa lên máy xét nghiệm.'
  },
  {
    step: '04',
    title: 'Bác Sĩ Kiểm Tra & Duyệt Kết Quả',
    desc: 'Kết quả sau khi ghi nhận được Bác sĩ chuyên khoa rà soát cùng hồ sơ khám trước khi phát hành.'
  },
  {
    step: '05',
    title: 'Trả Kết Quả Trực Tuyến',
    desc: 'Bệnh nhân tra cứu kết quả trên cổng thông tin, xem chi tiết chỉ số và tải bản PDF.'
  }
];

export default function IsoProcessPage() {
  const pageTransitionClass = usePageTransition();

  return (
    <div style={{ backgroundColor: '#F8FAFC', minHeight: '100vh', fontFamily: 'var(--font-sans)' }}>
      <PortalNavbar />

      <div className={`bms-page-directional-content ${pageTransitionClass}`}>
        <section className="pt-5 pb-3 mb-4" style={{ marginTop: '16px' }}>
          <Container style={{ maxWidth: '1240px' }}>
            <div style={{ backgroundColor: '#FFFFFF', borderRadius: '20px', padding: '36px 42px' }}>
              <div className="d-flex flex-column flex-lg-row justify-content-between align-items-start align-items-lg-center gap-4">
                <div>
                  <h1 className="fw-bold mb-2" style={{ fontSize: '28px', color: '#0F172A' }}>
                    Quy Trình Xét Nghiệm Tại BMS
                  </h1>
                  <p className="mb-0 text-muted" style={{ fontSize: '14px', maxWidth: '720px', lineHeight: '1.65' }}>
                    Các bước xử lý mẫu bệnh phẩm từ khi tiếp nhận lịch hẹn đến khi trả kết quả trực tuyến cho bệnh nhân.
                  </p>
                </div>

                <div className="d-flex flex-wrap gap-2 flex-shrink-0">
                  <Link
                    to="/appointments/book"
                    className="btn d-inline-flex align-items-center gap-2"
                    style={{
                      fontSize: '13px',
                      fontWeight: 650,
                      padding: '9px 20px',
                      backgroundColor: '#1E60E6',
                      border: 'none',
                      borderRadius: '9999px',
                      color: '#FFFFFF'
                    }}
                  >
                    <Calendar size={14} /> Đặt Lịch Lấy Mẫu
                  </Link>
                  <Link
                    to="/tracking"
                    className="btn d-inline-flex align-items-center gap-2"
                    style={{
                      fontSize: '13px',
                      fontWeight: 650,
                      padding: '9px 20px',
                      backgroundColor: '#F1F5F9',
                      border: 'none',
                      borderRadius: '9999px',
                      color: '#334155'
                    }}
                  >
                    <Search size={14} /> Tra Cứu Lộ Trình
                  </Link>
                </div>
              </div>
            </div>
          </Container>
        </section>

        <section className="py-2 pb-5 mb-4">
          <Container style={{ maxWidth: '1240px' }}>
            <div className="d-flex flex-column gap-3">
              {WORKFLOW_STAGES.map((stg) => (
                <div
                  key={stg.step}
                  style={{
                    backgroundColor: '#FFFFFF',
                    borderRadius: '18px',
                    padding: '26px 32px'
                  }}
                >
                  <div className="d-flex align-items-start gap-4">
                    <span
                      style={{
                        fontSize: '28px',
                        fontWeight: 800,
                        color: '#1E60E6',
                        fontVariantNumeric: 'tabular-nums',
                        lineHeight: '1',
                        minWidth: '40px'
                      }}
                    >
                      {stg.step}
                    </span>
                    <div>
                      <h2 className="fw-bold mb-1 d-flex align-items-center gap-2" style={{ fontSize: '17px', color: '#0F172A' }}>
                        <CheckCircle2 size={16} color="#10B981" />
                        <span>{stg.title}</span>
                      </h2>
                      <p className="mb-0 text-muted" style={{ fontSize: '14px', lineHeight: '1.6' }}>
                        {stg.desc}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Container>
        </section>

        <MegaFooter />
      </div>
    </div>
  );
}
