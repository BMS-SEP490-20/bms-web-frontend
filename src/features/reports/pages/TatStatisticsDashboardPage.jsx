/**
 * @file TatStatisticsDashboardPage.jsx
 * @description Executive Laboratory Turnaround Time (TAT) Analytics & SLA Compliance Dashboard (UC63 / I3-047).
 * Features Mean/Median/P90 percentile benchmarks, 3-phase ISO 15189 lifecycle distribution,
 * priority SLA compliance tracking, department comparison, daily trend charts, and outlier violation triage.
 * Conforms to: Production Medical Standards, ISO 15189 Quality Management & AGENTS-DESIGN.md.
 */

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Clock, CheckCircle2, AlertTriangle, TrendingUp, BarChart3, Filter as LucideFilter, Download, RefreshCw, FlaskConical, TestTube2, Layers, Zap, Calendar, Search, ArrowUp, ArrowDown, Info, Check } from 'lucide-react';
import TablePagination, { usePagination } from "../../../components/ui/TablePagination";
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
    const [selectedTimeframe, setSelectedTimeframe] = useState("MONTH");
    const [selectedDepartment, setSelectedDepartment] = useState("ALL");
    const [selectedPriority, setSelectedPriority] = useState("ALL");
    const [activeTab, setActiveTab] = useState("PRIORITY");
    const [isLoading, setIsLoading] = useState(false);
    const [isExporting, setIsExporting] = useState(false);

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

    const deptPag = usePagination(Array.isArray(report?.departmentBreakdown) ? report.departmentBreakdown : [], 10);
    const violPag = usePagination(Array.isArray(report?.recentViolations) ? report.recentViolations : [], 10);

    const loadData = useCallback(async () => {
        setIsLoading(true);
        try {
            const tf = TIMEFRAMES.find(t => t.key === selectedTimeframe);
            const days = tf ? tf.days : 30;
            const startOfToday = new Date();
            startOfToday.setHours(0, 0, 0, 0);
            const fromDate = days > 0 ? new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString() : startOfToday.toISOString();

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

    const handleExportCsv = async () => {
        setIsExporting(true);
        try {
            const tf = TIMEFRAMES.find(t => t.key === selectedTimeframe);
            const days = tf ? tf.days : 30;
            const startOfToday = new Date();
            startOfToday.setHours(0, 0, 0, 0);
            const fromDate = days > 0 ? new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString() : startOfToday.toISOString();

            const blob = await exportTatCsv({
                fromDate,
                toDate: new Date().toISOString(),
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
        <div className="w-100 py-1">

            <div className="bms-page-header-card mb-4">
                <div className="bms-page-header-content flex-column align-items-start">
                    <div className="bms-page-title-row">
                        <h1 className="bms-page-title">
                            Thống Kê Thời Gian TAT
                        </h1>
                    </div>
                    <p className="text-muted small m-0 mt-1">
                        Giám sát thời gian quay vòng mẫu xét nghiệm, tỷ lệ đạt chuẩn SLA và điểm nghẽn quy trình
                    </p>
                </div>

                <div className="bms-page-actions">
                    <button
                        className="btn btn-sm d-flex align-items-center gap-2 text-white px-3 py-2 fw-semibold rounded-pill"
                        style={{ backgroundColor: '#10B981', borderColor: '#10B981' }}
                        onClick={handleExportCsv}
                        disabled={isExporting}
                        id="btn-export-tat-csv"
                    >
                        <Download size={13} />
                        <span>{isExporting ? "Đang xuất..." : "Xuất File CSV"}</span>
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

            <div className="bms-filter-bar mb-3">
                <div className="btn-group" role="group">
                    {TIMEFRAMES.map(tf => (
                        <button
                            key={tf.key}
                            type="button"
                            className={`btn btn-sm ${selectedTimeframe === tf.key ? "btn-primary text-white" : "btn-outline-secondary"}`}
                            onClick={() => setSelectedTimeframe(tf.key)}
                        >
                            {tf.label}
                        </button>
                    ))}
                </div>

                <select
                    className="form-select form-select-sm"
                    style={{ width: "auto" }}
                    value={selectedDepartment}
                    onChange={e => setSelectedDepartment(e.target.value)}
                >
                    {DEPARTMENTS.map(d => (
                        <option key={d.key} value={d.key}>{d.label}</option>
                    ))}
                </select>

                <select
                    className="form-select form-select-sm"
                    style={{ width: "auto" }}
                    value={selectedPriority}
                    onChange={e => setSelectedPriority(e.target.value)}
                >
                    <option value="ALL">Tất cả ưu tiên</option>
                    <option value="Stat">Cấp cứu (STAT &le; 60m)</option>
                    <option value="Urgent">Khẩn cấp (Urgent &le; 120m)</option>
                    <option value="Normal">Thường quy (Normal &le; 240m)</option>
                </select>

                {(selectedDepartment !== "ALL" || selectedPriority !== "ALL" || selectedTimeframe !== "MONTH") && (
                    <button
                        type="button"
                        className="btn btn-outline-secondary btn-sm rounded-pill px-3 text-nowrap"
                        onClick={() => {
                            setSelectedTimeframe("MONTH");
                            setSelectedDepartment("ALL");
                            setSelectedPriority("ALL");
                        }}
                    >
                        Đặt lại
                    </button>
                )}

                <span className="bms-filter-meta">
                    Hoàn tất <strong>{summary.totalCompletedTests || 0}</strong> mẫu
                </span>
            </div>

            <div className="row g-3 mb-4">
                <div className="col-12 col-sm-6 col-xl-3">
                    <div className="bms-kpi-quad-card">
                        <div>
                            <h6 className="bms-kpi-label">TAT Trung Bình (Mean)</h6>
                            <div className="bms-kpi-value text-primary">{summary.averageTatFormatted || "0m"}</div>
                            <div className="bms-kpi-sub text-muted">Trung vị P50: {summary.medianTatFormatted || "0m"} • P90: {summary.p90TatFormatted || "0m"}</div>
                        </div>
                        <div className="bms-kpi-icon-badge bms-kpi-icon-blue">
                            <Clock  size="1em"/>
                        </div>
                    </div>
                </div>

                <div className="col-12 col-sm-6 col-xl-3">
                    <div className="bms-kpi-quad-card">
                        <div>
                            <h6 className="bms-kpi-label">Tỷ Lệ Đạt Chuẩn SLA</h6>
                            <div className="bms-kpi-value text-success">{summary.targetComplianceRate ?? 100}%</div>
                            <div className="bms-kpi-sub text-muted">Hoàn tất trong thời gian mục tiêu</div>
                        </div>
                        <div className="bms-kpi-icon-badge bms-kpi-icon-green">
                            <CheckCircle2  size="1em"/>
                        </div>
                    </div>
                </div>

                <div className="col-12 col-sm-6 col-xl-3">
                    <div className="bms-kpi-quad-card">
                        <div>
                            <h6 className="bms-kpi-label">Tổng Mẫu Hoàn Tất</h6>
                            <div className="bms-kpi-value">{summary.totalCompletedTests || 0}</div>
                            <div className="bms-kpi-sub text-muted">Đã phê duyệt kết quả xét nghiệm</div>
                        </div>
                        <div className="bms-kpi-icon-badge bms-kpi-icon-purple">
                            <TestTube2  size="1em"/>
                        </div>
                    </div>
                </div>

                <div className="col-12 col-sm-6 col-xl-3">
                    <div className="bms-kpi-quad-card">
                        <div>
                            <h6 className="bms-kpi-label">Mẫu Vượt Ngưỡng (Trễ)</h6>
                            <div className="bms-kpi-value" style={{ color: '#B45309' }}>{summary.violationCount || 0}</div>
                            <div className="bms-kpi-sub text-muted">Cần rà soát điểm nghẽn xử lý</div>
                        </div>
                        <div className="bms-kpi-icon-badge bms-kpi-icon-amber">
                            <AlertTriangle  size="1em"/>
                        </div>
                    </div>
                </div>
            </div>

            <div className="d-flex flex-wrap gap-2 mb-3 bg-white p-2 rounded-4" style={{ border: '1px solid #e2e8f0' }}>
                {[
                    { key: "PRIORITY", label: "Phân Tích Độ Ưu Tiên (SLA)", icon: Zap },
                    { key: "PHASES", label: "Phân Rã 3 Giai Đoạn", icon: Layers },
                    { key: "DEPARTMENTS", label: "Theo Chuyên Khoa Lab", icon: FlaskConical },
                    { key: "TRENDS", label: "Biểu Đồ Xu Hướng Ngày", icon: TrendingUp },
                    { key: "VIOLATIONS", label: `Cảnh Báo Trễ (${summary.violationCount || 0})`, icon: AlertTriangle }
                ].map(tab => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.key;
    return (
                        <button
                            key={tab.key}
                            type="button"
                            className="btn btn-sm d-flex align-items-center gap-2"
                            style={{
                                borderRadius: '9999px',
                                padding: '6px 16px',
                                backgroundColor: isActive ? '#1E60E6' : 'transparent',
                                color: isActive ? '#ffffff' : '#64748B',
                                border: 'none',
                                fontWeight: 600
                            }}
                            onClick={() => setActiveTab(tab.key)}
                        >
                            <Icon />
                            <span>{tab.label}</span>
                        </button>
                    );
                })}
            </div>

            {activeTab === "PRIORITY" && (
                <div>
                    <div className="bms-sla-grid">
                        {(Array.isArray(report.priorityBreakdown) ? report.priorityBreakdown : []).map(p => {
                            const isStat = p.priority.toLowerCase() === "stat";
                            const isUrgent = p.priority.toLowerCase() === "urgent";
                            const themeColor = isStat ? "#dc2626" : isUrgent ? "#B45309" : "#1E60E6";

    return (
                                <article className="bms-sla-card" key={p.priority}>
                                    <div className="bms-sla-card-head">
                                        <span className="bms-sla-badge" style={{ backgroundColor: `${themeColor}15`, color: themeColor }}>
                                            {isStat ? "CẤP CỨU (STAT)" : isUrgent ? "KHẨN CẤP" : "THƯỜNG QUY"}
                                        </span>
                                        <span className="bms-sla-target">Mục tiêu ≤ {p.targetMinutes} phút</span>
                                    </div>
                                    <div className="bms-sla-time" style={{ color: themeColor }}>{p.averageTatFormatted}</div>
                                    <div className="bms-sla-minutes">{p.averageTatMinutes} phút trung bình</div>
                                    <div className="bms-sla-rate">
                                        <span>Tỷ lệ đạt chuẩn SLA</span>
                                        <strong>{p.complianceRate}%</strong>
                                    </div>
                                    <div className="bms-sla-track">
                                        <div style={{ width: `${p.complianceRate}%`, backgroundColor: themeColor }} />
                                    </div>
                                    <div className="bms-sla-foot">
                                        <span>Tổng số mẫu <strong>{p.totalCount}</strong></span>
                                        <span>Vi phạm <strong className={p.violationCount > 0 ? "text-danger" : "text-success"}>{p.violationCount}</strong></span>
                                    </div>
                                </article>
                            );
                        })}
                    </div>
                </div>
            )}

            {activeTab === "PHASES" && (
                <div className="bg-white p-4 rounded-4" style={{ border: '1px solid #e2e8f0' }}>
                    <h5 className="fw-bold mb-1 text-dark">Phân Rã Thời Gian Theo 3 Giai Đoạn Quy Trình Xét Nghiệm</h5>
                    <p className="text-muted small mb-4">
                        Nhận diện giai đoạn phát sinh tắc nghẽn để tối ưu luồng chuyển mẫu và kết nối thiết bị phân tích.
                    </p>

                    <div className="mb-4">
                        <label className="small text-muted fw-semibold d-block mb-2">Tỷ lệ đóng góp thời gian vào tổng quy trình TAT:</label>
                        <div className="progress" style={{ height: "24px", borderRadius: 12 }}>
                            {(Array.isArray(report.phaseBreakdown) ? report.phaseBreakdown : []).map((ph, idx) => {
                                const colors = ["bg-info", "bg-primary", "bg-success"];
    return (
                                    <div
                                        key={ph.phaseName}
                                        className={`progress-bar ${colors[idx % colors.length]} fw-semibold text-white small`}
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
                                    <div className="p-3 rounded-4 h-100" style={{ background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                                        <div className="d-flex justify-content-between align-items-center">
                                            <span className="badge px-3 py-1" style={{ backgroundColor: '#EEF2F6', color: '#64748B', borderRadius: '9999px' }}>{badges[idx]}</span>
                                            <span className="fs-5 fw-bold text-dark">{ph.percentageOfTotal}%</span>
                                        </div>
                                        <h6 className="fw-bold mt-2 mb-1">{ph.phaseDescription}</h6>
                                        <div className="fs-3 fw-bold mt-2" style={{ color: '#1E60E6', fontVariantNumeric: 'tabular-nums' }}>{ph.averageFormatted}</div>
                                        <div className="small text-muted font-monospace">{ph.averageMinutes} phút trung bình</div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {activeTab === "DEPARTMENTS" && (
                <div className="bms-table-standalone-section">
                    <div className="bms-table-standalone-header">
                        <h5 className="bms-table-standalone-title">Hiệu Suất Thời Gian Quay Vòng Theo Chuyên Khoa Phòng Lab</h5>
                    </div>
                    <div className="bms-table-standalone-body">
                        <div className="table-responsive">
                            <table className="table table-hover align-middle mb-0">
                                <thead>
                                    <tr>
                                        <th className="ps-3">Chuyên Khoa / Phòng Lab</th>
                                        <th className="text-center">Số Lượng Mẫu</th>
                                        <th className="text-center">TAT Trung Bình</th>
                                        <th>Tỷ Lệ Đạt Chuẩn SLA</th>
                                        <th className="text-center">Số Mẫu Trễ</th>
                                        <th className="text-end pe-3">Đánh Giá</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {deptPag.paginatedItems.map(d => (
                                        <tr key={d.department}>
                                            <td className="fw-bold text-dark ps-3">
                                                <FlaskConical className="me-2" style={{ color: '#1E60E6' }}  size="1em"/>
                                                {d.department === "Biochemistry" ? "Sinh Hóa (Biochemistry)" :
                                                 d.department === "Hematology" ? "Huyết Học (Hematology)" :
                                                 d.department === "Immunology" ? "Miễn Dịch (Immunology)" :
                                                 d.department === "Urinalysis" ? "Nước Tiểu (Urinalysis)" :
                                                 d.department === "Microbiology" ? "Vi Sinh (Microbiology)" : d.department}
                                            </td>
                                            <td className="text-center" style={{ fontVariantNumeric: 'tabular-nums' }}>{d.totalCount}</td>
                                            <td className="text-center fw-bold" style={{ color: '#1E60E6', fontVariantNumeric: 'tabular-nums' }}>
                                                {d.averageTatFormatted} ({d.averageTatMinutes}m)
                                            </td>
                                            <td style={{ minWidth: "180px" }}>
                                                <div className="d-flex align-items-center gap-2">
                                                    <div className="progress flex-grow-1" style={{ height: "6px", borderRadius: '9999px' }}>
                                                        <div
                                                            className="progress-bar"
                                                            role="progressbar"
                                                            style={{ width: `${d.complianceRate}%`, backgroundColor: d.complianceRate >= 90 ? '#10B981' : '#B45309', borderRadius: '9999px' }}
                                                        ></div>
                                                    </div>
                                                    <span className="small fw-bold" style={{ fontVariantNumeric: 'tabular-nums' }}>{d.complianceRate}%</span>
                                                </div>
                                            </td>
                                            <td className="text-center">
                                                <span className="badge px-2 py-1" style={{ backgroundColor: d.violationCount > 0 ? 'rgba(239, 68, 68, 0.15)' : 'rgba(145, 222, 131, 0.2)', color: d.violationCount > 0 ? '#dc2626' : '#2b8a3e', borderRadius: '9999px' }}>
                                                    {d.violationCount} mẫu
                                                </span>
                                            </td>
                                            <td className="text-end pe-3">
                                                {d.complianceRate >= 90 ? (
                                                    <span className="badge px-3 py-1" style={{ backgroundColor: 'rgba(145, 222, 131, 0.2)', color: '#2b8a3e', borderRadius: '9999px' }}>
                                                        <CheckCircle2 className="me-1"  size="1em"/> Đạt chuẩn SLA
                                                    </span>
                                                ) : (
                                                    <span className="badge px-3 py-1" style={{ backgroundColor: 'rgba(231, 188, 76, 0.15)', color: '#b48316', borderRadius: '9999px' }}>
                                                        <AlertTriangle className="me-1"  size="1em"/> Cần cải tiến
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            <TablePagination
                                page={deptPag.page}
                                totalPages={deptPag.totalPages}
                                totalItems={deptPag.totalItems}
                                pageSize={deptPag.pageSize}
                                onPageChange={deptPag.setPage}
                                onPageSizeChange={deptPag.setPageSize}
                                itemLabel="chuyên khoa"
                            />
                        </div>
                    </div>
                </div>
            )}

            {activeTab === "TRENDS" && (
                <div>
                    <div className="row g-3">
                        {(Array.isArray(report.trends) ? report.trends : []).map(t => (
                            <div className="col-12 col-sm-6 col-md-4 col-xl-3" key={t.dateLabel}>
                                <div className="p-3 rounded-4 bg-white h-100" style={{ border: '1px solid #e2e8f0' }}>
                                    <div className="d-flex justify-content-between align-items-center">
                                        <span className="fw-bold text-dark">{t.dateLabel}</span>
                                        <span className="badge px-2 py-1" style={{ backgroundColor: '#EEF2F6', color: '#64748B', borderRadius: '9999px' }}>{t.volume} mẫu</span>
                                    </div>
                                    <div className="fs-4 fw-bold mt-2" style={{ color: '#1E60E6', fontVariantNumeric: 'tabular-nums' }}>
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

            {activeTab === "VIOLATIONS" && (
                <div className="bms-table-standalone-section">
                    <div className="bms-table-standalone-header">
                        <h5 className="bms-table-standalone-title">
                            <AlertTriangle className="text-danger"  size="1em"/> Danh Sách Mẫu Vượt Ngưỡng Thời Gian
                        </h5>
                        <span className="badge px-3 py-1" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#dc2626', borderRadius: '9999px' }}>
                            {(Array.isArray(report.recentViolations) ? report.recentViolations : []).length} trường hợp phát hiện
                        </span>
                    </div>

                    <div className="bms-table-standalone-body">
                        {(!Array.isArray(report.recentViolations) || report.recentViolations.length === 0) ? (
                            <div className="text-center py-4 text-muted">
                                <CheckCircle2 className="fs-2 mb-2" style={{ color: '#10B981' }}  size="1em"/>
                                <p className="mb-0 fw-semibold">Không ghi nhận mẫu nào vượt ngưỡng thời gian cam kết.</p>
                            </div>
                        ) : (
                            <div className="table-responsive">
                                <table className="table table-hover align-middle mb-0">
                                    <thead>
                                        <tr>
                                            <th className="ps-3">Mã Barcode</th>
                                            <th>Bệnh Nhân</th>
                                            <th>Gói Xét Nghiệm</th>
                                            <th>Ưu Tiên</th>
                                            <th className="text-center">TAT Thực Tế</th>
                                            <th className="text-center">Mục Tiêu</th>
                                            <th className="text-center">Thời Gian Trễ</th>
                                            <th>Giai Đoạn Nghẽn</th>
                                            <th className="text-end pe-3">KTV Phụ Trách</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {violPag.paginatedItems.map(v => (
                                            <tr key={v.sampleId || v.barcode}>
                                                <td className="font-monospace fw-bold ps-3" style={{ color: '#1E60E6' }}>{v.barcode}</td>
                                                <td>{v.patientName}</td>
                                                <td className="text-truncate" style={{ maxWidth: "200px" }}>{v.testPackage}</td>
                                                <td>
                                                    <span className="badge px-2 py-1" style={{ backgroundColor: 'rgba(239, 68, 68, 0.15)', color: '#dc2626', borderRadius: '9999px' }}>{v.priority?.toLowerCase() === "stat" ? "Cấp cứu (STAT)" : v.priority?.toLowerCase() === "urgent" ? "Khẩn cấp" : "Thường quy"}</span>
                                                </td>
                                                <td className="text-center fw-bold text-danger" style={{ fontVariantNumeric: 'tabular-nums' }}>{v.actualTatMinutes}m</td>
                                                <td className="text-center text-muted" style={{ fontVariantNumeric: 'tabular-nums' }}>&le; {v.targetTatMinutes}m</td>
                                                <td className="text-center fw-bold text-danger" style={{ fontVariantNumeric: 'tabular-nums' }}>+{v.delayMinutes}m</td>
                                                <td>
                                                    <span className="badge px-2 py-1" style={{ backgroundColor: 'rgba(231, 188, 76, 0.15)', color: '#b48316', borderRadius: '9999px' }}>
                                                        {v.bottleneckPhase === "PreAnalytical" ? "Tiền phân tích (Lấy/Chuyển mẫu)" :
                                                         v.bottleneckPhase === "Analytical" ? "Trong phân tích (Chạy máy)" :
                                                         v.bottleneckPhase === "PostAnalytical" ? "Sau phân tích (Duyệt kết quả)" : v.bottleneckPhase}
                                                    </span>
                                                </td>
                                                <td className="small text-muted text-end pe-3">{v.technicianName || "Chưa gán"}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                <TablePagination
                                    page={violPag.page}
                                    totalPages={violPag.totalPages}
                                    totalItems={violPag.totalItems}
                                    pageSize={violPag.pageSize}
                                    onPageChange={violPag.setPage}
                                    onPageSizeChange={violPag.setPageSize}
                                    itemLabel="mẫu vượt ngưỡng"
                                />
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
