import { Switch } from 'antd';
import { Button } from '@/src/ui-kit';
import { useT } from '@/src/i18n/LanguageProvider';
import { RULE_WEEKDAYS } from '@/src/features/shifts/hoursUtils';

// "Rules & settings" popover for the Hours grid: the GPS grace window and the
// shift-anchored hours-reminder rule. Rule state lives in useHoursRule; this is
// purely the panel.
export default function HoursRulesPopover({
  open,
  onClose,
  grace,
  setGrace,
  lunch,
  setLunch,
  lunchMin,
  setLunchMin,
  rule,
  ruleSaving,
  setRuleField,
  toggleRuleWeekday,
  saveRule,
}) {
  const t = useT();
  if (!open) return null;
  return (
    <>
      <div className="hours-pop-mask" onClick={onClose} role="presentation" />
      <div className="hours-pop">
        <h4>{t('Rules')}</h4>
        <div className="hours-pop-row">
          <span>{t('Grace window')}<small>{t('GPS drift ignored below this')}</small></span>
          <span><input type="number" value={grace} min={0} step={5} onChange={(e) => setGrace(Number(e.target.value) || 0)} /> min</span>
        </div>
        <div className="hours-pop-row">
          <span>{t('Unpaid lunch')}<small>{t('Deducted from totals on full days')}</small></span>
          <span><input type="number" value={lunch} min={0} step={0.25} onChange={(e) => setLunch(Number(e.target.value) || 0)} /> h</span>
        </div>
        {lunch > 0 ? (
          <div className="hours-pop-row">
            <span>{t('Lunch applies on days ≥')}</span>
            <span><input type="number" value={lunchMin} min={0} step={1} onChange={(e) => setLunchMin(Number(e.target.value) || 0)} /> h</span>
          </div>
        ) : null}
        <p className="hours-pop-note">{t('Planned hours come from the project schedule. Rate is set on the invoice step.')}</p>

        <div className="hours-pop-section">
          <h4>{t('Hours reminder')}</h4>
          <div className="hours-pop-row">
            <span>{t('Remind workers to report hours')}<small>{t('Tied to the scheduled shift end')}</small></span>
            <Switch checked={Boolean(rule?.enabled)} onChange={(v) => setRuleField({ enabled: v })} />
          </div>
          <div style={{ opacity: rule?.enabled ? 1 : 0.45, pointerEvents: rule?.enabled ? 'auto' : 'none' }}>
            <div className="hours-pop-row">
              <span>{t('Start after shift end')}</span>
              <span><input type="number" min={0} step={5} value={rule?.startDelayMinutes ?? 15} onChange={(e) => setRuleField({ startDelayMinutes: Number(e.target.value) || 0 })} /> min</span>
            </div>
            <div className="hours-pop-row">
              <span>{t('Repeat every')}</span>
              <select value={rule?.intervalMinutes ?? 15} onChange={(e) => setRuleField({ intervalMinutes: Number(e.target.value) })}>
                <option value={15}>{t('Every 15 min')}</option>
                <option value={30}>{t('Every 30 min')}</option>
                <option value={60}>{t('Every hour')}</option>
                <option value={1440}>{t('Every day')}</option>
              </select>
            </div>
            <div className="hours-pop-row">
              <span>{t('Notify the boss after')}<small>{t('0 = no escalation. Boss = project manager / owner.')}</small></span>
              <span><input type="number" min={0} max={100} value={rule?.escalateAfterReminders ?? 3} onChange={(e) => setRuleField({ escalateAfterReminders: Number(e.target.value) || 0 })} /> {t('reminders')}</span>
            </div>
            <div className="hours-pop-row hours-pop-row--wrap">
              <span>{t('Days')}</span>
              <span className="hours-pop-days">
                {RULE_WEEKDAYS.map(([lbl, num]) => (
                  <button
                    type="button"
                    key={num}
                    className={`hours-pop-day${(rule?.workingWeekdays || []).includes(num) ? ' is-on' : ''}`}
                    onClick={() => toggleRuleWeekday(num)}
                  >
                    {t(lbl)}
                  </button>
                ))}
              </span>
            </div>
          </div>
          <div className="hours-pop-actions">
            <Button onClick={saveRule} disabled={ruleSaving}>{t('Save changes')}</Button>
          </div>
        </div>
      </div>
    </>
  );
}
