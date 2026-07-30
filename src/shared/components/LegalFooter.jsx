'use client';

import { useT } from '@/src/i18n/LanguageProvider';
import './LegalFooter.scss';

// Small footer with the legally-required policy links. Rendered once at the
// bottom of the dashboard content.
export default function LegalFooter() {
  const t = useT();
  const year = 2026;
  return (
    <footer className="legal-footer">
      <span className="legal-footer__brand">© {year} ByggExp</span>
      <nav className="legal-footer__links">
        <a href="/legal/integritetspolicy" target="_blank" rel="noreferrer">{t('Privacy policy')}</a>
        <a href="/legal/villkor" target="_blank" rel="noreferrer">{t('Terms')}</a>
      </nav>
    </footer>
  );
}
