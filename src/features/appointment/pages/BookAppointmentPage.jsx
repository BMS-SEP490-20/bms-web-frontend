import React, { useCallback, useEffect, useState, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Calendar, Clock, Stethoscope, Hospital as LucideHospital, CheckCircle2, TestTube2, Info, ArrowRight, CalendarCheck, IdCard, Phone, FileHeart, MapPin, FileText, AlertTriangle, Search } from 'lucide-react';
import '../appointment.css';
import api from '../../../config/api';
import { useBookAppointment } from '../hooks/useBookAppointment';
import { getAvailableSlots, getAvailableDoctors } from '../api/appointmentApi';
import { fetchServiceCatalog } from '../../catalog/api/catalogApi';
import { ROLES, resolveRoleId, getStoredUser } from '../../../constants/roles';
import BmsPackageIcon from '../../../shared/components/kit/BmsPackageIcon';
import { getCategoryIconKey } from '../../../shared/components/kit/bmsIconMaps';
import { getMyPatientInformation, searchPatients, getPatientById } from '../../../services/patientService';

const SHIFT_DEFINITIONS = [
  {
    id: 'Morning',
    name: 'Ca Sáng',
    timeRange: '07:00 – 11:30',
    desc: 'Khung giờ lấy máu xét nghiệm chuẩn nhịn ăn sáng'
  },
  {
    id: 'Afternoon',
    name: 'Ca Chiều',
    timeRange: '13:00 – 17:00',
    desc: 'Tư vấn chuyên sâu và xét nghiệm không cần nhịn ăn'
  },
  {
    id: 'Evening',
    name: 'Ca Tối',
    timeRange: '17:30 – 20:30',
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
  const isReceptionist = useMemo(() => resolveRoleId(storedUser) === ROLES.RECEPTIONIST, [storedUser]);
  const preselectedPatientId = searchParams.get('patientId') || initialPatientId || '';
  const preselectedPkgId = searchParams.get('packageId') || searchParams.get('id') || '';
  const preselectedName = searchParams.get('packageName') || '';
  const hasPreselectedFromUrl = Boolean(preselectedPkgId || preselectedName);
  const needsCatalogRedirect = !isReceptionist && !hasPreselectedFromUrl && initialPackageIds.length === 0;

  useEffect(() => {
    if (needsCatalogRedirect) {
      navigate('/services', { replace: true });
    }
  }, [needsCatalogRedirect, navigate]);

  const packageMatchesSelection = (pkg, selectedId, selectedName) => {
    const id = String(selectedId || '').trim().toLowerCase();
    const name = String(selectedName || '').trim().toLowerCase();
    const fields = [pkg.packageId, pkg.packageCode, pkg.sourceId, pkg.id]
      .filter(Boolean)
      .map((value) => String(value).trim().toLowerCase());
    if (id && fields.includes(id)) return true;
    return Boolean(name && String(pkg.packageName || '').trim().toLowerCase() === name);
  };

  const [packages, setPackages] = useState(() => {
    if (propPackages && propPackages.length > 0) return propPackages;
    return [];
  });
  const [packagesLoading, setPackagesLoading] = useState(false);
  const [packageSearch, setPackageSearch] = useState('');
  const [packageCategoryFilter, setPackageCategoryFilter] = useState('ALL');
  const [showPackagePicker, setShowPackagePicker] = useState(() => isReceptionist);

  const [selectedPackageId, setSelectedPackageId] = useState(() => {
    if (preselectedPkgId) return preselectedPkgId;
    if (initialPackageIds.length > 0) return initialPackageIds[0];
    return '';
  });

  const [patientInfo, setPatientInfo] = useState(() => (
    isReceptionist
      ? { name: '', phone: '', identityCard: '', patientId: preselectedPatientId, insuranceNumber: '' }
      : {
          name: storedUser?.fullName || '',
          phone: storedUser?.phone || storedUser?.phoneNumber || '',
          identityCard: storedUser?.identityCard || storedUser?.identityNumber || storedUser?.idCard || '',
          patientId: storedUser?.patientId || storedUser?.id || initialPatientId || '',
          insuranceNumber: storedUser?.healthInsuranceNumber || ''
        }
  ));
  const [patientOptions, setPatientOptions] = useState([]);
  const [patientSearch, setPatientSearch] = useState('');
  const [patientsLoading, setPatientsLoading] = useState(false);

  const [date, setDate] = useState(() => toDateKey(new Date()));
  const [calendarCursor, setCalendarCursor] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });

  const [selectedShiftId, setSelectedShiftId] = useState(() => {
    const h = new Date().getHours();
    if (h >= 17) return 'Evening';
    if (h >= 11) return 'Afternoon';
    return 'Morning';
  });
  const [selectedDoctorId, setSelectedDoctorId] = useState('');
  const [availableShifts, setAvailableShifts] = useState([]);
  const [loadingShifts, setLoadingShifts] = useState(false);

  const [allSlots, setAllSlots] = useState([]);
  const [slotTime, setSlotTime] = useState('07:00');
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [notes, setNotes] = useState('');
  const [patientProfile, setPatientProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    if (isReceptionist) {
      setPatientsLoading(true);
      const loadForReceptionist = async () => {
        try {
          const res = await searchPatients({ page: 1, pageSize: 100 });
          const list = Array.isArray(res?.items) ? res.items : (Array.isArray(res?.Items) ? res.Items : []);
          if (!isMounted) return;
          setPatientOptions(list);

          if (preselectedPatientId) {
            const needle = preselectedPatientId.trim().toLowerCase();
            let matched = list.find((p) =>
              String(p.id || '').toLowerCase() === needle ||
              String(p.patientCode || '').toLowerCase() === needle
            );
            if (!matched) {
              try {
                matched = await getPatientById(preselectedPatientId);
                if (matched && isMounted) {
                  setPatientOptions((prev) => [matched, ...prev.filter((x) => x.id !== matched.id)]);
                }
              } catch {
              }
            }
            if (matched && isMounted) {
              setPatientProfile(matched);
              setPatientInfo({
                name: matched.fullName || '',
                phone: matched.phoneNumber || matched.phone || '',
                identityCard: matched.identityNumber || matched.identityCardNumber || '',
                patientId: matched.id || matched.patientCode || '',
                insuranceNumber: matched.healthInsuranceNumber || ''
              });
            }
          }
        } catch {
          if (isMounted) setPatientOptions([]);
        } finally {
          if (isMounted) {
            setPatientsLoading(false);
            setProfileLoading(false);
          }
        }
      };
      void loadForReceptionist();
      return () => { isMounted = false; };
    }

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
      })
      .finally(() => {
        if (isMounted) setProfileLoading(false);
      });

    return () => { isMounted = false; };
  }, [isReceptionist, preselectedPatientId]);

  const filteredPatientOptions = useMemo(() => {
    const kw = patientSearch.trim().toLowerCase();
    if (!kw) return patientOptions;
    return patientOptions.filter((p) =>
      String(p.fullName || '').toLowerCase().includes(kw) ||
      String(p.patientCode || '').toLowerCase().includes(kw) ||
      String(p.id || '').toLowerCase().includes(kw) ||
      String(p.phoneNumber || p.phone || '').toLowerCase().includes(kw) ||
      String(p.identityNumber || p.identityCardNumber || '').toLowerCase().includes(kw)
    );
  }, [patientOptions, patientSearch]);

  const handleSelectPatient = (selectedId) => {
    const matched = patientOptions.find((p) => (p.id || p.patientCode) === selectedId);
    if (!matched) {
      setPatientProfile(null);
      setPatientInfo({ name: '', phone: '', identityCard: '', patientId: '', insuranceNumber: '' });
      return;
    }
    setPatientProfile(matched);
    setPatientInfo({
      name: matched.fullName || '',
      phone: matched.phoneNumber || matched.phone || '',
      identityCard: matched.identityNumber || matched.identityCardNumber || '',
      patientId: matched.id || matched.patientCode || '',
      insuranceNumber: matched.healthInsuranceNumber || ''
    });
  };

  const [validationError, setValidationError] = useState('');

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

  const isProfileComplete = useMemo(() => {
    if (isReceptionist) {
      return Boolean(patientInfo.patientId && patientInfo.name.trim());
    }
    const name = patientProfile?.fullName || patientInfo.name || storedUser?.fullName || '';
    const phone = patientProfile?.phoneNumber || patientInfo.phone || storedUser?.phone || '';
    return Boolean(name.trim() && phone.trim());
  }, [isReceptionist, patientProfile, patientInfo, storedUser]);

  const { book, loading, error, result, reset } = useBookAppointment();

  useEffect(() => {
    let isMounted = true;
    setPackagesLoading(true);

    const normalizeCatalogList = (catalogRes) => {
      const raw = catalogRes?.packages || catalogRes?.services || [];
      return Array.isArray(raw) ? raw : [];
    };

    const normalizeServicePackagesList = (spRes) => {
      const data = spRes?.data;
      if (Array.isArray(data)) return data;
      if (Array.isArray(data?.items)) return data.items;
      if (Array.isArray(data?.data)) return data.data;
      return [];
    };

    const mapFromCatalog = (pkgs) =>
      pkgs.map((p, idx) => {
        const code = String(p.packageCode || p.code || '').trim().toUpperCase();
        const sourceId = p.id || p.packageId || '';
        return {
          packageId: code || sourceId || `PKG-${idx}`,
          packageCode: code || sourceId || '',
          sourceId,
          packageName: p.packageName || p.name || 'Gói xét nghiệm lâm sàng',
          category: p.category || '',
          price: Number(p.price ?? 0),
          originalPrice: null,
          description: p.description || '',
          fastingRule: p.fastingRule || '',
          sampleTube: p.sampleTube || '',
          sampleVolumeMl: p.sampleVolumeMl || '',
          tat: p.tat || p.turnaroundTime || '',
          targetAudience: p.targetAudience || '',
          criteria: Array.isArray(p.criteria) ? p.criteria : []
        };
      });

    const mapFromAdminServicePackages = (spList, catalogList) => {
      const catalogByKey = new Map();
      catalogList.forEach((c) => {
        const keys = [c.packageCode, c.code, c.id, c.packageId]
          .filter(Boolean)
          .map((k) => String(k).trim().toUpperCase());
        keys.forEach((k) => {
          if (!catalogByKey.has(k)) catalogByKey.set(k, c);
        });
      });

      return spList
        .filter((sp) => (sp.isActive ?? sp.IsActive) !== false && !(sp.isDeleted ?? sp.IsDeleted))
        .map((sp, idx) => {
          const sourceId = String(sp.id || sp._id || '').trim();
          const code = String(sp.code || sp.Code || '').trim().toUpperCase();
          const catalogMatch =
            (code && catalogByKey.get(code)) ||
            (sourceId && catalogByKey.get(sourceId.toUpperCase())) ||
            null;

          const rawTests = Array.isArray(sp.tests ?? sp.Tests) ? (sp.tests ?? sp.Tests) : [];
          const catalogCriteria = Array.isArray(catalogMatch?.criteria) ? catalogMatch.criteria : [];
          const catalogCritByCode = new Map(
            catalogCriteria
              .filter((c) => c?.code)
              .map((c) => [String(c.code).trim().toUpperCase(), c])
          );

          const criteria =
            rawTests.length > 0
              ? rawTests
                  .map((t) => {
                    const tCode = String(typeof t === 'string' ? t : (t.code || t.Code || '')).trim().toUpperCase();
                    if (!tCode) return null;
                    const tName = typeof t === 'string' ? tCode : (t.name || t.Name || tCode);
                    const metaCrit = catalogCritByCode.get(tCode);
                    return {
                      criterionId: metaCrit?.criterionId || tCode,
                      code: tCode,
                      name: tName,
                      unit: metaCrit?.unit || '',
                      referenceRange: metaCrit?.referenceRange || null,
                      sampleType: typeof t === 'object' ? (t.sampleType || t.SampleType || '') : ''
                    };
                  })
                  .filter(Boolean)
              : catalogCriteria;

          const basePrice = Number(sp.price ?? sp.Price ?? 0);
          const discountRaw = sp.discountPrice ?? sp.DiscountPrice;
          const hasDiscount =
            discountRaw !== null &&
            discountRaw !== undefined &&
            Number(discountRaw) >= 0 &&
            Number(discountRaw) < basePrice;
          const effectivePrice = hasDiscount ? Number(discountRaw) : basePrice;

          return {
            packageId: code || sourceId || `PKG-${idx}`,
            packageCode: code || sourceId || '',
            sourceId,
            packageName: sp.name || sp.Name || catalogMatch?.packageName || 'Gói xét nghiệm lâm sàng',
            category: sp.category || sp.Category || catalogMatch?.category || 'Tổng quát',
            price: effectivePrice,
            originalPrice: hasDiscount ? basePrice : null,
            description: sp.description || sp.Description || catalogMatch?.description || '',
            fastingRule: sp.preparationNotes || sp.PreparationNotes || catalogMatch?.fastingRule || '',
            sampleTube: sp.sampleTube || sp.SampleTube || catalogMatch?.sampleTube || '',
            sampleVolumeMl: sp.sampleVolumeMl || sp.SampleVolumeMl || catalogMatch?.sampleVolumeMl || '',
            tat: sp.tat || sp.Tat || sp.turnaroundTime || catalogMatch?.tat || '',
            targetAudience: sp.targetAudience || sp.TargetAudience || catalogMatch?.targetAudience || '',
            criteria
          };
        });
    };

    const loadPackages = async () => {
      try {
        let mapped = [];
        if (isReceptionist) {
          const [spSettled, catSettled] = await Promise.allSettled([
            api.get('/service-packages', { params: { pageSize: 100 } }),
            fetchServiceCatalog()
          ]);
          const catalogList = catSettled.status === 'fulfilled' ? normalizeCatalogList(catSettled.value) : [];
          const spList = spSettled.status === 'fulfilled' ? normalizeServicePackagesList(spSettled.value) : [];
          mapped = spList.length > 0 ? mapFromAdminServicePackages(spList, catalogList) : mapFromCatalog(catalogList);
        } else {
          const res = await fetchServiceCatalog();
          mapped = mapFromCatalog(normalizeCatalogList(res));
        }

        if (!isMounted) return;
        if (mapped.length > 0) {
          setPackages(mapped);
          setSelectedPackageId((current) => {
            if (current && mapped.some((p) => packageMatchesSelection(p, current, ''))) {
              const matchedCurrent = mapped.find((p) => packageMatchesSelection(p, current, ''));
              return matchedCurrent ? matchedCurrent.packageId : current;
            }
            if (preselectedPkgId || preselectedName) {
              const found = mapped.find((p) => packageMatchesSelection(p, preselectedPkgId, preselectedName));
              if (found) return found.packageId;
            }
            return mapped[0]?.packageId || '';
          });
        }
      } catch {
      } finally {
        if (isMounted) setPackagesLoading(false);
      }
    };

    void loadPackages();

    return () => {
      isMounted = false;
    };
  }, [isReceptionist, preselectedPkgId, preselectedName]);

  useEffect(() => {
    if (!hasPreselectedFromUrl || isReceptionist) {
      setShowPackagePicker(true);
      return;
    }
    if (packages.length === 0) return;

    const match = packages.find((p) => packageMatchesSelection(p, preselectedPkgId, preselectedName));
    if (match) {
      setSelectedPackageId(match.packageId);
      setShowPackagePicker(false);
    } else if (!packagesLoading) {
      navigate('/services', { replace: true });
    }
  }, [hasPreselectedFromUrl, isReceptionist, preselectedPkgId, preselectedName, packages, packagesLoading, navigate]);

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

  const packageCategories = useMemo(() => {
    const set = new Set();
    packages.forEach((p) => {
      if (p.category && String(p.category).trim()) set.add(String(p.category).trim());
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'vi'));
  }, [packages]);

  const filteredPackages = useMemo(() => {
    const kw = packageSearch.trim().toLowerCase();
    return packages.filter((p) => {
      if (packageCategoryFilter !== 'ALL' && String(p.category || '').trim() !== packageCategoryFilter) {
        return false;
      }
      if (!kw) return true;
      const critMatch = Array.isArray(p.criteria) && p.criteria.some((c) =>
        `${c.code || ''} ${c.name || ''}`.toLowerCase().includes(kw)
      );
      return (
        String(p.packageCode || '').toLowerCase().includes(kw) ||
        String(p.packageName || '').toLowerCase().includes(kw) ||
        String(p.category || '').toLowerCase().includes(kw) ||
        String(p.description || '').toLowerCase().includes(kw) ||
        critMatch
      );
    });
  }, [packages, packageSearch, packageCategoryFilter]);

  const selectedPackage = useMemo(() => {
    return (
      packages.find((p) => p.packageId === selectedPackageId || p.packageCode === selectedPackageId) ||
      packages[0] ||
      null
    );
  }, [packages, selectedPackageId]);

  const shiftDoctors = useMemo(() => {
    if (!availableShifts || availableShifts.length === 0) return [];
    const inShift = availableShifts.filter(
      (s) => (s.shiftType || '').toLowerCase() === selectedShiftId.toLowerCase()
    );
    if (inShift.length === 0) return [];

    const pkgCat = (selectedPackage?.category || '').toLowerCase().trim();
    if (pkgCat) {
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
          ((pkgCat.includes('nội tiết') || pkgCat.includes('tuyến giáp')) && (spec.includes('nội tiết') || spec.includes('sinh hóa'))) ||
          (pkgCat.includes('miễn dịch') && spec.includes('miễn dịch')) ||
          (pkgCat.includes('đông máu') && spec.includes('đông máu'))
        );
      });
      if (exactMatched.length > 0) return exactMatched;

      const generalMatched = inShift.filter((s) => {
        const spec = (s.specialty || '').toLowerCase();
        const dept = (s.department || '').toLowerCase();
        const room = (s.roomName || '').toLowerCase();
        return spec.includes('tổng quát') || dept.includes('tổng quát') || room.includes('tổng quát');
      });
      if (generalMatched.length > 0) return generalMatched;

      const isBroadPackage =
        pkgCat.includes('general') ||
        pkgCat.includes('tổng quát') ||
        pkgCat.includes('chronic') ||
        pkgCat.includes('specialized') ||
        pkgCat.includes('checkup') ||
        pkgCat.includes('biochemistry') ||
        pkgCat.includes('nội tiết') ||
        pkgCat.includes('tuyến giáp') ||
        pkgCat.includes('vi sinh') ||
        pkgCat.includes('ký sinh') ||
        pkgCat.includes('khác');
      if (isBroadPackage) return inShift;

      return [];
    }

    return inShift;
  }, [availableShifts, selectedShiftId, selectedPackage]);

  const activeShiftData = useMemo(() => {
    if (shiftDoctors.length === 0) return null;
    if (selectedDoctorId) {
      const picked = shiftDoctors.find((d) => d.doctorId === selectedDoctorId);
      if (picked) return picked;
    }
    return shiftDoctors[0];
  }, [shiftDoctors, selectedDoctorId]);

  useEffect(() => {
    if (shiftDoctors.length === 0) {
      setSelectedDoctorId('');
      return;
    }
    if (!shiftDoctors.some((d) => d.doctorId === selectedDoctorId)) {
      setSelectedDoctorId(shiftDoctors[0].doctorId || '');
    }
  }, [shiftDoctors, selectedDoctorId]);

  useEffect(() => {
    if (loadingShifts || availableShifts.length === 0) return;
    const hasCurrentShift = availableShifts.some(
      (s) => (s.shiftType || '').toLowerCase() === selectedShiftId.toLowerCase()
    );
    if (!hasCurrentShift) {
      const nowHour = new Date().getHours();
      const isToday = date === toDateKey(new Date());
      const preferredOrder = isToday
        ? (nowHour < 11 ? ['Morning', 'Afternoon', 'Evening'] : nowHour < 17 ? ['Afternoon', 'Evening', 'Morning'] : ['Evening', 'Afternoon', 'Morning'])
        : ['Morning', 'Afternoon', 'Evening'];
      const nextShift = preferredOrder.find((sid) =>
        availableShifts.some((s) => (s.shiftType || '').toLowerCase() === sid.toLowerCase())
      );
      if (nextShift && nextShift !== selectedShiftId) {
        setSelectedShiftId(nextShift);
      }
    }
  }, [availableShifts, loadingShifts, date]);

  const requiresFasting = useMemo(() => {
    const rule = (selectedPackage?.fastingRule || '').toLowerCase();
    const cat = (selectedPackage?.category || '').toLowerCase();
    const name = (selectedPackage?.packageName || '').toLowerCase();
    return rule.includes('nhịn ăn') || cat.includes('sinh hóa') || name.includes('đường huyết') || name.includes('mỡ máu') || name.includes('glucose');
  }, [selectedPackage]);

  const showFastingWarning = requiresFasting && (selectedShiftId === 'Afternoon' || selectedShiftId === 'Evening');

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

  const shiftSlots = useMemo(() => {
    if (!activeShiftData) return [];
    const start = activeShiftData.shiftStart || '07:00';
    const end = activeShiftData.shiftEnd || '11:30';

    const isToday = date === toDateKey(new Date());
    const now = new Date();
    const nowMinutes = now.getHours() * 60 + now.getMinutes();

    const normalized = allSlots
      .map((s) => {
        const slotStr = typeof s === 'string' ? s : s.slotTime;
        let avail = typeof s === 'string'
          ? true
          : (s.isAvailable !== false && (s.remainingCapacity === undefined || s.remainingCapacity > 0));
        if (avail && isToday && slotStr) {
          const [hh, mm] = String(slotStr).split(':').map(Number);
          if (!Number.isNaN(hh) && !Number.isNaN(mm) && (hh * 60 + mm) <= (nowMinutes - 5)) {
            avail = false;
          }
        }
        return { slotTime: slotStr, isAvailable: avail };
      })
      .filter((s) => s.slotTime >= start && s.slotTime < end);

    return normalized;
  }, [allSlots, activeShiftData, date]);

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
      setValidationError(
        isReceptionist
          ? 'MSG-ERR-PROFILE-01: Vui lòng chọn hồ sơ bệnh nhân từ cơ sở dữ liệu trước khi tạo lịch hẹn.'
          : 'MSG-ERR-PROFILE-01: Quý khách vui lòng hoàn thiện Họ tên và Số điện thoại liên hệ để nhân viên y tế xác nhận lịch hẹn.'
      );
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
      packageIds: [selectedPackage?.packageCode || selectedPackage?.packageId || selectedPackageId],
      notes: notes.trim(),
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
          {patientInfo.name && (
            <div>
              <dt>Bệnh nhân</dt>
              <dd>{patientInfo.name} ({patientInfo.patientId})</dd>
            </div>
          )}
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
          <button type="button" onClick={() => navigate('/appointments')}>
            {isReceptionist ? 'Xem sổ lịch hẹn' : 'Xem lịch của tôi'}
          </button>
          <button type="button" onClick={() => (isReceptionist ? reset() : navigate('/services'))}>Đặt lịch khác</button>
        </div>
      </div>
    );
  }

  if (needsCatalogRedirect) {
    return null;
  }

  return (
    <div className="bms-booking-page py-2" style={{ backgroundColor: '#f8fafc', minHeight: '100vh' }}>
      <div className="container" style={{ maxWidth: 1160 }}>

        <div className="bms-page-header-card mb-4">
          <div className="bms-page-header-content">
            <h1 className="bms-page-title">Đặt Lịch Xét Nghiệm</h1>
            <p className="bms-page-subtitle">
              {showPackagePicker
                ? 'Chọn gói dịch vụ, ngày khám và khung giờ lấy mẫu phù hợp'
                : 'Chọn ngày khám và khung giờ lấy mẫu cho gói xét nghiệm bạn đã chọn'}
            </p>
          </div>
        </div>

        <form onSubmit={onSubmit}>
          <div className="row g-4">

            <div className="col-lg-8">
              {error && (
                <div className="alert alert-danger py-3 px-3 rounded-3 border-0 shadow-sm mb-4">
                  <strong>Thông báo:</strong> {error}
                </div>
              )}

              <section className="bms-book-patient">
                <h2>{isReceptionist ? '1. Chọn Bệnh Nhân Tạo Lịch Hẹn (CSDL)' : 'Thông tin bệnh nhân'}</h2>
                {isReceptionist && (
                  <div className="mb-3">
                    <div className="row g-2 mb-2">
                      <div className="col-md-5">
                        <input
                          type="text"
                          className="form-control form-control-sm"
                          placeholder="Tìm theo tên, mã BN, SĐT, CCCD..."
                          value={patientSearch}
                          onChange={(e) => setPatientSearch(e.target.value)}
                        />
                      </div>
                      <div className="col-md-7">
                        <select
                          className="form-select form-select-sm"
                          value={patientInfo.patientId}
                          onChange={(e) => handleSelectPatient(e.target.value)}
                          disabled={patientsLoading}
                        >
                          <option value="">
                            {patientsLoading
                              ? '-- Đang tải danh sách bệnh nhân từ CSDL... --'
                              : '-- Chọn bệnh nhân để đặt lịch hẹn --'}
                          </option>
                          {filteredPatientOptions.map((p) => {
                            const key = p.id || p.patientCode;
                            return (
                              <option key={key} value={key}>
                                [{p.patientCode || p.id}] {p.fullName} — SĐT: {p.phoneNumber || p.phone || '—'}
                              </option>
                            );
                          })}
                        </select>
                      </div>
                    </div>
                  </div>
                )}
                <dl>
                  <div><dt>Họ tên</dt><dd>{patientInfo.name || '—'}</dd></div>
                  <div><dt>Điện thoại</dt><dd>{patientInfo.phone || '—'}</dd></div>
                  <div><dt>CCCD</dt><dd>{patientInfo.identityCard || '—'}</dd></div>
                </dl>
              </section>

              {showPackagePicker && (
                <div className="card border-0 shadow-sm rounded-3 mb-4">
                  <div className="card-header bg-white border-bottom py-3 px-3">
                    <div className="d-flex align-items-center justify-content-between flex-wrap gap-2">
                      <h5 className="mb-0 fw-bold text-dark d-flex align-items-center gap-2">
                        <TestTube2 className="text-primary" size="1em" /> 2. Chọn Gói Xét Nghiệm Khám Bệnh
                      </h5>
                      {isReceptionist ? (
                        <span className="badge bg-primary-subtle text-primary border border-primary-subtle rounded-pill px-2.5 py-1" style={{ fontSize: '11px' }}>
                          Danh mục gói dịch vụ &amp; bảng giá ({packages.length} gói)
                        </span>
                      ) : hasPreselectedFromUrl && selectedPackage ? (
                        <button
                          type="button"
                          className="btn btn-link btn-sm p-0 text-decoration-none fw-semibold"
                          style={{ color: 'var(--primary)', fontSize: 'var(--fs-xs)' }}
                          onClick={() => setShowPackagePicker(false)}
                        >
                          Thu gọn
                        </button>
                      ) : null}
                    </div>
                  </div>
                  <div className="card-body p-2">
                  {isReceptionist && (
                    <div className="row g-2 px-1 pt-1 pb-2 mb-2 border-bottom">
                      <div className="col-md-7">
                        <div className="input-group input-group-sm">
                          <span className="input-group-text bg-white text-muted border-end-0">
                            <Search size={12} />
                          </span>
                          <input
                            type="text"
                            className="form-control form-control-sm border-start-0"
                            placeholder="Tìm theo mã gói, tên gói hoặc mã chỉ số (WBC, GLU, HBA1C...)"
                            value={packageSearch}
                            onChange={(e) => setPackageSearch(e.target.value)}
                          />
                        </div>
                      </div>
                      <div className="col-md-5">
                        <select
                          className="form-select form-select-sm"
                          value={packageCategoryFilter}
                          onChange={(e) => setPackageCategoryFilter(e.target.value)}
                        >
                          <option value="ALL">Tất cả chuyên khoa ({packages.length})</option>
                          {packageCategories.map((cat) => (
                            <option key={cat} value={cat}>{cat}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}

                  {packagesLoading ? (
                    <div className="text-center text-muted small py-4">
                      <span className="spinner-border spinner-border-sm text-primary me-2" role="status" />
                      Đang tải danh mục gói xét nghiệm &amp; bảng giá...
                    </div>
                  ) : filteredPackages.length === 0 ? (
                    <div className="text-center text-muted small py-4">
                      Không tìm thấy gói xét nghiệm nào phù hợp với bộ lọc.
                    </div>
                  ) : (
                    <div className="bms-pkg-list" role="listbox" aria-label="Chọn gói xét nghiệm">
                      {filteredPackages.map((pkg) => {
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
                              <span className="bms-pkg-name d-flex align-items-center flex-wrap gap-1">
                                {pkg.packageCode && (
                                  <span
                                    className="badge bg-light text-primary border font-monospace"
                                    style={{ fontSize: '10.5px', fontWeight: 700 }}
                                  >
                                    {pkg.packageCode}
                                  </span>
                                )}
                                <span>{pkg.packageName}</span>
                              </span>
                              {Array.isArray(pkg.criteria) && pkg.criteria.length > 0 ? (
                                <span className="bms-pkg-note">
                                  {pkg.criteria.length} chỉ số: {pkg.criteria.map((c) => c.code || c.name).filter(Boolean).join(', ')}
                                </span>
                              ) : pkg.fastingRule ? (
                                <span className="bms-pkg-note">{pkg.fastingRule}</span>
                              ) : pkg.description ? (
                                <span className="bms-pkg-note">{pkg.description}</span>
                              ) : null}
                            </span>
                            <span className="bms-pkg-price text-end">
                              <span className="d-block">
                                {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(pkg.price || 0)}
                              </span>
                              {pkg.originalPrice && (
                                <small className="d-block text-muted text-decoration-line-through fw-normal" style={{ fontSize: '11px' }}>
                                  {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(pkg.originalPrice)}
                                </small>
                              )}
                              {isSelected && (
                                <span className="bms-pkg-selected-tag">
                                  <CheckCircle2 size={12} />
                                  Đã chọn
                                </span>
                              )}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                  </div>
                </div>
              )}

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
                    {SHIFT_DEFINITIONS.map((shift) => {
                      const shiftCount = availableShifts.filter(
                        (s) => (s.shiftType || '').toLowerCase() === shift.id.toLowerCase()
                      ).length;
                      return (
                        <button
                          key={shift.id}
                          type="button"
                          className={`is-${shift.id.toLowerCase()}${selectedShiftId === shift.id ? ' is-selected' : ''}`}
                          onClick={() => setSelectedShiftId(shift.id)}
                        >
                          <strong>{shift.name}</strong>
                          <span>{shift.timeRange}</span>
                          <span style={{ fontSize: '11px', marginTop: '2px', color: selectedShiftId === shift.id ? 'rgba(255,255,255,0.92)' : (shiftCount > 0 ? '#047857' : '#94a3b8') }}>
                            {loadingShifts ? '...' : shiftCount > 0 ? `${shiftCount} BS trực` : 'Chưa có ca trực'}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  </div>

                  {showFastingWarning && (
                    <div className="alert alert-warning border-0 rounded-3 p-2.5 my-3 d-flex align-items-start gap-2 text-dark" style={{ backgroundColor: '#fef3c7', fontSize: '12.5px' }}>
                      <Info className="text-warning mt-0.5 flex-shrink-0"  size="1em"/>
                      <div>
                        <strong>Dặn dò lâm sàng:</strong> Gói xét nghiệm này có chỉ định nhịn ăn 8 – 12 giờ. Nếu chọn ca Chiều hoặc Tối, quý khách vui lòng đảm bảo đã nhịn ăn đủ thời gian, hoặc khuyến nghị chuyển sang <strong>Ca Sáng</strong> để kết quả đạt độ chính xác tối đa.
                      </div>
                    </div>
                  )}

                  {(!activeShiftData || shiftSlots.length === 0) && (
                    <div className="alert alert-warning border rounded-3 p-3 my-3" style={{ backgroundColor: '#fffbeb', borderColor: '#fde68a' }}>
                      <div className="d-flex align-items-center gap-2 fw-bold text-dark small mb-1">
                        <AlertTriangle className="text-warning flex-shrink-0"  size="1em"/>
                        <span>
                          {!activeShiftData
                            ? `Ca ${selectedShiftId === 'Morning' ? 'Sáng' : selectedShiftId === 'Afternoon' ? 'Chiều' : 'Tối'} ngày ${date} hiện chưa có Bác sĩ chuyên khoa ${selectedPackage?.category || ''} trực tiếp nhận.`
                            : `Ca ${selectedShiftId === 'Morning' ? 'Sáng' : selectedShiftId === 'Afternoon' ? 'Chiều' : 'Tối'} ngày ${date} của ${activeShiftData.doctorName} đã kín lịch hẹn.`}
                        </span>
                      </div>
                      <div className="small text-muted mb-2">
                        Vui lòng chọn ca khác hoặc chuyển sang các ngày kế tiếp:
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

                  {shiftDoctors.length > 1 && (
                    <div className="mb-2 d-flex align-items-center gap-2 flex-wrap">
                      <span className="small text-muted fw-semibold">Chọn bác sĩ đang trực ({shiftDoctors.length}):</span>
                      {shiftDoctors.map((doc) => {
                        const isPicked = doc.doctorId === activeShiftData?.doctorId;
                        return (
                          <button
                            key={doc.doctorId}
                            type="button"
                            className={`btn btn-sm rounded-pill px-3 ${isPicked ? 'btn-primary' : 'btn-outline-secondary'}`}
                            style={{ fontSize: '12px' }}
                            onClick={() => setSelectedDoctorId(doc.doctorId)}
                          >
                            {doc.doctorName}
                          </button>
                        );
                      })}
                    </div>
                  )}
                  <div className={`bms-book-doctor is-${selectedShiftId.toLowerCase()}${activeShiftData ? '' : ' is-empty'}`}>
                    {loadingShifts ? (
                      <span className="text-muted small py-2 d-flex align-items-center gap-2">
                        <span className="spinner-border spinner-border-sm text-primary" role="status" />
                        Đang đối soát lịch trực Bác sĩ chuyên khoa...
                      </span>
                    ) : !activeShiftData ? (
                      <div className="py-2 text-muted small d-flex align-items-center gap-2">
                        <AlertTriangle className="text-warning flex-shrink-0"  size="1em"/>
                        <span>Ca này hiện chưa có Bác sĩ chuyên khoa {selectedPackage?.category || ''} trực tiếp nhận. Quý khách vui lòng chọn ca khác hoặc ngày khác.</span>
                      </div>
                    ) : (
                      <>
                        <img src="/assets/bms/svg/icons/lab/doctor-review.svg" alt="Doctor Review" />
                        <div>
                          <div className="d-flex align-items-center gap-2 mb-1 flex-wrap">
                            <strong className="text-dark mb-0">{activeShiftData.doctorName || 'Bác sĩ Phụ trách'}</strong>
                            <span className="badge bg-success-subtle text-success border border-success-subtle px-2 py-0.5" style={{ fontSize: '11px', borderRadius: '999px' }}>
                              <CheckCircle2 className="me-1"  size="1em"/> Lịch trực thực tế
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
                <div className="alert alert-danger border rounded-3 p-3 mb-3 d-flex align-items-center gap-2 text-dark small" style={{ backgroundColor: '#fef2f2', borderColor: '#fecaca' }}>
                  <AlertTriangle className="text-danger flex-shrink-0"  size="1em"/>
                  <span>{validationError || error}</span>
                </div>
              )}

              <div className="bms-book-actions">
                <button type="button" onClick={() => navigate(isReceptionist ? '/appointments' : '/services')}>Quay lại</button>
                <button type="submit" disabled={loading || !slotTime || !selectedPackageId || (isReceptionist && !patientInfo.patientId)}>
                  {loading ? 'Đang xử lý...' : 'Xác nhận đặt lịch'}
                </button>
              </div>
            </div>

            <div className="col-lg-4">
              <div className="card border-0 shadow-sm rounded-3 mb-4 sticky-top" style={{ top: '90px' }}>
                <div className="card-header bg-white border-bottom py-3 px-3">
                  <div className="d-flex align-items-center justify-content-between gap-2">
                    <h6 className="mb-0 fw-bold text-dark d-flex align-items-center gap-2">
                      <FileHeart className="text-primary" size="1em" /> Tóm Tắt Phiếu Hẹn
                    </h6>
                    {!showPackagePicker && !isReceptionist && (
                      <button
                        type="button"
                        className="btn btn-link btn-sm p-0 text-decoration-none fw-semibold"
                        style={{ color: 'var(--primary)', fontSize: 'var(--fs-xs)' }}
                        onClick={() => navigate('/services')}
                      >
                        Đổi gói
                      </button>
                    )}
                  </div>
                </div>
                <div className="card-body">
                  <div style={{ padding: '6px 8px' }}>
                  {packagesLoading && !selectedPackage ? (
                    <div className="small text-muted py-3 d-flex align-items-center gap-2">
                      <span className="spinner-border spinner-border-sm text-primary" role="status" />
                      <span>Đang tải thông tin gói xét nghiệm...</span>
                    </div>
                  ) : selectedPackage ? (
                    <div style={{ paddingBottom: '20px', marginBottom: '20px', borderBottom: '1px solid #E2E8F0' }}>

                      <div className="d-flex align-items-start gap-3">
                        <span className="bms-pkg-icon flex-shrink-0" style={{ width: '42px', height: '42px' }}>
                          <BmsPackageIcon name={packageIconKey(selectedPackage)} size={42} />
                        </span>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div className="d-flex align-items-center flex-wrap gap-2 mb-1">
                            {selectedPackage.packageCode && (
                              <span className="badge bg-primary-subtle text-primary font-monospace" style={{ fontSize: '11.5px', fontWeight: 700 }}>
                                {selectedPackage.packageCode}
                              </span>
                            )}
                            {selectedPackage.category && (
                              <span style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--ink-secondary)' }}>
                                {selectedPackage.category}
                              </span>
                            )}
                          </div>
                          <div style={{ color: 'var(--ink)', fontSize: '16.5px', fontWeight: 750, lineHeight: 1.38, letterSpacing: '-0.015em', marginTop: '4px' }}>
                            {selectedPackage.packageName}
                          </div>
                        </div>
                      </div>

                      {selectedPackage.description && (
                        <p className="mb-0" style={{ marginTop: '14px', color: 'var(--ink-secondary)', fontSize: '13px', lineHeight: 1.65 }}>
                          {selectedPackage.description}
                        </p>
                      )}

                      {selectedPackage.targetAudience && (
                        <div style={{ marginTop: '10px', fontSize: '12.5px', color: 'var(--ink-secondary)', lineHeight: 1.6 }}>
                          <span style={{ fontWeight: 650, color: 'var(--ink)' }}>Đối tượng:</span> {selectedPackage.targetAudience}
                        </div>
                      )}

                      {(selectedPackage.sampleTube || selectedPackage.tat || selectedPackage.fastingRule) && (
                        <div
                          style={{
                            marginTop: '16px',
                            padding: '14px 16px',
                            backgroundColor: 'var(--bg-page)',
                            borderRadius: 'var(--r-md)'
                          }}
                        >
                          {(selectedPackage.sampleTube || selectedPackage.tat) && (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '12px 16px' }}>
                              {selectedPackage.sampleTube && (
                                <div className="bms-field" style={{ gap: '3px' }}>
                                  <span className="bms-field-label" style={{ fontSize: '11.5px' }}>Ống lấy mẫu</span>
                                  <span className="bms-field-value" style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--ink)' }}>
                                    {selectedPackage.sampleTube}
                                    {selectedPackage.sampleVolumeMl ? ` (${selectedPackage.sampleVolumeMl} ml)` : ''}
                                  </span>
                                </div>
                              )}
                              {selectedPackage.tat && (
                                <div className="bms-field" style={{ gap: '3px' }}>
                                  <span className="bms-field-label" style={{ fontSize: '11.5px' }}>Trả kết quả</span>
                                  <span className="bms-field-value" style={{ fontSize: '13.5px', fontWeight: 700, color: '#047857' }}>
                                    {selectedPackage.tat}
                                  </span>
                                </div>
                              )}
                            </div>
                          )}
                          {selectedPackage.fastingRule && (
                            <div
                              className="bms-field"
                              style={{
                                gap: '3px',
                                marginTop: (selectedPackage.sampleTube || selectedPackage.tat) ? '12px' : 0,
                                paddingTop: (selectedPackage.sampleTube || selectedPackage.tat) ? '12px' : 0,
                                borderTop: (selectedPackage.sampleTube || selectedPackage.tat) ? '1px solid #E2E8F0' : 'none'
                              }}
                            >
                              <span className="bms-field-label" style={{ fontSize: '11.5px' }}>Lưu ý chuẩn bị</span>
                              <span className="bms-field-value" style={{ fontSize: '13px', fontWeight: 550, color: 'var(--ink)', lineHeight: 1.5 }}>
                                {selectedPackage.fastingRule}
                              </span>
                            </div>
                          )}
                        </div>
                      )}

                      {Array.isArray(selectedPackage.criteria) && selectedPackage.criteria.length > 0 && (
                        <div style={{ marginTop: '16px' }}>
                          <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--ink-secondary)', marginBottom: '8px' }}>
                            Chỉ số xét nghiệm ({selectedPackage.criteria.length})
                          </div>
                          <div className="d-flex flex-wrap" style={{ gap: '6px' }}>
                            {selectedPackage.criteria.map((c, idx) => (
                              <span
                                key={`${c.code || c.name}-${idx}`}
                                style={{
                                  display: 'inline-block',
                                  padding: '4px 10px',
                                  fontSize: '12px',
                                  fontWeight: 600,
                                  color: 'var(--ink)',
                                  backgroundColor: 'var(--bg-muted)',
                                  borderRadius: '6px'
                                }}
                                title={c.name || c.code}
                              >
                                {c.code || c.name}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      <div
                        className="d-flex align-items-baseline justify-content-between gap-2 flex-wrap"
                        style={{ marginTop: '24px', paddingTop: '20px', borderTop: '1px solid #E2E8F0' }}
                      >
                        <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--ink-secondary)' }}>Đơn giá niêm yết</span>
                        <div
                          className="fw-bold tabular-nums"
                          style={{ color: 'var(--primary)', fontSize: '26px', fontWeight: 800, letterSpacing: '-0.025em', lineHeight: 1.15 }}
                        >
                          {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(selectedPackage.price)}
                          {selectedPackage.originalPrice && (
                            <span className="ms-2 text-muted text-decoration-line-through fw-normal" style={{ fontSize: '13px' }}>
                              {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(selectedPackage.originalPrice)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : null}

                  <div style={{ paddingBottom: '14px', marginBottom: '14px', borderBottom: '1px solid #F1F5F9' }}>
                    <div className="small text-muted mb-1">Thời gian &amp; Ca khám</div>
                    <div className="fw-bold" style={{ color: 'var(--ink)', fontSize: '14.5px' }}>
                      {selectedShiftId === 'Morning' ? 'Ca Sáng' : selectedShiftId === 'Afternoon' ? 'Ca Chiều' : 'Ca Tối'} · {slotTime || '--:--'}
                    </div>
                    <div className="small text-muted mt-1">{date}</div>
                  </div>

                  <div style={{ paddingBottom: '14px', marginBottom: '14px', borderBottom: '1px solid #F1F5F9' }}>
                    <div className="small text-muted mb-1">Bác sĩ tiếp nhận</div>
                    <div className="fw-bold" style={{ color: 'var(--ink)', fontSize: '14px' }}>{activeShiftData?.doctorName || 'Chưa có bác sĩ trực'}</div>
                    {activeShiftData?.specialty && (
                      <div className="small text-muted mt-1">{activeShiftData.specialty}</div>
                    )}
                  </div>

                  <div style={{ marginBottom: '18px' }}>
                    <div className="small text-muted mb-1">Phòng khám &amp; Lấy mẫu</div>
                    <div className="fw-bold" style={{ color: 'var(--ink)', fontSize: '14px' }}>{activeShiftData?.roomName || 'Chưa gán phòng'}</div>
                    <div className="small text-muted mt-1">
                      {[
                        activeShiftData?.roomNumber ? `Phòng ${activeShiftData.roomNumber}` : '',
                        activeShiftData?.floor || ''
                      ].filter(Boolean).join(' · ')}
                    </div>
                  </div>

                  <div className="p-3" style={{ backgroundColor: 'var(--bg-page)', borderRadius: 'var(--r-md)' }}>
                    <div className="small fw-bold text-dark mb-1">Quy định tiếp nhận</div>
                    <div className="small text-muted" style={{ lineHeight: 1.6 }}>
                      Quý khách vui lòng có mặt trước 10 phút. Xuất trình tin nhắn SMS hoặc mã cuộc hẹn tại quầy Lễ tân BMS để được phát số tự động vào phòng Lab.
                    </div>
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
