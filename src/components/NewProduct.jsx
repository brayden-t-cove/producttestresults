import { useState, useEffect } from 'react';
import { CAPABILITY_GROUPS, CATEGORY_LABELS, CATEGORIES } from '../data/capabilities.js';

const CATEGORY_ICONS = {
  hub: '🏠',
  touchpad: '⌨️',
  camera: '📷',
  sensor: '📡',
  app: '📱',
};

// Show app configs for all categories except sensor and touchpad
const SHOW_APP_CONFIGS_FOR = ['hub', 'camera', 'app'];

// Helper: look up capability label by ID
function getCapabilityLabel(capId) {
  for (const groupList of Object.values(CAPABILITY_GROUPS)) {
    for (const group of groupList) {
      const cap = group.capabilities.find(c => c.id === capId);
      if (cap) return cap.label;
    }
  }
  return capId;
}

function platformLabel(platform) {
  if (platform === 'ios') return 'iOS';
  if (platform === 'android') return 'Android';
  return 'iOS/Android';
}

function AppConfigForm({ capabilities, initialData, onSave, onCancel, catalogApps }) {
  const [appName, setAppName] = useState(initialData?.appName || '');
  const [platform, setPlatform] = useState(initialData?.platform || 'both');
  const [unavailable, setUnavailable] = useState(new Set(initialData?.unavailableCapabilities || []));

  function handleSelectCatalogApp(app) {
    if (!app) return;
    setAppName(app.name);
    // prefill platform from app category capabilities
    const hasiOS = (app.capabilities || []).includes('ios');
    const hasAndroid = (app.capabilities || []).includes('android');
    if (hasiOS && hasAndroid) setPlatform('both');
    else if (hasiOS) setPlatform('ios');
    else if (hasAndroid) setPlatform('android');
    else setPlatform('both');
    // start with nothing unavailable — user unchecks what's hidden
    setUnavailable(new Set());
  }
  function toggleUnavailable(capId) {
    setUnavailable(prev => {
      const next = new Set(prev);
      if (next.has(capId)) next.delete(capId);
      else next.add(capId);
      return next;
    });
  }

  function handleSave() {
    if (!appName.trim()) return;
    onSave({
      id: initialData?.id || crypto.randomUUID(),
      appName: appName.trim(),
      platform,
      unavailableCapabilities: Array.from(unavailable),
    });
  }

  const capList = Array.from(capabilities);

  return (
    <div className="app-config-form">
      {catalogApps && catalogApps.length > 0 && (
        <div className="form-group" style={{ marginBottom: 12 }}>
          <label>Pick from catalog <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(prefills name & platform)</span></label>
          <select onChange={e => handleSelectCatalogApp(catalogApps.find(a => a.id === e.target.value))} defaultValue="">
            <option value="">— Select an app —</option>
            {catalogApps.map(a => (
              <option key={a.id} value={a.id}>{a.name}{a.version ? ` ${a.version}` : ''}</option>
            ))}
          </select>
        </div>
      )}
      <div className="form-group" style={{ marginBottom: 12 }}>
        <label>App Name</label>
        <input
          type="text"
          placeholder="e.g. InstaVision, Alula, Wyze App"
          value={appName}
          onChange={e => setAppName(e.target.value)}
        />
      </div>

      <div className="form-group" style={{ marginBottom: 12 }}>
        <label>Platform</label>
        <div className="platform-toggle">
          {[
            { id: 'ios', label: 'iOS' },
            { id: 'android', label: 'Android' },
            { id: 'both', label: 'Both' },
          ].map(opt => (
            <button
              key={opt.id}
              type="button"
              className={platform === opt.id ? 'active' : ''}
              onClick={() => setPlatform(opt.id)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {capList.length > 0 && (
        <div className="form-group" style={{ marginBottom: 12 }}>
          <label>Check features that are NOT available in this app</label>
          <div className="capability-checkboxes" style={{ background: 'var(--bg)', borderRadius: 4, padding: 8 }}>
            {capList.map(capId => (
              <label key={capId} className="capability-checkbox-item">
                <input
                  type="checkbox"
                  checked={unavailable.has(capId)}
                  onChange={() => toggleUnavailable(capId)}
                  style={{ width: 'auto', marginRight: 8 }}
                />
                {getCapabilityLabel(capId)}
              </label>
            ))}
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
        <button
          type="button"
          className="btn btn-primary btn-sm"
          onClick={handleSave}
          disabled={!appName.trim()}
        >
          {initialData ? 'Save Changes' : 'Add App'}
        </button>
        <button type="button" className="btn btn-ghost btn-sm" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  );
}

export default function NewProduct({ product, onSave, onBack, catalog }) {
  const isEdit = !!product;
  const [name, setName] = useState(product?.name || '');
  const [manufacturer, setManufacturer] = useState(product?.manufacturer || '');
  const [modelNumber, setModelNumber] = useState(product?.modelNumber || '');
  const [version, setVersion] = useState(product?.version || '');
  const [category, setCategory] = useState(product?.category || '');
  const [capabilities, setCapabilities] = useState(new Set(product?.capabilities || []));
  const [appConfigs, setAppConfigs] = useState(product?.appConfigs || []);
  const [showAddAppForm, setShowAddAppForm] = useState(false);
  const [editingConfigId, setEditingConfigId] = useState(null);
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

  function handleAddAppConfig(config) {
    setAppConfigs(prev => [...prev, config]);
    setShowAddAppForm(false);
  }

  function handleEditAppConfig(config) {
    setAppConfigs(prev => prev.map(ac => ac.id === config.id ? config : ac));
    setEditingConfigId(null);
  }

  function handleRemoveAppConfig(id) {
    setAppConfigs(prev => prev.filter(ac => ac.id !== id));
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
        version: version.trim(),
        category,
        capabilities: Array.from(capabilities),
        appConfigs,
      });
    } catch (err) {
      setError(err.message || 'Failed to save product.');
      setSaving(false);
    }
  }

  const groups = category ? (CAPABILITY_GROUPS[category] || []) : [];
  const showAppConfigs = SHOW_APP_CONFIGS_FOR.includes(category) && capabilities.size > 0;

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
          <label>Version <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(optional)</span></label>
          <input
            type="text"
            placeholder="e.g. V1, V2, Rev B"
            value={version}
            onChange={e => setVersion(e.target.value)}
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

        {/* App Configurations Section */}
        {showAppConfigs && (
          <div className="app-config-section">
            <div style={{ marginBottom: 12 }}>
              <h3 style={{ marginBottom: 4 }}>App Configurations</h3>
              <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                Define which apps control this device and which features each app supports.
              </p>
            </div>

            {appConfigs.length > 0 && (
              <div className="app-config-list">
                {appConfigs.map(ac => (
                  <div key={ac.id}>
                    {editingConfigId === ac.id ? (
                      <AppConfigForm
                        capabilities={capabilities}
                        initialData={ac}
                        onSave={handleEditAppConfig}
                        onCancel={() => setEditingConfigId(null)}
                        catalogApps={catalog?.filter(p => p.category === 'app') || []}
                      />
                    ) : (
                      <div className="app-config-item">
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <span style={{ fontWeight: 600, fontSize: 14 }}>{ac.appName}</span>
                          <span
                            className="badge"
                            style={{ marginLeft: 8, background: 'var(--primary-dim)', color: 'var(--primary)' }}
                          >
                            {platformLabel(ac.platform)}
                          </span>
                          <span style={{ marginLeft: 10, fontSize: 12, color: 'var(--text-muted)' }}>
                            {ac.unavailableCapabilities.length > 0
                              ? `${ac.unavailableCapabilities.length} feature${ac.unavailableCapabilities.length !== 1 ? 's' : ''} hidden`
                              : 'All features available'}
                          </span>
                        </div>
                        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            onClick={() => {
                              setEditingConfigId(ac.id);
                              setShowAddAppForm(false);
                            }}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className="btn btn-danger btn-sm"
                            onClick={() => handleRemoveAppConfig(ac.id)}
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {showAddAppForm ? (
              <AppConfigForm
                capabilities={capabilities}
                initialData={null}
                onSave={handleAddAppConfig}
                onCancel={() => setShowAddAppForm(false)}
                catalogApps={catalog?.filter(p => p.category === 'app') || []}
              />
            ) : (
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                style={{ marginTop: appConfigs.length > 0 ? 10 : 0 }}
                onClick={() => {
                  setShowAddAppForm(true);
                  setEditingConfigId(null);
                }}
              >
                + Add App
              </button>
            )}
          </div>
        )}

        <button
          type="submit"
          className="btn btn-primary btn-lg"
          style={{ width: '100%', marginTop: 16 }}
          disabled={saving}
        >
          {saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Product'}
        </button>
      </form>
    </div>
  );
}
