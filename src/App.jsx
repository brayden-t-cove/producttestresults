import { useState, useEffect } from 'react';
import { listSessions, getCatalog, createCatalogEntry, updateCatalogEntry, deleteCatalogEntry } from './lib/api.js';
import { BUILD_VERSION, BUILD_DATE } from './version.js';
import SessionStart from './components/SessionStart.jsx';
import TestRunner from './components/TestRunner.jsx';
import SessionSummary from './components/SessionSummary.jsx';
import ProductCatalog from './components/ProductCatalog.jsx';
import NewProduct from './components/NewProduct.jsx';

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
}

function Dashboard({ sessions, catalog, onNew, onOpen, onCatalog, loading }) {
  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <div>
          <h1>QA Testing Platform</h1>
          <p>Security hardware testing sessions</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-secondary" onClick={onCatalog}>
            📦 Product Catalog
          </button>
          <button
            className="btn btn-primary btn-lg"
            onClick={onNew}
          >
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

  return (
    <div className="app-layout">
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
          />
        </div>
      )}

      {(view === 'newProduct' || view === 'editProduct') && (
        <div className="dashboard">
          <NewProduct
            product={editingProduct}
            onSave={handleSaveProduct}
            onBack={() => setView('catalog')}
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
          allSessions={sessions}
        />
      )}

      {view === 'summary' && currentSession && (
        <SessionSummary
          session={currentSession}
          onBack={handleBackToDashboard}
        />
      )}
    </div>
  );
}
