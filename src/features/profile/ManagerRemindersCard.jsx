import { useEffect, useState } from 'react';
import { Switch, message } from 'antd';
import { BellOutlined } from '@ant-design/icons';
import { Button } from '@/src/ui-kit';
import apiClient from '@/src/api/apiClient';
import { useAuthStore } from '@/src/store/authStore';
import { useUserStore } from '@/src/store/userStore';
import { getEntityId } from '@/src/utils/entityId';
import { formatApiError } from '@/src/utils/formError';
import { useT } from '@/src/i18n/LanguageProvider';

const DEFAULTS = {
  mode: 'off',
  intervalHours: 5,
  timeOfDay: '08:00',
  weekday: 1,
  overdueTasks: true,
  unpaidInvoices: true,
  purchaseInvoicesDue: true,
  expensesToApprove: true,
};

const optRow = {
  display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px',
  border: '1px solid var(--border, #e2e8f0)', borderRadius: 11, cursor: 'pointer',
  fontSize: 14, fontWeight: 500,
};
const optOn = { borderColor: '#0C77FD', background: 'rgba(12,119,253,.06)', fontWeight: 600 };
const smallInput = {
  font: 'inherit', fontSize: 13, padding: '4px 8px', border: '1px solid var(--border,#e2e8f0)',
  borderRadius: 8, background: 'var(--surface,#fff)', color: 'inherit',
};

export default function ManagerRemindersCard() {
  const t = useT();
  const user = useAuthStore((state) => state.user);
  const updateUser = useUserStore((state) => state.update);
  const userId = getEntityId(user);
  const [s, setS] = useState(DEFAULTS);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    if (!userId) return;
    apiClient
      .get(`/users/info/${userId}`)
      .then(({ data }) => {
        if (data?.reminderSummary) setS((prev) => ({ ...prev, ...data.reminderSummary }));
      })
      .catch(() => {});
  }, [userId]);

  const set = (patch) => setS((prev) => ({ ...prev, ...patch }));

  const save = async () => {
    setSaving(true);
    try {
      const { lastSentAt, ...clean } = s; // lastSentAt is server-managed
      void lastSentAt;
      await updateUser(userId, { email: user.email, reminderSummary: clean });
      message.success(t('Reminder settings saved'));
    } catch (err) {
      message.error(formatApiError(err, t('Failed to save reminder settings')));
    } finally {
      setSaving(false);
    }
  };

  const sendTest = async () => {
    setTesting(true);
    try {
      const { data } = await apiClient.post('/manager-reminders/test');
      message.success(
        data?.sent ? t('Test reminder sent') : t('Test reminder not sent (push not configured)'),
      );
    } catch (err) {
      message.error(formatApiError(err, t('Failed to send test reminder')));
    } finally {
      setTesting(false);
    }
  };

  const MODES = [
    ['off', t('Off')],
    ['hours', t('Every N hours')],
    ['daily', t('Once a day')],
    ['weekly', t('Weekly')],
  ];
  const WEEKDAYS = [['Mon', 1], ['Tue', 2], ['Wed', 3], ['Thu', 4], ['Fri', 5], ['Sat', 6], ['Sun', 7]];
  const CATS = [
    ['overdueTasks', t('Overdue tasks')],
    ['unpaidInvoices', t('Unpaid & overdue invoices')],
    ['purchaseInvoicesDue', t('Purchase invoices due')],
    ['expensesToApprove', t('Expenses to approve')],
  ];

  return (
    <div className="profile-page__card">
      <div className="profile-page__card-header">
        <BellOutlined className="profile-page__card-icon" />
        <div>
          <h3 className="profile-page__card-title">{t('Reminders')}</h3>
          <p className="profile-page__card-subtitle">
            {t('A periodic summary of overdue tasks, invoices and approvals — you choose how often.')}
          </p>
        </div>
      </div>

      <label className="field-label" style={{ fontSize: 12, fontWeight: 600, letterSpacing: '.05em', textTransform: 'uppercase', color: 'var(--muted,#64748b)' }}>
        {t('How often')}
      </label>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, margin: '10px 0 4px' }}>
        {MODES.map(([value, label]) => (
          <div
            key={value}
            style={{ ...optRow, ...(s.mode === value ? optOn : {}) }}
            onClick={() => set({ mode: value })}
            role="button"
          >
            <span style={{
              width: 16, height: 16, borderRadius: '50%', flex: 'none',
              border: `2px solid ${s.mode === value ? '#0C77FD' : '#94a3b8'}`,
              boxShadow: s.mode === value ? 'inset 0 0 0 3px #0C77FD' : 'none',
            }}
            />
            <span>{label}</span>
            {value === 'hours' && s.mode === 'hours' ? (
              <span style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <input
                  type="number" min={1} max={24} value={s.intervalHours}
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) => set({ intervalHours: Math.min(24, Math.max(1, Number(e.target.value) || 1)) })}
                  style={{ ...smallInput, width: 56, textAlign: 'center', fontWeight: 600, borderColor: '#0C77FD' }}
                />
                <span style={{ fontSize: 13, color: 'var(--muted,#64748b)' }}>{t('hours')}</span>
              </span>
            ) : null}
            {(value === 'daily' || value === 'weekly') && s.mode === value ? (
              <span style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 6 }} onClick={(e) => e.stopPropagation()}>
                {value === 'weekly' ? (
                  <select value={s.weekday} onChange={(e) => set({ weekday: Number(e.target.value) })} style={smallInput}>
                    {WEEKDAYS.map(([lbl, num]) => <option key={num} value={num}>{t(lbl)}</option>)}
                  </select>
                ) : null}
                <input type="time" value={s.timeOfDay} onChange={(e) => set({ timeOfDay: e.target.value })} style={smallInput} />
              </span>
            ) : null}
          </div>
        ))}
      </div>
      <p style={{ fontSize: 12.5, color: 'var(--muted,#64748b)', margin: '10px 0 0' }}>
        🌙 {t('Quiet hours: hourly reminders are only sent 07:00–20:00.')}
      </p>

      <label className="field-label" style={{ display: 'block', marginTop: 22, fontSize: 12, fontWeight: 600, letterSpacing: '.05em', textTransform: 'uppercase', color: 'var(--muted,#64748b)' }}>
        {t('Include in the summary')}
      </label>
      <div style={{ marginTop: 6 }}>
        {CATS.map(([key, label]) => (
          <div key={key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '11px 0', borderTop: '1px solid var(--border,#eef2f7)' }}>
            <span style={{ fontSize: 14.5, fontWeight: 500 }}>{label}</span>
            <Switch checked={Boolean(s[key])} onChange={(v) => set({ [key]: v })} />
          </div>
        ))}
      </div>

      <p style={{ fontSize: 12.5, color: 'var(--muted,#64748b)', margin: '14px 0 0' }}>
        🔔 {t('Delivered as a push + in the in-app bell. Only sent when there is something to report.')}
      </p>

      <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
        <Button htmlType="button" onClick={save} disabled={saving}>{t('Save changes')}</Button>
        <Button variant="secondary" onClick={sendTest} disabled={testing}>{t('Send a test reminder')}</Button>
      </div>
    </div>
  );
}
