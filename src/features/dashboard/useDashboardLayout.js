import { useCallback, useEffect, useState } from 'react';
import { DASHBOARD_BLOCK_KEYS } from '@/src/features/dashboard/dashboardBlocks';

// Personal dashboard layout: which blocks are hidden and in what order. Kept in
// localStorage (a per-user preference, not account data). Bump the suffix if the
// block set changes shape in a way that shouldn't inherit old preferences.
const STORAGE_KEY = 'byggexp.dashboard.layout.v2';
const KNOWN = new Set(DASHBOARD_BLOCK_KEYS);

// Keep only known keys, then append blocks added after the user last saved so
// new features show up instead of silently staying at the bottom/hidden.
const normalizeOrder = (order = []) => {
  const clean = order.filter((key) => KNOWN.has(key));
  DASHBOARD_BLOCK_KEYS.forEach((key) => {
    if (!clean.includes(key)) clean.push(key);
  });
  return clean;
};

const readStored = () => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

export function useDashboardLayout() {
  const [order, setOrder] = useState(DASHBOARD_BLOCK_KEYS);
  const [hidden, setHidden] = useState([]);

  useEffect(() => {
    const stored = readStored();
    if (!stored) return;
    if (Array.isArray(stored.order)) setOrder(normalizeOrder(stored.order));
    if (Array.isArray(stored.hidden)) setHidden(stored.hidden.filter((key) => KNOWN.has(key)));
  }, []);

  const persist = useCallback((nextOrder, nextHidden) => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ order: nextOrder, hidden: nextHidden }),
      );
    } catch {
      /* storage unavailable — keep the in-memory state anyway */
    }
  }, []);

  const toggle = useCallback((key) => {
    setHidden((prev) => {
      const next = prev.includes(key) ? prev.filter((item) => item !== key) : [...prev, key];
      persist(order, next);
      return next;
    });
  }, [order, persist]);

  // Move `key` so it lands just before `beforeKey` (drag-and-drop reorder).
  const moveBefore = useCallback((key, beforeKey) => {
    if (key === beforeKey) return;
    setOrder((prev) => {
      const next = prev.filter((item) => item !== key);
      const at = beforeKey ? next.indexOf(beforeKey) : next.length;
      next.splice(at < 0 ? next.length : at, 0, key);
      persist(next, hidden);
      return next;
    });
  }, [hidden, persist]);

  const reset = useCallback(() => {
    setOrder(DASHBOARD_BLOCK_KEYS);
    setHidden([]);
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
  }, []);

  const isHidden = useCallback((key) => hidden.includes(key), [hidden]);
  const isCustomized = hidden.length > 0
    || order.some((key, index) => key !== DASHBOARD_BLOCK_KEYS[index]);

  return { order, isHidden, toggle, moveBefore, reset, isCustomized };
}
