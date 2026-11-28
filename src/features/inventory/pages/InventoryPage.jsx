/** @file InventoryPage.jsx
 * @description UC56 inventory list and detail view, consistent with the existing clinical workspace.
 */
import React, { useEffect, useState } from 'react';
import { Alert, Badge, Button, Col, Form, Modal, Row, Table } from 'react-bootstrap';
import { ArrowRight, Package, Clock, AlertTriangle, Eye, Plus, RotateCw, Search, X as LucideX, XCircle } from 'lucide-react';
import { getInventory, getInventoryDetail, inventoryError } from '../api/inventoryApi';
import InventoryFormModal from '../components/InventoryFormModal';
import DeleteInventoryModal from '../components/DeleteInventoryModal';
import '../../../components/common/SkeletonProfile.css';

import { ROLES, hasRole, getStoredUser } from '../../../constants/roles';
const defaults = { search: '', status: '', expiryFrom: '', expiryTo: '', page: 1, pageSize: 20 };
const expiryLabels = { AVAILABLE: 'Còn hạn ≥ 30 ngày', EXPIRING_SOON: 'Sắp hết hạn', EXPIRED: 'Đã hết hạn', UNKNOWN_EXPIRY: 'Chưa có hạn dùng' };
const quantity = (value) => new Intl.NumberFormat('vi-VN').format(value);
const date = (value) => value ? new Date(value).toLocaleDateString('vi-VN', { timeZone: 'UTC', day: '2-digit', month: '2-digit', year: 'numeric' }) : 'Chưa có';
const moment = (value) => value ? new Date(value).toLocaleString('vi-VN') : '—';
const money = (value) => value == null ? '—' : `${quantity(value)} đ`;
const movementLabels = {
  STOCK_IN: 'Nhập kho',
  STOCK_OUT: 'Xuất kho',
  ADJUSTMENT: 'Điều chỉnh',
  CONSUME_TEST_RUN: 'Tiêu hao xét nghiệm',
  CONSUME_LAB_WORKFLOW: 'Xuất tiêu hao Lab',
  CREATE: 'Tạo lô mới',
  UPDATE: 'Cập nhật lô',
  DELETE: 'Xóa lô'
};

const formatActor = (name) => {
  if (!name) return 'Hệ thống';
  return /^[0-9a-f]{24}$/i.test(String(name).trim()) ? 'KTV Phòng Lab' : name;
};

const formatCompactDateTime = (value) => {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
};

function ExpiryBadge({ item }) {
  return <Badge pill bg={item.expiryStatus === 'EXPIRED' ? 'danger' : item.expiryStatus === 'EXPIRING_SOON' ? 'warning' : item.expiryStatus === 'AVAILABLE' ? 'success' : 'secondary'}
    text={item.expiryStatus === 'EXPIRING_SOON' ? 'dark' : undefined} className="px-2 py-1">{expiryLabels[item.expiryStatus] || item.expiryStatus}</Badge>;
}

/** Displays live inventory with management actions restricted by role; the server enforces authorization. */
export default function InventoryPage() {
  const [showCreate, setShowCreate] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [deleteItem, setDeleteItem] = useState(null);
  const [success, setSuccess] = useState('');

  const canManage = hasRole(getStoredUser(), ROLES.ADMIN);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState(defaults);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refresh, setRefresh] = useState(0);
  const [selectedId, setSelectedId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailError, setDetailError] = useState('');
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailRefresh, setDetailRefresh] = useState(0);
  const [detailTab, setDetailTab] = useState('changes');
  const invalidDates = filters.expiryFrom && filters.expiryTo && filters.expiryFrom > filters.expiryTo;

  useEffect(() => {
    const timer = setTimeout(() => setFilters((current) => current.search === search.trim() ? current : { ...current, search: search.trim(), page: 1 }), 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    const controller = new AbortController();
    setError('');
    if (invalidDates) { setLoading(false); setData(null); return () => controller.abort(); }
    setLoading(true);
    const params = Object.fromEntries(Object.entries(filters).filter(([, value]) => value !== ''));
    getInventory(params, controller.signal).then((result) => {
      if (!controller.signal.aborted) setData(result);
    }).catch((err) => {
      if (!controller.signal.aborted) { setData(null); setError(inventoryError(err)); }
    }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [filters, refresh, invalidDates]);

  useEffect(() => {
    const controller = new AbortController();
    setDetail(null); setDetailError('');
    if (!selectedId) return () => controller.abort();
    setDetailLoading(true);

    getInventoryDetail(selectedId, controller.signal).then((result) => {
      if (!controller.signal.aborted) setDetail(result);
    }).catch((err) => { if (!controller.signal.aborted) setDetailError(inventoryError(err)); })
      .finally(() => { if (!controller.signal.aborted) setDetailLoading(false); });
    return () => controller.abort();
  }, [selectedId, detailRefresh]);

  const change = (key, value) => setFilters((current) => ({ ...current, [key]: value, page: 1 }));
  const clear = () => { setSearch(''); setFilters({ ...defaults }); };
  const skeleton = <div aria-label="Đang tải dữ liệu" aria-busy="true">{[1, 2, 3, 4].map((n) => <div key={n} className="bms-skeleton mb-3" style={{ height: 38 }} />)}</div>;
  const item = detail?.item;
  const summaryValue = (key) => data?.summary?.[key[0].toLowerCase() + key.slice(1)];
  const hasActiveFilters = search !== '' || filters.status !== '' || filters.expiryFrom !== '' || filters.expiryTo !== '';

  return <div className="w-100 py-1">
    <div className="bms-page-header-card mb-4">
      <div className="bms-page-header-content flex-column align-items-start">
        <div className="bms-page-title-row">
          <h1 className="bms-page-title">Quản Lý Kho Hóa Chất &amp; Vật Tư Tiêu Hao</h1>
        </div>
        <p className="text-muted small m-0 mt-1">
          Theo dõi tồn kho hóa chất, vật tư xét nghiệm và cảnh báo hạn sử dụng theo lô
        </p>
      </div>
      <div className="bms-page-actions">
        <Button variant="outline-primary" size="sm" className="rounded-pill px-3 py-2 fw-semibold d-flex align-items-center gap-2" disabled={loading} onClick={() => setRefresh((v) => v + 1)}>
          <RotateCw size={12} /><span>Làm mới</span>
        </Button>
        {canManage && (
          <Button size="sm" className="rounded-pill px-3 py-2 fw-semibold d-flex align-items-center gap-2" style={{ backgroundColor: '#1E60E6', borderColor: '#1E60E6' }} onClick={() => { setSuccess(''); setShowCreate(true); }}>
            <Plus size={12} /><span>Thêm lô</span>
          </Button>
        )}
      </div>
    </div>

    <Row className="g-3 mb-4">
      <Col xs={12} sm={6} xl={3}>
        <div className="bms-kpi-quad-card">
          <div>
            <h6 className="bms-kpi-label">Số Lô Phù Hợp</h6>
            <div className="bms-kpi-value text-primary">{loading ? '…' : summaryValue('Total') ?? '—'}</div>
            <div className="bms-kpi-sub text-muted">Tổng lô hóa chất đang theo dõi</div>
          </div>
          <div className="bms-kpi-icon-badge bms-kpi-icon-blue"><Package  size="1em"/></div>
        </div>
      </Col>
      <Col xs={12} sm={6} xl={3}>
        <div className="bms-kpi-quad-card">
          <div>
            <h6 className="bms-kpi-label">Tồn Thấp</h6>
            <div className="bms-kpi-value" style={{ color: '#B45309' }}>{loading ? '…' : summaryValue('LowStock') ?? '—'}</div>
            <div className="bms-kpi-sub text-muted">Không vượt định mức tối thiểu</div>
          </div>
          <div className="bms-kpi-icon-badge bms-kpi-icon-amber"><AlertTriangle  size="1em"/></div>
        </div>
      </Col>
      <Col xs={12} sm={6} xl={3}>
        <div className="bms-kpi-quad-card">
          <div>
            <h6 className="bms-kpi-label">Sắp Hết Hạn</h6>
            <div className="bms-kpi-value" style={{ color: '#B45309' }}>{loading ? '…' : summaryValue('ExpiringSoon') ?? '—'}</div>
            <div className="bms-kpi-sub text-muted">Còn hạn dưới 30 ngày</div>
          </div>
          <div className="bms-kpi-icon-badge bms-kpi-icon-purple"><Clock  size="1em"/></div>
        </div>
      </Col>
      <Col xs={12} sm={6} xl={3}>
        <div className="bms-kpi-quad-card">
          <div>
            <h6 className="bms-kpi-label">Đã Hết Hạn</h6>
            <div className="bms-kpi-value text-danger">{loading ? '…' : summaryValue('Expired') ?? '—'}</div>
            <div className="bms-kpi-sub text-muted">Cần cô lập hoặc thanh lý</div>
          </div>
          <div className="bms-kpi-icon-badge bms-kpi-icon-rose"><XCircle  size="1em"/></div>
        </div>
      </Col>
    </Row>

    <div className="bms-filter-bar mb-3">
      <div className="bms-search-input-pill">
        <Search className="bms-search-icon"  size="1em"/>
        <input
          id="inventory-search"
          type="text"
          value={search}
          maxLength={100}
          placeholder="Tìm mã, tên hóa chất, số lô, hãng sản xuất..."
          onChange={(e) => setSearch(e.target.value)}
        />
        {search && (
          <button type="button" className="bms-search-clear" onClick={() => setSearch('')} title="Xóa tìm kiếm">
            <LucideX size={12} />
          </button>
        )}
      </div>

      <Form.Select id="inventory-status" value={filters.status} onChange={(e) => change('status', e.target.value)} style={{ width: 'auto' }}>
        <option value="">Tất cả cảnh báo</option>
        <option value="LOW_STOCK">Tồn thấp</option>
        {Object.entries(expiryLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
      </Form.Select>

      <Form.Control id="expiry-from" type="date" value={filters.expiryFrom} onChange={(e) => change('expiryFrom', e.target.value)} title="Hạn dùng từ" style={{ width: 'auto' }} />
      <Form.Control id="expiry-to" type="date" value={filters.expiryTo} onChange={(e) => change('expiryTo', e.target.value)} title="Hạn dùng đến" style={{ width: 'auto' }} />

      {hasActiveFilters && (
        <Button variant="outline-secondary" size="sm" className="rounded-pill px-3 text-nowrap" onClick={clear}>
          Đặt lại
        </Button>
      )}

      <span className="bms-filter-meta" role="status">
        Hiển thị <strong>{data?.total ?? 0}</strong> lô
      </span>
    </div>

    {success && <Alert variant="success" role="status" dismissible onClose={() => setSuccess('')} className="rounded-3">{success}</Alert>}
    {invalidDates && <Alert variant="warning" className="rounded-3">Hạn dùng từ phải trước hoặc bằng hạn dùng đến.</Alert>}
    {error && <Alert variant="danger" role="alert" className="rounded-3">{error} <Button variant="outline-danger" size="sm" className="rounded-pill ms-2" onClick={() => setRefresh((v) => v + 1)}>Thử lại</Button></Alert>}
    <section className="bms-table-standalone-section">
      <div className="bms-table-standalone-header"><h2 className="bms-table-standalone-title">Danh sách lô hóa chất</h2><span className="small text-muted" role="status">{data?.total ?? 0} kết quả</span></div>
      <div className="bms-table-standalone-body">
      {loading ? skeleton : data?.items.length ? <>
        <Table responsive hover className="align-middle mb-0"><thead><tr><th>Mã / Tên hóa chất</th><th>Số lô / Hãng</th><th className="text-end">Tồn / Tối thiểu</th><th>Hạn dùng</th><th className="text-center">Cảnh báo</th><th className="text-end pe-4">Chi tiết</th></tr></thead><tbody>
          {data.items.map((row) => <tr key={row.id}><td><div className="font-monospace fw-semibold" style={{ color: '#1E60E6' }}>{row.code}</div><div className="fw-semibold">{row.name}</div></td><td><div>{row.lotNumber || '—'}</div><small className="text-muted">{row.manufacturer || '—'}</small></td><td className="text-end"><strong style={{ fontVariantNumeric: 'tabular-nums' }}>{quantity(row.quantity)}</strong> / <span style={{ fontVariantNumeric: 'tabular-nums' }}>{quantity(row.minimumStock)}</span><div className="small text-muted">{row.unit}</div></td><td className="text-nowrap" style={{ fontVariantNumeric: 'tabular-nums' }}>{date(row.expiryDate)}</td><td className="text-center"><ExpiryBadge item={row} />{row.isLowStock && <div className="mt-1"><Badge pill bg="warning" text="dark" className="px-2">Tồn thấp</Badge></div>}</td><td className="text-end pe-4"><Button size="sm" variant="outline-primary" className="rounded-pill text-nowrap" aria-label={`Xem lô ${row.lotNumber || row.code}`} onClick={() => setSelectedId(row.id)}><Eye className="me-1"  size="1em"/>Xem</Button></td></tr>)}
        </tbody></Table>
        <div className="d-flex flex-wrap align-items-center justify-content-between gap-3"><Form.Select aria-label="Số lô mỗi trang" className="rounded-3" style={{ width: 150 }} value={filters.pageSize} onChange={(e) => change('pageSize', Number(e.target.value))}>{[20, 50, 100].map((n) => <option key={n} value={n}>{n} lô / trang</option>)}</Form.Select><div className="d-flex gap-3 align-items-center"><Button variant="outline-primary" size="sm" className="rounded-pill px-3" disabled={data.page <= 1} onClick={() => setFilters((v) => ({ ...v, page: v.page - 1 }))}>Trước</Button><span className="small">Trang {data.page}/{data.totalPages}</span><Button variant="outline-primary" size="sm" className="rounded-pill px-3" disabled={data.page >= data.totalPages} onClick={() => setFilters((v) => ({ ...v, page: v.page + 1 }))}>Sau</Button></div></div>
      </> : !error && !invalidDates && <div className="text-center text-muted py-4"><Package size={36} className="mb-3" style={{ color: '#1E60E6' }} /><h5>Không có lô hóa chất phù hợp</h5><p className="small">Kho chưa có dữ liệu hoặc không có kết quả theo bộ lọc.</p><Button variant="outline-primary" className="rounded-pill px-3" onClick={clear}>Xóa bộ lọc</Button></div>}
      </div>
    </section>
    <Modal show={Boolean(selectedId)} onHide={() => { setSelectedId(null); setDetailTab('changes'); }} size="lg" centered scrollable>
      <Modal.Header closeButton style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', padding: '14px 20px' }}>
        <div className="d-flex align-items-center gap-2 flex-wrap">
          <Modal.Title className="h6 fw-bold text-dark mb-0">Chi tiết lô vật tư &amp; hóa chất</Modal.Title>
          {item && <ExpiryBadge item={item} />}
          {item?.isLowStock && <Badge pill bg="warning" text="dark" className="px-2 py-1">Tồn thấp</Badge>}
        </div>
      </Modal.Header>
      <Modal.Body style={{ padding: '18px 20px' }}>
        {detailLoading ? skeleton : detailError ? (
          <Alert variant="danger" className="rounded-3 small mb-0">
            {detailError}{' '}
            <Button size="sm" variant="outline-danger" className="rounded-pill ms-2" onClick={() => setDetailRefresh((v) => v + 1)}>
              Thử lại
            </Button>
          </Alert>
        ) : item && (
          <div className="d-flex flex-column gap-3">

            <div className="p-3 rounded-4 border" style={{ background: '#F8FAFC', borderColor: '#E2E8F0' }}>
              <div className="d-flex align-items-start justify-content-between gap-2 flex-wrap mb-3">
                <div>
                  <h5 className="fw-bold text-dark mb-1" style={{ fontSize: '1.05rem' }}>{item.name}</h5>
                  <div className="d-flex align-items-center gap-2 flex-wrap small">
                    <span className="badge bg-primary-subtle text-primary border border-primary-subtle font-monospace px-2 py-1 rounded-pill">
                      {item.code}
                    </span>
                    <span className="badge bg-white text-dark border font-monospace px-2 py-1 rounded-pill">
                      Lô: {item.lotNumber || '—'}
                    </span>
                  </div>
                </div>
              </div>

              <Row className="g-2">
                {[
                  ['Tồn kho hiện tại', `${quantity(item.quantity)} ${item.unit}`, item.isLowStock ? '#B45309' : '#1E60E6'],
                  ['Mức tối thiểu', `${quantity(item.minimumStock)} ${item.unit}`, '#0F172A'],
                  ['Hạn sử dụng', date(item.expiryDate), item.expiryStatus === 'EXPIRED' ? '#DC2626' : '#0F172A'],
                  ['Hãng sản xuất', item.manufacturer || '—', '#334155']
                ].map(([label, value, color]) => (
                  <Col xs={6} md={3} key={label}>
                    <div className="p-2.5 rounded-3 bg-white border h-100" style={{ borderColor: '#E2E8F0' }}>
                      <div className="text-muted" style={{ fontSize: '0.73rem', fontWeight: 600 }}>{label}</div>
                      <div className="fw-bold mt-0.5 text-truncate" style={{ color, fontSize: '0.92rem' }} title={String(value)}>
                        {value}
                      </div>
                    </div>
                  </Col>
                ))}
              </Row>
            </div>

            {item.expiryStatus === 'EXPIRED' && (
              <Alert variant="danger" className="py-2 px-3 mb-0 rounded-3 small fw-medium">
                Lô đã hết hạn sử dụng. Không sử dụng cho xét nghiệm.
              </Alert>
            )}

            <div>
              <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-2">
                <div className="d-inline-flex p-1 rounded-pill" style={{ background: '#F1F5F9', gap: '4px' }}>
                  <button
                    type="button"
                    onClick={() => setDetailTab('changes')}
                    className="btn btn-sm rounded-pill px-3 fw-semibold"
                    style={{
                      fontSize: '0.78rem',
                      border: 'none',
                      background: detailTab === 'changes' ? '#FFFFFF' : 'transparent',
                      color: detailTab === 'changes' ? '#1E60E6' : '#475569'
                    }}
                  >
                    Nhật ký biến động lô ({detail.changes?.length || 0})
                  </button>
                  <button
                    type="button"
                    onClick={() => setDetailTab('transactions')}
                    className="btn btn-sm rounded-pill px-3 fw-semibold"
                    style={{
                      fontSize: '0.78rem',
                      border: 'none',
                      background: detailTab === 'transactions' ? '#FFFFFF' : 'transparent',
                      color: detailTab === 'transactions' ? '#1E60E6' : '#475569'
                    }}
                  >
                    Lịch sử xuất / nhập mã {item.code} ({detail.transactions?.length || 0})
                  </button>
                </div>
              </div>

              <div className="rounded-4 border overflow-hidden bg-white" style={{ borderColor: '#E2E8F0' }}>
                {detailTab === 'changes' ? (
                  detail.changes?.length ? (
                    <Table hover size="sm" className="mb-0 align-middle" style={{ tableLayout: 'fixed', width: '100%' }}>
                      <thead style={{ background: '#F8FAFC' }}>
                        <tr className="small text-muted text-uppercase" style={{ fontSize: '0.72rem' }}>
                          <th className="ps-3 py-2" style={{ width: '128px' }}>Thời gian</th>
                          <th className="py-2" style={{ width: '165px' }}>Thao tác</th>
                          <th className="py-2 text-center" style={{ width: '100px' }}>Tồn kho</th>
                          <th className="pe-3 py-2">Chi tiết / Lý do</th>
                        </tr>
                      </thead>
                      <tbody className="small">
                        {detail.changes.map((entry, i) => {
                          const decreased = entry.beforeQuantity != null && entry.afterQuantity != null && entry.afterQuantity < entry.beforeQuantity;
                          return (
                            <tr key={i}>
                              <td className="ps-3 py-2 text-muted text-nowrap" style={{ fontSize: '0.76rem' }}>
                                {formatCompactDateTime(entry.at)}
                              </td>
                              <td className="py-2">
                                <div className="fw-semibold text-dark" style={{ fontSize: '0.8rem' }}>
                                  {movementLabels[entry.action] || entry.action}
                                </div>
                                <div className="text-muted text-truncate" style={{ fontSize: '0.74rem' }} title={formatActor(entry.actorName)}>
                                  {formatActor(entry.actorName)}
                                </div>
                              </td>
                              <td className="py-2 text-center text-nowrap font-monospace fw-semibold">
                                <span className="text-muted">{entry.beforeQuantity == null ? '—' : quantity(entry.beforeQuantity)}</span>
                                <ArrowRight size={11} className="mx-1 text-muted" />
                                <span className={decreased ? 'text-danger' : 'text-success'}>
                                  {entry.afterQuantity == null ? '—' : quantity(entry.afterQuantity)}
                                </span>
                              </td>
                              <td className="pe-3 py-2 text-secondary" style={{ wordBreak: 'break-word', lineHeight: 1.4 }}>
                                {entry.reason || '—'}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </Table>
                  ) : (
                    <div className="text-center py-4 text-muted small">Chưa có nhật ký biến động cho lô này.</div>
                  )
                ) : (
                  detail.transactions?.length ? (
                    <Table hover size="sm" className="mb-0 align-middle" style={{ tableLayout: 'fixed', width: '100%' }}>
                      <thead style={{ background: '#F8FAFC' }}>
                        <tr className="small text-muted text-uppercase" style={{ fontSize: '0.72rem' }}>
                          <th className="ps-3 py-2" style={{ width: '132px' }}>Thời gian</th>
                          <th className="py-2" style={{ width: '105px' }}>Loại</th>
                          <th className="py-2 text-end" style={{ width: '90px' }}>Số lượng</th>
                          <th className="pe-3 py-2">Đơn vị / Ghi chú thực hiện</th>
                        </tr>
                      </thead>
                      <tbody className="small">
                        {detail.transactions.map((t, i) => (
                          <tr key={t.id || i}>
                            <td className="ps-3 py-2 text-muted text-nowrap" style={{ fontSize: '0.76rem' }}>
                              {formatCompactDateTime(t.timestamp)}
                            </td>
                            <td className="py-2">
                              <Badge
                                bg={t.type === 'STOCK_IN' ? 'success-subtle' : 'primary-subtle'}
                                text={t.type === 'STOCK_IN' ? 'success' : 'primary'}
                                className="rounded-pill px-2 py-0.5 fw-semibold"
                              >
                                {movementLabels[t.type] || t.type}
                              </Badge>
                            </td>
                            <td className="py-2 text-end text-nowrap fw-semibold font-monospace">
                              {quantity(t.quantity)} {item.unit}
                            </td>
                            <td className="pe-3 py-2 text-secondary" style={{ wordBreak: 'break-word', lineHeight: 1.4 }}>
                              {t.department || '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  ) : (
                    <div className="text-center py-4 text-muted small">Chưa có lịch sử xuất / nhập kho.</div>
                  )
                )}
              </div>
            </div>
          </div>
        )}
      </Modal.Body>
      <Modal.Footer style={{ background: '#F8FAFC', borderTop: '1px solid #E2E8F0', padding: '12px 20px' }}>
        {canManage && item && !detailLoading && (
          <>
            <span className="small text-muted me-auto">Chỉ xóa được lô khi tồn kho bằng 0.</span>
            <Button variant="outline-danger" size="sm" className="rounded-pill px-3 fw-semibold" disabled={item.quantity !== 0} onClick={() => { setDeleteItem(item); setSelectedId(null); }}>
              Xóa lô
            </Button>
            <Button size="sm" className="rounded-pill px-3 fw-semibold text-white" style={{ backgroundColor: '#1E60E6', borderColor: '#1E60E6' }} onClick={() => { setEditItem(item); setSelectedId(null); }}>
              Chỉnh sửa lô
            </Button>
          </>
        )}
        <Button variant="outline-secondary" size="sm" className="rounded-pill px-3 fw-semibold" onClick={() => { setSelectedId(null); setDetailTab('changes'); }}>
          Đóng
        </Button>
      </Modal.Footer>
    </Modal>
    <InventoryFormModal show={showCreate || Boolean(editItem)} item={editItem} onHide={() => { setShowCreate(false); setEditItem(null); }} onSaved={(message) => {
      setShowCreate(false); setEditItem(null); setDetailRefresh((value) => value + 1); setSuccess(message); setFilters((value) => ({ ...value, page: 1 })); setRefresh((value) => value + 1);
    }} />
    <DeleteInventoryModal item={deleteItem} onHide={() => setDeleteItem(null)} onDeleted={() => {
      setDeleteItem(null); setSuccess('Đã xóa lô khỏi kho hoạt động; lịch sử được giữ nguyên.');
      setFilters((value) => ({ ...value, page: 1 })); setRefresh((value) => value + 1);
    }} />
  </div>;
}
