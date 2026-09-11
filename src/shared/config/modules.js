// Toggleable modules for the superadmin visibility manager, grouped to mirror
// the sidebar. Labels reuse the existing sidebar/page-title strings so i18n
// covers them. The plan preset and effective state come from the API.
export const MODULE_GROUPS = [
  { label: 'Production', keys: ['projects', 'map', 'tasks', 'dagbok', 'kma'] },
  { label: 'Time & staff', keys: ['shifts', 'schedule', 'leave', 'users'] },
  {
    label: 'Economy',
    keys: ['offers', 'invoices', 'planning', 'supplier-invoices', 'expenses', 'payroll', 'profitability', 'projektkalkyl'],
  },
  { label: 'Register', keys: ['clients', 'articles', 'tools', 'audit'] },
];

export const MODULE_LABELS = {
  projects: 'Projects',
  map: 'Site map',
  tasks: 'Tasks',
  dagbok: 'Dagbok',
  kma: 'KMA',
  shifts: 'Shifts',
  schedule: 'Calendar',
  leave: 'Leave',
  users: 'Users',
  offers: 'Offers',
  invoices: 'Invoices',
  planning: 'Financial planning',
  'supplier-invoices': 'Purchase invoices',
  expenses: 'Expenses',
  payroll: 'Payroll',
  profitability: 'Profitability',
  projektkalkyl: 'Projektkalkyl',
  clients: 'Clients',
  articles: 'Articles',
  tools: 'Tools',
  audit: 'Audit log',
};
