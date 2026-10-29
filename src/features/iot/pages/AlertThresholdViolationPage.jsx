/**
 * @file AlertThresholdViolationPage.jsx
 * @description Real-time IoT Environmental Threshold Violation, Specimen Cold-Chain Surveillance & Incident Resolution Center (UC68 / I3-062).
 * Features live alert escalation, audio alarms, multi-channel dispatch logs, operator triage acknowledgment,
 * corrective action documentation, and simulated excursion drills.
 * Conforms to: Production Medical Standards, ISO 15189 Cold-Chain Safety & AGENTS-DESIGN.md.
 */

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
    FaBell,
    FaExclamationTriangle,
    FaCheckCircle,
    FaShieldAlt,
    FaSync,
    FaFilter,
    FaVolumeUp,
    FaVolumeMute,
    FaTools,
    FaSearch,
    FaThermometerHalf,
    FaTint,
    FaBolt,
    FaHistory,
    FaUserCheck,
    FaPlay,
    FaInfoCircle,
    FaTimes
} from "react-icons/fa";
import {
    fetchAlerts,
    fetchAlertSummary,
    acknowledgeAlert,
    resolveAlert,
    evaluateTelemetry,
    simulateAlert
} from "../api/iotAlertApi";

export default function AlertThresholdViolationPage() {
    // Alert state
    const [alerts, setAlerts] = useState([]);
    const [summary, setSummary] = useState({
        activeAlertsCount: 0,
        criticalEmergencyCount: 0,
        acknowledgedCount: 0,
        resolvedTodayCount: 0,
        averageResolutionMinutes: 0,
        systemHealthStatus: "NORMAL"
    });
    const [isLoading, setIsLoading] = useState(false);

    // Filter states
    const [selectedStatus, setSelectedStatus] = useState("All"); // All, Active, Acknowledged, Resolved
    const [selectedSeverity, setSelectedSeverity] = useState("All"); // All, Warning, Critical, Danger_Emergency
    const [searchQuery, setSearchQuery] = useState("");
    const [soundEnabled, setSoundEnabled] = useState(false);

    // Modal states
    const [selectedAlertForAction, setSelectedAlertForAction] = useState(null);
    const [actionType, setActionType] = useState(null); // 'ACKNOWLEDGE' | 'RESOLVE' | 'SIMULATE'
    const [operatorName, setOperatorName] = useState("Nguyễn Tấn Phát (KTV Lab)");
    const [actionNotes, setActionNotes] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Simulation states
    const [simDeviceId, setSimDeviceId] = useState("TEMP-001");
    const [simSensorType, setSimSensorType] = useState("Temperature");
    const [simValue, setSimValue] = useState(8.6);

    // Play alert audio buzzer synthesized using Web Audio API
    const playAlarmBuzzer = useCallback(() => {
        if (!soundEnabled) return;
        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (!AudioContext) return;
            const ctx = new AudioContext();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.type = "sawtooth";
            osc.frequency.setValueAtTime(880, ctx.currentTime); // A5 alert tone
            osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.3);

            gain.gain.setValueAtTime(0.3, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);

            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.start();
            osc.stop(ctx.currentTime + 0.3);
        } catch {
            // Audio not allowed without user interaction
        }
    }, [soundEnabled]);

    const loadData = useCallback(async () => {
        setIsLoading(true);
        try {
            const [alertsList, summaryData] = await Promise.all([
                fetchAlerts({
                    status: selectedStatus,
                    severity: selectedSeverity
                }),
                fetchAlertSummary()
            ]);
            setAlerts(alertsList);
            setSummary(summaryData);

            if (summaryData.criticalEmergencyCount > 0) {
                playAlarmBuzzer();
            }
        } catch (error) {
            console.error("Failed to load IoT alerts data:", error);
        } finally {
            setIsLoading(false);
        }
    }, [selectedStatus, selectedSeverity, playAlarmBuzzer]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    // Filter by search query
    const filteredAlerts = useMemo(() => {
        if (!searchQuery.trim()) return alerts;
        const q = searchQuery.toLowerCase();
        return alerts.filter(a =>
            a.deviceId.toLowerCase().includes(q) ||
            a.deviceName.toLowerCase().includes(q) ||
            a.location.toLowerCase().includes(q) ||
            (a.resolutionNotes && a.resolutionNotes.toLowerCase().includes(q))
        );
    }, [alerts, searchQuery]);

    // Handle Acknowledge submit
    const handleAcknowledge = async () => {
        if (!selectedAlertForAction) return;
        setIsSubmitting(true);
        try {
            await acknowledgeAlert(selectedAlertForAction.id, {
                operatorName,
                notes: actionNotes
            });
            setSelectedAlertForAction(null);
            setActionType(null);
            setActionNotes("");
            await loadData();
        } catch (err) {
            alert(err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    // Handle Resolve submit
    const handleResolve = async () => {
        if (!selectedAlertForAction) return;
        if (!actionNotes.trim()) {
            alert("Vui lòng ghi rõ biện pháp khắc phục sự cố (Resolution notes).");
            return;
        }
        setIsSubmitting(true);
        try {
            await resolveAlert(selectedAlertForAction.id, {
                operatorName,
                resolutionNotes: actionNotes
            });
            setSelectedAlertForAction(null);
            setActionType(null);
            setActionNotes("");
            await loadData();
        } catch (err) {
            alert(err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    // Handle Simulation submit
    const handleSimulate = async () => {
        setIsSubmitting(true);
        try {
            await simulateAlert({
                deviceId: simDeviceId,
                sensorType: simSensorType,
                simulatedValue: parseFloat(simValue)
            });
            setActionType(null);
            await loadData();
        } catch (err) {
            alert(err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const isCriticalHealth = summary.systemHealthStatus === "CRITICAL";
    const isWarningHealth = summary.systemHealthStatus === "WARNING";

    return (
        <div className="container-fluid py-4 px-xl-5" style={{ minHeight: "90vh", background: "#f8fafc" }}>
            {/* Page Header */}
            <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 pb-3 border-bottom">
                <div>
                    <div className="d-flex align-items-center gap-2">
                        <span className="badge bg-danger px-3 py-2 fs-6">UC68</span>
                        <h2 className="h3 mb-0 fw-bold text-slate-800">Giám Sát &amp; Xử Lý Cảnh Báo Vượt Ngưỡng Môi Trường IoT (Alert Threshold Violation)</h2>
                    </div>
                    <p className="text-muted small mt-1 mb-0">
                        Cảnh báo thời gian thực về điều kiện bảo quản mẫu bệnh phẩm (Nhiệt độ tủ lưu trữ máu 2-6°C, tủ đông huyết tương -20°C, độ ẩm phòng lab 30-60%) và quản lý quy trình khắc phục sự cố.
                    </p>
                </div>

                <div className="d-flex align-items-center gap-2 mt-3 mt-md-0">
                    <button
                        className={`btn btn-sm d-flex align-items-center gap-1 shadow-sm ${soundEnabled ? 'btn-danger' : 'btn-outline-secondary'}`}
                        onClick={() => setSoundEnabled(!soundEnabled)}
                        title="Bật/Tắt chuông báo động âm thanh"
                    >
                        {soundEnabled ? <FaVolumeUp /> : <FaVolumeMute />}
                        <span>{soundEnabled ? "Chuông: BẬT" : "Chuông: TẮT"}</span>
                    </button>
                    <button
                        className="btn btn-outline-primary btn-sm d-flex align-items-center gap-1 shadow-sm"
                        onClick={() => setActionType("SIMULATE")}
                        id="btn-simulate-iot-alert"
                    >
                        <FaPlay /> Diễn tập vượt ngưỡng
                    </button>
                    <button
                        className="btn btn-primary btn-sm d-flex align-items-center gap-1 shadow-sm"
                        onClick={loadData}
                        disabled={isLoading}
                    >
                        <FaSync className={isLoading ? "fa-spin" : ""} /> Làm mới
                    </button>
                </div>
            </div>

            {/* System Health Status Banner */}
            <div className={`alert d-flex align-items-center justify-content-between shadow-sm rounded-3 mb-4 p-3 border-0 ${isCriticalHealth ? 'alert-danger bg-danger text-white' : isWarningHealth ? 'alert-warning bg-warning-subtle text-dark border-warning' : 'alert-success bg-success-subtle text-success border-success'}`}>
                <div className="d-flex align-items-center gap-3">
                    <div className="fs-2">
                        {isCriticalHealth ? (
                            <FaExclamationTriangle className="text-white fa-beat" />
                        ) : isWarningHealth ? (
                            <FaExclamationTriangle className="text-warning" />
                        ) : (
                            <FaCheckCircle className="text-success" />
                        )}
                    </div>
                    <div>
                        <h5 className="mb-0 fw-bold">
                            {isCriticalHealth
                                ? "BÁO ĐỘNG ĐỎ KHẨN CẤP: PHÁT HIỆN SỰ CỐ VƯỢT NGƯỠNG NGUY HIỂM"
                                : isWarningHealth
                                ? "CẢNH BÁO: CÓ THIẾT BỊ ĐANG CẦN KIỂM TRA MÔI TRƯỜNG"
                                : "HỆ THỐNG MÔI TRƯỜNG KHO LẠNH & PHÒNG LAB HOẠT ĐỘNG AN TOÀN"}
                        </h5>
                        <p className={`mb-0 small ${isCriticalHealth ? 'text-white-50' : 'text-muted'}`}>
                            {isCriticalHealth
                                ? "Nhiệt độ hoặc độ ẩm vượt quá giới hạn an toàn ISO 15189. Cần nhân viên tiếp nhận và xử lý ngay để bảo vệ mẫu máu!"
                                : "Tất cả các thông số bảo quản mẫu máu và thuốc thử đang nằm trong dải nhiệt độ tối ưu."}
                        </p>
                    </div>
                </div>

                <div className="text-end d-none d-md-block">
                    <span className="badge bg-white text-dark px-3 py-2 fs-6 shadow-sm">
                        {summary.activeAlertsCount} cảnh báo chưa xử lý
                    </span>
                </div>
            </div>

            {/* KPI Metric Ribbon */}
            <div className="row g-3 mb-4">
                {/* Active Alerts */}
                <div className="col-12 col-sm-6 col-xl-3">
                    <div className="card border-0 shadow-sm rounded-3 p-3 bg-white h-100 border-start border-danger border-4">
                        <div className="d-flex justify-content-between align-items-center">
                            <span className="text-muted small fw-semibold text-uppercase">Cảnh Báo Kích Hoạt</span>
                            <span className="badge bg-danger-subtle text-danger">Active</span>
                        </div>
                        <div className="fs-2 fw-bold text-danger mt-1">{summary.activeAlertsCount}</div>
                        <div className="small text-muted mt-1">Đang cần nhân viên tiếp nhận</div>
                    </div>
                </div>

                {/* Critical / Emergency */}
                <div className="col-12 col-sm-6 col-xl-3">
                    <div className="card border-0 shadow-sm rounded-3 p-3 bg-white h-100 border-start border-warning border-4">
                        <div className="d-flex justify-content-between align-items-center">
                            <span className="text-muted small fw-semibold text-uppercase">Mức Nguy Cấp (Critical)</span>
                            <span className="badge bg-warning-subtle text-warning">Khẩn cấp</span>
                        </div>
                        <div className="fs-2 fw-bold text-warning mt-1">{summary.criticalEmergencyCount}</div>
                        <div className="small text-muted mt-1">Đã gửi tin SMS &amp; Email khẩn</div>
                    </div>
                </div>

                {/* Acknowledged */}
                <div className="col-12 col-sm-6 col-xl-3">
                    <div className="card border-0 shadow-sm rounded-3 p-3 bg-white h-100 border-start border-info border-4">
                        <div className="d-flex justify-content-between align-items-center">
                            <span className="text-muted small fw-semibold text-uppercase">Đang Xử Lý (In Progress)</span>
                            <span className="badge bg-info-subtle text-info">Acknowledged</span>
                        </div>
                        <div className="fs-2 fw-bold text-info mt-1">{summary.acknowledgedCount}</div>
                        <div className="small text-muted mt-1">Kỹ thuật viên đã tiếp nhận</div>
                    </div>
                </div>

                {/* Resolved Today */}
                <div className="col-12 col-sm-6 col-xl-3">
                    <div className="card border-0 shadow-sm rounded-3 p-3 bg-white h-100 border-start border-success border-4">
                        <div className="d-flex justify-content-between align-items-center">
                            <span className="text-muted small fw-semibold text-uppercase">Đã Khắc Phục (Resolved)</span>
                            <span className="badge bg-success-subtle text-success">Hoàn tất</span>
                        </div>
                        <div className="fs-2 fw-bold text-success mt-1">{summary.resolvedTodayCount}</div>
                        <div className="small text-muted mt-1">
                            Thời gian xử lý TB: <strong>{summary.averageResolutionMinutes} phút</strong>
                        </div>
                    </div>
                </div>
            </div>

            {/* Filter Toolbar */}
            <div className="card border-0 shadow-sm rounded-3 mb-4 bg-white">
                <div className="card-body p-3">
                    <div className="row g-3 align-items-center">
                        {/* Status Filter Tabs */}
                        <div className="col-12 col-md-5">
                            <label className="small text-muted fw-bold text-uppercase d-block mb-1">
                                Trạng thái sự cố:
                            </label>
                            <div className="btn-group btn-group-sm w-100" role="group">
                                {[
                                    { key: "All", label: "Tất cả" },
                                    { key: "Active", label: "Kích hoạt (Active)" },
                                    { key: "Acknowledged", label: "Đã tiếp nhận" },
                                    { key: "Resolved", label: "Đã khắc phục" }
                                ].map(st => (
                                    <button
                                        key={st.key}
                                        type="button"
                                        className={`btn ${selectedStatus === st.key ? 'btn-primary' : 'btn-outline-secondary'}`}
                                        onClick={() => setSelectedStatus(st.key)}
                                    >
                                        {st.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Severity Filter */}
                        <div className="col-12 col-sm-6 col-md-3">
                            <label className="small text-muted fw-bold text-uppercase d-block mb-1">
                                Mức độ cảnh báo:
                            </label>
                            <select
                                className="form-select form-select-sm"
                                value={selectedSeverity}
                                onChange={e => setSelectedSeverity(e.target.value)}
                            >
                                <option value="All">Tất cả mức độ</option>
                                <option value="Warning">Cảnh báo nhẹ (Warning)</option>
                                <option value="Critical">Nguy kịch (Critical)</option>
                                <option value="Danger_Emergency">Khẩn cấp tối cao (Emergency)</option>
                            </select>
                        </div>

                        {/* Search Input */}
                        <div className="col-12 col-sm-6 col-md-4">
                            <label className="small text-muted fw-bold text-uppercase d-block mb-1">
                                Tìm kiếm thiết bị / vị trí:
                            </label>
                            <div className="input-group input-group-sm">
                                <span className="input-group-text bg-light border-end-0">
                                    <FaSearch className="text-muted" />
                                </span>
                                <input
                                    type="text"
                                    className="form-control border-start-0"
                                    placeholder="Nhập mã TEMP-001, tủ lưu trữ..."
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Alert Items Table */}
            <div className="card border-0 shadow-sm rounded-3">
                <div className="card-header bg-white border-bottom p-3 d-flex justify-content-between align-items-center">
                    <h5 className="mb-0 fw-bold text-dark d-flex align-items-center gap-2">
                        <FaBell className="text-primary" /> Danh Sách Cảnh Báo Vượt Ngưỡng
                    </h5>
                    <span className="badge bg-light text-muted border">
                        Hiển thị {filteredAlerts.length} bản ghi
                    </span>
                </div>

                <div className="card-body p-0">
                    {filteredAlerts.length === 0 ? (
                        <div className="text-center py-5 text-muted">
                            <FaCheckCircle className="fs-1 text-success mb-2" />
                            <p className="mb-0 fw-semibold">Không có cảnh báo nào phù hợp với bộ lọc hiện tại.</p>
                        </div>
                    ) : (
                        <div className="table-responsive">
                            <table className="table table-hover align-middle mb-0">
                                <thead className="table-light small text-muted text-uppercase">
                                    <tr>
                                        <th>Thiết Bị / Vị Trí</th>
                                        <th>Loại Cảm Biến</th>
                                        <th className="text-center">Giá Trị Đo Được</th>
                                        <th className="text-center">Ngưỡng An Toàn</th>
                                        <th className="text-center">Độ Lệch Vượt</th>
                                        <th className="text-center">Mức Độ</th>
                                        <th className="text-center">Trạng Thái</th>
                                        <th>Thời Gian Phát Hiện</th>
                                        <th className="text-end">Thao Tác Triage</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredAlerts.map(alert => {
                                        const isTemp = alert.sensorType.toLowerCase().includes("temp");
                                        const isAct = alert.status === "Active";
                                        const isAck = alert.status === "Acknowledged";
                                        const isRes = alert.status === "Resolved";

                                        const sevTheme = alert.severity === "Danger_Emergency"
                                            ? "danger"
                                            : alert.severity === "Critical"
                                            ? "warning"
                                            : "info";

                                        return (
                                            <tr key={alert.id} className={isAct ? 'table-danger-subtle' : ''}>
                                                <td>
                                                    <div className="fw-bold text-dark">{alert.deviceName}</div>
                                                    <div className="small text-muted font-monospace">{alert.deviceId} &bull; {alert.location}</div>
                                                </td>
                                                <td>
                                                    <span className="badge bg-light text-dark border">
                                                        {isTemp ? <FaThermometerHalf className="text-danger me-1" /> : <FaTint className="text-info me-1" />}
                                                        {alert.sensorType}
                                                    </span>
                                                </td>
                                                <td className="text-center">
                                                    <span className={`fs-6 fw-bold text-${sevTheme}`}>
                                                        {alert.observedValue}{alert.unit}
                                                    </span>
                                                </td>
                                                <td className="text-center small text-muted">
                                                    {alert.lowAlert}{alert.unit} &ndash; {alert.highAlert}{alert.unit}
                                                </td>
                                                <td className="text-center">
                                                    <span className={`badge bg-${sevTheme} text-white`}>
                                                        +{alert.excursionAmount}{alert.unit}
                                                    </span>
                                                </td>
                                                <td className="text-center">
                                                    <span className={`badge bg-${sevTheme}-subtle text-${sevTheme} fw-bold`}>
                                                        {alert.severity}
                                                    </span>
                                                </td>
                                                <td className="text-center">
                                                    {isAct && (
                                                        <span className="badge bg-danger text-white">
                                                            KÍCH HOẠT
                                                        </span>
                                                    )}
                                                    {isAck && (
                                                        <span className="badge bg-warning text-dark">
                                                            ĐÃ TIẾP NHẬN
                                                        </span>
                                                    )}
                                                    {isRes && (
                                                        <span className="badge bg-success text-white">
                                                            ĐÃ KHẮC PHỤC
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="small text-muted">
                                                    <div>{new Date(alert.triggeredAt).toLocaleString('vi-VN')}</div>
                                                    {alert.durationMinutes > 0 && (
                                                        <div className="text-danger fw-semibold">{alert.durationMinutes} phút trước</div>
                                                    )}
                                                </td>
                                                <td className="text-end">
                                                    <div className="d-flex justify-content-end gap-1">
                                                        {isAct && (
                                                            <button
                                                                className="btn btn-warning btn-sm d-flex align-items-center gap-1 shadow-sm"
                                                                onClick={() => {
                                                                    setSelectedAlertForAction(alert);
                                                                    setActionType("ACKNOWLEDGE");
                                                                    setActionNotes("");
                                                                }}
                                                            >
                                                                <FaUserCheck /> Tiếp nhận
                                                            </button>
                                                        )}
                                                        {(isAct || isAck) && (
                                                            <button
                                                                className="btn btn-success btn-sm d-flex align-items-center gap-1 shadow-sm"
                                                                onClick={() => {
                                                                    setSelectedAlertForAction(alert);
                                                                    setActionType("RESOLVE");
                                                                    setActionNotes("");
                                                                }}
                                                            >
                                                                <FaTools /> Khắc phục
                                                            </button>
                                                        )}
                                                        {isRes && (
                                                            <span className="badge bg-light text-muted border py-2 px-3 small">
                                                                Bởi: {alert.resolvedBy}
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            {/* Modal for Acknowledge / Resolve Actions */}
            {selectedAlertForAction && (actionType === "ACKNOWLEDGE" || actionType === "RESOLVE") && (
                <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
                    <div className="modal-dialog modal-dialog-centered">
                        <div className="modal-content border-0 shadow-lg">
                            <div className={`modal-header ${actionType === 'RESOLVE' ? 'bg-success text-white' : 'bg-warning text-dark'}`}>
                                <h5 className="modal-title fw-bold">
                                    {actionType === "RESOLVE" ? "Ghi Nhận Biện Pháp Khắc Phục Sự Cố" : "Tiếp Nhận Xử Lý Cảnh Báo IoT"}
                                </h5>
                                <button
                                    type="button"
                                    className="btn-close"
                                    onClick={() => {
                                        setSelectedAlertForAction(null);
                                        setActionType(null);
                                    }}
                                ></button>
                            </div>

                            <div className="modal-body p-4">
                                <div className="mb-3 p-3 bg-light rounded border">
                                    <div className="fw-bold text-dark">{selectedAlertForAction.deviceName} ({selectedAlertForAction.deviceId})</div>
                                    <div className="small text-muted">{selectedAlertForAction.location}</div>
                                    <div className="mt-2 small">
                                        Nhiệt độ/Độ ẩm: <strong className="text-danger">{selectedAlertForAction.observedValue}{selectedAlertForAction.unit}</strong> (Chuẩn an toàn: {selectedAlertForAction.lowAlert} - {selectedAlertForAction.highAlert}{selectedAlertForAction.unit})
                                    </div>
                                </div>

                                <div className="mb-3">
                                    <label className="form-label small fw-bold text-muted text-uppercase">Họ tên nhân viên phụ trách:</label>
                                    <input
                                        type="text"
                                        className="form-control"
                                        value={operatorName}
                                        onChange={e => setOperatorName(e.target.value)}
                                        required
                                    />
                                </div>

                                <div className="mb-3">
                                    <label className="form-label small fw-bold text-muted text-uppercase">
                                        {actionType === "RESOLVE" ? "Biện pháp khắc phục đã thực hiện (bắt buộc):" : "Ghi chú tiếp nhận (tùy chọn):"}
                                    </label>
                                    <textarea
                                        className="form-control"
                                        rows="3"
                                        placeholder={actionType === "RESOLVE" ? "Ví dụ: Đã thay rơ-le máy nén lạnh, chuyển mẫu sang tủ R-02 dự phòng, nhiệt độ đã về 3.8°C ổn định." : "Ví dụ: Đang trên đường tới phòng lab kiểm tra máy nén."}
                                        value={actionNotes}
                                        onChange={e => setActionNotes(e.target.value)}
                                        required={actionType === "RESOLVE"}
                                    ></textarea>
                                </div>
                            </div>

                            <div className="modal-footer">
                                <button
                                    type="button"
                                    className="btn btn-secondary"
                                    onClick={() => {
                                        setSelectedAlertForAction(null);
                                        setActionType(null);
                                    }}
                                    disabled={isSubmitting}
                                >
                                    Đóng
                                </button>
                                <button
                                    type="button"
                                    className={`btn ${actionType === 'RESOLVE' ? 'btn-success' : 'btn-warning'} fw-semibold`}
                                    onClick={actionType === "RESOLVE" ? handleResolve : handleAcknowledge}
                                    disabled={isSubmitting}
                                >
                                    {isSubmitting ? "Đang lưu..." : actionType === "RESOLVE" ? "Xác Nhận Đã Khắc Phục" : "Xác Nhận Tiếp Nhận"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal for Simulated Alert Drill */}
            {actionType === "SIMULATE" && (
                <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
                    <div className="modal-dialog modal-dialog-centered">
                        <div className="modal-content border-0 shadow-lg">
                            <div className="modal-header bg-primary text-white">
                                <h5 className="modal-title fw-bold">
                                    <FaPlay className="me-2" /> Kích Hoạt Diễn Tập Cảnh Báo Vượt Ngưỡng Môi Trường
                                </h5>
                                <button
                                    type="button"
                                    className="btn-close btn-close-white"
                                    onClick={() => setActionType(null)}
                                ></button>
                            </div>

                            <div className="modal-body p-4">
                                <p className="small text-muted mb-3">
                                    Công cụ diễn tập mô phỏng cảm biến IoT gửi giá trị bất thường vượt qua ngưỡng Low/High để kiểm tra phản ứng hệ thống, kích hoạt âm thanh cảnh báo và ghi nhận log audit.
                                </p>

                                <div className="mb-3">
                                    <label className="form-label small fw-bold text-muted text-uppercase">Mã thiết bị cảm biến:</label>
                                    <select
                                        className="form-select"
                                        value={simDeviceId}
                                        onChange={e => setSimDeviceId(e.target.value)}
                                    >
                                        <option value="TEMP-001">TEMP-001 &ndash; Tủ lưu trữ máu toàn phần R-01 (Chuẩn 2 - 6°C)</option>
                                        <option value="FREEZER-01">FREEZER-01 &ndash; Tủ đông huyết tương sâu F-01 (Chuẩn -25 đến -18°C)</option>
                                        <option value="HUM-002">HUM-002 &ndash; Cảm biến độ ẩm phòng Sinh Hóa (Chuẩn 30 - 60%)</option>
                                    </select>
                                </div>

                                <div className="mb-3">
                                    <label className="form-label small fw-bold text-muted text-uppercase">Loại cảm biến:</label>
                                    <select
                                        className="form-select"
                                        value={simSensorType}
                                        onChange={e => setSimSensorType(e.target.value)}
                                    >
                                        <option value="Temperature">Nhiệt độ (Temperature - °C)</option>
                                        <option value="Humidity">Độ ẩm (Humidity - %)</option>
                                    </select>
                                </div>

                                <div className="mb-3">
                                    <label className="form-label small fw-bold text-muted text-uppercase">
                                        Giá trị mô phỏng vượt ngưỡng ({simSensorType === 'Temperature' ? '°C' : '%'}):
                                    </label>
                                    <input
                                        type="number"
                                        step="0.1"
                                        className="form-control form-control-lg fw-bold text-danger"
                                        value={simValue}
                                        onChange={e => setSimValue(e.target.value)}
                                    />
                                    <div className="form-text small">
                                        Nhập giá trị vượt khỏi dải an toàn (Ví dụ: 8.8°C hoặc 18%).
                                    </div>
                                </div>
                            </div>

                            <div className="modal-footer">
                                <button
                                    type="button"
                                    className="btn btn-secondary"
                                    onClick={() => setActionType(null)}
                                    disabled={isSubmitting}
                                >
                                    Hủy
                                </button>
                                <button
                                    type="button"
                                    className="btn btn-danger fw-semibold"
                                    onClick={handleSimulate}
                                    disabled={isSubmitting}
                                >
                                    {isSubmitting ? "Đang gửi..." : "Kích Hoạt Báo Động Ngay"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
