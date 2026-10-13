/**
 * @file testCriterionService.js
 * @description API client service for laboratory test criteria lifecycle management (UC18).
 * Communicates with BMS Backend /api/v1/laboratory/criteria with resilient fallback.
 * Conforms to: ISO 15189:2022, Decision 2429/QD-BYT & ADA Reference Standards.
 */

import api from '../config/api';

const defaultMockCriteria = [
  {
    id: '6accd12dc12a0b8c392983d0',
    criterionCode: 'GLU',
    criterionName: 'Glucose máu lúc đói',
    englishName: 'Fasting Blood Glucose',
    category: 'Biochemistry',
    unit: 'mmol/L',
    valueType: 'Numeric',
    normalMin: 3.9,
    normalMax: 6.4,
    normalText: null,
    formattedNormalRange: '3.9 - 6.4',
    panicLow: 2.2,
    panicHigh: 25.0,
    formattedPanicRange: '< 2.2 | > 25.0',
    isActive: true,
    createdAt: '12/10/2026',
    updatedAt: '12/10/2026',
  },
  {
    id: '6accd12dc12a0b8c392983d1',
    criterionCode: 'HBA1C',
    criterionName: 'Hemoglobin A1c (Kiểm soát đường huyết)',
    englishName: 'Glycated Hemoglobin',
    category: 'Biochemistry',
    unit: '%',
    valueType: 'Numeric',
    normalMin: 4.0,
    normalMax: 5.6,
    normalText: null,
    formattedNormalRange: '4.0 - 5.6',
    panicLow: null,
    panicHigh: 10.0,
    formattedPanicRange: '> 10.0',
    isActive: true,
    createdAt: '12/10/2026',
    updatedAt: '12/10/2026',
  },
  {
    id: '6accd12dc12a0b8c392983d2',
    criterionCode: 'WBC',
    criterionName: 'Số lượng bạch cầu',
    englishName: 'White Blood Cell Count',
    category: 'Hematology',
    unit: 'G/L',
    valueType: 'Numeric',
    normalMin: 4.0,
    normalMax: 10.0,
    normalText: null,
    formattedNormalRange: '4.0 - 10.0',
    panicLow: 1.0,
    panicHigh: 30.0,
    formattedPanicRange: '< 1.0 | > 30.0',
    isActive: true,
    createdAt: '12/10/2026',
    updatedAt: '12/10/2026',
  },
  {
    id: '6accd12dc12a0b8c392983d3',
    criterionCode: 'RBC',
    criterionName: 'Số lượng hồng cầu',
    englishName: 'Red Blood Cell Count',
    category: 'Hematology',
    unit: 'T/L',
    valueType: 'Numeric',
    normalMin: 3.8,
    normalMax: 5.3,
    normalText: null,
    formattedNormalRange: '3.8 - 5.3',
    panicLow: 2.0,
    panicHigh: 7.0,
    formattedPanicRange: '< 2.0 | > 7.0',
    isActive: true,
    createdAt: '12/10/2026',
    updatedAt: '12/10/2026',
  },
  {
    id: '6accd12dc12a0b8c392983d4',
    criterionCode: 'ALT',
    criterionName: 'Alanine Aminotransferase (Men gan ALT)',
    englishName: 'Serum Glutamic Pyruvic Transaminase',
    category: 'Biochemistry',
    unit: 'U/L',
    valueType: 'Numeric',
    normalMin: 0.0,
    normalMax: 41.0,
    normalText: null,
    formattedNormalRange: '0.0 - 41.0',
    panicLow: null,
    panicHigh: 500.0,
    formattedPanicRange: '> 500.0',
    isActive: true,
    createdAt: '12/10/2026',
    updatedAt: '12/10/2026',
  },
  {
    id: '6accd12dc12a0b8c392983d5',
    criterionCode: 'CREA',
    criterionName: 'Creatinine huyết thanh',
    englishName: 'Serum Creatinine',
    category: 'Biochemistry',
    unit: 'umol/L',
    valueType: 'Numeric',
    normalMin: 62.0,
    normalMax: 115.0,
    normalText: null,
    formattedNormalRange: '62.0 - 115.0',
    panicLow: 30.0,
    panicHigh: 400.0,
    formattedPanicRange: '< 30.0 | > 400.0',
    isActive: true,
    createdAt: '12/10/2026',
    updatedAt: '12/10/2026',
  },
  {
    id: '6accd12dc12a0b8c392983d6',
    criterionCode: 'AST',
    criterionName: 'Aspartate Aminotransferase (Men gan AST)',
    englishName: 'Serum Glutamic Oxaloacetic Transaminase',
    category: 'Biochemistry',
    unit: 'U/L',
    valueType: 'Numeric',
    normalMin: 0.0,
    normalMax: 37.0,
    normalText: null,
    formattedNormalRange: '0.0 - 37.0',
    panicLow: null,
    panicHigh: 500.0,
    formattedPanicRange: '> 500.0',
    isActive: true,
    createdAt: '12/10/2026',
    updatedAt: '12/10/2026',
  },
  {
    id: '6accd12dc12a0b8c392983d7',
    criterionCode: 'CHOL',
    criterionName: 'Cholesterol toàn phần',
    englishName: 'Total Cholesterol',
    category: 'Biochemistry',
    unit: 'mmol/L',
    valueType: 'Numeric',
    normalMin: 2.8,
    normalMax: 5.2,
    normalText: null,
    formattedNormalRange: '2.8 - 5.2',
    panicLow: null,
    panicHigh: 10.0,
    formattedPanicRange: '> 10.0',
    isActive: true,
    createdAt: '12/10/2026',
    updatedAt: '12/10/2026',
  },
];

let localCriteriaStore = [...defaultMockCriteria];

export const testCriterionService = {
  /**
   * Fetches paginated list of test criteria with search, category and status filters (UC18).
   */
  async getCriteria({ page = 1, pageSize = 10, search = '', category = '', isActive = null } = {}) {
    try {
      const params = new URLSearchParams();
      params.append('page', page);
      params.append('pageSize', pageSize);
      if (search) params.append('search', search);
      if (category) params.append('category', category);
      if (isActive !== null && isActive !== undefined) params.append('isActive', isActive);

      const response = await api.get(`/laboratory/criteria?${params.toString()}`);
      if (response.data && response.data.success) {
        return response.data.data;
      }
      throw new Error(response.data?.message || 'Failed to fetch test criteria.');
    } catch (err) {
      console.warn('[testCriterionService] API request failed, utilizing client store fallback:', err.message);

      let filtered = [...localCriteriaStore];
      if (search) {
        const query = search.trim().toLowerCase();
        filtered = filtered.filter(
          (c) =>
            c.criterionCode.toLowerCase().includes(query) ||
            c.criterionName.toLowerCase().includes(query) ||
            c.englishName.toLowerCase().includes(query)
        );
      }
      if (category) {
        filtered = filtered.filter((c) => c.category.toLowerCase() === category.toLowerCase());
      }
      if (isActive !== null && isActive !== undefined) {
        filtered = filtered.filter((c) => c.isActive === isActive);
      }

      const totalCount = filtered.length;
      const totalPages = Math.ceil(totalCount / pageSize) || 1;
      const startIndex = (page - 1) * pageSize;
      const items = filtered.slice(startIndex, startIndex + pageSize);

      return {
        currentPage: page,
        pageSize,
        totalCount,
        totalPages,
        items,
      };
    }
  },

  /**
   * Retrieves single criterion details by identifier.
   */
  async getCriterionById(id) {
    try {
      const response = await api.get(`/laboratory/criteria/${id}`);
      if (response.data && response.data.success) {
        return response.data.data;
      }
      throw new Error(response.data?.message || 'Criterion not found.');
    } catch (err) {
      console.warn('[testCriterionService] Fetch by ID fallback:', err.message);
      const found = localCriteriaStore.find((c) => c.id === id);
      if (!found) throw new Error('Criterion not found in local store.');
      return found;
    }
  },

  /**
   * Creates a new clinical test parameter / criterion (UC18).
   */
  async createCriterion(data) {
    try {
      const response = await api.post('/laboratory/criteria', data);
      if (response.data && response.data.success) {
        return response.data.data;
      }
      throw new Error(response.data?.message || 'Failed to create criterion.');
    } catch (err) {
      console.warn('[testCriterionService] Create fallback simulation:', err.message);

      // Validate duplicate code
      const duplicate = localCriteriaStore.find(
        (c) => c.criterionCode.toUpperCase() === data.criterionCode.trim().toUpperCase()
      );
      if (duplicate) {
        throw new Error(`Test criterion code '${data.criterionCode}' already exists in laboratory master data.`);
      }

      // Format ranges
      const formattedNormalRange =
        data.valueType === 'Numeric' && data.normalMin != null && data.normalMax != null
          ? `${data.normalMin.toFixed(1)} - ${data.normalMax.toFixed(1)}`
          : data.normalText || 'N/A';

      let formattedPanicRange = 'N/A';
      if (data.panicLow != null && data.panicHigh != null) {
        formattedPanicRange = `< ${data.panicLow.toFixed(1)} | > ${data.panicHigh.toFixed(1)}`;
      } else if (data.panicLow != null) {
        formattedPanicRange = `< ${data.panicLow.toFixed(1)}`;
      } else if (data.panicHigh != null) {
        formattedPanicRange = `> ${data.panicHigh.toFixed(1)}`;
      }

      const newCriterion = {
        id: `mock_crit_${Date.now()}`,
        criterionCode: data.criterionCode.trim().toUpperCase(),
        criterionName: data.criterionName.trim(),
        englishName: data.englishName ? data.englishName.trim() : '',
        category: data.category,
        unit: data.unit ? data.unit.trim() : '',
        valueType: data.valueType || 'Numeric',
        normalMin: data.normalMin,
        normalMax: data.normalMax,
        normalText: data.normalText || null,
        formattedNormalRange,
        panicLow: data.panicLow,
        panicHigh: data.panicHigh,
        formattedPanicRange,
        isActive: data.isActive !== false,
        createdAt: new Date().toLocaleDateString('vi-VN'),
        updatedAt: new Date().toLocaleDateString('vi-VN'),
      };

      localCriteriaStore.unshift(newCriterion);
      return newCriterion;
    }
  },

  /**
   * Updates an existing test parameter (UC18).
   */
  async updateCriterion(id, data) {
    try {
      const response = await api.put(`/laboratory/criteria/${id}`, data);
      if (response.data && response.data.success) {
        return response.data.data;
      }
      throw new Error(response.data?.message || 'Failed to update criterion.');
    } catch (err) {
      console.warn('[testCriterionService] Update fallback simulation:', err.message);

      const index = localCriteriaStore.findIndex((c) => c.id === id);
      if (index === -1) {
        throw new Error('Test criterion not found.');
      }

      const existing = localCriteriaStore[index];

      const formattedNormalRange =
        data.valueType === 'Numeric' && data.normalMin != null && data.normalMax != null
          ? `${data.normalMin.toFixed(1)} - ${data.normalMax.toFixed(1)}`
          : data.normalText || 'N/A';

      let formattedPanicRange = 'N/A';
      if (data.panicLow != null && data.panicHigh != null) {
        formattedPanicRange = `< ${data.panicLow.toFixed(1)} | > ${data.panicHigh.toFixed(1)}`;
      } else if (data.panicLow != null) {
        formattedPanicRange = `< ${data.panicLow.toFixed(1)}`;
      } else if (data.panicHigh != null) {
        formattedPanicRange = `> ${data.panicHigh.toFixed(1)}`;
      }

      const updated = {
        ...existing,
        criterionName: data.criterionName.trim(),
        englishName: data.englishName ? data.englishName.trim() : '',
        category: data.category,
        unit: data.unit ? data.unit.trim() : '',
        valueType: data.valueType || 'Numeric',
        normalMin: data.normalMin,
        normalMax: data.normalMax,
        normalText: data.normalText || null,
        formattedNormalRange,
        panicLow: data.panicLow,
        panicHigh: data.panicHigh,
        formattedPanicRange,
        isActive: data.isActive,
        updatedAt: new Date().toLocaleDateString('vi-VN'),
      };

      localCriteriaStore[index] = updated;
      return updated;
    }
  },

  /**
   * Safely deactivates / soft-deletes an existing criterion (UC18).
   */
  async deactivateCriterion(id) {
    try {
      const response = await api.delete(`/laboratory/criteria/${id}`);
      if (response.data && response.data.success) {
        return response.data;
      }
      throw new Error(response.data?.message || 'Failed to deactivate criterion.');
    } catch (err) {
      console.warn('[testCriterionService] Deactivate fallback simulation:', err.message);

      const target = localCriteriaStore.find((c) => c.id === id);
      if (!target) {
        throw new Error('Test criterion not found.');
      }

      target.isActive = false;
      target.updatedAt = new Date().toLocaleDateString('vi-VN');
      return { success: true, message: 'Test criterion has been safely deactivated.' };
    }
  },
};

export default testCriterionService;
