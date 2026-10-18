/**
 * @fileoverview API client for UC01 & UC20 – View Service Catalog & Search Test Packages.
 * Connects to backend endpoints:
 * - GET /api/v1/test-packages/search (also /api/v1/catalog/services/search)
 * - GET /api/v1/catalog/services
 * - GET /api/v1/test-packages/{id} (also /api/v1/catalog/services/{id})
 */

import { getToken } from '../../../config/api';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

function buildHeaders() {
  const token = getToken();
  return {
    Accept: 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function parseError(response, fallbackMsg) {
  try {
    const data = await response.json();
    return (
      data?.message ||
      data?.Message ||
      data?.title ||
      data?.detail ||
      `${fallbackMsg} (${response.status})`
    );
  } catch {
    const text = await response.text().catch(() => '');
    return text || `${fallbackMsg} (${response.status})`;
  }
}

/**
 * Searches and filters test packages with keyword matching, category, sample tube,
 * price range, sorting, and pagination (UC20 - Search Test Packages).
 *
 * @param {Object} [params] - Search & filter parameters.
 * @param {string} [params.keyword] - Keyword matching packageCode, packageName, description, category, sampleTube, or criteria.
 * @param {string} [params.search] - Alias for keyword.
 * @param {string} [params.category] - Category filter (Hematology, Biochemistry, Immunology, etc.).
 * @param {string} [params.sampleTube] - Sample tube filter (EDTA, Serum, Heparin, Citrate, etc.).
 * @param {number|string} [params.minPrice] - Minimum price in VND.
 * @param {number|string} [params.maxPrice] - Maximum price in VND.
 * @param {boolean} [params.isActive] - Optional active filter (for authorized package managers).
 * @param {string} [params.sortBy='category'] - Sort field: 'category' | 'name' | 'code' | 'price'.
 * @param {string} [params.sortDir='asc'] - Sort direction: 'asc' | 'desc'.
 * @param {number} [params.page=1] - Page number (1-based).
 * @param {number} [params.pageSize=12] - Page size (1..100).
 * @returns {Promise<{ items: Array, page: number, pageSize: number, totalItems: number, totalPages: number }>}
 */
export async function searchTestPackages(params = {}) {
  const query = new URLSearchParams();

  const kw = params.keyword ?? params.search;
  if (kw && String(kw).trim()) query.set('keyword', String(kw).trim());
  if (params.category && String(params.category).trim()) {
    query.set('category', String(params.category).trim());
  }
  if (params.sampleTube && String(params.sampleTube).trim()) {
    query.set('sampleTube', String(params.sampleTube).trim());
  }
  if (params.minPrice !== undefined && params.minPrice !== null && params.minPrice !== '') {
    query.set('minPrice', String(params.minPrice));
  }
  if (params.maxPrice !== undefined && params.maxPrice !== null && params.maxPrice !== '') {
    query.set('maxPrice', String(params.maxPrice));
  }
  if (typeof params.isActive === 'boolean') {
    query.set('isActive', String(params.isActive));
  }
  if (params.sortBy) query.set('sortBy', params.sortBy);
  if (params.sortDir) query.set('sortDir', params.sortDir);
  query.set('page', String(params.page || 1));
  query.set('pageSize', String(params.pageSize || 12));

  const url = `${API_BASE}/api/v1/test-packages/search?${query.toString()}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: buildHeaders(),
  });

  if (!response.ok) {
    const errMsg = await parseError(response, 'Không thể tìm kiếm danh mục gói xét nghiệm');
    throw new Error(errMsg);
  }

  return response.json();
}

/**
 * Fetches the laboratory service catalog (categories + active packages).
 *
 * @param {Object} [params] - Optional filter parameters.
 * @param {string} [params.category] - Filter by category (Hematology, Biochemistry...).
 * @param {string} [params.search] - Keyword to search in package name or code.
 * @returns {Promise<{ packages: Array, categories: string[], totalCount: number }>}
 * @throws {Error} When the request fails.
 */
export async function fetchServiceCatalog({ category, search } = {}) {
  const query = new URLSearchParams();
  if (category) query.set('category', category);
  if (search) query.set('search', search);

  const url = `${API_BASE}/api/v1/catalog/services${query.toString() ? `?${query}` : ''}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: buildHeaders(),
  });

  if (!response.ok) {
    const errMsg = await parseError(response, 'Không thể tải danh mục gói xét nghiệm');
    throw new Error(errMsg);
  }

  return response.json();
}

/**
 * Fetches a single test package by its Id or PackageCode.
 *
 * @param {string} id - Package Id or PackageCode (e.g. PKG-001 or CBC-01).
 * @returns {Promise<Object|null>} Package data or null if not found.
 */
export async function fetchServiceById(id) {
  const response = await fetch(
    `${API_BASE}/api/v1/test-packages/${encodeURIComponent(id)}`,
    {
      method: 'GET',
      headers: buildHeaders(),
    }
  );

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    const errMsg = await parseError(response, 'Không thể tải chi tiết gói xét nghiệm');
    throw new Error(errMsg);
  }

  return response.json();
}