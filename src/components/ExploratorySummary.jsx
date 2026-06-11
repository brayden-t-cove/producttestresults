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

  // TODO: replace with pdfkit server-side generation (POST /api/sessions/:id/export/pdf)
  // for a true file download without requiring the print dialog.
  function handleExport() {
    const env = session.testEnvironment || {};
    const envRows = [
      ['App Name', env.appName],
      ['Device', env.phoneType],
      ['OS Version', env.osVersion],
      ['App Version', env.appVersion],
      ['Username', env.username],
      ['Device ID', env.deviceId],
    ].filter(([, v]) => v);

    const categoriesHtml = (session.categories || []).map(cat => {
      const obsRows = OBSERVATION_FIELDS
        .filter(f => (cat.observations?.[f.key] || '').trim())
        .map(f => `
          <div class="obs-block">
            <div class="obs-label">${f.label}</div>
            <div class="obs-value">${(cat.observations[f.key] || '').replace(/\n/g, '<br>')}</div>
          </div>`).join('');
      const mediaLinks = [
        cat.screenshotUrl && `<a href="${cat.screenshotUrl}">Screenshot</a>`,
        cat.videoUrl && `<a href="${cat.videoUrl}">Video</a>`,
      ].filter(Boolean).join(' · ');

      if (!obsRows && !mediaLinks) return `
        <div class="cat-card">
          <h3>${cat.label}</h3>
          <p class="muted">No observations recorded.</p>
        </div>`;

      return `
        <div class="cat-card">
          <h3>${cat.label}</h3>
          ${cat.description ? `<p class="desc">${cat.description}</p>` : ''}
          ${obsRows}
          ${mediaLinks ? `<div class="media-links">${mediaLinks}</div>` : ''}
        </div>`;
    }).join('');

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Exploratory Report — ${session.productName}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 11pt; color: #111; margin: 0; padding: 24px 32px; }
    h1 { font-size: 18pt; margin: 0 0 4px; }
    h3 { font-size: 12pt; margin: 0 0 8px; border-bottom: 1px solid #ddd; padding-bottom: 6px; }
    .meta { color: #555; font-size: 10pt; margin-bottom: 20px; }
    .section-title { font-size: 9pt; font-weight: 700; text-transform: uppercase; letter-spacing: .05em; color: #888; margin: 24px 0 10px; }
    .env-table { border-collapse: collapse; font-size: 10pt; margin-bottom: 24px; }
    .env-table td { padding: 4px 16px 4px 0; vertical-align: top; }
    .env-table td:first-child { color: #666; font-weight: 600; white-space: nowrap; }
    .summary-box { background: #f5f5f5; border-left: 4px solid #6366f1; padding: 12px 16px; margin-bottom: 24px; font-size: 11pt; white-space: pre-wrap; line-height: 1.6; }
    .cat-card { border: 1px solid #ddd; border-radius: 6px; padding: 16px; margin-bottom: 16px; page-break-inside: avoid; }
    .obs-block { margin-bottom: 12px; }
    .obs-label { font-size: 9pt; font-weight: 700; text-transform: uppercase; letter-spacing: .05em; color: #888; margin-bottom: 3px; }
    .obs-value { font-size: 11pt; line-height: 1.6; }
    .desc { font-size: 10pt; color: #666; margin: 0 0 12px; font-style: italic; }
    .media-links { margin-top: 10px; font-size: 10pt; }
    .media-links a { color: #6366f1; }
    .muted { color: #999; font-size: 10pt; }
    @page { margin: 20mm; }
  </style>
</head>
<body>
  <h1>${session.productName}</h1>
  <div class="meta">
    Exploratory Session · ${PLATFORM_LABELS[session.platform] || session.platform} · ${formatDate(session.createdAt)}
    ${session.completedAt ? ` · Completed ${formatDate(session.completedAt)}` : ''}
  </div>

  ${envRows.length ? `
    <div class="section-title">Test Environment</div>
    <table class="env-table">
      ${envRows.map(([l, v]) => `<tr><td>${l}</td><td>${v}</td></tr>`).join('')}
    </table>` : ''}

  ${(overallSummary || session.aiSummary) ? `
    <div class="section-title">Overall Summary</div>
    <div class="summary-box">${(overallSummary || session.aiSummary).replace(/\n/g, '<br>')}</div>` : ''}

  <div class="section-title">Category Observations</div>
  ${categoriesHtml}
</body>
</html>`;

    const win = window.open('', '_blank');
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 300);
  }

  const hasEnvData = Object.values(env).some(v => v && v.trim());
  const envFields = [
    { label: 'App Name', value: env.appName },
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
