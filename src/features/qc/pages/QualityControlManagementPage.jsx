/**
 * @file QualityControlManagementPage.jsx
 * @description Laboratory Internal Quality Control (IQC) Management & Interactive Levey-Jennings Visual Charts (UC73 / Issue #I3-077).
 * Implements CLSI C24-A3 / ISO 15189 multi-rule Westgard evaluation (1_2s, 1_3s, 2_2s, R_4s, 4_1s, 10_x),
 * analyzer batch lockout prevention, corrective action sign-offs, and lot CRUD workflows.
 * Conforms to: Production Standards, Medical Lab Excellence & AGENTS-DESIGN.md.
 */

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
    FaVial,
    FaChartLine,
    FaExclamationTriangle,
    FaCheckCircle,
    FaPlus,
    FaLock,
    FaUnlock,
    FaSync,
    FaCheck,
    FaTimes,
    FaUserCheck,
    FaSearch,
    FaHistory,
    FaMicroscope,
    FaInfoCircle,
    FaShieldAlt
} from "react-icons/fa";
import {
    fetchQcLots,
    createQcLot,
    toggleQcLotStatus,
    recordQcRun,
    fetchLeveyJenningsData,
    signoffCorrectiveAction,
    fetchQcDashboardSummary,
    fetchQcFlags
} from "../api/qcApi";

export default function QualityControlManagementPage() {
    // Top-level states
    const [lots, setLots] = useState([]);
    const [selectedLotId, setSelectedLotId] = useState("");
    const [ljData, setLjData] = useState(null);
    const [summary, setSummary] = useState({
        activeLotsCount: 0,
        runsTodayCount: 0,
        inControlRate: 100,
        activeWarningsCount: 0,
        activeRejectionsCount: 0,
        lockedAnalyzersCount: 0
    });
    const [flags, setFlags] = useState([]);
    const [activeTab, setActiveTab] = useState("chart"); // 'chart' | 'lots' | 'flags'
    const [isLoading, setIsLoading] = useState(false);

    // Record Run Modal / Form State
    const [showRecordModal, setShowRecordModal] = useState(false);
    const [measuredValue, setMeasuredValue] = useState("");
    const [operatorName, setOperatorName] = useState("Nguyễn Tấn Phát (KTV Lab)");
    const [recordResult, setRecordResult] = useState(null);
    const [isRecording, setIsRecording] = useState(false);

    // Create Lot Modal State
    const [showCreateLotModal, setShowCreateLotModal] = useState(false);
    const [newLotForm, setNewLotForm] = useState({
        lotNumber: "",
        controlName: "",
        analyteName: "Glucose",
        instrumentId: "ROCHE-COBAS-C501",
        manufacturer: "Bio-Rad Laboratories",
        level: 1,
        targetMean: "",
        targetStandardDeviation: "",
        unit: "mmol/L"
    });
    const [isCreatingLot, setIsCreatingLot] = useState(false);

    // Signoff Modal State
    const [showSignoffModal, setShowSignoffModal] = useState(false);
    const [selectedRunForSignoff, setSelectedRunForSignoff] = useState(null);
    const [correctiveActionNotes, setCorrectiveActionNotes] = useState("");
    const [isSigningOff, setIsSigningOff] = useState(false);

    // Load initial data
    const loadLotsAndSummary = useCallback(async () => {
        setIsLoading(true);
        try {
            const [lotList, summaryData, flagsData] = await Promise.all([
                fetchQcLots(),
                fetchQcDashboardSummary(),
                fetchQcFlags()
            ]);
            setLots(lotList);
            setSummary(summaryData);
            setFlags(flagsData);

            if (lotList.length > 0 && !selectedLotId) {
                setSelectedLotId(lotList[0].id);
            }
        } catch (error) {
            console.error("Failed to load QC data:", error);
        } finally {
            setIsLoading(false);
        }
    }, [selectedLotId]);

    // Load Levey-Jennings Chart Data for selected lot
    const loadLeveyJennings = useCallback(async (lotId) => {
        if (!lotId) return;
        try {
            const data = await fetchLeveyJenningsData(lotId);
            setLjData(data);
        } catch (error) {
            console.error("Failed to load Levey-Jennings data:", error);
        }
    }, []);

    useEffect(() => {
        loadLotsAndSummary();
    }, [loadLotsAndSummary]);

    useEffect(() => {
        if (selectedLotId) {
            loadLeveyJennings(selectedLotId);
        }
    }, [selectedLotId, loadLeveyJennings]);

    // Handle recording QC run
    const handleRecordRun = async (e) => {
        e.preventDefault();
        if (!selectedLotId || !measuredValue) return;

        setIsRecording(true);
        setRecordResult(null);
        try {
            const res = await recordQcRun({
                lotId: selectedLotId,
                measuredValue: parseFloat(measuredValue),
                operatorName
            });
            setRecordResult(res);
            setMeasuredValue("");
            await loadLeveyJennings(selectedLotId);
            await loadLotsAndSummary();
        } catch (err) {
            alert(err.message);
        } finally {
            setIsRecording(false);
        }
    };

    // Handle create new QC Lot
    const handleCreateLot = async (e) => {
        e.preventDefault();
        setIsCreatingLot(true);
        try {
            const created = await createQcLot(newLotForm);
            setShowCreateLotModal(false);
            setNewLotForm({
                lotNumber: "",
                controlName: "",
                analyteName: "Glucose",
                instrumentId: "ROCHE-COBAS-C501",
                manufacturer: "Bio-Rad Laboratories",
                level: 1,
                targetMean: "",
                targetStandardDeviation: "",
                unit: "mmol/L"
            });
            await loadLotsAndSummary();
            setSelectedLotId(created.id);
        } catch (err) {
            alert(err.message);
        } finally {
            setIsCreatingLot(false);
        }
    };

    // Handle toggle lot status
    const handleToggleStatus = async (lotId) => {
        try {
            await toggleQcLotStatus(lotId);
            await loadLotsAndSummary();
        } catch (err) {
            alert(err.message);
        }
    };

    // Handle signoff corrective action
    const handleSignoff = async (e) => {
        e.preventDefault();
        if (!selectedRunForSignoff) return;

        setIsSigningOff(true);
        try {
            await signoffCorrectiveAction(selectedRunForSignoff.runId || selectedRunForSignoff.id, {
                operatorName,
                correctiveAction: correctiveActionNotes
            });
            setShowSignoffModal(false);
            setSelectedRunForSignoff(null);
            setCorrectiveActionNotes("");
            await loadLeveyJennings(selectedLotId);
            await loadLotsAndSummary();
        } catch (err) {
            alert(err.message);
        } finally {
            setIsSigningOff(false);
        }
    };

    // SVG Levey-Jennings Chart Rendering calculations
    const chartRenderData = useMemo(() => {
        if (!ljData || !ljData.points || ljData.points.length === 0) return null;

        const { mean, sd, points } = ljData;
        const width = 850;
        const height = 360;
        const padding = { top: 30, right: 40, bottom: 40, left: 60 };
        const plotWidth = width - padding.left - padding.right;
        const plotHeight = height - padding.top - padding.bottom;

        // Y-axis spans from -3.5s to +3.5s
        const yMin = mean - 3.5 * sd;
        const yMax = mean + 3.5 * sd;

        const getY = (val) => {
            const clamped = Math.max(yMin, Math.min(yMax, val));
            return padding.top + plotHeight - ((clamped - yMin) / (yMax - yMin)) * plotHeight;
        };

        const getX = (index) => {
            if (points.length <= 1) return padding.left + plotWidth / 2;
            return padding.left + (index / (points.length - 1)) * plotWidth;
        };

        const lines = [
            { label: "+3s", value: mean + 3 * sd, color: "#dc2626", dash: "none", strokeWidth: 1.5 },
            { label: "+2s", value: mean + 2 * sd, color: "#f59e0b", dash: "4 4", strokeWidth: 1.2 },
            { label: "+1s", value: mean + 1 * sd, color: "#93c5fd", dash: "2 2", strokeWidth: 1 },
            { label: "Mean (x̄)", value: mean, color: "#1e293b", dash: "none", strokeWidth: 2 },
            { label: "-1s", value: mean - 1 * sd, color: "#93c5fd", dash: "2 2", strokeWidth: 1 },
            { label: "-2s", value: mean - 2 * sd, color: "#f59e0b", dash: "4 4", strokeWidth: 1.2 },
            { label: "-3s", value: mean - 3 * sd, color: "#dc2626", dash: "none", strokeWidth: 1.5 }
        ];

        const coords = points.map((p, idx) => ({
            ...p,
            x: getX(idx),
            y: getY(p.measuredValue)
        }));

        const polylinePoints = coords.map(c => `${c.x},${c.y}`).join(" ");

        return { width, height, padding, lines, coords, polylinePoints, getY };
    }, [ljData]);

    return (
        <div className="container-fluid py-4 px-xl-5" style={{ minHeight: "90vh", background: "#f8fafc" }}>
            {/* Header Ribbon */}
            <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 pb-3 border-bottom">
                <div>
                    <div className="d-flex align-items-center gap-2">
                        <span className="badge bg-primary px-3 py-2 fs-6">UC73</span>
                        <h2 className="h3 mb-0 fw-bold text-slate-800">Kiểm Chuẩn Chất Lượng Xét Nghiệm (IQC) &amp; Đánh Giá Đa Quy Tắc Westgard</h2>
                    </div>
                    <p className="text-muted small mt-1 mb-0">
                        Quản lý hồ sơ lô kiểm chuẩn (QC Lots), biểu đồ Levey-Jennings trực quan, tự động phát hiện lỗi ngẫu nhiên và hệ thống theo luật Westgard (1_2s, 1_3s, 2_2s, R_4s, 4_1s, 10_x) và khóa máy khi vi phạm.
                    </p>
                </div>

                <div className="d-flex align-items-center gap-2 mt-3 mt-md-0">
                    <button
                        className="btn btn-outline-primary btn-sm d-flex align-items-center gap-1 shadow-sm"
                        onClick={() => setShowCreateLotModal(true)}
                        id="btn-create-qc-lot"
                    >
                        <FaPlus /> Khởi tạo lô QC
                    </button>
                    <button
                        className="btn btn-success btn-sm d-flex align-items-center gap-1 shadow-sm"
                        onClick={() => setShowRecordModal(true)}
                        id="btn-record-qc-run"
                    >
                        <FaVial /> Nhập kết quả chạy QC
                    </button>
                    <button
                        className="btn btn-primary btn-sm d-flex align-items-center gap-1 shadow-sm"
                        onClick={loadLotsAndSummary}
                        disabled={isLoading}
                    >
                        <FaSync className={isLoading ? "fa-spin" : ""} /> Làm mới
                    </button>
                </div>
            </div>

            {/* KPI Surveillance Ribbon */}
            <div className="row g-3 mb-4">
                {/* In-Control Rate */}
                <div className="col-12 col-sm-6 col-xl-3">
                    <div className="card border-0 shadow-sm rounded-3 p-3 bg-white h-100 border-start border-success border-4">
                        <div className="d-flex justify-content-between align-items-center">
                            <span className="text-muted small fw-semibold text-uppercase">Tỷ Lệ Đạt Chuẩn IQC</span>
                            <span className="badge bg-success-subtle text-success">CLSI C24-A3</span>
                        </div>
                        <div className="fs-2 fw-bold text-success mt-1">{summary.inControlRate}%</div>
                        <div className="small text-muted mt-1">Đảm bảo độ tin cậy mẫu bệnh nhân</div>
                    </div>
                </div>

                {/* Active Lots */}
                <div className="col-12 col-sm-6 col-xl-3">
                    <div className="card border-0 shadow-sm rounded-3 p-3 bg-white h-100 border-start border-primary border-4">
                        <div className="d-flex justify-content-between align-items-center">
                            <span className="text-muted small fw-semibold text-uppercase">Số Lô QC Đang Dùng</span>
                            <span className="badge bg-primary-subtle text-primary">Active</span>
                        </div>
                        <div className="fs-2 fw-bold text-primary mt-1">{summary.activeLotsCount} lô</div>
                        <div className="small text-muted mt-1">Tất cả các bộ phân tích</div>
                    </div>
                </div>

                {/* Westgard Warnings */}
                <div className="col-12 col-sm-6 col-xl-3">
                    <div className="card border-0 shadow-sm rounded-3 p-3 bg-white h-100 border-start border-warning border-4">
                        <div className="d-flex justify-content-between align-items-center">
                            <span className="text-muted small fw-semibold text-uppercase">Cảnh Báo 1_2s (Warning)</span>
                            <span className="badge bg-warning-subtle text-warning">Giám sát</span>
                        </div>
                        <div className="fs-2 fw-bold text-warning mt-1">{summary.activeWarningsCount} lần</div>
                        <div className="small text-muted mt-1">Độ lệch nằm trong dải 2s - 3s</div>
                    </div>
                </div>

                {/* Rejections & Locked Analyzers */}
                <div className="col-12 col-sm-6 col-xl-3">
                    <div className="card border-0 shadow-sm rounded-3 p-3 bg-white h-100 border-start border-danger border-4">
                        <div className="d-flex justify-content-between align-items-center">
                            <span className="text-muted small fw-semibold text-uppercase">Vi Phạm Từ Chối / Khóa Máy</span>
                            <span className="badge bg-danger-subtle text-danger">Rejection</span>
                        </div>
                        <div className="fs-2 fw-bold text-danger mt-1">
                            {summary.activeRejectionsCount} <span className="fs-6 fw-normal text-muted">({summary.lockedAnalyzersCount} máy khóa)</span>
                        </div>
                        <div className="small text-muted mt-1">Yêu cầu hiệu chuẩn lại trước khi chạy mẫu</div>
                    </div>
                </div>
            </div>

            {/* Navigation Tabs */}
            <ul className="nav nav-pills mb-4 bg-white p-2 rounded-3 shadow-sm">
                <li className="nav-item">
                    <button
                        className={`nav-link d-flex align-items-center gap-2 ${activeTab === 'chart' ? 'active' : ''}`}
                        onClick={() => setActiveTab("chart")}
                    >
                        <FaChartLine /> Biểu Đồ Levey-Jennings
                    </button>
                </li>
                <li className="nav-item">
                    <button
                        className={`nav-link d-flex align-items-center gap-2 ${activeTab === 'lots' ? 'active' : ''}`}
                        onClick={() => setActiveTab("lots")}
                    >
                        <FaVial /> Quản Lý Lô Kiểm Chuẩn (QC Lots)
                    </button>
                </li>
                <li className="nav-item">
                    <button
                        className={`nav-link d-flex align-items-center gap-2 ${activeTab === 'flags' ? 'active' : ''}`}
                        onClick={() => setActiveTab("flags")}
                    >
                        <FaExclamationTriangle /> Lịch Sử Cảnh Báo Vi Phạm Westgard ({flags.length})
                    </button>
                </li>
            </ul>

            {/* TAB 1: LEVEY-JENNINGS CHART */}
            {activeTab === "chart" && (
                <div>
                    {/* Lot Selector & Quick Stats Bar */}
                    <div className="card border-0 shadow-sm rounded-3 mb-4 bg-white">
                        <div className="card-body p-3">
                            <div className="row g-3 align-items-center">
                                <div className="col-12 col-md-5">
                                    <label className="small text-muted fw-bold text-uppercase d-block mb-1">
                                        Chọn Lô Kiểm Chuẩn Để Xem Biểu Đồ:
                                    </label>
                                    <select
                                        className="form-select form-select-sm"
                                        value={selectedLotId}
                                        onChange={e => setSelectedLotId(e.target.value)}
                                        id="select-qc-lot"
                                    >
                                        {lots.map(l => (
                                            <option key={l.id} value={l.id}>
                                                {l.analyteName} (Level {l.level}) &ndash; {l.lotNumber} &bull; {l.instrumentId}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {ljData && ljData.lot && (
                                    <>
                                        <div className="col-6 col-sm-3 col-md-2 text-center border-start">
                                            <div className="small text-muted">Giá Trị Đích (Mean)</div>
                                            <div className="fw-bold fs-6 text-dark">{ljData.mean} {ljData.lot.unit}</div>
                                        </div>
                                        <div className="col-6 col-sm-3 col-md-2 text-center border-start">
                                            <div className="small text-muted">Độ Lệch Chuẩn (1 SD)</div>
                                            <div className="fw-bold fs-6 text-dark">{ljData.sd} {ljData.lot.unit}</div>
                                        </div>
                                        <div className="col-6 col-sm-3 col-md-2 text-center border-start">
                                            <div className="small text-muted">Giới Hạn 2 SD (±2s)</div>
                                            <div className="fw-semibold small text-warning">{ljData.minus2SD} &ndash; {ljData.plus2SD}</div>
                                        </div>
                                        <div className="col-6 col-sm-3 col-md-1 text-center border-start">
                                            <div className="small text-muted">Trạng Thái</div>
                                            <span className={`badge ${ljData.isInControl ? 'bg-success' : 'bg-danger'}`}>
                                                {ljData.isInControl ? "ĐẠT CHUẨN" : "KHÓA MÁY"}
                                            </span>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Chart Canvas Card */}
                    <div className="card border-0 shadow-sm rounded-3 mb-4 bg-white">
                        <div className="card-header bg-white border-bottom p-3 d-flex justify-content-between align-items-center">
                            <h5 className="mb-0 fw-bold text-dark d-flex align-items-center gap-2">
                                <FaChartLine className="text-primary" /> Biểu Đồ Levey-Jennings ({ljData?.lot?.analyteName || "Analyte"})
                            </h5>
                            <div className="d-flex align-items-center gap-3 small text-muted">
                                <span><span className="badge rounded-pill bg-success me-1">&bull;</span> Đạt chuẩn (|Z| &le; 2)</span>
                                <span><span className="badge rounded-pill bg-warning me-1">&bull;</span> Cảnh báo 1_2s</span>
                                <span><span className="badge rounded-pill bg-danger me-1">&bull;</span> Từ chối (Rejection)</span>
                            </div>
                        </div>

                        <div className="card-body p-4 text-center">
                            {!chartRenderData ? (
                                <div className="py-5 text-muted">
                                    <FaInfoCircle className="fs-1 mb-2" />
                                    <p>Chưa có dữ liệu lượt chạy QC cho lô này. Hãy nhấn "Nhập kết quả chạy QC" để ghi nhận lần chạy đầu tiên.</p>
                                </div>
                            ) : (
                                <div className="table-responsive d-flex justify-content-center">
                                    <svg
                                        viewBox={`0 0 ${chartRenderData.width} ${chartRenderData.height}`}
                                        style={{ width: "100%", maxWidth: "900px", height: "auto" }}
                                    >
                                        {/* Background Grid Lines */}
                                        {chartRenderData.lines.map((line, idx) => {
                                            const y = chartRenderData.getY(line.value);
                                            return (
                                                <g key={idx}>
                                                    <line
                                                        x1={chartRenderData.padding.left}
                                                        y1={y}
                                                        x2={chartRenderData.width - chartRenderData.padding.right}
                                                        y2={y}
                                                        stroke={line.color}
                                                        strokeWidth={line.strokeWidth}
                                                        strokeDasharray={line.dash}
                                                    />
                                                    <text
                                                        x={chartRenderData.padding.left - 8}
                                                        y={y + 4}
                                                        fill={line.color}
                                                        fontSize="11"
                                                        fontWeight="600"
                                                        textAnchor="end"
                                                    >
                                                        {line.label} ({line.value})
                                                    </text>
                                                </g>
                                            );
                                        })}

                                        {/* Polyline connecting points */}
                                        <polyline
                                            fill="none"
                                            stroke="#3b82f6"
                                            strokeWidth="2"
                                            points={chartRenderData.polylinePoints}
                                        />

                                        {/* Data Points */}
                                        {chartRenderData.coords.map((pt, idx) => {
                                            const isPass = pt.status === "PASS";
                                            const isWarn = pt.status === "WARNING_1_2S";
                                            const isReject = !isPass && !isWarn;

                                            const fill = isReject ? "#dc2626" : isWarn ? "#f59e0b" : "#10b981";

                                            return (
                                                <g key={pt.runId || idx}>
                                                    <circle
                                                        cx={pt.x}
                                                        cy={pt.y}
                                                        r={isReject ? "7" : "5"}
                                                        fill={fill}
                                                        stroke="#ffffff"
                                                        strokeWidth="2"
                                                        style={{ cursor: "pointer" }}
                                                    >
                                                        <title>
                                                            {`Lần chạy #${pt.runNumber}\nKết quả: ${pt.measuredValue} (Z = ${pt.zScore}s)\nTrạng thái: ${pt.status}\nKTV: ${pt.operatorName}\nThời gian: ${new Date(pt.timestamp).toLocaleString('vi-VN')}`}
                                                        </title>
                                                    </circle>
                                                    {/* X-axis label */}
                                                    <text
                                                        x={pt.x}
                                                        y={chartRenderData.height - 15}
                                                        fill="#64748b"
                                                        fontSize="10"
                                                        textAnchor="middle"
                                                    >
                                                        #{pt.runNumber}
                                                    </text>
                                                </g>
                                            );
                                        })}
                                    </svg>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* TAB 2: QC LOTS MANAGEMENT */}
            {activeTab === "lots" && (
                <div className="card border-0 shadow-sm rounded-3">
                    <div className="card-header bg-white border-bottom p-3 d-flex justify-content-between align-items-center">
                        <h5 className="mb-0 fw-bold text-dark d-flex align-items-center gap-2">
                            <FaVial className="text-primary" /> Danh Sách Lô Kiểm Chuẩn Đang Quản Lý
                        </h5>
                        <span className="badge bg-light text-muted border">
                            {lots.length} lô kiểm chuẩn
                        </span>
                    </div>

                    <div className="card-body p-0">
                        <div className="table-responsive">
                            <table className="table table-hover align-middle mb-0">
                                <thead className="table-light small text-muted text-uppercase">
                                    <tr>
                                        <th>Mã Lô / Tên Kiểm Chuẩn</th>
                                        <th>Chỉ Số (Analyte)</th>
                                        <th>Mức Level</th>
                                        <th>Thiết Bị (Analyzer)</th>
                                        <th className="text-center">Mean (x̄)</th>
                                        <th className="text-center">Độ Lệch Chuẩn (SD)</th>
                                        <th>Hạn Dùng</th>
                                        <th className="text-center">Trạng Thái</th>
                                        <th className="text-end">Thao Tác</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {lots.map(lot => (
                                        <tr key={lot.id}>
                                            <td>
                                                <div className="fw-bold text-dark">{lot.lotNumber}</div>
                                                <div className="small text-muted">{lot.controlName}</div>
                                            </td>
                                            <td>
                                                <span className="badge bg-light text-dark border">
                                                    {lot.analyteName}
                                                </span>
                                            </td>
                                            <td>Level {lot.level}</td>
                                            <td className="small text-muted">{lot.instrumentId}</td>
                                            <td className="text-center fw-bold">{lot.targetMean} {lot.unit}</td>
                                            <td className="text-center fw-semibold text-muted">{lot.targetStandardDeviation} {lot.unit}</td>
                                            <td className="small text-muted">
                                                {new Date(lot.expirationDate).toLocaleDateString('vi-VN')}
                                            </td>
                                            <td className="text-center">
                                                <span className={`badge ${lot.isActive ? 'bg-success' : 'bg-secondary'}`}>
                                                    {lot.isActive ? "Đang sử dụng" : "Đã tạm dừng"}
                                                </span>
                                            </td>
                                            <td className="text-end">
                                                <div className="d-flex justify-content-end gap-1">
                                                    <button
                                                        className="btn btn-outline-primary btn-sm"
                                                        onClick={() => {
                                                            setSelectedLotId(lot.id);
                                                            setActiveTab("chart");
                                                        }}
                                                    >
                                                        Xem biểu đồ
                                                    </button>
                                                    <button
                                                        className={`btn btn-sm ${lot.isActive ? 'btn-outline-danger' : 'btn-outline-success'}`}
                                                        onClick={() => handleToggleStatus(lot.id)}
                                                    >
                                                        {lot.isActive ? "Tạm dừng" : "Kích hoạt"}
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB 3: QC FLAGS & AUDIT HISTORY */}
            {activeTab === "flags" && (
                <div className="card border-0 shadow-sm rounded-3">
                    <div className="card-header bg-white border-bottom p-3 d-flex justify-content-between align-items-center">
                        <h5 className="mb-0 fw-bold text-dark d-flex align-items-center gap-2">
                            <FaExclamationTriangle className="text-danger" /> Nhật Ký Cảnh Báo Vi Phạm Westgard &amp; Khóa Máy
                        </h5>
                        <span className="badge bg-danger-subtle text-danger border">
                            {flags.length} sự cố ghi nhận
                        </span>
                    </div>

                    <div className="card-body p-0">
                        {flags.length === 0 ? (
                            <div className="text-center py-5 text-muted">
                                <FaCheckCircle className="fs-1 text-success mb-2" />
                                <p className="mb-0 fw-semibold">Không có sự cố vi phạm Westgard nào chưa được khắc phục.</p>
                            </div>
                        ) : (
                            <div className="table-responsive">
                                <table className="table table-hover align-middle mb-0">
                                    <thead className="table-light small text-muted text-uppercase">
                                        <tr>
                                            <th>Mã Chạy / Thời Gian</th>
                                            <th>Mã Lô QC</th>
                                            <th className="text-center">Kết Quả Đo</th>
                                            <th className="text-center">Z-Score</th>
                                            <th className="text-center">Quy Tắc Vi Phạm</th>
                                            <th className="text-center">Tình Trạng Khóa</th>
                                            <th>Thông Điệp Westgard</th>
                                            <th className="text-end">Ký Duyệt Khắc Phục</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {flags.map(flag => (
                                            <tr key={flag.runId} className={flag.isLocked ? 'table-danger-subtle' : ''}>
                                                <td>
                                                    <div className="fw-bold font-monospace text-dark">{flag.runId}</div>
                                                    <div className="small text-muted">{new Date(flag.evaluatedAt).toLocaleString('vi-VN')}</div>
                                                </td>
                                                <td><span className="badge bg-light text-dark border">{flag.lotId}</span></td>
                                                <td className="text-center fw-bold">{flag.measuredValue}</td>
                                                <td className="text-center">
                                                    <span className={`badge ${Math.abs(flag.zScore) > 3 ? 'bg-danger' : 'bg-warning'} text-white`}>
                                                        {flag.zScore > 0 ? `+${flag.zScore}` : flag.zScore}s
                                                    </span>
                                                </td>
                                                <td className="text-center">
                                                    {flag.violatedRules.map(r => (
                                                        <span key={r} className="badge bg-dark text-white me-1">
                                                            {r}
                                                        </span>
                                                    ))}
                                                </td>
                                                <td className="text-center">
                                                    {flag.isLocked ? (
                                                        <span className="badge bg-danger text-white d-inline-flex align-items-center gap-1">
                                                            <FaLock /> ĐANG KHÓA
                                                        </span>
                                                    ) : (
                                                        <span className="badge bg-success text-white d-inline-flex align-items-center gap-1">
                                                            <FaUnlock /> ĐÃ MỞ
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="small text-muted" style={{ maxWidth: "250px" }}>
                                                    {flag.message}
                                                </td>
                                                <td className="text-end">
                                                    {flag.isLocked ? (
                                                        <button
                                                            className="btn btn-danger btn-sm d-flex align-items-center gap-1 shadow-sm ms-auto"
                                                            onClick={() => {
                                                                setSelectedRunForSignoff(flag);
                                                                setShowSignoffModal(true);
                                                            }}
                                                        >
                                                            <FaUserCheck /> Ký mở khóa
                                                        </button>
                                                    ) : (
                                                        <span className="badge bg-light text-success border py-2 px-3 small">
                                                            Đã ký duyệt
                                                        </span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* MODAL: RECORD QC RUN */}
            {showRecordModal && (
                <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
                    <div className="modal-dialog modal-dialog-centered">
                        <div className="modal-content border-0 shadow-lg">
                            <div className="modal-header bg-success text-white">
                                <h5 className="modal-title fw-bold">
                                    <FaVial className="me-2" /> Nhập Kết Quả Chạy Kiểm Chuẩn (Record QC Run)
                                </h5>
                                <button
                                    type="button"
                                    className="btn-close btn-close-white"
                                    onClick={() => {
                                        setShowRecordModal(false);
                                        setRecordResult(null);
                                    }}
                                ></button>
                            </div>

                            <form onSubmit={handleRecordRun}>
                                <div className="modal-body p-4">
                                    <div className="mb-3">
                                        <label className="form-label small fw-bold text-muted text-uppercase">Chọn lô kiểm chuẩn:</label>
                                        <select
                                            className="form-select"
                                            value={selectedLotId}
                                            onChange={e => setSelectedLotId(e.target.value)}
                                            required
                                        >
                                            {lots.filter(l => l.isActive).map(l => (
                                                <option key={l.id} value={l.id}>
                                                    {l.analyteName} (Level {l.level}) &ndash; {l.lotNumber} (Mean: {l.targetMean} {l.unit}, SD: {l.targetStandardDeviation})
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="mb-3">
                                        <label className="form-label small fw-bold text-muted text-uppercase">Giá trị đo được:</label>
                                        <input
                                            type="number"
                                            step="0.001"
                                            className="form-control form-control-lg fw-bold"
                                            placeholder="Ví dụ: 5.52"
                                            value={measuredValue}
                                            onChange={e => setMeasuredValue(e.target.value)}
                                            required
                                            autoFocus
                                        />
                                    </div>

                                    <div className="mb-3">
                                        <label className="form-label small fw-bold text-muted text-uppercase">Kỹ thuật viên thực hiện:</label>
                                        <input
                                            type="text"
                                            className="form-control"
                                            value={operatorName}
                                            onChange={e => setOperatorName(e.target.value)}
                                            required
                                        />
                                    </div>

                                    {/* Real-time Westgard result preview */}
                                    {recordResult && (
                                        <div className={`alert p-3 rounded border ${recordResult.isLocked ? 'alert-danger bg-danger-subtle border-danger' : recordResult.status === 'WARNING_1_2S' ? 'alert-warning bg-warning-subtle border-warning' : 'alert-success bg-success-subtle border-success'}`}>
                                            <div className="fw-bold d-flex align-items-center gap-2">
                                                {recordResult.isLocked ? <FaExclamationTriangle className="text-danger" /> : <FaCheckCircle className="text-success" />}
                                                Đánh giá Westgard: {recordResult.status} (Z-Score: {recordResult.zScore}s)
                                            </div>
                                            <div className="small mt-1">{recordResult.message}</div>
                                        </div>
                                    )}
                                </div>

                                <div className="modal-footer">
                                    <button
                                        type="button"
                                        className="btn btn-secondary"
                                        onClick={() => {
                                            setShowRecordModal(false);
                                            setRecordResult(null);
                                        }}
                                        disabled={isRecording}
                                    >
                                        Đóng
                                    </button>
                                    <button
                                        type="submit"
                                        className="btn btn-success fw-semibold"
                                        disabled={isRecording}
                                    >
                                        {isRecording ? "Đang đánh giá..." : "Ghi Nhận & Đánh Giá Westgard"}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL: CREATE QC LOT */}
            {showCreateLotModal && (
                <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
                    <div className="modal-dialog modal-dialog-centered">
                        <div className="modal-content border-0 shadow-lg">
                            <div className="modal-header bg-primary text-white">
                                <h5 className="modal-title fw-bold">
                                    <FaPlus className="me-2" /> Khởi Tạo Lô Kiểm Chuẩn Mới (Create QC Lot)
                                </h5>
                                <button
                                    type="button"
                                    className="btn-close btn-close-white"
                                    onClick={() => setShowCreateLotModal(false)}
                                ></button>
                            </div>

                            <form onSubmit={handleCreateLot}>
                                <div className="modal-body p-4">
                                    <div className="row g-3">
                                        <div className="col-12 col-sm-6">
                                            <label className="form-label small fw-bold text-muted text-uppercase">Mã số lô (Lot Number):</label>
                                            <input
                                                type="text"
                                                className="form-control"
                                                placeholder="LOT-GLU-2026C"
                                                value={newLotForm.lotNumber}
                                                onChange={e => setNewLotForm({ ...newLotForm, lotNumber: e.target.value })}
                                                required
                                            />
                                        </div>
                                        <div className="col-12 col-sm-6">
                                            <label className="form-label small fw-bold text-muted text-uppercase">Chỉ số xét nghiệm:</label>
                                            <input
                                                type="text"
                                                className="form-control"
                                                placeholder="Glucose, Cholesterol..."
                                                value={newLotForm.analyteName}
                                                onChange={e => setNewLotForm({ ...newLotForm, analyteName: e.target.value })}
                                                required
                                            />
                                        </div>
                                        <div className="col-12">
                                            <label className="form-label small fw-bold text-muted text-uppercase">Tên mẫu kiểm chuẩn:</label>
                                            <input
                                                type="text"
                                                className="form-control"
                                                placeholder="Liquid Assayed Multiqual"
                                                value={newLotForm.controlName}
                                                onChange={e => setNewLotForm({ ...newLotForm, controlName: e.target.value })}
                                                required
                                            />
                                        </div>
                                        <div className="col-12 col-sm-6">
                                            <label className="form-label small fw-bold text-muted text-uppercase">Mức kiểm chuẩn (Level):</label>
                                            <select
                                                className="form-select"
                                                value={newLotForm.level}
                                                onChange={e => setNewLotForm({ ...newLotForm, level: parseInt(e.target.value) })}
                                            >
                                                <option value={1}>Level 1 &ndash; Bình thường (Normal)</option>
                                                <option value={2}>Level 2 &ndash; Bất thường cao (High)</option>
                                                <option value={3}>Level 3 &ndash; Bất thường thấp (Low)</option>
                                            </select>
                                        </div>
                                        <div className="col-12 col-sm-6">
                                            <label className="form-label small fw-bold text-muted text-uppercase">Mã máy phân tích:</label>
                                            <input
                                                type="text"
                                                className="form-control"
                                                value={newLotForm.instrumentId}
                                                onChange={e => setNewLotForm({ ...newLotForm, instrumentId: e.target.value })}
                                                required
                                            />
                                        </div>
                                        <div className="col-12 col-sm-4">
                                            <label className="form-label small fw-bold text-muted text-uppercase">Target Mean (x̄):</label>
                                            <input
                                                type="number"
                                                step="0.001"
                                                className="form-control fw-bold"
                                                placeholder="5.5"
                                                value={newLotForm.targetMean}
                                                onChange={e => setNewLotForm({ ...newLotForm, targetMean: e.target.value })}
                                                required
                                            />
                                        </div>
                                        <div className="col-12 col-sm-4">
                                            <label className="form-label small fw-bold text-muted text-uppercase">Target SD (σ):</label>
                                            <input
                                                type="number"
                                                step="0.001"
                                                className="form-control fw-bold"
                                                placeholder="0.25"
                                                value={newLotForm.targetStandardDeviation}
                                                onChange={e => setNewLotForm({ ...newLotForm, targetStandardDeviation: e.target.value })}
                                                required
                                            />
                                        </div>
                                        <div className="col-12 col-sm-4">
                                            <label className="form-label small fw-bold text-muted text-uppercase">Đơn vị đo:</label>
                                            <input
                                                type="text"
                                                className="form-control"
                                                placeholder="mmol/L"
                                                value={newLotForm.unit}
                                                onChange={e => setNewLotForm({ ...newLotForm, unit: e.target.value })}
                                                required
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="modal-footer">
                                    <button
                                        type="button"
                                        className="btn btn-secondary"
                                        onClick={() => setShowCreateLotModal(false)}
                                        disabled={isCreatingLot}
                                    >
                                        Đóng
                                    </button>
                                    <button
                                        type="submit"
                                        className="btn btn-primary fw-semibold"
                                        disabled={isCreatingLot}
                                    >
                                        {isCreatingLot ? "Đang lưu..." : "Lưu Lô Kiểm Chuẩn"}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL: SIGNOFF CORRECTIVE ACTION */}
            {showSignoffModal && selectedRunForSignoff && (
                <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
                    <div className="modal-dialog modal-dialog-centered">
                        <div className="modal-content border-0 shadow-lg">
                            <div className="modal-header bg-danger text-white">
                                <h5 className="modal-title fw-bold">
                                    <FaLock className="me-2" /> Ký Duyệt Khắc Phục Sự Cố QC &amp; Mở Khóa Máy
                                </h5>
                                <button
                                    type="button"
                                    className="btn-close btn-close-white"
                                    onClick={() => {
                                        setShowSignoffModal(false);
                                        setSelectedRunForSignoff(null);
                                    }}
                                ></button>
                            </div>

                            <form onSubmit={handleSignoff}>
                                <div className="modal-body p-4">
                                    <div className="alert alert-danger bg-danger-subtle border-danger mb-3 p-3">
                                        <div className="fw-bold">Lần chạy #{selectedRunForSignoff.runNumber || selectedRunForSignoff.runId}</div>
                                        <div className="small">Quy tắc vi phạm: <strong>{selectedRunForSignoff.violatedRules?.join(", ")}</strong> (Z = {selectedRunForSignoff.zScore}s)</div>
                                        <div className="small mt-1 text-danger">Máy đang bị khóa giải phóng kết quả mẫu bệnh nhân.</div>
                                    </div>

                                    <div className="mb-3">
                                        <label className="form-label small fw-bold text-muted text-uppercase">Người ký duyệt (KTV Trưởng / Bác sĩ phụ trách):</label>
                                        <input
                                            type="text"
                                            className="form-control"
                                            value={operatorName}
                                            onChange={e => setOperatorName(e.target.value)}
                                            required
                                        />
                                    </div>

                                    <div className="mb-3">
                                        <label className="form-label small fw-bold text-muted text-uppercase">Biện pháp khắc phục đã thực hiện (bắt buộc):</label>
                                        <textarea
                                            className="form-control"
                                            rows="3"
                                            placeholder="Ví dụ: Đã recalibrate lại điện cực ISE, thay chai thuốc thử R1 mới và chạy lại QC đạt chuẩn."
                                            value={correctiveActionNotes}
                                            onChange={e => setCorrectiveActionNotes(e.target.value)}
                                            required
                                        ></textarea>
                                    </div>
                                </div>

                                <div className="modal-footer">
                                    <button
                                        type="button"
                                        className="btn btn-secondary"
                                        onClick={() => {
                                            setShowSignoffModal(false);
                                            setSelectedRunForSignoff(null);
                                        }}
                                        disabled={isSigningOff}
                                    >
                                        Đóng
                                    </button>
                                    <button
                                        type="submit"
                                        className="btn btn-danger fw-semibold"
                                        disabled={isSigningOff}
                                    >
                                        {isSigningOff ? "Đang xử lý..." : "Xác Nhận Ký Duyệt & Mở Khóa Máy"}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
