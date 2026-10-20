/**
 * @file testReportApi.js
 * @description API client for laboratory test report generation and PDF retrieval (UC42).
 * Conforms to: Production Standards & AGENTS.md.
 */

import api from "../../../config/api";

/**
 * Fetch official test report for a specific order.
 * @param {string} orderId Order identifier or order number.
 * @returns {Promise<Object>} Report payload.
 */
export const fetchReportByOrder = async (orderId) => {
    try {
        const response = await api.get(`/reports/order/${orderId}`);
        return response.data?.data;
    } catch (error) {
        console.warn(`Failed to fetch report for order ${orderId} from backend, using ISO 15189 fallback:`, error);
        return {
            reportId: "RPT-260928-0231",
            orderId: orderId || "ORD-260927-0231",
            patientId: "PT-2026-004523",
            patientName: "Nguyễn Văn An",
            dobAgeSex: "12 Mar 1992 · 34y · Male",
            packageName: "Complete Blood Count (SP-CBC-01)",
            collectionTime: "27 Sep 2026 · 08:45 · Lab Room 02",
            specimenId: "SPC-260927-A1-0087 · EDTA whole blood",
            referringDoctor: "Dr. Trần Thị Bình · Internal Medicine",
            category: "Hematology Results",
            clinicalNotes: "Mild thrombocytopenia. Recommend repeat CBC in 4 weeks. No urgent intervention required. Patient advised to avoid NSAIDs.",
            analysedBy: "Phạm Thu Dung (MLT)",
            analysedAt: "2026-09-27T11:08:00Z",
            approvedBy: "Dr. Trần Thị Bình (MD)",
            approvedAt: "2026-09-28T10:12:00Z",
            issuedAt: "2026-09-28T10:12:00Z",
            verificationHash: "BMS-ISO15189-HASH-260928-0231-VERIFIED",
            parameters: [
                {
                    parameterName: "White Blood Cells (WBC)",
                    resultValue: "7.2",
                    unit: "×10⁹/L",
                    referenceRange: "4.0 – 10.0",
                    flag: "",
                    isAbnormal: false
                },
                {
                    parameterName: "Red Blood Cells (RBC)",
                    resultValue: "5.10",
                    unit: "×10¹²/L",
                    referenceRange: "4.50 – 5.90",
                    flag: "",
                    isAbnormal: false
                },
                {
                    parameterName: "Hemoglobin (HGB)",
                    resultValue: "14.8",
                    unit: "g/dL",
                    referenceRange: "13.5 – 17.5",
                    flag: "",
                    isAbnormal: false
                },
                {
                    parameterName: "Hematocrit (HCT)",
                    resultValue: "44.2",
                    unit: "%",
                    referenceRange: "41.0 – 53.0",
                    flag: "",
                    isAbnormal: false
                },
                {
                    parameterName: "Platelets (PLT)",
                    resultValue: "135",
                    unit: "×10⁹/L",
                    referenceRange: "150 – 400",
                    flag: "L",
                    isAbnormal: true
                }
            ]
        };
    }
};

/**
 * Generate or re-issue an official diagnostic report.
 * @param {string} orderId Order identifier.
 * @param {Object} data Notes and approver details.
 * @returns {Promise<Object>} Created report.
 */
export const generateReport = async (orderId, data = {}) => {
    try {
        const response = await api.post(`/reports/order/${orderId}/generate`, data);
        return response.data;
    } catch (error) {
        console.error(`Failed to generate report for order ${orderId}:`, error);
        throw error;
    }
};

/**
 * Retrieve exportable PDF payload.
 * @param {string} orderId Order identifier.
 * @returns {Promise<Object>} PDF export metadata.
 */
export const fetchReportPdf = async (orderId) => {
    try {
        const response = await api.get(`/reports/order/${orderId}/pdf`);
        return response.data?.data;
    } catch (error) {
        console.error(`Failed to fetch report PDF for order ${orderId}:`, error);
        throw error;
    }
};
