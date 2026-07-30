'use client';

import { useMemo } from 'react';
import { Card, Empty, Spin } from 'antd';
import { useT } from '@/src/i18n/LanguageProvider';
import { formatSek } from '@/src/utils/formatCurrency';
import { isUnpaid } from '@/src/features/purchases/paymentDue';
import './CashflowBlock.scss';

const WEEKS = 8;
const DAY = 86400000;
const invoiceValue = (invoice) => invoice.roundedTotal ?? invoice.total;
const money = (value) => formatSek(value, { decimals: false });

const startOfWeek = (input) => {
  const d = new Date(input);
  const mondayOffset = (d.getDay() + 6) % 7; // 0 = Monday
  d.setDate(d.getDate() - mondayOffset);
  d.setHours(0, 0, 0, 0);
  return d;
};

// A short liquidity forecast: expected money in (unpaid customer invoices) vs
// money out (unpaid supplier invoices + approved expenses), bucketed by week,
// with the running cash position on top. Reuses the shared economy fetch.
export default function CashflowBlock({ data, loading, failed, now }) {
  const t = useT();

  const model = useMemo(() => {
    const { invoices = [], supplier = [], expenses = [] } = data || {};
    const week0 = startOfWeek(now || 0);
    const week0Ms = week0.getTime();

    const buckets = Array.from({ length: WEEKS }, (_, i) => ({
      start: new Date(week0Ms + i * 7 * DAY),
      inflow: 0,
      outflow: 0,
    }));

    // Anything already due lands in the current week (index 0); future items in
    // their due week; items beyond the horizon are ignored.
    const bucketIndex = (dueDate) => {
      if (!dueDate) return -1;
      const diff = Math.floor((startOfWeek(dueDate).getTime() - week0Ms) / (7 * DAY));
      if (diff < 0) return 0;
      return diff < WEEKS ? diff : -1;
    };

    invoices
      .filter((invoice) => ['sent', 'overdue'].includes(invoice.status) && invoice.dueDate)
      .forEach((invoice) => {
        const idx = bucketIndex(invoice.dueDate);
        if (idx >= 0) buckets[idx].inflow += Number(invoiceValue(invoice)) || 0;
      });

    supplier
      .filter((invoice) => isUnpaid(invoice) && invoice.dueDate)
      .forEach((invoice) => {
        const idx = bucketIndex(invoice.dueDate);
        if (idx >= 0) buckets[idx].outflow += Number(invoice.total) || 0;
      });

    // Approved (not yet reimbursed) expenses are money owed now.
    expenses
      .filter((expense) => expense.status === 'approved')
      .forEach((expense) => { buckets[0].outflow += Number(expense.amount) || 0; });

    let running = 0;
    const points = buckets.map((bucket) => {
      const net = bucket.inflow - bucket.outflow;
      running += net;
      return { ...bucket, net, cumulative: running };
    });

    const totalIn = points.reduce((sum, p) => sum + p.inflow, 0);
    const totalOut = points.reduce((sum, p) => sum + p.outflow, 0);

    return { points, totalIn, totalOut, net: totalIn - totalOut, lowest: Math.min(0, ...points.map((p) => p.cumulative)) };
  }, [data, now]);

  const kpis = [
    { key: 'in', label: t('Expected in'), value: money(model.totalIn), tone: 'good' },
    { key: 'out', label: t('To pay out'), value: money(model.totalOut), tone: 'default' },
    { key: 'net', label: t('Net (8 weeks)'), value: money(model.net), tone: model.net < 0 ? 'bad' : 'good' },
  ];

  return (
    <Card className="dashboard-section-card cashflow" title={t('Cash flow')}>
      {loading ? (
        <div className="dashboard-economy__loading"><Spin /></div>
      ) : failed ? (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t('Could not load economy data')} />
      ) : (
        <>
          <div className="dashboard-economy__grid cashflow__kpis">
            {kpis.map((kpi) => (
              <div key={kpi.key} className="dashboard-economy__tile">
                <span className="dashboard-economy__label">{kpi.label}</span>
                <strong className={`dashboard-economy__value dashboard-economy__value--${kpi.tone}`}>{kpi.value}</strong>
              </div>
            ))}
          </div>
          {model.lowest < 0 ? (
            <p className="cashflow__warning">
              {t('Cash dips to {v} within 8 weeks').replace('{v}', money(model.lowest))}
            </p>
          ) : null}
          <CashflowChart points={model.points} t={t} />
        </>
      )}
    </Card>
  );
}

function CashflowChart({ points, t }) {
  const W = 760;
  const H = 240;
  const padL = 8;
  const padR = 8;
  const padT = 18;
  const padB = 34;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;

  const values = points.flatMap((p) => [p.net, p.cumulative]).concat(0);
  const rawMax = Math.max(...values);
  const rawMin = Math.min(...values);
  const span = Math.max(rawMax - rawMin, 1);
  const pad = span * 0.12;
  const yMax = rawMax + pad;
  const yMin = rawMin - pad;
  const scaleY = (v) => padT + ((yMax - v) / (yMax - yMin)) * plotH;
  const zeroY = scaleY(0);

  const band = plotW / points.length;
  const barW = Math.min(34, band * 0.5);

  const cumPath = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${(padL + band * i + band / 2).toFixed(1)} ${scaleY(p.cumulative).toFixed(1)}`)
    .join(' ');

  const weekLabel = (d) => `${d.getDate()}/${d.getMonth() + 1}`;

  return (
    <div className="cashflow__chart-wrap">
      <svg viewBox={`0 0 ${W} ${H}`} className="cashflow__chart" role="img" aria-label={t('Cash flow')}>
        {/* zero baseline */}
        <line x1={padL} y1={zeroY} x2={W - padR} y2={zeroY} className="cashflow__axis" />
        {points.map((p, i) => {
          const cx = padL + band * i + band / 2;
          const top = scaleY(Math.max(0, p.net));
          const bottom = scaleY(Math.min(0, p.net));
          return (
            <g key={i}>
              <rect
                x={cx - barW / 2}
                y={top}
                width={barW}
                height={Math.max(1, bottom - top)}
                rx={3}
                className={p.net < 0 ? 'cashflow__bar cashflow__bar--neg' : 'cashflow__bar cashflow__bar--pos'}
              />
              <text x={cx} y={H - 18} className="cashflow__wk">{weekLabel(p.start)}</text>
            </g>
          );
        })}
        {/* cumulative cash position */}
        <path d={cumPath} className="cashflow__line" fill="none" />
        {points.map((p, i) => (
          <circle
            key={i}
            cx={padL + band * i + band / 2}
            cy={scaleY(p.cumulative)}
            r={i === points.length - 1 ? 4.5 : 3}
            className="cashflow__dot"
          />
        ))}
      </svg>
      <div className="cashflow__legend">
        <span><i className="cashflow__key cashflow__key--pos" />{t('Net in')}</span>
        <span><i className="cashflow__key cashflow__key--neg" />{t('Net out')}</span>
        <span><i className="cashflow__key cashflow__key--line" />{t('Cash position')}</span>
      </div>
    </div>
  );
}
