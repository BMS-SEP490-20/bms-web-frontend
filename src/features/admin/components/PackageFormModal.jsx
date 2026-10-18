
/**
 * @file PackageFormModal.jsx
 * @description Administration modal form for composing, creating, and updating laboratory service packages (UC15).
 * Allows clinical administrators to set package codes, names, promotional pricing, status, and associated test criteria.
 * Conforms to: Production Engineering Standards & AGENTS-DESIGN.md.
 * @module features/admin/components/PackageFormModal
 */

import React, { useEffect, useMemo, useState } from "react";
import Modal from "./Modal.jsx";
import { createPackage, updatePackage } from "../api/packageApi.jsx";

export const STATUS_OPTIONS = [
    { value: "ACTIVE", label: "Active" },
    { value: "DRAFT", label: "Draft" },
];

/**
 * Normalizes test identifiers from package entities supporting both string IDs and test objects.
 *
 * @param {object} pkg - Service package entity.
 * @param {object[]} [criteria=[]] - Master test criteria collection.
 * @returns {string[]} List of resolved test criterion IDs.
 */
export function getTestIds(pkg, criteria = []) {
    const raw = pkg?.testIds || pkg?.tests || [];

    return raw
        .map((test) => {
            if (typeof test === "string") {
                const found = criteria.find(
                    (c) => c._id === test || c.id === test || c.code === test
                );
                return found ? (found._id || found.id || found.code) : test;
            }

            const testId = test._id || test.id;
            if (testId) {
                const found = criteria.find(
                    (c) => (c._id || c.id) === testId
                );
                return found ? (found._id || found.id || found.code) : testId;
            }

            const found = criteria.find((c) => c.code === test.code);
            return found
                ? (found._id || found.id || found.code)
                : test.code;
        })
        .filter(Boolean);
}

const EMPTY = {
    code: "",
    name: "",
    description: "",
    price: "",
    discountPrice: "",
    status: "ACTIVE",
    testIds: [],
};

/**
 * Service package form modal component supporting create and edit workflows.
 *
 * @param {object} props - Component properties.
 * @param {boolean} props.open - Modal visibility state.
 * @param {object|null} [props.pkg] - Package to edit, or null when creating.
 * @param {object[]} [props.criteria=[]] - Available test criteria for multi-selection.
 * @param {Function} props.onClose - Callback to dismiss the modal.
 * @param {Function} props.onSaved - Callback triggered after successful creation or update.
 * @returns {JSX.Element} Rendered form modal.
 */
export default function PackageFormModal({
    open,
    pkg,
    criteria = [],
    onClose,
    onSaved,
}) {
    const isEdit = Boolean(pkg);

    const [form, setForm] = useState(EMPTY);
    const [search, setSearch] = useState("");
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        if (!open) return;

        setError("");
        setSearch("");

        setForm(
            pkg
                ? {
                    code: pkg.code ?? pkg.Code ?? "",
                    name: pkg.name ?? pkg.Name ?? "",
                    description:
                        pkg.description ?? pkg.Description ?? "",
                    price: pkg.price ?? pkg.Price ?? "",
                    discountPrice:
                        pkg.discountPrice ?? pkg.DiscountPrice ?? "",
                    status:
                        (pkg.isActive ?? pkg.IsActive) === false
                            ? "DRAFT"
                            : "ACTIVE",
                    testIds: getTestIds(pkg, criteria),
                }
                : { ...EMPTY, testIds: [] }
        );
    }, [open, pkg, criteria]);

    const categories = useMemo(
        () => [
            ...new Set(
                criteria.map((c) => c.category).filter(Boolean)
            ),
        ],
        [criteria]
    );

    const grouped = useMemo(() => {
        const q = search.trim().toLowerCase();

        const filtered = criteria.filter((c) =>
            [c.name, c.code, c.category].some((value) =>
                String(value || "").toLowerCase().includes(q)
            )
        );

        return filtered.reduce((acc, c) => {
            const category = c.category || "Khác";
            (acc[category] ||= []).push(c);
            return acc;
        }, {});
    }, [criteria, search]);

    function setField(name, value) {
        setForm((f) => ({ ...f, [name]: value }));
    }

    function toggleTest(id) {
        setForm((f) => ({
            ...f,
            testIds: f.testIds.includes(id)
                ? f.testIds.filter((x) => x !== id)
                : [...f.testIds, id],
        }));
    }

    function toggleGroup(items) {
        const ids = items.map((c) => c._id || c.id || c.code);
        const allChecked = ids.every((id) =>
            form.testIds.includes(id)
        );

        setForm((f) => ({
            ...f,
            testIds: allChecked
                ? f.testIds.filter((id) => !ids.includes(id))
                : [...new Set([...f.testIds, ...ids])],
        }));
    }

    async function handleSubmit(e) {
        e.preventDefault();
        setError("");

        if (!form.code.trim() || !form.name.trim()) {
            setError("Vui lòng nhập mã gói và tên gói.");
            return;
        }

        if (
            form.price === "" ||
            !Number.isFinite(Number(form.price)) ||
            Number(form.price) < 0
        ) {
            setError("Giá gốc không hợp lệ.");
            return;
        }

        if (
            form.discountPrice !== "" &&
            (
                !Number.isFinite(Number(form.discountPrice)) ||
                Number(form.discountPrice) < 0
            )
        ) {
            setError("Giá ưu đãi không hợp lệ.");
            return;
        }

        if (
            form.discountPrice !== "" &&
            Number(form.discountPrice) > Number(form.price)
        ) {
            setError("Giá ưu đãi không được lớn hơn giá gốc.");
            return;
        }

        if (form.testIds.length === 0) {
            setError("Vui lòng chọn ít nhất một xét nghiệm.");
            return;
        }

        // Các trường dùng camelCase theo response API.
        // testIds cần khớp với DTO tạo/cập nhật của backend.
        const existingTests = pkg?.tests || pkg?.Tests || [];
        const tests = form.testIds
            .map((id) => {
                const found = criteria.find(
                    (c) =>
                        (c._id || c.id || c.code) === id ||
                        c.code === id
                );
                if (found) {
                    return { code: found.code, name: found.name };
                }
                const prev = existingTests.find(
                    (t) =>
                        typeof t === "object" &&
                        ((t._id || t.id || t.code) === id || t.code === id)
                );
                if (prev) {
                    return { code: prev.code, name: prev.name || prev.code };
                }
                return null;
            })
            .filter(Boolean);

        if (tests.length === 0) {
            setError("Một số xét nghiệm đã chọn không còn tồn tại. Vui lòng chọn lại.");
            return;
        }

        const payload = {
            code: form.code.trim(),
            name: form.name.trim(),
            description: form.description.trim(),
            price: Number(form.price),
            discountPrice:
                form.discountPrice === ""
                    ? null
                    : Number(form.discountPrice),
            isActive: form.status === "ACTIVE",
            tests,
            ...(pkg?.category !== undefined ? { category: pkg.category } : {}),
            ...(pkg?.preparationNotes !== undefined ? { preparationNotes: pkg.preparationNotes } : {}),
        };

        try {
            setSaving(true);

            if (isEdit) {
                await updatePackage(pkg._id || pkg.id, payload);
            } else {
                await createPackage(payload);
            }

            await onSaved();
        } catch (err) {
            console.error("Lỗi lưu gói dịch vụ:", err);

            setError(
                err.response?.data?.message ||
                err.response?.data?.Message ||
                err.response?.data?.title ||
                err.message ||
                "Lưu gói dịch vụ thất bại."
            );
        } finally {
            setSaving(false);
        }
    }

    return (
        <Modal
            open={open}
            wide
            title={isEdit ? `Sửa gói ${pkg.code || pkg.Code}` : "Tạo gói dịch vụ"}
            onClose={saving ? () => {} : onClose}
            footer={
                <>
                    <button
                        type="button"
                        className="adm-btn adm-btn-ghost"
                        onClick={onClose}
                        disabled={saving}
                    >
                        Hủy
                    </button>

                    <button
                        type="submit"
                        form="package-form"
                        className="adm-btn adm-btn-primary"
                        disabled={saving}
                    >
                        {saving
                            ? "Đang lưu..."
                            : isEdit
                                ? "Lưu thay đổi"
                                : "Tạo gói"}
                    </button>
                </>
            }
        >
            <form
                id="package-form"
                onSubmit={handleSubmit}
                className="adm-form"
            >
                <div className="adm-grid-2">
                    <label className="adm-field">
                        <span>Mã gói *</span>
                        <input
                            className="adm-input"
                            value={form.code}
                            onChange={(e) =>
                                setField("code", e.target.value)
                            }
                            placeholder="GOI-TQ-001"
                            required
                        />
                    </label>

                    <label className="adm-field">
                        <span>Trạng thái</span>
                        <select
                            className="adm-input"
                            value={form.status}
                            onChange={(e) =>
                                setField("status", e.target.value)
                            }
                        >
                            {STATUS_OPTIONS.map((s) => (
                                <option key={s.value} value={s.value}>
                                    {s.label}
                                </option>
                            ))}
                        </select>
                    </label>
                </div>

                <label className="adm-field">
                    <span>Tên gói *</span>
                    <input
                        className="adm-input"
                        value={form.name}
                        onChange={(e) =>
                            setField("name", e.target.value)
                        }
                        placeholder="Gói khám tổng quát"
                        required
                    />
                </label>

                <label className="adm-field">
                    <span>Mô tả</span>
                    <textarea
                        className="adm-input"
                        value={form.description}
                        onChange={(e) =>
                            setField("description", e.target.value)
                        }
                        placeholder="Mô tả các dịch vụ có trong gói..."
                        rows={3}
                    />
                </label>

                <div className="adm-grid-2">
                    <label className="adm-field">
                        <span>Giá gốc (VND) *</span>
                        <input
                            className="adm-input"
                            type="number"
                            min="0"
                            step="1"
                            value={form.price}
                            onChange={(e) =>
                                setField("price", e.target.value)
                            }
                            required
                        />
                    </label>

                    <label className="adm-field">
                        <span>Giá ưu đãi (VND)</span>
                        <input
                            className="adm-input"
                            type="number"
                            min="0"
                            step="1"
                            value={form.discountPrice}
                            onChange={(e) =>
                                setField("discountPrice", e.target.value)
                            }
                            placeholder="Để trống nếu không giảm giá"
                        />
                    </label>
                </div>

                <div className="adm-field">
                    <span>
                        Xét nghiệm trong gói *
                        {" "}
                        <em className="adm-count">
                            ({form.testIds.length} đã chọn)
                        </em>
                    </span>

                    <input
                        className="adm-input"
                        placeholder="Tìm theo mã, tên hoặc nhóm..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />

                    <div className="adm-picker">
                        {Object.keys(grouped).length === 0 && (
                            <div className="adm-empty">
                                Không tìm thấy xét nghiệm.
                            </div>
                        )}

                        {Object.entries(grouped).map(
                            ([category, items]) => (
                                <div key={category}>
                                    <div className="adm-picker-group">
                                        <strong>{category}</strong>

                                        <button
                                            type="button"
                                            className="adm-link"
                                            onClick={() =>
                                                toggleGroup(items)
                                            }
                                        >
                                            {items.every((c) =>
                                                form.testIds.includes(
                                                    c._id || c.id || c.code
                                                )
                                            )
                                                ? "Bỏ chọn nhóm"
                                                : "Chọn cả nhóm"}
                                        </button>
                                    </div>

                                    {items.map((c) => {
                                        const id =
                                            c._id || c.id || c.code;

                                        return (
                                            <label
                                                key={id}
                                                className="adm-picker-item"
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={form.testIds.includes(id)}
                                                    onChange={() =>
                                                        toggleTest(id)
                                                    }
                                                />

                                                <span className="adm-code">
                                                    {c.code}
                                                </span>

                                                <span className="adm-picker-name">
                                                    {c.name}
                                                </span>

                                                <span className="adm-unit">
                                                    {c.unit || ""}
                                                </span>
                                            </label>
                                        );
                                    })}
                                </div>
                            )
                        )}
                    </div>
                </div>

                {error && (
                    <div className="adm-error">{error}</div>
                )}
            </form>
        </Modal>
    );
}