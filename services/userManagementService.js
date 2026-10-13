import api from './api';

// Map Role ID sang Name (Khớp với DB)
const ROLE_MAPPING = {
  1: 'admin',
  2: 'manager',
  3: 'doctor',
  4: 'lab_user',    // ← DB là "Labuser" nhưng frontend dùng "lab_user"
  5: 'patient',
  6: 'receptionist'
};

const normalizeUser = (item = {}) => {
  if (!item) return null;

  // Ưu tiên map từ roleId trước
  let finalRole = '';
  const roleId = item.roleId || item.RoleId;

  if (roleId && ROLE_MAPPING[roleId]) {
    finalRole = ROLE_MAPPING[roleId];
  } else if (item.role && typeof item.role === 'string') {
    finalRole = item.role.toLowerCase();
  } else {
    finalRole = 'patient';
  }

  return {
    id: item.id || item.userId || item.accountId || '',
    fullName: item.fullName || item.name || item.username || '',
    email: item.email || '',
    phone: item.phone || '',
    role: finalRole,
    roleId: roleId || null,
    isActive: item.isActive !== undefined ? item.isActive : (item.status === 1 || item.status === 'active'),
    status: item.isActive ? 'active' : 'inactive',
    createdAt: item.createdAt || null,
    raw: item
  };
};

const userManagementService = {
  getAllUsers: async (options = {}) => {
    try {
      // ✅ Fetch page đầu tiên
      const response = await api.get('/gateway/admin/accounts', {
        params: { page: 1, pageSize: 50, ...options.params }
      });

      let data = Array.isArray(response.data) ? response.data : (response.data?.data || []);

      // ✅ PAGINATION: Fetch thêm các page nếu cần
      if (options.fetchAll && data.length > 0) {
        const collected = [...data];
        const pageSize = 50;
        let currentPage = 2;
        let hasMore = data.length >= pageSize; // Nếu page 1 đầy -> còn page khác

        while (hasMore && currentPage <= 10) { // Giới hạn max 10 pages (500 users)
          try {
            const pageResponse = await api.get('/gateway/admin/accounts', {
              params: { page: currentPage, pageSize }
            });

            const pageData = Array.isArray(pageResponse.data)
              ? pageResponse.data
              : (pageResponse.data?.data || []);

            if (pageData.length === 0) {
              hasMore = false; // Hết data
            } else {
              collected.push(...pageData);
              hasMore = pageData.length >= pageSize; // Còn page nữa không?
              currentPage++;

            }
          } catch (pageError) {
            break; // Stop nếu lỗi
    }
        }

        data = collected;
      }

      const normalizedData = Array.isArray(data)
        ? data.map(item => normalizeUser(item)).filter(Boolean)
        : [];

      return { success: true, data: normalizedData };
    } catch (error) {
      if (error.response?.status === 404 || error.response?.status === 401) {
        return { success: true, data: [], message: 'Không thể tải dữ liệu.' };
      }
      throw error;
    }
  },

  getUserById: async (id) => {
    const response = await api.get(`/gateway/admin/accounts/${id}`);
    return normalizeUser(response.data?.data || response.data);
  },

  createUser: async (userData) => {
    const payload = {
      username: userData.username || userData.fullName?.replace(/\s+/g, '').toLowerCase() || userData.email?.split('@')[0],
      password: userData.password,
      email: userData.email,
      roleId: userData.roleId,
      status: userData.isActive ? 1 : 0
    };
    const response = await api.post('/gateway/admin/accounts', payload);
    return response.data;
  },

  updateUser: async (id, userData) => {
    const payload = {
      username: userData.username || userData.fullName?.replace(/\s+/g, '').toLowerCase() || userData.email?.split('@')[0],
      password: userData.password || '', // Optional for update
      email: userData.email,
      roleId: userData.roleId,
      status: userData.isActive ? 1 : 0
    };
    const response = await api.put(`/gateway/admin/accounts/${id}`, payload);
    return response.data;
  },

  deleteUser: async (id) => {
      const response = await api.delete(`/gateway/admin/accounts/${id}`);
      return response.data;
  },

  toggleUserStatus: async (user, isActive) => {
    const payload = {
      username: user.raw?.username || user.username || user.fullName?.replace(/\s+/g, '').toLowerCase() || user.email?.split('@')[0],
      password: user.raw?.password || '',
      email: user.email,
      roleId: user.roleId,
      status: isActive ? 1 : 0
    };
    const response = await api.put(`/gateway/admin/accounts/${user.id}`, payload);
    return response.data;
  },

  changePassword: async (id, newPassword, currentUserData) => {
    const updateData = {
      username: currentUserData.username || currentUserData.fullName || currentUserData.email?.split('@')[0],
      password: newPassword,
      email: currentUserData.email,
      roleId: currentUserData.roleId || 5,
      status: currentUserData.isActive ? 1 : 0
    };

    const response = await api.put(`/gateway/admin/accounts/${id}`, updateData);
    return response.data;
  },

  getUserStats: async () => {
    try {
      const usersResult = await userManagementService.getAllUsers({ fetchAll: true });
      const users = usersResult.success ? usersResult.data : [];

      const stats = {
        total: users.length,
        active: users.filter(u => u.isActive).length,
        inactive: users.filter(u => !u.isActive).length,
        byRole: {
          admin: users.filter(u => u.roleId === 1).length,
          manager: users.filter(u => u.roleId === 2).length,
          doctor: users.filter(u => u.roleId === 3).length,
          lab_user: users.filter(u => u.roleId === 4).length,
          patient: users.filter(u => u.roleId === 5).length,
          receptionist: users.filter(u => u.roleId === 6).length
        }
      };

      return { success: true, data: stats };
    } catch (e) {
      return { success: false, data: null };
    }
  }
};

export { userManagementService };
