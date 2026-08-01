import { useCallback, useEffect, useState } from 'react';

// Personal Mitt-arbete layout: which blocks are hidden and in what order.
// Kept in localStorage (a per-user preference, not account data). Core task
// horizons always render; only the optional panels can be toggled off, but any
// block in the main column can be dragged to reorder.
const STORAGE_KEY = 'byggexp.mywork.layout.v1';

// Every block in the main column, in default order (drag-reorderable). The
// right-rail "Today's plan" is separate and not part of this list.
export const MYWORK_BLOCK_KEYS = [
  'overdue',
  'today',
  'approvals',
  'payments',
  'deadlines',
  'upcoming',
  'someday',
  'done',
];

// Only these can be hidden via the customizer; the task horizons always render.
export const MYWORK_OPTIONAL_BLOCKS = [
  { key: 'approvals', label: 'To approve' },
  { key: 'payments', label: 'Payments due' },
  { key: 'deadlines', label: 'Upcoming deadlines' },
  { key: 'dayplan', label: 'Today’s plan' },
  { key: 'done', label: 'Done' },
];

const ORDER_KNOWN = new Set(MYWORK_BLOCK_KEYS);
const HIDE_KNOWN = new Set(MYWORK_OPTIONAL_BLOCKS.map((b) => b.key));

// Keep only known keys, then splice in blocks added after the user last saved —
// next to their default neighbour so a new block lands in a sensible spot.
const normalizeOrder = (order = []) => {
  const clean = order.filter((key) => ORDER_KNOWN.has(key));
  MYWORK_BLOCK_KEYS.forEach((key, defaultIndex) => {
    if (clean.includes(key)) return;
    const prevKey = MYWORK_BLOCK_KEYS[defaultIndex - 1];
    const insertAt = prevKey && clean.includes(prevKey) ? clean.indexOf(prevKey) + 1 : clean.length;
    clean.splice(insertAt, 0, key);
  });
  return clean;
};

const readStored = () => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export function useMyWorkLayout() {
  const [order, setOrder] = useState(MYWORK_BLOCK_KEYS);
  const [hidden, setHidden] = useState([]);

  useEffect(() => {
    const stored = readStored();
    if (!stored) return;
    if (Array.isArray(stored.order)) setOrder(normalizeOrder(stored.order));
    if (Array.isArray(stored.hidden)) setHidden(stored.hidden.filter((k) => HIDE_KNOWN.has(k)));
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
      const next = prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key];
      persist(order, next);
      return next;
    });
  }, [order, persist]);

  // Move `key` so it lands just before `beforeKey` (drag-and-drop reorder).
  const moveBefore = useCallback((key, beforeKey) => {
    if (key === beforeKey) return;
    setOrder((prev) => {
      const next = prev.filter((k) => k !== key);
      const at = beforeKey ? next.indexOf(beforeKey) : next.length;
      next.splice(at < 0 ? next.length : at, 0, key);
      persist(next, hidden);
      return next;
    });
  }, [hidden, persist]);

  const reset = useCallback(() => {
    setOrder(MYWORK_BLOCK_KEYS);
    setHidden([]);
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
  }, []);

  const isOn = useCallback((key) => !hidden.includes(key), [hidden]);
  const isCustomized = hidden.length > 0
    || order.some((key, index) => key !== MYWORK_BLOCK_KEYS[index]);

  return { isOn, toggle, order, moveBefore, reset, isCustomized };
}
