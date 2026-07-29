// Toggleable modules for the superadmin visibility manager, grouped to mirror
// the sidebar. Labels reuse the existing sidebar/page-title strings so i18n
// covers them. The plan preset and effective state come from the API.
export const MODULE_GROUPS = [
  { label: 'Production', keys: ['projects', 'tasks', 'dagbok', 'kma'] },
  { label: 'Time & staff', keys: ['shifts', 'schedule', 'leave', 'users'] },
  {
    label: 'Economy',
    keys: ['offers', 'invoices', 'supplier-invoices', 'expenses', 'payroll', 'profitability'],
  },
  { label: 'Register', keys: ['clients', 'articles', 'tools', 'audit'] },
];

export const MODULE_LABELS = {
  projects: 'Projects',
  tasks: 'Tasks',
  dagbok: 'Dagbok',
  kma: 'KMA',
  shifts: 'Shifts',
  schedule: 'Calendar',
  leave: 'Leave',
  users: 'Users',
  offers: 'Offers',
  invoices: 'Invoices',
  'supplier-invoices': 'Supplier invoices',
  expenses: 'Expenses',
  payroll: 'Payroll',
  profitability: 'Profitability',
  clients: 'Clients',
  articles: 'Articles',
  tools: 'Instruments',
  audit: 'Audit log',
};
