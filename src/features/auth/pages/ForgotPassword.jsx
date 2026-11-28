/**
 * @file ForgotPassword.jsx
 * @description Password recovery: (1) email OTP → (2) verify OTP → (3) set new password.
 * Conforms to: NIST SP 800-63B, BR-IAM-01 & AGENTS-DESIGN.md.
 */

import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Key, Mail, Lock, CheckCircle2, AlertCircle, ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { sendPasswordRecoveryOtp, verifyPasswordResetOtp } from "../api/authApi";
import api from "../../../config/api";
import OtpInputGroup from "../../../components/common/OtpInputGroup";
import "../styles/ForgotPassword.css";

export default function ForgotPassword({
  onBackToLogin,
  onRegister,
  onOtpSent,
  showBrandLogo = false }) {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [countdown, setCountdown] = useState(60);

  useEffect(() => {
    let timer;
    if (step === 2 && countdown > 0) {
      timer = setInterval(() => setCountdown(prev => prev - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [step, countdown]);

  const validateEmail = (value) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

  const stepLabel =
    step === 1 ? "Bước 1: Xác thực Email" :
    step === 2 ? "Bước 2: Xác nhận mã OTP" :
    "Bước 3: Thiết lập mật khẩu mới";

  const stepTitle =
    step === 1 ? "Khôi Phục Mật Khẩu" :
    step === 2 ? "Xác Nhận Mã OTP" :
    "Đặt Lại Mật Khẩu";

  const stepSubtitle =
    step === 1
      ? "Nhập địa chỉ email đăng ký để nhận mã xác thực một lần (OTP)."
      : step === 2
        ? `Nhập mã OTP 6 chữ số đã gửi đến ${email}.`
        : "OTP đã xác thực. Tạo mật khẩu mới theo quy định bảo mật BMS.";

  async function handleSendOtp(e) {
    e?.preventDefault?.();
    setMessage("");
    setError("");

    if (!email.trim()) {
      setError("Vui lòng nhập địa chỉ Email đăng ký tài khoản BMS.");
      return;
    }

    if (!validateEmail(email)) {
      setError("Địa chỉ Email không đúng định dạng chuẩn.");
      return;
    }

    try {
      setLoading(true);
      await sendPasswordRecoveryOtp(email.trim());
      setMessage(`Mã OTP khôi phục gồm 6 chữ số đã được gửi đến: ${email}`);
      setOtpCode("");
      setStep(2);
      setCountdown(60);
      onOtpSent?.(email.trim());
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data?.title || err.message || "Không thể gửi mã khôi phục. Vui lòng kiểm tra lại địa chỉ email.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOtp(e) {
    e.preventDefault();
    setMessage("");
    setError("");

    if (!otpCode || otpCode.trim().length !== 6) {
      setError("Vui lòng nhập đủ 6 chữ số của mã OTP.");
      return;
    }

    try {
      setLoading(true);
      const data = await verifyPasswordResetOtp(email.trim(), otpCode.trim());
      setMessage(data?.message || "Mã OTP hợp lệ. Tiếp tục đặt mật khẩu mới.");
      setNewPassword("");
      setConfirmPassword("");
      setStep(3);
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data?.Message || err.response?.data?.title || "Mã OTP không hợp lệ. Vui lòng thử lại.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  async function handleResetPassword(e) {
    e.preventDefault();
    setMessage("");
    setError("");

    if (newPassword.length < 8) {
      setError("Mật khẩu mới phải có ít nhất 8 ký tự.");
      return;
    }

    const hasUpper = /[A-Z]/.test(newPassword);
    const hasLower = /[a-z]/.test(newPassword);
    const hasNumber = /[0-9]/.test(newPassword);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(newPassword);
    if (!hasUpper || !hasLower || !hasNumber || !hasSpecial) {
      setError("Mật khẩu mới phải bao gồm ít nhất 1 chữ hoa, 1 chữ thường, 1 số và 1 ký tự đặc biệt.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Mật khẩu xác nhận không khớp.");
      return;
    }

    try {
      setLoading(true);
      await api.post("/auth/reset", {
        email: email.trim(),
        otp: otpCode.trim(),
        newPassword,
        confirmNewPassword: confirmPassword
      });
      window.location.href = "/login?reset=true";
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data?.Message || err.response?.data?.title || "Đặt lại mật khẩu thất bại. Vui lòng kiểm tra mã OTP.";
      setError(msg);
      if (String(msg).toLowerCase().includes("otp") || err.response?.data?.errorCode?.startsWith?.("OTP_")) {
        setStep(2);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="d-flex flex-column align-items-center px-1">
      {showBrandLogo && (
        <div className="text-center mb-4">
          <Link to="/" className="d-inline-block text-decoration-none">
            <img
              src="/assets/bms-logo.png"
              alt="BMS Logo"
              style={{ width: "148px", height: "auto", maxHeight: "44px", objectFit: "contain" }}
            />
          </Link>
        </div>
      )}
      <section className="card border rounded-4 p-4 p-md-5 shadow-none w-100 mx-auto" style={{ maxWidth: "460px", borderColor: "#EAEEF4", backgroundColor: "#FFFFFF" }} aria-label="Khôi phục mật khẩu">
        <div className="bms-form-inner">
          <div className="d-inline-flex align-items-center justify-content-center rounded-3 mb-3" style={{ width: 44, height: 44, backgroundColor: "#EFF6FF", color: "#1E60E6" }}>
            <Key  size="1em"/>
          </div>

          <div className="small fw-semibold text-primary text-uppercase mb-1" style={{ fontSize: "11.5px", letterSpacing: "0.04em" }}>
            {stepLabel}
          </div>
          <h1 className="h4 fw-bold text-dark mb-1">{stepTitle}</h1>
          <p className="text-muted small mb-4">{stepSubtitle}</p>

          {error && (
            <div className="alert alert-danger border-0 rounded-3 d-flex align-items-start gap-2 small py-2.5 px-3 mb-3" role="alert">
              <AlertCircle className="flex-shrink-0 mt-0.5 text-danger"  size="1em"/>
              <div>
                <span>{error}</span>
                {error.includes("không tồn tại") && (
                  <div className="mt-1">
                    <Link to="/register" className="fw-bold text-decoration-underline text-danger" style={{ fontSize: "0.85rem" }}>
                      Chưa có tài khoản? Đăng ký ngay
                    </Link>
                  </div>
                )}
              </div>
            </div>
          )}

          {message && (
            <div className="alert alert-success border-0 rounded-3 d-flex align-items-center gap-2 small py-2.5 px-3 mb-3" role="status">
              <CheckCircle2 className="flex-shrink-0 text-success"  size="1em"/>
              <span>{message}</span>
            </div>
          )}

          {step === 1 && (
            <form onSubmit={handleSendOtp} noValidate>
              <div className="bms-field">
                <label htmlFor="recovery-email">
                  Địa chỉ Email đăng ký <span aria-hidden="true" className="text-danger">*</span>
                </label>
                <div className="bms-input-wrap">
                  <Mail className="text-muted"  size="1em"/>
                  <input
                    id="recovery-email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    autoCorrect="off"
                    autoCapitalize="off"
                    spellCheck={false}
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setError("");
                      setMessage("");
                    }}
                    required
                    disabled={loading}
                  />
                </div>
              </div>

              <button className="bms-submit-btn mt-3" type="submit" disabled={loading}>
                {loading ? (
                  <>
                    <span className="bms-spinner" aria-hidden="true" />
                    Đang Gửi Mã OTP...
                  </>
                ) : (
                  "Gửi Mã Khôi Phục"
                )}
              </button>
            </form>
          )}

          {step === 2 && (
            <form onSubmit={handleVerifyOtp} noValidate>
              <div className="bms-field text-center mb-3">
                <label className="fw-semibold small d-block mb-2">Nhập 6 Chữ Số Mã OTP</label>
                <div className="d-flex justify-content-center">
                  <OtpInputGroup
                    value={otpCode}
                    onChange={setOtpCode}
                    hasError={Boolean(error && error.toLowerCase().includes("otp"))}
                    disabled={loading}
                  />
                </div>
                <div className="small text-muted mt-2">
                  {countdown > 0 ? (
                    <span>Gửi lại sau <strong>{countdown}s</strong></span>
                  ) : (
                    <button
                      type="button"
                      className="btn btn-link p-0 small text-primary"
                      onClick={handleSendOtp}
                      disabled={loading}
                    >
                      Gửi lại mã OTP
                    </button>
                  )}
                </div>
              </div>

              <button className="bms-submit-btn" type="submit" disabled={loading || otpCode.length !== 6}>
                {loading ? (
                  <>
                    <span className="bms-spinner" aria-hidden="true" />
                    Đang Xác Nhận OTP...
                  </>
                ) : (
                  "Xác Nhận OTP"
                )}
              </button>

              <button
                type="button"
                className="btn btn-link text-muted small w-100 mt-2 text-decoration-none"
                onClick={() => {
                  setStep(1);
                  setOtpCode("");
                  setError("");
                  setMessage("");
                }}
              >
                Đổi email khác
              </button>
            </form>
          )}

          {step === 3 && (
            <form onSubmit={handleResetPassword} noValidate>
              <div className="bms-field mb-2">
                <label htmlFor="new-password">Mật khẩu mới (Tối thiểu 8 ký tự) <span className="text-danger">*</span></label>
                <div className="bms-input-wrap d-flex align-items-center">
                  <Lock className="text-muted ms-2"  size="1em"/>
                  <input
                    id="new-password"
                    type={showNewPassword ? "text" : "password"}
                    placeholder="Mật khẩu mới"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    disabled={loading}
                    style={{ flex: 1 }}
                  />
                  <button
                    type="button"
                    className="btn btn-link p-1 text-muted me-2"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    aria-label="Ẩn hiện mật khẩu mới"
                  >
                    {showNewPassword ? <EyeOff  size="1em"/> : <Eye  size="1em"/>}
                  </button>
                </div>
              </div>

              <div className="bms-field mb-3">
                <label htmlFor="confirm-password">Xác nhận mật khẩu mới <span className="text-danger">*</span></label>
                <div className="bms-input-wrap d-flex align-items-center">
                  <Lock className="text-muted ms-2"  size="1em"/>
                  <input
                    id="confirm-password"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Nhập lại mật khẩu mới"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    disabled={loading}
                    style={{ flex: 1 }}
                  />
                  <button
                    type="button"
                    className="btn btn-link p-1 text-muted me-2"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    aria-label="Ẩn hiện xác nhận mật khẩu"
                  >
                    {showConfirmPassword ? <EyeOff  size="1em"/> : <Eye  size="1em"/>}
                  </button>
                </div>
              </div>

              <button className="bms-submit-btn" type="submit" disabled={loading}>
                {loading ? (
                  <>
                    <span className="bms-spinner" aria-hidden="true" />
                    Đang Cập Nhật Mật Khẩu...
                  </>
                ) : (
                  "Xác Nhận & Đặt Lại Mật Khẩu"
                )}
              </button>
            </form>
          )}

          <div className="bms-form-links mt-3">
            <button
              className="bms-text-link"
              type="button"
              onClick={onBackToLogin || (() => (window.location.href = "/login"))}
            >
              <ArrowLeft className="me-1"  size="1em"/> Về Đăng Nhập
            </button>
            <button
              className="bms-text-link bms-muted-link"
              type="button"
              onClick={onRegister || (() => (window.location.href = "/register"))}
            >
              Chưa có tài khoản? Đăng ký
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}
