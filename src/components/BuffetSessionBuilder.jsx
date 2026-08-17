import { useState, useEffect, useRef } from 'react';
import { listTestItems, createSession, updateSession, getFirmwares, getTestItemCategories } from '../lib/api.js';
import { CATEGORY_LABELS } from '../data/capabilities.js';

const CATEGORY_ICONS = {
  hub: '🏠',
  touchpad: '⌨️',
  camera: '📷',
  sensor: '📡',
  app: '📱',
};

// ── Item chip on the plate ─────────────────────────────────────────────────────

function PlateItem({ item, onRemove }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      border: '1px solid var(--border)', borderRadius: 7,
      padding: '7px 10px', background: 'var(--surface)', fontSize: 13,
    }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 500 }}>{item.name}</div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{item.category}</div>
      </div>
      <button
        type="button"
        onClick={onRemove}
        style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 16, lineHeight: 1, padding: 0 }}
        title="Remove"
      >×</button>
    </div>
  );
}

// ── Library panel ─────────────────────────────────────────────────────────────

function LibraryPanel({ items, categories, onAdd, plateItemIds }) {
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState('');

  const availableCats = categories.length ? categories : [...new Set(items.map(i => i.category))].sort();

  const filtered = items.filter(item => {
    if (filterCat && item.category !== filterCat) return false;
    if (search) {
      const q = search.toLowerCase();
      return item.name.toLowerCase().includes(q) || item.category.toLowerCase().includes(q) || (item.tags || []).some(t => t.toLowerCase().includes(q));
    }
    return true;
  });

  const byCategory = filtered.reduce((acc, item) => {
    (acc[item.category] = acc[item.category] || []).push(item);
    return acc;
  }, {});

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)' }}>
        Test Library ({items.length})
      </div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
        <input
          type="text"
          placeholder="Search…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ flex: 1, fontSize: 12 }}
        />
        <select value={filterCat} onChange={e => setFilterCat(e.target.value)} style={{ fontSize: 12 }}>
          <option value="">All</option>
          {availableCats.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        {filtered.length === 0 ? (
          <div style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', padding: 20 }}>No items match</div>
        ) : (
          Object.entries(byCategory).sort(([a], [b]) => a.localeCompare(b)).map(([cat, catItems]) => (
            <div key={cat} style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 6, borderBottom: '1px solid var(--border)', paddingBottom: 3 }}>
                {cat}
              </div>
              {catItems.map(item => {
                const onPlate = plateItemIds.has(item.id);
                return (
                  <div
                    key={item.id}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      padding: '6px 0', borderBottom: '1px solid var(--border)',
                      opacity: onPlate ? 0.4 : 1,
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12, fontWeight: 500 }}>{item.name}</div>
                      {item.tags?.length > 0 && (
                        <div style={{ display: 'flex', gap: 4, marginTop: 2, flexWrap: 'wrap' }}>
                          {item.tags.map(t => (
                            <span key={t} style={{ fontSize: 10, padding: '1px 5px', borderRadius: 8, background: 'var(--bg)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>{t}</span>
                          ))}
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      style={{ fontSize: 11, padding: '2px 8px' }}
                      disabled={onPlate}
                      onClick={() => onAdd(item)}
                    >{onPlate ? '✓' : '+ Add'}</button>
                  </div>
                );
              })}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ── Main builder ──────────────────────────────────────────────────────────────

export default function BuffetSessionBuilder({ catalog, onBack, onCreated, currentUser }) {
  // Setup fields
  const [sessionName, setSessionName] = useState('');
  const [testerName, setTesterName] = useState(currentUser?.name || '');
  const [notes, setNotes] = useState('');
  const [firmware, setFirmware] = useState('');
  const [savedFirmwares, setSavedFirmwares] = useState([]);

  // Product picker
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [productSearch, setProductSearch] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const searchRef = useRef(null);
  const dropdownRef = useRef(null);

  // Library + plate
  const [libraryItems, setLibraryItems] = useState([]);
  const [libraryCategories, setLibraryCategories] = useState([]);
  const [plate, setPlate] = useState([]); // array of test item objects (preserves order)
  const [libraryLoading, setLibraryLoading] = useState(true);

  // Submission
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const plateItemIds = new Set(plate.map(i => i.id));

  useEffect(() => {
    Promise.all([
      listTestItems({ status: 'active' }),
      getTestItemCategories(),
    ]).then(([items, cats]) => {
      setLibraryItems(items);
      setLibraryCategories(cats);
    }).catch(() => {}).finally(() => setLibraryLoading(false));
  }, []);

  useEffect(() => {
    if (selectedProduct) {
      getFirmwares(null, selectedProduct.id).then(setSavedFirmwares).catch(() => {});
    } else {
      setSavedFirmwares([]);
      setFirmware('');
    }
  }, [selectedProduct?.id]);

  useEffect(() => {
    function handleClickOutside(e) {
      if (
        searchRef.current && !searchRef.current.contains(e.target) &&
        dropdownRef.current && !dropdownRef.current.contains(e.target)
      ) setSearchOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const eligibleProducts = catalog.filter(p => p.type !== 'competitor');
  const searchResults = productSearch.trim() === ''
    ? eligibleProducts
    : eligibleProducts.filter(p => {
        const q = productSearch.toLowerCase();
        return (
          (p.modelNumber || '').toLowerCase().includes(q) ||
          (p.name || '').toLowerCase().includes(q) ||
          (p.manufacturer || '').toLowerCase().includes(q) ||
          (CATEGORY_LABELS[p.category] || '').toLowerCase().includes(q)
        );
      });

  function addToPlate(item) {
    if (!plateItemIds.has(item.id)) setPlate(p => [...p, item]);
  }

  function removeFromPlate(itemId) {
    setPlate(p => p.filter(i => i.id !== itemId));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!sessionName.trim()) { setError('Session name is required.'); return; }
    if (!selectedProduct)    { setError('Select a product.'); return; }
    if (plate.length === 0)  { setError('Add at least one test item to the plate.'); return; }

    setLoading(true);
    try {
      const testCases = plate.map((item, idx) => ({
        id: crypto.randomUUID(),
        templateId: item.id,
        title: item.name,
        description: item.description || '',
        expected: item.expectedResult || '',
        steps: item.steps || '',
        category: item.category,
        tags: item.tags || [],
        status: 'pending',
        notes: '',
        testNumber: String(idx + 1),
        evidenceUrl: '',
      }));

      const sessionData = {
        productId: selectedProduct.id,
        productName: selectedProduct.name,
        category: selectedProduct.category,
        firmware,
        sessionNotes: notes,
        testerName: testerName.trim(),
        type: 'buffet',
        testPlan: 'buffet',
        catalogId: selectedProduct.id,
        entity: currentUser?.entity || null,
        createdBy: currentUser?.email || null,
      };

      const created = await createSession(sessionData);
      const withTests = await updateSession(created.id, {
        testCases,
        sessionName: sessionName.trim(),
      });
      onCreated(withTests);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      {/* Back + title */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <button className="btn btn-ghost btn-sm" onClick={onBack}>← Back</button>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>New Buffet Session</h2>
      </div>

      {error && <div className="error-msg" style={{ marginBottom: 16 }}>{error}</div>}

      <form onSubmit={handleSubmit}>
        {/* Setup row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
          <div className="form-group" style={{ margin: 0 }}>
            <label>Session Name <span className="req">*</span></label>
            <input type="text" value={sessionName} onChange={e => setSessionName(e.target.value)} placeholder="e.g. OmniCam 4K — Sprint 12 Testing" required />
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label>Tester Name</label>
            <input type="text" value={testerName} onChange={e => setTesterName(e.target.value)} placeholder="Your name" />
          </div>
        </div>

        {/* Product picker */}
        <div style={{ marginBottom: 16, position: 'relative' }}>
          <label className="form-label">Product <span className="req">*</span></label>
          {selectedProduct ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', background: 'var(--surface)' }}>
              <span style={{ fontSize: 20 }}>{CATEGORY_ICONS[selectedProduct.category] || '📦'}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{selectedProduct.name}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{selectedProduct.modelNumber} · {CATEGORY_LABELS[selectedProduct.category]}</div>
              </div>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setSelectedProduct(null); setProductSearch(''); }}>Change</button>
            </div>
          ) : (
            <div style={{ position: 'relative' }}>
              <input
                ref={searchRef}
                type="text"
                placeholder="Search products…"
                value={productSearch}
                onChange={e => { setProductSearch(e.target.value); setSearchOpen(true); }}
                onFocus={() => setSearchOpen(true)}
              />
              {searchOpen && searchResults.length > 0 && (
                <div ref={dropdownRef} style={{ position: 'absolute', zIndex: 100, left: 0, right: 0, top: '100%', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, boxShadow: '0 4px 16px rgba(0,0,0,.12)', maxHeight: 280, overflowY: 'auto' }}>
                  {searchResults.slice(0, 30).map(p => (
                    <button
                      key={p.id}
                      type="button"
                      style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '9px 14px', border: 'none', background: 'none', cursor: 'pointer', textAlign: 'left' }}
                      onMouseDown={() => { setSelectedProduct(p); setProductSearch(''); setSearchOpen(false); }}
                    >
                      <span style={{ fontSize: 18 }}>{CATEGORY_ICONS[p.category] || '📦'}</span>
                      <div>
                        <div style={{ fontWeight: 500, fontSize: 13 }}>{p.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{p.modelNumber} · {CATEGORY_LABELS[p.category]}</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Firmware */}
        {selectedProduct && (
          <div style={{ marginBottom: 16 }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label>Firmware Version</label>
              <select value={firmware} onChange={e => setFirmware(e.target.value)}>
                <option value="">— Select firmware —</option>
                {savedFirmwares.map(f => <option key={f.id} value={f.version}>{f.version}{f.releasedAt ? ` (${f.releasedAt})` : ''}</option>)}
                <option value="__manual__">Enter manually…</option>
              </select>
            </div>
            {firmware === '__manual__' && (
              <input
                type="text"
                placeholder="e.g. 2.4.1"
                style={{ marginTop: 8 }}
                onChange={e => setFirmware(e.target.value === '__manual__' ? '' : e.target.value)}
              />
            )}
          </div>
        )}

        {/* Notes */}
        <div className="form-group" style={{ margin: '0 0 20px' }}>
          <label>Session Notes</label>
          <textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Context, goals, environment details…" style={{ resize: 'vertical' }} />
        </div>

        {/* Buffet area */}
        <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: 16, minHeight: 480 }}>

          {/* Library panel */}
          <div style={{ border: '1px solid var(--border)', borderRadius: 10, padding: 16, background: 'var(--surface)', display: 'flex', flexDirection: 'column', maxHeight: 600, overflow: 'hidden' }}>
            {libraryLoading ? (
              <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>Loading library…</div>
            ) : libraryItems.length === 0 ? (
              <div style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', padding: 20 }}>
                No test items in the library yet.<br />Add items in Admin → Test Library.
              </div>
            ) : (
              <LibraryPanel items={libraryItems} categories={libraryCategories} onAdd={addToPlate} plateItemIds={plateItemIds} />
            )}
          </div>

          {/* Plate */}
          <div style={{ border: '2px dashed var(--border)', borderRadius: 10, padding: 16, background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <div style={{ fontWeight: 700, fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)' }}>
                Your Plate
              </div>
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent, #1A5CF6)', background: 'var(--accent-subtle, #e8f0fe)', borderRadius: 10, padding: '1px 8px' }}>
                {plate.length} item{plate.length !== 1 ? 's' : ''}
              </span>
              {plate.length > 0 && (
                <button type="button" className="btn btn-ghost btn-sm" style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text-muted)' }} onClick={() => setPlate([])}>Clear all</button>
              )}
            </div>

            {plate.length === 0 ? (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 13, textAlign: 'center' }}>
                Add test items from the library on the left.<br />
                <span style={{ fontSize: 12 }}>Only add what's relevant to this test run.</span>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, overflowY: 'auto' }}>
                {plate.map(item => (
                  <PlateItem key={item.id} item={item} onRemove={() => removeFromPlate(item.id)} />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Submit */}
        <div style={{ marginTop: 20, display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button type="button" className="btn btn-ghost" onClick={onBack}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Creating session…' : `Start Session (${plate.length} test${plate.length !== 1 ? 's' : ''})`}
          </button>
        </div>
      </form>
    </div>
  );
}
