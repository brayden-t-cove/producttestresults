export const CSV_TEMPLATES = {
  e2e: {
    description: 'End-to-end test cases covering full product functionality',
    headers: ['title', 'description', 'expected', 'area', 'priority', 'notes'],
    exampleRows: [
      ['Live stream quality check', 'Navigate to camera live view in app', 'Live stream loads within 3 seconds with clear HD video', 'App', 'P1', ''],
      ['Motion detection trigger', 'Walk in front of camera motion zone', 'Motion event recorded and push notification received within 10 seconds', 'Connectivity', 'P1', ''],
      ['Hub offline recovery', 'Unplug hub ethernet cable for 60 seconds then reconnect', 'Hub reconnects automatically and all sensors report status within 30 seconds', 'Hardware', 'P2', ''],
    ],
  },
  reproduction: {
    description: 'Issue reproduction cases to confirm and document reported bugs',
    headers: ['title', 'description', 'severity', 'issueCategory', 'preconditions', 'reproSteps', 'expectedBehavior', 'actualBehavior', 'sourceTicket'],
    exampleRows: [
      ['Motion alert delayed by 30+ seconds', 'Push notifications for motion events arrive significantly late', 'High', 'Connectivity', 'Camera paired and online, push notifications enabled in app', '1. Arm camera motion detection\n2. Walk through motion zone\n3. Note time of motion\n4. Wait for push notification', 'Push notification received within 10 seconds of motion', 'Push notification received 30-90 seconds after motion event', 'BUG-1042'],
      ['Camera live view fails on iOS 17', 'Live stream shows black screen on iOS 17 devices', 'Critical', 'UI/UX', 'iOS 17 device, camera online and streaming', '1. Open app on iOS 17\n2. Tap camera tile\n3. Wait for live view to load', 'Live stream displays within 3 seconds', 'Black screen shown indefinitely with no error message', 'BUG-1098'],
    ],
  },
  regression: {
    description: 'Regression tests to verify previously fixed issues remain resolved',
    headers: ['title', 'description', 'fixedInFirmware', 'originalIssueId', 'reproSteps', 'expectedBehavior', 'regressionRisk'],
    exampleRows: [
      ['Hub fails to reconnect after power cycle', 'Hub did not auto-reconnect after power loss in firmware 3.2.0', '3.3.0', 'BUG-987', '1. Power off hub\n2. Wait 10 seconds\n3. Power on hub\n4. Wait 60 seconds', 'Hub reconnects and all sensors come online within 60 seconds', 'High'],
      ['False positive motion alerts at night', 'IR sensor triggered false positives in low light conditions', '3.3.1', 'BUG-1001', '1. Set camera to night mode\n2. Leave motion detection armed for 10 minutes with no movement', 'No motion alerts triggered without actual motion', 'Medium'],
    ],
  },
  feature: {
    description: 'Feature-targeted tests verifying specific acceptance criteria',
    headers: ['title', 'description', 'featureArea', 'acceptanceCriteria', 'expected', 'notes'],
    exampleRows: [
      ['Person detection accuracy', 'Verify AI person detection correctly identifies humans vs animals', 'Smart Detection', 'Person events logged when human enters frame; no false positives from animals or vehicles', 'Person detection event created within 5 seconds with thumbnail showing person', ''],
      ['Two-way audio quality', 'Test microphone and speaker quality during live session', 'Audio/Video', 'Audio is clear both directions with no echo or clipping at normal volume', 'Voice is intelligible both ways with latency under 500ms', ''],
      ['Geofence arm/disarm', 'Verify system arms when leaving home zone and disarms on return', 'Automation', 'System state changes within 60 seconds of crossing geofence boundary', 'Armed status shown in app when phone leaves home radius', ''],
    ],
  },
};
