'use client';

import { useEffect, useMemo } from 'react';
import { Tour } from 'antd';
import { usePathname } from 'next/navigation';
import { useT } from '@/src/i18n/LanguageProvider';
import { useAuthStore } from '@/src/store/authStore';
import { useTourStore } from '@/src/store/tourStore';

// Interactive product tour (antd Tour). Highlights the main landmarks of the
// admin with arrows + tooltips — the coach-mark onboarding on top of the
// getting-started checklist. Auto-launches once per user on their first visit
// to the company overview; re-runnable from the header "Take a tour" button.
const seenKey = (userId) => `byggexp.tour.seen.v1.${userId || 'x'}`;
const el = (selector) => () => (typeof document === 'undefined' ? null : document.querySelector(selector));

export default function ProductTour({ homePath = '/company' }) {
  const t = useT();
  const pathname = usePathname();
  const open = useTourStore((s) => s.open);
  const start = useTourStore((s) => s.start);
  const close = useTourStore((s) => s.close);
  const user = useAuthStore((state) => state.user);
  const userId = user?.id || user?._id || user?.userId;

  // Auto-launch once, only on the overview (where every target exists), a beat
  // after mount so the sidebar/stats have rendered.
  useEffect(() => {
    if (!userId || pathname !== homePath) return undefined;
    let seen = true;
    try { seen = localStorage.getItem(seenKey(userId)) === '1'; } catch { seen = false; }
    if (seen) return undefined;
    const id = setTimeout(() => start(), 700);
    return () => clearTimeout(id);
  }, [userId, pathname, homePath, start]);

  const markSeen = () => {
    try { localStorage.setItem(seenKey(userId), '1'); } catch { /* ignore */ }
  };

  const handleClose = () => {
    markSeen();
    close();
  };

  const steps = useMemo(() => {
    const all = [
      {
        // Welcome — centered (no target).
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
    // Drop steps whose target is absent (e.g. the checklist once it's done), so
    // the tour never points at nothing — except the welcome step (no target).
    return all.filter((step) => !('target' in step) || step.target?.());
  }, [t]);

  if (!open) return null;

  return (
    <Tour
      open={open}
      onClose={handleClose}
      onFinish={handleClose}
      steps={steps}
    />
  );
}
