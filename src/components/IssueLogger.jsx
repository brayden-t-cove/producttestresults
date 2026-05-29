import { useState } from 'react';
import { aiSuggestIssue, aiWriteRepro } from '../lib/api.js';

const SEVERITIES = ['Critical', 'High', 'Medium', 'Low'];
const CATEGORIES = [
  'Connectivity', 'UI/UX', 'Performance', 'Security', 'Crash/ANR',
  'False Positive', 'False Negative', 'Setup/Pairing', 'Firmware', 'Audio/Video', 'Hardware',
];

export default function IssueLogger({ session, onSave, onClose }) {
  const [description, setDescription] = useState('');
  const [title, setTitle] = useState('');
  const [severity, setSeverity] = useState('Medium');
  const [issueCategory, setIssueCategory] = useState('Connectivity');
  const [affectedTest, setAffectedTest] = useState('');
  const [reproSteps, setReproSteps] = useState('');
  const [preconditions, setPreconditions] = useState('');
  const [showRepro, setShowRepro] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [reproLoading, setReproLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleAiAssist() {
    if (!description.trim()) {
      setError('Enter a description first.');
      return;
    }
    setError('');
    setAiLoading(true);
    try {
      const result = await aiSuggestIssue({
        description,
        productName: session.productName,
        category: session.category,
      });
      if (result.severity) setSeverity(result.severity);
      if (result.issueCategory) setIssueCategory(result.issueCategory);
      if (result.title) setTitle(result.title);
    } catch (err) {
      setError(err.message || 'AI assist failed');
    } finally {
      setAiLoading(false);
    }
  }

  async function handleExpandRepro() {
    if (!description.trim()) {
      setError('Enter a description first.');
      return;
    }
    setError('');
    setReproLoading(true);
    try {
      const result = await aiWriteRepro({
        description,
        productName: session.productName,
        productCategory: session.category,
        firmwareVersion: session.firmware,
      });
      if (result.reproSteps) setReproSteps(result.reproSteps);
      if (result.preconditions) setPreconditions(result.preconditions);
      setShowRepro(true);
    } catch (err) {
      setError(err.message || 'AI repro failed');
    } finally {
      setReproLoading(false);
    }
  }

  function handleSave() {
    if (!title.trim()) {
      setError('Please enter a title.');
      return;
    }
    const issue = {
      id: crypto.randomUUID(),
      title,
      description,
      severity,
      issueCategory,
      affectedTest: affectedTest || null,
      reproSteps: showRepro ? reproSteps : '',
      preconditions: showRepro ? preconditions : '',
      createdAt: new Date().toISOString(),
    };
    onSave(issue);
  }

  const severityColor = {
    Critical: 'var(--critical)',
    High: 'var(--high)',
    Medium: 'var(--medium)',
    Low: 'var(--low)',
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h2>Log Issue</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          {error && <div className="error-msg">{error}</div>}

          <div className="form-group">
            <label>Describe the Issue</label>
            <div className="ai-assist-row">
              <textarea
                placeholder="Describe what happened in your own words..."
                value={description}
                onChange={e => setDescription(e.target.value)}
                rows={3}
              />
            </div>
            <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
              <button
                className="btn btn-secondary btn-sm"
                onClick={handleAiAssist}
                disabled={aiLoading}
              >
                {aiLoading ? <><span className="spinner" />Analyzing...</> : '✨ AI Assist'}
              </button>
              <button
                className="btn btn-secondary btn-sm"
                onClick={handleExpandRepro}
                disabled={reproLoading}
              >
                {reproLoading ? <><span className="spinner" />Writing...</> : '📋 Expand to Full Repro'}
              </button>
            </div>
          </div>

          {showRepro && (reproSteps || preconditions) && (
            <div className="form-group">
              <label>Reproduction Steps</label>
              {preconditions && (
                <div className="ai-result-box" style={{ marginBottom: 8 }}>
                  <div style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Preconditions</div>
                  <pre>{preconditions}</pre>
                </div>
              )}
              <div className="ai-result-box">
                <div style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Steps</div>
                <pre>{reproSteps}</pre>
              </div>
            </div>
          )}

          <div className="form-group">
            <label>Title</label>
            <input
              type="text"
              placeholder="Short issue title..."
              value={title}
              onChange={e => setTitle(e.target.value)}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-group">
              <label>Severity</label>
              <select value={severity} onChange={e => setSeverity(e.target.value)}>
                {SEVERITIES.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Category</label>
              <select value={issueCategory} onChange={e => setIssueCategory(e.target.value)}>
                {CATEGORIES.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label>Affected Test Case</label>
            <select value={affectedTest} onChange={e => setAffectedTest(e.target.value)}>
              <option value="">None / General</option>
              {session.testCases.map(t => (
                <option key={t.id} value={t.id}>{t.title}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave}>Save Issue</button>
        </div>
      </div>
    </div>
  );
}
