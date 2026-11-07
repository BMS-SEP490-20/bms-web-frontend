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

  // Initialize with fallback immediately so user NEVER sees stuck loading state
  const [packages, setPackages] = useState(() => {
    if (propPackages && propPackages.length > 0) return propPackages;
    return DEFAULT_FALLBACK_PACKAGES;
  });

  const [selectedPackageId, setSelectedPackageId] = useState(() => {
    if (preselectedPkgId || preselectedName) {
      const match = DEFAULT_FALLBACK_PACKAGES.find((p) => packageMatchesSelection(p, preselectedPkgId, preselectedName));
      if (match) return match.packageId;
    }
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
  const [selectedDoctorId, setSelectedDoctorId] = useState('');
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

  const shiftDoctors = useMemo(() => {
    return availableShifts.filter(
      (s) => (s.shiftType || '').toLowerCase() === selectedShiftId.toLowerCase()
    );
  }, [availableShifts, selectedShiftId]);

  const activeShiftData = useMemo(() => {
    if (shiftDoctors.length === 0) return null;
    return shiftDoctors.find((s) => s.doctorId === selectedDoctorId) || shiftDoctors[0];
  }, [shiftDoctors, selectedDoctorId]);

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

                  <div className={`bms-book-doctor is-${selectedShiftId.toLowerCase()}${activeShiftData ? '' : ' is-empty'}`}>
                    {loadingShifts ? (
                      <span>Đang tải ca trực...</span>
                    ) : !activeShiftData ? (
                      <span>Ca này chưa có bác sĩ trực.</span>
                    ) : (
                      <>
                        <img src="/assets/bms/svg/icons/lab/doctor-review.svg" alt="" />
                        <div>
                          <strong>{activeShiftData.doctorName || 'Chưa có tên trên ca trực'}</strong>
                          <span>{activeShiftData.specialty || 'Chưa ghi chuyên khoa'}</span>
                        </div>
                        <div className="bms-book-room">
                          <strong>{activeShiftData.roomName || 'Chưa gán phòng'}</strong>
                          <span>
                            {[
                              activeShiftData.roomNumber ? `Phòng ${activeShiftData.roomNumber}` : '',
                              activeShiftData.floor || ''
                            ].filter(Boolean).join(' · ')}
                          </span>
                        </div>
                      </>
                    )}
                  </div>

                  {shiftDoctors.length > 1 && (
                    <div className="bms-book-doctor-picks">
                      {shiftDoctors.map((doctor) => (
                        <button
                          key={`${doctor.doctorId}-${doctor.roomId}`}
                          type="button"
                          className={doctor.doctorId === activeShiftData?.doctorId ? 'is-selected' : ''}
                          onClick={() => setSelectedDoctorId(doctor.doctorId)}
                        >
                          {doctor.doctorName || 'Chưa có tên'}
                        </button>
                      ))}
                    </div>
                  )}

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
