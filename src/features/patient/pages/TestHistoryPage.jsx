/**
 * @file TestHistoryPage.jsx
 * @description UC76 real result history with signed-only disclosure and server-scoped patient access.
 * Modernized with clean medical typography, spacious layout, pure flat 2D style, and zero box shadows.
 */

import React, { useEffect, useState } from 'react';
import { Alert, Badge, Breadcrumb, Button, Col, Form, Offcanvas, Row, Table, Spinner } from 'react-bootstrap';
import { Link, useSearchParams } from 'react-router-dom';
import { FaHistory, FaEye, FaShieldAlt, FaSyncAlt, FaSearch, FaCheckCircle, FaClock, FaExclamationTriangle, FaTimes } from 'react-icons/fa';
import { getTestHistory, getTestHistoryDetail, testHistoryError } from '../api/testHistoryApi';
import { ROLES, resolveRoleId, getStoredUser } from '../../../constants/roles';
import './PatientPaymentHistoryPage.css';
import '../../../components/common/SkeletonProfile.css';

const defaults = { search: '', patientId: '', fromDate: '', toDate: '', page: 1, pageSize: 20 };

const date = (value) => {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleString('vi-VN', {
      timeZone: 'Asia/Ho_Chi_Minh',
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  } catch {
    return '—';
  }
};

const flag = (value) => {
  if (value === null || value === undefined || value === '') return 'Chưa ghi nhận';
  const map = {
    '0': 'Bình thường', Normal: 'Bình thường', N: 'Bình thường',
    '1': 'Thấp', Low: 'Thấp', L: 'Thấp',
    '2': 'Cao', High: 'Cao', H: 'Cao',
    '3': 'Nguy hiểm', CriticalPanic: 'Nguy hiểm', CRITICAL: 'Nguy hiểm'
  };
  return map[value] || value || 'Chưa ghi nhận';
};

const skeleton = (
  <div aria-busy="true" aria-label="Đang tải lịch sử" className="py-3">
    {[1, 2, 3].map((n) => (
      <div key={n} className="bms-skeleton mb-2.5 rounded-3" style={{ height: 44 }} />
    ))}
  </div>
);

/** Re-fetches detail on every opening so withdrawn/rerun reports do not reuse cached measurements. */
function HistoryDetail({ id, onClose }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setData(null);
    setError('');

    getTestHistoryDetail(id, controller.signal)
      .then((result) => {
        if (!controller.signal.aborted) setData(result);
      })
      .catch((err) => {
        if (!controller.signal.aborted) setError(testHistoryError(err));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [id, retry]);

  return (
    <Offcanvas
      show
      placement="end"
      onHide={onClose}
      style={{ width: 'min(95vw, 920px)', borderLeft: '1px solid #E2E8F0', boxShadow: 'none' }}
    >
      <Offcanvas.Header closeButton className="border-bottom px-4 py-3 bg-light">
        <Offcanvas.Title className="fs-6 fw-bold text-dark d-flex align-items-center gap-2">
          <FaShieldAlt className="text-primary" /> Chi Tiết Kết Quả Xét Nghiệm
        </Offcanvas.Title>
      </Offcanvas.Header>
      <Offcanvas.Body className="p-4">
        {loading ? (
          skeleton
        ) : error ? (
          <Alert variant="danger" className="d-flex align-items-center justify-content-between border-0 rounded-3 bg-danger-subtle text-dark">
            <span className="small">{error}</span>
            <Button size="sm" variant="outline-danger" onClick={() => setRetry((v) => v + 1)}>
              Thử lại
            </Button>
          </Alert>
        ) : data && (
          <div>
            <div className="mb-4 pb-3 border-bottom">
              <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-2">
                <h5 className="fw-bold text-dark mb-0" style={{ letterSpacing: '-0.02em' }}>
                  {data.summary.packageName || 'Chưa ghi nhận gói xét nghiệm'}
                </h5>
                {data.summary.available ? (
                  <span className="badge bg-success-subtle text-success border-0 px-3 py-1.5 fw-semibold" style={{ borderRadius: 9999, fontSize: 12 }}>
                    <FaCheckCircle className="me-1" /> Đã duyệt và ký số
                  </span>
                ) : (
                  <span className="badge bg-warning-subtle text-warning-emphasis border-0 px-3 py-1.5 fw-semibold" style={{ borderRadius: 9999, fontSize: 12 }}>
                    <FaClock className="me-1" /> Đang phân tích
                  </span>
                )}
              </div>
              <div className="font-monospace text-primary fw-bold small mb-3">
                Mã KQ: {data.summary.resultCode || data.summary.id}
              </div>

              <Row className="g-2 text-muted small">
                <Col sm={6}>Mã bệnh nhân: <strong className="text-dark">{data.summary.patientId}</strong></Col>
                <Col sm={6}>Mã mẫu xét nghiệm: <strong className="text-dark">{data.summary.sampleId}</strong></Col>
                <Col sm={6}>Ngày ghi nhận: <strong className="text-dark">{date(data.summary.createdAt)}</strong></Col>
                <Col sm={6}>Ngày phê duyệt: <strong className="text-dark">{date(data.summary.approvedAt)}</strong></Col>
              </Row>
            </div>

            {!data.summary.available ? (
              <Alert variant="info" className="border-0 rounded-3 bg-primary-subtle text-dark small py-3">
                Mẫu xét nghiệm đang trong quá trình phân tích kỹ thuật. Các chỉ số sinh hóa và kết luận lâm sàng chỉ hiển thị khi kết quả đã được Bác sĩ duyệt và ký số.
              </Alert>
            ) : (
              <>
                <h6 className="fw-bold text-dark mb-3">Chỉ Số Xét Nghiệm Chi Tiết</h6>
                {data.items.length ? (
                  <div className="table-responsive border rounded-3 mb-4">
                    <Table hover className="align-middle mb-0" style={{ fontSize: 13 }}>
                      <thead className="bg-light text-muted" style={{ fontSize: 11.5, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                        <tr>
                          <th className="ps-3 py-2.5">Chỉ số xét nghiệm</th>
                          <th className="text-end py-2.5">Kết quả</th>
                          <th className="py-2.5">Đơn vị</th>
                          <th className="text-end py-2.5">Khoảng tham chiếu</th>
                          <th className="text-center pe-3 py-2.5">Đánh giá</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.items.map((item, index) => {
                          const flagText = flag(item.flag);
                          const isDanger = flagText === 'Nguy hiểm';
                          const isWarning = flagText === 'Cao' || flagText === 'Thấp';
                          const isNormal = flagText === 'Bình thường';
                          return (
                            <tr key={`${item.code}-${index}`}>
                              <td className="ps-3 fw-semibold text-dark">
                                {item.name || item.code || 'Chưa ghi nhận'}
                              </td>
                              <td className="text-end fw-bold font-monospace text-dark">
                                {item.value || '—'}
                              </td>
                              <td className="text-muted">{item.unit || '—'}</td>
                              <td className="text-end text-muted font-monospace">{item.referenceRange || '—'}</td>
                              <td className="text-center pe-3">
                                {isDanger ? (
                                  <span className="badge bg-danger-subtle text-danger border-0 px-2 py-1 fw-semibold" style={{ borderRadius: 9999, fontSize: 11 }}>
                                    {flagText}
                                  </span>
                                ) : isWarning ? (
                                  <span className="badge bg-warning-subtle text-warning-emphasis border-0 px-2 py-1 fw-semibold" style={{ borderRadius: 9999, fontSize: 11 }}>
                                    {flagText}
                                  </span>
                                ) : isNormal ? (
                                  <span className="badge bg-success-subtle text-success border-0 px-2 py-1 fw-semibold" style={{ borderRadius: 9999, fontSize: 11 }}>
                                    {flagText}
                                  </span>
                                ) : (
                                  <span className="badge bg-light text-muted border px-2 py-1 fw-medium" style={{ borderRadius: 9999, fontSize: 11 }}>
                                    {flagText}
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </Table>
                  </div>
                ) : (
                  <Alert variant="light" className="border text-center small text-muted py-3">
                    Chưa có danh sách chỉ số được lưu cho kết quả này.
                  </Alert>
                )}

                {data.conclusion && (
                  <div className="p-3 bg-light rounded-3 border mb-3">
                    <h6 className="fw-bold text-dark mb-1" style={{ fontSize: 13 }}>Kết luận lâm sàng</h6>
                    <p className="mb-0 text-dark small" style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                      {data.conclusion}
                    </p>
                  </div>
                )}
              </>
            )}

            <div className="d-flex align-items-center justify-content-between pt-3 border-top mt-4">
              <span className="small text-muted" style={{ fontSize: 11.5 }}>
                Thời gian hiển thị theo chuẩn giờ Việt Nam (UTC+7).
              </span>
              <Button variant="outline-primary" size="sm" onClick={() => setRetry((v) => v + 1)} style={{ borderRadius: 6, fontSize: 12 }}>
                <FaSyncAlt className="me-1" /> Làm mới
              </Button>
            </div>
          </div>
        )}
      </Offcanvas.Body>
    </Offcanvas>
  );
}

/** Main Test History Directory View */
export default function TestHistoryPage() {
  const [params, setParams] = useSearchParams();
  const id = params.get('result');
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState(defaults);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refresh, setRefresh] = useState(0);

  const user = getStoredUser();
  const roleId = resolveRoleId(user);
  const isPatient = roleId === ROLES.PATIENT;

  const invalid = Boolean(filters.fromDate && filters.toDate && filters.fromDate > filters.toDate);

  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters((v) => (v.search === search.trim() ? v : { ...v, search: search.trim(), page: 1 }));
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    const controller = new AbortController();
    setData(null);
    setError('');

    if (invalid) {
      setLoading(false);
      return () => controller.abort();
    }

    setLoading(true);
    getTestHistory(Object.fromEntries(Object.entries(filters).filter(([, value]) => value !== '')), controller.signal)
      .then((result) => {
        if (!controller.signal.aborted) {
          setData(result);
          if (filters.page > Math.max(1, result.totalPages)) {
            setFilters((v) => ({ ...v, page: Math.max(1, result.totalPages) }));
          }
        }
      })
      .catch((err) => {
        if (!controller.signal.aborted) setError(testHistoryError(err));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [filters, invalid, refresh]);

  const change = (key, value) => setFilters((v) => ({ ...v, [key]: value, page: 1 }));
  const clear = () => {
    setSearch('');
    setFilters({ ...defaults });
  };

  return (
    <div className="bms-payhistory-content">
      {/* 1. Header */}
      <header className="bms-payhistory-header">
        <div className="bms-payhistory-badge">
          <FaShieldAlt className="me-1" /> KẾT QUẢ XÉT NGHIỆM • ISO 15189:2022
        </div>
        <div className="d-flex align-items-center justify-content-between flex-wrap gap-2">
          <div>
            <h1 className="bms-payhistory-title">Lịch Sử Xét Nghiệm</h1>
            <p className="bms-payhistory-subtitle">
              Tra cứu hồ sơ kết quả xét nghiệm đã hoàn thành và xem phân tích lâm sàng chi tiết.
            </p>
          </div>
          <Button
            variant="outline-primary"
            size="sm"
            disabled={loading}
            onClick={() => setRefresh((v) => v + 1)}
            style={{ height: 38, borderRadius: 8, fontSize: 12.5, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            <FaSyncAlt className={loading ? 'fa-spin' : ''} /> Làm mới
          </Button>
        </div>
      </header>

      {/* 2. Filter Toolbar */}
      <div className="bms-pay-toolbar">
        <div className="bms-pay-filter-group w-100 flex-wrap">
          <div className="position-relative flex-grow-1" style={{ minWidth: 240 }}>
            <Form.Label htmlFor="history-search" className="visually-hidden">
              Tìm theo mã kết quả, mã mẫu hoặc gói khám
            </Form.Label>
            <input
              type="text"
              id="history-search"
              aria-label="Tìm theo mã kết quả, mã mẫu hoặc gói khám"
              className="bms-pay-search-input w-100"
              placeholder="Tìm theo mã kết quả, mã mẫu hoặc gói khám..."
              value={search}
              maxLength={100}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {!isPatient && (
            <div className="position-relative" style={{ minWidth: 160, maxWidth: 220 }}>
              <Form.Label htmlFor="history-patient" className="visually-hidden">
                Mã bệnh nhân
              </Form.Label>
              <input
                type="text"
                id="history-patient"
                aria-label="Mã bệnh nhân"
                className="bms-pay-search-input w-100"
                placeholder="ID bệnh nhân..."
                value={filters.patientId}
                maxLength={100}
                onChange={(e) => change('patientId', e.target.value)}
                style={{ height: 38, borderRadius: 8, fontSize: 13, borderColor: '#E2E8F0', backgroundColor: '#F8FAFC' }}
              />
            </div>
          )}

          <div className="d-flex align-items-center gap-1.5">
            <Form.Label htmlFor="history-from" className="small text-muted fw-semibold mb-0" style={{ fontSize: 12 }}>
              Từ:
            </Form.Label>
            <Form.Control
              id="history-from"
              aria-label="Ngày ghi nhận từ"
              type="date"
              size="sm"
              value={filters.fromDate}
              onChange={(e) => change('fromDate', e.target.value)}
              style={{ width: 136, height: 38, borderRadius: 8, fontSize: 13, borderColor: '#E2E8F0', backgroundColor: '#F8FAFC' }}
            />
          </div>

          <div className="d-flex align-items-center gap-1.5">
            <Form.Label htmlFor="history-to" className="small text-muted fw-semibold mb-0" style={{ fontSize: 12 }}>
              Đến:
            </Form.Label>
            <Form.Control
              id="history-to"
              aria-label="Đến ngày"
              type="date"
              size="sm"
              value={filters.toDate}
              onChange={(e) => change('toDate', e.target.value)}
              style={{ width: 136, height: 38, borderRadius: 8, fontSize: 13, borderColor: '#E2E8F0', backgroundColor: '#F8FAFC' }}
            />
          </div>

          {(search || filters.patientId || filters.fromDate || filters.toDate) && (
            <Button
              variant="outline-secondary"
              size="sm"
              onClick={clear}
              style={{ height: 38, borderRadius: 8, fontSize: 12.5, fontWeight: 600 }}
            >
              Đặt lại
            </Button>
          )}
        </div>
      </div>

      {invalid && (
        <Alert variant="warning" className="d-flex align-items-center gap-2 mb-3 rounded-3 border-0 bg-warning-subtle text-dark">
          <FaExclamationTriangle className="text-warning flex-shrink-0" />
          <span className="small">Ngày bắt đầu phải trước hoặc bằng ngày kết thúc.</span>
        </Alert>
      )}

      {error && (
        <Alert variant="danger" className="d-flex align-items-center justify-content-between mb-3 rounded-3 border-0 bg-danger-subtle text-dark">
          <span className="small">{error}</span>
          <Button variant="outline-danger" size="sm" onClick={() => setRefresh((v) => v + 1)} style={{ borderRadius: 6, fontSize: 12 }}>
            Thử lại
          </Button>
        </Alert>
      )}

      {/* 3. Results Table */}
      <div className="bms-pay-table-wrapper">
        <div className="table-responsive">
          <table className="bms-pay-table">
            <thead>
              <tr>
                <th>MÃ KẾT QUẢ / MẪU</th>
                <th>GÓI XÉT NGHIỆM</th>
                <th>MÃ BỆNH NHÂN</th>
                <th>NGÀY GHI NHẬN</th>
                <th className="text-center">TRẠNG THÁI</th>
                <th className="text-end pe-3">THAO TÁC</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-5 text-muted">
                    <Spinner animation="border" variant="primary" size="sm" className="me-2" />
                    Đang nạp dữ liệu lịch sử xét nghiệm y khoa...
                  </td>
                </tr>
              ) : data?.items?.length ? (
                data.items.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <div className="bms-txn-code">{row.resultCode || row.id}</div>
                      {row.sampleId && (
                        <div className="text-muted font-monospace" style={{ fontSize: 11 }}>
                          Mẫu: {row.sampleId}
                        </div>
                      )}
                    </td>
                    <td>
                      <div className="fw-semibold text-dark" style={{ fontSize: 13 }}>
                        {row.packageName || 'Chưa ghi nhận'}
                      </div>
                    </td>
                    <td className="text-muted font-monospace" style={{ fontSize: 12.5 }}>
                      {row.patientId}
                    </td>
                    <td className="text-muted" style={{ fontSize: 12.5, whiteSpace: 'nowrap' }}>
                      {date(row.createdAt)}
                    </td>
                    <td className="text-center">
                      {row.available ? (
                        <span className="badge bg-success-subtle text-success border-0 px-2.5 py-1 fw-semibold" style={{ borderRadius: 9999, fontSize: 11.5 }}>
                          <FaCheckCircle className="me-1" /> Đã Phát Hành
                        </span>
                      ) : (
                        <span className="badge bg-warning-subtle text-warning-emphasis border-0 px-2.5 py-1 fw-semibold" style={{ borderRadius: 9999, fontSize: 11.5 }}>
                          <FaClock className="me-1" /> Đang Phân Tích
                        </span>
                      )}
                    </td>
                    <td className="text-end pe-3">
                      <Button
                        size="sm"
                        variant="outline-primary"
                        className="fw-semibold px-2.5 py-1"
                        style={{ borderRadius: 6, fontSize: 12.5 }}
                        aria-label={`Xem kết quả ${row.resultCode || row.id}`}
                        onClick={() => setParams({ result: row.id })}
                      >
                        <FaEye className="me-1" /> Xem Kết Quả
                      </Button>
                    </td>
                  </tr>
                ))
              ) : !error && !invalid ? (
                <tr>
                  <td colSpan={6} className="text-center py-5 text-muted">
                    <FaHistory size={32} className="d-block mx-auto mb-2 opacity-40 text-secondary" />
                    <div className="fw-semibold text-secondary">Chưa có kết quả xét nghiệm phù hợp</div>
                    <div className="small text-muted mt-1">Vui lòng thay đổi bộ lọc hoặc kiểm tra hồ sơ xét nghiệm.</div>
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        {/* 4. Pagination */}
        {data && (
          <div className="bms-pay-pagination">
            <div className="d-flex align-items-center gap-2">
              <span className="small text-muted" style={{ fontSize: 12 }}>Hiển thị:</span>
              <Form.Select
                size="sm"
                value={filters.pageSize}
                onChange={(e) => change('pageSize', Number(e.target.value))}
                style={{ width: 110, height: 32, borderRadius: 6, fontSize: 12, borderColor: '#E2E8F0' }}
              >
                {[20, 50, 100].map((size) => (
                  <option key={size} value={size}>
                    {size} / trang
                  </option>
                ))}
              </Form.Select>
              <span className="small text-muted ms-2" style={{ fontSize: 12 }}>
                Tổng <strong>{data.total ?? 0}</strong> kết quả (Trang {data.page}/{data.totalPages || 1})
              </span>
            </div>

            <div className="d-flex align-items-center gap-2">
              <Button
                size="sm"
                variant="outline-primary"
                disabled={data.page <= 1}
                onClick={() => setFilters((v) => ({ ...v, page: v.page - 1 }))}
                style={{ borderRadius: 6, fontSize: 12, padding: '4px 10px' }}
              >
                Trang trước
              </Button>
              <span className="small fw-semibold px-2" style={{ fontSize: 12 }}>
                {data.page} / {data.totalPages || 1}
              </span>
              <Button
                size="sm"
                variant="outline-primary"
                disabled={data.page >= data.totalPages}
                onClick={() => setFilters((v) => ({ ...v, page: v.page + 1 }))}
                style={{ borderRadius: 6, fontSize: 12, padding: '4px 10px' }}
              >
                Trang sau
              </Button>
            </div>
          </div>
        )}
      </div>

      {id && <HistoryDetail key={id} id={id} onClose={() => setParams({})} />}
    </div>
  );
}
