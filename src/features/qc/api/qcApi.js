/**
 * @file qcApi.js
 * @description API client for UC73 Laboratory Internal Quality Control (IQC) & Westgard Multi-Rule Evaluation.
 * Handles QC Lots CRUD, Levey-Jennings plotting datasets, Westgard evaluation,
 * analyzer locking, and corrective action sign-offs against the real backend API.
 */

let apiInstance = null;

async function getApi() {
    if (apiInstance) return apiInstance;
    const mod = await import("../../../config/api.js");
    apiInstance = mod.default || mod;
    return apiInstance;
}

function extractQcError(err, fallbackMessage) {
    const status = err?.response?.status;
    const apiMsg = err?.response?.data?.message || err?.response?.data?.title;
    if (status === 401 || status === 403) {
        return new Error(apiMsg || "Bạn không có quyền thực hiện thao tác QC này.");
    }
    return new Error(apiMsg || err?.message || fallbackMessage);
}

/**
 * Fetch all QC Lots with optional filtering.
 */
export async function fetchQcLots(params = {}) {
    const api = await getApi();
    try {
        const res = await api.get("/qc/lots", { params });
        if (res.data?.success && res.data?.data) {
            return res.data.data;
        }
        throw new Error(res.data?.message || "Không thể tải danh sách lô QC.");
    } catch (err) {
        throw extractQcError(err, "Không thể tải danh sách lô QC.");
    }
}

/**
 * Get QC Lot by ID.
 */
export async function getQcLotById(lotId) {
    const api = await getApi();
    try {
        const res = await api.get(`/qc/lots/${lotId}`);
        if (res.data?.success && res.data?.data) {
            return res.data.data;
        }
        throw new Error(res.data?.message || `Không tìm thấy lô QC ${lotId}`);
    } catch (err) {
        throw extractQcError(err, `Không thể tải thông tin lô QC ${lotId}`);
    }
}

/**
 * Create a new QC Lot.
 */
export async function createQcLot(dto) {
    if (!dto.lotNumber?.trim()) throw new Error("Mã số lô (Lot Number) không được để trống.");
    if (!dto.analyteName?.trim()) throw new Error("Tên chỉ số xét nghiệm không được để trống.");
    if (!dto.targetMean || dto.targetMean <= 0) throw new Error("Giá trị trung bình đích phải lớn hơn 0.");
    if (!dto.targetStandardDeviation || dto.targetStandardDeviation <= 0) throw new Error("Độ lệch chuẩn đích phải lớn hơn 0.");

    const api = await getApi();
    try {
        const res = await api.post("/qc/lots", dto);
        if (res.data?.success && res.data?.data) {
            return res.data.data;
        }
        throw new Error(res.data?.message || "Tạo lô QC mới thất bại.");
    } catch (err) {
        throw extractQcError(err, "Tạo lô QC mới thất bại.");
    }
}

/**
 * Update an existing QC Lot.
 */
export async function updateQcLot(lotId, dto) {
    const api = await getApi();
    try {
        const res = await api.put(`/qc/lots/${lotId}`, dto);
        if (res.data?.success && res.data?.data) {
            return res.data.data;
        }
        throw new Error(res.data?.message || `Cập nhật lô QC ${lotId} thất bại.`);
    } catch (err) {
        throw extractQcError(err, `Cập nhật lô QC ${lotId} thất bại.`);
    }
}

/**
 * Toggle Active status of a QC Lot.
 */
export async function toggleQcLotStatus(lotId) {
    const api = await getApi();
    try {
        const res = await api.post(`/qc/lots/${lotId}/toggle-status`);
        if (res.data?.success) {
            return res.data.isActive;
        }
        throw new Error(res.data?.message || "Thay đổi trạng thái lô QC thất bại.");
    } catch (err) {
        throw extractQcError(err, "Thay đổi trạng thái lô QC thất bại.");
    }
}

/**
 * Record an analytical IQC measurement run and evaluate Westgard rules.
 */
export async function recordQcRun(dto) {
    if (!dto.lotId) throw new Error("Mã lô QC không được để trống.");
    if (dto.measuredValue === undefined || dto.measuredValue === null) throw new Error("Giá trị đo không được để trống.");

    const api = await getApi();
    try {
        const res = await api.post("/qc/runs/record", dto);
        if (res.data?.success && res.data?.data) {
            return res.data.data;
        }
        throw new Error(res.data?.message || "Ghi nhận lần chạy QC thất bại.");
    } catch (err) {
        throw extractQcError(err, "Ghi nhận lần chạy QC thất bại.");
    }
}

/**
 * Fetch Levey-Jennings chart dataset.
 */
export async function fetchLeveyJenningsData(lotId) {
    const api = await getApi();
    try {
        const res = await api.get(`/qc/levey-jennings/${lotId}`);
        if (res.data?.success && res.data?.data) {
            return res.data.data;
        }
        throw new Error(res.data?.message || `Không thể tải biểu đồ Levey-Jennings cho lô ${lotId}.`);
    } catch (err) {
        throw extractQcError(err, `Không thể tải biểu đồ Levey-Jennings cho lô ${lotId}.`);
    }
}

/**
 * Sign off on corrective action for an out-of-control run.
 */
export async function signoffCorrectiveAction(runId, dto) {
    if (!dto.operatorName?.trim()) throw new Error("Họ tên nhân viên ký duyệt không được để trống.");
    if (!dto.correctiveAction?.trim()) throw new Error("Ghi chú biện pháp khắc phục không được để trống.");

    const api = await getApi();
    try {
        const res = await api.post(`/qc/runs/${runId}/signoff`, dto);
        if (res.data?.success && res.data?.data) {
            return res.data.data;
        }
        throw new Error(res.data?.message || "Ký mở khóa QC thất bại.");
    } catch (err) {
        if (err?.response?.status === 401 || err?.response?.status === 403) {
            throw new Error(
                err?.response?.data?.message ||
                err?.response?.data?.title ||
                "Chỉ Quản lý Lab (Manager) được ký duyệt khắc phục và mở khóa máy sau vi phạm Westgard."
            );
        }
        throw extractQcError(err, `Không ký được mở khóa QC cho lần chạy ${runId}.`);
    }
}

/**
 * Fetch QC dashboard summary metrics.
 */
export async function fetchQcDashboardSummary() {
    const api = await getApi();
    try {
        const res = await api.get("/qc/summary");
        if (res.data?.success && res.data?.data) {
            return res.data.data;
        }
        throw new Error(res.data?.message || "Không thể tải tổng quan chất lượng IQC.");
    } catch (err) {
        throw extractQcError(err, "Không thể tải tổng quan chất lượng IQC.");
    }
}

/**
 * Fetch active QC flags & violations.
 */
export async function fetchQcFlags() {
    const api = await getApi();
    try {
        const res = await api.get("/qc/flags");
        if (res.data?.success && res.data?.data) {
            return res.data.data;
        }
        throw new Error(res.data?.message || "Không thể tải danh sách cảnh báo QC.");
    } catch (err) {
        if (err?.response?.status === 404) {
            try {
                const res = await api.get("/QcFlags");
                if (res.data?.success && res.data?.data) {
                    return res.data.data;
                }
            } catch (err2) {
                throw extractQcError(err2, "Không thể tải danh sách cảnh báo QC.");
            }
        }
        throw extractQcError(err, "Không thể tải danh sách cảnh báo QC.");
    }
}
