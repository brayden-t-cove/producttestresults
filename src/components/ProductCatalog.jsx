import { useState } from 'react';
import { CATEGORY_LABELS } from '../data/capabilities.js';

const CATEGORY_ICONS = {
  hub: '🏠',
  touchpad: '⌨️',
  camera: '📷',
  sensor: '📡',
  app: '📱',
};

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function incrementVersion(v) {
  if (!v) return 'V2';
  const m = v.match(/^(V|v|Rev |Rev)(\d+)(.*)$/);
  if (m) return `${m[1]}${parseInt(m[2]) + 1}${m[3]}`;
  return v;
}

export default function ProductCatalog({ products, onAdd, onEdit, onStartTest, onDelete, onDuplicate, onBack }) {
  const [confirmDelete, setConfirmDelete] = useState(null);

  function handleDeleteClick(product) {
    setConfirmDelete(product);
  }

  function handleConfirmDelete() {
    if (confirmDelete) {
      onDelete(confirmDelete.id);
      setConfirmDelete(null);
    }
  }

  return (
    <div className="catalog-page">
      <button className="btn btn-ghost btn-sm" onClick={onBack} style={{ marginBottom: 12 }}>
        ← Back
      </button>
      <div className="catalog-header">
        <div>
          <h1>Product Catalog</h1>
          <p style={{ color: 'var(--text-muted)', marginTop: 4, fontSize: 13 }}>
            Manage your products and their capabilities
          </p>
        </div>
        <button className="btn btn-primary btn-lg" onClick={onAdd}>
          + Add Product
        </button>
      </div>

      {products.length === 0 ? (
        <div className="empty-state">
          <h3>No products yet</h3>
          <p>No products yet — add your first product to get started.</p>
          <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={onAdd}>
            + Add Product
          </button>
        </div>
      ) : (
        <div className="catalog-grid">
          {products.map(product => (
            <div key={product.id} className="catalog-card">
              <div className="catalog-card-top">
                <div className="catalog-card-icon">
                  {CATEGORY_ICONS[product.category] || '📦'}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="catalog-card-name">
                    {product.name}
                    {product.version && (
                      <span style={{ marginLeft: 8, fontSize: 11, fontWeight: 600, color: 'var(--primary)', background: 'rgba(99,102,241,0.15)', borderRadius: 4, padding: '1px 6px' }}>
                        {product.version}
                      </span>
                    )}
                  </div>
                  <div className="catalog-card-meta">
                    {[product.manufacturer, product.modelNumber].filter(Boolean).join(' · ') || CATEGORY_LABELS[product.category] || product.category}
                  </div>
                </div>
                <span className="capability-count-badge">
                  {(product.capabilities || []).length} capabilities
                </span>
              </div>
              <div className="catalog-card-date">
                Added {formatDate(product.createdAt)}
              </div>
              <div className="card-actions">
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => onStartTest(product)}
                >
                  ▶ Start Test
                </button>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => onEdit(product)}
                >
                  Edit
                </button>
                <button
                  className="btn btn-secondary btn-sm"
                  title="Duplicate as new version"
                  onClick={() => onDuplicate(product, incrementVersion(product.version))}
                >
                  ⧉ Duplicate
                </button>
                <button
                  className="btn btn-danger btn-sm"
                  onClick={() => handleDeleteClick(product)}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {confirmDelete && (
        <div className="modal-overlay" onClick={() => setConfirmDelete(null)}>
          <div className="modal" style={{ maxWidth: 400 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Delete Product</h2>
              <button className="modal-close" onClick={() => setConfirmDelete(null)}>×</button>
            </div>
            <div className="modal-body">
              <p>Are you sure you want to delete <strong>{confirmDelete.name}</strong>? This cannot be undone.</p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setConfirmDelete(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={handleConfirmDelete}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
