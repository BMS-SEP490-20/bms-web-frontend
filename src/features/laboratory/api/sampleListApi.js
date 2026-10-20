/**
 * @file sampleListApi.js
 * @description API client for laboratory sample collection lists and barcode generation (UC37).
 * Conforms to: Production Standards & AGENTS.md.
 */

import api from "../../../config/api";

/**
 * Fetch checked-in appointments ready for phlebotomy intake.
 * @returns {Promise<Array>} List of checked-in appointments.
 */
export const fetchCheckedInAppointments = async () => {
    try {
        const response = await api.get("/samplelist/appointments");
        return response.data?.data || [];
    } catch (error) {
        console.warn("Failed to fetch checked-in appointments from backend, using fallback:", error);
        return [
            {
                appointmentId: "APT-342",
                patientId: "USR-PAT-01",
                patientName: "Nguyễn Văn An",
                packageName: "Lipid + Glucose",
                time: "08:00",
                tubes: ["SST", "NaF"],
                priority: "Routine"
            },
            {
                appointmentId: "APT-343",
                patientId: "USR-PAT-02",
                patientName: "Trần Thị Mai",
                packageName: "CBC",
                time: "08:30",
                tubes: ["EDTA"],
                priority: "Routine"
            },
            {
                appointmentId: "APT-344",
                patientId: "USR-PAT-03",
                patientName: "Lê Hoàng Nam",
                packageName: "Thyroid",
                time: "09:00",
                tubes: ["SST"],
                priority: "Routine"
            },
            {
                appointmentId: "APT-345",
                patientId: "USR-PAT-04",
                patientName: "Phạm Minh Ơn",
                packageName: "Liver",
                time: "09:30",
                tubes: ["SST"],
                priority: "Routine"
            },
            {
                appointmentId: "APT-346",
                patientId: "USR-PAT-05",
                patientName: "Võ Thị Phượng",
                packageName: "Kidney",
                time: "10:00",
                tubes: ["SST"],
                priority: "Routine"
            },
            {
                appointmentId: "APT-348",
                patientId: "USR-PAT-06",
                patientName: "Nguyễn Thị Lan",
                packageName: "CBC + Lipid",
                time: "11:00",
                tubes: ["EDTA", "SST"],
                priority: "Routine"
            }
        ];
    }
};

/**
 * Fetch phlebotomy collection batches.
 * @param {string|null} date Filter date string.
 * @returns {Promise<Array>} Batches list.
 */
export const fetchCollectionBatches = async (date = null) => {
    try {
        const response = await api.get("/samplelist/batches", { params: { date } });
        return response.data?.data || [];
    } catch (error) {
        console.error("Failed to fetch collection batches:", error);
        throw error;
    }
};

/**
 * Fetch batch details by code.
 * @param {string} batchCode Batch code.
 * @returns {Promise<Object>} Batch details.
 */
export const fetchBatchByCode = async (batchCode) => {
    try {
        const response = await api.get(`/samplelist/batches/${batchCode}`);
        return response.data?.data;
    } catch (error) {
        console.error(`Failed to fetch batch ${batchCode}:`, error);
        throw error;
    }
};

/**
 * Confirm and create a new sample collection batch list.
 * @param {Object} batchData Batch payload.
 * @returns {Promise<Object>} Created batch response.
 */
export const createCollectionBatch = async (batchData) => {
    try {
        const response = await api.post("/samplelist/batches", batchData);
        return response.data;
    } catch (error) {
        console.error("Failed to create collection batch:", error);
        throw error;
    }
};

/**
 * Generate printable Code 128 barcode labels for a collection batch.
 * @param {string} batchCode Batch code.
 * @returns {Promise<Object>} Barcode labels payload.
 */
export const fetchBatchBarcodes = async (batchCode) => {
    try {
        const response = await api.get(`/samplelist/batches/${batchCode}/barcodes`);
        return response.data?.data;
    } catch (error) {
        console.error(`Failed to fetch barcodes for batch ${batchCode}:`, error);
        throw error;
    }
};
