import { useEffect, useRef } from 'react';

// Keep a multi-step create form's progress so closing the modal (or a crash)
// mid-way doesn't lose what was typed. We persist locally rather than creating a
// server-side draft record: no half-filled rows pollute the database, and the
// exact user-visible goal — "come back and it's still there" — is met on the
// same browser. Cleared on successful submit or cancel.
//
// Only for JSON-serialisable forms (text / select / switch). Forms with dayjs
// pickers or File values need custom (de)serialisation and shouldn't use this.
//
// Usage:
//   const draft = useWizardDraft({ storageKey, form, enabled: isCreate, setStep });
//   <Form onValuesChange={() => draft.save(step)} ...>
//   // on Next/Back: draft.save(nextStep)
//   // on submit success / cancel: draft.clear()
export default function useWizardDraft({ storageKey, form, enabled, setStep }) {
  const restoredRef = useRef(false);
  // Saves are blocked until the initial restore has run, so the form's own
  // init defaults can't clobber a saved draft before we read it back.
  const readyRef = useRef(false);

  // Restore once when the wizard opens.
  useEffect(() => {
    if (!enabled || restoredRef.current || !storageKey) return;
    restoredRef.current = true;
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const draft = JSON.parse(raw);
        if (draft && typeof draft === 'object') {
          if (draft.values && typeof draft.values === 'object') {
            form.setFieldsValue(draft.values);
          }
          if (typeof draft.step === 'number' && setStep) setStep(draft.step);
        }
      }
    } catch { /* corrupt/absent draft: start clean */ }
    readyRef.current = true;
  }, [enabled, storageKey, form, setStep]);

  const save = (step) => {
    if (!enabled || !storageKey || !readyRef.current) return;
    try {
      const values = form.getFieldsValue(true);
      localStorage.setItem(storageKey, JSON.stringify({ values, step }));
    } catch { /* quota/serialisation issue: skip, non-fatal */ }
  };

  const clear = () => {
    if (!storageKey) return;
    try { localStorage.removeItem(storageKey); } catch { /* ignore */ }
  };

  return { save, clear };
}
