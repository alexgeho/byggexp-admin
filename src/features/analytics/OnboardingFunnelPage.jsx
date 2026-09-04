'use client';

import { useEffect, useState } from 'react';
import { Button, Spin } from 'antd';
import { ReloadOutlined, RiseOutlined } from '@ant-design/icons';
import apiClient from '@/src/api/apiClient';
import { appMessage } from '@/src/utils/appMessage';
import { useT } from '@/src/i18n/LanguageProvider';
import './OnboardingFunnelPage.scss';

// Superadmin onboarding funnel: how many distinct companies reach each stage,
// plus the headline activation rate. Reads GET /analytics/onboarding/funnel,
// which returns { stages: [{ event, companies, events }], activatedCompanies }
// in this fixed order: viewed → step-completed → activated → completed.
// Distinct-by-company, so one noisy browser can't skew the counts.

// Copy + role for each stage. `key` matches the backend event; `outcome` marks
// the activation stage as the one that predicts retention (the focal point).
const STAGE_META = {
  onboarding_viewed: {
    label: 'Saw the checklist',
    desc: 'Opened the app and the getting-started checklist rendered.',
  },
  onboarding_step_completed: {
    label: 'Completed a step',
    desc: 'Finished at least one setup step (team, project, client…).',
  },
  company_activated: {
    label: 'Activated',
    desc: 'Reached first value — a real project and an offer or invoice.',
    outcome: true,
  },
  onboarding_completed: {
    label: 'Finished all steps',
    desc: 'Every checklist step is done.',
  },
};

const pct = (part, whole) => (whole > 0 ? Math.round((part / whole) * 100) : 0);

export default function OnboardingFunnelPage() {
  const t = useT();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    apiClient
      .get('/analytics/onboarding/funnel')
      .then(({ data: d }) => setData(d))
      .catch(() => appMessage.error(t('Could not load the onboarding funnel')))
      .finally(() => setLoading(false));
  };

  useEffect(load, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading || !data) {
    return <div className="funnel__spin"><Spin /></div>;
  }

  const stages = (data.stages || []).map((s) => ({
    ...s,
    meta: STAGE_META[s.event] || { label: s.event, desc: '' },
  }));

  const top = stages[0]?.companies || 0; // companies that saw the checklist
  const activated = data.activatedCompanies || 0;
  const activationRate = pct(activated, top);
  const hasData = top > 0;

  return (
    <div className="funnel">
      <header className="funnel__head">
        <div>
          <h1 className="funnel__title">{t('Onboarding funnel')}</h1>
          <p className="funnel__sub">
            {t('Distinct companies reaching each onboarding stage.')}
          </p>
        </div>
        <Button icon={<ReloadOutlined />} onClick={load}>{t('Refresh')}</Button>
      </header>

      {!hasData ? (
        <div className="funnel__empty">
          {t('No onboarding events yet. Data appears once companies start using the app.')}
        </div>
      ) : (
        <>
          {/* Hero: the single number that matters — activation rate. */}
          <section className="funnel__hero">
            <span className="funnel__hero-icon"><RiseOutlined /></span>
            <div className="funnel__hero-body">
              <div className="funnel__hero-value">{activationRate}%</div>
              <div className="funnel__hero-label">{t('Activation rate')}</div>
              <div className="funnel__hero-note">
                {t('{n} of {total} companies activated')
                  .replace('{n}', String(activated))
                  .replace('{total}', String(top))}
              </div>
            </div>
          </section>

          {/* Funnel bars: width relative to the top stage; conversion from the
              previous stage on the right. Activation is the highlighted step. */}
          <section className="funnel__stages">
            {stages.map((s, i) => {
              const prev = i > 0 ? stages[i - 1].companies : null;
              const fromTop = pct(s.companies, top);
              const fromPrev = prev != null ? pct(s.companies, prev) : null;
              const isOutcome = Boolean(s.meta.outcome);
              return (
                <div
                  key={s.event}
                  className={`funnel__row${isOutcome ? ' funnel__row--outcome' : ''}`}
                >
                  <div className="funnel__row-head">
                    <span className="funnel__row-label">
                      {t(s.meta.label)}
                      {isOutcome ? (
                        <span className="funnel__badge">{t('Key outcome')}</span>
                      ) : null}
                    </span>
                    <span className="funnel__row-count">
                      {s.companies}
                      <span className="funnel__row-count-unit">{t('companies')}</span>
                    </span>
                  </div>
                  <div className="funnel__bar-track">
                    <div
                      className="funnel__bar-fill"
                      style={{ width: `${Math.max(fromTop, 2)}%` }}
                    />
                  </div>
                  <div className="funnel__row-foot">
                    <span className="funnel__row-desc">{t(s.meta.desc)}</span>
                    <span className="funnel__row-metrics">
                      {fromPrev != null ? (
                        <span className="funnel__conv" title={t('Conversion from previous step')}>
                          {fromPrev}% →
                        </span>
                      ) : null}
                      <span className="funnel__row-events">
                        {t('{n} events').replace('{n}', String(s.events))}
                      </span>
                    </span>
                  </div>
                </div>
              );
            })}
          </section>
        </>
      )}
    </div>
  );
}
