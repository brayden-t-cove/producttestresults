import { useState, useRef, useEffect } from 'react';
import { CATEGORY_LABELS, CAPABILITY_GROUPS } from '../data/capabilities.js';
import { BASELINE_TESTS, TEST_LIBRARY } from '../data/testLibrary.js';
import { createSession, updateSession, getFirmwares, addFirmware, listIssuesForProduct } from '../lib/api.js';

const CATEGORY_ICONS = {
  hub: '🏠',
  touchpad: '⌨️',
  camera: '📷',
  sensor: '📡',
  app: '📱',
};

// Active session types — 4 distinct modes
const PRIMARY_TYPE = { id: 'buffet', label: 'Build & Run', icon: '🔨', description: 'Define your test plan from the shared library, then run it. No irrelevant tests, no skipping.', external: true };
const SECONDARY_TYPES = [
  { id: 'exploratory',  label: 'Exploratory',        icon: '🔍', description: 'Open-ended structured exploration with notes per category', external: true },
  { id: 'comparison',   label: 'Comparison',          icon: '⚖️', description: 'Side-by-side evaluation of two or more products', external: true },
  { id: 'reproduction', label: 'Issue Reproduction',  icon: '🐛', description: 'Reproduce and document a specific reported issue with full traceability' },
];

const SESSION_TYPE_LABELS = {
  reproduction: 'Issue Reproduction Session',
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

function generateTestCases(product, appConfig, capabilitiesOverride) {
  const seen = new Set();
  const tests = [];
  let baselineCounter = 0;
  const capTestCounters = {};

  function addBaselineTest(t) {
    if (!seen.has(t.id)) {
      seen.add(t.id);
      baselineCounter++;
      tests.push({ ...t, id: crypto.randomUUID(), templateId: t.id, status: 'pending', notes: '', testNumber: `0.${baselineCounter}` });
    }
  }

  function addCapabilityTest(t, capabilityId) {
    if (!seen.has(t.id)) {
      seen.add(t.id);
      const pos = getCapabilityPosition(product.category, capabilityId);
      if (!capTestCounters[capabilityId]) capTestCounters[capabilityId] = 0;
      capTestCounters[capabilityId]++;
      const testIndex = capTestCounters[capabilityId];
      const testNumber = pos ? `${pos.sectionIndex}.${pos.subsectionIndex}.${testIndex}` : `?.?.${testIndex}`;
      const tc = { ...t, id: crypto.randomUUID(), templateId: t.id, status: 'pending', notes: '', capabilityId, testNumber };
      if (appConfig?.unavailableCapabilities?.includes(capabilityId)) tc.notAvailableInApp = true;
      tests.push(tc);
    }
  }

  const baselines = BASELINE_TESTS[product.category] || [];
  baselines.forEach(t => addBaselineTest(t));

  const caps = capabilitiesOverride ?? (product.capabilities || []);
  caps.forEach(capId => {
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

function countTests(product) {
  const seen = new Set();
  const baselines = BASELINE_TESTS[product.category] || [];
  baselines.forEach(t => seen.add(t.id));
  (product.capabilities || []).forEach(capId => {
    (TEST_LIBRARY[capId] || []).forEach(t => seen.add(t.id));
  });
  return seen.size;
}

export default function SessionStart({ catalog, onBack, onCreated, onGoToCatalog, onStartExploratory, onStartComparison, onStartBuffet }) {
  // --- Session type selection ---
  const [sessionType, setSessionType] = useState(null);

  // --- Test environment fields ---
  const [sessionName, setSessionName] = useState('');
  const [testerName, setTesterName] = useState('');
  const [appName, setAppName] = useState('');
  const [phoneOS, setPhoneOS] = useState(null); // 'ios' | 'android' | null
  const [osVersion, setOsVersion] = useState('');
  const [appVersion, setAppVersion] = useState('');
  const [accountUsername, setAccountUsername] = useState('');
  const [notes, setNotes] = useState('');

  // --- Issue Reproduction ---
  const [documentedIssues, setDocumentedIssues] = useState([]);
  const [selectedIssueId, setSelectedIssueId] = useState('');

  // --- Products ---
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [productSearch, setProductSearch] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const searchRef = useRef(null);
  const dropdownRef = useRef(null);

  // --- Firmware ---
  const [firmware, setFirmware] = useState('');
  const [addingFirmware, setAddingFirmware] = useState(false);
  const [newFirmwareVersion, setNewFirmwareVersion] = useState('');
  const [savedFirmwares, setSavedFirmwares] = useState([]);
  const [firmwarePerProduct, setFirmwarePerProduct] = useState({});
  const newFirmwareInputRef = useRef(null);

  // --- UI state ---
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState('');
  const [error, setError] = useState('');

  const selectedProduct = selectedProducts[0]?.product || null;
  const isMultiProduct = selectedProducts.length > 1;

  // Load firmwares and issues when first product changes
  useEffect(() => {
    setFirmware('');
    setAddingFirmware(false);
    setNewFirmwareVersion('');
    setSavedFirmwares([]);
    if (selectedProduct) {
      getFirmwares(null, selectedProduct.id).then(setSavedFirmwares).catch(() => {});
    }
  }, [selectedProduct?.id]);

  useEffect(() => {
    if (sessionType === 'reproduction' && selectedProducts.length > 0) {
      const ids = selectedProducts.map(p => p.product.id);
      Promise.all(ids.map(id => listIssuesForProduct(id).catch(() => [])))
        .then(results => setDocumentedIssues(results.flat()))
        .catch(() => {});
    }
  }, [sessionType, selectedProducts.map(p => p.product.id).join(',')]);

  useEffect(() => {
    if (addingFirmware) newFirmwareInputRef.current?.focus();
  }, [addingFirmware]);

  useEffect(() => {
    function handleClickOutside(e) {
      if (
        searchRef.current && !searchRef.current.contains(e.target) &&
        dropdownRef.current && !dropdownRef.current.contains(e.target)
      ) {
        setSearchOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const eligibleProducts = catalog.filter(p => p.type !== 'competitor');
  const searchResults = productSearch.trim().length === 0
    ? eligibleProducts
    : eligibleProducts.filter(p => {
        const q = productSearch.toLowerCase();
        return (
          (p.modelNumber || '').toLowerCase().includes(q) ||
          (p.name || '').toLowerCase().includes(q) ||
          (p.manufacturer || '').toLowerCase().includes(q) ||
          (p.subclass || '').toLowerCase().includes(q) ||
          (CATEGORY_LABELS[p.category] || '').toLowerCase().includes(q)
        );
      });

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
      if (exists) return prev.filter(p => p.product.id !== product.id);
      return [...prev, { product, appConfig: null }];
    });
  }

  function removeSelectedProduct(catalogId) {
    setSelectedProducts(prev => prev.filter(p => p.product.id !== catalogId));
    setFirmwarePerProduct(prev => { const next = { ...prev }; delete next[catalogId]; return next; });
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

  function scopedCaps(product) {
    const caps = product.capabilities || [];
    if (product.category !== 'app' || !phoneOS) return caps;
    return caps.filter(c => c !== (phoneOS === 'ios' ? 'android' : 'ios'));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!sessionType) { setError('Please select a session type.'); return; }
    if (selectedProducts.length === 0) { setError('Please select at least one product.'); return; }
    setError('');
    setLoading(true);
    setLoadingMsg('Creating session...');

    try {
      const isMulti = selectedProducts.length > 1;

      const products = selectedProducts.map(({ product, appConfig }) => ({
        catalogId: product.id,
        name: product.name,
        modelNumber: product.modelNumber || '',
        category: product.category,
        firmware: isMulti ? (firmwarePerProduct[product.id] || '') : firmware,
        appConfigId: appConfig?.id || null,
        appConfigName: appConfig?.appName || null,
      }));

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
        sessionName: sessionName.trim() || undefined,
        notes,
        testerName: testerName.trim() || undefined,
        type: sessionType,
        testPlan: 'production',
        platformScope: phoneOS || 'both',
        documentedIssueId: sessionType === 'reproduction' ? (selectedIssueId || undefined) : undefined,
        appConfigId: isMulti ? null : (firstAppConfig?.id || null),
        appConfigName: isMulti ? null : (firstAppConfig?.appName || null),
        products: isMulti ? products : null,
        testEnvironment: {
          appName,
          phoneType: phoneOS === 'ios' ? 'iOS' : phoneOS === 'android' ? 'Android' : '',
          osVersion,
          appVersion,
          username: accountUsername,
        },
      });

      let testCases;
      if (isMulti) {
        const allTestCases = [];
        for (let i = 0; i < selectedProducts.length; i++) {
          const { product, appConfig } = selectedProducts[i];
          const cases = generateTestCases(product, appConfig, scopedCaps(product));
          cases.forEach(tc => { tc.productCatalogId = product.id; tc.productIndex = i; });
          allTestCases.push(...cases);
        }
        testCases = allTestCases;
      } else {
        testCases = generateTestCases(firstProduct, firstAppConfig, scopedCaps(firstProduct));
      }

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
          {selectedProduct && <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>{selectedProduct.name}</p>}
        </div>
      </div>
    );
  }

  const showForm = sessionType === 'reproduction';

  return (
    <div className="session-start">
      <div className="session-start-header">
        <button className="btn btn-ghost btn-sm" onClick={onBack} style={{ marginBottom: 12 }}>
          ← Back
        </button>
        <h1>New Testing Session</h1>
      </div>

      {/* Primary — Build & Run */}
      <div
        onClick={onStartBuffet}
        style={{
          display: 'flex', alignItems: 'center', gap: 20,
          border: '2px solid var(--accent, #1A5CF6)',
          borderRadius: 12, padding: '20px 24px',
          background: 'rgba(26,92,246,0.12)',
          cursor: 'pointer', marginBottom: 10,
        }}
      >
        <span style={{ fontSize: 36 }}>🔨</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 17, color: 'var(--accent, #1A5CF6)', marginBottom: 4 }}>
            Build & Run
            <span style={{ marginLeft: 10, fontSize: 10, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', background: 'var(--accent, #1A5CF6)', color: '#fff', borderRadius: 4, padding: '2px 7px', verticalAlign: 'middle' }}>Recommended</span>
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.5 }}>
            Define your test plan from the shared library, then run it. No irrelevant tests, no skipping.
          </div>
        </div>
        <span style={{ fontSize: 20, color: 'var(--accent, #1A5CF6)', fontWeight: 700 }}>→</span>
      </div>

      {/* Secondary — Exploratory, Comparison, Issue Reproduction */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 10 }}>
        {SECONDARY_TYPES.map(st => (
          <div
            key={st.id}
            onClick={() => {
              if (st.external) {
                if (st.id === 'exploratory' && onStartExploratory) onStartExploratory();
                if (st.id === 'comparison' && onStartComparison) onStartComparison();
                return;
              }
              setSessionType(st.id === sessionType ? null : st.id);
              setError('');
            }}
            style={{
              display: 'flex', alignItems: 'flex-start', gap: 12,
              border: `1px solid ${sessionType === st.id ? 'var(--accent, #1A5CF6)' : 'var(--border)'}`,
              borderRadius: 10, padding: '14px 16px',
              background: sessionType === st.id ? 'rgba(26,92,246,0.10)' : 'var(--surface)',
              cursor: 'pointer',
            }}
          >
            <span style={{ fontSize: 22 }}>{st.icon}</span>
            <div>
              <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 2 }}>{st.label}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.4 }}>{st.description}</div>
            </div>
          </div>
        ))}
      </div>

      {showForm && (
        <form onSubmit={handleSubmit}>
          {error && <div className="error-msg">{error}</div>}

          {/* Test Name */}
          <div className="form-group">
            <label>Test Name <span style={{ fontWeight: 400, fontSize: 12, color: 'var(--text-muted)', textTransform: 'none' }}>(optional — displayed as the session title)</span></label>
            <input
              type="text"
              placeholder="e.g. App v4.2 Regression, Prime Day Camera Eval, Doorbell Range Test..."
              value={sessionName}
              onChange={e => setSessionName(e.target.value)}
            />
          </div>

          {/* Tester Name */}
          <div className="form-group">
            <label>Tester Name <span style={{ fontWeight: 400, fontSize: 12, color: 'var(--text-muted)', textTransform: 'none' }}>(optional)</span></label>
            <input
              type="text"
              placeholder="Your name"
              value={testerName}
              onChange={e => setTesterName(e.target.value)}
            />
          </div>

          {/* Test Environment */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>App Name</label>
              <input
                type="text"
                placeholder="e.g. Cove Security, InstaVision"
                value={appName}
                onChange={e => setAppName(e.target.value)}
              />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Phone OS <span style={{ fontWeight: 400, fontSize: 11, color: 'var(--text-muted)', textTransform: 'none' }}>(drives platform test cases)</span></label>
              <div style={{ display: 'flex', gap: 8 }}>
                {[{ id: 'ios', label: '🍎 iOS' }, { id: 'android', label: '🤖 Android' }].map(opt => (
                  <button
                    key={opt.id}
                    type="button"
                    className={`btn ${phoneOS === opt.id ? 'btn-primary' : 'btn-ghost'}`}
                    style={{ flex: 1 }}
                    onClick={() => setPhoneOS(prev => prev === opt.id ? null : opt.id)}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>OS Version</label>
              <input
                type="text"
                placeholder={phoneOS === 'android' ? 'e.g. Android 14' : 'e.g. iOS 17.4'}
                value={osVersion}
                onChange={e => setOsVersion(e.target.value)}
              />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>App Version</label>
              <input
                type="text"
                placeholder="e.g. 3.2.1"
                value={appVersion}
                onChange={e => setAppVersion(e.target.value)}
              />
            </div>
            <div className="form-group" style={{ marginBottom: 0, gridColumn: '1 / -1' }}>
              <label>Account Username</label>
              <input
                type="text"
                placeholder="e.g. test@example.com"
                value={accountUsername}
                onChange={e => setAccountUsername(e.target.value)}
                autoComplete="off"
              />
            </div>
          </div>

          {/* Documented Issue — Issue Reproduction only */}
          {sessionType === 'reproduction' && (
            <div className="form-group" style={{ marginTop: 12 }}>
              <label>Documented Issue</label>
              {documentedIssues.length > 0 ? (
                <select value={selectedIssueId} onChange={e => setSelectedIssueId(e.target.value)}>
                  <option value="">— Select an issue —</option>
                  {documentedIssues.map(issue => (
                    <option key={issue.id} value={issue.id}>
                      {issue.title || issue.description || `Issue #${issue.id}`}
                      {issue.severity ? ` [${issue.severity}]` : ''}
                    </option>
                  ))}
                </select>
              ) : (
                <div style={{ fontSize: 13, color: 'var(--text-muted)', padding: '10px 12px', background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)' }}>
                  {selectedProducts.length === 0
                    ? 'Select a product below to load its documented issues.'
                    : 'No documented issues found for the selected product(s).'}
                </div>
              )}
            </div>
          )}

          {/* Session Notes */}
          <div className="form-group" style={{ marginTop: 12 }}>
            <label>Session Notes</label>
            <textarea
              placeholder="Any context for this session — build notes, known issues, special focus areas..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={3}
            />
          </div>

          {/* Product Picker */}
          <div className="form-group">
            <label>Products</label>
            {catalog.length === 0 ? (
              <div className="error-msg" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                No products in catalog.{' '}
                <button type="button" className="btn btn-primary btn-sm" onClick={onGoToCatalog}>
                  Add a product first
                </button>
              </div>
            ) : (
              <div style={{ position: 'relative' }}>
                <div style={{ position: 'relative' }}>
                  <input
                    ref={searchRef}
                    type="text"
                    placeholder="Search by model number, name, manufacturer, or category…"
                    value={productSearch}
                    onChange={e => { setProductSearch(e.target.value); setSearchOpen(true); }}
                    onFocus={() => setSearchOpen(true)}
                    style={{ paddingLeft: 36 }}
                  />
                  <span style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', fontSize: 15, color: 'var(--text-muted)', pointerEvents: 'none' }}>🔍</span>
                  {productSearch && (
                    <button
                      type="button"
                      onClick={() => { setProductSearch(''); searchRef.current?.focus(); }}
                      style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 16, lineHeight: 1, padding: 0 }}
                    >×</button>
                  )}
                </div>
                {searchOpen && (
                  <div ref={dropdownRef} className="product-search-dropdown">
                    {searchResults.length === 0 ? (
                      <div style={{ padding: '12px 14px', fontSize: 13, color: 'var(--text-muted)' }}>
                        No products match "{productSearch}"
                      </div>
                    ) : (() => {
                      const categoryOrder = ['hub', 'touchpad', 'camera', 'sensor', 'app'];
                      const grouped = categoryOrder
                        .map(cat => ({ cat, items: searchResults.filter(p => p.category === cat) }))
                        .concat([{ cat: 'other', items: searchResults.filter(p => !categoryOrder.includes(p.category)) }])
                        .filter(g => g.items.length > 0);
                      return grouped.map(({ cat, items }) => (
                        <div key={cat}>
                          <div className="product-search-category-header">
                            <span>{CATEGORY_ICONS[cat] || '📦'}</span>
                            <span>{CATEGORY_LABELS[cat] || cat}</span>
                          </div>
                          {items.map(product => {
                            const isSelected = selectedProducts.some(p => p.product.id === product.id);
                            return (
                              <button
                                key={product.id}
                                type="button"
                                className={`product-search-result ${isSelected ? 'selected' : ''}`}
                                onClick={() => {
                                  toggleProduct(product);
                                  if (!isSelected) { setProductSearch(''); setSearchOpen(false); }
                                }}
                              >
                                <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                                  <div style={{ fontWeight: 700, fontSize: 13 }}>{product.modelNumber || product.name}</div>
                                  {product.modelNumber && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>{product.name}</div>}
                                  {product.manufacturer && <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 1 }}>{product.manufacturer}</div>}
                                </div>
                                <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                                  <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>{countTests(product)} tests</span>
                                  {isSelected && <span style={{ color: 'var(--primary)', fontSize: 15 }}>✓</span>}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      ));
                    })()}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Selected Products list */}
          {selectedProducts.length > 0 && (
            <div className="form-group">
              <label>
                Selected Products
                <span style={{ fontWeight: 400, textTransform: 'none', fontSize: 12, color: 'var(--text-muted)', marginLeft: 6 }}>
                  {selectedProducts.length} selected
                </span>
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {selectedProducts.map(({ product, appConfig }, index) => (
                  <div key={product.id} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '12px 14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <span style={{ fontSize: 18 }}>{CATEGORY_ICONS[product.category] || '📦'}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: 13 }}>{product.modelNumber || product.name}</div>
                        {product.modelNumber && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{product.name}</div>}
                      </div>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button type="button" className="btn btn-ghost btn-sm" onClick={() => moveProduct(index, -1)} disabled={index === 0} style={{ padding: '2px 6px', fontSize: 12 }} title="Move up">↑</button>
                        <button type="button" className="btn btn-ghost btn-sm" onClick={() => moveProduct(index, 1)} disabled={index === selectedProducts.length - 1} style={{ padding: '2px 6px', fontSize: 12 }} title="Move down">↓</button>
                        <button type="button" className="btn btn-ghost btn-sm" onClick={() => removeSelectedProduct(product.id)} style={{ padding: '2px 6px', fontSize: 12, color: 'var(--text-muted)' }} title="Remove">×</button>
                      </div>
                    </div>

                    {/* Firmware */}
                    {isMultiProduct ? (
                      <input
                        type="text"
                        placeholder="Firmware version (optional)"
                        value={firmwarePerProduct[product.id] || ''}
                        onChange={e => setFirmwarePerProduct(prev => ({ ...prev, [product.id]: e.target.value }))}
                        style={{ flex: 1, fontSize: 13, width: '100%', marginBottom: (product.appConfigs || []).length > 0 ? 8 : 0 }}
                      />
                    ) : (
                      !addingFirmware ? (
                        <select value={firmware} onChange={e => {
                          if (e.target.value === '__add__') { setAddingFirmware(true); setFirmware(''); }
                          else setFirmware(e.target.value);
                        }} style={{ fontSize: 13, marginBottom: (product.appConfigs || []).length > 0 ? 8 : 0 }}>
                          <option value="">— Select or add firmware —</option>
                          {savedFirmwares.map(f => <option key={f.id} value={f.version}>{f.version}</option>)}
                          <option value="__add__">+ Add new firmware version...</option>
                        </select>
                      ) : (
                        <div style={{ display: 'flex', gap: 8, marginBottom: (product.appConfigs || []).length > 0 ? 8 : 0 }}>
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
                      )
                    )}

                    {/* App config */}
                    {(product.appConfigs || []).length > 0 && (
                      <div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>App configuration:</div>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          <button type="button" className={`btn btn-sm ${appConfig === null ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setAppConfigForProduct(product.id, null)} style={{ fontSize: 12 }}>Generic</button>
                          {(product.appConfigs || []).map(ac => (
                            <button type="button" key={ac.id} className={`btn btn-sm ${appConfig?.id === ac.id ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setAppConfigForProduct(product.id, ac)} style={{ fontSize: 12 }}>
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

          <button
            type="submit"
            className="btn btn-primary btn-lg"
            style={{ width: '100%' }}
            disabled={catalog.length === 0 || !sessionType || selectedProducts.length === 0}
          >
            {sessionType ? `Start ${SESSION_TYPE_LABELS[sessionType] || 'Session'}` : 'Start Session'}
          </button>
        </form>
      )}
    </div>
  );
}
