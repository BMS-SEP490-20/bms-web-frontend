/**
 * Test Order Service
 *
 * Consolidated wrapper for TestOrder endpoints proxied by gateway and warehouse endpoints
 */
import api from '../config/api';

const testOrderService = {
  _toArray(data) {
    if (!data) return [];
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.items)) return data.items;
    if (Array.isArray(data?.data)) return data.data;
    if (Array.isArray(data?.records)) return data.records;
    if (Array.isArray(data?.result)) return data.result;
    return [];
  },

  getTestParameters: async (id) => {
    try {
      if (!id) return { success: false, message: 'Missing id' };
      const response = await api.get(`/gateway/testorder/testparameter/${id}`);
      const data = response.data?.data || response.data || [];
      return { success: true, data: Array.isArray(data) ? data : [data] };
    } catch (error) {
      return { success: false, message: 'Lỗi lấy thông số xét nghiệm' };
    }
  },

  getTestPackage: async (id) => {
    try {
      if (!id) return { success: false, message: 'Missing id' };
      const resp = await api.get(`/gateway/testorder/testpackage/${id}`);
      const data = resp.data?.data || resp.data || null;
      try {
      } catch (e) { }
      return { success: true, data, raw: resp.data };
    } catch (error) {
      return { success: false, message: 'Lỗi lấy test package' };
    }
  },

  getTestPackages: async () => {
    try {
      const resp = await api.get('/gateway/testorder/testpackage');

      const data = Array.isArray(resp.data)
        ? resp.data
        : (Array.isArray(resp.data?.data) ? resp.data.data : []);
      try {
      } catch (e) { }
      return { success: true, data, raw: resp.data };
    } catch (error) {
      return { success: false, message: 'Lỗi lấy danh sách gói xét nghiệm', data: [] };
    }
  },

  getAllTestPackages: async (options = {}) => {
    try {
      const pageSize = options.fetchAll ? 1000 : 20;

      const resp = await api.get('/gateway/testorder/testpackage', {
        params: { page: 1, pageSize: pageSize }
      });

      const data = Array.isArray(resp.data) ? resp.data : (resp.data?.data || []);

      return { success: true, data: data, raw: resp };
    } catch (e) {
      return { success: false, message: 'Lỗi lấy danh sách gói xét nghiệm', data: [] };
    }
  },

  getAllTestPackageCriteria: async (options = {}) => {
    try {
      const resp = await api.get('/gateway/testorder/testpackagecriterion', { params: options.params || {} });
      let data = testOrderService._toArray(resp.data);

      if (options.fetchAll) {
        try {
          const collected = [];
          let page = 1;
          const respPageSize = Number(resp.data?.pageSize || resp.data?.page_size || 0) || (Array.isArray(data) ? data.length : 0) || 50;
          while (true) {
            const pagedResp = await api.get('/gateway/testorder/testpackagecriterion', { params: { page, pageSize: respPageSize } });
            const pageData = testOrderService._toArray(pagedResp.data);
            if (!pageData || pageData.length === 0) break;
            for (const it of pageData) collected.push(it);
            if (pageData.length < respPageSize) break;
            page += 1;
            if (page > 200) break;
          }
          return { success: true, data: collected, raw: resp.data };
        } catch (e) {
        }
      }

      if (!data || data.length === 0) {
        data = testOrderService._toArray(resp.data?.data);
      }

      try {
      } catch (e) { }
      return { success: true, data, raw: resp.data };
    } catch (error) {
      return { success: false, message: 'Lỗi lấy test package criteria', data: [] };
    }
  },

  getTestPackageCriteria: async (packageId, options = {}) => {
    try {
      if (!packageId) return { success: false, message: 'Missing packageId' };
      const paramCandidates = ['test_package_id', 'testPackageId', 'packageId', 'package_id'];
      for (const paramName of paramCandidates) {
        try {
          if (options.fetchAll) {
            const collected = [];

            const probeResp = await api.get('/gateway/testorder/testpackagecriterion', { params: { [paramName]: packageId, page: 1 } });
            let probeData = testOrderService._toArray(probeResp.data);
            if ((!probeData || probeData.length === 0) && Array.isArray(probeResp.data?.data)) probeData = probeResp.data.data;
            const respPageSize = Number(probeResp.data?.pageSize || probeResp.data?.page_size || 0) || (Array.isArray(probeData) ? probeData.length : 0) || 50;
            let page = 1;
            while (true) {
              const resp = await api.get('/gateway/testorder/testpackagecriterion', { params: { [paramName]: packageId, page, pageSize: respPageSize } });
              let pageData = testOrderService._toArray(resp.data);
              if ((!pageData || pageData.length === 0) && Array.isArray(resp.data?.data)) pageData = resp.data.data;
              if (!pageData || pageData.length === 0) break;
              for (const it of pageData) collected.push(it);
              if (pageData.length < respPageSize) break;
              page += 1;
              if (page > 200) break;
            }
            return { success: true, data: collected, raw: probeResp.data, source: 'filtered-paged', paramName };
          }

          const params = {};
          params[paramName] = packageId;
          const resp = await api.get('/gateway/testorder/testpackagecriterion', { params });
          let data = testOrderService._toArray(resp.data);
          if (!data || data.length === 0) data = testOrderService._toArray(resp.data?.data);

          try {
          } catch (e) { }
          return { success: true, data, raw: resp.data, source: 'filtered', paramName };
        } catch (err) {
        }
      }

      const pathCandidates = [
        `/gateway/testorder/testpackagecriterion/${packageId}/criteria`,
        `/gateway/testorder/testpackage/${packageId}/criteria`,
        `/gateway/testorder/testpackagecriterion/${packageId}`
      ];
      for (const path of pathCandidates) {
        try {
          if (options.fetchAll) {
            const collected = [];

            const probeResp = await api.get(path, { params: { page: 1 } });
            let probeData = testOrderService._toArray(probeResp.data);
            if ((!probeData || probeData.length === 0) && Array.isArray(probeResp.data?.data)) probeData = probeResp.data.data;
            const respPageSize = Number(probeResp.data?.pageSize || probeResp.data?.page_size || 0) || (Array.isArray(probeData) ? probeData.length : 0) || 50;
            let page = 1;
            while (true) {
              const resp = await api.get(path, { params: { page, pageSize: respPageSize } });
              let pageData = testOrderService._toArray(resp.data);
              if ((!pageData || pageData.length === 0) && Array.isArray(resp.data?.data)) pageData = resp.data.data;
              if (!pageData || pageData.length === 0) break;
              for (const it of pageData) collected.push(it);
              if (pageData.length < respPageSize) break;
              page += 1;
              if (page > 200) break;
            }
            return { success: true, data: collected, raw: probeResp.data, source: 'path-paged', path };
          }

          const resp = await api.get(path);
          let data = testOrderService._toArray(resp.data);
          if (!data || data.length === 0) data = testOrderService._toArray(resp.data?.data);
          return { success: true, data, raw: resp.data, source: 'path', path };
        } catch (err) {
        }
      }

      return { success: false, message: 'Filtered package-criteria not available (all param attempts failed)', source: 'filtered-failed' };
    } catch (error) {
      return { success: false, message: 'Filtered package-criteria not available', source: 'filtered-error' };
    }
  },

  getPackageCriteriaById: async (packageId) => {
    try {
      if (!packageId) return { success: false, message: 'Missing packageId' };
      const resp = await api.get(`/gateway/testorder/testpackage/${packageId}/criteria`);
      let data = testOrderService._toArray(resp.data);
      if (!data || data.length === 0) data = testOrderService._toArray(resp.data?.data);
      return { success: true, data, raw: resp.data, source: 'package-criteria-path' };
    } catch (error) {
      return { success: false, message: 'package criteria path not available' };
    }
  },

  getTestCriterion: async (id) => {
    try {
      if (!id) return { success: false, message: 'Missing id' };
      const resp = await api.get(`/gateway/testorder/testcriterion/${id}`);
      const data = resp.data?.data || resp.data || null;
      try {
      } catch (e) { }
      return { success: true, data, raw: resp.data };
    } catch (error) {
      return { success: false, message: 'Lỗi lấy test criterion' };
    }
  },

  getAllTestCriteria: async (options = {}) => {
    try {
      const resp = await api.get('/gateway/testorder/testcriterion', { params: options.params || {} });
      let data = testOrderService._toArray(resp.data);

      if (options.fetchAll) {
        try {
          const collected = [];
          let page = 1;

          const respPageSize = Number(resp.data?.pageSize || resp.data?.page_size || resp.data?.pageSize || 0) || (Array.isArray(data) ? data.length : 0) || 50;
          while (true) {
            const pagedResp = await api.get('/gateway/testorder/testcriterion', { params: { page, pageSize: respPageSize } });
            const pageData = testOrderService._toArray(pagedResp.data);
            if (!pageData || pageData.length === 0) break;
            for (const it of pageData) collected.push(it);

            if (pageData.length < respPageSize) break;
            page += 1;
            if (page > 200) break;
          }
          return { success: true, data: collected, raw: resp.data };
        } catch (e) {
        }
      }

      if ((!data || data.length === 0) && Array.isArray(resp.data?.data)) {
        return { success: true, data: resp.data.data, raw: resp.data };
      }
      return { success: true, data, raw: resp.data };
    } catch (error) {
      return { success: false, message: 'Lỗi lấy danh sách tiêu chí', data: [] };
    }
  },

  getCriteriaForPackage: async (packageId) => {
    try {
      if (!packageId) return { success: false, message: 'Missing packageId' };

      let triedFiltered = false;
      let pkRes = { success: false };
      try {
        triedFiltered = true;

        pkRes = await testOrderService.getTestPackageCriteria(packageId, { fetchAll: true }).catch(() => ({ success: false }));
      } catch (e) {
        pkRes = { success: false };
      }
      let sourceUsed = 'none';

      if (pkRes && pkRes.success && Array.isArray(pkRes.data) && pkRes.data.length > 0) {
        sourceUsed = pkRes.source || 'filtered';
      } else {
        pkRes = await testOrderService.getAllTestPackageCriteria({ fetchAll: true }).catch(() => ({ success: false }));
        sourceUsed = 'all';
      }
      if (!pkRes.success) {
        return { success: false, message: 'No package-criteria data' };
      }
      const links = pkRes.data || [];
      try {
      } catch (e) { }

      if ((!links || links.length === 0) && pkRes.raw) {
        try {
        } catch (e) { }
      }

      const norm = (v) => (v === undefined || v === null) ? '' : String(v).trim();
      const normUpper = (v) => norm(v).toUpperCase();

      const pkgIdNorm = normUpper(packageId);
      const normalizeForCompare = v => (v === undefined || v === null) ? '' : String(v).replace(/[^a-z0-9]/gi, '').toUpperCase();
      const digitsOnly = (v) => (String(v || '').match(/\d+/) || [''])[0];

      const candidates = new Set();
      candidates.add(normalizeForCompare(packageId));
      candidates.add(pkgIdNorm);
      const pkgDigits = digitsOnly(packageId);
      if (pkgDigits) {
        candidates.add(pkgDigits);
        candidates.add(('P' + pkgDigits).toUpperCase());
      }

      const extractPkgId = (link) => {
        const cands = [
          link.testPackageId, link.TestPackageId, link.packageId, link.PackageId, link.test_package_id, link.package_id,
          link.PACKAGEID, link.TestPackageID, link['test_package_id'], link['testpackageid']
        ];
        for (const c of cands) {
          const n = normUpper(c);
          if (n) return n;
        }
        return '';
      };

      const extractCritId = (link) => {
        const cands = [
          link.testCriterionId, link.TestCriterionId, link.testCriteriaId, link.TestCriteriaId,
          link.criterionId, link.CriterionId, link.criterion_id, link.test_criterion_id, link.test_criteria_id,
          link.TESTCRITERIONID, link.id, link['test_criteria_id']
        ];
        for (const c of cands) {
          const n = norm(c);
          if (n) return n;
        }
        return '';
      };

      let related = links.filter(l => extractPkgId(l) === pkgIdNorm);

      if (related.length === 0) {
        try {
          const candArr = Array.from(candidates).filter(Boolean);
          related = links.filter(l => {
            try {
              const raw = extractPkgId(l);
              const n = normalizeForCompare(raw);
              return candArr.some(c => c && n === c);
            } catch (e) { return false; }
          });
        } catch (e) { }
      }

      try {
        const critIds = related.map(extractCritId).filter(Boolean);
      } catch (e) { }

      if (related.length === 0) {
        try {
          const pkListRes = await testOrderService.getTestPackages();
          if (pkListRes.success && Array.isArray(pkListRes.data)) {
            const pkgCandidates = pkListRes.data;
            const lowerPkgId = String(packageId || '').toLowerCase();
            const found = pkgCandidates.find(p => {
              const idVals = [p.packageId, p.package_id, p.id, p.code, p.packageCode, p.name, p.packageName, p.title];
              return idVals.some(v => v && String(v).toLowerCase() === lowerPkgId);
            });
            if (found) {
              const foundId = normUpper(found.packageId || found.id || found.package_id || found.code || found.packageCode || found.name);
              related = links.filter(l => extractPkgId(l) === foundId);

              try {
                const foundNorm = normalizeForCompare(foundId);
                candidates.add(foundNorm);
                const extra = links.filter(l => normalizeForCompare(extractPkgId(l)) === foundNorm);
                if (extra.length > 0) {
                  related = related.concat(extra);
                }
              } catch (e) { }
            }
          }
        } catch (e) {
        }
      }

      if (related.length === 0) {
        const targetLower = String(packageId || '').toLowerCase();
        related = links.filter(l => {
          try {
            const vals = [
              l.test_package_id, l.testPackageId, l.TestPackageId, l.packageId, l.package_id, l.PackageId,
              l.packageName, l.package_name, l.package, l.service, l.serviceName
            ];
            return vals.some(v => v && String(v).toLowerCase() === targetLower);
          } catch (e) {
            return false;
          }
        });
      }

      if (related.length === 0) {
        try {
          const pkgResp = await testOrderService.getTestPackage(packageId).catch(() => null);
          const pkgObj = pkgResp && pkgResp.success ? pkgResp.data : null;
          const pkgName = pkgObj && (pkgObj.name || pkgObj.packageName || pkgObj.title || pkgObj.package_name);
          const pkgNameNorm = normalizeForCompare(pkgName);
          if (pkgNameNorm) {
            const byName = links.filter(l => {
              try {
                const vals = [l.packageName, l.name, l.test_package_name, l.testPackageName, l.package_name, l.title];
                return vals.some(v => v && normalizeForCompare(v) === pkgNameNorm);
              } catch (e) { return false; }
            });
            if (byName.length > 0) {
              related = byName;
            }
          }
        } catch (e) { }
      }

      if (related.length === 0) return { success: true, data: [] };

      const critIds = Array.from(new Set(related.map(extractCritId).filter(Boolean)));

      const fetchCriterionVariants = async (rawId) => {
        if (!rawId) return null;
        const asStr = String(rawId || '').trim();
        const digits = (asStr.match(/\d+/) || [''])[0];
        const variants = [asStr, asStr.toUpperCase(), asStr.replace(/^CRI/i, ''), digits, ('CRI' + digits)];
        const tried = new Set();
        for (const v of variants) {
          if (!v) continue;
          if (tried.has(v)) continue;
          tried.add(v);
          try {
            const res = await testOrderService.getTestCriterion(v).catch(() => ({ success: false }));
            if (res && res.success && res.data) {
              return res.data;
            }
          } catch (e) {
          }
        }
        return null;
      };

      const promises = critIds.map(id => fetchCriterionVariants(id));
      const settled = await Promise.all(promises);
      const criteria = settled.filter(Boolean);
      try {
      } catch (e) { }
      return { success: true, data: criteria };
    } catch (error) {
      return { success: false, message: 'Lỗi lấy tiêu chí cho gói xét nghiệm' };
    }
  },

  getResultsByAppointment: async (appointmentId) => {
    try {
      if (!appointmentId) return { success: false, message: 'Missing appointmentId' };
      const response = await api.get(`/gateway/testorder/testresult/by-appointment/${appointmentId}`);
      const data = response.data?.data || response.data || [];
      return { success: true, data: Array.isArray(data) ? data : [data] };
    } catch (error) {
      const status = error?.response?.status;

      if (status === 404) {
        return { success: true, data: [] };
      }
      return { success: false, status, message: error.response?.data?.message || 'Lỗi lấy kết quả theo lịch hẹn' };
    }
  },

  getAllTestResults: async (options = {}) => {
    try {
      const resp = await api.get('/gateway/testorder/testresult', { params: options.params || {} });
      let data = testOrderService._toArray(resp.data);

      if (options.fetchAll) {
        try {
          const collected = [];
          let page = 1;
          const respPageSize = Number(resp.data?.pageSize || resp.data?.page_size || 0) || (Array.isArray(data) ? data.length : 0) || 50;
          while (true) {
            const pagedResp = await api.get('/gateway/testorder/testresult', { params: { page, pageSize: respPageSize } });
            const pageData = testOrderService._toArray(pagedResp.data);
            if (!pageData || pageData.length === 0) break;
            for (const it of pageData) collected.push(it);
            if (pageData.length < respPageSize) break;
            page += 1;
            if (page > 200) break;
          }
          return { success: true, data: collected, raw: resp.data };
        } catch (e) {
        }
      }

      return { success: true, data };
    } catch (error) {
      return { success: false, message: 'Lỗi lấy tất cả kết quả xét nghiệm', data: [] };
    }
  },

  createTestResult: async (payload) => {
    try {
      const response = await api.post('/gateway/testorder/testresult', payload);
      const data = response.data?.data || response.data;
      return { success: true, data };
    } catch (error) {
      const status = error?.response?.status;
      const raw = error?.response?.data;

      return { success: false, message: raw?.message || 'Lỗi tạo kết quả xét nghiệm', status, raw };
    }
  },

  updateTestResult: async (id, payload) => {
    try {
      if (!id) return { success: false, message: 'Missing test result id' };

      const currentRes = await testOrderService.getTestResult(id);
      const currentData = currentRes.success ? (currentRes.data || {}) : {};

      const updatedData = {
        ...currentData,
        ...payload,

        id: id,
        testResultId: id
      };

      const response = await api.put(`/gateway/testorder/testresult/${id}`, updatedData);
      const data = response.data?.data || response.data;
      return { success: true, data };
    } catch (error) {
      return { success: false, message: 'Lỗi cập nhật kết quả xét nghiệm' };
    }
  },

  deleteTestResult: async (id) => {
    try {
      if (!id) return { success: false, message: 'Missing test result id' };
      const response = await api.delete(`/gateway/testorder/testresult/${id}`);
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, message: 'Lỗi xóa kết quả xét nghiệm' };
    }
  },

  getTestResult: async (id) => {
    try {
      if (!id) return { success: false, message: 'Missing test result id' };
      const response = await api.get(`/gateway/testorder/testresult/${id}`);
      const data = response.data?.data || response.data;
      return { success: true, data };
    } catch (error) {
      return { success: false, message: 'Lỗi lấy kết quả xét nghiệm' };
    }
  },

  getAllTestParameters: async (options = {}) => {
    try {
      const resp = await api.get('/gateway/testorder/testparameter', { params: options.params || {} });
      let data = testOrderService._toArray(resp.data);

      if (options.fetchAll) {
        try {
          const collected = [];
          let page = 1;
          const respPageSize = Number(resp.data?.pageSize || resp.data?.page_size || 0) || (Array.isArray(data) ? data.length : 0) || 50;
          while (true) {
            const pagedResp = await api.get('/gateway/testorder/testparameter', { params: { page, pageSize: respPageSize } });
            const pageData = testOrderService._toArray(pagedResp.data);
            if (!pageData || pageData.length === 0) break;
            for (const it of pageData) collected.push(it);
            if (pageData.length < respPageSize) break;
            page += 1;
            if (page > 200) break;
          }
          return { success: true, data: collected, raw: resp.data };
        } catch (e) {
        }
      }

      return { success: true, data };
    } catch (error) {
      return { success: false, message: 'Lỗi lấy tất cả thông số xét nghiệm', data: [] };
    }
  },

  getTestParametersByResultId: async (testResultId) => {
    try {
      if (!testResultId) return { success: false, message: 'Missing testResultId' };

      try {
        const resp = await api.get(`/gateway/testorder/testparameter/by-testresult/${testResultId}`);
        const data = testOrderService._toArray(resp.data);
        if (Array.isArray(data) && data.length > 0) {
          return { success: true, data, raw: resp.data, source: 'by-testresult' };
        }
      } catch (err) {
      }

      try {
        const res = await testOrderService.getTestResult(testResultId);
        if (res.success && res.data) {
          const resultData = res.data;

          const params = resultData.testParameters || resultData.parameters || resultData.details || resultData.results || [];
          if (Array.isArray(params) && params.length > 0) {
            return { success: true, data: params, source: 'from-testresult' };
          }
        }
      } catch (e) {
      }

      return { success: true, data: [], message: 'No parameters found' };
    } catch (error) {
      return { success: false, message: 'Lỗi lấy thông số xét nghiệm theo result ID', data: [] };
    }
  },

  getReagents: async () => {
    try {
      const resp = await api.get('/reagents', { params: { pageSize: 100 } });

      let raw = testOrderService._toArray(resp.data);
      if (!raw || raw.length === 0) raw = testOrderService._toArray(resp.data?.data);
      if (!raw || raw.length === 0) raw = testOrderService._toArray(resp.data?.items);

      const data = (raw || []).map(item => ({
        id: item.id || item.reagentId || item.reagent_id || item.code || item.itemId || item.productId || '',
        code: item.code || item.reagentCode || item.reagent_code || item.barcode || item.sku || '',
        name: item.name || item.reagentName || item.reagent_name || item.displayName || item.productName || item.description || '',
        raw: item
      }));
      return { success: true, data };
    } catch (error) {
      return { success: false, message: 'Lỗi lấy danh sách thuốc thử', data: [] };
    }
  },

  getDevices: async () => {
    try {
      const resp = await api.get('/gateway/warehouse/equipment');
      let raw = testOrderService._toArray(resp.data);
      if (!raw || raw.length === 0) raw = testOrderService._toArray(resp.data?.data);
      if (!raw || raw.length === 0) raw = testOrderService._toArray(resp.data?.items);
      const data = (raw || []).map(item => ({
        id: item.id || item.equipmentId || item.equipment_id || item.code || item.deviceId || item.productId || '',

        code: item.code || item.equipmentCode || item.equipment_code || item.codeManufacturer || item.code_manufacturer || item.barcode || item.sku || '',

        name: item.name || item.equipmentName || item.equipment_name || item.displayName || item.productName || item.description || '',
        manufacturer: item.manufacturer || item.manufacturerName || item.mfg || null,
        raw: item
      }));
      return { success: true, data };
    } catch (error) {
      return { success: false, message: 'Lỗi lấy danh sách thiết bị', data: [] };
    }
  },

  /**
   * Retrieves all laboratory rooms from the backend.
   * Feature Task: View Lab Rooms (Web).
   *
   * @description Fetches all configured lab rooms, supporting optional pagination and full fetch across pages.
   * @param {Object} [options={}] - Options for querying.
   * @param {boolean} [options.fetchAll=false] - Whether to fetch all pages sequentially.
   * @param {Object} [options.params={}] - Additional query parameters.
   * @returns {Promise<{success: boolean, data: Array, raw?: Object, message?: string}>} List of lab room objects.
   *
   * @example
   * const res = await testOrderService.getAllLabRooms({ fetchAll: true });
   */
  getAllLabRooms: async (options = {}) => {
    try {
      const resp = await api.get('/gateway/testorder/labroom', { params: options.params || {} });
      let data = testOrderService._toArray(resp.data);

      if (options.fetchAll) {
        try {
          const collected = [];
          let page = 1;
          const respPageSize = Number(resp.data?.pageSize || resp.data?.page_size || 0) || (Array.isArray(data) ? data.length : 0) || 50;
          while (true) {
            const pagedResp = await api.get('/gateway/testorder/labroom', { params: { page, pageSize: respPageSize } });
            const pageData = testOrderService._toArray(pagedResp.data);
            if (!pageData || pageData.length === 0) break;
            for (const it of pageData) collected.push(it);
            if (pageData.length < respPageSize) break;
            page += 1;
            if (page > 200) break;
          }
          return { success: true, data: collected, raw: resp.data };
        } catch (e) {
        }
      }

      return { success: true, data };
    } catch (error) {
      try {
        const fallbackResp = await api.get('/laboratory/rooms');
        const fallbackData = testOrderService._toArray(fallbackResp.data);
        return { success: true, data: fallbackData };
      } catch (fbErr) {
        return { success: false, message: 'Lỗi lấy danh sách phòng lab', data: [] };
      }
    }
  },

  /**
   * Retrieves single laboratory room details by ID.
   * Feature Task: View Lab Rooms (Web).
   *
   * @param {string} id - The unique identifier of the lab room.
   * @returns {Promise<{success: boolean, data?: Object, message?: string}>} Lab room details object.
   *
   * @example
   * const res = await testOrderService.getLabRoomById('LR001');
   */
  getLabRoomById: async (id) => {
    try {
      if (!id) return { success: false, message: 'Missing id' };
      const resp = await api.get(`/gateway/testorder/labroom/${id}`);
      const data = resp.data?.data || resp.data;
      return { success: true, data };
    } catch (error) {
      return { success: false, message: 'Lỗi lấy thông tin phòng lab' };
    }
  },

  getAllLabRoomsGateway: async () => {
    try {
      const resp = await api.get('/gateway/testorder/lab-rooms');
      const data = testOrderService._toArray(resp.data);
      return { success: true, data, raw: resp.data };
    } catch (error) {
      return { success: false, message: 'Lỗi lấy danh sách phòng lab (gateway)', data: [] };
    }
  },

  getLabRoomByIdGateway: async (id) => {
    try {
      if (!id) return { success: false, message: 'Missing id' };
      const resp = await api.get(`/gateway/testorder/lab-rooms/${id}`);
      const data = resp.data?.data || resp.data;
      return { success: true, data, raw: resp.data };
    } catch (error) {
      return { success: false, message: 'Lỗi lấy phòng lab (gateway)' };
    }
  },

  /**
   * Creates a new laboratory room in the system.
   * Feature Task: Create Lab Rooms (Web).
   *
   * @description Sends a POST request to create a new laboratory room with capacity, room number, and department.
   * @param {Object} data - Lab room creation payload.
   * @param {string} data.RoomName - The name of the room.
   * @param {string} data.RoomNumber - The room number/code.
   * @param {string} [data.Department] - Department name.
   * @param {number} [data.MaxCapacity] - Maximum room capacity.
   * @returns {Promise<{success: boolean, data?: Object, message?: string}>} Response payload.
   *
   * @example
   * const res = await testOrderService.createLabRoom({ RoomName: 'Biochemistry Lab', RoomNumber: 'P201' });
   */
  createLabRoom: async (data) => {
    try {
      const resp = await api.post('/gateway/testorder/labroom', data);
      return { success: true, data: resp.data };
    } catch (error) {
      return { success: false, message: error.response?.data?.message || 'Lỗi tạo phòng lab' };
    }
  },

  /**
   * Updates an existing laboratory room's attributes.
   * Feature Task: Update Lab Rooms (Web).
   *
   * @description Sends a PUT request to modify lab room properties (e.g. status, capacity, room name).
   * @param {string} id - The unique ID of the lab room to update.
   * @param {Object} data - The updated room fields.
   * @returns {Promise<{success: boolean, data?: Object, message?: string}>} Response payload.
   *
   * @example
   * const res = await testOrderService.updateLabRoom('LR001', { Status: 'Active', MaxCapacity: 15 });
   */
  updateLabRoom: async (id, data) => {
    try {
      const resp = await api.put(`/gateway/testorder/labroom/${id}`, data);
      return { success: true, data: resp.data };
    } catch (error) {
      return { success: false, message: error.response?.data?.message || 'Lỗi cập nhật phòng lab' };
    }
  },

  /**
   * Deletes a laboratory room from the system.
   * Feature Task: Delete Lab Rooms (Web).
   *
   * @description Sends a DELETE request to remove a laboratory room by ID.
   * @param {string} id - The unique ID of the room to delete.
   * @returns {Promise<{success: boolean, data?: Object, message?: string}>} Response payload.
   *
   * @example
   * const res = await testOrderService.deleteLabRoom('LR001');
   */
  deleteLabRoom: async (id) => {
    try {
      const resp = await api.delete(`/gateway/testorder/labroom/${id}`);
      return { success: true, data: resp.data };
    } catch (error) {
      return { success: false, message: error.response?.data?.message || 'Lỗi xóa phòng lab' };
    }
  },

  getAllDoctorRooms: async () => {
    try {
      const resp = await api.get('/gateway/testorder/doctorroom');
      const data = testOrderService._toArray(resp.data);
      return { success: true, data };
    } catch (error) {
      return { success: false, message: 'Lỗi lấy danh sách phòng khám', data: [] };
    }
  },

  getDoctorRoomById: async (id) => {
    try {
      if (!id) return { success: false, message: 'Missing id' };
      const resp = await api.get(`/gateway/testorder/doctorroom/${id}`);
      const data = resp.data?.data || resp.data;
      return { success: true, data };
    } catch (error) {
      return { success: false, message: 'Lỗi lấy thông tin phòng khám' };
    }
  },

  getAllDoctorRoomsGateway: async (options = {}) => {
    try {
      const resp = await api.get('/gateway/testorder/doctor-rooms', { params: options.params || {} });
      let data = testOrderService._toArray(resp.data);

      if (options.fetchAll) {
        try {
          const collected = [];
          let page = 1;
          const respPageSize = Number(resp.data?.pageSize || resp.data?.page_size || 0) || (Array.isArray(data) ? data.length : 0) || 50;
          while (true) {
            const pagedResp = await api.get('/gateway/testorder/doctor-rooms', { params: { page, pageSize: respPageSize } });
            const pageData = testOrderService._toArray(pagedResp.data);
            if (!pageData || pageData.length === 0) break;
            for (const it of pageData) collected.push(it);
            if (pageData.length < respPageSize) break;
            page += 1;
            if (page > 200) break;
          }
          return { success: true, data: collected, raw: resp.data };
        } catch (e) {
        }
      }

      return { success: true, data, raw: resp.data };
    } catch (error) {
      return { success: false, message: 'Lỗi lấy danh sách phòng khám (gateway)', data: [] };
    }
  },

  getDoctorRoomByIdGateway: async (id) => {
    try {
      if (!id) return { success: false, message: 'Missing id' };
      const resp = await api.get(`/gateway/testorder/doctor-rooms/${id}`);
      const data = resp.data?.data || resp.data;
      return { success: true, data, raw: resp.data };
    } catch (error) {
      return { success: false, message: 'Lỗi lấy thông tin phòng khám (gateway)' };
    }
  },

  getAllLabAssignmentsGateway: async (options = { fetchAll: true }) => {
    try {
      const resp = await api.get('/gateway/testorder/lab-assignments', { params: options.params || {} });
      let data = testOrderService._toArray(resp.data);

      if (options.fetchAll) {
        try {
          const collected = [];
          const respPageSize = Number(resp.data?.pageSize || resp.data?.page_size || 0) || (Array.isArray(data) ? data.length : 0) || 50;
          const total = Number(resp.data?.total || resp.data?.Total || 0) || (Array.isArray(data) ? data.length : 0);

          const maxPage = total > 0 && respPageSize > 0 ? Math.ceil(total / respPageSize) : 1;

          if (data && data.length > 0) {
            for (const it of data) collected.push(it);
          }

          if (maxPage > 1) {
            for (let page = 2; page <= maxPage; page++) {
              try {
                const pagedResp = await api.get('/gateway/testorder/lab-assignments', { params: { page, pageSize: respPageSize } });
                const pageData = testOrderService._toArray(pagedResp.data);
                if (!pageData || pageData.length === 0) break;
                for (const it of pageData) collected.push(it);
                if (pageData.length < respPageSize) break;
              } catch (pageError) {
                if (pageError.response?.status === 404) {
                  break;
                }

                if (pageError.response?.status >= 400) {
                  break;
                }
                throw pageError;
              }

              if (page > 200) break;
            }
          }
          return { success: true, data: collected, raw: resp.data };
        } catch (e) {
        }
      }

      return { success: true, data, raw: resp.data };
    } catch (error) {
      if (error.response?.status === 404) {
        return { success: true, data: [], message: 'Không có dữ liệu phân công lab' };
      }
      return { success: false, message: 'Lỗi lấy danh sách phân công lab (gateway)', data: [] };
    }
  },

  getLabAssignmentByIdGateway: async (id) => {
    try {
      if (!id) return { success: false, message: 'Missing id' };
      const resp = await api.get(`/gateway/testorder/lab-assignments/${id}`);
      const data = resp.data?.data || resp.data;
      return { success: true, data, raw: resp.data };
    } catch (error) {
      return { success: false, message: 'Lỗi lấy phân công lab (gateway)' };
    }
  },

  createLabAssignmentGateway: async (payload) => {
    try {
      const resp = await api.post('/gateway/testorder/lab-assignments', payload);
      const data = resp.data?.data || resp.data;
      return { success: true, data, raw: resp.data };
    } catch (error) {
      return { success: false, message: 'Lỗi tạo phân công lab' };
    }
  },

  updateLabAssignmentGateway: async (id, payload) => {
    try {
      if (!id) return { success: false, message: 'Missing id' };
      const resp = await api.put(`/gateway/testorder/lab-assignments/${id}`, payload);
      const data = resp.data?.data || resp.data;
      return { success: true, data, raw: resp.data };
    } catch (error) {
      return { success: false, message: 'Lỗi cập nhật phân công lab' };
    }
  },

  deleteLabAssignmentGateway: async (id) => {
    try {
      if (!id) return { success: false, message: 'Missing id' };
      await api.delete(`/gateway/testorder/lab-assignments/${id}`);
      return { success: true, message: 'Xóa phân công lab thành công' };
    } catch (error) {
      return { success: false, message: 'Lỗi xóa phân công lab' };
    }
  },

  bulkCreateLabAssignmentsGateway: async (payload) => {
    try {
      const resp = await api.post('/gateway/testorder/lab-assignments/bulk', payload);
      const data = resp.data?.data || resp.data;
      return { success: true, data, raw: resp.data };
    } catch (error) {
      return { success: false, message: 'Lỗi tạo phân công lab hàng loạt' };
    }
  },

  getAllLabUserProfiles: async () => {
    const endpoints = [
      '/gateway/testorder/lab-user-profiles',
      '/gateway/testorder/labuserprofile',
      '/gateway/testorder/labuserprofiles'
    ];

    for (const ep of endpoints) {
      try {
        const resp = await api.get(ep);
        let data = testOrderService._toArray(resp.data);
        if ((!data || data.length === 0) && resp.data?.data) {
          data = testOrderService._toArray(resp.data.data);
        }
        if (data && data.length > 0) {
          return { success: true, data, raw: resp.data, endpoint: ep };
        }

        if (Array.isArray(resp.data) && resp.data.length === 0) {
          return { success: true, data: [], raw: resp.data, endpoint: ep };
        }
      } catch (error) {
      }
    }

    return { success: false, message: 'Lỗi lấy danh sách lab user', data: [] };
  },

  getAllLabUserProfilesGateway: async () => {
    try {
      const resp = await api.get('/gateway/testorder/lab-user-profiles');
      const data = testOrderService._toArray(resp.data);
      return { success: true, data, raw: resp.data };
    } catch (error) {
      return { success: false, message: 'Lỗi lấy danh sách lab user (gateway)', data: [] };
    }
  },

  getLabUserProfileById: async (id) => {
    try {
      if (!id) return { success: false, message: 'Missing id' };
      const resp = await api.get(`/gateway/testorder/labuserprofile/${id}`);
      const data = resp.data?.data || resp.data;
      return { success: true, data, raw: resp.data };
    } catch (error) {
      return { success: false, message: 'Lỗi lấy thông tin lab user' };
    }
  },

  getLabUserProfileByIdGateway: async (id) => {
    try {
      if (!id) return { success: false, message: 'Missing id' };
      const resp = await api.get(`/gateway/testorder/lab-user-profiles/${id}`);
      const data = resp.data?.data || resp.data;
      return { success: true, data, raw: resp.data };
    } catch (error) {
      return { success: false, message: 'Lỗi lấy thông tin lab user (gateway)' };
    }
  },

  getLabUserProfileByEmailGateway: async (email) => {
    try {
      if (!email) return { success: false, message: 'Missing email' };
      const resp = await api.get(`/gateway/testorder/lab-user-profiles/email/${encodeURIComponent(email)}`);
      const data = resp.data?.data || resp.data;
      return { success: true, data, raw: resp.data };
    } catch (error) {
      return { success: false, message: 'Lỗi lấy lab user theo email' };
    }
  },

  updateLabUserProfile: async (id, payload) => {
    try {
      if (!id) return { success: false, message: 'Missing id' };

      const resp = await api.put(`/gateway/testorder/lab-user-profiles/${id}`, payload);
      const data = resp.data?.data || resp.data;
      return { success: true, data, raw: resp.data };
    } catch (error) {
      return { success: false, message: 'Lỗi cập nhật hồ sơ lab user' };
    }
  },

  updateLabUserProfileByEmail: async (email, payload) => {
    try {
      if (!email) return { success: false, message: 'Missing email' };
      const resp = await api.put(`/gateway/testorder/lab-user-profiles/email/${encodeURIComponent(email)}`, payload);
      const data = resp.data?.data || resp.data;
      return { success: true, data, raw: resp.data };
    } catch (error) {
      return { success: false, message: 'Lỗi cập nhật hồ sơ lab user theo email' };
    }
  },

  getAllTestOrderComments: async () => {
    try {
      const resp = await api.get('/gateway/testorder/testordercomment');
      const data = testOrderService._toArray(resp.data);
      return { success: true, data };
    } catch (error) {
      return { success: false, message: 'Lỗi lấy danh sách ghi chú', data: [] };
    }
  },

  getTestOrderCommentById: async (id) => {
    try {
      if (!id) return { success: false, message: 'Missing id' };
      const resp = await api.get(`/gateway/testorder/testordercomment/${id}`);
      const data = resp.data?.data || resp.data;
      return { success: true, data };
    } catch (error) {
      return { success: false, message: 'Lỗi lấy ghi chú' };
    }
  },

  getTestOrderCommentsByAppointment: async (appointmentId) => {
    try {
      if (!appointmentId) return { success: false, message: 'Missing appointmentId' };
      const resp = await api.get(`/gateway/testorder/testordercomment/appointment/${appointmentId}`);
      const data = testOrderService._toArray(resp.data);
      return { success: true, data };
    } catch (error) {
      return { success: false, message: 'Lỗi lấy ghi chú theo lịch hẹn', data: [] };
    }
  },

  createTestOrderComment: async (payload) => {
    try {
      const resp = await api.post('/gateway/testorder/testordercomment', payload);
      const data = resp.data?.data || resp.data;
      return { success: true, data };
    } catch (error) {
      return { success: false, message: 'Lỗi tạo ghi chú mới' };
    }
  },

  updateTestOrderComment: async (id, payload) => {
    try {
      if (!id) return { success: false, message: 'Missing id' };
      const resp = await api.put(`/gateway/testorder/testordercomment/${id}`, payload);
      const data = resp.data?.data || resp.data;
      return { success: true, data };
    } catch (error) {
      return { success: false, message: 'Lỗi cập nhật ghi chú' };
    }
  },

  deleteTestOrderComment: async (id) => {
    try {
      if (!id) return { success: false, message: 'Missing id' };
      await api.delete(`/gateway/testorder/testordercomment/${id}`);
      return { success: true, message: 'Xóa ghi chú thành công' };
    } catch (error) {
      return { success: false, message: 'Lỗi xóa ghi chú' };
    }
  },

  getAllFlaggingConfigurations: async () => {
    try {
      const resp = await api.get('/gateway/testorder/flaggingconfiguration');
      const data = testOrderService._toArray(resp.data);
      return { success: true, data };
    } catch (error) {
      return { success: false, message: 'Lỗi lấy cấu hình cảnh báo', data: [] };
    }
  },

  getFlaggingConfigurationById: async (id) => {
    try {
      if (!id) return { success: false, message: 'Missing id' };
      const resp = await api.get(`/gateway/testorder/flaggingconfiguration/${id}`);
      const data = resp.data?.data || resp.data;
      return { success: true, data };
    } catch (error) {
      return { success: false, message: 'Lỗi lấy cấu hình cảnh báo' };
    }
  },

  getAllFlaggingConfigLogs: async () => {
    try {
      const resp = await api.get('/gateway/testorder/flaggingconfiglog');
      const data = testOrderService._toArray(resp.data);
      return { success: true, data };
    } catch (error) {
      return { success: false, message: 'Lỗi lấy lịch sử cấu hình cảnh báo', data: [] };
    }
  },

  getFlaggingConfigLogById: async (id) => {
    try {
      if (!id) return { success: false, message: 'Missing id' };
      const resp = await api.get(`/gateway/testorder/flaggingconfiglog/${id}`);
      const data = resp.data?.data || resp.data;
      return { success: true, data };
    } catch (error) {
      return { success: false, message: 'Lỗi lấy lịch sử cấu hình cảnh báo' };
    }
  }
};

export { testOrderService };
export default testOrderService;