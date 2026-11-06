/**
 * @file revenueReportApi.js
 * @description API client for UC78 Laboratory Revenue Reporting & Financial Intelligence.
 * Provides aggregations for gross revenue, net revenue, BHYT insurance deductions,
 * average order value (AOV), growth rates, time-series trends, and categorical breakdowns.
 * Conforms to: Production Standards & AGENTS-CODE.md.
 */

let apiInstance = null;

async function getApi() {
    if (apiInstance) return apiInstance;
    try {
        const mod = await import("../../../config/api.js");
        apiInstance = mod.default || mod;
        return apiInstance;
    } catch {
        return null;
    }
}

// Empty defaults for offline or fresh databases (ZERO fake / fabricated data rule)
function createEmptySummary() {
    return {
        grossRevenue: 0,
        bhytCoverageTotal: 0,
        discountsTotal: 0,
        surchargesTotal: 0,
        netRevenue: 0,
        totalOrdersCount: 0,
        averageOrderValue: 0,
        growthRateVsPreviousPeriod: 0,
        formattedGrossRevenue: "0 ₫",
        formattedNetRevenue: "0 ₫"
    };
}

function translateCategory(key) {
    switch (key) {
        case "Biochemistry": return "Hóa Sinh Lâm Sàng";
        case "Hematology": return "Huyết Học & Đông Máu";
        case "Immunology": return "Miễn Dịch & Dị Ứng";
        case "Microbiology": return "Vi Sinh & Kháng Sinh Đồ";
        case "GeneralCheckup": return "Gói Khám Tổng Quát";
        default: return key;
    }
}

function translateMethod(key) {
    switch (key) {
        case "VietQR": return "Chuyển Khoản VietQR / MoMo";
        case "Cash": return "Tiền Mặt Tại Quầy";
        case "BhytDirect": return "Bảo Hiểm Y Tế (BHYT)";
        case "Card": return "Thẻ Ngân Hàng / POS";
        default: return key;
    }
}

/**
 * Fetch Comprehensive Revenue Report.
 */
export async function fetchRevenueReport(params = {}) {
    const api = await getApi();
    if (api) {
        try {
            const res = await api.get("/v1/revenue/report", { params });
            if (res.data?.success && res.data?.data) {
                return res.data.data;
            }
        } catch {
            try {
                const res = await api.get("/revenue/report", { params });
                if (res.data?.success && res.data?.data) {
                    return res.data.data;
                }
            } catch {
                // fall through to empty report
            }
        }
    }

    return {
        fromDate: params.fromDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        toDate: params.toDate || new Date().toISOString(),
        period: params.period || "daily",
        summary: createEmptySummary(),
        trend: [],
        byCategory: [],
        byPaymentMethod: [],
        byChannel: [],
        topReferrals: []
    };
}

/**
 * Fetch Revenue Summary KPIs.
 */
export async function fetchRevenueSummary(params = {}) {
    const api = await getApi();
    if (api) {
        try {
            const res = await api.get("/v1/revenue/summary", { params });
            if (res.data?.success && res.data?.data) {
                return res.data.data;
            }
        } catch {
            try {
                const res = await api.get("/revenue/summary", { params });
                if (res.data?.success && res.data?.data) {
                    return res.data.data;
                }
            } catch {
                // fall through
            }
        }
    }

    return createEmptySummary();
}

/**
 * Fetch Revenue Trend Points.
 */
export async function fetchRevenueTrend(params = {}) {
    const api = await getApi();
    if (api) {
        try {
            const res = await api.get("/v1/revenue/trend", { params });
            if (res.data?.success && res.data?.data) {
                return res.data.data;
            }
        } catch {
            try {
                const res = await api.get("/revenue/trend", { params });
                if (res.data?.success && res.data?.data) {
                    return res.data.data;
                }
            } catch {
                // fall through
            }
        }
    }

    return [];
}

/**
 * Fetch Revenue By Category.
 */
export async function fetchRevenueByCategory(params = {}) {
    const api = await getApi();
    if (api) {
        try {
            const res = await api.get("/v1/revenue/by-category", { params });
            if (res.data?.success && res.data?.data) {
                return res.data.data;
            }
        } catch {
            try {
                const res = await api.get("/revenue/by-category", { params });
                if (res.data?.success && res.data?.data) {
                    return res.data.data;
                }
            } catch {
                // fall through
            }
        }
    }

    return [];
}

/**
 * Fetch Revenue By Payment Method.
 */
export async function fetchRevenueByPaymentMethod(params = {}) {
    const api = await getApi();
    if (api) {
        try {
            const res = await api.get("/v1/revenue/by-payment-method", { params });
            if (res.data?.success && res.data?.data) {
                return res.data.data;
            }
        } catch {
            try {
                const res = await api.get("/revenue/by-payment-method", { params });
                if (res.data?.success && res.data?.data) {
                    return res.data.data;
                }
            } catch {
                // fall through
            }
        }
    }

    return [];
}

/**
 * Fetch Revenue By Channel (Tại viện vs Tận nơi).
 */
export async function fetchRevenueByChannel(params = {}) {
    const api = await getApi();
    if (api) {
        try {
            const res = await api.get("/v1/revenue/by-channel", { params });
            if (res.data?.success && res.data?.data) {
                return res.data.data;
            }
        } catch {
            try {
                const res = await api.get("/revenue/by-channel", { params });
                if (res.data?.success && res.data?.data) {
                    return res.data.data;
                }
            } catch {
                // fall through
            }
        }
    }

    return [];
}

/**
 * Fetch Granular Transactions for Export.
 */
export async function fetchRevenueExportTransactions(params = {}) {
    const api = await getApi();
    if (api) {
        try {
            const res = await api.get("/v1/revenue/export", { params });
            if (res.data?.success && res.data?.data) {
                return res.data.data;
            }
        } catch {
            try {
                const res = await api.get("/revenue/export", { params });
                if (res.data?.success && res.data?.data) {
                    return res.data.data;
                }
            } catch {
                // fall through
            }
        }
    }

    return [];
}
