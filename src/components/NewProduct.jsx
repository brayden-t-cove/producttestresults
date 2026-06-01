import { useState, useEffect } from 'react';
import { CAPABILITY_GROUPS, CATEGORY_LABELS, CATEGORIES } from '../data/capabilities.js';

const CATEGORY_ICONS = {
  hub: '🏠',
  touchpad: '⌨️',
  camera: '📷',
  sensor: '📡',
  app: '📱',
};

export default function NewProduct({ product, onSave, onBack }) {
  const isEdit = !!product;
  const [name, setName] = useState(product?.name || '');
  const [manufacturer, setManufacturer] = useState(product?.manufacturer || '');
  const [modelNumber, setModelNumber] = useState(product?.modelNumber || '');
  const [category, setCategory] = useState(product?.category || '');
  const [capabilities, setCapabilities] = useState(new Set(product?.capabilities || []));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isEdit) {
      setCapabilities(new Set());
    }
  }, [category]);

  function toggleCapability(id) {
    setCapabilities(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAllInGroup(groupCapabilities) {
    const allIds = groupCapabilities.map(c => c.id);
    const allSelected = allIds.every(id => capabilities.has(id));
    setCapabilities(prev => {
      const next = new Set(prev);
      if (allSelected) {
        allIds.forEach(id => next.delete(id));
      } else {
        allIds.forEach(id => next.add(id));
      }
      return next;
    });
  }

  async function handleSave(e) {
    e.preventDefault();
    if (!name.trim()) {
      setError('Product name is required.');
      return;
    }
    if (!category) {
      setError('Please select a category.');
      return;
    }
    setError('');
    setSaving(true);
    try {
      await onSave({
        ...(product || {}),
        name: name.trim(),
        manufacturer: manufacturer.trim(),
        modelNumber: modelNumber.trim(),
        category,
        capabilities: Array.from(capabilities),
      });
    } catch (err) {
      setError(err.message || 'Failed to save product.');
      setSaving(false);
    }
  }

  const groups = category ? (CAPABILITY_GROUPS[category] || []) : [];

  return (
    <div className="new-product-page">
      <div className="new-product-header">
        <button className="btn btn-ghost btn-sm" onClick={onBack} style={{ marginBottom: 12 }}>
          ← Back
        </button>
        <h1>{isEdit ? 'Edit Product' : 'New Product'}</h1>
      </div>

      <form onSubmit={handleSave}>
        {error && <div className="error-msg">{error}</div>}

        <div className="form-group">
          <label>Product Name <span style={{ color: 'var(--fail)', fontWeight: 700 }}>*</span></label>
          <input
            type="text"
            placeholder="e.g. Cove Security Hub Gen 3"
            value={name}
            onChange={e => setName(e.target.value)}
            required
          />
        </div>

        <div className="form-group">
          <label>Manufacturer</label>
          <input
            type="text"
            placeholder="e.g. Cove Smart"
            value={manufacturer}
            onChange={e => setManufacturer(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label>Model Number</label>
          <input
            type="text"
            placeholder="e.g. CVH-300"
            value={modelNumber}
            onChange={e => setModelNumber(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label>Category</label>
          <div className="session-type-cards">
            {CATEGORIES.map(cat => (
              <div
                key={cat}
                className={`session-type-card ${category === cat ? 'selected' : ''}`}
                onClick={() => setCategory(cat)}
              >
                <span className="session-type-icon">{CATEGORY_ICONS[cat]}</span>
                <span className="session-type-label">{CATEGORY_LABELS[cat]}</span>
              </div>
            ))}
          </div>
        </div>

        {category && groups.length > 0 && (
          <div className="form-group">
            <label>Capabilities</label>
            <div className="capability-groups">
              {groups.map(group => {
                const allSelected = group.capabilities.every(c => capabilities.has(c.id));
                return (
                  <div key={group.label} className="capability-group">
                    <div className="capability-group-header">
                      <span>{group.label.toUpperCase()}</span>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        style={{ fontSize: 11, padding: '2px 8px' }}
                        onClick={() => selectAllInGroup(group.capabilities)}
                      >
                        {allSelected ? 'Deselect all' : 'Select all'}
                      </button>
                    </div>
                    <div className="capability-checkboxes">
                      {group.capabilities.map(cap => (
                        <label key={cap.id} className="capability-checkbox-item">
                          <input
                            type="checkbox"
                            checked={capabilities.has(cap.id)}
                            onChange={() => toggleCapability(cap.id)}
                            style={{ width: 'auto', marginRight: 8 }}
                          />
                          {cap.label}
                        </label>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
            <div style={{ marginTop: 12, fontSize: 13, color: 'var(--text-muted)' }}>
              <span className="capability-count-badge">{capabilities.size} capabilities selected</span>
            </div>
          </div>
        )}

        <button
          type="submit"
          className="btn btn-primary btn-lg"
          style={{ width: '100%', marginTop: 8 }}
          disabled={saving}
        >
          {saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Product'}
        </button>
      </form>
    </div>
  );
}
