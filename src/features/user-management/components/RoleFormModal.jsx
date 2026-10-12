/**
 * @file RoleFormModal.jsx
 * @description Modal dialog for Creating and Editing RBAC Roles with granular permission matrix (UC13).
 * Features: 800px modal layout, category-based permission accordion, group "Select All", and indeterminate states.
 * Conforms to: NIST RBAC Standard & AGENTS-DESIGN.md Rules 01-28.
 */

import React, { useState, useEffect } from 'react';
import { Modal, Button, Form, Row, Col, Alert, Spinner, Badge } from 'react-bootstrap';
import { createRole, updateRole } from '../../../services/roleService';

export const RoleFormModal = ({
  show,
  onHide,
  roleToEdit = null,
  permissionMatrix = {},
  onSaved,
}) => {
  const isEditing = Boolean(roleToEdit);

  const [roleCode, setRoleCode] = useState('');
  const [roleName, setRoleName] = useState('');
  const [description, setDescription] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [selectedPermissions, setSelectedPermissions] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (show) {
      if (roleToEdit) {
        setRoleCode(roleToEdit.roleCode || '');
        setRoleName(roleToEdit.roleName || '');
        setDescription(roleToEdit.description || '');
        setIsActive(roleToEdit.isActive !== false);
        setSelectedPermissions(roleToEdit.permissions || []);
      } else {
        setRoleCode('');
        setRoleName('');
        setDescription('');
        setIsActive(true);
        setSelectedPermissions([]);
      }
      setErrorMessage('');
    }
  }, [show, roleToEdit]);

  const handleTogglePermission = (permCode) => {
    setSelectedPermissions((prev) =>
      prev.includes(permCode) ? prev.filter((p) => p !== permCode) : [...prev, permCode]
    );
  };

  const handleToggleGroup = (groupPermissions) => {
    const allSelected = groupPermissions.every((p) => selectedPermissions.includes(p));
    if (allSelected) {
      setSelectedPermissions((prev) => prev.filter((p) => !groupPermissions.includes(p)));
    } else {
      const merged = new Set([...selectedPermissions, ...groupPermissions]);
      setSelectedPermissions(Array.from(merged));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!roleName.trim()) {
      setErrorMessage('Please enter a Role Name.');
      return;
    }
    if (!isEditing && !roleCode.trim()) {
      setErrorMessage('Please enter a Role Code (e.g. QC_OFFICER).');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      if (isEditing) {
        const result = await updateRole(roleToEdit.id, {
          roleName: roleName.trim(),
          description: description.trim(),
          permissions: selectedPermissions,
          isActive,
        });
        if (result.isSuccess) {
          onSaved?.();
          onHide();
        } else {
          setErrorMessage(result.message || 'Failed to update role.');
        }
      } else {
        const result = await createRole({
          roleCode: roleCode.trim().toUpperCase(),
          roleName: roleName.trim(),
          description: description.trim(),
          permissions: selectedPermissions,
          isActive,
        });
        if (result.isSuccess) {
          onSaved?.();
          onHide();
        } else {
          setErrorMessage(result.message || 'Failed to create role.');
        }
      }
    } catch (err) {
      setErrorMessage('A network error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal show={show} onHide={onHide} size="lg" centered backdrop="static">
      <Modal.Header closeButton style={{ background: '#1e40af', color: '#ffffff' }}>
        <Modal.Title className="h5 fw-bold m-0">
          <i className={`bi ${isEditing ? 'bi-pencil-square' : 'bi-shield-plus'} me-2`}></i>
          {isEditing ? `Edit Role: ${roleToEdit.roleCode}` : 'Create New System Role'}
        </Modal.Title>
      </Modal.Header>

      <Form onSubmit={handleSubmit}>
        <Modal.Body className="p-4">
          {errorMessage && (
            <Alert variant="danger" className="py-2 small">
              <i className="bi bi-exclamation-triangle-fill me-2"></i>
              {errorMessage}
            </Alert>
          )}

          <Row className="g-3 mb-4">
            <Col md={6}>
              <Form.Group>
                <Form.Label className="fw-semibold small text-secondary">
                  Role Code <span className="text-danger">*</span>
                </Form.Label>
                <Form.Control
                  type="text"
                  placeholder="e.g. QC_OFFICER"
                  value={roleCode}
                  onChange={(e) => setRoleCode(e.target.value.toUpperCase())}
                  disabled={isEditing || isSubmitting}
                  required
                />
                <Form.Text className="text-muted small">
                  Uppercase alphanumeric identifier (immutable after creation).
                </Form.Text>
              </Form.Group>
            </Col>

            <Col md={6}>
              <Form.Group>
                <Form.Label className="fw-semibold small text-secondary">
                  Role Display Name <span className="text-danger">*</span>
                </Form.Label>
                <Form.Control
                  type="text"
                  placeholder="e.g. KTV Trưởng Quản Lý QC"
                  value={roleName}
                  onChange={(e) => setRoleName(e.target.value)}
                  disabled={isSubmitting}
                  required
                />
              </Form.Group>
            </Col>

            <Col xs={12}>
              <Form.Group>
                <Form.Label className="fw-semibold small text-secondary">Role Description</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={2}
                  placeholder="Describe the clinical and operational responsibilities..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  disabled={isSubmitting}
                />
              </Form.Group>
            </Col>

            <Col xs={12}>
              <Form.Check
                type="switch"
                id="role-active-switch"
                label={<strong>Active in System</strong>}
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                disabled={isSubmitting}
              />
            </Col>
          </Row>

          <hr className="my-3 text-muted" />

          {/* Granular Permissions Matrix */}
          <div>
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h6 className="fw-bold m-0 text-dark">
                <i className="bi bi-grid-3x3-gap-fill me-2 text-primary"></i>
                Granted Permission Matrix
              </h6>
              <Badge bg="primary" className="px-3 py-2">
                {selectedPermissions.length} Permissions Selected
              </Badge>
            </div>

            <div className="border rounded-3 p-3 bg-light">
              {Object.entries(permissionMatrix).map(([groupName, perms]) => {
                const groupSelectedCount = perms.filter((p) => selectedPermissions.includes(p)).length;
                const isAllSelected = groupSelectedCount === perms.length;

                return (
                  <div key={groupName} className="mb-3 pb-3 border-bottom last-no-border">
                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <Form.Check
                        type="checkbox"
                        id={`group-${groupName}`}
                        label={<span className="fw-bold text-dark">{groupName}</span>}
                        checked={isAllSelected}
                        onChange={() => handleToggleGroup(perms)}
                      />
                      <small className="text-muted">
                        {groupSelectedCount}/{perms.length} granted
                      </small>
                    </div>

                    <div className="d-flex flex-wrap gap-3 ps-4">
                      {perms.map((perm) => (
                        <Form.Check
                          key={perm}
                          type="checkbox"
                          id={`perm-${perm}`}
                          label={<span className="small font-monospace">{perm}</span>}
                          checked={selectedPermissions.includes(perm)}
                          onChange={() => handleTogglePermission(perm)}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </Modal.Body>

        <Modal.Footer className="bg-light">
          <Button variant="secondary" onClick={onHide} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" disabled={isSubmitting} className="text-white">
            {isSubmitting ? (
              <>
                <Spinner animation="border" size="sm" className="me-2" />
                Saving...
              </>
            ) : (
              'Save Role'
            )}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
};

export default RoleFormModal;
