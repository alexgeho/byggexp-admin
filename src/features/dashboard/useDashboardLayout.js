import { useCallback, useEffect, useState } from 'react';
import { DASHBOARD_BLOCK_KEYS } from '@/src/features/dashboard/dashboardBlocks';

// Which dashboard blocks a user has hidden is a personal preference, so it
// lives in localStorage rather than on the account. Bump the suffix if the
// block set changes shape in a way that shouldn't inherit old preferences.
const STORAGE_KEY = 'byggexp.dashboard.layout.v1';
const KNOWN = new Set(DASHBOARD_BLOCK_KEYS);

const readStored = () => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed?.hidden) ? parsed.hidden.filter((key) => KNOWN.has(key)) : null;
  } catch {
    return null;
  }
};

export function useDashboardLayout() {
  const [hidden, setHidden] = useState([]);

  useEffect(() => {
    const stored = readStored();
    if (stored) setHidden(stored);
  }, []);

  const persist = useCallback((next) => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ hidden: next }));
    } catch {
      /* storage unavailable — keep the in-memory state anyway */
    }
  }, []);

  const toggle = useCallback((key) => {
    setHidden((prev) => {
      const next = prev.includes(key) ? prev.filter((item) => item !== key) : [...prev, key];
      persist(next);
      return next;
    });
  }, [persist]);

  const reset = useCallback(() => {
    setHidden([]);
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
  }, []);

  const isHidden = useCallback((key) => hidden.includes(key), [hidden]);

  return { isHidden, toggle, reset, isCustomized: hidden.length > 0 };
}
