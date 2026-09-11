'use client';

// Grouped bars per month: actual income (green) next to actual expense (red),
// with the plan drawn as a thin outline marker on each bar so plan-vs-actual is
// readable at a glance. Pure SVG, no chart lib.
export default function BudgetBars({ actuals, plan, labels, money, t }) {
  const W = 900;
  const H = 240;
  const padT = 12;
  const padB = 26;
  const plotH = H - padT - padB;

  const max = Math.max(
    1,
    ...actuals.flatMap((m) => [m.income, m.expense]),
    ...plan.flatMap((m) => [m.income, m.expense]),
  );
  const scaleH = (v) => Math.max(0, ((Number(v) || 0) / max) * plotH);

  const band = W / 12;
  const barW = Math.min(18, band * 0.32);
  const gap = 4;

  const baseY = padT + plotH;

  return (
    <div className="budget-bars">
      <svg viewBox={`0 0 ${W} ${H}`} className="budget-bars__svg" role="img" aria-label={t('Income vs expenses by month')}>
        <line x1={0} y1={baseY} x2={W} y2={baseY} className="budget-bars__axis" />
        {labels.map((label, i) => {
          const a = actuals[i] || { income: 0, expense: 0 };
          const p = plan[i] || { income: 0, expense: 0 };
          const cx = band * i + band / 2;
          const incX = cx - barW - gap / 2;
          const expX = cx + gap / 2;
          const incH = scaleH(a.income);
          const expH = scaleH(a.expense);
          const incPlanY = baseY - scaleH(p.income);
          const expPlanY = baseY - scaleH(p.expense);
          return (
            <g key={i}>
              <rect x={incX} y={baseY - incH} width={barW} height={incH} rx={2} className="budget-bars__inc">
                <title>{`${label} · ${t('Income (actual)')}: ${money(a.income)}`}</title>
              </rect>
              <rect x={expX} y={baseY - expH} width={barW} height={expH} rx={2} className="budget-bars__exp">
                <title>{`${label} · ${t('Expenses (actual)')}: ${money(a.expense)}`}</title>
              </rect>
              {p.income > 0 ? <line x1={incX} y1={incPlanY} x2={incX + barW} y2={incPlanY} className="budget-bars__plan" /> : null}
              {p.expense > 0 ? <line x1={expX} y1={expPlanY} x2={expX + barW} y2={expPlanY} className="budget-bars__plan" /> : null}
              <text x={cx} y={H - 8} className="budget-bars__label">{label}</text>
            </g>
          );
        })}
      </svg>
      <div className="budget-bars__legend">
        <span><i className="budget-bars__key budget-bars__key--inc" />{t('Income (actual)')}</span>
        <span><i className="budget-bars__key budget-bars__key--exp" />{t('Expenses (actual)')}</span>
        <span><i className="budget-bars__key budget-bars__key--plan" />{t('Plan')}</span>
      </div>
    </div>
  );
}
