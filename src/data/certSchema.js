export const CERT_SCHEMA = {
  'USA': ['FCC', 'UL', 'ETL', 'TSCA'],
  'Canada': ['IC', 'cUL', 'cETL'],
  'European Union': ['CE', 'REACH', 'RoHS', 'WEEE'],
  'United Kingdom': ['UKCA'],
  'Australia / New Zealand': ['RCM'],
  'Japan': ['PSE', 'TELEC'],
  'China': ['CCC', 'SRRC'],
  'South Korea': ['KC'],
  'Brazil': ['ANATEL', 'INMETRO'],
};

export const CERT_STATUS_LABELS = {
  'certified': 'Certified',
  'pending': 'Pending',
  'not-applicable': 'N/A',
  'not-tested': 'Not Tested',
};

export const CERT_STATUS_COLORS = {
  'certified': 'var(--pass)',
  'pending': '#f59e0b',
  'not-applicable': 'var(--text-muted)',
  'not-tested': 'var(--border)',
};
