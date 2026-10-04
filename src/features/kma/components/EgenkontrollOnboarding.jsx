import { useEffect, useState } from 'react';
import { Button } from 'antd';
import { CheckCircleFilled, CloseOutlined } from '@ant-design/icons';
import { useT } from '@/src/i18n/LanguageProvider';
import '@/src/features/kma/kma.scss';

const DISMISS_KEY = 'byggexp.egenkontroll.onboarding.hidden';

// Three-step getting started for the solo Egenkontroll plan. Steps tick off
// from real data; the card disappears when all are done or it is closed.
export default function EgenkontrollOnboarding({ checklists, onNew }) {
  const t = useT();
  const [hidden, setHidden] = useState(true);
  useEffect(() => {
    try { setHidden(localStorage.getItem(DISMISS_KEY) === '1'); } catch { setHidden(false); }
  }, []);

  const steps = [
    { key: 'avtal', label: t('Upload the contract'), done: checklists.length > 0 },
    { key: 'foto', label: t('Add photos from the site'), done: checklists.some((c) => c.photos?.length) },
    { key: 'sign', label: t('Sign'), done: checklists.some((c) => c.status === 'signed') },
  ];
  if (hidden || steps.every((s) => s.done)) return null;

  return (
    <div className="kma-onboarding">
      <ol className="kma-onboarding__steps">
        {steps.map((s, i) => (
          <li key={s.key} className={s.done ? 'is-done' : ''}>
            {s.done ? <CheckCircleFilled /> : <span className="kma-onboarding__num">{i + 1}</span>}
            {s.label}
          </li>
        ))}
      </ol>
      {!steps[0].done ? (
        <Button type="primary" onClick={onNew}>{t('Upload the contract')}</Button>
      ) : null}
      <Button
        type="text"
        size="small"
        icon={<CloseOutlined />}
        aria-label={t('Close')}
        onClick={() => { setHidden(true); try { localStorage.setItem(DISMISS_KEY, '1'); } catch { /* ignore */ } }}
      />
    </div>
  );
}
