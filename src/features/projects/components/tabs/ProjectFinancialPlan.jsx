'use client';

import { Card, Empty, Tag } from 'antd';
import { formatSek } from '@/src/utils/formatCurrency';

const money = (v) => formatSek(v || 0, { decimals: false });
const pct = (result, income) => (income > 0 ? Math.round((result / income) * 100) : null);
const resultColor = (v) => (v < 0 ? '#e5484d' : '#16a35f');

// Project financial plan: expected (plan) vs actual so far vs projected final,
// with the variance of the projected result against the plan. All inputs are
// computed by ProjectOverviewTab and passed in.
export default function ProjectFinancialPlan({ t, plan, actual, forecast, progressPercent }) {
  const hasData = plan.income > 0 || plan.cost > 0 || actual.income > 0 || actual.cost > 0;

  const columns = [
    { key: 'plan', label: t('Planned'), data: plan },
    { key: 'actual', label: t('So far'), data: actual },
    { key: 'forecast', label: t('Forecast'), data: forecast },
  ];

  const variance = forecast.result - plan.result;

  return (
    <Card className="dashboard-section-card project-finplan" title={t('Financial plan')}>
      {hasData ? (
        <>
          <div className="project-finplan__grid">
            <div className="project-finplan__row project-finplan__row--head">
              <span />
              {columns.map((c) => <span key={c.key} className="project-finplan__col-head">{c.label}</span>)}
            </div>
            <div className="project-finplan__row">
              <span className="project-finplan__label">{t('Income')}</span>
              {columns.map((c) => <span key={c.key} className="project-finplan__val">{money(c.data.income)}</span>)}
            </div>
            <div className="project-finplan__row">
              <span className="project-finplan__label">{t('Costs')}</span>
              {columns.map((c) => <span key={c.key} className="project-finplan__val">{money(c.data.cost)}</span>)}
            </div>
            <div className="project-finplan__row project-finplan__row--result">
              <span className="project-finplan__label">{t('Result')}</span>
              {columns.map((c) => (
                <span key={c.key} className="project-finplan__val" style={{ color: resultColor(c.data.result), fontWeight: 700 }}>
                  {money(c.data.result)}
                </span>
              ))}
            </div>
            <div className="project-finplan__row project-finplan__row--margin">
              <span className="project-finplan__label">{t('Margin %')}</span>
              {columns.map((c) => {
                const p = pct(c.data.result, c.data.income);
                return <span key={c.key} className="project-finplan__val project-finplan__val--muted">{p == null ? '—' : `${p}%`}</span>;
              })}
            </div>
          </div>
          <div className="project-finplan__foot">
            <span className="project-finplan__note">
              {t('Forecast based on')} {progressPercent}% {t('completed')}
            </span>
            <Tag color={variance < 0 ? 'red' : 'green'}>
              {variance >= 0 ? '+' : ''}{money(variance)} {t('vs plan')}
            </Tag>
          </div>
        </>
      ) : (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={t('Set a budget and planned hours/costs to see the financial plan')}
        />
      )}
    </Card>
  );
}
