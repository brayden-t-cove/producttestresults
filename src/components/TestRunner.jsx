import { useState } from 'react';
import { updateSession } from '../lib/api.js';
import IssueLogger from './IssueLogger.jsx';
import IssueVerification from './IssueVerification.jsx';

const STATUS_ORDER = { fail: 0, pending: 1, pass: 2, skip: 3 };

function badgeClass(status) {
  return `badge badge-${status}`;
}

function severityClass(sev) {
  if (!sev) return 'badge-low';
  return 'badge-' + sev.toLowerCase();
}

export default function TestRunner({ session, onUpdate, onEnd, allSessions }) {
  const [selectedTestId, setSelectedTestId] = useState(
    session.testCases.length > 0 ? session.testCases[0].id : null
  );
  const [notes, setNotes] = useState({});
  const [showIssueLogger, setShowIssueLogger] = useState(false);
  const [showVerification, setShowVerification] = useState(false);
  const [saving, setSaving] = useState(false);

  const selectedTest = session.testCases.find(t => t.id === selectedTestId);

  const completed = session.testCases.filter(t => t.status !== 'pending').length;
  const total = session.testCases.length;
  const progress = total > 0 ? (completed / total) * 100 : 0;

  async function saveTestUpdate(testId, updates) {
    const newTestCases = session.testCases.map(t =>
      t.id === testId ? { ...t, ...updates } : t
    );
    try {
      setSaving(true);
      const updated = await updateSession(session.id, { testCases: newTestCases });
      onUpdate(updated);
    } catch (e) {
      console.error('Save failed', e);
    } finally {
      setSaving(false);
    }
  }

  function handleVerdict(status) {
    const testNotes = notes[selectedTestId] ?? selectedTest?.notes ?? '';
    saveTestUpdate(selectedTestId, { status, notes: testNotes });
  }

  function handleNotesBlur() {
    if (!selectedTest) return;
    const testNotes = notes[selectedTestId] ?? selectedTest.notes ?? '';
    if (testNotes !== selectedTest.notes) {
      saveTestUpdate(selectedTestId, { notes: testNotes });
    }
  }

  async function handleSaveIssue(issue) {
    const newIssues = [...(session.issues || []), issue];
    try {
      const updated = await updateSession(session.id, { issues: newIssues });
      onUpdate(updated);
    } catch (e) {
      console.error(e);
    }
    setShowIssueLogger(false);
  }

  async function handleSaveVerifications(verifications) {
    const newVerifications = [...(session.verifications || []), ...verifications];
    try {
      const updated = await updateSession(session.id, { verifications: newVerifications });
      onUpdate(updated);
    } catch (e) {
      console.error(e);
    }
    setShowVerification(false);
  }

  async function handleEndSession() {
    try {
      const updated = await updateSession(session.id, {
        status: 'completed',
        completedAt: new Date().toISOString(),
      });
      onEnd(updated);
    } catch (e) {
      console.error(e);
    }
  }

  const testNote = notes[selectedTestId] !== undefined
    ? notes[selectedTestId]
    : (selectedTest?.notes || '');

  return (
    <div className="test-runner">
      {/* Header */}
      <div className="test-runner-header">
        <h2>{session.productName}</h2>
        {session.firmware && (
          <span style={{ fontSize: 12, color: 'var(--text-muted)', flexShrink: 0 }}>
            fw {session.firmware}
          </span>
        )}
        <div className="progress-bar-wrap">
          <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
        </div>
        <span className="progress-text">{completed}/{total} done</span>
        {saving && <span className="spinner" style={{ flexShrink: 0 }} />}
      </div>

      <div className="test-runner-body">
        {/* Sidebar */}
        <div className="test-sidebar">
          <div className="test-list">
            {session.testCases.map(t => (
              <div
                key={t.id}
                className={`test-list-item ${t.id === selectedTestId ? 'selected' : ''}`}
                onClick={() => setSelectedTestId(t.id)}
              >
                <span className="test-title">{t.title}</span>
                <span className={badgeClass(t.status)}>{t.status}</span>
              </div>
            ))}
            {session.testCases.length === 0 && (
              <div style={{ padding: 16, color: 'var(--text-muted)', fontSize: 13 }}>
                No test cases loaded.
              </div>
            )}
          </div>

          {session.issues && session.issues.length > 0 && (
            <div className="issues-panel">
              <h4>Issues ({session.issues.length})</h4>
              {session.issues.map(issue => (
                <div key={issue.id} className="issue-chip">
                  <div className="issue-chip-title">
                    <span className={`badge ${severityClass(issue.severity)}`}>{issue.severity}</span>
                    {issue.title}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{issue.issueCategory}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Detail Panel */}
        <div className="test-detail">
          {selectedTest ? (
            <>
              <div className="test-detail-content">
                <div className="test-detail-title">{selectedTest.title}</div>
                <span className={badgeClass(selectedTest.status)} style={{ marginBottom: 20, display: 'inline-flex' }}>
                  {selectedTest.status}
                </span>

                <div className="test-detail-section">
                  <label>Description</label>
                  <p>{selectedTest.description}</p>
                </div>

                <div className="test-detail-section">
                  <label>Expected Result</label>
                  <p>{selectedTest.expected || selectedTest.defaultExpected || '—'}</p>
                </div>

                <div className="verdict-buttons">
                  <button
                    className={`btn btn-pass ${selectedTest.status === 'pass' ? 'active' : ''}`}
                    onClick={() => handleVerdict('pass')}
                  >
                    ✓ Pass
                  </button>
                  <button
                    className={`btn btn-fail ${selectedTest.status === 'fail' ? 'active' : ''}`}
                    onClick={() => handleVerdict('fail')}
                  >
                    ✗ Fail
                  </button>
                  <button
                    className={`btn btn-skip ${selectedTest.status === 'skip' ? 'active' : ''}`}
                    onClick={() => handleVerdict('skip')}
                  >
                    ⟳ Skip
                  </button>
                </div>

                <div className="test-detail-section" style={{ marginTop: 24 }}>
                  <label>Notes</label>
                  <textarea
                    value={testNote}
                    onChange={e => setNotes(n => ({ ...n, [selectedTestId]: e.target.value }))}
                    onBlur={handleNotesBlur}
                    placeholder="Add notes about this test result..."
                    rows={4}
                  />
                </div>
              </div>
            </>
          ) : (
            <div className="no-test-selected">
              <p>Select a test case from the left panel.</p>
            </div>
          )}
        </div>
      </div>

      {/* Action Bar */}
      <div className="test-action-bar">
        <button className="btn btn-secondary" onClick={() => setShowIssueLogger(true)}>
          🐛 Log Issue
        </button>
        <button className="btn btn-secondary" onClick={() => setShowVerification(true)}>
          ✓ Verify Known Issue
        </button>
        <div className="spacer" />
        <button className="btn btn-primary" onClick={handleEndSession}>
          End Session →
        </button>
      </div>

      {showIssueLogger && (
        <IssueLogger
          session={session}
          onSave={handleSaveIssue}
          onClose={() => setShowIssueLogger(false)}
        />
      )}

      {showVerification && (
        <IssueVerification
          session={session}
          onSave={handleSaveVerifications}
          onClose={() => setShowVerification(false)}
        />
      )}
    </div>
  );
}
