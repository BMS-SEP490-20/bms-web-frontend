/**
 * Appointment checkout. Shows a SePay VietQR and waits for the bank webhook to confirm the appointment.
 */
import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import api from '../../../config/api';
import './ProcessPaymentPage.css';

function money(value) {
  return `${new Intl.NumberFormat('vi-VN').format(value || 0)} đ`;
}

function Invoice({ checkout, onDone, onBack }) {
  return (
    <section className="bms-sepay-card">
      <header className="bms-sepay-head">
        <div>
          <p>Phiếu thanh toán</p>
          <h1>{checkout.appointmentCode}</h1>
        </div>
        <span className={`bms-sepay-status${checkout.paid ? ' is-paid' : ''}`}>
          {checkout.paid ? null : <i />}
          {checkout.paid ? 'Đã thanh toán' : 'Đang chờ thanh toán'}
        </span>
      </header>

      {!checkout.paid && checkout.qrUrl ? <img src={checkout.qrUrl} alt="Mã QR chuyển khoản" /> : null}

      <h2>Lịch khám</h2>
      <dl>
        <div><dt>Gói xét nghiệm</dt><dd>{checkout.packageName || '—'}</dd></div>
        <div><dt>Ngày khám</dt><dd>{checkout.visitDate || '—'}</dd></div>
        <div><dt>Khung giờ</dt><dd>{checkout.slotTime || '—'}</dd></div>
        <div><dt>Bác sĩ</dt><dd>{checkout.doctorName || '—'}</dd></div>
        <div><dt>Phòng</dt><dd>{checkout.roomName || '—'}</dd></div>
      </dl>

      <h2>Chuyển khoản</h2>
      <dl>
        <div><dt>Ngân hàng</dt><dd>{checkout.bankCode || '—'}</dd></div>
        <div><dt>Số tài khoản</dt><dd>{checkout.accountNumber || '—'}</dd></div>
        <div><dt>Chủ tài khoản</dt><dd>{checkout.accountName || '—'}</dd></div>
        <div><dt>Nội dung</dt><dd>{checkout.transferContent || '—'}</dd></div>
        {checkout.paid ? <div><dt>Mã giao dịch</dt><dd>{checkout.transactionId || '—'}</dd></div> : null}
        {checkout.paid ? <div><dt>Thời điểm</dt><dd>{checkout.paidAt || '—'}</dd></div> : null}
        <div className="is-amount"><dt>Số tiền</dt><dd>{money(checkout.amount)}</dd></div>
      </dl>

      {checkout.paid ? (
        <button type="button" className="bms-sepay-done" onClick={onDone}>Xem lịch của tôi</button>
      ) : null}
      <button type="button" className="bms-sepay-back" onClick={onBack}>Quay lại</button>
    </section>
  );
}

export default function ProcessPaymentPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const appointmentId = searchParams.get('appointmentId') || searchParams.get('id') || '';
  const [checkout, setCheckout] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [paidNotice, setPaidNotice] = useState(false);
  const noticed = useRef(false);

  useEffect(() => {
    if (!checkout?.paid || noticed.current) return undefined;
    noticed.current = true;
    setPaidNotice(true);
    const hide = setTimeout(() => setPaidNotice(false), 4000);
    return () => clearTimeout(hide);
  }, [checkout?.paid]);

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
    let settled = false;
    const timer = setInterval(async () => {
      if (settled) return;
      try {
        const res = await api.get(`/payments/sepay/status/${encodeURIComponent(appointmentId)}`);
        if (!active) return;
        if (res.data?.data?.paid) {
          settled = true;
          clearInterval(timer);
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
        <span className="bms-sepay-status"><i />Đang tải phiếu</span>
      </div>
    );
  }

  if (error || !checkout) {
    return (
      <div className="bms-sepay-page">
        <p>{error || 'Không tải được phiếu thanh toán.'}</p>
        <Link to="/appointments">Về lịch khám</Link>
      </div>
    );
  }

  return (
    <div className="bms-sepay-page">
      {paidNotice ? <div className="bms-sepay-toast" role="status">Đã nhận thanh toán.</div> : null}
      <Invoice checkout={checkout} onDone={() => navigate('/appointments')} onBack={() => navigate(-1)} />
    </div>
  );
}
