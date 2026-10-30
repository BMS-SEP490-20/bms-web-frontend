import React, { useState, useEffect, useCallback } from 'react';
import { Container, Row, Col, Card, Table, Badge, Button, Modal, Form, Alert, Spinner } from 'react-bootstrap';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../shared/contexts/AuthContext';
import { useNotificationContext } from '../../../shared/contexts/NotificationContext';
import { patientService } from '../../../services/patientService';
import { testOrderService } from '../../../services/testOrderService';
import { doctorService } from '../../services/doctorService';
import { labTestService } from '../../../services/labTestService';
import { formatLabTestCode } from '../../shared/utils/format/formatHelper';
import { APPOINTMENT_STATUS } from '../../shared/constants/status';
import useResponsive from '../../shared/hooks/useResponsive';
import { setRefreshFlag, dispatchRefreshEvent } from '../../shared/hooks/useAutoRefresh';

// --- MASTER DATA: CHUẨN Y KHOA QUỐC TẾ (WHO / MAYO CLINIC / ADA) ---
// Đơn vị và khoảng tham chiếu dành cho người trưởng thành khỏe mạnh.
const STANDARD_CRITERIA_MAP = {
    // --- 1. TIỂU ĐƯỜNG & TUYẾN GIÁP ---
    "CRI441512": { name: "Glucose (Fasting)", min: 70, max: 99, unit: "mg/dL" }, // ADA: 100+ là tiền tiểu đường
    "CRI051935": { name: "HbA1c", min: 4.0, max: 5.6, unit: "%" }, // ADA: >= 5.7 là tiền tiểu đường
    "CRI016631": { name: "Insulin (Fasting)", min: 2.6, max: 24.9, unit: "µIU/mL" },
    "CRI171039": { name: "TSH", min: 0.4, max: 4.0, unit: "µIU/mL" }, // American Thyroid Assoc
    "CRI013168": { name: "Free T4", min: 0.9, max: 1.7, unit: "ng/dL" },
    "CRI773647": { name: "Free T3", min: 2.0, max: 4.4, unit: "pg/mL" },

    // --- 2. CHỨC NĂNG GAN (LIVER PANEL) ---
    "CRI897060": { name: "ALT (SGPT)", min: 7, max: 55, unit: "U/L" }, // Mayo Clinic
    "CRI502589": { name: "AST (SGOT)", min: 8, max: 48, unit: "U/L" },
    "CRI073542": { name: "GGT", min: 9, max: 48, unit: "U/L" },
    "CRI966044": { name: "ALP (Alkaline Phos)", min: 44, max: 147, unit: "U/L" },
    "CRI571965": { name: "Anti-HCV", min: 0, max: 0.99, unit: "index" }, // <1.0 là Âm tính
    "CRI672303": { name: "HBsAg", min: 0, max: 0.99, unit: "index" }, // <1.0 là Âm tính

    // --- 3. CHỨC NĂNG THẬN & ĐIỆN GIẢI ---
    "CRI803959": { name: "Creatinine", min: 0.6, max: 1.3, unit: "mg/dL" }, // Bao trùm Nam/Nữ
    "CRI347159": { name: "Uric Acid", min: 2.4, max: 7.0, unit: "mg/dL" }, // Bao trùm Nam/Nữ
    "CRI540981": { name: "Sodium (Na+)", min: 135, max: 145, unit: "mmol/L" },
    "CRI869790": { name: "Potassium (K+)", min: 3.6, max: 5.2, unit: "mmol/L" },
    "CRI872437": { name: "Chloride (Cl-)", min: 96, max: 106, unit: "mmol/L" },
    "CRI928224": { name: "Calcium (Total)", min: 8.6, max: 10.3, unit: "mg/dL" },
    "CRI849406": { name: "Phosphate (PO4)", min: 2.5, max: 4.5, unit: "mg/dL" },
    "CRI887270": { name: "Magnesium", min: 1.7, max: 2.2, unit: "mg/dL" },

    // --- 4. CÔNG THỨC MÁU (CBC) ---
    // Lưu ý: Dùng khoảng rộng (Inclusive) của cả Nam và Nữ để tránh báo sai
    "CRI941438": { name: "WBC (Bạch cầu)", min: 4.5, max: 11.0, unit: "10^3/µL" },
    "CRI570441": { name: "RBC (Hồng cầu)", min: 3.90, max: 5.70, unit: "10^6/µL" }, // Min Nữ - Max Nam
    "CRI516637": { name: "Hemoglobin (Hb)", min: 12.0, max: 17.5, unit: "g/dL" }, // Min Nữ - Max Nam
    "CRI948163": { name: "Hematocrit (HCT)", min: 36.0, max: 53.0, unit: "%" }, // Min Nữ - Max Nam
    "CRI121186": { name: "Platelets (PLT)", min: 150, max: 450, unit: "10^3/µL" },
    "CRI571201": { name: "MCV", min: 80, max: 100, unit: "fL" },
    "CRI895158": { name: "MCH", min: 27, max: 33, unit: "pg" },
    "CRI546570": { name: "MCHC", min: 32, max: 36, unit: "g/dL" },
    "CRI702335": { name: "RDW", min: 11.5, max: 14.5, unit: "%" },
    "CRI573742": { name: "MPV", min: 7.4, max: 10.4, unit: "fL" },

    // --- 5. BẠCH CẦU (Differential) ---
    "CRI555788": { name: "Neutrophils %", min: 40, max: 70, unit: "%" },
    "CRI468709": { name: "Lymphocytes %", min: 20, max: 40, unit: "%" },
    "CRI431029": { name: "Monocytes %", min: 2, max: 8, unit: "%" },
    "CRI870099": { name: "Eosinophils %", min: 1, max: 4, unit: "%" },
    "CRI779576": { name: "Basophils %", min: 0, max: 1, unit: "%" },

    // --- 6. MỠ MÁU & TIM MẠCH (LIPID & CARDIAC) ---
    "CRI595579": { name: "Cholesterol Total", min: 100, max: 200, unit: "mg/dL" }, // <200 là tốt
    "CRI619589": { name: "Triglycerides", min: 0, max: 149, unit: "mg/dL" }, // <150 là tốt
    "CRI232336": { name: "HDL Cholesterol", min: 40, max: 100, unit: "mg/dL" }, // >40 (Nam), >50 (Nữ) là tốt
    "CRI632580": { name: "LDL Cholesterol", min: 0, max: 129, unit: "mg/dL" }, // <100 Tối ưu, 100-129 Cận tối ưu
    "CRI703073": { name: "CRP (C-Reactive Protein)", min: 0, max: 5.0, unit: "mg/L" }, // Chuẩn viêm thường
    "CRI528199": { name: "D-Dimer", min: 0, max: 500, unit: "ng/mL" }, // <500 loại trừ huyết khối

    // --- 7. ĐÔNG MÁU & MIỄN DỊCH ---
    "CRI517936": { name: "INR", min: 0.8, max: 1.2, unit: "ratio" }, // Người bình thường không dùng thuốc
    "CRI798493": { name: "aPTT", min: 30, max: 40, unit: "seconds" },
    "CRI587326": { name: "Fibrinogen", min: 200, max: 400, unit: "mg/dL" },
    "CRI354985": { name: "ESR (Máu lắng)", min: 0, max: 20, unit: "mm/h" }, // Nữ <20, Nam <15
    "CRI474817": { name: "RF (Rheumatoid Factor)", min: 0, max: 14, unit: "IU/mL" }, // Thường < 14-20
    "CRI294100": { name: "ANA", min: 0, max: 0.99, unit: "index" }, // Âm tính
    "CRI923584": { name: "HIV Ag/Ab Combo", min: 0, max: 0.99, unit: "index" } // Âm tính
};

// --- CONSTANTS ---
const MIN_DIAGNOSIS_LENGTH = 10;
const MAX_DIAGNOSIS_LENGTH = 1000;
const MAX_NOTE_LENGTH = 500;
const DANGEROUS_CHARS_REGEX = /[<>{}[\]\\$]/;

const DoctorPatientProfile = () => {
    const { patientId, appointmentId } = useParams();
    const { user } = useAuth();
    const { showSuccess, showError, showWarning } = useNotificationContext();
    const navigate = useNavigate();
    const { isMobile, isTablet } = useResponsive();

    // --- States ---
    const [loading, setLoading] = useState(true);
    const [accessError, setAccessError] = useState('');
    const [patientInfo, setPatientInfo] = useState(null);
    const [labResults, setLabResults] = useState([]);

    // Modal States
    const [showResultModal, setShowResultModal] = useState(false);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [loadingDetails, setLoadingDetails] = useState(false);
    const [selectedResult, setSelectedResult] = useState(null);
    const [testParameters, setTestParameters] = useState([]);
    const [approving, setApproving] = useState(false);
    const [doctorProfile, setDoctorProfile] = useState(null);

    // Safety Check State
    const [isConfirmedCheckbox, setIsConfirmedCheckbox] = useState(false);

    // Form Data
    const [consultationData, setConsultationData] = useState({
        diagnosis: '',
        recommendations: '',
    });

    // Validation State
    const [formErrors, setFormErrors] = useState({});
    const [abnormalStats, setAbnormalStats] = useState({ high: 0, low: 0, total: 0 });

    // --- Helpers for Display ---
    const STATUS_CONFIG = {
        [APPOINTMENT_STATUS.PENDING_PAYMENT]: { variant: 'warning', text: 'Chờ thanh toán', icon: 'fa-credit-card' },
        [APPOINTMENT_STATUS.SCHEDULED]: { variant: 'info', text: 'Đã đặt lịch', icon: 'fa-calendar-alt' },
        [APPOINTMENT_STATUS.CONFIRMED]: { variant: 'primary', text: 'Đã xác nhận', icon: 'fa-calendar-check' },
        [APPOINTMENT_STATUS.CHECKED_IN]: { variant: 'primary', text: 'Đã Check-in', icon: 'fa-user-check' },
        [APPOINTMENT_STATUS.SAMPLE_COLLECTED]: { variant: 'info', text: 'Đã lấy mẫu', icon: 'fa-vial' },
        [APPOINTMENT_STATUS.SAMPLE_PROCESSED]: { variant: 'info', text: 'Đã xử lý mẫu', icon: 'fa-microscope' },
        [APPOINTMENT_STATUS.RESULT_PENDING]: { variant: 'warning', text: 'Chờ duyệt', icon: 'fa-flask' },
        [APPOINTMENT_STATUS.READY_FOR_CONSULTATION]: { variant: 'success', text: 'Sẵn sàng tư vấn', icon: 'fa-notes-medical' },
        [APPOINTMENT_STATUS.COMPLETED]: { variant: 'success', text: 'Đã được duyệt', icon: 'fa-check-circle' },
        [APPOINTMENT_STATUS.NO_SHOW]: { variant: 'danger', text: 'Không đến', icon: 'fa-user-slash' },
        [APPOINTMENT_STATUS.CANCELLED]: { variant: 'danger', text: 'Đã hủy', icon: 'fa-times-circle' },
        'pending_confirmation': { variant: 'secondary', text: 'Chờ xác nhận', icon: 'fa-hourglass-start' },
        'result_entered': { variant: 'warning', text: 'Đã nhập kết quả', icon: 'fa-hourglass-start' },
        'waiting_review': { variant: 'warning', text: 'Chờ duyệt', icon: 'fa-hourglass-start' }
    };

    /**
     * Gets status badge component for appointment/test result status
     * 
     * This function returns a React Badge component configured with the appropriate
     * variant, text, and icon based on the status. It handles status normalization
     * to match keys in STATUS_CONFIG.
     * 
     * @param {string} status - Status string (case-insensitive)
     * @returns {React.ReactNode} Badge component with status display
     * 
     * @example
     * getStatusBadge('completed') // Returns: <Badge bg="success">Đã được duyệt</Badge>
     */
    const getStatusBadge = (status) => {
        const key = String(status).toLowerCase();
        const normalizedKey = Object.keys(STATUS_CONFIG).find(k => k.toLowerCase() === key) || key;
        const conf = STATUS_CONFIG[normalizedKey] || { variant: 'secondary', text: status, icon: 'fa-circle' };
        return (
            <Badge bg={conf.variant} className="px-3 py-2 rounded-pill fw-normal d-inline-flex align-items-center gap-2">
                <i className={`fas ${conf.icon}`}></i> {conf.text}
            </Badge>
        );
    };

    /**
     * Safely renders a value as string, handling null/undefined
     * 
     * This utility function converts any value to a string, returning
     * empty string for null or undefined values to prevent rendering errors.
     * 
     * @param {*} value - Value to render (can be any type)
     * @returns {string} String representation of value, or empty string if null/undefined
     * 
     * @example
     * safeRender(123) // Returns: '123'
     * safeRender(null) // Returns: ''
     */
    const safeRender = (value) => {
        if (value === null || value === undefined) return '';
        return String(value);
    };

    /**
     * Formats gender value to Vietnamese text
     * 
     * This utility function converts gender values (English or Vietnamese)
     * to standardized Vietnamese display text.
     * 
     * **Gender mappings:**
     * - 'male' → "Nam"
     * - 'female' → "Nữ"
     * - Default → "Khác"
     * 
     * @param {string} gender - Gender value (can be English or Vietnamese)
     * @returns {string} Vietnamese gender text ("Nam", "Nữ", or "Khác")
     * 
     * @example
     * formatGender('male') // Returns: 'Nam'
     * formatGender('female') // Returns: 'Nữ'
     */
    const formatGender = (gender) => {
        if (!gender) return '---';
        const g = String(gender).toLowerCase().trim();
        if (g === 'male') return 'Nam';
        if (g === 'female') return 'Nữ';
        return 'Khác';
    };

    /**
     * Evaluates test result value against reference range (strict medical standards)
     * 
     * This function evaluates a test parameter value against its reference range
     * (min, max) according to strict medical standards. It performs:
     * 1. Validates input value exists and is numeric
     * 2. Validates reference range (min, max) are numeric
     * 3. Compares value against range using strict comparison
     * 4. Returns evaluation status: 'normal', 'low', 'high', or 'unknown'
     * 
     * **Evaluation logic:**
     * - If value < min → 'low'
     * - If value > max → 'high'
     * - If min <= value <= max → 'normal'
     * - If value is invalid or range is invalid → 'unknown' or 'normal'
     * 
     * @param {number|string} value - Test parameter value to evaluate
     * @param {number|string} min - Minimum reference value
     * @param {number|string} max - Maximum reference value
     * @returns {string} Evaluation status: 'normal', 'low', 'high', or 'unknown'
     * 
     * @example
     * evaluateResult(120, 70, 99) // Returns: 'high' (glucose above normal)
     * evaluateResult(85, 70, 99) // Returns: 'normal' (glucose within range)
     * evaluateResult(60, 70, 99) // Returns: 'low' (glucose below normal)
     */
    const evaluateResult = (value, min, max) => {
        // 1. Kiểm tra giá trị đầu vào có tồn tại không
        if (value === null || value === undefined || String(value).trim() === '') return 'unknown';

        const numVal = parseFloat(value);
        const numMin = parseFloat(min);
        const numMax = parseFloat(max);

        // 2. Kiểm tra tính hợp lệ của số
        if (isNaN(numVal)) return 'unknown';
        if (isNaN(numMin) || isNaN(numMax)) return 'normal'; // Nếu không có chuẩn thì mặc định bình thường

        // 3. So sánh chính xác (Strict comparison)
        if (numVal < numMin) return 'low';
        if (numVal > numMax) return 'high';

        return 'normal';
    };

    /**
     * Loads patient profile data, lab results, and doctor information
     * 
     * This function is the core data fetching function for the doctor patient profile page.
     * It performs the following operations:
     * 1. Fetches doctor profile by email
     * 2. Fetches patient information by patientId
     * 3. Fetches lab test results by appointmentId
     * 4. Sorts results by creation date (newest first)
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
        if (!user || !user.email) return;
        setLoading(true);
        setAccessError('');

        try {
            // 1. Doctor Info
            try {
                const docRes = await doctorService.getDoctorByEmail(user.email);
                if (docRes.success && docRes.data) {
                    const data = Array.isArray(docRes.data) ? docRes.data[0] : docRes.data;
                    setDoctorProfile(data);
                }
            } catch (e) {
            }

            // 2. Patient Info
            if (patientId) {
                const pRes = await patientService.getPatientById(patientId);
                if (pRes.success) setPatientInfo(pRes.data);
            }

            // 3. Lab Results
            if (appointmentId) {
                const res = await testOrderService.getResultsByAppointment(appointmentId);
                if (res.success && Array.isArray(res.data)) {
                    const sorted = res.data.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
                    setLabResults(sorted);
                }
            }
        } catch (err) {
            setAccessError("Lỗi tải dữ liệu hồ sơ.");
        } finally {
            setLoading(false);
        }
    }, [user, patientId, appointmentId]);

    /**
     * Effect hook: Loads data when component mounts or dependencies change
     * 
     * This effect automatically loads patient profile data, lab results, and
     * doctor information when the component mounts or when loadData function
     * reference changes.
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
    useEffect(() => {
        loadData();
    }, [loadData]);

    /**
     * Handles viewing test result details and enriches with standard medical criteria
     * 
     * This function opens the result details modal and loads test parameters for a
     * specific test result. It performs the following operations:
     * 1. Sets selected result and opens modal
     * 2. Fetches test parameters from API
     * 3. Enriches parameters with standard medical criteria from STANDARD_CRITERIA_MAP
     * 4. Maps API data to standardized format (name, refMin, refMax, unit)
     * 5. Prioritizes standard data over API data for accuracy
     * 
     * The enrichment process ensures that test parameters are evaluated against
     * internationally recognized medical standards (WHO, Mayo Clinic, ADA).
     * 
     * @param {Object} result - Test result object containing testResultId
     * @returns {Promise<void>} Does not return a value. Updates modal state and test parameters.
     * 
     * @example
     * // View details for a test result
     * await handleViewResultDetails(labResult);
     */
    const handleViewResultDetails = async (result) => {
        setSelectedResult(result);
        setShowResultModal(true);
        setLoadingDetails(true);
        setFormErrors({});
        setConsultationData({ diagnosis: '', recommendations: '' });
        setTestParameters([]);

        try {
            const testId = result.testResultId || result.test_result_id || result.id;
            const paramRes = await testOrderService.getTestParametersByResultId(testId);

            if (paramRes.success) {
                const rawParams = Array.isArray(paramRes.data) ? paramRes.data : (paramRes.data?.data || []);

                // MAPPING DATA: Kết hợp dữ liệu từ API với dữ liệu chuẩn (STANDARD_CRITERIA_MAP)
                const enrichedParams = rawParams.map((p) => {
                    const criteriaId = p.criteriaId || p.criteria_id || p.testCriterionId;

                    // Tra cứu trong bộ dữ liệu chuẩn
                    const standardData = STANDARD_CRITERIA_MAP[criteriaId];

                    if (standardData) {
                        // NẾU CÓ DỮ LIỆU CHUẨN => DÙNG NÓ (GHI ĐÈ DỮ LIỆU API)
                        return {
                            ...p,
                            criteriaId: criteriaId,
                            criteriaName: standardData.name, // Dùng tên chuẩn quốc tế
                            refMin: standardData.min,        // Dùng Min chuẩn
                            refMax: standardData.max,        // Dùng Max chuẩn
                            stdUnit: standardData.unit,      // Dùng Đơn vị chuẩn
                            isStandardized: true             // Cờ đánh dấu đã chuẩn hóa
                        };
                    }

                    // Fallback: Nếu không tìm thấy trong Map (giữ nguyên data từ API)
                    return {
                        ...p,
                        refMin: p.referenceMin || p.min,
                        refMax: p.referenceMax || p.max,
                        stdUnit: p.unit || p.abbreviation,
                        criteriaName: p.criteriaName || p.paramName,
                        isStandardized: false
                    };
                });

                setTestParameters(enrichedParams);
            } else {
                showWarning("Không tải được thông số xét nghiệm.");
            }
        } catch (e) {
            showError("Lỗi khi tải chi tiết kết quả.");
        } finally {
            setLoadingDetails(false);
        }
    };

    /**
     * Validates consultation form data
     * 
     * This function validates the consultation form (diagnosis and recommendations)
     * according to medical record standards. It checks:
     * 1. Diagnosis is not empty
     * 2. Diagnosis length is within limits (MIN_DIAGNOSIS_LENGTH to MAX_DIAGNOSIS_LENGTH)
     * 3. Recommendations length is within limits (max MAX_NOTE_LENGTH)
     * 4. No dangerous characters (HTML/script injection prevention)
     * 
     * Sets formErrors state with validation errors.
     * 
     * @returns {boolean} True if form is valid, false otherwise
     * 
     * @example
     * if (validateForm()) {
     *   // Form is valid, proceed with approval
     * }
     */
    const validateForm = () => {
        const errors = {};
        const { diagnosis, recommendations } = consultationData;

        if (!diagnosis || !diagnosis.trim()) errors.diagnosis = "Vui lòng nhập kết luận chẩn đoán.";
        else if (diagnosis.length < MIN_DIAGNOSIS_LENGTH) errors.diagnosis = `Tối thiểu ${MIN_DIAGNOSIS_LENGTH} ký tự.`;
        else if (diagnosis.length > MAX_DIAGNOSIS_LENGTH) errors.diagnosis = `Tối đa ${MAX_DIAGNOSIS_LENGTH} ký tự.`;
        else if (DANGEROUS_CHARS_REGEX.test(diagnosis)) errors.diagnosis = "Chứa ký tự không hợp lệ.";

        if (recommendations && recommendations.length > MAX_NOTE_LENGTH) errors.recommendations = `Tối đa ${MAX_NOTE_LENGTH} ký tự.`;
        else if (recommendations && DANGEROUS_CHARS_REGEX.test(recommendations)) errors.recommendations = "Chứa ký tự không hợp lệ.";

        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    /**
     * Calculates statistics for abnormal test results
     * 
     * This function analyzes test parameters and counts how many results
     * are above or below the reference range. It uses evaluateResult to
     * determine if each parameter is 'high', 'low', or 'normal'.
     * 
     * **Statistics calculated:**
     * - high: Count of parameters above reference range
     * - low: Count of parameters below reference range
     * - total: Total number of parameters analyzed
     * 
     * @returns {Object} Object with high, low, and total counts
     * 
     * @example
     * const stats = calculateAbnormalStats();
     * // Returns: { high: 2, low: 1, total: 10 }
     */
    const calculateAbnormalStats = () => {
        let high = 0;
        let low = 0;
        testParameters.forEach(p => {
            // Sử dụng refMin/refMax đã được chuẩn hóa
            const status = evaluateResult(p.value, p.refMin, p.refMax);
            if (status === 'high') high++;
            if (status === 'low') low++;
        });
        return { high, low, total: testParameters.length };
    };

    /**
     * Initiates the approval confirmation workflow
     * 
     * This function validates the consultation form and prepares for approval.
     * It performs the following operations:
     * 1. Validates form data (diagnosis, recommendations)
     * 2. Calculates abnormal statistics for test parameters
     * 3. Opens confirmation modal with statistics
     * 
     * **Validation:**
     * - Form must pass validateForm() checks
     * - Selected result must exist
     * 
     * @returns {void} Does not return a value. Opens confirmation modal if validation passes.
     * 
     * @example
     * // Called when user clicks "Duyệt kết quả" button
     * confirmAndApprove();
     */
    const confirmAndApprove = () => {
        if (!selectedResult) return;
        if (!validateForm()) {
            showError('Vui lòng kiểm tra lại thông tin nhập liệu.');
            return;
        }

        // Tính toán thống kê
        const stats = calculateAbnormalStats();
        setAbnormalStats(stats);

        setIsConfirmedCheckbox(false);
        setShowConfirmModal(true);
    };

    /**
     * Handles final approval of test result and creates medical record
     * 
     * This function performs the final approval process when the doctor confirms
     * the approval in the confirmation modal. It performs the following operations:
     * 1. Creates a medical record with diagnosis and recommendations
     * 2. Updates test result status to 'Completed'
     * 3. Sets approvedBy and doctorNotes
     * 4. Dispatches refresh events to notify other components
     * 5. Reloads data to show updated status
     * 
     * The function handles errors gracefully and provides user feedback.
     * 
     * @returns {Promise<void>} Does not return a value. Updates backend and shows notifications.
     * 
     * @example
     * // Called when user confirms approval in modal
     * await onConfirmApprove();
     */
    const onConfirmApprove = async () => {
        setShowConfirmModal(false);
        if (!selectedResult) return;

        try {
            setApproving(true);
            const testId = selectedResult.testResultId || selectedResult.test_result_id || selectedResult.id;
            const currentDoctorId = doctorProfile?.doctorId || user.id;
            const currentDoctorName = doctorProfile?.fullName || user.fullName || 'Bác sĩ';
            const mrId = `MR-${Date.now().toString().slice(-8)}`;

            // 1. Create Medical Record
            const fullDescription = consultationData.recommendations
                ? `${consultationData.recommendations}`
                : 'Không có ghi chú thêm';

            const medicalRecordPayload = {
                patientId: patientId,
                recordType: 'diagnosis',
                title: appointmentId,
                description: fullDescription,
                recordData: JSON.stringify({ diagnosis: consultationData.diagnosis }),
                status: 'Active',
                onsetDate: new Date().toISOString().split('T')[0],
                endDate: new Date().toISOString().split('T')[0],
                createdBy: currentDoctorId,
                verifiedBy: currentDoctorId
            };

            const recordRes = await patientService.createMedicalRecord(medicalRecordPayload);
            if (!recordRes.success) throw new Error("Lỗi tạo bệnh án: " + recordRes.message);

            // 2. Approve Lab Test
            const updatePayload = {
                status: 'Completed',
                approvedBy: currentDoctorId,
                doctorName: currentDoctorName,
                doctorNotes: `Đã lưu bệnh án ID: ${mrId}. Chẩn đoán: ${consultationData.diagnosis}`,
                appointmentId: appointmentId,
                diagnosis: consultationData.diagnosis,
                deviceId: selectedResult.deviceId || '',
                quantity: selectedResult.quantity || 1
            };

            const labRes = await labTestService.approveTestResult(testId, updatePayload);
            if (labRes.success) {
                showSuccess('✅ Duyệt kết quả và tạo bệnh án thành công.');
                setShowResultModal(false);
                
                // Dispatch events to notify MyResults to refresh
                setRefreshFlag('results');
                dispatchRefreshEvent('testResults', 'approved', { 
                    testResultId: testId,
                    appointmentId: appointmentId 
                });
                // Delay to ensure backend has processed the approval
                setTimeout(() => {
                    window.dispatchEvent(new CustomEvent('testResultApproved', {
                        detail: { 
                            testResultId: testId,
                            appointmentId: appointmentId 
                        }
                    }));
                }, 1000);
                
                loadData();
            } else {
                showWarning('⚠️ Tạo bệnh án thành công nhưng lỗi cập nhật lab status.');
                loadData();
            }
        } catch (e) {
            showError(e.message || 'Lỗi hệ thống.');
        } finally {
            setApproving(false);
        }
    };

    if (loading) return <Container className="pt-5 text-center"><Spinner animation="border" /></Container>;
    if (accessError) return <Container className="pt-5"><Alert variant="danger">{accessError}</Alert></Container>;

    return (
        <Container fluid className="py-4 px-4 bg-light" style={{ 
          minHeight: '100vh',
          overflowX: 'hidden', 
          maxWidth: '100%', 
          width: '100%',
          boxSizing: 'border-box'
        }}>
            <div className="d-flex justify-content-between align-items-center mb-4">
                <div>
                    <Button variant="link" className="text-decoration-none p-0 mb-2 text-muted" onClick={() => navigate('/doctor/dashboard')}>
                        <i className="fas fa-arrow-left me-2"></i> Dashboard
                    </Button>
                    <h2 className="text-primary fw-bold mb-0"><i className="fas fa-user-injured me-2"></i>Hồ sơ Bệnh nhân</h2>
                </div>
            </div>

            <Row className="g-4">
                <Col lg={4}>
                    <Card className="border-0 shadow-sm rounded-4 h-100">
                        <Card.Body className="p-4 text-center">
                            <div className="rounded-circle bg-primary-subtle text-primary d-inline-flex align-items-center justify-content-center mb-3" style={{ width: '80px', height: '80px', fontSize: '2rem' }}>
                                {patientInfo?.fullName?.charAt(0) || 'BN'}
                            </div>
                            <h4 className="fw-bold">{patientInfo?.fullName || `Patient ${patientId}`}</h4>
                            <p className="text-muted small">Mã BN: {patientId}</p>
                            <hr />
                            <div className="text-start px-3">
                                <p className="mb-2"><strong>Giới tính:</strong> {formatGender(patientInfo?.gender)}</p>
                                <p className="mb-2"><strong>Ngày sinh:</strong> {patientInfo?.dob || '---'}</p>
                                <p className="mb-2"><strong>SĐT:</strong> {patientInfo?.phone || '---'}</p>
                            </div>
                        </Card.Body>
                    </Card>
                </Col>

                <Col lg={8}>
                    <Card className="border-0 shadow-sm rounded-4 h-100">
                        <Card.Header className="bg-white py-3"><h5 className="mb-0 fw-bold text-primary">Kết quả Xét nghiệm</h5></Card.Header>
                        <Card.Body className="p-0">
                            {labResults.length > 0 ? (
                                <Table hover className="mb-0 align-middle">
                                    <thead className="bg-light">
                                        <tr>
                                            <th className="ps-4">Mã KQ</th>
                                            <th>Ngày tạo</th>
                                            <th>Trạng thái</th>
                                            <th className="text-end pe-4">Hành động</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {labResults.map((test, idx) => (
                                            <tr key={test.testResultId || test.id || idx}>
                                                <td className="ps-4"><code className="bg-light px-2 rounded border">{formatLabTestCode(test.testResultId || test.id)}</code></td>
                                                <td>{test.createdAt ? new Date(test.createdAt).toLocaleDateString('vi-VN') : '-'}</td>
                                                <td>{getStatusBadge(test.status)}</td>
                                                <td className="text-end pe-4">
                                                    <Button size="sm" variant="outline-primary" className="rounded-pill px-3" onClick={() => handleViewResultDetails(test)}>
                                                        Xem <i className="fas fa-chevron-right ms-1"></i>
                                                    </Button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </Table>
                            ) : <div className="p-5 text-center text-muted">Chưa có kết quả nào.</div>}
                        </Card.Body>
                    </Card>
                </Col>
            </Row>

            {/* Main Details Modal */}
            <Modal show={showResultModal} onHide={() => setShowResultModal(false)} size="xl" backdrop="static">
                <Modal.Header closeButton><Modal.Title>Chi tiết & Chẩn đoán</Modal.Title></Modal.Header>
                <Modal.Body className="p-4">
                    {loadingDetails ? (
                        <div className="text-center py-5">
                            <Spinner animation="border" variant="primary" />
                            <p className="mt-2 text-muted">Đang tải và đối chiếu dữ liệu chuẩn...</p>
                        </div>
                    ) : (
                        selectedResult && (
                            <Row>
                                <Col md={12} className="mb-3">
                                    <Alert variant="info" className="border-0 bg-info-subtle">
                                        <Row>
                                            <Col md={4}><strong>Mã KQ:</strong> {selectedResult.testResultId || selectedResult.id}</Col>
                                            <Col md={4}><strong>Trạng thái:</strong> {getStatusBadge(selectedResult.status)}</Col>
                                            <Col md={4}><strong>Ngày tạo:</strong> {selectedResult.createdAt ? new Date(selectedResult.createdAt).toLocaleString('vi-VN') : '---'}</Col>
                                        </Row>
                                    </Alert>
                                </Col>

                                <Col md={12} className="mb-4">
                                    <h6 className="fw-bold text-secondary">
                                        Chỉ số xét nghiệm
                                        <Badge bg="success" className="ms-2">Chuẩn Quốc Tế (Adults)</Badge>
                                    </h6>
                                    <div className="table-responsive border rounded" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                                        <Table hover size="sm" className="mb-0 align-middle">
                                            <thead className="table-light sticky-top">
                                                <tr>
                                                    <th className="ps-3">Tên chỉ số</th>
                                                    <th className="text-center">Kết quả</th>
                                                    <th className="text-center">Đơn vị</th>
                                                    <th className="text-center">Tham chiếu</th>
                                                    <th className="text-center pe-3">Đánh giá</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {testParameters.length > 0 ? testParameters.map((p, idx) => {
                                                    // Logic đánh giá nghiêm ngặt theo chuẩn y tế
                                                    const status = evaluateResult(p.value, p.refMin, p.refMax);

                                                    let rowClass = '';
                                                    let badgeBg = 'secondary';
                                                    let badgeText = '---';
                                                    let valColor = 'text-muted';

                                                    if (status === 'normal') {
                                                        badgeBg = 'success'; badgeText = 'Bình thường'; valColor = 'text-dark fw-bold';
                                                    } else if (status === 'low') {
                                                        rowClass = 'table-warning'; badgeBg = 'warning'; badgeText = 'Thấp'; valColor = 'text-danger fw-bold';
                                                    } else if (status === 'high') {
                                                        rowClass = 'table-danger'; badgeBg = 'danger'; badgeText = 'Cao'; valColor = 'text-danger fw-bold';
                                                    } else if (status === 'unknown') {
                                                        badgeBg = 'light'; badgeText = 'Chưa có KQ'; valColor = 'text-muted fst-italic';
                                                    }

                                                    return (
                                                        <tr key={p.paramId || idx} className={rowClass}>
                                                            <td className="fw-bold ps-3">{p.criteriaName}</td>
                                                            <td className={`text-center ${valColor}`}>{safeRender(p.value) || '-'}</td>
                                                            <td className="text-center text-muted">{p.stdUnit}</td>
                                                            <td className="text-center text-secondary">
                                                                {(p.refMin !== undefined && p.refMax !== undefined)
                                                                    ? `${p.refMin} - ${p.refMax}`
                                                                    : 'N/A'}
                                                            </td>
                                                            <td className="text-center pe-3">
                                                                <Badge bg={badgeBg} text={status === 'unknown' ? 'dark' : 'white'}>{badgeText}</Badge>
                                                            </td>
                                                        </tr>
                                                    );
                                                }) : <tr><td colSpan="5" className="text-center py-3">Không có dữ liệu.</td></tr>}
                                            </tbody>
                                        </Table>
                                    </div>
                                </Col>

                                {!['completed', 'approved'].includes(String(selectedResult.status).toLowerCase()) ? (
                                    <Col md={12}>
                                        <Card className="border-primary shadow-sm">
                                            <Card.Header className="bg-primary text-white fw-bold">Lập Bệnh Án</Card.Header>
                                            <Card.Body>
                                                <Form>
                                                    <Form.Group className="mb-3">
                                                        <Form.Label className="fw-bold">Chẩn đoán <span className="text-danger">*</span></Form.Label>
                                                        <Form.Control
                                                            as="textarea" rows={3}
                                                            spellCheck={true}
                                                            value={consultationData.diagnosis}
                                                            onChange={e => setConsultationData({ ...consultationData, diagnosis: e.target.value })}
                                                            isInvalid={!!formErrors.diagnosis}
                                                            placeholder="Nhập kết luận chẩn đoán (tối thiểu 10 ký tự)..."
                                                        />
                                                        <Form.Control.Feedback type="invalid">{formErrors.diagnosis}</Form.Control.Feedback>
                                                    </Form.Group>
                                                    <Form.Group className="mb-3">
                                                        <Form.Label className="fw-bold">Lời khuyên / Ghi chú thêm</Form.Label>
                                                        <Form.Control
                                                            as="textarea" rows={3}
                                                            spellCheck={true}
                                                            value={consultationData.recommendations}
                                                            onChange={e => setConsultationData({ ...consultationData, recommendations: e.target.value })}
                                                            isInvalid={!!formErrors.recommendations}
                                                            placeholder="Ghi chú thêm cho bệnh nhân..."
                                                        />
                                                        <Form.Control.Feedback type="invalid">{formErrors.recommendations}</Form.Control.Feedback>
                                                    </Form.Group>
                                                </Form>
                                            </Card.Body>
                                        </Card>
                                    </Col>
                                ) : (
                                    <Col md={12}>
                                        <Alert variant="success" className="text-center mb-0">
                                            <i className="fas fa-check-circle me-2 fa-lg"></i>
                                            <strong>Kết quả này đã được duyệt và bệnh án đã được lưu.</strong>
                                        </Alert>
                                    </Col>
                                )}
                            </Row>
                        )
                    )}
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowResultModal(false)}>Đóng</Button>
                    {selectedResult && ['waiting_review', 'pending_review', 'result_pending', 'result_entered'].includes(String(selectedResult?.status).toLowerCase()) && (
                        <Button variant="success" onClick={confirmAndApprove} disabled={approving}>
                            {approving ? <Spinner size="sm" animation="border" /> : <><i className="fas fa-file-medical me-2"></i>Lưu Bệnh Án & Hoàn tất</>}
                        </Button>
                    )}
                </Modal.Footer>
            </Modal>

            {/* Modal Xác Nhận Duyệt */}
            <Modal show={showConfirmModal} onHide={() => setShowConfirmModal(false)} centered backdrop="static">
                <Modal.Header className="bg-warning text-dark border-0">
                    <Modal.Title className="fw-bold"><i className="fas fa-exclamation-triangle me-2"></i>XÁC NHẬN DUYỆT</Modal.Title>
                </Modal.Header>
                <Modal.Body className="p-4">
                    <div className="text-center mb-4">
                        <i className="fas fa-file-medical-alt fa-4x text-warning mb-3"></i>
                        <h5 className="fw-bold">Xác nhận duyệt kết quả này?</h5>
                        <p className="text-muted">Hành động này sẽ cập nhật trạng thái hồ sơ thành <span className="fw-bold text-success">Đã được duyệt</span>.</p>
                    </div>

                    {(abnormalStats.high > 0 || abnormalStats.low > 0) ? (
                        <div className="alert alert-danger border-danger bg-danger-subtle text-dark">
                            <h6 className="fw-bold text-danger"><i className="fas fa-biohazard me-2"></i>Cảnh báo chỉ số bất thường:</h6>
                            <ul className="mb-0 small">
                                {abnormalStats.high > 0 && <li>Có <strong>{abnormalStats.high}</strong> chỉ số <span className="text-danger fw-bold">CAO</span> hơn mức tham chiếu.</li>}
                                {abnormalStats.low > 0 && <li>Có <strong>{abnormalStats.low}</strong> chỉ số <span className="text-warning fw-bold" style={{ filter: 'brightness(0.5)' }}>THẤP</span> hơn mức tham chiếu.</li>}
                            </ul>
                            <div className="mt-2 text-danger small fst-italic">Vui lòng chắc chắn rằng bạn đã xem xét kỹ các chỉ số này.</div>
                        </div>
                    ) : (
                        <div className="alert alert-success border-success bg-success-subtle text-success d-flex align-items-center">
                            <i className="fas fa-check-circle fa-lg me-3"></i>
                            <div>Tất cả {abnormalStats.total} chỉ số đều nằm trong giới hạn bình thường.</div>
                        </div>
                    )}

                    <div className="mt-4 p-3 bg-white rounded border border-warning-subtle">
                        <Form.Check
                            type="checkbox"
                            id="safety-check"
                            label={<span className="fw-bold text-dark">Tôi đã kiểm tra kỹ các chỉ số và xác nhận nội dung chẩn đoán là chính xác.</span>}
                            checked={isConfirmedCheckbox}
                            onChange={(e) => setIsConfirmedCheckbox(e.target.checked)}
                            className="user-select-none"
                        />
                    </div>
                </Modal.Body>
                <Modal.Footer className="border-0 bg-light justify-content-center gap-3 pb-4">
                    <Button variant="outline-secondary" className="px-4 rounded-pill" onClick={() => setShowConfirmModal(false)}>Hủy bỏ</Button>
                    <Button
                        variant="primary"
                        className="px-4 rounded-pill fw-bold shadow-sm"
                        onClick={onConfirmApprove}
                        disabled={!isConfirmedCheckbox}
                    >
                        <i className="fas fa-check-circle me-2"></i>Xác nhận Duyệt
                    </Button>
                </Modal.Footer>
            </Modal>
        </Container>
    );
};

export default DoctorPatientProfile;