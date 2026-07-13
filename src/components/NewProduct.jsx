import { useState, useEffect } from 'react';
import { CAPABILITY_GROUPS, CATEGORY_LABELS, CATEGORIES } from '../data/capabilities.js';
import { getDebugInfo, getCatalogParents } from '../lib/api.js';

const CAMERA_CATEGORIES = new Set(['Indoor Camera', 'Outdoor Camera', 'Doorbell Camera', 'Floodlight Camera', 'PTZ Camera', 'Indoor', 'Outdoor', 'Doorbell', 'Floodlight']);

function toDriveDirectUrl(url) {
  if (!url) return url;
  const match = url.match(/drive\.google\.com\/file\/d\/([^/]+)/);
  if (match) return `https://lh3.googleusercontent.com/d/${match[1]}`;
  return url;
}
import { SPEC_SCHEMA } from '../data/productSpecs.js';
import SpecsForm from './SpecsForm.jsx';

const CATEGORY_ICONS = {
  hub: '🏠',
  touchpad: '⌨️',
  camera: '📷',
  sensor: '📡',
  app: '📱',
};

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

function getCapabilityLabel(capId) {
  for (const groupList of Object.values(CAPABILITY_GROUPS)) {
    for (const group of groupList) {
      const cap = group.capabilities.find(c => c.id === capId);
      if (cap) return cap.label;
    }
  }
  return capId;
}

// ─── Wizard step definitions ──────────────────────────────────────────────────

const STEPS = [
  { id: 'basics',       label: 'Basic Info' },
  { id: 'specs',        label: 'Tech Specs' },
  { id: 'capabilities', label: 'Capabilities' },
];

// ─── Step indicator bar ───────────────────────────────────────────────────────

function StepBar({ steps, current, onGoto, maxReached }) {
  return (
    <div className="wizard-step-bar">
      {steps.map((step, i) => {
        const done = i < current;
        const active = i === current;
        const reachable = i <= maxReached;
        return (
          <button
            key={step.id}
            type="button"
            className={`wizard-step-btn ${active ? 'active' : ''} ${done ? 'done' : ''}`}
            disabled={!reachable}
            onClick={() => reachable && onGoto(i)}
          >
            <span className="wizard-step-num">{done ? '✓' : i + 1}</span>
            <span className="wizard-step-label">{step.label}</span>
          </button>
        );
      })}
    </div>
  );
}

// ─── Tab bar (edit mode) ──────────────────────────────────────────────────────

function TabBar({ steps, current, onChange }) {
  return (
    <div className="wizard-tab-bar">
      {steps.map((step, i) => (
        <button
          key={step.id}
          type="button"
          className={`wizard-tab-btn ${i === current ? 'active' : ''}`}
          onClick={() => onChange(i)}
        >
          {step.label}
        </button>
      ))}
    </div>
  );
}

// ─── Step 1: Basic Info ───────────────────────────────────────────────────────

function StepBasics({ state, set, catalog, product, isEdit }) {
  return (
    <div className="wizard-step-content">

      {/* Type */}
      <div className="form-group">
        <label>Type</label>
        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
          {[
            { value: 'production', label: 'Production' },
            { value: 'sample',     label: 'Sample' },
            { value: 'prototype',  label: 'Prototype' },
            { value: 'competitor', label: 'Competitor' },
          ].map(opt => (
            <label key={opt.value} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, cursor: 'pointer' }}>
              <input
                type="radio"
                name="productType"
                value={opt.value}
                checked={state.productType === opt.value}
                onChange={() => set('productType', opt.value)}
                style={{ width: 'auto' }}
              />
              {opt.label}
            </label>
          ))}
        </div>
      </div>

      {/* Category */}
      <div className="form-group">
        <label>Category <span style={{ color: 'var(--fail)', fontWeight: 700 }}>*</span></label>
        <div className="session-type-cards">
          {CATEGORIES.map(cat => (
            <div
              key={cat}
              className={`session-type-card ${state.category === cat ? 'selected' : ''}`}
              onClick={() => set('category', cat)}
            >
              <span className="session-type-icon">{CATEGORY_ICONS[cat]}</span>
              <span className="session-type-label">{CATEGORY_LABELS[cat]}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Subclass — immediately follows category */}
      {SUBCLASS_OPTIONS[state.category] && (
        <div className="form-group">
          <label>Subclass <span style={{ fontWeight: 400, fontSize: 12, color: 'var(--text-muted)' }}>(optional)</span></label>
          <select
            value={state.subclass}
            onChange={e => {
              const val = e.target.value;
              set('subclass', val);
              if (!isEdit && val && SUBCLASS_PRESETS[state.category]?.[val]) {
                set('capabilities', new Set(SUBCLASS_PRESETS[state.category][val]));
              }
            }}
          >
            <option value="">— Select subclass —</option>
            {SUBCLASS_OPTIONS[state.category].map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          {state.subclass && SUBCLASS_PRESETS[state.category]?.[state.subclass] && (
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
              Capabilities will be pre-filled based on subclass — adjust on the Capabilities step.
            </div>
          )}
        </div>
      )}

      {/* Manufacturer */}
      <div className="form-group">
        <label>
          Manufacturer
          {state.productType === 'competitor' && (
            <span style={{ color: 'var(--primary)', fontWeight: 400, marginLeft: 6 }}>(brand identity for competitor products)</span>
          )}
        </label>
        <input
          type="text"
          placeholder="e.g. Cove Smart"
          value={state.manufacturer}
          onChange={e => set('manufacturer', e.target.value)}
        />
      </div>

      {/* Model Number */}
      <div className="form-group">
        <label>Model Number</label>
        <input
          type="text"
          placeholder="e.g. CVH-300"
          value={state.modelNumber}
          onChange={e => set('modelNumber', e.target.value)}
        />
      </div>

      {/* Product Name */}
      <div className="form-group">
        <label>
          Product Name
          {state.productType !== 'competitor' && <span style={{ color: 'var(--fail)', fontWeight: 700, marginLeft: 4 }}>*</span>}
        </label>
        <input
          type="text"
          placeholder="e.g. Cove Security Hub Gen 3"
          value={state.name}
          onChange={e => set('name', e.target.value)}
        />
      </div>

      {/* Version + Hardware Revision side-by-side */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label>Version <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(optional)</span></label>
          <input
            type="text"
            placeholder="e.g. V1, V2"
            value={state.version}
            onChange={e => set('version', e.target.value)}
          />
        </div>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label>Hardware Revision <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(optional)</span></label>
          <input
            type="text"
            placeholder="e.g. Rev A, PCB-2"
            value={state.revision}
            onChange={e => set('revision', e.target.value)}
          />
        </div>
      </div>

      {/* Status */}
      <div className="form-group" style={{ marginTop: 16 }}>
        <label>Status</label>
        <select value={state.status} onChange={e => set('status', e.target.value)}>
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

      {/* Entity — hidden for competitor */}
      {state.productType !== 'competitor' && (
        <div className="form-group">
          <label>Entity <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(select all that apply)</span></label>
          <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
            {['Cove', 'Luna', 'Alder', 'InstaVision'].map(e => (
              <label key={e} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={state.entity.includes(e)}
                  onChange={() => {
                    const next = state.entity.includes(e)
                      ? state.entity.filter(x => x !== e)
                      : [...state.entity, e];
                    set('entity', next);
                  }}
                  style={{ width: 'auto' }}
                />
                {e}
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Hub/NVR/DVR — cameras only */}
      {state.category === 'camera' && (
        <div className="form-group">
          <label>Hub / NVR / DVR Connection</label>
          <select value={state.hubConnectionType} onChange={e => set('hubConnectionType', e.target.value)}>
            <option value="standalone">Standalone (no hub required)</option>
            <option value="hub">Connects to Hub / Chime</option>
            <option value="nvr-dvr">Connects to NVR / DVR</option>
            <option value="proprietary-base">Connects to Proprietary Base Station</option>
          </select>
        </div>
      )}

      {/* Variation Label — shown when linked to a parent platform model */}
      {state.parentId && (
        <div className="form-group">
          <label>Variation Label</label>
          <input
            className="form-control"
            placeholder="e.g. Dual Band + BLE, Single Band, 4MP"
            value={state.variationLabel || ''}
            onChange={e => set('variationLabel', e.target.value)}
          />
          <div className="form-hint">Short description of what makes this variation distinct from the base model.</div>
        </div>
      )}

      {/* Replaces Product */}
      <div className="form-group">
        <label>Replaces Product <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(optional — for hardware revisions)</span></label>
        <select value={state.replacesProductId} onChange={e => set('replacesProductId', e.target.value)}>
          <option value="">— None —</option>
          {(catalog || []).filter(p => p.id !== product?.id).map(p => (
            <option key={p.id} value={p.id}>
              {p.modelNumber || p.name}{p.revision ? ` (${p.revision})` : ''}{p.version ? ` ${p.version}` : ''}
            </option>
          ))}
        </select>
      </div>

      {/* Product Image — edit mode only */}
      {isEdit && (
        <div className="form-group">
          <label>Product Image URL</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {state.imageUrl && (
              <img
                src={state.imageUrl}
                alt="Product"
                style={{ width: 100, height: 100, objectFit: 'cover', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface-2)' }}
                onError={e => { e.target.style.display = 'none'; }}
              />
            )}
            <input
              type="url"
              className="form-control"
              placeholder="Paste image URL or Google Drive share link"
              value={state.imageUrl || ''}
              onChange={e => set('imageUrl', toDriveDirectUrl(e.target.value.trim()) || null)}
            />
            {state.imageUrl && (
              <button type="button" className="btn btn-ghost btn-sm" style={{ alignSelf: 'flex-start' }} onClick={() => set('imageUrl', null)}>
                Remove image
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Step 2: Tech Specs ───────────────────────────────────────────────────────

function StepSpecs({ state, set, specSchemaProp }) {
  const effectiveSchema = specSchemaProp || SPEC_SCHEMA;
  const specSchema = state.category ? (effectiveSchema[state.category] || null) : null;

  if (!specSchema) {
    return (
      <div className="wizard-step-content">
        <div style={{ color: 'var(--text-muted)', fontSize: 14, padding: '24px 0' }}>
          Select a category on the Basic Info step to unlock tech specs.
        </div>
      </div>
    );
  }

  return (
    <div className="wizard-step-content">
      <SpecsForm
        schema={specSchema}
        values={state.specs}
        notes={state.specNotes}
        onChange={(id, val) => set('specs', { ...state.specs, [id]: val })}
        onNoteChange={(id, val) => set('specNotes', { ...state.specNotes, [id]: val })}
      />
    </div>
  );
}

// ─── Step 3: Capabilities ─────────────────────────────────────────────────────

function StepCapabilities({ state, set }) {
  const groups = state.category ? (CAPABILITY_GROUPS[state.category] || []) : [];

  function toggleCapability(id) {
    const next = new Set(state.capabilities);
    if (next.has(id)) next.delete(id); else next.add(id);
    set('capabilities', next);
  }

  function selectAllInGroup(groupCapabilities) {
    const allIds = groupCapabilities.map(c => c.id);
    const allSelected = allIds.every(id => state.capabilities.has(id));
    const next = new Set(state.capabilities);
    if (allSelected) allIds.forEach(id => next.delete(id));
    else allIds.forEach(id => next.add(id));
    set('capabilities', next);
  }

  if (groups.length === 0) {
    return (
      <div className="wizard-step-content">
        <div style={{ color: 'var(--text-muted)', fontSize: 14, padding: '24px 0' }}>
          Select a category on the Basic Info step to unlock capabilities.
        </div>
      </div>
    );
  }

  return (
    <div className="wizard-step-content">
      <div className="capability-groups">
        {groups.map(group => {
          const allSelected = group.capabilities.every(c => state.capabilities.has(c.id));
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
                      checked={state.capabilities.has(cap.id)}
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
        <span className="capability-count-badge">{state.capabilities.size} capabilities selected</span>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function NewProduct({ product, onSave, onBack, catalog, specSchema: specSchemaProp, currentUser }) {
  const isEdit = !!product;

  // Parent search gate (new products only)
  const [parentSearchDone, setParentSearchDone] = useState(isEdit);
  const [parentModels, setParentModels] = useState([]);
  const [parentSearch, setParentSearch] = useState('');
  const [selectedParentId, setSelectedParentId] = useState(null);

  useEffect(() => {
    if (!isEdit) getCatalogParents().then(setParentModels).catch(() => {});
  }, [isEdit]);

  // All form state in one object for easy prop-drilling
  const [state, setState] = useState({
    name:              product?.name || '',
    manufacturer:      product?.manufacturer || '',
    modelNumber:       product?.modelNumber || '',
    version:           product?.version || '',
    revision:          product?.revision || '',
    replacesProductId: product?.replacesProductId || '',
    status:            product?.status || 'active',
    category:          product?.category || '',
    capabilities:      new Set(product?.capabilities || []),
    specs:             product?.specs || {},
    specNotes:         product?.specNotes || {},
    compatibleWith:    product?.compatibleWith || [],
    hubConnectionType: product?.hubConnectionType || 'standalone',
    subclass:          product?.subclass || '',
    entity:            product?.entity || [],
    productType:       product?.type || 'production',
    imageUrl:          product?.imageUrl || null,
    parentId:          product?.parentId || null,
    variationLabel:    product?.variationLabel || '',
  });

  function set(key, value) {
    setState(prev => ({ ...prev, [key]: value }));
  }

  // When category changes on new product, reset capabilities
  const prevCategory = useState(state.category)[0];
  useEffect(() => {
    if (!isEdit) {
      setState(prev => ({ ...prev, capabilities: new Set() }));
    }
  }, [state.category]); // eslint-disable-line react-hooks/exhaustive-deps

  const [step, setStep] = useState(0);
  const [maxReached, setMaxReached] = useState(isEdit ? STEPS.length - 1 : 0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [debugInfo, setDebugInfo] = useState(null);

  function goTo(i) {
    setStep(i);
    setMaxReached(prev => Math.max(prev, i));
  }

  function handleNext() {
    if (step === 0) {
      if (!state.category) { setError('Please select a category.'); return; }
      if (state.productType !== 'competitor' && !state.name.trim()) { setError('Product name is required.'); return; }
    }
    setError('');
    goTo(step + 1);
  }

  function handleBack() {
    if (step === 0) onBack();
    else setStep(s => s - 1);
  }


  async function handleSave(e) {
    e.preventDefault();
    if (state.productType !== 'competitor' && !state.name.trim()) {
      setError('Product name is required.');
      return;
    }
    if (!state.category) {
      setError('Please select a category.');
      return;
    }
    setError('');
    setSaving(true);
    try {
      await onSave({
        ...(product || {}),
        name:             state.name.trim(),
        manufacturer:     state.manufacturer.trim(),
        modelNumber:      state.modelNumber.trim(),
        version:          state.version.trim(),
        revision:         state.revision.trim() || undefined,
        replacesProductId: state.replacesProductId || undefined,
        status:           state.status,
        category:         state.category,
        capabilities:     Array.from(state.capabilities),
        specs:            state.specs,
        specNotes:        Object.keys(state.specNotes).length > 0 ? state.specNotes : undefined,
        compatibleWith:   state.compatibleWith,
        hubConnectionType: state.category === 'camera' ? state.hubConnectionType : undefined,
        subclass:         SUBCLASS_OPTIONS[state.category] ? state.subclass : undefined,
        imageUrl:         state.imageUrl,
        entity:           state.entity,
        type:             state.productType,
        parentId:         state.parentId || undefined,
        variationLabel:   state.variationLabel || undefined,
      });
    } catch (err) {
      setError(err.message || 'Failed to save product.');
      setSaving(false);
      getDebugInfo().then(setDebugInfo).catch(() => setDebugInfo({ status: 'unreachable' }));
    }
  }

  const isLastStep = step === STEPS.length - 1;

  // ── Parent search gate (new products only) ──────────────────────────────
  if (!isEdit && !parentSearchDone) {
    const filtered = parentModels.filter(p =>
      !parentSearch ||
      (p.name || '').toLowerCase().includes(parentSearch.toLowerCase()) ||
      (p.modelNumber || '').toLowerCase().includes(parentSearch.toLowerCase()) ||
      (p.category || '').toLowerCase().includes(parentSearch.toLowerCase())
    );
    return (
      <div className="new-product-page">
        <div className="new-product-header">
          <button className="btn btn-ghost btn-sm" onClick={onBack} style={{ marginBottom: 12 }}>← Cancel</button>
          <h1>New Product</h1>
        </div>
        <div style={{ maxWidth: 560 }}>
          <h2 style={{ fontSize: 17, fontWeight: 700, marginBottom: 8 }}>Is this based on an existing platform model?</h2>
          <p style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 20 }}>
            Search existing hardware platforms before creating a new entry. If your product runs on a known platform, link it as a variation. For sensors, hubs, or touchpads, skip this step.
          </p>
          <input
            className="form-control"
            placeholder="Search by name, model number, or category..."
            value={parentSearch}
            onChange={e => setParentSearch(e.target.value)}
            autoFocus
            style={{ marginBottom: 16 }}
          />
          {filtered.length > 0 && (
            <div style={{ maxHeight: 340, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
              {filtered.map(p => (
                <div
                  key={p.id}
                  className={`parent-model-card${selectedParentId === p.id ? ' selected' : ''}`}
                  onClick={() => setSelectedParentId(prev => prev === p.id ? null : p.id)}
                >
                  {p.imageUrl && (
                    <img src={p.imageUrl} alt="" onError={e => { e.target.style.display = 'none'; }} />
                  )}
                  <div className="parent-model-card-info">
                    <div className="parent-model-card-name">{p.name || p.modelNumber}</div>
                    <div className="parent-model-card-meta">{[p.category, p.subclass, p.manufacturer].filter(Boolean).join(' · ')}</div>
                  </div>
                  {selectedParentId === p.id && <span style={{ color: 'var(--primary)', fontWeight: 700, fontSize: 18 }}>✓</span>}
                </div>
              ))}
            </div>
          )}
          {parentSearch && filtered.length === 0 && (
            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>No matching platform models found.</div>
          )}
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <button className="btn btn-secondary" onClick={() => { setSelectedParentId(null); set('parentId', null); setParentSearchDone(true); }}>
              Skip — Not a platform variation
            </button>
            {selectedParentId && (
              <button className="btn btn-primary" onClick={() => { set('parentId', selectedParentId); setParentSearchDone(true); }}>
                Continue as Variation →
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="new-product-page">
      <div className="new-product-header">
        <button className="btn btn-ghost btn-sm" onClick={handleBack} style={{ marginBottom: 12 }}>
          ← {step === 0 ? 'Back' : 'Previous'}
        </button>
        <h1>{isEdit ? 'Edit Product' : 'New Product'}</h1>
      </div>

      {/* Pending review notice */}
      {product?.status === 'pending_review' && (
        <div className="pending-review-banner">
          ⏳ This product is pending superuser review before it appears in the catalog.
        </div>
      )}

      {/* Step indicator (create) or tab bar (edit) */}
      {isEdit ? (
        <TabBar steps={STEPS} current={step} onChange={goTo} />
      ) : (
        <StepBar steps={STEPS} current={step} onGoto={goTo} maxReached={maxReached} />
      )}

      {error && (
        <div style={{ marginTop: 12 }}>
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

      <form onSubmit={handleSave}>
        {step === 0 && (
          <StepBasics
            state={state}
            set={set}
            catalog={catalog}
            product={product}
            isEdit={isEdit}
          />
        )}
        {step === 1 && (
          <StepSpecs state={state} set={set} specSchemaProp={specSchemaProp} />
        )}
        {step === 2 && (
          <StepCapabilities state={state} set={set} />
        )}

        <div className="wizard-footer">
          {isEdit ? (
            <button
              type="submit"
              className="btn btn-primary btn-lg"
              style={{ minWidth: 160 }}
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          ) : isLastStep ? (
            <button
              type="submit"
              className="btn btn-primary btn-lg"
              style={{ minWidth: 160 }}
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Create Product'}
            </button>
          ) : (
            <button
              type="button"
              className="btn btn-primary btn-lg"
              style={{ minWidth: 160 }}
              onClick={handleNext}
            >
              Next: {STEPS[step + 1].label} →
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
