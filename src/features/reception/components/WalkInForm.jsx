/**
 * @file WalkInForm.jsx
 * @description [Iteration 2 Placeholder] Walk-in Patient Registration Form (UC23).
 * Captures citizen identity (CCCD), phone number, and assigns unique lifetime patient code (PAT-YYMMDD-XXXX).
 * Conforms to: BR-REC-01 & AGENTS-DESIGN.md.
 * @module features/reception/components/WalkInForm
 */

import React from "react";
import { Card, Alert } from "react-bootstrap";

/**
 * Walk-in patient registration form placeholder.
 *
 * @returns {JSX.Element} Placeholder view.
 */
export default function WalkInForm() {
    return (
        <Card className="shadow-sm p-4 text-center border-0">
            <Alert variant="info" className="m-0">
                <i className="bi bi-person-plus me-2"></i>
                <strong>Tiếp Nhận & Đăng Ký Khám Bệnh Nhân:</strong> Tính năng đang kết nối thiết bị quét thẻ CCCD gắn chip và bảo hiểm y tế.
            </Alert>
        </Card>
    );
}
