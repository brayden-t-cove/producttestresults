import { useState } from 'react';

function toArray(schema) {
  return Object.entries(schema || {}).map(([country, certs]) => ({
    country,
    certs: [...certs],
  }));
}

function toObject(arr) {
  const obj = {};
  for (const { country, certs } of arr) {
    obj[country] = [...certs];
  }
  return obj;
}

export default function CertEditor({ schema, onSave, onBack }) {
  const [items, setItems] = useState(() => toArray(schema));
  const [saved, setSaved] = useState(false);
  const [newCountry, setNewCountry] = useState('');

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
    updateItem(idx, { certs: [...items[idx].certs, ''] });
  }

  function updateCert(idx, certIdx, value) {
    const certs = [...items[idx].certs];
    certs[certIdx] = value;
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

  function addCountry() {
    const name = newCountry.trim();
    if (!name) return;
    setItems(prev => [...prev, { country: name, certs: [] }]);
    setNewCountry('');
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

          {item.certs.map((cert, certIdx) => (
            <div key={certIdx} className="cert-item-row">
              <input
                type="text"
                value={cert}
                onChange={e => updateCert(idx, certIdx, e.target.value)}
                style={{ flex: 1 }}
              />
              <button className="btn btn-ghost btn-sm" onClick={() => moveCert(idx, certIdx, -1)} disabled={certIdx === 0} title="Move up">▲</button>
              <button className="btn btn-ghost btn-sm" onClick={() => moveCert(idx, certIdx, 1)} disabled={certIdx === item.certs.length - 1} title="Move down">▼</button>
              <button className="btn btn-danger btn-sm" onClick={() => deleteCert(idx, certIdx)} title="Delete cert">✕</button>
            </div>
          ))}

          <button className="btn btn-ghost btn-sm" style={{ marginTop: 8 }} onClick={() => addCert(idx)}>
            + Add Cert
          </button>
        </div>
      ))}

      <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
        <input
          type="text"
          placeholder="New country name..."
          value={newCountry}
          onChange={e => setNewCountry(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addCountry()}
          style={{ flex: 1 }}
        />
        <button className="btn btn-secondary" onClick={addCountry} disabled={!newCountry.trim()}>
          + Add Country
        </button>
      </div>
    </div>
  );
}
