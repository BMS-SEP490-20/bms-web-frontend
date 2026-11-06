/**
 * @file LoginPage.jsx
 * @description Centered authentication screen with top logo (UC05 - Log In to System).
 * Conforms to:
 * - Simple Centered Card Layout: BMS Logo centered at top, clean white login card centered on screen.
 * - Zero Navbar, Zero Footer, Zero extraneous narrative text blocks.
 * - Enforces BR-IAM-01 (Authentication), BR-IAM-02 (Role Mapping), BR-IAM-03 (Account lockout on 5 failed attempts).
 */

import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { Alert, Spinner, Modal } from "react-bootstrap";
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

/**
 * Security: Gate demo test credentials to DEV mode only (or explicit VITE_ENABLE_DEMO_LOGIN flag).
 * In production builds, this prevents shipping seed passwords/credentials in the client bundle.
 */
const IS_DEV_OR_DEMO = import.meta.env.DEV || import.meta.env.VITE_ENABLE_DEMO_LOGIN === "true";

const DEMO_ROLES = import.meta.env.DEV || import.meta.env.VITE_ENABLE_DEMO_LOGIN === "true" ? [
  { id: 'admin', name: 'Admin', title: 'Quản Trị Viên', username: 'admin_bms', password: 'Admin@123', desc: 'Quản trị hệ thống, danh mục, audit log' },
  { id: 'manager', name: 'Manager', title: 'Quản Lý Lab', username: 'labhead_tranhoa', password: 'Admin@123', desc: 'Duyệt KQ, kiểm soát QC, thống kê TAT' },
  { id: 'doctor', name: 'Doctor', title: 'Bác Sĩ', username: 'dr_nguyenminh', password: 'Admin@123', desc: 'Chỉ định xét nghiệm, kết luận bệnh án' },
  { id: 'lab', name: 'LabTech', title: 'Kỹ Thuật Viên', username: 'tech_quochung', password: 'Admin@123', desc: 'Nhập kết quả, chạy mẫu xét nghiệm' },
  { id: 'receptionist', name: 'Receptionist', title: 'Lễ Tân', username: 'recep_lananh', password: 'Admin@123', desc: 'Tiếp đón, check-in, thu phí dịch vụ' },
  { id: 'patient', name: 'Patient', title: 'Bệnh Nhân', username: 'patient_tranvanan', password: 'Admin@123', desc: 'Tra cứu kết quả, theo dõi tiến trình' },
] : [];

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

  // Easter Egg State: 3 clicks in top-right corner reveals QA/Testing Role Modal
  const [secretClicks, setSecretClicks] = useState(0);
  const [showTestModal, setShowTestModal] = useState(false);
  const secretClickTimer = useRef(null);

  const handleSecretClick = () => {
    if (secretClickTimer.current) clearTimeout(secretClickTimer.current);
    setSecretClicks((prev) => {
      const next = prev + 1;
      if (next >= 3) {
        setShowTestModal(true);
        return 0;
      }
      return next;
    });
    secretClickTimer.current = setTimeout(() => {
      setSecretClicks(0);
    }, 1500);
  };

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
   * Persists authentication credentials according to the rememberMe choice.
   * If rememberMe is false, stores strictly in sessionStorage and purges localStorage.
   */
  const persistAuthSession = (token, user, refreshToken, remember) => {
    const primary = remember ? localStorage : sessionStorage;
    primary.setItem("bms_token", token);
    primary.setItem("bms_access_token", token);
    primary.setItem("bms_user", JSON.stringify(user));
    if (refreshToken) {
      primary.setItem("bms_refresh_token", refreshToken);
    }

    if (!remember) {
      localStorage.removeItem("bms_token");
      localStorage.removeItem("bms_access_token");
      localStorage.removeItem("bms_user");
      localStorage.removeItem("bms_refresh_token");
    } else {
      sessionStorage.setItem("bms_token", token);
      sessionStorage.setItem("bms_access_token", token);
      sessionStorage.setItem("bms_user", JSON.stringify(user));
      if (refreshToken) {
        sessionStorage.setItem("bms_refresh_token", refreshToken);
      }
    }
  };

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

        persistAuthSession(token, user, data?.refreshToken, rememberMe);

        routeUserByRole(user);
      } catch (apiErr) {
        if (!apiErr.response) {
          setError("Không thể kết nối đến máy chủ BMS. Vui lòng kiểm tra dịch vụ mạng hoặc kết nối cơ sở dữ liệu.");
          return;
        }

        const status = apiErr.response.status;
        const respData = apiErr.response.data;

        if (status === 409 || respData?.code === "PATIENT_IDENTITY_CONFLICT" || respData?.errorCode === "PATIENT_IDENTITY_CONFLICT") {
          setError(respData?.message || "Số định danh CCCD đã được sử dụng hoặc có xung đột dữ liệu hồ sơ. Vui lòng liên hệ Quầy tiếp đón BMS để được hỗ trợ xác thực danh tính.");
          return;
        }

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

      persistAuthSession(token, user, data?.refreshToken, rememberMe);

      routeUserByRole(user);
    } catch (apiErr) {
      if (apiErr.response?.status === 409 || apiErr.response?.data?.code === "PATIENT_IDENTITY_CONFLICT") {
        setError(apiErr.response?.data?.message || "Số định danh CCCD đã được sử dụng hoặc có xung đột dữ liệu hồ sơ. Vui lòng liên hệ Quầy tiếp đón BMS để được hỗ trợ xác thực danh tính.");
        return;
      }
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
    if (loading || isLocked) return;
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

      persistAuthSession(token, user, data?.refreshToken, rememberMe);

      routeUserByRole(user);
    } catch (apiErr) {
      if (apiErr.response?.status === 409 || apiErr.response?.data?.code === "PATIENT_IDENTITY_CONFLICT") {
        setError(apiErr.response?.data?.message || "Số định danh CCCD đã được sử dụng hoặc có xung đột dữ liệu hồ sơ. Vui lòng liên hệ Quầy tiếp đón BMS để được hỗ trợ xác thực danh tính.");
        return;
      }
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
      className="min-vh-100 d-flex flex-column align-items-center justify-content-center py-5 px-3 px-sm-4 position-relative"
      style={{ 
        backgroundColor: '#FFFFFF', 
        fontFamily: 'var(--font-sans, "Plus Jakarta Sans", sans-serif)' 
      }}
    >
      {/* Hidden Easter Egg Trigger: Click 3 times in top-right corner to open Test Roles Modal (Gated to DEV/Demo) */}
      {IS_DEV_OR_DEMO && (
        <div
          onClick={handleSecretClick}
          className="user-select-none d-flex align-items-center justify-content-center"
          style={{
            position: 'fixed',
            top: '16px',
            right: '20px',
            minWidth: '50px',
            height: '36px',
            padding: '4px 12px',
            borderRadius: '18px',
            cursor: 'pointer',
            opacity: 0.35,
            transition: 'all 0.2s ease',
            zIndex: 1050,
            backgroundColor: '#F8FAFC',
            border: '1px solid #E2E8F0'
          }}
          onMouseEnter={(e) => e.currentTarget.style.opacity = '0.85'}
          onMouseLeave={(e) => e.currentTarget.style.opacity = '0.35'}
          title="BMS Portal v1.0"
        >
          <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748B' }}>
            v1.0 {secretClicks > 0 && `(${secretClicks}/3)`}
          </span>
        </div>
      )}

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

        {/* Authentication Form with Generous Airy Spacing */}
        <form onSubmit={handleSubmit} noValidate>
          
          {/* Identifier Field */}
          <div style={{ marginBottom: '22px' }}>
            <label htmlFor="login-email" className="form-label fw-semibold text-dark d-block" style={{ fontSize: '13.5px', marginBottom: '8px' }}>
              Tên đăng nhập hoặc Email <span className="text-danger">*</span>
            </label>
            <div className="position-relative d-flex align-items-center">
              <FaUser 
                style={{
                  position: 'absolute',
                  left: '16px',
                  color: focusedInput === 'email' ? '#1E60E6' : '#94A3B8',
                  fontSize: '15px',
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
                  height: '50px',
                  paddingLeft: '46px',
                  paddingRight: '16px',
                  backgroundColor: focusedInput === 'email' ? '#FFFFFF' : '#F1F5F9',
                  border: focusedInput === 'email' ? '1.5px solid #1E60E6' : '1.5px solid transparent',
                  borderRadius: '12px',
                  fontSize: '14px',
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
          <div style={{ marginBottom: '20px' }}>
            <div className="d-flex justify-content-between align-items-center" style={{ marginBottom: '8px' }}>
              <label htmlFor="login-password" className="form-label fw-semibold text-dark mb-0" style={{ fontSize: '13.5px' }}>
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
                  fontSize: '15px',
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
                  height: '50px',
                  paddingLeft: '46px',
                  paddingRight: '46px',
                  backgroundColor: focusedInput === 'password' ? '#FFFFFF' : '#F1F5F9',
                  border: focusedInput === 'password' ? '1.5px solid #1E60E6' : '1.5px solid transparent',
                  borderRadius: '12px',
                  fontSize: '14px',
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
                  fontSize: '15px'
                }}
              >
                {showPassword ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>
          </div>

          {/* Remember Me Option with Generous Breathing Space */}
          <div className="d-flex align-items-center justify-content-between" style={{ marginTop: '14px', marginBottom: '26px' }}>
            <label className="d-flex align-items-center gap-2.5 small text-muted mb-0 cursor-pointer" style={{ userSelect: 'none' }}>
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                style={{ width: '16px', height: '16px', accentColor: '#1E60E6', cursor: 'pointer' }}
              />
              <span style={{ fontSize: '13.5px', color: '#475569' }}>Ghi nhớ phiên đăng nhập trên thiết bị này</span>
            </label>
          </div>

          {/* Primary Action Button */}
          <button
            type="submit"
            className="btn fw-bold w-100 d-flex align-items-center justify-content-center gap-2"
            style={{
              height: '50px',
              borderRadius: '9999px',
              backgroundColor: '#1E60E6',
              color: '#FFFFFF',
              border: 'none',
              fontSize: '15px',
              boxShadow: 'none',
              cursor: (loading || isLocked) ? 'not-allowed' : 'pointer',
              transition: 'background-color 0.15s ease',
              marginBottom: '4px'
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

        {/* Google OAuth 2.0 Single Sign-On Button (Lockout & Loading Protected) */}
        {Boolean(import.meta.env.VITE_GOOGLE_CLIENT_ID) && (
          <>
            {/* OR Divider with Generous Breathing Room */}
            <div className="d-flex align-items-center" style={{ marginTop: '30px', marginBottom: '30px' }}>
              <div className="flex-grow-1" style={{ height: '1px', backgroundColor: '#E2E8F0' }} />
              <span className="px-3.5 text-muted fw-semibold" style={{ fontSize: '12.5px', color: '#64748B' }}>hoặc tiếp tục với</span>
              <div className="flex-grow-1" style={{ height: '1px', backgroundColor: '#E2E8F0' }} />
            </div>

            <div 
              className="d-flex justify-content-center w-100" 
              style={{ 
                marginBottom: '32px',
                pointerEvents: (loading || isLocked) ? 'none' : 'auto',
                opacity: (loading || isLocked) ? 0.45 : 1,
                cursor: (loading || isLocked) ? 'not-allowed' : 'pointer',
                transition: 'opacity 0.2s ease'
              }}
              title={(loading || isLocked) ? 'Tài khoản đang tạm khóa hoặc đang xử lý xác thực' : 'Đăng nhập nhanh bằng tài khoản Google'}
            >
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
          </>
        )}

        {/* Footer Registration Link */}
        <div className="text-center mt-3 text-muted" style={{ fontSize: '13.5px' }}>
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

      {/* ======================================================================
          DEV & QA TESTING MODAL: Select Demo Role to Fast-Login (Gated to DEV/Demo)
          Triggered by clicking 3 times in top-right corner
          ====================================================================== */}
      {IS_DEV_OR_DEMO && (
        <Modal
          show={showTestModal}
          onHide={() => setShowTestModal(false)}
          centered
          backdrop="static"
          size="md"
        >
          <Modal.Header closeButton style={{ borderBottom: '1px solid #F1F5F9', padding: '16px 20px' }}>
            <Modal.Title style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A' }}>
              Chọn vai trò kiểm thử
            </Modal.Title>
          </Modal.Header>
          <Modal.Body style={{ padding: '16px 20px' }}>
            <p className="text-muted small mb-3" style={{ fontSize: '12.5px' }}>
              Chọn một tài khoản bên dưới để đăng nhập nhanh:
            </p>
            <div className="d-flex flex-column gap-2">
              {DEMO_ROLES.map((role) => (
                <button
                  key={role.id}
                  type="button"
                  className="btn text-start d-flex align-items-center justify-content-between px-3 py-2.5"
                  style={{
                    border: '1px solid #E2E8F0',
                    borderRadius: '10px',
                    backgroundColor: '#FFFFFF',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#F8FAFC';
                    e.currentTarget.style.borderColor = '#CBD5E1';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#FFFFFF';
                    e.currentTarget.style.borderColor = '#E2E8F0';
                  }}
                  onClick={() => {
                    setShowTestModal(false);
                    handleQuickDemoFill(role.name, role.username, role.password);
                  }}
                  disabled={loading || isLocked}
                >
                  <div>
                    <div className="fw-semibold text-dark" style={{ fontSize: '13.5px', marginBottom: '2px' }}>
                      {role.title}
                    </div>
                    <div className="text-muted" style={{ fontSize: '12px' }}>
                      <span style={{ fontFamily: 'monospace', fontWeight: 600, color: '#475569' }}>{role.username}</span>
                      <span className="mx-1.5" style={{ color: '#CBD5E1' }}>•</span>
                      <span>{role.desc}</span>
                    </div>
                  </div>
                  <span 
                    style={{ 
                      backgroundColor: '#F1F5F9', 
                      color: '#475569', 
                      fontSize: '11px', 
                      fontWeight: 600,
                      padding: '4px 8px', 
                      borderRadius: '6px',
                      border: '1px solid #E2E8F0'
                    }}
                  >
                    {role.name}
                  </span>
                </button>
              ))}
            </div>
          </Modal.Body>
        </Modal>
      )}
    </div>
  );
}
