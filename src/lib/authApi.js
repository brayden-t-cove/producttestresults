export async function getMe() {
  const res = await fetch('/api/me');
  if (!res.ok) return { user: null, authEnabled: false };
  return res.json();
}

export async function logout() {
  await fetch('/auth/logout', { method: 'POST' });
}

// Admin
export async function adminGetUsers() {
  const res = await fetch('/api/admin/users');
  if (!res.ok) throw new Error('Failed to load users');
  return res.json();
}

export async function adminPatchUser(id, patch) {
  const res = await fetch(`/api/admin/users/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  });
  if (!res.ok) throw new Error('Failed to update user');
  return res.json();
}

export async function adminCreateUser(data) {
  const res = await fetch('/api/admin/users', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error || 'Failed to create user'); }
  return res.json();
}

export async function adminDeleteUser(id) {
  const res = await fetch(`/api/admin/users/${id}`, { method: 'DELETE' });
  if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error || 'Failed to delete user'); }
}

export async function adminGetDomains() {
  const res = await fetch('/api/admin/domains');
  if (!res.ok) throw new Error('Failed to load domains');
  return res.json();
}

export async function adminCreateDomain(domain, entity) {
  const res = await fetch('/api/admin/domains', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ domain, entity }),
  });
  if (!res.ok) throw new Error('Failed to create domain');
  return res.json();
}

export async function adminDeleteDomain(id) {
  const res = await fetch(`/api/admin/domains/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete domain');
}

export async function adminGetDomainRequests(status = 'pending') {
  const res = await fetch(`/api/admin/domain-requests?status=${status}`);
  if (!res.ok) throw new Error('Failed to load domain requests');
  return res.json();
}

export async function adminApproveDomainRequest(id, role, entity) {
  const res = await fetch(`/api/admin/domain-requests/${id}/approve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ role, entity }),
  });
  if (!res.ok) throw new Error('Failed to approve request');
  return res.json();
}

export async function adminDenyDomainRequest(id) {
  const res = await fetch(`/api/admin/domain-requests/${id}/deny`, { method: 'POST' });
  if (!res.ok) throw new Error('Failed to deny request');
}

export async function adminGetRoleDefaults() {
  const res = await fetch('/api/admin/role-defaults');
  if (!res.ok) return null;
  return res.json();
}

export async function adminSaveRoleDefaults(defaults) {
  const res = await fetch('/api/admin/role-defaults', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(defaults),
  });
  if (!res.ok) throw new Error('Failed to save role defaults');
  return res.json();
}
