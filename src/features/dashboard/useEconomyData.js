import { useEffect, useState } from 'react';
import apiClient from '@/src/api/apiClient';

// Fetches the money lists once and shares them between the Economy and the
// Payments-due blocks, so the two can live as independent dashboard blocks
// without each re-fetching the same three endpoints.
export function useEconomyData() {
  const [data, setData] = useState({ invoices: [], supplier: [], expenses: [] });
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  // Captured once so overdue detection stays stable across re-renders.
  const [now] = useState(() => Date.now());

  useEffect(() => {
    let active = true;
    setLoading(true);
    setFailed(false);

    Promise.all([
      apiClient.get('/invoices').then((res) => res.data).catch(() => null),
      apiClient.get('/supplier-invoices').then((res) => res.data).catch(() => null),
      apiClient.get('/expenses').then((res) => res.data).catch(() => null),
    ]).then(([invoices, supplier, expenses]) => {
      if (!active) return;
      if (!invoices && !supplier && !expenses) {
        setFailed(true);
      }
      setData({
        invoices: Array.isArray(invoices) ? invoices : [],
        supplier: Array.isArray(supplier) ? supplier : [],
        expenses: Array.isArray(expenses) ? expenses : [],
      });
      setLoading(false);
    });

    return () => { active = false; };
  }, []);

  return { data, loading, failed, now };
}
