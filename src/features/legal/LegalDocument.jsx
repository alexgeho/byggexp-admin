'use client';

import './legal.scss';

// Standalone (public) legal document shell — no dashboard chrome.
export default function LegalDocument({ title, updated, children }) {
  return (
    <div className="legal-page">
      <div className="legal-page__inner">
        <a className="legal-page__brand" href="/">BYGGEXP</a>
        <h1 className="legal-page__title">{title}</h1>
        {updated ? <p className="legal-page__updated">Senast uppdaterad: {updated}</p> : null}
        <div className="legal-page__body">{children}</div>
      </div>
    </div>
  );
}
