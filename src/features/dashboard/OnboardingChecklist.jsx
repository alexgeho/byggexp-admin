'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { Progress } from 'antd';
import { CheckCircleFilled, CloseOutlined, FileTextOutlined, RightOutlined, TeamOutlined } from '@ant-design/icons';
import apiClient from '@/src/api/apiClient';
import { useT } from '@/src/i18n/LanguageProvider';
import { track, trackOnce } from '@/src/shared/analytics';
import {
  ACTIVATION_EVENT,
  isActivated,
  stepsForFocus,
  nextFocus,
} from '@/src/features/onboarding/activation';
import './OnboardingChecklist.scss';

// Best-practice getting-started checklist (Linear/Stripe/Notion style): a short
// list of first-run setup steps with live completion detection. It links each
// step to the screen that finishes it, shows progress, and disappears for good
// once every step is done or the owner dismisses it. New companies see it; a
// fully set-up company never does.
// View state per company: 'open' (full checklist), 'collapsed' (a compact
// "Getting started" bar you can re-open), or 'hidden' (removed for good — only
// the Help page brings it back). Closing the full list collapses it to the bar,
// so the way back stays visible; the bar's × hides it. Everything disappears
// once every step is done — it never lingers.
export const viewKey = (companyId) => `byggexp.onboarding.view.${companyId || 'x'}`;
const legacyDismissKey = (companyId) => `byggexp.onboarding.dismissed.${companyId || 'x'}`;
const focusKey = (companyId) => `byggexp.onboarding.focus.${companyId || 'x'}`;

// Read the stored view, migrating the old boolean "dismissed" flag → collapsed
// so previously-dismissed owners get the re-open bar back instead of nothing.
function readView(companyId) {
  try {
    const v = localStorage.getItem(viewKey(companyId));
    if (v === 'open' || v === 'collapsed' || v === 'hidden') return v;
    if (localStorage.getItem(legacyDismissKey(companyId)) === '1') return 'collapsed';
  } catch { /* ignore */ }
  return 'open';
}

// The single routing question (research: one question that reshapes the path).
// It's the FIRST decision — surfaced as two prominent choice cards before the
// steps appear. Skippable; it only reorders the steps, never hides one.
const FOCUS_OPTIONS = [
  {
    key: 'fieldwork',
    label: 'Manage crews & jobs on site',
    desc: 'Projects, teams and shifts out on site',
    icon: <TeamOutlined />,
  },
  {
    key: 'billing',
    label: 'Offers, invoices & getting paid',
    desc: 'From offer to invoice — and get paid',
    icon: <FileTextOutlined />,
  },
];

export default function OnboardingChecklist({ companyId, projectCount, teamCount }) {
  const t = useT();
  const [view, setViewState] = useState('hidden'); // assume hidden until we read localStorage
  const [company, setCompany] = useState(null);
  const [clients, setClients] = useState(0);
  const [billing, setBilling] = useState(0); // offers + invoices
  const [articles, setArticles] = useState(0);
  const [ready, setReady] = useState(false);
  const [focus, setFocus] = useState(null); // null = question not answered yet
  const doneRef = useRef(null); // remembers which steps were done, to detect flips
  const reconciledRef = useRef(false); // server↔local reconciliation runs once
  const [celebrate, setCelebrate] = useState(false); // show the "all done" moment

  // Persist the onboarding state server-side (per-company, shared across the
  // owner's browsers/devices). Fire-and-forget: localStorage stays the instant
  // cache, the server is the source of truth on the next load. No-op without a
  // company id (e.g. superadmin viewing).
  const persistOnboarding = (patch) => {
    if (!companyId) return;
    apiClient.patch(`/company/${companyId}/onboarding`, patch).catch(() => { /* offline: cache only */ });
  };

  const setView = (next) => {
    try { localStorage.setItem(viewKey(companyId), next); } catch { /* ignore */ }
    setViewState(next);
    persistOnboarding({ view: next });
  };

  // Read the per-company view + focus flags on mount (client-only). These are
  // the instant cache; the server value reconciles them once counts load.
  useEffect(() => {
    setViewState(readView(companyId));
    try { setFocus(localStorage.getItem(focusKey(companyId)) || null); } catch { /* ignore */ }
  }, [companyId]);

  const chooseFocus = (value) => {
    try { localStorage.setItem(focusKey(companyId), value); } catch { /* ignore */ }
    setFocus(value);
    persistOnboarding({ focus: value });
    track('onboarding_routing_answered', { companyId, focus: value });
  };

  // Re-open the routing question after it's been answered/skipped.
  const resetFocus = () => {
    try { localStorage.removeItem(focusKey(companyId)); } catch { /* ignore */ }
    setFocus(null);
    persistOnboarding({ focus: null });
  };

  // Reconcile the server's stored onboarding state with the local cache, once.
  // Server wins when it holds real data (so the choice follows the account
  // across devices); if the server is still at defaults, migrate any existing
  // local state up to it.
  const reconcileOnboarding = (srv) => {
    if (reconciledRef.current) return;
    reconciledRef.current = true;
    const srvFocus = srv?.focus ?? null;
    const srvView = srv?.view || 'open';
    let localView = 'open';
    let localFocus = null;
    try {
      localView = readView(companyId);
      localFocus = localStorage.getItem(focusKey(companyId)) || null;
    } catch { /* ignore */ }

    if (srvFocus !== null || srvView !== 'open') {
      // Server has been set before — adopt it and refresh the local cache.
      setViewState(srvView);
      setFocus(srvFocus);
      try {
        localStorage.setItem(viewKey(companyId), srvView);
        if (srvFocus) localStorage.setItem(focusKey(companyId), srvFocus);
        else localStorage.removeItem(focusKey(companyId));
      } catch { /* ignore */ }
    } else if (localView !== 'open' || localFocus) {
      // First run since server-persist shipped: push local choices up.
      persistOnboarding({ view: localView, focus: localFocus });
    }
  };

  // Fetch the counts we can't get from the dashboard's own stores. Runs unless
  // fully hidden — the collapsed bar still needs progress + all-done detection.
  useEffect(() => {
    if (view === 'hidden') return undefined;
    let alive = true;
    Promise.all([
      apiClient.get('/company/my').then((r) => r.data).catch(() => null),
      apiClient.get('/clients').then((r) => r.data).catch(() => []),
      apiClient.get('/offers').then((r) => r.data).catch(() => []),
      apiClient.get('/invoices').then((r) => r.data).catch(() => []),
      apiClient.get('/articles').then((r) => r.data).catch(() => []),
    ]).then(([co, cl, of, inv, art]) => {
      if (!alive) return;
      setCompany(co);
      reconcileOnboarding(co?.onboarding);
      setClients(Array.isArray(cl) ? cl.length : 0);
      setBilling((Array.isArray(of) ? of.length : 0) + (Array.isArray(inv) ? inv.length : 0));
      setArticles(Array.isArray(art) ? art.length : 0);
      setReady(true);
    });
    return () => { alive = false; };
    // reconcileOnboarding is intentionally omitted — it self-guards with a ref
    // and must not re-run the fetch on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view]);

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
        key: 'article',
        title: t('Add your articles'),
        desc: t('The products and services you sell — add them once, use them on every offer.'),
        href: '/company/invoicing/articles?create=1',
        done: articles > 0,
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
    return stepsForFocus(base, focus);
  }, [t, company, teamCount, projectCount, clients, billing, articles, focus]);

  const doneCount = steps.filter((s) => s.done).length;
  const allDone = doneCount === steps.length;

  // Attention hierarchy: the first not-done step (in focus order) is the single
  // "do this next" focal point — highlighted with a primary CTA. Every other
  // pending step is de-emphasised (muted, text link) so the eye lands on one
  // clear next action instead of a flat list of equals.
  const activeKey = steps.find((s) => !s.done)?.key || null;

  // Heading reflects the chosen path so it reads like a continuation of the
  // routing question ("Kom igång med …"). Default/skip keeps the plain title.
  const headingKey = focus === 'fieldwork'
    ? 'Get started with crews & jobs'
    : focus === 'billing'
      ? 'Get started with offers & invoices'
      : 'Getting started';

  // Closing the full list collapses it to the compact bar (way back stays
  // visible); the bar's × hides it entirely.
  const collapse = () => {
    track('onboarding_dismissed', { companyId, doneCount, total: steps.length });
    setView('collapsed');
  };
  const hide = () => setView('hidden');
  const expand = () => setView('open');

  // Step-level instrumentation (research: measure the funnel, not just the end).
  // Fires once when the checklist first becomes visible, then on each step that
  // flips to done, on full completion, and on the activation event.
  useEffect(() => {
    if (view === 'hidden' || !ready) return;
    trackOnce(`onboarding_viewed.${companyId}`, 'onboarding_viewed', { companyId });
    const prev = doneRef.current;
    if (prev) {
      steps.forEach((s) => {
        if (s.done && prev[s.key] === false) {
          track('onboarding_step_completed', { companyId, step: s.key });
        }
      });
      // Celebrate only when the LAST step flips to done in this session — a
      // company that was already fully set up on load never sees it.
      const prevAllDone = steps.length > 0 && steps.every((s) => prev[s.key]);
      if (!prevAllDone && allDone) setCelebrate(true);
    }
    doneRef.current = Object.fromEntries(steps.map((s) => [s.key, s.done]));
    if (isActivated({ projectCount, billingCount: billing })) {
      trackOnce(`${ACTIVATION_EVENT}.${companyId}`, ACTIVATION_EVENT, { companyId });
    }
    if (allDone) {
      trackOnce(`onboarding_completed.${companyId}`, 'onboarding_completed', { companyId });
    }
  }, [view, ready, steps, allDone, companyId, projectCount, billing]);

  // Nothing before counts load or when fully hidden.
  if (!ready || view === 'hidden') return null;

  // All steps done: a brief celebration the session it completed (a company
  // that was already set up on load never triggered `celebrate`, so it stays
  // silent). Dismiss hides it for good.
  if (allDone) {
    if (!celebrate) return null;
    return (
      <section className="onboarding onboarding--done" aria-label={t('Getting started')}>
        <span className="onboarding__done-icon" aria-hidden="true"><CheckCircleFilled /></span>
        <div className="onboarding__done-body">
          <h3 className="onboarding__done-title">{t('You’re all set! 🎉')}</h3>
          <p className="onboarding__done-sub">
            {t('Your company is ready to go — you can reopen this anytime from Help.')}
          </p>
        </div>
        <button type="button" className="onboarding__done-btn" onClick={hide}>
          {t('Done')}
        </button>
      </section>
    );
  }

  // Collapsed: a compact bar that re-opens the checklist (× removes it).
  if (view === 'collapsed') {
    return (
      <section className="onboarding onboarding--bar" aria-label={t('Getting started')}>
        <button type="button" className="onboarding__bar-main" onClick={expand}>
          <Progress
            type="circle"
            size={30}
            percent={Math.round((doneCount / steps.length) * 100)}
            format={() => ''}
          />
          <span className="onboarding__bar-title">{t('Getting started')}</span>
          <span className="onboarding__bar-count">{doneCount}/{steps.length}</span>
          <span className="onboarding__bar-cta">{t('Resume')} <RightOutlined /></span>
        </button>
        <button type="button" className="onboarding__dismiss" onClick={hide} aria-label={t('Dismiss')} title={t('Dismiss')}>
          <CloseOutlined />
        </button>
      </section>
    );
  }

  return (
    <section className="onboarding" aria-label={t('Getting started')} data-tour="checklist">
      <div className="onboarding__head">
        <div>
          <h3 className="onboarding__title">{t(headingKey)}</h3>
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
        <button type="button" className="onboarding__dismiss" onClick={collapse} aria-label={t('Dismiss')} title={t('Dismiss')}>
          <CloseOutlined />
        </button>
      </div>

      {focus === null ? (
        // First decision: two prominent choice cards. The step list stays hidden
        // until the path is picked (or skipped), so the choice is unmissable.
        <div className="onboarding__routing" role="group" aria-label={t('What matters most right now?')}>
          <p className="onboarding__routing-q">{t('What matters most right now?')}</p>
          <div className="onboarding__routing-cards">
            {FOCUS_OPTIONS.map((o) => (
              <button
                key={o.key}
                type="button"
                className="onboarding__focus-card"
                onClick={() => chooseFocus(o.key)}
              >
                <span className="onboarding__focus-icon" aria-hidden="true">{o.icon}</span>
                <span className="onboarding__focus-text">
                  <span className="onboarding__focus-title">{t(o.label)}</span>
                  <span className="onboarding__focus-desc">{t(o.desc)}</span>
                </span>
                <RightOutlined className="onboarding__focus-arrow" />
              </button>
            ))}
          </div>
          <button
            type="button"
            className="onboarding__routing-skip"
            onClick={() => chooseFocus('skip')}
          >
            {t('Skip')}
          </button>
        </div>
      ) : null}

      {focus !== null ? (
      <ol className="onboarding__list">
        {steps.map((step) => {
          const isActive = step.key === activeKey;
          const cls = [
            'onboarding__step',
            step.done && 'onboarding__step--done',
            isActive && 'onboarding__step--active',
            !step.done && !isActive && 'onboarding__step--upcoming',
          ].filter(Boolean).join(' ');
          return (
            <li key={step.key} className={cls}>
              <span className="onboarding__check" aria-hidden="true">
                {step.done ? <CheckCircleFilled /> : <span className="onboarding__dot" />}
              </span>
              <span className="onboarding__body">
                {isActive ? <span className="onboarding__eyebrow">{t('Start here')}</span> : null}
                <span className="onboarding__step-title">{step.title}</span>
                <span className="onboarding__step-desc">{step.desc}</span>
              </span>
              {step.done ? (
                <span className="onboarding__status">{t('Done')}</span>
              ) : (
                <Link
                  href={step.href}
                  className={`onboarding__go${isActive ? ' onboarding__go--primary' : ' onboarding__go--muted'}`}
                >
                  {t('Set up')} <RightOutlined />
                </Link>
              )}
            </li>
          );
        })}
      </ol>
      ) : null}

      {nextFocus(focus) ? (
        <button
          type="button"
          className="onboarding__routing-next"
          onClick={() => chooseFocus(nextFocus(focus))}
        >
          {t(FOCUS_OPTIONS.find((o) => o.key === nextFocus(focus))?.label || '')}
          <RightOutlined />
        </button>
      ) : null}
    </section>
  );
}
