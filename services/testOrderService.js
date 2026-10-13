/**
 * Test Order Service
 *
 * Consolidated wrapper for TestOrder endpoints proxied by gateway and warehouse endpoints
 */
import api from './api';

const testOrderService = {
  // Internal: safely extract array from various API shapes
  _toArray(data) {
    if (!data) return [];
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.items)) return data.items;
    if (Array.isArray(data?.data)) return data.data;
    if (Array.isArray(data?.records)) return data.records;
    if (Array.isArray(data?.result)) return data.result;
    return [];
  },
  // Get test parameters for a given service/package id
  // Tries GET /gateway/testorder/testparameter/{id}
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

  // Get a test package by id
  // GET /gateway/testorder/testpackage/{id}
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

  // Get list of test packages (paginated envelope)
  // GET /gateway/testorder/testpackage
  getTestPackages: async () => {
    try {
      const resp = await api.get('/gateway/testorder/testpackage');
      // Expected shape: { message, page, pageSize, total, data: [...] }
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

  // Compatibility wrapper: return all test packages (same shape expected by callers)
  // options: { fetchAll: boolean, params: object }
  getAllTestPackages: async (options = {}) => {
    try {
      // Nếu fetchAll = true: Lấy 1000 dòng/trang để gom hết dữ liệu 1 lần.
      // Nếu không: Lấy theo mặc định (ví dụ 10 hoặc 20).
      const pageSize = options.fetchAll ? 1000 : 20;

      // Gọi API đúng 1 lần duy nhất
      const resp = await api.get('/gateway/testorder/testpackage', {
        params: { page: 1, pageSize: pageSize }
      });

      // Xử lý dữ liệu trả về (đề phòng backend trả về dạng mảng hoặc object {data: []})
      const data = Array.isArray(resp.data) ? resp.data : (resp.data?.data || []);

      return { success: true, data: data, raw: resp };

    } catch (e) {
      return { success: false, message: 'Lỗi lấy danh sách gói xét nghiệm', data: [] };
    }
  },

  // Get all testpackagecriterion entries
  // GET /gateway/testorder/testpackagecriterion
  // options: { fetchAll: boolean, params: object }
  getAllTestPackageCriteria: async (options = {}) => {
    try {
      const resp = await api.get('/gateway/testorder/testpackagecriterion', { params: options.params || {} });
      let data = testOrderService._toArray(resp.data);

      // If caller requests all items, iterate page-by-page (don't rely on changing pageSize)
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
            if (page > 200) break; // safety cap
          }
          return { success: true, data: collected, raw: resp.data };
        } catch (e) {
        }
      }

      if (!data || data.length === 0) {
        data = testOrderService._toArray(resp.data?.data);
      }
      // Helpful debug: surface raw response keys and a sample record for troubleshooting
      try {
      } catch (e) { }
      return { success: true, data, raw: resp.data };
    } catch (error) {
      return { success: false, message: 'Lỗi lấy test package criteria', data: [] };
    }
  },

  // Get testpackagecriterion filtered by package id (preferred if backend supports query params)
  // Supports options.fetchAll to iterate through paginated responses
  // GET /gateway/testorder/testpackagecriterion?test_package_id={id}
  getTestPackageCriteria: async (packageId, options = {}) => {
    try {
      if (!packageId) return { success: false, message: 'Missing packageId' };
      const paramCandidates = ['test_package_id', 'testPackageId', 'packageId', 'package_id'];
      for (const paramName of paramCandidates) {
        try {
          if (options.fetchAll) {
            const collected = [];
            // initial probe to determine pageSize
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
          // If backend responded with some data (even empty array is valid), return it but annotate param used
          try {
          } catch (e) { }
          return { success: true, data, raw: resp.data, source: 'filtered', paramName };
        } catch (err) {
          // try next param name
        }
      }
      // If param-based filtering failed or backend expects path-based filter, try path variants
      const pathCandidates = [
        `/gateway/testorder/testpackagecriterion/${packageId}/criteria`,
        `/gateway/testorder/testpackage/${packageId}/criteria`,
        `/gateway/testorder/testpackagecriterion/${packageId}` // fallback: existing id path
      ];
      for (const path of pathCandidates) {
        try {
          if (options.fetchAll) {
            const collected = [];
            // probe initial to infer pageSize
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
      // If all attempts failed
      return { success: false, message: 'Filtered package-criteria not available (all param attempts failed)', source: 'filtered-failed' };
    } catch (error) {
      return { success: false, message: 'Filtered package-criteria not available', source: 'filtered-error' };
    }
  },

  // New: Get package criteria via explicit path endpoint if backend exposes /testpackage/{id}/criteria
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

  // Get a single test criterion by id
  // GET /gateway/testorder/testcriterion/{id}
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

  // Get all test criteria (convenience helper)
  // GET /gateway/testorder/testcriterion
  // options: { fetchAll: boolean, params: object }
  getAllTestCriteria: async (options = {}) => {
    try {
      const resp = await api.get('/gateway/testorder/testcriterion', { params: options.params || {} });
      let data = testOrderService._toArray(resp.data);

      // If caller requests all items, iterate page-by-page (don't rely on changing pageSize)
      if (options.fetchAll) {
        try {
          const collected = [];
          let page = 1;
          // try to infer per-page size from initial response, otherwise default to 50
          const respPageSize = Number(resp.data?.pageSize || resp.data?.page_size || resp.data?.pageSize || 0) || (Array.isArray(data) ? data.length : 0) || 50;
          while (true) {
            const pagedResp = await api.get('/gateway/testorder/testcriterion', { params: { page, pageSize: respPageSize } });
            const pageData = testOrderService._toArray(pagedResp.data);
            if (!pageData || pageData.length === 0) break;
            for (const it of pageData) collected.push(it);
            // if returned less than requested per page, probably last page
            if (pageData.length < respPageSize) break;
            page += 1;
            if (page > 200) break; // safety cap
          }
          return { success: true, data: collected, raw: resp.data };
        } catch (e) {
        }
      }

      // Normalize fallback to data.data
      if ((!data || data.length === 0) && Array.isArray(resp.data?.data)) {
        return { success: true, data: resp.data.data, raw: resp.data };
      }
      return { success: true, data, raw: resp.data };
    } catch (error) {
      return { success: false, message: 'Lỗi lấy danh sách tiêu chí', data: [] };
    }
  },

  // Convenience: get criteria objects for a packageId by reading packagecriterion and fetching criterion entries
  getCriteriaForPackage: async (packageId) => {
    try {
      if (!packageId) return { success: false, message: 'Missing packageId' };
      // Prefer a filtered query for package->criterion links (backend should support this)
      let triedFiltered = false;
      let pkRes = { success: false };
      try {
        triedFiltered = true;
        // Request filtered links and fetch all pages when available to avoid missing links on page >1
        pkRes = await testOrderService.getTestPackageCriteria(packageId, { fetchAll: true }).catch(() => ({ success: false }));
      } catch (e) {
        pkRes = { success: false };
      }
      let sourceUsed = 'none';
      // If filtered call not available or returned empty, fallback to full list
      if (pkRes && pkRes.success && Array.isArray(pkRes.data) && pkRes.data.length > 0) {
        sourceUsed = pkRes.source || 'filtered';
      } else {
        // Request all pages when falling back so we don't miss links across pages
        pkRes = await testOrderService.getAllTestPackageCriteria({ fetchAll: true }).catch(() => ({ success: false }));
        sourceUsed = 'all';
      }
      if (!pkRes.success) {
        return { success: false, message: 'No package-criteria data' };
      }
      const links = pkRes.data || [];
      try {
      } catch (e) { }
      // If links are empty, expose the raw payload so we can see what's returned by the gateway
      if ((!links || links.length === 0) && pkRes.raw) {
        try {
        } catch (e) { }
      }

      const norm = (v) => (v === undefined || v === null) ? '' : String(v).trim();
      const normUpper = (v) => norm(v).toUpperCase();

      const pkgIdNorm = normUpper(packageId);
      const normalizeForCompare = v => (v === undefined || v === null) ? '' : String(v).replace(/[^a-z0-9]/gi, '').toUpperCase();
      const digitsOnly = (v) => (String(v || '').match(/\d+/) || [''])[0];

      // Build a set of candidate normalized package ids to match against link records
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

      // Primary matching by normalized package id (strict)
      let related = links.filter(l => extractPkgId(l) === pkgIdNorm);

      // If none matched strictly, try matching against various normalized candidates
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

      // Debug: log initial match attempt
      try {
        const critIds = related.map(extractCritId).filter(Boolean);
      } catch (e) { }

      // Fallback 1: if none matched, try to resolve package by code/name from package list then re-match
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
              // also try matching against normalized foundId and candidates
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
          // ignore
        }
      }

      // Fallback 2: try loose matching on link fields directly (case-insensitive string compare)
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

      // Fallback 3: try matching by package name - get package object and compare names against link fields
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

      // Fetch each criterion (unique IDs)
      const critIds = Array.from(new Set(related.map(extractCritId).filter(Boolean)));

      // Helper: try multiple id formats when fetching a criterion because backends differ
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
            // ignore and try next variant
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

  // Get test results by appointment
  getResultsByAppointment: async (appointmentId) => {
    try {
      if (!appointmentId) return { success: false, message: 'Missing appointmentId' };
      const response = await api.get(`/gateway/testorder/testresult/by-appointment/${appointmentId}`);
      const data = response.data?.data || response.data || [];
      return { success: true, data: Array.isArray(data) ? data : [data] };
    } catch (error) {
      const status = error?.response?.status;
      // If backend returns 404 -> no results for this appointment (not necessarily an error)
      if (status === 404) {
        return { success: true, data: [] };
      }
      return { success: false, status, message: error.response?.data?.message || 'Lỗi lấy kết quả theo lịch hẹn' };
    }
  },

  // Compatibility wrapper: get all test results
  // GET /gateway/testorder/testresult
  // options: { fetchAll: boolean, params: object }
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

  // Create test result using the TestOrder contract
  createTestResult: async (payload) => {
    try {
      const response = await api.post('/gateway/testorder/testresult', payload);
      const data = response.data?.data || response.data;
      return { success: true, data };
    } catch (error) {
      const status = error?.response?.status;
      const raw = error?.response?.data;
      // Propagate raw error body and status so callers can map field-level validation errors
      return { success: false, message: raw?.message || 'Lỗi tạo kết quả xét nghiệm', status, raw };
    }
  },

  // Update test result using the TestOrder contract
  // PUT /gateway/testorder/testresult/{id}
  updateTestResult: async (id, payload) => {
    try {
      if (!id) return { success: false, message: 'Missing test result id' };

      // 1. Fetch current result first (to ensure we have the full object for PUT)
      const currentRes = await testOrderService.getTestResult(id);
      const currentData = currentRes.success ? (currentRes.data || {}) : {};

      // 2. Merge payload
      const updatedData = {
        ...currentData,
        ...payload,
        // Ensure ID is present
        id: id,
        testResultId: id
      };

      // 3. Send PUT request
      const response = await api.put(`/gateway/testorder/testresult/${id}`, updatedData);
      const data = response.data?.data || response.data;
      return { success: true, data };
    } catch (error) {
      return { success: false, message: 'Lỗi cập nhật kết quả xét nghiệm' };
    }
  },

  // Delete test result
  // DELETE /gateway/testorder/testresult/{id}
  deleteTestResult: async (id) => {
    try {
      if (!id) return { success: false, message: 'Missing test result id' };
      const response = await api.delete(`/gateway/testorder/testresult/${id}`);
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, message: 'Lỗi xóa kết quả xét nghiệm' };
    }
  },

  // Get test result by id
  // GET /gateway/testorder/testresult/{id}
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

  // Compatibility wrapper: get all test parameters
  // GET /gateway/testorder/testparameter
  // options: { fetchAll: boolean, params: object }
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

  // Get test parameters by test result ID
  // Strategy: Fetch TestResult and extract parameters from it
  getTestParametersByResultId: async (testResultId) => {
    try {
      if (!testResultId) return { success: false, message: 'Missing testResultId' };

      // 1. Prefer the explicit parameters endpoint exposed by the gateway
      //    GET /gateway/testorder/testparameter/by-testresult/{testResultId}
      try {
        const resp = await api.get(`/gateway/testorder/testparameter/by-testresult/${testResultId}`);
        const data = testOrderService._toArray(resp.data);
        if (Array.isArray(data) && data.length > 0) {
          return { success: true, data, raw: resp.data, source: 'by-testresult' };
        }
      } catch (err) {
        // not fatal; we'll fallback
      }

      // 2. Fallback: Fetch the TestResult object and try to extract parameters from common fields
      try {
        const res = await testOrderService.getTestResult(testResultId);
        if (res.success && res.data) {
          const resultData = res.data;
          // Check common fields where parameters might be stored
          const params = resultData.testParameters || resultData.parameters || resultData.details || resultData.results || [];
          if (Array.isArray(params) && params.length > 0) {
            return { success: true, data: params, source: 'from-testresult' };
          }
        }
      } catch (e) {
      }

      // Nothing found
      return { success: true, data: [], message: 'No parameters found' };
    } catch (error) {
      return { success: false, message: 'Lỗi lấy thông số xét nghiệm theo result ID', data: [] };
    }
  },

  // Get reagents from warehouse (to allow selection in UI)
  getReagents: async () => {
    try {
      const resp = await api.get('/gateway/warehouse/reagents');
      // Robustly extract arrays from different envelope shapes
      let raw = testOrderService._toArray(resp.data);
      if (!raw || raw.length === 0) raw = testOrderService._toArray(resp.data?.data);
      if (!raw || raw.length === 0) raw = testOrderService._toArray(resp.data?.items);
      // Normalize reagent items to a consistent shape used by the UI
      const data = (raw || []).map(item => ({
        id: item.id || item.reagentId || item.reagent_id || item.code || item.itemId || item.productId || '',
        code: item.code || item.reagentCode || item.reagent_code || item.barcode || item.sku || '',
        name: item.name || item.reagentName || item.reagent_name || item.displayName || item.productName || item.description || '',
        raw: item // keep raw for debugging if needed
      }));
      return { success: true, data };
    } catch (error) {
      return { success: false, message: 'Lỗi lấy danh sách thuốc thử', data: [] };
    }
  },

  // Get devices/equipment from warehouse
  getDevices: async () => {
    try {
      const resp = await api.get('/gateway/warehouse/equipment');
      let raw = testOrderService._toArray(resp.data);
      if (!raw || raw.length === 0) raw = testOrderService._toArray(resp.data?.data);
      if (!raw || raw.length === 0) raw = testOrderService._toArray(resp.data?.items);
      const data = (raw || []).map(item => ({
        id: item.id || item.equipmentId || item.equipment_id || item.code || item.deviceId || item.productId || '',
        // Backend may return manufacturer-specific code under various keys (codeManufacturer, code_manufacturer)
        code: item.code || item.equipmentCode || item.equipment_code || item.codeManufacturer || item.code_manufacturer || item.barcode || item.sku || '',
        // Prefer equipmentName when present
        name: item.name || item.equipmentName || item.equipment_name || item.displayName || item.productName || item.description || '',
        manufacturer: item.manufacturer || item.manufacturerName || item.mfg || null,
        raw: item
      }));
      return { success: true, data };
    } catch (error) {
      return { success: false, message: 'Lỗi lấy danh sách thiết bị', data: [] };
    }
  },

  // ============ NOTE ============
  // Blood Sample operations đã được chuyển sang sampleService.js
  // Appointment operations đã được chuyển sang appointmentService.js
  // Doctor operations đã được chuyển sang doctorService.js
  // Doctor Shift operations đã được chuyển sang shiftService.js
  // Lab Room và Doctor Room operations vẫn giữ ở đây vì liên quan trực tiếp đến TestOrder service

  // ============ LAB ROOM OPERATIONS ============
  // GET /gateway/testorder/labroom
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
      return { success: false, message: 'Lỗi lấy danh sách phòng lab', data: [] };
    }
  },

  // GET /gateway/testorder/labroom/{id}
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

  // New: hyphenated gateway endpoints (added to ocelot.json)
  // These prefer the upstream hyphenated paths and exist alongside older endpoints for compatibility.
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

  createLabRoom: async (data) => {
    try {
      const resp = await api.post('/gateway/testorder/labroom', data);
      return { success: true, data: resp.data };
    } catch (error) {
      return { success: false, message: error.response?.data?.message || 'Lỗi tạo phòng lab' };
    }
  },

  updateLabRoom: async (id, data) => {
    try {
      const resp = await api.put(`/gateway/testorder/labroom/${id}`, data);
      return { success: true, data: resp.data };
    } catch (error) {
      return { success: false, message: error.response?.data?.message || 'Lỗi cập nhật phòng lab' };
    }
  },

  deleteLabRoom: async (id) => {
    try {
      const resp = await api.delete(`/gateway/testorder/labroom/${id}`);
      return { success: true, data: resp.data };
    } catch (error) {
      return { success: false, message: error.response?.data?.message || 'Lỗi xóa phòng lab' };
    }
  },

  // ============ DOCTOR ROOM OPERATIONS ============
  // GET /gateway/testorder/doctorroom
  getAllDoctorRooms: async () => {
    try {
      const resp = await api.get('/gateway/testorder/doctorroom');
      const data = testOrderService._toArray(resp.data);
      return { success: true, data };
    } catch (error) {
      return { success: false, message: 'Lỗi lấy danh sách phòng khám', data: [] };
    }
  },

  // GET /gateway/testorder/doctorroom/{id}
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

  // Hyphenated gateway variants
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

  // ============ LAB ASSIGNMENT OPERATIONS (gateway hyphenated) ============
  getAllLabAssignmentsGateway: async (options = { fetchAll: true }) => {
    try {
      const resp = await api.get('/gateway/testorder/lab-assignments', { params: options.params || {} });
      let data = testOrderService._toArray(resp.data);

      // If caller requests all items (or default), iterate page-by-page
      if (options.fetchAll) {
        try {
          const collected = [];
          const respPageSize = Number(resp.data?.pageSize || resp.data?.page_size || 0) || (Array.isArray(data) ? data.length : 0) || 50;
          const total = Number(resp.data?.total || resp.data?.Total || 0) || (Array.isArray(data) ? data.length : 0);
          
          // Calculate max page to avoid 404 errors
          const maxPage = total > 0 && respPageSize > 0 ? Math.ceil(total / respPageSize) : 1;
          
          // Start with page 1 data if available
          if (data && data.length > 0) {
            for (const it of data) collected.push(it);
          }
          
          // Fetch remaining pages if any
          if (maxPage > 1) {
            for (let page = 2; page <= maxPage; page++) {
              try {
                const pagedResp = await api.get('/gateway/testorder/lab-assignments', { params: { page, pageSize: respPageSize } });
                const pageData = testOrderService._toArray(pagedResp.data);
                if (!pageData || pageData.length === 0) break;
                for (const it of pageData) collected.push(it);
                if (pageData.length < respPageSize) break;
              } catch (pageError) {
                // 404 is expected when no more pages exist, silently break
                if (pageError.response?.status === 404) {
                  break;
                }
                // For other errors, break
                if (pageError.response?.status >= 400) {
                  break;
                }
                throw pageError;
              }
              // Safety cap
              if (page > 200) break;
            }
          }
          return { success: true, data: collected, raw: resp.data };
        } catch (e) {
          // Silently fail, use initial data
        }
      }

      return { success: true, data, raw: resp.data };
    } catch (error) {
      // Handle 404 gracefully - endpoint might not exist or no data available
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

  // ============ LAB USER PROFILE OPERATIONS ============
  // GET /gateway/testorder/labuserprofile  (legacy)
  getAllLabUserProfiles: async () => {
    const endpoints = [
      '/gateway/testorder/lab-user-profiles', // new hyphenated
      '/gateway/testorder/labuserprofile',    // legacy
      '/gateway/testorder/labuserprofiles'    // possible plural variant
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
        // If API returned an empty array explicitly, treat as success
        if (Array.isArray(resp.data) && resp.data.length === 0) {
          return { success: true, data: [], raw: resp.data, endpoint: ep };
        }
      } catch (error) {
        // try next endpoint
      }
    }

    return { success: false, message: 'Lỗi lấy danh sách lab user', data: [] };
  },

  // GET /gateway/testorder/lab-user-profiles  (new gateway hyphenated)
  getAllLabUserProfilesGateway: async () => {
    try {
      const resp = await api.get('/gateway/testorder/lab-user-profiles');
      const data = testOrderService._toArray(resp.data);
      return { success: true, data, raw: resp.data };
    } catch (error) {
      return { success: false, message: 'Lỗi lấy danh sách lab user (gateway)', data: [] };
    }
  },

  // GET /gateway/testorder/labuserprofile/{id} (legacy)
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

  // GET /gateway/testorder/lab-user-profiles/{id} (hyphenated)
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

  // GET /gateway/testorder/lab-user-profiles/email/{email}
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

  // ✅ NEW: Update Lab User Profile
  // PUT /gateway/testorder/lab-user-profiles/{id}
  updateLabUserProfile: async (id, payload) => {
    try {
      if (!id) return { success: false, message: 'Missing id' };
      // Sử dụng endpoint gateway với dấu gạch ngang
      const resp = await api.put(`/gateway/testorder/lab-user-profiles/${id}`, payload);
      const data = resp.data?.data || resp.data;
      return { success: true, data, raw: resp.data };
    } catch (error) {
      return { success: false, message: 'Lỗi cập nhật hồ sơ lab user' };
    }
  },

  // ✅ NEW: Update Lab User Profile by Email
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

  // ============ TEST ORDER COMMENT OPERATIONS ============
  // GET /gateway/testorder/testordercomment
  getAllTestOrderComments: async () => {
    try {
      const resp = await api.get('/gateway/testorder/testordercomment');
      const data = testOrderService._toArray(resp.data);
      return { success: true, data };
    } catch (error) {
      return { success: false, message: 'Lỗi lấy danh sách ghi chú', data: [] };
    }
  },

  // GET /gateway/testorder/testordercomment/{id}
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

  // GET /gateway/testorder/testordercomment/appointment/{appointmentId}
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

  // POST /gateway/testorder/testordercomment
  createTestOrderComment: async (payload) => {
    try {
      const resp = await api.post('/gateway/testorder/testordercomment', payload);
      const data = resp.data?.data || resp.data;
      return { success: true, data };
    } catch (error) {
      return { success: false, message: 'Lỗi tạo ghi chú mới' };
    }
  },

  // PUT /gateway/testorder/testordercomment/{id}
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

  // DELETE /gateway/testorder/testordercomment/{id}
  deleteTestOrderComment: async (id) => {
    try {
      if (!id) return { success: false, message: 'Missing id' };
      await api.delete(`/gateway/testorder/testordercomment/${id}`);
      return { success: true, message: 'Xóa ghi chú thành công' };
    } catch (error) {
      return { success: false, message: 'Lỗi xóa ghi chú' };
    }
  },

  // ============ FLAGGING CONFIGURATION OPERATIONS ============
  // GET /gateway/testorder/flaggingconfiguration
  getAllFlaggingConfigurations: async () => {
    try {
      const resp = await api.get('/gateway/testorder/flaggingconfiguration');
      const data = testOrderService._toArray(resp.data);
      return { success: true, data };
    } catch (error) {
      return { success: false, message: 'Lỗi lấy cấu hình cảnh báo', data: [] };
    }
  },

  // GET /gateway/testorder/flaggingconfiguration/{id}
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

  // ============ FLAGGING CONFIG LOG OPERATIONS ============
  // GET /gateway/testorder/flaggingconfiglog
  getAllFlaggingConfigLogs: async () => {
    try {
      const resp = await api.get('/gateway/testorder/flaggingconfiglog');
      const data = testOrderService._toArray(resp.data);
      return { success: true, data };
    } catch (error) {
      return { success: false, message: 'Lỗi lấy lịch sử cấu hình cảnh báo', data: [] };
    }
  },

  // GET /gateway/testorder/flaggingconfiglog/{id}
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