/** @file LabProfilesPage.jsx
 * @description UC61 professional Lab profile workspace, reusing the existing clinical layout and Bootstrap components.
 */
import React, { useEffect, useState } from 'react';
import { Alert, Button, Form, Modal, Table } from 'react-bootstrap';
import { Eye, Plus, RotateCw, Search, X as LucideX, UserCog } from 'lucide-react';
import { getLabProfile, getLabProfileRooms, getLabProfiles, labProfileError } from '../api/labProfileApi';
import '../../../components/common/SkeletonProfile.css';
import LabProfileFormModal from '../components/LabProfileFormModal';
import DeleteLabProfileModal from '../components/DeleteLabProfileModal';

const defaults = { search: '', roomId: '', createdFrom: '', createdTo: '', page: 1, pageSize: 20 };
const date = (value) => value ? new Date(value).toLocaleString('vi-VN') : 'Chưa ghi nhận';

/** Displays existing staff professional profiles, never credentials or fabricated records. */
export default function LabProfilesPage() {
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState(defaults);
  const [rooms, setRooms] = useState([]);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refresh, setRefresh] = useState(0);
  const [selectedId, setSelectedId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailError, setDetailError] = useState('');
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailRefresh, setDetailRefresh] = useState(0);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [success, setSuccess] = useState('');
  const invalidDates = filters.createdFrom && filters.createdTo && filters.createdFrom > filters.createdTo;

  useEffect(() => {
    const timer = setTimeout(() => setFilters((current) => current.search === search.trim() ? current : { ...current, search: search.trim(), page: 1 }), 300);
    return () => clearTimeout(timer);
  }, [search]);
  useEffect(() => {
    const controller = new AbortController();
    setError('');
    if (invalidDates) { setLoading(false); setData(null); return () => controller.abort(); }
    setLoading(true);
    const params = Object.fromEntries(Object.entries(filters).filter(([, value]) => value !== ''));
    Promise.all([getLabProfiles(params, controller.signal), getLabProfileRooms(controller.signal)])
      .then(([result, options]) => { if (!controller.signal.aborted) { setData(result); setRooms(options); } })
      .catch((err) => { if (!controller.signal.aborted) { setData(null); setError(labProfileError(err)); } })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [filters, refresh, invalidDates]);
  useEffect(() => {
    const controller = new AbortController();
    setDetail(null); setDetailError('');
    if (!selectedId) return () => controller.abort();
    setDetailLoading(true);
    // Closing or replacing the modal cancels the prior request so another employee's data cannot replace it.
    getLabProfile(selectedId, controller.signal).then((result) => { if (!controller.signal.aborted) setDetail(result); })
      .catch((err) => { if (!controller.signal.aborted) setDetailError(labProfileError(err)); })
      .finally(() => { if (!controller.signal.aborted) setDetailLoading(false); });
    return () => controller.abort();
  }, [selectedId, detailRefresh]);
  const change = (key, value) => setFilters((current) => ({ ...current, [key]: value, page: 1 }));
  const clear = () => { setSearch(''); setFilters({ ...defaults }); };
  const saved = (message) => { setCreating(false); setEditing(null); setDeleting(null); setSuccess(message); setFilters((v) => ({ ...v, page: 1 })); setRefresh((v) => v + 1); };
  const reload = (id) => { setEditing(null); setDeleting(null); setSelectedId(id); setDetailRefresh((v) => v + 1); setRefresh((v) => v + 1); };
  const skeleton = <div aria-busy="true" aria-label="Đang tải hồ sơ Lab">{[1, 2, 3, 4].map((n) => <div key={n} className="bms-skeleton mb-3" style={{ height: 38 }} />)}</div>;

  const hasActiveFilters = search !== '' || filters.roomId !== '' || filters.createdFrom !== '' || filters.createdTo !== '';

  return <div className="w-100 py-1">
    <div className="bms-page-header-card mb-4">
      <div className="bms-page-header-content flex-column align-items-start">
        <div className="bms-page-title-row">
          <h1 className="bms-page-title">Hồ Sơ Chuyên Môn Phòng Lab</h1>
        </div>
        <p className="text-muted small m-0 mt-1">
          Quản lý hồ sơ năng lực chuyên môn và phòng làm việc mặc định của nhân sự xét nghiệm
        </p>
      </div>
      <div className="bms-page-actions">
        <Button variant="outline-primary" size="sm" className="rounded-pill px-3 py-2 fw-semibold d-flex align-items-center gap-2" disabled={loading} onClick={() => setRefresh((v) => v + 1)} style={{ borderColor: '#1E60E6', color: '#1E60E6' }}><RotateCw size={12} /><span>Làm mới</span></Button>
        <Button size="sm" className="rounded-pill px-3 py-2 fw-semibold d-flex align-items-center gap-2" disabled={loading || !rooms.length} onClick={() => setCreating(true)} style={{ background: '#1E60E6', borderColor: '#1E60E6' }}><Plus size={12} /><span>Thêm hồ sơ</span></Button>
      </div>
    </div>

    <div className="bms-filter-bar mb-3">
      <div className="bms-search-input-pill">
        <Search className="bms-search-icon"  size="1em"/>
        <input
          id="lab-profile-search"
          type="text"
          value={search}
          maxLength={100}
          placeholder="Tìm họ tên, trình độ chuyên môn hoặc ID tài khoản..."
          onChange={(e) => setSearch(e.target.value)}
        />
        {search && (
          <button type="button" className="bms-search-clear" onClick={() => setSearch('')} title="Xóa tìm kiếm">
            <LucideX size={12} />
          </button>
        )}
      </div>

      <Form.Select id="lab-profile-room" value={filters.roomId} onChange={(e) => change('roomId', e.target.value)} style={{ width: 'auto' }}>
        <option value="">Tất cả phòng mặc định</option>
        {rooms.map((room) => <option key={room.id} value={room.id}>{room.code} — {room.name}</option>)}
      </Form.Select>

      <Form.Control id="lab-profile-from" type="date" value={filters.createdFrom} onChange={(e) => change('createdFrom', e.target.value)} title="Ngày tạo từ" style={{ width: 'auto' }} />
      <Form.Control id="lab-profile-to" type="date" value={filters.createdTo} onChange={(e) => change('createdTo', e.target.value)} title="Ngày tạo đến" style={{ width: 'auto' }} />

      {hasActiveFilters && (
        <Button variant="outline-secondary" size="sm" className="rounded-pill px-3 text-nowrap" onClick={clear}>
          Đặt lại
        </Button>
      )}

      <span className="bms-filter-meta" role="status">
        Hiển thị <strong>{data?.total ?? 0}</strong> kết quả
      </span>
    </div>

    {invalidDates && <Alert variant="warning" className="rounded-3">Ngày bắt đầu phải trước hoặc bằng ngày kết thúc.</Alert>}
    {success && <Alert variant="success" dismissible onClose={() => setSuccess('')} className="rounded-3">{success}</Alert>}
    {error && <Alert variant="danger" role="alert" className="rounded-3">{error} <Button variant="outline-danger" size="sm" onClick={() => setRefresh((v) => v + 1)} className="rounded-pill ms-2">Thử lại</Button></Alert>}

    <div className="bms-table-standalone-section">
      <div className="bms-table-standalone-header">
        <h6 className="bms-table-standalone-title">Danh sách hồ sơ chuyên môn</h6>
        <span className="text-muted small" style={{ fontVariantNumeric: 'tabular-nums' }}>{data?.total ?? 0} hồ sơ</span>
      </div>
      <div className="bms-table-standalone-body">
        {loading ? <div className="p-3">{skeleton}</div> : data?.items.length ? <>
          <Table responsive hover className="align-middle mb-0">
            <thead>
              <tr>
                <th>Họ và tên / ID tài khoản</th>
                <th>Trình độ chuyên môn</th>
                <th>Phòng mặc định</th>
                <th>Ngày tạo</th>
                <th className="text-end pe-4">Chi tiết</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((row) => (
                <tr key={row.id}>
                  <td>
                    <div className="fw-semibold" style={{ color: '#0f2743' }}>{row.fullName}</div>
                    <small className="font-monospace" style={{ color: '#1E60E6' }}>{row.id}</small>
                  </td>
                  <td style={{ whiteSpace: 'pre-wrap' }}>{row.qualification || 'Chưa ghi nhận'}</td>
                  <td>
                    <span style={{ display: 'inline-block', padding: '2px 10px', borderRadius: 9999, background: '#EEF2F6', color: '#475569', fontSize: 12 }}>
                      {row.roomName || 'Chưa phân phòng'}
                    </span>
                  </td>
                  <td className="text-nowrap" style={{ fontVariantNumeric: 'tabular-nums' }}>{date(row.createdAt)}</td>
                  <td className="text-end pe-4">
                    <Button variant="outline-primary" size="sm" className="rounded-pill text-nowrap" aria-label={`Xem hồ sơ ${row.fullName}`} onClick={() => setSelectedId(row.id)}>
                      <Eye className="me-1"  size="1em"/> Xem
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
          <div className="d-flex flex-wrap justify-content-between align-items-center gap-3">
            <Form.Select aria-label="Số hồ sơ mỗi trang" style={{ width: 170, borderRadius: 10 }} value={filters.pageSize} onChange={(e) => change('pageSize', Number(e.target.value))}>{[20, 50, 100].map((n) => <option key={n} value={n}>{n} hồ sơ / trang</option>)}</Form.Select>
            <div className="d-flex align-items-center gap-3">
              <Button size="sm" variant="outline-primary" className="rounded-pill px-3" disabled={data.page <= 1} onClick={() => setFilters((v) => ({ ...v, page: v.page - 1 }))}>Trước</Button>
              <span className="small text-muted" style={{ fontVariantNumeric: 'tabular-nums' }}>Trang {data.page}/{data.totalPages}</span>
              <Button size="sm" variant="outline-primary" className="rounded-pill px-3" disabled={data.page >= data.totalPages} onClick={() => setFilters((v) => ({ ...v, page: v.page + 1 }))}>Sau</Button>
            </div>
          </div>
        </> : !error && !invalidDates && <div className="text-center text-muted py-4"><UserCog size={36} className="mb-3" style={{ color: '#1E60E6', opacity: 0.5 }} /><h5>Chưa có hồ sơ phù hợp</h5><p className="small">Không có dữ liệu hoặc cần thay đổi bộ lọc tìm kiếm.</p><Button variant="outline-primary" className="rounded-pill px-3" onClick={clear}>Xóa bộ lọc</Button></div>}
      </div>
    </div>
    <Modal show={Boolean(selectedId)} onHide={() => setSelectedId(null)} size="lg" scrollable centered><Modal.Header closeButton style={{ borderBottom: '1px solid rgba(15, 23, 42, 0.05)' }}><Modal.Title className="h5 fw-bold" style={{ color: '#0f2743' }}><UserCog className="me-2" style={{ color: '#1E60E6' }}  size="1em"/>Chi tiết hồ sơ Lab</Modal.Title></Modal.Header><Modal.Body className="p-2">
      {detailLoading ? skeleton : detailError ? <Alert variant="danger" style={{ borderRadius: 14 }}>{detailError} <Button variant="outline-danger" size="sm" onClick={() => setDetailRefresh((v) => v + 1)} style={{ borderRadius: 9999 }}>Thử lại</Button></Alert> : detail && <>
        <h5 className="fw-bold" style={{ color: '#1E60E6' }}>{detail.fullName}</h5><dl className="row mb-0"><dt className="col-sm-4 text-muted">ID tài khoản liên kết</dt><dd className="col-sm-8 font-monospace text-break" style={{ color: '#1E60E6' }}>{detail.id}</dd><dt className="col-sm-4 text-muted">Trình độ chuyên môn</dt><dd className="col-sm-8" style={{ whiteSpace: 'pre-wrap' }}>{detail.qualification || 'Chưa ghi nhận'}</dd><dt className="col-sm-4 text-muted">Phòng mặc định</dt><dd className="col-sm-8"><span style={{ display: 'inline-block', padding: '3px 12px', borderRadius: 9999, background: 'rgba(30, 96, 230, 0.1)', color: '#1E60E6', fontWeight: 600 }}>{detail.roomName || 'Chưa phân phòng'}</span></dd><dt className="col-sm-4 text-muted">Ngày tạo</dt><dd className="col-sm-8" style={{ fontVariantNumeric: 'tabular-nums' }}>{date(detail.createdAt)}</dd><dt className="col-sm-4 text-muted">Cập nhật gần nhất</dt><dd className="col-sm-8" style={{ fontVariantNumeric: 'tabular-nums' }}>{date(detail.updatedAt)}</dd></dl>
        <p className="small text-muted mt-3 mb-0" style={{ background: '#EEF2F6', padding: '8px 12px', borderRadius: 10 }}>Đây là hồ sơ chuyên môn; thông tin đăng nhập và phân công theo ca được quản lý riêng.</p>
      </>}
    </Modal.Body><Modal.Footer style={{ borderTop: '1px solid rgba(15, 23, 42, 0.05)' }}>{detail?.id === selectedId && <><Button variant="outline-danger" disabled={detailLoading} onClick={() => { setDeleting(detail); setSelectedId(null); }} style={{ borderRadius: 9999 }}>Xóa hồ sơ</Button><Button disabled={detailLoading} onClick={() => { setEditing(detail); setSelectedId(null); }} style={{ borderRadius: 9999, background: '#1E60E6', borderColor: '#1E60E6' }}>Chỉnh sửa hồ sơ</Button></>}<Button variant="secondary" onClick={() => setSelectedId(null)} style={{ borderRadius: 9999 }}>Đóng</Button></Modal.Footer></Modal>
    {creating && <LabProfileFormModal rooms={rooms} onClose={() => setCreating(false)} onSaved={saved} />}
    {editing && <LabProfileFormModal profile={editing} rooms={rooms} onClose={() => setEditing(null)} onSaved={saved} onReload={() => reload(editing.id)} />}
    {deleting && <DeleteLabProfileModal profile={deleting} onClose={() => setDeleting(null)} onDeleted={saved} onReload={() => reload(deleting.id)} />}
  </div>;
}
