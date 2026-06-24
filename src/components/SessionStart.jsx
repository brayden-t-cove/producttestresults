import { useState, useRef, useEffect } from 'react';
import { CATEGORY_LABELS, CAPABILITY_GROUPS } from '../data/capabilities.js';
import { BASELINE_TESTS, TEST_LIBRARY } from '../data/testLibrary.js';
import { generateVendorEvalTestCases, VENDOR_EVAL_SESSION_TYPES } from '../data/vendorEvalLibrary.js';
import { createSession, updateSession, downloadCsvTemplate, importCsv, getFirmwares, addFirmware } from '../lib/api.js';

const TEST_PLANS = [
  { id: 'production', label: 'Production', icon: '🏭', description: 'Test against our platform requirements and release criteria' },
  { id: 'vendor-eval', label: 'Vendor Evaluation', icon: '🔍', description: 'Evaluate a third-party sample or prototype for potential adoption' },
];

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

function getCapabilityPosition(category, capabilityId) {
  const groups = CAPABILITY_GROUPS[category] || [];
  for (let gi = 0; gi < groups.length; gi++) {
    const caps = groups[gi].capabilities || [];
    for (let ci = 0; ci < caps.length; ci++) {
      if (caps[ci].id === capabilityId) {
        return { sectionIndex: gi + 1, subsectionIndex: ci + 1 };
      }
    }
  }
  return null;
}

function generateTestCases(product, appConfig) {
  const seen = new Set();
  const tests = [];

  // Track baseline test index counter
  let baselineCounter = 0;

  // Track per-capability test index
  const capTestCounters = {};

  function addBaselineTest(t) {
    if (!seen.has(t.id)) {
      seen.add(t.id);
      baselineCounter++;
      const tc = {
        ...t,
        id: crypto.randomUUID(),
        templateId: t.id,
        status: 'pending',
        notes: '',
        testNumber: `0.${baselineCounter}`,
      };
      tests.push(tc);
    }
  }

  function addCapabilityTest(t, capabilityId) {
    if (!seen.has(t.id)) {
      seen.add(t.id);
      const pos = getCapabilityPosition(product.category, capabilityId);
      if (!capTestCounters[capabilityId]) capTestCounters[capabilityId] = 0;
      capTestCounters[capabilityId]++;
      const testIndex = capTestCounters[capabilityId];
      let testNumber;
      if (pos) {
        testNumber = `${pos.sectionIndex}.${pos.subsectionIndex}.${testIndex}`;
      } else {
        testNumber = `?.?.${testIndex}`;
      }
      const tc = {
        ...t,
        id: crypto.randomUUID(),
        templateId: t.id,
        status: 'pending',
        notes: '',
        capabilityId,
        testNumber,
      };
      if (appConfig && appConfig.unavailableCapabilities &&
          appConfig.unavailableCapabilities.includes(capabilityId)) {
        tc.notAvailableInApp = true;
      }
      tests.push(tc);
    }
  }

  const baselines = BASELINE_TESTS[product.category] || [];
  baselines.forEach(t => addBaselineTest(t));

  (product.capabilities || []).forEach(capId => {
    const capTests = TEST_LIBRARY[capId] || [];
    capTests.forEach(t => addCapabilityTest(t, capId));
  });

  return tests;
}

function platformLabel(platform) {
  if (platform === 'ios') return 'iOS';
  if (platform === 'android') return 'Android';
  return 'iOS/Android';
}

export default function SessionStart({ catalog, onBack, onCreated, onGoToCatalog }) {
  const [selectedProducts, setSelectedProducts] = useState([]);
  // each item: { product, appConfig, firmware }

  // Derived for backward compat with firmware loading logic
  const selectedProduct = selectedProducts[0]?.product || null;

  const [testPlan, setTestPlan] = useState('production');
  const [sessionType, setSessionType] = useState('e2e');

  // Single-product firmware state (kept for the existing firmware dropdown shown when one product selected)
  const [firmware, setFirmware] = useState('');
  const [addingFirmware, setAddingFirmware] = useState(false);
  const [newFirmwareVersion, setNewFirmwareVersion] = useState('');
  const [savedFirmwares, setSavedFirmwares] = useState([]);
  const newFirmwareInputRef = useRef(null);

  // Per-product firmware for multi-product list (keyed by catalogId)
  const [firmwarePerProduct, setFirmwarePerProduct] = useState({});

  const [notes, setNotes] = useState('');
  const [testerName, setTesterName] = useState('');
  const [testEnvOpen, setTestEnvOpen] = useState(false);
  const [testEnv, setTestEnv] = useState({ appName: '', phoneType: '', osVersion: '', appVersion: '', username: '', password: '', deviceId: '' });
  const [showEnvPassword, setShowEnvPassword] = useState(false);
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
      const isSample = selectedProduct.type === 'sample' || selectedProduct.type === 'prototype';
      setTestPlan(isSample ? 'vendor-eval' : 'production');
      setSessionType('e2e');
    }
  }, [selectedProduct?.id]);

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

  function toggleProduct(product) {
    setSelectedProducts(prev => {
      const exists = prev.find(p => p.product.id === product.id);
      if (exists) {
        return prev.filter(p => p.product.id !== product.id);
      } else {
        return [...prev, { product, appConfig: null }];
      }
    });
  }

  function removeSelectedProduct(catalogId) {
    setSelectedProducts(prev => prev.filter(p => p.product.id !== catalogId));
    setFirmwarePerProduct(prev => {
      const next = { ...prev };
      delete next[catalogId];
      return next;
    });
  }

  function moveProduct(index, direction) {
    setSelectedProducts(prev => {
      const next = [...prev];
      const swapIndex = index + direction;
      if (swapIndex < 0 || swapIndex >= next.length) return prev;
      [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
      return next;
    });
  }

  function setAppConfigForProduct(catalogId, appConfig) {
    setSelectedProducts(prev =>
      prev.map(p => p.product.id === catalogId ? { ...p, appConfig } : p)
    );
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
    if (selectedProducts.length === 0) {
      setError('Please select a product from your catalog.');
      return;
    }
    setError('');
    setLoading(true);
    setLoadingMsg('Creating session...');

    try {
      const isMulti = selectedProducts.length > 1;

      // Build products array
      const products = selectedProducts.map(({ product, appConfig }, i) => ({
        catalogId: product.id,
        name: product.name,
        category: product.category,
        firmware: isMulti ? (firmwarePerProduct[product.id] || '') : firmware,
        appConfigId: appConfig?.id || null,
        appConfigName: appConfig?.appName || null,
      }));

      // Build productName
      let productName;
      if (!isMulti) {
        productName = selectedProducts[0].product.name;
      } else {
        const p1 = selectedProducts[0].product.name;
        const p2 = selectedProducts[1].product.name;
        const more = selectedProducts.length - 2;
        productName = `${p1} + ${p2}${more > 0 ? ` + ${more} more` : ''}`;
      }

      const firstProduct = selectedProducts[0].product;
      const firstAppConfig = selectedProducts[0].appConfig;

      const session = await createSession({
        productId: firstProduct.id,
        productName,
        category: firstProduct.category,
        catalogId: firstProduct.id,
        firmware: isMulti ? (firmwarePerProduct[firstProduct.id] || '') : firmware,
        notes,
        testerName: testerName.trim() || undefined,
        type: sessionType,
        testPlan,
        appConfigId: isMulti ? null : (firstAppConfig?.id || null),
        appConfigName: isMulti ? null : (firstAppConfig?.appName || null),
        products: isMulti ? products : null,
        testEnvironment: {
          appName: testEnv.appName,
          phoneType: testEnv.phoneType,
          osVersion: testEnv.osVersion,
          appVersion: testEnv.appVersion,
          username: testEnv.username,
          password: testEnv.password,
          deviceId: testEnv.deviceId,
        },
      });

      let testCases;
      let issues = session.issues || [];

      if (csvPreview && !isMulti) {
        if (csvPreview.type === 'testCases') {
          testCases = csvPreview.data;
        } else {
          issues = csvPreview.data;
          testCases = testPlan === 'vendor-eval'
            ? generateVendorEvalTestCases(firstProduct)
            : generateTestCases(firstProduct, firstAppConfig);
        }
      } else if (isMulti) {
        const allTestCases = [];
        for (let i = 0; i < selectedProducts.length; i++) {
          const { product, appConfig } = selectedProducts[i];
          const cases = testPlan === 'vendor-eval'
            ? generateVendorEvalTestCases(product)
            : generateTestCases(product, appConfig);
          cases.forEach(tc => {
            tc.productCatalogId = product.id;
            tc.productIndex = i;
          });
          allTestCases.push(...cases);
        }
        testCases = allTestCases;
      } else {
        testCases = testPlan === 'vendor-eval'
          ? generateVendorEvalTestCases(firstProduct)
          : generateTestCases(firstProduct, firstAppConfig);
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

  const isMultiProduct = selectedProducts.length > 1;

  return (
    <div className="session-start">
      <div className="session-start-header">
        <button className="btn btn-ghost btn-sm" onClick={onBack} style={{ marginBottom: 12 }}>
          ← Back
        </button>
        <h1>New Testing Session</h1>
        <p>Select one or more products from your catalog, choose a session type, then start testing.</p>
      </div>

      <form onSubmit={handleSubmit}>
        {error && <div className="error-msg">{error}</div>}

        {/* Product Picker */}
        <div className="form-group">
          <label>Select Product{isMultiProduct ? 's' : ''}</label>
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
              {catalog.filter(p => p.type !== 'competitor').map(product => {
                const isSelected = selectedProducts.some(p => p.product.id === product.id);
                return (
                  <div
                    key={product.id}
                    className={`product-picker-card ${isSelected ? 'selected' : ''}`}
                    onClick={() => toggleProduct(product)}
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
                    {isSelected && (
                      <span style={{ fontSize: 16, color: 'var(--primary)', flexShrink: 0 }}>✓</span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Selected Products List (multi-product) */}
        {selectedProducts.length > 0 && (
          <div className="form-group">
            <label>Selected Products ({selectedProducts.length})</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {selectedProducts.map(({ product, appConfig }, index) => (
                <div key={product.id} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '12px 14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <span style={{ fontSize: 18 }}>{CATEGORY_ICONS[product.category] || '📦'}</span>
                    <span style={{ fontWeight: 600, fontSize: 14, flex: 1 }}>{product.name}</span>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={() => moveProduct(index, -1)}
                        disabled={index === 0}
                        style={{ padding: '2px 6px', fontSize: 12 }}
                        title="Move up"
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={() => moveProduct(index, 1)}
                        disabled={index === selectedProducts.length - 1}
                        style={{ padding: '2px 6px', fontSize: 12 }}
                        title="Move down"
                      >
                        ↓
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={() => removeSelectedProduct(product.id)}
                        style={{ padding: '2px 6px', fontSize: 12, color: 'var(--text-muted)' }}
                        title="Remove"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: (product.appConfigs || []).length > 0 ? 8 : 0 }}>
                    <input
                      type="text"
                      placeholder="Firmware version (optional)"
                      value={firmwarePerProduct[product.id] || ''}
                      onChange={e => setFirmwarePerProduct(prev => ({ ...prev, [product.id]: e.target.value }))}
                      style={{ flex: 1, fontSize: 13 }}
                    />
                  </div>
                  {(product.appConfigs || []).length > 0 && (
                    <div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>App configuration:</div>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        <button
                          type="button"
                          className={`btn btn-sm ${appConfig === null ? 'btn-primary' : 'btn-ghost'}`}
                          onClick={() => setAppConfigForProduct(product.id, null)}
                          style={{ fontSize: 12 }}
                        >
                          Generic
                        </button>
                        {(product.appConfigs || []).map(ac => (
                          <button
                            type="button"
                            key={ac.id}
                            className={`btn btn-sm ${appConfig?.id === ac.id ? 'btn-primary' : 'btn-ghost'}`}
                            onClick={() => setAppConfigForProduct(product.id, ac)}
                            style={{ fontSize: 12 }}
                          >
                            {ac.appName}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* App Configuration Selector — single product only */}
        {!isMultiProduct && selectedProduct && (selectedProduct.appConfigs || []).length > 0 && (
          <div className="form-group">
            <label>APP CONFIGURATION <span style={{ fontWeight: 400, textTransform: 'none', fontSize: 12, color: 'var(--text-muted)' }}>(optional)</span></label>
            <div className="product-picker-grid">
              <div
                className={`product-picker-card ${selectedProducts[0]?.appConfig === null ? 'selected' : ''}`}
                onClick={() => setAppConfigForProduct(selectedProduct.id, null)}
              >
                <span style={{ fontSize: 22 }}>🌐</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text)' }}>Generic — no specific app</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>All capabilities available</div>
                </div>
              </div>
              {(selectedProduct.appConfigs || []).map(ac => (
                <div
                  key={ac.id}
                  className={`product-picker-card ${selectedProducts[0]?.appConfig?.id === ac.id ? 'selected' : ''}`}
                  onClick={() => setAppConfigForProduct(selectedProduct.id, ac)}
                >
                  <span style={{ fontSize: 22 }}>📱</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text)' }}>{ac.appName}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                      {platformLabel(ac.platform)}
                      {ac.unavailableCapabilities.length > 0
                        ? ` · ${ac.unavailableCapabilities.length} feature${ac.unavailableCapabilities.length !== 1 ? 's' : ''} hidden`
                        : ' · All features available'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Test Plan Selector */}
        {selectedProducts.length > 0 && (
          <div className="form-group">
            <label>Test Plan</label>
            <div className="session-type-cards">
              {TEST_PLANS.map(tp => (
                <div
                  key={tp.id}
                  className={`session-type-card ${testPlan === tp.id ? 'selected' : ''}`}
                  onClick={() => { setTestPlan(tp.id); setSessionType('e2e'); }}
                >
                  <span className="session-type-icon">{tp.icon}</span>
                  <span className="session-type-label">{tp.label}</span>
                  <span className="session-type-desc">{tp.description}</span>
                </div>
              ))}
            </div>
            {testPlan === 'vendor-eval' && selectedProduct && (
              <div style={{ marginTop: 8, fontSize: 12, color: 'var(--text-muted)', padding: '8px 12px', background: 'var(--bg)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                🔍 Vendor Eval uses a standardized checklist ({generateVendorEvalTestCases(selectedProduct).length} test cases) covering packaging, build quality, setup, core function, connectivity, and interoperability.
              </div>
            )}
          </div>
        )}

        {/* Session Type Selector */}
        <div className="form-group">
          <label>Session Type</label>
          <div className="session-type-cards">
            {(testPlan === 'vendor-eval' ? VENDOR_EVAL_SESSION_TYPES : SESSION_TYPES).map(st => (
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

        {/* Firmware — single product only (existing dropdown) */}
        {!isMultiProduct && selectedProduct && (
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

        {/* Tester Name */}
        <div className="form-group">
          <label>Tester Name <span style={{ fontWeight: 400, fontSize: 12, color: 'var(--text-muted)', textTransform: 'none' }}>(optional — will be shown on results)</span></label>
          <input
            type="text"
            placeholder="Your name"
            value={testerName}
            onChange={e => setTesterName(e.target.value)}
          />
        </div>

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

        {/* Test Environment — collapsible */}
        <div className="form-group">
          <button
            type="button"
            className="btn btn-ghost"
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 0', fontWeight: 600, fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: testEnvOpen ? 10 : 0 }}
            onClick={() => setTestEnvOpen(v => !v)}
          >
            <span>{testEnvOpen ? '▾' : '▸'}</span>
            <span>Test Environment</span>
          </button>
          {testEnvOpen && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>App Name <span style={{ fontWeight: 400, fontSize: 11, color: 'var(--text-muted)', textTransform: 'none' }}>(as found in App Store)</span></label>
                <input type="text" placeholder="e.g. Cove Security, Instavision" value={testEnv.appName} onChange={e => setTestEnv(p => ({ ...p, appName: e.target.value }))} />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Phone / Device Type</label>
                <input type="text" placeholder="e.g. iPhone 15 Pro" value={testEnv.phoneType} onChange={e => setTestEnv(p => ({ ...p, phoneType: e.target.value }))} />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>OS Version</label>
                <input type="text" placeholder="e.g. iOS 17.4" value={testEnv.osVersion} onChange={e => setTestEnv(p => ({ ...p, osVersion: e.target.value }))} />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>App Version</label>
                <input type="text" placeholder="e.g. 3.2.1" value={testEnv.appVersion} onChange={e => setTestEnv(p => ({ ...p, appVersion: e.target.value }))} />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Device ID / DID</label>
                <input type="text" placeholder="e.g. ABC123456" value={testEnv.deviceId} onChange={e => setTestEnv(p => ({ ...p, deviceId: e.target.value }))} />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Account Username</label>
                <input type="text" placeholder="e.g. test@example.com" value={testEnv.username} onChange={e => setTestEnv(p => ({ ...p, username: e.target.value }))} autoComplete="off" />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Account Password</label>
                <div style={{ display: 'flex', gap: 6 }}>
                  <input
                    type={showEnvPassword ? 'text' : 'password'}
                    placeholder="Password"
                    value={testEnv.password}
                    onChange={e => setTestEnv(p => ({ ...p, password: e.target.value }))}
                    autoComplete="new-password"
                    style={{ flex: 1 }}
                  />
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShowEnvPassword(v => !v)} style={{ flexShrink: 0 }}>
                    {showEnvPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* CSV Section — single product only */}
        {!isMultiProduct && (
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
        )}

        <button
          type="submit"
          className="btn btn-primary btn-lg"
          style={{ width: '100%' }}
          disabled={catalog.length === 0}
        >
          {isMultiProduct ? 'Start Session' : `Start ${SESSION_TYPE_LABELS[sessionType]}`}
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
