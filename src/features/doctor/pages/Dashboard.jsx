/**
 * Doctor Dashboard
 * * UI POLISHED VERSION - STRICT FILTERING MODE
 * * Đồng bộ Logic & UI với DoctorSchedule
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Container, Row, Col, Card, Table, Button, Badge, Spinner, Modal, Form } from 'react-bootstrap';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../shared/contexts/AuthContext';
import { useNotificationContext } from '../../shared/contexts/NotificationContext';
import { appointmentService } from '../../services/appointmentService';
import { doctorService } from '../../services/doctorService';
import { shiftService } from '../../services/shiftService';
import { patientService } from '../../services/patientService';
import { testOrderService } from '../../services/testOrderService';
import { labTestService } from '../../services/labTestService';
import api from '../../services/api';
import { APPOINTMENT_STATUS } from '../../shared/constants/status';
import useResponsive from '../../shared/hooks/useResponsive';
import { useAutoRefresh, setRefreshFlag, dispatchRefreshEvent } from '../../shared/hooks/useAutoRefresh';

const DoctorDashboard = () => {
    const { user } = useAuth();
    const { showError } = useNotificationContext();
    const navigate = useNavigate();
    const { isMobile, isTablet } = useResponsive();

    // --- State ---
    const [loading, setLoading] = useState(true);
    const [doctorProfile, setDoctorProfile] = useState(null);
    const [appointments, setAppointments] = useState([]);
    const [filteredAppointments, setFilteredAppointments] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeFilterTab, setActiveFilterTab] = useState('all');

    // State for Doctor Digital Approval Modal
    const [showApproveModal, setShowApproveModal] = useState(false);
    const [selectedApproveApt, setSelectedApproveApt] = useState(null);
    const [approving, setApproving] = useState(false);
    const [digitalSig, setDigitalSig] = useState('');
    const [doctorNotes, setDoctorNotes] = useState('');

    const handleOpenApproveModal = (apt) => {
        setSelectedApproveApt(apt);
        setDoctorNotes('');
        const sigCode = `DOC-SIG-${user?.id || 'DR'}-${Date.now().toString(36).toUpperCase()}`;
        setDigitalSig(sigCode);
        setShowApproveModal(true);
    };

    const handleCloseApproveModal = () => {
        setShowApproveModal(false);
        setSelectedApproveApt(null);
    };

    const handleConfirmApprove = async () => {
        if (!selectedApproveApt) return;
        try {
            setApproving(true);
            const targetId = selectedApproveApt.testResultId || selectedApproveApt.id || selectedApproveApt.appointmentId;
            const payload = {
                approvedBy: user?.id || 'Doctor',
                doctorName: doctorProfile?.fullName || user?.fullName || 'Bác sĩ điều trị',
                approverRole: 'Doctor',
                digitalSignature: digitalSig || `DOC-SIG-${Date.now().toString(36).toUpperCase()}`,
                doctorNotes: doctorNotes || 'Bác sĩ đã thẩm định kết quả, đối chiếu lâm sàng và đồng ý ký duyệt xuất bản kết quả.',
                appointmentId: selectedApproveApt.id || selectedApproveApt.appointmentId
            };

            const res = await labTestService.approveTestResult(targetId, payload);
            if (res.success) {
                setAppointments(prev => prev.map(a => 
                    (a.id === selectedApproveApt.id || a.appointmentId === selectedApproveApt.id)
                        ? { ...a, status: 'completed' }
                        : a
                ));
                handleCloseApproveModal();
                loadData();
            } else {
                showError(res.message || 'Không thể phê duyệt kết quả xét nghiệm.');
            }
        } catch (err) {
            console.error('Lỗi duyệt kết quả:', err);
            showError('Lỗi hệ thống khi phê duyệt kết quả xét nghiệm.');
        } finally {
            setApproving(false);
        }
    };

    const [stats, setStats] = useState({
        total: 0,
        pending: 0,
        completed: 0,
        today: 0
    });

    // --- Helpers ---
    /**
     * Formats time string to HH:MM format
     * 
     * This utility function extracts and formats time strings to display
     * in HH:MM format. If the input already contains a colon, it takes
     * the first 5 characters (HH:MM). Otherwise, returns the string as-is.
     * 
     * @param {string|number} t - Time value to format (can be string or number)
     * @returns {string} Formatted time string in HH:MM format, or empty string if input is falsy
     * 
     * @example
     * toHHMM('07:30:00') // Returns: '07:30'
     * toHHMM('07:30') // Returns: '07:30'
     * toHHMM(null) // Returns: ''
     */
    const toHHMM = (t) => {
        if (!t) return '';
        const str = String(t);
        return str.includes(':') ? str.slice(0, 5) : str;
    };

    /**
     * Gets shift name based on start time
     * 
     * This function determines the shift name (Ca sáng, Ca chiều, Ca tối)
     * based on the start hour of the shift. Used to display shift information
     * in a user-friendly way.
     * 
     * **Shift classification:**
     * - Before 12:00 → "Ca sáng" (Morning shift)
     * - 12:00 - 16:59 → "Ca chiều" (Afternoon shift)
     * - 17:00 and later → "Ca tối" (Evening shift)
     * - Invalid time → "Ca trực" (General shift)
     * 
     * @param {string} displayTime - Time string in HH:MM format (e.g., '07:00', '14:30')
     * @returns {string} Shift name in Vietnamese
     * 
     * @example
     * getShiftName('07:00') // Returns: 'Ca sáng'
     * getShiftName('14:30') // Returns: 'Ca chiều'
     * getShiftName('18:00') // Returns: 'Ca tối'
     */
    const getShiftName = (displayTime) => {
        const startHour = parseInt((displayTime || '').split(':')[0]);
        if (isNaN(startHour)) return 'Ca trực';
        if (startHour < 12) return 'Ca sáng';
        if (startHour < 17) return 'Ca chiều';
        return 'Ca tối';
    };

    const STATUS_CONFIG = {
        [APPOINTMENT_STATUS.PENDING_PAYMENT]: { variant: 'warning', text: 'Chờ thanh toán', icon: 'fa-credit-card' },
        [APPOINTMENT_STATUS.SCHEDULED]: { variant: 'info', text: 'Đã đặt lịch', icon: 'fa-calendar-alt' },
        [APPOINTMENT_STATUS.CONFIRMED]: { variant: 'primary', text: 'Đã xác nhận', icon: 'fa-calendar-check' },
        [APPOINTMENT_STATUS.CHECKED_IN]: { variant: 'primary', text: 'Đã Check-in', icon: 'fa-user-check' },
        [APPOINTMENT_STATUS.SAMPLE_COLLECTED]: { variant: 'info', text: 'Đã lấy mẫu', icon: 'fa-vial' },
        [APPOINTMENT_STATUS.SAMPLE_PROCESSED]: { variant: 'info', text: 'Đã xử lý mẫu', icon: 'fa-microscope' },
        [APPOINTMENT_STATUS.RESULT_PENDING]: { variant: 'warning', text: 'Chờ duyệt', icon: 'fa-flask' },
        [APPOINTMENT_STATUS.READY_FOR_CONSULTATION]: { variant: 'warning', text: 'Sẵn sàng tư vấn', icon: 'fa-notes-medical' },
        [APPOINTMENT_STATUS.COMPLETED]: { variant: 'success', text: 'Đã được duyệt', icon: 'fa-check-circle' },
        [APPOINTMENT_STATUS.NO_SHOW]: { variant: 'danger', text: 'Không đến', icon: 'fa-user-slash' },
        [APPOINTMENT_STATUS.CANCELLED]: { variant: 'danger', text: 'Đã hủy', icon: 'fa-times-circle' },
        'pending_confirmation': { variant: 'secondary', text: 'Chờ xác nhận', icon: 'fa-hourglass-start' }
    };

    /**
     * Gets status badge component for appointment status
     * 
     * This function returns a React Badge component configured with the appropriate
     * variant, text, and icon based on the appointment status. It handles status
     * normalization to match keys in STATUS_CONFIG.
     * 
     * The badge displays appointment status in Vietnamese with a corresponding icon
     * and color-coded variant for visual distinction.
     * 
     * @param {string} status - Appointment status (case-insensitive)
     * @returns {React.ReactNode} Badge component with status display
     * 
     * @example
     * // Returns: <Badge bg="warning">Chờ thanh toán</Badge>
     * getStatusBadge('pending_payment')
     */
    const getStatusBadge = (status) => {
        const key = String(status || '').toLowerCase();
        const normalizedKey = Object.keys(STATUS_CONFIG).find(k => k.toLowerCase() === key) || key;
        const conf = STATUS_CONFIG[normalizedKey] || { variant: 'secondary', text: status, icon: 'fa-circle' };

        return (
            <Badge bg={conf.variant} className="px-3 py-2 rounded-pill fw-normal d-inline-flex align-items-center gap-2">
                <i className={`fas ${conf.icon}`}></i> {conf.text}
            </Badge>
        );
    };

    /**
     * Loads and enriches appointment data for the current doctor
     * 
     * This function is the core data fetching function for the doctor dashboard.
     * It performs the following operations:
     * 1. Retrieves doctor profile from email
     * 2. Fetches all shifts, appointments, patients, and test packages in parallel
     * 3. Filters shifts to only those assigned to the current doctor
     * 4. Creates lookup maps for patients and test packages
     * 5. Filters appointments strictly by doctor's shift IDs
     * 6. Enriches each appointment with:
     *    - Patient name from patient map
     *    - Service/test package name from package map
     *    - Display time from shift information
     *    - Display date formatted in Vietnamese locale
     * 7. Sorts appointments by priority status, then by creation date
     * 8. Calculates statistics (total, pending, completed, today)
     * 
     * The strict filtering ensures that only appointments linked to the doctor's
     * assigned shifts are displayed, preventing unauthorized access to other
     * doctors' appointments.
     * 
     * @returns {Promise<void>} Does not return a value. Updates component state with enriched data.
     * 
     * @example
     * // Load data when component mounts or user changes
     * await loadData();
     */
    const loadData = useCallback(async () => {
        if (!user || !user.email) return;
        setLoading(true);

        try {
            // 1. Identity & Doctor Profile
            let currentDoctorId = user.id;
            try {
                const docRes = await doctorService.getDoctorByEmail(user.email);
                if (docRes.success && docRes.data) {
                    const data = Array.isArray(docRes.data) ? docRes.data[0] : docRes.data;
                    if (data.doctorId || data.id) {
                        currentDoctorId = data.doctorId || data.id;
                        setDoctorProfile(data);
                    }
                }
            } catch (e) {}

            // 2. Fetch All Data in Parallel
            const [allShiftsRes, allAptRes, patientsRes, packagesRes] = await Promise.all([
                shiftService.getAllShifts(),
                appointmentService.getAllAppointments(),
                patientService.getAllPatients({ fetchAll: true }),
                testOrderService.getAllTestPackages({ fetchAll: true })
            ]);

            // --- A. Process SHIFTS (Strict Filter for Current Doctor) ---
            const allShifts = allShiftsRes?.data || [];
            const myShifts = allShifts.filter(s => {
                const shiftDocId = s.doctorId || s.doctor_id || s.DoctorId || s.doctor;
                return String(shiftDocId).trim() === String(currentDoctorId).trim();
            });

            // Tạo Set ID ca trực & Map thông tin ca trực để dùng hiển thị giờ
            const myShiftIdsSet = new Set();
            const shiftInfoMap = {}; // Map shiftId -> { displayTime, date }

            myShifts.forEach(s => {
                const sId = String(s.shiftId ?? s.shift_id ?? s.id);
                myShiftIdsSet.add(sId);

                const startTime = s.shiftStart ?? s.shift_start ?? s.startTime;
                const endTime = s.shiftEnd ?? s.shift_end ?? s.endTime;
                shiftInfoMap[sId] = {
                    displayTime: `${toHHMM(startTime)} - ${toHHMM(endTime)}`,
                    rawDate: s.shiftDate ?? s.shift_date ?? s.date
                };
            });

            // --- B. Create Lookup Maps ---
            const patientMap = {};
            if (patientsRes.success && Array.isArray(patientsRes.data)) {
                patientsRes.data.forEach(p => {
                    const key = p.id || p.patientId || p.userId;
                    if (key) patientMap[String(key)] = p;
                });
            }

            const packageMap = {};
            if (packagesRes.success && Array.isArray(packagesRes.data)) {
                packagesRes.data.forEach(p => {
                    const key = p.id || p.testPackageId || p.packageId;
                    if (key) packageMap[String(key)] = p;
                });
            }

            // --- C. Process APPOINTMENTS (Strict Filter using Shift IDs) ---
            const allApts = Array.isArray(allAptRes?.data) ? allAptRes.data : [];

            const strictFilteredApts = allApts.filter(apt => {
                const aptShiftId = String(apt.doctorShiftId ?? apt.doctor_shift_id ?? apt.shiftId ?? '').trim();
                // STRICT CHECK: Lịch hẹn phải có ID ca trực nằm trong danh sách ca của bác sĩ
                return aptShiftId && myShiftIdsSet.has(aptShiftId);
            });

            const enrichedApts = strictFilteredApts.map(apt => {
                // Resolve Shift Info
                const aptShiftId = String(apt.doctorShiftId ?? apt.doctor_shift_id ?? apt.shiftId ?? '');
                const shiftInfo = shiftInfoMap[aptShiftId] || {};

                // Resolve Patient
                const pId = String(apt.patientId || apt.patient_id || '');
                let pName = apt.patientName || apt.patient_name;
                if (pId && patientMap[pId]) {
                    pName = patientMap[pId].fullName || patientMap[pId].fullname || patientMap[pId].name;
                }

                // Resolve Service (Test Package)
                const pkgId = String(apt.testPackageId || apt.test_package_id || apt.packageId || '');
                let sName = apt.packageName || apt.serviceName || apt.testPackageName;
                if (pkgId && packageMap[pkgId]) {
                    sName = packageMap[pkgId].packageName || packageMap[pkgId].name || packageMap[pkgId].title;
                }

                return {
                    ...apt,
                    id: apt.id || apt.appointmentId,
                    finalPatientName: pName || `BN-${pId.substring(0, 6)}`,
                    finalServiceName: sName || 'Gói xét nghiệm',
                    // Ưu tiên hiển thị thời gian theo ca trực
                    displayTime: shiftInfo.displayTime || toHHMM(apt.appointmentTime),
                    displayDate: shiftInfo.rawDate ? new Date(shiftInfo.rawDate).toLocaleDateString('vi-VN') : new Date(apt.appointmentDate).toLocaleDateString('vi-VN'),
                    shiftRawDate: shiftInfo.rawDate // Dùng để tính stats today
                };
            });

            // Sort: By date (latest first), then by time (latest first)
            enrichedApts.sort((a, b) => {
                // Get raw dates for comparison
                const dateA = a.shiftRawDate || a.appointmentDate;
                const dateB = b.shiftRawDate || b.appointmentDate;
                
                // Parse dates
                const dateAObj = dateA ? new Date(dateA) : new Date(0);
                const dateBObj = dateB ? new Date(dateB) : new Date(0);
                
                // Compare dates first (latest first - descending)
                if (dateAObj.getTime() !== dateBObj.getTime()) {
                    return dateBObj.getTime() - dateAObj.getTime();
                }
                
                // If same date, compare by start time (latest first - descending)
                const getStartTime = (displayTime) => {
                    if (!displayTime) return 0;
                    // Extract start time from "07:00 - 11:00" format
                    const match = String(displayTime).match(/^(\d{1,2}):(\d{2})/);
                    if (match) {
                        return parseInt(match[1]) * 60 + parseInt(match[2]); // Convert to minutes
                    }
                    return 0;
                };
                
                const timeA = getStartTime(a.displayTime);
                const timeB = getStartTime(b.displayTime);
                
                return timeB - timeA;
            });

            setAppointments(enrichedApts);
            setFilteredAppointments(enrichedApts);

            // --- D. Calculate Stats ---
            const todayStr = new Date().toISOString().split('T')[0];
            setStats({
                total: enrichedApts.length,
                // Pending: Các trạng thái cần bác sĩ/kỹ thuật viên tác động
                pending: enrichedApts.filter(a => [
                    APPOINTMENT_STATUS.CHECKED_IN,
                    APPOINTMENT_STATUS.SAMPLE_COLLECTED,
                    APPOINTMENT_STATUS.RESULT_PENDING,
                    APPOINTMENT_STATUS.READY_FOR_CONSULTATION
                ].includes(a.status)).length,
                completed: enrichedApts.filter(a => a.status === APPOINTMENT_STATUS.COMPLETED).length,
                today: enrichedApts.filter(a => {
                    const d = a.shiftRawDate || a.appointmentDate;
                    return d && String(d).startsWith(todayStr);
                }).length
            });

        } catch (e) {
            showError("Không thể tải dữ liệu Dashboard");
        } finally {
            setLoading(false);
        }
    }, [user, showError]);

    // Search Logic
    useEffect(() => {
        if (!searchQuery.trim()) {
            setFilteredAppointments(appointments);
        } else {
            const query = searchQuery.toLowerCase();
            const filtered = appointments.filter(apt => {
                const patientName = (apt.finalPatientName || '').toLowerCase();
                const patientId = String(apt.patientId || '').toLowerCase();
                const aptId = String(apt.id || '').toLowerCase();
                return patientName.includes(query) || patientId.includes(query) || aptId.includes(query);
            });
            setFilteredAppointments(filtered);
        }
    }, [searchQuery, appointments]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    // Auto-refresh when lab user sends results
    const location = useLocation();
    const hasCheckedRefresh = useRef(false);

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const filterParam = params.get('filter');
        if (filterParam === 'pending_approval') {
            setActiveFilterTab('pending_approval');
        }
    }, [location.search]);

    // Check sessionStorage flag on mount and navigation
    useEffect(() => {
        const shouldRefresh = sessionStorage.getItem('shouldRefreshAppointments');
        if (shouldRefresh === 'true') {
            sessionStorage.removeItem('shouldRefreshAppointments');
            setTimeout(() => {
                loadData();
            }, 500);
        }
    }, [location.pathname, loadData]);

    // Listen for refresh events
    useEffect(() => {
        const handleAppointmentUpdated = (event) => {
            const appointmentId = event.detail?.appointmentId;
            console.log('[DoctorDashboard] Appointment updated event received:', appointmentId);
            setTimeout(() => {
                loadData();
            }, 1000);
        };

        const handleTestResultCreated = (event) => {
            const appointmentId = event.detail?.appointmentId;
            console.log('[DoctorDashboard] Test result created event received:', appointmentId);
            setTimeout(() => {
                loadData();
            }, 1000);
        };

        window.addEventListener('appointmentUpdated', handleAppointmentUpdated);
        window.addEventListener('testResultCreated', handleTestResultCreated);
        window.addEventListener('testResultChanged', handleTestResultCreated);

        return () => {
            window.removeEventListener('appointmentUpdated', handleAppointmentUpdated);
            window.removeEventListener('testResultCreated', handleTestResultCreated);
            window.removeEventListener('testResultChanged', handleTestResultCreated);
        };
    }, [loadData]);

    // Use auto-refresh hook
    useAutoRefresh(loadData, ['appointments', 'testResults'], {
        delay: 1000,
        enabled: true
    });

    // --- Render ---
    if (loading) return (
        <Container className="d-flex justify-content-center align-items-center" style={{ minHeight: '80vh' }}>
            <Spinner animation="border" variant="primary" />
        
            {/* Modal: Bác sĩ ký duyệt kết quả xét nghiệm */}
            <Modal show={showApproveModal} onHide={handleCloseApproveModal} centered size="lg">
                <Modal.Header closeButton className="bg-light">
                    <Modal.Title className="fw-bold text-dark d-flex align-items-center gap-2">
                        <i className="fas fa-file-signature text-warning"></i>
                        Phê Duyệt Điện Tử Kết Quả Xét Nghiệm (Bác Sĩ)
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body className="p-4">
                    {selectedApproveApt && (
                        <div>
                            <div className="p-3 bg-light rounded-3 mb-3 border">
                                <Row className="g-2">
                                    <Col sm={6}>
                                        <div className="text-muted small">Bệnh nhân:</div>
                                        <div className="fw-bold text-dark fs-6">{selectedApproveApt.finalPatientName}</div>
                                    </Col>
                                    <Col sm={6}>
                                        <div className="text-muted small">Gói xét nghiệm:</div>
                                        <div className="fw-bold text-primary">{selectedApproveApt.finalServiceName}</div>
                                    </Col>
                                    <Col sm={6}>
                                        <div className="text-muted small">Mã lịch hẹn:</div>
                                        <div className="font-monospace fw-semibold">{selectedApproveApt.id || selectedApproveApt.appointmentId}</div>
                                    </Col>
                                    <Col sm={6}>
                                        <div className="text-muted small">Ngày khám:</div>
                                        <div className="fw-semibold">{selectedApproveApt.displayDate} {selectedApproveApt.displayTime}</div>
                                    </Col>
                                </Row>
                            </div>

                            <Form.Group className="mb-3">
                                <Form.Label className="fw-bold text-dark">
                                    <i className="fas fa-notes-medical text-primary me-1"></i>
                                    Nhận xét lâm sàng & Tư vấn của Bác sĩ:
                                </Form.Label>
                                <Form.Control
                                    as="textarea"
                                    rows={3}
                                    placeholder="Nhập nhận định chuyên môn, chẩn đoán sơ bộ hoặc hướng điều trị cho bệnh nhân..."
                                    value={doctorNotes}
                                    onChange={(e) => setDoctorNotes(e.target.value)}
                                />
                            </Form.Group>

                            <Form.Group className="mb-3">
                                <Form.Label className="fw-bold text-dark">
                                    <i className="fas fa-key text-success me-1"></i>
                                    Mã chữ ký số điện tử Bác sĩ (Digital Signature):
                                </Form.Label>
                                <Form.Control
                                    type="text"
                                    readOnly
                                    value={digitalSig}
                                    className="bg-light font-monospace fw-bold text-success border-success"
                                />
                                <Form.Text className="text-muted small">
                                    * Chữ ký số điện tử xác thực trách nhiệm chuyên môn của Bác sĩ trước khi công bố kết quả lên tài khoản của bệnh nhân.
                                </Form.Text>
                            </Form.Group>
                        </div>
                    )}
                </Modal.Body>
                <Modal.Footer className="bg-light">
                    <Button variant="secondary" onClick={handleCloseApproveModal} disabled={approving}>
                        Đóng
                    </Button>
                    <Button variant="success" className="fw-bold px-4" onClick={handleConfirmApprove} disabled={approving}>
                        {approving ? (
                            <>
                                <Spinner animation="border" size="sm" className="me-2" />
                                Đang ký duyệt...
                            </>
                        ) : (
                            <>
                                <i className="fas fa-check-circle me-1"></i> Ký Duyệt & Công Bố Cho Bệnh Nhân
                            </>
                        )}
                    </Button>
                </Modal.Footer>
            </Modal>
        </Container>
    );

    return (
        <Container fluid className="py-4 px-4 bg-light" style={{ 
          minHeight: '100vh',
          overflowX: 'hidden', 
          maxWidth: '100%', 
          width: '100%',
          boxSizing: 'border-box'
        }}>
            {/* Header */}
            <Row className="mb-4 align-items-center">
                <Col>
                    <h2 className="text-primary fw-bold mb-1" style={{ fontSize: 'clamp(1.25rem, 4vw, 1.75rem)' }}>
                        <i className="fas fa-user-md me-2"></i>Dashboard Bác sĩ
                    </h2>
                    <p className="text-muted mb-0 d-none d-md-block" style={{ fontSize: 'clamp(0.875rem, 2vw, 1rem)' }}>
                        Xin chào, <strong>{doctorProfile?.fullName || user?.fullName}</strong>! Chúc bạn một ngày làm việc hiệu quả.
                    </p>
                </Col>
                <Col xs={12} md="auto" className="mt-2 mt-md-0">
                    <Button variant="primary" className="rounded-pill px-4 shadow-sm w-100 w-md-auto" onClick={loadData} style={{ fontSize: 'clamp(0.875rem, 2vw, 1rem)' }}>
                        <i className="fas fa-sync-alt me-2"></i>Làm mới
                    </Button>
                </Col>
            </Row>

            {/* Stats Cards - Styles matched to Schedule Page */}
            <Row className="g-4 mb-5">
                {[
                    { label: 'Tổng lịch hẹn', value: stats.total, icon: 'fa-calendar-alt', color: 'primary', bg: 'bg-primary-subtle' },
                    { label: 'Cần xử lý', value: stats.pending, icon: 'fa-user-clock', color: 'warning', bg: 'bg-warning-subtle' }, // Changed Icon
                    { label: 'Hôm nay', value: stats.today, icon: 'fa-clock', color: 'info', bg: 'bg-info-subtle' },
                    { label: 'Hoàn thành', value: stats.completed, icon: 'fa-check-circle', color: 'success', bg: 'bg-success-subtle' }, // Changed Icon
                ].map((stat, idx) => (
                    <Col xs={6} sm={6} md={3} key={idx}>
                        <Card className="border-0 shadow-sm h-100 rounded-4 overflow-hidden card-hover-effect">
                            <Card.Body className="d-flex align-items-center p-3 p-md-4">
                                <div className={`rounded-circle p-2 p-md-3 me-2 me-md-3 ${stat.bg} text-${stat.color} d-flex align-items-center justify-content-center`} style={{ width: 'clamp(45px, 8vw, 60px)', height: 'clamp(45px, 8vw, 60px)', flexShrink: 0 }}>
                                    <i className={`fas ${stat.icon}`} style={{ fontSize: 'clamp(1rem, 3vw, 1.25rem)' }}></i>
                                </div>
                                <div className="flex-grow-1">
                                    <h3 className={`fw-bold mb-0 text-${stat.color}`} style={{ fontSize: 'clamp(1.25rem, 4vw, 1.75rem)' }}>{stat.value}</h3>
                                    <div className="text-muted small text-uppercase fw-bold" style={{ fontSize: 'clamp(0.7rem, 2vw, 0.875rem)' }}>{stat.label}</div>
                                </div>
                            </Card.Body>
                        </Card>
                    </Col>
                ))}
            </Row>

            {/* Nhóm chức năng Bác sĩ - Quick Functional Hub (Dashbar) */}
            <Card className="border-0 shadow-sm rounded-4 mb-4 bg-white">
                <Card.Body className="p-3 p-md-4">
                    <div className="d-flex align-items-center justify-content-between mb-3 flex-wrap gap-2">
                        <div className="d-flex align-items-center gap-2">
                            <span className="p-2 rounded-circle bg-primary bg-opacity-10 text-primary">
                                <i className="fas fa-th-large"></i>
                            </span>
                            <h5 className="mb-0 fw-bold text-dark" style={{ fontSize: '1.05rem' }}>
                                Nhóm chức năng Bác sĩ (Doctor Functional Hub)
                            </h5>
                        </div>
                        <span className="badge bg-primary-subtle text-primary border border-primary-subtle rounded-pill px-3 py-2 fw-semibold">
                            <i className="fas fa-user-md me-1"></i> Bác sĩ điều trị
                        </span>
                    </div>

                    <Row className="g-3">
                        {/* 1. Lịch làm việc */}
                        <Col xs={12} sm={6} lg={3}>
                            <div 
                                className="p-3 rounded-4 border bg-body-tertiary h-100 d-flex align-items-center gap-3 shadow-sm"
                                onClick={() => navigate('/doctor/schedule')}
                                style={{ transition: 'all 0.2s', cursor: 'pointer', borderLeft: '4px solid #198754' }}
                            >
                                <div className="rounded-3 bg-success bg-opacity-10 text-success d-flex align-items-center justify-content-center p-3" style={{ width: 48, height: 48, flexShrink: 0 }}>
                                    <i className="fas fa-calendar-check fa-lg"></i>
                                </div>
                                <div className="overflow-hidden">
                                    <div className="fw-bold text-dark text-truncate">Lịch làm việc</div>
                                    <small className="text-muted d-block text-truncate">Xem ca trực & lịch làm việc</small>
                                </div>
                            </div>
                        </Col>

                        {/* 2. Quản lý Lịch hẹn */}
                        <Col xs={12} sm={6} lg={3}>
                            <div 
                                className="p-3 rounded-4 border bg-body-tertiary h-100 d-flex align-items-center gap-3 shadow-sm"
                                onClick={() => navigate('/doctor/appointments')}
                                style={{ transition: 'all 0.2s', cursor: 'pointer', borderLeft: '4px solid #0d6efd' }}
                            >
                                <div className="rounded-3 bg-primary bg-opacity-10 text-primary d-flex align-items-center justify-content-center p-3" style={{ width: 48, height: 48, flexShrink: 0 }}>
                                    <i className="fas fa-calendar-alt fa-lg"></i>
                                </div>
                                <div className="overflow-hidden">
                                    <div className="fw-bold text-dark text-truncate">Lịch hẹn khám</div>
                                    <small className="text-muted d-block text-truncate">Quản lý tạo & dời lịch hẹn</small>
                                </div>
                            </div>
                        </Col>

                        {/* 3. Phê duyệt kết quả xét nghiệm */}
                        <Col xs={12} sm={6} lg={3}>
                            <div 
                                className="p-3 rounded-4 border bg-body-tertiary h-100 d-flex align-items-center gap-3 shadow-sm"
                                onClick={() => setActiveFilterTab('pending_approval')}
                                style={{ transition: 'all 0.2s', cursor: 'pointer', borderLeft: '4px solid #ffc107' }}
                            >
                                <div className="rounded-3 bg-warning bg-opacity-10 text-warning d-flex align-items-center justify-content-center p-3" style={{ width: 48, height: 48, flexShrink: 0 }}>
                                    <i className="fas fa-file-signature fa-lg"></i>
                                </div>
                                <div className="overflow-hidden">
                                    <div className="fw-bold text-dark text-truncate">Duyệt kết quả xét nghiệm</div>
                                    <small className="text-muted d-block text-truncate">Lọc mẫu & ký số điện tử</small>
                                </div>
                            </div>
                        </Col>

                        {/* 4. Hồ sơ Bệnh nhân */}
                        <Col xs={12} sm={6} lg={3}>
                            <div 
                                className="p-3 rounded-4 border bg-body-tertiary h-100 d-flex align-items-center gap-3 shadow-sm"
                                onClick={() => navigate('/doctor/patients')}
                                style={{ transition: 'all 0.2s', cursor: 'pointer', borderLeft: '4px solid #0dcaf0' }}
                            >
                                <div className="rounded-3 bg-info bg-opacity-10 text-info d-flex align-items-center justify-content-center p-3" style={{ width: 48, height: 48, flexShrink: 0 }}>
                                    <i className="fas fa-user-injured fa-lg"></i>
                                </div>
                                <div className="overflow-hidden">
                                    <div className="fw-bold text-dark text-truncate">Hồ sơ bệnh nhân</div>
                                    <small className="text-muted d-block text-truncate">Tra cứu bệnh án & tiền sử</small>
                                </div>
                            </div>
                        </Col>

                        {/* 5. Thông báo notify */}
                        <Col xs={12} sm={6} lg={3}>
                            <div 
                                className="p-3 rounded-4 border bg-body-tertiary h-100 d-flex align-items-center gap-3 shadow-sm"
                                onClick={() => navigate('/notifications')}
                                style={{ transition: 'all 0.2s', cursor: 'pointer', borderLeft: '4px solid #fd7e14' }}
                            >
                                <div className="rounded-3 bg-warning bg-opacity-10 text-warning d-flex align-items-center justify-content-center p-3" style={{ width: 48, height: 48, flexShrink: 0 }}>
                                    <i className="fas fa-bell fa-lg"></i>
                                </div>
                                <div className="overflow-hidden">
                                    <div className="fw-bold text-dark text-truncate">Thông báo notify</div>
                                    <small className="text-muted d-block text-truncate">Check-in, đổi lịch & hồ sơ</small>
                                </div>
                            </div>
                        </Col>
                    </Row>
                </Card.Body>
            </Card>

            {/* Main Content */}
            <Row>
                <Col lg={12}>
                    <Card className="border-0 shadow-sm rounded-4">
                        <Card.Header className="bg-white border-bottom-0 py-4 px-4">
                            <Row className="align-items-center">
                                <Col xs={12} md={6}>
                                    <h5 className="mb-0 fw-bold text-primary" style={{ fontSize: 'clamp(1rem, 3vw, 1.25rem)' }}>
                                        <i className="fas fa-list-alt me-2"></i>
                                        <span className="d-none d-sm-inline">Danh sách Lịch hẹn & Kết quả</span>
                                        <span className="d-sm-none">Lịch hẹn</span>
                                    </h5>
                                    <div className="d-flex flex-wrap gap-2 mt-2">
                                        <Button 
                                            variant={activeFilterTab === 'all' ? 'primary' : 'outline-secondary'} 
                                            size="sm" 
                                            className="rounded-pill px-3"
                                            onClick={() => setActiveFilterTab('all')}
                                        >
                                            Tất cả ({appointments.length})
                                        </Button>
                                        <Button 
                                            variant={activeFilterTab === 'pending_approval' ? 'warning' : 'outline-warning'} 
                                            size="sm" 
                                            className="rounded-pill px-3 fw-bold"
                                            onClick={() => setActiveFilterTab('pending_approval')}
                                        >
                                            <i className="fas fa-clock me-1"></i> Chờ duyệt kết quả
                                        </Button>
                                        <Button 
                                            variant={activeFilterTab === 'today' ? 'info' : 'outline-info'} 
                                            size="sm" 
                                            className="rounded-pill px-3"
                                            onClick={() => setActiveFilterTab('today')}
                                        >
                                            Ca hôm nay
                                        </Button>
                                        <Button 
                                            variant={activeFilterTab === 'completed' ? 'success' : 'outline-success'} 
                                            size="sm" 
                                            className="rounded-pill px-3"
                                            onClick={() => setActiveFilterTab('completed')}
                                        >
                                            Đã duyệt / Hoàn thành
                                        </Button>
                                    </div>
                                </Col>
                                <Col xs={12} md={6} className="mt-2 mt-md-0">
                                    <div className="d-flex flex-column flex-md-row gap-2 justify-content-end">
                                        <div className="input-group w-100 w-md-auto" style={{ maxWidth: '100%' }}>
                                            <span className="input-group-text bg-white border-end-0">
                                                <i className="fas fa-search text-muted"></i>
                                            </span>
                                            <input
                                                type="text"
                                                className="form-control border-start-0 ps-0"
                                                placeholder="Tìm bệnh nhân..."
                                                value={searchQuery}
                                                onChange={(e) => setSearchQuery(e.target.value)}
                                                style={{ fontSize: 'clamp(0.875rem, 2vw, 1rem)' }}
                                            />
                                        </div>
                                        <Button variant="outline-primary" size="sm" className="rounded-pill text-nowrap w-100 w-md-auto"
                                            onClick={() => navigate('/doctor/schedule')}
                                            style={{ fontSize: 'clamp(0.875rem, 2vw, 1rem)' }}>
                                            <span className="d-none d-sm-inline">Xem lịch chi tiết</span>
                                            <span className="d-sm-none">Lịch</span>
                                            <i className="fas fa-arrow-right ms-1"></i>
                                        </Button>
                                    </div>
                                </Col>
                            </Row>
                        </Card.Header>
                        <Card.Body className="p-0">
                            {appointments.length > 0 ? (
                                <div className="table-responsive">
                                    <Table hover className="mb-0 align-middle custom-table">
                                        <thead className="bg-light">
                                            <tr>
                                                <th className="ps-4 py-3 text-muted text-uppercase small fw-bold" style={{ fontSize: 'clamp(0.75rem, 2vw, 0.875rem)' }}>
                                                    <span className="d-none d-md-inline">Ngày & Khung Giờ</span>
                                                    <span className="d-md-none">Ngày/Giờ</span>
                                                </th>
                                                <th className="py-3 text-muted text-uppercase small fw-bold" style={{ fontSize: 'clamp(0.75rem, 2vw, 0.875rem)' }}>Bệnh nhân</th>
                                                <th className="py-3 text-muted text-uppercase small fw-bold d-none d-lg-table-cell" style={{ fontSize: 'clamp(0.75rem, 2vw, 0.875rem)' }}>Gói dịch vụ</th>
                                                <th className="py-3 text-muted text-uppercase small fw-bold" style={{ fontSize: 'clamp(0.75rem, 2vw, 0.875rem)' }}>Trạng thái</th>
                                                <th className="pe-4 py-3 text-end text-muted text-uppercase small fw-bold" style={{ fontSize: 'clamp(0.75rem, 2vw, 0.875rem)' }}>Hành động</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {filteredAppointments.map((apt) => (
                                                <tr key={apt.id}>
                                                    <td className="ps-4" style={{ fontSize: 'clamp(0.875rem, 2vw, 1rem)' }}>
                                                        <div className="fw-bold text-dark">{apt.displayDate}</div>
                                                        {apt.displayTime && (
                                                            <div className="d-flex align-items-center mt-1 flex-wrap">
                                                                <Badge bg="light" text="dark" className="border rounded-pill me-2 mb-1" style={{ fontSize: 'clamp(0.7rem, 2vw, 0.875rem)' }}>
                                                                    {getShiftName(apt.displayTime)}
                                                                </Badge>
                                                                <small className="text-primary fw-bold" style={{ fontSize: 'clamp(0.75rem, 2vw, 0.875rem)' }}>{apt.displayTime}</small>
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td style={{ fontSize: 'clamp(0.875rem, 2vw, 1rem)' }}>
                                                        <div className="fw-bold text-dark">{apt.finalPatientName}</div>
                                                        <div className="small text-muted font-monospace d-none d-md-inline">Mã BN:{apt.patientId}</div>
                                                    </td>
                                                    <td className="d-none d-lg-table-cell">
                                                        <Badge bg="info" className="text-dark bg-opacity-10 border border-info rounded-pill px-3" style={{ fontSize: 'clamp(0.75rem, 2vw, 0.875rem)' }}>
                                                            {apt.finalServiceName}
                                                        </Badge>
                                                    </td>
                                                    <td>{getStatusBadge(apt.status)}</td>
                                                    <td className="pe-4 text-end">
                                                        <div className="d-flex gap-2 justify-content-end flex-wrap">
                                                            {['result_pending', 'sample_processed', 'ready_for_consultation'].includes(String(apt.status || '').toLowerCase()) && (
                                                                <Button
                                                                    variant="warning"
                                                                    size="sm"
                                                                    className="rounded-pill px-3 fw-semibold text-dark shadow-sm"
                                                                    onClick={() => handleOpenApproveModal(apt)}
                                                                    style={{ fontSize: 'clamp(0.75rem, 2vw, 0.875rem)' }}
                                                                >
                                                                    <i className="fas fa-file-signature me-1"></i> Ký duyệt
                                                                </Button>
                                                            )}
                                                            <Button
                                                                variant="outline-primary"
                                                                size="sm"
                                                                className="rounded-pill px-3 text-nowrap"
                                                                onClick={() => navigate(`/doctor/patient-profile/${apt.patientId}/${apt.id}`)}
                                                                style={{ fontSize: 'clamp(0.75rem, 2vw, 0.875rem)' }}
                                                            >
                                                                <span>Xem chi tiết</span>
                                                                <i className="fas fa-chevron-right ms-1" style={{ fontSize: '0.8em' }}></i>
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
                                    <div className="mb-3 opacity-25">
                                        <i className="fas fa-clipboard-check fa-4x text-primary"></i>
                                    </div>
                                    {searchQuery ? (
                                        <>
                                            <h5 className="text-muted fw-normal">Không tìm thấy kết quả nào phù hợp.</h5>
                                            <p className="text-muted small">Thử tìm kiếm với từ khóa khác.</p>
                                        </>
                                    ) : (
                                        <>
                                            <h5 className="text-muted fw-normal">Không có lịch hẹn nào trong các ca trực của bạn.</h5>
                                            <p className="text-muted small">Vui lòng kiểm tra lại Lịch làm việc.</p>
                                        </>
                                    )}
                                </div>
                            )}
                        </Card.Body>
                    </Card>
                </Col>
            </Row>
        
            {/* Modal: Bác sĩ ký duyệt kết quả xét nghiệm */}
            <Modal show={showApproveModal} onHide={handleCloseApproveModal} centered size="lg">
                <Modal.Header closeButton className="bg-light">
                    <Modal.Title className="fw-bold text-dark d-flex align-items-center gap-2">
                        <i className="fas fa-file-signature text-warning"></i>
                        Phê Duyệt Điện Tử Kết Quả Xét Nghiệm (Bác Sĩ)
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body className="p-4">
                    {selectedApproveApt && (
                        <div>
                            <div className="p-3 bg-light rounded-3 mb-3 border">
                                <Row className="g-2">
                                    <Col sm={6}>
                                        <div className="text-muted small">Bệnh nhân:</div>
                                        <div className="fw-bold text-dark fs-6">{selectedApproveApt.finalPatientName}</div>
                                    </Col>
                                    <Col sm={6}>
                                        <div className="text-muted small">Gói xét nghiệm:</div>
                                        <div className="fw-bold text-primary">{selectedApproveApt.finalServiceName}</div>
                                    </Col>
                                    <Col sm={6}>
                                        <div className="text-muted small">Mã lịch hẹn:</div>
                                        <div className="font-monospace fw-semibold">{selectedApproveApt.id || selectedApproveApt.appointmentId}</div>
                                    </Col>
                                    <Col sm={6}>
                                        <div className="text-muted small">Ngày khám:</div>
                                        <div className="fw-semibold">{selectedApproveApt.displayDate} {selectedApproveApt.displayTime}</div>
                                    </Col>
                                </Row>
                            </div>

                            <Form.Group className="mb-3">
                                <Form.Label className="fw-bold text-dark">
                                    <i className="fas fa-notes-medical text-primary me-1"></i>
                                    Nhận xét lâm sàng & Tư vấn của Bác sĩ:
                                </Form.Label>
                                <Form.Control
                                    as="textarea"
                                    rows={3}
                                    placeholder="Nhập nhận định chuyên môn, chẩn đoán sơ bộ hoặc hướng điều trị cho bệnh nhân..."
                                    value={doctorNotes}
                                    onChange={(e) => setDoctorNotes(e.target.value)}
                                />
                            </Form.Group>

                            <Form.Group className="mb-3">
                                <Form.Label className="fw-bold text-dark">
                                    <i className="fas fa-key text-success me-1"></i>
                                    Mã chữ ký số điện tử Bác sĩ (Digital Signature):
                                </Form.Label>
                                <Form.Control
                                    type="text"
                                    readOnly
                                    value={digitalSig}
                                    className="bg-light font-monospace fw-bold text-success border-success"
                                />
                                <Form.Text className="text-muted small">
                                    * Chữ ký số điện tử xác thực trách nhiệm chuyên môn của Bác sĩ trước khi công bố kết quả lên tài khoản của bệnh nhân.
                                </Form.Text>
                            </Form.Group>
                        </div>
                    )}
                </Modal.Body>
                <Modal.Footer className="bg-light">
                    <Button variant="secondary" onClick={handleCloseApproveModal} disabled={approving}>
                        Đóng
                    </Button>
                    <Button variant="success" className="fw-bold px-4" onClick={handleConfirmApprove} disabled={approving}>
                        {approving ? (
                            <>
                                <Spinner animation="border" size="sm" className="me-2" />
                                Đang ký duyệt...
                            </>
                        ) : (
                            <>
                                <i className="fas fa-check-circle me-1"></i> Ký Duyệt & Công Bố Cho Bệnh Nhân
                            </>
                        )}
                    </Button>
                </Modal.Footer>
            </Modal>
        </Container>
    );
};

export default DoctorDashboard;