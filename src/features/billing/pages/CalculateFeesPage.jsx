/**
 * @file CalculateFeesPage.jsx
 * @description Trình dự toán và tính phí xét nghiệm y tế tự động (UC53 / Calculate Fees).
 * Tự động chiết tính quyền lợi BHYT (80% - 100%), phụ phí điều dưỡng lấy mẫu tại nhà,
 * chính sách ưu tiên theo Luật Khám chữa bệnh 2023, và mã giảm giá/voucher theo chuẩn Bộ Y Tế.
 * 
 * Tuân thủ: Clean Medical UI (Rule 19), Nghị định 123/2020/NĐ-CP (Hóa đơn điện tử),
 * Quyết định 3618/QĐ-BHXH, Quyết định 2429/QĐ-BYT, ISO 15189:2022.
 */

import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Card,
  Row,
  Col,
  Button,
  Form,
  Badge,
  InputGroup,
  Spinner,
  Alert,
  Table
} from "react-bootstrap";
import {
  FaCalculator,
  FaFileInvoiceDollar,
  FaShieldAlt,
  FaHome,
  FaClinicMedical,
  FaTag,
  FaCheckCircle,
  FaExclamationCircle,
  FaPrint,
  FaArrowRight,
  FaRedo,
  FaUserCheck,
  FaReceipt,
  FaVial
} from "react-icons/fa";
import { calculateFee, validateVoucherCode } from "../api/feeCalculationApi";
import { medicalService } from "../../../services/medicalService";
import "./CalculateFeesPage.css";

export default function CalculateFeesPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Dynamic packages from Database
  const [packages, setPackages] = useState([]);
  const [loadingPackages, setLoadingPackages] = useState(true);

  // Form states
  const [selectedPackageCodes, setSelectedPackageCodes] = useState([]);
  const [serviceType, setServiceType] = useState("Clinic"); // Clinic | HomeCollection
  const [insuranceCard, setInsuranceCard] = useState("");
  const [voucherInput, setVoucherInput] = useState("");
  const [appliedVoucher, setAppliedVoucher] = useState(null);
  const [isPriority, setIsPriority] = useState(false);

  // Results state
  const [calculation, setCalculation] = useState(null);
  const [calculating, setCalculating] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // 1. Fetch dynamic packages from database on mount
  useEffect(() => {
    let isMounted = true;
    const fetchCatalog = async () => {
      setLoadingPackages(true);
      try {
        const res = await medicalService.getAllServices();
        if (res.success && Array.isArray(res.data) && res.data.length > 0) {
          if (isMounted) {
            setPackages(res.data);
            // Default selection: select first package if none selected yet
            const defaultCode = res.data[0].code || res.data[0].package_code || res.data[0].id;
            setSelectedPackageCodes([defaultCode]);
          }
        } else {
          // Fallback packages if DB catalog endpoint has different shape
          const fallback = [
            { id: "PKG-CBC-01", code: "CBC-01", name: "Tổng Phân Tích Tế Bào Máu Ngoại Vi (CBC 24 Thông Số)", category: "Huyết học", price: 180000, tube: "EDTA (Tím)" },
            { id: "PKG-BIOCHEM-01", code: "BIOCHEM-01", name: "Sinh Hóa Máu Cơ Bản (Glucose, AST/ALT, Ure, Creatinine)", category: "Sinh hóa", price: 250000, tube: "SST (Vàng)" },
            { id: "PKG-LIPID-01", code: "LIPID-01", name: "Bộ Mỡ Máu Toàn Phần (Cholesterol, Triglyceride, HDL, LDL)", category: "Sinh hóa", price: 200000, tube: "SST (Vàng)" },
            { id: "PKG-HEPATITIS-01", code: "HEPATITIS-01", name: "Tầm Soát Viêm Gan Siêu Vi B/C (HBsAg, Anti-HCV)", category: "Miễn dịch", price: 320000, tube: "Serum (Đỏ)" },
            { id: "PKG-COAGULATION-01", code: "COAGULATION-01", name: "Đông Máu Cơ Bản (PT, INR, aPTT, Fibrinogen)", category: "Huyết học", price: 220000, tube: "Citrate (Xanh dương)" }
          ];
          if (isMounted) {
            setPackages(fallback);
            setSelectedPackageCodes(["CBC-01"]);
          }
        }
      } catch (err) {
        console.warn("Failed to fetch service packages:", err);
      } finally {
        if (isMounted) setLoadingPackages(false);
      }
    };

    fetchCatalog();
    return () => { isMounted = false; };
  }, []);

  // 2. Initial query params parsing
  useEffect(() => {
    const pkgParam = searchParams.get("packages");
    if (pkgParam) {
      const list = pkgParam.split(",").map((s) => s.trim()).filter(Boolean);
      if (list.length > 0) setSelectedPackageCodes(list);
    }
    const serviceParam = searchParams.get("serviceType");
    if (serviceParam) {
      setServiceType(serviceParam.toLowerCase() === "homecollection" ? "HomeCollection" : "Clinic");
    }
    const bhytParam = searchParams.get("bhyt");
    if (bhytParam) setInsuranceCard(bhytParam);
    const voucherParam = searchParams.get("voucher");
    if (voucherParam) setVoucherInput(voucherParam);
  }, [searchParams]);

  // 3. Calculation engine call
  const performCalculation = async (voucherCodeToUse = appliedVoucher?.code || voucherInput) => {
    if (selectedPackageCodes.length === 0) {
      setCalculation(null);
      return;
    }

    setCalculating(true);
    setErrorMsg("");
    try {
      const payload = {
        packageIds: selectedPackageCodes,
        individualTestIds: [],
        serviceType,
        insuranceCardNumber: insuranceCard.trim(),
        voucherCode: voucherCodeToUse ? voucherCodeToUse.trim() : null,
        isPriorityPatient: isPriority
      };
      const result = await calculateFee(payload);
      setCalculation(result);
    } catch (err) {
      console.error("Fee calculation error:", err);
      setErrorMsg("Không thể tính phí: " + (err.response?.data?.message || err.message || "Vui lòng kiểm tra lại thông tin."));
    } finally {
      setCalculating(false);
    }
  };

  useEffect(() => {
    if (selectedPackageCodes.length > 0) {
      performCalculation();
    }
  }, [selectedPackageCodes, serviceType, insuranceCard, isPriority]);

  // Package toggle handler
  const handleTogglePackage = (code) => {
    setSelectedPackageCodes((prev) =>
      prev.includes(code)
        ? prev.length > 1
          ? prev.filter((p) => p !== code)
          : prev // keep at least 1 package selected
        : [...prev, code]
    );
  };

  // Voucher handler
  const handleApplyVoucher = async () => {
    if (!voucherInput.trim()) return;
    try {
      const vRes = await validateVoucherCode(voucherInput.trim(), calculation?.testSubTotal || 0, serviceType);
      if (vRes.isValid) {
        setAppliedVoucher({
          code: voucherInput.trim().toUpperCase(),
          discountAmount: vRes.discountAmount,
          description: vRes.description
        });
        performCalculation(voucherInput.trim().toUpperCase());
      } else {
        setErrorMsg(vRes.message || "Mã ưu đãi không hợp lệ.");
      }
    } catch (err) {
      setErrorMsg("Lỗi khi kiểm tra mã ưu đãi.");
    }
  };

  const handleClearVoucher = () => {
    setVoucherInput("");
    setAppliedVoucher(null);
    performCalculation("");
  };

  const handleReset = () => {
    if (packages.length > 0) {
      const first = packages[0].code || packages[0].package_code || packages[0].id;
      setSelectedPackageCodes([first]);
    }
    setServiceType("Clinic");
    setInsuranceCard("");
    setVoucherInput("");
    setAppliedVoucher(null);
    setIsPriority(false);
    setErrorMsg("");
  };

  const formatVnd = (num) => {
    return (num || 0).toLocaleString("vi-VN") + " ₫";
  };

  return (
    <div className="calc-fees-page py-4 px-3 bg-light min-vh-100">
      <div className="container-fluid" style={{ maxWidth: 1320 }}>
        {/* Top Header Card */}
        <Card className="shadow-sm border-0 rounded-3 mb-4">
          <Card.Body className="p-4 d-flex flex-wrap justify-content-between align-items-center gap-3">
            <div className="d-flex align-items-center gap-3">
              <div
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 12,
                  backgroundColor: "#eff6ff",
                  color: "#1E60E6",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 24
                }}
              >
                <FaCalculator />
              </div>
              <div>
                <div className="text-primary small fw-bold text-uppercase" style={{ letterSpacing: "0.5px" }}>
                  UC53 • TÍNH PHÍ XÉT NGHIỆM & DỰ TOÁN BHYT TỰ ĐỘNG
                </div>
                <h2 className="h4 fw-bold text-dark mb-1">
                  Dự Toán & Tính Phí Xét Nghiệm Y Tế
                </h2>
                <div className="text-muted small">
                  Tự động chiết tính quyền lợi BHYT (80% - 100%), phụ phí điều dưỡng lấy mẫu tại nhà và mã giảm giá chuẩn Bộ Y Tế.
                </div>
              </div>
            </div>

            <div className="d-flex gap-2">
              <Button
                variant="outline-secondary"
                size="sm"
                onClick={handleReset}
                className="d-flex align-items-center gap-1 px-3 py-2 fw-semibold"
              >
                <FaRedo /> Làm mới
              </Button>
              <Button
                variant="outline-primary"
                size="sm"
                onClick={() => window.print()}
                className="d-flex align-items-center gap-1 px-3 py-2 fw-semibold"
              >
                <FaPrint /> In Dự Toán
              </Button>
            </div>
          </Card.Body>
        </Card>

        {errorMsg && (
          <Alert variant="danger" dismissible onClose={() => setErrorMsg("")} className="d-flex align-items-center gap-2 shadow-sm mb-4">
            <FaExclamationCircle className="fs-5 flex-shrink-0" />
            <span>{errorMsg}</span>
          </Alert>
        )}

        {/* Main 2-Column Grid */}
        <Row className="g-4">
          {/* Left Column: Selection Controls */}
          <Col xs={12} lg={7}>
            {/* 1. Package Catalog Selection */}
            <Card className="shadow-sm border-0 rounded-3 mb-4">
              <Card.Header className="bg-white border-bottom py-3">
                <div className="d-flex align-items-center gap-2">
                  <Badge bg="primary" pill style={{ width: 24, height: 24, display: "flex", alignItems: "center", justifyContent: "center" }}>1</Badge>
                  <h5 className="mb-0 fw-bold text-dark" style={{ fontSize: "1.05rem" }}>
                    Chọn Danh Mục Gói Xét Nghiệm
                  </h5>
                </div>
                <p className="text-muted small mb-0 mt-1">
                  Đánh dấu chọn các gói xét nghiệm theo chỉ định của bác sĩ để hệ thống tính giá chuẩn từ cơ sở dữ liệu.
                </p>
              </Card.Header>
              <Card.Body className="p-3">
                {loadingPackages ? (
                  <div className="text-center py-4 text-muted">
                    <Spinner animation="border" size="sm" variant="primary" className="me-2" />
                    Đang tải danh mục gói xét nghiệm từ CSDL...
                  </div>
                ) : (
                  <div className="d-flex flex-column gap-2">
                    {packages.map((pkg) => {
                      const code = pkg.code || pkg.package_code || pkg.Code || pkg.id;
                      const name = pkg.name || pkg.package_name || pkg.Name || "Gói xét nghiệm";
                      const price = pkg.price || pkg.Price || 0;
                      const tube = pkg.tube || pkg.sample_tube || "Chuẩn ISO 15189";
                      const category = pkg.category || "Xét nghiệm tổng quát";
                      const checked = selectedPackageCodes.includes(code);

                      return (
                        <div
                          key={code}
                          onClick={() => handleTogglePackage(code)}
                          style={{
                            border: checked ? "2px solid #1E60E6" : "1px solid #e2e8f0",
                            backgroundColor: checked ? "#eff6ff" : "#ffffff",
                            borderRadius: 10,
                            padding: "14px 16px",
                            cursor: "pointer",
                            transition: "all 0.15s ease-in-out"
                          }}
                          className="d-flex align-items-start gap-3"
                        >
                          <Form.Check
                            type="checkbox"
                            checked={checked}
                            onChange={() => {}}
                            style={{ marginTop: 2, cursor: "pointer" }}
                          />
                          <div className="flex-grow-1">
                            <div className="d-flex justify-content-between align-items-center gap-2">
                              <span className="fw-bold text-dark" style={{ fontSize: "0.95rem" }}>
                                {name}
                              </span>
                              <span className="fw-bold text-primary text-nowrap" style={{ fontSize: "1rem" }}>
                                {formatVnd(price)}
                              </span>
                            </div>
                            <div className="d-flex flex-wrap align-items-center gap-2 mt-1 small text-muted">
                              <Badge bg="light" text="dark" className="border">
                                Mã: {code}
                              </Badge>
                              <span>•</span>
                              <span>Chuyên khoa: {category}</span>
                              <span>•</span>
                              <Badge bg="info" text="white">
                                <FaVial className="me-1" />
                                Ống: {tube}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </Card.Body>
            </Card>

            {/* 2. Service Reception Location */}
            <Card className="shadow-sm border-0 rounded-3 mb-4">
              <Card.Header className="bg-white border-bottom py-3">
                <div className="d-flex align-items-center gap-2">
                  <Badge bg="primary" pill style={{ width: 24, height: 24, display: "flex", alignItems: "center", justifyContent: "center" }}>2</Badge>
                  <h5 className="mb-0 fw-bold text-dark" style={{ fontSize: "1.05rem" }}>
                    Hình Thức Tiếp Nhận Bệnh Phẩm
                  </h5>
                </div>
                <p className="text-muted small mb-0 mt-1">
                  Lựa chọn địa điểm thực hiện kỹ thuật lấy mẫu máu và xét nghiệm theo nhu cầu người bệnh.
                </p>
              </Card.Header>
              <Card.Body className="p-3">
                <Row className="g-3">
                  <Col xs={12} sm={6}>
                    <div
                      onClick={() => setServiceType("Clinic")}
                      style={{
                        border: serviceType === "Clinic" ? "2px solid #1E60E6" : "1px solid #e2e8f0",
                        backgroundColor: serviceType === "Clinic" ? "#eff6ff" : "#ffffff",
                        borderRadius: 10,
                        padding: 16,
                        cursor: "pointer",
                        height: "100%",
                        transition: "all 0.15s ease"
                      }}
                    >
                      <div className="d-flex align-items-center gap-3">
                        <div
                          style={{
                            width: 40,
                            height: 40,
                            borderRadius: 8,
                            backgroundColor: serviceType === "Clinic" ? "#1E60E6" : "#f1f5f9",
                            color: serviceType === "Clinic" ? "#ffffff" : "#64748b",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: 18
                          }}
                        >
                          <FaClinicMedical />
                        </div>
                        <div>
                          <div className="fw-bold text-dark">Tại Phòng Khám</div>
                          <Badge bg="success" className="mt-1">
                            Miễn phí dịch vụ
                          </Badge>
                        </div>
                      </div>
                      <p className="text-muted small mt-2 mb-0">
                        Lấy mẫu trực tiếp tại Phòng Lấy Mẫu 101 BMS. Không phát sinh chi phí điều phối nhân sự.
                      </p>
                    </div>
                  </Col>

                  <Col xs={12} sm={6}>
                    <div
                      onClick={() => setServiceType("HomeCollection")}
                      style={{
                        border: serviceType === "HomeCollection" ? "2px solid #1E60E6" : "1px solid #e2e8f0",
                        backgroundColor: serviceType === "HomeCollection" ? "#eff6ff" : "#ffffff",
                        borderRadius: 10,
                        padding: 16,
                        cursor: "pointer",
                        height: "100%",
                        transition: "all 0.15s ease"
                      }}
                    >
                      <div className="d-flex align-items-center gap-3">
                        <div
                          style={{
                            width: 40,
                            height: 40,
                            borderRadius: 8,
                            backgroundColor: serviceType === "HomeCollection" ? "#1E60E6" : "#f1f5f9",
                            color: serviceType === "HomeCollection" ? "#ffffff" : "#64748b",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: 18
                          }}
                        >
                          <FaHome />
                        </div>
                        <div>
                          <div className="fw-bold text-dark">Lấy Mẫu Tận Nơi</div>
                          <Badge bg="warning" text="dark" className="mt-1 fw-bold">
                            +150.000 ₫ phụ phí
                          </Badge>
                        </div>
                      </div>
                      <p className="text-muted small mt-2 mb-0">
                        Điều dưỡng đến tận nhà người bệnh, bảo quản bệnh phẩm chuẩn chuỗi lạnh ISO 15189:2022.
                      </p>
                    </div>
                  </Col>
                </Row>
              </Card.Body>
            </Card>

            {/* 3. BHYT & Priority Policy */}
            <Card className="shadow-sm border-0 rounded-3 mb-4">
              <Card.Header className="bg-white border-bottom py-3">
                <div className="d-flex align-items-center gap-2">
                  <Badge bg="primary" pill style={{ width: 24, height: 24, display: "flex", alignItems: "center", justifyContent: "center" }}>3</Badge>
                  <h5 className="mb-0 fw-bold text-dark" style={{ fontSize: "1.05rem" }}>
                    Bảo Hiểm Y Tế & Chế Độ Ưu Tiên
                  </h5>
                </div>
              </Card.Header>
              <Card.Body className="p-3">
                <Form.Group className="mb-3">
                  <Form.Label className="small text-muted fw-bold text-uppercase">
                    Mã Thẻ BHYT (15 Ký tự chuẩn Bảo Hiểm Xã Hội Việt Nam)
                  </Form.Label>
                  <InputGroup>
                    <InputGroup.Text className="bg-light text-muted">
                      <FaShieldAlt />
                    </InputGroup.Text>
                    <Form.Control
                      type="text"
                      placeholder="Ví dụ: DN4791234567890 hoặc TE1012345678901..."
                      value={insuranceCard}
                      onChange={(e) => setInsuranceCard(e.target.value.toUpperCase())}
                      className="font-monospace text-uppercase"
                    />
                  </InputGroup>
                  <div className="d-flex flex-wrap align-items-center gap-2 mt-2">
                    <span className="text-muted small">Thử nhanh mã chuẩn:</span>
                    <Badge
                      bg="light"
                      text="primary"
                      className="border cursor-pointer"
                      style={{ cursor: "pointer" }}
                      onClick={() => setInsuranceCard("TE1012345678901")}
                    >
                      TE (Trẻ em &lt;6t: 100%)
                    </Badge>
                    <Badge
                      bg="light"
                      text="primary"
                      className="border cursor-pointer"
                      style={{ cursor: "pointer" }}
                      onClick={() => setInsuranceCard("DN4791234567890")}
                    >
                      DN (Người lao động: 80%)
                    </Badge>
                    <Badge
                      bg="light"
                      text="primary"
                      className="border cursor-pointer"
                      style={{ cursor: "pointer" }}
                      onClick={() => setInsuranceCard("CN3012345678901")}
                    >
                      CN (Hộ cận nghèo: 95%)
                    </Badge>
                  </div>
                </Form.Group>

                <div className="p-3 bg-light rounded-3 border">
                  <Form.Check
                    type="checkbox"
                    id="priorityCheck"
                    checked={isPriority}
                    onChange={(e) => setIsPriority(e.target.checked)}
                    label={
                      <div>
                        <span className="fw-bold text-dark">Đối tượng ưu tiên theo Luật Khám chữa bệnh 2023</span>
                        <div className="text-muted small mt-0.5">
                          Người cao tuổi ≥ 80 tuổi, Trẻ em dưới 6 tuổi, Người khuyết tật đặc biệt nặng (Giảm thêm 5% viện phí).
                        </div>
                      </div>
                    }
                  />
                </div>
              </Card.Body>
            </Card>

            {/* 4. Voucher Code */}
            <Card className="shadow-sm border-0 rounded-3 mb-4">
              <Card.Header className="bg-white border-bottom py-3">
                <div className="d-flex align-items-center gap-2">
                  <Badge bg="primary" pill style={{ width: 24, height: 24, display: "flex", alignItems: "center", justifyContent: "center" }}>4</Badge>
                  <h5 className="mb-0 fw-bold text-dark" style={{ fontSize: "1.05rem" }}>
                    Mã Giảm Giá & Phiếu Quà Tặng (Voucher)
                  </h5>
                </div>
              </Card.Header>
              <Card.Body className="p-3">
                <div className="d-flex gap-2 mb-2">
                  <InputGroup>
                    <InputGroup.Text className="bg-light text-muted">
                      <FaTag />
                    </InputGroup.Text>
                    <Form.Control
                      type="text"
                      placeholder="Nhập mã khuyến mãi (BMS10, FREEHOME, VIP50...)"
                      value={voucherInput}
                      onChange={(e) => setVoucherInput(e.target.value.toUpperCase())}
                      className="font-monospace text-uppercase"
                    />
                  </InputGroup>
                  <Button variant="primary" onClick={handleApplyVoucher} className="px-4 fw-bold">
                    Áp Dụng
                  </Button>
                </div>

                {appliedVoucher && (
                  <Alert variant="success" className="d-flex justify-content-between align-items-center py-2 px-3 mb-2 rounded-3 small">
                    <div className="d-flex align-items-center gap-2">
                      <FaCheckCircle className="text-success" />
                      <span>
                        Mã <strong>{appliedVoucher.code}</strong>: {appliedVoucher.description} (-{formatVnd(appliedVoucher.discountAmount)})
                      </span>
                    </div>
                    <Button variant="link" size="sm" onClick={handleClearVoucher} className="text-danger p-0 fw-bold text-decoration-none">
                      Hủy áp dụng
                    </Button>
                  </Alert>
                )}

                <div className="d-flex flex-wrap align-items-center gap-2 mt-2">
                  <span className="text-muted small">Mã gợi ý:</span>
                  <Badge
                    bg="light"
                    text="primary"
                    className="border cursor-pointer"
                    style={{ cursor: "pointer" }}
                    onClick={() => setVoucherInput("BMS10")}
                  >
                    BMS10 (Giảm 10%)
                  </Badge>
                  <Badge
                    bg="light"
                    text="primary"
                    className="border cursor-pointer"
                    style={{ cursor: "pointer" }}
                    onClick={() => setVoucherInput("FREEHOME")}
                  >
                    FREEHOME (Miễn ship tận nơi)
                  </Badge>
                  <Badge
                    bg="light"
                    text="primary"
                    className="border cursor-pointer"
                    style={{ cursor: "pointer" }}
                    onClick={() => setVoucherInput("VIP50")}
                  >
                    VIP50 (-50.000 ₫)
                  </Badge>
                </div>
              </Card.Body>
            </Card>
          </Col>

          {/* Right Column: Cost Breakdown & Grand Total */}
          <Col xs={12} lg={5}>
            <Card className="shadow-sm border-0 rounded-3 sticky-top" style={{ top: 20 }}>
              <Card.Header className="bg-white border-bottom py-3 d-flex justify-content-between align-items-center">
                <div className="d-flex align-items-center gap-2">
                  <FaFileInvoiceDollar className="text-primary fs-4" />
                  <h5 className="mb-0 fw-bold text-dark" style={{ fontSize: "1.1rem" }}>
                    Bảng Dự Toán Chi Phí
                  </h5>
                </div>
                <Badge bg="light" text="dark" className="border font-monospace">
                  {calculation?.calculationReference || "CALC-READY"}
                </Badge>
              </Card.Header>

              <Card.Body className="p-4">
                {calculating ? (
                  <div className="text-center py-5 text-muted">
                    <Spinner animation="border" variant="primary" className="mb-2" />
                    <div>Đang tính toán chiết giảm viện phí...</div>
                  </div>
                ) : (
                  <>
                    {/* Itemized Line Items */}
                    <div className="mb-3">
                      <div className="text-muted small fw-bold text-uppercase mb-2">
                        Chi Tiết Danh Mục Đã Chọn ({calculation?.items?.length || selectedPackageCodes.length})
                      </div>

                      <div className="border rounded-3 p-2 bg-light mb-3" style={{ maxHeight: 220, overflowY: "auto" }}>
                        {calculation?.items && calculation.items.length > 0 ? (
                          calculation.items.map((item, idx) => (
                            <div key={idx} className="py-2 border-bottom last-border-0 small">
                              <div className="d-flex justify-content-between fw-bold text-dark">
                                <span className="text-truncate pe-2">{item.itemName}</span>
                                <span className="text-nowrap">{formatVnd(item.totalPrice)}</span>
                              </div>
                              {item.bhytCoveredAmount > 0 && (
                                <div className="d-flex justify-content-between text-success mt-1">
                                  <span>BHYT thanh toán ({calculation.insuranceCoveragePercent}%):</span>
                                  <span>-{formatVnd(item.bhytCoveredAmount)}</span>
                                </div>
                              )}
                            </div>
                          ))
                        ) : (
                          <div className="text-center py-3 text-muted small">
                            Chưa chọn gói xét nghiệm nào.
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Cost Calculation Summary */}
                    <div className="p-3 bg-light rounded-3 border mb-3 small">
                      <div className="d-flex justify-content-between py-1 text-muted">
                        <span>Tổng phí xét nghiệm:</span>
                        <strong className="text-dark">{formatVnd(calculation?.testSubTotal)}</strong>
                      </div>

                      <div className="d-flex justify-content-between py-1 text-muted">
                        <span>Phụ phí lấy mẫu ({serviceType === "HomeCollection" ? "Tận nơi" : "Tại viện"}):</span>
                        <strong className="text-dark">{formatVnd(calculation?.homeCollectionSurcharge)}</strong>
                      </div>

                      {calculation?.hasInsurance && (
                        <div className="d-flex justify-content-between py-1 text-success fw-bold border-top pt-2 mt-1">
                          <span className="d-flex align-items-center gap-1">
                            <FaShieldAlt />
                            BHYT chi trả ({calculation.insuranceCoveragePercent}%):
                          </span>
                          <span>-{formatVnd(calculation.insuranceDeduction)}</span>
                        </div>
                      )}

                      {calculation?.voucherDiscount > 0 && (
                        <div className="d-flex justify-content-between py-1 text-primary fw-bold">
                          <span className="d-flex align-items-center gap-1">
                            <FaTag />
                            Ưu đãi Voucher ({calculation.voucherCode}):
                          </span>
                          <span>-{formatVnd(calculation.voucherDiscount)}</span>
                        </div>
                      )}

                      {calculation?.priorityDiscount > 0 && (
                        <div className="d-flex justify-content-between py-1 text-indigo fw-bold">
                          <span className="d-flex align-items-center gap-1">
                            <FaUserCheck />
                            Ưu đãi đối tượng ưu tiên:
                          </span>
                          <span>-{formatVnd(calculation.priorityDiscount)}</span>
                        </div>
                      )}
                    </div>

                    {/* Grand Total Card */}
                    <div
                      style={{
                        background: "linear-gradient(135deg, #1e3a8a 0%, #1e1b4b 100%)",
                        borderRadius: 12,
                        padding: 20,
                        color: "#ffffff",
                        marginBottom: 20
                      }}
                      className="text-center"
                    >
                      <div className="d-flex justify-content-between align-items-center text-white-50 small mb-1">
                        <span className="text-uppercase fw-bold" style={{ letterSpacing: "1px" }}>TỔNG TIỀN PHẢI THANH TOÁN</span>
                        <Badge bg="primary" className="font-monospace">VND</Badge>
                      </div>

                      <div style={{ fontSize: 32, fontWeight: 800, color: "#ffffff", margin: "8px 0" }}>
                        {formatVnd(calculation?.netTotalPayable)}
                      </div>

                      <div className="pt-2 border-top border-white border-opacity-25 small text-white-50">
                        Bằng chữ: <strong className="text-white">{calculation?.totalInWords || "Không đồng chẵn"}</strong>
                      </div>
                    </div>

                    {/* Direct Actions */}
                    <div className="d-grid gap-2">
                      <Button
                        variant="primary"
                        size="lg"
                        onClick={() => navigate("/invoices")}
                        className="py-3 fw-bold rounded-pill shadow-sm d-flex align-items-center justify-content-center gap-2"
                        style={{ backgroundColor: "#1E60E6", borderColor: "#1E60E6" }}
                      >
                        <FaReceipt />
                        <span>Quầy Thu Viện Phí & Hóa Đơn VAT</span>
                        <FaArrowRight className="small" />
                      </Button>
                    </div>

                    <div className="text-center text-muted small mt-3" style={{ fontSize: "11px" }}>
                      Áp dụng quy chuẩn hoá đơn điện tử Nghị định 123/2020/NĐ-CP & Luật BHYT Việt Nam.
                    </div>
                  </>
                )}
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </div>
    </div>
  );
}
