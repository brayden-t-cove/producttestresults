import { useState } from 'react';
import { deleteComparison } from '../lib/api.js';

function StarDisplay({ value }) {
  if (value === 'na') return <span style={{ fontSize: 12, color: 'var(--primary)', fontWeight: 600 }}>N/A</span>;
  if (!value) return <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>—</span>;
  return (
    <span style={{ color: '#eab308', fontSize: 16, letterSpacing: 1 }}>
      {'★'.repeat(value)}{'☆'.repeat(5 - value)}
    </span>
  );
}

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatSpecValue(val) {
  if (val === null || val === undefined || val === '') return '—';
  if (val === 'yes') return '✓ Yes';
  if (val === 'no') return '✗ No';
  if (val === 'na') return 'N/A';
  if (val === 'unknown') return 'Unknown';
  return String(val);
}

export default function ComparisonView({ comparison, onEdit, onDeleted, onBack }) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const products = comparison.products || [];
  const specValues = comparison.specValues || {};
  const ratings = comparison.ratings || {};
  const ratingNotes = comparison.ratingNotes || {};
  const customCriteria = comparison.customCriteria || [];

  // Collect all spec rows that have at least one value
  const allSpecKeys = new Set();
  for (const p of products) {
    for (const key of Object.keys(specValues[p.catalogId] || {})) {
      const val = specValues[p.catalogId][key];
      if (val !== '' && val !== null && val !== undefined) allSpecKeys.add(key);
    }
  }

  // Collect all rating question IDs with data
  const allRatingIds = new Set();
  for (const p of products) {
    for (const qid of Object.keys(ratings[p.catalogId] || {})) allRatingIds.add(qid);
    for (const qid of Object.keys(ratingNotes[p.catalogId] || {})) {
      if (ratingNotes[p.catalogId][qid]) allRatingIds.add(qid);
    }
  }
  for (const c of customCriteria) allRatingIds.add(c.id);

  async function handleDelete() {
    setDeleting(true);
    try {
      await deleteComparison(comparison.id);
      onDeleted();
    } catch (e) {
      console.error(e);
      setDeleting(false);
    }
  }

  const colWidth = Math.max(160, Math.floor(560 / products.length));

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', padding: '0 0 40px' }}>
      {confirmDelete && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div style={{ background: 'var(--card)', borderRadius: 10, padding: 28, maxWidth: 400, width: '90%', boxShadow: '0 8px 32px rgba(0,0,0,0.25)' }}>
            <h3 style={{ margin: '0 0 12px', fontSize: 16 }}>Delete Comparison?</h3>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>
              This will remove the comparison from both products' documents. This cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button className="btn btn-ghost" onClick={() => setConfirmDelete(false)}>Cancel</button>
              <button className="btn btn-danger" onClick={handleDelete} disabled={deleting}>
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <button className="btn btn-ghost btn-sm" onClick={onBack} style={{ marginBottom: 8 }}>← Back</button>
          <h2 style={{ margin: '0 0 4px', fontSize: 17 }}>
            {comparison.mode === '1v1' ? '1:1 Quick Compare' : 'Expanded Ranking'}
          </h2>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            {products.map(p => p.name).join(' vs ')} · {formatDate(comparison.completedAt || comparison.createdAt)}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {onEdit && <button className="btn btn-secondary" onClick={onEdit}>Edit</button>}
          <button className="btn btn-ghost" style={{ color: 'var(--fail)' }} onClick={() => setConfirmDelete(true)}>Delete</button>
        </div>
      </div>

      {/* Product header row */}
      <div style={{ display: 'flex', marginBottom: 16, background: 'var(--card)', borderRadius: 8, border: '1px solid var(--border)', overflow: 'hidden' }}>
        <div style={{ width: 220, flexShrink: 0, padding: '12px 14px', borderRight: '1px solid var(--border)', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}>
          Product
        </div>
        {products.map(p => (
          <div key={p.catalogId} style={{ width: colWidth, flexShrink: 0, padding: '12px 14px', borderRight: '1px solid var(--border)' }}>
            <div style={{ fontWeight: 700, fontSize: 14 }}>{p.name}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
              {p.subclass || p.category}{p.firmware ? ` · fw ${p.firmware}` : ''}
            </div>
          </div>
        ))}
      </div>

      {/* Tech Specs */}
      {allSpecKeys.size > 0 && (
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 10 }}>Tech Specs</div>
          <div style={{ border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
            {[...allSpecKeys].map((key, ki) => (
              <div key={key} style={{ display: 'flex', borderBottom: ki < allSpecKeys.size - 1 ? '1px solid var(--border)' : 'none', background: ki % 2 === 0 ? 'var(--card)' : 'transparent' }}>
                <div style={{ width: 220, flexShrink: 0, padding: '8px 14px', fontSize: 12, color: 'var(--text-muted)', borderRight: '1px solid var(--border)' }}>
                  {key}
                </div>
                {products.map(p => (
                  <div key={p.catalogId} style={{ width: colWidth, flexShrink: 0, padding: '8px 14px', fontSize: 13, borderRight: '1px solid var(--border)' }}>
                    {formatSpecValue(specValues[p.catalogId]?.[key])}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Performance Ratings */}
      {allRatingIds.size > 0 && (
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 10 }}>Performance Ratings</div>
          <div style={{ border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
            {[...allRatingIds].map((qid, qi) => {
              const custom = customCriteria.find(c => c.id === qid);
              const label = custom?.label || qid;
              const hasAnyRating = products.some(p => ratings[p.catalogId]?.[qid] != null);
              const hasAnyNote = products.some(p => ratingNotes[p.catalogId]?.[qid]);
              if (!hasAnyRating && !hasAnyNote) return null;
              return (
                <div key={qid} style={{ borderBottom: qi < allRatingIds.size - 1 ? '1px solid var(--border)' : 'none', background: qi % 2 === 0 ? 'var(--card)' : 'transparent' }}>
                  <div style={{ display: 'flex' }}>
                    <div style={{ width: 220, flexShrink: 0, padding: '10px 14px', fontSize: 12, fontWeight: 500, color: 'var(--text-muted)', borderRight: '1px solid var(--border)' }}>
                      {label}
                    </div>
                    {products.map(p => (
                      <div key={p.catalogId} style={{ width: colWidth, flexShrink: 0, padding: '10px 14px', borderRight: '1px solid var(--border)' }}>
                        <StarDisplay value={ratings[p.catalogId]?.[qid]} />
                        {ratingNotes[p.catalogId]?.[qid] && (
                          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4, whiteSpace: 'pre-wrap' }}>
                            {ratingNotes[p.catalogId][qid]}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Overall Notes */}
      {comparison.comparisonNotes && (
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 8 }}>Overall Notes</div>
          <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, padding: '12px 16px', fontSize: 14, whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
            {comparison.comparisonNotes}
          </div>
        </div>
      )}
    </div>
  );
}
