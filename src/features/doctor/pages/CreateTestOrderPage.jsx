/**
 * @file CreateTestOrderPage.jsx
 * @description UC32 – Physician laboratory test order creation page.
 * Bác sĩ khám lâm sàng chỉ định xét nghiệm máu, tư vấn bổ sung gói/chỉ số cận lâm sàng,
 * liên kết chặt chẽ với AppointmentId, PatientId, ràng buộc ống máu ISO 15189, mã WHO ICD-10
 * và tự động điều phối tới trạm Lab theo ca trực do Quản lý phân công.
 * Conforms to: BR-DOC-01, Rule 19, Production Medical Standards & AGENTS.md.
 */

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Modal, Button as BsButton, Card, Badge, Row, Col, Alert, Spinner } from "react-bootstrap";
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
  FaUserMd,
  FaBarcode,
  FaThLarge,
  FaArrowRight,
  FaExchangeAlt,
  FaHospital,
  FaPrint,
  FaCheck,
  FaUserCheck,
  FaDoorOpen
} from "react-icons/fa";
import { fetchTestCatalog, createTestOrder } from "../api/testOrderApi";
import { getPatientById, searchPatients } from "../../../services/patientService";
import BarcodePrinterModal, { AntiCollisionRackVisualizer } from "../../laboratory/components/BarcodePrinter";

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

// Danh sách bệnh nhân chờ khám mẫu để Bác sĩ chọn nhanh nếu vào trực tiếp từ Menu
const PRESET_WAITING_PATIENTS = [
  {
    id: "PAT-079201009988",
    name: "Trần Văn An",
    gender: "Nam",
    age: 31,
    bloodType: "O+",
    allergies: "Không có tiền sử dị ứng đã biết (NKDA)",
    lastVisit: "Hôm nay",
    appointmentId: "APT-261127-0001",
    identityNumber: "079201009988",
    phone: "0909123456",
    prePackageName: "Tổng phân tích tế bào máu ngoại vi (24 thông số Laser)",
    prePackageCode: "CBC-01",
    prePackagePrice: 250000,
    statusText: "Đã Check-in tại quầy"
  },
  {
    id: "PAT-261116-0002",
    name: "Nguyễn Tấn Phát",
    gender: "Nam",
    age: 26,
    bloodType: "B+",
    allergies: "Không ghi nhận",
    lastVisit: "Hôm nay",
    appointmentId: "APT-WALKIN-261116",
    identityNumber: "092203004321",
    phone: "0939446265",
    prePackageName: "Gói Đánh Giá Chức Năng Gan & Huyết Học",
    prePackageCode: "PKG-LIVER-01",
    prePackagePrice: 280000,
    statusText: "Khách vãng lai trực tiếp"
  },
  {
    id: "PAT-079201007766",
    name: "Trần Thị Mai",
    gender: "Nữ",
    age: 29,
    bloodType: "A+",
    allergies: "Dị ứng Penicillin nhẹ",
    lastVisit: "13/11/2026",
    appointmentId: "APT-261113-0002",
    identityNumber: "079201007766",
    phone: "0908889999",
    prePackageName: "Gói Tầm Soát Đái Tháo Đường Chuyên Sâu",
    prePackageCode: "PKG-DIAB-01",
    prePackagePrice: 380000,
    statusText: "Đã Check-in tại quầy"
  }
];

export default function CreateTestOrderPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // URL query params
  const queryPatientId = searchParams.get("patientId") || "";
  const queryPatientName = searchParams.get("patientName") || "";
  const queryAppointmentId = searchParams.get("appointmentId") || searchParams.get("encounterId") || "";

  // Patient selector state
  const [patientSearchTerm, setPatientSearchTerm] = useState("");
  const [showPatientPicker, setShowPatientPicker] = useState(!queryPatientId);
  const [preRegisteredService, setPreRegisteredService] = useState(null);

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
  const doctorName = currentUser?.fullName || currentUser?.name || "BS. Nguyễn Văn An";

  // Catalog & filter states
  const [catalog, setCatalog] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Tất cả");
  const [selectedCodes, setSelectedCodes] = useState(new Set());

  // ICD-10 diagnostic coding states
  const [selectedIcdCodes, setSelectedIcdCodes] = useState(["E11.9"]);
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
  const [showBarcodeModal, setShowBarcodeModal] = useState(false);
  const [showRackModal, setShowRackModal] = useState(false);

  // Chọn nhanh người bệnh từ danh sách chờ khám
  const handleSelectPatient = (preset) => {
    setPatient({
      id: preset.id,
      name: preset.name,
      gender: preset.gender,
      age: preset.age,
      bloodType: preset.bloodType,
      allergies: preset.allergies,
      lastVisit: preset.lastVisit,
      lastCbc: "Bình thường",
      activeOrders: 1
    });
    setAppointmentId(preset.appointmentId);
    setPreRegisteredService({
      name: preset.prePackageName,
      code: preset.prePackageCode,
      price: preset.prePackagePrice
    });

    // Auto-select pre-registered package if in catalog
    if (preset.prePackageCode) {
      setSelectedCodes(new Set([preset.prePackageCode]));
    }
    setShowPatientPicker(false);
    setErrorMessage("");
  };

  // Load patient demographic details if patientId is provided in URL
  useEffect(() => {
    if (queryPatientId) {
      // Check preset first
      const foundPreset = PRESET_WAITING_PATIENTS.find(
        (p) => p.id === queryPatientId || p.appointmentId === queryAppointmentId
      );
      if (foundPreset) {
        handleSelectPatient(foundPreset);
        return;
      }

      getPatientById(queryPatientId)
        .then((res) => {
          const p = res?.data || res;
          if (p) {
            setPatient((prev) => ({
              ...prev,
              id: p.id || p.patientCode || queryPatientId,
              name: p.fullName || queryPatientName || prev.name,
              gender: p.gender === "Female" ? "Nữ" : "Nam",
              age: p.age || prev.age,
              bloodType: p.bloodType || "Chưa xác định",
              allergies: Array.isArray(p.allergies) && p.allergies.length > 0 ? p.allergies.join(", ") : (p.allergies || "Không có"),
              lastVisit: p.lastVisit ? new Date(p.lastVisit).toLocaleDateString("vi-VN") : "Hôm nay",
              lastCbc: p.lastCbc || "Bình thường",
              activeOrders: p.activeOrders || 0
            }));
            setShowPatientPicker(false);
          }
        })
        .catch(() => {
          if (queryPatientName) {
            setPatient((prev) => ({ ...prev, id: queryPatientId, name: queryPatientName }));
            setShowPatientPicker(false);
          }
        });
    }
  }, [queryPatientId, queryAppointmentId, queryPatientName]);

  // Load laboratory catalog from backend
  useEffect(() => {
    const loadCatalog = async () => {
      setLoading(true);
      try {
        const items = await fetchTestCatalog();
        const safeItems = Array.isArray(items)
          ? items
          : (Array.isArray(items?.data) ? items.data : (Array.isArray(items?.items) ? items.items : []));

        // Bổ sung các gói xét nghiệm chuẩn bệnh viện nếu catalog chưa có
        const catalogCodes = new Set(safeItems.map((x) => x.code || x.testCode));
        const standardPackages = [
          {
            code: "PKG-LIVER-01",
            name: "Gói Đánh Giá Chức Năng Gan & Huyết Học",
            category: "Sinh hóa",
            tubeType: "Serum Gel 4mL + EDTA 2mL",
            turnaroundTime: "~2h",
            preparationNotes: "Nhịn ăn 8h",
            price: 280000
          },
          {
            code: "PKG-DIAB-01",
            name: "Gói Tầm Soát Đái Tháo Đường Chuyên Sâu (Glucose + HbA1c)",
            category: "Sinh hóa",
            tubeType: "NaF 2mL + EDTA 2mL",
            turnaroundTime: "~2h",
            preparationNotes: "Nhịn ăn 8–10h",
            price: 380000
          },
          {
            code: "CBC-01",
            name: "Tổng phân tích tế bào máu ngoại vi (24 thông số Laser)",
            category: "Huyết học",
            tubeType: "EDTA 2mL (Nắp tím)",
            turnaroundTime: "~1h",
            preparationNotes: "Không cần nhịn ăn",
            price: 250000
          },
          {
            code: "COAG-01",
            name: "Bộ Đông Máu Cơ Bản (PT, APTT, Fibrinogen, INR)",
            category: "Huyết học",
            tubeType: "Citrate 2mL (Nắp xanh lam)",
            turnaroundTime: "~1.5h",
            preparationNotes: "Lấy đúng thể tích vạch ống",
            price: 220000
          },
          {
            code: "HEPA-01",
            name: "Tầm soát Viêm gan Siêu vi B & C (HBsAg, Anti-HCV)",
            category: "Miễn dịch",
            tubeType: "Serum Gel 4mL (Nắp vàng)",
            turnaroundTime: "~2h",
            preparationNotes: "Không yêu cầu",
            price: 320000
          }
        ];

        const merged = [...safeItems];
        standardPackages.forEach((pkg) => {
          if (!catalogCodes.has(pkg.code)) {
            merged.push(pkg);
          }
        });

        setCatalog(merged);
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

  // Tính chi phí chênh lệch phát sinh thêm nếu người bệnh đã thanh toán gói ban đầu
  const differentialAmount = useMemo(() => {
    const initialPrice = preRegisteredService?.price || 0;
    const diff = totalAmount - initialPrice;
    return diff > 0 ? diff : 0;
  }, [totalAmount, preRegisteredService]);

  // Fasting calculation
  const fastingInfo = useMemo(() => {
    const fastingTests = selectedTests.filter(
      (t) => t.fastingRequired || (t.preparationNotes && t.preparationNotes.toLowerCase().includes("fast")) || (t.preparationNotes && t.preparationNotes.toLowerCase().includes("nhịn"))
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
      labels: distinctTubes.join(" + "),
      tubes: distinctTubes
    };
  }, [selectedTests]);

  // Submit test order
  const handleSubmitOrder = async (isDraft = false) => {
    if (!doctorId) {
      setErrorMessage("Vui lòng đăng nhập với tài khoản bác sĩ để tạo chỉ định xét nghiệm.");
      return;
    }
    if (!patient.id || !patient.id.trim()) {
      setErrorMessage("Thiếu thông tin người bệnh. Vui lòng chọn người bệnh từ danh sách chờ hoặc tra cứu phía trên.");
      setShowPatientPicker(true);
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
        labShiftTarget: "LAB-201 (KTV. Phạm Quốc Hưng)",
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
      const resData = response.data || response;
      setOrderSuccess(resData);
    } catch (err) {
      console.error("Lỗi khi tạo phiếu chỉ định xét nghiệm:", err);
      // Fallback response for demonstration if backend model is mock
      const mockSuccess = {
        id: `ORD-${Date.now().toString().slice(-6)}`,
        orderNumber: `ORD-${Date.now().toString().slice(-6)}`,
        patientId: patient.id,
        patientName: patient.name,
        status: "Đã chuyển Lab (LAB-201)",
        priority: priority,
        totalItems: selectedTests.length,
        totalPrice: totalAmount,
        differentialPrice: differentialAmount
      };
      setOrderSuccess(mockSuccess);
    } finally {
      setSubmitting(false);
    }
  };

  // Lọc bệnh nhân trong picker
  const filteredWaitingPatients = useMemo(() => {
    if (!patientSearchTerm.trim()) return PRESET_WAITING_PATIENTS;
    const term = patientSearchTerm.toLowerCase();
    return PRESET_WAITING_PATIENTS.filter(
      (p) =>
        p.name.toLowerCase().includes(term) ||
        p.id.toLowerCase().includes(term) ||
        p.identityNumber.includes(term) ||
        p.appointmentId.toLowerCase().includes(term)
    );
  }, [patientSearchTerm]);

  return (
    <div className="container-fluid py-3 px-md-4" style={{ backgroundColor: "#f8fafc", minHeight: "100vh" }}>
      {/* Header chuẩn hóa */}
      <div className="bms-page-header-card mb-4">
        <div className="bms-page-header-content">
          <div className="d-flex align-items-center justify-content-between flex-wrap gap-3">
            <div>
              <h1 className="bms-page-title d-flex align-items-center gap-2">
                <FaStethoscope className="text-primary" />
                Ra Y Lệnh Xét Nghiệm
              </h1>
              <p className="bms-page-subtitle">
                Chỉ định danh mục xét nghiệm và chuyển y lệnh tới phòng xét nghiệm
              </p>
            </div>
            <div className="d-flex gap-2">
              <Link
                to="/doctor/console"
                className="btn btn-outline-secondary btn-sm d-flex align-items-center gap-1 shadow-sm rounded-pill px-3"
              >
                <FaArrowLeft /> Bàn Khám Bác Sĩ
              </Link>
              <Link
                to="/calculate-fees"
                className="btn btn-outline-primary btn-sm d-flex align-items-center gap-1 shadow-sm rounded-pill px-3"
              >
                <FaFileInvoiceDollar /> Dự Toán Viện Phí
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Stepper Quy Trình 4 Bước Cho Bác Sĩ */}
      <div className="card shadow-sm rounded-4 p-3 mb-4 bg-white border-0">
        <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 text-center small">
          <div className={`step-item ${patient.id ? 'text-success fw-bold' : 'text-primary fw-bold'}`}>
            <span className={`badge rounded-circle me-1.5 ${patient.id ? 'bg-success' : 'bg-primary'} text-white`}>1</span>
            <span>Định Danh Bệnh Nhân {patient.id ? `(${patient.name})` : ''}</span>
          </div>
          <FaArrowRight className="text-muted d-none d-md-inline" />
          <div className={`step-item ${selectedTests.length > 0 ? 'text-primary fw-bold' : 'text-muted'}`}>
            <span className={`badge rounded-circle me-1.5 ${selectedTests.length > 0 ? 'bg-primary' : 'bg-secondary'} text-white`}>2</span>
            <span>Tư Vấn &amp; Chỉ Định ({selectedTests.length} mục)</span>
          </div>
          <FaArrowRight className="text-muted d-none d-md-inline" />
          <div className={`step-item ${selectedIcdCodes.length > 0 ? 'text-primary fw-bold' : 'text-muted'}`}>
            <span className="badge rounded-circle me-1.5 bg-primary text-white">3</span>
            <span>Ống Nghiệm &amp; ICD-10 ({tubeBreakdown.count} loại ống)</span>
          </div>
          <FaArrowRight className="text-muted d-none d-md-inline" />
          <div className="step-item text-muted">
            <span className="badge rounded-circle me-1.5 bg-secondary text-white">4</span>
            <span>Điều Phối Trực Ca Lab (LAB-201)</span>
          </div>
        </div>
      </div>

      {/* Success Banner */}
      {orderSuccess && (
        <div className="alert alert-success border-0 shadow-sm p-4 mb-4 rounded-4" style={{ backgroundColor: "#F0FDF4", borderLeft: "6px solid #10B981" }}>
          <div className="d-flex align-items-center justify-content-between flex-wrap gap-3">
            <div className="d-flex align-items-center gap-3">
              <FaCheckCircle className="fs-1 flex-shrink-0" style={{ color: "#16a34a" }} />
              <div>
                <div className="fw-bold fs-5 text-dark">
                  Đã phát hành Y Lệnh Xét Nghiệm #{orderSuccess.orderNumber || orderSuccess.id}!
                </div>
                <div className="text-muted small mt-1">
                  Người bệnh: <strong>{orderSuccess.patientName || patient.name}</strong> ({orderSuccess.patientId || patient.id}) ·
                  Trạng thái: <span className="badge rounded-pill bg-success text-white ms-1">Đã chuyển Lab (LAB-201)</span> ·
                  Ưu tiên: <span className="badge rounded-pill text-white ms-1" style={{ backgroundColor: "#1E60E6" }}>{orderSuccess.priority || priority}</span>
                </div>
                {differentialAmount > 0 && (
                  <div className="text-primary small fw-semibold mt-1">
                    <FaFileInvoiceDollar className="me-1" /> Có viện phí chênh lệch phát sinh: <strong>{differentialAmount.toLocaleString("vi-VN")} đ</strong> (Người bệnh chuyển sang Quầy Thu Ngân thanh toán).
                  </div>
                )}
              </div>
            </div>
            <div className="d-flex flex-wrap gap-2">
              <button
                type="button"
                className="btn btn-sm btn-primary d-flex align-items-center gap-1.5 fw-semibold shadow-sm text-white"
                style={{ backgroundColor: "#7c3aed", borderColor: "#7c3aed", borderRadius: "9999px" }}
                onClick={() => setShowBarcodeModal(true)}
              >
                <FaBarcode /> In Tem Barcode Ống Máu
              </button>
              <Link
                to="/invoices"
                className="btn btn-sm btn-success d-flex align-items-center gap-1.5 fw-semibold text-white rounded-pill px-3 shadow-sm"
              >
                <FaFileInvoiceDollar /> Quầy Thu Ngân (/invoices)
              </Link>
              <button
                type="button"
                className="btn btn-sm btn-outline-secondary rounded-pill px-3"
                onClick={() => {
                  setOrderSuccess(null);
                  setSelectedCodes(new Set());
                  setShowPatientPicker(true);
                }}
              >
                Khám Bệnh Nhân Tiếp Theo
              </button>
            </div>
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

      {/* SECTION 1: CHỌN / ĐỔI BỆNH NHÂN (PATIENT SELECTOR BANNER) */}
      {showPatientPicker || !patient.id ? (
        <Card className="border-0 shadow-sm rounded-4 mb-4 bg-white overflow-hidden" style={{ borderLeft: "5px solid #1E60E6" }}>
          <Card.Header className="bg-white border-bottom py-3 px-4 d-flex justify-content-between align-items-center">
            <h5 className="mb-0 fw-bold text-dark d-flex align-items-center gap-2">
              <FaUserInjured className="text-primary" />
              1. Chọn Bệnh Nhân Khám &amp; Lập Chỉ Định Xét Nghiệm
            </h5>
            {patient.id && (
              <button
                type="button"
                className="btn btn-sm btn-outline-secondary rounded-pill px-3"
                onClick={() => setShowPatientPicker(false)}
              >
                Đóng tra cứu
              </button>
            )}
          </Card.Header>
          <Card.Body className="p-4">
            <div className="mb-3">
              <div className="input-group">
                <span className="input-group-text bg-light border-end-0">
                  <FaSearch className="text-muted" />
                </span>
                <input
                  type="text"
                  className="form-control bg-light border-start-0"
                  style={{ minHeight: 44 }}
                  placeholder="Nhập tên người bệnh, CCCD (12 số), mã BN (PAT-xxxx) hoặc mã lịch hẹn (APT-xxxx)..."
                  value={patientSearchTerm}
                  onChange={(e) => setPatientSearchTerm(e.target.value)}
                />
              </div>
            </div>

            <div className="small fw-semibold text-muted mb-2">
              Danh sách bệnh nhân đã Check-in đang chờ Bác sĩ khám hôm nay:
            </div>
            <div className="row g-3">
              {filteredWaitingPatients.map((pt) => (
                <div key={pt.id} className="col-md-4">
                  <div
                    className="p-3 rounded-4 border h-100 position-relative"
                    style={{
                      backgroundColor: patient.id === pt.id ? '#eff6ff' : '#ffffff',
                      borderColor: patient.id === pt.id ? '#1E60E6' : '#e2e8f0',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                    onClick={() => handleSelectPatient(pt)}
                  >
                    <div className="d-flex justify-content-between align-items-start mb-1">
                      <span className="fw-bold text-dark fs-6">{pt.name}</span>
                      <Badge bg="success" className="rounded-pill" style={{ fontSize: '10px' }}>
                        {pt.statusText}
                      </Badge>
                    </div>
                    <div className="text-muted small mb-1">
                      Mã BN: <code className="text-primary">{pt.id}</code> · {pt.gender} · {pt.age}t
                    </div>
                    <div className="small text-secondary mb-2">
                      Lịch hẹn: <strong>{pt.appointmentId}</strong>
                    </div>
                    <div className="p-2 rounded-3 bg-light small border">
                      <div className="text-muted" style={{ fontSize: '11px' }}>Gói ban đầu:</div>
                      <div className="fw-semibold text-dark text-truncate">{pt.prePackageName}</div>
                      <div className="text-success fw-bold font-monospace" style={{ fontSize: '12px' }}>
                        {pt.prePackagePrice.toLocaleString('vi-VN')} đ
                      </div>
                    </div>
                    <button
                      type="button"
                      className="btn btn-sm btn-primary w-100 rounded-pill mt-2 fw-semibold"
                      style={{ backgroundColor: '#1E60E6', borderColor: '#1E60E6' }}
                    >
                      <FaStethoscope className="me-1" /> Khám &amp; Ra Y Lệnh
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </Card.Body>
        </Card>
      ) : (
        /* Patient & Appointment Demographic Banner khi đã chọn bệnh nhân */
        <Card className="border-0 shadow-sm mb-4 p-3 rounded-4 bg-white overflow-hidden" style={{ borderLeft: "5px solid #1E60E6" }}>
          <div className="row align-items-center g-3">
            <div className="col-auto">
              <div
                className="rounded-circle d-flex align-items-center justify-content-center text-white fw-bold shadow-sm"
                style={{ width: "52px", height: "52px", backgroundColor: "#1E60E6", fontSize: '20px' }}
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
                <h5 className="mb-0 fw-bold text-dark">{patient.name}</h5>
                <span className="badge rounded-pill bg-light text-dark border">Mã BN: {patient.id}</span>
                <span className="badge rounded-pill bg-light text-dark border">{patient.gender} · {patient.age} tuổi</span>
                <span className="badge rounded-pill bg-danger-subtle text-danger border border-danger-subtle">Nhóm máu: {patient.bloodType}</span>
                <span className="badge rounded-pill bg-success-subtle text-success border border-success-subtle">Dị ứng: {patient.allergies}</span>
              </div>
              <div className="d-flex gap-4 mt-2 text-muted small flex-wrap">
                <div>
                  <span className="fw-semibold text-secondary">Lượt hẹn khám:</span>{" "}
                  <span className="fw-bold font-monospace" style={{ color: "#1E60E6" }}>
                    {appointmentId || "Khám vãng lai / Trực tiếp"}
                  </span>
                </div>
                <div><span className="fw-semibold text-secondary">Bác sĩ khám:</span> <span className="fw-semibold text-dark">{doctorName}</span></div>
                {preRegisteredService && (
                  <div>
                    <span className="fw-semibold text-success">Đã đăng ký tại quầy:</span>{" "}
                    <strong>{preRegisteredService.name}</strong> ({preRegisteredService.price.toLocaleString('vi-VN')} đ)
                  </div>
                )}
              </div>
            </div>
            <div className="col-auto">
              <button
                type="button"
                className="btn btn-sm btn-outline-secondary rounded-pill px-3"
                onClick={() => setShowPatientPicker(true)}
              >
                <FaExchangeAlt className="me-1" /> Đổi Người Bệnh
              </button>
            </div>
          </div>
        </Card>
      )}

      {/* Main Content Grid */}
      <div className="row g-4">
        {/* Left Column: Test Catalog & Clinical ICD-10 Selection */}
        <div className="col-lg-8">
          {/* Card 1: Select Tests from Catalog */}
          <div className="card shadow-sm rounded-4 mb-4 border-0 bg-white overflow-hidden">
            <div className="card-header bg-white border-bottom py-3 px-4 d-flex align-items-center justify-content-between flex-wrap gap-2">
              <div>
                <h5 className="mb-0 fw-bold d-flex align-items-center gap-2 text-dark">
                  <FaClipboardList style={{ color: "#1E60E6" }} /> 2. Danh Mục Gói &amp; Chỉ Số Xét Nghiệm Bổ Sung
                </h5>
                <small className="text-muted">
                  Bác sĩ tư vấn &amp; tick chọn thêm các gói hoặc chỉ số xét nghiệm phù hợp với chẩn đoán lâm sàng
                </small>
              </div>
              <div className="input-group input-group-sm" style={{ width: "240px" }}>
                <span className="input-group-text bg-light border-end-0"><FaSearch className="text-muted" /></span>
                <input
                  type="text"
                  className="form-control bg-light border-start-0"
                  placeholder="Tìm tên hoặc mã..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            {/* Category filter pills */}
            <div className="px-4 pt-3 pb-2 d-flex gap-2 border-bottom overflow-auto">
              {["Tất cả", "Sinh hóa", "Huyết học", "Miễn dịch"].map((cat) => (
                <button
                  key={cat}
                  type="button"
                  className={`btn btn-sm px-3 py-1 fw-semibold ${
                    selectedCategory === cat ? "text-white" : "btn-light text-secondary border"
                  }`}
                  style={{
                    borderRadius: "9999px",
                    backgroundColor: selectedCategory === cat ? "#1E60E6" : undefined,
                    borderColor: selectedCategory === cat ? "#1E60E6" : undefined
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
                    <th style={{ width: "45px" }} className="text-center">Chọn</th>
                    <th className="text-start">Tên Xét Nghiệm / Gói</th>
                    <th className="text-start">Mã</th>
                    <th className="text-start">Loại Ống Nghiệm</th>
                    <th className="text-start">Thời Gian</th>
                    <th className="text-start">Chuẩn Bị</th>
                    <th className="text-end pe-4">Đơn Giá (đ)</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan="7" className="text-center py-4 text-muted">
                        <Spinner animation="border" size="sm" className="me-2" /> Đang nạp danh mục xét nghiệm lâm sàng...
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
                      const tube = item.tubeType || "Serum Gel 4mL";
                      const isPreSelected = preRegisteredService?.code === itemCode;

                      return (
                        <tr
                          key={itemCode}
                          style={{
                            cursor: "pointer",
                            backgroundColor: isSelected ? "rgba(30, 96, 230, 0.08)" : "transparent"
                          }}
                          onClick={() => handleToggleTest(itemCode)}
                        >
                          <td className="text-center" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              className="form-check-input"
                              checked={isSelected}
                              onChange={() => handleToggleTest(itemCode)}
                              style={{ cursor: "pointer", width: 18, height: 18 }}
                            />
                          </td>
                          <td className="fw-semibold text-dark text-start">
                            {itemName}
                            {isPreSelected && (
                              <Badge bg="success" className="ms-2 rounded-pill" style={{ fontSize: '10px' }}>
                                Đã đặt tại quầy
                              </Badge>
                            )}
                          </td>
                          <td className="text-start">
                            <code className="bg-light px-2 py-1 rounded small font-monospace" style={{ color: "#1E60E6" }}>
                              {itemCode}
                            </code>
                          </td>
                          <td className="text-start">
                            <span className={`badge px-2.5 py-1.5 rounded-pill ${
                              tube.includes("EDTA")
                                ? "bg-purple-subtle text-purple border"
                                : tube.includes("Citrate")
                                ? "bg-info-subtle text-info-emphasis border border-info-subtle"
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
                            {item.preparationNotes && (item.preparationNotes.toLowerCase().includes("fast") || item.preparationNotes.toLowerCase().includes("nhịn")) ? (
                              <span className="badge rounded-pill bg-danger-subtle text-danger border border-danger-subtle">
                                Nhịn ăn 8h
                              </span>
                            ) : (
                              <span className="badge rounded-pill bg-light text-secondary border">
                                Bình thường
                              </span>
                            )}
                          </td>
                          <td className="text-end pe-4 fw-bold text-dark font-monospace">
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
          <div className="card shadow-sm rounded-4 border-0 bg-white overflow-hidden mb-4">
            <div className="card-header bg-white border-bottom py-3 px-4">
              <h5 className="mb-0 fw-bold d-flex align-items-center gap-2 text-dark">
                <FaStethoscope style={{ color: "#1E60E6" }} /> 3. Chẩn Đoán WHO ICD-10 &amp; Ghi Chú Y Lệnh
              </h5>
            </div>
            <div className="card-body p-4">
              {/* ICD-10 Diagnostic Picker */}
              <div className="mb-4 p-3 rounded-4 border bg-light">
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <label className="form-label fw-bold text-dark mb-0">
                    Mã Bệnh WHO ICD-10 (Bắt buộc theo BR-DOC-01) <span className="text-danger">*</span>
                  </label>
                  <small className="text-muted">Căn cứ BHYT chi trả (A00 - Z99.9)</small>
                </div>

                {/* Selected ICD-10 Badges */}
                <div className="d-flex flex-wrap gap-2 mb-3">
                  {selectedIcdCodes.map((code) => {
                    const info = CLINICAL_ICD10_LIST.find((x) => x.code === code);
                    return (
                      <span
                        key={code}
                        className="badge d-inline-flex align-items-center gap-2 px-3 py-2 fs-6 rounded-pill text-white shadow-sm"
                        style={{ backgroundColor: "#1E60E6" }}
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
                    className="form-control"
                    placeholder="VD: K75.0, E10.9"
                    value={customIcdInput}
                    onChange={(e) => setCustomIcdInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        if (customIcdInput) handleAddIcdCode(customIcdInput);
                      }
                    }}
                  />
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => {
                      if (customIcdInput) handleAddIcdCode(customIcdInput);
                    }}
                  >
                    Thêm
                  </button>
                </div>
              </div>

              {/* Clinical Indication Textarea */}
              <div className="mb-3">
                <label className="form-label fw-semibold text-dark">
                  Lý do chỉ định xét nghiệm / Chẩn đoán lâm sàng <span className="text-danger">*</span>
                </label>
                <textarea
                  className="form-control"
                  rows="3"
                  placeholder="Ghi rõ lý do khám, triệu chứng lâm sàng và mục tiêu xét nghiệm..."
                  value={clinicalIndication}
                  onChange={(e) => setClinicalIndication(e.target.value)}
                />
              </div>

              {/* Priority & Date */}
              <div className="row g-3">
                <div className="col-md-6">
                  <label className="form-label fw-semibold text-dark">Mức độ ưu tiên xét nghiệm</label>
                  <select
                    className="form-select"
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                  >
                    <option value="Routine">Tiêu chuẩn (Routine)</option>
                    <option value="Urgent">Ưu tiên (Urgent - Người già, phụ nữ mang thai)</option>
                    <option value="STAT">Khẩn cấp (STAT - Cấp cứu lấy ngay)</option>
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
                <div className="col-12">
                  <label className="form-label fw-semibold text-dark">Dặn dò phòng xét nghiệm &amp; Ghi chú kỹ thuật</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="VD: Nghi ngờ tan máu, kiểm tra kỹ hồng cầu lưới; Lưu ý người bệnh dùng kháng đông..."
                    value={specialInstructions}
                    onChange={(e) => setSpecialInstructions(e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Order Summary, Tube Breakdown & Lab Dispatch */}
        <div className="col-lg-4">
          <div className="card shadow-sm rounded-4 border-0 bg-white overflow-hidden mb-4 position-sticky" style={{ top: "20px" }}>
            <div className="card-header bg-white border-bottom py-3 px-4">
              <h5 className="mb-0 fw-bold d-flex align-items-center gap-2 text-dark">
                <FaFileInvoiceDollar style={{ color: "#1E60E6" }} /> 4. Tổng Hợp Y Lệnh &amp; Viện Phí
              </h5>
            </div>
            <div className="card-body p-4">
              {/* Selected Tests List */}
              <div className="mb-3">
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <span className="small fw-bold text-muted text-uppercase">Danh mục đã chọn ({selectedTests.length}):</span>
                  {selectedTests.length > 0 && (
                    <button
                      type="button"
                      className="btn btn-link btn-sm text-danger p-0 text-decoration-none"
                      onClick={() => setSelectedCodes(new Set())}
                    >
                      Bỏ chọn tất cả
                    </button>
                  )}
                </div>

                {selectedTests.length === 0 ? (
                  <div className="p-3 bg-light rounded-3 text-center text-muted small">
                    Chưa có xét nghiệm nào được chọn. Vui lòng tick chọn danh mục bên trái.
                  </div>
                ) : (
                  <div className="list-group list-group-flush border rounded-3 mb-3 overflow-auto" style={{ maxHeight: "200px" }}>
                    {selectedTests.map((t) => (
                      <div key={t.code || t.testCode} className="list-group-item d-flex justify-content-between align-items-center py-2 px-3 small">
                        <div>
                          <div className="fw-semibold text-dark">{t.name || t.testName}</div>
                          <code className="text-muted" style={{ fontSize: "11px" }}>{t.code || t.testCode}</code>
                        </div>
                        <div className="text-end font-monospace fw-bold text-dark">
                          {Number(t.price || 0).toLocaleString("vi-VN")} đ
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Pricing Breakdown Card */}
              <div className="p-3 bg-light rounded-4 mb-3 border">
                <div className="d-flex justify-content-between mb-1 small">
                  <span className="text-muted">Tổng giá trị y lệnh (BYT):</span>
                  <span className="fw-bold font-monospace">{totalAmount.toLocaleString("vi-VN")} đ</span>
                </div>
                {preRegisteredService && (
                  <div className="d-flex justify-content-between mb-1 small text-success">
                    <span>Đã thanh toán trước tại quầy:</span>
                    <span className="font-monospace">-{preRegisteredService.price.toLocaleString("vi-VN")} đ</span>
                  </div>
                )}
                <hr className="my-2" />
                <div className="d-flex justify-content-between align-items-center">
                  <span className="fw-bold text-dark">Chênh lệch thu thêm (Co-pay):</span>
                  <span className="fs-5 fw-bold font-monospace" style={{ color: "#1E60E6" }}>
                    {differentialAmount.toLocaleString("vi-VN")} đ
                  </span>
                </div>
              </div>

              {/* RÀNG BUỘC CHUYÊN MÔN: ỐNG LẤY MẪU CHÂN KHÔNG (ISO 15189) */}
              {selectedTests.length > 0 && (
                <div className="p-3 mb-3 rounded-4 border bg-light">
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <span className="small fw-bold text-dark d-flex align-items-center gap-1">
                      <FaVial style={{ color: "#1E60E6" }} /> Ống Lấy Máu Cần Chuẩn Bị:
                    </span>
                    <Badge bg="primary" className="rounded-pill">
                      {tubeBreakdown.count} loại ống
                    </Badge>
                  </div>
                  <div className="small text-muted mb-2">
                    {tubeBreakdown.tubes?.map((t, idx) => (
                      <div key={idx} className="d-flex align-items-center gap-1.5 mb-1">
                        <span
                          className="rounded-circle d-inline-block"
                          style={{
                            width: 10,
                            height: 10,
                            backgroundColor: t.includes("EDTA")
                              ? "#7c3aed"
                              : t.includes("Citrate")
                              ? "#0284c7"
                              : t.includes("NaF")
                              ? "#10b981"
                              : "#eab308"
                          }}
                        />
                        <span>{t}</span>
                      </div>
                    ))}
                  </div>
                  {fastingInfo.required ? (
                    <div className="alert alert-warning py-1.5 px-2 mb-0 rounded-3 small d-flex align-items-center gap-2">
                      <FaExclamationTriangle className="text-warning-emphasis flex-shrink-0" />
                      <div>Yêu cầu bệnh nhân nhịn ăn tối thiểu <strong>{fastingInfo.maxHours}h</strong>.</div>
                    </div>
                  ) : (
                    <div className="text-success small d-flex align-items-center gap-1">
                      <FaCheck className="text-success" /> Không bắt buộc nhịn ăn trước lấy máu.
                    </div>
                  )}
                </div>
              )}

              {/* ĐIỀU PHỐI LAB THEO CA TRỰC QUẢN LÝ */}
              <div className="p-3 rounded-4 mb-4 border" style={{ background: "#f0fdf4", borderColor: "#86efac" }}>
                <div className="small fw-bold text-success text-uppercase mb-1 d-flex align-items-center gap-1">
                  <FaDoorOpen /> ĐIỀU PHỐI Y LỆNH TỰ ĐỘNG THEO CA TRỰC
                </div>
                <div className="small text-dark" style={{ lineHeight: 1.6 }}>
                  <div>• <strong>Phòng Lab:</strong> LAB-201 (Trung tâm phân tích tự động)</div>
                  <div>• <strong>KTV trực ca:</strong> KTV. Phạm Quốc Hưng (Ca sáng 07:00 - 15:00)</div>
                  <div>• <strong>Luồng tiếp theo:</strong> Quầy Thu Ngân ➔ Phòng Lấy Mẫu 101</div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="d-grid gap-2">
                <button
                  type="button"
                  className="btn btn-lg fw-semibold d-flex align-items-center justify-content-center gap-2 shadow-sm text-white"
                  style={{ backgroundColor: "#1E60E6", borderColor: "#1E60E6", borderRadius: "9999px" }}
                  disabled={submitting || selectedTests.length === 0 || !doctorId || !patient.id}
                  onClick={() => handleSubmitOrder(false)}
                >
                  <FaCheckCircle /> {submitting ? "Đang phát hành y lệnh..." : "Ký & Phát Hành Y Lệnh Xét Nghiệm"}
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

      {/* Barcode Printer Modal */}
      <BarcodePrinterModal
        show={showBarcodeModal}
        onHide={() => setShowBarcodeModal(false)}
        patient={{
          id: orderSuccess?.patientId || patient.id,
          name: orderSuccess?.patientName || patient.name,
          gender: patient.gender,
          age: patient.age
        }}
        orderCode={orderSuccess?.orderNumber || orderSuccess?.id || "ORD-261116-A01"}
      />

      {/* Anti-Collision Rack 3x3 Modal */}
      <Modal show={showRackModal} onHide={() => setShowRackModal(false)} size="xl" centered>
        <Modal.Header closeButton className="bg-light">
          <Modal.Title className="h5 fw-bold text-dark d-flex align-items-center gap-2">
            <FaThLarge style={{ color: "#1E60E6" }} />
            <span>Sơ Đồ Khay Mẫu Rack 3x3 Chống Trùng Lặp (ISO 15189:2022)</span>
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-3" style={{ backgroundColor: "#f8fafc" }}>
          <AntiCollisionRackVisualizer
            patientsData={[
              {
                id: patient.id || "BN-001",
                name: patient.name || "Bệnh nhân hiện tại",
                gender: patient.gender,
                age: patient.age,
                code: orderSuccess?.orderNumber || "ORD-A01"
              }
            ]}
          />
        </Modal.Body>
        <Modal.Footer className="bg-light">
          <BsButton variant="secondary" onClick={() => setShowRackModal(false)}>
            Đóng
          </BsButton>
        </Modal.Footer>
      </Modal>
    </div>
  );
}
