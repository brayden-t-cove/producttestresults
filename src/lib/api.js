const BASE = '/api';

export async function listSessions() {
  const res = await fetch(`${BASE}/sessions`);
  if (!res.ok) throw new Error('Failed to list sessions');
  return res.json();
}

export async function getSession(id) {
  const res = await fetch(`${BASE}/sessions/${id}`);
  if (!res.ok) throw new Error('Failed to get session');
  return res.json();
}

export async function createSession(data) {
  const res = await fetch(`${BASE}/sessions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to create session');
  return res.json();
}

export async function updateSession(id, data) {
  const res = await fetch(`${BASE}/sessions/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to update session');
  return res.json();
}

export async function deleteSession(id) {
  const res = await fetch(`${BASE}/sessions/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete session');
  return res.json();
}

export async function aiPopulateTests(data) {
  const res = await fetch(`${BASE}/ai/populate-tests`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'AI populate tests failed');
  }
  return res.json();
}

export async function aiSuggestIssue(data) {
  const res = await fetch(`${BASE}/ai/suggest-issue`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'AI suggest issue failed');
  }
  return res.json();
}

export async function aiWriteRepro(data) {
  const res = await fetch(`${BASE}/ai/write-repro`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'AI write repro failed');
  }
  return res.json();
}

export async function aiSummarize(data) {
  const res = await fetch(`${BASE}/ai/summarize`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'AI summarize failed');
  }
  return res.json();
}

export async function downloadCsvTemplate(type) {
  const res = await fetch(`${BASE}/csv-template/${type}`);
  if (!res.ok) throw new Error('Failed to download template');
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `template-${type}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// catalogId is the preferred param; deviceName kept for backward compat
export async function getFirmwares(deviceName, catalogId) {
  const params = new URLSearchParams();
  if (catalogId) params.set('catalogId', catalogId);
  else if (deviceName) params.set('deviceName', deviceName);
  const res = await fetch(`${BASE}/firmwares?${params.toString()}`);
  return res.json();
}

export async function addFirmware({ catalogId, deviceName, version, binUrl, patchNotes, releasedAt }) {
  const res = await fetch(`${BASE}/firmwares`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ catalogId, deviceName, version, binUrl, patchNotes, releasedAt }),
  });
  if (!res.ok) throw new Error('Failed to save firmware');
  return res.json();
}

export async function updateFirmware(id, patch) {
  const res = await fetch(`${BASE}/firmwares/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  });
  if (!res.ok) throw new Error('Failed to update firmware');
  return res.json();
}

export async function deleteFirmware(id) {
  const res = await fetch(`${BASE}/firmwares/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete firmware');
}

export async function getDevices() {
  const res = await fetch(`${BASE}/devices`);
  return res.json();
}

export async function addDevice(name, category) {
  const res = await fetch(`${BASE}/devices`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, category }),
  });
  if (!res.ok) throw new Error('Failed to save device');
  return res.json();
}

export async function importCsv(csvText, type) {
  const res = await fetch(`${BASE}/csv-import`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ csvText, type }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'CSV import failed');
  }
  return res.json();
}

// ── Catalog ──────────────────────────────────────────────────────────────────

export function exportCatalogCsv() {
  const a = document.createElement('a');
  a.href = `${BASE}/catalog/export/csv`;
  a.download = 'catalog-export.csv';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

export function exportCatalogJson() {
  const a = document.createElement('a');
  a.href = `${BASE}/catalog/export/json`;
  a.download = 'catalog-export.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

export async function getCatalog() {
  const res = await fetch(`${BASE}/catalog`);
  if (!res.ok) throw new Error('Failed to fetch catalog');
  return res.json();
}

export async function getCatalogEntry(id) {
  const res = await fetch(`${BASE}/catalog/${id}`);
  if (!res.ok) throw new Error('Failed to fetch catalog entry');
  return res.json();
}

async function apiThrow(res, context) {
  let body;
  try { body = await res.json(); } catch { body = {}; }
  const code = body.code || `HTTP_${res.status}`;
  const detail = body.detail ? ` — ${body.detail}` : '';
  throw Object.assign(new Error(`[${code}] ${body.error || context}${detail}`), { code, status: res.status, body });
}

export async function createCatalogEntry(data) {
  let res;
  try {
    res = await fetch(`${BASE}/catalog`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  } catch (e) {
    throw Object.assign(new Error(`[NET_ERROR] Cannot reach API server — is it running? (${e.message})`), { code: 'NET_ERROR' });
  }
  if (!res.ok) await apiThrow(res, 'Failed to create catalog entry');
  return res.json();
}

export async function updateCatalogEntry(id, data) {
  let res;
  try {
    res = await fetch(`${BASE}/catalog/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  } catch (e) {
    throw Object.assign(new Error(`[NET_ERROR] Cannot reach API server — is it running? (${e.message})`), { code: 'NET_ERROR' });
  }
  if (!res.ok) await apiThrow(res, 'Failed to update catalog entry');
  return res.json();
}

export async function getDebugInfo() {
  try {
    const res = await fetch(`${BASE}/debug`);
    return res.json();
  } catch (e) {
    return { status: 'unreachable', error: e.message };
  }
}

export async function deleteCatalogEntry(id) {
  const res = await fetch(`${BASE}/catalog/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to delete catalog entry');
  return res.json();
}

export async function getSpecSchema() {
  const res = await fetch(`${BASE}/spec-schema`);
  if (!res.ok) throw new Error('Failed to load spec schema');
  return res.json();
}

export async function saveSpecSchema(schema) {
  const res = await fetch(`${BASE}/spec-schema`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(schema),
  });
  if (!res.ok) throw new Error('Failed to save spec schema');
  return res.json();
}

export async function getCertSchema() {
  const res = await fetch(`${BASE}/cert-schema`);
  if (!res.ok) throw new Error('Failed to load cert schema');
  return res.json();
}

export async function saveCertSchema(schema) {
  const res = await fetch(`${BASE}/cert-schema`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(schema),
  });
  if (!res.ok) throw new Error('Failed to save cert schema');
  return res.json();
}

export async function uploadProductImage(productId, file) {
  const formData = new FormData();
  formData.append('image', file);
  const res = await fetch(`${BASE}/catalog/${productId}/image`, {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || 'Failed to upload image');
  }
  return res.json();
}

export async function deleteProductImage(productId) {
  const res = await fetch(`${BASE}/catalog/${productId}/image`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete image');
  return res.json();
}

export async function getSettings() {
  const res = await fetch(`${BASE}/settings`);
  if (!res.ok) throw new Error('Failed to get settings');
  return res.json();
}

export async function saveSettings(apiKey) {
  const res = await fetch(`${BASE}/settings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ apiKey }),
  });
  if (!res.ok) throw new Error('Failed to save settings');
  return res.json();
}

export async function listComparisons(catalogId) {
  const url = catalogId ? `${BASE}/comparisons?catalogId=${catalogId}` : `${BASE}/comparisons`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to list comparisons');
  return res.json();
}

export async function getComparison(id) {
  const res = await fetch(`${BASE}/comparisons/${id}`);
  if (!res.ok) throw new Error('Failed to get comparison');
  return res.json();
}

export async function createComparison(data) {
  const res = await fetch(`${BASE}/comparisons`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to create comparison');
  return res.json();
}

export async function updateComparison(id, data) {
  const res = await fetch(`${BASE}/comparisons/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to update comparison');
  return res.json();
}

export async function deleteComparison(id) {
  const res = await fetch(`${BASE}/comparisons/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete comparison');
  return res.json();
}

export async function listIssuesForProduct(catalogId) {
  const res = await fetch(`${BASE}/issues?catalogId=${encodeURIComponent(catalogId)}`);
  if (!res.ok) throw new Error('Failed to list issues');
  return res.json();
}

// ── Vendors ──────────────────────────────────────────────────────────────────

export async function listVendors() {
  const res = await fetch(`${BASE}/vendors`);
  if (!res.ok) throw new Error('Failed to list vendors');
  return res.json();
}

export async function getVendor(id) {
  const res = await fetch(`${BASE}/vendors/${id}`);
  if (!res.ok) throw new Error('Failed to get vendor');
  return res.json();
}

export async function createVendor(data) {
  const res = await fetch(`${BASE}/vendors`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to create vendor');
  return res.json();
}

export async function updateVendor(id, data) {
  const res = await fetch(`${BASE}/vendors/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to update vendor');
  return res.json();
}

export async function deleteVendor(id) {
  const res = await fetch(`${BASE}/vendors/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete vendor');
  return res.json();
}

export async function patchIssue(sessionId, issueId, data) {
  const res = await fetch(`${BASE}/sessions/${sessionId}/issues/${issueId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to update issue');
  return res.json();
}

// ── Variations / pending review ───────────────────────────────────────────────

export async function getCatalogParents() {
  const res = await fetch(`${BASE}/catalog/parents`);
  if (!res.ok) return [];
  return res.json();
}

export async function adminGetPendingProducts() {
  const res = await fetch(`${BASE}/admin/pending-products`);
  if (!res.ok) throw new Error('Failed to load pending products');
  return res.json();
}

export async function adminApprovePendingProduct(id, patch = {}) {
  const res = await fetch(`${BASE}/admin/pending-products/${id}/approve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  });
  if (!res.ok) throw new Error('Failed to approve product');
  return res.json();
}

export async function adminRejectPendingProduct(id) {
  const res = await fetch(`${BASE}/admin/pending-products/${id}/reject`, { method: 'POST' });
  if (!res.ok) throw new Error('Failed to reject product');
}

export async function adminGetSubmissions() {
  const res = await fetch(`${BASE}/admin/submissions`);
  if (!res.ok) throw new Error('Failed to load submissions');
  return res.json();
}

export async function adminUpdateSubmission(id, patch) {
  const res = await fetch(`${BASE}/admin/submissions/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  });
  if (!res.ok) throw new Error('Failed to update submission');
  return res.json();
}

export async function adminDeleteSubmission(id) {
  const res = await fetch(`${BASE}/admin/submissions/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete submission');
}

// ── Projects ──────────────────────────────────────────────────────────────────

// ── Test Plan Presets ─────────────────────────────────────────────────────────

export async function listTestPlanPresets(productType) {
  const params = productType ? `?productType=${encodeURIComponent(productType)}` : '';
  const res = await fetch(`${BASE}/test-plan-presets${params}`);
  if (!res.ok) throw new Error('Failed to load presets');
  return res.json();
}

export async function createTestPlanPreset(data) {
  const res = await fetch(`${BASE}/test-plan-presets`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data),
  });
  if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error || 'Failed to create preset'); }
  return res.json();
}

export async function updateTestPlanPreset(id, data) {
  const res = await fetch(`${BASE}/test-plan-presets/${id}`, {
    method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data),
  });
  if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error || 'Failed to update preset'); }
  return res.json();
}

export async function deleteTestPlanPreset(id) {
  const res = await fetch(`${BASE}/test-plan-presets/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete preset');
}

// ── Test Item Categories ──────────────────────────────────────────────────────

export async function getTestItemCategories() {
  const res = await fetch(`${BASE}/test-item-categories`);
  if (!res.ok) throw new Error('Failed to load categories');
  return res.json();
}

export async function saveTestItemCategories(categories) {
  const res = await fetch(`${BASE}/test-item-categories`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ categories }),
  });
  if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error || 'Failed to save'); }
  return res.json();
}

export async function renameTestItemCategory(from, to) {
  const res = await fetch(`${BASE}/test-item-categories/rename`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to }),
  });
  if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error || 'Failed to rename'); }
  return res.json();
}

export async function seedTestItemsFromLegacy() {
  const res = await fetch(`${BASE}/test-items/seed-from-legacy`, { method: 'POST' });
  if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error || 'Seed failed'); }
  return res.json();
}

// ── Test Item Library ─────────────────────────────────────────────────────────

export async function listTestItems({ category, status } = {}) {
  const params = new URLSearchParams();
  if (category) params.set('category', category);
  if (status) params.set('status', status);
  const res = await fetch(`${BASE}/test-items?${params}`);
  if (!res.ok) throw new Error('Failed to load test items');
  return res.json();
}

export async function createTestItem(data) {
  const res = await fetch(`${BASE}/test-items`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error || 'Failed to create test item'); }
  return res.json();
}

export async function updateTestItem(id, data) {
  const res = await fetch(`${BASE}/test-items/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error || 'Failed to update test item'); }
  return res.json();
}

export async function deleteTestItem(id) {
  const res = await fetch(`${BASE}/test-items/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete test item');
}

export async function getProjects() {
  const res = await fetch(`${BASE}/projects`);
  if (!res.ok) throw new Error('Failed to load projects');
  return res.json();
}

export async function getProject(id) {
  const res = await fetch(`${BASE}/projects/${id}`);
  if (!res.ok) throw new Error('Failed to load project');
  return res.json();
}

export async function createProject(data) {
  const res = await fetch(`${BASE}/projects`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to create project');
  return res.json();
}

export async function updateProject(id, data) {
  const res = await fetch(`${BASE}/projects/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to update project');
  return res.json();
}

export async function deleteProject(id) {
  const res = await fetch(`${BASE}/projects/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete project');
}
