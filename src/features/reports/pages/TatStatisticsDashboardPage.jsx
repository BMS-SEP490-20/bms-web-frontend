/**
 * @file TatStatisticsDashboardPage.jsx
 * @description Executive Laboratory Turnaround Time (TAT) Analytics & SLA Compliance Dashboard (UC63 / I3-047).
 * Features Mean/Median/P90 percentile benchmarks, 3-phase ISO 15189 lifecycle distribution,
 * priority SLA compliance tracking, department comparison, daily trend charts, and outlier violation triage.
 * Conforms to: Production Medical Standards, ISO 15189 Quality Management & AGENTS-DESIGN.md.
 */

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
    FaClock,
    FaCheckCircle,
    FaExclamationTriangle,
    FaChartLine,
    FaChartBar,
    FaFilter,
    FaDownload,
    FaSync,
    FaFlask,
    FaVial,
    FaLayerGroup,
    FaBolt,
    FaCalendarAlt,
    FaShieldAlt,
    FaSearch,
    FaArrowUp,
    FaArrowDown,
    FaInfoCircle,
    FaCheck
} from "react-icons/fa";
import {
    fetchTatReport,
    exportTatCsv
} from "../api/tatStatisticsApi";

const TIMEFRAMES = [
    { key: "TODAY", label: "Hôm nay", days: 0 },
    { key: "WEEK", label: "7 ngày qua", days: 7 },
    { key: "MONTH", label: "30 ngày qua", days: 30 },
    { key: "ALL", label: "Toàn thời gian", days: 90 }
];

const DEPARTMENTS = [
    { key: "ALL", label: "Tất cả chuyên khoa" },
    { key: "Biochemistry", label: "Sinh Hóa (Biochemistry)" },
    { key: "Hematology", label: "Huyết Học (Hematology)" },
    { key: "Immunology", label: "Miễn Dịch (Immunology)" },
    { key: "Urinalysis", label: "Nước Tiểu (Urinalysis)" },
    { key: "Microbiology", label: "Vi Sinh (Microbiology)" }
];

export default function TatStatisticsDashboardPage() {
    // Filter states
    const [selectedTimeframe, setSelectedTimeframe] = useState("MONTH");
    const [selectedDepartment, setSelectedDepartment] = useState("ALL");
    const [selectedPriority, setSelectedPriority] = useState("ALL");
    const [activeTab, setActiveTab] = useState("PRIORITY"); // PRIORITY, PHASES, DEPARTMENTS, TRENDS, VIOLATIONS
    const [isLoading, setIsLoading] = useState(false);
    const [isExporting, setIsExporting] = useState(false);

    // Data state
    const [report, setReport] = useState({
        summary: {
            totalCompletedTests: 0,
            totalPendingTests: 0,
            totalRejectedCount: 0,
            averageTatMinutes: 0,
            averageTatFormatted: "0m",
            medianTatMinutes: 0,
            medianTatFormatted: "0m",
            p90TatMinutes: 0,
            p90TatFormatted: "0m",
            minTatMinutes: 0,
            maxTatMinutes: 0,
            targetComplianceRate: 100.0,
            violationCount: 0
        },
        priorityBreakdown: [],
        departmentBreakdown: [],
        phaseBreakdown: [],
        trends: [],
        recentViolations: []
    });

    const loadData = useCallback(async () => {
        setIsLoading(true);
        try {
            const tf = TIMEFRAMES.find(t => t.key === selectedTimeframe);
            const days = tf ? tf.days : 30;
            const fromDate = days > 0 ? new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString() : new Date().toISOString();

            const data = await fetchTatReport({
                fromDate,
                toDate: new Date().toISOString(),
                department: selectedDepartment,
                priority: selectedPriority
            });
            setReport(data);
        } catch (error) {
            console.error("Failed to load TAT statistics:", error);
        } finally {
            setIsLoading(false);
        }
    }, [selectedTimeframe, selectedDepartment, selectedPriority]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    // Handle CSV Export
    const handleExportCsv = async () => {
        setIsExporting(true);
        try {
            const blob = await exportTatCsv({
                department: selectedDepartment,
                priority: selectedPriority
            });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `BaoCao_TAT_${selectedDepartment}_${new Date().toISOString().slice(0, 10)}.csv`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        } catch (err) {
            console.error("CSV Export failed:", err);
        } finally {
            setIsExporting(false);
        }
    };

    const summary = report.summary || {};

    return (
        <div className="container-fluid py-4 px-xl-5" style={{ minHeight: "90vh", background: "#f8fafc" }}>
            {/* Page Header */}
            <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 pb-3 border-bottom">
                <div>
                    <div className="d-flex align-items-center gap-2">
                        <span className="badge bg-primary px-3 py-2 fs-6">UC63</span>
                        <h2 className="h3 mb-0 fw-bold text-slate-800">Báo Cáo Thống Kê Thời Gian Quay Vòng Xét Nghiệm (Turnaround Time - TAT)</h2>
                    </div>
                    <p className="text-muted small mt-1 mb-0">
                        Giám sát chỉ số chất lượng xét nghiệm theo chuẩn ISO 15189: Đánh giá trung bình, trung vị (Median), phân vị 90 (P90), phân rã 3 giai đoạn và phát hiện vi phạm SLA.
                    </p>
                </div>

                <div className="d-flex align-items-center gap-2 mt-3 mt-md-0">
                    <button
                        className="btn btn-outline-secondary btn-sm d-flex align-items-center gap-1 shadow-sm"
                        onClick={loadData}
                        disabled={isLoading}
                    >
                        <FaSync className={isLoading ? "fa-spin" : ""} /> Làm mới
                    </button>
                    <button
                        className="btn btn-success btn-sm d-flex align-items-center gap-1 shadow-sm"
                        onClick={handleExportCsv}
                        disabled={isExporting}
                        id="btn-export-tat-csv"
                    >
                        <FaDownload /> {isExporting ? "Đang xuất..." : "Xuất File CSV"}
                    </button>
                </div>
            </div>

            {/* Filter Toolbar */}
            <div className="card border-0 shadow-sm rounded-3 mb-4 bg-white">
                <div className="card-body p-3">
                    <div className="row g-3 align-items-center">
                        {/* Timeframe Buttons */}
                        <div className="col-12 col-md-5 col-xl-4">
                            <label className="small text-muted fw-bold text-uppercase d-block mb-1">
                                <FaCalendarAlt className="me-1" /> Khung thời gian:
                            </label>
                            <div className="btn-group btn-group-sm w-100" role="group">
                                {TIMEFRAMES.map(tf => (
                                    <button
                                        key={tf.key}
                                        type="button"
                                        className={`btn ${selectedTimeframe === tf.key ? 'btn-primary' : 'btn-outline-secondary'}`}
                                        onClick={() => setSelectedTimeframe(tf.key)}
                                    >
                                        {tf.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Department Filter */}
                        <div className="col-12 col-sm-6 col-md-4 col-xl-4">
                            <label className="small text-muted fw-bold text-uppercase d-block mb-1">
                                <FaFlask className="me-1" /> Chuyên khoa xét nghiệm:
                            </label>
                            <select
                                className="form-select form-select-sm"
                                value={selectedDepartment}
                                onChange={e => setSelectedDepartment(e.target.value)}
                            >
                                {DEPARTMENTS.map(d => (
                                    <option key={d.key} value={d.key}>{d.label}</option>
                                ))}
                            </select>
                        </div>

                        {/* Priority Filter */}
                        <div className="col-12 col-sm-6 col-md-3 col-xl-4">
                            <label className="small text-muted fw-bold text-uppercase d-block mb-1">
                                <FaBolt className="me-1" /> Độ ưu tiên (Urgency):
                            </label>
                            <select
                                className="form-select form-select-sm"
                                value={selectedPriority}
                                onChange={e => setSelectedPriority(e.target.value)}
                            >
                                <option value="ALL">Tất cả ưu tiên</option>
                                <option value="Stat">Cấp cứu (STAT - Mục tiêu &le; 60m)</option>
                                <option value="Urgent">Khẩn cấp (Urgent - Mục tiêu &le; 120m)</option>
                                <option value="Normal">Thường quy (Normal - Mục tiêu &le; 240m)</option>
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            {/* Executive KPI Ribbon */}
            <div className="row g-3 mb-4">
                {/* Average TAT */}
                <div className="col-12 col-sm-6 col-xl-2">
                    <div className="card border-0 shadow-sm rounded-3 p-3 bg-white h-100 border-start border-primary border-4">
                        <div className="text-muted small fw-semibold text-uppercase">TAT Trung Bình (Mean)</div>
                        <div className="fs-3 fw-bold text-primary mt-1">{summary.averageTatFormatted || "0m"}</div>
                        <div className="small text-muted mt-1 font-monospace" style={{ fontSize: "0.75rem" }}>
                            {summary.averageTatMinutes} phút
                        </div>
                    </div>
                </div>

                {/* Median TAT (P50) */}
                <div className="col-12 col-sm-6 col-xl-2">
                    <div className="card border-0 shadow-sm rounded-3 p-3 bg-white h-100 border-start border-info border-4">
                        <div className="text-muted small fw-semibold text-uppercase">Trung Vị (Median P50)</div>
                        <div className="fs-3 fw-bold text-info mt-1">{summary.medianTatFormatted || "0m"}</div>
                        <div className="small text-muted mt-1" style={{ fontSize: "0.75rem" }}>
                            50% mẫu hoàn tất sớm hơn
                        </div>
                    </div>
                </div>

                {/* 90th Percentile (P90) */}
                <div className="col-12 col-sm-6 col-xl-2">
                    <div className="card border-0 shadow-sm rounded-3 p-3 bg-white h-100 border-start border-secondary border-4">
                        <div className="text-muted small fw-semibold text-uppercase">Phân Vị 90 (P90 SLA)</div>
                        <div className="fs-3 fw-bold text-dark mt-1">{summary.p90TatFormatted || "0m"}</div>
                        <div className="small text-muted mt-1" style={{ fontSize: "0.75rem" }}>
                            Chuẩn cam kết ISO SLA
                        </div>
                    </div>
                </div>

                {/* Target Compliance Rate */}
                <div className="col-12 col-sm-6 col-xl-2">
                    <div className="card border-0 shadow-sm rounded-3 p-3 bg-white h-100 border-start border-success border-4">
                        <div className="text-muted small fw-semibold text-uppercase">Tỷ Lệ Đạt Chuẩn</div>
                        <div className="fs-3 fw-bold text-success mt-1">{summary.targetComplianceRate || 100}%</div>
                        <div className="progress mt-2" style={{ height: "4px" }}>
                            <div
                                className="progress-bar bg-success"
                                role="progressbar"
                                style={{ width: `${summary.targetComplianceRate || 100}%` }}
                            ></div>
                        </div>
                    </div>
                </div>

                {/* Total Processed */}
                <div className="col-12 col-sm-6 col-xl-2">
                    <div className="card border-0 shadow-sm rounded-3 p-3 bg-white h-100 border-start border-primary border-4">
                        <div className="text-muted small fw-semibold text-uppercase">Tổng Mẫu Hoàn Tất</div>
                        <div className="fs-3 fw-bold text-dark mt-1">{summary.totalCompletedTests || 0}</div>
                        <div className="small text-muted mt-1" style={{ fontSize: "0.75rem" }}>
                            Đã phê duyệt &amp; ký số
                        </div>
                    </div>
                </div>

                {/* Overdue Violations */}
                <div className="col-12 col-sm-6 col-xl-2">
                    <div className="card border-0 shadow-sm rounded-3 p-3 bg-white h-100 border-start border-danger border-4">
                        <div className="text-muted small fw-semibold text-uppercase">Mẫu Vượt Ngưỡng (Trễ)</div>
                        <div className="fs-3 fw-bold text-danger mt-1">{summary.violationCount || 0}</div>
                        <div className="small text-danger fw-semibold mt-1" style={{ fontSize: "0.75rem" }}>
                            Cần rà soát tắc nghẽn
                        </div>
                    </div>
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="card border-0 shadow-sm rounded-3 mb-4">
                <div className="card-header bg-white border-bottom p-0">
                    <ul className="nav nav-tabs border-0 px-3 pt-2 gap-1">
                        {[
                            { key: "PRIORITY", label: "Phân Tích Độ Ưu Tiên (SLA)", icon: FaBolt },
                            { key: "PHASES", label: "Phân Rã 3 Giai Đoạn (ISO 15189)", icon: FaLayerGroup },
                            { key: "DEPARTMENTS", label: "Theo Chuyên Khoa Lab", icon: FaFlask },
                            { key: "TRENDS", label: "Biểu Đồ Xu Hướng Ngày", icon: FaChartLine },
                            { key: "VIOLATIONS", label: `Cảnh Báo Trễ (${summary.violationCount || 0})`, icon: FaExclamationTriangle, badge: "bg-danger text-white" }
                        ].map(tab => {
                            const Icon = tab.icon;
                            return (
                                <li className="nav-item" key={tab.key}>
                                    <button
                                        className={`nav-link py-3 px-3 fw-semibold border-0 border-bottom border-3 d-flex align-items-center gap-2 ${activeTab === tab.key ? 'active border-primary text-primary' : 'text-muted border-transparent'}`}
                                        onClick={() => setActiveTab(tab.key)}
                                    >
                                        <Icon />
                                        <span>{tab.label}</span>
                                    </button>
                                </li>
                            );
                        })}
                    </ul>
                </div>

                <div className="card-body p-4">
                    {/* TAB 1: Priority Breakdown */}
                    {activeTab === "PRIORITY" && (
                        <div>
                            <h5 className="fw-bold mb-3 text-dark">Hiệu Suất Thời Gian Quay Vòng Theo Mức Độ Ưu Tiên Khám Chữa Bệnh</h5>
                            <div className="row g-4">
                                {report.priorityBreakdown.map(p => {
                                    const isStat = p.priority.toLowerCase() === "stat";
                                    const isUrgent = p.priority.toLowerCase() === "urgent";
                                    const theme = isStat ? "danger" : isUrgent ? "warning" : "primary";

                                    return (
                                        <div className="col-12 col-md-4" key={p.priority}>
                                            <div className={`card border rounded-3 p-3 bg-white h-100 border-top border-4 border-${theme} shadow-sm`}>
                                                <div className="d-flex justify-content-between align-items-center mb-2">
                                                    <span className={`badge bg-${theme}-subtle text-${theme} px-2 py-1 fs-6 fw-bold`}>
                                                        {p.priority.toUpperCase()}
                                                    </span>
                                                    <span className="small text-muted">
                                                        Mục tiêu chuẩn: &le; <strong>{p.targetMinutes} phút</strong>
                                                    </span>
                                                </div>

                                                <div className="my-3">
                                                    <div className="text-muted small">Thời gian trung bình thực tế:</div>
                                                    <div className={`fs-2 fw-bold text-${theme}`}>
                                                        {p.averageTatFormatted}
                                                    </div>
                                                    <div className="small text-muted font-monospace">{p.averageTatMinutes} phút</div>
                                                </div>

                                                <div className="mb-3">
                                                    <div className="d-flex justify-content-between small text-muted mb-1">
                                                        <span>Tỷ lệ đạt chuẩn SLA:</span>
                                                        <span className="fw-bold text-dark">{p.complianceRate}%</span>
                                                    </div>
                                                    <div className="progress" style={{ height: "8px" }}>
                                                        <div
                                                            className={`progress-bar bg-${theme}`}
                                                            role="progressbar"
                                                            style={{ width: `${p.complianceRate}%` }}
                                                        ></div>
                                                    </div>
                                                </div>

                                                <div className="d-flex justify-content-between align-items-center pt-2 border-top small text-muted">
                                                    <span>Tổng số mẫu: <strong>{p.totalCount}</strong></span>
                                                    <span>Vi phạm: <strong className={p.violationCount > 0 ? "text-danger" : "text-success"}>{p.violationCount}</strong></span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* TAB 2: Phase Breakdown (ISO 15189) */}
                    {activeTab === "PHASES" && (
                        <div>
                            <h5 className="fw-bold mb-2 text-dark">Phân Rã Thời Gian Theo 3 Giai Đoạn Quy Trình Xét Nghiệm (ISO 15189)</h5>
                            <p className="text-muted small mb-4">
                                Nhận diện chính xác giai đoạn phát sinh tắc nghẽn (Bottlenecks) để tối ưu luồng chuyển phát mẫu và tự động hóa kết nối thiết bị LIS.
                            </p>

                            {/* Horizontal Stacked Bar */}
                            <div className="mb-4">
                                <label className="small text-muted fw-bold text-uppercase d-block mb-2">Tỷ lệ đóng góp thời gian vào tổng quy trình TAT:</label>
                                <div className="progress" style={{ height: "28px" }}>
                                    {report.phaseBreakdown.map((ph, idx) => {
                                        const colors = ["bg-info", "bg-primary", "bg-success"];
                                        return (
                                            <div
                                                key={ph.phaseName}
                                                className={`progress-bar ${colors[idx % colors.length]} fw-bold text-white small`}
                                                role="progressbar"
                                                style={{ width: `${ph.percentageOfTotal}%` }}
                                                title={`${ph.phaseDescription}: ${ph.percentageOfTotal}%`}
                                            >
                                                {ph.percentageOfTotal}%
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="row g-3">
                                {report.phaseBreakdown.map((ph, idx) => {
                                    const badges = ["Giai đoạn 1", "Giai đoạn 2", "Giai đoạn 3"];
                                    return (
                                        <div className="col-12 col-md-4" key={ph.phaseName}>
                                            <div className="card border rounded-3 p-3 bg-light h-100">
                                                <div className="d-flex justify-content-between align-items-center">
                                                    <span className="badge bg-secondary">{badges[idx]}</span>
                                                    <span className="fs-5 fw-bold text-dark">{ph.percentageOfTotal}%</span>
                                                </div>
                                                <h6 className="fw-bold mt-2 mb-1">{ph.phaseDescription}</h6>
                                                <div className="fs-3 fw-bold text-primary mt-2">{ph.averageFormatted}</div>
                                                <div className="small text-muted font-monospace">{ph.averageMinutes} phút trung bình</div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* TAB 3: Department Breakdown */}
                    {activeTab === "DEPARTMENTS" && (
                        <div>
                            <h5 className="fw-bold mb-3 text-dark">Hiệu Suất Thời Gian Quay Vòng Theo Chuyên Khoa Phòng Lab</h5>
                            <div className="table-responsive">
                                <table className="table table-hover align-middle border">
                                    <thead className="table-light small text-muted text-uppercase">
                                        <tr>
                                            <th>Chuyên Khoa / Phòng Lab</th>
                                            <th className="text-center">Số Lượng Mẫu</th>
                                            <th className="text-center">TAT Trung Bình</th>
                                            <th>Tỷ Lệ Đạt Chuẩn SLA</th>
                                            <th className="text-center">Số Mẫu Trễ</th>
                                            <th className="text-end">Đánh Giá ISO</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {report.departmentBreakdown.map(d => (
                                            <tr key={d.department}>
                                                <td className="fw-bold text-dark">
                                                    <FaFlask className="me-2 text-primary" />
                                                    {d.department}
                                                </td>
                                                <td className="text-center">{d.totalCount}</td>
                                                <td className="text-center fw-bold text-primary">
                                                    {d.averageTatFormatted} ({d.averageTatMinutes}m)
                                                </td>
                                                <td style={{ minWidth: "180px" }}>
                                                    <div className="d-flex align-items-center gap-2">
                                                        <div className="progress flex-grow-1" style={{ height: "6px" }}>
                                                            <div
                                                                className={`progress-bar ${d.complianceRate >= 90 ? 'bg-success' : 'bg-warning'}`}
                                                                role="progressbar"
                                                                style={{ width: `${d.complianceRate}%` }}
                                                            ></div>
                                                        </div>
                                                        <span className="small fw-bold">{d.complianceRate}%</span>
                                                    </div>
                                                </td>
                                                <td className="text-center">
                                                    <span className={`badge ${d.violationCount > 0 ? 'bg-danger-subtle text-danger' : 'bg-success-subtle text-success'}`}>
                                                        {d.violationCount} mẫu
                                                    </span>
                                                </td>
                                                <td className="text-end">
                                                    {d.complianceRate >= 90 ? (
                                                        <span className="badge bg-success-subtle text-success border border-success-subtle">
                                                            <FaCheckCircle className="me-1" /> Đạt ISO 15189
                                                        </span>
                                                    ) : (
                                                        <span className="badge bg-warning-subtle text-warning border border-warning-subtle">
                                                            <FaExclamationTriangle className="me-1" /> Cần cải tiến
                                                        </span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* TAB 4: Daily Trends */}
                    {activeTab === "TRENDS" && (
                        <div>
                            <h5 className="fw-bold mb-3 text-dark">Biến Thiên Xu Hướng TAT Theo Từng Ngày Vận Hành</h5>
                            <div className="row g-3">
                                {report.trends.map(t => (
                                    <div className="col-12 col-sm-6 col-md-4 col-xl-3" key={t.dateLabel}>
                                        <div className="card border rounded-3 p-3 bg-white shadow-sm">
                                            <div className="d-flex justify-content-between align-items-center">
                                                <span className="fw-bold text-dark">{t.dateLabel}</span>
                                                <span className="badge bg-light text-muted border">{t.volume} mẫu</span>
                                            </div>
                                            <div className="fs-4 fw-bold text-primary mt-2">
                                                {Math.round(t.averageTatMinutes)} phút
                                            </div>
                                            <div className="d-flex justify-content-between small text-muted mt-2 pt-2 border-top">
                                                <span>Đạt SLA: <strong>{t.complianceRate}%</strong></span>
                                                <span>Trễ: <strong className={t.violationCount > 0 ? 'text-danger' : 'text-success'}>{t.violationCount}</strong></span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* TAB 5: Violations */}
                    {activeTab === "VIOLATIONS" && (
                        <div>
                            <div className="d-flex justify-content-between align-items-center mb-3">
                                <h5 className="fw-bold text-danger mb-0 d-flex align-items-center gap-2">
                                    <FaExclamationTriangle /> Danh Sách Mẫu Vượt Ngưỡng Thời Gian (Outlier Violations)
                                </h5>
                                <span className="badge bg-danger-subtle text-danger px-3 py-1">
                                    {report.recentViolations.length} trường hợp phát hiện
                                </span>
                            </div>

                            {report.recentViolations.length === 0 ? (
                                <div className="text-center py-5 text-muted">
                                    <FaCheckCircle className="fs-1 text-success mb-2" />
                                    <p className="mb-0 fw-semibold">Tuyệt vời! Không ghi nhận trường hợp mẫu nào vượt ngưỡng thời gian cam kết.</p>
                                </div>
                            ) : (
                                <div className="table-responsive">
                                    <table className="table table-hover align-middle border">
                                        <thead className="table-danger small text-danger text-uppercase">
                                            <tr>
                                                <th>Mã Barcode</th>
                                                <th>Bệnh Nhân</th>
                                                <th>Gói Xét Nghiệm</th>
                                                <th>Ưu Tiên</th>
                                                <th className="text-center">TAT Thực Tế</th>
                                                <th className="text-center">Mục Tiêu</th>
                                                <th className="text-center">Thời Gian Trễ</th>
                                                <th>Giai Đoạn Nghẽn</th>
                                                <th>KTV Phụ Trách</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {report.recentViolations.map(v => (
                                                <tr key={v.sampleId || v.barcode}>
                                                    <td className="font-monospace fw-bold text-dark">{v.barcode}</td>
                                                    <td>{v.patientName}</td>
                                                    <td className="text-truncate" style={{ maxWidth: "200px" }}>{v.testPackage}</td>
                                                    <td>
                                                        <span className="badge bg-danger text-white">{v.priority}</span>
                                                    </td>
                                                    <td className="text-center fw-bold text-danger">{v.actualTatMinutes}m</td>
                                                    <td className="text-center text-muted">&le; {v.targetTatMinutes}m</td>
                                                    <td className="text-center fw-bold text-danger">+{v.delayMinutes}m</td>
                                                    <td>
                                                        <span className="badge bg-warning-subtle text-dark border">
                                                            {v.bottleneckPhase}
                                                        </span>
                                                    </td>
                                                    <td className="small text-muted">{v.technicianName || "Chưa gán"}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
