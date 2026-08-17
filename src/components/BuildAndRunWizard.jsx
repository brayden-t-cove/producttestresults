import { useState, useEffect, useRef } from 'react';
import {
  listTestItems, getTestItemCategories, listTestPlanPresets,
  createSession, updateSession, getFirmwares,
} from '../lib/api.js';
import { CATEGORY_LABELS } from '../data/capabilities.js';

// ── Constants ──────────────────────────────────────────────────────────────────

const INTENTS = [
  { id: 'smoke',      label: 'Smoke Test',          icon: '💨', description: 'Quick confidence check — core functionality only' },
  { id: 'intake',     label: 'New Product Intake',   icon: '📦', description: 'First look at a new device — broad initial coverage' },
  { id: 'regression', label: 'Full Regression',      icon: '🔁', description: 'Comprehensive coverage after a firmware or build change' },
  { id: 'feature',    label: 'Feature Validation',   icon: '🎯', description: 'Focused testing of a specific feature or requirement' },
];

const PRODUCT_TYPE_LABELS = {
  camera: 'Camera', hub: 'Hub', sensor: 'Sensor', touchpad: 'Touchpad', app: 'App',
};

const CATEGORY_ICONS = {
  hub: '🏠', touchpad: '⌨️', camera: '📷', sensor: '📡', app: '📱',
};

const STEPS = ['Intent', 'Product', 'Template', 'Build Plan', 'Environment'];

// ── Step progress bar ─────────────────────────────────────────────────────────

function StepBar({ current }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 32 }}>
      {STEPS.map((label, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <div key={label} style={{ display: 'flex', alignItems: 'center', flex: i < STEPS.length - 1 ? 1 : 'none' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <div style={{
                width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12, fontWeight: 700,
                background: done ? 'var(--accent, #1A5CF6)' : active ? 'var(--accent, #1A5CF6)' : 'var(--border)',
                color: done || active ? '#fff' : 'var(--text-muted)',
              }}>
                {done ? '✓' : i + 1}
              </div>
              <span style={{ fontSize: 10, fontWeight: active ? 700 : 400, color: active ? 'var(--text)' : 'var(--text-muted)', whiteSpace: 'nowrap' }}>{label}</span>
            </div>
            {i < STEPS.length - 1 && (
              <div style={{ flex: 1, height: 2, background: done ? 'var(--accent, #1A5CF6)' : 'var(--border)', margin: '0 6px', marginBottom: 18 }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Step 1: Intent ────────────────────────────────────────────────────────────

function StepIntent({ value, onChange }) {
  return (
    <div>
      <h3 style={{ margin: '0 0 6px', fontSize: 17, fontWeight: 700 }}>What kind of testing are you doing?</h3>
      <p style={{ margin: '0 0 20px', fontSize: 13, color: 'var(--text-muted)' }}>This shapes the session record and filters available templates.</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
        {INTENTS.map(intent => (
          <button
            key={intent.id}
            type="button"
            onClick={() => onChange(intent.id)}
            style={{
              border: `2px solid ${value === intent.id ? 'var(--accent, #1A5CF6)' : 'var(--border)'}`,
              borderRadius: 10, padding: '16px 18px', background: value === intent.id ? 'var(--accent-subtle, #e8f0fe)' : 'var(--surface)',
              textAlign: 'left', cursor: 'pointer', transition: 'border-color .15s',
            }}
          >
            <div style={{ fontSize: 24, marginBottom: 6 }}>{intent.icon}</div>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>{intent.label}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.4 }}>{intent.description}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Step 2: Product ───────────────────────────────────────────────────────────

function StepProduct({ catalog, value, onChange }) {
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const inputRef = useRef(null);
  const dropRef = useRef(null);

  useEffect(() => {
    function handler(e) {
      if (inputRef.current && !inputRef.current.contains(e.target) && dropRef.current && !dropRef.current.contains(e.target))
        setOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const eligible = catalog.filter(p => p.type !== 'competitor');
  const results = search.trim()
    ? eligible.filter(p => {
        const q = search.toLowerCase();
        return (p.name || '').toLowerCase().includes(q) || (p.modelNumber || '').toLowerCase().includes(q) || (p.manufacturer || '').toLowerCase().includes(q);
      })
    : eligible;

  return (
    <div>
      <h3 style={{ margin: '0 0 6px', fontSize: 17, fontWeight: 700 }}>Which product are you testing?</h3>
      <p style={{ margin: '0 0 20px', fontSize: 13, color: 'var(--text-muted)' }}>Select a product from your catalog.</p>

      {value ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, border: '2px solid var(--accent, #1A5CF6)', borderRadius: 10, padding: '12px 16px', background: 'var(--accent-subtle, #e8f0fe)' }}>
          <span style={{ fontSize: 28 }}>{CATEGORY_ICONS[value.category] || '📦'}</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 15 }}>{value.name}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{value.modelNumber} · {CATEGORY_LABELS[value.category] || value.category}</div>
          </div>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => { onChange(null); setSearch(''); }}>Change</button>
        </div>
      ) : (
        <div style={{ position: 'relative' }}>
          <input
            ref={inputRef}
            type="text"
            placeholder="Search by name, model, or manufacturer…"
            value={search}
            onChange={e => { setSearch(e.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)}
            style={{ width: '100%' }}
          />
          {open && results.length > 0 && (
            <div ref={dropRef} style={{ position: 'absolute', zIndex: 200, left: 0, right: 0, top: '100%', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, boxShadow: '0 4px 16px rgba(0,0,0,.12)', maxHeight: 320, overflowY: 'auto' }}>
              {results.slice(0, 40).map(p => (
                <button
                  key={p.id}
                  type="button"
                  style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '10px 14px', border: 'none', background: 'none', cursor: 'pointer', textAlign: 'left' }}
                  onMouseDown={() => { onChange(p); setSearch(''); setOpen(false); }}
                >
                  <span style={{ fontSize: 20 }}>{CATEGORY_ICONS[p.category] || '📦'}</span>
                  <div>
                    <div style={{ fontWeight: 500, fontSize: 13 }}>{p.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{p.modelNumber} · {CATEGORY_LABELS[p.category]}</div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Step 3: Template ──────────────────────────────────────────────────────────

function StepTemplate({ productType, intentId, libraryItems, onSelectPreset, onBlank }) {
  const [presets, setPresets] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listTestPlanPresets(productType)
      .then(setPresets)
      .catch(() => setPresets([]))
      .finally(() => setLoading(false));
  }, [productType]);

  const filtered = intentId ? presets.filter(p => !p.intentType || p.intentType === intentId) : presets;

  return (
    <div>
      <h3 style={{ margin: '0 0 6px', fontSize: 17, fontWeight: 700 }}>Start from a template or build from scratch?</h3>
      <p style={{ margin: '0 0 20px', fontSize: 13, color: 'var(--text-muted)' }}>
        Templates pre-fill your plan — you can add or remove items on the next step.
      </p>

      {loading ? (
        <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>Loading templates…</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.map(preset => {
            const itemCount = preset.itemIds?.length || 0;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => onSelectPreset(preset)}
                style={{ display: 'flex', alignItems: 'center', gap: 14, border: '1px solid var(--border)', borderRadius: 10, padding: '14px 18px', background: 'var(--surface)', textAlign: 'left', cursor: 'pointer' }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{preset.name}</div>
                  {preset.description && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{preset.description}</div>}
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent, #1A5CF6)' }}>{itemCount} test{itemCount !== 1 ? 's' : ''}</div>
                  {preset.intentType && (
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>{INTENTS.find(i => i.id === preset.intentType)?.label || preset.intentType}</div>
                  )}
                </div>
                <span style={{ fontSize: 18, color: 'var(--text-muted)' }}>→</span>
              </button>
            );
          })}

          {filtered.length === 0 && (
            <div style={{ fontSize: 13, color: 'var(--text-muted)', padding: '12px 0' }}>
              No templates available for this product type yet. Start blank and save it as a template later.
            </div>
          )}

          <button
            type="button"
            onClick={onBlank}
            style={{ display: 'flex', alignItems: 'center', gap: 14, border: '2px dashed var(--border)', borderRadius: 10, padding: '14px 18px', background: 'transparent', textAlign: 'left', cursor: 'pointer' }}
          >
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 14 }}>Start Blank</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Build your plan from scratch by picking items from the library</div>
            </div>
            <span style={{ fontSize: 18, color: 'var(--text-muted)' }}>→</span>
          </button>
        </div>
      )}
    </div>
  );
}

// ── Step 4: Build Plan ────────────────────────────────────────────────────────

function StepBuild({ libraryItems, categories, plan, onPlanChange }) {
  const [expandedCats, setExpandedCats] = useState({});
  const [search, setSearch] = useState('');

  const planIds = new Set(plan.map(i => i.id));

  function toggleCat(cat) {
    setExpandedCats(e => ({ ...e, [cat]: !e[cat] }));
  }

  function addItem(item) {
    if (!planIds.has(item.id)) onPlanChange([...plan, item]);
  }

  function removeItem(itemId) {
    onPlanChange(plan.filter(i => i.id !== itemId));
  }

  function addCategory(cat, catItems) {
    const toAdd = catItems.filter(i => !planIds.has(i.id));
    onPlanChange([...plan, ...toAdd]);
  }

  function removeCategory(cat) {
    onPlanChange(plan.filter(i => i.category !== cat));
  }

  const filteredLib = search.trim()
    ? libraryItems.filter(i => i.name.toLowerCase().includes(search.toLowerCase()) || i.category.toLowerCase().includes(search.toLowerCase()) || (i.tags || []).some(t => t.toLowerCase().includes(search.toLowerCase())))
    : libraryItems;

  const byCategory = filteredLib.reduce((acc, item) => {
    (acc[item.category] = acc[item.category] || []).push(item);
    return acc;
  }, {});

  const planByCategory = plan.reduce((acc, item) => {
    (acc[item.category] = acc[item.category] || []).push(item);
    return acc;
  }, {});

  return (
    <div>
      <h3 style={{ margin: '0 0 6px', fontSize: 17, fontWeight: 700 }}>Build your test plan</h3>
      <p style={{ margin: '0 0 16px', fontSize: 13, color: 'var(--text-muted)' }}>
        Add by category or individual item. Only add what's relevant to this run.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, minHeight: 500 }}>

        {/* Library */}
        <div style={{ border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-muted)', marginBottom: 8 }}>
              Test Library
            </div>
            <input
              type="text"
              placeholder="Search library…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ width: '100%', fontSize: 12 }}
            />
          </div>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {Object.entries(byCategory).sort(([a], [b]) => a.localeCompare(b)).map(([cat, catItems]) => {
              const isOpen = expandedCats[cat] !== false; // default open
              const allAdded = catItems.every(i => planIds.has(i.id));
              const someAdded = catItems.some(i => planIds.has(i.id));
              return (
                <div key={cat}>
                  <div
                    style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', borderBottom: '1px solid var(--border)', background: 'var(--bg)', cursor: 'pointer' }}
                  >
                    <button
                      type="button"
                      style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', padding: 0 }}
                      onClick={() => toggleCat(cat)}
                    >
                      <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{isOpen ? '▾' : '▸'}</span>
                      <span style={{ fontSize: 12, fontWeight: 700 }}>{cat}</span>
                      <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>({catItems.length})</span>
                      {someAdded && !allAdded && <span style={{ fontSize: 10, color: 'var(--accent, #1A5CF6)' }}>partial</span>}
                      {allAdded && <span style={{ fontSize: 10, color: 'var(--pass, #16a34a)' }}>✓ all</span>}
                    </button>
                    {!allAdded && (
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        style={{ fontSize: 10, padding: '2px 7px', flexShrink: 0 }}
                        onClick={() => addCategory(cat, catItems)}
                      >+ Add all</button>
                    )}
                  </div>
                  {isOpen && catItems.map(item => {
                    const added = planIds.has(item.id);
                    return (
                      <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 14px 7px 26px', borderBottom: '1px solid var(--border)', opacity: added ? 0.4 : 1 }}>
                        <span style={{ flex: 1, fontSize: 12 }}>{item.name}</span>
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          style={{ fontSize: 10, padding: '2px 7px', flexShrink: 0 }}
                          disabled={added}
                          onClick={() => addItem(item)}
                        >{added ? '✓' : '+ Add'}</button>
                      </div>
                    );
                  })}
                </div>
              );
            })}
            {filteredLib.length === 0 && (
              <div style={{ padding: 20, fontSize: 12, color: 'var(--text-muted)', textAlign: 'center' }}>No items match</div>
            )}
          </div>
        </div>

        {/* Plan */}
        <div style={{ border: '2px dashed var(--border)', borderRadius: 10, display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-muted)' }}>Your Plan</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent, #1A5CF6)', background: 'var(--accent-subtle, #e8f0fe)', borderRadius: 10, padding: '1px 8px' }}>
                {plan.length} test{plan.length !== 1 ? 's' : ''}
              </span>
              {plan.length > 0 && (
                <button type="button" className="btn btn-ghost btn-sm" style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--text-muted)' }} onClick={() => onPlanChange([])}>Clear all</button>
              )}
            </div>
          </div>

          <div style={{ flex: 1, overflowY: 'auto' }}>
            {plan.length === 0 ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', padding: 24, color: 'var(--text-muted)', fontSize: 13, textAlign: 'center' }}>
                Add items from the library →
              </div>
            ) : (
              Object.entries(planByCategory).sort(([a], [b]) => a.localeCompare(b)).map(([cat, catItems]) => (
                <div key={cat}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 14px', background: 'var(--bg)', borderBottom: '1px solid var(--border)' }}>
                    <span style={{ flex: 1, fontSize: 11, fontWeight: 700 }}>{cat} <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>({catItems.length})</span></span>
                    <button type="button" className="btn btn-ghost btn-sm" style={{ fontSize: 10, padding: '2px 7px', color: 'var(--text-muted)' }} onClick={() => removeCategory(cat)}>Remove all</button>
                  </div>
                  {catItems.map(item => (
                    <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 14px', borderBottom: '1px solid var(--border)' }}>
                      <span style={{ flex: 1, fontSize: 12 }}>{item.name}</span>
                      <button type="button" style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 16, lineHeight: 1 }} onClick={() => removeItem(item.id)}>×</button>
                    </div>
                  ))}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Step 5: Environment ───────────────────────────────────────────────────────

function StepEnvironment({ product, env, onChange }) {
  const [savedFirmwares, setSavedFirmwares] = useState([]);
  const [manualFw, setManualFw] = useState(false);
  const set = (k, v) => onChange({ ...env, [k]: v });

  useEffect(() => {
    if (product) getFirmwares(null, product.id).then(setSavedFirmwares).catch(() => {});
  }, [product?.id]);

  return (
    <div>
      <h3 style={{ margin: '0 0 6px', fontSize: 17, fontWeight: 700 }}>Testing environment</h3>
      <p style={{ margin: '0 0 20px', fontSize: 13, color: 'var(--text-muted)' }}>
        Record who's testing and what environment this session is running in.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <div className="form-group" style={{ margin: 0, gridColumn: '1 / -1' }}>
          <label>Plan Name <span className="req">*</span></label>
          <input type="text" value={env.name || ''} onChange={e => set('name', e.target.value)} placeholder="e.g. OmniCam 4K — Regression — Aug 2025" />
        </div>
        <div className="form-group" style={{ margin: 0 }}>
          <label>Tester Name</label>
          <input type="text" value={env.testerName || ''} onChange={e => set('testerName', e.target.value)} placeholder="Your name" />
        </div>
        <div className="form-group" style={{ margin: 0 }}>
          <label>Firmware Version</label>
          {!manualFw ? (
            <select value={env.firmware || ''} onChange={e => { if (e.target.value === '__manual__') { setManualFw(true); set('firmware', ''); } else set('firmware', e.target.value); }}>
              <option value="">— Select —</option>
              {savedFirmwares.map(f => <option key={f.id} value={f.version}>{f.version}{f.releasedAt ? ` (${f.releasedAt})` : ''}</option>)}
              <option value="__manual__">Enter manually…</option>
            </select>
          ) : (
            <div style={{ display: 'flex', gap: 6 }}>
              <input type="text" value={env.firmware || ''} onChange={e => set('firmware', e.target.value)} placeholder="e.g. 2.4.1" style={{ flex: 1 }} />
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setManualFw(false); set('firmware', ''); }}>↩</button>
            </div>
          )}
        </div>
        <div className="form-group" style={{ margin: 0 }}>
          <label>App Name</label>
          <input type="text" value={env.appName || ''} onChange={e => set('appName', e.target.value)} placeholder="e.g. Cove App" />
        </div>
        <div className="form-group" style={{ margin: 0 }}>
          <label>App Version</label>
          <input type="text" value={env.appVersion || ''} onChange={e => set('appVersion', e.target.value)} placeholder="e.g. 3.2.1" />
        </div>
        <div className="form-group" style={{ margin: 0 }}>
          <label>Phone OS</label>
          <select value={env.phoneOS || ''} onChange={e => set('phoneOS', e.target.value)}>
            <option value="">— Select —</option>
            <option value="ios">iOS</option>
            <option value="android">Android</option>
            <option value="both">Both</option>
          </select>
        </div>
        <div className="form-group" style={{ margin: 0 }}>
          <label>OS Version</label>
          <input type="text" value={env.osVersion || ''} onChange={e => set('osVersion', e.target.value)} placeholder="e.g. iOS 18.1" />
        </div>
        <div className="form-group" style={{ margin: 0, gridColumn: '1 / -1' }}>
          <label>Test Account</label>
          <input type="text" value={env.accountUsername || ''} onChange={e => set('accountUsername', e.target.value)} placeholder="e.g. test@example.com" autoComplete="off" />
        </div>
        <div className="form-group" style={{ margin: 0, gridColumn: '1 / -1' }}>
          <label>Session Notes</label>
          <textarea rows={3} value={env.notes || ''} onChange={e => set('notes', e.target.value)} placeholder="Context, goals, known quirks for this run…" style={{ resize: 'vertical' }} />
        </div>
      </div>
    </div>
  );
}

// ── Main wizard ───────────────────────────────────────────────────────────────

export default function BuildAndRunWizard({ catalog, onBack, onCreated, currentUser }) {
  const [step, setStep] = useState(0);
  const [intent, setIntent] = useState(null);
  const [product, setProduct] = useState(null);
  const [plan, setPlan] = useState([]);
  const [env, setEnv] = useState({ testerName: currentUser?.name || '' });
  const [libraryItems, setLibraryItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [libraryLoading, setLibraryLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([listTestItems({ status: 'active' }), getTestItemCategories()])
      .then(([items, cats]) => { setLibraryItems(items); setCategories(cats); })
      .catch(() => {})
      .finally(() => setLibraryLoading(false));
  }, []);

  // Auto-suggest plan name when product + intent are set
  useEffect(() => {
    if (product && intent && !env.name) {
      const intentLabel = INTENTS.find(i => i.id === intent)?.label || '';
      const date = new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      setEnv(e => ({ ...e, name: `${product.name} — ${intentLabel} — ${date}` }));
    }
  }, [product?.id, intent]);

  function canAdvance() {
    if (step === 0) return !!intent;
    if (step === 1) return !!product;
    if (step === 2) return true; // template step always advanceable (blank)
    if (step === 3) return plan.length > 0;
    if (step === 4) return !!(env.name?.trim());
    return false;
  }

  function handleSelectPreset(preset) {
    const presetItems = libraryItems.filter(i => (preset.itemIds || []).includes(i.id));
    setPlan(presetItems);
    setStep(3);
  }

  function handleBlank() {
    setPlan([]);
    setStep(3);
  }

  async function handleSubmit() {
    setError('');
    if (!env.name?.trim()) { setError('Plan name is required.'); return; }
    setSubmitting(true);
    try {
      const testCases = plan.map((item, idx) => ({
        id: crypto.randomUUID(),
        templateId: item.id,
        title: item.name,
        description: item.description || '',
        expected: item.expectedResult || '',
        steps: item.steps || '',
        category: item.category,
        tags: item.tags || [],
        status: 'pending',
        notes: '',
        testNumber: String(idx + 1),
        evidenceUrl: '',
      }));

      const sessionData = {
        productId: product.id,
        productName: product.name,
        category: product.category,
        firmware: env.firmware || '',
        sessionNotes: env.notes || '',
        testerName: env.testerName || '',
        type: 'build-and-run',
        testPlan: 'build-and-run',
        intentType: intent,
        catalogId: product.id,
        entity: currentUser?.entity || null,
        createdBy: currentUser?.email || null,
        testEnvironment: {
          appName: env.appName || '',
          appVersion: env.appVersion || '',
          phoneOS: env.phoneOS || '',
          osVersion: env.osVersion || '',
          username: env.accountUsername || '',
        },
      };

      const created = await createSession(sessionData);
      const withTests = await updateSession(created.id, {
        testCases,
        sessionName: env.name.trim(),
      });
      onCreated(withTests);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  const intentLabel = INTENTS.find(i => i.id === intent)?.label;

  return (
    <div style={{ maxWidth: 860, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
        <button className="btn btn-ghost btn-sm" onClick={step === 0 ? onBack : () => setStep(s => s - 1)}>← {step === 0 ? 'Back' : 'Previous'}</button>
        <div>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>Build & Run</h2>
          {intent && product && (
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
              {intentLabel} · {product.name}
            </div>
          )}
        </div>
      </div>

      <StepBar current={step} />

      {error && <div className="error-msg" style={{ marginBottom: 16 }}>{error}</div>}

      <div style={{ minHeight: 420 }}>
        {step === 0 && <StepIntent value={intent} onChange={v => { setIntent(v); }} />}
        {step === 1 && <StepProduct catalog={catalog} value={product} onChange={setProduct} />}
        {step === 2 && (
          libraryLoading
            ? <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>Loading…</div>
            : <StepTemplate
                productType={product?.category}
                intentId={intent}
                libraryItems={libraryItems}
                onSelectPreset={handleSelectPreset}
                onBlank={handleBlank}
              />
        )}
        {step === 3 && (
          libraryLoading
            ? <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>Loading library…</div>
            : <StepBuild libraryItems={libraryItems} categories={categories} plan={plan} onPlanChange={setPlan} />
        )}
        {step === 4 && <StepEnvironment product={product} env={env} onChange={setEnv} />}
      </div>

      {/* Footer nav */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 28, paddingTop: 20, borderTop: '1px solid var(--border)' }}>
        {step < 4 && step !== 2 && (
          <button
            type="button"
            className="btn btn-primary"
            disabled={!canAdvance()}
            onClick={() => setStep(s => s + 1)}
          >
            {step === 3 ? `Continue with ${plan.length} test${plan.length !== 1 ? 's' : ''} →` : 'Next →'}
          </button>
        )}
        {step === 4 && (
          <button
            type="button"
            className="btn btn-primary"
            disabled={!canAdvance() || submitting}
            onClick={handleSubmit}
          >
            {submitting ? 'Starting…' : 'Start Test Plan →'}
          </button>
        )}
      </div>
    </div>
  );
}
