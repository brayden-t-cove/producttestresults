import { useState } from 'react';

function slugify(str) {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

const FIELD_TYPES = ['text', 'number', 'boolean', 'select', 'textarea'];

export default function SchemaEditor({ schema, onSave, onBack }) {
  const [localSchema, setLocalSchema] = useState(() => deepClone(schema));
  const [activeCategory, setActiveCategory] = useState(() => Object.keys(schema)[0] || '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [addingCategory, setAddingCategory] = useState(false);
  const [newCategoryKey, setNewCategoryKey] = useState('');
  const [addCategoryError, setAddCategoryError] = useState('');

  const categories = Object.keys(localSchema);

  async function handleSave() {
    setSaving(true);
    try {
      await onSave(localSchema);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      alert('Failed to save: ' + e.message);
    } finally {
      setSaving(false);
    }
  }

  function updateSchema(updater) {
    setLocalSchema(prev => {
      const next = deepClone(prev);
      updater(next);
      return next;
    });
  }

  // Category management
  function handleAddCategory() {
    const key = slugify(newCategoryKey);
    if (!key) { setAddCategoryError('Key cannot be empty.'); return; }
    if (!/^[a-z0-9-]+$/.test(key)) { setAddCategoryError('Only lowercase letters, numbers, hyphens.'); return; }
    if (localSchema[key]) { setAddCategoryError('Category already exists.'); return; }
    updateSchema(s => { s[key] = []; });
    setActiveCategory(key);
    setAddingCategory(false);
    setNewCategoryKey('');
    setAddCategoryError('');
  }

  // Group management
  function addGroup() {
    updateSchema(s => {
      s[activeCategory].push({ label: 'New Group', fields: [] });
    });
  }

  function removeGroup(gi) {
    const group = localSchema[activeCategory][gi];
    if (group.fields.length > 0) {
      if (!window.confirm(`Remove group "${group.label}" and its ${group.fields.length} field(s)?`)) return;
    }
    updateSchema(s => { s[activeCategory].splice(gi, 1); });
  }

  function moveGroup(gi, dir) {
    updateSchema(s => {
      const arr = s[activeCategory];
      const target = gi + dir;
      if (target < 0 || target >= arr.length) return;
      [arr[gi], arr[target]] = [arr[target], arr[gi]];
    });
  }

  function updateGroupLabel(gi, val) {
    updateSchema(s => { s[activeCategory][gi].label = val; });
  }

  // Field management
  function addField(gi) {
    updateSchema(s => {
      s[activeCategory][gi].fields.push({ id: 'new-field-' + Date.now(), label: 'New Field', type: 'text' });
    });
  }

  function removeField(gi, fi) {
    updateSchema(s => { s[activeCategory][gi].fields.splice(fi, 1); });
  }

  function moveField(gi, fi, dir) {
    updateSchema(s => {
      const arr = s[activeCategory][gi].fields;
      const target = fi + dir;
      if (target < 0 || target >= arr.length) return;
      [arr[fi], arr[target]] = [arr[target], arr[fi]];
    });
  }

  function updateField(gi, fi, key, val) {
    updateSchema(s => {
      const field = s[activeCategory][gi].fields[fi];
      if (key === 'label') {
        // Auto-generate ID only if field ID looks auto-generated or matches old slug
        const oldSlug = slugify(field.label);
        if (field.id === oldSlug || field.id.startsWith('new-field-')) {
          field.id = slugify(val) || field.id;
        }
        field.label = val;
      } else {
        field[key] = val;
        if (key === 'type' && val !== 'select') {
          delete field.options;
        }
        if (key === 'type' && val === 'select' && !field.options) {
          field.options = [];
        }
      }
    });
  }

  function updateOptions(gi, fi, val) {
    updateSchema(s => {
      s[activeCategory][gi].fields[fi].options = val.split(',').map(o => o.trim()).filter(Boolean);
    });
  }

  const groups = localSchema[activeCategory] || [];

  return (
    <div className="schema-editor">
      <div className="schema-editor-header">
        <div>
          <button className="btn btn-ghost btn-sm" onClick={onBack} style={{ marginBottom: 8 }}>
            &larr; Back
          </button>
          <h1 style={{ margin: 0 }}>Spec Field Editor</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 4 }}>
            Define the technical specification fields shown when creating or editing products.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', paddingTop: 4 }}>
          {saved && <span style={{ fontSize: 13, color: 'var(--pass)', alignSelf: 'center' }}>Saved</span>}
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      {/* Category tabs */}
      <div className="schema-category-tabs">
        {categories.map(cat => (
          <button
            key={cat}
            className={`schema-tab${activeCategory === cat ? ' active' : ''}`}
            onClick={() => setActiveCategory(cat)}
          >
            {cat}
          </button>
        ))}
        {!addingCategory && (
          <button
            className="schema-tab"
            style={{ borderStyle: 'dashed' }}
            onClick={() => setAddingCategory(true)}
          >
            + Add Category
          </button>
        )}
        {addingCategory && (
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <input
              autoFocus
              type="text"
              placeholder="category-key"
              value={newCategoryKey}
              onChange={e => { setNewCategoryKey(e.target.value); setAddCategoryError(''); }}
              style={{ width: 140, fontSize: 13 }}
              onKeyDown={e => { if (e.key === 'Enter') handleAddCategory(); if (e.key === 'Escape') { setAddingCategory(false); setNewCategoryKey(''); setAddCategoryError(''); } }}
            />
            <button className="btn btn-primary btn-sm" onClick={handleAddCategory}>Add</button>
            <button className="btn btn-ghost btn-sm" onClick={() => { setAddingCategory(false); setNewCategoryKey(''); setAddCategoryError(''); }}>Cancel</button>
            {addCategoryError && <span style={{ fontSize: 12, color: 'var(--fail)' }}>{addCategoryError}</span>}
          </div>
        )}
      </div>

      {/* Active category groups */}
      {activeCategory && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
            <button className="btn btn-secondary btn-sm" onClick={addGroup}>+ Add Group</button>
          </div>

          {groups.length === 0 && (
            <div style={{ color: 'var(--text-muted)', fontSize: 13, textAlign: 'center', padding: '32px 0' }}>
              No groups yet. Click "Add Group" to start.
            </div>
          )}

          {groups.map((group, gi) => (
            <div key={gi} className="schema-group-card">
              <div className="schema-group-header">
                <input
                  type="text"
                  value={group.label}
                  onChange={e => updateGroupLabel(gi, e.target.value)}
                  style={{ flex: 1, fontWeight: 600, fontSize: 14 }}
                  placeholder="Group name"
                />
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => moveGroup(gi, -1)}
                  disabled={gi === 0}
                  title="Move up"
                >
                  ▲
                </button>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => moveGroup(gi, 1)}
                  disabled={gi === groups.length - 1}
                  title="Move down"
                >
                  ▼
                </button>
                <button
                  className="btn btn-ghost btn-sm"
                  style={{ color: 'var(--fail)' }}
                  onClick={() => removeGroup(gi)}
                  title="Remove group"
                >
                  Remove
                </button>
              </div>

              {/* Fields */}
              {group.fields.map((field, fi) => (
                <div key={fi} className="schema-field-row">
                  <input
                    type="text"
                    value={field.label}
                    placeholder="Field label"
                    onChange={e => updateField(gi, fi, 'label', e.target.value)}
                  />
                  <select
                    value={field.type}
                    onChange={e => updateField(gi, fi, 'type', e.target.value)}
                  >
                    {FIELD_TYPES.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                  {field.type === 'select' ? (
                    <input
                      type="text"
                      placeholder="Options (comma-separated)"
                      value={(field.options || []).join(', ')}
                      onChange={e => updateOptions(gi, fi, e.target.value)}
                      className="schema-field-options"
                      style={{ fontSize: 12 }}
                    />
                  ) : (
                    <div />
                  )}
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => moveField(gi, fi, -1)}
                      disabled={fi === 0}
                      title="Move up"
                    >
                      ▲
                    </button>
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => moveField(gi, fi, 1)}
                      disabled={fi === group.fields.length - 1}
                      title="Move down"
                    >
                      ▼
                    </button>
                    <button
                      className="btn btn-ghost btn-sm"
                      style={{ color: 'var(--fail)' }}
                      onClick={() => removeField(gi, fi)}
                      title="Delete field"
                    >
                      Del
                    </button>
                  </div>
                </div>
              ))}

              <div style={{ marginTop: 8 }}>
                <button className="btn btn-ghost btn-sm" onClick={() => addField(gi)}>+ Add Field</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
