/**
 * @file IotMonitorPage.jsx
 * @description [Iteration 3 Placeholder] Cold storage 2-8°C refrigerator telemetry & IoT sensor monitoring (UC65).
 * Reserved for Assignee: Hứa Khánh Duy.
 * Conforms to: BR-IOT-01, BR-IOT-02 & AGENTS-DESIGN.md.
 * @module features/manager-dashboard/pages/IotMonitorPage
 */

import React from "react";
import { Container, Card, Alert } from "react-bootstrap";

/**
 * IoT refrigerator telemetry monitoring screen placeholder.
 *
 * @returns {JSX.Element} Placeholder view.
 */
export default function IotMonitorPage() {
    return (
        <Container className="py-4">
            <Card className="shadow-sm p-4 text-center border-0">
                <Alert variant="info" className="m-0">
                    <i className="bi bi-thermometer-half me-2"></i>
                    <strong>Giám Sát Nhiệt Độ Tủ Lưu Trữ Mẫu 2-8°C (IoT):</strong> Hệ thống giám sát nhiệt độ, độ ẩm tủ trữ sinh phẩm và cảnh báo sự cố vi khí hậu.
                </Alert>
            </Card>
        </Container>
    );
}
