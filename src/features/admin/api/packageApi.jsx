/**
 * @file packageApi.jsx
 * @description REST API client for administrative service package CRUD workflows (UC15).
 * Communicates with backend /api/service-packages and /api/test-criteria.
 * @module features/admin/api/packageApi
 */

import apiClient from "./apiClient.jsx";

/**
 * Retrieves all laboratory service packages.
 *
 * @returns {Promise<object[]>} List of service packages.
 */
export async function getPackages(params = { pageSize: 100 }) {
    const response = await apiClient.get("/service-packages", { params });
    return response.data;
}

/**
 * Retrieves all active laboratory test criteria for package composition.
 *
 * @returns {Promise<object[]>} List of test criteria.
 */
export async function getTestCriteria() {
    const response = await apiClient.get("/test-criteria");
    return response.data;
}

/**
 * Creates a new laboratory service package (UC15).
 *
 * @param {object} payload - Service package payload.
 * @returns {Promise<object>} Created package entity.
 */
export async function createPackage(payload) {
    const response = await apiClient.post("/service-packages", payload);
    return response.data;
}

/**
 * Updates an existing service package's metadata, pricing, or test items (UC15).
 *
 * @param {string} id - The package identifier.
 * @param {object} payload - Updated fields.
 * @returns {Promise<object>} Updated package entity.
 */
export async function updatePackage(id, payload) {
    const response = await apiClient.put(
        `/service-packages/${id}`,
        payload
    );
    return response.data;
}

/**
 * Deletes a service package by identifier (UC15).
 *
 * @param {string} id - The package identifier.
 * @returns {Promise<object>} Deletion confirmation.
 */
export async function deletePackage(id) {
    const response = await apiClient.delete(
        `/service-packages/${encodeURIComponent(id)}`
    );
    return response.data;
}