// Avvik / Avvikelser — domain labels that differ per market (HMS in Norway,
// Arbetsmiljö in Sweden), kept here like the KMA categories.
export const DEVIATION_CATEGORIES = ['hms', 'quality', 'environment'];
export const DEVIATION_SEVERITIES = ['low', 'medium', 'high'];
export const DEVIATION_STATUSES = ['open', 'in_progress', 'closed'];

const CATEGORY = {
  en: { hms: 'HSE', quality: 'Quality', environment: 'Environment' },
  sv: { hms: 'Arbetsmiljö', quality: 'Kvalitet', environment: 'Miljö' },
  nb: { hms: 'HMS', quality: 'Kvalitet', environment: 'Miljø' },
};

const SEVERITY = {
  en: { low: 'Low', medium: 'Medium', high: 'High' },
  sv: { low: 'Låg', medium: 'Medel', high: 'Hög' },
  nb: { low: 'Lav', medium: 'Middels', high: 'Høy' },
};

const pick = (map, lang, value) => (map[lang] || map.en)[value] || map.en[value] || value || '';

export const deviationCategoryLabel = (value, lang) => pick(CATEGORY, lang, value);
export const deviationSeverityLabel = (value, lang) => pick(SEVERITY, lang, value);

// Status badge keys in the shared STATUS_REGISTRY.
export const deviationStatusKey = (status) => `avvik_${status || 'open'}`;

// Today on the Swedish/Norwegian calendar (same rule as the backend).
const STOCKHOLM_DAY = new Intl.DateTimeFormat('sv-SE', {
  timeZone: 'Europe/Stockholm', year: 'numeric', month: '2-digit', day: '2-digit',
});
export const stockholmDay = (now = new Date()) => STOCKHOLM_DAY.format(now);

// Overdue = not closed and the due day has passed (backend sends `overdue`
// too; this keeps rows correct after a local edit).
export const isDeviationOverdue = (d, now = new Date()) => {
  if (!d || d.status === 'closed' || !d.dueDate) return false;
  return String(d.dueDate).slice(0, 10) < stockholmDay(now);
};

// Checklist (KMA) category → deviation category, same as the backend prefill.
export const categoryFromChecklist = (c) => {
  if (c === 'work_environment') return 'hms';
  if (c === 'environment') return 'environment';
  return 'quality';
};

// Same filter for the list and the avviksrapport export.
export const deviationQueryParams = (projectId, category) => ({
  ...(projectId ? { projectId } : {}),
  ...(category ? { category } : {}),
});

export const dayValue = (d) => (d ? String(d).slice(0, 10) : '');
