import { useState, useEffect } from 'react';
import { listSessions, getCatalog, createCatalogEntry, updateCatalogEntry, deleteCatalogEntry, getSettings, saveSettings } from './lib/api.js';
import { BUILD_VERSION, BUILD_DATE } from './version.js';
import SessionStart from './components/SessionStart.jsx';
import TestRunner from './components/TestRunner.jsx';
import SessionSummary from './components/SessionSummary.jsx';
import ProductCatalog from './components/ProductCatalog.jsx';
import NewProduct from './components/NewProduct.jsx';
import AnalyticsPage from './components/AnalyticsPage.jsx';
import IssuesPage from './components/IssuesPage.jsx';

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
}

function SettingsModal({ onClose }) {
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
        <div style={{ marginTop: 16, textAlign: 'right' }}>
          <button className="btn btn-ghost" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

function Dashboard({ sessions, catalog, onNew, onOpen, onCatalog, onSettings, onAnalytics, onIssues, loading }) {
  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <div>
          <h1>QA Testing Platform</h1>
          <p>Security hardware testing sessions</p>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button className="btn btn-ghost" onClick={onSettings} title="Settings">⚙️</button>
          <button className="btn btn-ghost" onClick={onAnalytics}>📊 Analytics</button>
          <button className="btn btn-ghost" onClick={onIssues}>🐛 Issues</button>
          <button className="btn btn-secondary" onClick={onCatalog}>
            📦 Product Catalog
          </button>
          <button className="btn btn-primary btn-lg" onClick={onNew}>
            + New Session
          </button>
        </div>
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
      ) : (
        <div className="sessions-list">
          {sessions.map(s => (
            <div key={s.id} className="session-card" onClick={() => onOpen(s.id)}>
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
              </div>
              <div className="session-card-right">
                <span className={`badge badge-${s.status}`}>{s.status}</span>
              </div>
            </div>
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
  }, []);

  async function handleOpenSession(id) {
    try {
      const { getSession } = await import('./lib/api.js');
      const session = await getSession(id);
      setCurrentSession(session);
      if (session.status === 'completed') {
        setView('summary');
      } else {
        setView('runner');
      }
    } catch (e) {
      console.error(e);
    }
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
    setView('dashboard');
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
      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
      <div style={{ position: 'fixed', bottom: 8, right: 12, fontSize: 11, color: 'var(--text-muted)', opacity: 0.5, pointerEvents: 'none', userSelect: 'none', zIndex: 9999 }}>
        {BUILD_VERSION} · {BUILD_DATE}
      </div>

      {view === 'dashboard' && (
        <Dashboard
          sessions={sessions}
          catalog={catalog}
          loading={loadingSessions}
          onNew={() => setView('sessionStart')}
          onOpen={handleOpenSession}
          onCatalog={() => setView('catalog')}
          onSettings={() => setShowSettings(true)}
          onAnalytics={() => setView('analytics')}
          onIssues={() => setView('issues')}
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
          />
        </div>
      )}

      {view === 'sessionStart' && (
        <SessionStart
          catalog={catalog}
          onBack={() => setView('dashboard')}
          onCreated={handleSessionCreated}
          onGoToCatalog={() => setView('catalog')}
        />
      )}

      {view === 'runner' && currentSession && (
        <TestRunner
          session={currentSession}
          onUpdate={handleSessionUpdated}
          onEnd={handleEndSession}
          onExit={() => { setView('dashboard'); setCurrentSession(null); refreshSessions(); }}
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
          onBack={() => setView('dashboard')}
          onGoToIssues={(product) => {
            setView('issues');
          }}
        />
      )}

      {view === 'issues' && (
        <IssuesPage
          onBack={() => setView('dashboard')}
        />
      )}
    </div>
  );
}
