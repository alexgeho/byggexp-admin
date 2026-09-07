'use client';

import React, { useEffect, useState } from 'react';
import logo from '@/src/assets/byggexp-logo.svg';
import { useT } from '@/src/i18n/LanguageProvider';

// Full-screen, branded value tour shown once to a company admin the first time
// they land in the dashboard (right after sign-up / first login). Mirrors the
// mobile app's post-login WelcomeSlides 1:1 — same gradient, wordmark + Skip,
// floating illustration, big navy benefit sentence, dots and a full-width CTA.
// Copy is localised by English source via useT(); Swedish lives in the admin
// dictionaries. Reads its own "seen" flag from localStorage so it renders once.
// Re-openable from anywhere via openAdminValueTour().
const SEEN_KEY = 'byggexp-admin-value-tour-seen-v2';
const OPEN_EVENT = 'byggexp:value-tour-open';

const NAVY = '#052d50';
const MUTED = '#687898';
const BLUE = '#3183ff';

const logoSrc = typeof logo === 'string' ? logo : logo.src;

// Re-open the tour from anywhere (e.g. a "Visa introduktionen igen" button).
export function openAdminValueTour() {
  if (typeof window === 'undefined') return;
  try {
    window.dispatchEvent(new CustomEvent(OPEN_EVENT));
  } catch {
    /* ignore */
  }
}

// Branded vector art — one per slide. Ported verbatim from the mobile app's
// valueIllustrations so the two tours look identical. The white card + faint
// blue outline live inside each SVG, so the art floats on the gradient.
const CARD_STROKE = 'stroke="#E3ECF7" stroke-width="2"';

const ADMIN_TEAM = `<svg viewBox="0 0 260 200" xmlns="http://www.w3.org/2000/svg" fill="none">
<rect x="70" y="50" width="120" height="100" rx="16" fill="#FFFFFF" ${CARD_STROKE}/>
<rect x="84" y="64" width="46" height="6" rx="3" fill="#DCEBFF"/>
<circle cx="92" cy="94" r="9" fill="#3A73F0"/>
<rect x="108" y="89" width="58" height="5" rx="2.5" fill="#EAF3FF"/>
<rect x="108" y="98" width="36" height="5" rx="2.5" fill="#EAF3FF"/>
<circle cx="92" cy="122" r="9" fill="#0785F4"/>
<rect x="108" y="117" width="50" height="5" rx="2.5" fill="#EAF3FF"/>
<rect x="108" y="126" width="30" height="5" rx="2.5" fill="#EAF3FF"/>
<circle cx="180" cy="58" r="16" fill="#34C759"/>
<path d="M180 51 V65 M173 58 H187" stroke="#FFFFFF" stroke-width="3" stroke-linecap="round"/>
</svg>`;

const TASKS = `<svg viewBox="0 0 260 200" xmlns="http://www.w3.org/2000/svg" fill="none">
<rect x="72" y="48" width="116" height="104" rx="16" fill="#FFFFFF" ${CARD_STROKE}/>
<rect x="86" y="66" width="18" height="18" rx="5" fill="#34C759"/>
<path d="M90 75 l4 4 l7 -8" stroke="#FFFFFF" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>
<rect x="112" y="71" width="58" height="6" rx="3" fill="#DCEBFF"/>
<rect x="86" y="95" width="18" height="18" rx="5" fill="#EAF3FF" stroke="#BBD9FF" stroke-width="2"/>
<rect x="112" y="100" width="64" height="6" rx="3" fill="#EAF3FF"/>
<rect x="86" y="124" width="18" height="18" rx="5" fill="#EAF3FF" stroke="#BBD9FF" stroke-width="2"/>
<rect x="112" y="129" width="46" height="6" rx="3" fill="#EAF3FF"/>
<circle cx="180" cy="56" r="16" fill="#0785F4"/>
<path d="M180 49 c-4 0 -7 3 -7 7 v4 l-2 2 h18 l-2 -2 v-4 c0 -4 -3 -7 -7 -7 z" fill="#FFFFFF"/>
<path d="M177 65 a3 3 0 0 0 6 0" fill="#FFFFFF"/>
</svg>`;

const ADMIN_ECONOMY = `<svg viewBox="0 0 260 200" xmlns="http://www.w3.org/2000/svg" fill="none">
<rect x="66" y="54" width="128" height="98" rx="16" fill="#FFFFFF" ${CARD_STROKE}/>
<rect x="80" y="68" width="50" height="6" rx="3" fill="#DCEBFF"/>
<rect x="80" y="80" width="32" height="5" rx="2.5" fill="#EAF3FF"/>
<rect x="84" y="120" width="15" height="18" rx="3" fill="#BBD9FF"/>
<rect x="107" y="108" width="15" height="30" rx="3" fill="#3A73F0"/>
<rect x="130" y="96" width="15" height="42" rx="3" fill="#0785F4"/>
<rect x="153" y="86" width="15" height="52" rx="3" fill="#052D50"/>
<path d="M91 116 L114 104 L137 92 L160 82" stroke="#34C759" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
<circle cx="91" cy="116" r="3.5" fill="#34C759"/>
<circle cx="160" cy="82" r="3.5" fill="#34C759"/>
<circle cx="182" cy="60" r="16" fill="#34C759"/>
<path d="M182 68 V53 M176 59 L182 53 L188 59" stroke="#FFFFFF" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

const SLIDES = [
  {
    art: ADMIN_TEAM,
    title:
      'Create projects, invite your team and see in real time who works where.',
  },
  {
    art: TASKS,
    title:
      'Assign tasks with reminders — photos and receipts attach to the right project automatically.',
  },
  {
    art: ADMIN_ECONOMY,
    title:
      'Project finances in real time — export work time to invoice or payroll in a couple of clicks.',
  },
];

export default function ValueTour() {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    try {
      if (localStorage.getItem(SEEN_KEY) !== '1') {
        setOpen(true);
      }
    } catch {
      /* ignore */
    }
    const reopen = () => {
      setIndex(0);
      setOpen(true);
    };
    window.addEventListener(OPEN_EVENT, reopen);
    return () => window.removeEventListener(OPEN_EVENT, reopen);
  }, []);

  // Lock background scroll while the full-screen tour is up.
  useEffect(() => {
    if (typeof document === 'undefined') return undefined;
    if (open) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = prev;
      };
    }
    return undefined;
  }, [open]);

  const finish = () => {
    try {
      localStorage.setItem(SEEN_KEY, '1');
    } catch {
      /* ignore */
    }
    setOpen(false);
  };

  if (!open) return null;

  const isLast = index >= SLIDES.length - 1;
  const next = () => (isLast ? finish() : setIndex((i) => i + 1));
  const slide = SLIDES[index];

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 2000,
        display: 'flex',
        flexDirection: 'column',
        background: 'linear-gradient(180deg, #f5f9fe 0%, #eaf2fb 100%)',
      }}
    >
      {/* Top bar: wordmark + Skip */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '22px 24px',
        }}
      >
        <img src={logoSrc} alt="ByggExp" style={{ height: 22, width: 'auto' }} />
        <button
          type="button"
          onClick={finish}
          style={{
            background: 'none',
            border: 'none',
            color: MUTED,
            fontSize: 15,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          {t('Skip')}
        </button>
      </div>

      {/* Center: illustration + benefit sentence */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '0 24px',
          textAlign: 'center',
        }}
      >
        <div
          style={{ width: 300, maxWidth: '80%', marginBottom: 48 }}
          dangerouslySetInnerHTML={{ __html: slide.art }}
        />
        <h1
          style={{
            margin: 0,
            maxWidth: 460,
            color: NAVY,
            fontSize: 30,
            lineHeight: 1.28,
            fontWeight: 800,
            letterSpacing: '-0.3px',
          }}
        >
          {t(slide.title)}
        </h1>
      </div>

      {/* Dots */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          gap: 8,
          marginBottom: 18,
        }}
      >
        {SLIDES.map((s, i) => (
          <span
            key={s.title}
            style={{
              width: i === index ? 22 : 8,
              height: 8,
              borderRadius: 999,
              background: i === index ? BLUE : '#c4d3e6',
              transition: 'width 0.2s',
            }}
          />
        ))}
      </div>

      {/* CTA */}
      <div style={{ padding: '0 24px 32px' }}>
        <button
          type="button"
          onClick={next}
          style={{
            display: 'block',
            width: '100%',
            maxWidth: 460,
            margin: '0 auto',
            background: BLUE,
            color: '#ffffff',
            border: 'none',
            borderRadius: 999,
            padding: '17px 0',
            fontSize: 17,
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          {isLast ? t('Get started') : t('Next')}
        </button>
      </div>
    </div>
  );
}
