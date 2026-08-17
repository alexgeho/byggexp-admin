'use client';

import { useEffect, useState } from 'react';
import { Button, Modal } from 'antd';
import { ClockCircleOutlined, FileTextOutlined, ProjectOutlined } from '@ant-design/icons';
import { usePathname } from 'next/navigation';
import { useT } from '@/src/i18n/LanguageProvider';
import { useAuthStore } from '@/src/store/authStore';
import { useTourStore } from '@/src/store/tourStore';
import './WelcomeModal.scss';

// First-login welcome. Shows once per user on their first visit to the company
// overview, greets them and offers the product tour (or "explore on my own").
// This is the single first-run entry point — the tour no longer auto-launches.
const seenKey = (userId) => `byggexp.welcome.seen.v1.${userId || 'x'}`;

export default function WelcomeModal({ homePath = '/company' }) {
  const t = useT();
  const pathname = usePathname();
  const user = useAuthStore((state) => state.user);
  const userId = user?.id || user?._id || user?.userId;
  const startTour = useTourStore((state) => state.start);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!userId || pathname !== homePath) return;
    let seen = true;
    try { seen = localStorage.getItem(seenKey(userId)) === '1'; } catch { seen = false; }
    if (!seen) setOpen(true);
  }, [userId, pathname, homePath]);

  const markSeen = () => {
    try { localStorage.setItem(seenKey(userId), '1'); } catch { /* ignore */ }
  };

  const dismiss = () => { markSeen(); setOpen(false); };

  const takeTour = () => {
    markSeen();
    setOpen(false);
    // Let the modal unmount before the tour spotlights the page underneath.
    setTimeout(() => startTour(), 250);
  };

  const firstName = (user?.name || '').trim().split(' ')[0];

  const highlights = [
    { icon: <ProjectOutlined />, text: t('Track projects, live GPS shifts and hours in one place') },
    { icon: <ClockCircleOutlined />, text: t('Assign tasks with reminders that nudge until they’re done') },
    { icon: <FileTextOutlined />, text: t('Turn work into offers and ROT invoices — then payroll') },
  ];

  return (
    <Modal open={open} onCancel={dismiss} footer={null} width={520} centered destroyOnHidden>
      <div className="welcome-modal">
        <div className="welcome-modal__badge" aria-hidden="true">👋</div>
        <h2 className="welcome-modal__title">
          {t('Welcome to Byggexp')}{firstName ? `, ${firstName}` : ''}
        </h2>
        <p className="welcome-modal__sub">
          {t('Run your projects, time and invoicing in one place. Here is what you can do:')}
        </p>
        <ul className="welcome-modal__list">
          {highlights.map((item) => (
            <li key={item.text} className="welcome-modal__item">
              <span className="welcome-modal__icon">{item.icon}</span>
              <span>{item.text}</span>
            </li>
          ))}
        </ul>
        <div className="welcome-modal__actions">
          <Button onClick={dismiss}>{t('Explore on my own')}</Button>
          <Button type="primary" onClick={takeTour}>{t('Take the 60-second tour')}</Button>
        </div>
      </div>
    </Modal>
  );
}
