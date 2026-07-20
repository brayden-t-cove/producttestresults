import { useState } from 'react';
import { createSession } from '../lib/api.js';

const CATEGORY_ICONS = {
  hub: '🏠',
  touchpad: '⌨️',
  camera: '📷',
  sensor: '📡',
  app: '📱',
};

const CATEGORY_LABELS = {
  hub: 'Hub',
  touchpad: 'Touchpad',
  camera: 'Camera',
  sensor: 'Sensor',
  app: 'App',
};

const PLATFORM_OPTIONS = [
  { id: 'native', label: 'Native App' },
  { id: 'our-app', label: 'Our App' },
  { id: 'both', label: 'Both' },
];

const DEFAULT_CATEGORIES = [
  { id: 'packaging-unboxing', label: 'Packaging & Unboxing', description: 'First impressions of the retail/sample packaging, unboxing experience, included accessories, documentation quality, and physical hardware inspection — form factor, build quality, ports, buttons, and overall aesthetics.' },
  { id: 'account-creation', label: 'Account Creation', description: 'Sign-up flow, email verification, password requirements, onboarding screens, and any friction encountered creating a new account from scratch.' },
  { id: 'device-setup-pairing', label: 'Device Setup & Pairing', description: 'App-guided device enrollment: QR code scanning, Wi-Fi configuration, device naming, and the overall quality of the in-app setup flow from pairing start to first successful connection.' },
  { id: 'installation-mounting', label: 'Installation & Mounting', description: 'Physical installation experience: mount hardware quality, cable routing, weatherproofing, placement flexibility, screw sizing, and any in-app mounting guidance or placement recommendations provided by the vendor.' },
  { id: 'live-feed', label: 'Live Feed', description: 'Real-time video stream quality, latency, resolution, night vision, audio, pan/tilt performance if applicable, and reliability of the live view on both the native platform and our app.' },
  { id: 'playback', label: 'Playback & Notifications', description: 'Recorded footage access and quality: event-based vs. continuous recording, scrubbing UX, clip download, cloud vs. local storage experience, and any gaps or reliability issues in recordings.' },
  { id: 'settings', label: 'Settings', description: 'Depth and usability of device and account settings: motion sensitivity, notification controls, recording schedules, firmware updates, privacy options, and how intuitive the settings architecture is.' },
  { id: 'power-battery', label: 'Power & Battery Performance', description: 'Battery life under normal and heavy usage, charge time, power consumption, solar charging effectiveness (if applicable), low-battery behavior, and any power-related app notifications or indicators.' },
  { id: 'auxiliary-other', label: 'Auxiliary / Other', description: 'Anything else worth noting that doesn\'t fit the categories above — unexpected behaviors, standout moments, comparisons to similar products, or general impressions.' },
];

function buildCategories(selectedIds) {
  return DEFAULT_CATEGORIES.filter(c => selectedIds.has(c.id)).map(c => ({
    id: c.id,
    label: c.label,
    description: c.description || '',
    observations: {
      performance: '',
      uiux: '',
      bugIssue: '',
      like: '',
      dislike: '',
      otherNotes: '',
    },
    screenshotUrl: '',
    videoUrl: '',
    completed: false,
  }));
}

export default function ExploratoryStart({ catalog, onCreated, onBack }) {
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [platform, setPlatform] = useState('native');
  const [envOpen, setEnvOpen] = useState(true);
  const [env, setEnv] = useState({
    appName: '',
    phoneType: '',
    osVersion: '',
    appVersion: '',
    username: '',
    password: '',
    deviceId: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState(
    new Set(DEFAULT_CATEGORIES.map(c => c.id))
  );
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const sorted = [...catalog].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  const filteredCatalog = sorted
    .filter(p => !categoryFilter || p.category === categoryFilter)
    .filter(p => {
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (p.name || '').toLowerCase().includes(q)
        || (p.modelNumber || '').toLowerCase().includes(q)
        || (p.manufacturer || '').toLowerCase().includes(q);
    });

  const allCatalogCategories = [...new Set(catalog.map(p => p.category).filter(Boolean))];

  function toggleCategory(id) {
    setSelectedCategoryIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function setEnvField(field, value) {
    setEnv(prev => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!selectedProduct) {
      setError('Please select a product.');
      return;
    }
    if (selectedCategoryIds.size === 0) {
      setError('Please select at least one category.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const session = await createSession({
        testPlan: 'exploratory',
        type: 'exploratory',
        productName: selectedProduct.name,
        catalogId: selectedProduct.id,
        platform,
        testEnvironment: {
          appName: env.appName,
          phoneType: env.phoneType,
          osVersion: env.osVersion,
          appVersion: env.appVersion,
          username: env.username,
          password: env.password,
          deviceId: env.deviceId,
        },
        categories: buildCategories(selectedCategoryIds),
        overallSummary: '',
        status: 'in-progress',
      });
      onCreated(session);
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
          <p>Creating exploratory session...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="session-start">
      <div className="session-start-header">
        <button className="btn btn-ghost btn-sm" onClick={onBack} style={{ marginBottom: 12 }}>
          ← Back
        </button>
        <h1>New Exploratory Session</h1>
        <p>Select a product, choose your platform, and configure your test environment.</p>
      </div>

      <form onSubmit={handleSubmit}>
        {error && <div className="error-msg">{error}</div>}

        {/* Category filter + product picker */}
        <div className="form-group">
          <label>Select Product</label>
          {allCatalogCategories.length > 1 && (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
              <button
                type="button"
                className={`btn btn-sm ${categoryFilter === '' ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setCategoryFilter('')}
              >
                All
              </button>
              {allCatalogCategories.map(cat => (
                <button
                  key={cat}
                  type="button"
                  className={`btn btn-sm ${categoryFilter === cat ? 'btn-primary' : 'btn-ghost'}`}
                  onClick={() => setCategoryFilter(cat)}
                >
                  {CATEGORY_ICONS[cat] || '📦'} {CATEGORY_LABELS[cat] || cat}
                </button>
              ))}
            </div>
          )}
          <input
            type="text"
            placeholder="Search by name, model, or manufacturer…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ marginBottom: 10 }}
          />
          {filteredCatalog.length === 0 ? (
            <div className="error-msg">{catalog.length === 0 ? 'No products found. Add a product to your catalog first.' : 'No products match your search.'}</div>
          ) : (
            <div className="product-picker-grid">
              {filteredCatalog.map(product => {
                const isSelected = selectedProduct?.id === product.id;
                return (
                  <div
                    key={product.id}
                    className={`product-picker-card ${isSelected ? 'selected' : ''}`}
                    onClick={() => setSelectedProduct(product)}
                  >
                    <span style={{ fontSize: 22, lineHeight: 1 }}>{CATEGORY_ICONS[product.category] || '📦'}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text)' }}>{product.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                        {CATEGORY_LABELS[product.category] || product.category}
                        {product.manufacturer ? ` · ${product.manufacturer}` : ''}
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

        {/* Platform selector */}
        <div className="form-group">
          <label>Platform</label>
          <div style={{ display: 'flex', gap: 8 }}>
            {PLATFORM_OPTIONS.map(opt => (
              <button
                key={opt.id}
                type="button"
                className={`btn ${platform === opt.id ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setPlatform(opt.id)}
                style={{ flex: 1 }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Test Environment — collapsible */}
        <div className="form-group">
          <button
            type="button"
            className="btn btn-ghost"
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 0', fontWeight: 600, fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: envOpen ? 10 : 0 }}
            onClick={() => setEnvOpen(v => !v)}
          >
            <span>{envOpen ? '▾' : '▸'}</span>
            <span>Test Environment</span>
          </button>
          {envOpen && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>App Name</label>
                <input
                  type="text"
                  placeholder="e.g. InstaVision, Cove App"
                  value={env.appName}
                  onChange={e => setEnvField('appName', e.target.value)}
                />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Phone / Device Type</label>
                <input
                  type="text"
                  placeholder="e.g. iPhone 15 Pro"
                  value={env.phoneType}
                  onChange={e => setEnvField('phoneType', e.target.value)}
                />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>OS Version</label>
                <input
                  type="text"
                  placeholder="e.g. iOS 17.4"
                  value={env.osVersion}
                  onChange={e => setEnvField('osVersion', e.target.value)}
                />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>App Version</label>
                <input
                  type="text"
                  placeholder="e.g. 3.2.1"
                  value={env.appVersion}
                  onChange={e => setEnvField('appVersion', e.target.value)}
                />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Device ID / DID</label>
                <input
                  type="text"
                  placeholder="e.g. ABC123456"
                  value={env.deviceId}
                  onChange={e => setEnvField('deviceId', e.target.value)}
                />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Account Username</label>
                <input
                  type="text"
                  placeholder="e.g. test@example.com"
                  value={env.username}
                  onChange={e => setEnvField('username', e.target.value)}
                  autoComplete="off"
                />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Account Password</label>
                <div style={{ display: 'flex', gap: 6 }}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Password"
                    value={env.password}
                    onChange={e => setEnvField('password', e.target.value)}
                    autoComplete="new-password"
                    style={{ flex: 1 }}
                  />
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => setShowPassword(v => !v)}
                    style={{ flexShrink: 0 }}
                  >
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Category selector */}
        <div className="form-group">
          <label>Categories to Test</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {DEFAULT_CATEGORIES.map(cat => (
              <label
                key={cat.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  cursor: 'pointer',
                  padding: '8px 12px',
                  background: selectedCategoryIds.has(cat.id) ? 'var(--primary-dim)' : 'var(--card)',
                  borderRadius: 6,
                  border: `1px solid ${selectedCategoryIds.has(cat.id) ? 'var(--primary)' : 'var(--border)'}`,
                  textTransform: 'none',
                  letterSpacing: 0,
                  fontSize: 14,
                  fontWeight: 400,
                  color: 'var(--text)',
                  marginBottom: 0,
                }}
              >
                <input
                  type="checkbox"
                  checked={selectedCategoryIds.has(cat.id)}
                  onChange={() => toggleCategory(cat.id)}
                  style={{ width: 'auto', margin: 0 }}
                />
                {cat.label}
              </label>
            ))}
          </div>
        </div>

        <button
          type="submit"
          className="btn btn-primary btn-lg"
          style={{ width: '100%' }}
          disabled={!selectedProduct || selectedCategoryIds.size === 0}
        >
          Start Exploratory Session
        </button>
      </form>
    </div>
  );
}
