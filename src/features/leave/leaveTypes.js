// Frånvaro types — shared between the list and form.
export const LEAVE_TYPE_OPTIONS = [
  { value: 'vacation', en: 'Vacation', sv: 'Semester' },
  { value: 'sick', en: 'Sick', sv: 'Sjukfrånvaro' },
  { value: 'vab', en: 'VAB (care of child)', sv: 'VAB' },
  { value: 'parental', en: 'Parental', sv: 'Föräldraledig' },
  { value: 'leave', en: 'Unpaid leave', sv: 'Tjänstledig' },
  { value: 'other', en: 'Other', sv: 'Övrigt' },
];

export const leaveTypeLabel = (value, lang) => {
  const o = LEAVE_TYPE_OPTIONS.find((x) => x.value === value);
  return o ? (lang === 'sv' ? o.sv : o.en) : value;
};

export const LEAVE_STATUS_META = {
  pending: { en: 'Pending', sv: 'Inskickad', color: 'processing' },
  approved: { en: 'Approved', sv: 'Godkänd', color: 'success' },
  rejected: { en: 'Rejected', sv: 'Avvisad', color: 'error' },
};

export const leaveStatusLabel = (value, lang) => {
  const m = LEAVE_STATUS_META[value] || LEAVE_STATUS_META.pending;
  return lang === 'sv' ? m.sv : m.en;
};
