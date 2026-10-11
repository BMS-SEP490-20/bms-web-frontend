/**
 * Status Helper Utilities
 * 
 * Provides utility functions for managing status transitions,
 * validations, and status-related operations.
 * 
 * @author Blood Laboratory Management Team
 * @version 2.0.0
 * @since 2024-12-22
 */

import React from 'react';
import { Badge } from 'react-bootstrap';
import {
  APPOINTMENT_STATUS,
  SAMPLE_STATUS,
  LAB_TEST_STATUS,
  INVOICE_STATUS,
  RESULT_DELIVERY_STATUS,
  STATUS_TRANSITIONS,
  ACTIVE_STATUSES,
  COMPLETED_STATUSES,
  CANCELLED_STATUSES
} from '../../constants/status';

// ============================================================================
// VALIDATION FUNCTIONS
// ============================================================================

/**
 * Check if a status transition is valid
 * @param {string} entity - Entity type (APPOINTMENT, SAMPLE, LAB_TEST)
 * @param {string} fromStatus - Current status
 * @param {string} toStatus - Target status
 * @returns {boolean} True if transition is valid
 */
export const isValidTransition = (entity, fromStatus, toStatus) => {
  const transitions = STATUS_TRANSITIONS[entity];
  if (!transitions || !transitions[fromStatus]) {
    return false;
  }
  return transitions[fromStatus].includes(toStatus);
};

/**
 * Get all valid next statuses for a given status
 * @param {string} entity - Entity type
 * @param {string} currentStatus - Current status
 * @returns {Array} Array of valid next statuses
 */
export const getNextValidStatuses = (entity, currentStatus) => {
  const transitions = STATUS_TRANSITIONS[entity];
  return transitions?.[currentStatus] || [];
};

/**
 * Check if a status is active (ongoing process)
 * @param {string} entity - Entity type
 * @param {string} status - Status to check
 * @returns {boolean} True if status is active
 */
export const isActiveStatus = (entity, status) => {
  const activeStatuses = ACTIVE_STATUSES[entity];
  return activeStatuses ? activeStatuses.includes(status) : false;
};

/**
 * Check if a status is completed
 * @param {string} entity - Entity type
 * @param {string} status - Status to check
 * @returns {boolean} True if status is completed
 */
export const isCompletedStatus = (entity, status) => {
  const completedStatuses = COMPLETED_STATUSES[entity];
  return completedStatuses ? completedStatuses.includes(status) : false;
};

/**
 * Check if a status is cancelled
 * @param {string} entity - Entity type
 * @param {string} status - Status to check
 * @returns {boolean} True if status is cancelled
 */
export const isCancelledStatus = (entity, status) => {
  const cancelledStatuses = CANCELLED_STATUSES[entity];
  return cancelledStatuses ? cancelledStatuses.includes(status) : false;
};

// ============================================================================
// STATUS DISPLAY FUNCTIONS
// ============================================================================

/**
 * Get display label for status in Vietnamese
 * @param {string} status - Status value
 * @returns {string} Display label
 */
export const getStatusLabel = (status) => {
  // Handle null/undefined status
  if (!status) {
    return 'Chưa có trạng thái';
  }
  
  // Normalize status: lowercase, replace spaces/dashes with underscores
  const normalized = String(status).toLowerCase().replace(/[\s-]/g, '_');
  
  const labels = {
    // Invoice status
    'pending_payment': 'Đang chờ',
    'pending': 'Đang chờ',
    'pendding': 'Đang chờ', // Lỗi chính tả từ backend
    'paid': 'Đã thanh toán',
    'success': 'Thành công',
    'overdue': 'Quá hạn',
    'cancelled': 'Đã hủy',
    'cancelled_by_patient': 'Đã hủy',
    'failed': 'Thất bại',
    // Appointment status
    'pending_confirmation': 'Đang chờ', // Backend uses PENDING_CONFIRMATION - đặt lịch thành công, chờ thanh toán
    'scheduled': 'Đã khám',
    'confirmed': 'Đặt lịch thành công',
    'checked_in': 'Đã check-in',
    'đã_check_in': 'Đã check-in', // biến thể tiếng Việt
    'sample_collected': 'Đã lấy mẫu',
    'sample_processed': 'Đã xử lý mẫu',
    'result_pending': 'Chờ duyệt kết quả',
    'waiting_review': 'Chờ duyệt',
    'ready_for_consultation': 'Sẵn sàng tư vấn',
    'completed': 'Hoàn thành',
    'approved': 'Đã duyệt',
    'delivered': 'Đã gửi',
    'no_show': 'Không đến',
    // Sample status
    'pending_collection': 'Chờ lấy mẫu',
    'processing': 'Đang xử lý',
    'collected': 'Đã lấy mẫu',
    'result_entered': 'Đã nhập kết quả',
  };
  
  // Check uppercase variants (SUCCESS, PENDDING, PAID, etc.)
  const upperNormalized = String(status).toUpperCase().replace(/[\s-]/g, '_');
  const upperLabels = {
    'SUCCESS': 'Thành công',
    'PENDDING': 'Đang chờ',
    'PENDING': 'Đang chờ',
    'PAID': 'Đã thanh toán',
    'OVERDUE': 'Quá hạn',
    'CANCELLED': 'Đã hủy',
    'FAILED': 'Thất bại',
  };
  
  // Try lowercase first, then uppercase
  const label = labels[normalized] || upperLabels[upperNormalized] || String(status);
  
  // Return Vietnamese label (không capitalize vì đã là tiếng Việt)
  return label;
};

/**
 * Get badge color for status
 * @param {string} status - Status value
 * @returns {string} Bootstrap color class
 */
export const getStatusBadgeColor = (status) => {
  // Normalize status: lowercase, replace spaces/dashes with underscores
  const normalized = (status || '').toLowerCase().replace(/[\s-]/g, '_');
  
  const colors = {
    // Invoice status
    'pending_payment': 'warning',
    'pending': 'warning',
    'pendding': 'warning', // Lỗi chính tả từ backend
    'paid': 'success',
    'success': 'success',
    'overdue': 'danger',
    'cancelled': 'danger',
    'cancelled_by_patient': 'danger',
    'failed': 'danger',
    // Appointment status
    'pending_confirmation': 'warning', // Backend uses PENDING_CONFIRMATION
    'scheduled': 'primary',
    'confirmed': 'info',
    'checked_in': 'success', // xanh lá
    'đã_check_in': 'success', // biến thể tiếng Việt -> xanh lá
    'sample_collected': 'info',
    'sample_processed': 'info',
    'result_pending': 'warning',
    'waiting_review': 'secondary',
    'ready_for_consultation': 'primary',
    'pending_collection': 'warning', // Chờ lấy mẫu - vàng
    'completed': 'success',
    'approved': 'success',
    'delivered': 'success',
    'no_show': 'danger',
    // Sample status
    'processing': 'info',
    'collected': 'info',
    'result_entered': 'info',
  };
  
  // Check uppercase variants
  const upperNormalized = (status || '').toUpperCase().replace(/[\s-]/g, '_');
  const upperColors = {
    'SUCCESS': 'success',
    'PENDDING': 'warning',
    'PENDING': 'warning',
    'PAID': 'success',
    'OVERDUE': 'danger',
    'CANCELLED': 'danger',
    'FAILED': 'danger',
  };
  
  return colors[normalized] || upperColors[upperNormalized] || 'info';
};

/**
 * Get icon for status
 * @param {string} status - Status value
 * @returns {string} FontAwesome icon class
 */
export const getStatusIcon = (status) => {
  const icons = {
    // Pending/Waiting
    'pending_payment': 'fa-clock',
    'scheduled': 'fa-calendar-check',
    'pending': 'fa-hourglass-half',
    'result_pending': 'fa-hourglass',
    'waiting_review': 'fa-user-md',
    'ready_for_consultation': 'fa-comments',
    
    // Active/In Progress
    'confirmed': 'fa-check-circle',
    'checked_in': 'fa-sign-in-alt',
    'sample_collected': 'fa-vial',
    'sample_processed': 'fa-flask',
    'collected': 'fa-vial',
    'processing': 'fa-spinner',
    'result_entered': 'fa-file-alt',
    
    // Completed
    'completed': 'fa-check-double',
    'approved': 'fa-thumbs-up',
    'delivered': 'fa-paper-plane',
    
    // Cancelled/Failed
    'cancelled': 'fa-times-circle',
    'no_show': 'fa-user-slash',
    'failed': 'fa-exclamation-triangle'
  };
  
  return icons[status] || 'fa-circle';
};

// ============================================================================
// BUSINESS LOGIC HELPERS
// ============================================================================

/**
 * Check if appointment can be checked in
 * @param {Object} appointment - Appointment object
 * @returns {boolean} True if can check-in
 */
export const canCheckIn = (appointment) => {
  return appointment.status === APPOINTMENT_STATUS.CONFIRMED;
};

/**
 * Check if sample can be collected
 * @param {Object} appointment - Appointment object
 * @returns {boolean} True if can collect sample
 */
export const canCollectSample = (appointment) => {
  return appointment.status === APPOINTMENT_STATUS.CHECKED_IN;
};

/**
 * Check if sample can be marked as processed
 * @param {Object} sample - Sample object
 * @returns {boolean} True if can mark as processed
 */
export const canMarkSampleProcessed = (sample) => {
  return sample.status === SAMPLE_STATUS.COLLECTED ||
         sample.status === SAMPLE_STATUS.PROCESSING;
};

/**
 * Check if results can be entered
 * @param {Object} sample - Sample object
 * @param {Object} appointment - Appointment object
 * @returns {boolean} True if can enter results
 */
export const canEnterResults = (sample, appointment) => {
  return sample.status === SAMPLE_STATUS.COMPLETED &&
         appointment.status === APPOINTMENT_STATUS.SAMPLE_PROCESSED;
};

/**
 * Check if results can be confirmed internally
 * @param {Object} labTest - Lab test object
 * @returns {boolean} True if can confirm
 */
export const canConfirmResults = (labTest) => {
  return labTest.status === LAB_TEST_STATUS.RESULT_ENTERED;
};

/**
 * Check if results can be sent to doctor
 * @param {Object} labTest - Lab test object
 * @returns {boolean} True if can send
 */
export const canSendToDoctor = (labTest) => {
  return labTest.status === LAB_TEST_STATUS.RESULT_PENDING;
};

/**
 * Check if doctor can approve results
 * @param {Object} labTest - Lab test object
 * @returns {boolean} True if can approve
 */
export const canApproveResults = (labTest) => {
  return labTest.status === LAB_TEST_STATUS.WAITING_REVIEW;
};

/**
 * Check if appointment can be marked as no-show
 * @param {Object} appointment - Appointment object
 * @returns {boolean} True if can mark no-show
 */
export const canMarkNoShow = (appointment) => {
  return appointment.status === APPOINTMENT_STATUS.CONFIRMED;
};

/**
 * Check if appointment can be cancelled
 * @param {Object} appointment - Appointment object
 * @returns {boolean} True if can cancel
 */
export const canCancelAppointment = (appointment) => {
  return appointment.status !== APPOINTMENT_STATUS.COMPLETED &&
         appointment.status !== APPOINTMENT_STATUS.CANCELLED &&
         appointment.status !== APPOINTMENT_STATUS.NO_SHOW;
};

// ============================================================================
// WORKFLOW PROGRESS HELPERS
// ============================================================================

/**
 * Get workflow progress percentage
 * @param {string} status - Current status
 * @returns {number} Progress percentage (0-100)
 */
export const getWorkflowProgress = (status) => {
  const progressMap = {
    [APPOINTMENT_STATUS.PENDING_PAYMENT]: 0,
    [APPOINTMENT_STATUS.SCHEDULED]: 10,
    [APPOINTMENT_STATUS.CONFIRMED]: 20,
    [APPOINTMENT_STATUS.CHECKED_IN]: 30,
    [APPOINTMENT_STATUS.SAMPLE_COLLECTED]: 40,
    [APPOINTMENT_STATUS.SAMPLE_PROCESSED]: 50,
    [APPOINTMENT_STATUS.RESULT_PENDING]: 60,
    [APPOINTMENT_STATUS.WAITING_REVIEW]: 80,
    [APPOINTMENT_STATUS.COMPLETED]: 100,
    [APPOINTMENT_STATUS.NO_SHOW]: 0,
    [APPOINTMENT_STATUS.CANCELLED]: 0
  };
  
  return progressMap[status] || 0;
};

/**
 * Get workflow step number
 * @param {string} status - Current status
 * @returns {number} Step number (1-8)
 */
export const getWorkflowStep = (status) => {
  const stepMap = {
    [APPOINTMENT_STATUS.PENDING_PAYMENT]: 1,
    [APPOINTMENT_STATUS.SCHEDULED]: 1,
    [APPOINTMENT_STATUS.CONFIRMED]: 2,
    [APPOINTMENT_STATUS.CHECKED_IN]: 3,
    [APPOINTMENT_STATUS.SAMPLE_COLLECTED]: 4,
    [APPOINTMENT_STATUS.SAMPLE_PROCESSED]: 5,
    [APPOINTMENT_STATUS.RESULT_PENDING]: 6,
    [APPOINTMENT_STATUS.WAITING_REVIEW]: 7,
    [APPOINTMENT_STATUS.COMPLETED]: 8
  };
  
  return stepMap[status] || 0;
};

/**
 * Get workflow step label
 * @param {number} step - Step number
 * @returns {string} Step label
 */
export const getWorkflowStepLabel = (step) => {
  const labels = {
    1: 'Đặt lịch & Thanh toán',
    2: 'Xác nhận',
    3: 'Check-in',
    4: 'Lấy mẫu',
    5: 'Xử lý mẫu',
    6: 'Nhập kết quả',
    7: 'Bác sĩ duyệt',
    8: 'Hoàn thành'
  };
  
  return labels[step] || 'Không xác định';
};

// ============================================================================
// SYNC HELPERS (for maintaining data consistency)
// ============================================================================

/**
 * Get corresponding appointment status for sample status
 * @param {string} sampleStatus - Sample status
 * @returns {string} Corresponding appointment status
 */
export const getAppointmentStatusFromSample = (sampleStatus) => {
  const mapping = {
    [SAMPLE_STATUS.COLLECTED]: APPOINTMENT_STATUS.SAMPLE_COLLECTED,
    [SAMPLE_STATUS.PROCESSING]: APPOINTMENT_STATUS.SAMPLE_COLLECTED,
    [SAMPLE_STATUS.COMPLETED]: APPOINTMENT_STATUS.SAMPLE_PROCESSED
  };
  
  return mapping[sampleStatus] || null;
};

/**
 * Get corresponding appointment status for lab test status
 * @param {string} labTestStatus - Lab test status
 * @returns {string} Corresponding appointment status
 */
export const getAppointmentStatusFromLabTest = (labTestStatus) => {
  const mapping = {
    [LAB_TEST_STATUS.PENDING]: APPOINTMENT_STATUS.SAMPLE_PROCESSED,
    [LAB_TEST_STATUS.RESULT_ENTERED]: APPOINTMENT_STATUS.SAMPLE_PROCESSED,
    [LAB_TEST_STATUS.RESULT_PENDING]: APPOINTMENT_STATUS.RESULT_PENDING,
    [LAB_TEST_STATUS.WAITING_REVIEW]: APPOINTMENT_STATUS.WAITING_REVIEW,
    [LAB_TEST_STATUS.APPROVED]: APPOINTMENT_STATUS.COMPLETED
  };
  
  return mapping[labTestStatus] || null;
};

/**
 * Validate status synchronization between entities
 * @param {Object} appointment - Appointment object
 * @param {Object} sample - Sample object (optional)
 * @param {Object} labTest - Lab test object (optional)
 * @returns {Object} Validation result with errors
 */
export const validateStatusSync = (appointment, sample = null, labTest = null) => {
  const errors = [];
  
  // Check appointment-sample sync
  if (sample) {
    const expectedAppointmentStatus = getAppointmentStatusFromSample(sample.status);
    if (expectedAppointmentStatus && appointment.status !== expectedAppointmentStatus) {
      errors.push({
        type: 'appointment-sample',
        message: `Appointment status (${appointment.status}) doesn't match sample status (${sample.status})`
      });
    }
  }
  
  // Check appointment-labTest sync
  if (labTest) {
    const expectedAppointmentStatus = getAppointmentStatusFromLabTest(labTest.status);
    if (expectedAppointmentStatus && appointment.status !== expectedAppointmentStatus) {
      errors.push({
        type: 'appointment-labTest',
        message: `Appointment status (${appointment.status}) doesn't match lab test status (${labTest.status})`
      });
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

// ============================================================================
// REACT COMPONENTS
// ============================================================================

/**
 * StatusBadge Component
 * 
 * Renders a Bootstrap badge with appropriate color and label for a status.
 * 
 * @param {Object} props - Component props
 * @param {string} props.entity - Entity type (appointment, sample, labTest, invoice, resultDelivery)
 * @param {string} props.status - Status value
 * @param {boolean} props.showIcon - Whether to show icon (default: false)
 * @returns {React.ReactNode} Badge component
 */
export const StatusBadge = ({ entity, status, showIcon = false }) => {
  const label = getStatusLabel(status);
  const color = getStatusBadgeColor(status);
  const icon = showIcon ? getStatusIcon(status) : null;
  
  return (
    <Badge bg={color} className="status-badge">
      {showIcon && icon && <i className={`fas ${icon} me-1`}></i>}
      {label}
    </Badge>
  );
};

// ============================================================================
// EXPORT ALL CONSTANTS FOR CONVENIENCE
// ============================================================================

export {
  APPOINTMENT_STATUS,
  SAMPLE_STATUS,
  LAB_TEST_STATUS,
  INVOICE_STATUS,
  RESULT_DELIVERY_STATUS
};
