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

const STATUS_LABELS = {
  'active': 'Active',
  'in-development': 'In Development',
  'in-testing': 'In Testing',
  'eol': 'EOL',
  'discontinued': 'Discontinued',
  'on-hold': 'On Hold',
  'under-evaluation': 'Under Evaluation',
  'rejected': 'Rejected',
};

const STATUS_COLORS = {
  'active': 'var(--pass)',
  'in-development': '#f59e0b',
  'in-testing': 'var(--primary)',
  'eol': 'var(--text-muted)',
  'discontinued': 'var(--fail)',
  'on-hold': '#94a3b8',
  'under-evaluation': '#a78bfa',
  'rejected': '#f43f5e',
};

// Production: type=production, status is live/shipped
// Development: type=production, status=in-development
// Evaluation: type=sample or prototype
const PRODUCTION_STATUSES = ['active', 'in-testing', 'eol', 'discontinued', 'on-hold'];
const PRIMARY_STATUSES = ['active', 'in-testing'];
const SECONDARY_STATUSES = ['eol', 'discontinued', 'on-hold', 'under-evaluation', 'rejected'];
const DEV_PRIMARY_STATUSES = ['in-development'];
const DEV_SECONDARY_STATUSES = ['on-hold', 'rejected'];
const EVAL_PRIMARY_STATUSES = ['under-evaluation', 'in-development'];
const EVAL_SECONDARY_STATUSES = ['on-hold', 'rejected'];

const ENTITIES = ['Cove', 'Luna', 'Alder'];

function isProduction(p) {
  return (!p.type || p.type === 'production') && PRODUCTION_STATUSES.includes(p.status || 'active');
}
function isDevelopment(p) {
  return (!p.type || p.type === 'production') && (p.status === 'in-development');
}
function isEvaluation(p) {
  return p.type === 'sample' || p.type === 'prototype';
}

function CollapsibleStatusGroup({ status, items, defaultOpen, renderCard }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ marginBottom: 24 }}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: open ? 10 : 0, background: 'none', border: 'none', cursor: 'pointer', padding: 0, width: '100%', textAlign: 'left' }}
      >
        <span style={{ fontSize: 11, color: 'var(--text-muted)', opacity: 0.6 }}>{open ? '▾' : '▸'}</span>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: STATUS_COLORS[status] || '#94a3b8', display: 'inline-block', flexShrink: 0 }} />
        <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.06em', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
          {STATUS_LABELS[status] || status} ({items.length})
        </span>
      </button>
      {open && (
        <div className="catalog-grid">
          {items.map(p => renderCard(p))}
        </div>
      )}
    </div>
  );
}

export default function ProductCatalog({ products, onAdd, onEdit, onStartTest, onDelete, onDuplicate, onBack, onView }) {
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [openSpecsId, setOpenSpecsId] = useState(null);
  const [showExport, setShowExport] = useState(false);
  const [activeFilter, setActiveFilter] = useState('all');
  const [activeEntity, setActiveEntity] = useState('all');
  const [activePage, setActivePage] = useState('production');
  const [search, setSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const categories = ['all', ...Object.keys(CATEGORY_LABELS).filter(cat => products.some(p => p.category === cat))];
  const sorted = [...products].sort((a, b) => a.name.localeCompare(b.name));
  const searched = search.trim()
    ? sorted.filter(p => {
        const q = search.toLowerCase();
        return (p.modelNumber || '').toLowerCase().includes(q)
          || (p.name || '').toLowerCase().includes(q)
          || (p.manufacturer || '').toLowerCase().includes(q);
      })
    : sorted;
  const filtered = activeFilter === 'all' ? searched : searched.filter(p => p.category === activeFilter);
  const entityTabs = ['all', ...ENTITIES.filter(e => products.some(p => (p.entity || []).includes(e)))];
  const entityFiltered = activeEntity === 'all' ? filtered : filtered.filter(p => (p.entity || []).includes(activeEntity));
  const pageFiltered = activePage === 'production'
    ? entityFiltered.filter(isProduction)
    : activePage === 'development'
      ? entityFiltered.filter(isDevelopment)
      : entityFiltered.filter(isEvaluation);

  function groupByStatus(list, primaryStatuses, secondaryStatuses) {
    const allStatuses = [...primaryStatuses, ...secondaryStatuses];
    const groups = [];
    for (const s of primaryStatuses) {
      const items = list.filter(p => (p.status || 'active') === s);
      if (items.length > 0) groups.push({ status: s, items });
    }
    const secItems = list.filter(p => secondaryStatuses.includes(p.status || ''));
    if (secItems.length > 0) {
      const byStatus = {};
      for (const p of secItems) {
        const s = p.status || secondaryStatuses[0];
        if (!byStatus[s]) byStatus[s] = [];
        byStatus[s].push(p);
      }
      for (const s of secondaryStatuses) {
        if (byStatus[s]?.length > 0) groups.push({ status: s, items: byStatus[s] });
      }
    }
    // Catch-all for any statuses not in either list
    const known = new Set(allStatuses);
    const other = list.filter(p => !known.has(p.status || 'active'));
    if (other.length > 0) groups.push({ status: 'other', items: other });
    return groups;
  }

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

      {/* Search + filter bar */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, alignItems: 'center' }}>
        <input
          type="text"
          placeholder="Search by model number, name, or manufacturer…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ flex: 1 }}
        />
        <button
          className={`btn btn-sm ${showFilters ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setShowFilters(v => !v)}
          title="Toggle filters"
          style={{ flexShrink: 0, gap: 6 }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
          </svg>
          Filters
          {(activeFilter !== 'all' || activeEntity !== 'all') && (
            <span style={{ background: 'var(--primary)', color: '#fff', borderRadius: '50%', width: 16, height: 16, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700 }}>
              {(activeFilter !== 'all' ? 1 : 0) + (activeEntity !== 'all' ? 1 : 0)}
            </span>
          )}
        </button>
      </div>

      {showFilters && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '14px 16px', marginBottom: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {categories.length > 2 && (
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Category</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {categories.map(cat => (
                  <button
                    key={cat}
                    className={`btn btn-sm ${activeFilter === cat ? 'btn-primary' : 'btn-ghost'}`}
                    onClick={() => setActiveFilter(cat)}
                  >
                    {cat === 'all' ? `All (${products.length})` : `${CATEGORY_ICONS[cat] || ''} ${CATEGORY_LABELS[cat]} (${products.filter(p => p.category === cat).length})`}
                  </button>
                ))}
              </div>
            </div>
          )}
          {entityTabs.length > 2 && (
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Entity</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {entityTabs.map(e => (
                  <button
                    key={e}
                    className={`btn btn-sm ${activeEntity === e ? 'btn-primary' : 'btn-ghost'}`}
                    onClick={() => setActiveEntity(e)}
                  >
                    {e === 'all' ? `All Entities (${filtered.length})` : `${e} (${filtered.filter(p => (p.entity || []).includes(e)).length})`}
                  </button>
                ))}
              </div>
            </div>
          )}
          {(activeFilter !== 'all' || activeEntity !== 'all') && (
            <button
              className="btn btn-ghost btn-sm"
              style={{ alignSelf: 'flex-start', color: 'var(--fail)', fontSize: 12 }}
              onClick={() => { setActiveFilter('all'); setActiveEntity('all'); }}
            >
              ✕ Clear filters
            </button>
          )}
        </div>
      )}

      <div className="product-tabs" style={{ marginBottom: 16 }}>
        <button className={`product-tab${activePage === 'production' ? ' active' : ''}`} onClick={() => setActivePage('production')}>
          Production ({products.filter(isProduction).length})
        </button>
        <button className={`product-tab${activePage === 'development' ? ' active' : ''}`} onClick={() => setActivePage('development')}>
          Development ({products.filter(isDevelopment).length})
        </button>
        <button className={`product-tab${activePage === 'evaluation' ? ' active' : ''}`} onClick={() => setActivePage('evaluation')}>
          Evaluation ({products.filter(isEvaluation).length})
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
      ) : pageFiltered.length === 0 ? (
        <div className="empty-state">
          <p>No products here yet.</p>
        </div>
      ) : (
        <div>
          {(() => {
            function renderCard(product) {
              const typeBadge = product.type === 'sample' || product.type === 'prototype' ? product.type : null;
              return (
                <div key={product.id} className="catalog-card" style={{ borderLeft: `3px solid ${STATUS_COLORS[product.status || 'active']}` }}>
                  <div
                    className="catalog-card-top"
                    style={{ cursor: onView ? 'pointer' : undefined, position: 'relative' }}
                    onClick={onView ? () => onView(product) : undefined}
                  >
                    {typeBadge && (
                      <span style={{ position: 'absolute', top: 8, right: 8, fontSize: 10, fontWeight: 800, letterSpacing: '0.08em', padding: '2px 7px', borderRadius: 4, background: typeBadge === 'sample' ? '#fef3c7' : '#ede9fe', color: typeBadge === 'sample' ? '#b45309' : '#6d28d9', textTransform: 'uppercase' }}>
                        {typeBadge}
                      </span>
                    )}
                    <div className="catalog-card-icon">
                      {product.imageUrl ? (
                        <img
                          src={product.imageUrl}
                          alt=""
                          style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 8, flexShrink: 0 }}
                          onError={e => { e.currentTarget.style.display = 'none'; e.currentTarget.nextSibling.style.display = 'inline'; }}
                        />
                      ) : null}
                      <span style={{ fontSize: 32, display: product.imageUrl ? 'none' : 'inline' }}>{CATEGORY_ICONS[product.category] || '📦'}</span>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="catalog-card-name">
                        {product.modelNumber || product.name}
                        {product.version && (
                          <span style={{ marginLeft: 8, fontSize: 11, fontWeight: 600, color: 'var(--primary)', background: 'rgba(99,102,241,0.15)', borderRadius: 4, padding: '1px 6px' }}>
                            {product.version}
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 2 }}>
                        {product.name}
                      </div>
                      <div className="catalog-card-meta">
                        {product.manufacturer || CATEGORY_LABELS[product.category] || product.category}
                        {product.subclass && (
                          <span style={{ marginLeft: 6, color: 'var(--primary)', fontWeight: 500, fontSize: 11 }}>· {product.subclass}</span>
                        )}
                      </div>
                      {(product.entity || []).length > 0 && (
                        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 4 }}>
                          {product.entity.map(e => (
                            <span key={e} style={{ fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 3, background: 'rgba(99,102,241,0.1)', color: 'var(--primary)', letterSpacing: '0.05em' }}>
                              {e}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
                      <span className="capability-count-badge">
                        {(product.capabilities || []).length} capabilities
                      </span>
                      <span style={{ fontSize: 11, fontWeight: 600, color: STATUS_COLORS[product.status || 'active'], display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: STATUS_COLORS[product.status || 'active'], display: 'inline-block' }} />
                        {STATUS_LABELS[product.status || 'active']}
                      </span>
                    </div>
                  </div>
                  {product.category === 'camera' && product.hubConnectionType && product.hubConnectionType !== 'standalone' && (
                    <div style={{ padding: '4px 16px', borderTop: '1px solid var(--border)', display: 'flex', gap: 6, alignItems: 'center' }}>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>Connection:</span>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                        {{ 'hub': 'Hub / Chime', 'nvr-dvr': 'NVR / DVR', 'proprietary-base': 'Proprietary Base Station' }[product.hubConnectionType]}
                      </span>
                    </div>
                  )}
                  {(product.compatibleWith || []).length > 0 && (
                    <div style={{ padding: '6px 16px', display: 'flex', flexWrap: 'wrap', gap: 6, borderTop: '1px solid var(--border)' }}>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, alignSelf: 'center' }}>
                        {product.category === 'camera' ? 'Compatible Apps:' : 'Compatible:'}
                      </span>
                      {product.compatibleWith.map(id => {
                        const p = products.find(x => x.id === id);
                        if (!p) return null;
                        return (
                          <span key={id} style={{ fontSize: 11, background: 'var(--surface-alt, rgba(0,0,0,0.05))', borderRadius: 4, padding: '2px 7px', color: 'var(--text-muted)' }}>
                            {p.name}{p.version ? ` ${p.version}` : ''}
                          </span>
                        );
                      })}
                    </div>
                  )}
                  <div
                    className="catalog-card-date"
                    style={{ cursor: onView ? 'pointer' : undefined }}
                    onClick={onView ? () => onView(product) : undefined}
                  >
                    Added {formatDate(product.createdAt)}
                  </div>
                  <div className="card-actions">
                    <button className="btn btn-primary btn-sm" onClick={() => onStartTest(product)}>▶ Start Test</button>
                    <button className="btn btn-secondary btn-sm" onClick={() => onEdit(product)}>Edit</button>
                    <button className="btn btn-secondary btn-sm" title="Duplicate as new version" onClick={() => onDuplicate(product, incrementVersion(product.version))}>⧉ Duplicate</button>
                    <button
                      className="btn btn-ghost btn-sm"
                      title="View technical specifications"
                      onClick={() => setOpenSpecsId(openSpecsId === product.id ? null : product.id)}
                      style={{ fontWeight: openSpecsId === product.id ? 700 : 400 }}
                    >
                      {openSpecsId === product.id ? '▾ Specs' : '▸ Specs'}
                    </button>
                    <button className="btn btn-danger btn-sm" onClick={() => handleDeleteClick(product)}>Delete</button>
                  </div>
                  {openSpecsId === product.id && (
                    <div className="spec-sheet-panel">
                      <SpecSheet product={product} />
                    </div>
                  )}
                </div>
              );
            }

            function renderStatusGroups(list, primaryStatuses, secondaryStatuses) {
              return groupByStatus(list, primaryStatuses, secondaryStatuses).map(({ status, items }) => (
                <CollapsibleStatusGroup
                  key={status}
                  status={status}
                  items={items}
                  defaultOpen={primaryStatuses.includes(status)}
                  renderCard={renderCard}
                />
              ));
            }

            if (activePage === 'production') {
              return renderStatusGroups(pageFiltered, PRIMARY_STATUSES, SECONDARY_STATUSES);
            }

            if (activePage === 'development') {
              return renderStatusGroups(pageFiltered, DEV_PRIMARY_STATUSES, DEV_SECONDARY_STATUSES);
            }

            // Evaluation page — group by type (sample/prototype) then status
            return (
              <>
                {['sample', 'prototype'].map(bucket => {
                  const bucketItems = pageFiltered.filter(p => p.type === bucket);
                  if (bucketItems.length === 0) return null;
                  const bucketLabel = bucket === 'sample' ? 'Samples' : 'Prototypes';
                  const bucketColor = bucket === 'sample' ? '#b45309' : '#6d28d9';
                  return (
                    <div key={bucket} style={{ marginBottom: 32 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.06em', color: bucketColor, textTransform: 'uppercase', marginBottom: 10 }}>
                        {bucketLabel} ({bucketItems.length})
                      </div>
                      {renderStatusGroups(bucketItems, EVAL_PRIMARY_STATUSES, EVAL_SECONDARY_STATUSES)}
                    </div>
                  );
                })}
              </>
            );
          })()}
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
