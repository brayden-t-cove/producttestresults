import { useState, useEffect } from 'react';
import { getProjects, createProject, updateProject, deleteProject } from '../lib/api.js';
import { STAGES, DEFAULT_ITEMS } from '../data/projectTemplates.js';
import ProjectDetail from './ProjectDetail.jsx';

const STATUS_CONFIG = {
  active:    { label: 'Active',    color: 'var(--primary)',    bg: 'var(--primary-dim)' },
  'on-hold': { label: 'On Hold',   color: '#f59e0b',           bg: 'rgba(245,158,11,0.12)' },
  completed: { label: 'Completed', color: 'var(--pass)',        bg: 'var(--pass-dim)' },
  scrapped:  { label: 'Scrapped',  color: 'var(--fail)',        bg: 'var(--fail-dim)' },
};

function computeReadiness(stages) {
  let total = 0, approved = 0;
  for (const stage of Object.values(stages || {})) {
    for (const item of stage.items || []) {
      total++;
      if (item.status === 'approved') approved++;
    }
  }
  return total === 0 ? 0 : Math.round((approved / total) * 100);
}

function stageReadiness(stageData) {
  const items = stageData?.items || [];
  if (!items.length) return 0;
  return Math.round(items.filter(i => i.status === 'approved').length / items.length * 100);
}

function readinessColor(pct) {
  if (pct === 100) return 'var(--pass)';
  if (pct >= 67) return 'var(--primary)';
  if (pct >= 34) return '#f59e0b';
  return 'var(--fail)';
}

function ReadinessRing({ pct, size = 56, stroke = 5 }) {
  const r = (size - stroke * 2) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  const color = readinessColor(pct);
  return (
    <svg width={size} height={size} style={{ flexShrink: 0 }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--border)" strokeWidth={stroke} />
      <circle
        cx={size/2} cy={size/2} r={r} fill="none"
        stroke={color} strokeWidth={stroke}
        strokeDasharray={circ} strokeDashoffset={offset}
        strokeLinecap="round"
        transform={`rotate(-90 ${size/2} ${size/2})`}
        style={{ transition: 'stroke-dashoffset 0.4s ease' }}
      />
      <text x={size/2} y={size/2 + 4} textAnchor="middle" fontSize={11} fontWeight={700} fill={color}>
        {pct}%
      </text>
    </svg>
  );
}

function ReadinessDropdown({ stages }) {
  return (
    <div className="readiness-dropdown">
      {STAGES.map(s => {
        const pct = stageReadiness(stages[s.id]);
        const items = stages[s.id]?.items || [];
        const approved = items.filter(i => i.status === 'approved').length;
        return (
          <div key={s.id} className="readiness-dropdown-row">
            <span className="readiness-dropdown-label">{s.label}</span>
            <div className="readiness-dropdown-bar-wrap">
              <div className="readiness-dropdown-bar" style={{ width: `${pct}%`, background: readinessColor(pct) }} />
            </div>
            <span style={{ fontSize: 11, color: readinessColor(pct), fontWeight: 700, minWidth: 32, textAlign: 'right' }}>
              {approved}/{items.length}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function ProjectCard({ project, onOpen }) {
  const [showReadiness, setShowReadiness] = useState(false);
  const pct = computeReadiness(project.stages);
  const sc = STATUS_CONFIG[project.status] || STATUS_CONFIG.active;

  return (
    <div className="project-card" onClick={() => onOpen(project)}>
      <div className="project-card-top">
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 700, fontSize: 15 }}>{project.name}</span>
            <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 99, background: sc.bg, color: sc.color, fontWeight: 600 }}>
              {sc.label}
            </span>
          </div>
          {project.productName && (
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{project.productName}</div>
          )}
          {project.entity && (
            <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 2 }}>{project.entity}</div>
          )}
          {project.deadline && (() => {
            const days = Math.ceil((new Date(project.deadline) - new Date()) / (1000 * 60 * 60 * 24));
            const color = days < 0 ? 'var(--fail)' : days < 14 ? '#f59e0b' : 'var(--text-dim)';
            return <div style={{ fontSize: 11, color, marginTop: 2, fontWeight: days < 14 ? 600 : 400 }}>
              {days < 0 ? `${Math.abs(days)}d overdue` : days === 0 ? 'Due today' : `${days}d remaining`}
            </div>;
          })()}
        </div>
        <div style={{ position: 'relative' }} onClick={e => { e.stopPropagation(); setShowReadiness(v => !v); }}>
          <ReadinessRing pct={pct} />
          {showReadiness && (
            <div style={{ position: 'absolute', right: 0, top: 64, zIndex: 20, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: 16, minWidth: 240, boxShadow: '0 8px 24px rgba(0,0,0,0.18)' }}
              onClick={e => e.stopPropagation()}>
              <ReadinessDropdown stages={project.stages || {}} />
            </div>
          )}
        </div>
      </div>

      <div className="project-card-stages">
        {STAGES.map(s => {
          const pct = stageReadiness(project.stages?.[s.id]);
          const blocked = (project.stages?.[s.id]?.items || []).some(i => i.status === 'blocked');
          return (
            <div key={s.id} className="project-stage-pip" title={`${s.label}: ${pct}%`}>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 3, fontWeight: 600 }}>{s.label.slice(0,3).toUpperCase()}</div>
              <div style={{ height: 4, borderRadius: 2, background: 'var(--border)', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${pct}%`, background: blocked ? '#f59e0b' : readinessColor(pct), transition: 'width 0.3s' }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}


const ENTITIES = ['Cove', 'Luna', 'Alder', 'InstaVision'];
const STEP_LABELS = ['Project Details', 'Checklist', 'Deadline'];

function buildStagesFromSelections(selections) {
  const stages = {};
  for (const stage of STAGES) {
    stages[stage.id] = {
      items: (selections[stage.id] || []).map(tpl => ({
        id: crypto.randomUUID(),
        label: tpl.label,
        stage: stage.id,
        assignedDomain: tpl.assignedDomain,
        status: 'pending',
        blockNote: '',
        subItems: tpl.subItems.map(label => ({ id: crypto.randomUUID(), label, approved: false })),
        signoffs: [],
      })),
    };
  }
  return stages;
}

function NewProjectModal({ catalog, onSave, onClose }) {
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [productMode, setProductMode] = useState('catalog');
  const [catalogId, setCatalogId] = useState('');
  const [placeholderName, setPlaceholderName] = useState('');
  const [entity, setEntity] = useState('');
  const [description, setDescription] = useState('');
  const [deadline, setDeadline] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  // Step 2: checklist selections — start with all defaults checked
  const [selections, setSelections] = useState(() => {
    const s = {};
    for (const stage of STAGES) s[stage.id] = [...DEFAULT_ITEMS[stage.id]];
    return s;
  });
  const [customLabels, setCustomLabels] = useState(() => {
    const s = {};
    for (const stage of STAGES) s[stage.id] = '';
    return s;
  });

  const selectedProduct = catalog.find(p => p.id === catalogId);

  function validateStep1() {
    if (!name.trim()) { setError('Project name is required.'); return false; }
    if (productMode === 'catalog' && !catalogId) { setError('Select a product or use a placeholder.'); return false; }
    if (productMode === 'placeholder' && !placeholderName.trim()) { setError('Enter a placeholder name.'); return false; }
    return true;
  }

  function goNext() {
    setError('');
    if (step === 1 && !validateStep1()) return;
    setStep(s => s + 1);
  }

  function toggleItem(stageId, item) {
    setSelections(prev => {
      const cur = prev[stageId];
      const exists = cur.some(i => i.label === item.label);
      return { ...prev, [stageId]: exists ? cur.filter(i => i.label !== item.label) : [...cur, item] };
    });
  }

  function addCustomItem(stageId) {
    const label = customLabels[stageId].trim();
    if (!label) return;
    const newItem = { label, assignedDomain: null, subItems: [] };
    setSelections(prev => ({ ...prev, [stageId]: [...prev[stageId], newItem] }));
    setCustomLabels(prev => ({ ...prev, [stageId]: '' }));
  }

  function removeCustomItem(stageId, label) {
    setSelections(prev => ({ ...prev, [stageId]: prev[stageId].filter(i => i.label !== label) }));
  }

  async function handleCreate() {
    setError('');
    setBusy(true);
    try {
      const productName = productMode === 'catalog'
        ? (selectedProduct?.name || selectedProduct?.modelNumber || '')
        : placeholderName.trim();
      await onSave({
        name: name.trim(),
        status: 'active',
        statusNote: '',
        catalogProductId: productMode === 'catalog' ? catalogId : null,
        productName,
        entity: entity || (selectedProduct?.entity?.[0] || ''),
        description: description.trim(),
        deadline: deadline || null,
        parentProjectId: null,
        variationType: null,
        stages: buildStagesFromSelections(selections),
      });
      onClose();
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" style={{ maxWidth: step === 2 ? 640 : 520 }} onClick={e => e.stopPropagation()}>

        {/* Step indicator */}
        <div className="modal-header">
          <div>
            <h2 style={{ fontSize: 17, fontWeight: 700, margin: 0 }}>New Project</h2>
            <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
              {STEP_LABELS.map((label, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{
                    width: 22, height: 22, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 11, fontWeight: 700,
                    background: step > i + 1 ? 'var(--pass)' : step === i + 1 ? 'var(--primary)' : 'var(--border)',
                    color: step >= i + 1 ? '#fff' : 'var(--text-muted)',
                  }}>{step > i + 1 ? '✓' : i + 1}</div>
                  <span style={{ fontSize: 12, color: step === i + 1 ? 'var(--text)' : 'var(--text-muted)', fontWeight: step === i + 1 ? 600 : 400 }}>{label}</span>
                  {i < STEP_LABELS.length - 1 && <span style={{ color: 'var(--border)', fontSize: 12 }}>›</span>}
                </div>
              ))}
            </div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
        </div>

        {error && <div className="error-msg" style={{ marginBottom: 12 }}>{error}</div>}

        {/* Step 1: Project Details */}
        {step === 1 && (
          <>
            <div className="form-group">
              <label>Project Name <span style={{ color: 'var(--fail)' }}>*</span></label>
              <input type="text" placeholder="e.g. Lightbulb Camera v1" value={name} onChange={e => setName(e.target.value)} autoFocus />
            </div>
            <div className="form-group">
              <label>Product</label>
              <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                {['catalog', 'placeholder'].map(m => (
                  <button key={m} type="button"
                    className={`btn btn-sm ${productMode === m ? 'btn-primary' : 'btn-ghost'}`}
                    onClick={() => setProductMode(m)}>
                    {m === 'catalog' ? 'Link Catalog Product' : 'Placeholder / New Design'}
                  </button>
                ))}
              </div>
              {productMode === 'catalog' ? (
                <select value={catalogId} onChange={e => setCatalogId(e.target.value)}>
                  <option value="">— Select product —</option>
                  {catalog.map(p => (
                    <option key={p.id} value={p.id}>{p.name || p.modelNumber} ({p.manufacturer || p.category})</option>
                  ))}
                </select>
              ) : (
                <input type="text" placeholder="e.g. Bulb Camera — Custom Design" value={placeholderName} onChange={e => setPlaceholderName(e.target.value)} />
              )}
            </div>
            <div className="form-group">
              <label>Entity</label>
              <select value={entity} onChange={e => setEntity(e.target.value)}>
                <option value="">— Select entity —</option>
                {ENTITIES.map(en => <option key={en} value={en}>{en}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Goal / Description <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(optional)</span></label>
              <textarea rows={3} placeholder="What is this project trying to achieve?" value={description} onChange={e => setDescription(e.target.value)} style={{ resize: 'vertical' }} />
            </div>
          </>
        )}

        {/* Step 2: Checklist */}
        {step === 2 && (
          <div>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
              Check or uncheck items to include in this project. You can also add custom items to any stage.
            </p>
            {STAGES.map(stage => {
              const defaultLabels = DEFAULT_ITEMS[stage.id].map(i => i.label);
              const stageItems = selections[stage.id];
              return (
                <div key={stage.id} style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>{stage.label}</div>
                  {/* Default items */}
                  {DEFAULT_ITEMS[stage.id].map(item => {
                    const checked = stageItems.some(i => i.label === item.label);
                    return (
                      <label key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', cursor: 'pointer', borderBottom: '1px solid var(--border)' }}>
                        <input type="checkbox" checked={checked} onChange={() => toggleItem(stage.id, item)} style={{ width: 14, height: 14 }} />
                        <span style={{ fontSize: 13, textDecoration: checked ? 'none' : 'line-through', color: checked ? 'var(--text)' : 'var(--text-muted)' }}>{item.label}</span>
                        {item.assignedDomain && <span style={{ fontSize: 11, color: 'var(--text-dim)', marginLeft: 'auto' }}>+{item.assignedDomain}</span>}
                      </label>
                    );
                  })}
                  {/* Custom items added */}
                  {stageItems.filter(i => !defaultLabels.includes(i.label)).map(item => (
                    <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
                      <input type="checkbox" checked readOnly style={{ width: 14, height: 14 }} />
                      <span style={{ fontSize: 13, flex: 1 }}>{item.label}</span>
                      <button type="button" className="btn btn-ghost btn-sm" style={{ color: 'var(--fail)', padding: '0 4px', fontSize: 12 }} onClick={() => removeCustomItem(stage.id, item.label)}>✕</button>
                    </div>
                  ))}
                  {/* Add custom */}
                  <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                    <input
                      type="text"
                      placeholder="Add custom item…"
                      value={customLabels[stage.id]}
                      onChange={e => setCustomLabels(prev => ({ ...prev, [stage.id]: e.target.value }))}
                      onKeyDown={e => e.key === 'Enter' && addCustomItem(stage.id)}
                      style={{ flex: 1, fontSize: 12 }}
                    />
                    <button type="button" className="btn btn-ghost btn-sm" style={{ fontSize: 12 }} onClick={() => addCustomItem(stage.id)}>+ Add</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Step 3: Deadline */}
        {step === 3 && (
          <>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>
              Set a target completion date for the overall project. This is a goal, not a gate — individual items have no deadlines by design.
            </p>
            <div className="form-group">
              <label>Target Completion Date <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(optional)</span></label>
              <input type="date" value={deadline} onChange={e => setDeadline(e.target.value)} />
            </div>
            {deadline && (
              <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: -8, marginBottom: 12 }}>
                {Math.ceil((new Date(deadline) - new Date()) / (1000 * 60 * 60 * 24))} days from today
              </div>
            )}
          </>
        )}

        {/* Footer nav */}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between', marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
          <div>
            {step > 1 && <button className="btn btn-ghost" onClick={() => { setError(''); setStep(s => s - 1); }}>← Back</button>}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
            {step < 3
              ? <button className="btn btn-primary" onClick={goNext}>Next →</button>
              : <button className="btn btn-primary" onClick={handleCreate} disabled={busy}>{busy ? 'Creating…' : 'Create Project'}</button>
            }
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ProjectsPage({ onBack, currentUser, catalog = [] }) {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [openProject, setOpenProject] = useState(null);
  const [statusFilter, setStatusFilter] = useState('active');

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try { setProjects(await getProjects()); }
    catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }

  async function handleCreate(data) {
    const p = await createProject(data);
    setProjects(prev => [p, ...prev]);
  }

  async function handleUpdate(id, data) {
    const updated = await updateProject(id, data);
    setProjects(prev => prev.map(p => p.id === id ? updated : p));
    if (openProject?.id === id) setOpenProject(updated);
  }

  async function handleDelete(id) {
    if (!confirm('Delete this project? This cannot be undone.')) return;
    await deleteProject(id);
    setProjects(prev => prev.filter(p => p.id !== id));
    setOpenProject(null);
  }

  if (openProject) {
    return (
      <ProjectDetail
        project={openProject}
        currentUser={currentUser}
        onBack={() => setOpenProject(null)}
        onUpdate={(data) => handleUpdate(openProject.id, data)}
        onDelete={() => handleDelete(openProject.id)}
      />
    );
  }

  const filtered = statusFilter === 'all' ? projects : projects.filter(p => p.status === statusFilter);

  return (
    <div className="projects-page">
      <div className="projects-header">
        <div>
          <button className="btn btn-ghost btn-sm" onClick={onBack} style={{ marginBottom: 8 }}>← Back</button>
          <h1>Projects</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 4 }}>Launch readiness tracker for products in development.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowNew(true)}>+ New Project</button>
      </div>

      {error && <div className="error-msg" style={{ marginBottom: 16 }}>{error}</div>}

      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {['active', 'on-hold', 'completed', 'scrapped', 'all'].map(s => (
          <button key={s} className={`btn btn-sm ${statusFilter === s ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setStatusFilter(s)} style={{ textTransform: 'capitalize' }}>
            {s === 'all' ? 'All' : STATUS_CONFIG[s]?.label || s}
            {s !== 'all' && <span style={{ marginLeft: 6, opacity: 0.7 }}>({projects.filter(p => p.status === s).length})</span>}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ color: 'var(--text-muted)', padding: '24px 0' }}>Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="empty-state" style={{ padding: '60px 0' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
          <p>{statusFilter === 'all' ? 'No projects yet.' : `No ${STATUS_CONFIG[statusFilter]?.label?.toLowerCase()} projects.`}</p>
          {statusFilter === 'active' && <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={() => setShowNew(true)}>Create First Project</button>}
        </div>
      ) : (
        <div className="projects-grid">
          {filtered.map(p => (
            <ProjectCard key={p.id} project={p} onOpen={setOpenProject} />
          ))}
        </div>
      )}

      {showNew && <NewProjectModal catalog={catalog} onSave={handleCreate} onClose={() => setShowNew(false)} />}
    </div>
  );
}
