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

export async function addFirmware(catalogId, version, deviceName) {
  const res = await fetch(`${BASE}/firmwares`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ catalogId, version, deviceName }),
  });
  if (!res.ok) throw new Error('Failed to save firmware');
  return res.json();
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

export async function createCatalogEntry(data) {
  const res = await fetch(`${BASE}/catalog`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to create catalog entry');
  return res.json();
}

export async function updateCatalogEntry(id, data) {
  const res = await fetch(`${BASE}/catalog/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to update catalog entry');
  return res.json();
}

export async function deleteCatalogEntry(id) {
  const res = await fetch(`${BASE}/catalog/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to delete catalog entry');
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
