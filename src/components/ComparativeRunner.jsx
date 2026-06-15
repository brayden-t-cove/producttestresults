import { useState, useCallback } from 'react';
import { updateSession } from '../lib/api.js';

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function PassRateBadge({ rate }) {
  if (rate === null || rate === undefined) return <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>No data</span>;
  const pct = Math.round(rate * 100);
  const color = pct >= 90 ? 'var(--pass)' : pct >= 70 ? '#eab308' : 'var(--fail)';
  const bg = pct >= 90 ? 'var(--pass-dim)' : pct >= 70 ? 'rgba(234,179,8,0.15)' : 'var(--fail-dim)';
  return (
    <span style={{ background: bg, color, fontWeight: 700, fontSize: 12, padding: '2px 8px', borderRadius: 10, whiteSpace: 'nowrap' }}>
      {pct}%
    </span>
  );
}

function getRankings(metrics, results, products) {
  const rankings = {}; // metricId -> { catalogId: { rank, belowSpec } }
  for (const metric of metrics) {
    if (metric.type === 'observation') continue;
    const entries = products
      .map(p => {
        const cell = results[p.catalogId]?.[metric.id];
        const val = cell?.value;
        return { catalogId: p.catalogId, value: val };
      })
      .filter(e => e.value !== undefined && e.value !== null && e.value !== '');

    if (entries.length === 0) { rankings[metric.id] = {}; continue; }

    // Check threshold
    const withSpec = entries.map(e => {
      let belowSpec = false;
      const v = Number(e.value);
      if (metric.threshold !== null && metric.threshold !== undefined) {
        if (metric.thresholdType === 'min' && v < metric.threshold) belowSpec = true;
        if (metric.thresholdType === 'max' && v > metric.threshold) belowSpec = true;
      }
      return { ...e, belowSpec, numVal: v };
    });

    const passing = withSpec.filter(e => !e.belowSpec);
    const failing = withSpec.filter(e => e.belowSpec);

    // Sort passing by direction
    passing.sort((a, b) =>
      metric.direction === 'lower_better' ? a.numVal - b.numVal : b.numVal - a.numVal
    );

    const rankMap = {};
    passing.forEach((e, i) => { rankMap[e.catalogId] = { rank: i + 1, belowSpec: false }; });
    failing.forEach(e => { rankMap[e.catalogId] = { rank: null, belowSpec: true }; });

    rankings[metric.id] = rankMap;
  }
  return rankings;
}

const RANK_COLORS = {
  1: { bg: 'rgba(234,179,8,0.2)', color: '#ca8a04', label: '1st' },
  2: { bg: 'rgba(148,163,184,0.2)', color: '#94a3b8', label: '2nd' },
  3: { bg: 'rgba(180,130,90,0.2)', color: '#b45309', label: '3rd' },
};

function RankBadge({ rank, belowSpec }) {
  if (belowSpec) {
    return (
      <span className="below-spec-badge">Below Spec</span>
    );
  }
  if (!rank) return null;
  const style = RANK_COLORS[rank] || { bg: 'var(--surface)', color: 'var(--text-muted)', label: `${rank}th` };
  return (
    <span className="rank-badge" style={{ background: style.bg, color: style.color }}>
      {style.label || `${rank}th`}
    </span>
  );
}

function StarRating({ value, onChange }) {
  const [hover, setHover] = useState(null);
  const display = hover !== null ? hover : (value || 0);
  return (
    <div style={{ display: 'flex', gap: 4 }}>
      {[1, 2, 3, 4, 5].map(n => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n === value ? null : n)}
          onMouseEnter={() => setHover(n)}
          onMouseLeave={() => setHover(null)}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: 20,
            color: n <= display ? '#eab308' : 'var(--border)',
            padding: 0,
            lineHeight: 1,
          }}
        >
          ★
        </button>
      ))}
    </div>
  );
}

export default function ComparativeRunner({ session, onUpdate, onComplete, onExit }) {
  const [results, setResults] = useState(session.results || {});
  const [expandedNotes, setExpandedNotes] = useState({});
  const [saving, setSaving] = useState(false);
  const [confirmComplete, setConfirmComplete] = useState(false);

  const products = session.products || [];
  const metrics = session.metrics || [];
  const autoPulled = session.autoPulled || {};

  const rankings = getRankings(metrics, results, products);

  function getCellValue(catalogId, metricId) {
    return results[catalogId]?.[metricId]?.value ?? '';
  }

  function getCellNotes(catalogId, metricId) {
    return results[catalogId]?.[metricId]?.notes ?? '';
  }

  function setCellValue(catalogId, metricId, value) {
    setResults(prev => ({
      ...prev,
      [catalogId]: {
        ...prev[catalogId],
        [metricId]: { ...prev[catalogId]?.[metricId], value },
      },
    }));
  }

  function setCellNotes(catalogId, metricId, notes) {
    setResults(prev => ({
      ...prev,
      [catalogId]: {
        ...prev[catalogId],
        [metricId]: { ...prev[catalogId]?.[metricId], notes },
      },
    }));
  }

  function toggleNotes(key) {
    setExpandedNotes(prev => ({ ...prev, [key]: !prev[key] }));
  }

  async function saveResults(updatedResults) {
    setSaving(true);
    try {
      const updated = await updateSession(session.id, { results: updatedResults });
      onUpdate(updated);
    } catch (e) {
      console.error('Auto-save failed', e);
    } finally {
      setSaving(false);
    }
  }

  function handleBlur(updatedResults) {
    saveResults(updatedResults || results);
  }

  async function handleComplete() {
    setSaving(true);
    try {
      const updated = await updateSession(session.id, {
        results,
        status: 'completed',
        completedAt: new Date().toISOString(),
      });
      onComplete(updated);
    } catch (e) {
      console.error('Failed to complete', e);
    } finally {
      setSaving(false);
      setConfirmComplete(false);
    }
  }

  async function handleExit() {
    await saveResults(results);
    onExit();
  }

  // Group metrics by category for display
  const CATEGORY_LABELS = {
    camera: 'Camera', hub: 'Hub', sensor: 'Sensor',
    touchpad: 'Touchpad', app: 'App', universal: 'Universal',
    system: 'System (Full Ecosystem)',
  };

  const metricCategories = [...new Set(metrics.map(m => {
    const base = m.id.split('-')[0];
    return base;
  }))];

  return (
    <div className="dashboard" style={{ padding: 0 }}>
      {/* Header */}
      <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, position: 'sticky', top: 0, background: 'var(--bg)', zIndex: 10 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 16 }}>{session.productName}</h2>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
            Comparative Analysis · {products.length} products · {metrics.length} metrics
            {saving && <span style={{ marginLeft: 8, color: 'var(--primary)' }}>Saving...</span>}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-ghost" onClick={handleExit}>Exit</button>
          <button
            className="btn btn-primary"
            onClick={() => setConfirmComplete(true)}
          >
            Complete Analysis
          </button>
        </div>
      </div>

      {/* Confirm complete modal */}
      {confirmComplete && (
        <div className="modal-overlay" onClick={() => setConfirmComplete(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 400 }}>
            <h3 style={{ marginBottom: 12 }}>Complete Analysis?</h3>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>
              This will mark the analysis as completed. You can still view results but editing will require reopening.
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button className="btn btn-ghost" onClick={() => setConfirmComplete(false)}>Cancel</button>
              <button className="btn btn-primary" disabled={saving} onClick={handleComplete}>
                {saving ? 'Saving...' : 'Complete'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{ overflowX: 'auto', padding: '0 24px 24px' }}>
        {/* Auto-pulled section */}
        {Object.keys(autoPulled).length > 0 && (
          <div className="auto-pull-section" style={{ marginTop: 20, marginBottom: 20 }}>
            <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-muted)', marginBottom: 10 }}>
              Previous Test Session Results
            </div>
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              {products.map(p => {
                const pulled = autoPulled[p.catalogId];
                if (!pulled) return null;
                return (
                  <div key={p.catalogId} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, padding: 12, minWidth: 200 }}>
                    <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 6 }}>{p.name}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Overall:</span>
                      <PassRateBadge rate={pulled.overallPassRate} />
                    </div>
                    {(pulled.sectionRates || []).slice(0, 5).map(sec => (
                      <div key={sec.label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-muted)', marginBottom: 3 }}>
                        <span>{sec.label}</span>
                        <span style={{ color: sec.rate >= 0.9 ? 'var(--pass)' : sec.rate >= 0.7 ? '#eab308' : 'var(--fail)' }}>
                          {Math.round(sec.rate * 100)}%
                        </span>
                      </div>
                    ))}
                    <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 4 }}>
                      Session: {formatDate(pulled.sessionDate)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Comparison table */}
        <table className="comparative-table">
          <thead>
            <tr>
              <th style={{ textAlign: 'left', padding: '10px 12px', background: 'var(--surface)', borderBottom: '2px solid var(--border)', position: 'sticky', left: 0, zIndex: 2, whiteSpace: 'nowrap', minWidth: 160 }}>
                Metric
              </th>
              {products.map(p => (
                <th key={p.catalogId} style={{ textAlign: 'center', padding: '10px 16px', background: 'var(--surface)', borderBottom: '2px solid var(--border)', minWidth: 200 }}>
                  <div style={{ fontWeight: 700 }}>{p.name}</div>
                  {p.firmware && <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 400 }}>fw: {p.firmware}</div>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {metrics.map((metric, mIdx) => {
              const metricRankings = rankings[metric.id] || {};
              const isOdd = mIdx % 2 === 0;
              return (
                <tr key={metric.id} style={{ background: isOdd ? 'var(--surface)' : 'transparent' }}>
                  <td style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)', position: 'sticky', left: 0, background: isOdd ? 'var(--surface)' : 'var(--bg)', zIndex: 1, whiteSpace: 'nowrap' }}>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{metric.label}</div>
                    {metric.unit && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{metric.unit}</div>}
                    {metric.threshold !== null && metric.threshold !== undefined && (
                      <div style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 2 }}>
                        Threshold: {metric.thresholdType === 'min' ? '≥' : '≤'}{metric.threshold}
                      </div>
                    )}
                  </td>
                  {products.map(p => {
                    const noteKey = `${p.catalogId}-${metric.id}`;
                    const rank = metricRankings[p.catalogId];
                    const currentVal = getCellValue(p.catalogId, metric.id);
                    const currentNotes = getCellNotes(p.catalogId, metric.id);

                    return (
                      <td key={p.catalogId} className="comparative-metric-cell" style={{ borderBottom: '1px solid var(--border)', verticalAlign: 'top' }}>
                        {metric.type === 'numeric' && (
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <input
                                type="number"
                                value={currentVal}
                                onChange={e => setCellValue(p.catalogId, metric.id, e.target.value)}
                                onBlur={() => {
                                  const updated = { ...results };
                                  handleBlur(updated);
                                }}
                                style={{ width: '100%', maxWidth: 120 }}
                                placeholder="—"
                              />
                              {rank && <RankBadge rank={rank.rank} belowSpec={rank.belowSpec} />}
                            </div>
                            <button
                              className="btn btn-ghost btn-sm"
                              style={{ marginTop: 4, fontSize: 11, padding: '2px 6px', color: 'var(--text-dim)' }}
                              onClick={() => toggleNotes(noteKey)}
                            >
                              {expandedNotes[noteKey] ? '▾ notes' : '▸ notes'}
                            </button>
                            {expandedNotes[noteKey] && (
                              <textarea
                                rows={2}
                                value={currentNotes}
                                onChange={e => setCellNotes(p.catalogId, metric.id, e.target.value)}
                                onBlur={() => handleBlur(results)}
                                placeholder="Notes..."
                                style={{ marginTop: 4, fontSize: 12 }}
                              />
                            )}
                          </div>
                        )}

                        {metric.type === 'rating' && (
                          <div>
                            <StarRating
                              value={currentVal || null}
                              onChange={val => {
                                setCellValue(p.catalogId, metric.id, val);
                                const updated = {
                                  ...results,
                                  [p.catalogId]: {
                                    ...results[p.catalogId],
                                    [metric.id]: { ...results[p.catalogId]?.[metric.id], value: val },
                                  },
                                };
                                setResults(updated);
                                saveResults(updated);
                              }}
                            />
                            {rank && <div style={{ marginTop: 4 }}><RankBadge rank={rank.rank} belowSpec={rank.belowSpec} /></div>}
                            <button
                              className="btn btn-ghost btn-sm"
                              style={{ marginTop: 4, fontSize: 11, padding: '2px 6px', color: 'var(--text-dim)' }}
                              onClick={() => toggleNotes(noteKey)}
                            >
                              {expandedNotes[noteKey] ? '▾ notes' : '▸ notes'}
                            </button>
                            {expandedNotes[noteKey] && (
                              <textarea
                                rows={2}
                                value={currentNotes}
                                onChange={e => setCellNotes(p.catalogId, metric.id, e.target.value)}
                                onBlur={() => handleBlur(results)}
                                placeholder="Notes..."
                                style={{ marginTop: 4, fontSize: 12 }}
                              />
                            )}
                          </div>
                        )}

                        {metric.type === 'observation' && (
                          <textarea
                            rows={3}
                            value={currentVal}
                            onChange={e => setCellValue(p.catalogId, metric.id, e.target.value)}
                            onBlur={() => handleBlur(results)}
                            placeholder="Enter observation..."
                            style={{ fontSize: 13 }}
                          />
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
