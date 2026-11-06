/**
 * @file LoginPage.jsx
 * @description Centered authentication screen with top logo (UC05 - Log In to System).
 * Conforms to:
 * - Simple Centered Card Layout: BMS Logo centered at top, clean white login card centered on screen.
 * - Zero Navbar, Zero Footer, Zero extraneous narrative text blocks.
 * - Enforces BR-IAM-01 (Authentication), BR-IAM-02 (Role Mapping), BR-IAM-03 (Account lockout on 5 failed attempts).
 */

import React, { useState, useEffect } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { Alert, Spinner } from "react-bootstrap";
import { GoogleLogin } from "@react-oauth/google";
import { 
  FaUser, 
  FaLock, 
  FaEye, 
  FaEyeSlash, 
  FaShieldAlt, 
  FaCheckCircle 
} from "react-icons/fa";
import api from "../../../config/api";
import { ROLES, resolveRoleId } from "../../../constants/roles";
import "./LoginPage.css";

/**
 * Canonical role names indexed by RoleId (1=Admin, 2=Doctor, 3=Lab, 4=Receptionist, 5=Patient, 6=Manager).
 */
const CANONICAL_ROLE_BY_ID = Object.freeze({
  [ROLES.ADMIN]: "Admin",
  [ROLES.DOCTOR]: "Doctor",
  [ROLES.LAB]: "Lab",
  [ROLES.RECEPTIONIST]: "Receptionist",
  [ROLES.PATIENT]: "Patient",
  [ROLES.MANAGER]: "Manager",
});

/**
 * Normalizes the authenticated user payload so roleId, role, and roleName always match
 * the canonical role mapping (1=Admin, 2=Doctor, 3=Lab, 4=Receptionist, 5=Patient).
 */
function normalizeAuthenticatedUser(rawUser) {
  if (!rawUser || typeof rawUser !== "object") return rawUser;
  const numericRoleId = Number(rawUser.roleId ?? rawUser.RoleId ?? rawUser.role_id);
  const roleId =
    Number.isFinite(numericRoleId) && CANONICAL_ROLE_BY_ID[numericRoleId]
      ? numericRoleId
      : resolveRoleId(rawUser);
  const canonicalRole =
    CANONICAL_ROLE_BY_ID[roleId] || rawUser.role || rawUser.roleName || "Patient";
  return {
    ...rawUser,
    roleId: roleId ?? rawUser.roleId,
    role: canonicalRole,
    roleName: canonicalRole,
  };
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
  const [focusedInput, setFocusedInput] = useState(null);

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
   * Redirects user to their role-specific workspace based on RoleId:
   * 1 = Admin, 2 = Doctor, 3 = Lab, 4 = Receptionist, 5 = Patient, 6 = Manager.
   */
  const routeUserByRole = (user) => {
    const normalizedUser = typeof normalizeAuthenticatedUser === "function" ? normalizeAuthenticatedUser(user) : user;
    const roleId = resolveRoleId(normalizedUser) ?? resolveRoleId(user);
    let target = "/dashboard";
    switch (roleId) {
      case ROLES.ADMIN:
      case ROLES.MANAGER:
        target = "/dashboard";
        break;
      case ROLES.DOCTOR:
        target = "/doctor/console";
        break;
      case ROLES.LAB:
        target = "/lab/queue";
        break;
      case ROLES.RECEPTIONIST:
        target = "/receptionist/check-in";
        break;
      case ROLES.PATIENT:
        target = (normalizedUser?.medicalProfileCompleted || user?.medicalProfileCompleted) ? "/home" : "/patient/medical-profile-setup";
        break;
      default:
        target = "/dashboard";
        break;
    }

    try {
      window.dispatchEvent(new Event("storage"));
    } catch {
      /* ignore storage event dispatch error */
    }

    // Perform navigation to refresh layout with authenticated user session
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
      setError("Vui lòng nhập Tên đăng nhập hoặc Email và Mật khẩu.");
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
        const rawUser = data?.user;
        if (!rawUser) {
          throw new Error("Không tìm thấy thông tin tài khoản người dùng.");
        }
        const user = normalizeAuthenticatedUser(rawUser);

        // Reset failed login counter on success
        localStorage.removeItem("bms_failed_login_attempts");
        localStorage.removeItem("bms_login_lockout_until");
        setFailedAttempts(0);
        setLockoutTime(0);

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
        if (!apiErr.response) {
          setError("Không thể kết nối đến máy chủ BMS. Vui lòng kiểm tra dịch vụ mạng hoặc kết nối cơ sở dữ liệu.");
          return;
        }

        const status = apiErr.response.status;
        const respData = apiErr.response.data;

        // If backend returned account lockout (423) or custom lockout time (BR-IAM-03)
        if (status === 423 || respData?.code === "ACCOUNT_LOCKED") {
          const retryMinutes = respData?.retryAfterMinutes || 15;
          const lockUntil = Date.now() + retryMinutes * 60 * 1000;
          setLockoutTime(lockUntil);
          localStorage.setItem("bms_login_lockout_until", lockUntil.toString());
          setError(respData?.message || `Tài khoản tạm thời bị khóa trong ${retryMinutes} phút do đăng nhập sai quá 5 lần liên tiếp.`);
          return;
        }

        // Only count credential failure (401) towards client lockout
        if (status === 401) {
          const nextAttempts = failedAttempts + 1;
          setFailedAttempts(nextAttempts);
          localStorage.setItem("bms_failed_login_attempts", nextAttempts.toString());

          if (nextAttempts >= 5) {
            const lockUntil = Date.now() + 15 * 60 * 1000;
            setLockoutTime(lockUntil);
            localStorage.setItem("bms_login_lockout_until", lockUntil.toString());
            setError("Tài khoản đã bị tạm khóa 15 phút do nhập sai mật khẩu 5 lần liên tiếp (Quy chuẩn BR-IAM-03).");
            return;
          }
        }

        setError(
          respData?.message ||
          respData?.title ||
          "Tên đăng nhập hoặc mật khẩu không chính xác. Vui lòng thử lại!"
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
      const rawUser = data?.user;
      if (!rawUser) {
        throw new Error("Không tìm thấy thông tin tài khoản người dùng.");
      }
      const user = normalizeAuthenticatedUser(rawUser);

      localStorage.removeItem("bms_failed_login_attempts");
      localStorage.removeItem("bms_login_lockout_until");
      setFailedAttempts(0);
      setLockoutTime(0);

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

  // Google OAuth 2.0 Single Sign-On Handler
  const handleGoogleSuccess = async (credentialResponse) => {
    if (!credentialResponse?.credential) {
      setError("Không nhận được thông tin xác thực từ Google. Vui lòng thử lại.");
      return;
    }
    setError("");
    setLoading(true);

    try {
      const response = await api.post("/auth/google", {
        idToken: credentialResponse.credential,
      });

      const data = response.data?.data || response.data;
      const token = data?.accessToken || data?.token;
      if (!token) {
        throw new Error("Không nhận được mã xác thực hợp lệ từ máy chủ BMS.");
      }
      const rawUser = data?.user;
      if (!rawUser) {
        throw new Error("Không tìm thấy thông tin tài khoản người dùng.");
      }
      const user = normalizeAuthenticatedUser(rawUser);

      localStorage.removeItem("bms_failed_login_attempts");
      localStorage.removeItem("bms_login_lockout_until");
      setFailedAttempts(0);
      setLockoutTime(0);

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
      setError(
        apiErr.response?.data?.message ||
        apiErr.response?.data?.title ||
        apiErr.message ||
        "Đăng nhập bằng tài khoản Google thất bại. Vui lòng thử lại."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleError = () => {
    setError("Đăng nhập bằng tài khoản Google đã bị hủy hoặc gặp sự cố.");
  };

  return (
    <div 
      className="min-vh-100 d-flex flex-column align-items-center justify-content-center py-5 px-3 px-sm-4"
      style={{ 
        backgroundColor: '#FFFFFF', 
        fontFamily: 'var(--font-sans, "Plus Jakarta Sans", sans-serif)' 
      }}
    >
      {/* ======================================================================
          CENTER TOP: Centered BMS Brand Logo Only (No Text, 3x Prominent Scale)
          ====================================================================== */}
      <div className="text-center mb-4 pb-2">
        <Link to="/" className="d-inline-block text-decoration-none" title="Trang chủ BMS">
          <img 
            src="/assets/bms-logo.png" 
            alt="BMS Logo" 
            style={{ width: '160px', height: 'auto', maxHeight: '48px', objectFit: 'contain' }} 
          />
        </Link>
      </div>

      {/* ======================================================================
          CENTER FORM: 100% Transparent Authentication Form (Zero Background)
          ====================================================================== */}
      <div 
        className="w-100 px-2"
        style={{
          maxWidth: '420px',
          backgroundColor: 'transparent',
          border: 'none',
          boxShadow: 'none'
        }}
      >
        <div className="text-center mb-4 pb-1">
          <h2 className="fw-bold mb-0" style={{ fontSize: '24px', color: '#0F172A', letterSpacing: '-0.02em' }}>
            Đăng Nhập Cổng BMS
          </h2>
        </div>

        {/* Notifications & Feedback */}
        {successNotice && (
          <Alert variant="success" className="d-flex align-items-center gap-2 small border-0 py-2.5 px-3 rounded-3 mb-3.5" style={{ backgroundColor: '#DCFCE7', color: '#166534' }}>
            <FaCheckCircle className="flex-shrink-0" style={{ color: '#16A34A' }} />
            <span style={{ fontSize: '13px' }}>{successNotice}</span>
          </Alert>
        )}

        {error && (
          <Alert variant="danger" className="d-flex align-items-center gap-2 small border-0 py-2.5 px-3 rounded-3 mb-3.5" style={{ backgroundColor: '#FEE2E2', color: '#991B1B' }}>
            <FaShieldAlt className="flex-shrink-0" style={{ color: '#DC2626' }} />
            <span style={{ fontSize: '13px' }}>{error}</span>
          </Alert>
        )}

        {/* Authentication Form */}
        <form onSubmit={handleSubmit} noValidate>
          
          {/* Identifier Field */}
          <div className="mb-3.5">
            <label htmlFor="login-email" className="form-label fw-semibold text-dark mb-1.5" style={{ fontSize: '13px' }}>
              Tên đăng nhập hoặc Email <span className="text-danger">*</span>
            </label>
            <div className="position-relative d-flex align-items-center">
              <FaUser 
                style={{
                  position: 'absolute',
                  left: '16px',
                  color: focusedInput === 'email' ? '#1E60E6' : '#94A3B8',
                  fontSize: '14px',
                  pointerEvents: 'none',
                  transition: 'color 0.15s ease'
                }} 
              />
              <input
                id="login-email"
                type="text"
                autoComplete="username"
                placeholder="name@bms.health.vn hoặc username"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                onFocus={() => setFocusedInput('email')}
                onBlur={() => setFocusedInput(null)}
                required
                disabled={loading || isLocked}
                autoFocus
                style={{
                  width: '100%',
                  height: '48px',
                  paddingLeft: '44px',
                  paddingRight: '16px',
                  backgroundColor: focusedInput === 'email' ? '#FFFFFF' : '#F1F5F9',
                  border: focusedInput === 'email' ? '1.5px solid #1E60E6' : '1.5px solid transparent',
                  borderRadius: '12px',
                  fontSize: '13.5px',
                  fontWeight: 500,
                  color: '#0F172A',
                  outline: 'none',
                  boxShadow: focusedInput === 'email' ? '0 0 0 3px rgba(30, 96, 230, 0.12)' : 'none',
                  boxSizing: 'border-box',
                  transition: 'all 0.18s ease'
                }}
              />
            </div>
          </div>

          {/* Password Field */}
          <div className="mb-3.5">
            <div className="d-flex justify-content-between align-items-center mb-1.5">
              <label htmlFor="login-password" className="form-label fw-semibold text-dark mb-0" style={{ fontSize: '13px' }}>
                Mật khẩu bảo mật <span className="text-danger">*</span>
              </label>
              <button
                type="button"
                className="btn btn-link p-0 text-decoration-none"
                style={{ fontSize: '12.5px', color: '#1E60E6', fontWeight: 600 }}
                onClick={onForgotPassword || (() => navigate("/forgot-password"))}
              >
                Quên mật khẩu?
              </button>
            </div>
            <div className="position-relative d-flex align-items-center">
              <FaLock 
                style={{
                  position: 'absolute',
                  left: '16px',
                  color: focusedInput === 'password' ? '#1E60E6' : '#94A3B8',
                  fontSize: '14px',
                  pointerEvents: 'none',
                  transition: 'color 0.15s ease'
                }} 
              />
              <input
                id="login-password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                placeholder="Nhập mật khẩu của bạn"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onFocus={() => setFocusedInput('password')}
                onBlur={() => setFocusedInput(null)}
                required
                disabled={loading || isLocked}
                style={{
                  width: '100%',
                  height: '48px',
                  paddingLeft: '44px',
                  paddingRight: '44px',
                  backgroundColor: focusedInput === 'password' ? '#FFFFFF' : '#F1F5F9',
                  border: focusedInput === 'password' ? '1.5px solid #1E60E6' : '1.5px solid transparent',
                  borderRadius: '12px',
                  fontSize: '13.5px',
                  fontWeight: 500,
                  color: '#0F172A',
                  outline: 'none',
                  boxShadow: focusedInput === 'password' ? '0 0 0 3px rgba(30, 96, 230, 0.12)' : 'none',
                  boxSizing: 'border-box',
                  transition: 'all 0.18s ease'
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label="Ẩn hiện mật khẩu"
                style={{
                  position: 'absolute',
                  right: '12px',
                  background: 'none',
                  border: 'none',
                  color: '#94A3B8',
                  cursor: 'pointer',
                  padding: '6px',
                  fontSize: '14px'
                }}
              >
                {showPassword ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>
          </div>

          {/* Remember Me Option */}
          <div className="d-flex align-items-center justify-content-between my-3.5 pt-1">
            <label className="d-flex align-items-center gap-2 small text-muted mb-0 cursor-pointer" style={{ userSelect: 'none' }}>
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                style={{ width: '15px', height: '15px', accentColor: '#1E60E6', cursor: 'pointer' }}
              />
              <span style={{ fontSize: '13px', color: '#475569' }}>Ghi nhớ phiên đăng nhập trên thiết bị này</span>
            </label>
          </div>

          {/* Primary Action Button */}
          <button
            type="submit"
            className="btn fw-bold w-100 d-flex align-items-center justify-content-center gap-2"
            style={{
              height: '48px',
              borderRadius: '9999px',
              backgroundColor: '#1E60E6',
              color: '#FFFFFF',
              border: 'none',
              fontSize: '14.5px',
              boxShadow: 'none',
              cursor: (loading || isLocked) ? 'not-allowed' : 'pointer',
              transition: 'background-color 0.15s ease'
            }}
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

        {/* OR Divider with Generous Breathing Room */}
        <div className="d-flex align-items-center" style={{ marginTop: '28px', marginBottom: '28px' }}>
          <div className="flex-grow-1" style={{ height: '1px', backgroundColor: '#E2E8F0' }} />
          <span className="px-3.5 text-muted fw-semibold" style={{ fontSize: '12.5px', color: '#64748B' }}>hoặc tiếp tục với</span>
          <div className="flex-grow-1" style={{ height: '1px', backgroundColor: '#E2E8F0' }} />
        </div>

        {/* Google OAuth 2.0 Single Sign-On Button */}
        <div className="d-flex justify-content-center w-100" style={{ marginBottom: '32px' }}>
          <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={handleGoogleError}
            theme="outline"
            size="large"
            shape="pill"
            text="continue_with"
            locale="vi"
            width="380"
          />
        </div>

        {/* Quick Fill Demo Roles (For Testing & Validation) */}
        <div style={{ paddingTop: '28px', borderTop: '1px solid #E2E8F0' }}>
          <div className="text-muted small fw-semibold mb-2.5" style={{ fontSize: '12px' }}>
            Đăng nhập nhanh theo vai trò (Dành cho kiểm thử):
          </div>
          <div className="d-flex flex-wrap gap-2">
            <button
              type="button"
              className="btn btn-sm"
              style={{ backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '8px', fontSize: '12px', fontWeight: 600, color: '#334155' }}
              onClick={() => handleQuickDemoFill("Admin", "admin_bms", "Admin@123")}
              disabled={loading || isLocked}
            >
              Admin
            </button>
            <button
              type="button"
              className="btn btn-sm"
              style={{ backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '8px', fontSize: '12px', fontWeight: 600, color: '#334155' }}
              onClick={() => handleQuickDemoFill("Manager", "labhead_tranhoa", "Admin@123")}
              disabled={loading || isLocked}
            >
              Quản Lý
            </button>
            <button
              type="button"
              className="btn btn-sm"
              style={{ backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '8px', fontSize: '12px', fontWeight: 600, color: '#334155' }}
              onClick={() => handleQuickDemoFill("Doctor", "dr_nguyenminh", "Admin@123")}
              disabled={loading || isLocked}
            >
              Bác Sĩ
            </button>
            <button
              type="button"
              className="btn btn-sm"
              style={{ backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '8px', fontSize: '12px', fontWeight: 600, color: '#334155' }}
              onClick={() => handleQuickDemoFill("LabTech", "tech_quochung", "Admin@123")}
              disabled={loading || isLocked}
            >
              KTV Lab
            </button>
            <button
              type="button"
              className="btn btn-sm"
              style={{ backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '8px', fontSize: '12px', fontWeight: 600, color: '#334155' }}
              onClick={() => handleQuickDemoFill("Receptionist", "recep_lananh", "Admin@123")}
              disabled={loading || isLocked}
            >
              Lễ Tân
            </button>
            <button
              type="button"
              className="btn btn-sm"
              style={{ backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '8px', fontSize: '12px', fontWeight: 600, color: '#334155' }}
              onClick={() => handleQuickDemoFill("Patient", "patient_tranvanan", "Admin@123")}
              disabled={loading || isLocked}
            >
              Bệnh Nhân
            </button>
          </div>
        </div>

        {/* Footer Registration Link */}
        <div className="text-center mt-4 pt-2 text-muted" style={{ fontSize: '13.5px' }}>
          <span>Chưa có tài khoản bệnh nhân? </span>
          {onRegister ? (
            <button 
              type="button" 
              onClick={onRegister}
              className="btn btn-link p-0 text-decoration-none fw-bold"
              style={{ color: '#1E60E6', fontSize: '13.5px' }}
            >
              Đăng ký ngay
            </button>
          ) : (
            <Link 
              to="/register"
              className="text-decoration-none fw-bold"
              style={{ color: '#1E60E6' }}
            >
              Đăng ký ngay
            </Link>
          )}
        </div>

      </div>

      {/* Footer Minimal Copyright */}
      <div className="text-center mt-4 pt-3 text-muted" style={{ fontSize: '12px', color: '#94A3B8' }}>
        © 2026 BMS Clinical Laboratory · ISO 15189:2022
      </div>
    </div>
  );
}
