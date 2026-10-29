import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Table, Button, Badge, Alert, Spinner, Form } from 'react-bootstrap';
import { useNotificationContext } from '../../../shared/contexts/NotificationContext';
import { sampleService } from '../../../services/sampleService';

/**
 * Specimen Quality Assessment & Validation Screen.
 * Feature Task: Validate Sample (Web).
 * 
 * @description Allows laboratory technicians (role: lab_user) to review collected specimens,
 * enter technical evaluation notes (e.g., volume check, clot verification), and approve ('validated')
 * or reject samples before sending them to the automated analyzer.
 * 
 * @component
 * @returns {JSX.Element} The rendered sample validation table with action controls.
 */
const ValidateSample = () => {
  const [samples, setSamples] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { showSuccess, showError } = useNotificationContext();

  const [validatingId, setValidatingId] = useState(null);
  const [validateNotes, setValidateNotes] = useState({});

  useEffect(() => {
    fetchSamples();
  }, []);

  /**
   * Fetches the current list of blood samples awaiting validation.
   * @async
   */
  const fetchSamples = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await sampleService.getAllSamples();
      if (Array.isArray(response)) {
        setSamples(response);
      } else if (response && response.data) {
        setSamples(response.data);
      } else {
        setSamples([]);
      }
    } catch (err) {
      console.error('Lỗi khi tải danh sách mẫu:', err);
      setError('Không thể tải danh sách mẫu xét nghiệm. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Validates and accepts a specimen with recorded inspection notes.
   * Feature Task: Validate Sample (Web).
   * 
   * @async
   * @param {string} sampleId - The unique specimen ID to validate.
   */
  const handleValidate = async (sampleId) => {
    try {
      setValidatingId(sampleId);
      const notes = validateNotes[sampleId] || 'Mẫu đạt chuẩn';
      await sampleService.validateSample(sampleId, {
        isValid: true,
        notes: notes,
        validatedBy: 'lab_user'
      });
      showSuccess('Xác nhận mẫu thành công!');
      fetchSamples();
    } catch (err) {
      console.error('Lỗi khi validate sample:', err);
      showError('Xác nhận mẫu thất bại. Vui lòng thử lại.');
    } finally {
      setValidatingId(null);
    }
  };

  const handleNoteChange = (sampleId, value) => {
    setValidateNotes({
      ...validateNotes,
      [sampleId]: value
    });
  };

  const getStatusBadge = (status) => {
    switch (status?.toLowerCase()) {
      case 'collected': return <Badge bg="warning">Đã thu thập</Badge>;
      case 'validated': return <Badge bg="info">Đã xác nhận</Badge>;
      case 'processing': return <Badge bg="primary">Đang xử lý</Badge>;
      case 'completed': return <Badge bg="success">Hoàn thành</Badge>;
      case 'rejected': return <Badge bg="danger">Từ chối</Badge>;
      default: return <Badge bg="secondary">{status || 'Chưa xác định'}</Badge>;
    }
  };

  return (
    <Container fluid className="py-4">
      <Row className="mb-4">
        <Col>
          <h2 className="text-primary fw-bold">
            <i className="fas fa-vial me-2"></i>
            Xác Nhận Mẫu Xét Nghiệm
          </h2>
          <p className="text-muted">Quản lý và xác nhận chất lượng mẫu xét nghiệm trước khi phân tích</p>
        </Col>
        <Col xs="auto">
          <Button variant="outline-primary" onClick={fetchSamples} disabled={loading}>
            <i className="fas fa-sync-alt me-2"></i>
            Làm mới
          </Button>
        </Col>
      </Row>

      <Card className="shadow-sm border-0 rounded-3">
        <Card.Body className="p-0">
          {error && (
            <Alert variant="danger" className="m-3">
              {error}
            </Alert>
          )}

          <div className="table-responsive">
            <Table hover align="middle" className="mb-0">
              <thead className="bg-light">
                <tr>
                  <th className="py-3 px-4 border-0">Mã Mẫu</th>
                  <th className="py-3 border-0">Mã Bệnh Nhân</th>
                  <th className="py-3 border-0">Loại Mẫu</th>
                  <th className="py-3 border-0">Trạng Thái</th>
                  <th className="py-3 border-0" style={{ width: '25%' }}>Ghi Chú Xác Nhận</th>
                  <th className="py-3 px-4 border-0 text-end">Thao Tác</th>
                </tr>
              </thead>
              <tbody>
                {loading && samples.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="text-center py-5">
                      <Spinner animation="border" variant="primary" />
                      <p className="mt-2 text-muted">Đang tải dữ liệu...</p>
                    </td>
                  </tr>
                ) : samples.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="text-center py-5">
                      <div className="text-muted">
                        <i className="fas fa-inbox fa-3x mb-3 opacity-50"></i>
                        <h5>Không có mẫu nào</h5>
                        <p>Hiện không có mẫu xét nghiệm nào cần xác nhận.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  samples.map((sample) => (
                    <tr key={sample.id || sample.sampleId}>
                      <td className="px-4 fw-semibold">{sample.sampleCode || sample.id || sample.sampleId}</td>
                      <td>{sample.patientId || sample.patientName || 'N/A'}</td>
                      <td>{sample.sampleType || 'Máu'}</td>
                      <td>{getStatusBadge(sample.status)}</td>
                      <td>
                        <Form.Control
                          size="sm"
                          type="text"
                          placeholder="Nhập ghi chú (VD: Mẫu đạt chuẩn)"
                          value={validateNotes[sample.id || sample.sampleId] || ''}
                          onChange={(e) => handleNoteChange(sample.id || sample.sampleId, e.target.value)}
                          disabled={sample.status?.toLowerCase() === 'validated' || sample.status?.toLowerCase() === 'completed'}
                        />
                      </td>
                      <td className="px-4 text-end">
                        <Button
                          variant="success"
                          size="sm"
                          className="rounded-pill px-3"
                          disabled={validatingId === (sample.id || sample.sampleId) || sample.status?.toLowerCase() === 'validated' || sample.status?.toLowerCase() === 'completed'}
                          onClick={() => handleValidate(sample.id || sample.sampleId)}
                        >
                          {validatingId === (sample.id || sample.sampleId) ? (
                            <><Spinner size="sm" animation="border" className="me-1" /> Đang XL...</>
                          ) : (
                            <><i className="fas fa-check me-1"></i> Xác nhận</>
                          )}
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </Table>
          </div>
        </Card.Body>
      </Card>
    </Container >
  );
};

export default ValidateSample;