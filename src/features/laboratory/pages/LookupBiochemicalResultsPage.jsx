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
  FaSync, FaShieldAlt, FaVial, FaMicroscope, FaArrowLeft
} from 'react-icons/fa';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { lookupTestResults, getTestResultById } from '../api/biochemicalResultsApi';

export default function LookupBiochemicalResultsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

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
      console.error('Failed to load recent results:', err);
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
    <div className="container-fluid px-4 py-4">
      {/* Page Header */}
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 pb-3 border-bottom gap-3">
        <div>
          <h3 className="fw-bold text-dark mb-1 d-flex align-items-center gap-2">
            <FaFlask className="text-primary" />
            <span>Tra Cứu Kết Quả Xét Nghiệm Sinh Hóa (Look Up Biochemical Results)</span>
            <Badge bg="primary" className="ms-2">UC75</Badge>
          </h3>
          <p className="text-muted small mb-0">
            Tra cứu kết quả xét nghiệm sinh hóa, huyết học, dải tham chiếu chuẩn WHO/ADA, cờ cảnh báo bất thường và thẩm định chữ ký số y khoa.
          </p>
        </div>

        <div className="d-flex gap-2">
          <Button variant="outline-secondary" size="sm" onClick={loadRecentResults} disabled={loadingRecent}>
            <FaSync className={loadingRecent ? 'fa-spin me-1' : 'me-1'} /> Làm mới
          </Button>
          {currentResult && (
            <Button variant="outline-primary" size="sm" onClick={handlePrint}>
              <FaPrint className="me-1" /> In Kết Quả
            </Button>
          )}
          <Button
            variant="primary"
            size="sm"
            onClick={() => navigate('/laboratory/notifications')}
          >
            <FaBell className="me-1" /> Phát Thông Báo (UC60)
          </Button>
        </div>
      </div>

      {/* Search Bar Card */}
      <Card className="border-0 shadow-sm rounded-4 mb-4">
        <Card.Body className="p-4">
          <Form onSubmit={handleSearchSubmit}>
            <Row className="g-3 align-items-center">
              <Col xs={12} md={7} lg={8}>
                <InputGroup>
                  <InputGroup.Text className="bg-light border-end-0">
                    <FaBarcode className="text-muted" />
                  </InputGroup.Text>
                  <Form.Control
                    type="text"
                    placeholder="Nhập Mã Vạch Ống Máu (BC-xxx), Mã Mẫu (SMP-xxx), Mã Bệnh Nhân (PAT-xxx) hoặc Họ Tên..."
                    value={searchKeyword}
                    onChange={(e) => setSearchKeyword(e.target.value)}
                    className="border-start-0 py-2 font-monospace"
                  />
                  <Button variant="primary" type="submit" disabled={loading} className="px-4 fw-semibold">
                    {loading ? <Spinner animation="border" size="sm" /> : <><FaSearch className="me-1" /> Tra Cứu</>}
                  </Button>
                </InputGroup>
              </Col>

              <Col xs={12} md={5} lg={4}>
                <div className="d-flex flex-wrap gap-1 align-items-center">
                  <span className="small text-muted me-1">Mẫu nhanh:</span>
                  <Badge
                    bg="light"
                    text="dark"
                    className="border cursor-pointer hover-shadow"
                    style={{ cursor: 'pointer' }}
                    onClick={() => handleQuickSelect({ id: 'RES-20261009-001', barcode: 'BC-20261009-001' })}
                  >
                    BC-20261009-001 (CBC)
                  </Badge>
                  <Badge
                    bg="light"
                    text="danger"
                    className="border border-danger cursor-pointer hover-shadow"
                    style={{ cursor: 'pointer' }}
                    onClick={() => handleQuickSelect({ id: 'RES-20261009-002', barcode: 'SMP-20261009-002' })}
                  >
                    SMP-002 ⚠️ (Panic GLU)
                  </Badge>
                  <Badge
                    bg="light"
                    text="primary"
                    className="border border-primary cursor-pointer hover-shadow"
                    style={{ cursor: 'pointer' }}
                    onClick={() => handleQuickSelect({ id: 'SMP-20261023-8351', barcode: 'SMP-20261023-787825' })}
                  >
                    Hua Khanh Duy
                  </Badge>
                </div>
              </Col>
            </Row>
          </Form>
        </Card.Body>
      </Card>

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
                <Button
                  variant="danger"
                  size="sm"
                  className="fw-bold"
                  onClick={() => navigate('/laboratory/notifications')}
                >
                  <FaBell className="me-1" /> Bắn Còi Báo Động Nguy Kịch (UC60)
                </Button>
                <Button
                  variant="outline-danger"
                  size="sm"
                  onClick={() => navigate('/laboratory/specimens/history')}
                >
                  <FaHistory className="me-1" /> Truy Vết Chuỗi Bảo Quản Mẫu (UC70)
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
                        <FaShieldAlt /> Chữ ký số bảo mật SHA-256:
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

          {/* Right Column: Biochemical Parameters Table & Conclusion */}
          <Col xs={12} lg={8}>
            <Card className="border-0 shadow-sm rounded-4 h-100 overflow-hidden">
              <Card.Header className="bg-light py-3 border-bottom d-flex justify-content-between align-items-center">
                <h6 className="fw-bold text-dark mb-0 d-flex align-items-center gap-2">
                  <FaMicroscope className="text-primary" />
                  <span>Bảng Chỉ Số Xét Nghiệm Sinh Hóa (Biochemical Parameters)</span>
                </h6>
                <span className="badge bg-primary">
                  {currentResult.parameters?.length || 0} Chỉ Số Đo
                </span>
              </Card.Header>

              <div className="table-responsive">
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
                      <th>Tên Chỉ Số Xét Nghiệm</th>
                      <th>Kết Quả</th>
                      <th>Đơn Vị</th>
                      <th>Dải Tham Chiếu</th>
                      <th className="text-center pe-3">Đánh Giá</th>
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
              <Card.Footer className="bg-light p-3 border-top">
                <div className="small text-muted fw-bold mb-1">KẾT LUẬN Y KHOA CỦA BÁC SĨ / TRƯỞNG KHOA:</div>
                <div className="p-3 bg-white rounded border text-dark fw-medium" style={{ fontSize: '0.9rem', lineHeight: '1.5' }}>
                  {currentResult.conclusionNotes || 'Tất cả các thông số sinh hóa và tế bào nằm trong giới hạn tham chiếu bình thường. Không ghi nhận dấu hiệu bất thường.'}
                </div>
              </Card.Footer>
            </Card>
          </Col>
        </Row>
      ) : (
        !loading && (
          <Card className="border-0 shadow-sm rounded-4 text-center py-5 mb-4 text-muted">
            <Card.Body>
              <FaVial className="fs-1 text-secondary opacity-50 mb-3" />
              <div className="fw-semibold fs-5 text-dark">Chưa chọn kết quả xét nghiệm sinh hóa nào</div>
              <p className="small text-muted">Vui lòng nhập Barcode, Mã mẫu hoặc chọn một kết quả trong danh sách gần đây để tra cứu chi tiết.</p>
            </Card.Body>
          </Card>
        )
      )}

      {/* Recent Biochemical Test Results Table */}
      <Card className="border-0 shadow-sm rounded-4 overflow-hidden">
        <Card.Header className="bg-light py-3 border-bottom d-flex justify-content-between align-items-center">
          <h6 className="fw-bold text-dark mb-0 d-flex align-items-center gap-2">
            <FaHistory className="text-primary" />
            <span>Danh Sách Kết Quả Xét Nghiệm Gần Đây (Recent Database Records)</span>
          </h6>
          <span className="badge bg-secondary">{recentResults.length} Hồ Sơ</span>
        </Card.Header>

        <div className="table-responsive">
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
                <th className="ps-3">Mã Kết Quả / Mẫu</th>
                <th>Bệnh Nhân</th>
                <th>Gói Xét Nghiệm</th>
                <th>Ngày Duyệt</th>
                <th>Kết Luận</th>
                <th className="text-end pe-3">Thao Tác</th>
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
                      <Badge bg={r.status === 'Approved' ? 'success' : 'warning'} className="mt-1">
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
                        className="px-2 py-1 small"
                        onClick={() => handleQuickSelect(r)}
                      >
                        <FaSearch className="me-1" /> Chi Tiết
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
      </Card>
    </div>
  );
}
