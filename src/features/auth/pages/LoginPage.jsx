/**
 * @file LoginPage.jsx
 * @description Master Authentication screen for patients and clinical staff (UC05 - Log In to System).
 * Conforms to:
 * - BR-IAM-01 (Authentication), BR-IAM-02 (Role Mapping), BR-IAM-03 (Lockout after 5 failed attempts).
 * - 100% Unified with Home Landing Portal Design Language (Plus Jakarta Sans, Pure 2D Flat, PortalNavbar, MegaFooter).
 * - Zero Sến Súa Glow / Zero AI Template Artifacts.
 */

import React, { useState, useEffect } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { Alert, Spinner } from "react-bootstrap";
import { 
  FaUser, 
  FaLock, 
  FaEye, 
  FaEyeSlash, 
  FaShieldAlt, 
  FaCheckCircle, 
  FaFileContract, 
  FaMicroscope, 
  FaUserMd,
  FaArrowLeft
} from "react-icons/fa";
import api from "../../../config/api";
import { ROLES, resolveRoleId } from "../../../constants/roles";
import PortalNavbar from "../../home/components/PortalNavbar";
import MegaFooter from "../../home/components/MegaFooter";
import usePageTransition from "../../../shared/hooks/usePageTransition";
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
  const pageTransitionClass = usePageTransition();

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

  const isModalMode = Boolean(onBack);

  return (
    <div className="bms-auth-page">
      {!isModalMode && <PortalNavbar />}

      <main className={`bms-auth-main bms-page-directional-content ${pageTransitionClass}`}>
        <div className="container" style={{ maxWidth: 1180 }}>
          
          {/* Back button when inside modal or standalone */}
          {isModalMode && (
            <div className="mb-4">
              <button
                type="button"
                className="btn btn-sm d-inline-flex align-items-center gap-2"
                onClick={onBack}
                style={{
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #E2E8F0',
                  borderRadius: '10px',
                  color: '#475569',
                  fontWeight: 600,
                  fontSize: '12.5px',
                  padding: '6px 14px'
                }}
              >
                <FaArrowLeft style={{ fontSize: '11px' }} />
                <span>Quay Lại</span>
              </button>
            </div>
          )}

          <div className="row align-items-center g-4 g-lg-5">
            
            {/* ----------------------------------------------------------------
               LEFT COLUMN: Brand Trust & Medical Excellence Narrative
               ---------------------------------------------------------------- */}
            <div className="col-lg-6 col-xl-6">
              <div className="bms-auth-eyebrow mb-2">
                <img src="/assets/lab-icon.png" alt="" style={{ width: 14, height: 14, objectFit: 'contain' }} />
                <span>TIÊU CHUẨN ISO 15189:2022 · CỔNG ĐIỆN TỬ BMS</span>
              </div>

              <h1 className="bms-auth-headline">
                Đăng Nhập Cổng Dịch Vụ<br />
                Y Tế &amp; Quản Trị BMS
              </h1>

              <p className="bms-auth-subtitle">
                Hệ thống xét nghiệm tự động hóa đạt chuẩn quốc tế. Đăng nhập để tra cứu kết quả trực tuyến có chữ ký số PKI, đặt lịch khám hoặc vận hành phân hệ quản trị y khoa.
              </p>

              {/* 2D Flat Medical Illustration Artwork */}
              <div className="bms-auth-illustration">
                <img
                  src="/assets/bms/svg/hero/login/login-hero.svg"
                  alt="BMS Clinical Laboratory Telehealth"
                />
              </div>

              {/* 3 Cohesive Trust Cards (Landing Style) */}
              <div className="bms-auth-trust-list">
                <div className="bms-auth-trust-card">
                  <div className="bms-auth-trust-icon">
                    <FaFileContract />
                  </div>
                  <div>
                    <h4 className="bms-auth-trust-title">Chữ Ký Số Y Tế PKI Hợp Pháp</h4>
                    <p className="bms-auth-trust-desc">
                      Phiếu kết quả cấp dấu thời gian Timestamp &amp; chữ ký số Bác sĩ Chuyên khoa, có giá trị pháp lý liên thông toàn quốc.
                    </p>
                  </div>
                </div>

                <div className="bms-auth-trust-card">
                  <div className="bms-auth-trust-icon">
                    <FaMicroscope />
                  </div>
                  <div>
                    <h4 className="bms-auth-trust-title">Tra Cứu Real-Time &amp; Mã Vạch Một Chiều</h4>
                    <p className="bms-auth-trust-desc">
                      Theo dõi tiến trình phân tích 6 chặng từ khi lấy mẫu đến biobank, mã hóa Barcode Code 128 loại trừ 100% nhầm lẫn.
                    </p>
                  </div>
                </div>

                <div className="bms-auth-trust-card">
                  <div className="bms-auth-trust-icon">
                    <FaUserMd />
                  </div>
                  <div>
                    <h4 className="bms-auth-trust-title">Không Gian Làm Việc Phân Hệ Chuyên Sâu</h4>
                    <p className="bms-auth-trust-desc">
                      Giao diện tối ưu riêng cho Bác sĩ lâm sàng, Kỹ thuật viên Lab, Lễ tân tiếp đón và Người bệnh.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* ----------------------------------------------------------------
               RIGHT COLUMN: Modern Luxury Authentication Form Card
               ---------------------------------------------------------------- */}
            <div className="col-lg-6 col-xl-5 offset-xl-1">
              <div className="bms-auth-card">
                
                <span className="bms-auth-card-tag">XÁC THỰC DANH TÍNH</span>
                <h2 className="bms-auth-card-title">Chào Mừng Quay Trở Lại</h2>
                <p className="bms-auth-card-subtitle">
                  Nhập thông tin xác thực tài khoản y tế để tiếp tục
                </p>

                {/* Notifications & Feedback */}
                {successNotice && (
                  <Alert variant="success" className="d-flex align-items-center gap-2 small border-0 py-2.5 px-3 rounded-3" style={{ backgroundColor: '#DCFCE7', color: '#166534' }}>
                    <FaCheckCircle className="flex-shrink-0" style={{ color: '#16A34A' }} />
                    <span style={{ fontSize: '13px' }}>{successNotice}</span>
                  </Alert>
                )}

                {error && (
                  <Alert variant="danger" className="d-flex align-items-center gap-2 small border-0 py-2.5 px-3 rounded-3" style={{ backgroundColor: '#FEE2E2', color: '#991B1B' }}>
                    <FaShieldAlt className="flex-shrink-0" style={{ color: '#DC2626' }} />
                    <span style={{ fontSize: '13px' }}>{error}</span>
                  </Alert>
                )}

                {/* Main Form */}
                <form onSubmit={handleSubmit} noValidate>
                  
                  {/* Identifier Field */}
                  <div className="bms-auth-field">
                    <label htmlFor="login-email" className="bms-auth-field-label">
                      Tên đăng nhập hoặc Email <span className="text-danger">*</span>
                    </label>
                    <div className="bms-auth-input-group">
                      <FaUser className="bms-auth-input-icon" />
                      <input
                        id="login-email"
                        type="text"
                        className="bms-auth-input"
                        autoComplete="username"
                        placeholder="name@bms.health.vn hoặc username"
                        value={identifier}
                        onChange={(e) => setIdentifier(e.target.value)}
                        required
                        disabled={loading || isLocked}
                        autoFocus
                      />
                    </div>
                  </div>

                  {/* Password Field */}
                  <div className="bms-auth-field">
                    <div className="d-flex justify-content-between align-items-center mb-1">
                      <label htmlFor="login-password" className="bms-auth-field-label mb-0">
                        Mật khẩu bảo mật <span className="text-danger">*</span>
                      </label>
                      <button
                        type="button"
                        className="btn btn-link p-0 text-decoration-none"
                        style={{ fontSize: '12px', color: '#1E60E6', fontWeight: 600 }}
                        onClick={onForgotPassword || (() => navigate("/forgot-password"))}
                      >
                        Quên mật khẩu?
                      </button>
                    </div>
                    <div className="bms-auth-input-group">
                      <FaLock className="bms-auth-input-icon" />
                      <input
                        id="login-password"
                        type={showPassword ? "text" : "password"}
                        className="bms-auth-input"
                        autoComplete="current-password"
                        placeholder="Nhập mật khẩu của bạn"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        disabled={loading || isLocked}
                      />
                      <button
                        type="button"
                        className="bms-auth-toggle-pwd"
                        onClick={() => setShowPassword(!showPassword)}
                        aria-label="Ẩn hiện mật khẩu"
                      >
                        {showPassword ? <FaEyeSlash /> : <FaEye />}
                      </button>
                    </div>
                  </div>

                  {/* Remember Me Option */}
                  <div className="d-flex align-items-center justify-content-between my-3 pt-1">
                    <label className="d-flex align-items-center gap-2 small text-muted mb-0 cursor-pointer" style={{ userSelect: 'none' }}>
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        style={{ width: '15px', height: '15px', accentColor: '#1E60E6', cursor: 'pointer' }}
                      />
                      <span style={{ fontSize: '12.5px', color: '#475569' }}>Ghi nhớ phiên đăng nhập</span>
                    </label>
                  </div>

                  {/* Primary Submit Button */}
                  <button
                    type="submit"
                    className="bms-auth-btn-primary"
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

                {/* Quick Fill Demo Accounts (For Testing & Validation) */}
                <div className="bms-auth-quick-roles">
                  <div className="bms-auth-quick-title">
                    Đăng nhập nhanh theo vai trò (Dành cho kiểm thử):
                  </div>
                  <div className="bms-auth-role-pills-wrap">
                    <button
                      type="button"
                      className="bms-auth-role-pill"
                      onClick={() => handleQuickDemoFill("Admin", "admin_bms", "Admin@123")}
                      disabled={loading || isLocked}
                    >
                      Admin
                    </button>
                    <button
                      type="button"
                      className="bms-auth-role-pill"
                      onClick={() => handleQuickDemoFill("Manager", "labhead_tranhoa", "Admin@123")}
                      disabled={loading || isLocked}
                    >
                      Quản Lý
                    </button>
                    <button
                      type="button"
                      className="bms-auth-role-pill"
                      onClick={() => handleQuickDemoFill("Doctor", "dr_nguyenminh", "Admin@123")}
                      disabled={loading || isLocked}
                    >
                      Bác Sĩ
                    </button>
                    <button
                      type="button"
                      className="bms-auth-role-pill"
                      onClick={() => handleQuickDemoFill("LabTech", "tech_quochung", "Admin@123")}
                      disabled={loading || isLocked}
                    >
                      KTV Lab
                    </button>
                    <button
                      type="button"
                      className="bms-auth-role-pill"
                      onClick={() => handleQuickDemoFill("Receptionist", "recep_lananh", "Admin@123")}
                      disabled={loading || isLocked}
                    >
                      Lễ Tân
                    </button>
                    <button
                      type="button"
                      className="bms-auth-role-pill"
                      onClick={() => handleQuickDemoFill("Patient", "patient_tranvanan", "Admin@123")}
                      disabled={loading || isLocked}
                    >
                      Bệnh Nhân
                    </button>
                  </div>
                </div>

                {/* Footer Switch to Register */}
                <div className="bms-auth-footer-link">
                  <span>Chưa có tài khoản bệnh nhân? </span>
                  {onRegister ? (
                    <button type="button" onClick={onRegister}>
                      Đăng ký ngay
                    </button>
                  ) : (
                    <Link to="/register">
                      Đăng ký ngay
                    </Link>
                  )}
                </div>

              </div>
            </div>

          </div>
        </div>
      </main>

      {!isModalMode && <MegaFooter />}
    </div>
  );
}
