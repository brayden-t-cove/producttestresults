import { useState } from 'react';
import { CATEGORY_LABELS } from '../data/capabilities.js';
import { SPEC_SCHEMA } from '../data/productSpecs.js';
import { exportCatalogCsv, exportCatalogJson } from '../lib/api.js';

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

function boolDisplay(val) {
  if (val === 'yes') return { symbol: '✓', color: 'var(--pass)' };
  if (val === 'no') return { symbol: '✗', color: 'var(--fail)' };
  return null;
}

function SpecSheet({ product }) {
  const schema = SPEC_SCHEMA[product.category];
  const specs = product.specs || {};
  if (!schema) return <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>No spec schema for this category.</p>;

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
    return <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>No specifications recorded yet.</p>;
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

export default function ProductCatalog({ products, onAdd, onEdit, onStartTest, onDelete, onDuplicate, onBack, onView }) {
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [openSpecsId, setOpenSpecsId] = useState(null);
  const [showExport, setShowExport] = useState(false);

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
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button className="btn btn-secondary btn-sm" onClick={() => setShowExport(true)}>
            ↓ Export
          </button>
          <button className="btn btn-primary btn-lg" onClick={onAdd}>
            + Add Product
          </button>
        </div>
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
              <div
                className="catalog-card-top"
                style={{ cursor: onView ? 'pointer' : undefined }}
                onClick={onView ? () => onView(product) : undefined}
              >
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
              <div
                className="catalog-card-date"
                style={{ cursor: onView ? 'pointer' : undefined }}
                onClick={onView ? () => onView(product) : undefined}
              >
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
                  className="btn btn-ghost btn-sm"
                  title="View technical specifications"
                  onClick={() => setOpenSpecsId(openSpecsId === product.id ? null : product.id)}
                  style={{ fontWeight: openSpecsId === product.id ? 700 : 400 }}
                >
                  {openSpecsId === product.id ? '▾ Specs' : '▸ Specs'}
                </button>
                <button
                  className="btn btn-danger btn-sm"
                  onClick={() => handleDeleteClick(product)}
                >
                  Delete
                </button>
              </div>
              {openSpecsId === product.id && (
                <div className="spec-sheet-panel">
                  <SpecSheet product={product} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showExport && (
        <div className="modal-overlay" onClick={() => setShowExport(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 420 }}>
            <h2 style={{ marginBottom: 8 }}>Export Catalog</h2>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>
              Choose a format to export your {products.length} product{products.length !== 1 ? 's' : ''}.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button className="btn btn-secondary" style={{ justifyContent: 'flex-start', textAlign: 'left', padding: '12px 16px' }}
                onClick={() => { exportCatalogCsv(); setShowExport(false); }}>
                <div style={{ fontWeight: 600 }}>Download CSV</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Basic fields only — compatible with Excel, Google Sheets, and SQL import</div>
              </button>
              <button className="btn btn-secondary" style={{ justifyContent: 'flex-start', textAlign: 'left', padding: '12px 16px' }}
                onClick={() => { exportCatalogJson(); setShowExport(false); }}>
                <div style={{ fontWeight: 600 }}>Download JSON</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Full export including specs, certifications, and capabilities — for platform migration</div>
              </button>
              <button className="btn btn-secondary" style={{ justifyContent: 'flex-start', textAlign: 'left', padding: '12px 16px', opacity: 0.5, cursor: 'not-allowed' }}
                disabled>
                <div style={{ fontWeight: 600 }}>Export Product Sheet PDF</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Open a product and use the "Export PDF" button on its detail page</div>
              </button>
            </div>
            <div style={{ marginTop: 16, textAlign: 'right' }}>
              <button className="btn btn-ghost" onClick={() => setShowExport(false)}>Close</button>
            </div>
          </div>
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
