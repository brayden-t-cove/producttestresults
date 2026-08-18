import { useState, useEffect, useRef } from 'react';
import * as XLSX from 'xlsx';
import {
  listTestItems, getTestItemCategories, listTestPlanPresets, createTestPlanPreset,
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

const PRIORITY_STYLES = {
  P0: { color: 'var(--fail)',           bg: 'var(--fail-dim,#fee2e2)' },
  P1: { color: 'var(--warn,#d97706)',   bg: 'var(--warn-dim,#fef3c7)' },
  P2: { color: 'var(--primary)',        bg: 'var(--primary-dim)' },
  P3: { color: 'var(--text-muted)',     bg: 'var(--card)' },
};

function PlanPriorityChip({ value, onClick }) {
  const s = value ? PRIORITY_STYLES[value] : null;
  return (
    <span
      onClick={onClick}
      title="Click to change priority"
      style={{
        fontSize: 10, fontWeight: 700, borderRadius: 8, padding: '1px 7px', flexShrink: 0,
        background: s ? s.bg : 'var(--border)',
        color: s ? s.color : 'var(--text-dim)',
        cursor: 'pointer', userSelect: 'none',
      }}
    >
      {value || '—'}
    </span>
  );
}

// Priority rules: intent → category → default priority
// Items with a defaultPriority already set are never downgraded by these rules — only upgraded.
const INTENT_PRIORITY_RULES = {
  smoke: {
    // Smoke: only essentials matter
    _baseline: 'P0',
    'Network & Connectivity': 'P1',
    'Power & Hardware': 'P1',
    'Video Quality': 'P1',
    'App & UI': 'P1',
    _default: 'P3',
  },
  intake: {
    // Intake: broad first look — most things matter
    _baseline: 'P0',
    'Network & Connectivity': 'P1',
    'Power & Hardware': 'P1',
    'Video Quality': 'P1',
    'Audio': 'P1',
    'Motion Detection': 'P1',
    'App & UI': 'P1',
    'Interoperability': 'P2',
    'Recording & Playback': 'P2',
    'Notifications': 'P2',
    _default: 'P2',
  },
  regression: {
    // Regression: everything matters, baselines are P0
    _baseline: 'P0',
    _default: 'P1',
  },
  feature: {
    // Feature: baseline P0, everything else is lower priority unless already set
    _baseline: 'P0',
    _default: 'P3',
  },
};

const PRIORITY_ORDER = ['P0', 'P1', 'P2', 'P3'];
function higherPriority(a, b) {
  // Returns whichever priority is higher (lower index = higher priority)
  const ia = PRIORITY_ORDER.indexOf(a ?? 'P3');
  const ib = PRIORITY_ORDER.indexOf(b ?? 'P3');
  return ia <= ib ? a : b;
}

function applyPriorityRules(items, intentId) {
  const rules = INTENT_PRIORITY_RULES[intentId];
  if (!rules) return items;
  return items.map(item => {
    const isBaseline = (item.tags || []).includes('baseline');
    const ruleForCat = isBaseline ? rules._baseline : (rules[item.category] ?? rules._default);
    // Never downgrade a static defaultPriority; take the higher of the two
    const resolved = higherPriority(item.defaultPriority, ruleForCat);
    return { ...item, priority: resolved };
  });
}

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
              borderRadius: 10, padding: '16px 18px', background: value === intent.id ? 'rgba(26,92,246,0.15)' : 'var(--surface)',
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, border: '2px solid var(--accent, #1A5CF6)', borderRadius: 10, padding: '12px 16px', background: 'rgba(26,92,246,0.12)' }}>
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

// ── Import helpers (shared with CustomSessionBuilder) ─────────────────────────

const IMPORT_COLUMN_ALIASES = {
  id:             ['id', 'test id', 'test_id', 'case id', 'no', '#'],
  title:          ['test item', 'title', 'name', 'test name', 'test case', 'case', 'description', 'summary', 'item'],
  expectedResult: ['expected result', 'expected', 'expected behavior', 'acceptance criteria', 'criteria'],
  priority:       ['priority', 'p', 'pri', 'severity', 'level', 'rank'],
  notes:          ['notes', 'note', 'comments', 'remarks'],
  category:       ['category', 'cat', 'group', 'section', 'area'],
};
const PRIORITY_NORM = { p0: 'P0', critical: 'P0', p1: 'P1', high: 'P1', p2: 'P2', medium: 'P2', p3: 'P3', low: 'P3' };

function xlsxAutoMap(headers) {
  const mapping = {};
  headers.forEach((h, i) => {
    const n = h.toLowerCase().trim();
    for (const [field, aliases] of Object.entries(IMPORT_COLUMN_ALIASES)) {
      if (!mapping[field] && aliases.some(a => n === a || n.includes(a))) { mapping[field] = i; break; }
    }
  });
  return mapping;
}

function xlsxParseFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => {
      try {
        const wb = XLSX.read(new Uint8Array(e.target.result), { type: 'array' });
        const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, defval: '' });
        if (rows.length < 2) { reject(new Error('File needs a header row and at least one data row.')); return; }
        resolve({ headers: rows[0].map(h => String(h).trim()), dataRows: rows.slice(1).filter(r => r.some(c => String(c).trim())) });
      } catch { reject(new Error('Could not parse file — make sure it is .xlsx, .xls, or .csv.')); }
    };
    reader.onerror = () => reject(new Error('Failed to read file.'));
    reader.readAsArrayBuffer(file);
  });
}

function xlsxBuildItems(headers, dataRows, mapping) {
  return dataRows.map((row, i) => {
    const get = f => mapping[f] !== undefined ? String(row[mapping[f]] ?? '').trim() : '';
    const rawPri = get('priority').toLowerCase();
    const priority = PRIORITY_NORM[rawPri] || (get('priority') || undefined);
    return {
      id: crypto.randomUUID(),
      name: get('title') || `Test ${i + 1}`,
      category: get('category') || 'Imported',
      description: get('expectedResult'),
      expectedResult: get('expectedResult'),
      notes: get('notes'),
      priority,
      tags: ['imported'],
      status: 'pending',
      _importedRow: i,
    };
  });
}

// ── Import from File sub-component (used inside StepTemplate) ─────────────────

function ImportFromFile({ onImported }) {
  const [subStep, setSubStep] = useState('upload'); // upload | mapping | preview
  const [headers, setHeaders] = useState([]);
  const [dataRows, setDataRows] = useState([]);
  const [mapping, setMapping] = useState({});
  const [fileName, setFileName] = useState('');
  const [error, setError] = useState('');
  const fileRef = useRef(null);

  const FIELDS = [
    { key: 'title',          label: 'Test Item / Title',  required: true },
    { key: 'expectedResult', label: 'Expected Result',    required: false },
    { key: 'priority',       label: 'Priority',           required: false },
    { key: 'category',       label: 'Category / Group',   required: false },
    { key: 'notes',          label: 'Notes',              required: false },
  ];

  async function handleFile(file) {
    if (!file) return;
    setError('');
    setFileName(file.name);
    try {
      const { headers: h, dataRows: d } = await xlsxParseFile(file);
      setHeaders(h); setDataRows(d); setMapping(xlsxAutoMap(h)); setSubStep('mapping');
    } catch (err) { setError(err.message); }
  }

  const preview = subStep === 'preview' ? xlsxBuildItems(headers, dataRows, mapping) : [];
  const p0 = preview.filter(t => t.priority === 'P0').length;
  const p1 = preview.filter(t => t.priority === 'P1').length;
  const p2 = preview.filter(t => t.priority === 'P2').length;

  if (subStep === 'upload') return (
    <div>
      <input ref={fileRef} type="file" accept=".xlsx,.csv,.xls" style={{ display: 'none' }}
        onChange={e => { handleFile(e.target.files[0]); e.target.value = ''; }} />
      <div
        style={{ border: '2px dashed var(--border)', borderRadius: 8, padding: '32px 20px', textAlign: 'center', cursor: 'pointer' }}
        onClick={() => fileRef.current?.click()}
        onDragOver={e => e.preventDefault()}
        onDrop={e => { e.preventDefault(); handleFile(e.dataTransfer.files[0]); }}
      >
        <div style={{ fontSize: 32, marginBottom: 8 }}>📂</div>
        <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>Drop your file here or click to browse</div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Supports .xlsx, .xls, .csv</div>
      </div>
      {error && <div className="error-msg" style={{ marginTop: 8 }}>{error}</div>}
    </div>
  );

  if (subStep === 'mapping') return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>📄 {fileName} · {dataRows.length} rows</span>
        <button className="btn btn-ghost btn-sm" style={{ marginLeft: 'auto' }} onClick={() => setSubStep('upload')}>← Change file</button>
      </div>
      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>
        Column Mapping
        <span style={{ fontWeight: 400, color: 'var(--text-muted)', marginLeft: 6, fontSize: 12 }}>Auto-detected — adjust if needed</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
        {FIELDS.map(f => (
          <div key={f.key} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 160, fontSize: 13, fontWeight: f.required ? 600 : 400 }}>
              {f.label}{f.required && <span style={{ color: 'var(--fail)', marginLeft: 2 }}>*</span>}
            </div>
            <select value={mapping[f.key] !== undefined ? mapping[f.key] : ''} onChange={e => {
              const next = { ...mapping };
              if (e.target.value === '') delete next[f.key]; else next[f.key] = parseInt(e.target.value);
              setMapping(next);
            }} style={{ flex: 1, fontSize: 13 }}>
              <option value="">— not mapped —</option>
              {headers.map((h, i) => <option key={i} value={i}>{h}</option>)}
            </select>
            {mapping[f.key] !== undefined && <span style={{ fontSize: 11, color: 'var(--pass)' }}>✓</span>}
          </div>
        ))}
      </div>
      {/* Raw preview */}
      <div style={{ background: 'var(--card)', borderRadius: 6, border: '1px solid var(--border)', overflowX: 'auto', marginBottom: 14 }}>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', padding: '5px 10px', borderBottom: '1px solid var(--border)' }}>First 3 rows</div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
          <thead><tr>{headers.map((h, i) => <th key={i} style={{ padding: '4px 8px', textAlign: 'left', borderBottom: '1px solid var(--border)', color: 'var(--text-muted)' }}>{h}</th>)}</tr></thead>
          <tbody>{dataRows.slice(0, 3).map((row, ri) => <tr key={ri}>{headers.map((_, ci) => <td key={ci} style={{ padding: '3px 8px', borderBottom: '1px solid var(--border)', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{String(row[ci] ?? '').slice(0, 80)}</td>)}</tr>)}</tbody>
        </table>
      </div>
      {error && <div className="error-msg" style={{ marginBottom: 8 }}>{error}</div>}
      <button className="btn btn-primary" style={{ width: '100%' }} onClick={() => {
        if (mapping.title === undefined) { setError('Map at least the "Test Item / Title" column.'); return; }
        setError(''); setSubStep('preview');
      }}>Preview {dataRows.length} Test Cases →</button>
    </div>
  );

  // Preview step
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <span style={{ fontSize: 13, fontWeight: 600 }}>{preview.length} test cases ready</span>
        {p0 > 0 && <span style={{ fontSize: 11, background: 'var(--fail-dim,#fee2e2)', color: 'var(--fail)', borderRadius: 10, padding: '2px 8px', fontWeight: 700 }}>P0 ×{p0}</span>}
        {p1 > 0 && <span style={{ fontSize: 11, background: 'var(--warn-dim,#fef3c7)', color: 'var(--warn,#d97706)', borderRadius: 10, padding: '2px 8px', fontWeight: 700 }}>P1 ×{p1}</span>}
        {p2 > 0 && <span style={{ fontSize: 11, background: 'var(--primary-dim)', color: 'var(--primary)', borderRadius: 10, padding: '2px 8px', fontWeight: 700 }}>P2 ×{p2}</span>}
        <button className="btn btn-ghost btn-sm" style={{ marginLeft: 'auto', fontSize: 12 }} onClick={() => setSubStep('mapping')}>← Edit mapping</button>
      </div>
      <div style={{ maxHeight: 300, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 6, marginBottom: 14 }}>
        {preview.map((item, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '8px 12px', borderBottom: i < preview.length - 1 ? '1px solid var(--border)' : 'none', fontSize: 13 }}>
            <span style={{ color: 'var(--text-muted)', fontSize: 11, flexShrink: 0, marginTop: 2, minWidth: 28 }}>{i + 1}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600 }}>{item.name}</div>
              {item.category !== 'Imported' && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{item.category}</div>}
              {item.expectedResult && <div style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 2 }}>{item.expectedResult.slice(0, 120)}{item.expectedResult.length > 120 ? '…' : ''}</div>}
            </div>
            {item.priority && (
              <span style={{ fontSize: 11, fontWeight: 700, borderRadius: 10, padding: '2px 8px', flexShrink: 0,
                background: item.priority === 'P0' ? 'var(--fail-dim,#fee2e2)' : item.priority === 'P1' ? 'var(--warn-dim,#fef3c7)' : 'var(--primary-dim)',
                color: item.priority === 'P0' ? 'var(--fail)' : item.priority === 'P1' ? 'var(--warn,#d97706)' : 'var(--primary)',
              }}>{item.priority}</span>
            )}
          </div>
        ))}
      </div>
      <button className="btn btn-primary" style={{ width: '100%' }} onClick={() => onImported(preview)}>
        Use These {preview.length} Test Cases →
      </button>
    </div>
  );
}

// ── Step 3: Template ──────────────────────────────────────────────────────────

function StepTemplate({ productType, intentId, libraryItems, onSelectPreset, onBlank, onImport }) {
  const [presets, setPresets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showImport, setShowImport] = useState(false);

  useEffect(() => {
    listTestPlanPresets(productType)
      .then(setPresets)
      .catch(() => setPresets([]))
      .finally(() => setLoading(false));
  }, [productType]);

  const filtered = intentId ? presets.filter(p => !p.intentType || p.intentType === intentId) : presets;

  if (showImport) return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
        <button className="btn btn-ghost btn-sm" onClick={() => setShowImport(false)}>← Back</button>
        <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>Import from File</h3>
      </div>
      <ImportFromFile onImported={onImport} />
    </div>
  );

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
              No templates available for this product type yet.
            </div>
          )}

          {/* Import from file */}
          <button
            type="button"
            onClick={() => setShowImport(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 14, border: '1px solid var(--border)', borderRadius: 10, padding: '14px 18px', background: 'var(--surface)', textAlign: 'left', cursor: 'pointer' }}
          >
            <span style={{ fontSize: 22 }}>📂</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 14 }}>Import from File</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Load a sign-off list or test sheet from .xlsx, .xls, or .csv</div>
            </div>
            <span style={{ fontSize: 18, color: 'var(--text-muted)' }}>→</span>
          </button>

          {/* Start blank */}
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

const PRIORITY_CYCLE = ['P0', 'P1', 'P2', 'P3', undefined];

function StepBuild({ libraryItems, categories, plan, onPlanChange, productCategory, intentId }) {
  const [expandedCats, setExpandedCats] = useState({});
  const [search, setSearch] = useState('');
  const [showAll, setShowAll] = useState(false);

  const planIds = new Set(plan.map(i => i.id));

  function toggleCat(cat) {
    setExpandedCats(e => ({ ...e, [cat]: !e[cat] }));
  }

  function addItem(item) {
    if (planIds.has(item.id)) return;
    const [enriched] = applyPriorityRules([item], intentId);
    onPlanChange([...plan, enriched]);
  }

  function removeItem(itemId) {
    onPlanChange(plan.filter(i => i.id !== itemId));
  }

  function cyclePriority(itemId) {
    onPlanChange(plan.map(i => {
      if (i.id !== itemId) return i;
      const cur = PRIORITY_CYCLE.indexOf(i.priority);
      const next = PRIORITY_CYCLE[(cur + 1) % PRIORITY_CYCLE.length];
      return { ...i, priority: next };
    }));
  }

  function addCategory(cat, catItems) {
    const toAdd = applyPriorityRules(catItems.filter(i => !planIds.has(i.id)), intentId);
    onPlanChange([...plan, ...toAdd]);
  }

  function removeCategory(cat) {
    onPlanChange(plan.filter(i => i.category !== cat));
  }

  const deviceFiltered = (!productCategory || showAll)
    ? libraryItems
    : libraryItems.filter(i => !i.deviceTypes?.length || i.deviceTypes.includes(productCategory));

  const filteredLib = search.trim()
    ? deviceFiltered.filter(i => i.name.toLowerCase().includes(search.toLowerCase()) || i.category.toLowerCase().includes(search.toLowerCase()) || (i.tags || []).some(t => t.toLowerCase().includes(search.toLowerCase())))
    : deviceFiltered;

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
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-muted)' }}>
                Test Library
              </span>
              {productCategory && (
                <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer' }}>
                  <input type="checkbox" checked={showAll} onChange={e => setShowAll(e.target.checked)} style={{ margin: 0 }} />
                  Show all items
                </label>
              )}
            </div>
            <input
              type="text"
              placeholder="Search library…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ width: '100%', fontSize: 12 }}
            />
            {productCategory && !showAll && (
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>
                Showing items tagged for <strong>{productCategory}</strong> · <span style={{ textDecoration: 'underline', cursor: 'pointer' }} onClick={() => setShowAll(true)}>show all</span>
              </div>
            )}
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
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent, #1A5CF6)', background: 'rgba(26,92,246,0.15)', borderRadius: 10, padding: '1px 8px' }}>
                {plan.length} test{plan.length !== 1 ? 's' : ''}
              </span>
              {['P0','P1','P2','P3'].map(p => {
                const count = plan.filter(i => i.priority === p).length;
                if (!count) return null;
                const s = PRIORITY_STYLES[p];
                return <span key={p} style={{ fontSize: 10, fontWeight: 700, borderRadius: 8, padding: '1px 6px', background: s.bg, color: s.color }}>{p}×{count}</span>;
              })}
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
                      <PlanPriorityChip value={item.priority} onClick={() => cyclePriority(item.id)} />
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
  // Import-then-save-as-preset flow
  const [savePresetModal, setSavePresetModal] = useState(null); // { items } | null
  const [presetName, setPresetName] = useState('');
  const [savingPreset, setSavingPreset] = useState(false);

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
    setPlan(applyPriorityRules(presetItems, intent));
    setStep(3);
  }

  function handleBlank() {
    setPlan([]);
    setStep(3);
  }

  function handleImport(items) {
    // Prompt to save as preset before continuing to build step
    const suggestedName = product ? `${product.name} — ${INTENTS.find(i => i.id === intent)?.label || ''} Sign-Off` : 'Imported Plan';
    setPresetName(suggestedName);
    setSavePresetModal({ items });
  }

  async function handleSavePreset(save) {
    const items = savePresetModal.items;
    if (save && presetName.trim()) {
      setSavingPreset(true);
      try {
        await createTestPlanPreset({
          name: presetName.trim(),
          productType: product?.category || '',
          intentType: intent || '',
          description: `Imported sign-off list · ${items.length} items`,
          itemIds: [], // imported items aren't in the library; store empty for now
        });
      } catch { /* non-fatal */ }
      setSavingPreset(false);
    }
    setSavePresetModal(null);
    setPlan(items);
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
        priority: item.priority || undefined,
        status: 'pending',
        notes: item.notes || '',
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
                onImport={handleImport}
              />
        )}
        {step === 3 && (
          libraryLoading
            ? <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>Loading library…</div>
            : <StepBuild libraryItems={libraryItems} categories={categories} plan={plan} onPlanChange={setPlan} productCategory={product?.category} intentId={intent} />
        )}
        {step === 4 && <StepEnvironment product={product} env={env} onChange={setEnv} />}
      </div>

      {/* Save as preset modal */}
      {savePresetModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: 28, width: 440, maxWidth: '90vw' }}>
            <h3 style={{ margin: '0 0 8px', fontSize: 16, fontWeight: 700 }}>Save as a template?</h3>
            <p style={{ margin: '0 0 18px', fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.5 }}>
              Save this imported list as a Plan Template so anyone can start from it next time — without re-uploading the file.
            </p>
            <div className="form-group" style={{ margin: '0 0 20px' }}>
              <label>Template name</label>
              <input
                type="text"
                value={presetName}
                onChange={e => setPresetName(e.target.value)}
                placeholder="e.g. OmniCam 4K Release Gate"
                autoFocus
              />
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button className="btn btn-ghost" onClick={() => handleSavePreset(false)} disabled={savingPreset}>
                Skip, just continue
              </button>
              <button className="btn btn-primary" onClick={() => handleSavePreset(true)} disabled={savingPreset || !presetName.trim()}>
                {savingPreset ? 'Saving…' : 'Save Template & Continue →'}
              </button>
            </div>
          </div>
        </div>
      )}

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
