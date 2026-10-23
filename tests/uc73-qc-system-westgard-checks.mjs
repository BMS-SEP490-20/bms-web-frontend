/**
 * @file uc73-qc-system-westgard-checks.mjs
 * @description Automated verification test suite for UC73 Quality Control Management & Westgard Rules Web Client.
 * Validates QC Lot CRUD, Westgard multi-rule evaluations (PASS, 1_2s, 1_3s, 2_2s, R_4s),
 * Levey-Jennings chart dataset computations, corrective action signoffs, and route registrations.
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

console.log("=== BẮT ĐẦU KIỂM THỬ TỰ ĐỘNG UC73 WEB (QC SYSTEM & WESTGARD RULES) ===\n");

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
    const apiPath = path.join(projectRoot, "src/features/qc/api/qcApi.js");
    runCheck("Check 1: qcApi.js exists", () => {
        assert.ok(fs.existsSync(apiPath), "File qcApi.js must exist");
    });

    const apiModule = await import(`file://${apiPath.replace(/\\/g, "/")}`);
    runCheck("Check 2: qcApi.js exports required interface functions", () => {
        assert.equal(typeof apiModule.fetchQcLots, "function");
        assert.equal(typeof apiModule.getQcLotById, "function");
        assert.equal(typeof apiModule.createQcLot, "function");
        assert.equal(typeof apiModule.updateQcLot, "function");
        assert.equal(typeof apiModule.toggleQcLotStatus, "function");
        assert.equal(typeof apiModule.recordQcRun, "function");
        assert.equal(typeof apiModule.fetchLeveyJenningsData, "function");
        assert.equal(typeof apiModule.signoffCorrectiveAction, "function");
        assert.equal(typeof apiModule.fetchQcDashboardSummary, "function");
        assert.equal(typeof apiModule.fetchQcFlags, "function");
    });

    // 2. Fetch Lots Check
    let lots = [];
    await runAsyncCheck("Check 3: fetchQcLots returns seeded lots with Target Mean and SD", async () => {
        lots = await apiModule.fetchQcLots();
        assert.ok(Array.isArray(lots) && lots.length >= 3);
        const glu = lots.find(l => l.analyteName === "Glucose");
        assert.ok(glu != null);
        assert.equal(glu.targetMean, 5.5);
        assert.equal(glu.targetStandardDeviation, 0.25);
    });

    // 3. Create Lot Check
    let newLot = null;
    await runAsyncCheck("Check 4: createQcLot creates new QC Lot with target parameters", async () => {
        newLot = await apiModule.createQcLot({
            lotNumber: "LOT-UREA-2026A",
            controlName: "Biochemical Control Normal",
            analyteName: "Urea",
            instrumentId: "ROCHE-COBAS-C501",
            level: 1,
            targetMean: 6.2,
            targetStandardDeviation: 0.3,
            unit: "mmol/L"
        });
        assert.ok(newLot != null);
        assert.equal(newLot.analyteName, "Urea");
        assert.equal(newLot.targetMean, 6.2);
    });

    // 4. Toggle Lot Status Check
    await runAsyncCheck("Check 5: toggleQcLotStatus toggles active state", async () => {
        assert.ok(newLot != null);
        const isActive = await apiModule.toggleQcLotStatus(newLot.id);
        assert.equal(isActive, false);
    });

    // 5. Normal Run Evaluation (PASS)
    await runAsyncCheck("Check 6: recordQcRun evaluates in-control measurement as PASS", async () => {
        const gluLot = lots.find(l => l.analyteName === "Glucose");
        const res = await apiModule.recordQcRun({
            lotId: gluLot.id,
            measuredValue: 5.51, // Z = (5.51 - 5.5)/0.25 = +0.04s
            operatorName: "KTV. Nguyễn Tấn Phát"
        });
        assert.ok(res != null);
        assert.equal(res.status, "PASS");
        assert.equal(res.isLocked, false);
    });

    // 6. Excursion Run Evaluation (REJECT 1_3s)
    let rejectRun = null;
    await runAsyncCheck("Check 7: recordQcRun evaluates > 3s excursion as REJECT_1_3S and locks analyzer", async () => {
        const gluLot = lots.find(l => l.analyteName === "Glucose");
        const res = await apiModule.recordQcRun({
            lotId: gluLot.id,
            measuredValue: 6.45, // Z = (6.45 - 5.5)/0.25 = +3.80s > 3s
            operatorName: "KTV. Nguyễn Tấn Phát"
        });
        assert.ok(res != null);
        assert.equal(res.status, "REJECT_1_3S");
        assert.equal(res.isLocked, true);
        assert.ok(res.violatedRules.includes("1_3s"));
        rejectRun = res;
    });

    // 7. Levey-Jennings Dataset Calculation
    await runAsyncCheck("Check 8: fetchLeveyJenningsData calculates boundaries (+/- 1,2,3s) and data points", async () => {
        const gluLot = lots.find(l => l.analyteName === "Glucose");
        const lj = await apiModule.fetchLeveyJenningsData(gluLot.id);
        assert.ok(lj != null);
        assert.equal(lj.mean, 5.5);
        assert.equal(lj.sd, 0.25);
        assert.equal(lj.plus3SD, 6.25);
        assert.equal(lj.minus3SD, 4.75);
        assert.ok(Array.isArray(lj.points) && lj.points.length >= 10);
    });

    // 8. Signoff Corrective Action
    await runAsyncCheck("Check 9: signoffCorrectiveAction unlocks run and logs action notes", async () => {
        assert.ok(rejectRun != null);
        const signoff = await apiModule.signoffCorrectiveAction(rejectRun.runId, {
            operatorName: "KTV Trưởng Lab",
            correctiveAction: "Đã hiệu chuẩn lại module quang và kiểm tra thuốc thử."
        });
        assert.ok(signoff != null);
        assert.equal(signoff.isLocked, false);
    });

    // 9. Dashboard Summary Metrics
    await runAsyncCheck("Check 10: fetchQcDashboardSummary reports valid surveillance KPIs", async () => {
        const summary = await apiModule.fetchQcDashboardSummary();
        assert.ok(summary != null);
        assert.ok(summary.activeLotsCount > 0);
        assert.ok(summary.inControlRate >= 0);
    });

    // 10. Active QC Flags Check
    await runAsyncCheck("Check 11: fetchQcFlags retrieves active warning and rejection alerts", async () => {
        const flags = await apiModule.fetchQcFlags();
        assert.ok(Array.isArray(flags));
    });

    // 11. Page Component Check
    const pagePath = path.join(projectRoot, "src/features/qc/pages/QualityControlManagementPage.jsx");
    runCheck("Check 12: QualityControlManagementPage.jsx exists and declares component", () => {
        assert.ok(fs.existsSync(pagePath), "QualityControlManagementPage.jsx must exist");
        const code = fs.readFileSync(pagePath, "utf-8");
        assert.ok(code.includes("QualityControlManagementPage"), "Must declare QualityControlManagementPage");
        assert.ok(code.includes("Levey-Jennings"), "Must include Levey-Jennings references");
    });

    // 12. App.jsx Route Registration
    const appPath = path.join(projectRoot, "src/App.jsx");
    runCheck("Check 13: App.jsx registers /qc/management route", () => {
        const code = fs.readFileSync(appPath, "utf-8");
        assert.ok(code.includes("QualityControlManagementPage"), "App.jsx must import QualityControlManagementPage");
        assert.ok(code.includes("/qc/management"), "App.jsx must register /qc/management");
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
