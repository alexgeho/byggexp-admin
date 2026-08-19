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

const KMA_CATEGORY_NB = {
  quality: 'Kvalitet',
  environment: 'Miljø',
  work_environment: 'Arbeidsmiljø',
  other: 'Annet',
};

export const kmaCategoryLabel = (value, lang) => {
  const localized =
    lang === 'nb' ? KMA_CATEGORY_NB[value] : lang === 'sv' ? KMA_CATEGORY_SV[value] : null;
  return (
    localized || KMA_CATEGORY_OPTIONS.find((o) => o.value === value)?.label || value
  );
};

export const KMA_RESULT_META = {
  ok: { sv: 'Godkänd', en: 'Approved', nb: 'Godkjent', color: 'success' },
  remark: { sv: 'Anmärkning', en: 'Remark', nb: 'Anmerkning', color: 'error' },
  na: { sv: 'Ej aktuellt', en: 'Not applicable', nb: 'Ikke aktuelt', color: 'default' },
  pending: { sv: 'Ej besvarad', en: 'Pending', nb: 'Ikke besvart', color: 'processing' },
};
