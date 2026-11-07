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
        <Container className="py-2">
            <Card className="shadow-sm p-2 text-center rounded-4" style={{ backgroundColor: '#FFFFFF' }}>
                <Alert variant="info" className="m-0" style={{ borderRadius: '14px', backgroundColor: 'rgba(30, 96, 230, 0.08)', color: '#2B4C8C' }}>
                    <i className="bi bi-stopwatch me-2" style={{ color: '#1E60E6' }}></i>
                    <strong>Giám Sát Thời Gian Trả Kết Quả (TAT SLA):</strong> Theo dõi thời gian xử lý mẫu thường ({"<"} 4 giờ) và mẫu cấp cứu STAT ({"<"} 1 giờ) theo cam kết chất lượng.
                </Alert>
            </Card>
        </Container>
    );
}
