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
        <div className="container-fluid py-4 px-xl-5" style={{ minHeight: "90vh", background: "#EEF2F6" }}>
            {/* Page Header */}
            <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 pb-3 border-bottom" style={{ borderColor: 'rgba(15, 23, 42, 0.05)' }}>
                <div>
                    <div className="d-flex align-items-center gap-2">
                        <span className="badge px-3 py-1.5 fs-6" style={{ backgroundColor: 'rgba(94, 133, 230, 0.15)', color: '#648CF4', borderRadius: '9999px', border: '1px solid rgba(94, 133, 230, 0.3)' }}>UC63</span>
                        <h2 className="h4 mb-0 fw-bold text-dark">Báo Cáo Thống Kê Thời Gian Quay Vòng Xét Nghiệm (TAT)</h2>
                    </div>
                    <p className="text-muted small mt-1 mb-0">
                        Giám sát chỉ số chất lượng xét nghiệm theo chuẩn ISO 15189: Đánh giá trung bình, trung vị (Median), phân vị 90 (P90), phân rã 3 giai đoạn và phát hiện vi phạm SLA.
                    </p>
                </div>

                <div className="d-flex align-items-center gap-2 mt-3 mt-md-0">
                    <button
                        className="btn btn-outline-secondary btn-sm d-flex align-items-center gap-1.5 shadow-sm"
                        style={{ borderRadius: '9999px', padding: '6px 18px', borderColor: 'rgba(15, 23, 42, 0.05)' }}
                        onClick={loadData}
                        disabled={isLoading}
                    >
                        <FaSync className={isLoading ? "fa-spin" : ""} /> Làm mới
                    </button>
                    <button
                        className="btn btn-sm d-flex align-items-center gap-1.5 shadow-sm text-white"
                        style={{ borderRadius: '9999px', padding: '6px 20px', backgroundColor: '#A3E687', borderColor: '#A3E687', color: '#14532d', fontWeight: '600' }}
                        onClick={handleExportCsv}
                        disabled={isExporting}
                        id="btn-export-tat-csv"
                    >
                        <FaDownload /> {isExporting ? "Đang xuất..." : "Xuất File CSV"}
                    </button>
                </div>
            </div>

            {/* Filter Toolbar */}
            <div className="card shadow-sm rounded-4 mb-4 bg-white" style={{ border: '1px solid rgba(15, 23, 42, 0.05)' }}>
                <div className="card-body p-3">
                    <div className="row g-3 align-items-center">
                        {/* Timeframe Buttons */}
                        <div className="col-12 col-md-5 col-xl-4">
                            <label className="small text-muted fw-bold text-uppercase d-block mb-1">
                                <FaCalendarAlt className="me-1" style={{ color: '#648CF4' }} /> Khung thời gian:
                            </label>
                            <div className="d-flex flex-wrap gap-1" role="group">
                                {TIMEFRAMES.map(tf => (
                                    <button
                                        key={tf.key}
                                        type="button"
                                        className="btn btn-sm"
                                        style={{
                                            borderRadius: '9999px',
                                            padding: '4px 14px',
                                            backgroundColor: selectedTimeframe === tf.key ? '#648CF4' : '#EEF2F6',
                                            color: selectedTimeframe === tf.key ? '#ffffff' : '#475569',
                                            border: '1px solid',
                                            borderColor: selectedTimeframe === tf.key ? '#648CF4' : 'rgba(15, 23, 42, 0.05)',
                                            fontWeight: '600'
                                        }}
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
                                <FaFlask className="me-1" style={{ color: '#648CF4' }} /> Chuyên khoa xét nghiệm:
                            </label>
                            <select
                                className="form-select form-select-sm"
                                style={{ borderRadius: '12px', backgroundColor: '#EEF2F6', border: '1px solid rgba(15, 23, 42, 0.05)' }}
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
                                <FaBolt className="me-1" style={{ color: '#E7BC4C' }} /> Độ ưu tiên (Urgency):
                            </label>
                            <select
                                className="form-select form-select-sm"
                                style={{ borderRadius: '12px', backgroundColor: '#EEF2F6', border: '1px solid rgba(15, 23, 42, 0.05)' }}
                                value={selectedPriority}
                                onChange={e => setSelectedPriority(e.target.value)}
                            >
                                <option value="ALL">Tất cả ưu tiên</option>
                                <option value="Stat">Cấp cứu (STAT - Mục tiêu &le; 60m)</option>
                                <option value="Urgent">Khẩn cấp (Urgent - Mục tiêu &le; 120m)</option>
                                <option value="Normal">Thường quy (Normal - Mục tiêu &le; 120m)</option>
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            {/* Executive KPI Ribbon */}
            <div className="row g-3 mb-4">
                {/* Average TAT */}
                <div className="col-12 col-sm-6 col-xl-2">
                    <div className="card shadow-sm rounded-4 p-3 bg-white h-100" style={{ border: '1px solid rgba(15, 23, 42, 0.05)' }}>
                        <div className="text-muted small fw-semibold text-uppercase">TAT Trung Bình (Mean)</div>
                        <div className="fs-3 fw-bold mt-1" style={{ color: '#648CF4', fontVariantNumeric: 'tabular-nums' }}>{summary.averageTatFormatted || "0m"}</div>
                        <div className="small text-muted mt-1 font-monospace" style={{ fontSize: "0.75rem" }}>
                            {summary.averageTatMinutes} phút
                        </div>
                    </div>
                </div>

                {/* Median TAT (P50) */}
                <div className="col-12 col-sm-6 col-xl-2">
                    <div className="card shadow-sm rounded-4 p-3 bg-white h-100" style={{ border: '1px solid rgba(15, 23, 42, 0.05)' }}>
                        <div className="text-muted small fw-semibold text-uppercase">Trung Vị (Median P50)</div>
                        <div className="fs-3 fw-bold mt-1" style={{ color: '#648CF4', fontVariantNumeric: 'tabular-nums' }}>{summary.medianTatFormatted || "0m"}</div>
                        <div className="small text-muted mt-1" style={{ fontSize: "0.75rem" }}>
                            50% mẫu hoàn tất sớm hơn
                        </div>
                    </div>
                </div>

                {/* 90th Percentile (P90) */}
                <div className="col-12 col-sm-6 col-xl-2">
                    <div className="card shadow-sm rounded-4 p-3 bg-white h-100" style={{ border: '1px solid rgba(15, 23, 42, 0.05)' }}>
                        <div className="text-muted small fw-semibold text-uppercase">Phân Vị 90 (P90 SLA)</div>
                        <div className="fs-3 fw-bold text-dark mt-1" style={{ fontVariantNumeric: 'tabular-nums' }}>{summary.p90TatFormatted || "0m"}</div>
                        <div className="small text-muted mt-1" style={{ fontSize: "0.75rem" }}>
                            Chuẩn cam kết ISO SLA
                        </div>
                    </div>
                </div>

                {/* Target Compliance Rate */}
                <div className="col-12 col-sm-6 col-xl-2">
                    <div className="card shadow-sm rounded-4 p-3 bg-white h-100" style={{ border: '1px solid rgba(15, 23, 42, 0.05)' }}>
                        <div className="text-muted small fw-semibold text-uppercase">Tỷ Lệ Đạt Chuẩn</div>
                        <div className="fs-3 fw-bold mt-1" style={{ color: '#A3E687', fontVariantNumeric: 'tabular-nums' }}>{summary.targetComplianceRate || 100}%</div>
                        <div className="progress mt-2" style={{ height: "4px", borderRadius: '9999px' }}>
                            <div
                                className="progress-bar"
                                role="progressbar"
                                style={{ width: `${summary.targetComplianceRate || 100}%`, backgroundColor: '#A3E687', borderRadius: '9999px' }}
                            ></div>
                        </div>
                    </div>
                </div>

                {/* Total Processed */}
                <div className="col-12 col-sm-6 col-xl-2">
                    <div className="card shadow-sm rounded-4 p-3 bg-white h-100" style={{ border: '1px solid rgba(15, 23, 42, 0.05)' }}>
                        <div className="text-muted small fw-semibold text-uppercase">Tổng Mẫu Hoàn Tất</div>
                        <div className="fs-3 fw-bold text-dark mt-1" style={{ fontVariantNumeric: 'tabular-nums' }}>{summary.totalCompletedTests || 0}</div>
                        <div className="small text-muted mt-1" style={{ fontSize: "0.75rem" }}>
                            Đã phê duyệt &amp; ký số
                        </div>
                    </div>
                </div>

                {/* Overdue Violations */}
                <div className="col-12 col-sm-6 col-xl-2">
                    <div className="card shadow-sm rounded-4 p-3 bg-white h-100" style={{ border: '1px solid rgba(15, 23, 42, 0.05)' }}>
                        <div className="text-muted small fw-semibold text-uppercase">Mẫu Vượt Ngưỡng (Trễ)</div>
                        <div className="fs-3 fw-bold mt-1" style={{ color: '#E7BC4C', fontVariantNumeric: 'tabular-nums' }}>{summary.violationCount || 0}</div>
                        <div className="small fw-semibold mt-1" style={{ fontSize: "0.75rem", color: '#b48316' }}>
                            Cần rà soát tắc nghẽn
                        </div>
                    </div>
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="card shadow-sm rounded-4 mb-4 overflow-hidden" style={{ border: '1px solid rgba(15, 23, 42, 0.05)' }}>
                <div className="card-header border-bottom p-0" style={{ backgroundColor: '#F8FAFC', borderColor: 'rgba(15, 23, 42, 0.05)' }}>
                    <ul className="nav nav-tabs border-0 px-3 pt-2 gap-1">
                        {[
                            { key: "PRIORITY", label: "Phân Tích Độ Ưu Tiên (SLA)", icon: FaBolt },
                            { key: "PHASES", label: "Phân Rã 3 Giai Đoạn (ISO 15189)", icon: FaLayerGroup },
                            { key: "DEPARTMENTS", label: "Theo Chuyên Khoa Lab", icon: FaFlask },
                            { key: "TRENDS", label: "Biểu Đồ Xu Hướng Ngày", icon: FaChartLine },
                            { key: "VIOLATIONS", label: `Cảnh Báo Trễ (${summary.violationCount || 0})`, icon: FaExclamationTriangle }
                        ].map(tab => {
                            const Icon = tab.icon;
                            const isActive = activeTab === tab.key;
                            return (
                                <li className="nav-item" key={tab.key}>
                                    <button
                                        className="nav-link py-3 px-3 fw-semibold border-0 border-bottom border-3 d-flex align-items-center gap-2"
                                        style={{
                                            color: isActive ? '#648CF4' : '#64748B',
                                            borderBottomColor: isActive ? '#648CF4' : 'transparent',
                                            backgroundColor: 'transparent'
                                        }}
                                        onClick={() => setActiveTab(tab.key)}
                                    >
                                        <Icon style={{ color: isActive ? '#648CF4' : '#94A3B8' }} />
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
                                {(Array.isArray(report.priorityBreakdown) ? report.priorityBreakdown : []).map(p => {
                                    const isStat = p.priority.toLowerCase() === "stat";
                                    const isUrgent = p.priority.toLowerCase() === "urgent";
                                    const themeColor = isStat ? "#dc2626" : isUrgent ? "#E7BC4C" : "#648CF4";

                                    return (
                                        <div className="col-12 col-md-4" key={p.priority}>
                                            <div className="card shadow-sm rounded-4 p-4 bg-white h-100" style={{ border: '1px solid rgba(15, 23, 42, 0.05)' }}>
                                                <div className="d-flex justify-content-between align-items-center mb-2">
                                                    <span className="badge px-3 py-1.5 fs-6 fw-bold" style={{ backgroundColor: `${themeColor}15`, color: themeColor, borderRadius: '9999px', border: `1px solid ${themeColor}30` }}>
                                                        {p.priority.toLowerCase() === "stat" ? "CẤP CỨU (STAT)" : p.priority.toLowerCase() === "urgent" ? "KHẨN CẤP" : "THƯỜNG QUY"}
                                                    </span>
                                                    <span className="small text-muted">
                                                        Mục tiêu chuẩn: &le; <strong>{p.targetMinutes} phút</strong>
                                                    </span>
                                                </div>

                                                <div className="my-3">
                                                    <div className="text-muted small">Thời gian trung bình thực tế:</div>
                                                    <div className="fs-2 fw-bold" style={{ color: themeColor, fontVariantNumeric: 'tabular-nums' }}>
                                                        {p.averageTatFormatted}
                                                    </div>
                                                    <div className="small text-muted font-monospace">{p.averageTatMinutes} phút</div>
                                                </div>

                                                <div className="mb-3">
                                                    <div className="d-flex justify-content-between small text-muted mb-1">
                                                        <span>Tỷ lệ đạt chuẩn SLA:</span>
                                                        <span className="fw-bold text-dark">{p.complianceRate}%</span>
                                                    </div>
                                                    <div className="progress" style={{ height: "6px", borderRadius: '9999px' }}>
                                                        <div
                                                            className="progress-bar"
                                                            role="progressbar"
                                                            style={{ width: `${p.complianceRate}%`, backgroundColor: themeColor, borderRadius: '9999px' }}
                                                        ></div>
                                                    </div>
                                                </div>

                                                <div className="d-flex justify-content-between align-items-center pt-2 border-top small text-muted" style={{ borderColor: '#EEF2F6' }}>
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
                                    {(Array.isArray(report.phaseBreakdown) ? report.phaseBreakdown : []).map((ph, idx) => {
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
                                {((Array.isArray(report.phaseBreakdown) ? report.phaseBreakdown : [])).map((ph, idx) => {
                                    const badges = ["Giai đoạn 1", "Giai đoạn 2", "Giai đoạn 3"];
                                    return (
                                        <div className="col-12 col-md-4" key={ph.phaseName}>
                                            <div className="card shadow-sm rounded-4 p-4 bg-white h-100" style={{ border: '1px solid rgba(15, 23, 42, 0.05)' }}>
                                                <div className="d-flex justify-content-between align-items-center">
                                                    <span className="badge px-3 py-1" style={{ backgroundColor: '#EEF2F6', color: '#64748B', borderRadius: '9999px', border: '1px solid rgba(15, 23, 42, 0.05)' }}>{badges[idx]}</span>
                                                    <span className="fs-5 fw-bold text-dark">{ph.percentageOfTotal}%</span>
                                                </div>
                                                <h6 className="fw-bold mt-2 mb-1">{ph.phaseDescription}</h6>
                                                <div className="fs-3 fw-bold mt-2" style={{ color: '#648CF4', fontVariantNumeric: 'tabular-nums' }}>{ph.averageFormatted}</div>
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
                            <div className="table-responsive rounded-4 overflow-hidden" style={{ border: '1px solid rgba(15, 23, 42, 0.05)' }}>
                                <table className="table table-hover align-middle mb-0">
                                    <thead style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid rgba(15, 23, 42, 0.05)', color: '#475569', fontSize: '12px' }} className="text-uppercase">
                                        <tr>
                                            <th className="ps-3 py-3">Chuyên Khoa / Phòng Lab</th>
                                            <th className="text-center py-3">Số Lượng Mẫu</th>
                                            <th className="text-center py-3">TAT Trung Bình</th>
                                            <th className="py-3">Tỷ Lệ Đạt Chuẩn SLA</th>
                                            <th className="text-center py-3">Số Mẫu Trễ</th>
                                            <th className="text-end pe-3 py-3">Đánh Giá ISO</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {(Array.isArray(report.departmentBreakdown) ? report.departmentBreakdown : []).map(d => (
                                            <tr key={d.department} style={{ borderBottom: '1px solid #EEF2F6' }}>
                                                <td className="fw-bold text-dark ps-3 py-3">
                                                    <FaFlask className="me-2" style={{ color: '#648CF4' }} />
                                                    {d.department === "Biochemistry" ? "Sinh Hóa (Biochemistry)" :
                                                     d.department === "Hematology" ? "Huyết Học (Hematology)" :
                                                     d.department === "Immunology" ? "Miễn Dịch (Immunology)" :
                                                     d.department === "Urinalysis" ? "Nước Tiểu (Urinalysis)" :
                                                     d.department === "Microbiology" ? "Vi Sinh (Microbiology)" : d.department}
                                                </td>
                                                <td className="text-center py-3" style={{ fontVariantNumeric: 'tabular-nums' }}>{d.totalCount}</td>
                                                <td className="text-center fw-bold py-3" style={{ color: '#648CF4', fontVariantNumeric: 'tabular-nums' }}>
                                                    {d.averageTatFormatted} ({d.averageTatMinutes}m)
                                                </td>
                                                <td style={{ minWidth: "180px" }} className="py-3">
                                                    <div className="d-flex align-items-center gap-2">
                                                        <div className="progress flex-grow-1" style={{ height: "6px", borderRadius: '9999px' }}>
                                                            <div
                                                                className="progress-bar"
                                                                role="progressbar"
                                                                style={{ width: `${d.complianceRate}%`, backgroundColor: d.complianceRate >= 90 ? '#A3E687' : '#E7BC4C', borderRadius: '9999px' }}
                                                            ></div>
                                                        </div>
                                                        <span className="small fw-bold" style={{ fontVariantNumeric: 'tabular-nums' }}>{d.complianceRate}%</span>
                                                    </div>
                                                </td>
                                                <td className="text-center py-3">
                                                    <span className="badge px-2.5 py-1" style={{ backgroundColor: d.violationCount > 0 ? 'rgba(239, 68, 68, 0.15)' : 'rgba(145, 222, 131, 0.2)', color: d.violationCount > 0 ? '#dc2626' : '#2b8a3e', borderRadius: '9999px' }}>
                                                        {d.violationCount} mẫu
                                                    </span>
                                                </td>
                                                <td className="text-end pe-3 py-3">
                                                    {d.complianceRate >= 90 ? (
                                                        <span className="badge px-3 py-1.5" style={{ backgroundColor: 'rgba(145, 222, 131, 0.2)', color: '#2b8a3e', borderRadius: '9999px', border: '1px solid rgba(145, 222, 131, 0.4)' }}>
                                                            <FaCheckCircle className="me-1" /> Đạt ISO 15189
                                                        </span>
                                                    ) : (
                                                        <span className="badge px-3 py-1.5" style={{ backgroundColor: 'rgba(231, 188, 76, 0.15)', color: '#b48316', borderRadius: '9999px', border: '1px solid rgba(231, 188, 76, 0.3)' }}>
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
                                {(Array.isArray(report.trends) ? report.trends : []).map(t => (
                                    <div className="col-12 col-sm-6 col-md-4 col-xl-3" key={t.dateLabel}>
                                        <div className="card shadow-sm rounded-4 p-3 bg-white" style={{ border: '1px solid rgba(15, 23, 42, 0.05)' }}>
                                            <div className="d-flex justify-content-between align-items-center">
                                                <span className="fw-bold text-dark">{t.dateLabel}</span>
                                                <span className="badge px-2.5 py-1" style={{ backgroundColor: '#EEF2F6', color: '#64748B', borderRadius: '9999px', border: '1px solid rgba(15, 23, 42, 0.05)' }}>{t.volume} mẫu</span>
                                            </div>
                                            <div className="fs-4 fw-bold mt-2" style={{ color: '#648CF4', fontVariantNumeric: 'tabular-nums' }}>
                                                {Math.round(t.averageTatMinutes)} phút
                                            </div>
                                            <div className="d-flex justify-content-between small text-muted mt-2 pt-2 border-top" style={{ borderColor: '#EEF2F6' }}>
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
                                <span className="badge px-3 py-1.5" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#dc2626', borderRadius: '9999px', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
                                    {(Array.isArray(report.recentViolations) ? report.recentViolations : []).length} trường hợp phát hiện
                                </span>
                            </div>

                            {(!Array.isArray(report.recentViolations) || report.recentViolations.length === 0) ? (
                                <div className="text-center py-5 text-muted">
                                    <FaCheckCircle className="fs-1 mb-2" style={{ color: '#A3E687' }} />
                                    <p className="mb-0 fw-semibold">Tuyệt vời! Không ghi nhận trường hợp mẫu nào vượt ngưỡng thời gian cam kết.</p>
                                </div>
                            ) : (
                                <div className="table-responsive rounded-4 overflow-hidden" style={{ border: '1px solid rgba(15, 23, 42, 0.05)' }}>
                                    <table className="table table-hover align-middle mb-0">
                                        <thead style={{ backgroundColor: 'rgba(239, 68, 68, 0.08)', color: '#b91c1c', borderBottom: '1px solid rgba(239, 68, 68, 0.2)', fontSize: '12px' }} className="text-uppercase">
                                            <tr>
                                                <th className="ps-3 py-3">Mã Barcode</th>
                                                <th className="py-3">Bệnh Nhân</th>
                                                <th className="py-3">Gói Xét Nghiệm</th>
                                                <th className="py-3">Ưu Tiên</th>
                                                <th className="text-center py-3">TAT Thực Tế</th>
                                                <th className="text-center py-3">Mục Tiêu</th>
                                                <th className="text-center py-3">Thời Gian Trễ</th>
                                                <th className="py-3">Giai Đoạn Nghẽn</th>
                                                <th className="text-end pe-3 py-3">KTV Phụ Trách</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {(Array.isArray(report.recentViolations) ? report.recentViolations : []).map(v => (
                                                <tr key={v.sampleId || v.barcode} style={{ borderBottom: '1px solid #EEF2F6' }}>
                                                    <td className="font-monospace fw-bold ps-3 py-3" style={{ color: '#648CF4' }}>{v.barcode}</td>
                                                    <td className="py-3">{v.patientName}</td>
                                                    <td className="text-truncate py-3" style={{ maxWidth: "200px" }}>{v.testPackage}</td>
                                                    <td className="py-3">
                                                        <span className="badge px-2.5 py-1" style={{ backgroundColor: 'rgba(239, 68, 68, 0.15)', color: '#dc2626', borderRadius: '9999px', border: '1px solid rgba(239, 68, 68, 0.3)' }}>{v.priority?.toLowerCase() === "stat" ? "Cấp cứu (STAT)" : v.priority?.toLowerCase() === "urgent" ? "Khẩn cấp" : "Thường quy"}</span>
                                                    </td>
                                                    <td className="text-center fw-bold text-danger py-3" style={{ fontVariantNumeric: 'tabular-nums' }}>{v.actualTatMinutes}m</td>
                                                    <td className="text-center text-muted py-3" style={{ fontVariantNumeric: 'tabular-nums' }}>&le; {v.targetTatMinutes}m</td>
                                                    <td className="text-center fw-bold text-danger py-3" style={{ fontVariantNumeric: 'tabular-nums' }}>+{v.delayMinutes}m</td>
                                                    <td className="py-3">
                                                        <span className="badge px-2.5 py-1" style={{ backgroundColor: 'rgba(231, 188, 76, 0.15)', color: '#b48316', borderRadius: '9999px', border: '1px solid rgba(231, 188, 76, 0.3)' }}>
                                                            {v.bottleneckPhase === "PreAnalytical" ? "Tiền phân tích (Lấy/Chuyển mẫu)" :
                                                             v.bottleneckPhase === "Analytical" ? "Trong phân tích (Chạy máy)" :
                                                             v.bottleneckPhase === "PostAnalytical" ? "Sau phân tích (Duyệt kết quả)" : v.bottleneckPhase}
                                                        </span>
                                                    </td>
                                                    <td className="small text-muted text-end pe-3 py-3">{v.technicianName || "Chưa gán"}</td>
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
