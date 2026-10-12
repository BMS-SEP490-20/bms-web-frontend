
import React, { useState } from "react";
import "./LoginPage.css";

export default function LoginPage({ onBack, onLogin, onRegister }) {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [rememberMe, setRememberMe] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    async function handleSubmit(event) {
        event.preventDefault();
        setError("");

        if (!email.trim() || !password) {
            setError("Vui lòng nhập email hoặc mã nhân viên và mật khẩu.");
            return;
        }

        try {
            setLoading(true);

            if (!onLogin) {
                throw new Error("Chức năng đăng nhập chưa được cấu hình.");
            }

            await onLogin({
                email: email.trim(),
                password,
                rememberMe,
            });
        } catch (err) {
            setError(err.message || "Đăng nhập thất bại. Vui lòng thử lại.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <main className="login-page">
            <section className="login-shell">
                <aside className="login-brand-panel">
                    <button
                        type="button"
                        className="login-back"
                        onClick={onBack}
                        aria-label="Quay lại trang trước"
                    >
                        ← Trang chủ
                    </button>

                    <div className="login-brand">
                        <span className="login-logo">BMS</span>
                        <div>
                            <strong>Blood Laboratory</strong>
                            <span>Management System</span>
                        </div>
                    </div>

                    <div className="login-intro">
                        <span className="login-eyebrow">CLINICAL OPERATIONS SUITE</span>
                        <h1>
                            Welcome back
                            <br />
                            to BMS Health.
                        </h1>
                        <p>
                            Đăng nhập để xem lịch làm việc, xử lý mẫu xét nghiệm,
                            duyệt kết quả hoặc theo dõi hoạt động phòng khám.
                        </p>

                        <div className="login-features">
                            <div className="login-feature">
                                <span className="login-feature-icon">♙</span>
                                <span>
                  <strong>Phân quyền theo vai trò</strong>
                  <small>Admin, Manager, Doctor, Lab, Reception, Patient</small>
                </span>
                            </div>

                            <div className="login-feature">
                                <span className="login-feature-icon">◷</span>
                                <span>
                  <strong>Quản lý phiên đăng nhập</strong>
                  <small>Hỗ trợ quản lý phiên làm việc an toàn</small>
                </span>
                            </div>

                            <div className="login-feature">
                                <span className="login-feature-icon">⌑</span>
                                <span>
                  <strong>Theo dõi hoạt động</strong>
                  <small>Hỗ trợ lưu vết thao tác trên hệ thống</small>
                </span>
                            </div>
                        </div>
                    </div>

                    <div className="login-brand-footer">
                        <span>AUTHORIZED PERSONNEL ONLY</span>
                        <span>BMS · v2.4.0</span>
                    </div>
                </aside>

                <section className="login-form-panel">
                    <div className="login-form-content">
                        <div className="login-mobile-brand">
                            <span className="login-logo">BMS</span>
                            <strong>BMS Health</strong>
                        </div>

                        <div className="login-heading">
                            <span className="login-form-tag">SECURE SIGN IN</span>
                            <h2>Sign in to BMS</h2>
                            <p>
                                Nhập thông tin tài khoản để tiếp tục.
                            </p>
                        </div>

                        <form onSubmit={handleSubmit} noValidate>
                            <div className="login-field">
                                <label htmlFor="login-email">
                                    Email hoặc mã nhân viên
                                </label>
                                <div className="login-input-wrap">
                                    <span aria-hidden="true">✉</span>
                                    <input
                                        id="login-email"
                                        type="text"
                                        autoComplete="username"
                                        placeholder="Nhập email hoặc mã nhân viên"
                                        value={email}
                                        onChange={(event) => setEmail(event.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="login-field">
                                <div className="login-label-row">
                                    <label htmlFor="login-password">Mật khẩu</label>
                                    <button
                                        type="button"
                                        className="login-text-button"
                                        onClick={() =>
                                            setError("Chức năng quên mật khẩu sẽ được bổ sung sau.")
                                        }
                                    >
                                        Quên mật khẩu?
                                    </button>
                                </div>

                                <div className="login-input-wrap">
                                    <span aria-hidden="true">▣</span>
                                    <input
                                        id="login-password"
                                        type={showPassword ? "text" : "password"}
                                        autoComplete="current-password"
                                        placeholder="Nhập mật khẩu"
                                        value={password}
                                        onChange={(event) => setPassword(event.target.value)}
                                    />
                                    <button
                                        type="button"
                                        className="login-password-toggle"
                                        onClick={() => setShowPassword((value) => !value)}
                                        aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                                    >
                                        {showPassword ? "Ẩn" : "Hiện"}
                                    </button>
                                </div>
                            </div>

                            <div className="login-options">
                                <label className="login-checkbox">
                                    <input
                                        type="checkbox"
                                        checked={rememberMe}
                                        onChange={(event) => setRememberMe(event.target.checked)}
                                    />
                                    <span>Ghi nhớ đăng nhập trên thiết bị này</span>
                                </label>
                                <span className="login-clinic">
                  <span className="login-status-dot" />
                  BMS Health
                </span>
                            </div>

                            {error && (
                                <div className="login-error" role="alert">
                                    {error}
                                </div>
                            )}

                            <button
                                type="submit"
                                className="login-submit"
                                disabled={loading}
                            >
                                {loading ? "Đang đăng nhập..." : "Đăng nhập"}
                                {!loading && <span aria-hidden="true"> →</span>}
                            </button>
                        </form>

                        <div className="login-divider">
                            <span>HOẶC</span>
                        </div>

                        <button
                            type="button"
                            className="login-sso"
                            onClick={() =>
                                setError("Đăng nhập BMS AD chưa được cấu hình.")
                            }
                        >
                            <span aria-hidden="true">▦</span>
                            Đăng nhập bằng tài khoản nhân viên
                        </button>

                        <p className="login-register">
                            Chưa có tài khoản bệnh nhân?{" "}
                            <button
                                type="button"
                                className="login-text-button"
                                onClick={onRegister}
                            >
                                Tạo tài khoản
                            </button>
                        </p>

                        <div className="login-security-note">
                            <span aria-hidden="true">ⓘ</span>
                            <p>
                                Chỉ người dùng được cấp quyền mới được truy cập hệ thống.
                                Các chức năng xác thực và ghi nhật ký cần được triển khai
                                ở Backend.
                            </p>
                        </div>

                        <div className="login-copyright">
                            © 2026 BMS Health · Blood Laboratory Management System
                        </div>
                    </div>
                </section>
            </section>
        </main>
    );
}