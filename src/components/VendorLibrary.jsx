import { useState, useEffect, useRef } from 'react';
import { listVendors, createVendor, updateVendor, deleteVendor } from '../lib/api.js';

const RELATIONSHIP_STATUSES = ['Prospect', 'Active Partner', 'On Hold', 'Former Partner'];
const RELATIONSHIP_COLORS = {
  'Prospect':       { bg: 'rgba(99,102,241,0.10)', color: '#6366f1' },
  'Active Partner': { bg: 'rgba(16,185,129,0.12)', color: '#059669' },
  'On Hold':        { bg: 'rgba(245,158,11,0.12)',  color: '#d97706' },
  'Former Partner': { bg: 'rgba(107,114,128,0.12)', color: '#6b7280' },
};

function StatusBadge({ status }) {
  const s = RELATIONSHIP_COLORS[status] || RELATIONSHIP_COLORS['Prospect'];
  return (
    <span style={{
      fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 4,
      background: s.bg, color: s.color, letterSpacing: '0.05em', textTransform: 'uppercase',
      whiteSpace: 'nowrap',
    }}>
      {status}
    </span>
  );
}

const ENTITIES = ['Cove', 'Luna', 'Alder', 'InstaVision'];

function VendorFormModal({ vendor, catalog, onSave, onClose, currentUser }) {
  const [form, setForm] = useState({
    name: vendor?.name || '',
    entity: vendor?.entity || (currentUser?.entity || ''),
    website: vendor?.website || '',
    relationshipStatus: vendor?.relationshipStatus || 'Prospect',
    industry: vendor?.industry || '',
    notes: vendor?.notes || '',
    contacts: vendor?.contacts || [],
    catalogs: vendor?.catalogs || [],
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [newContact, setNewContact] = useState({ name: '', role: '', wechat: '', email: '' });
  const [newCatalog, setNewCatalog] = useState({ label: '', url: '' });

  function set(field, value) { setForm(f => ({ ...f, [field]: value })); }

  function addContact() {
    if (!newContact.name.trim()) return;
    set('contacts', [...form.contacts, { ...newContact, id: Date.now().toString() }]);
    setNewContact({ name: '', role: '', wechat: '', email: '' });
  }
  function removeContact(id) { set('contacts', form.contacts.filter(c => c.id !== id)); }

  function addCatalog() {
    if (!newCatalog.label.trim() || !newCatalog.url.trim()) return;
    set('catalogs', [...form.catalogs, { ...newCatalog, id: Date.now().toString() }]);
    setNewCatalog({ label: '', url: '' });
  }
  function removeCatalog(id) { set('catalogs', form.catalogs.filter(c => c.id !== id)); }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim()) { setError('Company name is required.'); return; }
    if (!form.entity) { setError('Entity is required.'); return; }
    setSaving(true); setError('');
    try {
      await onSave({ ...vendor, ...form });
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to save.');
    } finally { setSaving(false); }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 560, maxHeight: '90vh', overflowY: 'auto' }}>
        <h2 style={{ marginBottom: 20 }}>{vendor ? 'Edit Vendor' : 'Add Vendor'}</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Company Name *</label>
            <input value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Wyze Labs" autoFocus />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-group">
              <label>Entity *</label>
              <select value={form.entity} onChange={e => set('entity', e.target.value)} required>
                <option value="">Select entity...</option>
                {ENTITIES.map(e => <option key={e} value={e}>{e}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Relationship Status</label>
              <select value={form.relationshipStatus} onChange={e => set('relationshipStatus', e.target.value)}>
                {RELATIONSHIP_STATUSES.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div className="form-group">
            <label>Industry / Category</label>
            <input value={form.industry} onChange={e => set('industry', e.target.value)} placeholder="e.g. Smart Home, Security" />
          </div>
          <div className="form-group">
            <label>Website</label>
            <input value={form.website} onChange={e => set('website', e.target.value)} placeholder="https://..." type="url" />
          </div>
          <div className="form-group">
            <label>Notes</label>
            <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={3} placeholder="Relationship context, key products, next steps..." style={{ resize: 'vertical' }} />
          </div>

          {/* Catalog Links */}
          <div className="form-group">
            <label style={{ marginBottom: 8, display: 'block' }}>Catalog / Document Links</label>
            {form.catalogs.map(c => (
              <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <span style={{ fontWeight: 500, fontSize: 13, minWidth: 100 }}>{c.label}</span>
                <a href={c.url} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: 'var(--primary)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.url}</a>
                <button type="button" className="btn btn-ghost btn-sm" style={{ color: 'var(--fail)', flexShrink: 0 }} onClick={() => removeCatalog(c.id)}>✕</button>
              </div>
            ))}
            <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
              <input
                placeholder="Label (e.g. 2024 Catalog)"
                value={newCatalog.label}
                onChange={e => setNewCatalog(v => ({ ...v, label: e.target.value }))}
                style={{ flex: '0 0 160px' }}
              />
              <input
                placeholder="URL"
                value={newCatalog.url}
                onChange={e => setNewCatalog(v => ({ ...v, url: e.target.value }))}
                style={{ flex: 1 }}
                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addCatalog())}
              />
              <button type="button" className="btn btn-secondary btn-sm" onClick={addCatalog}>Add</button>
            </div>
          </div>

          {/* Contacts */}
          <div className="form-group">
            <label style={{ marginBottom: 8, display: 'block' }}>Contacts</label>
            {form.contacts.map(c => (
              <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, fontSize: 13 }}>
                <span style={{ fontWeight: 500, minWidth: 100 }}>{c.name}</span>
                {c.role && <span style={{ color: 'var(--text-muted)', minWidth: 80 }}>{c.role}</span>}
                {c.wechat && <span style={{ color: '#07c160', flex: 1 }}>💬 {c.wechat}</span>}
                {c.email && <a href={`mailto:${c.email}`} style={{ color: 'var(--primary)', flex: c.wechat ? '0 0 auto' : 1 }}>{c.email}</a>}
                <button type="button" className="btn btn-ghost btn-sm" style={{ color: 'var(--fail)', flexShrink: 0 }} onClick={() => removeContact(c.id)}>✕</button>
              </div>
            ))}
            <div style={{ display: 'flex', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
              <input placeholder="Name" value={newContact.name} onChange={e => setNewContact(v => ({ ...v, name: e.target.value }))} style={{ flex: '0 0 120px' }} />
              <input placeholder="Role" value={newContact.role} onChange={e => setNewContact(v => ({ ...v, role: e.target.value }))} style={{ flex: '0 0 90px' }} />
              <input placeholder="WeChat ID" value={newContact.wechat} onChange={e => setNewContact(v => ({ ...v, wechat: e.target.value }))} style={{ flex: '0 0 120px' }} />
              <input placeholder="Email (optional)" value={newContact.email} onChange={e => setNewContact(v => ({ ...v, email: e.target.value }))} style={{ flex: 1, minWidth: 140 }}
                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addContact())} />
              <button type="button" className="btn btn-secondary btn-sm" onClick={addContact}>Add</button>
            </div>
          </div>

          {error && <div style={{ color: 'var(--fail)', fontSize: 13, marginBottom: 12 }}>{error}</div>}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : (vendor ? 'Save Changes' : 'Add Vendor')}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function VendorDetail({ vendor, catalog, onEdit, onDelete, onBack }) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const linkedProducts = catalog.filter(p => p.vendorId === vendor.id || p.manufacturer === vendor.name);

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <button className="btn btn-ghost btn-sm" onClick={onBack}>← Back</button>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <h2 style={{ margin: 0 }}>{vendor.name}</h2>
            <StatusBadge status={vendor.relationshipStatus} />
            {vendor.entity && <span style={{ fontSize: 12, fontWeight: 600, background: 'var(--primary-dim)', color: 'var(--primary)', borderRadius: 10, padding: '2px 10px' }}>{vendor.entity}</span>}
            {vendor.industry && <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{vendor.industry}</span>}
          </div>
          {vendor.website && (
            <a href={vendor.website} target="_blank" rel="noreferrer" style={{ fontSize: 13, color: 'var(--primary)', marginTop: 2, display: 'inline-block' }}>
              {vendor.website.replace(/^https?:\/\//, '')}
            </a>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary btn-sm" onClick={onEdit}>Edit</button>
          {confirmDelete ? (
            <>
              <button className="btn btn-danger btn-sm" onClick={onDelete}>Confirm Delete</button>
              <button className="btn btn-ghost btn-sm" onClick={() => setConfirmDelete(false)}>Cancel</button>
            </>
          ) : (
            <button className="btn btn-ghost btn-sm" style={{ color: 'var(--fail)' }} onClick={() => setConfirmDelete(true)}>Delete</button>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* Notes */}
        {vendor.notes && (
          <div className="spec-card" style={{ gridColumn: '1 / -1' }}>
            <div style={{ fontWeight: 600, marginBottom: 8, fontSize: 13 }}>Notes</div>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--text-muted)', whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{vendor.notes}</p>
          </div>
        )}

        {/* Catalog Links */}
        <div className="spec-card">
          <div style={{ fontWeight: 600, marginBottom: 12, fontSize: 13 }}>Catalog &amp; Documents</div>
          {vendor.catalogs && vendor.catalogs.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {vendor.catalogs.map(c => (
                <a key={c.id} href={c.url} target="_blank" rel="noreferrer"
                  style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 6, background: 'var(--bg)', border: '1px solid var(--border)', textDecoration: 'none' }}>
                  <span style={{ fontSize: 16 }}>📄</span>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{c.label}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>{c.url.replace(/^https?:\/\//, '').slice(0, 60)}{c.url.length > 70 ? '…' : ''}</div>
                  </div>
                  <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--primary)' }}>↗</span>
                </a>
              ))}
            </div>
          ) : (
            <p style={{ margin: 0, fontSize: 13, color: 'var(--text-muted)' }}>No documents linked yet.</p>
          )}
        </div>

        {/* Contacts */}
        <div className="spec-card">
          <div style={{ fontWeight: 600, marginBottom: 12, fontSize: 13 }}>Contacts</div>
          {vendor.contacts && vendor.contacts.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {vendor.contacts.map(c => (
                <div key={c.id} style={{ fontSize: 13 }}>
                  <div style={{ fontWeight: 600 }}>{c.name}{c.role && <span style={{ fontWeight: 400, color: 'var(--text-muted)', marginLeft: 6 }}>· {c.role}</span>}</div>
                  {c.wechat && <div style={{ color: '#07c160', fontSize: 12, marginTop: 2 }}>💬 {c.wechat}</div>}
                  {c.email && <div style={{ marginTop: 1 }}><a href={`mailto:${c.email}`} style={{ color: 'var(--primary)', fontSize: 12 }}>{c.email}</a></div>}
                </div>
              ))}
            </div>
          ) : (
            <p style={{ margin: 0, fontSize: 13, color: 'var(--text-muted)' }}>No contacts added yet.</p>
          )}
        </div>

        {/* Linked catalog products */}
        <div className="spec-card" style={{ gridColumn: '1 / -1' }}>
          <div style={{ fontWeight: 600, marginBottom: 12, fontSize: 13 }}>
            Products in Catalog
            {linkedProducts.length > 0 && <span style={{ fontWeight: 400, color: 'var(--text-muted)', marginLeft: 6 }}>({linkedProducts.length})</span>}
          </div>
          {linkedProducts.length > 0 ? (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {linkedProducts.map(p => (
                <span key={p.id} style={{ fontSize: 12, padding: '4px 10px', borderRadius: 4, background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)' }}>
                  {p.modelNumber || p.name}
                </span>
              ))}
            </div>
          ) : (
            <p style={{ margin: 0, fontSize: 13, color: 'var(--text-muted)' }}>
              No catalog products are linked to this vendor yet. Products with a matching manufacturer name will appear here automatically.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function VendorLibrary({ catalog = [], onBack, currentUser }) {
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingVendor, setEditingVendor] = useState(null);
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');

  async function refresh() {
    setLoading(true);
    try { setVendors(await listVendors()); } catch {}
    finally { setLoading(false); }
  }

  useEffect(() => { refresh(); }, []);

  async function handleSave(data) {
    if (data.id) {
      const updated = await updateVendor(data.id, data);
      setVendors(vs => vs.map(v => v.id === updated.id ? updated : v));
      if (selectedVendor?.id === updated.id) setSelectedVendor(updated);
    } else {
      const created = await createVendor(data);
      setVendors(vs => [created, ...vs]);
    }
  }

  async function handleDelete(id) {
    await deleteVendor(id);
    setVendors(vs => vs.filter(v => v.id !== id));
    setSelectedVendor(null);
  }

  const filtered = vendors.filter(v => {
    const matchSearch = !search || v.name.toLowerCase().includes(search.toLowerCase()) || (v.industry || '').toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'All' || v.relationshipStatus === filterStatus;
    return matchSearch && matchStatus;
  });

  if (selectedVendor) {
    return (
      <div className="dashboard">
        {showForm && (
          <VendorFormModal
            vendor={editingVendor}
            catalog={catalog}
            onSave={handleSave}
            onClose={() => { setShowForm(false); setEditingVendor(null); }}
            currentUser={currentUser}
          />
        )}
        <VendorDetail
          vendor={selectedVendor}
          catalog={catalog}
          onEdit={() => { setEditingVendor(selectedVendor); setShowForm(true); }}
          onDelete={() => handleDelete(selectedVendor.id)}
          onBack={() => setSelectedVendor(null)}
        />
      </div>
    );
  }

  return (
    <div className="dashboard">
      {showForm && (
        <VendorFormModal
          vendor={editingVendor}
          catalog={catalog}
          onSave={handleSave}
          onClose={() => { setShowForm(false); setEditingVendor(null); }}
          currentUser={currentUser}
        />
      )}

      <div className="dashboard-header">
        <div>
          {onBack && <button className="btn btn-ghost btn-sm" onClick={onBack} style={{ marginBottom: 8 }}>← Back to Home</button>}
          <h1>Vendor Library</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 14, margin: 0 }}>
            Companies you work with, evaluate, or want to do business with
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => { setEditingVendor(null); setShowForm(true); }}>
          + Add Vendor
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          placeholder="Search vendors..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ flex: '0 0 240px', maxWidth: '100%' }}
        />
        <div style={{ display: 'flex', gap: 6 }}>
          {['All', ...RELATIONSHIP_STATUSES].map(s => (
            <button
              key={s}
              className={`product-tab${filterStatus === s ? ' active' : ''}`}
              style={{ fontSize: 12, padding: '4px 10px' }}
              onClick={() => setFilterStatus(s)}
            >
              {s}
              {s !== 'All' && <span style={{ marginLeft: 4, opacity: 0.7 }}>
                ({vendors.filter(v => v.relationshipStatus === s).length})
              </span>}
              {s === 'All' && <span style={{ marginLeft: 4, opacity: 0.7 }}>({vendors.length})</span>}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="ai-loading"><div className="spinner spinner-lg" /></div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          {vendors.length === 0 ? (
            <>
              <h3>No vendors yet</h3>
              <p>Add companies you work with, evaluate, or want to do business with. Store their catalog links, contacts, and relationship status in one place.</p>
              <button className="btn btn-primary" onClick={() => setShowForm(true)}>+ Add First Vendor</button>
            </>
          ) : (
            <p>No vendors match your filter.</p>
          )}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
          {filtered.map(v => {
            const linked = catalog.filter(p => p.vendorId === v.id || p.manufacturer === v.name);
            return (
              <div
                key={v.id}
                className="catalog-card"
                style={{ cursor: 'pointer', padding: '16px 18px', borderLeft: '3px solid ' + (RELATIONSHIP_COLORS[v.relationshipStatus]?.color || '#6b7280') }}
                onClick={() => setSelectedVendor(v)}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 6 }}>
                  <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>{v.name}</h3>
                  <StatusBadge status={v.relationshipStatus} />
                  {v.entity && <span style={{ fontSize: 11, fontWeight: 600, background: 'var(--primary-dim)', color: 'var(--primary)', borderRadius: 10, padding: '1px 8px' }}>{v.entity}</span>}
                </div>
                {v.industry && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>{v.industry}</div>}
                {v.website && (
                  <div style={{ fontSize: 12, color: 'var(--primary)', marginBottom: 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {v.website.replace(/^https?:\/\//, '')}
                  </div>
                )}
                <div style={{ display: 'flex', gap: 10, fontSize: 12, color: 'var(--text-muted)', marginTop: 'auto', paddingTop: 8, borderTop: '1px solid var(--border)' }}>
                  {v.catalogs?.length > 0 && <span>📄 {v.catalogs.length} doc{v.catalogs.length !== 1 ? 's' : ''}</span>}
                  {v.contacts?.length > 0 && <span>👤 {v.contacts.length} contact{v.contacts.length !== 1 ? 's' : ''}</span>}
                  {linked.length > 0 && <span style={{ marginLeft: 'auto', color: 'var(--primary)', fontWeight: 500 }}>{linked.length} in catalog</span>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
