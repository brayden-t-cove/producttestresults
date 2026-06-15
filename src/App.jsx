import { useState, useEffect } from 'react';
import { listSessions, getCatalog, createCatalogEntry, updateCatalogEntry, deleteCatalogEntry, getSettings, saveSettings, getSpecSchema, saveSpecSchema, getCertSchema, saveCertSchema } from './lib/api.js';
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

function SessionCard({ s, onOpen }) {
  const [expanded, setExpanded] = useState(false);
  const sectionFailures = getSectionFailures(s);

  return (
    <div className="session-card" onClick={() => onOpen(s.id)}>
      <div className="session-card-info">
        <h3>{s.productName}</h3>
        {s.appConfigName && (
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>{s.appConfigName}</div>
        )}
        <div className="session-card-meta">
          <span>{formatDate(s.date)}</span>
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

function HomePage({ onCatalog, onTesting, onIssues, onSettings }) {
  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <div>
          <h1>QA Testing Platform</h1>
          <p>Security hardware testing</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-ghost" onClick={onSettings} title="Settings">⚙️</button>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 20, marginTop: 24, flexWrap: 'wrap' }}>
        <div className="session-type-card" onClick={onCatalog} style={{ flex: '1 1 220px', cursor: 'pointer' }}>
          <div style={{ fontSize: 32, marginBottom: 10 }}>📦</div>
          <h3 style={{ marginBottom: 6 }}>Product Catalog</h3>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>Manage your product inventory</p>
        </div>
        <div className="session-type-card" onClick={onTesting} style={{ flex: '1 1 220px', cursor: 'pointer' }}>
          <div style={{ fontSize: 32, marginBottom: 10 }}>🧪</div>
          <h3 style={{ marginBottom: 6 }}>Product Testing</h3>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>Run test sessions and view results</p>
        </div>
        <div className="session-type-card" onClick={onIssues} style={{ flex: '1 1 220px', cursor: 'pointer' }}>
          <div style={{ fontSize: 32, marginBottom: 10 }}>🐛</div>
          <h3 style={{ marginBottom: 6 }}>Issues</h3>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>View and track all active issues</p>
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

function ProductTestingPage({ sessions, catalog, onNew, onNewExploratory, onNewComparison, onOpen, onCatalog, onSettings, onAnalytics, onIssues, onBack, loading }) {
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
          <button className="btn btn-ghost" onClick={onBack}>← Back</button>
          <button className="btn btn-ghost" onClick={onSettings} title="Settings">⚙️</button>
          <button className="btn btn-ghost" onClick={onAnalytics}>📊 Analytics</button>
          <button className="btn btn-ghost" onClick={onIssues}>🐛 Issues</button>
          <button className="btn btn-secondary" onClick={onNewExploratory}>
            + Exploratory
          </button>
          <button className="btn btn-secondary" onClick={onNewComparison}>
            + Compare
          </button>
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
            <SessionCard key={s.id} s={s} onOpen={onOpen} />
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
    setCurrentSession(session);
    setView('exploratoryRunner');
    refreshSessions();
  }

  async function handleExploratoryUpdate(updatedSession) {
    setCurrentSession(updatedSession);
  }

  function handleExploratoryFinish(session) {
    setCurrentSession(session || currentSession);
    setView('exploratorySummary');
    refreshSessions();
  }

  function handleSessionCreated(session) {
    setCurrentSession(session);
    setView('runner');
    refreshSessions();
  }

  function handleSessionUpdated(session) {
    setCurrentSession(session);
  }

  function handleEndSession(session) {
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
    if (productData.id) {
      await updateCatalogEntry(productData.id, productData);
    } else {
      await createCatalogEntry(productData);
    }
    await refreshCatalog();
    setEditingProduct(null);
    setView('catalog');
  }

  async function handleDeleteProduct(id) {
    await deleteCatalogEntry(id);
    await refreshCatalog();
  }

  function handleStartTestFromCatalog(product) {
    setView('sessionStart');
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

  return (
    <div className="app-layout">
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

      {view === 'dashboard' && (
        <HomePage
          onCatalog={() => setView('catalog')}
          onTesting={() => setView('testing')}
          onIssues={() => setView('issues')}
          onSettings={() => setShowSettings(true)}
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
          />
        </div>
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
    </div>
  );
}
