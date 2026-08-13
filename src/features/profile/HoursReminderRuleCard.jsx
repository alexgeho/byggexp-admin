import { useEffect, useState } from 'react';
import { Switch, message } from 'antd';
import { ClockCircleOutlined } from '@ant-design/icons';
import { Button } from '@/src/ui-kit';
import apiClient from '@/src/api/apiClient';
import { formatApiError } from '@/src/utils/formError';
import { useT } from '@/src/i18n/LanguageProvider';

const DEFAULTS = {
  enabled: false,
  timeOfDay: '17:00',
  weekdays: [1, 2, 3, 4, 5],
  onlyMissing: true,
};

const WEEKDAYS = [
  ['Mon', 1], ['Tue', 2], ['Wed', 3], ['Thu', 4], ['Fri', 5], ['Sat', 6], ['Sun', 7],
];

const smallInput = {
  font: 'inherit', fontSize: 13, padding: '4px 8px', border: '1px solid var(--border,#e2e8f0)',
  borderRadius: 8, background: 'var(--surface,#fff)', color: 'inherit',
};
const chip = {
  minWidth: 44, textAlign: 'center', padding: '7px 10px', borderRadius: 10, cursor: 'pointer',
  border: '1px solid var(--border,#e2e8f0)', fontSize: 13, fontWeight: 600, userSelect: 'none',
};
const chipOn = { borderColor: '#0C77FD', background: 'rgba(12,119,253,.06)', color: '#0C77FD' };

export default function HoursReminderRuleCard({ bare = false }) {
  const t = useT();
  const [s, setS] = useState(DEFAULTS);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    apiClient
      .get('/hours-reminders/rule')
      .then(({ data }) => {
        if (data) {
          setS((prev) => ({
            ...prev,
            enabled: Boolean(data.enabled),
            timeOfDay: data.timeOfDay || prev.timeOfDay,
            weekdays: Array.isArray(data.weekdays) ? data.weekdays : prev.weekdays,
            onlyMissing: data.onlyMissing !== false,
          }));
        }
      })
      .catch(() => {});
  }, []);

  const set = (patch) => setS((prev) => ({ ...prev, ...patch }));

  const toggleWeekday = (num) => setS((prev) => {
    const has = prev.weekdays.includes(num);
    const weekdays = has
      ? prev.weekdays.filter((d) => d !== num)
      : [...prev.weekdays, num].sort((a, b) => a - b);
    return { ...prev, weekdays };
  });

  const save = async () => {
    setSaving(true);
    try {
      await apiClient.put('/hours-reminders/rule', {
        enabled: s.enabled,
        timeOfDay: s.timeOfDay,
        weekdays: s.weekdays,
        onlyMissing: s.onlyMissing,
      });
      message.success(t('Reminder settings saved'));
    } catch (err) {
      if (err?.response?.status === 404) {
        message.info(t('Reminders backend is not deployed yet'));
      } else {
        message.error(formatApiError(err, t('Failed to save reminder settings')));
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={bare ? '' : 'profile-page__card'}>
      <div className="profile-page__card-header">
        <ClockCircleOutlined className="profile-page__card-icon" />
        <div>
          <h3 className="profile-page__card-title">{t('Hours reminder')}</h3>
          <p className="profile-page__card-subtitle">
            {t('Automatically remind workers to report how many hours they worked today.')}
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '11px 0' }}>
        <span style={{ fontSize: 14.5, fontWeight: 500 }}>{t('Enable daily reminder')}</span>
        <Switch checked={s.enabled} onChange={(v) => set({ enabled: v })} />
      </div>

      <div style={{ opacity: s.enabled ? 1 : 0.45, pointerEvents: s.enabled ? 'auto' : 'none' }}>
        <label className="field-label" style={{ display: 'block', marginTop: 14, fontSize: 12, fontWeight: 600, letterSpacing: '.05em', textTransform: 'uppercase', color: 'var(--muted,#64748b)' }}>
          {t('Days')}
        </label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
          {WEEKDAYS.map(([lbl, num]) => (
            <div
              key={num}
              role="button"
              onClick={() => toggleWeekday(num)}
              style={{ ...chip, ...(s.weekdays.includes(num) ? chipOn : {}) }}
            >
              {t(lbl)}
            </div>
          ))}
        </div>

        <label className="field-label" style={{ display: 'block', marginTop: 18, fontSize: 12, fontWeight: 600, letterSpacing: '.05em', textTransform: 'uppercase', color: 'var(--muted,#64748b)' }}>
          {t('Time')}
        </label>
        <input
          type="time"
          value={s.timeOfDay}
          onChange={(e) => set({ timeOfDay: e.target.value })}
          style={{ ...smallInput, marginTop: 8, width: 120 }}
        />

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '11px 0', marginTop: 12, borderTop: '1px solid var(--border,#eef2f7)' }}>
          <span style={{ fontSize: 14.5, fontWeight: 500 }}>
            {t('Only workers who haven’t logged hours')}
          </span>
          <Switch checked={s.onlyMissing} onChange={(v) => set({ onlyMissing: v })} />
        </div>
      </div>

      <p style={{ fontSize: 12.5, color: 'var(--muted,#64748b)', margin: '14px 0 0' }}>
        🔔 {t('Delivered as a push to the worker’s mobile app.')}
      </p>

      <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
        <Button htmlType="button" onClick={save} disabled={saving}>{t('Save changes')}</Button>
      </div>
    </div>
  );
}
