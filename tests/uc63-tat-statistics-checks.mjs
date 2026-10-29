/**
 * @file uc63-tat-statistics-checks.mjs
 * @description Automated verification test suite for UC63 Laboratory Turnaround Time (TAT) Analytics Web Client.
 * Validates statistical engine, Mean/Median/P90 percentiles, ISO 15189 3-phase lifecycle breakdown,
 * priority SLA compliance benchmarking, outlier detection, CSV export, and route registrations.
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

console.log("=== BẮT ĐẦU KIỂM THỬ TỰ ĐỘNG UC63 WEB (TAT STATISTICS) ===\n");

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
    // 1. API Client File & Interface Checks
    const apiPath = path.join(projectRoot, "src/features/reports/api/tatStatisticsApi.js");
    runCheck("Check 1: tatStatisticsApi.js exists", () => {
        assert.ok(fs.existsSync(apiPath), "File tatStatisticsApi.js must exist");
    });

    const apiModule = await import(`file://${apiPath.replace(/\\/g, "/")}`);
    runCheck("Check 2: tatStatisticsApi.js exports required interface functions", () => {
        assert.equal(typeof apiModule.fetchTatReport, "function");
        assert.equal(typeof apiModule.fetchTatSummary, "function");
        assert.equal(typeof apiModule.fetchTatTrends, "function");
        assert.equal(typeof apiModule.fetchTatViolations, "function");
        assert.equal(typeof apiModule.exportTatCsv, "function");
    });

    // 2. Summary KPI calculation
    await runAsyncCheck("Check 3: fetchTatSummary calculates Mean, Median, and P90 percentiles", async () => {
        const summary = await apiModule.fetchTatSummary();
        assert.ok(summary.totalCompletedTests > 0, "Must have completed tests");
        assert.ok(summary.averageTatMinutes > 0, "Average TAT must be positive");
        assert.ok(summary.medianTatMinutes > 0, "Median TAT must be positive");
        assert.ok(summary.p90TatMinutes >= summary.medianTatMinutes, "P90 must be >= Median");
        assert.ok(summary.targetComplianceRate >= 0 && summary.targetComplianceRate <= 100);
        assert.ok(summary.averageTatFormatted.includes("m") || summary.averageTatFormatted.includes("h"));
    });

    // 3. Full report generation
    let reportData = null;
    await runAsyncCheck("Check 4: fetchTatReport returns complete master report structure", async () => {
        reportData = await apiModule.fetchTatReport();
        assert.ok(reportData != null);
        assert.ok(reportData.summary != null);
        assert.ok(Array.isArray(reportData.priorityBreakdown));
        assert.ok(Array.isArray(reportData.departmentBreakdown));
        assert.ok(Array.isArray(reportData.phaseBreakdown));
        assert.ok(Array.isArray(reportData.trends));
        assert.ok(Array.isArray(reportData.recentViolations));
    });

    // 4. Priority breakdown verification
    runCheck("Check 5: Priority breakdown validates Stat (60m), Urgent (120m), and Normal (240m)", () => {
        const priorities = reportData.priorityBreakdown;
        assert.equal(priorities.length, 3);
        const stat = priorities.find(p => p.priority.toLowerCase() === "stat");
        const urgent = priorities.find(p => p.priority.toLowerCase() === "urgent");
        const normal = priorities.find(p => p.priority.toLowerCase() === "normal");
        assert.ok(stat && urgent && normal);
        assert.equal(stat.targetMinutes, 60);
        assert.equal(urgent.targetMinutes, 120);
        assert.equal(normal.targetMinutes, 240);
        assert.ok(stat.complianceRate >= 0);
    });

    // 5. 3-Phase ISO 15189 Breakdown verification
    runCheck("Check 6: Phase breakdown covers Pre-analytical, Analytical, Post-analytical", () => {
        const phases = reportData.phaseBreakdown;
        assert.equal(phases.length, 3);
        const pre = phases.find(p => p.phaseName === "PreAnalytical");
        const ana = phases.find(p => p.phaseName === "Analytical");
        const post = phases.find(p => p.phaseName === "PostAnalytical");
        assert.ok(pre && ana && post);
        const total = pre.percentageOfTotal + ana.percentageOfTotal + post.percentageOfTotal;
        assert.ok(Math.abs(total - 100.0) < 2.0, "Percentages should sum to ~100%");
    });

    // 6. Trends verification
    await runAsyncCheck("Check 7: fetchTatTrends returns continuous daily data points", async () => {
        const trends = await apiModule.fetchTatTrends();
        assert.ok(trends.length >= 5);
        trends.forEach(t => {
            assert.ok(t.dateLabel);
            assert.ok(t.volume > 0);
            assert.ok(t.averageTatMinutes > 0);
        });
    });

    // 7. Violations outlier detection
    await runAsyncCheck("Check 8: fetchTatViolations identifies delayed specimens with positive delay", async () => {
        const violations = await apiModule.fetchTatViolations();
        assert.ok(violations.length > 0);
        violations.forEach(v => {
            assert.ok(v.barcode);
            assert.ok(v.patientName);
            assert.ok(v.delayMinutes > 0, "Delay minutes must be positive");
            assert.ok(v.bottleneckPhase);
        });
    });

    // 8. Department filter check
    await runAsyncCheck("Check 9: fetchTatReport filters by Department (Hematology)", async () => {
        const filtered = await apiModule.fetchTatReport({ department: "Hematology" });
        assert.ok(filtered.departmentBreakdown.every(d => d.department.toLowerCase() === "hematology"));
    });

    // 9. CSV Export check
    await runAsyncCheck("Check 10: exportTatCsv creates downloadable blob with CSV content", async () => {
        const blob = await apiModule.exportTatCsv();
        assert.ok(blob != null);
        assert.equal(blob.type, "text/csv;charset=utf-8;");
        const text = await blob.text();
        assert.ok(text.includes("Mã mẫu"));
        assert.ok(text.includes("TAT thực tế"));
    });

    // 10. Dashboard Page Component check
    const pagePath = path.join(projectRoot, "src/features/reports/pages/TatStatisticsDashboardPage.jsx");
    runCheck("Check 11: TatStatisticsDashboardPage.jsx exists and declares full dashboard", () => {
        assert.ok(fs.existsSync(pagePath), "TatStatisticsDashboardPage.jsx must exist");
        const code = fs.readFileSync(pagePath, "utf-8");
        assert.ok(code.includes("TatStatisticsDashboardPage"), "Must declare TatStatisticsDashboardPage");
        assert.ok(code.includes("ISO 15189"), "Must reference ISO 15189 standards");
        assert.ok(code.includes("handleExportCsv"), "Must handle CSV export");
    });

    // 11. Route Registration in App.jsx
    const appPath = path.join(projectRoot, "src/App.jsx");
    runCheck("Check 12: App.jsx registers /reports/tat and /laboratory/tat-statistics routes", () => {
        const code = fs.readFileSync(appPath, "utf-8");
        assert.ok(code.includes("TatStatisticsDashboardPage"), "App.jsx must import TatStatisticsDashboardPage");
        assert.ok(code.includes("/reports/tat"), "App.jsx must register /reports/tat");
        assert.ok(code.includes("/laboratory/tat-statistics"), "App.jsx must register /laboratory/tat-statistics");
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
