/**
 * @file ServicePackagesPage.jsx
 * @description Master clinical service package management dashboard (UC15).
 * Enables clinical administrators to view, search, compose, update, and soft-delete test bundles and packages.
 * Conforms to: Production Engineering Standards & AGENTS-DESIGN.md.
 * UI standardized with RBAC Roles Management (RolesManagementPage.jsx).
 * @module features/admin/pages/ServicePackagesPage
 */

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Table, Button, Form, InputGroup, Badge, Spinner, Alert, Pagination } from "react-bootstrap";
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
import PackageDetailModal from "../components/PackageDetailModal.jsx";
import "../../user-management/pages/RolesManagementPage.css";

import { ROLES, hasRole, getStoredUser } from "../../../constants/roles";
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
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize] = useState(10);
    const [formOpen, setFormOpen] = useState(false);
    const [editing, setEditing] = useState(null);
    const [deleting, setDeleting] = useState(null);
    const [detailPkg, setDetailPkg] = useState(null);

    // WHY: UC15 create/edit/delete packages is Admin-only (matrix §1.2); missing user or role => read-only.
    const canManage = useMemo(() => hasRole(getStoredUser(), ROLES.ADMIN), []);

    const load = useCallback(async () => {
        try {
            setLoading(true);
            setError("");

            const [packagesResponse, criteriaResponse] = await Promise.all([
                getPackages(),
                getTestCriteria(),
            ]);

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
                "Không tải được danh sách gói dịch vụ xét nghiệm từ máy chủ."
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

    // Reset pagination when search or status filter changes
    useEffect(() => {
        setCurrentPage(1);
    }, [search, statusFilter]);

    const totalPages = Math.ceil(visible.length / pageSize) || 1;
    const paginatedPackages = useMemo(() => {
        const start = (currentPage - 1) * pageSize;
        return visible.slice(start, start + pageSize);
    }, [visible, currentPage, pageSize]);

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

    return (
        <div className="bms-roles-page">
            {/* Header */}
            <div className="d-flex justify-content-between align-items-center bms-roles-header">
                <div>
                    <h4 className="fw-bold m-0 text-dark">
                        <i className="bi bi-box-seam-fill text-primary me-2"></i>
                        Quản Lý Gói Dịch Vụ Xét Nghiệm
                    </h4>
                    <small className="text-muted">
                        Danh mục các gói xét nghiệm lâm sàng, cấu hình xét nghiệm thành phần và đơn giá niêm yết (UC15)
                    </small>
                </div>
                <div className="d-flex align-items-center gap-2">
                    <Button
                        variant="outline-secondary"
                        href="/services"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="fw-semibold"
                        title="Mở cổng tra cứu công khai của bệnh nhân trên tab mới"
                    >
                        <i className="bi bi-eye-fill me-1"></i>
                        Xem Web Bệnh Nhân ↗
                    </Button>

                    {canManage && (
                        <Button
                            variant="primary"
                            onClick={openCreate}
                            className="text-white fw-semibold"
                        >
                            <i className="bi bi-plus-circle-fill me-2"></i>
                            Thêm Gói Mới
                        </Button>
                    )}
                </div>
            </div>

            {error && (
                <Alert
                    variant="danger"
                    dismissible
                    onClose={() => setError("")}
                    className="mb-4"
                >
                    <i className="bi bi-exclamation-triangle-fill me-2"></i>
                    {error}
                </Alert>
            )}

            {/* Main Card */}
            <div className="bms-roles-card">
                {/* Toolbar */}
                <div className="bms-table-toolbar">
                    <div className="row g-3 align-items-center">
                        <div className="col-12 col-md-5">
                            <InputGroup>
                                <InputGroup.Text className="bg-white border-end-0">
                                    <i className="bi bi-search text-muted"></i>
                                </InputGroup.Text>
                                <Form.Control
                                    type="text"
                                    placeholder="Tìm theo mã, tên gói, chỉ số xét nghiệm..."
                                    className="border-start-0"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                />
                            </InputGroup>
                        </div>

                        <div className="col-6 col-md-3">
                            <Form.Select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                            >
                                <option value="ALL">Tất Cả Trạng Thái</option>
                                <option value="ACTIVE">Đang Hoạt Động</option>
                                <option value="DRAFT">Tạm Khóa / Nháp</option>
                            </Form.Select>
                        </div>

                        <div className="col-6 col-md-4 text-end text-muted small">
                            Hiển thị <strong>{paginatedPackages.length}</strong> trên tổng số <strong>{visible.length}</strong> gói dịch vụ
                        </div>
                    </div>
                </div>

                {/* Data Table */}
                <div className="table-responsive">
                    <Table hover className="bms-roles-table m-0">
                        <thead>
                            <tr>
                                <th className="bms-align-center" style={{ width: "160px" }}>Mã Gói</th>
                                <th>Tên Gói Dịch Vụ</th>
                                <th>Mô Tả & Chỉ Số</th>
                                <th className="bms-align-right" style={{ width: "160px" }}>Giá Niêm Yết</th>
                                <th className="bms-align-center" style={{ width: "140px" }}>Trạng Thái</th>
                                <th className="bms-align-right" style={{ width: "130px" }}>Thao Tác</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan="6" className="text-center py-5">
                                        <Spinner animation="border" variant="primary" size="sm" className="me-2" />
                                        Đang tải danh sách gói dịch vụ...
                                    </td>
                                </tr>
                            ) : visible.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="text-center py-5 text-muted">
                                        <i className="bi bi-inbox fs-2 d-block mb-2 text-muted"></i>
                                        Không tìm thấy gói dịch vụ nào phù hợp với bộ lọc tìm kiếm.
                                    </td>
                                </tr>
                            ) : (
                                paginatedPackages.map((pkg) => (
                                    <tr key={pkg._id}>
                                        <td className="bms-align-center">
                                            <span className="bms-role-code-cell">{pkg.code}</span>
                                        </td>
                                        <td>
                                            <div className="fw-bold text-dark">{pkg.name}</div>
                                            <Badge bg="info" className="small me-1 text-dark" style={{ fontSize: "10px" }}>
                                                <i className="bi bi-lock-fill me-1"></i>Hệ Thống Cốt Lõi
                                            </Badge>
                                        </td>
                                        <td>
                                            <div className="text-muted small text-truncate" style={{ maxWidth: "350px" }}>
                                                {pkg.description || "Không có mô tả chi tiết."}
                                            </div>
                                            <div className="mt-1">
                                                <Badge bg="secondary" className="px-2 py-1">
                                                    {pkg.tests?.length || 0} Chỉ Số
                                                </Badge>
                                                {pkg.tests?.length > 0 && (
                                                    <span className="text-muted ms-2 small">
                                                        ({testCodes(pkg).slice(0, 45)}
                                                        {testCodes(pkg).length > 45 ? "..." : ""})
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="bms-align-right">
                                            <div className="fw-bold text-primary">{formatMoney(pkg.price)}</div>
                                            {pkg.discountPrice && (
                                                <small className="text-muted text-decoration-line-through d-block">
                                                    {formatMoney(pkg.discountPrice)}
                                                </small>
                                            )}
                                        </td>
                                        <td className="bms-align-center">
                                            <span className={`bms-status-pill ${pkg.isActive ? "active" : "inactive"}`}>
                                                <i className="bi bi-circle-fill" style={{ fontSize: "7px" }}></i>
                                                {pkg.isActive ? "Hoạt Động" : "Tạm Khóa"}
                                            </span>
                                        </td>
                                        <td className="bms-align-right">
                                            <div className="bms-action-btn-group">
                                                <Button
                                                    variant="outline-secondary"
                                                    size="sm"
                                                    title="Xem chi tiết gói dịch vụ"
                                                    onClick={() => setDetailPkg(pkg)}
                                                >
                                                    <i className="bi bi-eye"></i>
                                                </Button>
                                                <Button
                                                    variant="outline-primary"
                                                    size="sm"
                                                    title="Chỉnh sửa gói dịch vụ"
                                                    onClick={() => openEdit(pkg)}
                                                    disabled={!canManage}
                                                >
                                                    <i className="bi bi-pencil"></i>
                                                </Button>
                                                <Button
                                                    variant="outline-danger"
                                                    size="sm"
                                                    title="Xóa gói dịch vụ"
                                                    onClick={() => setDeleting(pkg)}
                                                    disabled={!canManage}
                                                >
                                                    <i className="bi bi-trash"></i>
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </Table>
                </div>

                {/* Pagination Footer */}
                {totalPages > 1 && (
                    <div className="p-3 border-top d-flex justify-content-between align-items-center bg-light">
                        <small className="text-muted">
                            Trang {currentPage} / {totalPages}
                        </small>
                        <Pagination className="m-0" size="sm">
                            <Pagination.Prev
                                disabled={currentPage === 1}
                                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                            />
                            {Array.from({ length: totalPages }).map((_, i) => (
                                <Pagination.Item
                                    key={i + 1}
                                    active={i + 1 === currentPage}
                                    onClick={() => setCurrentPage(i + 1)}
                                >
                                    {i + 1}
                                </Pagination.Item>
                            ))}
                            <Pagination.Next
                                disabled={currentPage === totalPages}
                                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                            />
                        </Pagination>
                    </div>
                )}
            </div>

            {/* Modals */}
            <PackageDetailModal
                pkg={detailPkg}
                onClose={() => setDetailPkg(null)}
                onEdit={openEdit}
            />

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
