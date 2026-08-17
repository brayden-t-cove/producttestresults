import React, { useState, useEffect } from 'react';
import {
  adminGetUsers, adminPatchUser, adminCreateUser, adminDeleteUser,
  adminGetDomains, adminCreateDomain, adminDeleteDomain,
  adminGetDomainRequests, adminApproveDomainRequest, adminDenyDomainRequest,
  adminGetRoleDefaults, adminSaveRoleDefaults,
} from '../lib/authApi.js';
import { PERMISSION_REGISTRY, DEFAULT_ROLE_PERMISSIONS } from '../data/permissions.js';
import { adminGetPendingProducts, adminApprovePendingProduct, adminRejectPendingProduct, getCatalogParents, adminGetSubmissions, adminUpdateSubmission, adminDeleteSubmission, listSessions, listTestItems, listTestPlanPresets, createTestPlanPreset, updateTestPlanPreset, deleteTestPlanPreset } from '../lib/api.js';
import TestItemLibrary from './TestItemLibrary.jsx';

const ENTITIES = ['Cove', 'Luna', 'Alder', 'InstaVision'];
const ROLES = ['viewer', 'analyst', 'editor', 'designer', 'project-manager', 'superuser'];

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function AdminPanel({ currentUser, onBack }) {
  const [tab, setTab] = useState('requests');
  const [users, setUsers] = useState([]);
  const [domains, setDomains] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // New user form
  const [newUser, setNewUser] = useState({ email: '', name: '', role: 'viewer', entity: '' });
  const [newUserError, setNewUserError] = useState('');
  const [newUserSaving, setNewUserSaving] = useState(false);

  // New domain form
  const [newDomain, setNewDomain] = useState('');
  const [newEntity, setNewEntity] = useState('Cove');
  const [pendingProducts, setPendingProducts] = useState([]);
  const [parentModels, setParentModels] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [roleDefaults, setRoleDefaults] = useState(null);
  const [permSaving, setPermSaving] = useState(false);
  const [permSaved, setPermSaved] = useState(false);
  const [expandedUser, setExpandedUser] = useState(null);

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    setLoading(true);
    try {
      const [u, d, r, pend, pars, subs, rd] = await Promise.all([
        adminGetUsers(), adminGetDomains(), adminGetDomainRequests(),
        adminGetPendingProducts(), getCatalogParents(), adminGetSubmissions(),
        adminGetRoleDefaults(),
      ]);
      setUsers(u); setDomains(d); setRequests(r);
      setPendingProducts(pend); setParentModels(pars); setSubmissions(subs);
      setRoleDefaults(rd || DEFAULT_ROLE_PERMISSIONS);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }

  async function handleCreateUser(e) {
    e.preventDefault();
    if (!newUser.email.trim()) { setNewUserError('Email is required.'); return; }
    setNewUserSaving(true); setNewUserError('');
    try {
      const created = await adminCreateUser(newUser);
      setUsers(prev => [created, ...prev]);
      setNewUser({ email: '', name: '', role: 'viewer', entity: '' });
    } catch (err) { setNewUserError(err.message); }
    finally { setNewUserSaving(false); }
  }

  async function handleDeleteUser(userId) {
    if (!confirm('Remove this user? They will lose access on their next login.')) return;
    try {
      await adminDeleteUser(userId);
      setUsers(prev => prev.filter(u => u.id !== userId));
    } catch (e) { setError(e.message); }
  }

  async function handleRoleChange(userId, role) {
    try {
      const updated = await adminPatchUser(userId, { role });
      setUsers(prev => prev.map(u => u.id === userId ? updated : u));
    } catch (e) { setError(e.message); }
  }

  async function handleEntityChange(userId, entity) {
    try {
      const updated = await adminPatchUser(userId, { entity });
      setUsers(prev => prev.map(u => u.id === userId ? updated : u));
    } catch (e) { setError(e.message); }
  }

  async function handleAddDomain(e) {
    e.preventDefault();
    if (!newDomain.trim()) return;
    try {
      const d = await adminCreateDomain(newDomain.trim().toLowerCase(), newEntity);
      setDomains(prev => [...prev.filter(x => x.id !== d.id), d]);
      setNewDomain('');
    } catch (e) { setError(e.message); }
  }

  async function handleDeleteDomain(id) {
    if (!confirm('Remove this domain? Existing users from this domain will keep their access.')) return;
    try {
      await adminDeleteDomain(id);
      setDomains(prev => prev.filter(d => d.id !== id));
    } catch (e) { setError(e.message); }
  }

  async function handleApprove(reqId, role, entity) {
    try {
      await adminApproveDomainRequest(reqId, role, entity);
      setRequests(prev => prev.filter(r => r.id !== reqId));
      await loadAll();
    } catch (e) { setError(e.message); }
  }

  async function handleDeny(reqId) {
    try {
      await adminDenyDomainRequest(reqId);
      setRequests(prev => prev.filter(r => r.id !== reqId));
    } catch (e) { setError(e.message); }
  }

  async function handleSaveRoleDefaults() {
    setPermSaving(true);
    try {
      await adminSaveRoleDefaults(roleDefaults);
      setPermSaved(true);
      setTimeout(() => setPermSaved(false), 2000);
    } catch (e) { setError(e.message); }
    finally { setPermSaving(false); }
  }

  function toggleRolePerm(role, key) {
    setRoleDefaults(prev => ({
      ...prev,
      [role]: { ...(prev[role] || {}), [key]: !((prev[role] || {})[key]) },
    }));
  }

  async function handleUserPermOverride(userId, key, value) {
    const user = users.find(u => u.id === userId);
    if (!user) return;
    if (key === '__clear__') {
      const saved = await adminPatchUser(userId, { permissions: {} });
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, permissions: saved.permissions || {} } : u));
      return;
    }
    const current = user.permissions || {};
    const updated = { ...current, [key]: value };
    const roleDef = (roleDefaults || DEFAULT_ROLE_PERMISSIONS)[user.role] || {};
    if (Boolean(updated[key]) === Boolean(roleDef[key])) delete updated[key];
    const saved = await adminPatchUser(userId, { permissions: updated });
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, permissions: saved.permissions || {} } : u));
  }

  const pendingCount = requests.length;

  return (
    <div className="admin-panel">
      <div className="admin-header">
        <button className="btn btn-ghost btn-sm" onClick={onBack}>← Back</button>
        <h1>Admin Panel</h1>
      </div>

      {error && <div className="error-msg" style={{ marginBottom: 16 }}>{error}</div>}

      <div className="admin-tabs">
        {[
          { id: 'requests', label: `Access Requests${pendingCount > 0 ? ` (${pendingCount})` : ''}` },
          { id: 'users',    label: 'Users' },
          { id: 'domains',  label: 'Domains' },
          { id: 'pending',  label: `Pending Products${pendingProducts.length > 0 ? ` (${pendingProducts.length})` : ''}` },
          { id: 'submissions', label: `Submissions${submissions.filter(s => s.status === 'pending').length > 0 ? ` (${submissions.filter(s => s.status === 'pending').length})` : ''}` },
          { id: 'formlinks',   label: 'Form Links' },
          { id: 'permissions', label: 'Permissions' },
          { id: 'testlibrary', label: 'Test Library' },
          { id: 'presets',     label: 'Plan Templates' },
          { id: 'legacy',      label: 'Legacy Sessions' },
        ].map(t => (
          <button
            key={t.id}
            className={`admin-tab-btn ${tab === t.id ? 'active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading && <div style={{ color: 'var(--text-muted)', padding: '24px 0' }}>Loading...</div>}

      {/* ── Access Requests ── */}
      {tab === 'requests' && !loading && (
        <div>
          {requests.length === 0 ? (
            <div className="empty-state" style={{ padding: '40px 0' }}>
              <p>No pending access requests.</p>
            </div>
          ) : requests.map(r => (
            <RequestRow
              key={r.id}
              request={r}
              onApprove={handleApprove}
              onDeny={handleDeny}
            />
          ))}
        </div>
      )}

      {/* ── Users ── */}
      {tab === 'users' && !loading && (
        <div>
          {/* Add User Form */}
          <form onSubmit={handleCreateUser} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '16px 20px', marginBottom: 20 }}>
            <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 12 }}>Add / Pre-register User</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <input
                placeholder="Email *"
                type="email"
                value={newUser.email}
                onChange={e => setNewUser(v => ({ ...v, email: e.target.value }))}
                style={{ flex: '1 1 180px', fontSize: 13 }}
                required
              />
              <input
                placeholder="Display name"
                value={newUser.name}
                onChange={e => setNewUser(v => ({ ...v, name: e.target.value }))}
                style={{ flex: '1 1 140px', fontSize: 13 }}
              />
              <select value={newUser.entity} onChange={e => setNewUser(v => ({ ...v, entity: e.target.value }))} style={{ flex: '0 0 130px', fontSize: 13 }}>
                <option value="">— Entity —</option>
                {ENTITIES.map(en => <option key={en} value={en}>{en}</option>)}
              </select>
              <select value={newUser.role} onChange={e => setNewUser(v => ({ ...v, role: e.target.value }))} style={{ flex: '0 0 150px', fontSize: 13 }}>
                {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
              <button type="submit" className="btn btn-primary btn-sm" disabled={newUserSaving} style={{ whiteSpace: 'nowrap' }}>
                {newUserSaving ? 'Adding…' : '+ Add User'}
              </button>
            </div>
            {newUserError && <div style={{ color: 'var(--fail)', fontSize: 12, marginTop: 8 }}>{newUserError}</div>}
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8 }}>
              Pre-registered users are provisioned with their role before first login. If the email already exists, their role and entity will be updated.
            </div>
          </form>

          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Provider</th>
                  <th>Entity</th>
                  <th>Role</th>
                  <th>Last login</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <React.Fragment key={u.id}>
                  <tr>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        {u.avatar && <img src={u.avatar} alt="" style={{ width: 28, height: 28, borderRadius: '50%' }} />}
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 13 }}>{u.name || <span style={{ color: 'var(--text-muted)' }}>—</span>}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{u.email}</div>
                          {u.provider === 'pre-registered' && (
                            <div style={{ fontSize: 10, color: '#f59e0b', fontWeight: 600 }}>⏳ Awaiting first login</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'capitalize' }}>{u.provider === 'pre-registered' ? '—' : u.provider}</td>
                    <td>
                      <select
                        value={u.entity || ''}
                        onChange={e => handleEntityChange(u.id, e.target.value || null)}
                        style={{ fontSize: 12 }}
                      >
                        <option value="">— None —</option>
                        {ENTITIES.map(en => <option key={en} value={en}>{en}</option>)}
                      </select>
                    </td>
                    <td>
                      <select
                        value={u.role}
                        onChange={e => handleRoleChange(u.id, e.target.value)}
                        disabled={u.email === currentUser.email}
                        style={{ fontSize: 12 }}
                      >
                        {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                      </select>
                    </td>
                    <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{u.last_login ? formatDate(u.last_login) : '—'}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        <button className="btn btn-ghost btn-sm" onClick={() => setExpandedUser(expandedUser === u.id ? null : u.id)}>
                          {expandedUser === u.id ? 'Close' : 'Override'}
                        </button>
                        {u.email !== currentUser.email && (
                          <button className="btn btn-ghost btn-sm" style={{ color: 'var(--fail)' }} onClick={() => handleDeleteUser(u.id)}>Remove</button>
                        )}
                      </div>
                    </td>
                  </tr>
                  {expandedUser === u.id && (
                    <tr key={`${u.id}-perms`}>
                      <td colSpan={6} style={{ background: 'var(--surface)', padding: '12px 16px' }}>
                        <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 10 }}>
                          Permission Overrides for {u.name || u.email}
                          <span style={{ fontWeight: 400, color: 'var(--text-muted)', marginLeft: 8 }}>
                            Highlighted = overridden from role default
                          </span>
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                          {PERMISSION_REGISTRY.map(p => {
                            const roleVal = Boolean(((roleDefaults || DEFAULT_ROLE_PERMISSIONS)[u.role] || {})[p.key]);
                            const override = u.permissions || {};
                            const isOverridden = p.key in override;
                            const effectiveVal = isOverridden ? Boolean(override[p.key]) : roleVal;
                            return (
                              <label key={p.key} style={{
                                display: 'flex', alignItems: 'center', gap: 6, fontSize: 12,
                                padding: '4px 10px', borderRadius: 6, cursor: 'pointer',
                                border: `1px solid ${isOverridden ? 'var(--primary)' : 'var(--border)'}`,
                                background: isOverridden ? 'var(--primary-dim)' : 'var(--card)',
                                color: isOverridden ? 'var(--primary)' : 'var(--text)',
                              }}>
                                <input
                                  type="checkbox"
                                  checked={effectiveVal}
                                  style={{ width: 'auto', cursor: 'pointer' }}
                                  onChange={e => handleUserPermOverride(u.id, p.key, e.target.checked)}
                                />
                                {p.label}
                                {isOverridden && <span style={{ fontSize: 10, opacity: 0.7 }}>(override)</span>}
                              </label>
                            );
                          })}
                          {Object.keys(u.permissions || {}).length > 0 && (
                            <button
                              className="btn btn-ghost btn-sm"
                              style={{ fontSize: 11 }}
                              onClick={() => handleUserPermOverride(u.id, '__clear__', null)}
                            >
                              Clear all overrides
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Domains ── */}
      {tab === 'domains' && !loading && (
        <div>
          <form onSubmit={handleAddDomain} style={{ display: 'flex', gap: 8, marginBottom: 20, alignItems: 'flex-end' }}>
            <div className="form-group" style={{ marginBottom: 0, flex: 1 }}>
              <label>Add Domain</label>
              <input
                type="text"
                placeholder="e.g. example.com"
                value={newDomain}
                onChange={e => setNewDomain(e.target.value)}
              />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Entity</label>
              <select value={newEntity} onChange={e => setNewEntity(e.target.value)}>
                {ENTITIES.map(en => <option key={en} value={en}>{en}</option>)}
              </select>
            </div>
            <button type="submit" className="btn btn-primary btn-sm" disabled={!newDomain.trim()}>
              Add
            </button>
          </form>

          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr><th>Domain</th><th>Entity</th><th>Added</th><th></th></tr>
              </thead>
              <tbody>
                {domains.map(d => (
                  <tr key={d.id}>
                    <td style={{ fontWeight: 600, fontSize: 13 }}>{d.domain}</td>
                    <td>{d.entity}</td>
                    <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{formatDate(d.created_at)}</td>
                    <td>
                      <button
                        className="btn btn-ghost btn-sm"
                        style={{ color: 'var(--fail)', fontSize: 12 }}
                        onClick={() => handleDeleteDomain(d.id)}
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Submissions ── */}
      {tab === 'submissions' && !loading && (
        <div>
          {submissions.length === 0 ? (
            <div style={{ color: 'var(--text-muted)', fontSize: 14, padding: '24px 0' }}>No submissions yet.</div>
          ) : (
            ['product-inquiry', 'product-specs', 'change-notice'].map(formType => {
              const group = submissions.filter(s => s.formType === formType);
              if (group.length === 0) return null;
              const label = formType === 'product-inquiry' ? 'Product Inquiries' : formType === 'product-specs' ? 'Spec Sheets' : 'Change Notices';
              return (
                <div key={formType} style={{ marginBottom: 32 }}>
                  <h3 style={{ marginBottom: 12, fontSize: 15, fontWeight: 700 }}>{label}</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {group.map(s => (
                      <SubmissionRow
                        key={s.id}
                        submission={s}
                        onReview={async (id, entities) => {
                          const updated = await adminUpdateSubmission(id, { status: 'reviewed', entities });
                          setSubmissions(prev => prev.map(x => x.id === id ? updated : x));
                        }}
                        onDismiss={async (id) => {
                          await adminDeleteSubmission(id);
                          setSubmissions(prev => prev.filter(x => x.id !== id));
                        }}
                      />
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ── Form Links ── */}
      {tab === 'formlinks' && !loading && (
        <div>
          <h3 style={{ marginBottom: 4, fontSize: 16, fontWeight: 700 }}>Vendor Submission Links</h3>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 24 }}>Copy these links to share with vendors directly via email.</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <FormLinkCard
              title="Form 1 — Product Inquiry"
              description="For vendors submitting a camera product they'd like evaluated on the platform."
              path="/submit/product-inquiry"
            />
            <FormLinkCard
              title="Form 2 — Product Spec Sheet"
              description="Full technical spec sheet — mirrors the catalog tech specs fields. Send when you need the vendor to fill out the complete product details."
              path="/submit/product-specs"
            />
            <FormLinkCard
              title="Form 3 — Product Change Notice"
              description="For vendors notifying us of changes to a product already in our catalog or under evaluation."
              path="/submit/change-notice"
            />
          </div>
        </div>
      )}

      {/* ── Permissions ── */}
      {tab === 'permissions' && !loading && roleDefaults && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15 }}>Role Permission Defaults</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                Check/uncheck permissions per role. Individual user overrides are set in the Users tab.
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              {permSaved && <span style={{ color: 'var(--pass)', fontSize: 13 }}>&#10003; Saved</span>}
              <button className="btn btn-primary" onClick={handleSaveRoleDefaults} disabled={permSaving}>
                {permSaving ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </div>

          {(() => {
            const ROLES_LIST = ['viewer', 'analyst', 'editor', 'designer', 'project-manager', 'superuser'];
            const groups = [...new Set(PERMISSION_REGISTRY.map(p => p.group))];
            return (
              <div style={{ overflowX: 'auto' }}>
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th style={{ minWidth: 180 }}>Permission</th>
                      {ROLES_LIST.map(r => <th key={r} style={{ textAlign: 'center', textTransform: 'capitalize', whiteSpace: 'nowrap' }}>{r}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {groups.map(group => (
                      <>
                        <tr key={`group-${group}`}>
                          <td colSpan={ROLES_LIST.length + 1} style={{ fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', background: 'var(--surface)', paddingTop: 10, paddingBottom: 10 }}>
                            {group}
                          </td>
                        </tr>
                        {PERMISSION_REGISTRY.filter(p => p.group === group).map(p => (
                          <tr key={p.key}>
                            <td style={{ fontSize: 13 }}>{p.label}</td>
                            {ROLES_LIST.map(r => (
                              <td key={r} style={{ textAlign: 'center' }}>
                                <input
                                  type="checkbox"
                                  checked={Boolean((roleDefaults[r] || {})[p.key])}
                                  onChange={() => toggleRolePerm(r, p.key)}
                                  style={{ width: 'auto', cursor: 'pointer' }}
                                />
                              </td>
                            ))}
                          </tr>
                        ))}
                      </>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          })()}
        </div>
      )}

      {/* ── Test Library ── */}
      {tab === 'testlibrary' && (
        <TestItemLibrary
          canEdit={['editor', 'project-manager', 'superuser'].includes(currentUser?.role)}
          isSuperuser={currentUser?.role === 'superuser'}
        />
      )}

      {/* ── Plan Templates ── */}
      {tab === 'presets' && (
        <PlanTemplatesTab />
      )}

      {/* ── Legacy Sessions ── */}
      {tab === 'legacy' && (
        <LegacySessionsTab />
      )}

      {/* ── Pending Products ── */}
      {tab === 'pending' && !loading && (
        <div>
          <h3 style={{ marginBottom: 16, fontSize: 16, fontWeight: 700 }}>Pending Product Review</h3>
          {pendingProducts.length === 0 ? (
            <div style={{ color: 'var(--text-muted)', fontSize: 14, padding: '24px 0' }}>No products pending review.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {pendingProducts.map(p => (
                <PendingProductRow
                  key={p.id}
                  product={p}
                  parents={parentModels}
                  onApprove={async (id, patch) => {
                    await adminApprovePendingProduct(id, patch);
                    setPendingProducts(prev => prev.filter(x => x.id !== id));
                  }}
                  onReject={async (id) => {
                    await adminRejectPendingProduct(id);
                    setPendingProducts(prev => prev.filter(x => x.id !== id));
                  }}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const PRODUCT_TYPES = ['camera', 'hub', 'sensor', 'touchpad', 'app'];
const INTENTS = [
  { id: 'smoke', label: 'Smoke Test' },
  { id: 'intake', label: 'New Product Intake' },
  { id: 'regression', label: 'Full Regression' },
  { id: 'feature', label: 'Feature Validation' },
];

function PlanTemplatesTab() {
  const [presets, setPresets] = useState([]);
  const [libraryItems, setLibraryItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', productType: '', intentType: '', description: '', itemIds: [] });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [expandedPreset, setExpandedPreset] = useState(null);
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState('');

  useEffect(() => {
    Promise.all([listTestPlanPresets(), listTestItems({ status: 'active' })])
      .then(([p, items]) => { setPresets(p); setLibraryItems(items); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const categories = [...new Set(libraryItems.map(i => i.category))].sort();

  const filteredLib = libraryItems.filter(item => {
    if (filterCat && item.category !== filterCat) return false;
    if (search) {
      const q = search.toLowerCase();
      return item.name.toLowerCase().includes(q) || item.category.toLowerCase().includes(q);
    }
    return true;
  });

  const libByCategory = filteredLib.reduce((acc, i) => { (acc[i.category] = acc[i.category] || []).push(i); return acc; }, {});
  const selectedIds = new Set(form.itemIds);

  function startCreate() {
    setEditing(null);
    setForm({ name: '', productType: '', intentType: '', description: '', itemIds: [] });
    setShowForm(true);
  }

  function startEdit(preset) {
    setEditing(preset);
    setForm({ name: preset.name, productType: preset.productType, intentType: preset.intentType || '', description: preset.description || '', itemIds: [...(preset.itemIds || [])] });
    setShowForm(true);
  }

  function toggleItem(id) {
    setForm(f => ({ ...f, itemIds: f.itemIds.includes(id) ? f.itemIds.filter(x => x !== id) : [...f.itemIds, id] }));
  }

  function addCategory(catItems) {
    const ids = catItems.map(i => i.id).filter(id => !selectedIds.has(id));
    setForm(f => ({ ...f, itemIds: [...f.itemIds, ...ids] }));
  }

  function removeCategory(cat) {
    const catIds = new Set(libraryItems.filter(i => i.category === cat).map(i => i.id));
    setForm(f => ({ ...f, itemIds: f.itemIds.filter(id => !catIds.has(id)) }));
  }

  async function handleSave() {
    if (!form.name.trim() || !form.productType) { setError('Name and product type are required.'); return; }
    setSaving(true);
    try {
      if (editing) {
        const updated = await updateTestPlanPreset(editing.id, form);
        setPresets(all => all.map(p => p.id === updated.id ? updated : p));
      } else {
        const created = await createTestPlanPreset(form);
        setPresets(all => [created, ...all]);
      }
      setShowForm(false);
      setEditing(null);
    } catch (e) { setError(e.message); }
    finally { setSaving(false); }
  }

  async function handleDelete(preset) {
    if (!confirm(`Delete template "${preset.name}"?`)) return;
    try {
      await deleteTestPlanPreset(preset.id);
      setPresets(all => all.filter(p => p.id !== preset.id));
    } catch (e) { setError(e.message); }
  }

  if (loading) return <div style={{ color: 'var(--text-muted)', fontSize: 14 }}>Loading…</div>;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, flex: 1 }}>Plan Templates</h3>
        {!showForm && <button className="btn btn-primary btn-sm" onClick={startCreate}>+ New Template</button>}
      </div>
      <p style={{ margin: '0 0 16px', fontSize: 13, color: 'var(--text-muted)' }}>
        Templates pre-fill the Build & Run plan step. Scoped by product type so testers only see relevant ones.
      </p>

      {error && <div className="error-msg" style={{ marginBottom: 12 }}>{error}</div>}

      {showForm && (
        <div style={{ border: '1px solid var(--border)', borderRadius: 10, padding: 20, marginBottom: 20, background: 'var(--surface)' }}>
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 14 }}>{editing ? 'Edit Template' : 'New Template'}</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
            <div className="form-group" style={{ margin: 0, gridColumn: '1 / -1' }}>
              <label>Template Name <span className="req">*</span></label>
              <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Camera — Full Regression" />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label>Product Type <span className="req">*</span></label>
              <select value={form.productType} onChange={e => setForm(f => ({ ...f, productType: e.target.value }))}>
                <option value="">— Select —</option>
                {PRODUCT_TYPES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
              </select>
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label>Intent <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>(optional)</span></label>
              <select value={form.intentType} onChange={e => setForm(f => ({ ...f, intentType: e.target.value }))}>
                <option value="">— Any intent —</option>
                {INTENTS.map(i => <option key={i.id} value={i.id}>{i.label}</option>)}
              </select>
            </div>
            <div className="form-group" style={{ margin: 0, gridColumn: '1 / -1' }}>
              <label>Description</label>
              <input type="text" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Brief description shown in the template picker" />
            </div>
          </div>

          {/* Item picker */}
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>
            Test Items <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>({form.itemIds.length} selected)</span>
          </div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
            <input type="text" placeholder="Search items…" value={search} onChange={e => setSearch(e.target.value)} style={{ flex: 1, fontSize: 12 }} />
            <select value={filterCat} onChange={e => setFilterCat(e.target.value)} style={{ fontSize: 12 }}>
              <option value="">All categories</option>
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div style={{ border: '1px solid var(--border)', borderRadius: 8, maxHeight: 360, overflowY: 'auto' }}>
            {Object.entries(libByCategory).sort(([a], [b]) => a.localeCompare(b)).map(([cat, catItems]) => {
              const allSel = catItems.every(i => selectedIds.has(i.id));
              return (
                <div key={cat}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 12px', background: 'var(--bg)', borderBottom: '1px solid var(--border)', position: 'sticky', top: 0 }}>
                    <span style={{ flex: 1, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{cat}</span>
                    {!allSel
                      ? <button type="button" className="btn btn-ghost btn-sm" style={{ fontSize: 10 }} onClick={() => addCategory(catItems)}>+ All</button>
                      : <button type="button" className="btn btn-ghost btn-sm" style={{ fontSize: 10, color: 'var(--text-muted)' }} onClick={() => removeCategory(cat)}>Remove all</button>
                    }
                  </div>
                  {catItems.map(item => (
                    <label key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px 6px 20px', borderBottom: '1px solid var(--border)', cursor: 'pointer' }}>
                      <input type="checkbox" checked={selectedIds.has(item.id)} onChange={() => toggleItem(item.id)} />
                      <span style={{ fontSize: 12 }}>{item.name}</span>
                    </label>
                  ))}
                </div>
              );
            })}
          </div>

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 14 }}>
            <button className="btn btn-ghost btn-sm" onClick={() => { setShowForm(false); setEditing(null); setError(''); }}>Cancel</button>
            <button className="btn btn-primary btn-sm" onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Save Template'}</button>
          </div>
        </div>
      )}

      {presets.length === 0 && !showForm ? (
        <div style={{ color: 'var(--text-muted)', fontSize: 14, padding: '24px 0' }}>No templates yet. Create one above.</div>
      ) : (
        presets.map(preset => (
          <div key={preset.id} style={{ border: '1px solid var(--border)', borderRadius: 8, marginBottom: 8, background: 'var(--surface)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', cursor: 'pointer' }} onClick={() => setExpandedPreset(e => e === preset.id ? null : preset.id)}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{preset.name}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                  {preset.productType} {preset.intentType ? `· ${INTENTS.find(i => i.id === preset.intentType)?.label}` : ''} · {(preset.itemIds || []).length} tests
                </div>
              </div>
              <button className="btn btn-ghost btn-sm" style={{ fontSize: 11 }} onClick={e => { e.stopPropagation(); startEdit(preset); }}>Edit</button>
              <button className="btn btn-ghost btn-sm" style={{ fontSize: 11, color: 'var(--fail)' }} onClick={e => { e.stopPropagation(); handleDelete(preset); }}>Delete</button>
              <span style={{ fontSize: 14, color: 'var(--text-muted)' }}>{expandedPreset === preset.id ? '−' : '+'}</span>
            </div>
            {expandedPreset === preset.id && (
              <div style={{ padding: '0 14px 12px', borderTop: '1px solid var(--border)', fontSize: 12 }}>
                {preset.description && <p style={{ marginTop: 10, color: 'var(--text-muted)' }}>{preset.description}</p>}
                <div style={{ marginTop: 8, color: 'var(--text-muted)' }}>
                  {(preset.itemIds || []).length} test items selected
                </div>
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}

function LegacySessionsTab() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    listSessions()
      .then(all => setSessions(all.filter(s => s.type !== 'buffet')))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ color: 'var(--text-muted)', fontSize: 14 }}>Loading…</div>;

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <h3 style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 700 }}>Legacy Sessions</h3>
        <p style={{ margin: 0, fontSize: 13, color: 'var(--text-muted)' }}>
          Read-only archive of all sessions created before the buffet system. {sessions.length} session{sessions.length !== 1 ? 's' : ''}.
        </p>
      </div>
      {sessions.length === 0 ? (
        <div style={{ color: 'var(--text-muted)', fontSize: 14, padding: '24px 0' }}>No legacy sessions found.</div>
      ) : (
        sessions.map(s => (
          <div key={s.id} style={{ border: '1px solid var(--border)', borderRadius: 8, marginBottom: 8, background: 'var(--surface)' }}>
            <div
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', cursor: 'pointer' }}
              onClick={() => setExpanded(e => e === s.id ? null : s.id)}
            >
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 500, fontSize: 13 }}>{s.sessionName || s.productName || s.id}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                  {s.type} · {s.testerName || '—'} · {s.createdAt ? new Date(s.createdAt).toLocaleDateString() : '—'}
                  {' · '}{s.testCaseCount ?? 0} tests · {s.passCount ?? 0}P / {s.failCount ?? 0}F
                </div>
              </div>
              <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 10, background: 'var(--bg)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>{s.status}</span>
              <span style={{ fontSize: 14, color: 'var(--text-muted)' }}>{expanded === s.id ? '−' : '+'}</span>
            </div>
            {expanded === s.id && (
              <div style={{ padding: '0 14px 14px', borderTop: '1px solid var(--border)', fontSize: 12 }}>
                <div style={{ marginTop: 10, color: 'var(--text-muted)' }}>
                  <strong>Product:</strong> {s.productName} &nbsp;|&nbsp; <strong>Firmware:</strong> {s.firmware || '—'} &nbsp;|&nbsp; <strong>Entity:</strong> {s.entity || '—'}
                </div>
                {s.sessionNotes && <div style={{ marginTop: 6, color: 'var(--text)' }}><strong>Notes:</strong> {s.sessionNotes}</div>}
                <div style={{ marginTop: 8, color: 'var(--text-muted)', fontStyle: 'italic' }}>Full test case detail is stored in the database and accessible via export if needed.</div>
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}

function RequestRow({ request, onApprove, onDeny }) {
  const [role, setRole] = useState('viewer');
  const [entity, setEntity] = useState('Cove');

  return (
    <div className="access-request-card">
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 700, fontSize: 14 }}>{request.name}</div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{request.email}</div>
        <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 2 }}>
          Domain: <strong>{request.domain}</strong> · via {request.provider} · {new Date(request.created_at).toLocaleDateString()}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <select value={role} onChange={e => setRole(e.target.value)} style={{ fontSize: 12 }}>
          <option value="viewer">Viewer</option>
          <option value="analyst">Analyst</option>
          <option value="editor">Editor</option>
          <option value="designer">Designer</option>
          <option value="project-manager">Project Manager</option>
          <option value="superuser">Superuser</option>
        </select>
        <select value={entity} onChange={e => setEntity(e.target.value)} style={{ fontSize: 12 }}>
          {['Cove', 'Luna', 'Alder', 'InstaVision'].map(en => (
            <option key={en} value={en}>{en}</option>
          ))}
        </select>
        <button className="btn btn-primary btn-sm" onClick={() => onApprove(request.id, role, entity)}>
          Approve
        </button>
        <button className="btn btn-ghost btn-sm" style={{ color: 'var(--fail)' }} onClick={() => onDeny(request.id)}>
          Deny
        </button>
      </div>
    </div>
  );
}

const URGENCY_COLORS = {
  low:    { bg: 'rgba(100,116,139,0.12)', color: 'var(--text-muted)' },
  normal: { bg: 'var(--primary-dim)',     color: 'var(--primary)' },
  high:   { bg: 'var(--fail-dim)',        color: 'var(--fail)' },
};

function SubmissionRow({ submission: s, onReview, onDismiss }) {
  const urg = URGENCY_COLORS[s.urgency] || URGENCY_COLORS.normal;
  const isReviewed = s.status === 'reviewed';
  const [selectedEntities, setSelectedEntities] = useState(s.entities || []);

  function toggleEntity(en) {
    setSelectedEntities(prev =>
      prev.includes(en) ? prev.filter(e => e !== en) : [...prev, en]
    );
  }

  return (
    <div className="pending-product-card" style={{ opacity: isReviewed ? 0.6 : 1 }}>
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
          <span style={{ fontWeight: 700, fontSize: 14 }}>{s.productName}</span>
          {s.modelNumber && <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{s.modelNumber}</span>}
          <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 99, background: urg.bg, color: urg.color, fontWeight: 600, textTransform: 'capitalize' }}>
            {s.urgency}
          </span>
          {isReviewed && <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 99, background: 'var(--pass-dim)', color: 'var(--pass)', fontWeight: 600 }}>Reviewed</span>}
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>
          {s.formType === 'change-notice'
            ? <><strong>{s.changeType}</strong> · </>
            : s.category ? <><strong>{s.category}</strong>{s.connectivity ? ` · ${s.connectivity}` : ''} · </> : null
          }
          {s.companyName || s.vendorName} — {s.vendorName || s.contactName} ({s.vendorEmail || s.contactEmail}) · {formatDate(s.submittedAt)}
        </div>
        <div style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.5, whiteSpace: 'pre-wrap', marginBottom: 12 }}>{s.description}</div>
        {s.formType === 'product-inquiry' && s.sampleAvailable && (
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>
            Sample: <strong style={{ color: 'var(--text)' }}>
              {s.sampleAvailable === 'yes' ? 'Ready to ship' : s.sampleAvailable === 'soon' ? `Available ${s.sampleEta || 'TBD'}` : 'Not available'}
            </strong>
            {s.sampleNotes && ` — ${s.sampleNotes}`}
          </div>
        )}
        {s.whyFit && (
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>
            <em>Why a fit:</em> {s.whyFit}
          </div>
        )}
        {s.imageLinks?.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
            <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>IMAGES:</span>
            {s.imageLinks.map((url, i) => (
              <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                style={{ fontSize: 12, color: 'var(--primary)', textDecoration: 'underline' }}>
                Link {i + 1}
              </a>
            ))}
          </div>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>AFFECTS:</span>
          {ENTITIES.map(en => (
            <button
              key={en}
              onClick={() => !isReviewed && toggleEntity(en)}
              style={{
                fontSize: 11, padding: '3px 10px', borderRadius: 99, border: '1px solid',
                cursor: isReviewed ? 'default' : 'pointer',
                background: selectedEntities.includes(en) ? 'var(--primary-dim)' : 'transparent',
                borderColor: selectedEntities.includes(en) ? 'var(--primary)' : 'var(--border)',
                color: selectedEntities.includes(en) ? 'var(--primary)' : 'var(--text-muted)',
                fontWeight: selectedEntities.includes(en) ? 700 : 400,
              }}
            >{en}</button>
          ))}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 12, justifyContent: 'flex-end' }}>
        {!isReviewed && (
          <button className="btn btn-primary btn-sm" onClick={() => onReview(s.id, selectedEntities)}>Mark Reviewed</button>
        )}
        <button className="btn btn-ghost btn-sm" style={{ color: 'var(--fail)', fontSize: 12 }} onClick={() => onDismiss(s.id)}>
          Dismiss
        </button>
      </div>
    </div>
  );
}

function FormLinkCard({ title, description, path }) {
  const [copied, setCopied] = useState(false);
  const url = `${window.location.origin}${path}`;

  function copy() {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 10, padding: '16px 20px', background: 'var(--surface)' }}>
      <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>{title}</div>
      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>{description}</div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <code style={{ flex: 1, fontSize: 12, padding: '7px 10px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {url}
        </code>
        <button className="btn btn-primary btn-sm" onClick={copy} style={{ flexShrink: 0 }}>
          {copied ? '✓ Copied' : 'Copy Link'}
        </button>
      </div>
    </div>
  );
}

function PendingProductRow({ product, parents, onApprove, onReject }) {
  const [linkParentId, setLinkParentId] = useState('');
  const [variationLabel, setVariationLabel] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleApprove() {
    setBusy(true);
    try {
      const patch = {};
      if (linkParentId) { patch.parentId = linkParentId; patch.variationLabel = variationLabel || undefined; }
      await onApprove(product.id, patch);
    } finally { setBusy(false); }
  }

  async function handleReject() {
    if (!window.confirm(`Reject and delete "${product.name || product.modelNumber}"?`)) return;
    setBusy(true);
    try { await onReject(product.id); } finally { setBusy(false); }
  }

  return (
    <div className="pending-product-card">
      <div className="pending-product-card-header">
        {product.imageUrl && (
          <img src={product.imageUrl} alt="" style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 8, flexShrink: 0 }}
            onError={e => { e.target.style.display = 'none'; }} />
        )}
        <div className="pending-product-card-info">
          <div className="pending-product-card-name">{product.name || product.modelNumber || 'Unnamed'}</div>
          <div className="pending-product-card-meta">
            {[product.category, product.subclass, product.manufacturer].filter(Boolean).join(' · ')}
          </div>
          <div className="pending-product-card-meta" style={{ marginTop: 4 }}>
            Entity: {Array.isArray(product.entity) ? product.entity.join(', ') : product.entity || '—'}
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ fontSize: 12, fontWeight: 600 }}>Link to platform model <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(optional)</span>:</div>
        <select value={linkParentId} onChange={e => setLinkParentId(e.target.value)} style={{ fontSize: 12 }}>
          <option value="">— Standalone product (no parent) —</option>
          {parents.map(p => (
            <option key={p.id} value={p.id}>{p.name || p.modelNumber} ({p.category})</option>
          ))}
        </select>
        {linkParentId && (
          <input
            className="form-control"
            style={{ fontSize: 12 }}
            placeholder="Variation label (e.g. Dual Band + BLE)"
            value={variationLabel}
            onChange={e => setVariationLabel(e.target.value)}
          />
        )}
      </div>
      <div className="pending-product-card-actions">
        <button className="btn btn-primary btn-sm" onClick={handleApprove} disabled={busy}>Approve</button>
        <button className="btn btn-ghost btn-sm" style={{ color: 'var(--fail)' }} onClick={handleReject} disabled={busy}>Reject</button>
      </div>
    </div>
  );
}
