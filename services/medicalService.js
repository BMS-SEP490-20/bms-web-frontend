import api from './api';
import testOrderService from './testOrderService';

export const medicalService = {
  // Lấy danh sách tất cả dịch vụ (Test Packages)
  // Swagger: GET /TestOrder/TestPackage
  // options: { fetchAll: boolean, params: object }
  getAllServices: async (options = {}) => {
    try {
      const response = await api.get('/gateway/testorder/testpackage', { params: options.params || {} });
      let data = Array.isArray(response.data) ? response.data : (response.data?.data || []);

      if (options.fetchAll) {
        try {
          const collected = [...data]; // Start with initial data
          const respPageSize = Number(response.data?.pageSize || response.data?.page_size || 0) || (Array.isArray(data) ? data.length : 0) || 50;
          const total = Number(response.data?.total || response.data?.Total || 0) || (Array.isArray(data) ? data.length : 0);
          
          // Calculate max page based on total and pageSize to avoid 404 errors
          const maxPage = total > 0 && respPageSize > 0 ? Math.ceil(total / respPageSize) : 1;
          
          // Only try to fetch more pages if we got data from first page and there are more pages
          if (data && data.length > 0 && maxPage > 1) {
            for (let page = 2; page <= maxPage; page++) {
              try {
                const pagedResp = await api.get('/gateway/testorder/testpackage', { params: { page, pageSize: respPageSize } });
                const pageData = Array.isArray(pagedResp.data) ? pagedResp.data : (pagedResp.data?.data || []);
                if (!pageData || pageData.length === 0) break;
                for (const it of pageData) collected.push(it);
                // Safety check: if we got less than pageSize, we've reached the end
                if (pageData.length < respPageSize) break;
              } catch (pageError) {
                // If 404 or other error, stop fetching more pages (expected when no more pages)
                if (pageError.response?.status === 404) {
                  // 404 is expected when no more pages exist, silently break
                  break;
                }
                // For other errors, log but continue (or break if critical)
                if (pageError.response?.status >= 400) {
                  break;
                }
                // Re-throw unexpected errors
                throw pageError;
              }
              // Safety cap to prevent infinite loops
              if (page > 200) break;
            }
          }
          return { success: true, data: collected, raw: response.data };
        } catch (e) {
          // Silently fail, use initial data
        }
      }

      return { success: true, data: data, raw: response.data };
    } catch (error) {
      // Return empty array instead of error to prevent UI issues
      // 404 is acceptable if endpoint doesn't exist
      if (error.response?.status === 404) {
        return { success: true, data: [], message: 'Endpoint không khả dụng' };
      }
      return { success: false, message: 'Lỗi lấy danh sách gói xét nghiệm', data: [] };
    }
  },

  // Lấy dịch vụ theo ID
  // Swagger: GET /TestOrder/TestPackage/{id}
  getServiceById: async (id) => {
    try {
      const response = await api.get(`/gateway/testorder/testpackage/${id}`);
      const data = response.data?.data || response.data;
      return { success: true, data: data };
    } catch (error) {
      return { success: false, message: 'Lỗi lấy thông tin gói xét nghiệm' };
    }
  },

  // Tạo dịch vụ mới
  // Swagger: POST /TestOrder/TestPackage
  createService: async (serviceData) => {
    try {
      const response = await api.post('/gateway/testorder/testpackage', serviceData);
      const data = response.data?.data || response.data;
      return { success: true, data: data };
    } catch (error) {
      return { success: false, message: 'Lỗi tạo gói xét nghiệm mới' };
    }
  },

  // Cập nhật dịch vụ
  // Swagger: PUT /TestOrder/TestPackage/{id}
  updateService: async (id, serviceData) => {
    try {
      const response = await api.put(`/gateway/testorder/testpackage/${id}`, serviceData);
      const data = response.data?.data || response.data;
      return { success: true, data: data };
    } catch (error) {
      return { success: false, message: 'Lỗi cập nhật gói xét nghiệm' };
    }
  },

  // Xóa dịch vụ
  // Swagger: DELETE /TestOrder/TestPackage/{id}
  deleteService: async (id) => {
    try {
      await api.delete(`/gateway/testorder/testpackage/${id}`);
      return { success: true, message: 'Xóa gói xét nghiệm thành công' };
    } catch (error) {
      return { success: false, message: 'Lỗi xóa gói xét nghiệm' };
    }
  },

  // Cập nhật giá dịch vụ
  // Swagger: PUT /TestOrder/TestPackage/{id}
  updateServicePrice: async (id, price) => {
    try {
      const response = await api.put(`/gateway/testorder/testpackage/${id}`, { price });
      const data = response.data?.data || response.data;
      return { success: true, data: data };
    } catch (error) {
      return { success: false, message: 'Lỗi cập nhật giá gói xét nghiệm' };
    }
  },

  // Kích hoạt/vô hiệu hóa dịch vụ
  // Swagger: PUT /TestOrder/TestPackage/{id}
  toggleServiceStatus: async (id) => {
    try {
      // Fetch current service object so we can PUT a full payload (not only status fields)
      // Use the service-level GET helper (same approach as the detail view)
      const serviceResp = await medicalService.getServiceById(id);
      const currentService = (serviceResp && serviceResp.success) ? serviceResp.data : {};
      const currentStatus = !!(currentService.isActive || (String(currentService.status || '').toLowerCase() === 'active'));

      // Try to load the full set of criteria for this package first (to avoid missing data)
      // Prefer the explicit package criteria path then the generic helper, matching the edit modal behavior.
      let criteriaList = null;
      try {
        const pkgId = id || currentService?.id || currentService?.packageId || currentService?.PackageId || currentService?.package_id || currentService?.id;
        if (pkgId) {
          let critResp = { success: false };
          try {
            if (typeof testOrderService.getPackageCriteriaById === 'function') {
              critResp = await testOrderService.getPackageCriteriaById(pkgId);
            }
          } catch (e) { /* ignore and fallback */ }

          if ((!critResp || !critResp.success) && typeof testOrderService.getCriteriaForPackage === 'function') {
            try {
              critResp = await testOrderService.getCriteriaForPackage(pkgId);
            } catch (e) { /* ignore */ }
          }

          if (critResp && critResp.success && Array.isArray(critResp.data)) {
            // Map data items to ids (may be objects or primitives)
            criteriaList = critResp.data.map(c => {
              if (c === null || c === undefined) return null;
              if (typeof c === 'string' || typeof c === 'number') return String(c);
              const idVal = c.criteriaId ?? c.criteria_id ?? c.id ?? c.testCriterionId ?? c.criterionId ?? c.value ?? c.code;
              if (idVal === null || idVal === undefined) return null;
              return String(idVal);
            }).filter(Boolean);
            // Note: criteriaList may be an empty array (meaning the package currently has no criteria).
          }
        }
      } catch (e) {
        // ignore fetch error; we'll fallback to reading from the currentService object below
      }

      // If we couldn't fetch via the package-criteria endpoint(s), fall back to reading fields on the service object
      if (criteriaList === null) {
        if (Array.isArray(currentService.criteriaIds) && currentService.criteriaIds.length >= 0) criteriaList = currentService.criteriaIds;
        else if (Array.isArray(currentService.CriteriaIds) && currentService.CriteriaIds.length >= 0) criteriaList = currentService.CriteriaIds;
        else if (Array.isArray(currentService.criteria) && currentService.criteria.length >= 0) criteriaList = currentService.criteria;
        else if (Array.isArray(currentService.testCriteria) && currentService.testCriteria.length >= 0) criteriaList = currentService.testCriteria;
        // if still null, we'll leave it null and omit the field from payload to avoid accidental deletion
      }

      // Normalize criteriaList to an array of string ids regardless of source shape (objects or primitives)
      if (Array.isArray(criteriaList)) {
        criteriaList = criteriaList.map(item => {
          if (item === null || item === undefined) return null;
          if (typeof item === 'string' || typeof item === 'number') return String(item);
          // try common id keys on object forms
          const idVal = item.criteriaId ?? item.criteria_id ?? item.id ?? item.testCriterionId ?? item.criterionId ?? item.test_criterion_id ?? item.criterion_id ?? item.value ?? item.code;
          if (idVal === null || idVal === undefined) return null;
          return String(idVal);
        }).filter(Boolean);
      }

      // Build payload: start from the fetched service object so we preserve unknown fields
      // This prevents accidental deletion of links when backend expects the full object.
      const payload = { ...(currentService || {}) };

      // Ensure canonical fields exist (camelCase) and normalize types
      payload.packageName = currentService.packageName || currentService.PackageName || currentService.name || currentService.Name || payload.packageName || '';
      payload.description = currentService.description || currentService.Description || payload.description || '';
      if (currentService.price !== undefined && currentService.price !== null) payload.price = Number(currentService.price);
      else if (currentService.Price !== undefined) payload.price = Number(currentService.Price);
      else if (payload.price !== undefined && payload.price !== null) payload.price = Number(payload.price);
      else payload.price = payload.price || 0;
      payload.status = !currentStatus ? 'ACTIVE' : 'INACTIVE';

      // If we explicitly resolved criteriaList earlier (including empty array), use it.
      // Otherwise try to preserve existing identifiers that may already be on the payload
      let existingIds = [];
      try {
        const raw = currentService || {};
        const cand = raw.criteriaIds || raw.CriteriaIds || raw.criteria || raw.testCriteria || raw.packageCriteria || raw.criteria_ids || raw.test_criteria || raw.test_criteria_ids || raw.package_criteria;
        if (Array.isArray(cand) && cand.length > 0) existingIds = cand;
      } catch (e) { existingIds = []; }

      const toIdString = (i) => {
        if (i === null || i === undefined) return null;
        if (typeof i === 'string' || typeof i === 'number') return String(i);
        const idVal = i.criteriaId ?? i.criteria_id ?? i.id ?? i.testCriterionId ?? i.criterionId ?? i.test_criterion_id ?? i.criterion_id ?? i.value ?? i.code;
        if (idVal === null || idVal === undefined) return null;
        return String(idVal);
      };

      // Normalize existingIds
      existingIds = Array.isArray(existingIds) ? existingIds.map(toIdString).filter(Boolean) : [];

      let finalIds = [];
      if (Array.isArray(criteriaList)) finalIds = criteriaList.slice();
      else if (Array.isArray(payload.criteriaIds)) finalIds = (payload.criteriaIds || []).map(toIdString).filter(Boolean);
      else if (Array.isArray(payload.criteria)) finalIds = (payload.criteria || []).map(toIdString).filter(Boolean);

      // Merge with existingIds to avoid accidental loss — prefer the largest set available
      const merged = new Set([...existingIds, ...finalIds]);
      // If merged is empty but existingIds had values, use existingIds
      if (merged.size === 0 && existingIds.length > 0) payload.criteriaIds = existingIds;
      else payload.criteriaIds = Array.from(merged);

      // Debug payload so we can inspect what's being sent (helps reproduce "criteria dropped" issues)

      // Use the same update flow as the edit button to ensure behavior is identical
      const resp = await medicalService.updateService(id, payload);
      if (resp && resp.success) return { success: true, data: resp.data };
      // If updateService failed but didn't throw, return its message
      return { success: false, message: resp?.message || 'Lỗi cập nhật trạng thái gói xét nghiệm' };
    } catch (error) {
      return { success: false, message: 'Lỗi cập nhật trạng thái gói xét nghiệm' };
    }
  }
};
