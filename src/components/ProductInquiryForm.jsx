import { useState } from 'react';

const CAMERA_CATEGORIES = [
  'Indoor Fixed',
  'Outdoor Fixed',
  'Indoor PTZ',
  'Outdoor PTZ',
  'Doorbell',
  'Floodlight',
  'Fisheye / 360°',
  'Body Camera',
  'Dash Camera',
  'Other',
];

const CONNECTIVITY_TYPES = ['Wi-Fi', 'Wired (PoE)', 'Cellular (4G/5G)', 'Hybrid'];

export default function ProductInquiryForm() {
  const [form, setForm] = useState({
    companyName: '',
    contactName: '',
    contactEmail: '',
    contactPhone: '',
    productName: '',
    modelNumber: '',
    category: '',
    connectivity: '',
    description: '',
    whyFit: '',
    sampleAvailable: '',
    sampleEta: '',
    sampleNotes: '',
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
    const { companyName, contactName, contactEmail, productName, category, description } = form;
    if (!companyName || !contactName || !contactEmail || !productName || !category || !description) {
      setError('Please fill in all required fields.');
      return;
    }
    setBusy(true);
    try {
      const res = await fetch('/api/public/submit/product-inquiry', {
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
            <h2>Inquiry Submitted</h2>
            <p>Thank you for your submission. Our team will review your product and reach out if we'd like to move forward.</p>
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
          <h1>Product Inquiry</h1>
          <p>Interested in having your product evaluated on our platform? Fill out the form below and our team will be in touch.</p>
        </div>

        {error && <div className="error-msg" style={{ marginBottom: 16 }}>{error}</div>}

        <form onSubmit={handleSubmit} className="public-form-body">

          {/* ── Contact ── */}
          <div className="public-form-section-title">Your Information</div>

          <div className="form-group">
            <label>Company Name <span className="req">*</span></label>
            <input type="text" placeholder="e.g. Acme Camera Co." value={form.companyName} onChange={e => set('companyName', e.target.value)} required />
          </div>

          <div className="public-form-row two-col">
            <div className="form-group">
              <label>Contact Name <span className="req">*</span></label>
              <input type="text" placeholder="Full name" value={form.contactName} onChange={e => set('contactName', e.target.value)} required />
            </div>
            <div className="form-group">
              <label>Contact Email <span className="req">*</span></label>
              <input type="email" placeholder="work@company.com" value={form.contactEmail} onChange={e => set('contactEmail', e.target.value)} required />
            </div>
          </div>

          <div className="form-group">
            <label>Phone <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(optional)</span></label>
            <input type="tel" placeholder="+1 (555) 000-0000" value={form.contactPhone} onChange={e => set('contactPhone', e.target.value)} />
          </div>

          {/* ── Product ── */}
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

          <div className="public-form-row two-col">
            <div className="form-group">
              <label>Camera Category <span className="req">*</span></label>
              <select value={form.category} onChange={e => set('category', e.target.value)} required>
                <option value="">— Select category —</option>
                {CAMERA_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Primary Connectivity</label>
              <select value={form.connectivity} onChange={e => set('connectivity', e.target.value)}>
                <option value="">— Select —</option>
                {CONNECTIVITY_TYPES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label>Product Description <span className="req">*</span></label>
            <textarea
              rows={4}
              placeholder="Key features, target use case, what makes this product stand out..."
              value={form.description}
              onChange={e => set('description', e.target.value)}
              required
              style={{ resize: 'vertical', minHeight: 100 }}
            />
          </div>

          <div className="form-group">
            <label>Why is this a good fit? <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(optional)</span></label>
            <textarea
              rows={3}
              placeholder="Any context on why you believe this product aligns with our platform or use cases..."
              value={form.whyFit}
              onChange={e => set('whyFit', e.target.value)}
              style={{ resize: 'vertical', minHeight: 80 }}
            />
          </div>

          {/* ── Sample ── */}
          <div className="public-form-section-title" style={{ marginTop: 24 }}>Sample Availability</div>

          <div className="form-group">
            <label>Is a sample unit available for evaluation?</label>
            <div className="public-form-radio-group">
              {[
                { value: 'yes',     label: 'Yes — sample is ready to ship' },
                { value: 'soon',    label: 'Not yet — estimated availability below' },
                { value: 'no',      label: 'No — evaluation would be virtual / spec-based' },
              ].map(opt => (
                <label key={opt.value} className={`public-form-radio ${form.sampleAvailable === opt.value ? 'selected' : ''}`}>
                  <input type="radio" name="sampleAvailable" value={opt.value} checked={form.sampleAvailable === opt.value} onChange={() => set('sampleAvailable', opt.value)} />
                  <span className="radio-dot" />
                  <span>{opt.label}</span>
                </label>
              ))}
            </div>
          </div>

          {form.sampleAvailable === 'soon' && (
            <div className="form-group">
              <label>Estimated Sample Availability</label>
              <input type="text" placeholder="e.g. Q3 2025 or August 2025" value={form.sampleEta} onChange={e => set('sampleEta', e.target.value)} />
            </div>
          )}

          {(form.sampleAvailable === 'yes' || form.sampleAvailable === 'soon') && (
            <div className="form-group">
              <label>Sample Notes <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(optional)</span></label>
              <textarea
                rows={2}
                placeholder="Shipping restrictions, required return, firmware version included, etc."
                value={form.sampleNotes}
                onChange={e => set('sampleNotes', e.target.value)}
                style={{ resize: 'vertical' }}
              />
            </div>
          )}

          <button type="submit" className="btn btn-primary" disabled={busy} style={{ width: '100%', marginTop: 8 }}>
            {busy ? 'Submitting…' : 'Submit Inquiry'}
          </button>
        </form>
      </div>
    </div>
  );
}
