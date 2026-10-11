/**
 * Warehouse Service
 * 
 * This service handles all warehouse-related operations including
 * equipment and reagents management.
 * 
 * @author Blood Laboratory Management Team
 * @version 1.0.0
 * @since 2024
 */

import api from './api';

/**
 * Helper function to safely extract array from various API response shapes
 * @param {*} data - API response data
 * @returns {Array} - Normalized array
 */
const toArray = (data) => {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.records)) return data.records;
  if (Array.isArray(data?.result)) return data.result;
  return [];
};

// Normalizers to ensure consistent shape across list and single-item responses
const normalizeEquipment = (item = {}) => ({
  id: item.id || item.equipmentId || item.equipment_id || item.code || item.deviceId || item.productId || '',
  code: item.code || item.equipmentCode || item.equipment_code || item.codeManufacturer || item.code_manufacturer || item.barcode || item.sku || '',
  name: item.name || item.equipmentName || item.equipment_name || item.displayName || item.productName || item.description || '',
  manufacturer: item.manufacturer || item.manufacturerName || item.mfg || null,
  quantity: item.quantity || item.stock || item.stockQuantity || 0,
  unit: item.unit || item.unitOfMeasure || null,
  status: item.status || item.equipmentStatus || null,
  lastMaintenanceDate: item.last_maintenance_date || item.lastMaintenanceDate || item.lastMaintenance || null,
  description: item.description || item.equipmentDescription || item.equipment_name_description || null,
  raw: item
});

const normalizeReagent = (item = {}) => ({
  id: item.id || item.reagentId || item.reagent_id || item.code || item.itemId || item.productId || '',
  code: item.code || item.reagentCode || item.reagent_code || item.barcode || item.sku || '',
  name: item.name || item.reagentName || item.reagent_name || item.displayName || item.productName || item.description || '',
  manufacturer: item.manufacturer || item.manufacturerName || item.mfg || null,
  quantity: item.quantity || item.stock || item.stockQuantity || 0,
  unit: item.unit || item.unitOfMeasure || null,
  expiryDate: item.expiryDate || item.expiry_date || item.expiration || null,
  importDate: item.importDate || item.import_date || null,
  importLot: item.importLot || item.import_lot || null,
  description: item.description || null,
  status: item.status || item.reagentStatus || null,
  raw: item
});

// Helper: try multiple endpoint paths in order until one succeeds
const callFallback = async (method, paths, payload) => {
  let lastError;
  for (const p of paths) {
    try {
      const m = method.toLowerCase();
      if (m === 'get') return await api.get(p);
      if (m === 'post') return await api.post(p, payload);
      if (m === 'put') return await api.put(p, payload);
      if (m === 'patch') return await api.patch(p, payload);
      if (m === 'delete') return await api.delete(p);
    } catch (err) {
      lastError = err;
      // try next
    }
  }
  throw lastError;
};

/**
 * Warehouse Service Object
 * 
 * Contains methods for warehouse equipment and reagents management.
 * All methods return a standardized response object with success status and data/message.
 */
export const warehouseService = {
  // ============ EQUIPMENT OPERATIONS ============
  /**
   * Get All Equipment
   * 
   * Retrieves all equipment/devices from warehouse.
   * GET /gateway/warehouse/equipment
   * 
   * @returns {Promise<Object>} Response with equipment list
   */
  getAllEquipment: async (options = {}) => {
    try {
      // Try direct gateway endpoint first (allow params)
      let resp;
      try {
        resp = await api.get('/gateway/warehouse/equipment', { params: options.params || {} });
      } catch (err) {
        // fallback to alternative paths
        resp = await callFallback('get', ['/gateway/warehouse/equipment', '/equipment', '/Equipment']);
      }
      let raw = toArray(resp.data);
      if (!raw || raw.length === 0) raw = toArray(resp.data?.data);
      if (!raw || raw.length === 0) raw = toArray(resp.data?.items);

      // If fetchAll requested, iterate pages on the gateway path
      if (options.fetchAll) {
        try {
          const collected = [];
          const seen = new Set();
          let page = 1;
          const respPageSize = Number(resp.data?.pageSize || resp.data?.page_size || 0) || (Array.isArray(raw) ? raw.length : 0) || 50;
          while (true) {
            const pagedResp = await api.get('/gateway/warehouse/equipment', { params: { page, pageSize: respPageSize } });
            const pageRaw = toArray(pagedResp.data);
            if (!pageRaw || pageRaw.length === 0) break;
            // Add only new items (deduplicate by common id/code keys). If no new items found, stop to avoid infinite loops.
            let newAdded = 0;
            for (const it of pageRaw) {
              const idKey = String(it.id || it.equipmentId || it.deviceId || it.code || it.equipmentCode || it.productId || '').trim();
              const codeKey = String(it.code || it.equipmentCode || it.barcode || '').trim();
              const uniq = idKey || codeKey || JSON.stringify(it);
              if (!seen.has(uniq)) {
                seen.add(uniq);
                collected.push(it);
                newAdded += 1;
              }
            }
            if (newAdded === 0) break;
            if (pageRaw.length < respPageSize) break;
            page += 1;
            if (page > 200) break;
          }
          const data = (collected || []).map(item => normalizeEquipment(item));
          return { success: true, data };
        } catch (e) {
        }
      }


      // Normalize equipment items to consistent shape
      const data = (raw || []).map(item => normalizeEquipment(item));

      return { success: true, data };
    } catch (error) {
      return { success: false, message: 'Lỗi lấy danh sách thiết bị', data: [] };
    }
  },

  /**
   * Get Equipment By ID
   * 
   * Retrieves a specific equipment item by ID.
   * GET /gateway/warehouse/equipment/{id}
   * 
   * @param {string|number} id - Equipment ID
   * @returns {Promise<Object>} Response with equipment data
   */
  getEquipmentById: async (id) => {
    try {
      if (!id) return { success: false, message: 'Missing equipment id' };
      const resp = await callFallback('get', [`/gateway/warehouse/equipment/${id}`, `/equipment/${id}`, `/Equipment/${id}`]);
      const payload = resp.data?.data || resp.data;
      const data = payload ? (Array.isArray(payload) ? payload.map(normalizeEquipment) : normalizeEquipment(payload)) : null;
      return { success: true, data };
    } catch (error) {
      return { success: false, message: 'Lỗi lấy thông tin thiết bị' };
    }
  },

  /**
   * Create Equipment
   * 
   * Creates a new equipment item.
   * POST /gateway/warehouse/equipment
   * 
   * @param {Object} equipmentData - Equipment data
   * @returns {Promise<Object>} Response with created equipment
   */
  createEquipment: async (equipmentData) => {
    try {
      const resp = await callFallback('post', ['/gateway/warehouse/equipment', '/equipment', '/Equipment'], equipmentData);
      const payload = resp.data?.data || resp.data;
      const data = payload ? (Array.isArray(payload) ? payload.map(normalizeEquipment) : normalizeEquipment(payload)) : null;
      return { success: true, data, message: 'Tạo thiết bị mới thành công' };
    } catch (error) {
      return { success: false, message: error.response?.data?.message || 'Lỗi tạo thiết bị mới' };
    }
  },

  /**
   * Update Equipment
   * 
   * Updates an existing equipment item.
   * PUT /gateway/warehouse/equipment/{id}
   * 
   * @param {string|number} id - Equipment ID
   * @param {Object} equipmentData - Updated equipment data
   * @returns {Promise<Object>} Response with updated equipment
   */
  updateEquipment: async (id, equipmentData) => {
    try {
      if (!id) return { success: false, message: 'Missing equipment id' };
      const resp = await callFallback('put', [`/gateway/warehouse/equipment/${id}`, `/equipment/${id}`, `/Equipment/${id}`], equipmentData);
      const payload = resp.data?.data || resp.data;
      const data = payload ? (Array.isArray(payload) ? payload.map(normalizeEquipment) : normalizeEquipment(payload)) : null;
      return { success: true, data, message: 'Cập nhật thiết bị thành công' };
    } catch (error) {
      return { success: false, message: error.response?.data?.message || 'Lỗi cập nhật thiết bị' };
    }
  },

  /**
   * Delete Equipment
   * 
   * Deletes an equipment item.
   * DELETE /gateway/warehouse/equipment/{id}
   * 
   * @param {string|number} id - Equipment ID
   * @returns {Promise<Object>} Response with success message
   */
  deleteEquipment: async (id) => {
    try {
      if (!id) return { success: false, message: 'Missing equipment id' };
      await callFallback('delete', [`/gateway/warehouse/equipment/${id}`, `/equipment/${id}`, `/Equipment/${id}`]);
      return { success: true, message: 'Xóa thiết bị thành công' };
    } catch (error) {
      return { success: false, message: error.response?.data?.message || 'Lỗi xóa thiết bị' };
    }
  },

  // ============ REAGENTS OPERATIONS ============
  /**
   * Get All Reagents
   * 
   * Retrieves all reagents from warehouse.
   * GET /gateway/warehouse/reagents
   * 
   * @returns {Promise<Object>} Response with reagents list
   */
  getAllReagents: async (options = {}) => {
    try {
      let resp;
      try {
        resp = await api.get('/gateway/warehouse/reagents', { params: options.params || {} });
      } catch (err) {
        resp = await api.get('/gateway/warehouse/reagents');
      }
      let raw = toArray(resp.data);
      if (!raw || raw.length === 0) raw = toArray(resp.data?.data);
      if (!raw || raw.length === 0) raw = toArray(resp.data?.items);

      if (options.fetchAll) {
        try {
          const collected = [];
          const seen = new Set();
          let page = 1;
          const respPageSize = Number(resp.data?.pageSize || resp.data?.page_size || 0) || (Array.isArray(raw) ? raw.length : 0) || 50;
          while (true) {
            const pagedResp = await api.get('/gateway/warehouse/reagents', { params: { page, pageSize: respPageSize } });
            const pageRaw = toArray(pagedResp.data);
            if (!pageRaw || pageRaw.length === 0) break;
            let newAdded = 0;
            for (const it of pageRaw) {
              const idKey = String(it.id || it.reagentId || it.reagent_id || it.code || it.itemId || it.productId || '').trim();
              const codeKey = String(it.code || it.reagentCode || it.reagent_code || it.barcode || '').trim();
              const uniq = idKey || codeKey || JSON.stringify(it);
              if (!seen.has(uniq)) {
                seen.add(uniq);
                collected.push(it);
                newAdded += 1;
              }
            }
            if (newAdded === 0) break;
            if (pageRaw.length < respPageSize) break;
            page += 1;
            if (page > 200) break;
          }
          const data = (collected || []).map(item => normalizeReagent(item));
          return { success: true, data };
        } catch (e) {
        }
      }


      // Normalize reagent items to consistent shape
      const data = (raw || []).map(item => normalizeReagent(item));

      return { success: true, data };
    } catch (error) {
      return { success: false, message: 'Lỗi lấy danh sách thuốc thử', data: [] };
    }
  },

  /**
   * Get Reagent By ID
   * 
   * Retrieves a specific reagent by ID.
   * GET /gateway/warehouse/reagents/{id}
   * 
   * @param {string|number} id - Reagent ID
   * @returns {Promise<Object>} Response with reagent data
   */
  getReagentById: async (id) => {
    try {
      if (!id) return { success: false, message: 'Missing reagent id' };
      const resp = await api.get(`/gateway/warehouse/reagents/${id}`);
      const payload = resp.data?.data || resp.data;
      const data = payload ? (Array.isArray(payload) ? payload.map(normalizeReagent) : normalizeReagent(payload)) : null;
      return { success: true, data };
    } catch (error) {
      return { success: false, message: 'Lỗi lấy thông tin thuốc thử' };
    }
  },

  /**
   * Create Reagent
   * 
   * Creates a new reagent item.
   * POST /gateway/warehouse/reagents
   * 
   * @param {Object} reagentData - Reagent data
   * @returns {Promise<Object>} Response with created reagent
   */
  createReagent: async (reagentData) => {
    try {
      const resp = await api.post('/gateway/warehouse/reagents', reagentData);
      const payload = resp.data?.data || resp.data;
      const data = payload ? (Array.isArray(payload) ? payload.map(normalizeReagent) : normalizeReagent(payload)) : null;
      return { success: true, data, message: 'Tạo thuốc thử mới thành công' };
    } catch (error) {
      return { success: false, message: error.response?.data?.message || 'Lỗi tạo thuốc thử mới' };
    }
  },

  /**
   * Update Reagent
   * 
   * Updates an existing reagent item.
   * PUT /gateway/warehouse/reagents/{id}
   * 
   * @param {string|number} id - Reagent ID
   * @param {Object} reagentData - Updated reagent data
   * @returns {Promise<Object>} Response with updated reagent
   */
  updateReagent: async (id, reagentData) => {
    try {
      if (!id) return { success: false, message: 'Missing reagent id' };
      const resp = await api.put(`/gateway/warehouse/reagents/${id}`, reagentData);
      const payload = resp.data?.data || resp.data;
      const data = payload ? (Array.isArray(payload) ? payload.map(normalizeReagent) : normalizeReagent(payload)) : null;
      return { success: true, data, message: 'Cập nhật thuốc thử thành công' };
    } catch (error) {
      return { success: false, message: error.response?.data?.message || 'Lỗi cập nhật thuốc thử' };
    }
  },

  /**
   * Partial Update Reagent
   * 
   * Partially updates a reagent item (PATCH).
   * PATCH /gateway/warehouse/reagents/{id}
   * 
   * @param {string|number} id - Reagent ID
   * @param {Object} partialData - Partial update data
   * @returns {Promise<Object>} Response with updated reagent
   */
  patchReagent: async (id, partialData) => {
    try {
      if (!id) return { success: false, message: 'Missing reagent id' };
      const resp = await api.patch(`/gateway/warehouse/reagents/${id}`, partialData);
      const payload = resp.data?.data || resp.data;
      const data = payload ? (Array.isArray(payload) ? payload.map(normalizeReagent) : normalizeReagent(payload)) : null;
      return { success: true, data, message: 'Cập nhật một phần thuốc thử thành công' };
    } catch (error) {
      return { success: false, message: error.response?.data?.message || 'Lỗi cập nhật thuốc thử' };
    }
  },

  /**
   * Subtract Reagent Quantity
   *
   * Calls the backend subtract endpoint which expects a plain integer
   * representing how much to subtract from the reagent stock.
   * PATCH /gateway/warehouse/reagents/{id}/subtract
   */
  subtractReagent: async (id, amount) => {
    try {
      if (!id) return { success: false, message: 'Missing reagent id' };
      // normalize amount to number
      let n = amount;
      if (typeof n === 'string') n = Number(n);
      if (typeof n !== 'number' || isNaN(n) || n < 0) return { success: false, message: 'Invalid amount to subtract' };
      // Try several request shapes to maximize compatibility with different backends
      const attempts = [];
      // preferred: PATCH with { amount: n }
      attempts.push({ method: 'patch', url: `/gateway/warehouse/reagents/${id}/subtract`, body: { amount: n } });
      // alternative: PATCH with raw number body
      attempts.push({ method: 'patch', url: `/gateway/warehouse/reagents/${id}/subtract`, body: n });
      // alternative: POST to subtract endpoint
      attempts.push({ method: 'post', url: `/gateway/warehouse/reagents/${id}/subtract`, body: { amount: n } });
      // alternative: PATCH to reagent resource with { quantity: -n } or { subtract: n }
      attempts.push({ method: 'patch', url: `/gateway/warehouse/reagents/${id}`, body: { quantity: -n } });
      attempts.push({ method: 'patch', url: `/gateway/warehouse/reagents/${id}`, body: { subtract: n } });
      // alternative: query param on subtract endpoint
      attempts.push({ method: 'patch', url: `/gateway/warehouse/reagents/${id}/subtract?amount=${n}`, body: null });
      // alternative: send raw text/plain body (some backends expect plain body)
      attempts.push({ method: 'patch', url: `/gateway/warehouse/reagents/${id}/subtract`, body: n, contentType: 'text/plain' });

      let lastErr = null;
      for (const at of attempts) {
        try {
          let resp;
          if (at.method === 'get') resp = await api.get(at.url);
          else if (at.method === 'post') resp = await api.post(at.url, at.body);
          else if (at.method === 'patch') {
            if (at.contentType === 'text/plain') {
              resp = await api.patch(at.url, String(at.body), { headers: { 'Content-Type': 'text/plain' } });
            } else {
              resp = await api.patch(at.url, at.body);
            }
          } else if (at.method === 'put') resp = await api.put(at.url, at.body);
          else resp = await api.patch(at.url, at.body);

          const payload = resp.data?.data || resp.data;
          const data = payload ? (Array.isArray(payload) ? payload.map(normalizeReagent) : normalizeReagent(payload)) : null;
          return { success: true, data, message: 'Đã trừ thuốc thử thành công' };
        } catch (err) {
          lastErr = err;
          // try next
        }
      }
      return { success: false, message: lastErr?.response?.data?.message || lastErr?.message || 'Lỗi trừ thuốc thử' };
    } catch (error) {
      return { success: false, message: error.response?.data?.message || 'Lỗi trừ thuốc thử' };
    }
  },

  /**
   * Delete Reagent
   * 
   * Deletes a reagent item.
   * DELETE /gateway/warehouse/reagents/{id}
   * 
   * @param {string|number} id - Reagent ID
   * @returns {Promise<Object>} Response with success message
   */
  deleteReagent: async (id) => {
    try {
      if (!id) return { success: false, message: 'Missing reagent id' };
      await api.delete(`/gateway/warehouse/reagents/${id}`);
      return { success: true, message: 'Xóa thuốc thử thành công' };
    } catch (error) {
      return { success: false, message: error.response?.data?.message || 'Lỗi xóa thuốc thử' };
    }
  }
};

export default warehouseService;
