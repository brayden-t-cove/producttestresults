import { useState, useEffect } from 'react';
import {
  adminGetUsers, adminPatchUser,
  adminGetDomains, adminCreateDomain, adminDeleteDomain,
  adminGetDomainRequests, adminApproveDomainRequest, adminDenyDomainRequest,
} from '../lib/authApi.js';

const ENTITIES = ['Cove', 'Luna', 'Alder', 'InstaVision'];
const ROLES = ['viewer', 'editor', 'superuser'];

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

  // New domain form
  const [newDomain, setNewDomain] = useState('');
  const [newEntity, setNewEntity] = useState('Cove');

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    setLoading(true);
    try {
      const [u, d, r] = await Promise.all([adminGetUsers(), adminGetDomains(), adminGetDomainRequests()]);
      setUsers(u); setDomains(d); setRequests(r);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
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
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Provider</th>
                <th>Entity</th>
                <th>Role</th>
                <th>Last login</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      {u.avatar && <img src={u.avatar} alt="" style={{ width: 28, height: 28, borderRadius: '50%' }} />}
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{u.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{u.email}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'capitalize' }}>{u.provider}</td>
                  <td>
                    <select
                      value={u.entity || ''}
                      onChange={e => handleEntityChange(u.id, e.target.value || null)}
                      disabled={u.email === currentUser.email}
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
                  <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{formatDate(u.last_login)}</td>
                </tr>
              ))}
            </tbody>
          </table>
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
          <option value="editor">Editor</option>
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
