/**
 * @file CheckInSamplePage.jsx
 * @description Tiếp nhận ống mẫu máu tại phòng xét nghiệm & quét mã vạch Barcode (UC41).
 * Tuân thủ: Tiêu chuẩn ISO 15189:2022, Clean Medical Standard (Rule 19) & AGENTS-CODE.md.
 */

import React, { useEffect, useState, useMemo } from 'react';
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
  FaLock
} from 'react-icons/fa';
import { sampleApi } from '../api/sampleApi';
import api from '../../../config/api';

const REJECTION_CODES = [
  { code: 'REJ-01', label: 'Tán huyết (Hemolysis) — Khóa phân tích & Lấy lại mẫu', isHemolysis: true },
  { code: 'REJ-02', label: 'Đông máu / Đông dây sợi huyết (Clotted)', isHemolysis: false },
  { code: 'REJ-03', label: 'Không đủ thể tích mẫu tối thiểu (Insufficient Volume)', isHemolysis: false },
  { code: 'REJ-04', label: 'Sai loại ống nghiệm / Sai chất chống đông (Wrong Container)', isHemolysis: false },
  { code: 'REJ-05', label: 'Rò rỉ / Nứt vỡ ống bệnh phẩm (Leakage / Broken)', isHemolysis: false },
];

export function CheckInSamplePage({ labRoomId = 'LAB-ROOM-01', technicianName = 'KTV. Lê Minh Tuấn' }) {
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
    idMatch: true,     // Đúng định danh bệnh nhân và mã chỉ định
    intact: true,      // Ống mẫu nguyên vẹn, không nứt vỡ
    tubeOk: true,      // Đúng loại ống và đủ thể tích mẫu
    labeled: true,     // Nhãn mã vạch rõ ràng, đủ thời gian lấy mẫu
  });

  const [handoverNote, setHandoverNote] = useState('Ống mẫu nguyên vẹn, vận chuyển đạt chuẩn nhiệt độ SOP.');
  const [receiveTime] = useState(() => new Date().toLocaleString('vi-VN'));

  const loadPending = async () => {
    try {
      const data = await sampleApi.pending();
      setPending(Array.isArray(data) ? data : []);
    } catch {
      setPending([]);
    }
  };

  useEffect(() => {
    loadPending();
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
    const targetCode = code.trim() || current?.barcode || current?.sampleId || current?.id || '';

    if (!targetCode) {
      setError('Không có mã mẫu bệnh phẩm để thực hiện thao tác.');
      return;
    }

    setLoading(true);
    try {
      const res = await sampleApi.checkIn({
        code: targetCode,
        labRoomId,
        rejectionCode: reject ? rejectCode : undefined,
        rejectionNote: reject ? rejectNote : undefined,
        notes: handoverNote
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

  const canReceive =
    Boolean(current) &&
    (current.status === 'Collected' || current.status === 'InTransit' || current.status === 'PendingCollection' || !current.status) &&
    checks.idMatch &&
    checks.intact &&
    checks.tubeOk &&
    checks.labeled;

  const safePending = Array.isArray(pending) ? pending : [];

  return (
    <div style={{ background: '#f8fafc', minHeight: '100vh' }} className="py-3">
      {/* Banner đầu trang chuẩn y khoa ISO 15189 */}
      <div className="text-white px-4 py-3 mb-4 rounded-4 shadow-sm mx-3" style={{ backgroundColor: '#1E60E6' }}>
        <div className="d-flex align-items-center justify-content-between flex-wrap gap-2">
          <div>
            <div className="small opacity-75 d-flex align-items-center gap-1 mb-1">
              <span>Quy trình phòng Lab</span> / <span>Quản lý mẫu</span> / <span>Tiếp nhận ống mẫu</span>
            </div>
            <h3 className="mb-1 fw-bold d-flex align-items-center gap-2">
              <FaBarcode />
              <span>Tiếp Nhận Ống Mẫu Máu &amp; Quét Barcode (Sample Reception)</span>
            </h3>
            <p className="mb-0 small opacity-90">
              Quét mã vạch Code 128, kiểm tra tiêu chí tiền phân tích ISO 15189:2022 và xác nhận bàn giao vào phòng xét nghiệm.
            </p>
          </div>
          <span className="badge bg-light border px-3 py-2 fw-semibold rounded-pill font-monospace" style={{ color: '#1E60E6' }}>
            ISO 15189:2022 §7.3
          </span>
        </div>
      </div>

      <div className="container-fluid px-3" style={{ maxWidth: 1200 }}>
        {/* Hộp quét Barcode */}
        <div className="card border-0 shadow-sm mb-4 bg-white rounded-4" style={{ border: '1px solid rgba(15, 23, 42, 0.05)' }}>
          <div className="card-body p-4">
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
                className="btn d-flex align-items-center gap-2 px-4 shadow-sm text-white"
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
                <span>Tìm thấy ống mẫu &bull; Mã: {current.barcode || current.sampleId} &bull; Trạng thái hiện tại: <strong>{current.status}</strong></span>
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

        <div className="row g-4">
          {/* Cột trái: Kiểm chuẩn bàn giao tại bàn tiếp nhận */}
          <div className="col-lg-8">
            <div className="card border-0 shadow-sm rounded-3 bg-white">
              <div className="card-body p-4">
                <h5 className="mb-3 fw-bold text-dark d-flex align-items-center gap-2">
                  <FaShieldAlt className="text-primary" />
                  <span>Biên Bản Tiếp Nhận &amp; Kiểm Chuẩn Tiền Phân Tích</span>
                </h5>

                <div className="row g-3 mb-3">
                  <div className="col-md-6">
                    <label className="form-label small fw-semibold text-secondary">Vị Trí / Bàn Tiếp Nhận *</label>
                    <select className="form-select" defaultValue={labRoomId}>
                      <option value="LAB-ROOM-01">Bàn 01 &bull; Phòng Xét Nghiệm Huyết Học</option>
                      <option value="LAB-ROOM-02">Bàn 02 &bull; Phòng Xét Nghiệm Hóa Sinh - Miễn Dịch</option>
                      <option value="LAB-ROOM-03">Bàn 03 &bull; Phòng Xét Nghiệm Vi Sinh</option>
                    </select>
                  </div>
                  <div className="col-md-6">
                    <label className="form-label small fw-semibold text-secondary">Thời Điểm Tiếp Nhận *</label>
                    <input className="form-control" value={receiveTime} readOnly />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label small fw-semibold text-secondary">Người Bàn Giao</label>
                    <input className="form-control" defaultValue="ĐD. Hoàng Mai Lan (Khoa Khám Bệnh)" />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label small fw-semibold text-secondary">KTV Tiếp Nhận Phụ Trách</label>
                    <input className="form-control" value={technicianName} readOnly />
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
              <div className="card-footer bg-white border-top d-flex justify-content-end gap-2 px-4 py-3 rounded-bottom-4" style={{ borderColor: 'rgba(15, 23, 42, 0.05)' }}>
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

            {/* Hàng đợi mẫu chờ tiếp nhận */}
            <div className="card border-0 shadow-sm bg-white rounded-3">
              <div className="card-header bg-white border-bottom py-2 d-flex justify-content-between align-items-center">
                <h6 className="small fw-bold text-dark mb-0 d-flex align-items-center gap-1">
                  <FaClock className="text-warning" />
                  <span>Mẫu chờ tiếp nhận ({safePending.length})</span>
                </h6>
                <button
                  type="button"
                  className="btn btn-sm btn-link p-0 text-decoration-none"
                  onClick={loadPending}
                  title="Tải lại hàng đợi"
                >
                  <FaSyncAlt />
                </button>
              </div>
              <div className="card-body p-2">
                <ul className="list-unstyled mb-0">
                  {safePending.slice(0, 6).map((p) => (
                    <li key={p.sampleId || p.id || p.barcode} className="small py-2 border-bottom d-flex justify-content-between align-items-center">
                      <div>
                        <button
                          type="button"
                          className="btn btn-link btn-sm p-0 text-start font-monospace text-decoration-none fw-semibold"
                          onClick={() => {
                            setCode(p.barcode || p.sampleId || p.id);
                            setCurrent(p);
                          }}
                        >
                          {p.barcode || p.sampleId || p.id}
                        </button>
                        <div className="text-muted" style={{ fontSize: '0.72rem' }}>
                          {p.patientName || p.patientId || 'Bệnh nhân'} &bull; {p.tubeColor || 'Purple'}
                        </div>
                      </div>
                      <span className="badge bg-light text-dark border">
                        {p.status || 'Collected'}
                      </span>
                    </li>
                  ))}
                  {safePending.length === 0 && (
                    <li className="text-muted small text-center py-3">
                      Hiện không có mẫu bệnh phẩm nào chờ tiếp nhận
                    </li>
                  )}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CheckInSamplePage;
