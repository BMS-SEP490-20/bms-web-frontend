/**
 * @file uc78-revenue-report-checks.mjs
 * @description Automated verification test suite for UC78 Laboratory Revenue Reporting & Financial Analytics Web Client.
 * Validates financial KPI aggregations, time-series trend plotting, categorical breakdowns,
 * accounting CSV export records, and route registrations.
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

console.log("=== BẮT ĐẦU KIỂM THỬ TỰ ĐỘNG UC78 WEB (REVENUE REPORTING & FINANCIAL ANALYTICS) ===\n");

let passed = 0;
let failed = 0;

function runCheck(name, fn) {
    try {
        fn();
        console.log(`[PASS] ${name}`);
        passed++;
    } catch (err) {
        console.error(`[FAIL] ${name}:`, err.message);
        failed++;
    }
}

async function runAsyncCheck(name, fn) {
    try {
        await fn();
        console.log(`[PASS] ${name}`);
        passed++;
    } catch (err) {
        console.error(`[FAIL] ${name}:`, err.message);
        failed++;
    }
}

async function main() {
    // 1. API Client File & Export Verification
    const apiPath = path.join(projectRoot, "src/features/reports/api/revenueReportApi.js");
    runCheck("Check 1: revenueReportApi.js exists", () => {
        assert.ok(fs.existsSync(apiPath), "File revenueReportApi.js must exist");
    });

    const apiModule = await import(`file://${apiPath.replace(/\\/g, "/")}`);
    runCheck("Check 2: revenueReportApi.js exports required interface functions", () => {
        assert.equal(typeof apiModule.fetchRevenueReport, "function");
        assert.equal(typeof apiModule.fetchRevenueSummary, "function");
        assert.equal(typeof apiModule.fetchRevenueTrend, "function");
        assert.equal(typeof apiModule.fetchRevenueByCategory, "function");
        assert.equal(typeof apiModule.fetchRevenueByPaymentMethod, "function");
        assert.equal(typeof apiModule.fetchRevenueByChannel, "function");
        assert.equal(typeof apiModule.fetchRevenueExportTransactions, "function");
    });

    // 2. Revenue Summary Check
    let summary = null;
    await runAsyncCheck("Check 3: fetchRevenueSummary calculates valid financial KPIs", async () => {
        summary = await apiModule.fetchRevenueSummary();
        assert.ok(summary != null);
        assert.ok(summary.grossRevenue > 0, "Gross revenue must be positive");
        assert.ok(summary.netRevenue > 0, "Net revenue must be positive");
        assert.ok(summary.netRevenue <= summary.grossRevenue, "Net must be <= Gross");
        assert.ok(summary.totalOrdersCount > 0, "Order count must be positive");
        assert.ok(summary.averageOrderValue > 0, "AOV must be positive");
        assert.ok(summary.formattedGrossRevenue.includes("₫"), "Must contain Vietnamese currency symbol");
    });

    // 3. Trend Time-Series Check
    let trend = null;
    await runAsyncCheck("Check 4: fetchRevenueTrend returns time-series data points", async () => {
        trend = await apiModule.fetchRevenueTrend();
        assert.ok(Array.isArray(trend) && trend.length >= 15);
        const first = trend[0];
        assert.ok(first.dateLabel != null);
        assert.ok(first.grossAmount > 0);
        assert.ok(first.netAmount > 0);
        assert.ok(first.orderCount > 0);
    });

    // 4. Revenue By Category Check
    let categories = null;
    await runAsyncCheck("Check 5: fetchRevenueByCategory aggregates test department contributions", async () => {
        categories = await apiModule.fetchRevenueByCategory();
        assert.ok(Array.isArray(categories) && categories.length >= 4);
        const totalPct = categories.reduce((s, c) => s + c.percentage, 0);
        assert.ok(totalPct >= 99.0 && totalPct <= 101.0, `Category percentage (${totalPct}) must sum to ~100%`);
    });

    // 5. Revenue By Payment Method Check
    let methods = null;
    await runAsyncCheck("Check 6: fetchRevenueByPaymentMethod aggregates payment method breakdown", async () => {
        methods = await apiModule.fetchRevenueByPaymentMethod();
        assert.ok(Array.isArray(methods) && methods.length >= 3);
        const totalPct = methods.reduce((s, m) => s + m.percentage, 0);
        assert.ok(totalPct >= 99.0 && totalPct <= 101.0, `Payment method percentage (${totalPct}) must sum to ~100%`);
    });

    // 6. Revenue By Channel Check
    await runAsyncCheck("Check 7: fetchRevenueByChannel breaks down InClinic vs HomeCollection", async () => {
        const channels = await apiModule.fetchRevenueByChannel();
        assert.ok(Array.isArray(channels) && channels.length >= 2);
        assert.ok(channels.some(c => c.channel.includes("Tại phòng khám")));
        assert.ok(channels.some(c => c.channel.includes("Lấy mẫu tận nơi")));
    });

    // 7. Granular Export Transactions Check
    let exportTxns = null;
    await runAsyncCheck("Check 8: fetchRevenueExportTransactions returns accounting transactions list", async () => {
        exportTxns = await apiModule.fetchRevenueExportTransactions();
        assert.ok(Array.isArray(exportTxns) && exportTxns.length > 0);
        const txn = exportTxns[0];
        assert.ok(txn.transactionNumber != null);
        assert.ok(txn.orderNumber != null);
        assert.ok(txn.patientName != null);
        assert.ok(txn.netAmount > 0);
        assert.ok(txn.cashierName != null);
    });

    // 8. Composite Report Check
    await runAsyncCheck("Check 9: fetchRevenueReport aggregates full multi-dimensional payload", async () => {
        const report = await apiModule.fetchRevenueReport();
        assert.ok(report != null);
        assert.ok(report.summary != null);
        assert.ok(report.trend != null && report.trend.length > 0);
        assert.ok(report.byCategory != null && report.byCategory.length > 0);
        assert.ok(report.topReferrals != null && report.topReferrals.length > 0);
    });

    // 9. Page Component Verification
    const pagePath = path.join(projectRoot, "src/features/reports/pages/RevenueReportPage.jsx");
    runCheck("Check 10: RevenueReportPage.jsx exists and declares component", () => {
        assert.ok(fs.existsSync(pagePath), "RevenueReportPage.jsx must exist");
        const code = fs.readFileSync(pagePath, "utf-8");
        assert.ok(code.includes("RevenueReportPage"), "Must declare RevenueReportPage");
        assert.ok(code.includes("Báo Cáo Doanh Thu"), "Must include Vietnamese title");
        assert.ok(code.includes("btn-export-revenue-csv"), "Must include export CSV button");
        assert.ok(code.includes("<svg"), "Must include SVG chart element");
    });

    // 10. App.jsx Route Registration
    const appPath = path.join(projectRoot, "src/App.jsx");
    runCheck("Check 11: App.jsx registers /reports/revenue route", () => {
        const code = fs.readFileSync(appPath, "utf-8");
        assert.ok(code.includes("RevenueReportPage"), "App.jsx must import RevenueReportPage");
        assert.ok(code.includes("/reports/revenue"), "App.jsx must register /reports/revenue");
    });

    console.log("\n================================================");
    console.log(`TỔNG KẾT: ${passed} PASSED | ${failed} FAILED`);
    console.log("================================================");

    if (failed > 0) {
        process.exit(1);
    }
}

main().catch(err => {
    console.error("FATAL ERROR IN TEST SUITE:", err);
    process.exit(1);
});
