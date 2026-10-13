/**
 * Authentication Context
 * 
 * This context provides authentication state and methods throughout the application.
 * It manages user login status, user data, and authentication operations.
 * 
 * @author Blood Laboratory Management Team
 * @version 1.0.0
 * @since 2024
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { authService } from '../../services/authService';
import { normalizeRoleToId, normalizeRoleToKey, getRoleDisplayName, hasRole as checkHasRole } from '../../features/users/utils/roleUtils';
import { prefetchAdminData } from '../../services/adminDataPrefetchService';
import { prefetchPatientData } from '../../services/patientDataPrefetchService';

// Create authentication context
const AuthContext = createContext();

/**
 * Custom hook to use authentication context
 * 
 * @returns {Object} Authentication context value
 * @throws {Error} If used outside of AuthProvider
 */
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

/**
 * Authentication Provider Component
 * 
 * Provides authentication state and methods to child components.
 * Manages user login status, user data, and authentication operations.
 * 
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Child components
 * @returns {React.ReactNode} Provider component with authentication context
 */
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isGuest, setIsGuest] = useState(true);

  useEffect(() => {
    const currentUser = authService.getCurrentUser();
    const isAuth = authService.isAuthenticated();
    if (currentUser && isAuth) {
      setUser(currentUser);
      setIsGuest(false);
    } else {
      setIsGuest(true);
    }
    setLoading(false);
  }, []);

  /**
   * User Login
   * 
   * Authenticates a user with username and password.
   * Updates authentication state on successful login.
   * 
   * @param {string} username - User's username or email
   * @param {string} password - User's password
   * @returns {Promise<Object>} Login result with success status
   */
  const login = async (username, password) => {
    setLoading(true);
    try {
      const result = await authService.login(username, password);
      if (result.success) {
        setUser(result.user);
        setIsGuest(false);
        
        // Mark as regular login for guide banner (except for new users)
        if (result.user?.id) {
          const isNewUser = localStorage.getItem(`isNewUser_${result.user.id}`) === 'true';
          if (!isNewUser) {
            localStorage.setItem(`regularLogin_${result.user.id}`, 'true');
          }
        }

        // Prefetch data in background based on role
        const roleId = normalizeRoleToId(result.user);
        if (roleId && [1, 2, 3, 4, 6].includes(roleId)) {
          // Prefetch admin data for admin roles
          prefetchAdminData().catch(() => {
            // Silently fail - prefetch is optional
          });
        } else if (roleId === 5 && result.user?.email) {
          // Prefetch patient data for patient role
          prefetchPatientData(result.user.email).catch(() => {
            // Silently fail - prefetch is optional
          });
        }
      }
      setLoading(false);
      return result;
    } catch (error) {
      setLoading(false);
      return { success: false, message: 'Lỗi đăng nhập' };
    }
  };

  /**
   * User Registration
   * 
   * Registers a new user account.
   * 
   * @param {Object} userData - User registration data
   * @returns {Promise<Object>} Registration result with success status
   */
  const register = async (userData) => {
    setLoading(true);
    const result = await authService.register(userData);
    setLoading(false);
    
    // Mark as new user for guide banner
    if (result.success && result.user?.id) {
      localStorage.setItem(`isNewUser_${result.user.id}`, 'true');
    }
    
    return result;
  };

  /**
   * Send OTP
   * 
   * Sends a one-time password to the user's email.
   * 
   * @param {string} email - User's email address
   * @returns {Promise<Object>} OTP sending result
   */
  const sendOTP = async (email) => {
    return await authService.sendOTP(email);
  };

  /**
   * Verify OTP
   * 
   * Verifies the one-time password entered by the user.
   * 
   * @param {string} otp - The OTP code to verify
   * @param {string} email - User's email address (optional, will try to get from localStorage if not provided)
   * @returns {Promise<Object>} OTP verification result
   */
  const verifyOTP = async (otp, email = null) => {
    // If email not provided, try to get from localStorage (for registration flow)
    const emailToUse = email || localStorage.getItem('otpEmail') || '';
    return await authService.verifyOTP(emailToUse, otp);
  };

  /**
   * User Logout
   * 
   * Logs out the current user and clears authentication state.
   */
  const logout = () => {
    authService.logout();
    setUser(null);
    setIsGuest(true);
  };

  /**
   * Update User
   * 
   * Updates the user data in both state and localStorage.
   * 
   * @param {Object} userData - Updated user data
   */
  const updateUser = (userData) => {
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
  };

  // Get user role information (backward compatible)
  // Support both roleId (number) and role (string)
  // Safely handle null/undefined user - use useMemo to prevent recalculation on every render
  const { userRoleId, userRole, userRoleName } = useMemo(() => {
    let roleId = null;
    let role = 'guest';
    let roleName = 'Guest';
    
    try {
      if (user) {
        roleId = normalizeRoleToId(user);
        const roleKey = normalizeRoleToKey(user);
        role = roleKey || (user.role || 'guest');
        roleName = getRoleDisplayName(user) || 'Guest';
      }
    } catch (error) {
      // Fallback to safe defaults
      roleId = null;
      role = user?.role || 'guest';
      roleName = 'Guest';
    }
    
    return {
      userRoleId: roleId,
      userRole: role,
      userRoleName: roleName
    };
  }, [user]);

  // Helper function to check if user has required role(s)
  // Use useCallback to prevent recreating function on every render
  const hasRole = useCallback((requiredRoles) => {
    if (!user || !requiredRoles) return false;
    try {
      return checkHasRole(user, requiredRoles);
    } catch (error) {
      return false;
    }
  }, [user]);

  // Context value object
  const value = {
    user,
    login,
    register,
    sendOTP,
    verifyOTP,
    logout,
    updateUser,
    loading,
    isAuthenticated: !!user,
    isGuest,
    // Backward compatible: role as string
    userRole,
    // New: roleId as number
    userRoleId,
    // New: role display name
    userRoleName,
    // New: hasRole helper
    hasRole
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
