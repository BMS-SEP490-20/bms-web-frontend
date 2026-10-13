/**
 * @file App.jsx
 * @description Main application routing configuration for BMS Web Frontend.
 */

import React from "react";
import {
    BrowserRouter as Router,
    Routes,
    Route,
    Navigate,
} from "react-router-dom";

import MainLayout from "./layouts/MainLayout";
import AuthLayout from "./layouts/AuthLayout";

import Register from "./features/auth/Register";
import LoginPage from "./features/auth/pages/LoginPage.jsx";
import ForgotPassword from "./features/auth/pages/ForgotPassword.jsx";
import ChangePassword from "./features/auth/ChangePassword";

import UserProfilePage from "./features/patient-portal/pages/UserProfilePage";
import RoleBasedDashboard from "./features/manager-dashboard/pages/RoleDashboard";
import SampleQueuePage from "./features/laboratory/pages/SampleQueuePage";
import RolesManagementPage from "./features/user-management/pages/RolesManagementPage";
import TestCriteriaPage from "./features/laboratory/pages/TestCriteriaPage";

import ServiceCatalogPage from './features/catalog/pages/ServiceCatalogPage';

import "./app.css";

function HomePage() {
    return (
        <main className="bms-home">
            <header className="bms-home-header">
                <div className="bms-home-brand">
                    <span className="bms-home-logo">BMS</span>

                    <div>
                        <strong>BMS Health</strong>
                        <small>
                            Blood Laboratory Management System
                        </small>
                    </div>
                </div>

                <a className="bms-home-button" href="/login">
                    Login <span aria-hidden="true">→</span>
                </a>
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
                    <a
                        className="bms-home-button bms-home-button-primary"
                        href="/login"
                    >
                        Đăng nhập hệ thống{" "}
                        <span aria-hidden="true">→</span>
                    </a>

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

function App() {
    return (
        <Router>
            <Routes>
                {/* Public pages */}
                <Route path="/" element={<HomePage />} />

                <Route element={<AuthLayout />}>
                    <Route
                        path="/login"
                        element={
                            <LoginPage
                                onBack={() => {
                                    window.location.href = "/";
                                }}
                                onRegister={() => {
                                    window.location.href = "/register";
                                }}
                                onForgotPassword={() => {
                                    window.location.href = "/forgot-password";
                                }}
                            />
                        }
                    />

                    <Route
                        path="/register"
                        element={<Register />}
                    />

                    <Route
                        path="/forgot-password"
                        element={
                            <ForgotPassword
                                onBackToLogin={() => {
                                    window.location.href = "/login";
                                }}
                                onRegister={() => {
                                    window.location.href = "/register";
                                }}
                                onOtpSent={(email, result) => {
                                    console.log(
                                        "OTP đã được yêu cầu cho:",
                                        email,
                                        result
                                    );
                                }}
                            />
                        }
                    />
                </Route>

                {/* Authenticated application pages */}
                <Route element={<MainLayout />}>
                    <Route
                        path="/dashboard"
                        element={<RoleBasedDashboard />}
                    />

                    <Route
                        path="/lab/queue"
                        element={<SampleQueuePage />}
                    />

                    <Route
                        path="/criteria"
                        element={<TestCriteriaPage />}
                    />

                    <Route
                        path="/laboratory/criteria"
                        element={<TestCriteriaPage />}
                    />

                    <Route
                        path="/profile"
                        element={<UserProfilePage />}
                    />

                    <Route
                        path="/roles"
                        element={<RolesManagementPage />}
                    />
                    <Route 
                        path="/services" 
                        element={<ServiceCatalogPage />} />

                    <Route
                        path="/change-password"
                        element={
                            <div className="container py-4">
                                <div className="row justify-content-center">
                                    <div className="col-md-7">
                                        <ChangePassword />
                                    </div>
                                </div>
                            </div>
                        }
                    />
                </Route>

                {/* Unknown paths */}
                <Route
                    path="*"
                    element={<Navigate to="/" replace />}
                />
            </Routes>
        </Router>
    );
}

export default App;
