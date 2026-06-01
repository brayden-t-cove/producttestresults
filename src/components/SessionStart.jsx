import { useState, useRef, useEffect } from 'react';
import { PRODUCTS, CATEGORY_LABELS } from '../data/products.js';
import { createSession, aiPopulateTests, downloadCsvTemplate, importCsv, getDevices, addDevice, getFirmwares, addFirmware } from '../lib/api.js';

const CATEGORIES = ['hub', 'camera', 'sensor', 'app'];

const SESSION_TYPES = [
  {
    id: 'e2e',
    label: 'E2E',
    icon: '🔄',
    description: 'Full end-to-end product testing',
  },
  {
    id: 'reproduction',
    label: 'Issue Reproduction',
    icon: '🐛',
    description: 'Reproduce and document reported bugs',
  },
  {
    id: 'regression',
    label: 'Regression',
    icon: '🔁',
    description: 'Verify previously fixed issues remain resolved',
  },
  {
    id: 'feature',
    label: 'Feature / Targeted',
    icon: '🎯',
    description: 'Test a specific feature or acceptance criteria',
  },
];

const SESSION_TYPE_LABELS = {
  e2e: 'E2E Session',
  reproduction: 'Reproduction Session',
  regression: 'Regression Session',
  feature: 'Feature Session',
};

export default function SessionStart({ onBack, onCreated }) {
  const [sessionType, setSessionType] = useState('e2e');
  const [productId, setProductId] = useState('');
  const [deviceName, setDeviceName] = useState('');
  const [addingDevice, setAddingDevice] = useState(false);
  const [newDeviceName, setNewDeviceName] = useState('');
  const [savedDevices, setSavedDevices] = useState([]);
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
  const newDeviceInputRef = useRef(null);

  const selectedProduct = PRODUCTS.find(p => p.id === productId);
  const categoryDevices = savedDevices.filter(d => d.category === selectedProduct?.category);

  useEffect(() => {
    getDevices().then(setSavedDevices).catch(() => {});
  }, []);

  useEffect(() => {
    setDeviceName('');
    setAddingDevice(false);
    setNewDeviceName('');
    setFirmware('');
    setSavedFirmwares([]);
  }, [productId]);

  useEffect(() => {
    setFirmware('');
    setAddingFirmware(false);
    setNewFirmwareVersion('');
    if (deviceName) {
      getFirmwares(deviceName).then(setSavedFirmwares).catch(() => {});
    } else {
      setSavedFirmwares([]);
    }
  }, [deviceName]);

  useEffect(() => {
    if (addingFirmware) newFirmwareInputRef.current?.focus();
  }, [addingFirmware]);

  async function handleAddFirmware() {
    const version = newFirmwareVersion.trim();
    const key = deviceName || selectedProduct?.name;
    if (!version || !key) return;
    try {
      const entry = await addFirmware(key, version);
      setSavedFirmwares(prev => [...prev.filter(f => f.id !== entry.id), entry]);
      setFirmware(entry.version);
    } catch {
      setFirmware(version);
    }
    setAddingFirmware(false);
    setNewFirmwareVersion('');
  }

  useEffect(() => {
    if (addingDevice) newDeviceInputRef.current?.focus();
  }, [addingDevice]);

  async function handleAddDevice() {
    const name = newDeviceName.trim();
    if (!name || !selectedProduct) return;
    try {
      const device = await addDevice(name, selectedProduct.category);
      setSavedDevices(prev => [...prev.filter(d => d.id !== device.id), device]);
      setDeviceName(device.name);
      setAddingDevice(false);
      setNewDeviceName('');
    } catch {
      // silently fall back to using the typed name
      setDeviceName(name);
      setAddingDevice(false);
      setNewDeviceName('');
    }
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
    // Reset input so same file can be re-uploaded
    e.target.value = '';
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!productId) {
      setError('Please select a product.');
      return;
    }
    setError('');
    setLoading(true);
    setLoadingMsg('Creating session...');

    try {
      const session = await createSession({
        productId: selectedProduct.id,
        productName: deviceName || selectedProduct.name,
        productCategory: selectedProduct.name,
        category: selectedProduct.category,
        subcategory: selectedProduct.subcategory,
        firmware,
        notes,
        type: sessionType,
      });

      let testCases = session.testCases || [];
      let issues = session.issues || [];

      if (csvPreview) {
        if (csvPreview.type === 'testCases') {
          testCases = csvPreview.data;
        } else {
          issues = csvPreview.data;
        }
        const { updateSession } = await import('../lib/api.js');
        const updated = await updateSession(session.id, { testCases, issues });
        onCreated(updated);
        return;
      }

      // No CSV — session created with empty test cases, proceed directly
      onCreated(session);
    } catch (err) {
      setError(err.message || 'Failed to create session');
    } finally {
      setLoading(false);
    }
  }

  async function handleAiPopulate(e) {
    e.preventDefault();
    if (!productId) {
      setError('Please select a product.');
      return;
    }
    setError('');
    setLoading(true);
    setLoadingMsg('Claude is populating your test cases...');

    try {
      const session = await createSession({
        productId: selectedProduct.id,
        productName: deviceName || selectedProduct.name,
        productCategory: selectedProduct.name,
        category: selectedProduct.category,
        subcategory: selectedProduct.subcategory,
        firmware,
        notes,
        type: sessionType,
      });

      let testCases = [];
      try {
        const result = await aiPopulateTests({
          productName: selectedProduct.name,
          category: selectedProduct.category,
          subcategory: selectedProduct.subcategory,
          firmware,
        });
        testCases = result.testCases || [];
      } catch (aiErr) {
        console.warn('AI populate failed:', aiErr.message);
      }

      const { updateSession } = await import('../lib/api.js');
      const updated = await updateSession(session.id, { testCases });
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
            <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
              {selectedProduct.name}
            </p>
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
        <p>Choose a session type, select a product, then import a CSV or auto-populate with AI.</p>
      </div>

      <form onSubmit={handleSubmit}>
        {error && <div className="error-msg">{error}</div>}

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

        {/* Product Selector */}
        <div className="form-group">
          <label>Product</label>
          <select value={productId} onChange={e => setProductId(e.target.value)} required>
            <option value="">Select a product...</option>
            {CATEGORIES.map(cat => (
              <optgroup key={cat} label={CATEGORY_LABELS[cat]}>
                {PRODUCTS.filter(p => p.category === cat).map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>

        {selectedProduct && (
          <div className="form-group">
            <label>Product Name <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(specific device model)</span></label>
            {!addingDevice ? (
              <select value={deviceName} onChange={e => {
                if (e.target.value === '__add__') {
                  setAddingDevice(true);
                  setDeviceName('');
                } else {
                  setDeviceName(e.target.value);
                }
              }}>
                <option value="">— Generic ({selectedProduct.name}) —</option>
                {categoryDevices.map(d => (
                  <option key={d.id} value={d.name}>{d.name}</option>
                ))}
                <option value="__add__">+ Add new device...</option>
              </select>
            ) : (
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  ref={newDeviceInputRef}
                  type="text"
                  placeholder={`e.g. Eufy C210, Wyze Cam v3`}
                  value={newDeviceName}
                  onChange={e => setNewDeviceName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddDevice(); } if (e.key === 'Escape') { setAddingDevice(false); setNewDeviceName(''); } }}
                  style={{ flex: 1 }}
                />
                <button type="button" className="btn btn-primary btn-sm" onClick={handleAddDevice} disabled={!newDeviceName.trim()}>Save</button>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setAddingDevice(false); setNewDeviceName(''); }}>Cancel</button>
              </div>
            )}
            {deviceName && !addingDevice && (
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                Testing: <strong style={{ color: 'var(--text-primary)' }}>{deviceName}</strong> ({selectedProduct.name})
              </div>
            )}
          </div>
        )}

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
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddFirmware(); } if (e.key === 'Escape') { setAddingFirmware(false); setNewFirmwareVersion(''); } }}
                  style={{ flex: 1 }}
                />
                <button type="button" className="btn btn-primary btn-sm" onClick={handleAddFirmware} disabled={!newFirmwareVersion.trim()}>Save</button>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setAddingFirmware(false); setNewFirmwareVersion(''); }}>Cancel</button>
              </div>
            )}
          </div>
        )}

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
          <div className="csv-section-label">CSV Import</div>
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
                ✓ {csvPreview.count} {csvPreview.type === 'issues' ? 'issues' : 'test cases'} loaded
                {csvPreview.count > 3 && ` (showing first 3)`}
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table className="csv-preview-table">
                  <thead>
                    <tr>
                      {previewHeaders.slice(0, 4).map(h => (
                        <th key={h}>{h}</th>
                      ))}
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

        <button type="submit" className="btn btn-primary btn-lg" style={{ width: '100%' }}>
          Start {SESSION_TYPE_LABELS[sessionType]}
        </button>

        {/* AI Fallback */}
        <div className="ai-fallback">
          <div className="ai-fallback-divider">or</div>
          <button
            type="button"
            className="btn btn-ghost"
            style={{ width: '100%' }}
            onClick={handleAiPopulate}
          >
            ✨ Or auto-populate with AI (requires API key)
          </button>
        </div>
      </form>
    </div>
  );
}
