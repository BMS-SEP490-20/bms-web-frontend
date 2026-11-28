/**
 * @file LookupBiochemicalResultsPage.jsx
 * @description Clinical Laboratory Results Worklist Table (UC75).
 * Clean full-width list table with KPI filters, inline abnormal summary badges,
 * and a dedicated "Duyệt kết quả" / "Xem kết quả" action button opening the full-page review screen.
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, Table, Badge, Button, Form, Alert, Spinner } from 'react-bootstrap';
import {
  Search as LucideSearch,
  Barcode,
  CheckCircle2,
  AlertTriangle,
  Bell,
  RefreshCw,
  X as LucideX,
  ClipboardCheck,
  Eye,
  Clock,
  Layers,
  FlaskConical
} from 'lucide-react';
import TablePagination, { usePagination } from '../../../components/ui/TablePagination';
import { formatTubeColorVi } from '../../../shared/workflow/labConsumables';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { lookupTestResults } from '../api/biochemicalResultsApi';
import { ROLES, getStoredUser, hasRole } from '../../../constants/roles';
import api from '../../../config/api';
import './LookupBiochemicalResultsPage.css';

const getParams = (r) => {
  if (!r) return [];
  if (Array.isArray(r.parameters) && r.parameters.length > 0) return r.parameters;
  if (Array.isArray(r.items) && r.items.length > 0) return r.items;
  return [];
};

const isResultApproved = (r) => {
  const st = String(r?.status || r?.validationStatus || r?.approvalStatus || '').toUpperCase();
  return st.includes('APPROVED') || st.includes('SIGNED') || st === '3' || r?.isOfficialRelease === true;
};

const classifyParam = (p) => {
  const f = String(p?.flag || '').toUpperCase();
  const isPanic = f.includes('PANIC') || f.includes('CRIT') || f === '3';
  const isHigh = !isPanic && (f.includes('HIGH') || f === 'H' || f === '2');
  const isLow = !isPanic && (f.includes('LOW') || f === 'L' || f === '1');
  const isAbnormal = isPanic || isHigh || isLow || Boolean(p?.isAbnormal);
  return { isPanic, isHigh, isLow, isAbnormal };
};

const getAbnormalStats = (r) => {
  const params = getParams(r);
  if (params.length > 0) {
    const abnormalCodes = [];
    let panicCount = 0;
    params.forEach((p) => {
      const c = classifyParam(p);
      if (c.isPanic) panicCount += 1;
      if (c.isAbnormal) abnormalCodes.push(p.code || p.abbreviation || p.name || '?');
    });
    if (r?.isPanic || r?.hasPanic) panicCount = Math.max(panicCount, 1);
    return {
      total: params.length,
      abnormalCount: abnormalCodes.length,
      panicCount,
      abnormalCodes
    };
  }
  const total = Number(r?.totalParameters || 0);
  const abnormalCount = Number(r?.abnormalCount || 0);
  const panicCount = Number(r?.panicCount || (r?.isPanic || r?.hasPanic ? 1 : 0));
  const abnormalCodes = Array.isArray(r?.abnormalCodes) ? r.abnormalCodes : [];
  return { total, abnormalCount, panicCount, abnormalCodes };
};

const isResultAbnormalOrPanic = (r) => {
  const { abnormalCount, panicCount } = getAbnormalStats(r);
  return panicCount > 0 || abnormalCount > 0;
};

const formatTimeVi = (val) => {
  if (!val) return '—';
  const d = new Date(val);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
};

export default function LookupBiochemicalResultsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const currentUser = getStoredUser();
  const canNotify = hasRole(currentUser, ROLES.LAB, ROLES.MANAGER);
  const canApprove = hasRole(currentUser, ROLES.DOCTOR);

  const initialQuery =
    searchParams.get('barcode') ||
    searchParams.get('sampleId') ||
    searchParams.get('patientId') ||
    searchParams.get('search') ||
    '';

  const [searchKeyword, setSearchKeyword] = useState(initialQuery);
  const [statusFilter, setStatusFilter] = useState(initialQuery ? 'ALL' : 'ALL');
  const [recentResults, setRecentResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const loadResults = useCallback(async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const [res, samplesRes] = await Promise.all([
        lookupTestResults({}),
        canNotify
          ? api.get('/laboratory/samples/queue', { params: { page: 1, pageSize: 100 } }).catch(() => null)
          : Promise.resolve(null)
      ]);
      const items = Array.isArray(res?.data) ? res.data : [];
      const rawSamples = samplesRes?.data?.data?.items || samplesRes?.data?.data || [];

      const sampleMap = new Map();
      if (Array.isArray(rawSamples)) {
        rawSamples.forEach((s) => {
          if (s.id) sampleMap.set(String(s.id).toLowerCase(), s);
          if (s.barcode) sampleMap.set(String(s.barcode).toLowerCase(), s);
        });
      }

      const enriched = items.map((r) => {
        const sKey = String(r.barcode || r.sampleId || '').toLowerCase();
        const smp = sampleMap.get(sKey) || null;
        const cleanBarcode =
          r.barcode && !String(r.barcode).includes('-4')
            ? r.barcode
            : smp?.barcode || r.barcode || r.sampleId || r.id;
        const cleanPkg = r.packageName || smp?.testPackageName || r.packageId || 'Xét nghiệm Huyết học & Sinh hóa';
        const cleanPatientName =
          r.patientName && r.patientName !== 'Bệnh nhân'
            ? r.patientName
            : smp?.patientName || r.patientId || 'Bệnh nhân';

        return {
          ...r,
          barcode: cleanBarcode,
          packageName: cleanPkg,
          patientName: cleanPatientName,
          displayTime: r.approvedAt || r.reviewedAt || r.updatedAt || r.createdAt || smp?.completedAt || smp?.collectedAt || null
        };
      });

      setRecentResults(enriched);
    } catch (err) {
      setErrorMsg(err?.response?.data?.message || err?.message || 'Không thể tải danh sách kết quả xét nghiệm.');
    } finally {
      setLoading(false);
    }
  }, [canNotify]);

  useEffect(() => {
    loadResults();
  }, [loadResults]);

  const counts = useMemo(() => {
    const all = recentResults.length;
    const approved = recentResults.filter(isResultApproved).length;
    const pending = all - approved;
    const abnormal = recentResults.filter(isResultAbnormalOrPanic).length;
    return { all, pending, abnormal, approved };
  }, [recentResults]);

  const filteredWorklist = useMemo(() => {
    const kw = searchKeyword.trim().toLowerCase();
    const filtered = recentResults.filter((r) => {
      if (statusFilter === 'PENDING' && isResultApproved(r)) return false;
      if (statusFilter === 'APPROVED' && !isResultApproved(r)) return false;
      if (statusFilter === 'ABNORMAL' && !isResultAbnormalOrPanic(r)) return false;
      if (!kw) return true;
      return (
        String(r.id || '').toLowerCase().includes(kw) ||
        String(r.barcode || '').toLowerCase().includes(kw) ||
        String(r.sampleId || '').toLowerCase().includes(kw) ||
        String(r.patientName || '').toLowerCase().includes(kw) ||
        String(r.patientId || '').toLowerCase().includes(kw) ||
        String(r.packageName || '').toLowerCase().includes(kw)
      );
    });

    return [...filtered].sort((a, b) => {
      const aAppr = isResultApproved(a) ? 1 : 0;
      const bAppr = isResultApproved(b) ? 1 : 0;
      if (aAppr !== bAppr) return aAppr - bAppr;
      const aSt = getAbnormalStats(a);
      const bSt = getAbnormalStats(b);
      if (aSt.panicCount !== bSt.panicCount) return bSt.panicCount - aSt.panicCount;
      if (aSt.abnormalCount !== bSt.abnormalCount) return bSt.abnormalCount - aSt.abnormalCount;
      return String(b.id || '').localeCompare(String(a.id || ''));
    });
  }, [recentResults, statusFilter, searchKeyword]);

  const worklistPag = usePagination(filteredWorklist, 10);

  const openReviewPage = (r) => {
    const targetId = r?.id || r?.testResultId || r?.barcode || r?.sampleId;
    if (!targetId) return;
    navigate(`/laboratory/biochemical-results/${encodeURIComponent(targetId)}`, {
      state: { previewResult: r }
    });
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    const term = searchKeyword.trim();
    if (term) {
      setSearchParams({ search: term }, { replace: true });
    } else {
      setSearchParams({}, { replace: true });
    }
  };

  return (
    <div className="w-100 py-1">

      <div className="bms-page-header-card mb-3">
        <div className="bms-page-header-content flex-column align-items-start">
          <div className="bms-page-title-row">
            <h1 className="bms-page-title">Duyệt kết quả xét nghiệm</h1>
          </div>
          <p className="text-muted small m-0 mt-1">
            Danh sách kết quả xét nghiệm từ Phòng Lab gửi sang. Bấm <strong>Duyệt kết quả</strong> để mở trang xem chi tiết chỉ số và phê duyệt.
          </p>
        </div>
        <div className="bms-page-actions">
          <Button
            variant="outline-secondary"
            size="sm"
            className="rounded-pill px-3 text-nowrap"
            onClick={loadResults}
            disabled={loading}
          >
            <RefreshCw className={loading ? 'fa-spin me-1' : 'me-1'} size={13} /> Làm mới
          </Button>
          {canNotify && (
            <Button
              size="sm"
              className="rounded-pill px-3 fw-semibold text-white text-nowrap"
              style={{ backgroundColor: '#1E60E6', borderColor: '#1E60E6' }}
              onClick={() => navigate('/laboratory/notifications')}
            >
              <Bell className="me-1" size={13} /> Thông báo
            </Button>
          )}
        </div>
      </div>

      <div className="bms-res-kpi-grid mb-3">
        <button
          type="button"
          onClick={() => setStatusFilter('ALL')}
          className={`bms-res-kpi-card ${statusFilter === 'ALL' ? 'is-active' : ''}`}
        >
          <div>
            <div className="bms-res-kpi-label">Tổng hồ sơ xét nghiệm</div>
            <div className="bms-res-kpi-value">{counts.all}</div>
          </div>
          <div className="bms-res-kpi-icon" style={{ background: '#EEF4FD', color: '#1E60E6' }}>
            <Layers size={18} />
          </div>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter('PENDING')}
          className={`bms-res-kpi-card ${statusFilter === 'PENDING' ? 'is-active' : ''}`}
        >
          <div>
            <div className="bms-res-kpi-label">Chờ bác sĩ duyệt</div>
            <div className="bms-res-kpi-value" style={{ color: counts.pending > 0 ? '#B45309' : '#0F172A' }}>
              {counts.pending}
            </div>
          </div>
          <div className="bms-res-kpi-icon" style={{ background: '#FEF3C7', color: '#D97706' }}>
            <Clock size={18} />
          </div>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter('ABNORMAL')}
          className={`bms-res-kpi-card ${statusFilter === 'ABNORMAL' ? 'is-active' : ''}`}
        >
          <div>
            <div className="bms-res-kpi-label">Có chỉ số bất thường / PANIC</div>
            <div className="bms-res-kpi-value" style={{ color: counts.abnormal > 0 ? '#DC2626' : '#0F172A' }}>
              {counts.abnormal}
            </div>
          </div>
          <div className="bms-res-kpi-icon" style={{ background: '#FEE2E2', color: '#DC2626' }}>
            <AlertTriangle size={18} />
          </div>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter('APPROVED')}
          className={`bms-res-kpi-card ${statusFilter === 'APPROVED' ? 'is-active' : ''}`}
        >
          <div>
            <div className="bms-res-kpi-label">Đã duyệt &amp; phát hành</div>
            <div className="bms-res-kpi-value" style={{ color: '#059669' }}>{counts.approved}</div>
          </div>
          <div className="bms-res-kpi-icon" style={{ background: '#ECFDF5', color: '#059669' }}>
            <CheckCircle2 size={18} />
          </div>
        </button>
      </div>

      <div className="bms-filter-bar mb-3 flex-wrap">
        <Form onSubmit={handleSearchSubmit} className="d-flex align-items-center gap-2 flex-grow-1" style={{ minWidth: '280px' }}>
          <div className="bms-search-input-pill flex-grow-1">
            <Barcode className="bms-search-icon" size="1em" />
            <input
              type="text"
              placeholder="Tìm mã ống mẫu (SMP-...), mã kết quả (TRE-...), tên hoặc mã bệnh nhân (PAT-...)..."
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
            />
            {searchKeyword && (
              <button
                type="button"
                className="bms-search-clear"
                onClick={() => {
                  setSearchKeyword('');
                  setSearchParams({}, { replace: true });
                }}
              >
                <LucideX size={12} />
              </button>
            )}
          </div>
          <Button
            type="submit"
            size="sm"
            className="rounded-pill px-3 fw-semibold text-white text-nowrap"
            style={{ backgroundColor: '#1E60E6', borderColor: '#1E60E6' }}
          >
            <LucideSearch className="me-1" size="1em" /> Tìm kiếm
          </Button>
        </Form>

        <div className="d-flex align-items-center gap-1.5 flex-wrap">
          {[
            { id: 'ALL', label: `Tất cả (${counts.all})` },
            { id: 'PENDING', label: `Chờ duyệt (${counts.pending})` },
            { id: 'ABNORMAL', label: `Bất thường (${counts.abnormal})` },
            { id: 'APPROVED', label: `Đã duyệt (${counts.approved})` }
          ].map((tab) => {
            const active = statusFilter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusFilter(tab.id)}
                className="btn btn-sm rounded-pill px-3 fw-semibold"
                style={{
                  fontSize: '0.78rem',
                  backgroundColor: active ? '#1E60E6' : '#EEF2F6',
                  color: active ? '#FFFFFF' : '#475569',
                  border: 'none'
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {errorMsg && (
        <Alert variant="danger" dismissible onClose={() => setErrorMsg('')} className="py-2 mb-3 rounded-3 small">
          <AlertTriangle className="me-2" size={15} />
          {errorMsg}
        </Alert>
      )}

      <Card className="border-0 rounded-4 overflow-hidden bg-white" style={{ border: '1px solid #E2E8F0' }}>
        <Card.Header className="bg-white py-3 px-4 border-bottom d-flex justify-content-between align-items-center flex-wrap gap-2">
          <div className="d-flex align-items-center gap-2">
            <FlaskConical size={16} className="text-primary" />
            <h6 className="fw-bold text-dark mb-0">Danh sách kết quả xét nghiệm từ Phòng Lab</h6>
          </div>
          <Badge bg="light" text="dark" className="border rounded-pill px-3 py-1.5 fw-semibold">
            Hiển thị {filteredWorklist.length} / {recentResults.length} hồ sơ
          </Badge>
        </Card.Header>

        <div className="table-responsive">
          <Table hover className="mb-0 align-middle">
            <thead className="table-light small text-uppercase text-muted">
              <tr>
                <th className="ps-4" style={{ width: '19%' }}>Mã Kết Quả / Ống Mẫu</th>
                <th style={{ width: '16%' }}>Bệnh Nhân</th>
                <th style={{ width: '20%' }}>Gói / Nhóm Xét Nghiệm</th>
                <th style={{ width: '18%' }}>Đánh Giá Chỉ Số</th>
                <th style={{ width: '13%' }}>Trạng Thái</th>
                <th style={{ width: '14%' }}>Thời Gian</th>
                <th className="text-end pe-4" style={{ width: '150px' }}>Thao Tác</th>
              </tr>
            </thead>
            <tbody>
              {loading && recentResults.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-5 text-muted small">
                    <Spinner animation="border" size="sm" className="me-2" />
                    Đang tải danh sách kết quả xét nghiệm...
                  </td>
                </tr>
              ) : filteredWorklist.length > 0 ? (
                worklistPag.paginatedItems.map((r, idx) => {
                  const approved = isResultApproved(r);
                  const stats = getAbnormalStats(r);
                  const previewCodes = stats.abnormalCodes.slice(0, 3).join(', ');
                  const moreCodes = stats.abnormalCodes.length > 3 ? ` +${stats.abnormalCodes.length - 3}` : '';

                  return (
                    <tr key={r.id || idx} className={stats.panicCount > 0 && !approved ? 'table-danger' : undefined}>
                      <td className="ps-4 py-3">
                        <div className="d-flex align-items-center gap-1.5 flex-wrap">
                          <span className="fw-bold text-primary font-monospace small">{r.id}</span>
                          {Number(r.analysisRun) > 1 && (
                            <Badge bg="secondary-subtle" text="secondary" className="rounded-pill px-2" style={{ fontSize: '0.68rem' }}>
                              Lần #{r.analysisRun}
                            </Badge>
                          )}
                        </div>
                        <div className="text-muted small mt-0.5">
                          Ống: <code className="text-dark fw-semibold">{r.barcode || r.sampleId}</code>
                        </div>
                      </td>

                      <td className="py-3">
                        <div className="fw-semibold text-dark">{r.patientName}</div>
                        <div className="text-muted small font-monospace">{r.patientId}</div>
                      </td>

                      <td className="py-3">
                        <div className="fw-medium text-dark small text-truncate" style={{ maxWidth: '240px' }} title={r.packageName}>
                          {r.packageName}
                        </div>
                        <div className="text-muted" style={{ fontSize: '0.74rem' }}>
                          {formatTubeColorVi(r.tubeColor || 'EDTA')}
                        </div>
                      </td>

                      <td className="py-3">
                        {stats.total === 0 ? (
                          <span className="text-muted small">Chưa có chỉ số</span>
                        ) : stats.panicCount > 0 ? (
                          <div>
                            <Badge bg="danger" className="rounded-pill px-2.5 py-1 fw-semibold">
                              PANIC · {stats.abnormalCount}/{stats.total} bất thường
                            </Badge>
                            {previewCodes && (
                              <div className="text-danger small font-monospace mt-0.5 fw-semibold">
                                {previewCodes}{moreCodes}
                              </div>
                            )}
                          </div>
                        ) : stats.abnormalCount > 0 ? (
                          <div>
                            <Badge bg="warning-subtle" text="warning-emphasis" className="border border-warning-subtle rounded-pill px-2.5 py-1 fw-semibold">
                              {stats.abnormalCount}/{stats.total} chỉ số bất thường
                            </Badge>
                            {previewCodes && (
                              <div className="text-warning-emphasis small font-monospace mt-0.5">
                                {previewCodes}{moreCodes}
                              </div>
                            )}
                          </div>
                        ) : (
                          <Badge bg="success-subtle" text="success" className="border border-success-subtle rounded-pill px-2.5 py-1 fw-medium">
                            {stats.total}/{stats.total} bình thường
                          </Badge>
                        )}
                      </td>

                      <td className="py-3">
                        {approved ? (
                          <Badge bg="success-subtle" text="success" className="border border-success-subtle rounded-pill px-2.5 py-1 fw-semibold">
                            Đã duyệt
                          </Badge>
                        ) : (
                          <Badge bg="warning-subtle" text="warning-emphasis" className="border border-warning-subtle rounded-pill px-2.5 py-1 fw-semibold">
                            Chờ bác sĩ duyệt
                          </Badge>
                        )}
                      </td>

                      <td className="py-3 text-muted small text-nowrap">
                        {formatTimeVi(r.displayTime)}
                      </td>

                      <td className="text-end pe-4 py-3">
                        {!approved && canApprove ? (
                          <Button
                            size="sm"
                            className="rounded-pill px-3 py-1.5 fw-semibold text-white text-nowrap d-inline-flex align-items-center gap-1.5"
                            style={{ backgroundColor: '#1E60E6', borderColor: '#1E60E6' }}
                            onClick={() => openReviewPage(r)}
                          >
                            <ClipboardCheck size={14} />
                            <span>Duyệt kết quả</span>
                          </Button>
                        ) : (
                          <Button
                            variant="outline-primary"
                            size="sm"
                            className="rounded-pill px-3 py-1.5 fw-semibold text-nowrap d-inline-flex align-items-center gap-1.5"
                            onClick={() => openReviewPage(r)}
                          >
                            <Eye size={14} />
                            <span>{approved ? 'Xem kết quả' : 'Xem chi tiết'}</span>
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="text-center py-5 text-muted small">
                    Không có hồ sơ kết quả xét nghiệm nào khớp với bộ lọc hiện tại.
                  </td>
                </tr>
              )}
            </tbody>
          </Table>
        </div>

        <TablePagination
          page={worklistPag.page}
          totalPages={worklistPag.totalPages}
          totalItems={worklistPag.totalItems}
          pageSize={worklistPag.pageSize}
          onPageChange={worklistPag.setPage}
          onPageSizeChange={worklistPag.setPageSize}
          itemLabel="hồ sơ kết quả"
        />
      </Card>
    </div>
  );
}
