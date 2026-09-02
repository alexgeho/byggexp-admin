'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { Progress } from 'antd';
import { CheckCircleFilled, CloseOutlined, RightOutlined } from '@ant-design/icons';
import apiClient from '@/src/api/apiClient';
import { useT } from '@/src/i18n/LanguageProvider';
import { track, trackOnce } from '@/src/shared/analytics';
import {
  ACTIVATION_EVENT,
  isActivated,
  orderStepsByFocus,
} from '@/src/features/onboarding/activation';
import './OnboardingChecklist.scss';

// Best-practice getting-started checklist (Linear/Stripe/Notion style): a short
// list of first-run setup steps with live completion detection. It links each
// step to the screen that finishes it, shows progress, and disappears for good
// once every step is done or the owner dismisses it. New companies see it; a
// fully set-up company never does.
const dismissKey = (companyId) => `byggexp.onboarding.dismissed.${companyId || 'x'}`;
const focusKey = (companyId) => `byggexp.onboarding.focus.${companyId || 'x'}`;

// The single routing question (research: one question that reshapes the path).
// Skippable; it only reorders the steps, never hides one.
const FOCUS_OPTIONS = [
  { key: 'fieldwork', label: 'Manage crews & jobs on site' },
  { key: 'billing', label: 'Offers, invoices & getting paid' },
];

export default function OnboardingChecklist({ companyId, projectCount, teamCount }) {
  const t = useT();
  const [dismissed, setDismissed] = useState(true); // assume hidden until we know
  const [company, setCompany] = useState(null);
  const [clients, setClients] = useState(0);
  const [billing, setBilling] = useState(0); // offers + invoices
  const [ready, setReady] = useState(false);
  const [focus, setFocus] = useState(null); // null = question not answered yet
  const doneRef = useRef(null); // remembers which steps were done, to detect flips

  // Read the per-company dismissed + focus flags on mount (client-only).
  useEffect(() => {
    try {
      setDismissed(localStorage.getItem(dismissKey(companyId)) === '1');
      setFocus(localStorage.getItem(focusKey(companyId)) || null);
    } catch {
      setDismissed(false);
    }
  }, [companyId]);

  const chooseFocus = (value) => {
    try { localStorage.setItem(focusKey(companyId), value); } catch { /* ignore */ }
    setFocus(value);
    track('onboarding_routing_answered', { companyId, focus: value });
  };

  // Re-open the routing question after it's been answered/skipped.
  const resetFocus = () => {
    try { localStorage.removeItem(focusKey(companyId)); } catch { /* ignore */ }
    setFocus(null);
  };

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

  const steps = useMemo(() => {
    // Each step deep-links straight into the flow that completes it: list pages
    // read `?create=1` and open their create modal on arrival.
    const base = [
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
        href: '/company/users?create=1',
        done: (teamCount || 0) > 1,
      },
      {
        key: 'project',
        title: t('Create your first project'),
        desc: t('Projects tie together shifts, tasks, photos and costs.'),
        href: '/company/projects?create=1',
        done: (projectCount || 0) > 0,
      },
      {
        key: 'client',
        title: t('Add a client'),
        desc: t('You need a client to send offers and invoices.'),
        href: '/company/invoicing/clients?create=1',
        done: clients > 0,
      },
      {
        key: 'billing',
        title: t('Create your first offer or invoice'),
        desc: t('Turn work into money — draft an offer, then invoice it.'),
        href: '/company/invoicing/offers?create=1',
        done: billing > 0,
      },
    ];
    return orderStepsByFocus(base, focus);
  }, [t, company, teamCount, projectCount, clients, billing, focus]);

  const doneCount = steps.filter((s) => s.done).length;
  const allDone = doneCount === steps.length;

  const dismiss = () => {
    try { localStorage.setItem(dismissKey(companyId), '1'); } catch { /* ignore */ }
    track('onboarding_dismissed', { companyId, doneCount, total: steps.length });
    setDismissed(true);
  };

  // Step-level instrumentation (research: measure the funnel, not just the end).
  // Fires once when the checklist first becomes visible, then on each step that
  // flips to done, on full completion, and on the activation event.
  useEffect(() => {
    if (dismissed || !ready) return;
    trackOnce(`onboarding_viewed.${companyId}`, 'onboarding_viewed', { companyId });
    const prev = doneRef.current;
    if (prev) {
      steps.forEach((s) => {
        if (s.done && prev[s.key] === false) {
          track('onboarding_step_completed', { companyId, step: s.key });
        }
      });
    }
    doneRef.current = Object.fromEntries(steps.map((s) => [s.key, s.done]));
    if (isActivated({ projectCount, billingCount: billing })) {
      trackOnce(`${ACTIVATION_EVENT}.${companyId}`, ACTIVATION_EVENT, { companyId });
    }
    if (allDone) {
      trackOnce(`onboarding_completed.${companyId}`, 'onboarding_completed', { companyId });
    }
  }, [dismissed, ready, steps, allDone, companyId, projectCount, billing]);

  // Hidden if dismissed, before the counts load, or once everything is done.
  if (dismissed || !ready || allDone) return null;

  return (
    <section className="onboarding" aria-label={t('Getting started')} data-tour="checklist">
      <div className="onboarding__head">
        <div>
          <h3 className="onboarding__title">{t('Getting started')}</h3>
          <p className="onboarding__sub">
            {t('A few steps to get your company up and running.')}
            {focus !== null ? (
              <button type="button" className="onboarding__routing-reset" onClick={resetFocus}>
                {t('Change focus')}
              </button>
            ) : null}
          </p>
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

      {focus === null ? (
        <div className="onboarding__routing" role="group" aria-label={t('What matters most right now?')}>
          <p className="onboarding__routing-q">{t('What matters most right now?')}</p>
          <div className="onboarding__routing-opts">
            {FOCUS_OPTIONS.map((o) => (
              <button
                key={o.key}
                type="button"
                className="onboarding__routing-opt"
                onClick={() => chooseFocus(o.key)}
              >
                {t(o.label)}
              </button>
            ))}
            <button
              type="button"
              className="onboarding__routing-skip"
              onClick={() => chooseFocus('skip')}
            >
              {t('Skip')}
            </button>
          </div>
        </div>
      ) : null}

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
