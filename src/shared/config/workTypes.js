// Kinds of work (arbetstyp) offered when filling in a person's profession, a
// subcontractor's trade and what an order needs. The fields stay free text —
// this is only the suggestion list — and are matched case-insensitively.
export const WORK_TYPES = [
  'Snickare',
  'Målare',
  'Elektriker',
  'VVS-montör',
  'Plattsättare',
  'Murare',
  'Golvläggare',
  'Takläggare',
  'Betongarbetare',
  'Anläggare',
  'Ventilationsmontör',
  'Ställningsbyggare',
];

export const WORK_TYPE_OPTIONS = WORK_TYPES.map((value) => ({ value, label: value }));

const norm = (value) => String(value || '').trim().toLowerCase();

// True when a person's profession is the kind of work the order asks for.
export const matchesWorkType = (profession, workType) =>
  Boolean(norm(workType)) && norm(profession) === norm(workType);
