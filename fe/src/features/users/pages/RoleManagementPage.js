/**
 * Role Management Component
 * 
 * Role and permission management component for the Blood Laboratory Management System.
 * Provides comprehensive role-based access control configuration including
 * permission assignment and role management functionality.
 * 
 * @author Blood Laboratory Management Team
 * @version 1.0.0
 * @since 2024
 */

import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Table, Form, Alert, Badge, Accordion } from 'react-bootstrap';
// Using Bootstrap Icons instead of FontAwesome
import { roleService } from '../../../services/roleService';
import useResponsive from '../../../shared/hooks/useResponsive';

/**
 * Role Management Component
 * 
 * Manages user roles and permissions with comprehensive access control.
 * Provides role configuration and permission assignment functionality.
 * 
 * @returns {React.ReactNode} Role management component
 */
const RoleManagement = () => {
  const { isMobile, isTablet } = useResponsive();
  const [rolePermissions, setRolePermissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingRole, setEditingRole] = useState(null);
  const [tempPermissions, setTempPermissions] = useState([]);

  // Permission categories
  const permissionCategories = {
    'Quản lý người dùng': [
      { key: 'manage_users', label: 'Quản lý tất cả người dùng' },
      { key: 'manage_lab_users', label: 'Quản lý nhân viên lab' },
      { key: 'manage_doctors', label: 'Quản lý bác sĩ' },
      { key: 'manage_roles', label: 'Quản lý vai trò và quyền hạn' }
    ],
    'Quản lý bệnh nhân': [
      { key: 'manage_patients', label: 'Quản lý bệnh nhân' },
      { key: 'view_patients', label: 'Xem thông tin bệnh nhân' }
    ],
    'Quản lý lịch hẹn': [
      { key: 'manage_appointments', label: 'Quản lý lịch hẹn' },
      { key: 'view_appointments', label: 'Xem lịch hẹn' },
      { key: 'assign_appointments', label: 'Chỉ định lịch hẹn' }
    ],
    'Quản lý xét nghiệm': [
      { key: 'manage_lab_tests', label: 'Quản lý xét nghiệm' },
      { key: 'process_tests', label: 'Xử lý xét nghiệm' },
      { key: 'manage_samples', label: 'Quản lý mẫu xét nghiệm' },
      { key: 'manage_results', label: 'Quản lý kết quả' },
      { key: 'approve_results', label: 'Duyệt kết quả' }
    ],
    'Quản lý tài chính': [
      { key: 'manage_invoices', label: 'Quản lý hóa đơn' },
      { key: 'view_reports', label: 'Xem báo cáo' }
    ],
    'Quản lý kho và ca làm việc': [
      { key: 'manage_inventory', label: 'Quản lý kho' },
      { key: 'manage_shifts', label: 'Quản lý ca làm việc' }
    ],
    'Dịch vụ bệnh nhân': [
      { key: 'book_appointments', label: 'Đặt lịch hẹn' },
      { key: 'view_results', label: 'Xem kết quả xét nghiệm' }
    ]
  };

  // Role information
  const roleInfo = {
    admin: {
      name: 'Quản trị viên',
      description: 'Toàn quyền quản lý hệ thống',
      icon: 'fas fa-users',
      color: 'danger'
    },
    manager: {
      name: 'Quản lý',
      description: 'Quản lý phòng lab và nhân viên',
      icon: 'fas fa-cog',
      color: 'warning'
    },
    doctor: {
      name: 'Bác sĩ',
      description: 'Xem và duyệt kết quả xét nghiệm',
      icon: 'fas fa-user-md',
      color: 'primary'
    },
    lab_user: {
      name: 'Nhân viên Lab',
      description: 'Xử lý xét nghiệm và quản lý mẫu',
      icon: 'fas fa-flask',
      color: 'info'
    },
    patient: {
      name: 'Bệnh nhân',
      description: 'Xem kết quả và đặt lịch hẹn',
      icon: 'fas fa-user',
      color: 'success'
    }
  };

  // Get default permissions for each role
  const getDefaultPermissionsForRole = (roleKey) => {
    const defaultPermissions = {
      admin: [
        'manage_users', 'manage_lab_users', 'manage_doctors', 'manage_roles',
        'manage_patients', 'view_patients',
        'manage_appointments', 'view_appointments', 'assign_appointments',
        'manage_lab_tests', 'process_tests', 'manage_samples', 'manage_results', 'approve_results',
        'manage_invoices', 'view_reports',
        'manage_inventory', 'manage_shifts', 'book_appointments', 'view_results'
      ],
      manager: [
        'manage_patients', 'view_patients',
        'manage_appointments', 'view_appointments', 'assign_appointments',
        'manage_lab_tests', 'process_tests', 'manage_samples', 'manage_results',
        'manage_invoices', 'view_reports',
        'manage_inventory', 'manage_shifts'
      ],
      doctor: [
        'view_patients',
        'view_appointments',
        'approve_results', 'view_results'
      ],
      lab_user: [
        'view_patients',
        'view_appointments',
        'process_tests', 'manage_samples', 'manage_results'
      ],
      patient: [
        'book_appointments', 'view_results'
      ]
    };
    
    return defaultPermissions[roleKey] || [];
  };

  useEffect(() => {
    loadRolePermissions();
  }, []);

  const loadRolePermissions = async () => {
    try {
      setLoading(true);
      const result = await roleService.getRolePermissions();
      
      if (result.success) {
        let data = Array.isArray(result.data) ? result.data : [];
        
        // If no data from API, create default role permissions structure
        if (data.length === 0) {
          data = Object.keys(roleInfo).map(roleKey => ({
            role: roleKey,
            permissions: getDefaultPermissionsForRole(roleKey)
          }));
        }
        
        setRolePermissions(data);
        setError(null);
      } else {
        // Even if API fails, create default structure
        const defaultData = Object.keys(roleInfo).map(roleKey => ({
          role: roleKey,
          permissions: getDefaultPermissionsForRole(roleKey)
        }));
        setRolePermissions(defaultData);
        setError(result.message || 'Lỗi tải dữ liệu. Đang sử dụng cấu hình mặc định.');
      }
    } catch (err) {
      // Create default structure on error
      const defaultData = Object.keys(roleInfo).map(roleKey => ({
        role: roleKey,
        permissions: getDefaultPermissionsForRole(roleKey)
      }));
      setRolePermissions(defaultData);
      setError('Lỗi tải dữ liệu: ' + err.message + '. Đang sử dụng cấu hình mặc định.');
    } finally {
      setLoading(false);
    }
  };

  const handleEditRole = (roleKey) => {
    const role = Array.isArray(rolePermissions) ? rolePermissions.find(rp => rp.role === roleKey) : null;
    if (role) {
      setEditingRole(role);
      setTempPermissions([...role.permissions]);
    } else {
      // If role doesn't exist, create it with default permissions
      const newRole = {
        role: roleKey,
        permissions: getDefaultPermissionsForRole(roleKey)
      };
      setEditingRole(newRole);
      setTempPermissions([...newRole.permissions]);
    }
  };

  const handleCancelEdit = () => {
    setEditingRole(null);
    setTempPermissions([]);
  };

  const handleSaveRole = async () => {
    try {
      await roleService.updateRolePermissions(editingRole.role, tempPermissions);
      await loadRolePermissions();
      setEditingRole(null);
      setTempPermissions([]);
    } catch (err) {
      setError('Lỗi cập nhật quyền hạn: ' + err.message);
    }
  };

  const handleTogglePermission = (permission) => {
    if (tempPermissions.includes(permission)) {
      setTempPermissions(tempPermissions.filter(p => p !== permission));
    } else {
      setTempPermissions([...tempPermissions, permission]);
    }
  };

  const handleSelectAllInCategory = (categoryPermissions) => {
    const categoryKeys = categoryPermissions.map(p => p.key);
    const allSelected = categoryKeys.every(key => tempPermissions.includes(key));
    
    if (allSelected) {
      // Deselect all in category
      setTempPermissions(tempPermissions.filter(p => !categoryKeys.includes(p)));
    } else {
      // Select all in category
      const newPermissions = [...tempPermissions];
      categoryKeys.forEach(key => {
        if (!newPermissions.includes(key)) {
          newPermissions.push(key);
        }
      });
      setTempPermissions(newPermissions);
    }
  };

  // const getRolePermissions = (role) => {
  //   return rolePermissions.find(rp => rp.role === role)?.permissions || [];
  // };

  const isPermissionSelected = (permission) => {
    return tempPermissions.includes(permission);
  };

  const isCategoryFullySelected = (categoryPermissions) => {
    const categoryKeys = categoryPermissions.map(p => p.key);
    return categoryKeys.every(key => tempPermissions.includes(key));
  };

  const isCategoryPartiallySelected = (categoryPermissions) => {
    const categoryKeys = categoryPermissions.map(p => p.key);
    return categoryKeys.some(key => tempPermissions.includes(key)) && 
           !categoryKeys.every(key => tempPermissions.includes(key));
  };

  if (loading) {
    return (
      <Container className="py-4">
        <div className="text-center">
          <div className="spinner-border" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      </Container>
    );
  }

  return (
    <Container fluid className="py-4">
      <Row className="mb-4">
        <Col>
          <h2><i className="fas fa-shield-alt me-2"></i>Quản lý phân quyền</h2>
          <p className="text-muted">Cấu hình quyền hạn cho từng vai trò trong hệ thống</p>
        </Col>
      </Row>

      {error && (
        <Alert variant="danger" dismissible onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Role Cards */}
      <Row className="mb-4">
        {Object.entries(roleInfo).map(([roleKey, info]) => {
          const role = Array.isArray(rolePermissions) ? rolePermissions.find(rp => rp.role === roleKey) : null;
          const permissions = role?.permissions || [];
          const isEditing = editingRole?.role === roleKey;
          
          return (
            <Col md={6} lg={4} key={roleKey} className="mb-3">
              <Card className={`h-100 ${isEditing ? 'border-primary' : ''}`}>
                <Card.Header className={`bg-${info.color} text-white`}>
                  <div className="d-flex align-items-center justify-content-between">
                    <div className="d-flex align-items-center">
                      <i className={`${info.icon} me-2`}></i>
                      <strong>{info.name}</strong>
                    </div>
                    {!isEditing && (
                      <Button
                        variant="outline-light"
                        size="sm"
                        onClick={() => handleEditRole(roleKey)}
                      >
                        <i className="fas fa-edit"></i>
                      </Button>
                    )}
                  </div>
                </Card.Header>
                <Card.Body>
                  <p className="text-muted small mb-3">{info.description}</p>
                  <div className="mb-2">
                    <Badge bg="secondary" className="me-1">
                      {permissions.length} quyền hạn
                    </Badge>
                  </div>
                  {isEditing && (
                    <div className="d-flex gap-2">
                      <Button
                        variant="success"
                        size="sm"
                        onClick={handleSaveRole}
                      >
                        <i className="fas fa-save me-1"></i>
                        Lưu
                      </Button>
                      <Button
                        variant="outline-secondary"
                        size="sm"
                        onClick={handleCancelEdit}
                      >
                        <i className="fas fa-times me-1"></i>
                        Hủy
                      </Button>
                    </div>
                  )}
                </Card.Body>
              </Card>
            </Col>
          );
        })}
      </Row>

      {/* Permission Editor */}
      {editingRole && (
        <Card>
          <Card.Header>
            <h5 className="mb-0">
              <i className="fas fa-edit me-2"></i>
              Chỉnh sửa quyền hạn cho {roleInfo[editingRole.role]?.name}
            </h5>
          </Card.Header>
          <Card.Body>
            <Accordion defaultActiveKey="0">
              {Object.entries(permissionCategories).map(([categoryName, categoryPermissions], index) => {
                const isFullySelected = isCategoryFullySelected(categoryPermissions);
                const isPartiallySelected = isCategoryPartiallySelected(categoryPermissions);
                
                return (
                  <Accordion.Item eventKey={index.toString()} key={categoryName}>
                    <Accordion.Header>
                      <div className="d-flex align-items-center w-100">
                        <Form.Check
                          type="checkbox"
                          checked={isFullySelected}
                          ref={input => {
                            if (input) input.indeterminate = isPartiallySelected;
                          }}
                          onChange={() => handleSelectAllInCategory(categoryPermissions)}
                          className="me-2"
                        />
                        <strong>{categoryName}</strong>
                        <Badge bg="secondary" className="ms-2">
                          {categoryPermissions.filter(p => isPermissionSelected(p.key)).length}/
                          {categoryPermissions.length}
                        </Badge>
                      </div>
                    </Accordion.Header>
                    <Accordion.Body>
                      <Row>
                        {categoryPermissions.map((permission) => (
                          <Col md={6} key={permission.key} className="mb-2">
                            <Form.Check
                              type="checkbox"
                              id={`${editingRole.role}-${permission.key}`}
                              label={permission.label}
                              checked={isPermissionSelected(permission.key)}
                              onChange={() => handleTogglePermission(permission.key)}
                            />
                          </Col>
                        ))}
                      </Row>
                    </Accordion.Body>
                  </Accordion.Item>
                );
              })}
            </Accordion>
          </Card.Body>
        </Card>
      )}

      {/* Current Permissions Summary */}
      <Card className="mt-4">
        <Card.Header>
          <h5 className="mb-0">Tóm tắt quyền hạn hiện tại</h5>
        </Card.Header>
        <Card.Body>
          <Table responsive>
            <thead>
              <tr>
                <th>Vai trò</th>
                <th>Số quyền hạn</th>
                <th>Quyền hạn chính</th>
              </tr>
            </thead>
            <tbody>
              {Array.isArray(rolePermissions) ? rolePermissions.map((role) => {
                const info = roleInfo[role.role];
                const mainPermissions = role.permissions.slice(0, 3);
                
                return (
                  <tr key={role.role}>
                    <td>
                      <div className="d-flex align-items-center">
                        <i className={`${info?.icon || 'fas fa-users'} me-2 text-${info?.color || 'secondary'}`}></i>
                        {info?.name || role.role}
                      </div>
                    </td>
                    <td>
                      <Badge bg="primary">{role.permissions.length}</Badge>
                    </td>
                    <td>
                      <div className="d-flex flex-wrap gap-1">
                        {mainPermissions.map((permission) => {
                          const category = Object.entries(permissionCategories).find(([_, perms]) =>
                            perms.some(p => p.key === permission)
                          );
                          return (
                            <Badge key={permission} bg="light" text="dark" className="small">
                              {category?.[0] || permission}
                            </Badge>
                          );
                        })}
                        {role.permissions.length > 3 && (
                          <Badge bg="secondary" className="small">
                            +{role.permissions.length - 3} khác
                          </Badge>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              }) : (
                <tr>
                  <td colSpan="3" className="text-center text-muted">
                    Không có dữ liệu
                  </td>
                </tr>
              )}
            </tbody>
          </Table>
        </Card.Body>
      </Card>
    </Container>
  );
};

export default RoleManagement;
