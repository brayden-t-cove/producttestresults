import { useState } from 'react';
import { SPEC_SCHEMA } from '../data/productSpecs.js';
import { CERT_STATUS_LABELS, CERT_STATUS_COLORS } from '../data/certSchema.js';

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
  return null;
}

function TechSpecsTab({ product }) {
  const schema = SPEC_SCHEMA[product.category];
  const specs = product.specs || {};

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
                <div key={field.id} className="spec-sheet-row">
                  <span className="spec-sheet-key">{field.label}</span>
                  <span className="spec-sheet-val">
                    {isBool && boolInfo ? (
                      <span style={{ color: boolInfo.color, fontWeight: 700 }}>{boolInfo.symbol}</span>
                    ) : (
                      String(val)
                    )}
                  </span>
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
    return (certData[country] && certData[country][key]) || { status: 'not-tested', certNumber: '', notes: '' };
  }

  function handleChange(country, key, field, value) {
    const updated = JSON.parse(JSON.stringify(certData));
    if (!updated[country]) updated[country] = {};
    if (!updated[country][key]) updated[country][key] = { status: 'not-tested', certNumber: '', notes: '' };
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
                      <td colSpan={4} style={{ fontWeight: 700, background: 'var(--surface-alt, rgba(0,0,0,0.04))', fontSize: 13, paddingTop: 10, paddingBottom: 10 }}>
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
        const testCases = s.testCases || [];
        const pass = testCases.filter(t => t.status === 'pass').length;
        const fail = testCases.filter(t => t.status === 'fail').length;
        const skip = testCases.filter(t => t.status === 'skip').length;
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
                {testCases.length > 0 && (
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

function ImagesTab() {
  return (
    <div className="cert-placeholder">
      <div style={{ fontSize: 48, marginBottom: 16 }}>📷</div>
      <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>Images &amp; Renders</div>
      <p style={{ marginBottom: 8 }}>Coming soon — upload product images, renders, and reference photos.</p>
      <p style={{ fontSize: 12 }}>This feature is being planned with the design team.</p>
    </div>
  );
}

const TABS = ['Tech Specs', 'Certifications', 'Testing Results', 'Images & Renders'];

export default function ProductDetail({ product, sessions, onBack, onEdit, onDelete, onOpenSession, onCertUpdate, certSchema }) {
  const [activeTab, setActiveTab] = useState('Tech Specs');

  return (
    <div className="product-detail">
      <div className="product-detail-header">
        <div>
          <button className="btn btn-ghost btn-sm" onClick={onBack} style={{ marginBottom: 8 }}>
            ← Back
          </button>
          <div className="product-detail-title">
            {product.name}
            {product.version && (
              <span style={{ marginLeft: 10, fontSize: 13, fontWeight: 600, color: 'var(--primary)', background: 'rgba(99,102,241,0.15)', borderRadius: 4, padding: '2px 8px' }}>
                {product.version}
              </span>
            )}
          </div>
          <div className="product-detail-sub">
            {[product.manufacturer, product.modelNumber].filter(Boolean).join(' · ') || product.category}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', paddingTop: 8, flexShrink: 0 }}>
          <button className="btn btn-ghost btn-sm" onClick={onEdit}>Edit Product</button>
          <button className="btn btn-danger btn-sm" onClick={onDelete}>Delete</button>
        </div>
      </div>

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
      {activeTab === 'Images & Renders' && <ImagesTab />}
    </div>
  );
}
