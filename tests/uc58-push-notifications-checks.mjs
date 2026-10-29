/**
 * @file uc58-push-notifications-checks.mjs
 * @description Automated verification test suite for UC58 Push Notifications Web Client.
 * Validates dispatching, audit logs, filtering, BR-NOTIF-01 rate limit enforcement & critical panic bypass,
 * mark-as-read workflows, retry logic, and route registrations.
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

console.log("=== BẮT ĐẦU KIỂM THỬ TỰ ĐỘNG UC58 WEB (PUSH NOTIFICATIONS) ===\n");

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
    // 1. Check API module existence and exports
    const apiPath = path.join(projectRoot, "src/features/notifications/api/pushNotificationApi.js");
    runCheck("Check 1: pushNotificationApi.js exists", () => {
        assert.ok(fs.existsSync(apiPath), "File pushNotificationApi.js must exist");
    });

    const apiModule = await import(`file://${apiPath.replace(/\\/g, "/")}`);
    runCheck("Check 2: pushNotificationApi.js exports required interface functions", () => {
        assert.equal(typeof apiModule.dispatchNotification, "function");
        assert.equal(typeof apiModule.getNotificationLogs, "function");
        assert.equal(typeof apiModule.getUserNotifications, "function");
        assert.equal(typeof apiModule.markNotificationRead, "function");
        assert.equal(typeof apiModule.markAllNotificationsRead, "function");
        assert.equal(typeof apiModule.resendNotification, "function");
        assert.equal(typeof apiModule.registerDeviceToken, "function");
    });

    // 2. Test audit logs retrieval
    await runAsyncCheck("Check 3: getNotificationLogs returns paged list with initial logs", async () => {
        const res = await apiModule.getNotificationLogs({ pageNumber: 1, pageSize: 10 });
        assert.ok(res.items && Array.isArray(res.items));
        assert.ok(res.totalCount >= 5, "Should have default mock logs");
        assert.equal(res.currentPage, 1);
    });

    // 3. Test filtering by Channel
    await runAsyncCheck("Check 4: Filter logs by Channel (Push)", async () => {
        const res = await apiModule.getNotificationLogs({ channel: "Push" });
        assert.ok(res.items.length > 0);
        res.items.forEach(item => {
            assert.equal(item.channel.toLowerCase(), "push");
        });
    });

    // 4. Test filtering by Priority
    await runAsyncCheck("Check 5: Filter logs by Priority (Critical_Panic)", async () => {
        const res = await apiModule.getNotificationLogs({ priority: "Critical_Panic" });
        assert.ok(res.items.length > 0);
        res.items.forEach(item => {
            assert.equal(item.priority.toLowerCase(), "critical_panic");
        });
    });

    // 5. Test dispatching a standard notification
    let testNotifId = null;
    await runAsyncCheck("Check 6: Dispatch standard notification successfully", async () => {
        const payload = {
            userId: "PAT-TEST-001",
            recipientName: "Bệnh nhân Kiểm thử",
            channel: "Push",
            priority: "High",
            category: "RESULT_READY",
            title: "Kết quả Sinh Hóa Máu Đã Có",
            body: "Phiếu kết quả xét nghiệm #ORD-TEST-01 đã sẵn sàng.",
            actionUrl: "/patient/test-reports/ORD-TEST-01"
        };
        const res = await apiModule.dispatchNotification(payload);
        assert.ok(res.notificationId);
        assert.equal(res.status, "DELIVERED");
        assert.equal(res.channel, "Push");
        testNotifId = res.notificationId;
    });

    // 6. Test retrieving user notifications
    await runAsyncCheck("Check 7: getUserNotifications retrieves notifications for target user", async () => {
        const userLogs = await apiModule.getUserNotifications("PAT-TEST-001");
        assert.ok(userLogs.length >= 1);
        const item = userLogs.find(n => n.id === testNotifId);
        assert.ok(item, "Must find newly dispatched notification in user list");
        assert.equal(item.isRead, false);
    });

    // 7. Test marking a notification as read
    await runAsyncCheck("Check 8: markNotificationRead updates item read status", async () => {
        const ok = await apiModule.markNotificationRead(testNotifId);
        assert.equal(ok, true);
        const userLogs = await apiModule.getUserNotifications("PAT-TEST-001");
        const item = userLogs.find(n => n.id === testNotifId);
        assert.equal(item.isRead, true);
        assert.ok(item.readAt);
    });

    // 8. Test mark all read
    await runAsyncCheck("Check 9: markAllNotificationsRead marks all items for user as read", async () => {
        // Dispatch second notification for same user
        await apiModule.dispatchNotification({
            userId: "PAT-TEST-001",
            recipientName: "Bệnh nhân Kiểm thử",
            channel: "InApp",
            priority: "Normal",
            category: "APPOINTMENT_REMINDER",
            title: "Nhắc nhở cuộc hẹn khám",
            body: "Lịch khám ngày mai"
        });

        const ok = await apiModule.markAllNotificationsRead("PAT-TEST-001");
        assert.equal(ok, true);
        const unread = await apiModule.getUserNotifications("PAT-TEST-001", { unreadOnly: true });
        assert.equal(unread.length, 0);
    });

    // 9. Test resending a failed notification
    await runAsyncCheck("Check 10: resendNotification retries failed item and sets DELIVERED", async () => {
        const res = await apiModule.resendNotification("notif-004");
        assert.equal(res.notificationId, "notif-004");
        assert.equal(res.status, "DELIVERED");
        assert.ok(res.retryCount >= 1);
    });

    // 10. Test register device token
    await runAsyncCheck("Check 11: registerDeviceToken returns success", async () => {
        const res = await apiModule.registerDeviceToken({
            userId: "PAT-TEST-001",
            token: "fcm_mock_token_abcdef123456",
            platform: "Android"
        });
        assert.equal(res, true);
    });

    // 11. Test BR-NOTIF-01 Rate Limiting (max 5 per min per user)
    await runAsyncCheck("Check 12: BR-NOTIF-01 Rate Limiting blocks 6th non-critical message within 1 minute", async () => {
        const spamUser = "PAT-SPAM-USER-99";
        for (let i = 1; i <= 5; i++) {
            await apiModule.dispatchNotification({
                userId: spamUser,
                recipientName: "Spam Test",
                channel: "Push",
                priority: "Normal",
                category: "SYSTEM_ALERT",
                title: `Tin thứ ${i}`,
                body: "Thử nghiệm giới hạn tần suất"
            });
        }

        // 6th message should fail
        let caughtError = false;
        try {
            await apiModule.dispatchNotification({
                userId: spamUser,
                recipientName: "Spam Test",
                channel: "Push",
                priority: "Normal",
                category: "SYSTEM_ALERT",
                title: "Tin thứ 6 vượt giới hạn",
                body: "Phải bị chặn bởi BR-NOTIF-01"
            });
        } catch (err) {
            caughtError = true;
            assert.ok(err.message.includes("BR-NOTIF-01") || err.message.includes("giới hạn"));
        }
        assert.ok(caughtError, "6th message within 1 min must trigger rate limit error!");
    });

    // 12. Test BR-NOTIF-01 Bypass for CRITICAL_PANIC
    await runAsyncCheck("Check 13: BR-NOTIF-01 Bypass allows Critical Panic even when rate limit is exceeded", async () => {
        const spamUser = "PAT-SPAM-USER-99";
        const res = await apiModule.dispatchNotification({
            userId: spamUser,
            recipientName: "Spam Test",
            channel: "Push",
            priority: "Critical_Panic",
            category: "CRITICAL_PANIC",
            title: "BÁO ĐỘNG ĐỎ KHẨN CẤP: Troponin I tăng vọt",
            body: "Báo động tim mạch nguy kịch cần can thiệp khẩn"
        });
        assert.ok(res.notificationId);
        assert.equal(res.status, "DELIVERED");
    });

    // 13. Check Page component and App routing
    const pagePath = path.join(projectRoot, "src/features/notifications/pages/PushNotificationCenterPage.jsx");
    runCheck("Check 14: PushNotificationCenterPage.jsx component exists", () => {
        assert.ok(fs.existsSync(pagePath), "PushNotificationCenterPage.jsx must exist");
        const code = fs.readFileSync(pagePath, "utf-8");
        assert.ok(code.includes("PushNotificationCenterPage"), "Must declare PushNotificationCenterPage component");
        assert.ok(code.includes("BR-NOTIF-01"), "Must reference BR-NOTIF-01");
        assert.ok(code.includes("playChime"), "Must include chime/audio alarm synthesis");
    });

    const appPath = path.join(projectRoot, "src/App.jsx");
    runCheck("Check 15: App.jsx registers /notifications and /admin/notifications routes", () => {
        const code = fs.readFileSync(appPath, "utf-8");
        assert.ok(code.includes("PushNotificationCenterPage"), "App.jsx must import PushNotificationCenterPage");
        assert.ok(code.includes("/notifications"), "App.jsx must register /notifications");
        assert.ok(code.includes("/admin/notifications"), "App.jsx must register /admin/notifications");
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
