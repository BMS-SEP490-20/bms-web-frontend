/**
 * Medical Services Management Page
 * 
 * Comprehensive medical services management page for the Blood Laboratory Management System.
 * Provides full CRUD operations for medical services, pricing management,
 * and service status control with search and filtering capabilities.
 * 
 * @author Blood Laboratory Management Team
 * @version 1.0.0
 * @since 2024
 */

import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Table, Button, Form, Modal, Alert, Badge, ButtonGroup } from 'react-bootstrap';
import { medicalService } from '../../services/medicalService';
import ConfirmDialog from '../../shared/components/ConfirmDialog/ConfirmDialog';
import testOrderService from '../../services/testOrderService';
import useResponsive from '../../shared/hooks/useResponsive';
import { useAuth } from '../../shared/contexts/AuthContext';

/**
 * Services Component
 * 
 * Manages medical services including creation, editing, pricing, and status control.
 * Provides comprehensive service management functionality.
 * 
 * @returns {React.ReactNode} Services management component
 */
const Services = () => {
  const { isMobile, isTablet } = useResponsive();
  const { userRoleId, userRole } = useAuth();

  const isReceptionist = Number(userRoleId) === 6 || String(userRole).toLowerCase() === 'receptionist' || Number(userRoleId) === 1 || String(userRole).toLowerCase() === 'admin' || String(userRole).toLowerCase() === 'administrator';

  const [services, setServices] = useState([]);
  const [filteredServices, setFilteredServices] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingService, setEditingService] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Confirm dialog states
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [serviceToDelete, setServiceToDelete] = useState(null);
  
  const [deleteCountdown, setDeleteCountdown] = useState(0);

  useEffect(() => {
    let timer;
    if (showConfirmDialog && deleteCountdown > 0) {
      timer = setTimeout(() => {
        setDeleteCountdown(prev => prev - 1);
      }, 1000);
    }
    return () => clearTimeout(timer);
  }, [showConfirmDialog, deleteCountdown]);

  const [isDeleting, setIsDeleting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    unit: 'VNĐ'
  });
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [detailCriteria, setDetailCriteria] = useState([]);
  const [loadingDetailCriteria, setLoadingDetailCriteria] = useState(false);
  const [detailService, setDetailService] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [modalSuccess, setModalSuccess] = useState('');
  const [allCriteria, setAllCriteria] = useState([]);
  const [loadingCriteria, setLoadingCriteria] = useState(false);
  const [selectedCriteria, setSelectedCriteria] = useState([]);
  const [togglingStatusId, setTogglingStatusId] = useState(null);

  useEffect(() => {
    loadServices();
  }, []);

  // Auto-load all criteria so checkboxes can display immediately
  useEffect(() => {
    loadAllCriteria();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    filterServices();
  }, [services, searchTerm, statusFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  /**
   * Loads all medical services from API
   * 
   * This function fetches all medical services from the API and normalizes
   * the data to ensure consistent field names across different backend formats.
   * 
   * **Normalization:**
   * - Maps various ID fields (id, Id, packageId, PackageId, etc.) to `id`
   * - Maps various name fields (packageName, name, testPackageName, etc.) to `name`
   * - Normalizes price to number
   * - Normalizes status to boolean `isActive`
   * 
   * @returns {Promise<void>} Does not return a value. Updates services state.
   * 
   * @example
   * // Load services on component mount
   * await loadServices();
   */
  const loadServices = async () => {
    try {
      setLoading(true);
      const result = await medicalService.getAllServices();
      if (result.success) {
        // Normalize service/package objects so UI can rely on consistent fields
        const normalized = Array.isArray(result.data)
          ? result.data.map(s => ({
            id: s.id || s.Id || s.packageId || s.PackageId || s.package_id || null,
            name: s.packageName || s.package_name || s.name || s.Name || s.testPackageName || s.TestPackageName || '',
            description: s.description || s.Description || '',
            price: (s.price !== undefined && s.price !== null) ? Number(s.price) : (s.Price !== undefined ? Number(s.Price) : 0),
            isActive: (String(s.status || s.Status || '').toLowerCase() === 'active') || !!s.isActive,
            createdAt: s.createdAt || s.created_at || s.CreatedAt || null,
            raw: s
          }))
          : [];
        setServices(normalized);
      } else {
        setError(result.message);
      }
    } catch (error) {
      setError('Lỗi tải danh sách dịch vụ');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Filters services based on selected criteria
   * 
   * This function filters the services list based on:
   * 1. Search term (name, description)
   * 2. Status filter (all, active, inactive)
   * 
   * Updates filteredServices state with the filtered results.
   * 
   * @returns {void} Does not return a value. Updates filteredServices state.
   * 
   * @example
   * // Filter services when filters change
   * filterServices();
   */
  const filterServices = () => {
    const list = Array.isArray(services) ? services : [];
    let filtered = list.slice();

    // Filter by search term (safe)
    if (searchTerm) {
      const q = String(searchTerm).toLowerCase();
      filtered = filtered.filter(s => {
        const name = String(s?.name || '').toLowerCase();
        const desc = String(s?.description || '').toLowerCase();
        return name.includes(q) || desc.includes(q);
      });
    }

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(s => {
        const active = !!s?.isActive;
        return statusFilter === 'active' ? active : !active;
      });
    }

    setFilteredServices(filtered);
  };

  /**
   * Handles showing service create/edit modal
   * 
   * This function is called when user clicks to create or edit a service.
   * It performs:
   * 1. Loads all criteria if not already loaded
   * 2. If editing, populates form with service data
   * 3. Fetches service criteria from backend or reads from raw payload
   * 4. Sets selected criteria for the service
   * 5. Opens the modal
   * 
   * **Criteria loading:**
   * - Tries to fetch from backend first (getPackageCriteriaById or getCriteriaForPackage)
   * - Falls back to reading from service.raw payload if backend fetch fails
   * 
   * @param {Object|null} [service=null] - Service object to edit, or null for create
   * @returns {Promise<void>} Does not return a value. Opens modal with service data.
   * 
   * @example
   * // Show create modal
   * await handleShowModal();
   * 
   * // Show edit modal
   * await handleShowModal(service);
   */
  const handleShowModal = async (service = null) => {
    if (service) {
      // Ensure criteria list is loaded so labels render correctly in the modal
      try {
        if ((!allCriteria || allCriteria.length === 0) && typeof loadAllCriteria === 'function') {
          await loadAllCriteria();
        }
      } catch (e) { }
      setEditingService(service);
      setFormData({
        name: service.name,
        description: service.description,
        price: service.price,
        unit: service.unit
      });
      // Try to fetch authoritative criteria for this package first so edit modal matches detail view
      let fetchedFromBackend = false;
      try {
        const pkgId = service.id || service.raw?.packageId || service.raw?.PackageId || service.raw?.package_id || service.raw?.id;
        if (pkgId) {
          // Prefer explicit path endpoint first (same order as detail view)
          let resp = { success: false };
          try {
            if (typeof testOrderService.getPackageCriteriaById === 'function') {
              resp = await testOrderService.getPackageCriteriaById(pkgId);
            }
          } catch (e) { /* ignore and try next */ }

          // Fallback to generic getCriteriaForPackage
          if ((!resp || !resp.success) && typeof testOrderService.getCriteriaForPackage === 'function') {
            try {
              resp = await testOrderService.getCriteriaForPackage(pkgId);
            } catch (e) { /* ignore */ }
          }

          if (resp && resp.success && Array.isArray(resp.data) && resp.data.length > 0) {
            const ids = resp.data.map(c => (c.criteriaId ?? c.criteria_id ?? c.id ?? c.testCriterionId ?? c.criterionId ?? c.value ?? null)).filter(Boolean).map(String);
            if (ids.length > 0) {
              setSelectedCriteria(ids);
              fetchedFromBackend = true;
            }

            const fetchedNorm = resp.data.map(c => ({ id: String(c.criteriaId ?? c.criteria_id ?? c.id ?? c.testCriterionId ?? c.criterionId ?? ''), name: c.criteriaName || c.criteria_name || c.name || c.title || c.code || String(c.id || ''), raw: c }));
            setAllCriteria(prev => {
              const byId = new Map((prev || []).map(p => [String(p.id), p]));
              for (const f of fetchedNorm) byId.set(String(f.id), f);
              return Array.from(byId.values());
            });
          }
        }
      } catch (e) { }

      // If backend fetch returned nothing, fall back to reading from raw payload (existing behavior)
      if (!fetchedFromBackend) {
        try {
          const raw = service.raw || {};
          const cand = raw.criteriaIds || raw.criteria || raw.testCriteria || raw.packageCriteria || raw.criteria_ids || raw.test_criteria || raw.test_criteria_ids;
          if (Array.isArray(cand) && cand.length > 0) {
            const ids = cand.map(it => {
              if (!it && it !== 0) return null;
              if (typeof it === 'string' || typeof it === 'number') return String(it);
              return String(it.criteriaId ?? it.criteria_id ?? it.id ?? it.testCriterionId ?? it.criterionId ?? it.value ?? null);
            }).filter(Boolean);
            if (ids.length > 0) setSelectedCriteria(ids);
            else setSelectedCriteria([]);
          } else {
            setSelectedCriteria([]);
          }
        } catch (e) { setSelectedCriteria([]); }
      }
    } else {
      setEditingService(null);
      setFormData({
        name: '',
        description: '',
        price: '',
        unit: 'VNĐ'
      });
      setSelectedCriteria([]);
    }
    setShowModal(true);
    setError('');
    setSuccess('');
  };

  /**
   * Handles closing service modal
   * 
   * This function is called when user closes the service create/edit modal.
   * It resets form data, clears selected criteria, and closes the modal.
   * 
   * @returns {void} Does not return a value. Resets form and closes modal.
   * 
   * @example
   * // Close modal
   * handleCloseModal();
   */
  const handleCloseModal = () => {
    setShowModal(false);
    setEditingService(null);
    setFormData({
      name: '',
      description: '',
      price: '',
      unit: 'VNĐ'
    });
    setSelectedCriteria([]);
    setError('');
    setSuccess('');
  };

  /**
   * Handles form field changes
   * 
   * This function updates form data when user types in form fields.
   * 
   * @param {Event} e - Change event from form input
   * @returns {void} Does not return a value. Updates formData state.
   * 
   * @example
   * // Handle form field change
   * <Form.Control onChange={handleChange} name="name" />
   */
  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  /**
   * Handles service form submission
   * 
   * This function is called when user submits the service form (create or update).
   * It performs:
   * 1. Determines final criteria IDs (preserves existing if editing and not changed)
   * 2. Builds payload with service data and criteria IDs
   * 3. Creates new service or updates existing service via API
   * 4. Reloads services list
   * 5. Closes modal and shows success notification
   * 
   * **Criteria handling:**
   * - If editing and no criteria selected, tries to preserve existing criteria
   * - Reads from service.raw payload first, then fetches from backend if needed
   * 
   * @param {Event} e - Form submit event
   * @returns {Promise<void>} Does not return a value. Creates/updates service and updates state.
   * 
   * @example
   * // Submit service form
   * <Form onSubmit={handleSubmit}>
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      // Determine criteriaIds to send. If editing and user didn't change selection,
      // preserve existing package criteria by fetching them from the backend or raw payload.
      let finalCriteria = Array.isArray(selectedCriteria) ? selectedCriteria.map(String) : [];
      if (editingService && (!finalCriteria || finalCriteria.length === 0)) {
        // Try to read from the raw payload first
        try {
          const raw = editingService.raw || {};
          const cand = raw.criteriaIds || raw.criteria || raw.testCriteria || raw.packageCriteria || raw.criteria_ids || raw.test_criteria || raw.test_criteria_ids;
          if (Array.isArray(cand) && cand.length > 0) {
            finalCriteria = cand.map(String);
          } else {
            // Fallback: ask backend for package criteria
            const pkgId = editingService.id || raw.packageId || raw.PackageId || raw.package_id || raw.id;
            if (pkgId && typeof testOrderService.getCriteriaForPackage === 'function') {
              try {
                const critResp = await testOrderService.getCriteriaForPackage(pkgId);
                if (critResp && critResp.success && Array.isArray(critResp.data) && critResp.data.length > 0) {
                  finalCriteria = critResp.data.map(c => {
                    const idVal = (c && (c.criteriaId ?? c.criteria_id ?? c.id ?? c.testCriterionId ?? c.criterionId ?? c.value));
                    if (idVal === null || idVal === undefined) return null;
                    return String(idVal);
                  }).filter(Boolean);
                }
              } catch (e) { }
            }
          }
        } catch (e) { }
      }

      // Build payload that matches backend expected JSON (camelCase keys)
      const payload = {
        packageName: formData.name,
        description: formData.description,
        price: formData.price !== '' ? Number(formData.price) : 0
      };

      // Include status information (uppercase) so backend receives current active state
      const currentIsActive = editingService ? (!!editingService.isActive) : true;
      payload.status = currentIsActive ? 'ACTIVE' : 'INACTIVE';

      let result;
      if (editingService) {
        // Use robust id resolution
        const targetId = editingService.id || editingService.raw?.packageId || editingService.raw?.PackageId || editingService.raw?.package_id;
        // attach selected criteria ids (camelCase key)
        payload.criteriaIds = finalCriteria;
        result = await medicalService.updateService(targetId, payload);
      } else {
        payload.criteriaIds = finalCriteria;
        result = await medicalService.createService(payload);
      }

      if (result.success) {
        const msg = editingService ? 'Cập nhật dịch vụ thành công' : 'Thêm dịch vụ thành công';
        setSuccess(msg);
        setModalSuccess(msg);
        await loadServices();
        // show modal-level success briefly before closing so user can see confirmation
        setTimeout(() => {
          setModalSuccess('');
          handleCloseModal();
        }, 1200);
      } else {
        setError(result.message);
      }
    } catch (error) {
      setError('Lỗi xử lý dữ liệu');
    }
  };

  /**
   * Loads all test criteria from backend
   * 
   * This function fetches all available test criteria from the backend.
   * It tries multiple endpoints in order of preference:
   * 1. getAllTestCriteria (direct all criteria endpoint)
   * 2. getAllTestPackageCriteria (then fetch each criterion individually)
   * 3. getAllTestParameters (fallback)
   * 
   * Normalizes criteria data to ensure consistent field names.
   * 
   * @returns {Promise<void>} Does not return a value. Updates allCriteria state.
   * 
   * @example
   * // Load all criteria on component mount
   * await loadAllCriteria();
   */
  const loadAllCriteria = async () => {
    try {
      setLoadingCriteria(true);
      // Try the direct 'get all criteria' helper first (if backend supports it)
      let crits = [];
      try {
        if (typeof testOrderService.getAllTestCriteria === 'function') {
          // request all pages when backend paginates
          const resp = await testOrderService.getAllTestCriteria({ fetchAll: true });
          if (resp && resp.success && Array.isArray(resp.data) && resp.data.length > 0) {
            crits = resp.data;
          }
        }
      } catch (e) {
      }

      // If direct all-criteria call returned nothing, fallback to links -> fetch each criterion
      if ((!crits || crits.length === 0) && typeof testOrderService.getAllTestPackageCriteria === 'function') {
        try {
          const linksResp = await testOrderService.getAllTestPackageCriteria();
          if (linksResp && linksResp.success && Array.isArray(linksResp.data) && linksResp.data.length > 0) {
            const ids = Array.from(new Set(linksResp.data.map(l => l.testCriterionId || l.testCriterion || l.criterionId || l.id).filter(Boolean)));
            const promises = ids.map(id => testOrderService.getTestCriterion(id).then(r => r.data).catch(() => null));
            const settled = await Promise.all(promises);
            crits = settled.filter(Boolean);
          }
        } catch (e) {
        }
      }

      // Final fallback: use getAllTestParameters if available
      if ((!crits || crits.length === 0) && typeof testOrderService.getAllTestParameters === 'function') {
        try {
          const resp = await testOrderService.getAllTestParameters();
          if (resp && resp.success && Array.isArray(resp.data)) crits = resp.data;
        } catch (e) { /* ignore */ }
      }

      if (Array.isArray(crits) && crits.length > 0) {
        const norm = crits.map((c, idx) => {
          // Prefer the API shape: criteriaId / criteriaName
          const candidate = c && (c.criteriaId ?? c.criteria_id ?? c.id ?? c.testCriterionId ?? c.criterionId ?? c.code ?? c.name ?? null);
          const idVal = candidate !== null && candidate !== undefined ? String(candidate) : `criteria-${idx}`;
          const nameVal = c && (c.criteriaName || c.criteria_name || c.name || c.title || c.code) ? (c.criteriaName || c.criteria_name || c.name || c.title || c.code) : idVal;
          return { id: idVal, name: nameVal, raw: c };
        });
        setAllCriteria(norm);
      } else {
        setAllCriteria([]);
      }
    } catch (e) {
      setAllCriteria([]);
    } finally {
      setLoadingCriteria(false);
    }
  };

  /**
   * Handles criteria selection from dropdown
   * 
   * This function is called when user selects criteria from a multi-select dropdown.
   * It updates the selected criteria list with the selected option values.
   * 
   * @param {Event} e - Change event from select input
   * @returns {void} Does not return a value. Updates selectedCriteria state.
   * 
   * @example
   * // Handle criteria selection
   * <Form.Select multiple onChange={handleCriteriaSelect}>
   */
  const handleCriteriaSelect = (e) => {
    const opts = Array.from(e.target.selectedOptions || []);
    setSelectedCriteria(opts.map(o => o.value));
  };

  /**
   * Handles toggling a single criterion selection
   * 
   * This function is called when user clicks on a criterion checkbox.
   * It toggles the criterion in the selected criteria list (adds if not present,
   * removes if present).
   * 
   * @param {string|number} id - Criterion ID to toggle
   * @returns {void} Does not return a value. Updates selectedCriteria state.
   * 
   * @example
   * // Toggle criterion selection
   * handleCriteriaToggle('criteria-123');
   */
  const handleCriteriaToggle = (id) => {
    setSelectedCriteria(prev => {
      const setPrev = new Set((prev || []).map(String));
      const sid = String(id);
      if (setPrev.has(sid)) {
        setPrev.delete(sid);
      } else {
        setPrev.add(sid);
      }
      return Array.from(setPrev);
    });
  };

  /**
   * Handles toggling service status (active/inactive)
   * 
   * This function is called when user clicks to toggle a service's status.
   * It calls the API to toggle the status and reloads the services list.
   * 
   * @param {string|number} id - Service ID to toggle status for
   * @returns {Promise<Object>} Result object with success status
   * 
   * @example
   * // Toggle service status
   * await handleToggleStatus(service.id);
   */
  const handleToggleStatus = async (id) => {
    try {
      setTogglingStatusId(id);
      const result = await medicalService.toggleServiceStatus(id);
      if (result.success) {
        setSuccess('Cập nhật trạng thái thành công');
        await loadServices();
      } else {
        setError(result.message);
      }
      return result;
    } catch (error) {
      setError('Lỗi cập nhật trạng thái');
      return { success: false };
    } finally {
      setTogglingStatusId(null);
    }
  };

  /**
   * Handles service deletion request
   * 
   * This function is called when user clicks to delete a service. It opens
   * a confirmation dialog before actually deleting.
   * 
   * @param {string|number} id - Service ID to delete
   * @returns {void} Does not return a value. Opens confirmation dialog.
   * 
   * @example
   * // Request to delete a service
   * handleDelete(service.id);
   */
  const handleDelete = (id) => {
    setServiceToDelete(id);
    setShowConfirmDialog(true);
    setDeleteCountdown(3);
  };

  /**
   * Handles showing service detail modal
   * 
   * This function is called when user clicks to view details of a service.
   * It fetches the service's criteria from the backend and displays them
   * in a detail modal.
   * 
   * **Criteria fetching:**
   * - Tries getPackageCriteriaById first
   * - Falls back to getCriteriaForPackage if first fails
   * 
   * @param {Object} service - Service object to view details for
   * @returns {Promise<void>} Does not return a value. Opens detail modal with criteria.
   * 
   * @example
   * // Show service details
   * await handleShowDetail(service);
   */
  const handleShowDetail = async (service) => {
    setDetailService(service || null);
    setShowDetailModal(true);
    setDetailCriteria([]);
    setLoadingDetailCriteria(true);
    try {
      const pkgId = service?.id || service?.raw?.packageId || service?.raw?.PackageId || service?.raw?.package_id || service?.raw?.id;
      if (!pkgId) {
        setDetailCriteria([]);
        return;
      }
      // Prefer explicit package criteria endpoint
      let resp = { success: false };
      try {
        if (typeof testOrderService.getPackageCriteriaById === 'function') {
          resp = await testOrderService.getPackageCriteriaById(pkgId);
        }
      } catch (e) { /* ignore */ }
      // Fallback to generic getCriteriaForPackage
      if ((!resp || !resp.success) && typeof testOrderService.getCriteriaForPackage === 'function') {
        try {
          resp = await testOrderService.getCriteriaForPackage(pkgId);
        } catch (e) { /* ignore */ }
      }

      if (resp && resp.success && Array.isArray(resp.data) && resp.data.length > 0) {
        const norm = resp.data.map((c, idx) => {
          const candidate = c && (c.criteriaId ?? c.criteria_id ?? c.id ?? c.testCriterionId ?? c.criterionId ?? c.code ?? c.name ?? null);
          const idVal = candidate !== null && candidate !== undefined ? String(candidate) : `criteria-detail-${idx}`;
          const nameVal = c && (c.criteriaName || c.criteria_name || c.name || c.title || c.code) ? (c.criteriaName || c.criteria_name || c.name || c.title || c.code) : idVal;
          return { id: idVal, name: nameVal, raw: c };
        });
        setDetailCriteria(norm);
      } else {
        setDetailCriteria([]);
      }
    } catch (e) {
      setDetailCriteria([]);
    } finally {
      setLoadingDetailCriteria(false);
    }
  };

  /**
   * Confirms and executes service deletion
   * 
   * This function is called when user confirms service deletion in the dialog.
   * It performs:
   * 1. Deletes service via API
   * 2. Reloads services list
   * 3. Closes confirmation dialog and shows success notification
   * 
   * @returns {Promise<void>} Does not return a value. Deletes service and updates state.
   * 
   * @example
   * // Confirm deletion
   * await confirmDelete();
   */
  const confirmDelete = async () => {
    if (!serviceToDelete) return;

    setIsDeleting(true);
    try {
      const result = await medicalService.deleteService(serviceToDelete);
      if (result.success) {
        setSuccess('Xóa dịch vụ thành công');
        loadServices();
        setShowConfirmDialog(false);
        setServiceToDelete(null);
      } else {
        setError(result.message);
      }
    } catch (error) {
      setError('Lỗi xóa dịch vụ');
    } finally {
      setIsDeleting(false);
    }
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

  /**
   * Gets status badge component for service status
   * 
   * This helper function returns a Badge component with appropriate styling
   * based on whether the service is active or inactive.
   * 
   * **Badge variants:**
   * - Active: 'success' variant (green) with "Hoạt động" text
   * - Inactive: 'danger' variant (red) with "Ngừng hoạt động" text
   * 
   * @param {boolean} isActive - Whether the service is active
   * @returns {React.ReactNode} Badge component
   * 
   * @example
   * // Get status badge for service
   * const badge = getStatusBadge(service.isActive);
   */
  const getStatusBadge = (isActive) => {
    return isActive ? (
      <Badge bg="success">Hoạt động</Badge>
    ) : (
      <Badge bg="danger">vô hiệu hóa</Badge>
    );
  };

  if (loading) {
    return (
      <Container className="py-4">
        <div className="text-center">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Đang tải...</span>
          </div>
        </div>
      </Container>
    );
  }

  return (
    <Container className="py-4">
      <Row className="mb-4">
        <Col>
          <h2>
            <i className="fas fa-cogs me-2"></i>
            Quản lý dịch vụ xét nghiệm
          </h2>
        </Col>
        <Col md="auto">
          {isReceptionist && (
            <Button variant="primary" onClick={() => handleShowModal()}>
              <i className="fas fa-plus me-1"></i>
              Thêm dịch vụ
            </Button>
          )}
        </Col>
      </Row>

      {error && (
        <Alert variant="danger" dismissible onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert variant="success" dismissible onClose={() => setSuccess('')}>
          {success}
        </Alert>
      )}

      {/* Filters */}
      <Card className="mb-4">
        <Card.Body>
          <Row className="align-items-center">
            <Col md={6}>
              <Form.Group>
                <Form.Label>Tìm kiếm</Form.Label>
                <Form.Control
                  type="text"
                  placeholder="Tìm theo tên hoặc mô tả..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </Form.Group>
            </Col>
            <Col md={3}>
              <Form.Group>
                <Form.Label>Trạng thái</Form.Label>
                <Form.Select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="all">Tất cả</option>
                  <option value="active">Hoạt động</option>
                  <option value="inactive">Ngừng hoạt động</option>
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={3} className="text-end">
              <Badge bg="info" className="me-2">
                Tổng: {filteredServices.length} dịch vụ
              </Badge>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* Services Table */}
      <Card>
        <Card.Body className="p-0">
          <Table responsive hover>
            <thead className="table-light">
              <tr>
                <th>Tên dịch vụ</th>
                <th>Mô tả</th>
                <th>Giá</th>
                <th>Trạng thái</th>
                <th>Ngày tạo</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {filteredServices.map((svc) => {
                const service = svc || {};
                const key = service.id || service.raw?.packageId || service.raw?.package_id || service.name || JSON.stringify(service).slice(0, 12);
                const name = service.name || service.raw?.packageName || service.raw?.package_name || '-';
                const desc = String(service.description || service.raw?.description || '');
                const shortDesc = desc.length > 50 ? `${desc.substring(0, 50)}...` : (desc || '-');
                const price = Number.isFinite(Number(service.price)) ? service.price : (service.raw && Number.isFinite(Number(service.raw.price)) ? Number(service.raw.price) : 0);
                const isActive = !!service.isActive;
                let createdText = '-';
                try {
                  const dateVal = service.createdAt || service.raw?.createdAt || service.raw?.created_at;
                  if (dateVal) {
                    const d = new Date(dateVal);
                    if (!isNaN(d.getTime())) createdText = d.toLocaleDateString('vi-VN');
                  }
                } catch (e) { }

                return (
                  <tr key={key}>
                    <td>
                      <strong>{name}</strong>
                    </td>
                    <td>
                      <small className="text-muted">{shortDesc}</small>
                    </td>
                    <td>
                      <strong className="text-success">{formatCurrency(price)}</strong>
                    </td>
                    <td>{getStatusBadge(isActive)}</td>
                    <td>
                      <small>{createdText}</small>
                    </td>
                    <td>
                      <ButtonGroup size="sm">
                        {isReceptionist && (
                          <Button variant="outline-primary" onClick={() => handleShowModal(service)}>
                            <i className="fas fa-edit"></i>
                          </Button>
                        )}
                        <Button variant="outline-info" onClick={() => handleShowDetail(service)}>
                          <i className="fas fa-eye"></i>
                        </Button>
                        {isReceptionist && (
                          <Button
                            variant={isActive ? 'outline-warning' : 'outline-success'}
                            onClick={() => handleToggleStatus(key)}
                            disabled={togglingStatusId === key}
                          >
                            {togglingStatusId === key ? (
                              <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                            ) : (
                              <i className={`fas fa-${isActive ? 'pause' : 'play'}`}></i>
                            )}
                          </Button>
                        )}
                        {isReceptionist && (
                          <Button
                            variant="outline-danger"
                            onClick={() => handleDelete(key)}
                            title="Xóa dịch vụ"
                          >
                            <i className="fas fa-trash"></i>
                          </Button>
                        )}
                      </ButtonGroup>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        </Card.Body>
      </Card>

      {/* Modal thêm/sửa dịch vụ */}
      <Modal show={showModal} onHide={handleCloseModal} size="xl">
        <Modal.Header closeButton style={{ background: '#f8fafc' }}>
          <Modal.Title>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ fontSize: 18, fontWeight: 700 }}>{editingService ? 'Sửa dịch vụ' : 'Thêm dịch vụ mới'}</div>
              {editingService && (
                <div className="text-muted small">{editingService ? (editingService.name || editingService.raw?.packageName) : ''}</div>
              )}
            </div>
          </Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSubmit}>
          <Modal.Body>
            <Row>
              <Col md={12}>
                <Card style={{ border: '1px solid #e6f0ff', background: '#fbfdff', padding: 12 }} className="mb-3">
                  <Card.Body>
                    <Form.Group className="mb-3">
                      <Form.Label>Tên dịch vụ *</Form.Label>
                      <Form.Control
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        placeholder="Nhập tên dịch vụ"
                        required
                        style={{ borderColor: '#cfe2ff' }}
                      />
                    </Form.Group>

                    <Form.Group className="mb-3">
                      <Form.Label>Mô tả *</Form.Label>
                      <Form.Control
                        as="textarea"
                        rows={4}
                        name="description"
                        value={formData.description}
                        onChange={handleChange}
                        placeholder="Nhập mô tả dịch vụ"
                        required
                        style={{ borderColor: '#cfe2ff' }}
                      />
                    </Form.Group>

                    <Row>
                      <Col md={8}>
                        <Form.Group className="mb-3">
                          <Form.Label>Giá dịch vụ *</Form.Label>
                          <Form.Control
                            type="number"
                            name="price"
                            value={formData.price}
                            onChange={handleChange}
                            placeholder="Nhập giá dịch vụ"
                            min="0"
                            step="1000"
                            required
                            style={{ borderColor: '#cfe2ff' }}
                          />
                        </Form.Group>
                      </Col>
                      <Col md={4}>
                        <Form.Group className="mb-3">
                          <Form.Label>Đơn vị</Form.Label>
                          <Form.Select
                            name="unit"
                            value={formData.unit}
                            onChange={handleChange}
                            style={{ borderColor: '#cfe2ff' }}
                          >
                            <option value="VNĐ">VNĐ</option>
                            <option value="USD">USD</option>
                          </Form.Select>
                        </Form.Group>
                      </Col>
                    </Row>
                  </Card.Body>
                </Card>
              </Col>

              {/* Temporarily hidden criteria section per user request
              <Col md={6}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <div style={{ fontWeight: 700 }}>Tiêu chí xét nghiệm</div>
                  <Button size="sm" variant="outline-primary" onClick={loadAllCriteria} disabled={loadingCriteria}>
                    {loadingCriteria ? 'Đang tải...' : 'Tải tất cả tiêu chí'}
                  </Button>
                </div>

                <Card style={{ border: '1px solid #eef7ff', background: '#fbfdff', maxHeight: 360, overflowY: 'auto', padding: 8 }}>
                  <div style={{ marginBottom: 8 }}>
                    <small className="text-muted">Đã chọn: {selectedCriteria.length} tiêu chí</small>
                  </div>
                  <div>
                    {allCriteria && allCriteria.length > 0 ? allCriteria.map((c, i) => (
                      <div key={c.id || c.name || `crit-${i}`} style={{ padding: '6px 4px', borderBottom: '1px solid rgba(0,0,0,0.03)' }}>
                        <Form.Check
                          type="checkbox"
                          id={`edit-crit-${c.id || i}`}
                          label={(
                            <div>
                              <div style={{ fontWeight: 600, whiteSpace: 'normal' }}>{c.name || c.id || `#${i}`}</div>
                              <div className="text-muted small" style={{ whiteSpace: 'normal' }}>{(c.raw && (c.raw.description || c.raw.unit)) ? `${c.raw.description || ''}${c.raw.description && c.raw.unit ? ' — ' : ''}${c.raw.unit || ''}` : ''}</div>
                            </div>
                          )}
                          checked={Array.isArray(selectedCriteria) ? selectedCriteria.map(String).includes(String(c.id)) : false}
                          onChange={() => handleCriteriaToggle(c.id)}
                        />
                      </div>
                    )) : (
                      <div className="text-muted">Chưa có tiêu chí. Nhấn "Tải tất cả tiêu chí" để nạp.</div>
                    )}
                  </div>
                </Card>
              </Col>
              */}
            </Row>

            {error && (
              <Alert variant="danger" className="mt-3">{error}</Alert>
            )}

            {success && (
              <Alert variant="success" className="mt-3">{success}</Alert>
            )}
          </Modal.Body>
          <Modal.Footer>
            <Button variant="outline-secondary" onClick={handleCloseModal}>
              Hủy
            </Button>
            {editingService && (
              <Button
                variant={editingService.isActive ? 'outline-warning' : 'outline-success'}
                onClick={async () => {
                  try {
                    const targetId = editingService.id || editingService.raw?.packageId || editingService.raw?.PackageId || editingService.raw?.package_id || editingService;
                    await handleToggleStatus(targetId);
                    // close modal after toggling
                    handleCloseModal();
                  } catch (e) {
                  }
                }}
                disabled={togglingStatusId === (editingService && (editingService.id || editingService.raw?.packageId || editingService.raw?.PackageId || editingService.raw?.package_id))}
              >
                {togglingStatusId === (editingService && (editingService.id || editingService.raw?.packageId || editingService.raw?.PackageId || editingService.raw?.package_id)) ? (
                  <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                ) : (
                  (editingService.isActive ? 'Vô hiệu hóa' : 'Kích hoạt')
                )}
              </Button>
            )}
            {editingService && (
              <Button
                variant="outline-danger"
                onClick={() => {
                  handleCloseModal();
                  const targetId = editingService.id || editingService.raw?.packageId || editingService.raw?.PackageId || editingService.raw?.package_id;
                  handleDelete(targetId);
                }}
              >
                Xóa dịch vụ
              </Button>
            )}
            <Button variant="primary" type="submit">
              {editingService ? 'Cập nhật' : 'Thêm mới'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
      {/* Modal xem chi tiết dịch vụ (read-only) */}
      <Modal show={showDetailModal} onHide={() => { setShowDetailModal(false); setDetailService(null); setDetailCriteria([]); }} size="xl">
        <Modal.Header closeButton style={{ background: '#f8f9fa' }}>
          <Modal.Title>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ fontSize: 18, fontWeight: 700 }}>{detailService ? (detailService.name || detailService.raw?.packageName || 'Chi tiết dịch vụ') : 'Chi tiết dịch vụ'}</div>
              {detailService && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div className="text-muted small">{detailService && detailService.price !== undefined ? formatCurrency(Number(detailService.price || detailService.raw?.price || 0)) : ''}</div>
                  <div>{detailService ? getStatusBadge(!!(detailService.isActive || detailService.raw?.isActive || (String(detailService.raw?.status || '').toLowerCase() === 'active'))) : null}</div>
                </div>
              )}
            </div>
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {loadingDetailCriteria ? (
            <div className="text-center py-3">
              <div className="spinner-border text-primary" role="status"><span className="visually-hidden">Đang tải...</span></div>
            </div>
          ) : (
            <div>
              <Row>
                <Col md={12}>
                  <div style={{ padding: 16, borderRadius: 8, background: '#f1f8ff', height: '100%' }}>
                    <h6 style={{ marginTop: 0 }}>Thông tin dịch vụ</h6>
                    <div className="mb-2"><strong>Tên:</strong>
                      <div style={{ marginLeft: 8, whiteSpace: 'normal', wordBreak: 'break-word', overflowWrap: 'break-word' }}>{detailService ? (detailService.name || detailService.raw?.packageName || '-') : '-'}</div>
                    </div>
                    <div className="mb-2"><strong>Mô tả:</strong>
                      <div style={{ marginLeft: 8, whiteSpace: 'normal', wordBreak: 'break-word', overflowWrap: 'break-word' }}>{detailService ? (detailService.description || detailService.raw?.description || '-') : '-'}</div>
                    </div>
                    <div className="mb-2"><strong>Giá:</strong> <div style={{ display: 'inline-block', marginLeft: 8 }}>{detailService ? formatCurrency(Number(detailService.price || detailService.raw?.price || 0)) : '-'}</div></div>
                    <div className="mb-2"><strong>Trạng thái:</strong> <div style={{ display: 'inline-block', marginLeft: 8 }}>{detailService ? getStatusBadge(!!(detailService.isActive || detailService.raw?.isActive || (String(detailService.raw?.status || '').toLowerCase() === 'active'))) : '-'}</div></div>
                  </div>
                </Col>
                {/* Temporarily hidden criteria section per user request
                <Col md={8}>
                  <h6>Tiêu chí liên quan ({detailCriteria.length})</h6>
                  {detailCriteria && detailCriteria.length > 0 ? (
                    <div style={{ maxHeight: '60vh', overflowY: 'auto', paddingRight: 8 }}>
                      <Row>
                        {detailCriteria.map((c, i) => (
                          <Col md={6} key={c.id || c.name || `crit-card-${i}` } className="d-flex">
                            <Card className="mb-3 flex-fill h-100" style={{ borderLeft: `4px solid ${c.raw?.activeFlag === false ? '#adb5bd' : '#0d6efd'}` }}>
                              <Card.Body className="d-flex flex-column">
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <div style={{ fontWeight: 700, whiteSpace: 'normal', wordBreak: 'break-word', overflowWrap: 'break-word' }}>{c.name || c.id || `#${i}`}</div>
                                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                    {c.raw?.unit && <Badge bg="secondary" pill>{c.raw.unit}</Badge>}
                                    {c.raw?.activeFlag !== undefined && <Badge bg={c.raw?.activeFlag ? 'success' : 'secondary'}>{c.raw?.activeFlag ? 'Hoạt động' : 'Ngưng'}</Badge>}
                                  </div>
                                </div>
                                {c.raw?.description && <div className="text-muted small mt-2 flex-grow-1" style={{ whiteSpace: 'normal', wordBreak: 'break-word', overflowWrap: 'break-word' }}>{c.raw.description}</div>}
                                <div style={{ marginTop: 8 }}>
                                  {(c.raw?.referenceMin !== undefined || c.raw?.referenceMax !== undefined) && (
                                    <div style={{ color: '#0d6efd', fontWeight: 600 }} className="small">Ngưỡng: {c.raw?.referenceMin ?? '-'} — {c.raw?.referenceMax ?? '-'}</div>
                                  )}
                                </div>
                              </Card.Body>
                            </Card>
                          </Col>
                        ))}
                      </Row>
                    </div>
                  ) : (
                    <div className="text-muted">Không tìm thấy tiêu chí cho gói dịch vụ này.</div>
                  )}
                </Col>
                */}
              </Row>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => { setShowDetailModal(false); setDetailService(null); setDetailCriteria([]); }}>Đóng</Button>
        </Modal.Footer>
      </Modal>

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        show={showConfirmDialog}
        onHide={() => {
          setShowConfirmDialog(false);
          setServiceToDelete(null);
        }}
        onConfirm={confirmDelete}
        title="Xác nhận xóa dịch vụ"
        message="Bạn có chắc chắn muốn xóa dịch vụ này? Hành động này không thể hoàn tác."
        confirmText={deleteCountdown > 0 ? `Xóa (${deleteCountdown}s)` : 'Xóa'}
        cancelText="Hủy"
        variant="danger"
        isLoading={isDeleting}
        confirmDisabled={deleteCountdown > 0}
      />
    </Container>
  );
};

export default Services;
