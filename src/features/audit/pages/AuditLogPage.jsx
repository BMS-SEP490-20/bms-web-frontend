/**
 * Audit Log Management Page
 * 
 * Allows Admin and Officer (Manager) roles to inspect security, access,
 * and operational audit trails (e.g., login attempts, data modifications, security overrides).
 * 
 * @author Blood Laboratory Management Team
 * @version 1.0.0
 * @since 2024
 */

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Row, Col, Card, Table, Badge, Button, 
  Form, InputGroup, Modal, Spinner 
} from 'react-bootstrap';
import { 
  FaShieldAlt, FaSearch, FaSyncAlt, FaFileExport, 
  FaExclamationTriangle, FaCheckCircle, FaTimesCircle, 
  FaInfoCircle, FaLock, FaUserShield, FaEye
} from 'react-icons/fa';
import { auditLogService } from '../../../services/auditLogService';

const AuditLogPage = () => {

  // Immutable audit events retrieved from MongoDB collection 'AuditLogs'.
  const [logs, setLogs] = useState([]);
  const [statistics, setStatistics] = useState(null);
  const [loading, setLoading] = useState(true);

  // Search and categorization filters forwarded to the backend repository query.
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [severityFilter, setSeverityFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');


  // Modal view
  const [selectedLog, setSelectedLog] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      const [logsRes, statsRes] = await Promise.all([
        auditLogService.getAuditLogs({
          category: categoryFilter,
          severity: severityFilter,
          status: statusFilter,
          searchTerm: searchTerm.trim(),
          pageSize: 100
        }),
        auditLogService.getStatistics()
      ]);

      if (logsRes.success) {
        setLogs(logsRes.data);
      }
      if (statsRes.success) {
        setStatistics(statsRes.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [categoryFilter, severityFilter, statusFilter, searchTerm]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // Export to CSV
  const handleExportCSV = () => {
    if (logs.length === 0) return;
    const headers = ['AuditId', 'Timestamp', 'UserId', 'UserName', 'UserRole', 'Action', 'Category', 'Severity', 'Status', 'IpAddress', 'TargetEntity', 'Details'];
    const rows = logs.map(l => [
      l.auditId,
      new Date(l.timestamp).toISOString(),
      `"${l.userId || ''}"`,
      `"${l.userName || ''}"`,
      `"${l.userRole || ''}"`,
      `"${l.action || ''}"`,
      l.category,
      l.severity,
      l.status,
      l.ipAddress,
      `"${l.targetEntity || ''}"`,
      `"${(l.details || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `AuditLog_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getSeverityBadge = (severity) => {
    switch (severity) {
      case 'CRITICAL':
        return <Badge bg="danger" className="px-2 py-1"><FaExclamationTriangle className="me-1" />NGHIÊM TRỌNG</Badge>;
      case 'ERROR':
        return <Badge bg="danger" className="px-2 py-1"><FaTimesCircle className="me-1" />LỖI</Badge>;
      case 'WARNING':
        return <Badge bg="warning" text="dark" className="px-2 py-1"><FaExclamationTriangle className="me-1" />CẢNH BÁO</Badge>;
      case 'INFO':
      default:
        return <Badge bg="info" className="px-2 py-1"><FaInfoCircle className="me-1" />THÔNG TIN</Badge>;
    }
  };

  const getCategoryBadge = (category) => {
    switch (category) {
      case 'SECURITY':
        return <Badge bg="danger-subtle" className="text-danger border border-danger-subtle fw-semibold">BẢO MẬT</Badge>;
      case 'ACCESS':
        return <Badge bg="primary-subtle" className="text-primary border border-primary-subtle fw-semibold">TRUY CẬP</Badge>;
      case 'OPERATIONAL':
        return <Badge bg="success-subtle" className="text-success border border-success-subtle fw-semibold">VẬN HÀNH</Badge>;
      case 'DATA_CHANGE':
        return <Badge bg="warning-subtle" className="text-warning border border-warning-subtle fw-semibold">DỮ LIỆU</Badge>;
      default:
        return <Badge bg="secondary-subtle" className="text-secondary border fw-semibold">{category}</Badge>;
    }
  };

  return (
    <div className="w-100">
      {/* Top Banner */}
      <Card className="border-0 shadow-sm rounded-4 mb-4 bg-white">
        <Card.Body className="p-4">
          <div className="d-flex flex-wrap justify-content-between align-items-center gap-3">
            <div>
              <div className="d-flex align-items-center gap-2 flex-wrap">
                <h4 className="mb-0 fw-bold text-dark d-flex align-items-center gap-2">
                  <FaShieldAlt className="text-primary" />
                  Nhật Ký Kiểm Toán (View Audit Log)
                </h4>
                <Badge bg="primary-subtle" className="text-primary border border-primary-subtle px-3 py-2 rounded-pill fw-semibold">
                  Admin / Officer
                </Badge>
              </div>
              <p className="text-muted mb-0 small mt-1">
                Theo dõi và kiểm tra toàn bộ vết kiểm toán an ninh, nhật ký truy cập, thay đổi dữ liệu và ghi đè bảo mật trên hệ thống.
              </p>
            </div>

            <div className="d-flex align-items-center gap-2 flex-wrap">
              <Button
                variant="outline-secondary"
                size="sm"
                onClick={handleExportCSV}
                disabled={logs.length === 0}
                className="d-flex align-items-center gap-2 rounded-pill px-3 py-2"
              >
                <FaFileExport />
                <span>Xuất CSV</span>
              </Button>
              <Button
                variant="light"
                size="sm"
                onClick={fetchLogs}
                disabled={loading}
                className="d-flex align-items-center gap-2 border rounded-pill px-3 py-2"
              >
                <FaSyncAlt className={loading ? 'fa-spin' : ''} />
                <span>Làm mới</span>
              </Button>
            </div>
          </div>
        </Card.Body>
      </Card>

      {/* Statistics Cards */}
      {statistics && (
        <Row className="g-3 mb-4">
          <Col xs={12} sm={6} lg={3}>
            <Card className="border-0 shadow-sm rounded-4 h-100" style={{ borderLeft: '4px solid #0d6efd' }}>
              <Card.Body className="p-3">
                <div className="d-flex align-items-center justify-content-between">
                  <div>
                    <span className="text-muted small fw-medium">Tổng số sự kiện</span>
                    <h3 className="fw-bold mb-0 text-dark mt-1">{statistics.totalLogs}</h3>
                  </div>
                  <div className="rounded-circle bg-primary bg-opacity-10 p-3 text-primary">
                    <FaShieldAlt className="fs-4" />
                  </div>
                </div>
              </Card.Body>
            </Card>
          </Col>
          <Col xs={12} sm={6} lg={3}>
            <Card className="border-0 shadow-sm rounded-4 h-100" style={{ borderLeft: '4px solid #dc3545' }}>
              <Card.Body className="p-3">
                <div className="d-flex align-items-center justify-content-between">
                  <div>
                    <span className="text-muted small fw-medium">Sự kiện bảo mật</span>
                    <h3 className="fw-bold mb-0 text-danger mt-1">{statistics.securityEvents}</h3>
                  </div>
                  <div className="rounded-circle bg-danger bg-opacity-10 p-3 text-danger">
                    <FaLock className="fs-4" />
                  </div>
                </div>
              </Card.Body>
            </Card>
          </Col>
          <Col xs={12} sm={6} lg={3}>
            <Card className="border-0 shadow-sm rounded-4 h-100" style={{ borderLeft: '4px solid #ffc107' }}>
              <Card.Body className="p-3">
                <div className="d-flex align-items-center justify-content-between">
                  <div>
                    <span className="text-muted small fw-medium">Cảnh báo nghiêm trọng</span>
                    <h3 className="fw-bold mb-0 text-warning mt-1">{statistics.criticalAlerts}</h3>
                  </div>
                  <div className="rounded-circle bg-warning bg-opacity-10 p-3 text-warning">
                    <FaExclamationTriangle className="fs-4" />
                  </div>
                </div>
              </Card.Body>
            </Card>
          </Col>
          <Col xs={12} sm={6} lg={3}>
            <Card className="border-0 shadow-sm rounded-4 h-100" style={{ borderLeft: '4px solid #6c757d' }}>
              <Card.Body className="p-3">
                <div className="d-flex align-items-center justify-content-between">
                  <div>
                    <span className="text-muted small fw-medium">Thất bại / Truy cập lỗi</span>
                    <h3 className="fw-bold mb-0 text-secondary mt-1">{statistics.failedActions}</h3>
                  </div>
                  <div className="rounded-circle bg-secondary bg-opacity-10 p-3 text-secondary">
                    <FaTimesCircle className="fs-4" />
                  </div>
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      )}

      {/* Filter Bar */}
      <Card className="border-0 shadow-sm rounded-4 mb-4 bg-white">
        <Card.Body className="p-3">
          <Row className="g-3">
            <Col xs={12} md={4}>
              <InputGroup>
                <InputGroup.Text className="bg-light border-end-0">
                  <FaSearch className="text-muted" />
                </InputGroup.Text>
                <Form.Control
                  placeholder="Tìm theo người dùng, hành động, đối tượng..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="bg-light border-start-0"
                />
              </InputGroup>
            </Col>
            <Col xs={6} sm={4} md={2}>
              <Form.Select 
                value={categoryFilter} 
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="bg-light"
              >
                <option value="ALL">Tất cả danh mục</option>
                <option value="SECURITY">Bảo mật (Security)</option>
                <option value="ACCESS">Truy cập (Access)</option>
                <option value="OPERATIONAL">Vận hành (Operational)</option>
                <option value="DATA_CHANGE">Thay đổi dữ liệu</option>
              </Form.Select>
            </Col>
            <Col xs={6} sm={4} md={3}>
              <Form.Select 
                value={severityFilter} 
                onChange={(e) => setSeverityFilter(e.target.value)}
                className="bg-light"
              >
                <option value="ALL">Tất cả mức độ</option>
                <option value="CRITICAL">Nghiêm trọng (Critical)</option>
                <option value="ERROR">Lỗi (Error)</option>
                <option value="WARNING">Cảnh báo (Warning)</option>
                <option value="INFO">Thông tin (Info)</option>
              </Form.Select>
            </Col>
            <Col xs={12} sm={4} md={3}>
              <Form.Select 
                value={statusFilter} 
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-light"
              >
                <option value="ALL">Tất cả trạng thái</option>
                <option value="SUCCESS">Thành công (Success)</option>
                <option value="FAILED">Thất bại (Failed)</option>
              </Form.Select>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* Audit Log Table */}
      <Card className="border-0 shadow-sm rounded-4 overflow-hidden bg-white">
        <Card.Body className="p-0">
          {loading && logs.length === 0 ? (
            <div className="text-center py-5">
              <Spinner animation="border" variant="primary" />
              <p className="mt-3 text-muted small">Đang tải nhật ký kiểm toán hệ thống...</p>
            </div>
          ) : logs.length > 0 ? (
            <div className="table-responsive">
              <Table hover className="align-middle mb-0">
                <thead className="table-light text-muted small text-uppercase">
                  <tr>
                    <th style={{ width: '170px' }}>Thời gian</th>
                    <th style={{ width: '200px' }}>Người thực hiện</th>
                    <th style={{ width: '160px' }}>Hành động</th>
                    <th style={{ width: '130px' }}>Phân loại</th>
                    <th style={{ width: '120px' }}>Mức độ</th>
                    <th>Nội dung chi tiết</th>
                    <th style={{ width: '110px' }}>IP / Thiết bị</th>
                    <th style={{ width: '80px' }} className="text-center">Chi tiết</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((item) => (
                    <tr key={item.auditId}>
                      <td className="small text-secondary font-monospace">
                        {new Date(item.timestamp).toLocaleString('vi-VN', {
                          year: 'numeric',
                          month: '2-digit',
                          day: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit'
                        })}
                      </td>
                      <td>
                        <div className="fw-semibold text-dark small">{item.userName}</div>
                        <div className="d-flex align-items-center gap-1 text-muted" style={{ fontSize: '0.75rem' }}>
                          <FaUserShield className="text-primary" />
                          <span>{item.userRole}</span>
                        </div>
                      </td>
                      <td>
                        <span className="badge bg-light text-dark border font-monospace" style={{ fontSize: '0.8rem' }}>
                          {item.action}
                        </span>
                      </td>
                      <td>{getCategoryBadge(item.category)}</td>
                      <td>{getSeverityBadge(item.severity)}</td>
                      <td>
                        <div className="small text-dark text-truncate" style={{ maxWidth: '380px' }} title={item.details}>
                          {item.details}
                        </div>
                        {item.targetEntity && (
                          <div className="text-muted font-monospace" style={{ fontSize: '0.75rem' }}>
                            Đối tượng: <strong>{item.targetEntity}</strong> {item.entityId && `(#${item.entityId})`}
                          </div>
                        )}
                      </td>
                      <td>
                        <div className="small font-monospace text-secondary">{item.ipAddress}</div>
                        <div className="text-muted" style={{ fontSize: '0.7rem' }}>
                          {item.status === 'SUCCESS' ? (
                            <span className="text-success fw-medium"><FaCheckCircle className="me-1" />Thành công</span>
                          ) : (
                            <span className="text-danger fw-medium"><FaTimesCircle className="me-1" />Thất bại</span>
                          )}
                        </div>
                      </td>
                      <td className="text-center">
                        <Button
                          variant="outline-primary"
                          size="sm"
                          className="rounded-circle p-1"
                          style={{ width: '32px', height: '32px' }}
                          onClick={() => {
                            setSelectedLog(item);
                            setShowDetailModal(true);
                          }}
                          title="Xem chi tiết"
                        >
                          <FaEye />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-5">
              <FaShieldAlt className="text-muted mb-3" style={{ fontSize: '3rem', opacity: 0.3 }} />
              <h5 className="text-dark fw-bold">Không tìm thấy bản ghi kiểm toán nào</h5>
              <p className="text-muted small">Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm.</p>
            </div>
          )}
        </Card.Body>
      </Card>

      {/* Detail Modal */}
      <Modal show={showDetailModal} onHide={() => setShowDetailModal(false)} size="lg" centered>
        <Modal.Header closeButton className="border-0 pb-0">
          <Modal.Title className="fw-bold d-flex align-items-center gap-2">
            <FaShieldAlt className="text-primary" />
            Chi Tiết Bản Ghi Kiểm Toán (Audit Detail)
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="pt-3">
          {selectedLog && (
            <div>
              <div className="p-3 bg-light rounded-3 mb-3">
                <Row className="g-2">
                  <Col sm={6}>
                    <div className="small text-muted">Mã Audit Log:</div>
                    <div className="fw-bold font-monospace">{selectedLog.auditId}</div>
                  </Col>
                  <Col sm={6}>
                    <div className="small text-muted">Thời gian ghi nhận:</div>
                    <div className="fw-semibold">
                      {new Date(selectedLog.timestamp).toLocaleString('vi-VN')}
                    </div>
                  </Col>
                  <Col sm={6}>
                    <div className="small text-muted">Người thực hiện:</div>
                    <div className="fw-semibold text-dark">
                      {selectedLog.userName} ({selectedLog.userRole})
                    </div>
                  </Col>
                  <Col sm={6}>
                    <div className="small text-muted">Địa chỉ IP & Thiết bị:</div>
                    <div className="fw-semibold font-monospace">
                      {selectedLog.ipAddress} - {selectedLog.browser || 'Web Browser'}
                    </div>
                  </Col>
                  <Col sm={6}>
                    <div className="small text-muted">Phân loại & Mức độ:</div>
                    <div className="d-flex align-items-center gap-2 mt-1">
                      {getCategoryBadge(selectedLog.category)}
                      {getSeverityBadge(selectedLog.severity)}
                    </div>
                  </Col>
                  <Col sm={6}>
                    <div className="small text-muted">Trạng thái kết quả:</div>
                    <div className="mt-1">
                      {selectedLog.status === 'SUCCESS' ? (
                        <Badge bg="success" className="px-2 py-1"><FaCheckCircle className="me-1" />Thành công (SUCCESS)</Badge>
                      ) : (
                        <Badge bg="danger" className="px-2 py-1"><FaTimesCircle className="me-1" />Thất bại (FAILED)</Badge>
                      )}
                    </div>
                  </Col>
                </Row>
              </div>

              <div className="mb-3">
                <label className="fw-bold small text-muted text-uppercase mb-1">Hành động thực hiện (Action)</label>
                <div className="p-2 border rounded font-monospace bg-white text-primary fw-bold">
                  {selectedLog.action}
                </div>
              </div>

              <div className="mb-3">
                <label className="fw-bold small text-muted text-uppercase mb-1">Đối tượng tác động (Target Entity)</label>
                <div className="p-2 border rounded bg-white small">
                  <strong>{selectedLog.targetEntity}</strong> {selectedLog.entityId && `(ID: ${selectedLog.entityId})`}
                </div>
              </div>

              <div>
                <label className="fw-bold small text-muted text-uppercase mb-1">Nội dung chi tiết (Details & Payload)</label>
                <div className="p-3 border rounded bg-light font-monospace small" style={{ whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>
                  {selectedLog.details}
                </div>
              </div>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer className="border-0">
          <Button variant="secondary" onClick={() => setShowDetailModal(false)}>
            Đóng
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default AuditLogPage;
