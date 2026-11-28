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
import { Search as LucideSearch, RefreshCw, FileOutput, AlertTriangle, CheckCircle2, XCircle, Info, Lock, Eye, X as LucideX, UserCheck } from 'lucide-react';
import TablePagination, { usePagination } from '../../../components/ui/TablePagination';
import { auditLogService } from '../../../services/auditLogService';

const AuditLogPage = () => {
  const [logs, setLogs] = useState([]);
  const [statistics, setStatistics] = useState(null);
  const [loading, setLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [severityFilter, setSeverityFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

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

  const safeLogs = useMemo(() => (Array.isArray(logs) ? logs : []), [logs]);
  const logsPag = usePagination(safeLogs, 10);

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
        return <Badge bg="danger" className="px-2 py-1"><AlertTriangle className="me-1"  size="1em"/>NGHIÊM TRỌNG</Badge>;
      case 'ERROR':
        return <Badge bg="danger" className="px-2 py-1"><XCircle className="me-1"  size="1em"/>LỖI HỆ THỐNG</Badge>;
      case 'WARNING':
        return <Badge bg="warning" text="dark" className="px-2 py-1"><AlertTriangle className="me-1"  size="1em"/>CẢNH BÁO</Badge>;
      case 'INFO':
      default:
        return <Badge bg="info" className="px-2 py-1"><Info className="me-1"  size="1em"/>THÔNG TIN</Badge>;
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

  const hasActiveFilters = searchTerm !== '' || categoryFilter !== 'ALL' || severityFilter !== 'ALL' || statusFilter !== 'ALL';

  const handleResetFilters = () => {
    setSearchTerm('');
    setCategoryFilter('ALL');
    setSeverityFilter('ALL');
    setStatusFilter('ALL');
  };

  return (
    <div className="w-100 py-2">

      <div className="bms-page-header-card mb-4">
        <div className="bms-page-header-content flex-column align-items-start">
          <div className="bms-page-title-row">
            <h1 className="bms-page-title">
              Nhật Ký Kiểm Toán An Ninh Hệ Thống
            </h1>
          </div>
          <p className="text-muted small m-0 mt-1">
            Theo dõi nhật ký truy cập, thao tác vận hành và biến động dữ liệu toàn hệ thống
          </p>
        </div>

        <div className="bms-page-actions">
          <Button
            variant="outline-secondary"
            size="sm"
            onClick={handleExportCSV}
            disabled={safeLogs.length === 0}
            className="d-flex align-items-center gap-2 rounded-pill px-3 py-2 fw-semibold"
          >
            <FileOutput size={13} />
            <span>Xuất Báo Cáo CSV</span>
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={fetchLogs}
            disabled={loading}
            className="d-flex align-items-center gap-2 rounded-pill px-3 py-2 fw-semibold"
            style={{ background: '#1E60E6', borderColor: '#1E60E6' }}
          >
            <RefreshCw size={13} className={loading ? 'fa-spin' : ''} />
            <span>Làm Mới</span>
          </Button>
        </div>
      </div>

      {statistics && (
        <Row className="g-3 mb-4">
          <Col xs={12} sm={6} lg={3}>
            <div className="bms-kpi-quad-card">
              <div>
                <h6 className="bms-kpi-label">Tổng Số Sự Kiện</h6>
                <div className="bms-kpi-value">{statistics.totalLogs ?? safeLogs.length}</div>
                <div className="bms-kpi-sub text-muted">Tổng bản ghi nhật ký hệ thống</div>
              </div>
              <div className="bms-kpi-icon-badge bms-kpi-icon-blue">
                <CheckCircle2  size="1em"/>
              </div>
            </div>
          </Col>
          <Col xs={12} sm={6} lg={3}>
            <div className="bms-kpi-quad-card">
              <div>
                <h6 className="bms-kpi-label">Sự Kiện An Ninh</h6>
                <div className="bms-kpi-value text-danger">{statistics.securityEvents ?? 0}</div>
                <div className="bms-kpi-sub text-muted">Truy cập &amp; phân quyền bảo mật</div>
              </div>
              <div className="bms-kpi-icon-badge bms-kpi-icon-rose">
                <Lock  size="1em"/>
              </div>
            </div>
          </Col>
          <Col xs={12} sm={6} lg={3}>
            <div className="bms-kpi-quad-card">
              <div>
                <h6 className="bms-kpi-label">Cảnh Báo Nghiêm Trọng</h6>
                <div className="bms-kpi-value" style={{ color: '#b45309' }}>{statistics.criticalAlerts ?? 0}</div>
                <div className="bms-kpi-sub text-muted">Sự kiện mức cảnh báo cao</div>
              </div>
              <div className="bms-kpi-icon-badge bms-kpi-icon-amber">
                <AlertTriangle  size="1em"/>
              </div>
            </div>
          </Col>
          <Col xs={12} sm={6} lg={3}>
            <div className="bms-kpi-quad-card">
              <div>
                <h6 className="bms-kpi-label">Thất Bại / Lỗi Truy Cập</h6>
                <div className="bms-kpi-value text-secondary">{statistics.failedActions ?? 0}</div>
                <div className="bms-kpi-sub text-muted">Thao tác bị từ chối hoặc lỗi</div>
              </div>
              <div className="bms-kpi-icon-badge bms-kpi-icon-purple">
                <XCircle  size="1em"/>
              </div>
            </div>
          </Col>
        </Row>
      )}

      <section className="bms-filter-bar mb-3">
        <div className="bms-search-input-pill">
          <LucideSearch className="bms-search-icon"  size="1em"/>
          <input
            type="text"
            placeholder="Tìm theo người dùng, hành động, đối tượng tác động..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button
              type="button"
              className="bms-search-clear"
              onClick={() => setSearchTerm('')}
              title="Xóa tìm kiếm"
            >
              <LucideX size={12} />
            </button>
          )}
        </div>

        <Form.Select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          style={{ width: 'auto' }}
        >
          <option value="ALL">Tất cả danh mục</option>
          <option value="SECURITY">An ninh &amp; Bảo mật</option>
          <option value="ACCESS">Xác thực &amp; Truy cập</option>
          <option value="OPERATIONAL">Vận hành hệ thống</option>
          <option value="DATA_CHANGE">Biến động dữ liệu</option>
        </Form.Select>

        <Form.Select
          value={severityFilter}
          onChange={(e) => setSeverityFilter(e.target.value)}
          style={{ width: 'auto' }}
        >
          <option value="ALL">Tất cả mức độ</option>
          <option value="CRITICAL">Mức nghiêm trọng</option>
          <option value="ERROR">Mức lỗi hệ thống</option>
          <option value="WARNING">Mức cảnh báo</option>
          <option value="INFO">Mức thông tin thường</option>
        </Form.Select>

        <Form.Select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{ width: 'auto' }}
        >
          <option value="ALL">Tất cả trạng thái</option>
          <option value="SUCCESS">Thực hiện thành công</option>
          <option value="FAILED">Thực hiện thất bại</option>
        </Form.Select>

        {hasActiveFilters && (
          <Button
            variant="outline-secondary"
            size="sm"
            className="rounded-pill px-3 text-nowrap"
            onClick={handleResetFilters}
          >
            Đặt lại
          </Button>
        )}

        <span className="bms-filter-meta">
          Hiển thị <strong>{safeLogs.length}</strong> bản ghi
        </span>
      </section>

      <div className="bms-table-standalone-section">
        <div className="bms-table-standalone-body">
          {loading && safeLogs.length === 0 ? (
            <div className="text-center py-3">
              <Spinner animation="border" variant="primary" />
              <p className="mt-3 text-muted small">Đang tải nhật ký kiểm toán hệ thống...</p>
            </div>
          ) : safeLogs.length > 0 ? (
            <div className="table-responsive">
              <table className="bms-dash-table">
                <thead>
                  <tr>
                    <th className="ps-4" style={{ width: '170px' }}>THỜI GIAN</th>
                    <th style={{ width: '200px' }}>NGƯỜI THỰC HIỆN</th>
                    <th style={{ width: '160px' }}>HÀNH ĐỘNG</th>
                    <th style={{ width: '130px' }}>PHÂN LOẠI</th>
                    <th style={{ width: '120px' }}>MỨC ĐỘ</th>
                    <th>NỘI DUNG CHI TIẾT</th>
                    <th style={{ width: '130px' }}>IP / THIẾT BỊ</th>
                    <th className="text-end pe-4" style={{ width: '90px' }}>THAO TÁC</th>
                  </tr>
                </thead>
                <tbody>
                  {logsPag.paginatedItems.map((item) => (
                    <tr key={item.auditId || item.id}>
                      <td className="ps-4 small text-secondary font-monospace">
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
                          <UserCheck className="text-primary"  size="1em"/>
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
                            <span className="text-success fw-medium"><CheckCircle2 className="me-1"  size="1em"/>Thành công</span>
                          ) : (
                            <span className="text-danger fw-medium"><XCircle className="me-1"  size="1em"/>Thất bại</span>
                          )}
                        </div>
                      </td>
                      <td className="text-end pe-4">
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
                          <Eye  size="1em"/>
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <TablePagination
                page={logsPag.page}
                totalPages={logsPag.totalPages}
                totalItems={logsPag.totalItems}
                pageSize={logsPag.pageSize}
                onPageChange={logsPag.setPage}
                onPageSizeChange={logsPag.setPageSize}
                itemLabel="bản ghi audit"
              />
            </div>
          ) : (
            <div className="text-center py-3">
              <CheckCircle2 className="text-muted mb-3" style={{ fontSize: '3rem', opacity: 0.3 }}  size="1em"/>
              <h5 className="text-dark fw-bold">Không tìm thấy bản ghi kiểm toán nào</h5>
              <p className="text-muted small">Thử thay đổi bộ lọc phân loại hoặc từ khóa tìm kiếm.</p>
            </div>
          )}
        </div>
      </div>

      <Modal show={showDetailModal} onHide={() => setShowDetailModal(false)} size="lg" centered>
        <Modal.Header closeButton className="border-0 pb-0 bg-light">
          <Modal.Title className="fw-bold d-flex align-items-center gap-2 fs-5">
            <CheckCircle2 className="text-primary"  size="1em"/>
            Chi Tiết Bản Ghi Kiểm Toán An Ninh
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
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
                        <Badge bg="success" className="px-2 py-1"><CheckCircle2 className="me-1"  size="1em"/>Thực hiện thành công</Badge>
                      ) : (
                        <Badge bg="danger" className="px-2 py-1"><XCircle className="me-1"  size="1em"/>Thực hiện thất bại</Badge>
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
