/**
 * @file PackageFormModal.jsx
 * @description Administration modal form for composing, creating, and updating laboratory service packages (UC15).
 * Conforms to: Production Engineering Standards & AGENTS-DESIGN.md.
 * Implemented using React-Bootstrap Modal for guaranteed standard modal behavior and animation.
 * @module features/admin/components/PackageFormModal
 */

import React, { useEffect, useMemo, useState } from "react";
import { Modal, Button, Form, Row, Col, Alert, Badge, Spinner, InputGroup } from "react-bootstrap";
import { createPackage, updatePackage } from "../api/packageApi.jsx";

export const STATUS_OPTIONS = [
    { value: "ACTIVE", label: "Hoạt Động (Active)" },
    { value: "DRAFT", label: "Tạm Khóa (Draft / Inactive)" },
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
                    description: pkg.description ?? pkg.Description ?? "",
                    price: pkg.price ?? pkg.Price ?? "",
                    discountPrice: pkg.discountPrice ?? pkg.DiscountPrice ?? "",
                    status: (pkg.isActive ?? pkg.IsActive) === false ? "DRAFT" : "ACTIVE",
                    testIds: getTestIds(pkg, criteria),
                }
                : { ...EMPTY, testIds: [] }
        );
    }, [open, pkg, criteria]);

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
        const allChecked = ids.every((id) => form.testIds.includes(id));

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
        };

        try {
            setSaving(true);
            if (isEdit) {
                const id = pkg._id || pkg.id;
                await updatePackage(id, payload);
            } else {
                await createPackage(payload);
            }
            onSaved();
        } catch (err) {
            setError(
                err.response?.data?.message ||
                err.response?.data?.Message ||
                err.response?.data?.title ||
                err.message ||
                "Lưu gói thất bại."
            );
        } finally {
            setSaving(false);
        }
    }

    return (
        <Modal show={open} onHide={saving ? undefined : onClose} size="lg" centered backdrop="static">
            <Modal.Header closeButton={!saving} className="bg-primary text-white py-3">
                <Modal.Title className="fs-6 fw-bold text-white d-flex align-items-center gap-2">
                    <i className="bi bi-box-seam-fill"></i>
                    {isEdit ? `Chỉnh Sửa Gói Dịch Vụ: ${pkg?.name || pkg?.code}` : 'Thêm Mới Gói Dịch Vụ Xét Nghiệm'}
                </Modal.Title>
            </Modal.Header>

            <Modal.Body className="p-4" style={{ maxHeight: '72vh', overflowY: 'auto' }}>
                {error && (
                    <Alert variant="danger" dismissible onClose={() => setError('')} className="py-2 small mb-3">
                        <i className="bi bi-exclamation-triangle-fill me-2"></i>
                        {error}
                    </Alert>
                )}

                <Form id="package-form" onSubmit={handleSubmit}>
                    <Row className="g-3 mb-3">
                        <Col md={6}>
                            <Form.Group>
                                <Form.Label className="small fw-semibold">Mã Gói Dịch Vụ <span className="text-danger">*</span></Form.Label>
                                <Form.Control
                                    type="text"
                                    value={form.code}
                                    onChange={(e) => setField('code', e.target.value.toUpperCase())}
                                    placeholder="VD: PKG-TQ-01, PKG-LIVER-02"
                                    required
                                />
                            </Form.Group>
                        </Col>
                        <Col md={6}>
                            <Form.Group>
                                <Form.Label className="small fw-semibold">Trạng Thái Hoạt Động</Form.Label>
                                <Form.Select
                                    value={form.status}
                                    onChange={(e) => setField('status', e.target.value)}
                                >
                                    {STATUS_OPTIONS.map((s) => (
                                        <option key={s.value} value={s.value}>
                                            {s.label}
                                        </option>
                                    ))}
                                </Form.Select>
                            </Form.Group>
                        </Col>
                        <Col md={12}>
                            <Form.Group>
                                <Form.Label className="small fw-semibold">Tên Gói Dịch Vụ Xét Nghiệm <span className="text-danger">*</span></Form.Label>
                                <Form.Control
                                    type="text"
                                    value={form.name}
                                    onChange={(e) => setField('name', e.target.value)}
                                    placeholder="VD: Gói Xét Nghiệm Chức Năng Gan Thận Toàn Diện"
                                    required
                                />
                            </Form.Group>
                        </Col>
                        <Col md={12}>
                            <Form.Group>
                                <Form.Label className="small fw-semibold">Mô Tả & Chỉ Định Lâm Sàng</Form.Label>
                                <Form.Control
                                    as="textarea"
                                    rows={2}
                                    value={form.description}
                                    onChange={(e) => setField('description', e.target.value)}
                                    placeholder="Mô tả mục đích, đối tượng chỉ định của gói dịch vụ..."
                                />
                            </Form.Group>
                        </Col>
                        <Col md={6}>
                            <Form.Group>
                                <Form.Label className="small fw-semibold">Đơn Giá Niêm Yết (VND) <span className="text-danger">*</span></Form.Label>
                                <InputGroup>
                                    <Form.Control
                                        type="number"
                                        min="0"
                                        step="1000"
                                        value={form.price}
                                        onChange={(e) => setField('price', e.target.value)}
                                        placeholder="VD: 500000"
                                        required
                                    />
                                    <InputGroup.Text>đ</InputGroup.Text>
                                </InputGroup>
                            </Form.Group>
                        </Col>
                        <Col md={6}>
                            <Form.Group>
                                <Form.Label className="small fw-semibold">Giá Ưu Đãi / Khuyến Mãi (VND)</Form.Label>
                                <InputGroup>
                                    <Form.Control
                                        type="number"
                                        min="0"
                                        step="1000"
                                        value={form.discountPrice}
                                        onChange={(e) => setField('discountPrice', e.target.value)}
                                        placeholder="Để trống nếu không có ưu đãi"
                                    />
                                    <InputGroup.Text>đ</InputGroup.Text>
                                </InputGroup>
                            </Form.Group>
                        </Col>
                    </Row>

                    {/* Test Criteria Selection */}
                    <div className="border rounded-3 p-3 bg-light">
                        <div className="d-flex justify-content-between align-items-center mb-2">
                            <Form.Label className="small fw-bold text-dark mb-0">
                                Cấu Hình Xét Nghiệm Thành Phần Trong Gói <span className="text-danger">*</span>
                            </Form.Label>
                            <Badge bg="primary">Đã chọn: {form.testIds.length} xét nghiệm</Badge>
                        </div>
                        <InputGroup size="sm" className="mb-2">
                            <InputGroup.Text><i className="bi bi-search"></i></InputGroup.Text>
                            <Form.Control
                                placeholder="Tìm xét nghiệm theo mã, tên chỉ số, chuyên khoa..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </InputGroup>
                        <div style={{ maxHeight: '200px', overflowY: 'auto' }} className="border rounded bg-white p-2">
                            {Object.keys(grouped).length === 0 ? (
                                <div className="text-muted small text-center py-3">Không tìm thấy xét nghiệm phù hợp.</div>
                            ) : (
                                Object.entries(grouped).map(([category, items]) => (
                                    <div key={category} className="mb-2 pb-2 border-bottom">
                                        <div className="d-flex justify-content-between align-items-center mb-1">
                                            <span className="small fw-bold text-primary">{category}</span>
                                            <Button
                                                variant="link"
                                                size="sm"
                                                className="p-0 text-decoration-none small"
                                                onClick={() => toggleGroup(items)}
                                            >
                                                Chọn/Bỏ nhóm
                                            </Button>
                                        </div>
                                        <div className="d-flex flex-wrap gap-2">
                                            {items.map((c) => {
                                                const id = c._id || c.id || c.code;
                                                const checked = form.testIds.includes(id);
                                                return (
                                                    <Button
                                                        key={id}
                                                        type="button"
                                                        size="sm"
                                                        variant={checked ? 'primary' : 'outline-secondary'}
                                                        className="rounded-pill py-0 px-2 small d-flex align-items-center gap-1"
                                                        style={{ fontSize: '0.78rem' }}
                                                        onClick={() => toggleTest(id)}
                                                    >
                                                        {checked && <i className="bi bi-check-circle-fill"></i>}
                                                        <span>{c.code} - {c.name}</span>
                                                    </Button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </Form>
            </Modal.Body>

            <Modal.Footer className="bg-light py-2 px-3 d-flex justify-content-between">
                <Button variant="outline-secondary" onClick={onClose} disabled={saving}>
                    Hủy bỏ
                </Button>
                <Button
                    variant="primary"
                    type="submit"
                    form="package-form"
                    disabled={saving}
                    className="d-flex align-items-center gap-2"
                >
                    {saving ? <Spinner size="sm" animation="border" /> : <i className="bi bi-check-lg"></i>}
                    {saving ? 'Đang lưu...' : (isEdit ? 'Lưu Thay Đổi' : 'Tạo Gói Mới')}
                </Button>
            </Modal.Footer>
        </Modal>
    );
}
