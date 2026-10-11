/**
 * Payment History Component
 * 
 * Component for displaying patient payment history with sorting and pagination.
 * Shows all invoices with payment status, amounts, and dates.
 * 
 * @author Blood Laboratory Management Team
 * @version 1.0.0
 * @since 2024
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Container, Row, Col, Card, Badge, Table, Pagination, Spinner, Alert, Button, Modal } from 'react-bootstrap';
import { motion } from 'framer-motion';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../../../../shared/contexts/AuthContext';
import { invoiceService } from '../../../../services/invoiceService';
import { patientService } from '../../../../services/patientService';
import { medicalService } from '../../../../services/medicalService';
import { appointmentService } from '../../../../services/appointmentService';
import { getPatientData, getPatientByEmail } from '../../../../services/patientDataPrefetchService';
import { useNotificationContext } from '../../../../shared/contexts/NotificationContext';
import { useAutoRefresh } from '../../../../shared/hooks/useAutoRefresh';
import PatientHeader from '../../../../components/Layout/PatientHeader';
import GuestFooter from '../../../../components/Layout/GuestFooter';

/**
 * Payment History Component
 * 
 * Displays patient's payment history with sorting by date (newest first)
 * and pagination for better performance.
 * 
 * @returns {React.ReactNode} Payment history component
 */
const PaymentHistory = () => {
  const { user } = useAuth();
  const { showError } = useNotificationContext();
  const location = useLocation();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [patientId, setPatientId] = useState(null);
  const [testPackages, setTestPackages] = useState([]);
  const [enrichedInvoice, setEnrichedInvoice] = useState(null); // Invoice với service name đã được fetch
  const itemsPerPage = 9;
  
  // Use ref to track if we've already checked for refresh flag in this render cycle
  const refreshCheckedRef = useRef(false);

  useEffect(() => {
    loadPaymentHistory();
    // Reset refresh check when user changes
    refreshCheckedRef.current = false;
  }, [user?.email]);

  // Refresh when navigating to payment history page (e.g., after payment is completed)
  useEffect(() => {
    // Check if we just navigated to payment history page after payment is completed
    const shouldRefresh = sessionStorage.getItem('shouldRefreshPayments') === 'true' || 
                         sessionStorage.getItem('shouldRefreshPaymentHistory') === 'true';
    
    if (shouldRefresh && user && user.id && !refreshCheckedRef.current) {
      // Mark as checked
      refreshCheckedRef.current = true;
      // Clear the flags
      sessionStorage.removeItem('shouldRefreshPayments');
      sessionStorage.removeItem('shouldRefreshPaymentHistory');
      // Force fresh fetch to get the new payment
      // Small delay to ensure backend has saved the payment
      setTimeout(() => {
        loadPaymentHistory(true);
      }, 500);
    }
  }, [location.pathname, user]); // eslint-disable-line react-hooks/exhaustive-deps

  /**
   * Effect: Additional refresh check for Dashboard tab switching
   * 
   * This effect runs once on component mount to handle cases where the component
   * is embedded in a Dashboard with tabs. When switching tabs, the component may
   * not detect navigation changes, so this effect checks for refresh flags after
   * a short delay.
   * 
   * @effect
   * @dependencies [] - Runs only once on mount
   */
  useEffect(() => {
    // Reset refresh check when component is rendered
    refreshCheckedRef.current = false;
    
    // Check flag after a short delay to ensure it's set
    const checkTimer = setTimeout(() => {
      const shouldRefresh = sessionStorage.getItem('shouldRefreshPayments') === 'true' || 
                           sessionStorage.getItem('shouldRefreshPaymentHistory') === 'true';
      if (shouldRefresh && user && user.id) {
        sessionStorage.removeItem('shouldRefreshPayments');
        sessionStorage.removeItem('shouldRefreshPaymentHistory');
        loadPaymentHistory(true);
      }
    }, 100);
    
    return () => clearTimeout(checkTimer);
  }, []); // Only run on mount/render

  /**
   * Effect: Listen for payment completed event
   * 
   * This effect sets up an event listener for the 'paymentCompleted' custom event.
   * When a payment is completed (e.g., from VNPay callback), this component
   * automatically refreshes the payment history to show the new payment.
   * 
   * Uses a 1500ms delay to ensure backend has fully saved the payment record.
   * 
   * @effect
   * @dependencies {string} user?.email - User email from auth context
   */
  useEffect(() => {
    const handlePaymentCompleted = (event) => {
      // Log for debugging
      console.log('PaymentHistory: Received paymentCompleted event', event?.detail);
      // Longer delay to ensure backend has fully saved the payment record
      setTimeout(() => {
        // Force fresh reload when payment is completed
        console.log('PaymentHistory: Refreshing payment history...');
        loadPaymentHistory(true);
      }, 1500); // Increased delay to 1.5 seconds
    };

    window.addEventListener('paymentCompleted', handlePaymentCompleted);
    
    return () => {
      window.removeEventListener('paymentCompleted', handlePaymentCompleted);
    };
  }, [user?.email]); // eslint-disable-line react-hooks/exhaustive-deps

  /**
   * Generates a consistent GUID (UUID v4 format) from a string input
   * 
   * This helper function creates a deterministic GUID from any string (patient ID, email, etc.)
   * using a hash-based approach. The generated GUID follows UUID v4 format:
   * xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx (36 characters total)
   * 
   * This is used to convert patient IDs (like "PAT-xxx") or emails into GUID format
   * required by the payment service backend, which expects GUID format for patientId.
   * 
   * The function uses multiple hash functions and combines them to ensure:
   * - Consistency: Same input always produces same output
   * - Uniqueness: Different inputs produce different outputs
   * - Valid format: Output matches UUID v4 specification
   * 
   * @param {string} str - Input string to convert to GUID (e.g., patient ID, email)
   * @returns {string|null} GUID string in format xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx,
   *                       or null if input is falsy
   * 
   * @example
   * generateGuidFromString('PAT-123') // Returns: 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d'
   * generateGuidFromString('user@example.com') // Returns: 'f6e5d4c3-b2a1-4f9e-8d7c-6b5a4f3e2d1c'
   */
  const generateGuidFromString = (str) => {
    if (!str) return null;

    // Simple hash function for consistency
    let hash1 = 0;
    let hash2 = 0;
    let hash3 = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash1 = ((hash1 << 5) - hash1) + char;
      hash1 = hash1 & hash1;
      hash2 = ((hash2 << 3) - hash2) + char;
      hash2 = hash2 & hash2;
      hash3 = ((hash3 << 7) - hash3) + char;
      hash3 = hash3 & hash3;
    }

    // Generate GUID format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx (36 chars total)
    // where x is any hexadecimal digit and y is one of 8, 9, A, or B
    // Format breakdown: 8-4-4-4-12 = 32 hex chars + 4 hyphens = 36 total

    const h1 = Math.abs(hash1).toString(16).padStart(8, '0').substring(0, 8);
    const h2 = Math.abs(hash2).toString(16).padStart(4, '0').substring(0, 4);
    const h3 = Math.abs((hash1 ^ hash2)).toString(16).padStart(4, '0').substring(0, 3);
    const h4 = ((Math.abs(hash1) & 0x3) | 0x8).toString(16); // y must be 8, 9, a, or b

    // Generate last 12 hex digits from multiple hash combinations
    const part1 = Math.abs((hash1 + hash2)).toString(16).padStart(12, '0');
    const part2 = Math.abs((hash2 + hash3)).toString(16).padStart(12, '0');
    const part3 = Math.abs((hash1 + hash3)).toString(16).padStart(12, '0');
    const part4 = Math.abs((hash1 * hash2 + hash3)).toString(16).padStart(12, '0');

    // Combine parts to ensure we have enough characters (at least 15 for h5a + h5b)
    const combined = (part1 + part2 + part3 + part4).padStart(48, '0');

    // Format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
    // h1(8) - h2(4) - 4h3(3) - h4(1)h5a(3) - h5b(12)
    // Total: 8 + 4 + 4 + 4 + 12 = 32 hex + 4 hyphens = 36 chars
    const h5a = combined.substring(0, 3);
    // Get remaining characters from index 3 onwards, ensure we have 12
    let h5b = combined.substring(3);
    // Ensure h5b has exactly 12 characters by padding or truncating
    if (h5b.length < 12) {
      h5b = h5b.padEnd(12, '0');
    } else {
      h5b = h5b.substring(0, 12);
    }

    // Format đúng: h1(8) - h2(4) - 4h3(3) - h4(1)h5a(3) - h5b(12)
    // Phần thứ 3: "4" + h3(3) = 4 ký tự
    // Phần thứ 4: h4(1) + h5a(3) = 4 ký tự
    const guid = `${h1}-${h2}-4${h3}-${h4}${h5a}-${h5b}`;

    // Debug: verify GUID length and format
    if (guid.length !== 36) {
      // Fallback: pad or truncate to ensure 36 chars
      const padded = guid.padEnd(36, '0').substring(0, 36);
      return padded;
    }

    // Validate GUID format với regex
    const guidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!guidRegex.test(guid)) {
      // Retry with corrected format
      const corrected = `${h1}-${h2}-4${h3.padEnd(3, '0')}-${h4}${h5a.padEnd(3, '0')}-${h5b.padEnd(12, '0')}`;
      return corrected.substring(0, 36);
    }

    return guid;
  };

  /**
   * Convert Patient ID to GUID format
   * Patient service trả về ID dạng "PAT-xxx", backend Payment service yêu cầu GUID
   */
  /**
   * Converts patient ID to GUID format if needed
   * 
   * This utility function checks if a patient ID is already in GUID format.
   * If it is, returns it as-is. If not (e.g., "PAT-xxx" format), converts it
   * to GUID format using generateGuidFromString.
   * 
   * This is used because the payment service backend requires patient IDs
   * in GUID format, but the patient service may return IDs in other formats.
   * 
   * @param {string} patientId - Patient ID in any format (GUID, "PAT-xxx", etc.)
   * @returns {string|null} Patient ID in GUID format, or null if input is falsy
   * 
   * @example
   * convertPatientIdToGuid('a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d') // Returns: 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d'
   * convertPatientIdToGuid('PAT-123') // Returns: 'f6e5d4c3-b2a1-4f9e-8d7c-6b5a4f3e2d1c'
   */
  const convertPatientIdToGuid = (patientId) => {
    if (!patientId) return null;

    // Nếu đã là GUID format, return luôn
    const guidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (guidRegex.test(patientId)) {
      return patientId;
    }

    // Convert từ "PAT-xxx" hoặc string khác sang GUID
    return generateGuidFromString(patientId);
  };

  /**
   * Gets patient ID from user email and converts to GUID format
   * 
   * This function retrieves the patient ID from the patient service using
   * the user's email. It then converts the patient ID to GUID format as
   * required by the payment service backend.
   * 
   * Note: user.id is the Account ID (ACC-xxx), not the Patient ID (PAT-xxx).
   * We need to fetch the Patient ID separately from the patient service.
   * 
   * @returns {Promise<string|null>} Patient ID in GUID format, or null if not found
   * 
   * @example
   * const patientGuid = await getPatientIdFromEmail();
   * // Returns: 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d' or null
   */
  const getPatientIdFromEmail = async () => {
    if (!user?.email) {
      return null;
    }

    try {
      const patientResult = await getPatientByEmail(user.email);

      if (patientResult.success && patientResult.data) {
        const pid = patientResult.data.id || patientResult.data.Id || patientResult.data.patientId || patientResult.data.PatientId;

        // Convert Patient ID sang GUID format (backend Payment service yêu cầu GUID)
        const patientGuid = convertPatientIdToGuid(pid);

        return patientGuid;
      } else {
        return null;
      }
    } catch (error) {
      return null;
    }
  };

  /**
   * Loads payment history for the current patient
   * 
   * This function is the core data fetching function for the payment history page.
   * It performs the following operations:
   * 1. Retrieves patient ID from email and converts to GUID format
   * 2. Validates GUID format before making API calls
   * 3. Fetches test packages and appointments for service name enrichment
   * 4. Fetches invoices from payment service
   * 5. Sorts invoices by date (newest first)
   * 6. Enriches each invoice with service/test package name by:
   *    - Priority 1: From invoice.items[0].serviceName
   *    - Priority 1.5: From appointment via AppointmentId
   *    - Priority 2: From appointment via PatientId and date matching
   *    - Priority 3: Fallback to invoice fields
   * 
   * The enrichment process ensures that invoices display the correct service
   * name even when the payment record doesn't include it directly.
   * 
   * @param {boolean} [forceFresh=false] - If true, bypasses cache and forces fresh data fetch.
   *                                      Used when we know data has changed (e.g., after payment).
   * @returns {Promise<void>} Does not return a value. Updates component state with enriched invoices.
   * 
   * @example
   * // Load cached data (default)
   * await loadPaymentHistory();
   * 
   * // Force fresh fetch after payment
   * await loadPaymentHistory(true);
   */
  const loadPaymentHistory = async (forceFresh = false) => {
    try {
      setLoading(true);
      // Lấy Patient ID từ email (user.id là Account ID, không phải Patient ID)
      let currentPatientId = patientId;
      if (!currentPatientId && user?.email) {
        currentPatientId = await getPatientIdFromEmail();
        if (currentPatientId) {
          setPatientId(currentPatientId);
        }
      }
      if (!currentPatientId) {
        showError('Không tìm thấy thông tin bệnh nhân. Vui lòng cập nhật hồ sơ trước.');
        setInvoices([]);
        setLoading(false);
        return;
      }
      // Validate GUID format trước khi gọi API
      const guidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!guidRegex.test(currentPatientId)) {
        showError('Định dạng ID bệnh nhân không hợp lệ');
        setInvoices([]);
        setLoading(false);
        return;
      }
      // ============================================================
      // PHẦN MỚI: Load test packages để lấy tên xét nghiệm chính xác (sử dụng cache)
      // ============================================================
      let allTestPackages = [];
      try {
        const packagesResult = await getPatientData('services', forceFresh);
        if (packagesResult.success && packagesResult.data) {
          allTestPackages = packagesResult.data;
          setTestPackages(allTestPackages);
        }
      } catch (error) {
        // Ignore errors
      }
      // Load appointments để map service name (force fresh if needed)
      let allAppointments = [];
      try {
        const appointmentsResult = await getPatientData('appointments', forceFresh, currentPatientId);
        if (appointmentsResult.success && appointmentsResult.data) {
          allAppointments = appointmentsResult.data;
        }
      } catch (error) {
        // Ignore errors
      }
      // Force fresh fetch to get latest payments (bypass cache)
      // Add small delay if forceFresh to ensure backend has saved the payment
      if (forceFresh) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      const result = await invoiceService.getInvoicesByPatient(currentPatientId, 1, 100);
      if (result.success && result.data) {
        // Sort by date: newest first
        const sortedInvoices = (result.data || []).sort((a, b) => {
          const dateA = new Date(a.createdAt || a.CreatedAt || a.paidAt || a.PaidAt);
          const dateB = new Date(b.createdAt || b.CreatedAt || b.paidAt || b.PaidAt);
          return dateB - dateA; // Descending order (newest first)
        });
        // ============================================================
        // PHẦN MỚI: Enrich invoices với service name chính xác từ appointment và testPackageId
        // Logic: Payment table chỉ có PatientId, không có AppointmentId
        // => Tìm appointment qua PatientId và match theo CreatedAt date
        // ============================================================
        const enrichedInvoices = sortedInvoices.map(invoice => {
          let serviceName = 'Xét nghiệm'; // Default

          // Priority 1: Từ items trong invoice
          if (invoice.items && invoice.items.length > 0 && invoice.items[0].serviceName) {
            serviceName = invoice.items[0].serviceName;
            return { ...invoice, serviceName };
          }

          // Priority 1.5: Tìm appointment trực tiếp qua AppointmentId (nếu có)
          const invoiceAppointmentId = invoice.appointmentId || invoice.AppointmentId || invoice.appointment_id;
          if (invoiceAppointmentId && allAppointments.length > 0) {
            const matchedAppointment = allAppointments.find(apt => {
              const aptId = apt.id || apt.Id || apt.appointmentId || apt.AppointmentId;
              return String(aptId) === String(invoiceAppointmentId);
            });
            
            if (matchedAppointment) {
              const testPackageId = matchedAppointment.TestPackageId ||
                matchedAppointment.testPackageId ||
                matchedAppointment.test_package_id;

              if (testPackageId && allTestPackages.length > 0) {
                const testPackage = allTestPackages.find(pkg => {
                  const pkgId = pkg.PackageId || pkg.packageId || pkg.package_id || pkg.id;
                  return String(pkgId) === String(testPackageId);
                });

                if (testPackage) {
                  serviceName = testPackage.PackageName || testPackage.packageName || testPackage.name || serviceName;
                  return { ...invoice, serviceName };
                }
              }
            }
          }

          // Priority 2: Tìm appointment qua PatientId (fallback nếu không có AppointmentId)
          // Lấy PatientId từ invoice
          const invoicePatientId = invoice.PatientId || invoice.patientId || invoice.patient_id;

          if (invoicePatientId && allAppointments.length > 0) {

            // Tìm tất cả appointments của patient này
            const patientAppointments = allAppointments.filter(apt => {
              const aptPatientId = apt.PatientId || apt.patientId || apt.patient_id;

              // ✅ Convert appointment PatientId (PAT-xxx) sang GUID
              const aptPatientIdGUID = convertPatientIdToGuid(aptPatientId);


              return String(aptPatientIdGUID) === String(invoicePatientId);
            });

            if (patientAppointments.length > 0) {
              // Match appointment theo CreatedAt date (gần nhất với payment date)
              const paymentDate = new Date(invoice.CreatedAt || invoice.createdAt || invoice.PaidAt || invoice.paidAt);

              // Tìm appointment gần nhất với payment date
              let closestAppointment = null;
              let minTimeDiff = Infinity;

              patientAppointments.forEach(apt => {
                const aptDate = new Date(apt.CreatedAt || apt.createdAt || apt.appointmentDate || apt.appointment_date);
                const timeDiff = Math.abs(paymentDate - aptDate);

                if (timeDiff < minTimeDiff) {
                  minTimeDiff = timeDiff;
                  closestAppointment = apt;
                }
              });

              if (closestAppointment) {
                const testPackageId = closestAppointment.TestPackageId ||
                  closestAppointment.testPackageId ||
                  closestAppointment.test_package_id;


                if (testPackageId && allTestPackages.length > 0) {
                  const testPackage = allTestPackages.find(pkg => {
                    const pkgId = pkg.PackageId || pkg.packageId || pkg.package_id || pkg.id;
                    return String(pkgId) === String(testPackageId);
                  });

                  if (testPackage) {
                    serviceName = testPackage.PackageName || testPackage.packageName || testPackage.name || serviceName;
                  } else {
                  }
                } else {
                }
              } else {
              }
            } else {
            }
          } else {
          }

          // Priority 3: Fallback to invoice fields
          if (serviceName === 'Xét nghiệm') {
            serviceName = invoice.service ||
              invoice.testPackageName ||
              invoice.TestPackageName ||
              invoice.appointment?.service ||
              'Xét nghiệm';
          }

          return { ...invoice, serviceName };
        });
        setInvoices(enrichedInvoices);
      } else {
        const errorMessage = result.message || 'Không thể tải lịch sử thanh toán';
        showError(errorMessage);
        setInvoices([]);
      }
    } catch (error) {
      showError(error.response?.data?.message || error.message || 'Lỗi khi tải lịch sử thanh toán');
      setInvoices([]);
    } finally {
      setLoading(false);
    }
  };

  // Auto-refresh hook - must be after loadPaymentHistory is defined
  useAutoRefresh(loadPaymentHistory, {
    eventName: 'paymentsChanged',
    flagKey: 'shouldRefreshPayments'
  });


  // Pagination logic
  /**
   * Total number of pages for pagination
   * 
   * Calculates the total number of pages based on invoices array
   * and items per page. Used to display pagination controls.
   * 
   * @type {number} Total number of pages (rounded up)
   */
  const totalPages = Math.ceil(invoices.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  
  /**
   * Paginates invoices for current page display
   * 
   * This memoized value slices the invoices array to show only
   * the invoices for the current page. It calculates the start and end
   * indices based on currentPage and itemsPerPage.
   * 
   * @type {Array<Object>} Array of invoice objects for current page
   * 
   * @example
   * // If currentPage = 2, itemsPerPage = 9
   * // Shows invoices at indices 9-17 (second page)
   */
  const paginatedInvoices = useMemo(() => {
    return invoices.slice(startIndex, endIndex);
  }, [invoices, startIndex, endIndex]);

  /**
   * Normalizes payment status string to consistent format
   * 
   * This utility function standardizes status strings by converting to lowercase
   * and trimming whitespace. Handles both PascalCase (Success, Pending) and
   * lowercase (success, pending) formats from different API sources.
   * 
   * @param {string} status - Status string to normalize (can be any case/format)
   * @returns {string} Normalized status string in lowercase, or 'pending' if input is falsy
   * 
   * @example
   * normalizeStatus('Success') // Returns: 'success'
   * normalizeStatus('PENDING') // Returns: 'pending'
   * normalizeStatus(null) // Returns: 'pending'
   */
  const normalizeStatus = (status) => {
    if (!status) return 'pending';
    const normalized = String(status).toLowerCase().trim();
    return normalized;
  };

  /**
   * Gets status badge configuration for payment status
   * 
   * This function returns the appropriate badge variant, text, and icon for
   * displaying payment status. It handles various status formats and normalizes
   * them to consistent display values in Vietnamese.
   * 
   * **Status mappings:**
   * - 'pending' → 'warning' badge with "Chờ thanh toán"
   * - 'paid', 'success', 'completed' → 'success' badge with "Đã thanh toán"
   * - 'refunded_full' → 'info' badge with "Hoàn tiền 100%"
   * - 'refunded_partial' → 'secondary' badge with "Hoàn tiền 70%"
   * - 'cancelled' → 'danger' badge with "Đã hủy"
   * - 'failed' → 'danger' badge with "Thất bại"
   * - Default → 'secondary' badge with original status
   * 
   * @param {string} status - Payment status (case-insensitive)
   * @returns {Object} Badge configuration object with variant, text, and icon properties
   * 
   * @example
   * const config = getStatusConfig('paid');
   * // Returns: { variant: 'success', text: 'Đã thanh toán', icon: 'fa-check-circle' }
   */
  const getStatusConfig = (status) => {
    const normalized = normalizeStatus(status);

    const configs = {
      'pending': { variant: 'warning', text: 'Chờ thanh toán', icon: 'fa-clock' },
      'paid': { variant: 'success', text: 'Đã thanh toán', icon: 'fa-check-circle' },
      'success': { variant: 'success', text: 'Đã thanh toán', icon: 'fa-check-circle' },
      'completed': { variant: 'success', text: 'Đã thanh toán', icon: 'fa-check-circle' },
      'refunded_full': { variant: 'info', text: 'Hoàn tiền 100%', icon: 'fa-undo' },
      'refunded_partial': { variant: 'secondary', text: 'Hoàn tiền 70%', icon: 'fa-undo' },
      'cancelled': { variant: 'danger', text: 'Đã hủy', icon: 'fa-times-circle' },
      'failed': { variant: 'danger', text: 'Thất bại', icon: 'fa-exclamation-circle' }
    };

    return configs[normalized] || {
      variant: 'secondary',
      text: status || 'Chưa xác định',
      icon: 'fa-question-circle'
    };
  };

  /**
   * Gets payment method text in Vietnamese
   * 
   * This function converts payment method codes to user-friendly Vietnamese text.
   * It handles various payment method formats and infers method from transaction
   * reference if needed (e.g., VNPay transactions have TxnRef).
   * 
   * **Payment method mappings:**
   * - 'bank_transfer', 'banktransfer', 'vnpay', 'vnpay_qr' → "Chuyển khoản (QR VNPay)"
   * - 'credit_card', 'creditcard' → "Thẻ tín dụng"
   * - 'cash' → "Tiền mặt"
   * - 'momo' → "MoMo"
   * - 'zalopay' → "ZaloPay"
   * 
   * @param {Object} invoice - Invoice object containing payment method information
   * @returns {string} Payment method text in Vietnamese
   * 
   * @example
   * getPaymentMethodText({ paymentMethod: 'vnpay' }) // Returns: 'Chuyển khoản (QR VNPay)'
   * getPaymentMethodText({ txnRef: 'VNPAY123' }) // Returns: 'Chuyển khoản (QR VNPay)'
   */
  const getPaymentMethodText = (invoice) => {
    // Nếu có paymentMethod trực tiếp, dùng nó
    const method = invoice?.paymentMethod || invoice?.paymentMethodName || invoice?.PaymentMethod;
    if (method) {
      const normalized = String(method).toLowerCase().trim();
      const methods = {
        'bank_transfer': 'Chuyển khoản (QR VNPay)',
        'banktransfer': 'Chuyển khoản (QR VNPay)',
        'credit_card': 'Thẻ tín dụng',
        'creditcard': 'Thẻ tín dụng',
        'vnpay': 'Chuyển khoản (QR VNPay)',
        'vnpay_qr': 'Chuyển khoản (QR VNPay)',
        'cash': 'Tiền mặt',
        'momo': 'MoMo',
        'zalopay': 'ZaloPay'
      };
      return methods[normalized] || method;
    }

    // Nếu không có paymentMethod, infer từ TxnRef (nếu có TxnRef thì là VNPay)
    const txnRef = invoice?.txnRef || invoice?.TxnRef || invoice?.transactionCode || invoice?.TransactionCode;
    if (txnRef) {
      return 'Chuyển khoản (QR VNPay)';
    }

    // Nếu có Status là "Success" hoặc "Paid" nhưng không có TxnRef, có thể là thanh toán khác
    const status = invoice?.status || invoice?.Status || '';
    if (status.toLowerCase() === 'success' || status.toLowerCase() === 'paid') {
      return 'Chuyển khoản (QR VNPay)'; // Default cho VNPay
    }

    return 'Chưa chọn';
  };

  /**
   * Formats date string to Vietnamese locale format with time
   * 
   * Converts a date string (ISO format or any valid date string) to
   * Vietnamese locale format with date and time (dd/mm/yyyy, HH:mm).
   * 
   * @param {string} dateString - Date string to format (e.g., '2024-12-04T10:00:00Z')
   * @returns {string} Formatted date string in Vietnamese locale (e.g., '04/12/2024, 10:00')
   * 
   * @example
   * formatDate('2024-12-04T10:00:00Z') // Returns: '04/12/2024, 10:00'
   */
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  /**
   * Format số tiền sang VND, handle NaN/undefined/null
   */
  const formatCurrency = (amount) => {
    if (amount === null || amount === undefined || isNaN(amount) || amount === '') {
      return '0 ₫';
    }
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    if (isNaN(numAmount)) {
      return '0 ₫';
    }
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(numAmount);
  };

  /**
   * Enrich invoice với service name từ appointment và testPackageId
   */
  const enrichInvoiceWithServiceName = async (invoice) => {
    // Nếu đã có serviceName, không cần fetch lại
    if (invoice.serviceName && invoice.serviceName !== 'Xét nghiệm') {
      setEnrichedInvoice(invoice);
      return;
    }

    let serviceName = invoice.serviceName || invoice.service || invoice.testPackageName || invoice.TestPackageName;

    // Nếu chưa có serviceName hoặc là giá trị mặc định, fetch từ appointment
    if (!serviceName || serviceName === 'Xét nghiệm') {
      try {
        // Lấy appointmentId từ invoice (nếu có)
        let appointmentId = invoice.appointmentId || invoice.AppointmentId || invoice.appointment?.id || invoice.appointment?.Id;

        // Nếu không có appointmentId, thử tìm appointment bằng cách khác
        if (!appointmentId && patientId) {
          // Try to find appointment by patientId and payment date

          // Fetch tất cả appointments của patient
          const allAppointmentsResult = await appointmentService.getAllAppointments();
          if (allAppointmentsResult.success && allAppointmentsResult.data) {
            const paymentDate = invoice.createdAt || invoice.CreatedAt || invoice.paidAt || invoice.PaidAt;

            if (paymentDate) {
              // Tìm appointment có ngày gần nhất với payment date
              const paymentDateObj = new Date(paymentDate);
              const matchingAppointments = allAppointmentsResult.data
                .filter(apt => {
                  // Match theo createdBy (email) hoặc patientId nếu có
                  const aptCreatedBy = apt.createdBy || apt.CreatedBy || '';
                  const aptDate = apt.createdAt || apt.CreatedAt;

                  if (!aptDate) return false;

                  // Match theo date (trong vòng 1 ngày)
                  const aptDateObj = new Date(aptDate);
                  const diffDays = Math.abs((paymentDateObj - aptDateObj) / (1000 * 60 * 60 * 24));

                  return diffDays <= 1; // Trong vòng 1 ngày
                })
                .sort((a, b) => {
                  // Sắp xếp theo độ gần với payment date
                  const dateA = new Date(a.createdAt || a.CreatedAt);
                  const dateB = new Date(b.createdAt || b.CreatedAt);
                  return Math.abs(paymentDateObj - dateA) - Math.abs(paymentDateObj - dateB);
                });

              if (matchingAppointments.length > 0) {
                const matchedAppointment = matchingAppointments[0];
                appointmentId = matchedAppointment.id || matchedAppointment.Id || matchedAppointment.appointmentId || matchedAppointment.AppointmentId;
              }
            }
          }
        }

        if (appointmentId) {

          // Fetch appointment từ appointmentId
          const appointmentResult = await appointmentService.getAppointmentById(appointmentId);

          if (appointmentResult.success && appointmentResult.data) {
            const appointment = appointmentResult.data;
            const testPackageId = appointment.testPackageId || appointment.TestPackageId || appointment.test_package_id;


            // Fetch service name từ testPackageId
            if (testPackageId) {
              const servicesResult = await medicalService.getAllServices();
              if (servicesResult.success && servicesResult.data) {
                const matchedService = servicesResult.data.find(s => {
                  const sId = s.PackageId || s.packageId || s.TestPackageId || s.testPackageId || s.id || s.Id;
                  return String(sId) === String(testPackageId);
                });

                if (matchedService) {
                  serviceName = matchedService.PackageName || matchedService.packageName || matchedService.name || matchedService.Name;
                } else {
                }
              }
            } else {
            }
          } else {
          }
        }
      } catch (error) {
      }
    }

    // Cập nhật enriched invoice
    const enriched = {
      ...invoice,
      serviceName: serviceName || 'Xét nghiệm'
    };

    setEnrichedInvoice(enriched);
  };

  if (loading) {
    return (
      <div className="min-vh-100 d-flex align-items-center justify-content-center">
        <div className="text-center">
          <Spinner animation="border" variant="primary" size="lg" />
          <p className="mt-3 text-muted">Đang tải lịch sử thanh toán...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-vh-100" style={{
      background: `linear-gradient(135deg, rgba(13, 110, 253, 0.1) 0%, rgba(13, 110, 253, 0.05) 100%), url(${require('../../../../assets/background2.jpg')})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundAttachment: 'fixed'
    }}>
      <PatientHeader />
      <Container className="py-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-5"
            style={{
              background: 'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)',
              padding: '3rem 2rem',
              borderRadius: '24px',
              boxShadow: '0 20px 60px rgba(30, 60, 114, 0.3), 0 0 0 1px rgba(30, 60, 114, 0.1)',
              margin: '0 1rem',
              position: 'relative',
              overflow: 'hidden'
            }}
          >
            {/* Decorative background elements */}
            <div
              style={{
                position: 'absolute',
                top: '-50%',
                right: '-10%',
                width: '300px',
                height: '300px',
                background: 'radial-gradient(circle, rgba(255, 255, 255, 0.1) 0%, transparent 70%)',
                borderRadius: '50%',
                pointerEvents: 'none'
              }}
            />
            <div
              style={{
                position: 'absolute',
                bottom: '-30%',
                left: '-5%',
                width: '200px',
                height: '200px',
                background: 'radial-gradient(circle, rgba(255, 255, 255, 0.08) 0%, transparent 70%)',
                borderRadius: '50%',
                pointerEvents: 'none'
              }}
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              style={{ position: 'relative', zIndex: 1 }}
            >
              <motion.div
                whileHover={{ scale: 1.05 }}
                transition={{ type: "spring", stiffness: 300 }}
                style={{ display: 'inline-block', marginBottom: '1rem' }}
              >
                <motion.i
                  className="fas fa-credit-card"
                  style={{
                    fontSize: '3.5rem',
                    color: '#ffffff',
                    display: 'inline-block',
                    filter: 'drop-shadow(0 4px 8px rgba(0, 0, 0, 0.2))',
                    textShadow: '0 2px 10px rgba(255, 255, 255, 0.3)'
                  }}
                  animate={{
                    rotate: [0, 5, -5, 0],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    repeatType: "reverse",
                    ease: "easeInOut"
                  }}
                />
              </motion.div>

              <motion.h2
                className="mb-3"
                style={{
                  fontSize: 'clamp(1.75rem, 4vw, 2.5rem)',
                  fontWeight: '700',
                  letterSpacing: '-0.02em',
                  lineHeight: '1.2',
                  color: '#ffffff',
                  marginTop: '1rem',
                  textShadow: '0 2px 20px rgba(0, 0, 0, 0.3), 0 0 30px rgba(255, 255, 255, 0.1)',
                  position: 'relative'
                }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
              >
                Lịch sử thanh toán
              </motion.h2>

              <motion.div
                initial={{ width: 0 }}
                animate={{ width: '80px' }}
                transition={{ duration: 0.8, delay: 0.5 }}
                style={{
                  height: '4px',
                  background: 'linear-gradient(90deg, rgba(255, 255, 255, 0.8) 0%, rgba(255, 255, 255, 0.4) 100%)',
                  borderRadius: '2px',
                  margin: '0 auto 1.5rem',
                  boxShadow: '0 2px 8px rgba(255, 255, 255, 0.3)'
                }}
              />

              <motion.p
                className="lead"
                style={{
                  fontSize: 'clamp(1rem, 2vw, 1.25rem)',
                  color: 'rgba(255, 255, 255, 0.9)',
                  fontWeight: '400',
                  letterSpacing: '0.01em',
                  marginBottom: '0',
                  position: 'relative',
                  textShadow: '0 1px 5px rgba(0, 0, 0, 0.2)'
                }}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.4 }}
              >
                Theo dõi tất cả giao dịch thanh toán của bạn
              </motion.p>
            </motion.div>
          </motion.div>

          <Row className="mb-4">
            <Col>
              <Card className="border-0 shadow-sm">
                <Card.Body className="p-4">
                  <Row className="g-3">
                    <Col md={3}>
                      <div className="text-center p-3" style={{ background: 'rgba(13, 110, 253, 0.1)', borderRadius: '10px' }}>
                        <div className="h4 text-primary mb-1">{invoices.length}</div>
                        <div className="text-muted small">Tổng giao dịch</div>
                      </div>
                    </Col>
                    <Col md={3}>
                      <div className="text-center p-3" style={{ background: 'rgba(25, 135, 84, 0.1)', borderRadius: '10px' }}>
                        <div className="h4 text-success mb-1">
                          {invoices.filter(inv => {
                            const normalized = normalizeStatus(inv.status);
                            return normalized === 'paid' || normalized === 'success' || normalized === 'completed';
                          }).length}
                        </div>
                        <div className="text-muted small">Đã thanh toán</div>
                      </div>
                    </Col>
                    <Col md={3}>
                      <div className="text-center p-3" style={{ background: 'rgba(255, 193, 7, 0.1)', borderRadius: '10px' }}>
                        <div className="h4 text-warning mb-1">
                          {invoices.filter(inv => normalizeStatus(inv.status) === 'pending').length}
                        </div>
                        <div className="text-muted small">Chờ thanh toán</div>
                      </div>
                    </Col>
                    <Col md={3}>
                      <div className="text-center p-3" style={{ background: 'rgba(108, 117, 125, 0.1)', borderRadius: '10px' }}>
                        <div className="h4 text-secondary mb-1">
                          {formatCurrency(
                            invoices.reduce((sum, inv) => {
                              const amount = inv.paidAmount || inv.totalAmount || inv.amount || inv.Amount || inv.PaidAmount || inv.TotalAmount || 0;
                              const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
                              return sum + (isNaN(numAmount) ? 0 : numAmount);
                            }, 0)
                          )}
                        </div>
                        <div className="text-muted small">Tổng đã thanh toán</div>
                      </div>
                    </Col>
                  </Row>
                </Card.Body>
              </Card>
            </Col>
          </Row>

          {invoices.length === 0 ? (
            <Alert variant="info" className="text-center py-5">
              <i className="fas fa-inbox fa-3x mb-3 text-muted"></i>
              <h5>Chưa có giao dịch nào</h5>
              <p className="text-muted mb-0">Bạn chưa có giao dịch thanh toán nào trong hệ thống</p>
            </Alert>
          ) : (
            <>
              <Row className="g-4">
                {paginatedInvoices.map((invoice, index) => {
                  const statusConfig = getStatusConfig(invoice.status);
                  return (
                    <Col key={invoice.id} xs={12} sm={12} md={6} lg={4}>
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        whileHover={{ y: -5 }}
                      >
                        <Card
                          className="h-100 border-0 shadow-sm"
                          style={{
                            transition: 'all 0.3s ease',
                            cursor: 'pointer',
                            overflow: 'hidden'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.boxShadow = '0 8px 25px rgba(13, 110, 253, 0.15)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.1)';
                          }}
                        >
                          {/* Card Header */}
                          <div
                            style={{
                              background: (() => {
                                const normalized = normalizeStatus(invoice.status);
                                if (normalized === 'paid' || normalized === 'success' || normalized === 'completed') {
                                  return 'linear-gradient(135deg, #198754 0%, #20c997 100%)';
                                } else if (normalized === 'pending') {
                                  return 'linear-gradient(135deg, #ffc107 0%, #ffca2c 100%)';
                                } else if (normalized === 'cancelled' || normalized === 'failed') {
                                  return 'linear-gradient(135deg, #dc3545 0%, #e74c3c 100%)';
                                }
                                return 'linear-gradient(135deg, #6c757d 0%, #adb5bd 100%)';
                              })(),
                              padding: '1.25rem',
                              color: 'white'
                            }}
                          >
                            <div className="d-flex justify-content-between align-items-start mb-2">
                              <div>
                                <div className="small opacity-75 mb-1">Mã giao dịch</div>
                                <code
                                  style={{
                                    color: 'white',
                                    background: 'rgba(255,255,255,0.2)',
                                    padding: '0.25rem 0.5rem',
                                    borderRadius: '6px',
                                    fontSize: '0.9rem',
                                    fontWeight: '600'
                                  }}
                                >
                                  {(() => {
                                    // Lấy ID từ nhiều nguồn: id, paymentId, invoiceId, txnRef
                                    const invoiceId = invoice.id || invoice.paymentId || invoice.invoiceId || invoice.txnRef || invoice.PaymentId || invoice.InvoiceId || invoice.TxnRef;
                                    if (!invoiceId || invoiceId === 'undefined' || invoiceId === 'null') {
                                      return 'XN-00000';
                                    }
                                    // Format: XN-xxxxx (5 digits)
                                    const idStr = String(invoiceId).replace(/[^0-9]/g, ''); // Chỉ lấy số
                                    if (idStr.length === 0) {
                                      // Nếu không có số, dùng hash của ID
                                      const hash = String(invoiceId).split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
                                      return `XN-${String(hash % 100000).padStart(5, '0')}`;
                                    }
                                    return `XN-${idStr.slice(-5).padStart(5, '0')}`;
                                  })()}
                                </code>
                              </div>
                              <Badge
                                bg={statusConfig.variant}
                                style={{
                                  fontSize: '0.85rem',
                                  padding: '0.4rem 0.8rem',
                                  fontWeight: '600',
                                  color: 'white'
                                }}
                              >
                                <i className={`fas ${statusConfig.icon || 'fa-circle'} me-1`}></i>
                                {statusConfig.text}
                              </Badge>
                            </div>
                            <div className="h4 mb-0" style={{ fontWeight: '700' }}>
                              {formatCurrency(invoice.totalAmount || invoice.amount || invoice.Amount || invoice.TotalAmount || 0)}
                            </div>
                          </div>

                          {/* Card Body */}
                          <Card.Body className="p-3">
                            <div className="mb-3">
                              <div className="d-flex align-items-center mb-2">
                                <i className="fas fa-flask text-primary me-2"></i>
                                <small className="text-muted">Gói dịch vụ</small>
                              </div>
                              <div className="fw-medium">
                                {invoice.serviceName || invoice.service || invoice.testPackageName || invoice.TestPackageName || 'Xét nghiệm'}
                              </div>
                            </div>

                            <div className="mb-3">
                              <div className="d-flex align-items-center mb-2">
                                <i className="fas fa-wallet text-primary me-2"></i>
                                <small className="text-muted">Phương thức thanh toán</small>
                              </div>
                              <Badge
                                bg={(invoice.paymentMethod || invoice.paymentMethodName || invoice.PaymentMethod || invoice.txnRef || invoice.TxnRef) ? 'primary' : 'secondary'}
                                style={{
                                  fontSize: '0.85rem',
                                  padding: '0.4rem 0.8rem',
                                  color: 'white'
                                }}
                              >
                                <i className="fas fa-credit-card me-1"></i>
                                {getPaymentMethodText(invoice)}
                              </Badge>
                            </div>

                            <div className="mb-3">
                              <div className="d-flex align-items-center mb-2">
                                <i className="fas fa-calendar-plus text-primary me-2"></i>
                                <small className="text-muted">Ngày tạo</small>
                              </div>
                              <div className="small">
                                <i className="far fa-clock me-1"></i>
                                {formatDate(invoice.createdAt || invoice.CreatedAt || invoice.paidAt || invoice.PaidAt || invoice.date || new Date())}
                              </div>
                            </div>

                            {invoice.paidAt && (
                              <div className="mb-3">
                                <div className="d-flex align-items-center mb-2">
                                  <i className="fas fa-check-circle text-success me-2"></i>
                                  <small className="text-muted">Ngày thanh toán</small>
                                </div>
                                <div className="small text-success fw-medium">
                                  <i className="far fa-clock me-1"></i>
                                  {formatDate(invoice.paidAt)}
                                </div>
                              </div>
                            )}
                          </Card.Body>

                          {/* Card Footer */}
                          <Card.Footer
                            className="bg-white border-0 pt-0 pb-3 px-3"
                          >
                            <Button
                              variant="outline-primary"
                              size="sm"
                              className="w-100"
                              onClick={async () => {
                                setSelectedInvoice(invoice);
                                setShowDetailModal(true);

                                // Fetch service name từ appointment nếu chưa có
                                await enrichInvoiceWithServiceName(invoice);
                              }}
                              style={{
                                borderRadius: '8px',
                                fontWeight: '600',
                                padding: '0.6rem',
                                transition: 'all 0.3s ease'
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.background = 'linear-gradient(135deg, #0d6efd 0%, #0dcaf0 100%)';
                                e.currentTarget.style.color = 'white';
                                e.currentTarget.style.borderColor = 'transparent';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.background = 'transparent';
                                e.currentTarget.style.color = '#0d6efd';
                                e.currentTarget.style.borderColor = '#0d6efd';
                              }}
                            >
                              <i className="fas fa-eye me-2"></i>
                              Xem chi tiết
                            </Button>
                          </Card.Footer>
                        </Card>
                      </motion.div>
                    </Col>
                  );
                })}
              </Row>

              {totalPages > 1 && (
                <div className="d-flex justify-content-center mt-4">
                  <Pagination>
                    <Pagination.First
                      onClick={() => setCurrentPage(1)}
                      disabled={currentPage === 1}
                    />
                    <Pagination.Prev
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                    />

                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      const pageNum = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i;
                      if (pageNum > totalPages) return null;

                      return (
                        <Pagination.Item
                          key={pageNum}
                          active={pageNum === currentPage}
                          onClick={() => setCurrentPage(pageNum)}
                        >
                          {pageNum}
                        </Pagination.Item>
                      );
                    })}

                    <Pagination.Next
                      onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                      disabled={currentPage === totalPages}
                    />
                    <Pagination.Last
                      onClick={() => setCurrentPage(totalPages)}
                      disabled={currentPage === totalPages}
                    />
                  </Pagination>
                </div>
              )}

              <div className="text-center mt-4">
                <small className="text-muted">
                  Hiển thị {startIndex + 1}-{Math.min(endIndex, invoices.length)} trong tổng số {invoices.length} giao dịch
                </small>
              </div>
            </>
          )}
        </motion.div>
      </Container>

      {/* Detail Modal */}
      <Modal
        show={showDetailModal}
        onHide={() => setShowDetailModal(false)}
        centered
        size="lg"
      >
        <Modal.Header
          closeButton
          style={{
            background: 'linear-gradient(135deg, #0d6efd 0%, #0dcaf0 100%)',
            color: 'white',
            padding: '1.5rem 2rem',
            border: 'none'
          }}
        >
          <Modal.Title style={{ fontSize: '1.5rem', fontWeight: '700' }}>
            <i className="fas fa-file-invoice me-3"></i>
            Chi tiết giao dịch
          </Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ padding: '2rem' }}>
          {(enrichedInvoice || selectedInvoice) && (() => {
            // Sử dụng enrichedInvoice nếu có, nếu không dùng selectedInvoice
            const invoiceToDisplay = enrichedInvoice || selectedInvoice;

            return (
              <div>
                {/* Transaction Info */}
                <div
                  className="p-4 rounded mb-4"
                  style={{
                    background: 'linear-gradient(135deg, rgba(13, 110, 253, 0.05) 0%, rgba(13, 202, 240, 0.05) 100%)',
                    border: '2px solid rgba(13, 110, 253, 0.1)'
                  }}
                >
                  <Row className="g-3">
                    <Col xs={12} md={6}>
                      <div className="d-flex align-items-center mb-2">
                        <i className="fas fa-barcode text-primary me-2"></i>
                        <small className="text-muted">Mã giao dịch</small>
                      </div>
                      <code style={{
                        fontSize: '1.1rem',
                        background: '#f8f9fa',
                        padding: '0.5rem 1rem',
                        borderRadius: '8px',
                        fontWeight: '700',
                        color: '#0d6efd'
                      }}>
                        {(() => {
                          const invoiceId = invoiceToDisplay.id || invoiceToDisplay.paymentId || invoiceToDisplay.invoiceId || invoiceToDisplay.txnRef || invoiceToDisplay.PaymentId || invoiceToDisplay.InvoiceId || invoiceToDisplay.TxnRef;
                          if (!invoiceId || invoiceId === 'undefined' || invoiceId === 'null') {
                            return 'XN-00000';
                          }
                          const idStr = String(invoiceId).replace(/[^0-9]/g, '');
                          if (idStr.length === 0) {
                            const hash = String(invoiceId).split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
                            return `XN-${String(hash % 100000).padStart(5, '0')}`;
                          }
                          return `XN-${idStr.slice(-5).padStart(5, '0')}`;
                        })()}
                      </code>
                    </Col>
                    <Col xs={12} md={6}>
                      <div className="d-flex align-items-center mb-2">
                        <i className="fas fa-info-circle text-primary me-2"></i>
                        <small className="text-muted">Trạng thái</small>
                      </div>
                      <Badge
                        bg={getStatusConfig(invoiceToDisplay.status).variant}
                        style={{
                          fontSize: '1rem',
                          padding: '0.5rem 1rem',
                          borderRadius: '8px',
                          color: 'white'
                        }}
                      >
                        <i className={`fas ${getStatusConfig(invoiceToDisplay.status).icon || 'fa-circle'} me-2`}></i>
                        {getStatusConfig(invoiceToDisplay.status).text}
                      </Badge>
                    </Col>
                  </Row>
                </div>

                {/* Amount Section */}
                <div
                  className="p-4 rounded mb-4"
                  style={{
                    background: 'linear-gradient(135deg, rgba(25, 135, 84, 0.1) 0%, rgba(32, 201, 151, 0.1) 100%)',
                    border: '2px solid rgba(25, 135, 84, 0.2)'
                  }}
                >
                  <div className="d-flex justify-content-between align-items-center">
                    <div>
                      <div className="d-flex align-items-center mb-2">
                        <i className="fas fa-money-bill-wave text-success me-2" style={{ fontSize: '1.2rem' }}></i>
                        <span style={{ fontSize: '1.1rem', fontWeight: '600', color: '#198754' }}>Tổng tiền</span>
                      </div>
                      {(() => {
                        const paidAmount = invoiceToDisplay.paidAmount || invoiceToDisplay.PaidAmount || 0;
                        const totalAmount = invoiceToDisplay.totalAmount || invoiceToDisplay.amount || invoiceToDisplay.Amount || invoiceToDisplay.TotalAmount || 0;
                        const paidNum = typeof paidAmount === 'string' ? parseFloat(paidAmount) : paidAmount;
                        const totalNum = typeof totalAmount === 'string' ? parseFloat(totalAmount) : totalAmount;
                        if (paidNum && !isNaN(paidNum) && totalNum && !isNaN(totalNum) && paidNum !== totalNum) {
                          return (
                            <small className="text-muted">
                              Đã thanh toán: {formatCurrency(paidNum)}
                            </small>
                          );
                        }
                        return null;
                      })()}
                    </div>
                    <div className="text-end">
                      <div style={{ fontSize: '2rem', fontWeight: '700', color: '#198754' }}>
                        {formatCurrency(invoiceToDisplay.totalAmount || invoiceToDisplay.amount || invoiceToDisplay.Amount || invoiceToDisplay.TotalAmount || 0)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Patient Information */}
                <div className="mb-4">
                  <h6 className="mb-3" style={{ fontSize: '1.1rem', fontWeight: '700', color: '#0d6efd' }}>
                    <i className="fas fa-user-circle me-2"></i>
                    Thông tin bệnh nhân
                  </h6>
                  <div className="p-3 border rounded" style={{ background: 'rgba(13, 110, 253, 0.02)' }}>
                    <Row className="g-3">
                      <Col xs={12}>
                        <div className="d-flex justify-content-between align-items-center">
                          <span className="text-muted">
                            <i className="fas fa-user me-2"></i>
                            Họ và tên:
                          </span>
                          <strong>{user?.fullName || 'N/A'}</strong>
                        </div>
                      </Col>
                      <Col xs={12}>
                        <div className="d-flex justify-content-between align-items-center">
                          <span className="text-muted">
                            <i className="fas fa-envelope me-2"></i>
                            Email:
                          </span>
                          <span>{user?.email || 'N/A'}</span>
                        </div>
                      </Col>
                      <Col xs={12}>
                        <div className="d-flex justify-content-between align-items-center">
                          <span className="text-muted">
                            <i className="fas fa-phone me-2"></i>
                            Số điện thoại:
                          </span>
                          <span>{user?.phone || 'N/A'}</span>
                        </div>
                      </Col>
                    </Row>
                  </div>
                </div>

                {/* Service Details */}
                <div className="mb-4">
                  <h6 className="mb-3" style={{ fontSize: '1.1rem', fontWeight: '700', color: '#0d6efd' }}>
                    <i className="fas fa-flask me-2"></i>
                    Thông tin dịch vụ
                  </h6>
                  <div className="p-3 border rounded">
                    <Row className="g-3">
                      <Col xs={12}>
                        <div className="d-flex justify-content-between align-items-center">
                          <span className="text-muted">Gói dịch vụ:</span>
                          <strong>{invoiceToDisplay.serviceName || invoiceToDisplay.service || invoiceToDisplay.testPackageName || invoiceToDisplay.TestPackageName || 'Xét nghiệm'}</strong>
                        </div>
                      </Col>
                      {invoiceToDisplay.appointment?.appointmentDate && (
                        <Col xs={12}>
                          <div className="d-flex justify-content-between align-items-center">
                            <span className="text-muted">Ngày hẹn:</span>
                            <strong>
                              {new Date(invoiceToDisplay.appointment.appointmentDate).toLocaleDateString('vi-VN')}
                            </strong>
                          </div>
                        </Col>
                      )}
                    </Row>
                  </div>
                </div>

                {/* Payment Details */}
                <div className="mb-4">
                  <h6 className="mb-3" style={{ fontSize: '1.1rem', fontWeight: '700', color: '#0d6efd' }}>
                    <i className="fas fa-wallet me-2"></i>
                    Thông tin thanh toán
                  </h6>
                  <div className="p-3 border rounded">
                    <Row className="g-3">
                      <Col xs={12}>
                        <div className="d-flex justify-content-between align-items-center">
                          <span className="text-muted">Phương thức:</span>
                          <Badge
                            bg={(invoiceToDisplay.paymentMethod || invoiceToDisplay.paymentMethodName || invoiceToDisplay.PaymentMethod || invoiceToDisplay.txnRef || invoiceToDisplay.TxnRef) ? 'primary' : 'secondary'}
                            style={{
                              fontSize: '0.9rem',
                              padding: '0.4rem 0.8rem',
                              color: 'white'
                            }}
                          >
                            <i className="fas fa-credit-card me-1"></i>
                            {getPaymentMethodText(invoiceToDisplay)}
                          </Badge>
                        </div>
                      </Col>
                      <Col xs={12}>
                        <div className="d-flex justify-content-between align-items-center">
                          <span className="text-muted">Ngày tạo:</span>
                          <span>
                            <i className="far fa-clock me-1"></i>
                            {formatDate(invoiceToDisplay.createdAt || invoiceToDisplay.CreatedAt || invoiceToDisplay.paidAt || invoiceToDisplay.PaidAt || invoiceToDisplay.date || new Date())}
                          </span>
                        </div>
                      </Col>
                      {(invoiceToDisplay.paidAt || invoiceToDisplay.PaidAt) && (
                        <Col xs={12}>
                          <div className="d-flex justify-content-between align-items-center">
                            <span className="text-muted">Ngày thanh toán:</span>
                            <span className="text-success fw-medium">
                              <i className="fas fa-check-circle me-1"></i>
                              {formatDate(invoiceToDisplay.paidAt || invoiceToDisplay.PaidAt)}
                            </span>
                          </div>
                        </Col>
                      )}
                    </Row>
                  </div>
                </div>

                {/* Items if available */}
                {invoiceToDisplay.items && invoiceToDisplay.items.length > 0 && (
                  <div>
                    <h6 className="mb-3" style={{ fontSize: '1.1rem', fontWeight: '700', color: '#0d6efd' }}>
                      <i className="fas fa-list me-2"></i>
                      Chi tiết dịch vụ
                    </h6>
                    <div className="table-responsive">
                      <table className="table table-bordered">
                        <thead className="table-light">
                          <tr>
                            <th>Dịch vụ</th>
                            <th className="text-end">Đơn giá</th>
                            <th className="text-center">Số lượng</th>
                            <th className="text-end">Thành tiền</th>
                          </tr>
                        </thead>
                        <tbody>
                          {invoiceToDisplay.items.map((item, idx) => (
                            <tr key={idx}>
                              <td>{item.serviceName}</td>
                              <td className="text-end">{formatCurrency(item.price)}</td>
                              <td className="text-center">{item.quantity || 1}</td>
                              <td className="text-end fw-medium">
                                {formatCurrency(item.price * (item.quantity || 1))}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            );
          })()}
        </Modal.Body>
        <Modal.Footer style={{ borderTop: '1px solid #dee2e6', padding: '1rem 2rem' }}>
          <Button
            variant="secondary"
            onClick={() => {
              setShowDetailModal(false);
              setEnrichedInvoice(null); // Reset enriched invoice khi đóng modal
            }}
            style={{
              borderRadius: '10px',
              padding: '0.6rem 1.5rem',
              fontWeight: '600'
            }}
          >
            <i className="fas fa-times me-2"></i>
            Đóng
          </Button>
        </Modal.Footer>
      </Modal>
      <GuestFooter />
    </div>
  );
};

export default PaymentHistory;
