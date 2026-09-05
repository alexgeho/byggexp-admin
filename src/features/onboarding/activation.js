// The single, measurable "activated" definition for a company (research: define
// the activation event BEFORE the steps, or you optimise for completion instead
// of value). For byggexp a company has reached first value once it has a real
// project AND has turned work into money (an offer or invoice). Team/client are
// enabling steps; these two are the outcome that predicts retention.
export const ACTIVATION_EVENT = 'company_activated';

// counts: { projectCount, billingCount } where billingCount = offers + invoices.
export function isActivated({ projectCount = 0, billingCount = 0 } = {}) {
  return projectCount > 0 && billingCount > 0;
}

// Routing archetypes for the one signup question. Each focus shows just the
// steps that matter for that track (in this order) plus a `next` pointer to the
// other track, surfaced as a transition link. An unknown focus (e.g. "skip")
// shows every step in its original order.
export const ONBOARDING_FOCI = {
  // Field-first crews: purely operational — get a project running, crews logging
  // time, work assigned, gear tracked. No billing here; a pointer hands off to
  // the money track once the site is up.
  fieldwork: { steps: ['project', 'team', 'task', 'tools'], next: 'billing' },
  // Money track: everything needed to invoice — company details, the client,
  // the article catalog, then the offer/invoice itself.
  billing: { steps: ['company', 'client', 'article', 'billing'], next: 'fieldwork' },
};

// The subset of steps to show for a focus, in focus order. Unknown/"skip" focus
// returns all steps unchanged.
export function stepsForFocus(steps, focus) {
  const cfg = ONBOARDING_FOCI[focus];
  if (!cfg) return steps;
  const byKey = new Map(steps.map((s) => [s.key, s]));
  return cfg.steps.map((k) => byKey.get(k)).filter(Boolean);
}

// The other track to offer a transition link to, or null.
export function nextFocus(focus) {
  return ONBOARDING_FOCI[focus]?.next || null;
}

// The full set of first-run setup steps, in canonical order. Shared by the
// on-dashboard checklist and the full-screen onboarding wizard so both stay in
// sync (single source of truth for titles/descriptions/deep-links/completion).
// `t` is the translator; the counts drive live completion detection.
export function buildOnboardingSteps({
  t,
  projectCount = 0,
  teamCount = 0,
  clients = 0,
  billing = 0,
  articles = 0,
  tasks = 0,
  tools = 0,
  company = null,
}) {
  return [
    {
      key: 'project',
      title: t('Create your first project'),
      desc: t('Projects tie together shifts, tasks, photos and costs.'),
      href: '/company/projects?create=1',
      done: (projectCount || 0) > 0,
    },
    {
      key: 'team',
      title: t('Add your team'),
      desc: t('They sign in to the mobile app with their email to log shifts and photos.'),
      href: '/company/users?create=1',
      done: (teamCount || 0) > 1,
    },
    {
      key: 'task',
      title: t('Create a task'),
      desc: t('Give someone a to-do with a due date — they get automatic reminders.'),
      href: '/company/tasks?create=1',
      done: tasks > 0,
    },
    {
      key: 'tools',
      title: t('Add your tools'),
      desc: t('Track equipment and assign it to projects and people.'),
      href: '/company/tools?create=1',
      done: tools > 0,
    },
    {
      key: 'company',
      title: t('Fill in your company details'),
      desc: t('Org. number and address — used on every invoice and offer.'),
      href: '/company/profile',
      done: Boolean(company?.orgNumber),
    },
    {
      key: 'client',
      title: t('Add a client'),
      desc: t('You need a client to send offers and invoices.'),
      href: '/company/invoicing/clients?create=1',
      done: clients > 0,
    },
    {
      key: 'article',
      title: t('Add your articles'),
      desc: t('The products and services you sell — add them once, use them on every offer.'),
      href: '/company/invoicing/articles?create=1',
      done: articles > 0,
    },
    {
      key: 'billing',
      title: t('Create your first offer or invoice'),
      desc: t('Turn work into money — draft an offer, then invoice it.'),
      href: '/company/invoicing/offers?create=1',
      done: billing > 0,
    },
  ];
}
