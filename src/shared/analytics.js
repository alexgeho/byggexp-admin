import apiClient from '@/src/api/apiClient';
import { useAuthStore } from '@/src/store/authStore';

// Lightweight, dependency-free event tracker. Onboarding is invisible unless we
// measure it (research: optimise for time-to-value, not checklist completion),
// so we emit step-level events here. Events are buffered and flushed to the
// backend (POST /analytics/events) in small batches; the server stamps the
// user/company/role from the JWT. Every call is wrapped so analytics can never
// throw into the UI.
const BUFFER_KEY = '__byggexpEvents';
const FLUSH_DELAY_MS = 2500;
const MAX_BATCH = 50;

let queue = []; // events awaiting delivery
let flushTimer = null;

function scheduleFlush() {
  if (flushTimer || typeof window === 'undefined') return;
  flushTimer = setTimeout(() => {
    flushTimer = null;
    flush();
  }, FLUSH_DELAY_MS);
}

async function flush() {
  if (!queue.length) return;
  // Endpoint requires auth — if there's no token yet, keep the events and retry.
  let token = null;
  try { token = useAuthStore.getState().accessToken; } catch { /* ignore */ }
  if (!token) { scheduleFlush(); return; }

  const batch = queue.slice(0, MAX_BATCH);
  try {
    await apiClient.post('/analytics/events', { events: batch });
    queue = queue.slice(batch.length);
    if (queue.length) scheduleFlush(); // more waiting — drain the rest
  } catch {
    // Delivery failed (offline, 5xx…). Keep the events and try again later.
    scheduleFlush();
  }
}

export function track(event, props = {}) {
  try {
    const entry = { event, props, ts: Date.now() };
    if (typeof window !== 'undefined') {
      (window[BUFFER_KEY] = window[BUFFER_KEY] || []).push(entry);
      if (process.env.NODE_ENV !== 'production') {
        console.debug('[track]', event, props);
      }
      queue.push(entry);
      scheduleFlush();
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

// Best-effort flush when the tab is hidden/closed so trailing events aren't lost.
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flush();
  });
}
