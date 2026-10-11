/**
 * Role Utilities
 * 
 * Helper functions for role management and roleId/roleName mapping
 * 
 * @author Blood Laboratory Management Team
 * @version 1.0.0
 * @since 2024
 */

/**
 * Role ID to Role Name Mapping
 * 
 * New naming convention: Role + Main Function
 * Maintains backward compatibility with old keys
 */
export const ROLE_MAPPING = {
  1: { 
    roleId: 1, 
    roleName: 'Admin', 
    description: 'Quản trị hệ thống - Toàn quyền quản trị', 
    key: 'admin'
  },
  2: { 
    roleId: 2, 
    roleName: 'Manager', 
    description: 'Quản lý hoạt động phòng lab - Quản lý kho, ca làm việc', 
    key: 'manager'
  },
  3: { 
    roleId: 3, 
    roleName: 'Doctor', 
    description: 'Bác sĩ tư vấn - Tư vấn kết quả xét nghiệm', 
    key: 'doctor'
  },
  4: { 
    roleId: 4, 
    roleName: 'LabUser', 
    description: 'Nhân viên xử lý xét nghiệm - Lấy mẫu, nhập kết quả', 
    key: 'lab_user'
  },
  5: { 
    roleId: 5, 
    roleName: 'Patient', 
    description: 'Bệnh nhân đặt lịch - Đặt lịch, xem kết quả', 
    key: 'patient'
  },
  6: { 
    roleId: 6, 
    roleName: 'Receptionist', 
    description: 'Lễ tân check-in - Check-in bệnh nhân, tạo hồ sơ', 
    key: 'receptionist'
  }
};

/**
 * Role Key to Role ID Mapping
 * Supports both new keys (with function) and old keys (backward compatibility)
 */
export const ROLE_KEY_TO_ID = {
  // New keys (with function name)
  'admin_system_manager': 1,
  'manager_lab_operations': 2,
  'doctor_consultation': 3,
  'lab_user_test_processing': 4,
  'patient_appointment_booking': 5,
  'receptionist_check_in': 6,
  
  // Old keys (backward compatibility)
  'admin': 1,
  'manager': 2,
  'doctor': 3,
  'lab_user': 4,
  'labuser': 4,
  'lab user': 4,
  'lab-user': 4,
  'patient': 5,
  'receptionist': 6
};

/**
 * Role ID to Role Key Mapping
 * Returns new keys by default, but supports old keys for backward compatibility
 */
export const ROLE_ID_TO_KEY = {
  1: 'admin', // Old key (restored)
  2: 'manager', // Old key (restored)
  3: 'doctor', // Old key (restored)
  4: 'lab_user', // Old key (restored)
  5: 'patient', // Old key (restored)
  6: 'receptionist' // Old key (restored)
};

/**
 * Role ID to Old Role Key Mapping (for backward compatibility)
 */
export const ROLE_ID_TO_KEY_OLD = {
  1: 'admin',
  2: 'manager',
  3: 'doctor',
  4: 'lab_user',
  5: 'patient',
  6: 'receptionist'
};

/**
 * Get Role Info by Role ID
 * @param {number} roleId - Role ID
 * @returns {Object|null} Role information object or null if not found
 */
export const getRoleById = (roleId) => {
  return ROLE_MAPPING[roleId] || null;
};

/**
 * Get Role Info by Role Key (string)
 * @param {string} roleKey - Role key (e.g., 'admin', 'doctor')
 * @returns {Object|null} Role information object or null if not found
 */
export const getRoleByKey = (roleKey) => {
  const roleId = ROLE_KEY_TO_ID[roleKey?.toLowerCase()];
  return roleId ? ROLE_MAPPING[roleId] : null;
};

/**
 * Get Role ID from Role Key
 * @param {string} roleKey - Role key (e.g., 'admin', 'doctor')
 * @returns {number|null} Role ID or null if not found
 */
export const getRoleIdFromKey = (roleKey) => {
  return ROLE_KEY_TO_ID[roleKey?.toLowerCase()] || null;
};

/**
 * Get Role Key from Role ID
 * @param {number} roleId - Role ID
 * @returns {string|null} Role key or null if not found
 */
export const getRoleKeyFromId = (roleId) => {
  return ROLE_ID_TO_KEY[roleId] || null;
};

/**
 * Get Role Name from Role ID
 * @param {number} roleId - Role ID
 * @returns {string|null} Role name or null if not found
 */
export const getRoleNameFromId = (roleId) => {
  const role = ROLE_MAPPING[roleId];
  return role ? role.roleName : null;
};

/**
 * Check if user has required role
 * @param {number|string} userRole - User's role (can be roleId or roleKey)
 * @param {number|string|Array} requiredRole - Required role(s) (can be roleId, roleKey, or array of them)
 * @returns {boolean} True if user has required role
 */
export const hasRole = (userRole, requiredRole) => {
  if (!userRole || !requiredRole) return false;
  
  // Convert userRole to roleId
  let userRoleId;
  if (typeof userRole === 'number') {
    userRoleId = userRole;
  } else if (typeof userRole === 'string') {
    // Try to parse as number first (e.g., "4" -> 4)
    const parsed = parseInt(userRole, 10);
    if (!isNaN(parsed)) {
      userRoleId = parsed;
    } else {
      // Otherwise, try to get from role key mapping
      userRoleId = getRoleIdFromKey(userRole);
    }
  } else if (userRole && typeof userRole === 'object') {
    // If userRole is an object (user), try to get roleId or role
    // Priority: roleId (number) > role (string, try parse as number first)
    if (userRole.roleId !== undefined && userRole.roleId !== null) {
      // Convert to number if string
      userRoleId = typeof userRole.roleId === 'string' 
        ? parseInt(userRole.roleId, 10) 
        : userRole.roleId;
      // If parsing failed, try role key
      if (isNaN(userRoleId)) {
        userRoleId = getRoleIdFromKey(userRole.roleId);
      }
    } else if (userRole.role) {
      // Try to parse role as number first (e.g., "4" -> 4)
      const parsed = parseInt(userRole.role, 10);
      if (!isNaN(parsed)) {
        userRoleId = parsed;
      } else {
        // Otherwise, try to get from role key mapping
        userRoleId = getRoleIdFromKey(userRole.role);
      }
    }
  } else {
    return false;
  }

  // If userRoleId is still null/undefined/NaN, return false
  if (!userRoleId || isNaN(userRoleId)) return false;

  // Convert requiredRole to roleId(s)
  const requiredRoleIds = Array.isArray(requiredRole)
    ? requiredRole.map(r => {
        if (typeof r === 'number') return r;
        if (typeof r === 'string') return getRoleIdFromKey(r);
        return null;
      }).filter(id => id !== null) // Remove null values
    : (() => {
        const id = typeof requiredRole === 'number' 
          ? requiredRole 
          : getRoleIdFromKey(requiredRole);
        return id ? [id] : [];
      })();

  // If no valid requiredRoleIds, return false
  if (requiredRoleIds.length === 0) return false;

  return requiredRoleIds.includes(userRoleId);
};

/**
 * Normalize user role to roleId
 * @param {number|string|Object} userRole - User's role (can be roleId, roleKey, or user object)
 * @returns {number|null} Role ID or null if not found
 */
export const normalizeRoleToId = (userRole) => {
  if (typeof userRole === 'number') {
    return userRole;
  }
  if (typeof userRole === 'string') {
    // Try to parse as number first (e.g., "5" -> 5)
    const parsed = parseInt(userRole, 10);
    if (!isNaN(parsed)) {
      return parsed;
    }
    // Otherwise, try to get from role key mapping
    return getRoleIdFromKey(userRole);
  }
  if (userRole && typeof userRole === 'object') {
    // If user object has roleId (convert to number if string)
    if (userRole.roleId !== undefined && userRole.roleId !== null) {
      const roleId = typeof userRole.roleId === 'string' 
        ? parseInt(userRole.roleId, 10) 
        : userRole.roleId;
      return isNaN(roleId) ? null : roleId;
    }
    // If user object has role (string)
    if (userRole.role) {
      // Try to parse as number first
      const parsed = parseInt(userRole.role, 10);
      if (!isNaN(parsed)) {
        return parsed;
      }
      // Otherwise, try to get from role key mapping
      return getRoleIdFromKey(userRole.role);
    }
  }
  return null;
};

/**
 * Normalize user role to roleKey
 * @param {number|string|Object} userRole - User's role (can be roleId, roleKey, or user object)
 * @returns {string|null} Role key or null if not found
 */
export const normalizeRoleToKey = (userRole) => {
  if (typeof userRole === 'string') {
    return userRole.toLowerCase();
  }
  if (typeof userRole === 'number') {
    return getRoleKeyFromId(userRole);
  }
  if (userRole && typeof userRole === 'object') {
    // If user object has role (string)
    if (userRole.role) {
      return userRole.role.toLowerCase();
    }
    // If user object has roleId
    if (userRole.roleId) {
      return getRoleKeyFromId(userRole.roleId);
    }
  }
  return null;
};

/**
 * Get all roles as array
 * @returns {Array} Array of role objects
 */
export const getAllRoles = () => {
  return Object.values(ROLE_MAPPING);
};

/**
 * Get role display name
 * @param {number|string|Object} userRole - User's role
 * @returns {string} Display name for the role
 */
export const getRoleDisplayName = (userRole) => {
  const roleId = normalizeRoleToId(userRole);
  const role = getRoleById(roleId);
  return role ? role.roleName : 'Unknown';
};

export default {
  ROLE_MAPPING,
  ROLE_KEY_TO_ID,
  ROLE_ID_TO_KEY,
  getRoleById,
  getRoleByKey,
  getRoleIdFromKey,
  getRoleKeyFromId,
  getRoleNameFromId,
  hasRole,
  normalizeRoleToId,
  normalizeRoleToKey,
  getAllRoles,
  getRoleDisplayName
};


