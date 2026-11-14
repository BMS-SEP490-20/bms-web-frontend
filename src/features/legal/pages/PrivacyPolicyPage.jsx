/**
 * @file PrivacyPolicyPage.jsx
 * @description Official Privacy Policy & Medical Data Protection Statement for BMS Clinical Laboratory.
 * Conforms to: Decree No. 13/2023/ND-CP on Personal Data Protection, Law on Cyberinformation Security, Law on Medical Examination and Treatment No. 15/2023/QH15.
 */

import React from 'react';
import { Link } from 'react-router-dom';
import { FaShieldAlt, FaUserLock, FaLock, FaFileMedicalAlt, FaCheckCircle, FaHospitalUser, FaPhoneAlt, FaEnvelope } from 'react-icons/fa';
import PortalNavbar from '../../home/components/PortalNavbar';
import MegaFooter from '../../home/components/MegaFooter';
import usePageTransition from '../../../shared/hooks/usePageTransition';

export default function PrivacyPolicyPage() {
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
              <div className="d-flex align-items-center gap-2 mb-2.5" style={{ fontSize: '12px', color: '#10B981', fontWeight: 700, letterSpacing: '0.04em' }}>
                <FaShieldAlt style={{ fontSize: '15px' }} />
                <span>CHÍNH SÁCH BẢO MẬT &amp; DỮ LIỆU Y TẾ · NGHỊ ĐỊNH 13/2023/NĐ-CP</span>
              </div>
              <h1 className="fw-bold mb-3" style={{ fontSize: '30px', color: '#0F172A', letterSpacing: '-0.025em', lineHeight: '1.25' }}>
                Chính Sách Bảo Mật &amp; Bảo Vệ Dữ Liệu Y Tế
              </h1>
              <p className="mb-0 text-muted" style={{ fontSize: '14px', maxWidth: '820px', lineHeight: '1.7', color: '#475569' }}>
                Tại BMS, quyền riêng tư và bí mật y khoa của người bệnh là ưu tiên tối thượng. Mọi thông tin sức khỏe và kết quả xét nghiệm được bảo vệ nghiêm ngặt theo Nghị định 13/2023/NĐ-CP về Bảo vệ dữ liệu cá nhân và tiêu chuẩn an toàn y tế quốc tế.
              </p>
              <div className="mt-3 text-muted" style={{ fontSize: '12px' }}>
                Cập nhật lần cuối: Ngày 01 tháng 11 năm 2026 · Phiên bản: v2.4 (Tuân thủ ND13 &amp; ISO 15189:2022)
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
              {/* Mục 1: Cam kết chung */}
              <div className="mb-4 pb-3 border-bottom" style={{ borderColor: '#F1F5F9' }}>
                <h2 className="fw-bold mb-3" style={{ fontSize: '18px', color: '#0F172A' }}>
                  1. Cam Kết Tối Thượng Về Bí Mật Y Khoa
                </h2>
                <p style={{ fontSize: '14px', color: '#475569', lineHeight: 1.7 }}>
                  Hệ thống Xét nghiệm Y khoa BMS cam kết tuân thủ Điều 68 Luật Khám bệnh, chữa bệnh số 15/2023/QH15 và Nghị định số 13/2023/NĐ-CP của Chính phủ về bảo vệ dữ liệu cá nhân. Toàn bộ thông tin cá nhân và dữ liệu xét nghiệm của người bệnh được coi là bí mật y khoa loại nhạy cảm, chỉ được xử lý và chia sẻ theo đúng sự đồng ý minh thị của người bệnh hoặc khi có yêu cầu hợp pháp từ cơ quan nhà nước có thẩm quyền.
                </p>
              </div>

              {/* Mục 2: Phân loại dữ liệu */}
              <div className="mb-4 pb-3 border-bottom" style={{ borderColor: '#F1F5F9' }}>
                <h2 className="fw-bold mb-3" style={{ fontSize: '18px', color: '#0F172A' }}>
                  2. Danh Mục Dữ Liệu Chúng Tôi Thu Thập
                </h2>
                <p style={{ fontSize: '14px', color: '#475569', lineHeight: 1.7 }}>
                  Để đảm bảo tính chính xác lâm sàng và phục vụ công tác chẩn đoán, BMS thu thập các nhóm dữ liệu sau:
                </p>
                <div className="row g-3">
                  <div className="col-md-6">
                    <div style={{ background: '#F8FAFC', padding: '18px 20px', borderRadius: '16px', border: '1px solid #E2E8F0', height: '100%' }}>
                      <div className="d-flex align-items-center gap-2 mb-2" style={{ fontWeight: 600, color: '#1E60E6', fontSize: '14px' }}>
                        <FaUserLock />
                        <span>Dữ liệu định danh cá nhân</span>
                      </div>
                      <ul className="mb-0 ps-3 text-muted" style={{ fontSize: '13px', lineHeight: 1.6 }}>
                        <li>Họ và tên, ngày tháng năm sinh, giới tính sinh học.</li>
                        <li>Số Căn cước công dân (CCCD) / Mã định danh cá nhân / Số thẻ BHYT.</li>
                        <li>Số điện thoại và địa chỉ nhận mẫu tại nhà hoặc nơi gửi kết quả.</li>
                      </ul>
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div style={{ background: '#F8FAFC', padding: '18px 20px', borderRadius: '16px', border: '1px solid #E2E8F0', height: '100%' }}>
                      <div className="d-flex align-items-center gap-2 mb-2" style={{ fontWeight: 600, color: '#10B981', fontSize: '14px' }}>
                        <FaFileMedicalAlt />
                        <span>Dữ liệu y tế nhạy cảm</span>
                      </div>
                      <ul className="mb-0 ps-3 text-muted" style={{ fontSize: '13px', lineHeight: 1.6 }}>
                        <li>Chỉ số huyết học, sinh hóa máu, miễn dịch, chỉ điểm khối u...</li>
                        <li>Lịch sử sử dụng thuốc, triệu chứng hiện tại hoặc ghi chú của Bác sĩ.</li>
                        <li>Chữ ký số và xác thực duyệt chuyên môn của Bác sĩ phụ trách.</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              {/* Mục 3: Mục đích sử dụng */}
              <div className="mb-4 pb-3 border-bottom" style={{ borderColor: '#F1F5F9' }}>
                <h2 className="fw-bold mb-3" style={{ fontSize: '18px', color: '#0F172A' }}>
                  3. Mục Đích Xử Lý Dữ Liệu
                </h2>
                <div className="d-flex flex-column gap-2">
                  <div className="d-flex align-items-start gap-2.5">
                    <FaCheckCircle style={{ color: '#10B981', marginTop: '4px', flexShrink: 0 }} />
                    <span style={{ fontSize: '14px', color: '#334155', lineHeight: 1.6 }}>
                      <strong>Thực hiện xét nghiệm y khoa:</strong> Phục vụ trực tiếp việc đo đạc chỉ số, phân tích máu và lập phiếu kết quả chẩn đoán.
                    </span>
                  </div>
                  <div className="d-flex align-items-start gap-2.5">
                    <FaCheckCircle style={{ color: '#10B981', marginTop: '4px', flexShrink: 0 }} />
                    <span style={{ fontSize: '14px', color: '#334155', lineHeight: 1.6 }}>
                      <strong>Tư vấn và hỗ trợ chuyên môn:</strong> Bác sĩ chuyên khoa của BMS liên hệ người bệnh để giải thích ý nghĩa các chỉ số xét nghiệm và cảnh báo bất thường.
                    </span>
                  </div>
                  <div className="d-flex align-items-start gap-2.5">
                    <FaCheckCircle style={{ color: '#10B981', marginTop: '4px', flexShrink: 0 }} />
                    <span style={{ fontSize: '14px', color: '#334155', lineHeight: 1.6 }}>
                      <strong>Giám định BHYT &amp; Tài chính:</strong> Xuất hóa đơn điện tử VAT hợp pháp và hỗ trợ thủ tục chi trả theo quy định bảo hiểm y tế.
                    </span>
                  </div>
                  <div className="d-flex align-items-start gap-2.5">
                    <FaCheckCircle style={{ color: '#10B981', marginTop: '4px', flexShrink: 0 }} />
                    <span style={{ fontSize: '14px', color: '#334155', lineHeight: 1.6 }}>
                      <strong>Giao nhận và tra cứu điện tử:</strong> Cung cấp tính năng tra cứu trực tuyến bằng mã phiếu xét nghiệm và gửi thông báo SMS/Zalo khi có kết quả.
                    </span>
                  </div>
                </div>
              </div>

              {/* Mục 4: Công nghệ bảo mật & Ẩn danh hóa */}
              <div className="mb-4 pb-3 border-bottom" style={{ borderColor: '#F1F5F9' }}>
                <h2 className="fw-bold mb-3" style={{ fontSize: '18px', color: '#0F172A' }}>
                  4. Công Nghệ Bảo Mật &amp; Cơ Chế Ẩn Danh Ống Máu
                </h2>
                <p style={{ fontSize: '14px', color: '#475569', lineHeight: 1.7 }}>
                  BMS áp dụng các tiêu chuẩn an ninh thông tin y tế khắt khe nhằm ngăn chặn triệt để nguy cơ rò rỉ dữ liệu:
                </p>
                <div className="d-flex flex-column gap-2.5">
                  <div className="p-3" style={{ background: '#F8FAFC', borderRadius: '14px', border: '1px solid #E2E8F0' }}>
                    <div className="fw-bold text-dark mb-1" style={{ fontSize: '14px' }}>
                      Mã hóa chuẩn ngân hàng &amp; y tế (TLS 1.3 &amp; AES-256)
                    </div>
                    <div className="text-muted" style={{ fontSize: '13px', lineHeight: 1.6 }}>
                      Tất cả dữ liệu đường truyền giữa trình duyệt người bệnh và hệ thống máy chủ đều được mã hóa bằng giao thức TLS 1.3. Cơ sở dữ liệu hồ sơ bệnh án được mã hóa ở cấp độ lưu trữ bằng thuật toán AES-256 bit.
                    </div>
                  </div>
                  <div className="p-3" style={{ background: '#F8FAFC', borderRadius: '14px', border: '1px solid #E2E8F0' }}>
                    <div className="fw-bold text-dark mb-1" style={{ fontSize: '14px' }}>
                      Cơ chế Barcode 1 chiều - Ẩn danh tuyệt đối tại phòng Lab
                    </div>
                    <div className="text-muted" style={{ fontSize: '13px', lineHeight: 1.6 }}>
                      Khi lấy mẫu, ống nghiệm chỉ được dán duy nhất một mã vạch Barcode định danh mẫu ngẫu nhiên. Kỹ thuật viên và hệ thống máy phân tích tự động chỉ thao tác trên mã Barcode mà không thể thấy tên, tuổi hay địa chỉ của người bệnh, loại bỏ hoàn toàn khả năng can thiệp chủ quan.
                    </div>
                  </div>
                  <div className="p-3" style={{ background: '#F8FAFC', borderRadius: '14px', border: '1px solid #E2E8F0' }}>
                    <div className="fw-bold text-dark mb-1" style={{ fontSize: '14px' }}>
                      Phân quyền truy cập đa tầng (Role-Based Access Control)
                    </div>
                    <div className="text-muted" style={{ fontSize: '13px', lineHeight: 1.6 }}>
                      Chỉ Bác sĩ điều trị và Kỹ thuật viên được phân công phụ trách mới có quyền truy cập hồ sơ xét nghiệm tương ứng. Toàn bộ thao tác xem, sửa, xuất báo cáo đều được ghi log bất biến (Audit Trail).
                    </div>
                  </div>
                </div>
              </div>

              {/* Mục 5: Tuyệt đối không bán dữ liệu */}
              <div className="mb-4 pb-3 border-bottom" style={{ borderColor: '#F1F5F9' }}>
                <h2 className="fw-bold mb-3" style={{ fontSize: '18px', color: '#0F172A' }}>
                  5. Cam Kết Không Bán Hoặc Cho Thuê Dữ Liệu
                </h2>
                <div className="p-3.5" style={{ background: '#EFF6FF', borderRadius: '14px', border: '1px solid #BFDBFE' }}>
                  <p className="mb-0" style={{ fontSize: '14px', color: '#1E40AF', lineHeight: 1.7 }}>
                    <strong>Tuyên bố minh bạch:</strong> BMS KHÔNG BAO GIỜ bán, trao đổi, cho thuê hoặc chuyển nhượng dữ liệu cá nhân hay hồ sơ bệnh án của bạn cho bất kỳ đơn vị bảo hiểm nhân thọ, đại lý quảng cáo, dược phẩm hay tổ chức thứ ba nào vì mục đích thương mại.
                  </p>
                </div>
              </div>

              {/* Mục 6: Quyền của người bệnh */}
              <div className="mb-4 pb-3 border-bottom" style={{ borderColor: '#F1F5F9' }}>
                <h2 className="fw-bold mb-3" style={{ fontSize: '18px', color: '#0F172A' }}>
                  6. Quyền Hạn Của Bạn Đối Với Dữ Liệu Cá Nhân
                </h2>
                <p style={{ fontSize: '14px', color: '#475569', lineHeight: 1.7 }}>
                  Theo Nghị định 13/2023/NĐ-CP, bạn có đầy đủ các quyền hợp pháp sau:
                </p>
                <ul className="text-muted ps-3 mb-0" style={{ fontSize: '14px', lineHeight: 1.8 }}>
                  <li><strong className="text-dark">Quyền được biết &amp; đồng ý:</strong> Được thông báo rõ ràng về các loại mẫu máu và mục đích trước khi tiến hành lấy mẫu.</li>
                  <li><strong className="text-dark">Quyền truy cập &amp; tải về:</strong> Đăng nhập hệ thống để tải bản điện tử PDF có chữ ký số của Bác sĩ bất cứ lúc nào.</li>
                  <li><strong className="text-dark">Quyền yêu cầu đính chính:</strong> Yêu cầu cập nhật hoặc sửa đổi các thông tin hành chính (họ tên, số điện thoại, ngày sinh) nếu có sai lệch.</li>
                  <li><strong className="text-dark">Quyền rút lại sự đồng ý:</strong> Yêu cầu hạn chế xử lý dữ liệu (ngoại trừ các hồ sơ bắt buộc phải lưu trữ theo Luật Khám bệnh chữa bệnh về lưu trữ bệnh án y khoa tối thiểu 10 năm).</li>
                </ul>
              </div>

              {/* Mục 7: Đầu mối liên hệ DPO */}
              <div>
                <h2 className="fw-bold mb-3" style={{ fontSize: '18px', color: '#0F172A' }}>
                  7. Thông Tin Liên Hệ Bộ Phận Bảo Vệ Dữ Liệu (DPO)
                </h2>
                <p style={{ fontSize: '14px', color: '#475569', lineHeight: 1.7 }}>
                  Nếu bạn có bất kỳ thắc mắc, phản ánh hoặc yêu cầu thực thi quyền dữ liệu cá nhân, vui lòng liên hệ trực tiếp với Cán bộ Bảo vệ Dữ liệu của chúng tôi:
                </p>
                <div className="d-flex flex-wrap gap-4 mt-2">
                  <div className="d-flex align-items-center gap-2 text-muted" style={{ fontSize: '14px' }}>
                    <FaEnvelope style={{ color: '#1E60E6' }} />
                    <span>Email: <strong>privacy@bmslab.vn</strong></span>
                  </div>
                  <div className="d-flex align-items-center gap-2 text-muted" style={{ fontSize: '14px' }}>
                    <FaPhoneAlt style={{ color: '#10B981' }} />
                    <span>Hotline Bảo Mật: <strong>1900 8686 (Nhánh 3)</strong></span>
                  </div>
                  <div className="d-flex align-items-center gap-2 text-muted" style={{ fontSize: '14px' }}>
                    <FaHospitalUser style={{ color: '#6366F1' }} />
                    <span>Trụ sở chính: BMS Lab Tower, Tầng 3, Phòng Thanh tra Dữ liệu Y tế</span>
                  </div>
                </div>
              </div>

            </div>

            {/* Quick Links Footer */}
            <div className="d-flex justify-content-between align-items-center mt-4 px-2">
              <Link to="/terms" style={{ color: '#1E60E6', textDecoration: 'none', fontSize: '14px', fontWeight: 600 }}>
                ← Xem Điều khoản dịch vụ
              </Link>
              <Link to="/insurance-policy" style={{ color: '#1E60E6', textDecoration: 'none', fontSize: '14px', fontWeight: 600 }}>
                Xem Chính sách chi trả BHYT →
              </Link>
            </div>
          </div>
        </section>
      </div>

      <MegaFooter />
    </div>
  );
}

