import { useState, useRef, useEffect } from 'react';
import { CATEGORY_LABELS } from '../data/capabilities.js';
import { BASELINE_TESTS, TEST_LIBRARY } from '../data/testLibrary.js';
import { createSession, updateSession, downloadCsvTemplate, importCsv, getFirmwares, addFirmware } from '../lib/api.js';

const CATEGORY_ICONS = {
  hub: '🏠',
  touchpad: '⌨️',
  camera: '📷',
  sensor: '📡',
  app: '📱',
};

const SESSION_TYPES = [
  { id: 'e2e', label: 'E2E', icon: '🔄', description: 'Full end-to-end product testing' },
  { id: 'reproduction', label: 'Issue Reproduction', icon: '🐛', description: 'Reproduce and document reported bugs' },
  { id: 'regression', label: 'Regression', icon: '🔁', description: 'Verify previously fixed issues remain resolved' },
  { id: 'feature', label: 'Feature / Targeted', icon: '🎯', description: 'Test a specific feature or acceptance criteria' },
];

const SESSION_TYPE_LABELS = {
  e2e: 'E2E Session',
  reproduction: 'Reproduction Session',
  regression: 'Regression Session',
  feature: 'Feature Session',
};

function generateTestCases(product) {
  const seen = new Set();
  const tests = [];

  function addTest(t) {
    if (!seen.has(t.id)) {
      seen.add(t.id);
      tests.push({
        ...t,
        id: crypto.randomUUID(),
        templateId: t.id,
        status: 'pending',
        notes: '',
      });
    }
  }

  const baselines = BASELINE_TESTS[product.category] || [];
  baselines.forEach(addTest);

  (product.capabilities || []).forEach(capId => {
    const capTests = TEST_LIBRARY[capId] || [];
    capTests.forEach(addTest);
  });

  return tests;
}

export default function SessionStart({ catalog, onBack, onCreated, onGoToCatalog }) {
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [sessionType, setSessionType] = useState('e2e');
  const [firmware, setFirmware] = useState('');
  const [addingFirmware, setAddingFirmware] = useState(false);
  const [newFirmwareVersion, setNewFirmwareVersion] = useState('');
  const [savedFirmwares, setSavedFirmwares] = useState([]);
  const newFirmwareInputRef = useRef(null);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState('');
  const [error, setError] = useState('');
  const [csvPreview, setCsvPreview] = useState(null);
  const [csvError, setCsvError] = useState('');
  const fileInputRef = useRef(null);

  useEffect(() => {
    setFirmware('');
    setAddingFirmware(false);
    setNewFirmwareVersion('');
    setSavedFirmwares([]);
    if (selectedProduct) {
      getFirmwares(null, selectedProduct.id).then(setSavedFirmwares).catch(() => {});
    }
  }, [selectedProduct]);

  useEffect(() => {
    if (addingFirmware) newFirmwareInputRef.current?.focus();
  }, [addingFirmware]);

  async function handleAddFirmware() {
    const version = newFirmwareVersion.trim();
    if (!version || !selectedProduct) return;
    try {
      const entry = await addFirmware(selectedProduct.id, version);
      setSavedFirmwares(prev => [...prev.filter(f => f.id !== entry.id), entry]);
      setFirmware(entry.version);
    } catch {
      setFirmware(version);
    }
    setAddingFirmware(false);
    setNewFirmwareVersion('');
  }

  async function handleCsvUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    setCsvError('');
    setCsvPreview(null);
    try {
      const text = await file.text();
      const result = await importCsv(text, sessionType);
      if (result.issues) {
        setCsvPreview({ count: result.issues.length, rows: result.issues.slice(0, 3), type: 'issues', data: result.issues });
      } else if (result.testCases) {
        setCsvPreview({ count: result.testCases.length, rows: result.testCases.slice(0, 3), type: 'testCases', data: result.testCases });
      }
    } catch (err) {
      setCsvError(err.message || 'CSV import failed');
    }
    e.target.value = '';
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!selectedProduct) {
      setError('Please select a product from your catalog.');
      return;
    }
    setError('');
    setLoading(true);
    setLoadingMsg('Creating session...');

    try {
      const session = await createSession({
        productId: selectedProduct.id,
        productName: selectedProduct.name,
        category: selectedProduct.category,
        catalogId: selectedProduct.id,
        firmware,
        notes,
        type: sessionType,
      });

      let testCases;
      let issues = session.issues || [];

      if (csvPreview) {
        if (csvPreview.type === 'testCases') {
          testCases = csvPreview.data;
        } else {
          issues = csvPreview.data;
          testCases = generateTestCases(selectedProduct);
        }
      } else {
        testCases = generateTestCases(selectedProduct);
      }

      const updated = await updateSession(session.id, { testCases, issues });
      onCreated(updated);
    } catch (err) {
      setError(err.message || 'Failed to create session');
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="session-start">
        <div className="ai-loading">
          <div className="spinner spinner-lg" />
          <p>{loadingMsg}</p>
          {selectedProduct && (
            <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>{selectedProduct.name}</p>
          )}
        </div>
      </div>
    );
  }

  const previewHeaders = csvPreview
    ? csvPreview.rows.length > 0
      ? Object.keys(csvPreview.rows[0]).filter(k => k !== 'id' && k !== 'status')
      : []
    : [];

  return (
    <div className="session-start">
      <div className="session-start-header">
        <button className="btn btn-ghost btn-sm" onClick={onBack} style={{ marginBottom: 12 }}>
          ← Back
        </button>
        <h1>New Testing Session</h1>
        <p>Select a product from your catalog, choose a session type, then start testing.</p>
      </div>

      <form onSubmit={handleSubmit}>
        {error && <div className="error-msg">{error}</div>}

        {/* Product Picker */}
        <div className="form-group">
          <label>Select Product</label>
          {catalog.length === 0 ? (
            <div className="error-msg" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              No products in catalog.{' '}
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={onGoToCatalog}
              >
                Add a product first
              </button>
            </div>
          ) : (
            <div className="product-picker-grid">
              {catalog.map(product => (
                <div
                  key={product.id}
                  className={`product-picker-card ${selectedProduct?.id === product.id ? 'selected' : ''}`}
                  onClick={() => setSelectedProduct(product)}
                >
                  <span style={{ fontSize: 22, lineHeight: 1 }}>{CATEGORY_ICONS[product.category] || '📦'}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text)' }}>{product.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                      {CATEGORY_LABELS[product.category] || product.category}
                      {product.manufacturer ? ` · ${product.manufacturer}` : ''}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 2 }}>
                      {(product.capabilities || []).length} capabilities → {countTests(product)} test cases
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Session Type Selector */}
        <div className="form-group">
          <label>Session Type</label>
          <div className="session-type-cards">
            {SESSION_TYPES.map(st => (
              <div
                key={st.id}
                className={`session-type-card ${sessionType === st.id ? 'selected' : ''}`}
                onClick={() => {
                  setSessionType(st.id);
                  setCsvPreview(null);
                  setCsvError('');
                }}
              >
                <span className="session-type-icon">{st.icon}</span>
                <span className="session-type-label">{st.label}</span>
                <span className="session-type-desc">{st.description}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Firmware */}
        {selectedProduct && (
          <div className="form-group">
            <label>Firmware Version</label>
            {!addingFirmware ? (
              <select value={firmware} onChange={e => {
                if (e.target.value === '__add__') {
                  setAddingFirmware(true);
                  setFirmware('');
                } else {
                  setFirmware(e.target.value);
                }
              }}>
                <option value="">— Select or add firmware —</option>
                {savedFirmwares.map(f => (
                  <option key={f.id} value={f.version}>{f.version}</option>
                ))}
                <option value="__add__">+ Add new firmware version...</option>
              </select>
            ) : (
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  ref={newFirmwareInputRef}
                  type="text"
                  placeholder="e.g. 3.4.2-beta, 2024.11.01"
                  value={newFirmwareVersion}
                  onChange={e => setNewFirmwareVersion(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') { e.preventDefault(); handleAddFirmware(); }
                    if (e.key === 'Escape') { setAddingFirmware(false); setNewFirmwareVersion(''); }
                  }}
                  style={{ flex: 1 }}
                />
                <button type="button" className="btn btn-primary btn-sm" onClick={handleAddFirmware} disabled={!newFirmwareVersion.trim()}>Save</button>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setAddingFirmware(false); setNewFirmwareVersion(''); }}>Cancel</button>
              </div>
            )}
          </div>
        )}

        {/* Session Notes */}
        <div className="form-group">
          <label>Session Notes</label>
          <textarea
            placeholder="Any context for this session — build notes, known issues, special focus areas..."
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={3}
          />
        </div>

        {/* CSV Section */}
        <div className="csv-section">
          <div className="csv-section-label">CSV Import (optional — overrides auto-generated test cases)</div>
          <div className="csv-buttons-row">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => downloadCsvTemplate(sessionType)}
            >
              ↓ Download Template
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => fileInputRef.current?.click()}
            >
              ↑ Upload CSV
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              style={{ display: 'none' }}
              onChange={handleCsvUpload}
            />
          </div>

          {csvError && (
            <div className="error-msg" style={{ marginTop: 8 }}>{csvError}</div>
          )}

          {csvPreview && (
            <div className="csv-preview">
              <div className="csv-preview-summary">
                ✓ {csvPreview.count} {csvPreview.type === 'issues' ? 'issues' : 'test cases'} loaded from CSV
                {csvPreview.count > 3 && ` (showing first 3)`}
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table className="csv-preview-table">
                  <thead>
                    <tr>
                      {previewHeaders.slice(0, 4).map(h => <th key={h}>{h}</th>)}
                      {previewHeaders.length > 4 && <th>...</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {csvPreview.rows.map((row, i) => (
                      <tr key={i}>
                        {previewHeaders.slice(0, 4).map(h => (
                          <td key={h}>{String(row[h] ?? '').slice(0, 50)}{String(row[h] ?? '').length > 50 ? '…' : ''}</td>
                        ))}
                        {previewHeaders.length > 4 && <td>…</td>}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {csvPreview.count > 3 && (
                <div className="csv-preview-more">… and {csvPreview.count - 3} more</div>
              )}
            </div>
          )}
        </div>

        <button
          type="submit"
          className="btn btn-primary btn-lg"
          style={{ width: '100%' }}
          disabled={catalog.length === 0}
        >
          Start {SESSION_TYPE_LABELS[sessionType]}
        </button>
      </form>
    </div>
  );
}

function countTests(product) {
  const seen = new Set();
  const baselines = BASELINE_TESTS[product.category] || [];
  baselines.forEach(t => seen.add(t.id));
  (product.capabilities || []).forEach(capId => {
    (TEST_LIBRARY[capId] || []).forEach(t => seen.add(t.id));
  });
  return seen.size;
}
