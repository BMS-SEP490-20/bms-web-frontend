/**
 * @file uc68-alert-threshold-violation-checks.mjs
 * @description Automated verification test suite for UC68 IoT Alert Threshold Violations Web Client.
 * Validates telemetry excursion detection, audio alarm support, triage acknowledgment,
 * corrective action resolution, simulation drills, and route registrations.
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

console.log("=== BẮT ĐẦU KIỂM THỬ TỰ ĐỘNG UC68 WEB (ALERT THRESHOLD VIOLATION) ===\n");

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
    const apiPath = path.join(projectRoot, "src/features/iot/api/iotAlertApi.js");
    runCheck("Check 1: iotAlertApi.js exists", () => {
        assert.ok(fs.existsSync(apiPath), "File iotAlertApi.js must exist");
    });

    const apiModule = await import(`file://${apiPath.replace(/\\/g, "/")}`);
    runCheck("Check 2: iotAlertApi.js exports required interface functions", () => {
        assert.equal(typeof apiModule.fetchAlerts, "function");
        assert.equal(typeof apiModule.fetchActiveAlerts, "function");
        assert.equal(typeof apiModule.fetchAlertSummary, "function");
        assert.equal(typeof apiModule.getAlertById, "function");
        assert.equal(typeof apiModule.acknowledgeAlert, "function");
        assert.equal(typeof apiModule.resolveAlert, "function");
        assert.equal(typeof apiModule.evaluateTelemetry, "function");
        assert.equal(typeof apiModule.simulateAlert, "function");
    });

    // 2. Alert Summary check
    await runAsyncCheck("Check 3: fetchAlertSummary returns valid metrics and system health", async () => {
        const summary = await apiModule.fetchAlertSummary();
        assert.ok(summary != null);
        assert.ok(summary.activeAlertsCount >= 0);
        assert.ok(summary.systemHealthStatus != null);
    });

    // 3. Alerts listing check
    let alertsList = [];
    await runAsyncCheck("Check 4: fetchAlerts returns seeded alert records", async () => {
        alertsList = await apiModule.fetchAlerts();
        assert.ok(Array.isArray(alertsList) && alertsList.length >= 3);
        const tempAlert = alertsList.find(a => a.deviceId === "TEMP-001");
        assert.ok(tempAlert != null);
        assert.equal(tempAlert.unit, "°C");
    });

    // 4. Safe Telemetry Evaluation
    await runAsyncCheck("Check 5: evaluateTelemetry with normal reading triggers no violation", async () => {
        const res = await apiModule.evaluateTelemetry({
            deviceId: "TEMP-001",
            sensorType: "Temperature",
            value: 4.5
        });
        assert.equal(res.isViolation, false);
        assert.equal(res.alert, null);
    });

    // 5. Excursion Telemetry Evaluation
    let newViolationAlert = null;
    await runAsyncCheck("Check 6: evaluateTelemetry with excursion (8.8°C) triggers Critical violation", async () => {
        const res = await apiModule.evaluateTelemetry({
            deviceId: "TEMP-001",
            sensorType: "Temperature",
            value: 8.8
        });
        assert.equal(res.isViolation, true);
        assert.ok(res.excursionAmount > 0);
        assert.ok(res.severity != null);
        assert.ok(res.alert != null);
        newViolationAlert = res.alert;
    });

    // 6. Acknowledge Alert workflow
    await runAsyncCheck("Check 7: acknowledgeAlert updates status and operator name", async () => {
        assert.ok(newViolationAlert != null);
        const acked = await apiModule.acknowledgeAlert(newViolationAlert.id, {
            operatorName: "KTV. Nguyễn Tấn Phát",
            notes: "Đang kiểm tra rơ-le làm mát"
        });
        assert.equal(acked.status, "Acknowledged");
        assert.equal(acked.acknowledgedBy, "KTV. Nguyễn Tấn Phát");
        assert.ok(acked.acknowledgedAt != null);
    });

    // 7. Resolve Alert workflow
    await runAsyncCheck("Check 8: resolveAlert updates status to Resolved and logs corrective actions", async () => {
        assert.ok(newViolationAlert != null);
        const resolved = await apiModule.resolveAlert(newViolationAlert.id, {
            operatorName: "KTV. Nguyễn Tấn Phát",
            resolutionNotes: "Đã thay van cấp lạnh, nhiệt độ hồi phục về 3.9°C an toàn."
        });
        assert.equal(resolved.status, "Resolved");
        assert.equal(resolved.resolvedBy, "KTV. Nguyễn Tấn Phát");
        assert.ok(resolved.resolutionNotes.includes("van cấp lạnh"));
    });

    // 8. Simulation Alert workflow
    await runAsyncCheck("Check 9: simulateAlert triggers active simulated alarm", async () => {
        const simAlert = await apiModule.simulateAlert({
            deviceId: "SIM-FREEZER-99",
            sensorType: "Temperature",
            simulatedValue: 9.5
        });
        assert.ok(simAlert != null);
        assert.equal(simAlert.status, "Active");
    });

    // 9. Dashboard Page Component check
    const pagePath = path.join(projectRoot, "src/features/iot/pages/AlertThresholdViolationPage.jsx");
    runCheck("Check 10: AlertThresholdViolationPage.jsx exists and includes audio & triage modals", () => {
        assert.ok(fs.existsSync(pagePath), "AlertThresholdViolationPage.jsx must exist");
        const code = fs.readFileSync(pagePath, "utf-8");
        assert.ok(code.includes("AlertThresholdViolationPage"), "Must declare AlertThresholdViolationPage");
        assert.ok(code.includes("playAlarmBuzzer"), "Must include audio buzzer support");
        assert.ok(code.includes("handleAcknowledge"), "Must include handleAcknowledge");
        assert.ok(code.includes("handleResolve"), "Must include handleResolve");
    });

    // 10. Route Registration in App.jsx
    const appPath = path.join(projectRoot, "src/App.jsx");
    runCheck("Check 11: App.jsx registers /iot/alerts route", () => {
        const code = fs.readFileSync(appPath, "utf-8");
        assert.ok(code.includes("AlertThresholdViolationPage"), "App.jsx must import AlertThresholdViolationPage");
        assert.ok(code.includes("/iot/alerts"), "App.jsx must register /iot/alerts");
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
