'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from '@/src/shared/routing/routerCompat';
import { useLanguage } from '@/src/i18n/LanguageProvider';
import { formatSek } from '@/src/utils/formatCurrency';
import { useProjektkalkylStore } from '@/src/store/projektkalkylStore';
import { KALKYL_COLORS, tableTotals, sideTotals, lineAmount } from '@/src/features/projektkalkyl/kalkylModel';
import CommentsPanel from '@/src/features/projektkalkyl/CommentsPanel';

const centered = (msg) => (
  <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#48607f', fontFamily: 'Inter, Arial, sans-serif' }}>
    {msg}
  </div>
);

export default function ProjektkalkylPublicView() {
  const { token } = useParams();
  const { t } = useLanguage();
  const { fetchPublic, addGuestComment } = useProjektkalkylStore();
  const [data, setData] = useState(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try { setData(await fetchPublic(token)); setError(false); }
    catch { setError(true); }
    finally { setLoading(false); }
  }, [token, fetchPublic]);

  useEffect(() => {
    load();
    const i = setInterval(load, 4000); // live: poll every 4s
    return () => clearInterval(i);
  }, [load]);

  if (loading) return centered(t('Loading…'));
  if (error || !data) return centered(t('This link has expired or is invalid'));

  const tables = data.tables || [];
  const inc = sideTotals(tables, 'income');
  const exp = sideTotals(tables, 'expense');
  const profit = inc.brutto - exp.brutto;

  return (
    <div style={{ minHeight: '100vh', background: '#eef3fb', fontFamily: 'Inter, Arial, sans-serif', color: '#0b1f3a' }}>
      <div style={{ background: '#0b1f3a', color: '#fff', padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <b style={{ letterSpacing: '.06em' }}>BYGGEXP</b>
        <span style={{ opacity: 0.7 }}>·</span>
        <span>{data.name || t('Projektkalkyl')}</span>
        <span style={{ marginLeft: 'auto', fontSize: 12, background: 'rgba(255,255,255,.15)', padding: '3px 10px', borderRadius: 999 }}>
          {t('Read-only')} · {t('Updates live')}
        </span>
      </div>

      <div style={{ maxWidth: 1120, margin: '0 auto', padding: 20 }}>
        <div style={{ display: 'flex', gap: 20, alignItems: 'stretch', flexWrap: 'wrap' }}>
          <ReadSide t={t} title={t('Income')} tables={tables.filter((x) => x.side === 'income')} totals={inc} color="#16a35f" />
          <ReadSide t={t} title={t('Expenses')} tables={tables.filter((x) => x.side === 'expense')} totals={exp} color="#e5484d" />
        </div>
        <div style={{ display: 'flex', gap: 20, marginTop: 16, flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 460px', minWidth: 300 }}>
            {data.note ? <div style={{ background: '#fff', borderRadius: 12, padding: '12px 14px', whiteSpace: 'pre-wrap' }}>{data.note}</div> : null}
          </div>
          <div style={{ flex: '1 1 460px', minWidth: 300, background: profit < 0 ? '#fdecec' : '#e7f6ec',
            border: `1px solid ${profit < 0 ? '#f3b4b4' : '#a8e0bf'}`, borderRadius: 12, padding: '14px 18px',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 700, fontSize: 17 }}>{t('Profit')}</span>
            <span style={{ fontWeight: 800, fontSize: 20, color: profit < 0 ? '#e5484d' : '#16a35f' }}>{formatSek(profit)}</span>
          </div>
        </div>

        <div style={{ background: '#fff', borderRadius: 12, marginTop: 8 }}>
          <CommentsPanel guest comments={data.comments || []} onSubmit={async (p) => {
            const updated = await addGuestComment(token, p);
            setData((d) => ({ ...d, comments: updated }));
          }} />
        </div>
      </div>
    </div>
  );
}

function ReadSide({ t, title, tables, totals, color }) {
  return (
    <div style={{ flex: '1 1 460px', minWidth: 300, display: 'flex', flexDirection: 'column' }}>
      <h3 style={{ margin: '0 0 12px' }}>{title}</h3>
      {tables.map((tb) => <ReadTable key={tb.id} t={t} table={tb} />)}
      <div style={{ marginTop: 'auto', background: color, color: '#fff', borderRadius: 10, padding: '12px 16px',
        display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: 16 }}>
        <span>TOTAL</span>
        <span>{formatSek(totals.brutto)}{totals.vat > 0 ? <span style={{ fontWeight: 400, fontSize: 13, opacity: 0.9, marginLeft: 8 }}>({t('excl.')} {formatSek(totals.netto)} + {t('VAT')} {formatSek(totals.vat)})</span> : null}</span>
      </div>
    </div>
  );
}

function ReadTable({ t, table }) {
  const palette = KALKYL_COLORS[table.color] || KALKYL_COLORS.grey;
  const tt = tableTotals(table);
  const columns = table.columns || [];
  return (
    <div style={{ background: palette.bg, borderRadius: 10, marginBottom: 16, overflow: 'hidden', border: '1px solid rgba(0,0,0,0.06)' }}>
      <div style={{ background: palette.head, padding: '8px 12px', fontWeight: 700, display: 'flex', justifyContent: 'space-between' }}>
        <span>{table.title}</span>
        <span style={{ fontWeight: 400, fontSize: 12, opacity: 0.7 }}>{table.vatMode === 'inkl25' ? `${t('With VAT')} 25%` : t('Without VAT')}</span>
      </div>
      <div style={{ overflowX: 'auto', padding: '6px 12px 10px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, tableLayout: 'fixed' }}>
          <thead>
            <tr>{columns.map((c) => <th key={c.id} style={{ textAlign: c.type === 'amount' ? 'right' : 'left', padding: '4px 6px', fontWeight: 600 }}>{c.label}</th>)}</tr>
          </thead>
          <tbody>
            {(table.rows || []).map((r) => (
              <tr key={r.id} style={{ borderTop: '1px solid rgba(0,0,0,0.05)' }}>
                {columns.map((c) => (
                  <td key={c.id} style={{ padding: '4px 6px', textAlign: (c.type === 'amount' || c.type === 'qty' || c.type === 'price') ? 'right' : 'left', fontVariantNumeric: 'tabular-nums' }}>
                    {c.type === 'amount'
                      ? formatSek(lineAmount(table, r))
                      : (r.cells?.[c.id] || '')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        <div style={{ textAlign: 'right', fontWeight: 700, marginTop: 6 }}>{formatSek(tt.brutto)}</div>
      </div>
    </div>
  );
}
