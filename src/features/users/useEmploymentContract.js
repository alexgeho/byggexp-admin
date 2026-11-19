import { useState } from 'react';
import { message } from 'antd';
import apiClient from '@/src/api/apiClient';
import { useAuthStore } from '@/src/store/authStore';
import { useCompanyStore } from '@/src/store/companyStore';
import { useT } from '@/src/i18n/LanguageProvider';
import {
  contractValues, contractFileName, downloadEmploymentContractPdf, employmentContractBase64,
} from '@/src/features/users/employmentContractPdf';

// Anställningsavtal (19.11) — one place for the staff list and the worker card:
// download the PDF or mail it to each worker, filled from the company and
// worker cards, no window in between. Only workers (role Anställd) get one.
export default function useEmploymentContract() {
  const t = useT();
  const signer = useAuthStore((state) => state.user?.name);
  const company = useCompanyStore((state) => state.currentCompany);
  const fetchMy = useCompanyStore((state) => state.fetchMy);
  const [busy, setBusy] = useState(false);

  const run = async (mode, list) => {
    const workers = (list || []).filter((u) => u?.role === 'worker');
    if (!workers.length) {
      message.warning(t('Select workers (role Employee)'));
      return;
    }
    setBusy(true);
    try {
      let card = company;
      if (!card) card = await fetchMy().then(() => useCompanyStore.getState().currentCompany).catch(() => null);
      const valuesOf = (worker) => contractValues({ company: card, worker, signer });
      if (mode === 'download') {
        for (const worker of workers) await downloadEmploymentContractPdf(valuesOf(worker), contractFileName(worker));
        return;
      }
      let ok = 0;
      let fail = 0;
      let error = null;
      for (const worker of workers) {
        try {
          const pdfBase64 = await employmentContractBase64(valuesOf(worker));
          await apiClient.post(`/users/${worker._id}/contract-mail`, { pdfBase64, fileName: contractFileName(worker) });
          ok += 1;
        } catch (err) {
          fail += 1;
          if (!error) error = err?.response?.data?.message || null;
        }
      }
      if (ok) message.success(`${ok} ${t('contracts sent')}`);
      if (fail) message.error(error ? `${fail} ${t('failed')}: ${error}` : `${fail} ${t('failed')}`);
    } finally {
      setBusy(false);
    }
  };

  return { run, busy };
}
