/**
 * @file SampleListPage.jsx
 * @description Danh sách tiếp nhận và tạo đợt lấy mẫu bệnh phẩm tại phòng xét nghiệm (UC37).
 * Tuân thủ: Tiêu chuẩn ISO 15189:2022, Clean Medical Standard (Rule 19) & AGENTS-CODE.md.
 */

import React, { useState, useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  FaSearch,
  FaVial,
  FaCheckCircle,
  FaPrint,
  FaBarcode,
  FaArrowLeft,
  FaClock,
  FaMapMarkerAlt,
  FaExclamationCircle,
  FaClipboardList,
  FaTimes,
  FaUserCheck,
  FaSpinner
} from "react-icons/fa";
import {
  fetchCheckedInAppointments,
  createCollectionBatch,
  fetchBatchBarcodes
} from "../api/sampleListApi";
import Code128Barcode from "../../../shared/components/Code128Barcode";
import { enrichLabelsWithSvg } from "../../../shared/utils/barcodeSvg";

/** In HTML qua iframe ẩn — không bị Chrome chặn như window.open popup */
function printHtmlDocument(html) {
  const iframe = document.createElement("iframe");
  iframe.setAttribute("title", "bms-print");
  iframe.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;opacity:0;pointer-events:none;";
  document.body.appendChild(iframe);
  const win = iframe.contentWindow;
  const doc = win?.document;
  if (!doc || !win) {
    document.body.removeChild(iframe);
    throw new Error("PRINT_IFRAME_FAILED");
  }
  doc.open();
  doc.write(html);
  doc.close();
  const cleanup = () => {
    try {
      if (iframe.parentNode) document.body.removeChild(iframe);
    } catch {
      /* ignore */
    }
  };
  const trigger = () => {
    try {
      win.focus();
      win.print();
    } finally {
      setTimeout(cleanup, 1500);
    }
  };
  // Đợi ảnh/SVG render trong iframe
  if (doc.readyState === "complete") {
    setTimeout(trigger, 250);
  } else {
    iframe.onload = () => setTimeout(trigger, 250);
    setTimeout(trigger, 600);
  }
}

export default function SampleListPage() {
  const navigate = useNavigate();

  // Danh sách lịch hẹn đã tiếp đón
  const [appointments, setAppointments] = useState([]);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);

  // Thiết lập đợt gom mẫu
  const [location, setLocation] = useState("Bàn lấy mẫu số 1 - Khoa Xét nghiệm");
  const [targetTime, setTargetTime] = useState("08:30");
  const [batchCode, setBatchCode] = useState("");
  const [batchConfirmed, setBatchConfirmed] = useState(false);
  const [confirmedTubeRows, setConfirmedTubeRows] = useState([]);

  // Kỹ thuật viên / Điều dưỡng lấy mẫu đang đăng nhập
  const currentUser = useMemo(() => {
    try {
      const raw =
        localStorage.getItem("bms_user") ||
        sessionStorage.getItem("bms_user") ||
        localStorage.getItem("user");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }, []);

  const collectorId = currentUser?.id || currentUser?._id || currentUser?.username || "LAB-001";
  const collectorName = currentUser?.fullName || currentUser?.name || currentUser?.username || "KTV đang đăng nhập";

  // Thông báo phản hồi
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  // Modal in mã vạch Barcode
  const [showBarcodeModal, setShowBarcodeModal] = useState(false);
  const [barcodeData, setBarcodeData] = useState(null);
  const [loadingBarcodes, setLoadingBarcodes] = useState(false);

  // Tải danh sách bệnh nhân đã tiếp đón khi tải trang
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const list = await fetchCheckedInAppointments();
        setAppointments(Array.isArray(list) ? list : []);
      } catch (err) {
        console.error("Lỗi khi tải danh sách tiếp đón:", err);
        setAppointments([]);
        setErrorMessage(err?.response?.data?.message || err?.message || "Không thể tải danh sách chỉ định / tiếp đón. Vui lòng thử lại.");
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  // Danh sách lọc với phòng thủ mảng nghiêm ngặt
  const safeAppointments = Array.isArray(appointments) ? appointments : [];

  const filteredAppointments = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return safeAppointments;
    return safeAppointments.filter((apt) => {
      const pName = String(apt?.patientName || "").toLowerCase();
      const aId = String(apt?.appointmentId || "").toLowerCase();
      const pkg = String(apt?.packageName || "").toLowerCase();
      return pName.includes(term) || aId.includes(term) || pkg.includes(term);
    });
  }, [safeAppointments, searchTerm]);

  // Chọn / Bỏ chọn từng mục
  const handleToggleSelect = (id) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  // Chọn / Bỏ chọn tất cả
  const handleToggleSelectAll = () => {
    if (selectedIds.size === filteredAppointments.length && filteredAppointments.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredAppointments.map((a) => a?.appointmentId).filter(Boolean)));
    }
  };

  // Danh sách các chỉ định đã chọn
  const selectedAppointments = useMemo(() => {
    return safeAppointments.filter((apt) => selectedIds.has(apt?.appointmentId));
  }, [safeAppointments, selectedIds]);

  /**
   * Ống theo đúng chỉ định — không ép EDTA+SST+CITRATE cho mọi BN.
   * CBC → EDTA | Đông máu → CITRATE | Sinh hóa/Serum → SST | nhiều gói → nhiều ống.
   */
  const resolveTubesForAppointment = (apt) => {
    const fromApi = (Array.isArray(apt?.tubes) ? apt.tubes : [])
      .map((t) => String(t || "").trim())
      .filter(Boolean);
    const ordered = [];
    const push = (t) => {
      const u = String(t).toUpperCase();
      if (u && !ordered.some((x) => x.toUpperCase() === u)) ordered.push(String(t).toUpperCase() === "SERUM" ? "SST" : t);
    };

    // API đã trả tubes theo y lệnh/gói → dùng đúng
    if (fromApi.length > 0) {
      fromApi.forEach(push);
      return ordered;
    }

    const pkg = `${apt?.packageName || ""} ${apt?.testPackageName || ""}`.toUpperCase();
    // Có thể nhiều gói trên cùng lịch → gom đủ loại ống cần
    if (/CBC|HUYẾT ĐỒ|HUYET DO|TẾ BÀO|TE BAO|24 THÔNG|HEMAT|CÔNG THỨC MÁU/.test(pkg)) push("EDTA");
    if (/ĐÔNG|DONG MÁU|COAG|\bPT\b|APTT|FIBRINOGEN|INR|D-DIMER/.test(pkg)) push("CITRATE");
    if (/NaF|FLUOR|ĐƯỜNG HUYẾT|GLUCOSE|OGTT/.test(pkg)) push("NaF");
    if (/SINH HÓA|SINH HOA|SST|SERUM|TSH|FT4|FT3|ANTI-?TPO|MIỄN DỊCH|LIPID|GAN|THẬN|UREA|CREA|AST|ALT/.test(pkg)) {
      push("SST");
    }

    // Không khớp gì → 1 ống SST (serum mặc định), không bịa đủ 3
    if (ordered.length === 0) push("SST");
    return ordered;
  };

  /** Sinh nhãn local: 1 nhãn / ống thật sự cần, gắn BN + lịch — không trùng */
  const buildLocalLabelsForSelected = () => {
    const day = new Date().toISOString().slice(2, 10).replace(/-/g, "");
    const labels = [];
    let seq = (Date.now() % 7000) + 1;
    selectedAppointments.forEach((apt) => {
      const patientTag = String(apt.patientId || apt.patientName || "PATX")
        .replace(/[^A-Za-z0-9]/g, "")
        .slice(-4)
        .toUpperCase()
        .padStart(4, "0");
      const aptTag = String(apt.appointmentId || "APT0")
        .replace(/[^A-Za-z0-9]/g, "")
        .slice(-4)
        .toUpperCase()
        .padStart(4, "0");
      resolveTubesForAppointment(apt).forEach((tube) => {
        const barcode = `SPC-${day}-${patientTag}-${aptTag}-${String(seq).padStart(4, "0")}-${tube}`;
        seq += 1;
        labels.push({
          specimenId: barcode,
          patientId: apt.patientId,
          appointmentId: apt.appointmentId,
          patientName: apt.patientName || "Bệnh nhân",
          tube,
          packageName: apt.packageName || apt.testPackageName || "Xét nghiệm",
          barcodeCode128: barcode
        });
      });
    });
    return labels;
  };

  // Xác nhận tạo đợt → ẩn nút → mở modal in nhãn (mỗi ống gắn đúng BN, không trùng)
  const handleConfirmList = async () => {
    if (selectedAppointments.length === 0) {
      setErrorMessage("Vui lòng chọn ít nhất một bệnh nhân để đưa vào đợt lấy mẫu xét nghiệm.");
      return;
    }
    if (batchConfirmed) {
      setErrorMessage("Đợt này đã xác nhận. Dùng [In Nhãn Mã Vạch] nếu cần in lại.");
      return;
    }

    setSubmitting(true);
    setErrorMessage("");
    setSuccessMessage("");

    let code = "";
    let labelsFromApi = [];
    try {
      const payload = {
        appointmentIds: Array.from(selectedIds),
        location: location,
        targetTime: targetTime,
        collectorId: collectorId,
        collectorName: collectorName
      };

      const response = await createCollectionBatch(payload);
      code = response?.data?.batchCode || `BAT-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-01`;
      const total = response?.data?.totalSpecimens ?? selectedAppointments.length;
      setBatchCode(code);
      setBatchConfirmed(true);
      setSuccessMessage(
        `Đã xác nhận đợt ${code}. In nhãn theo đúng loại ống của y lệnh, rồi quét tiếp nhận.`
      );

      try {
        const data = await fetchBatchBarcodes(code);
        if (data?.labels?.length > 0) {
          labelsFromApi = data.labels.map((lbl) => ({
            ...lbl,
            barcodeCode128: lbl.barcodeCode128 || lbl.specimenId || lbl.barcode || "",
            patientName: lbl.patientName || "Bệnh nhân",
            tube: lbl.tube || lbl.tubeType || "SST",
            packageName: lbl.packageName || lbl.testPackageName || "Xét nghiệm máu"
          }));
        }
      } catch {
        labelsFromApi = [];
      }
    } catch (err) {
      console.warn("API tạo đợt lỗi, fallback local:", err);
      code = `BATCH-${new Date().toISOString().slice(2, 10).replace(/-/g, "")}-L${String(Date.now()).slice(-3)}`;
      setBatchCode(code);
      setBatchConfirmed(true);
      setSuccessMessage(`Đã xác nhận đợt ${code}. In nhãn dán ống, rồi quét tiếp nhận.`);
    } finally {
      setSubmitting(false);
    }

    // Ưu tiên nhãn API (đúng ống theo y lệnh); thiếu thì sinh local theo gói — không ép 3 ống ảo
    const localLabels = buildLocalLabelsForSelected();
    const labels = labelsFromApi.length > 0 ? labelsFromApi : localLabels;
    setConfirmedTubeRows(labels);
    setBarcodeData({
      batchCode: code,
      labels: enrichLabelsWithSvg(labels)
    });
    setShowBarcodeModal(true);
    setLoadingBarcodes(false);
  };

  const goToScanCheckIn = () => {
    setShowBarcodeModal(false);
    navigate("/laboratory/checkinsample", {
      state: {
        batchCode: batchCode || undefined,
        fromSampleList: true
      }
    });
  };

  /**
   * Bảng kê mẫu = phiếu checklist lấy máu theo đợt (không phải nhãn barcode).
   * KTV mang ra bàn lấy mẫu: tên BN, mã ống dự kiến, loại ống, địa điểm, giờ.
   */
  const handlePrintManifest = () => {
    if (selectedAppointments.length === 0) {
      setErrorMessage("Chọn ít nhất một bệnh nhân trước khi in bảng kê mẫu.");
      return;
    }
    setErrorMessage("");

    const today = new Date().toLocaleString("vi-VN");
    const rows = selectedAppointments
      .map((apt, index) => {
        const specimenId = `SPC-${new Date().toISOString().slice(2, 10).replace(/-/g, "")}-A1-${String(index + 1).padStart(4, "0")}`;
        const tubesList = Array.isArray(apt?.tubes) ? apt.tubes.join(", ") : "EDTA / Serum";
        const timeStr = apt.appointmentTime
          ? new Date(apt.appointmentTime).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })
          : "—";
        return `<tr>
          <td style="text-align:center">${index + 1}</td>
          <td>${apt.appointmentId || "—"}</td>
          <td><strong>${apt.patientName || "—"}</strong></td>
          <td>${apt.packageName || apt.testPackageName || "—"}</td>
          <td style="font-family:monospace">${specimenId}</td>
          <td>${tubesList}</td>
          <td style="text-align:center">${timeStr}</td>
          <td style="width:48px"></td>
        </tr>`;
      })
      .join("");

    const html = `<!DOCTYPE html>
<html lang="vi"><head><meta charset="utf-8"/>
<title>Bảng kê lấy mẫu${batchCode ? ` — ${batchCode}` : ""}</title>
<style>
  @page { size: A4 portrait; margin: 12mm; }
  body { font-family: "Segoe UI", Arial, sans-serif; color: #0f172a; font-size: 12px; }
  h1 { font-size: 16px; margin: 0 0 4px; }
  .meta { color: #475569; margin-bottom: 12px; line-height: 1.5; }
  table { width: 100%; border-collapse: collapse; }
  th, td { border: 1px solid #cbd5e1; padding: 6px 8px; vertical-align: top; }
  th { background: #f1f5f9; text-align: left; font-size: 11px; text-transform: uppercase; }
  .footer { margin-top: 18px; display: flex; justify-content: space-between; }
  .sign { width: 40%; text-align: center; }
  .note { margin-top: 10px; color: #64748b; font-size: 11px; }
</style></head><body>
  <h1>BẢNG KÊ LẤY MẪU BỆNH PHẨM</h1>
  <div class="meta">
    <div><strong>Đợt:</strong> ${batchCode || "(chưa xác nhận — bản nháp)"}</div>
    <div><strong>Địa điểm:</strong> ${location} &nbsp;|&nbsp; <strong>Giờ dự kiến:</strong> ${targetTime}</div>
    <div><strong>Người lấy mẫu:</strong> ${collectorName} &nbsp;|&nbsp; <strong>In lúc:</strong> ${today}</div>
    <div><strong>Số BN:</strong> ${selectedAppointments.length}</div>
  </div>
  <table>
    <thead>
      <tr>
        <th>#</th><th>Mã lịch</th><th>Họ tên BN</th><th>Gói XN</th>
        <th>Mã ống (dự kiến)</th><th>Loại ống</th><th>Giờ hẹn</th><th>✓ Đã lấy</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
  <p class="note">Dùng làm checklist tại bàn lấy mẫu. Cột “Đã lấy” tick tay sau khi lấy máu. Nhãn Code 128 in riêng bằng nút “In Nhãn Mã Vạch” sau khi xác nhận đợt.</p>
  <div class="footer">
    <div class="sign"><div>Người lập bảng kê</div><br/><br/>________________</div>
    <div class="sign"><div>KTV lấy mẫu</div><br/><br/>________________</div>
  </div>
</body></html>`;

    try {
      printHtmlDocument(html);
      setErrorMessage("");
    } catch {
      setErrorMessage("Không in được bảng kê. Thử lại hoặc kiểm tra hộp thoại in của trình duyệt.");
    }
  };

  // In mã vạch nhãn ống mẫu — luôn gắn SVG Code 128 (JsBarcode)
  const handlePrintBarcodes = async () => {
    if (!batchCode) {
      setErrorMessage("Vui lòng xác nhận đợt lấy mẫu trước khi in nhãn mã vạch.");
      return;
    }
    setErrorMessage("");
    setLoadingBarcodes(true);
    setShowBarcodeModal(true);
    setBarcodeData(null);
    try {
      let labels = [];
      try {
        const data = await fetchBatchBarcodes(batchCode);
        if (data?.labels?.length > 0) {
          labels = data.labels.map((lbl) => ({
            ...lbl,
            barcodeCode128: lbl.barcodeCode128 || lbl.specimenId || lbl.barcode || '',
            patientName: lbl.patientName || 'Bệnh nhân',
            tube: lbl.tube || lbl.tubeType || 'SST',
            packageName: lbl.packageName || lbl.testPackageName || 'Xét nghiệm máu'
          }));
        }
      } catch (apiErr) {
        console.warn("API barcode batch unavailable, fallback local labels:", apiErr);
      }

      if (labels.length === 0) {
        labels = confirmedTubeRows.length > 0
          ? confirmedTubeRows
          : buildLocalLabelsForSelected();
      }

      setBarcodeData({
        batchCode: batchCode || 'ĐỢT-01',
        labels: enrichLabelsWithSvg(labels)
      });
    } catch (err) {
      console.error("Lỗi khi tải mã vạch:", err);
      setErrorMessage(err?.response?.data?.message || err?.message || "Không thể tạo nhãn mã vạch.");
      setBarcodeData({ batchCode, labels: [] });
    } finally {
      setLoadingBarcodes(false);
    }
  };

  const getTubeBadgeClass = (tube) => {
    switch (String(tube).toUpperCase()) {
      case "EDTA":
        return "bg-primary text-white";
      case "NAF":
      case "HEPARIN":
        return "bg-success text-white";
      case "CITRATE":
        return "bg-info text-dark";
      default:
        return "bg-warning text-dark";
    }
  };

  return (
    <div className="container-fluid py-2 px-md-4" style={{ backgroundColor: "#f8fafc", minHeight: "100vh" }}>
      {/* Header & Điều hướng */}
      <header className="bms-page-header">
        <div className="bms-page-header-content">
          <h1 className="bms-page-title">Danh sách lấy mẫu</h1>
        </div>
        <button
          className="btn btn-outline-secondary btn-sm d-flex align-items-center gap-1 shadow-sm"
          onClick={() => navigate(-1)}
        >
          <FaArrowLeft /> Quay lại
        </button>
      </header>

      {/* Thông báo Alert */}
      {successMessage && (
        <div className="alert alert-success border-0 shadow-sm d-flex align-items-center justify-content-between flex-wrap gap-2 p-3 mb-4 rounded-3">
          <div className="d-flex align-items-center gap-2">
            <FaCheckCircle className="text-success fs-5" />
            <div className="fw-medium">{successMessage}</div>
          </div>
          <div className="d-flex gap-2 flex-wrap">
            <button
              className="btn btn-sm btn-success d-flex align-items-center gap-1 shadow-sm"
              onClick={handlePrintBarcodes}
            >
              <FaBarcode /> In lại nhãn ống
            </button>
            <button
              className="btn btn-sm btn-primary d-flex align-items-center gap-1 shadow-sm"
              onClick={goToScanCheckIn}
            >
              <FaVial /> Sang quét tiếp nhận ống
            </button>
          </div>
        </div>
      )}

      {errorMessage && (
        <div className="alert alert-danger border-0 shadow-sm d-flex align-items-center gap-2 p-3 mb-4 rounded-3">
          <FaExclamationCircle className="text-danger fs-5" />
          <div>{errorMessage}</div>
        </div>
      )}

      {/* Bố cục 2 cột chuẩn y khoa */}
      <div className="row g-4">
        {/* Cột trái: Bệnh nhân đã tiếp đón */}
        <div className="col-lg-5">
          <div className="card border-0 shadow-sm rounded-3 h-100 bg-white">
            <div className="card-header bg-white border-bottom py-3 d-flex align-items-center justify-content-between flex-wrap gap-2">
              <h5 className="mb-0 fw-bold fs-6 text-dark d-flex align-items-center gap-2">
                <FaUserCheck className="text-primary" />
                <span>Bệnh nhân đã tiếp đón hôm nay</span>
              </h5>
              <div className="input-group input-group-sm" style={{ width: "190px" }}>
                <span className="input-group-text bg-light border-end-0">
                  <FaSearch className="text-muted" />
                </span>
                <input
                  type="text"
                  className="form-control bg-light border-start-0"
                  placeholder="Lọc tên, mã..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            <div className="table-responsive flex-grow-1">
              <table className="table table-hover align-middle mb-0 table-sm">
                <thead className="table-light text-muted small text-uppercase">
                  <tr>
                    <th style={{ width: "36px" }} className="ps-3">
                      <input
                        type="checkbox"
                        className="form-check-input"
                        checked={filteredAppointments.length > 0 && selectedIds.size === filteredAppointments.length}
                        onChange={handleToggleSelectAll}
                      />
                    </th>
                    <th>Mã Lịch Hẹn</th>
                    <th>Họ Tên Bệnh Nhân</th>
                    <th>Gói Xét Nghiệm</th>
                    <th className="text-end pe-3">Giờ Hẹn</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan="5" className="text-center py-2 text-muted">
                        <FaSpinner className="fa-spin me-2" /> Đang tải danh sách tiếp đón...
                      </td>
                    </tr>
                  ) : filteredAppointments.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="text-center py-2 text-muted">
                        Không có lịch CheckedIn/Confirmed để tạo đợt mới.{' '}
                        <Link to="/lab/queue" className="fw-semibold">
                          Mở Hàng Đợi Mẫu (/lab/queue)
                        </Link>
                        {' '}nếu ống mẫu đã được tạo.
                      </td>
                    </tr>
                  ) : (
                    filteredAppointments.map((apt) => {
                      const isSelected = selectedIds.has(apt.appointmentId);
                      return (
                        <tr
                          key={apt.appointmentId}
                          style={{
                            cursor: "pointer",
                            backgroundColor: isSelected ? "rgba(13, 110, 253, 0.08)" : "transparent"
                          }}
                          onClick={() => handleToggleSelect(apt.appointmentId)}
                        >
                          <td className="ps-3" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              className="form-check-input"
                              checked={isSelected}
                              onChange={() => handleToggleSelect(apt.appointmentId)}
                              style={{ cursor: "pointer" }}
                            />
                          </td>
                          <td>
                            <code className="text-secondary bg-light px-1 py-0.5 rounded small">
                              {apt.appointmentId}
                            </code>
                          </td>
                          <td className="fw-semibold text-dark">
                            {apt.patientName || "Bệnh nhân"}
                          </td>
                          <td className="text-secondary small">
                            {apt.packageName || "Xét nghiệm sinh hóa - huyết học"}
                          </td>
                          <td className="text-end font-monospace small pe-3">
                            {apt.time || "—"}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <div className="card-footer bg-white border-top py-2 px-3 text-muted small d-flex justify-content-between align-items-center">
              <span>
                Đã chọn: <strong className="text-primary">{selectedAppointments.length}</strong> / {safeAppointments.length} bệnh nhân
              </span>
              <span className="small text-muted">KTV phụ trách: {collectorName}</span>
            </div>
          </div>
        </div>

        {/* Cột phải: Danh sách ống mẫu & Thiết lập đợt lấy */}
        <div className="col-lg-7">
          {/* Card 1: Bảng danh sách ống mẫu được chọn */}
          <div className="card border-0 shadow-sm rounded-3 mb-4 bg-white">
            <div className="card-header bg-white border-bottom py-3 d-flex align-items-center justify-content-between">
              <h5 className="mb-0 fw-bold fs-6 text-dark d-flex align-items-center gap-2">
                <FaVial className="text-primary" />
                <span>Chi Tiết Ống Bệnh Phẩm — Đợt: </span>
                <span className="font-monospace text-primary">{batchCode || "Chưa tạo mã"}</span>
              </h5>
              <span className="badge bg-primary-subtle text-primary border border-primary-subtle px-2 py-1">
                {selectedAppointments.length} ống mẫu
              </span>
            </div>

            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0 table-sm">
                <thead className="table-light text-muted small text-uppercase">
                  <tr>
                    <th style={{ width: "36px" }} className="ps-3">#</th>
                    <th>Mã Ống Mẫu (Dự Kiến)</th>
                    <th>Bệnh Nhân</th>
                    <th>Loại Ống / Chất Chống Đông</th>
                    <th className="pe-3">Người Lấy Mẫu</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedAppointments.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="text-center py-2 text-muted">
                        Chưa có bệnh nhân nào được chọn cho đợt này. Vui lòng tick chọn từ danh sách bên trái.
                      </td>
                    </tr>
                  ) : (
                    (() => {
                      // 1 hàng / ống — sau xác nhận dùng barcode thật gắn BN
                      const rows =
                        confirmedTubeRows.length > 0
                          ? confirmedTubeRows.map((lbl, i) => ({
                              key: lbl.barcodeCode128 || `${lbl.specimenId}-${i}`,
                              index: i + 1,
                              code: lbl.barcodeCode128 || lbl.specimenId,
                              patientName: lbl.patientName,
                              tubes: [lbl.tube]
                            }))
                          : selectedAppointments.flatMap((apt, aptIdx) => {
                              const tubesList = resolveTubesForAppointment(apt);
                              return tubesList.map((tube, tIdx) => ({
                                key: `${apt.appointmentId}-${tube}-${tIdx}`,
                                index: aptIdx * 10 + tIdx + 1,
                                code: `(dự kiến) ${apt.appointmentId || "APT"} · ${tube}`,
                                patientName: apt.patientName,
                                tubes: [tube]
                              }));
                            });
                      return rows.map((row) => (
                        <tr key={row.key}>
                          <td className="text-muted small ps-3">{row.index}</td>
                          <td>
                            <code className="text-primary fw-semibold small bg-light px-1 py-0.5 rounded">
                              {row.code}
                            </code>
                          </td>
                          <td className="fw-semibold text-dark">{row.patientName}</td>
                          <td>
                            <div className="d-flex gap-1 flex-wrap">
                              {row.tubes.map((tube, tIdx) => (
                                <span
                                  key={tIdx}
                                  className={`badge px-2 py-0.5 rounded-pill ${getTubeBadgeClass(tube)}`}
                                >
                                  <FaVial className="me-1 small" />
                                  {tube}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="text-secondary small pe-3">{collectorName}</td>
                        </tr>
                      ));
                    })()
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Card 2: Thiết lập thông tin đợt lấy mẫu */}
          <div className="card border-0 shadow-sm rounded-3 bg-white">
            <div className="card-header bg-white border-bottom py-3">
              <h5 className="mb-0 fw-bold fs-6 text-dark d-flex align-items-center gap-2">
                <FaMapMarkerAlt className="text-primary" />
                <span>Thiết Lập Địa Điểm & Thời Gian Lấy Mẫu</span>
              </h5>
            </div>
            <div className="card-body p-2">
              <div className="row g-3 mb-4">
                <div className="col-md-7">
                  <label className="form-label fw-semibold text-dark small">Địa Điểm / Bàn Lấy Mẫu *</label>
                  <select
                    className="form-select"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                  >
                    <option value="Bàn lấy mẫu số 1 - Khoa Xét nghiệm">Bàn lấy mẫu số 1 - Khoa Xét nghiệm</option>
                    <option value="Phòng Lab 01 — Khu Tiếp nhận Cấp cứu">Phòng Lab 01 — Khu Tiếp nhận Cấp cứu</option>
                    <option value="Khu Nội trú Tầng 3 — Lấy mẫu tại giường">Khu Nội trú Tầng 3 — Lấy mẫu tại giường</option>
                  </select>
                </div>
                <div className="col-md-5">
                  <label className="form-label fw-semibold text-dark small">Khung Giờ Lấy Mẫu Dự Kiến *</label>
                  <div className="input-group">
                    <span className="input-group-text bg-light"><FaClock className="text-muted" /></span>
                    <input
                      type="time"
                      className="form-control"
                      value={targetTime}
                      onChange={(e) => setTargetTime(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Nút hành động */}
              <div className="d-flex gap-2 flex-wrap">
                {!batchConfirmed ? (
                  <button
                    type="button"
                    className="btn btn-primary d-flex align-items-center gap-2 fw-semibold px-3 shadow-sm"
                    disabled={submitting || selectedAppointments.length === 0}
                    onClick={handleConfirmList}
                  >
                    <FaCheckCircle /> {submitting ? "Đang xác nhận..." : "Xác Nhận Đợt Lấy Mẫu"}
                  </button>
                ) : (
                  <span className="badge bg-success-subtle text-success border border-success-subtle align-self-center px-3 py-2">
                    <FaCheckCircle className="me-1" />
                    Đã xác nhận {batchCode} — nút xác nhận đã ẩn
                  </span>
                )}
                <button
                  type="button"
                  className="btn btn-outline-secondary d-flex align-items-center gap-2 fw-semibold shadow-sm"
                  disabled={selectedAppointments.length === 0}
                  title={selectedAppointments.length === 0 ? "Chọn BN trước" : "In phiếu checklist lấy mẫu (không phải nhãn barcode)"}
                  onClick={handlePrintManifest}
                >
                  <FaPrint /> In Bảng Kê Mẫu
                </button>
                <button
                  type="button"
                  className="btn btn-outline-primary d-flex align-items-center gap-2 fw-semibold shadow-sm"
                  onClick={handlePrintBarcodes}
                  disabled={!batchConfirmed || !batchCode || loadingBarcodes}
                  title={batchConfirmed ? "In lại nhãn Code 128" : "Xác nhận đợt trước — modal sẽ tự mở"}
                >
                  <FaBarcode /> In Nhãn Mã Vạch
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal: nhãn dán ống nghiệm (1 nhãn = 1 ống), không phải bảng kê */}
      {showBarcodeModal && (
        <div
          className="modal show d-block"
          style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
          tabIndex="-1"
        >
          <div className="modal-dialog modal-lg modal-dialog-centered">
            <div className="modal-content border-0 shadow-lg rounded-3">
              <div className="modal-header border-bottom py-3">
                <div>
                  <h5 className="modal-title fw-bold text-dark d-flex align-items-center gap-2 mb-1">
                    <FaBarcode className="text-primary" />
                    Nhãn dán ống nghiệm (Code 128) — Đợt {batchCode || "—"}
                  </h5>
                  <div className="small text-muted">
                    Nghiệp vụ: <strong>1 nhãn = 1 ống</strong> · dán lên thành ống trước/khi lấy máu ·
                    không tráo BN · khác với “In bảng kê mẫu” (phiếu checklist giấy).
                  </div>
                </div>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowBarcodeModal(false)}
                />
              </div>
              <div className="modal-body p-3" style={{ maxHeight: "65vh", overflowY: "auto" }}>
                {loadingBarcodes ? (
                  <div className="text-center py-4 text-muted">
                    <FaSpinner className="fa-spin me-2" /> Đang tạo nhãn ống…
                  </div>
                ) : !barcodeData || !Array.isArray(barcodeData.labels) || barcodeData.labels.length === 0 ? (
                  <div className="text-center py-4 text-muted">
                    <FaBarcode className="fs-1 text-secondary opacity-50 mb-2" />
                    <p className="mb-0">Chưa có nhãn ống cho đợt này.</p>
                  </div>
                ) : (
                  <>
                    <div className="alert alert-light border small mb-3 py-2">
                      Có <strong>{barcodeData.labels.length}</strong> nhãn ống cần in và dán.
                      Mỗi nhãn gắn 1 BN + 1 loại ống + mã không trùng.
                    </div>
                    <div className="row g-3 barcode-print-area">
                      {(Array.isArray(barcodeData?.labels) ? barcodeData.labels : []).map((lbl, idx) => {
                        const code = lbl.barcodeCode128 || lbl.specimenId || lbl.barcode || "";
                        return (
                          <div key={`${code}-${idx}`} className="col-md-4 col-sm-6">
                            <div
                              className="tube-sticker border border-dark bg-white p-2 text-center"
                              style={{ minHeight: 168 }}
                            >
                              <div className="d-flex justify-content-between align-items-start mb-1 gap-1">
                                <span className="fw-bold text-dark text-start small lh-sm">
                                  {lbl.patientName || "BN"}
                                </span>
                                <span className={`badge ${getTubeBadgeClass(lbl.tube)}`}>{lbl.tube}</span>
                              </div>
                              <div className="text-muted text-truncate mb-1" style={{ fontSize: "0.68rem" }} title={lbl.packageName}>
                                {lbl.packageName || "XN"}
                              </div>
                              <div className="d-flex justify-content-center bg-white py-1">
                                <Code128Barcode value={code} height={42} width={1.35} />
                              </div>
                              <div className="font-monospace text-dark mt-1" style={{ fontSize: "0.68rem", wordBreak: "break-all" }}>
                                {code}
                              </div>
                              <div className="text-muted mt-1" style={{ fontSize: "0.62rem" }}>
                                DÁN LÊN ỐNG · không tái sử dụng nhãn
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
              <div className="modal-footer border-top py-2 d-flex justify-content-between flex-wrap gap-2">
                <span className="small text-muted align-self-center">
                  Cắt/tách từng nhãn → dán đúng ống {barcodeData?.labels?.[0]?.tube || "EDTA/SST/…"} của đúng BN.
                </span>
                <div className="d-flex gap-2 flex-wrap">
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={() => {
                      setShowBarcodeModal(false);
                      if (batchConfirmed) goToScanCheckIn();
                    }}
                  >
                    Đóng &amp; sang quét ống
                  </button>
                  <button
                    type="button"
                    className="btn btn-success d-flex align-items-center gap-1"
                    onClick={goToScanCheckIn}
                  >
                    <FaVial /> Tiếp tục: Quét tiếp nhận ống
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary d-flex align-items-center gap-1 shadow-sm"
                    disabled={!barcodeData?.labels?.length}
                    onClick={() => {
                      const raw = Array.isArray(barcodeData?.labels) ? barcodeData.labels : [];
                      if (!raw.length) return;
                      setErrorMessage("");
                      // Đảm bảo có SVG Code 128 trước khi in (không phụ thuộc popup)
                      const labels = enrichLabelsWithSvg(raw);
                      const stickers = labels
                        .map((lbl) => {
                          const code = lbl.barcodeCode128 || lbl.specimenId || lbl.barcode || "";
                          const svg = (lbl.svgBarcode && String(lbl.svgBarcode).includes("<svg"))
                            ? lbl.svgBarcode
                            : `<div style="font-family:monospace;font-size:11px;padding:8px 0">${code}</div>`;
                          return `<div class="sticker">
                            <div class="top"><b>${lbl.patientName || "BN"}</b><span class="tube">${lbl.tube || ""}</span></div>
                            <div class="pkg">${lbl.packageName || ""}</div>
                            <div class="bc">${svg}</div>
                            <div class="code">${code}</div>
                            <div class="hint">DÁN LÊN ỐNG NGHIỆM</div>
                          </div>`;
                        })
                        .join("");
                      const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/>
                        <title>Nhãn dán ống — ${batchCode || ""}</title>
                        <style>
                          @page { margin: 6mm; size: A4; }
                          body { font-family: "Segoe UI", Arial, sans-serif; margin: 0; padding: 6px; color: #000; }
                          h1 { font-size: 13px; margin: 0 0 8px; }
                          .note { font-size: 11px; color: #334155; margin-bottom: 10px; }
                          .sheet { display: flex; flex-wrap: wrap; gap: 8px; }
                          .sticker {
                            width: 62mm; min-height: 32mm; box-sizing: border-box;
                            border: 1px solid #000; padding: 4px 6px;
                            page-break-inside: avoid; text-align: center;
                          }
                          .top { display: flex; justify-content: space-between; align-items: flex-start; font-size: 11px; gap: 4px; }
                          .tube { border: 1px solid #000; padding: 0 4px; font-size: 10px; white-space: nowrap; }
                          .pkg { font-size: 9px; color: #334155; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin: 2px 0; }
                          .bc svg { max-width: 100%; height: 38px; }
                          .code { font-family: ui-monospace, monospace; font-size: 9px; word-break: break-all; margin-top: 2px; }
                          .hint { font-size: 8px; margin-top: 2px; letter-spacing: 0.04em; }
                        </style></head><body>
                        <h1>Nhãn dán ống nghiệm — Đợt ${batchCode || ""} (${labels.length} ống)</h1>
                        <div class="note">1 nhãn = 1 ống. Dán lên thành ống đúng loại của đúng bệnh nhân.</div>
                        <div class="sheet">${stickers}</div>
                      </body></html>`;
                      try {
                        printHtmlDocument(html);
                      } catch {
                        setErrorMessage("Không mở được hộp thoại in. Thử lại nút In nhãn dán ống.");
                      }
                    }}
                  >
                    <FaPrint /> In nhãn dán ống ({barcodeData?.labels?.length || 0})
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
