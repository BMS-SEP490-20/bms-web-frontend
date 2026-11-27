/**
 * @file AlertThresholdViolationPage.jsx
 * @description Real-time IoT Environmental Threshold Violation, Specimen Cold-Chain Surveillance & Incident Resolution Center (UC68 / I3-062).
 * Features live alert escalation, audio alarms, multi-channel dispatch logs, operator triage acknowledgment,
 * corrective action documentation, and simulated excursion drills.
 * Conforms to: Production Medical Standards, ISO 15189 Cold-Chain Safety & AGENTS-DESIGN.md.
 */

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Alert } from "react-bootstrap";
import IotNavigationTabs from "../components/IotNavigationTabs";
import { ROLES, getStoredUser, resolveRoleId } from "../../../constants/roles";
import { Bell, AlertTriangle, CheckCircle2, RefreshCw, Filter as LucideFilter, Volume2, VolumeX, Wrench, Search, Thermometer, Droplet, Zap, History, UserCheck, Play as LucidePlay, Info, X as LucideX } from 'lucide-react';
import TablePagination, { usePagination } from "../../../components/ui/TablePagination";
import {
    fetchAlerts,
    fetchAlertSummary,
    acknowledgeAlert,
    resolveAlert,
    evaluateTelemetry,
    simulateAlert
} from "../api/iotAlertApi";
import { subscribeIotRealtime } from "../services/iotSignalRClient";

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
    const [loadError, setLoadError] = useState(null);

    // Filter states
    const [selectedStatus, setSelectedStatus] = useState("All"); // All, Active, Acknowledged, Resolved
    const [selectedSeverity, setSelectedSeverity] = useState("All"); // All, Warning, Critical, Danger_Emergency
    const [searchQuery, setSearchQuery] = useState("");
    const [soundEnabled, setSoundEnabled] = useState(false);

    // Modal states
    const [selectedAlertForAction, setSelectedAlertForAction] = useState(null);
    const [actionType, setActionType] = useState(null); // 'ACKNOWLEDGE' | 'RESOLVE' | 'SIMULATE'
    const [operatorName, setOperatorName] = useState(() => {
        const u = getStoredUser();
        return u?.fullName || u?.name || u?.username || "";
    });
    const [actionNotes, setActionNotes] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [actionFeedback, setActionFeedback] = useState(null);

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
        setLoadError(null);
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
            setLoadError(error.message || "Không thể tải dữ liệu cảnh báo IoT từ máy chủ.");
        } finally {
            setIsLoading(false);
        }
    }, [selectedStatus, selectedSeverity, playAlarmBuzzer]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    // Real-time SignalR subscription so new violations, recovery flags, and CAPA updates appear immediately
    useEffect(() => {
        const unsubscribe = subscribeIotRealtime({
            onAlertUpdated: () => {
                loadData();
            }
        });
        return () => unsubscribe();
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

    const alertsPag = usePagination(filteredAlerts, 10);

    // Handle Acknowledge submit
    const handleAcknowledge = async () => {
        if (!selectedAlertForAction) return;
        setIsSubmitting(true);
        setActionFeedback(null);
        try {
            await acknowledgeAlert(selectedAlertForAction.id, {
                operatorName,
                notes: actionNotes
            });
            setSelectedAlertForAction(null);
            setActionType(null);
            setActionNotes("");
            setActionFeedback({ variant: "success", text: "Đã tiếp nhận xử lý cảnh báo môi trường thành công." });
            await loadData();
        } catch (err) {
            setActionFeedback({ variant: "danger", text: err?.response?.data?.message || err?.message || "Không thể tiếp nhận cảnh báo." });
        } finally {
            setIsSubmitting(false);
        }
    };

    // Handle Resolve submit
    const handleResolve = async () => {
        if (!selectedAlertForAction) return;
        if (!actionNotes.trim() || actionNotes.trim().length < 10) {
            setActionFeedback({ variant: "warning", text: "Theo ISO 15189, vui lòng ghi rõ đánh giá tác động mẫu máu & biện pháp khắc phục CAPA (tối thiểu 10 ký tự)." });
            return;
        }
        setIsSubmitting(true);
        setActionFeedback(null);
        try {
            await resolveAlert(selectedAlertForAction.id, {
                resolutionNotes: actionNotes.trim()
            });
            setSelectedAlertForAction(null);
            setActionType(null);
            setActionNotes("");
            setActionFeedback({ variant: "success", text: "Đã ký xác nhận biên bản CAPA và đóng cảnh báo thành công." });
            await loadData();
        } catch (err) {
            setActionFeedback({ variant: "danger", text: err?.response?.data?.message || err?.message || "Không thể cập nhật trạng thái khắc phục." });
        } finally {
            setIsSubmitting(false);
        }
    };

    // Handle Simulation submit
    const handleSimulate = async () => {
        setIsSubmitting(true);
        setActionFeedback(null);
        try {
            await simulateAlert({
                deviceId: simDeviceId,
                sensorType: simSensorType,
                simulatedValue: parseFloat(simValue)
            });
            setActionType(null);
            setActionFeedback({ variant: "info", text: `Đã kích hoạt diễn tập cảnh báo cho thiết bị ${simDeviceId}.` });
            await loadData();
        } catch (err) {
            setActionFeedback({ variant: "danger", text: err?.response?.data?.message || err?.message || "Không thể kích hoạt diễn tập cảnh báo." });
        } finally {
            setIsSubmitting(false);
        }
    };

    const currentRoleId = useMemo(() => resolveRoleId(getStoredUser()), []);
    const isAdminUser = currentRoleId === ROLES.ADMIN;
    const canSimulateAlert = currentRoleId === ROLES.ADMIN || currentRoleId === ROLES.MANAGER;
    const canAcknowledgeAlert = currentRoleId === ROLES.LAB || currentRoleId === ROLES.MANAGER;
    const canResolveAlert = currentRoleId === ROLES.MANAGER;

    const isCriticalHealth = summary.systemHealthStatus === "CRITICAL";
    const isWarningHealth = summary.systemHealthStatus === "WARNING";
    const hasActiveFilters = selectedStatus !== "All" || selectedSeverity !== "All" || searchQuery.trim() !== "";

    return (
        <div className="w-100 py-1">
            {/* Page Header Card FIRST, then IotNavigationTabs below */}
            <div className="bms-page-header-card mb-3">
                <div className="bms-page-header-content flex-column align-items-start">
                    <div className="bms-page-title-row">
                        <h1 className="bms-page-title">
                            Giám Sát &amp; Xử Lý Cảnh Báo Vượt Ngưỡng Môi Trường IoT
                        </h1>
                    </div>
                    <p className="text-muted small m-0 mt-1">
                        Tiếp nhận cảnh báo vượt ngưỡng nhiệt độ, độ ẩm và ghi nhận biên bản khắc phục sự cố
                    </p>
                </div>

                <div className="bms-page-actions">
                    <button
                        className={`btn btn-sm d-flex align-items-center gap-2 px-3 py-2 fw-semibold rounded-pill ${soundEnabled ? 'btn-danger' : 'btn-outline-secondary'}`}
                        onClick={() => setSoundEnabled(!soundEnabled)}
                        title="Bật/Tắt chuông báo động âm thanh"
                    >
                        {soundEnabled ? <Volume2 size={13} /> : <VolumeX size={13} />}
                        <span>{soundEnabled ? "Chuông: BẬT" : "Chuông: TẮT"}</span>
                    </button>
                    <button
                        className={`btn btn-outline-primary btn-sm align-items-center gap-2 px-3 py-2 fw-semibold rounded-pill ${canSimulateAlert ? 'd-flex' : 'd-none'}`}
                        style={{ borderColor: '#1E60E6', color: '#1E60E6' }}
                        onClick={() => {
                            setActionFeedback(null);
                            setActionType("SIMULATE");
                        }}
                        id="btn-simulate-iot-alert"
                    >
                        <LucidePlay size={12} />
                        <span>Diễn Tập Ngưỡng</span>
                    </button>
                    <button
                        className="btn btn-sm d-flex align-items-center gap-2 text-white px-3 py-2 fw-semibold rounded-pill"
                        style={{ backgroundColor: '#1E60E6', borderColor: '#1E60E6' }}
                        onClick={loadData}
                        disabled={isLoading}
                    >
                        <RefreshCw size={13} className={isLoading ? "fa-spin" : ""} />
                        <span>Làm Mới</span>
                    </button>
                </div>
            </div>

            <IotNavigationTabs />

            {actionFeedback && !actionType && (
                <Alert
                    variant={actionFeedback.variant}
                    dismissible
                    onClose={() => setActionFeedback(null)}
                    className="rounded-4 mb-3"
                >
                    {actionFeedback.text}
                </Alert>
            )}

            {/* System Health Status Banner */}
            <div
                className="d-flex align-items-center justify-content-between rounded-4 mb-4 p-3 border"
                style={{
                    backgroundColor: isCriticalHealth ? '#FEF2F2' : isWarningHealth ? '#FFFBEB' : '#F0FDF4',
                    borderColor: isCriticalHealth ? '#FECACA' : isWarningHealth ? '#FDE68A' : '#BBF7D0'
                }}
            >
                <div className="d-flex align-items-center gap-3">
                    <div className="fs-3">
                        {isCriticalHealth ? (
                            <AlertTriangle style={{ color: '#ef4444' }} size="1em" />
                        ) : isWarningHealth ? (
                            <AlertTriangle style={{ color: '#b48316' }} size="1em" />
                        ) : (
                            <CheckCircle2 style={{ color: '#2b8a3e' }} size="1em" />
                        )}
                    </div>
                    <div>
                        <h6 className="mb-0 fw-bold" style={{ color: isCriticalHealth ? '#b91c1c' : isWarningHealth ? '#92400e' : '#166534' }}>
                            {isCriticalHealth
                                ? "Phát hiện sự cố vượt ngưỡng môi trường khẩn cấp"
                                : isWarningHealth
                                    ? "Có thiết bị cảm biến đang cần kiểm tra môi trường"
                                    : "Hệ thống môi trường kho lạnh và phòng xét nghiệm hoạt động an toàn"}
                        </h6>
                        <p className="mb-0 small text-muted mt-1">
                            {isCriticalHealth
                                ? "Nhiệt độ hoặc độ ẩm vượt giới hạn an toàn. Nhân viên trực cần tiếp nhận và xử lý ngay."
                                : "Tất cả thông số bảo quản mẫu bệnh phẩm và thuốc thử đang nằm trong dải nhiệt độ an toàn."}
                        </p>
                    </div>
                </div>

                <div className="text-end d-none d-md-block">
                    <span className="badge px-3 py-2" style={{ backgroundColor: '#ffffff', color: isCriticalHealth ? '#ef4444' : '#475569', borderRadius: '9999px', border: '1px solid #e2e8f0' }}>
                        {summary.activeAlertsCount} cảnh báo chưa xử lý
                    </span>
                </div>
            </div>

            {/* KPI Quad Cards */}
            <div className="row g-3 mb-4">
                <div className="col-12 col-sm-6 col-xl-3">
                    <div className="bms-kpi-quad-card">
                        <div>
                            <h6 className="bms-kpi-label">Cảnh Báo Kích Hoạt</h6>
                            <div className="bms-kpi-value text-danger">{summary.activeAlertsCount}</div>
                            <div className="bms-kpi-sub text-muted">Đang chờ nhân viên tiếp nhận</div>
                        </div>
                        <div className="bms-kpi-icon-badge bms-kpi-icon-rose">
                            <Bell size="1em" />
                        </div>
                    </div>
                </div>

                <div className="col-12 col-sm-6 col-xl-3">
                    <div className="bms-kpi-quad-card">
                        <div>
                            <h6 className="bms-kpi-label">Mức Nguy Cấp (Critical)</h6>
                            <div className="bms-kpi-value" style={{ color: '#B45309' }}>{summary.criticalEmergencyCount}</div>
                            <div className="bms-kpi-sub text-muted">Vượt xa ngưỡng bảo quản an toàn</div>
                        </div>
                        <div className="bms-kpi-icon-badge bms-kpi-icon-amber">
                            <Zap size="1em" />
                        </div>
                    </div>
                </div>

                <div className="col-12 col-sm-6 col-xl-3">
                    <div className="bms-kpi-quad-card">
                        <div>
                            <h6 className="bms-kpi-label">Đang Xử Lý</h6>
                            <div className="bms-kpi-value text-primary">{summary.acknowledgedCount}</div>
                            <div className="bms-kpi-sub text-muted">Kỹ thuật viên đã tiếp nhận</div>
                        </div>
                        <div className="bms-kpi-icon-badge bms-kpi-icon-blue">
                            <UserCheck size="1em" />
                        </div>
                    </div>
                </div>

                <div className="col-12 col-sm-6 col-xl-3">
                    <div className="bms-kpi-quad-card">
                        <div>
                            <h6 className="bms-kpi-label">Đã Khắc Phục Hôm Nay</h6>
                            <div className="bms-kpi-value text-success">{summary.resolvedTodayCount}</div>
                            <div className="bms-kpi-sub text-muted">Thời gian xử lý TB: {summary.averageResolutionMinutes} phút</div>
                        </div>
                        <div className="bms-kpi-icon-badge bms-kpi-icon-green">
                            <CheckCircle2 size="1em" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Single-Line Flat Filter Bar */}
            <div className="bms-filter-bar mb-3">
                <div className="bms-search-input-pill">
                    <Search className="bms-search-icon" size="1em" />
                    <input
                        type="text"
                        placeholder="Tìm mã thiết bị, vị trí tủ lưu trữ hoặc ghi chú xử lý..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                    />
                    {searchQuery && (
                        <button
                            type="button"
                            className="bms-search-clear"
                            onClick={() => setSearchQuery("")}
                            title="Xóa tìm kiếm"
                        >
                            <LucideX size={12} />
                        </button>
                    )}
                </div>

                <div className="btn-group" role="group">
                    {[
                        { key: "All", label: "Tất cả" },
                        { key: "Active", label: "Kích hoạt" },
                        { key: "Acknowledged", label: "Đã tiếp nhận" },
                        { key: "Resolved", label: "Đã khắc phục" }
                    ].map(st => (
                        <button
                            key={st.key}
                            type="button"
                            className={`btn btn-sm ${selectedStatus === st.key ? "btn-primary text-white" : "btn-outline-secondary"}`}
                            onClick={() => setSelectedStatus(st.key)}
                        >
                            {st.label}
                        </button>
                    ))}
                </div>

                <select
                    className="form-select form-select-sm"
                    style={{ width: "auto" }}
                    value={selectedSeverity}
                    onChange={e => setSelectedSeverity(e.target.value)}
                >
                    <option value="All">Tất cả mức độ</option>
                    <option value="Warning">Cảnh báo nhẹ (Warning)</option>
                    <option value="Critical">Nguy kịch (Critical)</option>
                    <option value="Danger_Emergency">Khẩn cấp (Emergency)</option>
                </select>

                {hasActiveFilters && (
                    <button
                        type="button"
                        className="btn btn-outline-secondary btn-sm rounded-pill px-3 text-nowrap"
                        onClick={() => {
                            setSelectedStatus("All");
                            setSelectedSeverity("All");
                            setSearchQuery("");
                        }}
                    >
                        Đặt lại
                    </button>
                )}

                <span className="bms-filter-meta">
                    Hiển thị <strong>{filteredAlerts.length}</strong> cảnh báo
                </span>
            </div>

            {/* Standalone Independent Table Section (ZERO TABLE IN CARDS) */}
            <div className="bms-table-standalone-section">
                <div className="bms-table-standalone-header">
                    <div>
                        <h5 className="bms-table-standalone-title">
                            <Bell style={{ color: '#1E60E6' }} size="1em" />
                            <span>Danh Sách Cảnh Báo Vượt Ngưỡng Môi Trường</span>
                        </h5>
                        <div className="bms-table-standalone-subtitle">
                            Hiển thị {filteredAlerts.length} bản ghi cảnh báo telemetry từ các tủ trữ mẫu và phòng lab
                        </div>
                    </div>
                </div>

                <div className="bms-table-standalone-body">
                    {loadError ? (
                        <div className="text-center py-3 text-danger">
                            <p className="mb-2 fw-semibold">{loadError}</p>
                            <button type="button" className="btn btn-sm btn-outline-primary rounded-pill px-3" onClick={loadData}>
                                Thử lại
                            </button>
                        </div>
                    ) : filteredAlerts.length === 0 ? (
                        <div className="text-center py-3 text-muted">
                            <CheckCircle2 className="fs-1 mb-2" style={{ color: '#10B981' }} size="1em" />
                            <p className="mb-0 fw-semibold">Không có cảnh báo nào phù hợp với bộ lọc hiện tại.</p>
                        </div>
                    ) : (
                        <div className="table-responsive">
                            <table className="bms-dash-table">
                                <thead style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid rgba(15, 23, 42, 0.05)', color: '#475569', fontSize: '12px' }} className="text-uppercase">
                                    <tr>
                                        <th className="ps-3">Thiết Bị / Vị Trí</th>
                                        <th>Loại Cảm Biến</th>
                                        <th className="text-center">Giá Trị Đo Được</th>
                                        <th className="text-center">Ngưỡng An Toàn</th>
                                        <th className="text-center">Độ Lệch Vượt</th>
                                        <th className="text-center">Mức Độ</th>
                                        <th className="text-center">Trạng Thái</th>
                                        <th>Thời Gian Phát Hiện</th>
                                        <th className="text-end pe-3">Thao Tác Triage</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {alertsPag.paginatedItems.map(alert => {
                                        const isTemp = alert.sensorType.toLowerCase().includes("temp");
                                        const isAct = alert.status === "Active";
                                        const isAck = alert.status === "Acknowledged";
                                        const isRes = alert.status === "Resolved";

                                        const sevColor = alert.severity === "Danger_Emergency"
                                            ? "#dc2626"
                                            : alert.severity === "Critical"
                                                ? "#b48316"
                                                : "#1E60E6";

                                        return (
                                            <tr key={alert.id} style={{ borderBottom: '1px solid #EEF2F6' }}>
                                                <td className="ps-3">
                                                    <div className="fw-bold text-dark">{alert.deviceName}</div>
                                                    <div className="small text-muted font-monospace">{alert.deviceId} &bull; {alert.location}</div>
                                                </td>
                                                <td>
                                                    <span className="badge px-2.5 py-1" style={{ backgroundColor: '#EEF2F6', color: '#475569', borderRadius: '9999px' }}>
                                                        {isTemp ? <Thermometer className="text-danger me-1" size="1em" /> : <Droplet className="text-info me-1" size="1em" />}
                                                        {alert.sensorType}
                                                    </span>
                                                </td>
                                                <td className="text-center">
                                                    <span className="fs-6 fw-bold" style={{ color: sevColor, fontVariantNumeric: 'tabular-nums' }}>
                                                        {alert.observedValue}{alert.unit}
                                                    </span>
                                                </td>
                                                <td className="text-center small text-muted" style={{ fontVariantNumeric: 'tabular-nums' }}>
                                                    {alert.lowAlert}{alert.unit} &ndash; {alert.highAlert}{alert.unit}
                                                </td>
                                                <td className="text-center">
                                                    <span className="badge px-2.5 py-1" style={{ backgroundColor: sevColor, color: '#ffffff', borderRadius: '9999px', fontVariantNumeric: 'tabular-nums' }}>
                                                        +{alert.excursionAmount}{alert.unit}
                                                    </span>
                                                </td>
                                                <td className="text-center">
                                                    <span className="badge px-2.5 py-1" style={{ backgroundColor: `${sevColor}15`, color: sevColor, borderRadius: '9999px', border: `1px solid ${sevColor}30`, fontWeight: 'bold' }}>
                                                        {alert.severity}
                                                    </span>
                                                </td>
                                                <td className="text-center">
                                                    <div className="d-flex flex-column align-items-center gap-1">
                                                        {isAct && (
                                                            <span className="badge px-3 py-1" style={{ backgroundColor: 'rgba(239, 68, 68, 0.15)', color: '#dc2626', borderRadius: '9999px' }}>
                                                                KÍCH HOẠT
                                                            </span>
                                                        )}
                                                        {isAck && (
                                                            <span className="badge px-3 py-1" style={{ backgroundColor: 'rgba(231, 188, 76, 0.15)', color: '#b48316', borderRadius: '9999px' }}>
                                                                ĐÃ TIẾP NHẬN
                                                            </span>
                                                        )}
                                                        {isRes && (
                                                            <span className="badge px-3 py-1" style={{ backgroundColor: 'rgba(145, 222, 131, 0.2)', color: '#2b8a3e', borderRadius: '9999px' }}>
                                                                ĐÃ ĐÓNG CAPA
                                                            </span>
                                                        )}
                                                        {!isRes && alert.temperatureRecovered && (
                                                            <span
                                                                className="badge px-2 py-1"
                                                                style={{ backgroundColor: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0', borderRadius: '9999px', fontSize: '10.5px' }}
                                                                title={`Cảm biến đã về ngưỡng an toàn (${alert.recoveredValue ?? ''}${alert.unit}). Cần Manager đánh giá mẫu máu & đóng CAPA theo ISO 15189.`}
                                                            >
                                                                Đã hồi phục · Chờ CAPA
                                                            </span>
                                                        )}
                                                        {Array.isArray(alert.notificationChannelsDispatched) && alert.notificationChannelsDispatched.length > 0 && (
                                                            <div className="d-flex flex-wrap justify-content-center gap-1 mt-1">
                                                                {alert.notificationChannelsDispatched.map((ch) => (
                                                                    <span key={ch} style={{ fontSize: '10px', padding: '1px 6px', borderRadius: '999px', background: '#f1f5f9', color: '#475569' }}>
                                                                        {ch}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="small text-muted">
                                                    <div>{new Date(alert.triggeredAt).toLocaleString('vi-VN')}</div>
                                                    {alert.durationMinutes > 0 && (
                                                        <div className="text-danger fw-semibold">{alert.durationMinutes} phút trước</div>
                                                    )}
                                                </td>
                                                <td className="text-end pe-3">
                                                    <div className="d-flex justify-content-end gap-1">
                                                        {isAct && canAcknowledgeAlert && (
                                                            <button
                                                                className="btn btn-sm d-flex align-items-center gap-1 text-white rounded-pill text-nowrap"
                                                                style={{ backgroundColor: '#B45309', borderColor: '#B45309', fontWeight: 600, padding: '4px 12px' }}
                                                                onClick={() => {
                                                                    setActionFeedback(null);
                                                                    setSelectedAlertForAction(alert);
                                                                    setActionType("ACKNOWLEDGE");
                                                                    setActionNotes("");
                                                                }}
                                                            >
                                                                <UserCheck size="1em" /> Tiếp nhận
                                                            </button>
                                                        )}
                                                        {(isAct || isAck) && canResolveAlert && (
                                                            <button
                                                                className="btn btn-sm d-flex align-items-center gap-1 text-white rounded-pill text-nowrap"
                                                                style={{ backgroundColor: '#10B981', borderColor: '#10B981', fontWeight: 600, padding: '4px 12px' }}
                                                                onClick={() => {
                                                                    setActionFeedback(null);
                                                                    setSelectedAlertForAction(alert);
                                                                    setActionType("RESOLVE");
                                                                    setActionNotes("");
                                                                }}
                                                            >
                                                                <Wrench size="1em" /> Khắc phục
                                                            </button>
                                                        )}
                                                        {isRes && (
                                                            <span className="badge px-3 py-1.5 small" style={{ backgroundColor: '#EEF2F6', color: '#64748B', borderRadius: '9999px' }}>
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
                            <TablePagination
                                page={alertsPag.page}
                                totalPages={alertsPag.totalPages}
                                totalItems={alertsPag.totalItems}
                                pageSize={alertsPag.pageSize}
                                onPageChange={alertsPag.setPage}
                                onPageSizeChange={alertsPag.setPageSize}
                                itemLabel="cảnh báo IoT"
                            />
                        </div>
                    )}
                </div>
            </div>

            {/* Modal for Acknowledge / Resolve Actions */}
            {selectedAlertForAction && (actionType === "ACKNOWLEDGE" || actionType === "RESOLVE") && (
                <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: "rgba(15, 23, 42, 0.6)", backdropFilter: 'blur(4px)' }}>
                    <div className="modal-dialog modal-dialog-centered">
                        <div className="modal-content border-0 shadow-lg" style={{ borderRadius: '20px', overflow: 'hidden' }}>
                            <div className="modal-header" style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid rgba(15, 23, 42, 0.05)' }}>
                                <h5 className="modal-title fw-bold" style={{ color: actionType === "RESOLVE" ? '#2b8a3e' : '#b48316' }}>
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

                            <div className="modal-body p-3">
                                {actionFeedback && (
                                    <Alert variant={actionFeedback.variant} dismissible onClose={() => setActionFeedback(null)} className="rounded-3 mb-3">
                                        {actionFeedback.text}
                                    </Alert>
                                )}
                                <div className="mb-3 p-3 rounded-4 border" style={{ backgroundColor: '#F8FAFC', borderColor: 'rgba(15, 23, 42, 0.05)' }}>
                                    <div className="fw-bold text-dark">{selectedAlertForAction.deviceName} ({selectedAlertForAction.deviceId})</div>
                                    <div className="small text-muted">{selectedAlertForAction.location}</div>
                                    <div className="mt-2 small">
                                        Nhiệt độ/Độ ẩm: <strong className="text-danger">{selectedAlertForAction.observedValue}{selectedAlertForAction.unit}</strong> (Chuẩn an toàn: {selectedAlertForAction.lowAlert} - {selectedAlertForAction.highAlert}{selectedAlertForAction.unit})
                                    </div>
                                </div>

                                <div className="mb-3">
                                    <label className="form-label small fw-bold text-muted text-uppercase">Nhân sự thực hiện (Xác thực tự động từ JWT):</label>
                                    <input
                                        type="text"
                                        className="form-control"
                                        style={{ backgroundColor: '#E2E8F0', borderRadius: '12px', color: '#334155', fontWeight: 600 }}
                                        value={operatorName || "Tài khoản đăng nhập hiện tại"}
                                        readOnly
                                        disabled
                                    />
                                    <div className="form-text small">Danh tính người ký được hệ thống trích xuất trực tiếp từ phiên đăng nhập (không thể sửa tay).</div>
                                </div>

                                <div className="mb-3">
                                    <label className="form-label small fw-bold text-muted text-uppercase">
                                        {actionType === "RESOLVE" ? "Biện pháp khắc phục đã thực hiện (bắt buộc):" : "Ghi chú tiếp nhận (tùy chọn):"}
                                    </label>
                                    <textarea
                                        className="form-control"
                                        rows="3"
                                        style={{ backgroundColor: '#EEF2F6', borderRadius: '12px' }}
                                        placeholder={actionType === "RESOLVE" ? "Ví dụ: Đã thay rơ-le máy nén lạnh, chuyển mẫu sang tủ R-02 dự phòng, nhiệt độ đã về 3.8°C ổn định." : "Ví dụ: Đang trên đường tới phòng lab kiểm tra máy nén."}
                                        value={actionNotes}
                                        onChange={e => setActionNotes(e.target.value)}
                                        required={actionType === "RESOLVE"}
                                    ></textarea>
                                </div>
                            </div>

                            <div className="modal-footer" style={{ backgroundColor: '#F8FAFC', borderTop: '1px solid rgba(15, 23, 42, 0.05)' }}>
                                <button
                                    type="button"
                                    className="btn btn-outline-secondary"
                                    style={{ borderRadius: '9999px', borderColor: 'rgba(15, 23, 42, 0.05)', padding: '6px 18px' }}
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
                                    className="btn fw-semibold text-white"
                                    style={{
                                        borderRadius: '9999px',
                                        backgroundColor: actionType === 'RESOLVE' ? '#2b8a3e' : '#1E60E6',
                                        borderColor: actionType === 'RESOLVE' ? '#2b8a3e' : '#1E60E6',
                                        padding: '6px 20px'
                                    }}
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
                <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: "rgba(15, 23, 42, 0.6)", backdropFilter: 'blur(4px)' }}>
                    <div className="modal-dialog modal-dialog-centered">
                        <div className="modal-content border-0 shadow-lg" style={{ borderRadius: '20px', overflow: 'hidden' }}>
                            <div className="modal-header" style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid rgba(15, 23, 42, 0.05)' }}>
                                <h5 className="modal-title fw-bold" style={{ color: '#1E60E6' }}>
                                    <LucidePlay className="me-2" size="1em" /> Kích Hoạt Diễn Tập Cảnh Báo Vượt Ngưỡng Môi Trường
                                </h5>
                                <button
                                    type="button"
                                    className="btn-close"
                                    onClick={() => setActionType(null)}
                                ></button>
                            </div>

                            <div className="modal-body p-3">
                                {actionFeedback && (
                                    <Alert variant={actionFeedback.variant} dismissible onClose={() => setActionFeedback(null)} className="rounded-3 mb-3">
                                        {actionFeedback.text}
                                    </Alert>
                                )}
                                <p className="small text-muted mb-3">
                                    Công cụ diễn tập mô phỏng cảm biến IoT gửi giá trị bất thường vượt qua ngưỡng Low/High để kiểm tra phản ứng hệ thống, kích hoạt âm thanh cảnh báo và ghi nhận log audit.
                                </p>

                                <div className="mb-3">
                                    <label className="form-label small fw-bold text-muted text-uppercase">Mã thiết bị cảm biến:</label>
                                    <select
                                        className="form-select"
                                        style={{ backgroundColor: '#EEF2F6', borderRadius: '12px' }}
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
                                        style={{ backgroundColor: '#EEF2F6', borderRadius: '12px' }}
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
                                        style={{ backgroundColor: '#EEF2F6', borderRadius: '12px' }}
                                        value={simValue}
                                        onChange={e => setSimValue(e.target.value)}
                                    />
                                    <div className="form-text small">
                                        Nhập giá trị vượt khỏi dải an toàn (Ví dụ: 8.8°C hoặc 18%).
                                    </div>
                                </div>
                            </div>

                            <div className="modal-footer" style={{ backgroundColor: '#F8FAFC', borderTop: '1px solid rgba(15, 23, 42, 0.05)' }}>
                                <button
                                    type="button"
                                    className="btn btn-outline-secondary"
                                    style={{ borderRadius: '9999px', borderColor: 'rgba(15, 23, 42, 0.05)', padding: '6px 18px' }}
                                    onClick={() => setActionType(null)}
                                    disabled={isSubmitting}
                                >
                                    Hủy
                                </button>
                                <button
                                    type="button"
                                    className="btn btn-danger fw-semibold"
                                    style={{ borderRadius: '9999px', padding: '6px 20px' }}
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
