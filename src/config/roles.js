// Display labels (English source strings, translated with t()) for user roles.
export const ROLE_LABELS = {
  worker: 'Worker',
  projectAdmin: 'Project admin',
  companyAdmin: 'Company admin',
  superadmin: 'Superadmin',
  subcontractor: 'Subcontractor',
};

export const roleLabel = (role, t) => (role ? t(ROLE_LABELS[role] || role) : '-');
