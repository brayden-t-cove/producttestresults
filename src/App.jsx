import { useState, useEffect } from 'react';
import { listSessions } from './lib/api.js';
import SessionStart from './components/SessionStart.jsx';
import TestRunner from './components/TestRunner.jsx';
import SessionSummary from './components/SessionSummary.jsx';

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
}

function Dashboard({ sessions, onNew, onOpen, loading }) {
  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <div>
          <h1>QA Testing Platform</h1>
          <p>Security hardware testing sessions</p>
        </div>
        <button className="btn btn-primary btn-lg" onClick={onNew}>
          + New Session
        </button>
      </div>

      {loading ? (
        <div className="ai-loading"><div className="spinner spinner-lg" /></div>
      ) : sessions.length === 0 ? (
        <div className="empty-state">
          <h3>No sessions yet</h3>
          <p>Start your first QA testing session to get going.</p>
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

  useEffect(() => {
    refreshSessions();
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

  return (
    <div className="app-layout">
      {view === 'dashboard' && (
        <Dashboard
          sessions={sessions}
          loading={loadingSessions}
          onNew={() => setView('sessionStart')}
          onOpen={handleOpenSession}
        />
      )}
      {view === 'sessionStart' && (
        <SessionStart
          onBack={() => setView('dashboard')}
          onCreated={handleSessionCreated}
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
