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

function buildDefaultStages() {
  const stages = {};
  for (const stage of STAGES) {
    stages[stage.id] = {
      items: DEFAULT_ITEMS[stage.id].map(tpl => ({
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
  const [name, setName] = useState('');
  const [productMode, setProductMode] = useState('catalog'); // 'catalog' | 'placeholder'
  const [catalogId, setCatalogId] = useState('');
  const [placeholderName, setPlaceholderName] = useState('');
  const [entity, setEntity] = useState('');
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const ENTITIES = ['Cove', 'Luna', 'Alder', 'InstaVision'];

  const selectedProduct = catalog.find(p => p.id === catalogId);

  async function handleCreate() {
    setError('');
    if (!name.trim()) { setError('Project name is required.'); return; }
    if (productMode === 'catalog' && !catalogId) { setError('Select a product or use a placeholder.'); return; }
    if (productMode === 'placeholder' && !placeholderName.trim()) { setError('Enter a placeholder name.'); return; }
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
        parentProjectId: null,
        variationType: null,
        stages: buildDefaultStages(),
      });
      onClose();
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" style={{ maxWidth: 520 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 style={{ fontSize: 18, fontWeight: 700 }}>New Project</h2>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
        </div>
        {error && <div className="error-msg" style={{ margin: '0 0 12px' }}>{error}</div>}

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
                onClick={() => setProductMode(m)}
                style={{ textTransform: 'capitalize' }}>
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

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleCreate} disabled={busy}>{busy ? 'Creating…' : 'Create Project'}</button>
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
