/**
 * @file DeleteRoleConfirmModal.jsx
 * @description Safety confirmation dialog for deactivating or deleting an RBAC role (UC13).
 * Enforces business rules BR-ROLE-01 & BR-ROLE-02.
 */

import React, { useState } from 'react';
import { Modal, Button, Alert, Spinner } from 'react-bootstrap';
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
      if (result.isSuccess) {
        onDeleted?.();
        onHide();
      } else {
        setErrorMessage(result.message || 'Failed to remove role.');
      }
    } catch (err) {
      setErrorMessage('Network connection error.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Modal show={show} onHide={onHide} centered backdrop="static">
      <Modal.Header closeButton className="bg-danger text-white">
        <Modal.Title className="h5 fw-bold m-0">
          <i className="bi bi-shield-x me-2"></i>
          Delete System Role Confirmation
        </Modal.Title>
      </Modal.Header>

      <Modal.Body className="p-4">
        {errorMessage && (
          <Alert variant="danger" className="py-2 small mb-3">
            <i className="bi bi-exclamation-triangle-fill me-2"></i>
            {errorMessage}
          </Alert>
        )}

        {isSystemRole ? (
          <Alert variant="warning" className="small mb-3">
            <h6 className="fw-bold mb-1">
              <i className="bi bi-lock-fill me-2 text-warning"></i>
              System Role Protected (BR-ROLE-01)
            </h6>
            <strong>{roleToDelete.roleCode}</strong> is an immutable core system role. Core roles cannot be deleted to guarantee system stability and security policies.
          </Alert>
        ) : hasUsers ? (
          <Alert variant="warning" className="small mb-3">
            <h6 className="fw-bold mb-1">
              <i className="bi bi-people-fill me-2 text-warning"></i>
              Active Personnel Assigned (BR-ROLE-02)
            </h6>
            This role is currently assigned to <strong>{roleToDelete.userCount} active employee(s)</strong>. Please reassign those accounts before attempting removal.
          </Alert>
        ) : (
          <p className="mb-3 text-secondary">
            Are you sure you want to permanently delete custom role{' '}
            <strong className="text-dark">{roleToDelete.roleName} ({roleToDelete.roleCode})</strong>? This action cannot be undone.
          </p>
        )}
      </Modal.Body>

      <Modal.Footer className="bg-light">
        <Button variant="secondary" onClick={onHide} disabled={isDeleting}>
          Cancel
        </Button>
        <Button
          variant="danger"
          onClick={handleConfirmDelete}
          disabled={isBlocked || isDeleting}
        >
          {isDeleting ? (
            <>
              <Spinner animation="border" size="sm" className="me-2" />
              Deleting...
            </>
          ) : (
            'Confirm Delete'
          )}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default DeleteRoleConfirmModal;
