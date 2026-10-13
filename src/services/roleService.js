/**
 * @file roleService.js
 * @description API service for RBAC Role and Permission management (UC13).
 * Communicates with BMS Backend /api/v1/roles with resilient offline mock fallback.
 * Conforms to: NIST RBAC Standard & RFC 7807 Problem Details.
 */

import api from '../config/api';

const defaultMockRoles = [
  {
    id: '6acccf5625181a786df578c4',
    roleCode: 'ADMIN',
    roleName: 'Quản Trị Viên Hệ Thống',
    description: 'Toàn quyền quản trị phân hệ IAM, cấu hình tham số, danh mục và bảo mật.',
    permissions: ['IAM_VIEW', 'IAM_MANAGE', 'LAB_APPROVE', 'BILLING_REFUND'],
    isSystemRole: true,
    isActive: true,
    userCount: 3,
    createdAt: '12/10/2026',
    updatedAt: '12/10/2026',
  },
  {
    id: '6acccf5625181a786df578c5',
    roleCode: 'DOCTOR',
    roleName: 'Bác Sĩ Khám Bệnh',
    description: 'Bác sĩ lâm sàng: Khám bệnh, chỉ định xét nghiệm và kê đơn EMR.',
    permissions: ['CLINIC_EXAM', 'CLINIC_ORDER', 'LAB_TEST'],
    isSystemRole: true,
    isActive: true,
    userCount: 8,
    createdAt: '12/10/2026',
    updatedAt: '12/10/2026',
  },
  {
    id: '6acccf5625181a786df578c6',
    roleCode: 'LAB_TECHNICIAN',
    roleName: 'Kỹ Thuật Viên Xét Nghiệm',
    description: 'KTV phòng Lab: Tiếp nhận mẫu bệnh phẩm, vận hành máy sinh hóa, nhập kết quả.',
    permissions: ['LAB_TEST', 'LAB_APPROVE', 'INVENTORY_VIEW'],
    isSystemRole: true,
    isActive: true,
    userCount: 6,
    createdAt: '12/10/2026',
    updatedAt: '12/10/2026',
  },
  {
    id: '6acccf5625181a786df578c7',
    roleCode: 'RECEPTIONIST',
    roleName: 'Nhân Viên Tiếp Đón',
    description: 'Điều phối hàng đợi, tiếp nhận bệnh nhân, đặt lịch khám.',
    permissions: ['RECEPTION_QUEUE', 'RECEPTION_CHECKIN'],
    isSystemRole: true,
    isActive: true,
    userCount: 4,
    createdAt: '12/10/2026',
    updatedAt: '12/10/2026',
  },
  {
    id: '6acccf5625181a786df578c8',
    roleCode: 'PATIENT',
    roleName: 'Bệnh Nhân',
    description: 'Tài khoản cổng thông tin bệnh nhân: Tra cứu kết quả và đặt lịch khám.',
    permissions: [],
    isSystemRole: true,
    isActive: true,
    userCount: 1420,
    createdAt: '12/10/2026',
    updatedAt: '12/10/2026',
  },
];

export const getRoles = async (params = {}) => {
  try {
    const response = await api.get('/api/v1/roles', { params });
    if (response.data && response.data.success) {
      return { isSuccess: true, data: response.data.data };
    }
    return { isSuccess: false, message: response.data?.message };
  } catch (err) {
    console.warn('[BMS Role Service] Using mock data fallback.');
    let filtered = [...defaultMockRoles];
    if (params.search) {
      const q = params.search.toLowerCase();
      filtered = filtered.filter(
        (r) => r.roleCode.toLowerCase().includes(q) || r.roleName.toLowerCase().includes(q)
      );
    }
    if (params.isActive !== undefined && params.isActive !== '') {
      const activeBool = params.isActive === 'true' || params.isActive === true;
      filtered = filtered.filter((r) => r.isActive === activeBool);
    }
    return {
      isSuccess: true,
      data: {
        currentPage: 1,
        pageSize: 10,
        totalCount: filtered.length,
        totalPages: 1,
        items: filtered,
      },
    };
  }
};

export const getPermissionMatrix = async () => {
  try {
    const response = await api.get('/api/v1/roles/permissions/matrix');
    if (response.data && response.data.success) {
      return { isSuccess: true, data: response.data.data };
    }
  } catch (err) {
    // fallback
  }

  return {
    isSuccess: true,
    data: {
      'Identity & Access Management (IAM)': ['IAM_VIEW', 'IAM_MANAGE'],
      'Reception & Queuing': ['RECEPTION_QUEUE', 'RECEPTION_CHECKIN'],
      'Clinical Examination (EMR)': ['CLINIC_EXAM', 'CLINIC_ORDER'],
      'Laboratory & Testing': ['LAB_TEST', 'LAB_APPROVE'],
      'Billing & Cashier': ['BILLING_POS', 'BILLING_REFUND'],
      'Inventory & IoT Monitoring': ['INVENTORY_VIEW', 'IOT_MONITOR'],
    },
  };
};

export const createRole = async (roleData) => {
  try {
    const response = await api.post('/api/v1/roles', roleData);
    if (response.data && response.data.success) {
      return { isSuccess: true, data: response.data.data, message: response.data.message };
    }
    return { isSuccess: false, message: response.data?.message };
  } catch (err) {
    const msg = err.response?.data?.message || 'Failed to create role.';
    return { isSuccess: false, message: msg };
  }
};

export const updateRole = async (id, roleData) => {
  try {
    const response = await api.put(`/api/v1/roles/${id}`, roleData);
    if (response.data && response.data.success) {
      return { isSuccess: true, data: response.data.data, message: response.data.message };
    }
    return { isSuccess: false, message: response.data?.message };
  } catch (err) {
    const msg = err.response?.data?.message || 'Failed to update role.';
    return { isSuccess: false, message: msg };
  }
};

export const deleteRole = async (id) => {
  try {
    const response = await api.delete(`/api/v1/roles/${id}`);
    if (response.data && response.data.success) {
      return { isSuccess: true, message: response.data.message };
    }
    return { isSuccess: false, message: response.data?.message };
  } catch (err) {
    const msg = err.response?.data?.message || 'Failed to delete role.';
    return { isSuccess: false, message: msg };
  }
};

export default {
  getRoles,
  getPermissionMatrix,
  createRole,
  updateRole,
  deleteRole,
};
