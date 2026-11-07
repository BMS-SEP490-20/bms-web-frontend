/**
 * @file IotNavigationTabs.jsx
 * @description Unified navigation tabs across the Cold-Chain IoT Monitoring suite.
 * Conforms to: AGENTS-DESIGN.md (Medical Blue #1e40af / #1E60E6).
 */

import React from "react";
import { Link, useLocation } from "react-router-dom";
import { FaThermometerHalf, FaCogs, FaWifi } from "react-icons/fa";

const IOT_TABS = [
    {
        id: "tab-iot-monitor",
        path: "/iot/monitor",
        matchPaths: ["/iot/monitor", "/iot/temperature", "/iot/logs", "/laboratory/iot-monitor", "/manager/iot-monitor"],
        label: "Giám Sát Nhiệt Độ, Độ Ẩm & Lịch Sử",
        icon: FaThermometerHalf
    },
    {
        id: "tab-iot-thresholds",
        path: "/manager/iot-thresholds",
        matchPaths: ["/manager/iot-thresholds", "/laboratory/iot-thresholds", "/iot/thresholds"],
        label: "Cấu Hình Ngưỡng An Toàn",
        icon: FaCogs
    }
];

export default function IotNavigationTabs({ connectionStatus = null }) {
    const location = useLocation();

    const isTabActive = (tab) => {
        return tab.matchPaths.some((p) => location.pathname.startsWith(p));
    };

    const isConnected = connectionStatus?.isConnected;

    return (
        <div
            className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3 p-2 bg-white shadow-sm"
            style={{
                borderRadius: "16px",
                border: "1px solid rgba(15, 23, 42, 0.06)"
            }}
        >
            <div className="d-flex flex-wrap align-items-center gap-1.5">
                {IOT_TABS.map((tab) => {
                    const active = isTabActive(tab);
                    const Icon = tab.icon;
                    return (
                        <Link
                            key={tab.id}
                            to={tab.path}
                            className="d-flex align-items-center gap-2 text-decoration-none px-3 py-2"
                            style={{
                                borderRadius: "9999px",
                                fontSize: "13px",
                                fontWeight: active ? 700 : 600,
                                backgroundColor: active ? "#1E60E6" : "#F1F5F9",
                                color: active ? "#FFFFFF" : "#475569",
                                transition: "all 0.18s ease"
                            }}
                        >
                            <Icon size={13} />
                            <span>{tab.label}</span>
                        </Link>
                    );
                })}
            </div>

            {connectionStatus && (
                <div className="d-flex align-items-center gap-2 pe-2">
                    <span
                        className="badge d-flex align-items-center gap-1.5 px-3 py-1.5"
                        style={{
                            borderRadius: "9999px",
                            fontSize: "12px",
                            fontWeight: 700,
                            backgroundColor: isConnected ? "#DCFCE7" : "#FEE2E2",
                            color: isConnected ? "#15803D" : "#DC2626",
                            border: isConnected ? "1px solid rgba(21, 128, 61, 0.2)" : "1px solid rgba(220, 38, 38, 0.3)"
                        }}
                    >
                        <FaWifi size={12} />
                        <span>
                            {isConnected
                                ? `Cảm biến (${connectionStatus.deviceId}): Đang kết nối`
                                : `Cảm biến (${connectionStatus.deviceId}): Mất kết nối`}
                        </span>
                    </span>
                </div>
            )}
        </div>
    );
}
