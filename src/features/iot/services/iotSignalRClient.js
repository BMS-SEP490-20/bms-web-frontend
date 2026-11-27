/**
 * @file iotSignalRClient.js
 * @description Real-time SignalR client connecting to BMS Backend `/hubs/iot` for instant
 * multi-device cold-chain status updates and ISO 15189 threshold alert broadcasts.
 */

import * as signalR from "@microsoft/signalr";
import api, { getToken } from "../../../config/api.js";

function resolveHubUrl() {
    const base = (api?.defaults?.baseURL || "http://localhost:5000/api").trim();
    const root = base.replace(/\/api\/?$/i, "");
    if (!root || root === "/") {
        return "/hubs/iot";
    }
    return `${root}/hubs/iot`;
}

/**
 * Opens a managed SignalR connection to `/hubs/iot` with automatic reconnect.
 * Returns a cleanup function that stops the connection cleanly.
 *
 * @param {Object} handlers
 * @param {(payload: { eventType: string, alert: Object, timestamp: string }) => void} [handlers.onAlertUpdated]
 * @param {(status: Object) => void} [handlers.onDeviceStatusUpdated]
 * @param {(connected: boolean) => void} [handlers.onConnectionStateChange]
 * @returns {() => void} cleanup function
 */
export function subscribeIotRealtime({
    onAlertUpdated,
    onDeviceStatusUpdated,
    onConnectionStateChange
} = {}) {
    const token = getToken();
    if (!token) {
        onConnectionStateChange?.(false);
        return () => {};
    }

    let disposed = false;

    const connection = new signalR.HubConnectionBuilder()
        .withUrl(resolveHubUrl(), {
            accessTokenFactory: () => getToken() || ""
        })
        .withAutomaticReconnect([0, 2000, 5000, 10000, 20000])
        .configureLogging(signalR.LogLevel.Warning)
        .build();

    if (typeof onAlertUpdated === "function") {
        connection.on("IotAlertUpdated", (payload) => {
            if (!disposed) onAlertUpdated(payload);
        });
    }

    if (typeof onDeviceStatusUpdated === "function") {
        connection.on("IotDeviceStatusUpdated", (status) => {
            if (!disposed) onDeviceStatusUpdated(status);
        });
    }

    connection.onreconnecting(() => {
        if (!disposed) onConnectionStateChange?.(false);
    });

    connection.onreconnected(() => {
        if (!disposed) {
            onConnectionStateChange?.(true);
            connection.invoke("JoinIotMonitoring").catch(() => {});
        }
    });

    connection.onclose(() => {
        if (!disposed) onConnectionStateChange?.(false);
    });

    connection
        .start()
        .then(() => {
            if (disposed) {
                connection.stop().catch(() => {});
                return;
            }
            onConnectionStateChange?.(true);
            connection.invoke("JoinIotMonitoring").catch(() => {});
        })
        .catch(() => {
            if (!disposed) onConnectionStateChange?.(false);
        });

    return () => {
        disposed = true;
        connection.stop().catch(() => {});
    };
}
