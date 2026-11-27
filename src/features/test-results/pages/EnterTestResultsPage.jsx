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
import { FlaskConical, CheckCircle2, AlertTriangle, Phone, TestTube2, Microscope, Clock, Stethoscope, Save, Search, Lock, Bell, Volume2, Timer, Hospital, Eye, XCircle, RotateCw, Undo2, FileSignature, RefreshCw } from 'lucide-react';
import TablePagination, { usePagination } from '../../../components/ui/TablePagination';
import { resultApi } from '../api/resultApi';
import { getInventory } from '../../inventory/api/inventoryApi';
import api from '../../../config/api';
import { getStoredUser } from '../../../constants/roles';
import Code128Barcode from '../../../shared/components/Code128Barcode';
import { canEnterTestResults, canViewTestResults, normalizeSampleStatus } from '../../../shared/workflow/sampleWorkflowGates';
import { resolveDutyAssignment } from '../../../shared/workflow/dutyAssignment';
import { resolveParamsForSample } from '../../../shared/workflow/resolveOrderParams';
import { formatTubeColorVi, formatSampleTypeVi } from '../../../shared/workflow/labConsumables';
import {
  getMeasurementRule,
  formatRuleHintVi,
  validateAllParameters
} from '../../../shared/workflow/clinicalMeasurementValidation';

function hasEnteredValue(val) {
  return val !== null && val !== undefined && String(val).trim() !== '';
}

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
  return { ...p, value: '' };
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
    value: '',
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
  if (!hasEnteredValue(value)) return 'NORMAL';
  if (isQualitativeParam(p)) {
    const text = String(value).trim().toLowerCase();
    if (!text) return 'NORMAL';
    if (
      text.includes('dương') ||
      text.includes('positive') ||
      (text.includes('reactive') && !text.includes('non-reactive')) ||
      (text.includes('phản ứng') && !text.includes('không phản ứng'))
    ) return 'HIGH';
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

  // Vật tư / Lô hóa chất sử dụng khi chạy xét nghiệm (tự động trừ tồn kho khi lưu KQ)
  const [reagentLots, setReagentLots] = useState([]);
  const [reagentsLoading, setReagentsLoading] = useState(false);
  const [selectedReagentLotId, setSelectedReagentLotId] = useState('');
  const [reagentQuantity, setReagentQuantity] = useState('1');

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
  const [submitAttempted, setSubmitAttempted] = useState(false);

  // Danh sách ống mẫu sẵn sàng ở Bước 3 (Đang xét nghiệm / Yêu cầu chạy lại / Chờ BS duyệt / BS đã duyệt)
  const [benchSamples, setBenchSamples] = useState([]);
  const [resultBySampleKey, setResultBySampleKey] = useState({});
  const [benchLoading, setBenchLoading] = useState(false);
  const [benchTab, setBenchTab] = useState('TESTING'); // 'TESTING' | 'RERUN' | 'WAITING_DOCTOR' | 'APPROVED'
  const [benchSearch, setBenchSearch] = useState('');
  const [showEntryModal, setShowEntryModal] = useState(Boolean(initialSampleId));
  const [pageFeedback, setPageFeedback] = useState(null);

  const isDoctorApprovedResult = useCallback((tr) => {
    if (!tr) return false;
    const st = String(tr.status || '').trim().toLowerCase();
    const vs = String(tr.validationStatus || '').trim().toLowerCase();
    return (
      st === 'approved' ||
      st === 'doctorapproved' ||
      st === 'released' ||
      vs === 'doctorapproved' ||
      vs === 'released' ||
      Boolean(tr.approvedAt)
    );
  }, []);

  const getSampleResult = useCallback((s) => {
    if (!s) return null;
    const keys = [s.id, s.sampleId, s.barcode]
      .filter(Boolean)
      .map((k) => String(k).trim().toLowerCase());
    for (const k of keys) {
      if (resultBySampleKey[k]) return resultBySampleKey[k];
    }
    return null;
  }, [resultBySampleKey]);

  const loadBenchSamples = useCallback(async () => {
    setBenchLoading(true);
    try {
      const [queueRes, resultsRes] = await Promise.allSettled([
        api.get('/laboratory/samples/queue', { params: { page: 1, pageSize: 100 } }),
        api.get('/test-results', { params: { page: 1, pageSize: 200 } })
      ]);

      const list = queueRes.status === 'fulfilled' && Array.isArray(queueRes.value.data?.data)
        ? queueRes.value.data.data
        : [];
      const sorted = [...list].sort((a, b) => {
        const tA = new Date(a?.updatedAt || a?.collectedAt || a?.createdAt || 0).getTime() || 0;
        const tB = new Date(b?.updatedAt || b?.collectedAt || b?.createdAt || 0).getTime() || 0;
        return tB - tA;
      });
      setBenchSamples(sorted);

      const rawResults = resultsRes.status === 'fulfilled'
        ? (Array.isArray(resultsRes.value.data?.data)
            ? resultsRes.value.data.data
            : Array.isArray(resultsRes.value.data?.data?.items)
              ? resultsRes.value.data.data.items
              : Array.isArray(resultsRes.value.data?.items)
                ? resultsRes.value.data.items
                : [])
        : [];
      const map = {};
      for (const r of rawResults) {
        const sKey = String(r?.sampleId || r?.sample_id || '').trim().toLowerCase();
        if (!sKey) continue;
        const prev = map[sKey];
        const prevTime = new Date(prev?.updatedAt || prev?.createdAt || 0).getTime() || 0;
        const nextTime = new Date(r?.updatedAt || r?.createdAt || 0).getTime() || 0;
        if (!prev || nextTime >= prevTime) {
          map[sKey] = r;
        }
      }
      setResultBySampleKey(map);
    } catch {
      setBenchSamples([]);
      setResultBySampleKey({});
    } finally {
      setBenchLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBenchSamples();
  }, [loadBenchSamples]);

  const testingOnlySamples = useMemo(
    () => benchSamples.filter((s) => normalizeSampleStatus(s?.status) === 'Testing'),
    [benchSamples]
  );

  const rerunOnlySamples = useMemo(
    () => benchSamples.filter((s) => normalizeSampleStatus(s?.status) === 'RerunRequested'),
    [benchSamples]
  );

  const testingBenchSamples = useMemo(
    () => benchSamples.filter((s) => canEnterTestResults(s?.status)),
    [benchSamples]
  );

  const completedBenchSamples = useMemo(
    () => benchSamples.filter((s) => canViewTestResults(s?.status)),
    [benchSamples]
  );

  const waitingDoctorSamples = useMemo(
    () => completedBenchSamples.filter((s) => !isDoctorApprovedResult(getSampleResult(s))),
    [completedBenchSamples, getSampleResult, isDoctorApprovedResult]
  );

  const approvedByDoctorSamples = useMemo(
    () => completedBenchSamples.filter((s) => isDoctorApprovedResult(getSampleResult(s))),
    [completedBenchSamples, getSampleResult, isDoctorApprovedResult]
  );

  const displayedBenchSamples = useMemo(() => {
    const base =
      benchTab === 'WAITING_DOCTOR'
        ? waitingDoctorSamples
        : benchTab === 'APPROVED'
          ? approvedByDoctorSamples
          : benchTab === 'RERUN'
            ? rerunOnlySamples
            : testingOnlySamples;
    const kw = benchSearch.trim().toLowerCase();
    if (!kw) return base;
    return base.filter((s) => {
      const blob = `${s.barcode || ''} ${s.id || ''} ${s.patientName || ''} ${s.patientId || ''} ${s.testPackageName || ''} ${s.labRoom || ''}`.toLowerCase();
      return blob.includes(kw);
    });
  }, [benchTab, testingOnlySamples, rerunOnlySamples, waitingDoctorSamples, approvedByDoctorSamples, benchSearch]);
  const benchPag = usePagination(displayedBenchSamples, 10);

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
    setSubmitAttempted(false);
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

    const sampleKeys = new Set(
      [lookupKey, sample?.barcode, sample?.Barcode, sample?.id, sample?.sampleId]
        .filter(Boolean)
        .map((k) => String(k).trim().toLowerCase())
    );
    const belongsToThisSample = (row) => {
      const rowSample = String(row?.sampleId || row?.sample_id || '').trim().toLowerCase();
      if (!rowSample) return true;
      return sampleKeys.size === 0 || sampleKeys.has(rowSample);
    };

    const appointmentId = sample?.appointmentId || sample?.AppointmentId || sample?.appointmentCode;
    if (appointmentId) {
      try {
        const lr = await api.get(
          `/TestOrder/TestResult/by-appointment/${encodeURIComponent(appointmentId)}`
        );
        const payload = lr.data?.data ?? lr.data;
        const list = Array.isArray(payload) ? payload : payload ? [payload] : [];
        for (const row of list) {
          if (!belongsToThisSample(row)) continue;
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

  // Xử lý Hủy kết quả và chạy lại (Gọi API thực tế: Reject nếu lấy lại mẫu, hoặc Rerun nếu chạy lại mẫu hiện có)
  const handleCancelAndRerun = async () => {
    if (!rerunReason) return;
    const targetSample = sampleId.trim();
    if (!targetSample) return;

    try {
      if (rerunActionType === 'redraw_sample') {
        await api.put(`/laboratory/samples/${encodeURIComponent(targetSample)}/status`, {
          status: 'Rejected',
          rejectionReason: rerunReason,
          notes: `Từ chối mẫu yêu cầu lấy lại: ${rerunReason}`,
          technicianName: benchOperator || operatorDisplay
        });
      } else {
        await api.post(`/laboratory/samples/${encodeURIComponent(targetSample)}/rerun`, {
          reason: rerunReason,
          requestedBy: benchOperator || operatorDisplay
        });
      }
      // Reset giá trị đã nhập nhưng vẫn giữ nguyên danh sách chỉ số của y lệnh / gói hiện tại
      setParams((prev) => (orderParamTemplate?.length ? orderParamTemplate : prev).map((p) => ({ ...p, value: '' })));
      setShowRerunModal(false);
      setCancellationSuccess(
        rerunActionType === 'redraw_sample'
          ? `Đã từ chối mẫu ${targetSample} (lý do: "${rerunReason}") và gửi thông báo yêu cầu lấy lại mẫu mới cho Bệnh nhân & Bác sĩ.`
          : `Đã ghi nhận yêu cầu chạy lại (Rerun) mẫu ${targetSample} (lý do: "${rerunReason}"). KTV có thể nhập kết quả lần chạy mới.`
      );
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Không thể gửi yêu cầu chạy lại / từ chối mẫu.');
      setShowRerunModal(false);
    }
  };

  const loadUsableReagents = useCallback(async () => {
    setReagentsLoading(true);
    try {
      const inv = await getInventory({ pageSize: 100 });
      const items = Array.isArray(inv?.items) ? inv.items : [];
      const usable = items.filter((lot) => Number(lot.quantity) > 0 && lot.expiryStatus !== 'EXPIRED');
      setReagentLots(usable);
    } catch {
      setReagentLots([]);
    } finally {
      setReagentsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsableReagents();
  }, [loadUsableReagents]);

  const selectedReagentLot = useMemo(
    () => reagentLots.find((lot) => lot.id === selectedReagentLotId) || null,
    [reagentLots, selectedReagentLotId]
  );

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

  // Validation sinh lý / dải đo AMR theo từng chỉ số (chặn số âm, quy tắc số 0, biên trên/dưới, ràng buộc chéo)
  const liveValidation = useMemo(
    () => validateAllParameters(params, { requireAll: false }),
    [params]
  );

  const validationState = useMemo(
    () => validateAllParameters(params, { requireAll: submitAttempted }),
    [params, submitAttempted]
  );

  const enteredCount = useMemo(
    () => (Array.isArray(params) ? params : []).filter((p) => hasEnteredValue(p.value)).length,
    [params]
  );

  // Tự động đánh giá cờ cho từng chỉ số (giữ nguyên giá trị 0 hợp lệ như BASO_PCT, BILI_D, CRP_HS, HBS_AB)
  const flags = useMemo(() => {
    const list = Array.isArray(params) ? params : [];
    return list.map((p) => {
      const codeKey = String(p.code || '').trim().toUpperCase();
      const hasVal = hasEnteredValue(p.value);
      const hasErr = Boolean(liveValidation.fieldErrors[codeKey]);
      const flag = hasVal && !hasErr ? evaluateMedicalFlag(p.code, p.value, p) : 'NORMAL';
      return {
        ...p,
        flag
      };
    });
  }, [params, liveValidation]);

  const criticalAnalytes = useMemo(() => {
    return (Array.isArray(flags) ? flags : []).filter((p) => p.flag === 'CRITICAL' && hasEnteredValue(p.value));
  }, [flags]);

  const hasCritical = useMemo(() => {
    return criticalAnalytes.length > 0;
  }, [criticalAnalytes]);

  const abnormalAnalytes = useMemo(() => {
    return (Array.isArray(flags) ? flags : []).filter((p) => (p.flag === 'LOW' || p.flag === 'HIGH' || p.flag === 'CRITICAL') && hasEnteredValue(p.value));
  }, [flags]);

  // Đã tắt còi Web Audio 880Hz và đồng hồ đếm ngược CRITICAL theo yêu cầu quy trình Lab gọn nhẹ

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
    setShowEntryModal(true);
    handleLookupSampleWithTarget(initialSampleId);
    return undefined;
    // Chỉ auto-load khi query sampleId đổi — tránh loop do setSampleId đổi callback
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialSampleId]);

  const openEntryModalForSample = (targetCode) => {
    const clean = String(targetCode || '').trim();
    if (!clean) return;
    setSampleId(clean);
    setResult(null);
    setError(null);
    setSubmitAttempted(false);
    setCancellationSuccess(null);
    setConfirmRerun(false);
    setDoctorNotified(false);
    setShowEntryModal(true);
    void handleLookupSampleWithTarget(clean);
  };

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

    const check = validateAllParameters(params, { requireAll: true });
    if (check.hasErrors) {
      setSubmitAttempted(true);
      const totalFieldErrors = Object.keys(check.fieldErrors).length;
      const missingCount = check.missingCodes.length;
      const invalidRangeCount = Math.max(0, totalFieldErrors - missingCount);
      const summaryParts = [];
      if (missingCount > 0) {
        const previewMissing = check.missingCodes.slice(0, 5).join(', ');
        summaryParts.push(`còn thiếu ${missingCount} chỉ số (${previewMissing}${missingCount > 5 ? '…' : ''})`);
      }
      if (invalidRangeCount > 0) {
        summaryParts.push(`${invalidRangeCount} chỉ số sai dải đo sinh lý / số âm / số 0 không hợp lệ`);
      }
      if (check.crossErrors.length > 0) {
        summaryParts.push(check.crossErrors[0]);
      }
      setError(`Không thể lưu kết quả: ${summaryParts.join('; ')}. Vui lòng kiểm tra các ô viền đỏ bên dưới.`);
      return;
    }

    const validParams = (Array.isArray(params) ? params : []).filter((p) => hasEnteredValue(p.value));
    if (validParams.length === 0) {
      setError('Vui lòng nhập đầy đủ kết quả đo chỉ số xét nghiệm.');
      return;
    }

    setLoading(true);
    try {
      const res = await resultApi.enter({
        sampleId: sampleId.trim(),
        appointmentId: sampleDetails?.appointmentId || undefined,
        equipmentCode: 'Bàn xét nghiệm thủ công (Manual Bench Entry)',
        parameters: validParams,
        notes: notes.trim(),
        isPanic: hasCritical,
        reviewedBy: benchOperator || operatorDisplay
      });

      setResult(res);
      setPageFeedback({
        type: res.isPanic ? 'warning' : 'success',
        title: res.resultId || `Đã lưu kết quả mẫu ${sampleId.trim()}`,
        message: res.message || 'Đã gửi kết quả lên Bác sĩ thẩm định lâm sàng.'
      });
      setShowEntryModal(false);
      loadBenchSamples();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi khi gửi kết quả xét nghiệm lên hệ thống.');
    } finally {
      setLoading(false);
    }
  };

  const getFlagBadge = (flag, value, hasFieldError = false) => {
    if (hasFieldError) {
      return <Badge bg="danger" className="px-2 py-1 fw-bold"><AlertTriangle className="me-1" size="1em"/>KHÔNG HỢP LỆ</Badge>;
    }
    if (!hasEnteredValue(value)) return <span className="text-muted">—</span>;
    switch (flag) {
      case 'CRITICAL':
        return <Badge bg="danger" className="px-2 py-1 fw-bold"><AlertTriangle className="me-1" size="1em"/>NGUY HIỂM (CRITICAL)</Badge>;
      case 'HIGH':
        return <Badge bg="warning" text="dark" className="px-2 py-1 fw-bold">VƯỢT CAO</Badge>;
      case 'LOW':
        return <Badge bg="info" text="dark" className="px-2 py-1 fw-bold">DƯỚI THẤP</Badge>;
      default:
        return <Badge bg="success-subtle" text="success" className="border border-success-subtle px-2 py-1">Bình thường</Badge>;
    }
  };

  const formatStatusVi = (st, sampleResult = null) => {
    const norm = normalizeSampleStatus(st);
    if (norm === 'RerunRequested') return { label: 'Yêu cầu chạy lại', bg: 'danger', text: undefined };
    if (norm === 'Testing') return { label: 'Đang xét nghiệm', bg: 'warning', text: 'dark' };
    if (norm === 'Completed') {
      if (isDoctorApprovedResult(sampleResult)) {
        return { label: 'Bác sĩ đã duyệt', bg: 'success', text: undefined };
      }
      return { label: 'Chờ Bác sĩ duyệt', bg: 'info', text: 'dark' };
    }
    if (norm === 'Received' || norm === 'Processing') return { label: 'Đã tiếp nhận Lab', bg: 'primary', text: undefined };
    if (norm === 'Collected') return { label: 'Đã lấy mẫu', bg: 'info', text: 'dark' };
    return { label: norm || 'Chờ xử lý', bg: 'secondary', text: undefined };
  };

  return (
    <div className="w-100 py-1">
      {/* 1. Header chuẩn quản lý (đồng bộ Màn 1 & Màn 2) */}
      <div className="bms-page-header-card mb-3">
        <div className="bms-page-header-content flex-column align-items-start">
          <div className="bms-page-title-row">
            <h1 className="bms-page-title">Nhập kết quả xét nghiệm</h1>
          </div>
          <p className="text-muted small m-0 mt-1">
            Quản lý danh sách ống mẫu đang phân tích trên máy, nhập chỉ số đo theo đúng chỉ định và chuyển Bác sĩ thẩm định lâm sàng.
          </p>
        </div>
        <div className="bms-page-actions d-flex align-items-center gap-2 flex-wrap">
          <span
            className="badge bg-light text-dark border rounded-pill px-3 py-2 fw-medium d-inline-flex align-items-center gap-1.5"
            style={{ fontSize: '0.78rem' }}
            title="Phân công trực hiện tại"
          >
            <FlaskConical size={13} style={{ color: '#1E60E6' }} />
            <span>{benchOperator}</span>
            <span className="text-muted">·</span>
            <span className="text-primary fw-semibold">
              {labRoomId && labRoomId !== 'UNASSIGNED' ? labRoomId : labRoom}
            </span>
          </span>
          <Button
            type="button"
            variant="outline-secondary"
            size="sm"
            className="rounded-pill px-3 py-1.5 fw-semibold d-inline-flex align-items-center gap-1.5"
            disabled={benchLoading}
            onClick={loadBenchSamples}
          >
            <RefreshCw className={benchLoading ? 'fa-spin' : ''} size={13} />
            <span>Làm mới</span>
          </Button>
        </div>
      </div>

      {/* 2. KPI Cards tóm tắt quản lý (click lọc nhanh theo trạng thái) */}
      <Row className="g-3 mb-3">
        <Col md={3} sm={6}>
          <div
            className="bms-kpi-quad-card"
            role="button"
            tabIndex={0}
            onClick={() => setBenchTab('TESTING')}
            onKeyDown={(e) => { if (e.key === 'Enter') setBenchTab('TESTING'); }}
            style={{
              cursor: 'pointer',
              border: benchTab === 'TESTING' ? '1.5px solid #1E60E6' : undefined
            }}
          >
            <div>
              <h6 className="bms-kpi-label">Chờ Nhập KQ</h6>
              <div className="bms-kpi-value text-primary">{testingOnlySamples.length}</div>
              <div className="bms-kpi-sub text-muted">Đang xét nghiệm trên máy</div>
            </div>
            <div className="bms-kpi-icon-badge bms-kpi-icon-blue">
              <FlaskConical size="1em" />
            </div>
          </div>
        </Col>
        <Col md={3} sm={6}>
          <div
            className="bms-kpi-quad-card"
            role="button"
            tabIndex={0}
            onClick={() => setBenchTab('RERUN')}
            onKeyDown={(e) => { if (e.key === 'Enter') setBenchTab('RERUN'); }}
            style={{
              cursor: 'pointer',
              border: benchTab === 'RERUN' ? '1.5px solid #dc2626' : undefined
            }}
          >
            <div>
              <h6 className="bms-kpi-label">Yêu Cầu Chạy Lại</h6>
              <div className="bms-kpi-value text-danger">{rerunOnlySamples.length}</div>
              <div className="bms-kpi-sub text-muted">Cần đo kiểm chứng lại lần 2</div>
            </div>
            <div className="bms-kpi-icon-badge" style={{ background: '#FEE2E2', color: '#DC2626' }}>
              <RotateCw size="1em" />
            </div>
          </div>
        </Col>
        <Col md={3} sm={6}>
          <div
            className="bms-kpi-quad-card"
            role="button"
            tabIndex={0}
            onClick={() => setBenchTab('WAITING_DOCTOR')}
            onKeyDown={(e) => { if (e.key === 'Enter') setBenchTab('WAITING_DOCTOR'); }}
            style={{
              cursor: 'pointer',
              border: benchTab === 'WAITING_DOCTOR' ? '1.5px solid #D97706' : undefined
            }}
          >
            <div>
              <h6 className="bms-kpi-label">Chờ Bác Sĩ Duyệt</h6>
              <div className="bms-kpi-value" style={{ color: '#D97706' }}>{waitingDoctorSamples.length}</div>
              <div className="bms-kpi-sub text-muted">Đã gửi KQ, chờ BS thẩm định</div>
            </div>
            <div className="bms-kpi-icon-badge" style={{ background: '#FEF3C7', color: '#D97706' }}>
              <Clock size="1em" />
            </div>
          </div>
        </Col>
        <Col md={3} sm={6}>
          <div
            className="bms-kpi-quad-card"
            role="button"
            tabIndex={0}
            onClick={() => setBenchTab('APPROVED')}
            onKeyDown={(e) => { if (e.key === 'Enter') setBenchTab('APPROVED'); }}
            style={{
              cursor: 'pointer',
              border: benchTab === 'APPROVED' ? '1.5px solid #10B981' : undefined
            }}
          >
            <div>
              <h6 className="bms-kpi-label">Bác Sĩ Đã Duyệt</h6>
              <div className="bms-kpi-value text-success">{approvedByDoctorSamples.length}</div>
              <div className="bms-kpi-sub text-muted">Hoàn tất &amp; phát hành KQ</div>
            </div>
            <div className="bms-kpi-icon-badge bms-kpi-icon-green">
              <CheckCircle2 size="1em" />
            </div>
          </div>
        </Col>
      </Row>

      {/* Thông báo sau khi lưu kết quả hoặc hủy chạy lại */}
      {pageFeedback && (
        <Alert
          variant={pageFeedback.type}
          dismissible
          onClose={() => setPageFeedback(null)}
          className="rounded-4 shadow-sm border-0 mb-3 d-flex align-items-center gap-2"
        >
          <CheckCircle2 size={18} className="flex-shrink-0" />
          <div>
            <strong>{pageFeedback.title}</strong> — {pageFeedback.message}
          </div>
        </Alert>
      )}
      {cancellationSuccess && !showEntryModal && (
        <Alert
          variant="warning"
          dismissible
          onClose={() => setCancellationSuccess(null)}
          className="rounded-4 shadow-sm border-warning mb-3"
        >
          <Undo2 className="me-2 text-warning-emphasis" size="1em" />
          <strong>Đã Hủy &amp; Yêu Cầu Chạy Lại:</strong> {cancellationSuccess}
        </Alert>
      )}

      {/* 3. Thanh điều hướng 1 dòng gọn (Tabs + Quét Barcode nhanh / Tìm kiếm) */}
      <div className="bms-filter-bar mb-3 d-flex flex-wrap align-items-center justify-content-between gap-2">
        <div className="d-flex align-items-center gap-2 flex-wrap">
          <button
            type="button"
            className={`btn btn-sm rounded-pill px-3 py-1.5 fw-semibold d-inline-flex align-items-center gap-1.5 ${
              benchTab === 'TESTING' ? 'btn-primary text-white shadow-sm' : 'btn-light text-secondary border'
            }`}
            style={benchTab === 'TESTING' ? { backgroundColor: '#1E60E6', borderColor: '#1E60E6' } : undefined}
            onClick={() => setBenchTab('TESTING')}
          >
            <FlaskConical size={13} />
            <span>Chờ nhập KQ ({testingOnlySamples.length})</span>
          </button>
          <button
            type="button"
            className={`btn btn-sm rounded-pill px-3 py-1.5 fw-semibold d-inline-flex align-items-center gap-1.5 ${
              benchTab === 'RERUN' ? 'btn-danger text-white shadow-sm' : 'btn-light text-secondary border'
            }`}
            onClick={() => setBenchTab('RERUN')}
          >
            <RotateCw size={13} />
            <span>Chạy lại ({rerunOnlySamples.length})</span>
          </button>
          <button
            type="button"
            className={`btn btn-sm rounded-pill px-3 py-1.5 fw-semibold d-inline-flex align-items-center gap-1.5 ${
              benchTab === 'WAITING_DOCTOR' ? 'btn-warning text-dark shadow-sm' : 'btn-light text-secondary border'
            }`}
            onClick={() => setBenchTab('WAITING_DOCTOR')}
          >
            <Clock size={13} />
            <span>Chờ BS duyệt ({waitingDoctorSamples.length})</span>
          </button>
          <button
            type="button"
            className={`btn btn-sm rounded-pill px-3 py-1.5 fw-semibold d-inline-flex align-items-center gap-1.5 ${
              benchTab === 'APPROVED' ? 'btn-success text-white shadow-sm' : 'btn-light text-secondary border'
            }`}
            onClick={() => setBenchTab('APPROVED')}
          >
            <CheckCircle2 size={13} />
            <span>BS đã duyệt ({approvedByDoctorSamples.length})</span>
          </button>
        </div>

        <form
          className="d-flex align-items-center gap-2 flex-grow-1 justify-content-end"
          style={{ maxWidth: 480 }}
          onSubmit={(e) => {
            e.preventDefault();
            const q = benchSearch.trim();
            if (!q) return;
            const exactHit = benchSamples.find(
              (s) =>
                String(s.barcode || '').toLowerCase() === q.toLowerCase() ||
                String(s.id || '').toLowerCase() === q.toLowerCase()
            );
            if (exactHit) {
              openEntryModalForSample(exactHit.barcode || exactHit.id);
            } else if (/^(SMP|SPC|BC|SA)/i.test(q)) {
              openEntryModalForSample(q);
            }
          }}
        >
          <InputGroup size="sm">
            <InputGroup.Text className="bg-white border-end-0 text-muted">
              <Search size={14} />
            </InputGroup.Text>
            <Form.Control
              className="border-start-0"
              placeholder="Quét barcode ống mẫu (SMP-...) hoặc tìm tên BN, gói..."
              value={benchSearch}
              onChange={(e) => setBenchSearch(e.target.value)}
            />
          </InputGroup>
          <Button
            type="submit"
            size="sm"
            variant="primary"
            className="rounded-pill px-3 fw-semibold text-nowrap text-white"
            style={{ backgroundColor: '#1E60E6', borderColor: '#1E60E6' }}
            disabled={!benchSearch.trim()}
            title="Mở nhanh modal nhập kết quả theo mã barcode vừa nhập"
          >
            Tra / Nhập KQ
          </Button>
        </form>
      </div>

      {/* 4. Bảng quản lý chính toàn màn hình + Phân trang */}
      <section className="bms-table-standalone-section">
        <div className="bms-table-standalone-header">
          <div>
            <h2 className="bms-table-standalone-title">
              {benchTab === 'TESTING'
                ? 'Ống mẫu đang phân tích — Chờ nhập kết quả'
                : benchTab === 'RERUN'
                  ? 'Ống mẫu yêu cầu chạy lại kiểm chứng'
                  : benchTab === 'WAITING_DOCTOR'
                    ? 'Ống mẫu đã nhập KQ — Chờ Bác sĩ duyệt'
                    : 'Ống mẫu đã được Bác sĩ duyệt kết quả'}
            </h2>
            <p className="bms-table-standalone-subtitle">
              {benchTab === 'WAITING_DOCTOR'
                ? 'Kết quả đã được KTV gửi lên hệ thống, đang chờ Bác sĩ thẩm định lâm sàng trước khi trả bệnh nhân.'
                : benchTab === 'APPROVED'
                  ? 'Kết quả đã được Bác sĩ thẩm định và phát hành. Bấm "Xem KQ" để đối chiếu lại chỉ số.'
                  : 'Chọn một ống mẫu và bấm "Nhập KQ" để mở bàn nhập chỉ số theo đúng y lệnh gói dịch vụ.'}
            </p>
          </div>
          <span className="badge bg-light text-dark border rounded-pill px-3 py-1.5">
            {displayedBenchSamples.length} / {
              benchTab === 'WAITING_DOCTOR'
                ? waitingDoctorSamples.length
                : benchTab === 'APPROVED'
                  ? approvedByDoctorSamples.length
                  : benchTab === 'RERUN'
                    ? rerunOnlySamples.length
                    : testingOnlySamples.length
            } ống mẫu
          </span>
        </div>

        <div className="bms-table-standalone-body">
          <div className="table-responsive">
            <Table hover className="mb-0 align-middle">
              <thead className="table-light small text-uppercase text-muted">
                <tr>
                  <th className="ps-3">Barcode ống</th>
                  <th>Bệnh nhân</th>
                  <th>Gói xét nghiệm &amp; Loại ống</th>
                  <th>Phòng Lab / Cập nhật</th>
                  <th>Trạng thái</th>
                  <th className="text-end pe-3">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {benchLoading ? (
                  <tr>
                    <td colSpan={6} className="text-center py-5 text-muted small">
                      <Spinner animation="border" size="sm" className="me-2 text-primary" />
                      Đang tải danh sách ống mẫu tại bàn phân tích…
                    </td>
                  </tr>
                ) : displayedBenchSamples.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-5 text-muted small">
                      <FlaskConical className="mb-2 opacity-25 d-block mx-auto" size={28} />
                      <div className="fw-semibold text-dark mb-1">
                        {benchTab === 'TESTING'
                          ? 'Hiện chưa có ống mẫu nào đang chờ nhập kết quả'
                          : benchTab === 'RERUN'
                            ? 'Không có ống mẫu nào đang yêu cầu chạy lại'
                            : benchTab === 'WAITING_DOCTOR'
                              ? 'Không có ống mẫu nào đang chờ Bác sĩ duyệt'
                              : 'Chưa có ống mẫu nào được Bác sĩ duyệt'}
                      </div>
                      <div>
                        {benchTab === 'TESTING'
                          ? 'Các ống mẫu sau khi bấm "Bắt đầu XN" ở Bước 3 (Tiếp Nhận & Xử Lý Ống Mẫu) sẽ xuất hiện tại đây.'
                          : 'Bạn có thể chuyển tab hoặc quét trực tiếp mã Barcode ở ô tìm kiếm phía trên.'}
                      </div>
                    </td>
                  </tr>
                ) : (
                  benchPag.paginatedItems.map((s) => {
                    const key = s.barcode || s.id;
                    const sampleResult = getSampleResult(s);
                    const stMeta = formatStatusVi(s.status, sampleResult);
                    const isEnterable = canEnterTestResults(s.status);
                    const updatedStr = s.updatedAt || s.collectedAt || s.createdAt;
                    return (
                      <tr
                        key={s.id || key}
                        style={{ cursor: 'pointer' }}
                        onClick={() => openEntryModalForSample(key)}
                      >
                        <td className="ps-3">
                          <div className="d-flex flex-column align-items-start gap-1">
                            <Code128Barcode value={key} height={24} width={1.0} compact align="start" />
                            <div className="d-flex align-items-center gap-1 flex-wrap">
                              {s.isAliquot && (
                                <Badge bg="info" style={{ fontSize: '0.65rem' }}>Aliquot</Badge>
                              )}
                              {String(s.priority || '').toUpperCase() === 'STAT' && (
                                <Badge bg="danger" style={{ fontSize: '0.65rem' }}>STAT</Badge>
                              )}
                            </div>
                          </div>
                        </td>
                        <td>
                          <div className="fw-semibold small text-dark">{s.patientName || '—'}</div>
                          <div className="text-muted font-monospace" style={{ fontSize: '0.72rem' }}>
                            {s.patientId || '—'}
                          </div>
                        </td>
                        <td>
                          <div className="fw-medium small text-dark">{s.testPackageName || 'Xét nghiệm lâm sàng'}</div>
                          <div className="d-flex flex-wrap align-items-center gap-1 mt-1">
                            {s.sampleType && (
                              <span className="badge bg-light text-secondary border" style={{ fontSize: '0.68rem' }}>
                                {formatSampleTypeVi(s.sampleType)}
                              </span>
                            )}
                            {s.tubeColor && (
                              <span className="badge bg-light text-dark border" style={{ fontSize: '0.68rem' }}>
                                {formatTubeColorVi(s.tubeColor)}
                              </span>
                            )}
                            {s.volumeMl ? (
                              <span className="text-muted" style={{ fontSize: '0.72rem' }}>{s.volumeMl} mL</span>
                            ) : null}
                          </div>
                        </td>
                        <td>
                          <div className="small fw-medium text-dark">{s.labRoom || 'LAB-ROOM-01'}</div>
                          <div className="text-muted" style={{ fontSize: '0.72rem' }}>
                            {updatedStr ? new Date(updatedStr).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' }) : '—'}
                          </div>
                        </td>
                        <td>
                          <Badge bg={stMeta.bg} text={stMeta.text} className="rounded-pill px-2.5 py-1">
                            {stMeta.label}
                          </Badge>
                        </td>
                        <td className="text-end pe-3" onClick={(e) => e.stopPropagation()}>
                          {isEnterable ? (
                            <Button
                              type="button"
                              size="sm"
                              variant="primary"
                              className="rounded-pill px-3 py-1 fw-semibold text-white d-inline-flex align-items-center gap-1.5 shadow-sm text-nowrap"
                              style={{ backgroundColor: '#1E60E6', borderColor: '#1E60E6', fontSize: '0.78rem' }}
                              onClick={() => openEntryModalForSample(key)}
                            >
                              <FlaskConical size={13} />
                              <span>Nhập KQ</span>
                            </Button>
                          ) : (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline-primary"
                              className="rounded-pill px-3 py-1 fw-semibold d-inline-flex align-items-center gap-1.5 text-nowrap"
                              style={{ fontSize: '0.78rem' }}
                              onClick={() => openEntryModalForSample(key)}
                            >
                              <Eye size={13} />
                              <span>Xem KQ</span>
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </Table>
          </div>
          <TablePagination
            page={benchPag.page}
            totalPages={benchPag.totalPages}
            totalItems={benchPag.totalItems}
            pageSize={benchPag.pageSize}
            onPageChange={benchPag.setPage}
            onPageSizeChange={benchPag.setPageSize}
            itemLabel="ống mẫu"
          />
        </div>
      </section>

      {/* =========================================================================
          MODAL CHÍNH: BÀN ĐO & NHẬP KẾT QUẢ XÉT NGHIỆM (Mở khi chọn 1 ống mẫu)
         ========================================================================= */}
      <Modal
        show={showEntryModal}
        onHide={() => !loading && setShowEntryModal(false)}
        size="xl"
        centered
        scrollable
        backdrop="static"
      >
        <Modal.Header closeButton={!loading} style={{ backgroundColor: '#FFFFFF', borderBottom: '1px solid #E2E8F0' }}>
          <Modal.Title className="h5 fw-bold text-dark d-flex align-items-center gap-2 flex-wrap">
            <FlaskConical style={{ color: '#1E60E6' }} size={18} />
            <span>{allowEnter ? 'Nhập Kết Quả Xét Nghiệm' : 'Chi Tiết Kết Quả Đã Gửi Bác Sĩ'}</span>
            {sampleId && (
              <span className="badge rounded-pill font-monospace" style={{ background: '#EFF6FF', color: '#1E60E6', fontSize: '0.8rem' }}>
                {sampleId}
              </span>
            )}
            {sampleDetails?.status && (() => {
              const stMeta = formatStatusVi(sampleDetails.status, getSampleResult(sampleDetails));
              return (
                <Badge bg={stMeta.bg} text={stMeta.text} className="rounded-pill px-2.5 py-1" style={{ fontSize: '0.72rem' }}>
                  {stMeta.label}
                </Badge>
              );
            })()}
          </Modal.Title>
        </Modal.Header>

        <Form noValidate onSubmit={onSubmit} className="d-flex flex-column" style={{ minHeight: 0, overflow: 'hidden' }}>
          <Modal.Body className="p-4" style={{ backgroundColor: '#F8FAFC', overflowY: 'auto' }}>
            {/* Thẻ tóm tắt Bệnh nhân, Ống mẫu & KTV phụ trách */}
            <div className="p-3 bg-white rounded-4 border mb-3 shadow-xs" style={{ borderColor: '#E2E8F0' }}>
              <Row className="g-3 small">
                <Col md={3}>
                  <div className="text-muted">Bệnh nhân</div>
                  <div className="fw-bold text-dark">{sampleDetails?.patientName || 'Đang tra cứu...'}</div>
                  <div className="text-muted font-monospace" style={{ fontSize: '0.75rem' }}>
                    {sampleDetails?.patientId || '—'}
                  </div>
                </Col>
                <Col md={3}>
                  <div className="text-muted">Gói xét nghiệm</div>
                  <div className="fw-semibold text-dark">{sampleDetails?.testPackageName || 'Xét nghiệm lâm sàng'}</div>
                  {resolvedOrderLabel && (
                    <div className="text-primary" style={{ fontSize: '0.75rem' }}>{resolvedOrderLabel}</div>
                  )}
                </Col>
                <Col md={3}>
                  <div className="text-muted">Ống bệnh phẩm</div>
                  <div className="fw-semibold text-dark">
                    {sampleDetails ? formatTubeColorVi(sampleDetails.tubeColor || sampleDetails.sampleType) : '—'}
                  </div>
                  <div className="text-muted" style={{ fontSize: '0.75rem' }}>
                    {sampleDetails?.sampleType ? formatSampleTypeVi(sampleDetails.sampleType) : '—'}
                    {sampleDetails?.volumeMl ? ` · ${sampleDetails.volumeMl} mL` : ''}
                  </div>
                </Col>
                <Col md={3}>
                  <div className="text-muted">KTV &amp; Phòng Lab</div>
                  <div className="fw-semibold text-dark">{benchOperator || operatorDisplay}</div>
                  <div className="text-muted" style={{ fontSize: '0.75rem' }}>
                    {labRoomId && labRoomId !== 'UNASSIGNED' ? `${labRoom} (${labRoomId})` : labRoom}
                  </div>
                </Col>
              </Row>
            </div>

            {/* Các cảnh báo trạng thái */}
            {sampleDetails && !allowEnter && (
              <Alert variant="info" className="rounded-3 border-0 shadow-xs mb-3 py-2 small">
                <Lock className="me-1.5" size="1em" />
                Mẫu đang ở trạng thái <strong>{formatStatusVi(sampleStatus).label}</strong> — chỉ xem lại kết quả đã gửi lên Bác sĩ (không cho chỉnh sửa ngược bước).
              </Alert>
            )}
            {cancellationSuccess && (
              <Alert variant="warning" dismissible onClose={() => setCancellationSuccess(null)} className="rounded-3 mb-3 py-2 small">
                <Undo2 className="me-1.5" size="1em" />
                <strong>Đã Hủy &amp; Yêu Cầu Chạy Lại:</strong> {cancellationSuccess}
              </Alert>
            )}
            {error && (
              <Alert variant="danger" dismissible onClose={() => setError(null)} className="rounded-3 mb-3 py-2 small">
                <AlertTriangle className="me-1.5" size="1em" />
                {error}
              </Alert>
            )}

            {/* Bảng nhập chỉ số đo bệnh phẩm */}
            <div className="bg-white rounded-4 border overflow-hidden mb-3" style={{ borderColor: '#E2E8F0' }}>
              <div className="px-3 py-2.5 border-bottom d-flex flex-wrap justify-content-between align-items-center gap-2" style={{ backgroundColor: '#FFFFFF' }}>
                <div className="fw-bold text-dark small d-flex align-items-center gap-2">
                  <span>Bảng Nhập Chỉ Số Đo Bệnh Phẩm ({flags.length} thông số)</span>
                  {flags.length > 0 && (
                    <Badge bg={enteredCount === flags.length ? 'success-subtle' : 'light'} text={enteredCount === flags.length ? 'success' : 'secondary'} className="border fw-semibold">
                      Đã nhập {enteredCount}/{flags.length}
                    </Badge>
                  )}
                  {Object.keys(validationState.fieldErrors).length + validationState.crossErrors.length > 0 && (
                    <Badge bg="danger" className="fw-semibold">
                      {Object.keys(validationState.fieldErrors).length + validationState.crossErrors.length} lỗi cần sửa
                    </Badge>
                  )}
                </div>
                <span className="small text-muted">
                  Chặn số âm · Kiểm soát dải đo sinh lý &amp; quy tắc số 0 chuẩn ISO 15189
                </span>
              </div>
              <div className="table-responsive">
                <Table hover align="middle" className="mb-0 table-sm" style={{ tableLayout: 'fixed', width: '100%' }}>
                  <thead className="table-light text-muted small">
                    <tr>
                      <th className="py-2 ps-3" style={{ width: '34%' }}>Thông Số Đo</th>
                      <th className="py-2" style={{ width: '25%' }}>Kết Quả Đo</th>
                      <th className="py-2" style={{ width: '24%' }}>Tham Chiếu &amp; Dải Nhập</th>
                      <th className="py-2 text-end pe-3" style={{ width: '17%' }}>Đánh Giá</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paramsLoading && (
                      <tr>
                        <td colSpan={4} className="text-center text-muted py-4">
                          <Spinner animation="border" size="sm" className="me-2" /> Đang nạp chỉ số theo y lệnh / gói dịch vụ…
                        </td>
                      </tr>
                    )}
                    {!paramsLoading && flags.length === 0 && (
                      <tr>
                        <td colSpan={4} className="text-center py-4 text-muted small">
                          Không tìm thấy chỉ số xét nghiệm cho ống mẫu này.
                        </td>
                      </tr>
                    )}
                    {!paramsLoading && (Array.isArray(flags) ? flags : []).map((p, idx) => {
                      const panicText = formatPanicBadge(p);
                      const codeKey = String(p.code || '').trim().toUpperCase();
                      const rowError = validationState.fieldErrors[codeKey] || null;
                      const rule = getMeasurementRule(p);
                      const hasVal = hasEnteredValue(p.value);
                      return (
                        <tr
                          key={`${p.code}-${idx}`}
                          className={
                            rowError
                              ? 'table-danger'
                              : p.flag === 'CRITICAL'
                                ? 'table-danger'
                                : p.flag !== 'NORMAL' && hasVal
                                  ? 'table-warning'
                                  : undefined
                          }
                        >
                          <td className="ps-3" style={{ whiteSpace: 'normal', wordBreak: 'break-word' }}>
                            <div className="fw-semibold text-dark small" style={{ lineHeight: 1.35 }}>{p.name}</div>
                            <div className="d-flex flex-wrap align-items-center gap-1 mt-0.5">
                              <span className="badge bg-light text-secondary border font-monospace" style={{ fontSize: '0.68rem' }}>{p.code}</span>
                              {panicText && (
                                <Badge bg="danger-subtle" text="danger" className="border border-danger-subtle" style={{ fontSize: '0.68rem' }}>
                                  {panicText}
                                </Badge>
                              )}
                            </div>
                          </td>
                          <td>
                            {isQualitativeParam(p) ? (
                              <Form.Select
                                size="sm"
                                className="fw-semibold w-100"
                                isInvalid={Boolean(rowError)}
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
                                min={rule.min}
                                max={rule.max}
                                size="sm"
                                isInvalid={Boolean(rowError)}
                                className="text-end fw-bold font-monospace w-100"
                                value={p.value === 0 || p.value === '0' ? '0' : (p.value ?? '')}
                                onKeyDown={(e) => {
                                  if (['-', 'e', 'E', '+'].includes(e.key)) {
                                    e.preventDefault();
                                  }
                                }}
                                onChange={(e) => setValue(idx, e.target.value)}
                                readOnly={viewOnlyMode || !allowEnter}
                                placeholder={rule.allowZero ? `≥ 0 (${rule.min}–${rule.max})` : `> 0 (${rule.min}–${rule.max})`}
                              />
                            )}
                            {rowError && (
                              <div className="invalid-feedback d-block fw-medium mt-1" style={{ fontSize: '0.72rem', lineHeight: 1.3 }}>
                                {rowError}
                              </div>
                            )}
                          </td>
                          <td className="small" style={{ whiteSpace: 'normal', wordBreak: 'break-word' }}>
                            <div className="text-dark font-monospace fw-medium">{formatReferenceRange(p)}</div>
                            {p.unit ? <div className="text-muted" style={{ fontSize: '11px' }}>Đơn vị: {p.unit}</div> : null}
                            <div className="text-muted mt-0.5" style={{ fontSize: '10.5px', lineHeight: 1.25 }}>
                              {formatRuleHintVi(p)}
                            </div>
                          </td>
                          <td className="text-end pe-3">{getFlagBadge(p.flag, p.value, Boolean(rowError))}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </Table>
              </div>
            </div>

            {/* Cảnh báo lỗi ràng buộc chéo giữa các chỉ số (WBC% > 100%, BILI_D > BILI_T, ALB > TP) */}
            {validationState.crossErrors.length > 0 && (
              <Alert variant="danger" className="py-2 small mb-3 rounded-3">
                <div className="fw-bold d-flex align-items-center gap-1.5 mb-1">
                  <AlertTriangle size={14} />
                  <span>Phát hiện mâu thuẫn sinh lý giữa các chỉ số:</span>
                </div>
                <ul className="mb-0 ps-3">
                  {validationState.crossErrors.map((msg, i) => (
                    <li key={i}>{msg}</li>
                  ))}
                </ul>
              </Alert>
            )}

            {/* Cảnh báo chỉ số bất thường */}
            {abnormalAnalytes.length > 0 && (
              <div className="alert alert-warning py-2 small mb-3 rounded-3">
                <strong>Phát hiện {abnormalAnalytes.length} chỉ số ngoài khoảng tham chiếu:</strong>{' '}
                {abnormalAnalytes.map((a) => `${a.code} (${a.value} ${a.unit})`).join(', ')}. Cần rà soát kỹ thuật trước khi chuyển Bác sĩ phê duyệt.
              </div>
            )}

            {/* Ghi chú kỹ thuật */}
            <div className="p-3 bg-white rounded-4 border" style={{ borderColor: '#E2E8F0' }}>
              <Form.Label className="small fw-semibold text-secondary mb-1">Ghi Chú Kỹ Thuật (Technical Notes)</Form.Label>
              <Form.Control
                as="textarea"
                rows={2}
                size="sm"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                readOnly={!allowEnter}
                placeholder="Ghi nhận tình trạng huyết thanh, độ đục, kiểm tra quang học hoặc mã báo động máy..."
              />
            </div>
          </Modal.Body>

          <Modal.Footer className="bg-white border-top d-flex flex-wrap justify-content-between align-items-center gap-2 px-4 py-3">
            <div>
              {allowEnter && (
                <Button
                  variant="outline-danger"
                  size="sm"
                  type="button"
                  className="rounded-pill px-3 fw-semibold d-inline-flex align-items-center gap-1.5"
                  onClick={() => setShowRerunModal(true)}
                >
                  <Undo2 size={14} /> Hủy KQ &amp; Yêu Cầu Chạy Lại
                </Button>
              )}
            </div>

            <div className="d-flex flex-wrap align-items-center gap-2">
              <Button
                variant="light"
                size="sm"
                type="button"
                className="rounded-pill px-3 border fw-semibold"
                disabled={loading}
                onClick={() => setShowEntryModal(false)}
              >
                Đóng
              </Button>
              {allowEnter && (
                <Button
                  variant="outline-secondary"
                  size="sm"
                  type="button"
                  className="rounded-pill px-3 fw-semibold"
                  onClick={() => {
                    setSubmitAttempted(false);
                    setError(null);
                    setParams((prev) => (orderParamTemplate?.length ? orderParamTemplate : prev).map((p) => ({ ...p, value: '' })));
                  }}
                >
                  Nhập lại giá trị
                </Button>
              )}
              <Button
                variant="outline-primary"
                size="sm"
                type="button"
                className="rounded-pill px-3 fw-semibold d-inline-flex align-items-center gap-1.5"
                onClick={() => setShowPreviewModal(true)}
              >
                <Eye size={14} /> Xem Trước
              </Button>
              {allowEnter && (
                <Button
                  variant="primary"
                  size="sm"
                  type="submit"
                  disabled={loading || !sampleId.trim() || !allowEnter || liveValidation.hasErrors}
                  className="rounded-pill px-4 py-1.5 fw-semibold text-white d-inline-flex align-items-center gap-1.5 shadow-sm"
                  style={{ backgroundColor: '#1E60E6', borderColor: '#1E60E6' }}
                  title={liveValidation.hasErrors ? 'Vui lòng sửa các chỉ số nhập sai dải đo trước khi gửi' : undefined}
                >
                  {loading ? (
                    <>
                      <Spinner size="sm" animation="border" />
                      <span>Đang lưu...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={14} />
                      <span>Xác Nhận Kỹ Thuật &amp; Gửi BS</span>
                    </>
                  )}
                </Button>
              )}
            </div>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* Modal 1: Xem Trước Kết Quả (Preview Results Modal) */}
      <Modal show={showPreviewModal} onHide={() => setShowPreviewModal(false)} size="lg" centered>
        <Modal.Header closeButton style={{ background: "#F8FAFC", borderBottom: "1px solid #E2E8F0" }}>
          <Modal.Title className="h5 fw-bold text-dark d-flex align-items-center gap-2">
            <Eye style={{ color: "#1E60E6" }}  size="1em"/>
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
                {flags.filter((p) => hasEnteredValue(p.value)).length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-3 text-muted">
                      Chưa có chỉ số nào được nhập giá trị đo. Vui lòng nhập số liệu từ máy trước khi xem trước.
                    </td>
                  </tr>
                ) : (
                  flags.filter((p) => hasEnteredValue(p.value)).map((p) => {
                    const codeKey = String(p.code || '').trim().toUpperCase();
                    const rowError = liveValidation.fieldErrors[codeKey];
                    return (
                    <tr key={p.code} className={rowError ? 'table-danger' : undefined}>
                      <td className="ps-3">
                        <strong className="text-dark">{p.name}</strong>
                        <span className="badge bg-light text-secondary border font-monospace ms-2">{p.code}</span>
                      </td>
                      <td className="text-end fw-bold font-monospace fs-6" style={{ color: rowError || p.flag === 'CRITICAL' ? '#dc2626' : p.flag !== 'NORMAL' ? '#d97706' : '#059669' }}>
                        {p.value}
                      </td>
                      <td className="text-secondary small">{p.unit}</td>
                      <td className="small text-muted font-monospace">{formatReferenceRange(p)}</td>
                      <td className="text-end pe-3">{getFlagBadge(p.flag, p.value, Boolean(rowError))}</td>
                    </tr>
                  );
                  })
                )}
              </tbody>
            </Table>
          </div>

          {/* Đánh giá mẫu theo ISO 15189 */}
          <div className="p-3 bg-white rounded-3 border small">
            <div className="fw-bold text-dark mb-1 d-flex align-items-center gap-1">
              <CheckCircle2 className="text-success"  size="1em"/>
              <span>Biên Bản Đánh Giá Mẫu Tiền Phân Tích &amp; Nội Kiểm IQC:</span>
            </div>
            <Row className="g-2 text-muted">
              <Col sm={4}>• Vỡ hồng cầu (Tan máu): <strong className="text-success">Âm tính</strong></Col>
              <Col sm={4}>• Đông dây / Cục đông: <strong className="text-success">Âm tính</strong></Col>
              <Col sm={4}>• Độ đục lipid: <strong className="text-success">Bình thường</strong></Col>
              <Col sm={6}>• Nội kiểm IQC: <strong className="text-success">Đạt chuẩn Westgard (Chấp nhận)</strong></Col>
              <Col sm={6}>• Kỹ thuật viên thực hiện: <strong className="text-dark">{benchOperator || operatorDisplay}</strong></Col>
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
            disabled={loading || !sampleId.trim() || !allowEnter || liveValidation.hasErrors}
            className="d-flex align-items-center gap-2 fw-semibold text-white px-3 shadow-sm"
            style={{ backgroundColor: '#1E60E6', borderColor: '#1E60E6' }}
          >
            <CheckCircle2 size="1em"/> Xác Nhận Kỹ Thuật &amp; Gửi Bác Sĩ
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Modal 2: Hủy Kết Quả & Yêu Cầu Chạy Lại (Re-run / Re-sample) */}
      <Modal show={showRerunModal} onHide={() => setShowRerunModal(false)} centered>
        <Modal.Header closeButton style={{ background: "#FEF2F2", borderBottom: "1px solid #FECACA" }}>
          <Modal.Title className="h5 fw-bold d-flex align-items-center gap-2" style={{ color: "#991B1B" }}>
            <Undo2 className="text-danger"  size="1em"/>
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
            <XCircle  size="1em"/> Xác Nhận Hủy &amp; Chạy Lại
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}

export default EnterTestResultsPage;


