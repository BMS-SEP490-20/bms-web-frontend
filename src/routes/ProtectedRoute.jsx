/**
 * @file ProtectedRoute.jsx
 * @description Route guard component enforcing authentication and RBAC authorization (BR-IAM-02).
 * Verifies JWT session token and user role before granting access to clinical/management modules.
 * Conforms to: Production Engineering Standards & AGENTS-DESIGN.md.
 */

import React from "react";
import { Navigate, Outlet, useLocation, Link } from "react-router-dom";
import { getToken } from "../config/api";

/**
 * Lấy thông tin user hiện tại từ bộ nhớ cục bộ
 */
function getCurrentUser() {
    try {
        const raw =
            localStorage.getItem("bms_user") ||
            sessionStorage.getItem("bms_user");
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
}

/**
 * Route guard bảo vệ các trang nội bộ của BMS.
 *
 * @param {object} props
 * @param {string[]} [props.allowedRoles] - Danh sách các vai trò được phép truy cập (vd: ['Admin', 'Manager'])
 * @param {React.ReactNode} [props.children] - Component con (nếu không dùng Outlet)
 */
export default function ProtectedRoute({ allowedRoles, children }) {
    const location = useLocation();
    const token = getToken();
    const user = getCurrentUser();

    // 1. Kiểm tra xác thực (Authentication)
    if (!token && !user) {
        // Chuyển hướng đến /login và lưu lại trang đang định vào
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    // 2. Kiểm tra phân quyền vai trò (Role-Based Access Control - RBAC)
    if (allowedRoles && allowedRoles.length > 0) {
        const userRole = (user?.role || user?.roleName || "Patient").toLowerCase();
        const hasPermission = allowedRoles.some(
            (role) => role.toLowerCase() === userRole
        );

        if (!hasPermission) {
            return (
                <div className="container py-5 text-center">
                    <div
                        className="card shadow-sm p-4 mx-auto"
                        style={{ maxWidth: 520, borderRadius: 16 }}
                    >
                        <div className="text-danger mb-3" style={{ fontSize: 48 }}>
                            🚫
                        </div>
                        <h4 className="fw-bold text-dark">
                            Truy Cập Bị Từ Chối (403 Forbidden)
                        </h4>
                        <p className="text-muted small mt-2">
                            Tài khoản của bạn với vai trò{" "}
                            <span className="badge bg-secondary">
                                {user?.role || "Người dùng"}
                            </span>{" "}
                            không có quyền truy cập vào chức năng này.
                        </p>
                        <div className="d-flex justify-content-center gap-2 mt-3">
                            <Link to="/dashboard" className="btn btn-primary px-4">
                                Về Bảng Điều Khiển
                            </Link>
                            <Link to="/" className="btn btn-outline-secondary px-4">
                                Về Trang Chủ
                            </Link>
                        </div>
                    </div>
                </div>
            );
        }
    }

    return children ? children : <Outlet />;
}
