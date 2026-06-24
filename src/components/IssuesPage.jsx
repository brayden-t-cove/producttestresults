import { useState, useEffect, useMemo, useRef } from 'react';

const SEVERITY_ORDER = { Critical: 0, High: 1, Medium: 2, Low: 3 };
const SEVERITY_COLORS = {
  Critical: 'var(--critical)',
  High: 'var(--high)',
  Medium: 'var(--medium)',
  Low: 'var(--low)',
};

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function SeverityBadge({ severity }) {
  const color = SEVERITY_COLORS[severity] || 'var(--text-muted)';
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      padding: '2px 8px',
      borderRadius: 12,
      fontSize: 11,
      fontWeight: 700,
      textTransform: 'uppercase',
      letterSpacing: '0.05em',
      background: `${color}22`,
      color,
      border: `1px solid ${color}44`,
      whiteSpace: 'nowrap',
    }}>
      {severity}
    </span>
  );
}

function StatusBadge({ status }) {
  const map = {
    Open: { bg: 'var(--primary-dim)', color: 'var(--primary)' },
    Fixed: { bg: 'var(--pass-dim)', color: 'var(--pass)' },
    'Cannot Reproduce': { bg: 'var(--skip-dim)', color: 'var(--skip)' },
  };
  const style = map[status] || { bg: 'var(--surface)', color: 'var(--text-muted)' };
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      padding: '2px 8px',
      borderRadius: 12,
      fontSize: 11,
      fontWeight: 600,
      background: style.bg,
      color: style.color,
      whiteSpace: 'nowrap',
    }}>
      {status}
    </span>
  );
}

function IssueRow({ issue, expanded, onToggle, onTicketSave }) {
  const [editingTicket, setEditingTicket] = useState(false);
  const [ticketDraft, setTicketDraft] = useState('');
  const cancelledRef = useRef(false);

  function startEditTicket(e) {
    e.stopPropagation();
    setTicketDraft(issue.ticketUrl || issue.sourceTicket || '');
    setEditingTicket(true);
  }

  function commitTicket(e) {
    e.stopPropagation();
    if (cancelledRef.current) { cancelledRef.current = false; return; }
    setEditingTicket(false);
    onTicketSave(ticketDraft.trim());
  }

  function handleTicketKey(e) {
    e.stopPropagation();
    if (e.key === 'Enter') commitTicket(e);
    if (e.key === 'Escape') { cancelledRef.current = true; setEditingTicket(false); }
  }

  const ticketUrl = issue.ticketUrl || issue.sourceTicket;

  return (
    <>
      <tr
        style={{ cursor: 'pointer' }}
        onClick={onToggle}
      >
        <td style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)', verticalAlign: 'middle' }}>
          <SeverityBadge severity={issue.severity} />
        </td>
        <td style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)', verticalAlign: 'middle', fontWeight: 500 }}>
          {issue.title}
        </td>
        <td style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)', verticalAlign: 'middle', color: 'var(--text-muted)', fontSize: 12 }}>
          {issue.productName}
        </td>
        <td style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)', verticalAlign: 'middle', color: 'var(--text-muted)', fontSize: 12 }}>
          {issue.issueCategory || issue.category || '—'}
        </td>
        <td style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)', verticalAlign: 'middle', color: 'var(--text-muted)', fontSize: 12, whiteSpace: 'nowrap' }}>
          {formatDate(issue.sessionDate)}
        </td>
        <td style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)', verticalAlign: 'middle', color: 'var(--text-muted)', fontSize: 12 }}>
          {issue.firmware || '—'}
        </td>
        <td style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)', verticalAlign: 'middle' }}>
          <StatusBadge status={issue.derivedStatus} />
          {issue.regressionFlag && <span style={{ marginLeft: 5, fontSize: 11, color: '#ea580c', fontWeight: 700 }}>⚠ Regression</span>}
        </td>
        <td style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)', verticalAlign: 'middle', fontSize: 12, color: 'var(--text-muted)', textAlign: 'center' }}>
          {issue.reproCount > 0 ? <span title="Times reproduced" style={{ fontWeight: 600, color: 'var(--fail)' }}>×{issue.reproCount}</span> : '—'}
        </td>
        <td style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)', verticalAlign: 'middle', fontSize: 12 }} onClick={e => e.stopPropagation()}>
          {editingTicket ? (
            <input
              autoFocus
              value={ticketDraft}
              onChange={e => setTicketDraft(e.target.value)}
              onBlur={commitTicket}
              onKeyDown={handleTicketKey}
              placeholder="https://..."
              style={{ width: 160, fontSize: 12, padding: '3px 6px' }}
            />
          ) : ticketUrl ? (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <a href={ticketUrl} target="_blank" rel="noreferrer" style={{ color: 'var(--primary)' }}>
                {(() => { const d = ticketUrl.replace(/^https?:\/\//, '').split('/').slice(0, 3).join('/'); return d.length > 24 ? d.substring(0, 24) + '…' : d; })()}
              </a>
              <span title="Edit ticket" onClick={startEditTicket} style={{ cursor: 'pointer', color: 'var(--text-muted)', fontSize: 11, lineHeight: 1 }}>✎</span>
            </span>
          ) : (
            <button
              onClick={startEditTicket}
              style={{ background: 'none', border: '1px dashed var(--border)', borderRadius: 4, padding: '2px 8px', fontSize: 11, color: 'var(--text-muted)', cursor: 'pointer' }}
            >
              + Add ticket
            </button>
          )}
        </td>
      </tr>
      {expanded && (
        <tr>
          <td colSpan={9} style={{ background: 'var(--surface)', padding: 0, borderBottom: '1px solid var(--border)' }}>
            <div style={{ padding: '16px 20px', fontSize: 13, lineHeight: 1.6 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 24px', marginBottom: 12 }}>
                {issue.description && (
                  <div style={{ gridColumn: '1 / -1' }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Description</div>
                    <div style={{ color: 'var(--text)' }}>{issue.description}</div>
                  </div>
                )}
                {issue.preconditions && (
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Preconditions</div>
                    <div style={{ color: 'var(--text)' }}>{issue.preconditions}</div>
                  </div>
                )}
                {issue.reproSteps && (
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Repro Steps</div>
                    <pre style={{ whiteSpace: 'pre-wrap', color: 'var(--text)', fontFamily: 'inherit', margin: 0 }}>{issue.reproSteps}</pre>
                  </div>
                )}
                {issue.affectedTestCase && (
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Affected Test Case</div>
                    <div style={{ color: 'var(--text)' }}>{issue.affectedTestCase}</div>
                  </div>
                )}
                {issue.evidenceUrl && (
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Evidence</div>
                    <a href={issue.evidenceUrl} target="_blank" rel="noreferrer" style={{ color: 'var(--primary)' }}>{issue.evidenceUrl}</a>
                  </div>
                )}
              </div>
              {issue.verificationHistory && issue.verificationHistory.length > 0 && (
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Verification History</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {issue.verificationHistory.map((v, i) => (
                      <div key={i} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 6, padding: '8px 12px', fontSize: 12 }}>
                        <span style={{ color: 'var(--text-muted)', marginRight: 8 }}>{formatDate(v.date || v.createdAt)}</span>
                        <strong style={{ marginRight: 8 }}>{v.result}</strong>
                        {v.notes && <span style={{ color: 'var(--text-muted)' }}>{v.notes}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

export default function IssuesPage({ onBack }) {
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedId, setExpandedId] = useState(null);

  const [search, setSearch] = useState('');
  const [filterSeverity, setFilterSeverity] = useState('All');
  const [filterCategory, setFilterCategory] = useState('All');
  const [filterProduct, setFilterProduct] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
  const [sortField, setSortField] = useState('severity');
  const [sortDir, setSortDir] = useState('asc');

  useEffect(() => {
    fetch('/api/issues')
      .then(r => r.json())
      .then(data => { setIssues(data); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  }, []);

  const categories = useMemo(() => ['All', ...Array.from(new Set(issues.map(i => i.issueCategory || i.category || 'Other')))], [issues]);
  const products = useMemo(() => ['All', ...Array.from(new Set(issues.map(i => i.productName)))], [issues]);

  const filtered = useMemo(() => {
    let result = [...issues];
    if (search) result = result.filter(i => i.title?.toLowerCase().includes(search.toLowerCase()));
    if (filterSeverity !== 'All') result = result.filter(i => i.severity === filterSeverity);
    if (filterCategory !== 'All') result = result.filter(i => (i.issueCategory || i.category || 'Other') === filterCategory);
    if (filterProduct !== 'All') result = result.filter(i => i.productName === filterProduct);
    if (filterStatus !== 'All') result = result.filter(i => i.derivedStatus === filterStatus);

    result.sort((a, b) => {
      let cmp = 0;
      if (sortField === 'severity') {
        cmp = (SEVERITY_ORDER[a.severity] ?? 99) - (SEVERITY_ORDER[b.severity] ?? 99);
      } else if (sortField === 'date') {
        cmp = new Date(b.sessionDate) - new Date(a.sessionDate);
      } else if (sortField === 'product') {
        cmp = (a.productName || '').localeCompare(b.productName || '');
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return result;
  }, [issues, search, filterSeverity, filterCategory, filterProduct, filterStatus, sortField, sortDir]);

  async function saveTicket(issue, ticketUrl) {
    try {
      const res = await fetch(`/api/sessions/${issue.sessionId}/issues/${issue.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticketUrl }),
      });
      if (!res.ok) throw new Error(`Server error ${res.status}`);
      setIssues(prev => prev.map(i =>
        i.sessionId === issue.sessionId && i.id === issue.id ? { ...i, ticketUrl } : i
      ));
    } catch (e) {
      console.error('Failed to save ticket:', e);
    }
  }

  function toggleSort(field) {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
  }

  const counts = useMemo(() => ({
    total: filtered.length,
    critical: filtered.filter(i => i.severity === 'Critical').length,
    high: filtered.filter(i => i.severity === 'High').length,
    medium: filtered.filter(i => i.severity === 'Medium').length,
    low: filtered.filter(i => i.severity === 'Low').length,
    open: filtered.filter(i => i.derivedStatus === 'Open').length,
  }), [filtered]);

  function SortArrow({ field }) {
    if (sortField !== field) return <span style={{ color: 'var(--text-dim)' }}> ↕</span>;
    return <span style={{ color: 'var(--primary)' }}>{sortDir === 'asc' ? ' ↑' : ' ↓'}</span>;
  }

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '32px 24px', maxWidth: 1200, margin: '0 auto', width: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 28 }}>
        <button className="btn btn-ghost" onClick={onBack}>← Back</button>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>🐛 Issues</h1>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        <input
          placeholder="Search issues..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ flex: 2, minWidth: 160 }}
        />
        <select value={filterSeverity} onChange={e => setFilterSeverity(e.target.value)} style={{ flex: 1, minWidth: 130 }}>
          <option>All</option>
          <option>Critical</option>
          <option>High</option>
          <option>Medium</option>
          <option>Low</option>
        </select>
        <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} style={{ flex: 1, minWidth: 140 }}>
          {categories.map(c => <option key={c}>{c}</option>)}
        </select>
        <select value={filterProduct} onChange={e => setFilterProduct(e.target.value)} style={{ flex: 1, minWidth: 160 }}>
          {products.map(p => <option key={p}>{p}</option>)}
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ flex: 1, minWidth: 140 }}>
          <option>All</option>
          <option>Open</option>
          <option>Fixed</option>
          <option>Cannot Reproduce</option>
        </select>
      </div>

      {/* Summary bar */}
      <div style={{ display: 'flex', gap: 16, fontSize: 13, marginBottom: 16, color: 'var(--text-muted)', flexWrap: 'wrap' }}>
        <span><strong style={{ color: 'var(--text)' }}>{counts.total}</strong> total</span>
        <span style={{ color: 'var(--critical)' }}><strong>{counts.critical}</strong> Critical</span>
        <span style={{ color: 'var(--high)' }}><strong>{counts.high}</strong> High</span>
        <span style={{ color: 'var(--medium)' }}><strong>{counts.medium}</strong> Medium</span>
        <span style={{ color: 'var(--low)' }}><strong>{counts.low}</strong> Low</span>
        <span><strong style={{ color: 'var(--primary)' }}>{counts.open}</strong> Open</span>
      </div>

      {loading && (
        <div className="ai-loading"><div className="spinner spinner-lg" /></div>
      )}
      {error && <div className="error-msg">{error}</div>}

      {!loading && !error && (
        filtered.length === 0 ? (
          <div className="empty-state">
            <h3>No issues found</h3>
            <p>Try adjusting your filters or log issues during a test session.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr>
                  <th
                    style={{ textAlign: 'left', padding: '8px 12px', color: 'var(--text-muted)', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', borderBottom: '1px solid var(--border)', cursor: 'pointer', whiteSpace: 'nowrap' }}
                    onClick={() => toggleSort('severity')}
                  >
                    Severity<SortArrow field="severity" />
                  </th>
                  <th style={{ textAlign: 'left', padding: '8px 12px', color: 'var(--text-muted)', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', borderBottom: '1px solid var(--border)' }}>
                    Title
                  </th>
                  <th
                    style={{ textAlign: 'left', padding: '8px 12px', color: 'var(--text-muted)', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', borderBottom: '1px solid var(--border)', cursor: 'pointer', whiteSpace: 'nowrap' }}
                    onClick={() => toggleSort('product')}
                  >
                    Product<SortArrow field="product" />
                  </th>
                  <th style={{ textAlign: 'left', padding: '8px 12px', color: 'var(--text-muted)', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', borderBottom: '1px solid var(--border)' }}>
                    Category
                  </th>
                  <th
                    style={{ textAlign: 'left', padding: '8px 12px', color: 'var(--text-muted)', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', borderBottom: '1px solid var(--border)', cursor: 'pointer', whiteSpace: 'nowrap' }}
                    onClick={() => toggleSort('date')}
                  >
                    Date<SortArrow field="date" />
                  </th>
                  <th style={{ textAlign: 'left', padding: '8px 12px', color: 'var(--text-muted)', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', borderBottom: '1px solid var(--border)' }}>
                    Firmware
                  </th>
                  <th style={{ textAlign: 'left', padding: '8px 12px', color: 'var(--text-muted)', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', borderBottom: '1px solid var(--border)' }}>
                    Status
                  </th>
                  <th style={{ textAlign: 'center', padding: '8px 12px', color: 'var(--text-muted)', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', borderBottom: '1px solid var(--border)' }}>
                    Repros
                  </th>
                  <th style={{ textAlign: 'left', padding: '8px 12px', color: 'var(--text-muted)', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', borderBottom: '1px solid var(--border)' }}>
                    Ticket
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(issue => (
                  <IssueRow
                    key={`${issue.sessionId}-${issue.id}`}
                    issue={issue}
                    expanded={expandedId === `${issue.sessionId}-${issue.id}`}
                    onToggle={() => setExpandedId(prev =>
                      prev === `${issue.sessionId}-${issue.id}` ? null : `${issue.sessionId}-${issue.id}`
                    )}
                    onTicketSave={url => saveTicket(issue, url)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )
      )}
    </div>
  );
}
