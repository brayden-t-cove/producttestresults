import { useState } from 'react';
import { SPEC_SCHEMA } from '../data/productSpecs.js';

// All camera groups except Identity & Record
const GROUPS = SPEC_SCHEMA.camera.filter(g => g.label !== 'Identity & Record');

function BoolField({ label, value, onChange }) {
  return (
    <div className="form-group">
      <label>{label}</label>
      <select value={value ?? ''} onChange={e => onChange(e.target.value)}>
        <option value="">— Not sure —</option>
        <option value="yes">Yes</option>
        <option value="no">No</option>
      </select>
    </div>
  );
}

function SpecField({ field, value, onChange }) {
  if (field.type === 'boolean') {
    return <BoolField label={field.label} value={value} onChange={onChange} />;
  }
  if (field.type === 'select') {
    return (
      <div className="form-group">
        <label>{field.label}</label>
        <select value={value ?? ''} onChange={e => onChange(e.target.value)}>
          <option value="">— Select —</option>
          {field.options.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      </div>
    );
  }
  if (field.type === 'textarea') {
    return (
      <div className="form-group">
        <label>{field.label}</label>
        <textarea
          rows={3}
          placeholder={field.placeholder || ''}
          value={value ?? ''}
          onChange={e => onChange(e.target.value)}
          style={{ resize: 'vertical' }}
        />
      </div>
    );
  }
  return (
    <div className="form-group">
      <label>{field.label}</label>
      <input
        type="text"
        placeholder={field.placeholder || ''}
        value={value ?? ''}
        onChange={e => onChange(e.target.value)}
      />
    </div>
  );
}

function LensSection({ lenses, onChange }) {
  const fields = SPEC_SCHEMA.camera.find(g => g.type === 'lens-array')?.lensFields || [];

  function addLens() {
    onChange([...lenses, {}]);
  }

  function removeLens(i) {
    onChange(lenses.filter((_, idx) => idx !== i));
  }

  function setLensField(i, fieldId, val) {
    const next = lenses.map((l, idx) => idx === i ? { ...l, [fieldId]: val } : l);
    onChange(next);
  }

  return (
    <div>
      {lenses.map((lens, i) => (
        <div key={i} style={{ border: '1px solid var(--border)', borderRadius: 8, padding: 16, marginBottom: 12, background: 'var(--bg)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <span style={{ fontWeight: 600, fontSize: 13 }}>Lens {i + 1}</span>
            {lenses.length > 1 && (
              <button type="button" className="btn btn-ghost btn-sm" style={{ color: 'var(--fail)', fontSize: 12 }} onClick={() => removeLens(i)}>Remove</button>
            )}
          </div>
          <div className="spec-form-grid">
            {fields.map(f => (
              <SpecField key={f.id} field={f} value={lens[f.id]} onChange={v => setLensField(i, f.id, v)} />
            ))}
          </div>
        </div>
      ))}
      {lenses.length < 3 && (
        <button type="button" className="btn btn-ghost btn-sm" style={{ fontSize: 12 }} onClick={addLens}>+ Add Lens</button>
      )}
    </div>
  );
}

function SpecGroup({ group, values, onChange }) {
  const [open, setOpen] = useState(true);

  if (group.type === 'lens-array') {
    return (
      <div className="spec-form-group">
        <button type="button" className="spec-form-group-header" onClick={() => setOpen(o => !o)}>
          <span>{group.label}</span>
          <span style={{ fontSize: 16, color: 'var(--text-muted)' }}>{open ? '−' : '+'}</span>
        </button>
        {open && (
          <div style={{ padding: '16px 0 4px' }}>
            <LensSection
              lenses={values.__lenses__ || [{}]}
              onChange={v => onChange({ ...values, __lenses__: v })}
            />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="spec-form-group">
      <button type="button" className="spec-form-group-header" onClick={() => setOpen(o => !o)}>
        <span>{group.label}</span>
        <span style={{ fontSize: 16, color: 'var(--text-muted)' }}>{open ? '−' : '+'}</span>
      </button>
      {open && (
        <div className="spec-form-grid" style={{ paddingTop: 16 }}>
          {group.fields.map(f => (
            <SpecField
              key={f.id}
              field={f}
              value={values[f.id]}
              onChange={v => onChange({ ...values, [f.id]: v })}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function ProductSpecForm() {
  const [contact, setContact] = useState({ companyName: '', contactName: '', contactEmail: '', productName: '', modelNumber: '' });
  const [specs, setSpecs] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  function setContactField(field, value) {
    setContact(c => ({ ...c, [field]: value }));
  }

  function setGroupValues(groupLabel, values) {
    setSpecs(s => ({ ...s, [groupLabel]: values }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    const { companyName, contactName, contactEmail, productName } = contact;
    if (!companyName || !contactName || !contactEmail || !productName) {
      setError('Please fill in all required fields at the top.');
      return;
    }
    setBusy(true);
    try {
      const res = await fetch('/api/public/submit/product-specs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...contact, specs }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Submission failed');
      }
      setSubmitted(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  if (submitted) {
    return (
      <div className="public-form-page">
        <div className="public-form-card">
          <div className="public-form-success">
            <div className="public-form-success-icon">✓</div>
            <h2>Spec Sheet Submitted</h2>
            <p>Thank you. Our team will review your submission and follow up if needed.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="public-form-page">
      <div className="public-form-card" style={{ maxWidth: 780 }}>
        <div className="public-form-header">
          <div className="public-form-logo">ODYSSEY</div>
          <h1>Product Spec Sheet</h1>
          <p>Fill out as much as you know. Fields you're unsure about can be left blank or marked "Not sure" — partial submissions are welcome.</p>
        </div>

        {error && <div className="error-msg" style={{ marginBottom: 16 }}>{error}</div>}

        <form onSubmit={handleSubmit} className="public-form-body">

          {/* ── Contact ── */}
          <div className="public-form-section-title">Your Information</div>
          <div className="form-group">
            <label>Company Name <span className="req">*</span></label>
            <input type="text" placeholder="e.g. Acme Camera Co." value={contact.companyName} onChange={e => setContactField('companyName', e.target.value)} required />
          </div>
          <div className="public-form-row two-col">
            <div className="form-group">
              <label>Contact Name <span className="req">*</span></label>
              <input type="text" value={contact.contactName} onChange={e => setContactField('contactName', e.target.value)} required />
            </div>
            <div className="form-group">
              <label>Contact Email <span className="req">*</span></label>
              <input type="email" value={contact.contactEmail} onChange={e => setContactField('contactEmail', e.target.value)} required />
            </div>
          </div>
          <div className="public-form-row two-col" style={{ marginBottom: 24 }}>
            <div className="form-group">
              <label>Product Name <span className="req">*</span></label>
              <input type="text" placeholder="e.g. OmniCam 4K Pro" value={contact.productName} onChange={e => setContactField('productName', e.target.value)} required />
            </div>
            <div className="form-group">
              <label>Model Number</label>
              <input type="text" placeholder="e.g. OC-4KP-2024" value={contact.modelNumber} onChange={e => setContactField('modelNumber', e.target.value)} />
            </div>
          </div>

          {/* ── Spec Groups ── */}
          <div className="public-form-section-title">Technical Specifications</div>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16, marginTop: -4 }}>
            Click any section header to expand or collapse it.
          </p>

          {GROUPS.map(group => (
            <SpecGroup
              key={group.label}
              group={group}
              values={specs[group.label] || {}}
              onChange={v => setGroupValues(group.label, v)}
            />
          ))}

          <button type="submit" className="btn btn-primary" disabled={busy} style={{ width: '100%', marginTop: 16 }}>
            {busy ? 'Submitting…' : 'Submit Spec Sheet'}
          </button>
        </form>
      </div>
    </div>
  );
}
