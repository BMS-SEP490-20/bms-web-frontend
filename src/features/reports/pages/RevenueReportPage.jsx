/**
 * @file RevenueReportPage.jsx
 * @description Laboratory Financial & Revenue Analytics Dashboard (UC78 / Issue #I3-092).
 * Provides multi-dimensional revenue surveillance, BHYT insurance copay accounting,
 * time-series trend plotting, test department breakdown, and accounting export.
 * Conforms to: Production Standards, Financial Excellence & AGENTS-DESIGN.md.
 */

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
    FaMoneyBillWave,
    FaChartLine,
    FaChartPie,
    FaFileInvoiceDollar,
    FaHospitalUser,
    FaDownload,
    FaFilter,
    FaCalendarAlt,
    FaSync,
    FaCreditCard,
    FaQrcode,
    FaMoneyCheckAlt,
    FaSearch,
    FaArrowUp,
    FaArrowDown,
    FaBuilding,
    FaUserMd
} from "react-icons/fa";
import {
    fetchRevenueReport,
    fetchRevenueExportTransactions
} from "../api/revenueReportApi";

export default function RevenueReportPage() {
    // Filter State
    const [datePreset, setDatePreset] = useState("30days"); // 'today' | '7days' | '30days' | 'thisMonth' | 'custom'
    const [fromDate, setFromDate] = useState(() => {
        const d = new Date();
        d.setDate(d.getDate() - 30);
        return d.toISOString().slice(0, 10);
    });
    const [toDate, setToDate] = useState(() => new Date().toISOString().slice(0, 10));
    const [categoryFilter, setCategoryFilter] = useState("");
    const [paymentMethodFilter, setPaymentMethodFilter] = useState("");
    const [serviceTypeFilter, setServiceTypeFilter] = useState("");

    // Data State
    const [report, setReport] = useState(null);
    const [exportRows, setExportRows] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [activeTab, setActiveTab] = useState("overview"); // 'overview' | 'breakdown' | 'transactions'

    // Handle Preset Change
    const handlePresetChange = (preset) => {
        setDatePreset(preset);
        const now = new Date();
        let from = new Date();

        if (preset === "today") {
            from = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        } else if (preset === "7days") {
            from.setDate(now.getDate() - 7);
        } else if (preset === "30days") {
            from.setDate(now.getDate() - 30);
        } else if (preset === "thisMonth") {
            from = new Date(now.getFullYear(), now.getMonth(), 1);
        }

        if (preset !== "custom") {
            setFromDate(from.toISOString().slice(0, 10));
            setToDate(now.toISOString().slice(0, 10));
        }
    };

    // Load Report Data
    const loadReport = useCallback(async () => {
        setIsLoading(true);
        try {
            const params = {
                fromDate: new Date(fromDate).toISOString(),
                toDate: new Date(toDate + "T23:59:59").toISOString(),
                category: categoryFilter || undefined,
                paymentMethod: paymentMethodFilter || undefined,
                serviceType: serviceTypeFilter || undefined
            };

            const [reportData, txns] = await Promise.all([
                fetchRevenueReport(params),
                fetchRevenueExportTransactions(params)
            ]);

            setReport(reportData);
            setExportRows(txns);
        } catch (error) {
            console.error("Failed to load revenue report:", error);
        } finally {
            setIsLoading(false);
        }
    }, [fromDate, toDate, categoryFilter, paymentMethodFilter, serviceTypeFilter]);

    useEffect(() => {
        loadReport();
    }, [loadReport]);

    // Handle Export to CSV
    const handleExportCSV = () => {
        if (!exportRows || exportRows.length === 0) return;

        const headers = [
            "Mã giao dịch",
            "Mã phiếu chỉ định",
            "Thời gian",
            "Bệnh nhân",
            "Chuyên khoa",
            "Kênh dịch vụ",
            "Doanh thu gộp",
            "BHYT chi trả",
            "Giảm trừ",
            "Thực thu (Net)",
            "Phương thức",
            "Thu ngân"
        ];

        const rows = exportRows.map(r => [
            r.transactionNumber,
            r.orderNumber,
            new Date(r.createdAt).toLocaleString("vi-VN"),
            `"${r.patientName}"`,
            `"${r.category}"`,
            `"${r.serviceType}"`,
            r.grossAmount,
            r.bhytCoverageAmount,
            r.discountAmount,
            r.netAmount,
            `"${r.paymentMethod}"`,
            `"${r.cashierName}"`
        ]);

        const csvContent = "\uFEFF" + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `BMS_BaoCao_DoanhThu_${fromDate}_${toDate}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // Filtered transaction rows for table view
    const filteredTransactions = useMemo(() => {
        if (!exportRows) return [];
        if (!searchTerm) return exportRows;
        const q = searchTerm.toLowerCase();
        return exportRows.filter(r =>
            r.transactionNumber.toLowerCase().includes(q) ||
            r.orderNumber.toLowerCase().includes(q) ||
            r.patientName.toLowerCase().includes(q) ||
            r.category.toLowerCase().includes(q) ||
            r.paymentMethod.toLowerCase().includes(q)
        );
    }, [exportRows, searchTerm]);

    // Trend SVG chart data calculation
    const trendRender = useMemo(() => {
        if (!report || !report.trend || report.trend.length === 0) return null;

        const points = report.trend;
        const width = 850;
        const height = 280;
        const padding = { top: 20, right: 30, bottom: 40, left: 70 };
        const plotWidth = width - padding.left - padding.right;
        const plotHeight = height - padding.top - padding.bottom;

        const maxNet = Math.max(...points.map(p => p.netAmount), 1000000);

        const getX = (idx) => {
            if (points.length <= 1) return padding.left + plotWidth / 2;
            return padding.left + (idx / (points.length - 1)) * plotWidth;
        };

        const getY = (val) => {
            return padding.top + plotHeight - (val / maxNet) * plotHeight;
        };

        const coords = points.map((p, idx) => ({
            ...p,
            x: getX(idx),
            y: getY(p.netAmount)
        }));

        const polylinePoints = coords.map(c => `${c.x},${c.y}`).join(" ");

        // Area polygon closed at bottom
        const areaPoints = `${coords[0].x},${padding.top + plotHeight} ` +
            coords.map(c => `${c.x},${c.y}`).join(" ") +
            ` ${coords[coords.length - 1].x},${padding.top + plotHeight}`;

        return { width, height, padding, coords, polylinePoints, areaPoints, maxNet, getY };
    }, [report]);

    const summary = report?.summary || {
        grossRevenue: 0,
        netRevenue: 0,
        bhytCoverageTotal: 0,
        discountsTotal: 0,
        surchargesTotal: 0,
        totalOrdersCount: 0,
        averageOrderValue: 0,
        growthRateVsPreviousPeriod: 0,
        formattedGrossRevenue: "0 ₫",
        formattedNetRevenue: "0 ₫"
    };

    return (
        <div className="container-fluid py-4 px-xl-5" style={{ minHeight: "90vh", background: "#f8fafc" }}>
            {/* Header Ribbon */}
            <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 pb-3 border-bottom">
                <div>
                    <div className="d-flex align-items-center gap-2">
                        <span className="badge bg-primary px-3 py-2 fs-6">UC78</span>
                        <h2 className="h3 mb-0 fw-bold text-slate-800">Báo Cáo Doanh Thu &amp; Tài Chính Xét Nghiệm</h2>
                    </div>
                    <p className="text-muted small mt-1 mb-0">
                        Theo dõi tổng doanh thu gộp, doanh thu thuần thực thu, bảo hiểm y tế chi trả, phân bổ theo chuyên khoa, kênh dịch vụ và xuất file kế toán.
                    </p>
                </div>

                <div className="d-flex align-items-center gap-2 mt-3 mt-md-0">
                    <button
                        className="btn btn-outline-success btn-sm d-flex align-items-center gap-1 shadow-sm"
                        onClick={handleExportCSV}
                        id="btn-export-revenue-csv"
                    >
                        <FaDownload /> Xuất Báo Cáo Kế Toán (.CSV)
                    </button>
                    <button
                        className="btn btn-primary btn-sm d-flex align-items-center gap-1 shadow-sm"
                        onClick={loadReport}
                        disabled={isLoading}
                    >
                        <FaSync className={isLoading ? "fa-spin" : ""} /> Làm mới
                    </button>
                </div>
            </div>

            {/* Filter Bar */}
            <div className="card border-0 shadow-sm rounded-3 mb-4 bg-white">
                <div className="card-body p-3">
                    <div className="row g-3 align-items-center">
                        {/* Time Presets */}
                        <div className="col-12 col-lg-5">
                            <label className="small text-muted fw-bold text-uppercase d-block mb-1">
                                <FaCalendarAlt className="me-1 text-primary" /> Mốc thời gian báo cáo:
                            </label>
                            <div className="btn-group btn-group-sm w-100" role="group">
                                <button
                                    type="button"
                                    className={`btn ${datePreset === 'today' ? 'btn-primary' : 'btn-outline-secondary'}`}
                                    onClick={() => handlePresetChange("today")}
                                >
                                    Hôm nay
                                </button>
                                <button
                                    type="button"
                                    className={`btn ${datePreset === '7days' ? 'btn-primary' : 'btn-outline-secondary'}`}
                                    onClick={() => handlePresetChange("7days")}
                                >
                                    7 ngày qua
                                </button>
                                <button
                                    type="button"
                                    className={`btn ${datePreset === '30days' ? 'btn-primary' : 'btn-outline-secondary'}`}
                                    onClick={() => handlePresetChange("30days")}
                                >
                                    30 ngày qua
                                </button>
                                <button
                                    type="button"
                                    className={`btn ${datePreset === 'thisMonth' ? 'btn-primary' : 'btn-outline-secondary'}`}
                                    onClick={() => handlePresetChange("thisMonth")}
                                >
                                    Tháng này
                                </button>
                            </div>
                        </div>

                        {/* Date Range Inputs */}
                        <div className="col-6 col-sm-3 col-lg-2">
                            <label className="small text-muted fw-bold text-uppercase d-block mb-1">Từ ngày:</label>
                            <input
                                type="date"
                                className="form-control form-control-sm"
                                value={fromDate}
                                onChange={e => {
                                    setFromDate(e.target.value);
                                    setDatePreset("custom");
                                }}
                            />
                        </div>

                        <div className="col-6 col-sm-3 col-lg-2">
                            <label className="small text-muted fw-bold text-uppercase d-block mb-1">Đến ngày:</label>
                            <input
                                type="date"
                                className="form-control form-control-sm"
                                value={toDate}
                                onChange={e => {
                                    setToDate(e.target.value);
                                    setDatePreset("custom");
                                }}
                            />
                        </div>

                        {/* Category Filter */}
                        <div className="col-12 col-sm-6 col-lg-3">
                            <label className="small text-muted fw-bold text-uppercase d-block mb-1">
                                <FaFilter className="me-1 text-primary" /> Chuyên khoa:
                            </label>
                            <select
                                className="form-select form-select-sm"
                                value={categoryFilter}
                                onChange={e => setCategoryFilter(e.target.value)}
                            >
                                <option value="">Tất cả chuyên khoa</option>
                                <option value="Biochemistry">Hóa Sinh Lâm Sàng</option>
                                <option value="Hematology">Huyết Học &amp; Đông Máu</option>
                                <option value="Immunology">Miễn Dịch &amp; Dị Ứng</option>
                                <option value="Microbiology">Vi Sinh &amp; Kháng Sinh Đồ</option>
                                <option value="GeneralCheckup">Gói Khám Tổng Quát</option>
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            {/* Financial KPI Cards */}
            <div className="row g-3 mb-4">
                {/* Gross Revenue */}
                <div className="col-12 col-sm-6 col-xl-3">
                    <div className="card border-0 shadow-sm rounded-3 p-3 bg-white h-100 border-start border-primary border-4">
                        <div className="d-flex justify-content-between align-items-center">
                            <span className="text-muted small fw-semibold text-uppercase">Doanh Thu Gộp</span>
                            <FaFileInvoiceDollar className="text-primary fs-5" />
                        </div>
                        <div className="fs-3 fw-bold text-primary mt-2">
                            {summary.formattedGrossRevenue}
                        </div>
                        <div className="small text-muted mt-1">
                            Tổng giá trị dịch vụ trước khấu trừ
                        </div>
                    </div>
                </div>

                {/* Net Revenue */}
                <div className="col-12 col-sm-6 col-xl-3">
                    <div className="card border-0 shadow-sm rounded-3 p-3 bg-white h-100 border-start border-success border-4">
                        <div className="d-flex justify-content-between align-items-center">
                            <span className="text-muted small fw-semibold text-uppercase">Doanh Thu Thuần (Net)</span>
                            <FaMoneyBillWave className="text-success fs-5" />
                        </div>
                        <div className="fs-3 fw-bold text-success mt-2">
                            {summary.formattedNetRevenue}
                        </div>
                        <div className="small text-success mt-1 d-flex align-items-center gap-1">
                            {summary.growthRateVsPreviousPeriod >= 0 ? <FaArrowUp /> : <FaArrowDown />}
                            {summary.growthRateVsPreviousPeriod > 0 ? `+${summary.growthRateVsPreviousPeriod}%` : `${summary.growthRateVsPreviousPeriod}%`} so với kỳ trước
                        </div>
                    </div>
                </div>

                {/* BHYT Insurance Coverage */}
                <div className="col-12 col-sm-6 col-xl-3">
                    <div className="card border-0 shadow-sm rounded-3 p-3 bg-white h-100 border-start border-info border-4">
                        <div className="d-flex justify-content-between align-items-center">
                            <span className="text-muted small fw-semibold text-uppercase">BHYT Chi Trả</span>
                            <FaHospitalUser className="text-info fs-5" />
                        </div>
                        <div className="fs-3 fw-bold text-info mt-2">
                            {summary.bhytCoverageTotal.toLocaleString("vi-VN")} ₫
                        </div>
                        <div className="small text-muted mt-1">
                            Khấu trừ bảo hiểm theo quy định
                        </div>
                    </div>
                </div>

                {/* Average Order Value (AOV) */}
                <div className="col-12 col-sm-6 col-xl-3">
                    <div className="card border-0 shadow-sm rounded-3 p-3 bg-white h-100 border-start border-warning border-4">
                        <div className="d-flex justify-content-between align-items-center">
                            <span className="text-muted small fw-semibold text-uppercase">Giá Trị Đơn Trung Bình</span>
                            <FaCreditCard className="text-warning fs-5" />
                        </div>
                        <div className="fs-3 fw-bold text-dark mt-2">
                            {summary.averageOrderValue.toLocaleString("vi-VN")} ₫
                        </div>
                        <div className="small text-muted mt-1">
                            Tổng cộng {summary.totalOrdersCount.toLocaleString("vi-VN")} đơn xét nghiệm
                        </div>
                    </div>
                </div>
            </div>

            {/* Navigation Tabs */}
            <ul className="nav nav-pills mb-4 bg-white p-2 rounded-3 shadow-sm">
                <li className="nav-item">
                    <button
                        className={`nav-link d-flex align-items-center gap-2 ${activeTab === 'overview' ? 'active' : ''}`}
                        onClick={() => setActiveTab("overview")}
                    >
                        <FaChartLine /> Biểu Đồ Doanh Thu &amp; Xu Hướng
                    </button>
                </li>
                <li className="nav-item">
                    <button
                        className={`nav-link d-flex align-items-center gap-2 ${activeTab === 'breakdown' ? 'active' : ''}`}
                        onClick={() => setActiveTab("breakdown")}
                    >
                        <FaChartPie /> Cơ Cấu Chuyên Khoa &amp; Phương Thức
                    </button>
                </li>
                <li className="nav-item">
                    <button
                        className={`nav-link d-flex align-items-center gap-2 ${activeTab === 'transactions' ? 'active' : ''}`}
                        onClick={() => setActiveTab("transactions")}
                    >
                        <FaFileInvoiceDollar /> Bảng Kê Chi Tiết Giao Dịch ({filteredTransactions.length})
                    </button>
                </li>
            </ul>

            {/* TAB 1: OVERVIEW & TREND CHART */}
            {activeTab === "overview" && (
                <div className="row g-4">
                    {/* Trend Line Chart */}
                    <div className="col-12 col-xl-8">
                        <div className="card border-0 shadow-sm rounded-3 bg-white h-100">
                            <div className="card-header bg-white border-bottom p-3 d-flex justify-content-between align-items-center">
                                <h5 className="mb-0 fw-bold text-dark d-flex align-items-center gap-2">
                                    <FaChartLine className="text-primary" /> Xu Hướng Doanh Thu Thuần Thực Thu Theo Thời Gian
                                </h5>
                                <span className="badge bg-light text-muted border">
                                    {report?.trend?.length || 0} điểm dữ liệu
                                </span>
                            </div>

                            <div className="card-body p-4 text-center">
                                {!trendRender ? (
                                    <div className="py-5 text-muted">Đang tải biểu đồ xu hướng...</div>
                                ) : (
                                    <div className="table-responsive d-flex justify-content-center">
                                        <svg
                                            viewBox={`0 0 ${trendRender.width} ${trendRender.height}`}
                                            style={{ width: "100%", maxWidth: "850px", height: "auto" }}
                                        >
                                            <defs>
                                                <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.35" />
                                                    <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.02" />
                                                </linearGradient>
                                            </defs>

                                            {/* Area Gradient fill */}
                                            <polygon
                                                points={trendRender.areaPoints}
                                                fill="url(#revenueGradient)"
                                            />

                                            {/* Polyline */}
                                            <polyline
                                                fill="none"
                                                stroke="#2563eb"
                                                strokeWidth="3"
                                                points={trendRender.polylinePoints}
                                            />

                                            {/* Data Points */}
                                            {trendRender.coords.map((pt, idx) => (
                                                <g key={idx}>
                                                    <circle
                                                        cx={pt.x}
                                                        cy={pt.y}
                                                        r="4.5"
                                                        fill="#2563eb"
                                                        stroke="#ffffff"
                                                        strokeWidth="2"
                                                        style={{ cursor: "pointer" }}
                                                    >
                                                        <title>{`${pt.dateLabel}\nDoanh thu: ${pt.netAmount.toLocaleString('vi-VN')} ₫\nSố đơn: ${pt.orderCount}`}</title>
                                                    </circle>
                                                    {/* Label on alternate points */}
                                                    {(idx === 0 || idx === trendRender.coords.length - 1 || idx % Math.ceil(trendRender.coords.length / 8) === 0) && (
                                                        <text
                                                            x={pt.x}
                                                            y={trendRender.height - 15}
                                                            fill="#64748b"
                                                            fontSize="10"
                                                            textAnchor="middle"
                                                        >
                                                            {pt.dateLabel}
                                                        </text>
                                                    )}
                                                </g>
                                            ))}
                                        </svg>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Channel & Referral Summary */}
                    <div className="col-12 col-xl-4">
                        <div className="card border-0 shadow-sm rounded-3 bg-white mb-4">
                            <div className="card-header bg-white border-bottom p-3">
                                <h6 className="mb-0 fw-bold text-dark d-flex align-items-center gap-2">
                                    <FaHospitalUser className="text-success" /> Kênh Thực Hiện Dịch Vụ
                                </h6>
                            </div>
                            <div className="card-body p-3">
                                {report?.byChannel?.map((ch, idx) => (
                                    <div key={idx} className="mb-3">
                                        <div className="d-flex justify-content-between small fw-semibold mb-1">
                                            <span>{ch.channel}</span>
                                            <span className="text-dark">{ch.amount.toLocaleString('vi-VN')} ₫ ({ch.percentage}%)</span>
                                        </div>
                                        <div className="progress" style={{ height: "8px" }}>
                                            <div
                                                className={`progress-bar ${idx === 0 ? 'bg-primary' : 'bg-success'}`}
                                                role="progressbar"
                                                style={{ width: `${ch.percentage}%` }}
                                            ></div>
                                        </div>
                                        <div className="small text-muted mt-1">{ch.orderCount} lượt thực hiện</div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Top Referrals */}
                        <div className="card border-0 shadow-sm rounded-3 bg-white">
                            <div className="card-header bg-white border-bottom p-3">
                                <h6 className="mb-0 fw-bold text-dark d-flex align-items-center gap-2">
                                    <FaUserMd className="text-primary" /> Top Bác Sĩ &amp; Khoa Phòng Chỉ Định
                                </h6>
                            </div>
                            <div className="card-body p-3">
                                {report?.topReferrals?.map((ref, idx) => (
                                    <div key={idx} className="d-flex justify-content-between align-items-center py-2 border-bottom">
                                        <div>
                                            <div className="fw-bold small text-dark">{ref.name}</div>
                                            <div className="text-muted" style={{ fontSize: "11px" }}>{ref.department} &bull; {ref.orderCount} đơn</div>
                                        </div>
                                        <span className="badge bg-primary-subtle text-primary fw-bold">
                                            {ref.amount.toLocaleString('vi-VN')} ₫
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB 2: BREAKDOWN CHARTS */}
            {activeTab === "breakdown" && (
                <div className="row g-4">
                    {/* Category Breakdown */}
                    <div className="col-12 col-md-6">
                        <div className="card border-0 shadow-sm rounded-3 bg-white h-100">
                            <div className="card-header bg-white border-bottom p-3">
                                <h5 className="mb-0 fw-bold text-dark d-flex align-items-center gap-2">
                                    <FaChartPie className="text-primary" /> Doanh Thu Theo Chuyên Khoa Xét Nghiệm
                                </h5>
                            </div>
                            <div className="card-body p-4">
                                {report?.byCategory?.map((cat, idx) => (
                                    <div key={idx} className="mb-4">
                                        <div className="d-flex justify-content-between fw-semibold small mb-1">
                                            <span>{cat.category}</span>
                                            <span className="text-primary fw-bold">{cat.amount.toLocaleString('vi-VN')} ₫ ({cat.percentage}%)</span>
                                        </div>
                                        <div className="progress" style={{ height: "10px" }}>
                                            <div
                                                className="progress-bar bg-primary"
                                                role="progressbar"
                                                style={{ width: `${cat.percentage}%` }}
                                            ></div>
                                        </div>
                                        <div className="small text-muted mt-1">{cat.orderCount} chỉ định xét nghiệm</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Payment Method Breakdown */}
                    <div className="col-12 col-md-6">
                        <div className="card border-0 shadow-sm rounded-3 bg-white h-100">
                            <div className="card-header bg-white border-bottom p-3">
                                <h5 className="mb-0 fw-bold text-dark d-flex align-items-center gap-2">
                                    <FaQrcode className="text-success" /> Cơ Cấu Phương Thức Thanh Toán
                                </h5>
                            </div>
                            <div className="card-body p-4">
                                {report?.byPaymentMethod?.map((method, idx) => (
                                    <div key={idx} className="mb-4">
                                        <div className="d-flex justify-content-between fw-semibold small mb-1">
                                            <span>{method.paymentMethod}</span>
                                            <span className="text-success fw-bold">{method.amount.toLocaleString('vi-VN')} ₫ ({method.percentage}%)</span>
                                        </div>
                                        <div className="progress" style={{ height: "10px" }}>
                                            <div
                                                className="progress-bar bg-success"
                                                role="progressbar"
                                                style={{ width: `${method.percentage}%` }}
                                            ></div>
                                        </div>
                                        <div className="small text-muted mt-1">{method.transactionCount} lượt giao dịch</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB 3: DETAILED TRANSACTIONS AUDIT TABLE */}
            {activeTab === "transactions" && (
                <div className="card border-0 shadow-sm rounded-3 bg-white">
                    <div className="card-header bg-white border-bottom p-3 d-flex flex-wrap justify-content-between align-items-center gap-2">
                        <h5 className="mb-0 fw-bold text-dark d-flex align-items-center gap-2">
                            <FaFileInvoiceDollar className="text-primary" /> Nhật Ký Giao Dịch Kế Toán Thu Ngân
                        </h5>

                        <div className="d-flex align-items-center gap-2">
                            <div className="input-group input-group-sm" style={{ width: "260px" }}>
                                <span className="input-group-text bg-light border-end-0"><FaSearch className="text-muted" /></span>
                                <input
                                    type="text"
                                    className="form-control border-start-0"
                                    placeholder="Tìm mã đơn, tên bệnh nhân..."
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                />
                            </div>
                            <button
                                className="btn btn-outline-success btn-sm d-flex align-items-center gap-1 shadow-sm"
                                onClick={handleExportCSV}
                            >
                                <FaDownload /> Xuất CSV
                            </button>
                        </div>
                    </div>

                    <div className="card-body p-0">
                        <div className="table-responsive">
                            <table className="table table-hover align-middle mb-0">
                                <thead className="table-light small text-muted text-uppercase">
                                    <tr>
                                        <th>Mã Giao Dịch / Giờ</th>
                                        <th>Mã Đơn / Bệnh Nhân</th>
                                        <th>Chuyên Khoa</th>
                                        <th>Kênh</th>
                                        <th className="text-end">Doanh Thu Gộp</th>
                                        <th className="text-end">BHYT Chi Trả</th>
                                        <th className="text-end">Thực Thu (Net)</th>
                                        <th>Phương Thức</th>
                                        <th>Thu Ngân</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredTransactions.slice(0, 50).map((row, idx) => (
                                        <tr key={idx}>
                                            <td>
                                                <div className="fw-bold font-monospace text-dark">{row.transactionNumber}</div>
                                                <div className="small text-muted">{new Date(row.createdAt).toLocaleString('vi-VN')}</div>
                                            </td>
                                            <td>
                                                <div className="fw-semibold text-dark">{row.patientName}</div>
                                                <div className="small text-muted font-monospace">{row.orderNumber}</div>
                                            </td>
                                            <td>
                                                <span className="badge bg-light text-dark border">
                                                    {row.category}
                                                </span>
                                            </td>
                                            <td className="small text-muted">{row.serviceType}</td>
                                            <td className="text-end fw-semibold">{row.grossAmount.toLocaleString('vi-VN')} ₫</td>
                                            <td className="text-end text-info">{row.bhytCoverageAmount > 0 ? `-${row.bhytCoverageAmount.toLocaleString('vi-VN')} ₫` : "0 ₫"}</td>
                                            <td className="text-end fw-bold text-success">{row.netAmount.toLocaleString('vi-VN')} ₫</td>
                                            <td>
                                                <span className="badge bg-light text-muted border">
                                                    {row.paymentMethod}
                                                </span>
                                            </td>
                                            <td className="small text-muted">{row.cashierName}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        {filteredTransactions.length > 50 && (
                            <div className="p-3 text-center small text-muted border-top">
                                Đang hiển thị 50 / {filteredTransactions.length} giao dịch. Nhấn "Xuất Báo Cáo Kế Toán" để tải toàn bộ.
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
