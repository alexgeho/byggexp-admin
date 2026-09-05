// Shared onboarding view/focus state lives in localStorage (per company) and is
// the source of truth for BOTH the on-dashboard checklist/bar and the
// full-screen onboarding wizard. Because those two components are mounted
// side-by-side, a change in one must be reflected in the other without a page
// reload — so every write emits a window event both listen for.
export const ONBOARDING_CHANGE_EVENT = 'byggexp:onboarding-change';

// Fire the cross-component sync event (client-only, guarded for SSR).
export function emitOnboardingChange() {
  if (typeof window === 'undefined') return;
  try {
    window.dispatchEvent(new CustomEvent(ONBOARDING_CHANGE_EVENT));
  } catch { /* ignore */ }
}
