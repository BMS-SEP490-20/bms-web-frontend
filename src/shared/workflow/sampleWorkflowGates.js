/**
 * Forward-only sample lifecycle gates (ISO 15189 clinical flow).
 * Mirror of BMS.Application LabQueueService.AllowedTransitions.
 * Used to show/hide action buttons and block fallback to earlier steps.
 */

export const SAMPLE_STATUS_ORDER = [
  'PendingCollection',
  'Collected',
  'InTransit',
  'Received',
  'Processing',
  'Testing',
  'Completed',
  'WaitingReview', // FE alias after enter-results
  'RerunRequested',
  'Rejected'
];

export const ALLOWED_SAMPLE_TRANSITIONS = {
  PendingCollection: ['Collected', 'Rejected'],
  Collected: ['InTransit', 'Received', 'Rejected'],
  InTransit: ['Received', 'Rejected'],
  Received: ['Processing', 'Testing', 'Rejected'],
  Processing: ['Testing', 'Rejected'],
  Testing: ['Completed', 'RerunRequested', 'Rejected'],
  Completed: ['RerunRequested'],
  WaitingReview: ['RerunRequested'],
  RerunRequested: ['Testing', 'Rejected'],
  Rejected: []
};

const RANK = {
  PendingCollection: 0,
  Collected: 10,
  InTransit: 15,
  Received: 20,
  Processing: 30,
  Testing: 40,
  Completed: 80,
  WaitingReview: 80,
  RerunRequested: 45,
  Rejected: 100
};

export function normalizeSampleStatus(status) {
  if (status == null || status === '') return '';
  const raw = String(status).trim();
  const key = Object.keys(RANK).find((k) => k.toLowerCase() === raw.toLowerCase());
  return key || raw;
}

export function sampleStatusRank(status) {
  const st = normalizeSampleStatus(status);
  return RANK[st] ?? -1;
}

/** True if `status` is at least as far as `minStatus` in the main happy path. */
export function isAtOrAfter(status, minStatus) {
  return sampleStatusRank(status) >= sampleStatusRank(minStatus);
}

export function canTransitionSample(from, to) {
  const f = normalizeSampleStatus(from);
  const t = normalizeSampleStatus(to);
  const allowed = ALLOWED_SAMPLE_TRANSITIONS[f] || [];
  return allowed.includes(t);
}

export function isTerminalSample(status) {
  const st = normalizeSampleStatus(status);
  return st === 'Rejected' || st === 'Completed' || st === 'WaitingReview';
}

/** Phlebotomy: only PendingCollection */
export function canCollectSample(status) {
  return normalizeSampleStatus(status) === 'PendingCollection';
}

/** Lab receive/check-in: Collected or InTransit only (no skip from PendingCollection) */
export function canReceiveSample(status) {
  const st = normalizeSampleStatus(status);
  return st === 'Collected' || st === 'InTransit';
}

/** Advance processing (Received / Processing → Testing) */
export function canAdvanceProcessing(status) {
  const st = normalizeSampleStatus(status);
  return st === 'Received' || st === 'Processing';
}

/** Aliquot (Chiết mẫu phụ): chỉ thực hiện sau khi Lab đã tiếp nhận mẫu và trước khi chạy máy (Received / Processing). */
export function canCreateAliquot(status) {
  const st = normalizeSampleStatus(status);
  return st === 'Received' || st === 'Processing';
}

/**
 * Enter / edit results: chỉ khi mẫu đã vào bước Đang xét nghiệm (Testing) hoặc Yêu cầu chạy lại (RerunRequested).
 * Completed / WaitingReview / Rejected → chỉ xem (không nhập lại).
 */
export function canEnterTestResults(status) {
  const st = normalizeSampleStatus(status);
  return st === 'Testing' || st === 'RerunRequested';
}

export function canViewTestResults(status) {
  const st = normalizeSampleStatus(status);
  return st === 'Completed' || st === 'WaitingReview';
}

export function canRejectSample(status) {
  const st = normalizeSampleStatus(status);
  if (!st || st === 'Rejected' || st === 'Completed' || st === 'WaitingReview') return false;
  return true;
}

/** QC validate tube: only before Processing */
export function canValidateSampleQc(status) {
  const st = normalizeSampleStatus(status);
  return st === 'Collected' || st === 'InTransit' || st === 'Received';
}

/**
 * Queue UI chuẩn luồng 1 chiều ISO 15189 (không nhảy cóc, không chồng chéo chức năng):
 * - PendingCollection       → Lấy Mẫu (+ từ chối)
 * - Collected / InTransit   → Tiếp nhận Lab (điều hướng sang /laboratory/checkinsample)
 * - Received / Processing   → Bắt đầu XN (+ Chiết mẫu)
 * - Testing / RerunRequested→ Nhập KQ (điều hướng sang /laboratory/enter-test-results)
 * - Completed / WaitingReview → Xem KQ
 */
export function primaryForwardAction(status) {
  const st = normalizeSampleStatus(status);
  switch (st) {
    case 'PendingCollection':
      return { next: 'Collected', label: 'Lấy Mẫu', kind: 'collect' };
    case 'Collected':
    case 'InTransit':
      return { next: 'Received', label: 'Tiếp nhận Lab', kind: 'receive' };
    case 'Received':
    case 'Processing':
      return { next: 'Testing', label: 'Bắt đầu XN', kind: 'startTesting' };
    case 'Testing':
    case 'RerunRequested':
      return { next: null, label: 'Nhập KQ', kind: 'enter' };
    case 'Completed':
    case 'WaitingReview':
      return { next: null, label: 'Xem KQ', kind: 'view' };
    case 'Rejected':
      return { next: null, label: 'Đã từ chối', kind: 'terminal' };
    default:
      return { next: null, label: '—', kind: 'none' };
  }
}

/** Chỉ cho phép chuyển sang Testing từ bước đã tiếp nhận Lab (Received / Processing) — không nhảy cóc từ Collected. */
export function pathToTesting(fromStatus) {
  const st = normalizeSampleStatus(fromStatus);
  switch (st) {
    case 'Received':
    case 'Processing':
      return ['Testing'];
    default:
      return null;
  }
}

export function canStartTesting(status) {
  return pathToTesting(status) !== null && pathToTesting(status).length > 0;
}
