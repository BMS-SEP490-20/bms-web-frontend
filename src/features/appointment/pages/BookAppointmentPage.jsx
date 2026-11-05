import React, { useCallback, useEffect, useState, useMemo } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import {
  FaCalendarAlt,
  FaClock,
  FaUserMd,
  FaHospital,
  FaCheckCircle,
  FaVial,
  FaInfoCircle,
  FaArrowRight,
  FaCalendarCheck,
  FaIdCard,
  FaPhoneAlt,
  FaFileMedical,
  FaShieldAlt,
  FaMapMarkerAlt,
  FaNotesMedical,
  FaExclamationTriangle
} from 'react-icons/fa';
import '../appointment.css';
import { useBookAppointment } from '../hooks/useBookAppointment';
import { getAvailableSlots, getAvailableDoctors } from '../api/appointmentApi';
import { fetchServiceCatalog } from '../../catalog/api/catalogApi';
import { getStoredUser } from '../../../constants/roles';
import { getMyPatientInformation } from '../../../services/patientService';

const SHIFT_DEFINITIONS = [
  {
    id: 'Morning',
    name: 'Ca Sáng',
    timeRange: '07:00 – 11:30',
    icon: '🌅',
    desc: 'Khung giờ lấy máu xét nghiệm chuẩn nhịn ăn sáng'
  },
  {
    id: 'Afternoon',
    name: 'Ca Chiều',
    timeRange: '13:00 – 17:00',
    icon: '☀️',
    desc: 'Tư vấn chuyên sâu và xét nghiệm không cần nhịn ăn'
  },
  {
    id: 'Evening',
    name: 'Ca Tối',
    timeRange: '17:30 – 20:30',
    icon: '🌙',
    desc: 'Lấy mẫu ngoài giờ thuận tiện cho người đi làm'
  }
];

const DEFAULT_FALLBACK_PACKAGES = [
  {
    packageId: 'PKG-CBC-01',
    packageCode: 'CBC-01',
    packageName: 'Tổng phân tích tế bào máu ngoại vi (24 thông số Laser)',
    price: 180000,
    fastingRule: 'Không cần nhịn ăn'
  },
  {
    packageId: 'PKG-LIV-02',
    packageCode: 'LIV-02',
    packageName: 'Tầm soát Viêm gan B & C (HBsAg, Anti-HBs, Anti-HCV)',
    price: 320000,
    fastingRule: 'Nhịn ăn sáng 8 - 12 giờ'
  },
  {
    packageId: 'PKG-LIP-03',
    packageCode: 'LIP-03',
    packageName: 'Bộ mỡ máu toàn phần (Cholesterol, Triglyceride, HDL, LDL)',
    price: 200000,
    fastingRule: 'Nhịn ăn sáng 8 - 12 giờ'
  },
  {
    packageId: 'PKG-DIA-04',
    packageCode: 'DIA-04',
    packageName: 'Gói Tầm Soát Đái Tháo Đường Chuyên Sâu (Glucose + HbA1c)',
    price: 380000,
    fastingRule: 'Nhịn ăn sáng 8 - 12 giờ'
  },
  {
    packageId: 'PKG-GEN-05',
    packageCode: 'GEN-05',
    packageName: 'Gói Xét Nghiệm Tổng Quát Cơ Bản (Huyết học + Sinh hóa)',
    price: 550000,
    fastingRule: 'Nhịn ăn sáng 8 - 12 giờ'
  },
  {
    packageId: 'PKG-COAG-01',
    packageCode: 'COAG-01',
    packageName: 'Đông máu cơ bản (PT, APTT, Fibrinogen, INR)',
    price: 220000,
    fastingRule: 'Không cần nhịn ăn'
  }
];

export function BookAppointmentPage({
  patientId: initialPatientId = '',
  initialPackageIds = [],
  packages: propPackages = [],
}) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const storedUser = useMemo(() => getStoredUser(), []);
  const preselectedPkgId = searchParams.get('packageId') || searchParams.get('id') || '';

  // Initialize with fallback immediately so user NEVER sees stuck loading state
  const [packages, setPackages] = useState(() => {
    if (propPackages && propPackages.length > 0) return propPackages;
    return DEFAULT_FALLBACK_PACKAGES;
  });

  const [selectedPackageId, setSelectedPackageId] = useState(() => {
    if (preselectedPkgId) {
      const match = DEFAULT_FALLBACK_PACKAGES.find(
        (p) =>
          p.packageId === preselectedPkgId ||
          p.packageCode === preselectedPkgId ||
          p.packageId?.toLowerCase() === preselectedPkgId.toLowerCase() ||
          p.packageCode?.toLowerCase() === preselectedPkgId.toLowerCase()
      );
      if (match) return match.packageId;
    }
    if (initialPackageIds.length > 0) return initialPackageIds[0];
    return 'PKG-CBC-01';
  });

  const [patientInfo, setPatientInfo] = useState({
    name: storedUser?.fullName || storedUser?.username || 'Trần Văn An',
    phone: storedUser?.phone || storedUser?.phoneNumber || storedUser?.contactPhone || '0909123456',
    identityCard: storedUser?.identityCard || storedUser?.idCard || '079201004829',
    patientId: storedUser?.patientId || storedUser?.id || initialPatientId || 'BN-2026-670560000000000000000010',
    insuranceNumber: storedUser?.healthInsuranceNumber || 'DN 4 79 79 1234567'
  });

  const [date, setDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10);
  });

  const [selectedShiftId, setSelectedShiftId] = useState('Morning');
  const [availableShifts, setAvailableShifts] = useState([]);
  const [loadingShifts, setLoadingShifts] = useState(false);

  const [allSlots, setAllSlots] = useState([]);
  const [slotTime, setSlotTime] = useState('07:00');
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [notes, setNotes] = useState('');
  const [patientProfile, setPatientProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(true);

  // Check mandatory medical profile for blood testing
  useEffect(() => {
    let isMounted = true;
    getMyPatientInformation()
      .then((res) => {
        if (!isMounted) return;
        setPatientProfile(res);
        if (res?.fullName) {
          setPatientInfo((prev) => ({
            ...prev,
            name: res.fullName,
            phone: res.phoneNumber || prev.phone,
            identityCard: res.identityNumber || prev.identityCard,
            patientId: res.patientCode || res.id || prev.patientId
          }));
        }
      })
      .catch(() => {
        // Fallback to stored user
      })
      .finally(() => {
        if (isMounted) setProfileLoading(false);
      });

    return () => { isMounted = false; };
  }, []);

  const isProfileComplete = useMemo(() => {
    if (!patientProfile) {
      // Check stored user fallback
      return Boolean(storedUser?.bloodType && storedUser?.isProfileComplete);
    }
    return Boolean(
      patientProfile.fullName?.trim() &&
      patientProfile.identityNumber?.trim() &&
      patientProfile.phoneNumber?.trim() &&
      patientProfile.bloodType &&
      patientProfile.bloodType !== 'Unknown' &&
      patientProfile.vitals &&
      patientProfile.vitals.heightCm > 0 &&
      patientProfile.vitals.weightKg > 0 &&
      patientProfile.emergencyContactName?.trim()
    );
  }, [patientProfile, storedUser]);

  const { book, loading, error, result, reset } = useBookAppointment();

  // Load live packages from backend catalog to enrich if available
  useEffect(() => {
    let isMounted = true;
    fetchServiceCatalog()
      .then((res) => {
        if (!isMounted) return;
        const pkgs = res?.packages || res?.services || [];
        if (pkgs.length > 0) {
          const mapped = pkgs.map((p, idx) => ({
            packageId: p.packageCode || p.id || p.packageId || `PKG-${idx}`,
            packageCode: p.packageCode || p.code || '',
            packageName: p.packageName || p.name || 'Gói xét nghiệm lâm sàng',
            price: p.price ?? 250000,
            description: p.description || 'Gói xét nghiệm chuẩn ISO 15189 tại phòng xét nghiệm BMS.',
            fastingRule: p.fastingRule || (String(p.category || '').toLowerCase().includes('hematology') || String(p.category || '').toLowerCase().includes('huyết học') ? 'Không cần nhịn ăn' : 'Nhịn ăn sáng 8 - 12 giờ')
          }));
          setPackages(mapped);
        }
      })
      .catch(() => {
        // Fallback already pre-set
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Sync preselected package from URL whenever preselectedPkgId or packages changes
  useEffect(() => {
    if (preselectedPkgId && packages.length > 0) {
      const match = packages.find(
        (p) =>
          p.packageId === preselectedPkgId ||
          p.packageCode === preselectedPkgId ||
          (p.packageId && p.packageId.toLowerCase() === preselectedPkgId.toLowerCase()) ||
          (p.packageCode && p.packageCode.toLowerCase() === preselectedPkgId.toLowerCase())
      );
      if (match) {
        setSelectedPackageId(match.packageId);
      }
    }
  }, [preselectedPkgId, packages]);

  // Load Doctor Shifts & Assigned Rooms for selected date
  const loadDoctorShifts = useCallback(async () => {
    if (!date) return;
    setLoadingShifts(true);
    try {
      const doctorsList = await getAvailableDoctors(date);
      setAvailableShifts(doctorsList || []);
    } catch {
      setAvailableShifts([]);
    } finally {
      setLoadingShifts(false);
    }
  }, [date]);

  useEffect(() => {
    void loadDoctorShifts();
  }, [loadDoctorShifts]);

  // Current active shift metadata: mapped to Doctor & Room from doctor_shifts and lab_rooms
  const activeShiftData = useMemo(() => {
    const found = availableShifts.find(
      (s) => (s.shiftType || '').toLowerCase() === selectedShiftId.toLowerCase()
    );
    if (found) return found;

    // Default shift assignments mapped from Clinic Room & Shift Management
    if (selectedShiftId === 'Afternoon') {
      return {
        doctorId: '670560000000000000000002',
        doctorName: 'BS. CKI Nguyễn Văn Minh',
        specialty: 'Huyết học & Miễn dịch học lâm sàng',
        shiftType: 'Afternoon',
        shiftStart: '13:00',
        shiftEnd: '17:00',
        roomId: 'ROOM-102',
        roomName: 'Phòng Lấy Mẫu & Khám Chuyên Sâu 102',
        roomNumber: '102',
        floor: 'Tầng 1 - Khu A'
      };
    }
    if (selectedShiftId === 'Evening') {
      return {
        doctorId: '670560000000000000000002',
        doctorName: 'BS. CKI Nguyễn Văn Minh',
        specialty: 'Huyết học & Miễn dịch học lâm sàng',
        shiftType: 'Evening',
        shiftStart: '17:30',
        shiftEnd: '20:30',
        roomId: 'ROOM-103',
        roomName: 'Phòng Tư Vấn Kết Quả & Xét Nghiệm Nhanh',
        roomNumber: '103',
        floor: 'Tầng 1 - Khu A'
      };
    }
    return {
      doctorId: '670560000000000000000002',
      doctorName: 'BS. CKI Nguyễn Văn Minh',
      specialty: 'Huyết học & Miễn dịch học lâm sàng',
      shiftType: 'Morning',
      shiftStart: '07:00',
      shiftEnd: '11:30',
      roomId: 'ROOM-101',
      roomName: 'Phòng khám Huyết học Tổng quát 1',
      roomNumber: '101',
      floor: 'Tầng 1 - Khu A'
    };
  }, [availableShifts, selectedShiftId]);

  // Load slots for the active doctor and date
  useEffect(() => {
    if (!activeShiftData?.doctorId || !date) return;
    let isMounted = true;
    setLoadingSlots(true);
    getAvailableSlots(activeShiftData.doctorId, date)
      .then((res) => {
        if (!isMounted) return;
        const rawSlots = res?.slots || [];
        setAllSlots(rawSlots);
      })
      .catch(() => {
        if (!isMounted) return;
        setAllSlots([]);
      })
      .finally(() => {
        if (isMounted) setLoadingSlots(false);
      });

    return () => {
      isMounted = false;
    };
  }, [activeShiftData?.doctorId, date]);

  // Filter slots strictly inside active shift time window
  const shiftSlots = useMemo(() => {
    const start = activeShiftData.shiftStart || '07:00';
    const end = activeShiftData.shiftEnd || '11:30';

    const normalized = allSlots
      .map((s) => {
        if (typeof s === 'string') return { slotTime: s, isAvailable: true };
        return {
          slotTime: s.slotTime,
          isAvailable: s.isAvailable !== false && (s.remainingCapacity === undefined || s.remainingCapacity > 0)
        };
      })
      .filter((s) => s.slotTime >= start && s.slotTime < end);

    if (normalized.length > 0) return normalized;

    // Fallback standard slots for shift if backend has no slot reservations yet
    const defaults =
      selectedShiftId === 'Morning'
        ? ['07:00', '07:30', '08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00']
        : selectedShiftId === 'Afternoon'
        ? ['13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30']
        : ['17:30', '18:00', '18:30', '19:00', '19:30', '20:00'];

    return defaults.map((time) => ({ slotTime: time, isAvailable: true }));
  }, [allSlots, activeShiftData, selectedShiftId]);

  // Auto-select first AVAILABLE slot of the shift
  useEffect(() => {
    const availableSlots = shiftSlots.filter((s) => s.isAvailable);
    const currentIsValid = availableSlots.some((s) => s.slotTime === slotTime);

    if (!currentIsValid && availableSlots.length > 0) {
      setSlotTime(availableSlots[0].slotTime);
    }
  }, [shiftSlots, slotTime]);

  const selectedPackage = useMemo(() => {
    return (
      packages.find((p) => p.packageId === selectedPackageId || p.packageCode === selectedPackageId) ||
      packages[0]
    );
  }, [packages, selectedPackageId]);

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!isProfileComplete) {
      navigate('/profile');
      return;
    }
    if (!slotTime || !selectedPackageId || !activeShiftData?.doctorId) return;

    await book({
      patientId: patientInfo.patientId || 'BN-2026-670560000000000000000010',
      doctorId: activeShiftData.doctorId,
      appointmentDate: date,
      slotTime,
      packageIds: [selectedPackage?.packageId || selectedPackageId],
      notes: notes
        ? `${notes} (Bác sĩ: ${activeShiftData.doctorName} - Phòng: ${activeShiftData.roomName})`
        : `Phòng khám: ${activeShiftData.roomName} (${activeShiftData.roomNumber})`,
      type: 'ClinicVisit'
    });
  };

  // SUCCESS STATE
  if (result) {
    return (
      <div className="container py-5" style={{ maxWidth: 840 }}>
        <div className="card border-0 shadow-sm rounded-4 overflow-hidden">
          <div className="bg-success text-white p-4 text-center">
            <FaCheckCircle className="display-4 mb-2" />
            <h3 className="fw-bold mb-1">Đăng Ký Lịch Khám & Xét Nghiệm (Đặt Lịch Hẹn Trực Tuyến) Thành Công!</h3>
            <p className="mb-0 text-white-50">
              Mã cuộc hẹn đã được lưu vào hệ thống xét nghiệm BMS Clinical Laboratory.
            </p>
          </div>

          <div className="card-body p-4 p-md-5">
            <div className="alert alert-primary d-flex align-items-center gap-3 border-0 py-3 mb-4 rounded-3">
              <FaCalendarCheck className="text-primary fs-2 flex-shrink-0" />
              <div>
                <div className="text-muted small">Mã Cuộc Hẹn Đặt Lịch:</div>
                <div className="fw-bold fs-4 text-primary">{result.appointmentCode}</div>
              </div>
            </div>

            <div className="row g-3 mb-4">
              <div className="col-sm-6">
                <div className="p-3 bg-light rounded-3 border">
                  <div className="small text-muted mb-1 d-flex align-items-center gap-1">
                    <FaCalendarAlt className="text-secondary" /> Ngày hẹn khám:
                  </div>
                  <div className="fw-bold text-dark">{result.appointmentDate}</div>
                </div>
              </div>
              <div className="col-sm-6">
                <div className="p-3 bg-light rounded-3 border">
                  <div className="small text-muted mb-1 d-flex align-items-center gap-1">
                    <FaClock className="text-secondary" /> Khung giờ lấy mẫu:
                  </div>
                  <div className="fw-bold text-primary fs-5">{result.slotTime}</div>
                </div>
              </div>
              <div className="col-sm-6">
                <div className="p-3 bg-light rounded-3 border">
                  <div className="small text-muted mb-1 d-flex align-items-center gap-1">
                    <FaUserMd className="text-secondary" /> Bác sĩ phụ trách:
                  </div>
                  <div className="fw-bold text-dark">{activeShiftData.doctorName}</div>
                  <div className="small text-muted">{activeShiftData.specialty}</div>
                </div>
              </div>
              <div className="col-sm-6">
                <div className="p-3 bg-light rounded-3 border">
                  <div className="small text-muted mb-1 d-flex align-items-center gap-1">
                    <FaHospital className="text-secondary" /> Phòng xét nghiệm & khám:
                  </div>
                  <div className="fw-bold text-dark">{activeShiftData.roomName}</div>
                  <div className="small text-muted">
                    Phòng {activeShiftData.roomNumber} · {activeShiftData.floor}
                  </div>
                </div>
              </div>
            </div>

            <div className="card border-info mb-4" style={{ backgroundColor: '#f0f9ff' }}>
              <div className="card-body">
                <h6 className="fw-bold text-info-emphasis d-flex align-items-center gap-2 mb-2">
                  <FaInfoCircle /> Hướng Dẫn Chuẩn Bị Trước Khi Đến Khám:
                </h6>
                <ul className="small text-muted mb-0 ps-3">
                  <li>Vui lòng mang theo CCCD và thẻ BHYT (nếu có) để đối chiếu tại quầy tiếp đón.</li>
                  <li>Nếu thực hiện xét nghiệm sinh hóa máu, đường huyết, vui lòng nhịn ăn sáng từ 8 – 12 tiếng.</li>
                  <li>Có mặt trước giờ hẹn từ 10 – 15 phút để lấy số thứ tự ưu tiên và kiểm tra sinh hiệu.</li>
                </ul>
              </div>
            </div>

            <div className="p-4 bg-warning-subtle border border-warning rounded-4 mb-4 text-start">
              <h6 className="fw-bold text-dark d-flex align-items-center gap-2 mb-2">
                <FaClock className="text-warning" /> Phiếu Lịch Hẹn Đang Ở Trạng Thái "Chờ Thanh Toán"
              </h6>
              <p className="small text-muted mb-0">
                Hệ thống sẽ giữ chỗ cho khung giờ của bạn trong vòng <strong>15 phút</strong>. Vui lòng thanh toán trực tuyến qua VNPAY để xác nhận lịch xét nghiệm và nhận Mã QR Check-in.
              </p>
            </div>

            <div className="d-flex flex-wrap gap-3 justify-content-end">
              <button
                type="button"
                className="btn btn-outline-secondary px-4 py-2 rounded-3"
                onClick={reset}
              >
                Đặt Lịch Khám Khác
              </button>
              <button
                type="button"
                className="btn btn-outline-primary px-4 py-2 rounded-3 d-flex align-items-center gap-2"
                onClick={() => navigate('/appointments')}
              >
                Xem Lịch Khám Của Tôi <FaArrowRight />
              </button>
              <button
                type="button"
                className="btn btn-success btn-lg px-4 py-2 rounded-3 fw-bold shadow d-flex align-items-center gap-2"
                onClick={() => {
                  const pkgPrice = selectedPackage?.price || 180000;
                  const pkgName = selectedPackage?.packageName || selectedPackage?.name || '';
                  navigate(`/payments/checkout?appointmentId=${result.appointmentId}&code=${result.appointmentCode}&amount=${pkgPrice}&pkgName=${encodeURIComponent(pkgName)}`);
                }}
              >
                Tiến Hành Thanh Toán Giữ Chỗ (15 Phút) Qua VNPAY <FaArrowRight />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bms-booking-page py-4" style={{ backgroundColor: '#f8fafc', minHeight: '100vh' }}>
      <div className="container" style={{ maxWidth: 1160 }}>
        {/* Header Breadcrumb */}
        <div className="d-flex align-items-center gap-2 mb-3 text-muted small">
          <Link to="/" className="text-decoration-none text-muted">Trang Chủ</Link>
          <span>/</span>
          <Link to="/services" className="text-decoration-none text-muted">Gói Xét Nghiệm</Link>
          <span>/</span>
          <span className="text-dark fw-semibold">Đăng Ký Lịch Khám & Xét Nghiệm (Đặt Lịch Hẹn Trực Tuyến)</span>
        </div>

        {/* Page Title */}
        <div className="mb-4">
          <div className="d-inline-flex align-items-center gap-2 px-3 py-1 rounded-pill mb-2" style={{ backgroundColor: 'rgba(94, 133, 230, 0.12)', color: '#648CF4', fontSize: '13px', fontWeight: 600 }}>
            <FaShieldAlt /> TIÊU CHUẨN ISO 15189:2022 · PHÒNG KHÁM CHUYÊN KHOA BMS
          </div>
          <h2 className="fw-bold mb-1" style={{ color: 'var(--bms-text-primary, #20242B)' }}>
            Đăng Ký Lịch Khám & Xét Nghiệm (Đặt Lịch Hẹn Trực Tuyến)
          </h2>
          <p className="text-muted mb-0">
            Hệ thống tự động đồng bộ ca làm việc của Bác sĩ trực ban và sơ đồ Phòng xét nghiệm chuyên khoa.
          </p>
        </div>

        <form onSubmit={onSubmit}>
          <div className="row g-4">
            {/* Left Column: Form Fields */}
            <div className="col-lg-8">
              {error && (
                <div className="alert alert-danger py-3 px-4 rounded-3 border-0 shadow-sm mb-4">
                  <strong>Thông báo:</strong> {error}
                </div>
              )}

              {/* SECTION 1: Patient Information */}
              <div className="card border-0 shadow-sm rounded-3 mb-4">
                <div className="card-header bg-white border-bottom py-3 px-4">
                  <h5 className="mb-0 fw-bold text-dark d-flex align-items-center gap-2">
                    <FaIdCard className="text-primary" /> 1. Thông Tin Bệnh Nhân Đặt Hẹn
                  </h5>
                </div>
                <div className="card-body p-4">
                  <div className="row g-3">
                    <div className="col-md-6">
                      <label className="form-label text-muted small fw-semibold">
                        Họ và tên bệnh nhân <span className="text-danger">*</span>
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        style={{ minHeight: 46 }}
                        value={patientInfo.name}
                        onChange={(e) => setPatientInfo({ ...patientInfo, name: e.target.value })}
                        placeholder="Ví dụ: Trần Văn An"
                        required
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label text-muted small fw-semibold">
                        Số điện thoại liên lạc <span className="text-danger">*</span>
                      </label>
                      <input
                        type="tel"
                        className="form-control"
                        style={{ minHeight: 46 }}
                        value={patientInfo.phone}
                        onChange={(e) => setPatientInfo({ ...patientInfo, phone: e.target.value })}
                        placeholder="Ví dụ: 0909123456"
                        required
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label text-muted small fw-semibold">
                        Số CCCD / Mã Định Danh (12 số)
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        style={{ minHeight: 46 }}
                        value={patientInfo.identityCard}
                        onChange={(e) => setPatientInfo({ ...patientInfo, identityCard: e.target.value })}
                        placeholder="Ví dụ: 079201004829"
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label text-muted small fw-semibold">
                        Mã thẻ BHYT (nếu có)
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        style={{ minHeight: 46 }}
                        value={patientInfo.insuranceNumber}
                        onChange={(e) => setPatientInfo({ ...patientInfo, insuranceNumber: e.target.value })}
                        placeholder="Ví dụ: DN 4 79 79 1234567"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION 2: Test Package Selection */}
              <div className="card border-0 shadow-sm rounded-3 mb-4">
                <div className="card-header bg-white border-bottom py-3 px-4">
                  <h5 className="mb-0 fw-bold text-dark d-flex align-items-center gap-2">
                    <FaVial className="text-primary" /> 2. Chọn Gói Xét Nghiệm Khám Bệnh
                  </h5>
                </div>
                <div className="card-body p-4">
                  <div className="row g-2">
                    {packages.map((pkg) => {
                      const isSelected = pkg.packageId === selectedPackageId;
                      return (
                        <div key={pkg.packageId} className="col-12">
                          <div
                            onClick={() => setSelectedPackageId(pkg.packageId)}
                            className={`p-3 rounded-3 border cursor-pointer transition d-flex align-items-center justify-content-between ${
                              isSelected ? 'border-primary bg-primary-subtle' : 'border-light-subtle bg-white'
                            }`}
                            style={{ cursor: 'pointer', transition: 'all 0.2s' }}
                          >
                            <div className="d-flex align-items-center gap-3">
                              <input
                                type="radio"
                                name="packageRadio"
                                checked={isSelected}
                                onChange={() => setSelectedPackageId(pkg.packageId)}
                                className="form-check-input mt-0"
                                style={{ width: 18, height: 18 }}
                              />
                              <div>
                                <div className="fw-bold text-dark">{pkg.packageName}</div>
                                <div className="small text-muted">{pkg.fastingRule}</div>
                              </div>
                            </div>
                            <div className="text-end">
                              <div className="fw-bold text-primary fs-6">
                                {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(pkg.price)}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* SECTION 3: Shift, Doctor & Room Management */}
              <div className="card border-0 shadow-sm rounded-3 mb-4">
                <div className="card-header bg-white border-bottom py-3 px-4">
                  <h5 className="mb-0 fw-bold text-dark d-flex align-items-center gap-2">
                    <FaCalendarAlt className="text-primary" /> 3. Chọn Ngày, Ca Khám & Phòng Xét Nghiệm
                  </h5>
                </div>
                <div className="card-body p-4">
                  {/* Date Input */}
                  <div className="mb-4">
                    <label className="form-label text-muted small fw-semibold">
                      Ngày hẹn khám / lấy mẫu <span className="text-danger">*</span>
                    </label>
                    <input
                      type="date"
                      className="form-control"
                      style={{ minHeight: 48, maxWidth: 320 }}
                      min={new Date().toISOString().slice(0, 10)}
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      required
                    />
                    <div className="form-text text-muted">
                      Hệ thống tự động tải lịch trực ca của Bác sĩ và phòng Lab theo ngày bạn chọn.
                    </div>
                  </div>

                  {/* SHIFT PICKER: Ca Sáng, Ca Chiều, Ca Tối */}
                  <div className="mb-4">
                    <label className="form-label text-muted small fw-semibold d-block mb-2">
                      Chọn Ca Khám Trực Ban <span className="text-danger">*</span>
                    </label>
                    <div className="row g-2">
                      {SHIFT_DEFINITIONS.map((shift) => {
                        const isSelected = selectedShiftId === shift.id;
                        return (
                          <div key={shift.id} className="col-md-4">
                            <div
                              onClick={() => setSelectedShiftId(shift.id)}
                              className={`p-3 rounded-3 border h-100 cursor-pointer ${
                                isSelected
                                  ? 'border-primary bg-primary text-white shadow-sm'
                                  : 'border-light-subtle bg-light text-dark'
                              }`}
                              style={{ cursor: 'pointer', transition: 'all 0.2s' }}
                            >
                              <div className="d-flex align-items-center justify-content-between mb-1">
                                <span className="fs-5">{shift.icon}</span>
                                <span
                                  className={`badge rounded-pill ${
                                    isSelected ? 'bg-white text-primary' : 'bg-secondary-subtle text-secondary'
                                  }`}
                                  style={{ fontSize: '11px' }}
                                >
                                  {shift.timeRange}
                                </span>
                              </div>
                              <div className="fw-bold mb-1">{shift.name}</div>
                              <div
                                style={{
                                  fontSize: '12px',
                                  color: isSelected ? 'rgba(255,255,255,0.85)' : '#64748b'
                                }}
                              >
                                {shift.desc}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* DYNAMIC DOCTOR & ROOM INFO CARD */}
                  <div className="card border-0 mb-4 rounded-4" style={{ backgroundColor: 'var(--bms-surface-card, #EEF2F6)', borderLeft: '4px solid #648CF4' }}>
                    <div className="card-body p-3">
                      <div className="d-flex align-items-start gap-3">
                        <div
                          className="rounded-circle text-white d-flex align-items-center justify-content-center flex-shrink-0"
                          style={{ width: 44, height: 44, backgroundColor: '#648CF4' }}
                        >
                          <FaUserMd className="fs-5" />
                        </div>
                        <div className="flex-grow-1">
                          <div className="d-flex flex-wrap align-items-center justify-content-between gap-2">
                            <div>
                              <span className="badge rounded-pill text-white mb-1" style={{ backgroundColor: '#648CF4' }}>
                                Bác Sĩ & Phòng Khám Trực Ban {selectedShiftId === 'Morning' ? 'Ca Sáng' : selectedShiftId === 'Afternoon' ? 'Ca Chiều' : 'Ca Tối'}
                              </span>
                              <h6 className="fw-bold text-dark mb-0">{activeShiftData.doctorName}</h6>
                              <div className="small text-muted">{activeShiftData.specialty}</div>
                            </div>
                            <div className="text-md-end">
                              <div className="small text-muted d-flex align-items-center gap-1 justify-content-md-end">
                                <FaHospital style={{ color: '#648CF4' }} /> <strong>{activeShiftData.roomName}</strong>
                              </div>
                              <div className="badge bg-light text-dark border rounded-pill">
                                Phòng {activeShiftData.roomNumber} · {activeShiftData.floor}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* TIME SLOT PICKER */}
                  <div className="mb-3">
                    <label className="form-label text-muted small fw-semibold d-flex align-items-center gap-1">
                      <FaClock style={{ color: '#648CF4' }} /> Khung giờ lấy mẫu cụ thể trong ca:
                    </label>
                    {loadingSlots ? (
                      <div className="text-muted small py-2">Đang tải các khung giờ trống...</div>
                    ) : (
                      <div className="d-flex flex-wrap gap-2">
                        {shiftSlots.map((item) => {
                          const slot = item.slotTime;
                          const isAvailable = item.isAvailable;
                          const isPicked = slotTime === slot;
                          return (
                            <button
                              key={slot}
                              type="button"
                              disabled={!isAvailable}
                              onClick={() => isAvailable && setSlotTime(slot)}
                              className={`btn btn-sm px-3 py-2 rounded-pill fw-semibold ${
                                !isAvailable
                                    ? 'btn-light text-muted border-light text-decoration-line-through'
                                    : isPicked
                                    ? 'btn-primary shadow-sm'
                                    : 'btn-outline-secondary'
                              }`}
                              style={{
                                backgroundColor: isPicked ? '#648CF4' : undefined,
                                borderColor: isPicked ? '#648CF4' : '#cbd5e1',
                                minWidth: 80,
                                opacity: isAvailable ? 1 : 0.5,
                                cursor: isAvailable ? 'pointer' : 'not-allowed'
                              }}
                              title={isAvailable ? `Khung giờ ${slot}` : `Khung giờ ${slot} đã đầy`}
                            >
                              {slot}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* CLINICAL NOTES */}
                  <div className="mt-4">
                    <label className="form-label text-muted small fw-semibold">
                      Ghi chú lâm sàng / Dặn dò chuẩn bị
                    </label>
                    <textarea
                      className="form-control rounded-3"
                      rows={2}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Ghi chú tiền sử bệnh, dị ứng thuốc hoặc tình trạng sức khỏe cần lưu ý..."
                    />
                  </div>
                </div>

                <div className="card-footer bg-white border-top p-4 d-flex flex-wrap align-items-center justify-content-between gap-3">
                  <div className="small text-muted">
                    Lịch khám được đồng bộ ngay lập tức tới bộ phận tiếp nhận & phòng Lab.
                  </div>
                  <div className="d-flex gap-2">
                    <button
                      type="button"
                      className="btn btn-outline-secondary px-4 py-2 rounded-pill"
                      onClick={() => navigate('/services')}
                    >
                      Quay Lại
                    </button>
                    <button
                      type="submit"
                      className="btn btn-primary px-4 py-2 rounded-pill fw-semibold d-flex align-items-center gap-2"
                      style={{ backgroundColor: '#648CF4', borderColor: '#648CF4', minHeight: 46 }}
                      disabled={loading || !slotTime || !selectedPackageId}
                    >
                      {loading ? 'Đang Xử Lý...' : 'Xác Nhận Đặt Lịch Xét Nghiệm'}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Appointment Summary & Hospital Standards */}
            <div className="col-lg-4">
              <div className="card border-0 shadow-sm rounded-3 mb-4 sticky-top" style={{ top: '90px' }}>
                <div className="card-header bg-white border-bottom py-3 px-4">
                  <h6 className="mb-0 fw-bold text-dark d-flex align-items-center gap-2">
                    <FaFileMedical className="text-primary" /> Tóm Tắt Phiếu Hẹn
                  </h6>
                </div>
                <div className="card-body p-4">
                  {selectedPackage && (
                    <div className="mb-3 pb-3 border-bottom">
                      <div className="small text-muted">Gói xét nghiệm chỉ định:</div>
                      <div className="fw-bold text-dark mt-1">{selectedPackage.packageName}</div>
                      <div className="fw-bold text-primary mt-1 fs-5">
                        {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(selectedPackage.price)}
                      </div>
                    </div>
                  )}

                  <div className="mb-3 pb-3 border-bottom">
                    <div className="small text-muted mb-1">Thời gian & Ca khám:</div>
                    <div className="fw-semibold text-dark">
                      {selectedShiftId === 'Morning' ? 'Ca Sáng' : selectedShiftId === 'Afternoon' ? 'Ca Chiều' : 'Ca Tối'} · {slotTime || '--:--'}
                    </div>
                    <div className="small text-muted">{date}</div>
                  </div>

                  <div className="mb-3 pb-3 border-bottom">
                    <div className="small text-muted mb-1">Bác sĩ tiếp nhận:</div>
                    <div className="fw-semibold text-dark">{activeShiftData.doctorName}</div>
                    <div className="small text-muted">{activeShiftData.specialty}</div>
                  </div>

                  <div className="mb-3">
                    <div className="small text-muted mb-1">Phòng khám & Lấy mẫu:</div>
                    <div className="fw-semibold text-dark">{activeShiftData.roomName}</div>
                    <div className="small text-muted">
                      Phòng {activeShiftData.roomNumber} · {activeShiftData.floor}
                    </div>
                  </div>

                  <div className="p-3 rounded-3" style={{ backgroundColor: '#f8fafc', border: '1px dashed #cbd5e1' }}>
                    <div className="small fw-bold text-dark mb-1">Quy định tiếp nhận:</div>
                    <div className="small text-muted">
                      Quý khách vui lòng có mặt trước 10 phút. Xuất trình tin nhắn SMS hoặc mã cuộc hẹn tại quầy Lễ tân BMS để được phát số tự động vào phòng Lab.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

export default BookAppointmentPage;
