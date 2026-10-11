/**
 * Invoices Management Page
 * 
 * Comprehensive invoice management page for the Blood Laboratory Management System.
 * Provides full CRUD operations for invoices, payment tracking,
 * and billing management with advanced filtering and reporting capabilities.
 * 
 * @author Blood Laboratory Management Team
 * @version 1.0.0
 * @since 2024
 */

import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Table, Button, Form, Alert, Badge, InputGroup, Modal, ButtonGroup, Pagination } from 'react-bootstrap';
import { 
  FaReceipt, 
  FaSearch, 
  FaFilter, 
  FaPlus, 
  FaEye, 
  FaUser, 
  FaCalendarAlt, 
  FaClock, 
  FaCheckCircle, 
  FaExclamationTriangle, 
  FaTimes, 
  FaDownload, 
  FaPrint,
  FaSort,
  FaSortUp,
  FaSortDown,
  FaDollarSign,
  FaCreditCard,
  FaMoneyBillWave,
  FaFileInvoiceDollar,
  FaChartLine,
  FaFileAlt,
  FaClipboardList
} from 'react-icons/fa';
import { invoiceService } from '../../services/invoiceService';
import { patientService } from '../../services/patientService';
import { medicalService } from '../../services/medicalService';
import { getAdminData } from '../../services/adminDataPrefetchService';
import { StatusBadge, getStatusLabel } from '../../shared/utils/status/statusHelper';
import { authService } from '../../services/authService';
import useResponsive from '../../shared/hooks/useResponsive';
import { useAutoRefresh, dispatchRefreshEvent, setRefreshFlag } from '../../shared/hooks/useAutoRefresh';

const AdminInvoices = () => {
  const { isMobile, isTablet } = useResponsive();
  const [invoices, setInvoices] = useState([]);
  const [filteredInvoices, setFilteredInvoices] = useState([]);
  const [patients, setPatients] = useState([]);
  const [patientCache, setPatientCache] = useState(new Map()); // Cache for fetched patients
  const [fetchingPatients, setFetchingPatients] = useState(new Set()); // Track ongoing fetches
  const [fetchedPatientIds, setFetchedPatientIds] = useState(new Set()); // Track already attempted fetches
  const [services, setServices] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState(null);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState('invoiceDate');
  const [sortDirection, setSortDirection] = useState('desc');
  const [formData, setFormData] = useState({
    patientId: '',
    items: [{ serviceId: '', quantity: 1, price: 0 }]
  });
  const [paymentData, setPaymentData] = useState({
    amount: 0,
    method: 'cash',
    notes: ''
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  /**
   * Loads all invoice data for admin management
   * 
   * This function is the core data fetching function for the admin invoices page.
   * It performs the following operations:
   * 1. Fetches invoices from API (with caching support)
   * 2. Fetches patients and services for enrichment
   * 3. Enriches invoices with patient names and service information
   * 4. Updates component state with fetched data
   * 
   * **Caching:**
   * - Uses cached data if available and forceFresh is false
   * - Fetches fresh data if cache is unavailable or forceFresh is true
   * 
   * @param {boolean} [forceFresh=false] - If true, bypasses cache and fetches fresh data
   * @returns {Promise<void>} Does not return a value. Updates component state with fetched data.
   * 
   * @example
   * // Load invoice data with cache
   * await loadData();
   * 
   * // Load invoice data without cache
   * await loadData(true);
   */
  const loadData = async (forceFresh = false) => {
    try {
      setLoading(true);
      setError('');
      
      // Try to get from cache first for faster loading (unless forceFresh is true)
      const [invoicesCached, patientsCached, servicesCached] = forceFresh
        ? [null, null, null]
        : await Promise.all([
            getAdminData('invoices', false),
            getAdminData('patients', false),
            getAdminData('services', false)
          ]);

      // Load invoices
      if (!forceFresh && invoicesCached?.success && invoicesCached.data) {
        const invoiceData = Array.isArray(invoicesCached.data) ? invoicesCached.data : [];
        setInvoices(invoiceData);
        // Refresh in background if from cache
        if (invoicesCached.fromCache) {
          getAdminData('invoices', true).then(result => {
            if (result.success && result.data) {
              setInvoices(Array.isArray(result.data) ? result.data : []);
            }
          }).catch(() => {});
        }
      } else {
        const invoicesResult = await invoiceService.getAllInvoices({ fetchAll: true });
        if (invoicesResult.success) {
          const invoiceData = Array.isArray(invoicesResult.data) ? invoicesResult.data : [];
          setInvoices(invoiceData);
        } else {
          setError(invoicesResult.message || 'Lỗi tải danh sách hóa đơn');
        }
      }

      // Load patients
      if (patientsCached.success && patientsCached.data) {
        const patientData = Array.isArray(patientsCached.data) ? patientsCached.data : [];
        const normalizedPatients = patientData.map(p => ({
          ...p,
          id: p.id || p.Id || p.patientId || p.PatientId || '',
          fullName: p.fullName || p.Fullname || p.fullname || p.full_name || 
                   p.FullName || p.name || p.Name || p.displayName || p.display_name || 'N/A',
          guidId: p.guidId || p.GuidId || p.guid_id || p.Guid_Id || null,
          raw: p
        }));
        setPatients(normalizedPatients);
        if (patientsCached.fromCache) {
          getAdminData('patients', true).then(result => {
            if (result.success && result.data) {
              const normalized = result.data.map(p => ({
                ...p,
                id: p.id || p.Id || p.patientId || p.PatientId || '',
                fullName: p.fullName || p.Fullname || p.fullname || p.full_name || 
                         p.FullName || p.name || p.Name || p.displayName || p.display_name || 'N/A',
                guidId: p.guidId || p.GuidId || p.guid_id || p.Guid_Id || null,
                raw: p
              }));
              setPatients(normalized);
            }
          }).catch(() => {});
        }
      } else {
        const patientsResult = await patientService.getAllPatients({ fetchAll: true });
        if (patientsResult.success) {
          const patientData = Array.isArray(patientsResult.data) ? patientsResult.data : [];
          const normalizedPatients = patientData.map(p => ({
            ...p,
            id: p.id || p.Id || p.patientId || p.PatientId || '',
            fullName: p.fullName || p.Fullname || p.fullname || p.full_name || 
                     p.FullName || p.name || p.Name || p.displayName || p.display_name || 'N/A',
            guidId: p.guidId || p.GuidId || p.guid_id || p.Guid_Id || null,
            raw: p
          }));
          setPatients(normalizedPatients);
        }
      }

      // Load services
      if (servicesCached.success && servicesCached.data) {
        const serviceData = Array.isArray(servicesCached.data) ? servicesCached.data : [];
        setServices(serviceData);
        if (servicesCached.fromCache) {
          getAdminData('services', true).then(result => {
            if (result.success && result.data) {
              setServices(Array.isArray(result.data) ? result.data : []);
            }
          }).catch(() => {});
        }
      } else {
        const servicesResult = await medicalService.getAllServices({ fetchAll: true });
        if (servicesResult.success) {
          const serviceData = Array.isArray(servicesResult.data) ? servicesResult.data : [];
          setServices(serviceData);
        }
      }

    } catch (error) {
      setError('Lỗi tải dữ liệu: ' + (error.message || 'Lỗi không xác định'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const current = authService.getCurrentUser();
    const isAdmin = current && (String(current.role || '').toLowerCase().includes('admin') || Number(current.roleId) === 1);
    if (!isAdmin) {
      setError('Bạn không có quyền truy cập trang này.');
      setLoading(false);
      return;
    }
    loadData();
  }, []);

  // Auto-refresh hook
  useAutoRefresh(loadData, {
    eventName: 'invoicesChanged',
    flagKey: 'shouldRefreshInvoices'
  });

  useEffect(() => {
    filterInvoices();
    setCurrentPage(1); // Reset to first page when filters change
  }, [invoices, selectedMonth, statusFilter, searchTerm, sortField, sortDirection]);

  /**
   * Filters invoices based on selected criteria
   * 
   * This function filters the invoices list based on:
   * 1. Selected month filter
   * 2. Status filter (all, paid, pending, etc.)
   * 3. Search term (invoice number, patient name, date, amount)
   * 4. Sort field and direction
   * 
   * Updates filteredInvoices state with the filtered and sorted results.
   * 
   * @returns {void} Does not return a value. Updates filteredInvoices state.
   * 
   * @example
   * // Filter invoices when filters change
   * filterInvoices();
   */
  const filterInvoices = () => {
    let filtered = invoices;

    // Filter by month
    if (selectedMonth) {
      filtered = filtered.filter(invoice => 
        invoice.invoiceDate && invoice.invoiceDate.startsWith(selectedMonth)
      );
    }

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(invoice => invoice.status === statusFilter);
    }

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(invoice => {
        const patient = patients.find(p => p.id === invoice.patientId);
        return (
          invoice.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (patient && patient.fullName.toLowerCase().includes(searchTerm.toLowerCase())) ||
          invoice.invoiceDate.includes(searchTerm) ||
          invoice.totalAmount.toString().includes(searchTerm)
        );
      });
    }

    // Sort
    filtered.sort((a, b) => {
      let aValue = a[sortField];
      let bValue = b[sortField];

      if (sortField === 'invoiceDate' || sortField === 'createdAt') {
        aValue = new Date(aValue);
        bValue = new Date(bValue);
      }

      if (sortDirection === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    setFilteredInvoices(filtered);
  };

  // Calculate pagination
  const totalPages = Math.ceil(filteredInvoices.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedInvoices = filteredInvoices.slice(startIndex, endIndex);

  /**
   * Handles pagination page change
   * 
   * This function is called when user navigates to a different page in the
   * paginated invoice list. It updates the current page and scrolls to top.
   * 
   * @param {number} page - Page number to navigate to
   * @returns {void} Does not return a value. Updates currentPage state and scrolls.
   * 
   * @example
   * // Change to page 2
   * handlePageChange(2);
   */
  const handlePageChange = (page) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  /**
   * Handles items per page change
   * 
   * This function is called when user changes the number of items displayed
   * per page. It updates itemsPerPage and resets to page 1.
   * 
   * @param {Event} e - Change event from select input
   * @returns {void} Does not return a value. Updates itemsPerPage and currentPage state.
   * 
   * @example
   * // Change items per page to 20
   * <select onChange={handleItemsPerPageChange}>
   */
  const handleItemsPerPageChange = (e) => {
    setItemsPerPage(Number(e.target.value));
    setCurrentPage(1);
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
   * // Sort by invoice date
   * handleSort('invoiceDate');
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
   * // Get sort icon for invoice date column
   * const icon = getSortIcon('invoiceDate');
   */
  const getSortIcon = (field) => {
    if (sortField !== field) return <FaSort className="text-muted" />;
    return sortDirection === 'asc' ? <FaSortUp /> : <FaSortDown />;
  };

  /**
   * Fetches patient by ID from backend if not found locally
   * 
   * This function attempts to fetch a patient from the backend when the patient
   * is not found in the local patients array. It uses caching to avoid duplicate
   * API calls and handles various patient ID formats (PAT-xxxxx, GUID, etc.).
   * 
   * **Caching:**
   * - Checks patientCache first before making API call
   * - Tracks ongoing fetches to prevent duplicate requests
   * - Adds fetched patient to cache and patients array
   * 
   * @param {string} patientId - Patient ID to fetch (can be PAT-xxxxx or GUID)
   * @returns {Promise<Object|null>} Patient object or null if not found
   * 
   * @example
   * // Fetch patient by ID
   * const patient = await fetchPatientById('PAT-12345');
   */
  const fetchPatientById = async (patientId) => {
    if (!patientId || fetchingPatients.has(patientId)) return null;
    
    // Check cache first
    if (patientCache.has(patientId)) {
      return patientCache.get(patientId);
    }
    
    setFetchingPatients(prev => new Set(prev).add(patientId));
    
    try {
      // Try to fetch by ID (could be PAT-xxxxx or GUID)
      // Note: Backend may not support GUID lookup, so this might fail for GUIDs
      const result = await patientService.getPatientById(patientId);
      
      if (result && result.success && result.data) {
        const fetchedPatient = result.data;
        // Normalize the fetched patient
        const normalized = {
          ...fetchedPatient,
          id: fetchedPatient.id || fetchedPatient.Id || fetchedPatient.patientId || fetchedPatient.PatientId || patientId,
          fullName: fetchedPatient.fullName || fetchedPatient.Fullname || fetchedPatient.fullname || 
                   fetchedPatient.full_name || fetchedPatient.FullName || fetchedPatient.name || 
                   fetchedPatient.Name || fetchedPatient.displayName || fetchedPatient.display_name || 'N/A',
          guidId: fetchedPatient.guidId || fetchedPatient.GuidId || (fetchedPatient.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(fetchedPatient.id) ? fetchedPatient.id : null),
          raw: fetchedPatient
        };
        
        // Add to cache
        setPatientCache(prev => {
          const newCache = new Map(prev);
          newCache.set(patientId, normalized);
          return newCache;
        });
        
        // Also add to patients array if not already there
        setPatients(prev => {
          const exists = prev.some(p => {
            const pId = p.id || p.Id || '';
            const pGuidId = p.guidId || p.GuidId || '';
            return pId === normalized.id || pGuidId === patientId || String(pGuidId) === String(patientId);
          });
          if (exists) return prev;
          return [...prev, normalized];
        });
        
        return normalized;
      }
    } catch (error) {
      // Silently fail - patient not found
    } finally {
      setFetchingPatients(prev => {
        const newSet = new Set(prev);
        newSet.delete(patientId);
        return newSet;
      });
    }
    
    return null;
  };

  /**
   * Gets patient name from patient ID
   * 
   * This function retrieves the patient's full name from the patients array
   * or cache. It handles various patient ID formats and fallback mechanisms.
   * 
   * **ID matching:**
   * - Supports multiple ID field names (id, patientId, guidId, etc.)
   * - Handles PAT- prefix format
   * - Handles GUID format with case-insensitive matching
   * - Tries to extract patientId from invoice raw data if not provided
   * 
   * @param {string} patientId - Patient ID to look up
   * @param {Object} [invoice=null] - Optional invoice object to extract patientId from
   * @returns {string} Patient full name or 'N/A' if not found
   * 
   * @example
   * // Get patient name from invoice
   * const name = getPatientName(invoice.patientId, invoice);
   */
  const getPatientName = (patientId, invoice = null) => {
    if (!patientId) {
      // Try to get patientId from invoice raw data if available
      if (invoice && invoice.raw) {
        const rawPatientId = invoice.raw.patientId || invoice.raw.PatientId || 
                            invoice.raw.patient_id || invoice.raw.Patient_Id || 
                            invoice.raw.PatientID || invoice.raw.patientID;
        if (rawPatientId) {
          patientId = rawPatientId;
        }
      }
      if (!patientId) return 'N/A';
    }
    
    const pidStr = String(patientId).trim();
    if (!pidStr || pidStr === 'null' || pidStr === 'undefined') return 'N/A';
    
    // Check cache first (for patients fetched on-demand)
    if (patientCache.has(pidStr)) {
      const cachedPatient = patientCache.get(pidStr);
      const name = cachedPatient.fullName || cachedPatient.Fullname || cachedPatient.fullname || 'N/A';
      if (name && name !== 'N/A') return name;
    }
    
    // Try to find patient by multiple ID formats
    const patient = patients.find(p => {
      if (!p) return false;
      
      // Collect all possible ID values from patient object
      const candidateIds = new Set();
      
      // Direct ID fields
      if (p.id) candidateIds.add(String(p.id).trim());
      if (p.Id) candidateIds.add(String(p.Id).trim());
      if (p.patientId) candidateIds.add(String(p.patientId).trim());
      if (p.PatientId) candidateIds.add(String(p.PatientId).trim());
      if (p.patient_id) candidateIds.add(String(p.patient_id).trim());
      if (p.Patient_Id) candidateIds.add(String(p.Patient_Id).trim());
      
      // Also check GUID field if exists
      if (p.guidId) candidateIds.add(String(p.guidId).trim());
      if (p.GuidId) candidateIds.add(String(p.GuidId).trim());
      if (p.guid_id) candidateIds.add(String(p.guid_id).trim());
      if (p.Guid_Id) candidateIds.add(String(p.Guid_Id).trim());
      
      // Also check raw data
      if (p.raw) {
        if (p.raw.id) candidateIds.add(String(p.raw.id).trim());
        if (p.raw.Id) candidateIds.add(String(p.raw.Id).trim());
        if (p.raw.guidId) candidateIds.add(String(p.raw.guidId).trim());
        if (p.raw.GuidId) candidateIds.add(String(p.raw.GuidId).trim());
      }
      
      // Check direct match
      if (candidateIds.has(pidStr)) return true;
      
      // Handle GUID format - compare without case sensitivity
      const pidLower = pidStr.toLowerCase();
      for (const cid of candidateIds) {
        if (cid.toLowerCase() === pidLower) return true;
      }
      
      // Handle PAT- prefix (patient ID might be "PAT-xxxxx" while invoice has GUID)
      if (pidStr.startsWith('PAT-')) {
        const stripped = pidStr.replace(/^PAT-/i, '');
        for (const cid of candidateIds) {
          if (cid.replace(/^PAT-/i, '') === stripped || cid === stripped) return true;
        }
      }
      
      // Reverse: if patient has PAT- prefix and invoice has GUID, try to match by suffix
      for (const cid of candidateIds) {
        if (cid.startsWith('PAT-') && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(pidStr)) {
          // Extract suffix from PAT- ID (last 10 chars after PAT-)
          const patSuffix = cid.replace(/^PAT-/i, '').toLowerCase();
          const guidSuffix = pidStr.replace(/-/g, '').toLowerCase().slice(-10);
          if (patSuffix === guidSuffix || patSuffix.includes(guidSuffix) || guidSuffix.includes(patSuffix)) {
            return true;
          }
        }
      }
      
      // Check if any candidate ID contains the patientId or vice versa
      for (const cid of candidateIds) {
        if (cid.includes(pidStr) || pidStr.includes(cid)) {
          // More strict: check if they end with same suffix (for GUIDs)
          if (cid.length > 8 && pidStr.length > 8) {
            const cidSuffix = cid.slice(-8);
            const pidSuffix = pidStr.slice(-8);
            if (cidSuffix === pidSuffix) return true;
          }
        }
      }
      
      return false;
    });
    
    if (!patient) {
      // Patient not found - return N/A instead of fetching on-demand
      // This prevents excessive API calls during render
      return 'N/A';
    }
    
    // Use normalized fullName first, then fallback to raw data
    let name = patient.fullName;
    
    // If normalized fullName is 'N/A' or missing, try raw data
    if (!name || name === 'N/A') {
      const raw = patient.raw || patient;
      name = raw.fullName || raw.Fullname || raw.fullname || 
             raw.full_name || raw.FullName || raw.name || raw.Name || 
             raw.displayName || raw.display_name || 'N/A';
    }
    
    // Final fallback
    if (!name || name === 'N/A') {
      name = patient.Fullname || patient.fullname || patient.full_name || 
             patient.name || patient.Name || 'N/A';
    }
    
    return name;
  };

  /**
   * Gets status badge component for invoice status
   * 
   * This helper function returns a StatusBadge component for displaying
   * invoice status with appropriate styling and colors.
   * 
   * @param {string} status - Invoice status string
   * @returns {React.ReactNode} StatusBadge component
   * 
   * @example
   * // Get status badge for invoice
   * const badge = getStatusBadge('paid');
   */
  const getStatusBadge = (status) => {
    return <StatusBadge entity="invoice" status={status} showIcon={true} />;
  };

  /**
   * Gets payment method icon component
   * 
   * This helper function returns an icon component based on the payment method.
   * 
   * **Icon mappings:**
   * - 'cash': FaMoneyBillWave
   * - 'card': FaCreditCard
   * - 'bank_transfer': FaDollarSign
   * - 'other': FaDollarSign
   * 
   * @param {string} method - Payment method string
   * @returns {React.ReactNode} Icon component
   * 
   * @example
   * // Get payment method icon
   * const icon = getPaymentMethodIcon('cash');
   */
  const getPaymentMethodIcon = (method) => {
    const methodIcons = {
      'cash': FaMoneyBillWave,
      'card': FaCreditCard,
      'bank_transfer': FaDollarSign,
      'other': FaDollarSign
    };
    
    const IconComponent = methodIcons[method] || FaDollarSign;
    return <IconComponent />;
  };

  /**
   * Formats amount to Vietnamese currency format
   * 
   * This helper function formats a numeric amount to Vietnamese currency format (VND)
   * for display in the UI.
   * 
   * @param {number} amount - Amount to format
   * @returns {string} Formatted currency string (e.g., "1.000.000 ₫")
   * 
   * @example
   * // Format currency for display
   * const formatted = formatCurrency(1000000);
   * // Returns: "1.000.000 ₫"
   */
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(amount);
  };

  // Format currency for summary cards (compact format for large numbers)
  /**
   * Formats amount to compact currency format
   * 
   * This helper function formats a numeric amount to a compact currency format
   * (e.g., "1M ₫" for 1,000,000) for display in limited space.
   * 
   * @param {number} amount - Amount to format
   * @returns {string} Compact formatted currency string
   * 
   * @example
   * // Format currency in compact format
   * const formatted = formatCurrencyCompact(1000000);
   * // Returns: "1M ₫"
   */
  const formatCurrencyCompact = (amount) => {
    if (!amount || amount === 0) return '0 ₫';
    
    if (amount >= 1000000000) {
      // Billions
      return (amount / 1000000000).toFixed(1).replace(/\.0$/, '') + ' tỷ ₫';
    } else if (amount >= 1000000) {
      // Millions
      return (amount / 1000000).toFixed(1).replace(/\.0$/, '') + ' triệu ₫';
    } else if (amount >= 1000) {
      // Thousands
      return (amount / 1000).toFixed(0) + 'k ₫';
    }
    
    return formatCurrency(amount);
  };

  /**
   * Formats date string to Vietnamese locale format
   * 
   * This helper function formats a date string to Vietnamese locale format
   * for display in the UI. Returns 'Chưa có' if date is invalid or missing.
   * 
   * @param {string} dateString - Date string to format
   * @returns {string} Formatted date string in Vietnamese locale or 'Chưa có'
   * 
   * @example
   * // Format date for display
   * const formatted = formatDate('2024-12-04');
   * // Returns: '04/12/2024'
   */
  const formatDate = (dateString) => {
    if (!dateString) return 'Chưa có';
    
    try {
      // Try parsing as ISO string or timestamp
      const date = new Date(dateString);
      
      // Check if date is valid
      if (isNaN(date.getTime())) {
        return 'Chưa có';
      }
      
      return date.toLocaleDateString('vi-VN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      });
    } catch (error) {
      return 'Chưa có';
    }
  };

  // Export to Excel (CSV format)
  /**
   * Handles exporting invoices to Excel
   * 
   * This function exports the filtered invoices list to an Excel file.
   * It creates a CSV-compatible format that can be opened in Excel.
   * 
   * **Export includes:**
   * - Invoice number, date, patient name
   * - Total amount, status, payment method
   * - All filtered invoices
   * 
   * @returns {void} Does not return a value. Downloads Excel file.
   * 
   * @example
   * // Export invoices to Excel
   * handleExportExcel();
   */
  const handleExportExcel = () => {
    if (filteredInvoices.length === 0) {
      setError('Không có dữ liệu để xuất');
      return;
    }

    const headers = ['Số hóa đơn', 'Ngày tạo', 'Tổng tiền', 'Trạng thái', 'Phương thức thanh toán'];
    const rows = filteredInvoices.map(invoice => {
      const statusText = getStatusLabel(invoice.status) || 'N/A';
      const paymentMethodText = invoice.paymentMethod === 'bank_transfer' ? 'Chuyển khoản' :
                               invoice.paymentMethod === 'cash' ? 'Tiền mặt' :
                               invoice.paymentMethod === 'card' ? 'Thẻ' :
                               invoice.paymentMethod || 'Khác';
      
      return [
        invoice.invoiceNumber || 'N/A',
        formatDate(invoice.invoiceDate || invoice.createdAt),
        invoice.totalAmount || 0,
        statusText,
        paymentMethodText
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
    link.setAttribute('download', `danh-sach-hoa-don-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setSuccess('Đã xuất danh sách hóa đơn thành công!');
  };

  // Print invoice list
  /**
   * Handles printing invoices list
   * 
   * This function opens the browser's print dialog to print the invoices list.
   * It applies print-specific styling to optimize the print layout.
   * 
   * @returns {void} Does not return a value. Opens print dialog.
   * 
   * @example
   * // Print invoices list
   * handlePrintInvoices();
   */
  const handlePrintInvoices = () => {
    if (filteredInvoices.length === 0) {
      setError('Không có dữ liệu để in');
      return;
    }

    // Create print window
    const printWindow = window.open('', '_blank');
    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Danh sách hóa đơn</title>
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
              text-align: center;
            }
            td {
              text-align: center;
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
            .text-success {
              color: #198754;
              font-weight: bold;
            }
          </style>
        </head>
        <body>
          <h1>DANH SÁCH HÓA ĐƠN</h1>
          <div class="info">
            <p>Ngày in: ${new Date().toLocaleDateString('vi-VN')} ${new Date().toLocaleTimeString('vi-VN')}</p>
            <p>Tổng số: ${filteredInvoices.length} hóa đơn</p>
            <p>Tổng doanh thu: ${formatCurrency(filteredInvoices.reduce((sum, inv) => sum + (inv.totalAmount || 0), 0))}</p>
          </div>
          <table>
            <thead>
              <tr>
                <th>STT</th>
                <th>Số hóa đơn</th>
                <th>Ngày tạo</th>
                <th>Tổng tiền</th>
                <th>Trạng thái</th>
                <th>Phương thức</th>
              </tr>
            </thead>
            <tbody>
              ${filteredInvoices.map((invoice, index) => {
                const statusText = getStatusLabel(invoice.status) || 'N/A';
                const paymentMethodText = invoice.paymentMethod === 'bank_transfer' ? 'Chuyển khoản' :
                                         invoice.paymentMethod === 'cash' ? 'Tiền mặt' :
                                         invoice.paymentMethod === 'card' ? 'Thẻ' :
                                         invoice.paymentMethod || 'Khác';
                
                return `
                  <tr>
                    <td>${index + 1}</td>
                    <td>${invoice.invoiceNumber || 'N/A'}</td>
                    <td>${formatDate(invoice.invoiceDate || invoice.createdAt)}</td>
                    <td class="text-success">${formatCurrency(invoice.totalAmount || 0)}</td>
                    <td>${statusText}</td>
                    <td>${paymentMethodText}</td>
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

  const getStatusStats = () => {
    // Calculate stats from all invoices (not filtered)
    const stats = {
      total: invoices.length,
      pending: invoices.filter(inv => {
        const status = String(inv.status || '').toLowerCase();
        return status === 'pending' || status === 'pendding';
      }).length,
      paid: invoices.filter(inv => {
        const status = String(inv.status || '').toLowerCase();
        return status === 'paid' || status === 'success';
      }).length,
      overdue: invoices.filter(inv => {
        const status = String(inv.status || '').toLowerCase();
        return status === 'overdue';
      }).length,
      cancelled: invoices.filter(inv => {
        const status = String(inv.status || '').toLowerCase();
        return status === 'cancelled';
      }).length,
      totalRevenue: invoices.reduce((sum, inv) => {
        const amount = Number(inv.totalAmount) || Number(inv.amount) || 0;
        return sum + amount;
      }, 0)
    };
    return stats;
  };

  const stats = getStatusStats();

  if (loading) {
    return (
      <Container className="py-4" style={{ 
        overflowX: 'hidden', 
        maxWidth: '100%', 
        width: '100%',
        boxSizing: 'border-box'
      }}>
        <div className="text-center">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Đang tải...</span>
          </div>
          <p className="mt-3 text-muted">Đang tải danh sách hóa đơn...</p>
        </div>
      </Container>
    );
  }

  return (
    <Container fluid className="py-4" style={{ 
      overflowX: 'hidden', 
      maxWidth: '100%', 
      width: '100%',
      boxSizing: 'border-box'
    }}>
      {/* Header */}
      <Row className="mb-4">
        <Col>
          <div className="d-flex flex-column flex-md-row align-items-start align-items-md-center justify-content-between gap-3">
            <div>
              <h2 className="mb-1 text-primary" style={{ fontSize: 'clamp(1.25rem, 4vw, 1.75rem)' }}>
                <FaReceipt className="me-2" />
                Quản lý hóa đơn
              </h2>
              <p className="text-muted mb-0 d-none d-md-block">Quản lý và theo dõi hóa đơn thanh toán dịch vụ</p>
            </div>
            <div className="d-flex gap-2 w-100 w-md-auto flex-wrap">
              <Button 
                variant="outline-secondary" 
                size="sm"
                onClick={handleExportExcel}
                className="flex-fill flex-md-grow-0"
              >
                <FaDownload className="me-1 me-md-2" />
                <span className="d-none d-sm-inline">Xuất Excel</span>
                <span className="d-sm-none">Excel</span>
              </Button>
              <Button 
                variant="outline-secondary" 
                size="sm"
                onClick={handlePrintInvoices}
                className="flex-fill flex-md-grow-0"
              >
                <FaPrint className="me-1 me-md-2" />
                <span className="d-none d-sm-inline">In hóa đơn</span>
                <span className="d-sm-none">In</span>
              </Button>
              <Button variant="primary" className="flex-fill flex-md-grow-0">
                <FaPlus className="me-1 me-md-2" />
                <span className="d-none d-sm-inline">Tạo hóa đơn</span>
                <span className="d-sm-none">Tạo</span>
              </Button>
            </div>
          </div>
        </Col>
      </Row>

      {/* Alerts */}
      {error && (
        <Alert variant="danger" dismissible onClose={() => setError('')}>
          <FaExclamationTriangle className="me-2" />
          {error}
        </Alert>
      )}
      {success && (
        <Alert variant="success" dismissible onClose={() => setSuccess('')}>
          <FaCheckCircle className="me-2" />
          {success}
        </Alert>
      )}

      {/* Stats Cards */}
      <style>{`
        .stat-card-custom {
          background: linear-gradient(135deg, #1e40af 0%, #1e3a8a 100%) !important;
          color: #ffffff !important;
          border: none !important;
          border-radius: 12px !important;
          height: 100%;
        }
        .stat-card-custom .card-body {
          padding: 1.25rem !important;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
        }
        .stat-card-custom .stat-value {
          font-size: clamp(1.25rem, 4vw, 1.75rem);
          font-weight: 700;
          color: #ffffff !important;
          margin: 0;
          min-height: 2.5rem;
          display: flex;
          align-items: center;
          justify-content: center;
          word-break: break-word;
          line-height: 1.2;
        }
        .stat-card-custom .stat-title {
          font-size: clamp(0.75rem, 2vw, 0.875rem);
          font-weight: 500;
          color: #ffffff !important;
          margin: 0.5rem 0 0 0;
          opacity: 0.95;
        }
        .stat-card-custom .stat-icon {
          width: clamp(40px, 8vw, 50px);
          height: clamp(40px, 8vw, 50px);
          font-size: clamp(1rem, 3vw, 1.5rem);
        }
        .stat-card-custom .stat-icon-primary { background: rgba(255, 255, 255, 0.15) !important; }
        .stat-card-custom .stat-icon-warning { background: rgba(255, 193, 7, 0.2) !important; }
        .stat-card-custom .stat-icon-success { background: rgba(40, 167, 69, 0.2) !important; }
        .stat-card-custom .stat-icon-danger { background: rgba(220, 53, 69, 0.2) !important; }
        .stat-card-custom .stat-icon-info { background: rgba(23, 162, 184, 0.2) !important; }
      `}</style>
      <Row className="mb-4">
        <Col xs={6} sm={4} md={3} lg={2} className="mb-3">
          <Card className="stat-card-custom">
            <Card.Body>
              <div className="stat-icon stat-icon-primary">
                <FaReceipt />
              </div>
              <h4 className="stat-value">{stats.total}</h4>
              <p className="stat-title">Tổng hóa đơn</p>
            </Card.Body>
          </Card>
        </Col>
        <Col xs={6} sm={4} md={3} lg={2} className="mb-3">
          <Card className="stat-card-custom">
            <Card.Body>
              <div className="stat-icon stat-icon-warning">
                <FaClock />
              </div>
              <h4 className="stat-value">{stats.pending}</h4>
              <p className="stat-title">Chờ thanh toán</p>
            </Card.Body>
          </Card>
        </Col>
        <Col xs={6} sm={4} md={3} lg={2} className="mb-3">
          <Card className="stat-card-custom">
            <Card.Body>
              <div className="stat-icon stat-icon-success">
                <FaCheckCircle />
              </div>
              <h4 className="stat-value">{stats.paid}</h4>
              <p className="stat-title">Đã thanh toán</p>
            </Card.Body>
          </Card>
        </Col>
        <Col xs={6} sm={4} md={3} lg={2} className="mb-3">
          <Card className="stat-card-custom">
            <Card.Body>
              <div className="stat-icon stat-icon-danger">
                <FaExclamationTriangle />
              </div>
              <h4 className="stat-value">{stats.overdue}</h4>
              <p className="stat-title">Quá hạn</p>
            </Card.Body>
          </Card>
        </Col>
        <Col xs={6} sm={4} md={3} lg={2} className="mb-3">
          <Card className="stat-card-custom">
            <Card.Body>
              <div className="stat-icon stat-icon-info">
                <FaChartLine />
              </div>
              <div 
                className="stat-value" 
                style={{ 
                  fontSize: stats.totalRevenue >= 1000000 ? 'clamp(0.9rem, 2.5vw, 1.1rem)' : 'clamp(1.25rem, 4vw, 1.75rem)'
                }}
                title={formatCurrency(stats.totalRevenue)}
              >
                {formatCurrencyCompact(stats.totalRevenue)}
              </div>
              <p className="stat-title">Tổng doanh thu</p>
            </Card.Body>
          </Card>
        </Col>
        <Col xs={6} sm={4} md={3} lg={2} className="mb-3">
          <Card className="stat-card-custom">
            <Card.Body>
              <div className="stat-icon stat-icon-info">
                <FaReceipt />
              </div>
              <h4 className="stat-value">{filteredInvoices.length}</h4>
              <p className="stat-title">Hiển thị</p>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Filters */}
      <Card className="mb-4 shadow-sm">
        <Card.Body>
          <Row className="g-3">
            <Col md={3}>
              <Form.Group>
                <Form.Label className="fw-bold">
                  <FaSearch className="me-2 text-primary" />
                  Tìm kiếm
                </Form.Label>
                <InputGroup>
                  <InputGroup.Text>
                    <FaSearch />
                  </InputGroup.Text>
                  <Form.Control
                    type="text"
                    placeholder="Tìm theo số hóa đơn, bệnh nhân..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </InputGroup>
              </Form.Group>
            </Col>
            <Col md={3}>
              <Form.Group>
                <Form.Label className="fw-bold">
                  <FaCalendarAlt className="me-2 text-primary" />
                  Lọc theo tháng
                </Form.Label>
                <Form.Control
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                />
              </Form.Group>
            </Col>
            <Col md={3}>
              <Form.Group>
                <Form.Label className="fw-bold">
                  <FaFilter className="me-2 text-primary" />
                  Trạng thái
                </Form.Label>
                <Form.Select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="all">Tất cả trạng thái</option>
                  <option value="draft">Nháp</option>
                  <option value="pending">Chờ thanh toán</option>
                  <option value="paid">Đã thanh toán</option>
                  <option value="cancelled">Hủy bỏ</option>
                  <option value="overdue">Quá hạn</option>
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={3} className="d-flex align-items-end">
              <Button
                variant="outline-primary"
                onClick={() => {
                  setSearchTerm('');
                  setSelectedMonth('');
                  setStatusFilter('all');
                  setSortField('invoiceDate');
                  setSortDirection('desc');
                }}
                className="w-100"
              >
                <FaFilter className="me-2" />
                Làm mới
              </Button>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* Invoices Table */}
      <Card className="shadow-sm">
        <Card.Header className="bg-primary text-white">
          <h5 className="mb-0" style={{ fontSize: 'clamp(1rem, 3vw, 1.25rem)' }}>
            <FaReceipt className="me-2" />
            <span className="d-none d-sm-inline">Danh sách hóa đơn</span>
            <span className="d-sm-none">Hóa đơn</span>
            <span className="ms-1">({filteredInvoices.length})</span>
          </h5>
        </Card.Header>
        <Card.Body className="p-0">
          {filteredInvoices.length > 0 ? (
            <div className="table-responsive">
              <Table hover className="mb-0" style={{ tableLayout: 'fixed' }}>
                <thead className="table-light">
                  <tr>
                    <th 
                      className="sortable text-center align-middle"
                      onClick={() => handleSort('invoiceNumber')}
                      style={{cursor: 'pointer', width: '15%', fontSize: 'clamp(0.75rem, 2vw, 0.875rem)'}}
                    >
                      <div className="d-flex align-items-center justify-content-center">
                        <FaFileInvoiceDollar className="me-1 me-md-2 d-none d-sm-inline" />
                        <span className="d-none d-md-inline">Số hóa đơn</span>
                        <span className="d-md-none">Số HD</span>
                        {getSortIcon('invoiceNumber')}
                      </div>
                    </th>
                    <th 
                      className="sortable text-center align-middle d-none d-lg-table-cell"
                      onClick={() => handleSort('invoiceDate')}
                      style={{cursor: 'pointer', width: '12%', fontSize: 'clamp(0.75rem, 2vw, 0.875rem)'}}
                    >
                      <div className="d-flex align-items-center justify-content-center">
                        <FaCalendarAlt className="me-1 me-md-2" />
                        Ngày tạo
                        {getSortIcon('invoiceDate')}
                      </div>
                    </th>
                    <th 
                      className="sortable text-center align-middle"
                      onClick={() => handleSort('totalAmount')}
                      style={{cursor: 'pointer', width: '15%', fontSize: 'clamp(0.75rem, 2vw, 0.875rem)'}}
                    >
                      <div className="d-flex align-items-center justify-content-center">
                        <FaDollarSign className="me-1 me-md-2 d-none d-sm-inline" />
                        <span className="d-none d-md-inline">Tổng tiền</span>
                        <span className="d-md-none">Tiền</span>
                        {getSortIcon('totalAmount')}
                      </div>
                    </th>
                    <th className="text-center align-middle" style={{ width: '12%', fontSize: 'clamp(0.75rem, 2vw, 0.875rem)' }}>Trạng thái</th>
                    <th className="text-center align-middle d-none d-md-table-cell" style={{ width: '15%', fontSize: 'clamp(0.75rem, 2vw, 0.875rem)' }}>Phương thức</th>
                    <th className="text-center align-middle" style={{ width: '13%', fontSize: 'clamp(0.75rem, 2vw, 0.875rem)' }}>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedInvoices.map((invoice) => (
                    <tr key={invoice.id}>
                      <td className="text-center align-middle">
                        <div className="fw-bold" style={{ fontSize: 'clamp(0.875rem, 2vw, 1rem)' }}>{invoice.invoiceNumber}</div>
                      </td>
                      <td className="text-center align-middle d-none d-lg-table-cell">
                        {formatDate(invoice.invoiceDate || invoice.createdAt)}
                      </td>
                      <td className="text-center align-middle">
                        <div className="fw-bold text-success" style={{ fontSize: 'clamp(0.875rem, 2vw, 1rem)' }}>
                          {formatCurrency(invoice.totalAmount || 0)}
                        </div>
                      </td>
                      <td className="text-center align-middle">{getStatusBadge(invoice.status)}</td>
                      <td className="text-center align-middle d-none d-md-table-cell">
                        <div className="d-flex flex-column align-items-center">
                          <div className="payment-method-icon mb-1">
                            {getPaymentMethodIcon(invoice.paymentMethod)}
                          </div>
                          <small className="text-capitalize" style={{ fontSize: 'clamp(0.75rem, 2vw, 0.875rem)' }}>
                            {invoice.paymentMethod === 'bank_transfer' ? 'Chuyển khoản' : 
                             invoice.paymentMethod === 'cash' ? 'Tiền mặt' :
                             invoice.paymentMethod === 'card' ? 'Thẻ' : 'Khác'}
                          </small>
                        </div>
                      </td>
                      <td className="text-center align-middle">
                        <div className="d-flex justify-content-center gap-1">
                          <Button
                            variant="outline-primary"
                            size="sm"
                            title="Xem chi tiết"
                            onClick={() => {
                              setSelectedInvoice(invoice);
                              setShowModal(true);
                            }}
                            style={{ fontSize: 'clamp(0.75rem, 2vw, 0.875rem)' }}
                          >
                            <FaEye />
                            <span className="d-none d-lg-inline ms-1">Xem</span>
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
              <FaReceipt className="text-muted mb-3" style={{fontSize: '3rem'}} />
              <h5 className="text-muted">Không có hóa đơn nào</h5>
              <p className="text-muted">Thử thay đổi bộ lọc hoặc tạo hóa đơn mới</p>
            </div>
          )}
        </Card.Body>
      </Card>

      {/* Pagination */}
      {filteredInvoices.length > 0 && (
        <Card className="mb-4 shadow-sm">
          <Card.Body>
            <Row className="align-items-center">
              <Col md={6} className="mb-2 mb-md-0">
                <div className="d-flex align-items-center">
                  <span className="me-2">Hiển thị:</span>
                  <Form.Select
                    value={itemsPerPage}
                    onChange={handleItemsPerPageChange}
                    style={{ width: 'auto', display: 'inline-block' }}
                    size="sm"
                  >
                    <option value={5}>5</option>
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </Form.Select>
                  <span className="ms-2">
                    / {filteredInvoices.length} hóa đơn
                  </span>
                </div>
              </Col>
              <Col md={6}>
                <div className="d-flex justify-content-md-end justify-content-center">
                  <Pagination className="mb-0">
                    <Pagination.First 
                      onClick={() => handlePageChange(1)} 
                      disabled={currentPage === 1}
                    />
                    <Pagination.Prev 
                      onClick={() => handlePageChange(currentPage - 1)} 
                      disabled={currentPage === 1}
                    />
                    
                    {/* Page numbers */}
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                      // Show first page, last page, current page, and pages around current
                      if (
                        page === 1 ||
                        page === totalPages ||
                        (page >= currentPage - 1 && page <= currentPage + 1)
                      ) {
                        return (
                          <Pagination.Item
                            key={page}
                            active={page === currentPage}
                            onClick={() => handlePageChange(page)}
                          >
                            {page}
                          </Pagination.Item>
                        );
                      } else if (
                        page === currentPage - 2 ||
                        page === currentPage + 2
                      ) {
                        return <Pagination.Ellipsis key={page} />;
                      }
                      return null;
                    })}
                    
                    <Pagination.Next 
                      onClick={() => handlePageChange(currentPage + 1)} 
                      disabled={currentPage === totalPages}
                    />
                    <Pagination.Last 
                      onClick={() => handlePageChange(totalPages)} 
                      disabled={currentPage === totalPages}
                    />
                  </Pagination>
                </div>
              </Col>
            </Row>
            <Row className="mt-2">
              <Col>
                <small className="text-muted">
                  Trang {currentPage} / {totalPages} 
                  {filteredInvoices.length > 0 && (
                    <> - Hiển thị {startIndex + 1} đến {Math.min(endIndex, filteredInvoices.length)} trong tổng số {filteredInvoices.length} hóa đơn</>
                  )}
                </small>
              </Col>
            </Row>
          </Card.Body>
        </Card>
      )}

      {/* Invoice Detail Modal */}
      <Modal show={showModal} onHide={() => setShowModal(false)} size="lg" centered>
        <Modal.Header closeButton className="bg-primary text-white">
          <Modal.Title>
            <FaReceipt className="me-2" />
            Chi tiết hóa đơn
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedInvoice && (
            <>
              <Row className="mb-3">
                {(() => {
                  const patientName = getPatientName(selectedInvoice.patientId, selectedInvoice);
                  const hasPatientInfo = patientName && patientName !== 'N/A';
                  return (
                    <>
                      <Col md={hasPatientInfo ? 6 : 12}>
                        <Card className="mb-3">
                          <Card.Header className="bg-light">
                            <h6 className="mb-0">Thông tin hóa đơn</h6>
                          </Card.Header>
                          <Card.Body>
                            <p className="mb-2">
                              <strong>Số hóa đơn:</strong> {selectedInvoice.invoiceNumber}
                            </p>
                            <p className="mb-2">
                              <strong>Mã hóa đơn:</strong> #{selectedInvoice.id}
                            </p>
                            <p className="mb-2">
                              <strong>Ngày tạo:</strong> {formatDate(selectedInvoice.invoiceDate || selectedInvoice.createdAt)}
                            </p>
                            <p className="mb-0">
                              <strong>Trạng thái:</strong> {getStatusBadge(selectedInvoice.status)}
                            </p>
                          </Card.Body>
                        </Card>
                      </Col>
                      {hasPatientInfo && (
                        <Col md={6}>
                          <Card className="mb-3">
                            <Card.Header className="bg-light">
                              <h6 className="mb-0">Thông tin bệnh nhân</h6>
                            </Card.Header>
                            <Card.Body>
                              <p className="mb-2">
                                <strong>Họ và tên:</strong> {patientName}
                              </p>
                              {/* Mã bệnh nhân đã bị ẩn theo yêu cầu giao diện */}
                            </Card.Body>
                          </Card>
                        </Col>
                      )}
                    </>
                  );
                })()}
              </Row>

              <Card className="mb-3">
                <Card.Header className="bg-light">
                  <h6 className="mb-0">Chi tiết thanh toán</h6>
                </Card.Header>
                <Card.Body>
                  <Row>
                    <Col md={6}>
                      <p className="mb-2">
                        <strong>Tổng tiền:</strong> 
                        <span className="text-success fw-bold ms-2">
                          {formatCurrency(selectedInvoice.totalAmount || 0)}
                        </span>
                      </p>
                    </Col>
                    <Col md={6}>
                      <p className="mb-2">
                        <strong>Phương thức thanh toán:</strong>
                        <span className="ms-2">
                          <div className="d-flex align-items-center">
                            <div className="payment-method-icon me-1">
                              {getPaymentMethodIcon(selectedInvoice.paymentMethod)}
                            </div>
                            <small className="text-capitalize">
                              {selectedInvoice.paymentMethod === 'bank_transfer' ? 'Chuyển khoản' : 
                               selectedInvoice.paymentMethod === 'cash' ? 'Tiền mặt' :
                               selectedInvoice.paymentMethod === 'card' ? 'Thẻ' : 'Khác'}
                            </small>
                          </div>
                        </span>
                      </p>
                    </Col>
                  </Row>
                  {selectedInvoice.notes && (
                    <p className="mb-0">
                      <strong>Ghi chú:</strong> {selectedInvoice.notes}
                    </p>
                  )}
                </Card.Body>
              </Card>

              {selectedInvoice.items && selectedInvoice.items.length > 0 && (
                <Card>
                  <Card.Header className="bg-light">
                    <h6 className="mb-0">Danh sách dịch vụ</h6>
                  </Card.Header>
                  <Card.Body>
                    <Table striped bordered hover>
                      <thead>
                        <tr>
                          <th>STT</th>
                          <th>Dịch vụ</th>
                          <th className="text-center">Số lượng</th>
                          <th className="text-end">Đơn giá</th>
                          <th className="text-end">Thành tiền</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedInvoice.items.map((item, idx) => {
                          const service = services.find(s => s.id === item.serviceId);
                          return (
                            <tr key={idx}>
                              <td>{idx + 1}</td>
                              <td>{service ? service.name : 'N/A'}</td>
                              <td className="text-center">{item.quantity || 1}</td>
                              <td className="text-end">{formatCurrency(item.price || 0)}</td>
                              <td className="text-end">
                                {formatCurrency((item.quantity || 1) * (item.price || 0))}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot>
                        <tr>
                          <td colSpan={4} className="text-end fw-bold">Tổng cộng:</td>
                          <td className="text-end fw-bold text-success">
                            {formatCurrency(selectedInvoice.totalAmount || 0)}
                          </td>
                        </tr>
                      </tfoot>
                    </Table>
                  </Card.Body>
                </Card>
              )}
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowModal(false)}>
            Đóng
          </Button>
          <Button variant="outline-primary" onClick={() => {
            // Print functionality can be added here
            window.print();
          }}>
            <FaPrint className="me-2" />
            In hóa đơn
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default AdminInvoices;