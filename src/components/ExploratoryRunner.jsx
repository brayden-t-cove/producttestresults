import { useState } from 'react';
import { updateSession } from '../lib/api.js';

const OBSERVATION_FIELDS = [
  { key: 'performance', label: 'Performance' },
  { key: 'uiux', label: 'UI / UX' },
  { key: 'bugIssue', label: 'Bug / Issue' },
  { key: 'like', label: 'Like' },
  { key: 'dislike', label: 'Dislike' },
  { key: 'otherNotes', label: 'Other Notes' },
];

function isCategoryComplete(cat) {
  const obs = cat.observations || {};
  return OBSERVATION_FIELDS.every(f => (obs[f.key] || '').trim() !== '');
}

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function ExploratoryRunner({ session, onUpdate, onFinish, onBack }) {
  const [categories, setCategories] = useState(session.categories || []);
  const [activeCatIndex, setActiveCatIndex] = useState(0);
  const [saving, setSaving] = useState(false);

  const activeCategory = categories[activeCatIndex] || null;

  function updateObservation(catIndex, field, value) {
    setCategories(prev => prev.map((cat, i) =>
      i === catIndex
        ? { ...cat, observations: { ...cat.observations, [field]: value } }
        : cat
    ));
  }

  function updateCategoryField(catIndex, field, value) {
    setCategories(prev => prev.map((cat, i) =>
      i === catIndex ? { ...cat, [field]: value } : cat
    ));
  }

  async function handleBlur() {
    setSaving(true);
    try {
      const updated = await updateSession(session.id, { categories });
      onUpdate(updated);
    } catch (e) {
      console.error('Auto-save failed', e);
    } finally {
      setSaving(false);
    }
  }

  async function handleNext() {
    if (activeCatIndex < categories.length - 1) {
      // auto-save before navigating
      setSaving(true);
      try {
        const updated = await updateSession(session.id, { categories });
        onUpdate(updated);
      } catch (e) {
        console.error('Auto-save failed', e);
      } finally {
        setSaving(false);
      }
      setActiveCatIndex(i => i + 1);
    } else {
      // Last category — finish
      setSaving(true);
      try {
        const updated = await updateSession(session.id, {
          categories,
          status: 'completed',
          completedAt: new Date().toISOString(),
        });
        onUpdate(updated);
        onFinish(updated);
      } catch (e) {
        console.error('Failed to finish', e);
      } finally {
        setSaving(false);
      }
    }
  }

  async function handlePrev() {
    if (activeCatIndex > 0) {
      setSaving(true);
      try {
        const updated = await updateSession(session.id, { categories });
        onUpdate(updated);
      } catch (e) {
        console.error('Auto-save failed', e);
      } finally {
        setSaving(false);
      }
      setActiveCatIndex(i => i - 1);
    }
  }

  async function handleSaveAndExit() {
    setSaving(true);
    try {
      const updated = await updateSession(session.id, { categories, status: 'active' });
      onUpdate(updated);
    } catch (e) {
      console.error('Save failed', e);
    } finally {
      setSaving(false);
    }
    onBack();
  }

  async function handleGoToSummary() {
    setSaving(true);
    try {
      const updated = await updateSession(session.id, { categories });
      onUpdate(updated);
      onFinish(updated);
    } catch (e) {
      console.error('Failed to save', e);
    } finally {
      setSaving(false);
    }
  }

  const allDone = categories.every(isCategoryComplete);

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      {/* Sidebar */}
      <div style={{
        width: 220,
        minWidth: 220,
        borderRight: '1px solid var(--border)',
        background: 'var(--card)',
        display: 'flex',
        flexDirection: 'column',
        overflowY: 'auto',
      }}>
        <div style={{ padding: '16px 14px 10px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text)' }}>{session.productName}</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>Exploratory · {formatDate(session.createdAt)}</div>
          {saving && <div style={{ fontSize: 11, color: 'var(--primary)', marginTop: 4 }}>Saving...</div>}
        </div>

        <nav style={{ flex: 1, padding: '8px 0' }}>
          {categories.map((cat, i) => {
            const done = isCategoryComplete(cat);
            const isActive = i === activeCatIndex;
            return (
              <button
                key={cat.id}
                className="btn btn-ghost"
                style={{
                  width: '100%',
                  textAlign: 'left',
                  padding: '9px 14px',
                  borderRadius: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 6,
                  fontSize: 13,
                  fontWeight: isActive ? 600 : 400,
                  color: isActive ? 'var(--primary)' : 'var(--text)',
                  background: isActive ? 'var(--primary-dim)' : 'transparent',
                  borderLeft: isActive ? '3px solid var(--primary)' : '3px solid transparent',
                }}
                onClick={() => setActiveCatIndex(i)}
              >
                <span>{cat.label}</span>
                {done && <span style={{ color: 'var(--pass)', fontSize: 12, flexShrink: 0 }}>✓</span>}
              </button>
            );
          })}
        </nav>

        <div style={{ padding: '10px 14px', borderTop: '1px solid var(--border)' }}>
          <button
            className="btn btn-ghost btn-sm"
            style={{ width: '100%', textAlign: 'left', fontSize: 12 }}
            onClick={handleGoToSummary}
          >
            Overall Summary →
          </button>
          <button
            className="btn btn-ghost btn-sm"
            style={{ width: '100%', textAlign: 'left', fontSize: 12, marginTop: 4, color: 'var(--text-muted)' }}
            onClick={handleSaveAndExit}
          >
            ← Save &amp; Exit
          </button>
        </div>
      </div>

      {/* Main panel */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px' }}>
        {activeCategory ? (
          <>
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>
                Category {activeCatIndex + 1} of {categories.length}
              </div>
              <h2 style={{ margin: '0 0 8px' }}>{activeCategory.label}</h2>
              {activeCategory.description && (
                <p style={{ margin: 0, fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6, maxWidth: 620, borderLeft: '3px solid var(--border)', paddingLeft: 12 }}>
                  {activeCategory.description}
                </p>
              )}
            </div>

            {/* Observation fields */}
            {activeCategory.id === 'auxiliary-other' ? (
              <div className="form-group">
                <label>General Observations</label>
                <textarea
                  rows={6}
                  value={activeCategory.observations?.otherNotes || ''}
                  onChange={e => updateObservation(activeCatIndex, 'otherNotes', e.target.value)}
                  onBlur={handleBlur}
                  placeholder="Was anything else noted that doesn't fit under the other categories?"
                />
              </div>
            ) : OBSERVATION_FIELDS.map(field => (
              <div className="form-group" key={field.key}>
                <label>{field.label}</label>
                <textarea
                  rows={3}
                  value={activeCategory.observations?.[field.key] || ''}
                  onChange={e => updateObservation(activeCatIndex, field.key, e.target.value)}
                  onBlur={handleBlur}
                  placeholder={`${field.label} observations...`}
                />
              </div>
            ))}

            {/* Screenshot & Video */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Screenshot URL <span style={{ fontWeight: 400, textTransform: 'none', fontSize: 12, color: 'var(--text-muted)' }}>(optional)</span></label>
                <input
                  type="url"
                  value={activeCategory.screenshotUrl || ''}
                  onChange={e => updateCategoryField(activeCatIndex, 'screenshotUrl', e.target.value)}
                  onBlur={handleBlur}
                  placeholder="https://..."
                />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Video URL <span style={{ fontWeight: 400, textTransform: 'none', fontSize: 12, color: 'var(--text-muted)' }}>(optional)</span></label>
                <input
                  type="url"
                  value={activeCategory.videoUrl || ''}
                  onChange={e => updateCategoryField(activeCatIndex, 'videoUrl', e.target.value)}
                  onBlur={handleBlur}
                  placeholder="https://..."
                />
              </div>
            </div>

            {/* Mark complete */}
            <div style={{ marginTop: 16 }}>
              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                cursor: 'pointer',
                padding: '10px 14px',
                background: activeCategory.completed ? 'var(--pass-dim)' : 'var(--card)',
                borderRadius: 6,
                border: `1px solid ${activeCategory.completed ? 'var(--pass)' : 'var(--border)'}`,
                fontSize: 14,
                fontWeight: 500,
                color: 'var(--text)',
                textTransform: 'none',
                letterSpacing: 0,
                marginBottom: 0,
              }}>
                <input
                  type="checkbox"
                  checked={!!activeCategory.completed}
                  onChange={e => {
                    updateCategoryField(activeCatIndex, 'completed', e.target.checked);
                    // save on change
                    setTimeout(handleBlur, 50);
                  }}
                  style={{ width: 'auto', margin: 0 }}
                />
                Mark Complete
              </label>
            </div>

            {/* Prev / Next / Save & Exit */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 28, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
              <button
                className="btn btn-ghost"
                onClick={handlePrev}
                disabled={activeCatIndex === 0 || saving}
              >
                ← Prev
              </button>
              <button
                className="btn btn-ghost"
                onClick={handleSaveAndExit}
                disabled={saving}
              >
                Save &amp; Exit
              </button>
              <button
                className="btn btn-primary"
                onClick={handleNext}
                disabled={saving}
              >
                {activeCatIndex === categories.length - 1 ? 'Finish & View Summary' : 'Next →'}
              </button>
            </div>
          </>
        ) : (
          <div className="empty-state">
            <p>No categories selected.</p>
          </div>
        )}
      </div>
    </div>
  );
}
