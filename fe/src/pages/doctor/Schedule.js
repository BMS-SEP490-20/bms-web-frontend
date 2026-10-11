/**
 * Doctor Schedule Page
 * * UI POLISHED VERSION - STRICT FILTERING MODE
 * * Đảm bảo: Lịch hẹn chỉ hiện khi khớp đúng ID Ca trực của bác sĩ
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Container, Row, Col, Card, Table, Badge, Alert, Spinner } from 'react-bootstrap';
import { useAuth } from '../../shared/contexts/AuthContext';
import { appointmentService } from '../../services/appointmentService';
import { doctorService } from '../../services/doctorService';
import { shiftService } from '../../services/shiftService';
import { patientService } from '../../services/patientService';
import { testOrderService } from '../../services/testOrderService';
import { APPOINTMENT_STATUS } from '../../shared/constants/status';
import useResponsive from '../../shared/hooks/useResponsive';
import { useAutoRefresh, dispatchRefreshEvent, setRefreshFlag } from '../../shared/hooks/useAutoRefresh';

const DoctorSchedule = () => {
  const { user } = useAuth();
  const { isMobile, isTablet } = useResponsive();

  // --- States ---
  const [loading, setLoading] = useState(true);
  const [doctorProfile, setDoctorProfile] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [shifts, setShifts] = useState([]);
  // const [doctorRooms, setDoctorRooms] = useState([]); // (Có thể giữ lại nếu dùng để map tên phòng)

  // --- Helpers ---
  /**
   * Parses input to local date ISO string (YYYY-MM-DD)
   * 
   * This helper function converts various date formats to a standardized
   * ISO date string (YYYY-MM-DD) for consistent date handling.
   * 
   * @param {string|Date} input - Date string or Date object to parse
   * @returns {string|null} ISO date string (YYYY-MM-DD) or null if invalid
   * 
   * @example
   * // Parse date string
   * const date = parseToLocalDateIso('2024-12-04T10:00:00');
   * // Returns: '2024-12-04'
   */
  const parseToLocalDateIso = (input) => {
    if (!input) return null;
    try {
      if (typeof input === 'string') return input.split('T')[0];
      const d = new Date(input);
      if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
    } catch (e) { }
    return null;
  };

  /**
   * Converts time string to HH:MM format
   * 
   * This helper function extracts and formats time strings to HH:MM format
   * for consistent time display.
   * 
   * @param {string} t - Time string to convert
   * @returns {string} Time string in HH:MM format or empty string
   * 
   * @example
   * // Convert time to HH:MM
   * const time = toHHMM('13:00:00');
   * // Returns: '13:00'
   */
  const toHHMM = (t) => {
    if (!t) return '';
    const str = String(t);
    return str.includes(':') ? str.slice(0, 5) : str;
  };

  // Cấu hình Badge trạng thái
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
    'pending_confirmation': { variant: 'secondary', text: 'Chờ xác nhận', icon: 'fa-hourglass-start' }
  };

  /**
   * Gets status badge component for appointment status
   * 
   * This function returns a Badge component with appropriate styling and icon
   * based on the appointment status. It uses STATUS_CONFIG to map status
   * to badge variant, text, and icon.
   * 
   * @param {string} status - Appointment status string
   * @returns {React.ReactNode} Badge component with status information
   * 
   * @example
   * // Get status badge for appointment
   * const badge = getStatusBadge('confirmed');
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
   * Gets color variant for shift based on time
   * 
   * This helper function determines the color variant for a shift badge
   * based on the start hour of the shift.
   * 
   * **Color mapping:**
   * - Morning (hour < 12): 'success' (green)
   * - Afternoon (hour < 17): 'warning' (yellow)
   * - Evening (hour >= 17): 'info' (blue)
   * 
   * @param {string} displayTime - Time string in HH:MM format
   * @returns {string} Color variant ('success', 'warning', 'info', or 'primary')
   * 
   * @example
   * // Get shift color
   * const color = getShiftColor('08:00');
   * // Returns: 'success'
   */
  const getShiftColor = (displayTime) => {
    if (!displayTime) return 'primary';
    const startHour = parseInt(displayTime.split(':')[0]);
    if (startHour < 12) return 'success'; // Sáng
    if (startHour < 17) return 'warning'; // Chiều
    return 'info'; // Tối
  };

  /**
   * Gets shift name based on time
   * 
   * This helper function determines the shift name (Ca sáng, Ca chiều, Ca tối)
   * based on the start hour of the shift.
   * 
   * **Shift mapping:**
   * - Hour < 12: 'Ca sáng'
   * - Hour < 17: 'Ca chiều'
   * - Hour >= 17: 'Ca tối'
   * 
   * @param {string} displayTime - Time string in HH:MM format
   * @returns {string} Shift name ('Ca sáng', 'Ca chiều', or 'Ca tối')
   * 
   * @example
   * // Get shift name
   * const name = getShiftName('08:00');
   * // Returns: 'Ca sáng'
   */
  const getShiftName = (displayTime) => {
    const startHour = parseInt((displayTime || '').split(':')[0]);
    if (startHour < 12) return 'Ca sáng';
    if (startHour < 17) return 'Ca chiều';
    return 'Ca tối';
  };

  // --- Main Data Loading Logic ---
  /**
   * Loads doctor schedule data
   * 
   * This function is the core data fetching function for the doctor schedule page.
   * It performs the following operations:
   * 1. Fetches doctor profile by email
   * 2. Fetches doctor rooms for room name mapping
   * 3. Fetches doctor shifts for the current doctor
   * 4. Fetches appointments and filters by doctor's shift IDs
   * 5. Enriches appointments with patient names and room information
   * 6. Sorts appointments by creation date
   * 
   * **Strict filtering:**
   * - Only shows appointments that match the doctor's shift IDs
   * - Ensures appointments are properly linked to doctor's shifts
   * 
   * @param {boolean} [forceFresh=false] - If true, bypasses cache and fetches fresh data
   * @returns {Promise<void>} Does not return a value. Updates component state with fetched data.
   * 
   * @example
   * // Load schedule data with cache
   * await loadScheduleData();
   * 
   * // Load schedule data without cache
   * await loadScheduleData(true);
   */
  const loadScheduleData = useCallback(async (forceFresh = false) => {
    if (!user || !user.email) {
      setLoading(false);
      return;
    }
    setLoading(true);

    try {
      // 1. Fetch Doctor Rooms (để map tên phòng)
      let roomsMap = {};
      try {
        const roomsRes = await testOrderService.getAllDoctorRooms();
        if (roomsRes.success && Array.isArray(roomsRes.data)) {
          roomsRes.data.forEach(r => {
            if (r.id) roomsMap[String(r.id)] = r.roomName || r.name;
            if (r.roomId) roomsMap[String(r.roomId)] = r.roomName || r.name;
          });
        }
      } catch (e) {}

      // 2. Xác định Doctor ID từ Email
      let currentDoctorId = user.id;
      try {
        const docRes = await doctorService.getDoctorByEmail(user.email);
        const docData = docRes?.data ? (Array.isArray(docRes.data) ? docRes.data[0] : docRes.data) : null;
        if (docData) {
          currentDoctorId = docData.doctorId || docData.doctor_id || docData.id;
          setDoctorProfile(docData);
        }
      } catch (e) {}

      // 3. Fetch dữ liệu song song
      const [allShiftsRes, allAptRes, patientsRes, packagesRes] = await Promise.all([
        shiftService.getAllShifts(),
        appointmentService.getAllAppointments(),
        patientService.getAllPatients({ fetchAll: true }),
        testOrderService.getAllTestPackages({ fetchAll: true })
      ]);

      // --- XỬ LÝ CA TRỰC (SHIFTS) ---
      // Chỉ lấy shift của currentDoctorId
      const allShifts = allShiftsRes?.data || [];
      const myShiftsRaw = allShifts.filter(s => {
        const shiftDocId = s.doctorId || s.doctor_id || s.DoctorId || s.doctor;
        // So sánh chuỗi để đảm bảo chính xác
        return String(shiftDocId).trim() === String(currentDoctorId).trim();
      });

      const normalizedShifts = myShiftsRaw.map(s => {
        const rawDate = s.shiftDate ?? s.shift_date ?? s.date;
        const shiftDateIso = parseToLocalDateIso(rawDate);
        const startTime = s.shiftStart ?? s.shift_start ?? s.startTime ?? s.start;
        const endTime = s.shiftEnd ?? s.shift_end ?? s.endTime ?? s.end;
        const roomId = s.roomId ?? s.room_id ?? s.room;
        const resolvedRoomName = roomsMap[String(roomId)] || s.roomName || s.room_name || roomId || 'N/A';

        return {
          ...s,
          shiftId: String(s.shiftId ?? s.shift_id ?? s.id), // Ép kiểu string cho ID
          shiftDateIso,
          displayDate: shiftDateIso ? new Date(shiftDateIso).toLocaleDateString('vi-VN') : 'N/A',
          displayTime: `${toHHMM(startTime)} - ${toHHMM(endTime)}`,
          roomName: resolvedRoomName,
          // Lưu raw values để đối chiếu nếu cần
          rawStart: startTime,
          rawEnd: endTime
        };
      });

      // Tạo Set chứa các ID ca trực của tôi để lookup O(1)
      const myShiftIdsSet = new Set(normalizedShifts.map(s => s.shiftId));

      // --- MAP DATA (Patients & Packages) ---
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

      // --- XỬ LÝ LỊCH HẸN (APPOINTMENTS) ---
      const allApts = allAptRes?.data || [];
      let enrichedAppointments = [];

      if (Array.isArray(allApts)) {
        // Lọc ngay lập tức: Lịch hẹn phải có ID Ca trực nằm trong Set của bác sĩ
        const myApps = allApts.filter(apt => {
          const aptShiftId = String(apt.doctorShiftId ?? apt.doctor_shift_id ?? apt.shiftId ?? '').trim();
          return aptShiftId && myShiftIdsSet.has(aptShiftId);
        });

        enrichedAppointments = myApps.map(apt => {
          // Normalize ID để tìm shift cha
          const aptShiftId = String(apt.doctorShiftId ?? apt.doctor_shift_id ?? apt.shiftId ?? '');
          const parentShift = normalizedShifts.find(s => s.shiftId === aptShiftId);

          // Resolve Patient
          const pId = String(apt.patientId || apt.patient_id || apt.createdBy || '');
          let pName = apt.patientName || apt.patient_name;
          if (pId && patientMap[pId]) {
            pName = patientMap[pId].fullName || patientMap[pId].fullname || patientMap[pId].name;
          }
          if (!pName && pId) pName = `BN-${pId.substring(0, 6)}...`;

          // Resolve Service
          const pkgId = String(apt.testPackageId || apt.test_package_id || apt.packageId || '');
          let sName = apt.packageName || apt.serviceName || apt.testPackageName;
          if (pkgId && packageMap[pkgId]) {
            sName = packageMap[pkgId].packageName || packageMap[pkgId].name || packageMap[pkgId].title;
          }

          // Fallback hiển thị thời gian
          // Ưu tiên hiển thị theo Shift để đồng nhất với bảng danh sách theo ca
          const displayDate = parentShift ? parentShift.displayDate : (apt.appointmentDate ? new Date(apt.appointmentDate).toLocaleDateString('vi-VN') : 'N/A');
          const displayTime = parentShift ? parentShift.displayTime : toHHMM(apt.appointmentTime);

          return {
            ...apt,
            appointmentId: apt.appointmentId ?? apt.appointment_id ?? apt.id,
            patientId: pId,
            finalPatientName: pName || 'Khách vãng lai',
            finalServiceName: sName || 'Khám tổng quát',
            displayDate,
            displayTime,
            status: (apt.status || '').toLowerCase(),
            shiftInfo: parentShift // Gắn kèm thông tin ca để dùng ở UI
          };
        });
      }

      setShifts(normalizedShifts);
      setAppointments(enrichedAppointments);

    } catch (error) {
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadScheduleData();
  }, [loadScheduleData]);

  // Auto-refresh hook
  useAutoRefresh(loadScheduleData, {
    eventName: 'appointmentsChanged',
    flagKey: 'shouldRefreshAppointments'
  });

  // Sắp xếp: Mới nhất lên đầu
  const sortedAppointments = [...appointments].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  const upcomingAppointments = sortedAppointments.filter(a => ![APPOINTMENT_STATUS.COMPLETED, APPOINTMENT_STATUS.CANCELLED].includes(a.status));

  if (loading) return (
    <Container className="d-flex justify-content-center align-items-center" style={{ minHeight: '80vh' }}>
      <Spinner animation="border" variant="primary" />
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
            <i className="fas fa-calendar-alt me-2"></i>Lịch làm việc
          </h2>
          <p className="text-muted mb-0 d-none d-md-block" style={{ fontSize: 'clamp(0.875rem, 2vw, 1rem)' }}>
            Quản lý ca trực và danh sách bệnh nhân của bác sĩ <strong>{doctorProfile?.fullName || user?.fullName}</strong>
          </p>
        </Col>
      </Row>

      {shifts.length === 0 && (
        <Alert variant="danger" className="shadow-sm border-0 rounded-3 mb-4">
          <i className="fas fa-exclamation-circle me-2"></i>
          <strong>Thông báo:</strong> Bạn chưa có ca trực nào. Vui lòng liên hệ quản trị viên để xếp lịch.
        </Alert>
      )}

      {/* Stats Cards */}
      <Row className="g-4 mb-5">
        <Col xs={12} sm={6} md={4}>
          <Card className="border-0 shadow-sm h-100 rounded-4 overflow-hidden card-hover-effect">
            <Card.Body className="d-flex align-items-center p-3 p-md-4">
              <div className="rounded-circle p-2 p-md-3 me-2 me-md-3 bg-primary-subtle text-primary d-flex align-items-center justify-content-center" style={{ width: 'clamp(45px, 8vw, 60px)', height: 'clamp(45px, 8vw, 60px)', flexShrink: 0 }}>
                <i className="fas fa-calendar-day" style={{ fontSize: 'clamp(1rem, 3vw, 1.25rem)' }}></i>
              </div>
              <div className="flex-grow-1">
                <h3 className="fw-bold mb-0 text-primary" style={{ fontSize: 'clamp(1.25rem, 4vw, 1.75rem)' }}>{sortedAppointments.length}</h3>
                <div className="text-muted small text-uppercase fw-bold" style={{ fontSize: 'clamp(0.7rem, 2vw, 0.875rem)' }}>Tổng BN theo ca</div>
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col xs={12} sm={6} md={4}>
          <Card className="border-0 shadow-sm h-100 rounded-4 overflow-hidden card-hover-effect">
            <Card.Body className="d-flex align-items-center p-3 p-md-4">
              <div className="rounded-circle p-2 p-md-3 me-2 me-md-3 bg-success-subtle text-success d-flex align-items-center justify-content-center" style={{ width: 'clamp(45px, 8vw, 60px)', height: 'clamp(45px, 8vw, 60px)', flexShrink: 0 }}>
                <i className="fas fa-user-clock" style={{ fontSize: 'clamp(1rem, 3vw, 1.25rem)' }}></i>
              </div>
              <div className="flex-grow-1">
                <h3 className="fw-bold mb-0 text-success" style={{ fontSize: 'clamp(1.25rem, 4vw, 1.75rem)' }}>{upcomingAppointments.length}</h3>
                <div className="text-muted small text-uppercase fw-bold" style={{ fontSize: 'clamp(0.7rem, 2vw, 0.875rem)' }}>BN Đang chờ</div>
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col xs={12} sm={6} md={4}>
          <Card className="border-0 shadow-sm h-100 rounded-4 overflow-hidden card-hover-effect">
            <Card.Body className="d-flex align-items-center p-3 p-md-4">
              <div className="rounded-circle p-2 p-md-3 me-2 me-md-3 bg-warning-subtle text-warning d-flex align-items-center justify-content-center" style={{ width: 'clamp(45px, 8vw, 60px)', height: 'clamp(45px, 8vw, 60px)', flexShrink: 0 }}>
                <i className="fas fa-business-time" style={{ fontSize: 'clamp(1rem, 3vw, 1.25rem)' }}></i>
              </div>
              <div className="flex-grow-1">
                <h3 className="fw-bold mb-0 text-warning" style={{ fontSize: 'clamp(1.25rem, 4vw, 1.75rem)' }}>{shifts.length}</h3>
                <div className="text-muted small text-uppercase fw-bold" style={{ fontSize: 'clamp(0.7rem, 2vw, 0.875rem)' }}>Ca trực của tôi</div>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Shifts Table */}
      <Row className="mb-5">
        <Col>
          <Card className="border-0 shadow-sm rounded-4">
            <Card.Header className="bg-white border-bottom-0 py-4 px-4">
              <h5 className="mb-0 fw-bold text-primary" style={{ fontSize: 'clamp(1rem, 3vw, 1.25rem)' }}>
                <i className="fas fa-business-time me-2"></i>
                <span className="d-none d-sm-inline">Ca làm việc của tôi</span>
                <span className="d-sm-none">Ca trực</span>
              </h5>
            </Card.Header>
            <Card.Body className="p-0">
              {shifts.length > 0 ? (
                <div className="table-responsive">
                  <Table hover className="mb-0 align-middle custom-table">
                    <thead className="bg-light">
                      <tr>
                        <th className="ps-4 py-3 text-muted text-uppercase small fw-bold" style={{ fontSize: 'clamp(0.75rem, 2vw, 0.875rem)' }}>Ngày</th>
                        <th className="py-3 text-muted text-uppercase small fw-bold" style={{ fontSize: 'clamp(0.75rem, 2vw, 0.875rem)' }}>Khung giờ</th>
                        <th className="py-3 text-muted text-uppercase small fw-bold d-none d-md-table-cell" style={{ fontSize: 'clamp(0.75rem, 2vw, 0.875rem)' }}>Loại ca</th>
                        <th className="py-3 text-muted text-uppercase small fw-bold d-none d-lg-table-cell" style={{ fontSize: 'clamp(0.75rem, 2vw, 0.875rem)' }}>Phòng</th>
                        <th className="pe-4 py-3 text-muted text-uppercase small fw-bold text-end d-none d-sm-table-cell" style={{ fontSize: 'clamp(0.75rem, 2vw, 0.875rem)' }}>Mã Ca</th>
                      </tr>
                    </thead>
                    <tbody>
                      {shifts.map((shift) => (
                        <tr key={shift.shiftId}>
                          <td className="ps-4 fw-bold text-dark" style={{ fontSize: 'clamp(0.875rem, 2vw, 1rem)' }}>{shift.displayDate}</td>
                          <td style={{ fontSize: 'clamp(0.875rem, 2vw, 1rem)' }}>
                            <span className="fw-bold text-dark">{shift.displayTime}</span>
                          </td>
                          <td className="d-none d-md-table-cell">
                            <Badge bg={getShiftColor(shift.displayTime)} className="rounded-pill px-3 fw-normal" style={{ fontSize: 'clamp(0.75rem, 2vw, 0.875rem)' }}>
                              {getShiftName(shift.displayTime)}
                            </Badge>
                          </td>
                          <td className="text-dark d-none d-lg-table-cell" style={{ fontSize: 'clamp(0.875rem, 2vw, 1rem)' }}>{shift.roomName}</td>
                          <td className="pe-4 text-muted small text-end font-monospace d-none d-sm-table-cell" style={{ fontSize: 'clamp(0.75rem, 2vw, 0.875rem)' }}>{shift.shiftId}</td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-5 text-muted">Chưa có dữ liệu ca trực.</div>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Appointments Table */}
      <Row>
        <Col>
          <Card className="border-0 shadow-sm rounded-4">
            <Card.Header className="bg-white border-bottom-0 py-4 px-4 d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-2">
              <h5 className="mb-0 fw-bold text-primary" style={{ fontSize: 'clamp(1rem, 3vw, 1.25rem)' }}>
                <i className="fas fa-list me-2"></i>
                <span className="d-none d-sm-inline">Danh sách bệnh nhân (Theo Ca)</span>
                <span className="d-sm-none">Bệnh nhân</span>
              </h5>
              <Badge bg="light" text="dark" className="border" style={{ fontSize: 'clamp(0.75rem, 2vw, 0.875rem)' }}>
                {sortedAppointments.length} hồ sơ
              </Badge>
            </Card.Header>
            <Card.Body className="p-0">
              {sortedAppointments.length > 0 ? (
                <div className="table-responsive">
                  <Table hover className="mb-0 align-middle custom-table">
                    <thead className="bg-light">
                      <tr>
                        <th className="ps-4 py-3 text-muted text-uppercase small fw-bold" style={{ fontSize: 'clamp(0.75rem, 2vw, 0.875rem)' }}>Ngày khám</th>
                        <th className="py-3 text-muted text-uppercase small fw-bold d-none d-md-table-cell" style={{ fontSize: 'clamp(0.75rem, 2vw, 0.875rem)' }}>Thuộc ca</th>
                        <th className="py-3 text-muted text-uppercase small fw-bold" style={{ fontSize: 'clamp(0.75rem, 2vw, 0.875rem)' }}>Bệnh nhân</th>
                        <th className="py-3 text-muted text-uppercase small fw-bold d-none d-lg-table-cell" style={{ fontSize: 'clamp(0.75rem, 2vw, 0.875rem)' }}>Dịch vụ</th>
                        <th className="pe-4 py-3 text-muted text-uppercase small fw-bold text-end" style={{ fontSize: 'clamp(0.75rem, 2vw, 0.875rem)' }}>Trạng thái</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedAppointments.map((appointment) => {
                        return (
                          <tr key={appointment.appointmentId}>
                            <td className="ps-4" style={{ fontSize: 'clamp(0.875rem, 2vw, 1rem)' }}>
                              <div className="fw-bold text-dark">{appointment.displayDate}</div>
                              <small className="text-muted d-none d-md-inline">Mã Lịch: {appointment.appointmentId}</small>
                            </td>
                            <td className="d-none d-md-table-cell" style={{ fontSize: 'clamp(0.875rem, 2vw, 1rem)' }}>
                              {appointment.shiftInfo ? (
                                <div>
                                  <div className="fw-bold text-primary">{appointment.shiftInfo.displayTime}</div>
                                  <Badge bg="light" text="dark" className="border rounded-pill mt-1" style={{ fontSize: 'clamp(0.7rem, 2vw, 0.875rem)' }}>
                                    {getShiftName(appointment.shiftInfo.displayTime)}
                                  </Badge>
                                </div>
                              ) : (
                                <span className="text-muted fst-italic">Không xác định</span>
                              )}
                            </td>
                            <td style={{ fontSize: 'clamp(0.875rem, 2vw, 1rem)' }}>
                              <div className="fw-bold text-dark">{appointment.finalPatientName}</div>
                              {appointment.patientId && <small className="text-muted font-monospace d-none d-md-inline">Mã BN:{appointment.patientId}</small>}
                            </td>
                            <td className="d-none d-lg-table-cell">
                              <Badge bg="info" className="text-dark bg-opacity-10 border border-info rounded-pill px-3" style={{ fontSize: 'clamp(0.75rem, 2vw, 0.875rem)' }}>
                                {appointment.finalServiceName}
                              </Badge>
                            </td>
                            <td className="pe-4 text-end">{getStatusBadge(appointment.status)}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-5">
                  <div className="mb-3 text-muted opacity-25">
                    <i className="fas fa-user-slash fa-4x"></i>
                  </div>
                  <h6 className="text-muted">Không có bệnh nhân nào trong các ca trực của bạn.</h6>
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default DoctorSchedule;