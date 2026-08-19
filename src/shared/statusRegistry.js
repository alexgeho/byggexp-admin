// Single source of truth for status badges across the app: one antd colour and
// one bilingual label per status value. Replaces the per-feature STATUS_COLORS /
// STATUS_SV maps so a status looks and reads the same everywhere.
//
// Semantic palette: default = neutral/not-started, processing = in-flight,
// success = done/positive, warning = needs-attention, error = negative.
export const STATUS_REGISTRY = {
  // Financial documents (invoices, offers, expenses, supplier invoices, payroll)
  draft: { color: 'default', en: 'Draft', sv: 'Utkast', nb: 'Utkast' },
  registered: { color: 'default', en: 'Registered', sv: 'Registrerad', nb: 'Registrert' },
  sent: { color: 'processing', en: 'Sent', sv: 'Skickad', nb: 'Sendt' },
  submitted: { color: 'processing', en: 'Submitted', sv: 'Inskickad', nb: 'Sendt inn' },
  approved: { color: 'processing', en: 'Approved', sv: 'Godkänd', nb: 'Godkjent' },
  accepted: { color: 'success', en: 'Accepted', sv: 'Accepterad', nb: 'Akseptert' },
  paid: { color: 'success', en: 'Paid', sv: 'Betald', nb: 'Betalt' },
  reimbursed: { color: 'success', en: 'Reimbursed', sv: 'Utbetald', nb: 'Refundert' },
  overdue: { color: 'error', en: 'Overdue', sv: 'Förfallen', nb: 'Forfalt' },
  rejected: { color: 'error', en: 'Rejected', sv: 'Avvisad', nb: 'Avvist' },
  cancelled: { color: 'warning', en: 'Cancelled', sv: 'Makulerad', nb: 'Kansellert' },

  // Projects — active work reads green, mirroring the Staff "At work" badge
  // (the etalon); planning is the in-flight blue, completed is de-emphasised
  // grey, on hold is amber.
  planning: { color: 'processing', en: 'Planning', sv: 'Planering', nb: 'Planlegging' },
  in_progress: { color: 'success', en: 'In progress', sv: 'Pågår', nb: 'Pågår' },
  completed: { color: 'default', en: 'Completed', sv: 'Slutfört', nb: 'Fullført' },
  on_hold: { color: 'warning', en: 'On hold', sv: 'Pausat', nb: 'På vent' },

  // Tools — "ready/free" reads green like Staff "At work"; in use = blue,
  // in repair = amber, broken = red.
  available: { color: 'success', en: 'Available', sv: 'Tillgänglig', nb: 'Tilgjengelig' },
  occupied: { color: 'processing', en: 'In use', sv: 'Upptagen', nb: 'I bruk' },
  in_repair: { color: 'warning', en: 'In repair', sv: 'På reparation', nb: 'På reparasjon' },
  broken: { color: 'error', en: 'Broken', sv: 'Trasig', nb: 'Ødelagt' },

  // Tasks (status + priority)
  open: { color: 'processing', en: 'Open', sv: 'Öppen', nb: 'Åpen' },
  low: { color: 'default', en: 'Low', sv: 'Låg', nb: 'Lav' },
  normal: { color: 'processing', en: 'Normal', sv: 'Normal', nb: 'Normal' },
  high: { color: 'error', en: 'High', sv: 'Hög', nb: 'Høy' },
};

export const statusLabel = (status, lang = 'en') => {
  const meta = STATUS_REGISTRY[String(status).toLowerCase()];
  if (!meta) return String(status ?? '');
  return meta[lang] ?? meta.en;
};
