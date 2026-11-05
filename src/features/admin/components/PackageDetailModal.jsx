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
            <Modal.Header closeButton style={{ borderBottom: '1px solid rgba(15, 23, 42, 0.05)', background: '#F8FAFC' }}>
                <Modal.Title className="fs-6 fw-bold d-flex align-items-center gap-2" style={{ color: '#0f2743' }}>
                    <i className="bi bi-box-seam-fill" style={{ color: '#648CF4' }}></i>
                    Chi Tiết Gói Dịch Vụ Xét Nghiệm: {pkg.name}
                </Modal.Title>
            </Modal.Header>

            <Modal.Body className="p-4" style={{ maxHeight: "72vh", overflowY: "auto" }}>
                {/* General Info Card */}
                <div className="p-3 mb-3" style={{ background: '#EEF2F6', border: '1px solid rgba(15, 23, 42, 0.05)', borderRadius: 16 }}>
                    <Row className="g-3">
                        <Col md={4}>
                            <div className="text-muted small fw-medium">Mã Gói Dịch Vụ</div>
                            <div className="fw-bold font-monospace fs-6" style={{ color: '#648CF4' }}>
                                {pkg.code || "—"}
                            </div>
                        </Col>
                        <Col md={5}>
                            <div className="text-muted small fw-medium">Tên Gói Xét Nghiệm</div>
                            <div className="fw-bold fs-6" style={{ color: '#0f2743' }}>
                                {pkg.name || "—"}
                            </div>
                        </Col>
                        <Col md={3}>
                            <div className="text-muted small fw-medium">Trạng Thái</div>
                            <div>
                                <span style={{ display: 'inline-block', padding: '3px 12px', borderRadius: 9999, fontSize: 12, fontWeight: 600, background: pkg.isActive ? 'rgba(145, 222, 131, 0.2)' : 'rgba(15, 23, 42, 0.05)', color: pkg.isActive ? '#2E7D32' : '#64748b' }}>
                                    {pkg.isActive ? "Đang Hoạt Động" : "Tạm Khóa"}
                                </span>
                            </div>
                        </Col>

                        <Col md={4}>
                            <div className="text-muted small fw-medium">Đơn Giá Niêm Yết</div>
                            <div className="fw-bold fs-5" style={{ color: '#648CF4', fontVariantNumeric: 'tabular-nums' }}>
                                {formatMoney(pkg.price)}
                            </div>
                        </Col>
                        <Col md={4}>
                            <div className="text-muted small fw-medium">Đơn Giá Ưu Đãi</div>
                            <div className="fw-bold fs-5" style={{ color: '#2E7D32', fontVariantNumeric: 'tabular-nums' }}>
                                {pkg.discountPrice ? formatMoney(pkg.discountPrice) : "Không áp dụng"}
                            </div>
                        </Col>
                        <Col md={4}>
                            <div className="text-muted small fw-medium">Số Lượng Chỉ Số</div>
                            <div className="fw-bold text-dark" style={{ fontVariantNumeric: 'tabular-nums' }}>
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
                    <i className="bi bi-list-check" style={{ color: '#648CF4' }}></i>
                    Danh Sách Xét Nghiệm Thành Phần Trong Gói ({tests.length})
                </h6>

                {tests.length === 0 ? (
                    <div className="text-muted small text-center py-3 border rounded bg-light">
                        Chưa gán xét nghiệm nào cho gói này.
                    </div>
                ) : (
                    <div className="table-responsive" style={{ border: '1px solid rgba(15, 23, 42, 0.05)', borderRadius: 14, overflow: 'hidden' }}>
                        <Table hover size="sm" className="mb-0 align-middle">
                            <thead style={{ background: '#EEF2F6' }}>
                                <tr>
                                    <th style={{ width: "80px", color: '#475569', fontSize: 12, padding: '10px 14px' }}>STT</th>
                                    <th style={{ width: "160px", color: '#475569', fontSize: 12, padding: '10px 14px' }}>Mã Xét Nghiệm</th>
                                    <th style={{ color: '#475569', fontSize: 12, padding: '10px 14px' }}>Tên Xét Nghiệm / Chỉ Số</th>
                                </tr>
                            </thead>
                            <tbody>
                                {tests.map((t, idx) => {
                                    const code = typeof t === "string" ? t : (t.code || t._id || t.id);
                                    const name = typeof t === "string" ? t : (t.name || t.code);
                                    return (
                                        <tr key={idx} style={{ borderBottom: '1px solid #EEF2F6' }}>
                                            <td className="text-muted small" style={{ padding: '10px 14px', fontVariantNumeric: 'tabular-nums' }}>{idx + 1}</td>
                                            <td style={{ padding: '10px 14px' }}>
                                                <code className="fw-bold" style={{ color: '#648CF4' }}>{code}</code>
                                            </td>
                                            <td className="fw-semibold text-dark" style={{ padding: '10px 14px' }}>{name}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </Table>
                    </div>
                )}
            </Modal.Body>

            <Modal.Footer className="py-2 px-3 d-flex justify-content-between" style={{ borderTop: '1px solid rgba(15, 23, 42, 0.05)', background: '#F8FAFC' }}>
                <Button variant="outline-secondary" onClick={onClose} style={{ borderRadius: 9999 }}>
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
                        style={{ borderRadius: 9999, background: '#648CF4', borderColor: '#648CF4' }}
                    >
                        <i className="bi bi-pencil"></i>
                        Chỉnh Sửa Gói Này
                    </Button>
                )}
            </Modal.Footer>
        </Modal>
    );
}
