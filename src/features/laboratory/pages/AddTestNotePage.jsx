/**
 * @file AddTestNotePage.jsx
 * @description Quản lý ghi chú kỹ thuật xét nghiệm và lưu vết kiểm toán mẫu bệnh phẩm (UC52 / Add Test Notes).
 * Tuân thủ: Tiêu chuẩn ISO 15189:2022, Clean Medical Standard (Rule 19) & AGENTS-CODE.md.
 */

import React, { useState, useEffect, useMemo } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  FaSave,
  FaArrowLeft,
  FaExclamationTriangle,
  FaCheckCircle,
  FaInfoCircle,
  FaVial,
  FaTag,
  FaBold,
  FaItalic,
  FaUnderline,
  FaListUl,
  FaClock,
  FaSearch,
  FaShieldAlt,
  FaUserMd,
  FaSpinner
} from "react-icons/fa";
import {
  fetchSpecimenContext,
  fetchNotesBySpecimen,
  createTestNote,
  fetchAvailableSpecimens
} from "../api/testNoteApi";

export default function AddTestNotePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialSpecimenId = searchParams.get("specimenId") || searchParams.get("sampleId") || "";

  // Người dùng hiện tại
  const currentUser = useMemo(() => {
    try {
      const raw = localStorage.getItem("user") || localStorage.getItem("bms_user");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }, []);

  const technicianName = currentUser?.fullName || currentUser?.name || "KTV. Lê Minh Tuấn";

  // State thông tin mẫu và lựa chọn
  const [specimenInput, setSpecimenInput] = useState(initialSpecimenId);
  const [selectedSpecimenId, setSelectedSpecimenId] = useState(initialSpecimenId);
  const [specimenContext, setSpecimenContext] = useState(null);
  const [availableSpecimens, setAvailableSpecimens] = useState([]);
  const [existingNotes, setExistingNotes] = useState([]);

  // Form inputs
  const [noteType, setNoteType] = useState("Quan sát kỹ thuật (Technical observation)");
  const [visibility, setVisibility] = useState("Internal"); // "Internal" | "Report"
  const [tags, setTags] = useState("");
  const [content, setContent] = useState("");

  // Trạng thái xử lý
  const [loadingContext, setLoadingContext] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  // Tải danh sách mẫu khả dụng
  useEffect(() => {
    let isMounted = true;
    const loadSpecimens = async () => {
      try {
        const list = await fetchAvailableSpecimens();
        if (isMounted) {
          setAvailableSpecimens(Array.isArray(list) ? list : []);
        }
      } catch {
        if (isMounted) setAvailableSpecimens([]);
      }
    };
    loadSpecimens();
    return () => { isMounted = false; };
  }, []);

  // Tải bối cảnh mẫu khi selectedSpecimenId thay đổi
  useEffect(() => {
    if (!selectedSpecimenId) {
      setSpecimenContext(null);
      setExistingNotes([]);
      return;
    }

    let isMounted = true;
    setLoadingContext(true);
    setErrorMessage("");

    const loadContext = async () => {
      try {
        const ctx = await fetchSpecimenContext(selectedSpecimenId);
        if (isMounted) {
          if (ctx) {
            setSpecimenContext(ctx);
            setExistingNotes(Array.isArray(ctx.existingNotes) ? ctx.existingNotes : []);
          } else {
            const notes = await fetchNotesBySpecimen(selectedSpecimenId);
            setExistingNotes(Array.isArray(notes) ? notes : []);
          }
        }
      } catch {
        if (isMounted) {
          setErrorMessage("Không thể tải bối cảnh mẫu xét nghiệm từ máy chủ.");
          setExistingNotes([]);
        }
      } finally {
        if (isMounted) {
          setLoadingContext(false);
        }
      }
    };

    loadContext();
    return () => { isMounted = false; };
  }, [selectedSpecimenId]);

  const handleLookup = (e) => {
    e?.preventDefault();
    const cleaned = specimenInput.trim();
    if (cleaned) {
      setSelectedSpecimenId(cleaned);
    }
  };

  const handleFormat = (wrapperPrefix, wrapperSuffix = wrapperPrefix) => {
    setContent((prev) => `${prev}${wrapperPrefix}nội dung ghi chú${wrapperSuffix}`);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSuccessMessage("");
    setErrorMessage("");

    const targetSpecimen = selectedSpecimenId.trim();
    if (!targetSpecimen) {
      setErrorMessage("Vui lòng quét hoặc nhập Mã Barcode ống mẫu xét nghiệm.");
      return;
    }

    if (!content.trim()) {
      setErrorMessage("Nội dung ghi chú kỹ thuật không được để trống.");
      return;
    }

    const tagList = tags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    setSubmitting(true);
    try {
      const payload = {
        specimenId: targetSpecimen,
        noteType,
        visibility,
        isInternalOnly: visibility === "Internal",
        printOnReport: visibility === "Report",
        tags: tagList,
        content: content.trim(),
        createdByUserName: technicianName
      };

      const response = await createTestNote(payload);

      if (response?.success) {
        setSuccessMessage("Đã lưu ghi chú kỹ thuật thành công vào hồ sơ kiểm toán mẫu ISO 15189.");
        setContent("");
        setTags("");

        const refreshedNotes = await fetchNotesBySpecimen(targetSpecimen);
        setExistingNotes(Array.isArray(refreshedNotes) ? refreshedNotes : []);
      } else {
        setErrorMessage(response?.message || "Không thể lưu ghi chú xét nghiệm.");
      }
    } catch (err) {
      setErrorMessage(err.response?.data?.message || err.message || "Lỗi khi gửi ghi chú xét nghiệm.");
    } finally {
      setSubmitting(false);
    }
  };

  const safeAvailableSpecimens = Array.isArray(availableSpecimens) ? availableSpecimens : [];
  const safeExistingNotes = Array.isArray(existingNotes) ? existingNotes : [];

  return (
    <div className="container-fluid py-4 px-md-4" style={{ maxWidth: "1400px", minHeight: "100vh" }}>
      {/* Tiêu đề & Hành động đầu trang */}
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 pb-2 border-bottom" style={{ borderColor: 'rgba(15, 23, 42, 0.05)' }}>
        <div>
          <nav aria-label="breadcrumb">
            <ol className="breadcrumb mb-1 text-muted small">
              <li className="breadcrumb-item">
                <Link to="/lab/queue" className="text-decoration-none" style={{ color: '#648CF4' }}>Phòng xét nghiệm</Link>
              </li>
              <li className="breadcrumb-item">
                <Link to="/laboratory/samples" className="text-decoration-none" style={{ color: '#648CF4' }}>Mẫu bệnh phẩm</Link>
              </li>
              <li className="breadcrumb-item active fw-semibold" style={{ color: '#648CF4' }} aria-current="page">
                Ghi chú kỹ thuật
              </li>
            </ol>
          </nav>
          <div className="d-flex align-items-center gap-2">
            <h2 className="h4 fw-bold mb-0 d-flex align-items-center gap-2" style={{ color: '#2B3674' }}>
              <FaShieldAlt style={{ color: '#648CF4' }} />
              <span>Ghi Chú Kỹ Thuật Xét Nghiệm (Add Test Note)</span>
            </h2>
            <span className="badge rounded-pill px-3 py-1 fw-semibold" style={{ backgroundColor: 'rgba(94,133,230,0.1)', color: '#648CF4', border: '1px solid rgba(94,133,230,0.2)' }}>
              Tiêu chuẩn ISO 15189:2022
            </span>
          </div>
          <small className="text-muted">
            Ghi nhận tình trạng ống mẫu (tán huyết nhẹ, đục mỡ, đông dây), cảnh báo máy phân tích hoặc trao đổi với Bác sĩ điều trị.
          </small>
        </div>

        <div className="d-flex align-items-center gap-2 mt-3 mt-md-0">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="btn btn-outline-secondary btn-sm px-3 shadow-sm rounded-pill"
            style={{ borderColor: 'rgba(15, 23, 42, 0.05)' }}
          >
            <FaArrowLeft className="me-1" /> Quay lại
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="btn btn-sm px-4 fw-semibold shadow-sm d-flex align-items-center gap-1 rounded-pill"
            style={{ backgroundColor: '#648CF4', borderColor: '#648CF4', color: '#ffffff' }}
          >
            {submitting ? <FaSpinner className="fa-spin" /> : <FaSave />}
            <span>{submitting ? "Đang lưu..." : "Lưu Ghi Chú"}</span>
          </button>
        </div>
      </div>

      {/* Thông báo Alert */}
      {successMessage && (
        <div className="alert alert-success alert-dismissible fade show d-flex align-items-center mb-4 border-0 shadow-sm rounded-3" role="alert">
          <FaCheckCircle className="flex-shrink-0 me-2" size={18} />
          <div className="fw-medium">{successMessage}</div>
          <button type="button" className="btn-close" onClick={() => setSuccessMessage("")} aria-label="Close"></button>
        </div>
      )}

      {errorMessage && (
        <div className="alert alert-danger alert-dismissible fade show d-flex align-items-center mb-4 border-0 shadow-sm rounded-3" role="alert">
          <FaExclamationTriangle className="flex-shrink-0 me-2" size={18} />
          <div>{errorMessage}</div>
          <button type="button" className="btn-close" onClick={() => setErrorMessage("")} aria-label="Close"></button>
        </div>
      )}

      <div className="row g-4">
        {/* Cột trái: Thông tin mẫu & Thiết lập loại ghi chú */}
        <div className="col-lg-5">
          <div className="card shadow-sm border-0 h-100 bg-white rounded-3">
            <div className="card-header bg-white py-3 border-bottom">
              <h5 className="card-title mb-0 fw-bold text-dark d-flex align-items-center gap-2 fs-6">
                <FaVial className="text-primary" />
                <span>Bối Cảnh Mẫu Xét Nghiệm (Specimen Context)</span>
              </h5>
            </div>
            <div className="card-body p-4">
              {/* Ô nhập / Quét mã vạch */}
              <div className="mb-3">
                <label className="form-label fw-semibold small text-secondary">
                  Mã Barcode / Định Danh Ống Mẫu <span className="text-danger">*</span>
                </label>
                <div className="input-group mb-2">
                  <input
                    type="text"
                    className="form-control"
                    placeholder="VD: BC-20261011-0004 hoặc SMP-004..."
                    value={specimenInput}
                    onChange={(e) => setSpecimenInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleLookup(e)}
                  />
                  <button
                    type="button"
                    onClick={handleLookup}
                    disabled={loadingContext}
                    className="btn btn-outline-primary d-flex align-items-center gap-1"
                  >
                    {loadingContext ? <FaSpinner className="fa-spin" /> : <FaSearch />}
                    <span>{loadingContext ? "Đang tải..." : "Tra cứu"}</span>
                  </button>
                </div>

                {safeAvailableSpecimens.length > 0 && (
                  <select
                    className="form-select form-select-sm"
                    value={selectedSpecimenId}
                    onChange={(e) => {
                      const val = e.target.value;
                      setSelectedSpecimenId(val);
                      setSpecimenInput(val);
                    }}
                  >
                    <option value="">-- Hoặc chọn nhanh từ hàng đợi phòng Lab --</option>
                    {safeAvailableSpecimens.map((s, idx) => (
                      <option key={s.id || s.barcode || idx} value={s.barcode || s.id}>
                        {s.barcode || s.id} &mdash; {s.patientName || "Bệnh nhân"} ({s.testPackageName || s.sampleType || "Bệnh phẩm"})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Bảng hiển thị thông tin bệnh phẩm */}
              {specimenContext ? (
                <div className="p-3 mb-4 rounded-3 border bg-light">
                  <div className="row g-2 small">
                    <div className="col-4 text-secondary fw-semibold">Mã Barcode:</div>
                    <div className="col-8 font-monospace fw-bold text-primary">
                      {specimenContext.sampleBarcode || specimenContext.specimenId}
                    </div>

                    <div className="col-4 text-secondary fw-semibold">Bệnh nhân:</div>
                    <div className="col-8 fw-semibold text-dark">
                      {specimenContext.patientName || "—"}
                    </div>

                    <div className="col-4 text-secondary fw-semibold">Gói chỉ định:</div>
                    <div className="col-8 text-dark">
                      {specimenContext.testPackageName || "Xét nghiệm lâm sàng"}
                    </div>

                    <div className="col-4 text-secondary fw-semibold">Trạng thái:</div>
                    <div className="col-8">
                      <span className="badge bg-primary-subtle text-primary border border-primary-subtle px-2 py-1">
                        {specimenContext.status || "Received"}
                      </span>
                    </div>
                  </div>
                </div>
              ) : selectedSpecimenId ? (
                <div className="p-3 mb-4 rounded-3 border bg-light text-muted small">
                  <FaInfoCircle className="me-1 text-info" />
                  Đang thao tác với mã Barcode: <strong className="font-monospace text-dark">{selectedSpecimenId}</strong>
                </div>
              ) : (
                <div className="p-3 mb-4 rounded-3 border bg-light text-muted small">
                  <FaInfoCircle className="me-1 text-secondary" />
                  Vui lòng quét hoặc chọn ống mẫu để hiển thị thông tin bệnh nhân.
                </div>
              )}

              {/* Lựa chọn loại ghi chú chuẩn y khoa */}
              <div className="mb-3">
                <label className="form-label fw-semibold small text-secondary">
                  Phân Loại Ghi Chú (Note Category) <span className="text-danger">*</span>
                </label>
                <select
                  className="form-select"
                  value={noteType}
                  onChange={(e) => setNoteType(e.target.value)}
                >
                  <option value="Quan sát kỹ thuật (Technical observation)">Quan sát kỹ thuật (Technical observation)</option>
                  <option value="Tình trạng bệnh phẩm: Tán huyết nhẹ / Đục mỡ / Đông dây">Tình trạng bệnh phẩm: Tán huyết nhẹ / Đục mỡ / Đông dây</option>
                  <option value="Cảnh báo máy phân tích tự động (Analyzer instrument note)">Cảnh báo máy phân tích tự động (Analyzer instrument note)</option>
                  <option value="Ghi chú hóa chất / Thuốc thử (Reagent note)">Ghi chú hóa chất / Thuốc thử (Reagent note)</option>
                  <option value="Vấn đề kiểm chuẩn nội kiểm IQC (QC concern)">Vấn đề kiểm chuẩn nội kiểm IQC (QC concern)</option>
                  <option value="Nhật ký trao đổi với Bác sĩ lâm sàng (Clinical communication log)">Nhật ký trao đổi với Bác sĩ lâm sàng (Clinical communication log)</option>
                </select>
              </div>

              {/* Tùy chọn phạm vi hiển thị */}
              <div className="mb-3">
                <label className="form-label fw-semibold small text-secondary d-block">
                  Phạm Vi Hiển Thị (Visibility)
                </label>
                <div className="form-check mb-2">
                  <input
                    className="form-check-input"
                    type="radio"
                    name="noteVisibility"
                    id="visInternal"
                    value="Internal"
                    checked={visibility === "Internal"}
                    onChange={(e) => setVisibility(e.target.value)}
                  />
                  <label className="form-check-label text-dark small" htmlFor="visInternal">
                    <strong>Chỉ lưu hành nội bộ phòng Lab (Internal only)</strong> &mdash; Không hiển thị trên phiếu trả bệnh nhân.
                  </label>
                </div>
                <div className="form-check">
                  <input
                    className="form-check-input"
                    type="radio"
                    name="noteVisibility"
                    id="visReport"
                    value="Report"
                    checked={visibility === "Report"}
                    onChange={(e) => setVisibility(e.target.value)}
                  />
                  <label className="form-check-label text-dark small" htmlFor="visReport">
                    <strong>In trên phiếu kết quả trả Bệnh nhân (Print on report)</strong> &mdash; Bác sĩ và bệnh nhân xem được lưu ý này.
                  </label>
                </div>
              </div>

              {/* Gắn thẻ Tags */}
              <div className="mb-3">
                <label className="form-label fw-semibold small text-secondary">
                  Thẻ Phân Loại (Tags)
                </label>
                <div className="input-group">
                  <span className="input-group-text bg-white text-muted">
                    <FaTag size={12} />
                  </span>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="VD: rerun, tan_huyet_nhe, kem_loai_2, goi_bac_si..."
                    value={tags}
                    onChange={(e) => setTags(e.target.value)}
                  />
                </div>
                <div className="form-text small text-muted">
                  Phân cách các thẻ bằng dấu phẩy.
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Cột phải: Nội dung ghi chú & Dòng thời gian lịch sử */}
        <div className="col-lg-7">
          {/* Card Soạn thảo nội dung */}
          <div className="card shadow-sm border-0 mb-4 bg-white rounded-3">
            <div className="card-header bg-white py-3 border-bottom d-flex justify-content-between align-items-center">
              <h5 className="card-title mb-0 fw-bold text-dark fs-6">
                Nội Dung Ghi Chú Chuyên Môn <span className="text-danger">*</span>
              </h5>
              <span className="badge bg-light text-dark border">
                KTV thực hiện: {technicianName}
              </span>
            </div>
            <div className="card-body p-4">
              {/* Thanh công cụ định dạng nhanh */}
              <div className="btn-toolbar p-1 mb-2 bg-light rounded border gap-1">
                <button
                  type="button"
                  onClick={() => handleFormat("**")}
                  className="btn btn-sm btn-outline-secondary border-0"
                  title="In đậm"
                >
                  <FaBold size={12} />
                </button>
                <button
                  type="button"
                  onClick={() => handleFormat("*")}
                  className="btn btn-sm btn-outline-secondary border-0"
                  title="In nghiêng"
                >
                  <FaItalic size={12} />
                </button>
                <button
                  type="button"
                  onClick={() => handleFormat("<u>", "</u>")}
                  className="btn btn-sm btn-outline-secondary border-0"
                  title="Gạch chân"
                >
                  <FaUnderline size={12} />
                </button>
                <span className="border-start mx-1 my-1"></span>
                <button
                  type="button"
                  onClick={() => handleFormat("\n- ")}
                  className="btn btn-sm btn-outline-secondary border-0"
                  title="Danh sách gạch đầu dòng"
                >
                  <FaListUl size={12} />
                </button>
              </div>

              <textarea
                className="form-control"
                rows={7}
                placeholder="Mô tả cụ thể quan sát tiền phân tích, mức độ tán huyết nhẹ, cảnh báo sensor đo, lý do chạy lại kiểm chứng hoặc xác nhận đã gọi điện cho Bác sĩ điều trị..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                style={{ resize: "vertical" }}
              />
            </div>
          </div>

          {/* Card Lịch sử ghi chú đã lưu (Audit Trail) */}
          <div className="card shadow-sm border-0 bg-white rounded-3">
            <div className="card-header bg-white py-3 border-bottom d-flex justify-content-between align-items-center">
              <h5 className="card-title mb-0 fw-bold text-dark fs-6 d-flex align-items-center gap-2">
                <FaClock className="text-primary" />
                <span>Lịch Sử Ghi Chú Đã Lưu Trên Ống Mẫu (Audit Trail)</span>
              </h5>
              <span className="badge bg-secondary-subtle text-secondary border">
                {safeExistingNotes.length} bản ghi
              </span>
            </div>
            <div className="card-body p-3">
              {safeExistingNotes.length === 0 ? (
                <div className="text-center py-4 text-muted small">
                  <FaClock className="mb-2 d-block mx-auto text-secondary" size={24} />
                  Chưa có ghi chú chuyên môn nào được lưu cho mẫu xét nghiệm này.
                </div>
              ) : (
                <div className="timeline-list">
                  {safeExistingNotes.map((item, idx) => (
                    <div key={item.id || idx} className="border-start border-2 border-primary ps-3 pb-3 position-relative mb-2">
                      <div
                        className="position-absolute bg-primary rounded-circle"
                        style={{ width: "8px", height: "8px", left: "-5px", top: "5px" }}
                      />
                      <div className="d-flex justify-content-between align-items-center mb-1">
                        <span className="badge bg-light text-dark border small fw-semibold">
                          {item.noteType || "Quan sát"}
                        </span>
                        <small className="text-muted">
                          {item.createdAt ? new Date(item.createdAt).toLocaleString('vi-VN') : "Vừa xong"}
                        </small>
                      </div>

                      <div className="text-dark small mb-1" style={{ whiteSpace: "pre-wrap" }}>
                        {item.content}
                      </div>

                      <div className="d-flex flex-wrap align-items-center gap-1 text-muted small" style={{ fontSize: "0.8rem" }}>
                        <span>Bởi: <strong>{item.createdByUserName || "KTV Lab"}</strong></span>
                        {item.printOnReport && (
                          <span className="badge bg-info-subtle text-info border border-info-subtle ms-2">
                            In trên kết quả bệnh nhân
                          </span>
                        )}
                        {(Array.isArray(item.tags) ? item.tags : []).map((t, tIdx) => (
                          <span key={tIdx} className="badge bg-secondary-subtle text-secondary">
                            #{t}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
