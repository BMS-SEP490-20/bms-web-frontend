/**
 * @file RolesManagementPage.jsx
 * @description Administration dashboard for RBAC Roles & Permissions management (UC13).
 * Features: Luxury Header Card, standalone flat table section (Zero table-in-card),
 * KPI quad metrics, unified search capsule, status filter, user association count,
 * permission matrix modal, and delete safety confirmation.
 * Conforms to: NIST RBAC Standard, ISO 15189:2022, & AGENTS-DESIGN.md.
 * @module features/user-management/pages/RolesManagementPage
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Table, Button, Form, Badge, Spinner, Alert, Pagination, Row, Col } from 'react-bootstrap';
import {
  FaShieldAlt,
  FaPlus,
  FaSearch,
  FaLock,
  FaPencilAlt,
  FaTrash,
  FaTimes,
  FaUsers,
  FaKey,
  FaUserCheck,
  FaCheckCircle
} from 'react-icons/fa';
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

  // KPI Metrics
  const activeRolesCount = useMemo(() => safeRoles.filter((r) => r.isActive).length, [safeRoles]);
  const systemRolesCount = useMemo(() => safeRoles.filter((r) => r.isSystemRole).length, [safeRoles]);
  const totalPermissionsAssigned = useMemo(() => {
    return safeRoles.reduce((acc, r) => acc + (Array.isArray(r.permissions) ? r.permissions.length : 0), 0);
  }, [safeRoles]);

  return (
    <div className="w-100 py-1">
      {/* 1. Master Luxury Page Header Card */}
      <div className="bms-page-header-card">
        <div className="bms-page-header-content">
          <div className="bms-page-chip">
            <FaShieldAlt size={12} />
            <span>QUẢN TRỊ HỆ THỐNG · PHÂN QUYỀN RBAC (ISO 15189)</span>
          </div>
          <div className="bms-page-title-row">
            <span className="bms-page-title-icon">
              <FaShieldAlt size={22} />
            </span>
            <h1 className="bms-page-title">
              Quản Lý Phân Quyền Vai Trò (RBAC)
            </h1>
          </div>
          <p className="bms-page-subtitle">
            Ma trận phân quyền truy cập theo vai trò dành cho nhân sự y tế và quản trị hệ thống BMS (BR-IAM-02).
          </p>
        </div>
        <div className="bms-page-actions">
          <Button
            variant="primary"
            onClick={handleOpenCreateModal}
            className="d-flex align-items-center gap-2 shadow-sm fw-semibold px-4 py-2"
            style={{
              borderRadius: 9999,
              background: '#1E60E6',
              borderColor: '#1E60E6',
              boxShadow: '0 4px 14px rgba(30, 96, 230, 0.25)',
              fontSize: '14px'
            }}
          >
            <FaPlus size={13} />
            <span>Thêm Vai Trò Mới</span>
          </Button>
        </div>
      </div>

      {/* Error alert */}
      {errorMessage && (
        <Alert variant="danger" dismissible onClose={() => setErrorMessage('')} className="mb-4 shadow-sm" style={{ borderRadius: 14 }}>
          {errorMessage}
        </Alert>
      )}

      {/* 2. KPI Summary Row */}
      <Row className="g-3 mb-4">
        <Col xs={12} sm={6} md={3}>
          <div className="bms-kpi-quad-card">
            <div>
              <h6 className="bms-kpi-label">Tổng Số Vai Trò</h6>
              <div className="bms-kpi-value">{totalCount || safeRoles.length}</div>
              <div className="bms-kpi-sub text-muted">Toàn hệ sinh thái BMS</div>
            </div>
            <div className="bms-kpi-icon-badge bms-kpi-icon-blue">
              <FaShieldAlt />
            </div>
          </div>
        </Col>
        <Col xs={12} sm={6} md={3}>
          <div className="bms-kpi-quad-card">
            <div>
              <h6 className="bms-kpi-label">Đang Hoạt Động</h6>
              <div className="bms-kpi-value text-success">{activeRolesCount}</div>
              <div className="bms-kpi-sub text-success">Đang gán cho nhân sự</div>
            </div>
            <div className="bms-kpi-icon-badge bms-kpi-icon-green">
              <FaCheckCircle />
            </div>
          </div>
        </Col>
        <Col xs={12} sm={6} md={3}>
          <div className="bms-kpi-quad-card">
            <div>
              <h6 className="bms-kpi-label">Vai Trò Cốt Lõi</h6>
              <div className="bms-kpi-value text-primary">{systemRolesCount}</div>
              <div className="bms-kpi-sub text-muted">Bảo vệ an ninh hệ thống</div>
            </div>
            <div className="bms-kpi-icon-badge bms-kpi-icon-rose">
              <FaLock />
            </div>
          </div>
        </Col>
        <Col xs={12} sm={6} md={3}>
          <div className="bms-kpi-quad-card">
            <div>
              <h6 className="bms-kpi-label">Tổng Quyền Hạn Đã Gán</h6>
              <div className="bms-kpi-value">{totalPermissionsAssigned}</div>
              <div className="bms-kpi-sub text-muted">Ma trận đặc quyền truy cập</div>
            </div>
            <div className="bms-kpi-icon-badge bms-kpi-icon-purple">
              <FaKey />
            </div>
          </div>
        </Col>
      </Row>

      {/* 3. Standalone Independent Table Section (ZERO TABLE IN CARDS) */}
      <div className="bms-table-standalone-section">
        {/* Header Toolbar */}
        <div className="bms-table-standalone-header">
          <div>
            <h5 className="bms-table-standalone-title">
              <FaShieldAlt style={{ color: '#1E60E6' }} />
              Ma Trận Phân Quyền Vai Trò Người Dùng
            </h5>
            <p className="bms-table-standalone-subtitle">
              Hiển thị {safeRoles.length} trên tổng số {totalCount || safeRoles.length} vai trò hệ thống
            </p>
          </div>

          <div className="d-flex flex-wrap align-items-center gap-3" style={{ minWidth: '320px', maxWidth: '600px', flex: 1, justifyContent: 'flex-end' }}>
            {/* Unified Search Capsule */}
            <div className="bms-search-input-pill" style={{ maxWidth: '320px' }}>
              <FaSearch className="bms-search-icon" />
              <input
                type="text"
                placeholder="Tìm theo mã hoặc tên vai trò..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              {searchTerm && (
                <button
                  type="button"
                  className="bms-search-clear"
                  onClick={() => setSearchTerm('')}
                  title="Xóa tìm kiếm"
                >
                  <FaTimes />
                </button>
              )}
            </div>

            {/* Status Filter Dropdown */}
            <Form.Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{
                width: 'auto',
                minWidth: '170px',
                height: '40px',
                borderRadius: '9999px',
                border: '1px solid #CBD5E1',
                padding: '0 16px',
                fontSize: '13px',
                background: '#FFFFFF'
              }}
            >
              <option value="">-- Tất Cả Trạng Thái --</option>
              <option value="true">Đang Hoạt Động</option>
              <option value="false">Tạm Khóa</option>
            </Form.Select>
          </div>
        </div>

        {/* Data Table */}
        <div className="bms-table-standalone-body">
          <div className="table-responsive">
            <Table hover className="align-middle mb-0">
              <thead>
                <tr>
                  <th className="text-center" style={{ width: '160px' }}>Mã Vai Trò</th>
                  <th>Tên Vai Trò</th>
                  <th>Mô Tả Chức Năng</th>
                  <th className="text-center" style={{ width: '140px' }}>Quyền Hạn</th>
                  <th className="text-end" style={{ width: '130px' }}>Nhân Sự</th>
                  <th className="text-center" style={{ width: '150px' }}>Trạng Thái</th>
                  <th className="text-end pe-4" style={{ width: '130px' }}>Thao Tác</th>
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
                      <td className="text-center">
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
                      <td className="text-center">
                        <span style={{ display: 'inline-block', padding: '3px 10px', borderRadius: 9999, background: 'rgba(30, 96, 230, 0.1)', color: '#1E60E6', fontWeight: 600, fontSize: 12, fontVariantNumeric: 'tabular-nums' }}>
                          {Array.isArray(role.permissions) ? role.permissions.length : 0} Quyền
                        </span>
                      </td>
                      <td className="text-end fw-semibold" style={{ fontVariantNumeric: 'tabular-nums' }}>
                        {role.userCount || 0}
                      </td>
                      <td className="text-center">
                        <span className={`bms-status-pill ${role.isActive ? 'active' : 'inactive'}`}>
                          <span
                            className={`p-1 rounded-circle d-inline-block me-1 ${role.isActive ? 'bg-success' : 'bg-secondary'}`}
                            style={{ width: 6, height: 6 }}
                          ></span>
                          {role.isActive ? 'Đang Hoạt Động' : 'Tạm Khóa'}
                        </span>
                      </td>
                      <td className="text-end pe-4">
                        <div className="d-flex justify-content-end gap-1">
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
        </div>

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="p-3 border-top d-flex justify-content-between align-items-center bg-white">
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
