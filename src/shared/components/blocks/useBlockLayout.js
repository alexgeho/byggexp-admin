import { useCallback, useEffect, useMemo, useState } from 'react';

// Generic personal block layout — which blocks are hidden and in what order.
// One hook for every drag-reorderable block grid (dashboard Overview, project
// Overview tab, …). The order + hidden set are a per-user preference, so they
// live in localStorage rather than on the account. Callers pass the canonical
// block-key list and a storage key:
//
//   const layout = useBlockLayout({ blockKeys: DASHBOARD_BLOCK_KEYS, storageKey: 'byggexp.dashboard.layout.v2' });
//
// Bump the storage-key suffix if the block set changes shape in a way that
// shouldn't inherit old preferences.
export function useBlockLayout({ blockKeys, storageKey }) {
  const known = useMemo(() => new Set(blockKeys), [blockKeys]);

  // Keep only known keys, then splice in blocks added after the user last saved
  // — next to their default neighbour (not silently at the bottom) so a new
  // block lands right after the one it shipped beside instead of dropping to
  // the end.
  const normalizeOrder = useCallback((order = []) => {
    const clean = order.filter((key) => known.has(key));
    blockKeys.forEach((key, defaultIndex) => {
      if (clean.includes(key)) return;
      const prevKey = blockKeys[defaultIndex - 1];
      const insertAt = prevKey && clean.includes(prevKey) ? clean.indexOf(prevKey) + 1 : clean.length;
      clean.splice(insertAt, 0, key);
    });
    return clean;
  }, [blockKeys, known]);

  const readStored = useCallback(() => {
    if (typeof window === 'undefined') return null;
    try {
      const raw = window.localStorage.getItem(storageKey);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }, [storageKey]);

  const [order, setOrder] = useState(blockKeys);
  const [hidden, setHidden] = useState([]);

  useEffect(() => {
    const stored = readStored();
    if (!stored) return;
    if (Array.isArray(stored.order)) setOrder(normalizeOrder(stored.order));
    if (Array.isArray(stored.hidden)) setHidden(stored.hidden.filter((key) => known.has(key)));
  }, [readStored, normalizeOrder, known]);

  const persist = useCallback((nextOrder, nextHidden) => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(storageKey, JSON.stringify({ order: nextOrder, hidden: nextHidden }));
    } catch {
      /* storage unavailable — keep the in-memory state anyway */
    }
  }, [storageKey]);

  const toggle = useCallback((key) => {
    setHidden((prev) => {
      const next = prev.includes(key) ? prev.filter((item) => item !== key) : [...prev, key];
      persist(order, next);
      return next;
    });
  }, [order, persist]);

  // arrayMove-style reorder for dnd-kit: move activeKey into overKey's slot.
  const reorder = useCallback((activeKey, overKey) => {
    if (activeKey === overKey) return;
    setOrder((prev) => {
      const from = prev.indexOf(activeKey);
      const to = prev.indexOf(overKey);
      if (from < 0 || to < 0) return prev;
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      persist(next, hidden);
      return next;
    });
  }, [hidden, persist]);

  const reset = useCallback(() => {
    setOrder(blockKeys);
    setHidden([]);
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.removeItem(storageKey);
    } catch {
      /* ignore */
    }
  }, [blockKeys, storageKey]);

  const isHidden = useCallback((key) => hidden.includes(key), [hidden]);
  const isCustomized = hidden.length > 0 || order.some((key, index) => key !== blockKeys[index]);

  return { order, isHidden, toggle, reorder, reset, isCustomized };
}
