import { useEffect, useState } from 'react';
import apiClient from '@/src/api/apiClient';

// Frånvaro requests and receipts, to show next to each worker's day. Loaded
// quietly: a role that can't read them just sees the day without them.
export function useDayExtras() {
  const [extras, setExtras] = useState({ leaves: [], expenses: [] });

  useEffect(() => {
    let alive = true;
    Promise.all([
      apiClient.get('/leave').then((res) => res.data).catch(() => []),
      apiClient.get('/expenses').then((res) => res.data).catch(() => []),
    ]).then(([leaves, expenses]) => {
      if (!alive) return;
      setExtras({
        leaves: Array.isArray(leaves) ? leaves : [],
        expenses: Array.isArray(expenses) ? expenses : [],
      });
    });
    return () => { alive = false; };
  }, []);

  return extras;
}
