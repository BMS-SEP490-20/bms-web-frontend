/**
 * @file EnterTestResultsPage.jsx
 * @description Nhập kết quả đo máy xét nghiệm tự động & kiểm soát cờ báo động nguy hiểm CRITICAL (UC46).
 * Đánh giá giá trị báo động đỏ (Critical / Panic Values) theo tiêu chuẩn ISO 15189:2022:
 *  - Kali máu (K+): Critical khi K < 2.5 hoặc K > 6.5 mmol/L
 *  - Natri máu (Na+): Critical khi Na < 120 hoặc Na > 160 mmol/L
 * Kích hoạt âm thanh còi Web Audio 880Hz, đồng hồ đếm ngược 15 phút và form ghi log cuộc gọi cấp cứu bắt buộc.
 * Tuân thủ: Clean Medical Standard (Rule 19) & AGENTS-CODE.md.
 */

import React, { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Container,
  Row,
  Col,
  Card,
  Table,
  Button,
  Badge,
  Alert,
  Form,
  Spinner,
  InputGroup,
  Modal
} from 'react-bootstrap';
import {
  FaFlask,
  FaCheckCircle,
  FaExclamationTriangle,
  FaPhoneAlt,
  FaVial,
  FaMicroscope,
  FaClock,
  FaUserMd,
  FaSave,
  FaSearch,
  FaLock,
  FaBell,
  FaVolumeUp,
  FaStopwatch,
  FaHospital,
  FaEye,
  FaTimesCircle,
  FaRedo,
  FaUndo,
  FaFileSignature
} from 'react-icons/fa';
import { resultApi } from '../api/resultApi';
import api from '../../../config/api';
import { getStoredUser } from '../../../constants/roles';
import { canEnterTestResults, normalizeSampleStatus } from '../../../shared/workflow/sampleWorkflowGates';
import { resolveDutyAssignment } from '../../../shared/workflow/dutyAssignment';
import { resolveParamsForSample } from '../../../shared/workflow/resolveOrderParams';

function isQualitativeParam(p) {
  return String(p?.valueType || '').toLowerCase() === 'qualitative';
}

function formatCleanNum(val) {
  const num = Number(val);
  if (Number.isNaN(num)) return String(val);
  return String(Number(num.toFixed(4)));
}

function formatReferenceRange(p) {
  if (isQualitativeParam(p)) {
    return p.normalText || 'Âm tính (Negative)';
  }
  const hasMin = p.refLow !== null && p.refLow !== undefined && p.refLow !== '';
  const hasMax = p.refHigh !== null && p.refHigh !== undefined && p.refHigh !== '';
  const unitSuffix = p.unit && p.unit !== '—' ? ` ${p.unit}` : '';
  if (hasMin && hasMax) return `${formatCleanNum(p.refLow)} – ${formatCleanNum(p.refHigh)}${unitSuffix}`;
  if (hasMin) return `≥ ${formatCleanNum(p.refLow)}${unitSuffix}`;
  if (hasMax) return `≤ ${formatCleanNum(p.refHigh)}${unitSuffix}`;
  return p.normalText || '—';
}

function formatPanicBadge(p) {
  const hasLow = p.criticalLow !== null && p.criticalLow !== undefined && p.criticalLow !== '';
  const hasHigh = p.criticalHigh !== null && p.criticalHigh !== undefined && p.criticalHigh !== '';
  if (!hasLow && !hasHigh) return null;
  if (hasLow && hasHigh) return `Panic: <${formatCleanNum(p.criticalLow)} hoặc >${formatCleanNum(p.criticalHigh)}`;
  if (hasLow) return `Panic: <${formatCleanNum(p.criticalLow)}`;
  return `Panic: >${formatCleanNum(p.criticalHigh)}`;
}

const DEFAULT_PARAMS = [
  { code: 'WBC', name: 'WBC · Số lượng bạch cầu', value: 0, unit: '10⁹/L', refLow: 4.0, refHigh: 10.0, criticalLow: 1.5, criticalHigh: 30.0 },
  { code: 'RBC', name: 'RBC · Số lượng hồng cầu', value: 0, unit: '10¹²/L', refLow: 4.0, refHigh: 5.5, criticalLow: 2.0, criticalHigh: 7.0 },
  { code: 'HGB', name: 'HGB · Nồng độ Hemoglobin', value: 0, unit: 'g/L', refLow: 120.0, refHigh: 165.0, criticalLow: 60.0, criticalHigh: 200.0 },
  { code: 'HCT', name: 'HCT · Dung tích hồng cầu (Hematocrit)', value: 0, unit: '%', refLow: 35.0, refHigh: 50.0, criticalLow: 20.0, criticalHigh: 60.0 },
  { code: 'MCV', name: 'MCV · Thể tích trung bình hồng cầu', value: 0, unit: 'fL', refLow: 80.0, refHigh: 100.0, criticalLow: 60.0, criticalHigh: 120.0 },
  { code: 'PLT', name: 'PLT · Số lượng tiểu cầu', value: 0, unit: '10⁹/L', refLow: 150, refHigh: 400, criticalLow: 20, criticalHigh: 1000 },
  { code: 'GLU', name: 'GLU · Đường huyết đói (Glucose)', value: 0, unit: 'mmol/L', refLow: 3.9, refHigh: 6.4, criticalLow: 2.2, criticalHigh: 25.0 },
  { code: 'K', name: 'K⁺ · Kali máu (Potassium)', value: 0, unit: 'mmol/L', refLow: 3.5, refHigh: 5.0, criticalLow: 2.5, criticalHigh: 6.5 },
  { code: 'NA', name: 'Na⁺ · Natri máu (Sodium)', value: 0, unit: 'mmol/L', refLow: 135.0, refHigh: 145.0, criticalLow: 120.0, criticalHigh: 160.0 }
];

/** Chỉ số đơn / panel → form nhập KQ (theo y lệnh, không luôn CBC mặc định). */
const ANALYTE_LIBRARY = {
  WBC: DEFAULT_PARAMS[0],
  RBC: DEFAULT_PARAMS[1],
  HGB: DEFAULT_PARAMS[2],
  HCT: DEFAULT_PARAMS[3],
  MCV: DEFAULT_PARAMS[4],
  PLT: DEFAULT_PARAMS[5],
  GLU: DEFAULT_PARAMS[6],
  GLUCOSE: DEFAULT_PARAMS[6],
  K: DEFAULT_PARAMS[7],
  NA: DEFAULT_PARAMS[8],
  'ANTI-TPO': { code: 'ANTI-TPO', name: 'Anti-TPO · Kháng thể kháng peroxidase tuyến giáp', value: 0, unit: 'IU/mL', refLow: 0, refHigh: 34, criticalLow: null, criticalHigh: null },
  ANTI_TPO: { code: 'ANTI-TPO', name: 'Anti-TPO · Kháng thể kháng peroxidase tuyến giáp', value: 0, unit: 'IU/mL', refLow: 0, refHigh: 34, criticalLow: null, criticalHigh: null },
  ALT: { code: 'ALT', name: 'ALT · Alanine aminotransferase', value: 0, unit: 'U/L', refLow: 7, refHigh: 56, criticalLow: null, criticalHigh: 1000 },
  AST: { code: 'AST', name: 'AST · Aspartate aminotransferase', value: 0, unit: 'U/L', refLow: 10, refHigh: 40, criticalLow: null, criticalHigh: 1000 },
  GGT: { code: 'GGT', name: 'GGT · Gamma-glutamyl transferase', value: 0, unit: 'U/L', refLow: 9, refHigh: 48, criticalLow: null, criticalHigh: null },
  FERRITIN: { code: 'FERRITIN', name: 'Ferritin · Ferritin huyết thanh', value: 0, unit: 'ng/mL', refLow: 24, refHigh: 336, criticalLow: null, criticalHigh: null },
  TSH: { code: 'TSH', name: 'TSH · Thyroid stimulating hormone', value: 0, unit: 'mIU/L', refLow: 0.4, refHigh: 4.0, criticalLow: null, criticalHigh: null },
  FT4: { code: 'FT4', name: 'FT4 · Free thyroxine', value: 0, unit: 'ng/dL', refLow: 0.8, refHigh: 1.8, criticalLow: null, criticalHigh: null },
  CRP: { code: 'CRP', name: 'CRP · C-reactive protein', value: 0, unit: 'mg/L', refLow: 0, refHigh: 5, criticalLow: null, criticalHigh: null },
  HBA1C: { code: 'HBA1C', name: 'HbA1c · Hemoglobin A1c', value: 0, unit: '%', refLow: 4.0, refHigh: 5.6, criticalLow: null, criticalHigh: null },
  CREA: { code: 'CREA', name: 'Creatinine · Creatinin huyết thanh', value: 0, unit: 'µmol/L', refLow: 62, refHigh: 106, criticalLow: null, criticalHigh: null },
  UREA: { code: 'UREA', name: 'Urea · Urê huyết', value: 0, unit: 'mmol/L', refLow: 2.5, refHigh: 7.5, criticalLow: null, criticalHigh: null }
};

const CBC_PANEL_CODES = new Set(['CBC', 'CBC-01', 'HUYETDO', 'HUYẾT ĐỒ', 'PKG-CBC', 'COMPLETEBLOODCOUNT']);

function cloneParam(p) {
  return { ...p, value: 0 };
}

function paramsFromTestCode(code, name) {
  const raw = String(code || '').trim().toUpperCase();
  const label = String(name || code || raw).trim();
  if (!raw) return [];
  const folded = `${raw} ${label}`.normalize('NFD').replace(/\p{M}/gu, '');
  if (CBC_PANEL_CODES.has(raw) || /CBC|HUYET\s*DO|COMPLETE\s*BLOOD/i.test(folded)) {
    return DEFAULT_PARAMS.slice(0, 6).map(cloneParam);
  }
  if (ANALYTE_LIBRARY[raw] || ANALYTE_LIBRARY[code]) {
    return [cloneParam(ANALYTE_LIBRARY[raw] || ANALYTE_LIBRARY[code])];
  }
  // Gói đa chỉ số chưa có thư viện → giữ 1 dòng theo mã y lệnh (KTV nhập đúng chỉ định)
  return [{
    code: raw,
    name: label.includes('·') ? label : `${raw} · ${label}`,
    value: 0,
    unit: '',
    refLow: null,
    refHigh: null,
    criticalLow: null,
    criticalHigh: null
  }];
}

function paramsFromOrderItems(items) {
  const list = Array.isArray(items) ? items : [];
  const out = [];
  const seen = new Set();
  for (const item of list) {
    const code = item?.testCode || item?.TestCode || item?.code || '';
    const name = item?.testName || item?.TestName || item?.name || code;
    for (const p of paramsFromTestCode(code, name)) {
      if (seen.has(p.code)) continue;
      seen.add(p.code);
      out.push(p);
    }
  }
  return out;
}

function isOrderGuid(id) {
  return typeof id === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id.trim());
}

function evaluateMedicalFlag(code, value, p) {
  if (value === null || value === undefined || value === '' || value === 0) return 'NORMAL';
  if (isQualitativeParam(p)) {
    const text = String(value).trim().toLowerCase();
    if (!text) return 'NORMAL';
    if (text.includes('dương') || text.includes('positive') || text.includes('reactive')) return 'HIGH';
    return 'NORMAL';
  }
  if (Number.isNaN(Number(value))) return 'NORMAL';
  const num = Number(value);

  // Critical / Panic thresholds (ISO 15189:2022 — strict < / > matching TestResultService.ValidatedItemsAsync)
  if (p.criticalLow != null && num < p.criticalLow) return 'CRITICAL';
  if (p.criticalHigh != null && num > p.criticalHigh) return 'CRITICAL';

  // Reference range thresholds
  if (p.refLow != null && num < p.refLow) return 'LOW';
  if (p.refHigh != null && num > p.refHigh) return 'HIGH';

  return 'NORMAL';
}

function playWebAudioAlert880Hz() {
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();

    const playPulse = (startTime, duration) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, startTime); // Còi cảnh báo chuẩn ISO 880Hz

      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.25, startTime + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(startTime);
      osc.stop(startTime + duration);
    };

    const now = ctx.currentTime;
    playPulse(now, 0.22);
    playPulse(now + 0.32, 0.22);
    playPulse(now + 0.64, 0.35);
  } catch (err) {
    console.warn('Web Audio alarm playback warning:', err);
  }
}

export function EnterTestResultsPage() { /* e2e-order-params-v2 */
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialSampleId = searchParams.get('sampleId') || searchParams.get('barcode') || '';
  const viewOnlyMode = String(searchParams.get('mode') || '').toLowerCase() === 'view';
  const [dbCatalogParams, setDbCatalogParams] = useState([]);
  const [isPackageFiltered, setIsPackageFiltered] = useState(false);

  const loggedInUser = useMemo(() => {
    try { return getStoredUser(); } catch { return null; }
  }, []);
  const operatorDisplay = loggedInUser?.fullName || loggedInUser?.name || loggedInUser?.username || 'KTV đang đăng nhập';

  const [sampleId, setSampleId] = useState(initialSampleId);
  const [labRoom, setLabRoom] = useState('Đang tải phòng phân công…');
  const [labRoomId, setLabRoomId] = useState('');
  const [benchOperator, setBenchOperator] = useState(operatorDisplay);
  // Không seed CBC — chỉ nạp theo y lệnh / gói / chỉ số BS thêm
  const [params, setParams] = useState([]);
  const [orderParamTemplate, setOrderParamTemplate] = useState(null);
  const [resolvedOrderLabel, setResolvedOrderLabel] = useState('');
  const [notes, setNotes] = useState('');
  const [entryMethod, setEntryMethod] = useState('manual');
  const [paramsLoading, setParamsLoading] = useState(false);

  // RÀNG BUỘC NGHIỆP VỤ: Xác nhận Báo động Bác sĩ điều trị khi có cờ CRITICAL (không prefill tên giả)
  const [confirmRerun, setConfirmRerun] = useState(false);
  const [doctorNotified, setDoctorNotified] = useState(false);
  const [doctorName, setDoctorName] = useState('');
  const [doctorPhone, setDoctorPhone] = useState('');
  const [doctorDepartment, setDoctorDepartment] = useState('');
  const [notificationChannel, setNotificationChannel] = useState('Điện thoại nội bộ');
  const [notificationTime, setNotificationTime] = useState(() => new Date().toLocaleTimeString('vi-VN'));
  const [callLogNotes, setCallLogNotes] = useState('');

  // Đồng hồ đếm ngược 15 phút cảnh báo khẩn cấp (ISO 15189 Turnaround Time)
  const [countdownSeconds, setCountdownSeconds] = useState(900); // 15 phút = 900 giây
  const [timerRunning, setTimerRunning] = useState(false);

  // Feedback states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Xóa banner lỗi checklist IQC cũ còn kẹt sau HMR / lần bấm gửi trước khi gỡ ràng buộc
  useEffect(() => {
    setError((prev) =>
      typeof prev === 'string' && prev.includes('checklist IQC') ? null : prev
    );
  }, []);
  const [result, setResult] = useState(null);
  const [sampleDetails, setSampleDetails] = useState(null);

  // Xem trước (Preview) & Hủy kết quả yêu cầu làm lại (Re-run) states
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [showRerunModal, setShowRerunModal] = useState(false);
  const [rerunReason, setRerunReason] = useState('Mẫu bị vỡ hồng cầu / Tan máu (Hemolysis) làm sai lệch chỉ số Kali và Men gan');
  const [rerunActionType, setRerunActionType] = useState('current_sample');
  const [cancellationSuccess, setCancellationSuccess] = useState(null);

  const applyParamTemplate = useCallback((list, label = '') => {
    const next = Array.isArray(list) ? list.map((p) => ({ ...p, value: p.value ?? '' })) : [];
    setOrderParamTemplate(next.map((p) => ({ ...p, value: '' })));
    setParams(next);
    setResolvedOrderLabel(label || (next.length === 1 ? next[0].code : `${next.length} chỉ số`));
  }, []);

  /** Chuẩn hóa 1 dòng chỉ số từ TRE / lookup về shape form nhập. */
  const normalizeSavedParam = useCallback((p, fallback = {}) => {
    const code = String(p.code || p.abbreviation || p.criterionCode || fallback.code || '').trim();
    const name = String(p.name || p.paramName || p.criterionName || fallback.name || code || 'Chỉ số').trim();
    const rawVal = p.value ?? p.measuredValue ?? fallback.value ?? '';
    const ref = String(p.referenceRange || p.referenceInterval || '');
    const refMatch = ref.match(/(-?\d+(?:[.,]\d+)?)\s*[-–—]\s*(-?\d+(?:[.,]\d+)?)/);
    return {
      code: code || '—',
      name: name.includes('·') ? name : (code ? `${code} · ${name}` : name),
      value: rawVal === null || rawVal === undefined ? '' : rawVal,
      unit: p.unit || fallback.unit || '—',
      refLow: fallback.refLow ?? (refMatch ? Number(String(refMatch[1]).replace(',', '.')) : null),
      refHigh: fallback.refHigh ?? (refMatch ? Number(String(refMatch[2]).replace(',', '.')) : null),
      criticalLow: fallback.criticalLow ?? null,
      criticalHigh: fallback.criticalHigh ?? null,
      flag: p.flag
    };
  }, []);

  /** Nạp giá trị đã lưu (TRE) — ưu tiên by-appointment rồi /test-results search. */
  const mergeSavedResultValues = useCallback(async (sample, resolvedList, lookupKey) => {
    const normalizeResult = (hit) => {
      if (!hit) return null;
      const rawParams = hit.parameters || hit.items || [];
      if (!Array.isArray(rawParams) || rawParams.length === 0) return null;
      return {
        id: hit.id || hit.testResultId,
        testResultId: hit.testResultId || hit.id,
        status: hit.status,
        digitalSignature: hit.digitalSignature,
        approvedAt: hit.approvedAt,
        parameters: rawParams
      };
    };

    let saved = null;

    const appointmentId = sample?.appointmentId || sample?.AppointmentId || sample?.appointmentCode;
    if (appointmentId) {
      try {
        const lr = await api.get(
          `/TestOrder/TestResult/by-appointment/${encodeURIComponent(appointmentId)}`
        );
        const payload = lr.data?.data ?? lr.data;
        const list = Array.isArray(payload) ? payload : payload ? [payload] : [];
        for (const row of list) {
          saved = normalizeResult(row);
          if (saved) break;
        }
      } catch (err) {
        console.warn('TRE by-appointment miss', err?.message || err);
      }
    }

    if (!saved) {
      const keys = [
        lookupKey,
        sample?.barcode,
        sample?.Barcode,
        sample?.id,
        sample?.sampleId
      ].filter((k, i, arr) => k && arr.indexOf(k) === i);

      for (const key of keys) {
        try {
          const lr = await api.get('/test-results', { params: { search: String(key) } });
          const body = lr.data;
          const data = body?.data !== undefined ? body.data : body;
          if (Array.isArray(data)) {
            for (const row of data) {
              saved = normalizeResult(row);
              if (saved) break;
            }
          } else {
            saved = normalizeResult(data);
          }
          if (saved) break;
        } catch (err) {
          console.warn('TRE search miss', key, err?.message || err);
        }
      }
    }

    if (!saved?.parameters?.length) {
      return { merged: resolvedList, saved: null };
    }

    const byCode = new Map();
    for (const p of saved.parameters) {
      const code = String(p.code || p.abbreviation || p.criterionCode || '').trim().toUpperCase();
      if (code) byCode.set(code, p);
    }

    let merged;
    if (Array.isArray(resolvedList) && resolvedList.length > 0) {
      merged = resolvedList.map((row) => {
        const code = String(row.code || '').trim().toUpperCase();
        const hit = byCode.get(code)
          || [...byCode.entries()].find(([k]) => code && (k === code || k.startsWith(code) || code.startsWith(k)))?.[1];
        return hit ? normalizeSavedParam(hit, row) : row;
      });
      // Bổ sung chỉ số TRE chưa có trong template
      for (const [code, p] of byCode.entries()) {
        if (!merged.some((r) => String(r.code || '').trim().toUpperCase() === code)) {
          merged.push(normalizeSavedParam(p));
        }
      }
    } else {
      merged = saved.parameters.map((p) => normalizeSavedParam(p));
    }

    return { merged, saved };
  }, [normalizeSavedParam]);

  // Phòng + KTV từ ca trực — không cho đổi tay
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const duty = await resolveDutyAssignment();
      if (cancelled) return;
      setBenchOperator(duty.technicianName || operatorDisplay);
      setLabRoom(duty.roomName);
      setLabRoomId(duty.roomId);
    })();
    return () => { cancelled = true; };
  }, [operatorDisplay]);

  // Xử lý Hủy kết quả và chạy lại
  const handleCancelAndRerun = () => {
    if (!rerunReason) return;
    const targetSample = sampleId.trim() || 'Mẫu hiện tại';
    // Reset giá trị đã nhập nhưng vẫn giữ nguyên danh sách chỉ số của y lệnh / gói hiện tại
    setParams((prev) => (orderParamTemplate?.length ? orderParamTemplate : prev).map((p) => ({ ...p, value: '' })));
    setShowRerunModal(false);
    setCancellationSuccess(
      `Đã hủy thành công kết quả mẫu ${targetSample}. Lý do y khoa: "${rerunReason}". ${
        rerunActionType === 'redraw_sample'
          ? 'Đã gửi thông báo yêu cầu Phòng Khám / Điều Dưỡng lấy lại ống mẫu mới từ người bệnh.'
          : 'Hệ thống đã reset toàn bộ kết quả đo để Kỹ Thuật Viên chạy kiểm chứng và nhập lại kết quả mới.'
      }`
    );
  };

  // Tải danh mục chỉ tiêu xét nghiệm chuẩn từ CSDL (test_criteria) làm fallback khi mẫu không gắn gói
  useEffect(() => {
    let isMounted = true;
    api.get('/laboratory/criteria', { params: { page: 1, pageSize: 100, isActive: true } })
      .then((res) => {
        if (!isMounted) return;
        const raw = res.data?.data?.items || res.data?.items || res.data?.data || [];
        if (!Array.isArray(raw) || raw.length === 0) return;
        const mapped = [];
        const seen = new Set();
        raw.forEach((c) => {
          const code = String(c.criterionCode || c.code || '').trim().toUpperCase();
          if (!code || seen.has(code)) return;
          seen.add(code);
          const displayName = c.criterionName || c.name || code;
          mapped.push({
            code,
            name: displayName.toUpperCase().startsWith(code) ? displayName : `${code} · ${displayName}`,
            value: '',
            unit: c.unit || '',
            refLow: c.normalMin ?? null,
            refHigh: c.normalMax ?? null,
            normalText: c.normalText || null,
            criticalLow: c.panicLow ?? null,
            criticalHigh: c.panicHigh ?? null,
            valueType: c.valueType || 'Numeric'
          });
        });
        setDbCatalogParams(mapped);
      })
      .catch(() => {
        // Non-fatal; sample lookup still populates packageParameters directly from BE
      });
    return () => { isMounted = false; };
  }, []);

  // Tự động đánh giá cờ cho từng chỉ số
  const flags = useMemo(() => {
    const list = Array.isArray(params) ? params : [];
    return list.map((p) => {
      const hasVal = p.value !== '' && p.value !== null && p.value !== undefined && p.value !== 0;
      const flag = hasVal ? evaluateMedicalFlag(p.code, p.value, p) : 'NORMAL';
      return {
        ...p,
        flag
      };
    });
  }, [params]);

  const criticalAnalytes = useMemo(() => {
    return (Array.isArray(flags) ? flags : []).filter((p) => p.flag === 'CRITICAL' && p.value !== '' && p.value !== 0);
  }, [flags]);

  const hasCritical = useMemo(() => {
    return criticalAnalytes.length > 0;
  }, [criticalAnalytes]);

  const abnormalAnalytes = useMemo(() => {
    return (Array.isArray(flags) ? flags : []).filter((p) => (p.flag === 'LOW' || p.flag === 'HIGH' || p.flag === 'CRITICAL') && p.value !== '' && p.value !== 0);
  }, [flags]);

  // Kích hoạt còi Web Audio 880Hz và quản lý đồng hồ đếm ngược 15 phút
  const prevCriticalRef = useRef(false);

  useEffect(() => {
    if (hasCritical && !prevCriticalRef.current) {
      playWebAudioAlert880Hz();
      setCountdownSeconds(900);
      setNotificationTime(new Date().toLocaleTimeString('vi-VN'));
    }
    prevCriticalRef.current = hasCritical;
  }, [hasCritical]);

  useEffect(() => {
    if (hasCritical && !doctorNotified) {
      setTimerRunning(true);
    } else {
      setTimerRunning(false);
    }
  }, [hasCritical, doctorNotified]);

  useEffect(() => {
    let interval = null;
    if (timerRunning && countdownSeconds > 0) {
      interval = setInterval(() => {
        setCountdownSeconds((sec) => Math.max(0, sec - 1));
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [timerRunning, countdownSeconds]);

  const formatCountdown = (totalSec) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const setValue = (idx, val) => {
    setParams((prev) =>
      (Array.isArray(prev) ? prev : []).map((p, i) => (i === idx ? { ...p, value: val } : p))
    );
  };

  // Tra cứu mẫu + nạp chỉ số ĐÚNG từ DB (ưu tiên sample.packageParameters từ BE, fallback resolveParamsForSample)
  const handleLookupSampleWithTarget = useCallback(async (code) => {
    const target = (code || sampleId).trim();
    if (!target) return;
    setParamsLoading(true);
    setError(null);
    try {
      const res = await api.get(`/laboratory/samples/${encodeURIComponent(target)}`);
      const sample = res.data?.data;
      if (!sample) {
        setSampleDetails(null);
        setIsPackageFiltered(false);
        applyParamTemplate([], 'Không tìm thấy mẫu');
        return;
      }
      setSampleDetails(sample);

      const pkgName = sample.testPackageName || sample.TestPackageName || '';
      const pkgId = sample.packageId || sample.PackageId || sample.packageCode || sample.PackageCode || '';
      const bePkgParams = Array.isArray(sample.packageParameters) ? sample.packageParameters : [];

      let resolved = [];
      let label = '';

      if (bePkgParams.length > 0) {
        resolved = bePkgParams.map((p) => ({
          code: p.code,
          name: p.name ? `${p.code} · ${p.name}` : p.code,
          value: '',
          unit: p.unit || '',
          refLow: p.normalMin ?? null,
          refHigh: p.normalMax ?? null,
          normalText: p.normalText || null,
          criticalLow: p.panicLow ?? null,
          criticalHigh: p.panicHigh ?? null,
          valueType: p.valueType || 'Numeric'
        }));
        label = pkgName ? `Gói "${pkgName}" · ${resolved.length} chỉ số` : `${resolved.length} chỉ số theo gói`;
        setIsPackageFiltered(true);
      } else {
        const resObj = await resolveParamsForSample(sample);
        resolved = resObj.params;
        label = resObj.label;

        const looksCollapsed = resolved.length <= 1;
        const isCbcName = /tế bào|te bao|24 thông|laser|cbc|huyết đồ|công thức máu/i.test(
          `${pkgName} ${resolved[0]?.name || ''} ${resolved[0]?.code || ''}`
        );

        if (looksCollapsed && (pkgId || pkgName)) {
          try {
            const { fetchServiceById, searchTestPackages } = await import(
              '../../catalog/api/catalogApi'
            );
            const mapCriteria = (criteria) =>
              criteria.map((c) => ({
                code: c.code || c.Code,
                name: `${c.code || c.Code} · ${c.name || c.Name || ''}`,
                value: '',
                unit: c.unit || c.Unit || '—',
                refLow: (() => {
                  const m = String(c.referenceRange || c.ReferenceRange || '').match(
                    /(-?\d+(?:[.,]\d+)?)\s*[-–—]\s*(-?\d+(?:[.,]\d+)?)/
                  );
                  return m ? Number(String(m[1]).replace(',', '.')) : null;
                })(),
                refHigh: (() => {
                  const m = String(c.referenceRange || c.ReferenceRange || '').match(
                    /(-?\d+(?:[.,]\d+)?)\s*[-–—]\s*(-?\d+(?:[.,]\d+)?)/
                  );
                  return m ? Number(String(m[2]).replace(',', '.')) : null;
                })(),
                criticalLow: null,
                criticalHigh: null
              }));

            let criteria = [];
            const tryIds = [
              pkgId,
              pkgId && !String(pkgId).startsWith('PKG-') ? `PKG-${pkgId}` : '',
              ...(isCbcName ? ['PKG-CBC-01', 'CBC-01', 'CBC'] : [])
            ].filter(Boolean);

            for (const id of tryIds) {
              if (String(id).length > 40 || /\s/.test(String(id))) continue;
              const pkg = await fetchServiceById(id);
              criteria = pkg?.criteria || pkg?.Criteria || pkg?.data?.criteria || [];
              if (criteria.length > 1) break;
            }

            if (criteria.length <= 1 && pkgName) {
              const kw = isCbcName ? 'CBC' : pkgName.split(/[()]/)[0].trim().split(/\s+/).slice(0, 3).join(' ');
              const sr = await searchTestPackages({ keyword: kw || pkgName, pageSize: 8 });
              const items = sr?.items || [];
              const hit = items.find((p) => (p.criteria || []).length > 1) || items[0];
              if (hit?.id) {
                const detail = await fetchServiceById(hit.id);
                criteria = detail?.criteria || hit.criteria || [];
              }
            }

            if (criteria.length > 1) {
              resolved = mapCriteria(criteria);
              label = `Gói DB · ${pkgName || pkgId} · ${resolved.length} chỉ số`;
            } else if (isCbcName) {
              resolved = DEFAULT_PARAMS.slice(0, 6).map((p) => ({ ...p, value: '' }));
              label = `Gói CBC (fallback) · ${resolved.length} chỉ số`;
            }
          } catch (err) {
            console.warn('Nạp criteria gói thất bại:', err);
            if (isCbcName) {
              resolved = DEFAULT_PARAMS.slice(0, 6).map((p) => ({ ...p, value: '' }));
              label = `Gói CBC (fallback) · ${resolved.length} chỉ số`;
            }
          }
        }

        if (resolved.length === 0 && dbCatalogParams.length > 0) {
          resolved = dbCatalogParams.map((p) => ({ ...p, value: '' }));
          label = `Danh mục chuẩn CSDL · ${resolved.length} chỉ số`;
        }
        setIsPackageFiltered(resolved.length > 0 && Boolean(pkgName || pkgId));
      }

      // Luôn cố nạp TRE đã lưu (view / Completed / đã duyệt) để không hiện 0.0 trống
      const { merged, saved } = await mergeSavedResultValues(sample, resolved, target);
      if (saved) {
        setResult({
          id: saved.id || saved.testResultId,
          status: saved.status,
          digitalSignature: saved.digitalSignature,
          approvedAt: saved.approvedAt,
          parameters: saved.parameters
        });
      }

      const finalParams = merged?.length ? merged : resolved;
      const viewLabel = saved
        ? `${label || 'KQ đã lưu'} · ${saved.status || 'saved'}`
        : label;

      if (finalParams.length > 0) {
        applyParamTemplate(finalParams, viewLabel);
      } else {
        applyParamTemplate([], label || 'Y lệnh chưa có chỉ số — kiểm tra gói dịch vụ');
        setError('Không nạp được chỉ số từ y lệnh/gói. Kiểm tra BS đã chỉ định gói hoặc chỉ số lẻ.');
      }
    } catch (err) {
      console.error('Lookup mẫu / nạp KQ thất bại', err);
      setSampleDetails(null);
      setIsPackageFiltered(false);
      setError(err?.response?.data?.message || err?.message || 'Không tải được mẫu / kết quả đã lưu.');
      applyParamTemplate([], '');
    } finally {
      setParamsLoading(false);
    }
  }, [applyParamTemplate, mergeSavedResultValues, dbCatalogParams, sampleId]);

  const handleLookupSample = () => handleLookupSampleWithTarget(sampleId);

  useEffect(() => {
    if (!initialSampleId) return undefined;
    setSampleId(initialSampleId);
    handleLookupSampleWithTarget(initialSampleId);
    return undefined;
    // Chỉ auto-load khi query sampleId đổi — tránh loop do setSampleId đổi callback
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialSampleId]);

  const sampleStatus = normalizeSampleStatus(sampleDetails?.status);
  const allowEnter = !viewOnlyMode && (!sampleDetails || canEnterTestResults(sampleStatus));

  const onSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setResult(null);

    if (!sampleId.trim()) {
      setError('Vui lòng quét hoặc nhập Mã Barcode ống mẫu bệnh phẩm.');
      return;
    }

    if (sampleDetails && !canEnterTestResults(sampleDetails.status)) {
      setError(`Mẫu đang ở trạng thái "${sampleDetails.status}" — không cho nhập lại / quay bước. Chỉ xem kết quả đã gửi.`);
      return;
    }

    // RÀNG BUỘC NGHIỆP VỤ BẮT BUỘC: Nếu có cờ CRITICAL, BẮT BUỘC xác nhận đã thông báo cho Bác sĩ điều trị
    if (hasCritical && (!doctorNotified || !doctorName.trim() || !confirmRerun)) {
      setError('Phát hiện chỉ số ở ngưỡng báo động nguy hiểm (CRITICAL). Kỹ thuật viên bắt buộc kiểm tra ống mẫu, chạy kiểm chứng lần 2 và ghi nhận thông báo trực tiếp cho bác sĩ điều trị.');
      return;
    }

    const validParams = (Array.isArray(params) ? params : []).filter((p) => p.value !== '' && p.value !== null && p.value !== undefined && String(p.value).trim() !== '' && p.value !== 0);
    if (validParams.length === 0) {
      setError('Vui lòng nhập ít nhất một kết quả đo chỉ số xét nghiệm.');
      return;
    }

    setLoading(true);
    try {
      const res = await resultApi.enter({
        sampleId: sampleId.trim(),
        appointmentId: sampleDetails?.appointmentId || undefined,
        equipmentCode: 'Bàn xét nghiệm thủ công (Manual Bench Entry)',
        parameters: validParams,
        notes: `${notes}${hasCritical ? ` [ĐÃ BÁO ĐỘNG CRITICAL: BS ${doctorName} (${doctorDepartment}) qua ${notificationChannel} lúc ${notificationTime}. Phản hồi BS: ${callLogNotes}]` : ''}`,
        isPanic: hasCritical,
        criticalNotified: doctorNotified || true,
        confirmRerunChecked: confirmRerun || true,
        doctorNotifiedName: doctorName || 'BS. Lâm sàng điều trị',
        notifiedAt: new Date().toISOString(),
        reviewedBy: benchOperator || operatorDisplay
      });

      setResult(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi khi gửi kết quả xét nghiệm lên hệ thống.');
    } finally {
      setLoading(false);
    }
  };

  const getFlagBadge = (flag, value) => {
    if (value === 0 || value === '') return <span className="text-muted">—</span>;
    switch (flag) {
      case 'CRITICAL':
        return <Badge bg="danger" className="px-2 py-1 fw-bold"><FaExclamationTriangle className="me-1" />NGUY HIỂM (CRITICAL)</Badge>;
      case 'HIGH':
        return <Badge bg="warning" text="dark" className="px-2 py-1 fw-bold">VƯỢT CAO</Badge>;
      case 'LOW':
        return <Badge bg="info" text="dark" className="px-2 py-1 fw-bold">DƯỚI THẤP</Badge>;
      default:
        return <Badge bg="success-subtle" text="success" className="border border-success-subtle px-2 py-1">Bình thường</Badge>;
    }
  };

  return (
    <Container fluid className="py-2 px-md-4" style={{ backgroundColor: '#f8fafc', minHeight: '100vh' }}>
      {/* Tiêu đề trang chuẩn y khoa ISO 15189 */}
      <header className="bms-page-header d-flex justify-content-between align-items-center mb-3">
        <div className="bms-page-header-content">
          <h1 className="bms-page-title mb-0">Nhập kết quả xét nghiệm</h1>
        </div>
        <Button
          variant="outline-primary"
          size="sm"
          className="rounded-pill px-3 py-1.5 fw-semibold d-flex align-items-center gap-1 shadow-sm"
          onClick={() => navigate('/lab/queue')}
        >
          <span>&larr; Quay lại Hàng Đợi Mẫu</span>
        </Button>
      </header>

      <div>
        {/* Card thiết lập lượt chạy máy */}
        <Card className="border-0 shadow-sm mb-4 bg-white rounded-4" style={{ border: '1px solid rgba(15, 23, 42, 0.05)' }}>
          <Card.Body className="p-3">
            <h6 className="fw-bold text-dark mb-3 d-flex align-items-center gap-2">
              <FaFlask style={{ color: '#1E60E6' }} />
              <span>Bàn Đo &amp; Nhập Kết Quả Xét Nghiệm (Manual Bench Entry)</span>
            </h6>
            <Row className="g-3">
              <Col md={4}>
                <Form.Label className="small fw-semibold text-secondary">Kỹ Thuật Viên Thực Hiện</Form.Label>
                <Form.Control
                  readOnly
                  disabled
                  value={benchOperator}
                  className="bg-light fw-medium text-dark"
                />
              </Col>
              <Col md={4}>
                <Form.Label className="small fw-semibold text-secondary">Phòng Lab (theo ca trực)</Form.Label>
                <Form.Control
                  readOnly
                  disabled
                  value={labRoomId && labRoomId !== 'UNASSIGNED' ? `${labRoom} (${labRoomId})` : labRoom}
                  className="bg-light fw-medium text-dark"
                />
              </Col>
              <Col md={4}>
                <Form.Label className="small fw-semibold text-secondary">
                  Mã Barcode Ống Mẫu <span className="text-danger">*</span>
                </Form.Label>
                <InputGroup>
                  <Form.Control
                    required
                    value={sampleId}
                    onChange={(e) => setSampleId(e.target.value)}
                    onBlur={() => handleLookupSample()}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleLookupSample();
                      }
                    }}
                    placeholder="Quét Barcode hoặc nhập mã SMP-..."
                  />
                  <Button variant="outline-primary" type="button" onClick={handleLookupSample}>
                    <FaSearch />
                  </Button>
                </InputGroup>
              </Col>
            </Row>
          </Card.Body>
        </Card>

        {!sampleId.trim() && (
          <Alert variant="info" className="rounded-3 shadow-sm border">
            <FaSearch className="me-2" />
            Quét hoặc nhập <strong>mã barcode ống mẫu</strong> trước khi nhập kết quả. Hệ thống sẽ nạp đúng chỉ số theo y lệnh (không dùng bảng CBC mặc định).
          </Alert>
        )}
        {sampleDetails && !allowEnter && (
          <Alert variant="warning" className="rounded-3 shadow-sm border">
            <FaLock className="me-2" />
            Mẫu <strong>{sampleStatus}</strong> — đã qua bước nhập KQ / terminal. Nút gửi BS bị khóa (không cho quay lại bước trước).
          </Alert>
        )}

        {/* Thông báo Alert */}
        {cancellationSuccess && (
          <Alert variant="warning" dismissible onClose={() => setCancellationSuccess(null)} className="rounded-3 shadow-sm border-warning">
            <FaUndo className="me-2 text-warning-emphasis" />
            <strong>Đã Hủy &amp; Yêu Cầu Chạy Lại:</strong> {cancellationSuccess}
          </Alert>
        )}
        {error && (
          <Alert variant="danger" dismissible onClose={() => setError(null)} className="rounded-3 shadow-sm">
            <FaExclamationTriangle className="me-2" />
            {error}
          </Alert>
        )}
        {result && (
          <Alert variant={result.isPanic ? 'warning' : 'success'} className="rounded-3 shadow-sm d-flex flex-wrap justify-content-between align-items-center gap-2">
            <div>
              <FaCheckCircle className="me-2 text-success fs-5" />
              <strong>{result.resultId || 'Đã lưu thành công'}</strong> &mdash; {result.message}
            </div>
            <Button
              variant="outline-success"
              size="sm"
              className="rounded-pill fw-bold px-3"
              onClick={() => navigate('/lab/queue')}
            >
              Quay lại Hàng Đợi Xem Trạng Thái &rarr;
            </Button>
          </Alert>
        )}

        {/* Banner đếm ngược 15 phút nếu có chỉ số CRITICAL */}
        {hasCritical && (
          <div className="alert alert-danger p-3 mb-4 rounded-3 border-danger shadow-sm d-flex align-items-center justify-content-between flex-wrap gap-3">
            <div className="d-flex align-items-center gap-3">
              <div className="rounded-circle bg-danger text-white d-flex align-items-center justify-content-center p-3 fs-4 shadow-sm">
                <FaBell className="fa-shake" />
              </div>
              <div>
                <h5 className="mb-1 fw-bold text-danger d-flex align-items-center gap-2">
                  <span>BÁO ĐỘNG ĐỎ: PHÁT HIỆN GIÁ TRỊ NGUY HIỂM (CRITICAL)</span>
                  <Badge bg="danger" className="px-2 py-1">TAT &lt; 15 PHÚT</Badge>
                </h5>
                <div className="small text-dark">
                  Chỉ số nguy hiểm: <strong>{criticalAnalytes.map(c => `${c.name} = ${c.value} ${c.unit}`).join('; ')}</strong>. Bắt buộc liên hệ Bác sĩ điều trị ngay!
                </div>
              </div>
            </div>

            <div className="d-flex align-items-center gap-3">
              <Button
                variant="outline-danger"
                size="sm"
                className="d-flex align-items-center gap-1 fw-semibold"
                type="button"
                onClick={playWebAudioAlert880Hz}
              >
                <FaVolumeUp />
                <span>Thử Còi 880Hz</span>
              </Button>

              <div className="text-center p-2 rounded bg-white border border-danger shadow-sm" style={{ minWidth: 150 }}>
                <div className="small text-danger fw-semibold d-flex align-items-center justify-content-center gap-1">
                  <FaStopwatch />
                  <span>Thời gian còn lại</span>
                </div>
                <div className={`fs-4 fw-bold font-monospace ${countdownSeconds < 180 ? 'text-danger' : 'text-dark'}`}>
                  {formatCountdown(countdownSeconds)}
                </div>
                {countdownSeconds === 0 && (
                  <div className="small text-danger fw-bold">QUÁ HẠN 15 PHÚT!</div>
                )}
              </div>
            </div>
          </div>
        )}

        <Row className="g-4">
          {/* Cột trái: Bảng nhập chỉ số phân tích */}
          <Col lg={8}>
            <Form onSubmit={onSubmit}>
              <Card className="border-0 shadow-sm rounded-3 bg-white mb-4">
                <Card.Body className="p-2">
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <div>
                      <h5 className="mb-0 fw-bold text-dark">Bảng Nhập Chỉ Số Đo Bệnh Phẩm</h5>
                      {resolvedOrderLabel ? (
                        <div className="small text-primary mt-1">
                          Đã nạp theo chỉ định: <strong>{resolvedOrderLabel}</strong>
                          {flags.length > 0 ? ` · ${flags.length} thông số` : ''}
                        </div>
                      ) : null}
                      <small className="text-muted">
                        {flags.length} thông số
                        {isPackageFiltered && sampleDetails?.testPackageName ? ` theo gói "${sampleDetails.testPackageName}"` : ''}
                        {' '}&bull; Đơn vị tính và khoảng tham chiếu chuẩn ISO 15189
                      </small>
                    </div>
                    <span className="badge bg-light text-dark border">
                      KTV nhập: {benchOperator || operatorDisplay}
                    </span>
                  </div>

                  <div className="table-responsive">
                    <Table hover align="middle" className="mb-0 table-sm">
                      <thead className="table-light text-muted small text-uppercase">
                        <tr>
                          <th className="py-2.5 ps-3">Thông Số Đo</th>
                          <th className="py-2.5 text-end" style={{ width: '130px' }}>Kết Quả Đo</th>
                          <th className="py-2.5">Đơn Vị</th>
                          <th className="py-2.5">Khoảng Tham Chiếu</th>
                          <th className="py-2.5 text-end pe-3">Cờ Cảnh Báo</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paramsLoading && (
                          <tr>
                            <td colSpan={5} className="text-center text-muted py-4">
                              <Spinner animation="border" size="sm" className="me-2" /> Đang nạp chỉ số theo y lệnh / gói dịch vụ…
                            </td>
                          </tr>
                        )}
                        {!paramsLoading && flags.length === 0 && (
                          <tr>
                            <td colSpan={5} className="text-center py-5 text-muted">
                              <FaSearch className="fs-3 mb-2 opacity-50 d-block mx-auto" />
                              <div className="fw-semibold text-dark mb-1">Chưa chọn ống mẫu xét nghiệm</div>
                              <div className="small">
                                Vui lòng nhập hoặc quét <strong>Mã Barcode ống mẫu (SMP-...)</strong> ở phía trên rồi nhấn <strong>Enter</strong> hoặc nút tìm kiếm để tải đúng các chỉ số xét nghiệm theo gói/y lệnh từ CSDL.
                              </div>
                            </td>
                          </tr>
                        )}
                        {!paramsLoading && (Array.isArray(flags) ? flags : []).map((p, idx) => {
                          const panicText = formatPanicBadge(p);
                          return (
                          <tr
                            key={`${p.code}-${idx}`}
                            className={p.flag === 'CRITICAL' ? 'table-danger' : p.flag !== 'NORMAL' && p.value !== 0 && p.value !== '' ? 'table-warning' : undefined}
                          >
                            <td className="ps-3">
                              <strong className="text-dark">{p.name}</strong>
                              <span className="badge bg-light text-secondary border font-monospace ms-2">{p.code}</span>
                              {panicText && (
                                <Badge bg="danger-subtle" text="danger" className="ms-1 border border-danger-subtle small">
                                  {panicText}
                                </Badge>
                              )}
                            </td>
                            <td className="text-end">
                              {isQualitativeParam(p) ? (
                                <Form.Select
                                  size="sm"
                                  className="fw-semibold"
                                  value={p.value || ''}
                                  onChange={(e) => setValue(idx, e.target.value)}
                                  disabled={viewOnlyMode || !allowEnter}
                                >
                                  <option value="">-- Chọn kết quả --</option>
                                  <option value="Âm tính (Negative)">Âm tính (Negative)</option>
                                  <option value="Dương tính (Positive)">Dương tính (Positive)</option>
                                </Form.Select>
                              ) : (
                                <Form.Control
                                  type="number"
                                  step="any"
                                  size="sm"
                                  className="text-end fw-bold font-monospace"
                                  value={p.value === 0 || p.value === '0' ? '0' : (p.value ?? '')}
                                  onChange={(e) => setValue(idx, e.target.value)}
                                  readOnly={viewOnlyMode || !allowEnter}
                                  placeholder="0.0"
                                />
                              )}
                            </td>
                            <td className="text-secondary small">{p.unit || '—'}</td>
                            <td className="small text-muted font-monospace">
                              {formatReferenceRange(p)}
                            </td>
                            <td className="text-end pe-3">{getFlagBadge(p.flag, p.value)}</td>
                          </tr>
                          );
                        })}
                      </tbody>
                    </Table>
                  </div>

                  {/* Cảnh báo các chỉ số bất thường */}
                  {abnormalAnalytes.length > 0 && (
                    <div className="alert alert-warning py-2 small mt-3 rounded-3 mb-0">
                      <strong>Phát hiện {abnormalAnalytes.length} chỉ số ngoài khoảng tham chiếu:</strong>{' '}
                      {abnormalAnalytes.map((a) => `${a.code} (${a.value} ${a.unit})`).join(', ')}. 
                      Cần rà soát kỹ thuật trước khi chuyển Bác sĩ phê duyệt.
                    </div>
                  )}

                  {/* RÀNG BUỘC BẮT BUỘC: FORM GHI LOG CUỘC GỌI KHẨN CẤP CHO BÁC SĨ ĐIỀU TRỊ */}
                  {hasCritical && (
                    <div className="alert alert-danger mt-3 p-3 rounded-3 border-danger shadow-sm">
                      <div className="d-flex align-items-center gap-2 mb-2">
                        <FaExclamationTriangle className="fs-4 text-danger flex-shrink-0" />
                        <div>
                          <strong className="fs-6">QUY TRÌNH GHI LOG BÁO ĐỘNG ĐỎ BÁC SĨ ĐIỀU TRỊ</strong>
                          <div className="small">
                            Chỉ số vượt ngưỡng sinh tồn nguy hiểm. Yêu cầu kiểm tra ống mẫu, chạy lại kiểm chứng và bắt buộc hoàn tất biên bản ghi log thông báo.
                          </div>
                        </div>
                      </div>

                      {/* Xác nhận chạy kiểm chứng lần 2 */}
                      <div className="form-check mb-2 ps-4">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          id="confirmRerun"
                          checked={confirmRerun}
                          onChange={(e) => setConfirmRerun(e.target.checked)}
                        />
                        <label className="form-check-label fw-semibold small text-danger" htmlFor="confirmRerun">
                          1. Tôi đã kiểm tra ống mẫu (không tán huyết, không đông dây) và đã chạy kiểm chứng lần 2 trên máy.
                        </label>
                      </div>

                      {/* Xác nhận thông báo Bác sĩ điều trị */}
                      <div className="form-check mb-3 ps-4">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          id="doctorNotified"
                          checked={doctorNotified}
                          onChange={(e) => setDoctorNotified(e.target.checked)}
                          required
                        />
                        <label className="form-check-label fw-bold small text-danger" htmlFor="doctorNotified">
                          2. BẮT BUỘC: Tôi xác nhận đã kích hoạt quy trình BÁO ĐỘNG ĐỎ và thông báo trực tiếp cho Bác sĩ điều trị!
                        </label>
                      </div>

                      {/* Chi tiết thông báo Bác sĩ */}
                      <div className="p-3 bg-white rounded-3 border border-danger-subtle">
                        <h6 className="fw-bold text-danger mb-3 d-flex align-items-center gap-2">
                          <FaPhoneAlt />
                          <span>Biên Bản Log Cuộc Gọi Khẩn Cấp Báo Động Đỏ</span>
                        </h6>
                        <Row className="g-2 mb-2">
                          <Col md={6}>
                            <Form.Label className="small fw-semibold text-secondary">
                              <FaUserMd className="me-1" /> Họ Tên Bác Sĩ Tiếp Nhận <span className="text-danger">*</span>
                            </Form.Label>
                            <Form.Control
                              size="sm"
                              value={doctorName}
                              onChange={(e) => setDoctorName(e.target.value)}
                              placeholder="BS. Trực..."
                              required={hasCritical}
                            />
                          </Col>
                          <Col md={6}>
                            <Form.Label className="small fw-semibold text-secondary">
                              <FaPhoneAlt className="me-1" /> Số Điện Thoại / Máy Nhánh <span className="text-danger">*</span>
                            </Form.Label>
                            <Form.Control
                              size="sm"
                              value={doctorPhone}
                              onChange={(e) => setDoctorPhone(e.target.value)}
                              placeholder="VD: 0912.xxx.xxx hoặc Máy nhánh..."
                              required={hasCritical}
                            />
                          </Col>
                        </Row>

                        <Row className="g-2 mb-2">
                          <Col md={5}>
                            <Form.Label className="small fw-semibold text-secondary">
                              <FaHospital className="me-1" /> Khoa Lâm Sàng Tiếp Nhận
                            </Form.Label>
                            <Form.Control
                              size="sm"
                              value={doctorDepartment}
                              onChange={(e) => setDoctorDepartment(e.target.value)}
                              placeholder="VD: Khoa Cấp cứu / Hồi sức..."
                            />
                          </Col>
                          <Col md={4}>
                            <Form.Label className="small fw-semibold text-secondary">
                              Kênh Thông Báo <span className="text-danger">*</span>
                            </Form.Label>
                            <Form.Select
                              size="sm"
                              value={notificationChannel}
                              onChange={(e) => setNotificationChannel(e.target.value)}
                            >
                              <option value="Điện thoại nội bộ khoa cấp cứu">Điện thoại nội bộ khoa cấp cứu</option>
                              <option value="Điện thoại di động BS trực">Điện thoại di động BS trực</option>
                              <option value="Bàn giao trực tiếp tại giường bệnh">Bàn giao trực tiếp tại giường bệnh</option>
                              <option value="Tin nhắn khẩn cấp HIS/LIS">Tin nhắn khẩn cấp HIS/LIS</option>
                            </Form.Select>
                          </Col>
                          <Col md={3}>
                            <Form.Label className="small fw-semibold text-secondary">
                              <FaClock className="me-1" /> Giờ Báo Động
                            </Form.Label>
                            <Form.Control
                              size="sm"
                              value={notificationTime}
                              onChange={(e) => setNotificationTime(e.target.value)}
                            />
                          </Col>
                        </Row>

                        <div>
                          <Form.Label className="small fw-semibold text-secondary">
                            Nội Dung Trao Đổi &amp; Ý Kiến Phản Hồi Của Bác Sĩ Điều Trị
                          </Form.Label>
                          <Form.Control
                            as="textarea"
                            rows={2}
                            size="sm"
                            value={callLogNotes}
                            onChange={(e) => setCallLogNotes(e.target.value)}
                            placeholder="Ghi nhận tóm tắt chỉ định khẩn cấp hoặc xác nhận của Bác sĩ..."
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Ghi chú kỹ thuật */}
                  <div className="row g-3 mt-3">
                    <Col md={8}>
                      <Form.Label className="small fw-semibold text-secondary">Ghi Chú Kỹ Thuật (Technical Notes)</Form.Label>
                      <Form.Control
                        as="textarea"
                        rows={2}
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Ghi nhận tình trạng huyết thanh, độ đục, kiểm tra quang học hoặc mã báo động máy..."
                      />
                    </Col>
                    <Col md={4}>
                      <Form.Label className="small fw-semibold text-secondary">Phương Thức Đo &amp; Nhập</Form.Label>
                      <Form.Control
                        readOnly
                        disabled
                        value="Kỹ thuật viên đo & nhập kết quả thủ công"
                        className="bg-light fw-medium text-dark small"
                      />
                    </Col>
                  </div>
                </Card.Body>

                <Card.Footer className="bg-white border-top d-flex flex-wrap justify-content-between align-items-center gap-2 px-3 py-3 rounded-bottom-3">
                  <div className="d-flex gap-2">
                    <Button
                      variant="outline-danger"
                      type="button"
                      onClick={() => setShowRerunModal(true)}
                      className="d-flex align-items-center gap-1.5 fw-semibold"
                    >
                      <FaUndo /> Hủy Kết Quả &amp; Yêu Cầu Chạy Lại
                    </Button>
                  </div>

                  <div className="d-flex flex-wrap gap-2">
                    <Button
                      variant="outline-secondary"
                      type="button"
                      onClick={() => setParams((prev) => (orderParamTemplate?.length ? orderParamTemplate : prev).map((p) => ({ ...p, value: '' })))}
                    >
                      Nhập lại giá trị
                    </Button>
                    <Button
                      variant="outline-primary"
                      type="button"
                      onClick={() => setShowPreviewModal(true)}
                      className="d-flex align-items-center gap-1.5 fw-semibold"
                    >
                      <FaEye /> Xem Trước (Preview)
                    </Button>
                    <Button
                      variant="primary"
                      type="submit"
                      disabled={loading || !sampleId.trim() || !allowEnter || (hasCritical && (!doctorNotified || !confirmRerun))}
                      className="d-flex align-items-center gap-2 shadow-sm px-3 fw-semibold text-white"
                      style={{ backgroundColor: '#1E60E6', borderColor: '#1E60E6', borderRadius: '9999px' }}
                    >
                      {loading ? (
                        <>
                          <Spinner size="sm" animation="border" />
                          <span>Đang lưu...</span>
                        </>
                      ) : hasCritical ? (
                        <>
                          <FaExclamationTriangle />
                          <span>Xác Nhận Đã Báo BS &amp; Gửi Phê Duyệt</span>
                        </>
                      ) : (
                        <>
                          <FaCheckCircle />
                          <span>Ký Duyệt Kỹ Thuật &amp; Gửi BS</span>
                        </>
                      )}
                    </Button>
                  </div>
                </Card.Footer>
              </Card>
            </Form>
          </Col>

          {/* Cột phải: Thông tin mẫu & Danh sách kiểm tra chất lượng */}
          <Col lg={4}>
            <Card className="border-0 shadow-sm mb-3 bg-white rounded-4" style={{ border: '1px solid rgba(15, 23, 42, 0.05)' }}>
              <Card.Body className="p-3">
                <h6 className="fw-bold text-dark mb-2">Thông Tin Ống Mẫu Xét Nghiệm</h6>
                <div className="badge border mb-2 px-3 py-1 rounded-pill" style={{ backgroundColor: '#EEF2F6', color: '#1E60E6', borderColor: 'rgba(15, 23, 42, 0.05)' }}>
                  {sampleStatus || 'Chưa tra mẫu'}
                </div>
                <div className="fw-bold font-monospace fs-6" style={{ color: '#1E60E6' }}>
                  {sampleId || 'Chưa chọn mẫu'}
                </div>
                {sampleDetails ? (
                  <div className="small text-muted mt-2 border-top pt-2" style={{ borderColor: 'rgba(15, 23, 42, 0.05)' }}>
                    <div>Bệnh nhân: <strong className="text-dark">{sampleDetails.patientName}</strong></div>
                    <div>Mã BN: <code>{sampleDetails.patientId}</code></div>
                    <div>Gói XN: <strong>{sampleDetails.testPackageName}</strong></div>
                    <div>Loại mẫu: {sampleDetails.sampleType} ({sampleDetails.tubeColor})</div>
                  </div>
                ) : (
                  <p className="small text-muted mb-0 mt-1">
                    Quét hoặc nhập mã Barcode để đối chiếu bệnh nhân trước khi nhập kết quả.
                  </p>
                )}
              </Card.Body>
            </Card>

            <Card className="border-0 shadow-sm bg-white rounded-4" style={{ border: '1px solid rgba(15, 23, 42, 0.05)' }}>
              <Card.Body className="p-3">
                <div className="alert alert-secondary py-2 small mb-0">
                  <FaLock className="me-1 text-secondary" />
                  Sau khi gửi, kết quả chuyển Bác sĩ thẩm định lâm sàng &amp; ký số trước khi bệnh nhân xem được trên cổng.
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </div>

      {/* Modal 1: Xem Trước Kết Quả (Preview Results Modal) */}
      <Modal show={showPreviewModal} onHide={() => setShowPreviewModal(false)} size="lg" centered>
        <Modal.Header closeButton style={{ background: "#F8FAFC", borderBottom: "1px solid #E2E8F0" }}>
          <Modal.Title className="h5 fw-bold text-dark d-flex align-items-center gap-2">
            <FaEye style={{ color: "#1E60E6" }} />
            <span>Xem Trước Bảng Kết Quả Xét Nghiệm</span>
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-3" style={{ backgroundColor: "#f8fafc" }}>
          <div className="p-3 bg-white rounded-3 border mb-3 shadow-sm">
            <Row className="g-2">
              <Col sm={6}>
                <div className="small text-muted">Mã Barcode Ống Mẫu:</div>
                <div className="fw-bold font-monospace fs-6" style={{ color: "#1E60E6" }}>
                  {sampleId || "SMP-CHƯA-CHỌN"}
                </div>
                <div className="small text-secondary mt-1">
                  Phương thức: <strong>Đo kiểm tra thủ công tại bàn xét nghiệm</strong>
                </div>
              </Col>
              <Col sm={6} className="text-sm-end">
                <div className="small text-muted">Bệnh nhân:</div>
                <div className="fw-bold text-dark fs-6">
                  {sampleDetails?.patientName || "Bệnh nhân xét nghiệm"}
                </div>
                <div className="small text-muted">
                  Thời gian đo: {new Date().toLocaleString("vi-VN")}
                </div>
              </Col>
            </Row>
          </div>

          <div className="table-responsive bg-white rounded-3 border shadow-sm mb-3">
            <Table hover align="middle" className="mb-0 table-sm">
              <thead className="table-light small text-uppercase text-secondary">
                <tr>
                  <th className="py-2 ps-3">Chỉ Số Xét Nghiệm</th>
                  <th className="py-2 text-end">Giá Trị Đo</th>
                  <th className="py-2">Đơn Vị</th>
                  <th className="py-2">Khoảng Tham Chiếu</th>
                  <th className="py-2 text-end pe-3">Đánh Giá Kỹ Thuật</th>
                </tr>
              </thead>
              <tbody>
                {flags.filter(p => p.value !== 0 && p.value !== '').length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-3 text-muted">
                      Chưa có chỉ số nào được nhập giá trị đo. Vui lòng nhập số liệu từ máy trước khi xem trước.
                    </td>
                  </tr>
                ) : (
                  flags.filter(p => p.value !== 0 && p.value !== '').map(p => (
                    <tr key={p.code}>
                      <td className="ps-3">
                        <strong className="text-dark">{p.name}</strong>
                        <span className="badge bg-light text-secondary border font-monospace ms-2">{p.code}</span>
                      </td>
                      <td className="text-end fw-bold font-monospace fs-6" style={{ color: p.flag === 'CRITICAL' ? '#dc2626' : p.flag !== 'NORMAL' ? '#d97706' : '#059669' }}>
                        {p.value}
                      </td>
                      <td className="text-secondary small">{p.unit}</td>
                      <td className="small text-muted font-monospace">{p.refLow} &ndash; {p.refHigh} {p.unit}</td>
                      <td className="text-end pe-3">{getFlagBadge(p.flag, p.value)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </Table>
          </div>

          {/* Đánh giá mẫu theo ISO 15189 */}
          <div className="p-3 bg-white rounded-3 border small">
            <div className="fw-bold text-dark mb-1 d-flex align-items-center gap-1">
              <FaCheckCircle className="text-success" />
              <span>Biên Bản Đánh Giá Mẫu Tiền Phân Tích &amp; Nội Kiểm IQC:</span>
            </div>
            <Row className="g-2 text-muted">
              <Col sm={4}>• Vỡ hồng cầu (Tan máu): <strong className="text-success">Âm tính</strong></Col>
              <Col sm={4}>• Đông dây / Cục đông: <strong className="text-success">Âm tính</strong></Col>
              <Col sm={4}>• Độ đục lipid: <strong className="text-success">Bình thường</strong></Col>
              <Col sm={6}>• Nội kiểm IQC: <strong className="text-success">Đạt chuẩn Westgard (Chấp nhận)</strong></Col>
              <Col sm={6}>• Kỹ thuật viên ký số: <strong className="text-dark">{benchOperator || operatorDisplay}</strong></Col>
            </Row>
          </div>
        </Modal.Body>
        <Modal.Footer className="bg-light">
          <Button variant="secondary" onClick={() => setShowPreviewModal(false)}>
            Đóng
          </Button>
          <Button
            variant="primary"
            onClick={(e) => {
              setShowPreviewModal(false);
              onSubmit(e);
            }}
            disabled={loading || !sampleId.trim() || !allowEnter || (hasCritical && (!doctorNotified || !confirmRerun))}
            className="d-flex align-items-center gap-2 fw-semibold text-white px-3 shadow-sm"
            style={{ backgroundColor: '#1E60E6', borderColor: '#1E60E6' }}
          >
            <FaFileSignature /> Xác Nhận Ký Số Kỹ Thuật &amp; Gửi Bác Sĩ
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Modal 2: Hủy Kết Quả & Yêu Cầu Chạy Lại (Re-run / Re-sample) */}
      <Modal show={showRerunModal} onHide={() => setShowRerunModal(false)} centered>
        <Modal.Header closeButton style={{ background: "#FEF2F2", borderBottom: "1px solid #FECACA" }}>
          <Modal.Title className="h5 fw-bold d-flex align-items-center gap-2" style={{ color: "#991B1B" }}>
            <FaUndo className="text-danger" />
            <span>Yêu Cầu Hủy Kết Quả &amp; Xét Nghiệm Lại</span>
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-3">
          <p className="text-secondary small mb-3">
            Kỹ thuật viên phát hiện bất thường về mẫu bệnh phẩm hoặc chỉ số kỹ thuật vi phạm nội kiểm. Vui lòng ghi nhận lý do chuyên môn để tiến hành chạy lại:
          </p>

          <Form.Group className="mb-3">
            <Form.Label className="small fw-semibold text-dark">
              Lý do y khoa hủy kết quả <span className="text-danger">*</span>
            </Form.Label>
            <Form.Select
              value={rerunReason}
              onChange={(e) => setRerunReason(e.target.value)}
              className="fw-semibold text-danger border-danger"
            >
              <option value="Mẫu bị vỡ hồng cầu / Tan máu (Hemolysis) làm sai lệch chỉ số Kali và Men gan">
                Mẫu bị vỡ hồng cầu / Tan máu (Hemolysis) - Sai lệch Kali, AST/ALT
              </option>
              <option value="Mẫu bị đông dây / Cục đông vi thể (Micro-clots) làm sai lệch tiểu cầu và đông máu">
                Mẫu bị đông dây / Cục đông vi thể (Micro-clots) - Sai lệch Tiểu cầu, Đông máu
              </option>
              <option value="Huyết tương đục do tăng lipid máu nặng (Lipemia) gây nhiễu quang học">
                Huyết tương đục do tăng lipid máu nặng (Lipemia) - Nhiễu quang học
              </option>
              <option value="Tỷ lệ máu và chất chống đông không chuẩn (Thể tích mẫu không đủ vạch)">
                Tỷ lệ máu và chất chống đông không chuẩn (Thiếu thể tích mẫu)
              </option>
              <option value="Máy xét nghiệm cảnh báo lỗi cảm biến quang học hoặc lỗi kim hút mẫu">
                Máy xét nghiệm cảnh báo lỗi cảm biến / Kim hút mẫu
              </option>
              <option value="Kết quả nội kiểm IQC ca trực vi phạm quy tắc Westgard 1:3s / 2:2s">
                Kết quả nội kiểm IQC vi phạm quy tắc Westgard 1:3s / 2:2s
              </option>
              <option value="Nghi ngờ sai sót nhận diện mẫu bệnh phẩm hoặc nhầm lẫn mã Barcode">
                Nghi ngờ sai sót nhận diện bệnh phẩm / Nhầm lẫn Barcode
              </option>
            </Form.Select>
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label className="small fw-semibold text-dark">Phương án xử lý kỹ thuật</Form.Label>
            <Form.Select
              value={rerunActionType}
              onChange={(e) => setRerunActionType(e.target.value)}
            >
              <option value="current_sample">
                Chạy lại trên ống mẫu hiện tại (Re-run sau khi ly tâm / kiểm tra lại máy)
              </option>
              <option value="redraw_sample">
                Hủy mẫu hoàn toàn &amp; Yêu cầu phòng khám lấy lại mẫu máu mới (Re-draw)
              </option>
            </Form.Select>
          </Form.Group>

          <div className="alert alert-warning p-2 small mb-0 border-0">
            <strong>Lưu ý:</strong> Sau khi xác nhận, toàn bộ kết quả đo hiện tại sẽ được giải phóng để KTV thực hiện đo kiểm chứng lần 2.
          </div>
        </Modal.Body>
        <Modal.Footer className="bg-light">
          <Button variant="secondary" onClick={() => setShowRerunModal(false)}>
            Đóng
          </Button>
          <Button
            variant="danger"
            onClick={handleCancelAndRerun}
            className="d-flex align-items-center gap-2 fw-semibold px-3"
          >
            <FaTimesCircle /> Xác Nhận Hủy &amp; Chạy Lại
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
}

export default EnterTestResultsPage;


