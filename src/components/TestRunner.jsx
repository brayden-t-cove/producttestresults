import { useState } from 'react';
import { updateSession } from '../lib/api.js';
import IssueLogger from './IssueLogger.jsx';
import IssueVerification from './IssueVerification.jsx';

const STATUS_ORDER = { fail: 0, 'reproduced': 0, 'regression-found': 0, pending: 1, pass: 2, skip: 3, 'cannot-reproduce': 2, 'fixed-verified': 2, 'needs-more-info': 1.5, 'cannot-test': 3 };

function badgeClass(status) {
  const map = {
    pass: 'badge-pass',
    fail: 'badge-fail',
    skip: 'badge-skip',
    pending: 'badge-pending',
    reproduced: 'badge-reproduced',
    'cannot-reproduce': 'badge-cannot-reproduce',
    'needs-more-info': 'badge-needs-more-info',
    'regression-found': 'badge-regression-found',
    'fixed-verified': 'badge-fixed-verified',
    'cannot-test': 'badge-cannot-test',
  };
  return `badge ${map[status] || 'badge-pending'}`;
}

function statusLabel(status) {
  const map = {
    pass: 'Pass',
    fail: 'Fail',
    skip: 'Skip',
    pending: 'Pending',
    reproduced: 'Reproduced',
    'cannot-reproduce': 'Cannot Reproduce',
    'needs-more-info': 'Needs More Info',
    'regression-found': 'Regression Found',
    'fixed-verified': 'Fixed — Verified',
    'cannot-test': 'Cannot Test',
  };
  return map[status] || status;
}

function severityClass(sev) {
  if (!sev) return 'badge-low';
  return 'badge-' + sev.toLowerCase();
}

function RegressionRiskBadge({ risk }) {
  if (!risk) return null;
  const cls = `regression-risk-badge regression-risk-${risk.toLowerCase()}`;
  return <span className={cls}>{risk}</span>;
}

function PriorityBadge({ priority }) {
  if (!priority) return null;
  const cls = `priority-badge priority-${priority.toLowerCase()}`;
  return <span className={cls}>{priority}</span>;
}

function AreaBadge({ area }) {
  if (!area) return null;
  return <span className="area-badge">{area}</span>;
}

// Reproduction detail panel
function ReproductionDetail({ test, testNote, onNotesChange, onNotesBlur, onVerdict }) {
  return (
    <>
      <div className="test-detail-content">
        <div className="test-detail-title">{test.title}</div>
        <span className={badgeClass(test.status)} style={{ marginBottom: 20, display: 'inline-flex' }}>
          {statusLabel(test.status)}
        </span>

        {test.description && (
          <div className="test-detail-section">
            <label>Description</label>
            <p>{test.description}</p>
          </div>
        )}
        {test.preconditions && (
          <div className="test-detail-section">
            <label>Preconditions</label>
            <p>{test.preconditions}</p>
          </div>
        )}
        {test.reproSteps && (
          <div className="test-detail-section">
            <label>Repro Steps</label>
            <pre style={{ whiteSpace: 'pre-wrap', fontSize: 13, fontFamily: 'inherit' }}>{test.reproSteps}</pre>
          </div>
        )}
        {test.expectedBehavior && (
          <div className="test-detail-section">
            <label>Expected Behavior</label>
            <p>{test.expectedBehavior}</p>
          </div>
        )}
        {test.sourceTicket && (
          <div className="test-detail-section">
            <label>Source Ticket</label>
            <p>{test.sourceTicket}</p>
          </div>
        )}

        <div className="verdict-buttons">
          <button
            className={`btn btn-reproduced ${test.status === 'reproduced' ? 'active' : ''}`}
            onClick={() => onVerdict('reproduced')}
          >
            🐛 Reproduced
          </button>
          <button
            className={`btn btn-cannot-reproduce ${test.status === 'cannot-reproduce' ? 'active' : ''}`}
            onClick={() => onVerdict('cannot-reproduce')}
          >
            ✓ Cannot Reproduce
          </button>
          <button
            className={`btn btn-needs-more-info ${test.status === 'needs-more-info' ? 'active' : ''}`}
            onClick={() => onVerdict('needs-more-info')}
          >
            ? Needs More Info
          </button>
        </div>

        <div className="test-detail-section" style={{ marginTop: 24 }}>
          <label>Actual Behavior</label>
          <textarea
            value={testNote}
            onChange={e => onNotesChange(e.target.value)}
            onBlur={onNotesBlur}
            placeholder="Describe the actual behavior observed..."
            rows={4}
          />
        </div>
      </div>
    </>
  );
}

// Regression detail panel
function RegressionDetail({ test, testNote, onNotesChange, onNotesBlur, onVerdict }) {
  return (
    <>
      <div className="test-detail-content">
        <div className="test-detail-title">{test.title}</div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 16 }}>
          <span className={badgeClass(test.status)} style={{ display: 'inline-flex' }}>
            {statusLabel(test.status)}
          </span>
          <RegressionRiskBadge risk={test.regressionRisk} />
        </div>

        {test.description && (
          <div className="test-detail-section">
            <label>Description</label>
            <p>{test.description}</p>
          </div>
        )}
        {test.fixedInFirmware && (
          <div className="test-detail-section">
            <label>Fixed In Firmware</label>
            <p>{test.fixedInFirmware}</p>
          </div>
        )}
        {test.originalIssueId && (
          <div className="test-detail-section">
            <label>Original Issue ID</label>
            <p>{test.originalIssueId}</p>
          </div>
        )}
        {test.reproSteps && (
          <div className="test-detail-section">
            <label>Repro Steps</label>
            <pre style={{ whiteSpace: 'pre-wrap', fontSize: 13, fontFamily: 'inherit' }}>{test.reproSteps}</pre>
          </div>
        )}
        {test.expectedBehavior && (
          <div className="test-detail-section">
            <label>Expected Behavior</label>
            <p>{test.expectedBehavior}</p>
          </div>
        )}

        <div className="verdict-buttons">
          <button
            className={`btn btn-regression-found ${test.status === 'regression-found' ? 'active' : ''}`}
            onClick={() => onVerdict('regression-found')}
          >
            ✗ Regression Found
          </button>
          <button
            className={`btn btn-fixed-verified ${test.status === 'fixed-verified' ? 'active' : ''}`}
            onClick={() => onVerdict('fixed-verified')}
          >
            ✓ Fixed — Verified
          </button>
          <button
            className={`btn btn-cannot-test ${test.status === 'cannot-test' ? 'active' : ''}`}
            onClick={() => onVerdict('cannot-test')}
          >
            ⊘ Cannot Test
          </button>
        </div>

        <div className="test-detail-section" style={{ marginTop: 24 }}>
          <label>Notes</label>
          <textarea
            value={testNote}
            onChange={e => onNotesChange(e.target.value)}
            onBlur={onNotesBlur}
            placeholder="Add notes about this regression test..."
            rows={4}
          />
        </div>
      </div>
    </>
  );
}

// E2E / Feature detail panel
function StandardDetail({ test, testNote, onNotesChange, onNotesBlur, onVerdict, type }) {
  return (
    <>
      <div className="test-detail-content">
        <div className="test-detail-title">{test.title}</div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 16, flexWrap: 'wrap' }}>
          <span className={badgeClass(test.status)} style={{ display: 'inline-flex' }}>
            {statusLabel(test.status)}
          </span>
          {type === 'e2e' && <AreaBadge area={test.area} />}
          {type === 'e2e' && <PriorityBadge priority={test.priority} />}
        </div>

        {test.description && (
          <div className="test-detail-section">
            <label>Description</label>
            <p>{test.description}</p>
          </div>
        )}

        {type === 'feature' && test.featureArea && (
          <div className="test-detail-section">
            <label>Feature Area</label>
            <p>{test.featureArea}</p>
          </div>
        )}
        {type === 'feature' && test.acceptanceCriteria && (
          <div className="test-detail-section">
            <label>Acceptance Criteria</label>
            <p>{test.acceptanceCriteria}</p>
          </div>
        )}

        <div className="test-detail-section">
          <label>Expected Result</label>
          <p>{test.expected || test.defaultExpected || '—'}</p>
        </div>

        <div className="verdict-buttons">
          <button
            className={`btn btn-pass ${test.status === 'pass' ? 'active' : ''}`}
            onClick={() => onVerdict('pass')}
          >
            ✓ Pass
          </button>
          <button
            className={`btn btn-fail ${test.status === 'fail' ? 'active' : ''}`}
            onClick={() => onVerdict('fail')}
          >
            ✗ Fail
          </button>
          <button
            className={`btn btn-skip ${test.status === 'skip' ? 'active' : ''}`}
            onClick={() => onVerdict('skip')}
          >
            ⟳ Skip
          </button>
        </div>

        <div className="test-detail-section" style={{ marginTop: 24 }}>
          <label>Notes</label>
          <textarea
            value={testNote}
            onChange={e => onNotesChange(e.target.value)}
            onBlur={onNotesBlur}
            placeholder="Add notes about this test result..."
            rows={4}
          />
        </div>
      </div>
    </>
  );
}

export default function TestRunner({ session, onUpdate, onEnd, allSessions }) {
  const sessionType = session.type || 'e2e';
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

  const listItemLabel = sessionType === 'reproduction' ? 'issue' : 'test case';

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
                <div style={{ display: 'flex', gap: 4, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                  {sessionType === 'e2e' && t.area && <AreaBadge area={t.area} />}
                  {sessionType === 'e2e' && t.priority && <PriorityBadge priority={t.priority} />}
                  {sessionType === 'regression' && t.regressionRisk && <RegressionRiskBadge risk={t.regressionRisk} />}
                  <span className={badgeClass(t.status)}>{statusLabel(t.status)}</span>
                </div>
              </div>
            ))}
            {session.testCases.length === 0 && (
              <div style={{ padding: 16, color: 'var(--text-muted)', fontSize: 13 }}>
                No {listItemLabel}s loaded.
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
            sessionType === 'reproduction' ? (
              <ReproductionDetail
                test={selectedTest}
                testNote={testNote}
                onNotesChange={val => setNotes(n => ({ ...n, [selectedTestId]: val }))}
                onNotesBlur={handleNotesBlur}
                onVerdict={handleVerdict}
              />
            ) : sessionType === 'regression' ? (
              <RegressionDetail
                test={selectedTest}
                testNote={testNote}
                onNotesChange={val => setNotes(n => ({ ...n, [selectedTestId]: val }))}
                onNotesBlur={handleNotesBlur}
                onVerdict={handleVerdict}
              />
            ) : (
              <StandardDetail
                test={selectedTest}
                testNote={testNote}
                onNotesChange={val => setNotes(n => ({ ...n, [selectedTestId]: val }))}
                onNotesBlur={handleNotesBlur}
                onVerdict={handleVerdict}
                type={sessionType}
              />
            )
          ) : (
            <div className="no-test-selected">
              <p>Select a {listItemLabel} from the left panel.</p>
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
