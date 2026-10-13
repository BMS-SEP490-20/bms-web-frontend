import React, { useState, useEffect, useCallback } from 'react';
import {
  Container, Row, Col, Card, Button, Table, Modal, Form,
  Alert, Badge, Tabs, Tab, OverlayTrigger, Tooltip
} from 'react-bootstrap';
import {
  FaUserCog,
  FaFileMedical,
  FaClipboardList,
  FaKey,
  FaLock,
  FaUnlock,
  FaTrash,
  FaPlus,
  FaSave,
  FaLock as FaSystemLock,
  FaUser
} from 'react-icons/fa';
import UnifiedUserInfoModal from '../components/UnifiedUserInfoModal';
import { userManagementService } from '../../../services/userManagementService';
import { authService } from '../../../services/authService';
import { doctorService } from '../../../services/doctorService'; // ✅ Added Import
import { testOrderService } from '../../../services/testOrderService'; // ✅ Added Import
import { useAuth } from '../../../shared/contexts/AuthContext';
import ConfirmDialog from '../../../shared/components/ConfirmDialog/ConfirmDialog';
import { useNotificationContext } from '../../../shared/contexts/NotificationContext';
import useResponsive from '../../../shared/hooks/useResponsive';

// ✅ MAP: Role Name → Role ID (for backend)
const ROLE_TO_ID = {
  'admin': 1,
  'manager': 2,
  'doctor': 3,
  'lab_user': 4,
  'patient': 5,
  'receptionist': 6
};

// ==========================================
// SUB-COMPONENTS (Added for Profile Edit)
// ==========================================

/**
 * Doctor Profile Form Component
 * 
 * A reusable form component for editing doctor profile information.
 * This component manages doctor profile data including full name, specialization,
 * phone, email, and status. It pre-fills form data when a profile is provided.
 * 
 * @param {Object} props - Component props
 * @param {Object} [props.profile] - Doctor profile object to pre-fill form
 * @param {Function} props.onSave - Callback function called when form is submitted with form data
 * @param {Function} props.onCancel - Callback function called when cancel button is clicked
 * @returns {React.ReactNode} Doctor profile form component
 * 
 * @example
 * <DoctorProfileForm
 *   profile={doctorProfile}
 *   onSave={(formData) => handleSaveDoctorProfile(formData)}
 *   onCancel={() => setShowModal(false)}
 * />
 */
const DoctorProfileForm = ({ profile, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    doctorId: '',
    fullName: '',
    specialization: '',
    phone: '',
    email: '',
    status: 'Active'
  });

  useEffect(() => {
    if (profile) {
      setFormData({
        doctorId: profile.doctorId || profile.id || '',
        fullName: profile.fullName || '',
        specialization: profile.specialization || '',
        phone: profile.phone || '',
        email: profile.email || '',
        status: profile.status || 'Active'
      });
    }
  }, [profile]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <Form onSubmit={handleSubmit}>
      <Row>
        <Col md={6}>
          <Form.Group className="mb-3">
            <Form.Label>Họ tên <span className="text-danger">*</span></Form.Label>
            <Form.Control
              value={formData.fullName}
              onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
              required
            />
          </Form.Group>
        </Col>
        <Col md={6}>
          <Form.Group className="mb-3">
            <Form.Label>Chuyên khoa <span className="text-danger">*</span></Form.Label>
            <Form.Control
              value={formData.specialization}
              onChange={(e) => setFormData({ ...formData, specialization: e.target.value })}
              placeholder="VD: Tim mạch, Nội tiết..."
              required
            />
          </Form.Group>
        </Col>
      </Row>

      <Row>
        <Col md={6}>
          <Form.Group className="mb-3">
            <Form.Label>Số điện thoại</Form.Label>
            <Form.Control
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="VD: 0912345678"
            />
          </Form.Group>
        </Col>
        <Col md={6}>
          <Form.Group className="mb-3">
            <Form.Label>Email <span className="text-danger">*</span></Form.Label>
            <Form.Control
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
              disabled
            />
          </Form.Group>
        </Col>
      </Row>

      <Form.Group className="mb-3">
        <Form.Label>Trạng thái</Form.Label>
        <Form.Select
          value={formData.status}
          onChange={(e) => setFormData({ ...formData, status: e.target.value })}
        >
          <option value="Active">Hoạt động</option>
          <option value="Inactive">Không hoạt động</option>
        </Form.Select>
      </Form.Group>

      <div className="d-flex justify-content-end gap-2 mt-4">
        <Button variant="secondary" onClick={onCancel}>Hủy</Button>
        <Button variant="primary" type="submit">
          <FaSave className="me-1" /> Lưu thay đổi
        </Button>
      </div>
    </Form>
  );
};

/**
 * Lab User Profile Form Component
 * 
 * A reusable form component for editing lab user profile information.
 * This component manages lab user profile data including full name, job title,
 * phone, email, default room assignment, and status. It pre-fills form data
 * when a profile is provided and includes a room selection dropdown.
 * 
 * @param {Object} props - Component props
 * @param {Object} [props.profile] - Lab user profile object to pre-fill form
 * @param {Array<Object>} [props.labRooms=[]] - Array of lab room objects for room selection
 * @param {Function} props.onSave - Callback function called when form is submitted with form data
 * @param {Function} props.onCancel - Callback function called when cancel button is clicked
 * @returns {React.ReactNode} Lab user profile form component
 * 
 * @example
 * <LabUserProfileForm
 *   profile={labUserProfile}
 *   labRooms={labRooms}
 *   onSave={(formData) => handleSaveLabUserProfile(formData)}
 *   onCancel={() => setShowModal(false)}
 * />
 */
const LabUserProfileForm = ({ profile, labRooms, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    fullName: '',
    jobTitle: '',
    phone: '',
    email: '',
    defaultRoomId: '',
    status: 'Active'
  });

  useEffect(() => {
    if (profile) {
      setFormData({
        fullName: profile.fullName || '',
        jobTitle: profile.jobTitle || '',
        phone: profile.phone || '',
        email: profile.email || '',
        defaultRoomId: profile.defaultRoomId || '',
        status: profile.status || 'Active'
      });
    }
  }, [profile]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <Form onSubmit={handleSubmit}>
      <Row>
        <Col md={6}>
          <Form.Group className="mb-3">
            <Form.Label>Họ tên <span className="text-danger">*</span></Form.Label>
            <Form.Control
              value={formData.fullName}
              onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
              required
            />
          </Form.Group>
        </Col>
        <Col md={6}>
          <Form.Group className="mb-3">
            <Form.Label>Chức danh <span className="text-danger">*</span></Form.Label>
            <Form.Control
              value={formData.jobTitle}
              onChange={(e) => setFormData({ ...formData, jobTitle: e.target.value })}
              placeholder="VD: Kỹ thuật viên, Trưởng phòng..."
              required
            />
          </Form.Group>
        </Col>
      </Row>

      <Row>
        <Col md={6}>
          <Form.Group className="mb-3">
            <Form.Label>Số điện thoại</Form.Label>
            <Form.Control
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="VD: 0912345678"
            />
          </Form.Group>
        </Col>
        <Col md={6}>
          <Form.Group className="mb-3">
            <Form.Label>Email <span className="text-danger">*</span></Form.Label>
            <Form.Control
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
              disabled
            />
          </Form.Group>
        </Col>
      </Row>

      <Row>
        <Col md={6}>
          <Form.Group className="mb-3">
            <Form.Label>Phòng mặc định</Form.Label>
            <Form.Select
              value={formData.defaultRoomId}
              onChange={(e) => setFormData({ ...formData, defaultRoomId: e.target.value })}
            >
              <option value="">-- Chọn phòng --</option>
              {labRooms.map(room => (
                <option key={room.id || room.roomId} value={room.id || room.roomId}>
                  {room.roomName || room.name || room.id}
                </option>
              ))}
            </Form.Select>
          </Form.Group>
        </Col>
        <Col md={6}>
          <Form.Group className="mb-3">
            <Form.Label>Trạng thái</Form.Label>
            <Form.Select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
            >
              <option value="Active">Hoạt động</option>
              <option value="Inactive">Không hoạt động</option>
            </Form.Select>
          </Form.Group>
        </Col>
      </Row>

      <div className="d-flex justify-content-end gap-2 mt-4">
        <Button variant="secondary" onClick={onCancel}>Hủy</Button>
        <Button variant="primary" type="submit">
          <FaSave className="me-1" /> Lưu thay đổi
        </Button>
      </div>
    </Form>
  );
};

// ==========================================
// MAIN COMPONENT
// ==========================================

const UserManagement = () => {
  // const { hasRole } = useAuth(); // Not used currently
  const { showSuccess, showError } = useNotificationContext();
  const { isMobile, isTablet } = useResponsive();
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({ total: 0, active: 0, byRole: {} });
  const [activeTab, setActiveTab] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Modal & Form states
  const [showModal, setShowModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [modalMode, setModalMode] = useState('create');
  const [selectedUser, setSelectedUser] = useState(null);
  const [showUnifiedModal, setShowUnifiedModal] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);

  // ✅ Profile Edit States (Added)
  const [showDoctorProfileModal, setShowDoctorProfileModal] = useState(false);
  const [showLabUserProfileModal, setShowLabUserProfileModal] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [labRooms, setLabRooms] = useState([]); // For Lab User defaultRoomId dropdown

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    phone: '',
    role: 'lab_user',
    isActive: true
  });

  const [passwordData, setPasswordData] = useState({ newPassword: '', confirmPassword: '' });

  /**
   * Loads all user management data
   * 
   * This function is the core data fetching function for the user management page.
   * It performs the following operations:
   * 1. Validates admin access (checks if current user is admin)
   * 2. Fetches all users from the system
   * 3. Fetches user statistics (counts by role)
   * 4. Loads lab rooms for lab user profile editing
   * 
   * The function handles errors gracefully and sets loading/error states appropriately.
   * 
   * @returns {Promise<void>} Does not return a value. Updates component state with fetched data.
   * 
   * @example
   * // Load data when component mounts or dependencies change
   * await loadData();
   */
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const currentUser = authService.getCurrentUser();
      const isAdmin = currentUser && (
        String(currentUser.role || '').toLowerCase().includes('admin') ||
        Number(currentUser.roleId) === 1 ||
        currentUser.roleId === '1' ||
        currentUser.role === 1
      );

      if (!isAdmin) {
        setError('Bạn không có quyền truy cập. Vui lòng đăng nhập Admin.');
        setLoading(false);
        return;
      }

      // Load Users and Stats
      const [usersData, statsData] = await Promise.all([
        userManagementService.getAllUsers({ fetchAll: true }),
        userManagementService.getUserStats()
      ]);

      if (usersData.success) setUsers(usersData.data || []);
      else setError(usersData.message);

      if (statsData.success) setStats(statsData.data);

      // ✅ Load lab rooms for Lab User profile editing (Added)
      try {
        const roomsResult = await testOrderService.getAllLabRooms({ fetchAll: true });
        if (roomsResult.success) {
          setLabRooms(roomsResult.data || []);
        }
      } catch (error) {
      }

    } catch (error) {
      setError('Lỗi tải dữ liệu.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Filter Logic
  useEffect(() => {
    let filtered = users;

    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      filtered = filtered.filter(u =>
        u.fullName?.toLowerCase().includes(lower) ||
        u.email?.toLowerCase().includes(lower) ||
        u.phone?.includes(lower)
      );
    }

    if (activeTab === 'active') filtered = filtered.filter(u => u.isActive);
    else if (activeTab === 'inactive') filtered = filtered.filter(u => !u.isActive);
    else if (activeTab !== 'all') filtered = filtered.filter(u => u.role === activeTab);

    setFilteredUsers(filtered);
  }, [users, searchTerm, activeTab]);

  /**
   * Effect hook: Loads data when component mounts
   * 
   * This effect automatically loads user management data when the component
   * mounts or when loadData function reference changes.
   * 
   * @effect
   * @dependencies {Function} loadData - Data loading function
   * 
   * @example
   * // Automatically loads data on mount
   * useEffect(() => {
   *   loadData();
   * }, [loadData]);
   */
  useEffect(() => { loadData(); }, [loadData]);

  /**
   * Opens the create user modal
   * 
   * This function initializes the user creation form by:
   * 1. Setting modal mode to 'create'
   * 2. Resetting form data to default values
   * 3. Opening the user modal
   * 
   * @returns {void} Does not return a value. Opens modal and updates state.
   * 
   * @example
   * // Open create user modal
   * handleCreateUser();
   */
  const handleCreateUser = () => {
    setModalMode('create');
    setFormData({ fullName: '', email: '', password: '', phone: '', role: 'lab_user', isActive: true });
    setShowModal(true);
  };

  /**
   * Opens the edit user modal with pre-filled data
   * 
   * This function prepares the user edit form by:
   * 1. Setting modal mode to 'edit'
   * 2. Setting selected user
   * 3. Pre-filling form data with user information
   * 4. Opening the user modal
   * 
   * @param {Object} user - User object to edit
   * @returns {void} Does not return a value. Opens modal and updates state.
   * 
   * @example
   * // Open edit modal for a user
   * handleEditUser(user);
   */
  const handleEditUser = (user) => {
    setModalMode('edit');
    setSelectedUser(user);
    setFormData({
      fullName: user.fullName,
      email: user.email,
      password: '',
      phone: user.phone || '',
      role: user.role || 'lab_user',
      isActive: user.isActive
    });
    setShowModal(true);
  };

  /**
   * Saves user data (create or update)
   * 
   * This function saves user information to the backend. It performs:
   * 1. Maps role name to role ID using ROLE_TO_ID mapping
   * 2. Creates new user if modalMode is 'create'
   * 3. Updates existing user if modalMode is 'edit'
   * 4. Removes password from update data if empty
   * 5. Reloads data and shows success notification
   * 
   * @returns {Promise<void>} Does not return a value. Updates backend and shows notifications.
   * 
   * @example
   * // Save user when form is submitted
   * await handleSaveUser();
   */
  const handleSaveUser = async () => {
    try {
      const roleIdToSend = ROLE_TO_ID[formData.role] || 4;
      const submitData = {
        ...formData,
        roleId: roleIdToSend,
        role: formData.role
      };

      if (modalMode === 'create') {
        await userManagementService.createUser(submitData);
      } else {
        const updateData = { ...submitData };
        if (!updateData.password) delete updateData.password;
        await userManagementService.updateUser(selectedUser.id, updateData);
      }

      await loadData();
      setShowModal(false);
      showSuccess('Lưu người dùng thành công!');
    } catch (err) {
      showError('Lỗi lưu dữ liệu: ' + (err.response?.data?.message || err.message));
    }
  };

  /**
   * Initiates user deletion workflow
   * 
   * This function opens the confirmation dialog for user deletion by:
   * 1. Setting user to delete
   * 2. Opening confirmation dialog
   * 
   * @param {Object} user - User object to delete
   * @returns {void} Does not return a value. Opens confirmation dialog.
   * 
   * @example
   * // Start deletion process
   * handleDeleteUser(user);
   */
  const handleDeleteUser = (user) => {
    setUserToDelete(user);
    setShowConfirmDialog(true);
  };

  /**
   * Confirms and executes user deletion
   * 
   * This function is called after user confirms deletion in the dialog.
   * It performs:
   * 1. Deletes user from backend
   * 2. Reloads data to refresh user list
   * 3. Closes confirmation dialog
   * 4. Shows success notification
   * 
   * @returns {Promise<void>} Does not return a value. Updates backend and shows notifications.
   * 
   * @example
   * // Confirm deletion after user clicks "Xác nhận"
   * await confirmDeleteUser();
   */
  const confirmDeleteUser = async () => {
    if (userToDelete) {
      await userManagementService.deleteUser(userToDelete.id);
      await loadData();
      setShowConfirmDialog(false);
      showSuccess(`Đã xóa người dùng "${userToDelete.fullName}" thành công!`);
    }
  };

  /**
   * Toggles user active/inactive status
   * 
   * This function changes a user's active status (activates or deactivates).
   * It performs:
   * 1. Toggles user status via API
   * 2. Reloads data to refresh user list
   * 3. Shows success notification with status change message
   * 
   * @param {Object} user - User object to toggle status for
   * @returns {Promise<void>} Does not return a value. Updates backend and shows notifications.
   * 
   * @example
   * // Toggle user status
   * await handleToggleStatus(user);
   */
  const handleToggleStatus = async (user) => {
    await userManagementService.toggleUserStatus(user, !user.isActive);
    await loadData();
    const statusText = user.isActive ? 'kích hoạt' : 'khóa';
    showSuccess(`Đã ${statusText} người dùng "${user.fullName}" thành công!`);
  };

  /**
   * Opens the change password modal
   * 
   * This function prepares the password change form by:
   * 1. Setting selected user
   * 2. Resetting password form data
   * 3. Opening password change modal
   * 
   * @param {Object} user - User object to change password for
   * @returns {void} Does not return a value. Opens modal and updates state.
   * 
   * @example
   * // Open password change modal
   * handleChangePassword(user);
   */
  const handleChangePassword = (user) => {
    setSelectedUser(user);
    setPasswordData({ newPassword: '', confirmPassword: '' });
    setShowPasswordModal(true);
  };

  /**
   * Saves new password for user
   * 
   * This function validates and saves a new password for a user. It performs:
   * 1. Validates password length (minimum 6 characters)
   * 2. Validates password confirmation match
   * 3. Updates password via API
   * 4. Closes modal and shows success notification
   * 
   * **Validation:**
   * - Password must be at least 6 characters
   * - Password and confirmation must match
   * 
   * @returns {Promise<void>} Does not return a value. Updates backend and shows notifications.
   * 
   * @example
   * // Save new password when form is submitted
   * await handleSavePassword();
   */
  const handleSavePassword = async () => {
    try {
      if (!passwordData.newPassword || passwordData.newPassword.length < 6) {
        showError('Mật khẩu phải có ít nhất 6 ký tự');
        return;
      }

      if (passwordData.newPassword !== passwordData.confirmPassword) {
        showError('Mật khẩu không khớp');
        return;
      }

      await userManagementService.changePassword(
        selectedUser.id,
        passwordData.newPassword,
        selectedUser
      );

      setShowPasswordModal(false);
      setPasswordData({ newPassword: '', confirmPassword: '' });
      showSuccess(`Đổi mật khẩu cho "${selectedUser.fullName}" thành công!`);
    } catch (err) {
      showError('Lỗi đổi mật khẩu: ' + (err.response?.data?.message || err.message));
    }
  };

  /**
   * Opens the doctor profile edit modal
   * 
   * This function loads and opens the doctor profile edit form. It performs:
   * 1. Fetches doctor profile by email from API
   * 2. Validates that doctor profile exists
   * 3. Sets selected profile and user
   * 4. Opens doctor profile modal
   * 
   * @param {Object} user - User object (must have email field)
   * @returns {Promise<void>} Does not return a value. Opens modal and updates state.
   * 
   * @example
   * // Open doctor profile edit modal
   * await handleEditDoctorProfile(user);
   */
  const handleEditDoctorProfile = async (user) => {
    try {
      setProfileLoading(true);
      // Get Doctor profile by email
      const doctorRes = await doctorService.getDoctorByEmail(user.email);

      if (!doctorRes.success || !doctorRes.data || doctorRes.data.length === 0) {
        showError('Không tìm thấy hồ sơ bác sĩ cho email này');
        setProfileLoading(false);
        return;
      }

      const doctorProfile = doctorRes.data[0]; // API returns array
      setSelectedProfile(doctorProfile);
      setSelectedUser(user); // Keep user info
      setShowDoctorProfileModal(true);
      setProfileLoading(false);
    } catch (error) {
      showError('Lỗi tải hồ sơ bác sĩ');
      setProfileLoading(false);
    }
  };

  /**
   * Saves doctor profile changes
   * 
   * This function saves changes made to a doctor profile. It performs:
   * 1. Validates doctor ID exists
   * 2. Updates doctor profile via API
   * 3. Closes modal and reloads data
   * 4. Shows success notification
   * 
   * @param {Object} formData - Doctor profile form data to save
   * @returns {Promise<void>} Does not return a value. Updates backend and shows notifications.
   * 
   * @example
   * // Save doctor profile changes
   * await handleSaveDoctorProfile(formData);
   */
  const handleSaveDoctorProfile = async (formData) => {
    try {
      const doctorId = selectedProfile.doctorId || selectedProfile.id;

      if (!doctorId) {
        showError('Không tìm thấy Doctor ID');
        return;
      }

      const result = await doctorService.updateDoctor(doctorId, formData);

      if (result.success) {
        showSuccess(`Cập nhật hồ sơ bác sĩ "${formData.fullName}" thành công!`);
        setShowDoctorProfileModal(false);
        setSelectedProfile(null);
      } else {
        showError(result.message || 'Lỗi cập nhật hồ sơ bác sĩ');
      }
    } catch (error) {
      showError('Lỗi cập nhật hồ sơ bác sĩ');
    }
  };

  // ✅ HANDLERS: Edit Lab User Profile (Added)
  const handleEditLabUserProfile = async (user) => {
    try {
      setProfileLoading(true);
      // Get Lab User profile by email
      const labUserRes = await testOrderService.getLabUserProfileByEmailGateway(user.email);

      if (!labUserRes.success || !labUserRes.data) {
        showError('Không tìm thấy hồ sơ lab user cho email này');
        setProfileLoading(false);
        return;
      }

      setSelectedProfile(labUserRes.data);
      setSelectedUser(user);
      setShowLabUserProfileModal(true);
      setProfileLoading(false);
    } catch (error) {
      showError('Lỗi tải hồ sơ lab user');
      setProfileLoading(false);
    }
  };

  /**
   * Saves lab user profile changes
   * 
   * This function saves changes made to a lab user profile. It performs:
   * 1. Validates lab user ID exists
   * 2. Updates lab user profile via API
   * 3. Closes modal and reloads data
   * 4. Shows success notification
   * 
   * @param {Object} formData - Lab user profile form data to save
   * @returns {Promise<void>} Does not return a value. Updates backend and shows notifications.
   * 
   * @example
   * // Save lab user profile changes
   * await handleSaveLabUserProfile(formData);
   */
  const handleSaveLabUserProfile = async (formData) => {
    try {
      const labUserId = selectedProfile.userId || selectedProfile.labUserId;

      if (!labUserId) {
        showError('Không tìm thấy Lab User ID');
        return;
      }

      const result = await testOrderService.updateLabUserProfile(labUserId, formData);

      if (result.success) {
        showSuccess(`Cập nhật hồ sơ lab user "${formData.fullName}" thành công!`);
        setShowLabUserProfileModal(false);
        setSelectedProfile(null);
      } else {
        showError(result.message || 'Lỗi cập nhật hồ sơ lab user');
      }
    } catch (error) {
      showError('Lỗi cập nhật hồ sơ lab user');
    }
  };

  const handleOpenUnifiedModal = async (user) => {
    setSelectedUser(user);
    setShowUnifiedModal(true);
    if (user.role === 'doctor') {
      setProfileLoading(true);
      try {
        const doctorRes = await doctorService.getDoctorByEmail(user.email);
        if (doctorRes.success && doctorRes.data && doctorRes.data.length > 0) {
          setSelectedProfile(doctorRes.data[0]);
        } else {
          setSelectedProfile(null);
        }
      } catch (err) {
        setSelectedProfile(null);
      }
      setProfileLoading(false);
    } else if (user.role === 'lab_user') {
      setProfileLoading(true);
      try {
        const labUserRes = await testOrderService.getLabUserProfileByEmailGateway(user.email);
        if (labUserRes.success && labUserRes.data) {
          setSelectedProfile(labUserRes.data);
        } else {
          setSelectedProfile(null);
        }
      } catch (err) {
        setSelectedProfile(null);
      }
      setProfileLoading(false);
    } else {
      setSelectedProfile(null);
    }
  };

  // UI Helpers
  /**
   * Gets Vietnamese role name from role key
   * 
   * This utility function converts role keys to Vietnamese display names.
   * 
   * **Role mappings:**
   * - 'admin' → "Admin"
   * - 'manager' → "Quản Lý"
   * - 'doctor' → "Bác sĩ"
   * - 'lab_user' → "Kỹ thuật Lab"
   * - 'patient' → "Bệnh nhân"
   * - 'receptionist' → "Lễ tân"
   * - Default → Original role value
   * 
   * @param {string} role - Role key to convert
   * @returns {string} Vietnamese role name or original role if not found
   * 
   * @example
   * getRoleName('doctor') // Returns: 'Bác sĩ'
   * getRoleName('lab_user') // Returns: 'Kỹ thuật Lab'
   */
  const getRoleName = (role) => {
    const names = {
      admin: 'Admin',
      manager: 'Quản Lý',
      doctor: 'Bác sĩ',
      lab_user: 'Kỹ thuật Lab',
      patient: 'Bệnh nhân',
      receptionist: 'Lễ tân'
    };
    return names[role] || role;
  };

  /**
   * Gets Bootstrap badge variant for role
   * 
   * This utility function returns the appropriate Bootstrap badge variant
   * color for each role type.
   * 
   * **Variant mappings:**
   * - 'admin' → 'danger' (red)
   * - 'manager' → 'warning' (yellow)
   * - 'doctor' → 'primary' (blue)
   * - 'lab_user' → 'info' (cyan)
   * - 'patient' → 'success' (green)
   * - 'receptionist' → 'secondary' (gray)
   * - Default → 'secondary'
   * 
   * @param {string} role - Role key to get variant for
   * @returns {string} Bootstrap badge variant name
   * 
   * @example
   * getRoleBadgeVariant('doctor') // Returns: 'primary'
   * getRoleBadgeVariant('admin') // Returns: 'danger'
   */
  const getRoleBadgeVariant = (role) => {
    const map = {
      admin: 'danger',
      manager: 'warning',
      doctor: 'primary',
      lab_user: 'info',
      patient: 'success',
      receptionist: 'secondary'
    };
    return map[role] || 'secondary';
  };

  if (loading) return <div className="text-center py-5 text-muted">Đang tải dữ liệu...</div>;

  return (
    <Container fluid className="py-4">
      <Row className="mb-4 align-items-center">
        <Col>
          <h2 className="mb-0 text-primary">Quản lý người dùng</h2>
          <small className="text-muted">Quản lý danh sách và phân quyền hệ thống</small>
        </Col>
        <Col xs="auto">
          <Button variant="primary" onClick={handleCreateUser} className="shadow-sm">
            <FaPlus className="me-1" /> + Thêm mới
          </Button>
        </Col>
      </Row>

      {error && <Alert variant="danger" onClose={() => setError(null)} dismissible>{error}</Alert>}

      {/* Filter Tabs */}
      <Tabs
        activeKey={activeTab}
        onSelect={setActiveTab}
        className="mb-4 border-bottom-0"
        variant="pills"
      >
        <Tab eventKey="all" title={`Tất cả (${users.length})`} />
        <Tab eventKey="admin" title={`Admin (${stats.byRole?.admin || 0})`} />
        <Tab eventKey="manager" title={`Quản lý (${stats.byRole?.manager || 0})`} />
        <Tab eventKey="doctor" title={`Bác sĩ (${stats.byRole?.doctor || 0})`} />
        <Tab eventKey="lab_user" title={`Kỹ thuật Lab (${stats.byRole?.lab_user || 0})`} />
        <Tab eventKey="patient" title={`Bệnh nhân (${stats.byRole?.patient || 0})`} />
        <Tab eventKey="receptionist" title={`Lễ tân (${stats.byRole?.receptionist || 0})`} />
      </Tabs>

      {/* Search Box */}
      <Row className="mb-3">
        <Col md={12}>
          <Form.Control
            placeholder="🔍 Tìm kiếm theo tên, email hoặc SĐT..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="shadow-sm"
          />
        </Col>
      </Row>

      {/* Main Table */}
      <Card className="shadow-sm border-0">
        <div className="table-responsive">
          <Table hover className="mb-0 align-middle">
            <thead className="bg-light text-muted">
              <tr>
                <th className="py-3 ps-3">Username / SĐT</th>
                <th className="py-3">Email</th>
                <th className="py-3">Vai trò</th>
                <th className="py-3">Trạng thái</th>
                <th className="py-3 text-center" style={{ minWidth: '220px', width: '220px' }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.length === 0 ? (
                <tr><td colSpan={5} className="text-center text-muted py-5">Không tìm thấy dữ liệu phù hợp</td></tr>
              ) : (
                filteredUsers.map(user => {
                  const isTargetAdmin = user.role === 'admin';
                  return (
                    <tr key={user.id}>
                      <td className="ps-3">
                        <div className="fw-bold text-dark">{user.fullName}</div>
                        {user.phone && <small className="text-muted">📞 {user.phone}</small>}
                      </td>
                      <td>{user.email}</td>
                      <td>
                        <Badge bg={getRoleBadgeVariant(user.role)} className="px-2 py-1">
                          {getRoleName(user.role)}
                        </Badge>
                      </td>
                      <td>
                        <Badge bg={user.isActive ? 'success' : 'secondary'} text="white" className="rounded-pill">
                          {user.isActive ? '● Hoạt động' : '● Đã khóa'}
                        </Badge>
                      </td>
                      <td className="text-center align-middle" style={{ width: '220px', verticalAlign: 'middle' }}>
                        {isTargetAdmin ? (
                          <div className="d-flex align-items-center justify-content-center" style={{ minHeight: '36px' }}>
                            <span className="text-muted fst-italic user-select-none" style={{ fontSize: '0.9em' }}>
                              <FaSystemLock className="me-1" />Tài khoản hệ thống
                            </span>
                          </div>
                        ) : (
                          <div className="d-flex justify-content-center align-items-center gap-1" style={{ minHeight: '36px', flexWrap: 'nowrap' }}>
                            {/* Unified User Info */}
                            <OverlayTrigger
                              overlay={<Tooltip>Thông tin người dùng</Tooltip>}
                              placement="top"
                            >
                              <Button
                                size="sm"
                                variant="outline-primary"
                                onClick={() => handleOpenUnifiedModal(user)}
                                className="d-flex align-items-center justify-content-center p-0"
                                style={{
                                  width: '36px',
                                  height: '36px',
                                  minWidth: '36px',
                                  minHeight: '36px',
                                  lineHeight: '1',
                                  flexShrink: 0
                                }}
                              >
                                <FaUser style={{ fontSize: '1rem', lineHeight: '1' }} />
                              </Button>
                            </OverlayTrigger>
                            {/* Lock/Unlock */}
                            <OverlayTrigger
                              overlay={<Tooltip>{user.isActive ? 'Khóa tài khoản' : 'Mở khóa tài khoản'}</Tooltip>}
                              placement="top"
                            >
                              <Button
                                size="sm"
                                variant={user.isActive ? "outline-secondary" : "outline-success"}
                                onClick={() => handleToggleStatus(user)}
                                className="d-flex align-items-center justify-content-center p-0"
                                style={{
                                  width: '36px',
                                  height: '36px',
                                  minWidth: '36px',
                                  minHeight: '36px',
                                  lineHeight: '1',
                                  flexShrink: 0
                                }}
                              >
                                {user.isActive ? (
                                  <FaLock style={{ fontSize: '1rem', lineHeight: '1' }} />
                                ) : (
                                  <FaUnlock style={{ fontSize: '1rem', lineHeight: '1' }} />
                                )}
                              </Button>
                            </OverlayTrigger>
                            {/* Delete */}
                            <OverlayTrigger
                              overlay={<Tooltip>Xóa vĩnh viễn</Tooltip>}
                              placement="top"
                            >
                              <Button
                                size="sm"
                                variant="outline-danger"
                                onClick={() => handleDeleteUser(user)}
                                className="d-flex align-items-center justify-content-center p-0"
                                style={{
                                  width: '36px',
                                  height: '36px',
                                  minWidth: '36px',
                                  minHeight: '36px',
                                  lineHeight: '1',
                                  flexShrink: 0
                                }}
                              >
                                <FaTrash style={{ fontSize: '1rem', lineHeight: '1' }} />
                              </Button>
                            </OverlayTrigger>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </Table>
        </div>
      </Card>

      {/* Account Edit Modal */}
      <Modal show={showModal} onHide={() => setShowModal(false)} backdrop="static" centered>
        <Modal.Header closeButton>
          <Modal.Title>{modalMode === 'create' ? 'Thêm người dùng mới' : 'Cập nhật thông tin'}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Họ tên <span className="text-danger">*</span></Form.Label>
              <Form.Control
                value={formData.fullName}
                onChange={e => setFormData({ ...formData, fullName: e.target.value })}
                required
                autoFocus
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Email <span className="text-danger">*</span></Form.Label>
              <Form.Control
                type="email"
                value={formData.email}
                onChange={e => setFormData({ ...formData, email: e.target.value })}
                required
                disabled={modalMode === 'edit'}
              />
            </Form.Group>

            {modalMode === 'create' && (
              <Form.Group className="mb-3">
                <Form.Label>Mật khẩu <span className="text-danger">*</span></Form.Label>
                <Form.Control
                  type="password"
                  value={formData.password}
                  onChange={e => setFormData({ ...formData, password: e.target.value })}
                  required
                  placeholder="Tối thiểu 6 ký tự"
                />
              </Form.Group>
            )}

            <Form.Group className="mb-3">
              <Form.Label>Số điện thoại</Form.Label>
              <Form.Control
                value={formData.phone}
                onChange={e => setFormData({ ...formData, phone: e.target.value })}
              />
            </Form.Group>

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Vai trò <span className="text-danger">*</span></Form.Label>
                  <Form.Select
                    value={formData.role}
                    onChange={e => setFormData({ ...formData, role: e.target.value })}
                  >
                    <option value="admin">Admin</option>
                    <option value="manager">Manager</option>
                    <option value="doctor">Bác sĩ</option>
                    <option value="lab_user">Lab User</option>
                    <option value="patient">Bệnh nhân</option>
                    <option value="receptionist">Lễ tân</option>
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Trạng thái</Form.Label>
                  <Form.Select
                    value={formData.isActive}
                    onChange={e => setFormData({ ...formData, isActive: e.target.value === 'true' })}
                  >
                    <option value={true}>Hoạt động</option>
                    <option value={false}>Khóa</option>
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowModal(false)}>Hủy</Button>
          <Button variant="primary" onClick={handleSaveUser}>
            {modalMode === 'create' ? 'Tạo mới' : 'Cập nhật'}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Password Modal */}
      <Modal show={showPasswordModal} onHide={() => setShowPasswordModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Đổi mật khẩu</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Alert variant="info" className="py-2 mb-3 small">
            Mật khẩu mới phải có ít nhất 6 ký tự.
          </Alert>
          <Form.Group className="mb-3">
            <Form.Label>Mật khẩu mới</Form.Label>
            <Form.Control
              type="password"
              value={passwordData.newPassword}
              onChange={e => setPasswordData({ ...passwordData, newPassword: e.target.value })}
              autoFocus
            />
          </Form.Group>
          <Form.Group>
            <Form.Label>Xác nhận mật khẩu</Form.Label>
            <Form.Control
              type="password"
              value={passwordData.confirmPassword}
              onChange={e => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowPasswordModal(false)}>Hủy</Button>
          <Button variant="warning" onClick={handleSavePassword}>Lưu mật khẩu</Button>
        </Modal.Footer>
      </Modal>

      {/* ✅ Doctor Profile Modal (Added) */}
      <Modal show={showDoctorProfileModal} onHide={() => setShowDoctorProfileModal(false)} centered size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            <FaFileMedical className="text-primary me-2" />
            Chỉnh sửa hồ sơ Bác sĩ
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedProfile && (
            <DoctorProfileForm
              profile={selectedProfile}
              onSave={handleSaveDoctorProfile}
              onCancel={() => setShowDoctorProfileModal(false)}
            />
          )}
        </Modal.Body>
      </Modal>

      {/* ✅ Lab User Profile Modal (Added) */}
      <Modal show={showLabUserProfileModal} onHide={() => setShowLabUserProfileModal(false)} centered size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            <FaClipboardList className="text-info me-2" />
            Chỉnh sửa hồ sơ Lab User
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedProfile && (
            <LabUserProfileForm
              profile={selectedProfile}
              labRooms={labRooms}
              onSave={handleSaveLabUserProfile}
              onCancel={() => setShowLabUserProfileModal(false)}
            />
          )}
        </Modal.Body>
      </Modal>

      {/* Confirm Dialog */}
      <ConfirmDialog
        show={showConfirmDialog}
        onHide={() => setShowConfirmDialog(false)}
        onConfirm={confirmDeleteUser}
        title="Xác nhận xóa"
        message={`Bạn có chắc chắn muốn xóa người dùng "${userToDelete?.fullName}"? Hành động này không thể hoàn tác.`}
        confirmText="Xóa vĩnh viễn"
        cancelText="Hủy bỏ"
        variant="danger"
      />

      <UnifiedUserInfoModal
        show={showUnifiedModal}
        onHide={() => setShowUnifiedModal(false)}
        user={selectedUser}
        labRooms={labRooms}
        profileData={selectedProfile}
        profileLoading={profileLoading}
        onSaveAccount={async (updatedUser) => {
          const roleIdToSend = ROLE_TO_ID[updatedUser.role] || 4;
          const submitData = {
            ...updatedUser,
            roleId: roleIdToSend
          };
          await userManagementService.updateUser(updatedUser.id, submitData);
          await loadData();
          showSuccess('Cập nhật tài khoản thành công!');
        }}
        onSaveProfile={async (updatedProfile) => {
          if (selectedUser.role === 'doctor') {
            const doctorId = selectedProfile.doctorId || selectedProfile.id;
            const res = await doctorService.updateDoctor(doctorId, updatedProfile);
            if (!res.success) throw new Error(res.message);
          } else if (selectedUser.role === 'lab_user') {
            const labUserId = selectedProfile.userId || selectedProfile.labUserId;
            const res = await testOrderService.updateLabUserProfile(labUserId, updatedProfile);
            if (!res.success) throw new Error(res.message);
          }
          await loadData();
          showSuccess('Cập nhật hồ sơ thành công!');
        }}
        onSavePassword={async (newPassword) => {
          await userManagementService.changePassword(
            selectedUser.id,
            newPassword,
            selectedUser
          );
          showSuccess(`Đổi mật khẩu cho "${selectedUser.fullName}" thành công!`);
        }}
      />
    </Container>
  );
};

export default UserManagement;