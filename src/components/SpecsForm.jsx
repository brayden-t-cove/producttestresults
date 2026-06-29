import { useState } from 'react';

// Count filled fields in a group given current values
function countFilled(fields, values) {
  return fields.filter(f => {
    const v = values[f.id];
    return v !== undefined && v !== '' && v !== null;
  }).length;
}

function BooleanToggle({ value, onChange }) {
  const opts = [
    { val: 'yes', label: 'Yes' },
    { val: 'no', label: 'No' },
    { val: 'na', label: 'N/A' },
    { val: 'unknown', label: 'Unknown' },
    { val: '', label: '—' },
  ];

  return (
    <div className="specs-bool-toggle">
      {opts.map(opt => {
        const active = value === opt.val;
        let activeStyle = {};
        if (active) {
          if (opt.val === 'yes') {
            activeStyle = { background: 'rgba(34,197,94,0.18)', color: 'var(--pass)', borderColor: 'var(--pass)' };
          } else if (opt.val === 'no') {
            activeStyle = { background: 'rgba(239,68,68,0.15)', color: 'var(--fail)', borderColor: 'var(--fail)' };
          } else if (opt.val === 'na') {
            activeStyle = { background: 'rgba(99,102,241,0.15)', color: '#6366f1', borderColor: '#6366f1' };
          } else if (opt.val === 'unknown') {
            activeStyle = { background: 'rgba(245,158,11,0.15)', color: '#d97706', borderColor: '#d97706' };
          } else {
            activeStyle = { background: 'var(--border)', color: 'var(--text-muted)', borderColor: 'var(--border)' };
          }
        }
        return (
          <button
            key={opt.val}
            type="button"
            className="btn btn-ghost btn-sm specs-bool-btn"
            style={{
              padding: '2px 10px',
              fontSize: 12,
              fontWeight: active ? 700 : 400,
              opacity: active ? 1 : 0.6,
              ...activeStyle,
            }}
            onClick={() => onChange(opt.val)}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

function SpecField({ field, value, onChange }) {
  const val = value ?? '';

  switch (field.type) {
    case 'text':
      return (
        <input
          type="text"
          value={val}
          placeholder="—"
          onChange={e => onChange(e.target.value)}
          style={{ width: '100%' }}
        />
      );
    case 'number':
      return (
        <input
          type="number"
          value={val}
          placeholder="—"
          onChange={e => onChange(e.target.value)}
          style={{ width: '100%' }}
        />
      );
    case 'textarea':
      return (
        <textarea
          rows={3}
          value={val}
          placeholder="—"
          onChange={e => onChange(e.target.value)}
          style={{ width: '100%', resize: 'vertical' }}
        />
      );
    case 'select':
      return (
        <select value={val} onChange={e => onChange(e.target.value)} style={{ width: '100%' }}>
          <option value="">— Select —</option>
          {(field.options || []).map(opt => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      );
    case 'boolean':
      return <BooleanToggle value={val} onChange={onChange} />;
    default:
      return (
        <input
          type="text"
          value={val}
          onChange={e => onChange(e.target.value)}
          style={{ width: '100%' }}
        />
      );
  }
}

function LensArrayGroup({ group, values, notes, onChange, onNoteChange }) {
  const [open, setOpen] = useState(false);
  const [activeLens, setActiveLens] = useState(0);
  const lensCount = parseInt(values.lensCount || '1', 10) || 1;
  const lenses = values.lenses || [];

  function handleLensChange(lensIdx, fieldId, val) {
    const updated = [...lenses];
    while (updated.length <= lensIdx) updated.push({});
    updated[lensIdx] = { ...updated[lensIdx], [fieldId]: val };
    onChange('lenses', updated);
  }

  function handleLensNoteChange(lensIdx, fieldId, val) {
    const noteKey = `lenses_${lensIdx}_${fieldId}`;
    onNoteChange(noteKey, val);
  }

  const totalFilled = lenses.reduce((sum, lens) =>
    sum + group.lensFields.filter(f => lens[f.id] !== undefined && lens[f.id] !== '' && lens[f.id] !== null).length, 0);

  return (
    <div className="spec-group">
      <button type="button" className="spec-group-header" onClick={() => setOpen(o => !o)} aria-expanded={open}>
        <span className="spec-group-arrow">{open ? '▾' : '▸'}</span>
        <span className="spec-group-label">{group.label.toUpperCase()}</span>
        <span style={{ marginLeft: 6, fontSize: 11, color: 'var(--text-muted)', fontWeight: 400 }}>
          {lensCount} lens{lensCount !== 1 ? 'es' : ''}
        </span>
        <span className="spec-group-counter" style={{
          marginLeft: 'auto', fontSize: 11, fontWeight: 600,
          color: totalFilled > 0 ? 'var(--primary)' : 'var(--text-muted)',
          background: totalFilled > 0 ? 'rgba(99,102,241,0.12)' : 'transparent',
          borderRadius: 10, padding: '1px 8px',
        }}>
          {totalFilled} filled
        </span>
      </button>

      {open && (
        <div className="spec-group-body">
          {lensCount === 1 ? null : (
            <div style={{ display: 'flex', gap: 6, marginBottom: 14, borderBottom: '1px solid var(--border)', paddingBottom: 10 }}>
              {Array.from({ length: lensCount }, (_, i) => (
                <button
                  key={i}
                  type="button"
                  className={`product-tab${activeLens === i ? ' active' : ''}`}
                  style={{ fontSize: 12, padding: '4px 12px' }}
                  onClick={() => setActiveLens(i)}
                >
                  {lenses[i]?.lensLabel || `Lens ${i + 1}`}
                </button>
              ))}
            </div>
          )}
          <div className="spec-fields-grid">
            {group.lensFields.map(field => {
              const lensVals = lenses[activeLens] || {};
              const noteKey = `lenses_${activeLens}_${field.id}`;
              const hasNote = !!(notes?.[noteKey]);
              return (
                <div key={field.id} className="spec-field-row" style={field.type === 'textarea' ? { gridColumn: '1 / -1' } : {}}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 4 }}>
                    <label className="spec-field-label">{field.label}</label>
                  </div>
                  <SpecField
                    field={field}
                    value={lensVals[field.id]}
                    onChange={val => handleLensChange(activeLens, field.id, val)}
                  />
                  {hasNote && (
                    <input
                      type="text"
                      placeholder="Note..."
                      value={notes?.[noteKey] || ''}
                      onChange={e => handleLensNoteChange(activeLens, field.id, e.target.value)}
                      style={{ marginTop: 4, width: '100%', fontSize: 12, color: 'var(--primary)', borderColor: 'rgba(99,102,241,0.4)', background: 'rgba(99,102,241,0.05)' }}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function SpecGroup({ group, values, notes, onChange, onNoteChange }) {
  const [open, setOpen] = useState(false);
  const [noteOpen, setNoteOpen] = useState({});
  const filled = countFilled(group.fields, values);
  const total = group.fields.length;

  function toggleNote(fieldId) {
    setNoteOpen(prev => ({ ...prev, [fieldId]: !prev[fieldId] }));
  }

  return (
    <div className="spec-group">
      <button
        type="button"
        className="spec-group-header"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
      >
        <span className="spec-group-arrow">{open ? '▾' : '▸'}</span>
        <span className="spec-group-label">{group.label.toUpperCase()}</span>
        <span className="spec-group-counter" style={{
          marginLeft: 'auto',
          fontSize: 11,
          fontWeight: 600,
          color: filled > 0 ? 'var(--primary)' : 'var(--text-muted)',
          background: filled > 0 ? 'rgba(99,102,241,0.12)' : 'transparent',
          borderRadius: 10,
          padding: '1px 8px',
        }}>
          {filled} / {total} filled
        </span>
      </button>

      {open && (
        <div className="spec-group-body">
          <div className="spec-fields-grid">
            {group.fields.map(field => {
              const isWide = field.type === 'textarea';
              const hasNote = !!(notes?.[field.id]);
              const noteVisible = noteOpen[field.id] || hasNote;
              return (
                <div
                  key={field.id}
                  className="spec-field-row"
                  style={isWide ? { gridColumn: '1 / -1' } : {}}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 4 }}>
                    <label className="spec-field-label">{field.label}</label>
                    <button
                      type="button"
                      onClick={() => toggleNote(field.id)}
                      title={hasNote ? 'Has note' : 'Add note'}
                      style={{
                        background: 'none', border: 'none', cursor: 'pointer', padding: '0 2px',
                        fontSize: 12, color: hasNote ? 'var(--primary)' : 'var(--text-muted)',
                        flexShrink: 0, lineHeight: 1,
                      }}
                    >
                      {hasNote ? '📝' : '+ note'}
                    </button>
                  </div>
                  <SpecField
                    field={field}
                    value={values[field.id]}
                    onChange={val => onChange(field.id, val)}
                  />
                  {noteVisible && (
                    <input
                      type="text"
                      placeholder="Note (e.g. vendor claims X, actual measured Y)..."
                      value={notes?.[field.id] || ''}
                      onChange={e => onNoteChange(field.id, e.target.value)}
                      style={{ marginTop: 4, width: '100%', fontSize: 12, color: 'var(--primary)', borderColor: 'rgba(99,102,241,0.4)', background: 'rgba(99,102,241,0.05)' }}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default function SpecsForm({ schema, values, notes, onChange, onNoteChange }) {
  if (!schema || schema.length === 0) return null;

  return (
    <div className="specs-form">
      {schema.map(group => (
        group.type === 'lens-array' ? (
          <LensArrayGroup
            key={group.label}
            group={group}
            values={values}
            notes={notes}
            onChange={onChange}
            onNoteChange={onNoteChange}
          />
        ) : (
          <SpecGroup
            key={group.label}
            group={group}
            values={values}
            notes={notes}
            onChange={onChange}
            onNoteChange={onNoteChange}
          />
        )
      ))}
    </div>
  );
}
