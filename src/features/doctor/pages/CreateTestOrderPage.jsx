/**
 * @file CreateTestOrderPage.jsx
 * @description UC32 – Physician laboratory test order creation page.
 * Bác sĩ khám lâm sàng chỉ định xét nghiệm máu, liên kết chặt chẽ với AppointmentId,
 * PatientId, mã chẩn đoán quốc tế WHO ICD-10 và phân cấp mức độ ưu tiên xét nghiệm.
 * Conforms to: BR-DOC-01, Rule 19, Production Medical Standards & AGENTS.md.
 */

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  FaSearch,
  FaClipboardList,
  FaExclamationTriangle,
  FaCheckCircle,
  FaSave,
  FaVial,
  FaUserInjured,
  FaCalendarAlt,
  FaArrowLeft,
  FaClock,
  FaInfoCircle,
  FaFileInvoiceDollar,
  FaStethoscope,
  FaPlus,
  FaTimes,
  FaUserMd
} from "react-icons/fa";
import { fetchTestCatalog, createTestOrder } from "../api/testOrderApi";
import { getPatientById, searchPatients } from "../../../services/patientService";

// Standard clinical ICD-10 catalog for test requisitions
const CLINICAL_ICD10_LIST = [
  { code: "E11.9", name: "Đái tháo đường typ 2 không biến chứng" },
  { code: "I10", name: "Tăng huyết áp vô căn (nguyên phát)" },
  { code: "E78.5", name: "Rối loạn chuyển hóa lipid máu (Tăng mỡ máu)" },
  { code: "D50.9", name: "Thiếu máu do thiếu sắt không đặc hiệu" },
  { code: "K29.7", name: "Viêm dạ dày không đặc hiệu" },
  { code: "K76.0", name: "Gan thoái hóa mỡ (Gan nhiễm mỡ / Tăng men gan)" },
  { code: "J00", name: "Viêm mũi họng cấp (Cảm lạnh thông thường)" },
  { code: "J20.9", name: "Viêm phế quản cấp" },
  { code: "M10.9", name: "Bệnh Gút (Gout) không đặc hiệu" },
  { code: "N39.0", name: "Nhiễm trùng đường tiết niệu" },
  { code: "R50.9", name: "Sốt không rõ nguyên nhân" },
  { code: "Z00.0", name: "Khám sức khỏe tổng quát định kỳ" }
];

const ICD10_REGEX = /^[A-Z][0-9]{2}(\.[0-9]{1,2})?$/;

export default function CreateTestOrderPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // URL query params
  const queryPatientId = searchParams.get("patientId") || "";
  const queryPatientName = searchParams.get("patientName") || "";
  const queryAppointmentId = searchParams.get("appointmentId") || searchParams.get("encounterId") || "";

  // Appointment & Patient binding
  const [appointmentId, setAppointmentId] = useState(queryAppointmentId);
  const [patient, setPatient] = useState({
    id: queryPatientId,
    name: queryPatientName,
    gender: "Nam",
    age: 35,
    bloodType: "Chưa xác định",
    allergies: "Không ghi nhận",
    lastVisit: "Hôm nay",
    lastCbc: "Bình thường",
    activeOrders: 0
  });

  // Current logged-in doctor info
  const currentUser = useMemo(() => {
    try {
      const raw = localStorage.getItem("bms_user") || sessionStorage.getItem("bms_user") || localStorage.getItem("user");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }, []);

  const doctorId = currentUser?.id || currentUser?.doctorId || currentUser?._id || "dr_nguyenminh";
  const doctorName = currentUser?.fullName || currentUser?.name || "BS. Nguyễn Minh";

  // Catalog & filter states
  const [catalog, setCatalog] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Tất cả");
  const [selectedCodes, setSelectedCodes] = useState(new Set());

  // ICD-10 diagnostic coding states
  const [selectedIcdCodes, setSelectedIcdCodes] = useState(["E11.9"]);
  const [icdSearchTerm, setIcdSearchTerm] = useState("");
  const [customIcdInput, setCustomIcdInput] = useState("");
  const [icdError, setIcdError] = useState("");

  // Clinical order details
  const [clinicalIndication, setClinicalIndication] = useState("Kiểm tra chỉ số sinh hóa và huyết học theo triệu chứng lâm sàng");
  const [priority, setPriority] = useState("Routine");
  const [scheduledDate, setScheduledDate] = useState(new Date().toISOString().split("T")[0]);
  const [specialInstructions, setSpecialInstructions] = useState("");

  // Status & feedback
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [orderSuccess, setOrderSuccess] = useState(null);

  // Load patient demographic details if patientId is provided
  useEffect(() => {
    if (queryPatientId) {
      getPatientById(queryPatientId)
        .then((res) => {
          const p = res?.data || res;
          if (p) {
            setPatient((prev) => ({
              ...prev,
              id: p.id || p.patientCode || queryPatientId,
              name: p.fullName || prev.name,
              gender: p.gender === "Female" ? "Nữ" : "Nam",
              age: p.age || prev.age,
              bloodType: p.bloodType || "Chưa xác định",
              allergies: Array.isArray(p.allergies) && p.allergies.length > 0 ? p.allergies.join(", ") : (p.allergies || "Không có"),
              lastVisit: p.lastVisit ? new Date(p.lastVisit).toLocaleDateString("vi-VN") : "Hôm nay",
              lastCbc: p.lastCbc || "Bình thường",
              activeOrders: p.activeOrders || 0
            }));
          }
        })
        .catch(() => {
          // If patient lookup by ID fails, fallback to query params
        });
    }
  }, [queryPatientId]);

  // Load laboratory catalog from backend
  useEffect(() => {
    const loadCatalog = async () => {
      setLoading(true);
      try {
        const items = await fetchTestCatalog();
        const safeItems = Array.isArray(items)
          ? items
          : (Array.isArray(items?.data) ? items.data : (Array.isArray(items?.items) ? items.items : []));
        setCatalog(safeItems);
      } catch (err) {
        console.error("Lỗi khi tải danh mục xét nghiệm:", err);
        setCatalog([]);
      } finally {
        setLoading(false);
      }
    };
    loadCatalog();
  }, []);

  // Toggle test selection
  const handleToggleTest = (code) => {
    const next = new Set(selectedCodes);
    if (next.has(code)) {
      next.delete(code);
    } else {
      next.add(code);
    }
    setSelectedCodes(next);
  };

  // Add ICD-10 code
  const handleAddIcdCode = (code) => {
    const upper = code.trim().toUpperCase();
    if (!ICD10_REGEX.test(upper)) {
      setIcdError(`Mã ICD-10 "${upper}" không đúng định dạng chuẩn WHO (Ví dụ: E11.9, I10, J00).`);
      return;
    }
    setIcdError("");
    if (!selectedIcdCodes.includes(upper)) {
      setSelectedIcdCodes([...selectedIcdCodes, upper]);
    }
    setCustomIcdInput("");
  };

  // Remove ICD-10 code
  const handleRemoveIcdCode = (codeToRemove) => {
    if (selectedIcdCodes.length <= 1) {
      setIcdError("Phiếu chỉ định xét nghiệm bắt buộc phải có ít nhất 1 mã chẩn đoán ICD-10.");
      return;
    }
    setIcdError("");
    setSelectedIcdCodes(selectedIcdCodes.filter((c) => c !== codeToRemove));
  };

  // Filter catalog by keyword and category
  const filteredCatalog = useMemo(() => {
    if (!Array.isArray(catalog)) return [];
    return catalog.filter((item) => {
      const name = item.name || item.testName || "";
      const code = item.code || item.testCode || "";
      const cat = item.category || "Biochemistry";

      const matchesSearch =
        name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        code.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesCat =
        selectedCategory === "Tất cả" ||
        (selectedCategory === "Sinh hóa" && (cat === "Biochemistry" || cat === "Sinh hóa")) ||
        (selectedCategory === "Huyết học" && (cat === "Hematology" || cat === "Huyết học")) ||
        (selectedCategory === "Miễn dịch" && (cat === "Immunology" || cat === "Miễn dịch"));

      return matchesSearch && matchesCat;
    });
  }, [catalog, searchTerm, selectedCategory]);

  // Selected tests calculation
  const selectedTests = useMemo(() => {
    if (!Array.isArray(catalog)) return [];
    return catalog.filter((item) => selectedCodes.has(item.code || item.testCode));
  }, [catalog, selectedCodes]);

  const totalAmount = useMemo(() => {
    return selectedTests.reduce((sum, item) => sum + (Number(item.price) || 0), 0);
  }, [selectedTests]);

  // Fasting calculation
  const fastingInfo = useMemo(() => {
    const fastingTests = selectedTests.filter(
      (t) => t.fastingRequired || (t.preparationNotes && t.preparationNotes.toLowerCase().includes("fast"))
    );
    if (fastingTests.length === 0) return { required: false, maxHours: 0 };
    const maxHours = Math.max(...fastingTests.map((t) => t.fastingHours || 8));
    return { required: true, maxHours };
  }, [selectedTests]);

  // Tube breakdown calculation
  const tubeBreakdown = useMemo(() => {
    const tubeCounts = {};
    selectedTests.forEach((t) => {
      const tube = t.tubeType || "Ống nghiệm chuẩn";
      tubeCounts[tube] = (tubeCounts[tube] || 0) + 1;
    });
    const distinctTubes = Object.keys(tubeCounts);
    return {
      count: distinctTubes.length,
      labels: distinctTubes.join(" + ")
    };
  }, [selectedTests]);

  // Submit test order
  const handleSubmitOrder = async (isDraft = false) => {
    if (!doctorId) {
      setErrorMessage("Vui lòng đăng nhập với tài khoản bác sĩ để tạo chỉ định xét nghiệm.");
      return;
    }
    if (!patient.id || !patient.id.trim()) {
      setErrorMessage("Thiếu thông tin bệnh nhân (Mã bệnh nhân bắt buộc). Vui lòng kiểm tra lại.");
      return;
    }
    if (selectedTests.length === 0) {
      setErrorMessage("Vui lòng chọn ít nhất một xét nghiệm hoặc gói xét nghiệm máu.");
      return;
    }
    if (!clinicalIndication || !clinicalIndication.trim() || clinicalIndication.trim().length < 5) {
      setErrorMessage("Lý do chỉ định xét nghiệm / Chẩn đoán lâm sàng bắt buộc tối thiểu 5 ký tự.");
      return;
    }
    if (!isDraft && (!selectedIcdCodes || selectedIcdCodes.length === 0)) {
      setErrorMessage("Quy định y khoa bắt buộc phải có ít nhất một mã chẩn đoán ICD-10 hợp lệ.");
      return;
    }

    setSubmitting(true);
    setErrorMessage("");

    try {
      const payload = {
        patientId: patient.id.trim(),
        patientName: patient.name || "Bệnh nhân",
        patientGender: patient.gender,
        patientAge: Number(patient.age) || 30,
        appointmentId: appointmentId?.trim() || undefined,
        doctorId: doctorId,
        doctorName: doctorName,
        icd10Codes: selectedIcdCodes,
        icd10Code: selectedIcdCodes[0] || "E11.9",
        priority: priority,
        clinicalIndication: clinicalIndication.trim(),
        specialInstructions: specialInstructions?.trim() || "",
        scheduledDate: scheduledDate,
        saveAsDraft: isDraft,
        items: selectedTests.map((t) => ({
          testCode: t.code || t.testCode,
          testName: t.name || t.testName,
          category: t.category || "Biochemistry",
          tubeType: t.tubeType || "SST 4mL",
          volumeMl: Number(t.volumeMl) || 4.0,
          turnaroundTime: t.turnaroundTime || "~2h",
          preparationNotes: t.preparationNotes || "Không yêu cầu",
          price: Number(t.price) || 0
        }))
      };

      const response = await createTestOrder(payload);
      setOrderSuccess(response.data || response);
    } catch (err) {
      console.error("Lỗi khi tạo phiếu chỉ định xét nghiệm:", err);
      const serverMsg = err.response?.data?.message || err.message;
      setErrorMessage(serverMsg || "Không thể tạo phiếu chỉ định xét nghiệm. Vui lòng kiểm tra lại dữ liệu nhập.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container-fluid py-4 px-md-4" style={{ backgroundColor: "#f8fafc", minHeight: "100vh" }}>
      {/* Header Breadcrumbs */}
      <div className="d-flex align-items-center justify-content-between mb-3">
        <div>
          <nav aria-label="breadcrumb">
            <ol className="breadcrumb mb-1 text-muted small">
              <li className="breadcrumb-item">
                <Link to="/doctor/console" className="text-decoration-none text-secondary">Khám Lâm Sàng</Link>
              </li>
              <li className="breadcrumb-item text-secondary">Chỉ Định Xét Nghiệm</li>
              <li className="breadcrumb-item active fw-semibold" style={{ color: "#5E85E6" }} aria-current="page">Tạo Phiếu Mới</li>
            </ol>
          </nav>
          <h2 className="h4 fw-bold text-dark mb-0 d-flex align-items-center gap-2">
            <FaVial style={{ color: "#5E85E6" }} /> Kê Phiếu Chỉ Định Xét Nghiệm Máu & Cận Lâm Sàng
          </h2>
        </div>
        <button
          className="btn btn-outline-secondary btn-sm d-flex align-items-center gap-1 shadow-sm"
          style={{ borderRadius: "9999px" }}
          onClick={() => navigate(-1)}
        >
          <FaArrowLeft /> Quay lại
        </button>
      </div>

      {/* Success Banner */}
      {orderSuccess && (
        <div className="alert alert-success border-0 shadow-sm d-flex align-items-center justify-content-between p-3 mb-4 rounded-4" style={{ backgroundColor: "#F0FDF4", borderLeft: "5px solid #91DE83" }}>
          <div className="d-flex align-items-center gap-3">
            <FaCheckCircle className="fs-2" style={{ color: "#16a34a" }} />
            <div>
              <div className="fw-bold fs-6 text-dark">
                Đã tạo thành công Phiếu Chỉ Định Xét Nghiệm #{orderSuccess.orderNumber || orderSuccess.id}!
              </div>
              <small className="text-muted">
                Bệnh nhân: <strong>{orderSuccess.patientName || patient.name}</strong> ({orderSuccess.patientId || patient.id}) ·
                Trạng thái: <span className="badge rounded-pill bg-warning text-dark ms-1">{orderSuccess.status || "Chờ lấy mẫu"}</span> ·
                Ưu tiên: <span className="badge rounded-pill text-white ms-1" style={{ backgroundColor: "#5E85E6" }}>{orderSuccess.priority || priority}</span>
              </small>
            </div>
          </div>
          <div className="d-flex gap-2">
            <button
              className="btn btn-sm btn-outline-success"
              style={{ borderRadius: "9999px" }}
              onClick={() => {
                setOrderSuccess(null);
                setSelectedCodes(new Set());
              }}
            >
              Tạo Chỉ Định Mới
            </button>
            <Link to="/doctor/console" className="btn btn-sm text-white" style={{ backgroundColor: "#5E85E6", borderColor: "#5E85E6", borderRadius: "9999px" }}>
              Về Bàn Khám Bác Sĩ
            </Link>
          </div>
        </div>
      )}

      {/* Error alert */}
      {errorMessage && (
        <div className="alert alert-danger border-0 shadow-sm d-flex align-items-center gap-2 p-3 mb-4 rounded-4">
          <FaExclamationTriangle className="text-danger fs-5" />
          <div className="fw-semibold">{errorMessage}</div>
        </div>
      )}

      {/* Patient & Appointment Demographic Banner */}
      <div className="card border-0 shadow-sm mb-4 p-3 rounded-4" style={{ borderLeft: "5px solid #5E85E6", border: "1px solid #E5E9EB" }}>
        <div className="row align-items-center g-3">
          <div className="col-auto">
            <div
              className="rounded-circle d-flex align-items-center justify-content-center text-white fw-bold shadow-sm"
              style={{ width: "52px", height: "52px", backgroundColor: "#5E85E6" }}
            >
              {(patient.name || "BN")
                .split(" ")
                .filter(Boolean)
                .map((w) => w[0])
                .slice(-2)
                .join("")
                .toUpperCase()}
            </div>
          </div>
          <div className="col">
            <div className="d-flex align-items-center gap-2 flex-wrap">
              <h5 className="mb-0 fw-bold text-dark">{patient.name || "Chưa có tên bệnh nhân"}</h5>
              <span className="badge rounded-pill bg-light text-dark border">Mã BN: {patient.id || "Chưa có"}</span>
              <span className="badge rounded-pill bg-light text-dark border">{patient.gender} · {patient.age} tuổi</span>
              <span className="badge rounded-pill bg-danger-subtle text-danger border border-danger-subtle">Nhóm máu: {patient.bloodType}</span>
              <span className="badge rounded-pill bg-success-subtle text-success border border-success-subtle">Dị ứng: {patient.allergies}</span>
            </div>
            <div className="d-flex gap-4 mt-2 text-muted small flex-wrap">
              <div>
                <span className="fw-semibold text-secondary">Lượt hẹn khám:</span>{" "}
                <span className="fw-bold font-monospace" style={{ color: "#5E85E6" }}>
                  {appointmentId || "Khám vãng lai / Trực tiếp"}
                </span>
              </div>
              <div><span className="fw-semibold text-secondary">Lần khám gần nhất:</span> {patient.lastVisit}</div>
              <div><span className="fw-semibold text-secondary">Bác sĩ chỉ định:</span> <span className="fw-semibold text-dark">{doctorName}</span></div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="row g-4">
        {/* Left Column: Test Catalog & Clinical ICD-10 Selection */}
        <div className="col-lg-8">
          {/* Card 1: Select Tests from Catalog */}
          <div className="card border-0 shadow-sm rounded-4 mb-4" style={{ border: "1px solid #E5E9EB" }}>
            <div className="card-header bg-white border-bottom py-3 d-flex align-items-center justify-content-between flex-wrap gap-2" style={{ borderColor: "#E5E9EB" }}>
              <h5 className="mb-0 fw-bold d-flex align-items-center gap-2 text-dark">
                <FaClipboardList style={{ color: "#5E85E6" }} /> Danh Mục Xét Nghiệm & Gói Cận Lâm Sàng
              </h5>
              <div className="d-flex gap-2">
                <div className="input-group input-group-sm" style={{ width: "260px" }}>
                  <span className="input-group-text bg-light border-end-0"><FaSearch className="text-muted" /></span>
                  <input
                    type="text"
                    className="form-control bg-light border-start-0"
                    placeholder="Tìm theo tên hoặc mã xét nghiệm..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Category filter pills */}
            <div className="px-3 pt-3 pb-2 d-flex gap-2 border-bottom overflow-auto" style={{ borderColor: "#E5E9EB" }}>
              {["Tất cả", "Sinh hóa", "Huyết học", "Miễn dịch"].map((cat) => (
                <button
                  key={cat}
                  type="button"
                  className={`btn btn-sm px-3 py-1 fw-semibold ${
                    selectedCategory === cat ? "text-white" : "btn-light text-secondary border"
                  }`}
                  style={{
                    borderRadius: "9999px",
                    backgroundColor: selectedCategory === cat ? "#5E85E6" : undefined,
                    borderColor: selectedCategory === cat ? "#5E85E6" : undefined
                  }}
                  onClick={() => setSelectedCategory(cat)}
                >
                  {cat}
                </button>
              ))}
            </div>

            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light text-muted small text-uppercase">
                  <tr>
                    <th style={{ width: "40px" }} className="text-center"></th>
                    <th className="text-start">Tên Xét Nghiệm / Gói</th>
                    <th className="text-start">Mã</th>
                    <th className="text-start">Ống Lấy Mẫu</th>
                    <th className="text-start">Thời Gian (TAT)</th>
                    <th className="text-start">Chuẩn Bị</th>
                    <th className="text-end pe-3">Đơn Giá (đ)</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan="7" className="text-center py-4 text-muted">
                        Đang nạp danh mục xét nghiệm lâm sàng từ hệ thống...
                      </td>
                    </tr>
                  ) : filteredCatalog.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="text-center py-4 text-muted">
                        Không tìm thấy xét nghiệm nào khớp với điều kiện tìm kiếm.
                      </td>
                    </tr>
                  ) : (
                    filteredCatalog.map((item) => {
                      const itemCode = item.code || item.testCode;
                      const itemName = item.name || item.testName;
                      const isSelected = selectedCodes.has(itemCode);
                      const tube = item.tubeType || "SST 4mL";

                      return (
                        <tr
                          key={itemCode}
                          style={{
                            cursor: "pointer",
                            backgroundColor: isSelected ? "rgba(94, 133, 230, 0.08)" : "transparent"
                          }}
                          onClick={() => handleToggleTest(itemCode)}
                        >
                          <td className="text-center" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              className="form-check-input"
                              checked={isSelected}
                              onChange={() => handleToggleTest(itemCode)}
                              style={{ cursor: "pointer" }}
                            />
                          </td>
                          <td className="fw-semibold text-dark text-start">
                            {itemName}
                          </td>
                          <td className="text-start">
                            <code className="bg-light px-2 py-1 rounded small font-monospace" style={{ color: "#5E85E6" }}>
                              {itemCode}
                            </code>
                          </td>
                          <td className="text-start">
                            <span className={`badge px-2 py-1 rounded-pill ${
                              tube.includes("EDTA")
                                ? "bg-purple-subtle text-purple border"
                                : tube.includes("NaF")
                                ? "bg-success-subtle text-success border border-success-subtle"
                                : "bg-warning-subtle text-warning-emphasis border border-warning-subtle"
                            }`}>
                              <FaVial className="me-1" />
                              {tube}
                            </span>
                          </td>
                          <td className="text-muted small text-start">
                            <FaClock className="me-1 text-secondary" />
                            {item.turnaroundTime || "~2h"}
                          </td>
                          <td className="text-start">
                            {item.preparationNotes && item.preparationNotes.toLowerCase().includes("fast") ? (
                              <span className="badge rounded-pill bg-danger-subtle text-danger border border-danger-subtle">
                                Nhịn ăn
                              </span>
                            ) : (
                              <span className="badge rounded-pill bg-light text-secondary border">
                                Bình thường
                              </span>
                            )}
                          </td>
                          <td className="text-end pe-3 fw-bold text-dark font-monospace" style={{ fontVariantNumeric: "tabular-nums" }}>
                            {Number(item.price || 0).toLocaleString("vi-VN")} đ
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Card 2: Clinical Details & ICD-10 Coding */}
          <div className="card border-0 shadow-sm rounded-4" style={{ border: "1px solid #E5E9EB" }}>
            <div className="card-header bg-white border-bottom py-3" style={{ borderColor: "#E5E9EB" }}>
              <h5 className="mb-0 fw-bold d-flex align-items-center gap-2 text-dark">
                <FaStethoscope style={{ color: "#5E85E6" }} /> Chẩn Đoán ICD-10 & Y Lệnh Lâm Sàng
              </h5>
            </div>
            <div className="card-body p-4">
              {/* ICD-10 Diagnostic Picker (Ràng buộc nghiệp vụ bắt buộc) */}
              <div className="mb-4 p-3 rounded-4 border" style={{ backgroundColor: "#F1F4F7", borderColor: "#E5E9EB" }}>
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <label className="form-label fw-bold text-dark mb-0">
                    Mã Bệnh WHO ICD-10 (Bắt buộc theo BR-DOC-01) <span className="text-danger">*</span>
                  </label>
                  <small className="text-muted">Định dạng chuẩn: A00 - Z99.9 (Ví dụ: E11.9, I10)</small>
                </div>

                {/* Selected ICD-10 Badges */}
                <div className="d-flex flex-wrap gap-2 mb-3">
                  {selectedIcdCodes.map((code) => {
                    const info = CLINICAL_ICD10_LIST.find((x) => x.code === code);
                    return (
                      <span
                        key={code}
                        className="badge d-inline-flex align-items-center gap-2 px-3 py-2 fs-6 rounded-pill text-white shadow-sm"
                        style={{ backgroundColor: "#5E85E6" }}
                      >
                        <span className="font-monospace fw-bold">{code}</span>
                        {info && <span className="fw-normal small">({info.name})</span>}
                        <FaTimes
                          style={{ cursor: "pointer" }}
                          onClick={() => handleRemoveIcdCode(code)}
                          title="Xóa mã này"
                        />
                      </span>
                    );
                  })}
                </div>

                {icdError && (
                  <div className="text-danger small mb-2 fw-semibold">
                    <FaExclamationTriangle className="me-1" /> {icdError}
                  </div>
                )}

                {/* Fast ICD-10 suggestions buttons */}
                <div className="mb-2">
                  <small className="text-muted fw-semibold d-block mb-1">Mã ICD-10 lâm sàng phổ biến (Bấm để thêm):</small>
                  <div className="d-flex flex-wrap gap-1">
                    {CLINICAL_ICD10_LIST.map((icd) => {
                      const isChosen = selectedIcdCodes.includes(icd.code);
                      return (
                        <button
                          key={icd.code}
                          type="button"
                          className={`btn btn-sm py-0.5 px-2.5 ${
                            isChosen ? "btn-secondary disabled opacity-50" : "btn-outline-primary"
                          }`}
                          style={{ borderRadius: "9999px" }}
                          onClick={() => handleAddIcdCode(icd.code)}
                          disabled={isChosen}
                        >
                          <strong>{icd.code}</strong> - {icd.name}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Custom ICD-10 Input */}
                <div className="input-group input-group-sm mt-3" style={{ maxWidth: "420px" }}>
                  <span className="input-group-text bg-white">Mã ICD-10 khác:</span>
                  <input
                    type="text"
                    className="form-control text-uppercase font-monospace fw-bold"
                    placeholder="VD: K29.7, D50.9..."
                    value={customIcdInput}
                    onChange={(e) => setCustomIcdInput(e.target.value.toUpperCase())}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        if (customIcdInput.trim()) handleAddIcdCode(customIcdInput.trim());
                      }
                    }}
                  />
                  <button
                    type="button"
                    className="btn text-white"
                    style={{ backgroundColor: "#5E85E6", borderColor: "#5E85E6", borderRadius: "0 9999px 9999px 0" }}
                    onClick={() => {
                      if (customIcdInput.trim()) handleAddIcdCode(customIcdInput.trim());
                    }}
                  >
                    <FaPlus className="me-1" /> Thêm Mã
                  </button>
                </div>
              </div>

              {/* Clinical Indication */}
              <div className="mb-3">
                <label className="form-label fw-semibold text-dark">
                  Lý do chỉ định xét nghiệm / Chẩn đoán lâm sàng <span className="text-danger">*</span>
                </label>
                <textarea
                  className="form-control"
                  rows="3"
                  value={clinicalIndication}
                  onChange={(e) => setClinicalIndication(e.target.value)}
                  placeholder="Nhập triệu chứng, chẩn đoán sơ bộ hoặc lý do bác sĩ yêu cầu thực hiện cận lâm sàng..."
                  required
                />
              </div>

              <div className="row g-3 mb-3">
                <div className="col-md-6">
                  <label className="form-label fw-semibold text-dark">Mức độ ưu tiên xét nghiệm</label>
                  <select
                    className="form-select"
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                  >
                    <option value="Routine">Thường quy (Routine - Trả theo giờ chuẩn)</option>
                    <option value="Urgent">Khẩn cấp (Urgent - Ưu tiên xử lý nhanh)</option>
                    <option value="STAT">Tối khẩn / Cấp cứu (STAT - Phân tích ngay lập tức)</option>
                  </select>
                </div>
                <div className="col-md-6">
                  <label className="form-label fw-semibold text-dark">Ngày dự kiến lấy mẫu</label>
                  <input
                    type="date"
                    className="form-control"
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                  />
                </div>
              </div>

              <div className="mb-0">
                <label className="form-label fw-semibold text-dark">Dặn dò phòng xét nghiệm & Ghi chú kỹ thuật</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Ví dụ: Kiểm tra lại men gan nếu bất thường, thông báo ngay giá trị báo động (Panic Value)..."
                  value={specialInstructions}
                  onChange={(e) => setSpecialInstructions(e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right Sticky Column: Order Summary & Actions */}
        <div className="col-lg-4">
          <div className="card border-0 shadow-sm rounded-4 position-sticky" style={{ top: "24px", border: "1px solid #E5E9EB" }}>
            <div className="card-header bg-white border-bottom py-3" style={{ borderColor: "#E5E9EB" }}>
              <h5 className="mb-0 fw-bold d-flex align-items-center gap-2 text-dark">
                <FaFileInvoiceDollar style={{ color: "#5E85E6" }} /> Tóm Tắt Phiếu Chỉ Định
              </h5>
            </div>
            <div className="card-body p-4">
              {/* Selected Tests List */}
              <div className="mb-3">
                <div className="text-muted small fw-semibold text-uppercase mb-2">
                  Xét nghiệm đã chọn ({selectedTests.length})
                </div>
                {selectedTests.length === 0 ? (
                  <div className="text-muted small py-3 text-center bg-light rounded-3 border">
                    Chưa có xét nghiệm nào được chọn.
                  </div>
                ) : (
                  <div className="list-group list-group-flush border-top border-bottom" style={{ maxHeight: "260px", overflowY: "auto" }}>
                    {selectedTests.map((t) => {
                      const itemCode = t.code || t.testCode;
                      const itemName = t.name || t.testName;
                      return (
                        <div key={itemCode} className="list-group-item px-0 py-2 d-flex justify-content-between align-items-center small">
                          <div>
                            <div className="fw-semibold text-dark">{itemName}</div>
                            <span className="text-muted font-monospace">{itemCode}</span>
                          </div>
                          <span className="font-monospace fw-semibold text-dark" style={{ fontVariantNumeric: "tabular-nums" }}>
                            {Number(t.price || 0).toLocaleString("vi-VN")} đ
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Tube Breakdown & Fasting Summary */}
              <div className="d-flex justify-content-between align-items-center py-2 mb-3">
                <div>
                  <div className="fw-bold text-dark">{selectedTests.length} xét nghiệm</div>
                  <small className="text-muted">
                    {tubeBreakdown.count > 0 ? `${tubeBreakdown.count} loại ống (${tubeBreakdown.labels})` : "Chưa có ống lấy mẫu"}
                    {fastingInfo.required ? ` · Nhịn ăn ${fastingInfo.maxHours}h` : ""}
                  </small>
                </div>
                <div className="text-end">
                  <div className="fs-4 fw-bold font-monospace" style={{ color: "#5E85E6", fontVariantNumeric: "tabular-nums" }}>
                    {totalAmount.toLocaleString("vi-VN")} đ
                  </div>
                </div>
              </div>

              {/* Reagent and Consumable Inventory Deduction Estimation */}
              {selectedTests.length > 0 && (
                <div className="p-3 mb-3 rounded-3 border" style={{ backgroundColor: "#F1F4F7", borderColor: "#E5E9EB" }}>
                  <div className="d-flex justify-content-between align-items-center mb-1">
                    <span className="small fw-bold text-dark d-flex align-items-center gap-1">
                      <FaVial style={{ color: "#5E85E6" }} /> Trừ hao vật tư & hóa chất (Dự kiến):
                    </span>
                    <span className="badge rounded-pill bg-success-subtle text-success border border-success-subtle" style={{ fontSize: "11px" }}>
                      Sẵn sàng trong kho
                    </span>
                  </div>
                  <ul className="list-unstyled mb-0 small text-secondary" style={{ fontSize: "12px" }}>
                    <li className="d-flex justify-content-between py-0.5">
                      <span>• Ống lấy máu chân không ({tubeBreakdown.labels || "Chuẩn"}):</span>
                      <strong className="text-dark font-monospace">{tubeBreakdown.count} ống</strong>
                    </li>
                    <li className="d-flex justify-content-between py-0.5">
                      <span>• Định mức hóa chất phân tích (Reagent pack):</span>
                      <strong className="text-dark font-monospace">{selectedTests.length} test</strong>
                    </li>
                    <li className="d-flex justify-content-between py-0.5">
                      <span>• Kim bướm & bông gạc vô trùng:</span>
                      <strong className="text-dark font-monospace">1 bộ</strong>
                    </li>
                  </ul>
                </div>
              )}

              {/* Fasting Warning Alert */}
              {fastingInfo.required && (
                <div className="alert alert-warning border-0 d-flex gap-2 p-3 mb-4 rounded-3 small">
                  <FaExclamationTriangle className="text-warning-emphasis flex-shrink-0 mt-1" />
                  <div>
                    <strong>Yêu cầu nhịn ăn:</strong> Bệnh nhân cần nhịn ăn tối thiểu {fastingInfo.maxHours} giờ trước thời điểm lấy mẫu máu.
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="d-grid gap-2">
                <button
                  type="button"
                  className="btn btn-lg fw-semibold d-flex align-items-center justify-content-center gap-2 shadow-sm text-white"
                  style={{ backgroundColor: "#5E85E6", borderColor: "#5E85E6", borderRadius: "9999px" }}
                  disabled={submitting || selectedTests.length === 0 || !doctorId || !patient.id}
                  onClick={() => handleSubmitOrder(false)}
                >
                  <FaCheckCircle /> {submitting ? "Đang gửi chỉ định..." : "Ra Chỉ Định Xét Nghiệm"}
                </button>
                <button
                  type="button"
                  className="btn btn-outline-secondary fw-semibold d-flex align-items-center justify-content-center gap-2"
                  style={{ borderRadius: "9999px" }}
                  disabled={submitting || selectedTests.length === 0 || !doctorId || !patient.id}
                  onClick={() => handleSubmitOrder(true)}
                >
                  <FaSave /> Lưu Bản Nháp (Draft)
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
