/**
 * @file CheckInSamplePage.jsx
 * @description Tiếp nhận ống mẫu máu tại phòng xét nghiệm & quét mã vạch Barcode (UC41).
 * Tuân thủ: Tiêu chuẩn ISO 15189:2022, Clean Medical Standard (Rule 19) & AGENTS-CODE.md.
 */

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  FaBarcode,
  FaCheckCircle,
  FaExclamationTriangle,
  FaVial,
  FaTimes,
  FaSearch,
  FaExchangeAlt,
  FaClock,
  FaMapMarkerAlt,
  FaUserInjured,
  FaSpinner,
  FaShieldAlt,
  FaSyncAlt,
  FaLock,
  FaEye
} from 'react-icons/fa';
import { Modal } from 'react-bootstrap';
import { sampleApi } from '../api/sampleApi';
import api from '../../../config/api';
import { resolveDutyAssignment } from '../../../shared/workflow/dutyAssignment';
import { getStoredUser } from '../../../constants/roles';

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

function formatTubeColorVi(colorOrType) {
  const key = String(colorOrType || '').toLowerCase();
  if (key.includes('purple') || key.includes('edta')) return 'Ống Tím (EDTA)';
  if (key.includes('gold') || key.includes('yellow') || key.includes('sst') || key.includes('serum')) return 'Ống Vàng (SST)';
  if (key.includes('blue') || key.includes('citrate')) return 'Ống Xanh Dương (Citrate)';
  if (key.includes('gray') || key.includes('grey') || key.includes('naf')) return 'Ống Xám (NaF)';
  if (key.includes('green') || key.includes('heparin')) return 'Ống Xanh Lá (Heparin)';
  return colorOrType || '—';
}

function formatStaffOption(s) {
  const code = s.employeeCode || s.username || s.id;
  const parts = [s.fullName];
  if (code) parts.push(`(${code})`);
  if (s.department) parts.push(`— ${s.department}`);
  return parts.join(' ');
}

export function CheckInSamplePage({ labRoomId = '', technicianName: initialTechName = '' } = {}) {
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
  const [pending, setPending] = useState([]);
  const [current, setCurrent] = useState(null);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [rejectCode, setRejectCode] = useState('');
  const [rejectNote, setRejectNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [lookupLoading, setLookupLoading] = useState(false);

  // 4 tiêu chí kiểm chuẩn tiếp nhận tiền phân tích theo ISO 15189:2022
  const [checks, setChecks] = useState({
    idMatch: false,    // ISO: KTV phải tự xác nhận — không pre-check
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

  // Tự động cập nhật thời điểm hiện tại mỗi giây
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

  // Prioritize Lab/Manager staff for the receiving technician selector; fall back to full staff directory if empty.
  const labTechOptions = useMemo(() => {
    const labOnly = staffOptions.filter((s) => s.role === 'Lab' || s.role === 'Manager');
    return labOnly.length > 0 ? labOnly : staffOptions;
  }, [staffOptions]);

  const loadPending = useCallback(async () => {
    setPendingLoading(true);
    try {
      const data = await sampleApi.pending();
      setPending(Array.isArray(data) ? data : []);
    } catch {
      setPending([]);
    } finally {
      setPendingLoading(false);
    }
  }, []);

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

  const selectFromList = (p) => {
    const key = p.barcode || p.sampleId || p.id || '';
    setCode(key);
    setCurrent(p);
    setError(null);
    setSuccess(null);
    setRejectCode('');
    setChecks({ idMatch: false, intact: false, tubeOk: false, labeled: false });
  };

  useEffect(() => {
    loadPending();
    loadLookups();
  }, [loadPending, loadLookups]);

  // Auto-align Người Bàn Giao with the sample's collector/handover staff once a specimen is loaded.
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
    const trimmed = code.trim();
    if (!trimmed) {
      setError('Vui lòng quét mã vạch hoặc nhập mã ống mẫu.');
      return;
    }
    setError(null);
    setSuccess(null);
    setCurrent(null);
    setLookupLoading(true);

    try {
      const s = await sampleApi.lookup(trimmed);
      setCurrent(s);
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
    // PendingCollection → Collected rồi Received (không nhảy cóc BE)
    // Prefer stable sample Id over barcode — barcodes can collide after reject/recollect.
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

    setLoading(true);
    try {
      // Ống vừa in nhãn thường PendingCollection → Collected rồi mới Received
      if (!reject && current?.status === 'PendingCollection') {
        await api.put(`/laboratory/samples/${encodeURIComponent(targetCode)}/status`, {
          status: 'Collected',
          labRoom: selectedRoom,
          technicianName,
          timestamp: new Date().toISOString(),
          notes: 'Ghi nhận lấy mẫu tại bàn trước khi tiếp nhận Lab'
        });
      }

      const res = await sampleApi.checkIn({
        code: targetCode,
        labRoomId: selectedRoom,
        rejectionCode: reject ? rejectCode : undefined,
        rejectionNote: reject ? rejectNote : undefined,
        notes: handoverNote,
        technicianId: selectedReceiverStaff?.employeeCode || selectedReceiverStaff?.id || currentUser?.employeeCode || currentUser?.id,
        technicianName: selectedReceiverStaff?.fullName || technicianName || currentUser?.fullName || currentUser?.name,
        handoverById: selectedHandoverStaff?.employeeCode || selectedHandoverStaff?.id,
        handoverBy: handoverDisplay
      });

      if (reject) {
        let msg = `Đã từ chối tiếp nhận mẫu ${targetCode} với lý do: ${rejectCode}`;
        if (isHemolysisSelected) {
          msg += ' — [ISO 15189: Đã khóa phân tích và kích hoạt quy trình lấy lại mẫu/Rerun]';
        }
        setSuccess(msg);
      } else {
        setSuccess(`Tiếp nhận ống mẫu ${targetCode} vào phòng xét nghiệm thành công (Trạng thái: Đã tiếp nhận - Received).`);
      }

      setCurrent(res);
      setCode('');
      setRejectCode('');
      setRejectNote('');
      await loadPending();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Thao tác tiếp nhận mẫu thất bại.');
    } finally {
      setLoading(false);
    }
  };

  // PendingCollection (sau in nhãn) / Collected / InTransit — tick đủ QC mới nhận
  const canReceive =
    Boolean(current) &&
    ['PendingCollection', 'Collected', 'InTransit'].includes(current.status) &&
    checks.idMatch &&
    checks.intact &&
    checks.tubeOk &&
    checks.labeled;

  const safePending = Array.isArray(pending) ? pending : [];
  const filteredPending = useMemo(() => {
    const q = listFilter.trim().toLowerCase();
    if (!q) return safePending;
    return safePending.filter((p) => {
      const blob = `${p.barcode || ''} ${p.patientName || ''} ${p.patientId || ''} ${p.tubeColor || ''} ${p.status || ''}`.toLowerCase();
      return blob.includes(q);
    });
  }, [safePending, listFilter]);

  const selectedKey = current?.barcode || current?.id || code;

  return (
    <div style={{ background: '#f8fafc', minHeight: '100vh' }} className="py-3">
      {/* Banner đầu trang chuẩn y khoa ISO 15189 */}
      <header className="bms-page-header">
        <div className="bms-page-header-content">
          <h1 className="bms-page-title">Tiếp nhận ống mẫu</h1>
        </div>
      </header>

      <div className="container-fluid px-3" style={{ maxWidth: 1200 }}>
        {/* Hộp quét Barcode */}
        <div className="card border-0 shadow-sm mb-4 bg-white rounded-4" style={{ border: '1px solid rgba(15, 23, 42, 0.05)' }}>
          <div className="card-body p-2">
            <h6 className="fw-bold text-dark mb-2 d-flex align-items-center gap-2">
              <FaSearch style={{ color: '#1E60E6' }} />
              <span>Quét hoặc Tra Cứu Mã Barcode Ống Mẫu</span>
            </h6>
            <div className="d-flex gap-2 flex-wrap">
              <input
                className="form-control flex-grow-1"
                style={{ minHeight: 46, maxWidth: 520, borderRadius: '9999px' }}
                placeholder="Quét mã vạch Barcode (VD: BC-20261011-0004 hoặc SMP-004)..."
                value={code}
                onChange={(e) => setCode(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && void onLookup()}
              />
              <button
                type="button"
                className="btn d-flex align-items-center gap-2 px-3 shadow-sm text-white"
                style={{ minHeight: 46, backgroundColor: '#1E60E6', borderColor: '#1E60E6', borderRadius: '9999px' }}
                disabled={lookupLoading}
                onClick={() => void onLookup()}
              >
                {lookupLoading ? <FaSpinner className="fa-spin" /> : <FaSearch />}
                <span>Tra cứu mẫu</span>
              </button>
            </div>
            {current && (
              <div className="small mt-2 text-success fw-medium d-flex align-items-center gap-1">
                <FaCheckCircle />
                <span>Tìm thấy ống mẫu &bull; Mã: {current.barcode || current.sampleId} &bull; Trạng thái hiện tại: <strong>{formatSampleStatusVi(current.status).label}</strong></span>
              </div>
            )}
          </div>
        </div>

        {/* Thông báo lỗi / thành công */}
        {error && (
          <div className="alert alert-danger border-0 shadow-sm d-flex align-items-center justify-content-between p-3 mb-4 rounded-3">
            <div className="d-flex align-items-center gap-2">
              <FaExclamationTriangle className="text-danger fs-5" />
              <div>{error}</div>
            </div>
            <button type="button" className="btn-close" onClick={() => setError(null)}></button>
          </div>
        )}

        {success && (
          <div className="alert alert-success border-0 shadow-sm d-flex align-items-center justify-content-between p-3 mb-4 rounded-3">
            <div className="d-flex align-items-center gap-2">
              <FaCheckCircle className="text-success fs-5" />
              <div className="fw-medium">{success}</div>
            </div>
            <button type="button" className="btn-close" onClick={() => setSuccess(null)}></button>
          </div>
        )}

        {/* LIST ống chờ — Lab bấm chọn nhanh, không chỉ dựa vào quét */}
        <div className="card border-0 shadow-sm mb-4 bg-white rounded-3">
          <div className="card-header bg-white border-bottom py-3 d-flex flex-wrap justify-content-between align-items-center gap-2">
            <h5 className="mb-0 fw-bold fs-6 text-dark d-flex align-items-center gap-2">
              <FaVial className="text-primary" />
              <span>Danh sách ống chờ tiếp nhận ({filteredPending.length}/{safePending.length})</span>
            </h5>
            <div className="d-flex gap-2 align-items-center">
              <div className="input-group input-group-sm" style={{ width: 240 }}>
                <span className="input-group-text bg-light"><FaSearch className="text-muted" /></span>
                <input
                  className="form-control"
                  placeholder="Lọc mã / tên BN / ống..."
                  value={listFilter}
                  onChange={(e) => setListFilter(e.target.value)}
                />
              </div>
              <button
                type="button"
                className="btn btn-sm btn-outline-secondary d-flex align-items-center gap-1"
                onClick={() => void loadPending()}
                disabled={pendingLoading}
              >
                <FaSyncAlt className={pendingLoading ? 'fa-spin' : ''} /> Làm mới
              </button>
            </div>
          </div>
          <div className="table-responsive" style={{ maxHeight: 320, overflowY: 'auto' }}>
            <table className="table table-hover table-sm align-middle mb-0">
              <thead className="table-light sticky-top">
                <tr className="small text-uppercase text-muted">
                  <th className="ps-3">Barcode ống</th>
                  <th>Bệnh nhân</th>
                  <th>Loại ống</th>
                  <th>Gói / ghi chú</th>
                  <th>Trạng thái</th>
                  <th className="text-end pe-3">Chọn</th>
                </tr>
              </thead>
              <tbody>
                {pendingLoading && (
                  <tr>
                    <td colSpan={6} className="text-center text-muted py-4">
                      <FaSpinner className="fa-spin me-2" /> Đang tải danh sách ống…
                    </td>
                  </tr>
                )}
                {!pendingLoading && filteredPending.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center text-muted py-4">
                      Không có ống chờ. Xác nhận đợt &amp; in nhãn ở bước 1, hoặc quét barcode phía trên.
                    </td>
                  </tr>
                )}
                {!pendingLoading && filteredPending.map((p) => {
                  const key = p.barcode || p.sampleId || p.id;
                  const active = selectedKey && (selectedKey === p.barcode || selectedKey === p.id || selectedKey === key);
                  return (
                    <tr
                      key={key}
                      className={active ? 'table-primary' : ''}
                      style={{ cursor: 'pointer' }}
                      onClick={() => selectFromList(p)}
                    >
                      <td className="ps-3">
                        <code className="fw-semibold text-primary small">{p.barcode || key}</code>
                      </td>
                      <td>
                        <div className="fw-semibold small text-dark">{p.patientName || '—'}</div>
                        <div className="text-muted" style={{ fontSize: '0.7rem' }}>{p.patientId || ''}</div>
                      </td>
                      <td>
                        <span className="badge bg-light text-dark border">{formatTubeColorVi(p.tubeColor || p.sampleType)}</span>
                      </td>
                      <td className="small text-truncate" style={{ maxWidth: 180 }} title={p.testPackageName || p.notes}>
                        {p.testPackageName || p.notes || '—'}
                      </td>
                      <td>
                        {(() => {
                          const st = formatSampleStatusVi(p.status);
                          return <span className={`badge border ${st.cls}`}>{st.label}</span>;
                        })()}
                      </td>
                      <td className="text-end pe-3">
                        <div className="d-inline-flex align-items-center gap-1.5">
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-secondary rounded-pill px-2.5 d-inline-flex align-items-center gap-1"
                            title="Xem chi tiết bệnh nhân, bác sĩ chỉ định & y lệnh"
                            onClick={(e) => {
                              e.stopPropagation();
                              void openSampleDetail(p);
                            }}
                          >
                            <FaEye size={12} /> Chi tiết
                          </button>
                          <button
                            type="button"
                            className={`btn btn-sm ${active ? 'btn-primary' : 'btn-outline-primary'} rounded-pill px-3`}
                            onClick={(e) => {
                              e.stopPropagation();
                              selectFromList(p);
                            }}
                          >
                            {active ? 'Đang chọn' : 'Chọn ống'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="card-footer bg-white small text-muted py-2">
            Bấm <strong>Chọn ống</strong> trên list → tick 4 checklist → <strong>Xác nhận tiếp nhận</strong>. Hoặc quét barcode máy quét vào ô phía trên.
          </div>
        </div>

        <div className="row g-4">
          {/* Cột trái: Kiểm chuẩn bàn giao tại bàn tiếp nhận */}
          <div className="col-lg-8">
            <div className="card border-0 shadow-sm rounded-3 bg-white">
              <div className="card-body p-2">
                <h5 className="mb-3 fw-bold text-dark d-flex align-items-center gap-2">
                  <FaShieldAlt className="text-primary" />
                  <span>Biên Bản Tiếp Nhận &amp; Kiểm Chuẩn Tiền Phân Tích</span>
                </h5>
                {!current && (
                  <div className="alert alert-info py-2 small mb-3">
                    Chưa chọn ống — chọn trên <strong>danh sách</strong> hoặc quét barcode.
                  </div>
                )}

                <div className="row g-3 mb-3">
                  <div className="col-md-6">
                    <label className="form-label small fw-semibold text-secondary">Vị Trí / Bàn Tiếp Nhận (Theo ca trực) *</label>
                    <input
                      className="form-control bg-light text-dark fw-semibold"
                      value={(() => {
                        const matched = labRooms.find((r) => r.id === selectedRoom);
                        if (roomLabel && roomLabel !== 'Đang tải phòng phân công…') {
                          return selectedRoom && !roomLabel.includes(selectedRoom)
                            ? `${selectedRoom} — ${roomLabel}`
                            : roomLabel;
                        }
                        return matched ? matched.name : (selectedRoom || 'Phòng Lab (Theo ca trực)');
                      })()}
                      readOnly
                      disabled
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label small fw-semibold text-secondary">Thời Điểm Tiếp Nhận (Giờ hiện tại) *</label>
                    <input className="form-control bg-light text-dark fw-semibold font-monospace" value={receiveTime} readOnly disabled />
                  </div>
                  <div className="col-12">
                    <label className="form-label small fw-semibold text-secondary">KTV Tiếp Nhận Phụ Trách (Theo ca trực)</label>
                    <input
                      className="form-control bg-light text-dark fw-semibold"
                      value={
                        selectedReceiverStaff
                          ? formatStaffOption(selectedReceiverStaff)
                          : (technicianName || currentUser?.fullName || 'KTV đang trực ca')
                      }
                      readOnly
                      disabled
                    />
                  </div>
                </div>

                {/* 4 Tiêu chí kiểm chuẩn */}
                <h6 className="small fw-bold text-uppercase text-secondary mt-4 mb-2">
                  Kiểm tra tiêu chuẩn chất lượng mẫu (Pre-analytical Verification):
                </h6>
                {[
                  ['idMatch', '1. Mã Barcode và họ tên bệnh nhân trùng khớp 100% với phiếu chỉ định'],
                  ['intact', '2. Ống nghiệm nguyên vẹn, không nứt vỡ, không rò rỉ bệnh phẩm'],
                  ['tubeOk', '3. Đúng loại ống nghiệm quy định (màu nắp/chất chống đông) và đủ thể tích chạy máy'],
                  ['labeled', '4. Nhãn Barcode dán chuẩn thẳng, ghi nhận rõ thời điểm lấy mẫu'],
                ].map(([key, label]) => (
                  <label key={key} className="d-flex align-items-center gap-2 mb-2 p-2 rounded bg-light border" style={{ cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      className="form-check-input mt-0"
                      checked={checks[key]}
                      onChange={(e) => setChecks((c) => ({ ...c, [key]: e.target.checked }))}
                    />
                    <span className="small text-dark fw-medium">{label}</span>
                  </label>
                ))}

                <label className="form-label small fw-semibold text-secondary mt-3">Ghi Chú Tình Trạng Ống Mẫu Bàn Giao</label>
                <textarea
                  className="form-control mb-3"
                  rows={2}
                  value={handoverNote}
                  onChange={(e) => setHandoverNote(e.target.value)}
                  placeholder="Ghi chú tình trạng huyết tương, thời gian nhịn ăn, phương thức vận chuyển..."
                />

                {canReceive && (
                  <div className="alert alert-success py-2 small mb-3 d-flex align-items-center gap-2">
                    <FaCheckCircle />
                    <span>Mẫu đạt đầy đủ tiêu chuẩn tiền phân tích. Sẵn sàng chuyển trạng thái sang <strong>Đã tiếp nhận (Received)</strong> để đưa vào mẻ phân tích.</span>
                  </div>
                )}

                {/* Khu vực Từ Chối Mẫu (Rejection) */}
                <div className="border-top pt-3 mt-4">
                  <div className="d-flex align-items-center justify-content-between mb-2">
                    <span className="small fw-bold text-danger d-flex align-items-center gap-1">
                      <FaExclamationTriangle /> Từ chối nhận mẫu tại bàn Lab (Tiêu chuẩn loại trừ ISO 15189)
                    </span>
                  </div>

                  <div className="row g-2">
                    <div className="col-md-6">
                      <select
                        className="form-select"
                        value={rejectCode}
                        onChange={(e) => setRejectCode(e.target.value)}
                      >
                        <option value="">-- Chọn lý do từ chối mẫu bệnh phẩm --</option>
                        {REJECTION_CODES.map((r) => (
                          <option key={r.code} value={r.code}>
                            {r.code}: {r.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="col-md-6">
                      <input
                        className="form-control"
                        placeholder="Ghi chú chi tiết lý do từ chối..."
                        value={rejectNote}
                        onChange={(e) => setRejectNote(e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Cảnh báo đặc thù nghiệp vụ Tán huyết (Hemolysis) */}
                  {isHemolysisSelected && (
                    <div className="alert alert-danger mt-3 py-2 small d-flex align-items-center gap-2 rounded-3 border-danger">
                      <FaLock className="fs-5 text-danger" />
                      <div>
                        <strong>RÀNG BUỘC NGHIỆP VỤ ISO 15189:</strong> Mẫu bị <strong>Tán huyết (Hemolysis)</strong>. 
                        Hệ thống sẽ <strong>Khóa phân tích tự động</strong> đối với mẫu này để tránh sai lệch kết quả sinh hóa (K+, AST, LDH) 
                        và tự động gửi yêu cầu <strong>Lấy lại mẫu (Recollect / Rerun)</strong> đến khoa phòng điều trị.
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Chân thẻ hành động */}
              <div className="card-footer bg-white border-top d-flex justify-content-end gap-2 px-3 py-3 rounded-bottom-4" style={{ borderColor: 'rgba(15, 23, 42, 0.05)' }}>
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  style={{ borderRadius: '9999px' }}
                  onClick={() => {
                    setCode('');
                    setCurrent(null);
                    setError(null);
                    setSuccess(null);
                  }}
                >
                  Quét mẫu khác
                </button>
                <button
                  type="button"
                  className="btn btn-outline-danger d-flex align-items-center gap-1"
                  style={{ borderRadius: '9999px' }}
                  disabled={!rejectCode || !current || loading}
                  onClick={() => void onCheckIn(true)}
                >
                  <FaTimes />
                  <span>Xác nhận từ chối mẫu</span>
                </button>
                <button
                  type="button"
                  className="btn d-flex align-items-center gap-2 shadow-sm text-white"
                  style={{ backgroundColor: '#1E60E6', borderColor: '#1E60E6', borderRadius: '9999px' }}
                  disabled={!canReceive || loading}
                  onClick={() => void onCheckIn(false)}
                >
                  {loading ? <FaSpinner className="fa-spin" /> : <FaCheckCircle />}
                  <span>Xác Nhận Tiếp Nhận Mẫu</span>
                </button>
              </div>
            </div>
          </div>

          {/* Cột phải: Thông tin mẫu & Hàng đợi chờ nhận */}
          <div className="col-lg-4">
            {/* Card thông tin mẫu hiện tại */}
            <div className="card border-0 shadow-sm mb-3 bg-white rounded-3">
              <div className="card-body p-3">
                <h6 className="fw-bold text-dark mb-2">Thông Tin Ống Bệnh Phẩm</h6>
                {current ? (
                  <div>
                    <div className="badge bg-primary-subtle text-primary border mb-2 px-2 py-1">
                      {current.status || 'Chờ tiếp nhận'}
                    </div>
                    <div className="fw-bold fs-6 font-monospace text-primary">
                      {current.barcode || current.sampleId || current.id}
                    </div>
                    <div className="small text-secondary mt-1">
                      Màu ống: <strong>{current.tubeColor || 'Tím (EDTA)'}</strong> &bull; {current.anticoagulant || 'K2-EDTA'}
                    </div>
                    <div className="small text-secondary">
                      Thể tích: <strong>{current.volumeMl || 3.0} mL</strong> &bull; Loại: <strong>{current.sampleType || 'Máu toàn phần'}</strong>
                    </div>
                    {(current.collectorName || current.collectedBy) && (
                      <div className="small text-secondary mt-1">
                        Người lấy mẫu: <strong>{current.collectorName || current.collectedBy}</strong>
                      </div>
                    )}
                    {current.handoverBy && (
                      <div className="small text-secondary">
                        Người bàn giao: <strong>{current.handoverBy}</strong>
                      </div>
                    )}
                    {current.assignedTechnicianName && (
                      <div className="small text-secondary">
                        KTV tiếp nhận: <strong>{current.assignedTechnicianName}</strong>
                      </div>
                    )}
                    <div className="small text-muted mt-2 border-top pt-2">
                      Mã Bệnh Nhân: <code>{current.patientId || 'Chưa liên kết'}</code>
                      {current.patientName && <div>Họ tên: <strong>{current.patientName}</strong></div>}
                    </div>
                  </div>
                ) : (
                  <p className="small text-muted mb-0">
                    Vui lòng quét hoặc nhập mã vạch Barcode để tải thông tin chi tiết.
                  </p>
                )}
              </div>
            </div>

            {/* Card quy chuẩn bàn giao */}
            <div className="card border-0 shadow-sm mb-3 bg-white rounded-3">
              <div className="card-body p-3">
                <h6 className="fw-bold text-dark mb-2">Quy Trình Bàn Giao ISO 15189</h6>
                <p className="small text-muted mb-0">
                  Nếu không quét được mã Barcode, hãy kiểm tra nhãn tại phòng lấy mẫu hoặc liên hệ điều dưỡng thu mẫu. 
                  Tuyệt đối không tự ý gán nhãn mã vạch không rõ nguồn gốc.
                </p>
              </div>
            </div>

            <div className="card border-0 shadow-sm bg-white rounded-3">
              <div className="card-body p-3">
                <h6 className="fw-bold text-dark mb-2 d-flex align-items-center gap-1">
                  <FaClock className="text-warning" /> Tóm tắt hàng đợi
                </h6>
                <div className="display-6 fw-bold text-primary">{safePending.length}</div>
                <div className="small text-muted">ống chờ lấy mẫu / đã lấy mẫu / đang vận chuyển</div>
                <p className="small text-muted mb-0 mt-2">
                  Dùng bảng danh sách phía trên để chọn nhanh từng ống — thuận tiện khi Lab đông buổi sáng.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal Xem Chi Tiết Ống Mẫu, Bệnh Nhân & Bác Sĩ Chỉ Định */}
      <Modal show={Boolean(detailSample)} onHide={() => setDetailSample(null)} centered size="lg">
        <Modal.Header closeButton className="bg-light border-bottom">
          <Modal.Title className="h6 fw-bold d-flex align-items-center gap-2">
            <FaVial className="text-primary" />
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
                    <FaSpinner className="fa-spin me-2" /> Đang tải thông tin bác sĩ &amp; phiếu chỉ định...
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
          <button
            type="button"
            className="btn btn-sm btn-primary rounded-pill px-3"
            onClick={() => {
              if (detailSample) selectFromList(detailSample);
              setDetailSample(null);
            }}
          >
            Chọn ống này để tiếp nhận
          </button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}

export default CheckInSamplePage;
