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

  const companyCard = async () => company
    || fetchMy().then(() => useCompanyStore.getState().currentCompany).catch(() => null);

  // The worker's saved contract (edited in the window) over the card defaults.
  const valuesFor = (worker, card) => ({
    ...contractValues({ company: card, worker, signer }),
    ...(worker?.employmentContract || {}),
  });

  // The full worker card (salary, personnummer, saved contract) — the worker
  // page only has a summary of it.
  const fullWorker = async (worker) => {
    try {
      const { data } = await apiClient.get(`/users/${worker._id}`);
      return { ...worker, ...data, _id: worker._id };
    } catch {
      return worker;
    }
  };

  const defaults = async (worker) => valuesFor(await fullWorker(worker), await companyCard());

  // Keep the edited fields on the worker so download / e-mail use them later.
  const save = async (worker, values) => {
    const { data } = await apiClient.put(`/users/${worker._id}/contract`, { contract: values });
    return data?.employmentContract || values;
  };

  // overrides: values straight from the edit window (one worker).
  const run = async (mode, list, overrides = null) => {
    const workers = (list || []).filter((u) => u?.role === 'worker');
    if (!workers.length) {
      message.warning(t('Select workers (role Employee)'));
      return;
    }
    setBusy(true);
    try {
      const card = await companyCard();
      const valuesOf = (worker) => (overrides || valuesFor(worker, card));
      // The company's signature scan (Företagsuppgifter), if uploaded.
      const companyId = card?._id || card?.id;
      const sig = companyId
        ? await apiClient.get(`/company/${companyId}/signature`).then((r) => r.data?.dataUrl || null).catch(() => null)
        : null;
      if (!overrides) {
        for (let i = 0; i < workers.length; i += 1) workers[i] = await fullWorker(workers[i]);
      }
      if (mode === 'download') {
        for (const worker of workers) await downloadEmploymentContractPdf(valuesOf(worker), contractFileName(worker), sig);
        return;
      }
      let ok = 0;
      let fail = 0;
      let error = null;
      for (const worker of workers) {
        try {
          const pdfBase64 = await employmentContractBase64(valuesOf(worker), sig);
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

  return { run, busy, save, defaults };
}
