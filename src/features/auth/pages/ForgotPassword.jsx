import { useState } from "react";
import { sendPasswordRecoveryOtp } from "../api/authApi";
import "../styles/ForgotPassword.css";

export default function ForgotPassword({
                                           onBackToLogin,
                                           onRegister,
                                           onOtpSent,
                                       }) {
    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");

    const validateEmail = (value) =>
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

    async function handleSubmit(event) {
        event.preventDefault();
        setMessage("");
        setError("");

        if (!email.trim()) {
            setError("Vui lòng nhập địa chỉ email.");
            return;
        }

        if (!validateEmail(email)) {
            setError("Địa chỉ email không đúng định dạng.");
            return;
        }

        try {
            setLoading(true);
            const result = await sendPasswordRecoveryOtp(email);

            setMessage(
                result?.message ||
                "Nếu email tồn tại trong hệ thống, mã OTP khôi phục sẽ được gửi đến hộp thư của bạn."
            );

            // Có thể chuyển sang màn hình xác thực OTP tại đây.
            onOtpSent?.(email.trim(), result);
        } catch (err) {
            const status = err?.response?.status;
            const apiMessage =
                err?.response?.data?.message ||
                err?.response?.data?.title ||
                err?.response?.data?.error;

            if (!err?.response) {
                setError(
                    "Không thể kết nối đến máy chủ. Vui lòng kiểm tra backend và thử lại."
                );
            } else if (status === 404) {
                setError(
                    "API gửi OTP chưa được tìm thấy (404). Hãy kiểm tra route forgot-password ở backend."
                );
            } else {
                setError(apiMessage || "Gửi OTP thất bại. Vui lòng thử lại.");
            }
        } finally {
            setLoading(false);
        }
    }

    return (
        <main className="bms-forgot-page">
            <section className="bms-forgot-card" aria-label="Forgot password">
                <aside className="bms-forgot-aside">
                    <div className="bms-auth-logo">
                        <span className="bms-logo-mark">BMS</span>
                        <span className="bms-logo-copy">
              Blood Laboratory Management System
              <small>Clinical Operations Suite</small>
            </span>
                    </div>

                    <div className="bms-aside-content">
                        <div className="bms-eyebrow">ACCOUNT RECOVERY</div>
                        <h2>
                            Can't sign in?
                            <br />
                            We'll help you back in.
                        </h2>
                        <p>
                            Enter the email address associated with your account. We’ll send
                            you a one-time code so you can securely reset your password.
                        </p>

                        <div className="bms-feature-list">
                            <div className="bms-feature">
                                <i className="bi bi-envelope-paper" aria-hidden="true" />
                                <span>Recovery code sent to your registered email</span>
                            </div>
                            <div className="bms-feature">
                                <i className="bi bi-shield-lock" aria-hidden="true" />
                                <span>Your account stays protected during recovery</span>
                            </div>
                            <div className="bms-feature">
                                <i className="bi bi-arrow-counterclockwise" aria-hidden="true" />
                                <span>Request another code if you don't receive it</span>
                            </div>
                        </div>
                    </div>

                    <div className="bms-aside-footer">
                        <span>BR-05 · CR-02 · CR-09</span>
                        <span>BMS · v2.4.0</span>
                    </div>
                </aside>

                <section className="bms-forgot-form-panel">
                    <div className="bms-form-inner">
                        <div className="bms-icon-badge">
                            <i className="bi bi-key-fill" aria-hidden="true" />
                        </div>

                        <div className="bms-form-eyebrow">PASSWORD RECOVERY</div>
                        <h1>Forgot your password?</h1>
                        <p className="bms-form-subtitle">
                            No problem. Enter your email and we'll send a one-time code.
                        </p>

                        <form onSubmit={handleSubmit} noValidate>
                            <div className="bms-field">
                                <label htmlFor="recovery-email">
                                    Email address <span aria-hidden="true">*</span>
                                </label>
                                <div className="bms-input-wrap">
                                    <i className="bi bi-envelope" aria-hidden="true" />
                                    <input
                                        id="recovery-email"
                                        name="email"
                                        type="email"
                                        autoComplete="email"
                                        placeholder="name@example.com"
                                        value={email}
                                        onChange={(event) => {
                                            setEmail(event.target.value);
                                            setError("");
                                            setMessage("");
                                        }}
                                        required
                                        disabled={loading}
                                    />
                                </div>
                                <small>
                                    Use the email address registered with your BMS account.
                                </small>
                            </div>

                            {error && (
                                <div className="bms-alert bms-alert-error" role="alert">
                                    <i className="bi bi-exclamation-circle-fill" aria-hidden="true" />
                                    <span>{error}</span>
                                </div>
                            )}

                            {message && (
                                <div className="bms-alert bms-alert-success" role="status">
                                    <i className="bi bi-check-circle-fill" aria-hidden="true" />
                                    <span>{message}</span>
                                </div>
                            )}

                            <button
                                className="bms-submit-btn"
                                type="submit"
                                disabled={loading}
                            >
                                {loading ? (
                                    <>
                                        <span className="bms-spinner" aria-hidden="true" />
                                        Sending code...
                                    </>
                                ) : (
                                    <>
                                        <i className="bi bi-send" aria-hidden="true" />
                                        Send recovery code
                                    </>
                                )}
                            </button>
                        </form>

                        <div className="bms-form-links">
                            <button
                                className="bms-text-link"
                                type="button"
                                onClick={onBackToLogin}
                            >
                                <i className="bi bi-arrow-left" aria-hidden="true" />
                                Back to sign in
                            </button>
                            <button
                                className="bms-text-link bms-muted-link"
                                type="button"
                                onClick={onRegister}
                            >
                                Don't have an account? Register
                            </button>
                        </div>

                        <div className="bms-info-note">
                            <i className="bi bi-info-circle" aria-hidden="true" />
                            <div>
                                <strong>Didn't register with us?</strong>
                                <p>
                                    If your account was created at reception, use the email you
                                    provided when registering. Contact support if you're unsure.
                                </p>
                            </div>
                        </div>

                        <div className="bms-privacy-note">
                            <i className="bi bi-shield-check" aria-hidden="true" />
                            Your account information is handled securely.
                        </div>
                    </div>
                </section>
            </section>
        </main>
    );
}
