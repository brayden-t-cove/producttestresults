import { useState, useRef } from 'react';
import * as XLSX from 'xlsx';

// Known column aliases → internal field
const COLUMN_ALIASES = {
  id:              ['id', 'test id', 'test_id', 'case id', 'case_id', 'no', '#', 'num'],
  title:           ['test item', 'title', 'name', 'test name', 'test case', 'case', 'description', 'summary', 'item'],
  expectedResult:  ['expected result', 'expected', 'expected behavior', 'expected outcome', 'acceptance criteria', 'criteria', 'result'],
  priority:        ['priority', 'p', 'pri', 'severity', 'level', 'rank'],
  notes:           ['notes', 'note', 'comments', 'comment', 'remarks'],
  status:          ['test result', 'result', 'status', 'pass/fail', 'outcome'],
};

const PRIORITY_MAP = {
  p0: 'P0', critical: 'P0',
  p1: 'P1', high: 'P1',
  p2: 'P2', medium: 'P2',
  p3: 'P3', low: 'P3',
};

function autoMap(headers) {
  const mapping = {};
  headers.forEach((h, i) => {
    const normalized = h.toLowerCase().trim();
    for (const [field, aliases] of Object.entries(COLUMN_ALIASES)) {
      if (!mapping[field] && aliases.some(a => normalized === a || normalized.includes(a))) {
        mapping[field] = i;
        break;
      }
    }
  });
  return mapping;
}

function parseFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const wb = XLSX.read(data, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
        if (rows.length < 2) { reject(new Error('File must have a header row and at least one data row.')); return; }
        const headers = rows[0].map(h => String(h).trim());
        const dataRows = rows.slice(1).filter(r => r.some(c => String(c).trim() !== ''));
        resolve({ headers, dataRows });
      } catch (err) {
        reject(new Error('Could not parse file. Make sure it is a valid .xlsx or .csv file.'));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file.'));
    reader.readAsArrayBuffer(file);
  });
}

function buildTestCases(headers, dataRows, mapping) {
  return dataRows.map((row, i) => {
    const get = (field) => {
      const idx = mapping[field];
      return idx !== undefined ? String(row[idx] ?? '').trim() : '';
    };
    const rawPriority = get('priority').toLowerCase();
    const priority = PRIORITY_MAP[rawPriority] || (get('priority') || undefined);
    const rawStatus = get('status').toLowerCase();
    const status = rawStatus === 'pass' ? 'pass' : rawStatus === 'fail' ? 'fail' : 'pending';
    return {
      id: crypto.randomUUID(),
      templateId: get('id') || `custom-${i + 1}`,
      testNumber: get('id') || String(i + 1),
      title: get('title') || `Test ${i + 1}`,
      expectedResult: get('expectedResult'),
      priority,
      notes: get('notes') || '',
      status,
      capabilityId: 'custom',
    };
  });
}

// ── Import mode ───────────────────────────────────────────────────────────────

function ImportMode({ onTestCasesReady }) {
  const [step, setStep] = useState('upload'); // upload | mapping | preview
  const [headers, setHeaders] = useState([]);
  const [dataRows, setDataRows] = useState([]);
  const [mapping, setMapping] = useState({});
  const [fileName, setFileName] = useState('');
  const [error, setError] = useState('');
  const fileRef = useRef(null);

  async function handleFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    setError('');
    setFileName(file.name);
    try {
      const { headers: h, dataRows: d } = await parseFile(file);
      const autoMapped = autoMap(h);
      setHeaders(h);
      setDataRows(d);
      setMapping(autoMapped);
      setStep('mapping');
    } catch (err) {
      setError(err.message);
    }
    e.target.value = '';
  }

  function setMappingField(field, colIndex) {
    setMapping(prev => {
      const next = { ...prev };
      if (colIndex === '') { delete next[field]; return next; }
      next[field] = parseInt(colIndex);
      return next;
    });
  }

  function handleConfirmMapping() {
    if (mapping.title === undefined) { setError('You must map at least a "Test Item / Title" column.'); return; }
    setError('');
    setStep('preview');
  }

  const FIELDS = [
    { key: 'id',             label: 'Test ID',            required: false },
    { key: 'title',          label: 'Test Item / Title',  required: true },
    { key: 'expectedResult', label: 'Expected Result',    required: false },
    { key: 'priority',       label: 'Priority',           required: false },
    { key: 'notes',          label: 'Notes',              required: false },
    { key: 'status',         label: 'Test Result',        required: false },
  ];

  const preview = step === 'preview' ? buildTestCases(headers, dataRows, mapping) : [];

  if (step === 'upload') {
    return (
      <div>
        <input ref={fileRef} type="file" accept=".xlsx,.csv,.xls" style={{ display: 'none' }} onChange={handleFile} />
        <div
          style={{
            border: '2px dashed var(--border)', borderRadius: 8, padding: '32px 20px',
            textAlign: 'center', cursor: 'pointer', background: 'var(--card)',
          }}
          onClick={() => fileRef.current?.click()}
          onDragOver={e => e.preventDefault()}
          onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) { const dt = new DataTransfer(); dt.items.add(f); fileRef.current.files = dt.files; handleFile({ target: { files: [f], value: '' } }); } }}
        >
          <div style={{ fontSize: 32, marginBottom: 8 }}>📂</div>
          <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>Drop your file here or click to browse</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Supports .xlsx, .xls, .csv</div>
        </div>
        {error && <div className="error-msg" style={{ marginTop: 8 }}>{error}</div>}
      </div>
    );
  }

  if (step === 'mapping') {
    return (
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>📄 {fileName}</span>
          <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>· {dataRows.length} rows</span>
          <button className="btn btn-ghost btn-sm" style={{ marginLeft: 'auto', fontSize: 12 }} onClick={() => { setStep('upload'); setError(''); }}>
            ← Change file
          </button>
        </div>

        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>
          Column Mapping
          <span style={{ fontWeight: 400, color: 'var(--text-muted)', marginLeft: 6, fontSize: 12 }}>
            We auto-detected these mappings — adjust if needed
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {FIELDS.map(f => (
            <div key={f.key} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 160, fontSize: 13, fontWeight: f.required ? 600 : 400 }}>
                {f.label}{f.required && <span style={{ color: 'var(--fail)', marginLeft: 2 }}>*</span>}
              </div>
              <select
                value={mapping[f.key] !== undefined ? mapping[f.key] : ''}
                onChange={e => setMappingField(f.key, e.target.value)}
                style={{ flex: 1, fontSize: 13 }}
              >
                <option value="">— not mapped —</option>
                {headers.map((h, i) => <option key={i} value={i}>{h}</option>)}
              </select>
              {mapping[f.key] !== undefined && (
                <span style={{ fontSize: 11, color: 'var(--pass)', flexShrink: 0 }}>✓ auto</span>
              )}
            </div>
          ))}
        </div>

        {/* Mini data preview */}
        <div style={{ marginTop: 14, background: 'var(--card)', borderRadius: 6, border: '1px solid var(--border)', overflowX: 'auto' }}>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', padding: '6px 10px', borderBottom: '1px solid var(--border)' }}>
            First 3 rows of your file
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
            <thead>
              <tr>{headers.map((h, i) => <th key={i} style={{ padding: '5px 8px', textAlign: 'left', borderBottom: '1px solid var(--border)', color: 'var(--text-muted)', fontWeight: 600 }}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {dataRows.slice(0, 3).map((row, ri) => (
                <tr key={ri}>
                  {headers.map((_, ci) => (
                    <td key={ci} style={{ padding: '4px 8px', borderBottom: '1px solid var(--border)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {String(row[ci] ?? '').slice(0, 80)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {error && <div className="error-msg" style={{ marginTop: 8 }}>{error}</div>}

        <button
          type="button"
          className="btn btn-primary"
          style={{ marginTop: 14, width: '100%' }}
          onClick={handleConfirmMapping}
        >
          Preview {dataRows.length} Test Cases →
        </button>
      </div>
    );
  }

  // Preview step
  const p0 = preview.filter(t => t.priority === 'P0').length;
  const p1 = preview.filter(t => t.priority === 'P1').length;
  const p2 = preview.filter(t => t.priority === 'P2').length;
  const noPri = preview.filter(t => !t.priority).length;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <span style={{ fontSize: 13, fontWeight: 600 }}>{preview.length} test cases ready</span>
        {p0 > 0 && <span style={{ fontSize: 11, background: 'var(--fail-dim, #fee2e2)', color: 'var(--fail)', borderRadius: 10, padding: '2px 8px', fontWeight: 700 }}>P0 ×{p0}</span>}
        {p1 > 0 && <span style={{ fontSize: 11, background: 'var(--warn-dim, #fef3c7)', color: 'var(--warn, #d97706)', borderRadius: 10, padding: '2px 8px', fontWeight: 700 }}>P1 ×{p1}</span>}
        {p2 > 0 && <span style={{ fontSize: 11, background: 'var(--primary-dim)', color: 'var(--primary)', borderRadius: 10, padding: '2px 8px', fontWeight: 700 }}>P2 ×{p2}</span>}
        {noPri > 0 && <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>+{noPri} unprioritized</span>}
        <button className="btn btn-ghost btn-sm" style={{ marginLeft: 'auto', fontSize: 12 }} onClick={() => setStep('mapping')}>
          ← Edit mapping
        </button>
      </div>

      <div style={{ maxHeight: 300, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 6 }}>
        {preview.map((tc, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '9px 12px', borderBottom: i < preview.length - 1 ? '1px solid var(--border)' : 'none', fontSize: 13 }}>
            <span style={{ color: 'var(--text-muted)', fontSize: 11, flexShrink: 0, marginTop: 2, minWidth: 40 }}>{tc.testNumber}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600 }}>{tc.title}</div>
              {tc.expectedResult && <div style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 2, lineHeight: 1.4 }}>{tc.expectedResult.slice(0, 120)}{tc.expectedResult.length > 120 ? '…' : ''}</div>}
            </div>
            {tc.priority && (
              <span style={{
                fontSize: 11, fontWeight: 700, borderRadius: 10, padding: '2px 8px', flexShrink: 0,
                background: tc.priority === 'P0' ? 'var(--fail-dim, #fee2e2)' : tc.priority === 'P1' ? 'var(--warn-dim, #fef3c7)' : 'var(--primary-dim)',
                color: tc.priority === 'P0' ? 'var(--fail)' : tc.priority === 'P1' ? 'var(--warn, #d97706)' : 'var(--primary)',
              }}>{tc.priority}</span>
            )}
          </div>
        ))}
      </div>

      <button
        type="button"
        className="btn btn-primary"
        style={{ marginTop: 14, width: '100%' }}
        onClick={() => onTestCasesReady(preview)}
      >
        Use These {preview.length} Test Cases ✓
      </button>
    </div>
  );
}

// ── Manual entry mode ─────────────────────────────────────────────────────────

function ManualMode({ onTestCasesReady }) {
  const [rows, setRows] = useState([{ id: crypto.randomUUID(), testNumber: '1', title: '', expectedResult: '', priority: '', notes: '' }]);

  function addRow() {
    setRows(prev => [...prev, { id: crypto.randomUUID(), testNumber: String(prev.length + 1), title: '', expectedResult: '', priority: '', notes: '' }]);
  }

  function updateRow(id, field, value) {
    setRows(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r));
  }

  function removeRow(id) {
    setRows(prev => prev.filter(r => r.id !== id).map((r, i) => ({ ...r, testNumber: String(i + 1) })));
  }

  function handleConfirm() {
    const valid = rows.filter(r => r.title.trim());
    if (valid.length === 0) return;
    onTestCasesReady(valid.map(r => ({
      ...r,
      templateId: r.id,
      status: 'pending',
      capabilityId: 'custom',
      priority: r.priority || undefined,
    })));
  }

  const hasContent = rows.some(r => r.title.trim());

  return (
    <div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {rows.map((row, i) => (
          <div key={row.id} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 6, padding: '10px 12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <span style={{ fontSize: 12, color: 'var(--text-muted)', minWidth: 20 }}>{row.testNumber}</span>
              <input
                type="text"
                placeholder="Test item / what to test *"
                value={row.title}
                onChange={e => updateRow(row.id, 'title', e.target.value)}
                style={{ flex: 1, fontSize: 13 }}
              />
              <select
                value={row.priority}
                onChange={e => updateRow(row.id, 'priority', e.target.value)}
                style={{ width: 72, fontSize: 13 }}
              >
                <option value="">Pri</option>
                <option>P0</option>
                <option>P1</option>
                <option>P2</option>
                <option>P3</option>
              </select>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => removeRow(row.id)}
                style={{ padding: '2px 6px', fontSize: 13, color: 'var(--text-muted)', flexShrink: 0 }}
                disabled={rows.length === 1}
              >×</button>
            </div>
            <textarea
              placeholder="Expected result / acceptance criteria"
              value={row.expectedResult}
              onChange={e => updateRow(row.id, 'expectedResult', e.target.value)}
              rows={2}
              style={{ fontSize: 12, resize: 'vertical' }}
            />
          </div>
        ))}
      </div>

      <button type="button" className="btn btn-ghost btn-sm" style={{ marginTop: 8, width: '100%' }} onClick={addRow}>
        + Add Test Case
      </button>

      <button
        type="button"
        className="btn btn-primary"
        style={{ marginTop: 10, width: '100%' }}
        onClick={handleConfirm}
        disabled={!hasContent}
      >
        Use These {rows.filter(r => r.title.trim()).length} Test Cases ✓
      </button>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function CustomSessionBuilder({ onTestCasesReady, onClear }) {
  const [mode, setMode] = useState(null); // null | 'import' | 'manual'
  const [confirmedCases, setConfirmedCases] = useState(null);

  function handleReady(cases) {
    setConfirmedCases(cases);
    onTestCasesReady(cases);
  }

  function handleClear() {
    setMode(null);
    setConfirmedCases(null);
    onClear?.();
  }

  if (confirmedCases) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: 'var(--pass-dim, #dcfce7)', border: '1px solid var(--pass)', borderRadius: 6 }}>
        <span style={{ color: 'var(--pass)', fontSize: 16 }}>✓</span>
        <span style={{ fontSize: 13, fontWeight: 600 }}>{confirmedCases.length} custom test cases loaded</span>
        <button className="btn btn-ghost btn-sm" style={{ marginLeft: 'auto', fontSize: 12 }} onClick={handleClear}>Change</button>
      </div>
    );
  }

  if (!mode) {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <button
          type="button"
          className="btn btn-ghost"
          style={{ padding: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, height: 'auto', border: '1px solid var(--border)', borderRadius: 8 }}
          onClick={() => setMode('import')}
        >
          <span style={{ fontSize: 24 }}>📂</span>
          <span style={{ fontWeight: 600, fontSize: 13 }}>Import File</span>
          <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 400 }}>.xlsx, .xls, .csv</span>
        </button>
        <button
          type="button"
          className="btn btn-ghost"
          style={{ padding: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, height: 'auto', border: '1px solid var(--border)', borderRadius: 8 }}
          onClick={() => setMode('manual')}
        >
          <span style={{ fontSize: 24 }}>✏️</span>
          <span style={{ fontWeight: 600, fontSize: 13 }}>Manual Entry</span>
          <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 400 }}>Build a list by hand</span>
        </button>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 4, marginBottom: 14 }}>
        {['import', 'manual'].map(m => (
          <button
            key={m}
            type="button"
            className={`btn btn-sm ${mode === m ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setMode(m)}
          >
            {m === 'import' ? '📂 Import File' : '✏️ Manual Entry'}
          </button>
        ))}
      </div>
      {mode === 'import' ? <ImportMode onTestCasesReady={handleReady} /> : <ManualMode onTestCasesReady={handleReady} />}
    </div>
  );
}
