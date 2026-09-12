'use client';

import { useState } from 'react';
import { GREEN, RED } from '@/src/features/projektkalkyl/kalkylTableUtils';

export default function SummaryPanel({ money, t, income, expense, profit }) {
  const [open, setOpen] = useState(true);
  const costShare = income > 0 ? Math.min(100, Math.round((expense / income) * 100)) : (expense > 0 ? 100 : 0);
  const profitShare = income > 0 ? Math.max(0, 100 - costShare) : 0;
  const margin = income > 0 ? Math.round((profit / income) * 100) : null;
  const loss = profit < 0;
  const dot = (color) => (
    <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: color, marginRight: 6, verticalAlign: 'middle' }} />
  );
  return (
    <div style={{ marginTop: 20, border: '1px solid var(--border,#e2e8f0)', borderRadius: 12, padding: '16px 18px' }}>
      <h3 onClick={() => setOpen((o) => !o)}
        style={{ margin: open ? '0 0 4px' : 0, display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', opacity: open ? 1 : 0.5, userSelect: 'none' }}>
        <span style={{ fontSize: 12, transform: open ? 'rotate(90deg)' : 'none', transition: 'transform .15s', display: 'inline-block' }}>▸</span>
        {t('Summary')}
      </h3>
      {open ? (
      <>
      <p style={{ margin: '0 0 14px', fontSize: 13, color: 'var(--muted,#64748b)' }}>
        {t('How the income is split between costs and profit')}
      </p>
      {income > 0 ? (
        <>
          <div style={{ display: 'flex', height: 18, borderRadius: 999, overflow: 'hidden', background: '#eef1f5' }}>
            <div style={{ width: `${costShare}%`, background: RED, transition: 'width .2s' }} title={`${t('Costs')} ${costShare}%`} />
            <div style={{ width: `${profitShare}%`, background: GREEN, transition: 'width .2s' }} title={`${t('Profit')} ${profitShare}%`} />
          </div>
          <div style={{ display: 'flex', gap: 20, marginTop: 8, fontSize: 13, flexWrap: 'wrap' }}>
            <span>{dot(RED)}{t('Costs')} <b style={{ fontVariantNumeric: 'tabular-nums' }}>{money(expense)}</b> <span style={{ color: 'var(--muted,#64748b)' }}>({costShare}%)</span></span>
            <span>{dot(GREEN)}{t('Profit')} <b style={{ color: loss ? RED : GREEN, fontVariantNumeric: 'tabular-nums' }}>{money(profit)}</b> <span style={{ color: 'var(--muted,#64748b)' }}>({profitShare}%)</span></span>
          </div>
        </>
      ) : (
        <p style={{ margin: 0, fontSize: 13, color: 'var(--muted,#64748b)' }}>{t('Add income to see the breakdown')}</p>
      )}
      <div style={{ display: 'flex', gap: 24, marginTop: 14, flexWrap: 'wrap', fontSize: 14 }}>
        <span>{t('Income')}: <b style={{ fontVariantNumeric: 'tabular-nums' }}>{money(income)}</b></span>
        <span>{t('Margin %')}: <b style={{ color: loss ? RED : GREEN }}>{margin == null ? '—' : `${margin}%`}</b></span>
        <span>{t('Cost share')}: <b>{costShare}%</b></span>
      </div>
      </>
      ) : null}
    </div>
  );
}
