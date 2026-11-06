import '../walkin.css';
import React, { useState } from 'react';
import { useRegisterWalkIn } from '../hooks/useRegisterWalkIn';
import { walkInApi } from '../api/walkInApi';
import { queueApi } from '../../reception/api/queueApi';

const emptyForm = {
  fullName: '',
  dateOfBirth: '',
  gender: 'Male',
  phone: '',
  identityNumber: '',
  email: '',
  address: '',
  bloodType: '',
  medicalHistory: '',
  priority: 'NORMAL',
};

/** UC26 – Tiếp nhận khách vãng lai & Đăng ký hồ sơ tại quầy (ISO 15189:2022). */
export function RegisterWalkInPage({ onSuccess }) {
  const { register, loading, error, result, reset } = useRegisterWalkIn();
  const [form, setForm] = useState(emptyForm);
  const [lookupMsg, setLookupMsg] = useState(null);
  const [checks, setChecks] = useState({
    identity: true,
    fasting: true,
    meds: true,
    consent: true,
  });
  const [receptionNotes, setReceptionNotes] = useState('');
  const [issuedTicket, setIssuedTicket] = useState(null);
  const [isIssuingTicket, setIsIssuingTicket] = useState(false);

  const set = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const onLookupCccd = async () => {
    if (!form.identityNumber) return;
    setLookupMsg(null);
    try {
      const res = await walkInApi.lookupByIdentity(form.identityNumber);
      if (res.exists) {
        setLookupMsg(`Đã có hồ sơ trên hệ thống: ${res.fullName} (Mã: ${res.patientId}). Không cần tạo mới.`);
      } else {
        setLookupMsg('Số CCCD chưa có trên hệ thống — sẵn sàng đăng ký hồ sơ khách vãng lai mới.');
      }
    } catch {
      setLookupMsg('Không thể đối soát thông tin CCCD lúc này.');
    }
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await register(form);
      onSuccess?.(res.patientId);
    } catch {
      /* handled by hook */
    }
  };

  const handleIssueWalkInTicket = async () => {
    if (!result) return;
    try {
      setIsIssuingTicket(true);
      const res = await queueApi.issueNextTicket({
        patientId: result.patientId,
        patientName: result.fullName,
        patientCode: result.patientId,
        packageName: 'Xét nghiệm máu vãng lai',
        isWalkIn: true,
        priority: form.priority === 'HIGH' ? 2 : 1
      });
      if (res?.data) {
        setIssuedTicket(res.data);
      }
    } catch (err) {
      alert('Lỗi cấp số: ' + (err.message || 'Không thể kết nối bảng gọi số'));
    } finally {
      setIsIssuingTicket(false);
    }
  };

  if (result) {
    return (
      <div className="container py-4" style={{ maxWidth: 760 }}>
        <div className="card shadow-sm border-0 rounded-3 overflow-hidden">
          <div className="card-header bg-success text-white py-3">
            <h5 className="mb-0 fw-bold">
              <i className="fas fa-check-circle me-2"></i>
              Tiếp Nhận Khách Vãng Lai Thành Công
            </h5>
          </div>
          <div className="card-body p-4">
            <div className="row g-3">
              <div className="col-md-6">
                <div className="p-3 bg-light rounded-2">
                  <div className="text-muted small">Mã định danh bệnh nhân:</div>
                  <div className="fs-5 fw-bold text-primary">{result.patientId}</div>
                </div>
              </div>
              <div className="col-md-6">
                <div className="p-3 bg-light rounded-2">
                  <div className="text-muted small">Họ và tên bệnh nhân:</div>
                  <div className="fs-5 fw-bold text-dark">{result.fullName}</div>
                </div>
              </div>
              <div className="col-md-6">
                <div className="p-3 bg-light rounded-2">
                  <div className="text-muted small">Độ ưu tiên tiếp đón:</div>
                  <span className={`badge ${result.priority === 'HIGH' ? 'bg-danger' : 'bg-primary'}`}>
                    {result.priority === 'HIGH' ? 'Ưu tiên (Cao tuổi/Phụ nữ mang thai)' : 'Tiêu chuẩn (Routine)'}
                  </span>
                </div>
              </div>
              <div className="col-md-6">
                <div className="p-3 bg-light rounded-2">
                  <div className="text-muted small">Trạng thái hồ sơ:</div>
                  <span className="badge bg-success">Hồ sơ đã kích hoạt</span>
                </div>
              </div>
            </div>

            {issuedTicket ? (
              <div className="mt-4 p-4 text-center rounded-3 border-2" style={{ background: '#eff6ff', border: '2px solid #bfdbfe' }}>
                <div className="text-primary fw-bold small text-uppercase">Số Thứ Tự Lấy Mẫu Đã Cấp</div>
                <div style={{ fontSize: '3rem', fontWeight: '800', color: '#1E60E6', lineHeight: 1.2 }}>
                  {issuedTicket.ticketNumber}
                </div>
                <div className="text-muted small mt-1">
                  Đã chuyển tiếp vào <strong>Màn hình điều phối hàng đợi (/reception/queue)</strong>
                </div>
                <div className="mt-3 d-flex justify-content-center gap-2">
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => { window.location.href = '/reception/queue'; }}
                  >
                    <i className="fas fa-desktop me-1"></i> Đến Bảng Gọi Số
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-4 p-3 bg-light rounded-3 d-flex align-items-center justify-content-between">
                <div>
                  <div className="fw-bold text-dark">Bước tiếp theo: Cấp số thứ tự lấy mẫu</div>
                  <div className="small text-muted">Đưa bệnh nhân vào hàng đợi tại Phòng Lấy Mẫu 101</div>
                </div>
                <button
                  type="button"
                  className="btn btn-success fw-bold px-3 py-2"
                  onClick={handleIssueWalkInTicket}
                  disabled={isIssuingTicket}
                >
                  <i className="fas fa-ticket-alt me-1"></i>
                  {isIssuingTicket ? 'Đang cấp số…' : 'Cấp STT Lấy Mẫu Ngay'}
                </button>
              </div>
            )}

            <hr className="my-4" />

            <div className="d-flex justify-content-between">
              <button
                type="button"
                className="btn btn-outline-secondary"
                onClick={() => {
                  reset();
                  setForm(emptyForm);
                  setLookupMsg(null);
                  setIssuedTicket(null);
                }}
              >
                <i className="fas fa-user-plus me-1"></i> Tiếp nhận bệnh nhân khác
              </button>
              <button
                type="button"
                className="btn btn-outline-primary"
                onClick={() => { window.location.href = '/invoices'; }}
              >
                <i className="fas fa-cash-register me-1"></i> Quầy Thu Viện Phí & Hóa Đơn
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid py-3" style={{ background: '#f5f7fb', minHeight: '100vh' }}>
      <div className="mb-2 text-muted small">BMS / Quầy Tiếp Đón Lễ Tân</div>
      <h3 className="fw-bold mb-1">Tiếp Nhận Khách Vãng Lai & Tạo Hồ Sơ</h3>
      <p className="text-muted mb-4">
        Tiếp đón tại quầy · Tạo hồ sơ bệnh nhân mới chưa đặt lịch trực tuyến (Đề án 06 & Tiêu chuẩn ISO 15189)
      </p>

      <div className="row g-4">
        <div className="col-lg-8">
          <form onSubmit={onSubmit} className="card border-0 shadow-sm">
            <div className="card-body p-4">
              {error && <div className="alert alert-danger py-2">{error}</div>}
              {lookupMsg && <div className="alert alert-info py-2">{lookupMsg}</div>}

              <h5 className="mb-3 text-primary fw-bold">
                <i className="fas fa-id-card me-2"></i> Thông Tin Định Danh Bệnh Nhân
              </h5>
              <div className="row g-3 mb-4">
                <div className="col-md-8">
                  <label className="form-label text-muted small">Họ và tên bệnh nhân *</label>
                  <input
                    className="form-control"
                    style={{ minHeight: 44 }}
                    required
                    placeholder="VD: NGUYỄN VĂN AN"
                    value={form.fullName}
                    onChange={(e) => set('fullName', e.target.value)}
                  />
                </div>
                <div className="col-md-4">
                  <label className="form-label text-muted small">Giới tính *</label>
                  <select
                    className="form-select"
                    style={{ minHeight: 44 }}
                    value={form.gender}
                    onChange={(e) => set('gender', e.target.value)}
                  >
                    <option value="Male">Nam</option>
                    <option value="Female">Nữ</option>
                    <option value="Other">Khác</option>
                  </select>
                </div>
                <div className="col-md-4">
                  <label className="form-label text-muted small">Ngày sinh *</label>
                  <input
                    type="date"
                    className="form-control"
                    style={{ minHeight: 44 }}
                    required
                    value={form.dateOfBirth}
                    onChange={(e) => set('dateOfBirth', e.target.value)}
                  />
                </div>
                <div className="col-md-5">
                  <label className="form-label text-muted small">Số CCCD / Định danh cá nhân *</label>
                  <div className="input-group">
                    <input
                      className="form-control"
                      style={{ minHeight: 44 }}
                      required
                      placeholder="12 chữ số CCCD"
                      pattern="\d{9}|\d{12}"
                      value={form.identityNumber}
                      onChange={(e) => set('identityNumber', e.target.value)}
                    />
                    <button
                      type="button"
                      className="btn btn-outline-secondary"
                      onClick={() => void onLookupCccd()}
                    >
                      Đối soát
                    </button>
                  </div>
                </div>
                <div className="col-md-3">
                  <label className="form-label text-muted small">Số điện thoại liên hệ *</label>
                  <input
                    className="form-control"
                    style={{ minHeight: 44 }}
                    required
                    placeholder="VD: 0912345678"
                    value={form.phone}
                    onChange={(e) => set('phone', e.target.value)}
                  />
                </div>
                <div className="col-md-6">
                  <label className="form-label text-muted small">Email (nhận kết quả điện tử)</label>
                  <input
                    type="email"
                    className="form-control"
                    style={{ minHeight: 44 }}
                    placeholder="email@example.com"
                    value={form.email ?? ''}
                    onChange={(e) => set('email', e.target.value)}
                  />
                </div>
                <div className="col-md-6">
                  <label className="form-label text-muted small">Nhóm máu (nếu đã biết)</label>
                  <input
                    className="form-control"
                    style={{ minHeight: 44 }}
                    placeholder="VD: O+, A+, B+..."
                    value={form.bloodType ?? ''}
                    onChange={(e) => set('bloodType', e.target.value)}
                  />
                </div>
                <div className="col-12">
                  <label className="form-label text-muted small">Địa chỉ thường trú</label>
                  <input
                    className="form-control"
                    style={{ minHeight: 44 }}
                    placeholder="Số nhà, đường, phường/xã, quận/huyện, tỉnh/thành phố"
                    value={form.address ?? ''}
                    onChange={(e) => set('address', e.target.value)}
                  />
                </div>
              </div>

              <h5 className="mb-3 text-primary fw-bold">
                <i className="fas fa-clipboard-check me-2"></i> Tiêu Chuẩn Tiền Phân Tích (ISO 15189:2022)
              </h5>
              {(
                [
                  ['identity', 'Đối chiếu thông tin bệnh nhân trùng khớp giấy tờ tùy thân / VNeID'],
                  ['fasting', 'Bệnh nhân đã nhịn ăn đúng yêu cầu 8–12 giờ trước khi lấy máu'],
                  ['meds', 'Ghi nhận tiền sử dùng thuốc, tiểu đường hoặc dị ứng'],
                  ['consent', 'Bệnh nhân đồng thuận thực hiện quy trình lấy mẫu xét nghiệm y khoa'],
                ]
              ).map(([key, label]) => (
                <label key={key} className="d-flex align-items-center gap-2 mb-2">
                  <input
                    type="checkbox"
                    className="form-check-input"
                    checked={checks[key]}
                    onChange={(e) => setChecks((c) => ({ ...c, [key]: e.target.checked }))}
                  />
                  <span>{label}</span>
                </label>
              ))}

              <label className="form-label text-muted small mt-3">Ghi chú lâm sàng của lễ tân</label>
              <textarea
                className="form-control mb-3"
                rows={2}
                placeholder="Ghi chú thêm về tình trạng thể chất của người bệnh nếu cần..."
                value={receptionNotes}
                onChange={(e) => setReceptionNotes(e.target.value)}
              />

              <label className="form-label text-muted small">Độ ưu tiên hàng đợi</label>
              <select
                className="form-select"
                style={{ minHeight: 44, maxWidth: 360 }}
                value={form.priority}
                onChange={(e) => set('priority', e.target.value)}
              >
                <option value="NORMAL">Tiêu chuẩn (Routine - Khách vãng lai thông thường)</option>
                <option value="HIGH">Ưu tiên (Người già &gt;75t, phụ nữ mang thai, trẻ sơ sinh)</option>
              </select>
            </div>
            <div className="card-footer bg-white border-0 d-flex justify-content-between px-4 py-3">
              <span className="text-muted small">
                <i className="fas fa-info-circle me-1"></i> Hồ sơ sau khi lưu sẽ sẵn sàng cấp STT lấy mẫu.
              </span>
              <div className="d-flex gap-2">
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  style={{ minHeight: 44 }}
                  onClick={() => setForm(emptyForm)}
                >
                  Làm mới
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ minHeight: 44, backgroundColor: '#1e40af', borderColor: '#1e40af' }}
                  disabled={loading}
                >
                  {loading ? 'Đang lưu hồ sơ…' : 'Xác Nhận Tiếp Nhận'}
                </button>
              </div>
            </div>
          </form>
        </div>
        <div className="col-lg-4">
          <div className="card border-0 shadow-sm mb-3">
            <div className="card-body">
              <h6 className="fw-bold text-dark">
                <i className="fas fa-shield-alt text-success me-2"></i>
                Quy Chuẩn An Toàn Phòng Xét Nghiệm
              </h6>
              <p className="small text-muted mb-0">
                Nếu thông tin người bệnh không khớp với giấy tờ hoặc chưa tuân thủ nhịn ăn (đối với xét nghiệm đường huyết, mỡ máu), hướng dẫn người bệnh và xin ý kiến bác sĩ phụ trách.
              </p>
            </div>
          </div>
          <div className="card border-0 shadow-sm" style={{ background: '#eff6ff', border: '1px solid #bfdbfe' }}>
            <div className="card-body">
              <h6 className="fw-bold text-primary">
                <i className="fas fa-receipt me-2"></i>
                Chính Sách Viện Phí & Thu Ngân
              </h6>
              <p className="small text-muted mb-0">
                Khách vãng lai cần hoàn tất đóng viện phí tại quầy hoặc ứng dụng trước khi tiến hành kỹ thuật lấy mẫu máu tại phòng 101.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default RegisterWalkInPage;
