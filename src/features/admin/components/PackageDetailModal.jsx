/**
 * @file PackageDetailModal.jsx
 * @description View detail popup modal for laboratory service packages (UC15).
 * Conforms to: Production Engineering Standards & AGENTS-DESIGN.md.
 * @module features/admin/components/PackageDetailModal
 */

import React from "react";
import { Modal, Button, Row, Col, Badge, Table } from "react-bootstrap";

function formatMoney(value) {
    if (value === null || value === undefined || value === "") return "—";
    return Number(value).toLocaleString("vi-VN") + " đ";
}

export default function PackageDetailModal({ pkg, onClose, onEdit }) {
    if (!pkg) return null;

    const tests = pkg.tests || [];

    return (
        <Modal show={Boolean(pkg)} onHide={onClose} size="lg" centered>
            <Modal.Header closeButton className="bg-primary text-white py-3">
                <Modal.Title className="fs-6 fw-bold text-white d-flex align-items-center gap-2">
                    <i className="bi bi-box-seam-fill"></i>
                    Chi Tiết Gói Dịch Vụ Xét Nghiệm: {pkg.name}
                </Modal.Title>
            </Modal.Header>

            <Modal.Body className="p-4" style={{ maxHeight: "72vh", overflowY: "auto" }}>
                {/* General Info Card */}
                <div className="p-3 rounded-3 bg-light border mb-3">
                    <Row className="g-3">
                        <Col md={4}>
                            <div className="text-muted small fw-medium">Mã Gói Dịch Vụ</div>
                            <div className="fw-bold font-monospace text-primary fs-6">
                                {pkg.code || "—"}
                            </div>
                        </Col>
                        <Col md={5}>
                            <div className="text-muted small fw-medium">Tên Gói Xét Nghiệm</div>
                            <div className="fw-bold text-dark fs-6">
                                {pkg.name || "—"}
                            </div>
                        </Col>
                        <Col md={3}>
                            <div className="text-muted small fw-medium">Trạng Thái</div>
                            <div>
                                <Badge bg={pkg.isActive ? "success" : "secondary"} className="px-2 py-1">
                                    {pkg.isActive ? "Đang Hoạt Động" : "Tạm Khóa"}
                                </Badge>
                            </div>
                        </Col>

                        <Col md={4}>
                            <div className="text-muted small fw-medium">Đơn Giá Niêm Yết</div>
                            <div className="fw-bold text-primary fs-5">
                                {formatMoney(pkg.price)}
                            </div>
                        </Col>
                        <Col md={4}>
                            <div className="text-muted small fw-medium">Đơn Giá Ưu Đãi</div>
                            <div className="fw-bold text-success fs-5">
                                {pkg.discountPrice ? formatMoney(pkg.discountPrice) : "Không áp dụng"}
                            </div>
                        </Col>
                        <Col md={4}>
                            <div className="text-muted small fw-medium">Số Lượng Chỉ Số</div>
                            <div className="fw-bold text-dark">
                                {tests.length} xét nghiệm thành phần
                            </div>
                        </Col>

                        <Col md={12}>
                            <div className="text-muted small fw-medium">Mô Tả & Hướng Dẫn Chỉ Định</div>
                            <div className="text-dark small">
                                {pkg.description || "Chưa có mô tả chi tiết cho gói xét nghiệm này."}
                            </div>
                        </Col>
                    </Row>
                </div>

                {/* Tests List */}
                <h6 className="fw-bold text-dark mb-2 d-flex align-items-center gap-2">
                    <i className="bi bi-list-check text-primary"></i>
                    Danh Sách Xét Nghiệm Thành Phần Trong Gói ({tests.length})
                </h6>

                {tests.length === 0 ? (
                    <div className="text-muted small text-center py-3 border rounded bg-light">
                        Chưa gán xét nghiệm nào cho gói này.
                    </div>
                ) : (
                    <div className="table-responsive border rounded">
                        <Table hover size="sm" className="mb-0 align-middle">
                            <thead className="table-light small">
                                <tr>
                                    <th style={{ width: "80px" }}>STT</th>
                                    <th style={{ width: "160px" }}>Mã Xét Nghiệm</th>
                                    <th>Tên Xét Nghiệm / Chỉ Số</th>
                                </tr>
                            </thead>
                            <tbody>
                                {tests.map((t, idx) => {
                                    const code = typeof t === "string" ? t : (t.code || t._id || t.id);
                                    const name = typeof t === "string" ? t : (t.name || t.code);
                                    return (
                                        <tr key={idx}>
                                            <td className="text-muted small">{idx + 1}</td>
                                            <td>
                                                <code className="text-primary fw-bold">{code}</code>
                                            </td>
                                            <td className="fw-semibold text-dark">{name}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </Table>
                    </div>
                )}
            </Modal.Body>

            <Modal.Footer className="bg-light py-2 px-3 d-flex justify-content-between">
                <Button variant="outline-secondary" onClick={onClose}>
                    Đóng
                </Button>
                {onEdit && (
                    <Button
                        variant="primary"
                        onClick={() => {
                            onClose();
                            onEdit(pkg);
                        }}
                        className="d-flex align-items-center gap-1"
                    >
                        <i className="bi bi-pencil"></i>
                        Chỉnh Sửa Gói Này
                    </Button>
                )}
            </Modal.Footer>
        </Modal>
    );
}
