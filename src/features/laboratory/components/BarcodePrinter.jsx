/**
 * @file BarcodePrinter.jsx
 * @description [Iteration 2 Placeholder] Phlebotomy specimen tube barcode label printing component (UC37).
 * Encodes Code 128 barcode format, patient demographics, and test tube cap colors.
 * Conforms to: BR-PHL-01, BR-PHL-02 & AGENTS-DESIGN.md.
 * @module features/laboratory/components/BarcodePrinter
 */

import React from "react";
import { Card, Alert } from "react-bootstrap";

/**
 * Barcode label printing component placeholder for Iteration 2.
 *
 * @returns {JSX.Element} Placeholder view.
 */
export default function BarcodePrinter() {
    return (
        <Card className="shadow-sm p-4 text-center border-0">
            <Alert variant="info" className="m-0">
                <i className="bi bi-upc-scan me-2"></i>
                <strong>In Tem Mã Vạch Ống Máu (Code 128):</strong> Trình tạo mã vạch và chỉ định màu nắp ống nghiệm chuẩn y tế.
            </Alert>
        </Card>
    );
}
