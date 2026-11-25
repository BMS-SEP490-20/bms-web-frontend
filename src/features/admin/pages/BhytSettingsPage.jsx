/**
 * @file BhytSettingsPage.jsx
 * @description Quản lý danh mục mã nhóm đối tượng BHYT & chính sách miễn giảm ưu tiên (`/api/billing/settings`).
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Badge, Button, Col, Form, Modal, Row, Spinner, Table } from 'react-bootstrap';
import { CheckCircle2, Edit3, Percent, Plus, RefreshCw, Search, ShieldCheck, X as LucideX } from 'lucide-react';
import { billingSettingsApi } from '../api/billingSettingsApi';
import { ROLES, getStoredUser, hasRole } from '../../../constants/roles';

function extractErr(err, fallback) {
  return err?.response?.data?.message || err?.response?.data?.title || err?.message || fallback;
}

export default function BhytSettingsPage() {
  const user = useMemo(() => {
    try { return getStoredUser(); } catch { return null; }
  }, []);
  const isManager = useMemo(() => hasRole(user, ROLES.MANAGER), [user]);

  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Add/Edit group modal
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formCode, setFormCode] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formActive, setFormActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState('');

  // Manager priority-discount settings
  const [discountPercent, setDiscountPercent] = useState('0');
  const [discountMax, setDiscountMax] = useState('');
  const [discountMeta, setDiscountMeta] = useState(null);
  const [savingDiscount, setSavingDiscount] = useState(false);

  const loadData = useCallback(async (signal) => {
    setLoading(true);
    setError('');
    try {
      const list = await billingSettingsApi.getBhytGroups(signal);
      if (!signal?.aborted) setGroups(list);
      if (isManager) {
        try {
          const pd = await billingSettingsApi.getPriorityDiscount(signal);
          if (!signal?.aborted && pd) {
            setDiscountPercent(String(pd.percent ?? 0));
            setDiscountMax(pd.maxAmount != null ? String(pd.maxAmount) : '');
            setDiscountMeta(pd);
          }
        } catch {
          // Manager-only block; non-fatal if unavailable
        }
      }
    } catch (err) {
      if (!signal?.aborted) setError(extractErr(err, 'Không thể tải danh mục mã nhóm BHYT.'));
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [isManager]);

  useEffect(() => {
    const controller = new AbortController();
    loadData(controller.signal);
    return () => controller.abort();
  }, [loadData]);

  const filteredGroups = useMemo(() => {
    const q = search.trim().toLowerCase();
    return groups.filter((g) => {
      if (statusFilter === 'ACTIVE' && !g.isActive) return false;
      if (statusFilter === 'INACTIVE' && g.isActive) return false;
      if (!q) return true;
      return `${g.code} ${g.description || ''}`.toLowerCase().includes(q);
    });
  }, [groups, search, statusFilter]);

  const stats = useMemo(() => {
    const total = groups.length;
    const active = groups.filter((g) => g.isActive).length;
    const seeded = groups.filter((g) => g.seeded).length;
    return { total, active, inactive: total - active, seeded };
  }, [groups]);

  const openCreateModal = () => {
    setIsEditing(false);
    setFormCode('');
    setFormDesc('');
    setFormActive(true);
    setModalError('');
    setShowModal(true);
  };

  const openEditModal = (row) => {
    setIsEditing(true);
    setFormCode(row.code || '');
    setFormDesc(row.description || '');
    setFormActive(Boolean(row.isActive));
    setModalError('');
    setShowModal(true);
  };

  const handleSaveGroup = async (e) => {
    e.preventDefault();
    const cleanCode = formCode.trim().toUpperCase();
    if (!/^[A-Z]{2}$/.test(cleanCode)) {
      setModalError('Mã nhóm đối tượng BHYT phải gồm đúng 2 chữ cái viết hoa (VD: DN, GD, TE, HN).');
      return;
    }
    setSaving(true);
    setModalError('');
    try {
      await billingSettingsApi.upsertBhytGroup(cleanCode, {
        description: formDesc.trim(),
        isActive: formActive,
      });
      setShowModal(false);
      setSuccess(`Đã lưu mã nhóm BHYT "${cleanCode}" thành công.`);
      await loadData();
    } catch (err) {
      setModalError(extractErr(err, 'Không thể lưu mã nhóm BHYT.'));
    } finally {
      setSaving(false);
    }
  };

  const handleQuickToggle = async (row) => {
    setError('');
    setSuccess('');
    try {
      await billingSettingsApi.upsertBhytGroup(row.code, {
        description: row.description,
        isActive: !row.isActive,
      });
      setSuccess(`Đã ${!row.isActive ? 'kích hoạt' : 'tạm ngưng'} mã nhóm BHYT "${row.code}".`);
      await loadData();
    } catch (err) {
      setError(extractErr(err, `Không thể cập nhật trạng thái mã nhóm "${row.code}".`));
    }
  };

  const handleSavePriorityDiscount = async (e) => {
    e.preventDefault();
    const pct = Number(discountPercent);
    const maxVal = discountMax.trim() === '' ? null : Number(discountMax);
    if (Number.isNaN(pct) || pct < 0 || pct > 100) {
      setError('Tỷ lệ giảm ưu tiên phải nằm trong khoảng 0 – 100%.');
      return;
    }
    if (maxVal !== null && (Number.isNaN(maxVal) || maxVal < 0)) {
      setError('Mức giảm tối đa không được âm.');
      return;
    }
    setSavingDiscount(true);
    setError('');
    setSuccess('');
    try {
      await billingSettingsApi.setPriorityDiscount({ percent: pct, maxAmount: maxVal });
      setSuccess('Đã cập nhật chính sách miễn giảm đối tượng ưu tiên.');
      await loadData();
    } catch (err) {
      setError(extractErr(err, 'Không thể cập nhật chính sách miễn giảm ưu tiên.'));
    } finally {
      setSavingDiscount(false);
    }
  };

  return (
    <div className="w-100 py-1">
      <div className="bms-page-header-card mb-4">
        <div className="bms-page-header-content">
          <div className="bms-page-title-row">
            <h1 className="bms-page-title">Cấu Hình Danh Mục Nhóm Mã BHYT</h1>
          </div>
          <p className="text-muted small m-0 mt-1">
            Quản lý mã nhóm đối tượng Bảo hiểm Y tế được áp dụng chiết khấu khi tính viện phí và ghi nhận nhật ký Audit
          </p>
        </div>
        <div className="bms-page-actions">
          <Button
            variant="outline-secondary"
            size="sm"
            className="rounded-pill px-3 d-flex align-items-center gap-1.5"
            onClick={() => loadData()}
            disabled={loading}
          >
            <RefreshCw size={13} /> Làm mới
          </Button>
          <Button
            size="sm"
            className="rounded-pill px-3 text-white d-flex align-items-center gap-1.5"
            style={{ backgroundColor: '#1E60E6', borderColor: '#1E60E6' }}
            onClick={openCreateModal}
          >
            <Plus size={14} /> Thêm mã nhóm BHYT
          </Button>
        </div>
      </div>

      <div className="bms-kpi-quad mb-4">
        <div className="bms-kpi-quad-card">
          <div>
            <h6 className="bms-kpi-label">Tổng Mã Nhóm</h6>
            <div className="bms-kpi-value">{stats.total}</div>
            <div className="bms-kpi-sub text-muted">Danh mục mã đối tượng BHYT</div>
          </div>
          <div className="bms-kpi-icon-badge bms-kpi-icon-blue"><ShieldCheck size={18} /></div>
        </div>
        <div className="bms-kpi-quad-card">
          <div>
            <h6 className="bms-kpi-label">Đang Áp Dụng</h6>
            <div className="bms-kpi-value text-success">{stats.active}</div>
            <div className="bms-kpi-sub text-muted">Hợp lệ khi tính viện phí</div>
          </div>
          <div className="bms-kpi-icon-badge bms-kpi-icon-green"><CheckCircle2 size={18} /></div>
        </div>
        <div className="bms-kpi-quad-card">
          <div>
            <h6 className="bms-kpi-label">Đang Tạm Ngưng</h6>
            <div className="bms-kpi-value text-secondary">{stats.inactive}</div>
            <div className="bms-kpi-sub text-muted">Không tính chiết khấu BHYT</div>
          </div>
          <div className="bms-kpi-icon-badge bms-kpi-icon-amber"><LucideX size={18} /></div>
        </div>
        <div className="bms-kpi-quad-card">
          <div>
            <h6 className="bms-kpi-label">Mã Chuẩn Mặc Định</h6>
            <div className="bms-kpi-value" style={{ color: '#1E60E6' }}>{stats.seeded}</div>
            <div className="bms-kpi-sub text-muted">Nhóm mã khởi tạo theo BYT</div>
          </div>
          <div className="bms-kpi-icon-badge bms-kpi-icon-purple"><Percent size={18} /></div>
        </div>
      </div>

      {success && (
        <Alert variant="success" dismissible onClose={() => setSuccess('')} className="rounded-3 mb-3">
          {success}
        </Alert>
      )}
      {error && (
        <Alert variant="danger" dismissible onClose={() => setError('')} className="rounded-3 mb-3">
          {error}
        </Alert>
      )}

      {isManager && (
        <div className="bms-page-header-card mb-4" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '12px' }}>
          <div className="d-flex flex-wrap justify-content-between align-items-center gap-2">
            <div>
              <h2 className="h6 fw-bold mb-0 text-dark">Chính sách Giảm Phí Đối Tượng Ưu Tiên (Quản Lý Lab)</h2>
              <div className="small text-muted">
                Áp dụng trên phần chi phí còn lại sau chiết khấu BHYT
                {discountMeta?.updatedAt ? ` · Cập nhật gần nhất: ${new Date(discountMeta.updatedAt).toLocaleString('vi-VN')}` : ''}
              </div>
            </div>
          </div>
          <Form onSubmit={handleSavePriorityDiscount}>
            <Row className="g-3 align-items-end">
              <Col md={4}>
                <Form.Label className="small fw-semibold">Tỷ lệ giảm ưu tiên (%)</Form.Label>
                <Form.Control
                  type="number"
                  min="0"
                  max="100"
                  step="0.5"
                  value={discountPercent}
                  onChange={(e) => setDiscountPercent(e.target.value)}
                />
              </Col>
              <Col md={5}>
                <Form.Label className="small fw-semibold">Mức giảm tối đa (VNĐ, bỏ trống nếu không giới hạn)</Form.Label>
                <Form.Control
                  type="number"
                  min="0"
                  step="1000"
                  placeholder="Không giới hạn"
                  value={discountMax}
                  onChange={(e) => setDiscountMax(e.target.value)}
                />
              </Col>
              <Col md={3}>
                <Button
                  type="submit"
                  disabled={savingDiscount}
                  className="w-100 rounded-pill text-white fw-semibold"
                  style={{ backgroundColor: '#1E60E6', borderColor: '#1E60E6' }}
                >
                  {savingDiscount ? 'Đang lưu...' : 'Lưu Chính Sách Ưu Tiên'}
                </Button>
              </Col>
            </Row>
          </Form>
        </div>
      )}

      <div className="bms-filter-bar mb-3">
        <div className="bms-search-input-pill">
          <Search className="bms-search-icon" size={14} />
          <input
            type="text"
            placeholder="Tìm theo mã nhóm (VD: DN, GD, TE) hoặc mô tả..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button type="button" className="bms-search-clear" onClick={() => setSearch('')} aria-label="Xóa tìm kiếm">
              <LucideX size={12} />
            </button>
          )}
        </div>
        <div className="btn-group" role="group">
          {[
            { key: 'ALL', label: 'Tất cả' },
            { key: 'ACTIVE', label: 'Đang áp dụng' },
            { key: 'INACTIVE', label: 'Tạm ngưng' },
          ].map((item) => (
            <button
              key={item.key}
              type="button"
              className={`btn btn-sm ${statusFilter === item.key ? 'btn-primary text-white' : 'btn-outline-secondary'}`}
              onClick={() => setStatusFilter(item.key)}
            >
              {item.label}
            </button>
          ))}
        </div>
        <span className="bms-filter-meta">
          Hiển thị <strong>{filteredGroups.length}</strong> mã
        </span>
      </div>

      <section className="bms-table-standalone-section">
        <div className="bms-table-standalone-header">
          <h2 className="bms-table-standalone-title">Danh sách mã nhóm đối tượng BHYT</h2>
          <span className="small text-muted">{filteredGroups.length} bản ghi</span>
        </div>
        <div className="bms-table-standalone-body">
          {loading ? (
            <div className="text-center py-4 text-muted">
              <Spinner size="sm" animation="border" className="me-2" /> Đang tải danh mục BHYT...
            </div>
          ) : filteredGroups.length === 0 ? (
            <div className="text-center py-4 text-muted">
              Không tìm thấy mã nhóm BHYT phù hợp.
            </div>
          ) : (
            <Table responsive hover className="align-middle mb-0">
              <thead>
                <tr>
                  <th className="ps-3">Mã Nhóm</th>
                  <th>Mô Tả Đối Tượng</th>
                  <th>Nguồn</th>
                  <th>Trạng Thái</th>
                  <th>Cập Nhật Gần Nhất</th>
                  <th className="text-end pe-4">Thao Tác</th>
                </tr>
              </thead>
              <tbody>
                {filteredGroups.map((row) => (
                  <tr key={row.code}>
                    <td className="ps-3">
                      <span className="font-monospace fw-bold px-2.5 py-1 rounded-2" style={{ background: '#EFF6FF', color: '#1E60E6' }}>
                        {row.code}
                      </span>
                    </td>
                    <td>{row.description || '—'}</td>
                    <td>
                      <Badge pill bg={row.seeded ? 'light' : 'info'} text="dark" className="border">
                        {row.seeded ? 'Chuẩn BYT' : 'Tùy chỉnh'}
                      </Badge>
                    </td>
                    <td>
                      <Badge pill bg={row.isActive ? 'success' : 'secondary'}>
                        {row.isActive ? 'Đang áp dụng' : 'Tạm ngưng'}
                      </Badge>
                    </td>
                    <td className="small text-muted">
                      {row.updatedAt ? new Date(row.updatedAt).toLocaleString('vi-VN') : '—'}
                      {row.updatedBy ? <div className="text-muted">Bởi: {row.updatedBy}</div> : null}
                    </td>
                    <td className="text-end pe-4">
                      <div className="d-inline-flex gap-2">
                        <Button
                          size="sm"
                          variant="outline-primary"
                          className="rounded-pill px-3"
                          onClick={() => openEditModal(row)}
                        >
                          <Edit3 size={12} className="me-1" /> Sửa
                        </Button>
                        <Button
                          size="sm"
                          variant={row.isActive ? 'outline-secondary' : 'outline-success'}
                          className="rounded-pill px-3"
                          onClick={() => handleQuickToggle(row)}
                        >
                          {row.isActive ? 'Tạm ngưng' : 'Kích hoạt'}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </div>
      </section>

      <Modal show={showModal} onHide={() => setShowModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title className="h5 fw-bold">
            {isEditing ? `Cập nhật mã nhóm BHYT (${formCode})` : 'Thêm mã nhóm đối tượng BHYT'}
          </Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSaveGroup}>
          <Modal.Body>
            {modalError && <Alert variant="danger" className="small py-2">{modalError}</Alert>}
            <Form.Group className="mb-3">
              <Form.Label className="small fw-semibold">Mã nhóm (2 chữ cái A–Z) *</Form.Label>
              <Form.Control
                type="text"
                maxLength={2}
                placeholder="VD: DN, GD, TE, HN"
                value={formCode}
                disabled={isEditing}
                onChange={(e) => setFormCode(e.target.value.toUpperCase())}
                required
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label className="small fw-semibold">Mô tả đối tượng hưởng BHYT</Form.Label>
              <Form.Control
                as="textarea"
                rows={2}
                maxLength={200}
                placeholder="VD: Người lao động làm việc trong các doanh nghiệp..."
                value={formDesc}
                onChange={(e) => setFormDesc(e.target.value)}
              />
            </Form.Group>
            <Form.Check
              type="switch"
              id="bhyt-group-active"
              label="Đang kích hoạt (cho phép áp dụng khi tính viện phí)"
              checked={formActive}
              onChange={(e) => setFormActive(e.target.checked)}
            />
          </Modal.Body>
          <Modal.Footer>
            <Button variant="outline-secondary" className="rounded-pill px-3" onClick={() => setShowModal(false)} disabled={saving}>
              Hủy
            </Button>
            <Button type="submit" className="rounded-pill px-4 text-white" style={{ backgroundColor: '#1E60E6', borderColor: '#1E60E6' }} disabled={saving}>
              {saving ? 'Đang lưu...' : 'Lưu Cấu Hình'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </div>
  );
}
