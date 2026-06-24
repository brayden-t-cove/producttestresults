import { useState, useEffect } from 'react';
import { SPEC_SCHEMA } from '../data/productSpecs.js';
import { CERT_STATUS_LABELS, CERT_STATUS_COLORS } from '../data/certSchema.js';
import { listComparisons } from '../lib/api.js';

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatDuration(start, end) {
  if (!start || !end) return null;
  const ms = new Date(end) - new Date(start);
  if (ms < 0) return null;
  const mins = Math.floor(ms / 60000);
  const hrs = Math.floor(mins / 60);
  if (hrs > 0) return `${hrs}h ${mins % 60}m`;
  return `${mins}m`;
}

function boolDisplay(val) {
  if (val === 'yes') return { symbol: '✓', color: 'var(--pass)' };
  if (val === 'no') return { symbol: '✗', color: 'var(--fail)' };
  if (val === 'na') return { symbol: 'N/A', color: '#6366f1' };
  if (val === 'unknown') return { symbol: 'Unknown', color: '#d97706' };
  return null;
}

function TechSpecsTab({ product }) {
  const schema = SPEC_SCHEMA[product.category];
  const specs = product.specs || {};
  const specNotes = product.specNotes || {};

  if (!schema) {
    return (
      <div className="empty-state" style={{ padding: '40px 0' }}>
        <p>No spec schema for this category.</p>
      </div>
    );
  }

  const filledGroups = schema
    .map(group => ({
      ...group,
      filledFields: group.fields.filter(f => {
        const v = specs[f.id];
        return v !== undefined && v !== '' && v !== null;
      }),
    }))
    .filter(g => g.filledFields.length > 0);

  if (filledGroups.length === 0) {
    return (
      <div className="empty-state" style={{ padding: '40px 0' }}>
        <p>No specs recorded yet. Edit this product to add technical specifications.</p>
      </div>
    );
  }

  return (
    <div className="spec-sheet">
      {filledGroups.map(group => (
        <div key={group.label} className="spec-sheet-group">
          <div className="spec-sheet-group-label">{group.label.toUpperCase()}</div>
          <div className="spec-sheet-fields">
            {group.filledFields.map(field => {
              const val = specs[field.id];
              const isBool = field.type === 'boolean';
              const boolInfo = isBool ? boolDisplay(val) : null;
              return (
                <div key={field.id} className="spec-sheet-row" style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
                  <div style={{ display: 'flex', width: '100%', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <span className="spec-sheet-key">{field.label}</span>
                    <span className="spec-sheet-val">
                      {isBool && boolInfo ? (
                        <span style={{ color: boolInfo.color, fontWeight: 700 }}>{boolInfo.symbol}</span>
                      ) : (
                        String(val)
                      )}
                    </span>
                  </div>
                  {specNotes[field.id] && (
                    <div style={{ fontSize: 11, color: 'var(--primary)', marginTop: 2, fontStyle: 'italic' }}>
                      📝 {specNotes[field.id]}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function normalizeCert(entry) {
  if (typeof entry === 'string') return { name: entry, subcerts: [] };
  return { name: entry.name || entry, subcerts: entry.subcerts || [] };
}

function CertificationsTab({ product, onCertUpdate, certSchema }) {
  const [selectedCountry, setSelectedCountry] = useState(null);
  const certData = product.certifications || {};
  const schema = certSchema || {};

  function getEntry(country, key) {
    return (certData[country] && certData[country][key]) || { status: 'not-tested', certNumber: '', notes: '', url: '' };
  }

  function handleChange(country, key, field, value) {
    const updated = JSON.parse(JSON.stringify(certData));
    if (!updated[country]) updated[country] = {};
    if (!updated[country][key]) updated[country][key] = { status: 'not-tested', certNumber: '', notes: '', url: '' };
    updated[country][key][field] = value;
    onCertUpdate(product.id, updated);
  }

  const countries = Object.keys(schema);

  function renderCertRow(country, key, label, indented) {
    const entry = getEntry(country, key);
    const statusColor = CERT_STATUS_COLORS[entry.status] || CERT_STATUS_COLORS['not-tested'];
    return (
      <tr key={key}>
        <td style={{ fontWeight: 600, paddingLeft: indented ? 28 : undefined }}>
          <span className="cert-status-dot" style={{ background: statusColor }} />
          {label}
        </td>
        <td>
          <select
            value={entry.status}
            onChange={e => handleChange(country, key, 'status', e.target.value)}
            style={{ fontSize: 13 }}
          >
            {Object.entries(CERT_STATUS_LABELS).map(([val, lbl]) => (
              <option key={val} value={val}>{lbl}</option>
            ))}
          </select>
        </td>
        <td>
          <input
            type="text"
            value={entry.certNumber}
            placeholder="—"
            onChange={e => handleChange(country, key, 'certNumber', e.target.value)}
            onBlur={e => handleChange(country, key, 'certNumber', e.target.value)}
            style={{ fontSize: 13, width: '100%' }}
          />
        </td>
        <td>
          <input
            type="text"
            value={entry.notes}
            placeholder="—"
            onChange={e => handleChange(country, key, 'notes', e.target.value)}
            onBlur={e => handleChange(country, key, 'notes', e.target.value)}
            style={{ fontSize: 13, width: '100%' }}
          />
        </td>
        <td>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <input
              type="url"
              value={entry.url || ''}
              placeholder="https://..."
              onChange={e => handleChange(country, key, 'url', e.target.value)}
              onBlur={e => handleChange(country, key, 'url', e.target.value)}
              style={{ fontSize: 13, width: '100%' }}
            />
            {entry.url && (
              <a href={entry.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, color: 'var(--primary)', whiteSpace: 'nowrap' }}>
                ↗
              </a>
            )}
          </div>
        </td>
      </tr>
    );
  }

  return (
    <div className="cert-layout">
      <div className="cert-country-list">
        {countries.map(country => (
          <div
            key={country}
            className={`cert-country-item${selectedCountry === country ? ' active' : ''}`}
            onClick={() => setSelectedCountry(country)}
          >
            {country}
          </div>
        ))}
      </div>
      <div>
        {!selectedCountry ? (
          <div className="cert-placeholder">
            <div style={{ fontSize: 32, marginBottom: 12 }}>🌍</div>
            <p>Select a country to view its certifications.</p>
          </div>
        ) : (
          <div>
            <h3 style={{ marginBottom: 16, fontSize: 16 }}>{selectedCountry}</h3>
            <table className="cert-table">
              <thead>
                <tr>
                  <th>Certification</th>
                  <th>Status</th>
                  <th>Cert #</th>
                  <th>Notes</th>
                  <th>Document / Link</th>
                </tr>
              </thead>
              <tbody>
                {(schema[selectedCountry] || []).map(rawCert => {
                  const cert = normalizeCert(rawCert);
                  if (!cert.subcerts || cert.subcerts.length === 0) {
                    return renderCertRow(selectedCountry, cert.name, cert.name, false);
                  }
                  return [
                    <tr key={`header-${cert.name}`}>
                      <td colSpan={5} style={{ fontWeight: 700, background: 'var(--surface-alt, rgba(0,0,0,0.04))', fontSize: 13, paddingTop: 10, paddingBottom: 10 }}>
                        {cert.name}
                      </td>
                    </tr>,
                    ...cert.subcerts.map(sub =>
                      renderCertRow(selectedCountry, `${cert.name} > ${sub}`, sub, true)
                    ),
                  ];
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function TestingResultsTab({ sessions, onOpenSession }) {
  if (sessions.length === 0) {
    return (
      <div className="empty-state" style={{ padding: '40px 0' }}>
        <p>No test sessions recorded for this product yet.</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {sessions.map(s => {
        const pass = s.passCount ?? 0;
        const fail = s.failCount ?? 0;
        const skip = s.skipCount ?? 0;
        const total = s.testCaseCount ?? 0;
        const duration = formatDuration(s.createdAt, s.completedAt);
        return (
          <div
            key={s.id}
            className="session-card"
            onClick={() => onOpenSession && onOpenSession(s.id)}
            style={{ cursor: 'pointer' }}
          >
            <div className="session-card-info">
              <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>
                {formatDate(s.createdAt || s.date)}
                {s.firmware && <span style={{ marginLeft: 10, fontSize: 12, color: 'var(--text-muted)' }}>FW: {s.firmware}</span>}
                {s.appConfigName && <span style={{ marginLeft: 10, fontSize: 12, color: 'var(--text-muted)' }}>{s.appConfigName}</span>}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', gap: 12 }}>
                {total > 0 && (
                  <>
                    <span style={{ color: 'var(--pass)' }}>✓ {pass} pass</span>
                    <span style={{ color: 'var(--fail)' }}>✗ {fail} fail</span>
                    <span style={{ color: 'var(--skip)' }}>— {skip} skip</span>
                  </>
                )}
                {duration && <span>{duration}</span>}
                {s.issueCount > 0 && <span>{s.issueCount} issue{s.issueCount !== 1 ? 's' : ''}</span>}
              </div>
            </div>
            <div className="session-card-right">
              <span className={`badge badge-${s.status}`}>{s.status}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

const MEDIA_CATEGORIES = [
  { id: 'renders', label: 'Renders & Product Images', icon: '🖼' },
  { id: 'packaging', label: 'Packaging', icon: '📦' },
  { id: 'manual', label: 'User Manual', icon: '📖' },
  { id: 'other', label: 'Other', icon: '🔗' },
];

function MediaTab({ product, onProductUpdate, comparisons, onOpenComparison, onStartComparison }) {
  const mediaLinks = product.mediaLinks || [];
  const [adding, setAdding] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [newCategory, setNewCategory] = useState('renders');
  const [saving, setSaving] = useState(false);

  async function handleAdd() {
    if (!newUrl.trim()) return;
    setSaving(true);
    const entry = { id: crypto.randomUUID(), label: newLabel.trim() || newUrl.trim(), url: newUrl.trim(), category: newCategory };
    await onProductUpdate({ mediaLinks: [...mediaLinks, entry] });
    setNewLabel(''); setNewUrl(''); setNewCategory('renders'); setAdding(false); setSaving(false);
  }

  async function handleRemove(id) {
    await onProductUpdate({ mediaLinks: mediaLinks.filter(m => m.id !== id) });
  }

  const grouped = MEDIA_CATEGORIES.map(cat => ({
    ...cat,
    items: mediaLinks.filter(m => m.category === cat.id),
  })).filter(g => g.items.length > 0 || adding);

  return (
    <div style={{ padding: '4px 0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>
          Add links to renders, packaging photos, manuals, and other visual reference material.
          Direct upload coming in a future release.
        </p>
        {!adding && (
          <button className="btn btn-secondary btn-sm" style={{ flexShrink: 0, marginLeft: 16 }} onClick={() => setAdding(true)}>
            + Add Link
          </button>
        )}
      </div>

      {adding && (
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: 16, marginBottom: 20 }}>
          <div className="form-group" style={{ marginBottom: 10 }}>
            <label>Category</label>
            <select value={newCategory} onChange={e => setNewCategory(e.target.value)}>
              {MEDIA_CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.icon} {c.label}</option>)}
            </select>
          </div>
          <div className="form-group" style={{ marginBottom: 10 }}>
            <label>Label <span style={{ fontWeight: 400, color: 'var(--text-muted)', fontSize: 12 }}>(optional)</span></label>
            <input type="text" placeholder="e.g. Front render, Retail box" value={newLabel} onChange={e => setNewLabel(e.target.value)} />
          </div>
          <div className="form-group" style={{ marginBottom: 12 }}>
            <label>URL</label>
            <input type="url" placeholder="https://..." value={newUrl} onChange={e => setNewUrl(e.target.value)} />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-primary btn-sm" onClick={handleAdd} disabled={!newUrl.trim() || saving}>
              {saving ? 'Saving...' : 'Add'}
            </button>
            <button className="btn btn-ghost btn-sm" onClick={() => { setAdding(false); setNewLabel(''); setNewUrl(''); }}>Cancel</button>
          </div>
        </div>
      )}

      {mediaLinks.length === 0 && !adding ? (
        <div className="empty-state" style={{ padding: '40px 0' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🖼</div>
          <p>No media links yet.</p>
          <button className="btn btn-secondary" style={{ marginTop: 12 }} onClick={() => setAdding(true)}>+ Add Link</button>
        </div>
      ) : (
        MEDIA_CATEGORIES.map(cat => {
          const items = mediaLinks.filter(m => m.category === cat.id);
          if (items.length === 0) return null;
          return (
            <div key={cat.id} style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.06em', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 10 }}>
                {cat.icon} {cat.label}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {items.map(m => (
                  <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)' }}>
                    <a href={m.url} target="_blank" rel="noopener noreferrer" style={{ flex: 1, color: 'var(--primary)', fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {m.label || m.url}
                    </a>
                    <button className="btn btn-ghost btn-sm" style={{ color: 'var(--text-muted)', padding: '2px 6px' }} onClick={() => handleRemove(m.id)}>×</button>
                  </div>
                ))}
              </div>
            </div>
          );
        })
      )}

      {/* Comparisons */}
      <div style={{ marginTop: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)' }}>
            Comparisons
          </div>
          {onStartComparison && (
            <button className="btn btn-ghost btn-sm" onClick={onStartComparison}>+ New Comparison</button>
          )}
        </div>
        {comparisons && comparisons.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {comparisons.map(comp => (
              <div
                key={comp.id}
                onClick={() => onOpenComparison && onOpenComparison(comp)}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, cursor: 'pointer' }}
              >
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>
                    {comp.mode === '1v1' ? '1:1' : 'Ranking'}: {comp.products?.map(p => p.name).join(' vs ')}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                    {formatDate(comp.completedAt || comp.createdAt)} · {comp.products?.length || 0} products
                  </div>
                </div>
                <span style={{ fontSize: 18, color: 'var(--text-muted)' }}>→</span>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ fontSize: 13, color: 'var(--text-muted)', padding: '12px 0' }}>No comparisons yet.</div>
        )}
      </div>
    </div>
  );
}

const PROJECT_DOC_TYPES = [
  { id: 'gantt', label: 'Gantt / Project Timeline', icon: '📅' },
  { id: 'checklist', label: 'Checklist / Task List', icon: '✅' },
  { id: 'spec', label: 'Specification Document', icon: '📋' },
  { id: 'roadmap', label: 'Roadmap', icon: '🗺' },
  { id: 'other', label: 'Other', icon: '📎' },
];

function ProjectDocsTab({ product, onProductUpdate }) {
  const projectDocs = product.projectDocs || [];
  const [adding, setAdding] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [newType, setNewType] = useState('gantt');
  const [saving, setSaving] = useState(false);

  async function handleAdd() {
    if (!newUrl.trim()) return;
    setSaving(true);
    const entry = { id: crypto.randomUUID(), label: newLabel.trim() || newUrl.trim(), url: newUrl.trim(), type: newType };
    await onProductUpdate({ projectDocs: [...projectDocs, entry] });
    setNewLabel(''); setNewUrl(''); setNewType('gantt'); setAdding(false); setSaving(false);
  }

  async function handleRemove(id) {
    await onProductUpdate({ projectDocs: projectDocs.filter(d => d.id !== id) });
  }

  return (
    <div style={{ padding: '4px 0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>
          Link project documents — Gantt charts, checklists, spec docs, and roadmaps.
          Direct upload and a full PM checklist builder are planned for a future release.
        </p>
        {!adding && (
          <button className="btn btn-secondary btn-sm" style={{ flexShrink: 0, marginLeft: 16 }} onClick={() => setAdding(true)}>
            + Add Link
          </button>
        )}
      </div>

      {adding && (
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: 16, marginBottom: 20 }}>
          <div className="form-group" style={{ marginBottom: 10 }}>
            <label>Document Type</label>
            <select value={newType} onChange={e => setNewType(e.target.value)}>
              {PROJECT_DOC_TYPES.map(t => <option key={t.id} value={t.id}>{t.icon} {t.label}</option>)}
            </select>
          </div>
          <div className="form-group" style={{ marginBottom: 10 }}>
            <label>Label <span style={{ fontWeight: 400, color: 'var(--text-muted)', fontSize: 12 }}>(optional)</span></label>
            <input type="text" placeholder="e.g. Q3 Launch Timeline, Integration Checklist" value={newLabel} onChange={e => setNewLabel(e.target.value)} />
          </div>
          <div className="form-group" style={{ marginBottom: 12 }}>
            <label>URL</label>
            <input type="url" placeholder="https://..." value={newUrl} onChange={e => setNewUrl(e.target.value)} />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-primary btn-sm" onClick={handleAdd} disabled={!newUrl.trim() || saving}>
              {saving ? 'Saving...' : 'Add'}
            </button>
            <button className="btn btn-ghost btn-sm" onClick={() => { setAdding(false); setNewLabel(''); setNewUrl(''); }}>Cancel</button>
          </div>
        </div>
      )}

      {projectDocs.length === 0 && !adding ? (
        <div className="empty-state" style={{ padding: '40px 0' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📅</div>
          <p>No project documents linked yet.</p>
          <button className="btn btn-secondary" style={{ marginTop: 12 }} onClick={() => setAdding(true)}>+ Add Link</button>
        </div>
      ) : (
        PROJECT_DOC_TYPES.map(docType => {
          const items = projectDocs.filter(d => d.type === docType.id);
          if (items.length === 0) return null;
          return (
            <div key={docType.id} style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.06em', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 10 }}>
                {docType.icon} {docType.label}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {items.map(d => (
                  <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)' }}>
                    <a href={d.url} target="_blank" rel="noopener noreferrer" style={{ flex: 1, color: 'var(--primary)', fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {d.label || d.url}
                    </a>
                    <button className="btn btn-ghost btn-sm" style={{ color: 'var(--text-muted)', padding: '2px 6px' }} onClick={() => handleRemove(d.id)}>×</button>
                  </div>
                ))}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

const SEVERITY_COLORS = { critical: '#dc2626', high: '#ea580c', medium: '#d97706', low: '#16a34a' };
const STATUS_COLORS_ISSUE = { Open: 'var(--fail)', investigating: '#f59e0b', Fixed: 'var(--pass)', 'Cannot Reproduce': 'var(--text-muted)' };

function KnownIssuesTab({ product, onOpenSession }) {
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    fetch('/api/issues')
      .then(r => r.json())
      .then(data => {
        const filtered = data.filter(i =>
          i.catalogId === product.id || i.productName === product.name
        );
        setIssues(filtered);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [product.id, product.name]);

  if (loading) return <div className="ai-loading"><div className="spinner" /></div>;

  if (issues.length === 0) {
    return (
      <div className="empty-state" style={{ padding: '40px 0' }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>✓</div>
        <p>No known issues logged for this product.</p>
        <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>Issues are logged during test sessions and will appear here automatically.</p>
      </div>
    );
  }

  const open = issues.filter(i => i.derivedStatus !== 'Fixed' && i.derivedStatus !== 'Cannot Reproduce');
  const closed = issues.filter(i => i.derivedStatus === 'Fixed' || i.derivedStatus === 'Cannot Reproduce');

  function renderIssue(issue) {
    const key = `${issue.sessionId}-${issue.id}`;
    const isOpen = expanded === key;
    return (
      <div key={key} style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', marginBottom: 8, overflow: 'hidden' }}>
        <div
          style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', cursor: 'pointer', background: 'var(--card)' }}
          onClick={() => setExpanded(isOpen ? null : key)}
        >
          <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 7px', borderRadius: 3, background: SEVERITY_COLORS[issue.severity] + '22', color: SEVERITY_COLORS[issue.severity], textTransform: 'uppercase', flexShrink: 0 }}>
            {issue.severity || '—'}
          </span>
          <span style={{ flex: 1, fontWeight: 600, fontSize: 13 }}>{issue.title}</span>
          <span style={{ fontSize: 11, color: 'var(--text-muted)', flexShrink: 0 }}>{issue.issueCategory || issue.category || ''}</span>
          <span style={{ fontSize: 11, fontWeight: 600, color: STATUS_COLORS_ISSUE[issue.derivedStatus] || 'var(--text-muted)', flexShrink: 0, textTransform: 'capitalize' }}>
            {(issue.derivedStatus || 'open').replace('_', ' ')}
          </span>
          <span style={{ fontSize: 12, color: 'var(--text-muted)', flexShrink: 0 }}>{isOpen ? '▾' : '▸'}</span>
        </div>
        {isOpen && (
          <div style={{ padding: '10px 14px', borderTop: '1px solid var(--border)', background: 'var(--bg)', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {issue.description && <div><span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Description</span><div style={{ fontSize: 13, marginTop: 2 }}>{issue.description}</div></div>}
            {issue.reproSteps && <div><span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Repro Steps</span><pre style={{ fontSize: 12, marginTop: 2, whiteSpace: 'pre-wrap', fontFamily: 'inherit' }}>{issue.reproSteps}</pre></div>}
            {issue.affectedTestCase && <div><span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Affected Test</span><div style={{ fontSize: 13, marginTop: 2 }}>{issue.affectedTestCase}</div></div>}
            <div style={{ display: 'flex', gap: 16, fontSize: 12, color: 'var(--text-muted)', flexWrap: 'wrap' }}>
              {issue.firmware && <span>FW: {issue.firmware}</span>}
              {issue.sessionDate && <span>Session: {formatDate(issue.sessionDate)}</span>}
              {issue.sourceTicket && <a href={issue.sourceTicket} target="_blank" rel="noreferrer" style={{ color: 'var(--primary)' }}>Ticket ↗</a>}
              {issue.sessionId && onOpenSession && (
                <button className="btn btn-ghost btn-sm" style={{ fontSize: 11, padding: '1px 8px' }} onClick={() => onOpenSession(issue.sessionId)}>
                  Open session ↗
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 16, marginBottom: 16, fontSize: 13 }}>
        <span style={{ color: 'var(--fail)', fontWeight: 600 }}>{open.length} open</span>
        <span style={{ color: 'var(--text-muted)' }}>{closed.length} resolved</span>
        <span style={{ color: 'var(--text-muted)' }}>{issues.length} total</span>
      </div>
      {open.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 8 }}>Open</div>
          {open.map(renderIssue)}
        </div>
      )}
      {closed.length > 0 && (
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 8 }}>Resolved</div>
          {closed.map(renderIssue)}
        </div>
      )}
    </div>
  );
}

const TABS = ['Tech Specs', 'Certifications', 'Testing Results', 'Known Issues', 'Media & Documents', 'Project Docs'];

function PdfExportModal({ product, onClose }) {
  const [hideOem, setHideOem] = useState(false);

  function handlePrint() {
    if (hideOem) document.body.classList.add('pdf-hide-oem');
    else document.body.classList.remove('pdf-hide-oem');
    onClose();
    setTimeout(() => {
      window.print();
      document.body.classList.remove('pdf-hide-oem');
    }, 100);
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 380 }}>
        <h2 style={{ marginBottom: 8 }}>Export Product Sheet</h2>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
          Choose what to include in the PDF before printing.
        </p>
        <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, cursor: 'pointer', padding: '10px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: hideOem ? 'var(--primary-dim)' : 'var(--card)' }}>
          <input
            type="checkbox"
            checked={hideOem}
            onChange={e => setHideOem(e.target.checked)}
            style={{ width: 'auto' }}
          />
          <div>
            <div style={{ fontWeight: 600 }}>Hide Manufacturer / OEM</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
              Removes manufacturer name and model number — useful when sharing with external partners.
            </div>
          </div>
        </label>
        <div style={{ display: 'flex', gap: 8, marginTop: 16, justifyContent: 'flex-end' }}>
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handlePrint}>🖨 Print / Save PDF</button>
        </div>
      </div>
    </div>
  );
}

export default function ProductDetail({ product, sessions, onBack, onEdit, onDelete, onOpenSession, onStartComparison, onOpenComparison, onCertUpdate, certSchema, onProductUpdate, catalog, onViewProduct }) {
  const [activeTab, setActiveTab] = useState('Tech Specs');
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [comparisons, setComparisons] = useState([]);

  useEffect(() => {
    listComparisons(product.id).then(setComparisons).catch(() => {});
  }, [product.id]);

  return (
    <div className="product-detail">
      {showPdfModal && <PdfExportModal product={product} onClose={() => setShowPdfModal(false)} />}
      <div className="product-detail-header">
        <div>
          <button className="btn btn-ghost btn-sm" onClick={onBack} style={{ marginBottom: 8 }}>
            ← Back
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            {product.imageUrl && (
              <img
                src={product.imageUrl}
                alt={product.name}
                style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 12, border: '1px solid var(--border)', flexShrink: 0 }}
              />
            )}
            <div>
              <div className="product-detail-title">
                {product.name}
                {product.version && (
                  <span style={{ marginLeft: 10, fontSize: 13, fontWeight: 600, color: 'var(--primary)', background: 'rgba(99,102,241,0.15)', borderRadius: 4, padding: '2px 8px' }}>
                    {product.version}
                  </span>
                )}
                {product.revision && (
                  <span style={{ marginLeft: 8, fontSize: 13, fontWeight: 600, color: '#f59e0b', background: 'rgba(245,158,11,0.15)', borderRadius: 4, padding: '2px 8px' }}>
                    {product.revision}
                  </span>
                )}
              </div>
              <div className="product-detail-sub product-detail-oem">
                {[product.manufacturer, product.modelNumber].filter(Boolean).join(' · ') || product.category}
                {product.subclass && (
                  <span style={{ marginLeft: 8, color: 'var(--primary)', fontWeight: 500, fontSize: 12 }}>· {product.subclass}</span>
                )}
              </div>
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', paddingTop: 8, flexShrink: 0, flexWrap: 'wrap' }}>
          {onStartComparison && (
            <button className="btn btn-secondary btn-sm" onClick={onStartComparison}>⚖ Compare</button>
          )}
          <button className="btn btn-secondary btn-sm" onClick={() => setShowPdfModal(true)}>
            🖨 Export PDF
          </button>
          <button className="btn btn-ghost btn-sm" onClick={onEdit}>Edit Product</button>
          <button className="btn btn-danger btn-sm" onClick={onDelete}>Delete</button>
        </div>
      </div>

      {(product.replacesProductId || product.supersededBy) && (
        <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
          {product.replacesProductId && (() => {
            const predecessor = (catalog || []).find(p => p.id === product.replacesProductId);
            return predecessor ? (
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 12px', fontSize: 12 }}>
                <span style={{ color: 'var(--text-muted)' }}>Replaces</span>
                <button
                  className="btn btn-ghost btn-sm"
                  style={{ padding: '0 4px', fontSize: 12, fontWeight: 600 }}
                  onClick={() => onViewProduct && onViewProduct(predecessor)}
                >
                  {predecessor.modelNumber || predecessor.name}{predecessor.revision ? ` (${predecessor.revision})` : ''}
                </button>
              </div>
            ) : null;
          })()}
          {product.supersededBy && (() => {
            const successor = (catalog || []).find(p => p.id === product.supersededBy);
            return successor ? (
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 8, padding: '6px 12px', fontSize: 12 }}>
                <span style={{ color: '#f59e0b' }}>⚠ Superseded by</span>
                <button
                  className="btn btn-ghost btn-sm"
                  style={{ padding: '0 4px', fontSize: 12, fontWeight: 600 }}
                  onClick={() => onViewProduct && onViewProduct(successor)}
                >
                  {successor.modelNumber || successor.name}{successor.revision ? ` (${successor.revision})` : ''}
                </button>
              </div>
            ) : null;
          })()}
        </div>
      )}

      <div className="product-tabs">
        {TABS.map(tab => (
          <button
            key={tab}
            className={`product-tab${activeTab === tab ? ' active' : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 'Tech Specs' && <TechSpecsTab product={product} />}
      {activeTab === 'Certifications' && <CertificationsTab product={product} onCertUpdate={onCertUpdate} certSchema={certSchema} />}
      {activeTab === 'Testing Results' && <TestingResultsTab sessions={sessions} onOpenSession={onOpenSession} />}
      {activeTab === 'Known Issues' && <KnownIssuesTab product={product} onOpenSession={onOpenSession} />}
      {activeTab === 'Media & Documents' && <MediaTab product={product} onProductUpdate={onProductUpdate} comparisons={comparisons} onOpenComparison={onOpenComparison} onStartComparison={onStartComparison} />}
      {activeTab === 'Project Docs' && <ProjectDocsTab product={product} onProductUpdate={onProductUpdate} />}
    </div>
  );
}
