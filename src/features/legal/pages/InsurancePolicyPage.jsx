/**
 * @file InsurancePolicyPage.jsx
 * @description Official Health Insurance Coverage & Co-payment Policy (BHYT) for BMS Clinical Laboratory.
 * Conforms to: Law on Health Insurance, Decree No. 75/2023/ND-CP, Circular No. 22/2023/TT-BYT.
 */

import React from 'react';
import { Link } from 'react-router-dom';
import { FaHospital, FaIdCard, FaPercentage, FaCheckCircle, FaFileInvoiceDollar, FaExclamationTriangle, FaPhoneAlt, FaNotesMedical } from 'react-icons/fa';
import PortalNavbar from '../../home/components/PortalNavbar';
import MegaFooter from '../../home/components/MegaFooter';
import usePageTransition from '../../../shared/hooks/usePageTransition';

export default function InsurancePolicyPage() {
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
              <div className="d-flex align-items-center gap-2 mb-2.5" style={{ fontSize: '12px', color: '#1E60E6', fontWeight: 700, letterSpacing: '0.04em' }}>
                <FaHospital style={{ fontSize: '15px' }} />
                <span>CHÍNH SÁCH BẢO HIỂM Y TẾ · NGHỊ ĐỊNH 75/2023/NĐ-CP &amp; THÔNG TƯ 22/2023/TT-BYT</span>
              </div>
              <h1 className="fw-bold mb-3" style={{ fontSize: '30px', color: '#0F172A', letterSpacing: '-0.025em', lineHeight: '1.25' }}>
                Chính Sách Chi Trả &amp; Quyền Lợi Bảo Hiểm Y Tế (BHYT)
              </h1>
              <p className="mb-0 text-muted" style={{ fontSize: '14px', maxWidth: '820px', lineHeight: '1.7', color: '#475569' }}>
                Hệ thống Xét nghiệm Y khoa BMS áp dụng chi trả Bảo hiểm Y tế trực tiếp, minh bạch và tiện lợi theo quy định hiện hành của Bộ Y tế và Bảo hiểm Xã hội Việt Nam. Người bệnh được hưởng tối đa quyền lợi hỗ trợ chi phí xét nghiệm nhanh chóng thông qua CCCD gắn chip hoặc ứng dụng VssID.
              </p>
              <div className="mt-3 text-muted" style={{ fontSize: '12px' }}>
                Áp dụng từ: Ngày 01 tháng 01 năm 2026 · Tự động đối soát cổng BHYT Quốc gia
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
              {/* Mục 1: Nguyên tắc chi trả */}
              <div className="mb-4 pb-3 border-bottom" style={{ borderColor: '#F1F5F9' }}>
                <h2 className="fw-bold mb-3" style={{ fontSize: '18px', color: '#0F172A' }}>
                  1. Nguyên Tắc Thanh Toán BHYT Tại BMS Lab
                </h2>
                <p style={{ fontSize: '14px', color: '#475569', lineHeight: 1.7 }}>
                  BMS ký hợp đồng khám chữa bệnh BHYT và kết nối liên thông trực tiếp với Cổng tiếp nhận dữ liệu Giám định BHYT của Bảo hiểm Xã hội Việt Nam. Mọi danh mục xét nghiệm thuộc phạm vi được Quỹ BHYT chi trả sẽ được hệ thống phần mềm tính toán và giảm trừ trực tiếp ngay trên phiếu thanh toán, người bệnh chỉ cần chi trả phần cùng chi trả (Co-pay) nếu có.
                </p>
              </div>

              {/* Mục 2: Tỷ lệ mức hưởng */}
              <div className="mb-4 pb-3 border-bottom" style={{ borderColor: '#F1F5F9' }}>
                <h2 className="fw-bold mb-3" style={{ fontSize: '18px', color: '#0F172A' }}>
                  2. Mức Hưởng &amp; Tỷ Lệ Chi Trả Theo Nhóm Đối Tượng
                </h2>
                <div className="row g-3">
                  <div className="col-md-4">
                    <div style={{ background: '#F0FDF4', padding: '20px', borderRadius: '16px', border: '1px solid #BBF7D0', height: '100%' }}>
                      <div className="badge bg-success mb-2" style={{ fontSize: '13px', padding: '6px 12px', fontWeight: 600 }}>
                        Mức Hưởng 100%
                      </div>
                      <div className="fw-bold text-dark mb-1" style={{ fontSize: '15px' }}>
                        Miễn phí toàn bộ
                      </div>
                      <p className="text-muted mb-0" style={{ fontSize: '13px', lineHeight: 1.6 }}>
                        Áp dụng cho người có công với cách mạng, trẻ em dưới 6 tuổi, người thuộc hộ nghèo, lực lượng vũ trang nhân dân, hoặc người tham gia BHYT đủ 5 năm liên tục và có số tiền cùng chi trả trong năm lớn hơn 6 tháng lương cơ sở.
                      </p>
                    </div>
                  </div>

                  <div className="col-md-4">
                    <div style={{ background: '#EFF6FF', padding: '20px', borderRadius: '16px', border: '1px solid #BFDBFE', height: '100%' }}>
                      <div className="badge bg-primary mb-2" style={{ fontSize: '13px', padding: '6px 12px', fontWeight: 600 }}>
                        Mức Hưởng 95%
                      </div>
                      <div className="fw-bold text-dark mb-1" style={{ fontSize: '15px' }}>
                        Người bệnh chi trả 5%
                      </div>
                      <p className="text-muted mb-0" style={{ fontSize: '13px', lineHeight: 1.6 }}>
                        Áp dụng cho người đang hưởng lương hưu, trợ cấp mất sức lao động hàng tháng, thân nhân người có công và người thuộc hộ cận nghèo theo tiêu chuẩn chuẩn nghèo quốc gia.
                      </p>
                    </div>
                  </div>

                  <div className="col-md-4">
                    <div style={{ background: '#F8FAFC', padding: '20px', borderRadius: '16px', border: '1px solid #E2E8F0', height: '100%' }}>
                      <div className="badge bg-secondary mb-2" style={{ fontSize: '13px', padding: '6px 12px', fontWeight: 600 }}>
                        Mức Hưởng 80%
                      </div>
                      <div className="fw-bold text-dark mb-1" style={{ fontSize: '15px' }}>
                        Người bệnh chi trả 20%
                      </div>
                      <p className="text-muted mb-0" style={{ fontSize: '13px', lineHeight: 1.6 }}>
                        Áp dụng cho người lao động làm việc theo hợp đồng lao động tại doanh nghiệp, học sinh, sinh viên và người tham gia BHYT theo hình thức hộ gia đình tự nguyện.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Mục 3: Thủ tục xuất trình */}
              <div className="mb-4 pb-3 border-bottom" style={{ borderColor: '#F1F5F9' }}>
                <h2 className="fw-bold mb-3" style={{ fontSize: '18px', color: '#0F172A' }}>
                  3. Thủ Tục Xuất Trình &amp; Đăng Ký Giảm Trừ BHYT
                </h2>
                <p style={{ fontSize: '14px', color: '#475569', lineHeight: 1.7 }}>
                  Để đảm bảo thủ tục diễn ra thuận lợi chỉ trong 1 - 2 phút, quý khách vui lòng xuất trình một trong các giấy tờ sau tại quầy tiếp đón hoặc khi điều dưỡng đến lấy mẫu tại nhà:
                </p>
                <div className="d-flex flex-column gap-2">
                  <div className="d-flex align-items-start gap-2.5">
                    <FaCheckCircle style={{ color: '#10B981', marginTop: '4px', flexShrink: 0 }} />
                    <span style={{ fontSize: '14px', color: '#334155', lineHeight: 1.6 }}>
                      <strong>Căn cước công dân gắn chip hoặc ứng dụng VNeID (Mức 2):</strong> Đã tích hợp thông tin thẻ BHYT hợp lệ.
                    </span>
                  </div>
                  <div className="d-flex align-items-start gap-2.5">
                    <FaCheckCircle style={{ color: '#10B981', marginTop: '4px', flexShrink: 0 }} />
                    <span style={{ fontSize: '14px', color: '#334155', lineHeight: 1.6 }}>
                      <strong>Ứng dụng VssID (Bảo hiểm xã hội số):</strong> Mở hình ảnh thẻ BHYT trực tuyến trên màn hình điện thoại thông minh.
                    </span>
                  </div>
                  <div className="d-flex align-items-start gap-2.5">
                    <FaCheckCircle style={{ color: '#10B981', marginTop: '4px', flexShrink: 0 }} />
                    <span style={{ fontSize: '14px', color: '#334155', lineHeight: 1.6 }}>
                      <strong>Thẻ BHYT bản giấy còn thời hạn sử dụng:</strong> Kèm theo giấy tờ tùy thân có ảnh hợp pháp (CCCD, Hộ chiếu, Giấy phép lái xe).
                    </span>
                  </div>
                  <div className="d-flex align-items-start gap-2.5">
                    <FaCheckCircle style={{ color: '#10B981', marginTop: '4px', flexShrink: 0 }} />
                    <span style={{ fontSize: '14px', color: '#334155', lineHeight: 1.6 }}>
                      <strong>Giấy chuyển tuyến khám chữa bệnh BHYT (nếu có):</strong> Để được hưởng 100% mức quyền lợi đúng tuyến khi điều trị chuyên khoa.
                    </span>
                  </div>
                </div>
              </div>

              {/* Mục 4: Danh mục xét nghiệm */}
              <div className="mb-4 pb-3 border-bottom" style={{ borderColor: '#F1F5F9' }}>
                <h2 className="fw-bold mb-3" style={{ fontSize: '18px', color: '#0F172A' }}>
                  4. Danh Mục Xét Nghiệm Máu Được BHYT Hỗ Trợ
                </h2>
                <div className="row g-3">
                  <div className="col-md-6">
                    <div style={{ background: '#F8FAFC', padding: '18px 20px', borderRadius: '16px', border: '1px solid #E2E8F0', height: '100%' }}>
                      <div className="fw-bold text-dark mb-2" style={{ fontSize: '14px' }}>
                        Xét nghiệm thường quy &amp; Bệnh mạn tính
                      </div>
                      <ul className="mb-0 ps-3 text-muted" style={{ fontSize: '13px', lineHeight: 1.7 }}>
                        <li>Tổng phân tích tế bào máu ngoại vi (CBC Laser).</li>
                        <li>Đường huyết đói (Glucose máu), HbA1c đánh giá tiểu đường.</li>
                        <li>Chức năng gan: Men gan AST (GOT), ALT (GPT), GGT, Bilirubin.</li>
                        <li>Chức năng thận: Định lượng Ure, Creatinine huyết thanh, eGFR.</li>
                        <li>Bộ mỡ máu lipid: Cholesterol toàn phần, Triglyceride, HDL, LDL.</li>
                      </ul>
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div style={{ background: '#F8FAFC', padding: '18px 20px', borderRadius: '16px', border: '1px solid #E2E8F0', height: '100%' }}>
                      <div className="fw-bold text-dark mb-2" style={{ fontSize: '14px' }}>
                        Xét nghiệm chuyên sâu &amp; Miễn dịch
                      </div>
                      <ul className="mb-0 ps-3 text-muted" style={{ fontSize: '13px', lineHeight: 1.7 }}>
                        <li>Đông máu cơ bản: Thời gian Prothrombin (PT), Fibrinogen.</li>
                        <li>Viêm gan virus: HBsAg định tính/định lượng, Anti-HCV.</li>
                        <li>Tuyến giáp: Định lượng FT3, FT4, TSH.</li>
                        <li>Điện giải đồ máu: Na+, K+, Cl-, Canxi ion hóa.</li>
                        <li>Một số chỉ điểm ung thư (Tumor markers) theo chỉ định theo dõi sau phẫu thuật.</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              {/* Mục 5: Quy trình đồng chi trả và hóa đơn điện tử */}
              <div className="mb-4 pb-3 border-bottom" style={{ borderColor: '#F1F5F9' }}>
                <h2 className="fw-bold mb-3" style={{ fontSize: '18px', color: '#0F172A' }}>
                  5. Tự Động Chiết Khấu Đồng Chi Trả &amp; Xuất Hóa Đơn Điện Tử (VAT)
                </h2>
                <p style={{ fontSize: '14px', color: '#475569', lineHeight: 1.7 }}>
                  Nhằm mang lại trải nghiệm tiện lợi như dịch vụ ngân hàng hiện đại:
                </p>
                <div className="p-3" style={{ background: '#F8FAFC', borderRadius: '14px', border: '1px solid #E2E8F0' }}>
                  <ul className="mb-0 ps-3 text-muted" style={{ fontSize: '13px', lineHeight: 1.8 }}>
                    <li><strong className="text-dark">Chiết khấu tự động:</strong> Hệ thống tự động trừ khoản chi trả của Quỹ BHYT vào hóa đơn tạm tính theo đúng thông tư 22/2023/TT-BYT. Người bệnh không phải tự nộp hồ sơ xin hoàn trả phức tạp.</li>
                    <li><strong className="text-dark">Hóa đơn điện tử hợp pháp:</strong> Sau khi hoàn tất thanh toán phần đồng chi trả, hóa đơn điện tử (kèm Mẫu số 01/BV - Bảng kê chi phí khám bệnh, chữa bệnh) sẽ được gửi tự động qua email hoặc tin nhắn Zalo của người bệnh.</li>
                    <li><strong className="text-dark">Hỗ trợ Bảo hiểm sức khỏe tư nhân (PVI, BaoViet, Liberty, Manulife, Dai-ichi...):</strong> Cung cấp đầy đủ trọn bộ hóa đơn đỏ VAT, phiếu chỉ định có chữ ký bác sĩ và phiếu kết quả có ký số để làm thủ tục bồi thường thanh toán trực tiếp.</li>
                  </ul>
                </div>
              </div>

              {/* Mục 6: Các trường hợp loại trừ */}
              <div className="mb-4 pb-3 border-bottom" style={{ borderColor: '#F1F5F9' }}>
                <h2 className="fw-bold mb-3" style={{ fontSize: '18px', color: '#0F172A' }}>
                  6. Các Trường Hợp Không Thuộc Phạm Vi BHYT Chi Trả
                </h2>
                <div className="p-3" style={{ background: '#FFFBEB', borderRadius: '14px', border: '1px solid #FDE68A' }}>
                  <div className="d-flex align-items-center gap-2 mb-2 text-warning-emphasis fw-bold" style={{ fontSize: '14px' }}>
                    <FaExclamationTriangle />
                    <span>Lưu ý theo quy định của Luật Bảo hiểm Y tế</span>
                  </div>
                  <ul className="mb-0 ps-3 text-muted" style={{ fontSize: '13px', lineHeight: 1.7 }}>
                    <li>Xét nghiệm tự nguyện theo yêu cầu cá nhân mà không có chỉ định chuyên môn phù hợp của Bác sĩ điều trị.</li>
                    <li>Khám sức khỏe tổng quát định kỳ cho doanh nghiệp, cơ quan hoặc cá nhân đi du học, xin việc, thi giấy phép lái xe.</li>
                    <li>Các xét nghiệm giải trình tự gen thế hệ mới chuyên sâu (NGS), xét nghiệm di truyền sàng lọc tiền sản (NIPT) không nằm trong danh mục TT22.</li>
                    <li>Phí dịch vụ lấy mẫu tận nhà ngoài giờ hoặc phí vận chuyển ống mẫu đặc biệt (BHYT chỉ thanh toán chi phí kỹ thuật phân tích mẫu).</li>
                  </ul>
                </div>
              </div>

              {/* Mục 7: Tổng đài tư vấn BHYT */}
              <div>
                <h2 className="fw-bold mb-3" style={{ fontSize: '18px', color: '#0F172A' }}>
                  7. Tổng Đài Tư Vấn &amp; Tra Cứu Quyền Lợi BHYT
                </h2>
                <p style={{ fontSize: '14px', color: '#475569', lineHeight: 1.7 }}>
                  Nếu quý khách chưa rõ gói xét nghiệm của mình có được BHYT chi trả hay không, hoặc cần hướng dẫn làm thủ tục thanh toán bảo hiểm tư nhân, hãy liên hệ chuyên viên y tế BMS:
                </p>
                <div className="d-flex flex-wrap gap-4 mt-2">
                  <div className="d-flex align-items-center gap-2 text-muted" style={{ fontSize: '14px' }}>
                    <FaPhoneAlt style={{ color: '#1E60E6' }} />
                    <span>Hotline Hỗ Trợ BHYT: <strong>1900 8686 (Bấm phím 1)</strong></span>
                  </div>
                  <div className="d-flex align-items-center gap-2 text-muted" style={{ fontSize: '14px' }}>
                    <FaNotesMedical style={{ color: '#10B981' }} />
                    <span>Email thẩm định hồ sơ: <strong>bhyt@bmslab.vn</strong></span>
                  </div>
                </div>
              </div>

            </div>

            {/* Quick Links Footer */}
            <div className="d-flex justify-content-between align-items-center mt-4 px-2">
              <Link to="/terms" style={{ color: '#1E60E6', textDecoration: 'none', fontSize: '14px', fontWeight: 600 }}>
                ← Xem Điều khoản dịch vụ
              </Link>
              <Link to="/pricing" style={{ color: '#1E60E6', textDecoration: 'none', fontSize: '14px', fontWeight: 600 }}>
                Xem Bảng giá niêm yết công khai →
              </Link>
            </div>
          </div>
        </section>
      </div>

      <MegaFooter />
    </div>
  );
}

