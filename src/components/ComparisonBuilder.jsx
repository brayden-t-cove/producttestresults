import { useState, useEffect, useCallback } from 'react';
import { createComparison, updateComparison, updateCatalogEntry } from '../lib/api.js';
import { SPEC_SCHEMA } from '../data/productSpecs.js';

// Subclass options — mirrors NewProduct.jsx; update both when adding categories
const SUBCLASS_OPTIONS = {
  camera: ['Indoor Stationary', 'Indoor P/T', 'Outdoor Stationary', 'Outdoor P/T', 'Doorbell', 'Lightbulb', 'Window', 'Pet'],
};

const CATEGORY_LABELS = {
  camera: 'Camera', hub: 'Hub', sensor: 'Sensor', touchpad: 'Touchpad', app: 'App',
};

const CATEGORY_ICONS = {
  camera: '📷', hub: '🏠', sensor: '📡', touchpad: '⌨️', app: '📱',
};

// Pre-loaded subjective rating questions per category
const RATING_QUESTIONS = {
  camera: [
    { id: 'motion-wakeup', label: 'Motion Wakeup Consistency' },
    { id: 'motion-accuracy', label: 'Motion Detection Accuracy' },
    { id: 'build-quality', label: 'Build Quality' },
    { id: 'video-quality', label: 'Video Quality' },
    { id: 'night-vision-quality', label: 'Night Vision Quality' },
    { id: 'color-accuracy', label: 'Color Accuracy' },
    { id: 'audio-quality', label: 'Audio Quality (Mic + Speaker)' },
    { id: 'battery-performance', label: 'Battery Performance' },
    { id: 'pan-tilt-smoothness', label: 'Pan / Tilt Smoothness' },
    { id: 'app-experience', label: 'App Experience' },
    { id: 'installation-experience', label: 'Installation Experience' },
    { id: 'notification-reliability', label: 'Notification Reliability' },
  ],
  hub: [
    { id: 'build-quality', label: 'Build Quality' },
    { id: 'app-experience', label: 'App Experience' },
    { id: 'notification-reliability', label: 'Notification Reliability' },
    { id: 'installation-experience', label: 'Installation Experience' },
    { id: 'sensor-response', label: 'Sensor Response Consistency' },
  ],
  sensor: [
    { id: 'build-quality', label: 'Build Quality' },
    { id: 'installation-experience', label: 'Installation Experience' },
    { id: 'response-consistency', label: 'Response Consistency' },
    { id: 'false-alarm-rate', label: 'False Alarm Rate (lower = better)' },
  ],
  universal: [
    { id: 'overall-value', label: 'Overall Value' },
    { id: 'vendor-support', label: 'Vendor Support Quality' },
  ],
};

function getQuestionsForCategory(category) {
  const cat = (category || '').toLowerCase();
  return [
    ...(RATING_QUESTIONS[cat] || []),
    ...(RATING_QUESTIONS.universal || []),
  ];
}

// Spec fields worth showing in a comparison (exclude identity/admin fields)
const SPEC_SKIP_GROUPS = ['Identity & Record'];

function getSpecRowsForCategory(category, specSchema) {
  const schema = specSchema?.[category] || SPEC_SCHEMA[category] || [];
  const rows = [];
  for (const group of schema) {
    if (SPEC_SKIP_GROUPS.includes(group.label)) continue;
    for (const field of group.fields || []) {
      rows.push({ group: group.label, id: field.id, label: field.label, type: field.type });
    }
  }
  return rows;
}

function StarRatingInput({ value, onChange }) {
  const [hover, setHover] = useState(null);
  const display = hover !== null ? hover : (value === 'na' || value == null ? 0 : value);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
      <div style={{ display: 'flex', gap: 2 }}>
        {[1, 2, 3, 4, 5].map(n => (
          <button
            key={n}
            type="button"
            onMouseEnter={() => setHover(n)}
            onMouseLeave={() => setHover(null)}
            onClick={() => onChange(n === value ? null : n)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, padding: '0 1px', lineHeight: 1, color: n <= display ? '#eab308' : 'var(--border)' }}
          >★</button>
        ))}
      </div>
      <button
        type="button"
        onClick={() => onChange(value === 'na' ? null : 'na')}
        style={{
          fontSize: 11, padding: '2px 7px', borderRadius: 4, border: '1px solid',
          cursor: 'pointer', fontWeight: 600,
          background: value === 'na' ? 'var(--primary-dim)' : 'transparent',
          borderColor: value === 'na' ? 'var(--primary)' : 'var(--border)',
          color: value === 'na' ? 'var(--primary)' : 'var(--text-muted)',
        }}
      >N/A</button>
    </div>
  );
}

function formatSpecValue(val, type) {
  if (val === null || val === undefined || val === '') return '—';
  if (type === 'boolean') {
    if (val === 'yes') return '✓ Yes';
    if (val === 'no') return '✗ No';
    if (val === 'na') return 'N/A';
    if (val === 'unknown') return 'Unknown';
    return '—';
  }
  return String(val);
}

export default function ComparisonBuilder({ catalog, specSchema, preselectedCatalogId, existingComparison, onSaved, onBack }) {
  const isEdit = !!existingComparison;

  // Step 1 state
  const [step, setStep] = useState(isEdit ? 2 : 1);
  const [mode, setMode] = useState(existingComparison?.mode || '1v1');
  const [slots, setSlots] = useState(() => {
    if (existingComparison) {
      return existingComparison.products.map(p => ({ catalogId: p.catalogId, firmware: p.firmware || '' }));
    }
    return [
      { catalogId: preselectedCatalogId || '', firmware: '' },
      { catalogId: '', firmware: '' },
    ];
  });

  // Step 2 state
  const [specValues, setSpecValues] = useState(() => existingComparison?.specValues || {});
  const [ratings, setRatings] = useState(() => existingComparison?.ratings || {});
  const [ratingNotes, setRatingNotes] = useState(() => existingComparison?.ratingNotes || {});
  const [customCriteria, setCustomCriteria] = useState(() => existingComparison?.customCriteria || []);
  const [comparisonNotes, setComparisonNotes] = useState(existingComparison?.comparisonNotes || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const selectedProducts = slots
    .filter(s => s.catalogId)
    .map(s => catalog.find(p => p.id === s.catalogId))
    .filter(Boolean);

  const sharedCategory = selectedProducts.length > 0 ? selectedProducts[0].category : null;
  const specRows = sharedCategory ? getSpecRowsForCategory(sharedCategory, specSchema) : [];
  const ratingQuestions = sharedCategory ? getQuestionsForCategory(sharedCategory) : [];

  // When entering step 2, pre-fill spec values from catalog
  useEffect(() => {
    if (step !== 2 || isEdit) return;
    const init = {};
    for (const slot of slots.filter(s => s.catalogId)) {
      const product = catalog.find(p => p.id === slot.catalogId);
      if (!product) continue;
      init[slot.catalogId] = {};
      for (const row of specRows) {
        const val = product.specs?.[row.id];
        init[slot.catalogId][row.id] = val !== undefined ? val : '';
      }
    }
    setSpecValues(prev => ({ ...init, ...prev }));
  }, [step]);

  function setSlotField(idx, field, value) {
    setSlots(prev => prev.map((s, i) => i === idx ? { ...s, [field]: value } : s));
  }

  function addSlot() {
    setSlots(prev => [...prev, { catalogId: '', firmware: '' }]);
  }

  function removeSlot(idx) {
    if (slots.length <= 2) return;
    setSlots(prev => prev.filter((_, i) => i !== idx));
  }

  function setSpecValue(catalogId, fieldId, value) {
    setSpecValues(prev => ({
      ...prev,
      [catalogId]: { ...(prev[catalogId] || {}), [fieldId]: value },
    }));
  }

  function setRating(catalogId, questionId, value) {
    setRatings(prev => ({
      ...prev,
      [catalogId]: { ...(prev[catalogId] || {}), [questionId]: value },
    }));
  }

  function setRatingNote(catalogId, questionId, value) {
    setRatingNotes(prev => ({
      ...prev,
      [catalogId]: { ...(prev[catalogId] || {}), [questionId]: value },
    }));
  }

  function addCustomCriterion() {
    setCustomCriteria(prev => [...prev, { id: crypto.randomUUID(), label: '', type: 'rating' }]);
  }

  function updateCustomCriterion(id, updates) {
    setCustomCriteria(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
  }

  function removeCustomCriterion(id) {
    setCustomCriteria(prev => prev.filter(c => c.id !== id));
  }

  function handleStepOneNext() {
    setError('');
    const filled = slots.filter(s => s.catalogId);
    if (filled.length < 2) { setError('Select at least 2 products.'); return; }
    const ids = filled.map(s => s.catalogId);
    if (new Set(ids).size !== ids.length) { setError('Each slot must be a different product.'); return; }
    const cats = [...new Set(filled.map(s => catalog.find(p => p.id === s.catalogId)?.category).filter(Boolean))];
    if (cats.length > 1) { setError('All products must be the same category.'); return; }
    setStep(2);
  }

  async function handleSave() {
    setSaving(true);
    setError('');
    try {
      // Write spec values back to catalog for any changed fields
      for (const slot of slots.filter(s => s.catalogId)) {
        const product = catalog.find(p => p.id === slot.catalogId);
        if (!product) continue;
        const vals = specValues[slot.catalogId] || {};
        const changed = {};
        for (const [k, v] of Object.entries(vals)) {
          if (v !== '' && v !== (product.specs?.[k] ?? '')) changed[k] = v;
        }
        if (Object.keys(changed).length > 0) {
          await updateCatalogEntry(slot.catalogId, { specs: { ...(product.specs || {}), ...changed } });
        }
      }

      const products = slots.filter(s => s.catalogId).map(s => {
        const p = catalog.find(pr => pr.id === s.catalogId);
        return { catalogId: s.catalogId, name: p?.name || s.catalogId, category: p?.category || '', subclass: p?.subclass || '', firmware: s.firmware };
      });

      const payload = {
        mode,
        products,
        specValues,
        ratings,
        ratingNotes,
        customCriteria,
        comparisonNotes,
        category: sharedCategory,
        status: 'completed',
        completedAt: new Date().toISOString(),
      };

      const result = isEdit
        ? await updateComparison(existingComparison.id, payload)
        : await createComparison(payload);

      onSaved(result);
    } catch (e) {
      setError(e.message || 'Failed to save comparison.');
    } finally {
      setSaving(false);
    }
  }

  const classCatalog = catalog.filter(p => !sharedCategory || p.category === sharedCategory);

  // ── Step 1: mode + product selection ──────────────────────────────────────
  if (step === 1) {
    return (
      <div className="session-start" style={{ maxWidth: 700 }}>
        <button className="btn btn-ghost btn-sm" onClick={onBack} style={{ marginBottom: 16 }}>← Back</button>
        <h2 style={{ margin: '0 0 4px' }}>New Comparison</h2>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 24 }}>Compare products side-by-side across specs and performance.</p>

        {error && <div className="error-msg">{error}</div>}

        <div className="form-group">
          <label>Comparison Mode</label>
          <div style={{ display: 'flex', gap: 10 }}>
            {[
              { id: '1v1', label: '1:1 Quick Compare', desc: 'Two products, head to head' },
              { id: 'ranking', label: 'Expanded Ranking', desc: 'Three or more products ranked' },
            ].map(m => (
              <div
                key={m.id}
                onClick={() => {
                  setMode(m.id);
                  if (m.id === '1v1' && slots.length > 2) setSlots(slots.slice(0, 2));
                }}
                style={{
                  flex: 1, padding: '14px 16px', borderRadius: 8, cursor: 'pointer',
                  border: `2px solid ${mode === m.id ? 'var(--primary)' : 'var(--border)'}`,
                  background: mode === m.id ? 'var(--primary-dim)' : 'var(--card)',
                }}
              >
                <div style={{ fontWeight: 600, fontSize: 14 }}>{m.label}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3 }}>{m.desc}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="form-group">
          <label>Products</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {slots.map((slot, idx) => {
              const prod = catalog.find(p => p.id === slot.catalogId);
              return (
                <div key={idx} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, padding: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                    <span style={{ fontWeight: 600, fontSize: 13 }}>
                      {idx === 0 ? 'Product A' : idx === 1 ? 'Product B' : `Product ${String.fromCharCode(65 + idx)}`}
                    </span>
                    {slots.length > 2 && (
                      <button className="btn btn-ghost btn-sm" onClick={() => removeSlot(idx)} style={{ color: 'var(--fail)' }}>Remove</button>
                    )}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 10, alignItems: 'end' }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label>Select Product</label>
                      <select value={slot.catalogId} onChange={e => setSlotField(idx, 'catalogId', e.target.value)}>
                        <option value="">— Choose from catalog —</option>
                        {catalog.map(p => {
                          const takenByOther = slots.some((s, i) => i !== idx && s.catalogId === p.id);
                          const wrongCat = sharedCategory && p.category !== sharedCategory && slot.catalogId !== p.id;
                          return (
                            <option key={p.id} value={p.id} disabled={takenByOther || wrongCat}>
                              {CATEGORY_ICONS[p.category] || '📦'} {p.name}{p.subclass ? ` (${p.subclass})` : ''}{takenByOther ? ' — already selected' : ''}
                            </option>
                          );
                        })}
                      </select>
                    </div>
                    <div className="form-group" style={{ marginBottom: 0, minWidth: 120 }}>
                      <label>Firmware</label>
                      <input type="text" placeholder="e.g. 1.4.2" value={slot.firmware} onChange={e => setSlotField(idx, 'firmware', e.target.value)} />
                    </div>
                  </div>
                  {prod && (
                    <div style={{ marginTop: 8, fontSize: 12, color: 'var(--text-muted)' }}>
                      {CATEGORY_LABELS[prod.category] || prod.category}{prod.subclass ? ` · ${prod.subclass}` : ''}{prod.manufacturer ? ` · ${prod.manufacturer}` : ''}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          {mode === 'ranking' && (
            <button className="btn btn-ghost btn-sm" style={{ marginTop: 10 }} onClick={addSlot}>+ Add Product</button>
          )}
        </div>

        <button className="btn btn-primary btn-lg" style={{ width: '100%' }} onClick={handleStepOneNext}>
          Continue to Comparison →
        </button>
      </div>
    );
  }

  // ── Step 2: side-by-side comparison form ──────────────────────────────────
  const filledSlots = slots.filter(s => s.catalogId);
  const colWidth = Math.max(180, Math.floor(560 / filledSlots.length));

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 16px 40px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 0', borderBottom: '1px solid var(--border)', marginBottom: 24, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {!isEdit && <button className="btn btn-ghost btn-sm" onClick={() => setStep(1)}>← Back</button>}
            {isEdit && <button className="btn btn-ghost btn-sm" onClick={onBack}>← Back</button>}
            <h2 style={{ margin: 0, fontSize: 17 }}>
              {mode === '1v1' ? '1:1 Quick Compare' : 'Expanded Ranking'}
              <span style={{ fontWeight: 400, color: 'var(--text-muted)', fontSize: 14, marginLeft: 10 }}>
                {filledSlots.map(s => catalog.find(p => p.id === s.catalogId)?.name || s.catalogId).join(' vs ')}
              </span>
            </h2>
          </div>
        </div>
        <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : '💾 Save Comparison'}
        </button>
      </div>

      {error && <div className="error-msg" style={{ marginBottom: 16 }}>{error}</div>}

      {/* Column headers */}
      <div style={{ display: 'flex', marginBottom: 8 }}>
        <div style={{ width: 220, flexShrink: 0 }} />
        {filledSlots.map(slot => {
          const prod = catalog.find(p => p.id === slot.catalogId);
          return (
            <div key={slot.catalogId} style={{ width: colWidth, flexShrink: 0, padding: '0 10px' }}>
              <div style={{ fontWeight: 700, fontSize: 14 }}>{prod?.name || slot.catalogId}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                {prod?.subclass || CATEGORY_LABELS[prod?.category] || ''}
                {slot.firmware ? ` · fw ${slot.firmware}` : ''}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Tech Specs ── */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 12 }}>Tech Specs</div>

        {(() => {
          // Group spec rows by group label
          const grouped = {};
          for (const row of specRows) {
            if (!grouped[row.group]) grouped[row.group] = [];
            grouped[row.group].push(row);
          }
          return Object.entries(grouped).map(([groupLabel, rows]) => (
            <div key={groupLabel} style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6, paddingBottom: 4, borderBottom: '1px solid var(--border)' }}>
                {groupLabel}
              </div>
              {rows.map(row => (
                <div key={row.id} style={{ display: 'flex', alignItems: 'flex-start', borderBottom: '1px solid var(--border)', padding: '7px 0', minHeight: 36 }}>
                  <div style={{ width: 220, flexShrink: 0, fontSize: 13, color: 'var(--text-muted)', paddingRight: 12, paddingTop: 2 }}>
                    {row.label}
                  </div>
                  {filledSlots.map(slot => {
                    const val = specValues[slot.catalogId]?.[row.id] ?? '';
                    const isEmpty = val === '' || val === null || val === undefined;
                    return (
                      <div key={slot.catalogId} style={{ width: colWidth, flexShrink: 0, padding: '0 10px' }}>
                        {isEmpty ? (
                          <input
                            type="text"
                            placeholder="Add value..."
                            value={val}
                            onChange={e => setSpecValue(slot.catalogId, row.id, e.target.value)}
                            style={{ width: '100%', fontSize: 13, padding: '3px 6px', borderRadius: 4, border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--text)' }}
                          />
                        ) : (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ fontSize: 13 }}>{formatSpecValue(val, row.type)}</span>
                            <button
                              type="button"
                              onClick={() => setSpecValue(slot.catalogId, row.id, '')}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, color: 'var(--text-muted)', padding: 0, lineHeight: 1 }}
                              title="Edit"
                            >✎</button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          ));
        })()}
      </div>

      {/* ── Performance Ratings ── */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 12 }}>Performance Ratings</div>

        {[...ratingQuestions, ...customCriteria.filter(c => c.label)].map((q, qi) => {
          const isCustom = !!q.id && customCriteria.some(c => c.id === q.id);
          return (
            <div key={q.id || qi} style={{ borderBottom: '1px solid var(--border)', padding: '10px 0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <div style={{ width: 220, flexShrink: 0, fontSize: 13, fontWeight: 500 }}>
                  {isCustom ? (
                    <input
                      type="text"
                      value={q.label}
                      onChange={e => updateCustomCriterion(q.id, { label: e.target.value })}
                      placeholder="Criterion name..."
                      style={{ fontSize: 13, fontWeight: 500, border: 'none', borderBottom: '1px dashed var(--border)', background: 'transparent', color: 'var(--text)', padding: '0 0 2px', width: '100%' }}
                    />
                  ) : q.label}
                </div>
                {isCustom && (
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      style={{ fontSize: 11, padding: '2px 8px' }}
                      onClick={() => updateCustomCriterion(q.id, { type: q.type === 'rating' ? 'observation' : 'rating' })}
                    >
                      {q.type === 'rating' ? '⭐ Stars' : '📝 Text'}
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      style={{ color: 'var(--fail)', fontSize: 11, padding: '2px 6px' }}
                      onClick={() => removeCustomCriterion(q.id)}
                    >✕</button>
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start' }}>
                <div style={{ width: 220, flexShrink: 0 }} />
                {filledSlots.map(slot => (
                  <div key={slot.catalogId} style={{ width: colWidth, flexShrink: 0, padding: '0 10px' }}>
                    {(isCustom ? q.type : 'rating') === 'rating' ? (
                      <>
                        <StarRatingInput
                          value={ratings[slot.catalogId]?.[q.id]}
                          onChange={v => setRating(slot.catalogId, q.id, v)}
                        />
                        <textarea
                          rows={2}
                          placeholder="Notes..."
                          value={ratingNotes[slot.catalogId]?.[q.id] || ''}
                          onChange={e => setRatingNote(slot.catalogId, q.id, e.target.value)}
                          style={{ marginTop: 6, width: '100%', fontSize: 12, resize: 'vertical' }}
                        />
                      </>
                    ) : (
                      <textarea
                        rows={3}
                        placeholder="Observation..."
                        value={ratingNotes[slot.catalogId]?.[q.id] || ''}
                        onChange={e => setRatingNote(slot.catalogId, q.id, e.target.value)}
                        style={{ width: '100%', fontSize: 12, resize: 'vertical' }}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}

        <button className="btn btn-ghost btn-sm" style={{ marginTop: 12 }} onClick={addCustomCriterion}>
          + Add Custom Criterion
        </button>
      </div>

      {/* ── Overall Notes ── */}
      <div className="form-group">
        <label>Overall Comparison Notes</label>
        <textarea
          rows={4}
          placeholder="Summary notes, conclusions, recommendation..."
          value={comparisonNotes}
          onChange={e => setComparisonNotes(e.target.value)}
        />
      </div>

      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
        <button className="btn btn-ghost" onClick={isEdit ? onBack : () => setStep(1)}>← Back</button>
        <button className="btn btn-primary btn-lg" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : '💾 Save Comparison'}
        </button>
      </div>
    </div>
  );
}
