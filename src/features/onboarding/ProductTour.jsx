'use client';

import { Tour } from 'antd';
import { useT } from '@/src/i18n/LanguageProvider';
import { useTourStore } from '@/src/store/tourStore';

// Interactive product tour (antd Tour). Highlights the main landmarks of the
// admin with arrows + tooltips — the coach-mark layer on top of the
// getting-started checklist. Purely controlled by tourStore: the WelcomeModal's
// "Take the tour" CTA and the header compass both call start(); nothing
// auto-launches here.
const el = (selector) => () => (typeof document === 'undefined' ? null : document.querySelector(selector));

// Built fresh each time the tour opens so [data-tour] targets are resolved
// against the DOM as it is right now (e.g. the checklist may be gone).
function buildSteps(t) {
  const all = [
    {
      title: t('Welcome to Byggexp 👋'),
      description: t('A 60-second tour of where everything lives. You can reopen it any time from the compass in the top bar.'),
    },
    {
      title: t('Your navigation'),
      description: t('Everything is here: projects, people, time & shifts, invoicing and settings. Categories expand on click.'),
      target: el('[data-tour="nav"]'),
      placement: 'right',
    },
    {
      title: t('Getting started'),
      description: t('Start with these setup steps — company details, your team, first project, then offers & invoices. It tracks itself.'),
      target: el('[data-tour="checklist"]'),
    },
    {
      title: t('Your overview'),
      description: t('Live key figures — active projects, people at work, open tasks and hours today.'),
      target: el('[data-tour="stats"]'),
    },
    {
      title: t('Alerts & language'),
      description: t('Approvals, notifications, dark mode and the language toggle live up here.'),
      target: el('[data-tour="header-actions"]'),
      placement: 'bottomRight',
    },
    {
      title: t('Reopen the tour anytime'),
      description: t('Click the compass to run this tour again, or open Help for step-by-step guides and videos.'),
      target: el('[data-tour="help"]'),
      placement: 'bottom',
    },
  ];
  // Drop steps whose target is absent so the tour never points at nothing —
  // except the welcome step, which is intentionally centered (no target).
  return all.filter((step) => !('target' in step) || step.target?.());
}

export default function ProductTour() {
  const t = useT();
  const open = useTourStore((s) => s.open);
  const close = useTourStore((s) => s.close);

  if (!open) return null;

  return (
    <Tour
      open={open}
      onClose={close}
      onFinish={close}
      steps={buildSteps(t)}
    />
  );
}
