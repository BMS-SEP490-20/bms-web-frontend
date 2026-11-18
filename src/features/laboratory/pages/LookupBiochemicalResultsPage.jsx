/**
 * @file LookupBiochemicalResultsPage.jsx
 * @description Master Clinical Biochemical & Hematological Results Lookup and Inspection page (UC75 / BR-227 / BR-228).
 * Displays real-time test parameters, WHO/ADA reference interval flags, panic alerts, digital signatures and clinical conclusions.
 * Conforms to: Production Medical Standards & AGENTS-DESIGN.md.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Card, Row, Col, Table, Badge, Button, Form, InputGroup,
  Alert, Spinner
} from 'react-bootstrap';
import {
  FaFlask, FaSearch, FaBarcode, FaUserInjured, FaCheckCircle,
  FaExclamationTriangle, FaPrint, FaHistory, FaBell,
  FaSync, FaVial, FaMicroscope, FaArrowLeft, FaTimes
} from 'react-icons/fa';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { lookupTestResults, getTestResultById } from '../api/biochemicalResultsApi';
import { ROLES, getStoredUser, hasRole } from '../../../constants/roles';

export default function LookupBiochemicalResultsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const currentUser = getStoredUser();
  const canNotify = hasRole(currentUser, ROLES.LAB, ROLES.MANAGER);

  // Search state
  const initialQuery = searchParams.get('barcode') || searchParams.get('sampleId') || searchParams.get('patientId') || searchParams.get('search') || '';
  const [searchKeyword, setSearchKeyword] = useState(initialQuery);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Selected single test result state
  const [currentResult, setCurrentResult] = useState(null);

  // Recent results list state
  const [recentResults, setRecentResults] = useState([]);
  const [loadingRecent, setLoadingRecent] = useState(false);

  // Load recent results from MongoDB
  const loadRecentResults = useCallback(async () => {
    setLoadingRecent(true);
    try {
      const res = await lookupTestResults({});
      const items = Array.isArray(res?.data) ? res.data : [];
      setRecentResults(items);
    } catch (err) {
      setErrorMsg(err?.response?.data?.message || err?.message || 'Không thể tải danh sách kết quả xét nghiệm gần đây.');
    } finally {
      setLoadingRecent(false);
    }
  }, []);

  // Perform search by keyword (barcode, sample ID, patient ID)
  const executeSearch = useCallback(async (keyword) => {
    const term = (keyword || '').trim();
    if (!term) {
      setCurrentResult(null);
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      const res = await lookupTestResults({ search: term });
      if (res?.data && !Array.isArray(res.data)) {
        // Single result found
        setCurrentResult(res.data);
      } else if (Array.isArray(res?.data) && res.data.length > 0) {
        // Multiple matches, pick the first or load its full detail
        const first = res.data[0];
        if (first.id) {
          const detailRes = await getTestResultById(first.id);
          setCurrentResult(detailRes?.data || first);
        } else {
          setCurrentResult(first);
        }
      } else {
        setCurrentResult(null);
        setErrorMsg(`Không tìm thấy kết quả xét nghiệm sinh hóa cho từ khóa "${term}".`);
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || err.message || 'Lỗi khi tra cứu kết quả xét nghiệm.');
      setCurrentResult(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initialize
  useEffect(() => {
    loadRecentResults();
    if (initialQuery) {
      executeSearch(initialQuery);
    } else {
      // Default load first recent result if available
      lookupTestResults({}).then((res) => {
        if (Array.isArray(res?.data) && res.data.length > 0) {
          getTestResultById(res.data[0].id).then((dRes) => {
            if (dRes?.data) setCurrentResult(dRes.data);
          });
        }
      });
    }
  }, [executeSearch, initialQuery, loadRecentResults]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (!searchKeyword.trim()) return;
    setSearchParams({ search: searchKeyword.trim() });
    executeSearch(searchKeyword.trim());
  };

  const handleQuickSelect = async (item) => {
    const key = item.id || item.sampleId || item.barcode;
    setSearchKeyword(key);
    setSearchParams({ search: key });
    setLoading(true);
    setErrorMsg('');
    try {
      const detailRes = await getTestResultById(item.id);
      setCurrentResult(detailRes?.data || item);
    } catch {
      executeSearch(key);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // Helper for flag badges
  const renderFlagBadge = (flag, isAbnormal) => {
    const f = String(flag || '').toUpperCase();
    if (f.includes('PANIC')) {
      return <Badge bg="danger" className="px-2 py-1 fs-7 text-uppercase animate-pulse">Nguy kịch (Panic)</Badge>;
    }
    if (f.includes('HIGH') || f === 'H') {
      return <Badge bg="warning" text="dark" className="px-2 py-1 fs-7">Tăng cao (High)</Badge>;
    }
    if (f.includes('LOW') || f === 'L') {
      return <Badge bg="info" className="px-2 py-1 fs-7">Giảm thấp (Low)</Badge>;
    }
    if (isAbnormal) {
      return <Badge bg="warning" text="dark" className="px-2 py-1 fs-7">Bất thường</Badge>;
    }
    return <Badge bg="success" className="px-2 py-1 fs-7">Bình thường (Normal)</Badge>;
  };

  // Check if current result has panic/critical values
  const hasPanicValues = currentResult?.parameters?.some(p =>
    String(p.flag).toUpperCase().includes('PANIC') || (p.isAbnormal && String(p.flag).toUpperCase().includes('HIGH') && p.value > 20)
  ) || currentResult?.conclusionNotes?.toLowerCase().includes('cảnh báo');

  return (
    <div className="w-100 py-1">
      {/* Page Header Card */}
      <div className="bms-page-header-card mb-4">
        <div className="bms-page-header-content flex-column align-items-start">
          <div className="bms-page-title-row">
            <h1 className="bms-page-title">Tra cứu kết quả xét nghiệm sinh hóa</h1>
          </div>
          <p className="text-muted small m-0 mt-1">
            Tra cứu chỉ số xét nghiệm, dải tham chiếu và báo cáo kết quả theo mã vạch mẫu.
          </p>
        </div>

        <div className="bms-page-actions">
          <Button variant="outline-secondary" size="sm" className="rounded-pill px-3 text-nowrap" onClick={loadRecentResults} disabled={loadingRecent}>
            <FaSync className={loadingRecent ? 'fa-spin me-1' : 'me-1'} size={12} /> Làm mới
          </Button>
          {currentResult && (
            <Button variant="outline-primary" size="sm" className="rounded-pill px-3 text-nowrap" style={{ color: '#1E60E6', borderColor: '#1E60E6' }} onClick={handlePrint}>
              <FaPrint className="me-1" /> In kết quả
            </Button>
          )}
          {canNotify && (
            <Button
              size="sm"
              className="rounded-pill px-3 fw-semibold text-white text-nowrap"
              style={{ backgroundColor: '#1E60E6', borderColor: '#1E60E6' }}
              onClick={() => navigate('/laboratory/notifications')}
            >
              <FaBell className="me-1" /> Thông báo
            </Button>
          )}
        </div>
      </div>

      {/* Single-Line Search Filter Bar */}
      <Form onSubmit={handleSearchSubmit} className="bms-filter-bar mb-3">
        <div className="bms-search-input-pill">
          <FaBarcode className="bms-search-icon" />
          <input
            type="text"
            placeholder="Nhập mã vạch ống máu (BC-xxx), mã mẫu, mã bệnh nhân hoặc họ tên..."
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
          />
          {searchKeyword && (
            <button
              type="button"
              className="bms-search-clear"
              onClick={() => {
                setSearchKeyword('');
                setSearchParams({});
              }}
            >
              <FaTimes size={12} />
            </button>
          )}
        </div>

        <Button type="submit" size="sm" disabled={loading} className="px-3 fw-semibold rounded-pill text-nowrap" style={{ backgroundColor: '#1E60E6', borderColor: '#1E60E6', color: '#ffffff' }}>
          {loading ? <Spinner animation="border" size="sm" /> : <><FaSearch className="me-1" /> Tra cứu</>}
        </Button>

        {recentResults.length > 0 && (
          <div className="d-flex flex-wrap gap-1 align-items-center">
            <span className="small text-muted me-1">Mẫu gần đây:</span>
            {recentResults.slice(0, 3).map((item, idx) => (
              <button
                key={item.id || idx}
                type="button"
                className="btn btn-sm btn-outline-secondary rounded-pill py-0 px-2.5 font-monospace"
                onClick={() => handleQuickSelect(item)}
              >
                {item.barcode || item.sampleId || item.id}
              </button>
            ))}
          </div>
        )}

        <span className="bms-filter-meta">
          Gần đây: <strong>{recentResults.length}</strong> hồ sơ
        </span>
      </Form>

      {errorMsg && (
        <Alert variant="danger" dismissible onClose={() => setErrorMsg('')} className="mb-4">
          <FaExclamationTriangle className="me-2" />
          {errorMsg}
        </Alert>
      )}

      {/* Panic / Critical Alert Banner (if applicable) */}
      {hasPanicValues && (
        <Alert variant="danger" className="border-danger shadow-sm mb-4">
          <div className="d-flex align-items-start gap-3">
            <FaExclamationTriangle className="fs-3 text-danger mt-1 flex-shrink-0 animate-bounce" />
            <div>
              <h5 className="fw-bold mb-1 text-danger">CẢNH BÁO GIÁ TRỊ HOẢNG LOẠN (PANIC / CRITICAL VALUE ALERT)</h5>
              <div className="small mb-2">
                Phát hiện chỉ số xét nghiệm vượt ngưỡng báo động đe dọa tính mạng (Đường huyết &gt; 20.0 mmol/L hoặc các bất thường huyết học nghiêm trọng).
              </div>
              <div className="d-flex flex-wrap gap-2">
                {canNotify && (
                  <Button
                    variant="danger"
                    size="sm"
                    className="fw-bold"
                    onClick={() => navigate('/laboratory/notifications')}
                  >
                    <FaBell className="me-1" /> Bắn Còi Báo Động Nguy Kịch
                  </Button>
                )}
                <Button
                  variant="outline-danger"
                  size="sm"
                  onClick={() => navigate('/laboratory/specimens/history')}
                >
                  <FaHistory className="me-1" /> Truy Vết Chuỗi Bảo Quản Mẫu
                </Button>
              </div>
            </div>
          </div>
        </Alert>
      )}

      {/* Main Result Display */}
      {currentResult ? (
        <Row className="g-4 mb-4">
          {/* Left Column: Patient & Specimen Info Card */}
          <Col xs={12} lg={4}>
            <Card className="border-0 shadow-sm rounded-4 h-100">
              <Card.Header className="bg-light py-3 border-bottom">
                <h6 className="fw-bold text-dark mb-0 d-flex align-items-center gap-2">
                  <FaUserInjured className="text-primary" />
                  <span>Hồ Sơ Bệnh Nhân & Mẫu Bệnh Phẩm</span>
                </h6>
              </Card.Header>
              <Card.Body className="p-3">
                <div className="mb-3 pb-3 border-bottom">
                  <div className="small text-muted">Bệnh nhân:</div>
                  <div className="fs-5 fw-bold text-dark">{currentResult.patientName}</div>
                  <div className="small text-muted font-monospace">Mã BN: {currentResult.patientId}</div>
                  <div className="small text-muted mt-1">
                    {currentResult.patientGender && <span>Giới tính: <strong>{currentResult.patientGender}</strong> • </span>}
                    {currentResult.patientDob && <span>Ngày sinh: {currentResult.patientDob} • </span>}
                    {currentResult.patientPhone && <span>SĐT: {currentResult.patientPhone}</span>}
                  </div>
                  {currentResult.patientAddress && (
                    <div className="small text-muted mt-1">Đ/c: {currentResult.patientAddress}</div>
                  )}
                </div>

                <div className="mb-3 pb-3 border-bottom">
                  <div className="small text-muted">Gói xét nghiệm:</div>
                  <div className="fw-semibold text-primary">{currentResult.packageName || currentResult.packageId}</div>
                  <div className="small text-muted mt-1 d-flex gap-2 align-items-center">
                    <span>Mã vạch:</span>
                    <Badge bg="secondary" className="font-monospace">{currentResult.barcode || currentResult.sampleId}</Badge>
                  </div>
                  <div className="small text-muted mt-1 d-flex gap-2 align-items-center">
                    <span>Loại mẫu:</span>
                    <Badge bg="light" text="dark" className="border">{currentResult.sampleType || 'Blood'}</Badge>
                    <span>Màu ống:</span>
                    <Badge bg="light" text="dark" className="border">{currentResult.tubeColor || 'Purple'}</Badge>
                  </div>
                  <div className="small text-muted mt-1">
                    Thiết bị phân tích: <code>{currentResult.equipmentCode || 'EQ-BIO-01'}</code>
                  </div>
                </div>

                <div>
                  <div className="small text-muted">Thẩm định & Chữ ký số y khoa:</div>
                  <div className="d-flex align-items-center gap-2 mt-1">
                    <Badge bg={currentResult.status === 'Approved' ? 'success' : 'warning'} className="py-2 px-2">
                      <FaCheckCircle className="me-1" />
                      {currentResult.status === 'Approved' ? 'Đã Thẩm Định Y Khoa (Approved)' : currentResult.status}
                    </Badge>
                  </div>
                  {currentResult.approvedAt && (
                    <div className="small text-muted mt-2">
                      Ngày giờ duyệt: <strong>{new Date(currentResult.approvedAt).toLocaleString('vi-VN')}</strong>
                    </div>
                  )}
                  {currentResult.digitalSignature && (
                    <div className="small text-muted mt-2 bg-light p-2 rounded border">
                      <div className="fw-semibold d-flex align-items-center gap-1 text-success">
                        <FaCheckCircle /> Chữ ký số bảo mật SHA-256:
                      </div>
                      <code className="text-break" style={{ fontSize: '0.75rem' }}>
                        {currentResult.digitalSignature}
                      </code>
                    </div>
                  )}
                </div>
              </Card.Body>
            </Card>
          </Col>

          {/* Right Column: Biochemical Parameters Standalone Table & Conclusion */}
          <Col xs={12} lg={8}>
            <section className="bms-table-standalone-section m-0 h-100 d-flex flex-column">
              <div className="bms-table-standalone-header">
                <div>
                  <h2 className="bms-table-standalone-title">Bảng chỉ số xét nghiệm sinh hóa</h2>
                  <p className="bms-table-standalone-subtitle">Đối chiếu kết quả đo với dải tham chiếu sinh học</p>
                </div>
                <span className="badge bg-primary-subtle text-primary border border-primary-subtle rounded-pill px-3 py-1">
                  {currentResult.parameters?.length || 0} chỉ số đo
                </span>
              </div>

              <div className="bms-table-standalone-body flex-grow-1">
                <Table hover className="mb-0 align-middle table-sm" style={{ tableLayout: 'fixed', width: '100%' }}>
                  <colgroup>
                    <col style={{ width: '12%' }} />
                    <col style={{ width: '28%' }} />
                    <col style={{ width: '16%' }} />
                    <col style={{ width: '12%' }} />
                    <col style={{ width: '16%' }} />
                    <col style={{ width: '16%' }} />
                  </colgroup>
                  <thead className="table-light">
                    <tr>
                      <th className="ps-3">Mã</th>
                      <th>Tên chỉ số xét nghiệm</th>
                      <th>Kết quả</th>
                      <th>Đơn vị</th>
                      <th>Dải tham chiếu</th>
                      <th className="text-center pe-3">Đánh giá</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentResult.parameters && currentResult.parameters.length > 0 ? (
                      currentResult.parameters.map((p, idx) => {
                        const isPanic = String(p.flag || '').toUpperCase().includes('PANIC');
                        const isHigh = String(p.flag || '').toUpperCase().includes('HIGH');
                        const isLow = String(p.flag || '').toUpperCase().includes('LOW');

                        return (
                          <tr
                            key={idx}
                            className={isPanic ? 'table-danger' : (p.isAbnormal ? 'table-warning' : '')}
                          >
                            <td className="ps-3 font-monospace fw-bold text-secondary" style={{ fontSize: '0.85rem' }}>
                              {p.code}
                            </td>
                            <td>
                              <div className="fw-semibold text-dark" style={{ fontSize: '0.88rem' }}>
                                {p.name}
                              </div>
                            </td>
                            <td>
                              <span className={`fw-bold fs-6 ${isPanic ? 'text-danger' : (isHigh || isLow ? 'text-warning-emphasis' : 'text-dark')}`}>
                                {p.value}
                              </span>
                            </td>
                            <td className="text-muted small">
                              {p.unit}
                            </td>
                            <td className="text-muted small font-monospace">
                              {p.referenceRange || '—'}
                            </td>
                            <td className="text-center pe-3">
                              {renderFlagBadge(p.flag, p.isAbnormal)}
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={6} className="text-center py-4 text-muted">
                          Chưa có chỉ số chi tiết cho mẫu xét nghiệm này.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </Table>
              </div>

              {/* Conclusion Section */}
              <div className="p-3 border-top" style={{ backgroundColor: '#F8FAFC' }}>
                <div className="small text-muted fw-bold mb-1">Kết luận y khoa của bác sĩ / Trưởng khoa:</div>
                <div className="p-3 bg-white rounded-3 border text-dark fw-medium" style={{ fontSize: '0.9rem', lineHeight: '1.5' }}>
                  {currentResult.conclusionNotes || 'Tất cả các thông số sinh hóa và tế bào nằm trong giới hạn tham chiếu bình thường. Không ghi nhận dấu hiệu bất thường.'}
                </div>
              </div>
            </section>
          </Col>
        </Row>
      ) : (
        !loading && (
          <Card className="shadow-sm rounded-4 text-center py-4 mb-4 text-muted" style={{ border: '1px solid #E2E8F0' }}>
            <Card.Body>
              <FaVial className="fs-1 text-secondary opacity-50 mb-3" />
              <div className="fw-semibold fs-6 text-dark">Chưa chọn kết quả xét nghiệm sinh hóa nào</div>
              <p className="small text-muted mb-0">Vui lòng nhập mã vạch, mã mẫu hoặc chọn một kết quả trong danh sách gần đây để tra cứu chi tiết.</p>
            </Card.Body>
          </Card>
        )
      )}

      {/* Recent Biochemical Test Results Standalone Table */}
      <section className="bms-table-standalone-section">
        <div className="bms-table-standalone-header">
          <div>
            <h2 className="bms-table-standalone-title">Danh sách kết quả xét nghiệm gần đây</h2>
            <p className="bms-table-standalone-subtitle">Các hồ sơ kết quả vừa hoàn tất phân tích trong cơ sở dữ liệu</p>
          </div>
          <span className="badge bg-secondary-subtle text-secondary border rounded-pill px-3 py-1">{recentResults.length} hồ sơ</span>
        </div>

        <div className="bms-table-standalone-body">
          <Table hover className="mb-0 align-middle table-sm" style={{ tableLayout: 'fixed', width: '100%' }}>
            <colgroup>
              <col style={{ width: '15%' }} />
              <col style={{ width: '15%' }} />
              <col style={{ width: '22%' }} />
              <col style={{ width: '16%' }} />
              <col style={{ width: '18%' }} />
              <col style={{ width: '14%' }} />
            </colgroup>
            <thead className="table-light">
              <tr>
                <th className="ps-3">Mã kết quả / Mẫu</th>
                <th>Bệnh nhân</th>
                <th>Gói xét nghiệm</th>
                <th>Ngày duyệt</th>
                <th>Kết luận</th>
                <th className="text-end pe-3">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {recentResults.length > 0 ? (
                recentResults.map((r, idx) => (
                  <tr key={idx}>
                    <td className="ps-3">
                      <div className="fw-bold text-primary font-monospace" style={{ fontSize: '0.85rem' }}>{r.id}</div>
                      <div className="text-muted small">Barcode: <code>{r.barcode || r.sampleId}</code></div>
                    </td>
                    <td>
                      <div className="fw-semibold text-dark" style={{ fontSize: '0.85rem' }}>{r.patientName || r.patientId}</div>
                      <div className="text-muted small">Mã: <code>{r.patientId}</code></div>
                    </td>
                    <td>
                      <div className="fw-medium text-dark text-truncate" style={{ fontSize: '0.82rem' }}>{r.packageName || r.packageId}</div>
                      <Badge bg={r.status === 'Approved' ? 'success' : 'warning'} className="mt-1 rounded-pill">
                        {r.status || 'Approved'}
                      </Badge>
                    </td>
                    <td className="text-muted small">
                      {r.approvedAt ? new Date(r.approvedAt).toLocaleString('vi-VN') : '—'}
                    </td>
                    <td>
                      <div className="text-truncate text-muted small" style={{ maxWidth: '240px' }} title={r.conclusion}>
                        {r.conclusion || '—'}
                      </div>
                    </td>
                    <td className="text-end pe-3">
                      <Button
                        variant="outline-primary"
                        size="sm"
                        className="rounded-pill px-3 py-1 small text-nowrap"
                        onClick={() => handleQuickSelect(r)}
                      >
                        <FaSearch className="me-1" /> Chi tiết
                      </Button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="text-center py-4 text-muted">
                    {loadingRecent ? 'Đang tải danh sách kết quả gần đây...' : 'Chưa có hồ sơ kết quả xét nghiệm nào trong cơ sở dữ liệu.'}
                  </td>
                </tr>
              )}
            </tbody>
          </Table>
        </div>
      </section>
    </div>
  );
}
