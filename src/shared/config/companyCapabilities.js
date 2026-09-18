// Capability gating for the company panel. Full company admins
// (companyAdmin / superadmin) see everything; delegated roles (projectAdmin)
// get sidebar items and routes opened up by CAPABILITY, not by role — the same
// `finance.manage` / `projects.manage` / … keys the backend guards check, so an
// "admin type" is just which capabilities the user was granted.
//
// NOTE: `users` is gated to `company.manage` (full admins only) on purpose: the
// staff list is not owner-scoped yet (no `createdBy` on users), so opening it to
// a delegated admin would expose every employee + payroll. Lower this to
// `employees.manage` only after backend own-scoping lands.
export const NAV_CAPABILITY = {
  users: 'company.manage',
  offers: 'finance.manage',
  invoices: 'finance.manage',
  planning: 'finance.manage',
  budget: 'finance.manage',
  'supplier-invoices': 'finance.manage',
  expenses: 'finance.manage',
  payroll: 'finance.manage',
  profitability: 'finance.manage',
  projektkalkyl: 'finance.manage',
  clients: 'finance.manage',
  articles: 'finance.manage',
  billing: 'company.manage',
  modules: 'company.manage',
  audit: 'company.manage',
  projects: 'projects.manage',
  map: 'projects.manage',
  tasks: 'projects.manage',
  dagbok: 'projects.manage',
  kma: 'projects.manage',
  bemanning: 'projects.manage',
  tools: 'tools.manage',
  shifts: 'shifts.viewAll',
  schedule: 'shifts.viewAll',
  leave: 'shifts.viewAll',
};

// Path prefix → capability, for the route guard. Longest matching prefix wins.
// Paths not listed need no capability (dashboard, my-work, profile, help, …).
const PATH_CAPABILITY = [
  ['/company/invoicing/offers', 'finance.manage'],
  ['/company/invoicing/invoices', 'finance.manage'],
  ['/company/invoicing/planning', 'finance.manage'],
  ['/company/invoicing/budget', 'finance.manage'],
  ['/company/invoicing/supplier-invoices', 'finance.manage'],
  ['/company/invoicing/expenses', 'finance.manage'],
  ['/company/invoicing/payroll', 'finance.manage'],
  ['/company/invoicing/clients', 'finance.manage'],
  ['/company/invoicing/articles', 'finance.manage'],
  ['/company/projektkalkyl', 'finance.manage'],
  ['/company/profitability', 'finance.manage'],
  ['/company/users', 'company.manage'],
  ['/company/billing', 'company.manage'],
  ['/company/modules', 'company.manage'],
  ['/company/audit', 'company.manage'],
  ['/company/projects', 'projects.manage'],
  ['/company/tasks', 'projects.manage'],
  ['/company/dagbok', 'projects.manage'],
  ['/company/kma', 'projects.manage'],
  ['/company/map', 'projects.manage'],
  ['/company/bemanning', 'projects.manage'],
  ['/company/tools', 'tools.manage'],
  ['/company/shifts', 'shifts.viewAll'],
  ['/company/schedule', 'shifts.viewAll'],
  ['/company/leave', 'shifts.viewAll'],
];

export function requiredCapabilityForPath(pathname) {
  let best = null;
  for (const [prefix, cap] of PATH_CAPABILITY) {
    if (pathname === prefix || pathname.startsWith(`${prefix}/`)) {
      if (!best || prefix.length > best[0].length) best = [prefix, cap];
    }
  }
  return best ? best[1] : null;
}

// Roles that see the whole company panel regardless of individual capabilities.
export const FULL_COMPANY_ROLES = ['superadmin', 'companyAdmin'];
