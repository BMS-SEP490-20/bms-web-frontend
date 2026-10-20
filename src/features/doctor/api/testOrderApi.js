/**
 * @file testOrderApi.js
 * @description API client for laboratory test orders and physician requisitions (UC32).
 * Conforms to: Production Standards & AGENTS.md.
 */

import api from "../../../config/api";

/**
 * Fetch available test catalog items with tube, pricing, and fasting specifications.
 * @returns {Promise<Array>} List of test catalog items.
 */
export const fetchTestCatalog = async () => {
    try {
        const response = await api.get("/testorders/catalog");
        return response.data?.data || [];
    } catch (error) {
        console.warn("Failed to fetch test catalog from backend, using clinical fallback catalog:", error);
        return [
            {
                code: "SP-LIP-02",
                name: "Lipid Profile Extended",
                category: "Biochemistry",
                tubeType: "SST 4mL",
                tubeColor: "Gold",
                volumeMl: 4.0,
                turnaroundTime: "~4h",
                preparationNotes: "Fast 12h",
                fastingRequired: true,
                fastingHours: 12,
                price: 380000
            },
            {
                code: "TST-GLU-F",
                name: "Fasting Glucose",
                category: "Biochemistry",
                tubeType: "NaF 2mL",
                tubeColor: "Green",
                volumeMl: 2.0,
                turnaroundTime: "~1h",
                preparationNotes: "Fast 8h",
                fastingRequired: true,
                fastingHours: 8,
                price: 80000
            },
            {
                code: "SP-LFT-01",
                name: "Liver Function Test (AST, ALT, GGT, Bili)",
                category: "Biochemistry",
                tubeType: "SST 3mL",
                tubeColor: "Gold",
                volumeMl: 3.0,
                turnaroundTime: "~3h",
                preparationNotes: "Fast 8h",
                fastingRequired: true,
                fastingHours: 8,
                price: 280000
            },
            {
                code: "TST-HBA1C",
                name: "HbA1c (Glycated Hemoglobin)",
                category: "Hematology",
                tubeType: "EDTA 2mL",
                tubeColor: "Lavender",
                volumeMl: 2.0,
                turnaroundTime: "~2h",
                preparationNotes: "None",
                fastingRequired: false,
                fastingHours: 0,
                price: 150000
            },
            {
                code: "TST-CRP-H",
                name: "hs-CRP (High-Sensitivity Cardiac CRP)",
                category: "Immunology",
                tubeType: "SST 1mL",
                tubeColor: "Gold",
                volumeMl: 1.0,
                turnaroundTime: "~2h",
                preparationNotes: "None",
                fastingRequired: false,
                fastingHours: 0,
                price: 120000
            },
            {
                code: "SP-CBC-01",
                name: "Complete Blood Count (CBC 24-parameters)",
                category: "Hematology",
                tubeType: "EDTA 2mL",
                tubeColor: "Lavender",
                volumeMl: 2.0,
                turnaroundTime: "~1h",
                preparationNotes: "None",
                fastingRequired: false,
                fastingHours: 0,
                price: 120000
            },
            {
                code: "SP-KFT-01",
                name: "Kidney Function Test (Urea, Creatinine)",
                category: "Biochemistry",
                tubeType: "SST 3mL",
                tubeColor: "Gold",
                volumeMl: 3.0,
                turnaroundTime: "~2h",
                preparationNotes: "None",
                fastingRequired: false,
                fastingHours: 0,
                price: 180000
            }
        ];
    }
};

/**
 * Fetch test orders list with optional filters.
 * @param {Object} params Filter criteria (patientId, doctorId, status).
 * @returns {Promise<Array>} List of orders.
 */
export const fetchTestOrders = async (params = {}) => {
    try {
        const response = await api.get("/testorders", { params });
        return response.data?.data || [];
    } catch (error) {
        console.error("Error fetching test orders:", error);
        throw error;
    }
};

/**
 * Fetch detailed test order by ID or order number.
 * @param {string} id Order ID or order number.
 * @returns {Promise<Object>} Test order details.
 */
export const fetchTestOrderById = async (id) => {
    try {
        const response = await api.get(`/testorders/${id}`);
        return response.data?.data;
    } catch (error) {
        console.error(`Error fetching order ${id}:`, error);
        throw error;
    }
};

/**
 * Submit and create a new test order requisition.
 * @param {Object} orderData Order payload.
 * @returns {Promise<Object>} Created order data.
 */
export const createTestOrder = async (orderData) => {
    try {
        const response = await api.post("/testorders", orderData);
        return response.data;
    } catch (error) {
        console.error("Error creating test order:", error);
        throw error;
    }
};

/**
 * Update test order status.
 * @param {string} id Order ID or order number.
 * @param {Object} statusData Status update payload.
 * @returns {Promise<Object>} Updated order data.
 */
export const updateTestOrderStatus = async (id, statusData) => {
    try {
        const response = await api.put(`/testorders/${id}/status`, statusData);
        return response.data;
    } catch (error) {
        console.error(`Error updating order ${id} status:`, error);
        throw error;
    }
};
