/** @file SampleTimelinePage.jsx
 * @description UC71 sample search and read-only timeline in the existing clinical shell.
 */
import React, { useEffect, useState } from 'react';
import { Alert, Badge, Button, Card, Col, Form, Row, Table } from 'react-bootstrap';
import { useSearchParams } from 'react-router-dom';
import { FaClock, FaEye, FaRedo, FaSearch } from 'react-icons/fa';
import { getTimelineSamples, timelineError } from '../api/sampleTimelineApi';
import SampleTimelineDrawer, { TimelineSkeleton, timelineDate, timelineStatus } from '../components/SampleTimelineDrawer';
import '../../../components/common/SkeletonProfile.css';

const defaults = { search: '', status: '', fromDate: '', toDate: '', page: 1, pageSize: 20 };
const statuses = ['PendingCollection', 'Collected', 'InTransit', 'Received', 'Processing', 'Testing', 'Completed', 'Rejected', 'RerunRequested', 'Stored'];

/** Search uses server-scoped samples; client-supplied patient/account IDs never grant access. */
export default function SampleTimelinePage() {
  const [params, setParams] = useSearchParams();
  const code = params.get('sample');
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState(defaults);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refresh, setRefresh] = useState(0);
  const invalid = filters.fromDate && filters.toDate && filters.fromDate > filters.toDate;
  useEffect(() => { const timer = setTimeout(() => setFilters((v) => v.search === search.trim() ? v : { ...v, search: search.trim(), page: 1 }), 300); return () => clearTimeout(timer); }, [search]);
  useEffect(() => {
    const controller = new AbortController(); setError(''); setData(null);
    if (invalid) { setLoading(false); return () => controller.abort(); }
    setLoading(true);
    const query = Object.fromEntries(Object.entries(filters).filter(([, value]) => value !== ''));
    getTimelineSamples(query, controller.signal)
      .then((result) => { if (!controller.signal.aborted) { setData(result); if (result.totalPages > 0 && filters.page > result.totalPages) setFilters((v) => ({ ...v, page: result.totalPages })); } })
      .catch((err) => { if (!controller.signal.aborted) setError(timelineError(err)); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [filters, refresh, invalid]);
  const change = (key, value) => setFilters((v) => ({ ...v, [key]: value, page: 1 }));
  const clear = () => { setSearch(''); setFilters({ ...defaults }); };
  return <div className="py-3">
    <header className="bms-page-header"><div className="bms-page-header-content"><h1 className="bms-page-title">Hành trình mẫu</h1></div><div className="bms-page-actions"><Button variant="outline-primary" className="rounded-pill px-3" disabled={loading} onClick={() => setRefresh((v) => v + 1)}><FaRedo className="me-2" />Làm mới</Button></div></header>
    <Card className="bms-filter-bar border-0"><Card.Body><Row className="g-3 align-items-end">
      <Col lg={4}><Form.Label htmlFor="timeline-search" className="fw-semibold small"><FaSearch className="me-2" style={{ color: '#1E60E6' }} />Tìm mẫu</Form.Label><Form.Control id="timeline-search" className="rounded-3" style={{ backgroundColor: '#EEF2F6', borderColor: 'rgba(15, 23, 42, 0.05)' }} maxLength={100} placeholder="Barcode, ID mẫu hoặc ID bệnh nhân" value={search} onChange={(e) => setSearch(e.target.value)} /></Col>
      <Col lg={2} sm={6}><Form.Label htmlFor="timeline-status" className="fw-semibold small">Trạng thái mẫu</Form.Label><Form.Select id="timeline-status" className="rounded-3" style={{ backgroundColor: '#EEF2F6', borderColor: 'rgba(15, 23, 42, 0.05)' }} value={filters.status} onChange={(e) => change('status', e.target.value)}><option value="">Tất cả</option>{statuses.map((status) => <option key={status} value={status}>{timelineStatus(status)}</option>)}</Form.Select></Col>
      <Col lg={2} sm={6}><Form.Label htmlFor="timeline-from" className="fw-semibold small">Ngày lấy mẫu từ</Form.Label><Form.Control id="timeline-from" type="date" className="rounded-3" style={{ backgroundColor: '#EEF2F6', borderColor: 'rgba(15, 23, 42, 0.05)' }} value={filters.fromDate} onChange={(e) => change('fromDate', e.target.value)} /></Col>
      <Col lg={2} sm={6}><Form.Label htmlFor="timeline-to" className="fw-semibold small">Ngày lấy mẫu đến</Form.Label><Form.Control id="timeline-to" type="date" className="rounded-3" style={{ backgroundColor: '#EEF2F6', borderColor: 'rgba(15, 23, 42, 0.05)' }} value={filters.toDate} onChange={(e) => change('toDate', e.target.value)} /></Col>
      <Col lg={2} sm={6}><Button className="w-100 rounded-pill" variant="outline-secondary" onClick={clear}>Xóa bộ lọc</Button></Col>
    </Row><p className="small text-muted mb-0 mt-3">Ngày theo UTC+7. Mẫu chưa ghi ngày lấy sẽ không nằm trong bộ lọc khoảng ngày. Bệnh nhân chỉ thấy mẫu liên kết với tài khoản của mình.</p></Card.Body></Card>
    {invalid && <Alert variant="warning" className="rounded-3">Ngày bắt đầu phải trước hoặc bằng ngày kết thúc.</Alert>}
    {error && <Alert variant="danger" role="alert" className="rounded-3">{error} <Button size="sm" variant="outline-danger" className="rounded-pill ms-2" onClick={() => setRefresh((v) => v + 1)}>Thử lại</Button></Alert>}
    <div className="bms-table-standalone-section">
      <div className="bms-table-standalone-header">
        <h2 className="bms-table-standalone-title">Mẫu xét nghiệm</h2>
        <span className="small text-muted" role="status">{data?.total ?? 0} kết quả</span>
      </div>
      <div className="bms-table-standalone-body">
        {loading ? <TimelineSkeleton /> : data?.items.length ? <>
          <Table responsive hover className="align-middle mb-0"><thead><tr><th>Mã mẫu / Barcode</th><th>ID bệnh nhân</th><th>Thời gian lấy mẫu</th><th className="text-center">Trạng thái</th><th className="text-center">Hành trình</th></tr></thead><tbody>{data.items.map((sample) => <tr key={sample.id}><td className="font-monospace"><div className="fw-semibold" style={{ color: '#1E60E6' }}>{sample.barcode || sample.id}</div><small className="text-muted">{sample.id}</small></td><td>{sample.patientId || 'Chưa ghi nhận'}</td><td style={{ fontVariantNumeric: 'tabular-nums' }}>{timelineDate(sample.collectedAt)}</td><td className="text-center"><Badge pill bg={sample.status === 'Rejected' ? 'danger' : 'primary'} style={sample.status !== 'Rejected' ? { backgroundColor: '#1E60E6' } : {}} className="px-3 py-1">{timelineStatus(sample.status)}</Badge></td><td className="text-center"><Button size="sm" variant="outline-primary" className="rounded-circle p-2" aria-label={`Xem hành trình mẫu ${sample.barcode || sample.id}`} onClick={() => setParams({ sample: sample.id })}><FaEye /></Button></td></tr>)}</tbody></Table>
          <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 px-3 py-2"><Form.Select aria-label="Số mẫu mỗi trang" className="rounded-3" style={{ width: 170 }} value={filters.pageSize} onChange={(e) => change('pageSize', Number(e.target.value))}>{[20, 50, 100].map((size) => <option key={size} value={size}>{size} mẫu / trang</option>)}</Form.Select><div className="d-flex align-items-center gap-3"><Button size="sm" variant="outline-primary" className="rounded-pill px-3" disabled={data.page <= 1} onClick={() => setFilters((v) => ({ ...v, page: v.page - 1 }))}>Trước</Button><span className="small">Trang {data.page}/{data.totalPages}</span><Button size="sm" variant="outline-primary" className="rounded-pill px-3" disabled={data.page >= data.totalPages} onClick={() => setFilters((v) => ({ ...v, page: v.page + 1 }))}>Sau</Button></div></div>
        </> : !error && !invalid && <div className="text-center text-muted py-4"><FaClock size={28} className="mb-2" style={{ color: '#1E60E6' }} /><div className="fw-semibold">Chưa có mẫu phù hợp</div></div>}
      </div>
    </div>
    {code && <SampleTimelineDrawer key={code} code={code} onClose={() => setParams({})} />}
  </div>;
}
