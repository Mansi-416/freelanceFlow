http://localhost:5173/const API_BASE = '/api';

function getAuthHeaders(token) {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request(path, token, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(token),
    },
    ...options,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw data || { error: 'Request failed' };
  return data;
}

export function register(payload) {
  return request('/auth/register', null, { method: 'POST', body: payload });
}

export function login(payload) {
  return request('/auth/login', null, { method: 'POST', body: payload });
}

export function fetchClients(token) {
  return request('/clients', token);
}

export function fetchProjects(token) {
  return request('/projects', token);
}

export function fetchTasks(token) {
  return request('/tasks', token);
}

export function fetchTimeEntries(token) {
  return request('/time-entries', token);
}

export function fetchInvoices(token) {
  return request('/invoices', token);
}

export function fetchDashboard(token) {
  return request('/dashboard/revenue', token);
}

export function fetchFinancials(token) {
  return request('/dashboard/financials', token);
}

export function createClient(token, payload) {
  return request('/clients', token, { method: 'POST', body: payload });
}

export function createProject(token, payload) {
  return request('/projects', token, { method: 'POST', body: payload });
}

export function createTask(token, payload) {
  return request('/tasks', token, { method: 'POST', body: payload });
}

export function createTimeEntry(token, payload) {
  return request('/time-entries', token, { method: 'POST', body: payload });
}

export function getProjectBurnRate(token, projectId) {
  return request(`/time-entries/project/${projectId}`, token);
}

export function toggleBillable(token, entryId) {
  return request(`/time-entries/${entryId}/toggle-billable`, token, { method: 'PATCH' });
}

export function toggleInvoicePaid(token, invoiceId, paid) {
  return request(`/invoices/${invoiceId}`, token, { method: 'PATCH', body: { paid } });
}

export function upgradePlan(token, plan) {
  return request('/auth/plan', token, { method: 'PATCH', body: { plan } });
}

export function fetchUnbilledTimeEntries(token, query = {}) {
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      params.set(key, value);
    }
  });
  const queryString = params.toString();
  return request(`/invoices/unbilled${queryString ? `?${queryString}` : ''}`, token);
}

export function createInvoice(token, payload) {
  return request('/invoices', token, { method: 'POST', body: payload });
}

export function downloadInvoicePdf(token, invoiceId) {
  return fetch(`${API_BASE}/invoices/${invoiceId}/pdf`, {
    headers: getAuthHeaders(token),
  });
}
