/**
 * @file PackageDetailModal.jsx
 * @description View detail popup modal for laboratory service packages (UC15).
 * Renders complete DIAG-Standard Medical Package Details:
 * - Header banner with code, specialty category, pricing and discount savings
 * - Key Clinical Value Propositions (Shield Highlight Cards)
 * - Target Patient Group & Clinical Indications (Đối tượng cần làm xét nghiệm)
 * - Clinical Pathology Overview (Tổng quan chuyên môn)
 * - Detailed Biomarkers Table with Sample Types, Retail Prices & Diagnostic Role
 * - Turnaround Time (TAT) Commitments & Sample Cut-off Times
 * - ISO 15189 Pre-analytical Patient Preparation & Fasting Guidelines
 * Conforms to: Production Engineering Standards & AGENTS-DESIGN.md.
 * @module features/admin/components/PackageDetailModal
 */

import React from "react";
import { Modal, Button, Row, Col, Badge, Table, Alert } from "react-bootstrap";
import { ShieldCheck, IdCard, Clock, TestTube2, CheckCircle2, User, FileText, AlertTriangle, SquarePen, Droplet, CalendarCheck, Info } from 'lucide-react';

function formatMoney(value) {
  if (value === null || value === undefined || value === "") return "—";
  return Number(value).toLocaleString("vi-VN") + " đ";
}

export default function PackageDetailModal({ pkg, onClose, onEdit }) {
  if (!pkg) return null;

  const tests = Array.isArray(pkg.tests) ? pkg.tests : [];
  const highlights = Array.isArray(pkg.highlights) ? pkg.highlights : [];

  // Parse lines for target audience
  const audienceLines = (pkg.targetAudience || "")
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);

  // Calculate savings
  const price = Number(pkg.price) || 0;
  const discountPrice = pkg.discountPrice ? Number(pkg.discountPrice) : null;
  const savings = discountPrice && price > discountPrice ? price - discountPrice : 0;
  const savingsPercent = savings > 0 ? Math.round((savings / price) * 100) : 0;

  return (
    <Modal show={Boolean(pkg)} onHide={onClose} size="xl" centered backdrop="static">
      <Modal.Header closeButton style={{ background: "#F8FAFC", borderBottom: "1px solid #E2E8F0" }}>
        <div className="d-flex align-items-center gap-2">
          <Badge bg="primary" className="px-2 py-1 font-monospace">
            {pkg.code}
          </Badge>
          <Modal.Title className="fs-5 fw-bold text-dark mb-0">
            {pkg.name}
          </Modal.Title>
        </div>
      </Modal.Header>

      <Modal.Body className="p-4" style={{ maxHeight: "80vh", overflowY: "auto", background: "#FAFBFD" }}>
        {/* 1. MASTER HEADER CARD */}
        <div className="p-4 rounded-4 mb-4 bg-white shadow-sm border">
          <Row className="g-3 align-items-center">
            <Col lg={8}>
              <div className="d-flex align-items-center gap-2 mb-2 flex-wrap">
                <span className="badge bg-primary-subtle text-primary border border-primary-subtle px-3 py-1 rounded-pill small fw-semibold">
                  Chuyên khoa: {pkg.category || "Xét nghiệm tổng quát"}
                </span>
                <span className="badge bg-success-subtle text-success border border-success-subtle px-3 py-1 rounded-pill small fw-semibold">
                  {pkg.isActive ? "● Đang Hoạt Động (Công khai)" : "○ Tạm Khóa / Ẩn"}
                </span>
                {pkg.sampleTube && (
                  <span className="badge bg-light text-dark border px-3 py-1 rounded-pill small">
                    <TestTube2 className="me-1 text-danger"  size="1em"/> Ống: {pkg.sampleTube}
                  </span>
                )}
                {pkg.sampleVolumeMl && (
                  <span className="badge bg-light text-dark border px-3 py-1 rounded-pill small">
                    <Droplet className="me-1 text-primary"  size="1em"/> {pkg.sampleVolumeMl} ml máu
                  </span>
                )}
              </div>
              <h4 className="fw-bold text-dark mb-2">{pkg.name}</h4>
              <p className="text-muted small mb-0" style={{ maxWidth: 780 }}>
                {pkg.description || "Gói xét nghiệm tầm soát tại BMS Clinical Laboratory."}
              </p>
            </Col>

            {/* Price Box */}
            <Col lg={4}>
              <div
                className="p-3 rounded-4 text-center text-lg-end"
                style={{ background: "linear-gradient(135deg, #F0FDF4 0%, #DCFCE7 100%)", border: "1px solid #86EFAC" }}
              >
                <div className="text-muted small fw-semibold mb-1">CHI PHÍ XÉT NGHIỆM TRỌN GÓI</div>
                {discountPrice ? (
                  <div>
                    <div className="text-muted text-decoration-line-through small">
                      Giá gốc: {formatMoney(price)}
                    </div>
                    <div className="fs-3 fw-bold text-success" style={{ fontVariantNumeric: "tabular-nums" }}>
                      {formatMoney(discountPrice)}
                    </div>
                    <Badge bg="danger" className="rounded-pill px-2 py-1 small">
                      Tiết kiệm {formatMoney(savings)} ({savingsPercent}%)
                    </Badge>
                  </div>
                ) : (
                  <div className="fs-3 fw-bold text-primary" style={{ fontVariantNumeric: "tabular-nums" }}>
                    {formatMoney(price)}
                  </div>
                )}
                <div className="small text-muted mt-2">
                  Bao gồm <strong>{tests.length}</strong> chỉ số xét nghiệm &amp; miễn phí tư vấn Bác sĩ
                </div>
              </div>
            </Col>
          </Row>
        </div>

        {/* 2. SHIELD HIGHLIGHTS (KEY VALUE PROPOSITIONS) */}
        {highlights.length > 0 && (
          <div className="mb-4">
            <h6 className="fw-bold text-dark mb-3 d-flex align-items-center gap-2">
              <ShieldCheck className="text-primary"  size="1em"/> Điểm Nổi Bật Của Gói Dịch Vụ
            </h6>
            <Row className="g-3">
              {highlights.map((hl, idx) => (
                <Col md={6} key={idx}>
                  <div
                    className="p-3 rounded-3 bg-white border d-flex align-items-start gap-3 h-100 shadow-sm"
                    style={{ borderLeft: "4px solid #1E60E6" }}
                  >
                    <div
                      className="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0"
                      style={{ width: 36, height: 36, background: "rgba(30, 96, 230, 0.1)", color: "#1E60E6" }}
                    >
                      <ShieldCheck size={16} />
                    </div>
                    <div className="small fw-semibold text-dark pt-1">
                      {hl}
                    </div>
                  </div>
                </Col>
              ))}
            </Row>
          </div>
        )}

        {/* 3. TARGET AUDIENCE */}
        {audienceLines.length > 0 && (
          <div className="mb-4 p-4 rounded-4 bg-white border shadow-sm">
            <h6 className="fw-bold text-dark mb-3 d-flex align-items-center gap-2">
              <User className="text-primary"  size="1em"/> Đối Tượng Cần Làm Xét Nghiệm
            </h6>
            <div className="d-flex flex-column gap-2">
              {audienceLines.map((line, idx) => (
                <div key={idx} className="d-flex align-items-start gap-2 small text-dark">
                  <CheckCircle2 className="text-success mt-1 flex-shrink-0"  size="1em"/>
                  <span>{line.replace(/^[-•*]\s*/, "")}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 4. CLINICAL BIOMARKERS TABLE */}
        <div className="mb-4 p-4 rounded-4 bg-white border shadow-sm">
          <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
            <div>
              <h6 className="fw-bold text-dark mb-1 d-flex align-items-center gap-2">
                <TestTube2 className="text-primary"  size="1em"/> Danh Mục Các Chỉ Số Xét Nghiệm Thành Phần ({tests.length} chỉ số)
              </h6>
              <p className="text-muted small mb-0">
                Thực hiện trên hệ thống máy xét nghiệm tại phòng Lab BMS.
              </p>
            </div>
          </div>

          {tests.length === 0 ? (
            <div className="text-muted small text-center py-4 border rounded bg-light">
              Chưa gán xét nghiệm nào cho gói này.
            </div>
          ) : (
            <div className="table-responsive rounded-3 border">
              <Table hover size="sm" className="mb-0 align-middle">
                <thead style={{ background: "#F8FAFC" }}>
                  <tr>
                    <th style={{ width: "45px" }} className="text-center py-2 text-muted small">#</th>
                    <th style={{ width: "260px" }} className="py-2 text-muted small">Chỉ Số Xét Nghiệm</th>
                    <th style={{ width: "160px" }} className="py-2 text-muted small">Loại Mẫu Bệnh Phẩm</th>
                    <th style={{ width: "130px" }} className="py-2 text-muted small text-end">Đơn Giá Lẻ</th>
                    <th className="py-2 text-muted small">Ý Nghĩa Y Khoa &amp; Định Hướng Chẩn Đoán</th>
                  </tr>
                </thead>
                <tbody>
                  {tests.map((t, idx) => (
                    <tr key={idx}>
                      <td className="text-center text-muted small">{idx + 1}</td>
                      <td>
                        <div className="fw-bold text-dark small">{t.Name || t.name}</div>
                        <code className="text-primary small">{t.Code || t.code}</code>
                      </td>
                      <td>
                        <Badge bg="light" text="dark" className="border px-2 py-1 small">
                          {t.SampleType || t.sampleType || "[Máu]"}
                        </Badge>
                      </td>
                      <td className="text-end fw-semibold text-secondary small" style={{ fontVariantNumeric: "tabular-nums" }}>
                        {t.Price || t.price ? formatMoney(t.Price || t.price) : "Theo gói"}
                      </td>
                      <td className="small text-muted" style={{ lineHeight: 1.5 }}>
                        {t.ClinicalMeaning || t.clinicalMeaning || "Khảo sát và đánh giá chỉ số sinh học nhằm định hướng kế hoạch can thiệp y khoa phù hợp."}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          )}
        </div>

        {/* 5. TURNAROUND TIME (TAT) */}
        {pkg.tat && (
          <div className="mb-4 p-4 rounded-4 bg-white border shadow-sm">
            <h6 className="fw-bold text-dark mb-2 d-flex align-items-center gap-2">
              <Clock className="text-primary"  size="1em"/> Thời Gian Có Kết Quả (TAT Cam Kết)
            </h6>
            <div
              className="p-3 rounded-3 border"
              style={{ background: "#EFF6FF", borderColor: "#BFDBFE" }}
            >
              <div className="d-flex align-items-start gap-2 text-primary fw-semibold small">
                <Clock className="mt-1 flex-shrink-0"  size="1em"/>
                <span>{pkg.tat}</span>
              </div>
            </div>
          </div>
        )}

        {/* 6. PRE-ANALYTICAL PREPARATION NOTES (ISO 15189) */}
        {pkg.preparationNotes && (
          <div className="mb-2 p-4 rounded-4 bg-white border shadow-sm">
            <h6 className="fw-bold text-dark mb-3 d-flex align-items-center gap-2">
              <FileText className="text-warning" size="1em"/> Lưu Ý Trước Khi Lấy Mẫu
            </h6>
            <Alert variant="warning" className="rounded-3 py-3 px-4 mb-0 border-warning-subtle">
              <div className="d-flex align-items-start gap-2 mb-2">
                <AlertTriangle className="text-warning fs-5 flex-shrink-0"  size="1em"/>
                <strong className="text-dark">Hướng dẫn chuẩn bị bệnh nhân tiền phân tích:</strong>
              </div>
              <div className="small text-dark" style={{ whiteSpace: "pre-line", lineHeight: 1.6 }}>
                {pkg.preparationNotes}
              </div>
            </Alert>
          </div>
        )}
      </Modal.Body>

      <Modal.Footer style={{ background: "#F8FAFC", borderTop: "1px solid #E2E8F0" }} className="d-flex justify-content-between">
        <Button variant="outline-secondary" onClick={onClose} className="px-3">
          Đóng
        </Button>
        {onEdit && (
          <Button
            variant="primary"
            className="px-4 fw-semibold d-flex align-items-center gap-2 shadow-sm"
            onClick={() => {
              onClose();
              onEdit(pkg);
            }}
          >
            <SquarePen  size="1em"/> Chỉnh Sửa Gói Này
          </Button>
        )}
      </Modal.Footer>
    </Modal>
  );
}
