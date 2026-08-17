import { useEffect, useState } from 'react';
import { useT } from '@/src/i18n/LanguageProvider';
import { appMessage } from '@/src/utils/appMessage';
import { getHoursRule, updateHoursRule } from '@/src/api/hoursReminders';

// Owns the company-wide, shift-anchored "log your hours" reminder rule: loads it
// once, exposes patch/toggle helpers and a save action with user feedback.
export function useHoursRule() {
  const t = useT();
  const [rule, setRule] = useState(null);
  const [ruleSaving, setRuleSaving] = useState(false);

  useEffect(() => {
    getHoursRule().then(setRule).catch(() => {});
  }, []);

  const setRuleField = (patch) => setRule((prev) => ({ ...(prev || {}), ...patch }));

  const toggleRuleWeekday = (num) => setRule((prev) => {
    const days = Array.isArray(prev?.workingWeekdays) ? prev.workingWeekdays : [];
    const next = days.includes(num) ? days.filter((d) => d !== num) : [...days, num].sort((a, b) => a - b);
    return { ...(prev || {}), workingWeekdays: next };
  });

  const saveRule = async () => {
    setRuleSaving(true);
    try {
      const saved = await updateHoursRule({
        enabled: Boolean(rule?.enabled),
        startDelayMinutes: Number(rule?.startDelayMinutes) || 0,
        intervalMinutes: Number(rule?.intervalMinutes) || 15,
        maxReminders: Number(rule?.maxReminders) || 0,
        escalateAfterReminders: Number(rule?.escalateAfterReminders) || 0,
        workingWeekdays: Array.isArray(rule?.workingWeekdays) ? rule.workingWeekdays : [1, 2, 3, 4, 5],
      });
      setRule(saved);
      appMessage.success(t('Reminder settings saved'));
    } catch (err) {
      appMessage.error(
        err?.response?.status === 404
          ? t('Reminders backend is not deployed yet')
          : t('Failed to save reminder settings'),
      );
    } finally {
      setRuleSaving(false);
    }
  };

  return { rule, ruleSaving, setRuleField, toggleRuleWeekday, saveRule };
}
