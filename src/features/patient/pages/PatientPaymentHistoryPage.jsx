/**
 * @file PatientPaymentHistoryPage.jsx
 * @description Dedicated Patient Billing & Electronic Payment History (UC18 / UC55).
 * Replaces obsolete staff-only /invoices view for patients.
 * Compliant with Rule 19, Non-AI Human-Centered UI, ISO 15189 Standards, and Nghị định 123/2020/NĐ-CP.
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Modal, Button, Badge, Form, Row, Col, Alert, Spinner } from 'react-bootstrap';
import { Receipt as LucideReceipt, CreditCard, CheckCircle2, Clock, Download, Printer, Search, Filter, Calendar, ArrowRight, X, ExternalLink, Info, Landmark, Banknote, RefreshCw, AlertTriangle } from 'lucide-react';
import api from '../../../config/api';
import { getStoredUser } from '../../../constants/roles';
import { getMyPatientInformation } from '../../../services/patientService';
import { billingApi, getInvoicesByPatient, getInvoices } from '../../billing/api/billingApi';
import VatInvoiceModal from '../../billing/components/VatInvoiceModal';
import './PatientPaymentHistoryPage.css';

export default function PatientPaymentHistoryPage() {
  const navigate = useNavigate();
  const storedUser = useMemo(() => getStoredUser(), []);

  // Profile & State
  const [patientProfile, setPatientProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [rawTransactions, setRawTransactions] = useState([]);
  const [totalCount, setTotalCount] = useState(0);

  // Filters
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Receipt Modal State
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);

  // 1. Load patient profile once
  useEffect(() => {
    let isMounted = true;
    async function fetchProfile() {
      try {
        const info = await getMyPatientInformation();
        if (isMounted && info) {
          setPatientProfile(info);
        }
      } catch (err) {
        if (isMounted) {
          setPatientProfile(storedUser);
        }
      }
    }
    fetchProfile();
    return () => { isMounted = false; };
  }, [storedUser]);

  // Determine current active patient ID
  const activePatientId = useMemo(() => {
    return (
      patientProfile?.patientCode ||
      patientProfile?.id ||
      patientProfile?._id ||
      storedUser?.patientCode ||
      storedUser?.id ||
      storedUser?.sub ||
      ''
    );
  }, [patientProfile, storedUser]);

  // 2. Fetch invoices from real billing API
  const fetchInvoices = useCallback(async () => {
    if (!activePatientId) return;

    setLoading(true);
    setError(null);

    try {
      const params = {
        page,
        pageSize,
        fromDate: fromDate || undefined,
        toDate: toDate || undefined };

      if (filterStatus === 'PAID') {
        params.status = 1; // InvoiceStatus.Paid
      } else if (filterStatus === 'PENDING') {
        params.status = 0; // InvoiceStatus.Unpaid
      }

      let resData = null;

      // Try getInvoicesByPatient first
      try {
        const res = await getInvoicesByPatient(activePatientId, params);
        resData = res?.data || res;
      } catch (firstErr) {
        // Fallback to getInvoices with patientId
        try {
          const res = await getInvoices({ ...params, patientId: activePatientId });
          resData = res?.data || res;
        } catch {
          // Fallback to /payments/patient
          const res = await api.get(`/payments/patient/${encodeURIComponent(activePatientId)}`);
          resData = res?.data?.data || res?.data;
        }
      }

      const list = Array.isArray(resData)
        ? resData
        : Array.isArray(resData?.data)
        ? resData.data
        : Array.isArray(resData?.items)
        ? resData.items
        : [];

      const total =
        typeof resData?.total === 'number'
          ? resData.total
          : typeof resData?.totalCount === 'number'
          ? resData.totalCount
          : list.length;

      // Normalize invoices into structured records
      const normalized = list.map((item, index) => {
        const rawStatus = item.status;
        const isPaid =
          rawStatus === 1 ||
          rawStatus === 'Paid' ||
          rawStatus === 'PAID' ||
          Boolean(item.paidAt);

        // Normalize payment method
        let displayMethod = item.paymentMethod ? String(item.paymentMethod) : (isPaid ? 'Chuyển khoản / Trực tuyến' : 'Chờ thanh toán');
        const rawMethod = String(item.paymentMethod || '').toLowerCase();
        if (rawMethod.includes('cash') || rawMethod.includes('tiền mặt') || item.paymentMethod === 1) {
          displayMethod = 'Tiền mặt tại quầy tiếp đón';
        } else if (rawMethod.includes('sepay') || rawMethod.includes('vietqr')) {
          displayMethod = 'Chuyển khoản SePay VietQR';
        } else if (rawMethod.includes('vnpay')) {
          displayMethod = 'Cổng thanh toán VNPAY';
        } else if (rawMethod.includes('transfer') || rawMethod.includes('chuyển khoản') || item.paymentMethod === 3) {
          displayMethod = 'Chuyển khoản Ngân hàng';
        } else if (rawMethod.includes('pos') || rawMethod.includes('card') || item.paymentMethod === 4) {
          displayMethod = 'Thẻ tín dụng / Ghi nợ (POS)';
        } else if (!isPaid) {
          displayMethod = 'Chờ lựa chọn phương thức';
        }

        const invNum =
          item.invoiceCode ||
          item.invoiceNumber ||
          (item.id ? `INV-${String(item.id).slice(-8).toUpperCase()}` : `INV-2026-${String(index + 1).padStart(4, '0')}`);

        const cqtCode = item.cqtCode || '';

        // Package / Items breakdown
        const pkgName =
          item.packageName ||
          item.items?.[0]?.itemName ||
          item.testName ||
          'Gói xét nghiệm y khoa tổng quát';

        const totalAmt = Number(item.totalAmount || item.finalAmount || item.amount || 0);
        const subTot = Number(item.subTotal || totalAmt);
        const discountAmt = Number(item.discountAmount || 0);

        return {
          id: item.id || item.invoiceId || `INV-${index + 1}`,
          invoiceNumber: invNum,
          formNumber: item.formNumber || '—',
          serialNumber: item.serialNumber || '—',
          cqtCode,
          transactionCode: item.transactionReference || item.receiptNumber || item.transactionCode || null,
          packageName: pkgName,
          amount: totalAmt,
          subTotal: subTot,
          discountAmount: discountAmt,
          // Tax rate: Medical services are Non-taxable (KCT) or 8% under Decree 123/2020/ND-CP & Decree 72/2024/ND-CP
          taxRate: item.taxRate || 'KCT',
          taxAmount: item.taxAmount || 0,
          paymentMethod: displayMethod,
          rawPaymentMethod: item.paymentMethod,
          status: isPaid ? 'PAID' : 'PENDING',
          statusText: isPaid ? 'Đã thanh toán' : 'Chờ thanh toán',
          paidAt: item.paidAt || item.createdAt || null,
          appointmentCode: item.appointmentCode || item.appointmentId || '—',
          cashierName: item.cashierName || (rawMethod.includes('cash') ? 'Thu ngân quầy tiếp đón' : '—'),
          bankCode: item.bankCode || '',
          items: Array.isArray(item.items) && item.items.length > 0 ? item.items : [
            {
              stt: 1,
              itemCode: item.items?.[0]?.itemCode || '—',
              itemName: pkgName,
              unit: 'Gói/Lần',
              quantity: 1,
              unitPrice: totalAmt,
              totalPrice: totalAmt,
              taxRate: 'KCT',
              taxAmount: 0
            }
          ]
        };
      });

      setRawTransactions(normalized);
      setTotalCount(total);
    } catch (err) {
      console.error('Lỗi khi tải lịch sử thanh toán viện phí:', err);
      setError('Không thể kết nối đến máy chủ viện phí để tải lịch sử giao dịch. Vui lòng thử lại sau.');
    } finally {
      setLoading(false);
    }
  }, [activePatientId, page, pageSize, filterStatus, fromDate, toDate]);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  // Client-side search filtering across current transactions
  const displayedTransactions = useMemo(() => {
    if (!searchKeyword.trim()) return rawTransactions;
    const q = searchKeyword.toLowerCase().trim();
    return rawTransactions.filter(t => {
      const matchNo = t.invoiceNumber?.toLowerCase().includes(q);
      const matchTxn = t.transactionCode?.toLowerCase().includes(q);
      const matchPkg = t.packageName?.toLowerCase().includes(q);
      const matchAppt = t.appointmentCode?.toLowerCase().includes(q);
      const matchCqt = t.cqtCode?.toLowerCase().includes(q);
      return matchNo || matchTxn || matchPkg || matchAppt || matchCqt;
    });
  }, [rawTransactions, searchKeyword]);

  // Financial statistics calculated from real loaded records
  const stats = useMemo(() => {
    const paidList = rawTransactions.filter(t => t.status === 'PAID');
    const totalPaid = paidList.reduce((acc, cur) => acc + (cur.amount || 0), 0);
    const pendingCount = rawTransactions.filter(t => t.status === 'PENDING').length;
    return {
      totalPaid,
      paidCount: paidList.length,
      pendingCount
    };
  }, [rawTransactions]);

  // Date range validation
  const isDateInvalid = Boolean(fromDate && toDate && fromDate > toDate);

  const handleOpenReceipt = (item) => {
    setSelectedReceipt(item);
    setShowReceiptModal(true);
  };

  const handleResetFilters = () => {
    setSearchKeyword('');
    setFilterStatus('ALL');
    setFromDate('');
    setToDate('');
    setPage(1);
  };

  const formatCurrency = (val) => {
    return Number(val || 0).toLocaleString('vi-VN') + ' đ';
  };

  const formatDateTime = (dateStr) => {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return '—';
      return d.toLocaleString('vi-VN', {
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

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  return (
    <div className="bms-payhistory-content">
      {/* 1. PAGE HEADER */}
      <div className="bms-page-header-card mb-4">
        <div className="bms-page-header-content">
          <h1 className="bms-page-title">Lịch Sử Thanh Toán</h1>
          <p className="bms-page-subtitle">Theo dõi giao dịch viện phí và tra cứu hóa đơn điện tử</p>
        </div>
        <div className="d-flex align-items-center gap-2">
          <Button
            variant="outline-secondary"
            size="sm"
            className="rounded-pill px-3 d-inline-flex align-items-center gap-1.5"
            onClick={fetchInvoices}
            disabled={loading}
          >
            <RefreshCw className={loading ? 'fa-spin' : ''}  size="1em"/> Làm mới
          </Button>
          <Link
            to="/appointments/book"
            className="btn btn-primary btn-sm rounded-pill px-3 d-inline-flex align-items-center gap-1.5 fw-semibold"
          >
            <LucideReceipt  size="1em"/> Đặt lịch mới
          </Link>
        </div>
      </div>

      {/* 2. KPI FINANCIAL SUMMARY CARDS */}
      <Row className="g-3 mb-4">
        <Col md={4}>
          <div className="bms-kpi-quad-card h-100">
            <div className="d-flex justify-content-between align-items-start">
              <div>
                <div className="bms-kpi-label">Tổng viện phí đã thanh toán</div>
                <div className="bms-kpi-value text-success">{formatCurrency(stats.totalPaid)}</div>
              </div>
              <div className="bms-kpi-icon-box" style={{ background: '#ECFDF5', color: '#059669' }}>
                <LucideReceipt  size="1em"/>
              </div>
            </div>
          </div>
        </Col>
        <Col md={4}>
          <div className="bms-kpi-quad-card h-100">
            <div className="d-flex justify-content-between align-items-start">
              <div>
                <div className="bms-kpi-label">Giao dịch hoàn tất</div>
                <div className="bms-kpi-value text-primary">{stats.paidCount}</div>
              </div>
              <div className="bms-kpi-icon-box" style={{ background: '#EFF6FF', color: '#1E60E6' }}>
                <CheckCircle2  size="1em"/>
              </div>
            </div>
          </div>
        </Col>
        <Col md={4}>
          <div className="bms-kpi-quad-card h-100">
            <div className="d-flex justify-content-between align-items-start">
              <div>
                <div className="bms-kpi-label">Phiếu chờ thanh toán</div>
                <div className="bms-kpi-value text-warning">{stats.pendingCount}</div>
              </div>
              <div className="bms-kpi-icon-box" style={{ background: '#FFFBEB', color: '#D97706' }}>
                <Clock  size="1em"/>
              </div>
            </div>
          </div>
        </Col>
      </Row>

      {/* Date Range Validation Alert */}
      {isDateInvalid && (
        <Alert variant="warning" className="d-flex align-items-center gap-2 mb-3 rounded-3 border-0 bg-warning-subtle text-dark">
          <AlertTriangle className="text-warning flex-shrink-0"  size="1em"/>
          <span className="small">Ngày bắt đầu tra cứu phải trước hoặc bằng ngày kết thúc.</span>
        </Alert>
      )}

      {/* Network Error Alert */}
      {error && (
        <Alert variant="danger" className="d-flex align-items-center justify-content-between mb-3 rounded-3 border-0 bg-danger-subtle text-dark">
          <div className="d-flex align-items-center gap-2">
            <AlertTriangle className="text-danger flex-shrink-0"  size="1em"/>
            <span className="small">{error}</span>
          </div>
          <Button variant="outline-danger" size="sm" className="rounded-pill px-3" onClick={fetchInvoices}>
            <RefreshCw className="me-1"  size="1em"/> Thử lại
          </Button>
        </Alert>
      )}

      {/* 3. TOOLBAR & FILTER CONTROLS */}
      <div className="bms-filter-bar mb-3">
        <div className="bms-search-input-pill flex-grow-1" style={{ minWidth: 220 }}>
          <Search className="text-muted" size={13} />
          <input
            type="text"
            placeholder="Tìm số hóa đơn, mã giao dịch, gói khám..."
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
          />
        </div>

        <Form.Select
          size="sm"
          value={filterStatus}
          onChange={(e) => {
            setFilterStatus(e.target.value);
            setPage(1);
          }}
          style={{ width: 170 }}
        >
          <option value="ALL">Tất cả trạng thái</option>
          <option value="PAID">Đã thanh toán</option>
          <option value="PENDING">Chờ thanh toán</option>
        </Form.Select>

        <div className="d-flex align-items-center gap-1.5">
          <span className="small text-muted fw-semibold">Từ:</span>
          <Form.Control
            type="date"
            size="sm"
            value={fromDate}
            onChange={(e) => {
              setFromDate(e.target.value);
              setPage(1);
            }}
            style={{ width: 142 }}
          />
        </div>

        <div className="d-flex align-items-center gap-1.5">
          <span className="small text-muted fw-semibold">Đến:</span>
          <Form.Control
            type="date"
            size="sm"
            value={toDate}
            onChange={(e) => {
              setToDate(e.target.value);
              setPage(1);
            }}
            style={{ width: 142 }}
          />
        </div>

        {(searchKeyword || filterStatus !== 'ALL' || fromDate || toDate) && (
          <Button
            variant="outline-secondary"
            size="sm"
            className="rounded-pill px-3"
            onClick={handleResetFilters}
          >
            Đặt lại
          </Button>
        )}
      </div>

      {/* 4. TRANSACTIONS TABLE */}
      <div className="bms-table-standalone-section">
        <div className="table-responsive">
          <table className="table align-middle mb-0">
            <thead>
              <tr>
                <th>Mã hóa đơn</th>
                <th>Thời gian</th>
                <th>Gói khám</th>
                <th>Phương thức</th>
                <th className="text-end">Số tiền</th>
                <th className="text-center">Trạng thái</th>
                <th className="text-end pe-3">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-4 text-muted">
                    <Spinner animation="border" variant="primary" size="sm" className="me-2" />
                    Đang tải lịch sử thanh toán...
                  </td>
                </tr>
              ) : displayedTransactions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-5 text-muted">
                    <LucideReceipt size={28} className="d-block mx-auto mb-2 opacity-50 text-secondary" />
                    <div className="fw-semibold text-secondary">Chưa có giao dịch viện phí hoặc hóa đơn nào</div>
                    <div className="small text-muted mt-1">Các giao dịch đặt lịch xét nghiệm sẽ hiển thị tại đây.</div>
                  </td>
                </tr>
              ) : (
                displayedTransactions.map((item) => {
                  const isPaid = item.status === 'PAID';
                  return (
                    <tr key={item.id}>
                      <td>
                        <div className="fw-bold text-primary font-monospace">{item.invoiceNumber}</div>
                        {item.cqtCode && (
                          <div className="text-muted font-monospace" style={{ fontSize: 11 }}>
                            CQT: {item.cqtCode.slice(0, 14)}...
                          </div>
                        )}
                        {item.transactionCode && (
                          <div className="text-muted font-monospace" style={{ fontSize: 11 }}>
                            GD: {item.transactionCode}
                          </div>
                        )}
                      </td>
                      <td className="text-muted" style={{ fontSize: 12.5, whiteSpace: 'nowrap' }}>
                        {formatDateTime(item.paidAt)}
                      </td>
                      <td>
                        <div className="fw-semibold text-dark" style={{ fontSize: 13 }}>{item.packageName}</div>
                        <div className="text-muted" style={{ fontSize: 11.5 }}>Mã hẹn: {item.appointmentCode}</div>
                      </td>
                      <td>
                        <span className="badge bg-light text-dark rounded-pill px-2.5 py-1 fw-normal" style={{ fontSize: 11.5 }}>
                          {item.rawPaymentMethod === 'Cash' || item.paymentMethod.includes('quầy') ? (
                            <Banknote className="me-1 text-success"  size="1em"/>
                          ) : (
                            <CreditCard className="me-1 text-primary"  size="1em"/>
                          )}
                          {item.paymentMethod}
                        </span>
                      </td>
                      <td className="text-end fw-bold text-dark font-monospace" style={{ fontSize: 13.5 }}>
                        {formatCurrency(item.amount)}
                      </td>
                      <td className="text-center">
                        {isPaid ? (
                          <span className="badge bg-success-subtle text-success rounded-pill px-2.5 py-1 fw-semibold">
                            <CheckCircle2 className="me-1"  size="1em"/> Đã thanh toán
                          </span>
                        ) : (
                          <span className="badge bg-warning-subtle text-warning-emphasis rounded-pill px-2.5 py-1 fw-semibold">
                            <Clock className="me-1"  size="1em"/> Chờ thanh toán
                          </span>
                        )}
                      </td>
                      <td className="text-end pe-3">
                        {isPaid ? (
                          <button
                            type="button"
                            className="btn btn-outline-primary btn-sm rounded-pill py-1 px-3 fw-semibold d-inline-flex align-items-center gap-1.5"
                            onClick={() => handleOpenReceipt(item)}
                          >
                            <LucideReceipt  size="1em"/> Hóa đơn VAT
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="btn btn-primary btn-sm rounded-pill py-1 px-3 fw-semibold"
                            onClick={() => navigate(`/payments/checkout?invoiceId=${item.id}&appointmentId=${item.appointmentCode}&amount=${item.amount}`)}
                          >
                            Thanh toán <ArrowRight className="ms-1"  size="1em"/>
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bms-pay-pagination">
          <div className="d-flex align-items-center gap-2">
            <span className="small text-muted" style={{ fontSize: 12 }}>Hiển thị:</span>
            <Form.Select
              size="sm"
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(1);
              }}
              style={{ width: 95, height: 32, borderRadius: 6, fontSize: 12, borderColor: '#E2E8F0' }}
            >
              <option value={10}>10 dòng</option>
              <option value={20}>20 dòng</option>
              <option value={50}>50 dòng</option>
            </Form.Select>
            <span className="small text-muted ms-2" style={{ fontSize: 12 }}>
              Tổng <strong>{totalCount}</strong> giao dịch (Trang {page} / {totalPages})
            </span>
          </div>

          <div className="d-flex align-items-center gap-2">
            <Button
              variant="outline-primary"
              size="sm"
              disabled={page <= 1 || loading}
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              style={{ borderRadius: 6, fontSize: 12, padding: '4px 10px' }}
            >
              Trang trước
            </Button>
            <span className="small fw-semibold px-2" style={{ fontSize: 12 }}>
              {page} / {totalPages}
            </span>
            <Button
              variant="outline-primary"
              size="sm"
              disabled={page >= totalPages || loading}
              onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
              style={{ borderRadius: 6, fontSize: 12, padding: '4px 10px' }}
            >
              Trang sau
            </Button>
          </div>
        </div>

      {/* 6. HELPFUL FOOTER NOTICE */}
      <div className="bms-pay-footer-note">
        <div className="d-flex align-items-center gap-2">
          <Info className="text-primary flex-shrink-0"  size="1em"/>
          <span>
            Hóa đơn điện tử VAT được phát hành theo quy định của Bộ Tài chính. Quý khách có thể xuất trình mã tra cứu CQT khi làm thủ tục tại cơ sở y tế.
          </span>
        </div>
        <div>
          <span>Hotline hỗ trợ: <strong className="text-dark">1900 6868</strong></span>
        </div>
      </div>

      {/* 7. OFFICIAL ELECTRONIC VAT INVOICE MODAL (NGHỊ ĐỊNH 123/2020/NĐ-CP) */}
      <VatInvoiceModal
        show={showReceiptModal}
        onClose={() => setShowReceiptModal(false)}
        invoiceData={selectedReceipt}
        patientData={patientProfile || storedUser}
      />
    </div>
  );
}
