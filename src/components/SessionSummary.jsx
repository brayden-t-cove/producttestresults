import { useState, useEffect } from 'react';
import { aiSummarize } from '../lib/api.js';

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric',
  });
}

function formatDuration(start, end) {
  if (!start || !end) return '—';
  const ms = new Date(end) - new Date(start);
  const mins = Math.floor(ms / 60000);
  const hours = Math.floor(mins / 60);
  const remainMins = mins % 60;
  if (hours > 0) return `${hours}h ${remainMins}m`;
  return `${mins}m`;
}

function severityClass(sev) {
  if (!sev) return 'badge-low';
  return 'badge-' + sev.toLowerCase();
}

// Minimal markdown renderer
function renderMarkdown(text) {
  if (!text) return '';
  const lines = text.split('\n');
  let html = '';
  let inUl = false;
  let inOl = false;

  for (const line of lines) {
    // Headings
    if (line.startsWith('### ')) {
      if (inUl) { html += '</ul>'; inUl = false; }
      if (inOl) { html += '</ol>'; inOl = false; }
      html += `<h3>${line.slice(4)}</h3>`;
    } else if (line.startsWith('## ')) {
      if (inUl) { html += '</ul>'; inUl = false; }
      if (inOl) { html += '</ol>'; inOl = false; }
      html += `<h2>${line.slice(3)}</h2>`;
    } else if (line.startsWith('# ')) {
      if (inUl) { html += '</ul>'; inUl = false; }
      if (inOl) { html += '</ol>'; inOl = false; }
      html += `<h1>${line.slice(2)}</h1>`;
    } else if (line.match(/^\d+\.\s/)) {
      if (inUl) { html += '</ul>'; inUl = false; }
      if (!inOl) { html += '<ol>'; inOl = true; }
      html += `<li>${line.replace(/^\d+\.\s/, '').replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')}</li>`;
    } else if (line.startsWith('- ') || line.startsWith('* ')) {
      if (inOl) { html += '</ol>'; inOl = false; }
      if (!inUl) { html += '<ul>'; inUl = true; }
      html += `<li>${line.slice(2).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')}</li>`;
    } else if (line.trim() === '') {
      if (inUl) { html += '</ul>'; inUl = false; }
      if (inOl) { html += '</ol>'; inOl = false; }
    } else {
      if (inUl) { html += '</ul>'; inUl = false; }
      if (inOl) { html += '</ol>'; inOl = false; }
      const para = line.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
      if (para.trim()) html += `<p>${para}</p>`;
    }
  }
  if (inUl) html += '</ul>';
  if (inOl) html += '</ol>';
  return html;
}

export default function SessionSummary({ session, onBack }) {
  const [summary, setSummary] = useState('');
  const [loading, setLoading] = useState(true);
  const [copyMsg, setCopyMsg] = useState('');

  const testCases = session.testCases || [];
  const issues = session.issues || [];
  const passCount = testCases.filter(t => t.status === 'pass').length;
  const failCount = testCases.filter(t => t.status === 'fail').length;
  const skipCount = testCases.filter(t => t.status === 'skip').length;
  const naCount = testCases.filter(t => t.status === 'na').length;
  const total = testCases.length;
  const effectiveTotal = total - naCount;
  const passRate = effectiveTotal > 0 ? Math.round((passCount / effectiveTotal) * 100) : 0;

  useEffect(() => {
    async function fetchSummary() {
      try {
        const result = await aiSummarize({ session });
        setSummary(result.summary || '');
      } catch (e) {
        setSummary('*AI summary unavailable. Check your API key configuration.*');
      } finally {
        setLoading(false);
      }
    }
    fetchSummary();
  }, []);

  async function handleCopy() {
    const text = [
      `# QA Summary: ${session.productName}`,
      `Date: ${formatDate(session.createdAt)}`,
      `Firmware: ${session.firmware || 'N/A'}`,
      '',
      `## Results`,
      `Pass: ${passCount}/${total} (${passRate}%)`,
      `Fail: ${failCount}`,
      `Skip: ${skipCount}`,
      '',
      summary,
    ].join('\n');

    try {
      await navigator.clipboard.writeText(text);
      setCopyMsg('Copied!');
      setTimeout(() => setCopyMsg(''), 2000);
    } catch (e) {
      setCopyMsg('Copy failed');
    }
  }

  const issuesBySeverity = ['Critical', 'High', 'Medium', 'Low'].flatMap(sev =>
    issues.filter(i => i.severity === sev)
  );

  return (
    <div className="session-summary">
      <div className="summary-header">
        <h1>Session Complete</h1>
        <p>{session.productName} — {formatDate(session.createdAt)}</p>
      </div>

      {/* Metadata */}
      <div className="summary-meta-grid">
        <div className="summary-meta-item">
          <div className="meta-label">Product</div>
          <div className="meta-value">{session.productName}</div>
        </div>
        <div className="summary-meta-item">
          <div className="meta-label">Firmware</div>
          <div className="meta-value">{session.firmware || 'N/A'}</div>
        </div>
        <div className="summary-meta-item">
          <div className="meta-label">Date</div>
          <div className="meta-value">{formatDate(session.createdAt)}</div>
        </div>
        <div className="summary-meta-item">
          <div className="meta-label">Duration</div>
          <div className="meta-value">{formatDuration(session.createdAt, session.completedAt)}</div>
        </div>
        {session.appConfigName && (
          <div className="summary-meta-item">
            <div className="meta-label">Tested On</div>
            <div className="meta-value">{session.appConfigName}</div>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="stats-row">
        <div className="stat-card stat-pass">
          <span className="stat-number">{passCount}</span>
          <span className="stat-label">Passed</span>
        </div>
        <div className="stat-card stat-fail">
          <span className="stat-number">{failCount}</span>
          <span className="stat-label">Failed</span>
        </div>
        <div className="stat-card stat-skip">
          <span className="stat-number">{skipCount}</span>
          <span className="stat-label">Skipped</span>
        </div>
        <div className="stat-card stat-rate">
          <span className="stat-number">{passRate}%</span>
          <span className="stat-label">Pass Rate</span>
        </div>
        {naCount > 0 && (
          <div className="stat-card" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
            <span className="stat-number" style={{ color: 'var(--text-muted)' }}>{naCount}</span>
            <span className="stat-label">N/A</span>
          </div>
        )}
      </div>

      {/* Issues */}
      {issues.length > 0 && (
        <div className="summary-section">
          <h2>Issues Logged ({issues.length})</h2>
          <div className="issues-by-severity">
            {issuesBySeverity.map(issue => (
              <div key={issue.id} className="issue-summary-item">
                <span className={`badge ${severityClass(issue.severity)}`}>{issue.severity}</span>
                <span className="issue-title-text">{issue.title}</span>
                <span className="issue-cat">{issue.issueCategory}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* AI Summary */}
      <div className="summary-section">
        <h2>AI-Generated Summary</h2>
        {loading ? (
          <div className="ai-loading" style={{ minHeight: 120 }}>
            <div className="spinner spinner-lg" />
            <p>Claude is generating your summary...</p>
          </div>
        ) : (
          <div
            className="ai-summary-content"
            dangerouslySetInnerHTML={{ __html: renderMarkdown(summary) }}
          />
        )}
      </div>

      <div className="summary-actions">
        <button className="btn btn-secondary" onClick={onBack}>
          ← Back to Dashboard
        </button>
        <button className="btn btn-primary" onClick={handleCopy} disabled={loading}>
          {copyMsg || '📋 Copy Summary'}
        </button>
      </div>
    </div>
  );
}
