import { useState, useEffect } from 'react';
import { aiSummarize } from '../lib/api.js';
import { CAPABILITY_GROUPS } from '../data/capabilities.js';

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

function groupTestsBySection(tests, category) {
  const groups = CAPABILITY_GROUPS[category] || [];
  const sectionMap = {};
  for (const test of tests) {
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
      sectionMap[key] = { sectionLabel, sectionIndex: isNaN(sectionNum) ? 0 : sectionNum, tests: [] };
    }
    sectionMap[key].tests.push(test);
  }
  return Object.values(sectionMap).sort((a, b) => a.sectionIndex - b.sectionIndex);
}

export default function SessionSummary({ session, onBack }) {
  const [summary, setSummary] = useState('');
  const [loading, setLoading] = useState(true);
  const [copyMsg, setCopyMsg] = useState('');
  const [showPdfOptions, setShowPdfOptions] = useState(false);
  const [includePassed, setIncludePassed] = useState(false);

  const testCases = session.testCases || [];
  const issues = session.issues || [];
  const passCount = testCases.filter(t => t.status === 'pass').length;
  const failCount = testCases.filter(t => t.status === 'fail').length;
  const skipCount = testCases.filter(t => t.status === 'skip').length;
  const naCount = testCases.filter(t => t.status === 'na').length;
  const total = testCases.length;
  const effectiveTotal = passCount + failCount; // skip and n/a excluded from pass rate
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

  function handleExportPdf() {
    if (includePassed) {
      document.body.classList.add('pdf-include-passed');
    } else {
      document.body.classList.remove('pdf-include-passed');
    }
    window.print();
    document.body.classList.remove('pdf-include-passed');
  }

  return (
    <div className="session-summary-wrapper">
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
        {session.testerName && (
          <div className="summary-meta-item">
            <div className="meta-label">Tester</div>
            <div className="meta-value">{session.testerName}</div>
          </div>
        )}
        {session.appConfigName && (
          <div className="summary-meta-item">
            <div className="meta-label">Tested On</div>
            <div className="meta-value">{session.appConfigName}</div>
          </div>
        )}
      </div>

      {/* Per-product breakdown for multi-product sessions */}
      {session.products && session.products.length > 1 && (
        <div style={{ marginBottom: 24, background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.06em', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 12 }}>
            Results by Product
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {session.products.map((prod, idx) => {
              const prodTests = testCases.filter(t => t.productCatalogId === prod.catalogId || t.productIndex === idx);
              const pPass = prodTests.filter(t => t.status === 'pass').length;
              const pFail = prodTests.filter(t => t.status === 'fail').length;
              const pSkip = prodTests.filter(t => t.status === 'skip').length;
              const pEff = pPass + pFail;
              const pRate = pEff > 0 ? Math.round((pPass / pEff) * 100) : null;
              const rateColor = pRate === null ? 'var(--text-muted)' : pRate >= 80 ? 'var(--pass)' : pRate >= 60 ? '#f97316' : 'var(--fail)';
              return (
                <div key={prod.catalogId} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '9px 0', borderBottom: idx < session.products.length - 1 ? '1px solid var(--border)' : 'none' }}>
                  <span style={{ fontWeight: 600, fontSize: 14, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{prod.name}</span>
                  <span style={{ fontSize: 12, color: 'var(--pass)', fontWeight: 600 }}>{pPass} pass</span>
                  <span style={{ fontSize: 12, color: 'var(--fail)', fontWeight: 600 }}>{pFail} fail</span>
                  {pSkip > 0 && <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{pSkip} skip</span>}
                  <span style={{ fontSize: 13, fontWeight: 700, color: rateColor, minWidth: 44, textAlign: 'right' }}>
                    {pRate !== null ? `${pRate}%` : '—'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

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

      {/* Pending Evidence */}
      {(() => {
        const pendingEvidence = testCases.filter(t => t.evidencePending && !t.evidenceUrl);
        if (pendingEvidence.length === 0) return null;
        return (
          <div className="summary-section evidence-pending-section">
            <h2>Pending Evidence ({pendingEvidence.length})</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {pendingEvidence.map(t => (
                <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '8px 14px', fontSize: 13 }}>
                  {t.testNumber && <span style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--text-muted)' }}>[{t.testNumber}]</span>}
                  <span>{t.title}</span>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

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

      {/* Per-product breakdown (multi-product sessions) */}
      {session.products && session.products.length > 1 && (
        <div className="summary-section">
          <h2>Results by Product</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {session.products.map(prod => {
              const prodTests = testCases.filter(t => t.productCatalogId === prod.catalogId);
              const pPass = prodTests.filter(t => t.status === 'pass').length;
              const pFail = prodTests.filter(t => t.status === 'fail').length;
              const pSkip = prodTests.filter(t => t.status === 'skip').length;
              const pNa = prodTests.filter(t => t.status === 'na').length;
              const pEffective = pPass + pFail;
              const pRate = pEffective > 0 ? Math.round((pPass / pEffective) * 100) : null;
              return (
                <div key={prod.catalogId} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '10px 14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 600, fontSize: 13, flex: 1 }}>{prod.name}</span>
                    <span style={{ display: 'flex', gap: 10, fontSize: 12 }}>
                      {pPass > 0 && <span style={{ color: 'var(--pass)' }}>{pPass} pass</span>}
                      {pFail > 0 && <span style={{ color: 'var(--fail)' }}>{pFail} fail</span>}
                      {pSkip > 0 && <span style={{ color: 'var(--text-muted)' }}>{pSkip} skip</span>}
                      {pNa > 0 && <span style={{ color: 'var(--text-muted)' }}>{pNa} n/a</span>}
                      {pRate !== null && (
                        <span style={{ fontWeight: 600, color: pRate >= 80 ? 'var(--pass)' : pRate >= 50 ? 'var(--warn, #ca8a04)' : 'var(--fail)' }}>
                          {pRate}%
                        </span>
                      )}
                      {pRate === null && pSkip === prodTests.length && (
                        <span style={{ color: 'var(--text-muted)' }}>skipped</span>
                      )}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Test Results by Section */}
      {(() => {
        const sections = groupTestsBySection(testCases, session.category);
        if (sections.length === 0) return null;
        return (
          <div className="summary-section">
            <h2>Test Results by Section</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {sections.map(sec => {
                const sPass = sec.tests.filter(t => t.status === 'pass').length;
                const sFail = sec.tests.filter(t => t.status === 'fail').length;
                const sSkip = sec.tests.filter(t => t.status === 'skip').length;
                const sNa = sec.tests.filter(t => t.status === 'na').length;
                const allPass = sFail === 0 && sSkip === 0;
                const failSkipTests = sec.tests.filter(t => t.status === 'fail' || t.status === 'skip');
                const passTests = sec.tests.filter(t => t.status === 'pass');
                const shownTests = includePassed ? [...failSkipTests, ...passTests] : failSkipTests;
                return (
                  <div key={sec.sectionLabel} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '10px 14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 600, fontSize: 13, flex: 1 }}>{sec.sectionLabel}</span>
                      {allPass ? (
                        <span style={{ color: 'var(--pass)', fontSize: 13, fontWeight: 500 }}>✓ All passed ({sPass})</span>
                      ) : (
                        <span style={{ display: 'flex', gap: 8, fontSize: 12 }}>
                          {sPass > 0 && <span style={{ color: 'var(--pass)' }}>{sPass} pass</span>}
                          {sFail > 0 && <span style={{ color: 'var(--fail)' }}>{sFail} fail</span>}
                          {sSkip > 0 && <span style={{ color: 'var(--text-muted)' }}>{sSkip} skip</span>}
                          {sNa > 0 && <span style={{ color: 'var(--text-muted)' }}>{sNa} n/a</span>}
                        </span>
                      )}
                    </div>
                    {shownTests.length > 0 && (
                      <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {shownTests.map(t => (
                          <div key={t.id} style={{ paddingLeft: 10, borderLeft: '2px solid var(--border)', fontSize: 12 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                              <span className={`badge ${t.status === 'fail' ? 'badge-fail' : 'badge-skip'}`} style={{ flexShrink: 0 }}>
                                {t.status === 'fail' ? 'Fail' : 'Skip'}
                              </span>
                              {t.testNumber && <span style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--text-muted)' }}>[{t.testNumber}]</span>}
                              <span style={{ fontWeight: 500 }}>{t.title}</span>
                            </div>
                            {t.notes && (
                              <div style={{ marginTop: 3, color: 'var(--text-muted)', paddingLeft: 4 }}>{t.notes}</div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

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

      {/* Additional Items Tested */}
      {(() => {
        const withExtras = testCases.filter(t => t.extraTests && t.extraTests.some(e => e.description));
        if (withExtras.length === 0) return null;
        return (
          <div className="summary-section">
            <h2>Additional Items Tested</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {withExtras.map(t => (
                <div key={t.id} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '12px 14px' }}>
                  <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 8 }}>
                    {t.testNumber && <span style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--text-muted)', marginRight: 6 }}>[{t.testNumber}]</span>}
                    {t.title}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {t.extraTests.filter(e => e.description).map((e, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                        <span className={`badge ${e.result === 'pass' ? 'badge-pass' : e.result === 'fail' ? 'badge-fail' : 'badge-pending'}`} style={{ flexShrink: 0 }}>
                          {e.result === 'pass' ? 'Pass' : e.result === 'fail' ? 'Fail' : 'Pending'}
                        </span>
                        <span>{e.description}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      <div className="summary-actions">
        <button className="btn btn-secondary" onClick={onBack}>
          ← Back to Dashboard
        </button>
        <button className="btn btn-primary" onClick={handleCopy} disabled={loading}>
          {copyMsg || '📋 Copy Summary'}
        </button>
        <button className="btn btn-secondary" onClick={() => setShowPdfOptions(v => !v)} disabled={loading}>
          🖨 Export PDF
        </button>
      </div>
      {showPdfOptions && (
        <div style={{ marginTop: 12, padding: '12px 16px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, cursor: 'pointer' }}>
            <input type="checkbox" checked={includePassed} onChange={e => setIncludePassed(e.target.checked)} style={{ width: 'auto' }} />
            Include passed test cases
          </label>
          <button className="btn btn-primary btn-sm" onClick={handleExportPdf}>Print / Save PDF</button>
        </div>
      )}
    </div>
    </div>
  );
}
