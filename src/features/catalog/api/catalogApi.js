/**
 * @fileoverview API client for UC01 – View Service Catalog.
 * Calls backend on port 5000, endpoint /api/v1/catalog/services.
 */

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

/**
 * Fetches the laboratory service catalog.
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
    headers: {
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => '');
    throw new Error(
      `Failed to load service catalog (${response.status}): ${errorBody || response.statusText}`
    );
  }

  return response.json();
}

/**
 * Fetches a single package by its Id.
 *
 * @param {string} id - Package Id (PKG-xxx).
 * @returns {Promise<Object|null>} Package data or null if not found.
 */
export async function fetchServiceById(id) {
  const response = await fetch(`${API_BASE}/api/v1/catalog/services/${encodeURIComponent(id)}`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error(`Failed to load package details: ${response.status}`);
  }

  return response.json();
}