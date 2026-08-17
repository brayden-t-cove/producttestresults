import { useState, useEffect } from 'react';
import { listTestItems, createTestItem, updateTestItem, deleteTestItem } from '../lib/api.js';

const CATEGORIES = [
  'Video Quality',
  'Audio',
  'Network & Connectivity',
  'Motion Detection',
  'Notifications',
  'Recording & Playback',
  'Cloud & Storage',
  'App & UI',
  'Interoperability',
  'Security',
  'Power & Hardware',
  'Firmware & OTA',
  'Accessibility',
  'Performance',
  'Other',
];

const BLANK_FORM = { name: '', category: '', description: '', steps: '', expectedResult: '', tags: '' };

function ItemForm({ initial, onSave, onCancel, saving }) {
  const [form, setForm] = useState(initial || BLANK_FORM);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim() || !form.category) return;
    onSave({
      ...form,
      name: form.name.trim(),
      tags: form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
    });
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div className="form-group" style={{ margin: 0 }}>
          <label>Name <span className="req">*</span></label>
          <input type="text" value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Live view loads within 3s" required />
        </div>
        <div className="form-group" style={{ margin: 0 }}>
          <label>Category <span className="req">*</span></label>
          <select value={form.category} onChange={e => set('category', e.target.value)} required>
            <option value="">— Select —</option>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>
      <div className="form-group" style={{ margin: 0 }}>
        <label>Description</label>
        <textarea rows={2} value={form.description} onChange={e => set('description', e.target.value)} placeholder="What this test verifies" style={{ resize: 'vertical' }} />
      </div>
      <div className="form-group" style={{ margin: 0 }}>
        <label>Steps</label>
        <textarea rows={3} value={form.steps} onChange={e => set('steps', e.target.value)} placeholder="Step-by-step instructions for the tester" style={{ resize: 'vertical' }} />
      </div>
      <div className="form-group" style={{ margin: 0 }}>
        <label>Expected Result</label>
        <textarea rows={2} value={form.expectedResult} onChange={e => set('expectedResult', e.target.value)} placeholder="What a passing result looks like" style={{ resize: 'vertical' }} />
      </div>
      <div className="form-group" style={{ margin: 0 }}>
        <label>Tags <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(comma-separated)</span></label>
        <input type="text" value={form.tags} onChange={e => set('tags', e.target.value)} placeholder="e.g. ios, android, critical" />
      </div>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button type="button" className="btn btn-ghost btn-sm" onClick={onCancel}>Cancel</button>
        <button type="submit" className="btn btn-primary btn-sm" disabled={saving}>{saving ? 'Saving…' : 'Save Item'}</button>
      </div>
    </form>
  );
}

function ItemRow({ item, canEdit, isSuperuser, onEdit, onArchive, onDelete }) {
  const [expanded, setExpanded] = useState(false);
  const archived = item.status === 'archived';

  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 8, marginBottom: 8, background: archived ? 'var(--bg)' : 'var(--surface)', opacity: archived ? 0.6 : 1 }}>
      <div
        style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', cursor: 'pointer' }}
        onClick={() => setExpanded(e => !e)}
      >
        <span style={{ flex: 1, fontWeight: 500, fontSize: 14 }}>{item.name}</span>
        <span style={{
          fontSize: 11, padding: '2px 8px', borderRadius: 12, fontWeight: 600,
          background: 'var(--bg)', color: 'var(--text-muted)', border: '1px solid var(--border)',
        }}>{item.category}</span>
        {item.tags?.map(t => (
          <span key={t} style={{ fontSize: 11, padding: '2px 7px', borderRadius: 10, background: 'var(--accent-subtle, #e8f0fe)', color: 'var(--accent, #1A5CF6)' }}>{t}</span>
        ))}
        {archived && <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>archived</span>}
        <span style={{ fontSize: 16, color: 'var(--text-muted)', marginLeft: 4 }}>{expanded ? '−' : '+'}</span>
      </div>

      {expanded && (
        <div style={{ padding: '0 14px 14px', borderTop: '1px solid var(--border)' }}>
          {item.description && <p style={{ fontSize: 13, marginTop: 10, marginBottom: 8, color: 'var(--text-muted)' }}>{item.description}</p>}
          {item.steps && (
            <div style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 4 }}>Steps</div>
              <pre style={{ fontSize: 12, margin: 0, whiteSpace: 'pre-wrap', fontFamily: 'inherit', color: 'var(--text)' }}>{item.steps}</pre>
            </div>
          )}
          {item.expectedResult && (
            <div style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 4 }}>Expected Result</div>
              <p style={{ fontSize: 12, margin: 0, color: 'var(--text)' }}>{item.expectedResult}</p>
            </div>
          )}
          {canEdit && (
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <button className="btn btn-ghost btn-sm" onClick={() => onEdit(item)}>Edit</button>
              {!archived && (
                <button className="btn btn-ghost btn-sm" style={{ color: 'var(--text-muted)' }} onClick={() => onArchive(item)}>Archive</button>
              )}
              {archived && (
                <button className="btn btn-ghost btn-sm" onClick={() => onArchive(item)}>Restore</button>
              )}
              {isSuperuser && archived && (
                <button className="btn btn-ghost btn-sm" style={{ color: 'var(--fail)' }} onClick={() => onDelete(item)}>Delete permanently</button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function TestItemLibrary({ canEdit, isSuperuser }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterCat, setFilterCat] = useState('');
  const [filterStatus, setFilterStatus] = useState('active');
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const data = await listTestItems({ status: filterStatus || undefined });
      setItems(data);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, [filterStatus]);

  const filtered = items.filter(item => {
    if (filterCat && item.category !== filterCat) return false;
    if (search) {
      const q = search.toLowerCase();
      return item.name.toLowerCase().includes(q) || item.category.toLowerCase().includes(q) || (item.tags || []).some(t => t.toLowerCase().includes(q));
    }
    return true;
  });

  const byCategory = filtered.reduce((acc, item) => {
    (acc[item.category] = acc[item.category] || []).push(item);
    return acc;
  }, {});

  async function handleSave(data) {
    setSaving(true);
    try {
      if (editingItem) {
        const updated = await updateTestItem(editingItem.id, data);
        setItems(all => all.map(i => i.id === updated.id ? updated : i));
      } else {
        const created = await createTestItem(data);
        setItems(all => [created, ...all]);
      }
      setShowForm(false);
      setEditingItem(null);
    } catch (e) { setError(e.message); }
    finally { setSaving(false); }
  }

  async function handleArchive(item) {
    const newStatus = item.status === 'archived' ? 'active' : 'archived';
    try {
      const updated = await updateTestItem(item.id, { status: newStatus });
      setItems(all => all.map(i => i.id === updated.id ? updated : i));
    } catch (e) { setError(e.message); }
  }

  async function handleDelete(item) {
    if (!confirm(`Permanently delete "${item.name}"? This cannot be undone.`)) return;
    try {
      await deleteTestItem(item.id);
      setItems(all => all.filter(i => i.id !== item.id));
    } catch (e) { setError(e.message); }
  }

  function startEdit(item) {
    setEditingItem(item);
    setShowForm(true);
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, flex: 1 }}>Test Item Library</h2>
        {canEdit && !showForm && (
          <button className="btn btn-primary btn-sm" onClick={() => { setEditingItem(null); setShowForm(true); }}>+ New Item</button>
        )}
      </div>

      {error && <div className="error-msg" style={{ marginBottom: 12 }}>{error}</div>}

      {/* New / Edit form */}
      {showForm && (
        <div style={{ border: '1px solid var(--border)', borderRadius: 10, padding: 20, marginBottom: 20, background: 'var(--surface)' }}>
          <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 14 }}>{editingItem ? 'Edit Test Item' : 'New Test Item'}</div>
          <ItemForm
            initial={editingItem ? { ...editingItem, tags: (editingItem.tags || []).join(', ') } : undefined}
            onSave={handleSave}
            onCancel={() => { setShowForm(false); setEditingItem(null); }}
            saving={saving}
          />
        </div>
      )}

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          type="text"
          placeholder="Search items…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ flex: 1, minWidth: 160, fontSize: 13 }}
        />
        <select value={filterCat} onChange={e => setFilterCat(e.target.value)} style={{ fontSize: 13 }}>
          <option value="">All categories</option>
          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ fontSize: 13 }}>
          <option value="active">Active</option>
          <option value="archived">Archived</option>
          <option value="">All</option>
        </select>
        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{filtered.length} item{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Items grouped by category */}
      {loading ? (
        <div style={{ color: 'var(--text-muted)', fontSize: 14 }}>Loading…</div>
      ) : filtered.length === 0 ? (
        <div style={{ color: 'var(--text-muted)', fontSize: 14, textAlign: 'center', padding: 40 }}>
          {items.length === 0 ? 'No test items yet. Add your first item to get started.' : 'No items match your filters.'}
        </div>
      ) : (
        Object.entries(byCategory).sort(([a], [b]) => a.localeCompare(b)).map(([cat, catItems]) => (
          <div key={cat} style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 8, paddingBottom: 4, borderBottom: '1px solid var(--border)' }}>
              {cat} <span style={{ fontWeight: 400 }}>({catItems.length})</span>
            </div>
            {catItems.map(item => (
              <ItemRow
                key={item.id}
                item={item}
                canEdit={canEdit}
                isSuperuser={isSuperuser}
                onEdit={startEdit}
                onArchive={handleArchive}
                onDelete={handleDelete}
              />
            ))}
          </div>
        ))
      )}
    </div>
  );
}
