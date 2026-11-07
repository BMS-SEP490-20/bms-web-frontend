/**
 * Appointment checkout. Shows a SePay VietQR and waits for the bank webhook to confirm the appointment.
 */
import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Spinner } from 'react-bootstrap';
import api from '../../../config/api';
import './ProcessPaymentPage.css';

export default function ProcessPaymentPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const appointmentId = searchParams.get('appointmentId') || searchParams.get('id') || '';
  const [checkout, setCheckout] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!appointmentId) {
      setError('Thiếu mã lịch hẹn.');
      setLoading(false);
      return undefined;
    }

    let active = true;
    const load = async () => {
      try {
        const res = await api.get(`/payments/sepay/checkout/${encodeURIComponent(appointmentId)}`);
        if (!active) return;
        setCheckout(res.data?.data || null);
        setError('');
      } catch (err) {
        if (!active) return;
        setError(err?.response?.data?.message || 'Không tải được phiếu thanh toán.');
      } finally {
        if (active) setLoading(false);
      }
    };

    load();
    const timer = setInterval(async () => {
      try {
        const res = await api.get(`/payments/sepay/status/${encodeURIComponent(appointmentId)}`);
        if (!active) return;
        if (res.data?.data?.paid) {
          const full = await api.get(`/payments/sepay/checkout/${encodeURIComponent(appointmentId)}`);
          if (!active) return;
          setCheckout(full.data?.data || null);
        }
      } catch {
        // Keep the QR on screen while the status call retries.
      }
    }, 3000);

    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [appointmentId]);

  if (loading) {
    return (
      <div className="bms-sepay-page">
        <Spinner animation="border" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bms-sepay-page">
        <p>{error}</p>
        <Link to="/appointments">Về lịch khám</Link>
      </div>
    );
  }

  if (checkout?.paid) {
    return (
      <div className="bms-sepay-page">
        <section className="bms-sepay-card bms-receipt">
          <p className="bms-receipt-state">Đã thanh toán</p>
          <h1>Hóa đơn giữ chỗ</h1>
          <p className="bms-receipt-code">{checkout.appointmentCode}</p>
          <dl>
            <div><dt>Gói xét nghiệm</dt><dd>{checkout.packageName || '—'}</dd></div>
            <div><dt>Ngày khám</dt><dd>{checkout.visitDate || '—'}</dd></div>
            <div><dt>Giờ lấy mẫu</dt><dd>{checkout.slotTime || '—'}</dd></div>
            <div><dt>Bác sĩ</dt><dd>{checkout.doctorName || '—'}</dd></div>
            <div><dt>Nội dung chuyển khoản</dt><dd>{checkout.transferContent}</dd></div>
            <div><dt>Mã giao dịch</dt><dd>{checkout.transactionId || '—'}</dd></div>
            <div><dt>Thời điểm</dt><dd>{checkout.paidAt || '—'}</dd></div>
            <div className="is-amount"><dt>Số tiền</dt><dd>{new Intl.NumberFormat('vi-VN').format(checkout.amount)} đ</dd></div>
          </dl>
          <button type="button" onClick={() => navigate('/appointments')}>Xem lịch của tôi</button>
        </section>
      </div>
    );
  }

  return (
    <div className="bms-sepay-page">
      <section className="bms-sepay-card">
        <h1>Chuyển khoản</h1>
        <p className="bms-sepay-code">{checkout.appointmentCode}</p>
        <img src={checkout.qrUrl} alt="Mã QR chuyển khoản" />
        <dl>
          <div><dt>Ngân hàng</dt><dd>{checkout.bankCode}</dd></div>
          <div><dt>Số tài khoản</dt><dd>{checkout.accountNumber}</dd></div>
          <div><dt>Chủ tài khoản</dt><dd>{checkout.accountName || '—'}</dd></div>
          <div><dt>Số tiền</dt><dd>{new Intl.NumberFormat('vi-VN').format(checkout.amount)} đ</dd></div>
          <div><dt>Nội dung</dt><dd>{checkout.transferContent}</dd></div>
        </dl>
        <p className="bms-sepay-wait">Đang chờ tiền vào tài khoản. Trang tự xác nhận khi SePay báo đã nhận.</p>
      </section>
    </div>
  );
}
