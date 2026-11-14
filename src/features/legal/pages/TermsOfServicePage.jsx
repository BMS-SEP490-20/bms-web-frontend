/**
 * @file TermsOfServicePage.jsx
 * @description Official Terms of Service & Patient Rights for BMS Clinical Laboratory.
 * Conforms to: Law on Medical Examination and Treatment No. 15/2023/QH15, Law on Electronic Transactions No. 20/2023/QH15.
 */

import React from 'react';
import { Container } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { FaFileContract, FaShieldAlt, FaCalendarCheck, FaClock, FaPhoneAlt, FaCheckCircle } from 'react-icons/fa';
import PortalNavbar from '../../home/components/PortalNavbar';
import MegaFooter from '../../home/components/MegaFooter';
import usePageTransition from '../../../shared/hooks/usePageTransition';

export default function TermsOfServicePage() {
  const pageTransitionClass = usePageTransition();

  return (
    <div style={{ backgroundColor: '#F8FAFC', minHeight: '100vh', fontFamily: 'var(--font-sans)' }}>
      <PortalNavbar />

      <div className={`bms-page-directional-content ${pageTransitionClass}`}>
        {/* 1. Header Banner */}
        <section className="pt-4 pb-3 mb-4">
          <div className="container" style={{ maxWidth: '1200px' }}>
            <div
              style={{
                background: '#FFFFFF',
                borderRadius: '24px',
                padding: '36px 40px',
                border: '1px solid #E2E8F0',
                boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
              }}
            >
              <div className="d-flex align-items-center gap-2 mb-2.5" style={{ fontSize: '12px', color: '#64748B', fontWeight: 700, letterSpacing: '0.04em' }}>
                <FaFileContract style={{ color: '#1E60E6', fontSize: '15px' }} />
                <span>QUY ĐỊNH PHÁP LÝ · HỆ THỐNG PHÒNG XÉT NGHIỆM Y KHOA BMS</span>
              </div>
              <h1 className="fw-bold mb-3" style={{ fontSize: '30px', color: '#0F172A', letterSpacing: '-0.025em', lineHeight: '1.25' }}>
                Điều Khoản Dịch Vụ &amp; Quyền Lợi Bệnh Nhân
              </h1>
              <p className="mb-0 text-muted" style={{ fontSize: '14px', maxWidth: '820px', lineHeight: '1.7', color: '#475569' }}>
                Chào mừng bạn đến với Hệ thống Xét nghiệm Y khoa BMS. Các điều khoản dưới đây quy định quyền lợi, trách nhiệm và cam kết chất lượng dịch vụ y tế theo Luật Khám bệnh, chữa bệnh số 15/2023/QH15 và Luật Giao dịch điện tử.
              </p>
              <div className="mt-3 text-muted" style={{ fontSize: '12px' }}>
                Cập nhật lần cuối: Ngày 01 tháng 11 năm 2026 · Phiên bản: v3.2
              </div>
            </div>
          </div>
        </section>

        {/* 2. Content Body */}
        <section className="pb-5 mb-5">
          <div className="container" style={{ maxWidth: '1200px' }}>
            <div
              style={{
                background: '#FFFFFF',
                borderRadius: '24px',
                padding: '40px 48px',
                border: '1px solid #E2E8F0',
                boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
              }}
            >
              {/* Điều 1 */}
              <div className="mb-4 pb-3 border-bottom" style={{ borderColor: '#F1F5F9' }}>
                <h2 className="fw-bold mb-3" style={{ fontSize: '18px', color: '#0F172A' }}>
                  1. Giới Thiệu &amp; Phạm Vi Cung Cấp Dịch Vụ
                </h2>
                <p style={{ fontSize: '14px', color: '#475569', lineHeight: 1.7 }}>
                  Hệ thống Xét nghiệm Y khoa BMS (Giấy phép hoạt động số 08892/BYT-GPHĐ, đạt chứng nhận quốc tế ISO 15189:2022) cung cấp dịch vụ xét nghiệm huyết học, sinh hóa, miễn dịch và sàng lọc di truyền. Dịch vụ được cung cấp trực tiếp tại các trung tâm xét nghiệm BMS hoặc thông qua dịch vụ lấy mẫu chuyên nghiệp tận nhà theo yêu cầu của người bệnh.
                </p>
              </div>

              {/* Điều 2 */}
              <div className="mb-4 pb-3 border-bottom" style={{ borderColor: '#F1F5F9' }}>
                <h2 className="fw-bold mb-3" style={{ fontSize: '18px', color: '#0F172A' }}>
                  2. Quyền Lợi &amp; Nghĩa Vụ Của Người Bệnh
                </h2>
                <div className="d-flex flex-column gap-2 mb-3">
                  <div className="d-flex align-items-start gap-2.5">
                    <FaCheckCircle style={{ color: '#10B981', marginTop: '4px', flexShrink: 0 }} />
                    <span style={{ fontSize: '14px', color: '#334155', lineHeight: 1.6 }}>
                      <strong>Quyền được chăm sóc tận tình &amp; an toàn:</strong> Người bệnh được phục vụ bởi đội ngũ điều dưỡng có chứng chỉ hành nghề chính quy, thao tác lấy mẫu êm ái, bộ dụng cụ vô trùng dùng 1 lần duy nhất.
                    </span>
                  </div>
                  <div className="d-flex align-items-start gap-2.5">
                    <FaCheckCircle style={{ color: '#10B981', marginTop: '4px', flexShrink: 0 }} />
                    <span style={{ fontSize: '14px', color: '#334155', lineHeight: 1.6 }}>
                      <strong>Quyền được giải thích &amp; tư vấn kết quả:</strong> Mọi kết quả xét nghiệm bất thường đều được Bác sĩ Chuyên khoa liên hệ tư vấn cặn kẽ, giải thích ý nghĩa các chỉ số và định hướng điều trị hoặc chế độ dinh dưỡng.
                    </span>
                  </div>
                  <div className="d-flex align-items-start gap-2.5">
                    <FaCheckCircle style={{ color: '#10B981', marginTop: '4px', flexShrink: 0 }} />
                    <span style={{ fontSize: '14px', color: '#334155', lineHeight: 1.6 }}>
                      <strong>Quyền bảo mật thông tin y tế:</strong> Hồ sơ sức khỏe và kết quả xét nghiệm được mã hóa và bảo vệ tuyệt đối theo quy định của Luật Khám bệnh chữa bệnh và Nghị định 13/2023/NĐ-CP.
                    </span>
                  </div>
                  <div className="d-flex align-items-start gap-2.5">
                    <FaCheckCircle style={{ color: '#10B981', marginTop: '4px', flexShrink: 0 }} />
                    <span style={{ fontSize: '14px', color: '#334155', lineHeight: 1.6 }}>
                      <strong>Nghĩa vụ phối hợp:</strong> Người bệnh có trách nhiệm cung cấp thông tin nhân thân, tiền sử bệnh án và tuân thủ các hướng dẫn chuẩn bị (như nhịn ăn, kiêng đồ uống có cồn) để đảm bảo kết quả chính xác nhất.
                    </span>
                  </div>
                </div>
              </div>

              {/* Điều 3 */}
              <div className="mb-4 pb-3 border-bottom" style={{ borderColor: '#F1F5F9' }}>
                <h2 className="fw-bold mb-3" style={{ fontSize: '18px', color: '#0F172A' }}>
                  3. Quy Trình Đặt Lịch &amp; Dịch Vụ Lấy Mẫu Tận Nơi
                </h2>
                <p style={{ fontSize: '14px', color: '#475569', lineHeight: 1.7 }}>
                  Người bệnh có thể chủ động đặt lịch khám hoặc xét nghiệm máu tại nhà thông qua Cổng điện tử BMS hoặc Hotline 1900 6868. BMS cam kết:
                </p>
                <ul style={{ fontSize: '14px', color: '#475569', lineHeight: 1.8, paddingLeft: '20px' }}>
                  <li>Điều dưỡng có mặt đúng khung giờ đã xác nhận với người bệnh.</li>
                  <li>Mẫu máu ngay sau khi lấy được dán mã định danh duy nhất trước mặt người bệnh và bảo quản trong hòm chuyên dụng chuẩn dải nhiệt độ 2 – 6°C.</li>
                  <li>Chi phí dịch vụ tận nơi được thông báo minh bạch, niêm yết rõ ràng trước khi xác nhận lịch hẹn.</li>
                </ul>
              </div>

              {/* Điều 4 */}
              <div className="mb-4 pb-3 border-bottom" style={{ borderColor: '#F1F5F9' }}>
                <h2 className="fw-bold mb-3" style={{ fontSize: '18px', color: '#0F172A' }}>
                  4. Trả Kết Quả Điện Tử &amp; Giá Trị Pháp Lý
                </h2>
                <p style={{ fontSize: '14px', color: '#475569', lineHeight: 1.7 }}>
                  Phiếu kết quả xét nghiệm được cấp dưới định dạng điện tử PDF có gắn chữ ký số của Bác sĩ Chuyên khoa xét nghiệm và dấu thời gian chứng thực của BMS. Theo Luật Giao dịch điện tử, bản kết quả này có giá trị pháp lý tương đương bản giấy có đóng dấu đỏ, được chấp thuận tại các cơ sở y tế trên toàn quốc để phục vụ khám chữa bệnh hoặc thanh toán bảo hiểm.
                </p>
              </div>

              {/* Điều 5 */}
              <div className="mb-4 pb-3 border-bottom" style={{ borderColor: '#F1F5F9' }}>
                <h2 className="fw-bold mb-3" style={{ fontSize: '18px', color: '#0F172A' }}>
                  5. Chính Sách Đổi Lịch Hẹn, Hủy Lịch &amp; Hoàn Tiền
                </h2>
                <ul style={{ fontSize: '14px', color: '#475569', lineHeight: 1.8, paddingLeft: '20px' }}>
                  <li><strong>Đổi lịch hẹn:</strong> Người bệnh được hỗ trợ đổi ngày, giờ lấy mẫu hoàn toàn miễn phí nếu thông báo trước tối thiểu 02 tiếng.</li>
                  <li><strong>Hủy lịch &amp; Hoàn tiền:</strong> Trường hợp người bệnh đã thanh toán trước qua VNPay/Ngân hàng và thông báo hủy hẹn hợp lệ, BMS sẽ hoàn trả 100% chi phí vào tài khoản trong vòng 24 – 48 giờ làm việc.</li>
                  <li><strong>Bảo lưu:</strong> Người bệnh có thể yêu cầu bảo lưu gói xét nghiệm trong vòng 90 ngày kể từ ngày đăng ký.</li>
                </ul>
              </div>

              {/* Điều 6 */}
              <div>
                <h2 className="fw-bold mb-3" style={{ fontSize: '18px', color: '#0F172A' }}>
                  6. Hỗ Trợ Khách Hàng &amp; Giải Quyết Khiếu Nại
                </h2>
                <p style={{ fontSize: '14px', color: '#475569', lineHeight: 1.7, marginBottom: '16px' }}>
                  Mọi thắc mắc về kết quả xét nghiệm, thái độ phục vụ của nhân viên y tế hoặc yêu cầu giải đáp chuyên môn, quý khách vui lòng liên hệ:
                </p>
                <div className="d-flex flex-wrap gap-3">
                  <div style={{ background: '#F8FAFC', padding: '12px 20px', borderRadius: '12px', border: '1px solid #E2E8F0', fontSize: '13px' }}>
                    <span className="text-muted">Hotline CSKH: </span>
                    <strong style={{ color: '#1E60E6' }}>1900 6868</strong> (06:00 – 21:00 hàng ngày)
                  </div>
                  <div style={{ background: '#F8FAFC', padding: '12px 20px', borderRadius: '12px', border: '1px solid #E2E8F0', fontSize: '13px' }}>
                    <span className="text-muted">Email hỗ trợ: </span>
                    <strong style={{ color: '#1E60E6' }}>cskh@bmsmedlab.vn</strong>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 3. Mega Footer */}
        <MegaFooter />
      </div>
    </div>
  );
}

