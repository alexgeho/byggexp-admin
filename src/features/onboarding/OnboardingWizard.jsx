'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Progress } from 'antd';
import { CheckCircleFilled, CloseOutlined, RightOutlined, ArrowRightOutlined } from '@ant-design/icons';
import apiClient from '@/src/api/apiClient';
import { useT } from '@/src/i18n/LanguageProvider';
import { useNavigate } from '@/src/shared/routing/routerCompat';
import { track } from '@/src/shared/analytics';
import AdminModal from '@/src/shared/components/AdminModal';
import ProjectCreateForm from '@/src/features/projects/components/ProjectCreateForm';
import UserCreateForm from '@/src/features/users/components/UserCreateForm';
import TaskCreateForm from '@/src/features/tasks/components/TaskCreateForm';
import ToolCreateForm from '@/src/features/tools/components/ToolCreateForm';
import ClientCreateForm from '@/src/features/clients/components/ClientCreateForm';
import ArticleCreateForm from '@/src/features/articles/components/ArticleCreateForm';
import { viewKey, focusKey } from '@/src/features/dashboard/OnboardingChecklist';
import {
  buildOnboardingSteps,
  stepsForFocus,
  nextFocus,
} from '@/src/features/onboarding/activation';
import { ONBOARDING_CHANGE_EVENT, emitOnboardingChange } from '@/src/features/onboarding/onboardingStorage';
import './OnboardingWizard.scss';

// Full-screen, step-by-step onboarding gate. Shown to a company admin whose
// onboarding is still "open" (the same per-company view state the dashboard
// checklist uses) — it walks them through the first-run setup one action at a
// time, before dropping them on an empty dashboard. Each step opens the SAME
// create modal the matching list page uses (no re-implemented forms). It shares
// storage with the checklist, so "Skip for now" collapses to the checklist bar
// and completing everything hides both.
const FOCUS_OPTIONS = [
  { key: 'fieldwork', label: 'Manage projects or crews', hint: 'Get a job running, crews logging time, work assigned.' },
  { key: 'billing', label: 'Send an invoice or offer', hint: 'Company details, clients, articles, then invoice.' },
];

// Steps whose create flow is a modal form we can open in place. company/billing
// are full pages, so those fall back to navigating to the deep-link.
const FORM_REGISTRY = {
  project: { Form: ProjectCreateForm, formId: 'project-create-form', title: 'Create project', selfNav: true },
  team: { Form: UserCreateForm, formId: 'user-create-form', title: 'Create user', selfNav: true, props: { guided: true } },
  client: { Form: ClientCreateForm, formId: 'client-create-form', title: 'Create client', selfNav: true },
  task: { Form: TaskCreateForm, formId: 'task-create-form', title: 'Create task' },
  tools: { Form: ToolCreateForm, formId: 'tool-create-form', title: 'Create tool' },
  article: { Form: ArticleCreateForm, formId: 'article-create-form', title: 'Create article' },
};

function readView(companyId) {
  try {
    const v = localStorage.getItem(viewKey(companyId));
    if (v === 'open' || v === 'collapsed' || v === 'hidden') return v;
  } catch { /* ignore */ }
  return 'open';
}

export default function OnboardingWizard({ companyId, projectCount = 0, teamCount = 0 }) {
  const t = useT();
  const navigate = useNavigate();
  const [view, setView] = useState('hidden'); // assume hidden until localStorage read
  const [focus, setFocus] = useState(null);
  const [ready, setReady] = useState(false);
  const [company, setCompany] = useState(null);
  const [clients, setClients] = useState(0);
  const [billing, setBilling] = useState(0);
  const [articles, setArticles] = useState(0);
  const [tasks, setTasks] = useState(0);
  const [tools, setTools] = useState(0);
  const [activeKey, setActiveKey] = useState(null); // which step's form modal is open
  const [selectedKey, setSelectedKey] = useState(null); // step shown in the main panel
  const [skipped, setSkipped] = useState({}); // steps the user chose to skip this session
  const reconciledRef = useRef(false);

  // Read the shared view/focus on mount + whenever either side (checklist) writes.
  useEffect(() => {
    const sync = () => {
      setView(readView(companyId));
      try { setFocus(localStorage.getItem(focusKey(companyId)) || null); } catch { /* ignore */ }
    };
    sync();
    window.addEventListener(ONBOARDING_CHANGE_EVENT, sync);
    return () => window.removeEventListener(ONBOARDING_CHANGE_EVENT, sync);
  }, [companyId]);

  const persistOnboarding = (patch) => {
    if (!companyId) return;
    apiClient.patch(`/company/${companyId}/onboarding`, patch).catch(() => { /* offline: cache only */ });
  };

  const writeView = (next) => {
    try { localStorage.setItem(viewKey(companyId), next); } catch { /* ignore */ }
    setView(next);
    persistOnboarding({ view: next });
    emitOnboardingChange();
  };

  const chooseFocus = (value) => {
    try { localStorage.setItem(focusKey(companyId), value); } catch { /* ignore */ }
    setFocus(value);
    persistOnboarding({ focus: value });
    emitOnboardingChange();
    track('onboarding_routing_answered', { companyId, focus: value, source: 'wizard' });
  };

  const resetFocus = () => {
    try { localStorage.removeItem(focusKey(companyId)); } catch { /* ignore */ }
    setFocus(null);
    persistOnboarding({ focus: null });
    emitOnboardingChange();
  };

  // Load the counts we can't get from the dashboard's own stores. Refetched
  // after each create so the just-completed step flips to done and we advance.
  const refetch = () => {
    if (!companyId) return undefined;
    let alive = true;
    Promise.all([
      apiClient.get('/company/my').then((r) => r.data).catch(() => null),
      apiClient.get('/clients').then((r) => r.data).catch(() => []),
      apiClient.get('/offers').then((r) => r.data).catch(() => []),
      apiClient.get('/invoices').then((r) => r.data).catch(() => []),
      apiClient.get('/articles').then((r) => r.data).catch(() => []),
      apiClient.get('/tasks').then((r) => r.data).catch(() => []),
      apiClient.get('/tools').then((r) => r.data).catch(() => []),
    ]).then(([co, cl, of, inv, art, tsk, tls]) => {
      if (!alive) return;
      setCompany(co);
      if (!reconciledRef.current) {
        reconciledRef.current = true;
        const srv = co?.onboarding;
        if (srv && (srv.focus != null || (srv.view && srv.view !== 'open'))) {
          if (srv.view) { setView(srv.view); try { localStorage.setItem(viewKey(companyId), srv.view); } catch { /* ignore */ } }
          if (srv.focus != null) { setFocus(srv.focus); try { localStorage.setItem(focusKey(companyId), srv.focus); } catch { /* ignore */ } }
        }
      }
      setClients(Array.isArray(cl) ? cl.length : 0);
      setBilling((Array.isArray(of) ? of.length : 0) + (Array.isArray(inv) ? inv.length : 0));
      setArticles(Array.isArray(art) ? art.length : 0);
      setTasks(Array.isArray(tsk) ? tsk.length : 0);
      setTools(Array.isArray(tls) ? tls.length : 0);
      setReady(true);
    });
    return () => { alive = false; };
  };

  useEffect(() => {
    if (view === 'hidden') return undefined;
    return refetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, companyId]);

  const base = useMemo(
    () => buildOnboardingSteps({ t, projectCount, teamCount, clients, billing, articles, tasks, tools, company }),
    [t, projectCount, teamCount, clients, billing, articles, tasks, tools, company],
  );
  const steps = useMemo(() => stepsForFocus(base, focus), [base, focus]);

  const allStepsDone = base.every((s) => s.done);
  const doneCount = steps.filter((s) => s.done).length;
  const trackDone = steps.length > 0 && doneCount === steps.length;
  const nextTrack = nextFocus(focus);
  const allDone = focus === null || focus === 'skip'
    ? trackDone
    : (allStepsDone || (trackDone && !nextTrack));

  // The step shown in the main panel: the user's selection, else the first step
  // that is neither done nor skipped.
  const firstOpenKey = steps.find((s) => !s.done && !skipped[s.key])?.key
    || steps.find((s) => !s.done)?.key
    || null;
  useEffect(() => {
    setSelectedKey((cur) => {
      if (cur && steps.some((s) => s.key === cur)) return cur;
      return firstOpenKey;
    });
  }, [steps, firstOpenKey]);

  // Lock body scroll while the full-screen gate is up.
  const gateVisible = ready && Boolean(companyId) && view === 'open' && !allDone;
  useEffect(() => {
    if (!gateVisible) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [gateVisible]);

  if (!companyId || view !== 'open') return null;
  if (ready && allDone) return null; // completed elsewhere — nothing to gate
  if (!ready) return null; // wait for counts so we never flash a stale/empty gate

  const activeCfg = activeKey ? FORM_REGISTRY[activeKey] : null;
  const closeForm = () => setActiveKey(null);
  const handleCreated = () => {
    closeForm();
    // Optimistically advance so the flow feels continuous; the refetch then
    // confirms completion and flips the rail check for the step just finished.
    setSelectedKey((cur) => {
      const idx = steps.findIndex((s) => s.key === cur);
      return steps[idx + 1]?.key || cur;
    });
    refetch();
  };

  const startStep = (step) => {
    track('onboarding_step_started', { companyId, step: step.key, source: 'wizard' });
    if (FORM_REGISTRY[step.key]) {
      setActiveKey(step.key);
    } else {
      // company details / offer builder are full pages — navigate there.
      writeView('collapsed'); // keep the checklist bar as the way back
      navigate(step.href);
    }
  };

  const skipStep = (step) => {
    setSkipped((s) => ({ ...s, [step.key]: true }));
    const idx = steps.findIndex((s) => s.key === step.key);
    const next = steps.slice(idx + 1).find((s) => !s.done);
    setSelectedKey(next?.key || step.key);
  };

  const skipAll = () => {
    track('onboarding_dismissed', { companyId, doneCount, total: steps.length, source: 'wizard' });
    writeView('collapsed'); // collapse to the resume bar, not gone for good
  };

  const finish = () => writeView('hidden');

  const percent = steps.length ? Math.round((doneCount / steps.length) * 100) : 0;
  const selected = steps.find((s) => s.key === selectedKey) || null;

  const headingKey = focus === 'fieldwork'
    ? 'Get started with crews & jobs'
    : focus === 'billing'
      ? 'Get started with offers & invoices'
      : 'Getting started';

  return (
    <div className="onboarding-wizard" role="dialog" aria-modal="true" aria-label={t('Getting started')}>
      <div className="onboarding-wizard__panel">
        <button type="button" className="onboarding-wizard__skip-all" onClick={skipAll}>
          {t('Skip for now')} <CloseOutlined />
        </button>

        {focus === null ? (
          // Routing question — the one choice that shapes the path.
          <div className="onboarding-wizard__routing">
            <h1 className="onboarding-wizard__routing-title">{t('Welcome to ByggExp 👋')}</h1>
            <p className="onboarding-wizard__routing-sub">{t('What matters most right now?')}</p>
            <div className="onboarding-wizard__routing-opts">
              {FOCUS_OPTIONS.map((o) => (
                <button
                  key={o.key}
                  type="button"
                  className="onboarding-wizard__routing-opt"
                  onClick={() => chooseFocus(o.key)}
                >
                  <span className="onboarding-wizard__routing-opt-label">{t(o.label)}</span>
                  <span className="onboarding-wizard__routing-opt-hint">{t(o.hint)}</span>
                  <ArrowRightOutlined className="onboarding-wizard__routing-opt-arrow" />
                </button>
              ))}
            </div>
            <button type="button" className="onboarding-wizard__routing-skip" onClick={() => chooseFocus('skip')}>
              {t('Skip')}
            </button>
          </div>
        ) : trackDone && nextTrack ? (
          // One track finished — hand off to the other (or finish).
          <div className="onboarding-wizard__done">
            <span className="onboarding-wizard__done-icon" aria-hidden="true"><CheckCircleFilled /></span>
            <h1 className="onboarding-wizard__done-title">
              {t(nextTrack === 'billing' ? 'Your crew is up and running 🎉' : 'Billing is ready 🎉')}
            </h1>
            <p className="onboarding-wizard__done-sub">
              {t(nextTrack === 'billing'
                ? 'Now turn the work into money — set up invoicing.'
                : 'Now get your crews and jobs going.')}
            </p>
            <div className="onboarding-wizard__done-actions">
              <button type="button" className="onboarding-wizard__cta" onClick={() => chooseFocus(nextTrack)}>
                {t(FOCUS_OPTIONS.find((o) => o.key === nextTrack)?.label || '')} <RightOutlined />
              </button>
              <button type="button" className="onboarding-wizard__ghost" onClick={finish}>
                {t('Go to dashboard')}
              </button>
            </div>
          </div>
        ) : (
          <div className="onboarding-wizard__body">
            <div className="onboarding-wizard__head">
              <div>
                <h1 className="onboarding-wizard__title">{t(headingKey)}</h1>
                <p className="onboarding-wizard__sub">
                  {t('One step at a time — set your company up to start working.')}
                  <button type="button" className="onboarding-wizard__change-focus" onClick={resetFocus}>
                    {t('Change focus')}
                  </button>
                </p>
              </div>
              <div className="onboarding-wizard__progress">
                <Progress type="circle" size={64} percent={percent} format={() => `${doneCount}/${steps.length}`} />
              </div>
            </div>

            <div className="onboarding-wizard__cols">
              {/* Left rail: the whole plan, so progress is always visible. */}
              <ol className="onboarding-wizard__rail">
                {steps.map((step, i) => {
                  const isSel = step.key === selectedKey;
                  const cls = [
                    'onboarding-wizard__rail-item',
                    step.done && 'is-done',
                    isSel && !step.done && 'is-active',
                  ].filter(Boolean).join(' ');
                  return (
                    <li key={step.key}>
                      <button type="button" className={cls} onClick={() => setSelectedKey(step.key)}>
                        <span className="onboarding-wizard__rail-mark" aria-hidden="true">
                          {step.done ? <CheckCircleFilled /> : <span className="onboarding-wizard__rail-num">{i + 1}</span>}
                        </span>
                        <span className="onboarding-wizard__rail-title">{step.title}</span>
                      </button>
                    </li>
                  );
                })}
              </ol>

              {/* Right panel: the current action. */}
              {selected ? (
                <div className="onboarding-wizard__stage">
                  {selected.done ? (
                    <span className="onboarding-wizard__stage-badge is-done">
                      <CheckCircleFilled /> {t('Done')}
                    </span>
                  ) : (
                    <span className="onboarding-wizard__stage-badge">
                      {t('Step')} {steps.findIndex((s) => s.key === selected.key) + 1} {t('of')} {steps.length}
                    </span>
                  )}
                  <h2 className="onboarding-wizard__stage-title">{selected.title}</h2>
                  <p className="onboarding-wizard__stage-desc">{selected.desc}</p>
                  <div className="onboarding-wizard__stage-actions">
                    {selected.done ? (
                      <button type="button" className="onboarding-wizard__cta" onClick={() => {
                        const next = steps.find((s) => !s.done);
                        if (next) setSelectedKey(next.key); else finish();
                      }}>
                        {t('Continue')} <RightOutlined />
                      </button>
                    ) : (
                      <>
                        <button type="button" className="onboarding-wizard__cta" onClick={() => startStep(selected)}>
                          {selected.title} <RightOutlined />
                        </button>
                        <button type="button" className="onboarding-wizard__link" onClick={() => skipStep(selected)}>
                          {t('Skip this step')}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        )}
      </div>

      {activeCfg ? (
        <AdminModal
          title={t(activeCfg.title)}
          saveForm={activeCfg.formId}
          open={Boolean(activeKey)}
          onCancel={closeForm}
          destroyOnHidden
          width={920}
          footer={activeCfg.selfNav ? null : undefined}
        >
          <activeCfg.Form onClose={handleCreated} {...(activeCfg.props || {})} />
        </AdminModal>
      ) : null}
    </div>
  );
}
