/**
 * @file RolesManagementPage.jsx
 * @description Administration dashboard for RBAC Roles & Permissions management (UC13).
 * Features: Debounced search, status filter, professional data table, user association count,
 * permission matrix modal, and delete safety confirmation.
 * Conforms to: NIST RBAC Standard & AGENTS-DESIGN.md Rules 01-28.
 * @module features/user-management/pages/RolesManagementPage
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Table, Button, Form, InputGroup, Badge, Spinner, Alert, Pagination } from 'react-bootstrap';
import { FaShieldAlt, FaPlus, FaSearch, FaLock, FaPencilAlt, FaTrash, FaCheckCircle, FaTimesCircle } from 'react-icons/fa';
import { getRoles, getPermissionMatrix } from '../../../services/roleService';
import RoleFormModal from '../components/RoleFormModal';
import DeleteRoleConfirmModal from '../components/DeleteRoleConfirmModal';
import './RolesManagementPage.css';

export const RolesManagementPage = () => {
  const [roles, setRoles] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  // Modals state
  const [permissionMatrix, setPermissionMatrix] = useState({});
  const [showFormModal, setShowFormModal] = useState(false);
  const [roleToEdit, setRoleToEdit] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [roleToDelete, setRoleToDelete] = useState(null);

  // Load permission matrix once
  useEffect(() => {
    getPermissionMatrix().then((res) => {
      if (res && res.isSuccess && res.data) {
        setPermissionMatrix(res.data);
      }
    });
  }, []);

  // Fetch paginated roles
  const loadRoles = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage('');
    try {
      const res = await getRoles({
        page: currentPage,
        pageSize,
        search: searchTerm,
        isActive: statusFilter,
      });

      if (res && res.isSuccess && res.data) {
        const rawItems = Array.isArray(res.data)
          ? res.data
          : (Array.isArray(res.data.items)
              ? res.data.items
              : (Array.isArray(res.data.data) ? res.data.data : []));
        setRoles(rawItems);
        setTotalCount(res.data.totalCount ?? rawItems.length);
      } else {
        setErrorMessage(res?.message || 'Không thể tải danh sách vai trò.');
        setRoles([]);
      }
    } catch (err) {
      console.error('[RolesManagementPage] Error loading roles:', err);
      setErrorMessage('Lỗi kết nối máy chủ khi tải danh sách phân quyền vai trò.');
      setRoles([]);
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, pageSize, searchTerm, statusFilter]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      loadRoles();
    }, 300);
    return () => clearTimeout(timer);
  }, [loadRoles]);

  const handleOpenCreateModal = () => {
    setRoleToEdit(null);
    setShowFormModal(true);
  };

  const handleOpenEditModal = (role) => {
    setRoleToEdit(role);
    setShowFormModal(true);
  };

  const handleOpenDeleteModal = (role) => {
    setRoleToDelete(role);
    setShowDeleteModal(true);
  };

  const safeRoles = useMemo(() => (Array.isArray(roles) ? roles : []), [roles]);
  const totalPages = Math.ceil(totalCount / pageSize) || 1;

  return (
    <div className="bms-roles-page">
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center bms-roles-header">
        <div>
          <h4 className="fw-bold m-0 text-dark d-flex align-items-center gap-2">
            <FaShieldAlt style={{ color: '#1E60E6' }} />
            Quản Lý Phân Quyền Vai Trò (RBAC)
          </h4>
          <small className="text-muted">
            Ma trận phân quyền truy cập theo vai trò dành cho nhân sự y tế và quản trị hệ thống BMS (BR-IAM-02)
          </small>
        </div>
        <Button variant="primary" onClick={handleOpenCreateModal} className="text-white fw-semibold d-flex align-items-center gap-2 shadow-sm" style={{ borderRadius: 9999, background: '#1E60E6', borderColor: '#1E60E6', boxShadow: '0 4px 14px rgba(94, 133, 230, 0.25)' }}>
          <FaPlus />
          Thêm Vai Trò Mới
        </Button>
      </div>

      {errorMessage && (
        <Alert variant="danger" dismissible onClose={() => setErrorMessage('')} className="mb-4 shadow-sm" style={{ borderRadius: 14 }}>
          {errorMessage}
        </Alert>
      )}

      {/* Main Card */}
      <div className="bms-roles-card">
        {/* Toolbar */}
        <div className="bms-table-toolbar">
          <div className="row g-3 align-items-center">
            <div className="col-12 col-md-5">
              <InputGroup>
                <InputGroup.Text className="border-end-0" style={{ background: '#EEF2F6', borderColor: 'rgba(15, 23, 42, 0.05)' }}>
                  <FaSearch className="text-muted" />
                </InputGroup.Text>
                <Form.Control
                  type="text"
                  placeholder="Tìm theo mã hoặc tên vai trò..."
                  className="border-start-0"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{ background: '#EEF2F6', borderColor: 'rgba(15, 23, 42, 0.05)', borderRadius: '0 10px 10px 0' }}
                />
              </InputGroup>
            </div>

            <div className="col-6 col-md-3">
              <Form.Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                style={{ background: '#EEF2F6', borderColor: 'rgba(15, 23, 42, 0.05)', borderRadius: 10 }}
              >
                <option value="">-- Tất Cả Trạng Thái --</option>
                <option value="true">Đang Hoạt Động</option>
                <option value="false">Tạm Khóa</option>
              </Form.Select>
            </div>

            <div className="col-6 col-md-4 text-end text-muted small" style={{ fontVariantNumeric: 'tabular-nums' }}>
              Hiển thị <strong>{safeRoles.length}</strong> trên tổng số <strong>{totalCount}</strong> vai trò
            </div>
          </div>
        </div>

        {/* Data Table */}
        <div className="table-responsive">
          <Table hover className="bms-roles-table m-0 align-middle">
            <thead>
              <tr>
                <th className="bms-align-center" style={{ width: '160px' }}>Mã Vai Trò</th>
                <th>Tên Vai Trò</th>
                <th>Mô Tả Chức Năng</th>
                <th className="bms-align-center" style={{ width: '140px' }}>Quyền Hạn</th>
                <th className="bms-align-right" style={{ width: '130px' }}>Nhân Sự</th>
                <th className="bms-align-center" style={{ width: '140px' }}>Trạng Thái</th>
                <th className="bms-align-right" style={{ width: '130px' }}>Thao Tác</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan="7" className="text-center py-5">
                    <Spinner animation="border" variant="primary" size="sm" className="me-2" />
                    Đang tải danh sách vai trò hệ thống...
                  </td>
                </tr>
              ) : safeRoles.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center py-5 text-muted">
                    <FaShieldAlt className="fs-2 d-block mb-2 text-muted mx-auto opacity-50" style={{ color: '#1E60E6' }} />
                    Không tìm thấy vai trò nào phù hợp với bộ lọc tìm kiếm.
                  </td>
                </tr>
              ) : (
                safeRoles.map((role) => (
                  <tr key={role.id}>
                    <td className="bms-align-center">
                      <span className="bms-role-code-cell">{role.roleCode}</span>
                    </td>
                    <td>
                      <div className="fw-bold" style={{ color: '#0f2743' }}>{role.roleName}</div>
                      {role.isSystemRole && (
                        <Badge bg="info" className="small me-1 text-dark" style={{ fontSize: '10px', borderRadius: 9999 }}>
                          <FaLock className="me-1" />Hệ Thống Cốt Lõi
                        </Badge>
                      )}
                    </td>
                    <td className="text-muted small">
                      {role.description || 'Không có mô tả chi tiết chức năng.'}
                    </td>
                    <td className="bms-align-center">
                      <span style={{ display: 'inline-block', padding: '3px 10px', borderRadius: 9999, background: 'rgba(94, 133, 230, 0.1)', color: '#1E60E6', fontWeight: 600, fontSize: 12, fontVariantNumeric: 'tabular-nums' }}>
                        {Array.isArray(role.permissions) ? role.permissions.length : 0} Quyền
                      </span>
                    </td>
                    <td className="bms-align-right fw-semibold" style={{ fontVariantNumeric: 'tabular-nums' }}>
                      {role.userCount || 0}
                    </td>
                    <td className="bms-align-center">
                      <span className={`bms-status-pill ${role.isActive ? 'active' : 'inactive'}`}>
                        {role.isActive ? (
                          <span className="p-1 rounded-circle bg-success d-inline-block me-1" style={{ width: 6, height: 6 }}></span>
                        ) : (
                          <span className="p-1 rounded-circle bg-secondary d-inline-block me-1" style={{ width: 6, height: 6 }}></span>
                        )}
                        {role.isActive ? 'Đang Hoạt Động' : 'Tạm Khóa'}
                      </span>
                    </td>
                    <td className="bms-align-right">
                      <div className="bms-action-btn-group">
                        <Button
                          variant="outline-primary"
                          size="sm"
                          title="Chỉnh sửa vai trò & phân quyền"
                          onClick={() => handleOpenEditModal(role)}
                          style={{ borderRadius: 9999, borderColor: '#1E60E6', color: '#1E60E6' }}
                        >
                          <FaPencilAlt />
                        </Button>
                        <Button
                          variant="outline-danger"
                          size="sm"
                          title={role.isSystemRole ? 'Vai trò hệ thống cốt lõi không được xóa' : 'Xóa vai trò'}
                          onClick={() => handleOpenDeleteModal(role)}
                          disabled={role.isSystemRole}
                          style={{ borderRadius: 9999 }}
                        >
                          <FaTrash />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </Table>
        </div>

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="p-3 border-top d-flex justify-content-between align-items-center bg-light">
            <small className="text-muted">
              Trang {currentPage} / {totalPages}
            </small>
            <Pagination className="m-0" size="sm">
              <Pagination.Prev
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              />
              {Array.from({ length: totalPages }).map((_, i) => (
                <Pagination.Item
                  key={i + 1}
                  active={i + 1 === currentPage}
                  onClick={() => setCurrentPage(i + 1)}
                >
                  {i + 1}
                </Pagination.Item>
              ))}
              <Pagination.Next
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              />
            </Pagination>
          </div>
        )}
      </div>

      {/* Form Modal */}
      <RoleFormModal
        show={showFormModal}
        onHide={() => setShowFormModal(false)}
        roleToEdit={roleToEdit}
        permissionMatrix={permissionMatrix}
        onSaved={loadRoles}
      />

      {/* Delete Confirmation Modal */}
      <DeleteRoleConfirmModal
        show={showDeleteModal}
        onHide={() => setShowDeleteModal(false)}
        roleToDelete={roleToDelete}
        onDeleted={loadRoles}
      />
    </div>
  );
};

export default RolesManagementPage;
