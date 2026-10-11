/**
 * Guest Footer Component
 * 
 * Footer component for guest users in the Blood Laboratory Management System.
 * Provides company information, contact details, and social media links.
 * 
 * @author Blood Laboratory Management Team
 * @version 1.0.0
 * @since 2024
 */

import React, { useState, useEffect } from 'react';
import { Container, Row, Col } from 'react-bootstrap';
import { medicalService } from '../../services/medicalService';

/**
 * Guest Footer Component
 * 
 * Footer component with company information, contact details, and social links.
 * Used on public pages for guest users.
 * 
 * @returns {React.ReactNode} Guest footer component
 */
const GuestFooter = () => {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadServices = async () => {
      try {
        const result = await medicalService.getAllServices({ fetchAll: false });
        if (result.success && result.data) {
          // Lấy tối đa 6 dịch vụ active đầu tiên
          const activeServices = result.data
            .filter(s => {
              const status = s.status || s.Status || '';
              return String(status).toLowerCase() === 'active' || !status;
            })
            .slice(0, 6)
            .map(s => ({
              name: s.packageName || s.package_name || s.name || s.Name || s.testPackageName || s.TestPackageName || 'Dịch vụ xét nghiệm'
            }));
          setServices(activeServices);
        } else {
          // Fallback to default services if API fails
          setServices([
            { name: 'Xét nghiệm máu cơ bản' },
            { name: 'Xét nghiệm chức năng gan' },
            { name: 'Xét nghiệm chức năng thận' },
            { name: 'Xét nghiệm hormone' },
            { name: 'Xét nghiệm miễn dịch' },
            { name: 'Xét nghiệm nhanh COVID-19' }
          ]);
        }
      } catch (error) {
        // Fallback to default services on error
        setServices([
          { name: 'Xét nghiệm máu cơ bản' },
          { name: 'Xét nghiệm chức năng gan' },
          { name: 'Xét nghiệm chức năng thận' },
          { name: 'Xét nghiệm hormone' },
          { name: 'Xét nghiệm miễn dịch' },
          { name: 'Xét nghiệm nhanh COVID-19' }
        ]);
      } finally {
        setLoading(false);
      }
    };

    loadServices();
  }, []);

  return (
    <footer className="footer">
      <Container>
        <Row>
          <Col md={4} className="mb-4">
            <div className="d-flex align-items-center mb-3">
              <i className="fas fa-heartbeat text-primary me-2" style={{ fontSize: '1.5rem' }}></i>
              <h5 className="mb-0 text-primary">Phòng Xét Nghiệm Máu</h5>
            </div>
            <p className="text-light">
              Hệ thống quản lý phòng xét nghiệm máu hiện đại, cung cấp các dịch vụ xét nghiệm chính xác, nhanh chóng và đáng tin cậy. Quản lý lịch hẹn, mẫu xét nghiệm và kết quả một cách hiệu quả.
            </p>
            <div className="d-flex">
              <span className="text-light me-3" style={{ cursor: 'pointer' }}>
                <i className="fab fa-facebook-f"></i>
              </span>
              <span className="text-light me-3" style={{ cursor: 'pointer' }}>
                <i className="fab fa-twitter"></i>
              </span>
              <span className="text-light me-3" style={{ cursor: 'pointer' }}>
                <i className="fab fa-instagram"></i>
              </span>
              <span className="text-light" style={{ cursor: 'pointer' }}>
                <i className="fab fa-linkedin-in"></i>
              </span>
            </div>
          </Col>
          
          <Col md={2} className="mb-4">
            <h6 className="text-primary mb-3">Dịch vụ</h6>
            {loading ? (
              <ul className="list-unstyled">
                <li className="mb-2">
                  <span className="text-light">Đang tải...</span>
                </li>
              </ul>
            ) : services.length > 0 ? (
              <ul className="list-unstyled">
                {services.map((service, index) => (
                  <li key={index} className="mb-2">
                    <span className="text-light">{service.name}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <ul className="list-unstyled">
                <li className="mb-2">
                  <span className="text-light">Xét nghiệm máu cơ bản</span>
                </li>
                <li className="mb-2">
                  <span className="text-light">Xét nghiệm chức năng gan</span>
                </li>
                <li className="mb-2">
                  <span className="text-light">Xét nghiệm chức năng thận</span>
                </li>
                <li className="mb-2">
                  <span className="text-light">Xét nghiệm hormone</span>
                </li>
                <li className="mb-2">
                  <span className="text-light">Xét nghiệm miễn dịch</span>
                </li>
                <li className="mb-2">
                  <span className="text-light">Xét nghiệm nhanh COVID-19</span>
                </li>
              </ul>
            )}
          </Col>
          
          <Col md={2} className="mb-4">
            <h6 className="text-primary mb-3">Hỗ trợ</h6>
            <ul className="list-unstyled">
              <li className="mb-2">
                <span className="text-light">Hướng dẫn đặt lịch hẹn</span>
              </li>
              <li className="mb-2">
                <span className="text-light">Cách xem kết quả xét nghiệm</span>
              </li>
              <li className="mb-2">
                <span className="text-light">Hướng dẫn thanh toán</span>
              </li>
              <li className="mb-2">
                <span className="text-light">Chính sách bảo mật</span>
              </li>
              <li className="mb-2">
                <span className="text-light">Điều khoản sử dụng</span>
              </li>
              <li className="mb-2">
                <span className="text-light">Chính sách hoàn tiền</span>
              </li>
            </ul>
          </Col>
          
          <Col md={4} className="mb-4">
            <h6 className="text-primary mb-3">Thông tin liên hệ</h6>
            <div className="mb-2">
              <i className="fas fa-map-marker-alt text-primary me-2"></i>
              <span className="text-light">Số 123 Đường ABC, Phường XYZ, Quận 1, TP. Hồ Chí Minh</span>
            </div>
            <div className="mb-2">
              <i className="fas fa-phone text-primary me-2"></i>
              <span className="text-light">(028) 1234 5678</span>
            </div>
            <div className="mb-2">
              <i className="fas fa-mobile-alt text-primary me-2"></i>
              <span className="text-light">Hotline: 0901 234 567</span>
            </div>
            <div className="mb-2">
              <i className="fas fa-envelope text-primary me-2"></i>
              <span className="text-light">info@bloodlab.vn</span>
            </div>
            <div className="mb-2">
              <i className="fas fa-clock text-primary me-2"></i>
              <span className="text-light">Thứ 2 - Thứ 7: 7:00 - 17:00</span>
            </div>
            <div className="mb-2">
              <i className="fas fa-calendar text-primary me-2"></i>
              <span className="text-light">Chủ nhật: 8:00 - 12:00</span>
            </div>
            <div className="mb-2">
              <i className="fas fa-globe text-primary me-2"></i>
              <span className="text-light">www.bloodlab.vn</span>
            </div>
          </Col>
        </Row>
        
        <hr className="my-4" />
        
        <Row className="align-items-center">
          <Col md={6}>
            <p className="text-light mb-0">
              © {new Date().getFullYear()} Phòng Xét Nghiệm Máu. Tất cả quyền được bảo lưu.
            </p>
            <p className="text-light mb-0 small">
              Giấy phép hoạt động số: 123456789 | Mã số thuế: 0123456789
            </p>
          </Col>
          <Col md={6} className="text-md-end">
            <p className="text-light mb-0">
              Được phát triển bởi <span className="text-primary">Blood Laboratory Management Team</span>
            </p>
            <p className="text-light mb-0 small">
              Phiên bản 1.0.0 | Cập nhật lần cuối: {new Date().toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })}
            </p>
          </Col>
        </Row>
      </Container>
    </footer>
  );
};

export default GuestFooter;
