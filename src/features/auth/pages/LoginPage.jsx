/**
 * @file LoginPage.jsx
 * @description Authentication screen for patients and clinical staff (UC05 - Log In to System).
 * @issue I1-018 | BR-018 | Assignee: Hứa Khánh Duy | Reviewer: Võ Gia Huy
 * Implements multi-identifier login (CCCD / Email / Phone / Employee Code), account lockout on 5 failed attempts (BR-IAM-03),
 * and dynamic role-based redirection to target clinical/admin portals.
 * Conforms to: BR-IAM-01, BR-IAM-02, BR-IAM-03 & AGENTS-DESIGN.md.
 */

import React, { useState, useEffect } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { Alert, Spinner } from "react-bootstrap";
import { FaEye, FaEyeSlash, FaLock, FaUser, FaShieldAlt, FaVial, FaArrowLeft, FaCheckCircle } from "react-icons/fa";
import api from "../../../config/api";
import "./LoginPage.css";

/**
 * Normalizes role string to standard uppercase format.
 */
function normalizeRole(role) {
  if (!role) return "PATIENT";
  const r = role.toString().trim().toUpperCase();
  if (r.includes("ADMIN")) return "ADMIN";
  if (r.includes("MANAGER")) return "MANAGER";
  if (r.includes("WAREHOUSE")) return "WAREHOUSESTAFF";
  if (r.includes("DOCTOR") || r.includes("BACSI")) return "DOCTOR";
  if (r.includes("HEAD")) return "LABHEAD";
  if (r.includes("TECH") || r.includes("LAB") || r.includes("KTV")) return "LABTECH";
  if (r.includes("RECEPT") || r.includes("LETAN")) return "RECEPTIONIST";
  if (r.includes("CASHIER") || r.includes("THUNGAN")) return "CASHIER";
  return "PATIENT";
}

export default function LoginPage({
  onBack,
  onLogin,
  onRegister,
  onForgotPassword,
}) {
  const navigate = useNavigate();
  const location = useLocation();

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [successNotice, setSuccessNotice] = useState("");

  // Account lockout counter (BR-IAM-03)
  const [failedAttempts, setFailedAttempts] = useState(() => {
    try {
      const saved = localStorage.getItem("bms_failed_login_attempts");
      return saved ? parseInt(saved, 10) : 0;
    } catch {
      return 0;
    }
  });

  const [lockoutTime, setLockoutTime] = useState(() => {
    try {
      const saved = localStorage.getItem("bms_login_lockout_until");
      return saved ? parseInt(saved, 10) : 0;
    } catch {
      return 0;
    }
  });

  // Check registration query params
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get("registered") === "true") {
      setSuccessNotice("Đăng ký tài khoản thành công! Vui lòng đăng nhập để tiếp tục.");
    }
    if (params.get("reset") === "true") {
      setSuccessNotice("Đặt lại mật khẩu thành công! Vui lòng sử dụng mật khẩu mới.");
    }
  }, [location.search]);

  // Lockout verification
  const isLocked = lockoutTime > Date.now();

  /**
   * Redirects user to their role-specific dashboard.
   */
  const routeUserByRole = (user) => {
    const role = normalizeRole(user?.role || user?.roleName);
    let target = "/dashboard";
    switch (role) {
      case "WAREHOUSESTAFF":
        target = "/inventory";
        break;
      case "ADMIN":
      case "MANAGER":
        target = "/dashboard";
        break;
      case "DOCTOR":
        target = "/schedule";
        break;
      case "LABHEAD":
      case "LABTECH":
        target = "/lab/queue";
        break;
      case "RECEPTIONIST":
        target = "/schedule";
        break;
      case "PATIENT":
        target = "/";
        break;
      default:
        target = "/";
        break;
    }
    // Perform full navigation to refresh layout with authenticated user session
    window.location.href = target;
  };

  /**
   * Handles login form submission.
   */
  async function handleSubmit(event) {
    if (event) event.preventDefault();
    setError("");
    setSuccessNotice("");

    if (isLocked) {
      const remainingMinutes = Math.ceil((lockoutTime - Date.now()) / 60000);
      setError(`Tài khoản tạm thời bị khóa do nhập sai quá 5 lần. Vui lòng thử lại sau ${remainingMinutes} phút.`);
      return;
    }

    if (!identifier.trim() || !password) {
      setError("Vui lòng nhập Email, Số CCCD, SĐT hoặc Mã nhân viên và Mật khẩu.");
      return;
    }

    try {
      setLoading(true);

      if (onLogin) {
        await onLogin({
          email: identifier.trim(),
          password,
          rememberMe,
        });
        return;
      }

      try {
        const response = await api.post("/auth/login", {
          usernameOrEmail: identifier.trim(),
          password,
        });

        const data = response.data?.data || response.data;
        const token = data?.accessToken || data?.token;
        if (!token) {
          throw new Error("Không nhận được mã xác thực hợp lệ từ máy chủ BMS.");
        }
        const user = data?.user;
        if (!user) {
          throw new Error("Không tìm thấy thông tin tài khoản người dùng.");
        }

        // Reset failed login counter on success
        localStorage.removeItem("bms_failed_login_attempts");
        localStorage.removeItem("bms_login_lockout_until");
        setFailedAttempts(0);

        const storage = rememberMe ? localStorage : sessionStorage;
        const refreshToken = data?.refreshToken;
        storage.setItem("bms_token", token);
        storage.setItem("bms_access_token", token);
        storage.setItem("bms_user", JSON.stringify(user));
        localStorage.setItem("bms_token", token);
        localStorage.setItem("bms_access_token", token);
        localStorage.setItem("bms_user", JSON.stringify(user));
        if (refreshToken) {
          storage.setItem("bms_refresh_token", refreshToken);
          localStorage.setItem("bms_refresh_token", refreshToken);
        }

        routeUserByRole(user);
      } catch (apiErr) {
        // Track failed attempt (BR-IAM-03)
        const nextAttempts = failedAttempts + 1;
        setFailedAttempts(nextAttempts);
        localStorage.setItem("bms_failed_login_attempts", nextAttempts.toString());

        if (nextAttempts >= 5) {
          const lockUntil = Date.now() + 15 * 60 * 1000; // 15 minutes lockout
          setLockoutTime(lockUntil);
          localStorage.setItem("bms_login_lockout_until", lockUntil.toString());
          setError("Tài khoản đã bị tạm khóa 15 phút do nhập sai mật khẩu 5 lần liên tiếp (Quy chuẩn BR-IAM-03).");
          return;
        }

        if (!apiErr.response) {
          throw new Error("Không thể kết nối đến máy chủ BMS. Vui lòng kiểm tra dịch vụ mạng hoặc kết nối cơ sở dữ liệu.");
        }

        throw new Error(
          apiErr.response?.data?.message ||
          apiErr.response?.data?.title ||
          "Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin tài khoản hoặc mật khẩu."
        );
      }
    } catch (err) {
      setError(err.message || "Đăng nhập không thành công. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  }

  // Quick Demo Account Auto-Fill & One-Click Login
  const handleQuickDemoFill = async (roleName, defaultId, defaultPwd) => {
    setIdentifier(defaultId);
    setPassword(defaultPwd);
    setError("");
    setLoading(true);

    try {
      const response = await api.post("/auth/login", {
        usernameOrEmail: defaultId,
        password: defaultPwd,
      });

      const data = response.data?.data || response.data;
      const token = data?.accessToken || data?.token;
      if (!token) {
        throw new Error("Không nhận được mã xác thực hợp lệ từ máy chủ BMS.");
      }
      const user = data?.user;
      if (!user) {
        throw new Error("Không tìm thấy thông tin tài khoản người dùng.");
      }

      localStorage.removeItem("bms_failed_login_attempts");
      localStorage.removeItem("bms_login_lockout_until");
      setFailedAttempts(0);

      const refreshToken = data?.refreshToken;
      localStorage.setItem("bms_token", token);
      localStorage.setItem("bms_access_token", token);
      localStorage.setItem("bms_user", JSON.stringify(user));
      sessionStorage.setItem("bms_token", token);
      sessionStorage.setItem("bms_access_token", token);
      sessionStorage.setItem("bms_user", JSON.stringify(user));
      if (refreshToken) {
        localStorage.setItem("bms_refresh_token", refreshToken);
        sessionStorage.setItem("bms_refresh_token", refreshToken);
      }

      routeUserByRole(user);
    } catch (apiErr) {
      console.error("Quick login error:", apiErr);
      setError(
        apiErr.response?.data?.message ||
        apiErr.response?.data?.title ||
        apiErr.message ||
        "Đăng nhập nhanh thất bại. Vui lòng thử lại."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="login-page">
      <section className="login-shell">
        {/* Left Side: Clinical Brand Info */}
        <aside className="login-brand-panel">
          <button
            type="button"
            className="login-back"
            onClick={onBack || (() => navigate("/"))}
            aria-label="Quay lại trang chủ"
          >
            <FaArrowLeft className="me-2" /> Về Trang Chủ
          </button>

          <div className="login-brand">
            <span className="login-logo">
              <img src="/assets/bms-logo.png" alt="BMS Logo" />
            </span>
            <div>
              <strong>BMS LABORATORY</strong>
              <span>Hệ Thống Y Tế ISO 15189</span>
            </div>
          </div>

          <div className="login-intro">
            <span className="login-eyebrow">CỔNG DỊCH VỤ Y TẾ & CHĂM SÓC BỆNH NHÂN</span>
            <h1>
              Đồng Hành Cùng
              <br />
              Sức Khỏe Gia Đình Bạn.
            </h1>
            <p>
              Hệ thống phòng xét nghiệm tự động hóa chuẩn quốc tế ISO 15189:2022. Đăng nhập để tra cứu kết quả xét nghiệm trực tuyến có chữ ký số bác sĩ và quản lý hồ sơ sức khỏe trọn đời.
            </p>

            <div className="login-features">
              <div className="login-feature">
                <span className="login-feature-icon">📊</span>
                <span>
                  <strong>Lưu trữ hồ sơ xét nghiệm trọn đời</strong>
                  <small>Theo dõi biểu đồ biến thiên đường huyết, men gan, mỡ máu qua từng năm</small>
                </span>
              </div>

              <div className="login-feature">
                <span className="login-feature-icon">👨‍⚕️</span>
                <span>
                  <strong>Bác sĩ Chuyên khoa tư vấn 1-1</strong>
                  <small>Giải thích cặn kẽ ý nghĩa từng chỉ số và hướng dẫn phác đồ điều trị</small>
                </span>
              </div>

              <div className="login-feature">
                <span className="login-feature-icon">⚡</span>
                <span>
                  <strong>Trả kết quả online từ 90 phút</strong>
                  <small>Tải file PDF kết quả có chữ ký số điện tử pháp lý, liên thông tuyến đầu</small>
                </span>
              </div>
            </div>
          </div>

          <div className="login-brand-footer">
            <span>TIÊU CHUẨN ISO 15189:2022 • BẢO MẬT BỆNH ÁN HIPAA</span>
            <span>Hotline 24/7: 1900 6868</span>
          </div>
        </aside>

        {/* Right Side: Login Form */}
        <section className="login-form-panel">
          <div className="login-form-content">
            <div className="login-mobile-brand">
              <span className="login-logo"><img src="/assets/bms-logo.png" alt="BMS Logo" /></span>
              <strong>BMS CLINICAL LABORATORY</strong>
            </div>

            <div className="login-heading">
              <span className="login-form-tag">CỔNG Y TẾ ĐIỆN TỬ</span>
              <h2>Đăng Nhập Cổng Y Tế BMS</h2>
              <p>Theo dõi kết quả xét nghiệm, lịch hẹn khám hoặc bắt đầu ca làm việc y tế.</p>
            </div>

            {successNotice && (
              <Alert variant="success" className="d-flex align-items-center gap-2 small">
                <FaCheckCircle className="flex-shrink-0" />
                <span>{successNotice}</span>
              </Alert>
            )}

            {error && (
              <Alert variant="danger" className="d-flex align-items-center gap-2 small">
                <FaShieldAlt className="flex-shrink-0" />
                <span>{error}</span>
              </Alert>
            )}

            <form onSubmit={handleSubmit} noValidate>
              <div className="login-field">
                <label htmlFor="login-email">
                  Email, CCCD, SĐT hoặc Mã Nhân Viên <span className="text-danger">*</span>
                </label>
                <div className="login-input-wrap">
                  <FaUser className="text-muted ms-2" />
                  <input
                    id="login-email"
                    type="text"
                    autoComplete="username"
                    placeholder="name@bms.health.vn hoặc NV-0001"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    required
                    disabled={loading || isLocked}
                  />
                </div>
              </div>

              <div className="login-field">
                <div className="d-flex justify-content-between align-items-center mb-1">
                  <label htmlFor="login-password" className="mb-0">
                    Mật khẩu bảo mật <span className="text-danger">*</span>
                  </label>
                  <button
                    type="button"
                    className="btn btn-link p-0 text-decoration-none small text-primary"
                    onClick={onForgotPassword || (() => navigate("/forgot-password"))}
                  >
                    Quên mật khẩu?
                  </button>
                </div>
                <div className="login-input-wrap">
                  <FaLock className="text-muted ms-2" />
                  <input
                    id="login-password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    placeholder="Nhập mật khẩu"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={loading || isLocked}
                  />
                  <button
                    type="button"
                    className="login-password-toggle border-0 bg-transparent text-muted me-2"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label="Ẩn hiện mật khẩu"
                  >
                    {showPassword ? <FaEyeSlash /> : <FaEye />}
                  </button>
                </div>
              </div>

              <div className="d-flex justify-content-between align-items-center my-3">
                <label className="d-flex align-items-center gap-2 small text-muted mb-0 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                  />
                  <span>Ghi nhớ phiên đăng nhập trên thiết bị này</span>
                </label>
              </div>

              <button
                type="submit"
                className="btn btn-primary w-100 py-2 fw-bold rounded-3 d-flex align-items-center justify-content-center gap-2"
                disabled={loading || isLocked}
              >
                {loading ? (
                  <>
                    <Spinner animation="border" size="sm" />
                    <span>Đang Xác Thực...</span>
                  </>
                ) : (
                  <span>Đăng Nhập Cổng BMS</span>
                )}
              </button>
            </form>

            {/* Quick Fill Demo Accounts */}
            <div className="mt-4 pt-3 border-top">
              <div className="text-muted small fw-semibold mb-2">Đăng nhập nhanh theo vai trò (Dành cho kiểm thử):</div>
              <div className="d-flex flex-wrap gap-1">
                <button
                  type="button"
                  className="btn btn-sm btn-outline-primary"
                  onClick={() => handleQuickDemoFill("Admin", "admin_bms", "Admin@123")}
                >
                  Admin
                </button>
                <button
                  type="button"
                  className="btn btn-sm btn-outline-info"
                  onClick={() => handleQuickDemoFill("Doctor", "dr_nguyenminh", "Admin@123")}
                >
                  Bác Sĩ
                </button>
                <button
                  type="button"
                  className="btn btn-sm btn-outline-success"
                  onClick={() => handleQuickDemoFill("LabTech", "tech_quochung", "Admin@123")}
                >
                  KTV Lab
                </button>
                <button
                  type="button"
                  className="btn btn-sm btn-outline-warning"
                  onClick={() => handleQuickDemoFill("Receptionist", "recep_lananh", "Admin@123")}
                >
                  Lễ Tân
                </button>
                <button
                  type="button"
                  className="btn btn-sm btn-outline-secondary"
                  onClick={() => handleQuickDemoFill("Patient", "patient_tranvanan", "Admin@123")}
                >
                  Bệnh Nhân
                </button>
              </div>
            </div>

            <div className="login-footer-links text-center mt-4">
              <span className="text-muted small">Chưa có tài khoản bệnh nhân? </span>
              <button
                type="button"
                className="btn btn-link p-0 text-decoration-none small text-primary fw-bold"
                onClick={onRegister || (() => navigate("/register"))}
              >
                Đăng ký ngay
              </button>
            </div>
          </div>
        </section>
      </section>
    </main>
  );
}
