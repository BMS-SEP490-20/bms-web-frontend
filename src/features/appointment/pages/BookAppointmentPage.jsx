import React, { useCallback, useEffect, useState, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
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
import BmsPackageIcon from '../../../shared/components/kit/BmsPackageIcon';
import { getCategoryIconKey } from '../../../shared/components/kit/bmsIconMaps';
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

const WEEKDAYS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

function toDateKey(value) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function monthCells(cursor) {
  const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  const lead = (first.getDay() + 6) % 7;
  const count = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
  const cells = Array.from({ length: lead }, () => null);
  for (let day = 1; day <= count; day += 1) {
    cells.push(new Date(cursor.getFullYear(), cursor.getMonth(), day));
  }
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

function packageIconKey(pkg) {
  const blob = `${pkg.category || ''} ${pkg.packageName || ''} ${pkg.packageCode || ''}`;
  const fromKit = getCategoryIconKey(blob);
  if (fromKit !== 'general') return fromKit;
  const name = blob.toLowerCase();
  if (name.includes('tế bào') || name.includes('cbc') || name.includes('huyết học')) return 'hematology';
  return 'general';
}

export function BookAppointmentPage({
  patientId: initialPatientId = '',
  initialPackageIds = [],
  packages: propPackages = [],
}) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const storedUser = useMemo(() => getStoredUser(), []);
  const preselectedPkgId = searchParams.get('packageId') || searchParams.get('id') || '';
  const preselectedName = searchParams.get('packageName') || '';

  const packageMatchesSelection = (pkg, selectedId, selectedName) => {
    const id = String(selectedId || '').trim().toLowerCase();
    const name = String(selectedName || '').trim().toLowerCase();
    const fields = [pkg.packageId, pkg.packageCode, pkg.sourceId, pkg.id]
      .filter(Boolean)
      .map((value) => String(value).trim().toLowerCase());
    if (id && fields.includes(id)) return true;
    return Boolean(name && String(pkg.packageName || '').trim().toLowerCase() === name);
  };

  // Pure dynamic state from database (cấm hardcode fallback)
  const [packages, setPackages] = useState(() => {
    if (propPackages && propPackages.length > 0) return propPackages;
    return [];
  });

  const [selectedPackageId, setSelectedPackageId] = useState(() => {
    if (preselectedPkgId) return preselectedPkgId;
    if (initialPackageIds.length > 0) return initialPackageIds[0];
    return '';
  });

  const [patientInfo, setPatientInfo] = useState({
    name: storedUser?.fullName || '',
    phone: storedUser?.phone || storedUser?.phoneNumber || '',
    identityCard: storedUser?.identityCard || storedUser?.identityNumber || storedUser?.idCard || '',
    patientId: storedUser?.patientId || storedUser?.id || initialPatientId || '',
    insuranceNumber: storedUser?.healthInsuranceNumber || ''
  });

  const [date, setDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return toDateKey(d);
  });
  const [calendarCursor, setCalendarCursor] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return new Date(d.getFullYear(), d.getMonth(), 1);
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

  const [validationError, setValidationError] = useState('');

  // Quick dates for 1-click pill navigation to prevent dead-end traps (suggests next upcoming days)
  const quickDates = useMemo(() => {
    const list = [];
    const base = date ? new Date(date + 'T00:00:00') : new Date();
    for (let i = 1; i <= 4; i++) {
      const d = new Date(base);
      d.setDate(base.getDate() + i);
      list.push({
        key: toDateKey(d),
        label: `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`,
        weekday: ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'][d.getDay()]
      });
    }
    return list;
  }, [date]);

  // Patient identity validation: Họ tên & SĐT là đủ để xác lập cuộc hẹn y tế (không ép buộc biết trước nhóm máu!)
  const isProfileComplete = useMemo(() => {
    const name = patientProfile?.fullName || patientInfo.name || storedUser?.fullName || '';
    const phone = patientProfile?.phoneNumber || patientInfo.phone || storedUser?.phone || '';
    return Boolean(name.trim() && phone.trim());
  }, [patientProfile, patientInfo, storedUser]);

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
            packageId: p.packageCode || p.code || p.id || p.packageId || `PKG-${idx}`,
            packageCode: p.packageCode || p.code || '',
            sourceId: p.id || p.packageId || '',
            packageName: p.packageName || p.name || 'Gói xét nghiệm lâm sàng',
            category: p.category || '',
            price: p.price ?? 0,
            description: p.description || '',
            fastingRule: p.fastingRule || ''
          }));
          setPackages(mapped);
          setSelectedPackageId((current) => {
            if (current && mapped.some(p => p.packageId === current)) return current;
            if (preselectedPkgId) {
              const found = mapped.find(p => packageMatchesSelection(p, preselectedPkgId, preselectedName));
              if (found) return found.packageId;
            }
            return mapped[0]?.packageId || '';
          });
        }
      })
      .catch(() => {
        // Fallback already handled
      });

    return () => {
      isMounted = false;
    };
  }, [preselectedPkgId, preselectedName]);

  // Sync preselected package from URL whenever preselectedPkgId or packages changes
  useEffect(() => {
    if (preselectedPkgId || preselectedName) {
      const match = packages.find((p) => packageMatchesSelection(p, preselectedPkgId, preselectedName));
      if (match) {
        setSelectedPackageId(match.packageId);
        requestAnimationFrame(() => {
          document.querySelector(`[data-package-id="${CSS.escape(match.packageId)}"]`)?.scrollIntoView({ block: 'nearest' });
        });
      }
    }
  }, [preselectedPkgId, preselectedName, packages]);

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

  const selectedPackage = useMemo(() => {
    return (
      packages.find((p) => p.packageId === selectedPackageId || p.packageCode === selectedPackageId) ||
      packages[0] ||
      null
    );
  }, [packages, selectedPackageId]);

  // Khớp Tam Giác Y Khoa Chuẩn (Auto-Allocation): Gói xét nghiệm -> Bác sĩ Chuyên khoa -> Phòng khám chuyên khoa
  const shiftDoctors = useMemo(() => {
    if (!availableShifts || availableShifts.length === 0) return [];
    const inShift = availableShifts.filter(
      (s) => (s.shiftType || '').toLowerCase() === selectedShiftId.toLowerCase()
    );
    if (inShift.length === 0) return [];

    const pkgCat = (selectedPackage?.category || '').toLowerCase().trim();
    if (pkgCat) {
      // 1. Ưu tiên 1: Khớp chính xác chuyên khoa y tế
      const exactMatched = inShift.filter((s) => {
        const spec = (s.specialty || '').toLowerCase();
        const dept = (s.department || '').toLowerCase();
        const room = (s.roomName || '').toLowerCase();
        return (
          spec.includes(pkgCat) ||
          dept.includes(pkgCat) ||
          room.includes(pkgCat) ||
          pkgCat.includes(spec) ||
          (pkgCat.includes('huyết học') && spec.includes('huyết học')) ||
          (pkgCat.includes('sinh hóa') && spec.includes('sinh hóa')) ||
          (pkgCat.includes('miễn dịch') && spec.includes('miễn dịch')) ||
          (pkgCat.includes('đông máu') && spec.includes('đông máu'))
        );
      });
      if (exactMatched.length > 0) return exactMatched;

      // 2. Ưu tiên 2: Bác sĩ Đa khoa Tổng quát tiếp nhận tư vấn
      const generalMatched = inShift.filter((s) => {
        const spec = (s.specialty || '').toLowerCase();
        const dept = (s.department || '').toLowerCase();
        const room = (s.roomName || '').toLowerCase();
        return spec.includes('tổng quát') || dept.includes('tổng quát') || room.includes('tổng quát');
      });
      if (generalMatched.length > 0) return generalMatched;

      // Tuyệt đối không fallback sang bác sĩ chuyên khoa khác để bảo đảm an toàn lâm sàng
      return [];
    }

    return inShift;
  }, [availableShifts, selectedShiftId, selectedPackage]);

  // Hệ thống tự động điều phối Bác sĩ chuyên khoa phụ trách ca này (không để bệnh nhân tự chọn)
  const activeShiftData = useMemo(() => {
    if (shiftDoctors.length === 0) return null;
    return shiftDoctors[0];
  }, [shiftDoctors]);

  // Fasting clinical warning indicator
  const requiresFasting = useMemo(() => {
    const rule = (selectedPackage?.fastingRule || '').toLowerCase();
    const cat = (selectedPackage?.category || '').toLowerCase();
    const name = (selectedPackage?.packageName || '').toLowerCase();
    return rule.includes('nhịn ăn') || cat.includes('sinh hóa') || name.includes('đường huyết') || name.includes('mỡ máu') || name.includes('glucose');
  }, [selectedPackage]);

  const showFastingWarning = requiresFasting && (selectedShiftId === 'Afternoon' || selectedShiftId === 'Evening');

  // Load slots for the active doctor and date
  useEffect(() => {
    if (!activeShiftData?.doctorId || !date) {
      setAllSlots([]);
      return;
    }
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
    if (!activeShiftData) return [];
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

    return normalized;
  }, [allSlots, activeShiftData]);

  // Auto-select first AVAILABLE slot of the shift
  useEffect(() => {
    const availableSlots = shiftSlots.filter((s) => s.isAvailable);
    const currentIsValid = availableSlots.some((s) => s.slotTime === slotTime);

    if (!currentIsValid) {
      setSlotTime(availableSlots[0]?.slotTime || '');
    }
  }, [shiftSlots, slotTime]);

  const onSubmit = async (e) => {
    e.preventDefault();
    setValidationError('');

    if (!isProfileComplete) {
      setValidationError('MSG-ERR-PROFILE-01: Quý khách vui lòng hoàn thiện Họ tên và Số điện thoại liên hệ để nhân viên y tế xác nhận lịch hẹn.');
      return;
    }
    if (!selectedPackageId) {
      setValidationError('MSG-ERR-APPT-03: Vui lòng chọn gói xét nghiệm để tiếp tục.');
      return;
    }
    if (!activeShiftData?.doctorId || !slotTime) {
      setValidationError('MSG-ERR-APPT-04: Ca làm việc chưa có Bác sĩ trực hoặc chưa chọn khung giờ lấy mẫu. Vui lòng chọn ca hoặc ngày khác.');
      return;
    }

    await book({
      patientId: patientInfo.patientId,
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

  if (result) {
    const pkgPrice = selectedPackage?.price || 0;
    const pkgName = selectedPackage?.packageName || selectedPackage?.name || 'Gói xét nghiệm';
    const roomLine = [
      activeShiftData?.roomName || 'Chưa gán phòng',
      activeShiftData?.roomNumber ? `Phòng ${activeShiftData.roomNumber}` : ''
    ].filter(Boolean).join(' · ');
    const visitDate = (() => {
      const raw = result.appointmentDate;
      const parsed = raw ? new Date(raw) : null;
      if (parsed && !Number.isNaN(parsed.getTime())) return parsed.toLocaleDateString('vi-VN');
      return raw || date;
    })();
    const pay = () => {
      navigate(`/payments/checkout?appointmentId=${result.appointmentId}&code=${result.appointmentCode}&amount=${pkgPrice}&pkgName=${encodeURIComponent(pkgName)}`);
    };

    return (
      <div className="bms-pay-sheet">
        <header>
          <h1>Phiếu giữ chỗ</h1>
          <p>Đặt lịch thành công</p>
          <strong>{result.appointmentCode}</strong>
        </header>

        <dl>
          <div>
            <dt>Gói xét nghiệm</dt>
            <dd>{pkgName}</dd>
          </div>
          <div>
            <dt>Ngày khám</dt>
            <dd>{visitDate}</dd>
          </div>
          <div>
            <dt>Giờ lấy mẫu</dt>
            <dd>{result.slotTime}</dd>
          </div>
          <div>
            <dt>Bác sĩ</dt>
            <dd>{activeShiftData?.doctorName || 'Chưa có bác sĩ trực'}</dd>
          </div>
          <div>
            <dt>Phòng</dt>
            <dd>{roomLine}</dd>
          </div>
          <div className="is-amount">
            <dt>Số tiền</dt>
            <dd>{new Intl.NumberFormat('vi-VN').format(pkgPrice)} đ</dd>
          </div>
        </dl>

        <p className="bms-pay-note">Chỗ được giữ 15 phút. Thanh toán để xác nhận lịch và nhận mã check-in.</p>

        <button type="button" className="bms-pay-submit" onClick={pay}>Thanh toán chuyển khoản</button>
        <div className="bms-pay-links">
          <button type="button" onClick={() => navigate('/appointments')}>Xem lịch của tôi</button>
          <button type="button" onClick={reset}>Đặt lịch khác</button>
        </div>
      </div>
    );
  }

  return (
    <div className="bms-booking-page py-2" style={{ backgroundColor: '#f8fafc', minHeight: '100vh' }}>
      <div className="container" style={{ maxWidth: 1160 }}>

        <header className="bms-page-header">
          <h1 className="bms-page-title">Đặt lịch khám</h1>
        </header>

        <form onSubmit={onSubmit}>
          <div className="row g-4">
            {/* Left Column: Form Fields */}
            <div className="col-lg-8">
              {error && (
                <div className="alert alert-danger py-3 px-3 rounded-3 border-0 shadow-sm mb-4">
                  <strong>Thông báo:</strong> {error}
                </div>
              )}

              {/* SECTION 1: Patient Information */}
              <section className="bms-book-patient">
                <h2>Thông tin bệnh nhân</h2>
                <dl>
                  <div><dt>Họ tên</dt><dd>{patientInfo.name || '—'}</dd></div>
                  <div><dt>Điện thoại</dt><dd>{patientInfo.phone || '—'}</dd></div>
                  <div><dt>CCCD</dt><dd>{patientInfo.identityCard || '—'}</dd></div>
                </dl>
              </section>

              {/* SECTION 2: Test Package Selection */}
              <div className="card border-0 shadow-sm rounded-3 mb-4">
                <div className="card-header bg-white border-bottom py-3 px-3">
                  <h5 className="mb-0 fw-bold text-dark d-flex align-items-center gap-2">
                    <FaVial className="text-primary" /> 2. Chọn Gói Xét Nghiệm Khám Bệnh
                  </h5>
                </div>
                <div className="card-body p-2">
                  <div className="bms-pkg-list" role="listbox" aria-label="Chọn gói xét nghiệm">
                    {packages.map((pkg) => {
                      const isSelected = pkg.packageId === selectedPackageId;
                      return (
                        <button
                          key={pkg.packageId}
                          type="button"
                          role="option"
                          data-package-id={pkg.packageId}
                          aria-selected={isSelected}
                          className={`bms-pkg-item${isSelected ? ' is-selected' : ''}`}
                          onClick={() => setSelectedPackageId(pkg.packageId)}
                        >
                          <span className="bms-pkg-icon">
                            <BmsPackageIcon name={packageIconKey(pkg)} size={40} />
                          </span>
                          <span className="bms-pkg-copy">
                            <span className="bms-pkg-name">{pkg.packageName}</span>
                            {pkg.fastingRule ? <span className="bms-pkg-note">{pkg.fastingRule}</span> : null}
                          </span>
                          <span className="bms-pkg-price">
                            {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(pkg.price || 0)}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* SECTION 3: Shift, Doctor & Room Management */}
              <div className="card border-0 shadow-sm rounded-3 mb-4">
                <div className="card-header bg-white border-bottom py-3 px-3">
                  <h5 className="mb-0 fw-bold text-dark">Chọn ngày và ca</h5>
                </div>
                <div className="card-body p-3">
                  <div className="bms-book-when">
                  <div className="bms-book-cal">
                    <div className="bms-book-cal-head">
                      <button
                        type="button"
                        aria-label="Tháng trước"
                        onClick={() => setCalendarCursor((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1))}
                      >
                        ‹
                      </button>
                      <strong>
                        Tháng {calendarCursor.getMonth() + 1}, {calendarCursor.getFullYear()}
                      </strong>
                      <button
                        type="button"
                        aria-label="Tháng sau"
                        onClick={() => setCalendarCursor((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1))}
                      >
                        ›
                      </button>
                    </div>
                    <div className="bms-book-cal-week">
                      {WEEKDAYS.map((label) => <span key={label}>{label}</span>)}
                    </div>
                    <div className="bms-book-cal-grid">
                      {monthCells(calendarCursor).map((cell, index) => {
                        if (!cell) return <span key={`empty-${index}`} />;
                        const key = toDateKey(cell);
                        const today = toDateKey(new Date());
                        const disabled = key < today;
                        return (
                          <button
                            key={key}
                            type="button"
                            disabled={disabled}
                            className={key === date ? 'is-selected' : ''}
                            onClick={() => setDate(key)}
                          >
                            {cell.getDate()}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="bms-book-shifts">
                    {SHIFT_DEFINITIONS.map((shift) => (
                      <button
                        key={shift.id}
                        type="button"
                        className={`is-${shift.id.toLowerCase()}${selectedShiftId === shift.id ? ' is-selected' : ''}`}
                        onClick={() => setSelectedShiftId(shift.id)}
                      >
                        <strong>{shift.name}</strong>
                        <span>{shift.timeRange}</span>
                      </button>
                    ))}
                  </div>
                  </div>

                  {showFastingWarning && (
                    <div className="alert alert-warning border-0 rounded-3 p-2.5 my-3 d-flex align-items-start gap-2 text-dark" style={{ backgroundColor: '#fef3c7', fontSize: '12.5px' }}>
                      <FaInfoCircle className="text-warning mt-0.5 flex-shrink-0" />
                      <div>
                        <strong>Dặn dò lâm sàng:</strong> Gói xét nghiệm này có chỉ định nhịn ăn 8 – 12 giờ. Nếu chọn ca Chiều hoặc Tối, quý khách vui lòng đảm bảo đã nhịn ăn đủ thời gian, hoặc khuyến nghị chuyển sang <strong>Ca Sáng</strong> để kết quả đạt độ chính xác tối đa.
                      </div>
                    </div>
                  )}

                  {(!activeShiftData || shiftSlots.length === 0) && (
                    <div className="alert alert-warning border-0 rounded-3 p-3 my-3" style={{ backgroundColor: '#fffbeb', borderLeft: '4px solid #f59e0b' }}>
                      <div className="d-flex align-items-center gap-2 fw-bold text-dark small mb-1">
                        <FaExclamationTriangle className="text-warning flex-shrink-0" />
                        <span>
                          {!activeShiftData
                            ? `[MSG-ERR-APPT-04] Ca ${selectedShiftId === 'Morning' ? 'Sáng' : selectedShiftId === 'Afternoon' ? 'Chiều' : 'Tối'} ngày ${date} hiện chưa có Bác sĩ chuyên khoa ${selectedPackage?.category || ''} trực tiếp nhận.`
                            : `[MSG-ERR-APPT-04] Ca ${selectedShiftId === 'Morning' ? 'Sáng' : selectedShiftId === 'Afternoon' ? 'Chiều' : 'Tối'} ngày ${date} của ${activeShiftData.doctorName} đã kín lịch hẹn (hết khung giờ trống).`}
                        </span>
                      </div>
                      <div className="small text-muted mb-2">
                        Quý khách vui lòng chọn ca khác trong ngày hoặc chuyển nhanh sang các ngày tiếp theo có ca trực sẵn sàng:
                      </div>
                      <div className="d-flex align-items-center gap-2 flex-wrap">
                        {quickDates.map((qd) => (
                          <button
                            key={qd.key}
                            type="button"
                            className="btn btn-sm btn-outline-primary"
                            style={{ borderRadius: '999px', fontSize: '12px', padding: '4px 12px' }}
                            onClick={() => setDate(qd.key)}
                          >
                            {qd.weekday} ({qd.label})
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Thẻ Điều Phối Y Khoa Chuyên Biệt (Auto-Allocation - Khóa chặt theo Chuyên khoa Gói) */}
                  <div className={`bms-book-doctor is-${selectedShiftId.toLowerCase()}${activeShiftData ? '' : ' is-empty'}`} style={{ borderLeft: '4px solid #16a34a' }}>
                    {loadingShifts ? (
                      <span className="text-muted small py-2 d-flex align-items-center gap-2">
                        <span className="spinner-border spinner-border-sm text-primary" role="status" />
                        Đang đối soát lịch trực Bác sĩ chuyên khoa...
                      </span>
                    ) : !activeShiftData ? (
                      <div className="py-2 text-muted small d-flex align-items-center gap-2">
                        <FaExclamationTriangle className="text-warning flex-shrink-0" />
                        <span>Ca này hiện chưa có Bác sĩ chuyên khoa {selectedPackage?.category || ''} trực tiếp nhận. Quý khách vui lòng chọn ca khác hoặc ngày khác.</span>
                      </div>
                    ) : (
                      <>
                        <img src="/assets/bms/svg/icons/lab/doctor-review.svg" alt="Doctor Review" />
                        <div>
                          <div className="d-flex align-items-center gap-2 mb-1 flex-wrap">
                            <strong className="text-dark mb-0">{activeShiftData.doctorName || 'Bác sĩ Phụ trách'}</strong>
                            <span className="badge bg-success-subtle text-success border border-success-subtle px-2 py-0.5" style={{ fontSize: '11px', borderRadius: '999px' }}>
                              <FaCheckCircle className="me-1" /> Điều phối tự động
                            </span>
                          </div>
                          <span className="text-primary fw-medium" style={{ fontSize: '12.5px' }}>
                            Chuyên khoa: {activeShiftData.specialty || selectedPackage?.category || 'Chuyên khoa xét nghiệm'}
                          </span>
                        </div>
                        <div className="bms-book-room text-end">
                          <strong className="text-dark">{activeShiftData.roomName || 'Phòng khám chuyên khoa'}</strong>
                          <span className="text-muted" style={{ fontSize: '12px' }}>
                            {[
                              activeShiftData.roomNumber ? `Phòng ${activeShiftData.roomNumber}` : '',
                              activeShiftData.floor || ''
                            ].filter(Boolean).join(' · ')}
                          </span>
                        </div>
                      </>
                    )}
                  </div>

                  <div className="bms-book-slots">
                    {loadingSlots ? (
                      <span className="bms-book-duty">Đang tải khung giờ trống...</span>
                    ) : shiftSlots.length === 0 ? (
                      <span className="bms-book-duty">Ca này chưa có khung giờ trống.</span>
                    ) : shiftSlots.map((item) => (
                      <button
                        key={item.slotTime}
                        type="button"
                        disabled={!item.isAvailable}
                        className={slotTime === item.slotTime ? 'is-selected' : ''}
                        onClick={() => item.isAvailable && setSlotTime(item.slotTime)}
                      >
                        {item.slotTime}
                      </button>
                    ))}
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
              </div>

              {(validationError || error) && (
                <div className="alert alert-danger border-0 rounded-3 p-3 mb-3 d-flex align-items-center gap-2 text-dark small" style={{ backgroundColor: '#fef2f2', borderLeft: '4px solid #ef4444' }}>
                  <FaExclamationTriangle className="text-danger flex-shrink-0" />
                  <span>{validationError || error}</span>
                </div>
              )}

              <div className="bms-book-actions">
                <button type="button" onClick={() => navigate('/services')}>Quay lại</button>
                <button type="submit" disabled={loading || !slotTime || !selectedPackageId}>
                  {loading ? 'Đang xử lý...' : 'Xác nhận đặt lịch'}
                </button>
              </div>
            </div>

            {/* Right Column: Appointment Summary & Hospital Standards */}
            <div className="col-lg-4">
              <div className="card border-0 shadow-sm rounded-3 mb-4 sticky-top" style={{ top: '90px' }}>
                <div className="card-header bg-white border-bottom py-3 px-3">
                  <h6 className="mb-0 fw-bold text-dark d-flex align-items-center gap-2">
                    <FaFileMedical className="text-primary" /> Tóm Tắt Phiếu Hẹn
                  </h6>
                </div>
                <div className="card-body p-2">
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
                    <div className="fw-semibold text-dark">{activeShiftData?.doctorName || 'Chưa có bác sĩ trực'}</div>
                    <div className="small text-muted">{activeShiftData?.specialty || ''}</div>
                  </div>

                  <div className="mb-3">
                    <div className="small text-muted mb-1">Phòng khám & Lấy mẫu:</div>
                    <div className="fw-semibold text-dark">{activeShiftData?.roomName || 'Chưa gán phòng'}</div>
                    <div className="small text-muted">
                      {[
                        activeShiftData?.roomNumber ? `Phòng ${activeShiftData.roomNumber}` : '',
                        activeShiftData?.floor || ''
                      ].filter(Boolean).join(' · ')}
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
