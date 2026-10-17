/**
 * @file CheckInPage.jsx
 * @description [Iteration 2 Placeholder] Patient Smart Queue QR Check-in Terminal (UC25).
 * Scans mobile QR codes and prints queue tickets (Q-XXX) with STAT priority routing.
 * Conforms to: BR-REC-02, BR-REC-03 & AGENTS-DESIGN.md.
 * @module features/reception/pages/CheckInPage
 */

import React from "react";
import { Container, Card, Alert } from "react-bootstrap";

/**
 * Smart queue check-in kiosk terminal placeholder.
 *
 * @returns {JSX.Element} Placeholder view.
 */
export default function CheckInPage() {
    return (
        <Container className="py-4">
            <Card className="shadow-sm p-4 text-center border-0">
                <Alert variant="info" className="m-0">
                    <i className="bi bi-person-badge me-2"></i>
                    <strong>Kiosk Tiếp Nhận Tự Động & Lấy Số Thứ Tự:</strong> Kiosk thông minh nhận diện mã QR đặt lịch và phân luồng tiếp đón.
                </Alert>
            </Card>
        </Container>
    );
}
