/**
 * @file DeleteRoleConfirmModal.jsx
 * @description Safety confirmation dialog for deactivating or deleting an RBAC role (UC13).
 * Enforces business rules BR-ROLE-01 & BR-ROLE-02.
 * Conforms to: Production Medical Standards, NIST RBAC & Clean Architecture.
 * @module features/user-management/components/DeleteRoleConfirmModal
 */

import React, { useState } from 'react';
import { Modal, Button, Alert, Spinner } from 'react-bootstrap';
import { FaShieldAlt, FaLock, FaUsers, FaTrash, FaTimes } from 'react-icons/fa';
import { deleteRole } from '../../../services/roleService';

export const DeleteRoleConfirmModal = ({
  show,
  onHide,
  roleToDelete,
  onDeleted,
}) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  if (!roleToDelete) return null;

  const isSystemRole = Boolean(roleToDelete.isSystemRole);
  const hasUsers = (roleToDelete.userCount || 0) > 0;
  const isBlocked = isSystemRole || hasUsers;

  const handleConfirmDelete = async () => {
    if (isBlocked) return;

    setIsDeleting(true);
    setErrorMessage('');

    try {
      const result = await deleteRole(roleToDelete.id);
      if (result && result.isSuccess) {
        onDeleted?.();
        onHide();
      } else {
        setErrorMessage(result?.message || 'Không thể xóa vai trò. Vui lòng thử lại.');
      }
    } catch (err) {
      console.error('[DeleteRoleConfirmModal] Delete role error:', err);
      setErrorMessage('Lỗi kết nối máy chủ dịch vụ quản lý phân quyền.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Modal show={show} onHide={onHide} centered backdrop="static">
      <Modal.Header closeButton className="bg-danger text-white">
        <Modal.Title className="h5 fw-bold m-0 d-flex align-items-center gap-2">
          <FaShieldAlt />
          Xác Nhận Xóa Vai Trò Hệ Thống (RBAC)
        </Modal.Title>
      </Modal.Header>

      <Modal.Body className="p-2">
        {errorMessage && (
          <Alert variant="danger" className="py-2 small mb-3 shadow-sm">
            {errorMessage}
          </Alert>
        )}

        {isSystemRole ? (
          <Alert variant="warning" className="small mb-3 border-warning">
            <h6 className="fw-bold mb-1 d-flex align-items-center gap-2">
              <FaLock className="text-warning" />
              Vai Trò Hệ Thống Cốt Lõi (BR-ROLE-01)
            </h6>
            Mã vai trò <strong>{roleToDelete.roleCode}</strong> là vai trò mặc định của hệ thống y tế. Nhằm đảm bảo an toàn vận hành và quy chuẩn phân quyền, vai trò này không được phép xóa.
          </Alert>
        ) : hasUsers ? (
          <Alert variant="warning" className="small mb-3 border-warning">
            <h6 className="fw-bold mb-1 d-flex align-items-center gap-2">
              <FaUsers className="text-warning" />
              Đang Có Nhân Sự Được Phân Quyền (BR-ROLE-02)
            </h6>
            Vai trò này hiện đang được gán cho <strong>{roleToDelete.userCount} tài khoản nhân sự</strong>. Quý quản trị viên vui lòng điều chuyển phân quyền cho các tài khoản trên trước khi xóa.
          </Alert>
        ) : (
          <p className="mb-3 text-secondary">
            Bạn có chắc chắn muốn xóa vĩnh viễn vai trò tùy chỉnh{' '}
            <strong className="text-dark">{roleToDelete.roleName} ({roleToDelete.roleCode})</strong> khỏi hệ thống? Thao tác này không thể hoàn tác.
          </p>
        )}
      </Modal.Body>

      <Modal.Footer className="bg-light">
        <Button variant="secondary" onClick={onHide} disabled={isDeleting}>
          Hủy Bỏ
        </Button>
        <Button
          variant="danger"
          onClick={handleConfirmDelete}
          disabled={isBlocked || isDeleting}
          className="fw-semibold"
        >
          {isDeleting ? (
            <>
              <Spinner animation="border" size="sm" className="me-2" />
              Đang Xóa...
            </>
          ) : (
            'Xác Nhận Xóa'
          )}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default DeleteRoleConfirmModal;
