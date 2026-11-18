/** @file SampleTimelinePage.jsx
 * @description UC71 sample search and read-only timeline in the existing clinical shell.
 */
import React, { useEffect, useState } from 'react';
import { Alert, Badge, Button, Card, Col, Form, Row, Table } from 'react-bootstrap';
import { useSearchParams } from 'react-router-dom';
import { FaClock, FaEye, FaRedo, FaSearch, FaTimes } from 'react-icons/fa';
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
  return (
    <div className="w-100 py-1">
      <div className="bms-page-header-card mb-4">
        <div className="bms-page-header-content flex-column align-items-start">
          <div className="bms-page-title-row">
            <h1 className="bms-page-title">Hành trình mẫu bệnh phẩm</h1>
          </div>
          <p className="text-muted small m-0 mt-1">
            Tra cứu trạng thái và lịch sử các mốc xử lý của mẫu xét nghiệm theo thời gian thực.
          </p>
        </div>
        <div className="bms-page-actions">
          <Button variant="outline-primary" size="sm" className="rounded-pill px-3 text-nowrap" disabled={loading} onClick={() => setRefresh((v) => v + 1)}>
            <FaRedo className="me-1" size={12} /> Làm mới
          </Button>
        </div>
      </div>

      <div className="bms-filter-bar mb-3">
        <div className="bms-search-input-pill">
          <FaSearch className="bms-search-icon" />
          <input
            id="timeline-search"
            type="text"
            maxLength={100}
            placeholder="Tìm theo mã vạch, mã mẫu hoặc mã bệnh nhân..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button type="button" className="bms-search-clear" onClick={() => setSearch('')}>
              <FaTimes size={12} />
            </button>
          )}
        </div>

        <Form.Select id="timeline-status" style={{ width: 'auto' }} value={filters.status} onChange={(e) => change('status', e.target.value)}>
          <option value="">Tất cả trạng thái</option>
          {statuses.map((status) => <option key={status} value={status}>{timelineStatus(status)}</option>)}
        </Form.Select>

        <Form.Control id="timeline-from" type="date" style={{ width: 'auto' }} value={filters.fromDate} onChange={(e) => change('fromDate', e.target.value)} title="Ngày lấy mẫu từ" />
        <Form.Control id="timeline-to" type="date" style={{ width: 'auto' }} value={filters.toDate} onChange={(e) => change('toDate', e.target.value)} title="Ngày lấy mẫu đến" />

        {(search || filters.status || filters.fromDate || filters.toDate) && (
          <Button size="sm" className="rounded-pill px-3 text-nowrap" variant="outline-secondary" onClick={clear}>
            Đặt lại
          </Button>
        )}

        <span className="bms-filter-meta" role="status">
          Hiển thị <strong>{data?.items?.length ?? 0}</strong> / {data?.total ?? 0} mẫu
        </span>
      </div>

      {invalid && <Alert variant="warning" className="rounded-3">Ngày bắt đầu phải trước hoặc bằng ngày kết thúc.</Alert>}
      {error && <Alert variant="danger" role="alert" className="rounded-3">{error} <Button size="sm" variant="outline-danger" className="rounded-pill ms-2" onClick={() => setRefresh((v) => v + 1)}>Thử lại</Button></Alert>}

      <section className="bms-table-standalone-section">
        <div className="bms-table-standalone-header">
          <div>
            <h2 className="bms-table-standalone-title">Danh sách mẫu xét nghiệm</h2>
            <p className="bms-table-standalone-subtitle">Nhấn vào biểu tượng xem để mở dòng thời gian chi tiết của từng ống mẫu</p>
          </div>
        </div>
        <div className="bms-table-standalone-body">
          {loading ? <TimelineSkeleton /> : data?.items?.length ? <>
            <Table responsive hover className="align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th className="ps-3">Mã mẫu / Mã vạch</th>
                  <th>Mã bệnh nhân</th>
                  <th>Thời gian lấy mẫu</th>
                  <th className="text-center">Trạng thái</th>
                  <th className="text-center pe-3">Hành trình</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((sample) => (
                  <tr key={sample.id}>
                    <td className="ps-3 font-monospace">
                      <div className="fw-semibold" style={{ color: '#1E60E6' }}>{sample.barcode || sample.id}</div>
                      <small className="text-muted">{sample.id}</small>
                    </td>
                    <td>{sample.patientId || 'Chưa ghi nhận'}</td>
                    <td style={{ fontVariantNumeric: 'tabular-nums' }}>{timelineDate(sample.collectedAt)}</td>
                    <td className="text-center">
                      <Badge pill bg={sample.status === 'Rejected' ? 'danger' : 'primary'} style={sample.status !== 'Rejected' ? { backgroundColor: '#1E60E6' } : {}} className="px-3 py-1">
                        {timelineStatus(sample.status)}
                      </Badge>
                    </td>
                    <td className="text-center pe-3">
                      <Button size="sm" variant="outline-primary" className="rounded-pill px-2.5 text-nowrap" aria-label={`Xem hành trình mẫu ${sample.barcode || sample.id}`} onClick={() => setParams({ sample: sample.id })}>
                        <FaEye className="me-1" /> Xem
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
            <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 px-3 py-2 border-top">
              <Form.Select aria-label="Số mẫu mỗi trang" className="rounded-pill" style={{ width: 'auto' }} value={filters.pageSize} onChange={(e) => change('pageSize', Number(e.target.value))}>
                {[20, 50, 100].map((size) => <option key={size} value={size}>{size} mẫu / trang</option>)}
              </Form.Select>
              <div className="d-flex align-items-center gap-3">
                <Button size="sm" variant="outline-primary" className="rounded-pill px-3" disabled={data.page <= 1} onClick={() => setFilters((v) => ({ ...v, page: v.page - 1 }))}>Trước</Button>
                <span className="small">Trang {data.page}/{data.totalPages}</span>
                <Button size="sm" variant="outline-primary" className="rounded-pill px-3" disabled={data.page >= data.totalPages} onClick={() => setFilters((v) => ({ ...v, page: v.page + 1 }))}>Sau</Button>
              </div>
            </div>
          </> : !error && !invalid && (
            <div className="text-center text-muted py-5">
              <FaClock size={28} className="mb-2 opacity-50" style={{ color: '#1E60E6' }} />
              <div className="fw-semibold text-dark">Chưa có mẫu phù hợp</div>
            </div>
          )}
        </div>
      </section>
      {code && <SampleTimelineDrawer key={code} code={code} onClose={() => setParams({})} />}
    </div>
  );
}
