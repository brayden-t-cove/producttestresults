import { useState, useEffect } from 'react';
import { CAPABILITY_GROUPS, CATEGORY_LABELS, CATEGORIES } from '../data/capabilities.js';
import { getDebugInfo, uploadProductImage, deleteProductImage } from '../lib/api.js';
import { SPEC_SCHEMA } from '../data/productSpecs.js';
import SpecsForm from './SpecsForm.jsx';

const CATEGORY_ICONS = {
  hub: '🏠',
  touchpad: '⌨️',
  camera: '📷',
  sensor: '📡',
  app: '📱',
};

// Show app configs for all categories except sensor and touchpad
const SHOW_APP_CONFIGS_FOR = ['hub', 'camera', 'app'];

const SUBCLASS_OPTIONS = {
  camera: [
    'Indoor Stationary',
    'Indoor P/T',
    'Outdoor Stationary',
    'Outdoor P/T',
    'Doorbell',
    'Lightbulb',
    'Window',
    'Pet',
  ],
  hub: [
    'Security Hub',
    'Camera Hub',
  ],
  sensor: [
    'Door/Window',
    'Motion',
    'Glass Break',
    'Smoke',
    'CO',
    'Keyfob',
    'Panic',
    'Flood/Freeze',
  ],
  touchpad: [
    'Touchpad',
    'Keypad',
  ],
};

// Default capabilities pre-checked per subclass
const SUBCLASS_PRESETS = {
  camera: {
    'Indoor Stationary':  ['indoor','wifi-2_4','motion-detection','person-detection','ir-night-vision','two-way-audio','cloud-recording','event-only-recording','cam-set-motion-sensitivity','cam-set-night-vision','cam-set-notif-cooldown'],
    'Indoor P/T':         ['indoor','wifi-2_4','form-pan-tilt','motion-detection','person-detection','ir-night-vision','two-way-audio','cloud-recording','event-only-recording','cam-set-motion-sensitivity','cam-set-night-vision','cam-set-autotrack','cam-set-notif-cooldown'],
    'Outdoor Stationary': ['outdoor','wifi-2_4','motion-detection','person-detection','color-night-vision','two-way-audio','cloud-recording','event-only-recording','cam-set-motion-sensitivity','cam-set-night-vision','cam-set-notif-cooldown'],
    'Outdoor P/T':        ['outdoor','wifi-2_4','form-pan-tilt','motion-detection','person-detection','color-night-vision','two-way-audio','cloud-recording','event-only-recording','cam-set-motion-sensitivity','cam-set-night-vision','cam-set-autotrack','cam-set-notif-cooldown'],
    'Doorbell':           ['doorbell','form-doorbell','doorbell-button','wifi-2_4','motion-detection','person-detection','two-way-audio','cloud-recording','event-only-recording','cam-set-motion-sensitivity','cam-set-notif-cooldown'],
    'Lightbulb':          ['lightbulb','form-bulb','wifi-2_4','motion-detection','two-way-audio','cloud-recording','event-only-recording','cam-set-motion-sensitivity','cam-set-notif-cooldown'],
    'Window':             ['window','indoor','wifi-2_4','motion-detection','cloud-recording','event-only-recording','cam-set-motion-sensitivity','cam-set-notif-cooldown'],
    'Pet':                ['indoor','form-pan-tilt','wifi-2_4','motion-detection','person-detection','two-way-audio','cloud-recording','event-only-recording','cam-set-motion-sensitivity','cam-set-autotrack','cam-set-notif-cooldown'],
  },
  hub: {
    'Security Hub': ['z-wave','rf-sensors','wifi','battery-backup','cellular-backup','onboard-siren','touchpad','key-fob','rf-sensor-peripheral','zwave-devices','professional-monitoring','self-monitoring','hub-set-entry-delay','hub-set-exit-delay','hub-set-alarm-duration','hub-set-siren-volume','hub-set-dialer-delay'],
    'Camera Hub':   ['wifi','ethernet','wifi-devices','professional-monitoring','self-monitoring'],
  },
  sensor: {
    'Door/Window':  ['door-window','rf-345mhz','sensor-battery','tamper-detection','led-indicator','sen-set-entry-delay','sen-set-chime-type','sen-set-chime-volume','sen-set-supervision'],
    'Motion':       ['motion-pir','rf-345mhz','sensor-battery','tamper-detection','led-indicator','pet-immune','sen-set-motion-sensitivity','sen-set-pet-immunity','sen-set-supervision'],
    'Glass Break':  ['glass-break','rf-345mhz','sensor-battery','tamper-detection','led-indicator','sen-set-supervision'],
    'Smoke':        ['smoke-photoelectric','rf-345mhz','sensor-battery','tamper-detection','led-indicator'],
    'CO':           ['co-detector','rf-345mhz','sensor-battery','tamper-detection','led-indicator'],
    'Keyfob':       ['keyfob','rf-345mhz','sensor-battery'],
    'Panic':        ['panic-button','rf-345mhz','sensor-battery'],
    'Flood/Freeze': ['flood-water','freeze','rf-345mhz','sensor-battery','tamper-detection'],
  },
  touchpad: {
    'Touchpad': ['bluetooth','battery-backup','tp-set-brightness','tp-set-volume','tp-set-button-tone'],
    'Keypad':   ['bluetooth','tp-set-brightness','tp-set-volume','tp-set-button-tone'],
  },
};

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

export default function NewProduct({ product, onSave, onBack, catalog, specSchema: specSchemaProp }) {
  const isEdit = !!product;
  const [name, setName] = useState(product?.name || '');
  const [manufacturer, setManufacturer] = useState(product?.manufacturer || '');
  const [modelNumber, setModelNumber] = useState(product?.modelNumber || '');
  const [version, setVersion] = useState(product?.version || '');
  const [revision, setRevision] = useState(product?.revision || '');
  const [replacesProductId, setReplacesProductId] = useState(product?.replacesProductId || '');
  const [status, setStatus] = useState(product?.status || 'active');
  const [category, setCategory] = useState(product?.category || '');
  const [capabilities, setCapabilities] = useState(new Set(product?.capabilities || []));
  const [appConfigs, setAppConfigs] = useState(product?.appConfigs || []);
  const [specs, setSpecs] = useState(product?.specs || {});
  const [specNotes, setSpecNotes] = useState(product?.specNotes || {});
  const [compatibleWith, setCompatibleWith] = useState(product?.compatibleWith || []);
  const [hubConnectionType, setHubConnectionType] = useState(product?.hubConnectionType || 'standalone');
  const [subclass, setSubclass] = useState(product?.subclass || '');
  const [entity, setEntity] = useState(product?.entity || []);
  const [productType, setProductType] = useState(product?.type || 'production');
  const [showAddAppForm, setShowAddAppForm] = useState(false);
  const [editingConfigId, setEditingConfigId] = useState(null);
  const [imageUrl, setImageUrl] = useState(product?.imageUrl || null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [debugInfo, setDebugInfo] = useState(null);

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

  async function handleImageUpload(e) {
    const file = e.target.files[0];
    if (!file || !product?.id) return;
    setUploadingImage(true);
    try {
      const result = await uploadProductImage(product.id, file);
      setImageUrl(result.imageUrl);
    } catch (err) {
      setError('Failed to upload image: ' + err.message);
    } finally {
      setUploadingImage(false);
    }
  }

  async function handleImageRemove() {
    if (!product?.id) return;
    try {
      await deleteProductImage(product.id);
      setImageUrl(null);
    } catch (err) {
      setError('Failed to remove image: ' + err.message);
    }
  }

  async function handleSave(e) {
    e.preventDefault();
    if (productType !== 'competitor' && !name.trim()) {
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
        revision: revision.trim() || undefined,
        replacesProductId: replacesProductId || undefined,
        status,
        category,
        capabilities: Array.from(capabilities),
        appConfigs,
        specs,
        specNotes: Object.keys(specNotes).length > 0 ? specNotes : undefined,
        compatibleWith,
        hubConnectionType: category === 'camera' ? hubConnectionType : undefined,
        subclass: SUBCLASS_OPTIONS[category] ? subclass : undefined,
        imageUrl,
        entity,
        type: productType,
      });
    } catch (err) {
      setError(err.message || 'Failed to save product.');
      setSaving(false);
      getDebugInfo().then(setDebugInfo).catch(() => setDebugInfo({ status: 'unreachable' }));
    }
  }

  const groups = category ? (CAPABILITY_GROUPS[category] || []) : [];
  const showAppConfigs = SHOW_APP_CONFIGS_FOR.includes(category) && capabilities.size > 0;
  const effectiveSchema = specSchemaProp || SPEC_SCHEMA;
  const specSchema = category ? (effectiveSchema[category] || null) : null;
  const [specsOpen, setSpecsOpen] = useState(false);

  return (
    <div className="new-product-page">
      <div className="new-product-header">
        <button className="btn btn-ghost btn-sm" onClick={onBack} style={{ marginBottom: 12 }}>
          ← Back
        </button>
        <h1>{isEdit ? 'Edit Product' : 'New Product'}</h1>
      </div>

      <form onSubmit={handleSave}>
        {error && (
          <div>
            <div className="error-msg">{error}</div>
            {debugInfo && (
              <div style={{ marginTop: 8, background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 6, padding: 12, fontSize: 12, fontFamily: 'monospace' }}>
                <div style={{ fontWeight: 700, marginBottom: 6, color: 'var(--text-muted)' }}>
                  DEBUG INFO
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    style={{ marginLeft: 8, fontSize: 11, padding: '1px 6px' }}
                    onClick={() => navigator.clipboard.writeText(JSON.stringify(debugInfo, null, 2))}
                  >
                    Copy
                  </button>
                </div>
                <div style={{ color: debugInfo.status === 'ok' ? 'var(--pass)' : 'var(--fail)', marginBottom: 4 }}>
                  Server status: {debugInfo.status ?? 'unknown'}
                </div>
                {debugInfo.checks && Object.entries(debugInfo.checks).map(([key, val]) => (
                  <div key={key} style={{ marginBottom: 2 }}>
                    <span style={{ color: val.ok ? 'var(--pass)' : 'var(--fail)' }}>{val.ok ? '✓' : '✗'}</span>
                    {' '}{key}
                    {val.error && <span style={{ color: 'var(--fail)' }}> — {val.error}</span>}
                    {val.entries != null && <span style={{ color: 'var(--text-muted)' }}> ({val.entries} entries)</span>}
                    {val.uptime && <span style={{ color: 'var(--text-muted)' }}> uptime {val.uptime}</span>}
                  </div>
                ))}
                {debugInfo.error && <div style={{ color: 'var(--fail)' }}>{debugInfo.error}</div>}
              </div>
            )}
          </div>
        )}

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
          <label>Product Image</label>
          {isEdit ? (
            <div className="product-image-upload">
              {imageUrl ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                  <img src={imageUrl} alt="Product" style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 8, border: '1px solid var(--border)' }} />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <label className="btn btn-secondary btn-sm" style={{ cursor: 'pointer' }}>
                      Change Image
                      <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImageUpload} />
                    </label>
                    <button type="button" className="btn btn-ghost btn-sm" onClick={handleImageRemove} disabled={uploadingImage}>
                      Remove
                    </button>
                  </div>
                </div>
              ) : (
                <label className="image-upload-dropzone" style={{ cursor: 'pointer' }}>
                  <div style={{ fontSize: 32, marginBottom: 8 }}>📷</div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>Upload product image</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>PNG, JPG, WEBP up to 5MB</div>
                  <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImageUpload} />
                  {uploadingImage && <div style={{ marginTop: 8, fontSize: 12, color: 'var(--primary)' }}>Uploading...</div>}
                </label>
              )}
            </div>
          ) : (
            <div style={{ fontSize: 13, color: 'var(--text-muted)', padding: '8px 0' }}>
              Save the product first, then edit it to add an image.
            </div>
          )}
        </div>

        <div className="form-group">
          <label>Manufacturer {productType === 'competitor' && <span style={{ color: 'var(--primary)', fontWeight: 400 }}>(brand identity for competitor products)</span>}</label>
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
          <label>Hardware Revision <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(optional)</span></label>
          <input
            type="text"
            placeholder="e.g. Rev A, Rev B, PCB-2"
            value={revision}
            onChange={e => setRevision(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label>Status</label>
          <select value={status} onChange={e => setStatus(e.target.value)}>
            <option value="active">Active</option>
            <option value="in-development">In Development</option>
            <option value="in-testing">In Testing</option>
            <option value="eol">EOL</option>
            <option value="discontinued">Discontinued</option>
            <option value="on-hold">On Hold</option>
            <option value="under-evaluation">Under Evaluation</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>

        <div className="form-group">
          <label>Replaces Product <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(optional — for hardware revisions)</span></label>
          <select value={replacesProductId} onChange={e => setReplacesProductId(e.target.value)}>
            <option value="">— None —</option>
            {(catalog || []).filter(p => p.id !== product?.id).map(p => (
              <option key={p.id} value={p.id}>
                {p.modelNumber || p.name}{p.revision ? ` (${p.revision})` : ''}{p.version ? ` ${p.version}` : ''}
              </option>
            ))}
          </select>
        </div>

        {productType !== 'competitor' && (
          <div className="form-group">
            <label>Entity <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(select all that apply)</span></label>
            <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
              {['Cove', 'Luna', 'Alder', 'Instavision'].map(e => (
                <label key={e} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={entity.includes(e)}
                    onChange={() => setEntity(prev => prev.includes(e) ? prev.filter(x => x !== e) : [...prev, e])}
                    style={{ width: 'auto' }}
                  />
                  {e}
                </label>
              ))}
            </div>
          </div>
        )}

        <div className="form-group">
          <label>Type</label>
          <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
            {[
              { value: 'production', label: 'Production' },
              { value: 'sample', label: 'Sample' },
              { value: 'prototype', label: 'Prototype' },
              { value: 'competitor', label: 'Competitor' },
            ].map(opt => (
              <label key={opt.value} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="productType"
                  value={opt.value}
                  checked={productType === opt.value}
                  onChange={() => setProductType(opt.value)}
                  style={{ width: 'auto' }}
                />
                {opt.label}
              </label>
            ))}
          </div>
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

        {/* Subclass — shown when category has defined subclasses */}
        {SUBCLASS_OPTIONS[category] && (
          <div className="form-group">
            <label>Subclass <span style={{ fontWeight: 400, textTransform: 'none', fontSize: 12, color: 'var(--text-muted)' }}>(optional)</span></label>
            <select value={subclass} onChange={e => {
              const val = e.target.value;
              setSubclass(val);
              if (!isEdit && val && SUBCLASS_PRESETS[category]?.[val]) {
                setCapabilities(new Set(SUBCLASS_PRESETS[category][val]));
              }
            }}>
              <option value="">— Select subclass —</option>
              {SUBCLASS_OPTIONS[category].map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            {subclass && SUBCLASS_PRESETS[category]?.[subclass] && (
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                Capabilities pre-filled based on subclass — adjust below as needed.
              </div>
            )}
          </div>
        )}

        {/* Camera: Hub/NVR/DVR Connection Type */}
        {category === 'camera' && (
          <div className="form-group">
            <label>Hub / NVR / DVR Connection</label>
            <select value={hubConnectionType} onChange={e => setHubConnectionType(e.target.value)}>
              <option value="standalone">Standalone (no hub required)</option>
              <option value="hub">Connects to Hub / Chime</option>
              <option value="nvr-dvr">Connects to NVR / DVR</option>
              <option value="proprietary-base">Connects to Proprietary Base Station</option>
            </select>
          </div>
        )}

        {/* Technical Specifications Section */}
        {specSchema && (
          <div className="app-config-section" style={{ marginBottom: 16 }}>
            <button
              type="button"
              className="spec-group-header"
              style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, padding: '10px 0', borderBottom: '1px solid var(--border)' }}
              onClick={() => setSpecsOpen(o => !o)}
              aria-expanded={specsOpen}
            >
              <span style={{ fontWeight: 700, fontSize: 15 }}>
                {specsOpen ? '▾' : '▸'} Technical Specifications
              </span>
              <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 400 }}>
                Optional — for internal records and QA reference.
              </span>
            </button>
            {specsOpen && (
              <div style={{ marginTop: 12 }}>
                <SpecsForm
                  schema={specSchema}
                  values={specs}
                  notes={specNotes}
                  onChange={(id, val) => setSpecs(prev => ({ ...prev, [id]: val }))}
                  onNoteChange={(id, val) => setSpecNotes(prev => ({ ...prev, [id]: val }))}
                />
              </div>
            )}
          </div>
        )}

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

        {/* Compatible Apps / Compatible With Section */}
        {category && (() => {
          const compatCats = {
            sensor: ['hub'],
            touchpad: ['hub'],
            camera: ['app'],
            hub: ['app'],
            app: ['hub', 'camera'],
          }[category] || [];
          const compatOptions = (catalog || []).filter(p => compatCats.includes(p.category) && p.id !== product?.id);
          if (compatOptions.length === 0) return null;
          const labelText = category === 'camera' ? 'Compatible Apps' : 'Compatible with';
          function toggleCompat(id) {
            setCompatibleWith(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
          }
          return (
            <div className="form-group">
              <label>{labelText}</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {compatOptions.map(p => (
                  <label key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={compatibleWith.includes(p.id)}
                      onChange={() => toggleCompat(p.id)}
                      style={{ width: 'auto' }}
                    />
                    <span>{p.name}{p.version ? ` ${p.version}` : ''}</span>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{p.category}</span>
                  </label>
                ))}
              </div>
            </div>
          );
        })()}

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
