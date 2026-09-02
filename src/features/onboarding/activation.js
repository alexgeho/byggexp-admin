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
  // Field-first crews: operational setup, no billing — with a pointer to the
  // money track.
  fieldwork: { steps: ['project', 'team', 'client', 'company'], next: 'billing' },
  // Money track: company details, article catalog, client, then offer/invoice —
  // with a pointer back to the field track.
  billing: { steps: ['company', 'article', 'client', 'billing'], next: 'fieldwork' },
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
