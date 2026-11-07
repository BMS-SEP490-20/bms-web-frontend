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
        <Container className="py-2">
            <Card className="shadow-sm p-2 text-center rounded-4" style={{ backgroundColor: '#FFFFFF' }}>
                <Alert variant="info" className="m-0" style={{ borderRadius: '14px', backgroundColor: 'rgba(30, 96, 230, 0.08)', color: '#2B4C8C' }}>
                    <i className="bi bi-qr-code-scan me-2" style={{ color: '#1E60E6' }}></i>
                    <strong>Quầy Thu Ngân POS & Thanh Toán QR:</strong> Hệ thống kết nối cổng thanh toán VNPay và máy in phiếu thu tự động.
                </Alert>
            </Card>
        </Container>
    );
}
