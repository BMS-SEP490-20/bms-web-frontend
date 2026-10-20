import React, { useState, useEffect } from 'react';
import {
  getInvoices,
  createInvoice,
  payInvoice,
  getReceiptPrintData
} from '../api/billingApi';
import ReceiptPrintModal from '../components/ReceiptPrintModal';

export default function BillingInvoicesPage() {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Modals
  const [printData, setPrintData] = useState(null);
  const [showPayModal, setShowPayModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState(1); // 1: Cash, 2: VNPay, 3: BankTransfer, 4: POS Card

  // New Invoice Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newPatientName, setNewPatientName] = useState('');
  const [newPatientPhone, setNewPatientPhone] = useState('');
  const [newItemName, setNewItemName] = useState('Khám Nội Tổng Quát + Xét Nghiệm Máu');
  const [newItemPrice, setNewItemPrice] = useState(350000);
  const [newDiscount, setNewDiscount] = useState(0);

  useEffect(() => {
    loadInvoices();
  }, [statusFilter]);

  async function loadInvoices() {
    setLoading(true);
    try {
      const res = await getInvoices({ status: statusFilter });
      if (res.data) setInvoices(res.data);
    } catch (err) {
      setError(err.message || 'Không thể tải danh sách hóa đơn.');
    } finally {
      setLoading(false);
    }
  }

  const handleOpenPrint = async (invoice) => {
    if (invoice.status !== 1 && invoice.status !== 'Paid') {
      alert('Chỉ có thể in biên lai cho hóa đơn đã thanh toán thành công (Status: Paid). Vui lòng thanh toán trước.');
      return;
    }

    try {
      setLoading(true);
      const res = await getReceiptPrintData(invoice.id);
      if (res.data) {
        setPrintData(res.data);
      }
    } catch (err) {
      alert(err.message || 'Không thể lấy dữ liệu in biên lai.');
    } finally {
      setLoading(false);
    }
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
      setSuccessMsg(`Thanh toán hóa đơn ${selectedInvoice.invoiceCode} thành công!`);
      setTimeout(() => setSuccessMsg(null), 3000);
      await loadInvoices();
    } catch (err) {
      alert(err.message || 'Lỗi xử lý thanh toán.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateInvoice = async (e) => {
    e.preventDefault();
    if (!newPatientName.trim()) {
      alert('Vui lòng nhập họ tên bệnh nhân.');
      return;
    }

    const payload = {
      patientId: `PAT-${Date.now().toString().slice(-6)}`,
      patientName: newPatientName.trim(),
      patientPhone: newPatientPhone.trim(),
      items: [
        {
          itemCode: 'SRV-01',
          itemName: newItemName,
          quantity: 1,
          unitPrice: Number(newItemPrice)
        }
      ],
      discountAmount: Number(newDiscount)
    };

    try {
      setLoading(true);
      await createInvoice(payload);
      setShowCreateModal(false);
      setNewPatientName('');
      setNewPatientPhone('');
      setSuccessMsg('Đã tạo hóa đơn thu phí mới thành công.');
      setTimeout(() => setSuccessMsg(null), 3000);
      await loadInvoices();
    } catch (err) {
      alert(err.message || 'Lỗi tạo hóa đơn.');
    } finally {
      setLoading(false);
    }
  };

  // Filtered list by search
  const filteredInvoices = invoices.filter(inv => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      inv.invoiceCode?.toLowerCase().includes(term) ||
      inv.patientName?.toLowerCase().includes(term) ||
      inv.patientPhone?.includes(term)
    );
  });

  const totalPaid = invoices
    .filter(i => i.status === 1 || i.status === 'Paid')
    .reduce((sum, i) => sum + (i.totalAmount || 0), 0);

  const totalPending = invoices
    .filter(i => i.status === 0 || i.status === 'Unpaid')
    .reduce((sum, i) => sum + (i.totalAmount || 0), 0);

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto', fontFamily: 'Inter, system-ui, sans-serif', color: '#1e293b' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', borderBottom: '1px solid #e2e8f0', paddingBottom: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#0f172a', margin: 0 }}>
              Quản lý Viện Phí &amp; In Biên Lai K80 (POS Billing)
            </h1>
            <span style={{ backgroundColor: '#ecfdf5', color: '#059669', fontSize: '11px', fontWeight: '700', padding: '3px 8px', borderRadius: '12px', border: '1px solid #a7f3d0' }}>
              UC43 COMPLIANT
            </span>
          </div>
          <p style={{ margin: '6px 0 0', color: '#64748b', fontSize: '14px' }}>
            Thu tiền viện phí tại quầy, chống in đè gian lận (Anti-fraud Reprint Count), chuyển đổi tiền bằng chữ và in nhiệt K80.
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          style={{
            padding: '10px 20px',
            borderRadius: '8px',
            border: 'none',
            backgroundColor: '#2563eb',
            color: '#ffffff',
            fontWeight: '600',
            cursor: 'pointer',
            boxShadow: '0 2px 4px rgba(37,99,235,0.2)',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          ➕ Tạo Hóa Đơn Thu Phí Mới
        </button>
      </div>

      {/* Notifications */}
      {error && (
        <div style={{ padding: '12px 16px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', color: '#991b1b', marginBottom: '16px' }}>
          ⚠️ {error}
        </div>
      )}
      {successMsg && (
        <div style={{ padding: '12px 16px', backgroundColor: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: '8px', color: '#065f46', marginBottom: '16px' }}>
          ✅ {successMsg}
        </div>
      )}

      {/* Metrics Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}>
        <div style={{ backgroundColor: '#ffffff', padding: '18px 20px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ fontSize: '13px', color: '#64748b', fontWeight: '500' }}>Doanh Thu Đã Thu (Paid)</div>
          <div style={{ fontSize: '24px', fontWeight: '800', color: '#16a34a', marginTop: '6px' }}>
            {totalPaid.toLocaleString('vi-VN')} <span style={{ fontSize: '14px' }}>VNĐ</span>
          </div>
        </div>

        <div style={{ backgroundColor: '#ffffff', padding: '18px 20px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ fontSize: '13px', color: '#64748b', fontWeight: '500' }}>Chờ Thu Phí (Unpaid)</div>
          <div style={{ fontSize: '24px', fontWeight: '800', color: '#d97706', marginTop: '6px' }}>
            {totalPending.toLocaleString('vi-VN')} <span style={{ fontSize: '14px' }}>VNĐ</span>
          </div>
        </div>

        <div style={{ backgroundColor: '#ffffff', padding: '18px 20px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ fontSize: '13px', color: '#64748b', fontWeight: '500' }}>Tổng Hóa Đơn Trong Ca</div>
          <div style={{ fontSize: '24px', fontWeight: '800', color: '#0f172a', marginTop: '6px' }}>
            {invoices.length} <span style={{ fontSize: '14px', fontWeight: '500', color: '#64748b' }}>hóa đơn</span>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', backgroundColor: '#ffffff', padding: '12px 16px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
        <input
          type="text"
          placeholder="🔍 Tìm theo mã HĐ, tên bệnh nhân, số điện thoại..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ flex: 1, padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }}
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{ padding: '8px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', backgroundColor: '#ffffff' }}
        >
          <option value="">Tất cả trạng thái</option>
          <option value="1">Đã thanh toán (Paid)</option>
          <option value="0">Chưa thanh toán (Unpaid)</option>
        </select>
        <button
          onClick={loadInvoices}
          style={{ padding: '8px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#f8fafc', fontSize: '13px', cursor: 'pointer', fontWeight: '600' }}
        >
          🔄 Làm mới
        </button>
      </div>

      {/* Invoices Table */}
      <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
          <thead>
            <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>
              <th style={{ padding: '12px 16px' }}>Mã Hóa Đơn</th>
              <th style={{ padding: '12px 16px' }}>Bệnh Nhân</th>
              <th style={{ padding: '12px 16px' }}>Dịch Vụ</th>
              <th style={{ padding: '12px 16px' }}>Số Tiền</th>
              <th style={{ padding: '12px 16px' }}>Trạng Thái</th>
              <th style={{ padding: '12px 16px' }}>Số Lần In</th>
              <th style={{ padding: '12px 16px' }}>Thời Gian</th>
              <th style={{ padding: '12px 16px', textAlign: 'center' }}>Thao Tác</th>
            </tr>
          </thead>
          <tbody>
            {filteredInvoices.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ padding: '36px', textAlign: 'center', color: '#94a3b8' }}>
                  {loading ? 'Đang tải dữ liệu viện phí...' : 'Không có hóa đơn nào phù hợp với bộ lọc.'}
                </td>
              </tr>
            ) : (
              filteredInvoices.map((inv) => {
                const isPaid = inv.status === 1 || inv.status === 'Paid';

                return (
                  <tr key={inv.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px 16px', fontWeight: '700', color: '#1e40af' }}>
                      {inv.invoiceCode}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ fontWeight: '600', color: '#0f172a' }}>{inv.patientName || 'Khách hàng'}</div>
                      <div style={{ fontSize: '12px', color: '#64748b' }}>{inv.patientPhone || 'Chưa có SĐT'}</div>
                    </td>
                    <td style={{ padding: '12px 16px', color: '#475569', fontSize: '13px' }}>
                      {inv.items?.length || 0} mục dịch vụ
                    </td>
                    <td style={{ padding: '12px 16px', fontWeight: '700', color: '#0f172a' }}>
                      {Number(inv.totalAmount).toLocaleString('vi-VN')} đ
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{
                        display: 'inline-block',
                        padding: '4px 10px',
                        borderRadius: '12px',
                        fontSize: '12px',
                        fontWeight: '600',
                        backgroundColor: isPaid ? '#dcfce7' : '#fef3c7',
                        color: isPaid ? '#166534' : '#92400e'
                      }}>
                        {isPaid ? '✓ Đã Thanh Toán' : 'Chờ Thanh Toán'}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      {inv.printCount > 0 ? (
                        <span style={{
                          fontSize: '12px',
                          fontWeight: '600',
                          color: inv.printCount > 1 ? '#b91c1c' : '#475569',
                          backgroundColor: inv.printCount > 1 ? '#fee2e2' : '#f1f5f9',
                          padding: '2px 8px',
                          borderRadius: '8px'
                        }}>
                          {inv.printCount > 1 ? `In lại (${inv.printCount} lần)` : 'Đã in (1 lần)'}
                        </span>
                      ) : (
                        <span style={{ color: '#94a3b8', fontSize: '12px' }}>Chưa in</span>
                      )}
                    </td>
                    <td style={{ padding: '12px 16px', color: '#64748b', fontSize: '13px' }}>
                      {new Date(inv.createdAt).toLocaleString('vi-VN')}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                      <div style={{ display: 'inline-flex', gap: '8px' }}>
                        {!isPaid && (
                          <button
                            onClick={() => { setSelectedInvoice(inv); setShowPayModal(true); }}
                            style={{
                              padding: '6px 12px',
                              borderRadius: '6px',
                              border: 'none',
                              backgroundColor: '#10b981',
                              color: '#ffffff',
                              fontSize: '12px',
                              fontWeight: '600',
                              cursor: 'pointer'
                            }}
                          >
                            💳 Thu Tiền POS
                          </button>
                        )}
                        {isPaid && (
                          <button
                            onClick={() => handleOpenPrint(inv)}
                            style={{
                              padding: '6px 12px',
                              borderRadius: '6px',
                              border: '1px solid #cbd5e1',
                              backgroundColor: '#ffffff',
                              color: '#2563eb',
                              fontSize: '12px',
                              fontWeight: '600',
                              cursor: 'pointer'
                            }}
                          >
                            🖨️ In Biên Lai K80
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Modal: Process Payment */}
      {showPayModal && selectedInvoice && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999 }}>
          <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', padding: '24px', width: '100%', maxWidth: '440px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: '18px', fontWeight: '700' }}>
              Xác Nhận Thu Tiền Viện Phí
            </h3>
            <div style={{ backgroundColor: '#f8fafc', padding: '12px', borderRadius: '8px', marginBottom: '16px', fontSize: '14px' }}>
              <div>Mã HĐ: <strong>{selectedInvoice.invoiceCode}</strong></div>
              <div>Bệnh nhân: <strong>{selectedInvoice.patientName}</strong></div>
              <div style={{ fontSize: '18px', fontWeight: '800', color: '#16a34a', marginTop: '8px' }}>
                Tổng thu: {Number(selectedInvoice.totalAmount).toLocaleString('vi-VN')} VNĐ
              </div>
            </div>

            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>
              Hình thức thanh toán:
            </label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', marginBottom: '20px', fontSize: '14px' }}
            >
              <option value="1">Tiền mặt (Cash)</option>
              <option value="2">VNPay QR</option>
              <option value="3">Chuyển khoản Ngân hàng</option>
              <option value="4">Thẻ POS (Visa/Master)</option>
            </select>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setShowPayModal(false)}
                style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff', cursor: 'pointer' }}
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={handlePayInvoice}
                style={{ padding: '8px 20px', borderRadius: '8px', border: 'none', backgroundColor: '#10b981', color: '#ffffff', fontWeight: '600', cursor: 'pointer' }}
              >
                {loading ? 'Đang xử lý...' : '✓ Xác Nhận Đã Thu Tiền'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Create Invoice */}
      {showCreateModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999 }}>
          <form onSubmit={handleCreateInvoice} style={{ backgroundColor: '#ffffff', borderRadius: '12px', padding: '24px', width: '100%', maxWidth: '480px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: '18px', fontWeight: '700' }}>
              Tạo Hóa Đơn Thu Phí Mới
            </h3>

            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '4px' }}>Tên Bệnh Nhân *</label>
              <input
                type="text"
                required
                value={newPatientName}
                onChange={(e) => setNewPatientName(e.target.value)}
                placeholder="Nguyễn Văn A"
                style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }}
              />
            </div>

            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '4px' }}>Số Điện Thoại</label>
              <input
                type="text"
                value={newPatientPhone}
                onChange={(e) => setNewPatientPhone(e.target.value)}
                placeholder="0912345678"
                style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }}
              />
            </div>

            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '4px' }}>Gói Dịch Vụ / Xét Nghiệm</label>
              <input
                type="text"
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '4px' }}>Đơn Giá (VNĐ)</label>
                <input
                  type="number"
                  value={newItemPrice}
                  onChange={(e) => setNewItemPrice(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '4px' }}>Miễn Giảm (VNĐ)</label>
                <input
                  type="number"
                  value={newDiscount}
                  onChange={(e) => setNewDiscount(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff', cursor: 'pointer' }}
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={loading}
                style={{ padding: '8px 20px', borderRadius: '8px', border: 'none', backgroundColor: '#2563eb', color: '#ffffff', fontWeight: '600', cursor: 'pointer' }}
              >
                Tạo Hóa Đơn
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal: Thermal K80 Print Preview */}
      {printData && (
        <ReceiptPrintModal
          printData={printData}
          onClose={() => setPrintData(null)}
        />
      )}
    </div>
  );
}
