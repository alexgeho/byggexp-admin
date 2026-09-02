// Lightweight, dependency-free event tracker. Onboarding is invisible unless we
// measure it (research: optimise for time-to-value, not checklist completion),
// so we emit step-level events here. Today this buffers to `window` and logs in
// dev; when a backend endpoint exists it can drain the buffer. Every call is
// wrapped so analytics can never throw into the UI.
const BUFFER_KEY = '__byggexpEvents';

export function track(event, props = {}) {
  try {
    const entry = { event, props, ts: Date.now() };
    if (typeof window !== 'undefined') {
      (window[BUFFER_KEY] = window[BUFFER_KEY] || []).push(entry);
      if (process.env.NODE_ENV !== 'production') {
        console.debug('[track]', event, props);
      }
    }
  } catch {
    /* analytics must never break the app */
  }
}

// Fire an event at most once per key per browser (e.g. "activation reached").
// Returns true if it fired, false if it was already recorded.
export function trackOnce(key, event, props = {}) {
  try {
    const flag = `byggexp.evt.${key}`;
    if (typeof localStorage !== 'undefined' && localStorage.getItem(flag) === '1') {
      return false;
    }
    if (typeof localStorage !== 'undefined') localStorage.setItem(flag, '1');
    track(event, props);
    return true;
  } catch {
    return false;
  }
}
