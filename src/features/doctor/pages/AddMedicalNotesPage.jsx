/**
 * @file AddMedicalNotesPage.jsx
 * @description UC51 treating-doctor workspace for append-only medical addenda.
 */
import React, { useEffect, useRef, useState } from 'react';
import { Alert, Badge, Breadcrumb, Button, Card, Col, Container, Form, InputGroup, Row } from 'react-bootstrap';
import { Link, useSearchParams } from 'react-router-dom';
import { FaNotesMedical, FaSave, FaSearch, FaUserMd } from 'react-icons/fa';
import { addMedicalNote, getMedicalNotes, medicalNoteError } from '../api/medicalNoteApi';
import '../../../components/common/SkeletonProfile.css';

const formatDate = (value) => value ? new Intl.DateTimeFormat('vi-VN', {
  day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
}).format(new Date(value)) : '—';

/** Renders existing EMR context, a note editor, and read-only history for UC51. */
export default function AddMedicalNotesPage() {
  const [params, setParams] = useSearchParams();
  const recordId = params.get('recordId') || '';
  const [input, setInput] = useState(recordId);
  const [context, setContext] = useState(null);
  const [content, setContent] = useState('');
  const [page, setPage] = useState(1);
  const [reload, setReload] = useState(0);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [saveError, setSaveError] = useState('');
  const [success, setSuccess] = useState('');
  const submission = useRef(null);
  const savingRef = useRef(false);

  useEffect(() => {
    setInput(recordId);
    setContent('');
    setSaveError('');
    setSuccess('');
    submission.current = null;
  }, [recordId]);

  useEffect(() => {
    const controller = new AbortController();
    setLoadError('');
    if (!recordId) { setContext(null); setLoading(false); return () => controller.abort(); }
    setLoading(true);
    getMedicalNotes(recordId, page, controller.signal)
      .then((data) => { if (!controller.signal.aborted) setContext(data); })
      .catch((error) => {
        if (!controller.signal.aborted) { setContext(null); setLoadError(medicalNoteError(error)); }
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    // Cancellation prevents an earlier lookup from replacing the selected patient's record.
    return () => controller.abort();
  }, [recordId, page, reload]);

  const lookup = (event) => {
    event.preventDefault();
    const next = input.trim();
    if (!next || saving) return;
    if (next !== recordId && content.trim() && !window.confirm('Bỏ nội dung ghi chú chưa lưu để mở bệnh án khác?')) return;
    setPage(1);
    setContext(null);
    setParams({ recordId: next });
    setReload((value) => value + 1);
  };

  const save = async (event) => {
    event.preventDefault();
    const text = content.trim();
    if (savingRef.current || loading || !context || !text || text.length > 5000) return;
    savingRef.current = true;
    setSaving(true);
    setSaveError('');
    setSuccess('');
    try {
      // Preserve the UUID after a network failure so retrying cannot create a second copy.
      if (!submission.current || submission.current.content !== text || submission.current.recordId !== context.record.id) {
        submission.current = { recordId: context.record.id, content: text, submissionId: crypto.randomUUID() };
      }
      await addMedicalNote(submission.current);
      setContent('');
      submission.current = null;
      setSuccess('Đã lưu ghi chú y khoa thành công.');
      setPage(1);
      setReload((value) => value + 1);
    } catch (error) {
      setSaveError(medicalNoteError(error));
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  const record = context?.record;
  return (
    <Container fluid className="py-4 px-md-4">
      <Breadcrumb>
        <Breadcrumb.Item linkAs={Link} linkProps={{ to: '/dashboard' }}>Trang Chủ</Breadcrumb.Item>
        <Breadcrumb.Item active>Ghi Chú Y Khoa</Breadcrumb.Item>
      </Breadcrumb>
      <div className="d-flex flex-wrap justify-content-between gap-3 align-items-center mb-4">
        <div>
          <h4 className="fw-bold mb-1"><FaNotesMedical className="text-primary me-2" />Thêm Ghi Chú Y Khoa</h4>
          <p className="text-muted mb-0">Bổ sung diễn biến và lời dặn vào bệnh án đang phụ trách.</p>
        </div>
        <Button as={Link} to="/doctor/emr" variant="outline-primary"><FaUserMd className="me-2" />Hồ sơ bệnh án</Button>
      </div>

      <Card className="border-0 shadow-sm rounded-3 mb-4">
        <Card.Body>
          <Form onSubmit={lookup}>
            <Form.Label htmlFor="medical-note-record" className="fw-semibold">Tra cứu bệnh án</Form.Label>
            <InputGroup>
              <Form.Control id="medical-note-record" placeholder="Nhập mã bệnh án EMR hoặc ID bệnh án"
                value={input} onChange={(e) => setInput(e.target.value)} maxLength={100} required disabled={saving} />
              <Button type="submit" disabled={!input.trim() || saving || loading}><FaSearch className="me-2" />Mở bệnh án</Button>
            </InputGroup>
            <Form.Text>Chỉ bác sĩ phụ trách được xem và thêm ghi chú vào bệnh án này.</Form.Text>
          </Form>
        </Card.Body>
      </Card>
      {success && <Alert variant="success" role="status">{success}</Alert>}
      {loadError && <Alert variant="danger" role="alert">{loadError}
        <Button variant="outline-danger" size="sm" className="ms-3" onClick={() => setReload((v) => v + 1)}>Thử lại</Button>
      </Alert>}
      {loading ? (
        <Card className="border-0 shadow-sm" aria-busy="true" aria-label="Đang tải bệnh án và ghi chú">
          <Card.Body>{[1, 2, 3, 4].map((key) => <div key={key} className="bms-skeleton mb-3" style={{ height: 36 }} />)}</Card.Body>
        </Card>
      ) : record ? (
        <Row className="g-4">
          <Col xl={5}>
            <Card className="border-0 shadow-sm rounded-3 mb-4">
              <Card.Header className="bg-white fw-bold py-3">Thông tin bệnh án <Badge bg="primary" className="ms-2">{record.recordCode}</Badge></Card.Header>
              <Card.Body>
                <dl className="row mb-0">
                  <dt className="col-4">Bệnh nhân</dt><dd className="col-8">{record.patientName}</dd>
                  <dt className="col-4">Mã bệnh nhân</dt><dd className="col-8 text-break">{record.patientId}</dd>
                  <dt className="col-4">Bác sĩ</dt><dd className="col-8">{record.doctorName}</dd>
                  <dt className="col-4">Ngày lập</dt><dd className="col-8">{formatDate(record.createdAt)}</dd>
                  <dt className="col-4">Chẩn đoán</dt><dd className="col-8">{record.icd10Code} — {record.diagnosis}</dd>
                </dl>
              </Card.Body>
            </Card>
            <Card className="border-0 shadow-sm rounded-3">
              <Card.Header className="bg-white fw-bold py-3">Ghi chú bổ sung</Card.Header>
              <Card.Body>
                <p className="text-muted small">Ghi chú được lưu kèm người ghi và thời gian. Sau khi lưu, nội dung được giữ nguyên; cần điều chỉnh hãy thêm ghi chú mới.</p>
                {saveError && <Alert variant="danger" role="alert">{saveError}</Alert>}
                <Form onSubmit={save}>
                  <Form.Label htmlFor="medical-note-content">Nội dung <span className="text-danger">*</span></Form.Label>
                  <Form.Control as="textarea" id="medical-note-content" rows={8} value={content}
                    maxLength={5000} required disabled={saving} aria-describedby="medical-note-length"
                    placeholder="Nhập diễn biến lâm sàng, hướng dẫn hoặc lời dặn cho lần khám này…"
                    onChange={(e) => { setContent(e.target.value); setSuccess(''); }} />
                  <div id="medical-note-length" className="text-muted small text-end mt-1">{content.length}/5.000 ký tự</div>
                  <div className="d-flex justify-content-end gap-2 mt-3">
                    <Button variant="outline-secondary" disabled={saving || !content} onClick={() => {
                      if (window.confirm('Xóa nội dung ghi chú chưa lưu?')) { setContent(''); submission.current = null; setSaveError(''); }
                    }}>Xóa nội dung</Button>
                    <Button type="submit" disabled={saving || !content.trim()}><FaSave className="me-2" />{saving ? 'Đang lưu…' : 'Lưu ghi chú'}</Button>
                  </div>
                </Form>
              </Card.Body>
            </Card>
          </Col>
          <Col xl={7}>
            <Card className="border-0 shadow-sm rounded-3">
              <Card.Header className="bg-white fw-bold py-3 d-flex justify-content-between">
                <span>Lịch sử ghi chú</span><Badge bg="secondary">{context.total} ghi chú</Badge>
              </Card.Header>
              <Card.Body>
                {!context.items.length ? <div className="text-center text-muted py-5"><FaNotesMedical size={36} className="mb-3" />
                  <h6>Chưa có ghi chú bổ sung</h6><p className="mb-0">Nhập ghi chú đầu tiên trong biểu mẫu bên cạnh.</p></div>
                  : context.items.map((note) => <article key={note.id} className="border rounded-3 p-3 mb-3">
                    <div className="d-flex flex-wrap justify-content-between gap-2 border-bottom pb-2 mb-2">
                      <span className="fw-semibold"><FaUserMd className="text-primary me-2" />{note.authorName}</span>
                      <time className="text-muted small" dateTime={note.createdAt}>{formatDate(note.createdAt)}</time>
                    </div>
                    <p className="mb-0" style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{note.content}</p>
                  </article>)}
                {context.total > context.pageSize && <div className="d-flex align-items-center justify-content-between gap-2">
                  <Button variant="outline-primary" size="sm" disabled={page <= 1 || saving} onClick={() => setPage((v) => v - 1)}>Trước</Button>
                  <span className="small text-muted">Trang {page}/{Math.ceil(context.total / context.pageSize)}</span>
                  <Button variant="outline-primary" size="sm" disabled={page * context.pageSize >= context.total || saving} onClick={() => setPage((v) => v + 1)}>Sau</Button>
                </div>}
              </Card.Body>
            </Card>
          </Col>
        </Row>
      ) : !loadError && <Card className="border-0 shadow-sm"><Card.Body className="text-center text-muted py-5">
        <FaNotesMedical size={40} className="text-primary mb-3" /><h5>Chọn bệnh án để bắt đầu</h5>
        <p className="mb-0">Nhập mã bệnh án ở trên hoặc mở ghi chú từ hồ sơ bệnh án.</p>
      </Card.Body></Card>}
    </Container>
  );
}
