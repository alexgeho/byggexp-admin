// Frånvaro types — shared between the list and form.
export const LEAVE_TYPE_OPTIONS = [
  { value: 'vacation', en: 'Vacation', sv: 'Semester', nb: 'Ferie' },
  { value: 'sick', en: 'Sick', sv: 'Sjukfrånvaro', nb: 'Sykefravær' },
  { value: 'vab', en: 'VAB (care of child)', sv: 'VAB', nb: 'Omsorgsdager' },
  { value: 'parental', en: 'Parental', sv: 'Föräldraledig', nb: 'Foreldrepermisjon' },
  { value: 'leave', en: 'Unpaid leave', sv: 'Tjänstledig', nb: 'Permisjon uten lønn' },
  { value: 'other', en: 'Other', sv: 'Övrigt', nb: 'Annet' },
];

export const leaveTypeLabel = (value, lang) => {
  const o = LEAVE_TYPE_OPTIONS.find((x) => x.value === value);
  return o ? o[lang] ?? o.en : value;
};

export const LEAVE_STATUS_META = {
  pending: { en: 'Pending', sv: 'Inskickad', nb: 'Sendt inn', color: 'processing' },
  approved: { en: 'Approved', sv: 'Godkänd', nb: 'Godkjent', color: 'success' },
  rejected: { en: 'Rejected', sv: 'Avvisad', nb: 'Avvist', color: 'error' },
};

export const leaveStatusLabel = (value, lang) => {
  const m = LEAVE_STATUS_META[value] || LEAVE_STATUS_META.pending;
  return m[lang] ?? m.en;
};
