/**
 * Appointments Management Page - Tối ưu hóa hiệu suất
 * * Comprehensive appointment management page for the Blood Laboratory Management System.
 * Provides full CRUD operations for appointments, scheduling functionality,
 * and appointment status tracking with filtering and search capabilities.
 * * @author Blood Laboratory Management Team
 * @version 1.1.0 (Optimized & Integrated Sample Management)
 * @since 2024
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Container, Row, Col, Card, Table, Form, Alert, Button, InputGroup, Modal, Badge, Spinner, Tabs, Tab } from 'react-bootstrap';
import { useAuth } from '../../shared/contexts/AuthContext';
import { 
    FaCalendarAlt, 
    FaSearch, 
    FaFilter, 
    FaPlus, 
    FaUserMd, 
    FaUser, 
    FaClock, 
    FaCheckCircle, 
    FaVial,
    FaFlask,
    FaBarcode,
    FaSort,
    FaSortUp,
    FaSortDown,
    FaExclamationTriangle,
    FaEye,
    FaEdit,
    FaInfoCircle,
    FaTimes
} from 'react-icons/fa';
import { appointmentService } from '../../services/appointmentService';
import { patientService } from '../../services/patientService';
import { sampleService } from '../../services/sampleService';
import { shiftService } from '../../services/shiftService';
import { testOrderService } from '../../services/testOrderService';
import { medicalService } from '../../services/medicalService';
import { getAdminData } from '../../services/adminDataPrefetchService';
import warehouseService from '../../services/warehouseService';
import { roleService } from '../../services/roleService';
import { useNavigate, useLocation } from 'react-router-dom';
import { useNotificationContext } from '../../shared/contexts/NotificationContext';
import api from '../../services/api';
import { getStatusLabel } from '../../shared/constants/status';
import BarcodeDisplay from '../../shared/components/QRBarcode/BarcodeDisplay';
import BarcodeScanner from '../../shared/components/QRBarcode/BarcodeScanner';
import useResponsive from '../../shared/hooks/useResponsive';
import { useAutoRefresh, dispatchRefreshEvent, setRefreshFlag } from '../../shared/hooks/useAutoRefresh';


// =========================================================================
// INLINE / SHARED UTILITIES (FOR REFERENCE)
// =========================================================================
// BarcodeDisplay và BarcodeScanner đã được import từ shared components

/**
 * Status Badge Component
 * 
 * A reusable component that displays a status badge with appropriate color
 * variant based on the status value. Supports both appointment and sample entities.
 * 
 * **Status color mapping:**
 * - 'pending', 'wait' → 'warning' (yellow)
 * - 'checked_in', 'check.*in' → 'success' (green)
 * - 'collected', 'in_progress', 'processing', 'result_entered', 'result_pending' → 'info' (blue)
 * - 'completed', 'done', 'finished', 'waiting_review' → 'success' (green)
 * - 'cancel', 'no_show', 'rejected' → 'danger' (red)
 * - Default → 'secondary' (gray)
 * 
 * @param {Object} props - Component props
 * @param {string} [props.entity='sample'] - Entity type ('sample' or 'appointment')
 * @param {string} props.status - Status value to display
 * @returns {React.ReactNode} Badge component with status display
 * 
 * @example
 * <StatusBadge entity="appointment" status="checked_in" />
 * <StatusBadge entity="sample" status="pending_test" />
 */
const StatusBadge = ({ entity = 'sample', status }) => {
    const s = String(status || '').toLowerCase();
    let variant = 'secondary';
    if (/pending|wait/.test(s)) variant = 'warning';
    else if (/checked_in|check.*in|diem.*danh|đã.*điểm.*danh/.test(s)) variant = 'success'; // Đã check-in: màu xanh lá
    else if (/collected|in_progress|processing|result_entered|result_pending/.test(s)) variant = 'info';
    else if (/completed|done|finished|waiting_review/.test(s)) variant = 'success';
    else if (/cancel|no_show|rejected/.test(s)) variant = 'danger';
    const normalizeForLabel = (raw) => {
        if (!raw && raw !== 0) return raw;
        const v = String(raw || '').trim();
        const low = v.toLowerCase();
        // Map common English variants to canonical status keys
        if (low === 'pending test' || low === 'pending_test' || low === 'pendingtest') return 'pending';
        if (low === 'result entered' || low === 'result_entered' || low === 'resultentered') return 'result_entered';
        if (low === 'waiting review' || low === 'waiting_review') return 'waiting_review';
        if (low === 'ready for consultation' || low === 'ready_for_consultation') return 'ready_for_consultation';
        // Normalize common status variants
        if (low === 'checked_in' || low === 'check_in' || low === 'checkin' || low === 'checked-in') return 'checked_in';
        if (low === 'sample_collected' || low === 'samplecollected' || low === 'sample-collected') return 'sample_collected';
        if (low === 'pending_payment' || low === 'pendingpayment' || low === 'pending-payment') return 'pending_payment';
        if (low === 'no_show' || low === 'noshow' || low === 'no-show') return 'no_show';
        // Map "pending" to "pending_collection" for sample entity to match STATUS_LABELS
        if (low === 'pending' && entity === 'sample') return 'pending_collection';
        // Map "result_entered" for sample entity (keep as is, getStatusLabel will handle it)
        if (low === 'result_entered' && entity === 'sample') return 'result_entered';
        // fallback: return original
        return v;
    };

    const norm = normalizeForLabel(status) || String(status || '');
    // Use getStatusLabel to get Vietnamese label - it handles normalization internally
    const label = getStatusLabel(norm, entity);
    return <Badge bg={variant}>{label}</Badge>;
};

/**
 * Gets status badge component for a given status
 * 
 * This wrapper function safely creates a StatusBadge component, handling
 * any errors that might occur during rendering.
 * 
 * @param {string} status - Status value to display
 * @param {string} [entity='appointment'] - Entity type ('sample' or 'appointment')
 * @returns {React.ReactNode} StatusBadge component or fallback badge
 * 
 * @example
 * getStatusBadge('completed', 'appointment')
 * getStatusBadge('pending_test', 'sample')
 */
const getStatusBadge = (status, entity = 'appointment') => {
    try {
        return <StatusBadge entity={entity} status={status} />;
    } catch (e) {
        return <Badge bg="secondary">{String(status || '—')}</Badge>;
    }
};

/**
 * Formats sample type to Vietnamese display text
 * 
 * This utility function converts sample type strings (English or Vietnamese)
 * to standardized Vietnamese display text.
 * 
 * **Sample type mappings:**
 * - 'blood', 'máu' → "Máu"
 * - 'serum', 'huyết thanh' → "Huyết thanh"
 * - 'plasma', 'huyết tương' → "Huyết tương"
 * - 'urine', 'nước tiểu' → "Nước tiểu"
 * - 'swab', 'que' → "Que lấy mẫu"
 * - Default → Original string
 * 
 * @param {string|number} t - Sample type value to format
 * @returns {string} Formatted sample type in Vietnamese, or original string if not recognized
 * 
 * @example
 * formatSampleType('blood') // Returns: 'Máu'
 * formatSampleType('nước tiểu') // Returns: 'Nước tiểu'
 */
const formatSampleType = (t) => {
    if (!t && t !== 0) return '—';
    const m = String(t).toLowerCase();
    if (m.includes('blood') || m.includes('máu')) return 'Máu';
    if (m.includes('serum') || m.includes('huyết thanh')) return 'Huyết thanh';
    if (m.includes('plasma') || m.includes('huyết tương')) return 'Huyết tương';
    if (m.includes('urine') || m.includes('nước tiểu')) return 'Nước tiểu';
    if (m.includes('swab') || m.includes('que')) return 'Que lấy mẫu';
    return String(t);
};

/**
 * Translates common English texts to Vietnamese
 * 
 * This utility function translates common English system-generated messages
 * to Vietnamese for better user experience. Currently handles auto-generated
 * messages and common system texts.
 * 
 * **Translation mappings:**
 * - 'Auto-generated after patient checked in' → "Tự động tạo sau khi bệnh nhân check-in"
 * - Messages matching /^auto.?generated/i → "Tự động tạo bởi hệ thống"
 * 
 * @param {string} text - English text to translate
 * @returns {string} Vietnamese translation or original text if no translation available
 * 
 * @example
 * translateToVietnamese('Auto-generated after patient checked in')
 * // Returns: 'Tự động tạo sau khi bệnh nhân check-in'
 */
const translateToVietnamese = (text) => {
    if (!text) return text;
    const str = String(text).trim();
    
    // Common auto-generated messages
    if (str === 'Auto-generated after patient checked in') {
        return 'Tự động tạo sau khi bệnh nhân check-in';
    }
    if (str.toLowerCase() === 'auto-generated after patient checked in') {
        return 'Tự động tạo sau khi bệnh nhân check-in';
    }
    if (str.match(/^auto.?generated/i)) {
        return 'Tự động tạo bởi hệ thống';
    }
    
    // Return original if no translation needed
    return text;
};

/**
 * Formats lab test code for display
 * 
 * This utility function formats lab test IDs/codes for display, truncating
 * long codes to 8 characters for better readability.
 * 
 * @param {string|number} id - Lab test ID or code to format
 * @returns {string} Formatted test code (max 8 characters) or '—' if invalid
 * 
 * @example
 * formatLabTestCode('TR-1234567890') // Returns: 'TR-12345'
 * formatLabTestCode(null) // Returns: '—'
 */
const formatLabTestCode = (id) => {
    if (!id && id !== 0) return '—';
    const s = String(id || '').trim();
    return s.length > 8 ? s.slice(0, 8) : s;
};

/**
 * Normalizes ID values for comparison
 * 
 * This utility function normalizes ID values by converting to lowercase
 * and removing non-alphanumeric characters. Used for consistent ID comparison
 * across different data formats.
 * 
 * @param {*} v - Value to normalize (can be any type)
 * @returns {string} Normalized ID string (lowercase, alphanumeric only) or empty string
 * 
 * @example
 * normalizeId('PAT-123') // Returns: 'pat123'
 * normalizeId('ABC_XYZ-456') // Returns: 'abcxyz456'
 */
const normalizeId = (v) => {
    if (v === undefined || v === null) return '';
    try {
        return String(v).toLowerCase().replace(/[^a-z0-9]/g, '');
    } catch (e) {
        return String(v).toLowerCase();
    }
};

/**
 * Deduplicates test criteria array by merging duplicates
 * 
 * This function removes duplicate test criteria from an array by identifying
 * duplicates based on multiple possible ID fields (id, criteriaId, testId, etc.)
 * and merging their result values. When duplicates are found, it preserves
 * the existing result value if it exists, otherwise uses the new result.
 * 
 * **Deduplication logic:**
 * - Identifies duplicates by checking: id, criteriaId, testId, criterionId, paramName, abbreviation, code
 * - Normalizes IDs using normalizeId for consistent comparison
 * - Merges duplicate entries, preserving existing result values
 * 
 * @param {Array<Object>} [arr=[]] - Array of test criteria objects to deduplicate
 * @returns {Array<Object>} Deduplicated array of test criteria
 * 
 * @example
 * const criteria = [
 *   { id: 'CRI001', paramName: 'Glucose', result: '100' },
 *   { criteriaId: 'CRI001', paramName: 'Glucose', result: '105' }
 * ];
 * dedupeCriteria(criteria) // Returns: [{ id: 'CRI001', paramName: 'Glucose', result: '100' }]
 */
const dedupeCriteria = (arr = []) => {
    try {
        if (!Array.isArray(arr)) return [];
        const map = new Map();
        for (let i = 0; i < arr.length; i++) {
            const t = arr[i] || {};
            const rawId = t.id ?? t.criteriaId ?? t.testId ?? t.criterionId ?? t.raw?.id ?? t.raw?.CriteriaId ?? null;
            const paramName = t.ParamName ?? t.paramName ?? t.Param ?? t.param ?? null;
            const abbr = t.Abbreviation ?? t.abbreviation ?? t.abbr ?? null;
            const code = t.code ?? t.testCode ?? t.test_code ?? null;

            const candidates = [rawId, paramName, abbr, code];
            let key = null;
            for (const c of candidates) {
                const n = normalizeId(c);
                if (n && String(n).trim() !== '') { key = n; break; }
            }
            if (!key) key = `__noid_${i}`;

            if (!map.has(key)) {
                map.set(key, t);
            } else {
                const existing = map.get(key) || {};
                const resultValue = (existing.result !== undefined && existing.result !== null && String(existing.result).trim() !== '') ? existing.result : t.result;
                const merged = { ...existing, ...t, result: resultValue };
                map.set(key, merged);
            }
        }
        return Array.from(map.values());
    } catch (e) {
        return arr || [];
    }
};

/**
 * Checks if a value looks like an ID (UUID or numeric)
 * 
 * This utility function determines if a value appears to be a valid ID
 * by checking if it matches UUID format or is purely numeric.
 * 
 * **ID formats recognized:**
 * - UUID format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
 * - Numeric format: Pure digits (e.g., "12345")
 * 
 * @param {*} v - Value to check
 * @returns {boolean} True if value looks like an ID, false otherwise
 * 
 * @example
 * isIdLike('a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d') // Returns: true
 * isIdLike('12345') // Returns: true
 * isIdLike('PAT-123') // Returns: false
 */
const isIdLike = (v) => {
    if (v === undefined || v === null) return false;
    try {
        const s = String(v).trim();
        if (!s) return false;
        const isUUID = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/.test(s);
        const isNumeric = /^\d+$/.test(s);
        return Boolean(isUUID || isNumeric);
    } catch (e) {
        return false;
    }
};

/**
 * Normalizes date values to ISO date format (YYYY-MM-DD)
 * 
 * This utility function converts various date formats to ISO date format.
 * It handles Date objects, ISO strings, and common date formats (DD/MM/YYYY, DD-MM-YYYY).
 * 
 * **Supported input formats:**
 * - Date objects
 * - ISO strings (YYYY-MM-DD)
 * - DD/MM/YYYY or DD-MM-YYYY strings
 * - Other parseable date strings
 * 
 * @param {*} raw - Date value to normalize (Date, string, or number)
 * @returns {string|null} ISO date string (YYYY-MM-DD) or null if invalid
 * 
 * @example
 * normalizeToISODate('04/12/2024') // Returns: '2024-12-04'
 * normalizeToISODate('2024-12-04') // Returns: '2024-12-04'
 * normalizeToISODate(new Date()) // Returns: '2024-12-04'
 */
const normalizeToISODate = (raw) => {
    if (!raw && raw !== 0) return null;
    try {
        if (raw instanceof Date) return raw.toISOString().slice(0, 10);
        let s = String(raw).trim();
        if (!s) return null;
        const isoMatch = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
        if (isoMatch) return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
        const dm = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
        if (dm) {
            const dd = dm[1].padStart(2, '0');
            const mm = dm[2].padStart(2, '0');
            const yyyy = dm[3];
            return `${yyyy}-${mm}-${dd}`;
        }
        const parsed = new Date(s);
        if (!isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10);
    } catch (e) {}
    return null;
};

/**
 * Extracts lab assignment ID from appointment object
 * 
 * This utility function searches for lab assignment ID in an appointment object
 * by checking multiple possible field name variations (camelCase, snake_case, PascalCase).
 * It also handles nested assignment objects.
 * 
 * **Field names checked (in order):**
 * - lab_assignment_id, labAssignmentId, labAssignment, lab_assignment
 * - labAssignmentID, labAssignment_Id
 * - Nested: assignment.id, assignment.assignmentId, etc.
 * 
 * @param {Object} appointment - Appointment object that may contain assignment ID
 * @returns {string|null} Lab assignment ID if found, null otherwise
 * 
 * @example
 * const apt = { labAssignmentId: 'ASSIGN-123' };
 * getAssignmentIdFromAppointment(apt) // Returns: 'ASSIGN-123'
 */
const getAssignmentIdFromAppointment = (appointment) => {
    if (!appointment) return null;
    const assignmentKeys = ['lab_assignment_id','labAssignmentId','labAssignment','lab_assignment','labAssignmentID','labAssignment_Id','labAssignmentId'];
    for (const ak of assignmentKeys) {
        try {
            const v = appointment[ak];
            if (v === undefined || v === null || v === '') continue;
            if (typeof v === 'object') {
                const nested = v.id ?? v.assignmentId ?? v.labAssignmentId ?? v.lab_assignment_id ?? v.assignment_id;
                if (nested !== undefined && nested !== null && String(nested).trim() !== '') return String(nested).trim();
                continue;
            }
            if (String(v).trim() !== '') return String(v).trim();
        } catch (e) { /* ignore and try next */ }
    }
    try {
        const a = appointment.assignment;
        if (a && typeof a === 'object') {
            const nested = a.id ?? a.assignmentId ?? a.labAssignmentId ?? a.lab_assignment_id ?? a.assignment_id;
            if (nested !== undefined && nested !== null && String(nested).trim() !== '') return String(nested).trim();
        }
    } catch (e) {}
    return null;
};

/**
 * Extracts test package ID from appointment object
 * 
 * This utility function searches for test package ID in an appointment object
 * by checking multiple possible field name variations.
 * 
 * **Field names checked:**
 * - testPackageId, TestPackageId, packageId, PackageId
 * - pkgId, pkg_id, servicePackageId, serviceId
 * - package_id, test_package_id, test_packageid
 * 
 * @param {Object} appointment - Appointment object that may contain test package ID
 * @returns {string|number|null} Test package ID if found, null otherwise
 * 
 * @example
 * const apt = { testPackageId: 'PKG-123' };
 * getTestPackageIdFromAppointment(apt) // Returns: 'PKG-123'
 */
const getTestPackageIdFromAppointment = (appointment) => {
    if (!appointment) return null;
    try {
        const direct = [
            appointment.testPackageId, appointment.TestPackageId, appointment.packageId, appointment.PackageId, appointment.pkgId, appointment.pkg_id, appointment.servicePackageId, appointment.serviceId,
            appointment.package_id, appointment.test_package_id, appointment.test_packageid
        ];
        for (const c of direct) {
            if (c !== undefined && c !== null && String(c).trim() !== '') return c;
        }
    } catch (e) { /* ignore */ }
    return null;
};

/**
 * Formats barcode value for display and validation
 * 
 * This utility function sanitizes and formats barcode values by:
 * - Removing hyphens and converting to uppercase
 * - Removing non-alphanumeric characters
 * - Ensuring minimum length of 3 characters
 * 
 * @param {string|number} value - Barcode value to format
 * @returns {string|null} Formatted barcode string (uppercase, alphanumeric) or null if invalid
 * 
 * @example
 * formatBarcodeValueLocal('abc-123') // Returns: 'ABC123'
 * formatBarcodeValueLocal('AB') // Returns: null (too short)
 */
const formatBarcodeValueLocal = (value) => {
    if (!value && value !== 0) return null;
    try {
        const strValue = String(value || '').trim();
        if (!strValue) return null;
        if (strValue.includes('-')) {
            const cleaned = strValue.replace(/-/g, '').toUpperCase();
            return cleaned;
        }
        const sanitized = strValue.replace(/[^A-Z0-9]/gi, '').toUpperCase();
        if (!sanitized || sanitized.length < 3) return null;
        return sanitized;
    } catch (e) { return null; }
};

/**
 * Checks if a sample is completed
 * 
 * This utility function determines if a sample has a completed status
 * by checking various status field names and completed status values.
 * 
 * **Completed status values:**
 * - 'completed', 'done', 'finished'
 * 
 * @param {Object} s - Sample object to check
 * @returns {boolean} True if sample is completed, false otherwise
 * 
 * @example
 * isSampleCompletedLocal({ status: 'completed' }) // Returns: true
 * isSampleCompletedLocal({ state: 'done' }) // Returns: true
 */
const isSampleCompletedLocal = (s) => {
    if (!s) return false;
    const st = (s.status || s.state || '').toString().toLowerCase();
    return st === 'completed' || st === 'done' || st === 'finished';
};

/**
 * Normalizes status string to a canonical key for comparisons
 * 
 * This utility function normalizes status strings by:
 * - Converting to lowercase
 * - Removing Vietnamese diacritics (accents)
 * - Replacing spaces and hyphens with underscores
 * 
 * Used for consistent status comparison across different data formats.
 * 
 * @param {string} raw - Raw status string to normalize
 * @returns {string} Normalized status key (lowercase, underscore-separated)
 * 
 * @example
 * normalizeStatusKey('Pending Test') // Returns: 'pending_test'
 * normalizeStatusKey('Đã Check-in') // Returns: 'da_check_in'
 */
const normalizeStatusKey = (raw) => {
    try {
        if (raw === undefined || raw === null) return '';
        let s = String(raw || '').trim().toLowerCase();
        if (s.normalize) s = s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        s = s.replace(/\s+/g, '_').replace(/-+/g, '_');
        return s;
    } catch (e) {
        return String(raw || '').toLowerCase();
    }
};

/**
 * Checks if a sample is pending test
 * 
 * This utility function determines if a sample has a pending test status
 * by normalizing the status and checking against known pending status values.
 * 
 * **Pending status values recognized:**
 * - 'pending_test', 'pendingtest', 'pending_test', 'pending-test', 'pending test', 'pending'
 * 
 * @param {Object} s - Sample object to check
 * @returns {boolean} True if sample is pending test, false otherwise
 * 
 * @example
 * isSamplePendingTestLocal({ status: 'pending_test' }) // Returns: true
 * isSamplePendingTestLocal({ state: 'pending' }) // Returns: true
 */
const isSamplePendingTestLocal = (s) => {
    if (!s) return false;
    const key = normalizeStatusKey(s.status || s.state || s.stateName || s.statusName || '');
    return ['pending_test', 'pendingtest', 'pending_test', 'pending-test', 'pending test', 'pending'].includes(key) ? true : false;
};

/**
 * Resolves entity key from an item object
 * 
 * This utility function extracts a unique identifier from an item object
 * by checking multiple possible ID field names. Used for identifying
 * reagents, equipment, or other entities.
 * 
 * **Field names checked (in order):**
 * - id, _id, reagentId, reagent_id, reagentCode, reagent_code
 * - code, codeManufacturer, icode, uuid
 * - equipmentId, equipment_id, equipmentCode, code_manufacturer, profileId
 * 
 * @param {Object} item - Item object that may contain an ID
 * @returns {string} Entity key (ID) or empty string if not found
 * 
 * @example
 * resolveEntityKeyLocal({ reagentId: 'REAG-123' }) // Returns: 'REAG-123'
 * resolveEntityKeyLocal({ code: 'EQ-456' }) // Returns: 'EQ-456'
 */
const resolveEntityKeyLocal = (item) => {
    if (!item) return '';
    return String(
        item.id || item._id || item.reagentId || item.reagent_id || item.reagentCode || item.reagent_code ||
        item.code || item.codeManufacturer || item.icode || item.uuid || item.equipmentId || item.equipment_id ||
        item.equipmentCode || item.code_manufacturer || item.profileId || ''
    );
};

/**
 * Generates a unique field ID for form fields
 * 
 * This utility function creates a safe, unique ID for form fields by
 * combining category and field keys, sanitizing them to remove special characters.
 * 
 * @param {string} categoryKey - Category key (e.g., 'blood_test')
 * @param {string} fieldKey - Field key (e.g., 'glucose')
 * @returns {string} Generated field ID (e.g., 'result-field-blood_test-glucose')
 * 
 * @example
 * makeFieldIdLocal('blood_test', 'glucose') // Returns: 'result-field-blood_test-glucose'
 * makeFieldIdLocal('liver-panel', 'ALT') // Returns: 'result-field-liver_panel-ALT'
 */
const makeFieldIdLocal = (categoryKey, fieldKey) => {
    const safe = (s) => String(s || '').replace(/[^a-z0-9_-]/gi, '_');
    return `result-field-${safe(categoryKey)}-${safe(fieldKey)}`;
};

// =========================================================================
// HÀM HELPER DATE/TIME
// =========================================================================

/**
 * Parses various date formats into a Date object
 * 
 * This utility function converts various date formats (timestamps, strings, numbers)
 * into a JavaScript Date object. Handles Unix timestamps (seconds and milliseconds).
 * 
 * **Supported formats:**
 * - Unix timestamp (seconds) - automatically converted to milliseconds
 * - Unix timestamp (milliseconds)
 * - Date strings (parseable by Date constructor)
 * 
 * @param {*} raw - Date value to parse (number, string, or Date)
 * @returns {Date|null} Parsed Date object or null if invalid
 * 
 * @example
 * parseDate(1701648000) // Returns: Date object (timestamp in seconds)
 * parseDate('2024-12-04') // Returns: Date object
 */
const parseDate = (raw) => {
    if (!raw && raw !== 0) return null;
    try {
        let r = raw;
        if (typeof r === 'string' && /^\d+$/.test(r)) {
            const asNum = parseInt(r, 10);
            r = asNum < 1e12 ? asNum * 1000 : asNum;
        }
        if (typeof r === 'number') r = r < 1e12 ? r * 1000 : r;
        const d = new Date(r);
        if (isNaN(d.getTime())) return null;
        return d;
    } catch (e) {
        return null;
    }
};

/**
 * Formats date string to Vietnamese locale format
 * 
 * This utility function converts a date value to Vietnamese locale format (DD/MM/YYYY).
 * Handles various date formats by parsing them first.
 * 
 * @param {string|number|Date} dateString - Date value to format
 * @returns {string} Formatted date string in Vietnamese locale or '—' if invalid
 * 
 * @example
 * formatDate('2024-12-04') // Returns: '04/12/2024'
 * formatDate(1701648000000) // Returns: '04/12/2024'
 */
const formatDate = (dateString) => {
    const d = parseDate(dateString);
    return d ? d.toLocaleDateString('vi-VN') : '—';
};

/**
 * Formats date to Vietnamese locale format (date only, no time)
 * 
 * This utility function converts a date value to Vietnamese locale format (DD/MM/YYYY)
 * and returns null if the date is invalid. Used when null is preferred over '—' for empty dates.
 * 
 * @param {string|number|Date} raw - Date value to format
 * @returns {string|null} Formatted date string in Vietnamese locale or null if invalid
 * 
 * @example
 * formatDateOnly('2024-12-04') // Returns: '04/12/2024'
 * formatDateOnly(null) // Returns: null
 */
const formatDateOnly = (raw) => {
    const d = parseDate(raw);
    return d ? d.toLocaleDateString('vi-VN') : null;
};

/**
 * Formats time string to HH:MM or HH:MM - HH:MM format
 * 
 * This utility function formats time values to display format. It handles:
 * - Single time values (HH:MM)
 * - Time ranges (HH:MM - HH:MM)
 * - Various input formats (ISO strings, timestamps, Date objects)
 * 
 * **Supported input formats:**
 * - ISO strings with time (e.g., "2024-12-04T10:30:00Z")
 * - Time strings (e.g., "10:30", "10:30:00")
 * - Unix timestamps (seconds or milliseconds)
 * - Date objects
 * 
 * @param {string|number|Date} timeString - Time value to format
 * @returns {string} Formatted time string (HH:MM or HH:MM - HH:MM) or empty string if invalid
 * 
 * @example
 * formatTime('10:30') // Returns: '10:30'
 * formatTime('10:30 - 12:00') // Returns: '10:30 - 12:00'
 * formatTime('2024-12-04T10:30:00Z') // Returns: '10:30'
 */
const formatTime = (timeString) => {
    if (!timeString && timeString !== 0) return '';
    const pad = (v) => String(v).padStart(2, '0');
    const formatDateToHM = (d) => {
        if (!(d instanceof Date) || isNaN(d.getTime())) return '';
        return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
    };
    const normalizeSingle = (t) => {
        if (!t && t !== 0) return '';
        if (typeof t === 'string') {
            const iso = t.match(/T(\d{2}:\d{2})/);
            if (iso) return iso[1];
            const timeMatch = t.match(/^(\d{1,2}:\d{2})(?::\d{2})?/);
            if (timeMatch) return timeMatch[1].padStart(5, '0');
            if (/^\d+$/.test(t)) {
                const d = new Date(parseInt(t, 10) < 1e12 ? parseInt(t, 10) * 1000 : parseInt(t, 10));
                return formatDateToHM(d);
            }
            return t;
        }
        if (typeof t === 'number') {
            const d = new Date(t < 1e12 ? t * 1000 : t);
            return formatDateToHM(d);
        }
        if (t instanceof Date) return formatDateToHM(t);
        return String(t);
    };

    if (typeof timeString === 'string') {
        const range = timeString.match(/(\S.*?)\s*[-–]\s*(\S.*)/);
        if (range) {
            return `${normalizeSingle(range[1])} - ${normalizeSingle(range[2])}`;
        }
    }
    return normalizeSingle(timeString);
};

const formatDateTime = (raw) => {
    const d = parseDate(raw);
    return d ? d.toLocaleString('vi-VN') : null;
};

// =========================================================================
// COMPONENT CHÍNH
// =========================================================================

const AdminAppointments = () => {
    const navigate = useNavigate();
    const { user, userRoleId } = useAuth();
    const isLabUser = userRoleId === 4;
    const { showSuccess, showError, showInfo } = useNotificationContext();
    const { isMobile, isTablet } = useResponsive();
    
    // Trạng thái dữ liệu thô (không thay đổi khi lọc/sắp xếp)
    const [appointments, setAppointments] = useState([]);
    const [patients, setPatients] = useState([]);
    const [doctors, setDoctors] = useState([]);
    const [samples, setSamples] = useState([]);
    const [labTests, setLabTests] = useState([]);
    const [shifts, setShifts] = useState([]);
    const [labAssignments, setLabAssignments] = useState([]);
    const [services, setServices] = useState([]);

    // TỐI ƯU HÓA: Maps để lookup O(1)
    const [patientMap, setPatientMap] = useState({});
    const [doctorMap, setDoctorMap] = useState({});
    const [shiftMap, setShiftMap] = useState({});
    const [servicesMap, setServicesMap] = useState({});
    const [sampleMapByAppointmentId, setSampleMapByAppointmentId] = useState({});
    const [appointmentResultsMap, setAppointmentResultsMap] = useState({});
    const [roomMap, setRoomMap] = useState({});

    // Trạng thái UI/Filter
    const [labUserProfile, setLabUserProfile] = useState(null);
    const [testPackageCache, setTestPackageCache] = useState({});
    const [testPackageCriteriaCache, setTestPackageCriteriaCache] = useState({});
    const [selectedMonth, setSelectedMonth] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    
    // DEBOUNCE: Dùng 2 state cho search
    const [inputSearchTerm, setInputSearchTerm] = useState(''); // State cho input
    const [searchTerm, setSearchTerm] = useState(''); // State dùng để filter

    const [onlyMyAssignments, setOnlyMyAssignments] = useState(false);
    const [selectedDate, setSelectedDate] = useState(() => {
        try {
            const stored = localStorage.getItem('lab_selected_date');
            if (stored && stored !== 'null' && stored !== 'undefined') return stored;
        } catch (e) {}
        return new Date().toISOString().slice(0, 10);
    });
    const [sortField, setSortField] = useState('createdAt'); 
    const [sortDirection, setSortDirection] = useState('desc'); 
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    
    // Modal states
    const [showSampleModal, setShowSampleModal] = useState(false);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [detailActiveTab, setDetailActiveTab] = useState('appointment');
    const [detailShowSamples, setDetailShowSamples] = useState(true);
    const [mainActiveTab, setMainActiveTab] = useState(userRoleId === 4 ? 'samples' : 'appointments');
    const [mainShowSamples, setMainShowSamples] = useState(true);
    const [showSampleDetailModal, setShowSampleDetailModal] = useState(false);
    const [sampleDetailData, setSampleDetailData] = useState(null);
    const [sampleDetailPatient, setSampleDetailPatient] = useState(null);
    const [detailModalBarcodeVerified, setDetailModalBarcodeVerified] = useState(false);
    const [sampleDetailDecodedBarcode, setSampleDetailDecodedBarcode] = useState(null);
    const [sampleDetailBarcodeVerified, setSampleDetailBarcodeVerified] = useState(false);
    const [showSampleRawJson, setShowSampleRawJson] = useState(false);
    const [selectedAppointment, setSelectedAppointment] = useState(null);
    const [sampleData, setSampleData] = useState({
        sampleType: '', volume: '', notes: '', collectedBy: '',
        existingSampleId: null, existingBarcode: null
    });
    const [showBarcodeScanModal, setShowBarcodeScanModal] = useState(false);
    const [barcodeVerified, setBarcodeVerified] = useState(false);
    const [showGlobalScanModal, setShowGlobalScanModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [editForm, setEditForm] = useState(null);
    const [savingEdit, setSavingEdit] = useState(false);
    const [editLoading, setEditLoading] = useState(false);
    // Sample edit modal state (for related-samples list)
    const [showSampleEditModal, setShowSampleEditModal] = useState(false);
    const [sampleEditForm, setSampleEditForm] = useState(null);
    const [sampleEditLoading, setSampleEditLoading] = useState(false);
    // Complete sample modal state
    const [showCompleteSampleModal, setShowCompleteSampleModal] = useState(false);
    const [completeSampleId, setCompleteSampleId] = useState(null);
    const [savingSampleEdit, setSavingSampleEdit] = useState(false);
    const [sampleEditErrors, setSampleEditErrors] = useState({});

    // =====================================================================
    // ENTER RESULTS MODAL STATES (INTEGRATED FROM SampleManagement.jsx)
    // =====================================================================
    const CRITERIA_AUTO_RETRY_MAX = 3;
    const [showResultsModal, setShowResultsModal] = useState(false);
    const [resultsLoading, setResultsLoading] = useState(false);
    const [resultsForm, setResultsForm] = useState({ sampleId: null, tests: [], notes: '' });
    const [selectedSample, setSelectedSample] = useState(null); 
    const [criteriaAutoRetryCount, setCriteriaAutoRetryCount] = useState(0);
    const [showPackageRawJson, setShowPackageRawJson] = useState(false);
    const [lastPackageRaw, setLastPackageRaw] = useState(null);
    const [showSelectedSampleRawJson, setShowSelectedSampleRawJson] = useState(false);
    const [resultsSearch, setResultsSearch] = useState('');
    const [resultErrors, setResultErrors] = useState({});
    const [resultWarnings, setResultWarnings] = useState({});
    const [currentTestResultId, setCurrentTestResultId] = useState(null);
    const [selectedReagentId, setSelectedReagentId] = useState(null);
    const [selectedDeviceId, setSelectedDeviceId] = useState(null);
    const [reagentQuantity, setReagentQuantity] = useState(1);
    const [resultBarcodeVerified, setResultBarcodeVerified] = useState(false);
    const [showBarcodeScanInResultModal, setShowBarcodeScanInResultModal] = useState(false);
    const [reagentsOptions, setReagentsOptions] = useState([]);
    const [reagents, setReagents] = useState([]); // full reagent objects
    const [devicesOptions, setDevicesOptions] = useState([]);
    const [resultsLoadingMap, setResultsLoadingMap] = useState({});
    const saving = resultsLoading; // Alias for saving state when in modal

    const [highlightedSampleId, setHighlightedSampleId] = useState(null);
    const [filteredSamples, setFilteredSamples] = useState([]);
    // Ensure `filteredAppointments` exists early to avoid TDZ when referenced by functions declared earlier
    let filteredAppointments = [];
    // =====================================================================

    // Reset tab whenever detail modal opens
    useEffect(() => {
        if (showDetailModal) setDetailActiveTab('appointment');
        if (showDetailModal) setDetailShowSamples(true);
    }, [showDetailModal]);

    /**
     * Fetches reagents and devices for result entry
     * 
     * This function loads reagents and devices from the backend to populate
     * dropdown options in the result entry modal. It handles multiple service
     * sources and formats the data for use in select components.
     * 
     * **Data sources checked:**
     * - testOrderService.getReagents()
     * - warehouseService.getReagents() (fallback)
     * - testOrderService.getDevices()
     * 
     * Updates reagents, reagentsOptions, and devicesOptions state.
     * 
     * @returns {Promise<void>} Does not return a value. Updates component state with reagents and devices.
     * 
     * @example
     * // Called when opening result entry modal
     * await fetchReagentsAndDevices();
     */
    const fetchReagentsAndDevices = async () => {
        let reagents = [];
        let devices = [];
        try {
            const [rres, dres] = await Promise.all([
                (typeof testOrderService.getReagents === 'function') ? testOrderService.getReagents().catch(() => null) : (typeof warehouseService.getReagents === 'function' ? warehouseService.getReagents().catch(() => null) : null),
                (typeof testOrderService.getDevices === 'function') ? testOrderService.getDevices().catch(() => null) : null
            ]);
            reagents = rres && rres.data ? (Array.isArray(rres.data) ? rres.data : rres.data.items || []) : (Array.isArray(rres) ? rres : []);
            devices = dres && dres.data ? (Array.isArray(dres.data) ? dres.data : dres.data.items || []) : (Array.isArray(dres) ? dres : []);
        } catch (e) { /* Error fetching reagents/devices */ }

        setReagents(reagents || []);
        setReagentsOptions((reagents || []).map(r => ({ id: resolveEntityKeyLocal(r), name: r.name || r.reagentName || r.code || String(r.id || '') })));
        setDevicesOptions((devices || []).map(d => ({ id: resolveEntityKeyLocal(d), name: d.name || d.deviceName || d.code || String(d.id || '') })));
    };


    /**
     * Loads all appointment management data with optimized performance
     * 
     * This is the core data fetching function for the appointments management page.
     * It performs a three-phase loading strategy for optimal performance:
     * 
     * **Phase 1: Critical Data (Blocking)**
     * - Loads appointments and patients (uses cache if available)
     * - Loads shifts and test packages
     * - Builds lookup maps (patientMap, shiftMap) for O(1) access
     * - Sets loading state to false early for fast initial render
     * 
     * **Phase 2: Secondary Data (Background, Non-blocking)**
     * - Loads doctors, lab assignments, lab user profile
     * - Loads services (uses cache if available)
     * - Loads doctor rooms mapping
     * - Fetches reagents and devices
     * 
     * **Phase 3: Lazy Loading (On-demand)**
     * - Loads samples for appointments in batches (20 at a time)
     * - Loads test results for appointments
     * - Builds sampleMapByAppointmentId and appointmentResultsMap
     * 
     * The function uses caching via getAdminData to improve performance
     * and reduce API calls. Maps are built for efficient data lookup.
     * 
     * @param {boolean} [forceFresh=false] - If true, bypasses cache and forces fresh data fetch
     * @returns {Promise<void>} Does not return a value. Updates component state with all data.
     * 
     * @example
     * // Load data with cache
     * await loadData();
     * 
     * // Force fresh data fetch
     * await loadData(true);
     */
    const loadData = async (forceFresh = false) => {
        try {
            setLoading(true);
            
            const normalizeResult = (res, defaultVal = []) => {
                if (!res) return defaultVal;
                if (typeof res === 'object' && res.success !== undefined && res.data !== undefined) return res.data || defaultVal;
                if (res.data !== undefined) {
                    if (res.data && typeof res.data === 'object' && res.data.data !== undefined) return res.data.data || defaultVal;
                    return res.data || defaultVal;
                }
                if (Array.isArray(res)) return res;
                return res || defaultVal;
            };

            // PHASE 1: Try to get from cache first for faster loading (unless forceFresh is true)
            const [appointmentsCached, patientsCached] = forceFresh 
                ? [null, null]
                : await Promise.all([
                    getAdminData('appointments', false),
                    getAdminData('patients', false)
                ]);

            // Use cached data if available, otherwise fetch fresh
            const appointmentsResult = (!forceFresh && appointmentsCached?.success && appointmentsCached.data)
                ? { success: true, data: appointmentsCached.data }
                : await appointmentService.getAllAppointments().catch(() => ({ success: false }));
            
            const patientsResult = (!forceFresh && patientsCached?.success && patientsCached.data)
                ? { success: true, data: patientsCached.data }
                : await patientService.getAllPatients().catch(() => ({ success: false }));

            // Load shifts and lab tests (not cached yet)
            const [shiftsResult, labTestsResult] = await Promise.all([
                shiftService.getAllShifts().catch(() => ({ success: false })),
                testOrderService.getAllTestPackages().catch(() => ({ success: false }))
            ]);

            const appointmentsData = normalizeResult(appointmentsResult, []);
            const patientsData = normalizeResult(patientsResult, []);
            const shiftsData = normalizeResult(shiftsResult, []);
            const labTestsData = normalizeResult(labTestsResult, []);
            
            // Set appointments immediately for fast initial render
            setAppointments(Array.isArray(appointmentsData) ? appointmentsData : [appointmentsData]);
            setError('');
            setLoading(false); // Stop loading spinner early

            // Build patient map immediately
            const pMap = (patientsData || []).reduce((acc, p) => {
                if (p && (p.id || p.patient_id)) {
                    const normalizedFullName = p.fullName || p.FullName || p.full_name || p.fullname || p.name || p.displayName || '';
                    const clone = { ...p, fullName: normalizedFullName || (p.name || '') };
                    acc[p.id || p.patient_id] = clone;
                }
                return acc;
            }, {});
            setPatientMap(pMap);
            setPatients(patientsData || []);

            const sMap = (shiftsData || []).reduce((acc, s) => { if (s && (s.id || s.shiftId)) acc[s.id || s.shiftId] = s; return acc; }, {});
            setShiftMap(sMap);
            setShifts(shiftsData || []);

            const normalizedLabTests = Array.isArray(labTestsData) ? labTestsData : (labTestsData ? [labTestsData] : []);
            setLabTests(normalizedLabTests);

            // Seed testPackageCache for immediate display
            try {
                const pkgMap = (normalizedLabTests || []).reduce((acc, pkg) => {
                    if (!pkg) return acc;
                    const pid = pkg.packageId || pkg.pkgId || pkg.id || pkg.TestPackageId || pkg.testPackageId || pkg.package_id || pkg.test_package_id;
                    const name = pkg.packageName || pkg.name || pkg.title || pkg.package_name || pkg.package;
                    if (pid && name) acc[String(pid)] = name;
                    return acc;
                }, {});
                if (Object.keys(pkgMap).length > 0) setTestPackageCache(prev => ({ ...prev, ...pkgMap }));
            } catch (e) { /* ignore seeding errors */ }

            // PHASE 2: Background fetch for secondary data (non-blocking)
            (async () => {
                try {
                    const [doctorsResponse, laResp, profileResp, servicesResp, doctorRoomsResult] = await Promise.allSettled([
                        api.get('/gateway/testorder/doctor'),
                        testOrderService.getAllLabAssignmentsGateway(),
                        (user && user.email) ? testOrderService.getLabUserProfileByEmailGateway(user.email) : Promise.resolve({ success: false }),
                        (async () => {
                            const servicesCached = await getAdminData('services', false);
                            return servicesCached.success && servicesCached.data
                                ? { success: true, data: servicesCached.data }
                                : await medicalService.getAllServices();
                        })(),
                        api.get('/gateway/testorder/doctor-rooms')
                    ]);

                    const servicesData = servicesResp.status === 'fulfilled' ? normalizeResult(servicesResp.value, []) : [];
                    const svcMap = (servicesData || []).reduce((acc, s) => { if (s && (s.id || s.serviceId)) acc[s.id || s.serviceId] = s; return acc; }, {});
                    setServicesMap(svcMap);
                    setServices(servicesData || []);

                    const doctorsData = (doctorsResponse && doctorsResponse.status === 'fulfilled' && doctorsResponse.value && doctorsResponse.value.data)
                        ? (Array.isArray(doctorsResponse.value.data) ? doctorsResponse.value.data : (doctorsResponse.value.data.data || []))
                        : [];
                    const dMap = (doctorsData || []).reduce((acc, d) => { if (d && (d.id || d.doctorId)) acc[d.id || d.doctorId] = d; return acc; }, {});
                    setDoctorMap(dMap);
                    setDoctors(doctorsData || []);

                    // Process doctor rooms mapping
                    try {
                        const doctorRoomsResultValue = doctorRoomsResult.status === 'fulfilled' ? doctorRoomsResult.value : null;
                        const doctorRoomsData = (doctorRoomsResultValue && doctorRoomsResultValue.data)
                            ? (Array.isArray(doctorRoomsResultValue.data) ? doctorRoomsResultValue.data : (doctorRoomsResultValue.data.data || []))
                            : [];

                        const rMap = (doctorRoomsData || []).reduce((acc, r) => {
                            if (!r) return acc;
                            const name = r.name || r.roomName || r.displayName || r.label || r.description || r.room_label || r.room_name || '';
                            const keys = [r.id, r.roomId, r.room_id, r.code, r.roomCode, r.room_code, r.roomNumber, r.room_no, r.number];
                            keys.forEach(k => { try { if (k !== undefined && k !== null && String(k).toString().trim() !== '') acc[String(k)] = name || String(r.name || r.roomName || r.code || r.id); } catch (e) {} });
                            return acc;
                        }, {});
                        if (Object.keys(rMap).length > 0) setRoomMap(prev => ({ ...(prev || {}), ...rMap }));
                    } catch (e) { /* ignore room map errors */ }

                    if (laResp && laResp.status === 'fulfilled' && laResp.value && laResp.value.success && Array.isArray(laResp.value.data)) setLabAssignments(laResp.value.data);

                    if (profileResp && profileResp.status === 'fulfilled' && profileResp.value && profileResp.value.success && profileResp.value.data) {
                        const profile = Array.isArray(profileResp.value.data) ? (profileResp.value.data[0] || null) : profileResp.value.data;
                        if (profile) setLabUserProfile(profile);
                    }
                    
                    fetchReagentsAndDevices();

                } catch (bgErr) {
                    /* Background data load failed */
                }
            })();

            // PHASE 3: Lazy load samples on demand (only for visible/filtered appointments)
            // This happens after initial render to improve perceived performance
            setTimeout(() => {
                (async () => {
                    try {
                        const apptIds = Array.isArray(appointmentsData) ? appointmentsData.map(a => a.id || a.appointmentId).filter(Boolean) : [];
                        if (!apptIds || apptIds.length === 0) return;
                        
                        const limit = 20; // Increased batch size for efficiency
                        const allSamples = [];
                        
                        for (let i = 0; i < apptIds.length; i += limit) {
                            const chunk = apptIds.slice(i, i + limit);
                            const chunkPromises = chunk.map(id => 
                                (typeof sampleService.getSamplesByAppointment === 'function') 
                                    ? sampleService.getSamplesByAppointment(id).catch(() => ({ success: false, data: [] })) 
                                    : Promise.resolve({ success: false, data: [] })
                            );
                            const chunkResults = await Promise.all(chunkPromises);
                            chunkResults.forEach(r => {
                                try {
                                    const arr = (r && r.data) ? (Array.isArray(r.data) ? r.data : (r.data.items || [])) : (Array.isArray(r) ? r : []);
                                    if (Array.isArray(arr) && arr.length > 0) allSamples.push(...arr);
                                } catch (e) { /* ignore malformed */ }
                            });
                        }
                        
                        const normalizedSamples = allSamples.map(s => ({
                            ...s,
                            id: s.id || s.sample_id || s.sampleId,
                            appointmentId: s.appointmentId || s.appointment_id,
                            sampleType: s.sampleType || s.sample_type,
                            collectedAt: s.collectedAt || s.collected_at,
                            storageLocation: s.storageLocation || s.storage_location,
                            labUserId: s.labUserId || s.lab_user_id
                        }));
                        
                        const sampleAptMap = normalizedSamples.reduce((acc, s) => { 
                            const aptId = s.appointmentId || s.appointment_id; 
                            if (aptId) acc[aptId] = s; 
                            return acc; 
                        }, {});
                        
                        setSampleMapByAppointmentId(sampleAptMap);
                        setSamples(normalizedSamples);
                    } catch (e) { /* Lazy load samples failed */ }
                })();
            }, 100); // Small delay to prioritize initial render

        } catch (error) {
            /* Error loading appointments */
            setError('Lỗi khi tải dữ liệu');
            setLoading(false);
        }
    };

    /**
     * Fetches test results for a single appointment and caches them
     * 
     * This function retrieves test results for a specific appointment and caches
     * them in appointmentResultsMap to avoid redundant API calls. If results are
     * already cached, returns the cached data immediately.
     * 
     * **Caching behavior:**
     * - Checks cache first before making API call
     * - Updates appointmentResultsMap with fetched results
     * - Returns cached data if available
     * 
     * @param {string|number} appointmentId - Appointment ID to fetch results for
     * @returns {Promise<Array<Object>|null>} Array of test result objects or null if error
     * 
     * @example
     * const results = await fetchResultsForAppointment('APT-123');
     * // Returns: [{ testResultId: 'TR-456', status: 'completed', ... }]
     */
    const fetchResultsForAppointment = async (appointmentId) => {
        if (!appointmentId) return null;
        try {
            // If cached, return
            if (appointmentResultsMap && appointmentResultsMap[String(appointmentId)]) return appointmentResultsMap[String(appointmentId)];
            if (typeof testOrderService.getResultsByAppointment === 'function') {
                const res = await testOrderService.getResultsByAppointment(appointmentId).catch(() => ({ success: false, data: [] }));
                const data = (res && res.success && Array.isArray(res.data)) ? res.data : [];
                setAppointmentResultsMap(prev => ({ ...(prev || {}), [String(appointmentId)]: data }));
                return data;
            }
        } catch (e) {
            /* fetchResultsForAppointment error */
        }
        setAppointmentResultsMap(prev => ({ ...(prev || {}), [String(appointmentId)]: [] }));
        return [];
    };

    

    useEffect(() => {
        loadData();
        const handler = (e) => {
            if (e.key === 'lab_selected_date') {
                setSelectedDate(e.newValue === null ? '' : e.newValue || new Date().toISOString().slice(0, 10));
            }
        };
        window.addEventListener('storage', handler);
        return () => window.removeEventListener('storage', handler);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Auto-refresh hook
    useAutoRefresh(loadData, {
        eventName: 'appointmentsChanged',
        flagKey: 'shouldRefreshAppointments'
    });

    // --- TỐI ƯU HÓA: Debounce cho Search Input ---
    useEffect(() => {
        const delayDebounceFn = setTimeout(() => {
            setSearchTerm(inputSearchTerm);
        }, 300); // Trì hoãn 300ms

        return () => clearTimeout(delayDebounceFn);
    }, [inputSearchTerm]);

    // --- TỐI ƯU HÓA: useMemo cho Filtering và Sorting ---
    const _filteredAppointmentsMemo = useMemo(() => {
        let filtered = appointments;

        // 1. Loại bỏ các status không liên quan
        const _normalizeStatus = (s) => (s || '').toString().toLowerCase().replace(/\s+/g, '_').replace(/-+/g, '_').trim();
        filtered = (filtered || []).filter(apt => {
            const s = _normalizeStatus(apt.status);
            return s !== 'pending_confirmation' && s !== 'scheduled';
        });
        
        // 2. Lọc theo Lab Assignment (chỉ áp dụng nếu labUserProfile có)
        // ... (Logic lọc Assignment giữ nguyên)
        if (labUserProfile) {
            const pid = String(labUserProfile.id || labUserProfile.userId || labUserProfile.labUserId || labUserProfile.lab_user_id || labUserProfile.UserId || labUserProfile.Id || '').trim();
            
            const assignmentsSource = (Array.isArray(labAssignments) && labAssignments.length > 0)
                ? labAssignments
                : (Array.isArray(labUserProfile?.labAssignments) ? labUserProfile.labAssignments : []);
                
            const assignmentsForUserAll = (assignmentsSource || []).filter(a => {
                const aid = a.lab_user_id || a.labUserId || a.lab_user_profile_id || a.labUserProfileId || a.userId || a.user_id;
                return aid && String(aid).trim() === pid;
            });
            
            const assignmentsForUserByDate = (assignmentsForUserAll || []).filter(a => {
                if (!selectedDate) return true;
                const ad = a.assignment_date || a.assignmentDate || a.shiftDate || a.assignment_date_time || a.assignmentDateTime || a.date;
                return normalizeToISODate(ad) === normalizeToISODate(selectedDate);
            });
            
            const assignmentIdsForUserByDate = (assignmentsForUserByDate || []).map(a => a.assignment_id || a.id || a.lab_assignment_id || a.labAssignmentId || a.assignmentId).filter(Boolean).map(String);

            const isAssignedToLabUser = (appointment) => {
                const aId = getAssignmentIdFromAppointment(appointment);
                if (aId && assignmentIdsForUserByDate.length > 0) {
                    if (assignmentIdsForUserByDate.some(x => normalizeId(x) === normalizeId(aId))) return true;
                }
                
                // Fallback check (less efficient, kept for robustness)
                if (aId && Array.isArray(labAssignments) && labAssignments.length > 0) {
                    const found = labAssignments.find(l => {
                        const cand = l.id || l.assignmentId || l.labAssignmentId || l.lab_assignment_id || l.assignment_id || l.Id || l.ID;
                        return cand !== undefined && cand !== null && normalizeId(cand) === normalizeId(aId);
                    });
                    if (found) {
                        const assLabUserId = found.labUserProfileId || found.lab_user_profile_id || found.labUserId || found.lab_user_id || (found.labUser && (found.labUser.id || found.labUser.userId)) || found.userId || found.user_id;
                        if (assLabUserId && String(assLabUserId).trim() === pid) return true;
                    }
                }
                return false;
            };

            if (onlyMyAssignments) {
                filtered = filtered.filter(appointment => isAssignedToLabUser(appointment));
            } else if (pid) {
                // If user is a Lab User, filter out appointments not assigned to them (default behavior for lab view)
                filtered = filtered.filter(apt => isAssignedToLabUser(apt));
            }
        }

        // 3. Lọc theo Ngày (selectedDate) và Tháng (selectedMonth)
        if (selectedDate) {
            const selIso = normalizeToISODate(selectedDate);
            filtered = filtered.filter(apt => {
                try {
                    const shiftId = apt.doctorShiftId || apt.shiftId || apt.shift?.id;
                    const shift = shiftMap[shiftId];
                    const appointmentDateRaw = shift ? (shift.shiftDate || shift.date) : apt.appointmentDate || apt.createdAt;
                    const aptIso = normalizeToISODate(appointmentDateRaw);
                    return aptIso && selIso && aptIso === selIso;
                } catch (e) { return false; }
            });
        } else if (selectedMonth) {
            filtered = filtered.filter(apt => {
                try {
                    const shiftId = apt.doctorShiftId || apt.shiftId || apt.shift?.id;
                    const shift = shiftMap[shiftId];
                    const appointmentDateRaw = shift ? (shift.shiftDate || shift.date) : apt.appointmentDate || apt.createdAt;
                    const aptIso = normalizeToISODate(appointmentDateRaw);
                    return aptIso ? aptIso.startsWith(selectedMonth) : false;
                } catch (e) { return false; }
            });
        }

        // 4. Lọc theo Trạng thái
        if (statusFilter !== 'all') {
            filtered = filtered.filter(apt => apt.status === statusFilter);
        }

        // 5. Lọc theo Tìm kiếm - SKIP (handled by mFilteredAppointments with instant normalized search)
        // Search filtering now happens in mFilteredAppointments for better UX

        // 6. Sắp xếp
        filtered.sort((a, b) => {
            let aValue, bValue;
            
            if (sortField === 'createdAt') {
                aValue = a.createdAt ? new Date(a.createdAt) : new Date(a.appointmentDate || 0);
                bValue = b.createdAt ? new Date(b.createdAt) : new Date(b.appointmentDate || 0);
            } else if (sortField === 'appointmentDate') {
                aValue = new Date(a.appointmentDate || 0);
                bValue = new Date(b.appointmentDate || 0);
            } else {
                aValue = a[sortField];
                bValue = b[sortField];
            }

            if (sortDirection === 'asc') {
                return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
            } else {
                return aValue < bValue ? 1 : aValue > bValue ? -1 : 0;
            }
        });

        return filtered;
    }, [
        appointments, selectedMonth, selectedDate, statusFilter, searchTerm, 
        sortField, sortDirection, 
        patientMap, doctorMap, shiftMap, labUserProfile, labAssignments, onlyMyAssignments
    ]);
    // Use the old memoized logic for compatibility with existing code that references filteredAppointments
    filteredAppointments = _filteredAppointmentsMemo;

    // Prefetch results for appointments currently visible in the filtered list
    useEffect(() => {
        try {
            if (!filteredAppointments || filteredAppointments.length === 0) return;
            // Limit prefetch to first 50 to avoid flooding backend
            const toFetch = (filteredAppointments || []).slice(0, 50).map(a => String(a.id || a.appointmentId)).filter(Boolean);
            toFetch.forEach(id => {
                if (!appointmentResultsMap[String(id)]) {
                    // fire-and-forget
                    fetchResultsForAppointment(id).catch(() => {});
                }
            });
        } catch (e) { /* ignore */ }
    }, [filteredAppointments]);
    
    // Auto-send filtered appointments to sessionStorage/BroadcastChannel
    useEffect(() => {
        const t = setTimeout(() => {
            try {
                const payload = {
                    filteredAppointments: filteredAppointments || [],
                    selectedDate: selectedDate || ''
                };
                try { sessionStorage.setItem('appts_for_sample_mgmt', JSON.stringify(payload)); } catch (e) { /* sessionStorage write failed */ }
                try {
                    const idsFallback = (payload.filteredAppointments || []).map(a => a && (a.id || a.appointmentId || a._id)).filter(Boolean);
                    sessionStorage.setItem('lab_last_appointment_ids', JSON.stringify(idsFallback));
                    sessionStorage.setItem('lab_last_selected_date', String(payload.selectedDate || ''));
                } catch (e) { /* ignore */ }
                try {
                    if (typeof BroadcastChannel !== 'undefined') {
                        const bc = new BroadcastChannel('appts_sync');
                        const ids = (payload.filteredAppointments || []).map(a => a && (a.id || a.appointmentId || a._id)).filter(Boolean);
                        bc.postMessage({ type: 'filteredAppointments', payload, ids, timestamp: Date.now() });
                        bc.close();
                    }
                } catch (e) { /* ignore */ }
                try {
                    const pingKey = 'appts_sync_event';
                    localStorage.setItem(pingKey, JSON.stringify({ type: 'filteredAppointments', ts: Date.now() }));
                    setTimeout(() => { try { localStorage.removeItem(pingKey); } catch (e) {} }, 500);
                } catch (e) {}
            } catch (e) {
                /* Auto-send failed */
            }
        }, 300);

        return () => clearTimeout(t);
    }, [filteredAppointments, selectedDate]);

    // Compute filteredSamples: samples that relate to current filteredAppointments
    const filterSamples = useCallback(() => {
        try {
            const apptIds = new Set((filteredAppointments || []).map(a => String(a.id || a._id)));
            let related = (samples || []).filter(s => {
                try {
                    const sid = String(s.appointmentId || s.appointment_id || (s.appointment && (s.appointment.id || s.appointment._id)) || '');
                    return apptIds.has(sid);
                } catch (e) { return false; }
            });

            // Exclude samples that are pending test to avoid showing them in the related-samples list
            related = (related || []).filter(s => !isSamplePendingTestLocal(s));

            if (statusFilter && statusFilter !== 'all') {
                related = related.filter(s => String(s.status || s.state || '').toLowerCase() === String(statusFilter).toLowerCase());
            }

            if (searchTerm && String(searchTerm).trim() !== '') {
                const lower = String(searchTerm).toLowerCase();
                related = related.filter(s => {
                    const barcode = String(s.barcode || s.id || s.sampleId || '');
                    let patientName = '';
                    try {
                        const apt = (appointments || []).find(a => String(a.id) === String(s.appointmentId || s.appointment_id));
                        if (apt) {
                            patientName = apt.patientName || apt.fullName || '';
                        } else if (patientMap && (s.patientId || s.patient_id)) {
                            const p = patientMap[s.patientId || s.patient_id];
                            patientName = p ? (p.fullName || p.name || p.full_name || '') : (s.patientName || '');
                        } else {
                            patientName = s.patientName || '';
                        }
                    } catch (e) { patientName = ''; }
                    return (barcode && barcode.toLowerCase().includes(lower)) || (patientName && patientName.toLowerCase().includes(lower));
                });
            }

            setFilteredSamples(related || []);
        } catch (e) {
            setFilteredSamples([]);
        }
    }, [filteredAppointments, samples, statusFilter, searchTerm, appointments, patientMap]);

    useEffect(() => { filterSamples(); }, [filterSamples]);

    // Prefetch appointment results for samples shown in the related-samples list
    useEffect(() => {
        try {
            if (!filteredSamples || filteredSamples.length === 0) return;
            const aptIds = Array.from(new Set((filteredSamples || []).map(s => String(s.appointmentId || s.appointment_id || '').trim()).filter(Boolean)));
            aptIds.forEach(id => {
                const key = String(id);
                if (appointmentResultsMap && appointmentResultsMap[key] !== undefined) return;
                if (resultsLoadingMap[key]) return; // already loading
                // mark loading
                setResultsLoadingMap(prev => ({ ...(prev || {}), [key]: true }));
                // fetch and ensure cache + clear loading flag
                fetchResultsForAppointment(id).then((data) => {
                    try {
                        setAppointmentResultsMap(prev => ({ ...(prev || {}), [key]: Array.isArray(data) ? data : (data && data.data) ? data.data : [] }));
                    } catch (e) { /* ignore */ }
                }).catch(() => {}).finally(() => {
                    setResultsLoadingMap(prev => ({ ...(prev || {}), [key]: false }));
                });
            });
        } catch (e) { /* ignore */ }
    }, [filteredSamples, appointmentResultsMap]);

    // Keep `sampleMapByAppointmentId` synchronized with `samples` array and
    // update any selected sample/detail references when samples update.
    useEffect(() => {
        try {
            const map = (samples || []).reduce((acc, s) => {
                try {
                    const aptId = s && (s.appointmentId || s.appointment_id || (s.appointment && (s.appointment.id || s.appointment._id)));
                    if (aptId !== undefined && aptId !== null && String(aptId).trim() !== '') acc[String(aptId)] = s;
                } catch (e) { /* ignore per-item errors */ }
                return acc;
            }, {});
            setSampleMapByAppointmentId(map);

            // Keep currently-selected sample object fresh if it was reloaded
            if (selectedSample && (selectedSample.id || selectedSample.sampleId)) {
                const selId = String(selectedSample.id || selectedSample.sampleId);
                const refreshed = (samples || []).find(s => String(s.id || s.sampleId || s.sample_id) === selId);
                if (refreshed && refreshed !== selectedSample) setSelectedSample(refreshed);
            }

            // Sync sample detail modal data if open
            if (sampleDetailData && (sampleDetailData.id || sampleDetailData.sampleId)) {
                const detId = String(sampleDetailData.id || sampleDetailData.sampleId);
                const refreshedDet = (samples || []).find(s => String(s.id || s.sampleId || s.sample_id) === detId);
                if (refreshedDet && refreshedDet !== sampleDetailData) setSampleDetailData(refreshedDet);
            }
        } catch (e) {
            // no-op on sync errors
        }
    }, [samples]);

    // --- Hàm Lookup đã được tối ưu hóa O(1) ---

    /**
     * Gets patient name from patient ID using lookup map
     * 
     * This optimized lookup function retrieves patient name from patientMap
     * for O(1) access. It handles various name field formats and provides
     * fallback values if patient not found.
     * 
     * @param {string|number} patientId - Patient ID to lookup
     * @returns {string} Patient full name or fallback value ('Chưa có' or patient ID)
     * 
     * @example
     * getPatientName('PAT-123') // Returns: 'Nguyễn Văn A'
     * getPatientName('INVALID') // Returns: 'INVALID'
     */
    const getPatientName = useCallback((patientId) => {
        if (!patientId && patientId !== 0) return 'Chưa có';
        const key = String(patientId);
        const patient = patientMap[key];
        if (patient) {
            const fullName = patient.fullName || patient.FullName || patient.full_name || patient.fullname || patient.fullname || patient.name || patient.displayName;
            return String(fullName || `BN-${key}`).trim();
        }
        return String(key);
    }, [patientMap]);

    /**
     * Gets doctor name from doctor ID using lookup map
     * 
     * This optimized lookup function retrieves doctor name from doctorMap
     * for O(1) access. Returns 'Chưa phân bổ' if doctor not found.
     * 
     * @param {string|number} doctorId - Doctor ID to lookup
     * @returns {string} Doctor full name or 'Chưa phân bổ' if not found
     * 
     * @example
     * getDoctorName('DOC-123') // Returns: 'Bác sĩ Nguyễn Văn B'
     * getDoctorName(null) // Returns: 'Chưa phân bổ'
     */
    const getDoctorName = useCallback((doctorId) => {
        if (!doctorId) return 'Chưa phân bổ';
        const doctor = doctorMap[doctorId];
        return doctor ? doctor.fullName : 'Chưa phân bổ';
    }, [doctorMap]);

    /**
     * Gets shift object from shift ID using lookup map
     * 
     * This optimized lookup function retrieves shift object from shiftMap
     * for O(1) access. Returns null if shift not found.
     * 
     * @param {string|number} shiftId - Shift ID to lookup
     * @returns {Object|null} Shift object or null if not found
     * 
     * @example
     * getShiftById('SHIFT-123') // Returns: { id: 'SHIFT-123', shiftStart: '07:00', ... }
     */
    const getShiftById = useCallback((shiftId) => {
        if (!shiftId) return null;
        return shiftMap[shiftId] || null;
    }, [shiftMap]);

    /**
     * Gets sample barcode from appointment ID using lookup map
     * 
     * This optimized lookup function retrieves sample barcode from
     * sampleMapByAppointmentId for O(1) access. Returns null if sample
     * not found or barcode is invalid.
     * 
     * @param {string|number} appointmentId - Appointment ID to lookup sample for
     * @returns {string|null} Sample barcode or null if not found
     * 
     * @example
     * getSampleBarcode('APT-123') // Returns: 'SAMPLE-456'
     */
    const getSampleBarcode = useCallback((appointmentId) => {
        if (!appointmentId) return null;
        const sample = sampleMapByAppointmentId[appointmentId];
        if (sample) {
            const barcodeValue = sample.barcode || String(sample.id);
            if (barcodeValue && barcodeValue !== 'undefined' && barcodeValue !== 'null') {
                return barcodeValue;
            }
        }
        return null;
    }, [sampleMapByAppointmentId]);

    /**
     * Gets patient name from sample object
     * 
     * This function extracts patient name from a sample object by:
     * 1. Finding patient ID from sample or associated appointment
     * 2. Looking up patient in patientMap or patients array
     * 3. Returning patient name or fallback value
     * 
     * @param {Object} sample - Sample object that may contain patient information
     * @returns {string} Patient name or 'Chưa có thông tin' if not found
     * 
     * @example
     * getPatientNameFromSample({ appointmentId: 'APT-123' }) // Returns: 'Nguyễn Văn A'
     */
    const getPatientNameFromSample = (sample) => {
        if (!sample) return 'Chưa có thông tin';
        const patientId = sample.patientId || sample.patient_id || sample.patient || (sample.appointmentId ? (appointments.find(a => String(a.id) === String(sample.appointmentId))?.patientId) : null);
        const cache = patientMap[patientId] || patients.find(p => String(p.id) === String(patientId));
        if (cache) return cache.fullName || cache.fullname || cache.name || 'Chưa có thông tin';
        return sample.patientName || 'Chưa có thông tin';
    };

    /**
     * Gets patient ID from sample object
     * 
     * This function extracts patient ID from a sample object by checking:
     * 1. Direct patientId field in sample
     * 2. Associated appointment's patientId
     * 3. Returns patient ID or 'Chưa có' if not found
     * 
     * @param {Object} sample - Sample object that may contain patient ID
     * @returns {string|number} Patient ID or 'Chưa có' if not found
     * 
     * @example
     * getPatientIdFromSample({ appointmentId: 'APT-123' }) // Returns: 'PAT-456'
     */
    const getPatientIdFromSample = (sample) => {
        if (!sample) return 'Chưa có';
        if (sample.appointmentId && appointments && Array.isArray(appointments)) {
            const appointment = appointments.find(apt => String(apt.id) === String(sample.appointmentId));
            if (appointment) return appointment.patientCode || appointment.patientId || appointment.patient_id || 'Chưa có';
        }
        if (sample.patientId) return sample.patientId;
        return 'Chưa có';
    };
    
    // --- Sample results (inlined logic for modal) ---

    // Fetch package criteria for results modal (using cached results when available)
    const fetchPackageCriteriaForSelectedSample = async (pkgIdParam = null) => {
        setLastPackageRaw(null); // Clear raw data on new attempt
        try {
            let critList = null;
            const pkgId = pkgIdParam || (selectedSample?.packageId || selectedSample?.pkgId || selectedSample?.testPackageId || selectedSample?.packageCriteria?.id) || null;
            if (!pkgId) {
                /* No pkgId provided or found on selectedSample */
                return [];
            }

            // 1. Check local memory cache
            if (testPackageCriteriaCache && Array.isArray(testPackageCriteriaCache[String(pkgId)])) {
                const cached = testPackageCriteriaCache[String(pkgId)];
                /* cache hit */
                return cached;
            }

            /* start fetching criteria */

            // 2. Try API paths (package-criteria, convenience fetch, package object derivation)
            try {
                if (typeof testOrderService.getPackageCriteriaById === 'function') {
                    const pres = await testOrderService.getPackageCriteriaById(pkgId).catch(() => null);
                    if (pres) {
                        const c = (pres.data && Array.isArray(pres.data)) ? pres.data : (Array.isArray(pres) ? pres : null);
                        if (c && c.length > 0) {
                            critList = c;
                            /* getPackageCriteriaById returned items */
                        } else {
                            /* getPackageCriteriaById returned no items */
                        }
                        if (pres && pres.raw !== undefined) setLastPackageRaw(pres.raw);
                    }
                }
            } catch (e) { critList = null; }

            if ((!critList || critList.length === 0) && typeof testOrderService.getCriteriaForPackage === 'function') {
                const resp = await testOrderService.getCriteriaForPackage(pkgId).catch(() => null);
                const c = (resp && resp.data && Array.isArray(resp.data)) ? resp.data : (Array.isArray(resp) ? resp : null);
                if (c && c.length > 0) {
                    critList = c;
                    /* getCriteriaForPackage returned items */
                } else {
                    /* getCriteriaForPackage returned no items */
                }
                if (resp && resp.raw !== undefined) setLastPackageRaw(resp.raw);
            }

            // Additional fallback: if package object endpoint exists, try to read criteria/tests from it
            if ((!critList || critList.length === 0) && typeof testOrderService.getTestPackage === 'function') {
                const pres = await testOrderService.getTestPackage(pkgId).catch(() => null);
                const pkgObj = pres && pres.data ? pres.data : pres || null;
                if (pkgObj) {
                    // try multiple fields
                    if (Array.isArray(pkgObj.criteria) && pkgObj.criteria.length > 0) {
                        critList = pkgObj.criteria;
                        /* getTestPackage -> pkgObj.criteria returned items */
                    } else if (Array.isArray(pkgObj.tests) && pkgObj.tests.length > 0) {
                        critList = pkgObj.tests;
                        /* getTestPackage -> pkgObj.tests returned items */
                    } else {
                        /* getTestPackage returned package object but no criteria/tests */
                    }
                    if (pkgObj.raw !== undefined) setLastPackageRaw(pkgObj.raw);
                } else {
                    /* getTestPackage returned no package object */
                }
            }

            if (!critList || critList.length === 0) {
                /* No criteria found */
                return [];
            }

            // 3. Map and normalize criteria objects to tests shape; ensure deterministic ids when backend omits id
            const parsed = (critList || []).map((d, idx) => {
                // Prefer explicit criteriaId / criteriaName fields from the gateway
                const rawId = d?.criteriaId || d?.criteria_id || d?.id || d?.CriteriaId || d?.testCriterionId || d?.criterionId || (d && d.test && (d.test.id || d.test.testId)) || null;
                const altKey = d?.criteriaCode || d?.code || d?.ParamCode || d?.ParamName || d?.Param || d?.paramName || d?.param || d?.Abbreviation || d?.abbreviation || null;
                const id = rawId != null ? String(rawId) : (altKey != null ? String(altKey) : (`pkg_${String(pkgId)}_idx_${idx}`));
                const name = d?.criteriaName || d?.criteria_name || d?.name || d?.ParamName || d?.Param || d?.displayName || d?.TestName || d?.testName || (`Test ${String(id).slice(0,6)}`);
                const unit = d?.unit || d?.uom || d?.units || d?.Unit || '';

                // If API provides explicit numeric refMin/refMax prefer them
                const explicitMin = (d?.referenceMin !== undefined && d?.referenceMin !== null) ? Number(d.referenceMin) : (d?.referenceMin ?? d?.ReferenceMin ?? null);
                const explicitMax = (d?.referenceMax !== undefined && d?.referenceMax !== null) ? Number(d.referenceMax) : (d?.referenceMax ?? d?.ReferenceMax ?? null);
                let refRange = d?.refRange || d?.referenceRange || d?.normalRange || d?.Reference || d?.reference || '';
                let refMin = null, refMax = null;

                if (explicitMin !== undefined && explicitMin !== null || explicitMax !== undefined && explicitMax !== null) {
                    refMin = explicitMin != null ? explicitMin : null;
                    refMax = explicitMax != null ? explicitMax : null;
                    // build a readable refRange if both present
                    if (refMin != null || refMax != null) {
                        refRange = `${refMin != null ? refMin : ''}${(refMin != null && refMax != null) ? ' - ' : ''}${refMax != null ? refMax : ''}`.trim();
                    }
                } else {
                    try {
                        if (typeof refRange === 'string' && refRange.trim() !== '') {
                            const cleaned = refRange.replace(/[,]/g, '.').replace(/–/g, '-').replace(/\s+/g, ' ').trim();
                            const rangeMatch = cleaned.match(/([<>]=?)?\s*([0-9]*\.?[0-9]+)\s*(?:-|to|–|−)\s*([0-9]*\.?[0-9]+)/i);
                            if (rangeMatch) {
                                refMin = Number(rangeMatch[2]);
                                refMax = Number(rangeMatch[3]);
                            } else {
                                const singleMatch = cleaned.match(/([<>]=?)\s*([0-9]*\.?[0-9]+)/);
                                if (singleMatch) {
                                    const op = singleMatch[1]; const val = Number(singleMatch[2]);
                                    if (/^</.test(op)) refMax = val;
                                    else if (/^>/.test(op)) refMin = val;
                                } else {
                                    const twoNums = cleaned.match(/([0-9]*\.?[0-9]+).*?([0-9]*\.?[0-9]+)/);
                                    if (twoNums) { refMin = Number(twoNums[1]); refMax = Number(twoNums[2]); }
                                }
                            }
                        }
                    } catch (e) { /* ignore parse failures */ }
                }

                return { id: String(id), name, result: '', unit, refRange, refMin, refMax, raw: d };
            }).filter(Boolean);

            /* parsed raw items */

            // Deduplicate and cache the result before returning
            const deduped = dedupeCriteria(parsed || []);
            const sampleNames = (deduped || []).slice(0,5).map(x => x && x.name).filter(Boolean);
            /* deduped items */
            if (deduped.length > 0) {
                setTestPackageCriteriaCache(prev => ({ ...prev, [String(pkgId)]: deduped }));
            }
            return deduped;

        } catch (e) {
            /* fetchPackageCriteriaForSelectedSample error */
            return [];
        } finally {
            setResultsLoading(false);
        }
    };

    /**
     * Opens the result entry modal for a sample
     * 
     * This function is the main entry point for entering test results. It performs:
     * 1. Validates sample ID and fetches sample data
     * 2. Checks if appointment already has results (prevents duplicate entry)
     * 3. Loads test package criteria for the sample
     * 4. Opens the result entry modal with prepared form data
     * 
     * **Validation:**
     * - Checks if sample exists
     * - Prevents entry if appointment already has results
     * - Loads criteria from test package
     * 
     * @param {string|number} sampleId - Sample ID to open results modal for
     * @returns {Promise<void>} Does not return a value. Opens modal and updates state.
     * 
     * @example
     * // Open results modal for a sample
     * await handleOpenResults('SAMPLE-123');
     */
    const handleOpenResults = async (sampleId) => {
        setResultsLoading(true);
        try {
            if (!sampleId) { showError('ID mẫu không hợp lệ'); setResultsLoading(false); return; }
            let sampleObj = null;
            const res = await sampleService.getSampleById(sampleId).catch(() => null);
            if (res && res.success && res.data) sampleObj = res.data;
            else sampleObj = (samples || []).find(s => String(s.id || s.sampleId || s.sample_id) === String(sampleId)) || null;

            if (!sampleObj) { showError('Không tìm thấy mẫu xét nghiệm'); setResultsLoading(false); return; }

            // Check appointment-level results first: if any results exist for this appointment, do not allow new entry
            const appointmentIdForSample = sampleObj.appointmentId || sampleObj.appointment_id || null;
            if (appointmentIdForSample) {
                try {
                    const aptResults = await fetchResultsForAppointment(appointmentIdForSample);
                    // Ensure cache is explicitly set (fetchResultsForAppointment usually does this,
                    // but set it here to guarantee re-render in all code paths)
                    try {
                        setAppointmentResultsMap(prev => ({ ...(prev || {}), [String(appointmentIdForSample)]: Array.isArray(aptResults) ? aptResults : (aptResults && aptResults.data) ? aptResults.data : [] }));
                    } catch (setErr) { /* ignore */ }

                    if (Array.isArray(aptResults) && aptResults.length > 0) {
                        showInfo('Đã có kết quả cho lịch hẹn này. Không thể nhập kết quả mới.');
                        setResultsLoading(false);
                        return;
                    }
                } catch (e) {
                    // If fetch fails, continue to allow entry but log
                    /* Could not determine appointment results, allowing entry by fallback */
                }
            }

            // No existing results found for appointment -> proceed to open entry modal
            setResultsForm({ sampleId: String(sampleId), tests: [], notes: translateToVietnamese(sampleObj.notes) || '' });
            setSelectedSample(sampleObj);
            setShowResultsModal(true);

            // Load criteria (which implicitly fetches and caches the criteria)
            const fetchedCriteria = await ensurePackageCriteriaLoaded({ sampleObj });

            // Prepare tests without merging any existing appointment results (we already blocked when results existed)
            const mergedTests = (fetchedCriteria || []).map(t => ({ ...t, result: t.result || '' }));

            setResultsForm(prev => ({ ...prev, tests: mergedTests }));
            setResultsLoading(false);

        } catch (e) {
            /* handleOpenResults error */
            showError('Không thể tải danh sách xét nghiệm cho mẫu');
            setResultsLoading(false);
        }
    };
    
    /**
     * Ensures test package criteria are loaded (with caching)
     * 
     * This function ensures that test package criteria are loaded for result entry.
     * It checks the cache first, and if not found, fetches criteria using
     * fetchPackageCriteriaForSelectedSample. Used to guarantee criteria are
     * available before opening the result entry modal.
     * 
     * **Caching behavior:**
     * - Checks testPackageCriteriaCache first
     * - Fetches from API if not cached
     * - Returns empty array if packageId is missing
     * 
     * @param {Object} [options={}] - Options object
     * @param {Object} [options.sampleObj=null] - Sample object to extract packageId from
     * @param {Object} [options.appointment=null] - Appointment object to extract packageId from
     * @param {boolean} [options.promptIfMissing=true] - Whether to show error if packageId is missing
     * @returns {Promise<Array<Object>>} Array of test criteria objects
     * 
     * @example
     * const criteria = await ensurePackageCriteriaLoaded({ sampleObj: sample });
     * // Returns: [{ id: 'CRI001', name: 'Glucose', ... }]
     */
    const ensurePackageCriteriaLoaded = async ({ sampleObj = null, appointment = null, promptIfMissing = true } = {}) => {
        const pkgId = getTestPackageIdFromAppointment(appointment) || (sampleObj?.packageId || sampleObj?.pkgId || sampleObj?.testPackageId) || null;
        if (!pkgId) {
            // packageId missing: do not show an error notification here to avoid noisy alerts.
            return [];
        }

        if (testPackageCriteriaCache && Array.isArray(testPackageCriteriaCache[String(pkgId)])) {
            return testPackageCriteriaCache[String(pkgId)];
        }

        const fetched = await fetchPackageCriteriaForSelectedSample(pkgId);
        return fetched;
    };


    /**
     * Attempts to reload test package criteria
     * 
     * This function attempts to reload test package criteria for the selected sample.
     * It preserves existing result values in the form when reloading. Used when
     * criteria loading fails or needs to be retried.
     * 
     * **Preservation logic:**
     * - Preserves existing result values when reloading criteria
     * - Maps criteria by ID to maintain form state
     * 
     * @returns {Promise<boolean>} True if reload was successful, false otherwise
     * 
     * @example
     * // Retry loading criteria
     * const success = await attemptReloadCriteria();
     */
    const attemptReloadCriteria = async () => {
        try {
            setResultsLoading(true);
            const aptId = selectedSample?.appointmentId || selectedSample?.appointment_id;
            const appointment = aptId ? appointments.find(a => String(a.id) === String(aptId)) : null;

            const fetched = await ensurePackageCriteriaLoaded({ sampleObj: selectedSample, appointment, promptIfMissing: true });
            
            if (Array.isArray(fetched) && fetched.length > 0) {
                setResultsForm(prev => ({ 
                    ...prev, 
                    tests: fetched.map(t => ({ 
                        ...t, 
                        // Preserve existing results in the form if already entered (use ID for key)
                        result: (prev.tests.find(pt => String(pt.id) === String(t.id))?.result) ?? t.result ?? '' 
                    }))
                }));
                showSuccess('Tải tiêu chí gói tự động thành công');
                return true;
            }
            showError('Không tìm thấy tiêu chí gói. Vui lòng kiểm tra cấu hình gói xét nghiệm.');
            return false;
        } catch (err) {
            /* attemptReloadCriteria error */
            showError('Lỗi khi tải tiêu chí: ' + (err?.message || 'Unknown'));
            return false;
        } finally {
            setResultsLoading(false);
        }
    };
    
    useEffect(() => {
        if (!showResultsModal) return; 
        const existingCount = (resultsForm && Array.isArray(resultsForm.tests)) ? resultsForm.tests.length : 0;
        if (existingCount > 0) {
            if (criteriaAutoRetryCount !== 0) setCriteriaAutoRetryCount(0);
            return;
        }
        if (criteriaAutoRetryCount >= CRITERIA_AUTO_RETRY_MAX) return;

        let cancelled = false;
        const delayMs = [500, 2000, 5000][criteriaAutoRetryCount] || 3000;
        (async () => {
            await new Promise(r => setTimeout(r, delayMs));
            if (cancelled) return;
            try {
                const ok = await attemptReloadCriteria().catch(() => false);
                if (!cancelled) {
                    if (!ok) setCriteriaAutoRetryCount(c => c + 1);
                    else setCriteriaAutoRetryCount(0);
                }
            } catch (e) {
                if (!cancelled) setCriteriaAutoRetryCount(c => c + 1);
            }
        })();

        return () => { cancelled = true; };
    }, [showResultsModal, selectedSample, (resultsForm && Array.isArray(resultsForm.tests) ? resultsForm.tests.length : 0), criteriaAutoRetryCount]);

    /**
     * Force reloads test package criteria by clearing cache
     * 
     * This function clears the cached criteria for the selected sample's package
     * and attempts to reload them from the API. Used when criteria may have been
     * updated or when cache is suspected to be stale.
     * 
     * @returns {Promise<boolean>} True if reload was successful, false otherwise
     * 
     * @example
     * // Force reload criteria when user suspects cache is stale
     * const success = await handleForceReloadCriteria();
     */
    const handleForceReloadCriteria = async () => {
        try {
            const pkgId = (selectedSample && (selectedSample.packageId || selectedSample.pkgId || selectedSample.testPackageId)) || null;
            if (!pkgId) {
                showError('Không tìm thấy packageId để tải lại tiêu chí');
                return false;
            }
            // Remove from cache then attempt reload
            setTestPackageCriteriaCache(prev => {
                const copy = { ...(prev || {}) };
                delete copy[String(pkgId)];
                return copy;
            });
            setCriteriaAutoRetryCount(0);
            setResultsLoading(true);
            const ok = await attemptReloadCriteria();
            setResultsLoading(false);
            if (ok) showSuccess('Tải lại tiêu chí thành công');
            return ok;
        } catch (e) {
            /* handleForceReloadCriteria error */
            showError('Lỗi khi tải lại tiêu chí');
            setResultsLoading(false);
            return false;
        }
    };


    // --- Hàm xử lý thay đổi / validate cho Modal nhập KQ ---

    /**
     * Handles result value change in result entry form
     * 
     * This function updates the result value for a specific test in the results form
     * and immediately validates the new value. It updates both the form state and
     * validation state (errors/warnings).
     * 
     * @param {string|number} testId - Test criteria ID to update
     * @param {string|number} value - New result value to set
     * @returns {void} Does not return a value. Updates form and validation state.
     * 
     * @example
     * // Update glucose result value
     * handleChangeResult('CRI001', '100');
     */
    const handleChangeResult = (testId, value) => {
        // Cập nhật giá trị vào resultsForm
        setResultsForm(prev => ({ ...prev, tests: (prev.tests || []).map(t => String(t.id) === String(testId) ? { ...t, result: value } : t) }));

        // Thực hiện validation ngay lập tức
        try {
            const meta = resultsForm?.tests?.find(t => String(t.id) === String(testId)) || {};
            validateField(testId, value, meta);
        } catch (e) {
             /* Lỗi khi gọi validateField */
        }
    };
    
    /**
     * Validates a single test result field
     * 
     * This function validates a test result value against its reference range.
     * It checks:
     * 1. Numeric validity (if range exists, value must be numeric)
     * 2. Range validation (value must be within refMin and refMax)
     * 
     * Sets validation errors and warnings in component state.
     * 
     * @param {string|number} testId - Test criteria ID to validate
     * @param {string|number} value - Result value to validate
     * @param {Object} [meta={}] - Test metadata containing refMin, refMax, etc.
     * @returns {void} Does not return a value. Updates resultErrors and resultWarnings state.
     * 
     * @example
     * validateField('CRI001', '100', { refMin: 70, refMax: 99 });
     * // Sets error if value is out of range
     */
    const validateField = (testId, value, meta = {}) => {
        const errors = { ...resultErrors };
        const warnings = { ...resultWarnings };
        const key = String(testId);
        
        // clear existing
        if (errors[key]) delete errors[key];
        if (warnings[key]) delete warnings[key];

        const vRaw = value;
        const minRaw = meta.refMin ?? meta.ReferenceMin ?? meta.min ?? null;
        const maxRaw = meta.refMax ?? meta.ReferenceMax ?? meta.max ?? null;
        const min = minRaw != null ? Number(minRaw) : null;
        const max = maxRaw != null ? Number(maxRaw) : null;
        const numericValue = Number(String(vRaw).replace(/,/g, '.'));

        // Check 1: Numeric validity if range exists or it looks like a number field
        const isExpectingNumeric = (min !== null && !isNaN(min)) || (max !== null && !isNaN(max));

        if (String(vRaw).trim() !== '' && isExpectingNumeric && isNaN(numericValue)) {
             errors[key] = 'Yêu cầu giá trị số';
        } else if (String(vRaw).trim() !== '' && isExpectingNumeric) {
            // Check 2: Range check - treat out-of-range as ERROR shown under the input
            if (min !== null && numericValue < min) {
                errors[key] = `Giá trị nhỏ hơn giới hạn tối thiểu: ${min}`;
            } else if (max !== null && numericValue > max) {
                errors[key] = `Giá trị lớn hơn giới hạn tối đa: ${max}`;
            }
        }
        
        setResultErrors(errors);
        setResultWarnings(warnings);
    };


    /**
     * Saves test results to the backend
     * 
     * This function is the main handler for saving test results. It performs:
     * 1. Validates all required fields (reagent, device, quantity, all test values)
     * 2. Validates all test results against reference ranges
     * 3. Prepares payload with both lowercase (DB-friendly) and camelCase formats
     * 4. Creates or updates test result via API
     * 5. Subtracts reagent from warehouse
     * 6. Updates sample status to 'result_entered'
     * 7. Updates appointment status to 'ready_for_consultation'
     * 8. Dispatches refresh events to notify other components
     * 9. Reloads data to show updated status
     * 
     * **Validation checks:**
     * - Reagent, device, and quantity must be selected
     * - All test criteria must have values
     * - All values must be numeric (if range exists)
     * - All values must be within reference ranges
     * 
     * @returns {Promise<void>} Does not return a value. Updates backend and shows notifications.
     * 
     * @example
     * // Save results when user clicks "Lưu kết quả" button
     * await handleSaveResults();
     */
    const handleSaveResults = async () => {
        try {
            if (!resultsForm || !resultsForm.sampleId) { showError('Không có mẫu để lưu kết quả'); return; }
            
            // Validation: Reagent, Device, Quantity
            if (!selectedReagentId) { showError('Vui lòng chọn thuốc thử trước khi lưu kết quả'); return; }
            if (!selectedDeviceId) { showError('Vui lòng chọn thiết bị trước khi lưu kết quả'); return; }
            if (!reagentQuantity || Number(reagentQuantity) <= 0) { showError('Số lượng thuốc thử không hợp lệ'); return; }

            // Validation: Criteria present
            const tests = resultsForm.tests || [];
            if (tests.length === 0) { showError('Không có tiêu chí xét nghiệm để lưu.'); return; }

            // Final client-side validation: require ALL criteria to have a value
            const newErrors = {};
            const missingFields = [];
            
            for (const t of tests) {
                const val = t.result;
                const testName = t.name || `Tiêu chí ${String(t.id).slice(0, 6)}`;
                
                // If missing/empty, mark as required
                if (val === undefined || val === null || String(val).trim() === '') {
                    newErrors[t.id] = '⚠️ Bắt buộc nhập giá trị';
                    missingFields.push(testName);
                    continue;
                }

                // Re-run validation logic (sync with validateField)
                const minRaw = t.refMin ?? t.ReferenceMin ?? t.min ?? null;
                const maxRaw = t.refMax ?? t.ReferenceMax ?? t.max ?? null;
                const min = minRaw != null ? Number(minRaw) : null;
                const max = maxRaw != null ? Number(maxRaw) : null;
                const numericValue = Number(String(val).replace(/,/g, '.'));
                const isExpectingNumeric = (min !== null && !isNaN(min)) || (max !== null && !isNaN(max));

                if (isExpectingNumeric && isNaN(numericValue)) {
                    newErrors[t.id] = '❌ Yêu cầu giá trị số';
                } else if (isExpectingNumeric) {
                    if (min !== null && numericValue < min) newErrors[t.id] = `⬇️ Giá trị nhỏ hơn giới hạn tối thiểu: ${min}`;
                    else if (max !== null && numericValue > max) newErrors[t.id] = `⬆️ Giá trị lớn hơn giới hạn tối đa: ${max}`;
                }
            }

            setResultErrors(newErrors);
            setResultWarnings({});

            if (Object.keys(newErrors).length > 0) {
                if (missingFields.length > 0) {
                    const fieldList = missingFields.slice(0, 3).join(', ') + (missingFields.length > 3 ? ` và ${missingFields.length - 3} tiêu chí khác` : '');
                    showError(`⚠️ Vui lòng nhập đầy đủ tất cả các tiêu chí. Còn thiếu: ${fieldList}`);
                } else {
                    showError('❌ Có lỗi dữ liệu trong form. Vui lòng kiểm tra các trường đã đánh dấu đỏ.');
                }
                
                // Auto-scroll to first error field
                try {
                    const firstErrorKey = Object.keys(newErrors)[0];
                    const firstErrorElement = document.getElementById(makeFieldIdLocal('default', firstErrorKey));
                    if (firstErrorElement) {
                        firstErrorElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        firstErrorElement.focus();
                    }
                } catch (e) { /* ignore scroll error */ }
                
                return;
            }

            setResultsLoading(true);

            // Prepare payload
            const appointmentIdPayload = (selectedSample && (selectedSample.appointmentId || selectedSample.appointment_id || selectedSample.appointment)) || null;
            const packageIdPayload = (selectedSample && (selectedSample.packageId || selectedSample.pkgId || selectedSample.testPackageId || selectedSample.packageCriteria?.id)) || null;

            const parameters = (tests || []).map(t => {
                const canonicalId = t.id || t.criteriaId || t.testCriterionId || t.criterionId || t.testId || null;
                // Build both lowercase DB-friendly shape and compatibility camelCase shape
                const lower = {
                    criteria_id: canonicalId,
                    param_name: t.name,
                    abbreviation: t.abbreviation || t.abbr || '',
                    value: t.result,
                    unit: t.unit || null,
                    test_result_id: currentTestResultId || null
                };
                const camel = {
                    criteriaId: canonicalId,
                    testCriterionId: canonicalId,
                    criterionId: canonicalId,
                    name: t.name,
                    value: t.result,
                    unit: t.unit,
                    refRange: t.refRange,
                    refMin: t.refMin ?? null,
                    refMax: t.refMax ?? null,
                    raw: t
                };
                // Return a canonical combined object used by the payload builder
                return { lower, camel };
            });

            // Try to resolve full reagent object to include reagent code if available
            const selReagent = (reagents || []).find(r => String(resolveEntityKeyLocal(r)) === String(selectedReagentId)) || null;

            const payload = {
                sampleId: resultsForm.sampleId,
                appointmentId: appointmentIdPayload,
                packageId: packageIdPayload,
                // prefer sending actual reagent database id when available
                reagentId: selReagent?.id ?? selReagent?.reagentId ?? selReagent?.reagent_id ?? selectedReagentId,
                // include reagent code (backend often expects reagentCode property)
                reagentCode: selReagent?.code || selReagent?.reagentCode || selReagent?.reagent_code || selReagent?.icode || selReagent?.id || null,
                deviceId: selectedDeviceId,
                reagentQuantity: Number(reagentQuantity),
                reviewedBy: user?.id || user?.userId || user?.email || null,
                reviewedAt: (new Date()).toISOString(),
                // `parameters` field: send DB-friendly lower-case array (expected by parameter table)
                parameters: parameters.map(p => ({ ...p.lower })),
                // Backward compatibility: include CamelCase Parameters too
                Parameters: parameters.map(p => ({ CriteriaId: p.camel.criteriaId, ParamName: p.camel.name, Value: p.camel.value, Unit: p.camel.unit, Reference: p.camel.refRange })),
                notes: resultsForm.notes || '',
                // Backward compatibility fields...
                SampleId: resultsForm.sampleId,
                AppointmentId: appointmentIdPayload,
                ReagentId: selReagent?.id ?? selReagent?.reagentId ?? selReagent?.reagent_id ?? selectedReagentId,
                ReagentCode: selReagent?.code || selReagent?.reagentCode || selReagent?.reagent_code || selReagent?.icode || selReagent?.id || null,
                DeviceId: selectedDeviceId,
                Quantity: Number(reagentQuantity),
                ReviewedBy: user?.id || user?.userId || user?.email || null,
                // Mark the test result as waiting for review (so clinicians can QA)
                status: 'waiting_review',
                Status: 'waiting_review',
                // (Parameters also included above for backward compatibility)
            };

            // Call API: if we have an existing testResultId -> update, else create
            let postRes = null;
            try {
                if (currentTestResultId) {
                    postRes = await testOrderService.updateTestResult(currentTestResultId, payload).catch(err => ({ success: false, message: err?.message || 'Lỗi khi cập nhật kết quả' }));
                } else {
                    postRes = await testOrderService.createTestResult(payload).catch(err => ({ success: false, message: err?.message || 'Lỗi không xác định khi gọi API' }));
                    // If create succeeded and returned an id, set it for future updates
                    if (postRes && postRes.success && postRes.data) {
                        const newId = postRes.data.testResultId || postRes.data.id || postRes.data.test_result_id || null;
                        if (newId) setCurrentTestResultId(newId);
                    }
                }
            } catch (apiErr) {
                postRes = { success: false, message: apiErr?.message || 'Lỗi khi gọi API' };
            }

            if (postRes && postRes.success) {
                // Subtract reagent from warehouse
                try {
                    if (selectedReagentId && typeof warehouseService.subtractReagent === 'function') {
                        await warehouseService.subtractReagent(selectedReagentId, Number(reagentQuantity)).catch(err => { /* Failed subtract reagent */ });
                    }
                } catch (e) { /* reagent subtract error */ }

                // Update sample status to reflect result entry
                try {
                    await sampleService.updateSampleStatus(resultsForm.sampleId, 'result_entered');
                } catch (e) { /* Failed to update sample status to result_entered */ }

                // Update appointment status to 'ready_for_consultation' so the appointment can be consulted
                try {
                    if (appointmentIdPayload) {
                        await appointmentService.updateAppointmentStatus(appointmentIdPayload, 'ready_for_consultation').catch(err => { /* Failed to update appointment status */ });
                    }
                } catch (e) { /* Failed to update appointment status */ }

                showSuccess('✅ Lưu kết quả thành công');
                // Update local cache of appointment results to reflect newly created/updated result
                try {
                    const aptIdKey = String(appointmentIdPayload || '');
                    if (postRes.data) {
                        const newResultObj = Array.isArray(postRes.data) ? postRes.data : (postRes.data);
                        setAppointmentResultsMap(prev => ({ ...(prev || {}), [aptIdKey]: Array.isArray(newResultObj) ? newResultObj : [newResultObj] }));
                    } else if (currentTestResultId) {
                        // If update path and no data returned, mark that this appointment likely has results
                        setAppointmentResultsMap(prev => ({ ...(prev || {}), [aptIdKey]: [{ id: currentTestResultId }] }));
                    }
                } catch (e) { /* Failed to update appointmentResultsMap after save */ }

                setShowResultsModal(false);
                setResultsForm({ sampleId: null, tests: [], notes: '' });
                setSelectedDeviceId(null); setSelectedReagentId(null); setReagentQuantity(1);
                setCurrentTestResultId(null);
                setRefreshFlag('appointments');
                dispatchRefreshEvent('appointments', 'updated', { appointmentId: appointmentIdPayload });
                
                // Dispatch event to notify MyResults to refresh
                setRefreshFlag('results');
                dispatchRefreshEvent('testResults', 'created', { appointmentId: appointmentIdPayload });
                window.dispatchEvent(new CustomEvent('testResultChanged', {
                  detail: { appointmentId: appointmentIdPayload }
                }));
                
                await loadData(true);
            } else {
                // Map server errors to inline field errors (simplified mapping)
                const serverErrorHandled = postRes && postRes.data && postRes.data.errors && Array.isArray(postRes.data.errors) && postRes.data.errors.some(e => e.testId);
                if (serverErrorHandled) {
                    const mappedErrors = (postRes.data.errors || []).reduce((acc, e) => {
                        if (e.testId) acc[String(e.testId)] = e.message || 'Giá trị không hợp lệ';
                        return acc;
                    }, {});
                    setResultErrors(prev => ({ ...prev, ...mappedErrors }));
                    showError('Có lỗi dữ liệu từ hệ thống. Vui lòng kiểm tra các trường đã đánh dấu.');
                } else {
                    showError('Lỗi khi lưu kết quả: ' + (postRes?.message || 'Không xác định'));
                }
            }
        } catch (e) {
            /* handleSaveResults error */
            showError('Lỗi khi lưu kết quả');
        } finally {
            setResultsLoading(false);
        }
    };
    
    // Render the test results form table
    const renderTestForm = () => {
        if (!selectedSample) return null;
        const allCriteria = (resultsForm && Array.isArray(resultsForm.tests)) ? resultsForm.tests.map(t => ({
            key: t.id,
            label: t.name,
            unit: t.unit,
            reference: t.refRange || t.refRange || t.ref || '',
            min: t.refMin !== undefined ? t.refMin : (t.refMin || null),
            max: t.refMax !== undefined ? t.refMax : (t.refMax || null),
            value: t.result || '' ,
            meta: t
        })) : [];

        // filter by search
        const displayCriteria = (resultsSearch && String(resultsSearch).trim() !== '')
            ? allCriteria.filter(c => (String(c.label || '').toLowerCase().includes(String(resultsSearch).toLowerCase()) || String(c.key || '').toLowerCase().includes(String(resultsSearch).toLowerCase())))
            : allCriteria;

        // Resolve package name: prefer sample fields, then cached testPackageCache, then lastPackageRaw
        let pkgName = 'Gói xét nghiệm';
        try {
            if (selectedSample) {
                pkgName = selectedSample.packageName || selectedSample.pkgName || selectedSample.packageCriteria?.name || pkgName;
            }
            const pkgIdForName = selectedSample && (selectedSample.packageId || selectedSample.pkgId || selectedSample.testPackageId);
            if ((!pkgName || pkgName === 'Gói xét nghiệm') && pkgIdForName && testPackageCache && testPackageCache[String(pkgIdForName)]) {
                pkgName = testPackageCache[String(pkgIdForName)];
            }
            if ((!pkgName || pkgName === 'Gói xét nghiệm') && lastPackageRaw && (lastPackageRaw.name || lastPackageRaw.packageName || lastPackageRaw.title)) {
                pkgName = lastPackageRaw.name || lastPackageRaw.packageName || lastPackageRaw.title;
            }
        } catch (e) { /* ignore */ }
        
        if (!displayCriteria || displayCriteria.length === 0) {
            if (resultsLoading || criteriaAutoRetryCount < CRITERIA_AUTO_RETRY_MAX) {
                return (
                    <div className="text-center my-4">
                        <Spinner animation="border" role="status" />
                        <div className="mt-2 small text-muted">Đang tải tiêu chí gói... Vui lòng chờ.</div>
                        <div className="small text-muted">Đã thử {criteriaAutoRetryCount}/{CRITERIA_AUTO_RETRY_MAX} lần.</div>
                    </div>
                );
            }
            return (
                <Alert variant="warning">
                    <FaExclamationTriangle className="me-2" />
                    Không tìm thấy thông tin gói xét nghiệm hoặc chỉ số xét nghiệm nào.
                </Alert>
            );
        }
        
        return (
            <Card className="border-0 shadow-sm">
                <Card.Header className="bg-primary text-white">
                    <div>
                        <h5 className="mb-0"><FaFlask className="me-2" />{pkgName}</h5>
                        <small className="text-white-50">Tổng cộng: {allCriteria.length} tiêu chí</small>
                    </div>
                </Card.Header>
                <Card.Body className="p-2 p-md-3">
                    
                    <div className="table-responsive">
                        <Table striped bordered hover size="sm" className="mb-0">
                            <thead>
                                <tr className="table-secondary">
                                    <th style={{width: '40%'}}>Tên</th>
                                    <th style={{width: '30%'}}>Kết quả</th>
                                    <th style={{width: '30%'}}>Đơn vị / Giới hạn nhập liệu</th>
                                </tr>
                            </thead>
                            <tbody>
                                {displayCriteria.map((item, index) => {
                                    const fieldKey = item.key;
                                    const hasError = !!(resultErrors && resultErrors[fieldKey]);
                                    const hasWarning = !!(resultWarnings && resultWarnings[fieldKey]);
                                    // Prefer explicit criteriaName fields from meta.raw when available
                                    const meta = item.meta || {};
                                    const raw = meta.raw || meta;
                                    const label = raw?.criteriaName || raw?.criteria_name || raw?.name || item.label || `Test ${String(item.key).slice(0,6)}`;
                                    const code = raw?.criteriaId || raw?.criteria_id || raw?.criteriaCode || raw?.criteria_code || item.key || 'N/A';
                                    const isEmpty = !item.value || String(item.value).trim() === '';

                                    return (
                                        <tr key={item.key || index} className={hasError ? 'table-danger' : (hasWarning ? 'table-warning' : '')}>
                                            <td className="align-top">
                                                <div className="d-flex align-items-center">
                                                    <div className="fw-bold">{label}</div>
                                                    {isEmpty && <Badge bg="danger" className="ms-2" style={{fontSize: '0.65rem'}}>Bắt buộc</Badge>}
                                                </div>
                                                <div className="text-muted small fst-italic">Mã: {code}</div>
                                            </td>
                                            <td className="align-top">
                                                <Form.Group>
                                                    <Form.Control
                                                        id={makeFieldIdLocal('default', fieldKey)}
                                                        type="text"
                                                        size="sm"
                                                        step="0.01"
                                                        value={item.value || ''}
                                                        onChange={(e) => { handleChangeResult(fieldKey, e.target.value); }}
                                                        onBlur={() => validateField(fieldKey, item.value, item.meta)}
                                                        isInvalid={hasError}
                                                        placeholder="⚠️ Bắt buộc nhập"
                                                        required
                                                    />
                                                    {hasError && <Form.Control.Feedback type="invalid" className="d-block mt-1">{resultErrors[fieldKey]}</Form.Control.Feedback>}
                                                    {hasWarning && <div className="text-warning small mt-1">{resultWarnings[fieldKey]}</div>}
                                                </Form.Group>
                                            </td>
                                            <td className="align-top">
                                                <div className="small fw-semibold">{item.unit || 'N/A'}</div>
                                                {(item.min !== null || item.max !== null) ? (
                                                    <div className="text-muted small mt-1">{(item.min !== null || item.max !== null) ? `${item.min ?? '-'} - ${item.max ?? '-'}` : (item.reference || 'N/A')}</div>
                                                ) : (
                                                    <div className="text-muted small mt-1">{item.reference || 'N/A'}</div>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </Table>
                    </div>
                </Card.Body>
            </Card>
        );
    };

    // --- Các hàm xử lý (handleCheckIn, handleTakeSample, etc.) ---
    
    /**
     * Handles patient check-in for an appointment
     * 
     * This function processes the check-in workflow for a patient appointment:
     * 1. Validates appointment status (must be 'scheduled' or 'confirmed')
     * 2. Calls API to check in the appointment
     * 3. Automatically creates a sample record for the appointment
     * 4. Determines storage location from lab assignment
     * 5. Dispatches refresh events and reloads data
     * 
     * **Sample creation:**
     * - Automatically creates sample on successful check-in
     * - Uses lab user ID from profile
     * - Sets storage location from lab assignment if available
     * 
     * @param {string|number} appointmentId - Appointment ID to check in
     * @returns {Promise<void>} Does not return a value. Updates backend and shows notifications.
     * 
     * @example
     * // Check in a patient appointment
     * await handleCheckIn('APT-123');
     */
    const handleCheckIn = async (appointmentId) => {
        try {
            const appointment = appointments.find(apt => apt.id === appointmentId);
            if (!appointment || !['scheduled', 'confirmed'].includes(appointment.status)) {
                showError('Không thể check-in. Vui lòng kiểm tra trạng thái.');
                return;
            }
            const response = await appointmentService.checkInAppointment(appointmentId);
            
            if (response.success) {
                try {
                    const aptObj = appointment || response.data || {}; 
                    const canonicalLabUserIdForCreate = labUserProfile?.userId || labUserProfile?.labUserId || labUserProfile?.lab_user_id || labUserProfile?.id || user?.id || null;
                    let storageLocationForCreate = null;
                    try {
                        const assignmentId = getAssignmentIdFromAppointment(aptObj);
                        if (assignmentId && Array.isArray(labAssignments) && labAssignments.length > 0) {
                            const found = labAssignments.find(l => normalizeId(l.id ?? l.assignmentId) === normalizeId(assignmentId));
                            if (found) {
                                storageLocationForCreate = found.roomId || found.room_id || null;
                                if (storageLocationForCreate && !isIdLike(storageLocationForCreate)) storageLocationForCreate = null;
                            }
                        }
                    } catch (e) { /* ignore */ }
                    const createSampleRes = await sampleService.createSampleOnCheckIn(aptObj, { labUserId: canonicalLabUserIdForCreate, storageLocation: storageLocationForCreate });
                    if (createSampleRes && createSampleRes.success && createSampleRes.data) {
                        showSuccess('✅ Check-in thành công và mẫu xét nghiệm đã được tạo.');
                    } else {
                        showSuccess('✅ Check-in thành công! Hệ thống sẽ cố gắng tạo mẫu.');
                    }
                } catch (errCreate) {
                    /* Lỗi khi tạo mẫu sau check-in */
                    showSuccess('✅ Check-in thành công! (Không thể tạo mẫu tự động)');
                }

                setRefreshFlag('appointments');
                dispatchRefreshEvent('appointments', 'updated', { appointmentId: selectedAppointment?.id });
                await loadData(true);
            } else {
                showError(response.message || 'Lỗi check-in');
            }
        } catch (error) {
            /* Error checking in */
            showError('Lỗi khi check-in bệnh nhân');
        }
    };

    /**
     * Handles opening the sample collection modal
     * 
     * This function prepares the sample collection workflow:
     * 1. Finds or creates a sample for the appointment
     * 2. Normalizes sample data (type, volume, barcode, etc.)
     * 3. Opens the sample collection modal with prepared data
     * 4. Resets barcode verification state
     * 
     * **Sample lookup:**
     * - Checks sampleMapByAppointmentId first
     * - Fetches from API if not found
     * - Creates new sample if none exists
     * 
     * @param {string|number} appointmentId - Appointment ID to take sample for
     * @returns {Promise<void>} Does not return a value. Opens modal and updates state.
     * 
     * @example
     * // Open sample collection modal
     * await handleTakeSample('APT-123');
     */
    const handleTakeSample = async (appointmentId) => {
        try {
            const appointment = appointments.find(apt => apt.id === appointmentId);
            if (!appointment) { showError('Không tìm thấy lịch hẹn'); return; }
            
            let existingSample = sampleMapByAppointmentId[appointmentId];
            let samplesResult;

            if (!existingSample) {
                samplesResult = await sampleService.getSamplesByAppointment(appointmentId);
                if (samplesResult.success && samplesResult.data && samplesResult.data.length > 0) {
                    existingSample = samplesResult.data.find(s => s.status === 'pending_collection') || samplesResult.data[0];
                }
            }

            if (!existingSample) {
                const canonicalLabUserIdForCreate = labUserProfile?.userId || labUserProfile?.labUserId || labUserProfile?.lab_user_id || labUserProfile?.id || user?.id || null;
                const createRes = await sampleService.createSampleOnCheckIn(appointment, { labUserId: canonicalLabUserIdForCreate });
                if (createRes && createRes.success && createRes.data) {
                    try {
                        setRefreshFlag('appointments');
                dispatchRefreshEvent('appointments', 'updated', { appointmentId: selectedAppointment?.id });
                await loadData(true);
                        existingSample = sampleMapByAppointmentId[appointmentId] || createRes.data;
                    } catch (e) {
                        existingSample = createRes.data;
                    }
                } else {
                    showError('Không tìm thấy mẫu xét nghiệm. Vui lòng đảm bảo bệnh nhân đã check-in.');
                    return;
                }
            }
            
            const normalizedSample = {
                id: existingSample.id || existingSample.sample_id || existingSample.sampleId,
                sampleType: existingSample.sample_type || existingSample.sampleType || 'blood', // Default to 'blood' if missing
                volume: existingSample.volume || 5,
                notes: existingSample.notes || '',
                barcode: existingSample.barcode || String(existingSample.id || existingSample.sample_id || existingSample.sampleId),
                status: existingSample.status
            };
            
            setSelectedAppointment(appointment);
            
            setSampleData({
                sampleType: normalizedSample.sampleType,
                volume: normalizedSample.volume,
                notes: translateToVietnamese(normalizedSample.notes),
                collectedBy: labUserProfile?.userId || labUserProfile?.labUserId || labUserProfile?.lab_user_id || labUserProfile?.id || user?.id || user?.name || 'Lab User',
                existingSampleId: normalizedSample.id ? String(normalizedSample.id) : null,
                existingBarcode: normalizedSample.barcode
            });
            
            setBarcodeVerified(false);
            setShowSampleModal(true);
            
            showSuccess('✅ Đã tải thông tin mẫu xét nghiệm. Vui lòng xác nhận lấy mẫu.');
        } catch (error) {
            /* Error in handleTakeSample */
            showError('Lỗi khi tải thông tin mẫu xét nghiệm');
        }
    };

    /**
     * Submits sample collection data
     * 
     * This function saves the collected sample information:
     * 1. Validates required fields (appointment, sample ID, volume)
     * 2. Validates barcode verification
     * 3. Updates sample record with collection data
     * 4. Updates sample status to 'sample_collected'
     * 5. Updates appointment status accordingly
     * 6. Dispatches refresh events and reloads data
     * 
     * **Validation:**
     * - Requires barcode verification before submission
     * - Validates sample volume and other required fields
     * 
     * @returns {Promise<void>} Does not return a value. Updates backend and shows notifications.
     * 
     * @example
     * // Submit collected sample data
     * await handleSampleSubmit();
     */
    const handleSampleSubmit = async () => {
        if (!selectedAppointment || !sampleData.existingSampleId || !sampleData.volume) {
            showError('Thông tin không hợp lệ. Vui lòng thử lại.');
            return;
        }

        if (!barcodeVerified) {
            showError('Vui lòng quét mã vạch để xác nhận trước khi lấy mẫu!');
            setShowBarcodeScanModal(true);
            return;
        }

        try {
            const canonicalLabUserId = labUserProfile?.userId || labUserProfile?.labUserId || labUserProfile?.lab_user_id || labUserProfile?.id || user?.id || user?.name || sampleData.collectedBy || null;

            // Chỉ gửi các field mà backend BloodSampleUpdateDto chấp nhận
            // BloodSampleUpdateDto: SampleType, CollectedAt, CollectedBy, Volume, Status, StorageLocation, Notes, LabUserId
            const updateData = {
                sampleType: sampleData.sampleType, // Sẽ được map thành SampleType trong updateSample
                volume: Number(sampleData.volume),
                status: 'collected',
                collectedAt: new Date().toISOString(), // Sẽ được map thành CollectedAt
                collectedBy: canonicalLabUserId, // Sẽ được map thành CollectedBy
                labUserId: canonicalLabUserId, // Sẽ được map thành LabUserId
                notes: sampleData.notes || ''
                // Không gửi barcode và updated_at vì không có trong DTO
            };
            
            // Gọi updateSample với timeout handling tốt hơn
            const result = await Promise.race([
                sampleService.updateSample(sampleData.existingSampleId, updateData),
                new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Timeout khi cập nhật mẫu. Vui lòng thử lại.')), 25000)
                )
            ]).catch(async (error) => {
                // Nếu timeout, thử lại với payload tối giản
                if (error.message.includes('Timeout') || error.message.includes('timeout')) {
                    try {
                        // Thử lại với payload tối giản (chỉ các field bắt buộc)
                        const minimalUpdateData = {
                            status: 'collected',
                            collected_at: new Date().toISOString(),
                            collected_by: canonicalLabUserId,
                            volume: Number(sampleData.volume),
                            barcode: sampleData.existingBarcode
                        };
                        return await sampleService.updateSample(sampleData.existingSampleId, minimalUpdateData);
                    } catch (retryError) {
                        return { success: false, message: 'Lỗi cập nhật mẫu máu: timeout của 30000ms exceeded' };
                    }
                }
                throw error;
            });
            
            if (result.success) {
                await appointmentService.updateAppointmentStatus(selectedAppointment.id, 'sample_collected');
                
                setShowSampleModal(false);
                setSelectedAppointment(null);
                setBarcodeVerified(false);
                setSampleData({
                    sampleType: '', volume: 5, notes: '', collectedBy: null,
                    existingSampleId: null, existingBarcode: null
                });
                
                showSuccess(`✅ Xác nhận lấy mẫu thành công! Mã vạch: ${sampleData.existingBarcode}`);
                setRefreshFlag('appointments');
                dispatchRefreshEvent('appointments', 'updated', { appointmentId: selectedAppointment?.id });
                await loadData(true);
                
                // Navigate to Sample Management page to allow immediate result entry/processing
                setTimeout(() => { 
                    navigate('/lab-user/sample-management', { 
                        state: { 
                            sampleId: sampleData.existingSampleId,
                            appointments: filteredAppointments,
                            selectedDate: selectedDate
                        } 
                    });
                }, 1000);
            } else {
                showError('Lỗi khi cập nhật mẫu: ' + (result.message || 'Unknown error'));
            }
        } catch (error) {
            /* Error in handleSampleSubmit */
            showError('Lỗi khi xác nhận lấy mẫu: ' + (error.message || 'Unknown error'));
        }
    };

    /**
     * Opens the appointment edit modal
     * 
     * This function opens the edit modal for an appointment with pre-filled data.
     * It finds the appointment, translates notes to Vietnamese, and sets up
     * the edit form state.
     * 
     * @param {string|number} appointmentId - Appointment ID to edit
     * @returns {void} Does not return a value. Opens modal and updates state.
     * 
     * @example
     * // Open edit modal for an appointment
     * handleEdit('APT-123');
     */
    const handleEdit = (appointmentId) => {
        try {
            const apt = appointments.find(a => String(a.id) === String(appointmentId));
            if (!apt) { showError('Không tìm thấy lịch hẹn để sửa.'); return; }
            setEditLoading(false);
            setEditForm({ ...apt, notes: translateToVietnamese(apt.notes) });
            setShowEditModal(true);
        } catch (e) {
            /* handleEdit error */
            showError('Lỗi khi mở form chỉnh sửa');
        }
    };

    /**
     * Saves appointment edit changes
     * 
     * This function saves changes made to an appointment in the edit modal.
     * It updates the appointment status and notes, then refreshes the data.
     * 
     * @returns {Promise<void>} Does not return a value. Updates backend and shows notifications.
     * 
     * @example
     * // Save appointment changes
     * await handleSaveEdit();
     */
    const handleSaveEdit = async () => {
        if (!editForm || !editForm.id) { showError('Không có dữ liệu để lưu.'); return; }
        try {
            setSavingEdit(true);
            const payload = {
                status: editForm.status,
                notes: editForm.notes
            };
            const res = await appointmentService.updateAppointment(editForm.id, payload).catch(err => ({ success: false, message: err?.message || 'Lỗi' }));
            if (res && res.success) {
                showSuccess('Lưu thay đổi thành công');
                setShowEditModal(false);
                setEditForm(null);
                setRefreshFlag('appointments');
                dispatchRefreshEvent('appointments', 'updated', { appointmentId: editForm.id });
                await loadData(true);
            } else {
                showError('Lỗi khi lưu thay đổi: ' + (res?.message || 'Không xác định'));
            }
        } catch (e) {
            /* handleSaveEdit error */
            showError('Lỗi khi lưu thay đổi');
        } finally {
            setSavingEdit(false);
        }
    };
    
    /**
     * Opens the sample edit modal
     * 
     * This function opens the edit modal for a sample with pre-filled data.
     * It fetches full sample details from the API, resolves patient information,
     * and sets up the edit form state.
     * 
     * @param {Object} sample - Sample object to edit
     * @returns {Promise<void>} Does not return a value. Opens modal and updates state.
     * 
     * @example
     * // Open edit modal for a sample
     * await handleOpenSampleEdit(sample);
     */
    const handleOpenSampleEdit = async (sample) => {
        try {
            const sid = sample.id || sample.sample_id || sample.sampleId || null;
            if (!sid) { showError('Không xác định ID mẫu'); return; }
            setSampleEditLoading(true);
            setShowSampleEditModal(true);

            // Try to fetch full sample details from the API
            let fetched = null;
            try {
                const res = await sampleService.getSampleById(sid).catch(() => null);
                if (res && (res.data || res.success)) {
                    // support both { success, data } and direct data shapes
                    fetched = res.data || (res.success && res) || null;
                }
            } catch (e) {
                /* sampleService.getSampleById failed */
                fetched = null;
            }

            const base = fetched || sample || {};
            // Resolve patient info if available
            let patientInfo = { name: '', email: '', phone: '', dob: '', gender: '' };
            try {
                const aptId = base.appointmentId || base.appointment_id || base.appointmentId;
                const apt = appointments.find(a => String(a.id) === String(aptId)) || null;
                const pid = base.patientId || base.patient_id || (apt && (apt.patientId || apt.patient_id));
                const pat = (pid && patientMap && patientMap[pid]) ? patientMap[pid] : (apt ? (patientMap && patientMap[apt.patientId]) : null);
                if (pat) {
                    patientInfo = {
                        name: pat.fullName || pat.full_name || pat.name || pat.patientName || getPatientName(pid) || '',
                        email: pat.email || pat.contactEmail || pat.patientEmail || '',
                        phone: pat.phone || pat.phoneNumber || pat.mobile || '',
                        dob: pat.dateOfBirth || pat.dob || pat.patientDob || '',
                        gender: pat.gender || pat.sex || ''
                    };
                }
            } catch (e) { /* ignore */ }

            setSampleEditForm({
                id: sid,
                sampleType: base.sampleType || base.type || base.sample_type || 'blood',
                volume: base.volume || base.ml || base.sampleVolume || 5,
                notes: translateToVietnamese(base.notes || base.note || ''),
                barcode: base.barcode || base.code || '',
                status: base.status || base.state || 'pending',
                collectedAt: base.collectedAt || base.collected_at || base.createdAt || base.created_at || '',
                createdAt: base.createdAt || base.created_at || '',
                patientName: patientInfo.name,
                patientEmail: patientInfo.email,
                patientPhone: patientInfo.phone,
                patientDob: patientInfo.dob
            });
            // clear previous validation errors when opening
            setSampleEditErrors({});
        } catch (e) {
            /* handleOpenSampleEdit error */
            showError('Lỗi khi mở form sửa mẫu');
            setShowSampleEditModal(false);
            setSampleEditForm(null);
        } finally {
            setSampleEditLoading(false);
        }
    };

    /**
     * Initiates sample completion workflow
     * 
     * This function opens a confirmation modal before completing a sample.
     * It stores the sample ID and shows the confirmation dialog.
     * 
     * @param {string|number} sampleId - Sample ID to complete
     * @returns {Promise<void>} Does not return a value. Opens confirmation modal.
     * 
     * @example
     * // Start completion process for a sample
     * await handleCompleteSample('SAMPLE-123');
     */
    const handleCompleteSample = async (sampleId) => {
        if (!sampleId) {
            showError('Không có ID mẫu để hoàn tất.');
            return;
        }
        // Store sampleId and show confirmation modal
        setCompleteSampleId(sampleId);
        setShowCompleteSampleModal(true);
    };

    const confirmCompleteSample = async () => {
        if (!completeSampleId) return;
        try {
            setShowCompleteSampleModal(false);
            
            // Cập nhật status mẫu thành completed
            await sampleService.updateSampleStatus(completeSampleId, 'completed');
            
            showSuccess('✅ Đã hoàn tất xét nghiệm thành công!');
            
            // Reload data để cập nhật UI
            loadData();
        } catch (error) {
            showError('Lỗi khi hoàn tất xét nghiệm: ' + (error.message || 'Unknown error'));
        } finally {
            setCompleteSampleId(null);
        }
    };

    /**
     * Saves sample edit changes
     * 
     * This function saves changes made to a sample in the edit modal. It performs:
     * 1. Client-side validation (sampleType, volume)
     * 2. Prepares payload with sample data
     * 3. Updates sample via API
     * 4. Maps server-side validation errors to form fields
     * 5. Refreshes data and dispatches events
     * 
     * **Validation:**
     * - Sample type is required
     * - Volume must be a positive number
     * 
     * @returns {Promise<void>} Does not return a value. Updates backend and shows notifications.
     * 
     * @example
     * // Save sample changes
     * await handleSaveSampleEdit();
     */
    const handleSaveSampleEdit = async () => {
        if (!sampleEditForm || !sampleEditForm.id) { showError('Không có dữ liệu mẫu để lưu.'); return; }
        try {
            // Client-side validation
            const errors = {};
            if (!sampleEditForm.sampleType || String(sampleEditForm.sampleType).trim() === '') errors.sampleType = 'Vui lòng chọn loại mẫu';
            const vol = Number(sampleEditForm.volume);
            if (Number.isNaN(vol) || vol <= 0) errors.volume = 'Thể tích phải lớn hơn 0';
            if (Object.keys(errors).length > 0) { setSampleEditErrors(errors); return; }

            setSavingSampleEdit(true);
            setSampleEditErrors({});

            const payload = {
                sample_type: sampleEditForm.sampleType,
                volume: sampleEditForm.volume ? Number(sampleEditForm.volume) : null,
                notes: sampleEditForm.notes || '',
                barcode: sampleEditForm.barcode || null,
                status: sampleEditForm.status || null,
                collected_at: sampleEditForm.collectedAt || null,
                updated_at: new Date().toISOString()
            };

            const res = await sampleService.updateSample(sampleEditForm.id, payload).catch(err => ({ success: false, message: err?.message || 'Lỗi', data: err?.response?.data || null }));
            if (res && res.success) {
                showSuccess('Lưu thay đổi mẫu thành công');
                setShowSampleEditModal(false);
                setSampleEditForm(null);
                setRefreshFlag('appointments');
                dispatchRefreshEvent('appointments', 'updated', { sampleId: sampleEditForm.id });
                await loadData(true);
            } else {
                // Try to map server-side validation errors into form fields
                const fieldErrors = {};
                const data = res && (res.data || res) ? (res.data || res) : null;
                try {
                    if (data) {
                        // common shapes: { errors: { field: 'msg' } } or { errors: [{ field, message }] } or { fieldErrors: { field: 'msg' } }
                        if (data.errors) {
                            if (Array.isArray(data.errors)) {
                                data.errors.forEach(it => {
                                    if (it && it.field) fieldErrors[it.field] = it.message || it.msg || String(it).slice(0,200);
                                });
                            } else if (typeof data.errors === 'object') {
                                Object.keys(data.errors).forEach(k => {
                                    fieldErrors[k] = Array.isArray(data.errors[k]) ? String(data.errors[k][0]) : String(data.errors[k]);
                                });
                            }
                        }
                        if (data.fieldErrors && typeof data.fieldErrors === 'object') {
                            Object.keys(data.fieldErrors).forEach(k => { fieldErrors[k] = String(data.fieldErrors[k]); });
                        }
                        // Some APIs return validation in data.validation or data.detail
                        if (data.validation && typeof data.validation === 'object') {
                            Object.keys(data.validation).forEach(k => { fieldErrors[k] = String(data.validation[k]); });
                        }
                        // fallback: single message
                        if (Object.keys(fieldErrors).length === 0 && (data.message || data.msg || res.message)) {
                            showError('Lỗi khi lưu mẫu: ' + (data.message || data.msg || res.message || 'Không xác định'));
                        }
                    } else {
                        showError('Lỗi khi lưu mẫu: ' + (res?.message || 'Không xác định'));
                    }
                } catch (ee) {
                    /* Error parsing server validation errors */
                }

                if (Object.keys(fieldErrors).length > 0) {
                    // Normalize server-side field names to local form keys
                    const normalized = {};
                    Object.keys(fieldErrors).forEach(k => {
                        const v = String(fieldErrors[k] || '');
                        const key = String(k || '').toLowerCase();
                        if (key === 'sample_type' || key.includes('sample') && key.includes('type')) normalized.sampleType = v;
                        else if (key === 'volume' || key.includes('vol')) normalized.volume = v;
                        else if (key === 'barcode' || key.includes('code')) normalized.barcode = v;
                        else if (key === 'note' || key === 'notes' || key.includes('note')) normalized.notes = v;
                        else if (key === 'status') normalized.status = v;
                        else normalized[k] = v;
                    });
                    setSampleEditErrors(normalized);
                    // focus first invalid field if possible
                    setTimeout(() => {
                        const firstKey = Object.keys(normalized)[0];
                        const selectorMap = {
                            sampleType: '[name="sampleType"]',
                            volume: '[name="volume"]',
                            barcode: '[name="barcode"]',
                            notes: '[name="notes"]',
                            status: '[name="status"]'
                        };
                        const sel = selectorMap[firstKey] || null;
                        const el = sel ? document.querySelector(sel) : document.querySelector('.is-invalid');
                        if (el && typeof el.focus === 'function') el.focus();
                    }, 80);
                }
            }
        } catch (e) {
            /* handleSaveSampleEdit error */
            showError('Lỗi khi lưu mẫu');
        } finally {
            setSavingSampleEdit(false);
        }
    };
    
    /**
     * Opens appointment detail modal
     * 
     * This function opens the detail modal for an appointment. It finds
     * the appointment, fetches test package information, and stores the
     * selected appointment ID in localStorage.
     * 
     * @param {string|number} appointmentId - Appointment ID to view details for
     * @returns {void} Does not return a value. Opens modal and updates state.
     * 
     * @example
     * // View appointment details
     * handleViewDetail('APT-123');
     */
    const handleViewDetail = (appointmentId) => {
        const appointment = appointments.find(apt => apt.id === appointmentId);
        if (appointment) {
            setSelectedAppointment(appointment);
            fetchTestPackageForAppointment(appointment).catch(() => {});
            setShowDetailModal(true);
            try { localStorage.setItem('lab_selected_appointment', String(appointmentId)); } catch (e) {}
        }
    };
    
    /**
     * Opens sample detail modal with test results
     * 
     * This function opens a detailed view modal for a sample. It performs:
     * 1. Fetches or finds sample object
     * 2. Normalizes sample data
     * 3. Fetches test package criteria
     * 4. Loads existing test results and maps parameter values
     * 5. Fetches package details
     * 6. Resolves patient information
     * 7. Opens modal with enriched data
     * 
     * **Data enrichment:**
     * - Maps test results to criteria
     * - Resolves patient information from appointment
     * - Fetches package details for display
     * 
     * @param {Object|string|number} sampleOrId - Sample object or sample ID
     * @returns {Promise<void>} Does not return a value. Opens modal and updates state.
     * 
     * @example
     * // View sample details
     * await handleViewSampleDetail('SAMPLE-123');
     * await handleViewSampleDetail({ id: 'SAMPLE-123', ... });
     */
    const handleViewSampleDetail = async (sampleOrId) => {
        try {
            let sampleId = null;
            if (typeof sampleOrId === 'object') sampleId = sampleOrId.id || sampleOrId.sampleId || sampleOrId.sample_id;
            else sampleId = sampleOrId;
            if (!sampleId) return;
            setSampleDetailData(null);
            
            // fetch sample object
            let rawSample = samples.find(s => String(s.id) === String(sampleId) || String(s.sampleId) === String(sampleId)) || null;
            if (!rawSample) {
                 const sres = await sampleService.getSampleById(sampleId).catch(() => null);
                 rawSample = sres && sres.data ? sres.data : (sres || null);
            }
            if (!rawSample) { showError('Không tìm thấy mẫu xét nghiệm'); return; }

            const normalizeSample = (s) => {
                if (!s) return null;
                const id = s.id || s.sample_id || s.sampleId || s.barcode || null;
                const appointmentId = s.appointmentId || s.appointment_id || (s.appointment && (s.appointment.id || s.appointment._id)) || null;
                const patientId = s.patientId || s.patient_id || (s.appointment && (s.appointment.patientId || s.appointment.patient_id)) || null;
                const barcode = s.barcode || s.code || (s.id ? String(s.id) : '') || null;
                const status = s.status || s.state || s.sampleStatus || null;
                const sampleType = s.sampleType || s.sample_type || s.type || null;
                const volume = s.volume || s.sampleVolume || s.volumeMl || 5;
                const collectedAt = s.collectedAt || s.collected_at || s.createdAt || s.created_at || null;
                const notes = s.notes || s.note || s.description || null;
                const collectedBy = s.collectedBy || s.collected_by || s.collectedById || null;
                return { ...s, id, appointmentId, patientId, barcode, status, sampleType, volume, collectedAt, notes, collectedBy };
            };
            const sampleObj = normalizeSample(rawSample);

            // fetch tests (then normalize)
            const rawTests = await fetchPackageCriteriaForSelectedSample(sampleObj.packageId || getTestPackageIdFromAppointment(appointments.find(a => String(a.id) === String(sampleObj.appointmentId))));
            let tests = (Array.isArray(rawTests) ? rawTests : []).map((t) => {
                const id = t.id || t.testId || t.criteriaId || t.CriterionId || null;
                const name = t.name || t.testName || t.displayName || t.ParamName || t.Param || `Test ${String(id || '').slice(0,6)}`;
                const result = (t.result !== undefined && t.result !== null) ? t.result : (t.value !== undefined ? t.value : '');
                const unit = t.unit || t.units || t.Unit || t.uom || '';
                const refRange = t.refRange || t.referenceRange || t.Reference || t.ref || t.normalRange || '';
                let refMin = t.refMin ?? null, refMax = t.refMax ?? null;
                return { id, name, result, unit, refRange, refMin, refMax, raw: t };
            });

            // Try to load existing test_result for this appointment/sample and map parameter values
            try {
                const appointmentIdForSample = sampleObj.appointmentId || sampleObj.appointment_id || null;
                if (appointmentIdForSample && typeof testOrderService.getResultsByAppointment === 'function') {
                    const res = await testOrderService.getResultsByAppointment(appointmentIdForSample).catch(() => ({ success: false, data: [] }));
                    if (res && res.success && Array.isArray(res.data) && res.data.length > 0) {
                        const found = res.data.find(r => String(r.sampleId || r.SampleId || r.sample_id || r.sample) === String(sampleId)) || res.data[0];
                        const foundTestResultId = found.testResultId || found.test_result_id || found.id || null;
                        if (foundTestResultId && typeof testOrderService.getTestParametersByResultId === 'function') {
                            const pRes = await testOrderService.getTestParametersByResultId(foundTestResultId).catch(() => ({ success: false, data: [] }));
                            const params = (pRes && pRes.success && Array.isArray(pRes.data)) ? pRes.data : [];
                            try { /* params loaded */ } catch (e) {}
                            if (params && params.length > 0) {
                                tests = (tests || []).map(t => {
                                    try {
                                        const match = params.find(p => {
                                            const pidCandidates = [p.criteria_id, p.criteriaId, p.CriterionId, p.CriteriaId, p.criterionId, p.testCriterionId, p.TestCriterionId, p.id, p.param_id, p.paramId];
                                            const pnameCandidates = [p.param_name, p.paramName, p.ParamName, p.Param, p.name, p.param_name];
                                            for (const pc of pidCandidates) {
                                                if (pc !== undefined && pc !== null && normalizeId(pc) === normalizeId(t.id)) return true;
                                            }
                                            for (const pn of pnameCandidates) {
                                                if (pn !== undefined && pn !== null && normalizeId(pn) === normalizeId(t.name)) return true;
                                            }
                                            try {
                                                const pidRaw = String(pidCandidates.find(Boolean) || '');
                                                const digits = (pidRaw.match(/\d+/) || [''])[0];
                                                const tidDigits = (String(t.id || '').match(/\d+/) || [''])[0];
                                                if (digits && tidDigits && String(digits) === String(tidDigits)) return true;
                                            } catch (e) {}
                                            const abbr = p.abbreviation || p.Abbreviation || p.abbr || p.ABBR || p.param_abbreviation;
                                            if (abbr && normalizeId(abbr) === normalizeId(t.name)) return true;
                                            return false;
                                        });
                                        if (match) {
                                            const val = match.value ?? match.Value ?? match.Result ?? match.ValueString ?? match.ValueNumber ?? match.result ?? match.val ?? match.Val ?? match.Value ?? match.value_number ?? null;
                                            const out = (val !== undefined && val !== null) ? String(val) : '';
                                            return { ...t, result: out, raw: { ...t.raw, paramRaw: match } };
                                        }
                                    } catch (e) { /* ignore per-item errors */ }
                                    return t;
                                });
                            }
                        }
                    }
                }
            } catch (e) { /* handleViewSampleDetail parameter mapping failed */ }

            // fetch package details (for name/raw criteria)
            let packageCriteria = null;
            let packageObj = null;
            try {
                 const pkgId = sampleObj.packageId || getTestPackageIdFromAppointment(appointments.find(a => String(a.id) === String(sampleObj.appointmentId)));
                 if (pkgId && typeof testOrderService.getTestPackage === 'function') {
                     const pres = await testOrderService.getTestPackage(pkgId).catch(() => null);
                     packageObj = pres && pres.data ? pres.data : (pres || null);
                     packageCriteria = packageObj; // use package object as criteria source
                 }
            } catch (e) {}

            setSampleDetailData({ sample: sampleObj, tests: tests || [], packageCriteria });
            setShowSampleDetailModal(true);
            try { sessionStorage.setItem('lab_last_sample_id', String(sampleId)); } catch (e) {}
        } catch (e) {
            /* handleViewSampleDetail error */
            showError('Không thể tải chi tiết mẫu');
        }
    };

    /**
     * Fetches test package information for an appointment
     * 
     * This function retrieves test package details for an appointment. It checks
     * the cache first, and if not found, fetches from the API. Caches the package
     * name for future lookups.
     * 
     * **Caching behavior:**
     * - Checks testPackageCache first
     * - Fetches from API if not cached
     * - Caches package name for future use
     * 
     * @param {Object} appointment - Appointment object that may contain test package ID
     * @returns {Promise<Object>} Object with packageObj and packageCriteria, or null values if not found
     * 
     * @example
     * const { packageObj, packageCriteria } = await fetchTestPackageForAppointment(appointment);
     */
    const fetchTestPackageForAppointment = async (appointment) => {
        try {
            const pkgId = getTestPackageIdFromAppointment(appointment);
            if (!pkgId) return { packageObj: null, packageCriteria: null };

            if (testPackageCache && testPackageCache[String(pkgId)]) {
                return { packageObj: { name: testPackageCache[String(pkgId)] }, packageCriteria: null };
            }

            let packageObj = null;
            if (typeof testOrderService.getTestPackage === 'function') {
                const resp = await testOrderService.getTestPackage(pkgId).catch(() => null);
                if (resp && resp.success !== false) packageObj = resp.data || resp;
            }
            let packageCriteria = null;
            if (packageObj && (Array.isArray(packageObj.criteria) || Array.isArray(packageObj.tests))) {
                packageCriteria = packageObj;
            }

            try {
                const name = packageObj && (packageObj.name || packageObj.packageName || packageObj.title || packageObj.package_name) ? (packageObj.name || packageObj.packageName || packageObj.title || packageObj.package_name) : null;
                if (name) setTestPackageCache(prev => ({ ...prev, [String(pkgId)]: name }));
            } catch (e) {}

            return { packageObj, packageCriteria };
        } catch (e) {
            /* fetchTestPackageForAppointment error */
            return { packageObj: null, packageCriteria: null };
        }
    };


    const getAppointmentServiceLabel = (appt) => {
        if (!appt) return 'Xét nghiệm máu';
        if (appt.service) return String(appt.service);
        if (appt.testPackageName) return String(appt.testPackageName);
        const pkgId = appt.testPackageId || appt.packageId || appt.pkgId || appt.servicePackageId || appt.serviceId;
        if (pkgId) {
            const cached = testPackageCache[String(pkgId)];
            if (cached) return String(cached);
            return `Xét nghiệm (gói ${String(pkgId).slice(0,8)})`;
        }
        return 'Xét nghiệm máu';
    };
    
    // Các hàm nhỏ khác (giữ nguyên)
    /**
     * Handles table column sorting
     * 
     * This function manages sorting state for the appointments table. It toggles
     * sort direction if the same field is clicked, or sets a new sort field
     * with ascending direction.
     * 
     * **Sort behavior:**
     * - Same field: Toggle between 'asc' and 'desc'
     * - Different field: Set new field with 'asc' direction
     * 
     * @param {string} field - Field name to sort by
     * @returns {void} Does not return a value. Updates sortField and sortDirection state.
     * 
     * @example
     * // Sort by appointment date
     * handleSort('appointmentDate');
     */
    const handleSort = (field) => {
        if (sortField === field) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDirection('asc');
        }
    };

    const getSortIcon = (field) => {
        if (sortField !== field) return <FaSort className="text-muted" />;
        return sortDirection === 'asc' ? <FaSortUp /> : <FaSortDown />;
    };

    const getStatusStats = () => {
        const labUserRelevantStatuses = ['confirmed', 'checked_in', 'sample_collected', 'sample_processed', 'result_pending', 'waiting_review', 'result_entered'];
        const relevantAppointments = filteredAppointments.filter(apt => labUserRelevantStatuses.includes(apt.status));
        
        const stats = {
            total: relevantAppointments.length,
            daXacNhan: relevantAppointments.filter(apt => apt.status === 'confirmed').length,
            daCheckin: relevantAppointments.filter(apt => apt.status === 'checked_in').length,
            dangLayMau: relevantAppointments.filter(apt => apt.status === 'sample_collected').length
        };
        return stats;
    };

    const getDoctorShiftId = (appointment) => {
        return appointment.doctorShiftId || appointment.DoctorShiftId || 
                           appointment.shiftId || appointment.ShiftId || 
                           appointment.shift?.id || appointment.shift?.doctorShiftId || null;
    };

    const getShiftDate = (shift) => {
        if (!shift) return null;
        const candidates = ['shiftDate', 'ShiftDate', 'date', 'Date', 'shift_date', 'shift_date_time', 'shiftDateTime', 'ShiftDateTime'];
        for (const c of candidates) {
            if (shift[c] !== undefined && shift[c] !== null && String(shift[c]).trim() !== '') return shift[c];
        }
        if (shift.shift && (shift.shift.shiftDate || shift.shift.date)) return shift.shift.shiftDate || shift.shift.date;
        return null;
    };

    const getShiftTime = (shift) => {
        if (!shift) return null;
        const getField = (obj, ...fields) => {
            for (const f of fields) {
                const val = obj[f] || obj[f.charAt(0).toUpperCase() + f.slice(1)] || obj[f.charAt(0).toLowerCase() + f.slice(1)];
                if (val !== undefined && val !== null && String(val).trim() !== '') return val;
            }
            return null;
        };
        const start = getField(shift, 'startTime', 'shiftStart', 'start', 'fromTime');
        const end = getField(shift, 'endTime', 'shiftEnd', 'end', 'toTime');
        if (start && end) return `${formatTime(start)} - ${formatTime(end)}`;
        return formatTime(start || getField(shift, 'time', 'shiftTime', 'appointmentTime'));
    };

    const getDoctorIdFromShift = (shift) => {
        if (!shift) return null;
        try {
            const candidates = ['doctorId','doctor_id','doctor','userId','user_id','assignedDoctorId','assigned_doctor_id','physicianId'];
            for (const k of candidates) {
                const v = shift[k];
                if (v !== undefined && v !== null && String(v).trim() !== '') return v;
            }
            if (shift.doctor && (shift.doctor.id || shift.doctor.doctorId || shift.doctor.userId)) {
                return shift.doctor.id || shift.doctor.doctorId || shift.doctor.userId;
            }
        } catch (e) { }
        return null;
    };

    // Helpers: strip diacritics and normalize status for consistent filtering/search
    const stripDiacritics = (s) => (s || '').normalize ? String(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '') : String(s || '');
    const normalizeStatus = (val) => {
        const raw = String(val || '').trim().toLowerCase();
        if (!raw) return '';
        const ascii = stripDiacritics(raw).replace(/[^a-z0-9\s]/gi, '').trim();
        const map = {
            'da xac nhan': 'confirmed', 'xac nhan': 'confirmed',
            'da diem danh': 'checked_in', 'diem danh': 'checked_in', 'checkin': 'checked_in', 'checked-in': 'checked_in', 'check in': 'checked_in',
            'da lay mau': 'sample_collected', 'lay mau': 'sample_collected', 'sample collected': 'sample_collected',
            'da nhap kq': 'result_entered', 'nhap kq': 'result_entered', 'da nhap ket qua': 'result_entered', 'nhap ket qua': 'result_entered',
            'cho duyet': 'waiting_review', 'cho bac si duyet': 'waiting_review', 'waiting review': 'waiting_review',
            'hoan thanh': 'completed', 'da hoan thanh': 'completed',
            'khong den': 'no_show', 'khong den hen': 'no_show',
            'da huy': 'cancelled', 'huy': 'cancelled'
        };
        if (map[ascii]) return map[ascii];
        return raw.replace(/[\s-]+/g, '_');
    };


    const stats = getStatusStats();

    // Memoized filters for appointments and samples with normalized status and diacritics-free search
    const normalizedSearchKey = (() => {
        const raw = String(inputSearchTerm || '').trim().toLowerCase();
        return stripDiacritics(raw);
    })();

    // Enhanced filtered appointments with instant normalized search
    const mFilteredAppointments = React.useMemo(() => {
        try {
            // Start with the base filtered appointments (without search from old logic)
            // We'll apply our own search here for instant response
            let filtered = Array.isArray(_filteredAppointmentsMemo) ? _filteredAppointmentsMemo : [];
            
            // If there's search input, apply normalized search on top
            if (normalizedSearchKey) {
                filtered = filtered.filter((apt) => {
                    const patientName = stripDiacritics(String(getPatientName(apt.patientId) || apt.patientName || '')).toLowerCase(); 
                    const doctorId = getDoctorIdFromShift(getShiftById(getDoctorShiftId(apt))) || apt.doctorId;
                    const doctorName = stripDiacritics(String(getDoctorName(doctorId) || '')).toLowerCase();
                    const notes = stripDiacritics(String(apt.notes || '')).toLowerCase();
                    const dateStr = stripDiacritics(String(formatDate(apt.appointmentDate || apt.createdAt || '') || '')).toLowerCase();
                    const combinedText = `${patientName} ${doctorName} ${notes} ${dateStr}`;
                    return combinedText.includes(normalizedSearchKey);
                });
            }
            
            return filtered;
        } catch (err) { 
            /* mFilteredAppointments error */
            return Array.isArray(_filteredAppointmentsMemo) ? _filteredAppointmentsMemo : []; 
        }
    }, [_filteredAppointmentsMemo, normalizedSearchKey]);

    const mFilteredSamples = React.useMemo(() => {
        try {
            const list = Array.isArray(samples) ? samples : [];
            // Get appointment IDs from filtered appointments
            const filteredAptIds = new Set(mFilteredAppointments.map(a => String(a.id || a.appointmentId || '')).filter(Boolean));
            return list.filter((s) => {
                const norm = normalizeStatus(s.status || s.state || '');
                // exclude pending_test variants
                if (norm === 'pending_test') return false;
                // Only show samples belonging to filtered appointments
                const aptId = String(s.appointmentId || s.appointment_id || '');
                if (aptId && !filteredAptIds.has(aptId)) return false;
                // if search exists, apply to patient name and sample type
                if (normalizedSearchKey) {
                    const pName = stripDiacritics(String(getPatientNameFromSample(s) || ''));
                    const sType = stripDiacritics(String(formatSampleType(s.sampleType) || ''));
                    const hay = `${pName} ${sType}`.toLowerCase();
                    if (!hay.includes(normalizedSearchKey)) return false;
                }
                return true;
            });
        } catch (_) { return Array.isArray(samples) ? samples : []; }
    }, [samples, inputSearchTerm, mFilteredAppointments]);
    
    if (loading) {
        return (
            <Container fluid className="py-2 px-2" style={{ 
              overflowX: 'hidden', 
              maxWidth: '100%', 
              width: '100%',
              boxSizing: 'border-box'
            }}>
                <div className="text-center">
                    <div className="spinner-border text-primary" role="status">
                        <span className="visually-hidden">Đang tải...</span>
                    </div>
                    <p className="mt-3 text-muted">Đang tải danh sách lịch hẹn...</p>
                </div>
            </Container>
        );
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
                .appointment-stat-card {
                    background: linear-gradient(135deg, #1e40af 0%, #1e3a8a 100%) !important;
                    background-color: #1e40af !important;
                    color: #ffffff !important;
                    border: none !important;
                    border-radius: 12px !important;
                }
                .appointment-stat-card .card-body {
                    color: #ffffff !important;
                    background-color: transparent !important;
                }
                .appointment-stat-card p,
                .appointment-stat-card h4,
                .appointment-stat-card svg {
                    color: #ffffff !important;
                }
            `}</style>
            <Card className="mb-4 border-0 shadow-sm lab-header-card">
                <Card.Body className="p-2 p-md-3">
                    <Row className="align-items-center">
                        <Col>
                            <h2 className="mb-0" style={{ fontSize: 'clamp(1.1rem, 4vw, 1.5rem)' }}>Quản lý xét nghiệm</h2>
                            <p className="mb-0 text-muted small d-none d-md-block">Danh sách lịch hẹn và quản lý mẫu</p>
                        </Col>
                       
                    </Row>
                </Card.Body>
            </Card>
            {error && (
                <Alert variant="danger" dismissible onClose={() => setError('')}>
                    <FaExclamationTriangle className="me-2" />
                    {error}
                </Alert>
            )}
            <Row className="mb-4 g-3">
                <Col xs={6} md={3}>
                    <Card className="border-0 shadow-sm h-100 appointment-stat-card">
                        <Card.Body className="p-3">
                            <div className="d-flex align-items-center justify-content-between">
                                <div className="flex-grow-1">
                                    <div className="d-flex align-items-center mb-2">
                                        <FaCalendarAlt className="me-2" style={{ fontSize: '1rem', opacity: 0.9 }} />
                                        <p className="mb-0" style={{ fontSize: '0.75rem', fontWeight: '500' }}>Tổng lịch hẹn</p>
                                    </div>
                                    <h4 className="mb-0" style={{ fontSize: 'clamp(1.25rem, 4vw, 1.75rem)', fontWeight: '700' }}>{mFilteredAppointments.length}</h4>
                                </div>
                                <div style={{width: 'clamp(40px, 8vw, 50px)', height: 'clamp(40px, 8vw, 50px)', borderRadius: '12px', background: 'rgba(255, 255, 255, 0.15)'}} className="d-none d-sm-flex align-items-center justify-content-center ms-2"><FaCalendarAlt style={{ fontSize: 'clamp(1rem, 3vw, 1.5rem)' }} /></div>
                            </div>
                        </Card.Body>
                    </Card>
                </Col>
                <Col xs={6} md={3}>
                    <Card className="border-0 shadow-sm h-100 appointment-stat-card">
                        <Card.Body className="p-3">
                            <div className="d-flex align-items-center justify-content-between">
                                <div className="flex-grow-1">
                                    <div className="d-flex align-items-center mb-2">
                                        <FaCheckCircle className="me-2" style={{ fontSize: '1rem', opacity: 0.9 }} />
                                        <p className="mb-0" style={{ fontSize: '0.75rem', fontWeight: '500' }}>Đã xác nhận</p>
                                    </div>
                                    <h4 className="mb-0" style={{ fontSize: 'clamp(1.25rem, 4vw, 1.75rem)', fontWeight: '700' }}>{stats.daXacNhan}</h4>
                                </div>
                                <div style={{width: 'clamp(40px, 8vw, 50px)', height: 'clamp(40px, 8vw, 50px)', borderRadius: '12px', background: 'rgba(255, 255, 255, 0.15)'}} className="d-none d-sm-flex align-items-center justify-content-center ms-2"><FaCheckCircle style={{ fontSize: 'clamp(1rem, 3vw, 1.5rem)' }} /></div>
                            </div>
                        </Card.Body>
                    </Card>
                </Col>
                <Col xs={6} md={3}>
                    <Card className="border-0 shadow-sm h-100 appointment-stat-card">
                        <Card.Body className="p-3">
                            <div className="d-flex align-items-center justify-content-between">
                                <div className="flex-grow-1">
                                    <div className="d-flex align-items-center mb-2">
                                        <FaUser className="me-2" style={{ fontSize: '1rem', opacity: 0.9 }} />
                                        <p className="mb-0" style={{ fontSize: '0.75rem', fontWeight: '500' }}>Đã check-in</p>
                                    </div>
                                    <h4 className="mb-0" style={{ fontSize: 'clamp(1.25rem, 4vw, 1.75rem)', fontWeight: '700' }}>{stats.daCheckin}</h4>
                                </div>
                                <div style={{width: 'clamp(40px, 8vw, 50px)', height: 'clamp(40px, 8vw, 50px)', borderRadius: '12px', background: 'rgba(255, 255, 255, 0.15)'}} className="d-none d-sm-flex align-items-center justify-content-center ms-2"><FaUser style={{ fontSize: 'clamp(1rem, 3vw, 1.5rem)' }} /></div>
                            </div>
                        </Card.Body>
                    </Card>
                </Col>
                <Col xs={6} md={3}>
                    <Card className="border-0 shadow-sm h-100 appointment-stat-card">
                        <Card.Body className="p-3">
                            <div className="d-flex align-items-center justify-content-between">
                                <div className="flex-grow-1">
                                    <div className="d-flex align-items-center mb-2">
                                        <FaVial className="me-2" style={{ fontSize: '1rem', opacity: 0.9 }} />
                                        <p className="mb-0" style={{ fontSize: '0.75rem', fontWeight: '500' }}>Đang lấy mẫu</p>
                                    </div>
                                    <h4 className="mb-0" style={{ fontSize: 'clamp(1.25rem, 4vw, 1.75rem)', fontWeight: '700' }}>{stats.dangLayMau}</h4>
                                </div>
                                <div style={{width: 'clamp(40px, 8vw, 50px)', height: 'clamp(40px, 8vw, 50px)', borderRadius: '12px', background: 'rgba(255, 255, 255, 0.15)'}} className="d-none d-sm-flex align-items-center justify-content-center ms-2"><FaVial style={{ fontSize: 'clamp(1rem, 3vw, 1.5rem)' }} /></div>
                            </div>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>

            {/* Filters */}
            <Card className="mb-4 shadow-sm">
                <Card.Body className="p-2 p-md-3">
                    <Row className="g-2 g-md-3 align-items-end">
                        <Col xs={12} md={3}>
                            <Form.Group className="mb-0">
                                <Form.Label className="fw-bold mb-2" style={{ fontSize: '1rem' }}>
                                    <FaSearch className="me-1 me-md-2 text-primary" />
                                    Tìm kiếm
                                </Form.Label>
                                <InputGroup>
                                    <InputGroup.Text style={{ fontSize: '1rem' }}>
                                        <FaSearch />
                                    </InputGroup.Text>
                                    <Form.Control
                                        type="text"
                                        placeholder="Tìm theo tên, bác sĩ, ngày..."
                                        value={inputSearchTerm}
                                        onChange={(e) => setInputSearchTerm(e.target.value)}
                                        style={{ height: '46px', fontSize: '1rem' }}
                                    />
                                </InputGroup>
                            </Form.Group>
                        </Col>
                        <Col xs={6} md={3}>
                            <Form.Group className="mb-0">
                                <Form.Label className="fw-bold mb-2" style={{ fontSize: '1rem' }}>
                                    <FaFilter className="me-1 me-md-2 text-primary" />
                                    Trạng thái
                                </Form.Label>
                                <Form.Select
                                    value={statusFilter}
                                    onChange={(e) => setStatusFilter(e.target.value)}
                                    style={{ height: '46px', fontSize: '1rem' }}
                                >
                                    <option value="all">Tất cả trạng thái</option>
                                    
                                    <option value="checked_in">Đã check-in</option>
                                    <option value="sample_collected">Đã lấy mẫu</option>
                                    <option value="waiting_review">Chờ bác sĩ duyệt</option>
                                    <option value="completed">Hoàn thành</option>
                                    <option value="no_show">Không đến</option>
                                    <option value="cancelled">Đã hủy</option>
                                </Form.Select>
                            </Form.Group>
                        </Col>
                        <Col xs={6} md={2}>
                            <Form.Group className="mb-0">
                                <Form.Label className="fw-bold mb-2" style={{ fontSize: '1rem' }}>
                                    <FaCalendarAlt className="me-1 me-md-2 text-primary" />
                                    Lọc ngày
                                </Form.Label>
                                <Form.Control
                                    type="date"
                                    value={selectedDate}
                                    onChange={(e) => {
                                        const v = e.target.value;
                                        setSelectedDate(v);
                                        try {
                                            localStorage.setItem('lab_selected_date', v);
                                            window.dispatchEvent(new CustomEvent('lab_selected_date_changed', { detail: { date: v } }));
                                        } catch (err) {}
                                    }}
                                    style={{ height: '46px', fontSize: '1rem' }}
                                />
                            </Form.Group>
                        </Col>
                        <Col xs={6} md={2}>
                            <Button
                                variant="secondary"
                                className="w-100"
                                onClick={() => {
                                    setSelectedMonth('');
                                    const isoDefault = new Date().toISOString().slice(0, 10);
                                    setSelectedDate(isoDefault);
                                    setStatusFilter('all');
                                    setInputSearchTerm('');
                                    setSearchTerm('');
                                    try {
                                        localStorage.setItem('lab_selected_date', isoDefault);
                                        window.dispatchEvent(new CustomEvent('lab_selected_date_changed', { detail: { date: isoDefault } }));
                                    } catch (err) {}
                                }}
                                style={{ height: '46px', fontSize: '1rem' }}
                            >
                                <FaFilter className="me-1 me-md-2" />
                                Làm mới
                            </Button>
                        </Col>
                        {/* Removed 'Chỉ lịch hẹn của tôi' checkbox per request */}
                    </Row>
                </Card.Body>
            </Card>

            {/* Main content Tabs: Appointments / Related Samples (header-only; content shown below) */}
            <Tabs id="main-appointments-tabs" activeKey={isLabUser ? 'samples' : mainActiveTab} onSelect={(k) => { setMainActiveTab(k); if (k === 'samples') setMainShowSamples(true); }} className="mb-3">
                {!isLabUser && <Tab eventKey="appointments" title="Danh sách lịch hẹn" />}
                {(mainShowSamples || isLabUser) && <Tab eventKey="samples" title={`Danh sách mẫu liên quan (${filteredSamples.length})`} />}
            </Tabs>

            {/* Appointments Table (kept for backward compatibility if Tabs disabled) */}
            <Card className="shadow-sm" style={{ display: mainActiveTab === 'appointments' ? undefined : 'none' }}>
                <Card.Header className="bg-primary text-white d-flex justify-content-between align-items-center">
                    <h5 className="mb-0" style={{ fontSize: 'clamp(1rem, 3vw, 1.25rem)' }}>
                        <FaCalendarAlt className="me-2" />
                        <span className="d-none d-sm-inline">Danh sách lịch hẹn</span>
                        <span className="d-sm-none">Lịch hẹn</span>
                        <span className="ms-1">({mFilteredAppointments.length})</span>
                    </h5>
                    <div className="d-flex align-items-center">
                        <Button
                            variant="light"
                            size="sm"
                            className="me-2"
                            onClick={() => setShowGlobalScanModal(true)}
                        >
                            <i className="fas fa-barcode me-1 me-md-2"></i>
                            <span className="d-none d-sm-inline">Quét mã vạch</span>
                            <span className="d-sm-none">Quét</span>
                        </Button>
                    </div>
                </Card.Header>
                <Card.Body className="p-0">
                    {mFilteredAppointments.length > 0 ? (
                        <div className="table-responsive" style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                            <Table hover className="mb-0 align-middle" style={{ tableLayout: 'fixed', minWidth: '1000px' }}>
                                <thead className="table-light">
                                    <tr>
                                        <th 
                                            className="sortable border-0 text-center"
                                            onClick={() => handleSort('appointmentDate')}
                                            style={{cursor: 'pointer', width: '12%', padding: '8px 12px', fontSize: '0.875rem'}}
                                        >
                                            <div className="d-flex align-items-center justify-content-center">
                                                <FaCalendarAlt className="me-1 me-md-2" />
                                                <span className="d-none d-md-inline">Ngày hẹn</span>
                                                <span className="d-md-none">Ngày</span>
                                                {getSortIcon('appointmentDate')}
                                            </div>
                                        </th>
                                        <th className="border-0 text-center" style={{ width: '13%', padding: '8px 12px', fontSize: '0.875rem' }}>
                                            <span className="d-none d-md-inline">Giờ hẹn</span>
                                            <span className="d-md-none">Giờ</span>
                                        </th>
                                        <th className="border-0 text-center" style={{ width: '14%', padding: '8px 12px', fontSize: '0.875rem' }}>Bệnh nhân</th>
                                        <th className="border-0 text-center d-none d-lg-table-cell" style={{ width: '20%', padding: '8px 12px', fontSize: '0.875rem' }}>Bác sĩ (Ca)</th>
                                        <th className="border-0 text-center" style={{ width: '12%', padding: '8px 12px', fontSize: '0.875rem' }}>Trạng thái</th>
                                        
                                        <th className="border-0 text-center d-none d-lg-table-cell" style={{ width: '10%', padding: '8px 12px', fontSize: '0.875rem' }}>Ghi chú</th>
                                        <th className="text-center border-0" style={{ width: '15%', padding: '8px 12px', fontSize: '0.875rem' }}>Thao tác</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {mFilteredAppointments.map((appointment) => {
                                        const shiftId = getDoctorShiftId(appointment);
                                        const shift = getShiftById(shiftId);
                                        const dateToShow = getShiftDate(shift) || appointment.appointmentDate || appointment.createdAt;
                                        const doctorId = getDoctorIdFromShift(shift) || appointment.doctorId;
                                        const barcode = getSampleBarcode(appointment.id);
                                        // Normalize and canonicalize status: accept English variants and some Vietnamese labels
                                        const normalizedStatus = normalizeStatus(appointment.status);
                                        // Accept several common variants for "checked in"
                                        const isCheckedInLike = ['checked_in', 'check_in', 'checkin', 'checked-in'].includes(normalizedStatus);
                                        const showSampleAction = ['checked_in', 'check_in', 'checkin', 'checked-in', 'sample_collected', 'result_entered'].includes(normalizedStatus);
                                        
                                        // derive room display for table row (try roomMap then fall back)
                                        let rowRoomName = null;
                                        try {
                                            rowRoomName = (shift && (shift.roomName || shift.room || shift.room_name || shift.location || shift.locationName || shift.venue || shift.venueName || shift.roomNumber || shift.room_no || shift.roomId || shift.room_id)) || null;
                                        } catch (e) { rowRoomName = null; }

                                        let rowRoomDisplay = null;
                                        try {
                                            if (rowRoomName && roomMap) {
                                                const tryKeys = [rowRoomName, String(rowRoomName).trim(), String(rowRoomName).toUpperCase(), String(rowRoomName).toLowerCase()];
                                                for (const k of tryKeys) {
                                                    if (k !== undefined && k !== null && String(k).trim() !== '' && roomMap[String(k)]) { rowRoomDisplay = roomMap[String(k)]; break; }
                                                }
                                                if (!rowRoomDisplay) {
                                                    const stripped = String(rowRoomName).replace(/\s+/g, '').toUpperCase();
                                                    if (roomMap[stripped]) rowRoomDisplay = roomMap[stripped];
                                                }
                                            }
                                        } catch (e) { rowRoomDisplay = null; }

                                        return (
                                        <tr key={appointment.id} style={{ borderLeft: '3px solid #0d6efd' }}>
                                            <td className="text-center" style={{ padding: '16px 12px', verticalAlign: 'middle', textAlign: 'center' }}>
                                                <div className="d-flex align-items-center justify-content-center">
                                                    <div style={{ 
                                                        width: '36px', 
                                                        height: '36px', 
                                                        background: '#0d6efd',
                                                        borderRadius: '8px',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        marginRight: '12px'
                                                    }}>
                                                        <FaCalendarAlt style={{ color: '#fff', fontSize: '0.9rem' }} />
                                                    </div>
                                                    <div className="fw-bold" style={{ fontSize: '0.95rem', color: '#2d3748' }}>{formatDate(dateToShow)}</div>
                                                </div>
                                            </td>
                                            <td className="text-center" style={{ padding: '16px 12px', verticalAlign: 'middle', textAlign: 'center' }}>
                                                <div style={{ 
                                                    background: '#e7f1ff',
                                                    borderRadius: '6px',
                                                    padding: '8px 16px',
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    gap: '6px',
                                                    minWidth: '140px'
                                                }}>
                                                    <FaClock style={{ color: '#0d6efd', fontSize: '0.85rem' }} />
                                                    <span className="fw-semibold" style={{ color: '#0d6efd', fontSize: '0.9rem', whiteSpace: 'nowrap' }}>
                                                        {getShiftTime(shift) || formatTime(appointment.appointmentTime) || '—'}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="text-center" style={{ padding: '16px 12px', verticalAlign: 'middle', textAlign: 'center' }}>
                                                <div className="d-flex align-items-center justify-content-center">
                                                    <div style={{ 
                                                        width: '40px', 
                                                        height: '40px', 
                                                        background: '#e7f1ff',
                                                        borderRadius: '50%',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        marginRight: '12px',
                                                        flexShrink: 0
                                                    }}>
                                                        <FaUser style={{ color: '#0d6efd', fontSize: '1rem' }} />
                                                    </div>
                                                    <div className="fw-bold" style={{ fontSize: '0.95rem', color: '#2d3748' }}>{getPatientName(appointment.patientId) || 'Chưa có'}</div>
                                                </div>
                                            </td>
                                            <td className="text-center d-none d-lg-table-cell" style={{ padding: '16px 12px', verticalAlign: 'middle', textAlign: 'center' }}>
                                                <div className="d-flex align-items-center justify-content-center">
                                                    <div style={{ 
                                                        width: '40px', 
                                                        height: '40px', 
                                                        background: '#e7f1ff',
                                                        borderRadius: '8px',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        marginRight: '12px',
                                                        flexShrink: 0
                                                    }}>
                                                        <FaUserMd style={{ color: '#0d6efd', fontSize: '1.1rem' }} />
                                                    </div>
                                                    <div>
                                                        <div className="fw-bold" style={{ fontSize: '0.95rem', color: '#2d3748', marginBottom: '2px' }}>{getDoctorName(doctorId)}</div>
                                                        <small style={{ color: '#718096', fontSize: '0.8rem' }}>
                                                            Ca: <span className="fw-semibold" style={{ color: '#0d6efd' }}>{getShiftTime(shift) || 'N/A'}</span>
                                                            {rowRoomDisplay ? (
                                                                <span className="ms-2">· Phòng: <span className="fw-semibold" style={{ color: '#0d6efd' }}>{rowRoomDisplay}</span></span>
                                                            ) : (rowRoomName ? (
                                                                <span className="ms-2">· Phòng: <span className="fw-semibold" style={{ color: '#0d6efd' }}>{rowRoomName}</span></span>
                                                            ) : null)}
                                                        </small>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="text-center" style={{ padding: '16px 12px', verticalAlign: 'middle' }}>{getStatusBadge(appointment.status)}</td>
                                            
                                            <td className="text-center d-none d-lg-table-cell" style={{ padding: '16px 12px', verticalAlign: 'middle', textAlign: 'center' }}>
                                                <div style={{ 
                                                    fontSize: '0.85rem',
                                                    color: '#718096',
                                                    fontStyle: !appointment.notes ? 'italic' : 'normal',
                                                    maxWidth: '200px',
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                    whiteSpace: 'nowrap',
                                                    margin: '0 auto'
                                                }}>
                                                    {translateToVietnamese(appointment.notes) || 'Không có ghi chú'}
                                                </div>
                                            </td>
                                            <td className="text-center" style={{ padding: '12px', verticalAlign: 'middle' }}>
                                                <div className="d-flex justify-content-center gap-1 gap-md-2 flex-wrap">
                                                    <Button
                                                        variant="outline-primary"
                                                        size="sm"
                                                        title="Xem chi tiết"
                                                        onClick={() => handleViewDetail(appointment.id)}
                                                        className="d-flex align-items-center"
                                                    >
                                                        <FaEye className="me-1" />
                                                        <span className="d-none d-md-inline">Xem</span>
                                                    </Button>
                                                    {['confirmed'].includes(normalizedStatus) && (
                                                        <Button
                                                            variant="info"
                                                            size="sm"
                                                            title="Check-in"
                                                            onClick={() => handleCheckIn(appointment.id)}
                                                            className="d-flex align-items-center"
                                                        >
                                                            <i className="fas fa-sign-in-alt d-md-none"></i>
                                                            <span className="d-none d-md-inline">Điểm danh</span>
                                                        </Button>
                                                    )}
                                                    {isCheckedInLike && (
                                                        <Button
                                                            variant="success"
                                                            size="sm"
                                                            title="Lấy mẫu"
                                                            onClick={() => {
                                                                try {
                                                                    handleTakeSample(appointment.id);
                                                                } catch (e) {
                                                                    /* sample action click error */
                                                                    handleTakeSample(appointment.id);
                                                                }
                                                            }}
                                                            className="d-flex align-items-center"
                                                        >
                                                            <FaVial className="me-1" />
                                                            <span className="d-none d-md-inline">Lấy mẫu</span>
                                                        </Button>
                                                    )}
                                                    {/* Edit button hidden by request: removed to prevent opening edit modal from list */}
                                                </div>
                                            </td>
                                        </tr>
                                        )})}
                                </tbody>
                            </Table>
                        </div>
                    ) : (
                        <div className="text-center py-5">
                            <FaCalendarAlt className="text-muted mb-3" style={{fontSize: '3rem'}} />
                            <h5 className="text-muted">Không có lịch hẹn nào</h5>
                            <p className="text-muted">Thử thay đổi bộ lọc hoặc tạo lịch hẹn mới</p>
                        </div>
                    )}
                </Card.Body>
            </Card>

            {/* Related Samples: show samples that belong to the currently filtered appointments (Optional but kept for context) */}
            <Card className="mt-4 shadow-sm" style={{ display: mainActiveTab === 'samples' && mainShowSamples ? undefined : 'none' }}>
                <Card.Header className="lab-header-card" style={{ background: 'linear-gradient(135deg, #1e40af 0%, #1e3a8a 100%)', backgroundColor: '#1e40af', color: '#ffffff', border: 'none' }}>
                    <h5 className="mb-0"><FaVial className="me-2" /> Danh sách mẫu liên quan ({mFilteredSamples.length})</h5>
                </Card.Header>
                <Card.Body className="p-0">
                    {mFilteredSamples && mFilteredSamples.length > 0 ? (
                        <div className="table-responsive" style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                            <Table hover className="mb-0 align-middle" style={{ tableLayout: 'fixed', minWidth: '900px' }}>
                                <thead>
                                    <tr>
                                        <th className="border-0 text-center" style={{ width: '25%', padding: '8px 12px', fontSize: '0.875rem', background: '#1e40af', color: '#ffffff' }}>Bệnh nhân</th>
                                        <th className="border-0 text-center" style={{ width: '18%', padding: '8px 12px', fontSize: '0.875rem', background: '#1e40af', color: '#ffffff' }}>Loại mẫu</th>
                                        <th className="border-0 text-center" style={{ width: '15%', padding: '8px 12px', fontSize: '0.875rem', background: '#1e40af', color: '#ffffff' }}>Ngày lấy</th>
                                        <th className="border-0 text-center" style={{ width: '12%', padding: '8px 12px', fontSize: '0.875rem', background: '#1e40af', color: '#ffffff' }}>Trạng thái</th>
                                        
                                        <th className="border-0 text-center" style={{ width: '15%', padding: '8px 12px', fontSize: '0.875rem', background: '#1e40af', color: '#ffffff' }}>Thao tác</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {mFilteredSamples.map(sample => {
                                        const sampleId = sample.id || sample.sample_id || sample.sampleId;
                                        const collectedAt = sample.collectedAt || sample.collected_at || sample.createdAt || sample.created_at;
                                        const appointmentIdForSample = sample.appointmentId || sample.appointment_id || '';
                                        const aptResults = appointmentResultsMap && appointmentResultsMap[String(appointmentIdForSample)] ? appointmentResultsMap[String(appointmentIdForSample)] : [];
                                        const hasResultsForAppointment = Array.isArray(aptResults) && aptResults.length > 0;
                                        return (
                                            <tr key={String(sampleId)} id={`sample-row-${String(sampleId)}`} 
                                                className={highlightedSampleId === String(sampleId) ? 'table-success' : ''}
                                                style={{ borderLeft: '3px solid #0d6efd' }}>
                                                <td className="text-center" style={{ padding: '16px 12px', verticalAlign: 'middle', textAlign: 'center' }}>
                                                    <div className="d-flex align-items-center justify-content-center">
                                                        <div style={{ 
                                                            width: '40px', 
                                                            height: '40px', 
                                                            background: '#e7f1ff',
                                                            borderRadius: '50%',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            marginRight: '12px',
                                                            flexShrink: 0
                                                        }}>
                                                            <FaUser style={{ color: '#0d6efd', fontSize: '1rem' }} />
                                                        </div>
                                                        <div className="fw-bold" style={{ fontSize: '0.95rem', color: '#2d3748' }}>{getPatientNameFromSample(sample) || 'Chưa có'}</div>
                                                    </div>
                                                </td>
                                                <td className="text-center" style={{ padding: '16px 12px', verticalAlign: 'middle', textAlign: 'center' }}>
                                                    <div style={{ 
                                                        background: '#e7f1ff',
                                                        borderRadius: '8px',
                                                        padding: '8px 12px',
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        gap: '6px'
                                                    }}>
                                                        <FaVial style={{ color: '#0d6efd', fontSize: '0.9rem' }} />
                                                        <span className="fw-bold" style={{ color: '#0d6efd', fontSize: '0.9rem' }}>{formatSampleType(sample.sampleType) || '—'}</span>
                                                        {sample.volume && <small style={{ color: '#718096', fontSize: '0.75rem' }}>{String(sample.volume)}ml</small>}
                                                    </div>
                                                </td>
                                                <td className="text-center" style={{ padding: '16px 12px', verticalAlign: 'middle', textAlign: 'center' }}>
                                                    {collectedAt ? (
                                                        <div className="d-flex align-items-center justify-content-center">
                                                            <div style={{ 
                                                                width: '36px', 
                                                                height: '36px', 
                                                                background: '#0d6efd',
                                                                borderRadius: '8px',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                marginRight: '10px'
                                                            }}>
                                                                <FaCalendarAlt style={{ color: '#fff', fontSize: '0.9rem' }} />
                                                            </div>
                                                            <span className="fw-bold" style={{ fontSize: '0.95rem', color: '#2d3748' }}>{formatDate(collectedAt)}</span>
                                                        </div>
                                                    ) : (
                                                        <span style={{ color: '#a0aec0', fontStyle: 'italic', fontSize: '0.9rem' }}>Chưa có</span>
                                                    )}
                                                </td>
                                                <td style={{ padding: '16px 12px', verticalAlign: 'middle', textAlign: 'center' }}>
                                                    <StatusBadge entity="sample" status={sample.status || sample.state || ''} />
                                                </td>
                                                
                                                <td className="text-center" style={{ padding: '16px 12px', verticalAlign: 'middle', textAlign: 'center' }}>
                                                    <div className="d-flex justify-content-center gap-1 gap-md-2 flex-wrap">
                                                        <Button size="sm" variant="outline-primary" onClick={() => handleViewSampleDetail(sample)}><FaEye className="me-1" /> Xem</Button>
                                                        {(() => {
                                                            const sampleStatus = normalizeStatus(sample.status || sample.state || '');
                                                            // Hiển thị nút Hoàn tất khi status là sample_collected (đã lấy mẫu) hoặc collected
                                                            if (sampleStatus === 'sample_collected' || sampleStatus === 'collected') {
                                                                return (
                                                                    <Button 
                                                                        size="sm" 
                                                                        variant="success" 
                                                                        onClick={() => handleCompleteSample(sampleId)}
                                                                        title="Xét nghiệm hoàn tất"
                                                                    >
                                                                        <FaCheckCircle className="me-1" /> XN hoàn tất
                                                                    </Button>
                                                                );
                                                            }
                                                            return null;
                                                        })()}
                                                        {String(sample.status || sample.state).toLowerCase() === 'completed' && (
                                                            (() => {
                                                                const key = String(appointmentIdForSample || '');
                                                                const isLoading = !!(resultsLoadingMap && resultsLoadingMap[key]);
                                                                const canEnterResults = !isLoading && !hasResultsForAppointment;
                                                                return (
                                                                    <>
                                                                        {isLoading && (
                                                                            <Button size="sm" variant="light" disabled>
                                                                                <Spinner animation="border" size="sm" />
                                                                            </Button>
                                                                        )}
                                                                        {canEnterResults && (
                                                                            <Button size="sm" variant="success" onClick={() => handleOpenResults(sampleId)}>
                                                                                <FaFlask className="me-1" /> Nhập KQ
                                                                            </Button>
                                                                        )}
                                                                    </>
                                                                );
                                                            })()
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </Table>
                        </div>
                    ) : (
                        <div className="text-center py-4">
                            <FaVial className="text-muted mb-3" style={{ fontSize: '2.25rem' }} />
                            <h6 className="text-muted">Không có mẫu xét nghiệm liên quan</h6>
                            <p className="text-muted">Các mẫu liên quan đến lịch hẹn đã lọc sẽ được hiển thị ở đây.</p>
                        </div>
                    )}
                </Card.Body>
            </Card>

            {/* Modal Lấy mẫu xét nghiệm */}
            <Modal show={showSampleModal} onHide={() => setShowSampleModal(false)} size="lg" centered>
                <Modal.Header closeButton>
                    <Modal.Title><i className="fas fa-vial me-2 text-success"></i>Lấy mẫu xét nghiệm</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {selectedAppointment && (
                        <div id="appointment-detail-pdf">
                            <Card className="mb-4">
                                <Card.Header className="bg-light">
                                    <h6 className="mb-0"><i className="fas fa-user me-2"></i>Thông tin bệnh nhân</h6>
                                </Card.Header>
                                <Card.Body>
                                    {(() => {
                                        const patient = (patientMap && patientMap[selectedAppointment.patientId]) || null;
                                        const name = getPatientName(selectedAppointment.patientId) || selectedAppointment.patientName || '—';
                                        const patientCode = patient?.code || patient?.patientCode || patient?.patient_id || selectedAppointment.patientCode || selectedAppointment.patient_id || '';
                                        const dobRaw = patient?.dateOfBirth || patient?.dob || selectedAppointment.patientDob || selectedAppointment.patient_dob || null;
                                        const dob = dobRaw ? formatDateOnly(dobRaw) : '—';
                                        const phone = patient?.phone || patient?.phoneNumber || patient?.mobile || selectedAppointment.patientPhone || '—';
                                        const email = patient?.email || patient?.contactEmail || selectedAppointment.patientEmail || selectedAppointment.patient_email || '—';
                                        const initials = String(name || '').split(/\s+/).filter(Boolean).slice(-2).map(n => n[0]).join('').toUpperCase().slice(0,2) || '?';

                                        return (
                                            <Row>
                                                <Col md={12}>
                                                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: '16px' }}>
                                                        <div style={{ width: 64, height: 64, borderRadius: 32, background: '#0d6efd', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '1.3rem', fontFamily: 'Segoe UI, Roboto, "Helvetica Neue", Arial, sans-serif', flexShrink: 0 }}>{initials}</div>
                                                        <div style={{ flex: 1 }}>
                                                            <div style={{ marginBottom: '12px' }}>
                                                                <div style={{ fontSize: '0.85rem', color: '#6c757d', marginBottom: '4px', fontWeight: 500 }}>
                                                                    <i className="fas fa-user me-2"></i>Họ và tên
                                                                </div>
                                                                <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#212529' }}>{name}</div>
                                                            </div>
                                                            {patientCode && (
                                                                <div style={{ marginBottom: '12px' }}>
                                                                    <div style={{ fontSize: '0.85rem', color: '#6c757d', marginBottom: '4px', fontWeight: 500 }}>
                                                                        <i className="fas fa-id-card me-2"></i>Mã bệnh nhân
                                                                    </div>
                                                                    <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#495057' }}>{patientCode}</div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                    
                                                    <Row className="g-3">
                                                        <Col md={6}>
                                                            <div style={{ padding: '12px', background: '#f8f9fa', borderRadius: '8px', border: '1px solid #dee2e6' }}>
                                                                <div style={{ fontSize: '0.85rem', color: '#6c757d', marginBottom: '6px', fontWeight: 500 }}>
                                                                    <i className="fas fa-birthday-cake me-2"></i>Ngày sinh
                                                                </div>
                                                                <div style={{ fontSize: '1rem', fontWeight: 600, color: '#212529' }}>{dob}</div>
                                                            </div>
                                                        </Col>
                                                        <Col md={6}>
                                                            <div style={{ padding: '12px', background: '#f8f9fa', borderRadius: '8px', border: '1px solid #dee2e6' }}>
                                                                <div style={{ fontSize: '0.85rem', color: '#6c757d', marginBottom: '6px', fontWeight: 500 }}>
                                                                    <i className="fas fa-phone me-2"></i>Số điện thoại
                                                                </div>
                                                                <div style={{ fontSize: '1rem', fontWeight: 600, color: '#212529' }}>{phone}</div>
                                                            </div>
                                                        </Col>
                                                        <Col md={12}>
                                                            <div style={{ padding: '12px', background: '#f8f9fa', borderRadius: '8px', border: '1px solid #dee2e6' }}>
                                                                <div style={{ fontSize: '0.85rem', color: '#6c757d', marginBottom: '6px', fontWeight: 500 }}>
                                                                    <i className="fas fa-envelope me-2"></i>Email
                                                                </div>
                                                                <div style={{ fontSize: '1rem', fontWeight: 600, color: '#212529' }}>{email}</div>
                                                            </div>
                                                        </Col>
                                                    </Row>
                                                </Col>
                                            </Row>
                                        );
                                    })()}
                                </Card.Body>
                            </Card>
                            <Form>
                                <Row>
                                    <Col md={6}>
                                        <Form.Group className="mb-3">
                                            <Form.Label><i className="fas fa-tint me-2"></i>Loại mẫu <span className="text-danger">*</span></Form.Label>
                                            <Form.Select id="sample-type-select" value={sampleData.sampleType} onChange={(e) => setSampleData(prev => ({...prev, sampleType: e.target.value}))}>
                                                {['blood', 'serum', 'plasma', 'urine', 'swab', 'other'].map(type => (
                                                    <option key={type} value={type}>{formatSampleType(type)}</option>
                                                ))}
                                            </Form.Select>
                                        </Form.Group>
                                    </Col>
                                    <Col md={6}>
                                        <Form.Group className="mb-3">
                                            <Form.Label><i className="fas fa-weight me-2"></i>Thể tích (ml) <span className="text-danger">*</span></Form.Label>
                                            <Form.Control type="number" placeholder="VD: 5" value={sampleData.volume} onChange={(e) => setSampleData({...sampleData, volume: e.target.value})} min="1" max="50" />
                                        </Form.Group>
                                    </Col>
                                </Row>
                                <Form.Group className="mb-3">
                                    <Form.Label><i className="fas fa-sticky-note me-2"></i>Ghi chú</Form.Label>
                                    <Form.Control as="textarea" rows={3} placeholder="Ghi chú về quá trình lấy mẫu..." value={sampleData.notes} onChange={(e) => setSampleData({...sampleData, notes: e.target.value})} />
                                </Form.Group>
                                
                                {sampleData.existingBarcode && (
                                    <>
                                        {/* Hiển thị mã vạch với các chức năng in/tải */}
                                        <Card className="mb-3 border-primary">
                                            <Card.Header className="bg-primary text-white">
                                                <h6 className="mb-0">
                                                    <FaBarcode className="me-2"/>
                                                    Mã Vạch Mẫu Xét Nghiệm
                                                </h6>
                                            </Card.Header>
                                            <Card.Body>
                                                <BarcodeDisplay
                                                    value={sampleData.existingBarcode}
                                                    format="CODE128"
                                                    width={2}
                                                    height={60}
                                                    displayValue={true}
                                                    fontSize={14}
                                                    margin={10}
                                                    title=""
                                                    showActions={true}
                                                    className="text-center"
                                                />
                                                <Alert variant="info" className="mt-3 mb-0">
                                                    <FaInfoCircle className="me-2"/>
                                                    <strong>Hướng dẫn:</strong> Bạn có thể in hoặc tải mã vạch để dán lên ống mẫu
                                                </Alert>
                                            </Card.Body>
                                        </Card>

                                        {/* Alert xác nhận quét mã vạch */}
                                        <Alert variant={barcodeVerified ? 'success' : 'warning'} className="mt-3">
                                            <div className="d-flex justify-content-between align-items-center">
                                                <div>
                                                    <h6 className="mb-2">
                                                        <i className={`fas fa-${barcodeVerified ? 'check-circle' : 'exclamation-triangle'} me-2`}></i>
                                                        {barcodeVerified ? 'Đã xác nhận mã vạch' : 'Cần xác nhận mã vạch'}
                                                    </h6>
                                                    {barcodeVerified ? (
                                                        <small className="text-success">
                                                            <i className="fas fa-check-circle me-1"></i>
                                                            Mã vạch đã được xác nhận thành công. Bạn có thể tiếp tục lấy mẫu.
                                                        </small>
                                                    ) : (
                                                        <small>
                                                            Vui lòng quét mã vạch trên ống xét nghiệm để xác nhận trước khi lấy mẫu.
                                                        </small>
                                                    )}
                                                </div>
                                                {!barcodeVerified && (
                                                    <Button 
                                                        variant="primary" 
                                                        onClick={() => setShowBarcodeScanModal(true)} 
                                                        className="ms-3"
                                                    >
                                                        <i className="fas fa-qrcode me-2"></i>
                                                        Quét mã vạch
                                                    </Button>
                                                )}
                                            </div>
                                        </Alert>
                                    </>
                                )}
                            </Form>
                        </div>
                    )}
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => { setShowSampleModal(false); setBarcodeVerified(false); }}><i className="fas fa-times me-2"></i>Hủy</Button>
                    <Button variant="success" onClick={handleSampleSubmit} disabled={sampleData.existingBarcode && !barcodeVerified}>
                        <i className="fas fa-check me-2"></i>Xác nhận lấy mẫu
                        {sampleData.existingBarcode && !barcodeVerified && (<small className="d-block" style={{fontSize: '0.7rem'}}>(Cần quét mã vạch trước)</small>)}
                    </Button>
                </Modal.Footer>
            </Modal>
            <Modal show={showBarcodeScanModal} onHide={() => setShowBarcodeScanModal(false)} centered size="lg">
                <Modal.Header closeButton style={{ background: '#198754', color: 'white' }}>
                    <h5 className="mb-0">
                        <FaBarcode className="me-2"/>
                        Xác Nhận Mã Vạch Mẫu Xét Nghiệm
                    </h5>
                </Modal.Header>
                <Modal.Body>
                    {sampleData.existingBarcode ? (
                        <>
                            <Alert variant="info" className="mb-3">
                                <h6 className="fw-bold mb-2">
                                    <FaInfoCircle className="me-2"/>
                                    Mã vạch cần xác nhận:
                                </h6>
                                <code style={{ 
                                    fontSize: '1.2rem', 
                                    background: '#e9ecef', 
                                    padding: '8px 16px', 
                                    borderRadius: '8px', 
                                    display: 'inline-block', 
                                    fontWeight: 'bold'
                                }}>
                                    {sampleData.existingBarcode}
                                </code>
                            </Alert>
                            <BarcodeScanner
                                barcodePattern={/.*/}
                                key={`barcode-scan-verify-${showBarcodeScanModal}-${sampleData.existingBarcode}`}
                                onScanSuccess={(barcode) => {
                                    try {
                                        const expectedBarcode = sampleData.existingBarcode;
                                        const scanned = String(barcode || '').trim();
                                        const expectedNorm = formatBarcodeValueLocal(expectedBarcode) || String(expectedBarcode).replace(/[^A-Z0-9]/gi, '').toUpperCase();
                                        const scannedNorm = formatBarcodeValueLocal(scanned) || scanned.replace(/[^A-Z0-9]/gi, '').toUpperCase();

                                        if (expectedNorm === scannedNorm) {
                                            setBarcodeVerified(true);
                                            setShowBarcodeScanModal(false);
                                            showSuccess('✅ Xác nhận mã vạch thành công! Bạn có thể tiếp tục lấy mẫu.');
                                        } else {
                                            showError(`❌ Mã vạch không khớp! Mã vạch quét: ${barcode}, Mã vạch cần: ${expectedBarcode}`);
                                        }
                                    } catch (e) {
                                        showError('Lỗi khi xử lý mã vạch');
                                    }
                                }}
                                onClose={() => setShowBarcodeScanModal(false)}
                            />
                            <Alert variant="warning" className="mt-3 mb-0">
                                <h6 className="fw-bold mb-2">
                                    <FaExclamationTriangle className="me-2"/>
                                    Lưu ý:
                                </h6>
                                <p className="mb-0">
                                    Mã vạch quét phải khớp chính xác với mã vạch của mẫu.
                                </p>
                            </Alert>
                        </>
                    ) : (
                        <Alert variant="warning">Không có mã vạch mẫu để xác nhận. Vui lòng kiểm tra lại quá trình check-in.</Alert>
                    )}
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowBarcodeScanModal(false)}>
                        <FaTimes className="me-2"/>Đóng
                    </Button>
                </Modal.Footer>
            </Modal>

            {/* Enter Results Modal (INTEGRATED VERSION) */}
            <Modal 
                show={showResultsModal}
                onHide={() => { setShowResultsModal(false); setSelectedSample(null); setResultsForm({ sampleId: null, tests: [], notes: '' }); setResultErrors({}); setResultWarnings({}); }}
                size="xl"
                centered
            >
                <Modal.Header closeButton className="bg-success text-white">
                    <Modal.Title>
                        <FaFlask className="me-2" />
                        Nhập kết quả xét nghiệm
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {selectedSample ? (
                        <div>
                            {/* Sample Info Header (Read-only) */}
                            <div className="bg-light p-3 border-bottom mb-3 rounded">
                                <Row>
                                    <Col md={6}>
                                        <h6 className="mb-1 text-primary"><FaVial className="me-2" /> Thông tin mẫu</h6>
                                        {/* Removed sample ID and barcode display as requested */}
                                        <small className="text-muted">Loại: {formatSampleType(selectedSample.sampleType)}</small>
                                    </Col>
                                    
                                    <Col md={6}>
                                        <h6 className="mb-1 text-primary"><FaUser className="me-2" /> Bệnh nhân</h6>
                                        <p className="mb-0 fw-bold">{getPatientNameFromSample(selectedSample)}</p>
                                        {/* Package JSON toggle removed from Enter Results modal */}
                                    </Col>
                                </Row>
                            </div>

                            {/* Sample JSON display removed as requested */}

                            

                            {/* Reagent / Device selection */}
                            <Card className="mb-3"><Card.Body>
                                <Row className="g-2 align-items-center">
                                    <Col md={5}>
                                        <Form.Group>
                                            <Form.Label className="fw-bold">Thuốc thử</Form.Label>
                                            <Form.Select size="sm" value={selectedReagentId} onChange={(e) => setSelectedReagentId(e.target.value)}>
                                                <option value="">-- Chọn thuốc thử --</option>
                                                {(!reagentsOptions || reagentsOptions.length === 0) && (<option disabled value="no-data">(Không có dữ liệu thuốc thử)</option>)}
                                                {(reagentsOptions || []).map(r => (
                                                    <option key={String(r.id)} value={r.id}>{r.name || r.code || String(r.id)}</option>
                                                ))}
                                            </Form.Select>
                                        </Form.Group>
                                    </Col>
                                    <Col md={5}>
                                        <Form.Group>
                                            <Form.Label className="fw-bold">Thiết bị</Form.Label>
                                            <Form.Select size="sm" value={selectedDeviceId} onChange={(e) => setSelectedDeviceId(e.target.value)}>
                                                <option value="">-- Chọn thiết bị --</option>
                                                {(devicesOptions || []).length === 0 && (<option disabled value="no-data">(Không có thiết bị hoạt động)</option>)}
                                                {(devicesOptions || []).map(d => (
                                                    <option key={String(d.id)} value={d.id}>{d.name || d.code || String(d.id)}</option>
                                                ))}
                                            </Form.Select>
                                        </Form.Group>
                                    </Col>
                                    <Col md={2}>
                                        <Form.Group>
                                            <Form.Label className="fw-bold">Số lượng</Form.Label>
                                            <Form.Control size="sm" type="number" min={1} value={reagentQuantity} onChange={(e) => setReagentQuantity(Number(e.target.value) || 1)} />
                                        </Form.Group>
                                    </Col>
                                </Row>
                            </Card.Body></Card>

                            {/* Barcode verification hint (adapted for inline) */}
                            {!isSampleCompletedLocal(selectedSample) && !resultBarcodeVerified && (
                                <Alert variant="info" className="mb-3">
                                    <Row className="align-items-center">
                                        <Col md={8}>
                                            <h6 className="fw-bold mb-2"><FaBarcode className="me-2" /> Xác nhận mã vạch (Tùy chọn)</h6>
                                            <p className="mb-0">
                                                Vui lòng quét mã vạch trên ống xét nghiệm ({selectedSample.barcode || 'N/A'}) để xác nhận trước khi nhập kết quả.
                                            </p>
                                        </Col>
                                        <Col md={4} className="text-end">
                                            <Button 
                                                variant="outline-success" 
                                                onClick={() => setShowBarcodeScanInResultModal(true)}
                                                size="sm"
                                            >
                                                <FaBarcode className="me-2" />
                                                Quét mã (tùy chọn)
                                            </Button>
                                        </Col>
                                    </Row>
                                </Alert>
                            )}
                            {resultBarcodeVerified && (
                                <Alert variant="success" className="mb-3 d-flex align-items-center">
                                    <FaCheckCircle className="me-2" style={{ fontSize: '1.5rem' }} /> Mã vạch đã được xác nhận thành công.
                                </Alert>
                            )}

                            {/* Main Test Results Form (rendered by renderTestForm) */}
                            {renderTestForm()}
                            
                            <Form.Group className="mb-3 mt-3">
                                <Form.Label className="fw-bold">Ghi chú kết quả</Form.Label>
                                <Form.Control 
                                    as="textarea" 
                                    rows={2} 
                                    value={resultsForm.notes || ''} 
                                    onChange={(e) => setResultsForm(prev => ({...prev, notes: e.target.value}))}
                                    placeholder="Ghi chú thêm về kết quả xét nghiệm..."
                                />
                            </Form.Group>

                            <Alert variant="info" className="mt-3 mb-0"><FaExclamationTriangle className="me-2" /><strong>Lưu ý:</strong> Sau khi lưu kết quả, trạng thái mẫu được cập nhật. Bạn có thể gửi kết quả cho bác sĩ duyệt trong trang "Quản lý kết quả xét nghiệm".</Alert>
                        </div>
                    ) : (
                        <div className="text-center py-3">Đang tải dữ liệu mẫu...</div>
                    )}
                </Modal.Body>
                <Modal.Footer className="bg-light">
                    <Button variant="secondary" onClick={() => { setShowResultsModal(false); setSelectedSample(null); }} disabled={resultsLoading || saving}>
                        <i className="fas fa-times me-2"></i>Hủy
                    </Button>
                    <Button 
                        variant="success" 
                        onClick={handleSaveResults} 
                        disabled={
                            resultsLoading || saving ||
                            !selectedReagentId || 
                            !selectedDeviceId || 
                            (Number(reagentQuantity) <= 0) ||
                            !(resultsForm && Array.isArray(resultsForm.tests) && resultsForm.tests.length > 0) ||
                            Object.keys(resultErrors).length > 0 // Disable if client-side errors exist
                        }
                        title={
                            (Object.keys(resultErrors).length > 0) ? 'Vui lòng sửa các lỗi trước khi lưu'
                            : (!selectedReagentId || !selectedDeviceId)
                            ? 'Vui lòng chọn thuốc thử và thiết bị trước khi lưu'
                            : (Number(reagentQuantity) <= 0 ? 'Số lượng thuốc thử phải lớn hơn 0' : (resultsForm && resultsForm.tests.length === 0 ? 'Không có tiêu chí để lưu' : ''))
                        }
                    >
                        {resultsLoading || saving ? (
                            <>
                                <Spinner animation="border" size="sm" className="me-2" /> Đang lưu...
                            </>
                        ) : (
                            <><FaCheckCircle className="me-2" /> Lưu kết quả</>
                        )}
                    </Button>
                </Modal.Footer>
            </Modal>

            {/* Modal Quét Mã Vạch Trong Modal Nhập Kết Quả */}
            <Modal 
                show={showBarcodeScanInResultModal} 
                onHide={() => setShowBarcodeScanInResultModal(false)}
                centered
                size="lg"
            >
                <Modal.Header closeButton style={{ background: '#198754', color: 'white' }}>
                    <h5 className="mb-0">
                        <FaBarcode className="me-2" />
                        Xác Nhận Mã Vạch Mẫu
                    </h5>
                </Modal.Header>
                <Modal.Body>
                    {selectedSample && (
                        <>
                            <Alert variant="info" className="mb-3">
                                <h6 className="fw-bold mb-2">
                                    <FaInfoCircle className="me-2"/>
                                    Mã vạch cần xác nhận:
                                </h6>
                                <code style={{ 
                                    fontSize: '1.2rem', 
                                    background: '#e9ecef', 
                                    padding: '8px 16px', 
                                    borderRadius: '8px',
                                    display: 'inline-block',
                                    fontWeight: 'bold'
                                }}>
                                    {selectedSample?.barcode || selectedSample?.id}
                                </code>
                            </Alert>
                            <BarcodeScanner
                                barcodePattern={/.*/}
                                key={`barcode-scan-result-${selectedSample?.id}`}
                                onScanSuccess={async (barcode) => {
                                    const expectedRaw = selectedSample?.barcode || selectedSample?.id;
                                    const expectedNormalized = formatBarcodeValueLocal(expectedRaw) || String(expectedRaw || '').trim();
                                    const scannedNormalized = formatBarcodeValueLocal(barcode) || String(barcode || '').trim();

                                    if (scannedNormalized && expectedNormalized && scannedNormalized === expectedNormalized) {
                                        setResultBarcodeVerified(true);
                                        setShowBarcodeScanInResultModal(false);
                                        showSuccess('✅ Xác nhận mã vạch thành công! Bạn có thể nhập kết quả.');
                                    } else {
                                        showError(`❌ Mã vạch không khớp! Mã vạch quét: ${barcode}, Mã vạch cần: ${expectedRaw || 'N/A'}`);
                                    }
                                }}
                                onClose={() => setShowBarcodeScanInResultModal(false)}
                            />
                            <Alert variant="warning" className="mt-3 mb-0">
                                <h6 className="fw-bold mb-2">
                                    <FaExclamationTriangle className="me-2"/>
                                    Lưu ý:
                                </h6>
                                <p className="mb-0">
                                    Việc quét mã này giúp đảm bảo tính đúng đắn của dữ liệu trước khi nhập kết quả.
                                </p>
                            </Alert>
                        </>
                    )}
                </Modal.Body>
                <Modal.Footer>
                    <Button 
                        variant="secondary" 
                        onClick={() => setShowBarcodeScanInResultModal(false)}
                    >
                        <FaTimes className="me-2"/>Đóng
                    </Button>
                </Modal.Footer>
            </Modal>


            {/* Modal Quét mã vạch (toàn trang) */}
            <Modal show={showGlobalScanModal} onHide={() => setShowGlobalScanModal(false)} centered size="lg">
                <Modal.Header closeButton style={{ background: '#0d6efd', color: 'white' }}>
                    <h5 className="mb-0">
                        <FaBarcode className="me-2"/>
                        Quét mã vạch để tìm lịch hẹn
                    </h5>
                </Modal.Header>
                <Modal.Body>
                    <Alert variant="info" className="mb-3">
                        <FaInfoCircle className="me-2"/>
                        Quét mã vạch trên ống mẫu xét nghiệm. Hệ thống sẽ tự động tìm lịch hẹn tương ứng và mở chi tiết.
                    </Alert>
                    <BarcodeScanner
                        barcodePattern={/.*/}
                        key={`global-scan-${showGlobalScanModal}`}
                        onScanSuccess={async (barcode) => {
                            try {
                                const res = await sampleService.getSampleByBarcode(barcode);
                                const sample = res?.data;
                                
                                if (!sample || !sample.appointmentId) {
                                    showError('Không tìm thấy mẫu hoặc không có lịch hẹn liên kết với mã vạch này.');
                                    return;
                                }
                                
                                const aptId = sample.appointmentId;
                                // Tìm kiếm appointment trong bộ nhớ cache
                                const apt = appointments.find(a => String(a.id) === String(aptId));
                                
                                if (apt) {
                                    // Cập nhật state để mở Modal chi tiết
                                    setSelectedAppointment(apt); 
                                    setShowDetailModal(true);
                                    setShowGlobalScanModal(false);
                                    showSuccess(`Đã mở chi tiết lịch hẹn ID ${apt.id} từ mã vạch: ${barcode}`);
                                } else {
                                    showError(`Không tìm thấy lịch hẹn ID ${aptId} tương ứng.`);
                                }
                            } catch (err) {
                                showError('Lỗi xử lý mã vạch');
                            }
                        }}
                        onClose={() => setShowGlobalScanModal(false)}
                    />
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowGlobalScanModal(false)}>
                        <FaTimes className="me-2"/>Đóng
                    </Button>
                </Modal.Footer>
            </Modal>

            {/* Modal Chỉnh sửa lịch hẹn */}
            <Modal show={showEditModal} onHide={() => setShowEditModal(false)} centered size="lg">
                <Modal.Header closeButton><Modal.Title><i className="fas fa-edit me-2"></i>Chỉnh sửa lịch hẹn</Modal.Title></Modal.Header>
                <Modal.Body>
                    {editLoading ? (<div className="text-center py-4"><div className="spinner-border text-primary" role="status"><span className="visually-hidden">Đang tải...</span></div><div className="mt-2 text-muted">Đang tải thông tin lịch hẹn...</div></div>) 
                        : editForm ? (
                        <div>
                            <p><strong>Bệnh nhân:</strong> {getPatientName(editForm.patientId)}</p>
                            <Row className="mb-2">
                                <Col xs={12} sm={6} className="mb-1"><div><strong>Ngày:</strong></div>
                                    <div className="text-muted">{formatDate(editForm.appointmentDate || getShiftDate(getShiftById(getDoctorShiftId(editForm))) || editForm.createdAt || '—')}</div>
                                </Col>
                            </Row>
                            <Form.Group className="mb-3">
                                <Form.Label>Trạng thái</Form.Label>
                                <Form.Select value={editForm.status || editForm.Status || ''} onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}>
                                    <option value="pending_payment">Chờ thanh toán</option><option value="scheduled">Đã đặt lịch</option><option value="confirmed">Đã xác nhận</option>
                                    <option value="checked_in">Đã check-in</option><option value="sample_collected">Đã lấy mẫu</option><option value="result_entered">Đã nhập KQ</option>
                                    <option value="waiting_review">Chờ bác sĩ duyệt</option><option value="ready_for_consultation">Sẵn sàng tư vấn</option>
                                    <option value="completed">Hoàn thành</option><option value="no_show">Không đến</option><option value="cancelled">Đã hủy</option>
                                </Form.Select>
                            </Form.Group>
                            <Form.Group className="mb-3">
                                <Form.Label>Ghi chú</Form.Label>
                                <Form.Control as="textarea" rows={3} value={editForm.notes || ''} onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })} />
                                <Form.Text className="text-muted">Lưu ý: hiện chức năng lưu sẽ chỉ cập nhật trạng thái.</Form.Text>
                            </Form.Group>
                        </div>
                    ) : (<p>Không có lịch hẹn để chỉnh sửa.</p>)}
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => { setShowEditModal(false); setEditForm(null); }} disabled={savingEdit}>Đóng</Button>
                    <Button variant="primary" onClick={handleSaveEdit} disabled={savingEdit}>{savingEdit ? 'Đang lưu...' : 'Lưu'}</Button>
                </Modal.Footer>
            </Modal>

            {/* Modal Xem chi tiết appointment */}
            <Modal show={showDetailModal} onHide={() => setShowDetailModal(false)} size="lg" centered>
                <Modal.Header closeButton>
                    <Modal.Title>
                        <i className="fas fa-eye me-2 text-primary"></i>Chi tiết lịch hẹn
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {selectedAppointment ? (
                        <>
                            {/* Thông tin cơ bản */}
                            <Card className="mb-4">
                                <Card.Header className="bg-primary text-white"><h6 className="mb-0"><i className="fas fa-info-circle me-2"></i>Thông tin cơ bản</h6></Card.Header>
                                <Card.Body>
                                    <Row>
                                        <Col md={6}><strong>Trạng thái:</strong> {getStatusBadge(selectedAppointment.status)}</Col>
                                        <Col md={6}><strong>Ngày hẹn:</strong> {formatDate(getShiftDate(getShiftById(getDoctorShiftId(selectedAppointment))) || selectedAppointment.appointmentDate)}</Col>
                                    </Row>
                                </Card.Body>
                            </Card>
                            
                            {/* Thông tin bác sĩ */}
                            <Card className="mb-4">
                                <Card.Header className="bg-info text-white"><h6 className="mb-0"><i className="fas fa-user-md me-2"></i>Thông tin bác sĩ</h6></Card.Header>
                                <Card.Body>
                                    {(() => {
                                        const doctorId = getDoctorIdFromShift(getShiftById(getDoctorShiftId(selectedAppointment))) || selectedAppointment.doctorId;
                                        const doctorName = getDoctorName(doctorId) || 'Chưa phân bổ';
                                        const shift = getShiftById(getDoctorShiftId(selectedAppointment));
                                        const shiftTime = getShiftTime(shift) || 'N/A';
                                        const roomName = (shift && (shift.roomName || shift.room || shift.room_name || shift.location || shift.locationName || shift.venue || shift.venueName || shift.roomNumber || shift.room_no || shift.roomId || shift.room_id)) || null;
                                        let roomDisplay = null;
                                        try {
                                            if (roomName && roomMap) {
                                                const tryKeys = [roomName, String(roomName).trim(), String(roomName).toUpperCase(), String(roomName).toLowerCase()];
                                                for (const k of tryKeys) {
                                                    if (k !== undefined && k !== null && String(k).trim() !== '' && roomMap[String(k)]) { roomDisplay = roomMap[String(k)]; break; }
                                                }
                                                if (!roomDisplay) {
                                                    const stripped = String(roomName).replace(/\s+/g, '').toUpperCase();
                                                    if (roomMap[stripped]) roomDisplay = roomMap[stripped];
                                                }
                                            }
                                        } catch (e) { roomDisplay = null; }

                                        return (
                                            <Row className="align-items-center">
                                                <Col md={6}>
                                                    <div className="d-flex align-items-center">
                                                        <div style={{ width: 52, height: 52, borderRadius: 8, background: '#f1f3f5', display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                                                            <FaUserMd style={{ color: '#0d6efd', fontSize: '1.2rem' }} />
                                                        </div>
                                                        <div>
                                                            <div className="fw-bold" style={{ fontSize: '1.05rem', fontFamily: 'Segoe UI, Roboto, "Helvetica Neue", Arial, sans-serif' }}>{doctorName}</div>
                                                            {roomName ? (
                                                                <Badge bg="secondary" className="mt-1" style={{ fontSize: '0.85rem' }}>Phòng: <span className="fw-bold ms-1" style={{ color: '#ffffff' }}>{roomDisplay || roomName}</span></Badge>
                                                            ) : null}
                                                        </div>
                                                    </div>
                                                </Col>
                                                <Col md={6}>
                                                    <div className="text-end">
                                                        <div className="text-muted small">Thời gian ca</div>
                                                        <div className="d-inline-flex align-items-center px-3 py-2" style={{ background: '#f8f9fa', borderRadius: 20, fontWeight: 600, gap: 8 }}>
                                                            <FaClock className="text-secondary" />
                                                            <div style={{ fontSize: '0.95rem', color: '#212529' }}>{shiftTime}</div>
                                                        </div>
                                                    </div>
                                                </Col>
                                            </Row>
                                        );
                                    })()}
                                </Card.Body>
                            </Card>

                            {/* Mã vạch mẫu liên quan (dàn giống Modal Chi tiết mẫu) */}
                            {(() => {
                                const sample = sampleMapByAppointmentId[selectedAppointment.id] || ((samples || []).find(s => String(s.appointmentId || s.appointment_id) === String(selectedAppointment.id)) || null);
                                const rawBarcode = (sample && (sample.barcode || sample.code || sample.sample_code || sample.barcodeValue || sample.barcode_id || sample.barcode_value || sample.barcodeString || sample.barcode_str || sample.barcode_text)) || (sample && sample.id ? String(sample.id) : '') || '';
                                const rawValue = String(rawBarcode || '').trim();
                                const normalizedBarcode = formatBarcodeValueLocal(rawValue) || (rawValue ? rawValue.replace(/[^A-Z0-9]/gi, '').toUpperCase() : '');
                                const appointment = selectedAppointment;
                                const patientId = appointment?.patientId || appointment?.patient_id;
                                const patient = (patientMap && patientMap[patientId]) || null;

                                const patientName = getPatientName(patientId) || appointment.patientName || '—';
                                const patientDobRaw = patient?.dateOfBirth || patient?.dob || appointment?.patientDob || appointment?.dob || null;
                                const patientDobDisplay = patientDobRaw ? (formatDateOnly(patientDobRaw) || String(patientDobRaw)) : 'Chưa có';
                                const patientPhone = patient?.phone || patient?.phoneNumber || patient?.mobile || appointment?.patientPhone || '';
                                const patientEmail = patient?.email || patient?.Email || appointment?.patientEmail || '';
                                const patientAddress = patient?.address || patient?.homeAddress || patient?.addressLine || appointment?.patientAddress || '';


                                return (
                                    <Card className="mb-4">
                                        <Card.Header className="bg-primary text-white">
                                            <h6 className="mb-0">
                                                <i className="fas fa-barcode me-2" /> Mã vạch mẫu xét nghiệm
                                            </h6>
                                        </Card.Header>
                                        <Card.Body>
                                            <Row className="g-3">
                                                <Col xs={12} md={6}>
                                                    <div className="d-flex flex-column align-items-center">
                                                        <div style={{ width: '100%', maxWidth: '300px', marginBottom: '8px' }}>
                                                            <div className="d-flex justify-content-center">
                                                                <div>
                                                                    <BarcodeDisplay
                                                                        value={(normalizedBarcode && String(normalizedBarcode).trim()) || (rawValue && String(rawValue).trim()) || (sample && sample.id ? String(sample.id) : '')}
                                                                        width={2}
                                                                        height={80}
                                                                        displayValue={true}
                                                                        showActions={true}
                                                                    />
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </Col>
                                                <Col xs={12} md={6}>
                                                    <div>
                                                        <h6 className="mb-3 d-flex align-items-center"><i className="fas fa-info-circle me-2 text-primary"></i><span>Thông tin đầy đủ</span></h6>
                                                        <div className="mb-3 p-3" style={{ background: 'linear-gradient(135deg, rgba(13, 110, 253, 0.05) 0%, rgba(13, 202, 240, 0.05) 100%)', borderRadius: '8px', border: '1px solid rgba(13, 110, 253, 0.2)'}}>
                                                            <h6 className="fw-bold mb-2 text-primary" style={{ fontSize: '0.95rem'}}><i className="fas fa-vial me-2" /> Mẫu xét nghiệm</h6>
                                                            <div className="mb-1" style={{ fontFamily: 'Segoe UI, Roboto, "Helvetica Neue", Arial, sans-serif', fontSize: '0.95rem' }}><span className="text-muted">Trạng thái:</span> <span className="fw-semibold"><StatusBadge entity="sample" status={sample && (sample.status || sample.state)} /></span></div>
                                                            <div className="mb-1" style={{ fontFamily: 'Segoe UI, Roboto, "Helvetica Neue", Arial, sans-serif', fontSize: '0.95rem' }}><span className="text-muted">Loại mẫu:</span> <span className="fw-semibold">{sample ? formatSampleType(sample.sampleType || sample.type) : '—'}</span></div>
                                                            <div className="mb-1" style={{ fontFamily: 'Segoe UI, Roboto, "Helvetica Neue", Arial, sans-serif', fontSize: '0.95rem' }}><span className="text-muted">Ngày lấy mẫu:</span> <span className="fw-semibold">{sample && (sample.collectedAt || sample.createdAt) ? (formatDateTime(sample.collectedAt || sample.createdAt) || (sample.collectedAt || sample.createdAt)) : '—'}</span></div>
                                                        </div>

                                                        <div className="mb-2 p-3" style={{ background: 'linear-gradient(135deg, rgba(25, 135, 84, 0.05) 0%, rgba(13, 202, 240, 0.05) 100%)', borderRadius: '8px', border: '1px solid rgba(25, 135, 84, 0.2)'}}>
                                                            <h6 className="fw-bold mb-2 text-success" style={{ fontSize: '0.9rem' }}><i className="fas fa-user me-2" /> Thông tin bệnh nhân</h6>
                                                            <div className="mb-1"><small className="text-muted d-block">Họ và tên:</small><span className="fw-bold">{patientName}</span></div>
                                                            <div className="mb-1"><small className="text-muted d-block">Ngày sinh:</small><span className="fw-medium">{patientDobDisplay}</span></div>
                                                            <div className="mb-1"><small className="text-muted d-block">Số điện thoại:</small><span className="fw-medium">{patientPhone ? patientPhone : 'Chưa có'}</span></div>
                                                            <div className="mb-1"><small className="text-muted d-block">Email:</small><span className="fw-medium">{patientEmail ? patientEmail : 'Chưa có'}</span></div>
                                                            
                                                        </div>
                                                    </div>
                                                </Col>
                                            </Row>

                                            {sample?.notes && (
                                                <Row className="mt-3"><Col md={12}>
                                                    <div className="p-3" style={{ background: 'linear-gradient(135deg, rgba(255, 193, 7, 0.05) 0%, rgba(255, 152, 0, 0.05) 100%)', borderRadius: '8px', border: '1px solid rgba(255, 193, 7, 0.2)'}}>
                                                        <h6 className="fw-bold mb-2 text-warning" style={{ fontSize: '0.9rem'}}><i className="fas fa-sticky-note me-2"></i>Ghi chú</h6>
                                                        <p className="mb-0">{translateToVietnamese(sample.notes)}</p>
                                                    </div>
                                                </Col></Row>
                                            )}
                                        </Card.Body>
                                    </Card>
                                );
                            })()}
                            {/* Appointment detail (tabs removed) */}
                        </>
                    ) : (
                        <div className="text-center py-3">Đang tải chi tiết lịch hẹn...</div>
                    )}
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowDetailModal(false)}><i className="fas fa-times me-2"></i>Đóng</Button>
                </Modal.Footer>
            </Modal>

            {/* Modal Chi tiết mẫu (đầy đủ) */}
            <Modal
                show={showSampleDetailModal}
                onHide={() => { setShowSampleDetailModal(false); setSampleDetailData(null); setSampleDetailDecodedBarcode(null); setSampleDetailBarcodeVerified(false); setShowSampleRawJson(false); }}
                size="lg"
                centered
            >
                <Modal.Header closeButton>
                    <Modal.Title>
                        <i className="fas fa-vial me-2 text-primary"></i>
                        Chi tiết mẫu xét nghiệm
                    </Modal.Title>
                    
                </Modal.Header>
                <Modal.Body>
                    {sampleDetailData && sampleDetailData.sample ? (
                        <div>
                            {(() => {
                                const sample = sampleDetailData.sample || {};
                                const rawBarcode = (sample.barcode || sample.code || sample.sample_code || sample.barcodeValue || sample.barcode_id || sample.barcode_value || sample.barcodeString || sample.barcode_str || sample.barcode_text || null) || (sample.id ? String(sample.id) : null) || '';
                                const rawValue = String(rawBarcode || '').trim();
                                const normalizedBarcode = formatBarcodeValueLocal(rawValue) || (rawValue ? rawValue.replace(/[^A-Z0-9]/gi, '').toUpperCase() : '');
                                const aptId = sample.appointmentId || sample.appointment_id || null;
                                const appointment = (appointments || []).find(a => String(a.id) === String(aptId));
                                
                                const patientName = getPatientNameFromSample(sample);
                                const patientId = getPatientIdFromSample(sample);

                                const patient = patientMap[patientId] || (appointment ? patientMap[appointment.patientId] : null);
                                const patientDobRaw = patient?.dateOfBirth || patient?.dob || appointment?.patientDob || appointment?.dob || sample?.patientDob || sample?.dob || null;
                                const patientDobDisplay = patientDobRaw ? (formatDateOnly(patientDobRaw) || String(patientDobRaw)) : 'Chưa có';

                                // Phone / Email / Address extraction (support many common field names)
                                const patientPhone = patient?.phone || patient?.phoneNumber || patient?.mobile || patient?.phone_number || patient?.mobilePhone || appointment?.patientPhone || sample?.phone || sample?.patientPhone || '';
                                const patientEmail = patient?.email || patient?.Email || appointment?.patientEmail || sample?.email || sample?.patientEmail || '';
                                const patientAddress = patient?.address || patient?.homeAddress || patient?.addressLine || patient?.streetAddress || appointment?.patientAddress || sample?.address || sample?.patientAddress || '';

                                return (
                                    <>
                                        <Card className="mb-4">
                                            <Card.Header className="bg-primary text-white">
                                                <h6 className="mb-0">
                                                    <i className="fas fa-barcode me-2" /> Mã vạch mẫu xét nghiệm
                                                </h6>
                                            </Card.Header>
                                            <Card.Body>
                                                <Row className="g-3">
                                                    <Col xs={12} md={6}>
                                                        <div className="d-flex flex-column align-items-center">
                                                            <div style={{ width: '100%', maxWidth: '300px', marginBottom: '8px' }}>
                                                                <div className="d-flex justify-content-center">
                                                                    <div>
                                                                        <BarcodeDisplay
                                                                            value={(normalizedBarcode && String(normalizedBarcode).trim()) || (rawValue && String(rawValue).trim()) || (sample.id ? String(sample.id) : '')}
                                                                            width={2}
                                                                            height={80}
                                                                            displayValue={true}
                                                                            showActions={true}
                                                                        />
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </Col>
                                                    <Col xs={12} md={6}>
                                                        <div>
                                                            <h6 className="mb-3 d-flex align-items-center"><i className="fas fa-info-circle me-2 text-primary"></i><span>Thông tin đầy đủ</span></h6>
                                                            <div className="mb-3 p-3" style={{ background: 'linear-gradient(135deg, rgba(13, 110, 253, 0.05) 0%, rgba(13, 202, 240, 0.05) 100%)', borderRadius: '8px', border: '1px solid rgba(13, 110, 253, 0.2)'}}>
                                                                <h6 className="fw-bold mb-2 text-primary" style={{ fontSize: '0.95rem'}}><i className="fas fa-vial me-2" /> Mẫu xét nghiệm</h6>
                                                                <div className="mb-1" style={{ fontFamily: 'Segoe UI, Roboto, "Helvetica Neue", Arial, sans-serif', fontSize: '0.95rem' }}><span className="text-muted">Trạng thái:</span> <span className="fw-semibold"><StatusBadge entity="sample" status={sample && (sample.status || sample.state)} /></span></div>
                                                                <div className="mb-1" style={{ fontFamily: 'Segoe UI, Roboto, "Helvetica Neue", Arial, sans-serif', fontSize: '0.95rem' }}><span className="text-muted">Loại mẫu:</span> <span className="fw-semibold">{sample ? formatSampleType(sample.sampleType || sample.type) : '—'}</span></div>
                                                                <div className="mb-1" style={{ fontFamily: 'Segoe UI, Roboto, "Helvetica Neue", Arial, sans-serif', fontSize: '0.95rem' }}><span className="text-muted">Ngày lấy mẫu:</span> <span className="fw-semibold">{sample && (sample.collectedAt || sample.createdAt) ? (formatDateTime(sample.collectedAt || sample.createdAt) || (sample.collectedAt || sample.createdAt)) : '—'}</span></div>
                                                            </div>

                                                            <div className="mb-2 p-3" style={{ background: 'linear-gradient(135deg, rgba(25, 135, 84, 0.05) 0%, rgba(13, 202, 240, 0.05) 100%)', borderRadius: '8px', border: '1px solid rgba(25, 135, 84, 0.2)'}}>
                                                                <h6 className="fw-bold mb-2 text-success" style={{ fontSize: '0.9rem' }}><i className="fas fa-user me-2" /> Thông tin bệnh nhân</h6>
                                                                <div className="mb-1"><small className="text-muted d-block">Họ và tên:</small><span className="fw-bold">{patientName}</span></div>
                                                                <div className="mb-1"><small className="text-muted d-block">Ngày sinh:</small><span className="fw-medium">{patientDobDisplay}</span></div>
                                                                <div className="mb-1"><small className="text-muted d-block">Số điện thoại:</small><span className="fw-medium">{patientPhone ? patientPhone : 'Chưa có'}</span></div>
                                                                <div className="mb-1"><small className="text-muted d-block">Email:</small><span className="fw-medium">{patientEmail ? patientEmail : 'Chưa có'}</span></div>
                                                                
                                                            </div>
                                                        </div>
                                                    </Col>
                                                </Row>

                                                {sample.notes && (
                                                    <Row className="mt-3"><Col md={12}>
                                                        <div className="p-3" style={{ background: 'linear-gradient(135deg, rgba(255, 193, 7, 0.05) 0%, rgba(255, 152, 0, 0.05) 100%)', borderRadius: '8px', border: '1px solid rgba(255, 193, 7, 0.2)'}}>
                                                            <h6 className="fw-bold mb-2 text-warning" style={{ fontSize: '0.9rem'}}><i className="fas fa-sticky-note me-2"></i>Ghi chú</h6>
                                                            <p className="mb-0">{translateToVietnamese(sample.notes)}</p>
                                                        </div>
                                                    </Col></Row>
                                                )}

                                                {/* Package info - show above the test info section */}
                                                {(sampleDetailData && (sampleDetailData.packageCriteria || sampleDetailData.packageObj)) && (
                                                    <Row className="mt-3"><Col md={12}>
                                                        <Card className="mb-3 border-0 shadow-sm overflow-hidden" style={{ background: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)' }}>
                                                            <Card.Body className="p-4">
                                                                <div className="d-flex align-items-start">
                                                                    <div className="me-3" style={{ 
                                                                        width: '56px', 
                                                                        height: '56px', 
                                                                        background: 'rgba(255, 255, 255, 0.6)', 
                                                                        borderRadius: '16px',
                                                                        display: 'flex',
                                                                        alignItems: 'center',
                                                                        justifyContent: 'center',
                                                                        backdropFilter: 'blur(10px)',
                                                                        boxShadow: '0 4px 12px 0 rgba(0, 0, 0, 0.08)'
                                                                    }}>
                                                                        <i className="fas fa-flask" style={{ fontSize: '1.75rem', color: '#667eea' }}></i>
                                                                    </div>
                                                                    <div className="flex-grow-1">
                                                                        <div className="d-flex align-items-center mb-2">
                                                                            <span className="badge" style={{ 
                                                                                background: 'rgba(255, 255, 255, 0.7)',
                                                                                color: '#667eea',
                                                                                fontSize: '0.75rem',
                                                                                fontWeight: 600,
                                                                                padding: '6px 12px',
                                                                                borderRadius: '20px',
                                                                                textTransform: 'uppercase',
                                                                                letterSpacing: '0.5px'
                                                                            }}>
                                                                                Gói xét nghiệm
                                                                            </span>
                                                                        </div>
                                                                        <h4 className="mb-3 fw-bold" style={{ 
                                                                            color: '#2d3748',
                                                                            fontSize: '1.35rem',
                                                                            letterSpacing: '0.3px',
                                                                            textShadow: 'none'
                                                                        }}>
                                                                            {(sampleDetailData.packageCriteria && (sampleDetailData.packageCriteria.name || sampleDetailData.packageCriteria.packageName)) || (sampleDetailData.packageObj && (sampleDetailData.packageObj.name || sampleDetailData.packageObj.packageName)) || getAppointmentServiceLabel(appointment)}
                                                                        </h4>
                                                                        {(sampleDetailData.packageCriteria && (sampleDetailData.packageCriteria.description || sampleDetailData.packageCriteria.summary || sampleDetailData.packageCriteria.notes)) && (
                                                                            <div className="d-flex align-items-start" style={{ 
                                                                                background: 'rgba(255, 255, 255, 0.6)',
                                                                                borderRadius: '12px',
                                                                                padding: '14px 16px',
                                                                                backdropFilter: 'blur(10px)'
                                                                            }}>
                                                                                <i className="fas fa-info-circle me-2 mt-1" style={{ color: '#667eea', opacity: 0.8, fontSize: '1rem' }}></i>
                                                                                <div style={{ 
                                                                                    color: '#4a5568', 
                                                                                    fontSize: '0.95rem', 
                                                                                    lineHeight: '1.7',
                                                                                    opacity: 1
                                                                                }}>
                                                                                    {sampleDetailData.packageCriteria.description || sampleDetailData.packageCriteria.summary || sampleDetailData.packageCriteria.notes}
                                                                                </div>
                                                                            </div>
                                                                        )}
                                                                        {(sampleDetailData.packageObj && (sampleDetailData.packageObj.description || sampleDetailData.packageObj.summary || sampleDetailData.packageObj.notes)) && (
                                                                            <div className="d-flex align-items-start" style={{ 
                                                                                background: 'rgba(255, 255, 255, 0.6)',
                                                                                borderRadius: '12px',
                                                                                padding: '14px 16px',
                                                                                backdropFilter: 'blur(10px)'
                                                                            }}>
                                                                                <i className="fas fa-info-circle me-2 mt-1" style={{ color: '#667eea', opacity: 0.8, fontSize: '1rem' }}></i>
                                                                                <div style={{ 
                                                                                    color: '#4a5568', 
                                                                                    fontSize: '0.95rem', 
                                                                                    lineHeight: '1.7',
                                                                                    opacity: 1
                                                                                }}>
                                                                                    {sampleDetailData.packageObj.description || sampleDetailData.packageObj.summary || sampleDetailData.packageObj.notes}
                                                                                </div>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </Card.Body>
                                                        </Card>
                                                    </Col></Row>
                                                )}
                                            </Card.Body>
                                        </Card>

                                        {/* Tests / package criteria table (bottom) - only render when sample status is result_entered */}
                                        {(() => {
                                            const sampleStatusRaw = String(sample.status || sample.state || '').trim().toLowerCase();
                                            const sampleStatusNormalized = sampleStatusRaw.replace(/\s+/g, '_').replace(/-/g, '_');
                                            if (sampleStatusNormalized !== 'result_entered') return null;

                                            return (
                                                <Card className="mb-3">
                                                    <Card.Body>
                                                        <h6 className="mb-3">Thông tin xét nghiệm</h6>
                                                        <div className="mb-2 small text-muted">Gói: {sampleDetailData.packageCriteria?.name || sampleDetailData.packageCriteria?.packageName || getAppointmentServiceLabel(appointment) || '—'}</div>
                                                        <Table size="sm" striped bordered>
                                                            <thead><tr><th>Tên</th><th>Kết quả</th><th>Đơn vị / Giới hạn nhập liệu</th></tr></thead>
                                                            <tbody>
                                                                {(sampleDetailData.tests || []).map(t => {
                                                                    const rawParam = t?.raw?.paramRaw || t?.paramRaw || t?.raw || {};
                                                                    const candidateValues = [
                                                                        t.value, t.result,
                                                                        rawParam.value, rawParam.Value, rawParam.ValueString, rawParam.ValueNumber, rawParam.value_number, rawParam.val, rawParam.result,
                                                                        rawParam.param_value, rawParam.ParameterValue
                                                                    ];
                                                                    const displayVal = candidateValues.find(v => v !== undefined && v !== null && String(v).trim() !== '') ?? '';
                                                                    const displayText = (displayVal !== undefined && displayVal !== null && String(displayVal).trim() !== '') ? String(displayVal) : '—';
                                                                    return (
                                                                        <tr key={String(t.id || t.testId || Math.random())}>
                                                                            <td>{t.name || t.testName || '—'}</td>
                                                                            <td><span className="fw-bold">{displayText}</span></td>
                                                                            <td className="small text-muted">{t.unit || ''}<br/>{t.refRange || t.reference || t.ref || ''}</td>
                                                                        </tr>
                                                                    );
                                                                })}
                                                            </tbody>
                                                        </Table>
                                                    </Card.Body>
                                                </Card>
                                            );
                                        })()}
                                    </>
                                );
                            })()}
                        </div>
                    ) : (
                        <div className="text-center py-3">Đang tải chi tiết mẫu...</div>
                    )}
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => { setShowSampleDetailModal(false); setSampleDetailData(null); }}><i className="fas fa-times me-2"></i>Đóng</Button>
                    {(() => {
                        try {
                            const sample = sampleDetailData?.sample || {};
                            const aptId = String(sample.appointmentId || sample.appointment_id || sampleDetailData?.appointmentId || sampleDetailData?.appointment_id || '');
                            const loadingForApt = resultsLoadingMap && resultsLoadingMap[aptId];
                            const hasRes = (appointmentResultsMap && appointmentResultsMap[aptId] && Array.isArray(appointmentResultsMap[aptId]) && appointmentResultsMap[aptId].length > 0);
                            if (String(sample.status || sample.state || '').toLowerCase() === 'completed') {
                                if (loadingForApt) return (<Button variant="light" disabled><Spinner animation="border" size="sm" /></Button>);
                                if (!hasRes) {
                                    return (
                                        <Button variant="primary" onClick={() => { if (sampleDetailData && sampleDetailData.sample) { handleOpenResults(sampleDetailData.sample.id || sampleDetailData.sample.sampleId || sampleDetailData.sample.sample_id); setShowSampleDetailModal(false); } }}>
                                            <i className="fas fa-vial me-2"></i>Nhập KQ
                                        </Button>
                                    );
                                }
                            }
                        } catch (e) { /* ignore */ }
                        return null;
                    })()}
                </Modal.Footer>
            </Modal>

            {/* Modal Sửa mẫu (thay bằng modal từ SampleManagement, đã điều chỉnh để dùng sampleEditForm) */}
            <Modal
                show={showSampleEditModal}
                onHide={() => { setShowSampleEditModal(false); setSampleEditForm(null); }}
                onExited={() => { setSampleEditErrors({}); }}
                size="lg"
                centered
            >
                <Modal.Header closeButton>
                    <Modal.Title>
                        <FaEdit className="me-2 text-warning" />
                        Sửa thông tin mẫu xét nghiệm
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {sampleEditLoading ? (
                        <div className="text-center py-4"><div className="spinner-border text-primary" role="status"></div><div className="mt-2 text-muted">Đang tải thông tin mẫu...</div></div>
                    ) : sampleEditForm ? (
                        <Form>
                            {/* Patient Information (read-only) */}
                            <Card className="mb-3 border-primary">
                                <Card.Header className="bg-primary text-white">
                                    <h6 className="mb-0"><FaUser className="me-2" />Thông tin bệnh nhân</h6>
                                </Card.Header>
                                <Card.Body>
                                    <Row>
                                        <Col md={6}>
                                            <div className="mb-2"><strong className="text-primary">Họ và tên:</strong><div className="text-dark">{sampleEditForm.patientName || '—'}</div></div>
                                        </Col>
                                        {sampleEditForm.patientEmail && (
                                            <Col md={6}><div className="mb-2"><strong className="text-primary">Email:</strong><div className="text-dark">{sampleEditForm.patientEmail}</div></div></Col>
                                        )}
                                        {sampleEditForm.patientPhone && (
                                            <Col md={6}><div className="mb-2"><strong className="text-primary">Số điện thoại:</strong><div className="text-dark">{sampleEditForm.patientPhone}</div></div></Col>
                                        )}
                                        {sampleEditForm.patientDob && (
                                            <Col md={6}><div className="mb-2"><strong className="text-primary">Ngày sinh:</strong><div className="text-dark">{formatDateOnly(sampleEditForm.patientDob) || '—'}</div></div></Col>
                                        )}
                                        {sampleEditForm.barcode && (
                                            <Col md={12} className="mt-2">
                                                <div className="mb-2"><strong className="text-primary">Mã vạch mẫu:</strong>
                                                    <div className="mt-2" style={{ maxWidth: '260px' }}>
                                                        <BarcodeDisplay
                                                            value={formatBarcodeValueLocal(sampleEditForm.barcode)}
                                                            format="CODE128"
                                                            width={2}
                                                            height={50}
                                                            displayValue={true}
                                                            margin={4}
                                                            className="w-100"
                                                        />
                                                    </div>
                                                </div>
                                            </Col>
                                        )}
                                        <Col md={6} className="mt-2">
                                            <div className="mb-2"><strong className="text-primary">Ngày lấy mẫu:</strong>
                                                <div className="text-dark">{sampleEditForm.collectedAt ? formatDateTime(sampleEditForm.collectedAt) : (sampleEditForm.createdAt ? formatDateTime(sampleEditForm.createdAt) : 'Chưa có')}</div>
                                            </div>
                                        </Col>
                                    </Row>
                                </Card.Body>
                            </Card>

                            {/* Edit form */}
                            <Card className="border-warning">
                                <Card.Header className="bg-warning text-dark">
                                    <h6 className="mb-0"><FaEdit className="me-2" />Chỉnh sửa thông tin mẫu</h6>
                                </Card.Header>
                                <Card.Body>
                                    <Row>
                                        <Col md={6}>
                                            <Form.Group className="mb-3">
                                                <Form.Label className="fw-bold">Loại mẫu <span className="text-danger">*</span></Form.Label>
                                                <Form.Select name="sampleType" size="sm" value={sampleEditForm.sampleType || ''} onChange={(e) => setSampleEditForm(prev => ({ ...prev, sampleType: e.target.value }))} isInvalid={!!(sampleEditErrors && sampleEditErrors.sampleType)}>
                                                    {['blood', 'serum', 'plasma', 'urine', 'swab', 'other'].map(opt => (
                                                        <option key={opt} value={opt}>{formatSampleType(opt)}</option>
                                                    ))}
                                                </Form.Select>
                                                {sampleEditErrors && sampleEditErrors.sampleType && <Form.Control.Feedback type="invalid" className="d-block">{sampleEditErrors.sampleType}</Form.Control.Feedback>}
                                            </Form.Group>
                                        </Col>
                                        <Col md={6}>
                                            <Form.Group className="mb-3">
                                                <Form.Label className="fw-bold">Thể tích (ml) <span className="text-danger">*</span></Form.Label>
                                                <Form.Control name="volume" size="sm" type="number" min={1} value={sampleEditForm.volume || 5} onChange={(e) => setSampleEditForm(prev => ({ ...prev, volume: Number(e.target.value) }))} isInvalid={!!(sampleEditErrors && sampleEditErrors.volume)} />
                                                {sampleEditErrors && sampleEditErrors.volume && <Form.Control.Feedback type="invalid" className="d-block">{sampleEditErrors.volume}</Form.Control.Feedback>}
                                            </Form.Group>
                                        </Col>

                                        <Col md={12}>
                                            <Form.Group className="mb-3">
                                                <Form.Label className="fw-bold">Trạng thái</Form.Label>
                                                <Form.Select name="status" size="sm" value={sampleEditForm.status || 'pending'} onChange={(e) => setSampleEditForm(prev => ({ ...prev, status: e.target.value }))}>
                                                    <option value="pending">Đang chờ</option>
                                                    <option value="waiting">Chờ xử lý</option>
                                                    <option value="collected">Đã lấy mẫu</option>
                                                    <option value="processing">Đang xử lý</option>
                                                    <option value="completed">Hoàn thành</option>
                                                </Form.Select>
                                            </Form.Group>
                                        </Col>

                                        {/* Barcode field removed per request */}

                                        <Col md={12}>
                                            <Form.Group className="mb-3">
                                                <Form.Label className="fw-bold">Ghi chú</Form.Label>
                                                <Form.Control name="notes" as="textarea" rows={3} value={sampleEditForm.notes || ''} onChange={(e) => setSampleEditForm(prev => ({ ...prev, notes: e.target.value }))} />
                                            </Form.Group>
                                        </Col>
                                    </Row>
                                </Card.Body>
                            </Card>
                        </Form>
                    ) : (
                        <div className="text-center py-3">Đang tải mẫu...</div>
                    )}
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => { setShowSampleEditModal(false); setSampleEditForm(null); }} disabled={savingSampleEdit}>Hủy</Button>
                    <Button variant="primary" onClick={handleSaveSampleEdit} disabled={savingSampleEdit}>
                        {savingSampleEdit ? (<><Spinner animation="border" size="sm" className="me-2" />Đang lưu...</>) : (<><FaCheckCircle className="me-2" />Lưu thay đổi</>)}
                    </Button>
                </Modal.Footer>
            </Modal>

            {/* Modal xác nhận hoàn tất xét nghiệm */}
            <Modal show={showCompleteSampleModal} onHide={() => setShowCompleteSampleModal(false)} centered>
                <Modal.Header closeButton className="bg-warning text-dark">
                    <Modal.Title><FaExclamationTriangle className="me-2" />Xác nhận hoàn tất xét nghiệm</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <p className="mb-0">Bạn có chắc chắn muốn hoàn tất xét nghiệm cho mẫu này?</p>
                    <p className="text-muted small mt-2 mb-0">Hành động này sẽ cập nhật trạng thái mẫu thành <strong>Hoàn tất</strong>.</p>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowCompleteSampleModal(false)}>
                        <FaTimes className="me-1" /> Hủy
                    </Button>
                    <Button variant="success" onClick={confirmCompleteSample}>
                        <FaCheckCircle className="me-1" /> Xác nhận
                    </Button>
                </Modal.Footer>
            </Modal>
        </Container>
    );
};

export default AdminAppointments;