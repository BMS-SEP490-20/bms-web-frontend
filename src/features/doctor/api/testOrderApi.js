/**
 * @file testOrderApi.js
 * @description API client for laboratory test orders and physician requisitions (UC32).
 * Conforms to: Production Standards & AGENTS.md.
 */

import api from "../../../config/api";

/**
 * Fetch available test catalog items directly from backend database.
 * @returns {Promise<Array>} List of test catalog items.
 */
export const fetchTestCatalog = async () => {
    try {
        const response = await api.get("/testorders/catalog");
        return response.data?.data || [];
    } catch (error) {
        console.error("Failed to fetch test catalog from backend API:", error);
        return [];
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
        console.error("Error fetching test orders from backend API:", error);
        return [];
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
