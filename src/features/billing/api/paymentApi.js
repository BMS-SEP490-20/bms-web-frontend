/**
 * @file paymentApi.js
 * @description API client for patient billing fee checkout and digital payment processing (UC55 / Process Payment).
 * Conforms to: Production Standards, Clean Architecture & AGENTS.md.
 */

import api from "../../../config/api";

/**
 * Fetch checkout summary for an invoice directly from backend database.
 * @param {string} invoiceId Unique invoice identifier or invoice code.
 * @returns {Promise<Object|null>}
 */
export const fetchCheckoutSummary = async (invoiceId) => {
    if (!invoiceId) return null;
    try {
        const response = await api.get(`/payments/checkout/${encodeURIComponent(invoiceId)}`);
        return response.data?.data || null;
    } catch (error) {
        console.error(`Failed to fetch checkout summary for ${invoiceId}:`, error);
        return null;
    }
};

/**
 * Validate and apply a promotional discount code to an invoice.
 * @param {string} invoiceId Target invoice ID.
 * @param {string} discountCode Discount code (e.g. SPRING10, BMS10).
 * @returns {Promise<Object>}
 */
export const applyDiscountCode = async (invoiceId, discountCode) => {
    try {
        const response = await api.post("/payments/apply-discount", {
            invoiceId,
            discountCode
        });
        return response.data?.data || response.data;
    } catch (error) {
        console.error("Failed to apply discount code:", error);
        throw error;
    }
};

/**
 * Process a payment transaction (VNPay, MoMo, Banking QR, or Reception).
 * @param {Object} paymentData Payload containing invoiceId, paymentMethod, discountCode, returnUrl.
 * @returns {Promise<Object>}
 */
export const processPaymentTransaction = async (paymentData) => {
    try {
        const response = await api.post("/payments/process", paymentData);
        return response.data;
    } catch (error) {
        console.error("Failed to process payment transaction:", error);
        throw error;
    }
};

/**
 * Fetch unpaid invoices for checkout selection.
 * @param {string} [patientId] Optional patient ID filter.
 * @returns {Promise<Array>}
 */
export const fetchUnpaidInvoices = async (patientId) => {
    try {
        const query = patientId ? `?patientId=${encodeURIComponent(patientId)}` : "";
        const response = await api.get(`/invoices${query}`);
        const list = response.data?.data || [];
        return Array.isArray(list) ? list.filter((i) => i.status === 0 || i.status === "Unpaid") : [];
    } catch (error) {
        console.error("Failed to fetch unpaid invoices:", error);
        return [];
    }
};
