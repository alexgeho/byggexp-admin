'use client';

import { useEffect, useMemo, useState } from 'react';
import apiClient from '@/src/api/apiClient';
import { useAuthStore } from '@/src/store/authStore';

const isTaskDone = (task) => ['done', 'completed', 'closed'].includes(
  String(task?.status || '').toLowerCase(),
);
const isInvoiceOpen = (invoice) => !['paid', 'cancelled', 'draft'].includes(
  String(invoice?.status || '').toLowerCase(),
);
const dueMs = (value) => {
  if (!value) return null;
  const ms = new Date(value).getTime();
  return Number.isNaN(ms) ? null : ms;
};

// Derives the header bell notifications from live data: overdue task deadlines
// (for everyone), plus overdue supplier invoices to pay and overdue customer
// invoices to collect (owner only). No backend persistence — it always
// reflects the current state.
export function useNotifications() {
  const user = useAuthStore((state) => state.user);
  const [tasks, setTasks] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [supplier, setSupplier] = useState([]);
  const [now] = useState(() => Date.now());

  const isOwner = user?.role === 'companyAdmin';

  useEffect(() => {
    if (!user) return undefined;
    let active = true;

    apiClient.get('/tasks')
      .then((res) => { if (active) setTasks(Array.isArray(res.data) ? res.data : []); })
      .catch(() => { if (active) setTasks([]); });

    if (isOwner) {
      apiClient.get('/invoices')
        .then((res) => { if (active) setInvoices(Array.isArray(res.data) ? res.data : []); })
        .catch(() => { if (active) setInvoices([]); });
      apiClient.get('/supplier-invoices')
        .then((res) => { if (active) setSupplier(Array.isArray(res.data) ? res.data : []); })
        .catch(() => { if (active) setSupplier([]); });
    }

    return () => { active = false; };
  }, [user, isOwner]);

  return useMemo(() => {
    const list = [];

    tasks.forEach((task) => {
      if (isTaskDone(task)) return;
      const due = dueMs(task.dueDate);
      if (!due || due >= now) return;
      list.push({
        id: `task-${task._id || task.id}`,
        type: 'task',
        title: 'Overdue task',
        text: task.taskTitle || task.title || 'Task',
        dueDate: task.dueDate,
        sortTime: due,
      });
    });

    if (isOwner) {
      supplier.forEach((invoice) => {
        if (String(invoice.status || '') === 'paid') return;
        const due = dueMs(invoice.dueDate);
        if (!due || due >= now) return;
        list.push({
          id: `sup-${invoice._id || invoice.id}`,
          type: 'supplier',
          title: 'Overdue purchase invoice',
          text: invoice.supplierName || '—',
          dueDate: invoice.dueDate,
          amount: invoice.total,
          sortTime: due,
        });
      });

      invoices.forEach((invoice) => {
        if (!isInvoiceOpen(invoice)) return;
        const due = dueMs(invoice.dueDate);
        const overdue = String(invoice.status || '') === 'overdue' || (due && due < now);
        if (!overdue) return;
        list.push({
          id: `inv-${invoice._id || invoice.id}`,
          type: 'invoice',
          title: 'Overdue invoice',
          text: invoice.invoiceNumber ? `#${invoice.invoiceNumber}` : '—',
          dueDate: invoice.dueDate,
          amount: invoice.roundedTotal ?? invoice.total,
          sortTime: due || 0,
        });
      });
    }

    return list.sort((a, b) => a.sortTime - b.sortTime);
  }, [tasks, invoices, supplier, now, isOwner]);
}
