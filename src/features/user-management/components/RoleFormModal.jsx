/**
 * @file RoleFormModal.jsx
 * @description Modal dialog for Creating and Editing RBAC Roles with granular permission matrix (UC13).
 * Features: 800px modal layout, category-based permission accordion, group "Select All", and indeterminate states.
 * Conforms to: NIST RBAC Standard & AGENTS-DESIGN.md Rules 01-28.
 * @module features/user-management/components/RoleFormModal
 */

import React, { useState, useEffect } from 'react';
import { Modal, Button, Form, Row, Col, Alert, Spinner, Badge } from 'react-bootstrap';
import { FaShieldAlt, FaSave, FaCheck, FaTimes } from 'react-icons/fa';
import { createRole, updateRole } from '../../../services/roleService';

// Medical domain translation dictionary for permissions
const PERMISSION_TRANSLATIONS = {
  // Categories
  'Identity & Access Management (IAM)': 'Quản Trị Nhận Dạng & Phân Quyền (IAM)',
  'Reception & Queuing': 'Tiếp Đón & Điều Phối Hàng Đợi',
  'Clinical Examination (EMR)': 'Khám Lâm Sàng & Bệnh Án Điện Tử (EMR)',
  'Laboratory & Testing': 'Xét Nghiệm Y Khoa & Phê Duyệt Kết Quả',
  'Billing & Cashier': 'Viện Phí & Thu Ngân',
  'Inventory & IoT Monitoring': 'Kho Hóa Chất & Giám Sát IoT',

  // Permissions
  'IAM_VIEW': 'Xem danh sách tài khoản & nhân sự',
  'IAM_MANAGE': 'Quản lý cấp phát, khóa & phân quyền tài khoản',
  'RECEPTION_QUEUE': 'Điều phối hàng đợi tiếp đón bệnh nhân',
  'RECEPTION_CHECKIN': 'Tiếp nhận & check-in bệnh nhân',
  'CLINIC_EXAM': 'Khám bệnh & ghi chú hồ sơ lâm sàng',
  'CLINIC_ORDER': 'Chỉ định xét nghiệm & tạo phiếu yêu cầu',
  'LAB_TEST': 'Thực hiện phân tích xét nghiệm & nhập kết quả',
  'LAB_APPROVE': 'Kiểm tra, xác thực & phê duyệt kết quả xét nghiệm',
  'BILLING_POS': 'Lập hóa đơn viện phí & thu tiền tại quầy',
  'BILLING_REFUND': 'Xử lý hoàn trả viện phí & hủy biên lai',
  'INVENTORY_VIEW': 'Tra cứu tồn kho vật tư & hóa chất xét nghiệm',
  'IOT_MONITOR': 'Theo dõi cảm biến nhiệt độ & cảnh báo phòng lab',
};

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
        setSelectedPermissions(Array.isArray(roleToEdit.permissions) ? roleToEdit.permissions : []);
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
      setErrorMessage('Vui lòng nhập tên hiển thị của vai trò.');
      return;
    }
    if (!isEditing && !roleCode.trim()) {
      setErrorMessage('Vui lòng nhập mã vai trò (ví dụ: QC_OFFICER).');
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
        if (result && result.isSuccess) {
          onSaved?.();
          onHide();
        } else {
          setErrorMessage(result?.message || 'Không thể cập nhật vai trò. Vui lòng thử lại.');
        }
      } else {
        const result = await createRole({
          roleCode: roleCode.trim().toUpperCase(),
          roleName: roleName.trim(),
          description: description.trim(),
          permissions: selectedPermissions,
          isActive,
        });
        if (result && result.isSuccess) {
          onSaved?.();
          onHide();
        } else {
          setErrorMessage(result?.message || 'Không thể tạo mới vai trò. Vui lòng kiểm tra lại mã vai trò.');
        }
      }
    } catch (err) {
      console.error('[RoleFormModal] Submit error:', err);
      setErrorMessage('Lỗi kết nối mạng đến máy chủ quản lý phân quyền.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal show={show} onHide={onHide} size="lg" centered backdrop="static">
      <Modal.Header closeButton style={{ background: '#1e40af', color: '#ffffff' }}>
        <Modal.Title className="h5 fw-bold m-0 text-white d-flex align-items-center gap-2">
          <FaShieldAlt />
          {isEditing ? `Cập Nhật Vai Trò: ${roleToEdit.roleCode}` : 'Thêm Mới Vai Trò Hệ Thống (RBAC)'}
        </Modal.Title>
      </Modal.Header>

      <Form onSubmit={handleSubmit}>
        <Modal.Body className="p-2">
          {errorMessage && (
            <Alert variant="danger" className="py-2 small shadow-sm">
              {errorMessage}
            </Alert>
          )}

          <Row className="g-3 mb-4">
            <Col md={6}>
              <Form.Group>
                <Form.Label className="fw-semibold small text-secondary">
                  Mã Vai Trò (Định danh hệ thống) <span className="text-danger">*</span>
                </Form.Label>
                <Form.Control
                  type="text"
                  placeholder="Ví dụ: QC_OFFICER"
                  value={roleCode}
                  onChange={(e) => setRoleCode(e.target.value.toUpperCase())}
                  disabled={isEditing || isSubmitting}
                  required
                />
                <Form.Text className="text-muted small">
                  Mã viết hoa không dấu, không khoảng trắng (bất biến sau khi tạo).
                </Form.Text>
              </Form.Group>
            </Col>

            <Col md={6}>
              <Form.Group>
                <Form.Label className="fw-semibold small text-secondary">
                  Tên Hiển Thị Vai Trò <span className="text-danger">*</span>
                </Form.Label>
                <Form.Control
                  type="text"
                  placeholder="Ví dụ: Kỹ Thuật Viên Trưởng QC"
                  value={roleName}
                  onChange={(e) => setRoleName(e.target.value)}
                  disabled={isSubmitting}
                  required
                />
              </Form.Group>
            </Col>

            <Col xs={12}>
              <Form.Group>
                <Form.Label className="fw-semibold small text-secondary">Mô Tả Chức Trách & Nhiệm Vụ</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={2}
                  placeholder="Mô tả chức trách và phạm vi xử lý chuyên môn trong hệ thống..."
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
                label={<strong className="text-dark">Kích hoạt quyền sử dụng trong hệ thống</strong>}
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
              <h6 className="fw-bold m-0 text-dark d-flex align-items-center gap-2">
                <FaShieldAlt className="text-primary" />
                Ma Trận Phân Quyền Chi Tiết (RBAC Matrix)
              </h6>
              <Badge bg="primary" className="px-3 py-2 fw-semibold">
                {selectedPermissions.length} Quyền Đã Chọn
              </Badge>
            </div>

            <div className="border rounded-3 p-3 bg-light">
              {Object.entries(permissionMatrix).map(([groupName, perms]) => {
                const groupSelectedCount = perms.filter((p) => selectedPermissions.includes(p)).length;
                const isAllSelected = groupSelectedCount === perms.length;
                const vietnameseGroupName = PERMISSION_TRANSLATIONS[groupName] || groupName;

                return (
                  <div key={groupName} className="mb-3 pb-3 border-bottom last-no-border">
                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <Form.Check
                        type="checkbox"
                        id={`group-${groupName}`}
                        label={<span className="fw-bold text-dark">{vietnameseGroupName}</span>}
                        checked={isAllSelected}
                        onChange={() => handleToggleGroup(perms)}
                      />
                      <small className="text-muted">
                        Đã chọn {groupSelectedCount}/{perms.length}
                      </small>
                    </div>

                    <div className="d-flex flex-column gap-2 ps-4">
                      {perms.map((perm) => (
                        <Form.Check
                          key={perm}
                          type="checkbox"
                          id={`perm-${perm}`}
                          label={
                            <span>
                              <span className="fw-semibold text-dark me-2">
                                {PERMISSION_TRANSLATIONS[perm] || perm}
                              </span>
                              <span className="small font-monospace text-muted">
                                ({perm})
                              </span>
                            </span>
                          }
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
            Hủy Bỏ
          </Button>
          <Button variant="primary" type="submit" disabled={isSubmitting} className="text-white fw-semibold">
            {isSubmitting ? (
              <>
                <Spinner animation="border" size="sm" className="me-2" />
                Đang Lưu...
              </>
            ) : (
              'Lưu Cấu Hình Vai Trò'
            )}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
};

export default RoleFormModal;
