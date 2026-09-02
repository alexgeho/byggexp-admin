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

// Routing archetypes for the one signup question. Answer only reorders/relabels
// the checklist — it never hides a step. Kept deliberately tiny.
export const ONBOARDING_FOCI = {
  // Field-first crews: project first, then team, then client, company details,
  // and billing last.
  fieldwork: ['project', 'team', 'client', 'company', 'billing'],
  // Billing-first (offers/invoices/ROT) shops: client + billing lead.
  billing: ['client', 'billing', 'company', 'project', 'team'],
};

export function orderStepsByFocus(steps, focus) {
  const order = ONBOARDING_FOCI[focus];
  if (!order) return steps;
  const byKey = new Map(steps.map((s) => [s.key, s]));
  const ordered = order.map((k) => byKey.get(k)).filter(Boolean);
  // Append any steps not named in the focus order, preserving their position.
  const named = new Set(order);
  return [...ordered, ...steps.filter((s) => !named.has(s.key))];
}
