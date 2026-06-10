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

function SpecGroup({ group, values, onChange }) {
  const [open, setOpen] = useState(false);
  const filled = countFilled(group.fields, values);
  const total = group.fields.length;

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
              return (
                <div
                  key={field.id}
                  className="spec-field-row"
                  style={isWide ? { gridColumn: '1 / -1' } : {}}
                >
                  <label className="spec-field-label">{field.label}</label>
                  <SpecField
                    field={field}
                    value={values[field.id]}
                    onChange={val => onChange(field.id, val)}
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default function SpecsForm({ schema, values, onChange }) {
  if (!schema || schema.length === 0) return null;

  return (
    <div className="specs-form">
      {schema.map(group => (
        <SpecGroup
          key={group.label}
          group={group}
          values={values}
          onChange={onChange}
        />
      ))}
    </div>
  );
}
