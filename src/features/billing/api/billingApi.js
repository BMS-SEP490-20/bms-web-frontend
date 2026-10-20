/**
 * UC43 – Medical Invoices & POS Receipt Printing API.
 */

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api';

function authHeaders() {
  const token = localStorage.getItem('accessToken') || localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function handleResponse(res) {
  if (res.ok) return res.json();
  const body = await res.json().catch(() => null);
  const error = new Error(body?.message ?? `HTTP ${res.status}`);
  error.code = body?.code;
  error.status = res.status;
  throw error;
}

export async function getInvoices(params = {}, signal) {
  const query = new URLSearchParams();
  if (params.patientId) query.set('patientId', params.patientId);
  if (params.status !== undefined && params.status !== '') query.set('status', params.status);
  if (params.fromDate) query.set('fromDate', params.fromDate);
  if (params.toDate) query.set('toDate', params.toDate);
  if (params.page) query.set('page', params.page);
  if (params.pageSize) query.set('pageSize', params.pageSize);

  const res = await fetch(`${BASE_URL}/invoices?${query.toString()}`, {
    headers: authHeaders(),
    signal,
  });
  return handleResponse(res);
}

export async function getInvoiceById(id, signal) {
  const res = await fetch(`${BASE_URL}/invoices/${id}`, {
    headers: authHeaders(),
    signal,
  });
  return handleResponse(res);
}

export async function createInvoice(payload, signal) {
  const res = await fetch(`${BASE_URL}/invoices`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(payload),
    signal,
  });
  return handleResponse(res);
}

export async function payInvoice(id, payload, signal) {
  const res = await fetch(`${BASE_URL}/invoices/${id}/pay`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(payload),
    signal,
  });
  return handleResponse(res);
}

export async function getReceiptPrintData(invoiceId, signal) {
  const res = await fetch(`${BASE_URL}/receipts/${invoiceId}/print-data`, {
    headers: authHeaders(),
    signal,
  });
  return handleResponse(res);
}

export async function verifyReceipt(receiptNumber, signal) {
  const res = await fetch(`${BASE_URL}/receipts/verify/${receiptNumber}`, {
    headers: authHeaders(),
    signal,
  });
  return handleResponse(res);
}

export const billingApi = {
  getInvoices,
  getInvoiceById,
  createInvoice,
  payInvoice,
  getReceiptPrintData,
  verifyReceipt,
};
