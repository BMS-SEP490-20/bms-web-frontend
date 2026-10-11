/**
 * ConfirmDialog Component
 * 
 * Reusable confirmation dialog component for delete/cancel actions.
 * Provides a consistent UI for confirmation dialogs across the application.
 */
import React from 'react';
import { Modal, Button } from 'react-bootstrap';

/**
 * ConfirmDialog Component
 * 
 * @param {boolean} show - Whether to show the dialog
 * @param {function} onHide - Function to call when dialog is hidden
 * @param {function} onConfirm - Function to call when user confirms
 * @param {string} title - Dialog title
 * @param {string} message - Dialog message
 * @param {string} confirmText - Text for confirm button (default: "Xóa")
 * @param {string} cancelText - Text for cancel button (default: "Hủy")
 * @param {string} variant - Variant for confirm button (default: "danger")
 * @param {boolean} isLoading - Whether the action is in progress
 */
const ConfirmDialog = ({
  show,
  onHide,
  onConfirm,
  title = 'Xác nhận xóa',
  message = 'Bạn có chắc chắn muốn thực hiện hành động này?',
  confirmText = 'Xóa',
  cancelText = 'Hủy',
  variant = 'danger',
  isLoading = false,
  confirmDisabled = false
}) => {
  const handleConfirm = () => {
    if (onConfirm) {
      onConfirm();
    }
  };

  return (
    <Modal show={show} onHide={onHide} centered backdrop="static">
      <Modal.Header closeButton className={`bg-${variant} text-white`}>
        <Modal.Title>
          <i className="fas fa-exclamation-triangle me-2"></i>
          {title}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <div className="d-flex align-items-start">
          <i className="fas fa-question-circle text-warning me-3 mt-1" style={{ fontSize: '2rem' }}></i>
          <div className="flex-grow-1">
            <p className="mb-0" style={{ fontSize: '1.1rem' }}>
              {message}
            </p>
            <small className="text-muted d-block mt-2">
              <i className="fas fa-info-circle me-1"></i>
              Hành động này không thể hoàn tác.
            </small>
          </div>
        </div>
      </Modal.Body>
      <Modal.Footer>
        <Button 
          variant="outline-secondary" 
          onClick={onHide}
          disabled={isLoading}
        >
          <i className="fas fa-times me-2"></i>
          {cancelText}
        </Button>
        <Button 
          variant={variant} 
          onClick={handleConfirm}
          disabled={isLoading || confirmDisabled}
        >
          {isLoading ? (
            <>
              <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
              Đang xử lý...
            </>
          ) : (
            <>
              <i className="fas fa-trash me-2"></i>
              {confirmText}
            </>
          )}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default ConfirmDialog;

