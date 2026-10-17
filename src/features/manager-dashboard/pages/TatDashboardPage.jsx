/**
 * @file TatDashboardPage.jsx
 * @description [Iteration 2 Placeholder] Specimen Turnaround Time (TAT) SLA compliance dashboard (UC58).
 * Real-time monitoring of routine (4h max) and STAT emergency (1h max) specimens.
 * Conforms to: BR-LAB-01 & AGENTS-DESIGN.md.
 * @module features/manager-dashboard/pages/TatDashboardPage
 */

import React from "react";
import { Container, Card, Alert } from "react-bootstrap";

/**
 * Turnaround Time SLA compliance dashboard placeholder.
 *
 * @returns {JSX.Element} Placeholder view.
 */
export default function TatDashboardPage() {
    return (
        <Container className="py-4">
            <Card className="shadow-sm p-4 text-center border-0">
                <Alert variant="info" className="m-0">
                    <i className="bi bi-stopwatch me-2"></i>
                    <strong>Giám Sát Thời Gian Trả Kết Quả (TAT SLA):</strong> Theo dõi thời gian xử lý mẫu thường (< 4 giờ) và mẫu cấp cứu STAT (< 1 giờ) theo cam kết chất lượng.
                </Alert>
            </Card>
        </Container>
    );
}
