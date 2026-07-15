import { useState } from 'react';

const ENTITIES = ['Cove', 'Luna', 'Alder', 'InstaVision'];

const CHANGE_TYPES = [
  'Firmware / Software Update',
  'Hardware Revision',
  'Component Substitution',
  'Regulatory / Certification Change',
  'End of Life / Discontinuation',
  'New Variant / SKU',
  'Packaging / Labeling Change',
  'Other',
];

const URGENCY_OPTIONS = [
  { value: 'low',    label: 'Low — informational, no action needed' },
  { value: 'normal', label: 'Normal — please review when possible' },
  { value: 'high',   label: 'High — impacts active testing or procurement' },
];

export default function ChangeNoticeForm() {
  const params = new URLSearchParams(window.location.search);
  const entityParam = ENTITIES.find(e => e.toLowerCase() === params.get('entity')?.toLowerCase()) || '';

  const [form, setForm] = useState({
    entity: entityParam,
    vendorName: '',
    vendorEmail: '',
    productName: '',
    modelNumber: '',
    changeType: '',
    description: '',
    urgency: 'normal',
  });
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  function set(field, value) {
    setForm(f => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!form.entity || !form.vendorName || !form.vendorEmail || !form.productName || !form.changeType || !form.description) {
      setError('Please fill in all required fields.');
      return;
    }
    setBusy(true);
    try {
      const res = await fetch('/api/public/submit/change-notice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
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
            <h2>Change Notice Submitted</h2>
            <p>Thank you. Our team will review your notice and follow up if needed.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="public-form-page">
      <div className="public-form-card">
        <div className="public-form-header">
          <div className="public-form-logo">ODYSSEY</div>
          <h1>Product Change Notice</h1>
          <p>Use this form to notify us of any changes to a product we are actively evaluating or have in our catalog.</p>
        </div>

        {error && <div className="error-msg" style={{ marginBottom: 16 }}>{error}</div>}

        <form onSubmit={handleSubmit} className="public-form-body">
          <div className="public-form-section-title">Your Information</div>

          <div className="public-form-row">
            <div className="form-group">
              <label>Entity <span className="req">*</span></label>
              <select value={form.entity} onChange={e => set('entity', e.target.value)} required disabled={!!entityParam}>
                <option value="">— Select entity —</option>
                {ENTITIES.map(en => <option key={en} value={en}>{en}</option>)}
              </select>
            </div>
          </div>

          <div className="public-form-row two-col">
            <div className="form-group">
              <label>Your Name <span className="req">*</span></label>
              <input type="text" placeholder="Full name" value={form.vendorName} onChange={e => set('vendorName', e.target.value)} required />
            </div>
            <div className="form-group">
              <label>Your Email <span className="req">*</span></label>
              <input type="email" placeholder="work@company.com" value={form.vendorEmail} onChange={e => set('vendorEmail', e.target.value)} required />
            </div>
          </div>

          <div className="public-form-section-title" style={{ marginTop: 24 }}>Product Details</div>

          <div className="public-form-row two-col">
            <div className="form-group">
              <label>Product Name <span className="req">*</span></label>
              <input type="text" placeholder="e.g. OmniCam 4K Pro" value={form.productName} onChange={e => set('productName', e.target.value)} required />
            </div>
            <div className="form-group">
              <label>Model Number</label>
              <input type="text" placeholder="e.g. OC-4KP-2024" value={form.modelNumber} onChange={e => set('modelNumber', e.target.value)} />
            </div>
          </div>

          <div className="form-group">
            <label>Type of Change <span className="req">*</span></label>
            <select value={form.changeType} onChange={e => set('changeType', e.target.value)} required>
              <option value="">— Select change type —</option>
              {CHANGE_TYPES.map(ct => <option key={ct} value={ct}>{ct}</option>)}
            </select>
          </div>

          <div className="form-group">
            <label>Change Description <span className="req">*</span></label>
            <textarea
              rows={5}
              placeholder="Describe what changed, why it changed, and any impact on performance or compatibility..."
              value={form.description}
              onChange={e => set('description', e.target.value)}
              required
              style={{ resize: 'vertical', minHeight: 120 }}
            />
          </div>

          <div className="form-group">
            <label>Urgency</label>
            <div className="public-form-radio-group">
              {URGENCY_OPTIONS.map(opt => (
                <label key={opt.value} className={`public-form-radio ${form.urgency === opt.value ? 'selected' : ''}`}>
                  <input
                    type="radio"
                    name="urgency"
                    value={opt.value}
                    checked={form.urgency === opt.value}
                    onChange={() => set('urgency', opt.value)}
                  />
                  <span className="radio-dot" />
                  <span>{opt.label}</span>
                </label>
              ))}
            </div>
          </div>

          <button type="submit" className="btn btn-primary" disabled={busy} style={{ width: '100%', marginTop: 8 }}>
            {busy ? 'Submitting…' : 'Submit Change Notice'}
          </button>
        </form>
      </div>
    </div>
  );
}
