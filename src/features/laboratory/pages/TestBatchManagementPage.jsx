import React, { useState, useEffect } from 'react';
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

  // Active view: 'list' | 'create' | 'detail'
  const [activeTab, setActiveTab] = useState('list');
  const [selectedBatch, setSelectedBatch] = useState(null);

  // Form state for creating batch
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
      if (res.data) setBatches(res.data);
    } catch (err) {
      setError(err.message || 'Không thể tải danh sách mẻ chạy.');
    } finally {
      setLoading(false);
    }
  }

  async function loadPendingSamples(category) {
    try {
      const res = await getPendingSamples(category || selectedAnalyzer.category);
      if (res.data) setPendingSamples(res.data);
    } catch (err) {
      console.warn('Lỗi tải mẫu chờ xếp mẻ:', err);
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

  // Auto fill available pending samples sequentially starting from A3
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
    const unassignedSamples = pendingSamples.filter(s => 
      !Object.values(assignedWells).some(a => a.id === s.id || a.barcode === s.barcode)
    );

    // Sort: STAT emergencies first
    const sorted = [...unassignedSamples].sort((a, b) => {
      if (a.priority === 'STAT' && b.priority !== 'STAT') return -1;
      if (b.priority === 'STAT' && a.priority !== 'STAT') return 1;
      return 0;
    });

    let sIdx = 0;
    for (let i = 0; i < allWells.length && sIdx < sorted.length; i++) {
      newAssigned[allWells[i]] = sorted[sIdx];
      sIdx++;
    }

    setAssignedWells(prev => ({ ...prev, ...newAssigned }));
    setSuccessMsg(`Đã tự động điền ${sIdx} mẫu vào khay theo thứ tự ưu tiên ISO 15189.`);
    setTimeout(() => setSuccessMsg(null), 4000);
  };

  const handleCreateBatch = async () => {
    const wellEntries = Object.entries(assignedWells);
    if (wellEntries.length === 0) {
      alert('Vui lòng xếp ít nhất 1 mẫu bệnh phẩm vào khay mẻ xét nghiệm.');
      return;
    }

    const positions = [
      {
        coordinate: 'A1',
        isIqcControl: true,
        iqcControlLevel: 'Level 1 (Normal)',
        iqcLotNumber: iqcLotNumber
      },
      {
        coordinate: 'A2',
        isIqcControl: true,
        iqcControlLevel: 'Level 2 (Pathological High)',
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
    if (!window.confirm('CẢNH BÁO: Hủy mẻ chạy sẽ hoàn tác tất cả mẫu bệnh phẩm về trạng thái "Đã tiếp nhận" (SampleStatus.Received). Bạn có chắc chắn muốn hủy?')) {
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

  const rows = ['A','B','C','D','E','F','G','H'].slice(0, selectedAnalyzer.rows);
  const cols = Array.from({ length: selectedAnalyzer.cols }, (_, i) => i + 1);

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto', fontFamily: 'Inter, system-ui, sans-serif', color: '#1e293b' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', borderBottom: '1px solid #e2e8f0', paddingBottom: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#0f172a', margin: 0 }}>
              Quản lý Mẻ Xét nghiệm Máy Phân tích (Test Batches)
            </h1>
            <span style={{ backgroundColor: '#e0e7ff', color: '#4338ca', fontSize: '11px', fontWeight: '700', padding: '3px 8px', borderRadius: '12px', border: '1px solid #c7d2fe' }}>
              ISO 15189 COMPLIANT
            </span>
          </div>
          <p style={{ margin: '6px 0 0', color: '#64748b', fontSize: '14px' }}>
            Quy trình gom mẫu, sơ đồ giếng chạy máy (Well Plate Layout), kiểm soát mẫu nội kiểm IQC A1/A2 và hoàn tác an toàn.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={() => { setActiveTab('list'); setSelectedBatch(null); }}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              backgroundColor: activeTab === 'list' ? '#2563eb' : '#ffffff',
              color: activeTab === 'list' ? '#ffffff' : '#475569',
              fontWeight: '600',
              cursor: 'pointer',
              boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
            }}
          >
            📋 Danh sách Mẻ ({batches.length})
          </button>
          <button
            onClick={() => setActiveTab('create')}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: activeTab === 'create' ? '#1d4ed8' : '#059669',
              color: '#ffffff',
              fontWeight: '600',
              cursor: 'pointer',
              boxShadow: '0 2px 4px rgba(5,150,105,0.2)'
            }}
          >
            ➕ Tạo Mẻ Chạy Máy Mới
          </button>
        </div>
      </div>

      {/* Notifications */}
      {error && (
        <div style={{ padding: '12px 16px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', color: '#991b1b', marginBottom: '16px', display: 'flex', justifyContent: 'space-between' }}>
          <span>⚠️ {error}</span>
          <button onClick={() => setError(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#991b1b', fontWeight: 'bold' }}>✕</button>
        </div>
      )}
      {successMsg && (
        <div style={{ padding: '12px 16px', backgroundColor: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: '8px', color: '#065f46', marginBottom: '16px' }}>
          ✅ {successMsg}
        </div>
      )}

      {/* TAB 1: LIST BATCHES */}
      {activeTab === 'list' && (
        <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ fontSize: '16px', fontWeight: '600', margin: 0, color: '#334155' }}>
              Danh sách các mẻ xét nghiệm trong ca
            </h2>
            <button onClick={loadBatches} style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff', fontSize: '13px', cursor: 'pointer' }}>
              🔄 Làm mới
            </button>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
            <thead>
              <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>
                <th style={{ padding: '12px 16px' }}>Mã Mẻ (Batch Code)</th>
                <th style={{ padding: '12px 16px' }}>Máy Phân Tích</th>
                <th style={{ padding: '12px 16px' }}>Số Mẫu (Đầy/Sức Chứa)</th>
                <th style={{ padding: '12px 16px' }}>Trạng Thái</th>
                <th style={{ padding: '12px 16px' }}>Kỹ Thuật Viên</th>
                <th style={{ padding: '12px 16px' }}>Thời Gian Tạo</th>
                <th style={{ padding: '12px 16px', textAlign: 'center' }}>Thao Tác</th>
              </tr>
            </thead>
            <tbody>
              {batches.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: '36px', textAlign: 'center', color: '#94a3b8' }}>
                    Chưa có mẻ xét nghiệm nào. Nhấn "Tạo Mẻ Chạy Máy Mới" để bắt đầu xếp khay mẫu.
                  </td>
                </tr>
              ) : (
                batches.map((b) => (
                  <tr key={b.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px 16px', fontWeight: '700', color: '#1e40af' }}>
                      {b.batchCode}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ fontWeight: '600', color: '#1e293b' }}>{b.analyzerName}</div>
                      <div style={{ fontSize: '12px', color: '#64748b' }}>Phân loại: {b.testCategory}</div>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ fontWeight: '600' }}>{b.totalSamples}</span>
                      <span style={{ color: '#94a3b8' }}> / {b.trayCapacity} giếng</span>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{
                        display: 'inline-block',
                        padding: '4px 10px',
                        borderRadius: '12px',
                        fontSize: '12px',
                        fontWeight: '600',
                        backgroundColor:
                          b.status === 'Completed' ? '#dcfce7' :
                          b.status === 'Running' ? '#e0f2fe' :
                          b.status === 'Cancelled' ? '#fee2e2' : '#fef3c7',
                        color:
                          b.status === 'Completed' ? '#166534' :
                          b.status === 'Running' ? '#0369a1' :
                          b.status === 'Cancelled' ? '#991b1b' : '#92400e'
                      }}>
                        {b.status}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', color: '#475569' }}>
                      {b.createdByName || 'Tech KTV'}
                    </td>
                    <td style={{ padding: '12px 16px', color: '#64748b', fontSize: '13px' }}>
                      {new Date(b.createdAt).toLocaleString('vi-VN')}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                      <div style={{ display: 'inline-flex', gap: '8px' }}>
                        <button
                          onClick={() => { setSelectedBatch(b); setActiveTab('detail'); }}
                          style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff', cursor: 'pointer', fontSize: '12px', fontWeight: '600' }}
                        >
                          👁️ Sơ Đồ Giếng
                        </button>
                        {b.status === 'Pending' && (
                          <button
                            onClick={() => handleUpdateStatus(b.id, 'Running')}
                            style={{ padding: '6px 10px', borderRadius: '6px', border: 'none', backgroundColor: '#0284c7', color: '#ffffff', cursor: 'pointer', fontSize: '12px', fontWeight: '600' }}
                          >
                            ▶️ Nạp Máy Chạy
                          </button>
                        )}
                        {b.status === 'Running' && (
                          <button
                            onClick={() => handleUpdateStatus(b.id, 'Completed')}
                            style={{ padding: '6px 10px', borderRadius: '6px', border: 'none', backgroundColor: '#16a34a', color: '#ffffff', cursor: 'pointer', fontSize: '12px', fontWeight: '600' }}
                          >
                            ✅ Hoàn Tất
                          </button>
                        )}
                        {b.status !== 'Completed' && b.status !== 'Cancelled' && (
                          <button
                            onClick={() => handleCancelBatch(b.id)}
                            style={{ padding: '6px 10px', borderRadius: '6px', border: 'none', backgroundColor: '#ef4444', color: '#ffffff', cursor: 'pointer', fontSize: '12px', fontWeight: '600' }}
                          >
                            ❌ Hủy Mẻ
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 2: DETAIL SƠ ĐỒ GIẾNG CỦA MẺ */}
      {activeTab === 'detail' && selectedBatch && (
        <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <h2 style={{ fontSize: '20px', fontWeight: '700', margin: 0, color: '#0f172a' }}>
                  Sơ đồ Khay Giếng Mẻ: <span style={{ color: '#2563eb' }}>{selectedBatch.batchCode}</span>
                </h2>
                <span style={{
                  padding: '3px 10px',
                  borderRadius: '12px',
                  fontSize: '12px',
                  fontWeight: '700',
                  backgroundColor: selectedBatch.status === 'Completed' ? '#dcfce7' : selectedBatch.status === 'Running' ? '#e0f2fe' : '#fef3c7',
                  color: selectedBatch.status === 'Completed' ? '#166534' : selectedBatch.status === 'Running' ? '#0369a1' : '#92400e'
                }}>
                  {selectedBatch.status}
                </span>
              </div>
              <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '14px' }}>
                Máy: <strong>{selectedBatch.analyzerName}</strong> | Sức chứa: {selectedBatch.trayCapacity} giếng | Tổng ống mẫu nạp: {selectedBatch.totalSamples}
              </p>
            </div>
            <button
              onClick={() => setActiveTab('list')}
              style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#f8fafc', cursor: 'pointer', fontWeight: '600' }}
            >
              ← Quay Lại Danh Sách
            </button>
          </div>

          {/* Grid Layout View */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '8px', padding: '16px', backgroundColor: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0', marginBottom: '24px' }}>
            {(selectedBatch.positions || []).map((pos) => (
              <div
                key={pos.coordinate}
                style={{
                  minHeight: '80px',
                  padding: '8px',
                  borderRadius: '8px',
                  border: pos.isIqcControl ? '2px solid #8b5cf6' : pos.isStat ? '2px solid #ef4444' : '1px solid #cbd5e1',
                  backgroundColor: pos.isIqcControl ? '#f5f3ff' : pos.isStat ? '#fef2f2' : '#ffffff',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.04)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: '800', fontSize: '13px', color: pos.isIqcControl ? '#6d28d9' : '#1e293b' }}>
                    {pos.coordinate}
                  </span>
                  {pos.isIqcControl && (
                    <span style={{ fontSize: '10px', fontWeight: '700', color: '#6d28d9', backgroundColor: '#ede9fe', padding: '1px 4px', borderRadius: '4px' }}>
                      IQC
                    </span>
                  )}
                  {pos.isStat && (
                    <span style={{ fontSize: '10px', fontWeight: '700', color: '#dc2626', backgroundColor: '#fee2e2', padding: '1px 4px', borderRadius: '4px' }}>
                      STAT
                    </span>
                  )}
                </div>
                <div style={{ fontSize: '11px', color: '#334155', marginTop: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {pos.isIqcControl ? (pos.iqcControlLevel || 'Control Normal') : (pos.patientName || pos.barcode || 'Ống mẫu')}
                </div>
                <div style={{ fontSize: '10px', color: '#94a3b8' }}>
                  {pos.barcode || (pos.isIqcControl ? 'LOT IQC' : '')}
                </div>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: '16px', alignItems: 'center', fontSize: '13px', color: '#64748b', borderTop: '1px solid #e2e8f0', paddingTop: '16px' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '14px', height: '14px', backgroundColor: '#f5f3ff', border: '2px solid #8b5cf6', borderRadius: '3px' }} />
              <strong>Tím:</strong> Mẫu nội kiểm IQC (A1 Level 1, A2 Level 2)
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '14px', height: '14px', backgroundColor: '#fef2f2', border: '2px solid #ef4444', borderRadius: '3px' }} />
              <strong>Đỏ:</strong> Mẫu cấp cứu STAT ưu tiên
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '14px', height: '14px', backgroundColor: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '3px' }} />
              <strong>Trắng:</strong> Mẫu thường (Routine)
            </span>
          </div>
        </div>
      )}

      {/* TAB 3: CREATE NEW BATCH & INTERACTIVE WELL PLATE BUILDER */}
      {activeTab === 'create' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '24px' }}>
          {/* Left: Configuration & Well Plate Grid */}
          <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <h2 style={{ fontSize: '18px', fontWeight: '700', margin: '0 0 16px', color: '#0f172a' }}>
              Sơ Đồ Xếp Khay Mẫu Xét Nghiệm (Rack / Well Plate Builder)
            </h2>

            {/* Config bar */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '20px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>
                  Máy Phân Tích
                </label>
                <select
                  value={selectedAnalyzer.id}
                  onChange={(e) => {
                    const found = ANALYZERS.find(a => a.id === e.target.value);
                    if (found) handleSelectAnalyzer(found);
                  }}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }}
                >
                  {ANALYZERS.map(a => (
                    <option key={a.id} value={a.id}>{a.name} ({a.capacity} giếng)</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>
                  Số Lô Nội Kiểm (IQC Lot)
                </label>
                <input
                  type="text"
                  value={iqcLotNumber}
                  onChange={(e) => setIqcLotNumber(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>
                  Ghi chú vận hành
                </label>
                <input
                  type="text"
                  value={batchNotes}
                  onChange={(e) => setBatchNotes(e.target.value)}
                  placeholder="Ghi chú ca chạy..."
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }}
                />
              </div>
            </div>

            {/* Actions Bar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', backgroundColor: '#f8fafc', padding: '10px 16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '13px', color: '#475569' }}>
                Đang chọn giếng: <strong style={{ color: '#2563eb', fontSize: '15px' }}>{selectedWell}</strong> |
                Đã xếp: <strong>{Object.keys(assignedWells).length + 2}</strong> / {selectedAnalyzer.capacity} giếng (gồm 2 mẫu IQC)
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={handleAutoFill}
                  style={{ padding: '6px 14px', borderRadius: '6px', border: 'none', backgroundColor: '#3b82f6', color: '#ffffff', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}
                >
                  ⚡ Tự Động Điền Khay (Ưu tiên STAT)
                </button>
                <button
                  type="button"
                  onClick={() => setAssignedWells({})}
                  style={{ padding: '6px 14px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff', color: '#64748b', fontSize: '13px', cursor: 'pointer' }}
                >
                  Dọn Khay Trống
                </button>
              </div>
            </div>

            {/* Interactive Grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${selectedAnalyzer.cols}, 1fr)`,
              gap: '6px',
              padding: '16px',
              backgroundColor: '#f1f5f9',
              borderRadius: '10px',
              border: '1px solid #cbd5e1'
            }}>
              {rows.map(r => 
                cols.map(c => {
                  const coord = `${r}${c}`;
                  const isIqc = coord === 'A1' || coord === 'A2';
                  const assigned = assignedWells[coord];
                  const isCurrent = selectedWell === coord;

                  return (
                    <div
                      key={coord}
                      onClick={() => !isIqc && setSelectedWell(coord)}
                      style={{
                        minHeight: '68px',
                        padding: '6px',
                        borderRadius: '6px',
                        cursor: isIqc ? 'not-allowed' : 'pointer',
                        border: isCurrent ? '2px solid #2563eb' : isIqc ? '2px solid #8b5cf6' : assigned?.priority === 'STAT' ? '2px solid #ef4444' : '1px solid #cbd5e1',
                        backgroundColor: isIqc ? '#f5f3ff' : assigned?.priority === 'STAT' ? '#fef2f2' : assigned ? '#ffffff' : '#f8fafc',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        position: 'relative',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '11px', fontWeight: '800', color: isIqc ? '#6d28d9' : '#334155' }}>
                          {coord}
                        </span>
                        {isIqc && (
                          <span style={{ fontSize: '9px', fontWeight: '800', color: '#6d28d9', backgroundColor: '#ede9fe', padding: '1px 3px', borderRadius: '3px' }}>
                            {coord === 'A1' ? 'L1' : 'L2'}
                          </span>
                        )}
                        {assigned?.priority === 'STAT' && (
                          <span style={{ fontSize: '9px', fontWeight: '800', color: '#dc2626', backgroundColor: '#fee2e2', padding: '1px 3px', borderRadius: '3px' }}>
                            STAT
                          </span>
                        )}
                        {assigned && (
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); removeSampleFromWell(coord); }}
                            style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '11px', padding: '0 2px' }}
                            title="Xóa mẫu khỏi giếng này"
                          >
                            ✕
                          </button>
                        )}
                      </div>

                      <div style={{ fontSize: '10px', color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {isIqc ? (coord === 'A1' ? 'IQC Level 1' : 'IQC Level 2') : assigned ? (assigned.patientName || assigned.barcode) : 'Trống'}
                      </div>
                      <div style={{ fontSize: '9px', color: '#94a3b8' }}>
                        {assigned?.barcode || (isIqc ? iqcLotNumber : '')}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button
                type="button"
                onClick={() => setActiveTab('list')}
                style={{ padding: '10px 20px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff', cursor: 'pointer', fontWeight: '600' }}
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={handleCreateBatch}
                style={{ padding: '10px 24px', borderRadius: '8px', border: 'none', backgroundColor: '#10b981', color: '#ffffff', fontSize: '14px', fontWeight: '700', cursor: 'pointer', boxShadow: '0 2px 4px rgba(16,185,129,0.2)' }}
              >
                {loading ? 'Đang lưu mẻ...' : '🚀 Xác Nhận Nạp Mẻ Xét Nghiệm'}
              </button>
            </div>
          </div>

          {/* Right: Pending Samples Queue */}
          <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', height: 'fit-content' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: '700', margin: 0, color: '#0f172a' }}>
                Ống Mẫu Chờ Xếp ({pendingSamples.length})
              </h3>
              <button onClick={() => loadPendingSamples()} style={{ background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer', fontSize: '12px' }}>
                🔄 Tải lại
              </button>
            </div>
            <p style={{ fontSize: '12px', color: '#64748b', margin: '0 0 12px' }}>
              Nhấp vào mẫu bên dưới để gán vào giếng đang chọn <strong>({selectedWell})</strong>:
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '600px', overflowY: 'auto' }}>
              {pendingSamples.length === 0 ? (
                <div style={{ padding: '20px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>
                  Không còn mẫu nào đang chờ xếp cho danh mục này.
                </div>
              ) : (
                pendingSamples.map(sample => {
                  const isAssigned = Object.values(assignedWells).some(a => a.id === sample.id || a.barcode === sample.barcode);
                  const isStat = sample.priority === 'STAT';

                  return (
                    <div
                      key={sample.id || sample._id}
                      onClick={() => !isAssigned && assignSampleToWell(sample, selectedWell)}
                      style={{
                        padding: '10px',
                        borderRadius: '8px',
                        border: isStat ? '1px solid #fca5a5' : '1px solid #e2e8f0',
                        backgroundColor: isAssigned ? '#f1f5f9' : isStat ? '#fff1f2' : '#ffffff',
                        opacity: isAssigned ? 0.6 : 1,
                        cursor: isAssigned ? 'default' : 'pointer',
                        transition: 'transform 0.1s ease',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                        <span style={{ fontWeight: '700', fontSize: '13px', color: '#0f172a' }}>
                          {sample.barcode || 'SAMP-xxx'}
                        </span>
                        {isStat && (
                          <span style={{ fontSize: '10px', fontWeight: '700', color: '#dc2626', backgroundColor: '#fee2e2', padding: '1px 5px', borderRadius: '4px' }}>
                            STAT
                          </span>
                        )}
                        {isAssigned && (
                          <span style={{ fontSize: '10px', fontWeight: '700', color: '#16a34a' }}>
                            ✓ Đã gán
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '12px', color: '#334155', fontWeight: '500' }}>
                        {sample.patientName || 'Bệnh nhân'}
                      </div>
                      <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                        Loại mẫu: {sample.sampleType || selectedAnalyzer.category}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
