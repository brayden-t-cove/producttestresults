import { useState, useEffect, useRef } from 'react';
import { updateSession, listIssuesForProduct, patchIssue } from '../lib/api.js';
import { CAPABILITY_GROUPS } from '../data/capabilities.js';
import IssueLogger from './IssueLogger.jsx';
import IssueVerification from './IssueVerification.jsx';

const STATUS_ORDER = { fail: 0, 'reproduced': 0, 'regression-found': 0, pending: 1, pass: 2, skip: 3, na: 3, blocked: 0.5, 'cannot-reproduce': 2, 'fixed-verified': 2, 'needs-more-info': 1.5, 'cannot-test': 3 };

function badgeClass(status) {
  const map = {
    pass: 'badge-pass',
    fail: 'badge-fail',
    skip: 'badge-skip',
    blocked: 'badge-blocked',
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
    blocked: 'Blocked',
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

// Evidence fields component
function EvidenceFields({ test, onEvidenceChange }) {
  return (
    <div className="evidence-field">
      <div className="form-group" style={{ marginBottom: 10 }}>
        <label>Evidence URL</label>
        <input
          type="text"
          placeholder="https://... (screenshot, video link)"
          value={test.evidenceUrl || ''}
          onChange={e => onEvidenceChange({ evidenceUrl: e.target.value })}
        />
      </div>
      <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', textTransform: 'none', letterSpacing: 0, fontSize: 13, fontWeight: 400, color: 'var(--text)', marginBottom: 0 }}>
        <input
          type="checkbox"
          style={{ width: 'auto' }}
          checked={test.evidencePending || false}
          onChange={e => onEvidenceChange({ evidencePending: e.target.checked })}
        />
        Evidence obtained — will upload after testing
      </label>
    </div>
  );
}

// Extra tests section component
function ExtraTestsSection({ test, onExtraTestsChange }) {
  const extraTests = test.extraTests || [];
  const hasYes = extraTests.length > 0;
  const [showRows, setShowRows] = useState(hasYes);

  function handleYesNo(yes) {
    if (yes) {
      if (extraTests.length === 0) {
        onExtraTestsChange([{ description: '', result: null }]);
      }
      setShowRows(true);
    } else {
      setShowRows(false);
    }
  }

  function updateRow(index, updates) {
    const updated = extraTests.map((r, i) => i === index ? { ...r, ...updates } : r);
    onExtraTestsChange(updated);
  }

  function addRow() {
    onExtraTestsChange([...extraTests, { description: '', result: null }]);
  }

  function removeRow(index) {
    if (extraTests.length <= 1) return;
    onExtraTestsChange(extraTests.filter((_, i) => i !== index));
  }

  const isYes = showRows;

  return (
    <div className="extra-tests-section">
      <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16, marginTop: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: isYes ? 12 : 0 }}>
          <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Was there anything else tested not listed above?</span>
          <div className="extra-yes-no">
            <button
              className={isYes ? 'active' : ''}
              onClick={() => handleYesNo(true)}
            >
              Yes
            </button>
            <button
              className={!isYes ? 'active' : ''}
              onClick={() => handleYesNo(false)}
            >
              No
            </button>
          </div>
        </div>

        {isYes && (
          <div>
            {extraTests.map((row, i) => (
              <div key={i} className="extra-test-row">
                <input
                  type="text"
                  placeholder="Describe what was tested..."
                  value={row.description}
                  onChange={e => updateRow(i, { description: e.target.value })}
                />
                <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                  <button
                    className={`btn btn-sm btn-pass ${row.result === 'pass' ? 'active' : ''}`}
                    onClick={() => updateRow(i, { result: row.result === 'pass' ? null : 'pass' })}
                  >
                    Pass
                  </button>
                  <button
                    className={`btn btn-sm btn-fail ${row.result === 'fail' ? 'active' : ''}`}
                    onClick={() => updateRow(i, { result: row.result === 'fail' ? null : 'fail' })}
                  >
                    Fail
                  </button>
                </div>
                {extraTests.length > 1 && (
                  <button
                    onClick={() => removeRow(i)}
                    style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', fontSize: 16, padding: '0 4px', flexShrink: 0 }}
                    title="Remove"
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
            <button
              style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontSize: 13, padding: '4px 0', marginTop: 4 }}
              onClick={addRow}
            >
              + Add another
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function TestDetailHeader({ test, onDelete, onRenameTitle }) {
  const [title, setTitle] = useState(test.title || '');
  useEffect(() => { setTitle(test.title || ''); }, [test.id]);
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
        <TestNumberBadge testNumber={test.testNumber} />
        <input
          type="text"
          value={title}
          onChange={e => setTitle(e.target.value)}
          onBlur={e => {
            const v = e.target.value.trim();
            if (v && v !== test.title) onRenameTitle(v);
          }}
          style={{ flex: 1, fontWeight: 700, fontSize: 16, border: 'none', borderBottom: '1px solid transparent', background: 'transparent', padding: '0 0 2px', color: 'var(--text)', outline: 'none' }}
          onFocus={e => { e.target.style.borderBottomColor = 'var(--primary)'; }}
          onBlurCapture={e => { e.target.style.borderBottomColor = 'transparent'; }}
        />
        <button
          className="btn btn-ghost btn-sm"
          style={{ color: 'var(--fail)', flexShrink: 0 }}
          onClick={onDelete}
          title="Remove test case"
        >✕</button>
      </div>
      {test.regressionFlag && (
        <div style={{ marginTop: 6, padding: '6px 10px', background: 'rgba(234,88,12,0.12)', border: '1px solid rgba(234,88,12,0.4)', borderRadius: 6, fontSize: 12, color: '#ea580c', fontWeight: 600 }}>
          ⚠ Regression — this issue was previously marked Fixed
        </div>
      )}
      {test.linkedIssueTitle && (
        <div style={{ marginTop: 6, display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 8px', background: 'var(--fail-dim)', border: '1px solid var(--fail)', borderRadius: 12, fontSize: 12, color: 'var(--fail)' }}>
          🔗 Linked: {test.linkedIssueTitle}
        </div>
      )}
    </div>
  );
}

// Reproduction detail panel
function ReproductionDetail({ test, testNote, onNotesChange, onNotesBlur, onVerdict, onEvidenceChange, onExtraTestsChange, onDelete, onRenameTitle }) {
  return (
    <>
      <div className="test-detail-content">
        <TestDetailHeader test={test} onDelete={onDelete} onRenameTitle={onRenameTitle} />
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

        <div className="test-detail-section" style={{ marginTop: 0 }}>
          <label>Actual Behavior</label>
          <textarea
            value={testNote}
            onChange={e => onNotesChange(e.target.value)}
            onBlur={onNotesBlur}
            placeholder="Describe the actual behavior observed..."
            rows={4}
          />
        </div>

        <EvidenceFields test={test} onEvidenceChange={onEvidenceChange} />

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

        <ExtraTestsSection test={test} onExtraTestsChange={onExtraTestsChange} />
      </div>
    </>
  );
}

// Regression detail panel
function RegressionDetail({ test, testNote, onNotesChange, onNotesBlur, onVerdict, onEvidenceChange, onExtraTestsChange, onDelete, onRenameTitle }) {
  return (
    <>
      <div className="test-detail-content">
        <TestDetailHeader test={test} onDelete={onDelete} onRenameTitle={onRenameTitle} />
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

        <div className="test-detail-section" style={{ marginTop: 0 }}>
          <label>Notes</label>
          <textarea
            value={testNote}
            onChange={e => onNotesChange(e.target.value)}
            onBlur={onNotesBlur}
            placeholder="Add notes about this regression test..."
            rows={4}
          />
        </div>

        <EvidenceFields test={test} onEvidenceChange={onEvidenceChange} />

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

        <ExtraTestsSection test={test} onExtraTestsChange={onExtraTestsChange} />
      </div>
    </>
  );
}

// E2E / Feature detail panel
function StandardDetail({ test, testNote, onNotesChange, onNotesBlur, onVerdict, type, appConfigName, onEvidenceChange, onExtraTestsChange, onDelete, onRenameTitle }) {
  return (
    <>
      <div className="test-detail-content">
        {test.notAvailableInApp && (
          <div className="not-available-banner">
            ⚠️ Not available in {appConfigName || 'this app'} — mark as N/A or test anyway
          </div>
        )}
        <TestDetailHeader test={test} onDelete={onDelete} onRenameTitle={onRenameTitle} />
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

        <div className="test-detail-section" style={{ marginTop: 0 }}>
          <label>Notes</label>
          <textarea
            value={testNote}
            onChange={e => onNotesChange(e.target.value)}
            onBlur={onNotesBlur}
            placeholder="Add notes about this test result..."
            rows={4}
          />
        </div>

        <EvidenceFields test={test} onEvidenceChange={onEvidenceChange} />

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
          <button
            className={`btn btn-blocked ${test.status === 'blocked' ? 'active' : ''}`}
            onClick={() => onVerdict('blocked')}
          >
            ⊘ Blocked
          </button>
        </div>

        <ExtraTestsSection test={test} onExtraTestsChange={onExtraTestsChange} />
      </div>
    </>
  );
}

export default function TestRunner({ session, onUpdate, onEnd, onExit, allSessions }) {
  const sessionType = session.type || 'e2e';
  const isMultiProduct = !!(session.products && session.products.length > 1);
  const [activeProductIndex, setActiveProductIndex] = useState(0);
  const [showSkipProductModal, setShowSkipProductModal] = useState(false);

  const activeProduct = isMultiProduct ? (session.products[activeProductIndex] || session.products[0]) : null;
  const activeProductCatalogId = activeProduct?.catalogId || null;

  const visibleTests = isMultiProduct
    ? localTestCases.filter(t => t.productCatalogId === activeProductCatalogId)
    : localTestCases;
  const activeCategory = isMultiProduct ? (activeProduct?.category || session.category) : session.category;

  const [selectedTestId, setSelectedTestId] = useState(
    visibleTests.length > 0 ? visibleTests[0].id : (localTestCases[0]?.id || null)
  );
  const [notes, setNotes] = useState({});
  const [showIssueLogger, setShowIssueLogger] = useState(false);
  const [showVerification, setShowVerification] = useState(false);
  const [saving, setSaving] = useState(false);
  const [localTestCases, setLocalTestCases] = useState(session.testCases);
  const saveTimerRef = useRef(null);

  // Sync if session changes from outside (e.g. resume after refresh)
  useEffect(() => { setLocalTestCases(session.testCases); }, [session.id]);

  const [showSkipAllModal, setShowSkipAllModal] = useState(false);
  const [skipAllReason, setSkipAllReason] = useState('');
  const [skipSectionState, setSkipSectionState] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  // Fail → issue popup
  const [failPopup, setFailPopup] = useState(null); // { testId } when open
  const [failPopupMode, setFailPopupMode] = useState(null); // 'new' | 'existing' | null
  const [existingIssues, setExistingIssues] = useState([]);
  const [selectedExistingIssueKey, setSelectedExistingIssueKey] = useState('');
  const [loadingIssues, setLoadingIssues] = useState(false);

  const selectedTest = localTestCases.find(t => t.id === selectedTestId);

  const completed = localTestCases.filter(t => t.status !== 'pending').length;
  const naCount = localTestCases.filter(t => t.status === 'na').length;
  const total = localTestCases.length;
  const progress = total > 0 ? (completed / total) * 100 : 0;

  const pendingCount = visibleTests.filter(t => t.status === 'pending').length;
  const visibleCompleted = visibleTests.filter(t => t.status !== 'pending').length;
  const isLastProduct = !isMultiProduct || activeProductIndex >= session.products.length - 1;
  const currentProductDone = pendingCount === 0;

  function saveTestCases(newTestCases) {
    // Update UI immediately
    setLocalTestCases(newTestCases);
    // Debounce server write — batch rapid taps into one request
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      try {
        setSaving(true);
        const updated = await updateSession(session.id, { testCases: newTestCases });
        onUpdate(updated);
      } catch (e) {
        console.error('Save failed', e);
      } finally {
        setSaving(false);
      }
    }, 600);
  }

  async function saveTestUpdate(testId, updates) {
    const newTestCases = localTestCases.map(t =>
      t.id === testId ? { ...t, ...updates } : t
    );
    await saveTestCases(newTestCases);
  }

  async function handleDeleteTest(testId) {
    const remaining = localTestCases.filter(t => t.id !== testId);
    const nextTest = remaining.find(t => t.status === 'pending') || remaining[0] || null;
    setSelectedTestId(nextTest?.id || null);
    setConfirmDeleteId(null);
    await saveTestCases(remaining);
  }

  function advanceToNextTest() {
    const list = isMultiProduct ? visibleTests : localTestCases;
    const currentIndex = list.findIndex(t => t.id === selectedTestId);
    if (currentIndex >= 0 && currentIndex < list.length - 1) {
      setSelectedTestId(list[currentIndex + 1].id);
    }
  }

  function handleVerdict(status) {
    if (status === 'fail') {
      setFailPopup({ testId: selectedTestId });
      setFailPopupMode(null);
      setSelectedExistingIssueKey('');
      return;
    }
    const testNotes = notes[selectedTestId] ?? selectedTest?.notes ?? '';
    saveTestUpdate(selectedTestId, { status, notes: testNotes });
    advanceToNextTest();
  }

  function handleFailJustMark() {
    const testNotes = notes[failPopup.testId] ?? localTestCases.find(t => t.id === failPopup.testId)?.notes ?? '';
    saveTestUpdate(failPopup.testId, { status: 'fail', notes: testNotes });
    setFailPopup(null);
    advanceToNextTest();
  }

  async function handleFailChooseExisting() {
    setFailPopupMode('existing');
    setLoadingIssues(true);
    try {
      const catalogId = session.catalogId || session.products?.[0]?.catalogId;
      const issues = catalogId ? await listIssuesForProduct(catalogId) : [];
      setExistingIssues(issues.filter(i => i.derivedStatus !== 'Fixed' || true)); // show all including fixed (for regression)
    } catch {
      setExistingIssues([]);
    } finally {
      setLoadingIssues(false);
    }
  }

  async function handleLinkExistingIssue() {
    if (!selectedExistingIssueKey) return;
    const [sessionId, issueId] = selectedExistingIssueKey.split('::');
    const linked = existingIssues.find(i => i.sessionId === sessionId && i.id === issueId);
    if (!linked) return;

    const isRegression = linked.derivedStatus === 'Fixed';
    const newReproCount = (linked.reproCount || 0) + 1;

    // Patch the issue with incremented reproCount (and regressionFlag if fixed)
    await patchIssue(sessionId, issueId, {
      reproCount: newReproCount,
      ...(isRegression ? { regressionFlag: true } : {}),
    });

    const test = localTestCases.find(t => t.id === failPopup.testId);
    const testNotes = notes[failPopup.testId] ?? test?.notes ?? '';
    await saveTestUpdate(failPopup.testId, {
      status: 'fail',
      notes: testNotes,
      linkedIssueId: issueId,
      linkedIssueSessionId: sessionId,
      linkedIssueTitle: linked.title,
      regressionFlag: isRegression,
    });
    setFailPopup(null);
    advanceToNextTest();
  }

  function handleNotesBlur() {
    if (!selectedTest) return;
    const testNotes = notes[selectedTestId] ?? selectedTest.notes ?? '';
    if (testNotes !== selectedTest.notes) {
      saveTestUpdate(selectedTestId, { notes: testNotes });
    }
  }

  function handleEvidenceChange(testId, updates) {
    saveTestUpdate(testId, updates);
  }

  function handleExtraTestsChange(testId, extraTests) {
    saveTestUpdate(testId, { extraTests });
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
    const newTestCases = localTestCases.map(t => {
      if (t.status !== 'pending') return t;
      if (isMultiProduct && t.productCatalogId !== activeProductCatalogId) return t;
      return { ...t, status: 'skip', notes: reason || t.notes };
    });
    await saveTestCases(newTestCases);
    setShowSkipAllModal(false);
    setSkipAllReason('');
  }

  function handleNextProduct() {
    const nextIndex = activeProductIndex + 1;
    const nextProduct = session.products[nextIndex];
    const firstTest = localTestCases.find(t => t.productCatalogId === nextProduct?.catalogId);
    setActiveProductIndex(nextIndex);
    setSelectedTestId(firstTest?.id || null);
    setSkipSectionState(null);
  }

  async function handleSkipProduct() {
    const newTestCases = localTestCases.map(t =>
      t.productCatalogId === activeProductCatalogId && t.status === 'pending'
        ? { ...t, status: 'skip' }
        : t
    );
    await saveTestCases(newTestCases);
    setShowSkipProductModal(false);
    handleNextProduct();
  }

  async function handleConfirmSkipSection(sectionIndex, reason) {
    const sectionPrefix = String(sectionIndex) + '.';
    const newTestCases = localTestCases.map(t => {
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

  const sectionGroups = groupTestsBySection(visibleTests, activeCategory);

  return (
    <div className="test-runner">
      {/* Multi-product switcher */}
      {isMultiProduct && (
        <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--border)', overflowX: 'auto', background: 'var(--surface)', flexShrink: 0 }}>
          {session.products.map((prod, idx) => {
            const prodTests = localTestCases.filter(t => t.productCatalogId === prod.catalogId);
            const prodPass = prodTests.filter(t => t.status === 'pass').length;
            const prodFail = prodTests.filter(t => t.status === 'fail').length;
            const prodPending = prodTests.filter(t => t.status === 'pending').length;
            const prodDone = prodPending === 0;
            const isActive = idx === activeProductIndex;
            return (
              <button
                key={prod.catalogId}
                onClick={() => {
                  const firstTest = localTestCases.find(t => t.productCatalogId === prod.catalogId);
                  setActiveProductIndex(idx);
                  setSelectedTestId(firstTest?.id || null);
                  setSkipSectionState(null);
                }}
                style={{
                  padding: '10px 16px', border: 'none', borderBottom: isActive ? '2px solid var(--primary)' : '2px solid transparent',
                  background: isActive ? 'var(--bg)' : 'transparent', color: isActive ? 'var(--primary)' : 'var(--text-muted)',
                  cursor: 'pointer', fontWeight: isActive ? 700 : 400, fontSize: 13, whiteSpace: 'nowrap',
                  display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0,
                }}
              >
                <span>{prod.name}</span>
                <span style={{ fontSize: 11, display: 'flex', gap: 4 }}>
                  {prodDone
                    ? <span style={{ color: 'var(--pass)' }}>✓</span>
                    : prodPending > 0
                      ? <span style={{ color: 'var(--text-dim)' }}>{prodPending} left</span>
                      : null}
                  {prodFail > 0 && <span style={{ color: 'var(--fail)' }}>{prodFail}✗</span>}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Header */}
      <div className="test-runner-header">
        <h2>{isMultiProduct ? activeProduct?.name : session.productName}</h2>
        {!isMultiProduct && session.firmware && (
          <span style={{ fontSize: 12, color: 'var(--text-muted)', flexShrink: 0 }}>
            fw {session.firmware}
          </span>
        )}
        {isMultiProduct && activeProduct?.firmware && (
          <span style={{ fontSize: 12, color: 'var(--text-muted)', flexShrink: 0 }}>
            fw {activeProduct.firmware}
          </span>
        )}
        {session.appConfigName && !isMultiProduct && (
          <span style={{ fontSize: 12, color: 'var(--text-muted)', flexShrink: 0 }}>
            {session.appConfigName}
          </span>
        )}
        <div className="progress-bar-wrap">
          <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
        </div>
        <span className="progress-text">
          {isMultiProduct
            ? `${visibleCompleted}/${visibleTests.length} · overall ${completed}/${total}`
            : `${completed}/${total} done${naCount > 0 ? ` · ${naCount} N/A` : ''}`}
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
            {visibleTests.length === 0 && (
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
                onEvidenceChange={updates => handleEvidenceChange(selectedTestId, updates)}
                onExtraTestsChange={extraTests => handleExtraTestsChange(selectedTestId, extraTests)}
                onDelete={() => setConfirmDeleteId(selectedTestId)}
                onRenameTitle={title => saveTestUpdate(selectedTestId, { title })}
              />
            ) : sessionType === 'regression' ? (
              <RegressionDetail
                test={selectedTest}
                testNote={testNote}
                onNotesChange={val => setNotes(n => ({ ...n, [selectedTestId]: val }))}
                onNotesBlur={handleNotesBlur}
                onVerdict={handleVerdict}
                onEvidenceChange={updates => handleEvidenceChange(selectedTestId, updates)}
                onExtraTestsChange={extraTests => handleExtraTestsChange(selectedTestId, extraTests)}
                onDelete={() => setConfirmDeleteId(selectedTestId)}
                onRenameTitle={title => saveTestUpdate(selectedTestId, { title })}
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
                onEvidenceChange={updates => handleEvidenceChange(selectedTestId, updates)}
                onExtraTestsChange={extraTests => handleExtraTestsChange(selectedTestId, extraTests)}
                onDelete={() => setConfirmDeleteId(selectedTestId)}
                onRenameTitle={title => saveTestUpdate(selectedTestId, { title })}
              />
            )
          ) : (
            <div className="no-test-selected">
              <p>Select a {listItemLabel} from the left panel.</p>
            </div>
          )}
        </div>
      </div>

      {/* Delete test confirmation */}
      {/* Fail → issue popup */}
      {failPopup && (
        <div className="modal-overlay" onClick={() => setFailPopup(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 460 }}>
            <h3 style={{ marginBottom: 4 }}>Test Failed</h3>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>
              "{localTestCases.find(t => t.id === failPopup.testId)?.title}" — would you like to log or link an issue?
            </p>

            {failPopupMode === null && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <button className="btn btn-secondary" style={{ justifyContent: 'flex-start' }} onClick={() => { setFailPopup(null); setShowIssueLogger(true); const testNotes = notes[failPopup.testId] ?? localTestCases.find(t => t.id === failPopup.testId)?.notes ?? ''; saveTestUpdate(failPopup.testId, { status: 'fail', notes: testNotes }); advanceToNextTest(); }}>
                  🐛 Log as New Issue
                </button>
                <button className="btn btn-secondary" style={{ justifyContent: 'flex-start' }} onClick={handleFailChooseExisting}>
                  🔗 Link to Existing Issue
                </button>
                <button className="btn btn-ghost" style={{ justifyContent: 'flex-start' }} onClick={handleFailJustMark}>
                  ✗ Just Mark as Failed
                </button>
              </div>
            )}

            {failPopupMode === 'existing' && (
              <div>
                {loadingIssues ? (
                  <div style={{ fontSize: 13, color: 'var(--text-muted)', padding: '12px 0' }}>Loading issues...</div>
                ) : existingIssues.length === 0 ? (
                  <div style={{ fontSize: 13, color: 'var(--text-muted)', padding: '12px 0' }}>No issues found for this product.</div>
                ) : (
                  <div style={{ marginBottom: 16 }}>
                    <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 6 }}>Select Issue</label>
                    <select
                      value={selectedExistingIssueKey}
                      onChange={e => setSelectedExistingIssueKey(e.target.value)}
                      style={{ width: '100%' }}
                    >
                      <option value="">— Choose an issue —</option>
                      {existingIssues.map(i => (
                        <option key={`${i.sessionId}::${i.id}`} value={`${i.sessionId}::${i.id}`}>
                          [{i.severity}] {i.title}{i.derivedStatus === 'Fixed' ? ' ⚠ (marked Fixed — regression?)' : ''}{i.reproCount ? ` (×${i.reproCount} repros)` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                  <button className="btn btn-ghost" onClick={() => setFailPopupMode(null)}>← Back</button>
                  <button className="btn btn-primary" onClick={handleLinkExistingIssue} disabled={!selectedExistingIssueKey}>
                    Link &amp; Mark Failed
                  </button>
                </div>
              </div>
            )}

            {failPopupMode === null && (
              <div style={{ marginTop: 12, display: 'flex', justifyContent: 'flex-end' }}>
                <button className="btn btn-ghost btn-sm" onClick={() => setFailPopup(null)}>Cancel</button>
              </div>
            )}
          </div>
        </div>
      )}

      {confirmDeleteId && (
        <div className="modal-overlay" onClick={() => setConfirmDeleteId(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 400 }}>
            <h3 style={{ marginBottom: 8 }}>Remove Test Case?</h3>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>
              "{localTestCases.find(t => t.id === confirmDeleteId)?.title}" will be permanently removed from this session. This cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="btn btn-ghost" onClick={() => setConfirmDeleteId(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={() => handleDeleteTest(confirmDeleteId)}>Remove Test</button>
            </div>
          </div>
        </div>
      )}

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
        {isMultiProduct && !isLastProduct && (
          <button
            className="btn btn-secondary"
            onClick={() => setShowSkipProductModal(true)}
            disabled={currentProductDone}
            title="Skip all remaining tests for this product and move to the next"
          >
            ⏭ Skip Product
          </button>
        )}
        <div className="spacer" />
        <button className="btn btn-ghost" onClick={handleSaveAndExit}>
          Save &amp; Exit
        </button>
        {isMultiProduct && !isLastProduct && currentProductDone ? (
          <button className="btn btn-primary" onClick={handleNextProduct}>
            Next Product →
          </button>
        ) : (
          <button className="btn btn-primary" onClick={handleEndSession}>
            {isMultiProduct && isLastProduct ? 'Complete Session' : 'End Session →'}
          </button>
        )}
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

      {showSkipProductModal && (
        <div className="modal-overlay">
          <div className="modal skip-modal">
            <div className="modal-header">
              <h3>Skip Product</h3>
              <button className="modal-close" onClick={() => setShowSkipProductModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <p style={{ color: 'var(--text-muted)' }}>
                Mark all {pendingCount} remaining pending test{pendingCount !== 1 ? 's' : ''} for <strong>{activeProduct?.name}</strong> as skipped and move to the next product?
              </p>
              <p style={{ marginTop: 8, fontSize: 13, color: 'var(--text-muted)' }}>
                Skipped tests are excluded from pass rate calculations.
              </p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setShowSkipProductModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSkipProduct}>Skip &amp; Continue</button>
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
