/**
 * Admin Patients Management Page
 * 
 * Comprehensive patient management page for the Blood Laboratory Management System.
 * Used by Admin, Manager, Doctor, and Lab User roles.
 * Provides full CRUD operations for patient records, search functionality,
 * and detailed patient information management.
 * 
 * @author Blood Laboratory Management Team
 * @version 1.0.0
 * @since 2024
 */

import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Table, Button, Form, Modal, Alert, Badge, InputGroup } from 'react-bootstrap';
import { 
  FaUsers, 
  FaSearch, 
  FaPlus, 
  FaEdit, 
  FaTrash, 
  FaPhone, 
  FaEnvelope, 
  FaMapMarkerAlt, 
  FaBirthdayCake,
  FaUser,
  FaUserTie,
  FaUserMd,
  FaCalendarAlt,
  FaFilter,
  FaDownload,
  FaPrint,
  FaSort,
  FaSortUp,
  FaSortDown
} from 'react-icons/fa';
import { patientService } from '../../services/patientService';
import { getAdminData } from '../../services/adminDataPrefetchService';
import Loading from '../../shared/components/Loading/Loading';
import ConfirmDialog from '../../shared/components/ConfirmDialog/ConfirmDialog';
import { authService } from '../../services/authService';
import useResponsive from '../../shared/hooks/useResponsive';
import { useDebounce } from '../../shared/hooks/useDebounce';
import { useAutoRefresh, dispatchRefreshEvent, setRefreshFlag } from '../../shared/hooks/useAutoRefresh';

const AdminPatients = () => {
  const { isMobile, isTablet } = useResponsive();
  const [patients, setPatients] = useState([]);
  const [filteredPatients, setFilteredPatients] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 300); // Debounce search với 300ms
  const [showModal, setShowModal] = useState(false);
  const [editingPatient, setEditingPatient] = useState(null);
  const [formData, setFormData] = useState({
    fullName: '',
    dateOfBirth: '',
    gender: 'male',
    address: '',
    phone: '',
    email: ''
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [sortField, setSortField] = useState('fullName');
  const [sortDirection, setSortDirection] = useState('asc');
  const [genderFilter, setGenderFilter] = useState('all');
  
  // Confirm dialog states
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [patientToDelete, setPatientToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const current = authService.getCurrentUser();
    const isAdmin = current && (String(current.role || '').toLowerCase().includes('admin') || Number(current.roleId) === 1);
    if (!isAdmin) {
      setError('Bạn không có quyền truy cập trang này.');
      setLoading(false);
      return;
    }
    loadPatients();
  }, []);

  /**
   * Effect hook: Filters patients when dependencies change
   * 
   * This effect automatically filters the patients list when:
   * - Patients data changes
   * - Search term changes (debounced)
   * - Gender filter changes
   * - Sort field or direction changes
   * 
   * @effect
   * @dependencies {Array} patients - Patients array
   * @dependencies {string} debouncedSearchTerm - Debounced search term
   * @dependencies {string} genderFilter - Gender filter value
   * @dependencies {string} sortField - Sort field name
   * @dependencies {string} sortDirection - Sort direction (asc/desc)
   * 
   * @example
   * // Automatically filters when dependencies change
   * useEffect(() => {
   *   filterPatients();
   * }, [patients, debouncedSearchTerm, genderFilter, sortField, sortDirection]);
   */
  useEffect(() => {
    filterPatients();
  }, [patients, debouncedSearchTerm, genderFilter, sortField, sortDirection]);

  /**
   * Loads all patient data for admin management
   * 
   * This function is the core data fetching function for the admin patients page.
   * It performs the following operations:
   * 1. Fetches patients from API (with caching support)
   * 2. Normalizes patient data to handle various field name formats
   * 3. Updates component state with fetched data
   * 
   * **Caching:**
   * - Uses cached data if available and forceFresh is false
   * - Fetches fresh data if cache is unavailable or forceFresh is true
   * 
   * @param {boolean} [forceFresh=false] - If true, bypasses cache and fetches fresh data
   * @returns {Promise<void>} Does not return a value. Updates component state with fetched data.
   * 
   * @example
   * // Load patient data with cache
   * await loadPatients();
   * 
   * // Load patient data without cache
   * await loadPatients(true);
   */
  const loadPatients = async (forceFresh = false) => {
    try {
      setLoading(true);
      setError(''); // Clear previous errors
      
      // Try to get from cache first for faster loading (unless forceFresh is true)
      if (!forceFresh) {
        const cachedResult = await getAdminData('patients', false);
        if (cachedResult.success && cachedResult.data) {
          const patientData = Array.isArray(cachedResult.data) ? cachedResult.data : [];
          setPatients(patientData);
          setLoading(false);
          // If from cache, refresh in background
          if (cachedResult.fromCache) {
            getAdminData('patients', true).then(result => {
              if (result.success && result.data) {
                setPatients(Array.isArray(result.data) ? result.data : []);
              }
            }).catch(() => {});
          }
          return;
        }
      }
      
      // Fallback to direct service call or force fresh fetch
      const result = await patientService.getAllPatients({ fetchAll: true });
      if (result.success) {
        const patientData = Array.isArray(result.data) ? result.data : [];
        setPatients(patientData);
      } else {
        setError(result.message || 'Lỗi tải danh sách bệnh nhân');
      }
    } catch (error) {
      setError('Lỗi tải danh sách bệnh nhân: ' + (error.message || 'Vui lòng thử lại sau'));
    } finally {
      setLoading(false);
    }
  };

  /**
   * Filters patients based on selected criteria
   * 
   * This function filters the patients list based on:
   * 1. Search term (name, phone, email, address)
   * 2. Gender filter (all, male, female)
   * 3. Sort field and direction
   * 
   * Updates filteredPatients state with the filtered and sorted results.
   * Uses debounced search term to optimize performance.
   * 
   * @returns {void} Does not return a value. Updates filteredPatients state.
   * 
   * @example
   * // Filter patients when filters change
   * filterPatients();
   */
  const filterPatients = () => {
    let filtered = patients;

    // Search filter - sử dụng debouncedSearchTerm
    if (debouncedSearchTerm) {
      filtered = filtered.filter(patient =>
        patient.fullName.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
        patient.phone.includes(debouncedSearchTerm) ||
        patient.email.toLowerCase().includes(debouncedSearchTerm.toLowerCase())
      );
    }

    // Gender filter
    if (genderFilter !== 'all') {
      filtered = filtered.filter(patient => {
        if (!patient.gender) return false;
        const patientGender = String(patient.gender).toLowerCase();
        const filterGender = String(genderFilter).toLowerCase();
        
        // Map various gender values
        const normalizeGender = (g) => {
          if (g === 'male' || g === 'nam') return 'male';
          if (g === 'female' || g === 'nữ' || g === 'nu') return 'female';
          return g;
        };
        
        return normalizeGender(patientGender) === normalizeGender(filterGender);
      });
    }

    // Sort
    filtered.sort((a, b) => {
      let aValue = a[sortField];
      let bValue = b[sortField];

      if (sortField === 'dateOfBirth') {
        aValue = new Date(aValue);
        bValue = new Date(bValue);
      }

      if (sortDirection === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    setFilteredPatients(filtered);
  };

  /**
   * Handles column sorting
   * 
   * This function is called when user clicks on a column header to sort.
   * It toggles sort direction if the same field is clicked, or sets a new
   * sort field with ascending direction.
   * 
   * @param {string} field - Field name to sort by
   * @returns {void} Does not return a value. Updates sortField and sortDirection state.
   * 
   * @example
   * // Sort by full name
   * handleSort('fullName');
   */
  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  /**
   * Gets sort icon for a column header
   * 
   * This helper function returns the appropriate sort icon (sort, sort-up, sort-down)
   * based on whether the column is currently sorted and in which direction.
   * 
   * @param {string} field - Field name to check sort status for
   * @returns {React.ReactNode} Sort icon component
   * 
   * @example
   * // Get sort icon for full name column
   * const icon = getSortIcon('fullName');
   */
  const getSortIcon = (field) => {
    if (sortField !== field) return <FaSort className="text-muted" />;
    return sortDirection === 'asc' ? <FaSortUp /> : <FaSortDown />;
  };

  /**
   * Handles patient form submission
   * 
   * This function is called when user submits the patient form (create or update).
   * It performs:
   * 1. Validates form data
   * 2. Creates new patient or updates existing patient via API
   * 3. Dispatches refresh events
   * 4. Reloads patient list
   * 5. Closes modal and shows success notification
   * 
   * @param {Event} e - Form submit event
   * @returns {Promise<void>} Does not return a value. Creates/updates patient and updates state.
   * 
   * @example
   * // Submit patient form
   * <Form onSubmit={handleSubmit}>
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingPatient) {
        const result = await patientService.updatePatient(editingPatient.id, formData);
        if (result.success) {
          setSuccess('Cập nhật bệnh nhân thành công');
          setRefreshFlag('patients');
          dispatchRefreshEvent('patients', 'updated', { patientId: editingPatient.id });
          loadPatients(true);
          setShowModal(false);
        } else {
          setError(result.message);
        }
      } else {
        const result = await patientService.createPatient(formData);
        if (result.success) {
          setSuccess('Thêm bệnh nhân thành công');
          setRefreshFlag('patients');
          dispatchRefreshEvent('patients', 'created', { patientId: result.data?.id });
          loadPatients(true);
          setShowModal(false);
        } else {
          setError(result.message);
        }
      }
    } catch (error) {
      setError('Lỗi lưu bệnh nhân');
    }
  };

  /**
   * Handles editing a patient
   * 
   * This function is called when user clicks to edit a patient. It populates
   * the form with the patient's data and opens the edit modal.
   * 
   * @param {Object} patient - Patient object to edit
   * @returns {void} Does not return a value. Opens edit modal with patient data.
   * 
   * @example
   * // Edit a patient
   * handleEdit(patient);
   */
  const handleEdit = (patient) => {
    setEditingPatient(patient);
    setFormData({
      fullName: patient.fullName,
      dateOfBirth: patient.dateOfBirth,
      gender: patient.gender,
      address: patient.address,
      phone: patient.phone,
      email: patient.email
    });
    setShowModal(true);
  };

  /**
   * Handles patient deletion request
   * 
   * This function is called when user clicks to delete a patient. It opens
   * a confirmation dialog before actually deleting.
   * 
   * @param {string|number} id - Patient ID to delete
   * @returns {void} Does not return a value. Opens confirmation dialog.
   * 
   * @example
   * // Request to delete a patient
   * handleDelete(patient.id);
   */
  const handleDelete = (id) => {
    setPatientToDelete(id);
    setShowConfirmDialog(true);
  };

  /**
   * Confirms and executes patient deletion
   * 
   * This function is called when user confirms patient deletion in the dialog.
   * It performs:
   * 1. Deletes patient via API
   * 2. Dispatches refresh events
   * 3. Reloads patient list
   * 4. Closes confirmation dialog and shows success notification
   * 
   * @returns {Promise<void>} Does not return a value. Deletes patient and updates state.
   * 
   * @example
   * // Confirm deletion
   * confirmDelete();
   */
  const confirmDelete = async () => {
    if (!patientToDelete) return;
    
    setIsDeleting(true);
    try {
      const result = await patientService.deletePatient(patientToDelete);
      if (result.success) {
        setSuccess('Xóa bệnh nhân thành công');
        setRefreshFlag('patients');
        dispatchRefreshEvent('patients', 'deleted', { patientId: patientToDelete });
        loadPatients(true);
        setShowConfirmDialog(false);
        setPatientToDelete(null);
      } else {
        setError(result.message);
      }
    } catch (error) {
      setError('Lỗi xóa bệnh nhân');
    } finally {
      setIsDeleting(false);
    }
  };

  /**
   * Handles adding a new patient
   * 
   * This function is called when user clicks to add a new patient. It resets
   * the form to empty state and opens the create modal.
   * 
   * @returns {void} Does not return a value. Opens create modal with empty form.
   * 
   * @example
   * // Add a new patient
   * handleAddNew();
   */
  const handleAddNew = () => {
    setEditingPatient(null);
    setFormData({
      fullName: '',
      dateOfBirth: '',
      gender: 'male',
      address: '',
      phone: '',
      email: ''
    });
    setShowModal(true);
  };

  /**
   * Handles exporting patients to Excel
   * 
   * This function exports the filtered patients list to an Excel file.
   * It creates a CSV-compatible format that can be opened in Excel.
   * 
   * **Export includes:**
   * - Patient ID, full name, gender, age
   * - Date of birth, phone, email, address
   * - All filtered patients
   * 
   * @returns {void} Does not return a value. Downloads Excel file.
   * 
   * @example
   * // Export patients to Excel
   * handleExportExcel();
   */
  const handleExportExcel = () => {
    if (filteredPatients.length === 0) {
      setError('Không có dữ liệu để xuất');
      return;
    }

    const headers = ['ID', 'Họ và tên', 'Giới tính', 'Tuổi', 'Ngày sinh', 'Số điện thoại', 'Email', 'Địa chỉ'];
    const rows = filteredPatients.map(patient => {
      const age = calculateAge(patient.dateOfBirth);
      const genderText = patient.gender === 'male' || patient.gender === 'nam' ? 'Nam' :
                        patient.gender === 'female' || patient.gender === 'nữ' || patient.gender === 'nu' ? 'Nữ' :
                        'Không rõ';
      const dateOfBirth = patient.dateOfBirth ? new Date(patient.dateOfBirth).toLocaleDateString('vi-VN') : 'N/A';
      
      return [
        patient.id || 'N/A',
        patient.fullName || 'N/A',
        genderText,
        age !== 'N/A' ? `${age} tuổi` : 'N/A',
        dateOfBirth,
        patient.phone || 'N/A',
        patient.email || 'N/A',
        patient.address || 'N/A'
      ];
    });

    // Convert to CSV with BOM for Excel UTF-8 support
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    // Create download link
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `danh-sach-benh-nhan-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setSuccess('Đã xuất danh sách bệnh nhân thành công!');
  };

  // Print list
  const handlePrintList = () => {
    if (filteredPatients.length === 0) {
      setError('Không có dữ liệu để in');
      return;
    }

    // Create print window
    const printWindow = window.open('', '_blank');
    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Danh sách bệnh nhân</title>
          <style>
            @media print {
              @page {
                margin: 1cm;
              }
              body {
                font-family: Arial, sans-serif;
                font-size: 12px;
              }
            }
            body {
              font-family: Arial, sans-serif;
              font-size: 12px;
              padding: 20px;
            }
            h1 {
              text-align: center;
              color: #1e40af;
              margin-bottom: 20px;
            }
            .info {
              margin-bottom: 20px;
              text-align: center;
              color: #6c757d;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 20px;
            }
            th, td {
              border: 1px solid #dee2e6;
              padding: 8px;
              text-align: left;
            }
            th {
              background-color: #1e40af;
              color: white;
              font-weight: bold;
            }
            tr:nth-child(even) {
              background-color: #f8f9fa;
            }
            .footer {
              margin-top: 30px;
              text-align: right;
              font-size: 11px;
              color: #6c757d;
            }
          </style>
        </head>
        <body>
          <h1>DANH SÁCH BỆNH NHÂN</h1>
          <div class="info">
            <p>Ngày in: ${new Date().toLocaleDateString('vi-VN')} ${new Date().toLocaleTimeString('vi-VN')}</p>
            <p>Tổng số: ${filteredPatients.length} bệnh nhân</p>
          </div>
          <table>
            <thead>
              <tr>
                <th>STT</th>
                <th>ID</th>
                <th>Họ và tên</th>
                <th>Giới tính</th>
                <th>Tuổi</th>
                <th>Ngày sinh</th>
                <th>Số điện thoại</th>
                <th>Email</th>
                <th>Địa chỉ</th>
              </tr>
            </thead>
            <tbody>
              ${filteredPatients.map((patient, index) => {
                const age = calculateAge(patient.dateOfBirth);
                const genderText = patient.gender === 'male' || patient.gender === 'nam' ? 'Nam' :
                                  patient.gender === 'female' || patient.gender === 'nữ' || patient.gender === 'nu' ? 'Nữ' :
                                  'Không rõ';
                const dateOfBirth = patient.dateOfBirth ? new Date(patient.dateOfBirth).toLocaleDateString('vi-VN') : 'N/A';
                
                return `
                  <tr>
                    <td>${index + 1}</td>
                    <td>${patient.id || 'N/A'}</td>
                    <td>${patient.fullName || 'N/A'}</td>
                    <td>${genderText}</td>
                    <td>${age !== 'N/A' ? `${age} tuổi` : 'N/A'}</td>
                    <td>${dateOfBirth}</td>
                    <td>${patient.phone || 'N/A'}</td>
                    <td>${patient.email || 'N/A'}</td>
                    <td>${patient.address || 'N/A'}</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
          <div class="footer">
            <p>Phòng Xét Nghiệm Máu - Hệ thống quản lý y tế</p>
          </div>
        </body>
      </html>
    `;

    printWindow.document.write(printContent);
    printWindow.document.close();
    
    // Wait for content to load then print
    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.print();
      }, 250);
    };
  };

  /**
   * Gets gender icon component
   * 
   * This helper function returns an icon component based on the patient's gender.
   * 
   * **Icon mappings:**
   * - Male/Nam: FaUser (blue)
   * - Female/Nữ: FaUser (pink)
   * - Other: FaUser (gray)
   * 
   * @param {string} gender - Gender string (male, female, nam, nữ, etc.)
   * @returns {React.ReactNode} Icon component with appropriate color
   * 
   * @example
   * // Get gender icon
   * const icon = getGenderIcon('male');
   */
  const getGenderIcon = (gender) => {
    if (!gender) return <FaUser className="text-muted" />;
    const genderLower = String(gender).toLowerCase();
    if (genderLower === 'male' || genderLower === 'nam') {
      return <FaUserTie className="text-primary" />;
    } else if (genderLower === 'female' || genderLower === 'nữ' || genderLower === 'nu') {
      return <FaUser className="text-pink" />;
    } else {
      return <FaUser className="text-muted" />;
    }
  };

  /**
   * Gets gender badge component
   * 
   * This helper function returns a Badge component with appropriate styling
   * based on the patient's gender.
   * 
   * **Badge mappings:**
   * - Male/Nam: 'primary' variant (blue)
   * - Female/Nữ: 'danger' variant (pink)
   * - Other: 'secondary' variant (gray)
   * 
   * @param {string} gender - Gender string (male, female, nam, nữ, etc.)
   * @returns {React.ReactNode} Badge component
   * 
   * @example
   * // Get gender badge
   * const badge = getGenderBadge('male');
   */
  const getGenderBadge = (gender) => {
    if (!gender) return <Badge bg="secondary">N/A</Badge>;
    const genderLower = String(gender).toLowerCase();
    if (genderLower === 'male' || genderLower === 'nam') {
      return <Badge bg="primary">Nam</Badge>;
    } else if (genderLower === 'female' || genderLower === 'nữ' || genderLower === 'nu') {
      return <Badge bg="pink">Nữ</Badge>;
    } else if (genderLower === 'unknown' || genderLower === 'không rõ') {
      return <Badge bg="secondary">Không rõ</Badge>;
    } else {
      return <Badge bg="secondary">{gender}</Badge>;
    }
  };

  /**
   * Calculates age from date of birth
   * 
   * This helper function calculates a person's age based on their date of birth.
   * Returns 'N/A' if date is invalid or missing.
   * 
   * @param {string|Date} dateOfBirth - Date of birth string or Date object
   * @returns {number|string} Age in years or 'N/A' if invalid
   * 
   * @example
   * // Calculate age
   * const age = calculateAge('1990-01-01');
   * // Returns: 34 (if current year is 2024)
   */
  const calculateAge = (dateOfBirth) => {
    if (!dateOfBirth) return 'N/A';
    
    try {
      const today = new Date();
      const birthDate = new Date(dateOfBirth);
      
      // Kiểm tra nếu date không hợp lệ
      if (isNaN(birthDate.getTime())) {
        // Invalid dateOfBirth
        return 'N/A';
      }
      
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      
      // Kiểm tra nếu age không hợp lệ
      if (isNaN(age) || age < 0 || age > 150) {
        return 'N/A';
      }
      
      return age;
    } catch (error) {
      // Error calculating age
      return 'N/A';
    }
  };

  if (loading) {
    return <Loading message="Đang tải danh sách bệnh nhân..." size="lg" />;
  }

  return (
    <Container fluid className="py-2 px-2" style={{ 
      overflowX: 'hidden', 
      maxWidth: '100%', 
      width: '100%',
      boxSizing: 'border-box'
    }}>
      <style>{`
        .lab-header-card {
          background: linear-gradient(135deg, #1e40af 0%, #1e3a8a 100%) !important;
          background-color: #1e40af !important;
          color: #ffffff !important;
          border: none !important;
        }
        .lab-header-card .card-body {
          background: transparent !important;
          color: #ffffff !important;
        }
        .lab-header-card h2,
        .lab-header-card p {
          color: #ffffff !important;
        }
      `}</style>
      {/* Header */}
      <Card className="mb-4 border-0 shadow-sm lab-header-card">
        <Card.Body className="p-2 p-md-3">
          <Row className="align-items-center">
            <Col xs={12} md>
              <h2 className="mb-1" style={{ fontWeight: '700', fontSize: 'clamp(1.1rem, 4vw, 1.5rem)' }}>
                <FaUsers className="me-2" />
                Quản lý bệnh nhân
              </h2>
              <p className="mb-0 d-none d-md-block" style={{ opacity: 0.9, fontSize: '0.9rem' }}>Quản lý thông tin bệnh nhân trong hệ thống</p>
            </Col>
            <Col xs={12} md="auto" className="mt-2 mt-md-0">
              <div className="d-flex flex-wrap gap-2">
                <Button 
                  variant="light" 
                  size="sm" 
                  className="flex-fill flex-md-grow-0" 
                  style={{ borderRadius: '8px', fontWeight: '600' }}
                  onClick={handleExportExcel}
                >
                  <FaDownload className="me-1 me-md-2" />
                  <span className="d-none d-sm-inline">Xuất Excel</span>
                  <span className="d-sm-none">Excel</span>
                </Button>
                <Button 
                  variant="light" 
                  size="sm" 
                  className="flex-fill flex-md-grow-0" 
                  style={{ borderRadius: '8px', fontWeight: '600' }}
                  onClick={handlePrintList}
                >
                  <FaPrint className="me-1 me-md-2" />
                  <span className="d-none d-sm-inline">In danh sách</span>
                  <span className="d-sm-none">In</span>
                </Button>
                <Button variant="light" size="sm" onClick={handleAddNew} className="flex-fill flex-md-grow-0" style={{ borderRadius: '8px', fontWeight: '600' }}>
                  <FaPlus className="me-1 me-md-2" />
                  <span className="d-none d-sm-inline">Thêm bệnh nhân</span>
                  <span className="d-sm-none">Thêm</span>
                </Button>
              </div>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* Alerts */}
      {error && (
        <Alert variant="danger" dismissible onClose={() => setError('')}>
          <FaUserMd className="me-2" />
          {error}
        </Alert>
      )}
      {success && (
        <Alert variant="success" dismissible onClose={() => setSuccess('')}>
          <FaUserMd className="me-2" />
          {success}
        </Alert>
      )}

      {/* Filters */}
      <Card className="mb-4 shadow-sm">
        <Card.Body className="p-2 p-md-3">
          <Row className="g-2 g-md-3">
            <Col xs={12} md={4}>
              <Form.Group className="mb-2 mb-md-0">
                <Form.Label className="fw-bold small">
                  <FaSearch className="me-1 me-md-2 text-primary" />
                  Tìm kiếm
                </Form.Label>
                <InputGroup size="sm">
                  <InputGroup.Text>
                    <FaSearch />
                  </InputGroup.Text>
                  <Form.Control
                    type="text"
                    placeholder="Tìm theo tên, SĐT, email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </InputGroup>
              </Form.Group>
            </Col>
            <Col xs={6} md={3}>
              <Form.Group className="mb-2 mb-md-0">
                <Form.Label className="fw-bold small">
                  <FaFilter className="me-1 me-md-2 text-primary" />
                  Giới tính
                </Form.Label>
                <Form.Select
                  size="sm"
                  value={genderFilter}
                  onChange={(e) => setGenderFilter(e.target.value)}
                >
                  <option value="all">Tất cả</option>
                  <option value="male">Nam</option>
                  <option value="female">Nữ</option>
                </Form.Select>
              </Form.Group>
            </Col>
            <Col xs={6} md={3}>
              <Form.Group className="mb-2 mb-md-0">
                <Form.Label className="fw-bold small">
                  <FaSort className="me-1 me-md-2 text-primary" />
                  Sắp xếp theo
                </Form.Label>
                <Form.Select
                  size="sm"
                  value={sortField}
                  onChange={(e) => setSortField(e.target.value)}
                >
                  <option value="fullName">Tên</option>
                  <option value="dateOfBirth">Ngày sinh</option>
                  <option value="createdAt">Ngày tạo</option>
                </Form.Select>
              </Form.Group>
            </Col>
            <Col xs={12} md={2} className="d-flex align-items-end">
              <Button
                variant="outline-primary"
                size="sm"
                onClick={() => {
                  setSearchTerm('');
                  setGenderFilter('all');
                  setSortField('fullName');
                  setSortDirection('asc');
                }}
                className="w-100"
              >
                <FaFilter className="me-1 me-md-2" />
                Làm mới
              </Button>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* Stats - Compact Layout with Primary Blue Background */}
      <style>{`
        .patient-stat-card {
          background: linear-gradient(135deg, #1e40af 0%, #1e3a8a 100%) !important;
          background-color: #1e40af !important;
          color: #ffffff !important;
          border: none !important;
          border-radius: 12px !important;
        }
        .patient-stat-card .card-body {
          color: #ffffff !important;
          background-color: transparent !important;
        }
        .patient-stat-card p,
        .patient-stat-card h4,
        .patient-stat-card svg {
          color: #ffffff !important;
        }
      `}</style>
      <Row className="mb-4 g-3">
        <Col xs={6} md={3}>
          <Card 
            className="border-0 shadow-sm h-100 patient-stat-card"
            style={{ 
              background: 'linear-gradient(135deg, #1e40af 0%, #1e3a8a 100%)',
              backgroundColor: '#1e40af',
              color: '#ffffff',
              borderRadius: '12px'
            }}
          >
            <Card.Body className="p-3" style={{ color: '#ffffff', backgroundColor: 'transparent' }}>
              <div className="d-flex align-items-center justify-content-between">
                <div className="flex-grow-1">
                  <div className="d-flex align-items-center mb-2">
                    <FaUsers className="me-2" style={{ fontSize: '1rem', opacity: 0.9, color: '#ffffff' }} />
                    <p className="mb-0" style={{ fontSize: '0.75rem', fontWeight: '500', color: '#ffffff' }}>
                      Tổng bệnh nhân
                    </p>
                  </div>
                  <h4 className="mb-0" style={{ fontSize: '1.75rem', fontWeight: '700', color: '#ffffff' }}>
                    {patients.length}
                  </h4>
                </div>
                <div 
                  className="d-flex align-items-center justify-content-center ms-2"
                  style={{
                    width: '50px',
                    height: '50px',
                    borderRadius: '12px',
                    background: 'rgba(255, 255, 255, 0.15)',
                    color: '#ffffff',
                    flexShrink: 0
                  }}
                >
                  <FaUsers style={{ fontSize: '1.5rem', color: '#ffffff' }} />
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col xs={6} md={3}>
          <Card 
            className="border-0 shadow-sm h-100 patient-stat-card"
            style={{ 
              background: 'linear-gradient(135deg, #1e40af 0%, #1e3a8a 100%)',
              backgroundColor: '#1e40af',
              color: '#ffffff',
              borderRadius: '12px'
            }}
          >
            <Card.Body className="p-3" style={{ color: '#ffffff', backgroundColor: 'transparent' }}>
              <div className="d-flex align-items-center justify-content-between">
                <div className="flex-grow-1">
                  <div className="d-flex align-items-center mb-2">
                    <FaUserTie className="me-2" style={{ fontSize: '1rem', opacity: 0.9, color: '#ffffff' }} />
                    <p className="mb-0" style={{ fontSize: '0.75rem', fontWeight: '500', color: '#ffffff' }}>
                      Nam
                    </p>
                  </div>
                  <h4 className="mb-0" style={{ fontSize: '1.75rem', fontWeight: '700', color: '#ffffff' }}>
                    {patients.filter(p => {
                      const g = String(p.gender || '').toLowerCase();
                      return g === 'male' || g === 'nam';
                    }).length}
                  </h4>
                </div>
                <div 
                  className="d-flex align-items-center justify-content-center ms-2"
                  style={{
                    width: '50px',
                    height: '50px',
                    borderRadius: '12px',
                    background: 'rgba(255, 255, 255, 0.15)',
                    color: '#ffffff',
                    flexShrink: 0
                  }}
                >
                  <FaUserTie style={{ fontSize: '1.5rem', color: '#ffffff' }} />
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col xs={6} md={3}>
          <Card 
            className="border-0 shadow-sm h-100 patient-stat-card"
            style={{ 
              background: 'linear-gradient(135deg, #1e40af 0%, #1e3a8a 100%)',
              backgroundColor: '#1e40af',
              color: '#ffffff',
              borderRadius: '12px'
            }}
          >
            <Card.Body className="p-3" style={{ color: '#ffffff', backgroundColor: 'transparent' }}>
              <div className="d-flex align-items-center justify-content-between">
                <div className="flex-grow-1">
                  <div className="d-flex align-items-center mb-2">
                    <FaUser className="me-2" style={{ fontSize: '1rem', opacity: 0.9, color: '#ffffff' }} />
                    <p className="mb-0" style={{ fontSize: '0.75rem', fontWeight: '500', color: '#ffffff' }}>
                      Nữ
                    </p>
                  </div>
                  <h4 className="mb-0" style={{ fontSize: '1.75rem', fontWeight: '700', color: '#ffffff' }}>
                    {patients.filter(p => {
                      const g = String(p.gender || '').toLowerCase();
                      return g === 'female' || g === 'nữ' || g === 'nu';
                    }).length}
                  </h4>
                </div>
                <div 
                  className="d-flex align-items-center justify-content-center ms-2"
                  style={{
                    width: '50px',
                    height: '50px',
                    borderRadius: '12px',
                    background: 'rgba(255, 255, 255, 0.15)',
                    color: '#ffffff',
                    flexShrink: 0
                  }}
                >
                  <FaUser style={{ fontSize: '1.5rem', color: '#ffffff' }} />
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col xs={6} md={3}>
          <Card 
            className="border-0 shadow-sm h-100 patient-stat-card"
            style={{ 
              background: 'linear-gradient(135deg, #1e40af 0%, #1e3a8a 100%)',
              backgroundColor: '#1e40af',
              color: '#ffffff',
              borderRadius: '12px'
            }}
          >
            <Card.Body className="p-3" style={{ color: '#ffffff', backgroundColor: 'transparent' }}>
              <div className="d-flex align-items-center justify-content-between">
                <div className="flex-grow-1">
                  <div className="d-flex align-items-center mb-2">
                    <FaCalendarAlt className="me-2" style={{ fontSize: '1rem', opacity: 0.9, color: '#ffffff' }} />
                    <p className="mb-0" style={{ fontSize: '0.75rem', fontWeight: '500', color: '#ffffff' }}>
                      Hiển thị
                    </p>
                  </div>
                  <h4 className="mb-0" style={{ fontSize: '1.75rem', fontWeight: '700', color: '#ffffff' }}>
                    {filteredPatients.length}
                  </h4>
                </div>
                <div 
                  className="d-flex align-items-center justify-content-center ms-2"
                  style={{
                    width: '50px',
                    height: '50px',
                    borderRadius: '12px',
                    background: 'rgba(255, 255, 255, 0.15)',
                    color: '#ffffff',
                    flexShrink: 0
                  }}
                >
                  <FaCalendarAlt style={{ fontSize: '1.5rem', color: '#ffffff' }} />
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Patients Table */}
      <Card className="shadow-sm">
        <Card.Header className="bg-primary text-white">
          <h5 className="mb-0">
            <FaUsers className="me-2" />
            Danh sách bệnh nhân ({filteredPatients.length})
          </h5>
        </Card.Header>
        <Card.Body className="p-0">
          {filteredPatients.length > 0 ? (
            <div className="table-responsive" style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
              <Table hover className="mb-0 align-middle" style={{ tableLayout: 'fixed', minWidth: '800px' }}>
                <thead className="table-light">
                  <tr>
                    <th 
                      className="sortable border-0"
                      onClick={() => handleSort('fullName')}
                      style={{cursor: 'pointer', width: '20%', padding: '8px 12px', fontSize: '0.875rem'}}
                    >
                      <div className="d-flex align-items-center">
                        <FaUser className="me-1 me-md-2" />
                        <span className="d-none d-md-inline">Tên bệnh nhân</span>
                        <span className="d-md-none">Tên</span>
                        {getSortIcon('fullName')}
                      </div>
                    </th>
                    <th className="border-0 text-center" style={{ width: '10%', padding: '8px 12px', fontSize: '0.875rem' }}>
                      <span className="d-none d-md-inline">Giới tính</span>
                      <span className="d-md-none">GT</span>
                    </th>
                    <th 
                      className="sortable border-0 text-center"
                      onClick={() => handleSort('dateOfBirth')}
                      style={{cursor: 'pointer', width: '10%', padding: '8px 12px', fontSize: '0.875rem'}}
                    >
                      <div className="d-flex align-items-center justify-content-center">
                        <FaBirthdayCake className="me-1 me-md-2" />
                        <span className="d-none d-md-inline">Tuổi</span>
                        <span className="d-md-none">Tuổi</span>
                        {getSortIcon('dateOfBirth')}
                      </div>
                    </th>
                    <th className="border-0" style={{ width: '20%', padding: '8px 12px', fontSize: '0.875rem' }}>
                      <span className="d-none d-md-inline">Liên hệ</span>
                      <span className="d-md-none">Liên hệ</span>
                    </th>
                    <th className="border-0 d-none d-lg-table-cell" style={{ width: '25%', padding: '8px 12px', fontSize: '0.875rem' }}>Địa chỉ</th>
                    <th className="text-center border-0" style={{ width: '15%', padding: '8px 12px', fontSize: '0.875rem' }}>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPatients.map((patient) => (
                    <tr key={patient.id}>
                      <td style={{ padding: '12px', verticalAlign: 'middle' }}>
                        <div className="d-flex align-items-center">
                          <div className="patient-avatar me-2 me-md-3 d-none d-sm-block">
                            {getGenderIcon(patient.gender)}
                          </div>
                          <div>
                            <div className="fw-bold" style={{ whiteSpace: 'nowrap', fontSize: 'clamp(0.875rem, 2vw, 1rem)' }}>{patient.fullName}</div>
                            <small className="text-muted d-none d-md-inline">ID: {patient.id}</small>
                          </div>
                        </div>
                      </td>
                      <td className="text-center" style={{ padding: '12px', verticalAlign: 'middle' }}>{getGenderBadge(patient.gender)}</td>
                      <td className="text-center" style={{ padding: '12px', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                        <div className="d-flex align-items-center justify-content-center">
                          <FaBirthdayCake className="me-1 text-muted" />
                          {calculateAge(patient.dateOfBirth)} tuổi
                        </div>
                      </td>
                      <td style={{ padding: '12px', verticalAlign: 'middle' }}>
                        <div>
                          {patient.phone && (
                            <div className="d-flex align-items-center mb-1 mb-md-0" style={{ whiteSpace: 'nowrap' }}>
                              <FaPhone className="me-1 text-success d-none d-sm-inline" style={{fontSize: '0.8rem'}} />
                              <small style={{ fontSize: 'clamp(0.75rem, 2vw, 0.875rem)' }}>{patient.phone}</small>
                            </div>
                          )}
                          {patient.email && (
                            <div className="d-flex align-items-center d-none d-md-flex" style={{ whiteSpace: 'nowrap' }}>
                              <FaEnvelope className="me-1 text-primary" style={{fontSize: '0.8rem'}} />
                              <small className="text-truncate" style={{ fontSize: 'clamp(0.75rem, 2vw, 0.875rem)' }}>{patient.email}</small>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="d-none d-lg-table-cell" style={{ padding: '12px', verticalAlign: 'middle' }}>
                        <div className="d-flex align-items-center">
                          <FaMapMarkerAlt className="me-1 text-muted" style={{fontSize: '0.8rem', flexShrink: 0}} />
                          <small className="text-truncate">
                            {patient.address || 'Chưa cập nhật'}
                          </small>
                        </div>
                      </td>
                      <td className="text-center" style={{ padding: '12px', verticalAlign: 'middle' }}>
                        <div className="d-flex justify-content-center gap-1 gap-md-2">
                          <Button
                            variant="outline-primary"
                            size="sm"
                            onClick={() => handleEdit(patient)}
                            title="Chỉnh sửa"
                            style={{ minWidth: '36px', fontSize: 'clamp(0.75rem, 2vw, 0.875rem)' }}
                          >
                            <FaEdit />
                            <span className="d-none d-lg-inline ms-1">Sửa</span>
                          </Button>
                          <Button
                            variant="outline-danger"
                            size="sm"
                            onClick={() => handleDelete(patient.id)}
                            title="Xóa"
                            style={{ minWidth: '36px', fontSize: 'clamp(0.75rem, 2vw, 0.875rem)' }}
                          >
                            <FaTrash />
                            <span className="d-none d-lg-inline ms-1">Xóa</span>
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-5">
              <FaUsers className="text-muted mb-3" style={{fontSize: '3rem'}} />
              <h5 className="text-muted">Không có bệnh nhân nào</h5>
              <p className="text-muted">Thử thay đổi bộ lọc hoặc thêm bệnh nhân mới</p>
            </div>
          )}
        </Card.Body>
      </Card>

      {/* Add/Edit Modal */}
      <Modal show={showModal} onHide={() => setShowModal(false)} size="lg" centered>
        <Modal.Header closeButton className="bg-primary text-white">
          <Modal.Title>
            <FaUserMd className="me-2" />
            {editingPatient ? 'Chỉnh sửa bệnh nhân' : 'Thêm bệnh nhân mới'}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form onSubmit={handleSubmit}>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label className="fw-bold">Họ và tên *</Form.Label>
                  <Form.Control
                    type="text"
                    value={formData.fullName}
                    onChange={(e) => setFormData({...formData, fullName: e.target.value})}
                    required
                    placeholder="Nhập họ và tên"
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label className="fw-bold">Ngày sinh *</Form.Label>
                  <Form.Control
                    type="date"
                    value={formData.dateOfBirth}
                    onChange={(e) => setFormData({...formData, dateOfBirth: e.target.value})}
                    required
                  />
                </Form.Group>
              </Col>
            </Row>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label className="fw-bold">Giới tính *</Form.Label>
                  <Form.Select
                    value={formData.gender}
                    onChange={(e) => setFormData({...formData, gender: e.target.value})}
                  >
                    <option value="male">Nam</option>
                    <option value="female">Nữ</option>
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label className="fw-bold">Số điện thoại</Form.Label>
                  <Form.Control
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    placeholder="Nhập số điện thoại"
                  />
                </Form.Group>
              </Col>
            </Row>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label className="fw-bold">Email</Form.Label>
                  <Form.Control
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    placeholder="Nhập email"
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label className="fw-bold">Địa chỉ</Form.Label>
                  <Form.Control
                    type="text"
                    value={formData.address}
                    onChange={(e) => setFormData({...formData, address: e.target.value})}
                    placeholder="Nhập địa chỉ"
                  />
                </Form.Group>
              </Col>
            </Row>
          </Form>
        </Modal.Body>
        <Modal.Footer className="bg-light">
          <Button variant="secondary" onClick={() => setShowModal(false)}>
            <FaUser className="me-2" />
            Hủy
          </Button>
          <Button variant="primary" onClick={handleSubmit}>
            <FaUserMd className="me-2" />
            {editingPatient ? 'Cập nhật' : 'Thêm mới'}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        show={showConfirmDialog}
        onHide={() => {
          setShowConfirmDialog(false);
          setPatientToDelete(null);
        }}
        onConfirm={confirmDelete}
        title="Xác nhận xóa bệnh nhân"
        message="Bạn có chắc chắn muốn xóa bệnh nhân này? Hành động này không thể hoàn tác."
        confirmText="Xóa"
        cancelText="Hủy"
        variant="danger"
        isLoading={isDeleting}
      />
    </Container>
  );
};

export default AdminPatients;