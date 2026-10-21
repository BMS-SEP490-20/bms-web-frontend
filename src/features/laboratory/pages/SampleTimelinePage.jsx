/** @file SampleTimelinePage.jsx
 * @description UC71 sample search and read-only timeline in the existing clinical shell.
 */
import React, { useEffect, useState } from 'react';
import { Alert, Badge, Breadcrumb, Button, Card, Col, Form, Row, Table } from 'react-bootstrap';
import { Link, useSearchParams } from 'react-router-dom';
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
    <Breadcrumb><Breadcrumb.Item linkAs={Link} linkProps={{ to: '/dashboard' }}>Trang Chủ</Breadcrumb.Item><Breadcrumb.Item active>Hành trình mẫu</Breadcrumb.Item></Breadcrumb>
    <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-4"><div><h4 className="fw-bold"><FaClock className="text-primary me-2" />Hành Trình Mẫu Xét Nghiệm</h4><p className="text-muted mb-0">Tra cứu các mốc đã ghi nhận từ tiếp đón đến kết quả chính thức.</p></div><Button variant="outline-primary" disabled={loading} onClick={() => setRefresh((v) => v + 1)}><FaRedo className="me-2" />Làm mới</Button></div>
    <Card className="border-0 shadow-sm mb-4"><Card.Body><Row className="g-3 align-items-end">
      <Col lg={4}><Form.Label htmlFor="timeline-search"><FaSearch className="me-2" />Tìm mẫu</Form.Label><Form.Control id="timeline-search" maxLength={100} placeholder="Barcode, ID mẫu hoặc ID bệnh nhân" value={search} onChange={(e) => setSearch(e.target.value)} /></Col>
      <Col lg={2} sm={6}><Form.Label htmlFor="timeline-status">Trạng thái mẫu</Form.Label><Form.Select id="timeline-status" value={filters.status} onChange={(e) => change('status', e.target.value)}><option value="">Tất cả</option>{statuses.map((status) => <option key={status} value={status}>{timelineStatus(status)}</option>)}</Form.Select></Col>
      <Col lg={2} sm={6}><Form.Label htmlFor="timeline-from">Ngày lấy mẫu từ</Form.Label><Form.Control id="timeline-from" type="date" value={filters.fromDate} onChange={(e) => change('fromDate', e.target.value)} /></Col>
      <Col lg={2} sm={6}><Form.Label htmlFor="timeline-to">Ngày lấy mẫu đến</Form.Label><Form.Control id="timeline-to" type="date" value={filters.toDate} onChange={(e) => change('toDate', e.target.value)} /></Col>
      <Col lg={2} sm={6}><Button className="w-100" variant="outline-secondary" onClick={clear}>Xóa bộ lọc</Button></Col>
    </Row><p className="small text-muted mb-0 mt-3">Ngày theo UTC+7. Mẫu chưa ghi ngày lấy sẽ không nằm trong bộ lọc khoảng ngày. Bệnh nhân chỉ thấy mẫu liên kết với tài khoản của mình.</p></Card.Body></Card>
    {invalid && <Alert variant="warning">Ngày bắt đầu phải trước hoặc bằng ngày kết thúc.</Alert>}
    {error && <Alert variant="danger" role="alert">{error} <Button size="sm" variant="outline-danger" onClick={() => setRefresh((v) => v + 1)}>Thử lại</Button></Alert>}
    <Card className="border-0 shadow-sm"><Card.Body><div className="d-flex justify-content-between mb-3"><h6 className="fw-bold">Mẫu xét nghiệm</h6><span className="small text-muted" role="status">{data?.total ?? 0} kết quả</span></div>
      {loading ? <TimelineSkeleton /> : data?.items.length ? <>
        <Table responsive hover className="align-middle"><thead className="table-light"><tr><th>Mã mẫu / Barcode</th><th>ID bệnh nhân</th><th>Thời gian lấy mẫu</th><th className="text-center">Trạng thái</th><th className="text-center">Hành trình</th></tr></thead><tbody>{data.items.map((sample) => <tr key={sample.id}><td className="font-monospace"><div className="fw-semibold">{sample.barcode || sample.id}</div><small className="text-muted">{sample.id}</small></td><td>{sample.patientId || 'Chưa ghi nhận'}</td><td>{timelineDate(sample.collectedAt)}</td><td className="text-center"><Badge bg={sample.status === 'Rejected' ? 'danger' : 'primary'}>{timelineStatus(sample.status)}</Badge></td><td className="text-center"><Button size="sm" variant="outline-primary" aria-label={`Xem hành trình mẫu ${sample.barcode || sample.id}`} onClick={() => setParams({ sample: sample.id })}><FaEye /></Button></td></tr>)}</tbody></Table>
        <div className="d-flex flex-wrap justify-content-between align-items-center gap-3"><Form.Select aria-label="Số mẫu mỗi trang" style={{ width: 170 }} value={filters.pageSize} onChange={(e) => change('pageSize', Number(e.target.value))}>{[20, 50, 100].map((size) => <option key={size} value={size}>{size} mẫu / trang</option>)}</Form.Select><div className="d-flex align-items-center gap-3"><Button size="sm" variant="outline-primary" disabled={data.page <= 1} onClick={() => setFilters((v) => ({ ...v, page: v.page - 1 }))}>Trước</Button><span className="small">Trang {data.page}/{data.totalPages}</span><Button size="sm" variant="outline-primary" disabled={data.page >= data.totalPages} onClick={() => setFilters((v) => ({ ...v, page: v.page + 1 }))}>Sau</Button></div></div>
      </> : !error && !invalid && <div className="text-center text-muted py-5"><FaClock size={40} className="mb-3" /><h5>Chưa có mẫu phù hợp</h5><p>Thử đổi bộ lọc hoặc kiểm tra lại liên kết hồ sơ bệnh nhân.</p><Button variant="outline-primary" onClick={clear}>Xóa bộ lọc</Button></div>}
    </Card.Body></Card>
    {code && <SampleTimelineDrawer key={code} code={code} onClose={() => setParams({})} />}
  </div>;
}
