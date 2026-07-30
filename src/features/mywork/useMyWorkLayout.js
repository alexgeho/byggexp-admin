import { useCallback, useEffect, useState } from 'react';

// Which optional Mitt-arbete blocks the user shows. Personal preference kept in
// localStorage (not account data). Core task horizons always render; only these
// optional panels can be toggled on/off.
const STORAGE_KEY = 'byggexp.mywork.blocks.v1';

export const MYWORK_OPTIONAL_BLOCKS = [
  { key: 'approvals', label: 'To approve' },
  { key: 'payments', label: 'Payments due' },
  { key: 'deadlines', label: 'Upcoming deadlines' },
  { key: 'dayplan', label: 'Today’s plan' },
  { key: 'done', label: 'Done' },
];

const KNOWN = new Set(MYWORK_OPTIONAL_BLOCKS.map((b) => b.key));

export function useMyWorkLayout() {
  const [hidden, setHidden] = useState([]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) setHidden((JSON.parse(raw) || []).filter((k) => KNOWN.has(k)));
    } catch { /* ignore */ }
  }, []);

  const toggle = useCallback((key) => {
    setHidden((prev) => {
      const next = prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key];
      if (typeof window !== 'undefined') {
        try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch { /* ignore */ }
      }
      return next;
    });
  }, []);

  const isOn = useCallback((key) => !hidden.includes(key), [hidden]);

  return { isOn, toggle };
}
