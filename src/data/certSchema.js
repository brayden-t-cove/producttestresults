// Default cert schema — used to seed the DB on first run and as templates
// when adding countries via the CertEditor quick-add dropdown.

export const CERT_SCHEMA = {
  'USA': [
    { name: 'FCC', subcerts: ['FCC Part 15B (Unintentional Radiator)', 'FCC Part 15C (Intentional Radiator)', 'FCC ID'] },
    { name: 'UL', subcerts: ['UL 2849 (IoT / Smart Camera)', 'UL 60950-1', 'UL 62368-1'] },
    { name: 'ETL', subcerts: [] },
    { name: 'RoHS (US)', subcerts: [] },
    { name: 'TSCA', subcerts: [] },
  ],
  'Canada': [
    { name: 'IC (ISED)', subcerts: ['IC RSS-247 (Wi-Fi / BT)', 'IC RSS-102 (RF Exposure)', 'IC ID'] },
    { name: 'cUL', subcerts: [] },
    { name: 'cETL', subcerts: [] },
  ],
  'European Union': [
    { name: 'CE', subcerts: ['CE EMC (EN 55032 / EN 55035)', 'CE Radio (RED — 2014/53/EU)', 'CE Safety (EN 62368-1)', 'CE LVD (EN 60950-1)'] },
    { name: 'RoHS 3 (EU)', subcerts: [] },
    { name: 'REACH', subcerts: [] },
    { name: 'WEEE', subcerts: [] },
    { name: 'GDPR / Privacy', subcerts: [] },
  ],
  'United Kingdom': [
    { name: 'UKCA', subcerts: ['UKCA EMC (EN 55032)', 'UKCA Radio (UK RE Regulations)', 'UKCA Safety (EN 62368-1)'] },
    { name: 'UK RoHS', subcerts: [] },
  ],
  'Australia / New Zealand': [
    { name: 'RCM', subcerts: ['RCM EMC (AS/NZS CISPR 32)', 'RCM Electrical Safety', 'RCM Radio (AS/NZS 4268)'] },
  ],
  'Japan': [
    { name: 'PSE', subcerts: ['PSE Electrical Appliance Safety'] },
    { name: 'TELEC (MIC)', subcerts: ['TELEC 2.4GHz', 'TELEC 5GHz'] },
    { name: 'VCCI', subcerts: [] },
  ],
  'China': [
    { name: 'CCC (3C)', subcerts: [] },
    { name: 'SRRC', subcerts: ['SRRC 2.4GHz', 'SRRC 5GHz', 'SRRC Cellular'] },
    { name: 'China RoHS', subcerts: [] },
    { name: 'MIIT Network Access', subcerts: [] },
  ],
  'South Korea': [
    { name: 'KC', subcerts: ['KC EMC', 'KC Safety', 'KC Radio (RRA)'] },
  ],
  'Brazil': [
    { name: 'ANATEL', subcerts: ['ANATEL Homologação'] },
    { name: 'INMETRO', subcerts: [] },
  ],
  'India': [
    { name: 'BIS', subcerts: ['BIS CRS (Compulsory Registration Scheme)'] },
    { name: 'WPC', subcerts: ['WPC 2.4GHz', 'WPC 5GHz'] },
  ],
  'Taiwan': [
    { name: 'BSMI', subcerts: ['BSMI EMC', 'BSMI Safety'] },
    { name: 'NCC', subcerts: ['NCC 2.4GHz', 'NCC 5GHz'] },
  ],
  'Mexico': [
    { name: 'IFETEL (IFT)', subcerts: ['IFETEL Homologation'] },
    { name: 'NOM', subcerts: ['NOM-019-SCFI (Safety)', 'NOM-208-SCFI (EMC)'] },
  ],
  'Singapore': [
    { name: 'IMDA', subcerts: ['IMDA TS SRD (Short Range Device)'] },
    { name: 'SPRING Safety Mark', subcerts: [] },
  ],
  'Thailand': [
    { name: 'NBTC', subcerts: ['NBTC Type Approval'] },
    { name: 'TISI', subcerts: [] },
  ],
  'Indonesia': [
    { name: 'SDPPI (Kominfo)', subcerts: ['SDPPI Type Approval'] },
    { name: 'SNI', subcerts: [] },
  ],
  'Vietnam': [
    { name: 'MIC (VNPT)', subcerts: ['MIC Type Approval'] },
  ],
  'Saudi Arabia': [
    { name: 'CITC', subcerts: ['CITC Type Approval'] },
    { name: 'SASO', subcerts: ['SASO IEC 62368-1', 'SASO EMC'] },
  ],
  'UAE': [
    { name: 'TRA', subcerts: ['TRA Type Approval'] },
    { name: 'ESMA', subcerts: [] },
  ],
  'Israel': [
    { name: 'SII', subcerts: ['SII EMC', 'SII Safety'] },
    { name: 'MOC (Radio)', subcerts: [] },
  ],
  'Russia / EAC': [
    { name: 'EAC', subcerts: ['EAC TR CU 020/2011 (EMC)', 'EAC TR CU 004/2011 (Safety)'] },
  ],
  'Malaysia': [
    { name: 'SIRIM / MCMC', subcerts: ['MCMC Type Approval'] },
  ],
  'Philippines': [
    { name: 'NTC', subcerts: ['NTC Type Approval'] },
  ],
  'South Africa': [
    { name: 'ICASA', subcerts: ['ICASA Type Approval'] },
    { name: 'SABS', subcerts: [] },
  ],
};

// Ordered list of countries for the quick-add dropdown in CertEditor
export const COMMON_COUNTRIES = Object.keys(CERT_SCHEMA);

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
