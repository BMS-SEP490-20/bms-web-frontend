/**
 * @file RolesManagementPage.jsx
 * @description Administration dashboard for RBAC Roles & Permissions management (UC13).
 * Features: Debounced search, status filter, professional data table, user association count,
 * permission matrix modal, and delete safety confirmation.
 * Conforms to: NIST RBAC Standard & AGENTS-DESIGN.md Rules 01-28.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Table, Button, Form, InputGroup, Badge, Spinner, Alert, Pagination } from 'react-bootstrap';
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
      if (res.isSuccess && res.data) {
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

      if (res.isSuccess && res.data) {
        setRoles(res.data.items || []);
        setTotalCount(res.data.totalCount || 0);
      } else {
        setErrorMessage(res.message || 'Unable to load roles.');
      }
    } catch (err) {
      setErrorMessage('Connection error while fetching roles.');
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

  const totalPages = Math.ceil(totalCount / pageSize) || 1;

  return (
    <div className="bms-roles-page">
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center bms-roles-header">
        <div>
          <h4 className="fw-bold m-0 text-dark">
            <i className="bi bi-shield-lock-fill text-primary me-2"></i>
            Quản Lý Phân Quyền Vai Trò (RBAC)
          </h4>
          <small className="text-muted">
            Ma trận phân quyền truy cập theo vai trò dành cho nhân sự y tế và quản trị hệ thống BMS (BR-IAM-02)
          </small>
        </div>
        <Button variant="primary" onClick={handleOpenCreateModal} className="text-white fw-semibold">
          <i className="bi bi-plus-circle-fill me-2"></i>
          Thêm Vai Trò Mới
        </Button>
      </div>

      {errorMessage && (
        <Alert variant="danger" dismissible onClose={() => setErrorMessage('')} className="mb-4">
          <i className="bi bi-exclamation-triangle-fill me-2"></i>
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
                <InputGroup.Text className="bg-white border-end-0">
                  <i className="bi bi-search text-muted"></i>
                </InputGroup.Text>
                <Form.Control
                  type="text"
                  placeholder="Tìm theo mã hoặc tên vai trò..."
                  className="border-start-0"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </InputGroup>
            </div>

            <div className="col-6 col-md-3">
              <Form.Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="">Tất Cả Trạng Thái</option>
                <option value="true">Đang Hoạt Động</option>
                <option value="false">Tạm Khóa</option>
              </Form.Select>
            </div>

            <div className="col-6 col-md-4 text-end text-muted small">
              Hiển thị <strong>{roles.length}</strong> trên tổng số <strong>{totalCount}</strong> vai trò
            </div>
          </div>
        </div>

        {/* Data Table */}
        <div className="table-responsive">
          <Table hover className="bms-roles-table m-0">
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
                    Đang tải danh sách vai trò...
                  </td>
                </tr>
              ) : roles.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center py-5 text-muted">
                    <i className="bi bi-inbox fs-2 d-block mb-2 text-muted"></i>
                    Không tìm thấy vai trò nào phù hợp với bộ lọc tìm kiếm.
                  </td>
                </tr>
              ) : (
                roles.map((role) => (
                  <tr key={role.id}>
                    <td className="bms-align-center">
                      <span className="bms-role-code-cell">{role.roleCode}</span>
                    </td>
                    <td>
                      <div className="fw-bold text-dark">{role.roleName}</div>
                      {role.isSystemRole && (
                        <Badge bg="info" className="small me-1 text-dark" style={{ fontSize: '10px' }}>
                          <i className="bi bi-lock-fill me-1"></i>Hệ Thống Cốt Lõi
                        </Badge>
                      )}
                    </td>
                    <td className="text-muted small">
                      {role.description || 'Không có mô tả chi tiết.'}
                    </td>
                    <td className="bms-align-center">
                      <Badge bg="secondary" className="px-2 py-1">
                        {role.permissions?.length || 0} Quyền
                      </Badge>
                    </td>
                    <td className="bms-align-right fw-semibold">
                      {role.userCount || 0}
                    </td>
                    <td className="bms-align-center">
                      <span className={`bms-status-pill ${role.isActive ? 'active' : 'inactive'}`}>
                        <i className="bi bi-circle-fill" style={{ fontSize: '7px' }}></i>
                        {role.isActive ? 'Hoạt Động' : 'Tạm Khóa'}
                      </span>
                    </td>
                    <td className="bms-align-right">
                      <div className="bms-action-btn-group">
                        <Button
                          variant="outline-primary"
                          size="sm"
                          title="Chỉnh sửa vai trò & phân quyền"
                          onClick={() => handleOpenEditModal(role)}
                        >
                          <i className="bi bi-pencil"></i>
                        </Button>
                        <Button
                          variant="outline-danger"
                          size="sm"
                          title={role.isSystemRole ? 'Vai trò hệ thống không được xóa' : 'Xóa vai trò'}
                          onClick={() => handleOpenDeleteModal(role)}
                          disabled={role.isSystemRole}
                        >
                          <i className="bi bi-trash"></i>
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
              Page {currentPage} of {totalPages}
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
