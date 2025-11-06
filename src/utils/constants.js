// Application Constants for LOTO KMS

// Import version and name from package.json for auto-sync
import packageJson from '../../package.json';

// Zones
export const ZONES = [
  'Zone A',
  'Zone B',
  'Zone C',
  'Zone D',
  'General'
];

// Subzones by Zone
export const SUBZONES = {
  'Zone A': ['Subzone A1', 'Subzone A2', 'Subzone A3'],
  'Zone B': ['Subzone B1', 'Subzone B2', 'Subzone B3'],
  'Zone C': ['Subzone C1', 'Subzone C2', 'Subzone C3'],
  'Zone D': ['Subzone D1', 'Subzone D2', 'Subzone D3'],
  'General': []
};

// Locations
export const LOCATIONS = [
  'Local Technique',
  'Main Building',
  'Warehouse',
  'Outdoor',
  'Control Room',
  'Substation'
];

// Breaker States
export const BREAKER_STATES = [
  { value: 'On', label: '🟢 On', color: 'green' },
  { value: 'Off', label: '⚪ Off', color: 'gray' },
  { value: 'Closed', label: '🔴 Closed', color: 'red' }
];

// Companies
export const COMPANIES = [
  'Company A',
  'Company B',
  'Company C',
  'Contractor',
  'Internal',
  'External'
];

// Habilitation Types (Electrical Qualifications)
export const HABILITATION_TYPES = [
  'H0',    // Non-electrician working in electrical environment
  'H0V',   // Non-electrician working near live parts
  'H1',    // Electrician working on low voltage
  'H1V',   // Electrician working near low voltage live parts
  'H2',    // Electrician working on high voltage
  'H2V',   // Electrician working near high voltage live parts
  'B1',    // Low voltage operations (under 1000V)
  'B1V',   // Low voltage operations near live parts
  'B2',    // Low voltage work manager
  'B2V',   // Low voltage work manager near live parts
  'BR',    // Low voltage restricted operations
  'BC',    // Low voltage chief operations
  'HC',    // High voltage chief operations
  'BE',    // Low voltage testing operations
  'HE',    // High voltage testing operations
];

// Job Titles
export const JOB_TITLES = [
  'Electrician',
  'Maintenance Technician',
  'Engineer',
  'Supervisor',
  'Manager',
  'Contractor',
  'Intern'
];

// Lock Colors
export const LOCK_COLORS = [
  'Red',
  'Blue',
  'Yellow',
  'Green',
  'Orange',
  'Purple',
  'Black',
  'White'
];

// Lock Types
export const LOCK_TYPES = [
  'Padlock',
  'Hasp',
  'Circuit Breaker Lock',
  'Valve Lock',
  'Plug Lock'
];

// Status options
export const STATUS_OPTIONS = [
  'Active',
  'Inactive',
  'Maintenance',
  'Retired'
];

// Supabase Configuration
export const SUPABASE_CONFIG = {
  bucket: 'loto_pdfs',
  url: 'https://myuxpyzzqcivfmvdvdkv.supabase.co'
};

// Sync Configuration
export const SYNC_CONFIG = {
  autoSyncInterval: 300000, // 5 minutes in milliseconds
  maxRetries: 3,
  retryDelay: 5000, // 5 seconds
  timeout: 30000, // 30 seconds
};

// File Upload Configuration
export const FILE_CONFIG = {
  maxFileSize: 10 * 1024 * 1024, // 10MB
  allowedPdfTypes: ['application/pdf'],
  allowedImageTypes: ['image/jpeg', 'image/png', 'image/jpg'],
  allowedCsvTypes: ['text/csv', 'application/vnd.ms-excel'],
};

// App Configuration - Auto-synced with package.json
export const APP_CONFIG = {
  name: packageJson.build.productName || 'LOTO Key Management',
  fullName: packageJson.description || 'LOTO Key Management System',
  version: packageJson.version, // Auto-synced from package.json
  author: packageJson.author || 'Hatim Raghib',
  linkedIn: 'https://www.linkedin.com/in/hatim-raghib-5b85362a5/',
  email: 'contact@example.com', // Update with real email
};

// User Modes
export const USER_MODES = {
  EDITOR: 'Editor',
  VISITOR: 'Visitor'
};

// Toast durations (ms)
export const TOAST_DURATIONS = {
  short: 2000,
  medium: 3000,
  long: 5000
};

export default {
  ZONES,
  SUBZONES,
  LOCATIONS,
  BREAKER_STATES,
  COMPANIES,
  HABILITATION_TYPES,
  JOB_TITLES,
  LOCK_COLORS,
  LOCK_TYPES,
  STATUS_OPTIONS,
  SUPABASE_CONFIG,
  SYNC_CONFIG,
  FILE_CONFIG,
  APP_CONFIG,
  USER_MODES,
  TOAST_DURATIONS,
};
