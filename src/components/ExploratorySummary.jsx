import { useState } from 'react';
import { updateSession } from '../lib/api.js';

const OBSERVATION_FIELDS = [
  { key: 'performance', label: 'Performance' },
  { key: 'uiux', label: 'UI / UX' },
  { key: 'bugIssue', label: 'Bug / Issue' },
  { key: 'like', label: 'Like' },
  { key: 'dislike', label: 'Dislike' },
  { key: 'otherNotes', label: 'Other Notes' },
];

const PLATFORM_LABELS = {
  native: 'Native App',
  'our-app': 'Our App',
  both: 'Both',
};

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function Toast({ message, onClose }) {
  return (
    <div style={{
      position: 'fixed', bottom: 24, right: 24,
      background: 'var(--card)', border: '1px solid var(--border)',
      borderRadius: 8, padding: '12px 18px',
      boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
      fontSize: 13, color: 'var(--text)',
      display: 'flex', alignItems: 'center', gap: 10,
      zIndex: 9999,
    }}>
      {message}
      <button className="btn btn-ghost btn-sm" onClick={onClose} style={{ padding: '2px 6px' }}>✕</button>
    </div>
  );
}

export default function ExploratorySummary({ session, onBack, onOpenSession }) {
  const [overallSummary, setOverallSummary] = useState(session.overallSummary || '');
  const [aiSummary, setAiSummary] = useState(session.aiSummary || '');
  const [generatingAi, setGeneratingAi] = useState(false);
  const [envOpen, setEnvOpen] = useState(false);
  const [collapsedCats, setCollapsedCats] = useState({});
  const [savingOverall, setSavingOverall] = useState(false);
  const [toast, setToast] = useState('');

  const env = session.testEnvironment || {};
  const categories = session.categories || [];

  function toggleCat(id) {
    setCollapsedCats(prev => ({ ...prev, [id]: !prev[id] }));
  }

  async function handleOverallBlur() {
    setSavingOverall(true);
    try {
      await updateSession(session.id, { overallSummary });
    } catch (e) {
      console.error('Failed to save summary', e);
    } finally {
      setSavingOverall(false);
    }
  }

  async function handleGenerateAiSummary() {
    setGeneratingAi(true);
    try {
      const res = await fetch(`/api/sessions/${session.id}/ai-summary`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!res.ok) throw new Error('AI summary failed');
      const data = await res.json();
      setAiSummary(data.aiSummary || '');
    } catch (e) {
      setToast('AI summary unavailable — check your API key in Settings.');
    } finally {
      setGeneratingAi(false);
    }
  }

  function handleExport() {
    setToast('Export coming soon');
  }

  const hasEnvData = Object.values(env).some(v => v && v.trim());
  const envFields = [
    { label: 'Device', value: env.phoneType },
    { label: 'OS Version', value: env.osVersion },
    { label: 'App Version', value: env.appVersion },
    { label: 'Username', value: env.username },
    { label: 'Device ID', value: env.deviceId },
  ].filter(f => f.value);

  return (
    <div className="session-start" style={{ maxWidth: 780 }}>
      {toast && <Toast message={toast} onClose={() => setToast('')} />}

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
          <div>
            <h1 style={{ margin: 0 }}>{session.productName}</h1>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
              {PLATFORM_LABELS[session.platform] || session.platform}
              {' · '}
              {formatDate(session.createdAt)}
              {session.completedAt && ` · Completed ${formatDate(session.completedAt)}`}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {onOpenSession && session.status !== 'completed' && (
              <button className="btn btn-secondary" onClick={() => onOpenSession(session)}>
                ← Back to Runner
              </button>
            )}
            <button className="btn btn-ghost" onClick={handleExport}>↓ Export</button>
            <button className="btn btn-ghost" onClick={onBack}>← Sessions</button>
          </div>
        </div>

        {/* Test Environment (collapsible) */}
        {hasEnvData && (
          <div style={{ marginTop: 14, background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
            <button
              className="btn btn-ghost"
              style={{ width: '100%', textAlign: 'left', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, borderRadius: 0 }}
              onClick={() => setEnvOpen(v => !v)}
            >
              <span>{envOpen ? '▾' : '▸'}</span>
              Test Environment
            </button>
            {envOpen && (
              <div style={{ padding: '0 14px 12px', display: 'flex', flexWrap: 'wrap', gap: '8px 24px' }}>
                {envFields.map(f => (
                  <div key={f.label} style={{ fontSize: 13 }}>
                    <span style={{ color: 'var(--text-muted)', fontSize: 11, display: 'block' }}>{f.label}</span>
                    {f.value}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Overall Summary */}
      <div className="form-group" style={{ marginBottom: 24 }}>
        <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>Overall Summary</span>
          {savingOverall && <span style={{ fontSize: 11, color: 'var(--primary)', fontWeight: 400, textTransform: 'none' }}>Saving...</span>}
        </label>
        {aiSummary && (
          <div style={{ background: 'var(--primary-dim)', border: '1px solid var(--primary)', borderRadius: 6, padding: '10px 12px', marginBottom: 10, fontSize: 13, whiteSpace: 'pre-wrap', color: 'var(--text)' }}>
            <div style={{ fontSize: 11, color: 'var(--primary)', fontWeight: 700, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>AI Summary</div>
            {aiSummary}
          </div>
        )}
        <textarea
          rows={4}
          value={overallSummary}
          onChange={e => setOverallSummary(e.target.value)}
          onBlur={handleOverallBlur}
          placeholder="Write your overall summary here..."
        />
        {!aiSummary && (
          <button
            className="btn btn-ghost btn-sm"
            style={{ marginTop: 6 }}
            onClick={handleGenerateAiSummary}
            disabled={generatingAi}
          >
            {generatingAi ? 'Generating...' : '✨ Generate AI Summary'}
          </button>
        )}
      </div>

      {/* Per-category cards */}
      {categories.map(cat => {
        const isCollapsed = collapsedCats[cat.id];
        const hasContent = OBSERVATION_FIELDS.some(f => (cat.observations?.[f.key] || '').trim())
          || cat.screenshotUrl || cat.videoUrl;

        return (
          <div
            key={cat.id}
            style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, marginBottom: 14, overflow: 'hidden' }}
          >
            <button
              className="btn btn-ghost"
              style={{ width: '100%', textAlign: 'left', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderRadius: 0, fontSize: 14, fontWeight: 600 }}
              onClick={() => toggleCat(cat.id)}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span>{isCollapsed ? '▸' : '▾'}</span>
                {cat.label}
                {cat.completed && <span style={{ fontSize: 11, color: 'var(--pass)', fontWeight: 400 }}>✓ Complete</span>}
              </div>
              {!hasContent && <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 400 }}>No observations</span>}
            </button>
            {!isCollapsed && hasContent && (
              <div style={{ padding: '0 16px 16px' }}>
                {OBSERVATION_FIELDS.map(field => {
                  const val = (cat.observations?.[field.key] || '').trim();
                  if (!val) return null;
                  return (
                    <div key={field.key} style={{ marginBottom: 12 }}>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>{field.label}</div>
                      <div style={{ fontSize: 14, color: 'var(--text)', whiteSpace: 'pre-wrap' }}>{val}</div>
                    </div>
                  );
                })}
                {cat.screenshotUrl && (
                  <div style={{ marginTop: 8 }}>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Screenshot</div>
                    <a href={cat.screenshotUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, color: 'var(--primary)' }}>
                      {cat.screenshotUrl}
                    </a>
                  </div>
                )}
                {cat.videoUrl && (
                  <div style={{ marginTop: 8 }}>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Video</div>
                    <a href={cat.videoUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, color: 'var(--primary)' }}>
                      {cat.videoUrl}
                    </a>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}

      <div style={{ marginTop: 24, display: 'flex', gap: 10 }}>
        <button className="btn btn-ghost" onClick={onBack}>← Back to Sessions</button>
        {onOpenSession && (
          <button className="btn btn-secondary" onClick={() => onOpenSession(session)}>
            Open Runner
          </button>
        )}
      </div>
    </div>
  );
}
