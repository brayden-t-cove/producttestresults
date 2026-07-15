import { useState, useEffect } from 'react';
import {
  adminGetUsers, adminPatchUser,
  adminGetDomains, adminCreateDomain, adminDeleteDomain,
  adminGetDomainRequests, adminApproveDomainRequest, adminDenyDomainRequest,
} from '../lib/authApi.js';
import { adminGetPendingProducts, adminApprovePendingProduct, adminRejectPendingProduct, getCatalogParents, adminGetSubmissions, adminUpdateSubmission, adminDeleteSubmission } from '../lib/api.js';

const ENTITIES = ['Cove', 'Luna', 'Alder', 'InstaVision'];
const ROLES = ['viewer', 'analyst', 'editor', 'designer', 'superuser'];

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
  const [pendingProducts, setPendingProducts] = useState([]);
  const [parentModels, setParentModels] = useState([]);
  const [submissions, setSubmissions] = useState([]);

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    setLoading(true);
    try {
      const [u, d, r, pend, pars, subs] = await Promise.all([
        adminGetUsers(), adminGetDomains(), adminGetDomainRequests(),
        adminGetPendingProducts(), getCatalogParents(), adminGetSubmissions(),
      ]);
      setUsers(u); setDomains(d); setRequests(r);
      setPendingProducts(pend); setParentModels(pars); setSubmissions(subs);
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
          { id: 'pending',  label: `Pending Products${pendingProducts.length > 0 ? ` (${pendingProducts.length})` : ''}` },
          { id: 'submissions', label: `Change Notices${submissions.filter(s => s.status === 'pending').length > 0 ? ` (${submissions.filter(s => s.status === 'pending').length})` : ''}` },
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

      {/* ── Change Notices ── */}
      {tab === 'submissions' && !loading && (
        <div>
          <h3 style={{ marginBottom: 16, fontSize: 16, fontWeight: 700 }}>Vendor Change Notices</h3>
          {submissions.length === 0 ? (
            <div style={{ color: 'var(--text-muted)', fontSize: 14, padding: '24px 0' }}>No submissions yet.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {submissions.map(s => (
                <SubmissionRow
                  key={s.id}
                  submission={s}
                  onReview={async (id) => {
                    const updated = await adminUpdateSubmission(id, { status: 'reviewed' });
                    setSubmissions(prev => prev.map(x => x.id === id ? updated : x));
                  }}
                  onDismiss={async (id) => {
                    await adminDeleteSubmission(id);
                    setSubmissions(prev => prev.filter(x => x.id !== id));
                  }}
                />
              ))}
            </div>
          )}
        </div>
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

  return (
    <div className="pending-product-card" style={{ opacity: isReviewed ? 0.6 : 1 }}>
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', flex: 1 }}>
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
            <strong>{s.changeType}</strong> · {s.vendorName} ({s.vendorEmail}) · {s.entity} · {formatDate(s.submittedAt)}
          </div>
          <div style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{s.description}</div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 12, justifyContent: 'flex-end' }}>
        {!isReviewed && (
          <button className="btn btn-primary btn-sm" onClick={() => onReview(s.id)}>Mark Reviewed</button>
        )}
        <button className="btn btn-ghost btn-sm" style={{ color: 'var(--fail)', fontSize: 12 }} onClick={() => onDismiss(s.id)}>
          Dismiss
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
