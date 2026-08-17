import { useEffect, useState } from 'react';
import apiClient from '@/src/api/apiClient';

// Loads the per-project financial/headcount summaries the overview tab needs
// (labour cost, team size, supplier + expense costs, approved ÄTA, invoiced
// total). Each is an independent best-effort fetch that resets to 0/null on
// error, so one failing endpoint never blanks the others.
export function useProjectOverviewData(projectId) {
  const [invoicedTotal, setInvoicedTotal] = useState(0);
  const [supplierCost, setSupplierCost] = useState(0);
  const [expenseCost, setExpenseCost] = useState(0);
  const [approvedAta, setApprovedAta] = useState(0);
  const [laborCost, setLaborCost] = useState(0);
  const [teamCount, setTeamCount] = useState(null);

  useEffect(() => {
    if (!projectId) return undefined;
    let active = true;
    apiClient
      .get('/hours/labor-cost')
      .then(({ data }) => { if (active) setLaborCost(Number(data?.byProject?.[projectId]) || 0); })
      .catch(() => { if (active) setLaborCost(0); });
    return () => { active = false; };
  }, [projectId]);

  // Real headcount from the same endpoint the Team card uses, so "Total
  // workers" matches the team list instead of the stale project.workers array.
  useEffect(() => {
    if (!projectId) return undefined;
    let active = true;
    apiClient
      .get(`/users/project/${projectId}`)
      .then(({ data }) => { if (active) setTeamCount(Array.isArray(data) ? data.length : null); })
      .catch(() => { if (active) setTeamCount(null); });
    return () => { active = false; };
  }, [projectId]);

  useEffect(() => {
    if (!projectId) return undefined;
    let active = true;
    apiClient
      .get(`/supplier-invoices/project/${projectId}/summary`)
      .then(({ data }) => { if (active) setSupplierCost(Number(data?.total) || 0); })
      .catch(() => { if (active) setSupplierCost(0); });
    return () => { active = false; };
  }, [projectId]);

  useEffect(() => {
    if (!projectId) return undefined;
    let active = true;
    apiClient
      .get(`/expenses/project/${projectId}/summary`)
      .then(({ data }) => { if (active) setExpenseCost(Number(data?.total) || 0); })
      .catch(() => { if (active) setExpenseCost(0); });
    return () => { active = false; };
  }, [projectId]);

  useEffect(() => {
    if (!projectId) return undefined;
    let active = true;
    apiClient
      .get(`/ata/project/${projectId}/summary`)
      .then(({ data }) => { if (active) setApprovedAta(Number(data?.approvedTotal) || 0); })
      .catch(() => { if (active) setApprovedAta(0); });
    return () => { active = false; };
  }, [projectId]);

  useEffect(() => {
    if (!projectId) {
      return undefined;
    }

    let active = true;

    const loadInvoicedTotal = async () => {
      try {
        const { data } = await apiClient.get('/invoices');
        const total = (data || [])
          .filter((invoice) => {
            const invoiceProjectId = typeof invoice.projectId === 'object'
              ? invoice.projectId?._id
              : invoice.projectId;
            if (!invoiceProjectId || String(invoiceProjectId) !== String(projectId)) return false;
            // Only count issued invoices (sent/overdue/paid) — a draft is not
            // revenue yet, so it must not inflate the project's invoiced total.
            return String(invoice.status || '').toLowerCase() !== 'draft';
          })
          .reduce((sum, invoice) => sum + (Number(invoice.total) || 0), 0);

        if (active) {
          setInvoicedTotal(total);
        }
      } catch {
        if (active) {
          setInvoicedTotal(0);
        }
      }
    };

    void loadInvoicedTotal();

    return () => {
      active = false;
    };
  }, [projectId]);

  return { invoicedTotal, supplierCost, expenseCost, approvedAta, laborCost, teamCount };
}
