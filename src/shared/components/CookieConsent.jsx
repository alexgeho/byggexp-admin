'use client';

import { useEffect, useRef, useState } from 'react';
import { useT } from '@/src/i18n/LanguageProvider';
import './CookieConsent.scss';

const CONSENT_KEY = 'byggexp.consent.v1';

// Read the stored consent, e.g. { necessary: true, analytics: boolean }.
export const getConsent = () => {
  if (typeof window === 'undefined') return null;
  try {
    return JSON.parse(window.localStorage.getItem(CONSENT_KEY) || 'null');
  } catch {
    return null;
  }
};

// Consent banner. Necessary storage = login/settings. "Accept all" also allows
// sending Google Analytics ids with a sign-up (see signupSource.readGaIds) so
// marketing can attribute it; "Only necessary" sends none.
export default function CookieConsent() {
  const t = useT();
  const [show, setShow] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!getConsent()) setShow(true);
  }, []);

  // Reserve the banner's height (--cookie-consent-h) so pages can keep their
  // primary action clear of it (e.g. "Börja gratis" on /register at 390px).
  useEffect(() => {
    const root = document.documentElement;
    if (!show || !ref.current || typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver(([entry]) => {
      root.style.setProperty('--cookie-consent-h', `${Math.ceil(entry.target.offsetHeight) + 16}px`);
    });
    ro.observe(ref.current);
    return () => {
      ro.disconnect();
      root.style.removeProperty('--cookie-consent-h');
    };
  }, [show]);

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
    <div ref={ref} className="cookie-consent" role="dialog" aria-label={t('Cookie notice')}>
      <div className="cookie-consent__text">
        <strong>{t('Cookies & storage')}</strong>
        <span>
          {t('Necessary storage keeps you logged in. With "Accept all" we also note which ad or page brought you here (Google Analytics), to improve our marketing.')}
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
