
import React, { useState } from "react";
import LoginPage from "./features/auth/pages/LoginPage.jsx";
import ForgotPassword from "./features/auth/pages/ForgotPassword.jsx";
import "./app.css";

export default function App() {
    const [page, setPage] = useState("home");

    if (page === "login") {
        return (
            <LoginPage
                onBack={() => setPage("home")}
                onRegister={() => setPage("register")}
                onForgotPassword={() => setPage("forgot-password")}
            />
        );
    }

    if (page === "forgot-password") {
        return (
            <ForgotPassword
                onBackToLogin={() => setPage("login")}
                onRegister={() => setPage("register")}
                onOtpSent={(email, result) => {
                    console.log("OTP đã được yêu cầu cho:", email, result);
                    // Có thể chuyển sang trang xác thực OTP tại đây.
                }}
            />
        );
    }

    if (page === "register") {
        return (
            <main className="bms-home">
                <section className="bms-home-card">
                    <div className="bms-home-logo">BMS</div>
                    <h1>Đăng ký tài khoản</h1>
                    <p>
                        Trang đăng ký tài khoản sẽ được triển khai
                        thành component React riêng.
                    </p>
                    <button
                        className="bms-home-button"
                        onClick={() => setPage("login")}
                    >
                        Quay lại đăng nhập
                    </button>
                </section>
            </main>
        );
    }

    return (
        <main className="bms-home">
            <header className="bms-home-header">
                <div className="bms-home-brand">
                    <span className="bms-home-logo">BMS</span>
                    <div>
                        <strong>BMS Health</strong>
                        <small>Blood Laboratory Management System</small>
                    </div>
                </div>

                <button
                    className="bms-home-button"
                    onClick={() => setPage("login")}
                >
                    Login <span aria-hidden="true">→</span>
                </button>
            </header>

            <section className="bms-home-hero">
                <div className="bms-home-tag">
                    CLINICAL OPERATIONS SUITE
                </div>

                <h1>
                    Blood laboratory
                    <br />
                    management, <span>made simple.</span>
                </h1>

                <p>
                    Nền tảng quản lý phòng xét nghiệm máu và phòng khám,
                    hỗ trợ theo dõi mẫu bệnh phẩm, kết quả xét nghiệm
                    và quy trình làm việc trên cùng một hệ thống.
                </p>

                <div className="bms-home-actions">
                    <button
                        className="bms-home-button bms-home-button-primary"
                        onClick={() => setPage("login")}
                    >
                        Đăng nhập hệ thống{" "}
                        <span aria-hidden="true">→</span>
                    </button>

                    <span className="bms-home-caption">
                        Dành cho bệnh nhân và nhân viên được cấp quyền
                    </span>
                </div>

                <div className="bms-home-cards">
                    <article>
                        <span className="bms-home-card-icon">⌁</span>
                        <h2>Quản lý mẫu xét nghiệm</h2>
                        <p>
                            Theo dõi trạng thái mẫu trong quy trình xét nghiệm.
                        </p>
                    </article>

                    <article>
                        <span className="bms-home-card-icon">▤</span>
                        <h2>Quản lý kết quả</h2>
                        <p>
                            Hỗ trợ nhập, xem và duyệt kết quả theo phân quyền.
                        </p>
                    </article>

                    <article>
                        <span className="bms-home-card-icon">♙</span>
                        <h2>Quản lý bệnh nhân</h2>
                        <p>
                            Hỗ trợ tra cứu hồ sơ và lịch sử xét nghiệm.
                        </p>
                    </article>
                </div>
            </section>

            <footer className="bms-home-footer">
                <span>BMS Health</span>
                <span>
                    Blood Laboratory Management System · 2026
                </span>
            </footer>
        </main>
    );
}

