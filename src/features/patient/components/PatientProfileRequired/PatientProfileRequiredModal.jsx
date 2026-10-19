/**
 * @file PatientProfileRequiredModal.jsx
 * @description Modal prompting patients to complete mandatory demographic/identity info (BR-REC-01).
 * Triggered when a patient attempts to book high-complexity lab tests without a validated 12-digit CCCD.
 * Conforms to: ISO 15189 Identity Verification & AGENTS-DESIGN.md.
 */

import React from 'react';
import { Modal, Button, Alert } from 'react-bootstrap';
import { FaIdCard, FaExclamationTriangle, FaArrowRight, FaShieldAlt } from 'react-icons/fa';

export default function PatientProfileRequiredModal({ show, onHide, onNavigateToProfile }) {
  return (
    <Modal show={show} onHide={onHide} centered backdrop="static" keyboard={false}>
      <Modal.Header closeButton className="border-0 pb-0">
        <Modal.Title className="h6 fw-bold text-dark d-flex align-items-center gap-2">
          <span className="p-2 bg-warning bg-opacity-10 text-warning rounded-3">
            <FaIdCard size={20} />
          </span>
          Yêu Cầu Hoàn Thiện Hồ Sơ Định Danh
        </Modal.Title>
      </Modal.Header>

      <Modal.Body className="py-3">
        <Alert variant="warning" className="d-flex align-items-start gap-2 small mb-3">
          <FaExclamationTriangle className="flex-shrink-0 mt-1" />
          <span>
            Theo tiêu chuẩn quản lý chất lượng xét nghiệm y khoa <strong>ISO 15189</strong> và Đề án 06, bệnh nhân cần cập nhật chính xác số <strong>Căn cước công dân (CCCD 12 số)</strong> và thông tin nhân khẩu trước khi đặt lịch lấy mẫu máu.
          </span>
        </Alert>

        <p className="text-muted small mb-0">
          Việc này nhằm bảo đảm:
        </p>
        <ul className="small text-muted ps-3 mb-0 mt-1">
          <li>Kết quả xét nghiệm được đồng bộ chính xác vào Hồ Sơ Sức Khỏe Điện Tử trọn đời.</li>
          <li>Chữ ký số hợp lệ của Bác sĩ Trưởng Lab trên phiếu kết quả online.</li>
          <li>Tránh nhầm lẫn mẫu bệnh phẩm trong quá trình tiếp nhận và phân tích.</li>
        </ul>
      </Modal.Body>

      <Modal.Footer className="border-0 pt-0">
        <Button variant="light" size="sm" onClick={onHide}>
          Để Sau
        </Button>
        <Button 
          variant="primary" 
          size="sm" 
          onClick={() => {
            onHide();
            if (onNavigateToProfile) onNavigateToProfile();
          }}
          className="d-flex align-items-center gap-2"
        >
          <span>Cập Nhật Ngay</span>
          <FaArrowRight size={12} />
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
