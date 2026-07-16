import { useState } from 'react';
import { CERT_SCHEMA, COMMON_COUNTRIES } from '../data/certSchema.js';

function normalizeCert(entry) {
  if (typeof entry === 'string') return { name: entry, subcerts: [] };
  return { name: entry.name || '', subcerts: entry.subcerts || [] };
}

function toArray(schema) {
  return Object.entries(schema || {}).map(([country, certs]) => ({
    country,
    certs: certs.map(normalizeCert),
  }));
}

function toObject(arr) {
  const obj = {};
  for (const { country, certs } of arr) {
    obj[country] = certs.map(c => ({ name: c.name, subcerts: [...c.subcerts] }));
  }
  return obj;
}

export default function CertEditor({ schema, onSave, onBack }) {
  const [items, setItems] = useState(() => toArray(schema));
  const [saved, setSaved] = useState(false);
  const [newCountry, setNewCountry] = useState('');
  const [customCountry, setCustomCountry] = useState('');
  const [expandedCerts, setExpandedCerts] = useState({});

  function updateItem(idx, patch) {
    setItems(prev => prev.map((item, i) => i === idx ? { ...item, ...patch } : item));
  }

  function moveCountry(idx, dir) {
    setItems(prev => {
      const next = [...prev];
      const target = idx + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[idx], next[target]] = [next[target], next[idx]];
      return next;
    });
  }

  function removeCountry(idx) {
    const item = items[idx];
    if (item.certs.length > 0) {
      if (!window.confirm(`Remove "${item.country}" and its ${item.certs.length} cert(s)?`)) return;
    }
    setItems(prev => prev.filter((_, i) => i !== idx));
  }

  function addCert(idx) {
    updateItem(idx, { certs: [...items[idx].certs, { name: '', subcerts: [] }] });
  }

  function updateCertName(idx, certIdx, value) {
    const certs = items[idx].certs.map((c, i) => i === certIdx ? { ...c, name: value } : c);
    updateItem(idx, { certs });
  }

  function moveCert(idx, certIdx, dir) {
    const certs = [...items[idx].certs];
    const target = certIdx + dir;
    if (target < 0 || target >= certs.length) return;
    [certs[certIdx], certs[target]] = [certs[target], certs[certIdx]];
    updateItem(idx, { certs });
  }

  function deleteCert(idx, certIdx) {
    const certs = items[idx].certs.filter((_, i) => i !== certIdx);
    updateItem(idx, { certs });
  }

  function toggleSubcerts(idx, certIdx) {
    const key = `${idx}-${certIdx}`;
    setExpandedCerts(prev => ({ ...prev, [key]: !prev[key] }));
  }

  function addSubcert(idx, certIdx) {
    const certs = items[idx].certs.map((c, i) =>
      i === certIdx ? { ...c, subcerts: [...c.subcerts, ''] } : c
    );
    updateItem(idx, { certs });
    // auto-expand
    setExpandedCerts(prev => ({ ...prev, [`${idx}-${certIdx}`]: true }));
  }

  function updateSubcert(idx, certIdx, subIdx, value) {
    const certs = items[idx].certs.map((c, i) => {
      if (i !== certIdx) return c;
      const subcerts = c.subcerts.map((s, si) => si === subIdx ? value : s);
      return { ...c, subcerts };
    });
    updateItem(idx, { certs });
  }

  function moveSubcert(idx, certIdx, subIdx, dir) {
    const certs = items[idx].certs.map((c, i) => {
      if (i !== certIdx) return c;
      const subcerts = [...c.subcerts];
      const target = subIdx + dir;
      if (target < 0 || target >= subcerts.length) return c;
      [subcerts[subIdx], subcerts[target]] = [subcerts[target], subcerts[subIdx]];
      return { ...c, subcerts };
    });
    updateItem(idx, { certs });
  }

  function deleteSubcert(idx, certIdx, subIdx) {
    const certs = items[idx].certs.map((c, i) => {
      if (i !== certIdx) return c;
      return { ...c, subcerts: c.subcerts.filter((_, si) => si !== subIdx) };
    });
    updateItem(idx, { certs });
  }

  function addCountry() {
    const name = newCountry === '__custom__' ? customCountry.trim() : newCountry.trim();
    if (!name) return;
    const templateCerts = (CERT_SCHEMA[name] || []).map(c => ({ name: c.name, subcerts: [...(c.subcerts || [])] }));
    setItems(prev => [...prev, { country: name, certs: templateCerts }]);
    setNewCountry('');
    setCustomCountry('');
  }

  async function handleSave() {
    const schemaObj = toObject(items);
    await onSave(schemaObj);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="cert-editor">
      <div className="cert-editor-header">
        <div>
          <button className="btn btn-ghost btn-sm" onClick={onBack} style={{ marginBottom: 8 }}>
            ← Back
          </button>
          <h2 style={{ marginBottom: 4 }}>🏷 Cert Field Editor</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Define countries and their certification requirements.</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', paddingTop: 8 }}>
          {saved && <span style={{ color: 'var(--pass)', fontSize: 13, paddingTop: 6 }}>✓ Saved!</span>}
          <button className="btn btn-primary" onClick={handleSave}>Save Changes</button>
        </div>
      </div>

      {items.map((item, idx) => (
        <div key={idx} className="cert-country-card">
          <div className="cert-country-card-header">
            <input
              type="text"
              value={item.country}
              onChange={e => updateItem(idx, { country: e.target.value })}
              style={{ flex: 1, fontWeight: 600 }}
            />
            <button className="btn btn-ghost btn-sm" onClick={() => moveCountry(idx, -1)} disabled={idx === 0} title="Move up">▲</button>
            <button className="btn btn-ghost btn-sm" onClick={() => moveCountry(idx, 1)} disabled={idx === items.length - 1} title="Move down">▼</button>
            <button className="btn btn-danger btn-sm" onClick={() => removeCountry(idx)} title="Remove country">🗑</button>
          </div>

          {item.certs.map((cert, certIdx) => {
            const expandKey = `${idx}-${certIdx}`;
            const isExpanded = !!expandedCerts[expandKey];
            return (
              <div key={certIdx}>
                <div className="cert-item-row">
                  <input
                    type="text"
                    value={cert.name}
                    onChange={e => updateCertName(idx, certIdx, e.target.value)}
                    style={{ flex: 1 }}
                  />
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => toggleSubcerts(idx, certIdx)}
                    title={isExpanded ? 'Collapse subcerts' : 'Expand subcerts'}
                    style={{ fontSize: 11, whiteSpace: 'nowrap' }}
                  >
                    {isExpanded ? '▾' : '▸'} Subcerts ({cert.subcerts.length})
                  </button>
                  <button className="btn btn-ghost btn-sm" onClick={() => moveCert(idx, certIdx, -1)} disabled={certIdx === 0} title="Move up">▲</button>
                  <button className="btn btn-ghost btn-sm" onClick={() => moveCert(idx, certIdx, 1)} disabled={certIdx === item.certs.length - 1} title="Move down">▼</button>
                  <button className="btn btn-danger btn-sm" onClick={() => deleteCert(idx, certIdx)} title="Delete cert">✕</button>
                </div>

                {isExpanded && (
                  <div style={{ marginLeft: 24, marginBottom: 4, borderLeft: '2px solid var(--border)', paddingLeft: 12 }}>
                    {cert.subcerts.map((sub, subIdx) => (
                      <div key={subIdx} className="cert-item-row" style={{ marginTop: 4 }}>
                        <input
                          type="text"
                          value={sub}
                          onChange={e => updateSubcert(idx, certIdx, subIdx, e.target.value)}
                          style={{ flex: 1, fontSize: 13 }}
                        />
                        <button className="btn btn-ghost btn-sm" onClick={() => moveSubcert(idx, certIdx, subIdx, -1)} disabled={subIdx === 0} title="Move up">▲</button>
                        <button className="btn btn-ghost btn-sm" onClick={() => moveSubcert(idx, certIdx, subIdx, 1)} disabled={subIdx === cert.subcerts.length - 1} title="Move down">▼</button>
                        <button className="btn btn-danger btn-sm" onClick={() => deleteSubcert(idx, certIdx, subIdx)} title="Delete subcert">✕</button>
                      </div>
                    ))}
                    <button
                      className="btn btn-ghost btn-sm"
                      style={{ marginTop: 6, fontSize: 12 }}
                      onClick={() => addSubcert(idx, certIdx)}
                    >
                      + Add Subcert
                    </button>
                  </div>
                )}
              </div>
            );
          })}

          <button className="btn btn-ghost btn-sm" style={{ marginTop: 8 }} onClick={() => addCert(idx)}>
            + Add Cert
          </button>
        </div>
      ))}

      <div style={{ display: 'flex', gap: 8, marginTop: 16, flexWrap: 'wrap' }}>
        <select
          value={newCountry}
          onChange={e => setNewCountry(e.target.value)}
          style={{ flex: 1, minWidth: 200 }}
        >
          <option value="">— Select country to add —</option>
          {COMMON_COUNTRIES
            .filter(c => !items.some(item => item.country === c))
            .map(c => <option key={c} value={c}>{c}</option>)
          }
          <option value="__custom__">Custom country…</option>
        </select>
        {newCountry === '__custom__' && (
          <input
            type="text"
            placeholder="Country name"
            value={customCountry}
            onChange={e => setCustomCountry(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addCountry()}
            style={{ flex: 1, minWidth: 160 }}
          />
        )}
        <button
          className="btn btn-secondary"
          onClick={addCountry}
          disabled={!newCountry || (newCountry === '__custom__' && !customCountry.trim())}
        >
          + Add Country
        </button>
      </div>
    </div>
  );
}
