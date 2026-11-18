/**
 * @file PackageFormModal.jsx
 * @description Administration modal form for composing, creating, and updating laboratory service packages (UC15).
 * Enhanced to support DIAG-Standard Medical Package Content:
 * - Highlights & Quality Value Propositions (Shield Icons)
 * - Target Clinical Audience (Đối tượng cần làm xét nghiệm)
 * - Clinical Overview & Pathology Description (Tổng quan gói xét nghiệm)
 * - Test Biomarkers with Sample Types, Reference Retail Prices & Clinical Diagnostic Meaning
 * - Turnaround Time (TAT) Commitments & Cut-off Times
 * - ISO 15189 Pre-analytical Patient Preparation & Fasting Guidelines
 * Conforms to: Production Engineering Standards & AGENTS-DESIGN.md.
 * @module features/admin/components/PackageFormModal
 */

import React, { useEffect, useMemo, useState } from "react";
import { Modal, Button, Form, Row, Col, Alert, Badge, Spinner, InputGroup, Nav, Table } from "react-bootstrap";
import {
  FaShieldAlt, FaIdCard, FaClock, FaVial, FaListUl, FaPlus, FaTrash,
  FaCheckCircle, FaUserInjured, FaNotesMedical, FaInfoCircle, FaFileMedicalAlt
} from "react-icons/fa";
import { createPackage, updatePackage } from "../api/packageApi.jsx";

export const STATUS_OPTIONS = [
  { value: "ACTIVE", label: "Đang Hoạt Động (Công khai Catalog)" },
  { value: "DRAFT", label: "Tạm Khóa / Bản Nháp" },
];

export const CATEGORY_OPTIONS = [
  "Huyết học",
  "Sinh hóa",
  "Miễn dịch",
  "Đông máu",
  "Tổng quát",
  "Nội tiết - Tuyến giáp",
  "Vi sinh - Ký sinh trùng",
  "Khác"
];

/**
 * Normalizes test identifiers from package entities supporting both string IDs and test objects.
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

const EMPTY_FORM = {
  code: "",
  name: "",
  category: "Huyết học",
  price: "",
  discountPrice: "",
  status: "ACTIVE",
  sampleTube: "EDTA-Tím & Serum-Đỏ/Vàng",
  sampleVolumeMl: 4.0,
  tat: "Sau 2 tiếng 20 phút cùng ngày (nhận mẫu trước 21:30); 8:50 ngày hôm sau.",
  highlights: [
    "Tìm nguyên nhân mệt mỏi, xanh xao, chóng mặt kéo dài",
    "Phân biệt đúng loại bệnh trong 1 lần xét nghiệm",
    "Hỗ trợ điều trị đúng, tránh tự ý bổ sung có thể gây hại",
    "Miễn phí lấy mẫu tận nơi & tư vấn 1-1 với Bác sĩ chuyên khoa"
  ],
  targetAudience: "Người có dấu hiệu mệt mỏi kéo dài, hoa mắt, chóng mặt;\nNgười có chế độ ăn thiếu dinh dưỡng hoặc kém hấp thu;\nPhụ nữ trong độ tuổi sinh sản hoặc chuẩn bị mang thai;\nNgười có tiền sử gia đình mắc bệnh lý chuyển hóa hoặc huyết học.",
  description: "Gói xét nghiệm được thiết kế chuyên sâu theo chuẩn ISO 15189:2022 giúp đánh giá toàn diện các chỉ số sinh hóa và huyết học trọng yếu, phát hiện sớm nguy cơ tiềm ẩn và hỗ trợ bác sĩ xây dựng phác đồ điều trị cá thể hóa chính xác.",
  preparationNotes: "Nên lấy mẫu vào buổi sáng sau khi nhịn ăn 8 - 12 tiếng; chỉ được uống nước lọc.\nUống khoảng 250ml nước lọc trước khi lấy mẫu, tránh cô đặc máu.\nTạm ngưng uống viên sắt, vitamin ít nhất 24 giờ trước khi lấy máu (các thuốc điều trị mạn tính vẫn uống bình thường).\nThông báo với nhân viên y tế nếu đang trong kỳ kinh nguyệt hoặc đã truyền máu trong 3 tháng gần đây.",
  testIds: [],
  customTests: [] // Array of { code, name, sampleType, price, clinicalMeaning }
};

export default function PackageFormModal({
  open,
  pkg,
  criteria = [],
  onClose,
  onSaved,
}) {
  const isEdit = Boolean(pkg);

  const [activeTab, setActiveTab] = useState("general");
  const [form, setForm] = useState(EMPTY_FORM);
  const [searchCriteria, setSearchCriteria] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [newHighlight, setNewHighlight] = useState("");

  useEffect(() => {
    if (!open) return;

    setError("");
    setSearchCriteria("");
    setActiveTab("general");

    if (pkg) {
      const existingTests = Array.isArray(pkg.tests) ? pkg.tests : [];
      const resolvedTestIds = getTestIds(pkg, criteria);

      const resolvedCustomTests = existingTests.map((t) => {
        const foundCrit = criteria.find((c) => c.code === t.Code || c.code === t.code);
        return {
          code: t.Code || t.code || "",
          name: t.Name || t.name || "",
          sampleType: t.SampleType || t.sampleType || foundCrit?.sample_type || "[Máu]",
          price: t.Price ?? t.price ?? foundCrit?.price ?? 50000,
          clinicalMeaning: t.ClinicalMeaning || t.clinicalMeaning || "Xét nghiệm đánh giá chỉ số sinh học và định hướng chẩn đoán y khoa."
        };
      });

      setForm({
        code: pkg.code ?? pkg.Code ?? "",
        name: pkg.name ?? pkg.Name ?? "",
        category: pkg.category ?? pkg.Category ?? "Huyết học",
        price: pkg.price ?? pkg.Price ?? "",
        discountPrice: pkg.discountPrice ?? pkg.DiscountPrice ?? "",
        status: (pkg.isActive ?? pkg.IsActive) === false ? "DRAFT" : "ACTIVE",
        sampleTube: pkg.sampleTube ?? pkg.SampleTube ?? "EDTA-Tím & Serum-Đỏ/Vàng",
        sampleVolumeMl: pkg.sampleVolumeMl ?? pkg.SampleVolumeMl ?? 4.0,
        tat: pkg.tat ?? pkg.Tat ?? "Sau 2 tiếng 20 phút cùng ngày (nhận mẫu trước 21:30); 8:50 ngày hôm sau.",
        highlights: Array.isArray(pkg.highlights ?? pkg.Highlights) && (pkg.highlights ?? pkg.Highlights).length > 0
          ? (pkg.highlights ?? pkg.Highlights)
          : EMPTY_FORM.highlights,
        targetAudience: pkg.targetAudience ?? pkg.TargetAudience ?? EMPTY_FORM.targetAudience,
        description: pkg.description ?? pkg.Description ?? EMPTY_FORM.description,
        preparationNotes: pkg.preparationNotes ?? pkg.PreparationNotes ?? EMPTY_FORM.preparationNotes,
        testIds: resolvedTestIds,
        customTests: resolvedCustomTests
      });
    } else {
      setForm({ ...EMPTY_FORM, testIds: [] });
    }
  }, [open, pkg, criteria]);

  // Group criteria by category for the selector
  const groupedCriteria = useMemo(() => {
    const q = searchCriteria.trim().toLowerCase();
    const filtered = criteria.filter((c) =>
      [c.name, c.code, c.category].some((val) =>
        String(val || "").toLowerCase().includes(q)
      )
    );

    return filtered.reduce((acc, c) => {
      const cat = c.category || "Chung";
      (acc[cat] ||= []).push(c);
      return acc;
    }, {});
  }, [criteria, searchCriteria]);

  const setField = (field, val) => {
    setForm((prev) => ({ ...prev, [field]: val }));
  };

  // Toggle biomarker checkbox
  const toggleTest = (c) => {
    const critId = c._id || c.id || c.code;
    const isSelected = form.testIds.includes(critId) || form.testIds.includes(c.code);

    if (isSelected) {
      setForm((prev) => ({
        ...prev,
        testIds: prev.testIds.filter((x) => x !== critId && x !== c.code),
        customTests: prev.customTests.filter((t) => t.code !== c.code)
      }));
    } else {
      setForm((prev) => ({
        ...prev,
        testIds: [...prev.testIds, critId],
        customTests: [
          ...prev.customTests,
          {
            code: c.code,
            name: c.name,
            sampleType: c.sample_type || "[Máu]",
            price: c.price || 50000,
            clinicalMeaning: `Xét nghiệm đánh giá chỉ số ${c.name} nhằm phát hiện bất thường và định hướng can thiệp y khoa.`
          }
        ]
      }));
    }
  };

  // Update a test's clinical meaning or sample type
  const updateCustomTest = (idx, field, val) => {
    setForm((prev) => {
      const updated = [...prev.customTests];
      updated[idx] = { ...updated[idx], [field]: val };
      return { ...prev, customTests: updated };
    });
  };

  // Add / Remove Highlights
  const handleAddHighlight = () => {
    if (!newHighlight.trim()) return;
    setForm((prev) => ({
      ...prev,
      highlights: [...prev.highlights, newHighlight.trim()]
    }));
    setNewHighlight("");
  };

  const handleRemoveHighlight = (idx) => {
    setForm((prev) => ({
      ...prev,
      highlights: prev.highlights.filter((_, i) => i !== idx)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!form.code.trim() || !form.name.trim()) {
      setError("Vui lòng nhập mã gói và tên gói xét nghiệm.");
      setActiveTab("general");
      return;
    }

    if (form.price === "" || Number(form.price) < 0) {
      setError("Đơn giá niêm yết không hợp lệ.");
      setActiveTab("general");
      return;
    }

    if (form.discountPrice !== "" && Number(form.discountPrice) > Number(form.price)) {
      setError("Giá ưu đãi không được lớn hơn giá niêm yết.");
      setActiveTab("general");
      return;
    }

    if (form.customTests.length === 0 && form.testIds.length === 0) {
      setError("Vui lòng chọn ít nhất 1 xét nghiệm thành phần cho gói.");
      setActiveTab("biomarkers");
      return;
    }

    // Assemble final tests payload
    const finalTests = form.customTests.map((t) => ({
      code: t.code.trim().toUpperCase(),
      name: t.name.trim(),
      sampleType: t.sampleType || "[Máu]",
      price: Number(t.price) || 0,
      clinicalMeaning: t.clinicalMeaning || ""
    }));

    const payload = {
      code: form.code.trim().toUpperCase(),
      name: form.name.trim(),
      category: form.category,
      price: Number(form.price),
      discountPrice: form.discountPrice === "" ? null : Number(form.discountPrice),
      isActive: form.status === "ACTIVE",
      description: form.description.trim(),
      targetAudience: form.targetAudience.trim(),
      tat: form.tat.trim(),
      preparationNotes: form.preparationNotes.trim(),
      sampleTube: form.sampleTube.trim(),
      sampleVolumeMl: Number(form.sampleVolumeMl) || 3.0,
      highlights: form.highlights.filter((h) => h.trim().length > 0),
      tests: finalTests
    };

    try {
      setSaving(true);
      if (isEdit) {
        const id = pkg._id || pkg.id || pkg.code;
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
        "Lưu gói xét nghiệm thất bại. Vui lòng kiểm tra lại dữ liệu."
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal show={open} onHide={saving ? undefined : onClose} size="xl" centered backdrop="static">
      <Modal.Header closeButton={!saving} style={{ background: "#F8FAFC", borderBottom: "1px solid #E2E8F0" }}>
        <Modal.Title className="fs-5 fw-bold d-flex align-items-center gap-2 text-dark">
          <FaFileMedicalAlt className="text-primary" />
          <span>{isEdit ? `Chỉnh Sửa Gói Xét Nghiệm: ${pkg?.name || pkg?.code}` : "Thiết Lập Gói Dịch Vụ Xét Nghiệm Mới (Chuẩn DIAG / ISO 15189)"}</span>
        </Modal.Title>
      </Modal.Header>

      <Modal.Body className="p-0" style={{ maxHeight: "78vh", overflowY: "auto" }}>
        {error && (
          <div className="p-3">
            <Alert variant="danger" dismissible onClose={() => setError("")} className="py-2 small mb-0">
              <i className="bi bi-exclamation-triangle-fill me-2"></i>
              <strong>Lỗi:</strong> {error}
            </Alert>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="px-4 pt-3 bg-white border-bottom">
          <Nav variant="pills" activeKey={activeTab} onSelect={(k) => setActiveTab(k)} className="gap-2">
            <Nav.Item>
              <Nav.Link eventKey="general" className="py-2 px-3 fw-semibold small">
                <FaIdCard className="me-1" /> 1. Thông Tin &amp; Giá
              </Nav.Link>
            </Nav.Item>
            <Nav.Item>
              <Nav.Link eventKey="clinical" className="py-2 px-3 fw-semibold small">
                <FaShieldAlt className="me-1" /> 2. Điểm Nổi Bật &amp; Đối Tượng
              </Nav.Link>
            </Nav.Item>
            <Nav.Item>
              <Nav.Link eventKey="biomarkers" className="py-2 px-3 fw-semibold small">
                <FaVial className="me-1" /> 3. Chỉ Số &amp; Diễn Giải Y Khoa ({form.customTests.length})
              </Nav.Link>
            </Nav.Item>
            <Nav.Item>
              <Nav.Link eventKey="preanalytical" className="py-2 px-3 fw-semibold small">
                <FaClock className="me-1" /> 4. TAT &amp; Tiền Phân Tích (ISO 15189)
              </Nav.Link>
            </Nav.Item>
          </Nav>
        </div>

        <Form id="package-rich-form" onSubmit={handleSubmit} className="p-4">
          {/* TAB 1: THÔNG TIN CƠ BẢN & GIÁ */}
          {activeTab === "general" && (
            <div>
              <h6 className="fw-bold text-primary mb-3 d-flex align-items-center gap-2">
                <FaIdCard /> 1. Định Danh Gói Xét Nghiệm &amp; Chính Sách Giá
              </h6>
              <Row className="g-3 mb-3">
                <Col md={4}>
                  <Form.Group>
                    <Form.Label className="small fw-semibold text-muted mb-1">
                      Mã Gói Xét Nghiệm <span className="text-danger">*</span>
                    </Form.Label>
                    <Form.Control
                      required
                      placeholder="VD: PKG-ANEMIA-01"
                      value={form.code}
                      disabled={isEdit}
                      onChange={(e) => setField("code", e.target.value.toUpperCase())}
                      style={{ minHeight: 42, fontFamily: "monospace", fontWeight: "bold" }}
                    />
                    <Form.Text className="text-muted small">Mã duy nhất, viết hoa, không dấu.</Form.Text>
                  </Form.Group>
                </Col>

                <Col md={8}>
                  <Form.Group>
                    <Form.Label className="small fw-semibold text-muted mb-1">
                      Tên Gói Xét Nghiệm <span className="text-danger">*</span>
                    </Form.Label>
                    <Form.Control
                      required
                      placeholder="VD: Gói Xét Nghiệm Tầm Soát Thiếu Máu & Bệnh Lý Huyết Sắc Tố"
                      value={form.name}
                      onChange={(e) => setField("name", e.target.value)}
                      style={{ minHeight: 42, fontWeight: 600 }}
                    />
                  </Form.Group>
                </Col>

                <Col md={4}>
                  <Form.Group>
                    <Form.Label className="small fw-semibold text-muted mb-1">Chuyên Khoa / Phân Nhóm</Form.Label>
                    <Form.Select
                      value={form.category}
                      onChange={(e) => setField("category", e.target.value)}
                      style={{ minHeight: 42 }}
                    >
                      {CATEGORY_OPTIONS.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </Form.Select>
                  </Form.Group>
                </Col>

                <Col md={4}>
                  <Form.Group>
                    <Form.Label className="small fw-semibold text-muted mb-1">
                      Đơn Giá Niêm Yết (VNĐ) <span className="text-danger">*</span>
                    </Form.Label>
                    <InputGroup>
                      <Form.Control
                        type="number"
                        min={0}
                        step={1000}
                        required
                        placeholder="1200000"
                        value={form.price}
                        onChange={(e) => setField("price", e.target.value)}
                        style={{ minHeight: 42, fontWeight: "bold" }}
                      />
                      <InputGroup.Text>đ</InputGroup.Text>
                    </InputGroup>
                  </Form.Group>
                </Col>

                <Col md={4}>
                  <Form.Group>
                    <Form.Label className="small fw-semibold text-muted mb-1">Đơn Giá Ưu Đãi / Online (VNĐ)</Form.Label>
                    <InputGroup>
                      <Form.Control
                        type="number"
                        min={0}
                        step={1000}
                        placeholder="620000"
                        value={form.discountPrice}
                        onChange={(e) => setField("discountPrice", e.target.value)}
                        style={{ minHeight: 42, color: "#059669", fontWeight: "bold" }}
                      />
                      <InputGroup.Text>đ</InputGroup.Text>
                    </InputGroup>
                  </Form.Group>
                </Col>

                <Col md={4}>
                  <Form.Group>
                    <Form.Label className="small fw-semibold text-muted mb-1">Loại Ống Nghiệm Lấy Mẫu (ISO 15189)</Form.Label>
                    <Form.Control
                      placeholder="VD: EDTA-Tím & Serum-Đỏ/Vàng"
                      value={form.sampleTube}
                      onChange={(e) => setField("sampleTube", e.target.value)}
                      style={{ minHeight: 42 }}
                    />
                  </Form.Group>
                </Col>

                <Col md={4}>
                  <Form.Group>
                    <Form.Label className="small fw-semibold text-muted mb-1">Thể Tích Máu Yêu Cầu (ml)</Form.Label>
                    <InputGroup>
                      <Form.Control
                        type="number"
                        step={0.5}
                        min={0.5}
                        value={form.sampleVolumeMl}
                        onChange={(e) => setField("sampleVolumeMl", e.target.value)}
                        style={{ minHeight: 42 }}
                      />
                      <InputGroup.Text>ml</InputGroup.Text>
                    </InputGroup>
                  </Form.Group>
                </Col>

                <Col md={4}>
                  <Form.Group>
                    <Form.Label className="small fw-semibold text-muted mb-1">Trạng Thái Hiển Thị</Form.Label>
                    <Form.Select
                      value={form.status}
                      onChange={(e) => setField("status", e.target.value)}
                      style={{ minHeight: 42 }}
                    >
                      {STATUS_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </Form.Select>
                  </Form.Group>
                </Col>
              </Row>
            </div>
          )}

          {/* TAB 2: ĐIỂM NỔI BẬT & ĐỐI TƯỢNG CHỈ ĐỊNH */}
          {activeTab === "clinical" && (
            <div>
              {/* Shield Highlights */}
              <div className="mb-4">
                <h6 className="fw-bold text-primary mb-2 d-flex align-items-center gap-2">
                  <FaShieldAlt /> Điểm Nổi Bật &amp; Cam Kết Chất Lượng (Shield Icons)
                </h6>
                <p className="text-muted small mb-3">
                  Các điểm nhấn giá trị cốt lõi giúp bệnh nhân nắm bắt lợi ích chính của gói xét nghiệm (hiển thị biểu tượng khiên y tế).
                </p>

                <div className="d-flex flex-column gap-2 mb-3">
                  {form.highlights.map((hl, idx) => (
                    <div key={idx} className="d-flex align-items-center gap-2 p-2 rounded-3 bg-light border">
                      <FaShieldAlt className="text-primary flex-shrink-0" />
                      <Form.Control
                        size="sm"
                        value={hl}
                        onChange={(e) => {
                          const val = e.target.value;
                          setForm((prev) => {
                            const updated = [...prev.highlights];
                            updated[idx] = val;
                            return { ...prev, highlights: updated };
                          });
                        }}
                      />
                      <Button
                        variant="outline-danger"
                        size="sm"
                        className="rounded-circle px-2"
                        onClick={() => handleRemoveHighlight(idx)}
                      >
                        <FaTrash size={12} />
                      </Button>
                    </div>
                  ))}
                </div>

                <InputGroup size="sm" style={{ maxWidth: 600 }}>
                  <Form.Control
                    placeholder="Thêm điểm nổi bật mới (VD: Phân biệt đúng loại thiếu máu trong 1 lần xét nghiệm)..."
                    value={newHighlight}
                    onChange={(e) => setNewHighlight(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddHighlight();
                      }
                    }}
                  />
                  <Button variant="outline-primary" onClick={handleAddHighlight}>
                    <FaPlus className="me-1" /> Thêm điểm nhấn
                  </Button>
                </InputGroup>
              </div>

              {/* Target Audience */}
              <div className="mb-4">
                <h6 className="fw-bold text-dark mb-2 d-flex align-items-center gap-2">
                  <FaUserInjured className="text-primary" /> Đối Tượng Cần Làm Xét Nghiệm (Chỉ Định Lâm Sàng)
                </h6>
                <Form.Control
                  as="textarea"
                  rows={4}
                  placeholder="Mỗi đối tượng một dòng. VD:&#10;Người có dấu hiệu thiếu máu: mệt mỏi kéo dài, hoa mắt, chóng mặt...&#10;Người có chế độ ăn thiếu dinh dưỡng, đặc biệt là sắt...&#10;Phụ nữ trong độ tuổi sinh sản 25 - 30 tuổi..."
                  value={form.targetAudience}
                  onChange={(e) => setField("targetAudience", e.target.value)}
                  style={{ fontSize: "13.5px" }}
                />
              </div>

              {/* Overview & Pathology */}
              <div className="mb-3">
                <h6 className="fw-bold text-dark mb-2 d-flex align-items-center gap-2">
                  <FaNotesMedical className="text-primary" /> Tổng Quan Về Gói Xét Nghiệm (Diễn Giải Chuyên Môn)
                </h6>
                <Form.Control
                  as="textarea"
                  rows={5}
                  placeholder="Mô tả chi tiết về ý nghĩa y khoa, cơ chế bệnh học và giá trị chẩn đoán của gói xét nghiệm..."
                  value={form.description}
                  onChange={(e) => setField("description", e.target.value)}
                  style={{ fontSize: "13.5px" }}
                />
              </div>
            </div>
          )}

          {/* TAB 3: CHỈ SỐ XÉT NGHIỆM & DIỄN GIẢI Y KHOA */}
          {activeTab === "biomarkers" && (
            <div>
              <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
                <div>
                  <h6 className="fw-bold text-primary mb-1 d-flex align-items-center gap-2">
                    <FaVial /> Danh Mục Chỉ Số Xét Nghiệm Thành Phần ({form.customTests.length} chỉ số)
                  </h6>
                  <p className="text-muted small mb-0">
                    Chọn các xét nghiệm cấu thành gói và bổ sung diễn giải ý nghĩa lâm sàng chuyên môn theo chuẩn DIAG.
                  </p>
                </div>
              </div>

              {/* Biomarkers Table */}
              {form.customTests.length > 0 ? (
                <div className="table-responsive border rounded-3 mb-4 bg-white shadow-sm">
                  <Table hover size="sm" className="mb-0 align-middle">
                    <thead style={{ background: "#F1F5F9" }}>
                      <tr>
                        <th style={{ width: "40px" }} className="text-center">#</th>
                        <th style={{ width: "120px" }}>Mã</th>
                        <th style={{ width: "220px" }}>Tên Xét Nghiệm</th>
                        <th style={{ width: "150px" }}>Loại Mẫu</th>
                        <th style={{ width: "120px" }}>Đơn Giá</th>
                        <th>Ý Nghĩa Lâm Sàng &amp; Vai Trò Chẩn Đoán</th>
                        <th style={{ width: "50px" }} className="text-center">Xóa</th>
                      </tr>
                    </thead>
                    <tbody>
                      {form.customTests.map((t, idx) => (
                        <tr key={idx}>
                          <td className="text-center text-muted small">{idx + 1}</td>
                          <td>
                            <code className="text-primary fw-bold">{t.code}</code>
                          </td>
                          <td className="fw-semibold small">{t.name}</td>
                          <td>
                            <Form.Control
                              size="sm"
                              value={t.sampleType}
                              onChange={(e) => updateCustomTest(idx, "sampleType", e.target.value)}
                              placeholder="[Máu]"
                              style={{ fontSize: "12px" }}
                            />
                          </td>
                          <td>
                            <Form.Control
                              type="number"
                              size="sm"
                              value={t.price}
                              onChange={(e) => updateCustomTest(idx, "price", e.target.value)}
                              style={{ fontSize: "12px", fontVariantNumeric: "tabular-nums" }}
                            />
                          </td>
                          <td>
                            <Form.Control
                              as="textarea"
                              rows={2}
                              size="sm"
                              value={t.clinicalMeaning}
                              onChange={(e) => updateCustomTest(idx, "clinicalMeaning", e.target.value)}
                              placeholder="Diễn giải ý nghĩa y khoa của chỉ số này..."
                              style={{ fontSize: "12px" }}
                            />
                          </td>
                          <td className="text-center">
                            <Button
                              variant="outline-danger"
                              size="sm"
                              className="rounded-circle p-1"
                              onClick={() => {
                                setForm((prev) => ({
                                  ...prev,
                                  testIds: prev.testIds.filter((x) => x !== t.code),
                                  customTests: prev.customTests.filter((_, i) => i !== idx)
                                }));
                              }}
                            >
                              <FaTrash size={11} />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </div>
              ) : (
                <Alert variant="warning" className="small py-2 mb-3">
                  <FaInfoCircle className="me-1" /> Chưa có xét nghiệm nào được chọn. Hãy tick chọn các xét nghiệm bên dưới để thêm vào gói.
                </Alert>
              )}

              {/* Criteria Selector Accordion/Groups */}
              <div className="p-3 rounded-3 border bg-light">
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <span className="fw-bold small text-dark">
                    <FaPlus className="me-1 text-primary" /> Chọn Thêm Chỉ Số Từ Danh Mục Xét Nghiệm Phòng Lab:
                  </span>
                  <Form.Control
                    size="sm"
                    placeholder="Tìm theo tên chỉ số hoặc mã..."
                    value={searchCriteria}
                    onChange={(e) => setSearchCriteria(e.target.value)}
                    style={{ maxWidth: 260 }}
                  />
                </div>

                <div style={{ maxHeight: 250, overflowY: "auto" }}>
                  {Object.entries(groupedCriteria).map(([cat, items]) => (
                    <div key={cat} className="mb-3">
                      <div className="fw-bold small text-primary mb-1 border-bottom pb-1">
                        {cat} ({items.length})
                      </div>
                      <Row className="g-2">
                        {items.map((c) => {
                          const critId = c._id || c.id || c.code;
                          const checked = form.testIds.includes(critId) || form.testIds.includes(c.code);
                          return (
                            <Col md={4} sm={6} key={critId}>
                              <div
                                onClick={() => toggleTest(c)}
                                className={`p-2 rounded-2 border d-flex align-items-center gap-2 cursor-pointer ${
                                  checked ? "bg-white border-primary shadow-sm" : "bg-white text-muted"
                                }`}
                                style={{ cursor: "pointer", fontSize: "12.5px" }}
                              >
                                <Form.Check
                                  type="checkbox"
                                  checked={checked}
                                  onChange={() => {}} // handled by wrapper click
                                />
                                <div className="text-truncate">
                                  <strong className="text-dark me-1">{c.code}:</strong>
                                  <span>{c.name}</span>
                                </div>
                              </div>
                            </Col>
                          );
                        })}
                      </Row>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: TAT & LƯU Ý TIỀN PHÂN TÍCH */}
          {activeTab === "preanalytical" && (
            <div>
              <h6 className="fw-bold text-primary mb-3 d-flex align-items-center gap-2">
                <FaClock /> 4. Thời Gian Trả Kết Quả (TAT) &amp; Quy Chuẩn Tiền Phân Tích (ISO 15189)
              </h6>

              {/* TAT Section */}
              <div className="mb-4">
                <Form.Label className="small fw-semibold text-muted mb-1">
                  Thời Gian Có Kết Quả (Turnaround Time - TAT) &amp; Điều Kiện Nhận Mẫu
                </Form.Label>
                <Form.Control
                  as="textarea"
                  rows={3}
                  value={form.tat}
                  onChange={(e) => setField("tat", e.target.value)}
                  placeholder="VD: Sau 2 tiếng 20 phút cùng ngày (nếu phòng xét nghiệm nhận mẫu trước 21:30 thứ 2 - thứ 7); 8:50 ngày hôm sau (nếu nhận sau 21:30)..."
                  style={{ fontSize: "13.5px" }}
                />
                <Form.Text className="text-muted small">
                  Cam kết thời gian trả kết quả rõ ràng giúp nâng cao trải nghiệm và sự an tâm của người bệnh.
                </Form.Text>
              </div>

              {/* Preanalytical Preparation Notes */}
              <div className="mb-3">
                <Form.Label className="small fw-semibold text-muted mb-1">
                  Lưu Ý Trước Khi Xét Nghiệm (Chuẩn Bị Bệnh Nhân - Tiền Phân Tích ISO 15189)
                </Form.Label>
                <Form.Control
                  as="textarea"
                  rows={6}
                  value={form.preparationNotes}
                  onChange={(e) => setField("preparationNotes", e.target.value)}
                  placeholder="VD:&#10;Nên lấy mẫu vào buổi sáng (tốt nhất trước 10:00) sau khi nhịn ăn 8 - 12 tiếng; chỉ được uống nước lọc.&#10;Uống khoảng 250ml nước lọc trước khi lấy mẫu...&#10;Tạm ngưng uống viên sắt, vitamin ít nhất 24 giờ trước khi lấy máu...&#10;Thông báo nếu đang trong kỳ kinh nguyệt..."
                  style={{ fontSize: "13.5px" }}
                />
                <Form.Text className="text-muted small">
                  70% sai sót xét nghiệm bắt nguồn từ khâu chuẩn bị người bệnh và lấy mẫu bệnh phẩm. Hướng dẫn chi tiết giúp đảm bảo tính chính xác của kết quả.
                </Form.Text>
              </div>
            </div>
          )}
        </Form>
      </Modal.Body>

      <Modal.Footer style={{ background: "#F8FAFC", borderTop: "1px solid #E2E8F0" }} className="d-flex justify-content-between">
        <Button variant="outline-secondary" onClick={onClose} disabled={saving} className="px-3">
          Hủy bỏ
        </Button>
        <div className="d-flex gap-2">
          {activeTab !== "general" && (
            <Button
              variant="outline-primary"
              size="sm"
              className="px-3"
              onClick={() => {
                const tabs = ["general", "clinical", "biomarkers", "preanalytical"];
                const currIdx = tabs.indexOf(activeTab);
                if (currIdx > 0) setActiveTab(tabs[currIdx - 1]);
              }}
            >
              &larr; Quay lại
            </Button>
          )}
          {activeTab !== "preanalytical" ? (
            <Button
              variant="primary"
              size="sm"
              className="px-4 fw-semibold"
              onClick={() => {
                const tabs = ["general", "clinical", "biomarkers", "preanalytical"];
                const currIdx = tabs.indexOf(activeTab);
                if (currIdx < tabs.length - 1) setActiveTab(tabs[currIdx + 1]);
              }}
            >
              Tiếp theo &rarr;
            </Button>
          ) : (
            <Button
              variant="success"
              type="submit"
              form="package-rich-form"
              disabled={saving}
              className="px-4 fw-bold shadow-sm"
              style={{ background: "#059669", borderColor: "#059669" }}
            >
              {saving ? (
                <>
                  <Spinner animation="border" size="sm" className="me-2" /> Đang lưu gói...
                </>
              ) : (
                <>
                  <FaCheckCircle className="me-2" /> {isEdit ? "Cập Nhật Gói Xét Nghiệm" : "Lưu & Kích Hoạt Gói"}
                </>
              )}
            </Button>
          )}
        </div>
      </Modal.Footer>
    </Modal>
  );
}
