/**
 * @file TestBatchManagementPage.jsx
 * @description Quản lý mẻ xét nghiệm máy phân tích tự động theo chuẩn ISO 15189:2022 (UC38).
 * Tuân thủ: Tiêu chuẩn ISO 15189:2022, Clean Medical Standard (Rule 19) & AGENTS-CODE.md.
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  Container,
  Row,
  Col,
  Card,
  Table,
  Button,
  Badge,
  Alert,
  Form,
  Spinner,
  Modal
} from 'react-bootstrap';
import {
  FaFlask,
  FaCheckCircle,
  FaExclamationTriangle,
  FaPlus,
  FaPlay,
  FaStop,
  FaTrashAlt,
  FaSyncAlt,
  FaMicroscope,
  FaVial,
  FaArrowLeft,
  FaLock,
  FaClock,
  FaInfoCircle
} from 'react-icons/fa';
import {
  getBatches,
  getPendingSamples,
  createBatch,
  updateBatchStatus,
  cancelBatch
} from '../api/testBatchApi';

const ANALYZERS = [
  { id: 'COBAS-6000', name: 'Roche Cobas 6000 (Hóa sinh)', category: 'Biochemistry', capacity: 96, rows: 8, cols: 12 },
  { id: 'SYSMEX-XN1000', name: 'Sysmex XN-1000 (Huyết học)', category: 'Hematology', capacity: 48, rows: 6, cols: 8 },
  { id: 'ARCHITECT-I2000', name: 'Abbott Architect i2000SR (Miễn dịch)', category: 'Immunology', capacity: 24, rows: 4, cols: 6 },
];

export default function TestBatchManagementPage() {
  const [batches, setBatches] = useState([]);
  const [pendingSamples, setPendingSamples] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Chế độ xem: 'list' | 'create' | 'detail'
  const [activeTab, setActiveTab] = useState('list');
  const [selectedBatch, setSelectedBatch] = useState(null);

  // Form tạo mẻ mới
  const [selectedAnalyzer, setSelectedAnalyzer] = useState(ANALYZERS[0]);
  const [batchNotes, setBatchNotes] = useState('');
  const [iqcLotNumber, setIqcLotNumber] = useState('LOT-2026-OCT-09');
  const [assignedWells, setAssignedWells] = useState({}); // { "A3": sample, ... }
  const [selectedWell, setSelectedWell] = useState('A3');

  useEffect(() => {
    loadBatches();
    loadPendingSamples();
  }, []);

  async function loadBatches() {
    setLoading(true);
    try {
      const res = await getBatches();
      const list = res?.data || res || [];
      setBatches(Array.isArray(list) ? list : []);
    } catch (err) {
      setError(err.message || 'Không thể tải danh sách mẻ xét nghiệm.');
      setBatches([]);
    } finally {
      setLoading(false);
    }
  }

  async function loadPendingSamples(category) {
    try {
      const res = await getPendingSamples(category || selectedAnalyzer.category);
      const list = res?.data || res || [];
      setPendingSamples(Array.isArray(list) ? list : []);
    } catch (err) {
      console.warn('Lỗi tải mẫu chờ xếp mẻ:', err);
      setPendingSamples([]);
    }
  }

  const handleSelectAnalyzer = (analyzer) => {
    setSelectedAnalyzer(analyzer);
    setAssignedWells({});
    setSelectedWell('A3');
    loadPendingSamples(analyzer.category);
  };

  const assignSampleToWell = (sample, wellCoordinate) => {
    if (wellCoordinate === 'A1' || wellCoordinate === 'A2') {
      alert('Vị trí A1 và A2 là vùng bảo lưu nghiêm ngặt cho mẫu nội kiểm ISO 15189 (IQC Controls)!');
      return;
    }
    setAssignedWells(prev => ({
      ...prev,
      [wellCoordinate]: sample
    }));
  };

  const removeSampleFromWell = (wellCoordinate) => {
    setAssignedWells(prev => {
      const copy = { ...prev };
      delete copy[wellCoordinate];
      return copy;
    });
  };

  // Tự động xếp mẫu theo thứ tự ưu tiên ISO 15189 (STAT đi trước)
  const handleAutoFill = () => {
    const rows = ['A','B','C','D','E','F','G','H'].slice(0, selectedAnalyzer.rows);
    const cols = Array.from({ length: selectedAnalyzer.cols }, (_, i) => i + 1);

    const allWells = [];
    rows.forEach(r => {
      cols.forEach(c => {
        const coord = `${r}${c}`;
        if (coord !== 'A1' && coord !== 'A2') {
          allWells.push(coord);
        }
      });
    });

    const newAssigned = {};
    const safePending = Array.isArray(pendingSamples) ? pendingSamples : [];
    const unassignedSamples = safePending.filter(s =>
      !Object.values(assignedWells).some(a => a?.id === s?.id || a?.barcode === s?.barcode)
    );

    // Ưu tiên mẫu cấp cứu STAT
    const sorted = [...unassignedSamples].sort((a, b) => {
      if (a?.priority === 'STAT' && b?.priority !== 'STAT') return -1;
      if (b?.priority === 'STAT' && a?.priority !== 'STAT') return 1;
      return 0;
    });

    let sIdx = 0;
    for (let i = 0; i < allWells.length && sIdx < sorted.length; i++) {
      newAssigned[allWells[i]] = sorted[sIdx];
      sIdx++;
    }

    setAssignedWells(prev => ({ ...prev, ...newAssigned }));
    setSuccessMsg(`Đã tự động xếp ${sIdx} mẫu vào khay theo thứ tự ưu tiên ISO 15189.`);
    setTimeout(() => setSuccessMsg(null), 4000);
  };

  const handleCreateBatch = async () => {
    const wellEntries = Object.entries(assignedWells);
    if (wellEntries.length === 0) {
      alert('Vui lòng xếp ít nhất một mẫu bệnh phẩm vào khay mẻ xét nghiệm.');
      return;
    }

    const positions = [
      {
        coordinate: 'A1',
        isIqcControl: true,
        iqcControlLevel: 'Level 1 (Bình thường)',
        iqcLotNumber: iqcLotNumber
      },
      {
        coordinate: 'A2',
        isIqcControl: true,
        iqcControlLevel: 'Level 2 (Bệnh lý cao)',
        iqcLotNumber: iqcLotNumber
      },
      ...wellEntries.map(([coord, sample]) => ({
        coordinate: coord,
        sampleId: sample.id || sample._id,
        barcode: sample.barcode,
        isStat: sample.priority === 'STAT',
        patientName: sample.patientName,
        testType: sample.sampleType || sample.testCategory
      }))
    ];

    const payload = {
      analyzerId: selectedAnalyzer.id,
      analyzerName: selectedAnalyzer.name,
      testCategory: selectedAnalyzer.category,
      trayCapacity: selectedAnalyzer.capacity,
      notes: batchNotes,
      positions
    };

    setLoading(true);
    try {
      await createBatch(payload);
      setSuccessMsg(`Tạo mẻ xét nghiệm máy ${selectedAnalyzer.name} thành công với ${positions.length} vị trí!`);
      setTimeout(() => setSuccessMsg(null), 4000);
      setAssignedWells({});
      setBatchNotes('');
      setActiveTab('list');
      await loadBatches();
      await loadPendingSamples();
    } catch (err) {
      setError(err.message || 'Không thể tạo mẻ xét nghiệm.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (batchId, nextStatus) => {
    try {
      await updateBatchStatus(batchId, { status: nextStatus, notes: `Chuyển trạng thái sang ${nextStatus}` });
      setSuccessMsg(`Mẻ xét nghiệm đã cập nhật sang trạng thái: ${nextStatus}`);
      setTimeout(() => setSuccessMsg(null), 3000);
      await loadBatches();
      if (selectedBatch && selectedBatch.id === batchId) {
        setSelectedBatch(prev => ({ ...prev, status: nextStatus }));
      }
    } catch (err) {
      alert(err.message || 'Lỗi khi cập nhật trạng thái mẻ chạy.');
    }
  };

  const handleCancelBatch = async (batchId) => {
    if (!window.confirm('CẢNH BÁO ISO 15189: Hủy mẻ chạy sẽ hoàn tác tất cả mẫu bệnh phẩm về trạng thái "Đã tiếp nhận" (Received). Bạn có chắc chắn muốn hủy?')) {
      return;
    }
    try {
      await cancelBatch(batchId, 'Kỹ thuật viên hủy mẻ để sắp xếp lại.');
      setSuccessMsg('Đã hủy mẻ và hoàn trả các ống mẫu về hàng đợi thành công.');
      setTimeout(() => setSuccessMsg(null), 4000);
      await loadBatches();
      await loadPendingSamples();
      if (selectedBatch && selectedBatch.id === batchId) {
        setSelectedBatch(null);
        setActiveTab('list');
      }
    } catch (err) {
      alert(err.message || 'Lỗi khi hủy mẻ xét nghiệm.');
    }
  };

  const safeBatches = Array.isArray(batches) ? batches : [];
  const safePendingSamples = Array.isArray(pendingSamples) ? pendingSamples : [];

  const rows = ['A','B','C','D','E','F','G','H'].slice(0, selectedAnalyzer.rows);
  const cols = Array.from({ length: selectedAnalyzer.cols }, (_, i) => i + 1);

  return (
    <Container fluid className="py-2 px-md-4" style={{ minHeight: '100vh' }}>
      {/* Header Banner chuẩn ISO 15189 */}
      <header className="bms-page-header">
        <div className="bms-page-header-content">
          <h1 className="bms-page-title">Mẻ xét nghiệm</h1>
        </div>
        <div className="d-flex gap-2">
          <Button
            size="sm"
            onClick={() => { setActiveTab('list'); setSelectedBatch(null); }}
            className="d-flex align-items-center gap-1 shadow-sm px-3 rounded-pill"
            style={activeTab === 'list' ? { backgroundColor: '#1E60E6', borderColor: '#1E60E6' } : { borderColor: 'rgba(15, 23, 42, 0.05)' }}
            variant={activeTab === 'list' ? 'primary' : 'outline-secondary'}
          >
            Danh Sách Mẻ ({safeBatches.length})
          </Button>
          <Button
            size="sm"
            onClick={() => setActiveTab('create')}
            className="d-flex align-items-center gap-1 shadow-sm px-3 fw-semibold rounded-pill"
            style={{ backgroundColor: '#10B981', borderColor: '#10B981', color: '#1A3311' }}
          >
            <FaPlus /> Tạo mẻ
          </Button>
        </div>
      </header>

      {/* Thông báo Alert */}
      {error && (
        <Alert variant="danger" dismissible onClose={() => setError(null)} className="rounded-3 shadow-sm mb-3">
          <FaExclamationTriangle className="me-2" />
          {error}
        </Alert>
      )}
      {successMsg && (
        <Alert variant="success" dismissible onClose={() => setSuccessMsg(null)} className="rounded-3 shadow-sm mb-3">
          <FaCheckCircle className="me-2" />
          {successMsg}
        </Alert>
      )}

      {/* TAB 1: DANH SÁCH MẺ XÉT NGHIỆM */}
      {activeTab === 'list' && (
        <Card className="border-0 shadow-sm rounded-4 overflow-hidden bg-white" style={{ border: '1px solid rgba(15, 23, 42, 0.05)' }}>
          <Card.Header className="bg-white py-3 border-bottom d-flex justify-content-between align-items-center" style={{ borderColor: 'rgba(15, 23, 42, 0.05)' }}>
            <h5 className="mb-0 fw-bold fs-6 d-flex align-items-center gap-2" style={{ color: '#0F172A' }}>
              <FaMicroscope style={{ color: '#1E60E6' }} />
              <span>Danh Sách Các Mẻ Xét Nghiệm Trong Ca Làm Việc</span>
            </h5>
            <Button variant="outline-secondary" size="sm" onClick={loadBatches} className="d-flex align-items-center gap-1 rounded-pill px-3" style={{ borderColor: 'rgba(15, 23, 42, 0.05)' }}>
              <FaSyncAlt className={loading ? 'fa-spin' : ''} /> Làm mới
            </Button>
          </Card.Header>

          <Card.Body className="p-0">
            <div className="table-responsive">
              <Table hover align="middle" className="mb-0 table-sm">
                <thead className="table-light text-muted small text-uppercase">
                  <tr>
                    <th className="py-3 px-3">Mã Mẻ (Batch Code)</th>
                    <th className="py-3">Máy Phân Tích</th>
                    <th className="py-3">Số Mẫu / Dung Lượng</th>
                    <th className="py-3">Trạng Thái</th>
                    <th className="py-3">Kỹ Thuật Viên</th>
                    <th className="py-3">Thời Gian Tạo</th>
                    <th className="py-3 px-3 text-end">Thao Tác</th>
                  </tr>
                </thead>
                <tbody>
                  {loading && safeBatches.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="text-center py-3">
                        <Spinner animation="border" variant="primary" size="sm" className="me-2" />
                        <span className="text-muted">Đang tải danh sách mẻ chạy...</span>
                      </td>
                    </tr>
                  ) : safeBatches.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="text-center py-3 text-muted">
                        <FaFlask className="fs-1 text-secondary opacity-50 mb-2" />
                        <div className="fw-semibold">Chưa có mẻ xét nghiệm nào trong ca</div>
                        <div className="small mb-3">Hãy tạo mẻ mới để sắp xếp các ống bệnh phẩm vào khay máy.</div>
                        <Button variant="primary" size="sm" onClick={() => setActiveTab('create')}>
                          <FaPlus className="me-1" /> Tạo Mẻ Mới Ngay
                        </Button>
                      </td>
                    </tr>
                  ) : (
                    safeBatches.map((b) => {
                      const totalWells = Array.isArray(b.positions) ? b.positions.length : b.totalPositions || 0;
                      return (
                        <tr key={b.id || b.batchCode}>
                          <td className="px-3">
                            <span className="fw-bold font-monospace text-primary">{b.batchCode || b.id}</span>
                          </td>
                          <td>
                            <strong className="text-dark small">{b.analyzerName || b.analyzerId}</strong>
                            <div className="text-muted" style={{ fontSize: '0.72rem' }}>{b.testCategory}</div>
                          </td>
                          <td>
                            <span className="fw-semibold text-dark">{totalWells}</span>
                            <span className="text-muted"> / {b.trayCapacity || 96} giếng</span>
                          </td>
                          <td>
                            <Badge
                              bg={
                                b.status === 'Running' ? 'warning' :
                                b.status === 'Completed' ? 'success' :
                                b.status === 'Cancelled' ? 'danger' : 'secondary'
                              }
                              text={b.status === 'Running' ? 'dark' : undefined}
                              className="px-2 py-1"
                            >
                              {b.status === 'Draft' ? 'Bản nháp' :
                               b.status === 'Running' ? 'Đang chạy máy' :
                               b.status === 'Completed' ? 'Hoàn thành' :
                               b.status === 'Cancelled' ? 'Đã hủy' : b.status}
                            </Badge>
                          </td>
                          <td className="small text-muted">{b.createdByName || 'KTV. Lê Minh Tuấn'}</td>
                          <td className="small text-muted font-monospace">
                            {b.createdAt ? new Date(b.createdAt).toLocaleString('vi-VN') : '—'}
                          </td>
                          <td className="px-3 text-end">
                            <div className="d-flex justify-content-end gap-1">
                              <Button
                                variant="outline-primary"
                                size="sm"
                                className="px-2 py-1 rounded-pill"
                                style={{ fontSize: '0.75rem', borderColor: '#1E60E6', color: '#1E60E6' }}
                                onClick={() => { setSelectedBatch(b); setActiveTab('detail'); }}
                              >
                                Chi tiết khay
                              </Button>

                              {b.status === 'Draft' && (
                                <Button
                                  variant="warning"
                                  size="sm"
                                  className="px-2 py-1 text-dark rounded-pill"
                                  style={{ fontSize: '0.75rem', backgroundColor: '#B45309', borderColor: '#B45309' }}
                                  onClick={() => handleUpdateStatus(b.id, 'Running')}
                                >
                                  <FaPlay className="me-1" /> Chạy máy
                                </Button>
                              )}

                              {b.status === 'Running' && (
                                <Button
                                  variant="success"
                                  size="sm"
                                  className="px-2 py-1 rounded-pill"
                                  style={{ fontSize: '0.75rem', backgroundColor: '#10B981', borderColor: '#10B981', color: '#1A3311' }}
                                  onClick={() => handleUpdateStatus(b.id, 'Completed')}
                                >
                                  <FaCheckCircle className="me-1" /> Hoàn thành
                                </Button>
                              )}

                              {b.status !== 'Completed' && b.status !== 'Cancelled' && (
                                <Button
                                  variant="outline-danger"
                                  size="sm"
                                  className="px-2 py-1 rounded-circle"
                                  style={{ fontSize: '0.75rem' }}
                                  onClick={() => handleCancelBatch(b.id)}
                                  title="Hủy mẻ và hoàn tác mẫu về hàng đợi"
                                >
                                  <FaTrashAlt />
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </Table>
            </div>
          </Card.Body>
        </Card>
      )}

      {/* TAB 2: TẠO MẺ CHẠY MỚI */}
      {activeTab === 'create' && (
        <div>
          {/* Card chọn máy và thiết lập */}
          <Card className="border-0 shadow-sm rounded-3 mb-4 bg-white">
            <Card.Header className="bg-white py-3 border-bottom">
              <h5 className="mb-0 fw-bold fs-6 text-dark d-flex align-items-center gap-2">
                <FaFlask className="text-primary" />
                <span>1. Chọn Máy Phân Tích &amp; Lô Kiểm Chuẩn IQC (ISO 15189)</span>
              </h5>
            </Card.Header>
            <Card.Body className="p-2">
              <Row className="g-3">
                <Col md={5}>
                  <Form.Label className="small fw-semibold text-secondary">Thiết Bị Phân Tích Tự Động *</Form.Label>
                  <Form.Select
                    value={selectedAnalyzer.id}
                    onChange={(e) => {
                      const anl = ANALYZERS.find(a => a.id === e.target.value);
                      if (anl) handleSelectAnalyzer(anl);
                    }}
                  >
                    {ANALYZERS.map(a => (
                      <option key={a.id} value={a.id}>
                        {a.name} &bull; Sức chứa: {a.capacity} giếng
                      </option>
                    ))}
                  </Form.Select>
                </Col>

                <Col md={4}>
                  <Form.Label className="small fw-semibold text-secondary">Mã Lô Nội Kiểm IQC (Vị trí A1/A2) *</Form.Label>
                  <Form.Control
                    value={iqcLotNumber}
                    onChange={(e) => setIqcLotNumber(e.target.value)}
                    placeholder="VD: LOT-2026-OCT-09"
                  />
                </Col>

                <Col md={3}>
                  <Form.Label className="small fw-semibold text-secondary">Tác Vụ Xếp Nhanh</Form.Label>
                  <Button
                    variant="outline-primary"
                    className="w-100 d-flex align-items-center justify-content-center gap-1 shadow-sm"
                    onClick={handleAutoFill}
                  >
                    <FaVial /> Xếp Nhanh Mẫu (Ưu Tiên STAT)
                  </Button>
                </Col>

                <Col xs={12}>
                  <Form.Label className="small fw-semibold text-secondary">Ghi Chú Vận Hành Mẻ</Form.Label>
                  <Form.Control
                    placeholder="Ghi chú hóa chất, số hiệu mẻ chạy, thông số kỹ thuật..."
                    value={batchNotes}
                    onChange={(e) => setBatchNotes(e.target.value)}
                  />
                </Col>
              </Row>
            </Card.Body>
          </Card>

          {/* Sơ đồ khay giếng (Well Plate Grid) */}
          <Row className="g-4 mb-4">
            {/* Khay giếng */}
            <Col lg={8}>
              <Card className="border-0 shadow-sm rounded-3 bg-white h-100">
                <Card.Header className="bg-white py-3 border-bottom d-flex justify-content-between align-items-center">
                  <h5 className="mb-0 fw-bold fs-6 text-dark d-flex align-items-center gap-2">
                    <FaMicroscope className="text-primary" />
                    <span>Sơ Đồ Giếng Chạy Máy (Well Plate Layout — {selectedAnalyzer.name})</span>
                  </h5>
                  <div className="d-flex gap-2 small">
                    <Badge bg="danger">A1/A2: Mẫu IQC</Badge>
                    <Badge bg="primary">Mẫu BN</Badge>
                    <Badge bg="warning" text="dark">STAT Cấp cứu</Badge>
                  </div>
                </Card.Header>

                <Card.Body className="p-2">
                  <div className="table-responsive">
                    <table className="table table-bordered text-center align-middle mb-0" style={{ tableLayout: 'fixed' }}>
                      <thead className="table-light">
                        <tr>
                          <th style={{ width: '40px' }}></th>
                          {cols.map(c => (
                            <th key={c} className="py-1 small">{c}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map(r => (
                          <tr key={r}>
                            <th className="table-light py-2 small fw-bold">{r}</th>
                            {cols.map(c => {
                              const coord = `${r}${c}`;
                              const isA1 = coord === 'A1';
                              const isA2 = coord === 'A2';
                              const sample = assignedWells[coord];
                              const isAssigned = Boolean(sample);
                              const isStat = sample?.priority === 'STAT';

                              return (
                                <td
                                  key={coord}
                                  className={`p-1 position-relative ${
                                    isA1 || isA2
                                      ? 'bg-danger-subtle'
                                      : isAssigned
                                      ? isStat
                                        ? 'bg-warning-subtle'
                                        : 'bg-primary-subtle'
                                      : 'bg-white'
                                  }`}
                                  style={{
                                    height: '52px',
                                    cursor: isA1 || isA2 ? 'not-allowed' : 'pointer',
                                    border: selectedWell === coord ? '2px solid #1E60E6' : undefined
                                  }}
                                  onClick={() => {
                                    if (!isA1 && !isA2) setSelectedWell(coord);
                                  }}
                                >
                                  {isA1 ? (
                                    <div className="small fw-bold text-danger">
                                      <div>IQC-1</div>
                                      <div style={{ fontSize: '0.62rem' }}>Normal</div>
                                    </div>
                                  ) : isA2 ? (
                                    <div className="small fw-bold text-danger">
                                      <div>IQC-2</div>
                                      <div style={{ fontSize: '0.62rem' }}>High</div>
                                    </div>
                                  ) : isAssigned ? (
                                    <div className="small text-truncate" title={sample.patientName}>
                                      <div className="fw-bold font-monospace" style={{ fontSize: '0.68rem' }}>
                                        {sample.barcode || sample.id}
                                      </div>
                                      <div className="text-dark text-truncate" style={{ fontSize: '0.62rem' }}>
                                        {sample.patientName}
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="text-muted opacity-50 small" style={{ fontSize: '0.68rem' }}>
                                      {coord}
                                    </div>
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="d-flex justify-content-between align-items-center mt-3 pt-3 border-top">
                    <span className="small text-muted">
                      Đã xếp: <strong className="text-primary">{Object.keys(assignedWells).length + 2}</strong> / {selectedAnalyzer.capacity} vị trí (Gồm 2 mẫu IQC bắt buộc)
                    </span>
                    <div className="d-flex gap-2">
                      <Button variant="outline-secondary" size="sm" onClick={() => setAssignedWells({})}>
                        Xóa tất cả mẫu trên khay
                      </Button>
                      <Button
                        variant="primary"
                        size="sm"
                        className="fw-semibold px-3 shadow-sm"
                        disabled={loading || Object.keys(assignedWells).length === 0}
                        onClick={handleCreateBatch}
                      >
                        {loading ? <Spinner size="sm" animation="border" /> : <FaCheckCircle className="me-1" />}
                        Xác Nhận Tạo Mẻ Xét Nghiệm
                      </Button>
                    </div>
                  </div>
                </Card.Body>
              </Card>
            </Col>

            {/* Danh sách mẫu chờ xếp vào giếng */}
            <Col lg={4}>
              <Card className="border-0 shadow-sm rounded-3 bg-white h-100">
                <Card.Header className="bg-white py-3 border-bottom d-flex justify-content-between align-items-center">
                  <h5 className="mb-0 fw-bold fs-6 text-dark d-flex align-items-center gap-1">
                    <FaClock className="text-warning" />
                    <span>Mẫu Chờ Xếp Khay ({safePendingSamples.length})</span>
                  </h5>
                  <Badge bg="info">Giếng chọn: {selectedWell}</Badge>
                </Card.Header>

                <Card.Body className="p-3" style={{ maxHeight: '480px', overflowY: 'auto' }}>
                  {safePendingSamples.length === 0 ? (
                    <div className="text-center py-2 text-muted small">
                      Không có mẫu bệnh phẩm nào đang chờ xếp khay cho chuyên khoa này.
                    </div>
                  ) : (
                    <div className="d-flex flex-column gap-2">
                      {safePendingSamples.map((sample) => {
                        const isPlaced = Object.values(assignedWells).some(a => a?.id === sample?.id || a?.barcode === sample?.barcode);
                        const isStat = sample?.priority === 'STAT';

                        return (
                          <div
                            key={sample.id || sample.barcode}
                            className={`p-2 rounded border small d-flex justify-content-between align-items-center ${
                              isPlaced ? 'bg-light opacity-50' : isStat ? 'border-danger bg-danger-subtle' : 'bg-white'
                            }`}
                          >
                            <div>
                              <div className="fw-bold font-monospace text-primary">
                                {sample.barcode || sample.id}
                                {isStat && <Badge bg="danger" className="ms-1">STAT</Badge>}
                              </div>
                              <div className="text-dark fw-medium">{sample.patientName}</div>
                              <div className="text-muted" style={{ fontSize: '0.72rem' }}>
                                {sample.testPackageName || sample.sampleType} &bull; {sample.volumeMl || 3} mL
                              </div>
                            </div>

                            <div>
                              {isPlaced ? (
                                <Badge bg="secondary">Đã xếp</Badge>
                              ) : (
                                <Button
                                  variant="primary"
                                  size="sm"
                                  className="px-2 py-0.5"
                                  style={{ fontSize: '0.72rem' }}
                                  onClick={() => assignSampleToWell(sample, selectedWell)}
                                >
                                  + Gán {selectedWell}
                                </Button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </div>
      )}

      {/* TAB 3: CHI TIẾT MẺ */}
      {activeTab === 'detail' && selectedBatch && (
        <Card className="border-0 shadow-sm rounded-3 bg-white">
          <Card.Header className="bg-white py-3 border-bottom d-flex justify-content-between align-items-center">
            <h5 className="mb-0 fw-bold fs-6 text-dark d-flex align-items-center gap-2">
              <FaInfoCircle className="text-primary" />
              <span>Chi Tiết Khay Mẻ: {selectedBatch.batchCode || selectedBatch.id} &mdash; {selectedBatch.analyzerName}</span>
            </h5>
            <Button variant="outline-secondary" size="sm" onClick={() => setActiveTab('list')}>
              <FaArrowLeft className="me-1" /> Quay lại danh sách
            </Button>
          </Card.Header>

          <Card.Body className="p-2">
            <Row className="g-3 mb-4">
              <Col md={3}>
                <div className="text-muted small">Trạng Thái Mẻ:</div>
                <Badge bg={selectedBatch.status === 'Completed' ? 'success' : 'primary'} className="fs-6 mt-1">
                  {selectedBatch.status}
                </Badge>
              </Col>
              <Col md={3}>
                <div className="text-muted small">Máy Phân Tích:</div>
                <div className="fw-bold text-dark mt-1">{selectedBatch.analyzerName}</div>
              </Col>
              <Col md={3}>
                <div className="text-muted small">Thời Gian Tạo:</div>
                <div className="fw-semibold text-dark mt-1">
                  {selectedBatch.createdAt ? new Date(selectedBatch.createdAt).toLocaleString('vi-VN') : '—'}
                </div>
              </Col>
              <Col md={3}>
                <div className="text-muted small">Ghi Chú Kỹ Thuật:</div>
                <div className="text-dark mt-1">{selectedBatch.notes || 'Không có ghi chú'}</div>
              </Col>
            </Row>

            <h6 className="fw-bold text-dark mb-3">Danh Sách Vị Trí Giếng Trong Mẻ ({Array.isArray(selectedBatch.positions) ? selectedBatch.positions.length : 0})</h6>
            <div className="table-responsive">
              <Table hover align="middle" className="mb-0 table-sm">
                <thead className="table-light small text-uppercase">
                  <tr>
                    <th>Tọa Độ Giếng</th>
                    <th>Loại Vị Trí</th>
                    <th>Mã Ống Mẫu / Lô QC</th>
                    <th>Bệnh Nhân / Cấp Độ IQC</th>
                    <th>Loại Xét Nghiệm</th>
                  </tr>
                </thead>
                <tbody>
                  {(Array.isArray(selectedBatch.positions) ? selectedBatch.positions : []).map((pos, idx) => (
                    <tr key={idx} className={pos.isIqcControl ? 'table-danger' : pos.isStat ? 'table-warning' : undefined}>
                      <td className="fw-bold font-monospace">{pos.coordinate}</td>
                      <td>
                        {pos.isIqcControl ? (
                          <Badge bg="danger">Mẫu Nội Kiểm IQC</Badge>
                        ) : pos.isStat ? (
                          <Badge bg="warning" text="dark">Mẫu Cấp Cứu STAT</Badge>
                        ) : (
                          <Badge bg="light" text="dark" className="border">Mẫu Bệnh Nhân</Badge>
                        )}
                      </td>
                      <td className="font-monospace text-primary">
                        {pos.isIqcControl ? pos.iqcLotNumber : pos.barcode || pos.sampleId}
                      </td>
                      <td className="fw-semibold text-dark">
                        {pos.isIqcControl ? pos.iqcControlLevel : pos.patientName || '—'}
                      </td>
                      <td className="small text-muted">{pos.testType || 'Xét nghiệm'}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          </Card.Body>
        </Card>
      )}
    </Container>
  );
}
