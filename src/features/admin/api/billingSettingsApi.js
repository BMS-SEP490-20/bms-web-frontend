/**
 * @file billingSettingsApi.js
 * @description API client for BillingSettingsController (`/api/billing/settings`).
 */

import api from '../../../config/api';

const unwrap = (res) => res?.data?.data ?? res?.data;

export const billingSettingsApi = {
  async getBhytGroups(signal) {
    const res = await api.get('/billing/settings/bhyt-groups', { signal });
    const data = unwrap(res);
    return Array.isArray(data) ? data : [];
  },

  async upsertBhytGroup(code, payload) {
    const normalized = String(code || '').trim().toUpperCase();
    const res = await api.put(`/billing/settings/bhyt-groups/${encodeURIComponent(normalized)}`, {
      description: payload?.description ?? null,
      isActive: Boolean(payload?.isActive ?? true),
    });
    return unwrap(res);
  },

  async getPriorityDiscount(signal) {
    const res = await api.get('/billing/settings/priority-discount', { signal });
    return unwrap(res);
  },

  async setPriorityDiscount(payload) {
    const res = await api.put('/billing/settings/priority-discount', {
      percent: Number(payload?.percent ?? 0),
      maxAmount:
        payload?.maxAmount === '' || payload?.maxAmount === null || payload?.maxAmount === undefined
          ? null
          : Number(payload.maxAmount),
    });
    return unwrap(res);
  },
};
