// Vendor Evaluation test checklist — used for assessing third-party/sample products
// before adoption into production catalog. Category-agnostic.

export const VENDOR_EVAL_GROUPS = [
  {
    label: 'Packaging & Documentation',
    id: 've-packaging',
    tests: [
      { id: 've-pkg-01', title: 'Packaging condition on receipt', description: 'Inspect the outer and inner packaging for damage, moisture, or tampering. Note any defects.', expected: 'Packaging is intact with no signs of damage or tampering.' },
      { id: 've-pkg-02', title: 'Accessories completeness', description: 'Verify all listed accessories are present: cables, mounts, batteries, hardware, etc. Compare against spec sheet or box listing.', expected: 'All listed accessories are present and undamaged.' },
      { id: 've-pkg-03', title: 'Documentation completeness', description: 'Check for quick start guide, user manual, safety/regulatory documentation, and warranty information.', expected: 'Required documentation is present and legible.' },
      { id: 've-pkg-04', title: 'Regulatory markings', description: 'Verify presence of required regulatory markings on the device (FCC ID, CE, UL, etc.) as applicable.', expected: 'Appropriate regulatory markings are visible on the device or packaging.' },
    ],
  },
  {
    label: 'Physical & Build Quality',
    id: 've-physical',
    tests: [
      { id: 've-phy-01', title: 'Build quality assessment', description: 'Physically inspect the device for material quality, finish, seams, and overall construction. Note any defects, sharp edges, or poor fit.', expected: 'Device feels well-constructed with no obvious defects.' },
      { id: 've-phy-02', title: 'Button and control feel', description: 'Press all physical buttons, toggles, or controls. Assess tactile feedback and consistency.', expected: 'All controls operate smoothly with consistent tactile response.' },
      { id: 've-phy-03', title: 'Ports and connectors', description: 'Inspect all ports (USB, power, audio, etc.) for alignment and quality. Test with appropriate cables.', expected: 'All ports accept connectors securely without excessive play.' },
      { id: 've-phy-04', title: 'Mounting hardware', description: 'Evaluate the mounting solution — bracket, adhesive, screws. Test stability when mounted.', expected: 'Device mounts securely using provided hardware.' },
    ],
  },
  {
    label: 'Initial Setup & Onboarding',
    id: 've-setup',
    tests: [
      { id: 've-set-01', title: 'Initial power-on', description: 'Power on the device for the first time. Note boot time and any status indicators (LEDs, audio cues).', expected: 'Device powers on cleanly within a reasonable time with clear status indication.' },
      { id: 've-set-02', title: 'Vendor app / pairing flow', description: 'Install the vendor\'s app if required. Follow the onboarding flow to pair the device. Note any friction points or errors.', expected: 'Device pairs successfully with minimal friction. No critical errors during onboarding.' },
      { id: 've-set-03', title: 'Onboarding time', description: 'Time the process from opening the box to the device being fully operational. Note each step.', expected: 'Onboarding completes in an acceptable timeframe (target: under 10 minutes).' },
      { id: 've-set-04', title: 'Error recovery during setup', description: 'Simulate a setup error (wrong credentials, poor signal, etc.) and verify the recovery path is clear.', expected: 'App or device provides actionable error messages and recovery options.' },
      { id: 've-set-05', title: 'Factory reset procedure', description: 'Test the factory reset process using the documented method. Verify the device returns to factory state.', expected: 'Factory reset completes successfully and device behaves as new.' },
    ],
  },
  {
    label: 'Core Functionality',
    id: 've-core',
    tests: [
      { id: 've-cor-01', title: 'Primary function — basic operation', description: 'Test the device\'s primary advertised function (e.g. motion detection, door sensing, video streaming). Verify it works as described.', expected: 'Primary function performs consistently and matches advertised behavior.' },
      { id: 've-cor-02', title: 'Secondary features', description: 'Test secondary features listed in the spec sheet or app (alerts, scheduling, modes, etc.).', expected: 'Secondary features operate as described without critical failures.' },
      { id: 've-cor-03', title: 'Response latency', description: 'Measure the time from trigger/action to response (e.g. motion detected to notification received, command sent to device response).', expected: 'Response times are within acceptable range for the device category.' },
      { id: 've-cor-04', title: '30-minute burn-in', description: 'Leave the device running in its primary mode for 30 minutes. Monitor for crashes, restarts, or degradation.', expected: 'Device operates stably with no unexpected restarts or errors.' },
    ],
  },
  {
    label: 'Connectivity & Network',
    id: 've-connectivity',
    tests: [
      { id: 've-con-01', title: 'Connection stability', description: 'Monitor the device connection (WiFi, BLE, RF, etc.) over 15 minutes of normal operation. Check for drops or reconnections.', expected: 'Connection remains stable with no unexpected drops.' },
      { id: 've-con-02', title: 'Range test', description: 'Test device operation at the expected installation distance from the hub/router. Move to the boundary of the expected range.', expected: 'Device maintains stable operation at expected installation range.' },
      { id: 've-con-03', title: 'Reconnection after power loss', description: 'Disconnect device from power, wait 10 seconds, restore power. Verify device reconnects automatically.', expected: 'Device reconnects automatically within a reasonable time after power restoration.' },
      { id: 've-con-04', title: 'Protocol identification', description: 'Confirm the RF/wireless protocol(s) used (WiFi, Z-Wave, Zigbee, BLE, proprietary RF). Verify frequency and standard.', expected: 'Protocol is confirmed and matches spec sheet documentation.' },
    ],
  },
  {
    label: 'Platform Interoperability',
    id: 've-interop',
    tests: [
      { id: 've-int-01', title: 'Integration pathway assessment', description: 'Evaluate whether the device exposes an API, SDK, or standard protocol (Z-Wave, Zigbee, Matter) that could be used for platform integration.', expected: 'A viable integration pathway exists (API, SDK, or standard protocol).' },
      { id: 've-int-02', title: 'Third-party ecosystem compatibility', description: 'Test if the device works with any third-party ecosystems (Alexa, Google Home, HomeKit, SmartThings) relevant to our platforms.', expected: 'Device integrates with at least one relevant third-party ecosystem.' },
      { id: 've-int-03', title: 'Multi-hub / multi-instance support', description: 'Verify whether the device can be used with multiple hubs or accounts, or if it is locked to a single pairing.', expected: 'Device supports re-pairing or multi-instance use without factory reset requirement (or limitation is documented).' },
    ],
  },
  {
    label: 'Evaluation Summary',
    id: 've-summary',
    tests: [
      { id: 've-sum-01', title: 'Spec sheet accuracy', description: 'Compare actual device behavior and features against the vendor\'s spec sheet. Note any discrepancies.', expected: 'Device features match spec sheet claims with no major omissions.' },
      { id: 've-sum-02', title: 'Identified blockers', description: 'Document any features, behaviors, or missing capabilities that would block adoption into our platform.', expected: 'No critical blockers identified, or blockers are documented for vendor follow-up.' },
      { id: 've-sum-03', title: 'Adoption recommendation', description: 'Based on evaluation, provide a recommendation: Adopt, Decline, or Further Testing Required. Document rationale.', expected: 'Recommendation is clearly documented with supporting rationale from this evaluation.' },
    ],
  },
];

export function generateVendorEvalTestCases(product) {
  const tests = [];
  VENDOR_EVAL_GROUPS.forEach((group, gi) => {
    group.tests.forEach((t, ti) => {
      tests.push({
        ...t,
        id: crypto.randomUUID(),
        templateId: t.id,
        status: 'pending',
        notes: '',
        testNumber: `VE.${gi + 1}.${ti + 1}`,
        section: group.label,
      });
    });
  });
  return tests;
}

export const VENDOR_EVAL_SESSION_TYPES = [
  { id: 'e2e', label: 'Full Evaluation', icon: '🔍', description: 'Complete vendor evaluation from unboxing to interoperability' },
  { id: 'feature', label: 'Focused Evaluation', icon: '🎯', description: 'Evaluate a specific aspect — connectivity, integration, or function' },
  { id: 'reproduction', label: 'Issue Reproduction', icon: '🐛', description: 'Reproduce and document a reported problem with the sample' },
];
