/** @file SampleTimelineDrawer.jsx
 * @description Read-only evidence drawer, separating clinical progress from RFID scan attribution.
 */
import React, { useEffect, useState } from 'react';
import { Alert, Badge, Button, Card, Col, Offcanvas, Row, Table } from 'react-bootstrap';
import { getSampleTimeline, getSampleTimelineRfid, timelineError } from '../api/sampleTimelineApi';

export const timelineDate = (value) => value ? new Date(value).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }) : 'Chưa ghi nhận thời gian';
export const timelineStatus = (status) => ({ PendingCollection: 'Chờ lấy mẫu', Collected: 'Đã lấy mẫu', InTransit: 'Đang vận chuyển', Received: 'Đã nhập Lab', Processing: 'Đang xử lý mẫu', Testing: 'Đang phân tích', Completed: 'Hoàn tất phân tích', UnderReview: 'Đang thẩm định', Rejected: 'Bị từ chối', RerunRequested: 'Yêu cầu chạy lại', Stored: 'Đã lưu trữ', Unknown: 'Chưa ghi nhận' }[status] || status || 'Chưa ghi nhận');
const sources = { 'blood_samples.status_history': 'Lịch sử trạng thái', 'specimen_histories.timeline': 'Lịch sử bệnh phẩm', 'appointments.check_in_time': 'Tiếp đón', 'test_results.approval': 'Báo cáo đã duyệt và ký', 'test_results.entered_at': 'Thời điểm nhập kết quả', Progress: 'Tiến trình' };
export function TimelineSkeleton() {
  return <div aria-busy="true" aria-label="Đang tải hành trình mẫu">{[1, 2, 3, 4].map((n) => <div key={n} className="bms-skeleton mb-3" style={{ height: 52 }} />)}</div>;
}
function Pager({ data, page, onChange }) {
  return data && data.totalPages > 1 && <div className="d-flex justify-content-end align-items-center gap-3 mt-3"><Button size="sm" variant="outline-primary" disabled={page <= 1} onClick={() => onChange(page - 1)}>Trước</Button><span className="small">Trang {page}/{data.totalPages}</span><Button size="sm" variant="outline-primary" disabled={page >= data.totalPages} onClick={() => onChange(page + 1)}>Sau</Button></div>;
}

/** Loads each evidence page independently; closing/replacing a sample cancels pending requests. */
export default function SampleTimelineDrawer({ code, onClose }) {
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refresh, setRefresh] = useState(0);
  const [rfidPage, setRfidPage] = useState(1);
  const [rfid, setRfid] = useState(null);
  const [rfidLoading, setRfidLoading] = useState(false);
  const [rfidError, setRfidError] = useState('');
  const [rfidRefresh, setRfidRefresh] = useState(0);
  const [showRfid, setShowRfid] = useState(false);
  useEffect(() => {
    // Poll recorded evidence while visible; UC71 does not synthesize or write tracking events.
    const timer = setInterval(() => { if (document.visibilityState === 'visible') setRefresh((v) => v + 1); }, 30000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    const controller = new AbortController(); setLoading(true); setError(''); setData(null);
    getSampleTimeline(code, { page, pageSize: 30 }, controller.signal)
      .then((result) => { if (!controller.signal.aborted) { setData(result); if (page > Math.max(1, result.events.totalPages)) setPage(Math.max(1, result.events.totalPages)); } })
      .catch((err) => { if (!controller.signal.aborted) setError(timelineError(err)); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [code, page, refresh]);
  useEffect(() => {
    if (!showRfid || !data || data.patientView) return undefined;
    const controller = new AbortController(); setRfidLoading(true); setRfidError(''); setRfid(null);
    getSampleTimelineRfid(code, { page: rfidPage, pageSize: 20 }, controller.signal)
      .then((result) => { if (!controller.signal.aborted) { setRfid(result); if (rfidPage > Math.max(1, result.totalPages)) setRfidPage(Math.max(1, result.totalPages)); } })
      .catch((err) => { if (!controller.signal.aborted) setRfidError(timelineError(err)); })
      .finally(() => { if (!controller.signal.aborted) setRfidLoading(false); });
    return () => controller.abort();
  }, [code, showRfid, rfidPage, rfidRefresh, data]);
  return <Offcanvas show onHide={onClose} placement="end" style={{ width: 'min(94vw, 900px)' }} scroll={false}>
    <Offcanvas.Header closeButton><Offcanvas.Title>Hành trình mẫu <span className="font-monospace text-primary text-break">{code}</span></Offcanvas.Title></Offcanvas.Header>
    <Offcanvas.Body>
      {loading ? <TimelineSkeleton /> : error ? <Alert variant="danger" role="alert">{error} <Button size="sm" variant="outline-danger" onClick={() => setRefresh((v) => v + 1)}>Thử lại</Button></Alert> : data && <>
        <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3"><div><strong className="font-monospace">{data.sample.barcode || data.sample.id}</strong><div className="small text-muted">ID bệnh nhân: {data.sample.patientId || 'Chưa ghi nhận'}</div></div><Badge bg={data.resultsAvailable ? 'success' : 'primary'}>{data.resultsAvailable ? 'Đã có kết quả chính thức' : timelineStatus(data.sample.status)}</Badge><Button size="sm" variant="outline-primary" onClick={() => { setRefresh((v) => v + 1); setRfidRefresh((v) => v + 1); }}>Làm mới</Button></div>
        <p className="small text-muted">Thời gian theo giờ Việt Nam (UTC+7). Tự làm mới mỗi 30 giây khi trang đang hiển thị. Chỉ đánh dấu chặng có bằng chứng đã ghi nhận; chặng trống không có nghĩa là chưa từng diễn ra.</p>
        <Row className="g-2 mb-4">{data.steps.map((step) => <Col xs={12} sm={6} lg={4} key={step.number}><Card className={`h-100 ${step.recorded ? 'border-primary bg-primary-subtle' : 'border-light bg-light'}`}><Card.Body className="p-3"><div className="small fw-bold">{step.number}. {step.title}</div><div className="small mt-2">{step.recorded ? timelineDate(step.timestamp) : 'Chưa có dữ liệu'}</div></Card.Body></Card></Col>)}</Row>
        {!data.resultsAvailable && <Alert variant="info" className="small">Hoàn tất phân tích chưa đồng nghĩa đã có kết quả chính thức. Chặng cuối chỉ được ghi nhận khi các báo cáo của mẫu đã được duyệt và có chữ ký.</Alert>}
        <h6 className="fw-bold">Sự kiện đã ghi nhận <span className="text-muted">({data.events.total})</span></h6>
        {data.events.items.length ? <ol className="list-unstyled border-start border-primary ps-3 ms-2">{data.events.items.map((event) => <li key={event.id} className="border rounded p-3 mb-3 bg-white"><div className="d-flex flex-wrap justify-content-between gap-2"><strong>{event.title}</strong><time className="small text-muted" dateTime={event.timestamp || undefined}>{timelineDate(event.timestamp)}</time></div>{!data.patientView && <><div className="small text-muted mt-1">Nguồn: {sources[event.source] || (event.source.startsWith('blood_samples.') ? `Mốc lưu trên mẫu (${event.source.split('.').pop()})` : event.source)}</div>{event.operatorName && <div className="small mt-1">Nhân viên: {event.operatorName}</div>}{event.location && <div className="small">Vị trí đã ghi nhận: {event.location}</div>}{event.notes && <p className="small mb-0 mt-2" style={{ whiteSpace: 'pre-wrap' }}>{event.notes}</p>}</>}</li>)}</ol> : <Alert variant="light">Chưa có sự kiện phù hợp. Không tự tạo thời gian từ trạng thái hiện tại.</Alert>}
        <Pager data={data.events} page={page} onChange={setPage} />
        {!data.patientView && <div className="mt-4 border-top pt-3"><Button variant="outline-primary" aria-expanded={showRfid} onClick={() => setShowRfid((v) => !v)}>{showRfid ? 'Ẩn' : 'Xem'} lượt quét RFID</Button>{showRfid && <>
          <Alert variant="warning" className="small mt-3">Lượt quét gắn trực tiếp ID mẫu được phân biệt với lượt quét chỉ theo thẻ khay hiện tại kể từ lúc lấy mẫu. Thẻ khay có thể dùng cho nhiều mẫu hoặc được tái sử dụng; lượt quét theo thẻ không chứng minh mẫu này đã qua chốt. UC71 chỉ đọc dữ liệu, không cập nhật vị trí hay trạng thái từ RFID.</Alert>
          {rfidLoading ? <TimelineSkeleton /> : rfidError ? <Alert variant="danger">{rfidError} <Button size="sm" variant="outline-danger" onClick={() => setRfidRefresh((v) => v + 1)}>Thử lại</Button></Alert> : rfid && <>
            <p className="small text-muted">{rfid.total} lượt quét · Thẻ hiện tại: <span className="font-monospace">{data.sample.rfidTag || 'Chưa gán'}</span></p>
            {rfid.items.length ? <Table responsive size="sm" className="align-middle"><thead><tr><th>Thời gian</th><th>Chốt / đầu đọc</th><th>Liên kết</th></tr></thead><tbody>{rfid.items.map((scan) => <tr key={scan.id}><td>{timelineDate(scan.timestamp)}</td><td>{scan.checkpoint || 'Chưa ghi nhận'}<div className="small text-muted">{scan.reader}{scan.operatorName && ` · ${scan.operatorName}`}</div>{scan.status && <div className="small">Trạng thái quét: {scan.status}</div>}</td><td><Badge bg={scan.linkType === 'Sample' ? 'primary' : 'secondary'}>{scan.linkType === 'Sample' ? 'ID mẫu' : 'Chỉ thẻ khay'}</Badge></td></tr>)}</tbody></Table> : <p className="text-muted">Chưa có lượt quét liên quan.</p>}
            <Pager data={rfid} page={rfidPage} onChange={setRfidPage} />
          </>}
        </>}</div>}
      </>}
    </Offcanvas.Body>
  </Offcanvas>;
}
