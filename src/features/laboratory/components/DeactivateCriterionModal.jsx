/**
 * @file DeactivateCriterionModal.jsx
 * @description Confirmation modal for safely deactivating / soft-deleting laboratory criteria (UC18).
 * Built with React-Bootstrap Modal. Enforces ISO 15189 compliance by preventing permanent deletion of historical clinical records.
 */

import React, { useState } from 'react';
import { Modal, Button, Alert, Badge, Card, Spinner } from 'react-bootstrap';
import { FaExclamationTriangle, FaTimes, FaShieldAlt } from 'react-icons/fa';

export default function DeactivateCriterionModal({ isOpen, criterion, onClose, onConfirm }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  if (!isOpen || !criterion) return null;

  const handleConfirm = async () => {
    try {
      setIsSubmitting(true);
      setErrorMessage('');
      await onConfirm(criterion.id);
    } catch (err) {
      setErrorMessage(err.message || 'Lỗi khi vô hiệu hóa chỉ số xét nghiệm.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal 
      show={isOpen} 
      onHide={onClose} 
      centered 
      backdrop="static"
      className="bms-medical-modal"
    >
      <Modal.Header closeButton className="bg-danger bg-opacity-10 border-danger border-opacity-25 py-3 px-4">
        <div>
          <Modal.Title className="h6 fw-bold mb-0 text-danger d-flex align-items-center gap-2">
            <FaExclamationTriangle />
            Ngưng Sử Dụng Chỉ Số Xét Nghiệm
          </Modal.Title>
          <small className="text-danger opacity-75">
            Bảo toàn lịch sử hồ sơ bệnh án theo tiêu chuẩn ISO 15189:2022
          </small>
        </div>
      </Modal.Header>

      <Modal.Body className="p-4">
        {errorMessage && (
          <Alert variant="danger" dismissible onClose={() => setErrorMessage('')} className="small mb-3">
            {errorMessage}
          </Alert>
        )}

        <Card className="bg-light border mb-3 rounded-3 shadow-none">
          <Card.Body className="p-3 small">
            <div className="d-flex justify-content-between mb-2">
              <span className="text-muted">Mã chỉ số:</span>
              <strong className="text-dark font-monospace">{criterion.criterionCode}</strong>
            </div>
            <div className="d-flex justify-content-between mb-2">
              <span className="text-muted">Tên chỉ số:</span>
              <strong className="text-dark">{criterion.criterionName}</strong>
            </div>
            <div className="d-flex justify-content-between">
              <span className="text-muted">Chuyên khoa:</span>
              <Badge bg="secondary">{criterion.category}</Badge>
            </div>
          </Card.Body>
        </Card>

        <Alert variant="warning" className="small mb-0 d-flex align-items-start gap-2">
          <FaShieldAlt className="mt-1 flex-shrink-0 text-warning" />
          <div>
            <strong>Lưu ý bảo mật y tế:</strong> Chỉ số sẽ chuyển sang trạng thái <em>Ngưng Hoạt Động (Inactive)</em> và không xuất hiện khi chỉ định mới. Toàn bộ kết quả xét nghiệm lịch sử của bệnh nhân vẫn được bảo toàn nguyên vẹn 100%.
          </div>
        </Alert>
      </Modal.Body>

      <Modal.Footer className="bg-light py-2 px-4 border-top">
        <Button variant="secondary" size="sm" onClick={onClose} disabled={isSubmitting}>
          <FaTimes className="me-1" /> Hủy Bỏ
        </Button>
        <Button variant="danger" size="sm" onClick={handleConfirm} disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Spinner size="sm" className="me-2" /> Đang Xử Lý...
            </>
          ) : (
            'Xác Nhận Ngưng Sử Dụng'
          )}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
