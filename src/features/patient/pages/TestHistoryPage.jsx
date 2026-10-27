/** @file TestHistoryPage.jsx
 * @description UC76 real result history with signed-only disclosure and server-scoped patient access.
 */
import React, { useEffect, useState } from 'react';
import { Alert, Badge, Breadcrumb, Button, Card, Col, Form, Offcanvas, Row, Table } from 'react-bootstrap';
import { Link, useSearchParams } from 'react-router-dom';
import { FaHistory, FaEye } from 'react-icons/fa';
import { getTestHistory, getTestHistoryDetail, testHistoryError } from '../api/testHistoryApi';
import '../../../components/common/SkeletonProfile.css';

const defaults = { search: '', patientId: '', fromDate: '', toDate: '', page: 1, pageSize: 20 };
const date = (value) => value ? new Date(value).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }) : 'Chưa ghi nhận';
const flag = (value) => ({ '0': 'Bình thường', Normal: 'Bình thường', N: 'Bình thường', '1': 'Thấp', Low: 'Thấp', L: 'Thấp', '2': 'Cao', High: 'Cao', H: 'Cao', '3': 'Nguy hiểm', CriticalPanic: 'Nguy hiểm', CRITICAL: 'Nguy hiểm' }[value] || value || 'Chưa ghi nhận');
const skeleton = <div aria-busy="true" aria-label="Đang tải lịch sử">{[1, 2, 3].map((n) => <div key={n} className="bms-skeleton mb-3" style={{ height: 45 }} />)}</div>;

/** Re-fetches detail on every opening so withdrawn/rerun reports do not reuse cached measurements. */
function HistoryDetail({ id, onClose }) {
  const [data, setData] = useState(null); const [error, setError] = useState(''); const [loading, setLoading] = useState(true); const [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController(); setLoading(true); setData(null); setError('');
    getTestHistoryDetail(id, controller.signal).then((result) => { if (!controller.signal.aborted) setData(result); })
      .catch((err) => { if (!controller.signal.aborted) setError(testHistoryError(err)); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [id, retry]);
  return <Offcanvas show placement="end" onHide={onClose} style={{ width: 'min(95vw, 900px)' }}><Offcanvas.Header closeButton><Offcanvas.Title>Chi tiết lịch sử xét nghiệm</Offcanvas.Title></Offcanvas.Header><Offcanvas.Body>
    {loading ? skeleton : error ? <Alert variant="danger">{error} <Button size="sm" variant="outline-danger" onClick={() => setRetry((v) => v + 1)}>Thử lại</Button></Alert> : data && <>
      <h5 className="text-primary">{data.summary.packageName || 'Chưa ghi nhận gói xét nghiệm'}</h5><p className="font-monospace text-break">{data.summary.resultCode || data.summary.id}</p>
      <p>ID bệnh nhân: {data.summary.patientId} · ID mẫu: {data.summary.sampleId}</p><p>Ngày ghi nhận: {date(data.summary.createdAt)}<br />Ngày duyệt: {date(data.summary.approvedAt)}</p>
      {!data.summary.available ? <Alert variant="info">Đang phân tích. Chỉ số và kết luận chỉ hiển thị khi kết quả đã duyệt, có chữ ký và không còn yêu cầu chạy lại.</Alert> : <>
        <Badge bg="success" className="mb-3">Đã duyệt và có chữ ký</Badge>
        {data.items.length ? <Table responsive bordered className="align-middle"><thead className="table-light"><tr><th>Chỉ số</th><th className="text-end">Kết quả</th><th>Đơn vị</th><th className="text-end">Tham chiếu đã lưu</th><th className="text-center">Cờ</th></tr></thead><tbody>{data.items.map((item, index) => <tr key={`${item.code}-${index}`}><td>{item.name || item.code || 'Chưa ghi nhận'}</td><td className="text-end fw-semibold">{item.value || 'Chưa ghi nhận'}</td><td>{item.unit || '—'}</td><td className="text-end">{item.referenceRange || 'Chưa ghi nhận'}</td><td className="text-center">{flag(item.flag)}</td></tr>)}</tbody></Table> : <Alert variant="light">Chưa có chỉ số được lưu cho kết quả này.</Alert>}
        {data.conclusion && <Card className="mb-3"><Card.Body><h6>Kết luận đã ghi nhận</h6><p className="mb-0" style={{ whiteSpace: 'pre-wrap' }}>{data.conclusion}</p></Card.Body></Card>}
      </>}
      <p className="small text-muted">Thời gian theo UTC+7. Khoảng tham chiếu và cờ được đọc từ kết quả đã lưu, không tự tính lại.</p><Button variant="outline-primary" onClick={() => setRetry((v) => v + 1)}>Làm mới chi tiết</Button>
    </>}
  </Offcanvas.Body></Offcanvas>;
}

/** Directory metadata is safe for pending reports; clinical values are never included in list responses. */
export default function TestHistoryPage() {
  const [params, setParams] = useSearchParams(); const id = params.get('result');
  const [search, setSearch] = useState(''); const [filters, setFilters] = useState(defaults);
  const [data, setData] = useState(null); const [loading, setLoading] = useState(true); const [error, setError] = useState(''); const [refresh, setRefresh] = useState(0);
  const invalid = filters.fromDate && filters.toDate && filters.fromDate > filters.toDate;
  useEffect(() => { const timer = setTimeout(() => setFilters((v) => v.search === search.trim() ? v : { ...v, search: search.trim(), page: 1 }), 300); return () => clearTimeout(timer); }, [search]);
  useEffect(() => {
    const controller = new AbortController(); setData(null); setError('');
    if (invalid) { setLoading(false); return () => controller.abort(); } setLoading(true);
    getTestHistory(Object.fromEntries(Object.entries(filters).filter(([, value]) => value !== '')), controller.signal)
      .then((result) => { if (!controller.signal.aborted) { setData(result); if (filters.page > Math.max(1, result.totalPages)) setFilters((v) => ({ ...v, page: Math.max(1, result.totalPages) })); } })
      .catch((err) => { if (!controller.signal.aborted) setError(testHistoryError(err)); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [filters, invalid, refresh]);
  const change = (key, value) => setFilters((v) => ({ ...v, [key]: value, page: 1 }));
  const clear = () => { setSearch(''); setFilters({ ...defaults }); };
  return <div className="py-3"><Breadcrumb><Breadcrumb.Item linkAs={Link} linkProps={{ to: '/dashboard' }}>Trang Chủ</Breadcrumb.Item><Breadcrumb.Item active>Lịch sử xét nghiệm</Breadcrumb.Item></Breadcrumb>
    <div className="d-flex flex-wrap justify-content-between gap-3 mb-4"><div><h4 className="fw-bold"><FaHistory className="text-primary me-2" />Lịch Sử Xét Nghiệm</h4><p className="text-muted mb-0">Tra cứu kết quả đã lưu và trạng thái phát hành.</p></div><Button variant="outline-primary" disabled={loading} onClick={() => setRefresh((v) => v + 1)}>Làm mới</Button></div>
    <Card className="border-0 shadow-sm mb-4"><Card.Body><Row className="g-3 align-items-end">
      <Col lg={3}><Form.Label htmlFor="history-search">Tìm kết quả</Form.Label><Form.Control id="history-search" value={search} maxLength={100} placeholder="Mã kết quả, ID mẫu hoặc ID gói" onChange={(e) => setSearch(e.target.value)} /></Col>
      <Col lg={3}><Form.Label htmlFor="history-patient">ID bệnh nhân</Form.Label><Form.Control id="history-patient" value={filters.patientId} maxLength={100} onChange={(e) => change('patientId', e.target.value)} /></Col>
      <Col lg={2} sm={6}><Form.Label htmlFor="history-from">Ngày ghi nhận từ</Form.Label><Form.Control id="history-from" type="date" value={filters.fromDate} onChange={(e) => change('fromDate', e.target.value)} /></Col>
      <Col lg={2} sm={6}><Form.Label htmlFor="history-to">Đến ngày</Form.Label><Form.Control id="history-to" type="date" value={filters.toDate} onChange={(e) => change('toDate', e.target.value)} /></Col>
      <Col lg={2}><Button variant="outline-secondary" onClick={clear}>Xóa bộ lọc</Button></Col>
    </Row><p className="small text-muted mt-3 mb-0">Bệnh nhân chỉ xem dữ liệu gắn với tài khoản của mình. Lọc ngày theo UTC+7 sẽ loại kết quả chưa ghi ngày.</p></Card.Body></Card>
    {invalid && <Alert variant="warning">Ngày bắt đầu phải trước hoặc bằng ngày kết thúc.</Alert>}{error && <Alert variant="danger">{error} <Button variant="outline-danger" size="sm" onClick={() => setRefresh((v) => v + 1)}>Thử lại</Button></Alert>}
    <Card className="border-0 shadow-sm"><Card.Body><div className="d-flex justify-content-between mb-3"><h6>Danh sách lịch sử</h6><small role="status">{data?.total ?? 0} kết quả</small></div>
      {loading ? skeleton : data?.items.length ? <><Table responsive hover className="align-middle"><thead className="table-light"><tr><th>Mã kết quả / ID mẫu</th><th>Gói xét nghiệm</th><th>ID bệnh nhân</th><th>Ngày ghi nhận</th><th className="text-center">Trạng thái</th><th /></tr></thead><tbody>{data.items.map((row) => <tr key={row.id}><td className="font-monospace">{row.resultCode || row.id}<div className="small text-muted">{row.sampleId}</div></td><td>{row.packageName || 'Chưa ghi nhận'}</td><td>{row.patientId}</td><td>{date(row.createdAt)}</td><td className="text-center"><Badge bg={row.available ? 'success' : 'secondary'}>{row.available ? 'Đã phát hành' : 'Đang phân tích'}</Badge></td><td><Button size="sm" variant="outline-primary" aria-label={`Xem kết quả ${row.resultCode || row.id}`} onClick={() => setParams({ result: row.id })}><FaEye /></Button></td></tr>)}</tbody></Table>
        <div className="d-flex flex-wrap justify-content-between align-items-center gap-3"><Form.Select aria-label="Số kết quả mỗi trang" style={{ width: 170 }} value={filters.pageSize} onChange={(e) => change('pageSize', Number(e.target.value))}>{[20, 50, 100].map((size) => <option key={size} value={size}>{size} / trang</option>)}</Form.Select><div className="d-flex gap-3 align-items-center"><Button size="sm" variant="outline-primary" disabled={data.page <= 1} onClick={() => setFilters((v) => ({ ...v, page: v.page - 1 }))}>Trước</Button><small>{data.page}/{data.totalPages}</small><Button size="sm" variant="outline-primary" disabled={data.page >= data.totalPages} onClick={() => setFilters((v) => ({ ...v, page: v.page + 1 }))}>Sau</Button></div></div>
      </> : !error && !invalid && <div className="text-center text-muted py-5"><FaHistory size={40} className="mb-3" /><h5>Chưa có lịch sử phù hợp</h5><p>Thử đổi bộ lọc hoặc kiểm tra liên kết hồ sơ bệnh nhân.</p><Button variant="outline-primary" onClick={clear}>Xóa bộ lọc</Button></div>}
    </Card.Body></Card>{id && <HistoryDetail key={id} id={id} onClose={() => setParams({})} />}
  </div>;
}
