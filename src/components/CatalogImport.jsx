import { useState, useRef } from 'react';

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

function validateRow(row, idx) {
  const errors = [];
  if (!row.modelNumber?.trim()) errors.push('modelNumber is required');
  if (row.category && !['hub', 'touchpad', 'camera', 'sensor', 'app'].includes(row.category)) {
    errors.push(`category "${row.category}" is not valid — use: hub, touchpad, camera, sensor, app`);
  }
  if (row.productType && !['production', 'sample', 'prototype', 'competitor'].includes(row.productType)) {
    errors.push(`productType "${row.productType}" is not valid`);
  }
  if (row.status && !['active', 'discontinued', 'under-evaluation', 'in-development'].includes(row.status)) {
    errors.push(`status "${row.status}" is not valid`);
  }
  if (row.msrp && isNaN(parseFloat(row.msrp))) {
    errors.push(`msrp "${row.msrp}" must be a number`);
  }
  return errors;
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

function PreviewTable({ parsed, errors }) {
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
            <th style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 600, color: 'var(--text-muted)' }}>Issues</th>
          </tr>
        </thead>
        <tbody>
          {parsed.map((row, i) => {
            const rowErrors = errors[i] || [];
            const hasError = rowErrors.length > 0;
            const typeStyle = TYPE_COLORS[row.productType] || TYPE_COLORS.production;
            const dotColor = STATUS_DOT[row.status] || STATUS_DOT.active;
            return (
              <tr key={i} style={{ borderBottom: '1px solid var(--border)', background: hasError ? 'rgba(239,68,68,0.04)' : 'transparent' }}>
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
                <td style={{ padding: '7px 10px' }}>
                  {hasError ? (
                    <span style={{ color: 'var(--fail)', fontSize: 12 }}>{rowErrors.join('; ')}</span>
                  ) : (
                    <span style={{ color: 'var(--pass)', fontSize: 12 }}>✓</span>
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

// ── Main component ────────────────────────────────────────────────────────────

export default function CatalogImport({ onBack, onImported }) {
  const [step, setStep] = useState('upload'); // upload | preview | done
  const [parsed, setParsed] = useState([]);
  const [rowErrors, setRowErrors] = useState([]);
  const [fileName, setFileName] = useState('');
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef();

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

  function processFile(file) {
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = e => {
      const text = e.target.result;
      const { rows } = parseCsv(text);
      if (rows.length === 0) return;
      const errors = rows.map((row, i) => validateRow(row, i));
      setParsed(rows);
      setRowErrors(errors);
      setStep('preview');
    };
    reader.readAsText(file);
  }

  function handleFile(e) {
    processFile(e.target.files?.[0]);
  }

  function handleDrop(e) {
    e.preventDefault();
    setDragOver(false);
    processFile(e.dataTransfer.files?.[0]);
  }

  const validRows = parsed.filter((_, i) => rowErrors[i]?.length === 0);
  const errorRows = parsed.filter((_, i) => rowErrors[i]?.length > 0);

  async function handleImport() {
    setImporting(true);
    try {
      const res = await fetch('/api/catalog/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows: validRows }),
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
              {importResult?.imported ?? validRows.length} product{(importResult?.imported ?? validRows.length) !== 1 ? 's' : ''} added to the catalog.
              {importResult?.skipped > 0 && ` ${importResult.skipped} skipped (duplicate model numbers).`}
            </p>
          )}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 24 }}>
            <button className="btn btn-ghost" onClick={() => { setStep('upload'); setParsed([]); setRowErrors([]); setFileName(''); }}>Import Another File</button>
            <button className="btn btn-primary" onClick={onBack}>Go to Catalog</button>
          </div>
        </div>
      </div>
    );
  }

  if (step === 'preview') {
    return (
      <div className="dashboard">
        <div className="dashboard-header">
          <div>
            <button className="btn btn-ghost btn-sm" onClick={() => setStep('upload')} style={{ marginBottom: 8 }}>← Back</button>
            <h1>Review Import</h1>
            <p style={{ color: 'var(--text-muted)', fontSize: 14, margin: 0 }}>
              {fileName} · {parsed.length} row{parsed.length !== 1 ? 's' : ''}
              {errorRows.length > 0 && <span style={{ color: 'var(--fail)', marginLeft: 8 }}>· {errorRows.length} with errors (will be skipped)</span>}
              {validRows.length > 0 && <span style={{ color: 'var(--pass)', marginLeft: 8 }}>· {validRows.length} ready to import</span>}
            </p>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <button className="btn btn-ghost" onClick={() => { setStep('upload'); setParsed([]); setRowErrors([]); }}>Start Over</button>
            <button
              className="btn btn-primary"
              disabled={validRows.length === 0 || importing}
              onClick={handleImport}
            >
              {importing ? 'Importing...' : `Import ${validRows.length} Product${validRows.length !== 1 ? 's' : ''}`}
            </button>
          </div>
        </div>

        {errorRows.length > 0 && validRows.length > 0 && (
          <div style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#92400e' }}>
            {errorRows.length} row{errorRows.length !== 1 ? 's' : ''} have validation errors and will be skipped. Fix them in your CSV and re-upload, or proceed to import the {validRows.length} valid row{validRows.length !== 1 ? 's' : ''}.
          </div>
        )}
        {validRows.length === 0 && (
          <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: 'var(--fail)' }}>
            All rows have errors. Please fix your CSV and re-upload.
          </div>
        )}

        <PreviewTable parsed={parsed} errors={rowErrors} />
      </div>
    );
  }

  // Upload step
  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <div>
          <button className="btn btn-ghost btn-sm" onClick={onBack} style={{ marginBottom: 8 }}>← Back to Catalog</button>
          <h1>Bulk Catalog Import</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 14, margin: 0 }}>
            Download the template, fill it out, and re-upload to add products in bulk.
          </p>
        </div>
      </div>

      {/* Step 1 — download template */}
      <div className="spec-card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ fontWeight: 700, marginBottom: 4 }}>Step 1 — Download Template</div>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6 }}>
              The CSV includes example rows and field hints. Open it in Excel, Google Sheets, or any spreadsheet app.
              Lines starting with <code>#</code> are ignored.
            </p>
          </div>
          <button className="btn btn-secondary" onClick={downloadTemplate} style={{ flexShrink: 0 }}>
            ↓ Download Template
          </button>
        </div>

        {/* Field reference */}
        <div style={{ marginTop: 16, borderTop: '1px solid var(--border)', paddingTop: 14 }}>
          <div style={{ fontWeight: 600, fontSize: 12, color: 'var(--text-muted)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Field Reference</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 6 }}>
            {TEMPLATE_HEADERS.map(h => (
              <div key={h} style={{ fontSize: 12, display: 'flex', gap: 6 }}>
                <code style={{ fontWeight: 600, color: 'var(--primary)', flexShrink: 0 }}>{h}</code>
                <span style={{ color: 'var(--text-muted)' }}>{TEMPLATE_HINTS[h]}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Step 2 — upload */}
      <div className="spec-card">
        <div style={{ fontWeight: 700, marginBottom: 12 }}>Step 2 — Upload Your CSV</div>
        <div
          style={{
            border: `2px dashed ${dragOver ? 'var(--primary)' : 'var(--border)'}`,
            borderRadius: 10,
            padding: '40px 24px',
            textAlign: 'center',
            cursor: 'pointer',
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
          <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>.csv files only</div>
          <input ref={fileRef} type="file" accept=".csv" style={{ display: 'none' }} onChange={handleFile} />
        </div>
      </div>
    </div>
  );
}
