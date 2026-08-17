'use client';

import { useEffect, useState } from 'react';
import { useT } from '@/src/i18n/LanguageProvider';
import './CookieConsent.scss';

const CONSENT_KEY = 'byggexp.consent.v1';

// Read the stored consent, e.g. { necessary: true, analytics: boolean }.
const getConsent = () => {
  if (typeof window === 'undefined') return null;
  try {
    return JSON.parse(window.localStorage.getItem(CONSENT_KEY) || 'null');
  } catch {
    return null;
  }
};

// Consent banner. The app itself only uses essential storage today (login,
// settings) — no tracking cookies — so this is primarily an honest notice and
// a place to record an analytics preference for when/if analytics is added.
export default function CookieConsent() {
  const t = useT();
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!getConsent()) setShow(true);
  }, []);

  const save = (analytics) => {
    try {
      window.localStorage.setItem(
        CONSENT_KEY,
        JSON.stringify({ necessary: true, analytics }),
      );
    } catch {
      /* storage unavailable — just close the banner */
    }
    setShow(false);
  };

  if (!show) return null;

  return (
    <div className="cookie-consent" role="dialog" aria-label={t('Cookie notice')}>
      <div className="cookie-consent__text">
        <strong>{t('Cookies & storage')}</strong>
        <span>
          {t('We only use storage that is necessary for the app to work (login, settings). No tracking cookies.')}
        </span>
      </div>
      <div className="cookie-consent__actions">
        <button
          type="button"
          className="cookie-consent__btn cookie-consent__btn--ghost"
          onClick={() => save(false)}
        >
          {t('Only necessary')}
        </button>
        <button
          type="button"
          className="cookie-consent__btn cookie-consent__btn--primary"
          onClick={() => save(true)}
        >
          {t('Accept all')}
        </button>
      </div>
    </div>
  );
}
