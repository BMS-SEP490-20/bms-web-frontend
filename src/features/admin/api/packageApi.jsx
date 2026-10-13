
import apiClient from "./apiClient.jsx";

export async function getPackages() {
    const response = await apiClient.get("/service-packages");
    return response.data;
}

export async function getTestCriteria() {
    const response = await apiClient.get("/test-criteria");
    return response.data;
}

export async function createPackage(payload) {
    const response = await apiClient.post("/service-packages", payload);
    return response.data;
}

export async function updatePackage(id, payload) {
    const response = await apiClient.put(
        `/service-packages/${id}`,
        payload
    );
    return response.data;
}

export async function deletePackage(id) {
    const response = await apiClient.delete(
        `/service-packages/${encodeURIComponent(id)}`
    );
    return response.data;
}