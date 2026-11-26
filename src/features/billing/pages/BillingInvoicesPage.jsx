import React, { useState, useEffect, useMemo } from 'react';
import {
  Modal,
  Button,
  Form,
  Row,
  Col,
  Badge,
  Spinner,
  Alert,
  Table
} from 'react-bootstrap';
import { Receipt, Search, X as LucideX, Plus, Printer, CreditCard, Banknote, QrCode, AlertTriangle, CheckCircle2, Hourglass, RefreshCw, Inbox, Circle, IdCard, ClipboardList, Landmark } from 'lucide-react';
import {
  getInvoices,
  createInvoice,
  payInvoice,
  getReceiptPrintData
} from '../api/billingApi';
import { getPackages } from '../../admin/api/packageApi';
import ReceiptPrintModal from '../components/ReceiptPrintModal';
import VatInvoiceModal, { numberToVietnameseWords } from '../components/VatInvoiceModal';

export default function BillingInvoicesPage() {
  const [invoices, setInvoices] = useState([]);
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Modals
  const [printData, setPrintData] = useState(null);
  const [showVatModal, setShowVatModal] = useState(false);
  const [vatInvoiceData, setVatInvoiceData] = useState(null);
  const [showPayModal, setShowPayModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState(1); // 1: Cash, 2: VNPay, 3: BankTransfer, 4: POS Card

  // New Invoice Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newPatientName, setNewPatientName] = useState('');
  const [newPatientPhone, setNewPatientPhone] = useState('');
  const [newPatientCccd, setNewPatientCccd] = useState('');
  const [selectedPackageCode, setSelectedPackageCode] = useState('');
  const [newItemName, setNewItemName] = useState('Gói Xét Nghiệm Tầm Soát Thiếu Máu & Bệnh Lý Huyết Sắc Tố');
  const [newItemPrice, setNewItemPrice] = useState(620000);
  const [newDiscount, setNewDiscount] = useState(0);

  useEffect(() => {
    loadInvoices();
    loadPackages();
  }, [statusFilter]);

  async function loadPackages() {
    try {
      const res = await getPackages({ pageSize: 50 });
      if (Array.isArray(res)) {
        setPackages(res);
      } else if (res?.data && Array.isArray(res.data)) {
        setPackages(res.data);
      }
    } catch (err) {
      console.warn('Không thể nạp danh mục gói xét nghiệm:', err);
    }
  }

  async function loadInvoices() {
    setLoading(true);
    try {
      const res = await getInvoices({ status: statusFilter });
      if (res?.data) {
        setInvoices(res.data);
      } else if (Array.isArray(res)) {
        setInvoices(res);
      }
    } catch (err) {
      setError(err.message || 'Không thể tải danh sách hóa đơn.');
    } finally {
      setLoading(false);
    }
  }

  const handleOpenPrint = async (invoice) => {
    if (invoice.status !== 1 && invoice.status !== 'Paid') {
      setError('Chỉ có thể in biên lai cho hóa đơn đã thanh toán.');
      return;
    }

    try {
      setLoading(true);
      const res = await getReceiptPrintData(invoice.id);
      if (res?.data) {
        setPrintData(res.data);
      } else if (res) {
        setPrintData(res);
      }
    } catch (err) {
      setError(err.message || 'Không thể lấy dữ liệu in biên lai.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenVat = (invoice) => {
    setVatInvoiceData({
      ...invoice,
      invoiceNumber: invoice.invoiceCode || invoice.invoiceNumber,
      amount: invoice.finalAmount || invoice.totalAmount,
      packageName: invoice.items?.[0]?.itemName || 'Dịch vụ xét nghiệm máu y khoa',
      items: invoice.items?.map((it, idx) => ({
        stt: idx + 1,
        itemName: it.itemName,
        unit: 'Lần',
        quantity: it.quantity || 1,
        unitPrice: it.unitPrice,
        totalPrice: it.totalPrice,
        taxRate: 'KCT',
        taxAmount: 0
      }))
    });
    setShowVatModal(true);
  };

  const handlePayInvoice = async () => {
    if (!selectedInvoice) return;
    try {
      setLoading(true);
      await payInvoice(selectedInvoice.id, {
        paymentMethod: Number(paymentMethod),
        transactionReference: `POS-${Date.now()}`
      });
      setShowPayModal(false);
      setSuccessMsg(`Thanh toán hóa đơn ${selectedInvoice.invoiceCode} thành công.`);
      setTimeout(() => setSuccessMsg(null), 3000);
      await loadInvoices();
    } catch (err) {
      setError(err.message || 'Lỗi xử lý thanh toán.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPackageChange = (code) => {
    setSelectedPackageCode(code);
    if (!code) {
      return;
    }
    if (code === 'CUSTOM') {
      setNewItemName('');
      setNewItemPrice(0);
      return;
    }
    const found = packages.find(
      p => p.packageCode === code || p.id === code || p.package_code === code
    );
    if (found) {
      setNewItemName(found.packageName || found.name || found.package_name);
      const price = found.discountPrice || found.price || found.discount_price || 0;
      setNewItemPrice(price);
    }
  };

  const handleCreateInvoice = async (e) => {
    e.preventDefault();
    if (!newPatientName.trim()) {
      alert('Vui lòng nhập họ tên người bệnh.');
      return;
    }

    const payload = {
      patientId: newPatientCccd?.trim() ? `PAT-${newPatientCccd.trim().slice(-6)}` : `PAT-${Date.now().toString().slice(-6)}`,
      patientName: newPatientName.trim(),
      patientPhone: newPatientPhone.trim() || undefined,
      citizenId: newPatientCccd.trim() || undefined,
      items: [
        {
          itemCode: selectedPackageCode && selectedPackageCode !== 'CUSTOM' ? selectedPackageCode : 'SRV-01',
          itemName: newItemName.trim() || 'Dịch vụ xét nghiệm y khoa',
          quantity: 1,
          unitPrice: Number(newItemPrice) || 0
        }
      ],
      discountAmount: Number(newDiscount) || 0
    };

    try {
      setLoading(true);
      await createInvoice(payload);
      setShowCreateModal(false);
      setNewPatientName('');
      setNewPatientPhone('');
      setNewPatientCccd('');
      setSuccessMsg('Đã tạo hóa đơn thu phí mới và lưu vào sổ viện phí thành công.');
      setTimeout(() => setSuccessMsg(null), 3500);
      await loadInvoices();
    } catch (err) {
      alert(err.message || 'Lỗi tạo hóa đơn thu phí.');
    } finally {
      setLoading(false);
    }
  };

  // Filtered list by search
  const filteredInvoices = useMemo(() => {
    return invoices.filter(inv => {
      if (!searchTerm) return true;
      const term = searchTerm.toLowerCase();
      return (
        inv.invoiceCode?.toLowerCase().includes(term) ||
        inv.patientName?.toLowerCase().includes(term) ||
        inv.patientPhone?.includes(term)
      );
    });
  }, [invoices, searchTerm]);

  const totalPaid = useMemo(() => {
    return invoices
      .filter(i => i.status === 1 || i.status === 'Paid')
      .reduce((sum, i) => sum + (Number(i.totalAmount) || 0), 0);
  }, [invoices]);

  const totalPending = useMemo(() => {
    return invoices
      .filter(i => i.status === 0 || i.status === 'Unpaid')
      .reduce((sum, i) => sum + (Number(i.totalAmount) || 0), 0);
  }, [invoices]);

  const calculatedTotal = Math.max(0, (Number(newItemPrice) || 0) - (Number(newDiscount) || 0));

  return (
    <div className="container-fluid py-3 px-4" style={{ maxWidth: '1440px', margin: '0 auto', fontFamily: 'Inter, system-ui, sans-serif' }}>
      
      {/* Master Page Header Card (BMS Luxury Standard) */}
      <div className="bms-page-header-card d-flex align-items-center justify-content-between flex-wrap gap-3 p-3 mb-4 bg-white rounded-4 shadow-sm border border-slate-100">
        <div className="d-flex align-items-center gap-3">
          <div style={{
            width: 46,
            height: 46,
            borderRadius: 14,
            background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
            color: '#1d4ed8',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 22,
            boxShadow: '0 2px 8px rgba(29, 78, 216, 0.15)'
          }}>
            <Receipt  size="1em"/>
          </div>
          <div>
            <div className="d-flex align-items-center gap-2 flex-wrap">
              <h1 className="bms-page-title mb-0" style={{ fontSize: '19px', fontWeight: '800', color: '#0f172a' }}>
                Quầy Thu Viện Phí &amp; Quản Lý Hóa Đơn Điện Tử
              </h1>
              <span className="badge rounded-pill" style={{ background: '#e0f2fe', color: '#0369a1', fontSize: '11px', fontWeight: '700' }}>
                Nghị Định 123/2020/NĐ-CP
              </span>
              <span className="badge rounded-pill" style={{ background: '#ecfdf5', color: '#065f46', fontSize: '11px', fontWeight: '700' }}>
                Tại quầy thu ngân
              </span>
            </div>
            <p className="text-muted small mb-0 mt-1">
              Thu ngân viện phí trực tiếp (Tiền mặt / Thẻ POS / VietQR), in biên lai nhiệt K80 và phát hành hóa đơn điện tử VAT.
            </p>
          </div>
        </div>

        <div className="bms-page-actions">
          <Button
            variant="primary"
            onClick={() => setShowCreateModal(true)}
            className="text-white fw-semibold d-flex align-items-center gap-2 shadow-sm"
            style={{
              borderRadius: 9999,
              background: '#1E60E6',
              borderColor: '#1E60E6',
              boxShadow: '0 4px 14px rgba(30, 96, 230, 0.25)',
              padding: '9px 20px',
              fontSize: '13.5px'
            }}
          >
            <Plus size={12} />
            <span>Tạo Hóa Đơn Thu Viện Phí</span>
          </Button>
        </div>
      </div>

      {/* Notifications */}
      {error && (
        <Alert variant="danger" dismissible onClose={() => setError(null)} className="rounded-3 shadow-sm py-2 px-3 mb-3">
          <AlertTriangle size="1em" className="me-2" />
          {error}
        </Alert>
      )}
      {successMsg && (
        <Alert variant="success" dismissible onClose={() => setSuccessMsg(null)} className="rounded-3 shadow-sm py-2 px-3 mb-3">
          <CheckCircle2 size="1em" className="me-2" />
          {successMsg}
        </Alert>
      )}

      {/* Luxury Metric Cards */}
      <Row className="g-3 mb-4">
        <Col md={4}>
          <div className="p-3 bg-white rounded-4 border shadow-sm d-flex align-items-center justify-content-between h-100" style={{ borderColor: '#e2e8f0' }}>
            <div>
              <div className="text-muted small fw-semibold text-uppercase tracking-wider">Doanh Thu Đã Thu (Paid)</div>
              <div className="fs-4 fw-bolder text-success mt-1" style={{ fontVariantNumeric: 'tabular-nums' }}>
                {totalPaid.toLocaleString('vi-VN')} <span className="fs-6 fw-semibold text-muted">VNĐ</span>
              </div>
            </div>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: '#dcfce7', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
              <Banknote  size="1em"/>
            </div>
          </div>
        </Col>

        <Col md={4}>
          <div className="p-3 bg-white rounded-4 border shadow-sm d-flex align-items-center justify-content-between h-100" style={{ borderColor: '#e2e8f0' }}>
            <div>
              <div className="text-muted small fw-semibold text-uppercase tracking-wider">Chờ Thu Phí (Unpaid)</div>
              <div className="fs-4 fw-bolder text-warning mt-1" style={{ fontVariantNumeric: 'tabular-nums', color: '#d97706' }}>
                {totalPending.toLocaleString('vi-VN')} <span className="fs-6 fw-semibold text-muted">VNĐ</span>
              </div>
            </div>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: '#fef3c7', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
              <Hourglass size="1em" />
            </div>
          </div>
        </Col>

        <Col md={4}>
          <div className="p-3 bg-white rounded-4 border shadow-sm d-flex align-items-center justify-content-between h-100" style={{ borderColor: '#e2e8f0' }}>
            <div>
              <div className="text-muted small fw-semibold text-uppercase tracking-wider">Tổng Hóa Đơn Trong Ca</div>
              <div className="fs-4 fw-bolder text-dark mt-1">
                {invoices.length} <span className="fs-6 fw-semibold text-muted">hóa đơn</span>
              </div>
            </div>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: '#eff6ff', color: '#1d4ed8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
              <Receipt size="1em" />
            </div>
          </div>
        </Col>
      </Row>

      {/* Unified Invoices Card */}
      <div className="card border-0 shadow-sm rounded-4 mb-4 bg-white overflow-hidden">
        <div className="card-header bg-white border-bottom py-3 px-4">
          <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 w-100">
            <div>
              <h5 className="fw-bold mb-1 text-dark d-flex align-items-center gap-2" style={{ fontSize: '16px' }}>
                <Receipt style={{ color: '#1E60E6' }}  size="1em"/>
                Sổ Hóa Đơn &amp; Biên Lai Viện Phí
                <span className="badge rounded-pill bg-light text-primary border ms-1" style={{ fontSize: '12px' }}>
                  {filteredInvoices.length}
                </span>
              </h5>
              <div className="text-muted small">
                Danh sách hóa đơn điện tử VAT và biên lai thu tiền theo ca trực
              </div>
            </div>

            <div className="d-flex flex-wrap align-items-center gap-2 ms-auto">
              <div className="bms-search-input-pill" style={{ minWidth: '280px' }}>
                <Search className="bms-search-icon"  size="1em"/>
                <input
                  type="text"
                  placeholder="Tìm theo mã HĐ, tên người bệnh, SĐT..."
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

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="form-select form-select-sm rounded-pill"
                style={{ width: 'auto', paddingRight: '2rem', height: '36px', fontSize: '13px' }}
              >
                <option value="">Tất cả trạng thái</option>
                <option value="1">Đã thanh toán (Paid)</option>
                <option value="0">Chưa thanh toán (Unpaid)</option>
              </select>

              <Button
                variant="outline-secondary"
                size="sm"
                onClick={loadInvoices}
                title="Làm mới sổ hóa đơn"
                className="rounded-pill px-3"
                style={{ height: '36px' }}
              >
                <RefreshCw size="1em" />
              </Button>
            </div>
          </div>
        </div>

        <div className="bms-table-standalone-body">
          <div className="table-responsive">
            <Table hover className="align-middle mb-0" style={{ fontSize: '13.5px' }}>
              <thead className="table-light">
                <tr style={{ color: '#475569', borderBottom: '1px solid #e2e8f0', fontSize: '12.5px', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                  <th style={{ padding: '12px 16px', fontWeight: '700' }}>Mã Hóa Đơn</th>
                  <th style={{ padding: '12px 16px', fontWeight: '700' }}>Bệnh Nhân</th>
                  <th style={{ padding: '12px 16px', fontWeight: '700' }}>Dịch Vụ Chỉ Định</th>
                  <th style={{ padding: '12px 16px', fontWeight: '700', textAlign: 'right' }}>Số Tiền</th>
                  <th style={{ padding: '12px 16px', fontWeight: '700', textAlign: 'center' }}>Trạng Thái</th>
                  <th style={{ padding: '12px 16px', fontWeight: '700', textAlign: 'center' }}>Số Lần In</th>
                  <th style={{ padding: '12px 16px', fontWeight: '700' }}>Thời Gian</th>
                  <th style={{ padding: '12px 16px', fontWeight: '700', textAlign: 'center' }}>Thao Tác</th>
                </tr>
              </thead>
              <tbody>
                {loading && invoices.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-5 text-muted">
                      <Spinner animation="border" size="sm" className="me-2" />
                      Đang tải dữ liệu sổ viện phí...
                    </td>
                  </tr>
                ) : filteredInvoices.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-5 text-muted">
                      <Inbox size="1em" className="fs-2 d-block mb-2 text-slate-300" />
                      Không có hóa đơn nào phù hợp với điều kiện tra cứu.
                    </td>
                  </tr>
                ) : (
                  filteredInvoices.map((inv) => {
                    const isPaid = inv.status === 1 || inv.status === 'Paid';
                    const mainItem = inv.items?.[0]?.itemName || 'Dịch vụ xét nghiệm máu';
                    const moreItemsCount = (inv.items?.length || 1) - 1;

                    return (
                      <tr key={inv.id || inv.invoiceCode} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        {/* Mã Hóa Đơn */}
                        <td style={{ padding: '12px 16px' }}>
                          <span
                            className="bms-role-code-cell fw-bold"
                            style={{
                              fontFamily: 'ui-monospace, Menlo, Consolas, monospace',
                              fontSize: '12.5px',
                              padding: '3px 8px',
                              borderRadius: '6px',
                              background: '#eff6ff',
                              color: '#1d4ed8'
                            }}
                          >
                            {inv.invoiceCode || inv.invoiceNumber}
                          </span>
                        </td>

                        {/* Bệnh Nhân */}
                        <td style={{ padding: '12px 16px' }}>
                          <div className="fw-semibold text-dark" style={{ fontSize: '13.5px' }}>
                            {inv.patientName || 'Khách vãng lai'}
                          </div>
                          <div className="text-muted small">
                            {inv.patientPhone || 'Chưa cập nhật SĐT'}
                          </div>
                        </td>

                        {/* Dịch Vụ */}
                        <td style={{ padding: '12px 16px', maxWidth: '240px' }}>
                          <div className="text-truncate text-dark fw-medium" title={mainItem}>
                            {mainItem}
                          </div>
                          <div className="text-muted small">
                            {inv.items?.length || 1} mục dịch vụ {moreItemsCount > 0 && `(+${moreItemsCount} chỉ số)`}
                          </div>
                        </td>

                        {/* Số Tiền */}
                        <td style={{ padding: '12px 16px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                          <div className="fw-bold" style={{ color: '#0f172a', fontSize: '14.5px' }}>
                            {Number(inv.totalAmount || inv.finalAmount || 0).toLocaleString('vi-VN')} đ
                          </div>
                        </td>

                        {/* Trạng Thái */}
                        <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                          <span
                            className="bms-status-pill"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '5px',
                              padding: '4px 12px',
                              borderRadius: '9999px',
                              fontSize: '11.5px',
                              fontWeight: '700',
                              backgroundColor: isPaid ? '#dcfce7' : '#fef3c7',
                              color: isPaid ? '#166534' : '#92400e'
                            }}
                          >
                            <Circle size="1em" style={{ fontSize: '6px' }} />
                            {isPaid ? 'Đã Thanh Toán' : 'Chờ Thanh Toán'}
                          </span>
                        </td>

                        {/* Số Lần In */}
                        <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                          {inv.printCount > 0 ? (
                            <span
                              style={{
                                display: 'inline-block',
                                fontSize: '11.5px',
                                fontWeight: '600',
                                color: inv.printCount > 1 ? '#991b1b' : '#334155',
                                backgroundColor: inv.printCount > 1 ? '#fee2e2' : '#f1f5f9',
                                padding: '3px 8px',
                                borderRadius: '9999px'
                              }}
                            >
                              {inv.printCount > 1 ? `In lại (${inv.printCount} lần)` : 'Đã in (1 lần)'}
                            </span>
                          ) : (
                            <span className="text-muted" style={{ fontSize: '12px' }}>Chưa in</span>
                          )}
                        </td>

                        {/* Thời Gian */}
                        <td style={{ padding: '12px 16px', color: '#64748b', fontSize: '12.5px', whiteSpace: 'nowrap' }}>
                          {inv.createdAt ? new Date(inv.createdAt).toLocaleString('vi-VN') : '—'}
                        </td>

                        {/* THAO TÁC: Standardized to "In Biên Lai" & "HĐ VAT" with Luxury System Styling */}
                        <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                          <div className="d-inline-flex align-items-center gap-2">
                            {!isPaid ? (
                              <Button
                                variant="success"
                                size="sm"
                                onClick={() => { setSelectedInvoice(inv); setShowPayModal(true); }}
                                className="d-inline-flex align-items-center gap-1 shadow-sm fw-semibold"
                                style={{
                                  borderRadius: 9999,
                                  fontSize: '12px',
                                  padding: '4px 12px',
                                  background: '#10b981',
                                  borderColor: '#10b981',
                                  color: '#ffffff'
                                }}
                                title="Xác nhận thu viện phí trực tiếp qua POS / Tiền mặt"
                              >
                                <CreditCard size={11} />
                                <span>Thu Tiền POS</span>
                              </Button>
                            ) : (
                              <>
                                {/* In Biên Lai (K80) */}
                                <Button
                                  variant="outline-primary"
                                  size="sm"
                                  onClick={() => handleOpenPrint(inv)}
                                  className="d-inline-flex align-items-center gap-1 shadow-xs fw-semibold"
                                  style={{
                                    borderRadius: 9999,
                                    fontSize: '12px',
                                    padding: '4px 12px',
                                    background: '#eff6ff',
                                    borderColor: '#bfdbfe',
                                    color: '#1d4ed8'
                                  }}
                                  title="In biên lai thu phí khổ nhiệt K80 (máy in POS 80mm)"
                                >
                                  <Printer size={11} />
                                  <span>In Biên Lai</span>
                                </Button>

                                {/* Hóa Đơn Điện Tử VAT */}
                                <Button
                                  variant="outline-secondary"
                                  size="sm"
                                  onClick={() => handleOpenVat(inv)}
                                  className="d-inline-flex align-items-center gap-1 shadow-xs fw-semibold"
                                  style={{
                                    borderRadius: 9999,
                                    fontSize: '12px',
                                    padding: '4px 12px',
                                    background: '#f5f3ff',
                                    borderColor: '#ddd6fe',
                                    color: '#6d28d9'
                                  }}
                                  title="Xem & phát hành hóa đơn điện tử VAT chuẩn Nghị định 123/2020/NĐ-CP"
                                >
                                  <Receipt size={11} />
                                  <span>HĐ VAT</span>
                                </Button>
                              </>
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
        </div>
      </div>

      {/* ============================================================== */}
      {/* MODAL 1: TẠO HÓA ĐƠN THU PHÍ MỚI (Overhauled with BMS Luxury UI) */}
      {/* ============================================================== */}
      <Modal
        show={showCreateModal}
        onHide={() => setShowCreateModal(false)}
        size="lg"
        centered
        backdrop="static"
        contentClassName="border-0 shadow-lg"
        style={{ borderRadius: 16 }}
      >
        <Form onSubmit={handleCreateInvoice}>
          <Modal.Header closeButton style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', borderRadius: '16px 16px 0 0', padding: '16px 24px' }}>
            <div className="d-flex align-items-center gap-3">
              <div style={{
                width: 42,
                height: 42,
                borderRadius: 12,
                background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
                color: '#1d4ed8',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 20
              }}>
                <Receipt  size="1em"/>
              </div>
              <div>
                <Modal.Title as="h5" className="fw-bold mb-0 text-dark" style={{ fontSize: '17px' }}>
                  Tạo Hóa Đơn &amp; Biên Lai Thu Viện Phí Mới
                </Modal.Title>
                <small className="text-muted">
                  Lập phiếu thu viện phí trực tiếp tại quầy theo bảng giá dịch vụ
                </small>
              </div>
            </div>
          </Modal.Header>

          <Modal.Body style={{ padding: '24px' }}>
            {/* 1. Thông Tin Người Bệnh */}
            <div className="mb-4">
              <h6 className="fw-bold text-dark d-flex align-items-center gap-2 mb-3" style={{ fontSize: '14.5px' }}>
                <IdCard size="1em" className="text-primary" />
                1. Thông Tin Định Danh Người Bệnh
              </h6>
              <Row className="g-3">
                <Col md={6}>
                  <Form.Group>
                    <Form.Label className="small fw-semibold text-secondary">Họ và Tên Bệnh Nhân <span className="text-danger">*</span></Form.Label>
                    <Form.Control
                      type="text"
                      required
                      placeholder="VD: Nguyễn Văn An"
                      value={newPatientName}
                      onChange={(e) => setNewPatientName(e.target.value)}
                      style={{ borderRadius: 8, padding: '9px 12px', fontSize: '14px' }}
                    />
                  </Form.Group>
                </Col>

                <Col md={6}>
                  <Form.Group>
                    <Form.Label className="small fw-semibold text-secondary">Số Điện Thoại Liên Hệ</Form.Label>
                    <Form.Control
                      type="text"
                      placeholder="VD: 0912345678"
                      value={newPatientPhone}
                      onChange={(e) => setNewPatientPhone(e.target.value)}
                      style={{ borderRadius: 8, padding: '9px 12px', fontSize: '14px' }}
                    />
                  </Form.Group>
                </Col>

                <Col md={12}>
                  <Form.Group>
                    <Form.Label className="small fw-semibold text-secondary">Số CCCD / Định Danh Y Tế (VNeID)</Form.Label>
                    <Form.Control
                      type="text"
                      placeholder="Số CCCD 12 số (tùy chọn)"
                      value={newPatientCccd}
                      onChange={(e) => setNewPatientCccd(e.target.value)}
                      style={{ borderRadius: 8, padding: '9px 12px', fontSize: '14px' }}
                    />
                  </Form.Group>
                </Col>
              </Row>
            </div>

            <hr className="my-3 text-slate-200" />

            {/* 2. Chỉ Định Dịch Vụ & Viện Phí */}
            <div className="mb-4">
              <h6 className="fw-bold text-dark d-flex align-items-center gap-2 mb-3" style={{ fontSize: '14.5px' }}>
                <ClipboardList size="1em" className="text-primary" />
                2. Chỉ Định Gói Xét Nghiệm &amp; Chính Sách Giá
              </h6>

              <Form.Group className="mb-3">
                <Form.Label className="small fw-semibold text-secondary">
                  Chọn Gói Xét Nghiệm (Từ Danh Mục Chuẩn Y Khoa)
                </Form.Label>
                <Form.Select
                  value={selectedPackageCode}
                  onChange={(e) => handleSelectPackageChange(e.target.value)}
                  style={{ borderRadius: 8, padding: '9px 12px', fontSize: '14px' }}
                >
                  <option value="">-- Chọn gói xét nghiệm chuẩn hoặc tự nhập --</option>
                  {packages.map((pkg) => {
                    const code = pkg.packageCode || pkg.id || pkg.package_code;
                    const name = pkg.packageName || pkg.name || pkg.package_name;
                    const price = pkg.discountPrice || pkg.price || pkg.discount_price || 0;
                    return (
                      <option key={code} value={code}>
                        {code} - {name} ({price.toLocaleString('vi-VN')} đ)
                      </option>
                    );
                  })}
                  <option value="CUSTOM">-- Nhập Tùy Chỉnh (Dịch Vụ Khác) --</option>
                </Form.Select>
              </Form.Group>

              <Row className="g-3">
                <Col md={12}>
                  <Form.Group>
                    <Form.Label className="small fw-semibold text-secondary">Tên Gói Dịch Vụ / Xét Nghiệm Hiển Thị <span className="text-danger">*</span></Form.Label>
                    <Form.Control
                      type="text"
                      required
                      value={newItemName}
                      onChange={(e) => setNewItemName(e.target.value)}
                      placeholder="VD: Gói Xét Nghiệm Tầm Soát Thiếu Máu..."
                      style={{ borderRadius: 8, padding: '9px 12px', fontSize: '14px' }}
                    />
                  </Form.Group>
                </Col>

                <Col md={6}>
                  <Form.Group>
                    <Form.Label className="small fw-semibold text-secondary">Đơn Giá Niêm Yết (VNĐ) <span className="text-danger">*</span></Form.Label>
                    <Form.Control
                      type="number"
                      required
                      min={0}
                      step={1000}
                      value={newItemPrice}
                      onChange={(e) => setNewItemPrice(Number(e.target.value) || 0)}
                      style={{ borderRadius: 8, padding: '9px 12px', fontSize: '14px', fontWeight: '600' }}
                    />
                  </Form.Group>
                </Col>

                <Col md={6}>
                  <Form.Group>
                    <Form.Label className="small fw-semibold text-secondary">Miễn Giảm / BHYT Hỗ Trợ (VNĐ)</Form.Label>
                    <Form.Control
                      type="number"
                      min={0}
                      step={1000}
                      value={newDiscount}
                      onChange={(e) => setNewDiscount(Number(e.target.value) || 0)}
                      style={{ borderRadius: 8, padding: '9px 12px', fontSize: '14px' }}
                    />
                  </Form.Group>
                </Col>
              </Row>
            </div>

            {/* 3. Live Summary Card (BMS Billing Calculator) */}
            <div
              className="p-3 rounded-3 border"
              style={{
                backgroundColor: '#f8fafc',
                borderColor: '#e2e8f0'
              }}
            >
              <div className="d-flex justify-content-between align-items-center mb-1 small text-secondary">
                <span>Đơn giá niêm yết:</span>
                <span className="fw-semibold text-dark">{(Number(newItemPrice) || 0).toLocaleString('vi-VN')} đ</span>
              </div>
              <div className="d-flex justify-content-between align-items-center mb-2 small text-secondary">
                <span>Miễn giảm / Giảm trừ viện phí:</span>
                <span className="fw-semibold text-danger">-{(Number(newDiscount) || 0).toLocaleString('vi-VN')} đ</span>
              </div>
              <div className="border-top pt-2 d-flex justify-content-between align-items-baseline">
                <div>
                  <div className="small fw-bold text-uppercase text-secondary" style={{ letterSpacing: '0.04em' }}>
                    Tổng Viện Phí Phải Thu
                  </div>
                  <div className="small text-muted fst-italic">
                    Bằng chữ: <strong>{numberToVietnameseWords(calculatedTotal)}</strong>
                  </div>
                </div>
                <div className="fs-3 fw-bolder text-success" style={{ fontVariantNumeric: 'tabular-nums' }}>
                  {calculatedTotal.toLocaleString('vi-VN')} <span className="fs-6 fw-bold">VNĐ</span>
                </div>
              </div>
            </div>
          </Modal.Body>

          <Modal.Footer style={{ background: '#f8fafc', borderTop: '1px solid #e2e8f0', borderRadius: '0 0 16px 16px', padding: '14px 24px' }}>
            <Button
              variant="light"
              onClick={() => setShowCreateModal(false)}
              className="fw-semibold px-4"
              style={{ borderRadius: 9999, border: '1px solid #cbd5e1' }}
            >
              Hủy Bỏ
            </Button>
            <Button
              variant="primary"
              type="submit"
              disabled={loading}
              className="fw-semibold px-4 shadow-sm text-white d-flex align-items-center gap-2"
              style={{ borderRadius: 9999, background: '#1E60E6', borderColor: '#1E60E6' }}
            >
              {loading ? (
                <>
                  <Spinner animation="border" size="sm" />
                  <span>Đang Tạo Hóa Đơn...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 size="1em" />
                  <span>Tạo Hóa Đơn Thu Phí</span>
                </>
              )}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* ============================================================== */}
      {/* MODAL 2: XÁC NHẬN THU TIỀN POS / TIỀN MẶT (BMS System Style)   */}
      {/* ============================================================== */}
      <Modal
        show={showPayModal && !!selectedInvoice}
        onHide={() => setShowPayModal(false)}
        centered
        backdrop="static"
        contentClassName="border-0 shadow-lg"
        style={{ borderRadius: 16 }}
      >
        <Modal.Header closeButton style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', borderRadius: '16px 16px 0 0', padding: '16px 24px' }}>
          <div className="d-flex align-items-center gap-3">
            <div style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              background: '#dcfce7',
              color: '#16a34a',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 18
            }}>
              <CreditCard  size="1em"/>
            </div>
            <div>
              <Modal.Title as="h5" className="fw-bold mb-0 text-dark" style={{ fontSize: '16.5px' }}>
                Xác Nhận Thu Tiền Viện Phí
              </Modal.Title>
              <small className="text-muted">Hoàn tất thanh toán trực tiếp tại quầy tiếp đón</small>
            </div>
          </div>
        </Modal.Header>

        <Modal.Body style={{ padding: '20px 24px' }}>
          {selectedInvoice && (
            <>
              <div className="p-3 rounded-3 mb-3" style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                <div className="d-flex justify-content-between mb-1 small">
                  <span className="text-muted">Mã Hóa Đơn:</span>
                  <span className="fw-bold text-primary">{selectedInvoice.invoiceCode}</span>
                </div>
                <div className="d-flex justify-content-between mb-2 small">
                  <span className="text-muted">Bệnh Nhân:</span>
                  <span className="fw-semibold text-dark">{selectedInvoice.patientName}</span>
                </div>
                <div className="border-top pt-2 d-flex justify-content-between align-items-baseline">
                  <span className="fw-bold text-dark">Số tiền thu:</span>
                  <span className="fs-4 fw-bolder text-success">
                    {Number(selectedInvoice.totalAmount || 0).toLocaleString('vi-VN')} VNĐ
                  </span>
                </div>
              </div>

              <Form.Group className="mb-2">
                <Form.Label className="small fw-semibold text-secondary">Hình thức thanh toán:</Form.Label>
                <div className="d-grid gap-2">
                  {[
                    { id: 1, label: 'Tiền mặt (Cash)', icon: <Banknote className="text-success me-2"  size="1em"/> },
                    { id: 4, label: 'Thẻ POS (Visa / Mastercard / Napas)', icon: <CreditCard className="text-primary me-2"  size="1em"/> },
                    { id: 2, label: 'VietQR / Chuyển khoản quét mã', icon: <QrCode className="text-info me-2"  size="1em"/> },
                    { id: 3, label: 'Chuyển khoản Ngân hàng', icon: <Landmark size="1em" className="me-2 text-warning" /> }
                  ].map((item) => (
                    <div
                      key={item.id}
                      onClick={() => setPaymentMethod(item.id)}
                      className={`p-2 px-3 rounded-3 border d-flex align-items-center justify-content-between cursor-pointer`}
                      style={{
                        cursor: 'pointer',
                        borderColor: Number(paymentMethod) === item.id ? '#1E60E6' : '#e2e8f0',
                        backgroundColor: Number(paymentMethod) === item.id ? '#eff6ff' : '#ffffff',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <div className="d-flex align-items-center small fw-semibold text-dark">
                        {item.icon}
                        {item.label}
                      </div>
                      <Form.Check
                        type="radio"
                        name="payMethodRadio"
                        checked={Number(paymentMethod) === item.id}
                        onChange={() => setPaymentMethod(item.id)}
                      />
                    </div>
                  ))}
                </div>
              </Form.Group>
            </>
          )}
        </Modal.Body>

        <Modal.Footer style={{ background: '#f8fafc', borderTop: '1px solid #e2e8f0', borderRadius: '0 0 16px 16px', padding: '12px 24px' }}>
          <Button
            variant="light"
            onClick={() => setShowPayModal(false)}
            className="fw-semibold px-4"
            style={{ borderRadius: 9999, border: '1px solid #cbd5e1' }}
          >
            Hủy Bỏ
          </Button>
          <Button
            variant="success"
            disabled={loading}
            onClick={handlePayInvoice}
            className="fw-semibold px-4 shadow-sm text-white d-flex align-items-center gap-2"
            style={{ borderRadius: 9999 }}
          >
            {loading ? (
              <>
                <Spinner animation="border" size="sm" />
                <span>Đang xử lý...</span>
              </>
            ) : (
              <>
                <CheckCircle2 size="1em" />
                <span>Xác Nhận Đã Thu Tiền</span>
              </>
            )}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* ============================================================== */}
      {/* MODAL 3: IN BIÊN LAI NHIỆT K80 (ReceiptPrintModal)             */}
      {/* ============================================================== */}
      {printData && (
        <ReceiptPrintModal
          printData={printData}
          onClose={() => setPrintData(null)}
        />
      )}

      {/* ============================================================== */}
      {/* MODAL 4: HÓA ĐƠN ĐIỆN TỬ VAT (Nghị định 123 / Thông tư 78)     */}
      {/* ============================================================== */}
      <VatInvoiceModal
        show={showVatModal}
        onClose={() => setShowVatModal(false)}
        invoiceData={vatInvoiceData}
        patientData={{
          fullName: vatInvoiceData?.patientName,
          patientCode: vatInvoiceData?.patientId,
          citizenId: vatInvoiceData?.patientPhone,
          address: 'TP. Hồ Chí Minh'
        }}
      />
    </div>
  );
}
