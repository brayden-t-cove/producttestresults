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
  const rankings = {};
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
    return <span className="below-spec-badge">Below Spec</span>;
  }
  if (!rank) return null;
  const style = RANK_COLORS[rank] || { bg: 'var(--surface)', color: 'var(--text-muted)', label: `${rank}th` };
  return (
    <span className="rank-badge" style={{ background: style.bg, color: style.color }}>
      {style.label || `${rank}th`}
    </span>
  );
}

function StarDisplay({ value }) {
  const v = value || 0;
  return (
    <span style={{ fontSize: 16, letterSpacing: 2 }}>
      {[1, 2, 3, 4, 5].map(n => (
        <span key={n} style={{ color: n <= v ? '#eab308' : 'var(--border)' }}>★</span>
      ))}
    </span>
  );
}

export default function ComparativeSummary({ session, onBack, onEdit }) {
  const products = session.products || [];
  const metrics = session.metrics || [];
  const results = session.results || {};
  const autoPulled = session.autoPulled || {};

  const rankings = getRankings(metrics, results, products);

  // Winner: count 1st place finishes per product
  const firstPlaceCounts = {};
  for (const p of products) firstPlaceCounts[p.catalogId] = 0;
  for (const metric of metrics) {
    const rankMap = rankings[metric.id] || {};
    for (const p of products) {
      if (rankMap[p.catalogId]?.rank === 1) {
        firstPlaceCounts[p.catalogId] = (firstPlaceCounts[p.catalogId] || 0) + 1;
      }
    }
  }
  const maxFirst = Math.max(...Object.values(firstPlaceCounts));
  const winners = products.filter(p => firstPlaceCounts[p.catalogId] === maxFirst && maxFirst > 0);

  return (
    <div className="dashboard" style={{ padding: 0 }}>
      {/* Header */}
      <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 16 }}>{session.productName}</h2>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
            Comparative Analysis · Completed {formatDate(session.completedAt)}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-ghost" onClick={onBack}>← Back</button>
          {onEdit && <button className="btn btn-secondary" onClick={onEdit}>Edit</button>}
        </div>
      </div>

      <div style={{ padding: '16px 24px 32px' }}>
        {/* Winner summary */}
        {winners.length > 0 && (
          <div style={{ background: 'rgba(234,179,8,0.1)', border: '1px solid rgba(234,179,8,0.3)', borderRadius: 10, padding: 16, marginBottom: 24 }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: '#ca8a04', marginBottom: 6 }}>
              🏆 {winners.length === 1 ? 'Top Performer' : 'Tied Top Performers'}
            </div>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              {winners.map(p => (
                <div key={p.catalogId} style={{ fontSize: 14, fontWeight: 600 }}>
                  {p.name}
                  <span style={{ fontSize: 12, color: '#ca8a04', marginLeft: 6, fontWeight: 400 }}>
                    {firstPlaceCounts[p.catalogId]} metric{firstPlaceCounts[p.catalogId] !== 1 ? 's' : ''} ranked 1st
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Auto-pulled section */}
        {Object.keys(autoPulled).length > 0 && (
          <div className="auto-pull-section" style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-muted)', marginBottom: 10 }}>
              Previous Test Session Results
            </div>
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              {products.map(p => {
                const pulled = autoPulled[p.catalogId];
                if (!pulled) return null;
                return (
                  <div key={p.catalogId} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, padding: 12, minWidth: 180 }}>
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

        {/* Results table */}
        <div style={{ overflowX: 'auto' }}>
          <table className="comparative-table">
            <thead>
              <tr>
                <th style={{ textAlign: 'left', padding: '10px 12px', background: 'var(--surface)', borderBottom: '2px solid var(--border)', position: 'sticky', left: 0, zIndex: 2, minWidth: 160, whiteSpace: 'nowrap' }}>
                  Metric
                </th>
                {products.map(p => (
                  <th key={p.catalogId} style={{ textAlign: 'center', padding: '10px 16px', background: 'var(--surface)', borderBottom: '2px solid var(--border)', minWidth: 180 }}>
                    <div style={{ fontWeight: 700 }}>{p.name}</div>
                    {p.firmware && <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 400 }}>fw: {p.firmware}</div>}
                    <div style={{ fontSize: 12, color: '#ca8a04', fontWeight: 600, marginTop: 2 }}>
                      {firstPlaceCounts[p.catalogId] > 0 ? `${firstPlaceCounts[p.catalogId]}× 1st` : ''}
                    </div>
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
                          {metric.thresholdType === 'min' ? '≥' : '≤'}{metric.threshold}
                        </div>
                      )}
                    </td>
                    {products.map(p => {
                      const cell = results[p.catalogId]?.[metric.id];
                      const val = cell?.value;
                      const notes = cell?.notes;
                      const rank = metricRankings[p.catalogId];

                      return (
                        <td key={p.catalogId} className="comparative-metric-cell" style={{ textAlign: 'center', borderBottom: '1px solid var(--border)', verticalAlign: 'top' }}>
                          {metric.type === 'numeric' && (
                            <div>
                              <div style={{ fontSize: 15, fontWeight: 600 }}>
                                {val !== undefined && val !== null && val !== '' ? val : <span style={{ color: 'var(--text-dim)' }}>—</span>}
                              </div>
                              {rank && <div style={{ marginTop: 4 }}><RankBadge rank={rank.rank} belowSpec={rank.belowSpec} /></div>}
                              {notes && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{notes}</div>}
                            </div>
                          )}
                          {metric.type === 'rating' && (
                            <div>
                              {val ? <StarDisplay value={val} /> : <span style={{ color: 'var(--text-dim)' }}>—</span>}
                              {rank && <div style={{ marginTop: 4 }}><RankBadge rank={rank.rank} belowSpec={rank.belowSpec} /></div>}
                              {notes && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{notes}</div>}
                            </div>
                          )}
                          {metric.type === 'observation' && (
                            <div style={{ textAlign: 'left', fontSize: 13 }}>
                              {val || <span style={{ color: 'var(--text-dim)' }}>—</span>}
                            </div>
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

        {session.notes && (
          <div style={{ marginTop: 24, background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, padding: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-muted)', marginBottom: 8 }}>Notes</div>
            <div style={{ fontSize: 13 }}>{session.notes}</div>
          </div>
        )}
      </div>
    </div>
  );
}
