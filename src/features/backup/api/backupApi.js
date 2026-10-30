/**
 * @file backupApi.js
 * @description API client services for Database Backup and Restoration procedures (UC80 / BR-243).
 * Specifically handles archiving patient diagnostic lab test records, verifying SHA-256 integrity, and authorized restoration.
 * Conforms to: Production Engineering Standards & AGENTS-CODE.md.
 */

import api from "../../../config/api";

const BACKUP_BASE_URL = "/backup";

/**
 * Retrieves overall backup system statistics and KPI metrics.
 */
export async function fetchBackupStats() {
    const response = await api.get(`${BACKUP_BASE_URL}/stats`);
    return response.data?.data || {
        totalBackups: 0,
        completedBackups: 0,
        failedBackups: 0,
        patientTestScopeBackups: 0,
        totalStorageMb: 0,
        integritySuccessRate: 100.0,
        lastBackupTime: null
    };
}

/**
 * Retrieves paginated list of backup snapshots.
 */
export async function fetchBackups(params = {}) {
    const queryParams = new URLSearchParams();
    if (params.scope) queryParams.append("scope", params.scope);
    if (params.status) queryParams.append("status", params.status);
    if (params.pageNumber) queryParams.append("pageNumber", params.pageNumber);
    if (params.pageSize) queryParams.append("pageSize", params.pageSize);

    const qs = queryParams.toString();
    const response = await api.get(`${BACKUP_BASE_URL}${qs ? `?${qs}` : ""}`);
    return response.data?.data || { items: [], totalCount: 0, currentPage: 1, pageSize: 15 };
}

/**
 * Retrieves detailed metadata for a single backup.
 */
export async function fetchBackupById(id) {
    const response = await api.get(`${BACKUP_BASE_URL}/${id}`);
    return response.data?.data;
}

/**
 * Triggers creation of a new backup snapshot.
 */
export async function createBackup(payload) {
    const response = await api.post(`${BACKUP_BASE_URL}/create`, payload);
    return response.data;
}

/**
 * Performs cryptographic SHA-256 verification against the stored backup file.
 */
export async function verifyBackupIntegrity(id) {
    const response = await api.post(`${BACKUP_BASE_URL}/${id}/verify`);
    return response.data?.data;
}

/**
 * Performs pre-flight dry-run restoration validation.
 */
export async function validateRestoreDryRun(id) {
    const response = await api.post(`${BACKUP_BASE_URL}/${id}/restore/validate`);
    return response.data?.data;
}

/**
 * Executes data restoration from the specified backup snapshot.
 */
export async function executeRestore(id, payload) {
    const response = await api.post(`${BACKUP_BASE_URL}/${id}/restore/execute`, payload);
    return response.data?.data;
}

/**
 * Retrieves restoration audit history.
 */
export async function fetchRestoreHistory(backupId = null) {
    const query = backupId ? `?backupId=${encodeURIComponent(backupId)}` : "";
    const response = await api.get(`${BACKUP_BASE_URL}/restore-history${query}`);
    return response.data?.data || [];
}

/**
 * Deletes a backup snapshot.
 */
export async function deleteBackup(id) {
    const response = await api.delete(`${BACKUP_BASE_URL}/${id}`);
    return response.data;
}

/**
 * Generates normalized download URL for a backup archive.
 * Prevents '/api/api' duplication when baseURL already includes '/api'.
 */
export function getBackupDownloadUrl(id) {
    const rawBase = (api.defaults.baseURL || "http://localhost:5000").replace(/\/+$/, "");
    const cleanBase = rawBase.endsWith("/api") ? rawBase : `${rawBase}/api`;
    return `${cleanBase}/backup/${encodeURIComponent(id)}/download`;
}

/**
 * Programmatically downloads the backup archive with authorization headers and triggers browser file save.
 */
export async function downloadBackupArchive(id, preferredFileName = null) {
    const response = await api.get(`/backup/${encodeURIComponent(id)}/download`, {
        responseType: "blob",
    });

    const blob = new Blob([response.data], {
        type: response.headers["content-type"] || "application/json",
    });

    let fileName = preferredFileName;
    if (!fileName) {
        const disposition = response.headers["content-disposition"];
        if (disposition && disposition.includes("filename=")) {
            const matches = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/.exec(disposition);
            if (matches != null && matches[1]) {
                fileName = matches[1].replace(/['"]/g, "");
            }
        }
    }
    if (!fileName) {
        fileName = `${id}.json`;
    }

    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = downloadUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(downloadUrl);
}
