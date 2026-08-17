// KMA categories — shared between the template and checklist UIs.
export const KMA_CATEGORY_OPTIONS = [
  { value: 'quality', label: 'Quality' },
  { value: 'environment', label: 'Environment' },
  { value: 'work_environment', label: 'Work environment' },
  { value: 'other', label: 'Other' },
];

const KMA_CATEGORY_SV = {
  quality: 'Kvalitet',
  environment: 'Miljö',
  work_environment: 'Arbetsmiljö',
  other: 'Övrigt',
};

export const kmaCategoryLabel = (value, lang) =>
  (lang === 'sv'
    ? KMA_CATEGORY_SV[value]
    : KMA_CATEGORY_OPTIONS.find((o) => o.value === value)?.label) || value;

export const KMA_RESULT_META = {
  ok: { sv: 'Godkänd', en: 'Approved', color: 'success' },
  remark: { sv: 'Anmärkning', en: 'Remark', color: 'error' },
  na: { sv: 'Ej aktuellt', en: 'Not applicable', color: 'default' },
  pending: { sv: 'Ej besvarad', en: 'Pending', color: 'processing' },
};
