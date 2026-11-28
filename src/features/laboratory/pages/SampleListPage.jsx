/**
 * @file SampleListPage.jsx
 * @description Danh sách tiếp nhận và tạo đợt lấy mẫu bệnh phẩm tại phòng xét nghiệm (UC37).
 * Tuân thủ: Tiêu chuẩn ISO 15189:2022, Clean Medical Standard (Rule 19) & AGENTS-CODE.md.
 */

import React, { useState, useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Search, TestTube2, CheckCircle2, Printer, Barcode as LucideBarcode, ArrowLeft, Clock, MapPin, AlertCircle, ClipboardList, X as LucideX, UserCheck, Loader2 } from 'lucide-react';
import TablePagination, { usePagination } from '../../../components/ui/TablePagination';
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

  if (doc.readyState === "complete") {
    setTimeout(trigger, 250);
  } else {
    iframe.onload = () => setTimeout(trigger, 250);
    setTimeout(trigger, 600);
  }
}

export default function SampleListPage() {
  const navigate = useNavigate();

  const [appointments, setAppointments] = useState([]);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);

  const getCurrentHHmm = () => {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  };

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

  const [location, setLocation] = useState(
    currentUser?.roomName || currentUser?.department || "Phòng Lấy Mẫu Lab (Theo ca trực)"
  );
  const [targetTime, setTargetTime] = useState(getCurrentHHmm);
  const [batchCode, setBatchCode] = useState("");
  const [batchConfirmed, setBatchConfirmed] = useState(false);
  const [confirmedTubeRows, setConfirmedTubeRows] = useState([]);

  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const [showBarcodeModal, setShowBarcodeModal] = useState(false);
  const [barcodeData, setBarcodeData] = useState(null);
  const [loadingBarcodes, setLoadingBarcodes] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const list = await fetchCheckedInAppointments();
        const sortedList = (Array.isArray(list) ? [...list] : []).sort((a, b) => {
          const tA = new Date(a?.checkedInAt || a?.updatedAt || a?.createdAt || a?.appointmentDate || 0).getTime() || 0;
          const tB = new Date(b?.checkedInAt || b?.updatedAt || b?.createdAt || b?.appointmentDate || 0).getTime() || 0;
          return tB - tA;
        });
        setAppointments(sortedList);
      } catch (err) {
        console.error("Lỗi khi tải danh sách tiếp đón:", err);
        setAppointments([]);
        setErrorMessage(err?.response?.data?.message || err?.message || "Không thể tải danh sách chỉ định / tiếp đón. Vui lòng thử lại.");
      } finally {
        setLoading(false);
      }
    };
    loadData();

    (async () => {
      try {
        const today = new Date();
        const ymd = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
        const res = await fetch(`/api/shifts?date=${encodeURIComponent(ymd)}&pageSize=50`, {
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${localStorage.getItem("bms_access_token") || sessionStorage.getItem("bms_access_token") || ""}`
          }
        });
        if (!res.ok) return;
        const body = await res.json().catch(() => null);
        const items = body?.items || body?.data || (Array.isArray(body) ? body : []);
        const mine = (Array.isArray(items) ? items : []).find((s) => {
          const sid = String(s.doctorId || s.employeeId || s.userId || "").toLowerCase();
          const uname = String(s.employeeName || "").toLowerCase();
          const curId = String(collectorId || "").toLowerCase();
          const curName = String(collectorName || "").toLowerCase();
          return (curId && sid === curId) || (curName && uname && uname.includes(curName));
        });
        if (mine) {
          const roomLabel = mine.roomName
            ? (mine.roomId ? `${mine.roomId} — ${mine.roomName}` : mine.roomName)
            : (mine.roomId || "");
          if (roomLabel) setLocation(roomLabel);
        }
      } catch {
      }
    })();
  }, [collectorId, collectorName]);

  const safeAppointments = Array.isArray(appointments) ? appointments : [];
  const getRowKey = (apt) => apt?.orderId || apt?.orderNumber || apt?.appointmentId || "";

  const filteredAppointments = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return safeAppointments;
    return safeAppointments.filter((apt) => {
      const pName = String(apt?.patientName || "").toLowerCase();
      const aId = String(apt?.appointmentId || "").toLowerCase();
      const oNo = String(apt?.orderNumber || "").toLowerCase();
      const pkg = String(apt?.packageName || "").toLowerCase();
      return pName.includes(term) || aId.includes(term) || oNo.includes(term) || pkg.includes(term);
    });
  }, [safeAppointments, searchTerm]);

  const aptPag = usePagination(filteredAppointments, 10);

  const handleToggleSelect = (id) => {
    if (batchConfirmed) {
      setBatchConfirmed(false);
      setBatchCode("");
      setConfirmedTubeRows([]);
      setSuccessMessage("");
    }
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  const handleToggleSelectAll = () => {
    if (batchConfirmed) {
      setBatchConfirmed(false);
      setBatchCode("");
      setConfirmedTubeRows([]);
      setSuccessMessage("");
    }
    if (selectedIds.size === filteredAppointments.length && filteredAppointments.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredAppointments.map((a) => getRowKey(a)).filter(Boolean)));
    }
  };

  const selectedAppointments = useMemo(() => {
    return safeAppointments.filter((apt) => selectedIds.has(getRowKey(apt)));
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

    if (fromApi.length > 0) {
      fromApi.forEach(push);
      return ordered;
    }

    const pkg = `${apt?.packageName || ""} ${apt?.testPackageName || ""}`.toUpperCase();

    if (/CBC|HUYẾT ĐỒ|HUYET DO|TẾ BÀO|TE BAO|24 THÔNG|HEMAT|CÔNG THỨC MÁU/.test(pkg)) push("EDTA");
    if (/ĐÔNG|DONG MÁU|COAG|\bPT\b|APTT|FIBRINOGEN|INR|D-DIMER/.test(pkg)) push("CITRATE");
    if (/NaF|FLUOR|ĐƯỜNG HUYẾT|GLUCOSE|OGTT/.test(pkg)) push("NaF");
    if (/SINH HÓA|SINH HOA|SST|SERUM|TSH|FT4|FT3|ANTI-?TPO|MIỄN DỊCH|LIPID|GAN|THẬN|UREA|CREA|AST|ALT/.test(pkg)) {
      push("SST");
    }

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
        `Đã xác nhận đợt ${code} và tự động sinh mã Barcode theo đúng loại ống của y lệnh. Dán nhãn lên từng ống nghiệm rồi chuyển sang Bước 2 (Hàng Đợi & Lấy Mẫu).`
      );

      try {
        const data = await fetchBatchBarcodes(code);
        if (data?.labels?.length > 0) {
          labelsFromApi = data.labels.map((lbl, idx) => ({
            ...lbl,
            barcodeCode128: lbl.barcodeCode128 || lbl.specimenId || lbl.barcode || "",
            patientId: lbl.patientId || "",
            patientName: lbl.patientName || "Bệnh nhân",
            patientGender: lbl.patientGender || "",
            patientBirthYear: lbl.patientBirthYear || "",
            patientAge: lbl.patientAge ?? null,
            orderNumber: lbl.orderNumber || "",
            tubeIndex: lbl.tubeIndex || idx + 1,
            totalTubes: lbl.totalTubes || data.labels.length,
            tube: lbl.tube || lbl.tubeType || "SST",
            tubeLabelVi: lbl.tubeLabelVi || lbl.tube || "SST",
            testCodes: lbl.testCodes || lbl.packageName || "",
            packageName: lbl.packageName || lbl.testPackageName || "Xét nghiệm máu",
            printedAt: lbl.printedAt || ""
          }));
        }
      } catch {
        labelsFromApi = [];
      }
    } catch (err) {
      console.error("API tạo đợt lấy mẫu thất bại:", err);
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.title ||
        err?.message ||
        "Không tạo được đợt lấy mẫu trên máy chủ.";
      setErrorMessage(msg);
      setBatchConfirmed(false);
      setBatchCode("");
      setConfirmedTubeRows([]);
      setBarcodeData(null);
      setShowBarcodeModal(false);
      setLoadingBarcodes(false);
      return;
    } finally {
      setSubmitting(false);
    }

    const localLabels = buildLocalLabelsForSelected();
    const labels = labelsFromApi.length > 0 ? labelsFromApi : localLabels;
    setConfirmedTubeRows(labels);
    setBarcodeData({
      batchCode: code,
      labels: enrichLabelsWithSvg(labels)
    });
    setShowBarcodeModal(true);
    setLoadingBarcodes(false);

    try {
      const refreshed = await fetchCheckedInAppointments();
      setAppointments(Array.isArray(refreshed) ? refreshed : []);
      setSelectedIds(new Set());
    } catch {
    }
  };

  const goToSampleCollectionQueue = () => {
    setShowBarcodeModal(false);
    navigate("/lab/queue", {
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
          labels = data.labels.map((lbl, idx) => ({
            ...lbl,
            barcodeCode128: lbl.barcodeCode128 || lbl.specimenId || lbl.barcode || '',
            patientId: lbl.patientId || '',
            patientName: lbl.patientName || 'Bệnh nhân',
            patientGender: lbl.patientGender || '',
            patientBirthYear: lbl.patientBirthYear || '',
            patientAge: lbl.patientAge ?? null,
            orderNumber: lbl.orderNumber || '',
            tubeIndex: lbl.tubeIndex || idx + 1,
            totalTubes: lbl.totalTubes || data.labels.length,
            tube: lbl.tube || lbl.tubeType || 'SST',
            tubeLabelVi: lbl.tubeLabelVi || lbl.tube || 'SST',
            testCodes: lbl.testCodes || lbl.packageName || '',
            packageName: lbl.packageName || lbl.testPackageName || 'Xét nghiệm máu',
            printedAt: lbl.printedAt || ''
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

  const formatTubeLabelVi = (tube) => {
    switch (String(tube || "").toUpperCase()) {
      case "EDTA":
        return "Ống Tím (K2-EDTA)";
      case "CITRATE":
        return "Ống Xanh dương (Citrate)";
      case "NAF":
        return "Ống Xám (NaF)";
      case "HEPARIN":
        return "Ống Xanh lá (Heparin)";
      case "CULTURE":
        return "Chai cấy máu";
      case "SST":
      case "SERUM":
      default:
        return "Ống Vàng (Serum SST)";
    }
  };

  return (
    <div className="w-100 py-1">

      <div className="bms-page-header-card mb-4">
        <div className="bms-page-header-content flex-column align-items-start">
          <div className="bms-page-title-row">
            <h1 className="bms-page-title">Tiếp nhận chỉ định xét nghiệm &amp; Barcode</h1>
          </div>
          <p className="text-muted small m-0 mt-1">
            Bước 1: Tiếp nhận đơn chỉ định từ Bác sĩ, xác nhận đợt lấy mẫu để hệ thống tự sinh mã Barcode dán lên từng ống nghiệm (EDTA, SST, Citrate...) trước khi lấy mẫu ở Bước 2.
          </p>
        </div>
        <div className="bms-page-actions">
          <button
            type="button"
            className="btn btn-outline-secondary btn-sm d-inline-flex align-items-center gap-1 rounded-pill px-3 text-nowrap"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft  size="1em"/> Quay lại
          </button>
        </div>
      </div>

      <div className="bms-filter-bar mb-3">
        <div className="bms-search-input-pill">
          <Search className="bms-search-icon"  size="1em"/>
          <input
            type="text"
            placeholder="Tìm theo họ tên bệnh nhân, mã lịch hẹn, gói xét nghiệm..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button
              type="button"
              className="bms-search-clear"
              onClick={() => setSearchTerm("")}
            >
              <LucideX size={12} />
            </button>
          )}
        </div>
        <span className="bms-filter-meta">
          Đã chọn <strong>{selectedAppointments.length}</strong> / {filteredAppointments.length} bệnh nhân
        </span>
      </div>

      {successMessage && (
        <div className="alert alert-success border-0 shadow-sm d-flex align-items-center justify-content-between flex-wrap gap-2 p-3 mb-4 rounded-3">
          <div className="d-flex align-items-center gap-2">
            <CheckCircle2 className="text-success fs-5"  size="1em"/>
            <div className="fw-medium">{successMessage}</div>
          </div>
          <div className="d-flex gap-2 flex-wrap">
            <button
              className="btn btn-sm btn-success d-flex align-items-center gap-1 shadow-sm"
              onClick={handlePrintBarcodes}
            >
              <LucideBarcode  size="1em"/> In lại nhãn ống
            </button>
            <button
              className="btn btn-sm btn-primary d-flex align-items-center gap-1 shadow-sm"
              onClick={goToSampleCollectionQueue}
            >
              <TestTube2  size="1em"/> Sang Bước 2: Hàng Đợi &amp; Lấy Mẫu
            </button>
          </div>
        </div>
      )}

      {errorMessage && (
        <div className="alert alert-danger border-0 shadow-sm d-flex align-items-center gap-2 p-3 mb-4 rounded-3">
          <AlertCircle className="text-danger fs-5"  size="1em"/>
          <div>{errorMessage}</div>
        </div>
      )}

      <div className="row g-4">

        <div className="col-lg-5">
          <section className="bms-table-standalone-section m-0 h-100 d-flex flex-column">
            <div className="bms-table-standalone-header">
              <div>
                <h2 className="bms-table-standalone-title">Đơn chỉ định chờ tiếp nhận từ Bác sĩ</h2>
                <p className="bms-table-standalone-subtitle">Phụ trách lấy mẫu: {collectorName}</p>
              </div>
              <span className="badge bg-primary-subtle text-primary border border-primary-subtle rounded-pill px-2.5 py-1">
                {filteredAppointments.length} đơn
              </span>
            </div>

            <div className="bms-table-standalone-body flex-grow-1">
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
                    <th>Mã chỉ định</th>
                    <th>Họ tên bệnh nhân</th>
                    <th>Xét nghiệm chỉ định</th>
                    <th className="text-end pe-3">Giờ lập</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan="5" className="text-center py-4 text-muted">
                        <Loader2 className="fa-spin me-2"  size="1em"/> Đang tải danh sách chỉ định từ Bác sĩ...
                      </td>
                    </tr>
                  ) : filteredAppointments.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="text-center py-3 text-muted">
                        Hiện chưa có đơn chỉ định mới chờ tiếp nhận.{' '}
                        <Link to="/lab/queue" className="fw-semibold">
                          Mở Bước 2: Hàng Đợi &amp; Lấy Mẫu
                        </Link>
                        {' '}để xem các mẫu đã sinh Barcode.
                      </td>
                    </tr>
                  ) : (
                    aptPag.paginatedItems.map((apt) => {
                      const rowKey = getRowKey(apt);
                      const isSelected = selectedIds.has(rowKey);
                      return (
                        <tr
                          key={rowKey}
                          style={{
                            cursor: "pointer",
                            backgroundColor: isSelected ? "rgba(13, 110, 253, 0.08)" : "transparent"
                          }}
                          onClick={() => handleToggleSelect(rowKey)}
                        >
                          <td className="ps-3" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              className="form-check-input"
                              checked={isSelected}
                              onChange={() => handleToggleSelect(rowKey)}
                              style={{ cursor: "pointer" }}
                            />
                          </td>
                          <td>
                            <code className="text-primary fw-semibold bg-light px-1 py-0.5 rounded small d-block">
                              {apt.orderNumber || apt.appointmentId}
                            </code>
                            {apt.orderNumber && apt.appointmentId && apt.appointmentId !== apt.orderNumber && (
                              <span className="text-muted font-monospace" style={{ fontSize: "10.5px" }}>
                                {apt.appointmentId}
                              </span>
                            )}
                          </td>
                          <td>
                            <div className="fw-semibold text-dark">{apt.patientName || "Bệnh nhân"}</div>
                            {apt.doctorName && (
                              <div className="text-muted" style={{ fontSize: "11px" }}>BS. {apt.doctorName}</div>
                            )}
                          </td>
                          <td className="text-secondary small">
                            {apt.packageName || "Xét nghiệm theo chỉ định"}
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
            <TablePagination
              page={aptPag.page}
              totalPages={aptPag.totalPages}
              totalItems={aptPag.totalItems}
              pageSize={aptPag.pageSize}
              onPageChange={aptPag.setPage}
              onPageSizeChange={aptPag.setPageSize}
              itemLabel="lịch hẹn"
              compact
            />
          </section>
        </div>

        <div className="col-lg-7">

          <section className="bms-table-standalone-section mb-4">
            <div className="bms-table-standalone-header">
              <div>
                <h2 className="bms-table-standalone-title">
                  Chi tiết ống bệnh phẩm — Đợt: <span className="font-monospace text-primary">{batchCode || "Chưa tạo mã"}</span>
                </h2>
                <p className="bms-table-standalone-subtitle">Các ống mẫu dự kiến tạo mã vạch cho đợt lấy mẫu</p>
              </div>
              <span className="badge bg-primary-subtle text-primary border border-primary-subtle rounded-pill px-2.5 py-1">
                {confirmedTubeRows.length > 0
                  ? confirmedTubeRows.length
                  : selectedAppointments.reduce((sum, apt) => sum + resolveTubesForAppointment(apt).length, 0)} ống mẫu
              </span>
            </div>

            <div className="bms-table-standalone-body table-responsive">
              <table className="table table-hover align-middle mb-0 table-sm" style={{ tableLayout: 'fixed', width: '100%' }}>
                <thead className="table-light text-muted small">
                  <tr>
                    <th style={{ width: "36px" }} className="ps-3">#</th>
                    <th style={{ width: "30%" }}>Mã bệnh phẩm (Tube ID)</th>
                    <th style={{ width: "22%" }}>Bệnh nhân</th>
                    <th style={{ width: "26%" }}>Loại ống nghiệm</th>
                    <th style={{ width: "16%" }} className="pe-3">KTV tiếp nhận</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedAppointments.length === 0 && confirmedTubeRows.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="text-center py-4 text-muted">
                        Chưa có chỉ định nào được chọn. Chọn đơn từ danh sách bên trái rồi bấm Xác nhận tiếp nhận để cấp mã bệnh phẩm.
                      </td>
                    </tr>
                  ) : (
                    (() => {
                      const rows =
                        confirmedTubeRows.length > 0
                          ? confirmedTubeRows.map((lbl, i) => ({
                              key: lbl.barcodeCode128 || `${lbl.specimenId}-${i}`,
                              index: i + 1,
                              code: lbl.barcodeCode128 || lbl.specimenId,
                              orderRef: lbl.orderNumber || lbl.appointmentId || "",
                              patientName: lbl.patientName,
                              tubes: [lbl.tube]
                            }))
                          : selectedAppointments.flatMap((apt, aptIdx) => {
                              const tubesList = resolveTubesForAppointment(apt);
                              return tubesList.map((tube, tIdx) => ({
                                key: `${getRowKey(apt)}-${tube}-${tIdx}`,
                                index: aptIdx * 10 + tIdx + 1,
                                code: "",
                                orderRef: apt.orderNumber || apt.appointmentId || "",
                                patientName: apt.patientName,
                                tubes: [tube]
                              }));
                            });
                      return rows.map((row) => (
                        <tr key={row.key}>
                          <td className="text-muted small ps-3">{row.index}</td>
                          <td>
                            {confirmedTubeRows.length > 0 ? (
                              <Code128Barcode value={row.code} height={24} width={1.0} compact align="start" />
                            ) : (
                              <div className="d-flex flex-column align-items-start gap-1">
                                <span
                                  className="d-inline-flex align-items-center gap-1 fw-semibold"
                                  style={{
                                    fontSize: "11px",
                                    padding: "2px 8px",
                                    borderRadius: "999px",
                                    backgroundColor: "#F8FAFC",
                                    color: "#475569",
                                    border: "1px dashed #94A3B8"
                                  }}
                                >
                                  <Clock size={11} /> Chờ cấp mã mẫu
                                </span>
                                {row.orderRef && (
                                  <span className="text-muted font-monospace" style={{ fontSize: "10.5px" }}>
                                    YL: {row.orderRef}
                                  </span>
                                )}
                              </div>
                            )}
                          </td>
                          <td className="fw-semibold text-dark">{row.patientName}</td>
                          <td>
                            <div className="d-flex gap-1 flex-wrap">
                              {row.tubes.map((tube, tIdx) => (
                                <span
                                  key={tIdx}
                                  className={`badge px-2 py-1 rounded-pill ${getTubeBadgeClass(tube)}`}
                                  style={{ fontSize: "11px" }}
                                >
                                  <TestTube2 className="me-1" size={11} />
                                  {formatTubeLabelVi(tube)}
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
          </section>

          <div className="card shadow-sm rounded-4 bg-white" style={{ border: "1px solid #E2E8F0" }}>
            <div className="card-header py-3 px-4 border-bottom" style={{ backgroundColor: "#F8FAFC", borderColor: "#E2E8F0" }}>
              <h5 className="mb-0 fw-bold fs-6 text-dark d-flex align-items-center gap-2">
                <MapPin className="text-primary"  size="1em"/>
                <span>Thiết lập địa điểm &amp; thời gian lấy mẫu</span>
              </h5>
            </div>
            <div className="card-body p-4">
              <div className="row g-3 mb-4">
                <div className="col-md-7">
                  <label className="form-label fw-semibold text-dark small">Địa Điểm / Bàn Lấy Mẫu (Theo ca trực)</label>
                  <input
                    type="text"
                    className="form-control bg-light text-dark fw-semibold"
                    value={location}
                    readOnly
                    disabled
                  />
                </div>
                <div className="col-md-5">
                  <label className="form-label fw-semibold text-dark small">Thời Gian Lấy Mẫu (Giờ hiện tại)</label>
                  <div className="input-group">
                    <span className="input-group-text bg-light"><Clock className="text-muted"  size="1em"/></span>
                    <input
                      type="time"
                      className="form-control bg-light text-dark fw-semibold"
                      value={targetTime}
                      readOnly
                      disabled
                    />
                  </div>
                </div>
              </div>

              <div className="d-flex gap-2 flex-wrap">
                {!batchConfirmed ? (
                  <button
                    type="button"
                    className="btn btn-primary d-flex align-items-center gap-2 fw-semibold px-3 shadow-sm"
                    disabled={submitting || selectedAppointments.length === 0}
                    onClick={handleConfirmList}
                  >
                    <CheckCircle2  size="1em"/> {submitting ? "Đang xác nhận & sinh Barcode..." : "Xác Nhận Tiếp Nhận & Sinh Barcode"}
                  </button>
                ) : (
                  <span className="badge bg-success-subtle text-success border border-success-subtle align-self-center px-3 py-2">
                    <CheckCircle2 className="me-1"  size="1em"/>
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
                  <Printer  size="1em"/> In bảng kê mẫu
                </button>
                <button
                  type="button"
                  className="btn btn-outline-primary d-inline-flex align-items-center gap-2 fw-semibold rounded-pill px-3 text-nowrap"
                  onClick={handlePrintBarcodes}
                  disabled={!batchConfirmed || !batchCode || loadingBarcodes}
                  title={batchConfirmed ? "In lại nhãn Code 128" : "Xác nhận đợt trước — modal sẽ tự mở"}
                >
                  <LucideBarcode  size="1em"/> In nhãn mã vạch
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

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
                    <LucideBarcode className="text-primary"  size="1em"/>
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
                    <Loader2 className="fa-spin me-2"  size="1em"/> Đang tạo nhãn ống…
                  </div>
                ) : !barcodeData || !Array.isArray(barcodeData.labels) || barcodeData.labels.length === 0 ? (
                  <div className="text-center py-4 text-muted">
                    <LucideBarcode className="fs-1 text-secondary opacity-50 mb-2"  size="1em"/>
                    <p className="mb-0">Chưa có nhãn ống cho đợt này.</p>
                  </div>
                ) : (
                  <>
                    <div className="alert alert-light border small mb-3 py-2">
                      Có <strong>{barcodeData.labels.length}</strong> tem dán ống chuẩn <strong>ISO 15189 (60×35mm)</strong> theo thứ tự rút máu <strong>CLSI H3-A6</strong>.
                      Các ống của cùng 1 bệnh nhân dùng chung gốc mã <code>SMP-YYMMDD-XXXX</code> và phân biệt theo đuôi <code>-01, -02, -03</code>.
                    </div>
                    <div className="row g-3 barcode-print-area">
                      {(Array.isArray(barcodeData?.labels) ? barcodeData.labels : []).map((lbl, idx) => {
                        const code = lbl.barcodeCode128 || lbl.specimenId || lbl.barcode || "";
                        const demoMeta = [
                          lbl.patientBirthYear || (lbl.patientAge ? `${lbl.patientAge}T` : ""),
                          lbl.patientGender
                        ].filter(Boolean).join(" · ");
                        const tubeOrderText = `Ống ${lbl.tubeIndex || 1}/${lbl.totalTubes || 1}`;
                        return (
                          <div key={`${code}-${idx}`} className="col-md-6">
                            <div
                              className="tube-sticker border border-dark bg-white p-2 rounded-2"
                              style={{ maxWidth: 320, margin: "0 auto" }}
                            >

                              <div className="d-flex justify-content-between align-items-start gap-1">
                                <div className="text-start lh-sm">
                                  <div className="fw-bold text-dark text-uppercase" style={{ fontSize: "0.78rem" }}>
                                    {lbl.patientName || "BỆNH NHÂN"}
                                  </div>
                                  {demoMeta && (
                                    <div className="text-muted" style={{ fontSize: "0.66rem" }}>{demoMeta}</div>
                                  )}
                                </div>
                                <span
                                  className={`badge ${getTubeBadgeClass(lbl.tube)}`}
                                  style={{ fontSize: "0.65rem", whiteSpace: "nowrap" }}
                                >
                                  {lbl.tubeLabelVi || lbl.tube}
                                </span>
                              </div>

                              <div
                                className="d-flex justify-content-between align-items-center border-bottom pb-1 mb-1 mt-1 font-monospace"
                                style={{ fontSize: "0.64rem", color: "#334155" }}
                              >
                                <span>PID: <strong>{lbl.patientId || "—"}</strong></span>
                                <span>
                                  {lbl.orderNumber ? `${lbl.orderNumber} · ` : ""}
                                  <strong>{tubeOrderText}</strong>
                                </span>
                              </div>

                              <div className="d-flex justify-content-center bg-white py-1">
                                <Code128Barcode value={code} height={38} width={1.25} showText />
                              </div>

                              <div
                                className="d-flex justify-content-between align-items-center border-top pt-1 mt-1"
                                style={{ fontSize: "0.63rem", color: "#475569" }}
                              >
                                <span className="text-truncate fw-semibold" style={{ maxWidth: "65%" }} title={lbl.testCodes || lbl.packageName}>
                                  {lbl.testCodes || lbl.packageName || "Xét nghiệm"}
                                </span>
                                <span className="font-monospace">{lbl.printedAt || ""}</span>
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
                  Khổ in tem cuộn nhiệt chuẩn Lab: <strong>60mm × 35mm</strong> (1 tem / 1 trang cuộn).
                </span>
                <div className="d-flex gap-2 flex-wrap">
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={() => setShowBarcodeModal(false)}
                  >
                    Đóng
                  </button>
                  <button
                    type="button"
                    className="btn btn-success d-flex align-items-center gap-1"
                    onClick={goToSampleCollectionQueue}
                  >
                    <TestTube2  size="1em"/> Tiếp tục Bước 2: Lấy Mẫu Bệnh Phẩm
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary d-flex align-items-center gap-1 shadow-sm"
                    disabled={!barcodeData?.labels?.length}
                    onClick={() => {
                      const raw = Array.isArray(barcodeData?.labels) ? barcodeData.labels : [];
                      if (!raw.length) return;
                      setErrorMessage("");
                      const labels = enrichLabelsWithSvg(raw);
                      const nowFallback = new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }) + " " + new Date().toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });
                      const stickers = labels
                        .map((lbl, idx) => {
                          const code = lbl.barcodeCode128 || lbl.specimenId || lbl.barcode || "";
                          const svg = (lbl.svgBarcode && String(lbl.svgBarcode).includes("<svg"))
                            ? lbl.svgBarcode
                            : `<div style="font-family:monospace;font-size:10px;padding:4px 0">${code}</div>`;
                          const demoMeta = [
                            lbl.patientBirthYear || (lbl.patientAge ? `${lbl.patientAge}T` : ""),
                            lbl.patientGender
                          ].filter(Boolean).join(" · ");
                          const tubeOrder = `Ống ${lbl.tubeIndex || idx + 1}/${lbl.totalTubes || labels.length}`;
                          const orderShort = lbl.orderNumber || "";
                          const testLine = lbl.testCodes || lbl.packageName || "Xét nghiệm";
                          const printedAt = lbl.printedAt || nowFallback;
                          const tubeText = lbl.tubeLabelVi || lbl.tube || "";
                          return `<div class="label-page">
                            <div class="row-top">
                              <div class="pt-name">${(lbl.patientName || "BỆNH NHÂN").toUpperCase()}${demoMeta ? ` <span class="pt-meta">(${demoMeta})</span>` : ""}</div>
                              <div class="tube-tag">${tubeText}</div>
                            </div>
                            <div class="row-sub">
                              <span>PID: <b>${lbl.patientId || "—"}</b></span>
                              <span>${orderShort ? `${orderShort} · ` : ""}<b>${tubeOrder}</b></span>
                            </div>
                            <div class="bc-wrap">${svg}</div>
                            <div class="bc-code">${code}</div>
                            <div class="row-foot">
                              <span class="tests">${testLine}</span>
                              <span class="ts">${printedAt}</span>
                            </div>
                          </div>`;
                        })
                        .join("");
                      const html = `<!DOCTYPE html><html lang="vi"><head><meta charset="utf-8"/>
                        <title>Tem_Ong_Mau_60x35mm_${batchCode || "BMS"}</title>
                        <style>
                          @page { size: 60mm 35mm; margin: 0; }
                          * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                          html, body { margin: 0; padding: 0; background: #fff; color: #000; font-family: "Segoe UI", Arial, sans-serif; }
                          .label-page {
                            width: 60mm;
                            height: 35mm;
                            padding: 1.8mm 2.2mm;
                            display: flex;
                            flex-direction: column;
                            justify-content: space-between;
                            overflow: hidden;
                            page-break-after: always;
                            break-after: page;
                          }
                          .label-page:last-child {
                            page-break-after: auto;
                            break-after: auto;
                          }
                          .row-top {
                            display: flex;
                            justify-content: space-between;
                            align-items: center;
                            gap: 2px;
                          }
                          .pt-name {
                            font-size: 8.2px;
                            font-weight: 800;
                            line-height: 1.15;
                            white-space: nowrap;
                            overflow: hidden;
                            text-overflow: ellipsis;
                          }
                          .pt-meta {
                            font-weight: 600;
                            font-size: 7.2px;
                          }
                          .tube-tag {
                            border: 1px solid #000;
                            padding: 0.5px 3px;
                            font-size: 6.8px;
                            font-weight: 800;
                            white-space: nowrap;
                            border-radius: 2px;
                          }
                          .row-sub {
                            display: flex;
                            justify-content: space-between;
                            font-family: Consolas, monospace;
                            font-size: 6.6px;
                            border-bottom: 0.6px dashed #000;
                            padding-bottom: 1px;
                          }
                          .bc-wrap {
                            display: flex;
                            justify-content: center;
                            align-items: center;
                            height: 14mm;
                            overflow: hidden;
                          }
                          .bc-wrap svg {
                            width: 100%;
                            max-width: 55mm;
                            height: 13.5mm;
                          }
                          .bc-code {
                            text-align: center;
                            font-family: Consolas, monospace;
                            font-size: 8px;
                            font-weight: 800;
                            letter-spacing: 0.3px;
                            line-height: 1.05;
                          }
                          .row-foot {
                            display: flex;
                            justify-content: space-between;
                            align-items: center;
                            gap: 4px;
                            border-top: 0.6px dashed #000;
                            padding-top: 1px;
                            font-size: 6.6px;
                          }
                          .tests {
                            font-weight: 700;
                            white-space: nowrap;
                            overflow: hidden;
                            text-overflow: ellipsis;
                            max-width: 39mm;
                          }
                          .ts {
                            font-family: Consolas, monospace;
                            white-space: nowrap;
                          }
                        </style></head><body>${stickers}</body></html>`;
                      try {
                        printHtmlDocument(html);
                      } catch {
                        setErrorMessage("Không mở được hộp thoại in. Thử lại nút In tem ống mẫu.");
                      }
                    }}
                  >
                    <Printer  size="1em"/> In tem ống mẫu 60×35mm ({barcodeData?.labels?.length || 0})
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
