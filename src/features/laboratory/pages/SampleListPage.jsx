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

  // Kỹ thuật viên / Điều dưỡng lấy mẫu đang đăng nhập
  const currentUser = useMemo(() => {
    try {
      const raw = localStorage.getItem("user") || localStorage.getItem("bms_user");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }, []);

  const collectorId = currentUser?.id || currentUser?._id || "";
  const collectorName = currentUser?.fullName || currentUser?.name || "Kỹ thuật viên trực ca";

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

  // Xác nhận tạo đợt gom mẫu
  const handleConfirmList = async () => {
    if (selectedAppointments.length === 0) {
      setErrorMessage("Vui lòng chọn ít nhất một bệnh nhân để đưa vào đợt lấy mẫu xét nghiệm.");
      return;
    }

    setSubmitting(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const payload = {
        appointmentIds: Array.from(selectedIds),
        location: location,
        targetTime: targetTime,
        collectorId: collectorId,
        collectorName: collectorName
      };

      const response = await createCollectionBatch(payload);
      const code = response?.data?.batchCode || `BAT-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-01`;
      const total = response?.data?.totalSpecimens ?? selectedAppointments.length;
      setBatchCode(code);
      setSuccessMessage(`Đã xác nhận thành công danh sách đợt lấy mẫu ${code} với tổng cộng ${total} ống bệnh phẩm.`);
    } catch (err) {
      console.error("Lỗi khi xác nhận danh sách lấy mẫu:", err);
      setErrorMessage("Không thể xác nhận danh sách lấy mẫu. Vui lòng kiểm tra lại kết nối máy chủ.");
    } finally {
      setSubmitting(false);
    }
  };

  // In mã vạch nhãn ống mẫu
  const handlePrintBarcodes = async () => {
    setLoadingBarcodes(true);
    setShowBarcodeModal(true);
    try {
      const data = await fetchBatchBarcodes(batchCode || "CURRENT-BATCH");
      setBarcodeData(data);
    } catch (err) {
      console.error("Lỗi khi tải mã vạch:", err);
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
    <div className="w-100 py-1">
      {/* Header Card */}
      <div className="bms-page-header-card mb-4">
        <div className="bms-page-header-content flex-column align-items-start">
          <div className="bms-page-title-row">
            <h1 className="bms-page-title">Danh sách lấy mẫu</h1>
          </div>
          <p className="text-muted small m-0 mt-1">
            Tổng hợp bệnh nhân đã tiếp đón, tạo đợt gom mẫu bệnh phẩm và in nhãn mã vạch.
          </p>
        </div>
        <div className="bms-page-actions">
          <button
            type="button"
            className="btn btn-outline-secondary btn-sm d-inline-flex align-items-center gap-1 rounded-pill px-3 text-nowrap"
            onClick={() => navigate(-1)}
          >
            <FaArrowLeft /> Quay lại
          </button>
        </div>
      </div>

      {/* Single-Line Filter Bar extracted above tables */}
      <div className="bms-filter-bar mb-3">
        <div className="bms-search-input-pill">
          <FaSearch className="bms-search-icon" />
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
              <FaTimes size={12} />
            </button>
          )}
        </div>
        <span className="bms-filter-meta">
          Đã chọn <strong>{selectedAppointments.length}</strong> / {filteredAppointments.length} bệnh nhân
        </span>
      </div>

      {/* Thông báo Alert */}
      {successMessage && (
        <div className="alert alert-success border-0 shadow-sm d-flex align-items-center justify-content-between p-3 mb-4 rounded-3">
          <div className="d-flex align-items-center gap-2">
            <FaCheckCircle className="text-success fs-5" />
            <div className="fw-medium">{successMessage}</div>
          </div>
          <button
            type="button"
            className="btn btn-sm btn-success d-inline-flex align-items-center gap-1 shadow-sm rounded-pill px-3 text-nowrap"
            onClick={handlePrintBarcodes}
          >
            <FaBarcode /> In ngay nhãn mã vạch
          </button>
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
          <section className="bms-table-standalone-section m-0 h-100 d-flex flex-column">
            <div className="bms-table-standalone-header">
              <div>
                <h2 className="bms-table-standalone-title">Bệnh nhân đã tiếp đón hôm nay</h2>
                <p className="bms-table-standalone-subtitle">Phụ trách lấy mẫu: {collectorName}</p>
              </div>
              <span className="badge bg-primary-subtle text-primary border border-primary-subtle rounded-pill px-2.5 py-1">
                {filteredAppointments.length} lượt
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
                    <th>Mã lịch hẹn</th>
                    <th>Họ tên bệnh nhân</th>
                    <th>Gói xét nghiệm</th>
                    <th className="text-end pe-3">Giờ hẹn</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan="5" className="text-center py-4 text-muted">
                        <FaSpinner className="fa-spin me-2" /> Đang tải danh sách tiếp đón...
                      </td>
                    </tr>
                  ) : filteredAppointments.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="text-center py-4 text-muted">
                        Không tìm thấy bệnh nhân tiếp đón nào phù hợp.
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
          </section>
        </div>

        {/* Cột phải: Danh sách ống mẫu & Thiết lập đợt lấy */}
        <div className="col-lg-7">
          {/* Standalone Table 1: Bảng danh sách ống mẫu được chọn */}
          <section className="bms-table-standalone-section mb-4">
            <div className="bms-table-standalone-header">
              <div>
                <h2 className="bms-table-standalone-title">
                  Chi tiết ống bệnh phẩm — Đợt: <span className="font-monospace text-primary">{batchCode || "Chưa tạo mã"}</span>
                </h2>
                <p className="bms-table-standalone-subtitle">Các ống mẫu dự kiến tạo mã vạch cho đợt lấy mẫu</p>
              </div>
              <span className="badge bg-primary-subtle text-primary border border-primary-subtle rounded-pill px-2.5 py-1">
                {selectedAppointments.length} ống mẫu
              </span>
            </div>

            <div className="bms-table-standalone-body">
              <table className="table table-hover align-middle mb-0 table-sm">
                <thead className="table-light text-muted small text-uppercase">
                  <tr>
                    <th style={{ width: "36px" }} className="ps-3">#</th>
                    <th>Mã ống mẫu (Dự kiến)</th>
                    <th>Bệnh nhân</th>
                    <th>Loại ống / Chất chống đông</th>
                    <th className="pe-3">Người lấy mẫu</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedAppointments.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="text-center py-4 text-muted">
                        Chưa có bệnh nhân nào được chọn cho đợt này. Vui lòng chọn từ danh sách bên trái.
                      </td>
                    </tr>
                  ) : (
                    selectedAppointments.map((apt, index) => {
                      const specimenId = `SPC-${new Date().toISOString().slice(2, 10).replace(/-/g, '')}-A1-${String(89 + index).padStart(4, "0")}`;
                      const tubesList = Array.isArray(apt?.tubes) ? apt.tubes : ["EDTA", "Serum"];
                      return (
                        <tr key={apt.appointmentId || index}>
                          <td className="text-muted small ps-3">{index + 1}</td>
                          <td>
                            <code className="text-primary fw-semibold small bg-light px-1 py-0.5 rounded">
                              {specimenId}
                            </code>
                          </td>
                          <td className="fw-semibold text-dark">
                            {apt.patientName}
                          </td>
                          <td>
                            <div className="d-flex gap-1 flex-wrap">
                              {tubesList.map((tube, tIdx) => (
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
                          <td className="text-secondary small pe-3">
                            {collectorName}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {/* Card 2: Thiết lập thông tin đợt lấy mẫu */}
          <div className="card shadow-sm rounded-4 bg-white" style={{ border: "1px solid #E2E8F0" }}>
            <div className="card-header py-3 px-4 border-bottom" style={{ backgroundColor: "#F8FAFC", borderColor: "#E2E8F0" }}>
              <h5 className="mb-0 fw-bold fs-6 text-dark d-flex align-items-center gap-2">
                <FaMapMarkerAlt className="text-primary" />
                <span>Thiết lập địa điểm &amp; thời gian lấy mẫu</span>
              </h5>
            </div>
            <div className="card-body p-4">
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
                <button
                  type="button"
                  className="btn btn-primary d-inline-flex align-items-center gap-2 fw-semibold px-3 shadow-sm rounded-pill text-nowrap"
                  style={{ backgroundColor: "#1E60E6", borderColor: "#1E60E6" }}
                  disabled={submitting || selectedAppointments.length === 0}
                  onClick={handleConfirmList}
                >
                  <FaCheckCircle /> {submitting ? "Đang xác nhận..." : "Xác nhận đợt lấy mẫu"}
                </button>
                <button
                  type="button"
                  className="btn btn-outline-secondary d-inline-flex align-items-center gap-2 fw-semibold rounded-pill px-3 text-nowrap"
                  onClick={() => window.print()}
                >
                  <FaPrint /> In bảng kê mẫu
                </button>
                <button
                  type="button"
                  className="btn btn-outline-primary d-inline-flex align-items-center gap-2 fw-semibold rounded-pill px-3 text-nowrap"
                  onClick={handlePrintBarcodes}
                >
                  <FaBarcode /> In nhãn mã vạch
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal in mã vạch Barcode nhãn ống nghiệm */}
      {showBarcodeModal && (
        <div
          className="modal show d-block"
          style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
          tabIndex="-1"
        >
          <div className="modal-dialog modal-lg modal-dialog-centered">
            <div className="modal-content border-0 shadow-lg rounded-3">
              <div className="modal-header border-bottom py-3">
                <h5 className="modal-title fw-bold text-dark d-flex align-items-center gap-2">
                  <FaBarcode className="text-primary" /> Nhãn Mã Vạch Bệnh Phẩm (Code 128) — Đợt {batchCode || "Chưa tạo"}
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowBarcodeModal(false)}
                />
              </div>
              <div className="modal-body p-2" style={{ maxHeight: "65vh", overflowY: "auto" }}>
                {loadingBarcodes ? (
                  <div className="text-center py-2 text-muted">
                    <FaSpinner className="fa-spin me-2" /> Đang tạo dữ liệu mã vạch tiêu chuẩn...
                  </div>
                ) : !barcodeData || !Array.isArray(barcodeData.labels) || barcodeData.labels.length === 0 ? (
                  <div className="text-center py-2 text-muted">
                    <FaBarcode className="fs-1 text-secondary opacity-50 mb-2" />
                    <p>Chưa có nhãn mã vạch nào khả dụng cho đợt gom mẫu này.</p>
                  </div>
                ) : (
                  <div className="row g-3">
                    {(Array.isArray(barcodeData?.labels) ? barcodeData.labels : []).map((lbl, idx) => (
                      <div key={idx} className="col-md-6">
                        <div className="p-3 border rounded-3 bg-white shadow-sm text-center">
                          <div className="d-flex justify-content-between align-items-center mb-1">
                            <span className="fw-bold text-dark small">{lbl.patientName}</span>
                            <span className="badge bg-secondary">{lbl.tube}</span>
                          </div>
                          <div className="text-muted small mb-2">{lbl.packageName}</div>
                          <div
                            dangerouslySetInnerHTML={{ __html: lbl.svgBarcode }}
                            className="d-flex justify-content-center"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="modal-footer border-top py-2">
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={() => setShowBarcodeModal(false)}
                >
                  Đóng
                </button>
                <button
                  type="button"
                  className="btn btn-primary d-flex align-items-center gap-1 shadow-sm"
                  onClick={() => window.print()}
                >
                  <FaPrint /> In Toàn Bộ Nhãn
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
