import { useState, useEffect } from 'react';
import { listSessions, getSession } from '../lib/api.js';

const RESULTS = [
  { key: 'still_present', label: 'Still Present', cls: 'btn-still-present' },
  { key: 'fixed', label: 'Fixed', cls: 'btn-fixed' },
  { key: 'cannot_reproduce', label: "Can't Repro", cls: 'btn-cannot-repro' },
];

function severityClass(sev) {
  if (!sev) return 'badge-low';
  return 'badge-' + sev.toLowerCase();
}

function formatDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function IssueVerification({ session, onSave, onClose }) {
  const [historicIssues, setHistoricIssues] = useState([]);
  const [verifications, setVerifications] = useState({});
  const [notes, setNotes] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const all = await listSessions();
        const prevSessions = all.filter(s =>
          s.id !== session.id &&
          s.status === 'completed'
        );

        const issues = [];
        for (const s of prevSessions) {
          try {
            const full = await getSession(s.id);
            if (full.productId === session.productId && full.issues?.length) {
              full.issues.forEach(issue => {
                issues.push({ ...issue, sessionDate: full.createdAt, sessionId: full.id });
              });
            }
          } catch (e) { /* skip */ }
        }
        setHistoricIssues(issues);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [session]);

  function setResult(issueId, result) {
    setVerifications(v => ({ ...v, [issueId]: result }));
  }
  function setNote(issueId, note) {
    setNotes(n => ({ ...n, [issueId]: note }));
  }

  function handleSave() {
    const results = Object.entries(verifications)
      .filter(([, v]) => v)
      .map(([issueId, result]) => {
        const issue = historicIssues.find(i => i.id === issueId);
        return {
          id: crypto.randomUUID(),
          originalIssueId: issueId,
          issueTitle: issue?.title || '',
          result,
          notes: notes[issueId] || '',
          verifiedAt: new Date().toISOString(),
        };
      });
    onSave(results);
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h2>Verify Known Issues</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
              <div className="spinner spinner-lg" />
            </div>
          ) : historicIssues.length === 0 ? (
            <div className="empty-state" style={{ padding: '40px 0' }}>
              <p>No previous issues found for {session.productName}.</p>
              <p style={{ marginTop: 6, fontSize: 12, color: 'var(--text-dim)' }}>
                Issues from completed sessions for this product will appear here.
              </p>
            </div>
          ) : (
            <div className="verification-list">
              {historicIssues.map(issue => (
                <div key={issue.id} className="verification-item">
                  <div className="verification-item-header">
                    <span className="verification-item-title">{issue.title}</span>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <span className={`badge ${severityClass(issue.severity)}`}>{issue.severity}</span>
                    </div>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>
                    {issue.issueCategory} · {formatDate(issue.sessionDate)}
                  </div>
                  <div className="verification-actions">
                    {RESULTS.map(r => (
                      <button
                        key={r.key}
                        className={`btn btn-sm ${r.cls} ${verifications[issue.id] === r.key ? 'active' : ''}`}
                        onClick={() => setResult(issue.id, r.key)}
                      >
                        {r.label}
                      </button>
                    ))}
                  </div>
                  {verifications[issue.id] && (
                    <div style={{ marginTop: 8 }}>
                      <input
                        type="text"
                        placeholder="Optional notes..."
                        value={notes[issue.id] || ''}
                        onChange={e => setNote(issue.id, e.target.value)}
                        style={{ fontSize: 12 }}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button
            className="btn btn-primary"
            onClick={handleSave}
            disabled={Object.values(verifications).filter(Boolean).length === 0}
          >
            Save Verifications ({Object.values(verifications).filter(Boolean).length})
          </button>
        </div>
      </div>
    </div>
  );
}
