import { useState } from 'react';
import { updateSession } from '../lib/api.js';
import { CAPABILITY_GROUPS } from '../data/capabilities.js';
import IssueLogger from './IssueLogger.jsx';
import IssueVerification from './IssueVerification.jsx';

const STATUS_ORDER = { fail: 0, 'reproduced': 0, 'regression-found': 0, pending: 1, pass: 2, skip: 3, na: 3, 'cannot-reproduce': 2, 'fixed-verified': 2, 'needs-more-info': 1.5, 'cannot-test': 3 };

function badgeClass(status) {
  const map = {
    pass: 'badge-pass',
    fail: 'badge-fail',
    skip: 'badge-skip',
    pending: 'badge-pending',
    na: 'badge-na',
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
    na: 'N/A',
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

function TestNumberBadge({ testNumber }) {
  if (!testNumber) return null;
  return (
    <span style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--text-muted)', marginRight: 6 }}>
      [{testNumber}]
    </span>
  );
}

// Group tests by section using testNumber prefix
function groupTestsBySection(tests, category) {
  const groups = CAPABILITY_GROUPS[category] || [];
  const sectionMap = {};

  for (const test of tests) {
    const num = test.testNumber || '';
    const parts = num.split('.');
    const sectionNum = parseInt(parts[0], 10);

    let sectionLabel;
    if (isNaN(sectionNum) || sectionNum === 0) {
      sectionLabel = 'General';
    } else {
      const grp = groups[sectionNum - 1];
      sectionLabel = grp ? grp.label : `Section ${sectionNum}`;
    }

    const key = isNaN(sectionNum) ? 'general' : String(sectionNum);
    if (!sectionMap[key]) {
      sectionMap[key] = { sectionLabel, sectionIndex: isNaN(sectionNum) ? 0 : sectionNum, tests: [] };
    }
    sectionMap[key].tests.push(test);
  }

  return Object.values(sectionMap).sort((a, b) => a.sectionIndex - b.sectionIndex);
}

// Reproduction detail panel
function ReproductionDetail({ test, testNote, onNotesChange, onNotesBlur, onVerdict }) {
  return (
    <>
      <div className="test-detail-content">
        <div className="test-detail-title">
          <TestNumberBadge testNumber={test.testNumber} />
          {test.title}
        </div>
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
        <div className="test-detail-title">
          <TestNumberBadge testNumber={test.testNumber} />
          {test.title}
        </div>
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
function StandardDetail({ test, testNote, onNotesChange, onNotesBlur, onVerdict, type, appConfigName }) {
  return (
    <>
      <div className="test-detail-content">
        {test.notAvailableInApp && (
          <div className="not-available-banner">
            ⚠️ Not available in {appConfigName || 'this app'} — mark as N/A or test anyway
          </div>
        )}
        <div className="test-detail-title">
          <TestNumberBadge testNumber={test.testNumber} />
          {test.title}
        </div>
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
          <button
            className={`btn btn-na ${test.status === 'na' ? 'active' : ''}`}
            onClick={() => onVerdict('na')}
          >
            — N/A
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

export default function TestRunner({ session, onUpdate, onEnd, onExit, allSessions }) {
  const sessionType = session.type || 'e2e';
  const [selectedTestId, setSelectedTestId] = useState(
    session.testCases.length > 0 ? session.testCases[0].id : null
  );
  const [notes, setNotes] = useState({});
  const [showIssueLogger, setShowIssueLogger] = useState(false);
  const [showVerification, setShowVerification] = useState(false);
  const [saving, setSaving] = useState(false);

  // Skip remaining pending modal state
  const [showSkipAllModal, setShowSkipAllModal] = useState(false);
  const [skipAllReason, setSkipAllReason] = useState('');

  // Skip section inline state: { sectionIndex: number, reason: string } or null
  const [skipSectionState, setSkipSectionState] = useState(null);

  const selectedTest = session.testCases.find(t => t.id === selectedTestId);

  const completed = session.testCases.filter(t => t.status !== 'pending').length;
  const naCount = session.testCases.filter(t => t.status === 'na').length;
  const total = session.testCases.length;
  const progress = total > 0 ? (completed / total) * 100 : 0;

  const pendingCount = session.testCases.filter(t => t.status === 'pending').length;

  async function saveTestCases(newTestCases) {
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

  async function saveTestUpdate(testId, updates) {
    const newTestCases = session.testCases.map(t =>
      t.id === testId ? { ...t, ...updates } : t
    );
    await saveTestCases(newTestCases);
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

  async function handleSaveAndExit() {
    // Auto-save is already active; just navigate away without completing
    try {
      const updated = await updateSession(session.id, { status: 'active' });
      onUpdate(updated);
    } catch (e) {
      console.error(e);
    }
    onExit();
  }

  async function handleConfirmSkipAll() {
    const reason = skipAllReason.trim();
    const newTestCases = session.testCases.map(t =>
      t.status === 'pending' ? { ...t, status: 'skip', notes: reason || t.notes } : t
    );
    await saveTestCases(newTestCases);
    setShowSkipAllModal(false);
    setSkipAllReason('');
  }

  async function handleConfirmSkipSection(sectionIndex, reason) {
    const sectionPrefix = String(sectionIndex) + '.';
    const newTestCases = session.testCases.map(t => {
      const num = t.testNumber || '';
      const inSection = sectionIndex === 0
        ? num.startsWith('0.')
        : num.startsWith(sectionPrefix);
      if (inSection && t.status === 'pending') {
        return { ...t, status: 'skip', notes: reason || t.notes };
      }
      return t;
    });
    await saveTestCases(newTestCases);
    setSkipSectionState(null);
  }

  const testNote = notes[selectedTestId] !== undefined
    ? notes[selectedTestId]
    : (selectedTest?.notes || '');

  const listItemLabel = sessionType === 'reproduction' ? 'issue' : 'test case';

  const sectionGroups = groupTestsBySection(session.testCases, session.category);

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
        {session.appConfigName && (
          <span style={{ fontSize: 12, color: 'var(--text-muted)', flexShrink: 0 }}>
            {session.appConfigName}
          </span>
        )}
        <div className="progress-bar-wrap">
          <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
        </div>
        <span className="progress-text">
          {completed}/{total} done{naCount > 0 ? ` · ${naCount} N/A` : ''}
        </span>
        {saving && <span className="spinner" style={{ flexShrink: 0 }} />}
      </div>

      <div className="test-runner-body">
        {/* Sidebar */}
        <div className="test-sidebar">
          <div className="test-list">
            {sectionGroups.map(group => (
              <div key={group.sectionIndex} className="section-group">
                <div className="section-group-header">
                  <span className="section-group-label">
                    {group.sectionIndex} · {group.sectionLabel}
                  </span>
                  <button
                    className="btn btn-ghost btn-sm section-skip-btn"
                    onClick={() => setSkipSectionState(
                      skipSectionState?.sectionIndex === group.sectionIndex
                        ? null
                        : { sectionIndex: group.sectionIndex, reason: '' }
                    )}
                  >
                    Skip Section
                  </button>
                </div>
                {skipSectionState?.sectionIndex === group.sectionIndex && (
                  <div className="section-skip-inline">
                    <input
                      type="text"
                      placeholder="Reason (optional)"
                      value={skipSectionState.reason}
                      onChange={e => setSkipSectionState(s => ({ ...s, reason: e.target.value }))}
                      onKeyDown={e => {
                        if (e.key === 'Enter') handleConfirmSkipSection(group.sectionIndex, skipSectionState.reason);
                        if (e.key === 'Escape') setSkipSectionState(null);
                      }}
                    />
                    <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={() => handleConfirmSkipSection(group.sectionIndex, skipSectionState.reason)}
                      >
                        Skip
                      </button>
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => setSkipSectionState(null)}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
                {group.tests.map(t => (
                  <div
                    key={t.id}
                    className={`test-list-item ${t.id === selectedTestId ? 'selected' : ''}`}
                    onClick={() => setSelectedTestId(t.id)}
                  >
                    <span className="test-title">
                      <TestNumberBadge testNumber={t.testNumber} />
                      {t.title}
                    </span>
                    <div style={{ display: 'flex', gap: 4, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                      {sessionType === 'e2e' && t.area && <AreaBadge area={t.area} />}
                      {sessionType === 'e2e' && t.priority && <PriorityBadge priority={t.priority} />}
                      {sessionType === 'regression' && t.regressionRisk && <RegressionRiskBadge risk={t.regressionRisk} />}
                      {t.status === 'na' || (t.notAvailableInApp && t.status === 'pending')
                        ? <span className="badge badge-na">N/A</span>
                        : <span className={badgeClass(t.status)}>{statusLabel(t.status)}</span>
                      }
                    </div>
                  </div>
                ))}
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
                appConfigName={session.appConfigName}
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
      <div className="test-action-bar action-bar">
        <button className="btn btn-secondary" onClick={() => setShowIssueLogger(true)}>
          🐛 Log Issue
        </button>
        <button className="btn btn-secondary" onClick={() => setShowVerification(true)}>
          ✓ Verify Known Issue
        </button>
        <button
          className="btn btn-secondary"
          onClick={() => { setShowSkipAllModal(true); setSkipAllReason(''); }}
          disabled={pendingCount === 0}
        >
          ⏭ Skip Remaining
        </button>
        <div className="spacer" />
        <button className="btn btn-ghost" onClick={handleSaveAndExit}>
          Save &amp; Exit
        </button>
        <button className="btn btn-primary" onClick={handleEndSession}>
          End Session →
        </button>
      </div>

      {/* Skip All Pending Modal */}
      {showSkipAllModal && (
        <div className="modal-overlay">
          <div className="modal skip-modal">
            <div className="modal-header">
              <h3>Skip Remaining Pending Tests</h3>
              <button className="modal-close" onClick={() => setShowSkipAllModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <p style={{ marginBottom: 16, color: 'var(--text-muted)' }}>
                {pendingCount} test{pendingCount !== 1 ? 's are' : ' is'} still pending.
              </p>
              <div className="form-group">
                <label>Reason for skipping (applied to all):</label>
                <textarea
                  rows={3}
                  placeholder="e.g. Not applicable to this firmware version"
                  value={skipAllReason}
                  onChange={e => setSkipAllReason(e.target.value)}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setShowSkipAllModal(false)}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={handleConfirmSkipAll}>
                Skip All Pending
              </button>
            </div>
          </div>
        </div>
      )}

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
