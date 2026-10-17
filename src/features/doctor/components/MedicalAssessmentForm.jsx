/**
 * @file MedicalAssessmentForm.jsx
 * @description [Iteration 2 Placeholder] Doctor clinical assessment and ICD-10 diagnostic test ordering form (UC30).
 * Reserved for Assignee: Hứa Khánh Duy.
 * Conforms to: BR-DOC-01 (Mandatory ICD-10 Coding) & AGENTS-DESIGN.md.
 * @module features/doctor/components/MedicalAssessmentForm
 */

import React from "react";
import { Card, Alert } from "react-bootstrap";

/**
 * Clinical assessment form placeholder for Iteration 2.
 *
 * @returns {JSX.Element} Placeholder card.
 */
export default function MedicalAssessmentForm() {
    return (
        <Card className="shadow-sm p-4 text-center border-0">
            <Alert variant="info" className="m-0">
                <i className="bi bi-clock-history me-2"></i>
                <strong>Khám Bệnh & Chỉ Định Xét Nghiệm (ICD-10):</strong> Phân hệ nhập chẩn đoán lâm sàng, tra cứu mã bệnh ICD-10 và chỉ định xét nghiệm cận lâm sàng.
            </Alert>
        </Card>
    );
}
