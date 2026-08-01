import { useCallback, useEffect, useState } from 'react';
import { OVERVIEW_BLOCK_KEYS } from '@/src/features/projects/overviewBlocks';

// The chosen order + hidden blocks are a personal preference, so we keep them
// in localStorage rather than on the project. Bump the key suffix if the block
// set changes shape in a way that shouldn't inherit old preferences.
const STORAGE_KEY = 'byggexp.projectOverview.layout.v1';

const KNOWN = new Set(OVERVIEW_BLOCK_KEYS);

// Keep only known keys, then append any blocks that were added after the user
// last saved so new features show up instead of silently staying hidden.
const normalizeOrder = (order = []) => {
  const clean = order.filter((key) => KNOWN.has(key));
  OVERVIEW_BLOCK_KEYS.forEach((key) => {
    if (!clean.includes(key)) clean.push(key);
  });
  return clean;
};

const readStored = () => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.order)) return null;
    return parsed;
  } catch {
    return null;
  }
};

export function useOverviewLayout() {
  const [order, setOrder] = useState(OVERVIEW_BLOCK_KEYS);
  const [hidden, setHidden] = useState([]);

  useEffect(() => {
    const stored = readStored();
    if (!stored) return;
    setOrder(normalizeOrder(stored.order));
    setHidden(Array.isArray(stored.hidden) ? stored.hidden.filter((key) => KNOWN.has(key)) : []);
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

  const move = useCallback((key, direction) => {
    setOrder((prev) => {
      const index = prev.indexOf(key);
      const target = index + direction;
      if (index < 0 || target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      persist(next, hidden);
      return next;
    });
  }, [hidden, persist]);

  // Drag-and-drop: move `key` so it lands just before `beforeKey`.
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
    setOrder(OVERVIEW_BLOCK_KEYS);
    setHidden([]);
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
  }, []);

  const isHidden = useCallback((key) => hidden.includes(key), [hidden]);
  const isCustomized = order.some((key, index) => key !== OVERVIEW_BLOCK_KEYS[index])
    || hidden.length > 0;

  return { order, isHidden, toggle, move, moveBefore, reset, isCustomized };
}
