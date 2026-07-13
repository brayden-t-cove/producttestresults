import { useState, useEffect } from 'react';
import { listSessions, getCatalog, createCatalogEntry, updateCatalogEntry, deleteCatalogEntry, deleteSession, getSettings, saveSettings, getSpecSchema, saveSpecSchema, getCertSchema, saveCertSchema } from './lib/api.js';
import { getMe, logout } from './lib/authApi.js';
import LoginPage from './components/LoginPage.jsx';
import AdminPanel from './components/AdminPanel.jsx';
import Particles from './components/Particles.jsx';
import VendorLibrary from './components/VendorLibrary.jsx';
import CatalogImport from './components/CatalogImport.jsx';
import { CAPABILITY_GROUPS } from './data/capabilities.js';
import { BUILD_VERSION, BUILD_DATE } from './version.js';
import SessionStart from './components/SessionStart.jsx';
import TestRunner from './components/TestRunner.jsx';
import SessionSummary from './components/SessionSummary.jsx';
import ExploratoryStart from './components/ExploratoryStart.jsx';
import ExploratoryRunner from './components/ExploratoryRunner.jsx';
import ExploratorySummary from './components/ExploratorySummary.jsx';
import ComparisonBuilder from './components/ComparisonBuilder.jsx';
import ComparisonView from './components/ComparisonView.jsx';
import ProductCatalog from './components/ProductCatalog.jsx';
import NewProduct from './components/NewProduct.jsx';
import AnalyticsPage from './components/AnalyticsPage.jsx';
import IssuesPage from './components/IssuesPage.jsx';
import SchemaEditor from './components/SchemaEditor.jsx';
import CertEditor from './components/CertEditor.jsx';
import ProductDetail from './components/ProductDetail.jsx';

// ── SVG Icons ─────────────────────────────────────────────────────────────────

const IconCatalog = () => (
  <svg className="top-nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/>
    <rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>
  </svg>
);
const IconTesting = () => (
  <svg className="top-nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 3h6v7l3 10H6L9 10V3z"/><line x1="9" y1="3" x2="15" y2="3"/>
  </svg>
);
const IconIssues = () => (
  <svg className="top-nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="9"/><line x1="12" y1="8" x2="12" y2="12"/>
    <circle cx="12" cy="16" r="0.5" fill="currentColor" stroke="none"/>
  </svg>
);
const IconVendors = () => (
  <svg className="top-nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 9l9-6 9 6v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
    <polyline points="9 22 9 12 15 12 15 22"/>
  </svg>
);
const IconAnalytics = () => (
  <svg className="top-nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="12" width="4" height="9" rx="1"/><rect x="10" y="7" width="4" height="14" rx="1"/>
    <rect x="17" y="4" width="4" height="17" rx="1"/>
  </svg>
);
const IconSettings = () => (
  <svg className="top-nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3"/>
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
  </svg>
);

// ── Top Nav ───────────────────────────────────────────────────────────────────

const TOP_LEVEL_VIEWS = {
  dashboard: 'dashboard',
  catalog: 'catalog', productDetail: 'catalog', newProduct: 'catalog', editProduct: 'catalog',
  schemaEditor: 'catalog', certEditor: 'catalog', catalogImport: 'catalog',
  testing: 'testing', sessionStart: 'testing', runner: 'testing', summary: 'testing',
  exploratoryStart: 'testing', exploratoryRunner: 'testing', exploratorySummary: 'testing',
  comparisonBuilder: 'testing', comparisonView: 'testing',
  issues: 'issues',
  analytics: 'analytics',
  vendors: 'vendors',
};

function TopNav({ view, onDashboard, onTesting, onCatalog, onIssues, onAnalytics, onVendors, onSettings, currentUser, authEnabled, onAdmin, onLogout }) {
  const active = TOP_LEVEL_VIEWS[view] || 'dashboard';
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  return (
    <nav className="top-nav">
      <div className="top-nav-brand">
        <span className="top-nav-brand-dot" />
        Odyssey
      </div>
      <div className="top-nav-links">
        <button className={`top-nav-link${active === 'dashboard' ? ' active' : ''}`} onClick={onDashboard}>
          Home
        </button>
        <button className={`top-nav-link${active === 'catalog' ? ' active' : ''}`} onClick={onCatalog}>
          <IconCatalog /> Catalog
        </button>
        <button className={`top-nav-link${active === 'testing' ? ' active' : ''}`} onClick={onTesting}>
          <IconTesting /> Testing
        </button>
        <button className={`top-nav-link${active === 'vendors' ? ' active' : ''}`} onClick={onVendors}>
          <IconVendors /> Vendors
        </button>
        <button className={`top-nav-link${active === 'issues' ? ' active' : ''}`} onClick={onIssues}>
          <IconIssues /> Issues
        </button>
        <button className={`top-nav-link${active === 'analytics' ? ' active' : ''}`} onClick={onAnalytics}>
          <IconAnalytics /> Analytics
        </button>
      </div>
      <div className="top-nav-actions">
        <button className="top-nav-link" onClick={onSettings} title="Settings">
          <IconSettings />
        </button>
        {authEnabled && currentUser && (
          <div style={{ position: 'relative' }}>
            <button
              className="top-nav-user-btn"
              onClick={() => setUserMenuOpen(v => !v)}
              title={currentUser.name}
            >
              {currentUser.avatar
                ? <img src={currentUser.avatar} alt="" className="top-nav-avatar" />
                : <span className="top-nav-avatar-initials">{currentUser.name?.[0]?.toUpperCase()}</span>}
            </button>
            {userMenuOpen && (
              <div className="user-menu" onClick={() => setUserMenuOpen(false)}>
                <div className="user-menu-header">
                  <div style={{ fontWeight: 700, fontSize: 13 }}>{currentUser.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{currentUser.email}</div>
                  <div style={{ fontSize: 11, marginTop: 3 }}>
                    <span className={`role-badge role-${currentUser.role}`}>{currentUser.role}</span>
                    {currentUser.entity && <span style={{ color: 'var(--text-muted)', marginLeft: 6 }}>{currentUser.entity}</span>}
                  </div>
                </div>
                {currentUser.role === 'superuser' && (
                  <button className="user-menu-item" onClick={onAdmin}>Admin Panel</button>
                )}
                <button className="user-menu-item user-menu-item-danger" onClick={onLogout}>Sign out</button>
              </div>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
}

function SettingsModal({ onClose, onOpenSchemaEditor, onOpenCertEditor }) {
  const [apiKey, setApiKey] = useState('');
  const [preview, setPreview] = useState(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    getSettings().then(d => { if (d.apiKeyPreview) setPreview(d.apiKeyPreview); }).catch(() => {});
  }, []);

  async function handleSave(e) {
    e.preventDefault();
    if (!apiKey.trim()) return;
    setSaving(true); setMsg('');
    try {
      const result = await saveSettings(apiKey.trim());
      setPreview(result.apiKeyPreview);
      setApiKey('');
      setMsg('✓ API key saved — AI features are now active.');
    } catch {
      setMsg('Failed to save. Try again.');
    } finally { setSaving(false); }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 480 }}>
        <h2 style={{ marginBottom: 16 }}>⚙️ Settings</h2>
        <div className="form-group">
          <label>Anthropic API Key</label>
          {preview && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>Current: <code>{preview}</code></div>}
          <form onSubmit={handleSave} style={{ display: 'flex', gap: 8 }}>
            <input
              type="password"
              placeholder="sk-ant-..."
              value={apiKey}
              onChange={e => setApiKey(e.target.value)}
              style={{ flex: 1 }}
              autoComplete="off"
            />
            <button className="btn btn-primary" disabled={saving || !apiKey.trim()}>
              {saving ? 'Saving...' : 'Save'}
            </button>
          </form>
          {msg && <div style={{ fontSize: 13, marginTop: 8, color: msg.startsWith('✓') ? 'var(--pass)' : 'var(--fail)' }}>{msg}</div>}
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>
            Used for AI features: test population, issue suggestions, repro steps, session summaries. Saved to your local .env file.
          </p>
        </div>
        <div className="settings-schema-section">
          <div style={{ fontWeight: 600, marginBottom: 6 }}>Schema &amp; Fields</div>
          <div className="settings-schema-buttons">
            <button className="btn btn-ghost" onClick={onOpenSchemaEditor}>🗂 Edit Spec Fields</button>
            <button className="btn btn-ghost" onClick={onOpenCertEditor}>🏷 Edit Cert Fields</button>
          </div>
        </div>
        <div style={{ marginTop: 16, textAlign: 'right' }}>
          <button className="btn btn-ghost" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

function getSectionFailures(session) {
  const testCases = session.testCases || [];
  if (testCases.length === 0) return [];
  const groups = CAPABILITY_GROUPS[session.category] || [];
  const sectionMap = {};
  for (const test of testCases) {
    const num = test.testNumber || '';
    const parts = num.split('.');
    const sectionNum = parseInt(parts[0], 10);
    let sectionLabel;
    if (isNaN(sectionNum) || sectionNum === 0) {
      sectionLabel = 'General';
    } else {
      const grp = groups[sectionNum - 1];
      sectionLabel = grp ? grp.label : `Section ${sectionNum}`;
    }
    const key = isNaN(sectionNum) ? 'general' : String(sectionNum);
    if (!sectionMap[key]) {
      sectionMap[key] = { sectionLabel, sectionIndex: isNaN(sectionNum) ? 0 : sectionNum, failCount: 0 };
    }
    if (test.status === 'fail') sectionMap[key].failCount++;
  }
  return Object.values(sectionMap)
    .filter(s => s.failCount > 0)
    .sort((a, b) => a.sectionIndex - b.sectionIndex);
}

function SessionCard({ s, onOpen, onDelete }) {
  const [expanded, setExpanded] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const sectionFailures = getSectionFailures(s);

  return (
    <div className="session-card" onClick={() => onOpen(s.id)}>
      <div className="session-card-info">
        <h3>{s.sessionName || s.productName}</h3>
        {s.sessionName && (
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>{s.productName}</div>
        )}
        {s.appConfigName && (
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>{s.appConfigName}</div>
        )}
        <div className="session-card-meta">
          <span>{s.createdAt ? new Date(s.createdAt).toLocaleString([], { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : formatDate(s.date)}</span>
          {s.testerName && <span style={{ color: 'var(--primary)', fontWeight: 500 }}>👤 {s.testerName}</span>}
          {s.issueCount > 0 && (
            <span className="issue-count">{s.issueCount} issue{s.issueCount !== 1 ? 's' : ''}</span>
          )}
        </div>
        {sectionFailures.length > 0 && (
          <div style={{ marginTop: 6 }}>
            <button
              className="btn btn-ghost btn-sm"
              style={{ fontSize: 11, padding: '2px 8px', color: 'var(--text-muted)' }}
              onClick={e => { e.stopPropagation(); setExpanded(v => !v); }}
            >
              {expanded ? '▾' : '▸'} {sectionFailures.length} section{sectionFailures.length !== 1 ? 's' : ''} with failures
            </button>
            {expanded && (
              <div style={{ marginTop: 4, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {sectionFailures.map(sec => (
                  <span key={sec.sectionLabel} style={{ fontSize: 11, background: 'var(--fail-bg, rgba(239,68,68,0.1))', color: 'var(--fail)', borderRadius: 4, padding: '2px 8px' }}>
                    {sec.sectionLabel}: {sec.failCount} fail
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
      <div className="session-card-right" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
        <button
          className="btn btn-ghost btn-sm"
          style={{ fontSize: 11, padding: '2px 8px' }}
          title="Export test results as CSV"
          onClick={e => {
            e.stopPropagation();
            const isExploratory = s.testPlan === 'exploratory';
            const a = document.createElement('a');
            a.href = isExploratory ? `/api/sessions/${s.id}/export/exploratory-csv` : `/api/sessions/${s.id}/export/csv`;
            a.download = isExploratory ? `exploratory-${s.id}.csv` : `session-${s.id}.csv`;
            a.click();
          }}
        >↓ CSV</button>
        {confirmDelete ? (
          <span style={{ display: 'flex', gap: 4 }} onClick={e => e.stopPropagation()}>
            <button className="btn btn-danger btn-sm" style={{ fontSize: 11, padding: '2px 8px' }} onClick={e => { e.stopPropagation(); onDelete(s.id); }}>Confirm</button>
            <button className="btn btn-ghost btn-sm" style={{ fontSize: 11, padding: '2px 8px' }} onClick={e => { e.stopPropagation(); setConfirmDelete(false); }}>Cancel</button>
          </span>
        ) : (
          <button className="btn btn-ghost btn-sm" style={{ fontSize: 11, padding: '2px 8px', color: 'var(--fail)' }} onClick={e => { e.stopPropagation(); setConfirmDelete(true); }} title="Delete session">✕ Delete</button>
        )}
        <span className={`badge badge-${s.status}`}>{s.status}</span>
        {s.testPlan === 'vendor-eval' && (
          <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 3, background: '#ede9fe', color: '#6d28d9', letterSpacing: '0.06em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
            Vendor Eval
          </span>
        )}
        {s.testPlan === 'exploratory' && (
          <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 3, background: 'rgba(16,185,129,0.12)', color: '#059669', letterSpacing: '0.06em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
            Exploratory
          </span>
        )}
        {s.products && s.products.length > 1 && (
          <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 3, background: 'rgba(99,102,241,0.12)', color: 'var(--primary)', letterSpacing: '0.06em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
            {s.products.length} products
          </span>
        )}
      </div>
    </div>
  );
}

const IconCardCatalog = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--primary)' }}>
    <rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/>
    <rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>
  </svg>
);
const IconCardTesting = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--primary)' }}>
    <path d="M9 3h6v7l3 10H6L9 10V3z"/><line x1="9" y1="3" x2="15" y2="3"/>
  </svg>
);
const IconCardIssues = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--primary)' }}>
    <circle cx="12" cy="12" r="9"/><line x1="12" y1="8" x2="12" y2="12"/>
    <circle cx="12" cy="16" r="0.75" fill="currentColor" stroke="none"/>
  </svg>
);
const IconCardAnalytics = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--primary)' }}>
    <rect x="3" y="12" width="4" height="9" rx="1"/><rect x="10" y="7" width="4" height="14" rx="1"/>
    <rect x="17" y="4" width="4" height="17" rx="1"/>
  </svg>
);

const IconCardVendors = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--primary)' }}>
    <path d="M3 9l9-6 9 6v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
    <polyline points="9 22 9 12 15 12 15 22"/>
  </svg>
);

function HomePage({ onCatalog, onTesting, onIssues, onAnalytics, onVendors }) {
  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <div>
          <h1>Odyssey</h1>
          <p>Security hardware testing &amp; evaluation</p>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16, marginTop: 8 }}>
        <div className="session-type-card" onClick={onCatalog} style={{ cursor: 'pointer', padding: '20px 20px' }}>
          <div style={{ marginBottom: 14 }}><IconCardCatalog /></div>
          <h3 style={{ marginBottom: 6 }}>Product Catalog</h3>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0, lineHeight: 1.5 }}>Manage and browse your product inventory</p>
        </div>
        <div className="session-type-card" onClick={onTesting} style={{ cursor: 'pointer', padding: '20px 20px' }}>
          <div style={{ marginBottom: 14 }}><IconCardTesting /></div>
          <h3 style={{ marginBottom: 6 }}>Product Testing</h3>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0, lineHeight: 1.5 }}>Run test sessions and track results</p>
        </div>
        <div className="session-type-card" onClick={onVendors} style={{ cursor: 'pointer', padding: '20px 20px' }}>
          <div style={{ marginBottom: 14 }}><IconCardVendors /></div>
          <h3 style={{ marginBottom: 6 }}>Vendor Library</h3>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0, lineHeight: 1.5 }}>Track companies, catalog links, and contacts</p>
        </div>
        <div className="session-type-card" onClick={onIssues} style={{ cursor: 'pointer', padding: '20px 20px' }}>
          <div style={{ marginBottom: 14 }}><IconCardIssues /></div>
          <h3 style={{ marginBottom: 6 }}>Issues</h3>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0, lineHeight: 1.5 }}>View and track all open issues</p>
        </div>
        <div className="session-type-card" onClick={onAnalytics} style={{ cursor: 'pointer', padding: '20px 20px' }}>
          <div style={{ marginBottom: 14 }}><IconCardAnalytics /></div>
          <h3 style={{ marginBottom: 6 }}>Analytics</h3>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0, lineHeight: 1.5 }}>Pass rates, trends, and team metrics</p>
        </div>
      </div>
    </div>
  );
}

function classifySession(s, catalog) {
  if (s.testPlan === 'vendor-eval') return 'evaluation';
  if (s.testPlan === 'exploratory') return 'production';
  const product = catalog.find(p => p.id === s.catalogId || p.name === s.productName);
  if (product && (product.type === 'sample' || product.type === 'prototype')) return 'evaluation';
  if (product && product.status === 'in-development') return 'development';
  return 'production';
}

function ProductTestingPage({ sessions, catalog, onNew, onNewExploratory, onNewComparison, onOpen, onDelete, onCatalog, onSettings, onAnalytics, onIssues, onBack, loading }) {
  const [activeTab, setActiveTab] = useState('production');

  const productionSessions = sessions.filter(s => classifySession(s, catalog) === 'production');
  const developmentSessions = sessions.filter(s => classifySession(s, catalog) === 'development');
  const evaluationSessions = sessions.filter(s => classifySession(s, catalog) === 'evaluation');

  const tabSessions = activeTab === 'production' ? productionSessions
    : activeTab === 'development' ? developmentSessions
    : evaluationSessions;

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <div>
          <h1>Product Testing</h1>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {activeTab === 'evaluation' && (
            <>
              <button className="btn btn-secondary" onClick={onNewExploratory}>
                + Exploratory
              </button>
              <button className="btn btn-secondary" onClick={onNewComparison}>
                + Compare
              </button>
            </>
          )}
          <button className="btn btn-primary btn-lg" onClick={onNew}>
            + New Session
          </button>
        </div>
      </div>

      <div className="product-tabs" style={{ marginBottom: 16 }}>
        <button
          className={`product-tab${activeTab === 'production' ? ' active' : ''}`}
          onClick={() => setActiveTab('production')}
        >
          Production ({productionSessions.length})
        </button>
        <button
          className={`product-tab${activeTab === 'development' ? ' active' : ''}`}
          onClick={() => setActiveTab('development')}
        >
          Development ({developmentSessions.length})
        </button>
        <button
          className={`product-tab${activeTab === 'evaluation' ? ' active' : ''}`}
          onClick={() => setActiveTab('evaluation')}
        >
          Evaluation ({evaluationSessions.length})
        </button>
      </div>

      {loading ? (
        <div className="ai-loading"><div className="spinner spinner-lg" /></div>
      ) : sessions.length === 0 ? (
        <div className="empty-state">
          <h3>No sessions yet</h3>
          <p>Start your first QA testing session to get going.</p>
          {catalog.length === 0 && (
            <p style={{ marginTop: 8, fontSize: 13 }}>
              First, add a product to your{' '}
              <button
                className="btn btn-ghost btn-sm"
                style={{ display: 'inline', padding: '2px 6px' }}
                onClick={onCatalog}
              >
                Product Catalog
              </button>.
            </p>
          )}
        </div>
      ) : tabSessions.length === 0 ? (
        <div className="empty-state">
          <p>No sessions here yet.</p>
        </div>
      ) : (
        <div className="sessions-list">
          {tabSessions.map(s => (
            <SessionCard key={s.id} s={s} onOpen={onOpen} onDelete={onDelete} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [view, setView] = useState('dashboard');
  const [currentSession, setCurrentSession] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [catalog, setCatalog] = useState([]);
  const [editingProduct, setEditingProduct] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [specSchema, setSpecSchema] = useState(null);
  const [certSchema, setCertSchema] = useState(null);
  const [currentProduct, setCurrentProduct] = useState(null);
  const [currentComparison, setCurrentComparison] = useState(null);
  const [comparisonPreselectedId, setComparisonPreselectedId] = useState(null);

  // Auth
  const [currentUser, setCurrentUser] = useState(null);
  const [authEnabled, setAuthEnabled] = useState(false);
  const [authProviders, setAuthProviders] = useState({});
  const [authLoading, setAuthLoading] = useState(true);
  const [showAdmin, setShowAdmin] = useState(false);

  useEffect(() => {
    getMe().then(({ user, authEnabled: ae, providers }) => {
      setCurrentUser(user);
      setAuthEnabled(ae);
      setAuthProviders(providers || {});
      setAuthLoading(false);
    }).catch(() => setAuthLoading(false));
  }, []);

  async function handleLogout() {
    await logout();
    setCurrentUser(null);
  }

  const canEdit = !authEnabled || (currentUser && ['editor', 'superuser'].includes(currentUser.role));

  async function refreshSessions() {
    try {
      setLoadingSessions(true);
      const data = await listSessions();
      setSessions(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingSessions(false);
    }
  }

  async function refreshCatalog() {
    try {
      const data = await getCatalog();
      setCatalog(data);
    } catch (e) {
      console.error(e);
    }
  }

  useEffect(() => {
    refreshSessions();
    refreshCatalog();
    getSpecSchema().then(setSpecSchema).catch(() => {});
    getCertSchema().then(setCertSchema).catch(() => {});

    const resumeId = sessionStorage.getItem('activeSessionId');
    if (resumeId) {
      import('./lib/api.js').then(({ getSession }) =>
        getSession(resumeId).then(session => {
          if (session && session.status !== 'completed') {
            setCurrentSession(session);
            setView(session.testPlan === 'exploratory' ? 'exploratoryRunner' : 'runner');
          } else {
            sessionStorage.removeItem('activeSessionId');
          }
        }).catch(() => sessionStorage.removeItem('activeSessionId'))
      );
    }
  }, []);

  async function handleOpenSession(id) {
    try {
      const { getSession } = await import('./lib/api.js');
      const session = await getSession(id);
      setCurrentSession(session);
      if (session.testPlan === 'exploratory') {
        if (session.status === 'completed') {
          setView('exploratorySummary');
        } else {
          setView('exploratoryRunner');
        }
      } else if (session.status === 'completed') {
        setView('summary');
      } else {
        setView('runner');
      }
    } catch (e) {
      console.error(e);
    }
  }

  function handleExploratoryCreated(session) {
    sessionStorage.setItem('activeSessionId', session.id);
    setCurrentSession(session);
    setView('exploratoryRunner');
    refreshSessions();
  }

  async function handleExploratoryUpdate(updatedSession) {
    setCurrentSession(updatedSession);
  }

  function handleExploratoryFinish(session) {
    sessionStorage.removeItem('activeSessionId');
    setCurrentSession(session || currentSession);
    setView('exploratorySummary');
    refreshSessions();
  }

  function handleSessionCreated(session) {
    sessionStorage.setItem('activeSessionId', session.id);
    setCurrentSession(session);
    setView('runner');
    refreshSessions();
  }

  function handleSessionUpdated(session) {
    setCurrentSession(session);
  }

  async function handleDeleteSession(id) {
    await deleteSession(id);
    await refreshSessions();
  }

  function handleEndSession(session) {
    sessionStorage.removeItem('activeSessionId');
    setCurrentSession(session);
    setView('summary');
    refreshSessions();
  }

  function handleBackToDashboard() {
    setView('testing');
    setCurrentSession(null);
    refreshSessions();
  }

  async function handleSaveProduct(productData) {
    let savedId = productData.id;
    if (productData.id) {
      await updateCatalogEntry(productData.id, productData);
    } else {
      const created = await createCatalogEntry(productData);
      savedId = created.id;
    }
    if (productData.replacesProductId) {
      const oldProduct = catalog.find(p => p.id === productData.replacesProductId);
      if (oldProduct && oldProduct.supersededBy !== savedId) {
        await updateCatalogEntry(productData.replacesProductId, { ...oldProduct, supersededBy: savedId });
      }
    }
    await refreshCatalog();
    setEditingProduct(null);
    setView('catalog');
  }

  async function handleDeleteProduct(id) {
    await deleteCatalogEntry(id);
    await refreshCatalog();
  }

  function handleStartTestFromCatalog(product, mode) {
    setCurrentProduct(product);
    if (mode === 'exploratory') {
      setView('exploratoryStart');
    } else {
      setView('sessionStart');
    }
  }

  function handleOpenProduct(product) {
    setCurrentProduct(product);
    setView('productDetail');
  }

  function handleDuplicateProduct(product, nextVersion) {
    const duped = {
      ...product,
      id: undefined,
      createdAt: undefined,
      version: nextVersion,
    };
    setEditingProduct(duped);
    setView('newProduct');
  }

  // Show blank while checking auth
  if (authLoading) {
    return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: 'var(--text-muted)' }}>Loading…</div>;
  }

  // Gate behind login if auth is enabled and no user
  if (authEnabled && !currentUser) {
    return <LoginPage providers={authProviders} />;
  }

  // Admin panel overlay
  if (showAdmin && currentUser?.role === 'superuser') {
    return (
      <div className="app-layout">
        <div className="view-content">
          <AdminPanel currentUser={currentUser} onBack={() => setShowAdmin(false)} />
        </div>
      </div>
    );
  }

  return (
    <div className="app-layout">
      <Particles
        particleCount={300}
        particleSpread={8}
        speed={0.12}
        particleColors={['#1c1ccb', '#00b6ff', '#8c13c2']}
        moveParticlesOnHover={false}
        particleBaseSize={60}
        sizeRandomness={0.7}
        cameraDistance={20}
        disableRotation={false}
      />
      {showSettings && (
        <SettingsModal
          onClose={() => setShowSettings(false)}
          onOpenSchemaEditor={() => { setShowSettings(false); setView('schemaEditor'); }}
          onOpenCertEditor={() => { setShowSettings(false); setView('certEditor'); }}
        />
      )}
      <div style={{ position: 'fixed', bottom: 8, right: 12, fontSize: 11, color: 'var(--text-muted)', opacity: 0.5, pointerEvents: 'none', userSelect: 'none', zIndex: 9999 }}>
        {BUILD_VERSION} · {BUILD_DATE}
      </div>

      <TopNav
        view={view}
        onDashboard={() => setView('dashboard')}
        onCatalog={() => setView('catalog')}
        onTesting={() => setView('testing')}
        onVendors={() => setView('vendors')}
        onIssues={() => setView('issues')}
        onAnalytics={() => setView('analytics')}
        onSettings={() => setShowSettings(true)}
        currentUser={currentUser}
        authEnabled={authEnabled}
        onAdmin={() => setShowAdmin(true)}
        onLogout={handleLogout}
      />

      <div key={view} className="view-content">

      {view === 'dashboard' && (
        <HomePage
          onCatalog={() => setView('catalog')}
          onTesting={() => setView('testing')}
          onVendors={() => setView('vendors')}
          onIssues={() => setView('issues')}
          onAnalytics={() => setView('analytics')}
        />
      )}

      {view === 'testing' && (
        <ProductTestingPage
          sessions={sessions}
          catalog={catalog}
          loading={loadingSessions}
          onNew={() => setView('sessionStart')}
          onNewExploratory={() => setView('exploratoryStart')}
          onNewComparison={() => { setComparisonPreselectedId(null); setCurrentComparison(null); setView('comparisonBuilder'); }}
          onOpen={handleOpenSession}
          onDelete={handleDeleteSession}
          onCatalog={() => setView('catalog')}
          onSettings={() => setShowSettings(true)}
          onAnalytics={() => setView('analytics')}
          onIssues={() => setView('issues')}
          onBack={() => setView('dashboard')}
        />
      )}

      {view === 'catalog' && (
        <div className="dashboard">
          <ProductCatalog
            products={catalog}
            onAdd={() => { setEditingProduct(null); setView('newProduct'); }}
            onEdit={product => { setEditingProduct(product); setView('editProduct'); }}
            onStartTest={handleStartTestFromCatalog}
            onDelete={handleDeleteProduct}
            onDuplicate={handleDuplicateProduct}
            onBack={() => setView('dashboard')}
            onView={handleOpenProduct}
            onImport={() => setView('catalogImport')}
          />
        </div>
      )}

      {view === 'catalogImport' && (
        <CatalogImport
          onBack={() => setView('catalog')}
          onImported={refreshCatalog}
        />
      )}

      {view === 'productDetail' && currentProduct && (
        <div className="dashboard product-detail-wrapper">
          <ProductDetail
            product={currentProduct}
            sessions={sessions.filter(s => s.catalogId === currentProduct.id || s.productName === currentProduct.name)}
            onBack={() => { setCurrentProduct(null); setView('catalog'); }}
            onEdit={() => { setEditingProduct(currentProduct); setCurrentProduct(null); setView('editProduct'); }}
            onDelete={async () => { await handleDeleteProduct(currentProduct.id); setCurrentProduct(null); setView('catalog'); }}
            onOpenSession={handleOpenSession}
            onStartComparison={() => {
              setComparisonPreselectedId(currentProduct.id);
              setCurrentComparison(null);
              setView('comparisonBuilder');
            }}
            onOpenComparison={(comp) => {
              setCurrentComparison(comp);
              setView('comparisonView');
            }}
            certSchema={certSchema}
            onCertUpdate={async (productId, certData) => {
              const updated = await updateCatalogEntry(productId, { certifications: certData });
              setCurrentProduct(updated);
              await refreshCatalog();
            }}
            onProductUpdate={async (data) => {
              const updated = await updateCatalogEntry(currentProduct.id, data);
              setCurrentProduct(updated);
              await refreshCatalog();
            }}
            catalog={catalog}
            onViewProduct={handleOpenProduct}
          />
        </div>
      )}

      {view === 'comparisonBuilder' && (
        <div className="dashboard">
          <ComparisonBuilder
            catalog={catalog}
            specSchema={specSchema}
            preselectedCatalogId={comparisonPreselectedId}
            existingComparison={currentComparison}
            onSaved={(comp) => {
              setCurrentComparison(comp);
              setView('comparisonView');
            }}
            onBack={() => {
              if (comparisonPreselectedId) setView('productDetail');
              else setView('testing');
            }}
          />
        </div>
      )}

      {view === 'comparisonView' && currentComparison && (
        <div className="dashboard">
          <ComparisonView
            comparison={currentComparison}
            onEdit={() => setView('comparisonBuilder')}
            onDeleted={() => {
              setCurrentComparison(null);
              setView(currentProduct ? 'productDetail' : 'testing');
            }}
            onBack={() => setView(currentProduct ? 'productDetail' : 'testing')}
          />
        </div>
      )}

      {(view === 'newProduct' || view === 'editProduct') && (
        <div className="dashboard">
          <NewProduct
            product={editingProduct}
            onSave={handleSaveProduct}
            onBack={() => setView('catalog')}
            catalog={catalog}
            specSchema={specSchema}
            currentUser={currentUser}
          />
        </div>
      )}

      {view === 'sessionStart' && (
        <SessionStart
          catalog={catalog}
          onBack={() => setView('testing')}
          onCreated={handleSessionCreated}
          onGoToCatalog={() => setView('catalog')}
        />
      )}

      {view === 'runner' && currentSession && (
        <TestRunner
          session={currentSession}
          onUpdate={handleSessionUpdated}
          onEnd={handleEndSession}
          onExit={() => { setView('testing'); setCurrentSession(null); refreshSessions(); }}
          allSessions={sessions}
        />
      )}

      {view === 'summary' && currentSession && (
        <SessionSummary
          session={currentSession}
          onBack={handleBackToDashboard}
        />
      )}

      {view === 'analytics' && (
        <AnalyticsPage
          onBack={() => setView('testing')}
          onGoToIssues={(product) => {
            setView('issues');
          }}
        />
      )}

      {view === 'issues' && (
        <IssuesPage
          onBack={() => setView('testing')}
        />
      )}

      {view === 'vendors' && (
        <VendorLibrary
          catalog={catalog}
          onBack={() => setView('dashboard')}
        />
      )}

      {view === 'schemaEditor' && (
        <div className="dashboard">
          <SchemaEditor
            schema={specSchema || {}}
            onSave={async (newSchema) => {
              await saveSpecSchema(newSchema);
              setSpecSchema(newSchema);
              setView('dashboard');
            }}
            onBack={() => setView('dashboard')}
          />
        </div>
      )}

      {view === 'certEditor' && (
        <div className="dashboard">
          <CertEditor
            schema={certSchema || {}}
            onSave={async (newSchema) => {
              await saveCertSchema(newSchema);
              setCertSchema(newSchema);
              setView('dashboard');
            }}
            onBack={() => setView('dashboard')}
          />
        </div>
      )}

      {view === 'exploratoryStart' && (
        <ExploratoryStart
          catalog={catalog}
          onBack={() => setView('testing')}
          onCreated={handleExploratoryCreated}
        />
      )}

      {view === 'exploratoryRunner' && currentSession && (
        <ExploratoryRunner
          session={currentSession}
          onUpdate={handleExploratoryUpdate}
          onFinish={handleExploratoryFinish}
          onBack={() => { setView('testing'); setCurrentSession(null); refreshSessions(); }}
        />
      )}

      {view === 'exploratorySummary' && currentSession && (
        <ExploratorySummary
          session={currentSession}
          onBack={() => { setView('testing'); setCurrentSession(null); refreshSessions(); }}
          onOpenSession={session => {
            setCurrentSession(session);
            setView('exploratoryRunner');
          }}
        />
      )}

      </div>{/* end view-content */}
    </div>
  );
}
