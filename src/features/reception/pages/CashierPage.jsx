/**
 * @file CashierPage.jsx
 * @description [Iteration 2 Placeholder] Cashier POS Terminal & Dynamic VNPay QR Desk (UC43).
 * Reserved for Assignee: Võ Gia Huy.
 * Conforms to: BR-BIL-01, BR-BIL-02 & AGENTS-DESIGN.md.
 * @module features/reception/pages/CashierPage
 */

import React from "react";
import { Container, Card, Alert } from "react-bootstrap";

/**
 * Cashier POS payment desk screen placeholder.
 *
 * @returns {JSX.Element} Placeholder view.
 */
export default function CashierPage() {
    return (
        <Container className="py-4">
            <Card className="shadow-sm p-4 text-center border-0">
                <Alert variant="info" className="m-0">
                    <i className="bi bi-qr-code-scan me-2"></i>
                    <strong>Quầy Thu Ngân POS & Thanh Toán QR:</strong> Hệ thống kết nối cổng thanh toán VNPay và máy in phiếu thu tự động.
                </Alert>
            </Card>
        </Container>
    );
}
