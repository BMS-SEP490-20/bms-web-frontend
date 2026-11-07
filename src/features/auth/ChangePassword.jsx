/**
 * @file ChangePassword.jsx
 * @description Authenticated user self-service password update screen (UC07).
 * Validates current credentials and enforces password strength complexity (BR-IAM-01).
 * Conforms to: OWASP Authentication Guidelines & AGENTS-DESIGN.md.
 */

import React, { useState } from 'react';
import { Alert, ProgressBar, Spinner } from 'react-bootstrap';
import api from '../../config/api';

/**
 * Change password form component providing visual complexity meters and credential verification.
 *
 * @returns {JSX.Element} Rendered password change interface.
 */
const ChangePassword = () => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Password strength score
  const getPasswordStrength = (pwd) => {
    if (!pwd) return { score: 0, label: '', variant: 'danger' };
    let score = 0;
    if (pwd.length >= 6) score += 25;
    if (pwd.length >= 10) score += 25;
    if (/[A-Z]/.test(pwd)) score += 25;
    if (/[0-9!@#$%^&*]/.test(pwd)) score += 25;

    if (score <= 25) return { score, label: 'Yếu', variant: 'danger' };
    if (score <= 50) return { score, label: 'Trung bình', variant: 'warning' };
    if (score <= 75) return { score, label: 'Khá', variant: 'info' };
    return { score: 100, label: 'Rất mạnh', variant: 'success' };
  };

  const strength = getPasswordStrength(newPassword);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!currentPassword) {
      setErrorMsg('Vui lòng nhập mật khẩu hiện tại.');
      return;
    }
    if (newPassword.length < 6) {
      setErrorMsg('Mật khẩu mới phải có tối thiểu 6 ký tự.');
      return;
    }
    if (newPassword === currentPassword) {
      setErrorMsg('Mật khẩu mới không được trùng với mật khẩu hiện tại.');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setErrorMsg('Mật khẩu xác nhận không khớp.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.post('/auth/passwords/change', {
        currentPassword,
        newPassword,
        confirmNewPassword
      });
      setSuccessMsg(res.data?.message || 'Đổi mật khẩu thành công!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Đổi mật khẩu thất bại. Vui lòng kiểm tra mật khẩu hiện tại.';
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bms-password-page">
      <header className="bms-page-header">
        <h1 className="bms-page-title">Đổi mật khẩu</h1>
      </header>
      <form className="bms-password-card" onSubmit={handleSubmit}>
        {errorMsg && <Alert variant="danger" dismissible onClose={() => setErrorMsg('')}>{errorMsg}</Alert>}
        {successMsg && <Alert variant="success" dismissible onClose={() => setSuccessMsg('')}>{successMsg}</Alert>}

        <label className="bms-password-field">
          Mật khẩu hiện tại
          <span>
            <input
              type={showCurrent ? 'text' : 'password'}
              placeholder="Nhập mật khẩu hiện tại"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
            />
            <button type="button" onClick={() => setShowCurrent(!showCurrent)} aria-label="Hiện mật khẩu hiện tại">
              {showCurrent ? 'Ẩn' : 'Hiện'}
            </button>
          </span>
        </label>

        <label className="bms-password-field">
          Mật khẩu mới
          <span>
            <input
              type={showNew ? 'text' : 'password'}
              placeholder="Tối thiểu 6 ký tự"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
            />
            <button type="button" onClick={() => setShowNew(!showNew)} aria-label="Hiện mật khẩu mới">
              {showNew ? 'Ẩn' : 'Hiện'}
            </button>
          </span>
        </label>
        {newPassword && (
          <div className="bms-password-strength">
            <div><span>Độ mạnh</span><strong>{strength.label}</strong></div>
            <ProgressBar now={strength.score} variant={strength.variant} />
          </div>
        )}

        <label className="bms-password-field">
          Xác nhận mật khẩu mới
          <span>
            <input
              type={showConfirm ? 'text' : 'password'}
              placeholder="Nhập lại mật khẩu mới"
              value={confirmNewPassword}
              onChange={(e) => setConfirmNewPassword(e.target.value)}
              required
            />
            <button type="button" onClick={() => setShowConfirm(!showConfirm)} aria-label="Hiện mật khẩu xác nhận">
              {showConfirm ? 'Ẩn' : 'Hiện'}
            </button>
          </span>
        </label>

        <div className="bms-password-actions">
          <button type="button" className="is-ghost" onClick={() => { setCurrentPassword(''); setNewPassword(''); setConfirmNewPassword(''); }}>
            Hủy bỏ
          </button>
          <button type="submit" className="is-primary" disabled={loading}>
            {loading ? <Spinner animation="border" size="sm" /> : 'Cập nhật mật khẩu'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ChangePassword;
