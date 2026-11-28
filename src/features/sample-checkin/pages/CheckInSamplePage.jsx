/**
 * @file CheckInSamplePage.jsx
 * @description Tiếp nhận ống mẫu máu tại phòng xét nghiệm & quét mã vạch Barcode (UC41).
 * Tuân thủ: Tiêu chuẩn ISO 15189:2022, Clean Medical Standard (Rule 19) & AGENTS-CODE.md.
 */

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Barcode as LucideBarcode, CheckCircle2, AlertTriangle, TestTube2, X as LucideX, Search, ArrowLeftRight, Clock, MapPin, User, Loader2, ShieldCheck, RefreshCw, Lock, Eye, FlaskConical, Package } from 'lucide-react';
import TablePagination, { usePagination } from '../../../components/ui/TablePagination';
import { Modal } from 'react-bootstrap';
import { sampleApi } from '../api/sampleApi';
import api from '../../../config/api';
import { resolveDutyAssignment } from '../../../shared/workflow/dutyAssignment';
import { getStoredUser } from '../../../constants/roles';
import { canAliquotTube, canCreateAliquot, canReceiveSample, canStartTesting, normalizeSampleStatus, pathToTesting } from '../../../shared/workflow/sampleWorkflowGates';
import { formatTubeColorVi, formatSampleTypeVi, matchSuppliesFromInventory } from '../../../shared/workflow/labConsumables';
import { getInventory, consumeInventory } from '../../inventory/api/inventoryApi';
import Code128Barcode from '../../../shared/components/Code128Barcode';

const REJECTION_CODES = [
  { code: 'REJ-01', label: 'Tán huyết (Hemolysis) — Khóa phân tích & Lấy lại mẫu', isHemolysis: true },
  { code: 'REJ-02', label: 'Đông máu / Đông dây sợi huyết (Clotted)', isHemolysis: false },
  { code: 'REJ-03', label: 'Không đủ thể tích mẫu tối thiểu (Insufficient Volume)', isHemolysis: false },
  { code: 'REJ-04', label: 'Sai loại ống nghiệm / Sai chất chống đông (Wrong Container)', isHemolysis: false },
  { code: 'REJ-05', label: 'Rò rỉ / Nứt vỡ ống bệnh phẩm (Leakage / Broken)', isHemolysis: false },
];

const FALLBACK_LAB_ROOMS = [
  { id: 'LAB-ROOM-01', name: 'Bàn 01 • Phòng Xét Nghiệm Huyết Học' },
  { id: 'LAB-ROOM-02', name: 'Bàn 02 • Phòng Xét Nghiệm Hóa Sinh - Miễn Dịch' },
  { id: 'LAB-ROOM-03', name: 'Bàn 03 • Phòng Xét Nghiệm Vi Sinh' },
];

function findStaffMatch(list, { idOrCode, name } = {}) {
  if (!Array.isArray(list) || list.length === 0) return null;
  if (idOrCode) {
    const needle = String(idOrCode).trim().toLowerCase();
    const byKey = list.find((s) =>
      String(s.id || '').toLowerCase() === needle ||
      String(s.employeeCode || '').toLowerCase() === needle ||
      String(s.username || '').toLowerCase() === needle
    );
    if (byKey) return byKey;
  }
  if (name) {
    const cleanName = String(name).split('(')[0].trim().toLowerCase();
    const fullNeedle = String(name).trim().toLowerCase();
    const byName = list.find((s) => {
      const fn = String(s.fullName || '').trim().toLowerCase();
      return fn === fullNeedle || fn === cleanName;
    });
    if (byName) return byName;
  }
  return null;
}

function formatSampleStatusVi(status) {
  const map = {
    PendingCollection: { label: 'Chờ lấy mẫu', cls: 'bg-warning-subtle text-warning-emphasis border-warning-subtle' },
    Collected: { label: 'Đã lấy mẫu', cls: 'bg-info-subtle text-info-emphasis border-info-subtle' },
    InTransit: { label: 'Đang vận chuyển', cls: 'bg-primary-subtle text-primary border-primary-subtle' },
    Received: { label: 'Đã tiếp nhận Lab', cls: 'bg-success-subtle text-success border-success-subtle' },
    Processing: { label: 'Đang xử lý', cls: 'bg-primary-subtle text-primary border-primary-subtle' },
    Testing: { label: 'Đang xét nghiệm', cls: 'bg-primary-subtle text-primary border-primary-subtle' },
    Completed: { label: 'Hoàn tất phân tích', cls: 'bg-success-subtle text-success border-success-subtle' },
    Rejected: { label: 'Đã từ chối mẫu', cls: 'bg-danger-subtle text-danger border-danger-subtle' },
  };
  return map[status] || { label: status || '—', cls: 'bg-secondary-subtle text-secondary border' };
}

function formatStaffOption(s) {
  const code = s.employeeCode || s.username || s.id;
  const parts = [s.fullName];
  if (code) parts.push(`(${code})`);
  if (s.department) parts.push(`— ${s.department}`);
  return parts.join(' ');
}

export function CheckInSamplePage({ labRoomId = '', technicianName: initialTechName = '' } = {}) {
  const [searchParams] = useSearchParams();
  const initialQueryCode = (searchParams.get('code') || searchParams.get('sampleId') || '').trim();
  const currentUser = useMemo(() => {
    try { return getStoredUser(); } catch { return null; }
  }, []);

  const [labRooms, setLabRooms] = useState(FALLBACK_LAB_ROOMS);
  const [selectedRoom, setSelectedRoom] = useState(labRoomId || FALLBACK_LAB_ROOMS[0].id);
  const [roomLabel, setRoomLabel] = useState('Đang tải phòng phân công…');
  const [technicianName, setTechnicianName] = useState(
    initialTechName || currentUser?.fullName || currentUser?.name || 'KTV đang đăng nhập'
  );
  const [staffOptions, setStaffOptions] = useState([]);
  const [staffLoading, setStaffLoading] = useState(false);
  const [handoverStaffId, setHandoverStaffId] = useState('');
  const [receiverTechId, setReceiverTechId] = useState('');
  const [code, setCode] = useState('');
  const [activeTab, setActiveTab] = useState('PENDING');
  const [showCheckInModal, setShowCheckInModal] = useState(false);
  const [showRejectBox, setShowRejectBox] = useState(false);
  const [pending, setPending] = useState([]);
  const [receivedSamples, setReceivedSamples] = useState([]);
  const [receivedLoading, setReceivedLoading] = useState(false);
  const [actionBusyId, setActionBusyId] = useState('');
  const [current, setCurrent] = useState(null);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [rejectCode, setRejectCode] = useState('');
  const [rejectNote, setRejectNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [lookupLoading, setLookupLoading] = useState(false);

  const [checks, setChecks] = useState({
    idMatch: false,
    intact: false,
    tubeOk: false,
    labeled: false,
  });

  const [handoverNote, setHandoverNote] = useState('Ống mẫu nguyên vẹn, vận chuyển đạt chuẩn nhiệt độ SOP.');
  const [receiveTime, setReceiveTime] = useState(() => new Date().toLocaleString('vi-VN'));
  const [listFilter, setListFilter] = useState('');
  const [pendingLoading, setPendingLoading] = useState(false);
  const [detailSample, setDetailSample] = useState(null);
  const [detailOrderInfo, setDetailOrderInfo] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const [inventoryItems, setInventoryItems] = useState([]);
  const [inventoryLoading, setInventoryLoading] = useState(false);
  const [selectedSupplies, setSelectedSupplies] = useState([]);

  const loadInventorySupplies = useCallback(async () => {
    setInventoryLoading(true);
    try {
      const data = await getInventory({ page: 1, pageSize: 100 });
      const list = Array.isArray(data?.items) ? data.items : (Array.isArray(data) ? data : []);
      setInventoryItems(list);
      return list;
    } catch {
      return [];
    } finally {
      setInventoryLoading(false);
    }
  }, []);

  const syncSuppliesForSample = useCallback((sample, sourceInventory) => {
    const inv = Array.isArray(sourceInventory) && sourceInventory.length > 0 ? sourceInventory : inventoryItems;
    const { recommended } = matchSuppliesFromInventory(
      inv,
      sample?.testPackageName || sample?.packageName || '',
      sample?.tubeColor || sample?.sampleType || '',
      'ANALYSIS'
    );
    setSelectedSupplies(
      recommended.map((item) => ({
        id: item.id,
        code: item.code,
        name: item.name,
        lotNumber: item.lotNumber,
        unit: item.unit,
        stock: Number(item.quantity || 0),
        quantity: 1,
        checked: true,
      }))
    );
  }, [inventoryItems]);

  useEffect(() => {
    const tick = setInterval(() => {
      setReceiveTime(new Date().toLocaleString('vi-VN'));
    }, 1000);
    return () => clearInterval(tick);
  }, []);

  const openSampleDetail = async (sample) => {
    setDetailSample(sample);
    setDetailOrderInfo(null);
    const orderKey = sample?.testOrderId || sample?.orderNumber;
    if (!orderKey) return;
    setDetailLoading(true);
    try {
      const res = await api.get(`/testorders/${encodeURIComponent(orderKey)}`).catch(() => null);
      const data = res?.data?.data || res?.data || null;
      if (data && (data.orderNumber || data.doctorName || data.icd10Codes)) {
        setDetailOrderInfo(data);
      }
    } finally {
      setDetailLoading(false);
    }
  };

  const labTechOptions = useMemo(() => {
    const labOnly = staffOptions.filter((s) => s.role === 'Lab' || s.role === 'Manager');
    return labOnly.length > 0 ? labOnly : staffOptions;
  }, [staffOptions]);

  const loadReceivedSamples = useCallback(async () => {
    setReceivedLoading(true);
    try {
      const res = await api.get('/laboratory/samples/queue', { params: { page: 1, pageSize: 100 } });
      const list = Array.isArray(res.data?.data) ? res.data.data : [];
      const ready = list
        .filter((s) => canStartTesting(s?.status))
        .sort((a, b) => {
          const tA = new Date(a?.updatedAt || a?.receivedAt || a?.collectedAt || 0).getTime() || 0;
          const tB = new Date(b?.updatedAt || b?.receivedAt || b?.collectedAt || 0).getTime() || 0;
          return tB - tA;
        });
      setReceivedSamples(ready);
    } catch {
      setReceivedSamples([]);
    } finally {
      setReceivedLoading(false);
    }
  }, []);

  const loadPending = useCallback(async () => {
    setPendingLoading(true);
    try {
      const data = await sampleApi.pending();
      const sortedPending = (Array.isArray(data) ? [...data] : []).sort((a, b) => {
        const tA = new Date(a?.updatedAt || a?.collectedAt || a?.createdAt || 0).getTime() || 0;
        const tB = new Date(b?.updatedAt || b?.collectedAt || b?.createdAt || 0).getTime() || 0;
        return tB - tA;
      });
      setPending(sortedPending);
    } catch {
      setPending([]);
    } finally {
      setPendingLoading(false);
    }
  }, []);

  const handleCreateAliquot = async (sample) => {
    if (!sample?.id || !canCreateAliquot(sample.status)) return;
    setError(null);
    setSuccess(null);
    setActionBusyId(`aliquot:${sample.id}`);
    try {
      const res = await api.post(`/laboratory/samples/${encodeURIComponent(sample.id)}/aliquot`, {
        volumeMl: 1.0,
        targetLabRoom: selectedRoom || sample.labRoom || 'LAB-ROOM-01',
        notes: `Chiết mẫu phụ từ ống gốc ${sample.barcode || sample.id}`
      });
      const created = res.data?.data;
      setSuccess(
        res.data?.message ||
        `Đã chiết mẫu phụ (Aliquot) ${created?.barcode || ''} từ ống gốc ${sample.barcode || sample.id}.`
      );
      await loadReceivedSamples();
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Không thể chiết mẫu phụ (Aliquot).');
    } finally {
      setActionBusyId('');
    }
  };

  const handleStartTesting = async (sample) => {
    const steps = pathToTesting(sample?.status);
    if (!sample?.id || !steps || steps.length === 0) {
      setError('Chỉ có thể bấm Bắt đầu XN đối với ống mẫu đã tiếp nhận Lab (Received / Processing).');
      return;
    }
    setError(null);
    setSuccess(null);
    setActionBusyId(`testing:${sample.id}`);
    try {
      for (const nextStatus of steps) {
        await api.put(`/laboratory/samples/${encodeURIComponent(sample.id)}/status`, {
          status: nextStatus,
          technicianId: selectedReceiverStaff?.employeeCode || selectedReceiverStaff?.id || currentUser?.employeeCode || currentUser?.id,
          technicianName: selectedReceiverStaff?.fullName || technicianName || currentUser?.fullName || currentUser?.name,
          labRoom: selectedRoom || sample.labRoom || 'LAB-ROOM-01',
          timestamp: new Date().toISOString(),
          notes: `Bắt đầu phân tích trên máy xét nghiệm (${nextStatus})`
        });
      }
      setSuccess(`Ống mẫu ${sample.barcode || sample.id} đã chuyển sang Đang xét nghiệm (Testing). Vui lòng sang Bước 4 (Nhập Kết Quả Xét Nghiệm) sau khi có kết quả từ máy phân tích.`);
      await loadReceivedSamples();
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Không thể chuyển ống mẫu sang Đang xét nghiệm.');
    } finally {
      setActionBusyId('');
    }
  };

  const loadLookups = useCallback(async () => {
    setStaffLoading(true);
    try {
      const [staffList, roomsList] = await Promise.all([
        sampleApi.getStaff(),
        sampleApi.getLabRooms()
      ]);

      if (Array.isArray(roomsList) && roomsList.length > 0) {
        const normalizedRooms = roomsList.map((r) => ({
          id: r.id || r.roomCode,
          name: r.name ? `${r.roomCode || r.id} • ${r.name}` : (r.id || r.roomCode)
        }));
        setLabRooms(normalizedRooms);
        setSelectedRoom((prev) => {
          if (labRoomId && normalizedRooms.some((r) => r.id === labRoomId)) return labRoomId;
          if (normalizedRooms.some((r) => r.id === prev)) return prev;
          return normalizedRooms[0].id;
        });
      }

      if (Array.isArray(staffList) && staffList.length > 0) {
        setStaffOptions(staffList);

        const labCandidates = staffList.filter((s) => s.role === 'Lab' || s.role === 'Manager');
        const receiverPool = labCandidates.length > 0 ? labCandidates : staffList;

        const defaultReceiver =
          findStaffMatch(receiverPool, {
            idOrCode: currentUser?.id || currentUser?.employeeCode || currentUser?.username,
            name: technicianName || currentUser?.fullName || currentUser?.name
          }) || receiverPool[0];

        const defaultHandover =
          staffList.find((s) => s.role === 'Receptionist') ||
          staffList.find((s) => s.id !== defaultReceiver?.id) ||
          staffList[0];

        if (defaultReceiver) {
          setReceiverTechId((prev) => prev || defaultReceiver.id);
        }
        if (defaultHandover) {
          setHandoverStaffId((prev) => prev || defaultHandover.id);
        }
      }
    } finally {
      setStaffLoading(false);
    }
  }, [currentUser, labRoomId, technicianName]);

  const openCheckInModal = (p) => {
    const key = p.barcode || p.sampleId || p.id || '';
    setCode(key);
    setCurrent(p);
    setError(null);
    setSuccess(null);
    setRejectCode('');
    setRejectNote('');
    setShowRejectBox(false);
    setChecks({ idMatch: false, intact: false, tubeOk: false, labeled: false });
    setShowCheckInModal(true);
    if (inventoryItems.length > 0) {
      syncSuppliesForSample(p, inventoryItems);
    } else {
      loadInventorySupplies().then((list) => syncSuppliesForSample(p, list));
    }
  };

  useEffect(() => {
    loadPending();
    loadReceivedSamples();
    loadLookups();
    loadInventorySupplies();
  }, [loadPending, loadReceivedSamples, loadLookups, loadInventorySupplies]);

  useEffect(() => {
    if (!initialQueryCode) return;
    let active = true;
    setCode(initialQueryCode);
    setLookupLoading(true);
    setError(null);
    setSuccess(null);
    setChecks({ idMatch: false, intact: false, tubeOk: false, labeled: false });
    sampleApi
      .lookup(initialQueryCode)
      .then((s) => {
        if (!active || !s) return;
        const st = normalizeSampleStatus(s.status);
        if (st === 'PendingCollection') {
          setError('Mẫu đang ở trạng thái Chờ lấy mẫu (PendingCollection). Vui lòng thực hiện Bước 2 (Lấy Mẫu) trước khi Tiếp nhận Lab.');
        } else if (canReceiveSample(st)) {
          setCurrent(s);
          setActiveTab('PENDING');
          setShowCheckInModal(true);
        } else if (canStartTesting(st)) {
          setActiveTab('RECEIVED');
          setListFilter(initialQueryCode);
        } else {
          setError(`Ống mẫu ${s.barcode || initialQueryCode} đang ở trạng thái "${formatSampleStatusVi(s.status).label}".`);
        }
      })
      .catch((e) => {
        if (active) setError(e instanceof Error ? e.message : 'Không thể tìm thấy mẫu bệnh phẩm.');
      })
      .finally(() => {
        if (active) setLookupLoading(false);
      });
    return () => { active = false; };
  }, [initialQueryCode]);

  useEffect(() => {
    if (!current || staffOptions.length === 0) return;

    const matchedHandover =
      findStaffMatch(staffOptions, { idOrCode: current.handoverById, name: current.handoverBy }) ||
      findStaffMatch(staffOptions, { idOrCode: current.collectedBy, name: current.collectorName });
    if (matchedHandover) {
      setHandoverStaffId(matchedHandover.id);
    }

    const matchedReceiver = findStaffMatch(labTechOptions, {
      idOrCode: current.receivedBy || current.assignedTechnicianId,
      name: current.assignedTechnicianName
    });
    if (matchedReceiver) {
      setReceiverTechId(matchedReceiver.id);
    }
  }, [current, staffOptions, labTechOptions]);

  const selectedHandoverStaff = useMemo(
    () => staffOptions.find((s) => s.id === handoverStaffId) || null,
    [staffOptions, handoverStaffId]
  );

  const selectedReceiverStaff = useMemo(
    () => labTechOptions.find((s) => s.id === receiverTechId) || staffOptions.find((s) => s.id === receiverTechId) || null,
    [labTechOptions, staffOptions, receiverTechId]
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const duty = await resolveDutyAssignment();
      if (cancelled) return;
      if (duty.roomId && duty.roomId !== 'UNASSIGNED') {
        setSelectedRoom(duty.roomId);
      }
      setRoomLabel(duty.roomName);
      if (duty.technicianName) setTechnicianName(duty.technicianName);
    })();
    return () => { cancelled = true; };
  }, []);

  const onLookup = async () => {
    const trimmed = listFilter.trim() || code.trim();
    if (!trimmed) {
      setError('Vui lòng quét mã vạch hoặc nhập mã ống mẫu để tra cứu.');
      return;
    }
    setError(null);
    setSuccess(null);
    setLookupLoading(true);

    try {
      const s = await sampleApi.lookup(trimmed);
      const st = normalizeSampleStatus(s?.status);
      if (st === 'PendingCollection') {
        setError(`Mẫu ${s.barcode || trimmed} đang ở trạng thái Chờ lấy mẫu. Vui lòng thực hiện Bước 2 (Lấy Mẫu) trước.`);
      } else if (canReceiveSample(st)) {
        openCheckInModal(s);
      } else if (canStartTesting(st)) {
        setActiveTab('RECEIVED');
        setListFilter(s.barcode || trimmed);
        setSuccess(`Ống mẫu ${s.barcode || trimmed} đã tiếp nhận Lab — bấm Bắt đầu XN bên dưới để chuyển sang Bước 4 (Nhập kết quả).`);
      } else {
        setError(`Ống mẫu ${s?.barcode || trimmed} hiện đang ở trạng thái "${formatSampleStatusVi(s?.status).label}".`);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không thể tìm thấy mẫu bệnh phẩm.');
    } finally {
      setLookupLoading(false);
    }
  };

  const isHemolysisSelected = useMemo(() => {
    const selected = REJECTION_CODES.find(r => r.code === rejectCode);
    return selected?.isHemolysis || /tán huyết|hemol/i.test(rejectNote);
  }, [rejectCode, rejectNote]);

  const onCheckIn = async (reject = false) => {
    setError(null);
    setSuccess(null);

    if (!reject && current && !canReceiveSample(current.status)) {
      setError('Chỉ được tiếp nhận các ống mẫu đã hoàn tất Bước 2 (Đã lấy mẫu / Đang vận chuyển). Vui lòng thực hiện Lấy Mẫu tại Hàng Đợi & Lấy Mẫu trước.');
      return;
    }

    const targetCode =
      current?.id ||
      current?.sampleId ||
      code.trim() ||
      current?.barcode ||
      '';

    if (!targetCode) {
      setError('Không có mã mẫu bệnh phẩm để thực hiện thao tác.');
      return;
    }

    const handoverDisplay = selectedHandoverStaff
      ? `${selectedHandoverStaff.fullName}${selectedHandoverStaff.department ? ` (${selectedHandoverStaff.department})` : ''}`
      : undefined;

    const checkedSupplies = selectedSupplies.filter((s) => s.checked && Number(s.quantity) > 0);
    if (!reject && checkedSupplies.length === 0) {
      setError('Vui lòng xác nhận ít nhất 1 vật tư y tế / hóa chất sử dụng cho gói xét nghiệm này (ISO 15189).');
      return;
    }

    setLoading(true);
    try {
      let consumedSummaryText = '';
      if (!reject && checkedSupplies.length > 0) {
        const consumeRes = await consumeInventory({
          sampleId: current?.barcode || targetCode,
          testPackageCode: current?.testPackageName || '',
          stage: 'Tiếp nhận & Chuẩn bị xét nghiệm Lab',
          notes: handoverNote,
          items: checkedSupplies.map((s) => ({
            reagentId: s.id,
            quantity: Number(s.quantity) || 1
          }))
        });
        const consumedList = Array.isArray(consumeRes?.data) ? consumeRes.data : [];
        if (consumedList.length > 0) {
          consumedSummaryText = ` | Vật tư đã xuất kho: ${consumedList.map((c) => `${c.code} (${c.lotNumber}) x${c.consumedQuantity} ${c.unit}`).join(', ')}`;
        }
        loadInventorySupplies();
      }

      const res = await sampleApi.checkIn({
        code: targetCode,
        labRoomId: selectedRoom,
        rejectionCode: reject ? rejectCode : undefined,
        rejectionNote: reject ? rejectNote : undefined,
        notes: `${handoverNote}${consumedSummaryText}`,
        technicianId: selectedReceiverStaff?.employeeCode || selectedReceiverStaff?.id || currentUser?.employeeCode || currentUser?.id,
        technicianName: selectedReceiverStaff?.fullName || technicianName || currentUser?.fullName || currentUser?.name,
        handoverById: selectedHandoverStaff?.employeeCode || selectedHandoverStaff?.id,
        handoverBy: handoverDisplay
      });

      if (reject) {
        let msg = `Đã từ chối tiếp nhận mẫu ${current?.barcode || targetCode} với lý do: ${rejectCode}`;
        if (isHemolysisSelected) {
          msg += ' — [Đã khóa phân tích và chuyển yêu cầu lấy lại mẫu]';
        }
        setSuccess(msg);
      } else {
        setSuccess(`Đã tiếp nhận ống mẫu ${current?.barcode || targetCode} vào Phòng Lab (Received) & xuất ${checkedSupplies.length} vật tư y tế từ kho.`);
        setActiveTab('RECEIVED');
      }

      setShowCheckInModal(false);
      setShowRejectBox(false);
      setCurrent(res);
      setCode('');
      setRejectCode('');
      setRejectNote('');
      await Promise.all([loadPending(), loadReceivedSamples()]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Thao tác tiếp nhận mẫu thất bại.');
    } finally {
      setLoading(false);
    }
  };

  const canReceive =
    Boolean(current) &&
    canReceiveSample(current.status) &&
    checks.idMatch &&
    checks.intact &&
    checks.tubeOk &&
    checks.labeled;

  const safePending = (Array.isArray(pending) ? pending : []).filter((p) => canReceiveSample(p?.status));
  const filteredPending = useMemo(() => {
    const q = listFilter.trim().toLowerCase();
    if (!q) return safePending;
    return safePending.filter((p) => {
      const blob = `${p.barcode || ''} ${p.patientName || ''} ${p.patientId || ''} ${p.tubeColor || ''} ${p.testPackageName || ''} ${p.status || ''}`.toLowerCase();
      return blob.includes(q);
    });
  }, [safePending, listFilter]);

  const filteredReceived = useMemo(() => {
    const q = listFilter.trim().toLowerCase();
    if (!q) return receivedSamples;
    return receivedSamples.filter((s) => {
      const blob = `${s.barcode || ''} ${s.id || ''} ${s.patientName || ''} ${s.patientId || ''} ${s.tubeColor || ''} ${s.testPackageName || ''} ${s.status || ''}`.toLowerCase();
      return blob.includes(q);
    });
  }, [receivedSamples, listFilter]);

  const pendingPag = usePagination(filteredPending, 10);
  const receivedPag = usePagination(filteredReceived, 10);

  const displayRoomName = useMemo(() => {
    const matched = labRooms.find((r) => r.id === selectedRoom);
    if (roomLabel && roomLabel !== 'Đang tải phòng phân công…') {
      return selectedRoom && !roomLabel.includes(selectedRoom)
        ? `${selectedRoom} — ${roomLabel}`
        : roomLabel;
    }
    return matched ? matched.name : (selectedRoom || 'Phòng Lab');
  }, [labRooms, selectedRoom, roomLabel]);

  const displayTechName = selectedReceiverStaff
    ? formatStaffOption(selectedReceiverStaff)
    : (technicianName || currentUser?.fullName || 'KTV đang trực ca');

  return (
    <div className="w-100 py-1">

      <div className="bms-page-header-card mb-3">
        <div className="bms-page-header-content flex-column align-items-start">
          <div className="bms-page-title-row">
            <h1 className="bms-page-title">Tiếp nhận &amp; Xử lý ống mẫu</h1>
          </div>
          <p className="text-muted small m-0 mt-1">
            <strong>{displayRoomName}</strong> · KTV phụ trách: <strong>{displayTechName}</strong> · <span className="font-monospace">{receiveTime}</span>
          </p>
        </div>
        <div className="bms-page-actions">
          <button
            type="button"
            className="btn btn-outline-secondary btn-sm rounded-pill px-3 d-inline-flex align-items-center gap-1.5 text-nowrap"
            onClick={() => void Promise.all([loadPending(), loadReceivedSamples()])}
            disabled={pendingLoading || receivedLoading}
          >
            <RefreshCw className={pendingLoading || receivedLoading ? 'fa-spin' : ''} size={13} />
            <span>Làm mới</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="alert alert-danger border-0 shadow-sm d-flex align-items-center justify-content-between py-2.5 px-3 mb-3 rounded-3 small">
          <div className="d-flex align-items-center gap-2">
            <AlertTriangle className="text-danger flex-shrink-0" size={16} />
            <div>{error}</div>
          </div>
          <button type="button" className="btn-close" onClick={() => setError(null)}></button>
        </div>
      )}

      {success && (
        <div className="alert alert-success border-0 shadow-sm d-flex align-items-center justify-content-between py-2.5 px-3 mb-3 rounded-3 small">
          <div className="d-flex align-items-center gap-2">
            <CheckCircle2 className="text-success flex-shrink-0" size={16} />
            <div className="fw-medium">{success}</div>
          </div>
          <button type="button" className="btn-close" onClick={() => setSuccess(null)}></button>
        </div>
      )}

      <div className="bms-filter-bar mb-3 flex-wrap">
        <div className="d-flex align-items-center gap-1.5 flex-wrap">
          <button
            type="button"
            onClick={() => setActiveTab('PENDING')}
            className="btn btn-sm rounded-pill px-3 fw-semibold d-inline-flex align-items-center gap-1.5"
            style={{
              fontSize: '0.8rem',
              backgroundColor: activeTab === 'PENDING' ? '#1E60E6' : '#EEF2F6',
              color: activeTab === 'PENDING' ? '#FFFFFF' : '#475569',
              border: 'none'
            }}
          >
            <TestTube2 size={14} />
            <span>Chờ tiếp nhận Lab ({safePending.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('RECEIVED')}
            className="btn btn-sm rounded-pill px-3 fw-semibold d-inline-flex align-items-center gap-1.5"
            style={{
              fontSize: '0.8rem',
              backgroundColor: activeTab === 'RECEIVED' ? '#1E60E6' : '#EEF2F6',
              color: activeTab === 'RECEIVED' ? '#FFFFFF' : '#475569',
              border: 'none'
            }}
          >
            <FlaskConical size={14} />
            <span>Đã tiếp nhận — Sẵn sàng XN ({receivedSamples.length})</span>
          </button>
        </div>

        <div className="bms-search-input-pill flex-grow-1" style={{ minWidth: 260 }}>
          <Search className="bms-search-icon" size="1em" />
          <input
            type="text"
            placeholder="Quét barcode ống mẫu hoặc lọc theo tên bệnh nhân, mã mẫu..."
            value={listFilter}
            onChange={(e) => setListFilter(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && listFilter.trim()) {
                e.preventDefault();
                void onLookup();
              }
            }}
          />
          {listFilter && (
            <button type="button" className="bms-search-clear" onClick={() => setListFilter('')}>
              <LucideX size={12} />
            </button>
          )}
        </div>

        <button
          type="button"
          className="btn btn-sm btn-primary rounded-pill px-3 fw-semibold d-inline-flex align-items-center gap-1.5 text-nowrap"
          style={{ backgroundColor: '#1E60E6', borderColor: '#1E60E6' }}
          disabled={lookupLoading || !listFilter.trim()}
          onClick={() => void onLookup()}
        >
          {lookupLoading ? <Loader2 className="fa-spin" size={13} /> : <LucideBarcode size={14} />}
          <span>Quét / Tra cứu</span>
        </button>
      </div>

      {activeTab === 'PENDING' ? (
        <section className="bms-table-standalone-section">
          <div className="bms-table-standalone-header">
            <div>
              <h2 className="bms-table-standalone-title">Ống mẫu chờ tiếp nhận vào Phòng Lab</h2>
              <p className="bms-table-standalone-subtitle">
                Các ống mẫu đã hoàn tất Bước 2 (Lấy mẫu). Bấm <strong>Tiếp nhận</strong> hoặc quét barcode để kiểm chuẩn 4 tiêu chí ISO 15189.
              </p>
            </div>
            <span className="badge bg-light text-dark border rounded-pill px-3 py-1.5">
              {filteredPending.length} / {safePending.length} ống
            </span>
          </div>
          <div className="bms-table-standalone-body">
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light small text-uppercase text-muted">
                  <tr>
                    <th className="ps-3">Barcode ống</th>
                    <th>Bệnh nhân</th>
                    <th>Loại ống / Thể tích</th>
                    <th>Gói xét nghiệm</th>
                    <th>Trạng thái</th>
                    <th className="text-end pe-3">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingLoading ? (
                    <tr>
                      <td colSpan={6} className="text-center text-muted py-4 small">
                        <Loader2 className="fa-spin me-2" size="1em" /> Đang tải danh sách ống chờ tiếp nhận…
                      </td>
                    </tr>
                  ) : filteredPending.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center text-muted py-5 small">
                        <TestTube2 className="mb-2 opacity-25" size={28} />
                        <div className="fw-semibold text-dark">Không có ống mẫu nào chờ tiếp nhận</div>
                        <div>Các ống mẫu sau khi lấy mẫu ở Bước 2 sẽ tự động xuất hiện tại đây.</div>
                      </td>
                    </tr>
                  ) : (
                    pendingPag.paginatedItems.map((p) => {
                      const key = p.barcode || p.sampleId || p.id;
                      const st = formatSampleStatusVi(p.status);
                      return (
                        <tr key={key}>
                          <td className="ps-3">
                            <Code128Barcode value={p.barcode || key} height={24} width={1.0} compact align="start" />
                          </td>
                          <td>
                            <div className="fw-semibold small text-dark">{p.patientName || '—'}</div>
                            <div className="text-muted font-monospace" style={{ fontSize: '0.72rem' }}>{p.patientId || ''}</div>
                          </td>
                          <td>
                            <span className="badge bg-light text-dark border me-1">{formatTubeColorVi(p.tubeColor || p.sampleType)}</span>
                            {p.volumeMl ? <span className="small text-muted">{p.volumeMl} mL</span> : null}
                          </td>
                          <td className="small text-dark">{p.testPackageName || p.notes || 'Xét nghiệm lâm sàng'}</td>
                          <td>
                            <span className={`badge border ${st.cls}`}>{st.label}</span>
                          </td>
                          <td className="text-end pe-3">
                            <div className="d-inline-flex align-items-center gap-1.5">
                              <button
                                type="button"
                                className="btn btn-sm btn-outline-secondary rounded-pill px-2.5 d-inline-flex align-items-center gap-1"
                                onClick={() => void openSampleDetail(p)}
                              >
                                <Eye size={13} /> Chi tiết
                              </button>
                              <button
                                type="button"
                                className="btn btn-sm btn-primary rounded-pill px-3 fw-semibold d-inline-flex align-items-center gap-1 text-white shadow-sm"
                                style={{ backgroundColor: '#1E60E6', borderColor: '#1E60E6' }}
                                onClick={() => openCheckInModal(p)}
                              >
                                <ShieldCheck size={13} /> Tiếp nhận
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
            <TablePagination
              page={pendingPag.page}
              totalPages={pendingPag.totalPages}
              totalItems={pendingPag.totalItems}
              pageSize={pendingPag.pageSize}
              onPageChange={pendingPag.setPage}
              onPageSizeChange={pendingPag.setPageSize}
              itemLabel="ống chờ tiếp nhận"
            />
          </div>
        </section>
      ) : (
        <section className="bms-table-standalone-section">
          <div className="bms-table-standalone-header">
            <div>
              <h2 className="bms-table-standalone-title">Ống mẫu đã tiếp nhận Lab — Sẵn sàng phân tích</h2>
              <p className="bms-table-standalone-subtitle">
                Bấm <strong>Bắt đầu XN</strong> để đưa ống mẫu vào phân tích và chuyển sang Bước 4 (Nhập kết quả). Nút <em>Chiết mẫu</em> (tùy chọn) chỉ hiển thị với ống huyết thanh/huyết tương cần chia nhiều máy.
              </p>
            </div>
            <span className="badge bg-light text-dark border rounded-pill px-3 py-1.5">
              {filteredReceived.length} / {receivedSamples.length} ống
            </span>
          </div>
          <div className="bms-table-standalone-body">
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light small text-uppercase text-muted">
                  <tr>
                    <th className="ps-3">Barcode ống</th>
                    <th>Bệnh nhân</th>
                    <th>Loại ống / Thể tích</th>
                    <th>Gói xét nghiệm</th>
                    <th>Trạng thái</th>
                    <th className="text-end pe-3">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {receivedLoading ? (
                    <tr>
                      <td colSpan={6} className="text-center text-muted py-4 small">
                        <Loader2 className="fa-spin me-2" size="1em" /> Đang tải ống mẫu đã tiếp nhận…
                      </td>
                    </tr>
                  ) : filteredReceived.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center text-muted py-5 small">
                        <FlaskConical className="mb-2 opacity-25" size={28} />
                        <div className="fw-semibold text-dark">Chưa có ống mẫu nào ở trạng thái Đã tiếp nhận Lab</div>
                        <div>Hãy tiếp nhận mẫu ở tab "Chờ tiếp nhận Lab" trước khi bắt đầu xét nghiệm.</div>
                      </td>
                    </tr>
                  ) : (
                    receivedPag.paginatedItems.map((s) => {
                      const st = formatSampleStatusVi(s.status);
                      const isBusyAliquot = actionBusyId === `aliquot:${s.id}`;
                      const isBusyTesting = actionBusyId === `testing:${s.id}`;
                      return (
                        <tr key={s.id || s.barcode}>
                          <td className="ps-3">
                            <div className="d-flex flex-column align-items-start gap-1">
                              <Code128Barcode value={s.barcode || s.id} height={24} width={1.0} compact align="start" />
                              {s.isAliquot && (
                                <span className="badge bg-info text-white" style={{ fontSize: '0.68rem' }}>Aliquot</span>
                              )}
                            </div>
                          </td>
                          <td>
                            <div className="fw-semibold small text-dark">{s.patientName || '—'}</div>
                            <div className="text-muted font-monospace" style={{ fontSize: '0.72rem' }}>{s.patientId || ''}</div>
                          </td>
                          <td>
                            <span className="badge bg-light text-dark border me-1">{formatTubeColorVi(s.tubeColor || s.sampleType)}</span>
                            {s.volumeMl ? <span className="small text-muted">{s.volumeMl} mL</span> : null}
                          </td>
                          <td className="small text-dark">{s.testPackageName || 'Xét nghiệm lâm sàng'}</td>
                          <td>
                            <span className={`badge border ${st.cls}`}>{st.label}</span>
                          </td>
                          <td className="text-end pe-3">
                            <div className="d-inline-flex align-items-center gap-1.5">
                              {canAliquotTube(s) && (
                                <button
                                  type="button"
                                  className="btn btn-sm btn-outline-secondary rounded-pill px-2.5 d-inline-flex align-items-center gap-1"
                                  disabled={Boolean(actionBusyId)}
                                  title="Tùy chọn: Chiết mẫu phụ (Aliquot) cho ống huyết thanh/huyết tương cần chạy nhiều máy"
                                  onClick={() => void handleCreateAliquot(s)}
                                >
                                  {isBusyAliquot ? <Loader2 className="fa-spin" size={12} /> : <TestTube2 size={12} />}
                                  <span>Chiết mẫu</span>
                                </button>
                              )}
                              <button
                                type="button"
                                className="btn btn-sm btn-primary rounded-pill px-3 fw-semibold d-inline-flex align-items-center gap-1 text-white shadow-sm"
                                style={{ backgroundColor: '#1E60E6', borderColor: '#1E60E6' }}
                                disabled={Boolean(actionBusyId)}
                                title="Đưa ống mẫu vào máy phân tích và chuyển sang Bước 4 (Nhập kết quả)"
                                onClick={() => void handleStartTesting(s)}
                              >
                                {isBusyTesting ? <Loader2 className="fa-spin" size={12} /> : <FlaskConical size={12} />}
                                <span>Bắt đầu XN</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
            <TablePagination
              page={receivedPag.page}
              totalPages={receivedPag.totalPages}
              totalItems={receivedPag.totalItems}
              pageSize={receivedPag.pageSize}
              onPageChange={receivedPag.setPage}
              onPageSizeChange={receivedPag.setPageSize}
              itemLabel="ống đã tiếp nhận"
            />
          </div>
        </section>
      )}

      <Modal
        show={showCheckInModal && Boolean(current)}
        onHide={() => !loading && setShowCheckInModal(false)}
        centered
        size="lg"
        backdrop="static"
      >
        <Modal.Header closeButton={!loading} style={{ backgroundColor: '#FFFFFF', borderBottom: '1px solid #E2E8F0' }}>
          <Modal.Title className="h6 fw-bold d-flex align-items-center gap-2 text-dark">
            <ShieldCheck className="text-primary" size={18} />
            <span>Kiểm Chuẩn &amp; Tiếp Nhận Ống Mẫu</span>
            {current && (
              <span className="badge bg-primary-subtle text-primary border border-primary-subtle font-monospace">
                {current.barcode || current.sampleId || current.id}
              </span>
            )}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-3" style={{ backgroundColor: '#F8FAFC' }}>
          {current && (
            <div className="d-flex flex-column gap-3">

              <div className="p-3 rounded-3 bg-white border">
                <div className="row g-2 small">
                  <div className="col-sm-6">
                    <span className="text-muted">Bệnh nhân:</span>{' '}
                    <strong className="text-dark">{current.patientName || '—'}</strong>{' '}
                    {current.patientId && <code className="text-primary">({current.patientId})</code>}
                  </div>
                  <div className="col-sm-6">
                    <span className="text-muted">Gói xét nghiệm:</span>{' '}
                    <strong className="text-dark">{current.testPackageName || 'Xét nghiệm lâm sàng'}</strong>
                  </div>
                  <div className="col-sm-6">
                    <span className="text-muted">Ống bệnh phẩm:</span>{' '}
                    <strong className="text-dark">
                      {formatTubeColorVi(current.tubeColor || current.sampleType)} · {current.volumeMl || 3.0} mL
                    </strong>
                  </div>
                  <div className="col-sm-6">
                    <span className="text-muted">Phòng tiếp nhận:</span>{' '}
                    <strong className="text-dark">{displayRoomName}</strong>
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-3 bg-white border">
                <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-2.5">
                  <span className="small fw-bold text-uppercase text-secondary">
                    Kiểm chuẩn tiền phân tích (ISO 15189)
                  </span>
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-success rounded-pill px-3 fw-semibold"
                    style={{ fontSize: '12px' }}
                    onClick={() => setChecks({ idMatch: true, intact: true, tubeOk: true, labeled: true })}
                  >
                    Đạt đủ cả 4 tiêu chí
                  </button>
                </div>
                <div className="d-flex flex-column gap-2">
                  {[
                    ['idMatch', '1. Mã Barcode và họ tên bệnh nhân trùng khớp 100% với phiếu chỉ định'],
                    ['intact', '2. Ống nghiệm nguyên vẹn, không nứt vỡ, không rò rỉ bệnh phẩm'],
                    ['tubeOk', '3. Đúng loại ống nghiệm quy định (màu nắp/chất chống đông) và đủ thể tích'],
                    ['labeled', '4. Nhãn Barcode dán chuẩn, ghi nhận rõ thời điểm lấy mẫu'],
                  ].map(([key, label]) => (
                    <label key={key} className="d-flex align-items-center gap-2 p-2 rounded bg-light border mb-0" style={{ cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        className="form-check-input mt-0"
                        checked={checks[key]}
                        onChange={(e) => setChecks((c) => ({ ...c, [key]: e.target.checked }))}
                      />
                      <span className="small text-dark fw-medium">{label}</span>
                    </label>
                  ))}
                </div>

                <div className="mt-3">
                  <label className="form-label small fw-semibold text-secondary mb-1">Ghi chú bàn giao</label>
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    value={handoverNote}
                    onChange={(e) => setHandoverNote(e.target.value)}
                    placeholder="Ghi chú tình trạng ống mẫu, vận chuyển..."
                  />
                </div>
              </div>

              <div className="p-3 rounded-3 bg-white border">
                <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-2">
                  <span className="small fw-bold text-uppercase text-primary d-flex align-items-center gap-1.5">
                    <Package size={14} />
                    Vật tư y tế &amp; Hóa chất sử dụng theo gói ({selectedSupplies.filter((s) => s.checked).length} mục)
                  </span>
                  {inventoryLoading && (
                    <span className="small text-muted">
                      <Loader2 className="fa-spin me-1" size={12} /> Đang đồng bộ Kho vật tư...
                    </span>
                  )}
                </div>
                <div className="small text-muted mb-2.5">
                  Tự động gợi ý từ <strong>Kho Vật Tư Y Tế</strong> theo đúng gói <strong>{current.testPackageName || 'xét nghiệm'}</strong>. Khi xác nhận tiếp nhận, hệ thống tự động trừ tồn kho và ghi vết mã Lô (ISO 15189 §6.6).
                </div>

                {selectedSupplies.length === 0 ? (
                  <div className="alert alert-warning py-2 px-3 small mb-2">
                    Chưa nạp được vật tư tương ứng từ kho. Bạn có thể chọn thêm thủ công bên dưới.
                  </div>
                ) : (
                  <div className="d-flex flex-column gap-1.5 mb-2.5">
                    {selectedSupplies.map((sup, idx) => (
                      <div
                        key={sup.id}
                        className={`d-flex align-items-center justify-content-between gap-2 p-2 rounded border ${sup.checked ? 'bg-primary-subtle border-primary-subtle' : 'bg-light'}`}
                      >
                        <label className="d-flex align-items-start gap-2 mb-0 flex-grow-1" style={{ cursor: 'pointer', minWidth: 0 }}>
                          <input
                            type="checkbox"
                            className="form-check-input mt-1 flex-shrink-0"
                            checked={sup.checked}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              setSelectedSupplies((prev) =>
                                prev.map((it, i) => (i === idx ? { ...it, checked } : it))
                              );
                            }}
                          />
                          <div style={{ minWidth: 0 }}>
                            <div className="small fw-semibold text-dark">{sup.name}</div>
                            <div className="text-muted" style={{ fontSize: '0.72rem' }}>
                              <code className="text-primary me-1">{sup.code}</code>
                              · Lô: <strong>{sup.lotNumber}</strong>
                              · Tồn kho: <strong className={sup.stock <= 5 ? 'text-danger' : 'text-success'}>{sup.stock} {sup.unit}</strong>
                            </div>
                          </div>
                        </label>
                        <div className="d-flex align-items-center gap-1 flex-shrink-0">
                          <input
                            type="number"
                            min="1"
                            max={Math.max(1, sup.stock)}
                            step="1"
                            className="form-control form-control-sm text-center font-monospace"
                            style={{ width: 64 }}
                            disabled={!sup.checked}
                            value={sup.quantity}
                            onChange={(e) => {
                              const q = Math.max(1, Math.min(sup.stock || 999, Number(e.target.value) || 1));
                              setSelectedSupplies((prev) =>
                                prev.map((it, i) => (i === idx ? { ...it, quantity: q } : it))
                              );
                            }}
                          />
                          <span className="small text-muted" style={{ minWidth: 34 }}>{sup.unit}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {(() => {
                  const selectedIds = new Set(selectedSupplies.map((s) => s.id));
                  const extraOptions = inventoryItems.filter(
                    (it) => !selectedIds.has(it.id) && Number(it.quantity || 0) > 0 && it.expiryStatus !== 'EXPIRED'
                  );
                  if (extraOptions.length === 0) return null;
                  return (
                    <select
                      className="form-select form-select-sm"
                      value=""
                      onChange={(e) => {
                        const found = extraOptions.find((x) => x.id === e.target.value);
                        if (!found) return;
                        setSelectedSupplies((prev) => [
                          ...prev,
                          {
                            id: found.id,
                            code: found.code,
                            name: found.name,
                            lotNumber: found.lotNumber,
                            unit: found.unit,
                            stock: Number(found.quantity || 0),
                            quantity: 1,
                            checked: true,
                          }
                        ]);
                      }}
                    >
                      <option value="">+ Chọn bổ sung vật tư / hóa chất khác từ Kho Vật Tư...</option>
                      {extraOptions.map((it) => (
                        <option key={it.id} value={it.id}>
                          [{it.code}] {it.name} (Lô {it.lotNumber} · Tồn: {it.quantity} {it.unit})
                        </option>
                      ))}
                    </select>
                  );
                })()}
              </div>

              <div className="p-3 rounded-3 bg-white border">
                <div className="d-flex align-items-center justify-content-between">
                  <span className="small fw-bold text-danger d-flex align-items-center gap-1.5">
                    <AlertTriangle size={14} /> Từ chối ống mẫu không đạt chuẩn
                  </span>
                  <button
                    type="button"
                    className="btn btn-sm btn-link text-danger text-decoration-none p-0 fw-semibold small"
                    onClick={() => setShowRejectBox((v) => !v)}
                  >
                    {showRejectBox ? 'Ẩn bớt' : 'Mở chọn lý do từ chối'}
                  </button>
                </div>

                {showRejectBox && (
                  <div className="mt-2.5">
                    <div className="row g-2">
                      <div className="col-md-6">
                        <select
                          className="form-select form-select-sm"
                          value={rejectCode}
                          onChange={(e) => setRejectCode(e.target.value)}
                        >
                          <option value="">-- Chọn lý do từ chối mẫu --</option>
                          {REJECTION_CODES.map((r) => (
                            <option key={r.code} value={r.code}>
                              {r.code}: {r.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="col-md-6">
                        <input
                          className="form-control form-control-sm"
                          placeholder="Ghi chú chi tiết lý do từ chối..."
                          value={rejectNote}
                          onChange={(e) => setRejectNote(e.target.value)}
                        />
                      </div>
                    </div>
                    {isHemolysisSelected && (
                      <div className="alert alert-danger mt-2 py-2 px-2.5 mb-0 small d-flex align-items-center gap-2">
                        <Lock size={14} className="flex-shrink-0" />
                        <span>Mẫu bị <strong>Tán huyết (Hemolysis)</strong>: hệ thống sẽ khóa phân tích và yêu cầu lấy lại mẫu.</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer className="bg-white border-top d-flex justify-content-between">
          <button
            type="button"
            className="btn btn-sm btn-outline-secondary rounded-pill px-3"
            disabled={loading}
            onClick={() => setShowCheckInModal(false)}
          >
            Đóng
          </button>
          <div className="d-flex align-items-center gap-2">
            {showRejectBox && (
              <button
                type="button"
                className="btn btn-sm btn-outline-danger rounded-pill px-3 d-inline-flex align-items-center gap-1"
                disabled={!rejectCode || loading}
                onClick={() => void onCheckIn(true)}
              >
                <LucideX size={14} />
                <span>Xác nhận từ chối</span>
              </button>
            )}
            <button
              type="button"
              className="btn btn-sm btn-primary rounded-pill px-4 fw-semibold d-inline-flex align-items-center gap-1.5 text-white shadow-sm"
              style={{ backgroundColor: '#1E60E6', borderColor: '#1E60E6' }}
              disabled={!canReceive || loading}
              onClick={() => void onCheckIn(false)}
            >
              {loading ? <Loader2 className="fa-spin" size={14} /> : <CheckCircle2 size={14} />}
              <span>Xác Nhận Tiếp Nhận Mẫu</span>
            </button>
          </div>
        </Modal.Footer>
      </Modal>

      <Modal show={Boolean(detailSample)} onHide={() => setDetailSample(null)} centered size="lg">
        <Modal.Header closeButton className="bg-light border-bottom">
          <Modal.Title className="h6 fw-bold d-flex align-items-center gap-2">
            <TestTube2 className="text-primary"  size="1em"/>
            <span>Chi Tiết Ống Mẫu &amp; Y Lệnh — </span>
            <code className="text-primary">{detailSample?.barcode || detailSample?.id}</code>
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-3">
          {detailSample && (
            <div className="d-flex flex-column gap-3">
              <div className="p-3 rounded-3 bg-light border">
                <div className="small fw-bold text-uppercase text-primary mb-2">1. Thông Tin Bệnh Nhân</div>
                <div className="row g-2 small">
                  <div className="col-sm-6">
                    <span className="text-muted">Họ và tên:</span>{' '}
                    <strong className="text-dark">{detailOrderInfo?.patientName || detailSample.patientName || '—'}</strong>
                  </div>
                  <div className="col-sm-6">
                    <span className="text-muted">Mã bệnh nhân:</span>{' '}
                    <code className="fw-semibold">{detailSample.patientId || '—'}</code>
                  </div>
                  <div className="col-sm-6">
                    <span className="text-muted">Giới tính / Tuổi:</span>{' '}
                    <strong className="text-dark">
                      {detailSample.patientGender || detailOrderInfo?.patientGender || 'Nam'} · {detailSample.patientAge || detailOrderInfo?.patientAge || '—'} tuổi
                    </strong>
                  </div>
                  <div className="col-sm-6">
                    <span className="text-muted">Trạng thái ống mẫu:</span>{' '}
                    {(() => {
                      const st = formatSampleStatusVi(detailSample.status);
                      return <span className={`badge border ${st.cls}`}>{st.label}</span>;
                    })()}
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-3 bg-light border">
                <div className="small fw-bold text-uppercase text-primary mb-2">2. Bác Sĩ Chỉ Định &amp; Y Lệnh Lâm Sàng</div>
                {detailLoading ? (
                  <div className="small text-muted py-1">
                    <Loader2 className="fa-spin me-2"  size="1em"/> Đang tải thông tin bác sĩ &amp; phiếu chỉ định...
                  </div>
                ) : (
                  <div className="row g-2 small">
                    <div className="col-sm-6">
                      <span className="text-muted">Bác sĩ chỉ định:</span>{' '}
                      <strong className="text-dark">{detailOrderInfo?.doctorName || detailSample.doctorName || 'BS. Chuyên Khoa'}</strong>
                    </div>
                    <div className="col-sm-6">
                      <span className="text-muted">Mã y lệnh:</span>{' '}
                      <code className="fw-semibold">{detailOrderInfo?.orderNumber || detailSample.testOrderId || '—'}</code>
                    </div>
                    <div className="col-sm-6">
                      <span className="text-muted">Mã bệnh ICD-10:</span>{' '}
                      <strong className="text-primary font-monospace">
                        {Array.isArray(detailOrderInfo?.icd10Codes) && detailOrderInfo.icd10Codes.length > 0
                          ? detailOrderInfo.icd10Codes.join(', ')
                          : '—'}
                      </strong>
                    </div>
                    <div className="col-sm-6">
                      <span className="text-muted">Gói / Chỉ số xét nghiệm:</span>{' '}
                      <strong className="text-dark">{detailSample.testPackageName || '—'}</strong>
                    </div>
                    <div className="col-12">
                      <span className="text-muted">Chẩn đoán / Lý do chỉ định:</span>{' '}
                      <span className="text-dark">{detailOrderInfo?.clinicalIndication || detailSample.notes || '—'}</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="p-3 rounded-3 bg-light border">
                <div className="small fw-bold text-uppercase text-primary mb-2">3. Thông Số Ống Bệnh Phẩm</div>
                <div className="row g-2 small">
                  <div className="col-sm-4">
                    <span className="text-muted">Loại ống:</span>{' '}
                    <strong className="text-dark">{formatTubeColorVi(detailSample.tubeColor || detailSample.sampleType)}</strong>
                  </div>
                  <div className="col-sm-4">
                    <span className="text-muted">Thể tích:</span>{' '}
                    <strong className="text-dark">{detailSample.volumeMl || 2.0} mL</strong>
                  </div>
                  <div className="col-sm-4">
                    <span className="text-muted">Phòng Lab:</span>{' '}
                    <strong className="text-dark">{detailSample.labRoom || selectedRoom || '—'}</strong>
                  </div>
                </div>
              </div>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer className="bg-light">
          <button
            type="button"
            className="btn btn-sm btn-secondary rounded-pill px-3"
            onClick={() => setDetailSample(null)}
          >
            Đóng
          </button>
          {detailSample && canReceiveSample(detailSample.status) && (
            <button
              type="button"
              className="btn btn-sm btn-primary rounded-pill px-3"
              onClick={() => {
                const target = detailSample;
                setDetailSample(null);
                openCheckInModal(target);
              }}
            >
              Mở kiểm chuẩn &amp; tiếp nhận
            </button>
          )}
        </Modal.Footer>
      </Modal>
    </div>
  );
}

export default CheckInSamplePage;
