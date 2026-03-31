export const LEGACY_STORAGE_KEY = 'mycal.static.state.v1';
export const TITLE_STORAGE_PREFIX = 'mycal.static.title';
export const ACTIVE_MONTH_KEY = 'mycal.meta.activeMonth';
export const META_KEY = 'mycal.meta.v1';
export const DB_NAME = 'mycal-static-db';
export const DB_VERSION = 1;
export const STORES = {
  DOCUMENTS: 'documents',
  ATTACHMENTS: 'attachments',
  AUTOSAVES: 'autosaves',
};

export const SCHEMA_VERSION = 'mycal.document.v1';
export const APP_VERSION = '2.0.0';
export const MAX_AUTOSAVES = 10;

export const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export const WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export const AUDIENCE_CHOICES = ['All', 'Ansar', 'Khuddam', 'Atfal', 'Nasirat', 'Lajna', 'Tahir Academy', 'Waqf-e-Nau', 'Unspecified'];

export const AUDIENCE_COLORS = {
  Lajna: '#b03060',
  Nasirat: '#f4a6c1',
  Ansar: '#1d4e89',
  Khuddam: '#1f3a5f',
  Atfal: '#75b8ff',
  'Tahir Academy': '#2f855a',
  'Waqf-e-Nau': '#7c3aed',
  All: '#1f2937',
  Unspecified: '#4b5563',
};

export const RECURRENCE_CHOICES = ['none', 'daily', 'weekly'];
