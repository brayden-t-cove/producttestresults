import { useState, useRef } from 'react';
import { SPEC_SCHEMA } from '../data/productSpecs.js';
import { CAPABILITY_GROUPS } from '../data/capabilities.js';

// ── CSV template definition ───────────────────────────────────────────────────

const TEMPLATE_HEADERS = [
  'modelNumber',
  'name',
  'manufacturer',
  'category',
  'subclass',
  'productType',
  'status',
  'version',
  'revision',
  'description',
  'msrp',
  'upc',
  'website',
  'notes',
];

const TEMPLATE_HINTS = {
  modelNumber: 'Required. Unique model identifier (e.g. WCO3ML)',
  name: 'Display name / product title',
  manufacturer: 'Brand or company name',
  category: 'hub | touchpad | camera | sensor | app',
  subclass: 'e.g. Indoor Stationary, Door/Window, Security Hub',
  productType: 'production | sample | prototype | competitor (default: production)',
  status: 'active | discontinued | under-evaluation | in-development (default: active)',
  version: 'e.g. V1, V2',
  revision: 'Hardware revision e.g. Rev A',
  description: 'Short product description',
  msrp: 'Retail price as number e.g. 49.99',
  upc: 'UPC / barcode',
  website: 'Product URL',
  notes: 'Internal notes',
};

const EXAMPLE_ROWS = [
  ['WCO3ML', 'Outdoor Cam Pro', 'Wyze', 'camera', 'Outdoor Stationary', 'competitor', 'active', '', '', '1080p outdoor Wi-Fi camera with color night vision', '39.99', '810031190401', 'https://wyze.com/products/wyze-cam-outdoor', 'Evaluating for price benchmarking'],
  ['V3PRO', 'Cam v3 Pro', 'Wyze', 'camera', 'Indoor Stationary', 'competitor', 'active', 'V3', '', '2K indoor cam with spotlight', '35.98', '', 'https://wyze.com/products/wyze-cam', ''],
  ['MYPRODUCT-01', 'Indoor Hub', 'Cove', 'hub', 'Security Hub', 'production', 'active', 'V2', 'Rev B', 'Primary security hub', '199.00', '', '', ''],
];

function generateCsv() {
  function escape(v) {
    const s = String(v ?? '');
    return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s;
  }
  const hintRow = TEMPLATE_HEADERS.map(h => escape(TEMPLATE_HINTS[h] || ''));
  const rows = [
    TEMPLATE_HEADERS.join(','),
    `# ${hintRow.join(',')}`,
    ...EXAMPLE_ROWS.map(r => r.map(escape).join(',')),
  ];
  return rows.join('\n');
}

// ── CSV parser ────────────────────────────────────────────────────────────────

function parseCsvLine(line) {
  const fields = [];
  let cur = '', inQuote = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQuote) {
      if (c === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (c === '"') inQuote = false;
      else cur += c;
    } else {
      if (c === '"') inQuote = true;
      else if (c === ',') { fields.push(cur); cur = ''; }
      else cur += c;
    }
  }
  fields.push(cur);
  return fields;
}

// ── Normalization maps ────────────────────────────────────────────────────────

const CATEGORY_MAP = {
  hub: 'hub', hubs: 'hub', 'security hub': 'hub', 'camera hub': 'hub',
  touchpad: 'touchpad', touchpads: 'touchpad', keypad: 'touchpad', keypads: 'touchpad',
  camera: 'camera', cameras: 'camera', cam: 'camera',
  sensor: 'sensor', sensors: 'sensor',
  app: 'app', application: 'app', software: 'app',
};

const TYPE_MAP = {
  production: 'production', prod: 'production',
  sample: 'sample', samples: 'sample', eval: 'sample', evaluation: 'sample',
  prototype: 'prototype', proto: 'prototype',
  competitor: 'competitor', competitive: 'competitor', comp: 'competitor', '3rd party': 'competitor', 'third party': 'competitor',
};

const STATUS_MAP = {
  active: 'active', current: 'active', available: 'active', live: 'active',
  discontinued: 'discontinued', eol: 'discontinued', 'end of life': 'discontinued', retired: 'discontinued', legacy: 'discontinued',
  'under-evaluation': 'under-evaluation', 'under evaluation': 'under-evaluation', evaluation: 'under-evaluation', evaluating: 'under-evaluation',
  'in-development': 'in-development', 'in development': 'in-development', development: 'in-development', dev: 'in-development', wip: 'in-development',
};

function normalize(value, map) {
  if (!value) return null;
  const key = value.trim().toLowerCase();
  return map[key] ?? null;
}

function parseCsv(text) {
  const lines = text.split(/\r?\n/).filter(l => l.trim() && !l.trim().startsWith('#'));
  if (lines.length < 2) return { headers: [], rows: [] };
  const headers = parseCsvLine(lines[0]).map(h => h.trim());
  const rows = lines.slice(1).map(line => {
    const vals = parseCsvLine(line);
    const obj = {};
    headers.forEach((h, i) => { obj[h] = (vals[i] || '').trim(); });
    return obj;
  });
  return { headers, rows };
}

// Returns { normalized: {...row with normalized fields}, errors: [], warnings: [] }
// errors = row will be skipped; warnings = row imports with a note
function validateAndNormalize(row) {
  const errors = [], warnings = [];
  const normalized = { ...row };

  // Hard error — model number required
  if (!row.modelNumber?.trim()) {
    errors.push('modelNumber is required');
    return { normalized, errors, warnings };
  }

  // category — normalize, warn if unrecognized
  if (row.category) {
    const mapped = normalize(row.category, CATEGORY_MAP);
    if (mapped) {
      normalized.category = mapped;
    } else {
      warnings.push(`category "${row.category}" not recognized — will import as-is`);
    }
  }

  // productType — normalize, warn if unrecognized
  if (row.productType) {
    const mapped = normalize(row.productType, TYPE_MAP);
    if (mapped) {
      normalized.productType = mapped;
    } else {
      warnings.push(`productType "${row.productType}" not recognized — will default to "production"`);
      normalized.productType = 'production';
    }
  }

  // status — normalize, warn if unrecognized
  if (row.status) {
    const mapped = normalize(row.status, STATUS_MAP);
    if (mapped) {
      normalized.status = mapped;
    } else {
      warnings.push(`status "${row.status}" not recognized — will default to "active"`);
      normalized.status = 'active';
    }
  }

  // msrp — soft: just clear it if unparseable
  if (row.msrp && isNaN(parseFloat(row.msrp))) {
    warnings.push(`msrp "${row.msrp}" is not a number — will be ignored`);
    normalized.msrp = '';
  }

  return { normalized, errors, warnings };
}

// ── Preview table ─────────────────────────────────────────────────────────────

const COL_DISPLAY = {
  modelNumber: 'Model #',
  name: 'Name',
  manufacturer: 'Manufacturer',
  category: 'Category',
  subclass: 'Subclass',
  productType: 'Type',
  status: 'Status',
};

const TYPE_COLORS = {
  production: { bg: 'rgba(99,102,241,0.10)', color: '#6366f1' },
  sample:     { bg: 'rgba(245,158,11,0.12)',  color: '#d97706' },
  prototype:  { bg: 'rgba(236,72,153,0.10)', color: '#db2777' },
  competitor: { bg: 'rgba(30,41,59,0.12)',    color: '#475569' },
};
const STATUS_DOT = {
  active:           '#10b981',
  discontinued:     '#6b7280',
  'under-evaluation': '#f59e0b',
  'in-development': '#6366f1',
};

function PreviewTable({ results }) {
  const displayCols = Object.keys(COL_DISPLAY);
  return (
    <div style={{ overflowX: 'auto', borderRadius: 8, border: '1px solid var(--border)' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr style={{ background: 'var(--bg)', borderBottom: '1px solid var(--border)' }}>
            <th style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 600, color: 'var(--text-muted)', whiteSpace: 'nowrap', width: 28 }}>#</th>
            {displayCols.map(c => (
              <th key={c} style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 600, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                {COL_DISPLAY[c]}
              </th>
            ))}
            <th style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 600, color: 'var(--text-muted)' }}>Status</th>
          </tr>
        </thead>
        <tbody>
          {results.map(({ normalized: row, errors, warnings }, i) => {
            const hasError = errors.length > 0;
            const hasWarning = !hasError && warnings.length > 0;
            const typeStyle = TYPE_COLORS[row.productType] || TYPE_COLORS.production;
            const dotColor = STATUS_DOT[row.status] || STATUS_DOT.active;
            const rowBg = hasError ? 'rgba(239,68,68,0.04)' : hasWarning ? 'rgba(245,158,11,0.04)' : 'transparent';
            return (
              <tr key={i} style={{ borderBottom: '1px solid var(--border)', background: rowBg }}>
                <td style={{ padding: '7px 10px', color: 'var(--text-muted)', fontSize: 12 }}>{i + 1}</td>
                {displayCols.map(c => (
                  <td key={c} style={{ padding: '7px 10px', whiteSpace: 'nowrap' }}>
                    {c === 'productType' && row[c] ? (
                      <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 7px', borderRadius: 4, background: typeStyle.bg, color: typeStyle.color, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        {row[c]}
                      </span>
                    ) : c === 'status' && row[c] ? (
                      <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        <span style={{ width: 7, height: 7, borderRadius: '50%', background: dotColor, flexShrink: 0, display: 'inline-block' }} />
                        {row[c]}
                      </span>
                    ) : (
                      <span style={{ color: row[c] ? 'var(--text)' : 'var(--text-muted)' }}>{row[c] || '—'}</span>
                    )}
                  </td>
                ))}
                <td style={{ padding: '7px 10px', maxWidth: 260 }}>
                  {hasError ? (
                    <span style={{ color: 'var(--fail)', fontSize: 12 }}>✕ Skipped: {errors.join('; ')}</span>
                  ) : hasWarning ? (
                    <span style={{ color: '#d97706', fontSize: 12 }}>⚠ {warnings.join('; ')}</span>
                  ) : (
                    <span style={{ color: 'var(--pass)', fontSize: 12 }}>✓ Ready</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── Field reference document generator ───────────────────────────────────────

function buildCapabilitiesSection(category) {
  const groups = CAPABILITY_GROUPS[category];
  if (!groups) return '';
  return groups.map(g => {
    const caps = g.capabilities.map(c => `    ${c.id.padEnd(36)}${c.label}`).join('\n');
    return `  ── ${g.label} ──\n${caps}`;
  }).join('\n\n');
}

function buildSpecsSection(category) {
  const schema = SPEC_SCHEMA[category];
  if (!schema) return '';
  return schema.map(group => {
    if (group.type === 'lens-array') {
      const fields = group.lensFields.map(f => {
        const valHint = f.type === 'select' ? `Options: ${f.options.join(' | ')}` :
          f.type === 'boolean' ? 'yes | no | na | unknown' : 'Text value';
        return `    ${f.id.padEnd(24)}${valHint}`;
      }).join('\n');
      return `  ── ${group.label} (per lens) ──\n${fields}`;
    }
    const fields = (group.fields || []).map(f => {
      const valHint = f.type === 'select' ? `Options: ${f.options.join(' | ')}` :
        f.type === 'boolean' ? 'yes | no | na | unknown' :
        f.type === 'textarea' ? 'Multi-line text' : 'Text value';
      return `    ${f.id.padEnd(24)}${valHint}`;
    }).join('\n');
    return `  ── ${group.label} ──\n${fields}`;
  }).join('\n\n');
}

function buildPrompt(category) {
  const categoryLabel = category.charAt(0).toUpperCase() + category.slice(1);
  return `I'm going to give you a product listing for a ${categoryLabel} and a field reference document.
Please do this in two steps:

STEP 1 — Analysis (do NOT output JSON yet):
- Search the internet for the exact model number/name to supplement what's in the listing
- Go through every field in the reference document and tell me:
    • What value you found and where (listing, manufacturer site, review, etc.)
    • What you couldn't find or are uncertain about
    • Your best guess for anything ambiguous, and your reasoning
- For capabilities: use the listing AND common-sense reasoning based on the product type.
  For example, a doorbell camera should have "doorbell" placement checked but NOT "lightbulb".
  A bullet/dome outdoor camera should NOT have "doorbell-button". Apply this kind of logic
  to every capability — mark something only if you're reasonably confident it applies.
- List every capability ID you believe applies, and briefly note why for any that aren't obvious.

Wait for me to confirm or correct your findings before moving to Step 2.

STEP 2 — JSON output (only after I confirm):
Output a single JSON object using the exact field names from the reference.
Include only fields with actual values. Omit anything blank or unknown.

JSON format:
{
  "modelNumber": "...",
  "name": "...",
  "manufacturer": "...",
  "category": "${category}",
  "subclass": "...",
  "productType": "competitor",
  "status": "active",
  "msrp": 0.00,
  "description": "...",
  "notes": "...",
  "capabilities": ["id-one", "id-two"],
  "specs": {
    "fieldId": "value"${category === 'camera' ? `,
    "lensCount": "1",
    "lenses": [
      { "videoResolution": "1080p", "horizontalFov": "130", "colorNightVision": "yes" }
    ]` : ''}
  }
}`;
}

function generateFieldReference(category) {
  const categoryLabel = category.charAt(0).toUpperCase() + category.slice(1);

  const fieldList = TEMPLATE_HEADERS.map(h => {
    const hint = TEMPLATE_HINTS[h] || '';
    const req = h === 'modelNumber' ? ' [REQUIRED]' : '';
    return `  ${h.padEnd(18)}${req}\n    ${hint}`;
  }).join('\n\n');

  const specsSection = buildSpecsSection(category);
  const capsSection = buildCapabilitiesSection(category);
  const prompt = buildPrompt(category);

  return `PRODUCT CATALOG — ${categoryLabel.toUpperCase()} FIELD REFERENCE
Generated: ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
HOW TO USE WITH CLAUDE CHAT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. Copy the prompt below and paste it into Claude chat
2. Attach or paste the product listing (Amazon link, page text, spec sheet, etc.)
3. Also paste this entire reference document into the chat
4. Review Claude's Step 1 analysis — correct anything before confirming
5. Paste the final JSON into the Import Products page (Single Item tab)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PROMPT (copy everything below this line)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${prompt}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CATALOG ENTRY FIELDS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${fieldList}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ACCEPTED VALUES FOR DROPDOWN FIELDS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  category     : hub | touchpad | camera | sensor | app
  subclass     : Indoor Stationary | Indoor P/T | Outdoor Stationary |
                 Outdoor P/T | Doorbell | Lightbulb | Window | Pet
  productType  : production | sample | prototype | competitor
                 → competitor  = 3rd-party brand (Wyze, Arlo, Reolink, etc.)
                 → sample      = unit ordered for hands-on evaluation
                 → production  = your own shipping product
                 → prototype   = pre-production / internal build
  status       : active | discontinued | under-evaluation | in-development
  msrp         : number only, no $ symbol (e.g. 49.99)
${capsSection ? `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CAPABILITY IDs  (use exact IDs in "capabilities": [ ] array)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Only include capabilities that actually apply. Use common-sense reasoning —
a doorbell camera is not a lightbulb; a bullet/dome camera has no doorbell button.
If uncertain, search the manufacturer site or reviews for confirmation.

${capsSection}` : ''}${specsSection ? `

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TECH SPEC FIELDS  (use exact field IDs in "specs": { })
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Only include fields with actual values. Omit anything blank or unknown.

${specsSection}` : ''}`;
}

function downloadFieldReference(category) {
  const content = generateFieldReference(category);
  const blob = new Blob([content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `field-reference-${category}.txt`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Single item JSON parser ───────────────────────────────────────────────────

function parseJsonInput(text) {
  const trimmed = text.trim();
  // Strip markdown code fences if present
  const stripped = trimmed.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
  const obj = JSON.parse(stripped);
  // Normalize top-level keys to match our field names (case-insensitive match)
  const keyMap = {};
  TEMPLATE_HEADERS.forEach(h => { keyMap[h.toLowerCase()] = h; });
  const normalized = {};
  Object.entries(obj).forEach(([k, v]) => {
    if (k.toLowerCase() === 'specs' && typeof v === 'object' && v !== null) {
      normalized.specs = v;
    } else if (k.toLowerCase() === 'capabilities' && Array.isArray(v)) {
      normalized.capabilities = v.map(String);
    } else {
      const mapped = keyMap[k.toLowerCase()] || k;
      normalized[mapped] = v !== null && v !== undefined ? String(v) : '';
    }
  });
  return normalized;
}

// ── Main component ────────────────────────────────────────────────────────────

export default function CatalogImport({ onBack, onImported }) {
  const [mode, setMode] = useState('single'); // single | bulk
  const [step, setStep] = useState('input'); // input | preview | done
  const [results, setResults] = useState([]);
  const [fileName, setFileName] = useState('');
  const [jsonInput, setJsonInput] = useState('');
  const [jsonError, setJsonError] = useState('');
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [refCategory, setRefCategory] = useState('camera');
  const [promptOpen, setPromptOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const fileRef = useRef();

  function copyPrompt() {
    navigator.clipboard.writeText(buildPrompt(refCategory)).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function reset() {
    setResults([]); setFileName(''); setJsonInput('');
    setJsonError(''); setStep('input'); setImportResult(null);
  }

  function downloadTemplate() {
    const csv = generateCsv();
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'catalog-import-template.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleJsonPreview() {
    setJsonError('');
    try {
      const row = parseJsonInput(jsonInput);
      const result = validateAndNormalize(row);
      setResults([result]);
      setStep('preview');
    } catch {
      setJsonError('Could not parse JSON — make sure it\'s a valid JSON object. Code fences (``` ```) are fine to include.');
    }
  }

  function processFile(file) {
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = e => {
      const { rows } = parseCsv(e.target.result);
      if (rows.length === 0) return;
      setResults(rows.map(validateAndNormalize));
      setStep('preview');
    };
    reader.readAsText(file);
  }

  function handleFile(e) { processFile(e.target.files?.[0]); }
  function handleDrop(e) { e.preventDefault(); setDragOver(false); processFile(e.dataTransfer.files?.[0]); }

  const importableRows = results.filter(r => r.errors.length === 0).map(r => r.normalized);
  const errorCount = results.filter(r => r.errors.length > 0).length;
  const warningCount = results.filter(r => r.errors.length === 0 && r.warnings.length > 0).length;

  async function handleImport() {
    setImporting(true);
    try {
      const res = await fetch('/api/catalog/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows: importableRows }),
      });
      const data = await res.json();
      setImportResult(data);
      setStep('done');
      if (onImported) onImported();
    } catch (err) {
      setImportResult({ error: err.message });
    } finally {
      setImporting(false);
    }
  }

  // ── Done ──────────────────────────────────────────────────────────────────
  if (step === 'done') {
    return (
      <div className="dashboard">
        <div style={{ maxWidth: 520, margin: '0 auto', textAlign: 'center', padding: '40px 0' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>✓</div>
          <h2 style={{ marginBottom: 8 }}>Import Complete</h2>
          {importResult?.error ? (
            <p style={{ color: 'var(--fail)' }}>{importResult.error}</p>
          ) : (
            <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>
              {importResult?.imported ?? importableRows.length} product{(importResult?.imported ?? importableRows.length) !== 1 ? 's' : ''} added to the catalog.
              {importResult?.skipped > 0 && ` ${importResult.skipped} skipped (duplicate model numbers).`}
            </p>
          )}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 24 }}>
            <button className="btn btn-ghost" onClick={reset}>Import Another</button>
            <button className="btn btn-primary" onClick={onBack}>Go to Catalog</button>
          </div>
        </div>
      </div>
    );
  }

  // ── Preview ───────────────────────────────────────────────────────────────
  if (step === 'preview') {
    return (
      <div className="dashboard">
        <div className="dashboard-header">
          <div>
            <button className="btn btn-ghost btn-sm" onClick={() => setStep('input')} style={{ marginBottom: 8 }}>← Back</button>
            <h1>Review Import</h1>
            <p style={{ color: 'var(--text-muted)', fontSize: 14, margin: 0 }}>
              {fileName || (mode === 'single' ? 'Single item' : '')} · {results.length} product{results.length !== 1 ? 's' : ''}
              {errorCount > 0 && <span style={{ color: 'var(--fail)', marginLeft: 8 }}>· {errorCount} skipped (missing model #)</span>}
              {warningCount > 0 && <span style={{ color: '#d97706', marginLeft: 8 }}>· {warningCount} with warnings (will import)</span>}
              {importableRows.length > 0 && <span style={{ color: 'var(--pass)', marginLeft: 8 }}>· {importableRows.length} ready</span>}
            </p>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <button className="btn btn-ghost" onClick={reset}>Start Over</button>
            <button className="btn btn-primary" disabled={importableRows.length === 0 || importing} onClick={handleImport}>
              {importing ? 'Importing...' : `Import ${importableRows.length} Product${importableRows.length !== 1 ? 's' : ''}`}
            </button>
          </div>
        </div>

        {errorCount > 0 && importableRows.length > 0 && (
          <div style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 8, padding: '10px 14px', marginBottom: 12, fontSize: 13, color: 'var(--fail)' }}>
            {errorCount} row{errorCount !== 1 ? 's' : ''} are missing a model number and will be skipped.
          </div>
        )}
        {warningCount > 0 && (
          <div style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: 8, padding: '10px 14px', marginBottom: 12, fontSize: 13, color: '#92400e' }}>
            {warningCount} row{warningCount !== 1 ? 's' : ''} had unrecognized values that were auto-corrected or defaulted — review ⚠ rows below.
          </div>
        )}
        {importableRows.length === 0 && (
          <div style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 8, padding: '10px 14px', marginBottom: 12, fontSize: 13, color: 'var(--fail)' }}>
            No importable rows found. Go back and check your input.
          </div>
        )}
        <PreviewTable results={results} />
      </div>
    );
  }

  // ── Input step ────────────────────────────────────────────────────────────
  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <div>
          <button className="btn btn-ghost btn-sm" onClick={onBack} style={{ marginBottom: 8 }}>← Back to Catalog</button>
          <h1>Import Products</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 14, margin: 0 }}>
            Add a single product from Claude chat output, or bulk import from a CSV file.
          </p>
        </div>
      </div>

      {/* Field reference downloads — always visible */}
      <div className="spec-card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, marginBottom: 4 }}>Field Reference &amp; Claude Prompt</div>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6 }}>
              Select a category, copy the prompt into Claude chat, paste the product listing, and attach the
              field reference. Claude will search for the model, analyze all fields and capabilities, confirm
              findings with you, then output JSON to paste below.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8, flexShrink: 0, flexWrap: 'wrap', alignItems: 'center' }}>
            <select value={refCategory} onChange={e => { setRefCategory(e.target.value); setPromptOpen(false); }} style={{ fontSize: 13, padding: '5px 8px' }}>
              {Object.keys(SPEC_SCHEMA).map(cat => (
                <option key={cat} value={cat}>{cat.charAt(0).toUpperCase() + cat.slice(1)}</option>
              ))}
            </select>
            <button className="btn btn-primary" onClick={copyPrompt} style={{ minWidth: 110 }}>
              {copied ? '✓ Copied!' : '⎘ Copy Prompt'}
            </button>
            <button className="btn btn-secondary" onClick={() => setPromptOpen(o => !o)}>
              {promptOpen ? 'Hide Prompt' : 'View Prompt'}
            </button>
            <button className="btn btn-secondary" onClick={() => downloadFieldReference(refCategory)}>↓ Field Reference</button>
            <button className="btn btn-ghost" onClick={downloadTemplate}>↓ CSV Template</button>
          </div>
        </div>

        {promptOpen && (
          <div style={{ marginTop: 14, borderTop: '1px solid var(--border)', paddingTop: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Claude Chat Prompt — {refCategory.charAt(0).toUpperCase() + refCategory.slice(1)}
              </span>
              <button className="btn btn-sm btn-primary" onClick={copyPrompt}>{copied ? '✓ Copied!' : '⎘ Copy'}</button>
            </div>
            <pre style={{
              background: 'var(--bg)',
              border: '1px solid var(--border)',
              borderRadius: 8,
              padding: '14px 16px',
              fontSize: 12,
              lineHeight: 1.6,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              margin: 0,
              color: 'var(--text)',
              maxHeight: 400,
              overflowY: 'auto',
            }}>
              {buildPrompt(refCategory)}
            </pre>
          </div>
        )}
      </div>

      {/* Mode tabs */}
      <div className="product-tabs" style={{ marginBottom: 16 }}>
        <button className={`product-tab${mode === 'single' ? ' active' : ''}`} onClick={() => { setMode('single'); reset(); }}>
          Single Item (JSON)
        </button>
        <button className={`product-tab${mode === 'bulk' ? ' active' : ''}`} onClick={() => { setMode('bulk'); reset(); }}>
          Bulk Import (CSV)
        </button>
      </div>

      {mode === 'single' && (
        <div className="spec-card">
          <div style={{ fontWeight: 700, marginBottom: 4 }}>Paste Claude's JSON Output</div>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '0 0 12px' }}>
            After Claude confirms its findings, ask it to output a JSON object. Paste it here — code fences are fine to include.
          </p>
          <textarea
            value={jsonInput}
            onChange={e => { setJsonInput(e.target.value); setJsonError(''); }}
            placeholder={`{\n  "modelNumber": "WCO3ML",\n  "name": "Outdoor Cam Pro",\n  "manufacturer": "Wyze",\n  "category": "camera",\n  "productType": "competitor",\n  "msrp": 39.99\n}`}
            rows={12}
            style={{ width: '100%', fontFamily: 'monospace', fontSize: 13, resize: 'vertical' }}
          />
          {jsonError && <div style={{ color: 'var(--fail)', fontSize: 13, marginTop: 8 }}>{jsonError}</div>}
          <div style={{ marginTop: 12, display: 'flex', justifyContent: 'flex-end' }}>
            <button className="btn btn-primary" disabled={!jsonInput.trim()} onClick={handleJsonPreview}>
              Preview →
            </button>
          </div>
        </div>
      )}

      {mode === 'bulk' && (
        <div className="spec-card">
          <div style={{ fontWeight: 700, marginBottom: 12 }}>Upload CSV File</div>
          <div
            style={{
              border: `2px dashed ${dragOver ? 'var(--primary)' : 'var(--border)'}`,
              borderRadius: 10, padding: '40px 24px', textAlign: 'center', cursor: 'pointer',
              transition: 'border-color 0.15s, background 0.15s',
              background: dragOver ? 'rgba(99,102,241,0.04)' : 'transparent',
            }}
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileRef.current?.click()}
          >
            <div style={{ fontSize: 32, marginBottom: 10 }}>📂</div>
            <div style={{ fontWeight: 600, marginBottom: 6 }}>Drop your CSV here or click to browse</div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>.csv files only · use the CSV Template above as your starting point</div>
            <input ref={fileRef} type="file" accept=".csv" style={{ display: 'none' }} onChange={handleFile} />
          </div>
        </div>
      )}
    </div>
  );
}
