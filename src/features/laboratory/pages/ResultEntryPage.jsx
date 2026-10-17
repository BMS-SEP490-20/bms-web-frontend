/**
 * @file ResultEntryPage.jsx
 * @description [Iteration 2 Placeholder] Laboratory Analyzer Result Entry & Panic Alert Modal (UC46).
 * Reserved for Assignee: Phương Gia Lạc.
 * Conforms to: BR-LAB-02 (Reference Intervals), BR-LAB-03 (Panic Values) & AGENTS-DESIGN.md.
 * @module features/laboratory/pages/ResultEntryPage
 */

import React from "react";
import { Container, Card, Alert } from "react-bootstrap";

/**
 * Lab result entry and critical value alert screen placeholder.
 *
 * @returns {JSX.Element} Placeholder view.
 */
export default function ResultEntryPage() {
    return (
        <Container className="py-4">
            <Card className="shadow-sm p-4 text-center border-0">
                <Alert variant="info" className="m-0">
                    <i className="bi bi-eyedropper me-2"></i>
                    <strong>Nhập Kết Quả Xét Nghiệm & Cảnh Báo Ngưỡng Nguy Hiểm:</strong> Giao diện đồng bộ kết quả từ máy xét nghiệm tự động và kiểm soát giá trị Panic.
                </Alert>
            </Card>
        </Container>
    );
}
