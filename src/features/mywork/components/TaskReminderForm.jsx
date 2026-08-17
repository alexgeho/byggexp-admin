import { useState } from 'react';
import { Button, Select } from 'antd';
import { useT } from '@/src/i18n/LanguageProvider';
import { REMINDER_INTERVALS, taskHasReminder, toLocalInput } from '@/src/features/mywork/myWorkUtils';

// Popover body for setting a reminder straight on a task row: pick a time and a
// repeat cadence, save, or clear an existing one. Holds its own draft state so
// typing in the picker never re-renders the whole page.
export default function TaskReminderForm({ task, onSave, onClear, onClose }) {
  const t = useT();
  const hasReminder = taskHasReminder(task);
  const initialWhen = task.dueDate
    ? new Date(task.dueDate)
    : (() => { const d = new Date(); d.setHours(17, 0, 0, 0); return d; })();
  const [when, setWhen] = useState(toLocalInput(initialWhen));
  const [repeatMin, setRepeatMin] = useState(
    hasReminder && task.notificationSettings?.remindUntilDone
      ? (Number(task.notificationSettings?.repeatIntervalMinutes) || 15)
      : 0,
  );
  const [busy, setBusy] = useState(false);

  const save = async () => {
    if (!when || busy) return;
    setBusy(true);
    try {
      await onSave({ dueIso: new Date(when).toISOString(), intervalMinutes: repeatMin });
      onClose();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mytasks__remind" style={{ width: 232, display: 'flex', flexDirection: 'column', gap: 10 }}>
      <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, fontWeight: 600 }}>
        {t('Reminder time')}
        <input
          type="datetime-local"
          value={when}
          onChange={(e) => setWhen(e.target.value)}
          style={{ padding: '6px 8px', borderRadius: 8, border: '1px solid var(--border-color, #d9d9d9)', font: 'inherit' }}
        />
      </label>
      <Select
        value={repeatMin}
        onChange={setRepeatMin}
        options={REMINDER_INTERVALS.map((o) => ({ value: o.value, label: t(o.label) }))}
      />
      <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between' }}>
        {hasReminder ? (
          <button
            type="button"
            className="mytasks__remind-clear"
            onClick={async () => { setBusy(true); try { await onClear(); onClose(); } finally { setBusy(false); } }}
            disabled={busy}
            style={{ border: 'none', background: 'none', color: 'var(--color-danger, #c0392b)', cursor: 'pointer', fontSize: 13 }}
          >
            {t('Clear reminder')}
          </button>
        ) : <span />}
        <Button type="primary" size="small" loading={busy} onClick={save} disabled={!when}>
          {t('Save')}
        </Button>
      </div>
    </div>
  );
}
