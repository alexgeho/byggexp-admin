// Single source of truth for status badges across the app: one antd colour and
// one bilingual label per status value. Replaces the per-feature STATUS_COLORS /
// STATUS_SV maps so a status looks and reads the same everywhere.
//
// Semantic palette: default = neutral/not-started, processing = in-flight,
// success = done/positive, warning = needs-attention, error = negative.
export const STATUS_REGISTRY = {
  // Financial documents (invoices, offers, expenses, supplier invoices, payroll)
  draft: { color: 'default', en: 'Draft', sv: 'Utkast' },
  registered: { color: 'default', en: 'Registered', sv: 'Registrerad' },
  sent: { color: 'processing', en: 'Sent', sv: 'Skickad' },
  submitted: { color: 'processing', en: 'Submitted', sv: 'Inskickad' },
  approved: { color: 'processing', en: 'Approved', sv: 'Godkänd' },
  accepted: { color: 'success', en: 'Accepted', sv: 'Accepterad' },
  paid: { color: 'success', en: 'Paid', sv: 'Betald' },
  reimbursed: { color: 'success', en: 'Reimbursed', sv: 'Utbetald' },
  overdue: { color: 'error', en: 'Overdue', sv: 'Förfallen' },
  rejected: { color: 'error', en: 'Rejected', sv: 'Avvisad' },
  cancelled: { color: 'warning', en: 'Cancelled', sv: 'Makulerad' },

  // Projects — active work reads green, mirroring the Staff "At work" badge
  // (the etalon); planning is the in-flight blue, completed is de-emphasised
  // grey, on hold is amber.
  planning: { color: 'processing', en: 'Planning', sv: 'Planering' },
  in_progress: { color: 'success', en: 'In progress', sv: 'Pågår' },
  completed: { color: 'default', en: 'Completed', sv: 'Slutfört' },
  on_hold: { color: 'warning', en: 'On hold', sv: 'Pausat' },

  // Tools — "ready/free" reads green like Staff "At work"; in use = blue,
  // in repair = amber, broken = red.
  available: { color: 'success', en: 'Available', sv: 'Tillgänglig' },
  occupied: { color: 'processing', en: 'In use', sv: 'Upptagen' },
  in_repair: { color: 'warning', en: 'In repair', sv: 'På reparation' },
  broken: { color: 'error', en: 'Broken', sv: 'Trasig' },

  // Tasks (status + priority)
  open: { color: 'processing', en: 'Open', sv: 'Öppen' },
  low: { color: 'default', en: 'Low', sv: 'Låg' },
  normal: { color: 'processing', en: 'Normal', sv: 'Normal' },
  high: { color: 'error', en: 'High', sv: 'Hög' },
};

export const statusLabel = (status, lang = 'en') => {
  const meta = STATUS_REGISTRY[String(status).toLowerCase()];
  if (!meta) return String(status ?? '');
  return lang === 'sv' ? meta.sv : meta.en;
};
