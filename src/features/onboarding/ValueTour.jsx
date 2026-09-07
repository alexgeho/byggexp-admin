'use client';

import React, { useEffect, useState } from 'react';
import { Modal } from 'antd';
import { Button } from '../../ui-kit';

// One-time value tour shown to a company admin the first time they land in the
// dashboard (right after sign-up/first login). Swedish copy — the primary
// audience is Swedish construction companies. Reads its own "seen" flag from
// localStorage so it renders once. Re-openable via openAdminValueTour().
const SEEN_KEY = 'byggexp-admin-value-tour-seen-v1';
const OPEN_EVENT = 'byggexp:value-tour-open';

// Re-open the tour from anywhere (e.g. a "Visa introduktionen igen" button).
export function openAdminValueTour() {
  if (typeof window === 'undefined') return;
  try {
    window.dispatchEvent(new CustomEvent(OPEN_EVENT));
  } catch {
    /* ignore */
  }
}

const SLIDES = [
  {
    icon: '🚀',
    title: 'Projekt & team på minuter',
    text: 'Skapa ett projekt och lägg till anställda. Alla får direkt ett mejl med inloggning och en länk för att ladda ner appen.',
  },
  {
    icon: '📍',
    title: 'Se personalen i realtid',
    text: 'Vem har startat sitt arbetspass, vem är frånvarande och var — allt syns direkt.',
  },
  {
    icon: '⏱️',
    title: 'Tid → lön & faktura',
    text: 'Exportera arbetstid till Excel med ett par klick — eller direkt till en faktura eller lön.',
  },
  {
    icon: '🔔',
    title: 'Uppgifter som inte glöms',
    text: 'Automatiska påminnelser skickas efter deadline tills den anställde bekräftar att uppgiften är klar.',
  },
  {
    icon: '📷',
    title: 'Foton & kvitton',
    text: 'Fotorapporter från arbetsplatsen och kvitton skannas av appen — direkt in i systemet. Ta bilden och glöm resten.',
  },
  {
    icon: '📊',
    title: 'Ekonomi på autopilot',
    text: 'Skannade kvitton, arbetstimmar och skickade/mottagna fakturor räknas automatiskt in i projektets ekonomi.',
  },
];

export default function ValueTour() {
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

  const finish = () => {
    try {
      localStorage.setItem(SEEN_KEY, '1');
    } catch {
      /* ignore */
    }
    setOpen(false);
  };

  const isLast = index >= SLIDES.length - 1;
  const next = () => (isLast ? finish() : setIndex((i) => i + 1));
  const slide = SLIDES[index];

  return (
    <Modal
      open={open}
      onCancel={finish}
      footer={null}
      centered
      width={460}
      maskClosable={false}
    >
      <div style={{ textAlign: 'center', padding: '8px 8px 4px' }}>
        <div style={{ fontSize: 56, lineHeight: 1, marginBottom: 16 }}>
          {slide.icon}
        </div>
        <h2 style={{ margin: '0 0 10px', fontSize: 22, color: '#052d50' }}>
          {slide.title}
        </h2>
        <p
          style={{
            margin: '0 auto',
            maxWidth: 360,
            color: '#5a6b7d',
            fontSize: 15,
            lineHeight: 1.5,
            minHeight: 88,
          }}
        >
          {slide.text}
        </p>

        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            gap: 8,
            margin: '18px 0 20px',
          }}
        >
          {SLIDES.map((s, i) => (
            <span
              key={s.title}
              style={{
                width: i === index ? 22 : 8,
                height: 8,
                borderRadius: 999,
                background: i === index ? '#0785f4' : '#c4d3e6',
                transition: 'width 0.2s',
              }}
            />
          ))}
        </div>

        <Button block onClick={next}>
          {isLast ? 'Kom igång' : 'Nästa'}
        </Button>
        <button
          type="button"
          onClick={finish}
          style={{
            marginTop: 10,
            background: 'none',
            border: 'none',
            color: '#8296a7',
            fontSize: 14,
            cursor: 'pointer',
          }}
        >
          Hoppa över
        </button>
      </div>
    </Modal>
  );
}
