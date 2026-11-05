/**
 * @file AddMedicalNotesPage.jsx
 * @description UC51 – Treating doctor workspace for append-only medical notes and progress tracking.
 * Cho phép bác sĩ điều trị bổ sung diễn biến bệnh, y lệnh theo dõi và dặn dò vào bệnh án điện tử EMR.
 * Conforms to: Rule 19, Production Standards & AGENTS-DESIGN.md.
 */

import React, { useEffect, useRef, useState } from 'react';
import { Alert, Badge, Breadcrumb, Button, Card, Col, Container, Form, InputGroup, Row } from 'react-bootstrap';
import { Link, useSearchParams } from 'react-router-dom';
import { FaNotesMedical, FaSave, FaSearch, FaUserMd, FaHospitalUser } from 'react-icons/fa';
import { addMedicalNote, getMedicalNotes, medicalNoteError } from '../api/medicalNoteApi';
import '../../../components/common/SkeletonProfile.css';

const formatDate = (value) => value ? new Intl.DateTimeFormat('vi-VN', {
  day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
}).format(new Date(value)) : '—';

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
      if (!submission.current || submission.current.content !== text || submission.current.recordId !== context.record.id) {
        submission.current = { recordId: context.record.id, content: text, submissionId: crypto.randomUUID() };
      }
      await addMedicalNote(submission.current);
      setContent('');
      submission.current = null;
      setSuccess('Đã lưu ghi chú y khoa tiến trình thành công.');
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

  // Defensive array checks
  const notes = Array.isArray(context?.items)
    ? context.items
    : (Array.isArray(context?.data) ? context.data : (Array.isArray(context) ? context : []));
  const totalNotes = Number.isFinite(context?.total) ? context.total : notes.length;
  const pageSize = context?.pageSize || 20;

  return (
    <Container fluid className="py-4 px-md-4" style={{ backgroundColor: '#f8fafc', minHeight: '100vh' }}>
      <Breadcrumb className="mb-2">
        <Breadcrumb.Item linkAs={Link} linkProps={{ to: '/doctor/console' }}>Bàn Khám Bác Sĩ</Breadcrumb.Item>
        <Breadcrumb.Item linkAs={Link} linkProps={{ to: '/doctor/emr' }}>Hồ Sơ Bệnh Án</Breadcrumb.Item>
        <Breadcrumb.Item active>Ghi Chú Y Khoa Tiến Trình</Breadcrumb.Item>
      </Breadcrumb>

      <div className="d-flex flex-wrap justify-content-between gap-3 align-items-center mb-4 bg-white p-3 rounded-4 shadow-sm border" style={{ borderColor: '#E5E9EB' }}>
        <div>
          <h4 className="fw-bold mb-1 d-flex align-items-center gap-2" style={{ color: '#5E85E6' }}>
            <FaNotesMedical /> Ghi Chú Y Khoa & Tiến Trình Điều Trị
          </h4>
          <p className="text-muted small mb-0">Bổ sung diễn biến lâm sàng, chỉ dẫn điều trị và lời dặn vào hồ sơ bệnh án EMR.</p>
        </div>
        <div className="d-flex gap-2">
          <Button as={Link} to="/doctor/console" variant="outline-secondary" size="sm" className="d-flex align-items-center gap-1 shadow-sm" style={{ borderRadius: '9999px' }}>
            <FaHospitalUser /> Bàn khám bác sĩ
          </Button>
          <Button as={Link} to="/doctor/emr" variant="primary" size="sm" className="d-flex align-items-center gap-1 shadow-sm text-white" style={{ backgroundColor: '#5E85E6', borderColor: '#5E85E6', borderRadius: '9999px' }}>
            <FaUserMd /> Hồ sơ bệnh án EMR
          </Button>
        </div>
      </div>

      <Card className="shadow-sm rounded-4 mb-4" style={{ border: '1px solid #E5E9EB' }}>
        <Card.Body className="p-3">
          <Form onSubmit={lookup}>
            <Form.Label htmlFor="medical-note-record" className="fw-semibold text-dark mb-1">Tra cứu hồ sơ bệnh án:</Form.Label>
            <InputGroup>
              <Form.Control
                id="medical-note-record"
                placeholder="Nhập mã bệnh án EMR (VD: REC-... hoặc ID bệnh án)"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                maxLength={100}
                required
                disabled={saving}
              />
              <Button type="submit" disabled={!input.trim() || saving || loading} style={{ backgroundColor: '#5E85E6', borderColor: '#5E85E6', borderRadius: '0 9999px 9999px 0' }}>
                <FaSearch className="me-2" /> Mở Bệnh Án
              </Button>
            </InputGroup>
            <Form.Text className="text-muted">Chỉ bác sĩ phụ trách điều trị được quyền xem và thêm ghi chú vào bệnh án này.</Form.Text>
          </Form>
        </Card.Body>
      </Card>

      {success && (
        <Alert variant="success" role="status" dismissible onClose={() => setSuccess('')} className="shadow-sm rounded-3">
          {success}
        </Alert>
      )}

      {loadError && (
        <Alert variant="danger" role="alert" className="shadow-sm rounded-3">
          {loadError}
          <Button variant="outline-danger" size="sm" className="ms-3" style={{ borderRadius: '9999px' }} onClick={() => setReload((v) => v + 1)}>Thử lại</Button>
        </Alert>
      )}

      {loading ? (
        <Card className="shadow-sm rounded-4" aria-busy="true" aria-label="Đang tải bệnh án và ghi chú" style={{ border: '1px solid #E5E9EB' }}>
          <Card.Body>{[1, 2, 3, 4].map((key) => <div key={key} className="bms-skeleton mb-3" style={{ height: 36 }} />)}</Card.Body>
        </Card>
      ) : record ? (
        <Row className="g-4">
          <Col xl={5}>
            <Card className="shadow-sm rounded-4 mb-4" style={{ border: '1px solid #E5E9EB' }}>
              <Card.Header className="bg-white fw-bold py-3 d-flex justify-content-between align-items-center" style={{ borderColor: '#E5E9EB' }}>
                <span>Thông tin bệnh án</span>
                <Badge className="font-monospace px-3 py-1.5 rounded-pill text-white" style={{ backgroundColor: '#5E85E6' }}>
                  {record.recordCode || record.id}
                </Badge>
              </Card.Header>
              <Card.Body>
                <dl className="row mb-0">
                  <dt className="col-4 text-muted small">Bệnh nhân</dt>
                  <dd className="col-8 fw-semibold text-dark">{record.patientName}</dd>

                  <dt className="col-4 text-muted small">Mã bệnh nhân</dt>
                  <dd className="col-8 text-break font-monospace" style={{ color: '#5E85E6' }}>{record.patientId}</dd>

                  <dt className="col-4 text-muted small">Bác sĩ phụ trách</dt>
                  <dd className="col-8">{record.doctorName || 'BS. Chuyên Khoa'}</dd>

                  <dt className="col-4 text-muted small">Ngày lập</dt>
                  <dd className="col-8">{formatDate(record.createdAt)}</dd>

                  <dt className="col-4 text-muted small">Chẩn đoán</dt>
                  <dd className="col-8 fw-semibold">{record.icd10Code} — {record.diagnosis || record.chiefComplaint}</dd>
                </dl>
              </Card.Body>
            </Card>

            <Card className="shadow-sm rounded-4" style={{ border: '1px solid #E5E9EB' }}>
              <Card.Header className="bg-white fw-bold py-3" style={{ borderColor: '#E5E9EB' }}>
                Thêm Ghi Chú Y Khoa Mới
              </Card.Header>
              <Card.Body>
                <p className="text-muted small">
                  Ghi chú được lưu kèm danh tính bác sĩ và thời điểm ghi nhận. Theo quy chuẩn y tế, nội dung đã lưu được giữ nguyên phục vụ kiểm toán; nếu có diễn biến mới, bác sĩ hãy bổ sung ghi chú tiếp theo.
                </p>
                {saveError && <Alert variant="danger" role="alert" className="shadow-sm rounded-3">{saveError}</Alert>}
                <Form onSubmit={save}>
                  <div className="d-flex justify-content-between align-items-center mb-1">
                    <Form.Label htmlFor="medical-note-content" className="fw-semibold mb-0">Nội dung ghi chú <span className="text-danger">*</span></Form.Label>
                  </div>
                  {/* SOAPE Clinical Note Template Helpers */}
                  <div className="mb-2 d-flex flex-wrap gap-1 align-items-center">
                    <span className="small text-muted fw-semibold me-1" style={{ fontSize: "11px" }}>Mẫu SOAPE:</span>
                    <Button
                      variant="outline-primary"
                      size="sm"
                      className="py-0.5 px-2"
                      style={{ fontSize: "11px", borderRadius: '9999px' }}
                      onClick={() => setContent(
`[S - Bệnh sử cơ năng]: Bệnh nhân khai triệu chứng cơ năng thuyên giảm, ăn ngủ được, không sốt.
[O - Khám thực thể & Sinh hiệu]: Mạch 76 bpm, Huyết áp 120/80 mmHg, SpO2 98%, Tim đều rõ, Phổi thông khí tốt.
[A - Đánh giá lâm sàng]: Diễn tiến điều trị đáp ứng tốt với phác đồ hiện tại.
[P - Kế hoạch xử trí]: Tiếp tục duy trì liều điều trị, theo dõi chỉ số cận lâm sàng định kỳ.
[E - Tư vấn & Dặn dò]: Hướng dẫn chế độ ăn ít muối, uống đủ nước, tái khám sau 2 tuần hoặc khi có dấu hiệu bất thường.`
                      )}
                    >
                      SOAPE Chuẩn
                    </Button>
                    <Button
                      variant="outline-info"
                      size="sm"
                      className="py-0.5 px-2"
                      style={{ fontSize: "11px", borderRadius: '9999px' }}
                      onClick={() => setContent(
`[Theo dõi cận lâm sàng]: Đã đối chiếu kết quả xét nghiệm máu phòng Lab. Các chỉ số men gan và glucose máu trong giới hạn kiểm soát. Tiếp tục duy trì phác đồ điều trị.`
                      )}
                    >
                      Sau Xét Nghiệm
                    </Button>
                    <Button
                      variant="outline-secondary"
                      size="sm"
                      className="py-0.5 px-2"
                      style={{ fontSize: "11px", borderRadius: '9999px' }}
                      onClick={() => setContent(
`[Y lệnh & Tư vấn dùng thuốc]: Hướng dẫn bệnh nhân dùng thuốc đúng liều lượng sau bữa ăn. Cảnh báo các tác dụng phụ có thể gặp và hướng xử trí kịp thời.`
                      )}
                    >
                      Dặn Dò Thuốc
                    </Button>
                  </div>
                  <Form.Control
                    as="textarea"
                    id="medical-note-content"
                    rows={8}
                    value={content}
                    maxLength={5000}
                    required
                    disabled={saving}
                    aria-describedby="medical-note-length"
                    placeholder="Nhập diễn biến lâm sàng, chỉ dẫn dùng thuốc, phản ứng sau xét nghiệm hoặc lời dặn cho lần khám này…"
                    onChange={(e) => { setContent(e.target.value); setSuccess(''); }}
                  />
                  <div id="medical-note-length" className="text-muted small text-end mt-1">{content.length}/5.000 ký tự</div>
                  <div className="d-flex justify-content-end gap-2 mt-3">
                    <Button
                      variant="outline-secondary"
                      disabled={saving || !content}
                      style={{ borderRadius: '9999px' }}
                      onClick={() => {
                        if (window.confirm('Xóa nội dung ghi chú chưa lưu?')) {
                          setContent('');
                          submission.current = null;
                          setSaveError('');
                        }
                      }}
                    >
                      Xóa nội dung
                    </Button>
                    <Button
                      type="submit"
                      disabled={saving || !content.trim()}
                      style={{ backgroundColor: '#5E85E6', borderColor: '#5E85E6', borderRadius: '9999px' }}
                      className="shadow-sm text-white"
                    >
                      <FaSave className="me-2" />{saving ? 'Đang lưu…' : 'Lưu Ghi Chú'}
                    </Button>
                  </div>
                </Form>
              </Card.Body>
            </Card>
          </Col>

          <Col xl={7}>
            <Card className="shadow-sm rounded-4" style={{ border: '1px solid #E5E9EB' }}>
              <Card.Header className="bg-white fw-bold py-3 d-flex justify-content-between align-items-center" style={{ borderColor: '#E5E9EB' }}>
                <span>Lịch Sử Diễn Biến & Ghi Chú Lâm Sàng</span>
                <Badge bg="secondary" className="rounded-pill">{totalNotes} ghi chú</Badge>
              </Card.Header>
              <Card.Body>
                {!notes.length ? (
                  <div className="text-center text-muted py-5">
                    <FaNotesMedical size={36} className="mb-3 text-secondary" />
                    <h6>Chưa có ghi chú bổ sung nào</h6>
                    <p className="mb-0 small">Bác sĩ nhập ghi chú đầu tiên trong biểu mẫu bên trái.</p>
                  </div>
                ) : (
                  notes.map((note) => (
                    <article key={note.id} className="border rounded-4 p-3 mb-3 bg-white" style={{ borderColor: '#E5E9EB' }}>
                      <div className="d-flex flex-wrap justify-content-between gap-2 border-bottom pb-2 mb-2" style={{ borderColor: '#E5E9EB' }}>
                        <span className="fw-semibold text-dark">
                          <FaUserMd className="me-2" style={{ color: '#5E85E6' }} />{note.authorName || 'Bác sĩ phụ trách'}
                        </span>
                        <time className="text-muted small" dateTime={note.createdAt}>{formatDate(note.createdAt)}</time>
                      </div>
                      <p className="mb-0 text-dark" style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{note.content}</p>
                    </article>
                  ))
                )}
                {totalNotes > pageSize && (
                  <div className="d-flex align-items-center justify-content-between gap-2 mt-3 pt-2 border-top" style={{ borderColor: '#E5E9EB' }}>
                    <Button variant="outline-primary" size="sm" style={{ borderRadius: '9999px' }} disabled={page <= 1 || saving} onClick={() => setPage((v) => v - 1)}>Trang Trước</Button>
                    <span className="small text-muted">Trang {page}/{Math.ceil(totalNotes / pageSize)}</span>
                    <Button variant="outline-primary" size="sm" style={{ borderRadius: '9999px' }} disabled={page * pageSize >= totalNotes || saving} onClick={() => setPage((v) => v + 1)}>Trang Sau</Button>
                  </div>
                )}
              </Card.Body>
            </Card>
          </Col>
        </Row>
      ) : !loadError && (
        <Card className="shadow-sm rounded-4" style={{ border: '1px solid #E5E9EB' }}>
          <Card.Body className="text-center text-muted py-5">
            <FaNotesMedical size={40} className="mb-3" style={{ color: '#5E85E6' }} />
            <h5 className="fw-bold text-secondary">Chọn hoặc Nhập Mã Bệnh Án Để Bắt Đầu</h5>
            <p className="mb-0 small">Nhập mã bệnh án EMR ở ô tìm kiếm phía trên hoặc mở trực tiếp từ phân hệ Hồ Sơ Bệnh Án EMR.</p>
          </Card.Body>
        </Card>
      )}
    </Container>
  );
}
