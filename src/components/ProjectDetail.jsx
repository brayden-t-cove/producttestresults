import { useState } from 'react';
import { STAGES, DEFAULT_ITEMS } from '../data/projectTemplates.js';

const STATUS_CONFIG = {
  active:    { label: 'Active',    color: 'var(--primary)',    bg: 'var(--primary-dim)' },
  'on-hold': { label: 'On Hold',   color: '#f59e0b',           bg: 'rgba(245,158,11,0.12)' },
  completed: { label: 'Completed', color: 'var(--pass)',        bg: 'var(--pass-dim)' },
  scrapped:  { label: 'Scrapped',  color: 'var(--fail)',        bg: 'var(--fail-dim)' },
};

const ITEM_STATUS_CONFIG = {
  pending:  { label: 'Pending',  icon: '○', color: 'var(--text-muted)' },
  blocked:  { label: 'Blocked',  icon: '⊘', color: '#f59e0b' },
  denied:   { label: 'Denied',   icon: '✕', color: 'var(--fail)' },
  approved: { label: 'Approved', icon: '✓', color: 'var(--pass)' },
};

const DOMAIN_LABELS = {
  tester:   'Tester',
  designer: 'Designer',
  editor:   'Editor',
  pm:       'Project Manager',
};

function formatTs(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
}

function SignoffLog({ signoffs }) {
  if (!signoffs?.length) return null;
  return (
    <div className="signoff-log">
      {signoffs.map((s, i) => (
        <div key={i} className={`signoff-entry signoff-${s.action}`}>
          <span className="signoff-icon">{s.action === 'approved' ? '✓' : '✕'}</span>
          <div style={{ flex: 1 }}>
            <span style={{ fontWeight: 600, fontSize: 12 }}>{s.userName || s.userEmail}</span>
            <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 6 }}>({s.role})</span>
            <span style={{ fontSize: 11, color: 'var(--text-dim)', marginLeft: 6 }}>{formatTs(s.timestamp)}</span>
            {s.note && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2, fontStyle: 'italic' }}>{s.note}</div>}
          </div>
        </div>
      ))}
    </div>
  );
}

function ItemRow({ item, currentUser, onUpdateItem }) {
  const [expanded, setExpanded] = useState(false);
  const [showDenyModal, setShowDenyModal] = useState(false);
  const [denyNote, setDenyNote] = useState('');
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [blockNote, setBlockNote] = useState('');

  const sc = ITEM_STATUS_CONFIG[item.status] || ITEM_STATUS_CONFIG.pending;
  const canAct = currentUser && ['project-manager', 'superuser'].includes(currentUser.role);

  function makeSignoff(action, note = '') {
    return {
      userId: currentUser?.id || '',
      userName: currentUser?.name || currentUser?.email || 'Unknown',
      userEmail: currentUser?.email || '',
      role: currentUser?.role || 'unknown',
      action,
      note,
      timestamp: new Date().toISOString(),
    };
  }

  function handleApprove() {
    const log = [...(item.signoffs || []), makeSignoff('approved')];
    onUpdateItem({ ...item, status: 'approved', signoffs: log });
  }

  function handleDeny() {
    if (!denyNote.trim()) return;
    const log = [...(item.signoffs || []), makeSignoff('denied', denyNote.trim())];
    onUpdateItem({ ...item, status: 'denied', signoffs: log });
    setShowDenyModal(false);
    setDenyNote('');
  }

  function handleBlock() {
    onUpdateItem({ ...item, status: 'blocked', blockNote: blockNote.trim() });
    setShowBlockModal(false);
    setBlockNote('');
  }

  function handleUnblock() {
    onUpdateItem({ ...item, status: 'pending', blockNote: '' });
  }

  function toggleSubItem(subId) {
    const subItems = item.subItems.map(s => s.id === subId ? { ...s, approved: !s.approved } : s);
    onUpdateItem({ ...item, subItems });
  }

  const approvedSubs = item.subItems?.filter(s => s.approved).length || 0;
  const totalSubs = item.subItems?.length || 0;

  return (
    <div className={`checklist-item checklist-item--${item.status}`}>
      <div className="checklist-item-row" onClick={() => setExpanded(v => !v)}>
        <span className="checklist-status-icon" style={{ color: sc.color }}>{sc.icon}</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600, fontSize: 13 }}>{item.label}</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {item.assignedDomain && <span>Sign-off: PM + {DOMAIN_LABELS[item.assignedDomain] || item.assignedDomain}</span>}
            {totalSubs > 0 && <span>{approvedSubs}/{totalSubs} sub-items</span>}
            {item.status === 'blocked' && item.blockNote && <span style={{ color: '#f59e0b' }}>Blocked: {item.blockNote}</span>}
          </div>
        </div>
        <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 8 }}>{expanded ? '▲' : '▼'}</span>
      </div>

      {expanded && (
        <div className="checklist-item-detail">
          {/* Sub-items */}
          {item.subItems?.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Sub-items</div>
              {item.subItems.map(sub => (
                <label key={sub.id} className="subitem-row">
                  <input type="checkbox" checked={sub.approved} onChange={() => canAct && toggleSubItem(sub.id)} disabled={!canAct} />
                  <span style={{ fontSize: 13, textDecoration: sub.approved ? 'line-through' : 'none', color: sub.approved ? 'var(--text-muted)' : 'var(--text)' }}>{sub.label}</span>
                </label>
              ))}
            </div>
          )}

          {/* Signoff log */}
          <SignoffLog signoffs={item.signoffs} />

          {/* Actions */}
          {canAct && (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
              {item.status !== 'approved' && (
                <button className="btn btn-primary btn-sm" onClick={handleApprove}>✓ Approve</button>
              )}
              {item.status === 'approved' && (
                <button className="btn btn-ghost btn-sm" onClick={() => onUpdateItem({ ...item, status: 'pending' })}>Undo Approval</button>
              )}
              {item.status !== 'denied' && item.status !== 'approved' && (
                <button className="btn btn-ghost btn-sm" style={{ color: 'var(--fail)' }} onClick={() => setShowDenyModal(true)}>✕ Deny</button>
              )}
              {item.status === 'denied' && (
                <button className="btn btn-ghost btn-sm" onClick={() => onUpdateItem({ ...item, status: 'pending' })}>Reset to Pending</button>
              )}
              {item.status !== 'blocked' && item.status !== 'approved' && (
                <button className="btn btn-ghost btn-sm" style={{ color: '#f59e0b' }} onClick={() => setShowBlockModal(true)}>⊘ Block</button>
              )}
              {item.status === 'blocked' && (
                <button className="btn btn-ghost btn-sm" onClick={handleUnblock}>Remove Block</button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Deny modal */}
      {showDenyModal && (
        <div className="modal-overlay" onClick={() => setShowDenyModal(false)}>
          <div className="modal-box" style={{ maxWidth: 400 }} onClick={e => e.stopPropagation()}>
            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>Deny — Add Reason</h3>
            <textarea
              rows={4}
              placeholder="What needs to change before this can be approved?"
              value={denyNote}
              onChange={e => setDenyNote(e.target.value)}
              style={{ width: '100%', resize: 'vertical', marginBottom: 12 }}
              autoFocus
            />
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowDenyModal(false)}>Cancel</button>
              <button className="btn btn-sm" style={{ background: 'var(--fail)', color: '#fff' }} onClick={handleDeny} disabled={!denyNote.trim()}>Deny</button>
            </div>
          </div>
        </div>
      )}

      {/* Block modal */}
      {showBlockModal && (
        <div className="modal-overlay" onClick={() => setShowBlockModal(false)}>
          <div className="modal-box" style={{ maxWidth: 400 }} onClick={e => e.stopPropagation()}>
            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>Block — Add Note</h3>
            <textarea
              rows={3}
              placeholder="What external dependency is blocking this? (e.g. waiting on vendor cert docs)"
              value={blockNote}
              onChange={e => setBlockNote(e.target.value)}
              style={{ width: '100%', resize: 'vertical', marginBottom: 12 }}
              autoFocus
            />
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowBlockModal(false)}>Cancel</button>
              <button className="btn btn-sm" style={{ background: '#f59e0b', color: '#fff' }} onClick={handleBlock}>Set Blocked</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AddItemModal({ stage, onAdd, onClose }) {
  const [label, setLabel] = useState('');
  const [domain, setDomain] = useState('');
  const [subs, setSubs] = useState(['']);

  function addSub() { setSubs(p => [...p, '']); }
  function updateSub(i, v) { setSubs(p => p.map((s, idx) => idx === i ? v : s)); }
  function removeSub(i) { setSubs(p => p.filter((_, idx) => idx !== i)); }

  function handleAdd() {
    if (!label.trim()) return;
    onAdd({
      id: crypto.randomUUID(),
      label: label.trim(),
      stage,
      assignedDomain: domain || null,
      status: 'pending',
      blockNote: '',
      subItems: subs.filter(s => s.trim()).map(s => ({ id: crypto.randomUUID(), label: s.trim(), approved: false })),
      signoffs: [],
    });
    onClose();
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" style={{ maxWidth: 460 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3 style={{ fontSize: 15, fontWeight: 700 }}>Add Checklist Item</h3>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
        </div>
        <div className="form-group">
          <label>Item Label <span style={{ color: 'var(--fail)' }}>*</span></label>
          <input type="text" placeholder="e.g. FCC Certification Complete" value={label} onChange={e => setLabel(e.target.value)} autoFocus />
        </div>
        <div className="form-group">
          <label>Domain Sign-off Required</label>
          <select value={domain} onChange={e => setDomain(e.target.value)}>
            <option value="">PM only</option>
            <option value="tester">Tester</option>
            <option value="designer">Designer</option>
            <option value="editor">Editor</option>
          </select>
        </div>
        <div className="form-group">
          <label>Sub-items <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(optional)</span></label>
          {subs.map((s, i) => (
            <div key={i} style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
              <input type="text" placeholder={`Sub-item ${i + 1}`} value={s} onChange={e => updateSub(i, e.target.value)} style={{ flex: 1 }} />
              {subs.length > 1 && <button type="button" className="btn btn-ghost btn-sm" style={{ color: 'var(--fail)' }} onClick={() => removeSub(i)}>✕</button>}
            </div>
          ))}
          <button type="button" className="btn btn-ghost btn-sm" style={{ fontSize: 12, marginTop: 2 }} onClick={addSub}>+ Add sub-item</button>
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleAdd} disabled={!label.trim()}>Add Item</button>
        </div>
      </div>
    </div>
  );
}

function StagePanel({ stage, stageData, currentUser, onUpdateStage }) {
  const [open, setOpen] = useState(true);
  const [showAdd, setShowAdd] = useState(false);

  const items = stageData?.items || [];
  const approved = items.filter(i => i.status === 'approved').length;
  const blocked = items.filter(i => i.status === 'blocked').length;
  const denied = items.filter(i => i.status === 'denied').length;
  const pct = items.length ? Math.round(approved / items.length * 100) : 0;
  const canEdit = currentUser && ['project-manager', 'superuser'].includes(currentUser.role);

  function updateItem(updated) {
    const newItems = items.map(i => i.id === updated.id ? updated : i);
    onUpdateStage({ ...stageData, items: newItems });
  }

  function addItem(item) {
    onUpdateStage({ ...stageData, items: [...items, item] });
  }

  function removeItem(id) {
    if (!confirm('Remove this checklist item?')) return;
    onUpdateStage({ ...stageData, items: items.filter(i => i.id !== id) });
  }

  const barColor = blocked > 0 ? '#f59e0b' : denied > 0 ? 'var(--fail)' : pct === 100 ? 'var(--pass)' : 'var(--primary)';

  return (
    <div className="stage-panel">
      <div className="stage-panel-header" onClick={() => setOpen(v => !v)}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <span style={{ fontWeight: 700, fontSize: 14 }}>{stage.label}</span>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{approved}/{items.length} approved</span>
            {blocked > 0 && <span style={{ fontSize: 11, color: '#f59e0b', fontWeight: 600 }}>{blocked} blocked</span>}
            {denied > 0 && <span style={{ fontSize: 11, color: 'var(--fail)', fontWeight: 600 }}>{denied} denied</span>}
          </div>
          <div style={{ height: 3, background: 'var(--border)', borderRadius: 2, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${pct}%`, background: barColor, transition: 'width 0.3s' }} />
          </div>
        </div>
        <span style={{ fontSize: 13, color: 'var(--text-muted)', marginLeft: 16, flexShrink: 0 }}>{open ? '▲' : '▼'}</span>
      </div>

      {open && (
        <div className="stage-panel-body">
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>{stage.description}</p>
          {items.map(item => (
            <div key={item.id} style={{ position: 'relative' }}>
              <ItemRow item={item} currentUser={currentUser} onUpdateItem={updateItem} />
              {canEdit && (
                <button
                  className="btn btn-ghost btn-sm"
                  style={{ position: 'absolute', top: 10, right: 10, fontSize: 11, color: 'var(--text-dim)', padding: '2px 6px' }}
                  onClick={e => { e.stopPropagation(); removeItem(item.id); }}
                  title="Remove item"
                >✕</button>
              )}
            </div>
          ))}
          {canEdit && (
            <button className="btn btn-ghost btn-sm" style={{ fontSize: 12, marginTop: 8 }} onClick={() => setShowAdd(true)}>
              + Add Item
            </button>
          )}
        </div>
      )}

      {showAdd && <AddItemModal stage={stage.id} onAdd={addItem} onClose={() => setShowAdd(false)} />}
    </div>
  );
}

export default function ProjectDetail({ project, currentUser, onBack, onUpdate, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(project.name);
  const [editStatus, setEditStatus] = useState(project.status);
  const [editStatusNote, setEditStatusNote] = useState(project.statusNote || '');
  const [editDescription, setEditDescription] = useState(project.description || '');

  const sc = STATUS_CONFIG[project.status] || STATUS_CONFIG.active;
  const canEdit = currentUser && ['project-manager', 'superuser'].includes(currentUser.role);

  function updateStage(stageId, stageData) {
    const stages = { ...project.stages, [stageId]: stageData };
    onUpdate({ ...project, stages });
  }

  async function saveHeader() {
    await onUpdate({ ...project, name: editName.trim() || project.name, status: editStatus, statusNote: editStatusNote, description: editDescription });
    setEditing(false);
  }

  return (
    <div className="project-detail">
      <div className="project-detail-header">
        <button className="btn btn-ghost btn-sm" onClick={onBack}>← Projects</button>

        {editing ? (
          <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <input className="form-control" value={editName} onChange={e => setEditName(e.target.value)} style={{ fontSize: 18, fontWeight: 700 }} />
            <div style={{ display: 'flex', gap: 8 }}>
              <select value={editStatus} onChange={e => setEditStatus(e.target.value)}>
                {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
              <input placeholder="Status note (optional)" value={editStatusNote} onChange={e => setEditStatusNote(e.target.value)} style={{ flex: 1 }} />
            </div>
            <textarea rows={2} placeholder="Project goal / description" value={editDescription} onChange={e => setEditDescription(e.target.value)} style={{ resize: 'vertical' }} />
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-primary btn-sm" onClick={saveHeader}>Save</button>
              <button className="btn btn-ghost btn-sm" onClick={() => setEditing(false)}>Cancel</button>
            </div>
          </div>
        ) : (
          <div style={{ marginTop: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>{project.name}</h1>
              <span style={{ fontSize: 12, padding: '3px 10px', borderRadius: 99, background: sc.bg, color: sc.color, fontWeight: 600 }}>{sc.label}</span>
              {project.entity && <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{project.entity}</span>}
              {canEdit && <button className="btn btn-ghost btn-sm" onClick={() => setEditing(true)}>Edit</button>}
              {canEdit && <button className="btn btn-ghost btn-sm" style={{ color: 'var(--fail)' }} onClick={onDelete}>Delete</button>}
            </div>
            {project.productName && <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>Product: {project.productName}</div>}
            {project.description && <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>{project.description}</div>}
            {project.statusNote && <div style={{ fontSize: 12, color: '#f59e0b', marginTop: 4, fontStyle: 'italic' }}>{project.statusNote}</div>}
          </div>
        )}
      </div>

      <div className="project-stages">
        {STAGES.map(stage => (
          <StagePanel
            key={stage.id}
            stage={stage}
            stageData={project.stages?.[stage.id]}
            currentUser={currentUser}
            onUpdateStage={data => updateStage(stage.id, data)}
          />
        ))}
      </div>
    </div>
  );
}
