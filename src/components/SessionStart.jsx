import { useState } from 'react';
import { PRODUCTS, CATEGORY_LABELS } from '../data/products.js';
import { createSession, aiPopulateTests } from '../lib/api.js';

const CATEGORIES = ['hub', 'camera', 'sensor', 'app'];

export default function SessionStart({ onBack, onCreated }) {
  const [productId, setProductId] = useState('');
  const [firmware, setFirmware] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const selectedProduct = PRODUCTS.find(p => p.id === productId);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!productId) {
      setError('Please select a product.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const session = await createSession({
        productId: selectedProduct.id,
        productName: selectedProduct.name,
        category: selectedProduct.category,
        subcategory: selectedProduct.subcategory,
        firmware,
        notes,
      });

      let testCases = [];
      try {
        const result = await aiPopulateTests({
          productName: selectedProduct.name,
          category: selectedProduct.category,
          subcategory: selectedProduct.subcategory,
          firmware,
        });
        testCases = result.testCases || [];
      } catch (aiErr) {
        console.warn('AI populate failed, proceeding without AI tests:', aiErr.message);
      }

      const { updateSession } = await import('../lib/api.js');
      const updated = await updateSession(session.id, { testCases });
      onCreated(updated);
    } catch (err) {
      setError(err.message || 'Failed to create session');
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="session-start">
        <div className="ai-loading">
          <div className="spinner spinner-lg" />
          <p>Claude is populating your test cases...</p>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
            Generating tailored tests for {selectedProduct?.name}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="session-start">
      <div className="session-start-header">
        <button className="btn btn-ghost btn-sm" onClick={onBack} style={{ marginBottom: 12 }}>
          ← Back
        </button>
        <h1>New Testing Session</h1>
        <p>Select a product to begin. Claude will auto-populate test cases.</p>
      </div>

      <form onSubmit={handleSubmit}>
        {error && <div className="error-msg">{error}</div>}

        <div className="form-group">
          <label>Product</label>
          <select value={productId} onChange={e => setProductId(e.target.value)} required>
            <option value="">Select a product...</option>
            {CATEGORIES.map(cat => (
              <optgroup key={cat} label={CATEGORY_LABELS[cat]}>
                {PRODUCTS.filter(p => p.category === cat).map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label>Firmware Version</label>
          <input
            type="text"
            placeholder="e.g. 3.4.2-beta, 2024.11.01"
            value={firmware}
            onChange={e => setFirmware(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label>Session Notes</label>
          <textarea
            placeholder="Any context for this session — build notes, known issues, special focus areas..."
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={4}
          />
        </div>

        <button type="submit" className="btn btn-primary btn-lg" style={{ width: '100%' }}>
          Start Session + Auto-populate Tests
        </button>
      </form>
    </div>
  );
}
