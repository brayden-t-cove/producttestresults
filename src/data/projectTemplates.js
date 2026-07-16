export const STAGES = [
  { id: 'ideation',     label: 'Ideation',     description: 'Define what the product should be and identify candidates.' },
  { id: 'sample',       label: 'Sample',        description: 'Get a unit in hand and assess real-world potential.' },
  { id: 'integration',  label: 'Integration',   description: 'Move the product onto the platform and verify all functions.' },
  { id: 'formulation',  label: 'Formulation',   description: 'Documentation, packaging, and certification completion.' },
  { id: 'execution',    label: 'Execution',     description: 'Marketing, e-commerce, live sites, and launch readiness.' },
];

// assignedDomain: which role (beyond PM) needs to co-sign
// null = PM only
// subItems: default sub-checklist items

export const DEFAULT_ITEMS = {
  ideation: [
    {
      label: 'Market Research Complete',
      assignedDomain: null,
      subItems: ['Competitive landscape reviewed', 'Target use case defined', 'Price point benchmarked'],
    },
    {
      label: 'Product Requirements Defined',
      assignedDomain: 'editor',
      subItems: ['Core feature list agreed', 'Must-have specs documented', 'Deal-breaker criteria listed'],
    },
    {
      label: 'Vendor Shortlist Created',
      assignedDomain: null,
      subItems: ['Minimum 2 vendors identified', 'Initial outreach sent'],
    },
    {
      label: 'Feasibility Assessment Done',
      assignedDomain: 'editor',
      subItems: [],
    },
    {
      label: 'Budget & Timeline Approved',
      assignedDomain: null,
      subItems: [],
    },
  ],
  sample: [
    {
      label: 'Sample Unit Received',
      assignedDomain: null,
      subItems: ['Unit logged in catalog', 'Firmware version noted'],
    },
    {
      label: 'Initial Hardware Review',
      assignedDomain: 'tester',
      subItems: ['Build quality assessed', 'Physical dimensions verified', 'Port and button layout documented'],
    },
    {
      label: 'App & Software Review',
      assignedDomain: 'tester',
      subItems: ['App installation tested', 'Setup flow documented', 'Core functions verified in app'],
    },
    {
      label: 'Real-World Scenario Testing',
      assignedDomain: 'tester',
      subItems: ['Day performance', 'Night performance', 'Motion detection accuracy', 'Audio quality'],
    },
    {
      label: 'Sample Sign-Off',
      assignedDomain: 'editor',
      subItems: [],
    },
  ],
  integration: [
    {
      label: 'Platform Integration Started',
      assignedDomain: 'tester',
      subItems: ['Device added to catalog', 'QR / setup enrollment tested'],
    },
    {
      label: 'Core Video Functions Verified',
      assignedDomain: 'tester',
      subItems: ['Live view', 'Recorded playback', 'Resolution settings', 'Framerate confirmed'],
    },
    {
      label: 'Smart Detection Verified',
      assignedDomain: 'tester',
      subItems: ['Human detection', 'Vehicle detection', 'Motion regions', 'Push notifications'],
    },
    {
      label: 'Connectivity & Network Verified',
      assignedDomain: 'tester',
      subItems: ['Wi-Fi stability', 'Network reconfiguration', 'OTA firmware update'],
    },
    {
      label: 'Audio Verified',
      assignedDomain: 'tester',
      subItems: ['Two-way audio', 'Siren (if applicable)', 'Noise cancellation'],
    },
    {
      label: 'Storage Verified',
      assignedDomain: 'tester',
      subItems: ['Local storage', 'Cloud storage', 'Playback from storage'],
    },
    {
      label: 'Integration QA Pass',
      assignedDomain: 'editor',
      subItems: [],
    },
  ],
  formulation: [
    {
      label: 'Certifications Complete',
      assignedDomain: 'editor',
      subItems: ['FCC (USA)', 'IC (Canada)', 'CE (EU)', 'RoHS'],
    },
    {
      label: 'User Manual Drafted',
      assignedDomain: 'designer',
      subItems: ['Setup guide', 'Troubleshooting section', 'Regulatory markings page'],
    },
    {
      label: 'Packaging Design Complete',
      assignedDomain: 'designer',
      subItems: ['Box design approved', 'Insert / quick-start guide', 'Regulatory markings on packaging'],
    },
    {
      label: 'Regulatory Markings Verified',
      assignedDomain: 'editor',
      subItems: ['FCC ID on device', 'CE marking (if applicable)', 'Recycling symbols'],
    },
    {
      label: 'Formulation Sign-Off',
      assignedDomain: 'editor',
      subItems: [],
    },
  ],
  execution: [
    {
      label: 'Marketing Assets Created',
      assignedDomain: 'designer',
      subItems: ['Product photos', 'Lifestyle imagery', 'Feature callout graphics'],
    },
    {
      label: 'E-Commerce Listing Live',
      assignedDomain: null,
      subItems: ['Product title & description', 'Images uploaded', 'Price set', 'SKU linked'],
    },
    {
      label: 'Live Site Updated',
      assignedDomain: null,
      subItems: ['Product page published', 'Category page updated'],
    },
    {
      label: 'Ad Campaigns Created',
      assignedDomain: 'designer',
      subItems: ['Ad creative approved', 'Targeting configured', 'Budget allocated'],
    },
    {
      label: 'Launch Communication Sent',
      assignedDomain: null,
      subItems: ['Internal team notified', 'Customer-facing announcement'],
    },
    {
      label: 'Final Launch Sign-Off',
      assignedDomain: 'editor',
      subItems: [],
    },
  ],
};
