
/**
 * @file ServicePackagesPage.jsx
 * @description Master clinical service package management dashboard (UC15 - Hứa Khánh Duy / Võ Gia Huy).
 * Enables clinical administrators to view, search, compose, update, and soft-delete test bundles and packages.
 * Conforms to: Production Engineering Standards & AGENTS-DESIGN.md.
 * @module features/admin/pages/ServicePackagesPage
 */

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
    getPackages,
    getTestCriteria,
    deletePackage,
} from "../api/packageApi.jsx";
import PackageFormModal, {
    getTestIds,
    STATUS_OPTIONS,
} from "../components/PackageFormModal.jsx";
import ConfirmDeleteModal from "../components/ConfirmDeleteModal.jsx";
import "../admin.css";

/**
 * Normalizes array payloads from diverse backend wrapper envelope formats.
 *
 * @param {any} response - Raw API response data.
 * @returns {any[]} Guaranteed JavaScript array.
 */
function normalizeArray(response) {
    if (Array.isArray(response)) return response;
    if (Array.isArray(response?.items)) return response.items;
    if (Array.isArray(response?.data)) return normalizeArray(response.data);
    if (Array.isArray(response?.result)) return normalizeArray(response.result);
    if (Array.isArray(response?.results)) return response.results;
    return [];
}

/**
 * Normalizes package entity properties to uniform frontend field naming.
 *
 * @param {object} pkg - Raw package entity from API.
 * @returns {object} Clean package model for rendering.
 */
function normalizePackage(pkg) {
    return {
        ...pkg,
        _id: pkg._id || pkg.id,
        code: pkg.code ?? pkg.Code ?? "",
        name: pkg.name ?? pkg.Name ?? "",
        description: pkg.description ?? pkg.Description ?? "",
        price: pkg.price ?? pkg.Price ?? 0,
        discountPrice: pkg.discountPrice ?? pkg.DiscountPrice ?? null,
        tests: pkg.tests ?? pkg.Tests ?? [],
        isActive: pkg.isActive ?? pkg.IsActive ?? (pkg.status === "ACTIVE"),
        isDeleted: pkg.isDeleted ?? pkg.IsDeleted ?? false,
        createdAt: pkg.createdAt ?? pkg.CreatedAt ?? null,
        updatedAt: pkg.updatedAt ?? pkg.UpdatedAt ?? null,
        deletedAt: pkg.deletedAt ?? pkg.DeletedAt ?? null,
        deletedBy: pkg.deletedBy ?? pkg.DeletedBy ?? null,
        createdBy: pkg.createdBy ?? pkg.CreatedBy ?? null,
        updatedBy: pkg.updatedBy ?? pkg.UpdatedBy ?? null,
    };
}

function formatDate(value) {
    if (!value) return "—";

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "—";

    return date.toLocaleString("vi-VN");
}

function formatMoney(value) {
    if (value === null || value === undefined || value === "") {
        return "—";
    }

    return Number(value).toLocaleString("vi-VN") + " đ";
}

/**
 * Service Packages administration page component.
 *
 * @param {object} props - Component properties.
 * @param {Function} [props.onBack] - Callback when clicking return button.
 * @returns {JSX.Element} Rendered service packages dashboard.
 */
export default function ServicePackagesPage({ onBack }) {
    const [packages, setPackages] = useState([]);
    const [criteria, setCriteria] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("ALL");
    const [formOpen, setFormOpen] = useState(false);
    const [editing, setEditing] = useState(null);
    const [deleting, setDeleting] = useState(null);

    const userRole = useMemo(() => {
        try {
            const raw = localStorage.getItem("bms_user") || sessionStorage.getItem("bms_user");
            const parsed = raw ? JSON.parse(raw) : null;
            const r = (parsed?.role || parsed?.roleName || "").toString().toUpperCase();
            if (r.includes("ADMIN")) return "ADMIN";
            if (r.includes("MANAGER")) return "MANAGER";
            return "STAFF";
        } catch {
            return "STAFF";
        }
    }, []);
    const canManage = userRole === "ADMIN" || userRole === "MANAGER";

    const load = useCallback(async () => {
        try {
            setLoading(true);
            setError("");

            const [packagesResponse, criteriaResponse] = await Promise.all([
                getPackages(),
                getTestCriteria(),
            ]);

            console.log("Packages API:", packagesResponse);
            console.log("Test criteria API:", criteriaResponse);

            setPackages(
                normalizeArray(packagesResponse).map(normalizePackage)
            );
            setCriteria(normalizeArray(criteriaResponse));
        } catch (err) {
            console.error("Lỗi tải gói dịch vụ:", err);
            setError(
                err.response?.data?.message ||
                err.response?.data?.Message ||
                err.response?.data?.title ||
                err.message ||
                "Không tải được dữ liệu."
            );
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    const visible = useMemo(() => {
        const query = search.trim().toLowerCase();

        return packages.filter((pkg) => {
            // Loại gói đã xóa mềm nếu API có trả về trường này.
            if (pkg.isDeleted) return false;

            const status = pkg.isActive ? "ACTIVE" : "DRAFT";

            if (statusFilter !== "ALL" && status !== statusFilter) {
                return false;
            }

            return (
                !query ||
                pkg.name.toLowerCase().includes(query) ||
                pkg.code.toLowerCase().includes(query) ||
                pkg.description.toLowerCase().includes(query) ||
                pkg.tests.some((test) =>
                    `${test.code || ""} ${test.name || ""}`
                        .toLowerCase()
                        .includes(query)
                )
            );
        });
    }, [packages, search, statusFilter]);

    const countOf = useCallback(
        (status) =>
            packages.filter(
                (pkg) =>
                    !pkg.isDeleted &&
                    (pkg.isActive ? "ACTIVE" : "DRAFT") === status
            ).length,
        [packages]
    );

    function openCreate() {
        setEditing(null);
        setFormOpen(true);
    }

    function openEdit(pkg) {
        setEditing(pkg);
        setFormOpen(true);
    }

    async function handleSaved() {
        setFormOpen(false);
        setEditing(null);
        await load();
    }

    async function handleDelete(pkg) {
        if (!pkg?._id) {
            setError("Không tìm thấy ID gói dịch vụ cần xóa.");
            return;
        }

        try {
            setError("");
            await deletePackage(pkg._id);
            setDeleting(null);
            await load();
        } catch (err) {
            console.error("Lỗi xóa gói dịch vụ:", err);
            setError(
                err.response?.data?.message ||
                err.response?.data?.Message ||
                err.response?.data?.title ||
                err.message ||
                "Không thể xóa gói dịch vụ."
            );
            setDeleting(null);
        }
    }

    function testCodes(pkg) {
        // API list đã trả sẵn code và name trong tests.
        if (pkg.tests?.length) {
            return pkg.tests
                .map((test) =>
                    typeof test === "string"
                        ? test
                        : `${test.code || ""}${test.name ? ` - ${test.name}` : ""}`
                )
                .join(", ");
        }

        const ids = getTestIds(pkg, criteria);
        const map = Object.fromEntries(
            criteria.map((item) => [item._id || item.id, item])
        );

        return ids
            .map((id) => map[id]?.code || id)
            .join(", ");
    }

    const activePackages = packages.filter(
        (pkg) => !pkg.isDeleted && pkg.isActive
    ).length;

    const deletedPackages = packages.filter(
        (pkg) => pkg.isDeleted
    ).length;

    return (
        <div className="adm-page">
            <div className="adm-page-head">
                <div>
                    {onBack && (
                        <button
                            type="button"
                            className="adm-link"
                            onClick={onBack}
                            style={{ marginBottom: 6 }}
                        >
                            ← Trang chủ
                        </button>
                    )}

                    <h1>Quản Lý Gói Dịch Vụ Xét Nghiệm</h1>
                    <div className="adm-sub">
                        {packages.filter((p) => !p.isDeleted).length} gói dịch vụ
                        {" · "}
                        {activePackages} đang hoạt động
                        {deletedPackages > 0 &&
                            ` · ${deletedPackages} đã lưu trữ`}
                    </div>
                </div>

                <div className="d-flex align-items-center gap-2">
                    <a
                        href="/services"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="adm-btn adm-btn-ghost d-flex align-items-center gap-1 text-decoration-none"
                        style={{
                            border: "1px solid #cbd5e1",
                            color: "#1e293b",
                            background: "#ffffff",
                            padding: "8px 14px",
                            borderRadius: "6px",
                            fontWeight: 500,
                            fontSize: "13px",
                            boxShadow: "0 1px 2px rgba(0,0,0,0.05)"
                        }}
                        title="Mở cổng tra cứu công khai của bệnh nhân trên tab mới"
                    >
                        <span>👁 Xem Web Bệnh Nhân ↗</span>
                    </a>

                    {canManage && (
                        <button
                            type="button"
                            className="adm-btn adm-btn-primary"
                            onClick={openCreate}
                        >
                            + Tạo gói
                        </button>
                    )}
                </div>
            </div>

            <div className="adm-card">
                <div className="adm-toolbar">
                    <input
                        className="adm-input adm-search"
                        placeholder="Tìm theo mã, tên, mô tả, xét nghiệm..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />

                    <button
                        type="button"
                        className={`adm-chip ${statusFilter === "ALL" ? "on" : ""}`}
                        onClick={() => setStatusFilter("ALL")}
                    >
                        Tất cả
                        <span>{packages.filter((p) => !p.isDeleted).length}</span>
                    </button>

                    {STATUS_OPTIONS.map((status) => (
                        <button
                            type="button"
                            key={status.value}
                            className={`adm-chip ${
                                statusFilter === status.value ? "on" : ""
                            }`}
                            onClick={() => setStatusFilter(status.value)}
                        >
                            {status.label}
                            <span>{countOf(status.value)}</span>
                        </button>
                    ))}
                </div>

                {error && (
                    <div className="adm-error d-flex align-items-center justify-content-between flex-wrap gap-2" style={{ margin: 16 }}>
                        <div>
                            {error.includes("401") || error.includes("Unauthorized")
                                ? "Phiên làm việc hết hạn hoặc chưa được xác thực (Mã lỗi 401). Vui lòng đăng nhập lại tài khoản Quản trị viên để tiếp tục."
                                : error}
                        </div>
                        <div className="d-flex align-items-center gap-2">
                            {(error.includes("401") || error.includes("Unauthorized")) && (
                                <a href="/login" className="btn btn-sm btn-primary py-1 px-3 text-white text-decoration-none" style={{ borderRadius: 6, fontSize: '12px' }}>
                                    Đăng nhập lại
                                </a>
                            )}
                            <button
                                type="button"
                                className="adm-link"
                                onClick={load}
                            >
                                Thử lại
                            </button>
                        </div>
                    </div>
                )}

                <div className="adm-table-wrap">
                    <table className="adm-table">
                        <thead>
                        <tr>
                            <th>Mã</th>
                            <th>Tên gói / Mô tả</th>
                            <th>Xét nghiệm</th>
                            <th className="rt">Giá gốc</th>
                            <th className="rt">Giá ưu đãi</th>
                            <th>Trạng thái</th>
                            <th>Ngày tạo</th>
                            <th>Cập nhật</th>
                            <th />
                        </tr>
                        </thead>

                        <tbody>
                        {loading && (
                            <tr>
                                <td colSpan={9} className="adm-empty">
                                    Đang tải...
                                </td>
                            </tr>
                        )}

                        {!loading && !error && visible.length === 0 && (
                            <tr>
                                <td colSpan={9} className="adm-empty">
                                    Không có gói nào.
                                </td>
                            </tr>
                        )}

                        {!loading &&
                            visible.map((pkg) => (
                                <tr key={pkg._id}>
                                    <td className="adm-code">
                                        {pkg.code}
                                    </td>

                                    <td>
                                        <strong>{pkg.name}</strong>
                                        <div className="adm-muted">
                                            {pkg.description || "Không có mô tả"}
                                        </div>
                                    </td>

                                    <td className="adm-muted">
                                        {testCodes(pkg) || "—"}
                                    </td>

                                    <td className="rt">
                                        {formatMoney(pkg.price)}
                                    </td>

                                    <td className="rt">
                                        {formatMoney(pkg.discountPrice)}
                                    </td>

                                    <td>
                                            <span
                                                className={`adm-pill ${
                                                    pkg.isActive ? "ok" : ""
                                                }`}
                                            >
                                                {pkg.isActive
                                                    ? "Active"
                                                    : "Draft"}
                                            </span>
                                    </td>

                                    <td>{formatDate(pkg.createdAt)}</td>
                                    <td>{formatDate(pkg.updatedAt)}</td>

                                    <td className="rt adm-actions">
                                        {canManage ? (
                                            <>
                                                <button
                                                    type="button"
                                                    className="adm-btn adm-btn-ghost adm-btn-sm"
                                                    onClick={() => openEdit(pkg)}
                                                >
                                                    Sửa
                                                </button>

                                                <button
                                                    type="button"
                                                    className="adm-btn adm-btn-ghost adm-btn-sm adm-text-danger"
                                                    onClick={() => setDeleting(pkg)}
                                                >
                                                    Xóa
                                                </button>
                                            </>
                                        ) : (
                                            <span className="adm-muted text-nowrap" style={{ fontSize: "12px" }}>
                                                Chỉ xem
                                            </span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <PackageFormModal
                open={formOpen}
                pkg={editing}
                criteria={criteria}
                onClose={() => setFormOpen(false)}
                onSaved={handleSaved}
            />

            <ConfirmDeleteModal
                item={deleting}
                onClose={() => setDeleting(null)}
                onConfirm={handleDelete}
            />
        </div>
    );
}