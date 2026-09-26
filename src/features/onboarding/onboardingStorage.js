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

// Set on every sign-in. The onboarding wizard consumes it once: if the user
// had only minimised onboarding (not closed it with ×) and it isn't finished,
// it opens again on their next login.
const FRESH_LOGIN_KEY = 'byggexp:onboarding-fresh-login';

export function markFreshLogin() {
  if (typeof window === 'undefined') return;
  try { localStorage.setItem(FRESH_LOGIN_KEY, '1'); } catch { /* ignore */ }
}

export function consumeFreshLogin() {
  if (typeof window === 'undefined') return false;
  try {
    const fresh = localStorage.getItem(FRESH_LOGIN_KEY) === '1';
    if (fresh) localStorage.removeItem(FRESH_LOGIN_KEY);
    return fresh;
  } catch {
    return false;
  }
}
