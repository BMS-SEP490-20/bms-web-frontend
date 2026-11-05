/** @file LabProfilesPage.jsx
 * @description UC61 professional Lab profile workspace, reusing the existing clinical layout and Bootstrap components.
 */
import React, { useEffect, useState } from 'react';
import { Alert, Breadcrumb, Button, Card, Col, Form, Modal, Row, Table } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { FaEye, FaRedo, FaSearch, FaUsersCog } from 'react-icons/fa';
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

  return <div className="py-3">
    <Breadcrumb><Breadcrumb.Item linkAs={Link} linkProps={{ to: '/dashboard' }}>Trang Chủ</Breadcrumb.Item><Breadcrumb.Item active>Hồ sơ Lab</Breadcrumb.Item></Breadcrumb>
    <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
      <div><h4 className="fw-bold mb-1" style={{ color: '#0f2743' }}><FaUsersCog className="me-2" style={{ color: '#1E60E6' }} />Quản Lý Hồ Sơ Lab</h4><p className="text-muted mb-0 small">Thông tin chuyên môn và phòng mặc định của nhân viên xét nghiệm.</p></div>
      <div className="d-flex gap-2">
        <Button variant="outline-primary" disabled={loading} onClick={() => setRefresh((v) => v + 1)} style={{ borderRadius: 9999, borderColor: '#1E60E6', color: '#1E60E6' }}><FaRedo className="me-2" />Làm mới</Button>
        <Button disabled={loading || !rooms.length} onClick={() => setCreating(true)} style={{ borderRadius: 9999, background: '#1E60E6', borderColor: '#1E60E6', boxShadow: '0 4px 14px rgba(30, 96, 230, 0.25)' }}>Thêm hồ sơ</Button>
      </div>
    </div>
    <Card className="border-0 shadow-sm mb-4" style={{ border: '1px solid rgba(15, 23, 42, 0.05)', borderRadius: 18, background: '#ffffff' }}><Card.Body className="p-4"><Row className="g-3 align-items-end">
      <Col lg={4}><Form.Label htmlFor="lab-profile-search" className="small fw-semibold text-secondary"><FaSearch className="me-2" style={{ color: '#1E60E6' }} />Tìm kiếm</Form.Label><Form.Control id="lab-profile-search" value={search} maxLength={100} placeholder="Họ tên, trình độ chuyên môn hoặc ID tài khoản" onChange={(e) => setSearch(e.target.value)} style={{ background: '#EEF2F6', border: '1px solid rgba(15, 23, 42, 0.05)', borderRadius: 10 }} /></Col>
      <Col lg={2} sm={6}><Form.Label htmlFor="lab-profile-room" className="small fw-semibold text-secondary">Phòng mặc định</Form.Label><Form.Select id="lab-profile-room" value={filters.roomId} onChange={(e) => change('roomId', e.target.value)} style={{ background: '#EEF2F6', border: '1px solid rgba(15, 23, 42, 0.05)', borderRadius: 10 }}><option value="">Tất cả</option>{rooms.map((room) => <option key={room.id} value={room.id}>{room.code} — {room.name}</option>)}</Form.Select></Col>
      <Col lg={2} sm={6}><Form.Label htmlFor="lab-profile-from" className="small fw-semibold text-secondary">Ngày tạo từ</Form.Label><Form.Control id="lab-profile-from" type="date" value={filters.createdFrom} onChange={(e) => change('createdFrom', e.target.value)} style={{ background: '#EEF2F6', border: '1px solid rgba(15, 23, 42, 0.05)', borderRadius: 10 }} /></Col>
      <Col lg={2} sm={6}><Form.Label htmlFor="lab-profile-to" className="small fw-semibold text-secondary">Ngày tạo đến</Form.Label><Form.Control id="lab-profile-to" type="date" value={filters.createdTo} onChange={(e) => change('createdTo', e.target.value)} style={{ background: '#EEF2F6', border: '1px solid rgba(15, 23, 42, 0.05)', borderRadius: 10 }} /></Col>
      <Col lg={2} sm={6}><Button variant="outline-secondary" className="w-100" onClick={clear} style={{ borderRadius: 9999, borderColor: 'rgba(15, 23, 42, 0.05)' }}>Xóa bộ lọc</Button></Col>
    </Row><p className="text-muted small mt-3 mb-0">Hồ sơ cũ chưa ghi nhận ngày tạo sẽ không nằm trong bộ lọc khoảng ngày. Phòng mặc định không thay thế lịch phân công theo ca.</p></Card.Body></Card>
    {invalidDates && <Alert variant="warning" style={{ borderRadius: 14, background: 'rgba(231, 188, 76, 0.12)', border: '1px solid rgba(231, 188, 76, 0.3)', color: '#856404' }}>Ngày bắt đầu phải trước hoặc bằng ngày kết thúc.</Alert>}
    {success && <Alert variant="success" dismissible onClose={() => setSuccess('')} style={{ borderRadius: 14, background: 'rgba(145, 222, 131, 0.18)', border: '1px solid rgba(145, 222, 131, 0.35)', color: '#1e7e34' }}>{success}</Alert>}
    {error && <Alert variant="danger" role="alert" style={{ borderRadius: 14, background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.25)', color: '#b91c1c' }}>{error} <Button variant="outline-danger" size="sm" onClick={() => setRefresh((v) => v + 1)} style={{ borderRadius: 9999 }}>Thử lại</Button></Alert>}
    <Card className="border-0 shadow-sm" style={{ border: '1px solid rgba(15, 23, 42, 0.05)', borderRadius: 18, overflow: 'hidden' }}><Card.Body className="p-0"><div className="d-flex justify-content-between align-items-center p-3 border-bottom" style={{ background: '#ffffff' }}><h6 className="fw-bold mb-0" style={{ color: '#0f2743' }}>Danh sách hồ sơ chuyên môn</h6><span className="text-muted small" role="status" style={{ fontVariantNumeric: 'tabular-nums' }}>{data?.total ?? 0} kết quả</span></div>
      {loading ? <div className="p-3">{skeleton}</div> : data?.items.length ? <>
        <Table responsive hover className="align-middle mb-0"><thead style={{ background: '#EEF2F6' }}><tr><th style={{ color: '#475569', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.5px', padding: '12px 16px', borderBottom: '1px solid rgba(15, 23, 42, 0.05)' }}>Họ và tên / ID tài khoản</th><th style={{ color: '#475569', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.5px', padding: '12px 16px', borderBottom: '1px solid rgba(15, 23, 42, 0.05)' }}>Trình độ chuyên môn</th><th style={{ color: '#475569', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.5px', padding: '12px 16px', borderBottom: '1px solid rgba(15, 23, 42, 0.05)' }}>Phòng mặc định</th><th style={{ color: '#475569', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.5px', padding: '12px 16px', borderBottom: '1px solid rgba(15, 23, 42, 0.05)' }}>Ngày tạo</th><th className="text-center" style={{ color: '#475569', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.5px', padding: '12px 16px', borderBottom: '1px solid rgba(15, 23, 42, 0.05)' }}>Chi tiết</th></tr></thead><tbody>{data.items.map((row) => <tr key={row.id} style={{ borderBottom: '1px solid #EEF2F6' }}><td style={{ padding: '12px 16px' }}><div className="fw-semibold" style={{ color: '#0f2743' }}>{row.fullName}</div><small className="font-monospace" style={{ color: '#1E60E6' }}>{row.id}</small></td><td style={{ whiteSpace: 'pre-wrap', padding: '12px 16px' }}>{row.qualification || 'Chưa ghi nhận'}</td><td style={{ padding: '12px 16px' }}><span style={{ display: 'inline-block', padding: '2px 10px', borderRadius: 9999, background: '#EEF2F6', color: '#475569', fontSize: 12 }}>{row.roomName || 'Chưa phân phòng'}</span></td><td className="text-nowrap" style={{ padding: '12px 16px', fontVariantNumeric: 'tabular-nums' }}>{date(row.createdAt)}</td><td className="text-center" style={{ padding: '12px 16px' }}><Button variant="outline-primary" size="sm" aria-label={`Xem hồ sơ ${row.fullName}`} onClick={() => setSelectedId(row.id)} style={{ borderRadius: 9999, borderColor: '#1E60E6', color: '#1E60E6' }}><FaEye /></Button></td></tr>)}</tbody></Table>
        <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 p-3 border-top" style={{ background: '#F8FAFC' }}><Form.Select aria-label="Số hồ sơ mỗi trang" style={{ width: 170, borderRadius: 10, background: '#EEF2F6', border: '1px solid rgba(15, 23, 42, 0.05)' }} value={filters.pageSize} onChange={(e) => change('pageSize', Number(e.target.value))}>{[20, 50, 100].map((n) => <option key={n} value={n}>{n} hồ sơ / trang</option>)}</Form.Select><div className="d-flex align-items-center gap-3"><Button size="sm" variant="outline-primary" disabled={data.page <= 1} onClick={() => setFilters((v) => ({ ...v, page: v.page - 1 }))} style={{ borderRadius: 9999 }}>Trước</Button><span className="small text-muted" style={{ fontVariantNumeric: 'tabular-nums' }}>Trang {data.page}/{data.totalPages}</span><Button size="sm" variant="outline-primary" disabled={data.page >= data.totalPages} onClick={() => setFilters((v) => ({ ...v, page: v.page + 1 }))} style={{ borderRadius: 9999 }}>Sau</Button></div></div>
      </> : !error && !invalidDates && <div className="text-center text-muted py-5"><FaUsersCog size={40} className="mb-3" style={{ color: '#1E60E6', opacity: 0.5 }} /><h5>Chưa có hồ sơ phù hợp</h5><p>Không có dữ liệu hoặc cần thay đổi bộ lọc tìm kiếm.</p><Button variant="outline-primary" onClick={clear} style={{ borderRadius: 9999 }}>Xóa bộ lọc</Button></div>}
    </Card.Body></Card>
    <Modal show={Boolean(selectedId)} onHide={() => setSelectedId(null)} size="lg" scrollable centered><Modal.Header closeButton style={{ borderBottom: '1px solid rgba(15, 23, 42, 0.05)' }}><Modal.Title className="h5 fw-bold" style={{ color: '#0f2743' }}><FaUsersCog className="me-2" style={{ color: '#1E60E6' }} />Chi tiết hồ sơ Lab</Modal.Title></Modal.Header><Modal.Body className="p-4">
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
