/**
 * @file adminOpsService.js
 * @description Admin operations dashboard API (UC12, DOT2 follow-up 6). Ops data only — the backend DTO has
 * no patient, result, panic or sample fields.
 */
import api from '../../../config/api';

/**
 * Fetches the Admin operations snapshot.
 * @param {AbortSignal} [signal] - Cancels the request when the component unmounts.
 * @returns {Promise<{usersPerRole: Record<string, number>, lockedAccounts: number,
 *   logins: {distinctAccountsLast24h: number, distinctAccountsLast7d: number, accountsWithFailedAttempts: number},
 *   backup: {lastStatus: string|null, lastCreatedAtUtc: string|null, lastCompletedAtUtc: string|null, completedLast7d: number, failedLast7d: number},
 *   auditLogRows: number, iotDevices: {online: number, offline: number},
 *   revenue: {totalCollected: number, paidInvoiceCount: number}, generatedAtUtc: string}>}
 * @throws {Error} When the backend returns success=false or the request fails.
 */
export async function getAdminOps(signal) {
  const res = await api.get('/dashboard/admin-ops', { signal });
  if (!res.data?.success) throw new Error(res.data?.message || 'Không tải được số liệu vận hành.');
  return res.data.data;
}
