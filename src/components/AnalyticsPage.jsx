import { useState, useEffect } from 'react';

function formatPct(rate) {
  return Math.round((rate || 0) * 100) + '%';
}

function StatCard({ label, value, color }) {
  return (
    <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, padding: '20px 18px', textAlign: 'center' }}>
      <div style={{ fontSize: 32, fontWeight: 700, color: color || 'var(--text)', lineHeight: 1.1 }}>{value}</div>
      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>{label}</div>
    </div>
  );
}

function CssBar({ label, value, max, color, displayValue }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, fontSize: 13 }}>
      <div style={{ width: 160, textAlign: 'right', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flexShrink: 0 }} title={label}>{label}</div>
      <div style={{ flex: 1, background: 'var(--surface)', borderRadius: 4, height: 20 }}>
        <div style={{ width: `${pct}%`, height: '100%', borderRadius: 4, background: color || 'var(--primary)', transition: 'width 0.4s' }} />
      </div>
      <div style={{ width: 52, textAlign: 'left', fontWeight: 600, fontSize: 13, color: 'var(--text)' }}>{displayValue}</div>
    </div>
  );
}

function PassRateBar({ productName, passRate }) {
  const pct = Math.round((passRate || 0) * 100);
  let color = '#22c55e';
  if (pct < 60) color = '#ef4444';
  else if (pct < 80) color = '#f97316';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, fontSize: 13 }}>
      <div style={{ width: 180, textAlign: 'right', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flexShrink: 0 }} title={productName}>{productName}</div>
      <div style={{ flex: 1, background: 'var(--surface)', borderRadius: 4, height: 22 }}>
        <div style={{ width: `${pct}%`, height: '100%', borderRadius: 4, background: color, transition: 'width 0.4s' }} />
      </div>
      <div style={{ width: 42, textAlign: 'left', fontWeight: 600, fontSize: 13, color }}>{pct}%</div>
    </div>
  );
}

function DonutChart({ data }) {
  // data: { label, value, color }[]
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) {
    return <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '32px 0', fontSize: 13 }}>No issues logged yet</div>;
  }

  const R = 60;
  const cx = 80;
  const cy = 80;
  const circumference = 2 * Math.PI * R;

  let offset = 0;
  const segments = data.map(d => {
    const pct = d.value / total;
    const seg = { ...d, pct, offset, dasharray: circumference * pct, dashoffset: -circumference * offset };
    offset += pct;
    return seg;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
      <svg width={160} height={160} viewBox="0 0 160 160">
        {segments.map((seg, i) => (
          <circle
            key={i}
            cx={cx}
            cy={cy}
            r={R}
            fill="none"
            stroke={seg.color}
            strokeWidth={22}
            strokeDasharray={`${seg.dasharray} ${circumference}`}
            strokeDashoffset={seg.dashoffset}
            transform={`rotate(-90 ${cx} ${cy})`}
            style={{ transition: 'stroke-dasharray 0.5s' }}
          />
        ))}
        <text x={cx} y={cy - 6} textAnchor="middle" fill="var(--text)" fontSize="22" fontWeight="700">{total}</text>
        <text x={cx} y={cy + 14} textAnchor="middle" fill="var(--text-muted)" fontSize="11">issues</text>
      </svg>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 16px', justifyContent: 'center' }}>
        {data.map((d, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
            <div style={{ width: 10, height: 10, borderRadius: 2, background: d.color, flexShrink: 0 }} />
            <span style={{ color: 'var(--text-muted)' }}>{d.label}</span>
            <strong style={{ color: 'var(--text)' }}>{d.value}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}

function FirmwareComparison({ productStats }) {
  const productsWithMultiple = productStats.filter(p => {
    const firmwares = new Set(p.sessions.map(s => s.firmware).filter(Boolean));
    return firmwares.size >= 1;
  });

  const [selectedProduct, setSelectedProduct] = useState('');

  const productOptions = productsWithMultiple.length > 0 ? productsWithMultiple : productStats;
  const currentProduct = productOptions.find(p => p.productName === selectedProduct) || productOptions[0];

  if (productStats.length === 0) {
    return <div style={{ color: 'var(--text-muted)', fontSize: 13, padding: '20px 0' }}>No session data yet</div>;
  }

  if (!currentProduct) return null;

  // Group by firmware
  const firmwareMap = {};
  for (const s of currentProduct.sessions) {
    const fw = s.firmware || 'Unknown';
    if (!firmwareMap[fw]) firmwareMap[fw] = { passCount: 0, total: 0 };
    firmwareMap[fw].passCount += s.passCount || 0;
    firmwareMap[fw].total += (s.passCount || 0) + (s.failCount || 0); // skip/na excluded
  }
  const firmwares = Object.entries(firmwareMap).map(([fw, d]) => ({ fw, passRate: d.total > 0 ? d.passCount / d.total : 0 }));

  return (
    <div>
      <div style={{ marginBottom: 14, display: 'flex', alignItems: 'center', gap: 10 }}>
        <select
          value={selectedProduct || currentProduct.productName}
          onChange={e => setSelectedProduct(e.target.value)}
          style={{ flex: 1, fontSize: 13 }}
        >
          {productOptions.map(p => <option key={p.productName} value={p.productName}>{p.productName}</option>)}
        </select>
      </div>
      {firmwares.length < 2 ? (
        <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>Need multiple firmware versions to compare</div>
      ) : (
        firmwares.map(f => (
          <PassRateBar key={f.fw} productName={f.fw} passRate={f.passRate} />
        ))
      )}
    </div>
  );
}

export default function AnalyticsPage({ onBack, onGoToIssues }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch('/api/analytics')
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  }, []);

  if (loading) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="ai-loading"><div className="spinner spinner-lg" /></div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ flex: 1, padding: 32 }}>
        <div className="error-msg">{error}</div>
      </div>
    );
  }

  const stats = data?.overallStats || {};
  const productStats = data?.productStats || [];
  const issueSev = data?.issueSeverityBreakdown || {};
  const issueCat = data?.issueCategoryBreakdown || {};
  const topFailing = data?.topFailingTests || [];
  const openByProduct = data?.openIssuesByProduct || [];

  const passRate = (stats.passCount + stats.failCount) > 0
    ? Math.round((stats.passCount / (stats.passCount + stats.failCount)) * 100)
    : 0;

  const donutData = [
    { label: 'Critical', value: issueSev.Critical || 0, color: '#ef4444' },
    { label: 'High', value: issueSev.High || 0, color: '#f97316' },
    { label: 'Medium', value: issueSev.Medium || 0, color: '#eab308' },
    { label: 'Low', value: issueSev.Low || 0, color: '#6b7280' },
  ];

  const catEntries = Object.entries(issueCat).sort((a, b) => b[1] - a[1]);
  const maxCat = catEntries.length > 0 ? catEntries[0][1] : 1;

  const panelStyle = { background: 'var(--card)', borderRadius: 10, padding: 20 };
  const panelHeaderStyle = { fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 16 };

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '32px 24px', maxWidth: 1200, margin: '0 auto', width: '100%' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 28 }}>
        <button className="btn btn-ghost" onClick={onBack}>← Back</button>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>📊 Analytics</h1>
      </div>

      {/* Row 1: Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        <StatCard label="Total Sessions" value={stats.sessionCount || 0} color="var(--primary)" />
        <StatCard label="Overall Pass Rate" value={`${passRate}%`} color={passRate >= 80 ? '#22c55e' : passRate >= 60 ? '#f97316' : '#ef4444'} />
        <StatCard label="Total Issues" value={data?.totalIssues || 0} color="var(--high)" />
        <StatCard label="Open Issues" value={data?.totalOpenIssues || 0} color={(data?.totalOpenIssues || 0) > 0 ? '#ef4444' : 'var(--pass)'} />
      </div>

      {/* Row 2: Pass Rate by Product + Donut */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
        <div style={panelStyle}>
          <div style={panelHeaderStyle}>Pass Rate by Product</div>
          {productStats.length === 0 ? (
            <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>No session data yet</div>
          ) : (
            productStats.map(p => (
              <PassRateBar key={p.productName} productName={p.productName} passRate={p.passRate} />
            ))
          )}
        </div>
        <div style={panelStyle}>
          <div style={panelHeaderStyle}>Issue Severity Breakdown</div>
          <DonutChart data={donutData} />
        </div>
      </div>

      {/* Row 3: Firmware Comparison + Issue Categories */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
        <div style={panelStyle}>
          <div style={panelHeaderStyle}>Firmware Comparison</div>
          <FirmwareComparison productStats={productStats} />
        </div>
        <div style={panelStyle}>
          <div style={panelHeaderStyle}>Issue Category Breakdown</div>
          {catEntries.length === 0 ? (
            <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>No issues logged yet</div>
          ) : (
            catEntries.map(([cat, count]) => (
              <CssBar key={cat} label={cat} value={count} max={maxCat} color="var(--primary)" displayValue={count} />
            ))
          )}
        </div>
      </div>

      {/* Row 4: Top Failing Tests */}
      <div style={{ ...panelStyle, marginBottom: 24 }}>
        <div style={panelHeaderStyle}>Top Failing Test Cases</div>
        {topFailing.length === 0 ? (
          <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>No data yet</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr>
                {['Test #', 'Title', 'Fail Count', 'Sessions Tested', 'Fail Rate'].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '8px 10px', color: 'var(--text-muted)', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', borderBottom: '1px solid var(--border)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {topFailing.map((t, i) => {
                const rate = t.totalCount > 0 ? t.failCount / t.totalCount : 0;
                const highFail = rate > 0.6;
                return (
                  <tr key={i} style={{ background: highFail ? 'rgba(239,68,68,0.05)' : 'transparent' }}>
                    <td style={{ padding: '9px 10px', borderBottom: '1px solid var(--border)', color: 'var(--text-muted)', fontSize: 12 }}>{t.testNumber || '—'}</td>
                    <td style={{ padding: '9px 10px', borderBottom: '1px solid var(--border)', fontWeight: 500 }}>{t.title}</td>
                    <td style={{ padding: '9px 10px', borderBottom: '1px solid var(--border)', color: '#ef4444', fontWeight: 700 }}>{t.failCount}</td>
                    <td style={{ padding: '9px 10px', borderBottom: '1px solid var(--border)', color: 'var(--text-muted)' }}>{t.totalCount}</td>
                    <td style={{ padding: '9px 10px', borderBottom: '1px solid var(--border)', color: highFail ? '#ef4444' : 'var(--text)', fontWeight: highFail ? 700 : 400 }}>
                      {Math.round(rate * 100)}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Row 5: Open Issues by Product */}
      <div style={panelStyle}>
        <div style={panelHeaderStyle}>Open Issues by Product</div>
        {openByProduct.length === 0 ? (
          <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>No open issues</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr>
                {['Product', 'Open Issues', 'Critical', 'High', 'Med/Low', 'Oldest (days)'].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '8px 10px', color: 'var(--text-muted)', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', borderBottom: '1px solid var(--border)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {openByProduct.map((p, i) => (
                <tr
                  key={i}
                  style={{ cursor: 'pointer' }}
                  onClick={() => onGoToIssues && onGoToIssues(p.productName)}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--surface)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <td style={{ padding: '9px 10px', borderBottom: '1px solid var(--border)', fontWeight: 500 }}>{p.productName}</td>
                  <td style={{ padding: '9px 10px', borderBottom: '1px solid var(--border)', fontWeight: 700, color: 'var(--primary)' }}>{p.openCount}</td>
                  <td style={{ padding: '9px 10px', borderBottom: '1px solid var(--border)', color: p.critical > 0 ? '#ef4444' : 'var(--text-muted)' }}>{p.critical || 0}</td>
                  <td style={{ padding: '9px 10px', borderBottom: '1px solid var(--border)', color: p.high > 0 ? '#f97316' : 'var(--text-muted)' }}>{p.high || 0}</td>
                  <td style={{ padding: '9px 10px', borderBottom: '1px solid var(--border)', color: 'var(--text-muted)' }}>{p.medLow || 0}</td>
                  <td style={{ padding: '9px 10px', borderBottom: '1px solid var(--border)', color: p.oldestDays > 14 ? '#f97316' : 'var(--text-muted)' }}>{p.oldestDays}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
