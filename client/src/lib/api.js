const BASE = '/api';

function authHeaders() {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function request(url, options = {}) {
  return fetch(url, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...authHeaders(), ...(options.headers || {}) },
  }).then(async r => {
    if (r.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/';
    }
    const data = await r.json();
    if (!r.ok) {
      return { success: false, error: data.message || `Request failed (${r.status})` };
    }
    return data;
  });
}

function requestForm(url, formData) {
  return fetch(url, {
    method: 'POST',
    headers: authHeaders(),
    body: formData,
  }).then(r => {
    if (r.status === 401) { localStorage.removeItem('token'); window.location.href = '/'; }
    return r.json();
  });
}

export const api = {
  // Auth
  login: (data) => request(`${BASE}/auth/login`, { method: 'POST', body: JSON.stringify(data) }),
  me: () => request(`${BASE}/auth/me`),
  changePassword: (data) => request(`${BASE}/auth/change-password`, { method: 'POST', body: JSON.stringify(data) }),

  // Users (admin)
  getUsers: () => request(`${BASE}/users`),
  createUser: (data) => request(`${BASE}/users`, { method: 'POST', body: JSON.stringify(data) }),
  updateUser: (id, data) => request(`${BASE}/users/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteUser: (id) => request(`${BASE}/users/${id}`, { method: 'DELETE' }),

  // Customers
  getCustomers: () => request(`${BASE}/customers`),
  createCustomer: (data) => request(`${BASE}/customers`, { method: 'POST', body: JSON.stringify(data) }),
  updateCustomer: (id, data) => request(`${BASE}/customers/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteCustomer: (id) => request(`${BASE}/customers/${id}`, { method: 'DELETE' }),

  // Calls
  getCalls: () => request(`${BASE}/calls`),
  getCallStats: () => request(`${BASE}/calls/stats`),
  getSupportTickets: (params = {}) => request(`${BASE}/calls/support-tickets?${new URLSearchParams(params).toString()}`),
  triggerCall: (data) => request(`${BASE}/calls/trigger`, { method: 'POST', body: JSON.stringify(data) }),
  syncCall: (id) => request(`${BASE}/calls/${id}/sync`, { method: 'POST' }),
  analyzeCall: (id) => request(`${BASE}/calls/${id}/analyze`, { method: 'POST' }),
  bulkSyncRecordings: () => request(`${BASE}/calls/bulk-sync-recordings`, { method: 'POST' }),
  syncAllFromBolna: () => request(`${BASE}/calls/bulk-sync-recordings`, { method: 'POST' }),

  // Agents
  getAgents: () => request(`${BASE}/agents`),

  // Agent Configs (Freshdesk etc.)
  getAgentConfig: (agentId) => request(`${BASE}/agent-configs/${agentId}`),
  saveAgentConfig: (agentId, data) => request(`${BASE}/agent-configs/${agentId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),

  // Logs
  getLogs: (params) => request(`${BASE}/logs?${new URLSearchParams(params).toString()}`),

  // Scripts
  getScripts: () => request(`${BASE}/scripts`),
  getScript: (id) => request(`${BASE}/scripts/${id}`),
  generateScript: (data) => request(`${BASE}/scripts/generate`, { method: 'POST', body: JSON.stringify(data) }),
  saveScript: (data) => request(`${BASE}/scripts`, { method: 'POST', body: JSON.stringify(data) }),
  updateScript: (id, data) => request(`${BASE}/scripts/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteScript: (id) => request(`${BASE}/scripts/${id}`, { method: 'DELETE' }),

  // Report Templates
  getReportTemplates: () => request(`${BASE}/report-templates`),
  getReportTemplate: (id) => request(`${BASE}/report-templates/${id}`),
  createReportTemplate: (data) => request(`${BASE}/report-templates`, { method: 'POST', body: JSON.stringify(data) }),
  updateReportTemplate: (id, data) => request(`${BASE}/report-templates/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteReportTemplate: (id) => request(`${BASE}/report-templates/${id}`, { method: 'DELETE' }),

  // Export calls (returns Blob)
  exportCalls: (params) =>
    fetch(`${BASE}/calls/export?${new URLSearchParams(params).toString()}`, {
      headers: authHeaders(),
    }).then(async r => {
      if (r.status === 401) { localStorage.removeItem('token'); window.location.href = '/'; }
      if (!r.ok) {
        const data = await r.json().catch(() => ({}));
        return { success: false, error: data.message || `Export failed (${r.status})` };
      }
      return { success: true, blob: await r.blob(), filename: r.headers.get('Content-Disposition')?.split('filename=')[1]?.replace(/"/g, '') || 'export' };
    }),

  // Batches
  getBatches: () => request(`${BASE}/batches`),
  getBatchStatus: (id) => request(`${BASE}/batches/${id}/status`),
  getBatchExecutions: (id) => request(`${BASE}/batches/${id}/executions`),
  stopBatch: (id) => request(`${BASE}/batches/${id}/stop`, { method: 'POST' }),
  previewCSV: (formData) => requestForm(`${BASE}/batches/preview`, formData),
  createBatch: (formData) => requestForm(`${BASE}/batches`, formData),

  // Scheduled Campaigns
  getScheduledCampaigns: () => request(`${BASE}/scheduled-campaigns`),
  getScheduledCampaign: (id) => request(`${BASE}/scheduled-campaigns/${id}`),
  createScheduledCampaign: (data) => request(`${BASE}/scheduled-campaigns`, { method: 'POST', body: JSON.stringify(data) }),
  updateScheduledCampaign: (id, data) => request(`${BASE}/scheduled-campaigns/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteScheduledCampaign: (id) => request(`${BASE}/scheduled-campaigns/${id}`, { method: 'DELETE' }),

  // Enquiries (leads captured from the marketing website)
  getEnquiries: (status) => request(`${BASE}/enquiries${status ? `?status=${status}` : ''}`),
  getEnquiryStats: () => request(`${BASE}/enquiries/stats`),
  updateEnquiry: (id, data) => request(`${BASE}/enquiries/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteEnquiry: (id) => request(`${BASE}/enquiries/${id}`, { method: 'DELETE' }),
};
