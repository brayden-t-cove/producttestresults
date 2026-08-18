import { useState, useEffect } from 'react';
import {
  listTestItems, createTestItem, updateTestItem, deleteTestItem,
  getTestItemCategories, saveTestItemCategories, renameTestItemCategory, seedTestItemsFromLegacy,
  enrichTestItemDeviceTypes,
} from '../lib/api.js';

// ── Category Manager ───────────────────────────────────────────────────────────

function CategoryManager({ categories, onCategoriesChange, onClose }) {
  const [list, setList] = useState(categories);
  const [renaming, setRenaming] = useState(null); // { index, value }
  const [newCat, setNewCat] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleRename(index) {
    const from = list[index];
    const to = renaming.value.trim();
    if (!to || to === from) { setRenaming(null); return; }
    setSaving(true);
    try {
      const result = await renameTestItemCategory(from, to);
      onCategoriesChange(result.categories);
      setList(result.categories);
    } catch (e) { setError(e.message); }
    finally { setSaving(false); setRenaming(null); }
  }

  async function handleAddCategory() {
    const name = newCat.trim();
    if (!name || list.includes(name)) return;
    const updated = [...list, name];
    setSaving(true);
    try {
      await saveTestItemCategories(updated);
      setList(updated);
      onCategoriesChange(updated);
      setNewCat('');
    } catch (e) { setError(e.message); }
    finally { setSaving(false); }
  }

  async function handleDelete(index) {
    const updated = list.filter((_, i) => i !== index);
    setSaving(true);
    try {
      await saveTestItemCategories(updated);
      setList(updated);
      onCategoriesChange(updated);
    } catch (e) { setError(e.message); }
    finally { setSaving(false); }
  }

  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 10, padding: 20, background: 'var(--surface)', marginBottom: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ fontWeight: 700, fontSize: 15, flex: 1 }}>Manage Categories</div>
        <button className="btn btn-ghost btn-sm" onClick={onClose}>Done</button>
      </div>
      {error && <div className="error-msg" style={{ marginBottom: 10 }}>{error}</div>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }}>
        {list.map((cat, i) => (
          <div key={cat} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {renaming?.index === i ? (
              <>
                <input
                  type="text"
                  value={renaming.value}
                  onChange={e => setRenaming({ index: i, value: e.target.value })}
                  onKeyDown={e => { if (e.key === 'Enter') handleRename(i); if (e.key === 'Escape') setRenaming(null); }}
                  autoFocus
                  style={{ flex: 1, fontSize: 13 }}
                />
                <button className="btn btn-primary btn-sm" onClick={() => handleRename(i)} disabled={saving}>Save</button>
                <button className="btn btn-ghost btn-sm" onClick={() => setRenaming(null)}>Cancel</button>
              </>
            ) : (
              <>
                <span style={{ flex: 1, fontSize: 13 }}>{cat}</span>
                <button className="btn btn-ghost btn-sm" style={{ fontSize: 11 }} onClick={() => setRenaming({ index: i, value: cat })}>Rename</button>
                <button className="btn btn-ghost btn-sm" style={{ fontSize: 11, color: 'var(--fail)' }} onClick={() => handleDelete(i)}>✕</button>
              </>
            )}
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <input
          type="text"
          placeholder="New category name…"
          value={newCat}
          onChange={e => setNewCat(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleAddCategory(); }}
          style={{ flex: 1, fontSize: 13 }}
        />
        <button className="btn btn-ghost btn-sm" onClick={handleAddCategory} disabled={!newCat.trim()}>+ Add</button>
      </div>
      <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8 }}>
        Renaming a category updates all items in that category automatically.
      </p>
    </div>
  );
}

// ── Item Form ─────────────────────────────────────────────────────────────────

const PRIORITY_OPTS = [
  { value: 'P0', label: 'P0 — Non-negotiable', color: 'var(--fail)', bg: 'var(--fail-dim,#fee2e2)' },
  { value: 'P1', label: 'P1 — High',            color: 'var(--warn,#d97706)', bg: 'var(--warn-dim,#fef3c7)' },
  { value: 'P2', label: 'P2 — Standard',         color: 'var(--primary)',     bg: 'var(--primary-dim)' },
  { value: 'P3', label: 'P3 — Low / Nice-to-have', color: 'var(--text-muted)', bg: 'var(--card)' },
];

export function PriorityChip({ value, onClick, size = 'sm' }) {
  const opt = PRIORITY_OPTS.find(o => o.value === value);
  if (!opt && !onClick) return null;
  const pad = size === 'sm' ? '1px 6px' : '2px 9px';
  const fs = size === 'sm' ? 10 : 12;
  return (
    <span
      onClick={onClick}
      title={onClick ? 'Click to change priority' : undefined}
      style={{
        fontSize: fs, fontWeight: 700, borderRadius: 8, padding: pad, flexShrink: 0,
        background: opt ? opt.bg : 'var(--border)',
        color: opt ? opt.color : 'var(--text-muted)',
        cursor: onClick ? 'pointer' : 'default',
        userSelect: 'none',
      }}
    >
      {value || '—'}
    </span>
  );
}

function ItemForm({ initial, categories, onSave, onCancel, saving }) {
  const blank = { name: '', category: '', description: '', steps: '', expectedResult: '', tags: '', defaultPriority: '' };
  const [form, setForm] = useState(initial
    ? { ...initial, tags: Array.isArray(initial.tags) ? initial.tags.join(', ') : (initial.tags || '') }
    : blank);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim() || !form.category) return;
    onSave({
      ...form,
      name: form.name.trim(),
      tags: form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
      defaultPriority: form.defaultPriority || undefined,
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
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>
      <div className="form-group" style={{ margin: 0 }}>
        <label>Default Priority</label>
        <select value={form.defaultPriority || ''} onChange={e => set('defaultPriority', e.target.value)}>
          <option value="">— Context-dependent —</option>
          {PRIORITY_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '4px 0 0' }}>
          P0 = always required regardless of test type. Leave blank for context-dependent items.
        </p>
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

// ── Item Row ──────────────────────────────────────────────────────────────────

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
        {item.defaultPriority && <PriorityChip value={item.defaultPriority} />}
        {(item.tags || []).map(t => (
          <span key={t} style={{ fontSize: 11, padding: '2px 7px', borderRadius: 10, background: 'rgba(26,92,246,0.12)', color: 'var(--accent, #1A5CF6)' }}>{t}</span>
        ))}
        {archived && <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>archived</span>}
        {item.legacyId && <span style={{ fontSize: 10, color: 'var(--text-muted)', fontStyle: 'italic' }}>legacy</span>}
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
              {!archived ? (
                <button className="btn btn-ghost btn-sm" style={{ color: 'var(--text-muted)' }} onClick={() => onArchive(item)}>Archive</button>
              ) : (
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

// ── Main component ────────────────────────────────────────────────────────────

export default function TestItemLibrary({ canEdit, isSuperuser }) {
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterCat, setFilterCat] = useState('');
  const [filterStatus, setFilterStatus] = useState('active');
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [saving, setSaving] = useState(false);
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [seedResult, setSeedResult] = useState(null);

  async function load() {
    setLoading(true);
    try {
      const [data, cats] = await Promise.all([
        listTestItems({ status: filterStatus || undefined }),
        getTestItemCategories(),
      ]);
      setItems(data);
      setCategories(cats);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, [filterStatus]);

  const filtered = items.filter(item => {
    if (filterCat && item.category !== filterCat) return false;
    if (search) {
      const q = search.toLowerCase();
      return item.name.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q) ||
        (item.tags || []).some(t => t.toLowerCase().includes(q));
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

  async function handleSeed() {
    if (!confirm('Import all tests from the legacy test library? Items already imported will be skipped.')) return;
    setSeeding(true);
    setSeedResult(null);
    try {
      const result = await seedTestItemsFromLegacy();
      setSeedResult(result);
      await load();
    } catch (e) { setError(e.message); }
    finally { setSeeding(false); }
  }

  function startEdit(item) {
    setEditingItem(item);
    setShowForm(true);
  }

  // Unique categories across all items (catches any unmapped ones)
  const allCatsInUse = [...new Set(items.map(i => i.category))];
  const displayCategories = [...new Set([...categories, ...allCatsInUse])].sort();

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, flex: 1 }}>Test Item Library</h2>
        {isSuperuser && (
          <button className="btn btn-ghost btn-sm" onClick={() => setShowCategoryManager(v => !v)}>
            {showCategoryManager ? 'Close Category Editor' : '✎ Edit Categories'}
          </button>
        )}
        {isSuperuser && (
          <button className="btn btn-ghost btn-sm" onClick={handleSeed} disabled={seeding}>
            {seeding ? 'Importing…' : '⬇ Import Legacy Tests'}
          </button>
        )}
        {isSuperuser && items.some(i => i.createdBy === 'system-seed' && !i.deviceTypes?.length) && (
          <button className="btn btn-ghost btn-sm" onClick={async () => {
            try {
              const r = await enrichTestItemDeviceTypes();
              alert(`Enriched ${r.updated} items with device type tags.`);
              await load();
            } catch (e) { setError(e.message); }
          }}>
            ↺ Enrich Device Types
          </button>
        )}
        {canEdit && !showForm && (
          <button className="btn btn-primary btn-sm" onClick={() => { setEditingItem(null); setShowForm(true); }}>+ New Item</button>
        )}
      </div>

      {seedResult && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13 }}>
          ✓ Import complete: <strong>{seedResult.created}</strong> items added, <strong>{seedResult.skipped}</strong> already existed.
        </div>
      )}

      {error && <div className="error-msg" style={{ marginBottom: 12 }}>{error}</div>}

      {/* Category manager */}
      {showCategoryManager && isSuperuser && (
        <CategoryManager
          categories={categories}
          onCategoriesChange={setCategories}
          onClose={() => setShowCategoryManager(false)}
        />
      )}

      {/* New / Edit form */}
      {showForm && (
        <div style={{ border: '1px solid var(--border)', borderRadius: 10, padding: 20, marginBottom: 20, background: 'var(--surface)' }}>
          <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 14 }}>{editingItem ? 'Edit Test Item' : 'New Test Item'}</div>
          <ItemForm
            initial={editingItem ? { ...editingItem, tags: (editingItem.tags || []).join(', ') } : undefined}
            categories={categories}
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
          {displayCategories.map(c => <option key={c} value={c}>{c}</option>)}
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
          {items.length === 0
            ? 'No test items yet. Use "Import Legacy Tests" to pre-populate, or add items manually.'
            : 'No items match your filters.'}
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
