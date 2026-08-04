'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Progress } from 'antd';
import { CheckCircleFilled, CloseOutlined, RightOutlined } from '@ant-design/icons';
import apiClient from '@/src/api/apiClient';
import { useT } from '@/src/i18n/LanguageProvider';
import './OnboardingChecklist.scss';

// Best-practice getting-started checklist (Linear/Stripe/Notion style): a short
// list of first-run setup steps with live completion detection. It links each
// step to the screen that finishes it, shows progress, and disappears for good
// once every step is done or the owner dismisses it. New companies see it; a
// fully set-up company never does.
const dismissKey = (companyId) => `byggexp.onboarding.dismissed.${companyId || 'x'}`;

export default function OnboardingChecklist({ companyId, projectCount, teamCount }) {
  const t = useT();
  const [dismissed, setDismissed] = useState(true); // assume hidden until we know
  const [company, setCompany] = useState(null);
  const [clients, setClients] = useState(0);
  const [billing, setBilling] = useState(0); // offers + invoices
  const [ready, setReady] = useState(false);

  // Read the per-company dismissed flag on mount (client-only; localStorage).
  useEffect(() => {
    try {
      setDismissed(localStorage.getItem(dismissKey(companyId)) === '1');
    } catch {
      setDismissed(false);
    }
  }, [companyId]);

  // Fetch the counts we can't get from the dashboard's own stores. Only runs
  // while the checklist is still visible, so a set-up company pays nothing.
  useEffect(() => {
    if (dismissed) return undefined;
    let alive = true;
    Promise.all([
      apiClient.get('/company/my').then((r) => r.data).catch(() => null),
      apiClient.get('/clients').then((r) => r.data).catch(() => []),
      apiClient.get('/offers').then((r) => r.data).catch(() => []),
      apiClient.get('/invoices').then((r) => r.data).catch(() => []),
    ]).then(([co, cl, of, inv]) => {
      if (!alive) return;
      setCompany(co);
      setClients(Array.isArray(cl) ? cl.length : 0);
      setBilling((Array.isArray(of) ? of.length : 0) + (Array.isArray(inv) ? inv.length : 0));
      setReady(true);
    });
    return () => { alive = false; };
  }, [dismissed]);

  const steps = useMemo(() => [
    {
      key: 'company',
      title: t('Fill in your company details'),
      desc: t('Org. number and address — used on every invoice and offer.'),
      href: '/company/profile',
      done: Boolean(company?.orgNumber),
    },
    {
      key: 'team',
      title: t('Add your team'),
      desc: t('They sign in to the mobile app with their email to log shifts and photos.'),
      href: '/company/users',
      done: (teamCount || 0) > 1,
    },
    {
      key: 'project',
      title: t('Create your first project'),
      desc: t('Projects tie together shifts, tasks, photos and costs.'),
      href: '/company/projects',
      done: (projectCount || 0) > 0,
    },
    {
      key: 'client',
      title: t('Add a client'),
      desc: t('You need a client to send offers and invoices.'),
      href: '/company/invoicing/clients',
      done: clients > 0,
    },
    {
      key: 'billing',
      title: t('Create your first offer or invoice'),
      desc: t('Turn work into money — draft an offer, then invoice it.'),
      href: '/company/invoicing/offers',
      done: billing > 0,
    },
  ], [t, company, teamCount, projectCount, clients, billing]);

  const doneCount = steps.filter((s) => s.done).length;
  const allDone = doneCount === steps.length;

  const dismiss = () => {
    try { localStorage.setItem(dismissKey(companyId), '1'); } catch { /* ignore */ }
    setDismissed(true);
  };

  // Hidden if dismissed, before the counts load, or once everything is done.
  if (dismissed || !ready || allDone) return null;

  return (
    <section className="onboarding" aria-label={t('Getting started')}>
      <div className="onboarding__head">
        <div>
          <h3 className="onboarding__title">{t('Getting started')}</h3>
          <p className="onboarding__sub">{t('A few steps to get your company up and running.')}</p>
        </div>
        <div className="onboarding__progress">
          <Progress
            type="circle"
            size={52}
            percent={Math.round((doneCount / steps.length) * 100)}
            format={() => `${doneCount}/${steps.length}`}
          />
        </div>
        <button type="button" className="onboarding__dismiss" onClick={dismiss} aria-label={t('Dismiss')} title={t('Dismiss')}>
          <CloseOutlined />
        </button>
      </div>

      <ol className="onboarding__list">
        {steps.map((step) => (
          <li key={step.key} className={`onboarding__step${step.done ? ' onboarding__step--done' : ''}`}>
            <span className="onboarding__check" aria-hidden="true">
              {step.done ? <CheckCircleFilled /> : <span className="onboarding__dot" />}
            </span>
            <span className="onboarding__body">
              <span className="onboarding__step-title">{step.title}</span>
              <span className="onboarding__step-desc">{step.desc}</span>
            </span>
            {step.done ? (
              <span className="onboarding__status">{t('Done')}</span>
            ) : (
              <Link href={step.href} className="onboarding__go">
                {t('Set up')} <RightOutlined />
              </Link>
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}
