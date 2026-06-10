import { useState } from 'react';
import { createSession } from '../lib/api.js';
import { getMetricsForCategories, COMPARATIVE_METRICS } from '../data/comparativeMetrics.js';

const CATEGORY_LABELS = {
  camera: 'Camera',
  hub: 'Hub',
  sensor: 'Sensor',
  touchpad: 'Touchpad',
  app: 'App',
  universal: 'Universal',
};

const PRODUCT_CLASSES = [
  {
    id: 'home-security',
    label: 'Home Security Hardware',
    icon: '🏠',
    description: 'Hubs, touchpads, and sensors',
    categories: ['hub', 'touchpad', 'sensor'],
  },
  {
    id: 'camera',
    label: 'Cameras & Camera Systems',
    icon: '📷',
    description: 'Indoor, outdoor, doorbell, and NVR/DVR systems',
    categories: ['camera'],
  },
  {
    id: 'app',
    label: 'Apps',
    icon: '📱',
    description: 'Mobile and web applications',
    categories: ['app'],
  },
];

// Default metric IDs to pre-select per category
const DEFAULT_METRIC_IDS = {
  camera: new Set([
    'cam-frame-rate', 'cam-video-resolution', 'cam-night-vision-range',
    'cam-field-of-view', 'cam-motion-detection-accuracy', 'cam-app-response-time',
    'cam-build-quality',
  ]),
  hub: new Set([
    'hub-response-time', 'hub-battery-backup-duration', 'hub-false-alarm-rate',
    'hub-build-quality',
  ]),
  sensor: new Set([
    'sensor-response-time', 'sensor-battery-life', 'sensor-false-alarm-rate',
    'sensor-build-quality',
  ]),
  touchpad: new Set([
    'touchpad-response-time', 'touchpad-display-clarity', 'touchpad-build-quality',
  ]),
  app: new Set([
    'app-load-time', 'app-ui-responsiveness', 'app-feature-completeness', 'app-crash-rate',
  ]),
  universal: new Set([
    'universal-price', 'universal-overall-rating', 'universal-vendor-support-quality',
  ]),
};

function computeAutoPull(sessions, catalogId) {
  const completed = sessions
    .filter(s => s.catalogId === catalogId && s.status === 'completed' && s.testCases && s.testCases.length > 0)
    .sort((a, b) => new Date(b.completedAt || b.createdAt) - new Date(a.completedAt || a.createdAt));

  if (completed.length === 0) return null;

  const session = completed[0];
  const testCases = session.testCases || [];

  const counted = testCases.filter(t => t.status === 'pass' || t.status === 'fail');
  const passing = counted.filter(t => t.status === 'pass').length;
  const overallPassRate = counted.length > 0 ? passing / counted.length : 0;

  // Group by section prefix
  const sectionMap = {};
  for (const tc of testCases) {
    const num = tc.testNumber || '';
    let key, label;
    if (num.toUpperCase().startsWith('VE.')) {
      // VE.X.Y -> group by VE.X
      const parts = num.split('.');
      const groupNum = parts[1] || '1';
      key = `VE.${groupNum}`;
      label = `VE Group ${groupNum}`;
    } else {
      const parts = num.split('.');
      const prefix = parts[0];
      const n = parseInt(prefix, 10);
      if (!isNaN(n) && n > 0) {
        key = String(n);
        label = `Section ${n}`;
      } else {
        key = 'general';
        label = 'General';
      }
    }
    if (!sectionMap[key]) sectionMap[key] = { label, pass: 0, fail: 0 };
    if (tc.status === 'pass') sectionMap[key].pass++;
    if (tc.status === 'fail') sectionMap[key].fail++;
  }

  const sectionRates = Object.values(sectionMap).map(sec => {
    const total = sec.pass + sec.fail;
    return { label: sec.label, pass: sec.pass, total, rate: total > 0 ? sec.pass / total : 0 };
  });

  return {
    sessionId: session.id,
    sessionDate: session.completedAt || session.createdAt,
    overallPassRate,
    sectionRates,
  };
}

export default function ComparativeStart({ catalog, sessions, onBack, onCreated }) {
  const [step, setStep] = useState(1);
  const [selectedClass, setSelectedClass] = useState(null);
  const [productSlots, setProductSlots] = useState([
    { catalogId: '', firmware: '' },
    { catalogId: '', firmware: '' },
  ]);
  const [selectedMetricIds, setSelectedMetricIds] = useState(new Set());
  const [thresholds, setThresholds] = useState({}); // metricId -> { value, type }
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  // Step 1 helpers
  function setSlotField(idx, field, value) {
    setProductSlots(prev => prev.map((s, i) => i === idx ? { ...s, [field]: value } : s));
  }

  function addSlot() {
    setProductSlots(prev => [...prev, { catalogId: '', firmware: '' }]);
  }

  function removeSlot(idx) {
    if (productSlots.length <= 2) return;
    setProductSlots(prev => prev.filter((_, i) => i !== idx));
  }

  const classCategories = selectedClass
    ? (PRODUCT_CLASSES.find(c => c.id === selectedClass)?.categories || [])
    : [];
  const classCatalog = selectedClass
    ? catalog.filter(p => classCategories.includes(p.category))
    : catalog;

  const selectedProducts = productSlots
    .filter(s => s.catalogId)
    .map(s => {
      const entry = catalog.find(p => p.id === s.catalogId);
      return entry ? { ...entry, firmware: s.firmware } : null;
    })
    .filter(Boolean);

  // Step 2 helpers
  const categorySet = new Set(selectedProducts.map(p => (p.category || '').toLowerCase()).filter(Boolean));
  const availableMetrics = getMetricsForCategories(categorySet);

  const metricsByCategory = {};
  for (const m of availableMetrics) {
    const cat = m.category;
    if (!metricsByCategory[cat]) metricsByCategory[cat] = [];
    metricsByCategory[cat].push(m);
  }

  function toggleMetric(id) {
    setSelectedMetricIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleStepOneNext() {
    setError('');
    const filled = productSlots.filter(s => s.catalogId);
    if (filled.length < 2) {
      setError('Please select at least 2 products.');
      return;
    }
    // Pre-select defaults based on selected categories
    const defaults = new Set();
    for (const cat of categorySet) {
      const defSet = DEFAULT_METRIC_IDS[cat] || new Set();
      for (const id of defSet) defaults.add(id);
    }
    for (const id of DEFAULT_METRIC_IDS.universal) defaults.add(id);
    // Only include defaults that are in available metrics
    const availableIds = new Set(availableMetrics.map(m => m.id));
    const filtered = new Set([...defaults].filter(id => availableIds.has(id)));
    setSelectedMetricIds(filtered);
    setStep(2);
  }

  function handleStepTwoNext() {
    setError('');
    if (selectedMetricIds.size === 0) {
      setError('Please select at least 1 metric.');
      return;
    }
    // Initialize thresholds from defaults
    const numericSelected = availableMetrics.filter(
      m => m.type === 'numeric' && selectedMetricIds.has(m.id)
    );
    if (numericSelected.length === 0) {
      handleCreate();
      return;
    }
    const init = {};
    for (const m of numericSelected) {
      init[m.id] = {
        value: m.defaultThreshold !== null ? String(m.defaultThreshold) : '',
        type: m.defaultThresholdType || 'min',
      };
    }
    setThresholds(init);
    setStep(3);
  }

  function setThresholdField(metricId, field, value) {
    setThresholds(prev => ({ ...prev, [metricId]: { ...prev[metricId], [field]: value } }));
  }

  async function handleCreate() {
    setError('');
    setCreating(true);
    try {
      const filledSlots = productSlots.filter(s => s.catalogId);
      const products = filledSlots.map(slot => {
        const entry = catalog.find(p => p.id === slot.catalogId);
        return {
          catalogId: slot.catalogId,
          name: entry ? entry.name : slot.catalogId,
          category: entry ? (entry.category || '') : '',
          firmware: slot.firmware || '',
        };
      });

      const metricDefs = availableMetrics.filter(m => selectedMetricIds.has(m.id));
      const metrics = metricDefs.map(m => {
        const t = thresholds[m.id];
        const thresholdVal = t && t.value !== '' ? parseFloat(t.value) : null;
        return {
          id: m.id,
          label: m.label,
          unit: m.unit,
          type: m.type,
          direction: m.direction,
          threshold: isNaN(thresholdVal) ? null : thresholdVal,
          thresholdType: t ? t.type : (m.defaultThresholdType || null),
        };
      });

      // Auto-pull
      const autoPulled = {};
      for (const prod of products) {
        const pulled = computeAutoPull(sessions, prod.catalogId);
        if (pulled) autoPulled[prod.catalogId] = pulled;
      }

      const productName = 'Comparative: ' + products.map(p => p.name).join(' vs ');

      const session = await createSession({
        testPlan: 'comparative',
        type: 'comparative',
        productName,
        products,
        metrics,
        results: {},
        autoPulled,
        notes: '',
        status: 'in-progress',
        testCases: [],
        issues: [],
        createdAt: new Date().toISOString(),
        completedAt: null,
      });

      onCreated(session);
    } catch (e) {
      setError('Failed to create session: ' + e.message);
    } finally {
      setCreating(false);
    }
  }

  const numericSelectedMetrics = availableMetrics.filter(
    m => m.type === 'numeric' && selectedMetricIds.has(m.id)
  );

  return (
    <div className="session-start">
      <div className="session-start-header">
        <button className="btn btn-ghost" onClick={onBack}>← Back</button>
        <h2>New Comparative Analysis</h2>
      </div>

      <div className="step-indicator">
        {[1, 2, 3].map(n => (
          <div key={n} className={`step-indicator-item${step === n ? ' active' : step > n ? ' done' : ''}`}>
            <div className="step-indicator-dot">{step > n ? '✓' : n}</div>
            <div className="step-indicator-label">
              {n === 1 ? 'Class & Products' : n === 2 ? 'Select Metrics' : 'Thresholds'}
            </div>
          </div>
        ))}
      </div>

      {error && (
        <div style={{ background: 'var(--fail-dim)', color: 'var(--fail)', borderRadius: 6, padding: '10px 14px', marginBottom: 16, fontSize: 13 }}>
          {error}
        </div>
      )}

      {step === 1 && (
        <div>
          <div className="form-group">
            <label>Product Class</label>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 12 }}>
              Choose a class to filter the catalog — you can only compare products of the same class.
            </p>
            <div className="session-type-cards">
              {PRODUCT_CLASSES.filter(cls =>
                catalog.some(p => cls.categories.includes(p.category))
              ).map(cls => (
                <div
                  key={cls.id}
                  className={`session-type-card ${selectedClass === cls.id ? 'selected' : ''}`}
                  onClick={() => {
                    setSelectedClass(cls.id);
                    setProductSlots([{ catalogId: '', firmware: '' }, { catalogId: '', firmware: '' }]);
                  }}
                >
                  <span className="session-type-icon">{cls.icon}</span>
                  <span className="session-type-label">{cls.label}</span>
                  <span className="session-type-desc">{cls.description}</span>
                </div>
              ))}
            </div>
          </div>

          {selectedClass && (
            <>
              <h3 style={{ marginBottom: 16 }}>Select Products to Compare</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {productSlots.map((slot, idx) => (
                  <div key={idx} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, padding: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                      <span style={{ fontWeight: 600, fontSize: 13 }}>Product {idx + 1}</span>
                      {productSlots.length > 2 && (
                        <button className="btn btn-ghost btn-sm" onClick={() => removeSlot(idx)} style={{ color: 'var(--fail)' }}>Remove</button>
                      )}
                    </div>
                    <div className="form-group" style={{ marginBottom: 10 }}>
                      <label>Select Product</label>
                      <select
                        value={slot.catalogId}
                        onChange={e => setSlotField(idx, 'catalogId', e.target.value)}
                      >
                        <option value="">— Choose from catalog —</option>
                        {classCatalog.map(p => (
                          <option key={p.id} value={p.id}>{p.name}{p.version ? ` ${p.version}` : ''}{p.category ? ` · ${p.category}` : ''}</option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label>Firmware (optional)</label>
                      <input
                        type="text"
                        placeholder="e.g. 1.4.2"
                        value={slot.firmware}
                        onChange={e => setSlotField(idx, 'firmware', e.target.value)}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <button className="btn btn-ghost" style={{ marginTop: 12 }} onClick={addSlot}>
                + Add Another Product
              </button>
            </>
          )}

          <div style={{ marginTop: 24, display: 'flex', justifyContent: 'flex-end' }}>
            <button className="btn btn-primary" onClick={handleStepOneNext} disabled={!selectedClass}>
              Next: Select Metrics →
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div>
          <h3 style={{ marginBottom: 4 }}>Select Metrics</h3>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>
            Metrics filtered for: {[...categorySet].map(c => CATEGORY_LABELS[c] || c).join(', ')}, Universal
          </p>
          {Object.entries(metricsByCategory).map(([cat, metrics]) => (
            <div key={cat} style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 10 }}>
                {CATEGORY_LABELS[cat] || cat}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {metrics.map(m => (
                  <label key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', padding: '8px 12px', background: selectedMetricIds.has(m.id) ? 'var(--primary-dim)' : 'var(--card)', borderRadius: 6, border: `1px solid ${selectedMetricIds.has(m.id) ? 'var(--primary)' : 'var(--border)'}`, textTransform: 'none', letterSpacing: 0, fontSize: 14, fontWeight: 400, color: 'var(--text)', marginBottom: 0 }}>
                    <input
                      type="checkbox"
                      checked={selectedMetricIds.has(m.id)}
                      onChange={() => toggleMetric(m.id)}
                      style={{ width: 'auto', margin: 0 }}
                    />
                    <span style={{ flex: 1 }}>{m.label}{m.unit ? ` (${m.unit})` : ''}</span>
                    <span style={{
                      fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 3,
                      textTransform: 'uppercase', letterSpacing: '0.06em',
                      background: m.type === 'numeric' ? 'var(--pending-dim)' : m.type === 'rating' ? 'var(--pass-dim)' : 'var(--skip-dim)',
                      color: m.type === 'numeric' ? 'var(--pending)' : m.type === 'rating' ? 'var(--pass)' : 'var(--skip)',
                    }}>
                      {m.type}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          ))}
          <div style={{ marginTop: 24, display: 'flex', justifyContent: 'space-between' }}>
            <button className="btn btn-ghost" onClick={() => setStep(1)}>← Back</button>
            <button className="btn btn-primary" onClick={handleStepTwoNext}>
              {numericSelectedMetrics.length > 0 ? 'Next: Configure Thresholds →' : 'Create Analysis'}
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div>
          <h3 style={{ marginBottom: 4 }}>Configure Thresholds</h3>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>
            Set pass/fail thresholds for numeric metrics. Leave blank for no threshold.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {numericSelectedMetrics.map(m => (
              <div key={m.id} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, padding: 16 }}>
                <div style={{ fontWeight: 600, marginBottom: 10 }}>
                  {m.label}{m.unit ? ` (${m.unit})` : ''}
                </div>
                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end' }}>
                  <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                    <label>Threshold Value</label>
                    <input
                      type="number"
                      placeholder="Leave blank for none"
                      value={thresholds[m.id]?.value ?? ''}
                      onChange={e => setThresholdField(m.id, 'value', e.target.value)}
                    />
                  </div>
                  <div className="form-group" style={{ minWidth: 120, marginBottom: 0 }}>
                    <label>Direction</label>
                    <select
                      value={thresholds[m.id]?.type ?? 'min'}
                      onChange={e => setThresholdField(m.id, 'type', e.target.value)}
                    >
                      <option value="min">Min (at least)</option>
                      <option value="max">Max (at most)</option>
                    </select>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 24, display: 'flex', justifyContent: 'space-between' }}>
            <button className="btn btn-ghost" onClick={() => setStep(2)}>← Back</button>
            <button className="btn btn-primary" disabled={creating} onClick={handleCreate}>
              {creating ? 'Creating...' : 'Create Analysis'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
