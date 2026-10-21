/** @file InventoryPage.jsx
 * @description UC56 inventory list and detail view, consistent with the existing clinical workspace.
 */
import React, { useEffect, useState } from 'react';
import { Alert, Badge, Breadcrumb, Button, Card, Col, Form, Modal, Row, Table } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { FaBoxOpen, FaEye, FaRedo, FaSearch } from 'react-icons/fa';
import { getInventory, getInventoryDetail, inventoryError } from '../api/inventoryApi';
import InventoryFormModal from '../components/InventoryFormModal';
import '../../../components/common/SkeletonProfile.css';

const defaults = { search: '', status: '', expiryFrom: '', expiryTo: '', page: 1, pageSize: 20 };
const expiryLabels = { AVAILABLE: 'Còn hạn ≥ 30 ngày', EXPIRING_SOON: 'Sắp hết hạn', EXPIRED: 'Đã hết hạn', UNKNOWN_EXPIRY: 'Chưa có hạn dùng' };
const quantity = (value) => new Intl.NumberFormat('vi-VN').format(value);
const date = (value) => value ? new Date(value).toLocaleDateString('vi-VN', { timeZone: 'UTC', day: '2-digit', month: '2-digit', year: 'numeric' }) : 'Chưa có';
const moment = (value) => value ? new Date(value).toLocaleString('vi-VN') : '—';
const money = (value) => value == null ? '—' : `${quantity(value)} đ`;
const movementLabels = { STOCK_IN: 'Nhập kho', STOCK_OUT: 'Xuất kho', ADJUSTMENT: 'Điều chỉnh' };

function ExpiryBadge({ item }) {
  return <Badge bg={item.expiryStatus === 'EXPIRED' ? 'danger' : item.expiryStatus === 'EXPIRING_SOON' ? 'warning' : item.expiryStatus === 'AVAILABLE' ? 'success' : 'secondary'}
    text={item.expiryStatus === 'EXPIRING_SOON' ? 'dark' : undefined}>{expiryLabels[item.expiryStatus] || item.expiryStatus}</Badge>;
}

/** Displays live inventory with management actions restricted by role; the server enforces authorization. */
export default function InventoryPage() {
  const [showCreate, setShowCreate] = useState(false);
  const [success, setSuccess] = useState('');
  const canManage = (() => {
    try {
      const user = JSON.parse(localStorage.getItem('bms_user') || sessionStorage.getItem('bms_user') || 'null');
      return ['ADMIN', 'ADMINISTRATOR', 'MANAGER', 'WAREHOUSESTAFF'].includes((user?.role || user?.roleName || '').trim().toUpperCase());
    } catch { return false; }
  })();
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
    // A closed or replaced detail view must not receive an earlier lot's response.
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
  return <div className="py-3">
    <Breadcrumb><Breadcrumb.Item linkAs={Link} linkProps={{ to: '/' }}>Trang Chủ</Breadcrumb.Item><Breadcrumb.Item active>Kho hóa chất</Breadcrumb.Item></Breadcrumb>
    <div className="d-flex flex-wrap justify-content-between gap-3 align-items-center mb-4">
      <div><h4 className="fw-bold mb-1"><FaBoxOpen className="text-primary me-2" />Tồn Kho Hóa Chất & Sinh Phẩm</h4><p className="text-muted mb-0">Theo dõi từng lô, mức tồn tối thiểu và hạn sử dụng.</p></div>
      <div className="d-flex gap-2">{canManage && <Button onClick={() => { setSuccess(''); setShowCreate(true); }}>Thêm lô hóa chất</Button>}<Button variant="outline-primary" disabled={loading} onClick={() => setRefresh((v) => v + 1)}><FaRedo className="me-2" />Làm mới</Button></div>
    </div>
    <Row className="g-3 mb-4">{[['Total', 'Số lô phù hợp', 'primary'], ['LowStock', 'Tồn thấp', 'warning'], ['ExpiringSoon', 'Sắp hết hạn', 'warning'], ['Expired', 'Đã hết hạn', 'danger']].map(([key, label, color]) =>
      <Col sm={6} xl={3} key={key}><Card className="border-0 shadow-sm h-100"><Card.Body><div className="text-muted small">{label}</div><div className={`fs-3 fw-bold text-${color}`}>{loading ? '…' : data?.summary?.[key[0].toLowerCase() + key.slice(1)] ?? '—'}</div></Card.Body></Card></Col>)}</Row>
    <Card className="border-0 shadow-sm mb-4"><Card.Body>
      <Row className="g-3 align-items-end">
        <Col lg={4}><Form.Label htmlFor="inventory-search"><FaSearch className="me-2" />Tìm kiếm</Form.Label><Form.Control id="inventory-search" value={search} maxLength={100} placeholder="Mã, tên hóa chất, số lô, hãng sản xuất" onChange={(e) => setSearch(e.target.value)} /></Col>
        <Col sm={6} lg={2}><Form.Label htmlFor="inventory-status">Cảnh báo</Form.Label><Form.Select id="inventory-status" value={filters.status} onChange={(e) => change('status', e.target.value)}><option value="">Tất cả</option><option value="LOW_STOCK">Tồn thấp</option>{Object.entries(expiryLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</Form.Select></Col>
        <Col sm={6} lg={2}><Form.Label htmlFor="expiry-from">Hạn dùng từ</Form.Label><Form.Control id="expiry-from" type="date" value={filters.expiryFrom} onChange={(e) => change('expiryFrom', e.target.value)} /></Col>
        <Col sm={6} lg={2}><Form.Label htmlFor="expiry-to">Hạn dùng đến</Form.Label><Form.Control id="expiry-to" type="date" value={filters.expiryTo} onChange={(e) => change('expiryTo', e.target.value)} /></Col>
        <Col sm={6} lg={2}><Button variant="outline-secondary" className="w-100" onClick={clear}>Xóa bộ lọc</Button></Col>
      </Row>
      <p className="small text-muted mt-3 mb-0">Tồn thấp khi số lượng ≤ mức tối thiểu. Sắp hết hạn khi còn dưới 30 ngày; số liệu cảnh báo tính trên toàn bộ kết quả lọc.</p>
    </Card.Body></Card>
    {success && <Alert variant="success" role="status" dismissible onClose={() => setSuccess('')}>{success}</Alert>}
    {invalidDates && <Alert variant="warning">Hạn dùng từ phải trước hoặc bằng hạn dùng đến.</Alert>}
    {error && <Alert variant="danger" role="alert">{error} <Button variant="outline-danger" size="sm" onClick={() => setRefresh((v) => v + 1)}>Thử lại</Button></Alert>}
    <Card className="border-0 shadow-sm"><Card.Body>
      <div className="d-flex justify-content-between mb-3"><h6 className="fw-bold mb-0">Danh sách lô hóa chất</h6><span className="small text-muted" role="status">{data?.total ?? 0} kết quả</span></div>
      {loading ? skeleton : data?.items.length ? <>
        <Table responsive hover className="align-middle"><thead className="table-light"><tr><th>Mã / Tên hóa chất</th><th>Số lô / Hãng</th><th className="text-end">Tồn / Tối thiểu</th><th>Hạn dùng</th><th className="text-center">Cảnh báo</th><th className="text-center">Chi tiết</th></tr></thead><tbody>
          {data.items.map((row) => <tr key={row.id}><td><div className="font-monospace text-primary">{row.code}</div><div className="fw-semibold">{row.name}</div></td><td><div>{row.lotNumber || '—'}</div><small className="text-muted">{row.manufacturer || '—'}</small></td><td className="text-end"><strong>{quantity(row.quantity)}</strong> / {quantity(row.minimumStock)}<div className="small text-muted">{row.unit}</div></td><td className="text-nowrap">{date(row.expiryDate)}</td><td className="text-center"><ExpiryBadge item={row} />{row.isLowStock && <div className="mt-1"><Badge bg="warning" text="dark">Tồn thấp</Badge></div>}</td><td className="text-center"><Button size="sm" variant="outline-primary" aria-label={`Xem lô ${row.lotNumber || row.code}`} onClick={() => setSelectedId(row.id)}><FaEye /></Button></td></tr>)}
        </tbody></Table>
        <div className="d-flex flex-wrap align-items-center justify-content-between gap-3"><Form.Select aria-label="Số lô mỗi trang" style={{ width: 150 }} value={filters.pageSize} onChange={(e) => change('pageSize', Number(e.target.value))}>{[20, 50, 100].map((n) => <option key={n} value={n}>{n} lô / trang</option>)}</Form.Select><div className="d-flex gap-3 align-items-center"><Button variant="outline-primary" size="sm" disabled={data.page <= 1} onClick={() => setFilters((v) => ({ ...v, page: v.page - 1 }))}>Trước</Button><span className="small">Trang {data.page}/{data.totalPages}</span><Button variant="outline-primary" size="sm" disabled={data.page >= data.totalPages} onClick={() => setFilters((v) => ({ ...v, page: v.page + 1 }))}>Sau</Button></div></div>
      </> : !error && !invalidDates && <div className="text-center text-muted py-5"><FaBoxOpen size={40} className="mb-3" /><h5>Không có lô hóa chất phù hợp</h5><p>Kho chưa có dữ liệu hoặc không có kết quả theo bộ lọc.</p><Button variant="outline-primary" onClick={clear}>Xóa bộ lọc</Button></div>}
    </Card.Body></Card>
    <Modal show={Boolean(selectedId)} onHide={() => setSelectedId(null)} size="xl" scrollable>
      <Modal.Header closeButton><Modal.Title className="h5">Chi tiết lô hóa chất</Modal.Title></Modal.Header><Modal.Body>
        {detailLoading ? skeleton : detailError ? <Alert variant="danger">{detailError} <Button size="sm" variant="outline-danger" onClick={() => setDetailRefresh((v) => v + 1)}>Thử lại</Button></Alert> : item && <>
          <h5 className="text-primary">{item.name}</h5><Row className="g-3 mb-4">{[['Mã hóa chất', item.code], ['Số lô', item.lotNumber], ['Hãng sản xuất', item.manufacturer], ['Tồn kho', `${quantity(item.quantity)} ${item.unit}`], ['Mức tối thiểu', `${quantity(item.minimumStock)} ${item.unit}`], ['Hạn dùng', date(item.expiryDate)]].map(([label, value]) => <Col md={4} key={label}><div className="small text-muted">{label}</div><div className="fw-semibold text-break">{value || '—'}</div></Col>)}</Row>
          <ExpiryBadge item={item} /> {item.isLowStock && <Badge bg="warning" text="dark">Tồn thấp</Badge>}
          {item.expiryStatus === 'EXPIRED' && <Alert variant="danger" className="mt-3">Lô đã hết hạn sử dụng. Không sử dụng cho xét nghiệm.</Alert>}
          <h6 className="fw-bold mt-4">Nhật ký quản lý lô</h6>
          {detail.changes?.length ? <Table responsive size="sm"><thead><tr><th>Thời gian</th><th>Thao tác / Người thực hiện</th><th className="text-end">Tồn trước → sau</th><th>Lý do</th></tr></thead><tbody>{detail.changes.map((entry, i) => <tr key={i}><td>{moment(entry.at)}</td><td>{entry.action}<div>{entry.actorName}</div></td><td className="text-end">{entry.beforeQuantity == null ? '—' : quantity(entry.beforeQuantity)} → {entry.afterQuantity == null ? '—' : quantity(entry.afterQuantity)}</td><td style={{ whiteSpace: 'pre-wrap' }}>{entry.reason}</td></tr>)}</tbody></Table> : <p className="small text-muted">Chưa có nhật ký quản lý cho dữ liệu cũ.</p>}
          <h6 className="fw-bold mt-4">Lịch sử nhập / xuất theo mã hóa chất</h6><p className="small text-muted">Giao dịch hiện có không lưu số lô; đây là lịch sử của mã {item.code}, không phải riêng lô này. Hiển thị {detail.transactions.length}/{detail.transactionCount} giao dịch mới nhất.</p>
          {detail.transactions.length ? <Table responsive size="sm"><thead><tr><th>Thời gian</th><th>Loại</th><th className="text-end">Số lượng</th><th className="text-end">Đơn giá</th><th>Đơn vị thực hiện</th></tr></thead><tbody>{detail.transactions.map((t, i) => <tr key={t.id || i}><td>{moment(t.timestamp)}</td><td>{movementLabels[t.type] || t.type}</td><td className="text-end">{quantity(t.quantity)} {item.unit}</td><td className="text-end">{money(t.unitPrice)}</td><td>{t.department || '—'}</td></tr>)}</tbody></Table> : <p className="text-muted">Chưa có lịch sử giao dịch.</p>}
        </>}
      </Modal.Body><Modal.Footer><Button variant="secondary" onClick={() => setSelectedId(null)}>Đóng</Button></Modal.Footer>
    </Modal>
    <InventoryFormModal show={showCreate} onHide={() => setShowCreate(false)} onSaved={(message) => {
      setShowCreate(false); setSuccess(message); setFilters((value) => ({ ...value, page: 1 })); setRefresh((value) => value + 1);
    }} />
  </div>;
}
