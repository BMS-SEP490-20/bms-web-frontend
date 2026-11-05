/**
 * @file AuditLogPage.jsx
 * @description Master Security & Operational Audit Log Management Page (UC64).
 * Allows Quản trị viên hệ thống (System Admin) and Trưởng bộ phận (Manager) to inspect
 * immutable security, access, and operational audit trails.
 * Conforms to: Production Medical Standards, ISO 15189 Quality Management & Clean Architecture.
 * @module features/audit/pages/AuditLogPage
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  // Immutable audit events retrieved from MongoDB collection 'audit_logs'.
  const [logs, setLogs] = useState([]);
  const [statistics, setStatistics] = useState(null);
  const [loading, setLoading] = useState(true);

  // Search and categorization filters forwarded to backend query
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [severityFilter, setSeverityFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Detail Modal view (Read-only)
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

      if (logsRes && logsRes.success) {
        let rawLogs = logsRes.data;
        if (!Array.isArray(rawLogs)) {
          rawLogs = Array.isArray(rawLogs?.items) 
            ? rawLogs.items 
            : (Array.isArray(rawLogs?.data) ? rawLogs.data : []);
        }
        setLogs(rawLogs);
      } else {
        setLogs([]);
      }

      if (statsRes && statsRes.success) {
        setStatistics(statsRes.data || null);
      }
    } catch (e) {
      console.error('[AuditLogPage] Lỗi tải dữ liệu audit log:', e);
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, [categoryFilter, severityFilter, statusFilter, searchTerm]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // Safe logs array guard
  const safeLogs = useMemo(() => (Array.isArray(logs) ? logs : []), [logs]);

  // Export to CSV
  const handleExportCSV = () => {
    if (safeLogs.length === 0) return;
    const headers = [
      'Mã Kiểm Toán', 'Thời Gian', 'Mã Người Dùng', 'Họ Và Tên', 
      'Vai Trò', 'Hành Động', 'Phân Loại', 'Mức Độ', 
      'Trạng Thái', 'Địa Chỉ IP', 'Đối Tượng Tác Động', 'Nội Dung Chi Tiết'
    ];
    const rows = safeLogs.map(l => [
      l.auditId || l.id || '',
      l.timestamp ? new Date(l.timestamp).toISOString() : '',
      `"${l.userId || ''}"`,
      `"${l.userName || ''}"`,
      `"${l.userRole || ''}"`,
      `"${l.action || ''}"`,
      l.category || '',
      l.severity || '',
      l.status || '',
      l.ipAddress || '',
      `"${l.targetEntity || ''}"`,
      `"${(l.details || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `NhatKyKiemToan_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getSeverityBadge = (severity) => {
    switch (severity) {
      case 'CRITICAL':
        return <Badge bg="danger" className="px-2 py-1"><FaExclamationTriangle className="me-1" />NGHIÊM TRỌNG</Badge>;
      case 'ERROR':
        return <Badge bg="danger" className="px-2 py-1"><FaTimesCircle className="me-1" />LỖI HỆ THỐNG</Badge>;
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
        return <Badge bg="danger-subtle" className="text-danger border border-danger-subtle fw-semibold">AN NINH</Badge>;
      case 'ACCESS':
        return <Badge bg="primary-subtle" className="text-primary border border-primary-subtle fw-semibold">TRUY CẬP</Badge>;
      case 'OPERATIONAL':
        return <Badge bg="success-subtle" className="text-success border border-success-subtle fw-semibold">VẬN HÀNH</Badge>;
      case 'DATA_CHANGE':
        return <Badge bg="warning-subtle" className="text-warning border border-warning-subtle fw-semibold">DỮ LIỆU</Badge>;
      default:
        return <Badge bg="secondary-subtle" className="text-secondary border fw-semibold">{category || 'HỆ THỐNG'}</Badge>;
    }
  };

  return (
    <div className="w-100 py-2">
      {/* Top Banner */}
      <Card className="border-0 shadow-sm rounded-4 mb-4 bg-white" style={{ border: '1px solid #E5E9EB', borderRadius: 18 }}>
        <Card.Body className="p-4">
          <div className="d-flex flex-wrap justify-content-between align-items-center gap-3">
            <div>
              <div className="d-flex align-items-center gap-2 flex-wrap">
                <h4 className="mb-0 fw-bold d-flex align-items-center gap-2" style={{ color: '#0f2743' }}>
                  <FaShieldAlt style={{ color: '#5E85E6' }} />
                  Nhật Ký Kiểm Toán An Ninh Hệ Thống
                </h4>
                <Badge className="px-3 py-2 rounded-pill fw-semibold" style={{ background: 'rgba(94, 133, 230, 0.1)', color: '#5E85E6', border: '1px solid rgba(94, 133, 230, 0.25)' }}>
                  Quản Trị Viên / Trưởng Bộ Phận
                </Badge>
                <Badge className="px-3 py-2 rounded-pill fw-semibold" style={{ background: '#F1F4F7', color: '#64748b', border: '1px solid #E5E9EB' }}>
                  Chỉ Xem Bất Biến (Read-Only)
                </Badge>
                <Badge className="px-3 py-2 rounded-pill fw-semibold" style={{ background: 'rgba(145, 222, 131, 0.2)', color: '#2E7D32', border: '1px solid rgba(145, 222, 131, 0.35)' }}>
                  ISO 15189 & NĐ 123 • Lưu Trữ 10 Năm
                </Badge>
              </div>
              <p className="text-muted mb-0 small mt-1">
                Theo dõi và kiểm tra toàn bộ vết kiểm toán an ninh, nhật ký truy cập, biến động dữ liệu và ghi đè bảo mật trên hệ thống y tế (UC64).
              </p>
            </div>

            <div className="d-flex align-items-center gap-2 flex-wrap">
              <Button
                variant="outline-secondary"
                size="sm"
                onClick={handleExportCSV}
                disabled={safeLogs.length === 0}
                className="d-flex align-items-center gap-2 rounded-pill px-3 py-2 shadow-sm"
                style={{ borderRadius: 9999, borderColor: '#E5E9EB' }}
              >
                <FaFileExport />
                <span>Xuất Báo Cáo CSV</span>
              </Button>
              <Button
                variant="light"
                size="sm"
                onClick={fetchLogs}
                disabled={loading}
                className="d-flex align-items-center gap-2 border rounded-pill px-3 py-2 shadow-sm"
                style={{ borderRadius: 9999, borderColor: '#E5E9EB' }}
              >
                <FaSyncAlt className={loading ? 'fa-spin' : ''} />
                <span>Làm Mới</span>
              </Button>
            </div>
          </div>
        </Card.Body>
      </Card>

      {/* Statistics Cards */}
      {statistics && (
        <Row className="g-3 mb-4">
          <Col xs={12} sm={6} lg={3}>
            <Card className="border-0 shadow-sm h-100" style={{ border: '1px solid #E5E9EB', borderRadius: 18, background: '#ffffff' }}>
              <Card.Body className="p-3">
                <div className="d-flex align-items-center justify-content-between">
                  <div>
                    <span className="text-muted small fw-medium">Tổng số sự kiện</span>
                    <h3 className="fw-bold mb-0 mt-1" style={{ color: '#0f2743', fontVariantNumeric: 'tabular-nums' }}>{statistics.totalLogs ?? safeLogs.length}</h3>
                  </div>
                  <div className="rounded-circle p-3" style={{ background: 'rgba(94, 133, 230, 0.1)', color: '#5E85E6' }}>
                    <FaShieldAlt className="fs-4" />
                  </div>
                </div>
              </Card.Body>
            </Card>
          </Col>
          <Col xs={12} sm={6} lg={3}>
            <Card className="border-0 shadow-sm h-100" style={{ border: '1px solid #E5E9EB', borderRadius: 18, background: '#ffffff' }}>
              <Card.Body className="p-3">
                <div className="d-flex align-items-center justify-content-between">
                  <div>
                    <span className="text-muted small fw-medium">Sự kiện an ninh</span>
                    <h3 className="fw-bold mb-0 text-danger mt-1" style={{ fontVariantNumeric: 'tabular-nums' }}>{statistics.securityEvents ?? 0}</h3>
                  </div>
                  <div className="rounded-circle p-3" style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#EF4444' }}>
                    <FaLock className="fs-4" />
                  </div>
                </div>
              </Card.Body>
            </Card>
          </Col>
          <Col xs={12} sm={6} lg={3}>
            <Card className="border-0 shadow-sm h-100" style={{ border: '1px solid #E5E9EB', borderRadius: 18, background: '#ffffff' }}>
              <Card.Body className="p-3">
                <div className="d-flex align-items-center justify-content-between">
                  <div>
                    <span className="text-muted small fw-medium">Cảnh báo nghiêm trọng</span>
                    <h3 className="fw-bold mb-0 mt-1" style={{ color: '#b45309', fontVariantNumeric: 'tabular-nums' }}>{statistics.criticalAlerts ?? 0}</h3>
                  </div>
                  <div className="rounded-circle p-3" style={{ background: 'rgba(231, 188, 76, 0.2)', color: '#b45309' }}>
                    <FaExclamationTriangle className="fs-4" />
                  </div>
                </div>
              </Card.Body>
            </Card>
          </Col>
          <Col xs={12} sm={6} lg={3}>
            <Card className="border-0 shadow-sm h-100" style={{ border: '1px solid #E5E9EB', borderRadius: 18, background: '#ffffff' }}>
              <Card.Body className="p-3">
                <div className="d-flex align-items-center justify-content-between">
                  <div>
                    <span className="text-muted small fw-medium">Thất bại / Lỗi truy cập</span>
                    <h3 className="fw-bold mb-0 text-secondary mt-1" style={{ fontVariantNumeric: 'tabular-nums' }}>{statistics.failedActions ?? 0}</h3>
                  </div>
                  <div className="rounded-circle p-3" style={{ background: '#F1F4F7', color: '#64748b' }}>
                    <FaTimesCircle className="fs-4" />
                  </div>
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      )}

      {/* Filter Bar */}
      <Card className="border-0 shadow-sm mb-4 bg-white" style={{ border: '1px solid #E5E9EB', borderRadius: 18 }}>
        <Card.Body className="p-3">
          <Row className="g-3">
            <Col xs={12} md={4}>
              <InputGroup>
                <InputGroup.Text className="border-end-0" style={{ background: '#F1F4F7', borderColor: '#E5E9EB' }}>
                  <FaSearch className="text-muted" />
                </InputGroup.Text>
                <Form.Control
                  placeholder="Tìm theo người dùng, hành động, đối tượng tác động..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="border-start-0"
                  style={{ background: '#F1F4F7', borderColor: '#E5E9EB', borderRadius: '0 10px 10px 0' }}
                />
              </InputGroup>
            </Col>
            <Col xs={6} sm={4} md={2}>
              <Form.Select 
                value={categoryFilter} 
                onChange={(e) => setCategoryFilter(e.target.value)}
                style={{ background: '#F1F4F7', borderColor: '#E5E9EB', borderRadius: 10 }}
              >
                <option value="ALL">-- Tất cả danh mục --</option>
                <option value="SECURITY">An ninh & Bảo mật</option>
                <option value="ACCESS">Xác thực & Truy cập</option>
                <option value="OPERATIONAL">Vận hành hệ thống</option>
                <option value="DATA_CHANGE">Biến động dữ liệu</option>
              </Form.Select>
            </Col>
            <Col xs={6} sm={4} md={3}>
              <Form.Select 
                value={severityFilter} 
                onChange={(e) => setSeverityFilter(e.target.value)}
                style={{ background: '#F1F4F7', borderColor: '#E5E9EB', borderRadius: 10 }}
              >
                <option value="ALL">-- Tất cả mức độ --</option>
                <option value="CRITICAL">Mức nghiêm trọng</option>
                <option value="ERROR">Mức lỗi hệ thống</option>
                <option value="WARNING">Mức cảnh báo</option>
                <option value="INFO">Mức thông tin thường</option>
              </Form.Select>
            </Col>
            <Col xs={12} sm={4} md={3}>
              <Form.Select 
                value={statusFilter} 
                onChange={(e) => setStatusFilter(e.target.value)}
                style={{ background: '#F1F4F7', borderColor: '#E5E9EB', borderRadius: 10 }}
              >
                <option value="ALL">-- Tất cả trạng thái --</option>
                <option value="SUCCESS">Thực hiện thành công</option>
                <option value="FAILED">Thực hiện thất bại</option>
              </Form.Select>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* Audit Log Table */}
      <Card className="border-0 shadow-sm overflow-hidden bg-white" style={{ border: '1px solid #E5E9EB', borderRadius: 18 }}>
        <Card.Body className="p-0">
          {loading && safeLogs.length === 0 ? (
            <div className="text-center py-5">
              <Spinner animation="border" variant="primary" />
              <p className="mt-3 text-muted small">Đang tải nhật ký kiểm toán hệ thống...</p>
            </div>
          ) : safeLogs.length > 0 ? (
            <div className="table-responsive">
              <Table hover className="align-middle mb-0">
                <thead style={{ background: '#F1F4F7' }}>
                  <tr>
                    <th style={{ width: '170px', color: '#475569', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.5px', padding: '12px 16px' }}>Thời gian</th>
                    <th style={{ width: '200px', color: '#475569', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.5px', padding: '12px 16px' }}>Người thực hiện</th>
                    <th style={{ width: '160px', color: '#475569', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.5px', padding: '12px 16px' }}>Hành động</th>
                    <th style={{ width: '130px', color: '#475569', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.5px', padding: '12px 16px' }}>Phân loại</th>
                    <th style={{ width: '120px', color: '#475569', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.5px', padding: '12px 16px' }}>Mức độ</th>
                    <th style={{ color: '#475569', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.5px', padding: '12px 16px' }}>Nội dung chi tiết</th>
                    <th style={{ width: '110px', color: '#475569', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.5px', padding: '12px 16px' }}>IP / Thiết bị</th>
                    <th style={{ width: '80px', color: '#475569', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.5px', padding: '12px 16px' }} className="text-center">Chi tiết</th>
                  </tr>
                </thead>
                <tbody>
                  {safeLogs.map((item) => (
                    <tr key={item.auditId || item.id}>
                      <td className="small text-secondary font-monospace">
                        {item.timestamp ? new Date(item.timestamp).toLocaleString('vi-VN', {
                          year: 'numeric',
                          month: '2-digit',
                          day: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit'
                        }) : '—'}
                      </td>
                      <td>
                        <div className="fw-semibold text-dark small">{item.userName || 'Hệ thống'}</div>
                        <div className="d-flex align-items-center gap-1 text-muted" style={{ fontSize: '0.75rem' }}>
                          <FaUserShield className="text-primary" />
                          <span>{item.userRole || 'Admin'}</span>
                        </div>
                      </td>
                      <td>
                        <span className="badge bg-light text-dark border font-monospace" style={{ fontSize: '0.8rem' }}>
                          {item.action || 'THỰC THI'}
                        </span>
                      </td>
                      <td>{getCategoryBadge(item.category)}</td>
                      <td>{getSeverityBadge(item.severity)}</td>
                      <td>
                        <div className="small text-dark text-truncate" style={{ maxWidth: '380px' }} title={item.details}>
                          {item.details || 'Không có mô tả chi tiết'}
                        </div>
                        {item.targetEntity && (
                          <div className="text-muted font-monospace" style={{ fontSize: '0.75rem' }}>
                            Đối tượng: <strong>{item.targetEntity}</strong> {item.entityId && `(#${item.entityId})`}
                          </div>
                        )}
                      </td>
                      <td>
                        <div className="small font-monospace text-secondary">{item.ipAddress || '127.0.0.1'}</div>
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
                          title="Xem chi tiết sự kiện"
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
              <p className="text-muted small">Thử thay đổi bộ lọc phân loại hoặc từ khóa tìm kiếm.</p>
            </div>
          )}
        </Card.Body>
      </Card>

      {/* Detail Modal (Read-only) */}
      <Modal show={showDetailModal} onHide={() => setShowDetailModal(false)} size="lg" centered>
        <Modal.Header closeButton className="border-0 pb-0 bg-light">
          <Modal.Title className="fw-bold d-flex align-items-center gap-2 fs-5">
            <FaShieldAlt className="text-primary" />
            Chi Tiết Bản Ghi Kiểm Toán An Ninh
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-4">
          {selectedLog && (
            <div>
              <div className="p-3 bg-light rounded-3 mb-3 border">
                <Row className="g-2">
                  <Col sm={6}>
                    <div className="small text-muted">Mã bản ghi kiểm toán:</div>
                    <div className="fw-bold font-monospace text-primary">{selectedLog.auditId || selectedLog.id}</div>
                  </Col>
                  <Col sm={6}>
                    <div className="small text-muted">Thời gian ghi nhận:</div>
                    <div className="fw-semibold">
                      {selectedLog.timestamp ? new Date(selectedLog.timestamp).toLocaleString('vi-VN') : '—'}
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
                      {selectedLog.ipAddress || '127.0.0.1'} - {selectedLog.browser || 'Trình duyệt Web'}
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
                        <Badge bg="success" className="px-2 py-1"><FaCheckCircle className="me-1" />Thực hiện thành công</Badge>
                      ) : (
                        <Badge bg="danger" className="px-2 py-1"><FaTimesCircle className="me-1" />Thực hiện thất bại</Badge>
                      )}
                    </div>
                  </Col>
                </Row>
              </div>

              <div className="mb-3">
                <label className="fw-bold small text-muted text-uppercase mb-1">Hành động hệ thống</label>
                <div className="p-2 border rounded font-monospace bg-white text-primary fw-bold">
                  {selectedLog.action}
                </div>
              </div>

              <div className="mb-3">
                <label className="fw-bold small text-muted text-uppercase mb-1">Đối tượng & Thực thể tác động</label>
                <div className="p-2 border rounded bg-white small">
                  <strong>{selectedLog.targetEntity || 'Toàn hệ thống'}</strong> {selectedLog.entityId && `(Mã ID: ${selectedLog.entityId})`}
                </div>
              </div>

              <div>
                <label className="fw-bold small text-muted text-uppercase mb-1">Nội dung chi tiết sự kiện</label>
                <div className="p-3 border rounded bg-light font-monospace small" style={{ whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>
                  {selectedLog.details || 'Không có chi tiết bổ sung.'}
                </div>
              </div>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer className="border-0 bg-light">
          <Button variant="secondary" onClick={() => setShowDetailModal(false)}>
            Đóng
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default AuditLogPage;
