/**
 * Status Constants for Blood Laboratory Management System
 * 
 * Centralized status definitions to eliminate duplication and confusion.
 * Each entity has its own set of statuses with clear, unambiguous names.
 * 
 * UPDATED: Aligned with new workflow requirements
 * 
 * @author Blood Laboratory Management Team
 * @version 2.0.0
 * @since 2024-12-22
 */

// ============================================================================
// APPOINTMENT STATUS (Complete Workflow)
// ============================================================================
export const APPOINTMENT_STATUS = {
  // Phase 1: Booking & Payment
  PENDING_PAYMENT: 'pending_payment',              // Chờ thanh toán
  SCHEDULED: 'scheduled',                          // Đã đặt lịch (chưa thanh toán)
  CONFIRMED: 'confirmed',                          // Đã xác nhận (đã thanh toán)
  
  // Phase 2: Check-in & Sample Collection
  CHECKED_IN: 'checked_in',                        // [MỚI] Đã check-in
  SAMPLE_COLLECTED: 'sample_collected',            // Đã lấy mẫu
  
  // Phase 3: Testing & Results
  SAMPLE_PROCESSED: 'sample_processed',            // [MỚI] Đã hoàn thành xét nghiệm (mẫu)
  RESULT_PENDING: 'result_pending',                // [MỚI] Chờ xác nhận kết quả
  WAITING_REVIEW: 'waiting_review',                // Chờ bác sĩ duyệt
  READY_FOR_CONSULTATION: 'ready_for_consultation', // [MỚI] Sẵn sàng tư vấn
  
  // Phase 4: Completion
  COMPLETED: 'completed',                          // Hoàn thành
  
  // Special statuses
  NO_SHOW: 'no_show',                              // [MỚI] Không đến
  CANCELLED: 'cancelled'                           // Đã hủy
};

// ============================================================================
// SAMPLE STATUS (Lab Operations)
// ============================================================================
export const SAMPLE_STATUS = {
  PENDING_COLLECTION: 'pending_collection',        // [MỚI] Chờ lấy mẫu (đã tạo barcode khi check-in, chưa lấy mẫu)
  COLLECTED: 'collected',                          // Đã lấy mẫu, chờ xử lý
  PROCESSING: 'processing',                        // Đang xử lý
  COMPLETED: 'completed',                          // Đã xử lý xong, sẵn sàng nhập kết quả
  CANCELLED: 'cancelled'                           // Đã hủy
};

// ============================================================================
// LAB TEST STATUS (Result Management)
// ============================================================================
export const LAB_TEST_STATUS = {
  PENDING: 'pending',                              // Chờ nhập kết quả
  RESULT_ENTERED: 'result_entered',                // [MỚI] Đã nhập kết quả
  RESULT_PENDING: 'result_pending',                // [MỚI] Chờ xác nhận nội bộ
  WAITING_REVIEW: 'waiting_review',                // Chờ bác sĩ duyệt
  APPROVED: 'approved',                            // Đã duyệt
  CANCELLED: 'cancelled'                           // Đã hủy
};

// ============================================================================
// INVOICE STATUS
// ============================================================================
export const INVOICE_STATUS = {
  PENDING: 'PENDING',                   // Chờ thanh toán
  PAID: 'PAID',                         // Đã thanh toán
  CANCELLED: 'CANCELLED'                // Đã hủy
};


// ============================================================================
// RESULT DELIVERY STATUS
// ============================================================================
export const RESULT_DELIVERY_STATUS = {
  PENDING: 'pending',                              // Chờ giao
  DELIVERED: 'delivered',                          // Đã giao
  FAILED: 'failed'                                 // Thất bại
};

// ============================================================================
// STATUS GROUPS (for filtering and UI)
// ============================================================================

// Active statuses (ongoing processes)
export const ACTIVE_STATUSES = {
  APPOINTMENT: [
    APPOINTMENT_STATUS.CONFIRMED,
    APPOINTMENT_STATUS.CHECKED_IN,
    APPOINTMENT_STATUS.SAMPLE_COLLECTED,
    APPOINTMENT_STATUS.SAMPLE_PROCESSED,
    APPOINTMENT_STATUS.RESULT_PENDING,
    APPOINTMENT_STATUS.WAITING_REVIEW,
    APPOINTMENT_STATUS.READY_FOR_CONSULTATION,
  ],
  SAMPLE: [SAMPLE_STATUS.PENDING_COLLECTION, SAMPLE_STATUS.COLLECTED, SAMPLE_STATUS.PROCESSING],
  LAB_TEST: [
    LAB_TEST_STATUS.PENDING,
    LAB_TEST_STATUS.RESULT_ENTERED,
    LAB_TEST_STATUS.RESULT_PENDING,
    LAB_TEST_STATUS.WAITING_REVIEW
  ],
  INVOICE: [INVOICE_STATUS.PENDING]
};

// Completed statuses (finished processes)
export const COMPLETED_STATUSES = {
  APPOINTMENT: [APPOINTMENT_STATUS.COMPLETED],
  SAMPLE: [SAMPLE_STATUS.COMPLETED],
  LAB_TEST: [LAB_TEST_STATUS.APPROVED],
  INVOICE: [INVOICE_STATUS.PAID]
};

// Cancelled statuses (terminated processes)
export const CANCELLED_STATUSES = {
  APPOINTMENT: [APPOINTMENT_STATUS.CANCELLED, APPOINTMENT_STATUS.NO_SHOW],
  SAMPLE: [SAMPLE_STATUS.CANCELLED],
  LAB_TEST: [LAB_TEST_STATUS.CANCELLED],
  INVOICE: [INVOICE_STATUS.CANCELLED]
};

// ============================================================================
// STATUS TRANSITIONS (valid state changes)
// ============================================================================
export const STATUS_TRANSITIONS = {
  APPOINTMENT: {
    [APPOINTMENT_STATUS.PENDING_PAYMENT]: [
      APPOINTMENT_STATUS.CONFIRMED,
      APPOINTMENT_STATUS.CANCELLED
    ],
    [APPOINTMENT_STATUS.SCHEDULED]: [
      APPOINTMENT_STATUS.CONFIRMED,
      APPOINTMENT_STATUS.CANCELLED
    ],
    [APPOINTMENT_STATUS.CONFIRMED]: [
      APPOINTMENT_STATUS.CHECKED_IN,
      APPOINTMENT_STATUS.NO_SHOW,
      APPOINTMENT_STATUS.CANCELLED
    ],
    [APPOINTMENT_STATUS.CHECKED_IN]: [
      APPOINTMENT_STATUS.SAMPLE_COLLECTED,
      APPOINTMENT_STATUS.CANCELLED
    ],
    [APPOINTMENT_STATUS.SAMPLE_COLLECTED]: [
      APPOINTMENT_STATUS.SAMPLE_PROCESSED,
      APPOINTMENT_STATUS.CANCELLED
    ],
    [APPOINTMENT_STATUS.SAMPLE_PROCESSED]: [
      APPOINTMENT_STATUS.RESULT_PENDING,
      APPOINTMENT_STATUS.CANCELLED
    ],
    [APPOINTMENT_STATUS.RESULT_PENDING]: [
      APPOINTMENT_STATUS.WAITING_REVIEW,
      APPOINTMENT_STATUS.CANCELLED
    ],
    [APPOINTMENT_STATUS.WAITING_REVIEW]: [
      APPOINTMENT_STATUS.COMPLETED,
      APPOINTMENT_STATUS.CANCELLED,
      APPOINTMENT_STATUS.READY_FOR_CONSULTATION
    ]
    ,
    [APPOINTMENT_STATUS.READY_FOR_CONSULTATION]: [
      APPOINTMENT_STATUS.COMPLETED,
      APPOINTMENT_STATUS.CANCELLED
    ]
  },
  SAMPLE: {
    [SAMPLE_STATUS.PENDING_COLLECTION]: [
      SAMPLE_STATUS.COLLECTED,
      SAMPLE_STATUS.CANCELLED
    ],
    [SAMPLE_STATUS.COLLECTED]: [
      SAMPLE_STATUS.PROCESSING,
      SAMPLE_STATUS.CANCELLED
    ],
    [SAMPLE_STATUS.PROCESSING]: [
      SAMPLE_STATUS.COMPLETED,
      SAMPLE_STATUS.CANCELLED
    ]
  },
  LAB_TEST: {
    [LAB_TEST_STATUS.PENDING]: [
      LAB_TEST_STATUS.RESULT_ENTERED,
      LAB_TEST_STATUS.CANCELLED
    ],
    [LAB_TEST_STATUS.RESULT_ENTERED]: [
      LAB_TEST_STATUS.RESULT_PENDING,
      LAB_TEST_STATUS.CANCELLED
    ],
    [LAB_TEST_STATUS.RESULT_PENDING]: [
      LAB_TEST_STATUS.WAITING_REVIEW,
      LAB_TEST_STATUS.CANCELLED
    ],
    [LAB_TEST_STATUS.WAITING_REVIEW]: [
      LAB_TEST_STATUS.APPROVED,
      LAB_TEST_STATUS.CANCELLED
    ]
  }
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get all statuses for an entity
 * @param {string} entity - Entity name (appointment, sample, labTest, invoice)
 * @returns {Array} Array of status values
 */
export const getEntityStatuses = (entity) => {
  const statusMap = {
    appointment: APPOINTMENT_STATUS,
    sample: SAMPLE_STATUS,
    labTest: LAB_TEST_STATUS,
    invoice: INVOICE_STATUS
  };
  
  return Object.values(statusMap[entity] || {});
};

/**
 * Check if a status is valid for an entity
 * @param {string} entity - Entity name
 * @param {string} status - Status value
 * @returns {boolean} True if valid
 */
export const isValidStatus = (entity, status) => {
  const validStatuses = getEntityStatuses(entity);
  return validStatuses.includes(status);
};

/**
 * Get next valid statuses for a given status
 * @param {string} entity - Entity name
 * @param {string} currentStatus - Current status
 * @returns {Array} Array of valid next statuses
 */
export const getNextValidStatuses = (entity, currentStatus) => {
  return STATUS_TRANSITIONS[entity]?.[currentStatus] || [];
};

/**
 * Check if a status transition is valid
 * @param {string} entity - Entity name
 * @param {string} fromStatus - Current status
 * @param {string} toStatus - Target status
 * @returns {boolean} True if transition is valid
 */
export const isValidTransition = (entity, fromStatus, toStatus) => {
  const validTransitions = getNextValidStatuses(entity, fromStatus);
  return validTransitions.includes(toStatus);
};

// ============================================================================
// HUMAN-READABLE LABELS (Vietnamese)
// ============================================================================
export const STATUS_LABELS = {
  appointment: {
    [APPOINTMENT_STATUS.PENDING_PAYMENT]: 'Chờ thanh toán',
    [APPOINTMENT_STATUS.SCHEDULED]: 'Đã đặt lịch',
    [APPOINTMENT_STATUS.CONFIRMED]: 'Đã xác nhận',
    [APPOINTMENT_STATUS.CHECKED_IN]: 'Đã check-in',
    [APPOINTMENT_STATUS.SAMPLE_COLLECTED]: 'Đã lấy mẫu',
    [APPOINTMENT_STATUS.SAMPLE_PROCESSED]: 'Mẫu đã xử lý',
    [APPOINTMENT_STATUS.RESULT_PENDING]: 'Chờ xác nhận kết quả',
    [APPOINTMENT_STATUS.WAITING_REVIEW]: 'Chờ duyệt',
    [APPOINTMENT_STATUS.READY_FOR_CONSULTATION]: 'Sẵn sàng tư vấn',
    [APPOINTMENT_STATUS.COMPLETED]: 'Hoàn thành',
    [APPOINTMENT_STATUS.NO_SHOW]: 'Không đến',
    [APPOINTMENT_STATUS.CANCELLED]: 'Đã hủy'
  },
  sample: {
    [SAMPLE_STATUS.PENDING_COLLECTION]: 'Chờ lấy mẫu',
    [SAMPLE_STATUS.COLLECTED]: 'Đã lấy mẫu',
    [SAMPLE_STATUS.PROCESSING]: 'Đang xử lý',
    [SAMPLE_STATUS.COMPLETED]: 'Hoàn thành',
    [SAMPLE_STATUS.CANCELLED]: 'Đã hủy'
  },
  labTest: {
    [LAB_TEST_STATUS.PENDING]: 'Chờ nhập kết quả',
    [LAB_TEST_STATUS.RESULT_ENTERED]: 'Đã nhập kết quả',
    [LAB_TEST_STATUS.RESULT_PENDING]: 'Chờ xác nhận nội bộ',
    [LAB_TEST_STATUS.WAITING_REVIEW]: 'Chờ duyệt',
    [LAB_TEST_STATUS.APPROVED]: 'Đã duyệt',
    [LAB_TEST_STATUS.CANCELLED]: 'Đã hủy'
  }
};

/**
 * Get a human-readable label for a status value, preferring Vietnamese labels
 * entity: 'appointment' | 'sample' | 'labTest'
 */
export const getStatusLabel = (status = '', entity = 'appointment') => {
  try {
    if (!status && status !== 0) return '—';
    const s = String(status || '').trim();
    if (!s) return '—';
    const map = STATUS_LABELS[entity] || {};
    // Normalize incoming string: lower-case, replace spaces/dashes with underscores
    const normalized = String(s).toLowerCase().replace(/\s+/g, '_').replace(/-/g, '_');
    
    // Special handling: map "pending" to "pending_collection" for sample entity
    if (entity === 'sample' && normalized === 'pending') {
      return map[SAMPLE_STATUS.PENDING_COLLECTION] || 'Chờ lấy mẫu';
    }
    
    // Special handling: map "result_entered" for sample entity (use labTest label)
    if (entity === 'sample' && normalized === 'result_entered') {
      return STATUS_LABELS.labTest[LAB_TEST_STATUS.RESULT_ENTERED] || 'Đã nhập kết quả';
    }
    
    if (map && (map[s] || map[normalized])) return map[s] || map[normalized];
    // Fallback: prettify label from status string
    return String(s).replace(/_/g, ' ').replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  } catch (e) { return String(status || '—'); }
};
